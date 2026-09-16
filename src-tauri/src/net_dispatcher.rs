/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//! Outbound Network Dispatcher and SSRF Security Guard Module
//!
//! Provides enterprise-grade network security and HTTP request dispatching:
//! 1. Outbound HTTP request dispatcher bypassing browser CORS restrictions.
//! 2. Unconditional SSRF filter rejecting cloud metadata endpoints, link-local IPs,
//!    alternative IP encodings (hex, octal, decimal), and dangerous schemes.
//! 3. Strict RFC 7230 header validation and CRLF injection defense.
//! 4. API Studio diagnostic tools: DNS lookup, TCP ping latency, and SSL check.

use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::time::{Duration, Instant};

use reqwest::header::{HeaderName, HeaderValue};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use url::Url;

// ─────────────────────────────────────────────────────────────────────────────
// SSRF & SECURITY VALIDATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const LINK_LOCAL_IPV4_PREFIX: &str = "169.254.";

/// Checks if a hostname or IP string targets known cloud metadata services.
pub fn is_cloud_metadata_host(host: &str) -> bool {
    let clean = host.trim().to_lowercase();
    let clean = clean.trim_start_matches('[').trim_end_matches(']').trim_end_matches('.');

    // Explicit known cloud metadata hosts
    let blocked_hosts = [
        "169.254.169.254",
        "metadata.google.internal",
        "metadata.goog",
        "instance-data",
        "instance-data.ec2.internal",
        "169.254.169.250",
        "169.254.169.251",
        "169.254.169.253",
        "100.100.100.200",     // Alibaba Cloud instance metadata
        "168.63.129.16",       // Azure WireServer / IMDS host communication IP
        "fd00:ec2::254",       // AWS IPv6 IMDSv2 address
        "kubernetes.default",
        "kubernetes.default.svc",
        "kubernetes.default.svc.cluster.local",
    ];

    if blocked_hosts.iter().any(|&b| clean == b) {
        return true;
    }

    if clean.ends_with(".metadata.google.internal") || clean.ends_with(".metadata.goog") {
        return true;
    }

    // IPv4 Link-Local range 169.254.0.0/16
    if clean.starts_with(LINK_LOCAL_IPV4_PREFIX) {
        return true;
    }

    // Evaluate alternative numeric representations (decimal, hex, octal)
    if let Some(canonical_ip) = normalize_numeric_ip(clean) {
        if blocked_hosts.iter().any(|&b| canonical_ip == b)
            || canonical_ip.starts_with(LINK_LOCAL_IPV4_PREFIX)
        {
            return true;
        }
    }

    // IPv6 Link-Local range fe80::/10 (fe80 through febf)
    if clean.starts_with("fe8")
        || clean.starts_with("fe9")
        || clean.starts_with("fea")
        || clean.starts_with("feb")
    {
        return true;
    }

    // IPv4-mapped IPv6 addresses for link-local (e.g. ::ffff:169.254.x.x or ::ffff:a9fe:xxxx)
    if clean.contains("::ffff:") || clean.starts_with("0:0:0:0:0:ffff:") {
        if clean.contains("169.254.") || clean.contains("a9fe:") {
            return true;
        }
    }

    false
}

