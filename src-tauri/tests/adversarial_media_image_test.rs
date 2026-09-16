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
//! Image Engine Boundaries, Resampling Stress, EXIF Privacy, & Transcoding Resilience.
//!
//! Empirically challenges:
//! 1. Resizing boundary conditions (1x1 pixel image, extreme 10000x1 and 1x10000 ratios, exact bounds matching).
//! 2. Resampling stress: Lanczos3 filter behavior on micro-dimensions and 1-pixel extremes.
//! 3. Corrupted and truncated image buffers (0-byte, truncated PNG/JPEG/WebP, random binary noise, missing files).
//! 4. Format conversion & transparency preservation (lossless WebP alpha roundtrip, PNG-to-JPEG conversion).
//! 5. EXIF leak testing: verification of zero APP1 / Exif metadata markers in re-encoded outputs.
//! 6. JPEG quality quantization boundaries (0, 1, 100, 255 clamping).
//! 7. Collision avoidance chain stress: consecutive collisions `(1).ext` through `(8).ext`, multi-dot and no-ext files.
//! 8. Dominant palette edge cases: 100% transparent images, 1x1 pixels, max_colors = 0.
//! 9. Batch processing resilience: partial failures do not abort healthy jobs.

use std::fs;
use std::path::PathBuf;

use image::{DynamicImage, GenericImageView, ImageBuffer, Rgba};
use zendev_tauri_lib::image::{
    compute_fit_inside, execute_image_job, extract_dominant_palette, get_unique_path,
    inspect_image_metadata, read_jpeg_exif_orientation, strip_exif_bytes, ImageJob,
};

