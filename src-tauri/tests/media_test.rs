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

//! Comprehensive Unit and Integration Test Suite for ZenDev Media Engines:
//! - PDF Manipulation Engine (`lopdf`: inspection, merge, split, object renumbering)
//! - Image Processing Engine (`image`: metadata, Lanczos3 resize, EXIF strip, format encoding)

use std::fs;
use std::path::PathBuf;

use image::{DynamicImage, GenericImageView, ImageBuffer, Rgba};
use zendev_tauri_lib::image::{
    compute_fit_inside, execute_image_job, extract_dominant_palette, get_unique_path,
    inspect_image_metadata, read_jpeg_exif_orientation, strip_exif_bytes, ImageJob,
};
use zendev_tauri_lib::pdf::{
    extract_pages_subdocument, generate_test_pdf, inspect_pdf_bytes, inspect_single_pdf,
    merge_pdf_documents, parse_pdf_page_range, split_pdf_document,
};

fn create_temp_sandbox(test_name: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!("zendev_media_{}_{}", test_name, rand::random::<u32>()));
    fs::create_dir_all(&sandbox).expect("failed to create sandbox directory");
    let sandbox_clone = sandbox.clone();
    let cleanup = move || {
        let _ = fs::remove_dir_all(&sandbox_clone);
    };
    (sandbox, cleanup)
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF MANIPULATION ENGINE TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_pdf_synthetic_generation_and_inspection() {
    let (sandbox, cleanup) = create_temp_sandbox("pdf_inspect");
    let pdf_path = sandbox.join("report.pdf");

    let mut doc = generate_test_pdf("Financial Quarterly Report 2026", 3);
    doc.save(&pdf_path).expect("failed to save synthetic pdf");
    assert!(pdf_path.exists());

    let inspect_result = inspect_single_pdf(&pdf_path);
    assert!(inspect_result.success);
    assert_eq!(inspect_result.page_count, 3);
    assert_eq!(
        inspect_result.title.as_deref(),
        Some("Financial Quarterly Report 2026")
    );
    assert_eq!(
        inspect_result.author.as_deref(),
        Some("ZenDev Media Engine")
    );
    assert!(inspect_result.size > 0);
    assert!(!inspect_result.is_encrypted);
    assert_eq!(inspect_result.version.as_deref(), Some("1.5"));

    cleanup();
}

#[test]
fn test_pdf_corrupted_bytes_and_missing_file_graceful_rejection() {
    // 1. Inspect invalid bytes
    let corrupt_bytes = b"NOT-A-REAL-PDF-FILE-HEADER-CORRUPTED";
    let inspect_err = inspect_pdf_bytes(corrupt_bytes, None);
    assert!(inspect_err.is_err());
    let err_msg = inspect_err.unwrap_err();
    assert!(err_msg.contains("missing %PDF header signature"));

    // 2. Non-existent file inspection
    let missing_path = PathBuf::from("non_existent_zendev_doc_12345.pdf");
    let missing_res = inspect_single_pdf(&missing_path);
    assert!(!missing_res.success);
    assert_eq!(missing_res.page_count, 0);
    assert!(missing_res.error.is_some());
}

