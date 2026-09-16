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

//! ZenDev License Engine
//!
//! Handles backward-compatible HMAC-SHA256 and NIST P-256 ECDSA license validation,
//! hardware ID device-locking enforcement, 72-hour Pro trial persistence,
//! and secure storage integration.

use hmac::{Hmac, Mac};
use p256::ecdsa::signature::Verifier;
use p256::ecdsa::{DerSignature, Signature, VerifyingKey};
use p256::pkcs8::DecodePublicKey;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};


use crate::hwid::get_device_id;
use crate::safe_storage::{delete_secret, retrieve_secret, store_secret};

type HmacSha256 = Hmac<Sha256>;

pub const DEFAULT_LICENSE_SECRET: &str = "NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD";

pub const DEFAULT_ECDSA_PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----\n\
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoQ97L2t26dcKGAvpeiBi+MdFHU4h\n\
5kKdlcun3MBI2sMrbiT0EouZb6KkoNKQtRW3bfPfZNDXXJzxOyEPmQi7eA==\n\
-----END PUBLIC KEY-----";

pub const JAN_2024_MS: u64 = 1704067200000;
pub const MONTH_MS: f64 = 30.44 * 24.0 * 3600.0 * 1000.0;
pub const TRIAL_DURATION_MS: u64 = 72 * 60 * 60 * 1000;

// ─── Data Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseData {
    pub key: String,
    pub tier: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: u64,
    #[serde(rename = "activatedAt")]
    pub activated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialData {
    #[serde(rename = "startedAt")]
    pub started_at: u64,
    #[serde(rename = "expiresAt")]
    pub expires_at: u64,
    #[serde(rename = "deviceId")]
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseStatusPayload {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tier: Option<String>,
    #[serde(rename = "expiresAt", skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(rename = "trialHoursLeft", skip_serializing_if = "Option::is_none")]
    pub trial_hours_left: Option<u64>,
    #[serde(rename = "trialExpired", skip_serializing_if = "Option::is_none")]
    pub trial_expired: Option<bool>,
    pub valid: bool,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "activatedAt", skip_serializing_if = "Option::is_none")]
    pub activated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseActivateResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tier: Option<String>,
    #[serde(rename = "expiresAt", skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ValidationSuccess {
    pub tier: String,
    pub expires_at: u64,
    pub hwid: Option<String>,
    pub features: Vec<String>,
    pub is_legacy_hmac: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EcdsaLicensePayload {
    pub tier: String,
    pub hwid: Option<String>,
    #[serde(rename = "expiresAt", default)]
    pub expires_at: u64,
    pub features: Option<Vec<String>>,
    #[serde(rename = "issuedAt")]
    pub issued_at: Option<u64>,
    pub customer: Option<String>,
}

// ─── Cryptographic Utility Functions ─────────────────────────────────────────

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn timing_safe_equal(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Decodes RFC 4648 Base32 string into raw bytes.
/// Handles case-insensitivity, ignores dashes, and maps 0->O and 1->I.
pub fn base32_decode(input: &str) -> Result<Vec<u8>, String> {
    let clean: String = input
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| match c {
            '0' => 'O',
            '1' => 'I',
            other => other,
        })
        .collect();

    if clean.is_empty() {
        return Err("Base32 input is empty".into());
    }

    let mut bits = 0u32;
    let mut value = 0u32;
    let mut out = Vec::new();

    for ch in clean.chars() {
        let val = match ch {
            'A'..='Z' => (ch as u32) - ('A' as u32),
            '2'..='7' => (ch as u32) - ('2' as u32) + 26,
            _ => return Err(format!("Invalid Base32 character: {}", ch)),
        };

        value = (value << 5) | val;
        bits += 5;

        if bits >= 8 {
            out.push(((value >> (bits - 8)) & 0xFF) as u8);
            bits -= 8;
        }
    }

    Ok(out)
}

// ─── Key Validation Logic ────────────────────────────────────────────────────

/// Resolves the HMAC license secret from environment or fallback.
pub fn get_hmac_secret() -> String {
    std::env::var("NEXUS_LICENSE_SECRET")
        .unwrap_or_else(|_| DEFAULT_LICENSE_SECRET.to_string())
}

