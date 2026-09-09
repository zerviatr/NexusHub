import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { shredFile, encryptFile, decryptFile } from '../services/vaultCrypto'

export function registerCyberFortressIPC(): void {
  // File Picker
  ipcMain.handle('fortress:selectFile', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Güvenli İşlem İçin Dosya Seçin',
    })
    if (res.canceled || !res.filePaths.length) return null
    const filePath = res.filePaths[0]
    const stats = fs.statSync(filePath)
    return {
      filePath,
      name: path.basename(filePath),
      size: stats.size,
    }
  })

  // DoD 5220.22-M 7-Pass Shredder
  ipcMain.handle('fortress:shredFile', async (_, filePath: string) => {
    return shredFile(filePath)
  })

  // AES-256-GCM Vault File Encryptor
  ipcMain.handle(
    'fortress:encryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      return encryptFile(filePath, passphrase)
    }
  )

  // AES-256-GCM Vault File Decryptor
  ipcMain.handle(
    'fortress:decryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      return decryptFile(filePath, passphrase)
    }
  )
}