/// Normalizes alternative numeric IP representations (decimal, hex, octal) to dotted-decimal IPv4.
pub fn normalize_numeric_ip(host: &str) -> Option<String> {
    let trimmed = host.trim().trim_end_matches('.');

    // Standard dotted decimal IPv4 format
    if let Ok(ip) = trimmed.parse::<Ipv4Addr>() {
        return Some(ip.to_string());
    }

    // Decimal 32-bit integer representation (e.g. 2852039166 -> 169.254.169.254)
    if trimmed.chars().all(|c| c.is_ascii_digit()) {
        if let Ok(num) = trimmed.parse::<u64>() {
            if num <= 0xffff_ffff {
                let ip = Ipv4Addr::from(num as u32);
                return Some(ip.to_string());
            }
        }
    }

    // Hex integer representation (e.g. 0xa9fea9fe or 0xA9FEA9FE -> 169.254.169.254)
    if trimmed.starts_with("0x") || trimmed.starts_with("0X") {
        if let Ok(num) = u64::from_str_radix(&trimmed[2..], 16) {
            if num <= 0xffff_ffff {
                let ip = Ipv4Addr::from(num as u32);
                return Some(ip.to_string());
            }
        }
    }

    // Dotted octal representation (e.g. 0251.0376.0251.0376 -> 169.254.169.254)
    let parts: Vec<&str> = trimmed.split('.').collect();
    if parts.len() == 4 && parts.iter().all(|p| p.starts_with('0') && p.len() > 1) {
        let mut octets = [0u8; 4];
        let mut valid = true;
        for (i, part) in parts.iter().enumerate() {
            if let Ok(val) = u32::from_str_radix(part, 8) {
                if val <= 255 {
                    octets[i] = val as u8;
                } else {
                    valid = false;
                    break;
                }
            } else {
                valid = false;
                break;
            }
        }
        if valid {
            let ip = Ipv4Addr::new(octets[0], octets[1], octets[2], octets[3]);
            return Some(ip.to_string());
        }
    }

    // Dotted hex representation (e.g. 0xa9.0xfe.0xa9.0xfe -> 169.254.169.254)
    if parts.len() == 4 && parts.iter().all(|p| p.starts_with("0x") || p.starts_with("0X")) {
        let mut octets = [0u8; 4];
        let mut valid = true;
        for (i, part) in parts.iter().enumerate() {
            if let Ok(val) = u32::from_str_radix(&part[2..], 16) {
                if val <= 255 {
                    octets[i] = val as u8;
                } else {
                    valid = false;
                    break;
                }
            } else {
                valid = false;
                break;
            }
        }
        if valid {
            let ip = Ipv4Addr::new(octets[0], octets[1], octets[2], octets[3]);
            return Some(ip.to_string());
        }
    }

    None
}

/// Checks if a host belongs to private address space (RFC 1918, loopback, or ULA).
pub fn is_private_network_host(host: &str) -> bool {
    let clean = host.trim().to_lowercase();
    let clean = clean.trim_start_matches('[').trim_end_matches(']').trim_end_matches('.');

    // Loopback hosts
    if clean == "localhost" || clean.ends_with(".localhost") || clean == "127.0.0.1" || clean == "::1" || clean == "0.0.0.0" {
        return true;
    }
    if clean.starts_with("127.") {
        return true;
    }

    // IPv6 ULA (fc00::/7)
    if clean.starts_with("fc") || clean.starts_with("fd") {
        return true;
    }

    let dotted = normalize_numeric_ip(clean).unwrap_or_else(|| clean.to_string());

    // RFC 1918 Private Ranges
    if dotted.starts_with("10.") || dotted.starts_with("192.168.") {
        return true;
    }

    if let Ok(ip) = dotted.parse::<Ipv4Addr>() {
        let octets = ip.octets();
        if octets[0] == 172 && (16..=31).contains(&octets[1]) {
            return true;
        }
    }

    false
}

