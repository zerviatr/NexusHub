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

//! Comprehensive Integration & Unit Test Suite for Milestone M4:
//! Network Tools, Port Watchdog & API Studio Net Dispatcher.

use std::collections::HashMap;
use tokio::net::TcpListener;
use zendev_tauri_lib::net_dispatcher::*;
use zendev_tauri_lib::network::*;

// ─────────────────────────────────────────────────────────────────────────────
// 1. PING PARSER & METRIC EXTRACTION TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_ping_output_parsing_windows_format() {
    let windows_output = r#"
Pinging google.com [142.250.185.78] with 32 bytes of data:
Reply from 142.250.185.78: bytes=32 time=14ms TTL=117
Reply from 142.250.185.78: bytes=32 time=12ms TTL=117
Reply from 142.250.185.78: bytes=32 time=18ms TTL=117
Reply from 142.250.185.78: bytes=32 time=16ms TTL=117

Ping statistics for 142.250.185.78:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 12ms, Maximum = 18ms, Average = 15ms
"#;

    let parsed = parse_ping_output(windows_output, "google.com");
    assert!(parsed.success);
    assert_eq!(parsed.host, "google.com");
    assert_eq!(parsed.sent, 4);
    assert_eq!(parsed.received, 4);
    assert_eq!(parsed.loss_percent, 0.0);
    assert_eq!(parsed.packet_loss, "0%");
    assert_eq!(parsed.min_latency_ms, Some(12.0));
    assert_eq!(parsed.avg_latency_ms, Some(15.0));
    assert_eq!(parsed.max_latency_ms, Some(18.0));
    assert_eq!(parsed.min_ms, Some(12.0));
    assert_eq!(parsed.avg_ms, Some(15.0));
    assert_eq!(parsed.max_ms, Some(18.0));
    assert_eq!(parsed.latencies.len(), 4);
    assert_eq!(parsed.latencies, vec![14.0, 12.0, 18.0, 16.0]);
}

#[test]
fn test_ping_output_parsing_unix_format() {
    let unix_output = r#"
PING google.com (142.250.185.78) 56(84) bytes of data.
64 bytes from lga34s36-in-f14.1e100.net (142.250.185.78): icmp_seq=1 ttl=117 time=13.4 ms
64 bytes from lga34s36-in-f14.1e100.net (142.250.185.78): icmp_seq=2 ttl=117 time=14.1 ms
64 bytes from lga34s36-in-f14.1e100.net (142.250.185.78): icmp_seq=3 ttl=117 time=12.9 ms
64 bytes from lga34s36-in-f14.1e100.net (142.250.185.78): icmp_seq=4 ttl=117 time=15.2 ms

--- google.com ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 12.900/13.900/15.200/0.850 ms
"#;

    let parsed = parse_ping_output(unix_output, "google.com");
    assert!(parsed.success);
    assert_eq!(parsed.sent, 4);
    assert_eq!(parsed.received, 4);
    assert_eq!(parsed.loss_percent, 0.0);
    assert_eq!(parsed.min_latency_ms, Some(12.9));
    assert_eq!(parsed.avg_latency_ms, Some(13.9));
    assert_eq!(parsed.max_latency_ms, Some(15.2));
}

