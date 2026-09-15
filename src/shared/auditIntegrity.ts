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

import { createHash } from 'crypto'

export type ActivityCategory =
  | 'security'
  | 'network'
  | 'system'
  | 'file'
  | 'crypto'
  | 'api'
  | 'general'

export type ActivityStatus = 'success' | 'failure' | 'warning' | 'info'

export interface ActivityEntry {
  id: string
  sequence: number
  timestamp: number
  toolId: string
  action: string
  category: ActivityCategory
  status: ActivityStatus
  details: string
  metadata?: Record<string, any>
  durationMs?: number
  prevHash: string
  hash: string
}

export type NewActivityEntry = Omit<ActivityEntry, 'id' | 'sequence' | 'timestamp' | 'hash' | 'prevHash'> & {
  id?: string
  sequence?: number
  timestamp?: number
  durationMs?: number
}

export interface JournalQueryParams {
  toolId?: string
  category?: ActivityCategory
  status?: ActivityStatus
  search?: string
  startDate?: number
  endDate?: number
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
}

export interface JournalQueryResponse {
  entries: ActivityEntry[]
  total: number
  hasMore: boolean
}

export interface AuditVerificationResult {
  valid: boolean
  totalVerified: number
  brokenIndex?: number
  brokenEntryId?: string
  brokenReason?: string
  error?: string
  expectedHash?: string
  actualHash?: string
  timestamp: number
}

export interface JournalStatsResult {
  totalEntries: number
  entriesByStatus: Record<ActivityStatus, number>
  entriesByCategory: Record<ActivityCategory, number>
  oldestTimestamp?: number
  newestTimestamp?: number
  chainValid: boolean
}

export interface JournalExportResult {
  success: boolean
  content: string
  filename: string
  mimeType: string
  error?: string
}

export interface JournalAPI {
  record: (entry: NewActivityEntry) => Promise<{ success: boolean; entry?: ActivityEntry; error?: string }>
  query: (params?: JournalQueryParams) => Promise<JournalQueryResponse>
  clear: () => Promise<{ success: boolean; clearedCount: number; error?: string }>
  verifyChain: () => Promise<AuditVerificationResult>
  export: (format: 'json' | 'csv', filter?: JournalQueryParams) => Promise<JournalExportResult>
  getStats: () => Promise<JournalStatsResult>
  onActivity: (cb: (entry: ActivityEntry) => void) => () => void
}

/**
 * 64-character zero hex string representing genesis previous hash block.
 */
export const GENESIS_PREV_HASH = '0'.repeat(64)

const HEX_64_REGEX = /^[a-f0-9]{64}$/i

/**
 * Canonical JSON serializer with recursive key sorting and circular reference safety.
 * Guarantees identical string outputs for structurally identical objects regardless of property insertion order.
 */
export function canonicalStringify(obj: any, visited = new WeakSet()): string {
  if (obj === undefined) {
    return 'null'
  }
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj) ?? 'null'
  }
  if (visited.has(obj)) {
    return '"[CIRCULAR]"'
  }
  visited.add(obj)

  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalStringify(item, visited))
    return '[' + items.join(',') + ']'
  }

  const sortedKeys = Object.keys(obj).sort()
  const entries: string[] = []
  for (const key of sortedKeys) {
    const val = obj[key]
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      entries.push(JSON.stringify(key) + ':' + canonicalStringify(val, visited))
    }
  }
  return '{' + entries.join(',') + '}'
}

/**
 * Computes SHA-256 hash of length-prefixed entry payload components:
 * id | sequence | timestamp | toolId | action | status | category | details | prevHash | canonicalMetadata | durationMs
 * Uses length-prefixed encoding (${field.length}:${field}) to prevent delimiter collision attacks.
 */
