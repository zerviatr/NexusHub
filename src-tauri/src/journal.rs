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

use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const GENESIS_PREV_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000000000";
pub const MAX_JOURNAL_ENTRIES: usize = 5000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ActivityEntry {
    pub id: String,
    pub sequence: u64,
    pub timestamp: i64,
    #[serde(rename = "toolId")]
    pub tool_id: String,
    pub action: String,
    pub category: String,
    pub status: String,
    pub details: String,
    pub metadata: Option<serde_json::Value>,
    #[serde(rename = "durationMs")]
    pub duration_ms: Option<u64>,
    #[serde(rename = "prevHash")]
    pub prev_hash: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct JournalQueryParams {
    #[serde(rename = "toolId")]
    pub tool_id: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<i64>,
    #[serde(rename = "endDate")]
    pub end_date: Option<i64>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub order: Option<String>, // "asc" | "desc"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalQueryResponse {
    pub entries: Vec<ActivityEntry>,
    pub total: usize,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditVerificationResult {
    pub valid: bool,
    #[serde(rename = "totalVerified")]
    pub total_verified: usize,
    #[serde(rename = "brokenIndex", skip_serializing_if = "Option::is_none")]
    pub broken_index: Option<usize>,
    #[serde(rename = "brokenEntryId", skip_serializing_if = "Option::is_none")]
    pub broken_entry_id: Option<String>,
    #[serde(rename = "brokenReason", skip_serializing_if = "Option::is_none")]
    pub broken_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "expectedHash", skip_serializing_if = "Option::is_none")]
    pub expected_hash: Option<String>,
    #[serde(rename = "actualHash", skip_serializing_if = "Option::is_none")]
    pub actual_hash: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalStatsResult {
    #[serde(rename = "totalEntries")]
    pub total_entries: usize,
    #[serde(rename = "entriesByStatus")]
    pub entries_by_status: HashMap<String, usize>,
    #[serde(rename = "entriesByCategory")]
    pub entries_by_category: HashMap<String, usize>,
    #[serde(rename = "oldestTimestamp")]
    pub oldest_timestamp: Option<i64>,
    #[serde(rename = "newestTimestamp")]
    pub newest_timestamp: Option<i64>,
    #[serde(rename = "chainValid")]
    pub chain_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalExportResult {
    pub success: bool,
    pub content: String,
    pub filename: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordResult {
    pub success: bool,
    pub entry: Option<ActivityEntry>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClearResult {
    pub success: bool,
    #[serde(rename = "clearedCount")]
    pub cleared_count: usize,
    pub error: Option<String>,
}

static JOURNAL_ENTRIES: Mutex<Vec<ActivityEntry>> = Mutex::new(Vec::new());
static LAST_HASH: Mutex<Option<String>> = Mutex::new(None);
static CURRENT_SEQUENCE: Mutex<u64> = Mutex::new(0);
static CUSTOM_STORAGE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
static INITIALIZED: Mutex<bool> = Mutex::new(false);

fn current_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn generate_entry_id() -> String {
    let mut rng = rand::thread_rng();
    let rand_val: u32 = rng.gen_range(100000..999999);
    format!("act_{}_{}", current_timestamp_ms(), rand_val)
}

pub fn set_custom_storage_path(path: Option<PathBuf>) {
    let mut guard = CUSTOM_STORAGE_PATH.lock().unwrap();
    *guard = path;
    let mut init = INITIALIZED.lock().unwrap();
    *init = false;
    let mut entries = JOURNAL_ENTRIES.lock().unwrap();
    entries.clear();
    let mut last_hash = LAST_HASH.lock().unwrap();
    *last_hash = None;
    let mut seq = CURRENT_SEQUENCE.lock().unwrap();
    *seq = 0;
}

pub fn get_storage_path() -> PathBuf {
    let guard = CUSTOM_STORAGE_PATH.lock().unwrap();
    if let Some(ref p) = *guard {
        return p.clone();
    }
    std::env::temp_dir().join("activity_journal.jsonl")
}

/// Canonical JSON stringification with lexicographically sorted object keys
/// to guarantee identical hash calculation across runtimes.
pub fn canonical_stringify(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(b) => if *b { "true".to_string() } else { "false".to_string() },
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => serde_json::to_string(s).unwrap_or_else(|_| "\"\"".to_string()),
        serde_json::Value::Array(arr) => {
            let items: Vec<String> = arr.iter().map(canonical_stringify).collect();
            format!("[{}]", items.join(","))
        }
        serde_json::Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            let mut entries = Vec::new();
            for k in keys {
                let v = &map[k];
                let key_json = serde_json::to_string(k).unwrap_or_else(|_| "\"\"".to_string());
                let val_json = canonical_stringify(v);
                entries.push(format!("{}:{}", key_json, val_json));
            }
            format!("{{{}}}", entries.join(","))
        }
    }
}

/// Computes SHA-256 hash using length-prefixed encoding matching auditIntegrity.ts:
/// `${field.len}:${field}` joined with `|`.
pub fn compute_entry_hash(entry: &ActivityEntry) -> String {
    let canonical_metadata = match &entry.metadata {
        Some(val) => canonical_stringify(val),
        None => "{}".to_string(),
    };
    let duration_str = entry.duration_ms.unwrap_or(0).to_string();
    let seq_str = entry.sequence.to_string();
    let ts_str = entry.timestamp.to_string();

    let fields = [
        entry.id.as_str(),
        seq_str.as_str(),
        ts_str.as_str(),
        entry.tool_id.as_str(),
        entry.action.as_str(),
        entry.status.as_str(),
        entry.category.as_str(),
        entry.details.as_str(),
        entry.prev_hash.as_str(),
        canonical_metadata.as_str(),
        duration_str.as_str(),
    ];

    let payload = fields
        .iter()
        .map(|f| format!("{}:{}", f.encode_utf16().count(), f))
        .collect::<Vec<_>>()
        .join("|");

    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Verifies cryptographic integrity of a chain of ActivityEntry items.
pub fn verify_audit_chain(entries: &[ActivityEntry]) -> AuditVerificationResult {
    let now = current_timestamp_ms();
    if entries.is_empty() {
        return AuditVerificationResult {
            valid: true,
            total_verified: 0,
            broken_index: None,
            broken_entry_id: None,
            broken_reason: None,
            error: None,
            expected_hash: None,
            actual_hash: None,
            timestamp: now,
        };
    }

    for (i, entry) in entries.iter().enumerate() {
        if entry.sequence < 1 {
            let reason = format!(
                "Invalid sequence at index {}: sequence must be at least 1, got {}",
                i, entry.sequence
            );
            return AuditVerificationResult {
                valid: false,
                total_verified: i,
                broken_index: Some(i),
                broken_entry_id: Some(entry.id.clone()),
                broken_reason: Some(reason.clone()),
                error: Some(reason),
                expected_hash: None,
                actual_hash: None,
                timestamp: now,
            };
        }

        // 1. Genesis block vs Pruned log initial check
        if i == 0 {
            if entry.sequence == 1 {
                if entry.prev_hash != GENESIS_PREV_HASH {
                    let reason = format!(
                        "Genesis prevHash mismatch. Expected {}, got {}",
                        GENESIS_PREV_HASH, entry.prev_hash
                    );
                    return AuditVerificationResult {
                        valid: false,
                        total_verified: 0,
                        broken_index: Some(0),
                        broken_entry_id: Some(entry.id.clone()),
                        broken_reason: Some(reason.clone()),
                        error: Some(reason),
                        expected_hash: Some(GENESIS_PREV_HASH.to_string()),
                        actual_hash: Some(entry.prev_hash.clone()),
                        timestamp: now,
                    };
                }
            } else if entry.prev_hash.len() != 64
                || !entry.prev_hash.chars().all(|c| c.is_ascii_hexdigit())
            {
                let reason = format!(
                    "Pruned log initial prevHash must be a valid 64-character hex string. Got {}",
                    entry.prev_hash
                );
                return AuditVerificationResult {
                    valid: false,
                    total_verified: 0,
                    broken_index: Some(0),
                    broken_entry_id: Some(entry.id.clone()),
                    broken_reason: Some(reason.clone()),
                    error: Some(reason),
                    expected_hash: None,
                    actual_hash: None,
                    timestamp: now,
                };
            }
        } else {
            // 2. Chain continuity checks
            let prev_entry = &entries[i - 1];
            if entry.prev_hash != prev_entry.hash {
                let reason = format!(
                    "Chain broken at index {}: prevHash does not match entry {} hash",
                    i,
                    i - 1
                );
                return AuditVerificationResult {
                    valid: false,
                    total_verified: i,
                    broken_index: Some(i),
                    broken_entry_id: Some(entry.id.clone()),
                    broken_reason: Some(reason.clone()),
                    error: Some(reason),
                    expected_hash: Some(prev_entry.hash.clone()),
                    actual_hash: Some(entry.prev_hash.clone()),
                    timestamp: now,
                };
            }
            if entry.sequence != prev_entry.sequence + 1 {
                let reason = format!(
                    "Sequence gap at index {}: expected {}, got {}",
                    i,
                    prev_entry.sequence + 1,
                    entry.sequence
                );
                return AuditVerificationResult {
                    valid: false,
                    total_verified: i,
                    broken_index: Some(i),
                    broken_entry_id: Some(entry.id.clone()),
                    broken_reason: Some(reason.clone()),
                    error: Some(reason),
                    expected_hash: None,
                    actual_hash: None,
                    timestamp: now,
                };
            }
        }

        // 3. Recomputed hash match check
        let expected = compute_entry_hash(entry);
        if expected != entry.hash {
            let reason = format!(
                "Tampered content at index {}: recomputed hash does not match stored hash",
                i
            );
            return AuditVerificationResult {
                valid: false,
                total_verified: i,
                broken_index: Some(i),
                broken_entry_id: Some(entry.id.clone()),
                broken_reason: Some(reason.clone()),
                error: Some(reason),
                expected_hash: Some(expected),
                actual_hash: Some(entry.hash.clone()),
                timestamp: now,
            };
        }
    }

    AuditVerificationResult {
        valid: true,
        total_verified: entries.len(),
        broken_index: None,
        broken_entry_id: None,
        broken_reason: None,
        error: None,
        expected_hash: None,
        actual_hash: None,
        timestamp: now,
    }
}

pub fn ensure_initialized() {
    let mut init = INITIALIZED.lock().unwrap();
    if *init {
        return;
    }

    let path = get_storage_path();
    let mut entries = JOURNAL_ENTRIES.lock().unwrap();
    let mut last_hash = LAST_HASH.lock().unwrap();
    let mut current_seq = CURRENT_SEQUENCE.lock().unwrap();

    entries.clear();
    *last_hash = None;
    *current_seq = 0;

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                if let Ok(entry) = serde_json::from_str::<ActivityEntry>(trimmed) {
                    entries.push(entry);
                }
            }
            if !entries.is_empty() {
                entries.sort_by_key(|e| e.sequence);
                if let Some(last) = entries.last() {
                    *current_seq = last.sequence;
                    *last_hash = Some(last.hash.clone());
                }
            }
        }
    }

    *init = true;
}

