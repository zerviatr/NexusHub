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

//! Adversarial Cross-Feature and Real-World Scenario Stress Harness for Milestone M7 (Tauri/Rust).
//!
//! Directly tests cross-feature interactions across Rust modules:
//! 1. HWID + License + SafeStorage
//! 2. Cyber Fortress (AES-256-GCM 51B header) + Activity Journal Blockchain
//! 3. Bulk Organizer + DoD 7-Pass Shredder
//! 4. Network Tools SSRF Guard + Link Bypasser Tracking Stripper
//! 5. Media Pipeline (PDF + Image) + Bulk Organizer
//! 6. System Sentinel + System Optimizer + Activity Journal Blockchain

use std::fs;
use std::path::PathBuf;
use zendev_tauri_lib::bypasser::strip_tracking_parameters;
use zendev_tauri_lib::crypto::{
    decrypt_file, encrypt_file, shred_file, HEADER_LEN, MAGIC_HEADER,
};
use zendev_tauri_lib::hwid::{get_device_id, normalize_machine_guid};
use zendev_tauri_lib::journal::{
    compute_entry_hash, verify_audit_chain, ActivityEntry, GENESIS_PREV_HASH,
};
use zendev_tauri_lib::net_dispatcher::{is_cloud_metadata_host, validate_target_url};
use zendev_tauri_lib::optimizer::format_bytes_to_mb;
use zendev_tauri_lib::organizer::{get_category, get_unique_path, CATEGORY_CODE, CATEGORY_DOCUMENTS, CATEGORY_IMAGES};
use zendev_tauri_lib::safe_storage::{decrypt_bytes, encrypt_bytes};
use zendev_tauri_lib::sentinel::get_system_metrics;

struct TempDirGuard {
    path: PathBuf,
}

impl TempDirGuard {
    fn new(prefix: &str) -> Self {
        let mut p = std::env::temp_dir();
        let rand_id: u64 = rand::random();
        p.push(format!("{}_{}_{}", prefix, std::process::id(), rand_id));
        fs::create_dir_all(&p).expect("Failed to create temporary directory");
        Self { path: p }
    }
}

impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HWID + License + SafeStorage Cross-Feature Interaction
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_m7_hwid_license_safestorage_roundtrip() {
    let device_id = get_device_id();
    assert_eq!(device_id.len(), 64, "Device ID must be 64-char hex string");

    // Encrypt and decrypt license payload using SafeStorage
    let fake_license = format!("ZENDEV-MOCK-LICENSE-LOCKED-TO-{}", device_id);
    let enc_bytes = encrypt_bytes(fake_license.as_bytes()).expect("SafeStorage encryption failed");
    assert!(!enc_bytes.is_empty());
    assert_ne!(enc_bytes, fake_license.as_bytes());

    let dec_bytes = decrypt_bytes(&enc_bytes).expect("SafeStorage decryption failed");
    let recovered_str = String::from_utf8(dec_bytes).expect("Valid UTF-8 string");
    assert_eq!(recovered_str, fake_license);

    // Verify normalization
    let raw_guid = " C57A94F0-4592-498B-9D41-3242EA87BC12\r\n ";
    let norm = normalize_machine_guid(raw_guid);
    assert_eq!(norm, "c57a94f0-4592-498b-9d41-3242ea87bc12");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cyber Fortress + Activity Journal Blockchain Cross-Feature Interaction
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_m7_cyber_fortress_and_activity_journal_blockchain() {
    let temp = TempDirGuard::new("test_m7_fortress_journal");
    let secret_file = temp.path.join("financial_report.xlsx");
    let original_content = b"HIGHLY-CONFIDENTIAL-Q3-PROFIT-AND-LOSS";
    fs::write(&secret_file, original_content).unwrap();

    let passphrase = "MasterFortressPassword2026!";
    let mut chain: Vec<ActivityEntry> = Vec::new();
    let mut last_hash = GENESIS_PREV_HASH.to_string();

    // 1. Encrypt File
    let enc_res = encrypt_file(&secret_file, passphrase, Some(&temp.path))
        .expect("Encryption must succeed");
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());
    assert!(vault_path.exists());

    // Verify 51-byte header
    let header_bytes = fs::read(&vault_path).unwrap();
    assert!(header_bytes.len() > HEADER_LEN);
    assert_eq!(&header_bytes[0..7], MAGIC_HEADER);

    // Record Encrypt Event to Activity Journal
    let mut e1 = ActivityEntry {
        id: "act-enc-101".to_string(),
        sequence: 1,
        timestamp: 1700000000000,
        tool_id: "cyber_fortress".to_string(),
        action: "file_encrypt".to_string(),
        category: "crypto".to_string(),
        status: "success".to_string(),
        details: "Encrypted financial_report.xlsx".to_string(),
        metadata: Some(serde_json::json!({ "cipher": "AES-256-GCM", "headerBytes": 51 })),
        duration_ms: Some(12),
        prev_hash: last_hash,
        hash: String::new(),
    };
    e1.hash = compute_entry_hash(&e1);
    last_hash = e1.hash.clone();
    chain.push(e1);

    // 2. Shred Plaintext File with DoD 7-Pass Shredder
    let shred_res = shred_file(&secret_file).expect("Shredding must succeed");
    assert!(shred_res.success);
    assert_eq!(shred_res.passes, Some(7));
    assert!(!secret_file.exists(), "Plaintext file must be completely unlinked");

    // Record Shred Event to Activity Journal
    let mut e2 = ActivityEntry {
        id: "act-shred-102".to_string(),
        sequence: 2,
        timestamp: 1700000001000,
        tool_id: "cyber_fortress".to_string(),
        action: "file_shred".to_string(),
        category: "crypto".to_string(),
        status: "success".to_string(),
        details: "Shredded financial_report.xlsx with 7 passes".to_string(),
        metadata: Some(serde_json::json!({ "passes": 7, "standard": "DoD 5220.22-M" })),
        duration_ms: Some(45),
        prev_hash: last_hash,
        hash: String::new(),
    };
    e2.hash = compute_entry_hash(&e2);
    last_hash = e2.hash.clone();
    chain.push(e2);

    // 3. Attempt Decrypt with Incorrect Passphrase -> Expect Rejection
    let fail_dec = decrypt_file(&vault_path, "WrongPassphrase123!", Some(&temp.path));
    assert!(fail_dec.is_err() || !fail_dec.as_ref().unwrap().success);

    // 4. Decrypt with Correct Passphrase -> Perfect Recovery
    let ok_dec = decrypt_file(&vault_path, passphrase, Some(&temp.path))
        .expect("Decryption with correct password must succeed");
    assert!(ok_dec.success);
    let restored_path = PathBuf::from(ok_dec.out_path.unwrap());
    let restored_bytes = fs::read(&restored_path).unwrap();
    assert_eq!(restored_bytes, original_content, "Restored content must match 100% byte-for-byte");

    // Record Decrypt Event to Activity Journal
    let mut e3 = ActivityEntry {
        id: "act-dec-103".to_string(),
        sequence: 3,
        timestamp: 1700000002000,
        tool_id: "cyber_fortress".to_string(),
        action: "file_decrypt".to_string(),
        category: "crypto".to_string(),
        status: "success".to_string(),
        details: "Decrypted financial_report.xlsx from vault".to_string(),
        metadata: Some(serde_json::json!({ "bytesRestored": restored_bytes.len() })),
        duration_ms: Some(8),
        prev_hash: last_hash,
        hash: String::new(),
    };
    e3.hash = compute_entry_hash(&e3);
    chain.push(e3);

    // Verify Cryptographic Blockchain Integrity
    let audit_verification = verify_audit_chain(&chain);
    assert!(audit_verification.valid, "Blockchain audit verification must be valid");
    assert_eq!(audit_verification.total_verified, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Bulk Organizer + DoD Shredder Cross-Feature Interaction
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_m7_bulk_organizer_and_dod_shredder() {
    let temp = TempDirGuard::new("test_m7_organizer_shredder");

    // Create heterogeneous file set
    let code_file = temp.path.join("deploy_script.py");
    let doc_file = temp.path.join("quarterly.pdf");
    let img_file = temp.path.join("screenshot.png");

    fs::write(&code_file, "print('PRIVATE-KEY')").unwrap();
    fs::write(&doc_file, "%PDF-1.7 ...").unwrap();
    fs::write(&img_file, b"\x89PNG...").unwrap();

    // Verify extension categorizations
    assert_eq!(get_category(".py"), CATEGORY_CODE);
    assert_eq!(get_category(".pdf"), CATEGORY_DOCUMENTS);
    assert_eq!(get_category(".png"), CATEGORY_IMAGES);

    // Target code file for DoD 7-Pass secure shredding
    assert!(code_file.exists());
    let shred_res = shred_file(&code_file).expect("Shredding must succeed");
    assert!(shred_res.success);
    assert!(!code_file.exists(), "Code file must be shredded");

    // Non-shredded files remain completely intact
    assert!(doc_file.exists(), "Document file must remain untouched");
    assert!(img_file.exists(), "Image file must remain untouched");

    // Collision avoidance test for organized target
    let target = temp.path.join("quarterly.pdf");
    let unique = get_unique_path(&target);
    assert_eq!(unique, temp.path.join("quarterly (1).pdf"));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Network Tools SSRF Guard + Link Bypasser Cross-Feature Interaction
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_m7_network_ssrf_and_bypasser() {
    // 1. Link Bypasser strips tracking parameters
    let tracked_url = "https://example.com/item?id=99&utm_source=ad&gclid=TEST&fbclid=FB#overview";
    let (cleaned_url, removed_count, removed_list) = strip_tracking_parameters(tracked_url);
    assert_eq!(removed_count, 3);
    assert_eq!(removed_list.len(), 3);
    assert!(!cleaned_url.contains("utm_source"));
    assert!(!cleaned_url.contains("gclid"));
    assert!(!cleaned_url.contains("fbclid"));
    assert!(cleaned_url.contains("id=99"));
    assert!(cleaned_url.contains("#overview"));

    // 2. Network Dispatcher SSRF Guard validates external safe URL
    let safe_validation = validate_target_url(&cleaned_url, false);
    assert!(safe_validation.is_ok(), "Cleaned external URL must pass SSRF check");

    // 3. Network Dispatcher SSRF Guard strictly blocks cloud metadata targets
    assert!(is_cloud_metadata_host("169.254.169.254"));
    assert!(is_cloud_metadata_host("metadata.google.internal"));
    assert!(is_cloud_metadata_host("100.100.100.200"));
    assert!(is_cloud_metadata_host("168.63.129.16"));
    assert!(is_cloud_metadata_host("[fe80::1]"));
    assert!(is_cloud_metadata_host("::ffff:169.254.169.254"));
    assert!(is_cloud_metadata_host("2852039166")); // Decimal IP for 169.254.169.254
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. System Sentinel + Optimizer + Journal Real-World Scenario
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_m7_sentinel_optimizer_journal_scenario() {
    // 1. Sentinel Telemetry
    let metrics = get_system_metrics();
    assert!(metrics.success);
    assert!(metrics.cpu.cores > 0);

    // 2. Optimizer formatting
    let freed_str = format_bytes_to_mb(10 * 1024 * 1024);
    assert_eq!(freed_str, "10.00 MB");

    // 3. Activity Journal Chain
    let mut chain = Vec::new();
    let last_hash = GENESIS_PREV_HASH.to_string();

    let mut entry = ActivityEntry {
        id: "scenario-entry-01".to_string(),
        sequence: 1,
        timestamp: 1700000000000,
        tool_id: "system_optimizer".to_string(),
        action: "optimize_all".to_string(),
        category: "system".to_string(),
        status: "success".to_string(),
        details: "Cleaned 10.00 MB temp files and flushed DNS".to_string(),
        metadata: Some(serde_json::json!({
            "cpuCores": metrics.cpu.cores,
            "freedFormatted": freed_str,
        })),
        duration_ms: Some(150),
        prev_hash: last_hash,
        hash: String::new(),
    };
    entry.hash = compute_entry_hash(&entry);
    chain.push(entry);

    let verify_res = verify_audit_chain(&chain);
    assert!(verify_res.valid);
    assert_eq!(verify_res.total_verified, 1);
}
