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
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

pub const CATEGORY_IMAGES: &str = "Images";
pub const CATEGORY_VIDEOS: &str = "Videos";
pub const CATEGORY_AUDIO: &str = "Audio";
pub const CATEGORY_DOCUMENTS: &str = "Documents";
pub const CATEGORY_ARCHIVES: &str = "Archives";
pub const CATEGORY_INSTALLERS: &str = "Installers";
pub const CATEGORY_CODE: &str = "Code";
pub const CATEGORY_OTHERS: &str = "Others";

pub static CATEGORY_EXTENSIONS: &[(&str, &[&str])] = &[
    (
        CATEGORY_IMAGES,
        &[".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff"],
    ),
    (
        CATEGORY_VIDEOS,
        &[".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm", ".flv", ".m4v"],
    ),
    (
        CATEGORY_AUDIO,
        &[".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"],
    ),
    (
        CATEGORY_DOCUMENTS,
        &[
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".csv",
            ".odt", ".ods",
        ],
    ),
    (
        CATEGORY_ARCHIVES,
        &[".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"],
    ),
    (
        CATEGORY_INSTALLERS,
        &[".exe", ".msi", ".dmg", ".pkg", ".apk", ".iso", ".appimage", ".deb", ".rpm"],
    ),
    (
        CATEGORY_CODE,
        &[
            ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".json", ".xml", ".md", ".yml",
            ".yaml", ".sql", ".sh", ".bat", ".ps1", ".env", ".log", ".cpp", ".c", ".java", ".go",
            ".rs", ".toml",
        ],
    ),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedFile {
    #[serde(rename = "originalName")]
    pub original_name: String,
    #[serde(rename = "originalPath")]
    pub original_path: String,
    pub extension: String,
    pub size: u64,
    #[serde(rename = "suggestedCategory")]
    pub suggested_category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOperation {
    #[serde(rename = "oldPath")]
    pub old_path: String,
    #[serde(rename = "newPath")]
    pub new_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub success: bool,
    #[serde(rename = "successfulOperations")]
    pub successful_operations: usize,
    #[serde(rename = "failedOperations")]
    pub failed_operations: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoResult {
    pub success: bool,
    pub restored: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub success: bool,
    pub files: Option<Vec<ScannedFile>>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectDirResult {
    pub canceled: bool,
    #[serde(rename = "filePaths")]
    pub file_paths: Vec<String>,
}

static UNDO_STACK: Mutex<Vec<FileOperation>> = Mutex::new(Vec::new());

/// Returns the category name for a given file extension.
/// Case-insensitive, defaults to 'Others'.
pub fn get_category(ext: &str) -> &'static str {
    let lower = ext.to_lowercase();
    let normalized = if lower.starts_with('.') {
        lower
    } else {
        format!(".{}", lower)
    };

    for (cat, extensions) in CATEGORY_EXTENSIONS {
        if extensions.contains(&normalized.as_str()) {
            return cat;
        }
    }
    CATEGORY_OTHERS
}

/// Generates a unique collision-free destination path by appending (1), (2)...
/// if target file already exists.
pub fn get_unique_path(target_path: &Path) -> PathBuf {
    if !target_path.exists() {
        return target_path.to_path_buf();
    }

    let parent = target_path.parent().unwrap_or_else(|| Path::new(""));
    let stem = target_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let ext = target_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();

    let mut counter = 1;
    loop {
        let candidate_name = format!("{} ({}){}", stem, counter, ext);
        let candidate_path = parent.join(candidate_name);
        if !candidate_path.exists() {
            return candidate_path;
        }
        counter += 1;
    }
}

/// Moves a file safely, with fallback to copy+delete for cross-device moves.
pub fn safe_move_file(source_path: &Path, dest_path: &Path) -> std::io::Result<()> {
    if let Err(_rename_err) = fs::rename(source_path, dest_path) {
        // Fallback: cross-filesystem copy and delete
        fs::copy(source_path, dest_path)?;
        fs::remove_file(source_path)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn organizer_select_dir() -> Result<SelectDirResult, String> {
    let folder = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select Folder to Organize")
            .pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    match folder {
        Some(path) => Ok(SelectDirResult {
            canceled: false,
            file_paths: vec![path.to_string_lossy().to_string()],
        }),
        None => Ok(SelectDirResult {
            canceled: true,
            file_paths: Vec::new(),
        }),
    }
}

#[tauri::command]
pub async fn organizer_scan(dir_path: String) -> Result<ScanResult, String> {
    tokio::task::spawn_blocking(move || {
        let target = Path::new(&dir_path);
        if !target.exists() || !target.is_dir() {
            return Ok(ScanResult {
                success: false,
                files: None,
                error: Some(format!("Directory not found: {}", dir_path)),
            });
        }

        let mut files = Vec::new();
        let entries = match fs::read_dir(target) {
            Ok(e) => e,
            Err(err) => {
                return Ok(ScanResult {
                    success: false,
                    files: None,
                    error: Some(err.to_string()),
                });
            }
        };

        for entry_res in entries {
            let entry = match entry_res {
                Ok(e) => e,
                Err(_) => continue,
            };
            let path = entry.path();
            if path.is_file() {
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e))
                    .unwrap_or_default();
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let suggested_category = get_category(&ext).to_string();

                files.push(ScannedFile {
                    original_name: file_name,
                    original_path: path.to_string_lossy().to_string(),
                    extension: ext,
                    size,
                    suggested_category,
                });
            }
        }

        Ok(ScanResult {
            success: true,
            files: Some(files),
            error: None,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn organizer_execute(operations: Vec<FileOperation>) -> Result<ExecutionResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut successful_ops = 0;
        let mut failed_ops = 0;
        let mut errors = Vec::new();
        let mut recorded_moves = Vec::new();

        for op in operations {
            let src = Path::new(&op.old_path);
            let dest = Path::new(&op.new_path);

            if !src.exists() {
                failed_ops += 1;
                errors.push(format!("Source file does not exist: {}", op.old_path));
                continue;
            }

            // Ensure destination directory exists
            if let Some(dest_dir) = dest.parent() {
                if let Err(err) = fs::create_dir_all(dest_dir) {
                    failed_ops += 1;
                    errors.push(format!(
                        "Failed to create directory {}: {}",
                        dest_dir.display(),
                        err
                    ));
                    continue;
                }
            }

            // Compute unique collision-free path
            let safe_dest = get_unique_path(dest);

            match safe_move_file(src, &safe_dest) {
                Ok(()) => {
                    successful_ops += 1;
                    recorded_moves.push(FileOperation {
                        old_path: op.old_path.clone(),
                        new_path: safe_dest.to_string_lossy().to_string(),
                    });
                }
                Err(err) => {
                    failed_ops += 1;
                    errors.push(format!(
                        "Failed to move {} to {}: {}",
                        op.old_path,
                        safe_dest.display(),
                        err
                    ));
                }
            }
        }

        if !recorded_moves.is_empty() {
            let mut stack = UNDO_STACK.lock().unwrap();
            *stack = recorded_moves;
        }

        Ok(ExecutionResult {
            success: failed_ops == 0,
            successful_operations: successful_ops,
            failed_operations: failed_ops,
            errors,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn organizer_can_undo() -> bool {
    let stack = UNDO_STACK.lock().unwrap();
    !stack.is_empty()
}

#[tauri::command]
pub async fn organizer_undo() -> Result<UndoResult, String> {
    tokio::task::spawn_blocking(move || {
        let moves = {
            let mut stack = UNDO_STACK.lock().unwrap();
            let current = stack.clone();
            stack.clear();
            current
        };

        if moves.is_empty() {
            return Ok(UndoResult {
                success: false,
                restored: 0,
                errors: vec!["No previous operations to undo".to_string()],
            });
        }

        let mut restored = 0;
        let mut errors = Vec::new();

        // Reverse operations
        for op in moves.into_iter().rev() {
            let current_loc = Path::new(&op.new_path);
            let original_loc = Path::new(&op.old_path);

            if !current_loc.exists() {
                errors.push(format!("File to restore not found: {}", op.new_path));
                continue;
            }

            if let Some(orig_dir) = original_loc.parent() {
                let _ = fs::create_dir_all(orig_dir);
            }

            match safe_move_file(current_loc, original_loc) {
                Ok(()) => {
                    restored += 1;
                }
                Err(err) => {
                    errors.push(format!(
                        "Failed to restore {} to {}: {}",
                        op.new_path, op.old_path, err
                    ));
                }
            }
        }

        Ok(UndoResult {
            success: errors.is_empty(),
            restored,
            errors,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
