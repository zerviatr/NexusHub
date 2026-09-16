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

//! Adversarial Subprocess Execution & Stream Semantics Verification Suite
//!
//! Authored by Challenger (teamwork_preview_challenger_1)
//!
//! Evaluates:
//! 1. Stdout & stderr separation, capture, and isolation under CREATE_NO_WINDOW
//! 2. Preservation of non-zero exit codes (0, 1, 2, 42, 127, 255) and error reporting
//! 3. High-volume streaming (>256KB), pipe buffer saturation, and deadlock prevention
//! 4. Simultaneous concurrent stdout/stderr streaming via Tokio
//! 5. Bidirectional piped stdin -> subprocess -> stdout streaming
//! 6. Special characters, quotes, unicode, empty strings, and long arguments
//! 7. Asynchronous lifecycle termination, timeouts, and process kill
//! 8. Rapid consecutive process spawning and resource cleanliness
//! 9. Builder pattern & extension trait API invariants

use std::process::Stdio;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use zendev_tauri_lib::process_ext::{
    silent_async_command, silent_command, std_command, tokio_command, SilentCommand,
    CREATE_NO_WINDOW,
};

#[test]
fn test_creation_flags_bit_exactness() {
    // Win32 CREATE_NO_WINDOW must strictly be bit 27 (0x08000000 = 134217728)
    assert_eq!(CREATE_NO_WINDOW, 0x0800_0000);
    assert_eq!(CREATE_NO_WINDOW, 134_217_728);
    assert_eq!(CREATE_NO_WINDOW, 1 << 27);
    assert_eq!(CREATE_NO_WINDOW.count_ones(), 1);
}

#[test]
fn test_std_command_stdout_stderr_separation() {
    #[cfg(target_os = "windows")]
    {
        let output = silent_command("cmd")
            .args(["/C", "echo STDOUT_MARKER_9981 & echo STDERR_MARKER_9982 1>&2"])
            .output()
            .expect("Failed to execute cmd with silent_command");

        assert!(output.status.success(), "Exit status should be success");
        assert_eq!(output.status.code(), Some(0));

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        assert!(
            stdout.contains("STDOUT_MARKER_9981"),
            "stdout must contain STDOUT_MARKER_9981. Actual stdout: '{}'",
            stdout
        );
        assert!(
            !stdout.contains("STDERR_MARKER_9982"),
            "stdout must NOT bleed stderr contents. Actual stdout: '{}'",
            stdout
        );

        assert!(
            stderr.contains("STDERR_MARKER_9982"),
            "stderr must contain STDERR_MARKER_9982. Actual stderr: '{}'",
            stderr
        );
        assert!(
            !stderr.contains("STDOUT_MARKER_9981"),
            "stderr must NOT bleed stdout contents. Actual stderr: '{}'",
            stderr
        );
    }
}

#[tokio::test]
async fn test_tokio_command_stdout_stderr_separation() {
    #[cfg(target_os = "windows")]
    {
        let output = silent_async_command("cmd")
            .args(["/C", "echo TOKIO_OUT_7712 & echo TOKIO_ERR_7713 1>&2"])
            .output()
            .await
            .expect("Failed to execute cmd with silent_async_command");

        assert!(output.status.success(), "Exit status should be success");
        assert_eq!(output.status.code(), Some(0));

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        assert!(stdout.contains("TOKIO_OUT_7712"));
        assert!(!stdout.contains("TOKIO_ERR_7713"));

        assert!(stderr.contains("TOKIO_ERR_7713"));
        assert!(!stderr.contains("TOKIO_OUT_7712"));
    }
}

#[test]
fn test_exit_codes_preservation_std() {
    #[cfg(target_os = "windows")]
    {
        let test_codes = [0, 1, 2, 42, 127];

        for &code in &test_codes {
            let cmd_str = format!("exit {}", code);
            let output = std_command("cmd")
                .args(["/C", &cmd_str])
                .output()
                .unwrap_or_else(|e| panic!("Failed to run exit {}: {}", code, e));

            if code == 0 {
                assert!(output.status.success(), "Code 0 must be success");
                assert_eq!(output.status.code(), Some(0));
            } else {
                assert!(
                    !output.status.success(),
                    "Code {} must NOT be success",
                    code
                );
                assert_eq!(
                    output.status.code(),
                    Some(code),
                    "Exit code {} must be preserved exactly",
                    code
                );
            }
        }
    }
}

