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

//! PDF Manipulation Engine using `lopdf`.
//!
//! Provides:
//! - PDF metadata inspection (`pdf_inspect`, `pdf_inspect_files`)
//! - Multi-document merging with object ID renumbering & collision avoidance (`pdf_merge`)
//! - Page range extraction/splitting (`pdf_split`)
//! - Native file selection dialog using `rfd::FileDialog` (`pdf_select_files`)

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use lopdf::content::{Content, Operation};
use lopdf::dictionary;
use lopdf::{Dictionary, Document, Object, ObjectId, Stream};
use serde::{Deserialize, Serialize};

/// Result of inspecting a PDF file.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PdfInspectResult {
    pub success: bool,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub page_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subject: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creation_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub is_encrypted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Backwards-compatible alias for legacy frontend `PDFFileInfo`.
pub type PdfFileInfo = PdfInspectResult;

/// Result of merging PDF documents.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PdfResult {
    pub success: bool,
    pub output_path: String,
    pub page_count: usize,
    pub total_count: usize,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Result of splitting a PDF document.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PdfSplitResult {
    pub success: bool,
    pub generated_files: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
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

/// Helper converting lopdf string/name objects to UTF-8 Rust strings.
fn object_to_string(obj: &Object) -> Option<String> {
    match obj {
        Object::String(bytes, _) => {
            if bytes.starts_with(&[0xFE, 0xFF]) {
                // UTF-16BE encoding with BOM
                let u16_chars: Vec<u16> = bytes[2..]
                    .chunks_exact(2)
                    .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
                    .collect();
                String::from_utf16(&u16_chars).ok()
            } else {
                Some(String::from_utf8_lossy(bytes).trim().to_string())
            }
        }
        Object::Name(bytes) => Some(String::from_utf8_lossy(bytes).trim().to_string()),
        _ => None,
    }
}

/// Pure page range parser matching ZenDev PDF specification:
/// Handles ranges like "1-3, 5, 8-10", out-of-order "4-2", bounds clamping [1, total_pages],
/// deduplication, and 0-based ascending sorting.
pub fn parse_pdf_page_range(page_range: &str, total_pages: usize) -> Vec<usize> {
    if page_range.trim().is_empty() || total_pages == 0 {
        return Vec::new();
    }

    let mut selected_indices = BTreeSet::new();
    for part in page_range.split(',') {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some((start_str, end_str)) = trimmed.split_once('-') {
            if let (Ok(start), Ok(end)) = (
                start_str.trim().parse::<i64>(),
                end_str.trim().parse::<i64>(),
            ) {
                if start > 0 || end > 0 {
                    let lower = start.min(end);
                    let upper = start.max(end);
                    for i in lower..=upper {
                        if i >= 1 && (i as usize) <= total_pages {
                            selected_indices.insert((i - 1) as usize);
                        }
                    }
                }
            }
        } else if let Ok(page_num) = trimmed.parse::<i64>() {
            if page_num >= 1 && (page_num as usize) <= total_pages {
                selected_indices.insert((page_num - 1) as usize);
            }
        }
    }

    selected_indices.into_iter().collect()
}

/// Inspects PDF bytes for valid header, page count, and metadata dictionary entries.
pub fn inspect_pdf_bytes(bytes: &[u8], file_path: Option<&str>) -> Result<PdfInspectResult, String> {
    if bytes.len() < 5 || !bytes.starts_with(b"%PDF-") {
        return Err("Invalid PDF format: missing %PDF header signature".to_string());
    }

    let doc = Document::load_mem(bytes)
        .map_err(|e| format!("Invalid PDF format: {}", e))?;

    let version = doc.version.clone();
    let page_count = doc.get_pages().len();
    let is_encrypted = doc.is_encrypted();

    let mut title = None;
    let mut author = None;
    let mut subject = None;
    let mut creator = None;
    let mut creation_date = None;

    if let Ok(info_ref) = doc.trailer.get(b"Info") {
        let info_dict = match info_ref {
            Object::Reference(id) => doc.get_object(*id).and_then(|o| o.as_dict()),
            Object::Dictionary(ref d) => Ok(d),
            _ => Err(lopdf::Error::Type),
        };

        if let Ok(dict) = info_dict {
            if let Ok(val) = dict.get(b"Title") {
                title = object_to_string(val);
            }
            if let Ok(val) = dict.get(b"Author") {
                author = object_to_string(val);
            }
            if let Ok(val) = dict.get(b"Subject") {
                subject = object_to_string(val);
            }
            if let Ok(val) = dict.get(b"Creator") {
                creator = object_to_string(val);
            }
            if let Ok(val) = dict.get(b"CreationDate") {
                creation_date = object_to_string(val);
            }
        }
    }

    let path_str = file_path.unwrap_or("").to_string();
    let name = Path::new(&path_str)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    Ok(PdfInspectResult {
        success: true,
        path: path_str,
        name,
        size: bytes.len() as u64,
        page_count,
        title,
        author,
        subject,
        creator,
        creation_date,
        version: Some(version),
        is_encrypted,
        error: None,
    })
}

/// Inspects a single PDF file on the filesystem.
pub fn inspect_single_pdf(file_path: &Path) -> PdfInspectResult {
    let path_str = file_path.to_string_lossy().to_string();
    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let bytes = match std::fs::read(file_path) {
        Ok(b) => b,
        Err(e) => {
            return PdfInspectResult {
                success: false,
                path: path_str,
                name,
                size: 0,
                page_count: 0,
                title: None,
                author: None,
                subject: None,
                creator: None,
                creation_date: None,
                version: None,
                is_encrypted: false,
                error: Some(format!("Failed to read file: {}", e)),
            };
        }
    };

    match inspect_pdf_bytes(&bytes, Some(&path_str)) {
        Ok(res) => res,
        Err(e) => PdfInspectResult {
            success: false,
            path: path_str,
            name,
            size: bytes.len() as u64,
            page_count: 0,
            title: None,
            author: None,
            subject: None,
            creator: None,
            creation_date: None,
            version: None,
            is_encrypted: false,
            error: Some(e),
        },
    }
}

/// Merges multiple distinct PDF files into a single unified document with object ID renumbering.
pub fn merge_pdf_documents(
    file_paths: &[String],
    target_output: &Path,
) -> Result<PdfResult, String> {
    if file_paths.len() < 2 {
        return Err("Birleştirmek için en az 2 PDF dosyası seçilmelidir.".to_string());
    }

    let mut merged_doc = Document::with_version("1.5");
    let mut max_id = 1;
    let mut documents_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    for path_str in file_paths {
        let path = Path::new(path_str);
        if !path.exists() {
            return Err(format!("Dosya bulunamadı: {}", path_str));
        }
        let mut doc = Document::load(path)
            .map_err(|e| format!("PDF yüklenemedi ({}): {}", path_str, e))?;

        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        for (_page_nr, object_id) in doc.get_pages() {
            if let Ok(obj) = doc.get_object(object_id) {
                documents_pages.insert(object_id, obj.clone());
            }
        }
        documents_objects.extend(doc.objects);
    }

    if documents_pages.is_empty() {
        return Err("Seçilen PDF belgelerinde sayfa bulunamadı.".to_string());
    }

    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in documents_objects.iter() {
        match object.type_name().unwrap_or("") {
            "Catalog" => {
                if catalog_object.is_none() {
                    catalog_object = Some((*object_id, object.clone()));
                }
            }
            "Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref existing_obj)) = pages_object {
                        if let Ok(existing_dict) = existing_obj.as_dict() {
                            dictionary.extend(existing_dict);
                        }
                    }
                    pages_object = Some((
                        if let Some((id, _)) = pages_object { id } else { *object_id },
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            "Page" | "Outlines" | "Outline" => {}
            _ => {
                merged_doc.objects.insert(*object_id, object.clone());
            }
        }
    }

    let pages_id = pages_object
        .as_ref()
        .map(|(id, _)| *id)
        .unwrap_or_else(|| merged_doc.new_object_id());

    let catalog_id = catalog_object
        .as_ref()
        .map(|(id, _)| *id)
        .unwrap_or_else(|| merged_doc.new_object_id());

    for (object_id, object) in documents_pages.iter() {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", pages_id);
            merged_doc.objects.insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    let mut pages_dict = pages_object
        .and_then(|(_, o)| o.as_dict().ok().cloned())
        .unwrap_or_else(Dictionary::new);

    pages_dict.set("Type", "Pages");
    pages_dict.set("Count", documents_pages.len() as u32);
    pages_dict.set(
        "Kids",
        documents_pages
            .keys()
            .map(|id| Object::Reference(*id))
            .collect::<Vec<_>>(),
    );
    merged_doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    let mut catalog_dict = catalog_object
        .and_then(|(_, o)| o.as_dict().ok().cloned())
        .unwrap_or_else(Dictionary::new);

    catalog_dict.set("Type", "Catalog");
    catalog_dict.set("Pages", pages_id);
    catalog_dict.remove(b"Outlines");
    merged_doc.objects.insert(catalog_id, Object::Dictionary(catalog_dict));

    merged_doc.trailer.set("Root", catalog_id);
    merged_doc.max_id = merged_doc.objects.len() as u32;
    merged_doc.renumber_objects();
    merged_doc.compress();

    let final_output = get_unique_path(target_output);
    if let Some(parent) = final_output.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    merged_doc
        .save(&final_output)
        .map_err(|e| format!("Birleştirilen PDF kaydedilemedi: {}", e))?;

    let size = std::fs::metadata(&final_output).map(|m| m.len()).unwrap_or(0);
    let page_count = documents_pages.len();

    Ok(PdfResult {
        success: true,
        output_path: final_output.to_string_lossy().to_string(),
        page_count,
        total_count: page_count,
        size,
        error: None,
    })
}

/// Extracts a subset of pages into a new standalone PDF Document.
pub fn extract_pages_subdocument(
    src_doc: &Document,
    selected_pages_1based: &[u32],
) -> Result<Document, String> {
    let mut new_doc = src_doc.clone();
    let pages_map = src_doc.get_pages();

    let new_pages_id = new_doc.new_object_id();
    let mut kids = Vec::new();

    for &page_num in selected_pages_1based {
        if let Some(&page_id) = pages_map.get(&page_num) {
            if let Ok(page_dict) = new_doc.get_object_mut(page_id).and_then(Object::as_dict_mut) {
                page_dict.set("Parent", new_pages_id);
                kids.push(Object::Reference(page_id));
            }
        }
    }

    if kids.is_empty() {
        return Err("No valid pages selected for extraction".to_string());
    }

    let pages = lopdf::dictionary! {
        "Type" => "Pages",
        "Kids" => kids,
        "Count" => selected_pages_1based.len() as u32,
    };
    new_doc.objects.insert(new_pages_id, Object::Dictionary(pages));

    if let Ok(catalog) = new_doc.catalog_mut() {
        catalog.set("Pages", new_pages_id);
        catalog.remove(b"Outlines");
    }

    let referenced = new_doc.traverse_objects(|_| {});
    new_doc.objects.retain(|k, _| referenced.contains(k));
    new_doc.renumber_objects();
    new_doc.compress();

    Ok(new_doc)
}

/// Splits a PDF document by comma-separated page ranges.
pub fn split_pdf_document(
    file_path: &str,
    ranges_str: &str,
    output_dir: Option<&str>,
) -> Result<PdfSplitResult, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("Dosya bulunamadı: {}", file_path));
    }

    let src_doc = Document::load(path)
        .map_err(|e| format!("PDF dosyası okunamadı: {}", e))?;

    let total_pages = src_doc.get_pages().len();
    if total_pages == 0 {
        return Err("PDF belgesi boş, sayfa bulunamadı.".to_string());
    }

    let parts: Vec<&str> = ranges_str
        .split(',')
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect();

    if parts.is_empty() {
        return Err(format!(
            "Geçerli bir sayfa aralığı girin (Toplam sayfa: {}).",
            total_pages
        ));
    }

    let out_dir = match output_dir {
        Some(d) if !d.is_empty() => PathBuf::from(d),
        _ => path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
    };
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("document");
    let mut generated_files = Vec::new();
    let mut total_extracted_pages = 0;

    for part in &parts {
        let indices_0based = parse_pdf_page_range(part, total_pages);
        if indices_0based.is_empty() {
            continue;
        }

        let pages_1based: Vec<u32> = indices_0based.iter().map(|i| (*i + 1) as u32).collect();
        let mut sub_doc = extract_pages_subdocument(&src_doc, &pages_1based)?;

        let sanitized_part = part
            .replace(' ', "")
            .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
        let candidate_name = format!("{}_{}.pdf", stem, sanitized_part);
        let candidate_path = out_dir.join(candidate_name);
        let final_path = get_unique_path(&candidate_path);

        sub_doc
            .save(&final_path)
            .map_err(|e| format!("Ayrılan PDF kaydedilemedi: {}", e))?;
        total_extracted_pages += pages_1based.len();
        generated_files.push(final_path.to_string_lossy().to_string());
    }

    if generated_files.is_empty() {
        return Err(format!(
            "Geçerli bir sayfa aralığı girin (Toplam sayfa: {}).",
            total_pages
        ));
    }

    let first_file = generated_files.first().cloned();
    let first_file_size = first_file
        .as_ref()
        .and_then(|f| std::fs::metadata(f).ok())
        .map(|m| m.len());

    Ok(PdfSplitResult {
        success: true,
        generated_files,
        output_path: first_file,
        page_count: Some(total_extracted_pages),
        size: first_file_size,
        error: None,
    })
}