/// Validates target request URL against dangerous protocols and SSRF blocklists.
pub fn validate_target_url(raw_url: &str, allow_local: bool) -> Result<Url, String> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return Err("Target URL cannot be empty.".to_string());
    }

    // Reject control characters and null bytes before URL parsing
    if trimmed.chars().any(|c| (c as u32) < 32 || c == '\x7F') {
        return Err("Target URL contains forbidden control characters or null bytes.".to_string());
    }

    // Fast-check dangerous schemes before parser
    let dangerous_schemes = [
        ("file:", "Protocol 'file:' is forbidden and rejected: Local file system access is strictly blocked for outbound dispatch."),
        ("javascript:", "Protocol 'javascript:' is dangerous and strictly prohibited: JavaScript execution is rejected."),
        ("data:", "Protocol 'data:' is forbidden and rejected: Data URIs are not permitted for network dispatch."),
        ("blob:", "Protocol 'blob:' is forbidden and rejected: Blob URIs are not permitted for network dispatch."),
        ("gopher:", "Protocol 'gopher:' is legacy and strictly prohibited: gopher protocol is rejected."),
        ("ftp:", "Protocol 'ftp:' is not supported and rejected: Outbound requests are restricted to HTTP and HTTPS."),
        ("sftp:", "Protocol 'sftp:' is not supported and rejected: Outbound requests are restricted to HTTP and HTTPS."),
        ("ws:", "Protocol 'ws:' is not supported and rejected: Use dedicated WebSocket connection for websocket schemes."),
        ("wss:", "Protocol 'wss:' is not supported and rejected: Use dedicated WebSocket connection for websocket schemes."),
        ("php:", "Protocol 'php:' is dangerous and strictly prohibited: PHP stream wrappers are rejected."),
        ("ldap:", "Protocol 'ldap:' is forbidden and rejected: LDAP protocol is prohibited for HTTP request dispatch."),
        ("ldaps:", "Protocol 'ldaps:' is forbidden and rejected: LDAPS protocol is prohibited for HTTP request dispatch."),
        ("dict:", "Protocol 'dict:' is dangerous and strictly prohibited: DICT protocol is rejected."),
        ("jar:", "Protocol 'jar:' is dangerous and strictly prohibited: JAR protocol is rejected."),
        ("view-source:", "Protocol 'view-source:' is forbidden and rejected."),
    ];

    let lower_url = trimmed.to_lowercase();
    for (scheme, msg) in &dangerous_schemes {
        if lower_url.starts_with(scheme) {
            return Err(msg.to_string());
        }
    }

    let parsed = Url::parse(trimmed)
        .map_err(|e| format!("Invalid URL format: {}. Only valid http:// and https:// URLs are permitted.", e))?;

    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(format!("Protocol '{}:' is forbidden. Outbound requests are restricted to HTTP and HTTPS.", scheme));
    }

    let host = parsed.host_str().ok_or_else(|| "Target URL must contain a valid host component.".to_string())?;

    // SSRF Check: Cloud metadata unconditionally rejected
    if is_cloud_metadata_host(host) {
        return Err(format!("SSRF Security Alert: SSRF Guard blocked request to cloud metadata host '{}' to prevent credential exfiltration.", host));
    }

    // SSRF Check: Private network / loopback destination check
    if !allow_local && is_private_network_host(host) {
        return Err(format!("SSRF Guard: Access to internal or loopback destination '{}' is restricted by policy.", host));
    }

    // Port validation if explicit port is present
    if let Some(port) = parsed.port() {
        if port == 0 {
            return Err("Invalid port number: 0. Valid port range is 1 to 65535.".to_string());
        }
    }

    Ok(parsed)
}

