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
//! Port Watchdog, Process Termination Boundaries & Network Diagnostics.
//!
//! Empirically challenges:
//! 1. Process termination boundary guardrails (PID 0, 4, negative, self PID, > i32::MAX).
//! 2. Netstat output parsing across IPv4, IPv6 bracketed addresses, UDP stateless, and process mapping.
//! 3. Concurrent TCP port scanning reachability, timeout limits, and input guardrails.
//! 4. TLS certificate inspection, SHA-256 fingerprint extraction, and handshake failure resilience.

use std::collections::HashMap;
use std::time::Duration;
use tokio::net::TcpListener;
use zendev_tauri_lib::network::*;
use zendev_tauri_lib::port_watchdog::*;

// ─────────────────────────────────────────────────────────────────────────────
// 1. PID BOUNDARY CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_pid_boundaries_validate_killable_pid() {
    // A. Protected Kernel & System Idle PIDs
    assert!(validate_killable_pid(0).is_err(), "Must reject PID 0 (System Idle)");
    assert_eq!(
        validate_killable_pid(0).err().unwrap(),
        "PID cannot be 0 or negative."
    );

    for protected_pid in 1..=4 {
        let err = validate_killable_pid(protected_pid);
        assert!(err.is_err(), "Must reject protected PID {}", protected_pid);
        assert_eq!(
            err.err().unwrap(),
            "System kernel and idle processes (PID <= 4) are strictly protected."
        );
    }

    // B. Negative PIDs
    let negative_pids = [-1, -4, -100, -99999, i64::MIN];
    for neg in negative_pids {
        let err = validate_killable_pid(neg);
        assert!(err.is_err(), "Must reject negative PID {}", neg);
        assert_eq!(err.err().unwrap(), "PID cannot be 0 or negative.");
    }

    // C. Self PID (ZenDev main process suicide prevention)
    let self_pid = std::process::id() as i64;
    let self_err = validate_killable_pid(self_pid);
    assert!(self_err.is_err(), "Must reject self process PID {}", self_pid);
    assert_eq!(
        self_err.err().unwrap(),
        "ZenDev cannot terminate its own process."
    );

    // D. Integer boundary overflow (> 2,147,483,647 / i32::MAX)
    let overflow_pids = [
        2_147_483_648i64,
        3_000_000_000i64,
        9_999_999_999i64,
        i64::MAX,
    ];
    for of_pid in overflow_pids {
        let err = validate_killable_pid(of_pid);
        assert!(err.is_err(), "Must reject overflow PID {}", of_pid);
        assert_eq!(
            err.err().unwrap(),
            "PID exceeds maximum 32-bit positive integer range (2147483647)."
        );
    }

    // E. Legitimate safe user PIDs
    assert_eq!(validate_killable_pid(5), Ok(5));
    assert_eq!(validate_killable_pid(12345), Ok(12345));
    assert_eq!(validate_killable_pid(2_147_483_647), Ok(2_147_483_647));
}

