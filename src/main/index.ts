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
import { registerPdfToolkitIPC } from './ipc/pdfToolkit'
import { setupGlobalShortcuts, registerSettingsIPC } from './shortcuts'

let mainWindow: BrowserWindow | null = null

// Guard against unhandled errors taking down the entire desktop application
process.on('uncaughtException', (error) => {
  console.error('[NEXUS-MAIN:FATAL_UNCAUGHT_EXCEPTION]', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[NEXUS-MAIN:UNHANDLED_REJECTION]', reason)
})

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
      devTools: !app.isPackaged,
    },
  })

  // Block Developer Tools shortcuts in production builds
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') ||
        ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'r')
      ) {
        event.preventDefault()
      }
    })
  }

  // Prevent full termination on close unless explicitly quitting -> minimize to tray
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.once('ready-to-show', () => {
    const isStartupLaunch =
      app.getLoginItemSettings().wasOpenedAsHidden ||
      process.argv.includes('--hidden') ||
      process.argv.includes('--minimized')

    if (!isStartupLaunch) {
      mainWindow?.show()
    }
    // Setup tray, global hotkeys and updater once window is ready
    if (mainWindow) {
      setupSystemTray(mainWindow)
      setupGlobalShortcuts(mainWindow)
      setupAutoUpdater(mainWindow)
    }
  })

  // Whitelist safe protocols for external URLs
  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {}
    return { action: 'deny' }
  })

  // Prevent unexpected top-level navigation
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    if (navUrl !== mainWindow.webContents.getURL()) {
      event.preventDefault()
    }
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
// Validate openExternal protocol
ipcMain.handle('shell:openExternal', (_, url: string) => {
  if (typeof url === 'string') {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return shell.openExternal(url)
      }
    } catch {}
  }
  return Promise.reject(new Error('Invalid URL protocol'))
})
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
registerPdfToolkitIPC()

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

  if (process.platform === 'win32') {
  app.setAppUserModelId('app.zendev.desktop')
}

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
