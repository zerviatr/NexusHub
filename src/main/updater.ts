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

export function setupAutoUpdater(win: BrowserWindow): void {
  // ─── Helpers ──────────────────────────────────────────────────────────────
  const send = (channel: string, payload?: unknown) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    // Intentionally silent — no UI feedback on routine check
  })

  autoUpdater.on('update-available', (info) => {
    // Renderer can show "Downloading update vX.Y.Z..." notification
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    // Only useful for manual check flows — no automatic UI
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
    // Renderer shows "Restart to install v1.2.0" banner
    send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('error', (err) => {
    // Swallow update errors silently in production; log for debugging
    send('updater:error', err.message)
    console.error('[updater] error:', err.message)
  })

  // ─── IPC: renderer can trigger install ────────────────────────────────────
  ipcMain.on('updater:install-now', () => {
    autoUpdater.quitAndInstall(false, true)
    // false = don't force-quit (let window close handlers run)
    // true  = restart immediately after install
  })

  // ─── IPC: renderer can trigger manual check ───────────────────────────────
  ipcMain.handle('updater:check-now', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { hasUpdate: !!result?.updateInfo }
    } catch {
      return { hasUpdate: false }
    }
  })

  // ─── Initial check: 3 seconds after window is ready ──────────────────────
  // Delayed to not slow down perceived startup time
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {
        // Network unavailable or GitHub unreachable — fail silently
      })
    }
  }, 3_000)
}
