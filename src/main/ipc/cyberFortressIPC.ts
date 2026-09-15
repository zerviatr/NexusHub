
function isSystemProtectedPath(targetPath: string): boolean {
  const normalized = path.resolve(targetPath).toLowerCase()
  const rootWindows = process.env.SystemRoot?.toLowerCase() || 'c:\\windows'
  const programFiles = process.env.ProgramFiles?.toLowerCase() || 'c:\\program files'
  const systemDrive = (process.env.SystemDrive?.toLowerCase() || 'c:') + '\\'
  
  if (normalized === systemDrive || normalized === systemDrive.slice(0, 2)) return true
  if (normalized.startsWith(rootWindows)) return true
  if (normalized.startsWith(programFiles)) return true
  return false
}
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
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Geçersiz veya boş dosya yolu.' }
    }
    if (isSystemProtectedPath(filePath)) {
      return { success: false, error: 'Sistem güvenliği nedeniyle korumalı Windows dizinleri imha edilemez.' }
    }
    return shredFile(filePath)
  })

  // AES-256-GCM Vault File Encryptor
  ipcMain.handle(
    'fortress:encryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      if (!filePath || typeof filePath !== 'string' || !passphrase || typeof passphrase !== 'string') {
        return { success: false, error: 'Dosya yolu ve şifre gereklidir.' }
      }
      return encryptFile(filePath, passphrase)
    }
  )

  // AES-256-GCM Vault File Decryptor
  ipcMain.handle(
    'fortress:decryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      if (!filePath || typeof filePath !== 'string' || !passphrase || typeof passphrase !== 'string') {
        return { success: false, error: 'Dosya yolu ve şifre gereklidir.' }
      }
      return decryptFile(filePath, passphrase)
    }
  )
}
