import { app, Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function setupSystemTray(mainWindow: BrowserWindow): Tray {
  if (tray) return tray

  // Resolve tray icon path
  const iconPath = process.platform === 'win32'
    ? join(app.getAppPath(), 'build/icons/icon.ico')
    : join(app.getAppPath(), 'build/icons/icon.png')

  let trayIcon = nativeImage.createFromPath(iconPath)
  if (trayIcon.isEmpty()) {
    // Fallback to runtime packaging icon if available
    trayIcon = nativeImage.createFromPath(join(__dirname, '../../build/icons/icon.png'))
  }

  // Resize icon for tray if needed (16x16 on Windows, 22x22 on macOS)
  const resizedIcon = trayIcon.resize({ width: 16, height: 16 })
  tray = new Tray(resizedIcon.isEmpty() ? iconPath : resizedIcon)
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
}
