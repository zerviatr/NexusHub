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

use std::fs;
use std::path::{Path, PathBuf};
use zendev_tauri_lib::crypto::{
    decrypt_file, derive_key, encrypt_file, is_system_protected_path, shred_file,
    HEADER_LEN, MAGIC_HEADER, NONCE_LEN, SALT_LEN, TAG_LEN,
};

fn create_temp_sandbox(test_name: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!("zendev_fortress_{}_{}", test_name, rand::random::<u32>()));
    fs::create_dir_all(&sandbox).expect("failed to create sandbox directory");
    let sandbox_clone = sandbox.clone();
    let cleanup = move || {
        let _ = fs::remove_dir_all(&sandbox_clone);
    };
    (sandbox, cleanup)
}

#[test]
fn test_round_trip_encryption_decryption_fidelity() {
    let (sandbox, cleanup) = create_temp_sandbox("roundtrip_fidelity");
    let input_path = sandbox.join("contract.pdf");
    let payload = b"CONFIDENTIAL-AGREEMENT-2026-MILITARY-GRADE-AES-256-GCM-AUTHENTICATED";
    fs::write(&input_path, payload).unwrap();

    let passphrase = "UltraSecurePassword123!";

    // 1. Encrypt file
    let enc_result = encrypt_file(&input_path, passphrase, None).unwrap();
    assert!(enc_result.success);
    let vault_path = PathBuf::from(enc_result.out_path.expect("missing outPath"));
    assert!(vault_path.exists());
    assert!(vault_path.to_string_lossy().ends_with(".vault"));

    // 2. Remove original file
    fs::remove_file(&input_path).unwrap();
    assert!(!input_path.exists());

    // 3. Decrypt file
    let dec_result = decrypt_file(&vault_path, passphrase, None).unwrap();
    assert!(dec_result.success);
    let restored_path = PathBuf::from(dec_result.out_path.expect("missing outPath"));
    assert_eq!(restored_path, input_path);
    assert!(restored_path.exists());

    // 4. Verify byte-for-byte fidelity
    let restored_bytes = fs::read(&restored_path).unwrap();
    assert_eq!(restored_bytes, payload);

    cleanup();
}

#[test]
fn test_exact_51_byte_header_structure() {
    let (sandbox, cleanup) = create_temp_sandbox("header_structure");
    let input_path = sandbox.join("test_vault.bin");
    let payload = b"BINARY_PAYLOAD_TEST_DATA";
    fs::write(&input_path, payload).unwrap();

    let passphrase = "HeaderVerificationPass!";
    let enc_result = encrypt_file(&input_path, passphrase, None).unwrap();
    assert!(enc_result.success);
    let vault_path = PathBuf::from(enc_result.out_path.unwrap());

    let file_bytes = fs::read(&vault_path).unwrap();
    assert_eq!(file_bytes.len(), HEADER_LEN + payload.len());

    // Bytes 0..7: ASCII "NEXUSV1"
    assert_eq!(&file_bytes[0..7], MAGIC_HEADER);
    assert_eq!(std::str::from_utf8(&file_bytes[0..7]).unwrap(), "NEXUSV1");

    // Bytes 7..23: 16 bytes salt
    let salt = &file_bytes[7..23];
    assert_eq!(salt.len(), SALT_LEN);

    // Bytes 23..35: 12 bytes nonce (96-bit GCM IV)
    let nonce = &file_bytes[23..35];
    assert_eq!(nonce.len(), NONCE_LEN);

    // Bytes 35..51: 16 bytes authentication tag (128-bit GCM tag)
    let tag = &file_bytes[35..51];
    assert_eq!(tag.len(), TAG_LEN);

    // Bytes 51..EOF: Ciphertext
    let ciphertext = &file_bytes[51..];
    assert_eq!(ciphertext.len(), payload.len());

    cleanup();
}

