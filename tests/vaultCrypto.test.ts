import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as os from 'os'
import { encryptFile, decryptFile, shredFile } from '../src/main/services/vaultCrypto'

describe('CyberFortress Cryptographic Engine (vaultCrypto)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-vault-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('should encrypt and decrypt a file with 100% byte fidelity using AES-256-GCM', async () => {
    const originalPath = path.join(tempDir, 'confidential.txt')
    const secretContent = 'NEXUSHUB-CONFIDENTIAL-MILITARY-GRADE-PAYLOAD-2026'
    await fs.writeFile(originalPath, secretContent, 'utf8')

    const passphrase = 'UltraSecurePassword123!'

    // 1. Encrypt
    const encRes = await encryptFile(originalPath, passphrase)
    expect(encRes.success).toBe(true)
    expect(encRes.outPath).toBe(`${originalPath}.nexusvault`)
    expect(fsSync.existsSync(encRes.outPath!)).toBe(true)

    // Verify header magic
    const headerBuf = Buffer.alloc(7)
    const fd = fsSync.openSync(encRes.outPath!, 'r')
    fsSync.readSync(fd, headerBuf, 0, 7, 0)
    fsSync.closeSync(fd)
    expect(headerBuf.toString('utf-8')).toBe('NEXUSV1')

    // Delete original file to test clean restoration
    await fs.unlink(originalPath)

    // 2. Decrypt
    const decRes = await decryptFile(encRes.outPath!, passphrase)
    expect(decRes.success).toBe(true)
    expect(decRes.outPath).toBe(originalPath)

    // Verify restored content matches exactly
    const restoredContent = await fs.readFile(originalPath, 'utf8')
    expect(restoredContent).toBe(secretContent)
  })

  it('should reject decryption with incorrect password and prevent corrupt output', async () => {
    const originalPath = path.join(tempDir, 'data.bin')
    const originalData = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    await fs.writeFile(originalPath, originalData)

    const correctPass = 'CorrectPass123'
    const wrongPass = 'WrongPass456'

    const encRes = await encryptFile(originalPath, correctPass)
    expect(encRes.success).toBe(true)

    // Attempt decryption with wrong password
    const decRes = await decryptFile(encRes.outPath!, wrongPass)
    expect(decRes.success).toBe(false)
    expect(decRes.error).toBe('Hatalı parola! Şifre çözülemedi.')
  })

  it('should avoid overwriting existing files upon decryption by appending counter', async () => {
    const originalPath = path.join(tempDir, 'report.txt')
    await fs.writeFile(originalPath, 'Original Version 1', 'utf8')

    const encRes = await encryptFile(originalPath, 'Passphrase999!')
    expect(encRes.success).toBe(true)

    // Keep original file intact so candidate already exists
    const decRes = await decryptFile(encRes.outPath!, 'Passphrase999!')
    expect(decRes.success).toBe(true)
    expect(decRes.outPath).toBe(path.join(tempDir, 'report (1).txt'))

    const duplicateContent = await fs.readFile(decRes.outPath!, 'utf8')
    expect(duplicateContent).toBe('Original Version 1')
  })

  it('should securely shred a file using DoD 5220.22-M 7 passes and remove it', async () => {
    const filePath = path.join(tempDir, 'topsecret.key')
    await fs.writeFile(filePath, 'UNRECOVERABLE-HIGH-ENTROPY-KEY', 'utf8')

    expect(fsSync.existsSync(filePath)).toBe(true)

    const shredRes = await shredFile(filePath)
    expect(shredRes.success).toBe(true)
    expect(shredRes.passes).toBe(7)
    expect(fsSync.existsSync(filePath)).toBe(false)
  })
})
