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
import { generateKeyPairSync } from 'crypto'
import {
    createTempSandbox,
    normalizeMachineGuid,
    deriveFinalDeviceId,
    parseVaultHeader,
    REQUIRED_NEXUS_API_NAMESPACES,
} from './helpers/testHarness'
import { encryptFile, decryptFile, shredFile } from '../../src/main/services/vaultCrypto'
import { verifyEcdsaLicense } from '../../src/shared/ecdsaLicense'
import { generateEcdsaLicense } from '../../server/src/services/licenseSigner'
import {
    computeEntryHash,
    verifyAuditChain,
    canonicalStringify,
    GENESIS_PREV_HASH,
    type ActivityEntry,
} from '../../src/shared/auditIntegrity'
import { getCategory, getUniquePath } from '../../src/main/services/organizerCore'
import {
    validateRequestTarget,
    validateAndSanitizeHeaders,
} from '../../src/main/ipc/netDispatcherSecurity'

describe('ADVERSARIAL STRESS HARNESS: Tier 3 & Tier 4 Verification', () => {
    let sandbox: {
        sandboxDir: string
        createFile: (relativePath: string, content: string | Buffer) => Promise<string>
        cleanup: () => Promise<void>
    }

    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const attackerKeys = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    beforeEach(async () => {
        sandbox = await createTempSandbox('adv-tier3-tier4-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ADV 1: HWID + License + SafeStorage Hostile Matrix
    // ─────────────────────────────────────────────────────────────────────────
    describe('ADV 1: HWID + License + SafeStorage Hostile Attacks', () => {
        it('ADV-1.1: Rejects license signed by unauthorized third-party private key', () => {
            const rawGuid = '8d2e925d-b911-4b8a-8f12-090a9a0871a0'
            const deviceId = deriveFinalDeviceId(normalizeMachineGuid(rawGuid))

            // Attacker signs a valid payload with attacker's private key
            const forgedLicense = generateEcdsaLicense(
                {
                    tier: 'pro',
                    hwid: deviceId,
                    expiresAt: Date.now() + 1000000,
                    customer: 'attacker-corp',
                    features: ['all'],
                },
                attackerKeys.privateKey
            )

            // Application verifies against genuine vendor public key
            const result = verifyEcdsaLicense(forgedLicense, deviceId, publicKey)
            expect(result.valid).toBe(false)
            if (!result.valid) {
                expect(result.reason).toMatch(/signature/i)
            }
        })

        it('ADV-1.2: Rejects license with expired timestamp even if signature and HWID match', () => {
            const rawGuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            const deviceId = deriveFinalDeviceId(normalizeMachineGuid(rawGuid))

            const expiredLicense = generateEcdsaLicense(
                {
                    tier: 'pro',
                    hwid: deviceId,
                    expiresAt: Date.now() - 5000, // expired 5 seconds ago
                    customer: 'expired-corp',
                    features: ['all'],
                },
                privateKey
            )

            const result = verifyEcdsaLicense(expiredLicense, deviceId, publicKey)
            expect(result.valid).toBe(false)
            if (!result.valid) {
                expect(result.reason).toMatch(/expired/i)
            }
        })

        it('ADV-1.3: Rejects license where payload HWID is tampered after base32 encoding', () => {
            const rawGuid = '11111111-2222-3333-4444-555555555555'
            const deviceId = deriveFinalDeviceId(normalizeMachineGuid(rawGuid))

            const validLicense = generateEcdsaLicense(
                {
                    tier: 'pro',
                    hwid: deviceId,
                    expiresAt: Date.now() + 1000000,
                    customer: 'legit-corp',
                    features: ['all'],
                },
                privateKey
            )

            // Bit-flip inside license key
            const chars = validLicense.split('')
            chars[15] = chars[15] === 'A' ? 'B' : 'A'
            const corruptedLicense = chars.join('')

            const result = verifyEcdsaLicense(corruptedLicense, deviceId, publicKey)
            expect(result.valid).toBe(false)
        })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ADV 2: Cyber Fortress + Activity Journal Blockchain Integrity
    // ─────────────────────────────────────────────────────────────────────────
    describe('ADV 2: Cyber Fortress + Activity Journal Blockchain Stress', () => {
        it('ADV-2.1: Blockchain rejects reordering or omission of intermediate audit entries', async () => {
            const filePath = await sandbox.createFile('classified.txt', 'CONFIDENTIAL DATA')
            const pass = 'Str0ngP@ssw0rd!2026'

            const encRes = await encryptFile(filePath, pass)
            expect(encRes.success).toBe(true)

            // Create 4 chained events
            const chain: ActivityEntry[] = []
            let prev = GENESIS_PREV_HASH

            const actions = ['encrypt', 'scan', 'backup', 'decrypt']
            for (let i = 0; i < actions.length; i++) {
                const entry: ActivityEntry = {
                    id: `act-00${i + 1}`,
                    sequence: i + 1,
                    timestamp: 1700000000000 + i * 1000,
                    toolId: 'cyber_fortress',
                    action: actions[i],
                    category: 'crypto',
                    status: 'success',
                    details: `Step ${actions[i]} for file`,
                    prevHash: prev,
                    hash: '',
                }
                entry.hash = computeEntryHash(entry)
                prev = entry.hash
                chain.push(entry)
            }

            // Pristine check
            const pristineResult = verifyAuditChain(chain)
            expect(pristineResult.valid).toBe(true)
            expect(pristineResult.totalVerified).toBe(4)

            // Attack: Omit entry 2 (sequence gap 1 -> 3)
            const gapChain = [chain[0], chain[2], chain[3]]
            const gapResult = verifyAuditChain(gapChain)
            expect(gapResult.valid).toBe(false)
            expect(gapResult.brokenIndex).toBe(1)
            expect(gapResult.brokenReason).toMatch(/prevHash does not match/i)

            // Attack: Swap entries 1 and 2
            const swappedChain = [chain[0], chain[2], chain[1], chain[3]]
            const swapResult = verifyAuditChain(swappedChain)
            expect(swapResult.valid).toBe(false)
        })

        it('ADV-2.2: Canonical JSON determinism across arbitrary key permutations in metadata', () => {
            const meta1 = { zebra: 1, alpha: 'yes', nested: { b: 2, a: 1 }, flag: true }
            const meta2 = { flag: true, nested: { a: 1, b: 2 }, alpha: 'yes', zebra: 1 }

            const s1 = canonicalStringify(meta1)
            const s2 = canonicalStringify(meta2)
            expect(s1).toBe(s2)
            expect(s1).toBe('{"alpha":"yes","flag":true,"nested":{"a":1,"b":2},"zebra":1}')

            const entry1: ActivityEntry = {
                id: 'id-canon',
                sequence: 1,
                timestamp: 1000,
                toolId: 'tool',
                action: 'act',
                category: 'system',
                status: 'success',
                details: 'canon test',
                metadata: meta1,
                prevHash: GENESIS_PREV_HASH,
                hash: '',
            }
            const entry2: ActivityEntry = {
                ...entry1,
                metadata: meta2,
            }

            expect(computeEntryHash(entry1)).toBe(computeEntryHash(entry2))
        })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ADV 3: Bulk Organizer + DoD Shredder Path Guards & Collision Cascade
    // ─────────────────────────────────────────────────────────────────────────
    describe('ADV 3: Bulk Organizer + DoD Shredder Boundary Conditions', () => {
        it('ADV-3.1: Shredder strictly rejects protected Windows system directories or inaccessible files', async () => {
            const protectedPaths = [
                'C:\\Windows\\System32\\notepad.exe',
                'C:\\Program Files\\Common Files\\test.dll',
                'C:\\Program Files (x86)\\test.exe',
                'C:\\Windows\\win.ini',
            ]

            for (const p of protectedPaths) {
                const res = await shredFile(p)
                expect(res.success).toBe(false)
                expect(res.error).toBeDefined()
            }
        })

        it('ADV-3.2: getUniquePath gracefully resolves multi-iteration collision cascade', async () => {
            const baseDir = sandbox.sandboxDir
            const baseName = 'report.pdf'
            const targetPath = path.join(baseDir, baseName)

            // Create initial file and 10 collision files
            await fs.writeFile(targetPath, 'initial')
            for (let i = 1; i <= 10; i++) {
                await fs.writeFile(path.join(baseDir, `report (${i}).pdf`), `version ${i}`)
            }

            const unique = await getUniquePath(targetPath)
            expect(unique).toBe(path.join(baseDir, 'report (11).pdf'))
        })

        it('ADV-3.3: Organizer category categorization handles unknown and dotted extensions correctly', () => {
            expect(getCategory('.pdf')).toBe('Documents')
            expect(getCategory('.PDF')).toBe('Documents')
            expect(getCategory('.png')).toBe('Images')
            expect(getCategory('.tar.gz')).toBe('Others') // extension is .gz or split
            expect(getCategory('.gz')).toBe('Archives')
            expect(getCategory('.unknown_ext')).toBe('Others')
            expect(getCategory('')).toBe('Others')
        })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ADV 4: Network Tools + SSRF Filter Adversarial Matrix
    // ─────────────────────────────────────────────────────────────────────────
    describe('ADV 4: Network Tools & SSRF Guard Adversarial Matrix', () => {
        it('ADV-4.1: SSRF Guard blocks comprehensive cloud metadata and bypass payloads', () => {
            const maliciousUrls = [
                'http://169.254.169.254/latest/meta-data/',
                'http://metadata.google.internal/computeMetadata/v1/',
                'http://metadata.goog/',
                'http://instance-data/latest/meta-data/',
                'http://100.100.100.200/latest/meta-data/', // Alibaba
                'http://168.63.129.16/metadata/',           // Azure
                'http://[::ffff:169.254.169.254]/',         // IPv4-mapped IPv6
                'http://[fe80::1]/',                         // IPv6 link local
            ]

            for (const url of maliciousUrls) {
                const res = validateRequestTarget(url, { allowLocal: false })
                expect(res.valid, `Expected ${url} to be blocked by SSRF filter`).toBe(false)
            }
        })

        it('ADV-4.2: Header validation strictly rejects or sanitizes CRLF injection attempts', () => {
            // Strict mode rejects
            const badHeaderStrict = { 'X-Test': 'clean\r\nInjected-Header: evil' }
            const resStrict = validateAndSanitizeHeaders(badHeaderStrict as any, { strict: true })
            expect(resStrict.valid).toBe(false)
            expect(resStrict.error).toMatch(/CRLF/i)

            // Header name CRLF always rejected
            const badHeaderName = { 'X-Test\r\nEvil': 'normal_value' }
            const resName = validateAndSanitizeHeaders(badHeaderName as any)
            expect(resName.valid).toBe(false)
            expect(resName.error).toMatch(/CRLF/i)

            // Default mode sanitizes CRLF from value
            const badHeaderDefault = { 'X-Sanitize': 'hello\r\nworld' }
            const resDefault = validateAndSanitizeHeaders(badHeaderDefault as any)
            expect(resDefault.valid).toBe(true)
            expect(resDefault.sanitizedHeaders['X-Sanitize']).toBe('helloworld')
        })

        it('ADV-4.3: Request target rejects dangerous URI schemes', () => {
            const dangerousSchemes = [
                'file:///etc/passwd',
                'file:///C:/Windows/System32/drivers/etc/hosts',
                'gopher://127.0.0.1:6379/_flushall',
                'ftp://anonymous:guest@example.com/file',
                'javascript:alert(1)',
                'data:text/html,<script>alert(1)</script>',
            ]

            for (const url of dangerousSchemes) {
                const res = validateRequestTarget(url)
                expect(res.valid, `Expected scheme in ${url} to be rejected`).toBe(false)
            }
        })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ADV 5: Scenario Stress & Full Lifecycle Resilience
    // ─────────────────────────────────────────────────────────────────────────
    describe('ADV 5: Scenario Stress & Full Lifecycle Resilience', () => {
        it('ADV-5.1: Real-world data lifecycle survives wrong password attempt before successful decryption', async () => {
            const sensitiveData = 'PATIENT-MEDICAL-RECORD-HIPAA-PROTECTED'
            const sensitiveFile = await sandbox.createFile('patient_0912.dat', sensitiveData)
            const correctPass = 'CorrectPassword999!'
            const wrongPass = 'WrongPassword000!'

            // 1. Encrypt
            const encRes = await encryptFile(sensitiveFile, correctPass)
            expect(encRes.success).toBe(true)
            const vaultPath = encRes.outPath!

            // 2. Shred original
            const shredRes = await shredFile(sensitiveFile)
            expect(shredRes.success).toBe(true)
            expect(fsSync.existsSync(sensitiveFile)).toBe(false)

            // 3. Attempt decryption with wrong password
            const failDecRes = await decryptFile(vaultPath, wrongPass)
            expect(failDecRes.success).toBe(false)
            expect(failDecRes.error).toMatch(/Hatalı parola|şifre çözülemedi|authentication failed/i)

            // 4. Attempt decryption with correct password succeeds
            const okDecRes = await decryptFile(vaultPath, correctPass)
            expect(okDecRes.success).toBe(true)
            const recovered = await fs.readFile(okDecRes.outPath!, 'utf-8')
            expect(recovered).toBe(sensitiveData)
        })

        it('ADV-5.2: Activity Journal maintains chain validity even across failed operation entries', () => {
            const chain: ActivityEntry[] = []
            let prev = GENESIS_PREV_HASH

            // 1. Success event
            const e1: ActivityEntry = {
                id: 'ev-1',
                sequence: 1,
                timestamp: 1000,
                toolId: 'auth',
                action: 'login',
                category: 'security',
                status: 'success',
                details: 'User logged in',
                prevHash: prev,
                hash: '',
            }
            e1.hash = computeEntryHash(e1)
            prev = e1.hash
            chain.push(e1)

            // 2. Failed event (e.g. brute force attempt)
            const e2: ActivityEntry = {
                id: 'ev-2',
                sequence: 2,
                timestamp: 2000,
                toolId: 'fortress',
                action: 'decrypt',
                category: 'crypto',
                status: 'failure',
                details: 'Failed decrypt: incorrect passphrase',
                prevHash: prev,
                hash: '',
            }
            e2.hash = computeEntryHash(e2)
            prev = e2.hash
            chain.push(e2)

            // 3. Recovery event
            const e3: ActivityEntry = {
                id: 'ev-3',
                sequence: 3,
                timestamp: 3000,
                toolId: 'fortress',
                action: 'decrypt',
                category: 'crypto',
                status: 'success',
                details: 'Successful decrypt with correct passphrase',
                prevHash: prev,
                hash: '',
            }
            e3.hash = computeEntryHash(e3)
            chain.push(e3)

            const verifyResult = verifyAuditChain(chain)
            expect(verifyResult.valid).toBe(true)
            expect(verifyResult.totalVerified).toBe(3)
        })
    })
})
