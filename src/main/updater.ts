/**
 * src/main/updater.ts
 * Auto-updater integration using electron-updater + GitHub Releases.
 *
 * Behavior:
 *  - Silently checks for updates on launch (configurable interval)
 *  - Downloads in background without blocking the user
 *  - Sends progress / available / downloaded events to renderer via IPC
 *  - Renderer shows a non-blocking banner when update is ready
 *
 * Renderer listens on:
 *   ipcRenderer.on('updater:available',    (_, info) => ...)
 *   ipcRenderer.on('updater:progress',     (_, progress) => ...)
 *   ipcRenderer.on('updater:downloaded',   (_, info) => ...)
 *   ipcRenderer.on('updater:error',        (_, msg) => ...)
 *
 * Renderer triggers install via:
 *   ipcRenderer.send('updater:install-now')
 */
import { ipcMain, app, BrowserWindow, globalShortcut } from 'electron'
import { autoUpdater } from 'electron-updater'
import { destroySystemTray } from './tray'
import { spawn } from 'child_process'

// ─── Config ──────────────────────────────────────────────────────────────────
autoUpdater.autoDownload = true          // Download silently in background
autoUpdater.autoInstallOnAppQuit = true  // Install when the user quits naturally
autoUpdater.allowDowngrade = false       // Never roll back without explicit action
autoUpdater.logger = console

try {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'zerviatr',
    repo: 'NexusHub',
    releaseType: 'release'
  })
} catch (err) {
  console.warn('[updater] setFeedURL warning:', err)
}

export function setupAutoUpdater(win: BrowserWindow): void {
  // ─── Helpers ──────────────────────────────────────────────────────────────
  const send = (channel: string, payload?: unknown) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update available:', info.version)
    // Renderer can show "Downloading update vX.Y.Z..." notification
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[updater] Update not available. Current is latest:', info.version)
    send('updater:not-available', {
      version: info.version,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Update downloaded successfully:', info.version)
    // Renderer shows "Restart to install v1.2.0" banner
    send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message || err)
    const raw = (err?.message || String(err || '')).toLowerCase()
    const friendlyMsg =
      raw.includes('latest.yml') || raw.includes('404') || raw.includes('httperror') || raw.includes('enotfound') || raw.includes('econnrefused')
        ? 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor. En kısa sürede çözülecektir.'
        : 'Güncelleme sunucusuna şu anda erişilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.'
    send('updater:error', friendlyMsg)
  })

  // ─── IPC: renderer can trigger install ────────────────────────────────────
  ipcMain.on('updater:install-now', () => {
    console.log('[updater] Discord-grade update sequence initiated...')
    ;(app as any).isQuitting = true

    // 1. Remove all close prevention listeners so app.quit() is never blocked
    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.removeAllListeners('close')
        // Hide window so user sees smooth transition
        w.hide()
      } catch {}
    })

    // 2. Safely release OS hooks, global hotkeys and tray
    try {
      globalShortcut.unregisterAll()
    } catch {}
    try {
      destroySystemTray()
    } catch {}

    // 3. Robust Watchdog: If Windows NSIS fails to auto-launch the newly updated binary,
    // this detached PowerShell supervisor will start NexusHub after 5 seconds
    try {
      const exePath = app.getPath('exe')
      if (app.isPackaged && process.platform === 'win32' && exePath) {
        const psScript = `
          Start-Sleep -Seconds 5;
          $p = Get-Process -Name "NexusHub" -ErrorAction SilentlyContinue;
          if (-not $p) {
            Start-Process -FilePath "${exePath.replace(/\\/g, '\\\\')}"
          }
        `
        const watchdog = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        })
        watchdog.unref()
      }
    } catch (err) {
      console.warn('[updater] Watchdog spawn warning:', err)
    }

    // 4. Trigger quitAndInstall(false, true)
    // - isSilent: false allows NSIS to run with its 1-second clean update progress and execute runAfterFinish
    // - isForceRunAfter: true passes --force-run to guarantee relaunch
    setTimeout(() => {
      try {
        console.log('[updater] Executing autoUpdater.quitAndInstall(false, true)...')
        autoUpdater.quitAndInstall(false, true)
      } catch (err) {
        console.error('[updater] quitAndInstall failed, attempting fallback app.quit():', err)
        app.quit()
      }
    }, 400)
  })

  // ─── IPC: renderer can trigger manual check ───────────────────────────────
  ipcMain.handle('updater:check-now', async () => {
    try {
      const currentVersion = app.getVersion()
      console.log(`[updater] Manual check triggered. Current version: ${currentVersion}, isPackaged: ${app.isPackaged}`)

      if (!app.isPackaged) {
        return {
          hasUpdate: false,
          currentVersion,
          isLatest: true,
          devMode: true,
        }
      }

      const result = await autoUpdater.checkForUpdates()
      const updateVersion = result?.updateInfo?.version
      const hasUpdate = Boolean(updateVersion && updateVersion !== currentVersion)

      console.log(`[updater] Check completed: updateVersion=${updateVersion}, hasUpdate=${hasUpdate}`)

      return {
        hasUpdate,
        currentVersion,
        updateVersion: updateVersion || currentVersion,
        isLatest: !hasUpdate,
      }
    } catch (err: any) {
      console.error('[updater] check error:', err?.message || err)
      const raw = (err?.message || String(err || '')).toLowerCase()
      const friendlyMsg =
        raw.includes('latest.yml') || raw.includes('404') || raw.includes('httperror') || raw.includes('enotfound') || raw.includes('econnrefused')
          ? 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor. En kısa sürede çözülecektir.'
          : 'Güncelleme sunucusuna şu anda erişilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.'
      return {
        hasUpdate: false,
        currentVersion: app.getVersion(),
        isLatest: false,
        error: friendlyMsg,
      }
    }
  })

  // ─── Initial check: 3 seconds after window is ready ──────────────────────
  // Delayed to not slow down perceived startup time
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn('[updater] Initial background check failed silently:', e?.message || e)
      })
    }
  }, 3_000)
}
