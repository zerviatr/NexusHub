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

//! Adversarial Verification for Milestone M2: SafeStorage DPAPI & Offline License Validation.
//!
//! Empirically challenges:
//! 1. SafeStorage DPAPI encryption and file persistence in `%APPDATA%\com.zendev.desktop\nexus_secrets.enc`.
//! 2. Roundtripping arbitrary string keys and arbitrary byte values.
//! 3. Resiliency against non-existent, zero-byte, and corrupted secrets file.
//! 4. License tamper resistance (tampered HMAC/ECDSA signatures, expired keys, foreign HWIDs).
//! 5. Audit default storage directory vs worker claims.

use hmac::Mac;
use p256::ecdsa::signature::Signer;
use p256::ecdsa::{DerSignature, SigningKey};
use p256::pkcs8::EncodePublicKey;
use rand::rngs::OsRng;
use rand::RngCore;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use zendev_tauri_lib::hwid::*;
use zendev_tauri_lib::license::*;
use zendev_tauri_lib::safe_storage::*;

static TEST_MUTEX: Mutex<()> = Mutex::new(());

fn get_expected_desktop_secrets_path() -> PathBuf {
    let appdata = std::env::var("APPDATA").expect("APPDATA must be set on Windows");
    Path::new(&appdata).join("com.zendev.desktop").join("nexus_secrets.enc")
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SafeStorage Persistence in %APPDATA%\com.zendev.desktop\nexus_secrets.enc
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_desktop_secrets_persistence_roundtrip() {
    let _lock = TEST_MUTEX.lock().unwrap();

    let target_file = get_expected_desktop_secrets_path();
    let parent_dir = target_file.parent().unwrap();
    
    // Configure env var to target the exact path specified in task
    std::env::set_var("NEXUS_SECRETS_PATH", target_file.to_str().unwrap());

    // Clean any pre-existing test artifact
    if target_file.exists() {
        let _ = fs::remove_file(&target_file);
    }

    let k_long = "very_long_key_".repeat(10);
    let v_long = "very_long_value_".repeat(100);

    let test_cases: Vec<(&str, &str)> = vec![
        ("simple_key", "simple_value"),
        ("unicode_key_öäü_hello", "val_world_ç_ñ"),
        ("spaces and tabs \t ", "newlines \r\n and tabs \t in value"),
        ("empty_value", ""),
        ("json_payload_key", "{\"tier\":\"pro\",\"active\":true}"),
        (k_long.as_str(), v_long.as_str()),
    ];

    for (k, v) in &test_cases {
        let store_res = store_secret(k, v);
        assert!(store_res.is_ok(), "Storing key '{}' failed: {:?}", k, store_res);
    }

    // Verify parent directory was created
    assert!(parent_dir.exists(), "Target directory %APPDATA%\\com.zendev.desktop must exist");
    assert!(target_file.exists(), "Secrets file must be created on disk");

    // Verify file content is encrypted and NOT plaintext JSON
    let disk_bytes = fs::read(&target_file).expect("Must read secrets file from disk");
    assert!(!disk_bytes.is_empty(), "Disk file must not be empty");
    let as_str = String::from_utf8_lossy(&disk_bytes);
    assert!(!as_str.contains("simple_value"), "Secrets file MUST NOT contain plaintext values!");
    assert!(!as_str.contains("unicode_key"), "Secrets file MUST NOT contain plaintext keys!");

    // Verify retrieval matches exactly
    for (k, v) in &test_cases {
        let retrieved = retrieve_secret(k).expect("Retrieve secret must succeed");
        assert_eq!(retrieved.as_deref(), Some(*v), "Mismatch for key '{}'", k);
    }

    // Verify deletion
    assert!(delete_secret("simple_key").is_ok());
    assert_eq!(retrieve_secret("simple_key").unwrap(), None);

    // Clean up
    let _ = fs::remove_file(&target_file);
    std::env::remove_var("NEXUS_SECRETS_PATH");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Arbitrary Byte Values Roundtrip (DPAPI / AES-GCM)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_arbitrary_bytes_roundtrip() {
    let _lock = TEST_MUTEX.lock().unwrap();

    // A. Empty byte array
    let empty: &[u8] = b"";
    let enc_empty = encrypt_bytes(empty).expect("Encrypt empty bytes should succeed");
    let dec_empty = decrypt_bytes(&enc_empty).expect("Decrypt empty bytes should succeed");
    assert_eq!(dec_empty, empty);

    // B. Single byte
    let single: &[u8] = &[0x42];
    let enc_single = encrypt_bytes(single).expect("Encrypt single byte should succeed");
    let dec_single = decrypt_bytes(&enc_single).expect("Decrypt single byte should succeed");
    assert_eq!(dec_single, single);

    // C. All 256 byte values (0x00 to 0xFF)
    let all_bytes: Vec<u8> = (0u8..=255u8).collect();
    let enc_all = encrypt_bytes(&all_bytes).expect("Encrypt all byte values should succeed");
    assert_ne!(enc_all, all_bytes, "Ciphertext must differ from plaintext");
    let dec_all = decrypt_bytes(&enc_all).expect("Decrypt all byte values should succeed");
    assert_eq!(dec_all, all_bytes);

    // D. 64 KB pseudo-random binary payload
    let mut random_buf = vec![0u8; 65536];
    OsRng.fill_bytes(&mut random_buf);
    let enc_rand = encrypt_bytes(&random_buf).expect("Encrypt 64KB random buffer should succeed");
    let dec_rand = decrypt_bytes(&enc_rand).expect("Decrypt 64KB random buffer should succeed");
    assert_eq!(dec_rand, random_buf);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. File Edge Cases: Non-Existent, Zero-Byte, and Corrupted Files
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_file_edge_cases() {
    let _lock = TEST_MUTEX.lock().unwrap();

    let temp_file = std::env::temp_dir().join(format!("zendev_edge_test_{}.enc", now_ms()));
    std::env::set_var("NEXUS_SECRETS_PATH", temp_file.to_str().unwrap());

    // Case A: Non-existent file
    if temp_file.exists() {
        let _ = fs::remove_file(&temp_file);
    }
    assert_eq!(retrieve_secret("non_existent").unwrap(), None, "Non-existent file should return None");

    // Case B: Zero-byte file (0 bytes on disk)
    fs::write(&temp_file, b"").expect("Write 0-byte file");
    assert_eq!(temp_file.metadata().unwrap().len(), 0);
    // Retrieving on zero-byte file must NOT panic and return None
    let ret_zero = retrieve_secret("any_key");
    assert!(ret_zero.is_ok(), "Zero-byte file must not cause retrieve_secret to error or panic");
    assert_eq!(ret_zero.unwrap(), None);

    // Storing to a zero-byte file should smoothly heal and persist
    let heal_store = store_secret("healed_key", "healed_value");
    assert!(heal_store.is_ok(), "Storing into 0-byte file must overwrite/heal");
    assert_eq!(retrieve_secret("healed_key").unwrap().as_deref(), Some("healed_value"));

    // Case C: Corrupted garbage bytes
    fs::write(&temp_file, b"CORRUPTED_GARBAGE_BYTES_NOT_DPAPI_OR_AES").expect("Write garbage");
    let ret_corrupt = retrieve_secret("healed_key");
    assert!(ret_corrupt.is_ok(), "Corrupted file must not panic");
    assert_eq!(ret_corrupt.unwrap(), None, "Corrupted file must gracefully yield None");

    // Case D: Truncated AES magic header
    fs::write(&temp_file, b"NEXUS").expect("Write truncated header");
    let ret_trunc = retrieve_secret("healed_key");
    assert!(ret_trunc.is_ok(), "Truncated header must not panic");
    assert_eq!(ret_trunc.unwrap(), None);

    // Case E: Truncated AES payload (valid magic, missing ciphertext)
    fs::write(&temp_file, b"NEXUSENC1234").expect("Write truncated AES payload");
    let ret_trunc_aes = retrieve_secret("healed_key");
    assert!(ret_trunc_aes.is_ok(), "Truncated AES payload must not panic");
    assert_eq!(ret_trunc_aes.unwrap(), None);

    // Case F: Direct decrypt_bytes on corrupted data must return Err, NOT panic
    assert!(decrypt_bytes(b"INVALID").is_err(), "Corrupted input to decrypt_bytes must return Err");
    assert!(decrypt_bytes(&[0xFF; 100]).is_err(), "Random bytes must return Err");

    // Clean up
    let _ = fs::remove_file(&temp_file);
    std::env::remove_var("NEXUS_SECRETS_PATH");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. License Tamper Resistance (Tampered Signature, Expired, Foreign HWID)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_license_tamper_resistance() {
    let _lock = TEST_MUTEX.lock().unwrap();

    let test_secret = "TEST_SECRET_MIGRATION_2025";
    let current_hwid = get_device_id();

    // ── A. HMAC License Tamper Resistance ──

    // Valid Pro lifetime HMAC key
    let mut mac = hmac::Hmac::<sha2::Sha256>::new_from_slice(test_secret.as_bytes()).unwrap();
    mac.update(b"P000");
    let sig16 = hex::encode(hmac::Mac::finalize(mac).into_bytes())[0..16].to_uppercase();

    // 1. Tampered HMAC signature (modify one character in signature)
    let tampered_char = if sig16.starts_with('A') { 'B' } else { 'A' };
    let tampered_hmac_key = format!("NEXUS-P000{}{}", tampered_char, &sig16[1..]);
    let err_hmac_sig = validate_hmac_license_key(&tampered_hmac_key, test_secret);
    assert!(err_hmac_sig.is_err(), "Tampered HMAC signature must be rejected");
    assert_eq!(err_hmac_sig.err().unwrap(), "Cryptographic signature mismatch");

    // 2. Expired HMAC key (EEE = "001" which is Feb 2024, in the past)
    let mut mac_exp = hmac::Hmac::<sha2::Sha256>::new_from_slice(test_secret.as_bytes()).unwrap();
    mac_exp.update(b"P001");
    let exp_sig = hex::encode(hmac::Mac::finalize(mac_exp).into_bytes())[0..16].to_uppercase();
    let expired_hmac_key = format!("NEXUS-P001{}", exp_sig);
    let err_hmac_exp = validate_hmac_license_key(&expired_hmac_key, test_secret);
    assert!(err_hmac_exp.is_err(), "Expired HMAC key must be rejected");
    assert_eq!(err_hmac_exp.err().unwrap(), "License key has expired");

    // 3. Unknown tier in HMAC key
    let bad_tier_key = format!("NEXUS-Z000{}", sig16);
    let err_bad_tier = validate_hmac_license_key(&bad_tier_key, test_secret);
    assert!(err_bad_tier.is_err(), "Unknown tier must be rejected");

    // ── B. ECDSA License Tamper Resistance ──

    let signing_key = SigningKey::random(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    let public_key_pem = verifying_key.to_public_key_pem(Default::default()).unwrap();

    let build_ecdsa_envelope = |payload_str: &str, signer: &SigningKey| -> String {
        let payload_bytes = payload_str.as_bytes();
        let sig: DerSignature = signer.sign(payload_bytes);
        let mut envelope = Vec::new();
        envelope.push(0x01u8);
        envelope.extend_from_slice(&(payload_bytes.len() as u16).to_be_bytes());
        envelope.extend_from_slice(payload_bytes);
        envelope.extend_from_slice(&sig.to_bytes());
        format!("ZENDEV-{}", data_encoding::BASE32_NOPAD.encode(&envelope))
    };

    // 1. Foreign HWID
    let foreign_hwid = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    let foreign_payload = serde_json::json!({
        "tier": "pro",
        "hwid": foreign_hwid,
        "expiresAt": 0,
    }).to_string();
    let foreign_key = build_ecdsa_envelope(&foreign_payload, &signing_key);
    let err_foreign = validate_ecdsa_license_key(&foreign_key, Some(&current_hwid), Some(&public_key_pem));
    assert!(err_foreign.is_err(), "Foreign HWID must be rejected");
    assert!(err_foreign.err().unwrap().contains("mismatch"), "Error must state mismatch");

    // 2. Expired ECDSA Key (expired 10 seconds ago)
    let past_timestamp = now_ms() - 10000;
    let expired_payload = serde_json::json!({
        "tier": "pro",
        "hwid": current_hwid,
        "expiresAt": past_timestamp,
    }).to_string();
    let expired_ecdsa_key = build_ecdsa_envelope(&expired_payload, &signing_key);
    let err_ecdsa_exp = validate_ecdsa_license_key(&expired_ecdsa_key, Some(&current_hwid), Some(&public_key_pem));
    assert!(err_ecdsa_exp.is_err(), "Expired ECDSA key must be rejected");
    assert_eq!(err_ecdsa_exp.err().unwrap(), "License key has expired");

    // 3. Tampered ECDSA Signature
    let valid_payload = serde_json::json!({
        "tier": "pro",
        "hwid": current_hwid,
        "expiresAt": 0,
    }).to_string();
    let valid_ecdsa_key = build_ecdsa_envelope(&valid_payload, &signing_key);

    // Flip bits in the base32 key
    let mut tampered_key_chars: Vec<char> = valid_ecdsa_key.chars().collect();
    let len = tampered_key_chars.len();
    tampered_key_chars[len - 2] = if tampered_key_chars[len - 2] == 'A' { 'B' } else { 'A' };
    let tampered_ecdsa_key: String = tampered_key_chars.into_iter().collect();

    let err_tampered_sig = validate_ecdsa_license_key(&tampered_ecdsa_key, Some(&current_hwid), Some(&public_key_pem));
    assert!(err_tampered_sig.is_err(), "Tampered ECDSA key must fail verification");

    // 4. Tampered payload with original signature (payload forgery)
    let forged_payload = serde_json::json!({
        "tier": "lifetime",
        "hwid": current_hwid,
        "expiresAt": 0,
    }).to_string();
    // Using original signature from valid_payload on forged_payload
    let valid_envelope = data_encoding::BASE32_NOPAD.decode(
        valid_ecdsa_key.strip_prefix("ZENDEV-").unwrap().as_bytes()
    ).unwrap();
    let orig_payload_len = u16::from_be_bytes([valid_envelope[1], valid_envelope[2]]) as usize;
    let orig_sig = &valid_envelope[3 + orig_payload_len..];

    let mut forged_envelope = Vec::new();
    forged_envelope.push(0x01u8);
    forged_envelope.extend_from_slice(&(forged_payload.len() as u16).to_be_bytes());
    forged_envelope.extend_from_slice(forged_payload.as_bytes());
    forged_envelope.extend_from_slice(orig_sig);
    let forged_key = format!("ZENDEV-{}", data_encoding::BASE32_NOPAD.encode(&forged_envelope));

    let err_forgery = validate_ecdsa_license_key(&forged_key, Some(&current_hwid), Some(&public_key_pem));
    assert!(err_forgery.is_err(), "Forged payload with copied signature must fail");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Audit Default Storage Directory Path
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_audit_default_storage_path() {
    let _lock = TEST_MUTEX.lock().unwrap();

    // When no override is provided, what does get_storage_dir() resolve to?
    std::env::remove_var("NEXUS_STORAGE_DIR");
    std::env::remove_var("NEXUS_SECRETS_PATH");

    let default_dir = get_storage_dir();
    let appdata = std::env::var("APPDATA").expect("APPDATA must be set on Windows");
    let expected_electron = Path::new(&appdata).join("ZenDev");
    let expected_desktop_spec = Path::new(&appdata).join("com.zendev.desktop");

    // Note: The worker's handoff claimed '%APPDATA%\com.zendev.desktop\nexus_secrets.enc',
    // but the code uses join("ZenDev") to preserve Electron backward-compatibility.
    assert_eq!(
        default_dir, expected_electron,
        "Default storage dir matches Electron app.getPath('userData') = %APPDATA%\\ZenDev"
    );
    assert_ne!(
        default_dir, expected_desktop_spec,
        "Discrepancy observed: Worker handoff claimed com.zendev.desktop, but code implemented ZenDev"
    );
}