/// Validates legacy symmetric HMAC-SHA256 license keys:
/// `NEXUS-TEEEH-HHHHH-HHHHH-HHHHH` (25 alphanumeric characters).
pub fn validate_hmac_license_key(raw_key: &str, secret: &str) -> Result<ValidationSuccess, String> {
    if raw_key.trim().is_empty() {
        return Err("License key is missing or empty".into());
    }

    let stripped: String = raw_key
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();

    if !stripped.starts_with("NEXUS") || stripped.len() != 25 {
        return Err("Invalid key format".into());
    }

    let code = &stripped[5..]; // 20 chars
    let tier_char = code.chars().next().unwrap();
    let eee = &code[1..4]; // 3-char hex expiry months
    let h = &code[4..]; // 16-char HMAC fragment

    let tier = match tier_char {
        'F' => "free",
        'P' => "pro",
        'T' => "team",
        'L' => "lifetime",
        _ => return Err("Unknown license tier".into()),
    };

    // 1. High-Entropy format: SSSS (4 chars) + H12 (12 chars HMAC of T+EEE+SSSS)
    let ssss = &h[0..4];
    let h12 = &h[4..];

    let mut mac_entropy = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| e.to_string())?;
    mac_entropy.update(format!("{}{}{}", tier_char, eee, ssss).as_bytes());
    let expected_h12 = hex::encode(mac_entropy.finalize().into_bytes())
        [0..12]
        .to_uppercase();

    // 2. Legacy format: 16-char HMAC of T+EEE
    let mut mac_legacy = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| e.to_string())?;
    mac_legacy.update(format!("{}{}", tier_char, eee).as_bytes());
    let expected_legacy = hex::encode(mac_legacy.finalize().into_bytes())
        [0..16]
        .to_uppercase();

    let is_valid_entropy = timing_safe_equal(h12, &expected_h12);
    let is_valid_legacy = timing_safe_equal(h, &expected_legacy);

    if !is_valid_entropy && !is_valid_legacy {
        return Err("Cryptographic signature mismatch".into());
    }

    let mut expires_at = 0u64;
    if eee != "000" {
        let months = u64::from_str_radix(eee, 16)
            .map_err(|_| "Invalid expiry format".to_string())?;
        expires_at = JAN_2024_MS + ((months as f64) * MONTH_MS) as u64;
    }

    if expires_at != 0 && now_ms() > expires_at {
        return Err("License key has expired".into());
    }

    let default_features = if matches!(tier, "pro" | "team" | "lifetime") {
        vec!["offline".into(), "cloud_sync".into(), "api_access".into(), "all".into()]
    } else {
        vec!["offline".into()]
    };

    Ok(ValidationSuccess {
        tier: tier.to_string(),
        expires_at,
        hwid: None,
        features: default_features,
        is_legacy_hmac: true,
    })
}