/// Validates and sanitizes headers against CRLF injection and RFC 7230 invalid token characters.
pub fn validate_and_sanitize_headers(
    headers: &Option<HashMap<String, String>>,
    strict: bool,
) -> Result<HashMap<String, String>, String> {
    let mut clean_headers = HashMap::new();

    if let Some(map) = headers {
        for (raw_key, raw_val) in map {
            let key_trimmed = raw_key.trim();
            if key_trimmed.is_empty() {
                continue;
            }

            // Detect CRLF in header key
            if raw_key.contains('\r') || raw_key.contains('\n') || raw_key.contains('\0') {
                return Err(format!(
                    "Header injection attempt detected in header name '{}'. CRLF characters are prohibited.",
                    key_trimmed.replace(['\r', '\n'], "")
                ));
            }

            // Verify header name conforms strictly to RFC 7230 token specification
            let is_rfc7230 = key_trimmed.chars().all(|c| {
                c.is_ascii_alphanumeric() || "!#$%&'*+-.^_`|~".contains(c)
            });
            if !is_rfc7230 {
                return Err(format!(
                    "Invalid header name '{}'. Header names must contain only valid RFC 7230 token characters.",
                    key_trimmed
                ));
            }

            // Detect CRLF in header value
            if raw_val.contains('\r') || raw_val.contains('\n') || raw_val.contains('\0') {
                if strict {
                    return Err(format!(
                        "Header injection attempt detected in header value for '{}'. CRLF characters are prohibited: prohibited CRLF injection sequence detected.",
                        key_trimmed
                    ));
                } else {
                    let sanitized_val = raw_val.replace(['\r', '\n', '\0'], "").trim().to_string();
                    clean_headers.insert(key_trimmed.to_string(), sanitized_val);
                    continue;
                }
            }

            // Strip control characters while preserving valid text
            let sanitized_val: String = raw_val
                .chars()
                .filter(|&c| (c as u32) >= 32 || c == '\t')
                .collect();
            clean_headers.insert(key_trimmed.to_string(), sanitized_val.trim().to_string());
        }
    }

    Ok(clean_headers)
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestOptions {
    pub id: Option<String>,
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout_ms: Option<u64>,
    pub follow_redirects: Option<bool>,
    pub allow_local: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseResult {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub data: String,
    pub time_ms: u64,
    pub size_bytes: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsRecord {
    pub r#type: String,
    pub address: Option<String>,
    pub value: Option<String>,
    pub ttl: Option<u32>,
    pub priority: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupResult {
    pub host: String,
    pub records: Vec<DnsRecord>,
    pub time_ms: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpPingResult {
    pub host: String,
    pub port: u16,
    pub open: bool,
    pub time_ms: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SslCheckResult {
    pub host: String,
    pub port: u16,
    pub valid: bool,
    pub issuer: HashMap<String, String>,
    pub subject: HashMap<String, String>,
    pub valid_from: String,
    pub valid_to: String,
    pub days_remaining: i64,
    pub fingerprint: String,
    pub cipher: String,
    pub error: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// TAURI COMMAND IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/// Core HTTP request execution engine with SSRF filter and CRLF sanitization.
pub async fn execute_outbound_request(options: RequestOptions) -> ResponseResult {
    let start = Instant::now();

    // 1. Validate Target URL & enforce SSRF filter
    let allow_local = options.allow_local.unwrap_or(true);
    let parsed_url = match validate_target_url(&options.url, allow_local) {
        Ok(u) => u,
        Err(err) => {
            return ResponseResult {
                status: 0,
                status_text: "Security Error".to_string(),
                headers: HashMap::new(),
                data: String::new(),
                time_ms: start.elapsed().as_millis() as u64,
                size_bytes: 0,
                error: Some(err),
            };
        }
    };

    // 2. Validate and sanitize headers against CRLF injection
    let clean_headers = match validate_and_sanitize_headers(&options.headers, true) {
        Ok(h) => h,
        Err(err) => {
            return ResponseResult {
                status: 0,
                status_text: "Header Security Error".to_string(),
                headers: HashMap::new(),
                data: String::new(),
                time_ms: start.elapsed().as_millis() as u64,
                size_bytes: 0,
                error: Some(err),
            };
        }
    };

    // 3. Build reqwest client
    let timeout_ms = options.timeout_ms.unwrap_or(30000).clamp(500, 120000);
    let follow = options.follow_redirects.unwrap_or(true);
    let redirect_policy = if follow {
        reqwest::redirect::Policy::limited(10)
    } else {
        reqwest::redirect::Policy::none()
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .redirect(redirect_policy)
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ResponseResult {
                status: 0,
                status_text: "Client Initialization Error".to_string(),
                headers: HashMap::new(),
                data: String::new(),
                time_ms: start.elapsed().as_millis() as u64,
                size_bytes: 0,
                error: Some(format!("Failed to build HTTP client: {}", e)),
            };
        }
    };

    let method_str = options.method.as_deref().unwrap_or("GET").to_uppercase();
    let method = match method_str.as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "PATCH" => Method::PATCH,
        "DELETE" => Method::DELETE,
        "HEAD" => Method::HEAD,
        "OPTIONS" => Method::OPTIONS,
        _ => Method::GET,
    };

    let mut request_builder = client.request(method.clone(), parsed_url.as_str());

    // Attach headers
    for (k, v) in clean_headers {
        if let (Ok(name), Ok(val)) = (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(&v)) {
            request_builder = request_builder.header(name, val);
        }
    }

    // Attach body for non-GET/HEAD methods
    if let Some(body_content) = options.body {
        if method != Method::GET && method != Method::HEAD {
            request_builder = request_builder.body(body_content);
        }
    }

    // Execute request
    match request_builder.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let status_text = resp
                .status()
                .canonical_reason()
                .unwrap_or("Unknown Status")
                .to_string();

            let mut resp_headers = HashMap::new();
            for (key, val) in resp.headers() {
                if let Ok(val_str) = val.to_str() {
                    resp_headers.insert(key.as_str().to_string(), val_str.to_string());
                }
            }

            let text = resp.text().await.unwrap_or_default();
            let size_bytes = text.len();
            let time_ms = start.elapsed().as_millis() as u64;

            ResponseResult {
                status,
                status_text,
                headers: resp_headers,
                data: text,
                time_ms,
                size_bytes,
                error: None,
            }
        }
        Err(err) => {
            let time_ms = start.elapsed().as_millis() as u64;
            let is_timeout = err.is_timeout();
            let status_text = if is_timeout {
                "Timeout".to_string()
            } else {
                "Network Error".to_string()
            };
            let err_msg = if is_timeout {
                format!("Request timed out after {}ms", timeout_ms)
            } else {
                err.to_string()
            };

            ResponseResult {
                status: 0,
                status_text,
                headers: HashMap::new(),
                data: String::new(),
                time_ms,
                size_bytes: 0,
                error: Some(err_msg),
            }
        }
    }
}

/// Tauri command `net_dispatch_request` accepting options object.
#[tauri::command]
pub async fn net_dispatch_request(options: RequestOptions) -> ResponseResult {
    execute_outbound_request(options).await
}

/// Tauri command `net_dispatcher_send` (alias for Requirement 3).
#[tauri::command]
pub async fn net_dispatcher_send(options: RequestOptions) -> ResponseResult {
    execute_outbound_request(options).await
}

/// Discovers DNS records for a given hostname.
#[tauri::command]
pub async fn net_dns_lookup(host: String) -> DnsLookupResult {
    let start = Instant::now();
    let sanitized = host.trim().to_string();

    if sanitized.is_empty() {
        return DnsLookupResult {
            host,
            records: Vec::new(),
            time_ms: 0,
            error: Some("Hostname is required and cannot be empty.".to_string()),
        };
    }

    let mut records = Vec::new();

    // Query A and AAAA via local resolver
    if let Ok(addrs) = tokio::net::lookup_host(format!("{}:80", sanitized)).await {
        for addr in addrs {
            let ip = addr.ip();
            let rec_type = if ip.is_ipv4() { "A" } else { "AAAA" };
            records.push(DnsRecord {
                r#type: rec_type.to_string(),
                address: Some(ip.to_string()),
                value: None,
                ttl: Some(300),
                priority: None,
            });
        }
    }

    // Query MX and TXT via DoH
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .unwrap_or_default();

    if let Ok(resp) = client
        .get(format!("https://dns.google/resolve?name={}&type=MX", sanitized))
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(answers) = json.get("Answer").and_then(|v| v.as_array()) {
                for a in answers {
                    if let Some(data) = a.get("data").and_then(|d| d.as_str()) {
                        let tokens: Vec<&str> = data.split_whitespace().collect();
                        let (prio, val) = if tokens.len() >= 2 {
                            (tokens[0].parse::<u16>().ok(), Some(tokens[1].to_string()))
                        } else {
                            (None, Some(data.to_string()))
                        };
                        records.push(DnsRecord {
                            r#type: "MX".to_string(),
                            address: None,
                            value: val,
                            ttl: a.get("TTL").and_then(|t| t.as_u64()).map(|t| t as u32),
                            priority: prio,
                        });
                    }
                }
            }
        }
    }

    let time_ms = start.elapsed().as_millis() as u64;

    DnsLookupResult {
        host: sanitized,
        records,
        time_ms,
        error: None,
    }
}

/// Measures TCP connection latency to target host and port.
#[tauri::command]
pub async fn net_tcp_ping(host: String, port: u16, timeout_ms: Option<u64>) -> TcpPingResult {
    let start = Instant::now();
    let clean_host = host.trim().to_string();

    if clean_host.is_empty() {
        return TcpPingResult {
            host,
            port,
            open: false,
            time_ms: 0,
            error: Some("Host cannot be empty".to_string()),
        };
    }

    if port == 0 {
        return TcpPingResult {
            host: clean_host,
            port: 0,
            open: false,
            time_ms: 0,
            error: Some("Port must be between 1 and 65535".to_string()),
        };
    }

    let timeout_duration = Duration::from_millis(timeout_ms.unwrap_or(5000));
    let addr = format!("{}:{}", clean_host, port);

    match tokio::time::timeout(timeout_duration, tokio::net::TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => TcpPingResult {
            host: clean_host,
            port,
            open: true,
            time_ms: start.elapsed().as_millis() as u64,
            error: None,
        },
        Ok(Err(err)) => TcpPingResult {
            host: clean_host,
            port,
            open: false,
            time_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("Connection refused: {}", err)),
        },
        Err(_) => TcpPingResult {
            host: clean_host,
            port,
            open: false,
            time_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("Connection timed out after {}ms", timeout_duration.as_millis())),
        },
    }
}

