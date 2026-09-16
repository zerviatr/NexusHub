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

//! Network Diagnostics and Tools Module
//!
//! Provides high-performance, asynchronous network utilities:
//! 1. Ping engine executing native ping with regex-based metric extraction.
//! 2. Port scanner probing TCP ports concurrently via `tokio::net::TcpStream`.
//! 3. IP lookup resolving addresses and querying geolocation.
//! 4. My IP query determining public IPv4/IPv6 address.
//! 5. DNS query resolving A, AAAA, MX, TXT, NS, CNAME records.
//! 6. SSL Certificate inspector establishing TLS handshakes and parsing peer certificates.

use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::net::TcpStream;
use tokio::process::Command;

/// Service banner lookup map for standard well-known TCP ports.
pub fn lookup_service_name(port: u16) -> &'static str {
    match port {
        20 => "FTP-Data",
        21 => "FTP",
        22 => "SSH",
        23 => "Telnet",
        25 => "SMTP",
        53 => "DNS",
        80 => "HTTP",
        110 => "POP3",
        119 => "NNTP",
        123 => "NTP",
        143 => "IMAP",
        161 => "SNMP",
        194 => "IRC",
        443 => "HTTPS",
        465 => "SMTPS",
        587 => "SMTP (TLS)",
        993 => "IMAPS",
        995 => "POP3S",
        1433 => "MSSQL",
        1521 => "Oracle",
        3306 => "MySQL",
        3389 => "RDP",
        5432 => "PostgreSQL",
        5900 => "VNC",
        6379 => "Redis",
        8080 => "HTTP-Alt",
        8443 => "HTTPS-Alt",
        27017 => "MongoDB",
        _ => "Unknown",
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub success: bool,
    pub host: String,
    pub sent: u32,
    pub received: u32,
    pub loss_percent: f64,
    pub packet_loss: String,
    pub min_latency_ms: Option<f64>,
    pub avg_latency_ms: Option<f64>,
    pub max_latency_ms: Option<f64>,
    #[serde(rename = "minMs")]
    pub min_ms: Option<f64>,
    #[serde(rename = "avgMs")]
    pub avg_ms: Option<f64>,
    #[serde(rename = "maxMs")]
    pub max_ms: Option<f64>,
    pub latencies: Vec<f64>,
    pub raw_output: String,
    pub output: String,
    pub error: Option<String>,
}