#[tokio::test]
async fn test_adversarial_port_kill_process_command_boundaries() {
    let forbidden_pids = [
        0,
        1,
        2,
        3,
        4,
        -1,
        -100,
        i64::MIN,
        std::process::id() as i64,
        2_147_483_648i64,
        i64::MAX,
    ];

    for pid in forbidden_pids {
        let result = port_kill_process(pid).await;
        assert!(
            result.is_err(),
            "port_kill_process must safely reject forbidden PID {}",
            pid
        );
        let err_msg = result.err().unwrap();
        assert!(
            err_msg.contains("Sistem kritik işlemleri, çekirdek (PID 0/4) veya ZenDev ana süreci sonlandırılamaz"),
            "Error message for PID {} must state security protection, got: {}",
            pid,
            err_msg
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NETSTAT OUTPUT PARSING & PROCESS MAPPING
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_netstat_parsing_complex_topologies() {
    let complex_netstat = r#"
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       984
  TCP    [::]:8080              [::]:0                 LISTENING       1234
  TCP    [::1]:5432             [::]:0                 LISTENING       4567
  UDP    0.0.0.0:53             *:*                                    2020
  UDP    [::]:5353              *:*                                    3030
  TCP    192.168.1.50:52410     142.250.185.78:443     ESTABLISHED     7890
  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       0

  # Malformed lines and noise to stress-test parser resilience
  TCP    corrupted_addr         0.0.0.0:0              LISTENING       9999
  UDP    0.0.0.0:not_a_port     *:*                                    8888
  GARBAGE LINE THAT SHOULD BE SAFELY SKIPPED
"#;

    let mut pid_map = HashMap::new();
    pid_map.insert(984, "svchost.exe".to_string());
    pid_map.insert(1234, "node.exe".to_string());
    pid_map.insert(4567, "postgres.exe".to_string());
    pid_map.insert(2020, "dnsmasq".to_string());
    pid_map.insert(3030, "mDNSResponder.exe".to_string());
    pid_map.insert(7890, "chrome.exe".to_string());

    let entries = parse_netstat_output(complex_netstat, &pid_map);

    // 8 valid entries should be parsed: ports 53, 80, 135, 3000, 5353, 5432, 8080, 52410
    assert_eq!(entries.len(), 8, "Expected 8 valid parsed port entries");

    // Verify IPv6 bracket parsing
    let entry_8080 = entries.iter().find(|e| e.local_port == 8080).expect("Port 8080");
    assert_eq!(entry_8080.protocol, "TCP");
    assert_eq!(entry_8080.local_address, "[::]:8080");
    assert_eq!(entry_8080.state, "LISTENING");
    assert_eq!(entry_8080.pid, 1234);
    assert_eq!(entry_8080.process_name, "node.exe");

    let entry_5432 = entries.iter().find(|e| e.local_port == 5432).expect("Port 5432");
    assert_eq!(entry_5432.local_address, "[::1]:5432");
    assert_eq!(entry_5432.pid, 4567);
    assert_eq!(entry_5432.process_name, "postgres.exe");

    // Verify UDP stateless parsing
    let entry_53 = entries.iter().find(|e| e.local_port == 53).expect("Port 53");
    assert_eq!(entry_53.protocol, "UDP");
    assert_eq!(entry_53.state, "STATELESS");
    assert_eq!(entry_53.pid, 2020);
    assert_eq!(entry_53.process_name, "dnsmasq");

    let entry_5353 = entries.iter().find(|e| e.local_port == 5353).expect("Port 5353");
    assert_eq!(entry_5353.protocol, "UDP");
    assert_eq!(entry_5353.local_address, "[::]:5353");
    assert_eq!(entry_5353.process_name, "mDNSResponder.exe");

    // Verify System Kernel PID 4 fallback name
    let entry_80 = entries.iter().find(|e| e.local_port == 80).expect("Port 80");
    assert_eq!(entry_80.pid, 4);
    assert_eq!(entry_80.process_name, "System Kernel");

    // Verify System Idle PID 0 fallback name
    let entry_3000 = entries.iter().find(|e| e.local_port == 3000).expect("Port 3000");
    assert_eq!(entry_3000.pid, 0);
    assert_eq!(entry_3000.process_name, "System Idle Process");

    // Verify ESTABLISHED connection with foreign port
    let entry_52410 = entries.iter().find(|e| e.local_port == 52410).expect("Port 52410");
    assert_eq!(entry_52410.state, "ESTABLISHED");
    assert_eq!(entry_52410.foreign_address, "142.250.185.78:443");
    assert_eq!(entry_52410.foreign_port, 443);

    // Verify ascending sort by local_port
    for i in 0..entries.len() - 1 {
        assert!(
            entries[i].local_port <= entries[i + 1].local_port,
            "Entries must be sorted by port: {} <= {}",
            entries[i].local_port,
            entries[i + 1].local_port
        );
    }
}

#[tokio::test]
async fn test_adversarial_live_scan_active_ports_system_call() {
    let result = scan_active_ports_internal().await;
    assert!(result.is_ok(), "Live scan_active_ports_internal must succeed");
    let ports = result.unwrap();

    // On Windows or any modern OS, there are always active listening ports
    assert!(!ports.is_empty(), "Live ports scan returned no entries");

    // Ensure all parsed entries have valid ports and non-empty metadata
    for entry in &ports {
        assert!(entry.local_port > 0, "Port must be positive");
        assert!(entry.protocol == "TCP" || entry.protocol == "UDP");
        assert!(!entry.local_address.is_empty());
        assert!(!entry.process_name.is_empty());
    }

    // Verify sort order
    for i in 0..ports.len() - 1 {
        assert!(ports[i].local_port <= ports[i + 1].local_port);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCURRENT TCP PORT SCANNER REACHABILITY & TIMEOUTS
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_adversarial_tcp_port_scanner_reachability_and_timeouts() {
    // 1. Ephemeral server
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Bind ephemeral listener");
    let open_port = listener.local_addr().unwrap().port();

    // Unassigned closed port
    let closed_port = 65531u16;

    // Probe single open port
    let status_open = probe_single_port("127.0.0.1", open_port, 1000).await;
    assert_eq!(status_open.port, open_port);
    assert!(status_open.open, "Ephemeral listener must probe as open");

    // Probe single closed port
    let status_closed = probe_single_port("127.0.0.1", closed_port, 500).await;
    assert_eq!(status_closed.port, closed_port);
    assert!(!status_closed.open, "Unbound port must probe as closed");

    // Verify timeout enforcement: probing an unroutable IP must terminate within duration
    let start = std::time::Instant::now();
    let _timeout_status = probe_single_port("192.0.2.1", 80, 200).await; // 192.0.2.0/24 TEST-NET-1 (unroutable)
    let elapsed = start.elapsed();
    assert!(
        elapsed < Duration::from_millis(1500),
        "Timeout probe must be bounded, took {:?}",
        elapsed
    );

    // 2. Multi-port concurrent scan via `network_port_scan`
    let scan_res = network_port_scan("127.0.0.1".to_string(), vec![open_port, closed_port, 80, 443]).await;
    assert!(scan_res.success);
    assert_eq!(scan_res.ports.len(), 4);

    let res_open = scan_res.ports.iter().find(|p| p.port == open_port).unwrap();
    assert!(res_open.open);

    let res_closed = scan_res.ports.iter().find(|p| p.port == closed_port).unwrap();
    assert!(!res_closed.open);

    let res_80 = scan_res.ports.iter().find(|p| p.port == 80).unwrap();
    assert_eq!(res_80.service, "HTTP");

    let res_443 = scan_res.ports.iter().find(|p| p.port == 443).unwrap();
    assert_eq!(res_443.service, "HTTPS");

    // 3. Boundary guardrails on `network_port_scan`
    // Empty host
    let res_empty_host = network_port_scan("".to_string(), vec![80]).await;
    assert!(!res_empty_host.success);
    assert_eq!(res_empty_host.error.unwrap(), "Host cannot be empty");

    // Empty ports
    let res_empty_ports = network_port_scan("127.0.0.1".to_string(), vec![]).await;
    assert!(!res_empty_ports.success);
    assert_eq!(res_empty_ports.error.unwrap(), "No ports specified");

    // Too many ports (> 100)
    let too_many_ports: Vec<u16> = (1..=101).collect();
    let res_over_limit = network_port_scan("127.0.0.1".to_string(), too_many_ports).await;
    assert!(!res_over_limit.success);
    assert_eq!(res_over_limit.error.unwrap(), "Maximum 100 ports per scan");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TLS CERTIFICATE INSPECTOR & SHA-256 FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_adversarial_ssl_cert_fingerprint_test_vector() {
    // Known SHA-256 test vector:
    // SHA256 of empty bytes "" is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    let empty_fp = format_fingerprint_sha256(b"");
    assert_eq!(
        empty_fp,
        "E3:B0:C4:42:98:FC:1C:14:9A:FB:F4:C8:99:6F:B9:24:27:AE:41:E4:64:9B:93:4C:A4:95:99:1B:78:52:B8:55"
    );

    // Known test vector 2: "ZenDev"
    // sha256("ZenDev") = 6f0917d8960446165d48c5547f785df85a03bd188c1a5eca94ba3f86372d8b0c
    let zendev_fp = format_fingerprint_sha256(b"ZenDev");
    assert_eq!(
        zendev_fp,
        "6F:09:17:D8:96:04:46:16:5D:48:C5:54:7F:78:5D:F8:5A:03:BD:18:8C:1A:5E:CA:94:BA:3F:86:37:2D:8B:0C"
    );
}

#[tokio::test]
async fn test_adversarial_ssl_cert_inspector_failure_modes() {
    // 1. Non-TLS endpoint inspection resilience:
    // Connect to a plain TCP listener that does not speak TLS. Must not panic or hang.
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let plain_port = listener.local_addr().unwrap().port();

    tokio::spawn(async move {
        if let Ok((mut socket, _)) = listener.accept().await {
            use tokio::io::AsyncWriteExt;
            let _ = socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n").await;
        }
    });

    let res = network_ssl_inspect("127.0.0.1".to_string(), Some(plain_port)).await;
    assert!(!res.success, "Must fail gracefully on non-TLS server");
    assert!(res.error.is_some());
    let err_str = res.error.unwrap();
    assert!(
        err_str.contains("TLS handshake failed") || err_str.contains("failed") || err_str.contains("closed"),
        "Unexpected error message: {}",
        err_str
    );

    // 2. Closed port inspection:
    let closed_res = network_ssl_inspect("127.0.0.1".to_string(), Some(65532)).await;
    assert!(!closed_res.success);
    assert!(closed_res.error.unwrap().contains("failed"));

    // 3. Empty host:
    let empty_res = network_ssl_inspect("".to_string(), Some(443)).await;
    assert!(!empty_res.success);
    assert_eq!(empty_res.error.unwrap(), "Host cannot be empty");

    // 4. Invalid DNS name for SNI:
    let invalid_sni_res = network_ssl_inspect("..invalid..host..".to_string(), Some(443)).await;
    assert!(!invalid_sni_res.success);
    assert!(invalid_sni_res.error.unwrap().contains("Invalid DNS name"));
}

#[tokio::test]
async fn test_adversarial_ssl_cert_inspector_live_or_graceful() {
    // Attempt real TLS inspection to public host
    let res = network_ssl_inspect("https://google.com/test".to_string(), Some(443)).await;
    if res.success {
        // If internet connection is present, verify parsed fields
        assert_eq!(res.host, "google.com");
        assert_eq!(res.port, 443);
        assert!(res.fingerprint256.is_some());
        let fp = res.fingerprint256.unwrap();
        assert_eq!(fp.len(), 95);
        assert_eq!(fp.split(':').count(), 32);

        assert!(res.subject.is_some());
        assert!(res.issuer.is_some());
        assert!(res.valid_from.is_some());
        assert!(res.valid_to.is_some());
        assert!(res.days_remaining.unwrap_or(0) > 0);
        assert_eq!(res.is_expired, Some(false));
        assert!(!res.sans.is_empty());
    } else {
        // If offline, ensure it failed gracefully with a descriptive error string
        assert!(res.error.is_some());
    }
}