#[test]
fn test_wrong_password_rejection_message() {
    let (sandbox, cleanup) = create_temp_sandbox("wrong_password");
    let input_path = sandbox.join("vault.txt");
    fs::write(&input_path, b"Strictly Confidential Content").unwrap();

    let correct_pass = "CorrectPass123";
    let wrong_pass = "WrongPass456";

    let enc_result = encrypt_file(&input_path, correct_pass, None).unwrap();
    assert!(enc_result.success);
    let vault_path = PathBuf::from(enc_result.out_path.unwrap());

    let dec_result = decrypt_file(&vault_path, wrong_pass, None).unwrap();
    assert!(!dec_result.success);
    assert_eq!(
        dec_result.error.unwrap(),
        "Hatalı parola! Şifre çözülemedi."
    );

    cleanup();
}

#[test]
fn test_tampered_authentication_tag_detection() {
    let (sandbox, cleanup) = create_temp_sandbox("tamper_detection");
    let input_path = sandbox.join("untampered.txt");
    fs::write(&input_path, b"High Integrity Ledger Data").unwrap();

    let password = "TamperGuardPass99!";
    let enc_result = encrypt_file(&input_path, password, None).unwrap();
    assert!(enc_result.success);
    let vault_path = PathBuf::from(enc_result.out_path.unwrap());

    // Corrupt byte 40 (inside authentication tag: offset 35..51)
    let mut bytes = fs::read(&vault_path).unwrap();
    bytes[40] ^= 0xAA;
    fs::write(&vault_path, &bytes).unwrap();

    let dec_result = decrypt_file(&vault_path, password, None).unwrap();
    assert!(!dec_result.success);
    assert_eq!(
        dec_result.error.unwrap(),
        "Hatalı parola! Şifre çözülemedi."
    );

    // Verify atomic staging cleanup (no .tmp files left in sandbox)
    let dir_entries = fs::read_dir(&sandbox).unwrap();
    for entry in dir_entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        assert!(!name.ends_with(".tmp"), "Found uncleaned staging file: {}", name);
    }

    cleanup();
}

#[test]
fn test_protected_path_guard_rejects_system_dirs() {
    assert!(is_system_protected_path(Path::new("C:\\Windows")));
    assert!(is_system_protected_path(Path::new("C:\\Windows\\System32")));
    assert!(is_system_protected_path(Path::new("C:\\Windows\\System32\\cmd.exe")));
    assert!(is_system_protected_path(Path::new("C:\\Program Files")));
    assert!(is_system_protected_path(Path::new("C:\\Program Files\\app.exe")));
    assert!(is_system_protected_path(Path::new("C:\\Program Files (x86)")));
    assert!(is_system_protected_path(Path::new("C:\\")));
    assert!(is_system_protected_path(Path::new("c:")));
    assert!(is_system_protected_path(Path::new("D:\\")));

    // Guard on shred_file
    let shred_res = shred_file(Path::new("C:\\Windows\\System32\\notepad.exe")).unwrap();
    assert!(!shred_res.success);
    assert_eq!(
        shred_res.error.unwrap(),
        "Sistem güvenliği nedeniyle korumalı Windows dizinleri imha edilemez."
    );

    // Guard on encrypt_file
    let enc_res = encrypt_file(Path::new("C:\\Windows\\System32\\notepad.exe"), "pass", None).unwrap();
    assert!(!enc_res.success);
    assert_eq!(
        enc_res.error.unwrap(),
        "Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez."
    );

    // Guard on decrypt_file
    let dec_res = decrypt_file(Path::new("C:\\Windows\\System32\\notepad.exe.vault"), "pass", None).unwrap();
    assert!(!dec_res.success);
    assert_eq!(
        dec_res.error.unwrap(),
        "Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez."
    );
}

