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

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

static IS_DOWNLOADING: AtomicBool = AtomicBool::new(false);
static DOWNLOADED_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    pub status: String,
    #[serde(rename = "currentVersion")]
    pub current_version: String,
    #[serde(rename = "updateVersion", skip_serializing_if = "Option::is_none")]
    pub update_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(rename = "releaseNotes", skip_serializing_if = "Option::is_none")]
    pub release_notes: Option<String>,
    #[serde(rename = "downloadUrl", skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(rename = "htmlUrl", skip_serializing_if = "Option::is_none")]
    pub html_url: Option<String>,
    #[serde(rename = "isLatest")]
    pub is_latest: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    html_url: String,
    assets: Vec<GitHubAsset>,
}

fn parse_semver(v: &str) -> (u64, u64, u64) {
    let clean = v.trim_start_matches('v').trim();
    let parts: Vec<u64> = clean
        .split('.')
        .map(|p| p.parse::<u64>().unwrap_or(0))
        .collect();
    let p0 = *parts.first().unwrap_or(&0);
    let p1 = *parts.get(1).unwrap_or(&0);
    let p2 = *parts.get(2).unwrap_or(&0);
    (p0, p1, p2)
}

fn is_newer_version(remote: &str, current: &str) -> bool {
    let r = parse_semver(remote);
    let c = parse_semver(current);
    if r.0 != c.0 {
        return r.0 > c.0;
    }
    if r.1 != c.1 {
        return r.1 > c.1;
    }
    r.2 > c.2
}

#[tauri::command]
pub async fn updater_check_now(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let client = reqwest::Client::builder()
        .user_agent("ZenDev-Tauri-Client")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = match client
        .get("https://api.github.com/repos/zerviatr/NexusHub/releases/latest")
        .send()
        .await
    {
        Ok(r) => r,
        Err(err) => {
            let _ = app.emit("updater:error", err.to_string());
            return Ok(UpdateCheckResult {
                has_update: false,
                status: "error".to_string(),
                current_version: current_version.clone(),
                update_version: None,
                version: None,
                release_notes: None,
                download_url: None,
                html_url: None,
                is_latest: false,
                error: Some("GitHub sunucusuna erişilemedi.".to_string()),
            });
        }
    };

    if !res.status().is_success() {
        let _ = app.emit("updater:error", "GitHub API hatası");
        return Ok(UpdateCheckResult {
            has_update: false,
            status: "error".to_string(),
            current_version: current_version.clone(),
            update_version: None,
            version: None,
            release_notes: None,
            download_url: None,
            html_url: None,
            is_latest: false,
            error: Some("Sürüm bulunamadı.".to_string()),
        });
    }

    let release: GitHubRelease = match res.json().await {
        Ok(rel) => rel,
        Err(err) => {
            let _ = app.emit("updater:error", err.to_string());
            return Ok(UpdateCheckResult {
                has_update: false,
                status: "error".to_string(),
                current_version: current_version.clone(),
                update_version: None,
                version: None,
                release_notes: None,
                download_url: None,
                html_url: None,
                is_latest: false,
                error: Some(err.to_string()),
            });
        }
    };

    let remote_version = release.tag_name.trim_start_matches('v').to_string();
    if is_newer_version(&remote_version, &current_version) {
        let exe_asset = release.assets.into_iter().find(|a| {
            let n = a.name.to_lowercase();
            n.ends_with(".exe") && (n.contains("setup") || n.contains("zendev"))
        });

        let download_url = exe_asset
            .as_ref()
            .map(|a| a.browser_download_url.clone())
            .unwrap_or_else(|| release.html_url.clone());

        let notes = release
            .body
            .unwrap_or_else(|| "ZenDev yeni sürüm hazır.".to_string());

        let result = UpdateCheckResult {
            has_update: true,
            status: "available".to_string(),
            current_version: current_version.clone(),
            update_version: Some(remote_version.clone()),
            version: Some(remote_version.clone()),
            release_notes: Some(notes.clone()),
            download_url: Some(download_url.clone()),
            html_url: Some(release.html_url.clone()),
            is_latest: false,
            error: None,
        };

        let _ = app.emit(
            "updater:available",
            serde_json::json!({
                "version": remote_version,
                "notes": notes,
                "downloadUrl": download_url
            }),
        );

        // Arka planda indirme başlat
        if let Some(asset) = exe_asset {
            let app_clone = app.clone();
            let remote_v = remote_version.clone();
            tauri::async_runtime::spawn(async move {
                let _ = download_update_asset(app_clone, asset.browser_download_url, asset.size, remote_v).await;
            });
        }

        Ok(result)
    } else {
        let _ = app.emit(
            "updater:not-available",
            serde_json::json!({ "version": current_version }),
        );
        Ok(UpdateCheckResult {
            has_update: false,
            status: "latest".to_string(),
            current_version: current_version.clone(),
            update_version: Some(current_version.clone()),
            version: Some(current_version.clone()),
            release_notes: None,
            download_url: None,
            html_url: Some(release.html_url),
            is_latest: true,
            error: None,
        })
    }
}

async fn download_update_asset(
    app: AppHandle,
    url: String,
    total_size: u64,
    version: String,
) -> Result<(), String> {
    if IS_DOWNLOADING.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let client = reqwest::Client::new();
    let mut res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        IS_DOWNLOADING.store(false, Ordering::SeqCst);
        let _ = app.emit("updater:error", "İndirme bağlantısı başarısız oldu.");
        return Err("Download failed".into());
    }

    let temp_file = std::env::temp_dir().join(format!("ZenDev-Setup-{}.exe", version));
    let mut file = std::fs::File::create(&temp_file).map_err(|e| e.to_string())?;

    use std::io::Write;
    let mut downloaded: u64 = 0;

    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percent = ((downloaded as f64 / total_size as f64) * 100.0) as u32;
            let _ = app.emit("updater:progress", serde_json::json!({ "percent": percent }));
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    drop(file);

    *DOWNLOADED_PATH.lock().unwrap() = Some(temp_file);
    IS_DOWNLOADING.store(false, Ordering::SeqCst);

    let _ = app.emit(
        "updater:downloaded",
        serde_json::json!({ "version": version }),
    );

    Ok(())
}

#[tauri::command]
pub fn updater_install_now(app: AppHandle) -> Result<(), String> {
    let _ = app.emit("updater:applying-patch", ());

    let path_opt = DOWNLOADED_PATH.lock().unwrap().clone();
    if let Some(path) = path_opt {
        if path.exists() {
            #[cfg(target_os = "windows")]
            {
                let _ = crate::process_ext::silent_command("cmd")
                    .args(["/C", "start", "", path.to_str().unwrap_or_default(), "/S"])
                    .spawn();
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
            std::process::exit(0);
        }
    }

    // Fallback: Releases sayfasına git
    let _ = crate::open_external("https://github.com/zerviatr/NexusHub/releases/latest".to_string());
    Ok(())
}