#[tauri::command]
pub async fn journal_record(entry: serde_json::Value) -> Result<RecordResult, String> {
    tokio::task::spawn_blocking(move || {
        ensure_initialized();

        let mut current_seq = CURRENT_SEQUENCE.lock().unwrap();
        let mut last_hash_guard = LAST_HASH.lock().unwrap();
        let mut entries = JOURNAL_ENTRIES.lock().unwrap();

        let new_sequence = *current_seq + 1;
        let prev_hash = last_hash_guard
            .clone()
            .unwrap_or_else(|| GENESIS_PREV_HASH.to_string());

        let id = entry
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(generate_entry_id);

        let timestamp = entry
            .get("timestamp")
            .and_then(|v| v.as_i64())
            .unwrap_or_else(current_timestamp_ms);

        let tool_id = entry
            .get("toolId")
            .and_then(|v| v.as_str())
            .unwrap_or("general")
            .to_string();

        let action = entry
            .get("action")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let category = entry
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("general")
            .to_string();

        let status = entry
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("info")
            .to_string();

        let details = entry
            .get("details")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let duration_ms = entry.get("durationMs").and_then(|v| v.as_u64());
        let metadata = entry.get("metadata").cloned();

        let mut record = ActivityEntry {
            id,
            sequence: new_sequence,
            timestamp,
            tool_id,
            action,
            category,
            status,
            details,
            metadata,
            duration_ms,
            prev_hash,
            hash: String::new(),
        };

        record.hash = compute_entry_hash(&record);

        // Append line to file
        let path = get_storage_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let line = match serde_json::to_string(&record) {
            Ok(s) => s + "\n",
            Err(e) => return Ok(RecordResult {
                success: false,
                entry: None,
                error: Some(e.to_string()),
            }),
        };

        let mut file = match OpenOptions::new().create(true).append(true).open(&path) {
            Ok(f) => f,
            Err(e) => return Ok(RecordResult {
                success: false,
                entry: None,
                error: Some(e.to_string()),
            }),
        };

        if let Err(e) = file.write_all(line.as_bytes()) {
            return Ok(RecordResult {
                success: false,
                entry: None,
                error: Some(e.to_string()),
            });
        }

        *current_seq = new_sequence;
        *last_hash_guard = Some(record.hash.clone());
        entries.push(record.clone());

        if entries.len() > MAX_JOURNAL_ENTRIES {
            let keep_idx = entries.len() - MAX_JOURNAL_ENTRIES;
            let truncated = entries.split_off(keep_idx);
            *entries = truncated;
            // Atomic rewrite file
            let mut file_content = String::new();
            for e in entries.iter() {
                if let Ok(s) = serde_json::to_string(e) {
                    file_content.push_str(&s);
                    file_content.push('\n');
                }
            }
            let _ = fs::write(&path, file_content);
        }

        Ok(RecordResult {
            success: true,
            entry: Some(record),
            error: None,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn journal_query(
    params: Option<JournalQueryParams>,
) -> Result<JournalQueryResponse, String> {
    tokio::task::spawn_blocking(move || {
        ensure_initialized();
        let entries = JOURNAL_ENTRIES.lock().unwrap();

        let mut filtered: Vec<ActivityEntry> = entries.clone();

        if let Some(p) = params {
            if let Some(ref tid) = p.tool_id {
                filtered.retain(|e| &e.tool_id == tid);
            }
            if let Some(ref cat) = p.category {
                filtered.retain(|e| &e.category == cat);
            }
            if let Some(ref stat) = p.status {
                filtered.retain(|e| &e.status == stat);
            }
            if let Some(start) = p.start_date {
                filtered.retain(|e| e.timestamp >= start);
            }
            if let Some(end) = p.end_date {
                filtered.retain(|e| e.timestamp <= end);
            }
            if let Some(ref q) = p.search {
                let query = q.trim().to_lowercase();
                if !query.is_empty() {
                    filtered.retain(|e| {
                        e.action.to_lowercase().contains(&query)
                            || e.details.to_lowercase().contains(&query)
                            || e.tool_id.to_lowercase().contains(&query)
                            || e.category.to_lowercase().contains(&query)
                            || e.metadata
                                .as_ref()
                                .map(|m| m.to_string().to_lowercase().contains(&query))
                                .unwrap_or(false)
                    });
                }
            }

            let order = p.order.as_deref().unwrap_or("desc");
            if order == "asc" {
                filtered.sort_by_key(|e| e.sequence);
            } else {
                filtered.sort_by(|a, b| b.sequence.cmp(&a.sequence));
            }

            let total = filtered.len();
            let offset = p.offset.unwrap_or(0);
            let limit = p.limit.unwrap_or(50).max(1);

            let paginated: Vec<ActivityEntry> =
                filtered.into_iter().skip(offset).take(limit).collect();
            let has_more = offset + paginated.len() < total;

            Ok(JournalQueryResponse {
                entries: paginated,
                total,
                has_more,
            })
        } else {
            filtered.sort_by(|a, b| b.sequence.cmp(&a.sequence));
            let total = filtered.len();
            let paginated: Vec<ActivityEntry> = filtered.into_iter().take(50).collect();
            let has_more = paginated.len() < total;

            Ok(JournalQueryResponse {
                entries: paginated,
                total,
                has_more,
            })
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn journal_clear() -> Result<ClearResult, String> {
    tokio::task::spawn_blocking(|| {
        ensure_initialized();

        let mut entries = JOURNAL_ENTRIES.lock().unwrap();
        let mut last_hash = LAST_HASH.lock().unwrap();
        let mut current_seq = CURRENT_SEQUENCE.lock().unwrap();

        let count = entries.len();
        entries.clear();
        *last_hash = None;
        *current_seq = 0;

        let path = get_storage_path();
        let _ = fs::write(&path, "");

        Ok(ClearResult {
            success: true,
            cleared_count: count,
            error: None,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn journal_verify_chain() -> Result<AuditVerificationResult, String> {
    tokio::task::spawn_blocking(|| {
        ensure_initialized();
        let mut entries = {
            let guard = JOURNAL_ENTRIES.lock().unwrap();
            guard.clone()
        };
        entries.sort_by_key(|e| e.sequence);
        Ok(verify_audit_chain(&entries))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn journal_export(
    format: String,
    filter: Option<JournalQueryParams>,
) -> Result<JournalExportResult, String> {
    tokio::task::spawn_blocking(move || {
        ensure_initialized();

        let mut entries = {
            let guard = JOURNAL_ENTRIES.lock().unwrap();
            guard.clone()
        };
        entries.sort_by_key(|e| e.sequence);

        if let Some(p) = filter {
            if let Some(ref tid) = p.tool_id {
                entries.retain(|e| &e.tool_id == tid);
            }
            if let Some(ref cat) = p.category {
                entries.retain(|e| &e.category == cat);
            }
            if let Some(ref stat) = p.status {
                entries.retain(|e| &e.status == stat);
            }
            if let Some(start) = p.start_date {
                entries.retain(|e| e.timestamp >= start);
            }
            if let Some(end) = p.end_date {
                entries.retain(|e| e.timestamp <= end);
            }
        }

        let now_ms = current_timestamp_ms();

        if format == "json" {
            let content = serde_json::to_string_pretty(&entries).unwrap_or_default();
            Ok(JournalExportResult {
                success: true,
                content,
                filename: format!("activity_audit_journal_{}.json", now_ms),
                mime_type: "application/json".to_string(),
                error: None,
            })
        } else {
            // CSV formatting
            let headers = [
                "\"id\"",
                "\"sequence\"",
                "\"timestamp\"",
                "\"toolId\"",
                "\"action\"",
                "\"category\"",
                "\"status\"",
                "\"details\"",
                "\"durationMs\"",
                "\"prevHash\"",
                "\"hash\"",
            ];

            let escape_csv = |val: &str| -> String {
                format!("\"{}\"", val.replace('"', "\"\""))
            };

            let mut lines = vec![headers.join(",")];
            for e in entries {
                let row = [
                    escape_csv(&e.id),
                    e.sequence.to_string(),
                    e.timestamp.to_string(),
                    escape_csv(&e.tool_id),
                    escape_csv(&e.action),
                    escape_csv(&e.category),
                    escape_csv(&e.status),
                    escape_csv(&e.details),
                    (e.duration_ms.unwrap_or(0)).to_string(),
                    escape_csv(&e.prev_hash),
                    escape_csv(&e.hash),
                ];
                lines.push(row.join(","));
            }

            Ok(JournalExportResult {
                success: true,
                content: lines.join("\n"),
                filename: format!("activity_audit_journal_{}.csv", now_ms),
                mime_type: "text/csv".to_string(),
                error: None,
            })
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn journal_get_stats() -> Result<JournalStatsResult, String> {
    tokio::task::spawn_blocking(|| {
        ensure_initialized();
        let entries = {
            let guard = JOURNAL_ENTRIES.lock().unwrap();
            guard.clone()
        };

        let mut entries_by_status = HashMap::new();
        entries_by_status.insert("success".to_string(), 0);
        entries_by_status.insert("failure".to_string(), 0);
        entries_by_status.insert("warning".to_string(), 0);
        entries_by_status.insert("info".to_string(), 0);

        let mut entries_by_category = HashMap::new();
        entries_by_category.insert("security".to_string(), 0);
        entries_by_category.insert("network".to_string(), 0);
        entries_by_category.insert("system".to_string(), 0);
        entries_by_category.insert("file".to_string(), 0);
        entries_by_category.insert("crypto".to_string(), 0);
        entries_by_category.insert("api".to_string(), 0);
        entries_by_category.insert("general".to_string(), 0);

        let mut oldest_timestamp: Option<i64> = None;
        let mut newest_timestamp: Option<i64> = None;

        for e in &entries {
            *entries_by_status.entry(e.status.clone()).or_insert(0) += 1;
            *entries_by_category.entry(e.category.clone()).or_insert(0) += 1;

            if oldest_timestamp.is_none() || Some(e.timestamp) < oldest_timestamp {
                oldest_timestamp = Some(e.timestamp);
            }
            if newest_timestamp.is_none() || Some(e.timestamp) > newest_timestamp {
                newest_timestamp = Some(e.timestamp);
            }
        }

        let mut sorted = entries.clone();
        sorted.sort_by_key(|e| e.sequence);
        let verification = verify_audit_chain(&sorted);

        Ok(JournalStatsResult {
            total_entries: entries.len(),
            entries_by_status,
            entries_by_category,
            oldest_timestamp,
            newest_timestamp,
            chain_valid: verification.valid,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