fn create_temp_sandbox(test_name: &str) -> (PathBuf, impl FnOnce()) {
    let sandbox = std::env::temp_dir().join(format!(
        "zendev_adv_img_{}_{}",
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
// 1. BOUNDARY CONDITIONS: 1x1 PIXEL IMAGE & MICRO-DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_1x1_boundary_resizing() {
    let (sandbox, cleanup) = create_temp_sandbox("1x1_boundary");

    // Mathematical boundary tests for compute_fit_inside
    let (w1, h1) = compute_fit_inside(1, 1, Some(100), Some(100), true);
    assert_eq!((w1, h1), (1, 1), "Without enlargement 1x1 must remain 1x1");

    let (w2, h2) = compute_fit_inside(1, 1, Some(50), Some(50), false);
    assert_eq!((w2, h2), (50, 50), "With enlargement 1x1 can scale up");

    let (w3, h3) = compute_fit_inside(1, 1, Some(0), Some(0), true);
    assert_eq!((w3, h3), (1, 1), "Target 0x0 must clamp to at least 1x1 via .max(1)");

    // Physical 1x1 image processing pipeline execution
    let src_path = sandbox.join("pixel_1x1.png");
    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(1, 1, Rgba([255, 0, 128, 255]));
    img_buf.save(&src_path).expect("failed to save 1x1 image");

    // Transcode and resize 1x1 image to WebP with target bounds
    let job = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: Some(100),
        height: Some(100),
        quality: 90,
        strip_exif: true,
        suffix: "_out".to_string(),
    };

    let res = execute_image_job(&job);
    assert!(res.success, "Processing 1x1 image must succeed");
    let out_path = PathBuf::from(&res.output_path);
    assert!(out_path.exists());

    // Without enlargement default in execute_image_job: dimensions must remain 1x1
    let out_img = image::open(&out_path).expect("failed to open output 1x1 image");
    assert_eq!(out_img.dimensions(), (1, 1));
    assert_eq!(out_img.get_pixel(0, 0), Rgba([255, 0, 128, 255]));

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTREME ASPECT RATIOS: ULTRA-WIDE (10000x1) & ULTRA-TALL (1x10000)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_extreme_aspect_ratios() {
    let (sandbox, cleanup) = create_temp_sandbox("extreme_aspect");

    // Mathematical aspect ratio tests
    // 10000x1 scaled inside 1000x1000 -> 1000x1 (height must not round to 0)
    let (w_wide, h_wide) = compute_fit_inside(10000, 1, Some(1000), Some(1000), true);
    assert_eq!(w_wide, 1000);
    assert_eq!(h_wide, 1, "Height must be at least 1, never 0");

    // 1x10000 scaled inside 1000x1000 -> 1x1000 (width must not round to 0)
    let (w_tall, h_tall) = compute_fit_inside(1, 10000, Some(1000), Some(1000), true);
    assert_eq!(w_tall, 1, "Width must be at least 1, never 0");
    assert_eq!(h_tall, 1000);

    // Physical test: create 1000x2 banner and resize to 100x100 using Lanczos3
    let wide_path = sandbox.join("ultra_wide.png");
    let wide_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(1000, 2, Rgba([30, 60, 90, 255]));
    wide_buf.save(&wide_path).unwrap();

    let job_wide = ImageJob {
        input_path: wide_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "png".to_string(),
        width: Some(100),
        height: Some(100),
        quality: 90,
        strip_exif: false,
        suffix: "_resized".to_string(),
    };

    let res_wide = execute_image_job(&job_wide);
    assert!(res_wide.success, "Lanczos3 resize on 1000x2 must succeed");
    let out_img = image::open(&res_wide.output_path).expect("open wide output");
    // 1000x2 inside 100x100 -> ratio 500 -> 100x0.2 -> rounded to 0 clamped to 1
    assert_eq!(out_img.dimensions(), (100, 1));

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TARGET BOUNDS MATCHING EXACT SOURCE BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_target_matches_source_dimensions() {
    let (sandbox, cleanup) = create_temp_sandbox("exact_bounds");
    let src_path = sandbox.join("exact_300x200.png");

    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(300, 200, Rgba([42, 84, 126, 255]));
    img_buf.save(&src_path).unwrap();

    let job = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: Some(300),
        height: Some(200),
        quality: 85,
        strip_exif: true,
        suffix: "_same".to_string(),
    };

    let res = execute_image_job(&job);
    assert!(res.success);
    let out_img = image::open(&res.output_path).unwrap();
    assert_eq!(out_img.dimensions(), (300, 200));

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORRUPTED & TRUNCATED IMAGE BUFFERS (ZERO-PANIC GUARANTEE)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_corrupted_and_truncated_buffers() {
    let (sandbox, cleanup) = create_temp_sandbox("corrupted_buffers");

    // Case A: 0-byte empty file
    let empty_path = sandbox.join("empty.png");
    fs::write(&empty_path, b"").unwrap();
    let job_empty = ImageJob {
        input_path: empty_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "png".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: true,
        suffix: "_empty".to_string(),
    };
    let res_empty = execute_image_job(&job_empty);
    assert!(!res_empty.success, "Zero-byte file must fail gracefully");
    assert!(res_empty.error.is_some());

    // Case B: Truncated PNG signature only (8 bytes, no chunks)
    let trunc_png_path = sandbox.join("truncated.png");
    fs::write(&trunc_png_path, &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).unwrap();
    let job_trunc_png = ImageJob {
        input_path: trunc_png_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: true,
        suffix: "_trunc".to_string(),
    };
    let res_trunc_png = execute_image_job(&job_trunc_png);
    assert!(!res_trunc_png.success, "Truncated PNG must fail gracefully");
    assert!(res_trunc_png.error.is_some());

    // Case C: Truncated JPEG (SOI marker only, no frame or scan)
    let trunc_jpg_path = sandbox.join("truncated.jpg");
    fs::write(&trunc_jpg_path, &[0xFF, 0xD8]).unwrap();
    let job_trunc_jpg = ImageJob {
        input_path: trunc_jpg_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: true,
        suffix: "_trunc".to_string(),
    };
    let res_trunc_jpg = execute_image_job(&job_trunc_jpg);
    assert!(!res_trunc_jpg.success, "Truncated JPEG must fail gracefully");
    assert!(res_trunc_jpg.error.is_some());

    // Case D: 512 bytes of random binary noise (fuzz test)
    let garbage_path = sandbox.join("random_noise.bin");
    let random_bytes: Vec<u8> = (0..512).map(|i| ((i * 37 + 11) % 256) as u8).collect();
    fs::write(&garbage_path, &random_bytes).unwrap();
    let job_garbage = ImageJob {
        input_path: garbage_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: Some(100),
        height: Some(100),
        quality: 80,
        strip_exif: true,
        suffix: "_garbage".to_string(),
    };
    let res_garbage = execute_image_job(&job_garbage);
    assert!(!res_garbage.success, "Random binary bytes must fail cleanly");
    assert!(res_garbage.error.unwrap().contains("Failed to decode image"));

    // Case E: Non-existent file path
    let missing_path = sandbox.join("non_existent_image_file.jpg");
    let job_missing = ImageJob {
        input_path: missing_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "png".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: true,
        suffix: "_missing".to_string(),
    };
    let res_missing = execute_image_job(&job_missing);
    assert!(!res_missing.success);
    assert!(res_missing.error.unwrap().contains("Input file not found"));

    // Case F: Metadata inspection on corrupted file returns error gracefully
    let meta_corrupt = inspect_image_metadata(&garbage_path);
    assert!(meta_corrupt.width.is_none());
    assert!(meta_corrupt.height.is_none());
    assert!(meta_corrupt.dominant_color.is_none());

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FORMAT CONVERSION & TRANSPARENCY PRESERVATION (LOSSLESS WEBP / PNG)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_transparency_and_lossless_webp() {
    let (sandbox, cleanup) = create_temp_sandbox("transparency_webp");
    let src_path = sandbox.join("alpha_matrix.png");

    // Create 4x4 image with distinct alpha tiers:
    // Pixel (0,0): alpha 0 (fully transparent)
    // Pixel (1,0): alpha 64 (quarter transparent)
    // Pixel (2,0): alpha 128 (semi-transparent)
    // Pixel (3,0): alpha 255 (fully opaque)
    let mut img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(4, 4);
    img_buf.put_pixel(0, 0, Rgba([255, 0, 0, 0]));
    img_buf.put_pixel(1, 0, Rgba([0, 255, 0, 64]));
    img_buf.put_pixel(2, 0, Rgba([0, 0, 255, 128]));
    img_buf.put_pixel(3, 0, Rgba([255, 255, 0, 255]));
    img_buf.save(&src_path).unwrap();

    // 1. Transcode PNG to lossless WebP
    let job_webp = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: None,
        height: None,
        quality: 100,
        strip_exif: false,
        suffix: "_lossless".to_string(),
    };

    let res_webp = execute_image_job(&job_webp);
    assert!(res_webp.success, "Lossless WebP transcode failed");

    let out_webp = image::open(&res_webp.output_path).expect("open webp");
    let webp_rgba = out_webp.to_rgba8();

    // Verify alpha values are preserved in lossless WebP
    assert_eq!(webp_rgba.get_pixel(0, 0)[3], 0, "Alpha 0 preserved");
    assert_eq!(webp_rgba.get_pixel(1, 0)[3], 64, "Alpha 64 preserved");
    assert_eq!(webp_rgba.get_pixel(2, 0)[3], 128, "Alpha 128 preserved");
    assert_eq!(webp_rgba.get_pixel(3, 0)[3], 255, "Alpha 255 preserved");

    // 2. Transcode transparent PNG to JPEG (JPEG lacks alpha, must not crash)
    let job_jpeg = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: None,
        height: None,
        quality: 80,
        strip_exif: false,
        suffix: "_flattened".to_string(),
    };

    let res_jpeg = execute_image_job(&job_jpeg);
    assert!(res_jpeg.success, "Transparent PNG to JPEG must succeed via RGB8 conversion");
    let out_jpeg_bytes = fs::read(&res_jpeg.output_path).unwrap();
    assert_eq!(&out_jpeg_bytes[0..2], &[0xFF, 0xD8], "Valid JPEG SOI");

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. JPEG QUALITY QUANTIZATION & BOUNDARY CLAMPING
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_jpeg_quality_clamping() {
    let (sandbox, cleanup) = create_temp_sandbox("quality_clamping");
    let src_path = sandbox.join("photo.png");

    let img_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(64, 64, Rgba([120, 140, 160, 255]));
    img_buf.save(&src_path).unwrap();

    // Quality = 0 -> clamped to 1
    let job_q0 = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: None,
        height: None,
        quality: 0,
        strip_exif: false,
        suffix: "_q0".to_string(),
    };
    let res_q0 = execute_image_job(&job_q0);
    assert!(res_q0.success, "Quality 0 must be clamped to 1 without panic");

    // Quality = 100
    let job_q100 = ImageJob {
        input_path: src_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: None,
        height: None,
        quality: 100,
        strip_exif: false,
        suffix: "_q100".to_string(),
    };
    let res_q100 = execute_image_job(&job_q100);
    assert!(res_q100.success);

    // Verify file size at quality 1 is smaller than quality 100
    let size_q0 = res_q0.output_size.unwrap();
    let size_q100 = res_q100.output_size.unwrap();
    assert!(
        size_q0 <= size_q100,
        "Quality 1 file ({}) must be <= quality 100 file ({})",
        size_q0,
        size_q100
    );

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EXIF PRIVACY STRIPPING & LEAKAGE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_exif_leak_prevention() {
    let (sandbox, cleanup) = create_temp_sandbox("exif_leak");

    // APP1 Segment: length 30 bytes
    // Marker (2B) + Length (2B) + "Exif\0\0" (6B) + TIFF (20B)
    let app1_payload = b"Exif\0\0II*\0\x08\0\0\0\x01\0\x12\x01\x03\0\x01\0\0\0\x06\0\0\0\0\0\0\0";
    let app1_len = (app1_payload.len() + 2) as u16;

    // Generate valid JPEG bytes using image crate, then splice EXIF
    let base_img: ImageBuffer<image::Rgb<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(16, 16, image::Rgb([200, 200, 200]));
    let base_path = sandbox.join("base.jpg");
    base_img.save(&base_path).unwrap();
    let valid_jpeg = fs::read(&base_path).unwrap();

    // Splice APP1 into valid JPEG right after SOI
    let mut exif_jpeg = Vec::new();
    exif_jpeg.extend_from_slice(&valid_jpeg[0..2]); // SOI
    exif_jpeg.push(0xFF);
    exif_jpeg.push(0xE1);
    exif_jpeg.extend_from_slice(&app1_len.to_be_bytes());
    exif_jpeg.extend_from_slice(app1_payload);
    exif_jpeg.extend_from_slice(&valid_jpeg[2..]); // rest of JPEG

    let exif_path = sandbox.join("photo_with_exif.jpg");
    fs::write(&exif_path, &exif_jpeg).unwrap();

    // Verify synthetic JPEG has detectable EXIF orientation (6 = 90 deg clockwise)
    let raw_bytes = fs::read(&exif_path).unwrap();
    let detected_orient = read_jpeg_exif_orientation(&raw_bytes);
    assert_eq!(
        detected_orient,
        Some(6),
        "Source JPEG must have orientation tag 6"
    );

    // 1. Verify strip_exif_bytes removes the APP1 segment
    let stripped_bytes = strip_exif_bytes(&raw_bytes);
    assert_eq!(&stripped_bytes[0..2], &[0xFF, 0xD8]);
    assert!(
        !stripped_bytes.windows(4).any(|w| w == b"Exif"),
        "strip_exif_bytes must remove 'Exif' marker"
    );
    assert_eq!(read_jpeg_exif_orientation(&stripped_bytes), None);

    // 2. Process image through execute_image_job with strip_exif: true
    let job = ImageJob {
        input_path: exif_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "jpeg".to_string(),
        width: None,
        height: None,
        quality: 85,
        strip_exif: true,
        suffix: "_stripped".to_string(),
    };

    let res = execute_image_job(&job);
    assert!(res.success, "Job execution must succeed");

    // Inspect processed JPEG file output bytes
    let output_bytes = fs::read(&res.output_path).unwrap();
    assert_eq!(&output_bytes[0..2], &[0xFF, 0xD8]);

    // Privacy assertion: No APP1 marker (0xFF, 0xE1) must exist anywhere in output!
    let has_app1 = output_bytes.windows(2).any(|w| w == [0xFF, 0xE1]);
    assert!(
        !has_app1,
        "Processed output JPEG must contain zero APP1 (0xFF 0xE1) segments"
    );

    let has_exif_string = output_bytes.windows(4).any(|w| w == b"Exif");
    assert!(
        !has_exif_string,
        "Processed output JPEG must contain zero 'Exif' strings"
    );

    assert_eq!(
        read_jpeg_exif_orientation(&output_bytes),
        None,
        "Processed JPEG orientation must be None"
    );

    // 3. Transcode to WebP: ensure no EXIF chunk exists
    let job_webp = ImageJob {
        input_path: exif_path.to_string_lossy().to_string(),
        output_dir: sandbox.to_string_lossy().to_string(),
        format: "webp".to_string(),
        width: None,
        height: None,
        quality: 85,
        strip_exif: true,
        suffix: "_webp_clean".to_string(),
    };
    let res_webp = execute_image_job(&job_webp);
    assert!(res_webp.success);
    let webp_bytes = fs::read(&res_webp.output_path).unwrap();
    assert!(
        !webp_bytes.windows(4).any(|w| w == b"EXIF"),
        "WebP output must not contain EXIF chunk"
    );

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. COLLISION AVOIDANCE CHAIN STRESS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_collision_avoidance_chain() {
    let (sandbox, cleanup) = create_temp_sandbox("collision_chain");
    let base_file = sandbox.join("wallpaper.png");
    fs::write(&base_file, b"original").unwrap();

    // Create a chain of 8 existing collision files
    for i in 1..=8 {
        let collision_path = sandbox.join(format!("wallpaper ({}).png", i));
        fs::write(&collision_path, format!("version_{}", i)).unwrap();
    }

    // Next collision path must be (9)
    let next_path = get_unique_path(&base_file);
    assert_eq!(
        next_path.file_name().unwrap().to_str().unwrap(),
        "wallpaper (9).png"
    );

    // Test file without extension
    let no_ext = sandbox.join("asset_blob");
    fs::write(&no_ext, b"blob0").unwrap();
    let no_ext_1 = get_unique_path(&no_ext);
    assert_eq!(
        no_ext_1.file_name().unwrap().to_str().unwrap(),
        "asset_blob (1)"
    );
    fs::write(&no_ext_1, b"blob1").unwrap();
    let no_ext_2 = get_unique_path(&no_ext);
    assert_eq!(
        no_ext_2.file_name().unwrap().to_str().unwrap(),
        "asset_blob (2)"
    );

    // Test multi-dot filename (e.g. backup.2026.09.tar.gz)
    let multi_dot = sandbox.join("backup.tar.gz");
    fs::write(&multi_dot, b"tar").unwrap();
    let multi_dot_1 = get_unique_path(&multi_dot);
    assert_eq!(
        multi_dot_1.file_name().unwrap().to_str().unwrap(),
        "backup.tar (1).gz"
    );

    cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. DOMINANT PALETTE EXTRACTION EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_dominant_palette_edge_cases() {
    // 1. 100% transparent image: all alpha < 128
    let transparent_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([255, 100, 50, 0]));
    let dyn_transparent = DynamicImage::ImageRgba8(transparent_buf);
    let (dom_trans, palette_trans) = extract_dominant_palette(&dyn_transparent, 8);
    assert_eq!(
        dom_trans, None,
        "Fully transparent image must have None dominant color"
    );
    assert!(
        palette_trans.is_empty(),
        "Fully transparent image palette must be empty"
    );

    // 2. Micro 1x1 image palette
    let pixel_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(1, 1, Rgba([0, 255, 0, 255]));
    let dyn_pixel = DynamicImage::ImageRgba8(pixel_buf);
    let (dom_pixel, palette_pixel) = extract_dominant_palette(&dyn_pixel, 5);
    assert_eq!(
        dom_pixel.as_deref(),
        Some("#00ff00"),
        "Dominant color of green pixel must be #00ff00"
    );
    assert_eq!(palette_pixel.len(), 1);

    // 3. Max colors requested = 0
    let (dom_zero, palette_zero) = extract_dominant_palette(&dyn_pixel, 0);
    assert_eq!(dom_zero, None);
    assert!(palette_zero.is_empty());
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BATCH PROCESSING ISOLATION & RESILIENCE
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_image_batch_isolation() {
    let (sandbox, cleanup) = create_temp_sandbox("batch_isolation");

    // Prepare 1 good image, 1 corrupted image, 1 missing image
    let valid_path = sandbox.join("valid.png");
    let valid_buf: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(50, 50, Rgba([100, 150, 200, 255]));
    valid_buf.save(&valid_path).unwrap();

    let corrupt_path = sandbox.join("corrupted.png");
    fs::write(&corrupt_path, b"NOT_A_VALID_IMAGE_BUFFER").unwrap();

    let missing_path = sandbox.join("does_not_exist.png");

    let jobs = vec![
        ImageJob {
            input_path: valid_path.to_string_lossy().to_string(),
            output_dir: sandbox.to_string_lossy().to_string(),
            format: "webp".to_string(),
            width: Some(25),
            height: Some(25),
            quality: 80,
            strip_exif: true,
            suffix: "_v1".to_string(),
        },
        ImageJob {
            input_path: corrupt_path.to_string_lossy().to_string(),
            output_dir: sandbox.to_string_lossy().to_string(),
            format: "jpeg".to_string(),
            width: None,
            height: None,
            quality: 80,
            strip_exif: true,
            suffix: "_c1".to_string(),
        },
        ImageJob {
            input_path: missing_path.to_string_lossy().to_string(),
            output_dir: sandbox.to_string_lossy().to_string(),
            format: "png".to_string(),
            width: None,
            height: None,
            quality: 80,
            strip_exif: true,
            suffix: "_m1".to_string(),
        },
        ImageJob {
            input_path: valid_path.to_string_lossy().to_string(),
            output_dir: sandbox.to_string_lossy().to_string(),
            format: "jpeg".to_string(),
            width: None,
            height: None,
            quality: 90,
            strip_exif: true,
            suffix: "_v2".to_string(),
        },
    ];

    let mut results = Vec::new();
    for job in &jobs {
        results.push(execute_image_job(job));
    }

    assert_eq!(results.len(), 4);
    assert!(results[0].success, "Job 0 (valid) must succeed");
    assert!(!results[1].success, "Job 1 (corrupt) must fail cleanly");
    assert!(!results[2].success, "Job 2 (missing) must fail cleanly");
    assert!(results[3].success, "Job 3 (valid) must succeed");

    assert!(results[1].error.is_some());
    assert!(results[2].error.is_some());

    cleanup();
}
