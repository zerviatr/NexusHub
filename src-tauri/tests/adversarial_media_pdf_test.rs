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

//! Adversarial Verification Suite for Milestone M5:
//! PDF Manipulation Engine Robustness, Malformed Inputs & Boundary Guardrails.
//!
//! Empirically challenges:
//! 1. Corrupted, truncated, and malformed byte inputs (inspect, merge, split).
//! 2. Page range parsing stress (negative numbers, inverted ranges, non-numeric strings, out-of-bounds, duplicates).
//! 3. Multi-document merge object ID collision avoidance, renumbering, and catalog integrity.
//! 4. Subdocument page extraction isolation and orphan object pruning.
//! 5. Complex split ranges, file collision avoidance naming, and multi-file roundtrip pipelines.

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use lopdf::{Document, Object};
use zendev_tauri_lib::pdf::{
    extract_pages_subdocument, generate_test_pdf, get_unique_path, inspect_pdf_bytes,
    inspect_single_pdf, merge_pdf_documents, parse_pdf_page_range, split_pdf_document,
};

fn create_temp_sandbox(test_name: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!(
        "zendev_adv_pdf_{}_{}",
        test_name,
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
// 1. CORRUPTED & MALFORMED BYTE STRESS (FAIL-SAFE ERROR HANDLING)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_inspect_corrupted_and_truncated_bytes() {
    // A. Empty byte slice
    let empty_res = inspect_pdf_bytes(&[], None);
    assert!(empty_res.is_err(), "Empty bytes must fail validation");
    assert!(
        empty_res.unwrap_err().contains("missing %PDF header signature"),
        "Must identify missing header signature"
    );

    // B. Sub-header short slices (< 5 bytes)
    for len in 1..=4 {
        let short_bytes = &b"%PDF"[..len];
        let short_res = inspect_pdf_bytes(short_bytes, None);
        assert!(short_res.is_err(), "Short byte slice (len {}) must fail", len);
    }

    // C. Non-PDF magic signatures (PNG, HTML, ZIP, JPEG, ELF)
    let bad_signatures: &[&[u8]] = &[
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
        b"<!DOCTYPE html><html><body>Malformed</body></html>",
        b"PK\x03\x04\x14\x00\x00\x00\x08\x00",
        b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01",
        b"\x7FELF\x02\x01\x01\x00\x00\x00\x00\x00",
    ];
    for &bad in bad_signatures {
        let res = inspect_pdf_bytes(bad, None);
        assert!(res.is_err(), "Non-PDF magic signature must be rejected");
        assert!(res.unwrap_err().contains("missing %PDF header signature"));
    }

    // D. Valid %PDF header but completely corrupted body
    let mut corrupt_body = b"%PDF-1.7\r\n".to_vec();
    corrupt_body.extend(vec![0xAA, 0xBB, 0xCC, 0xDD, 0x00, 0xFF, 0x12, 0x34].repeat(64));
    let corrupt_res = inspect_pdf_bytes(&corrupt_body, None);
    assert!(
        corrupt_res.is_err(),
        "Valid header with random payload must fail without panicking"
    );

    // E. Missing EOF marker
    let truncated_pdf = b"%PDF-1.5\r\n1 0 obj\r\n<< /Type /Catalog >>\r\nendobj\r\n";
    let trunc_res = inspect_pdf_bytes(truncated_pdf, None);
    assert!(
        trunc_res.is_err(),
        "PDF without trailer or EOF marker must fail parsing"
    );
}

#[test]
fn test_adversarial_pdf_filesystem_missing_and_corrupt_files() {
    let (sandbox, cleanup) = create_temp_sandbox("fs_corrupt");

    // A. Inspect non-existent file
    let missing_path = sandbox.join("does_not_exist_999.pdf");
    let missing_inspect = inspect_single_pdf(&missing_path);
    assert!(
        !missing_inspect.success,
        "Non-existent file inspection must report success=false"
    );
    assert!(
        missing_inspect.error.is_some(),
        "Must provide error message for missing file"
    );

    // B. Inspect corrupted file on disk
    let corrupt_file = sandbox.join("corrupted.pdf");
    fs::write(&corrupt_file, b"%PDF-1.5 GARBAGE_DATA_WITHOUT_OBJECTS").unwrap();
    let corrupt_inspect = inspect_single_pdf(&corrupt_file);
    assert!(
        !corrupt_inspect.success,
        "Corrupted file on disk must report success=false"
    );
    assert!(corrupt_inspect.error.is_some());

    // C. Merge with non-existent file in list
    let valid_pdf = sandbox.join("valid.pdf");
    let mut doc = generate_test_pdf("Valid Doc", 2);
    doc.save(&valid_pdf).unwrap();

    let merge_missing = merge_pdf_documents(
        &[
            valid_pdf.to_string_lossy().to_string(),
            missing_path.to_string_lossy().to_string(),
        ],
        &sandbox.join("out.pdf"),
    );
    assert!(
        merge_missing.is_err(),
        "Merge with missing file in list must return Err"
    );
    assert!(merge_missing.unwrap_err().contains("Dosya bulunamadı"));

    // D. Merge with corrupt file in list
    let merge_corrupt = merge_pdf_documents(
        &[
            valid_pdf.to_string_lossy().to_string(),
            corrupt_file.to_string_lossy().to_string(),
        ],
        &sandbox.join("out.pdf"),
    );
    assert!(
        merge_corrupt.is_err(),
        "Merge with corrupted file in list must return Err"
    );
    assert!(merge_corrupt.unwrap_err().contains("PDF yüklenemedi"));

    // E. Merge with insufficient files (< 2)
    assert!(
        merge_pdf_documents(&[], &sandbox.join("out.pdf")).is_err(),
        "Empty file list must fail"
    );
    assert!(
        merge_pdf_documents(
            &[valid_pdf.to_string_lossy().to_string()],
            &sandbox.join("out.pdf")
        )
        .is_err(),
        "Single file list must fail merge requirements"
    );

    // F. Split non-existent file
    let split_missing = split_pdf_document(&missing_path.to_string_lossy(), "1", None);
    assert!(split_missing.is_err());
    assert!(split_missing.unwrap_err().contains("Dosya bulunamadı"));

    // G. Split corrupt file
    let split_corrupt = split_pdf_document(&corrupt_file.to_string_lossy(), "1", None);
    assert!(split_corrupt.is_err());
    assert!(split_corrupt.unwrap_err().contains("PDF dosyası okunamadı"));

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAGE RANGE PARSER BOUNDARY STRESS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_page_range_stress() {
    let total = 10;

    // A. Whitespace, empty, commas, control characters
    assert_eq!(parse_pdf_page_range("", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("   ", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("\t\r\n", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range(",", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range(",,, , ,,", total), Vec::<usize>::new());

    // B. Non-numeric and malformed strings
    assert_eq!(parse_pdf_page_range("abc", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("foo-bar", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("1-xyz", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("xyz-5", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("!@#$%^&*()", total), Vec::<usize>::new());

    // C. Negative numbers and negative ranges
    assert_eq!(parse_pdf_page_range("-1", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("-5", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("-10 - -5", total), Vec::<usize>::new());

    // D. Zero page boundaries (pages are 1-based)
    assert_eq!(parse_pdf_page_range("0", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("0-0", total), Vec::<usize>::new());
    // "0-3" contains 1, 2, 3 -> indices 0, 1, 2
    assert_eq!(parse_pdf_page_range("0-3", total), vec![0, 1, 2]);

    // E. Inverted ranges (auto-swap order)
    assert_eq!(parse_pdf_page_range("5-2", total), vec![1, 2, 3, 4]);
    assert_eq!(parse_pdf_page_range("10-8", total), vec![7, 8, 9]);
    assert_eq!(parse_pdf_page_range("7-7", total), vec![6]);

    // F. Out of bounds and clamping
    assert_eq!(parse_pdf_page_range("11", total), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("99-150", total), Vec::<usize>::new());
    // "8-15" clamps to pages 8, 9, 10
    assert_eq!(parse_pdf_page_range("8-15", total), vec![7, 8, 9]);
    // "1-999" clamps to 1..=total
    assert_eq!(
        parse_pdf_page_range("1-999", total),
        (0..total).collect::<Vec<usize>>()
    );

    // G. Deduplication and ascending order guarantee
    assert_eq!(
        parse_pdf_page_range("3, 1, 2, 2, 1, 3, 1-3, 2-2", total),
        vec![0, 1, 2]
    );

    // H. Mixed valid and invalid segments
    assert_eq!(
        parse_pdf_page_range("abc, 2, invalid-5, 4, -99, 1, 999", total),
        vec![0, 1, 3]
    );

    // I. Total pages = 0 edge case
    assert_eq!(parse_pdf_page_range("1-5", 0), Vec::<usize>::new());
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MULTI-DOCUMENT MERGE OBJECT ID COLLISION & INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_multi_document_merge_object_id_collision_defense() {
    let (sandbox, cleanup) = create_temp_sandbox("merge_collision");

    // Create 3 documents that start with identical synthetic object IDs
    let doc1_path = sandbox.join("doc1.pdf");
    let doc2_path = sandbox.join("doc2.pdf");
    let doc3_path = sandbox.join("doc3.pdf");

    let mut doc1 = generate_test_pdf("Document One", 3);
    let mut doc2 = generate_test_pdf("Document Two", 2);
    let mut doc3 = generate_test_pdf("Document Three", 4);

    doc1.save(&doc1_path).unwrap();
    doc2.save(&doc2_path).unwrap();
    doc3.save(&doc3_path).unwrap();

    let merged_path = sandbox.join("nested").join("sub").join("merged_all.pdf");
    let input_paths = vec![
        doc1_path.to_string_lossy().to_string(),
        doc2_path.to_string_lossy().to_string(),
        doc3_path.to_string_lossy().to_string(),
    ];

    let merge_res = merge_pdf_documents(&input_paths, &merged_path).expect("Merge failed");
    assert!(merge_res.success);
    assert_eq!(merge_res.page_count, 9); // 3 + 2 + 4 = 9 pages
    assert!(merged_path.exists());

    // Verify the merged document can be reloaded and parsed cleanly by lopdf
    let reloaded_doc = Document::load(&merged_path).expect("Merged PDF failed to reload");
    let pages = reloaded_doc.get_pages();
    assert_eq!(
        pages.len(),
        9,
        "Reloaded document must have exactly 9 distinct pages"
    );

    // Verify all Page objects are unique object IDs
    let mut seen_page_ids = HashSet::new();
    for (&page_num, &page_id) in pages.iter() {
        assert!(
            seen_page_ids.insert(page_id),
            "Duplicate page ObjectId found: {:?}",
            page_id
        );
        let page_obj = reloaded_doc
            .get_object(page_id)
            .expect("Page object not found");
        let dict = page_obj.as_dict().expect("Page object must be a dictionary");
        assert_eq!(
            dict.get(b"Type").ok().and_then(|o| o.as_name_str().ok()),
            Some("Page"),
            "Page {} must have Type = Page",
            page_num
        );
    }

    // Verify Catalog Root points to valid Pages dictionary
    let catalog = reloaded_doc.catalog().expect("Missing catalog in merged PDF");
    let pages_ref = catalog.get(b"Pages").expect("Catalog missing /Pages");
    let pages_id = match pages_ref {
        Object::Reference(id) => *id,
        _ => panic!("Catalog /Pages must be an Object::Reference"),
    };
    let pages_dict = reloaded_doc
        .get_object(pages_id)
        .expect("Pages object not found")
        .as_dict()
        .expect("Pages object must be dictionary");
    assert_eq!(
        pages_dict.get(b"Type").ok().and_then(|o| o.as_name_str().ok()),
        Some("Pages")
    );
    assert_eq!(
        pages_dict.get(b"Count").ok().and_then(|o| o.as_i64().ok()),
        Some(9)
    );

    // Verify inspect_single_pdf matches
    let inspect = inspect_single_pdf(&merged_path);
    assert!(inspect.success);
    assert_eq!(inspect.page_count, 9);
    assert!(inspect.size > 0);

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUBDOCUMENT EXTRACTION & SPLIT BOUNDARIES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_subdocument_extraction_isolation() {
    let doc = generate_test_pdf("Master Subdoc", 8);

    // A. Extract non-contiguous pages: 2, 5, 7
    let subdoc = extract_pages_subdocument(&doc, &[2, 5, 7]).expect("Subdocument extraction failed");
    let subdoc_pages = subdoc.get_pages();
    assert_eq!(subdoc_pages.len(), 3);

    // Verify Pages dictionary has count = 3
    let pages_dict = subdoc
        .catalog()
        .unwrap()
        .get(b"Pages")
        .and_then(|r| subdoc.get_object(r.as_reference().unwrap()))
        .and_then(|o| o.as_dict())
        .unwrap();
    assert_eq!(pages_dict.get(b"Count").unwrap().as_i64().unwrap(), 3);

    // B. Extract non-existent page numbers -> must return error
    let invalid_extract = extract_pages_subdocument(&doc, &[99, 100]);
    assert!(invalid_extract.is_err());
    assert!(invalid_extract
        .unwrap_err()
        .contains("No valid pages selected for extraction"));
}

#[test]
fn test_adversarial_pdf_split_execution_boundaries() {
    let (sandbox, cleanup) = create_temp_sandbox("split_boundaries");
    let src_path = sandbox.join("source_5pages.pdf");

    let mut doc = generate_test_pdf("Split Master", 5);
    doc.save(&src_path).unwrap();

    let out_dir = sandbox.join("split_outputs");

    // A. Split with all out-of-bounds ranges -> must fail gracefully with Err
    let oob_res = split_pdf_document(
        &src_path.to_string_lossy(),
        "99-100, 200",
        Some(&out_dir.to_string_lossy()),
    );
    assert!(
        oob_res.is_err(),
        "Split with completely out-of-bounds ranges must return Err"
    );
    assert!(oob_res.unwrap_err().contains("Geçerli bir sayfa aralığı girin"));

    // B. Split with empty range string -> must fail gracefully
    let empty_res = split_pdf_document(
        &src_path.to_string_lossy(),
        "",
        Some(&out_dir.to_string_lossy()),
    );
    assert!(empty_res.is_err());

    // C. Split with mixed valid/invalid ranges: "1-2, invalid, 4, 99"
    // "1-2" -> 2 pages
    // "invalid" -> 0 pages (skipped)
    // "4" -> 1 page
    // "99" -> 0 pages (skipped)
    let mixed_res = split_pdf_document(
        &src_path.to_string_lossy(),
        "1-2, invalid, 4, 99",
        Some(&out_dir.to_string_lossy()),
    )
    .expect("Mixed split failed");
    assert!(mixed_res.success);
    assert_eq!(mixed_res.generated_files.len(), 2);
    assert_eq!(mixed_res.page_count, Some(3)); // 2 + 1 = 3 pages total

    // Verify first generated file
    let file1 = &mixed_res.generated_files[0];
    let inspect1 = inspect_single_pdf(&PathBuf::from(file1));
    assert_eq!(inspect1.page_count, 2);

    // Verify second generated file
    let file2 = &mixed_res.generated_files[1];
    let inspect2 = inspect_single_pdf(&PathBuf::from(file2));
    assert_eq!(inspect2.page_count, 1);

    // D. Split with inverted range: "5-3" -> pages 3, 4, 5 (3 pages)
    let inverted_res = split_pdf_document(
        &src_path.to_string_lossy(),
        "5-3",
        Some(&out_dir.to_string_lossy()),
    )
    .expect("Inverted split failed");
    assert!(inverted_res.success);
    assert_eq!(inverted_res.generated_files.len(), 1);
    let inv_file = &inverted_res.generated_files[0];
    let inspect_inv = inspect_single_pdf(&PathBuf::from(inv_file));
    assert_eq!(inspect_inv.page_count, 3);

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LARGE SCALE MERGE & SPLIT STRESS (PIPELINE ROUNDTRIP)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_large_scale_pipeline_roundtrip() {
    let (sandbox, cleanup) = create_temp_sandbox("pipeline_roundtrip");

    // 1. Create two multi-page documents: 12 pages and 18 pages (total 30 pages)
    let doc_a_path = sandbox.join("doc_12p.pdf");
    let doc_b_path = sandbox.join("doc_18p.pdf");

    let mut doc_a = generate_test_pdf("Batch A 12 Pages", 12);
    let mut doc_b = generate_test_pdf("Batch B 18 Pages", 18);
    doc_a.save(&doc_a_path).unwrap();
    doc_b.save(&doc_b_path).unwrap();

    // 2. Merge A + B -> 30 pages
    let merged_path = sandbox.join("merged_30p.pdf");
    let merge_res = merge_pdf_documents(
        &[
            doc_a_path.to_string_lossy().to_string(),
            doc_b_path.to_string_lossy().to_string(),
        ],
        &merged_path,
    )
    .expect("Failed to merge 30 page document");
    assert_eq!(merge_res.page_count, 30);

    // 3. Split the 30-page merged document into 4 segments:
    // "1-5" (5 pages), "10-15" (6 pages), "20-25" (6 pages), "30" (1 page) -> total 18 pages
    let split_dir = sandbox.join("split_segments");
    let split_res = split_pdf_document(
        &merged_path.to_string_lossy(),
        "1-5, 10-15, 20-25, 30",
        Some(&split_dir.to_string_lossy()),
    )
    .expect("Split of 30-page document failed");

    assert_eq!(split_res.generated_files.len(), 4);
    assert_eq!(split_res.page_count, Some(18));

    // Verify individual split page counts
    let expected_counts = [5, 6, 6, 1];
    for (file, &expected) in split_res.generated_files.iter().zip(expected_counts.iter()) {
        let insp = inspect_single_pdf(&PathBuf::from(file));
        assert!(insp.success);
        assert_eq!(insp.page_count, expected);
    }

    // 4. Re-merge the 4 split segments together into a unified 18-page document
    let final_merged = sandbox.join("final_remerged_18p.pdf");
    let remerge_res = merge_pdf_documents(&split_res.generated_files, &final_merged)
        .expect("Re-merge of split segments failed");
    assert_eq!(remerge_res.page_count, 18);

    let final_inspect = inspect_single_pdf(&final_merged);
    assert!(final_inspect.success);
    assert_eq!(final_inspect.page_count, 18);

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. COLLISION-AVOIDANCE PATH GENERATION RESILIENCE
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pdf_unique_path_collision_avoidance() {
    let (sandbox, cleanup) = create_temp_sandbox("unique_path");

    let base_file = sandbox.join("document.pdf");
    fs::write(&base_file, b"content").unwrap();

    // 1st collision -> document (1).pdf
    let path1 = get_unique_path(&base_file);
    assert_eq!(path1, sandbox.join("document (1).pdf"));
    fs::write(&path1, b"content 1").unwrap();

    // 2nd collision -> document (2).pdf
    let path2 = get_unique_path(&base_file);
    assert_eq!(path2, sandbox.join("document (2).pdf"));
    fs::write(&path2, b"content 2").unwrap();

    // 3rd collision -> document (3).pdf
    let path3 = get_unique_path(&base_file);
    assert_eq!(path3, sandbox.join("document (3).pdf"));

    cleanup();
}
