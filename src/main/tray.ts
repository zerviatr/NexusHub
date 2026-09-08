import { app, Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

// Embedded fallback 32x32 NexusHub icon (PNG data URL) to guarantee tray creation
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
    tray.setToolTip('NexusHub — Multi-Tool Suite')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open NexusHub',
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
      label: 'JSON & JWT Studio',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/json-studio')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit NexusHub',
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