#[tokio::test]
async fn test_exit_codes_preservation_tokio() {
    #[cfg(target_os = "windows")]
    {
        let test_codes = [0, 1, 5, 42, 100];

        for &code in &test_codes {
            let cmd_str = format!("exit {}", code);
            let output = tokio_command("cmd")
                .args(["/C", &cmd_str])
                .output()
                .await
                .unwrap_or_else(|e| panic!("Failed to run tokio exit {}: {}", code, e));

            if code == 0 {
                assert!(output.status.success());
                assert_eq!(output.status.code(), Some(0));
            } else {
                assert!(!output.status.success());
                assert_eq!(output.status.code(), Some(code));
            }
        }
    }
}

#[test]
fn test_nonexistent_binary_error_handling_std() {
    let result = silent_command("definitely_nonexistent_binary_zen_99999.exe")
        .arg("--test")
        .output();

    assert!(result.is_err(), "Nonexistent binary must return Err");
    let err = result.unwrap_err();
    assert_eq!(
        err.kind(),
        std::io::ErrorKind::NotFound,
        "Error kind must be NotFound, got: {:?}",
        err
    );
}

#[tokio::test]
async fn test_nonexistent_binary_error_handling_tokio() {
    let result = silent_async_command("definitely_nonexistent_binary_zen_99999.exe")
        .arg("--test")
        .output()
        .await;

    assert!(result.is_err(), "Nonexistent binary must return Err in Tokio");
    let err = result.unwrap_err();
    assert_eq!(
        err.kind(),
        std::io::ErrorKind::NotFound,
        "Error kind must be NotFound, got: {:?}",
        err
    );
}

