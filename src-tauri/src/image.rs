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

//! Image Processing Engine using `image` and `imageops`.
//!
//! Provides:
//! - Metadata inspection & dominant color palette extraction (`image_get_metadata`)
//! - Lanczos3 aspect-ratio preserving resizing (`fit: inside`, `withoutEnlargement: true`)
//! - Privacy-preserving EXIF auto-rotation & stripping
//! - Multi-format transcoding (JPEG with quality factor, PNG, WebP)
//! - Single & batch processing pipelines (`image_process_single`, `image_process_batch`, `image_process`)
//! - Native image picker dialog via `rfd::FileDialog` (`image_select_files`)

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ExtendedColorType, GenericImageView, ImageEncoder, ImageFormat, Rgba};
use serde::{Deserialize, Serialize};

fn default_quality() -> u8 {
    85
}

fn default_true() -> bool {
    true
}

/// Metadata extracted from an image file.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImageMeta {
    pub file_path: String,
    pub name: String,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dominant_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dominant_colors: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub palette: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// A processing job specification for single or batch image execution.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImageJob {
    #[serde(alias = "input_path")]
    pub input_path: String,
    #[serde(alias = "output_dir")]
    pub output_dir: String,
    pub format: String, // "jpeg" | "jpg" | "png" | "webp"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(default = "default_quality")]
    pub quality: u8,
    #[serde(alias = "strip_exif", default = "default_true")]
    pub strip_exif: bool,
    #[serde(default)]
    pub suffix: String,
}

/// Result of an individual image processing job.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImageProcessResult {
    pub input_path: String,
    pub output_path: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Generates a collision-free path by appending incrementing counters `(1).ext`, `(2).ext`.