/// Generates a valid minimal synthetic PDF for unit & integration testing.
pub fn generate_test_pdf(title: &str, page_count: usize) -> Document {
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let font_id = doc.add_object(lopdf::dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    });
    let resources_id = doc.add_object(lopdf::dictionary! {
        "Font" => lopdf::dictionary! {
            "F1" => font_id,
        },
    });

    let mut kids = Vec::new();
    for i in 1..=page_count {
        let content = Content {
            operations: vec![
                Operation::new("BT", vec![]),
                Operation::new("Tf", vec!["F1".into(), 24.into()]),
                Operation::new("Td", vec![100.into(), 700.into()]),
                Operation::new("Tj", vec![Object::string_literal(format!("Page {}", i))]),
                Operation::new("ET", vec![]),
            ],
        };
        let content_id = doc.add_object(Stream::new(
            lopdf::dictionary! {},
            content.encode().unwrap_or_default(),
        ));
        let page_id = doc.add_object(lopdf::dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "Resources" => resources_id,
            "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
        });
        kids.push(Object::Reference(page_id));
    }

    let pages = lopdf::dictionary! {
        "Type" => "Pages",
        "Kids" => kids,
        "Count" => page_count as u32,
    };
    doc.objects.insert(pages_id, Object::Dictionary(pages));

    let info_id = doc.add_object(lopdf::dictionary! {
        "Title" => Object::string_literal(title),
        "Author" => Object::string_literal("ZenDev Media Engine"),
        "Creator" => Object::string_literal("ZenDev Rust"),
    });

    let catalog_id = doc.add_object(lopdf::dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });

    doc.trailer.set("Root", catalog_id);
    doc.trailer.set("Info", info_id);
    doc.compress();
    doc
}