/// Parses ping stdout/stderr to extract latency, packet loss, and transmission metrics.
pub fn parse_ping_output(raw: &str, host: &str) -> PingResult {
    let mut sent = 4u32;
    let mut received = 0u32;
    let mut loss_percent = 100.0f64;
    let mut min_ms: Option<f64> = None;
    let mut avg_ms: Option<f64> = None;
    let mut max_ms: Option<f64> = None;
    let mut latencies: Vec<f64> = Vec::new();

    // 1. Packet counts & loss
    // Windows: "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
    // Windows TR: "Paket: Gonderilen = 4, Alinan = 4, Kaybolan = 0 (%0 kayip)"
    for line in raw.lines() {
        let lower = line.to_lowercase();
        if lower.contains("sent =") || lower.contains("gönderilen =") || lower.contains("gonderilen =") {
            if let Some(pos) = lower.find("sent =") {
                let rem = &lower[pos + 6..];
                if let Some(comma) = rem.find(',') {
                    if let Ok(v) = rem[..comma].trim().parse::<u32>() {
                        sent = v;
                    }
                }
            } else if let Some(pos) = lower.find("gönderilen =") {
                let rem = &lower[pos + 12..];
                if let Some(comma) = rem.find(',') {
                    if let Ok(v) = rem[..comma].trim().parse::<u32>() {
                        sent = v;
                    }
                }
            }

            if let Some(pos) = lower.find("received =") {
                let rem = &lower[pos + 10..];
                if let Some(comma) = rem.find(',') {
                    if let Ok(v) = rem[..comma].trim().parse::<u32>() {
                        received = v;
                    }
                }
            } else if let Some(pos) = lower.find("alınan =") {
                let rem = &lower[pos + 8..];
                if let Some(comma) = rem.find(',') {
                    if let Ok(v) = rem[..comma].trim().parse::<u32>() {
                        received = v;
                    }
                }
            }
        }

        // Unix: "4 packets transmitted, 4 received, 0% packet loss"
        if lower.contains("packets transmitted") {
            let parts: Vec<&str> = lower.split(',').collect();
            if let Some(first) = parts.first() {
                if let Some(sp) = first.split_whitespace().next() {
                    if let Ok(v) = sp.parse::<u32>() {
                        sent = v;
                    }
                }
            }
            if parts.len() > 1 {
                for token in parts[1].split_whitespace() {
                    if let Ok(v) = token.parse::<u32>() {
                        received = v;
                        break;
                    }
                }
            }
        }

        // Loss extraction
        // Look for pattern "(X% loss)" or "%X kayıp" or "X% packet loss"
        if let Some(idx) = lower.find("% loss") {
            let prefix = &lower[..idx];
            if let Some(start) = prefix.rfind(|c: char| !c.is_numeric() && c != '.') {
                if let Ok(val) = prefix[start + 1..].trim().parse::<f64>() {
                    loss_percent = val;
                }
            }
        } else if let Some(idx) = lower.find("% packet loss") {
            let prefix = &lower[..idx];
            if let Some(start) = prefix.rfind(|c: char| !c.is_numeric() && c != '.') {
                if let Ok(val) = prefix[start + 1..].trim().parse::<f64>() {
                    loss_percent = val;
                }
            }
        } else if let Some(idx) = lower.find("% kayıp") {
            let prefix = &lower[..idx];
            if let Some(start) = prefix.rfind(|c: char| !c.is_numeric() && c != '.') {
                if let Ok(val) = prefix[start + 1..].trim().parse::<f64>() {
                    loss_percent = val;
                }
            }
        }
    }

    // 2. Individual latencies ("time=14ms", "time<1ms", "süre=14ms")
    for line in raw.lines() {
        let lower = line.to_lowercase();
        let mut search_from = 0;
        while let Some(mut time_idx) = lower[search_from..].find("time=") {
            time_idx += search_from;
            let after = &lower[time_idx + 5..];
            if let Some(ms_idx) = after.find("ms") {
                let num_str = after[..ms_idx].trim();
                if let Ok(val) = num_str.parse::<f64>() {
                    latencies.push(val);
                }
            }
            search_from = time_idx + 5;
        }

        let mut search_from_lt = 0;
        while let Some(mut time_idx) = lower[search_from_lt..].find("time<") {
            time_idx += search_from_lt;
            let after = &lower[time_idx + 5..];
            if let Some(ms_idx) = after.find("ms") {
                let num_str = after[..ms_idx].trim();
                if let Ok(val) = num_str.parse::<f64>() {
                    latencies.push(val);
                }
            }
            search_from_lt = time_idx + 5;
        }
    }

    // 3. Min / Max / Average summary lines
    // Windows: "Minimum = 12ms, Maximum = 18ms, Average = 14ms"
    // Windows TR: "En Küçük = 12ms, En Büyük = 18ms, Ortalama = 14ms"
    for line in raw.lines() {
        let lower = line.to_lowercase();
        if lower.contains("average =") || lower.contains("ortalama =") {
            if let Some(avg_idx) = lower.find("average =") {
                let after = &lower[avg_idx + 9..];
                if let Some(ms) = after.find("ms") {
                    if let Ok(v) = after[..ms].trim().parse::<f64>() {
                        avg_ms = Some(v);
                    }
                }
            } else if let Some(avg_idx) = lower.find("ortalama =") {
                let after = &lower[avg_idx + 10..];
                if let Some(ms) = after.find("ms") {
                    if let Ok(v) = after[..ms].trim().parse::<f64>() {
                        avg_ms = Some(v);
                    }
                }
            }

            if let Some(min_idx) = lower.find("minimum =") {
                let after = &lower[min_idx + 9..];
                if let Some(comma) = after.find(',') {
                    let part = &after[..comma];
                    if let Some(ms) = part.find("ms") {
                        if let Ok(v) = part[..ms].trim().parse::<f64>() {
                            min_ms = Some(v);
                        }
                    }
                }
            }

            if let Some(max_idx) = lower.find("maximum =") {
                let after = &lower[max_idx + 9..];
                if let Some(comma) = after.find(',') {
                    let part = &after[..comma];
                    if let Some(ms) = part.find("ms") {
                        if let Ok(v) = part[..ms].trim().parse::<f64>() {
                            max_ms = Some(v);
                        }
                    }
                } else if let Some(ms) = after.find("ms") {
                    if let Ok(v) = after[..ms].trim().parse::<f64>() {
                        max_ms = Some(v);
                    }
                }
            }
        }

        // Unix: "rtt min/avg/max/mdev = 1.234/2.345/3.456/0.123 ms"
        if lower.contains("min/avg/max") {
            if let Some(eq) = lower.find('=') {
                let after = lower[eq + 1..].trim();
                let parts: Vec<&str> = after.split('/').collect();
                if parts.len() >= 3 {
                    min_ms = parts[0].trim().parse::<f64>().ok();
                    avg_ms = parts[1].trim().parse::<f64>().ok();
                    let max_str = parts[2].split_whitespace().next().unwrap_or(parts[2]);
                    max_ms = max_str.parse::<f64>().ok();
                }
            }
        }
    }

    // Calculate fallback average from individual latencies if summary was not found
    if avg_ms.is_none() && !latencies.is_empty() {
        let sum: f64 = latencies.iter().sum();
        avg_ms = Some(sum / latencies.len() as f64);
    }
    if min_ms.is_none() && !latencies.is_empty() {
        min_ms = latencies.iter().copied().reduce(f64::min);
    }
    if max_ms.is_none() && !latencies.is_empty() {
        max_ms = latencies.iter().copied().reduce(f64::max);
    }

    if received > 0 && loss_percent >= 100.0 && sent > 0 {
        loss_percent = ((sent - received) as f64 / sent as f64) * 100.0;
    }

    let success = received > 0 || (raw.contains("Reply from") || raw.contains("bytes from"));

    PingResult {
        success,
        host: host.to_string(),
        sent,
        received,
        loss_percent,
        packet_loss: format!("{}%", loss_percent as u32),
        min_latency_ms: min_ms,
        avg_latency_ms: avg_ms,
        max_latency_ms: max_ms,
        min_ms,
        avg_ms,
        max_ms,
        latencies,
        raw_output: raw.to_string(),
        output: raw.to_string(),
        error: if success {
            None
        } else {
            Some("Host unreachable or request timed out".to_string())
        },
    }
}

