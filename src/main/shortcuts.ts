import { app, globalShortcut, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'

export function setupGlobalShortcuts(mainWindow: BrowserWindow): void {
  // Global hotkey: Ctrl + Shift + V opens Clipboard Manager from anywhere
  try {
    globalShortcut.register('CommandOrControl+Shift+V', () => {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('navigate:to', '/clipboard')
    })
  } catch (err) {
    console.error('Failed to register global shortcut CommandOrControl+Shift+V:', err)
  }

  // Global hotkey: Ctrl + Shift + K summons Command Palette from anywhere
  try {
    globalShortcut.register('CommandOrControl+Shift+K', () => {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('palette:toggle')
    })
  } catch (err) {
    console.error('Failed to register global shortcut CommandOrControl+Shift+K:', err)
  }

  // Unregister shortcuts on app quit
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}

export function registerSettingsIPC(): void {
  // Query Windows / macOS startup setting
  ipcMain.handle('settings:getAutoLaunch', () => {
    try {
      const settings = app.getLoginItemSettings()
      return settings.openAtLogin
    } catch {
      return false
    }
  })

  // Set Windows / macOS startup setting
  ipcMain.handle('settings:setAutoLaunch', (_, enable: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: true
      })
      return true
    } catch (err: any) {
      console.error('Failed to set login item settings:', err)
      return false
    }
  })
}
