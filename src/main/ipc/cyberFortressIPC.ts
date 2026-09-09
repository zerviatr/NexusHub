import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'

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

  // DoD 5220.22-M 7-Pass Shredder (Non-blocking async stream chunking)
  ipcMain.handle('fortress:shredFile', async (_, filePath: string) => {
    let fileHandle: fs.promises.FileHandle | null = null
    try {
      try {
        await fs.promises.access(filePath, fs.constants.F_OK | fs.constants.W_OK)
      } catch {
        throw new Error('Dosya bulunamadı veya yazma izni yok.')
      }

      const stat = await fs.promises.stat(filePath)
      const size = stat.size
      fileHandle = await fs.promises.open(filePath, 'r+')

      // 7 Overwrite Passes (DoD 5220.22-M specification)
      const passes: Array<number | null> = [
        0x00, // Pass 1: Zeroes
        0xff, // Pass 2: Ones
        null, // Pass 3: Pseudo-random
        null, // Pass 4: Pseudo-random
        0x00, // Pass 5: Zeroes
        0xff, // Pass 6: Ones
        null, // Pass 7: Random
      ]

      const CHUNK_SIZE = 64 * 1024 // 64KB chunks
      for (let p = 0; p < passes.length; p++) {
        const val = passes[p]
        let written = 0
        while (written < size) {
          const toWrite = Math.min(CHUNK_SIZE, size - written)
          const buf = val === null ? crypto.randomBytes(toWrite) : Buffer.alloc(toWrite, val)

          await fileHandle.write(buf, 0, toWrite, written)
          written += toWrite

          // Yield execution to the Node/Electron event loop to maintain UI 60fps fluidity
          await new Promise((resolve) => setImmediate(resolve))
        }
        await fileHandle.sync()
        await new Promise((resolve) => setImmediate(resolve))
      }

      await fileHandle.close()
      fileHandle = null

      // Truncate to 0 and remove file entry
      await fs.promises.truncate(filePath, 0)
      await fs.promises.unlink(filePath)

      return { success: true, passes: 7, size }
    } catch (err: any) {
      if (fileHandle) {
        try {
          await fileHandle.close()
        } catch {
          // ignore close error during cleanup
        }
      }
      return { success: false, error: err.message || 'Dosya imha edilemedi' }
    }
  })

  // AES-256-GCM Vault File Encryptor
  ipcMain.handle(
    'fortress:encryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      try {
        if (!fs.existsSync(filePath)) throw new Error('Dosya bulunamadı.')
        if (!passphrase || passphrase.length < 4) throw new Error('Parola en az 4 karakter olmalıdır.')

        const fileData = fs.readFileSync(filePath)
        const salt = crypto.randomBytes(16)
        const iv = crypto.randomBytes(12) // 96-bit IV for GCM

        // PBKDF2 key derivation (100,000 rounds)
        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256')
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

        const encrypted = Buffer.concat([cipher.update(fileData), cipher.final()])
        const authTag = cipher.getAuthTag()

        // Header: "NEXUSV1" (7) + salt(16) + iv(12) + authTag(16) + encrypted
        const header = Buffer.from('NEXUSV1', 'utf-8')
        const vaultPayload = Buffer.concat([header, salt, iv, authTag, encrypted])

        const outPath = `${filePath}.nexusvault`
        fs.writeFileSync(outPath, vaultPayload)

        return { success: true, outPath, name: path.basename(outPath) }
      } catch (err: any) {
        return { success: false, error: err.message || 'Şifreleme başarısız oldu' }
      }
    }
  )

  // AES-256-GCM Vault File Decryptor
  ipcMain.handle(
    'fortress:decryptFile',
    async (_, { filePath, passphrase }: { filePath: string; passphrase: string }) => {
      try {
        if (!fs.existsSync(filePath)) throw new Error('Dosya bulunamadı.')
        const vaultData = fs.readFileSync(filePath)

        const magic = vaultData.subarray(0, 7).toString('utf-8')
        if (magic !== 'NEXUSV1') {
          throw new Error('Geçersiz kasa formatı! Bu dosya bir .nexusvault dosyası değil.')
        }

        const salt = vaultData.subarray(7, 23)
        const iv = vaultData.subarray(23, 35)
        const authTag = vaultData.subarray(35, 51)
        const encrypted = vaultData.subarray(51)

        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256')
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

        // Restore original filename by stripping .nexusvault
        let outPath = filePath.replace(/\.nexusvault$/i, '')
        if (outPath === filePath) {
          outPath = `${filePath}.restored`
        }

        fs.writeFileSync(outPath, decrypted)
        return { success: true, outPath, name: path.basename(outPath) }
      } catch (err: any) {
        return {
          success: false,
          error:
            err.message.includes('auth') || err.message.includes('tag')
              ? 'Hatalı parola! Şifre çözülemedi.'
              : err.message,
        }
      }
    }
  )
}