/// Validates asymmetric NIST P-256 ECDSA license keys:
/// `ZENDEV-BASE32(version + payloadLength + payloadJSON + signature)`
pub fn validate_ecdsa_license_key(
    raw_key: &str,
    current_hwid: Option<&str>,
    custom_public_key_pem: Option<&str>,
) -> Result<ValidationSuccess, String> {
    if raw_key.trim().is_empty() {
        return Err("License key is missing or empty".into());
    }

    let clean: String = raw_key
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect();

    let base32_part = if let Some(stripped) = clean.strip_prefix("ZENDEV-") {
        stripped
    } else if let Some(stripped) = clean.strip_prefix("ZENDEV") {
        stripped
    } else {
        return Err("Invalid license format. Expected ZENDEV- key.".into());
    };

    let base32_clean: String = base32_part
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();

    if base32_clean.len() < 20 {
        return Err("License key format is too short or corrupted".into());
    }

    let envelope_bytes = base32_decode(&base32_clean)
        .map_err(|e| format!("Failed to decode Base32 license data: {}", e))?;

    if envelope_bytes.len() < 1 + 2 + 10 + 64 {
        return Err("Invalid license envelope structure or corrupted payload".into());
    }

    let version = envelope_bytes[0];
    if version != 0x01 {
        return Err("Unsupported license format version".into());
    }

    let payload_len = u16::from_be_bytes([envelope_bytes[1], envelope_bytes[2]]) as usize;
    if payload_len == 0 || envelope_bytes.len() < 3 + payload_len + 64 {
        return Err("Corrupted payload length in license envelope".into());
    }

    let payload_bytes = &envelope_bytes[3..3 + payload_len];
    let signature_bytes = &envelope_bytes[3 + payload_len..];

    // Asymmetric signature verification
    let public_key_pem = custom_public_key_pem
        .map(|s| s.to_string())
        .or_else(|| std::env::var("ZENDEV_LICENSE_PUBLIC_KEY").ok())
        .unwrap_or_else(|| DEFAULT_ECDSA_PUBLIC_KEY.to_string());

    let verifying_key = VerifyingKey::from_public_key_pem(&public_key_pem)
        .map_err(|e| format!("Failed to parse ECDSA public key: {}", e))?;

    // Try DER format first, then IEEE-P1363 (64 bytes)
    let is_valid = if let Ok(der_sig) = DerSignature::from_bytes(signature_bytes) {
        verifying_key.verify(payload_bytes, &der_sig).is_ok()
    } else if let Ok(ieee_sig) = Signature::from_slice(signature_bytes) {
        verifying_key.verify(payload_bytes, &ieee_sig).is_ok()
    } else {
        false
    };

    if !is_valid {
        return Err("Cryptographic signature verification failed (key tampered or forged)".into());
    }

    // Parse JSON payload
    let payload: EcdsaLicensePayload = serde_json::from_slice(payload_bytes)
        .map_err(|e| format!("Corrupted JSON in license payload: {}", e))?;

    let valid_tiers = ["free", "pro", "team", "lifetime"];
    if !valid_tiers.contains(&payload.tier.as_str()) {
        return Err(format!("Unknown or invalid license tier: {}", payload.tier));
    }

    // Hardware ID (HWID) device-locking check
    if let Some(ref required_hwid) = payload.hwid {
        let trimmed = required_hwid.trim();
        if !trimmed.is_empty() && trimmed != "*" {
            match current_hwid {
                Some(current) => {
                    if trimmed.to_lowercase() != current.trim().to_lowercase() {
                        return Err("Hardware ID mismatch: license is locked to another machine".into());
                    }
                }
                None => {
                    return Err("License requires hardware ID verification, but no HWID was provided".into());
                }
            }
        }
    }

    // Expiration check (0 = lifetime, never expires)
    if payload.expires_at != 0 && now_ms() > payload.expires_at {
        return Err("License key has expired".into());
    }

    let features = payload.features.unwrap_or_else(|| vec!["all".to_string()]);

    Ok(ValidationSuccess {
        tier: payload.tier,
        expires_at: payload.expires_at,
        hwid: payload.hwid,
        features,
        is_legacy_hmac: false,
    })
}

/// Universal license key validator: automatically detects whether key is
/// Asymmetric ECDSA (ZENDEV-...) or legacy Symmetric HMAC (NEXUS-...).
pub fn validate_license_key(
    raw_key: &str,
    secret: Option<&str>,
    hwid: Option<&str>,
) -> Result<ValidationSuccess, String> {
    let clean = raw_key.trim().to_uppercase();
    if clean.starts_with("ZENDEV") {
        validate_ecdsa_license_key(raw_key, hwid, None)
    } else {
        let sec = secret.unwrap_or_else(|| DEFAULT_LICENSE_SECRET);
        validate_hmac_license_key(raw_key, sec)
    }
}

// ─── Trial Management ────────────────────────────────────────────────────────

pub fn get_or_create_trial() -> (bool, u64, u64) {
    let now = now_ms();
    let current_device_id = get_device_id();

    if let Ok(Some(json_str)) = retrieve_secret("nexus_trial") {
        if let Ok(trial) = serde_json::from_str::<TrialData>(&json_str) {
            let active = now < trial.expires_at;
            let hours_left = if trial.expires_at > now {
                ((trial.expires_at - now + 3599999) / 3600000) as u64
            } else {
                0
            };
            return (active, trial.expires_at, hours_left);
        }
    }

    // First time launch: initialize 72-hour Pro trial
    let expires_at = now + TRIAL_DURATION_MS;
    let trial_data = TrialData {
        started_at: now,
        expires_at,
        device_id: current_device_id,
    };

    if let Ok(serialized) = serde_json::to_string(&trial_data) {
        let _ = store_secret("nexus_trial", &serialized);
    }

    (true, expires_at, 72)
}

