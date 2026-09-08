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
import { ipcMain, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'

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
    send('updater:error', err?.message || 'Update error occurred')
  })

  // ─── IPC: renderer can trigger install ────────────────────────────────────
  ipcMain.on('updater:install-now', () => {
    console.log('[updater] Triggering instant silent Discord-style quitAndInstall...')
    ;(app as any).isQuitting = true

    // Destroy all windows immediately so nothing blocks the process exit
    // and Windows doesn't show "(Not Responding)" or freeze for 60 seconds
    const { BrowserWindow } = require('electron')
    BrowserWindow.getAllWindows().forEach((w: any) => {
      try {
        w.removeAllListeners('close')
        w.destroy()
      } catch {}
    })

    setImmediate(() => {
      autoUpdater.quitAndInstall(true, true)
    })
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
      return {
        hasUpdate: false,
        currentVersion: app.getVersion(),
        isLatest: false,
        error: err?.message || 'Check failed',
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