pub fn get_unique_path(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let parent = target.parent().unwrap_or_else(|| Path::new(""));
    let file_name = target
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file");

    let (stem, ext) = match target.extension().and_then(|e| e.to_str()) {
        Some(extension) => {
            let s = &file_name[..file_name.len() - extension.len() - 1];
            (s, Some(extension))
        }
        None => (file_name, None),
    };

    let mut counter = 1;
    loop {
        let new_name = match ext {
            Some(extension) => {
                if extension.is_empty() {
                    format!("{} ({})", stem, counter)
                } else {
                    format!("{} ({}).{}", stem, counter, extension)
                }
            }
            None => format!("{} ({})", stem, counter),
        };
        let candidate = parent.join(new_name);
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

/// Computes aspect-ratio preserving dimensions matching `fit: inside` and `withoutEnlargement: true`.
pub fn compute_fit_inside(
    src_w: u32,
    src_h: u32,
    target_w: Option<u32>,
    target_h: Option<u32>,
    without_enlargement: bool,
) -> (u32, u32) {
    if target_w.is_none() && target_h.is_none() {
        return (src_w, src_h);
    }

    let tw = target_w.unwrap_or(src_w) as f64;
    let th = target_h.unwrap_or(src_h) as f64;
    let sw = src_w as f64;
    let sh = src_h as f64;

    let src_ratio = sw / sh;
    let target_ratio = tw / th;

    let (mut w, mut h) = if src_ratio > target_ratio {
        let new_w = tw;
        let new_h = (tw / src_ratio).round();
        (new_w, new_h)
    } else {
        let new_w = (th * src_ratio).round();
        let new_h = th;
        (new_w, new_h)
    };

    if without_enlargement {
        w = w.min(sw);
        h = h.min(sh);
    }

    let final_w = (w.round() as u32).max(1);
    let final_h = (h.round() as u32).max(1);
    (final_w, final_h)
}

/// Extracts dominant colors from an image using RGB bucket histogram quantization.
pub fn extract_dominant_palette(img: &DynamicImage, max_colors: usize) -> (Option<String>, Vec<String>) {
    let thumb = img.thumbnail(64, 64);
    let mut buckets: HashMap<(u8, u8, u8), (u32, u64, u64, u64)> = HashMap::new();

    for (_x, _y, pixel) in thumb.pixels() {
        let Rgba([r, g, b, a]) = pixel;
        if a < 128 {
            continue; // Skip transparent pixels
        }
        // 4-bit quantization per channel (16 bins each)
        let key = (r / 16, g / 16, b / 16);
        let entry = buckets.entry(key).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        entry.1 += r as u64;
        entry.2 += g as u64;
        entry.3 += b as u64;
    }

    let mut sorted_buckets: Vec<_> = buckets.into_values().collect();
    sorted_buckets.sort_by(|a, b| b.0.cmp(&a.0));

    let palette: Vec<String> = sorted_buckets
        .iter()
        .take(max_colors)
        .map(|&(count, sum_r, sum_g, sum_b)| {
            let r = (sum_r / count as u64) as u8;
            let g = (sum_g / count as u64) as u8;
            let b = (sum_b / count as u64) as u8;
            format!("#{:02x}{:02x}{:02x}", r, g, b)
        })
        .collect();

    let dominant = palette.first().cloned();
    (dominant, palette)
}

/// Detects EXIF orientation tag from a JPEG byte stream.
/// Returns orientation value (1..=8) if present.
pub fn read_jpeg_exif_orientation(bytes: &[u8]) -> Option<u16> {
    if bytes.len() < 4 || bytes[0] != 0xFF || bytes[1] != 0xD8 {
        return None;
    }

    let mut offset = 2;
    while offset + 4 <= bytes.len() {
        if bytes[offset] != 0xFF {
            offset += 1;
            continue;
        }

        let marker = bytes[offset + 1];
        if marker == 0xDA || marker == 0xD9 {
            // Start of Scan or End of Image
            break;
        }

        let segment_len = u16::from_be_bytes([bytes[offset + 2], bytes[offset + 3]]) as usize;
        if offset + 2 + segment_len > bytes.len() {
            break;
        }

        if marker == 0xE1 && segment_len >= 14 {
            // APP1 segment
            let segment_data = &bytes[offset + 4..offset + 2 + segment_len];
            if segment_data.starts_with(b"Exif\0\0") {
                let tiff = &segment_data[6..];
                if tiff.len() >= 8 {
                    let is_little_endian = tiff.starts_with(b"II");
                    let read_u16 = |buf: &[u8]| -> u16 {
                        if is_little_endian {
                            u16::from_le_bytes([buf[0], buf[1]])
                        } else {
                            u16::from_be_bytes([buf[0], buf[1]])
                        }
                    };
                    let read_u32 = |buf: &[u8]| -> u32 {
                        if is_little_endian {
                            u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]])
                        } else {
                            u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]])
                        }
                    };

                    let first_ifd_offset = read_u32(&tiff[4..8]) as usize;
                    if first_ifd_offset + 2 <= tiff.len() {
                        let num_entries = read_u16(&tiff[first_ifd_offset..first_ifd_offset + 2]);
                        let entries_start = first_ifd_offset + 2;
                        for i in 0..num_entries as usize {
                            let entry_offset = entries_start + i * 12;
                            if entry_offset + 12 <= tiff.len() {
                                let tag = read_u16(&tiff[entry_offset..entry_offset + 2]);
                                if tag == 0x0112 {
                                    // Orientation tag
                                    let val = read_u16(&tiff[entry_offset + 8..entry_offset + 10]);
                                    return Some(val);
                                }
                            }
                        }
                    }
                }
            }
        }

        offset += 2 + segment_len;
    }

    None
}

/// Applies auto-rotation to `DynamicImage` based on EXIF orientation value.
pub fn apply_exif_orientation(img: DynamicImage, orientation: u16) -> DynamicImage {
    match orientation {
        3 => img.rotate180(),
        6 => img.rotate90(),
        8 => img.rotate270(),
        _ => img,
    }
}

/// Strips EXIF APP1 metadata segment from raw JPEG buffer for privacy.
pub fn strip_exif_bytes(buf: &[u8]) -> Vec<u8> {
    if buf.len() < 4 || buf[0] != 0xFF || buf[1] != 0xD8 {
        return buf.to_vec();
    }

    let mut result = Vec::with_capacity(buf.len());
    result.extend_from_slice(&buf[0..2]); // Keep SOI (0xFF, 0xD8)

    let mut offset = 2;
    while offset < buf.len() {
        if offset + 4 <= buf.len() && buf[offset] == 0xFF && buf[offset + 1] == 0xE1 {
            // APP1 EXIF segment found — skip it
            let segment_len = u16::from_be_bytes([buf[offset + 2], buf[offset + 3]]) as usize;
            offset += 2 + segment_len;
        } else if offset + 4 <= buf.len() && buf[offset] == 0xFF && buf[offset + 1] == 0xDA {
            // Start of scan — copy rest verbatim
            result.extend_from_slice(&buf[offset..]);
            break;
        } else {
            result.push(buf[offset]);
            offset += 1;
        }
    }

    result
}

