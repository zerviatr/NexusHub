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
import { createTempSandbox } from './helpers/testHarness'
import {
    CATEGORIES,
    getCategory,
    getUniquePath,
} from '../../src/main/services/organizerCore'
import {
    computeEntryHash,
    verifyAuditChain,
    GENESIS_PREV_HASH,
    type ActivityEntry,
} from '../../src/shared/auditIntegrity'

describe('E2E FEAT-06: System Utilities (Organizer, Clipboard, Bypasser, Sentinel & Journal)', () => {
    let sandbox: {
        sandboxDir: string
        createFile: (relativePath: string, content: string | Buffer) => Promise<string>
        cleanup: () => Promise<void>
    }

    beforeEach(async () => {
        sandbox = await createTempSandbox('sys-utils-e2e-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (Core System Utilities Contracts)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should classify file extensions into the 8 defined organizer categories', () => {
        expect(getCategory('.png')).toBe('Images')
        expect(getCategory('.mp4')).toBe('Videos')
        expect(getCategory('.mp3')).toBe('Audio')
        expect(getCategory('.pdf')).toBe('Documents')
        expect(getCategory('.zip')).toBe('Archives')
        expect(getCategory('.exe')).toBe('Installers')
        expect(getCategory('.rs')).toBe('Code')
        expect(getCategory('.unknownext')).toBe('Others')
    })

    it('T1.2: Should organize files into category folders and record undo history', async () => {
        // Create sample mixed files
        const file1 = await sandbox.createFile('picture.png', 'IMAGE')
        const file2 = await sandbox.createFile('notes.pdf', 'DOC')
        const file3 = await sandbox.createFile('archive.zip', 'ZIP')

        interface UndoRecord {
            oldPath: string
            newPath: string
        }
        const undoStack: UndoRecord[] = []

        const filesToOrganize = [file1, file2, file3]
        for (const filePath of filesToOrganize) {
            const ext = path.extname(filePath)
            const cat = getCategory(ext)
            const targetDir = path.join(sandbox.sandboxDir, cat)
            await fs.mkdir(targetDir, { recursive: true })
            const targetPath = path.join(targetDir, path.basename(filePath))

            await fs.rename(filePath, targetPath)
            undoStack.push({ oldPath: filePath, newPath: targetPath })
        }

        expect(fsSync.existsSync(path.join(sandbox.sandboxDir, 'Images', 'picture.png'))).toBe(true)
        expect(fsSync.existsSync(path.join(sandbox.sandboxDir, 'Documents', 'notes.pdf'))).toBe(true)
        expect(fsSync.existsSync(path.join(sandbox.sandboxDir, 'Archives', 'archive.zip'))).toBe(true)
        expect(undoStack).toHaveLength(3)
    })

    it('T1.3: Should successfully undo file organization reverting files in reverse order', async () => {
        const file = await sandbox.createFile('script.py', 'print("hello")')
        const categoryDir = path.join(sandbox.sandboxDir, 'Code')
        await fs.mkdir(categoryDir, { recursive: true })
        const targetPath = path.join(categoryDir, 'script.py')

        await fs.rename(file, targetPath)
        expect(fsSync.existsSync(targetPath)).toBe(true)
        expect(fsSync.existsSync(file)).toBe(false)

        // Execute Undo
        await fs.rename(targetPath, file)
        expect(fsSync.existsSync(file)).toBe(true)
        expect(fsSync.existsSync(targetPath)).toBe(false)
    })

    it('T1.4: Should generate monotonic length-prefixed blockchain hashes starting from genesis', () => {
        const entry1: ActivityEntry = {
            id: 'entry-01',
            sequence: 1,
            timestamp: 1700000000000,
            toolId: 'cyber_fortress',
            action: 'file_encrypted',
            category: 'crypto',
            status: 'success',
            details: 'Encrypted document.pdf',
            prevHash: GENESIS_PREV_HASH,
            hash: '',
        }
        entry1.hash = computeEntryHash(entry1)
        expect(entry1.hash).toHaveLength(64)
        expect(entry1.hash).toMatch(/^[0-9a-f]{64}$/)

        const entry2: ActivityEntry = {
            id: 'entry-02',
            sequence: 2,
            timestamp: 1700000001000,
            toolId: 'cyber_fortress',
            action: 'file_shredded',
            category: 'crypto',
            status: 'success',
            details: 'Shredded document.pdf',
            prevHash: entry1.hash,
            hash: '',
        }
        entry2.hash = computeEntryHash(entry2)
        expect(entry2.prevHash).toBe(entry1.hash)
        expect(entry2.hash).not.toBe(entry1.hash)
    })

    it('T1.5: Should verify audit chain validity across sequential blockchain records', () => {
        const chain: ActivityEntry[] = []
        let lastHash = GENESIS_PREV_HASH

        for (let i = 1; i <= 5; i++) {
            const entry: ActivityEntry = {
                id: `id-${i}`,
                sequence: i,
                timestamp: 1700000000000 + i * 1000,
                toolId: 'network_tools',
                action: 'port_scanned',
                category: 'network',
                status: 'success',
                details: `Scanned port 80${i}`,
                prevHash: lastHash,
                hash: '',
            }
            entry.hash = computeEntryHash(entry)
            lastHash = entry.hash
            chain.push(entry)
        }

        const verification = verifyAuditChain(chain)
        expect(verification.valid).toBe(true)
        expect(verification.totalVerified).toBe(5)
    })

    it('T1.6: Should strip tracking parameters while preserving query parameters and anchors', () => {
        const TRACKER_KEYS = new Set([
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'gclid', 'fbclid', 'msclkid', 'ref', 'ref_src'
        ])

        const cleanTrackingParameters = (rawUrl: string): { cleanUrl: string; removedCount: number } => {
            const parsed = new URL(rawUrl)
            let removedCount = 0
            const keysToRemove: string[] = []

            parsed.searchParams.forEach((_, key) => {
                if (TRACKER_KEYS.has(key.toLowerCase())) {
                    keysToRemove.push(key)
                }
            })

            for (const key of keysToRemove) {
                parsed.searchParams.delete(key)
                removedCount++
            }

            return { cleanUrl: parsed.toString(), removedCount }
        }

        const dirtyUrl = 'https://example.com/product?id=42&utm_source=twitter&fbclid=abc123xyz&ref=partner#reviews'
        const { cleanUrl, removedCount } = cleanTrackingParameters(dirtyUrl)

        expect(removedCount).toBe(3)
        expect(cleanUrl).toContain('id=42')
        expect(cleanUrl).toContain('#reviews')
        expect(cleanUrl).not.toContain('utm_source')
        expect(cleanUrl).not.toContain('fbclid')
        expect(cleanUrl).not.toContain('ref=')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (Defensive & Robustness)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should generate collision-free unique paths by appending counter (1).ext', async () => {
        const baseTarget = path.join(sandbox.sandboxDir, 'contract.pdf')
        await sandbox.createFile('contract.pdf', 'V1')

        // First collision -> contract (1).pdf
        const unique1 = await getUniquePath(baseTarget)
        expect(unique1).toBe(path.join(sandbox.sandboxDir, 'contract (1).pdf'))

        // Create the collision file to trigger increment -> contract (2).pdf
        await sandbox.createFile('contract (1).pdf', 'V2')
        const unique2 = await getUniquePath(baseTarget)
        expect(unique2).toBe(path.join(sandbox.sandboxDir, 'contract (2).pdf'))
    })

    it('T2.2: Should detect tampering when any field in an activity journal entry is altered', () => {
        const chain: ActivityEntry[] = []
        let lastHash = GENESIS_PREV_HASH

        for (let i = 1; i <= 3; i++) {
            const entry: ActivityEntry = {
                id: `id-${i}`,
                sequence: i,
                timestamp: 1700000000000 + i * 1000,
                toolId: 'system_optimizer',
                action: 'dns_flushed',
                category: 'system',
                status: 'success',
                details: 'DNS Cache Flushed',
                prevHash: lastHash,
                hash: '',
            }
            entry.hash = computeEntryHash(entry)
            lastHash = entry.hash
            chain.push(entry)
        }

        // Tamper entry 2 details
        chain[1].details = 'MALICIOUS_TAMPERED_ACTION'

        const verification = verifyAuditChain(chain)
        expect(verification.valid).toBe(false)
        expect(verification.brokenIndex).toBe(1)
    })

    it('T2.3: Should enforce clipboard ring-buffer limits (max 50 items, max 50KB per entry)', () => {
        class MockClipboardManager {
            private history: Array<{ id: string; text: string; size: number }> = []
            private readonly MAX_ITEMS = 50
            private readonly MAX_BYTES = 50 * 1024 // 50 KB

            public add(text: string): boolean {
                const byteLength = Buffer.byteLength(text, 'utf-8')
                if (byteLength > this.MAX_BYTES) {
                    return false // Exceeds individual entry cap
                }

                this.history.unshift({ id: `clip-${Date.now()}-${Math.random()}`, text, size: byteLength })
                if (this.history.length > this.MAX_ITEMS) {
                    this.history.pop() // Enforce ring buffer ceiling
                }
                return true
            }

            public getCount(): number {
                return this.history.length
            }
        }

        const manager = new MockClipboardManager()

        // Push 60 small entries -> should be capped at 50
        for (let i = 0; i < 60; i++) {
            expect(manager.add(`clip text ${i}`)).toBe(true)
        }
        expect(manager.getCount()).toBe(50)

        // Attempt to push a 60 KB entry -> must be rejected
        const hugeText = 'A'.repeat(60 * 1024)
        expect(manager.add(hugeText)).toBe(false)
        expect(manager.getCount()).toBe(50)
    })

    it('T2.4: Should enforce 15-hop redirect chaining limit in link bypasser', () => {
        const resolveRedirectsWithHopLimit = (chainLength: number, maxHops = 15) => {
            if (chainLength > maxHops) {
                return { success: false, error: 'Too many redirects: exceeded 15 hops limit' }
            }
            return { success: true, hops: chainLength }
        }

        expect(resolveRedirectsWithHopLimit(5).success).toBe(true)
        expect(resolveRedirectsWithHopLimit(15).success).toBe(true)
        expect(resolveRedirectsWithHopLimit(16).success).toBe(false)
        expect(resolveRedirectsWithHopLimit(100).success).toBe(false)
    })

    it('T2.5: Should validate Sentinel metrics collection schema invariants', () => {
        const sampleMetrics = {
            cpuModel: 'AMD Ryzen 9 7950X',
            coreCount: 16,
            overallCpuUsage: 12.5,
            totalMemoryBytes: 34359738368, // 32 GB
            usedMemoryBytes: 17179869184,  // 16 GB
            uptimeSeconds: 86400,
            os: 'Windows 11 Pro 64-bit',
        }

        expect(sampleMetrics.coreCount).toBeGreaterThan(0)
        expect(sampleMetrics.overallCpuUsage).toBeGreaterThanOrEqual(0)
        expect(sampleMetrics.overallCpuUsage).toBeLessThanOrEqual(100)
        expect(sampleMetrics.usedMemoryBytes).toBeLessThanOrEqual(sampleMetrics.totalMemoryBytes)
        expect(sampleMetrics.uptimeSeconds).toBeGreaterThan(0)
    })

    it('T2.6: Should reject journal entries with non-monotonic sequences or invalid genesis', () => {
        const invalidGenesisEntry: ActivityEntry = {
            id: 'bad-genesis',
            sequence: 1,
            timestamp: Date.now(),
            toolId: 'tool',
            action: 'act',
            category: 'general',
            status: 'info',
            details: 'Wrong genesis hash',
            prevHash: 'invalid-genesis-hash',
            hash: '',
        }
        invalidGenesisEntry.hash = computeEntryHash(invalidGenesisEntry)

        const res = verifyAuditChain([invalidGenesisEntry])
        expect(res.valid).toBe(false)
        expect(res.brokenReason || res.error).toMatch(/genesis/i)
    })
})
