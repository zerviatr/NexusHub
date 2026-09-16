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

//! ZenDev Safe Storage Engine
//!
//! Provides encrypted persistence for license keys, trials, and device secrets.
//! On Windows: Uses Windows DPAPI (CryptProtectData / CryptUnprotectData).
//! Fallback / Cross-Platform: Uses AES-256-GCM with hardware-derived key.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::hwid::get_device_id;

static STORAGE_LOCK: Mutex<()> = Mutex::new(());

const AES_MAGIC: &[u8] = b"NEXUSENC";

#[cfg(target_os = "windows")]
#[repr(C)]
#[allow(non_snake_case)]
struct DATA_BLOB {
    cbData: u32,
    pbData: *mut u8,
}


#[cfg(target_os = "windows")]
#[link(name = "crypt32")]
extern "system" {
    fn CryptProtectData(
        pDataIn: *const DATA_BLOB,
        szDataDescr: *const u16,
        pOptionalEntropy: *const DATA_BLOB,
        pvReserved: *mut std::ffi::c_void,
        pPromptStruct: *mut std::ffi::c_void,
        dwFlags: u32,
        pDataOut: *mut DATA_BLOB,
    ) -> i32;

    fn CryptUnprotectData(
        pDataIn: *const DATA_BLOB,
        ppszDataDescr: *mut *mut u16,
        pOptionalEntropy: *const DATA_BLOB,
        pvReserved: *mut std::ffi::c_void,
        pPromptStruct: *mut std::ffi::c_void,
        dwFlags: u32,
        pDataOut: *mut DATA_BLOB,
    ) -> i32;
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn LocalFree(hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
}

/// Checks if encryption storage is available on this system.
pub fn is_available() -> bool {
    true
}

/// Derives a 32-byte AES-256 key from current host device ID.
fn derive_aes_key() -> [u8; 32] {
    let device_id = get_device_id();
    let mut hasher = Sha256::new();
    hasher.update(b"nexus-safestorage-salt-2025");
    hasher.update(device_id.as_bytes());
    hasher.finalize().into()
}

/// Encrypts raw bytes using AES-256-GCM with hardware-derived key.
fn encrypt_aes_gcm(plain_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let key = derive_aes_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plain_bytes)
        .map_err(|e| format!("AES-GCM encryption failed: {}", e))?;

    let mut out = Vec::with_capacity(AES_MAGIC.len() + 12 + ciphertext.len());
    out.extend_from_slice(AES_MAGIC);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// Decrypts bytes encrypted with encrypt_aes_gcm.
fn decrypt_aes_gcm(encrypted_bytes: &[u8]) -> Result<Vec<u8>, String> {
    if encrypted_bytes.len() < AES_MAGIC.len() + 12 + 16 {
        return Err("Encrypted payload too short".into());
    }
    if !encrypted_bytes.starts_with(AES_MAGIC) {
        return Err("Invalid AES magic header".into());
    }

    let nonce_bytes = &encrypted_bytes[AES_MAGIC.len()..AES_MAGIC.len() + 12];
    let ciphertext = &encrypted_bytes[AES_MAGIC.len() + 12..];

    let key = derive_aes_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("AES-GCM decryption failed: {}", e))
}

#[cfg(target_os = "windows")]
fn encrypt_dpapi(plain_bytes: &[u8]) -> Result<Vec<u8>, String> {
    if plain_bytes.is_empty() {
        return Ok(Vec::new());
    }

    let mut data_in = DATA_BLOB {
        cbData: plain_bytes.len() as u32,
        pbData: plain_bytes.as_ptr() as *mut u8,
    };
    let mut data_out = DATA_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;
    let success = unsafe {
        CryptProtectData(
            &mut data_in,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        )
    };

    if success == 0 || data_out.pbData.is_null() {
        return Err("CryptProtectData failed".into());
    }

    let slice = unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let result = slice.to_vec();
    unsafe {
        LocalFree(data_out.pbData as *mut std::ffi::c_void);
    }

    Ok(result)
}

#[cfg(target_os = "windows")]
fn decrypt_dpapi(encrypted_bytes: &[u8]) -> Result<Vec<u8>, String> {
    if encrypted_bytes.is_empty() {
        return Ok(Vec::new());
    }

    let mut data_in = DATA_BLOB {
        cbData: encrypted_bytes.len() as u32,
        pbData: encrypted_bytes.as_ptr() as *mut u8,
    };
    let mut data_out = DATA_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;
    let success = unsafe {
        CryptUnprotectData(
            &mut data_in,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut data_out,
        )
    };

    if success == 0 || data_out.pbData.is_null() {
        return Err("CryptUnprotectData failed".into());
    }

    let slice = unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let result = slice.to_vec();
    unsafe {
        LocalFree(data_out.pbData as *mut std::ffi::c_void);
    }

    Ok(result)
}

