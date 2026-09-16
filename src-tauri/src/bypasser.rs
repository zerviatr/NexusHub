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

use std::collections::HashSet;
use serde::{Deserialize, Serialize};
use url::Url;

pub const MAX_REDIRECT_HOPS: usize = 15;

const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemovedTrackerInfo {
    pub name: String,
    pub category: String, // "analytics" | "social" | "ads" | "campaign" | "other"
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BypassResult {
    pub success: bool,
    pub url: Option<String>,
    #[serde(rename = "intermediateUrl")]
    pub intermediate_url: Option<String>,
    pub alias: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "trackersRemoved")]
    pub trackers_removed: Option<usize>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptResult {
    pub success: bool,
    #[serde(rename = "originalUrl")]
    pub original_url: Option<String>,
    #[serde(rename = "finalUrl")]
    pub final_url: Option<String>,
    #[serde(rename = "cleanUrl")]
    pub clean_url: Option<String>,
    #[serde(rename = "trackersRemoved")]
    pub trackers_removed: Option<usize>,
    #[serde(rename = "removedList")]
    pub removed_list: Option<Vec<RemovedTrackerInfo>>,
    pub error: Option<String>,
}

pub fn get_tracker_metadata(key: &str) -> Option<(&'static str, &'static str)> {
    let lower = key.to_lowercase();
    match lower.as_str() {
        "gclid" => Some(("ads", "Google Click Identifier")),
        "gclsrc" => Some(("ads", "Google Click Source")),
        "wbraid" => Some(("ads", "Google Ads Web Conversion")),
        "gbraid" => Some(("ads", "Google Ads App Conversion")),
        "_ga" => Some(("analytics", "Google Analytics Client ID")),
        "_gl" => Some(("analytics", "Google Analytics Linker")),
        "dclid" => Some(("ads", "DoubleClick Click Identifier")),
        "fbclid" => Some(("social", "Meta Facebook Click ID")),
        "igshid" => Some(("social", "Instagram Share ID")),
        "ttclid" => Some(("social", "TikTok Click ID")),
        "twclid" => Some(("social", "Twitter Click ID")),
        "msclkid" => Some(("ads", "Microsoft Bing Click ID")),
        "mc_cid" => Some(("campaign", "Mailchimp Campaign ID")),
        "mc_eid" => Some(("campaign", "Mailchimp Email ID")),
        "_ke" => Some(("campaign", "Klaviyo Email Tracking")),
        "ref" => Some(("analytics", "Referral Tag")),
        "ref_src" => Some(("analytics", "Referral Source Platform")),
        "ref_url" => Some(("analytics", "Referral Origin URL")),
        _ if lower.starts_with("utm_") => Some(("campaign", "Google Analytics UTM Tag")),
        _ => None,
    }
}

/// Strips tracking parameters from a URL while strictly preserving other query parameters and anchors.
pub fn strip_tracking_parameters(raw_url: &str) -> (String, usize, Vec<RemovedTrackerInfo>) {
    let parsed = match Url::parse(raw_url) {
        Ok(u) => u,
        Err(_) => return (raw_url.to_string(), 0, Vec::new()),
    };

    let mut removed_list = Vec::new();
    let mut kept_pairs: Vec<(String, String)> = Vec::new();

    for (k, v) in parsed.query_pairs() {
        if let Some((cat, desc)) = get_tracker_metadata(&k) {
            removed_list.push(RemovedTrackerInfo {
                name: k.to_string(),
                category: cat.to_string(),
                description: desc.to_string(),
            });
        } else {
            kept_pairs.push((k.to_string(), v.to_string()));
        }
    }

    let trackers_removed = removed_list.len();

    let mut clean_url = parsed.clone();
    clean_url.set_query(None);
    if !kept_pairs.is_empty() {
        let mut serializer = clean_url.query_pairs_mut();
        for (k, v) in &kept_pairs {
            serializer.append_pair(k, v);
        }
    }

    (clean_url.to_string(), trackers_removed, removed_list)
}

