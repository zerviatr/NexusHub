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

// ── In-Memory Electron IPC & App Mock via vi.hoisted ─────────────────────────
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
    `nexus-ipc-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
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
      getPath: vi.fn((name: string) => {
        if (name === 'userData') return tmpDir
        return tmpDir
      }),
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

// Import service, IPC registration, and pubsub after electron mock
import { registerActivityJournalIPC } from '../src/main/ipc/activityJournal'
import { activityJournalService } from '../src/main/services/activityJournal.service'
import { pubsubService } from '../src/main/services/pubsub.service'
import {
  ActivityEntry,
  computeEntryHash,
  GENESIS_PREV_HASH,
} from '../src/shared/auditIntegrity'

// Helper to simulate ipcRenderer.invoke()
async function invokeJournalIpc(channel: string, ...args: any[]): Promise<any> {
  const handler = ipcHandlers.get(channel)
  if (!handler) {
    throw new Error(`[IPC Error] No handler registered for channel '${channel}'`)
  }
  return handler({ sender: {} }, ...args)
}

describe('Activity Journal Main Process IPC Handlers (tests/activityJournalIPC.test.ts)', () => {
  let testJournalFile: string

  beforeEach(() => {
    ipcHandlers.clear()
    vi.clearAllMocks()

    if (!fs.existsSync(mockUserDataDir)) {
      fs.mkdirSync(mockUserDataDir, { recursive: true })
    }

    testJournalFile = path.join(
      mockUserDataDir,
      `journal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jsonl`
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
    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Channel Registration
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. IPC Channel Registration', () => {
    it('registers all 6 required journal:* IPC channels on ipcMain', () => {
      expect(ipcHandlers.has('journal:record')).toBe(true)
      expect(ipcHandlers.has('journal:query')).toBe(true)
      expect(ipcHandlers.has('journal:clear')).toBe(true)
      expect(ipcHandlers.has('journal:verifyChain')).toBe(true)
      expect(ipcHandlers.has('journal:export')).toBe(true)
      expect(ipcHandlers.has('journal:getStats')).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. journal:record Handler
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. journal:record Handler', () => {
    it('records genesis entry with sequence 1, 64-zero prevHash, and valid SHA-256 hash', async () => {
      const pubsubSpy = vi.spyOn(pubsubService, 'publish')

      const res = await invokeJournalIpc('journal:record', {
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'success',
        details: 'Dispatched GET /api/v1/health',
        metadata: { status: 200, latencyMs: 12 },
        durationMs: 12,
      })

      expect(res.success).toBe(true)
      expect(res.entry).toBeDefined()
      const entry: ActivityEntry = res.entry

      expect(entry.sequence).toBe(1)
      expect(entry.prevHash).toBe(GENESIS_PREV_HASH)
      expect(entry.hash).toBe(computeEntryHash(entry))
      expect(entry.toolId).toBe('api-studio')
      expect(entry.action).toBe('dispatch_request')
      expect(entry.status).toBe('success')

      // Broadcast checks
      expect(pubsubSpy).toHaveBeenCalledWith('journal:entry', entry)
      expect(mockWebContents.send).toHaveBeenCalledWith('journal:new-entry', entry)

      // Persistence check
      expect(fs.existsSync(testJournalFile)).toBe(true)
      const content = fs.readFileSync(testJournalFile, 'utf8')
      expect(content).toContain(entry.id)
    })

    it('redacts sensitive secrets in metadata and details before computing hash and persisting', async () => {
      const rawApiKey = 'sk-proj-012345678901234567890123456789'
      const rawBearer = 'myBearerSecretToken12345'
      const rawPassword = 'SuperSecretPassword!'

      const res = await invokeJournalIpc('journal:record', {
        toolId: 'cyber-fortress',
        action: 'vault_encrypt',
        category: 'security',
        status: 'success',
        details: `Encrypted vault with Bearer ${rawBearer} and key ${rawApiKey}`,
        metadata: {
          password: rawPassword,
          apiKey: 'AIzaSyA1234567890123456789012345678901',
          fileName: 'confidential.vault',
        },
      })

      expect(res.success).toBe(true)
      const entry: ActivityEntry = res.entry

      expect(entry.details).not.toContain(rawApiKey)
      expect(entry.details).not.toContain(rawBearer)
      expect(entry.details).toContain('[REDACTED_API_KEY]')
      expect(entry.details).toContain('Bearer [REDACTED_TOKEN]')
      expect(entry.metadata?.password).toBe('[REDACTED_SECRET]')
      expect(entry.metadata?.apiKey).toBe('[REDACTED_SECRET]')

      // Verify the persisted JSONL file also has redacted data
      const content = fs.readFileSync(testJournalFile, 'utf8')
      expect(content).not.toContain(rawApiKey)
      expect(content).not.toContain(rawPassword)
    })

    it('monotonically chains subsequent records with sequence increments', async () => {
      const res1 = await invokeJournalIpc('journal:record', {
        toolId: 'hash-studio',
        action: 'hash_file',
        category: 'crypto',
        details: 'Hashed file A',
      })

      const res2 = await invokeJournalIpc('journal:record', {
        toolId: 'hash-studio',
        action: 'hash_file',
        category: 'crypto',
        details: 'Hashed file B',
      })

      expect(res1.entry.sequence).toBe(1)
      expect(res2.entry.sequence).toBe(2)
      expect(res2.entry.prevHash).toBe(res1.entry.hash)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. journal:query Handler & Filter Mechanics
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. journal:query Handler with Filtering & Search', () => {
    beforeEach(async () => {
      // Seed 6 diverse entries
      await invokeJournalIpc('journal:record', {
        id: 'seed-1',
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'success',
        details: 'GET /api/v1/users returned 200 OK',
        metadata: { method: 'GET', endpoint: '/users' },
        timestamp: 1700000010000,
      })

      await invokeJournalIpc('journal:record', {
        id: 'seed-2',
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'failure',
        details: 'POST /api/v1/auth returned 401 Unauthorized',
        metadata: { method: 'POST', endpoint: '/auth' },
        timestamp: 1700000020000,
      })

      await invokeJournalIpc('journal:record', {
        id: 'seed-3',
        toolId: 'network-tools',
        action: 'port_scan',
        category: 'network',
        status: 'warning',
        details: 'Scanned 100 ports, 3 open',
        metadata: { host: '192.168.1.1', openPorts: [80, 443, 8080] },
        timestamp: 1700000030000,
      })

      await invokeJournalIpc('journal:record', {
        id: 'seed-4',
        toolId: 'cyber-fortress',
        action: 'shred_file',
        category: 'security',
        status: 'success',
        details: 'Shredded document with 7 passes',
        metadata: { passes: 7 },
        timestamp: 1700000040000,
      })

      await invokeJournalIpc('journal:record', {
        id: 'seed-5',
        toolId: 'system-optimizer',
        action: 'flush_dns',
        category: 'system',
        status: 'info',
        details: 'Flushed operating system DNS cache',
        metadata: { freedBytes: 1024 },
        timestamp: 1700000050000,
      })

      await invokeJournalIpc('journal:record', {
        id: 'seed-6',
        toolId: 'hash-studio',
        action: 'verify_checksum',
        category: 'crypto',
        status: 'success',
        details: 'Checksum matched for artifact.tar.gz',
        metadata: { algorithm: 'sha256' },
        timestamp: 1700000060000,
      })
    })

    it('queries all entries with default pagination (descending order)', async () => {
      const res = await invokeJournalIpc('journal:query')
      expect(res.total).toBe(6)
      expect(res.entries.length).toBe(6)
      expect(res.hasMore).toBe(false)
      // Descending sequence: newest first
      expect(res.entries[0].id).toBe('seed-6')
      expect(res.entries[5].id).toBe('seed-1')
    })

    it('filters entries by toolId', async () => {
      const res = await invokeJournalIpc('journal:query', { toolId: 'api-studio' })
      expect(res.total).toBe(2)
      expect(res.entries.every((e: ActivityEntry) => e.toolId === 'api-studio')).toBe(true)
    })

    it('filters entries by category', async () => {
      const res = await invokeJournalIpc('journal:query', { category: 'security' })
      expect(res.total).toBe(1)
      expect(res.entries[0].toolId).toBe('cyber-fortress')
    })

    it('filters entries by status', async () => {
      const res = await invokeJournalIpc('journal:query', { status: 'failure' })
      expect(res.total).toBe(1)
      expect(res.entries[0].id).toBe('seed-2')
    })

    it('filters entries by date range (startDate and endDate)', async () => {
      const res = await invokeJournalIpc('journal:query', {
        startDate: 1700000020000,
        endDate: 1700000040000,
      })
      expect(res.total).toBe(3)
      const ids = res.entries.map((e: ActivityEntry) => e.id)
      expect(ids).toContain('seed-2')
      expect(ids).toContain('seed-3')
      expect(ids).toContain('seed-4')
    })

    it('performs full-text search across action, details, toolId, and metadata', async () => {
      // Search in details
      const resDetails = await invokeJournalIpc('journal:query', { search: 'Unauthorized' })
      expect(resDetails.total).toBe(1)
      expect(resDetails.entries[0].id).toBe('seed-2')

      // Search in metadata
      const resMeta = await invokeJournalIpc('journal:query', { search: '192.168.1.1' })
      expect(resMeta.total).toBe(1)
      expect(resMeta.entries[0].id).toBe('seed-3')
    })

    it('handles pagination with limit and offset', async () => {
      const page1 = await invokeJournalIpc('journal:query', { limit: 2, offset: 0, order: 'asc' })
      expect(page1.entries.length).toBe(2)
      expect(page1.total).toBe(6)
      expect(page1.hasMore).toBe(true)
      expect(page1.entries[0].id).toBe('seed-1')
      expect(page1.entries[1].id).toBe('seed-2')

      const page2 = await invokeJournalIpc('journal:query', { limit: 2, offset: 2, order: 'asc' })
      expect(page2.entries.length).toBe(2)
      expect(page2.entries[0].id).toBe('seed-3')
      expect(page2.entries[1].id).toBe('seed-4')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. journal:verifyChain Handler
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. journal:verifyChain Handler', () => {
    it('verifies untampered journal as valid', async () => {
      for (let i = 0; i < 10; i++) {
        await invokeJournalIpc('journal:record', {
          toolId: `tool-${i}`,
          action: `action_${i}`,
          category: 'system',
          details: `Operation ${i}`,
        })
      }

      const res = await invokeJournalIpc('journal:verifyChain')
      expect(res.valid).toBe(true)
      expect(res.totalVerified).toBe(10)
      expect(res.brokenIndex).toBeUndefined()
    })

    it('detects tampering when an entry payload is altered', async () => {
      await invokeJournalIpc('journal:record', {
        toolId: 'system',
        action: 'flush_dns',
        category: 'system',
        status: 'success',
        details: 'Original details',
      })

      // Tamper with in-memory entry action directly
      const queryRes = await invokeJournalIpc('journal:query')
      queryRes.entries[0].action = 'malicious_injected_action'

      const verification = await invokeJournalIpc('journal:verifyChain')
      expect(verification.valid).toBe(false)
      expect(verification.brokenIndex).toBe(0)
      expect(verification.brokenReason).toMatch(/tampered content/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. journal:export Handler
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. journal:export Handler', () => {
    beforeEach(async () => {
      await invokeJournalIpc('journal:record', {
        toolId: 'fortress',
        action: 'encrypt_vault',
        category: 'security',
        status: 'success',
        details: 'Vault created',
        metadata: { format: 'aes256' },
        durationMs: 15,
      })
    })

    it('exports audit journal as formatted JSON', async () => {
      const res = await invokeJournalIpc('journal:export', 'json')
      expect(res.success).toBe(true)
      expect(res.mimeType).toBe('application/json')
      expect(res.filename).toMatch(/\.json$/)

      const parsed = JSON.parse(res.content)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
      expect(parsed[0].toolId).toBe('fortress')
    })

    it('exports audit journal as formatted CSV with header row', async () => {
      const res = await invokeJournalIpc('journal:export', 'csv')
      expect(res.success).toBe(true)
      expect(res.mimeType).toBe('text/csv')
      expect(res.filename).toMatch(/\.csv$/)

      const lines = res.content.trim().split('\n')
      expect(lines.length).toBe(2) // header + 1 row
      expect(lines[0]).toContain('"id","sequence","timestamp","isoDate","toolId","action"')
      expect(lines[1]).toContain('fortress')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6. journal:getStats Handler
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. journal:getStats Handler', () => {
    it('aggregates counts by status, category, timestamps, and chain integrity', async () => {
      await invokeJournalIpc('journal:record', {
        toolId: 'api-studio',
        action: 'req1',
        category: 'api',
        status: 'success',
        details: 'success 1',
        timestamp: 1000,
      })

      await invokeJournalIpc('journal:record', {
        toolId: 'api-studio',
        action: 'req2',
        category: 'api',
        status: 'failure',
        details: 'failure 1',
        timestamp: 2000,
      })

      await invokeJournalIpc('journal:record', {
        toolId: 'cyber-fortress',
        action: 'shred',
        category: 'security',
        status: 'success',
        details: 'shred 1',
        timestamp: 3000,
      })

      const stats = await invokeJournalIpc('journal:getStats')
      expect(stats.totalEntries).toBe(3)
      expect(stats.entriesByStatus.success).toBe(2)
      expect(stats.entriesByStatus.failure).toBe(1)
      expect(stats.entriesByCategory.api).toBe(2)
      expect(stats.entriesByCategory.security).toBe(1)
      expect(stats.oldestTimestamp).toBe(1000)
      expect(stats.newestTimestamp).toBe(3000)
      expect(stats.chainValid).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 7. journal:clear Handler
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. journal:clear Handler', () => {
    it('clears all entries, truncates file, and resets chain to genesis block', async () => {
      await invokeJournalIpc('journal:record', {
        toolId: 'api-studio',
        action: 'req',
        category: 'api',
        details: 'Before clear',
      })

      const clearRes = await invokeJournalIpc('journal:clear')
      expect(clearRes.success).toBe(true)
      expect(clearRes.clearedCount).toBe(1)

      const queryRes = await invokeJournalIpc('journal:query')
      expect(queryRes.total).toBe(0)
      expect(queryRes.entries).toEqual([])

      // Next record restarts sequence at 1 with genesis prevHash
      const nextRes = await invokeJournalIpc('journal:record', {
        toolId: 'hash-studio',
        action: 'new_entry',
        category: 'crypto',
        details: 'After clear',
      })

      expect(nextRes.entry.sequence).toBe(1)
      expect(nextRes.entry.prevHash).toBe(GENESIS_PREV_HASH)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Retention Pruning (> 5,000 entries)
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. Retention Pruning Mechanics', () => {
    it('retains strictly the latest 5,000 entries when entry count exceeds 5,000', async () => {
      // Pre-seed JSONL file with 5,010 entries to test retention compaction
      const seededEntries: ActivityEntry[] = []
      let lastHash = GENESIS_PREV_HASH

      for (let i = 1; i <= 5010; i++) {
        const rawEntry = {
          id: `entry-${i}`,
          sequence: i,
          timestamp: 1700000000000 + i,
          toolId: 'system',
          action: `op_${i}`,
          category: 'system' as const,
          status: 'info' as const,
          details: `Op ${i}`,
          metadata: {},
          durationMs: 0,
          prevHash: lastHash,
        }
        const hash = computeEntryHash(rawEntry)
        lastHash = hash
        seededEntries.push({ ...rawEntry, hash })
      }

      // Write all 5,010 entries directly to JSONL file
      fs.writeFileSync(
        testJournalFile,
        seededEntries.map((e) => JSON.stringify(e)).join('\n') + '\n',
        'utf8'
      )

      // Query through IPC - ensureInitialized will trigger pruning down to 5,000
      const queryRes = await invokeJournalIpc('journal:query', { limit: 100 })
      expect(queryRes.total).toBe(5000)

      // Verify the oldest 10 entries (1 to 10) were pruned, and entry 11 is now oldest
      const ascQuery = await invokeJournalIpc('journal:query', { limit: 5, order: 'asc' })
      expect(ascQuery.entries[0].sequence).toBe(11)

      // Add one more entry via IPC
      const addRes = await invokeJournalIpc('journal:record', {
        toolId: 'system',
        action: 'op_5011',
        category: 'system',
        details: 'Op 5011',
      })
      expect(addRes.entry.sequence).toBe(5011)

      // Total remains capped at 5,000
      const updatedQuery = await invokeJournalIpc('journal:query', { limit: 10 })
      expect(updatedQuery.total).toBe(5000)
      expect(updatedQuery.entries[0].sequence).toBe(5011)
    })
  })
})
