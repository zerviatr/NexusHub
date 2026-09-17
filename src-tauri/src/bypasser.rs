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

const AD_SHORTENER_DOMAINS: &[&str] = &[
    "aylink.co",
    "cpmlink.pro",
    "cpmlink.net",
    "ay.live",
    "aylink.net",
    "aylink.link",
    "trlink.in",
    "tr.link",
    "bc.vc",
    "bcvc.live",
    "linkvertise.com",
    "linkvertise.net",
    "adfly.com",
    "adf.ly",
    "tinyurl.com",
    "bit.ly",
    "cutt.ly",
    "is.gd",
    "v.gd",
    "shorturl.at",
    "t.ly",
    "rebrand.ly",
    "shorte.st",
    "ouo.io",
    "ouo.press",
    "bildirim.link",
    "bildirim.online",
];

const AD_AND_TRACKING_DOMAINS: &[&str] = &[
    "popcent.",
    "ppcnt.",
    "pushance.",
    "bildirim.online",
    "google.",
    "googleapis.",
    "gstatic.",
    "facebook.",
    "yandex-metrica",
    "cloudflare",
    "jsdelivr",
    "cdnjs",
    "firebase",
    "doubleclick",
    "loremflickr.",
    "googletagmanager",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemovedTrackerInfo {
    pub name: String,
    pub category: String,
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

pub fn is_ad_or_tracking_domain(url_str: &str) -> bool {
    let lower = url_str.to_ascii_lowercase();
    AD_AND_TRACKING_DOMAINS.iter().any(|&p| lower.contains(p))
}

pub fn get_tracker_metadata(key: &str) -> Option<(&'static str, &'static str)> {
    let lower = key.to_ascii_lowercase();
    match lower.as_str() {
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
        "_ga" => Some(("analytics", "Google Analytics Client ID")),
        "_gl" => Some(("analytics", "Google Analytics Linker")),
        "ym_debug" => Some(("analytics", "Yandex Metrica Debug Flag")),
        "_openstat" => Some(("analytics", "Yandex OpenStat Analytics Tag")),
        "ref" => Some(("analytics", "Referral Tag")),
        "ref_src" => Some(("analytics", "Referral Source Platform")),
        "ref_url" => Some(("analytics", "Referral Origin URL")),
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

pub fn unwrap_embedded_url(raw_url: &str) -> Option<String> {
    let normalized = normalize_scheme(raw_url);
    let parsed = Url::parse(&normalized).ok()?;
    
    let redirect_keys = [
        "url", "q", "u", "target", "dest", "destination", "redirect",
        "redirect_url", "link", "to", "goto", "r", "out"
    ];

    for (k, v) in parsed.query_pairs() {
        let k_lower = k.to_ascii_lowercase();
        if redirect_keys.contains(&k_lower.as_str()) {
            let val = v.trim();
            if val.starts_with("http://") || val.starts_with("https://") {
                if !is_ad_or_tracking_domain(val) {
                    return Some(val.to_string());
                }
            }
            if val.len() >= 16 && (val.starts_with("aHR0c") || val.starts_with("aHR0cHM")) {
                if let Ok(decoded_bytes) = data_encoding::BASE64.decode(val.as_bytes()) {
                    if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                        if decoded_str.starts_with("http://") || decoded_str.starts_with("https://") {
                            if !is_ad_or_tracking_domain(&decoded_str) {
                                return Some(decoded_str);
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

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

pub fn extract_flexible_token(html: &str, var_name: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let patterns = [
        format!("{var_name} ="),
        format!("{var_name}="),
        format!("\"{var_name}\":"),
        format!("'{var_name}':"),
        format!("{var_name}:"),
        format!("app[\"{var_name}\"] ="),
        format!("app[\"{var_name}\"]="),
        format!("app['{var_name}'] ="),
        format!("app['{var_name}']="),
    ];

    for pattern in patterns {
        let mut search_idx = 0;
        while let Some(pos) = lower[search_idx..].find(&pattern) {
            let start = search_idx + pos + pattern.len();
            let lookahead: String = html[start..].chars().take(300).collect();
            let trimmed = lookahead.trim_start_matches(|c: char| {
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

pub fn extract_form_or_script_token(html: &str, field_name: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();

    let name_patterns = [
        format!("name=\"{field_name}\""),
        format!("name='{field_name}'"),
        format!("name={field_name}"),
    ];

    for np in &name_patterns {
        let mut search_idx = 0;
        while let Some(pos) = lower[search_idx..].find(np) {
            let tag_start = lower[..search_idx + pos].rfind('<').unwrap_or(search_idx + pos);
            let tag_end = lower[search_idx + pos..].find('>').map(|e| search_idx + pos + e).unwrap_or(lower.len());
            let tag_slice = &html[tag_start..tag_end];

            if let Some(val_idx) = tag_slice.to_ascii_lowercase().find("value=") {
                let remainder = &tag_slice[val_idx + 6..];
                let trimmed = remainder.trim_start_matches(|c: char| c == '\'' || c == '"' || c == ' ');
                let val = trimmed
                    .split(|c: char| c == '\'' || c == '"' || c == ' ' || c == '>' || c == '/')
                    .next()
                    .unwrap_or("")
                    .trim();
                if !val.is_empty() {
                    return Some(val.to_string());
                }
            }
            search_idx += pos + np.len();
        }
    }

    extract_flexible_token(html, field_name)
}

pub fn extract_visitor_token(html: &str) -> String {
    let lower = html.to_ascii_lowercase();

    if let Some(btn_pos) = lower.find("continuebutton") {
        let tag_start = lower[..btn_pos].rfind('<').unwrap_or(btn_pos);
        let tag_end = lower[btn_pos..].find('>').map(|e| btn_pos + e).unwrap_or(lower.len());
        let tag_slice = &html[tag_start..tag_end];

        if let Some(tok_idx) = tag_slice.to_ascii_lowercase().find("data-token=") {
            let remainder = &tag_slice[tok_idx + 11..];
            let trimmed = remainder.trim_start_matches(|c: char| c == '\'' || c == '"' || c == ' ');
            let val = trimmed
                .split(|c: char| c == '\'' || c == '"' || c == ' ' || c == '>' || c == '/')
                .next()
                .unwrap_or("")
                .trim();
            if !val.is_empty() {
                return val.to_string();
            }
        }
    }

    if let Some(idx) = lower.find("data-token=") {
        let remainder = &html[idx + 11..];
        let trimmed = remainder.trim_start_matches(|c: char| c == '\'' || c == '"' || c == ' ');
        return trimmed
            .split(|c: char| c == '\'' || c == '"' || c == ' ' || c == '>' || c == '/')
            .next()
            .unwrap_or("")
            .trim()
            .to_string();
    }

    String::new()
}

pub fn extract_page_target_url(html: &str, page_url: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let page_parsed = Url::parse(page_url).ok();
    let page_host = page_parsed.as_ref().and_then(|p| p.host_str()).map(|h| h.to_ascii_lowercase());

    let patterns = [
        "url =", "url=", "url: ", "url:",
        "target =", "target=", "target_url =", "target_url=",
        "destination =", "destination=", "destination_url =",
        "window.location.href =", "window.location.href=",
        "window.location.assign(", "window.location.replace(",
        "window.location =", "window.location=",
        "location.href =", "location.href=",
        "location.replace(",
        "go_url =", "go_url=", "link =", "link="
    ];

    for pattern in patterns {
        let mut search_offset = 0;
        while let Some(found_rel) = lower[search_offset..].find(pattern) {
            let found_abs = search_offset + found_rel + pattern.len();
            let lookahead: String = html[found_abs..].chars().take(300).collect();
            let trimmed = lookahead.trim_start_matches(|c: char| {
                c == '\'' || c == '"' || c == '(' || c == ' ' || c == '\t'
            });
            let candidate = trimmed
                .split(|c: char| {
                    c == '\'' || c == '"' || c == ')' || c == ';' || c == ',' || c == '>' || c.is_whitespace()
                })
                .next()
                .unwrap_or("")
                .trim();

            if (candidate.starts_with("http://") || candidate.starts_with("https://"))
                && !is_ad_or_tracking_domain(candidate)
                && !is_ad_shortener_url(candidate)
            {
                if let Ok(parsed) = Url::parse(candidate) {
                    if let Some(cand_host) = parsed.host_str() {
                        let cand_host_lower = cand_host.to_ascii_lowercase();
                        if page_host.as_deref() != Some(&cand_host_lower) {
                            return Some(candidate.to_string());
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

    if let Some(meta_url) = extract_meta_refresh(html) {
        if let Some(ref base_parsed) = page_parsed {
            if let Ok(joined) = base_parsed.join(&meta_url) {
                let joined_str = joined.to_string();
                if !is_ad_or_tracking_domain(&joined_str) && !is_ad_shortener_url(&joined_str) {
                    if let Some(joined_host) = joined.host_str() {
                        if page_host.as_deref() != Some(&joined_host.to_ascii_lowercase()) {
                            return Some(joined_str);
                        }
                    }
                }
            }
        }
    }

    None
}

pub async fn follow_interstitial_to_target(client: &reqwest::Client, intermediate_url: &str) -> Option<String> {
    let mut current_url = normalize_scheme(intermediate_url);

    for _hop in 0..5 {
        let resp = match client
            .get(&current_url)
            .header("User-Agent", USER_AGENT)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
            .send()
            .await
        {
            Ok(r) => r,
            Err(_) => break,
        };

        let final_page_url = resp.url().to_string();

        if !is_ad_or_tracking_domain(&final_page_url) && !is_ad_shortener_url(&final_page_url) {
            return Some(final_page_url);
        }

        let body = match resp.text().await {
            Ok(b) => b,
            Err(_) => break,
        };

        if let Some(target) = extract_page_target_url(&body, &final_page_url) {
            if !is_ad_or_tracking_domain(&target) && !is_ad_shortener_url(&target) {
                return Some(target);
            }
            current_url = target;
        } else {
            break;
        }
    }

    None
}

pub async fn resolve_redirects(start_url: &str, max_hops: usize) -> Result<String, String> {
    let mut current_url = normalize_scheme(start_url);
    let mut visited = HashSet::new();

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    for _hop in 0..max_hops {
        if visited.contains(&current_url) {
            return Ok(current_url);
        }
        visited.insert(current_url.clone());

        if let Some(unwrapped) = unwrap_embedded_url(&current_url) {
            current_url = unwrapped;
            continue;
        }

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

        if status.is_redirection() {
            if let Some(loc_val) = resp.headers().get("location").and_then(|h| h.to_str().ok()) {
                if let Ok(next_parsed) = parsed_curr.join(loc_val) {
                    current_url = next_parsed.to_string();
                    continue;
                }
            }
        }

        if status.is_success() {
            if let Ok(body) = resp.text().await {
                if let Some(target_url) = extract_page_target_url(&body, &current_url) {
                    if let Ok(next_parsed) = parsed_curr.join(&target_url) {
                        current_url = next_parsed.to_string();
                        continue;
                    }
                }

                if let Some(meta_url) = extract_meta_refresh(&body) {
                    if let Ok(next_parsed) = parsed_curr.join(&meta_url) {
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

pub async fn bypass_ad_link(url: &str) -> Result<BypassResult, String> {
    let normalized = normalize_scheme(url);

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

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

    let final_page_url = page_resp.url().clone();
    let final_page_url_str = final_page_url.to_string();
    let base_origin = format!(
        "{}://{}",
        final_page_url.scheme(),
        final_page_url.host_str().unwrap_or("")
    );

    let html = page_resp.text().await.map_err(|e| e.to_string())?;


    let var_a = extract_flexible_token(&html, "_a");
    let var_t = extract_flexible_token(&html, "_t");
    let var_d = extract_flexible_token(&html, "_d");
    let alias = extract_form_or_script_token(&html, "alias");
    let csrf = extract_form_or_script_token(&html, "csrf");
    let visitor_token = extract_visitor_token(&html);

    if let (Some(a), Some(t), Some(d), Some(al), Some(cs)) =
        (var_a, var_t, var_d, alias.clone(), csrf)
    {
        let tk_url = format!("{base_origin}/get/tk");
        let tk_body = url::form_urlencoded::Serializer::new(String::new())
            .append_pair("_a", &a)
            .append_pair("_t", &t)
            .append_pair("_d", &d)
            .finish();

        let tk_resp = client
            .post(&tk_url)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("User-Agent", USER_AGENT)
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", &final_page_url_str)
            .body(tk_body)
            .send()
            .await;

        if let Ok(tk_r) = tk_resp {
            if let Ok(tk_text) = tk_r.text().await {
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
                    let go2_url = format!("{base_origin}/links/go2");
                    let signal = r#"{"t":1741500000000,"d":12.011,"m":{"move":1354,"click":2,"scroll":0,"key":0,"touch":0,"focus":0},"f":{"webdriver":false,"headless":false,"noPlugins":false,"mobile":false}}"#;

                    let go2_body = url::form_urlencoded::Serializer::new(String::new())
                        .append_pair("alias", &al)
                        .append_pair("csrf", &cs)
                        .append_pair("tkn", &token)
                        .append_pair("visitor_token", &visitor_token)
                        .append_pair("signal", signal)
                        .finish();

                    let go2_resp = client
                        .post(&go2_url)
                        .header(
                            "Content-Type",
                            "application/x-www-form-urlencoded; charset=UTF-8",
                        )
                        .header("User-Agent", USER_AGENT)
                        .header("X-Requested-With", "XMLHttpRequest")
                        .header("Referer", &final_page_url_str)
                        .header("Sec-Fetch-Mode", "cors")
                        .header("Sec-Fetch-Site", "same-origin")
                        .header("Sec-Fetch-Dest", "empty")
                        .body(go2_body)
                        .send()
                        .await;

                    if let Ok(go2_r) = go2_resp {
                        if let Ok(go2_text) = go2_r.text().await {
                            if let Ok(result) = serde_json::from_str::<serde_json::Value>(&go2_text) {
                                if let Some(dest) = result.get("url").and_then(|u| u.as_str()) {
                                    let intermediate_url = dest.replace("\\/", "/");

                                    let resolved_target = follow_interstitial_to_target(&client, &intermediate_url)
                                        .await
                                        .unwrap_or_else(|| intermediate_url.clone());

                                    let (clean_url, trackers_removed, _) = strip_tracking_parameters(&resolved_target);

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
                }
            }
        }
    }

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

    if let Some(unwrapped) = unwrap_embedded_url(&normalized) {
        let (clean_url, trackers_removed, _) = strip_tracking_parameters(&unwrapped);
        return Ok(BypassResult {
            success: true,
            url: Some(clean_url.clone()),
            intermediate_url: Some(unwrapped),
            alias: None,
            status: Some("success".to_string()),
            trackers_removed: Some(trackers_removed),
            error: None,
        });
    }

    if is_ad_shortener_url(&normalized) {
        match bypass_ad_link(&normalized).await {
            Ok(res) if res.success && res.url.is_some() => return Ok(res),
            _ => { }
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

    if let Some(unwrapped) = unwrap_embedded_url(&normalized) {
        let (clean_url, trackers_removed, removed_list) = strip_tracking_parameters(&unwrapped);
        return Ok(DecryptResult {
            success: true,
            original_url: Some(trimmed.to_string()),
            final_url: Some(unwrapped),
            clean_url: Some(clean_url),
            trackers_removed: Some(trackers_removed),
            removed_list: Some(removed_list),
            error: None,
        });
    }

    let resolved_url = if is_ad_shortener_url(&normalized) {
        match bypass_ad_link(&normalized).await {
            Ok(res) if res.success && res.url.is_some() => res.url.unwrap(),
            _ => resolve_redirects(&normalized, MAX_REDIRECT_HOPS)
                .await
                .unwrap_or_else(|_| normalized.clone()),
        }
    } else {
        resolve_redirects(&normalized, MAX_REDIRECT_HOPS)
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
                let res = decrypter_clean(trimmed).await.unwrap_or_else(|err| DecryptResult {
                    success: false,
                    original_url: Some(raw_url),
                    final_url: None,
                    clean_url: None,
                    trackers_removed: None,
                    removed_list: None,
                    error: Some(err),
                });
                (idx, res)
            }
        });
    }

    while let Some(res) = join_set.join_next().await {
        if let Ok((idx, dec_res)) = res {
            results[idx] = Some(dec_res);
        }
    }

    results.into_iter().map(|r| r.unwrap()).collect()
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
    fn test_unwrap_embedded_url() {
        assert_eq!(
            unwrap_embedded_url("https://www.google.com/url?q=https://destination.com/page&sa=D"),
            Some("https://destination.com/page".to_string())
        );
        assert_eq!(
            unwrap_embedded_url("https://l.facebook.com/l.php?u=https%3A%2F%2Ftarget.org%2Farticle"),
            Some("https://target.org/article".to_string())
        );
    }

    #[test]
    fn test_extract_page_target_url() {
        let sample_html = r#"
        <script type="text/javascript">
            let 
                url = 'https://disk.yandex.com.tr/d/gYID7zarA9M5BQ',
                ref_id = '523768',
                category_id = '1',
                pushed = false,
                ppad = 'https://popcent.org/go.php?id=12&token=xyz';
        </script>
        "#;

        let target = extract_page_target_url(sample_html, "https://bildirim.link/ph/xyz");
        assert_eq!(
            target,
            Some("https://disk.yandex.com.tr/d/gYID7zarA9M5BQ".to_string())
        );
    }

    #[test]
    fn test_extract_form_or_script_token() {
        let html_form = r#"
        <form method="POST" id="go-link" action="https://aylink.co/links/go2">
            <input type="hidden" name="alias" value="G00114"/>
            <input type="hidden" name="csrf" value="dc3e49eb6c4e6b6161c2556073221a4a"/>
        </form>
        "#;

        assert_eq!(
            extract_form_or_script_token(html_form, "alias"),
            Some("G00114".to_string())
        );
        assert_eq!(
            extract_form_or_script_token(html_form, "csrf"),
            Some("dc3e49eb6c4e6b6161c2556073221a4a".to_string())
        );
    }

    #[test]
    fn test_meta_refresh_utf8_boundary_safety() {
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

    #[tokio::test]
    async fn test_live_aylink_bypass() {
        let res = bypass_ad_link("https://ay.live/G00114").await;
        println!("Live bypass result: {:?}", res);
        assert!(res.is_ok(), "Bypass should succeed");
        let bypass_val = res.unwrap();
        assert!(bypass_val.success, "BypassResult success should be true");
        let final_url = bypass_val.url.expect("Should have final url");
        println!("Final bypassed target URL: {}", final_url);
        assert!(
            final_url.contains("disk.yandex.com.tr"),
            "Final URL should be the real destination on Yandex Disk, got: {}",
            final_url
        );
    }

    #[tokio::test]
    async fn test_live_decrypter_clean() {
        let res = decrypter_clean("https://ay.live/G00114".to_string()).await;
        println!("Live decrypter_clean result: {:?}", res);
        assert!(res.is_ok(), "Decrypter clean should succeed");
        let dec_val = res.unwrap();
        assert!(dec_val.success, "DecryptResult success should be true");
        let clean_url = dec_val.clean_url.expect("Should have clean url");
        println!("Clean target URL: {}", clean_url);
        assert!(
            clean_url.contains("disk.yandex.com.tr"),
            "Clean URL must point to real destination (Yandex Disk), got: {}",
            clean_url
        );
    }
}

