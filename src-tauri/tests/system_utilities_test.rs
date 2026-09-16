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
use std::path::PathBuf;
use zendev_tauri_lib::bypasser::{strip_tracking_parameters, MAX_REDIRECT_HOPS};
use zendev_tauri_lib::clipboard::{
    add_clipboard_entry, clipboard_clear, clipboard_delete, get_in_memory_history,
    MAX_BYTES, MAX_HISTORY,
};
use zendev_tauri_lib::journal::{
    canonical_stringify, compute_entry_hash, verify_audit_chain, ActivityEntry, GENESIS_PREV_HASH,
};
use zendev_tauri_lib::optimizer::{format_bytes_to_mb, system_scan_temp};
use zendev_tauri_lib::organizer::{
    get_category, get_unique_path, organizer_can_undo, organizer_execute, organizer_scan,
    organizer_undo, FileOperation, CATEGORY_ARCHIVES, CATEGORY_AUDIO, CATEGORY_CODE,
    CATEGORY_DOCUMENTS, CATEGORY_IMAGES, CATEGORY_INSTALLERS, CATEGORY_OTHERS, CATEGORY_VIDEOS,
};
use zendev_tauri_lib::sentinel::{get_system_metrics, optimize_memory_working_set};

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
// 1. Bulk File Organizer Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_organizer_category_mapping_all_extensions() {
    assert_eq!(get_category(".png"), CATEGORY_IMAGES);
    assert_eq!(get_category(".JPG"), CATEGORY_IMAGES);
    assert_eq!(get_category(".mp4"), CATEGORY_VIDEOS);
    assert_eq!(get_category(".mkv"), CATEGORY_VIDEOS);
    assert_eq!(get_category(".mp3"), CATEGORY_AUDIO);
    assert_eq!(get_category(".wav"), CATEGORY_AUDIO);
    assert_eq!(get_category(".pdf"), CATEGORY_DOCUMENTS);
    assert_eq!(get_category(".docx"), CATEGORY_DOCUMENTS);
    assert_eq!(get_category(".zip"), CATEGORY_ARCHIVES);
    assert_eq!(get_category(".tar.gz"), CATEGORY_OTHERS); // split extension
    assert_eq!(get_category(".gz"), CATEGORY_ARCHIVES);
    assert_eq!(get_category(".exe"), CATEGORY_INSTALLERS);
    assert_eq!(get_category(".msi"), CATEGORY_INSTALLERS);
    assert_eq!(get_category(".rs"), CATEGORY_CODE);
    assert_eq!(get_category(".ts"), CATEGORY_CODE);
    assert_eq!(get_category(".py"), CATEGORY_CODE);
    assert_eq!(get_category(".unknownext"), CATEGORY_OTHERS);
    assert_eq!(get_category(""), CATEGORY_OTHERS);
}

#[test]
fn test_organizer_unique_path_collision_avoidance() {
    let temp = TempDirGuard::new("test_organizer_unique");
    let base_file = temp.path.join("contract.pdf");

    // File does not exist yet -> returns base target
    assert_eq!(get_unique_path(&base_file), base_file);

    // Create contract.pdf -> collision triggers (1)
    fs::write(&base_file, "v1").unwrap();
    let unique1 = get_unique_path(&base_file);
    assert_eq!(unique1, temp.path.join("contract (1).pdf"));

    // Create contract (1).pdf -> collision triggers (2)
    fs::write(&unique1, "v2").unwrap();
    let unique2 = get_unique_path(&base_file);
    assert_eq!(unique2, temp.path.join("contract (2).pdf"));
}

