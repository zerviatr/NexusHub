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

//! Hardware ID and License Verification Test Suite
//!
//! Provides comprehensive unit and integration verification for Milestone M2:
//! - Exact byte-for-byte Stage 1 & Stage 2 test vector fidelity.
//! - Normalization and sanitization of registry outputs.
//! - Cross-platform anonymous fallback hashing.
//! - Live Windows registry reading.
//! - Offline HMAC-SHA256 and NIST P-256 ECDSA license verification.
//! - Safe storage persistence and DPAPI / AES-GCM round-trips.

#[cfg(test)]
mod tests {
    use crate::hwid::*;
    use crate::license::*;
    use crate::safe_storage::*;
    use hmac::{Hmac, Mac};
    use p256::ecdsa::{DerSignature, SigningKey};
    use p256::pkcs8::EncodePublicKey;
    use rand::rngs::OsRng;
    use sha2::Sha256;


    type HmacSha256 = Hmac<Sha256>;

    const KNOWN_GUID: &str = "8d2e925d-b911-4b8a-8f12-090a9a0871a0";
    const EXPECTED_STAGE1_SHA256: &str =
        "27ef6ac4ca33913adcbbc7c539695ef45491fdf372fe1f41eeef5a91bc20aecc";
    const EXPECTED_STAGE2_HMAC: &str =
        "971ebe5fac55c27a43766a8f44a64d1c3cb2f5a41036662b5f9dd00e31d31390";

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Hardware ID Derivation & Test Vectors
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_node_machine_id_hash_pipeline() {
        // Step 1: node-machine-id hash(guid)
        let stage1 = derive_stage1_sha256(KNOWN_GUID);
        assert_eq!(
            stage1, EXPECTED_STAGE1_SHA256,
            "Stage 1 SHA-256 hash must exactly match legacy node-machine-id output"
        );

        // Step 2: ZenDev getDeviceId() HMAC-SHA256(stage1, "nexus-device-salt")
        let stage2 = derive_stage2_hmac(&stage1);
        assert_eq!(
            stage2, EXPECTED_STAGE2_HMAC,
            "Stage 2 HMAC must match ZenDev licenseStore.ts getDeviceId() output byte-for-byte"
        );
    }

    #[test]
    fn test_guid_normalization() {
        let messy = "  \r\n\t  8D2E925D-B911-4B8A-8F12-090A9A0871A0  \r\n  ";
        let cleaned = normalize_machine_guid(messy);
        assert_eq!(cleaned, KNOWN_GUID);

        let stage1 = derive_stage1_sha256(&cleaned);
        assert_eq!(stage1, EXPECTED_STAGE1_SHA256);

        let stage2 = derive_stage2_hmac(&stage1);
        assert_eq!(stage2, EXPECTED_STAGE2_HMAC);
    }

    #[test]
    fn test_reg_output_sanitization() {
        let mock_raw_stdout = "\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    8D2E925D-B911-4B8A-8F12-090A9A0871A0\r\n\r\n";
        let part = mock_raw_stdout.split("REG_SZ").nth(1).unwrap();
        let cleaned = normalize_machine_guid(part);
        assert_eq!(cleaned, KNOWN_GUID);
    }

    #[test]
    fn test_fallback_hash_calculation() {
        // Test vector from hwid_tauri_spec.md
        let fallback_device_id = derive_fallback_device_id("futbo", "win32");
        assert_eq!(
            fallback_device_id,
            "b50bbd0d60ddd30cfc2ee6eacfd0b3fba7ccec64e0b73d59980c77da3c6619fb",
            "Fallback device ID must match HMAC of 'futbo-win32'"
        );

        // Test with alice-win32
        let alice_fallback = derive_fallback_device_id("alice", "win32");
        let mut mac = HmacSha256::new_from_slice(DEVICE_SALT).unwrap();
        mac.update(b"alice-win32");
        let expected = hex::encode(mac.finalize().into_bytes());
        assert_eq!(alice_fallback, expected);
    }

    #[test]
    fn test_double_hashing_cannot_be_bypassed_by_single_hash() {
        // Naive single-hash failure demonstration:
        // Hashing the raw GUID directly with HMAC-SHA256 must NOT match EXPECTED_STAGE2_HMAC
        let mut mac = HmacSha256::new_from_slice(DEVICE_SALT).unwrap();
        mac.update(KNOWN_GUID.as_bytes());
        let naive_single_hash = hex::encode(mac.finalize().into_bytes());
        assert_ne!(
            naive_single_hash, EXPECTED_STAGE2_HMAC,
            "Single hash must never match double-hashed device ID"
        );
    }

