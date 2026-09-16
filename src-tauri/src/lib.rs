pub mod hwid;
pub mod safe_storage;
pub mod license;
pub mod crypto;
pub mod network;
pub mod port_watchdog;
pub mod net_dispatcher;
pub mod pdf;
pub mod image;
pub mod organizer;
pub mod clipboard;
pub mod tempmail;
pub mod bypasser;
pub mod sentinel;
pub mod optimizer;
pub mod journal;
pub mod updater;

#[cfg(test)]
mod tests;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::Window;

static ALWAYS_ON_TOP: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn window_minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_maximize(window: Window) -> Result<(), String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn window_close(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_is_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_toggle_always_on_top(window: Window) -> Result<bool, String> {
    let current = ALWAYS_ON_TOP.load(Ordering::SeqCst);
    let new_state = !current;
    window.set_always_on_top(new_state).map_err(|e| e.to_string())?;
    ALWAYS_ON_TOP.store(new_state, Ordering::SeqCst);
    Ok(new_state)
}

#[tauri::command]
fn window_is_always_on_top() -> bool {
    ALWAYS_ON_TOP.load(Ordering::SeqCst)
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn app_get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn app_memory_sweep() -> serde_json::Value {
    serde_json::json!({
        "success": true,
        "freedMem": 0
    })
}

#[tauri::command]
fn get_device_id() -> String {
    hwid::get_device_id()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Window Commands
            window_minimize,
            window_maximize,
            window_close,
            window_is_maximized,
            window_toggle_always_on_top,
            window_is_always_on_top,
            open_external,
            app_get_version,
            app_memory_sweep,
            // Hardware ID & License Commands
            get_device_id,
            license::license_get_device_id,
            license::license_check,
            license::check_license,
            license::license_activate,
            license::license_clear,
            license::license_deactivate,
            license::license_bg_verify,
            // Safe Storage Commands
            safe_storage::safe_storage_is_available,
            safe_storage::safe_storage_encrypt,
            safe_storage::safe_storage_decrypt,
            safe_storage::safe_storage_store,
            safe_storage::safe_storage_retrieve,
            safe_storage::safe_storage_delete,
            // Cyber Fortress Commands
            crypto::fortress_encrypt_file,
            crypto::fortress_decrypt_file,
            crypto::fortress_shred_file,
            crypto::fortress_select_file,
            // Network Tools Commands
            network::network_ping,
            network::network_port_scan,
            network::network_ip_lookup,
            network::network_my_ip,
            network::network_dns_query,
            network::network_ssl_inspect,
            // Port Watchdog Commands
            port_watchdog::port_scan_active,
            port_watchdog::port_scan_active_ports,
            port_watchdog::port_kill_process,
            // API Studio / Net Dispatcher Commands
            net_dispatcher::net_dispatch_request,
            net_dispatcher::net_dispatcher_send,
            net_dispatcher::net_dns_lookup,
            net_dispatcher::net_tcp_ping,
            net_dispatcher::net_ssl_check,
            // PDF Engine Commands
            pdf::pdf_inspect,
            pdf::pdf_inspect_files,
            pdf::pdf_merge,
            pdf::pdf_split,
            pdf::pdf_select_files,
            // Image Processing Commands
            image::image_get_metadata,
            image::image_process_single,
            image::image_process_batch,
            image::image_process,
            image::image_select_files,
            // Bulk File Organizer Commands
            organizer::organizer_select_dir,
            organizer::organizer_scan,
            organizer::organizer_execute,
            organizer::organizer_can_undo,
            organizer::organizer_undo,
            // Clipboard Manager Commands
            clipboard::clipboard_get_history,
            clipboard::clipboard_clear,
            clipboard::clipboard_delete,
            clipboard::clipboard_write,
            // TempMail Commands
            tempmail::tempmail_generate,
            tempmail::tempmail_check,
            tempmail::tempmail_read,
            // Link Bypasser & Decrypter Commands
            bypasser::bypass_link,
            bypasser::decrypter_clean,
            bypasser::decrypter_clean_batch,
            // Resource Sentinel Commands
            sentinel::sentinel_get_stats,
            sentinel::sentinel_optimize_memory,
            // System Optimizer Commands
            optimizer::system_flush_dns,
            optimizer::system_scan_temp,
            optimizer::system_clean_temp,
            optimizer::system_ping_host,
            optimizer::system_optimize_all,
            // Activity Journal Commands
            journal::journal_record,
            journal::journal_query,
            journal::journal_clear,
            journal::journal_verify_chain,
            journal::journal_export,
            journal::journal_get_stats,
            // Updater Commands
            updater::updater_check_now,
            updater::updater_install_now
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZenDev application");
}

