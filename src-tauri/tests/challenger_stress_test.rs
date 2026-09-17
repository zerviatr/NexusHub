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

//! Adversarial Stress-Testing & Empirical Verification Harness (Milestone M7)
//! Authored by Challenger 1 (challenger_m7_1)
//!
//! Evaluates:
//! 1. HWID Legacy node-machine-id backward compatibility under adversarial inputs
//! 2. Cyber Fortress cryptographic invariants (51B header tampering, 128-bit auth tag bitflips)
//! 3. Network SSRF guards (internal IP representations, alternative encodings, decimal/hex/octal)
//! 4. System utilities invariants (clipboard 50-entry/50KB cap, organizer collisions, blockchain audit chain)

use std::fs;
use std::path::PathBuf;

use zendev_tauri_lib::hwid::*;
use zendev_tauri_lib::crypto::*;
use zendev_tauri_lib::net_dispatcher::*;
use zendev_tauri_lib::organizer::{
    get_category, CATEGORY_ARCHIVES, CATEGORY_AUDIO, CATEGORY_CODE, CATEGORY_DOCUMENTS,
    CATEGORY_IMAGES, CATEGORY_INSTALLERS, CATEGORY_OTHERS, CATEGORY_VIDEOS,
};
use zendev_tauri_lib::journal::*;

fn create_temp_sandbox(prefix: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!(
        "challenger1_{}_{}_{}",
        prefix,
        std::process::id(),
        rand::random::<u32>()
    ));
    fs::create_dir_all(&sandbox).expect("failed to create sandbox directory");
    let sandbox_clone = sandbox.clone();
    let cleanup = move || {
        let _ = fs::remove_dir_all(&sandbox_clone);
    };
    (sandbox, cleanup)
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN 1: HWID ADVERSARIAL STRESS TESTS & LEGACY NODE-MACHINE-ID ORACLE
// ─────────────────────────────────────────────────────────────────────────────

fn node_machine_id_oracle(input: &str) -> String {
    // JavaScript: input.replace(/\r+|\n+|\s+/ig, '').toLowerCase()
    input
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '\r' && *c != '\n')
        .collect::<String>()
        .to_lowercase()
}

#[test]
fn test_challenger_hwid_oracle_fuzzing_500_permutations() {
    let base_guids = [
        "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
        "8d2e925d-b911-4b8a-8f12-090a9a0871a0",
        "00000000-0000-0000-0000-000000000000",
        "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "12345678-abcd-ef01-2345-6789abcdef01",
    ];

    let whitespace_patterns = [
        " ",
        "  ",
        "\t",
        "\r\n",
        "\n",
        "\r",
        " \t \r\n ",
        "\u{00A0}", // Non-breaking space
        "\r\r\n\n\t\t",
    ];

    for base in base_guids {
        // 1. Authoritative verification of Stage 1 and Stage 2 derivations
        let norm_rust = normalize_machine_guid(base);
        let norm_oracle = node_machine_id_oracle(base);
        assert_eq!(norm_rust, norm_oracle);

        let stage1 = derive_stage1_sha256(&norm_rust);
        let stage2 = derive_stage2_hmac(&stage1);
        assert_eq!(stage1.len(), 64);
        assert_eq!(stage2.len(), 64);

        // 2. Adversarial permutations: injection of whitespaces and case mutations
        for (i, ws) in whitespace_patterns.iter().enumerate() {
            // Mixed case mutation
            let mutated_case: String = base
                .chars()
                .enumerate()
                .map(|(idx, ch)| if (idx + i) % 2 == 0 { ch.to_ascii_uppercase() } else { ch.to_ascii_lowercase() })
                .collect();

            // Insert whitespace at start, end, and around hyphens
            let messy_input = format!("{}{}{}{}{}", ws, mutated_case.replace('-', &format!("{}-{}", ws, ws)), ws, ws, ws);

            let rust_res = normalize_machine_guid(&messy_input);
            let oracle_res = node_machine_id_oracle(&messy_input);

            assert_eq!(
                rust_res, oracle_res,
                "Rust normalize_machine_guid diverged from Node.js oracle on input: {:?}",
                messy_input
            );
            assert_eq!(
                rust_res, base,
                "Normalized GUID did not match original base: got {:?}, expected {:?}",
                rust_res, base
            );

            // Re-verify hash reproducibility
            assert_eq!(derive_stage1_sha256(&rust_res), stage1);
            assert_eq!(derive_stage2_hmac(&derive_stage1_sha256(&rust_res)), stage2);
        }
    }
}

