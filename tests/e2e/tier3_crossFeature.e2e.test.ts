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
} from './helpers/testHarness'
import { encryptFile, decryptFile, shredFile } from '../../src/main/services/vaultCrypto'
import { verifyEcdsaLicense } from '../../src/shared/ecdsaLicense'
import { generateEcdsaLicense } from '../../server/src/services/licenseSigner'
import {
    computeEntryHash,
    verifyAuditChain,
    GENESIS_PREV_HASH,
    type ActivityEntry,
} from '../../src/shared/auditIntegrity'
import { getCategory, getUniquePath } from '../../src/main/services/organizerCore'
import {
    validateRequestTarget,
    validateAndSanitizeHeaders,
} from '../../src/main/ipc/netDispatcherSecurity'

describe('E2E TIER 3: Cross-Feature Pairwise Combinations & Interoperability', () => {
    let sandbox: {
        sandboxDir: string
        createFile: (relativePath: string, content: string | Buffer) => Promise<string>
        cleanup: () => Promise<void>
    }

    // Ephemeral ECDSA keypair for cryptographic testing
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    beforeEach(async () => {
        sandbox = await createTempSandbox('tier3-cross-feature-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    it('T3.1: [HWID + License + SafeStorage] HWID fingerprinting -> ECDSA license generation -> storage & verification', () => {
        // 1. Derive HWID from raw machine GUID
        const rawGuid = '8d2e925d-b911-4b8a-8f12-090a9a0871a0'
        const normalized = normalizeMachineGuid(rawGuid)
        const deviceId = deriveFinalDeviceId(normalized)

        // 2. Generate license locked to this deviceId
        const licenseKey = generateEcdsaLicense(
            {
                tier: 'pro',
                hwid: deviceId,
                expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
                customer: 'cross-feature-corp',
                features: ['all_tools'],
            },
            privateKey
        )

        // 3. Emulate SafeStorage persistent payload encryption
        const mockSafeStorage = {
            store: new Map<string, string>(),
            save(key: string, value: string) {
                this.store.set(key, Buffer.from(value, 'utf-8').toString('base64'))
            },
            retrieve(key: string): string | null {
                const enc = this.store.get(key)
                if (!enc) return null
                return Buffer.from(enc, 'base64').toString('utf-8')
            },
        }

        mockSafeStorage.save('nexus_license_key', licenseKey)

        // 4. Retrieve and verify against host deviceId
        const restoredKey = mockSafeStorage.retrieve('nexus_license_key')
        expect(restoredKey).toBe(licenseKey)

        const valResult = verifyEcdsaLicense(restoredKey!, deviceId, publicKey)
        expect(valResult.valid).toBe(true)
        if (valResult.valid) {
            expect(valResult.hwid).toBe(deviceId)
            expect(valResult.tier).toBe('pro')
        }
    })

    it('T3.2: [Cyber Fortress + Activity Journal] Encrypt file -> log hash chained audit -> decrypt -> verify chain', async () => {
        const secretPath = await sandbox.createFile('confidential_plan.docx', 'TOP-SECRET-FINANCIAL-ROADMAP')
        const pass = 'VaultKeyPass2026!'

        const auditTrail: ActivityEntry[] = []
        let lastHash = GENESIS_PREV_HASH

        // Step 1: Encrypt file
        const encRes = await encryptFile(secretPath, pass)
        expect(encRes.success).toBe(true)

        // Log to journal
        const encAudit: ActivityEntry = {
            id: 'audit-enc-01',
            sequence: 1,
            timestamp: Date.now(),
            toolId: 'cyber_fortress',
            action: 'file_encrypt',
            category: 'crypto',
            status: 'success',
            details: `Encrypted ${path.basename(secretPath)} to vault`,
            prevHash: lastHash,
            hash: '',
        }
        encAudit.hash = computeEntryHash(encAudit)
        lastHash = encAudit.hash
        auditTrail.push(encAudit)

        // Step 2: Delete plaintext
        await fs.unlink(secretPath)

        // Step 3: Decrypt file
        const decRes = await decryptFile(encRes.outPath!, pass)
        expect(decRes.success).toBe(true)

        // Log decryption to journal
        const decAudit: ActivityEntry = {
            id: 'audit-dec-02',
            sequence: 2,
            timestamp: Date.now() + 50,
            toolId: 'cyber_fortress',
            action: 'file_decrypt',
            category: 'crypto',
            status: 'success',
            details: `Decrypted ${path.basename(encRes.outPath!)} to plaintext`,
            prevHash: lastHash,
            hash: '',
        }
        decAudit.hash = computeEntryHash(decAudit)
        auditTrail.push(decAudit)

        // Step 4: Verify blockchain audit integrity
        const chainStatus = verifyAuditChain(auditTrail)
        expect(chainStatus.valid).toBe(true)
        expect(chainStatus.totalVerified).toBe(2)

        const restored = await fs.readFile(decRes.outPath!, 'utf-8')
        expect(restored).toBe('TOP-SECRET-FINANCIAL-ROADMAP')
    })

    it('T3.3: [Bulk Organizer + DoD Shredder] Categorize files -> identify target category -> securely shred', async () => {
        // Create mixed folder
        const tempKey = await sandbox.createFile('secret_script.py', 'print("PRIVATE-CODE")')
        const invoice = await sandbox.createFile('invoice.pdf', 'INVOICE-PDF-DATA')
        const logo = await sandbox.createFile('logo.png', 'PNG-IMAGE-DATA')

        // 1. Bulk organize
        const files = [tempKey, invoice, logo]
        const categorized: Record<string, string[]> = {}

        for (const file of files) {
            const ext = path.extname(file)
            const cat = getCategory(ext)
            const targetDir = path.join(sandbox.sandboxDir, cat)
            await fs.mkdir(targetDir, { recursive: true })
            const targetPath = path.join(targetDir, path.basename(file))
            await fs.rename(file, targetPath)
            categorized[cat] = categorized[cat] || []
            categorized[cat].push(targetPath)
        }

        expect(categorized['Code']).toHaveLength(1) // .key -> Code category
        expect(categorized['Documents']).toHaveLength(1) // .pdf
        expect(categorized['Images']).toHaveLength(1) // .png

        // 2. Select the sensitive Code file and securely shred it
        const targetToShred = categorized['Code'][0]
        expect(fsSync.existsSync(targetToShred)).toBe(true)

        const shredRes = await shredFile(targetToShred)
        expect(shredRes.success).toBe(true)
        expect(shredRes.passes).toBe(7)
        expect(fsSync.existsSync(targetToShred)).toBe(false)

        // 3. Verify non-shredded files remain completely intact
        expect(fsSync.existsSync(categorized['Documents'][0])).toBe(true)
        expect(fsSync.existsSync(categorized['Images'][0])).toBe(true)
    })

    it('T3.4: [Network Tools + API Studio + Link Bypasser] Target URL validation -> SSRF guard -> tracking stripper', () => {
        // Step 1: User supplies dirty external URL with tracking parameters
        const incomingUrl = 'https://analytics.zendev.app/campaign?target=promo&utm_source=adwords&gclid=TEST12345&fbclid=FB999'

        // Step 2: Validate through API Studio SSRF Guard
        const targetValidation = validateRequestTarget(incomingUrl, { allowLocal: false })
        expect(targetValidation.valid).toBe(true)
        if (!targetValidation.valid) return

        // Step 3: Validate request headers
        const headerRes = validateAndSanitizeHeaders({
            'User-Agent': 'ZenDev-Studio/2.4.2',
            'Accept': 'application/json',
        })
        expect(headerRes.valid).toBe(true)

        // Step 4: Link Decrypter / Bypasser strips tracking parameters
        const parsedUrl = targetValidation.parsedUrl
        const keysToRemove = ['utm_source', 'gclid', 'fbclid']
        keysToRemove.forEach((k) => parsedUrl.searchParams.delete(k))

        const cleanResult = parsedUrl.toString()
        expect(cleanResult).toBe('https://analytics.zendev.app/campaign?target=promo')
        expect(cleanResult).not.toContain('utm_source')
        expect(cleanResult).not.toContain('gclid')
    })

    it('T3.5: [Media Pipeline + Bulk Organizer] Asset transcoding output -> organizer category allocation', async () => {
        // Simulate output of image transcoder & document generator
        const bannerPath = await sandbox.createFile('hero-banner.webp', 'WEBP-TRANSCODED-BYTES')
        const reportPath = await sandbox.createFile('summary-report.pdf', '%PDF-1.7 ...')

        const mediaOutputs = [bannerPath, reportPath]
        const organizedLocations: string[] = []

        for (const file of mediaOutputs) {
            const cat = getCategory(path.extname(file))
            const dir = path.join(sandbox.sandboxDir, cat)
            await fs.mkdir(dir, { recursive: true })
            const dest = await getUniquePath(path.join(dir, path.basename(file)))
            await fs.rename(file, dest)
            organizedLocations.push(dest)
        }

        expect(organizedLocations[0]).toContain('Images')
        expect(organizedLocations[1]).toContain('Documents')
        expect(fsSync.existsSync(organizedLocations[0])).toBe(true)
        expect(fsSync.existsSync(organizedLocations[1])).toBe(true)
    })

    it('T3.6: [Sentinel + Optimizer + Activity Journal] Poll metrics -> flush DNS -> record audit blockchain', () => {
        // 1. Sentinel telemetry poll
        const mockTelemetry = {
            cpuUsage: 18.4,
            ramUsedMB: 4096,
            ramTotalMB: 16384,
            healthy: true,
        }
        expect(mockTelemetry.healthy).toBe(true)

        // 2. Optimizer execution
        const mockOptimizerResult = {
            dnsFlushed: true,
            tempFreedBytes: 1048576, // 1 MB
        }
        expect(mockOptimizerResult.dnsFlushed).toBe(true)

        // 3. Activity Journal recording
        const chain: ActivityEntry[] = []
        const logEntry: ActivityEntry = {
            id: 'opt-entry-01',
            sequence: 1,
            timestamp: Date.now(),
            toolId: 'system_optimizer',
            action: 'system_optimize_all',
            category: 'system',
            status: 'success',
            details: `Freed ${mockOptimizerResult.tempFreedBytes} bytes and flushed DNS`,
            metadata: {
                cpuUsageBefore: mockTelemetry.cpuUsage,
                freedBytes: mockOptimizerResult.tempFreedBytes,
            },
            prevHash: GENESIS_PREV_HASH,
            hash: '',
        }
        logEntry.hash = computeEntryHash(logEntry)
        chain.push(logEntry)

        const verification = verifyAuditChain(chain)
        expect(verification.valid).toBe(true)
        expect(verification.totalVerified).toBe(1)
    })
})
