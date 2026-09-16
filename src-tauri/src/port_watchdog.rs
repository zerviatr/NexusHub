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

//! Port Watchdog and Process Management Module
//!
//! Provides system-level port monitoring and guarded process lifecycle control:
//! 1. Scans active TCP/UDP ports and maps them to running system processes.
//! 2. Safely terminates rogue or dangling processes with strict PID security boundaries.

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use sysinfo::System;
use tokio::process::Command;

/// Structured representation of an active system network port.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivePortEntry {
    pub protocol: String,
    pub local_address: String,
    pub local_port: u16,
    #[serde(rename = "port")]
    pub port: u16,
    pub foreign_address: String,
    pub foreign_port: u16,
    pub state: String,
    pub pid: u32,
    pub process_name: String,
}

/// Response container for port scanning operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivePortsResponse {
    pub success: bool,
    pub ports: Vec<ActivePortEntry>,
    pub error: Option<String>,
}

/// Result of process termination requests.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KillProcessResult {
    pub success: bool,
    pub message: Option<String>,
    pub error: Option<String>,
}

/// Validates process ID safety boundaries.
/// Rejects PID 0 (Idle), PID 4 (Kernel/System), negative numbers, self PID, and integers > 2,147,483,647.
pub fn validate_killable_pid(pid: i64) -> Result<u32, &'static str> {
    if pid <= 0 {
        return Err("PID cannot be 0 or negative.");
    }
    if pid <= 4 {
        return Err("System kernel and idle processes (PID <= 4) are strictly protected.");
    }
    if pid > 2_147_483_647 {
        return Err("PID exceeds maximum 32-bit positive integer range (2147483647).");
    }

    let current_pid = std::process::id() as i64;
    if pid == current_pid {
        return Err("ZenDev cannot terminate its own process.");
    }

    Ok(pid as u32)
}

/// Parses raw `netstat -ano` output and maps to process names.
pub fn parse_netstat_output(raw: &str, pid_map: &HashMap<u32, String>) -> Vec<ActivePortEntry> {
    let mut entries = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        // Standard TCP line format: [TCP, 0.0.0.0:135, 0.0.0.0:0, LISTENING, 984]
        // Standard UDP line format: [UDP, 0.0.0.0:5353, *:*                 , 1234]
        if parts.len() < 4 {
            continue;
        }

        let protocol = parts[0].to_uppercase();
        if protocol != "TCP" && protocol != "UDP" {
            continue;
        }

        let local_addr = parts[1];
        let foreign_addr;
        let state;
        let pid_str;

        if protocol == "TCP" {
            if parts.len() >= 5 {
                foreign_addr = parts[2];
                state = parts[3];
                pid_str = parts[4];
            } else {
                foreign_addr = parts[2];
                state = "LISTENING";
                pid_str = parts[3];
            }
        } else {
            // UDP
            foreign_addr = parts[2];
            state = "STATELESS";
            pid_str = if parts.len() >= 4 { parts[3] } else { "0" };
        }

        let pid = match pid_str.parse::<u32>() {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Extract port number from local address (e.g., 0.0.0.0:3000 or [::]:8080 or 127.0.0.1:5432)
        let local_port = if let Some(colon) = local_addr.rfind(':') {
            match local_addr[colon + 1..].parse::<u16>() {
                Ok(p) => p,
                Err(_) => continue,
            }
        } else {
            continue;
        };

        // Extract port number from foreign address
        let foreign_port = if let Some(colon) = foreign_addr.rfind(':') {
            foreign_addr[colon + 1..].parse::<u16>().unwrap_or(0)
        } else {
            0
        };

        let process_name = pid_map.get(&pid).cloned().unwrap_or_else(|| {
            match pid {
                0 => "System Idle Process".to_string(),
                4 => "System Kernel".to_string(),
                _ => "Unknown Process".to_string(),
            }
        });

        entries.push(ActivePortEntry {
            protocol,
            local_address: local_addr.to_string(),
            local_port,
            port: local_port,
            foreign_address: foreign_addr.to_string(),
            foreign_port,
            state: state.to_string(),
            pid,
            process_name,
        });
    }

    entries.sort_by_key(|e| e.local_port);
    entries
}

