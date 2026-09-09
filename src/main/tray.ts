import { app, Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

// Embedded fallback 32x32 ZenDev icon (PNG data URL) to guarantee tray creation
const FALLBACK_TRAY_DATA_URL =
  'data:image/png;base64,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'

function resolveTrayIcon(): nativeImage {
  const isWin = process.platform === 'win32'
  const iconFilename = isWin ? 'icon.ico' : 'icon.png'

  const candidatePaths = [
    join(process.resourcesPath, 'icons', iconFilename),
    join(process.resourcesPath, 'build', 'icons', iconFilename),
    join(app.getAppPath(), 'build', 'icons', iconFilename),
    join(app.getAppPath(), 'build', 'icons', 'icon.png'),
    join(__dirname, '../../build/icons', iconFilename),
    join(__dirname, '../../build/icons', 'icon.png')
  ]

  for (const p of candidatePaths) {
    try {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16 })
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback to embedded base64 icon
  const fallback = nativeImage.createFromDataURL(FALLBACK_TRAY_DATA_URL)
  return fallback.resize({ width: 16, height: 16 })
}

export function setupSystemTray(mainWindow: BrowserWindow): Tray | null {
  if (tray) return tray

  try {
    const resizedIcon = resolveTrayIcon()
    tray = new Tray(resizedIcon)
    tray.setToolTip('ZenDev — Multi-Tool Suite')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open ZenDev',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Clipboard Manager (Ctrl+Shift+V)',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/clipboard')
      }
    },
    {
      label: 'Quick Password Generator',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/password')
      }
    },
    {
      label: 'QR Code Studio',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/qr-code')
      }
    },
    {
      label: 'Resource Sentinel',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/sentinel')
      }
    },
    {
      label: 'Cyber Fortress (Vault & Shredder)',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/fortress')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit ZenDev',
      click: () => {
        ;(app as any).isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Double-click or click toggles window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
} catch (err) {
  console.error('[Tray] Failed to setup system tray:', err)
  return null
}
}

export function destroySystemTray(): void {
  if (tray) {
    try {
      tray.destroy()
    } catch {}
    tray = null
  }
}

