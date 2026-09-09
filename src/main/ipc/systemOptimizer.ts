import { ipcMain } from 'electron'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export function registerSystemOptimizerIPC(): void {
  // 1. Flush DNS Cache (Cross-platform)
  ipcMain.handle('system:flushDns', async () => {
    return new Promise((resolve) => {
      let cmd = 'ipconfig /flushdns'
      if (process.platform === 'darwin') {
        cmd = 'dscacheutil -flushcache; killall -HUP mDNSResponder'
      } else if (process.platform === 'linux') {
        cmd = 'resolvectl flush-caches || systemd-resolve --flush-caches'
      }

      exec(cmd, (error, stdout) => {
        if (error) {
          resolve({ success: false, output: error.message })
        } else {
          resolve({ success: true, output: (stdout || 'DNS önbelleği başarıyla temizlendi.').trim() })
        }
      })
    })
  })

  // 2. Scan Temp Directory Size and File Count
  ipcMain.handle('system:scanTemp', async () => {
    try {
      const tempDir = os.tmpdir()
      const files = await fs.promises.readdir(tempDir, { withFileTypes: true })
      let totalSize = 0
      let totalFiles = 0

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file.name)
          const stat = await fs.promises.stat(filePath)
          if (stat.isFile()) {
            totalSize += stat.size
            totalFiles++
          }
        } catch {
          // Ignore locked or inaccessible files
        }
      }

      return {
        path: tempDir,
        fileCount: totalFiles,
        totalBytes: totalSize,
        sizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + ' MB'
      }
    } catch (err: any) {
      return { path: os.tmpdir(), fileCount: 0, totalBytes: 0, sizeFormatted: '0 MB', error: err.message }
    }
  })

  // 3. Clean Temp Files Safely
  ipcMain.handle('system:cleanTemp', async () => {
    try {
      const tempDir = os.tmpdir()
      const files = await fs.promises.readdir(tempDir, { withFileTypes: true })
      let deletedCount = 0
      let freedBytes = 0

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file.name)
          const stat = await fs.promises.stat(filePath)
          if (stat.isFile()) {
            // Only remove files older than 1 hour to prevent crashing active apps
            const now = Date.now()
            if (now - stat.mtimeMs > 3600000) {
              await fs.promises.unlink(filePath)
              deletedCount++
              freedBytes += stat.size
            }
          }
        } catch {
          // Skip locked files without error
        }
      }

      return {
        success: true,
        deletedCount,
        freedBytes,
        freedFormatted: (freedBytes / (1024 * 1024)).toFixed(2) + ' MB'
      }
    } catch (err: any) {
      return { success: false, error: err.message, deletedCount: 0, freedBytes: 0 }
    }
  })

  // 4. Fast Ping Benchmark
  ipcMain.handle('system:pingHost', async (_, host: string) => {
    const target = host.replace(/[^a-zA-Z0-9.-]/g, '') || '1.1.1.1'
    return new Promise((resolve) => {
      const start = Date.now()
      const isWin = process.platform === 'win32'
      const pingCmd = isWin ? `ping -n 1 -w 1000 ${target}` : `ping -c 1 -W 1 ${target}`
      exec(pingCmd, (error) => {
        const elapsed = Date.now() - start
        if (error) {
          resolve({ success: false, latency: null, host: target })
        } else {
          resolve({ success: true, latency: elapsed, host: target })
        }
      })
    })
  })

  // 5. One-Click Comprehensive Optimization (Turbo Boost)
  ipcMain.handle('system:optimizeAll', async () => {
    try {
      // 1. Flush DNS
      let dnsOut = 'OK'
      let dnsCmd = 'ipconfig /flushdns'
      if (process.platform === 'darwin') {
        dnsCmd = 'dscacheutil -flushcache; killall -HUP mDNSResponder'
      } else if (process.platform === 'linux') {
        dnsCmd = 'resolvectl flush-caches || systemd-resolve --flush-caches'
      }
      try {
        await new Promise((res, rej) => exec(dnsCmd, (err) => err ? rej(err) : res(true)))
      } catch {
        dnsOut = 'Warning'
      }

      // 2. Clean Temp
      const tempDir = os.tmpdir()
      const files = await fs.promises.readdir(tempDir, { withFileTypes: true }).catch(() => [])
      let deletedCount = 0
      let freedBytes = 0

      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file.name)
          const stat = await fs.promises.stat(filePath)
          if (stat.isFile() && Date.now() - stat.mtimeMs > 3600000) {
            await fs.promises.unlink(filePath)
            deletedCount++
            freedBytes += stat.size
          }
        } catch {
          // Ignore locks
        }
      }

      return {
        success: true,
        dnsFlushed: dnsOut === 'OK',
        deletedFiles: deletedCount,
        freedFormatted: (freedBytes / (1024 * 1024)).toFixed(2) + ' MB',
        freedBytes
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Optimization failed' }
    }
  })
}