/// Executes ICMP ping against target host with count and timeout.
#[tauri::command]
pub async fn network_ping(host: String, count: Option<u32>) -> PingResult {
    let sanitized = host.trim();
    if sanitized.is_empty() {
        return PingResult {
            success: false,
            host,
            sent: 0,
            received: 0,
            loss_percent: 100.0,
            packet_loss: "100%".to_string(),
            min_latency_ms: None,
            avg_latency_ms: None,
            max_latency_ms: None,
            min_ms: None,
            avg_ms: None,
            max_ms: None,
            latencies: Vec::new(),
            raw_output: String::new(),
            output: String::new(),
            error: Some("Host cannot be empty".to_string()),
        };
    }

    // Security validation against shell injection characters
    if sanitized.chars().any(|c| ";`|&><\r\n\t\"'$".contains(c)) || sanitized.starts_with('-') {
        return PingResult {
            success: false,
            host: sanitized.to_string(),
            sent: 0,
            received: 0,
            loss_percent: 100.0,
            packet_loss: "100%".to_string(),
            min_latency_ms: None,
            avg_latency_ms: None,
            max_latency_ms: None,
            min_ms: None,
            avg_ms: None,
            max_ms: None,
            latencies: Vec::new(),
            raw_output: String::new(),
            output: String::new(),
            error: Some("Invalid host format: shell metacharacters prohibited".to_string()),
        };
    }

    let ping_count = count.unwrap_or(4).clamp(1, 10);
    let count_str = ping_count.to_string();

    #[cfg(target_os = "windows")]
    let output = Command::new("ping.exe")
        .args(["-n", &count_str, sanitized])
        .output()
        .await;

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("ping")
        .args(["-c", &count_str, sanitized])
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout_str = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr_str = String::from_utf8_lossy(&out.stderr).to_string();
            let combined = if stdout_str.trim().is_empty() {
                stderr_str
            } else {
                stdout_str
            };
            parse_ping_output(&combined, sanitized)
        }
        Err(err) => PingResult {
            success: false,
            host: sanitized.to_string(),
            sent: ping_count,
            received: 0,
            loss_percent: 100.0,
            packet_loss: "100%".to_string(),
            min_latency_ms: None,
            avg_latency_ms: None,
            max_latency_ms: None,
            min_ms: None,
            avg_ms: None,
            max_ms: None,
            latencies: Vec::new(),
            raw_output: String::new(),
            output: String::new(),
            error: Some(format!("Failed to execute ping: {}", err)),
        },
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PORT SCANNER
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortStatus {
    pub port: u16,
    pub open: bool,
    pub service: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortScanResult {
    pub success: bool,
    pub host: String,
    pub ports: Vec<PortStatus>,
    pub error: Option<String>,
}

/// Probes a single TCP port using tokio::net::TcpStream with 1500ms timeout.
pub async fn probe_single_port(host: &str, port: u16, timeout_ms: u64) -> PortStatus {
    let addr = format!("{}:{}", host, port);
    let duration = Duration::from_millis(timeout_ms);
    let open = match tokio::time::timeout(duration, TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => true,
        _ => false,
    };

    PortStatus {
        port,
        open,
        service: lookup_service_name(port).to_string(),
    }
}

#[tauri::command]
pub async fn network_port_scan(host: String, ports: Vec<u16>) -> PortScanResult {
    let sanitized = host.trim().to_string();
    if sanitized.is_empty() {
        return PortScanResult {
            success: false,
            host,
            ports: Vec::new(),
            error: Some("Host cannot be empty".to_string()),
        };
    }

    if ports.is_empty() {
        return PortScanResult {
            success: false,
            host: sanitized,
            ports: Vec::new(),
            error: Some("No ports specified".to_string()),
        };
    }

    if ports.len() > 100 {
        return PortScanResult {
            success: false,
            host: sanitized,
            ports: Vec::new(),
            error: Some("Maximum 100 ports per scan".to_string()),
        };
    }

    let host_arc = Arc::new(sanitized.clone());
    let mut tasks = Vec::with_capacity(ports.len());

    for port in ports {
        let h = Arc::clone(&host_arc);
        tasks.push(tokio::spawn(async move {
            probe_single_port(&h, port, 1500).await
        }));
    }

    let mut scanned_ports = Vec::with_capacity(tasks.len());
    for task in tasks {
        if let Ok(res) = task.await {
            scanned_ports.push(res);
        }
    }

    scanned_ports.sort_by_key(|p| p.port);

    PortScanResult {
        success: true,
        host: sanitized,
        ports: scanned_ports,
        error: None,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. IP LOOKUP & GEOLOCATION
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpLookupResult {
    pub success: bool,
    pub host: String,
    pub ip: Option<String>,
    pub family: Option<u8>,
    pub city: Option<String>,
    pub region: Option<String>,
    pub country: Option<String>,
    #[serde(rename = "countryCode")]
    pub country_code: Option<String>,
    pub org: Option<String>,
    pub timezone: Option<String>,
    pub isp: Option<String>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn network_ip_lookup(host: String) -> IpLookupResult {
    let mut sanitized = host.trim();
    while sanitized.starts_with('-') {
        sanitized = sanitized[1..].trim();
    }

    if sanitized.is_empty() {
        return IpLookupResult {
            success: false,
            host,
            ip: None,
            family: None,
            city: None,
            region: None,
            country: None,
            country_code: None,
            org: None,
            timezone: None,
            isp: None,
            lat: None,
            lon: None,
            error: Some("Host cannot be empty".to_string()),
        };
    }

    // 1. Resolve DNS via tokio lookup_host
    let mut resolved_ip = None;
    let mut family = None;

    if let Ok(mut addrs) = tokio::net::lookup_host(format!("{}:80", sanitized)).await {
        if let Some(socket_addr) = addrs.next() {
            let ip_obj = socket_addr.ip();
            resolved_ip = Some(ip_obj.to_string());
            family = Some(if ip_obj.is_ipv4() { 4 } else { 6 });
        }
    }

    let target = resolved_ip.as_deref().unwrap_or(sanitized);

    // 2. Query ip-api.com for rich geolocation data
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    let api_url = format!(
        "http://ip-api.com/json/{}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,query",
        target
    );

    if let Ok(resp) = client.get(&api_url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if json.get("status").and_then(|s| s.as_str()) == Some("success") {
                let ip_str = json.get("query").and_then(|v| v.as_str()).map(String::from).or(resolved_ip.clone());
                return IpLookupResult {
                    success: true,
                    host: sanitized.to_string(),
                    ip: ip_str,
                    family,
                    city: json.get("city").and_then(|v| v.as_str()).map(String::from),
                    region: json.get("regionName").and_then(|v| v.as_str()).map(String::from),
                    country: json.get("country").and_then(|v| v.as_str()).map(String::from),
                    country_code: json.get("countryCode").and_then(|v| v.as_str()).map(String::from),
                    org: json.get("org").and_then(|v| v.as_str()).map(String::from),
                    timezone: json.get("timezone").and_then(|v| v.as_str()).map(String::from),
                    isp: json.get("isp").and_then(|v| v.as_str()).map(String::from),
                    lat: json.get("lat").and_then(|v| v.as_f64()),
                    lon: json.get("lon").and_then(|v| v.as_f64()),
                    error: None,
                };
            }
        }
    }

    // Fallback if IP was resolved through local resolver
    if let Some(ip_str) = resolved_ip {
        return IpLookupResult {
            success: true,
            host: sanitized.to_string(),
            ip: Some(ip_str),
            family,
            city: None,
            region: None,
            country: None,
            country_code: None,
            org: None,
            timezone: None,
            isp: None,
            lat: None,
            lon: None,
            error: None,
        };
    }

    IpLookupResult {
        success: false,
        host: sanitized.to_string(),
        ip: None,
        family: None,
        city: None,
        region: None,
        country: None,
        country_code: None,
        org: None,
        timezone: None,
        isp: None,
        lat: None,
        lon: None,
        error: Some("DNS and IP lookup failed to resolve target host".to_string()),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MY IP LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyIpResult {
    pub success: bool,
    pub ip: Option<String>,
    pub city: Option<String>,
    pub region: Option<String>,
    pub country: Option<String>,
    #[serde(rename = "countryCode")]
    pub country_code: Option<String>,
    pub org: Option<String>,
    pub timezone: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn network_my_ip() -> MyIpResult {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .unwrap_or_default();

    // Primary: https://ipapi.co/json/
    if let Ok(resp) = client.get("https://ipapi.co/json/").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(ip) = json.get("ip").and_then(|v| v.as_str()) {
                return MyIpResult {
                    success: true,
                    ip: Some(ip.to_string()),
                    city: json.get("city").and_then(|v| v.as_str()).map(String::from),
                    region: json.get("region").and_then(|v| v.as_str()).map(String::from),
                    country: json.get("country_name").and_then(|v| v.as_str()).map(String::from),
                    country_code: json.get("country_code").and_then(|v| v.as_str()).map(String::from),
                    org: json.get("org").and_then(|v| v.as_str()).map(String::from),
                    timezone: json.get("timezone").and_then(|v| v.as_str()).map(String::from),
                    error: None,
                };
            }
        }
    }

    // Secondary: https://api.ipify.org?format=json
    if let Ok(resp) = client.get("https://api.ipify.org?format=json").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(ip) = json.get("ip").and_then(|v| v.as_str()) {
                return MyIpResult {
                    success: true,
                    ip: Some(ip.to_string()),
                    city: None,
                    region: None,
                    country: None,
                    country_code: None,
                    org: None,
                    timezone: None,
                    error: None,
                };
            }
        }
    }

    MyIpResult {
        success: false,
        ip: None,
        city: None,
        region: None,
        country: None,
        country_code: None,
        org: None,
        timezone: None,
        error: Some("Failed to resolve public IP address".to_string()),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DNS QUERY
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsQueryResult {
    pub success: bool,
    pub host: String,
    pub r#type: String,
    pub records: Vec<String>,
    pub error: Option<String>,
}

/// Dispatches DNS queries for A, AAAA, MX, TXT, NS, CNAME records.
#[tauri::command]
pub async fn network_dns_query(
    host: String,
    query_type: Option<String>,
    r#type: Option<String>,
) -> DnsQueryResult {
    let sanitized_host = host.trim().to_string();
    let q_type = query_type
        .or(r#type)
        .unwrap_or_else(|| "A".to_string())
        .to_uppercase();

    if sanitized_host.is_empty() {
        return DnsQueryResult {
            success: false,
            host,
            r#type: q_type,
            records: Vec::new(),
            error: Some("Host cannot be empty".to_string()),
        };
    }

    // Attempt DoH resolution via Cloudflare / Google DNS over HTTPS for reliability
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    let doh_url = format!(
        "https://dns.google/resolve?name={}&type={}",
        sanitized_host, q_type
    );

    if let Ok(resp) = client.get(&doh_url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(answers) = json.get("Answer").and_then(|v| v.as_array()) {
                let mut records = Vec::new();
                for a in answers {
                    if let Some(data) = a.get("data").and_then(|d| d.as_str()) {
                        records.push(data.trim_matches('"').to_string());
                    }
                }
                if !records.is_empty() {
                    return DnsQueryResult {
                        success: true,
                        host: sanitized_host,
                        r#type: q_type,
                        records,
                        error: None,
                    };
                }
            }
        }
    }

    // Fallback to local nslookup command execution
    let type_arg = format!("-type={}", q_type);
    let output = Command::new("nslookup")
        .args([&type_arg, &sanitized_host])
        .output()
        .await;

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        let mut records = Vec::new();

        for line in stdout.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("Server:") || trimmed.starts_with("Address:") {
                continue;
            }

            match q_type.as_str() {
                "A" | "AAAA" => {
                    if let Some(pos) = trimmed.find("Address:") {
                        let addr = trimmed[pos + 8..].trim();
                        if !addr.is_empty() {
                            records.push(addr.to_string());
                        }
                    } else if let Some(pos) = trimmed.find("Addresses:") {
                        let addr = trimmed[pos + 10..].trim();
                        if !addr.is_empty() {
                            records.push(addr.to_string());
                        }
                    }
                }
                "MX" => {
                    if let Some(pos) = trimmed.find("mail exchanger =") {
                        let ex = trimmed[pos + 16..].trim();
                        records.push(ex.to_string());
                    }
                }
                "TXT" => {
                    if let Some(pos) = trimmed.find("text =") {
                        let txt = trimmed[pos + 6..].trim().trim_matches('"');
                        records.push(txt.to_string());
                    } else if trimmed.starts_with('"') && trimmed.ends_with('"') {
                        records.push(trimmed.trim_matches('"').to_string());
                    }
                }
                "NS" => {
                    if let Some(pos) = trimmed.find("nameserver =") {
                        records.push(trimmed[pos + 12..].trim().to_string());
                    }
                }
                "CNAME" => {
                    if let Some(pos) = trimmed.find("canonical name =") {
                        records.push(trimmed[pos + 16..].trim().to_string());
                    }
                }
                _ => {
                    records.push(trimmed.to_string());
                }
            }
        }

        if !records.is_empty() {
            return DnsQueryResult {
                success: true,
                host: sanitized_host,
                r#type: q_type,
                records,
                error: None,
            };
        }
    }

    DnsQueryResult {
        success: false,
        host: sanitized_host,
        r#type: q_type,
        records: Vec::new(),
        error: Some("No records found for query".to_string()),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SSL CERTIFICATE INSPECTOR
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CertIdentity {
    pub cn: Option<String>,
    pub o: Option<String>,
    pub c: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SslCertResult {
    pub success: bool,
    pub host: String,
    pub port: u16,
    pub subject: Option<CertIdentity>,
    pub issuer: Option<CertIdentity>,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub days_remaining: Option<i64>,
    pub is_expired: Option<bool>,
    pub serial_number: Option<String>,
    pub fingerprint256: Option<String>,
    pub protocol: Option<String>,
    pub sans: Vec<String>,
    pub error: Option<String>,
}

/// Custom Rustls verifier that accepts all certificates for inspection purposes.
#[derive(Debug)]
struct InspectionVerifier;

impl rustls::client::danger::ServerCertVerifier for InspectionVerifier {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls_pki_types::CertificateDer<'_>,
        _intermediates: &[rustls_pki_types::CertificateDer<'_>],
        _server_name: &rustls_pki_types::ServerName<'_>,
        _ocsp_response: &[u8],
        _now: rustls_pki_types::UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &rustls_pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &rustls_pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        rustls::crypto::ring::default_provider()
            .signature_verification_algorithms
            .supported_schemes()
    }
}

/// Formats a 32-byte SHA-256 hash into standard colon-separated hex format (AA:BB:CC:...).
pub fn format_fingerprint_sha256(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    digest
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<String>>()
        .join(":")
}

/// Establishes TLS handshake and parses remote peer certificates using x509-parser.
#[tauri::command]
pub async fn network_ssl_inspect(host: String, port: Option<u16>) -> SslCertResult {
    let target_port = port.unwrap_or(443);
    let mut clean_host = host.trim().to_string();

    // Strip scheme, path, query and port if user passed a URL
    if clean_host.starts_with("https://") {
        clean_host = clean_host[8..].to_string();
    } else if clean_host.starts_with("http://") {
        clean_host = clean_host[7..].to_string();
    }
    if let Some(slash) = clean_host.find('/') {
        clean_host = clean_host[..slash].to_string();
    }
    if let Some(colon) = clean_host.rfind(':') {
        if !clean_host.contains(']') {
            clean_host = clean_host[..colon].to_string();
        }
    }

    if clean_host.is_empty() {
        return SslCertResult {
            success: false,
            host,
            port: target_port,
            subject: None,
            issuer: None,
            valid_from: None,
            valid_to: None,
            days_remaining: None,
            is_expired: None,
            serial_number: None,
            fingerprint256: None,
            protocol: None,
            sans: Vec::new(),
            error: Some("Host cannot be empty".to_string()),
        };
    }

    let server_name = match rustls_pki_types::ServerName::try_from(clean_host.clone()) {
        Ok(name) => name,
        Err(err) => {
            return SslCertResult {
                success: false,
                host: clean_host,
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some(format!("Invalid DNS name for TLS SNI: {}", err)),
            };
        }
    };

    // Configure rustls client
    let config = rustls::ClientConfig::builder_with_provider(Arc::new(
        rustls::crypto::ring::default_provider(),
    ))
    .with_safe_default_protocol_versions()
    .expect("Failed to initialize protocol versions")
    .dangerous()
    .with_custom_certificate_verifier(Arc::new(InspectionVerifier))
    .with_no_client_auth();

    let connector = tokio_rustls::TlsConnector::from(Arc::new(config));

    // Connect TCP socket with 6s timeout
    let addr = format!("{}:{}", clean_host, target_port);
    let tcp_stream = match tokio::time::timeout(Duration::from_secs(6), TcpStream::connect(&addr)).await {
        Ok(Ok(stream)) => stream,
        Ok(Err(err)) => {
            return SslCertResult {
                success: false,
                host: clean_host.clone(),
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some(format!("TCP connection to {}:{} failed: {}", clean_host, target_port, err)),
            };
        }
        Err(_) => {
            return SslCertResult {
                success: false,
                host: clean_host.clone(),
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some(format!("TCP connection to {}:{} timed out after 6000ms", clean_host, target_port)),
            };
        }
    };

    // Perform TLS Handshake with timeout
    let tls_stream = match tokio::time::timeout(Duration::from_secs(6), connector.connect(server_name, tcp_stream)).await {
        Ok(Ok(stream)) => stream,
        Ok(Err(err)) => {
            return SslCertResult {
                success: false,
                host: clean_host.clone(),
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some(format!("TLS handshake failed: {}", err)),
            };
        }
        Err(_) => {
            return SslCertResult {
                success: false,
                host: clean_host.clone(),
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some("TLS handshake timed out".to_string()),
            };
        }
    };

    let (_, conn) = tls_stream.get_ref();
    let peer_certs = conn.peer_certificates();

    let cert_der = match peer_certs.and_then(|certs| certs.first()) {
        Some(cert) => cert.as_ref(),
        None => {
            return SslCertResult {
                success: false,
                host: clean_host,
                port: target_port,
                subject: None,
                issuer: None,
                valid_from: None,
                valid_to: None,
                days_remaining: None,
                is_expired: None,
                serial_number: None,
                fingerprint256: None,
                protocol: None,
                sans: Vec::new(),
                error: Some("No peer certificates presented by remote host".to_string()),
            };
        }
    };

    let fingerprint256 = format_fingerprint_sha256(cert_der);
    let protocol = conn.protocol_version().map(|v| match v {
        rustls::ProtocolVersion::TLSv1_2 => "TLSv1.2",
        rustls::ProtocolVersion::TLSv1_3 => "TLSv1.3",
        _ => "Unknown TLS",
    }.to_string());

    // Parse X.509 certificate
    match x509_parser::parse_x509_certificate(cert_der) {
        Ok((_, cert)) => {
            // Subject CN, O, C
            let mut subject_cn = None;
            let mut subject_o = None;
            let mut subject_c = None;

            for rdn in cert.subject().iter_rdn() {
                for attr in rdn.iter() {
                    let oid_str = attr.attr_type().to_string();
                    if let Ok(val) = attr.as_str() {
                        if oid_str == "2.5.4.3" {
                            subject_cn = Some(val.to_string());
                        } else if oid_str == "2.5.4.10" {
                            subject_o = Some(val.to_string());
                        } else if oid_str == "2.5.4.6" {
                            subject_c = Some(val.to_string());
                        }
                    }
                }
            }

            // Issuer CN, O, C
            let mut issuer_cn = None;
            let mut issuer_o = None;
            let mut issuer_c = None;

            for rdn in cert.issuer().iter_rdn() {
                for attr in rdn.iter() {
                    let oid_str = attr.attr_type().to_string();
                    if let Ok(val) = attr.as_str() {
                        if oid_str == "2.5.4.3" {
                            issuer_cn = Some(val.to_string());
                        } else if oid_str == "2.5.4.10" {
                            issuer_o = Some(val.to_string());
                        } else if oid_str == "2.5.4.6" {
                            issuer_c = Some(val.to_string());
                        }
                    }
                }
            }

            // Validity dates
            let not_before = cert.validity().not_before.to_datetime();
            let not_after = cert.validity().not_after.to_datetime();

            let valid_from_str = not_before.to_string();
            let valid_to_str = not_after.to_string();

            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            let expiry_sec = not_after.unix_timestamp();
            let diff_sec = expiry_sec - now;
            let days_remaining = (diff_sec / 86400).max(0);
            let is_expired = diff_sec <= 0;

            // Serial Number
            let serial_number = Some(cert.raw_serial_as_string());

            // Subject Alternative Names (SANs)
            let mut sans = Vec::new();
            if let Ok(Some(ext)) = cert.subject_alternative_name() {
                for name in &ext.value.general_names {
                    match name {
                        x509_parser::extensions::GeneralName::DNSName(dns) => {
                            sans.push(dns.to_string());
                        }
                        x509_parser::extensions::GeneralName::IPAddress(ip) => {
                            if ip.len() == 4 {
                                sans.push(format!("{}.{}.{}.{}", ip[0], ip[1], ip[2], ip[3]));
                            }
                        }
                        _ => {}
                    }
                }
            }

            SslCertResult {
                success: true,
                host: clean_host,
                port: target_port,
                subject: Some(CertIdentity {
                    cn: subject_cn,
                    o: subject_o,
                    c: subject_c,
                }),
                issuer: Some(CertIdentity {
                    cn: issuer_cn,
                    o: issuer_o,
                    c: issuer_c,
                }),
                valid_from: Some(valid_from_str),
                valid_to: Some(valid_to_str),
                days_remaining: Some(days_remaining),
                is_expired: Some(is_expired),
                serial_number,
                fingerprint256: Some(fingerprint256),
                protocol,
                sans,
                error: None,
            }
        }
        Err(err) => SslCertResult {
            success: false,
            host: clean_host,
            port: target_port,
            subject: None,
            issuer: None,
            valid_from: None,
            valid_to: None,
            days_remaining: None,
            is_expired: None,
            serial_number: None,
            fingerprint256: Some(fingerprint256),
            protocol,
            sans: Vec::new(),
            error: Some(format!("Failed to parse X.509 certificate: {}", err)),
        },
    }
}
