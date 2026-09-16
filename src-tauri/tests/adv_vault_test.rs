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

//! Adversarial Verification for Milestone M3: Vault Encryption & Header Integrity.

use std::fs;
use std::path::{Path, PathBuf};
use zendev_tauri_lib::crypto::{
    decrypt_file, encrypt_file, is_system_protected_path, shred_file,
    HEADER_LEN, MAGIC_HEADER,
};

fn create_temp_sandbox(prefix: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!(
        "zendev_adv_vault_{}_{}",
        prefix,
        rand::random::<u32>()
    ));
    fs::create_dir_all(&sandbox).expect("failed to create sandbox directory");
    let sandbox_clone = sandbox.clone();
    let cleanup = move || {
        let _ = fs::remove_dir_all(&sandbox_clone);
    };
    (sandbox, cleanup)
}

fn assert_no_staging_tmp_files(dir: &Path) {
    let entries = fs::read_dir(dir).expect("failed to read sandbox directory");
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        assert!(
            !name.ends_with(".tmp"),
            "Leak detected! Stray temporary staging file found: {}",
            name
        );
    }
}

#[test]
fn test_adversarial_wrong_password_variations() {
    let (sandbox, cleanup) = create_temp_sandbox("wrong_password");
    let input_path = sandbox.join("classified_blueprint.dat");
    let secret_payload = b"CRITICAL-DEFENSE-CONTRACT-CONFIDENTIAL-2026";
    fs::write(&input_path, secret_payload).unwrap();

    let correct_pass = "P@ssw0rd_Alpha_Omega_2026!";
    let enc_res = encrypt_file(&input_path, correct_pass, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());

    fs::remove_file(&input_path).unwrap();

    let wrong_passwords = [
        "P@ssw0rd_Alpha_Omega_2026",
        "p@ssw0rd_alpha_omega_2026!",
        "1234",
        "WrongSecretPasswordHere!!",
        " ",
        "\0\0\0\0",
    ];

    for wrong_pass in wrong_passwords {
        let dec_res = decrypt_file(&vault_path, wrong_pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert!(!input_path.exists());
        assert_no_staging_tmp_files(&sandbox);
    }

    cleanup();
}

#[test]
fn test_adversarial_tampered_tag_and_ciphertext_cleanup() {
    let (sandbox, cleanup) = create_temp_sandbox("tamper_corrupt");
    let input_path = sandbox.join("financial_ledger.bin");
    let payload = b"ACCOUNT_BALANCES: LEDGER_HASH: 0x99283748291038472910283748291029";
    fs::write(&input_path, payload).unwrap();

    let pass = "LedgerMasterKey2026#";
    let enc_res = encrypt_file(&input_path, pass, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());
    let original_vault_bytes = fs::read(&vault_path).unwrap();

    // Tamper with authentication tag (bytes 35..51)
    for tag_offset in [35, 40, 45, 50] {
        let mut tampered = original_vault_bytes.clone();
        tampered[tag_offset] ^= 0x55;
        fs::write(&vault_path, &tampered).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Tamper with ciphertext bytes (offset 51..EOF)
    // First ciphertext byte
    {
        let mut tampered = original_vault_bytes.clone();
        tampered[51] ^= 0x01;
        fs::write(&vault_path, &tampered).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Middle ciphertext byte
    {
        let mut tampered = original_vault_bytes.clone();
        let mid = 51 + (tampered.len() - 51) / 2;
        tampered[mid] ^= 0x80;
        fs::write(&vault_path, &tampered).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Last ciphertext byte
    {
        let mut tampered = original_vault_bytes.clone();
        let last = tampered.len() - 1;
        tampered[last] ^= 0xFF;
        fs::write(&vault_path, &tampered).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Truncated ciphertext
    {
        let mut truncated = original_vault_bytes.clone();
        truncated.truncate(original_vault_bytes.len() - 4);
        fs::write(&vault_path, &truncated).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Appended trailing garbage bytes
    {
        let mut appended = original_vault_bytes.clone();
        appended.extend_from_slice(b"MALICIOUS_TRAILING_DATA_CORRUPTION");
        fs::write(&vault_path, &appended).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Hatalı parola! Şifre çözülemedi.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    cleanup();
}

#[test]
fn test_adversarial_truncated_and_corrupted_headers() {
    let (sandbox, cleanup) = create_temp_sandbox("headers");
    let vault_path = sandbox.join("corrupt_header.vault");
    let pass = "AnyPassword123!";

    // Zero-byte file for decryption
    fs::write(&vault_path, b"").unwrap();
    let res_0 = decrypt_file(&vault_path, pass, None).unwrap();
    assert!(!res_0.success);
    assert_eq!(
        res_0.error.as_deref(),
        Some("Geçersiz dosya boyutu! Kasa başlığı eksik.")
    );

    // Truncated headers: test lengths from 1 to 50 bytes
    for len in [1, 6, 7, 15, 23, 35, 50] {
        let mut truncated_header = vec![0u8; len];
        if len >= 7 {
            truncated_header[0..7].copy_from_slice(MAGIC_HEADER);
        }
        fs::write(&vault_path, &truncated_header).unwrap();

        let res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!res.success);
        assert_eq!(
            res.error.as_deref(),
            Some("Geçersiz dosya boyutu! Kasa başlığı eksik.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    // Invalid magic headers
    let invalid_magics: [&[u8]; 5] = [
        b"FORTRES",
        b"NEXUSV2",
        b"nexusv1",
        b"BADMGC1",
        b"\0\0\0\0\0\0\0",
    ];

    for bad_magic in invalid_magics {
        let mut buf = vec![0u8; HEADER_LEN + 32];
        buf[0..7].copy_from_slice(bad_magic);
        fs::write(&vault_path, &buf).unwrap();

        let res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(!res.success);
        assert_eq!(
            res.error.as_deref(),
            Some("Geçersiz kasa formatı! Bu dosya bir .nexusvault dosyası değil.")
        );
        assert_no_staging_tmp_files(&sandbox);
    }

    cleanup();
}

#[test]
fn test_adversarial_zero_byte_roundtrip_and_shred() {
    let (sandbox, cleanup) = create_temp_sandbox("zero_byte");
    let empty_file = sandbox.join("empty_source.txt");
    fs::write(&empty_file, b"").unwrap();
    assert_eq!(fs::metadata(&empty_file).unwrap().len(), 0);

    let pass = "ZeroByteKey!2026";
    let enc_res = encrypt_file(&empty_file, pass, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());

    let vault_metadata = fs::metadata(&vault_path).unwrap();
    assert_eq!(vault_metadata.len(), 51);

    let vault_bytes = fs::read(&vault_path).unwrap();
    assert_eq!(&vault_bytes[0..7], MAGIC_HEADER);

    fs::remove_file(&empty_file).unwrap();

    let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
    assert!(dec_res.success);
    let restored_path = PathBuf::from(dec_res.out_path.unwrap());
    assert_eq!(restored_path, empty_file);
    assert_eq!(fs::metadata(&restored_path).unwrap().len(), 0);
    assert_eq!(fs::read(&restored_path).unwrap(), b"");

    let zero_to_shred = sandbox.join("shred_empty.dat");
    fs::write(&zero_to_shred, b"").unwrap();
    assert!(zero_to_shred.exists());

    let shred_res = shred_file(&zero_to_shred).unwrap();
    assert!(shred_res.success);
    assert_eq!(shred_res.passes, Some(7));
    assert_eq!(shred_res.size, Some(0));
    assert!(!zero_to_shred.exists());

    cleanup();
}

#[test]
fn test_adversarial_large_file_streaming_irregular_sizes() {
    let (sandbox, cleanup) = create_temp_sandbox("large_streaming");

    let sizes: [usize; 3] = [
        192 * 1024,
        200_123,
        1024 * 1024,
    ];

    for size in sizes {
        let file_path = sandbox.join(format!("stream_{}.bin", size));

        let mut data = vec![0u8; size];
        let mut state: u64 = 0x12345678_9abcdef0 ^ (size as u64);
        for byte in data.iter_mut() {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            *byte = (state >> 32) as u8;
        }
        fs::write(&file_path, &data).unwrap();

        let pass = "MassiveStreamingPayloadKey2026!";
        let enc_res = encrypt_file(&file_path, pass, None).unwrap();
        assert!(enc_res.success);
        let vault_path = PathBuf::from(enc_res.out_path.unwrap());

        assert_eq!(
            fs::metadata(&vault_path).unwrap().len(),
            (HEADER_LEN + size) as u64
        );

        fs::remove_file(&file_path).unwrap();

        let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
        assert!(dec_res.success);
        let restored_path = PathBuf::from(dec_res.out_path.unwrap());
        assert_eq!(restored_path, file_path);

        let restored_bytes = fs::read(&restored_path).unwrap();
        assert_eq!(restored_bytes.len(), size);
        assert_eq!(restored_bytes, data);

        if size == 1024 * 1024 {
            let shred_res = shred_file(&restored_path).unwrap();
            assert!(shred_res.success);
            assert_eq!(shred_res.passes, Some(7));
            assert_eq!(shred_res.size, Some(size as u64));
            assert!(!restored_path.exists());
        }

        assert_no_staging_tmp_files(&sandbox);
    }

    cleanup();
}

#[test]
fn test_adversarial_collision_chain() {
    let (sandbox, cleanup) = create_temp_sandbox("collision_chain");
    let original = sandbox.join("record.csv");
    fs::write(&original, b"id,val\n1,alpha").unwrap();

    let pass = "CollisionTestPass!";
    let enc_res = encrypt_file(&original, pass, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());

    fs::write(sandbox.join("record (1).csv"), b"preexisting (1)").unwrap();
    fs::write(sandbox.join("record (2).csv"), b"preexisting (2)").unwrap();

    let dec_res = decrypt_file(&vault_path, pass, None).unwrap();
    assert!(dec_res.success);
    let chosen_path = PathBuf::from(dec_res.out_path.unwrap());
    assert_eq!(chosen_path, sandbox.join("record (3).csv"));
    assert!(chosen_path.exists());
    assert_eq!(fs::read(&chosen_path).unwrap(), b"id,val\n1,alpha");

    cleanup();
}

#[test]
fn test_adversarial_system_path_guard_edge_cases() {
    let protected_paths = [
        "C:\\Windows",
        "c:\\windows",
        "C:/Windows",
        "c:/windows/system32/kernel32.dll",
        "C:\\Windows\\System32\\cmd.exe",
        "C:\\Program Files",
        "c:/program files/common files",
        "C:\\Program Files (x86)",
        "C:\\",
        "c:",
        "D:\\",
        "d:",
    ];

    for path_str in protected_paths {
        let p = Path::new(path_str);
        assert!(is_system_protected_path(p));

        let enc_res = encrypt_file(p, "pass", None).unwrap();
        assert!(!enc_res.success);
        assert_eq!(
            enc_res.error.as_deref(),
            Some("Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez.")
        );

        let dec_res = decrypt_file(p, "pass", None).unwrap();
        assert!(!dec_res.success);
        assert_eq!(
            dec_res.error.as_deref(),
            Some("Sistem güvenliği nedeniyle korumalı Windows dizinleri işlenemez.")
        );

        let shred_res = shred_file(p).unwrap();
        assert!(!shred_res.success);
        assert_eq!(
            shred_res.error.as_deref(),
            Some("Sistem güvenliği nedeniyle korumalı Windows dizinleri imha edilemez.")
        );
    }
}