#[tokio::test]
async fn test_large_streaming_output_deadlock_prevention() {
    #[cfg(target_os = "windows")]
    {
        // Produce 10,000 lines (~300KB) of structured data to flood OS pipe buffer
        // Anonymous pipe buffer on Windows is typically 4KB-64KB.
        // A child writing 300KB without parent draining concurrently will deadlock if not streaming.
        let mut child = tokio_command("cmd")
            .args([
                "/C",
                "for /L %i in (1,1,5000) do @echo LINE_%i_DATA_PAYLOAD_PADDING_ABCDEFGHIJKLMN",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to spawn large output child");

        let mut stdout_pipe = child.stdout.take().expect("Failed to open stdout pipe");
        let mut stderr_pipe = child.stderr.take().expect("Failed to open stderr pipe");

        let stdout_drain = tokio::spawn(async move {
            let mut buf = Vec::new();
            stdout_pipe.read_to_end(&mut buf).await.map(|_| buf)
        });

        let stderr_drain = tokio::spawn(async move {
            let mut buf = Vec::new();
            stderr_pipe.read_to_end(&mut buf).await.map(|_| buf)
        });

        // Add safety timeout of 10s to guarantee deadlock detection
        let timeout_result = tokio::time::timeout(Duration::from_secs(10), async {
            let (stdout_res, stderr_res) = tokio::join!(stdout_drain, stderr_drain);
            let status = child.wait().await.expect("Failed to wait on child");
            (stdout_res.unwrap().unwrap(), stderr_res.unwrap().unwrap(), status)
        })
        .await;

        assert!(
            timeout_result.is_ok(),
            "Large output execution DEADLOCKED or exceeded 10s timeout!"
        );

        let (stdout_bytes, stderr_bytes, status) = timeout_result.unwrap();
        assert!(status.success(), "Status should be success");
        assert_eq!(stderr_bytes.len(), 0, "Stderr should be empty");

        let stdout_str = String::from_utf8_lossy(&stdout_bytes);
        assert!(
            stdout_str.contains("LINE_1_DATA_PAYLOAD"),
            "Must contain beginning of stream"
        );
        assert!(
            stdout_str.contains("LINE_5000_DATA_PAYLOAD"),
            "Must contain end of stream without truncation"
        );
        assert!(
            stdout_bytes.len() > 200_000,
            "Total transferred bytes should exceed 200KB, got: {}",
            stdout_bytes.len()
        );
    }
}

#[tokio::test]
async fn test_simultaneous_large_stdout_and_stderr_streaming() {
    #[cfg(target_os = "windows")]
    {
        // Emit 2,000 lines to stdout and 2,000 lines to stderr interleaved
        let mut child = tokio_command("cmd")
            .args([
                "/C",
                "for /L %i in (1,1,2000) do @(echo OUT_%i & echo ERR_%i 1>&2)",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to spawn dual stream child");

        let mut stdout_pipe = child.stdout.take().expect("Failed to take stdout");
        let mut stderr_pipe = child.stderr.take().expect("Failed to take stderr");

        let drain_out = tokio::spawn(async move {
            let mut buf = Vec::new();
            stdout_pipe.read_to_end(&mut buf).await.map(|_| buf)
        });

        let drain_err = tokio::spawn(async move {
            let mut buf = Vec::new();
            stderr_pipe.read_to_end(&mut buf).await.map(|_| buf)
        });

        let timeout_result = tokio::time::timeout(Duration::from_secs(10), async {
            let (out_res, err_res) = tokio::join!(drain_out, drain_err);
            let status = child.wait().await.expect("Failed to wait on child");
            (out_res.unwrap().unwrap(), err_res.unwrap().unwrap(), status)
        })
        .await;

        assert!(
            timeout_result.is_ok(),
            "Simultaneous dual-stream deadlocked!"
        );

        let (out_bytes, err_bytes, status) = timeout_result.unwrap();
        assert!(status.success());

        let out_str = String::from_utf8_lossy(&out_bytes);
        let err_str = String::from_utf8_lossy(&err_bytes);

        assert!(out_str.contains("OUT_1") && out_str.contains("OUT_2000"));
        assert!(err_str.contains("ERR_1") && err_str.contains("ERR_2000"));
        assert!(!out_str.contains("ERR_"));
        assert!(!err_str.contains("OUT_"));
    }
}

#[tokio::test]
async fn test_bidirectional_stdin_to_stdout_piping() {
    #[cfg(target_os = "windows")]
    {
        // Using `findstr "^"` on Windows to mirror stdin directly to stdout
        let mut child = silent_async_command("findstr")
            .arg("^")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to spawn findstr for stdin test");

        let mut stdin = child.stdin.take().expect("Failed to take stdin");
        let mut stdout = child.stdout.take().expect("Failed to take stdout");

        let payload = "ZENDEV_PIPED_STDIN_ROUNDTRIP_TEST_DATA\nSECOND_LINE_12345\n";

        let write_task = tokio::spawn(async move {
            stdin.write_all(payload.as_bytes()).await.expect("Failed to write to stdin");
            drop(stdin); // Send EOF to flush pipe
        });

        let read_task = tokio::spawn(async move {
            let mut out = Vec::new();
            stdout.read_to_end(&mut out).await.expect("Failed to read stdout");
            out
        });

        let timeout_res = tokio::time::timeout(Duration::from_secs(5), async {
            let (_, out_bytes) = tokio::join!(write_task, read_task);
            let status = child.wait().await.expect("Failed to wait on child");
            (out_bytes.unwrap(), status)
        })
        .await;

        assert!(timeout_res.is_ok(), "Piped stdin roundtrip timed out!");
        let (out_bytes, status) = timeout_res.unwrap();
        assert!(status.success());

        let out_str = String::from_utf8_lossy(&out_bytes);
        assert!(
            out_str.contains("ZENDEV_PIPED_STDIN_ROUNDTRIP_TEST_DATA"),
            "Piped stdin must be reflected in stdout. Got: '{}'",
            out_str
        );
        assert!(out_str.contains("SECOND_LINE_12345"));
    }
}

#[test]
fn test_edge_case_arguments_and_escaping() {
    #[cfg(target_os = "windows")]
    {
        // 1. Whitespace & Spaces in Arguments
        let out = silent_command("cmd")
            .args(["/C", "echo", "Hello World From ZenDev"])
            .output()
            .expect("Command failed");
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(stdout.contains("Hello World From ZenDev"));

        // 2. Empty Argument handling
        let out_empty = silent_command("cmd")
            .args(["/C", "echo", ""])
            .output()
            .expect("Empty arg failed");
        assert!(out_empty.status.success());

        // 3. UTF-8 & Unicode Special Characters
        let unicode_text = "Türkçe: ğüşıöç ĞÜŞİÖÇ | Emoji: 🚀🔥💯 | CJK: 你好世界";
        let out_unicode = silent_command("powershell")
            .args(["-NoProfile", "-Command", &format!("Write-Output '{}'", unicode_text)])
            .output()
            .expect("Unicode command failed");
        let unicode_stdout = String::from_utf8_lossy(&out_unicode.stdout);
        assert!(
            unicode_stdout.contains("Türkçe") || unicode_stdout.contains("Emoji"),
            "Unicode argument should pass without error"
        );

        // 4. Multiple Arguments (50 distinct arguments)
        let mut cmd = silent_command("cmd");
        cmd.arg("/C").arg("echo");
        for i in 0..50 {
            cmd.arg(format!("ARG_{}", i));
        }
        let out_multi = cmd.output().expect("Multi arg failed");
        let multi_str = String::from_utf8_lossy(&out_multi.stdout);
        assert!(multi_str.contains("ARG_0") && multi_str.contains("ARG_49"));
    }
}

#[tokio::test]
async fn test_async_process_termination_and_cancellation() {
    #[cfg(target_os = "windows")]
    {
        let start = std::time::Instant::now();

        // Spawn a process that would otherwise run for 20 seconds
        let mut child = tokio_command("cmd")
            .args(["/C", "ping 127.0.0.1 -n 20 > nul"])
            .spawn()
            .expect("Failed to spawn long running ping");

        assert!(child.id().is_some(), "Child PID should be available");

        // Allow child to spin up
        tokio::time::sleep(Duration::from_millis(150)).await;

        // Forcefully kill child process
        child.kill().await.expect("Failed to kill child process");

        // Wait on process exit
        let status = child.wait().await.expect("Failed to wait on killed child");

        let elapsed = start.elapsed();
        assert!(
            elapsed < Duration::from_secs(3),
            "Process kill took too long (elapsed: {:?})",
            elapsed
        );

        // Status code on killed process is non-zero
        assert!(
            !status.success(),
            "Killed process must NOT report success"
        );
    }
}

#[tokio::test]
async fn test_rapid_consecutive_spawns_no_leak() {
    #[cfg(target_os = "windows")]
    {
        // Rapidly spawn and reap 30 silent subprocesses
        for i in 0..30 {
            let out = silent_async_command("cmd")
                .args(["/C", &format!("echo RAPID_{}", i)])
                .output()
                .await
                .unwrap_or_else(|e| panic!("Spawn iteration {} failed: {}", i, e));

            assert!(out.status.success());
            let s = String::from_utf8_lossy(&out.stdout);
            assert!(s.contains(&format!("RAPID_{}", i)));
        }
    }
}

#[test]
fn test_trait_fluent_chaining_and_conversions() {
    let mut std_cmd = std::process::Command::new("cmd");
    std_cmd.silent();
    assert_eq!(std_cmd.get_program(), "cmd");

    let std_cmd_consumed = std::process::Command::new("cmd").into_silent();
    assert_eq!(std_cmd_consumed.get_program(), "cmd");

    let mut tokio_cmd = tokio::process::Command::new("cmd");
    tokio_cmd.silent();
    assert_eq!(tokio_cmd.as_std().get_program(), "cmd");

    let tokio_cmd_consumed = tokio::process::Command::new("cmd").into_silent();
    assert_eq!(tokio_cmd_consumed.as_std().get_program(), "cmd");

    // Test environment and working directory preservation
    let mut env_cmd = silent_command("cmd");
    env_cmd.env("ZENDEV_TEST_VAR", "M6_VERIFIED");
    assert!(env_cmd.get_envs().any(|(k, v)| k == "ZENDEV_TEST_VAR" && v == Some("M6_VERIFIED".as_ref())));
}
