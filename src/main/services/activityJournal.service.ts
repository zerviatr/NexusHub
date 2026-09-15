/*
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

import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import {
  ActivityCategory,
  ActivityEntry,
  ActivityStatus,
  AuditVerificationResult,
  GENESIS_PREV_HASH,
  JournalExportResult,
  JournalQueryParams,
  JournalQueryResponse,
  JournalStatsResult,
  NewActivityEntry,
  computeEntryHash,
  verifyAuditChain
} from '../../shared/auditIntegrity'
import { sanitizeMetadata, sanitizeString } from '../../shared/auditSanitization'
import { pubsubService } from './pubsub.service'

const MAX_JOURNAL_ENTRIES = 5000

export class ActivityJournalService {
  private entries: ActivityEntry[] = []
  private currentSequence = 0
  private lastHash = GENESIS_PREV_HASH
  private initialized = false
  private customFilePath: string | null = null
  private writeQueue: Promise<any> = Promise.resolve()

  constructor() {}

  /**
   * Overrides storage path (primarily used by test suites to ensure isolation).
   */
  public setStoragePath(customPath: string | null): void {
    this.customFilePath = customPath
    this.initialized = false
    this.entries = []
    this.currentSequence = 0
    this.lastHash = GENESIS_PREV_HASH
  }

  /**
   * Resolves target JSONL storage path in app userData directory, falling back to os.tmpdir().
   */
  public getJournalFilePath(): string {
    if (this.customFilePath) {
      const dir = path.dirname(this.customFilePath)
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true })
        } catch {}
      }
      return this.customFilePath
    }

    try {
      const userData = app.getPath('userData')
      if (!fs.existsSync(userData)) {
        fs.mkdirSync(userData, { recursive: true })
      }
      return path.join(userData, 'activity_journal.jsonl')
    } catch {
      return path.join(os.tmpdir(), 'activity_journal.jsonl')
    }
  }

  /**
   * Lazily loads and parses existing entries from JSONL storage upon first invocation.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const filePath = this.getJournalFilePath()
    this.entries = []
    this.currentSequence = 0
    this.lastHash = GENESIS_PREV_HASH

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const entry = JSON.parse(trimmed) as ActivityEntry
            if (entry && entry.id && entry.sequence && entry.hash) {
              this.entries.push(entry)
            }
          } catch (err) {
            console.warn('[activityJournal] Skipping corrupted line:', err)
          }
        }

        if (this.entries.length > 0) {
          // Sort by sequence to maintain valid ring ordering
          this.entries.sort((a, b) => a.sequence - b.sequence)
          const lastEntry = this.entries[this.entries.length - 1]
          this.currentSequence = lastEntry.sequence
          this.lastHash = lastEntry.hash

          // Enforce 5,000 max entry ring buffer
          if (this.entries.length > MAX_JOURNAL_ENTRIES) {
            this.entries = this.entries.slice(-MAX_JOURNAL_ENTRIES)
            this.persistAllEntriesAtomic(filePath)
          }
        }
      } catch (err) {
        console.error('[activityJournal] Error reading existing journal file:', err)
      }
    }

    this.initialized = true
  }

  /**
   * Records a new activity entry with privacy sanitization, monotonic sequence,
   * hash chaining, JSONL file append, ring cache update, and pubsub/IPC broadcasts.
   */
  public async recordEntry(
    data: NewActivityEntry
  ): Promise<{ success: boolean; entry?: ActivityEntry; error?: string }> {
    const task = async (): Promise<{ success: boolean; entry?: ActivityEntry; error?: string }> => {
      try {
        await this.ensureInitialized()

        const sequence = this.currentSequence + 1
        const id = data.id || randomUUID()
        const timestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.now()
        const prevHash = this.lastHash || GENESIS_PREV_HASH

        const sanitizedDetails = sanitizeString(data.details || '')
        const sanitizedMetadata = sanitizeMetadata(data.metadata || {})
        const durationMs =
          typeof data.durationMs === 'number' && !isNaN(data.durationMs)
            ? Math.max(0, data.durationMs)
            : 0

        const entry: ActivityEntry = {
          id,
          sequence,
          timestamp,
          toolId: data.toolId || 'general',
          action: data.action || 'unknown',
          category: data.category || 'general',
          status: data.status || 'info',
          details: sanitizedDetails,
          metadata: sanitizedMetadata,
          durationMs,
          prevHash,
          hash: ''
        }

        entry.hash = computeEntryHash(entry)

        // 1. Append line to JSONL file
        const filePath = this.getJournalFilePath()
        const line = JSON.stringify(entry) + '\n'
        fs.appendFileSync(filePath, line, 'utf8')

        // 2. Update in-memory state and ring buffer
        this.currentSequence = sequence
        this.lastHash = entry.hash
        this.entries.push(entry)

        // 3. Auto-prune if cache exceeds max threshold
        if (this.entries.length > MAX_JOURNAL_ENTRIES) {
          this.entries = this.entries.slice(-MAX_JOURNAL_ENTRIES)
          this.persistAllEntriesAtomic(filePath)
        }

        // 4. Broadcast via PubSub
        try {
          pubsubService.publish('journal:entry', entry)
        } catch (pubErr) {
          console.warn('[activityJournal] PubSub notification error:', pubErr)
        }

        // 5. Broadcast directly to open Electron BrowserWindow instances
        try {
          const windows = BrowserWindow.getAllWindows()
          for (const win of windows) {
            if (!win.isDestroyed()) {
              win.webContents.send('journal:new-entry', entry)
            }
          }
        } catch {
          // Ignore when Electron BrowserWindow is unavailable
        }

        return { success: true, entry }
      } catch (err: any) {
        console.error('[activityJournal] Failed to record journal entry:', err)
        return { success: false, error: err?.message || String(err) }
      }
    }

    // Atomic execution queue to prevent race conditions during rapid concurrent calls
    const result = this.writeQueue.then(task, task)
    this.writeQueue = result.then(
      () => {},
      () => {}
    )
    return result
  }

  /**
   * Queries activity entries with multi-parameter filtering, text search, and pagination.
   */
  public async queryEntries(params?: JournalQueryParams): Promise<JournalQueryResponse> {
    await this.ensureInitialized()

    let filtered = this.entries

    if (params) {
      if (params.toolId) {
        filtered = filtered.filter((e) => e.toolId === params.toolId)
      }
      if (params.category) {
        filtered = filtered.filter((e) => e.category === params.category)
      }
      if (params.status) {
        filtered = filtered.filter((e) => e.status === params.status)
      }
      if (typeof params.startDate === 'number') {
        filtered = filtered.filter((e) => e.timestamp >= params.startDate!)
      }
      if (typeof params.endDate === 'number') {
        filtered = filtered.filter((e) => e.timestamp <= params.endDate!)
      }
      if (params.search && params.search.trim()) {
        const query = params.search.trim().toLowerCase()
        filtered = filtered.filter((e) => {
          if (e.action.toLowerCase().includes(query)) return true
          if (e.details.toLowerCase().includes(query)) return true
          if (e.toolId.toLowerCase().includes(query)) return true
          if (e.category.toLowerCase().includes(query)) return true
          if (e.metadata && JSON.stringify(e.metadata).toLowerCase().includes(query)) return true
          return false
        })
      }
    }

    const order = params?.order || 'desc'
    const sorted = [...filtered].sort((a, b) =>
      order === 'asc' ? a.sequence - b.sequence : b.sequence - a.sequence
    )

    const total = sorted.length
    const offset = Math.max(0, params?.offset ?? 0)
    const limit = Math.max(1, params?.limit ?? 50)
    const paginated = sorted.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return {
      entries: paginated,
      total,
      hasMore
    }
  }

  /**
   * Clears all journal entries, resetting file to empty and chain to genesis block.
   */
  public async clearJournal(): Promise<{ success: boolean; clearedCount: number; error?: string }> {
    const task = async (): Promise<{ success: boolean; clearedCount: number; error?: string }> => {
      try {
        await this.ensureInitialized()
        const count = this.entries.length
        this.entries = []
        this.currentSequence = 0
        this.lastHash = GENESIS_PREV_HASH

        const filePath = this.getJournalFilePath()
        fs.writeFileSync(filePath, '', 'utf8')

        return { success: true, clearedCount: count }
      } catch (err: any) {
        return { success: false, clearedCount: 0, error: err?.message || String(err) }
      }
    }

    const result = this.writeQueue.then(task, task)
    this.writeQueue = result.then(
      () => {},
      () => {}
    )
    return result
  }

  /**
   * Verifies the cryptographic integrity of the in-memory audit chain.
   */
  public async verifyIntegrity(): Promise<AuditVerificationResult> {
    await this.ensureInitialized()
    const sorted = [...this.entries].sort((a, b) => a.sequence - b.sequence)
    return verifyAuditChain(sorted)
  }

  /**
   * Exports filtered journal entries as formatted JSON or CSV.
   */
  public async exportJournal(
    format: 'json' | 'csv',
    filter?: JournalQueryParams
  ): Promise<JournalExportResult> {
    await this.ensureInitialized()

    const queryRes = await this.queryEntries({
      ...filter,
      limit: MAX_JOURNAL_ENTRIES * 2,
      offset: 0,
      order: 'asc'
    })
    const entries = queryRes.entries

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-')

    if (format === 'json') {
      const content = JSON.stringify(entries, null, 2)
      return {
        success: true,
        content,
        filename: `activity_audit_journal_${timestampStr}.json`,
        mimeType: 'application/json'
      }
    }

    // CSV formatting
    const headers = [
      '"id"',
      '"sequence"',
      '"timestamp"',
      '"isoDate"',
      '"toolId"',
      '"action"',
      '"category"',
      '"status"',
      '"details"',
      '"durationMs"',
      '"prevHash"',
      '"hash"'
    ]

    const escapeCsv = (val: any): string => `"${String(val ?? '').replace(/"/g, '""')}"`

    const rows = entries.map((e) =>
      [
        escapeCsv(e.id),
        e.sequence,
        e.timestamp,
        escapeCsv(new Date(e.timestamp).toISOString()),
        escapeCsv(e.toolId),
        escapeCsv(e.action),
        escapeCsv(e.category),
        escapeCsv(e.status),
        escapeCsv(e.details),
        e.durationMs ?? 0,
        escapeCsv(e.prevHash),
        escapeCsv(e.hash)
      ].join(',')
    )

    const content = [headers.join(','), ...rows].join('\n')

    return {
      success: true,
      content,
      filename: `activity_audit_journal_${timestampStr}.csv`,
      mimeType: 'text/csv'
    }
  }

  /**
   * Aggregates journal statistics, counts by status and category, and checks chain health.
   */
  public async getStats(): Promise<JournalStatsResult> {
    await this.ensureInitialized()

    const entriesByStatus: Record<ActivityStatus, number> = {
      success: 0,
      failure: 0,
      warning: 0,
      info: 0
    }

    const entriesByCategory: Record<ActivityCategory, number> = {
      security: 0,
      network: 0,
      system: 0,
      file: 0,
      crypto: 0,
      api: 0,
      general: 0
    }

    let oldestTimestamp: number | undefined
    let newestTimestamp: number | undefined

    for (const e of this.entries) {
      if (entriesByStatus[e.status] !== undefined) {
        entriesByStatus[e.status]++
      }
      if (entriesByCategory[e.category] !== undefined) {
        entriesByCategory[e.category]++
      }
      if (oldestTimestamp === undefined || e.timestamp < oldestTimestamp) {
        oldestTimestamp = e.timestamp
      }
      if (newestTimestamp === undefined || e.timestamp > newestTimestamp) {
        newestTimestamp = e.timestamp
      }
    }

    const verification = await this.verifyIntegrity()

    return {
      totalEntries: this.entries.length,
      entriesByStatus,
      entriesByCategory,
      oldestTimestamp,
      newestTimestamp,
      chainValid: verification.valid
    }
  }

  /**
   * Performs an atomic rewrite of the JSONL file to prevent partial write corruption.
   */
  private persistAllEntriesAtomic(filePath: string): void {
    try {
      const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
      const content = this.entries.map((e) => JSON.stringify(e)).join('\n') + '\n'
      fs.writeFileSync(tmpPath, content, 'utf8')
      fs.renameSync(tmpPath, filePath)
    } catch (err) {
      console.error('[activityJournal] Failed atomic file persistence:', err)
    }
  }

  /**
   * Resets service state for tests.
   */
  public resetForTesting(): void {
    this.entries = []
    this.currentSequence = 0
    this.lastHash = GENESIS_PREV_HASH
    this.initialized = false
    this.customFilePath = null
    this.writeQueue = Promise.resolve()
  }
}

export const activityJournalService = new ActivityJournalService()
