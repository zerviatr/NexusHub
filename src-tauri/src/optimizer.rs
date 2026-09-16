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
use std::process::Command;
use std::time::{Duration, Instant, SystemTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemFlushResult {
    pub success: bool,
    pub output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemScanTempResult {
    pub path: String,
    #[serde(rename = "fileCount")]
    pub file_count: usize,
    #[serde(rename = "totalBytes")]
    pub total_bytes: u64,
    #[serde(rename = "sizeFormatted")]
    pub size_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCleanTempResult {
    pub success: bool,
    #[serde(rename = "deletedCount")]
    pub deleted_count: usize,
    #[serde(rename = "freedBytes")]
    pub freed_bytes: u64,
    #[serde(rename = "freedFormatted")]
    pub freed_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemPingResult {
    pub success: bool,
    pub latency: Option<u64>,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOptimizeAllResult {
    pub success: bool,
    #[serde(rename = "dnsFlushed")]
    pub dns_flushed: bool,
    #[serde(rename = "deletedFiles")]
    pub deleted_files: usize,
    #[serde(rename = "freedFormatted")]
    pub freed_formatted: String,
    #[serde(rename = "freedBytes")]
    pub freed_bytes: u64,
}

pub fn format_bytes_to_mb(bytes: u64) -> String {
    format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
}

#[tauri::command]
pub async fn system_flush_dns() -> Result<SystemFlushResult, String> {
    tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        let output_res = Command::new("ipconfig").arg("/flushdns").output();

        #[cfg(target_os = "macos")]
        let output_res = Command::new("dscacheutil").arg("-flushcache").output();

        #[cfg(target_os = "linux")]
        let output_res = Command::new("resolvectl").arg("flush-caches").output();

        match output_res {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let success = output.status.success();
                let msg = if success {
                    if stdout.is_empty() {
                        "DNS cache flushed successfully.".to_string()
                    } else {
                        stdout
                    }
                } else if !stderr.is_empty() {
                    stderr
                } else {
                    "DNS flush returned non-zero exit code.".to_string()
                };

                Ok(SystemFlushResult {
                    success,
                    output: msg,
                })
            }
            Err(err) => Ok(SystemFlushResult {
                success: false,
                output: format!("Failed to execute flush command: {}", err),
            }),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn system_scan_temp() -> Result<SystemScanTempResult, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::temp_dir();
        let mut total_bytes: u64 = 0;
        let mut file_count: usize = 0;

        if let Ok(entries) = fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        file_count += 1;
                        total_bytes += meta.len();
                    }
                }
            }
        }

        Ok(SystemScanTempResult {
            path: temp_dir.to_string_lossy().to_string(),
            file_count,
            total_bytes,
            size_formatted: format_bytes_to_mb(total_bytes),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn system_clean_temp() -> Result<SystemCleanTempResult, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::temp_dir();
        let mut deleted_count: usize = 0;
        let mut freed_bytes: u64 = 0;
        let one_hour = Duration::from_secs(3600);
        let now = SystemTime::now();

        if let Ok(entries) = fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        // Only remove files older than 1 hour
                        let should_delete = if let Ok(modified) = meta.modified() {
                            now.duration_since(modified).map(|d| d > one_hour).unwrap_or(false)
                        } else {
                            false
                        };

                        if should_delete {
                            let size = meta.len();
                            if fs::remove_file(&path).is_ok() {
                                deleted_count += 1;
                                freed_bytes += size;
                            }
                        }
                    }
                }
            }
        }

        Ok(SystemCleanTempResult {
            success: true,
            deleted_count,
            freed_bytes,
            freed_formatted: format_bytes_to_mb(freed_bytes),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn system_ping_host(host: String) -> Result<SystemPingResult, String> {
    tokio::task::spawn_blocking(move || {
        let clean_host: String = host
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-')
            .collect();
        let target = if clean_host.is_empty() {
            "1.1.1.1".to_string()
        } else {
            clean_host
        };

        let start = Instant::now();

        #[cfg(target_os = "windows")]
        let res = Command::new("ping")
            .args(["-n", "1", "-w", "1000", &target])
            .output();

        #[cfg(not(target_os = "windows"))]
        let res = Command::new("ping")
            .args(["-c", "1", "-W", "1", &target])
            .output();

        let elapsed_ms = start.elapsed().as_millis() as u64;

        match res {
            Ok(output) if output.status.success() => Ok(SystemPingResult {
                success: true,
                latency: Some(elapsed_ms),
                host: target,
            }),
            _ => Ok(SystemPingResult {
                success: false,
                latency: None,
                host: target,
            }),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn system_optimize_all() -> Result<SystemOptimizeAllResult, String> {
    let flush_res = system_flush_dns().await.unwrap_or(SystemFlushResult {
        success: false,
        output: String::new(),
    });

    let clean_res = system_clean_temp().await.unwrap_or(SystemCleanTempResult {
        success: false,
        deleted_count: 0,
        freed_bytes: 0,
        freed_formatted: "0.00 MB".to_string(),
    });

    Ok(SystemOptimizeAllResult {
        success: true,
        dns_flushed: flush_res.success,
        deleted_files: clean_res.deleted_count,
        freed_formatted: clean_res.freed_formatted,
        freed_bytes: clean_res.freed_bytes,
    })
}