/// Inspects metadata of an image file on disk.
pub fn inspect_image_metadata(file_path: &Path) -> ImageMeta {
    let path_str = file_path.to_string_lossy().to_string();
    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let meta = match std::fs::metadata(file_path) {
        Ok(m) => m,
        Err(e) => {
            return ImageMeta {
                file_path: path_str,
                name,
                size: 0,
                width: None,
                height: None,
                format: None,
                dominant_color: None,
                dominant_colors: None,
                palette: None,
                error: Some(format!("Failed to read file: {}", e)),
            };
        }
    };

    let reader = match image::ImageReader::open(file_path) {
        Ok(r) => r,
        Err(e) => {
            return ImageMeta {
                file_path: path_str,
                name,
                size: meta.len(),
                width: None,
                height: None,
                format: None,
                dominant_color: None,
                dominant_colors: None,
                palette: None,
                error: Some(format!("Failed to open image: {}", e)),
            };
        }
    };

    let format_str = reader
        .format()
        .map(|f| match f {
            ImageFormat::Png => "png",
            ImageFormat::Jpeg => "jpeg",
            ImageFormat::WebP => "webp",
            ImageFormat::Gif => "gif",
            ImageFormat::Bmp => "bmp",
            _ => "unknown",
        }.to_string());

    let (dimensions, dominant_color, palette) = match reader.decode() {
        Ok(decoded) => {
            let dims = (decoded.width(), decoded.height());
            let (dom, pal) = extract_dominant_palette(&decoded, 8);
            (Some(dims), dom, Some(pal))
        }
        Err(_) => (None, None, None),
    };

    let (width, height) = match dimensions {
        Some((w, h)) => (Some(w), Some(h)),
        None => (None, None),
    };

    ImageMeta {
        file_path: path_str,
        name,
        size: meta.len(),
        width,
        height,
        format: format_str,
        dominant_color: dominant_color.clone(),
        dominant_colors: palette.clone(),
        palette,
        error: None,
    }
}