#[test]
fn test_pdf_merge_renumbering_and_collision_avoidance() {
    let (sandbox, cleanup) = create_temp_sandbox("pdf_merge");

    let doc_a_path = sandbox.join("doc_a.pdf");
    let doc_b_path = sandbox.join("doc_b.pdf");

    let mut doc_a = generate_test_pdf("Document A", 2);
    let mut doc_b = generate_test_pdf("Document B", 3);
    doc_a.save(&doc_a_path).unwrap();
    doc_b.save(&doc_b_path).unwrap();

    let target_out = sandbox.join("merged_output.pdf");
    let input_paths = vec![
        doc_a_path.to_string_lossy().to_string(),
        doc_b_path.to_string_lossy().to_string(),
    ];

    // 1. First merge
    let merge_res = merge_pdf_documents(&input_paths, &target_out).expect("merge failed");
    assert!(merge_res.success);
    assert_eq!(merge_res.page_count, 5);
    assert_eq!(merge_res.total_count, 5);
    assert_eq!(merge_res.output_path, target_out.to_string_lossy().to_string());
    assert!(target_out.exists());

    // Verify inspect of merged document
    let inspected = inspect_single_pdf(&target_out);
    assert!(inspected.success);
    assert_eq!(inspected.page_count, 5);

    // 2. Second merge with identical target path tests collision avoidance
    let merge_res_collision = merge_pdf_documents(&input_paths, &target_out).expect("collision merge failed");
    assert!(merge_res_collision.success);
    let expected_collision_path = sandbox.join("merged_output (1).pdf");
    assert_eq!(
        merge_res_collision.output_path,
        expected_collision_path.to_string_lossy().to_string()
    );
    assert!(expected_collision_path.exists());

    let inspected_collision = inspect_single_pdf(&expected_collision_path);
    assert_eq!(inspected_collision.page_count, 5);

    cleanup();
}

#[test]
fn test_pdf_split_page_range_parsing() {
    // T1.6 & T2.6: Non-sequential, inverted, deduplicated
    assert_eq!(parse_pdf_page_range("1-3, 5, 8-10", 10), vec![0, 1, 2, 4, 7, 8, 9]);
    assert_eq!(parse_pdf_page_range("4-2", 5), vec![1, 2, 3]); // inverted auto-swaps
    assert_eq!(parse_pdf_page_range("3, 2, 1", 5), vec![0, 1, 2]); // auto-sorts
    assert_eq!(parse_pdf_page_range("1, 1, 1-2, 2, 1-3, 3", 5), vec![0, 1, 2]); // deduplicated

    // T2.1: Blank, invalid, or negative ranges
    assert_eq!(parse_pdf_page_range("", 10), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("   ", 10), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("invalid-range", 10), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("0, 999", 5), Vec::<usize>::new());
    assert_eq!(parse_pdf_page_range("-5 - -2", 5), Vec::<usize>::new());

    // T2.3: Clamping to total page count
    assert_eq!(parse_pdf_page_range("1-10", 3), vec![0, 1, 2]);
}

