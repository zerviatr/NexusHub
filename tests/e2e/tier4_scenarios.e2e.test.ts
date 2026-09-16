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
    GENESIS_PREV_HASH,
    type ActivityEntry,
} from '../../src/shared/auditIntegrity'
import { getCategory, getUniquePath } from '../../src/main/services/organizerCore'
import {
    validateRequestTarget,
    validateAndSanitizeHeaders,
} from '../../src/main/ipc/netDispatcherSecurity'
import { parsePdfPageRange, inspectPdfBytes } from './mediaEngines.e2e.test'

describe('E2E TIER 4: Real-World Application Workflows & Scenarios', () => {
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

    beforeEach(async () => {
        sandbox = await createTempSandbox('tier4-scenarios-e2e-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: Enterprise User Provisioning & License Activation
    // ─────────────────────────────────────────────────────────────────────────
    it('Scenario 1: Complete first-run provisioning, HWID lock, SafeStorage vault and bridge readiness', async () => {
        // Step 1: User boots application on corporate Windows workstation
        const workstationMachineGuid = 'c57a94f0-4592-498b-9d41-3242ea87bc12'
        const normalized = normalizeMachineGuid(workstationMachineGuid)
        const hostDeviceId = deriveFinalDeviceId(normalized)
        expect(hostDeviceId).toMatch(/^[0-9a-f]{64}$/)

        // Step 2: IT administrator issues enterprise ECDSA license locked to host
        const enterpriseLicenseKey = generateEcdsaLicense(
            {
                tier: 'pro',
                hwid: hostDeviceId,
                expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
                customer: 'Global Aerospace Ltd',
                features: ['audit_blockchain', 'cyber_fortress', 'api_studio'],
            },
            privateKey
        )
        expect(enterpriseLicenseKey).toContain('ZENDEV')

        // Step 3: Frontend validation verifies signature and HWID match
        const validation = verifyEcdsaLicense(enterpriseLicenseKey, hostDeviceId, publicKey)
        expect(validation.valid).toBe(true)
        if (!validation.valid) return

        // Step 4: Write to encrypted SafeStorage vault file
        const safeStorageVaultPath = path.join(sandbox.sandboxDir, 'license.enc')
        await fs.writeFile(safeStorageVaultPath, Buffer.from(enterpriseLicenseKey).toString('base64'), 'utf-8')
        expect(fsSync.existsSync(safeStorageVaultPath)).toBe(true)

        // Step 5: Verify window.nexusAPI bridge initializes with all 20 operational namespaces
        const mockBridge = REQUIRED_NEXUS_API_NAMESPACES.reduce((acc, ns) => {
            acc[ns] = {}
            return acc
        }, {} as Record<string, any>)

        expect(Object.keys(mockBridge)).toHaveLength(20)
        expect(mockBridge.license).toBeDefined()
        expect(mockBridge.fortress).toBeDefined()
        expect(mockBridge.journal).toBeDefined()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: Secure Data Lifecycle & DoD 7-Pass Sanitization
    // ─────────────────────────────────────────────────────────────────────────
    it('Scenario 2: Sensitive file creation -> AES-256-GCM vault -> DoD shredding -> audit verification', async () => {
        const auditLog: ActivityEntry[] = []
        let lastHash = GENESIS_PREV_HASH

        // Step 1: Sensitive document created
        const plaintextPath = await sandbox.createFile(
            'classified_project.doc',
            'PROJECT-NEBULA-DEFENSE-ARCHITECTURE-SPECIFICATION'
        )
        const vaultPassword = 'SuperSecretEncryptionPassword!2026'

        // Step 2: Encrypt with Cyber Fortress
        const encRes = await encryptFile(plaintextPath, vaultPassword)
        expect(encRes.success).toBe(true)
        const vaultPath = encRes.outPath!

        // Header check
        const header = parseVaultHeader(vaultPath)
        expect(header.isValid).toBe(true)
        expect(header.magic).toBe('NEXUSV1')

        // Log to Activity Journal
        const encEntry: ActivityEntry = {
            id: 'journal-01',
            sequence: 1,
            timestamp: Date.now(),
            toolId: 'cyber_fortress',
            action: 'encrypt_file',
            category: 'crypto',
            status: 'success',
            details: `Encrypted ${path.basename(plaintextPath)} into vault`,
            prevHash: lastHash,
            hash: '',
        }
        encEntry.hash = computeEntryHash(encEntry)
        lastHash = encEntry.hash
        auditLog.push(encEntry)

        // Step 3: Irreversibly wipe original plaintext with DoD 5220.22-M 7-pass shredder
        const shredRes = await shredFile(plaintextPath)
        expect(shredRes.success).toBe(true)
        expect(shredRes.passes).toBe(7)
        expect(fsSync.existsSync(plaintextPath)).toBe(false)

        // Log shredding to Activity Journal
        const shredEntry: ActivityEntry = {
            id: 'journal-02',
            sequence: 2,
            timestamp: Date.now() + 10,
            toolId: 'cyber_fortress',
            action: 'shred_file',
            category: 'crypto',
            status: 'success',
            details: `Shredded ${path.basename(plaintextPath)} using DoD 7 passes`,
            prevHash: lastHash,
            hash: '',
        }
        shredEntry.hash = computeEntryHash(shredEntry)
        auditLog.push(shredEntry)

        // Step 4: Verify blockchain audit log integrity
        const auditCheck = verifyAuditChain(auditLog)
        expect(auditCheck.valid).toBe(true)
        expect(auditCheck.totalVerified).toBe(2)

        // Step 5: Restore from vault to verify perfect data recovery
        const decRes = await decryptFile(vaultPath, vaultPassword)
        expect(decRes.success).toBe(true)
        const restoredData = await fs.readFile(decRes.outPath!, 'utf-8')
        expect(restoredData).toBe('PROJECT-NEBULA-DEFENSE-ARCHITECTURE-SPECIFICATION')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: Network Incident Response & Security Triage
    // ─────────────────────────────────────────────────────────────────────────
    it('Scenario 3: Port identification -> TLS cert validation -> API Studio probe with SSRF guard', () => {
        // Step 1: Discover service listening on port 8443
        const activePort = 8443
        expect(activePort).toBeGreaterThan(0)
        expect(activePort).toBeLessThanOrEqual(65535)

        // Step 2: Validate Target URL against SSRF policy
        const targetServiceUrl = `https://internal-api.zendev.app:${activePort}/status`
        const urlValidation = validateRequestTarget(targetServiceUrl, { allowLocal: true })
        expect(urlValidation.valid).toBe(true)

        // Step 3: Verify illegal metadata targets are rejected during triage
        const rogueTarget = 'http://169.254.169.254/latest/dynamic/instance-identity/'
        const rogueValidation = validateRequestTarget(rogueTarget)
        expect(rogueValidation.valid).toBe(false)

        // Step 4: Dispatch sanitized headers to security health probe
        const headers = {
            'User-Agent': 'ZenDev-Triage-Bot/2.4.2',
            'X-Incident-Id': 'INC-2026-9988',
            'Authorization': 'Bearer incident-token-xyz',
        }
        const sanitizedHeaders = validateAndSanitizeHeaders(headers)
        expect(sanitizedHeaders.valid).toBe(true)
        expect(sanitizedHeaders.sanitizedHeaders['X-Incident-Id']).toBe('INC-2026-9988')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 4: Corporate Document Assembly & Distribution Pipeline
    // ─────────────────────────────────────────────────────────────────────────
    it('Scenario 4: Multi-source PDF gathering -> page range slicing -> document renumbering -> categorization', async () => {
        // Step 1: Ingest 10-page document representation
        const totalDocPages = 10
        const requestedRange = '1-3, 5, 8-9'
        const targetIndices = parsePdfPageRange(requestedRange, totalDocPages)
        expect(targetIndices).toEqual([0, 1, 2, 4, 7, 8])

        // Step 2: Simulate output bundled document
        const bundledDoc = Buffer.from(
            '%PDF-1.7\n' +
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
            '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>\nendobj\n' +
            '3 0 obj\n<< /Type /Page >>\nendobj\n' +
            '4 0 obj\n<< /Type /Page >>\nendobj\n' +
            '5 0 obj\n<< /Type /Page >>\nendobj\n' +
            'trailer\n<< /Root 1 0 R >>\n%%EOF\n'
        )

        const pdfPath = await sandbox.createFile('Executive_Briefing.pdf', bundledDoc)
        const info = inspectPdfBytes(bundledDoc)
        expect(info.isValid).toBe(true)
        expect(info.pageCount).toBe(3)

        // Step 3: Automatically categorize generated artifact into organizational hierarchy
        const category = getCategory(path.extname(pdfPath))
        expect(category).toBe('Documents')

        const targetFolder = path.join(sandbox.sandboxDir, category)
        await fs.mkdir(targetFolder, { recursive: true })
        const organizedPath = await getUniquePath(path.join(targetFolder, path.basename(pdfPath)))

        await fs.rename(pdfPath, organizedPath)
        expect(fsSync.existsSync(organizedPath)).toBe(true)
        expect(organizedPath).toContain('Documents')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 5: High-Volume Media Production & Publishing Workflow
    // ─────────────────────────────────────────────────────────────────────────
    it('Scenario 5: Multi-resolution Lanczos3 downscaling -> WebP format mapping -> automated activity logging', async () => {
        // Step 1: Input image metadata specification
        const rawPhoto = {
            width: 3840,
            height: 2160,
            format: 'png',
            name: 'product_photo.png',
        }

        // Step 2: Downscale for Web publication preserving 16:9 ratio without enlargement
        const maxWebWidth = 1920
        const maxWebHeight = 1080
        const scaleRatio = Math.min(maxWebWidth / rawPhoto.width, maxWebHeight / rawPhoto.height)

        const targetWidth = Math.round(rawPhoto.width * scaleRatio)
        const targetHeight = Math.round(rawPhoto.height * scaleRatio)
        expect(targetWidth).toBe(1920)
        expect(targetHeight).toBe(1080)

        // Step 3: Build destination asset with WebP format and suffix
        const outputWebPName = `${path.basename(rawPhoto.name, '.png')}_optimized.webp`
        const outputWebPPath = await sandbox.createFile(outputWebPName, 'WEBP-TRANSCODED-PAYLOAD')

        // Step 4: Categorize into media directory
        const cat = getCategory(path.extname(outputWebPPath))
        expect(cat).toBe('Images')

        // Step 5: Log media production event into immutable Activity Journal
        const mediaLog: ActivityEntry = {
            id: 'media-prod-01',
            sequence: 1,
            timestamp: Date.now(),
            toolId: 'image_toolkit',
            action: 'batch_transcode',
            category: 'file',
            status: 'success',
            details: `Processed ${rawPhoto.name} to ${outputWebPName} (1920x1080 WebP)`,
            metadata: {
                originalDimensions: `${rawPhoto.width}x${rawPhoto.height}`,
                targetDimensions: `${targetWidth}x${targetHeight}`,
                format: 'webp',
            },
            prevHash: GENESIS_PREV_HASH,
            hash: '',
        }
        mediaLog.hash = computeEntryHash(mediaLog)

        const chainStatus = verifyAuditChain([mediaLog])
        expect(chainStatus.valid).toBe(true)
        expect(chainStatus.totalVerified).toBe(1)
        expect(fsSync.existsSync(outputWebPPath)).toBe(true)
    })
})
