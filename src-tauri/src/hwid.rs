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

//! ZenDev Hardware ID (HWID) Engine
//!
//! Provides 100% byte-for-byte backward compatibility with the legacy
//! `node-machine-id` npm package and `src/main/licenseStore.ts`.

use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use crate::process_ext::silent_command;

type HmacSha256 = Hmac<Sha256>;

pub const DEVICE_SALT: &[u8] = b"nexus-device-salt";

/// Normalizes raw machine GUID string by removing whitespace, \r, \n and converting to lowercase.
pub fn normalize_machine_guid(raw_guid: &str) -> String {
    raw_guid
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '\r' && *c != '\n')
        .collect::<String>()
        .to_lowercase()
}

/// Stage 1: Legacy node-machine-id hash(guid)
/// Computes SHA-256 lowercase hex string of normalized machine GUID.
pub fn derive_stage1_sha256(normalized_guid: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(normalized_guid.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Stage 2: ZenDev getDeviceId() salted HMAC
/// Computes HMAC-SHA256 with key "nexus-device-salt" over Stage 1 hex string.
pub fn derive_stage2_hmac(stage1_hash: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(DEVICE_SALT)
        .expect("HMAC-SHA256 accepts any key size");
    mac.update(stage1_hash.as_bytes());
    format!("{:x}", mac.finalize().into_bytes())
}

/// Retrieves the raw platform machine GUID, emulating node-machine-id's expose() function.
pub fn get_raw_machine_guid() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(guid) = get_guid_from_registry() {
            return Ok(guid);
        }
        if let Ok(guid) = get_guid_from_reg_cmd() {
            return Ok(guid);
        }
        Err("Failed to read Windows MachineGuid from registry or REG command".into())
    }

    #[cfg(target_os = "macos")]
    {
        let output = silent_command("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(part) = stdout.split("IOPlatformUUID").nth(1) {
            let first_line = part.split('\n').next().unwrap_or("");
            let cleaned: String = first_line
                .chars()
                .filter(|c| *c != '=' && *c != '"' && !c.is_whitespace() && *c != '\r' && *c != '\n')
                .collect::<String>()
                .to_lowercase();
            return Ok(cleaned);
        }
        Err("IOPlatformUUID not found in ioreg output".into())
    }

    #[cfg(target_os = "linux")]
    {
        use std::fs;
        let content = fs::read_to_string("/var/lib/dbus/machine-id")
            .or_else(|_| fs::read_to_string("/etc/machine-id"))
            .or_else(|_| {
                let output = silent_command("hostname").output()?;
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            })?;

        let first_line = content.lines().next().unwrap_or("");
        let cleaned = normalize_machine_guid(first_line);
        Ok(cleaned)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system for hardware ID extraction".into())
    }
}

#[cfg(target_os = "windows")]
pub fn get_guid_from_registry() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let crypto = hklm.open_subkey(r"SOFTWARE\Microsoft\Cryptography")?;
    let raw_guid: String = crypto.get_value("MachineGuid")?;
    Ok(normalize_machine_guid(&raw_guid))
}

#[cfg(target_os = "windows")]
pub fn get_guid_from_reg_cmd() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let output = silent_command("REG.exe")
        .args(["QUERY", r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "/v", "MachineGuid"])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if let Some(part) = stdout.split("REG_SZ").nth(1) {
        return Ok(normalize_machine_guid(part));
    }

    Err("REG_SZ token missing in REG.exe query output".into())
}

/// Emulates node-machine-id machineIdSync(original).
///
/// - When `original == true`: returns the raw cleaned GUID (e.g. 36-char string).
/// - When `original == false`: returns the SHA-256 hash of the cleaned GUID (64-char lowercase hex).
pub fn machine_id_sync(original: bool) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let raw_guid = get_raw_machine_guid()?;
    if original {
        Ok(raw_guid)
    } else {
        Ok(derive_stage1_sha256(&raw_guid))
    }
}

/// Fallback device ID generator when registry query fails:
/// HMAC-SHA256("nexus-device-salt", format!("{}-{}", username, platform))
/// where platform strictly matches Node.js process.platform ("win32", "darwin", "linux").
pub fn derive_fallback_device_id(username: &str, platform: &str) -> String {
    let raw = format!("{}-{}", username, platform);
    let mut mac = HmacSha256::new_from_slice(DEVICE_SALT)
        .expect("HMAC-SHA256 accepts any key size");
    mac.update(raw.as_bytes());
    format!("{:x}", mac.finalize().into_bytes())
}

/// Emulates ZenDev's getDeviceId() from src/main/licenseStore.ts.
///
/// Computes:
/// HMAC-SHA256("nexus-device-salt", machineIdSync(false))
///
/// If machine ID extraction fails, computes fallback:
/// HMAC-SHA256("nexus-device-salt", format!("{}-{}", username, platform))
pub fn get_device_id() -> String {
    match machine_id_sync(false) {
        Ok(stage1_hash) => derive_stage2_hmac(&stage1_hash),
        Err(_) => {
            #[cfg(target_os = "windows")]
            let (user_var, platform_str) = ("USERNAME", "win32");
            #[cfg(target_os = "macos")]
            let (user_var, platform_str) = ("USER", "darwin");
            #[cfg(target_os = "linux")]
            let (user_var, platform_str) = ("USER", "linux");
            #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
            let (user_var, platform_str) = ("USER", "unknown");

            let username = std::env::var(user_var).unwrap_or_else(|_| "unknown".to_string());
            derive_fallback_device_id(&username, platform_str)
        }
    }
}
