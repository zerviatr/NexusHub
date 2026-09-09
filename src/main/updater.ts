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
    repo: 'ZenDev',
    releaseType: 'release'
  })
} catch (err) {
  console.warn('[updater] setFeedURL warning:', err)
}

let isAutoUpdaterInitialized = false
let activeWindow: BrowserWindow | null = null

export function setupAutoUpdater(win: BrowserWindow): void {
  activeWindow = win

  if (isAutoUpdaterInitialized) {
    return
  }
  isAutoUpdaterInitialized = true

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const send = (channel: string, payload?: unknown) => {
    if (activeWindow && !activeWindow.isDestroyed()) {
      activeWindow.webContents.send(channel, payload)
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
  ipcMain.removeAllListeners('updater:install-now')
  ipcMain.on('updater:install-now', () => {
    console.log('[updater] Discord-grade update sequence initiated...')
    ;(app as any).isQuitting = true

    // 1. Inform renderer to trigger the fullscreen patching splash immediately
    send('updater:applying-patch')

    // 2. Remove all close prevention listeners so app.quit() is never blocked
    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.removeAllListeners('close')
        // DO NOT hide the window! Keep it open displaying the futuristic cyber patch splash!
      } catch {}
    })

    // 3. Safely release OS hooks, global hotkeys and tray
    try {
      globalShortcut.unregisterAll()
    } catch {}
    try {
      destroySystemTray()
    } catch {}

    // 4. Robust Watchdog: If Windows NSIS fails to auto-launch the newly updated binary,
    // this detached PowerShell supervisor will start ZenDev after 5 seconds
    try {
      const exePath = app.getPath('exe')
      if (app.isPackaged && process.platform === 'win32' && exePath) {
        const psScript = `
          Start-Sleep -Seconds 5;
          $p = Get-Process -Name "ZenDev" -ErrorAction SilentlyContinue;
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

    // 5. Allow user to see the sleek cyber patch transition for 1200ms before quitAndInstall
    setTimeout(() => {
      try {
        console.log('[updater] Executing autoUpdater.quitAndInstall(true, true)...')
        autoUpdater.quitAndInstall(true, true)
      } catch (err) {
        console.error('[updater] quitAndInstall failed, attempting fallback app.quit():', err)
        app.quit()
      }
    }, 1200)
  })

  // ─── IPC: renderer can trigger manual check ───────────────────────────────
  ipcMain.removeHandler('updater:check-now')
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
