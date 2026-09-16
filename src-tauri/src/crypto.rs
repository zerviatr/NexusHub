// Copyright 2025 Lee Boonstra
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! Cyber Fortress Vault Cryptographic Engine & DoD 5220.22-M File Shredder.
//!
//! Provides:
//! - AES-256-GCM authenticated vault encryption with exact 51-byte header:
//!   `NEXUSV1` (7 bytes) + salt (16 bytes) + nonce (12 bytes) + authTag (16 bytes)
//! - PBKDF2-SHA256 key derivation with 100,000 rounds producing a 32-byte key
//! - Collision-avoiding file decryption with atomic staging and tag verification
//! - DoD 5220.22-M compliant 7-pass file shredder with physical disk flush
//! - Windows system protected path guard preventing OS corruption
//! - Native file picker dialog integration via `rfd`

use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

use aes_gcm::{
    aead::{AeadInPlace, KeyInit},
    Aes256Gcm, Nonce, Tag,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};

pub const MAGIC_HEADER: &[u8; 7] = b"NEXUSV1";
pub const HEADER_LEN: usize = 51; // 7 magic + 16 salt + 12 nonce + 16 tag
pub const PBKDF2_ROUNDS: u32 = 100_000;
pub const KEY_LEN: usize = 32;
pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12;
pub const TAG_LEN: usize = 16;
pub const CHUNK_SIZE: usize = 64 * 1024; // 64 KB

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultOpResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub out_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passes: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl VaultOpResult {
    pub fn ok_encrypt(out_path: String, name: String, size: u64) -> Self {
        Self {
            success: true,
            out_path: Some(out_path.clone()),
            output_path: Some(out_path),
            name: Some(name),
            passes: None,
            size: Some(size),
            size_bytes: Some(size),
            error: None,
        }
    }

    pub fn ok_decrypt(out_path: String, name: String, size: u64) -> Self {
        Self {
            success: true,
            out_path: Some(out_path.clone()),
            output_path: Some(out_path),
            name: Some(name),
            passes: None,
            size: Some(size),
            size_bytes: Some(size),
            error: None,
        }
    }

    pub fn ok_shred(passes: u32, size: u64) -> Self {
        Self {
            success: true,
            out_path: None,
            output_path: None,
            name: None,
            passes: Some(passes),
            size: Some(size),
            size_bytes: Some(size),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            out_path: None,
            output_path: None,
            name: None,
            passes: None,
            size: None,
            size_bytes: None,
            error: Some(msg.into()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFile {
    pub file_path: String,
    pub name: String,
    pub size: u64,
}

/// Derives a 32-byte AES-256 key using PBKDF2-HMAC-SHA256 with 100,000 iterations.
pub fn derive_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<sha2::Sha256>(
        passphrase.as_bytes(),
        salt,
        PBKDF2_ROUNDS,
        &mut key,
    );
    key
}

/// Verifies whether the path points to or is located inside a Windows system protected directory.
pub fn is_system_protected_path(target_path: &Path) -> bool {
    let path_str = target_path.to_string_lossy().to_string();
    if path_str.trim().is_empty() {
        return false;
    }

    // Normalize slashes to backslash and convert to lowercase for comparison
    let normalized = path_str.replace('/', "\\").to_lowercase();
    let trimmed = normalized.trim_end_matches('\\');

    // SystemDrive check: e.g. "c:" or "c:\"
    let system_drive = std::env::var("SystemDrive")
        .unwrap_or_else(|_| "c:".to_string())
        .to_lowercase();
    let sys_drive_prefix = system_drive.trim_end_matches('\\');

    if trimmed == sys_drive_prefix || normalized == format!("{}\\", sys_drive_prefix) {
        return true;
    }

    // Drive root pattern: any "[a-z]:" or "[a-z]:\"
    if trimmed.len() == 2 && trimmed.as_bytes()[1] == b':' && trimmed.as_bytes()[0].is_ascii_alphabetic() {
        return true;
    }
    if normalized.len() == 3
        && normalized.as_bytes()[1] == b':'
        && normalized.as_bytes()[2] == b'\\'
        && normalized.as_bytes()[0].is_ascii_alphabetic()
    {
        return true;
    }

    // SystemRoot check (default "c:\windows")
    let system_root = std::env::var("SystemRoot")
        .or_else(|_| std::env::var("windir"))
        .unwrap_or_else(|_| "c:\\windows".to_string())
        .replace('/', "\\")
        .to_lowercase();
    let sys_root_trimmed = system_root.trim_end_matches('\\');

    if trimmed == sys_root_trimmed || normalized.starts_with(&format!("{}\\", sys_root_trimmed)) {
        return true;
    }

    // ProgramFiles check (default "c:\program files")
    let program_files = std::env::var("ProgramFiles")
        .unwrap_or_else(|_| "c:\\program files".to_string())
        .replace('/', "\\")
        .to_lowercase();
    let pf_trimmed = program_files.trim_end_matches('\\');

    if trimmed == pf_trimmed || normalized.starts_with(&format!("{}\\", pf_trimmed)) {
        return true;
    }

    // ProgramFiles(x86) check
    if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
        let pf86_norm = pf86.replace('/', "\\").to_lowercase();
        let pf86_trimmed = pf86_norm.trim_end_matches('\\');
        if trimmed == pf86_trimmed || normalized.starts_with(&format!("{}\\", pf86_trimmed)) {
            return true;
        }
    } else {
        let pf86_fallback = "c:\\program files (x86)";
        if trimmed == pf86_fallback || normalized.starts_with("c:\\program files (x86)\\") {
            return true;
        }
    }

    // ProgramW6432 check
    if let Ok(pfw64) = std::env::var("ProgramW6432") {
        let pfw64_norm = pfw64.replace('/', "\\").to_lowercase();
        let pfw64_trimmed = pfw64_norm.trim_end_matches('\\');
        if trimmed == pfw64_trimmed || normalized.starts_with(&format!("{}\\", pfw64_trimmed)) {
            return true;
        }
    }

    false
}

/// Generates a collision-free path by appending incrementing counters `(1).ext`, `(2).ext`.
pub fn get_unique_path(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let parent = target.parent().unwrap_or_else(|| Path::new(""));
    let file_name = target
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file");

    let (stem, ext) = match target.extension().and_then(|e| e.to_str()) {
        Some(extension) => {
            let s = &file_name[..file_name.len() - extension.len() - 1];
            (s, Some(extension))
        }
        None => (file_name, None),
    };

    let mut counter = 1;
    loop {
        let new_name = match ext {
            Some(extension) => {
                if extension.is_empty() {
                    format!("{} ({})", stem, counter)
                } else {
                    format!("{} ({}).{}", stem, counter, extension)
                }
            }
            None => format!("{} ({})", stem, counter),
        };
        let candidate = parent.join(new_name);
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

/// Encrypts a file using AES-256-GCM streaming/in-place with PBKDF2 (100,000 rounds).
/// Writes exact 51-byte header: `NEXUSV1` (7) + salt (16) + nonce (12) + authTag (16) followed by ciphertext.
pub fn encrypt_file(
    file_path: &Path,
    passphrase: &str,
    output_path: Option<&Path>,
) -> Result<VaultOpResult, String> {
    if is_system_protected_path(file_path) {
        return Ok(VaultOpResult::err(
            "Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez.",
        ));
    }

    if !file_path.exists() {
        return Ok(VaultOpResult::err("Dosya bulunamadı."));
    }

    if passphrase.len() < 4 {
        return Ok(VaultOpResult::err("Parola en az 4 karakter olmalıdır."));
    }

    let plaintext = match std::fs::read(file_path) {
        Ok(data) => data,
        Err(e) => return Ok(VaultOpResult::err(format!("Dosya okunamadı: {}", e))),
    };

    // Candidate output path defaults to `${file_path}.vault`
    let candidate_out_path = match output_path {
        Some(p) => p.to_path_buf(),
        None => {
            let path_str = file_path.to_string_lossy();
            PathBuf::from(format!("{}.vault", path_str))
        }
    };

    // Avoid collision by appending (1).ext
    let final_out_path = get_unique_path(&candidate_out_path);

    // Generate 16 bytes random salt, 12 bytes random nonce
    let mut salt = [0u8; SALT_LEN];
    let mut nonce = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce);

    // Derive 32-byte key via PBKDF2-SHA256 (100,000 iterations)
    let key = derive_key(passphrase, &salt);

    let cipher = match Aes256Gcm::new_from_slice(&key) {
        Ok(c) => c,
        Err(e) => return Ok(VaultOpResult::err(format!("Şifreleme başlatılamadı: {}", e))),
    };

    let nonce_obj = Nonce::from_slice(&nonce);
    let mut ciphertext_buffer = plaintext;
    let tag = match cipher.encrypt_in_place_detached(nonce_obj, b"", &mut ciphertext_buffer) {
        Ok(t) => t,
        Err(e) => return Ok(VaultOpResult::err(format!("Şifreleme başarısız oldu: {}", e))),
    };

    // 51-byte header: MAGIC(7) + salt(16) + nonce(12) + tag(16)
    let mut header = Vec::with_capacity(HEADER_LEN);
    header.extend_from_slice(MAGIC_HEADER);
    header.extend_from_slice(&salt);
    header.extend_from_slice(&nonce);
    header.extend_from_slice(tag.as_slice());

    // Atomic write to staging file: ${final_out_path}.${random}.tmp
    let random_suffix: u32 = rand::random();
    let parent_dir = final_out_path
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let staging_file_name = format!(
        "{}.{:08x}.tmp",
        final_out_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("vault"),
        random_suffix
    );
    let staging_path = parent_dir.join(staging_file_name);

    let write_res = (|| -> std::io::Result<()> {
        let mut out_file = std::fs::File::create(&staging_path)?;
        out_file.write_all(&header)?;
        out_file.write_all(&ciphertext_buffer)?;
        out_file.sync_all()?;
        Ok(())
    })();

    if let Err(e) = write_res {
        let _ = std::fs::remove_file(&staging_path);
        return Ok(VaultOpResult::err(format!("Kasa dosyası yazılamadı: {}", e)));
    }

    // Atomically rename staging file to final destination
    if let Err(e) = std::fs::rename(&staging_path, &final_out_path) {
        let _ = std::fs::remove_file(&staging_path);
        return Ok(VaultOpResult::err(format!("Kasa dosyası kaydedilemedi: {}", e)));
    }

    let out_name = final_out_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let total_len = (header.len() + ciphertext_buffer.len()) as u64;

    Ok(VaultOpResult::ok_encrypt(
        final_out_path.to_string_lossy().to_string(),
        out_name,
        total_len,
    ))
}

/// Decrypts a `.vault` or `.nexusvault` file with atomic staging, authentication tag verification,
/// and collision avoidance.
pub fn decrypt_file(
    file_path: &Path,
    passphrase: &str,
    output_path: Option<&Path>,
) -> Result<VaultOpResult, String> {
    if is_system_protected_path(file_path) {
        return Ok(VaultOpResult::err(
            "Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez.",
        ));
    }

    if !file_path.exists() {
        return Ok(VaultOpResult::err("Dosya bulunamadı."));
    }

    let file_bytes = match std::fs::read(file_path) {
        Ok(data) => data,
        Err(e) => return Ok(VaultOpResult::err(format!("Dosya okunamadı: {}", e))),
    };

    if file_bytes.len() < HEADER_LEN {
        return Ok(VaultOpResult::err(
            "Geçersiz dosya boyutu! Kasa başlığı eksik.",
        ));
    }

    // Verify 7-byte magic header
    if &file_bytes[0..7] != MAGIC_HEADER {
        return Ok(VaultOpResult::err(
            "Geçersiz kasa formatı! Bu dosya bir .nexusvault dosyası değil.",
        ));
    }

    let salt = &file_bytes[7..23];
    let nonce = &file_bytes[23..35];
    let auth_tag = &file_bytes[35..51];
    let ciphertext = &file_bytes[51..];

    // Derive 32-byte key via PBKDF2-SHA256 (100,000 iterations)
    let key = derive_key(passphrase, salt);

    let cipher = match Aes256Gcm::new_from_slice(&key) {
        Ok(c) => c,
        Err(e) => return Ok(VaultOpResult::err(format!("Şifre çözücü başlatılamadı: {}", e))),
    };

    let nonce_obj = Nonce::from_slice(nonce);
    let tag_obj = Tag::from_slice(auth_tag);
    let mut decrypted_buffer = ciphertext.to_vec();

    if cipher
        .decrypt_in_place_detached(nonce_obj, b"", &mut decrypted_buffer, tag_obj)
        .is_err()
    {
        return Ok(VaultOpResult::err("Hatalı parola! Şifre çözülemedi."));
    }

    // Determine candidate output path
    let candidate_out_path = match output_path {
        Some(p) => p.to_path_buf(),
        None => {
            let path_str = file_path.to_string_lossy().to_string();
            let lower = path_str.to_lowercase();
            let candidate_str = if lower.ends_with(".nexusvault") {
                &path_str[..path_str.len() - 11]
            } else if lower.ends_with(".vault") {
                &path_str[..path_str.len() - 6]
            } else {
                &format!("{}.restored", path_str)
            };
            PathBuf::from(candidate_str)
        }
    };

    // Avoid collision by appending (1).ext
    let final_out_path = get_unique_path(&candidate_out_path);

    // Staging write: atomic commit
    let random_suffix: u32 = rand::random();
    let parent_dir = final_out_path
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let staging_file_name = format!(
        "{}.{:08x}.tmp",
        final_out_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("restored"),
        random_suffix
    );
    let staging_path = parent_dir.join(staging_file_name);

    let write_res = (|| -> std::io::Result<()> {
        let mut out_file = std::fs::File::create(&staging_path)?;
        out_file.write_all(&decrypted_buffer)?;
        out_file.sync_all()?;
        Ok(())
    })();

    if let Err(e) = write_res {
        let _ = std::fs::remove_file(&staging_path);
        return Ok(VaultOpResult::err(format!("Çözülen dosya yazılamadı: {}", e)));
    }

    // Atomically rename staging file to final destination
    if let Err(e) = std::fs::rename(&staging_path, &final_out_path) {
        let _ = std::fs::remove_file(&staging_path);
        return Ok(VaultOpResult::err(format!("Çözülen dosya kaydedilemedi: {}", e)));
    }

    let out_name = final_out_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let final_size = decrypted_buffer.len() as u64;

    Ok(VaultOpResult::ok_decrypt(
        final_out_path.to_string_lossy().to_string(),
        out_name,
        final_size,
    ))
}

/// DoD 5220.22-M 7-Pass secure file shredder.
/// Overwrites with passes: (1) 0x00, (2) 0xFF, (3) random, (4) random, (5) 0x00, (6) 0xFF, (7) random.
/// Flushes write cache with `sync_all()`, truncates file length to 0 bytes, and unlinks file entry.
pub fn shred_file(file_path: &Path) -> Result<VaultOpResult, String> {
    if is_system_protected_path(file_path) {
        return Ok(VaultOpResult::err(
            "Sistem güvenliği nedeniyle korumalı Windows dizinleri imha edilemez.",
        ));
    }

    if !file_path.exists() {
        return Ok(VaultOpResult::err("Dosya bulunamadı veya yazma izni yok."));
    }

    let metadata = match std::fs::metadata(file_path) {
        Ok(m) => m,
        Err(e) => return Ok(VaultOpResult::err(format!("Dosya okunamadı: {}", e))),
    };

    if metadata.is_dir() {
        return Ok(VaultOpResult::err("Dizinler imha edilemez, lütfen dosya seçin."));
    }

    let file_size = metadata.len();

    // If file is 0 bytes, truncate and unlink directly
    if file_size == 0 {
        let _ = std::fs::remove_file(file_path);
        return Ok(VaultOpResult::ok_shred(7, 0));
    }

    // Open file with read/write permissions
    let mut file = match std::fs::OpenOptions::new().read(true).write(true).open(file_path) {
        Ok(f) => f,
        Err(e) => {
            return Ok(VaultOpResult::err(format!(
                "Dosya bulunamadı veya yazma izni yok: {}",
                e
            )))
        }
    };

    // Passes definition: None means random bytes, Some(b) means fixed byte
    let passes: [Option<u8>; 7] = [
        Some(0x00), // Pass 1: 0x00 (Zeroes)
        Some(0xFF), // Pass 2: 0xFF (Ones)
        None,       // Pass 3: Pseudo-random
        None,       // Pass 4: Pseudo-random
        Some(0x00), // Pass 5: 0x00 (Zeroes)
        Some(0xFF), // Pass 6: 0xFF (Ones)
        None,       // Pass 7: Cryptographically secure random
    ];

    let mut chunk = vec![0u8; CHUNK_SIZE];
    for pass in passes.iter() {
        if let Err(e) = file.seek(SeekFrom::Start(0)) {
            return Ok(VaultOpResult::err(format!("Dosya seek hatası: {}", e)));
        }

        let mut written: u64 = 0;
        while written < file_size {
            let to_write = std::cmp::min(CHUNK_SIZE as u64, file_size - written) as usize;
            let slice = &mut chunk[..to_write];

            match pass {
                Some(byte_val) => slice.fill(*byte_val),
                None => rand::thread_rng().fill_bytes(slice),
            }

            if let Err(e) = file.write_all(slice) {
                return Ok(VaultOpResult::err(format!("Yazma hatası: {}", e)));
            }

            written += to_write as u64;
        }

        // Flush OS write cache to physical storage
        if let Err(e) = file.sync_all() {
            return Ok(VaultOpResult::err(format!("Disk sync hatası: {}", e)));
        }
    }

    // Truncate file length to 0 bytes before unlinking
    if let Err(e) = file.set_len(0) {
        return Ok(VaultOpResult::err(format!("Dosya kesme (truncate) hatası: {}", e)));
    }
    let _ = file.sync_all();

    // Explicitly drop file handle before removing on Windows
    drop(file);

    if let Err(e) = std::fs::remove_file(file_path) {
        return Ok(VaultOpResult::err(format!("Dosya silinemedi: {}", e)));
    }

    Ok(VaultOpResult::ok_shred(7, file_size))
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri Commands
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fortress_select_file() -> Result<Option<SelectedFile>, String> {
    let opt_path = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Güvenli İşlem İçin Dosya Seçin")
            .pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Some(path_buf) = opt_path {
        let metadata = std::fs::metadata(&path_buf).map_err(|e| e.to_string())?;
        let name = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        Ok(Some(SelectedFile {
            file_path: path_buf.to_string_lossy().to_string(),
            name,
            size: metadata.len(),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn fortress_shred_file(
    file_path: Option<String>,
    path: Option<String>,
) -> Result<VaultOpResult, String> {
    let target = file_path.or(path).unwrap_or_default();
    if target.trim().is_empty() {
        return Ok(VaultOpResult::err("Geçersiz veya boş dosya yolu."));
    }
    tokio::task::spawn_blocking(move || shred_file(Path::new(&target)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn fortress_encrypt_file(
    file_path: Option<String>,
    path: Option<String>,
    passphrase: Option<String>,
    password: Option<String>,
    output_path: Option<String>,
) -> Result<VaultOpResult, String> {
    let target = file_path.or(path).unwrap_or_default();
    let pass = passphrase.or(password).unwrap_or_default();
    if target.trim().is_empty() || pass.trim().is_empty() {
        return Ok(VaultOpResult::err("Dosya yolu ve şifre gereklidir."));
    }
    tokio::task::spawn_blocking(move || {
        encrypt_file(
            Path::new(&target),
            &pass,
            output_path.as_deref().map(Path::new),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn fortress_decrypt_file(
    file_path: Option<String>,
    path: Option<String>,
    passphrase: Option<String>,
    password: Option<String>,
    output_path: Option<String>,
) -> Result<VaultOpResult, String> {
    let target = file_path.or(path).unwrap_or_default();
    let pass = passphrase.or(password).unwrap_or_default();
    if target.trim().is_empty() || pass.trim().is_empty() {
        return Ok(VaultOpResult::err("Dosya yolu ve şifre gereklidir."));
    }
    tokio::task::spawn_blocking(move || {
        decrypt_file(
            Path::new(&target),
            &pass,
            output_path.as_deref().map(Path::new),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_test_dir(prefix: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("zendev_crypto_{}_{}", prefix, rand::random::<u32>()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_pbkdf2_key_derivation() {
        let salt = [1u8; 16];
        let key1 = derive_key("MyPassword123", &salt);
        let key2 = derive_key("MyPassword123", &salt);
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);

        let key_diff_salt = derive_key("MyPassword123", &[2u8; 16]);
        assert_ne!(key1, key_diff_salt);
    }

    #[test]
    fn test_encrypt_decrypt_round_trip_fidelity() {
        let dir = temp_test_dir("roundtrip");
        let file_path = dir.join("secret_doc.txt");
        let payload = b"CONFIDENTIAL-ENTERPRISE-PAYLOAD-2026-NEXUS-RUST-VAULT";
        fs::write(&file_path, payload).unwrap();

        let password = "SuperSecretPassword2026!";
        let enc_res = encrypt_file(&file_path, password, None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());
        assert!(vault_path.exists());
        assert!(vault_path.to_string_lossy().ends_with(".vault"));

        // Verify exact 51-byte header layout
        let vault_bytes = fs::read(&vault_path).unwrap();
        assert!(vault_bytes.len() >= 51);
        assert_eq!(&vault_bytes[0..7], MAGIC_HEADER);
        assert_eq!(vault_bytes.len(), 51 + payload.len());

        // Delete source file before decrypting
        fs::remove_file(&file_path).unwrap();

        let dec_res = decrypt_file(&vault_path, password, None).unwrap();
        assert!(dec_res.success);
        let restored_path = PathBuf::from(dec_res.out_path.unwrap());
        assert_eq!(restored_path, file_path);

        let restored_data = fs::read(&restored_path).unwrap();
        assert_eq!(restored_data, payload);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_wrong_password_rejection() {
        let dir = temp_test_dir("wrong_pass");
        let file_path = dir.join("sensitive.txt");
        fs::write(&file_path, b"TOP-SECRET-DATA").unwrap();

        let enc_res = encrypt_file(&file_path, "CorrectPass123", None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());

        let dec_res = decrypt_file(&vault_path, "WrongPass456", None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(dec_res.error.unwrap(), "Hatalı parola! Şifre çözülemedi.");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_corrupted_tag_detection_and_cleanup() {
        let dir = temp_test_dir("tamper");
        let file_path = dir.join("tampered.txt");
        fs::write(&file_path, b"Tamper Verification Payload").unwrap();

        let enc_res = encrypt_file(&file_path, "ValidPass123", None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());

        // Tamper byte 40 (inside authentication tag: 35..51)
        let mut vault_bytes = fs::read(&vault_path).unwrap();
        vault_bytes[40] ^= 0xFF;
        fs::write(&vault_path, &vault_bytes).unwrap();

        let dec_res = decrypt_file(&vault_path, "ValidPass123", None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(dec_res.error.unwrap(), "Hatalı parola! Şifre çözülemedi.");

        // Check that no stray .tmp staging files remain
        let entries = fs::read_dir(&dir).unwrap();
        for entry in entries.flatten() {
            assert!(!entry.path().to_string_lossy().ends_with(".tmp"));
        }

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_collision_avoidance_on_decryption() {
        let dir = temp_test_dir("collision");
        let file_path = dir.join("data.txt");
        fs::write(&file_path, b"Version 1 Data").unwrap();

        let enc_res = encrypt_file(&file_path, "Pass123", None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());

        // Keep original file in place to trigger collision
        let dec_res = decrypt_file(&vault_path, "Pass123", None).unwrap();
        assert!(dec_res.success);
        let expected_collision_path = dir.join("data (1).txt");
        assert_eq!(PathBuf::from(dec_res.out_path.unwrap()), expected_collision_path);
        assert!(expected_collision_path.exists());

        let content = fs::read(&expected_collision_path).unwrap();
        assert_eq!(content, b"Version 1 Data");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_dod_shredder_complete_deletion() {
        let dir = temp_test_dir("shred");
        let file_path = dir.join("killme.bin");
        fs::write(&file_path, b"UNRECOVERABLE-HIGH-ENTROPY-MILITARY-KEY").unwrap();
        assert!(file_path.exists());

        let shred_res = shred_file(&file_path).unwrap();
        assert!(shred_res.success);
        assert_eq!(shred_res.passes.unwrap(), 7);
        assert!(!file_path.exists());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_protected_path_guard() {
        assert!(is_system_protected_path(Path::new("C:\\Windows")));
        assert!(is_system_protected_path(Path::new("C:\\Windows\\System32\\cmd.exe")));
        assert!(is_system_protected_path(Path::new("C:\\Program Files\\app.exe")));
        assert!(is_system_protected_path(Path::new("C:\\")));
        assert!(is_system_protected_path(Path::new("c:")));

        let dir = temp_test_dir("safe");
        assert!(!is_system_protected_path(&dir));

        let protected_file = Path::new("C:\\Windows\\System32\\fake.txt");
        let shred_res = shred_file(protected_file).unwrap();
        assert!(!shred_res.success);
        assert_eq!(
            shred_res.error.unwrap(),
            "Sistem güvenliği nedeniyle korumalı Windows dizinleri imha edilemez."
        );

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_zero_byte_file_encryption_decryption() {
        let dir = temp_test_dir("empty");
        let file_path = dir.join("empty.txt");
        fs::write(&file_path, b"").unwrap();

        let enc_res = encrypt_file(&file_path, "EmptyPass123", None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());

        // 51 bytes header + 0 bytes ciphertext = 51 bytes
        let metadata = fs::metadata(&vault_path).unwrap();
        assert_eq!(metadata.len(), 51);

        fs::remove_file(&file_path).unwrap();

        let dec_res = decrypt_file(&vault_path, "EmptyPass123", None).unwrap();
        assert!(dec_res.success);
        let restored_path = PathBuf::from(dec_res.out_path.unwrap());
        let restored_data = fs::read(&restored_path).unwrap();
        assert_eq!(restored_data, b"");

        let _ = fs::remove_dir_all(&dir);
    }
}