#[tokio::test]
async fn test_ping_sanitization_rejects_command_injection() {
    let injection_hosts = [
        "google.com; rm -rf /",
        "127.0.0.1 & calc.exe",
        "127.0.0.1 | whoami",
        "127.0.0.1`dir`",
        "-n 100 google.com",
        "host > output.txt",
        "",
    ];

    for bad_host in injection_hosts {
        let result = network_ping(bad_host.to_string(), None).await;
        assert!(!result.success, "Must reject injection attempt: {}", bad_host);
        assert!(result.error.is_some());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TCP PORT SCAN & PROBE TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_tcp_port_probe_real_listener() {
    // Spin up an ephemeral local listener
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("Bind ephemeral port");
    let local_port = listener.local_addr().expect("Local addr").port();

    // Probe open port
    let open_status = probe_single_port("127.0.0.1", local_port, 1000).await;
    assert_eq!(open_status.port, local_port);
    assert!(open_status.open, "Ephemeral listener must be detected as OPEN");

    // Probe closed port (65530 is standard unassigned)
    let closed_status = probe_single_port("127.0.0.1", 65530, 500).await;
    assert_eq!(closed_status.port, 65530);
    assert!(!closed_status.open, "Unbound port must be detected as CLOSED");
}

#[test]
fn test_lookup_service_name_mapping() {
    assert_eq!(lookup_service_name(21), "FTP");
    assert_eq!(lookup_service_name(22), "SSH");
    assert_eq!(lookup_service_name(53), "DNS");
    assert_eq!(lookup_service_name(80), "HTTP");
    assert_eq!(lookup_service_name(443), "HTTPS");
    assert_eq!(lookup_service_name(3306), "MySQL");
    assert_eq!(lookup_service_name(5432), "PostgreSQL");
    assert_eq!(lookup_service_name(6379), "Redis");
    assert_eq!(lookup_service_name(8080), "HTTP-Alt");
    assert_eq!(lookup_service_name(9999), "Unknown");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STRICT SSRF & CLOUD METADATA PROTECTION TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_ssrf_cloud_metadata_blocking() {
    let metadata_hosts = [
        "169.254.169.254",
        "metadata.google.internal",
        "metadata.goog",
        "subdomain.metadata.google.internal",
        "instance-data",
        "instance-data.ec2.internal",
        "100.100.100.200",     // Alibaba
        "168.63.129.16",       // Azure
        "fd00:ec2::254",       // AWS IPv6
        "169.254.1.1",         // Link-local CIDR
        "169.254.255.255",
        "kubernetes.default",
        "kubernetes.default.svc",
    ];

    for host in metadata_hosts {
        assert!(
            is_cloud_metadata_host(host),
            "Failed to detect cloud metadata endpoint: {}",
            host
        );
    }
}

#[test]
fn test_ssrf_alternative_ip_encodings_metadata_blocking() {
    // 169.254.169.254 in alternative encodings
    let alternative_targets = [
        "0251.0376.0251.0376",  // Octal
        "0xa9.0xfe.0xa9.0xfe",  // Dotted Hex
        "2852039166",           // Decimal integer
        "0xa9fea9fe",           // Dword hex
        "0xA9FEA9FE",           // Uppercase Dword hex
    ];

    for alt in alternative_targets {
        let normalized = normalize_numeric_ip(alt);
        assert_eq!(
            normalized,
            Some("169.254.169.254".to_string()),
            "Failed to normalize alternative notation: {}",
            alt
        );
        assert!(
            is_cloud_metadata_host(alt),
            "Failed to block alternative encoded metadata host: {}",
            alt
        );
    }
}

#[test]
fn test_ssrf_rejects_dangerous_protocols() {
    let dangerous_urls = [
        "file:///etc/passwd",
        "file:///C:/Windows/win.ini",
        "gopher://127.0.0.1:70/",
        "ftp://ftp.server.com/secrets",
        "sftp://ftp.server.com/",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "blob:http://localhost/uuid",
        "ws://localhost:8080/stream",
        "wss://localhost:8080/stream",
        "php://filter/resource=index.php",
    ];

    for url in dangerous_urls {
        let res = validate_target_url(url, true);
        assert!(res.is_err(), "Dangerous protocol permitted: {}", url);
        let err = res.err().unwrap();
        assert!(
            err.contains("forbidden") || err.contains("prohibited") || err.contains("not supported"),
            "Error message should mention policy violation: {}",
            err
        );
    }
}

#[test]
fn test_ssrf_private_network_policy_enforcement() {
    assert!(is_private_network_host("localhost"));
    assert!(is_private_network_host("127.0.0.1"));
    assert!(is_private_network_host("10.0.0.1"));
    assert!(is_private_network_host("192.168.1.1"));
    assert!(is_private_network_host("172.16.0.1"));
    assert!(is_private_network_host("172.31.255.255"));
    assert!(!is_private_network_host("8.8.8.8"));
    assert!(!is_private_network_host("1.1.1.1"));
    assert!(!is_private_network_host("api.github.com"));

    // When allow_local is false, private hosts must be rejected
    let res = validate_target_url("http://192.168.1.1/admin", false);
    assert!(res.is_err(), "Must reject private IP when allow_local is false");
    assert!(res.err().unwrap().contains("restricted by policy"));

    // When allow_local is true, private hosts are permitted for local dev
    let res_ok = validate_target_url("http://127.0.0.1:3000/metrics", true);
    assert!(res_ok.is_ok());
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CRLF INJECTION DEFENSE IN HTTP HEADERS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_crlf_header_injection_defense() {
    // 1. CRLF in header key
    let mut bad_keys = HashMap::new();
    bad_keys.insert("X-Header\r\nEvil".to_string(), "valid_val".to_string());
    assert!(validate_and_sanitize_headers(&Some(bad_keys), true).is_err());

    // 2. CRLF in header value (strict mode)
    let mut bad_vals = HashMap::new();
    bad_vals.insert("Content-Type".to_string(), "application/json\r\nSet-Cookie: session=hijacked".to_string());
    assert!(validate_and_sanitize_headers(&Some(bad_vals), true).is_err());

    // 3. Null byte in header name
    let mut null_byte_key = HashMap::new();
    null_byte_key.insert("X-Null\0Byte".to_string(), "val".to_string());
    assert!(validate_and_sanitize_headers(&Some(null_byte_key), true).is_err());

    // 4. Invalid characters in RFC 7230 token header name
    let mut invalid_token = HashMap::new();
    invalid_token.insert("Invalid Header Name with Spaces".to_string(), "val".to_string());
    assert!(validate_and_sanitize_headers(&Some(invalid_token), true).is_err());

    // 5. Valid RFC 7230 headers
    let mut valid_headers = HashMap::new();
    valid_headers.insert("Content-Type".to_string(), "application/json".to_string());
    valid_headers.insert("Authorization".to_string(), "Bearer token-123".to_string());
    valid_headers.insert("X-Request-Id".to_string(), "req-456".to_string());

    let sanitized = validate_and_sanitize_headers(&Some(valid_headers), true).expect("Valid headers");
    assert_eq!(sanitized.get("Content-Type").unwrap(), "application/json");
    assert_eq!(sanitized.get("Authorization").unwrap(), "Bearer token-123");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SSL CERTIFICATE INSPECTION UTILITY TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_ssl_cert_fingerprint_sha256_format() {
    let dummy_cert_bytes = b"MOCK_CERTIFICATE_DER_BYTES_FOR_FINGERPRINT_VERIFICATION";
    let fp = format_fingerprint_sha256(dummy_cert_bytes);

    // Must be 32 colon-separated two-digit uppercase hex values (32 * 2 + 31 = 95 chars)
    assert_eq!(fp.len(), 95);
    let parts: Vec<&str> = fp.split(':').collect();
    assert_eq!(parts.len(), 32);
    for part in parts {
        assert_eq!(part.len(), 2);
        assert!(part.chars().all(|c| c.is_ascii_hexdigit() && !c.is_lowercase()));
    }
}
