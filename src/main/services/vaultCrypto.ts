/**
 * src/main/services/vaultCrypto.ts
 *
 * Core cryptographic engine for CyberFortress:
 * - DoD 5220.22-M 7-pass file shredder
 * - AES-256-GCM authenticated vault encryption
 * - Atomic stream decryption with authentication tag verification & collision avoidance
 *
 * Fully decoupled from Electron IPC for isolated unit testing and high performance.
 */

import * as fs from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'

export interface VaultOpResult {
  success: boolean
  outPath?: string
  name?: string
  passes?: number
  size?: number
  error?: string
}

/**
 * DoD 5220.22-M 7-Pass secure file shredder.
 * Overwrites with 0x00, 0xFF, pseudo-random, pseudo-random, 0x00, 0xFF, random,
 * flushes to physical storage, truncates to 0, and unlinks file entry.
 */
export async function shredFile(filePath: string): Promise<VaultOpResult> {
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

        // Yield execution to the event loop
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
      } catch {}
    }
    return { success: false, error: err.message || 'Dosya imha edilemedi' }
  }
}

/**
 * Encrypts any file using AES-256-GCM streaming with PBKDF2 (100,000 rounds).
 * Prepends header: NEXUSV1 (7) + salt (16) + iv (12) + authTag (16).
 */
export async function encryptFile(filePath: string, passphrase: string): Promise<VaultOpResult> {
  let outPath = ''
  try {
    if (!fs.existsSync(filePath)) throw new Error('Dosya bulunamadı.')
    if (!passphrase || passphrase.length < 4) throw new Error('Parola en az 4 karakter olmalıdır.')

    outPath = `${filePath}.nexusvault`
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(12) // 96-bit IV for GCM

    // PBKDF2 key derivation (100,000 rounds)
    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256')
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    // Header: "NEXUSV1" (7) + salt(16) + iv(12) + authTag placeholder (16)
    const header = Buffer.from('NEXUSV1', 'utf-8')
    const authTagPlaceholder = Buffer.alloc(16, 0)
    const preHeader = Buffer.concat([header, salt, iv, authTagPlaceholder])

    // Step 1: Write header and pipe encrypted stream
    await new Promise<void>((resolve, reject) => {
      const inStream = fs.createReadStream(filePath)
      const outStream = fs.createWriteStream(outPath)

      outStream.write(preHeader, (writeErr) => {
        if (writeErr) {
          inStream.destroy()
          outStream.destroy()
          return reject(writeErr)
        }

        inStream
          .pipe(cipher)
          .pipe(outStream)
          .on('finish', () => resolve())
          .on('error', (err) => reject(err))
      })

      inStream.on('error', (err) => reject(err))
    })

    // Step 2: Retrieve auth tag and write at offset 35 (7 + 16 + 12)
    const authTag = cipher.getAuthTag()
    const fd = await fs.promises.open(outPath, 'r+')
    try {
      await fd.write(authTag, 0, 16, 35)
    } finally {
      await fd.close()
    }

    return { success: true, outPath, name: path.basename(outPath) }
  } catch (err: any) {
    if (outPath && fs.existsSync(outPath)) {
      try {
        await fs.promises.unlink(outPath)
      } catch {}
    }
    return { success: false, error: err.message || 'Şifreleme başarısız oldu' }
  }
}

/**
 * Decrypts a .nexusvault file with atomic staging, AES-256-GCM tag verification,
 * and collision avoidance.
 */
export async function decryptFile(filePath: string, passphrase: string): Promise<VaultOpResult> {
  let stagingPath = ''
  try {
    if (!fs.existsSync(filePath)) throw new Error('Dosya bulunamadı.')

    // Read 51-byte header: magic(7) + salt(16) + iv(12) + authTag(16)
    const fd = await fs.promises.open(filePath, 'r')
    const headerBuf = Buffer.alloc(51)
    try {
      const { bytesRead } = await fd.read(headerBuf, 0, 51, 0)
      if (bytesRead < 51) {
        throw new Error('Geçersiz dosya boyutu! Kasa başlığı eksik.')
      }
    } finally {
      await fd.close()
    }

    const magic = headerBuf.subarray(0, 7).toString('utf-8')
    if (magic !== 'NEXUSV1') {
      throw new Error('Geçersiz kasa formatı! Bu dosya bir .nexusvault dosyası değil.')
    }

    const salt = headerBuf.subarray(7, 23)
    const iv = headerBuf.subarray(23, 35)
    const authTag = headerBuf.subarray(35, 51)

    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let candidatePath = filePath.replace(/\.nexusvault$/i, '')
    if (candidatePath === filePath) {
      candidatePath = `${filePath}.restored`
    }

    // Staging path: decrypt into an isolated temporary file first
    stagingPath = `${candidatePath}.${crypto.randomBytes(4).toString('hex')}.tmp`

    await new Promise<void>((resolve, reject) => {
      const inStream = fs.createReadStream(filePath, { start: 51 })
      const outStream = fs.createWriteStream(stagingPath)

      const cleanup = () => {
        try { inStream.destroy() } catch {}
        try { outStream.destroy() } catch {}
      }

      inStream
        .pipe(decipher)
        .pipe(outStream)
        .on('finish', () => resolve())
        .on('error', (err) => { cleanup(); reject(err) })

      inStream.on('error', (err) => { cleanup(); reject(err) })
      decipher.on('error', (err) => { cleanup(); reject(err) })
    })

    // Collision avoidance: if destination file already exists, don't overwrite it
    let finalPath = candidatePath
    if (fs.existsSync(finalPath)) {
      const ext = path.extname(candidatePath)
      const base = path.basename(candidatePath, ext)
      const dir = path.dirname(candidatePath)
      let counter = 1
      while (fs.existsSync(path.join(dir, `${base} (${counter})${ext}`))) {
        counter++
      }
      finalPath = path.join(dir, `${base} (${counter})${ext}`)
    }

    // Atomically rename validated decrypted file into place
    await fs.promises.rename(stagingPath, finalPath)

    return { success: true, outPath: finalPath, name: path.basename(finalPath) }
  } catch (err: any) {
    if (stagingPath && fs.existsSync(stagingPath)) {
      try {
        await fs.promises.unlink(stagingPath)
      } catch {}
    }
    return {
      success: false,
      error:
        err.message.includes('auth') || err.message.includes('tag') || err.message.includes('Unsupported state')
          ? 'Hatalı parola! Şifre çözülemedi.'
          : err.message,
    }
  }
}