/// Follows redirects up to MAX_REDIRECT_HOPS (15) hops.
pub async fn resolve_redirects(start_url: &str, max_hops: usize) -> Result<String, String> {
    let mut current_url = start_url.to_string();
    let mut visited = HashSet::new();

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    for _hop in 0..max_hops {
        if visited.contains(&current_url) {
            // Loop detected, return current URL safely
            return Ok(current_url);
        }
        visited.insert(current_url.clone());

        let parsed_curr = match Url::parse(&current_url) {
            Ok(u) => u,
            Err(_) => return Ok(current_url),
        };

        let resp = match client
            .get(&current_url)
            .header("User-Agent", USER_AGENT)
            .send()
            .await
        {
            Ok(r) => r,
            Err(_) => return Ok(current_url),
        };

        let status = resp.status();

        // 1. HTTP 3xx redirect
        if status.is_redirection() {
            if let Some(loc_val) = resp.headers().get("location").and_then(|h| h.to_str().ok()) {
                if let Ok(next_parsed) = parsed_curr.join(loc_val) {
                    current_url = next_parsed.to_string();
                    continue;
                }
            }
        }

        // 2. HTTP 200 OK — scan HTML for meta refresh or JS redirect
        if status.is_success() {
            if let Ok(body) = resp.text().await {
                // Meta refresh pattern: <meta http-equiv="refresh" content="0; url=http://...">
                let lower_body = body.to_lowercase();
                if let Some(meta_idx) = lower_body.find("http-equiv=\"refresh\"") {
                    let slice = &body[meta_idx..body.len().min(meta_idx + 250)];
                    if let Some(url_pos) = slice.to_lowercase().find("url=") {
                        let candidate = &slice[url_pos + 4..];
                        let clean_candidate = candidate
                            .trim_start_matches(|c| c == '\'' || c == '"' || c == ' ')
                            .split(|c| c == '\'' || c == '"' || c == '>' || c == ' ' || c == '\n')
                            .next()
                            .unwrap_or("");
                        if !clean_candidate.is_empty() {
                            if let Ok(next_parsed) = parsed_curr.join(clean_candidate) {
                                current_url = next_parsed.to_string();
                                continue;
                            }
                        }
                    }
                }
            }
        }

        // No more redirects
        break;
    }

    Ok(current_url)
}

#[tauri::command]
pub async fn bypass_link(url: String) -> Result<BypassResult, String> {
    if url.trim().is_empty() {
        return Ok(BypassResult {
            success: false,
            url: None,
            intermediate_url: None,
            alias: None,
            status: None,
            trackers_removed: None,
            error: Some("URL cannot be empty".to_string()),
        });
    }

    let intermediate = match resolve_redirects(&url, MAX_REDIRECT_HOPS).await {
        Ok(u) => u,
        Err(e) => {
            return Ok(BypassResult {
                success: false,
                url: None,
                intermediate_url: None,
                alias: None,
                status: None,
                trackers_removed: None,
                error: Some(e),
            });
        }
    };

    let (clean_url, trackers_removed, _) = strip_tracking_parameters(&intermediate);

    Ok(BypassResult {
        success: true,
        url: Some(clean_url.clone()),
        intermediate_url: if intermediate != clean_url {
            Some(intermediate)
        } else {
            None
        },
        alias: None,
        status: Some("success".to_string()),
        trackers_removed: Some(trackers_removed),
        error: None,
    })
}

#[tauri::command]
pub async fn decrypter_clean(url: String) -> Result<DecryptResult, String> {
    if url.trim().is_empty() {
        return Ok(DecryptResult {
            success: false,
            original_url: Some(url),
            final_url: None,
            clean_url: None,
            trackers_removed: None,
            removed_list: None,
            error: Some("URL cannot be empty".to_string()),
        });
    }

    let final_url = resolve_redirects(&url, 10).await.unwrap_or_else(|_| url.clone());
    let (clean_url, trackers_removed, removed_list) = strip_tracking_parameters(&final_url);

    Ok(DecryptResult {
        success: true,
        original_url: Some(url),
        final_url: Some(final_url),
        clean_url: Some(clean_url),
        trackers_removed: Some(trackers_removed),
        removed_list: Some(removed_list),
        error: None,
    })
}

#[tauri::command]
pub async fn decrypter_clean_batch(urls: Vec<String>) -> Vec<DecryptResult> {
    let mut results = Vec::new();
    for u in urls {
        if u.trim().is_empty() {
            continue;
        }
        if let Ok(res) = decrypter_clean(u).await {
            results.push(res);
        }
    }
    results
}
