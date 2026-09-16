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

//! Integration test suite for Hardware ID (HWID) and License Backward Compatibility.

use zendev_tauri_lib::hwid::*;
use zendev_tauri_lib::license::*;
use zendev_tauri_lib::safe_storage::*;

const KNOWN_GUID: &str = "8d2e925d-b911-4b8a-8f12-090a9a0871a0";
const EXPECTED_STAGE1_SHA256: &str =
    "27ef6ac4ca33913adcbbc7c539695ef45491fdf372fe1f41eeef5a91bc20aecc";
const EXPECTED_STAGE2_HMAC: &str =
    "971ebe5fac55c27a43766a8f44a64d1c3cb2f5a41036662b5f9dd00e31d31390";

#[test]
fn test_integration_hardware_id_matches_legacy_nodejs() {
    let stage1 = derive_stage1_sha256(KNOWN_GUID);
    assert_eq!(stage1, EXPECTED_STAGE1_SHA256);

    let stage2 = derive_stage2_hmac(&stage1);
    assert_eq!(stage2, EXPECTED_STAGE2_HMAC);
}

#[test]
fn test_integration_fallback_device_id() {
    let fallback = derive_fallback_device_id("futbo", "win32");
    assert_eq!(
        fallback,
        "b50bbd0d60ddd30cfc2ee6eacfd0b3fba7ccec64e0b73d59980c77da3c6619fb"
    );
}

#[test]
fn test_integration_live_device_id() {
    let id = get_device_id();
    assert_eq!(id.len(), 64);
    assert!(id.chars().all(|c| c.is_ascii_hexdigit() && !c.is_uppercase()));
}

#[cfg(target_os = "windows")]
#[test]
fn test_integration_windows_registry() {
    let guid = get_guid_from_registry().expect("Failed to read MachineGuid from registry");
    assert_eq!(guid.len(), 36);
    assert_eq!(guid.matches('-').count(), 4);
}

#[test]
fn test_integration_safestorage_roundtrip() {
    let data = b"NexusHub-Milestone-M2-Verification";
    let encrypted = encrypt_bytes(data).expect("Encryption failed");
    let decrypted = decrypt_bytes(&encrypted).expect("Decryption failed");
    assert_eq!(decrypted, data);
}

#[test]
fn test_integration_license_validation() {
    // Malformed key should fail gracefully
    let res = validate_license_key("INVALID-KEY-STRING", None, None);
    assert!(res.is_err());

    // License check command should return valid structure
    let status = license_check();
    assert!(!status.device_id.is_empty());
}

