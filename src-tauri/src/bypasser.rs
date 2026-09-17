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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

const AD_SHORTENER_DOMAINS: &[&str] = &[
    "aylink.co",
    "cpmlink.pro",
    "ay.live",
    "aylink.net",
    "aylink.link",
];

const SKIP_DOMAINS: &[&str] = &[
    "bildirim.online",
    "ppcnt.us",
    "ppcnt.net",
    "pushance.com",
];

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

/// Normalizes a scheme-less URL (e.g. "bit.ly/xyz") by prefixing "https://".
pub fn normalize_scheme(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let lower = trimmed.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

/// Returns true if the URL belongs to a known ad shortener service (Aylink, CPMlink, etc.).
pub fn is_ad_shortener_url(raw_url: &str) -> bool {
    let normalized = normalize_scheme(raw_url);
    if let Ok(parsed) = Url::parse(&normalized) {
        if let Some(host) = parsed.host_str() {
            let host_lower = host.to_ascii_lowercase();
            return AD_SHORTENER_DOMAINS.iter().any(|&domain| {
                host_lower == domain || host_lower.ends_with(&format!(".{}", domain))
            });
        }
    }
    false
}

/// Returns metadata for recognized tracking query parameters.
pub fn get_tracker_metadata(key: &str) -> Option<(&'static str, &'static str)> {
    let lower = key.to_ascii_lowercase();
    match lower.as_str() {
        // Ads & Affiliates
        "gclid" => Some(("ads", "Google Click Identifier")),
        "gclsrc" => Some(("ads", "Google Click Source")),
        "wbraid" => Some(("ads", "Google Ads Web Conversion")),
        "gbraid" => Some(("ads", "Google Ads App Conversion")),
        "dclid" => Some(("ads", "DoubleClick Click Identifier")),
        "msclkid" => Some(("ads", "Microsoft Bing Click ID")),
        "yclid" => Some(("ads", "Yandex Direct Click ID")),
        "pf_rd_r" | "pf_rd_m" | "pf_rd_p" | "pf_rd_s" | "pf_rd_t" | "pf_rd_i" => {
            Some(("ads", "Amazon Recommendation Tracking"))
        }

        // Social Media
        "fbclid" => Some(("social", "Meta Facebook Click ID")),
        "igshid" => Some(("social", "Instagram Share ID")),
        "ttclid" => Some(("social", "TikTok Click ID")),
        "twclid" => Some(("social", "Twitter Click ID")),
        "si" => Some(("social", "YouTube Share Tracking ID")),
        "s" => Some(("social", "Twitter / X Post Share Parameter")),
        "t" => Some(("social", "Twitter / X Timestamp Token")),
        "rdt_cid" => Some(("social", "Reddit Click Identifier")),
        "li_fat_id" => Some(("social", "LinkedIn Insight Tag ID")),
        "epik" => Some(("social", "Pinterest Tag Conversion ID")),

        // Analytics
        "_ga" => Some(("analytics", "Google Analytics Client ID")),
        "_gl" => Some(("analytics", "Google Analytics Linker")),
        "ym_debug" => Some(("analytics", "Yandex Metrica Debug Flag")),
        "_openstat" => Some(("analytics", "Yandex OpenStat Analytics Tag")),
        "ref" => Some(("analytics", "Referral Tag")),
        "ref_src" => Some(("analytics", "Referral Source Platform")),
        "ref_url" => Some(("analytics", "Referral Origin URL")),

        // Campaign & Email
        "mc_cid" => Some(("campaign", "Mailchimp Campaign ID")),
        "mc_eid" => Some(("campaign", "Mailchimp Email ID")),
        "_ke" => Some(("campaign", "Klaviyo Email Tracking")),
        "_hsenc" => Some(("campaign", "HubSpot Email Tracking Token")),
        "_hsmi" => Some(("campaign", "HubSpot Email Message ID")),
        "hsctatracking" => Some(("campaign", "HubSpot CTA Tracking")),
        "ml_subscriber" => Some(("campaign", "MailerLite Subscriber ID")),
        "ml_subscriber_hash" => Some(("campaign", "MailerLite Subscriber Hash")),
        "mkt_tok" => Some(("campaign", "Marketo Tracking Token")),

        _ if lower.starts_with("utm_") => Some(("campaign", "Google Analytics UTM Tag")),
        _ => None,
    }
}

/// Strips tracking parameters from a URL while strictly preserving legitimate query parameters, hashes, and encoding.
pub fn strip_tracking_parameters(raw_url: &str) -> (String, usize, Vec<RemovedTrackerInfo>) {
    let normalized = normalize_scheme(raw_url);
    let parsed = match Url::parse(&normalized) {
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

/// UTF-8 safe meta-refresh tag extractor.
/// Handles any quote style ('"', '\'', unquoted), inverted attribute orders,
/// case insensitivity, and will NEVER panic on multi-byte UTF-8 character boundaries.
pub fn extract_meta_refresh(html: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let mut search_idx = 0;

    while let Some(rel_meta) = lower[search_idx..].find("<meta") {
        let abs_meta = search_idx + rel_meta;
        let tag_end_rel = match lower[abs_meta..].find('>') {
            Some(pos) => pos,
            None => lower.len() - abs_meta,
        };
        let tag_lower = &lower[abs_meta..abs_meta + tag_end_rel];

        // Check if tag specifies http-equiv="refresh"
        let is_refresh = tag_lower.contains("http-equiv") && tag_lower.contains("refresh");

        if is_refresh {
            if let Some(url_kw_pos) = tag_lower.find("url=") {
                let after_url_kw = abs_meta + url_kw_pos + 4;
                let remainder = &html[after_url_kw..abs_meta + tag_end_rel];
                let trimmed = remainder.trim_start_matches(|c: char| {
                    c == '\'' || c == '"' || c == ' ' || c == '\t'
                });
                let candidate = trimmed
                    .split(|c: char| {
                        c == '\'' || c == '"' || c == ';' || c == '>' || c.is_whitespace()
                    })
                    .next()
                    .unwrap_or("")
                    .trim();

                if !candidate.is_empty() {
                    return Some(candidate.to_string());
                }
            }
        }

        search_idx = abs_meta + tag_end_rel.max(5);
        if search_idx >= lower.len() {
            break;
        }
    }
    None
}

/// Scans HTML body for JavaScript redirects (window.location, location.replace, destination variables, continue links).
pub fn extract_js_redirect(html: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();

    let patterns = [
        "window.location.href",
        "window.location.assign",
        "window.location.replace",
        "window.location",
        "location.href",
        "location.replace",
        "document.location.href",
        "document.location",
        "top.location.href",
        "destination",
        "redirect_url",
        "target_url",
        "go_url",
        "dest",
        "data-url",
    ];

    for pattern in patterns {
        let mut search_offset = 0;
        while let Some(found_rel) = lower[search_offset..].find(pattern) {
            let found_abs = search_offset + found_rel + pattern.len();
            let lookahead_chars: String = html[found_abs..].chars().take(250).collect();

            if let Some(delim_pos) = lookahead_chars.find(|c: char| c == '=' || c == '(' || c == ':') {
                let candidate_slice = &lookahead_chars[delim_pos + 1..];
                let trimmed = candidate_slice.trim_start_matches(|c: char| {
                    c == '\'' || c == '"' || c == ' ' || c == '(' || c == '\t'
                });
                let candidate = trimmed
                    .split(|c: char| {
                        c == '\'' || c == '"' || c == ')' || c == ';' || c == ',' || c == '>' || c.is_whitespace()
                    })
                    .next()
                    .unwrap_or("")
                    .trim();

                if candidate.starts_with("http://") || candidate.starts_with("https://") {
                    if let Ok(parsed) = Url::parse(candidate) {
                        if let Some(host) = parsed.host_str() {
                            let host_lower = host.to_ascii_lowercase();
                            let is_skip = SKIP_DOMAINS
                                .iter()
                                .any(|&d| host_lower == d || host_lower.ends_with(&format!(".{}", d)));
                            if !is_skip {
                                return Some(candidate.to_string());
                            }
                        }
                    }
                }
            }

            search_offset = found_abs;
            if search_offset >= html.len() {
                break;
            }
        }
    }

    // Interstitial continue link: <a ... href="https://...">...Devam / Continue / Go...</a>
    let mut a_offset = 0;
    while let Some(rel_a) = lower[a_offset..].find("<a") {
        let abs_a = a_offset + rel_a;
        let tag_chars: String = html[abs_a..].chars().take(500).collect();
        let tag_lower = tag_chars.to_ascii_lowercase();

        let has_action_text = tag_lower.contains("devam")
            || tag_lower.contains("continue")
            || tag_lower.contains("go to")
            || tag_lower.contains("redirect")
            || tag_lower.contains("click here")
            || tag_lower.contains("tıkla")
            || tag_lower.contains("git");

        if has_action_text {
            if let Some(href_idx) = tag_lower.find("href=") {
                let remainder = &tag_chars[href_idx + 5..];
                let trimmed = remainder.trim_start_matches(|c: char| c == '\'' || c == '"' || c == ' ');
                let link = trimmed
                    .split(|c: char| c == '\'' || c == '"' || c == '>' || c.is_whitespace())
                    .next()
                    .unwrap_or("")
                    .trim();
                if link.starts_with("http://") || link.starts_with("https://") {
                    return Some(link.to_string());
                }
            }
        }

        a_offset = abs_a + 2;
        if a_offset >= lower.len() {
            break;
        }
    }

    None
}

/// Follows redirects up to MAX_REDIRECT_HOPS (15) hops.
/// Handles HTTP 3xx, meta refresh tags, and JavaScript redirects safely.
pub async fn resolve_redirects(start_url: &str, max_hops: usize) -> Result<String, String> {
    let mut current_url = normalize_scheme(start_url);
    let mut visited = HashSet::new();

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    for _hop in 0..max_hops {
        if visited.contains(&current_url) {
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
            .header(
                "Accept",
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            )
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
                // a) Meta-refresh
                if let Some(meta_url) = extract_meta_refresh(&body) {
                    if let Ok(next_parsed) = parsed_curr.join(&meta_url) {
                        current_url = next_parsed.to_string();
                        continue;
                    }
                }

                // b) JavaScript redirect
                if let Some(js_url) = extract_js_redirect(&body) {
                    if let Ok(next_parsed) = parsed_curr.join(&js_url) {
                        current_url = next_parsed.to_string();
                        continue;
                    }
                }
            }
        }

        break;
    }

    Ok(current_url)
}

/// Extracts a JavaScript token variable from HTML script tags.
fn extract_script_token(html: &str, var_name: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let patterns = [
        format!("{var_name}="),
        format!("{var_name} ="),
        format!("\"{var_name}\":"),
        format!("'{var_name}':"),
        format!("app[\"{var_name}\"]="),
        format!("app['{var_name}']="),
    ];

    for pattern in patterns {
        let mut search_idx = 0;
        while let Some(pos) = lower[search_idx..].find(&pattern) {
            let start = search_idx + pos + pattern.len();
            let lookahead_chars: String = html[start..].chars().take(250).collect();
            let trimmed = lookahead_chars.trim_start_matches(|c: char| {
                c == '\'' || c == '"' || c == ' ' || c == '\t'
            });
            let val = trimmed
                .split(|c: char| {
                    c == '\'' || c == '"' || c == ';' || c == ',' || c == '}' || c == '&' || c.is_whitespace()
                })
                .next()
                .unwrap_or("")
                .trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
            search_idx = start;
        }
    }
    None
}

/// Executes the multi-step bypass handshake for ad shorteners (Aylink, CPMlink, etc.).
pub async fn bypass_ad_link(url: &str) -> Result<BypassResult, String> {
    let normalized = normalize_scheme(url);
    let parsed_url = Url::parse(&normalized).map_err(|e| e.to_string())?;
    let base_origin = format!(
        "{}://{}",
        parsed_url.scheme(),
        parsed_url.host_str().unwrap_or("")
    );

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    // Step 1: Fetch the initial shortener page
    let page_resp = client
        .get(&normalized)
        .header("User-Agent", USER_AGENT)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    // Collect cookies from Set-Cookie headers
    let cookies: String = page_resp
        .headers()
        .get_all("set-cookie")
        .iter()
        .filter_map(|h| h.to_str().ok())
        .map(|c| c.split(';').next().unwrap_or("").trim())
        .filter(|c| !c.is_empty())
        .collect::<Vec<_>>()
        .join("; ");

    let html = page_resp.text().await.map_err(|e| e.to_string())?;

    // Step 2: Extract _a, _t, _d, alias, csrf, and visitor_token
    let var_a = extract_script_token(&html, "_a");
    let var_t = extract_script_token(&html, "_t");
    let var_d = extract_script_token(&html, "_d");
    let alias = extract_script_token(&html, "alias");
    let csrf = extract_script_token(&html, "csrf");

    let visitor_token = if let Some(idx) = html.find("data-token=") {
        let remainder = &html[idx + 11..];
        let trimmed = remainder.trim_start_matches(|c| c == '\'' || c == '"');
        trimmed
            .split(|c| c == '\'' || c == '"' || c == ' ' || c == '>')
            .next()
            .unwrap_or("")
            .to_string()
    } else {
        String::new()
    };

    if let (Some(a), Some(t), Some(d), Some(al), Some(cs)) =
        (var_a, var_t, var_d, alias.clone(), csrf)
    {
        // Step 3: POST /get/tk to acquire token
        let tk_url = format!("{base_origin}/get/tk");
        let tk_body = format!("_a={}&_t={}&_d={}", a, t, d);

        let mut tk_req = client
            .post(&tk_url)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("User-Agent", USER_AGENT)
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", &normalized)
            .body(tk_body);

        if !cookies.is_empty() {
            tk_req = tk_req.header("Cookie", &cookies);
        }

        let tk_resp = tk_req.send().await.map_err(|e| e.to_string())?;
        let tk_text = tk_resp.text().await.map_err(|e| e.to_string())?;

        // Parse token (JSON { "th": "..." } or plain string)
        let token = if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&tk_text) {
            json_val
                .get("th")
                .and_then(|v| v.as_str())
                .unwrap_or(&tk_text)
                .to_string()
        } else {
            tk_text.trim().to_string()
        };

        if !token.is_empty() {
            // Step 4: POST /links/go2 to get destination URL
            let go2_url = format!("{base_origin}/links/go2");
            let signal = r#"{"t":1741500000000,"d":12.011,"m":{"move":1354,"click":2,"scroll":0,"key":0,"touch":0,"focus":0},"f":{"webdriver":false,"headless":false,"noPlugins":false,"mobile":false}}"#;

            let encoded_signal: String =
                url::form_urlencoded::byte_serialize(signal.as_bytes()).collect();
            let encoded_visitor: String =
                url::form_urlencoded::byte_serialize(visitor_token.as_bytes()).collect();

            let go2_body = format!(
                "alias={}&csrf={}&tkn={}&visitor_token={}&signal={}",
                al, cs, token, encoded_visitor, encoded_signal
            );

            let mut go2_req = client
                .post(&go2_url)
                .header(
                    "Content-Type",
                    "application/x-www-form-urlencoded; charset=UTF-8",
                )
                .header("User-Agent", USER_AGENT)
                .header("X-Requested-With", "XMLHttpRequest")
                .header("Referer", &normalized)
                .body(go2_body);

            if !cookies.is_empty() {
                go2_req = go2_req.header("Cookie", &cookies);
            }

            let go2_resp = go2_req.send().await.map_err(|e| e.to_string())?;
            let go2_text = go2_resp.text().await.map_err(|e| e.to_string())?;

            if let Ok(result) = serde_json::from_str::<serde_json::Value>(&go2_text) {
                if let Some(dest) = result.get("url").and_then(|u| u.as_str()) {
                    let intermediate_url = dest.replace("\\/", "/");
                    let resolved = resolve_redirects(&intermediate_url, MAX_REDIRECT_HOPS)
                        .await
                        .unwrap_or_else(|_| intermediate_url.clone());
                    let (clean_url, trackers_removed, _) = strip_tracking_parameters(&resolved);

                    return Ok(BypassResult {
                        success: true,
                        url: Some(clean_url.clone()),
                        intermediate_url: if intermediate_url != clean_url {
                            Some(intermediate_url)
                        } else {
                            None
                        },
                        alias,
                        status: Some("success".to_string()),
                        trackers_removed: Some(trackers_removed),
                        error: None,
                    });
                }
            }
        }
    }

    // Fallback: If ad handshake parameters could not be retrieved, resolve redirects normally
    let resolved = resolve_redirects(&normalized, MAX_REDIRECT_HOPS).await?;
    let (clean_url, trackers_removed, _) = strip_tracking_parameters(&resolved);

    Ok(BypassResult {
        success: true,
        url: Some(clean_url.clone()),
        intermediate_url: if resolved != clean_url {
            Some(resolved)
        } else {
            None
        },
        alias: None,
        status: Some("fallback".to_string()),
        trackers_removed: Some(trackers_removed),
        error: None,
    })
}

#[tauri::command]
pub async fn bypass_link(url: String) -> Result<BypassResult, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
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

    let normalized = normalize_scheme(trimmed);

    if is_ad_shortener_url(&normalized) {
        match bypass_ad_link(&normalized).await {
            Ok(res) => return Ok(res),
            Err(_) => { /* Fallback to standard redirect resolution below */ }
        }
    }

    let intermediate = match resolve_redirects(&normalized, MAX_REDIRECT_HOPS).await {
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
    let trimmed = url.trim();
    if trimmed.is_empty() {
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

    let normalized = normalize_scheme(trimmed);

    // If URL is a known ad shortener, run bypass first
    let resolved_url = if is_ad_shortener_url(&normalized) {
        match bypass_ad_link(&normalized).await {
            Ok(res) if res.success && res.url.is_some() => res.url.unwrap(),
            _ => resolve_redirects(&normalized, 10)
                .await
                .unwrap_or_else(|_| normalized.clone()),
        }
    } else {
        resolve_redirects(&normalized, 10)
            .await
            .unwrap_or_else(|_| normalized.clone())
    };

    let (clean_url, trackers_removed, removed_list) = strip_tracking_parameters(&resolved_url);

    Ok(DecryptResult {
        success: true,
        original_url: Some(trimmed.to_string()),
        final_url: Some(resolved_url),
        clean_url: Some(clean_url),
        trackers_removed: Some(trackers_removed),
        removed_list: Some(removed_list),
        error: None,
    })
}

#[tauri::command]
pub async fn decrypter_clean_batch(urls: Vec<String>) -> Vec<DecryptResult> {
    let total = urls.len();
    if total == 0 {
        return Vec::new();
    }

    let mut results: Vec<Option<DecryptResult>> = (0..total).map(|_| None).collect();
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(5));
    let mut join_set = tokio::task::JoinSet::new();

    for (idx, raw_url) in urls.into_iter().enumerate() {
        let sem = semaphore.clone();
        join_set.spawn(async move {
            let _permit = sem.acquire().await;
            let trimmed = raw_url.trim().to_string();
            if trimmed.is_empty() {
                (
                    idx,
                    DecryptResult {
                        success: false,
                        original_url: Some(raw_url),
                        final_url: None,
                        clean_url: None,
                        trackers_removed: None,
                        removed_list: None,
                        error: Some("URL cannot be empty".to_string()),
                    },
                )
            } else {
                let res = match decrypter_clean(trimmed.clone()).await {
                    Ok(r) => r,
                    Err(err) => DecryptResult {
                        success: false,
                        original_url: Some(trimmed),
                        final_url: None,
                        clean_url: None,
                        trackers_removed: None,
                        removed_list: None,
                        error: Some(err),
                    },
                };
                (idx, res)
            }
        });
    }

    while let Some(res) = join_set.join_next().await {
        if let Ok((idx, dec_res)) = res {
            if idx < total {
                results[idx] = Some(dec_res);
            }
        }
    }

    results
        .into_iter()
        .enumerate()
        .map(|(i, r)| {
            r.unwrap_or_else(|| DecryptResult {
                success: false,
                original_url: None,
                final_url: None,
                clean_url: None,
                trackers_removed: None,
                removed_list: None,
                error: Some(format!("Failed to process item at index {}", i)),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_scheme() {
        assert_eq!(normalize_scheme("bit.ly/sample"), "https://bit.ly/sample");
        assert_eq!(normalize_scheme("https://google.com"), "https://google.com");
        assert_eq!(normalize_scheme("http://test.org/page"), "http://test.org/page");
        assert_eq!(normalize_scheme("   t.co/abc  "), "https://t.co/abc");
        assert_eq!(normalize_scheme(""), "");
    }

    #[test]
    fn test_is_ad_shortener_url() {
        assert!(is_ad_shortener_url("https://aylink.co/test1234"));
        assert!(is_ad_shortener_url("http://sub.cpmlink.pro/alias"));
        assert!(is_ad_shortener_url("ay.live/goto"));
        assert!(is_ad_shortener_url("https://aylink.net/x"));
        assert!(is_ad_shortener_url("https://aylink.link/y"));
        assert!(!is_ad_shortener_url("https://youtube.com/watch?v=123"));
        assert!(!is_ad_shortener_url("https://google.com"));
    }

    #[test]
    fn test_strip_tracking_parameters_expanded_taxonomy() {
        let test_url = "https://example.com/watch?v=dQw4w9WgXcQ&utm_source=twitter&utm_medium=social&si=youtube123&s=20&t=45&yclid=ya_click_99&_hsenc=hubspot_token&rdt_cid=reddit_ad&li_fat_id=linkedin_tag&epik=pin_tag#section";
        let (clean, count, removed) = strip_tracking_parameters(test_url);

        assert_eq!(count, 10);
        assert_eq!(clean, "https://example.com/watch?v=dQw4w9WgXcQ#section");
        assert!(removed.iter().any(|r| r.name == "si" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "s" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "t" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "yclid" && r.category == "ads"));
        assert!(removed.iter().any(|r| r.name == "_hsenc" && r.category == "campaign"));
        assert!(removed.iter().any(|r| r.name == "rdt_cid" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "li_fat_id" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "epik" && r.category == "social"));
        assert!(removed.iter().any(|r| r.name == "utm_source"));
    }

    #[test]
    fn test_strip_tracking_parameters_without_scheme() {
        let (clean, count, _) = strip_tracking_parameters("youtube.com/watch?v=test&si=track123");
        assert_eq!(count, 1);
        assert_eq!(clean, "https://youtube.com/watch?v=test");
    }

    #[test]
    fn test_meta_refresh_utf8_boundary_safety() {
        // Embed multi-byte Turkish and emoji characters around the 250-byte mark
        let html_with_multibyte = r#"<!DOCTYPE html>
<html>
<head>
<title>Türkçe Başlık ğüşiöç 🚀🎉 — Çok dilli içerik testi</title>
<meta name="description" content="Genişletilmiş karakter kümesi: Şeker, Çağlayan, Ördek, Iğdır, Üzüm 🌟">
<meta http-equiv="refresh" content="0; url=https://safe-destination.com/target?param=ok">
<meta name="keywords" content="güvenlik, mahremiyet, şifreleme, izleyici temizliği">
</head>
<body><h1>Yönlendiriliyorsunuz...</h1></body>
</html>"#;

        let extracted = extract_meta_refresh(html_with_multibyte);
        assert_eq!(
            extracted,
            Some("https://safe-destination.com/target?param=ok".to_string())
        );
    }

    #[test]
    fn test_meta_refresh_quote_and_attribute_order_variations() {
        // Inverted attribute order + single quotes
        let inverted = r#"<meta content='0; url=https://example.org/inverted' http-equiv='refresh'>"#;
        assert_eq!(
            extract_meta_refresh(inverted),
            Some("https://example.org/inverted".to_string())
        );

        // Unquoted refresh
        let unquoted = r#"<meta http-equiv=refresh content="2;url=https://example.org/unquoted">"#;
        assert_eq!(
            extract_meta_refresh(unquoted),
            Some("https://example.org/unquoted".to_string())
        );

        // Nested quotes
        let nested = r#"<meta http-equiv="refresh" content="0; url='https://example.org/nested'">"#;
        assert_eq!(
            extract_meta_refresh(nested),
            Some("https://example.org/nested".to_string())
        );
    }

    #[test]
    fn test_extract_js_redirect() {
        let html_js = r#"<script>window.location.href = "https://target-destination.com/final";</script>"#;
        assert_eq!(
            extract_js_redirect(html_js),
            Some("https://target-destination.com/final".to_string())
        );

        let html_replace = r#"<script>location.replace('https://replace-destination.com/go');</script>"#;
        assert_eq!(
            extract_js_redirect(html_replace),
            Some("https://replace-destination.com/go".to_string())
        );

        let html_dest_var = r#"<script>let destination = "https://var-destination.com/page";</script>"#;
        assert_eq!(
            extract_js_redirect(html_dest_var),
            Some("https://var-destination.com/page".to_string())
        );

        let html_btn = r#"<div><a class="btn" href="https://continue-destination.com/next">Devam Et</a></div>"#;
        assert_eq!(
            extract_js_redirect(html_btn),
            Some("https://continue-destination.com/next".to_string())
        );
    }
}
