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

//! Adversarial Verification Suite for Milestone M2: Hardware ID & License Backward Compatibility.
//!
//! Empirically challenges:
//! 1. Test vector 1: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a" -> Stage 1 SHA-256 -> Stage 2 HMAC-SHA256("nexus-device-salt").
//! 2. Edge case sanitization: whitespace, leading/trailing \r\n\t, uppercase GUIDs, corrupted registry values.
//! 3. Device lock bypass defense: verifying that naive single-hashing (HMAC or SHA-256) cannot satisfy device lock.

use hmac::{Hmac, Mac};
use p256::ecdsa::signature::Signer;
use p256::ecdsa::{DerSignature, SigningKey};
use p256::pkcs8::EncodePublicKey;
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use zendev_tauri_lib::hwid::*;
use zendev_tauri_lib::license::*;

type HmacSha256 = Hmac<Sha256>;

const VECTOR1_GUID: &str = "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a";
const EXPECTED_VECTOR1_STAGE1: &str =
    "065bc44aa07472f2453b6281d7d23864bbe861dc4bd256b8da9cbd47ac1d6c49";
const EXPECTED_VECTOR1_STAGE2: &str =
    "f963c6fe02f6b9f5409631d43276b272d149c92bc48cdc4e8355469e108f8682";

#[test]
fn test_adversarial_test_vector_1_fidelity() {
    // 1. Stage 1 SHA-256 hash check
    let stage1 = derive_stage1_sha256(VECTOR1_GUID);
    assert_eq!(
        stage1, EXPECTED_VECTOR1_STAGE1,
        "Stage 1 SHA-256 must match authoritative vector 1 hash"
    );

    // 2. Stage 2 HMAC-SHA256 check
    let stage2 = derive_stage2_hmac(&stage1);
    assert_eq!(
        stage2, EXPECTED_VECTOR1_STAGE2,
        "Stage 2 HMAC-SHA256 must match authoritative vector 1 device ID"
    );

    // Cross-verify with independent direct HMAC calculation
    let mut mac = HmacSha256::new_from_slice(DEVICE_SALT).expect("HMAC init");
    mac.update(stage1.as_bytes());
    let direct_stage2 = hex::encode(mac.finalize().into_bytes());
    assert_eq!(stage2, direct_stage2);
}

#[test]
fn test_adversarial_normalization_edge_cases() {
    // A. Uppercase GUID
    let upper = "D1E2F3A4-B5C6-7D8E-9F0A-1B2C3D4E5F6A";
    assert_eq!(normalize_machine_guid(upper), VECTOR1_GUID);

    // B. Leading & trailing whitespace, \r, \n, \t
    let messy_whitespace = " \t\r\n  d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a  \r\n\t ";
    assert_eq!(normalize_machine_guid(messy_whitespace), VECTOR1_GUID);

    // C. Mixed uppercase + messy newlines
    let messy_mixed = "\r\n\t  D1E2F3A4-B5C6-7D8E-9F0A-1B2C3D4E5F6A  \r\n  ";
    let normalized = normalize_machine_guid(messy_mixed);
    assert_eq!(normalized, VECTOR1_GUID);

    let stage1 = derive_stage1_sha256(&normalized);
    assert_eq!(stage1, EXPECTED_VECTOR1_STAGE1);
    let stage2 = derive_stage2_hmac(&stage1);
    assert_eq!(stage2, EXPECTED_VECTOR1_STAGE2);

    // D. Internal spaces around delimiters
    let internal_spaces = "d1e2f3a4 - b5c6 - 7d8e - 9f0a - 1b2c3d4e5f6a";
    assert_eq!(normalize_machine_guid(internal_spaces), VECTOR1_GUID);

    // E. Empty & whitespace-only strings
    assert_eq!(normalize_machine_guid(""), "");
    assert_eq!(normalize_machine_guid("   \t\r\n   "), "");
}

