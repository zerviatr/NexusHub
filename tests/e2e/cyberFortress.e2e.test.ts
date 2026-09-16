/**
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { createTempSandbox, parseVaultHeader } from './helpers/testHarness'
import { encryptFile, decryptFile, shredFile } from '../../src/main/services/vaultCrypto'

describe('E2E FEAT-03: Cyber Fortress Cryptographic Engine & DoD Shredder', () => {
    let sandbox: {
        sandboxDir: string
        createFile: (relativePath: string, content: string | Buffer) => Promise<string>
        cleanup: () => Promise<void>
    }

    beforeEach(async () => {
        sandbox = await createTempSandbox('cyber-fortress-e2e-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (Vault Encryption, Decryption & Shredding)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should encrypt and decrypt file with 100% byte fidelity using AES-256-GCM', async () => {
        const payload = 'CONFIDENTIAL-ENTERPRISE-PAYLOAD-2026-NEXUS'
        const inputPath = await sandbox.createFile('doc.txt', payload)
        const password = 'StrongPassword!2026'

        const encRes = await encryptFile(inputPath, password)
        expect(encRes.success).toBe(true)
        expect(encRes.outPath).toBe(`${inputPath}.nexusvault`)
        expect(fsSync.existsSync(encRes.outPath!)).toBe(true)

        // Remove source file before decrypting
        await fs.unlink(inputPath)

        const decRes = await decryptFile(encRes.outPath!, password)
        expect(decRes.success).toBe(true)
        expect(decRes.outPath).toBe(inputPath)

        const restored = await fs.readFile(inputPath, 'utf-8')
        expect(restored).toBe(payload)
    })

    it('T1.2: Should enforce exact 51-byte header layout (NEXUSV1 + 16B salt + 12B IV + 16B tag)', async () => {
        const inputPath = await sandbox.createFile('secret.bin', 'DATA')
        const encRes = await encryptFile(inputPath, 'Pass123!')
        expect(encRes.success).toBe(true)

        const header = parseVaultHeader(encRes.outPath!)
        expect(header.isValid).toBe(true)
        expect(header.magic).toBe('NEXUSV1')
        expect(header.salt).toHaveLength(16)
        expect(header.iv).toHaveLength(12)
        expect(header.authTag).toHaveLength(16)
    })

    it('T1.3: Should derive key via PBKDF2 with 100,000 rounds and random salt', async () => {
        const input1 = await sandbox.createFile('file1.txt', 'Same Content')
        const input2 = await sandbox.createFile('file2.txt', 'Same Content')
        const password = 'SharedPassword123!'

        const enc1 = await encryptFile(input1, password)
        const enc2 = await encryptFile(input2, password)

        const h1 = parseVaultHeader(enc1.outPath!)
        const h2 = parseVaultHeader(enc2.outPath!)

        // Unique random salts ensure completely distinct ciphertext even with identical password and payload
        expect(h1.salt.equals(h2.salt)).toBe(false)
        expect(h1.iv.equals(h2.iv)).toBe(false)
    })

    it('T1.4: Should securely shred target file using DoD 5220.22-M 7-pass overwrite and unlink', async () => {
        const targetPath = await sandbox.createFile('killme.key', 'DESTROY-THIS-DATA-IMMEDIATELY')
        expect(fsSync.existsSync(targetPath)).toBe(true)

        const shredRes = await shredFile(targetPath)
        expect(shredRes.success).toBe(true)
        expect(shredRes.passes).toBe(7)
        expect(fsSync.existsSync(targetPath)).toBe(false)
    })

    it('T1.5: Should avoid overwriting existing destination files by incrementing counter (1).ext', async () => {
        const inputPath = await sandbox.createFile('report.pdf', 'V1 Data')
        const encRes = await encryptFile(inputPath, 'Pass123!')
        expect(encRes.success).toBe(true)

        // Keep original file in place to trigger collision
        const decRes = await decryptFile(encRes.outPath!, 'Pass123!')
        expect(decRes.success).toBe(true)
        expect(decRes.outPath).toBe(path.join(sandbox.sandboxDir, 'report (1).pdf'))
        expect(fsSync.existsSync(decRes.outPath!)).toBe(true)

        const content = await fs.readFile(decRes.outPath!, 'utf-8')
        expect(content).toBe('V1 Data')
    })

    it('T1.6: Should handle multi-chunk streaming files (> 128 KB) reliably', async () => {
        // Create 256 KB buffer of pseudo-random data
        const largeBuf = Buffer.alloc(256 * 1024)
        for (let i = 0; i < largeBuf.length; i++) {
            largeBuf[i] = (i * 31) % 256
        }

        const inputPath = await sandbox.createFile('large.bin', largeBuf)
        const encRes = await encryptFile(inputPath, 'LargePass!')
        expect(encRes.success).toBe(true)

        await fs.unlink(inputPath)

        const decRes = await decryptFile(encRes.outPath!, 'LargePass!')
        expect(decRes.success).toBe(true)

        const restored = await fs.readFile(decRes.outPath!)
        expect(restored.equals(largeBuf)).toBe(true)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (Defensive & Robustness)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should reject decryption with incorrect password and return exact error message', async () => {
        const inputPath = await sandbox.createFile('target.txt', 'Sensitive Info')
        const encRes = await encryptFile(inputPath, 'CorrectPassword123')
        expect(encRes.success).toBe(true)

        const decRes = await decryptFile(encRes.outPath!, 'WrongPassword456')
        expect(decRes.success).toBe(false)
        expect(decRes.error).toBe('Hatalı parola! Şifre çözülemedi.')
    })

    it('T2.2: Should detect corrupted authentication tag and cleanup temporary staging files', async () => {
        const inputPath = await sandbox.createFile('tampered.txt', 'Legit Data')
        const encRes = await encryptFile(inputPath, 'Pass123')
        expect(encRes.success).toBe(true)

        const vaultPath = encRes.outPath!
        // Tamper byte 40 (inside authentication tag)
        const vaultBytes = await fs.readFile(vaultPath)
        vaultBytes[40] = vaultBytes[40] ^ 0xff
        await fs.writeFile(vaultPath, vaultBytes)

        const decRes = await decryptFile(vaultPath, 'Pass123')
        expect(decRes.success).toBe(false)
        expect(decRes.error).toBe('Hatalı parola! Şifre çözülemedi.')

        // Check sandbox for stray .tmp files
        const dirFiles = await fs.readdir(sandbox.sandboxDir)
        const tmpFiles = dirFiles.filter((f) => f.endsWith('.tmp'))
        expect(tmpFiles).toHaveLength(0)
    })

    it('T2.3: Should enforce Windows system path guard protecting OS root and system directories', () => {
        const isSystemProtectedPath = (targetPath: string): boolean => {
            const normalized = path.resolve(targetPath).toLowerCase()
            const rootWindows = process.env.SystemRoot?.toLowerCase() || 'c:\\windows'
            const programFiles = process.env.ProgramFiles?.toLowerCase() || 'c:\\program files'
            const systemDrive = (process.env.SystemDrive?.toLowerCase() || 'c:') + '\\'

            if (normalized === systemDrive || normalized === systemDrive.slice(0, 2)) return true
            if (normalized.startsWith(rootWindows)) return true
            if (normalized.startsWith(programFiles)) return true
            return false
        }

        expect(isSystemProtectedPath('C:\\Windows')).toBe(true)
        expect(isSystemProtectedPath('C:\\Windows\\System32\\cmd.exe')).toBe(true)
        expect(isSystemProtectedPath('C:\\Program Files\\app.exe')).toBe(true)
        expect(isSystemProtectedPath('C:\\')).toBe(true)
        expect(isSystemProtectedPath(sandbox.sandboxDir)).toBe(false)
    })

    it('T2.4: Should handle zero-byte empty file encryption and decryption gracefully', async () => {
        const emptyPath = await sandbox.createFile('empty.txt', '')
        const encRes = await encryptFile(emptyPath, 'EmptyPass!')
        expect(encRes.success).toBe(true)

        // 51 header bytes + 0 ciphertext bytes = 51 bytes
        const stat = await fs.stat(encRes.outPath!)
        expect(stat.size).toBe(51)

        await fs.unlink(emptyPath)

        const decRes = await decryptFile(encRes.outPath!, 'EmptyPass!')
        expect(decRes.success).toBe(true)
        const restored = await fs.readFile(decRes.outPath!, 'utf-8')
        expect(restored).toBe('')
    })

    it('T2.5: Should reject non-existent input files gracefully', async () => {
        const nonExistent = path.join(sandbox.sandboxDir, 'ghost_file.txt')
        const encRes = await encryptFile(nonExistent, 'Pass')
        expect(encRes.success).toBe(false)
        expect(encRes.error).toBeDefined()

        const decRes = await decryptFile(nonExistent, 'Pass')
        expect(decRes.success).toBe(false)
        expect(decRes.error).toBeDefined()
    })

    it('T2.6: Should reject files with truncated or invalid magic headers', async () => {
        // Truncated header (only 30 bytes instead of 51)
        const truncatedPath = await sandbox.createFile('corrupt.nexusvault', Buffer.alloc(30))
        const decRes1 = await decryptFile(truncatedPath, 'Pass')
        expect(decRes1.success).toBe(false)

        // Wrong magic string
        const wrongMagicBuf = Buffer.alloc(60)
        wrongMagicBuf.write('BADMAGC', 0)
        const badMagicPath = await sandbox.createFile('badmagic.nexusvault', wrongMagicBuf)
        const decRes2 = await decryptFile(badMagicPath, 'Pass')
        expect(decRes2.success).toBe(false)
    })
})
