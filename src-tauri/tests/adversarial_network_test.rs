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

//! Adversarial Verification Suite for Milestone M4:
//! SSRF, CRLF & Command Injection Defense.
//!
//! Empirically challenges:
//! 1. SSRF Filter: Cloud metadata endpoints in all notations (decimal, hex, octal, IPv6, IPv4-mapped)
//!    and verifies unconditional blocking even when allow_local is true.
//! 2. Dangerous Protocol Validation: Rejection of file://, gopher://, ftp://, javascript:, data:, etc.
//! 3. CRLF & Null Byte Injection: Rejection of \r, \n, \0 in header names and values.
//! 4. Ping Command Injection: Host strings with ;, |, `, &, &&, ||, $, <, >, quotes, argument injection.
//! 5. Port Watchdog Boundaries: Protection of PID 0, 4, negatives, self, and integers > 2147483647.

use std::collections::HashMap;
use zendev_tauri_lib::net_dispatcher::*;
use zendev_tauri_lib::network::*;
use zendev_tauri_lib::port_watchdog::*;

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADVERSARIAL SSRF FILTER CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_ssrf_mandatory_metadata_targets_blocked() {
    // The exact targets specified in Challenger Task 1:
    // 169.254.169.254, 169.254.0.1, metadata.google.internal,
    // decimal 2852039166, hex 0xa9fea9fe, octal 0251.0376.0251.0376
    let mandatory_targets = [
        "169.254.169.254",
        "169.254.0.1",
        "metadata.google.internal",
        "2852039166",
        "0xa9fea9fe",
        "0251.0376.0251.0376",
    ];

    for target in mandatory_targets {
        // Direct host evaluation
        assert!(
            is_cloud_metadata_host(target),
            "Mandatory target MUST be identified as cloud metadata: {}",
            target
        );

        // URL evaluation with allow_local = true (unconditional block)
        let test_url = format!("http://{}/computeMetadata/v1/", target);
        let res_allow_local = validate_target_url(&test_url, true);
        assert!(
            res_allow_local.is_err(),
            "URL with target '{}' must be blocked unconditionally even when allow_local is true",
            target
        );
        let err_msg = res_allow_local.unwrap_err();
        assert!(
            err_msg.contains("SSRF Security Alert") || err_msg.contains("cloud metadata"),
            "Error message must indicate SSRF/metadata violation for '{}': got {}",
            target,
            err_msg
        );

        // URL evaluation with allow_local = false
        let res_no_local = validate_target_url(&test_url, false);
        assert!(
            res_no_local.is_err(),
            "URL with target '{}' must be blocked when allow_local is false",
            target
        );
    }
}

#[test]
fn test_adversarial_ssrf_extended_cloud_metadata_matrix() {
    let extended_cloud_targets = [
        // AWS / OpenStack / DigitalOcean / Azure IMDS
        "169.254.169.254",
        "169.254.169.250",
        "169.254.169.251",
        "169.254.169.253",
        "169.254.0.1",
        "169.254.255.254",
        "instance-data",
        "instance-data.ec2.internal",
        // GCP
        "metadata.google.internal",
        "metadata.goog",
        "subdomain.metadata.google.internal",
        "nested.subdomain.metadata.goog",
        // Alibaba
        "100.100.100.200",
        // Azure
        "168.63.129.16",
        // AWS IPv6 IMDS
        "fd00:ec2::254",
        // Kubernetes in-cluster API
        "kubernetes.default",
        "kubernetes.default.svc",
        "kubernetes.default.svc.cluster.local",
    ];

    for target in extended_cloud_targets {
        assert!(
            is_cloud_metadata_host(target),
            "Extended target must be detected as cloud metadata: {}",
            target
        );
    }
}

#[test]
fn test_adversarial_ssrf_alternative_ip_encodings_normalization() {
    // 169.254.169.254 in diverse encodings
    let test_cases = [
        ("0251.0376.0251.0376", "169.254.169.254"),
        ("0xa9.0xfe.0xa9.0xfe", "169.254.169.254"),
        ("0xA9.0xFE.0xA9.0xFE", "169.254.169.254"),
        ("2852039166", "169.254.169.254"),
        ("0xa9fea9fe", "169.254.169.254"),
        ("0xA9FEA9FE", "169.254.169.254"),
        // 169.254.0.1 in decimal (169*2^24 + 254*2^16 + 0*2^8 + 1 = 2851995649)
        ("2851995649", "169.254.0.1"),
        // 169.254.0.1 in hex (0xa9fe0001)
        ("0xa9fe0001", "169.254.0.1"),
    ];

    for (encoded, expected_dotted) in test_cases {
        let normalized = normalize_numeric_ip(encoded);
        assert_eq!(
            normalized,
            Some(expected_dotted.to_string()),
            "Failed to normalize alternative notation: {}",
            encoded
        );
        assert!(
            is_cloud_metadata_host(encoded),
            "Alternative encoded host must be detected as metadata host: {}",
            encoded
        );
    }
}