    #[test]
    fn test_live_get_device_id_format() {
        let id = get_device_id();
        assert_eq!(id.len(), 64, "Device ID must be 64 hex characters (256-bit)");
        assert!(
            id.chars().all(|c| c.is_ascii_hexdigit() && !c.is_uppercase()),
            "Device ID must consist exclusively of lowercase hex characters"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_registry_read() {
        let res = get_guid_from_registry();
        assert!(res.is_ok(), "Reading MachineGuid from Windows registry must succeed");
        let guid = res.unwrap();
        assert_eq!(guid.len(), 36, "MachineGuid must be 36 characters long");
        assert_eq!(guid.matches('-').count(), 4, "MachineGuid must contain 4 hyphens");
        assert!(
            guid.chars().all(|c| c.is_ascii_hexdigit() || c == '-'),
            "MachineGuid must contain only hex digits and hyphens"
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: License Key Validation (HMAC & ECDSA)
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_hmac_license_validation_lifetime() {
        let test_secret = "TEST_SECRET_MIGRATION_2025";
        let tier = 'L';
        let eee = "000"; // lifetime

        let mut mac = HmacSha256::new_from_slice(test_secret.as_bytes()).unwrap();
        mac.update(format!("{}{}", tier, eee).as_bytes());
        let hmac_fragment = &hex::encode(mac.finalize().into_bytes())[0..16].to_uppercase();

        let raw_key = format!("NEXUS-{}{}{}", tier, eee, hmac_fragment);
        let result = validate_hmac_license_key(&raw_key, test_secret);
        assert!(result.is_ok(), "Valid lifetime HMAC key should validate");
        let valid = result.unwrap();
        assert_eq!(valid.tier, "lifetime");
        assert_eq!(valid.expires_at, 0);
        assert!(valid.is_legacy_hmac);
    }

    #[test]
    fn test_hmac_license_validation_entropy_format() {
        let test_secret = "TEST_SECRET_MIGRATION_2025";
        let tier = 'P'; // Pro
        let eee = "000"; // lifetime
        let ssss = "A1B2"; // 4-char salt

        let mut mac = HmacSha256::new_from_slice(test_secret.as_bytes()).unwrap();
        mac.update(format!("{}{}{}", tier, eee, ssss).as_bytes());
        let h12 = &hex::encode(mac.finalize().into_bytes())[0..12].to_uppercase();

        let raw_key = format!("NEXUS-{}{}{}{}", tier, eee, ssss, h12);
        let result = validate_hmac_license_key(&raw_key, test_secret);
        assert!(result.is_ok(), "High-entropy HMAC key should validate");
        let valid = result.unwrap();
        assert_eq!(valid.tier, "pro");
        assert_eq!(valid.expires_at, 0);
    }

    #[test]
    fn test_hmac_license_rejection_on_signature_mismatch() {
        let test_secret = "TEST_SECRET_MIGRATION_2025";
        let fake_key = "NEXUS-L000AAAAAAAAAAAAAAAA";
        let result = validate_hmac_license_key(fake_key, test_secret);
        assert!(result.is_err(), "Forged HMAC signature must fail");
        assert_eq!(result.err().unwrap(), "Cryptographic signature mismatch");
    }

    #[test]
    fn test_hmac_license_rejection_on_expired_key() {
        let test_secret = "TEST_SECRET_MIGRATION_2025";
        let tier = 'P';
        let eee = "001"; // 1 month since Jan 2024 -> expired in Feb 2024!

        let mut mac = HmacSha256::new_from_slice(test_secret.as_bytes()).unwrap();
        mac.update(format!("{}{}", tier, eee).as_bytes());
        let hmac_fragment = &hex::encode(mac.finalize().into_bytes())[0..16].to_uppercase();

        let expired_key = format!("NEXUS-{}{}{}", tier, eee, hmac_fragment);
        let result = validate_hmac_license_key(&expired_key, test_secret);
        assert!(result.is_err(), "Expired license key must fail");
        assert_eq!(result.err().unwrap(), "License key has expired");
    }

    #[test]
    fn test_ecdsa_license_validation_flow() {
        use p256::ecdsa::signature::Signer;

        // Generate ephemeral key pair for testing
        let signing_key = SigningKey::random(&mut OsRng);
        let verifying_key = signing_key.verifying_key();
        let public_key_pem = verifying_key.to_public_key_pem(Default::default()).unwrap();

        let current_hwid = EXPECTED_STAGE2_HMAC;

        // Construct valid payload
        let payload_json = serde_json::json!({
            "tier": "pro",
            "hwid": current_hwid,
            "expiresAt": 0,
            "customer": "enterprise-test",
            "features": ["all", "offline"]
        })
        .to_string();

        let payload_bytes = payload_json.as_bytes();
        let signature: DerSignature = signing_key.sign(payload_bytes);
        let sig_bytes = signature.to_bytes();

        // Pack envelope: [version (0x01)] + [payload_len (u16 BE)] + [payload] + [sig]
        let mut envelope = Vec::new();
        envelope.push(0x01u8);
        envelope.extend_from_slice(&(payload_bytes.len() as u16).to_be_bytes());
        envelope.extend_from_slice(payload_bytes);
        envelope.extend_from_slice(&sig_bytes);

        // Base32 encode envelope
        let base32_str = data_encoding::BASE32_NOPAD.encode(&envelope);
        let license_key = format!("ZENDEV-{}", base32_str);

        // 1. Valid test with matching HWID
        let valid_result = validate_ecdsa_license_key(&license_key, Some(current_hwid), Some(&public_key_pem));
        assert!(valid_result.is_ok(), "ECDSA license should successfully validate");
        let valid = valid_result.unwrap();
        assert_eq!(valid.tier, "pro");
        assert_eq!(valid.hwid.as_deref(), Some(current_hwid));
        assert_eq!(valid.expires_at, 0);

        // 2. Mismatch test with foreign HWID
        let foreign_hwid = "0".repeat(64);
        let mismatch_result = validate_ecdsa_license_key(&license_key, Some(&foreign_hwid), Some(&public_key_pem));
        assert!(mismatch_result.is_err(), "Foreign HWID must be rejected");
        assert!(mismatch_result.err().unwrap().contains("mismatch"));

        // 3. Signature tampering test
        let mut tampered_envelope = envelope.clone();
        let last_idx = tampered_envelope.len() - 1;
        tampered_envelope[last_idx] ^= 0xFF; // flip bits in signature
        let tampered_key = format!("ZENDEV-{}", data_encoding::BASE32_NOPAD.encode(&tampered_envelope));
        let tampered_result = validate_ecdsa_license_key(&tampered_key, Some(current_hwid), Some(&public_key_pem));
        assert!(tampered_result.is_err(), "Tampered signature must fail");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 3: Safe Storage Persistence
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_safestorage_bytes_roundtrip() {
        let plaintext = b"SuperSecretZenDevToken12345!@#$%^&*()_+";
        let encrypted = encrypt_bytes(plaintext).expect("Encryption should succeed");
        assert_ne!(encrypted, plaintext, "Ciphertext must not equal plaintext");

        let decrypted = decrypt_bytes(&encrypted).expect("Decryption should succeed");
        assert_eq!(decrypted, plaintext, "Decrypted text must match original plaintext");
    }

    #[test]
    fn test_safestorage_key_value_store() {
        let temp_dir = std::env::temp_dir().join(format!("zendev_test_{}", now_ms()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let test_secrets_file = temp_dir.join("nexus_secrets.enc");
        std::env::set_var("NEXUS_SECRETS_PATH", test_secrets_file.to_str().unwrap());

        // Store
        let store_res = store_secret("test_key", "secret_payload_value_987");
        assert!(store_res.is_ok(), "store_secret should succeed");

        // Retrieve
        let retrieved = retrieve_secret("test_key").expect("retrieve_secret should succeed");
        assert_eq!(retrieved, Some("secret_payload_value_987".to_string()));

        // Delete
        let delete_res = delete_secret("test_key");
        assert!(delete_res.is_ok(), "delete_secret should succeed");

        let after_delete = retrieve_secret("test_key").expect("retrieve should succeed after delete");
        assert_eq!(after_delete, None, "Deleted secret should be None");

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::env::remove_var("NEXUS_SECRETS_PATH");
    }
}