#[test]
fn test_dod_7_pass_shredder_complete_removal() {
    let (sandbox, cleanup) = create_temp_sandbox("dod_shredder");
    let target_path = sandbox.join("delete_me.key");
    let secret = b"TOP-SECRET-ENCRYPTION-PRIVATE-KEY-DOD-5220-22-M";
    fs::write(&target_path, secret).unwrap();
    assert!(target_path.exists());

    let shred_result = shred_file(&target_path).unwrap();
    assert!(shred_result.success);
    assert_eq!(shred_result.passes.unwrap(), 7);
    assert_eq!(shred_result.size.unwrap(), secret.len() as u64);
    assert!(!target_path.exists());

    cleanup();
}

#[test]
fn test_collision_avoidance_naming() {
    let (sandbox, cleanup) = create_temp_sandbox("collision_avoidance");
    let original_path = sandbox.join("document.txt");
    fs::write(&original_path, b"Version 1 Content").unwrap();

    let password = "CollisionPassword1!";
    let enc_res = encrypt_file(&original_path, password, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());

    // Decrypt while document.txt still exists
    let dec_res = decrypt_file(&vault_path, password, None).unwrap();
    assert!(dec_res.success);
    let collision_path = PathBuf::from(dec_res.out_path.unwrap());
    assert_eq!(collision_path, sandbox.join("document (1).txt"));
    assert!(collision_path.exists());

    let restored_content = fs::read(&collision_path).unwrap();
    assert_eq!(restored_content, b"Version 1 Content");

    cleanup();
}

#[test]
fn test_multi_chunk_large_file_streaming() {
    let (sandbox, cleanup) = create_temp_sandbox("large_file");
    let input_path = sandbox.join("large_archive.bin");

    // 256 KB pseudo-random pattern
    let mut large_data = vec![0u8; 256 * 1024];
    for (i, byte) in large_data.iter_mut().enumerate() {
        *byte = ((i * 37) % 256) as u8;
    }
    fs::write(&input_path, &large_data).unwrap();

    let password = "LargePayloadSecurePass!";
    let enc_res = encrypt_file(&input_path, password, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());

    fs::remove_file(&input_path).unwrap();

    let dec_res = decrypt_file(&vault_path, password, None).unwrap();
    assert!(dec_res.success);
    let restored_path = PathBuf::from(dec_res.out_path.unwrap());
    let restored_data = fs::read(&restored_path).unwrap();
    assert_eq!(restored_data, large_data);

    cleanup();
}

#[test]
fn test_legacy_nexusvault_extension_support() {
    let (sandbox, cleanup) = create_temp_sandbox("nexusvault_ext");
    let input_path = sandbox.join("backup.tar");
    let payload = b"BACKUP-ARCHIVE-PAYLOAD";
    fs::write(&input_path, payload).unwrap();

    let explicit_nexusvault_path = sandbox.join("backup.tar.nexusvault");
    let enc_res = encrypt_file(&input_path, "Pass123", Some(&explicit_nexusvault_path)).unwrap();
    assert!(enc_res.success);
    assert_eq!(PathBuf::from(enc_res.out_path.unwrap()), explicit_nexusvault_path);

    fs::remove_file(&input_path).unwrap();

    // Decrypting a .nexusvault file restores backup.tar cleanly
    let dec_res = decrypt_file(&explicit_nexusvault_path, "Pass123", None).unwrap();
    assert!(dec_res.success);
    let restored_path = PathBuf::from(dec_res.out_path.unwrap());
    assert_eq!(restored_path, input_path);
    assert_eq!(fs::read(&restored_path).unwrap(), payload);

    cleanup();
}

#[test]
fn test_derive_key_reproducibility() {
    let salt = [42u8; SALT_LEN];
    let key1 = derive_key("MyEnterpriseSecretPassword2026", &salt);
    let key2 = derive_key("MyEnterpriseSecretPassword2026", &salt);
    assert_eq!(key1, key2);
    assert_eq!(key1.len(), 32);

    let diff_salt = [43u8; SALT_LEN];
    let key3 = derive_key("MyEnterpriseSecretPassword2026", &diff_salt);
    assert_ne!(key1, key3);
}