/// Universal encrypted serializer: tries DPAPI on Windows, with automatic AES-GCM fallback.
pub fn encrypt_bytes(plain_bytes: &[u8]) -> Result<Vec<u8>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(bytes) = encrypt_dpapi(plain_bytes) {
            return Ok(bytes);
        }
    }
    encrypt_aes_gcm(plain_bytes)
}

/// Universal encrypted deserializer: detects format and decrypts via DPAPI or AES-GCM.
pub fn decrypt_bytes(encrypted_bytes: &[u8]) -> Result<Vec<u8>, String> {
    if encrypted_bytes.starts_with(AES_MAGIC) {
        return decrypt_aes_gcm(encrypted_bytes);
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(bytes) = decrypt_dpapi(encrypted_bytes) {
            return Ok(bytes);
        }
    }

    decrypt_aes_gcm(encrypted_bytes)
}

/// Resolves directory for secret storage (`%APPDATA%/ZenDev` or fallback).
pub fn get_storage_dir() -> PathBuf {
    if let Ok(path_str) = std::env::var("NEXUS_STORAGE_DIR") {
        return PathBuf::from(path_str);
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let dir = Path::new(&appdata).join("ZenDev");
            let _ = fs::create_dir_all(&dir);
            return dir;
        }
    }

    let dir = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".zendev");
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Resolves path to `nexus_secrets.enc`.
pub fn get_secrets_file_path() -> PathBuf {
    if let Ok(path_str) = std::env::var("NEXUS_SECRETS_PATH") {
        return PathBuf::from(path_str);
    }
    get_storage_dir().join("nexus_secrets.enc")
}

/// Loads all key-value secrets from encrypted file.
fn load_secrets_map() -> HashMap<String, String> {
    let path = get_secrets_file_path();
    if !path.exists() {
        return HashMap::new();
    }

    match fs::read(&path) {
        Ok(enc_bytes) => match decrypt_bytes(&enc_bytes) {
            Ok(plain_bytes) => serde_json::from_slice(&plain_bytes).unwrap_or_default(),
            Err(_) => HashMap::new(),
        },
        Err(_) => HashMap::new(),
    }
}

/// Saves all key-value secrets into encrypted file.
fn save_secrets_map(map: &HashMap<String, String>) -> Result<(), String> {
    let path = get_secrets_file_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json_bytes = serde_json::to_vec(map).map_err(|e| e.to_string())?;
    let enc_bytes = encrypt_bytes(&json_bytes)?;
    fs::write(&path, enc_bytes).map_err(|e| e.to_string())?;
    Ok(())
}

/// Stores a secret string by key.
pub fn store_secret(key: &str, value: &str) -> Result<(), String> {
    let _guard = STORAGE_LOCK.lock().unwrap();
    let mut map = load_secrets_map();
    map.insert(key.to_string(), value.to_string());
    save_secrets_map(&map)
}

/// Retrieves a secret string by key.
pub fn retrieve_secret(key: &str) -> Result<Option<String>, String> {
    let _guard = STORAGE_LOCK.lock().unwrap();
    let map = load_secrets_map();
    Ok(map.get(key).cloned())
}

/// Deletes a secret string by key.
pub fn delete_secret(key: &str) -> Result<(), String> {
    let _guard = STORAGE_LOCK.lock().unwrap();
    let mut map = load_secrets_map();
    if map.remove(key).is_some() {
        save_secrets_map(&map)?;
    }
    Ok(())
}

// ─── Tauri Command Handlers ──────────────────────────────────────────────────

#[tauri::command]
pub fn safe_storage_is_available() -> bool {
    is_available()
}

#[tauri::command]
pub fn safe_storage_encrypt(plain_text: String) -> Result<String, String> {
    let encrypted = encrypt_bytes(plain_text.as_bytes())?;
    Ok(data_encoding::BASE64.encode(&encrypted))
}

#[tauri::command]
pub fn safe_storage_decrypt(cipher_text: String) -> Result<String, String> {
    let raw = data_encoding::BASE64
        .decode(cipher_text.as_bytes())
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    let decrypted = decrypt_bytes(&raw)?;
    String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode error: {}", e))
}

#[tauri::command]
pub fn safe_storage_store(key: String, value: String) -> Result<bool, String> {
    store_secret(&key, &value).map(|_| true)
}

#[tauri::command]
pub fn safe_storage_retrieve(key: String) -> Result<Option<String>, String> {
    retrieve_secret(&key)
}

#[tauri::command]
pub fn safe_storage_delete(key: String) -> Result<bool, String> {
    delete_secret(&key).map(|_| true)
}