/// Executes a single image transcoding job.
pub fn execute_image_job(job: &ImageJob) -> ImageProcessResult {
    let input_path = Path::new(&job.input_path);
    if !input_path.exists() {
        return ImageProcessResult {
            input_path: job.input_path.clone(),
            output_path: String::new(),
            success: false,
            output_size: None,
            error: Some(format!("Input file not found: {}", job.input_path)),
        };
    }

    let raw_bytes = match std::fs::read(input_path) {
        Ok(b) => b,
        Err(e) => {
            return ImageProcessResult {
                input_path: job.input_path.clone(),
                output_path: String::new(),
                success: false,
                output_size: None,
                error: Some(format!("Failed to read input file: {}", e)),
            };
        }
    };

    let mut img = match image::load_from_memory(&raw_bytes) {
        Ok(i) => i,
        Err(e) => {
            return ImageProcessResult {
                input_path: job.input_path.clone(),
                output_path: String::new(),
                success: false,
                output_size: None,
                error: Some(format!("Failed to decode image: {}", e)),
            };
        }
    };

    // Auto-rotate if EXIF orientation is present
    if job.strip_exif {
        if let Some(orient) = read_jpeg_exif_orientation(&raw_bytes) {
            img = apply_exif_orientation(img, orient);
        }
    }

    // Resizing with aspect ratio preservation (fit: inside, withoutEnlargement: true)
    let (src_w, src_h) = (img.width(), img.height());
    if job.width.is_some() || job.height.is_some() {
        let (target_w, target_h) = compute_fit_inside(src_w, src_h, job.width, job.height, true);
        if target_w != src_w || target_h != src_h {
            img = DynamicImage::ImageRgba8(image::imageops::resize(
                &img,
                target_w,
                target_h,
                FilterType::Lanczos3,
            ));
        }
    }

    // Determine target format & extension
    let format_lower = job.format.to_lowercase();
    let (target_format, out_ext) = match format_lower.as_str() {
        "jpeg" | "jpg" => (ImageFormat::Jpeg, "jpg"),
        "png" => (ImageFormat::Png, "png"),
        "webp" => (ImageFormat::WebP, "webp"),
        _ => (ImageFormat::WebP, "webp"),
    };

    // Build output path with suffix and collision avoidance
    let out_dir = Path::new(&job.output_dir);
    if let Err(e) = std::fs::create_dir_all(out_dir) {
        return ImageProcessResult {
            input_path: job.input_path.clone(),
            output_path: String::new(),
            success: false,
            output_size: None,
            error: Some(format!("Failed to create output directory: {}", e)),
        };
    }

    let stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let candidate_name = format!("{}{}.{}", stem, job.suffix, out_ext);
    let candidate_path = out_dir.join(candidate_name);
    let final_path = get_unique_path(&candidate_path);

    // Encode to output file
    let mut encoded_buffer = Vec::new();
    let quality = job.quality.clamp(1, 100);

    let encode_res = match target_format {
        ImageFormat::Jpeg => {
            let mut encoder = JpegEncoder::new_with_quality(&mut encoded_buffer, quality);
            let rgb = img.to_rgb8();
            encoder.encode(rgb.as_raw(), rgb.width(), rgb.height(), ExtendedColorType::Rgb8)
        }
        ImageFormat::Png => {
            let encoder = PngEncoder::new(&mut encoded_buffer);
            let rgba = img.to_rgba8();
            encoder.write_image(rgba.as_raw(), rgba.width(), rgba.height(), ExtendedColorType::Rgba8)
        }
        ImageFormat::WebP => {
            let encoder = WebPEncoder::new_lossless(&mut encoded_buffer);
            let rgba = img.to_rgba8();
            encoder.write_image(rgba.as_raw(), rgba.width(), rgba.height(), ExtendedColorType::Rgba8)
        }
        _ => {
            let encoder = WebPEncoder::new_lossless(&mut encoded_buffer);
            let rgba = img.to_rgba8();
            encoder.write_image(rgba.as_raw(), rgba.width(), rgba.height(), ExtendedColorType::Rgba8)
        }
    };

    if let Err(e) = encode_res {
        return ImageProcessResult {
            input_path: job.input_path.clone(),
            output_path: String::new(),
            success: false,
            output_size: None,
            error: Some(format!("Failed to encode image: {}", e)),
        };
    }

    if let Err(e) = std::fs::write(&final_path, &encoded_buffer) {
        return ImageProcessResult {
            input_path: job.input_path.clone(),
            output_path: String::new(),
            success: false,
            output_size: None,
            error: Some(format!("Failed to save output file: {}", e)),
        };
    }

    ImageProcessResult {
        input_path: job.input_path.clone(),
        output_path: final_path.to_string_lossy().to_string(),
        success: true,
        output_size: Some(encoded_buffer.len() as u64),
        error: None,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAURI COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn image_get_metadata(file_path: String) -> Result<ImageMeta, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    let meta = inspect_image_metadata(&path);
    if let Some(ref err) = meta.error {
        return Err(err.clone());
    }
    Ok(meta)
}

#[tauri::command]
pub async fn image_process_single(job: ImageJob) -> Result<ImageProcessResult, String> {
    let res = execute_image_job(&job);
    if !res.success {
        return Err(res.error.unwrap_or_else(|| "Image processing failed".to_string()));
    }
    Ok(res)
}

#[tauri::command]
pub async fn image_process_batch(jobs: Vec<ImageJob>) -> Result<Vec<ImageProcessResult>, String> {
    let mut results = Vec::with_capacity(jobs.len());
    for job in jobs {
        results.push(execute_image_job(&job));
    }
    Ok(results)
}

#[tauri::command]
pub async fn image_process(jobs: Vec<ImageJob>) -> Result<Vec<ImageProcessResult>, String> {
    image_process_batch(jobs).await
}

#[tauri::command]
pub async fn image_select_files() -> Result<Vec<String>, String> {
    let opt_paths = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Görselleri Seçin")
            .add_filter(
                "Images",
                &["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "avif"],
            )
            .pick_files()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(opt_paths
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}
