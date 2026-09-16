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

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use rand::Rng;
use serde::{Deserialize, Serialize};

pub const MAX_HISTORY: usize = 50;
pub const MAX_BYTES: usize = 50 * 1024; // 50 KB

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ClipboardEntry {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    pub preview: String,
}

static CLIPBOARD_HISTORY: Mutex<Vec<ClipboardEntry>> = Mutex::new(Vec::new());
static LAST_TEXT: Mutex<String> = Mutex::new(String::new());

fn current_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn generate_entry_id() -> String {
    let mut rng = rand::thread_rng();
    let rand_val: u32 = rng.gen_range(10000..99999);
    format!("clip_{}_{}", current_timestamp_ms(), rand_val)
}

fn create_preview(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() > 120 {
        let prefix: String = chars[..120].iter().collect();
        format!("{}…", prefix)
    } else {
        text.to_string()
    }
}

/// Adds text to the clipboard history ring buffer.
/// Rejects entries exceeding MAX_BYTES (50KB).
/// Enforces ring buffer ceiling of MAX_HISTORY (50 items).
pub fn add_clipboard_entry(text: &str) -> bool {
    let byte_len = text.as_bytes().len();
    if byte_len > MAX_BYTES || text.trim().is_empty() {
        return false;
    }

    let mut last = LAST_TEXT.lock().unwrap();
    if *last == text {
        return false;
    }
    *last = text.to_string();

    let entry = ClipboardEntry {
        id: generate_entry_id(),
        text: text.to_string(),
        timestamp: current_timestamp_ms(),
        preview: create_preview(text),
    };

    let mut history = CLIPBOARD_HISTORY.lock().unwrap();
    // Deduplicate: remove existing entry with same text
    history.retain(|e| e.text != text);
    // Prepend newest entry
    history.insert(0, entry);
    // Cap at MAX_HISTORY
    if history.len() > MAX_HISTORY {
        history.truncate(MAX_HISTORY);
    }

    true
}

/// Polls the OS clipboard and ingests any newly copied text.
pub fn sync_from_os_clipboard() {
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        if let Ok(text) = clipboard.get_text() {
            if text.as_bytes().len() <= MAX_BYTES && !text.trim().is_empty() {
                add_clipboard_entry(&text);
            }
        }
    }
}

pub fn get_in_memory_history() -> Vec<ClipboardEntry> {
    let history = CLIPBOARD_HISTORY.lock().unwrap();
    history.clone()
}

#[tauri::command]
pub fn clipboard_get_history() -> Vec<ClipboardEntry> {
    sync_from_os_clipboard();
    let history = CLIPBOARD_HISTORY.lock().unwrap();
    history.clone()
}

#[tauri::command]
pub fn clipboard_clear() {
    let mut history = CLIPBOARD_HISTORY.lock().unwrap();
    history.clear();
    let mut last = LAST_TEXT.lock().unwrap();
    last.clear();
}

#[tauri::command]
pub fn clipboard_delete(id: String) {
    let mut history = CLIPBOARD_HISTORY.lock().unwrap();
    history.retain(|e| e.id != id);
}

#[tauri::command]
pub fn clipboard_write(text: String) -> Result<(), String> {
    if text.as_bytes().len() > MAX_BYTES {
        return Err("Clipboard text exceeds 50KB limit".to_string());
    }

    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text.clone()).map_err(|e| e.to_string())?;

    // Update last text so we don't immediately re-ingest it on sync
    let mut last = LAST_TEXT.lock().unwrap();
    *last = text;

    Ok(())
}