// ─── Tauri Command Handlers ──────────────────────────────────────────────────

#[tauri::command]
pub fn license_get_device_id() -> String {
    get_device_id()
}

#[tauri::command]
pub fn get_device_id_cmd() -> String {
    get_device_id()
}

#[tauri::command]
pub fn license_check() -> LicenseStatusPayload {
    let device_id = get_device_id();

    // Check stored license first
    if let Ok(Some(json_str)) = retrieve_secret("nexus_license") {
        if let Ok(stored) = serde_json::from_str::<LicenseData>(&json_str) {
            let validation = validate_license_key(&stored.key, Some(&get_hmac_secret()), Some(&device_id));
            match validation {
                Ok(res) => {
                    let now = now_ms();
                    if res.expires_at != 0 && now > res.expires_at {
                        return LicenseStatusPayload {
                            status: "expired".into(),
                            tier: Some(stored.tier),
                            expires_at: Some(res.expires_at),
                            key: Some(stored.key),
                            trial_hours_left: None,
                            trial_expired: None,
                            valid: false,
                            device_id,
                            activated_at: Some(stored.activated_at.to_string()),
                        };
                    }

                    return LicenseStatusPayload {
                        status: "active".into(),
                        tier: Some(stored.tier),
                        expires_at: Some(res.expires_at),
                        key: Some(stored.key),
                        trial_hours_left: None,
                        trial_expired: None,
                        valid: true,
                        device_id,
                        activated_at: Some(stored.activated_at.to_string()),
                    };
                }
                Err(_) => {
                    // License corrupted or invalid on current machine, delete it
                    let _ = delete_secret("nexus_license");
                }
            }
        }
    }

    // Check or create 72-hour Pro Trial
    let (trial_active, trial_expires_at, trial_hours_left) = get_or_create_trial();
    if trial_active {
        LicenseStatusPayload {
            status: "active".into(),
            tier: Some("trial".into()),
            expires_at: Some(trial_expires_at),
            key: Some("TRIAL-72H-NEXUS-PRO".into()),
            trial_hours_left: Some(trial_hours_left),
            trial_expired: Some(false),
            valid: true,
            device_id,
            activated_at: None,
        }
    } else {
        LicenseStatusPayload {
            status: "inactive".into(),
            tier: None,
            expires_at: Some(trial_expires_at),
            key: None,
            trial_hours_left: Some(0),
            trial_expired: Some(true),
            valid: false,
            device_id,
            activated_at: None,
        }
    }
}

#[tauri::command]
pub fn check_license() -> LicenseStatusPayload {
    license_check()
}

#[tauri::command]
pub fn license_activate(key: String) -> LicenseActivateResult {
    let clean_key = key.trim();
    if clean_key.is_empty() {
        return LicenseActivateResult {
            success: false,
            tier: None,
            expires_at: None,
            reason: Some("No key provided".into()),
        };
    }

    let device_id = get_device_id();
    let validation = validate_license_key(clean_key, Some(&get_hmac_secret()), Some(&device_id));

    match validation {
        Ok(res) => {
            let data = LicenseData {
                key: clean_key.to_string(),
                tier: res.tier.clone(),
                expires_at: res.expires_at,
                activated_at: now_ms(),
            };

            if let Ok(serialized) = serde_json::to_string(&data) {
                let _ = store_secret("nexus_license", &serialized);
            }

            LicenseActivateResult {
                success: true,
                tier: Some(res.tier),
                expires_at: Some(res.expires_at),
                reason: None,
            }
        }
        Err(err) => LicenseActivateResult {
            success: false,
            tier: None,
            expires_at: None,
            reason: Some(err),
        },
    }
}

#[tauri::command]
pub fn license_clear() -> Result<bool, String> {
    let _ = delete_secret("nexus_license");
    Ok(true)
}

#[tauri::command]
pub fn license_deactivate() -> Result<bool, String> {
    license_clear()
}

#[tauri::command]
pub fn license_bg_verify() -> serde_json::Value {
    let check = license_check();
    serde_json::json!({
        "valid": check.valid,
        "status": check.status,
        "tier": check.tier,
        "expiresAt": check.expires_at
    })
}