#[test]
fn test_adversarial_ssrf_ipv6_link_local_and_mapped() {
    let ipv6_link_local = [
        "fe80::1",
        "fe80::dead:beef",
        "fe90::1",
        "fea0::1",
        "feb0::1",
        "::ffff:169.254.169.254",
        "0:0:0:0:0:ffff:169.254.169.254",
    ];

    for host in ipv6_link_local {
        assert!(
            is_cloud_metadata_host(host),
            "IPv6 link-local or mapped address must be blocked: {}",
            host
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADVERSARIAL PROTOCOL VALIDATION CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_protocol_validation_mandatory_rejections() {
    // Task 1 required protocols: file://, gopher://, ftp://, javascript:, data:
    let dangerous_urls = [
        "file:///etc/passwd",
        "file:///C:/Windows/System32/drivers/etc/hosts",
        "file://localhost/etc/shadow",
        "gopher://127.0.0.1:70/",
        "gopher://attacker.com:70/1_menu",
        "ftp://ftp.server.com/private/passwords.txt",
        "ftp://anonymous:guest@10.0.0.1/",
        "javascript:alert(document.cookie)",
        "javascript:void(0)",
        "data:text/html,<script>alert(1)</script>",
        "data:text/plain;base64,SGVsbG8=",
        // Extended dangerous schemes
        "sftp://ftp.example.com/",
        "blob:http://localhost:3000/d7e4b2d1",
        "ws://localhost:8080/socket",
        "wss://secure.internal/stream",
        "php://filter/read=convert.base64-encode/resource=index.php",
        "ldap://localhost:389/dc=example,dc=com",
        "ldaps://secure.directory:636/",
        "dict://dict.org/d:word",
        "jar:http://evil.com/app.jar!/entry",
        "view-source:https://google.com",
    ];

    for url in dangerous_urls {
        let res = validate_target_url(url, true);
        assert!(
            res.is_err(),
            "Dangerous protocol URL MUST be rejected: {}",
            url
        );
        let err_msg = res.unwrap_err();
        assert!(
            err_msg.contains("forbidden")
                || err_msg.contains("prohibited")
                || err_msg.contains("not supported")
                || err_msg.contains("restricted"),
            "Error for '{}' must clearly indicate security violation: got '{}'",
            url,
            err_msg
        );
    }
}

#[test]
fn test_adversarial_control_characters_in_target_url() {
    let tainted_urls = [
        "http://google.com/\x00evil",
        "http://google.com/\r\nHeader: injection",
        "http://google.com/\x1Ftest",
        "http://google.com/\x7Ftest",
        "",
        "   ",
    ];

    for tainted in tainted_urls {
        let res = validate_target_url(tainted, true);
        assert!(
            res.is_err(),
            "Target URL with control characters or empty must be rejected: {:?}",
            tainted
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADVERSARIAL CRLF INJECTION DEFENSE CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_crlf_in_header_names() {
    let bad_names = [
        "X-Header\r\nInjected: malicious",
        "X-Header\rInjected",
        "X-Header\nInjected",
        "X-Null\0Byte",
        "Header With Spaces",
        "Header:WithColon",
        "Header;WithSemicolon",
        "Header(WithParens)",
        "Header[WithBrackets]",
        "Header=WithValue",
        "Header/Slash",
        "Header?Question",
        "Header@At",
    ];

    for bad_name in bad_names {
        let mut map = HashMap::new();
        map.insert(bad_name.to_string(), "safe_value".to_string());

        let res_strict = validate_and_sanitize_headers(&Some(map.clone()), true);
        assert!(
            res_strict.is_err(),
            "Strict validation MUST reject illegal header name: {:?}",
            bad_name
        );

        let res_non_strict = validate_and_sanitize_headers(&Some(map), false);
        assert!(
            res_non_strict.is_err(),
            "Non-strict validation MUST STILL reject illegal header name: {:?}",
            bad_name
        );
    }
}

#[test]
fn test_adversarial_crlf_in_header_values() {
    let injection_values = [
        "application/json\r\nSet-Cookie: session=hijacked",
        "text/html\r\n\r\n<html>evil</html>",
        "bearer-token\rEvil-Header: value",
        "value\nInjected-Header: evil",
        "value\0truncated",
    ];

    for bad_val in injection_values {
        let mut map = HashMap::new();
        map.insert("X-Custom-Header".to_string(), bad_val.to_string());

        // In strict mode, CRLF or null bytes MUST result in Err
        let res_strict = validate_and_sanitize_headers(&Some(map.clone()), true);
        assert!(
            res_strict.is_err(),
            "Strict mode MUST reject header value with CRLF or null byte: {:?}",
            bad_val
        );

        // In non-strict mode, CRLF and null bytes MUST be stripped
        let res_sanitized = validate_and_sanitize_headers(&Some(map), false);
        assert!(
            res_sanitized.is_ok(),
            "Non-strict mode should sanitize header value: {:?}",
            bad_val
        );
        let sanitized_map = res_sanitized.unwrap();
        let cleaned = sanitized_map.get("X-Custom-Header").unwrap();
        assert!(
            !cleaned.contains('\r') && !cleaned.contains('\n') && !cleaned.contains('\0'),
            "Sanitized value must NOT contain \\r, \\n, or \\0: got {:?}",
            cleaned
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADVERSARIAL PING COMMAND INJECTION CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_adversarial_ping_command_injection_defense() {
    // Attempt host strings with semicolons, pipes, backticks, & operators
    let injection_vectors = [
        // Semicolons
        "google.com; rm -rf /",
        "127.0.0.1; calc.exe",
        "; whoami",
        // Pipes
        "google.com | whoami",
        "127.0.0.1 || dir",
        "| id",
        // Backticks
        "127.0.0.1`dir`",
        "`whoami`",
        "google.com`calc`",
        // Ampersands
        "google.com & calc.exe",
        "127.0.0.1 && whoami",
        "& dir",
        // Command substitution & expansion
        "$(whoami)",
        "$HOME",
        "${IFS}",
        // Redirection
        "127.0.0.1 > output.txt",
        "127.0.0.1 < input.txt",
        ">> append.log",
        // Quotes
        "google.com\"calc.exe",
        "127.0.0.1'whoami",
        // Argument injection
        "-n 100 127.0.0.1",
        "-c 50 127.0.0.1",
        "-t 127.0.0.1",
        "--help",
        // Control characters
        "127.0.0.1\r\nwhoami",
        "127.0.0.1\nwhoami",
        "127.0.0.1\tcalc",
        // Empty
        "",
        "   ",
    ];

    for vector in injection_vectors {
        let result = network_ping(vector.to_string(), None).await;
        assert!(
            !result.success,
            "Ping MUST fail and reject command injection host: {:?}",
            vector
        );
        assert!(
            result.error.is_some(),
            "Ping result must contain error for vector: {:?}",
            vector
        );
        let err = result.error.unwrap();
        assert!(
            err.contains("shell metacharacters prohibited")
                || err.contains("Host cannot be empty")
                || err.contains("Failed to execute ping"),
            "Error for '{:?}' must explain prohibition: got '{}'",
            vector,
            err
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADVERSARIAL PORT WATCHDOG PID BOUNDARY CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_port_watchdog_pid_boundaries() {
    // 1. System Idle (PID 0)
    assert!(
        validate_killable_pid(0).is_err(),
        "Must reject PID 0 (System Idle)"
    );

    // 2. Kernel and protected system processes (PID <= 4)
    assert!(
        validate_killable_pid(1).is_err(),
        "Must reject PID 1 (Init / System)"
    );
    assert!(
        validate_killable_pid(2).is_err(),
        "Must reject PID 2 (Protected)"
    );
    assert!(
        validate_killable_pid(3).is_err(),
        "Must reject PID 3 (Protected)"
    );
    assert!(
        validate_killable_pid(4).is_err(),
        "Must reject PID 4 (System Kernel)"
    );

    // 3. Negative PIDs
    assert!(
        validate_killable_pid(-1).is_err(),
        "Must reject negative PID -1"
    );
    assert!(
        validate_killable_pid(-9999).is_err(),
        "Must reject negative PID -9999"
    );
    assert!(
        validate_killable_pid(i64::MIN).is_err(),
        "Must reject minimum i64"
    );

    // 4. Self PID
    let current_pid = std::process::id() as i64;
    assert!(
        validate_killable_pid(current_pid).is_err(),
        "Must reject ZenDev own PID ({})",
        current_pid
    );

    // 5. Exceeding 32-bit positive integer (2,147,483,647)
    assert!(
        validate_killable_pid(2_147_483_648).is_err(),
        "Must reject PID 2^31"
    );
    assert!(
        validate_killable_pid(4_294_967_295).is_err(),
        "Must reject PID 2^32 - 1"
    );
    assert!(
        validate_killable_pid(i64::MAX).is_err(),
        "Must reject maximum i64"
    );

    // 6. Legitimate user PID within legal bounds
    assert_eq!(validate_killable_pid(12345), Ok(12345));
    assert_eq!(validate_killable_pid(65535), Ok(65535));
}