#[tokio::test]
async fn test_organizer_scan_execute_and_undo_cycle() {
    let temp = TempDirGuard::new("test_organizer_cycle");
    let file1 = temp.path.join("photo.png");
    let file2 = temp.path.join("document.pdf");
    let file3 = temp.path.join("source.rs");

    fs::write(&file1, "PNG_DATA").unwrap();
    fs::write(&file2, "PDF_DATA").unwrap();
    fs::write(&file3, "RS_DATA").unwrap();

    // 1. Scan directory
    let scan_res = organizer_scan(temp.path.to_string_lossy().to_string())
        .await
        .unwrap();
    assert!(scan_res.success);
    let files = scan_res.files.unwrap();
    assert_eq!(files.len(), 3);

    let img = files.iter().find(|f| f.original_name == "photo.png").unwrap();
    assert_eq!(img.suggested_category, CATEGORY_IMAGES);

    let doc = files.iter().find(|f| f.original_name == "document.pdf").unwrap();
    assert_eq!(doc.suggested_category, CATEGORY_DOCUMENTS);

    let code = files.iter().find(|f| f.original_name == "source.rs").unwrap();
    assert_eq!(code.suggested_category, CATEGORY_CODE);

    // 2. Execute move operations
    let dest_img = temp.path.join("Images").join("photo.png");
    let dest_doc = temp.path.join("Documents").join("document.pdf");
    let dest_code = temp.path.join("Code").join("source.rs");

    let operations = vec![
        FileOperation {
            old_path: file1.to_string_lossy().to_string(),
            new_path: dest_img.to_string_lossy().to_string(),
        },
        FileOperation {
            old_path: file2.to_string_lossy().to_string(),
            new_path: dest_doc.to_string_lossy().to_string(),
        },
        FileOperation {
            old_path: file3.to_string_lossy().to_string(),
            new_path: dest_code.to_string_lossy().to_string(),
        },
    ];

    let exec_res = organizer_execute(operations).await.unwrap();
    assert!(exec_res.success);
    assert_eq!(exec_res.successful_operations, 3);
    assert_eq!(exec_res.failed_operations, 0);

    assert!(dest_img.exists());
    assert!(dest_doc.exists());
    assert!(dest_code.exists());
    assert!(!file1.exists());
    assert!(!file2.exists());
    assert!(!file3.exists());

    // 3. Verify undo state
    assert!(organizer_can_undo());

    // 4. Execute Undo
    let undo_res = organizer_undo().await.unwrap();
    assert!(undo_res.success);
    assert_eq!(undo_res.restored, 3);

    // Verify files restored back
    assert!(file1.exists());
    assert!(file2.exists());
    assert!(file3.exists());
    assert!(!dest_img.exists());
    assert!(!dest_doc.exists());
    assert!(!dest_code.exists());

    // Can no longer undo
    assert!(!organizer_can_undo());
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Clipboard Manager Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_clipboard_ring_buffer_limits_and_rejection() {
    clipboard_clear();

    // 1. Push 60 small items -> must cap at MAX_HISTORY (50)
    for i in 0..60 {
        let added = add_clipboard_entry(&format!("clip item {}", i));
        assert!(added);
    }
    let history = get_in_memory_history();
    assert_eq!(history.len(), MAX_HISTORY);
    // Newest is at index 0
    assert_eq!(history[0].text, "clip item 59");

    // 2. Reject entry exceeding MAX_BYTES (50KB)
    let huge_string = "A".repeat(MAX_BYTES + 100);
    let rejected = add_clipboard_entry(&huge_string);
    assert!(!rejected);
    assert_eq!(get_in_memory_history().len(), MAX_HISTORY);

    // 3. Reject empty or whitespace-only
    assert!(!add_clipboard_entry("   "));
    assert!(!add_clipboard_entry(""));

    // 4. Deduplication
    let item_to_dupe = "clip item 45";
    assert!(add_clipboard_entry(item_to_dupe));
    let history_after_dupe = get_in_memory_history();
    assert_eq!(history_after_dupe.len(), MAX_HISTORY);
    assert_eq!(history_after_dupe[0].text, item_to_dupe);

    // 5. Delete by ID
    let first_id = history_after_dupe[0].id.clone();
    clipboard_delete(first_id);
    let history_after_del = get_in_memory_history();
    assert_eq!(history_after_del.len(), MAX_HISTORY - 1);

    // 6. Clear
    clipboard_clear();
    assert_eq!(get_in_memory_history().len(), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Link Bypasser & Tracking Stripper Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_bypasser_strip_tracking_parameters_preserves_query_and_anchor() {
    let dirty_url = "https://example.com/product?id=42&utm_source=twitter&fbclid=abc123xyz&ref=partner&category=electronics#reviews";
    let (clean_url, removed_count, removed_list) = strip_tracking_parameters(dirty_url);

    assert_eq!(removed_count, 3);
    assert_eq!(removed_list.len(), 3);
    assert!(clean_url.contains("id=42"));
    assert!(clean_url.contains("category=electronics"));
    assert!(clean_url.contains("#reviews"));
    assert!(!clean_url.contains("utm_source"));
    assert!(!clean_url.contains("fbclid"));
    assert!(!clean_url.contains("ref="));

    let names: Vec<String> = removed_list.into_iter().map(|r| r.name).collect();
    assert!(names.contains(&"utm_source".to_string()));
    assert!(names.contains(&"fbclid".to_string()));
    assert!(names.contains(&"ref".to_string()));
}

#[test]
fn test_bypasser_hop_limit_constant() {
    assert_eq!(MAX_REDIRECT_HOPS, 15);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sentinel System Metrics Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_sentinel_metrics_collection_schema_invariants() {
    let metrics = get_system_metrics();

    assert!(metrics.success);
    assert!(metrics.cpu.cores > 0);
    assert!(metrics.cpu.overall_load >= 0.0 && metrics.cpu.overall_load <= 100.0);
    assert_eq!(metrics.cpu.load_per_core.len(), metrics.cpu.cores);
    assert!(metrics.memory.total > 0);
    assert!(metrics.memory.used <= metrics.memory.total);
    assert!(metrics.memory.percent_used <= 100);
    assert!(!metrics.os.platform.is_empty());
    assert!(!metrics.os.arch.is_empty());
}

#[test]
fn test_sentinel_optimize_memory_execution() {
    let free_mem = optimize_memory_working_set();
    assert!(free_mem > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. System Optimizer Tests
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_optimizer_scan_temp_invariants() {
    let scan_res = system_scan_temp().await.unwrap();
    assert!(!scan_res.path.is_empty());
    assert!(scan_res.size_formatted.ends_with("MB"));
}

#[test]
fn test_optimizer_format_bytes() {
    assert_eq!(format_bytes_to_mb(1024 * 1024), "1.00 MB");
    assert_eq!(format_bytes_to_mb(5 * 1024 * 1024), "5.00 MB");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Activity Journal Cryptographic Blockchain Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_canonical_json_stringification_determinism() {
    let obj1 = serde_json::json!({
        "z": 1,
        "a": 2,
        "m": { "y": true, "b": "text" }
    });
    let obj2 = serde_json::json!({
        "a": 2,
        "m": { "b": "text", "y": true },
        "z": 1
    });

    let s1 = canonical_stringify(&obj1);
    let s2 = canonical_stringify(&obj2);
    assert_eq!(s1, s2);
    assert_eq!(s1, "{\"a\":2,\"m\":{\"b\":\"text\",\"y\":true},\"z\":1}");
}

#[test]
fn test_journal_monotonic_blockchain_hash_chaining() {
    let mut entry1 = ActivityEntry {
        id: "entry-01".to_string(),
        sequence: 1,
        timestamp: 1700000000000,
        tool_id: "cyber_fortress".to_string(),
        action: "file_encrypted".to_string(),
        category: "crypto".to_string(),
        status: "success".to_string(),
        details: "Encrypted document.pdf".to_string(),
        metadata: None,
        duration_ms: None,
        prev_hash: GENESIS_PREV_HASH.to_string(),
        hash: String::new(),
    };
    entry1.hash = compute_entry_hash(&entry1);
    assert_eq!(entry1.hash.len(), 64);
    assert!(entry1.hash.chars().all(|c| c.is_ascii_hexdigit()));

    let mut entry2 = ActivityEntry {
        id: "entry-02".to_string(),
        sequence: 2,
        timestamp: 1700000001000,
        tool_id: "cyber_fortress".to_string(),
        action: "file_shredded".to_string(),
        category: "crypto".to_string(),
        status: "success".to_string(),
        details: "Shredded document.pdf".to_string(),
        metadata: None,
        duration_ms: None,
        prev_hash: entry1.hash.clone(),
        hash: String::new(),
    };
    entry2.hash = compute_entry_hash(&entry2);
    assert_eq!(entry2.prev_hash, entry1.hash);
    assert_ne!(entry2.hash, entry1.hash);

    let chain = vec![entry1, entry2];
    let res = verify_audit_chain(&chain);
    assert!(res.valid);
    assert_eq!(res.total_verified, 2);
}

#[test]
fn test_journal_chain_tamper_detection() {
    let mut chain = Vec::new();
    let mut last_hash = GENESIS_PREV_HASH.to_string();

    for i in 1..=5 {
        let mut entry = ActivityEntry {
            id: format!("id-{}", i),
            sequence: i,
            timestamp: 1700000000000 + (i as i64) * 1000,
            tool_id: "network_tools".to_string(),
            action: "port_scanned".to_string(),
            category: "network".to_string(),
            status: "success".to_string(),
            details: format!("Scanned port {}", 8000 + i),
            metadata: None,
            duration_ms: Some(15),
            prev_hash: last_hash.clone(),
            hash: String::new(),
        };
        entry.hash = compute_entry_hash(&entry);
        last_hash = entry.hash.clone();
        chain.push(entry);
    }

    // Verify pristine chain
    let res = verify_audit_chain(&chain);
    assert!(res.valid);
    assert_eq!(res.total_verified, 5);

    // Tamper block index 2
    chain[2].details = "MALICIOUS_TAMPERED_ACTION".to_string();

    let tampered_res = verify_audit_chain(&chain);
    assert!(!tampered_res.valid);
    assert_eq!(tampered_res.broken_index, Some(2));
    assert!(tampered_res
        .broken_reason
        .unwrap()
        .contains("Tampered content"));
}

#[test]
fn test_journal_rejects_invalid_genesis_hash() {
    let mut bad_genesis = ActivityEntry {
        id: "bad-genesis".to_string(),
        sequence: 1,
        timestamp: 1700000000000,
        tool_id: "tool".to_string(),
        action: "act".to_string(),
        category: "general".to_string(),
        status: "info".to_string(),
        details: "Wrong genesis hash".to_string(),
        metadata: None,
        duration_ms: None,
        prev_hash: "invalid-genesis-hash".to_string(),
        hash: String::new(),
    };
    bad_genesis.hash = compute_entry_hash(&bad_genesis);

    let res = verify_audit_chain(&[bad_genesis]);
    assert!(!res.valid);
    assert!(res.broken_reason.unwrap().to_lowercase().contains("genesis"));
}

#[test]
fn test_journal_rejects_non_monotonic_sequence_gap() {
    let mut entry1 = ActivityEntry {
        id: "id-1".to_string(),
        sequence: 1,
        timestamp: 1700000000000,
        tool_id: "t1".to_string(),
        action: "a1".to_string(),
        category: "c1".to_string(),
        status: "s1".to_string(),
        details: "d1".to_string(),
        metadata: None,
        duration_ms: None,
        prev_hash: GENESIS_PREV_HASH.to_string(),
        hash: String::new(),
    };
    entry1.hash = compute_entry_hash(&entry1);

    // Sequence gap: sequence jumps from 1 to 3
    let mut entry2 = ActivityEntry {
        id: "id-2".to_string(),
        sequence: 3,
        timestamp: 1700000001000,
        tool_id: "t2".to_string(),
        action: "a2".to_string(),
        category: "c2".to_string(),
        status: "s2".to_string(),
        details: "d2".to_string(),
        metadata: None,
        duration_ms: None,
        prev_hash: entry1.hash.clone(),
        hash: String::new(),
    };
    entry2.hash = compute_entry_hash(&entry2);

    let res = verify_audit_chain(&[entry1, entry2]);
    assert!(!res.valid);
    assert_eq!(res.broken_index, Some(1));
    assert!(res
        .broken_reason
        .unwrap()
        .to_lowercase()
        .contains("sequence gap"));
}