/// Builds a PID -> Process Name mapping using sysinfo and tasklist.
pub async fn get_system_pid_map() -> HashMap<u32, String> {
    let mut pid_map = HashMap::new();

    // 1. Gather via sysinfo crate
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for (pid, process) in sys.processes() {
        let pid_u32 = pid.as_u32();
        let name = process.name().to_string_lossy().to_string();
        if !name.is_empty() {
            pid_map.insert(pid_u32, name);
        }
    }

    // 2. Windows fallback using `tasklist /FO CSV /NH` for services without full names
    #[cfg(target_os = "windows")]
    {
        if let Ok(out) = Command::new("tasklist").args(["/FO", "CSV", "/NH"]).output().await {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                // CSV line format: "name.exe","1234","Session","0","12,345 K"
                let tokens: Vec<&str> = trimmed.split(',').collect();
                if tokens.len() >= 2 {
                    let name = tokens[0].trim_matches('"');
                    let pid_str = tokens[1].trim_matches('"');
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        pid_map.entry(pid).or_insert_with(|| name.to_string());
                    }
                }
            }
        }
    }

    pid_map
}

/// Core function to scan active ports.
pub async fn scan_active_ports_internal() -> Result<Vec<ActivePortEntry>, String> {
    let pid_map = get_system_pid_map().await;

    #[cfg(target_os = "windows")]
    let cmd_output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute netstat: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let cmd_output = Command::new("netstat")
        .args(["-tulnp"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute netstat: {}", e))?;

    let stdout = String::from_utf8_lossy(&cmd_output.stdout);
    Ok(parse_netstat_output(&stdout, &pid_map))
}

/// Tauri command `port_scan_active` returning `Vec<ActivePortEntry>`.
#[tauri::command]
pub async fn port_scan_active() -> Result<Vec<ActivePortEntry>, String> {
    scan_active_ports_internal().await
}

/// Tauri command `port_scan_active_ports` returning `ActivePortsResponse` (matching tauriBridge).
#[tauri::command]
pub async fn port_scan_active_ports() -> ActivePortsResponse {
    match scan_active_ports_internal().await {
        Ok(ports) => ActivePortsResponse {
            success: true,
            ports,
            error: None,
        },
        Err(err) => ActivePortsResponse {
            success: false,
            ports: Vec::new(),
            error: Some(err),
        },
    }
}

/// Safely terminates a process by PID after verifying safety boundaries.
#[tauri::command]
pub async fn port_kill_process(pid: i64) -> Result<KillProcessResult, String> {
    let valid_pid = match validate_killable_pid(pid) {
        Ok(p) => p,
        Err(reason) => {
            return Err(format!(
                "Sistem kritik işlemleri, çekirdek (PID 0/4) veya ZenDev ana süreci sonlandırılamaz: {}",
                reason
            ));
        }
    };

    #[cfg(target_os = "windows")]
    {
        let pid_str = valid_pid.to_string();
        let output = Command::new("taskkill")
            .args(["/F", "/PID", &pid_str])
            .output()
            .await
            .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

        if output.status.success() {
            Ok(KillProcessResult {
                success: true,
                message: Some(format!("PID {} başarıyla sonlandırıldı.", valid_pid)),
                error: None,
            })
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let msg = if stderr.trim().is_empty() {
                format!("PID {} sonlandırılamadı.", valid_pid)
            } else {
                stderr.trim().to_string()
            };
            Err(msg)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let pid_str = valid_pid.to_string();
        let output = Command::new("kill")
            .args(["-9", &pid_str])
            .output()
            .await
            .map_err(|e| format!("Failed to execute kill: {}", e))?;

        if output.status.success() {
            Ok(KillProcessResult {
                success: true,
                message: Some(format!("PID {} terminated successfully.", valid_pid)),
                error: None,
            })
        } else {
            Err(format!("Failed to kill PID {}", valid_pid))
        }
    }
}
