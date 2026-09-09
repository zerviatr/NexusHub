import { app, BrowserWindow, shell, ipcMain, session } from 'electron'
import { join } from 'path'
import { registerLinkBypasserIPC } from './ipc/linkBypasser'
import { registerTempMailIPC } from './ipc/tempMail'
import { registerLinkDecrypterIPC } from './ipc/linkDecrypter'
import { registerFileOrganizerIPC } from './ipc/fileOrganizer'
import { registerClipboardIPC } from './ipc/clipboard'
import { registerNetworkToolsIPC } from './ipc/networkTools'
import { registerImageToolkitIPC } from './ipc/imageToolkit'
import { setupAutoUpdater } from './updater'
import { registerLicenseIPC } from './ipc/license'
import { setupSystemTray } from './tray'
import { registerSentinelIPC } from './ipc/sentinelIPC'
import { registerCyberFortressIPC } from './ipc/cyberFortressIPC'
import { registerSystemOptimizerIPC } from './ipc/systemOptimizer'
import { registerPortWatchdogIPC } from './ipc/portWatchdog'
import { setupGlobalShortcuts, registerSettingsIPC } from './shortcuts'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
    },
  })

  // Prevent full termination on close unless explicitly quitting -> minimize to tray
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // Setup tray, global hotkeys and updater once window is ready
    if (mainWindow) {
      setupSystemTray(mainWindow)
      setupGlobalShortcuts(mainWindow)
      setupAutoUpdater(mainWindow)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Dev: load from Vite dev server. Prod: load built file.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ===== Window Control IPC =====
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => {
  // Minimize to tray on close button click
  mainWindow?.hide()
})
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('window:toggleAlwaysOnTop', () => {
  if (!mainWindow) return false
  const current = mainWindow.isAlwaysOnTop()
  mainWindow.setAlwaysOnTop(!current)
  return !current
})
ipcMain.handle('window:isAlwaysOnTop', () => mainWindow?.isAlwaysOnTop() ?? false)

// Open external URLs in system browser
ipcMain.handle('shell:openExternal', (_, url: string) => shell.openExternal(url))
ipcMain.handle('app:getVersion', () => app.getVersion())

// Register license IPC first — renderer gate depends on it being ready
registerLicenseIPC()

// Register tool-specific IPC handlers
registerLinkBypasserIPC()
registerTempMailIPC()
registerLinkDecrypterIPC()
registerFileOrganizerIPC()
registerClipboardIPC()
registerNetworkToolsIPC()
registerImageToolkitIPC()
registerSettingsIPC()
registerSentinelIPC()
registerCyberFortressIPC()
registerSystemOptimizerIPC()
registerPortWatchdogIPC()

// ===== App Lifecycle & Single Instance Lock =====
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Enforce Content-Security-Policy
    session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            app.isPackaged
              ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;"
              : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: ws:;"
          ]
        }
      })
    })

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    ;(app as any).isQuitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