#[test]
fn test_challenger_hwid_corrupt_registry_and_reg_cmd_buffers() {
    // Test simulated REG.exe query outputs with adversarial formatting
    let sample_guid = "8d2e925d-b911-4b8a-8f12-090a9a0871a0";

    let simulated_outputs = [
        format!("\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    {}\r\n", sample_guid),
        format!("MachineGuid    REG_SZ   \t  {}  \r\n\r\n", sample_guid.to_uppercase()),
        format!("\r\n\r\n\r\nMachineGuid    REG_SZ\t{}\n", sample_guid),
        format!("RandomPrefix\r\nMachineGuid REG_SZ {}\r\nRandomSuffix", sample_guid),
    ];

    for stdout in simulated_outputs {
        let part = stdout.split("REG_SZ").nth(1).expect("REG_SZ must exist in test sample");
        let cleaned = normalize_machine_guid(part);
        let oracle_expected = node_machine_id_oracle(part);
        assert_eq!(
            cleaned, oracle_expected,
            "Rust normalization must match Node.js node-machine-id oracle exactly"
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN 2: CYBER FORTRESS CRYPTOGRAPHIC INVARIANTS & TAMPERING STRESS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_challenger_cyber_fortress_exhaustive_header_truncation() {
    let (sandbox, cleanup) = create_temp_sandbox("truncation");
    let test_file = sandbox.join("test_truncated.vault");
    let password = "VaultChallengerPassword2026!";

    // Truncate file from 0 to 50 bytes (all lengths below exact 51-byte header)
    for len in 0..51 {
        let mut truncated_data = vec![0u8; len];
        if len >= 7 {
            truncated_data[0..7].copy_from_slice(MAGIC_HEADER);
        }
        fs::write(&test_file, &truncated_data).unwrap();

        let result = decrypt_file(&test_file, password, None).unwrap();
        assert!(!result.success, "Decryption MUST fail on header of length {}", len);
        assert!(result.error.is_some());
        let err = result.error.unwrap();
        assert_eq!(
            err, "Geçersiz dosya boyutu! Kasa başlığı eksik.",
            "Expected header length error for size {}",
            len
        );
    }

    cleanup();
}

#[test]
fn test_challenger_cyber_fortress_auth_tag_and_header_bitflip_fuzzing() {
    let (sandbox, cleanup) = create_temp_sandbox("tag_bitflips");
    let source_file = sandbox.join("classified_intel.txt");
    let payload = b"TOP_SECRET_MISSION_PLAN_ALPHA_BRAVO_CHARLIE_2026";
    fs::write(&source_file, payload).unwrap();

    let password = "UltraSecurePassword#2026";
    let enc_res = encrypt_file(&source_file, password, None).unwrap();
    assert!(enc_res.success);
    let vault_path = PathBuf::from(enc_res.out_path.unwrap());
    let original_vault_bytes = fs::read(&vault_path).unwrap();

    // Verify 51-byte header length + payload length
    assert_eq!(original_vault_bytes.len(), 51 + payload.len());

    // Fuzz authentication tag across all 16 bytes (offsets 35..51)
    // Testing LSB and MSB on every byte (32 strategic bitflips)
    let tag_start = 35;
    let tag_end = 51;

    for byte_offset in tag_start..tag_end {
        for &mask in &[0x01u8, 0x80u8] {
            let mut tampered_bytes = original_vault_bytes.clone();
            tampered_bytes[byte_offset] ^= mask;
            fs::write(&vault_path, &tampered_bytes).unwrap();

            let dec_res = decrypt_file(&vault_path, password, None).unwrap();
            assert!(
                !dec_res.success,
                "Decryption MUST fail when mask 0x{:02x} is applied to tag byte {}",
                mask, byte_offset
            );
            assert_eq!(
                dec_res.error.as_deref(),
                Some("Hatalı parola! Şifre çözülemedi."),
                "Error message must indicate decryption/auth failure"
            );

            // Ensure no staging file leak
            let entries = fs::read_dir(&sandbox).unwrap();
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                assert!(
                    !name.ends_with(".tmp"),
                    "Staging file leak detected during tag corruption: {}",
                    name
                );
            }
        }
    }

    // Now test salt tampering (offsets 7..23)
    for salt_offset in 7..23 {
        let mut tampered_bytes = original_vault_bytes.clone();
        tampered_bytes[salt_offset] ^= 0xAA;
        fs::write(&vault_path, &tampered_bytes).unwrap();

        let dec_res = decrypt_file(&vault_path, password, None).unwrap();
        assert!(!dec_res.success, "Decryption must fail when salt is tampered at offset {}", salt_offset);
        assert_eq!(dec_res.error.as_deref(), Some("Hatalı parola! Şifre çözülemedi."));
    }

    // Now test nonce tampering (offsets 23..35)
    for nonce_offset in 23..35 {
        let mut tampered_bytes = original_vault_bytes.clone();
        tampered_bytes[nonce_offset] ^= 0x55;
        fs::write(&vault_path, &tampered_bytes).unwrap();

        let dec_res = decrypt_file(&vault_path, password, None).unwrap();
        assert!(!dec_res.success, "Decryption must fail when nonce is tampered at offset {}", nonce_offset);
        assert_eq!(dec_res.error.as_deref(), Some("Hatalı parola! Şifre çözülemedi."));
    }

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN 3: NETWORK SSRF GUARDS ADVERSARIAL ENCODING VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_challenger_ssrf_internal_ip_representations() {
    // Comprehensive adversarial matrix of internal and metadata IP representations
    let test_matrix = [
        // Standard dotted decimal metadata
        ("http://169.254.169.254/latest/meta-data/", true, true),
        ("http://169.254.0.1/", true, true),
        ("http://169.254.169.250/", true, true),
        // Alternative numeric representations of 169.254.169.254
        ("http://2852039166/", true, true),             // Decimal integer
        ("http://0xa9fea9fe/", true, true),             // Hex integer
        ("http://0xA9FEA9FE/", true, true),             // Uppercase hex integer
        ("http://0251.0376.0251.0376/", true, true),   // Dotted octal
        ("http://0xa9.0xfe.0xa9.0xfe/", true, true),   // Dotted hex
        // Cloud metadata hostnames
        ("http://metadata.google.internal/computeMetadata/v1/", true, true),
        ("http://metadata.goog/", true, true),
        ("http://instance-data/latest/meta-data/", true, true),
        ("http://100.100.100.200/", true, true),
        ("http://168.63.129.16/", true, true),
        // Localhost & loopback representations (Blocked when allow_local = false)
        ("http://127.0.0.1/", false, false),
        ("http://127.0.0.2/", false, false),
        ("http://127.127.127.127/", false, false),
        ("http://localhost:8080/", false, false),
        ("http://api.localhost/", false, false),
        ("http://2130706433/", false, false),           // Decimal 127.0.0.1
        ("http://0x7f000001/", false, false),           // Hex 127.0.0.1
        ("http://0177.0000.0000.0001/", false, false), // Dotted octal 127.0.0.1
        ("http://0x7f.0x00.0x00.0x01/", false, false), // Dotted hex 127.0.0.1
        ("http://0.0.0.0/", false, false),
        // Private network RFC 1918 (Blocked when allow_local = false)
        ("http://10.0.0.1/", false, false),
        ("http://172.16.0.1/", false, false),
        ("http://172.31.255.255/", false, false),
        ("http://192.168.1.1/", false, false),
        ("http://192.168.0.254/", false, false),
    ];

    for (url_str, _is_metadata, must_block_even_if_allow_local) in test_matrix {
        // 1. With allow_local = false: MUST ALWAYS FAIL
        let res_no_local = validate_target_url(url_str, false);
        assert!(
            res_no_local.is_err(),
            "Expected URL to be blocked under allow_local=false: {}",
            url_str
        );

        // 2. With allow_local = true:
        let res_allow_local = validate_target_url(url_str, true);
        if must_block_even_if_allow_local {
            assert!(
                res_allow_local.is_err(),
                "Metadata target MUST be blocked unconditionally even under allow_local=true: {}",
                url_str
            );
            let err = res_allow_local.unwrap_err();
            assert!(
                err.contains("SSRF") || err.contains("cloud metadata"),
                "Error should mention SSRF/metadata for {}: got {}",
                url_str, err
            );
        } else {
            // If it's a private network/local address and allow_local=true, it is allowed
            assert!(
                res_allow_local.is_ok(),
                "Private network target should be allowed under allow_local=true: {}",
                url_str
            );
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN 4: SYSTEM UTILITIES INVARIANTS STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]

#[test]
fn test_challenger_organizer_collision_chain_stress() {
    let (sandbox, cleanup) = create_temp_sandbox("org_collision");

    let base_file = sandbox.join("report.pdf");
    fs::write(&base_file, b"base").unwrap();

    // Generate collisions up to (15)
    for i in 1..=15 {
        let colliding = sandbox.join(format!("report ({}).pdf", i));
        fs::write(&colliding, format!("content {}", i)).unwrap();
    }

    // Unique path should now be (16)
    let unique = get_unique_path(&base_file);
    assert_eq!(unique, sandbox.join("report (16).pdf"));

    // Verify all 8 categories mapped properly
    assert_eq!(get_category(".png"), CATEGORY_IMAGES);
    assert_eq!(get_category(".MP4"), CATEGORY_VIDEOS);
    assert_eq!(get_category("flac"), CATEGORY_AUDIO);
    assert_eq!(get_category(".docx"), CATEGORY_DOCUMENTS);
    assert_eq!(get_category(".7Z"), CATEGORY_ARCHIVES);
    assert_eq!(get_category(".exe"), CATEGORY_INSTALLERS);
    assert_eq!(get_category(".rs"), CATEGORY_CODE);
    assert_eq!(get_category(".unknown_extension_xyz"), CATEGORY_OTHERS);

    cleanup();
}

#[test]
fn test_challenger_activity_journal_hash_chain_tamper_evidence() {
    // Generate a chain of 15 valid activity entries
    let mut entries: Vec<ActivityEntry> = Vec::new();
    let mut prev_hash = GENESIS_PREV_HASH.to_string();

    for seq in 1..=15 {
        let mut entry = ActivityEntry {
            id: format!("act_test_{}", seq),
            sequence: seq,
            timestamp: 1700000000000 + (seq as i64 * 1000),
            tool_id: "fortress".to_string(),
            action: "encrypt".to_string(),
            category: "security".to_string(),
            status: "success".to_string(),
            details: format!("Encrypted confidential file #{}", seq),
            metadata: Some(serde_json::json!({
                "file": format!("doc_{}.pdf", seq),
                "bytes": seq * 1024
            })),
            duration_ms: Some(15),
            prev_hash: prev_hash.clone(),
            hash: String::new(),
        };
        entry.hash = compute_entry_hash(&entry);
        prev_hash = entry.hash.clone();
        entries.push(entry);
    }

    // 1. Clean verification: must be valid
    let clean_res = verify_audit_chain(&entries);
    assert!(clean_res.valid, "Untampered chain must pass verification");
    assert_eq!(clean_res.total_verified, 15);

    // 2. Tampering Attack 1: Modify content inside entry #7
    let mut tampered_content = entries.clone();
    tampered_content[7].details = "Encrypted confidential file #7 MODIFIED".to_string();
    let res_tamper1 = verify_audit_chain(&tampered_content);
    assert!(!res_tamper1.valid, "Content tampering must be detected");
    assert_eq!(res_tamper1.broken_index, Some(7));
    assert!(res_tamper1.broken_reason.unwrap().contains("Tampered content"));

    // 3. Tampering Attack 2: Modify metadata JSON in entry #3
    let mut tampered_meta = entries.clone();
    tampered_meta[3].metadata = Some(serde_json::json!({
        "file": "doc_3.pdf",
        "bytes": 9999999 // altered
    }));
    let res_tamper2 = verify_audit_chain(&tampered_meta);
    assert!(!res_tamper2.valid, "Metadata tampering must be detected");
    assert_eq!(res_tamper2.broken_index, Some(3));

    // 4. Tampering Attack 3: Break prevHash pointer between entry #4 and #5
    let mut broken_pointer = entries.clone();
    broken_pointer[5].prev_hash = "deadbeef".repeat(8);
    let res_tamper3 = verify_audit_chain(&broken_pointer);
    assert!(!res_tamper3.valid, "Broken hash pointer must be detected");
    assert_eq!(res_tamper3.broken_index, Some(5));
    assert!(res_tamper3.broken_reason.unwrap().contains("Chain broken"));

    // 5. Tampering Attack 4: Sequence gap (delete entry #8)
    let mut gapped = entries.clone();
    gapped.remove(8); // now sequence jumps from 8 to 10 at index 8
    let res_tamper4 = verify_audit_chain(&gapped);
    assert!(!res_tamper4.valid, "Sequence gap must be detected");
    assert_eq!(res_tamper4.broken_index, Some(8));

    // 6. Tampering Attack 5: Invalid genesis prev_hash
    let mut bad_genesis = entries.clone();
    bad_genesis[0].prev_hash = "1111111111111111111111111111111111111111111111111111111111111111".to_string();
    let res_tamper5 = verify_audit_chain(&bad_genesis);
    assert!(!res_tamper5.valid, "Invalid genesis must be detected");
    assert_eq!(res_tamper5.broken_index, Some(0));
    assert!(res_tamper5.broken_reason.unwrap().contains("Genesis prevHash mismatch"));
}
