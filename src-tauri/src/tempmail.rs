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
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

const API_BASE: &str = "https://api.guerrillamail.com/ajax.php";
const MAX_SESSIONS: usize = 200;

static SESSIONS: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

fn store_session(email: &str, token: &str) {
    let mut guard = SESSIONS.lock().unwrap();
    let map = guard.get_or_insert_with(HashMap::new);

    if map.len() >= MAX_SESSIONS {
        if let Some(first_key) = map.keys().next().cloned() {
            map.remove(&first_key);
        }
    }
    map.insert(email.to_string(), token.to_string());
}

fn get_session(email: &str) -> Option<String> {
    let guard = SESSIONS.lock().unwrap();
    guard.as_ref().and_then(|m| m.get(email).cloned())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailMessage {
    pub id: String,
    pub from: String,
    pub subject: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailAttachment {
    pub filename: String,
    #[serde(rename = "contentType")]
    pub content_type: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailMessageDetails {
    pub id: String,
    pub from: String,
    pub subject: String,
    pub date: String,
    pub attachments: Vec<TempMailAttachment>,
    pub body: String,
    #[serde(rename = "textBody")]
    pub text_body: String,
    #[serde(rename = "htmlBody")]
    pub html_body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailGenerateResult {
    pub success: bool,
    pub email: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailCheckResult {
    pub success: bool,
    pub messages: Option<Vec<TempMailMessage>>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempMailReadResult {
    pub success: bool,
    pub message: Option<TempMailMessageDetails>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn tempmail_generate() -> Result<TempMailGenerateResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}?f=get_email_address", API_BASE);
    match client.get(&url).send().await {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let (Some(email), Some(sid)) = (
                    json.get("email_addr").and_then(|v| v.as_str()),
                    json.get("sid_token").and_then(|v| v.as_str()),
                ) {
                    store_session(email, sid);
                    return Ok(TempMailGenerateResult {
                        success: true,
                        email: Some(email.to_string()),
                        error: None,
                    });
                }
            }
            Ok(TempMailGenerateResult {
                success: false,
                email: None,
                error: Some("Failed to parse email from GuerrillaMail".to_string()),
            })
        }
        Err(err) => Ok(TempMailGenerateResult {
            success: false,
            email: None,
            error: Some(format!("Network error generating email: {}", err)),
        }),
    }
}

#[tauri::command]
pub async fn tempmail_check(email: String) -> Result<TempMailCheckResult, String> {
    let sid_token = match get_session(&email) {
        Some(token) => token,
        None => {
            return Ok(TempMailCheckResult {
                success: false,
                messages: None,
                error: Some("Session expired or not found".to_string()),
            });
        }
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!(
        "{}?f=get_email_list&offset=0&sid_token={}",
        API_BASE, sid_token
    );
    match client.get(&url).send().await {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let mut messages = Vec::new();
                if let Some(list) = json.get("list").and_then(|v| v.as_array()) {
                    for item in list {
                        let mail_id = item
                            .get("mail_id")
                            .map(|v| v.to_string().trim_matches('"').to_string())
                            .unwrap_or_default();
                        let mail_from = item
                            .get("mail_from")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let mail_subject = item
                            .get("mail_subject")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let mail_date = item
                            .get("mail_date")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        messages.push(TempMailMessage {
                            id: mail_id,
                            from: mail_from,
                            subject: mail_subject,
                            date: mail_date,
                        });
                    }
                }
                Ok(TempMailCheckResult {
                    success: true,
                    messages: Some(messages),
                    error: None,
                })
            } else {
                Ok(TempMailCheckResult {
                    success: false,
                    messages: None,
                    error: Some("Failed to parse inbox from GuerrillaMail".to_string()),
                })
            }
        }
        Err(err) => Ok(TempMailCheckResult {
            success: false,
            messages: None,
            error: Some(format!("Network error checking inbox: {}", err)),
        }),
    }
}

#[tauri::command]
pub async fn tempmail_read(email: String, id: String) -> Result<TempMailReadResult, String> {
    let sid_token = match get_session(&email) {
        Some(token) => token,
        None => {
            return Ok(TempMailReadResult {
                success: false,
                message: None,
                error: Some("Session expired or not found".to_string()),
            });
        }
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!(
        "{}?f=fetch_email&email_id={}&sid_token={}",
        API_BASE, id, sid_token
    );
    match client.get(&url).send().await {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let mail_id = json
                    .get("mail_id")
                    .map(|v| v.to_string().trim_matches('"').to_string())
                    .unwrap_or(id);
                let mail_from = json
                    .get("mail_from")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let mail_subject = json
                    .get("mail_subject")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let mail_date = json
                    .get("mail_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let mail_body = json
                    .get("mail_body")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let mail_excerpt = json
                    .get("mail_excerpt")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let details = TempMailMessageDetails {
                    id: mail_id,
                    from: mail_from,
                    subject: mail_subject,
                    date: mail_date,
                    attachments: Vec::new(),
                    body: mail_body.clone(),
                    text_body: mail_excerpt,
                    html_body: mail_body,
                };

                Ok(TempMailReadResult {
                    success: true,
                    message: Some(details),
                    error: None,
                })
            } else {
                Ok(TempMailReadResult {
                    success: false,
                    message: None,
                    error: Some("Failed to parse message from GuerrillaMail".to_string()),
                })
            }
        }
        Err(err) => Ok(TempMailReadResult {
            success: false,
            message: None,
            error: Some(format!("Network error reading message: {}", err)),
        }),
    }
}