#[test]
fn test_pdf_split_subdocument_generation() {
    let (sandbox, cleanup) = create_temp_sandbox("pdf_split");
    let src_pdf_path = sandbox.join("multi_page.pdf");
    let mut doc = generate_test_pdf("Master Document", 6);
    doc.save(&src_pdf_path).unwrap();

    // Direct sub-document extraction: pages 2 and 4 (1-based: 2, 4)
    let sub_doc = extract_pages_subdocument(&doc, &[2, 4]).expect("failed to extract subdocument");
    assert_eq!(sub_doc.get_pages().len(), 2);

    // Full split execution via `split_pdf_document` with ranges "1-2, 4"
    let out_dir = sandbox.join("split_parts");
    let split_res = split_pdf_document(
        &src_pdf_path.to_string_lossy(),
        "1-2, 4",
        Some(&out_dir.to_string_lossy()),
    )
    .expect("split_pdf_document failed");

    assert!(split_res.success);
    assert_eq!(split_res.generated_files.len(), 2);

    // Verify first generated file has 2 pages
    let file1 = PathBuf::from(&split_res.generated_files[0]);
    assert!(file1.exists());
    let inspect1 = inspect_single_pdf(&file1);
    assert_eq!(inspect1.page_count, 2);

    // Verify second generated file has 1 page
    let file2 = PathBuf::from(&split_res.generated_files[1]);
    assert!(file2.exists());
    let inspect2 = inspect_single_pdf(&file2);
    assert_eq!(inspect2.page_count, 1);

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE PROCESSING ENGINE TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_image_compute_fit_inside_aspect_ratio() {
    // T1.4: 1920x1080 downscaled to max 800x800 -> 800x450
    let (w1, h1) = compute_fit_inside(1920, 1080, Some(800), Some(800), true);
    assert_eq!((w1, h1), (800, 450));

    // Tall aspect: 1080x1920 downscaled to max 800x800 -> 450x800
    let (w2, h2) = compute_fit_inside(1080, 1920, Some(800), Some(800), true);
    assert_eq!((w2, h2), (450, 800));

    // Without enlargement: 400x300 target 1000x1000 -> remains 400x300
    let (w3, h3) = compute_fit_inside(400, 300, Some(1000), Some(1000), true);
    assert_eq!((w3, h3), (400, 300));

    // With enlargement: 400x300 target 1000x1000 -> scales up to 1000x750
    let (w4, h4) = compute_fit_inside(400, 300, Some(1000), Some(1000), false);
    assert_eq!((w4, h4), (1000, 750));

    // Single constraint width: 1920x1080 target_w 960 -> 960x540
    let (w5, h5) = compute_fit_inside(1920, 1080, Some(960), None, true);
    assert_eq!((w5, h5), (960, 540));
}

#[test]
fn test_image_metadata_and_dominant_color_extraction() {
    let (sandbox, cleanup) = create_temp_sandbox("img_meta");
    let img_path = sandbox.join("palette_test.png");

    // Create synthetic 64x64 image: top half cyan (#00ffff), bottom half red (#ff0000)
    let mut img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(64, 64);
    for (_x, y, pixel) in img_buf.enumerate_pixels_mut() {
        if y < 32 {
            *pixel = Rgba([0, 255, 255, 255]); // Cyan
        } else {
            *pixel = Rgba([255, 0, 0, 255]); // Red
        }
    }
    img_buf.save(&img_path).expect("failed to save test image");

    // Metadata inspection
    let meta = inspect_image_metadata(&img_path);
    assert_eq!(meta.width, Some(64));
    assert_eq!(meta.height, Some(64));
    assert_eq!(meta.format.as_deref(), Some("png"));
    assert!(meta.size > 0);
    assert!(meta.dominant_color.is_some());
    assert!(meta.palette.is_some());

    let dyn_img = DynamicImage::ImageRgba8(img_buf);
    let (dom, palette) = extract_dominant_palette(&dyn_img, 4);
    assert!(dom.is_some());
    assert!(!palette.is_empty());

    cleanup();
}

#[test]
fn test_image_transcoding_formats_jpeg_png_webp() {
    let (sandbox, cleanup) = create_temp_sandbox("img_transcode");
    let src_path = sandbox.join("source.png");

    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_pixel(100, 100, Rgba([128, 64, 32, 255]));
    img_buf.save(&src_path).unwrap();

    let out_dir = sandbox.join("transcoded");

    // 1. JPEG conversion
    let job_jpeg = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: out_dir.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: Some(50),
        height: Some(50),
        quality: 80,
        strip_exif: true,
        suffix: "_converted".to_string(),
    };
    let res_jpeg = execute_image_job(&job_jpeg);
    assert!(res_jpeg.success);
    let jpeg_path = PathBuf::from(&res_jpeg.output_path);
    assert!(jpeg_path.exists());
    let jpeg_bytes = fs::read(&jpeg_path).unwrap();
    assert_eq!(&jpeg_bytes[0..2], &[0xFF, 0xD8]); // JPEG SOI

    // 2. PNG conversion
    let job_png = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: out_dir.to_string_lossy().to_string(),
        format: "png".to_string(),
        width: Some(80),
        height: Some(80),
        quality: 90,
        strip_exif: true,
        suffix: "_png".to_string(),
    };
    let res_png = execute_image_job(&job_png);
    assert!(res_png.success);
    let png_path = PathBuf::from(&res_png.output_path);
    assert!(png_path.exists());
    let png_bytes = fs::read(&png_path).unwrap();
    assert_eq!(&png_bytes[0..8], &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG Signature

    // 3. WebP conversion
    let job_webp = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: out_dir.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: Some(60),
        height: Some(60),
        quality: 85,
        strip_exif: true,
        suffix: "_webp".to_string(),
    };
    let res_webp = execute_image_job(&job_webp);
    assert!(res_webp.success);
    let webp_path = PathBuf::from(&res_webp.output_path);
    assert!(webp_path.exists());
    let webp_bytes = fs::read(&webp_path).unwrap();
    assert_eq!(&webp_bytes[0..4], b"RIFF");
    assert_eq!(&webp_bytes[8..12], b"WEBP");

    cleanup();
}