#[test]
fn test_adversarial_corrupted_registry_values() {
    // 1. Missing REG_SZ token in REG.exe stdout
    let corrupted_output_no_token =
        "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_DWORD    0x1\r\n";
    let part = corrupted_output_no_token.split("REG_SZ").nth(1);
    assert!(part.is_none(), "Corrupted registry output without REG_SZ should return None");

    // 2. Extra tokens or padding around REG_SZ
    let malformed_reg_stdout =
        "\r\n\r\nMachineGuid    REG_SZ     \t\r\n  D1E2F3A4-B5C6-7D8E-9F0A-1B2C3D4E5F6A   \r\n\r\n";
    let part = malformed_reg_stdout.split("REG_SZ").nth(1).unwrap();
    let cleaned = normalize_machine_guid(part);
    assert_eq!(cleaned, VECTOR1_GUID);

    // 3. Fallback behaves safely under empty or missing username
    let fallback_empty = derive_fallback_device_id("", "win32");
    assert_eq!(fallback_empty.len(), 64);
    assert!(fallback_empty.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_adversarial_single_hashing_cannot_bypass_device_lock() {
    let genuine_hwid = EXPECTED_VECTOR1_STAGE2;

    // Attacker Attempt 1: Raw GUID HMAC with nexus-device-salt
    let mut mac1 = HmacSha256::new_from_slice(DEVICE_SALT).unwrap();
    mac1.update(VECTOR1_GUID.as_bytes());
    let single_hmac_guid = hex::encode(mac1.finalize().into_bytes());

    assert_ne!(
        single_hmac_guid, genuine_hwid,
        "Single HMAC over raw GUID must NOT match Stage 2 HWID"
    );

    // Attacker Attempt 2: Stage 1 SHA-256 alone
    assert_ne!(
        EXPECTED_VECTOR1_STAGE1, genuine_hwid,
        "Stage 1 SHA-256 alone must NOT match Stage 2 HWID"
    );

    // Attacker Attempt 3: Single SHA-256 over raw GUID with salt prefix
    let mut hasher = Sha256::new();
    hasher.update(b"nexus-device-salt");
    hasher.update(VECTOR1_GUID.as_bytes());
    let salted_sha256 = hex::encode(hasher.finalize());
    assert_ne!(
        salted_sha256, genuine_hwid,
        "Salted SHA-256 must NOT match genuine Stage 2 HWID"
    );

    // Attacker Attempt 4: Feed single-hash into ECDSA license verification
    let signing_key = SigningKey::random(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    let public_key_pem = verifying_key.to_public_key_pem(Default::default()).unwrap();

    let payload_json = serde_json::json!({
        "tier": "pro",
        "hwid": genuine_hwid,
        "expiresAt": 0,
        "customer": "victim-company",
        "features": ["all"]
    })
    .to_string();

    let payload_bytes = payload_json.as_bytes();
    let signature: DerSignature = signing_key.sign(payload_bytes);

    let mut envelope = Vec::new();
    envelope.push(0x01u8);
    envelope.extend_from_slice(&(payload_bytes.len() as u16).to_be_bytes());
    envelope.extend_from_slice(payload_bytes);
    envelope.extend_from_slice(&signature.to_bytes());

    let license_key = format!("ZENDEV-{}", data_encoding::BASE32_NOPAD.encode(&envelope));

    // Valid check with genuine HWID
    let valid_check =
        validate_ecdsa_license_key(&license_key, Some(genuine_hwid), Some(&public_key_pem));
    assert!(valid_check.is_ok(), "Genuine HWID must succeed");

    // Bypass check: Attacker provides single_hmac_guid as current HWID
    let bypass_check_1 =
        validate_ecdsa_license_key(&license_key, Some(&single_hmac_guid), Some(&public_key_pem));
    assert!(
        bypass_check_1.is_err(),
        "Single HMAC HWID must be rejected by license validator"
    );
    assert!(bypass_check_1.err().unwrap().contains("mismatch"));

    // Bypass check: Attacker provides Stage 1 hash as current HWID
    let bypass_check_2 = validate_ecdsa_license_key(
        &license_key,
        Some(EXPECTED_VECTOR1_STAGE1),
        Some(&public_key_pem),
    );
    assert!(
        bypass_check_2.is_err(),
        "Stage 1 HWID must be rejected by license validator"
    );
    assert!(bypass_check_2.err().unwrap().contains("mismatch"));
}