/// Inspects TLS certificate of remote host and port.
#[tauri::command]
pub async fn net_ssl_check(host: String, port: Option<u16>) -> SslCheckResult {
    let target_port = port.unwrap_or(443);
    let inspect_result = crate::network::network_ssl_inspect(host.clone(), Some(target_port)).await;

    let mut issuer_map = HashMap::new();
    if let Some(iss) = inspect_result.issuer {
        if let Some(cn) = iss.cn {
            issuer_map.insert("CN".to_string(), cn);
        }
        if let Some(o) = iss.o {
            issuer_map.insert("O".to_string(), o);
        }
        if let Some(c) = iss.c {
            issuer_map.insert("C".to_string(), c);
        }
    }

    let mut subject_map = HashMap::new();
    if let Some(sub) = inspect_result.subject {
        if let Some(cn) = sub.cn {
            subject_map.insert("CN".to_string(), cn);
        }
        if let Some(o) = sub.o {
            subject_map.insert("O".to_string(), o);
        }
        if let Some(c) = sub.c {
            subject_map.insert("C".to_string(), c);
        }
    }

    SslCheckResult {
        host,
        port: target_port,
        valid: inspect_result.success && !inspect_result.is_expired.unwrap_or(false),
        issuer: issuer_map,
        subject: subject_map,
        valid_from: inspect_result.valid_from.unwrap_or_default(),
        valid_to: inspect_result.valid_to.unwrap_or_default(),
        days_remaining: inspect_result.days_remaining.unwrap_or(0),
        fingerprint: inspect_result.fingerprint256.unwrap_or_default(),
        cipher: inspect_result.protocol.unwrap_or_else(|| "Unknown TLS".to_string()),
        error: inspect_result.error,
    }
}