#[test]
fn test_image_exif_detection_and_stripping() {
    // T2.5: Detect and strip EXIF APP1 metadata marker from JPEG buffer
    let jpeg_with_exif = vec![
        0xFF, 0xD8,             // SOI
        0xFF, 0xE1, 0x00, 0x0E, // APP1 marker + length 14
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, // TIFF header (little endian)
        0xFF, 0xDA,             // Start of scan
        0x00, 0x00,
    ];

    let stripped = strip_exif_bytes(&jpeg_with_exif);
    assert_eq!(stripped[0], 0xFF);
    assert_eq!(stripped[1], 0xD8);
    // Verified: EXIF string is removed
    assert!(!stripped.windows(4).any(|w| w == b"Exif"));

    // Check orientation reader
    let orient = read_jpeg_exif_orientation(&jpeg_with_exif);
    // Synthetic snippet has truncated IFD so returns None safely without panic
    assert!(orient.is_none());
}

#[test]
fn test_image_collision_avoidance_naming() {
    let (sandbox, cleanup) = create_temp_sandbox("img_collision");
    let src_path = sandbox.join("asset.png");

    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_pixel(10, 10, Rgba([0, 0, 0, 255]));
    img_buf.save(&src_path).unwrap();

    let job = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: false,
        suffix: "_out".to_string(),
    };

    let res1 = execute_image_job(&job);
    assert!(res1.success);
    let path1 = PathBuf::from(&res1.output_path);
    assert!(path1.exists());
    assert_eq!(path1.file_name().unwrap().to_str().unwrap(), "asset_out.webp");

    let res2 = execute_image_job(&job);
    assert!(res2.success);
    let path2 = PathBuf::from(&res2.output_path);
    assert!(path2.exists());
    assert_eq!(path2.file_name().unwrap().to_str().unwrap(), "asset_out (1).webp");

    cleanup();
}

#[test]
fn test_image_resizing_lanczos3_execution() {
    let (sandbox, cleanup) = create_temp_sandbox("img_resize_lanczos");
    let src_path = sandbox.join("hd_banner.png");

    // 1000x500 banner
    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_pixel(1000, 500, Rgba([10, 20, 30, 255]));
    img_buf.save(&src_path).unwrap();

    let job = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "png".to_string(),
        width: Some(500),
        height: Some(500),
        quality: 95,
        strip_exif: true,
        suffix: "_lanczos".to_string(),
    };

    let res = execute_image_job(&job);
    assert!(res.success);

    let output_img = image::open(&res.output_path).expect("failed to open resized image");
    // With fit: inside, 1000x500 scaled inside 500x500 gives exactly 500x250
    assert_eq!(output_img.dimensions(), (500, 250));

    cleanup();
}

#[test]
fn test_unique_path_collision_chain() {
    let (sandbox, cleanup) = create_temp_sandbox("collision_chain");
    let base_file = sandbox.join("document.pdf");
    fs::write(&base_file, b"test").unwrap();

    let p1 = get_unique_path(&base_file);
    assert_eq!(p1.file_name().unwrap().to_str().unwrap(), "document (1).pdf");
    fs::write(&p1, b"test1").unwrap();

    let p2 = get_unique_path(&base_file);
    assert_eq!(p2.file_name().unwrap().to_str().unwrap(), "document (2).pdf");
    fs::write(&p2, b"test2").unwrap();

    let p3 = get_unique_path(&base_file);
    assert_eq!(p3.file_name().unwrap().to_str().unwrap(), "document (3).pdf");

    cleanup();
}

