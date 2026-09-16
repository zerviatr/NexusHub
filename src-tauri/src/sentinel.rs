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

use serde::{Deserialize, Serialize};
use sysinfo::System;

#[cfg(target_os = "windows")]
extern "system" {
    fn GetCurrentProcess() -> isize;
    fn SetProcessWorkingSetSize(
        hProcess: isize,
        dwMinimumWorkingSetSize: usize,
        dwMaximumWorkingSetSize: usize,
    ) -> i32;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuStats {
    pub model: String,
    pub cores: usize,
    pub speed: u64,
    #[serde(rename = "overallLoad")]
    pub overall_load: f32,
    #[serde(rename = "loadPerCore")]
    pub load_per_core: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total: u64,
    pub free: u64,
    pub used: u64,
    #[serde(rename = "percentUsed")]
    pub percent_used: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OsStats {
    pub platform: String,
    pub arch: String,
    pub release: String,
    pub hostname: String,
    pub uptime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelStatsResult {
    pub success: bool,
    pub cpu: CpuStats,
    pub memory: MemoryStats,
    pub os: OsStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelOptimizeResult {
    pub success: bool,
    #[serde(rename = "freeMem")]
    pub free_mem: u64,
}

/// Collects live system metrics via sysinfo crate.
pub fn get_system_metrics() -> SentinelStatsResult {
    let mut sys = System::new_all();
    // Refresh to get accurate CPU and memory usage
    sys.refresh_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();

    let cpus = sys.cpus();
    let model = cpus
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let cores = cpus.len();
    let speed = cpus.first().map(|c| c.frequency()).unwrap_or(0);

    let load_per_core: Vec<f32> = cpus.iter().map(|c| c.cpu_usage()).collect();
    let overall_load = sys.global_cpu_usage();

    let total_memory = sys.total_memory();
    let free_memory = sys.free_memory();
    let used_memory = sys.used_memory();
    let percent_used = if total_memory > 0 {
        ((used_memory as f64 / total_memory as f64) * 100.0) as u32
    } else {
        0
    };

    let platform = System::name().unwrap_or_else(|| std::env::consts::OS.to_string());
    let arch = std::env::consts::ARCH.to_string();
    let release = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = System::host_name().unwrap_or_else(|| "localhost".to_string());
    let uptime = System::uptime();

    SentinelStatsResult {
        success: true,
        cpu: CpuStats {
            model,
            cores,
            speed,
            overall_load,
            load_per_core,
        },
        memory: MemoryStats {
            total: total_memory,
            free: free_memory,
            used: used_memory,
            percent_used,
        },
        os: OsStats {
            platform,
            arch,
            release,
            hostname,
            uptime,
        },
    }
}

/// Trims memory working set.
pub fn optimize_memory_working_set() -> u64 {
    #[cfg(target_os = "windows")]
    unsafe {
        let handle = GetCurrentProcess();
        SetProcessWorkingSetSize(handle, usize::MAX, usize::MAX);
    }

    let mut sys = System::new();
    sys.refresh_memory();
    sys.free_memory()
}

#[tauri::command]
pub async fn sentinel_get_stats() -> Result<SentinelStatsResult, String> {
    tokio::task::spawn_blocking(get_system_metrics)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sentinel_optimize_memory() -> Result<SentinelOptimizeResult, String> {
    let free_mem = tokio::task::spawn_blocking(optimize_memory_working_set)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SentinelOptimizeResult {
        success: true,
        free_mem,
    })
}