export function computeEntryHash(entry: Omit<ActivityEntry, 'hash'>): string {
  const canonicalMetadata = canonicalStringify(entry.metadata ?? {})
  const fields = [
    entry.id,
    entry.sequence.toString(),
    entry.timestamp.toString(),
    entry.toolId,
    entry.action,
    entry.status,
    entry.category,
    entry.details ?? '',
    entry.prevHash,
    canonicalMetadata,
    (entry.durationMs ?? 0).toString()
  ]
  const payload = fields.map((field) => `${field.length}:${field}`).join('|')

  return createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Linearly verifies cryptographic audit chain:
 * 1. If entries[0].sequence === 1 (genesis block): enforces prevHash === GENESIS_PREV_HASH.
 * 2. If entries[0].sequence > 1 (pruned / sliding-window log): verifies prevHash is a valid 64-character hex string.
 * 3. Every subsequent entry has prevHash === previous entry's hash and sequence === previous sequence + 1.
 * 4. Every entry's hash matches computeEntryHash(entry).
 */
export function verifyAuditChain(entries: ActivityEntry[]): AuditVerificationResult {
  const now = Date.now()
  if (!entries || entries.length === 0) {
    return {
      valid: true,
      totalVerified: 0,
      timestamp: now
    }
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    if (entry.sequence < 1) {
      return {
        valid: false,
        totalVerified: i,
        brokenIndex: i,
        brokenEntryId: entry.id,
        brokenReason: `Invalid sequence at index ${i}: sequence must be at least 1, got ${entry.sequence}`,
        error: `Invalid sequence at index ${i}: sequence must be at least 1, got ${entry.sequence}`,
        timestamp: now
      }
    }

    // 1. Genesis block vs Pruned log initial block checks
    if (i === 0) {
      if (entry.sequence === 1) {
        if (entry.prevHash !== GENESIS_PREV_HASH) {
          return {
            valid: false,
            totalVerified: 0,
            brokenIndex: 0,
            brokenEntryId: entry.id,
            brokenReason: `Genesis prevHash mismatch. Expected ${GENESIS_PREV_HASH}, got ${entry.prevHash}`,
            error: `Genesis prevHash mismatch. Expected ${GENESIS_PREV_HASH}, got ${entry.prevHash}`,
            expectedHash: GENESIS_PREV_HASH,
            actualHash: entry.prevHash,
            timestamp: now
          }
        }
      } else {
        // Pruned sliding-window log: sequence > 1, prevHash must be a valid 64-char hex string
        if (!HEX_64_REGEX.test(entry.prevHash)) {
          return {
            valid: false,
            totalVerified: 0,
            brokenIndex: 0,
            brokenEntryId: entry.id,
            brokenReason: `Pruned log initial prevHash must be a valid 64-character hex string. Got ${entry.prevHash}`,
            error: `Pruned log initial prevHash must be a valid 64-character hex string. Got ${entry.prevHash}`,
            timestamp: now
          }
        }
      }
    } else {
      // 2. Chain continuity checks
      const prevEntry = entries[i - 1]
      if (entry.prevHash !== prevEntry.hash) {
        return {
          valid: false,
          totalVerified: i,
          brokenIndex: i,
          brokenEntryId: entry.id,
          brokenReason: `Chain broken at index ${i}: prevHash does not match entry ${i - 1} hash`,
          error: `Chain broken at index ${i}: prevHash does not match entry ${i - 1} hash`,
          expectedHash: prevEntry.hash,
          actualHash: entry.prevHash,
          timestamp: now
        }
      }
      if (entry.sequence !== prevEntry.sequence + 1) {
        return {
          valid: false,
          totalVerified: i,
          brokenIndex: i,
          brokenEntryId: entry.id,
          brokenReason: `Sequence gap at index ${i}: expected ${prevEntry.sequence + 1}, got ${entry.sequence}`,
          error: `Sequence gap at index ${i}: expected ${prevEntry.sequence + 1}, got ${entry.sequence}`,
          timestamp: now
        }
      }
    }

    // 3. Recomputed hash match check
    const expectedHash = computeEntryHash(entry)
    if (expectedHash !== entry.hash) {
      return {
        valid: false,
        totalVerified: i,
        brokenIndex: i,
        brokenEntryId: entry.id,
        brokenReason: `Tampered content at index ${i}: recomputed hash does not match stored hash`,
        error: `Tampered content at index ${i}: recomputed hash does not match stored hash`,
        expectedHash,
        actualHash: entry.hash,
        timestamp: now
      }
    }
  }

  return {
    valid: true,
    totalVerified: entries.length,
    timestamp: now
  }
}