// ─────────────────────────────────────────────────────────────────────────────
// TAURI COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn pdf_inspect(file_path: String) -> Result<PdfInspectResult, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }
    let res = inspect_single_pdf(&path);
    if !res.success {
        return Err(res.error.unwrap_or_else(|| "Failed to inspect PDF".to_string()));
    }
    Ok(res)
}

#[tauri::command]
pub async fn pdf_inspect_files(file_paths: Vec<String>) -> Result<Vec<PdfInspectResult>, String> {
    let mut results = Vec::with_capacity(file_paths.len());
    for p in file_paths {
        let path = PathBuf::from(&p);
        results.push(inspect_single_pdf(&path));
    }
    Ok(results)
}

#[tauri::command]
pub async fn pdf_merge(
    file_paths: Vec<String>,
    output_path: Option<String>,
    output_file_name: Option<String>,
) -> Result<PdfResult, String> {
    let target = match output_path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => match output_file_name {
            Some(name) if !name.is_empty() => {
                let parent = file_paths
                    .first()
                    .and_then(|f| Path::new(f).parent())
                    .unwrap_or_else(|| Path::new("."));
                parent.join(name)
            }
            _ => {
                let first_stem = file_paths
                    .first()
                    .and_then(|f| Path::new(f).file_stem())
                    .and_then(|s| s.to_str())
                    .unwrap_or("merged");
                let parent = file_paths
                    .first()
                    .and_then(|f| Path::new(f).parent())
                    .unwrap_or_else(|| Path::new("."));
                parent.join(format!("{}_merged.pdf", first_stem))
            }
        },
    };

    merge_pdf_documents(&file_paths, &target)
}

#[tauri::command]
pub async fn pdf_split(
    file_path: String,
    ranges: Option<String>,
    page_range: Option<String>,
    output_dir: Option<String>,
) -> Result<PdfSplitResult, String> {
    let range_str = ranges.or(page_range).unwrap_or_default();
    split_pdf_document(&file_path, &range_str, output_dir.as_deref())
}

#[tauri::command]
pub async fn pdf_select_files(allow_multiple: Option<bool>) -> Result<Vec<PdfInspectResult>, String> {
    let allow_mult = allow_multiple.unwrap_or(true);
    let opt_paths = tokio::task::spawn_blocking(move || {
        let dialog = rfd::FileDialog::new()
            .set_title("PDF Dosyalarını Seçin")
            .add_filter("PDF Documents", &["pdf"]);
        if allow_mult {
            dialog.pick_files()
        } else {
            dialog.pick_file().map(|p| vec![p])
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    let paths = opt_paths.unwrap_or_default();
    let mut results = Vec::with_capacity(paths.len());
    for p in paths {
        results.push(inspect_single_pdf(&p));
    }
    Ok(results)
}
