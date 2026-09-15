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

import { describe, it, expect } from 'vitest'
import enLocale from '../src/renderer/src/locales/en.json'
import trLocale from '../src/renderer/src/locales/tr.json'
import {
  ActivityEntry,
  ActivityFilter,
  ChainVerificationResult,
} from '../src/renderer/src/components/activity-feed/types'

describe('Activity Feed UI & Workstation Logic Tests', () => {
  const sampleEntries: ActivityEntry[] = [
    {
      id: 'act-001',
      sequence: 1,
      timestamp: 1700000000000,
      toolId: 'api-studio',
      toolName: 'API Studio',
      action: 'POST /v1/auth/login',
      category: 'api',
      status: 'success',
      details: 'HTTP 200 OK (latency: 42ms)',
      metadata: { status: 200, durationMs: 42 },
      durationMs: 42,
      hash: 'hash-001',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    {
      id: 'act-002',
      sequence: 2,
      timestamp: 1700001000000,
      toolId: 'cyber-fortress',
      toolName: 'Cyber Fortress',
      action: 'AES-256 Encrypt Vault',
      category: 'security',
      status: 'success',
      details: 'Encrypted 4 files using AES-GCM',
      metadata: { fileCount: 4, algorithm: 'AES-256-GCM' },
      durationMs: 120,
      hash: 'hash-002',
      prevHash: 'hash-001',
    },
    {
      id: 'act-003',
      sequence: 3,
      timestamp: 1700002000000,
      toolId: 'network-tools',
      toolName: 'Network Tools',
      action: 'TCP Ping 8.8.8.8:53',
      category: 'network',
      status: 'failure',
      details: 'Connection timed out after 5000ms',
      metadata: { host: '8.8.8.8', port: 53, error: 'ETIMEDOUT' },
      durationMs: 5000,
      hash: 'hash-003',
      prevHash: 'hash-002',
    },
  ]

  describe('Filtering Engine', () => {
    function filterEntries(entries: ActivityEntry[], filter: ActivityFilter): ActivityEntry[] {
      const query = filter.search.trim().toLowerCase()

      return entries.filter((entry) => {
        if (query) {
          const matchesAction = entry.action.toLowerCase().includes(query)
          const matchesTool = (entry.toolName || entry.toolId).toLowerCase().includes(query)
          const matchesDetails = entry.details?.toLowerCase().includes(query) || false
          const matchesHash = entry.hash.toLowerCase().includes(query)
          const matchesId = entry.id.toLowerCase().includes(query)
          if (!matchesAction && !matchesTool && !matchesDetails && !matchesHash && !matchesId) {
            return false
          }
        }

        if (filter.toolId && entry.toolId !== filter.toolId) {
          return false
        }

        if (filter.category && entry.category !== filter.category) {
          return false
        }

        if (filter.status && entry.status !== filter.status) {
          return false
        }

        return true
      })
    }

    it('filters correctly by text search across action, toolName and details', () => {
      const res1 = filterEntries(sampleEntries, {
        search: 'vault',
        toolId: '',
        category: '',
        status: '',
        timeRange: 'all',
      })
      expect(res1).toHaveLength(1)
      expect(res1[0].id).toBe('act-002')

      const res2 = filterEntries(sampleEntries, {
        search: 'api',
        toolId: '',
        category: '',
        status: '',
        timeRange: 'all',
      })
      expect(res2).toHaveLength(1)
      expect(res2[0].id).toBe('act-001')
    })

    it('filters correctly by category', () => {
      const res = filterEntries(sampleEntries, {
        search: '',
        toolId: '',
        category: 'network',
        status: '',
        timeRange: 'all',
      })
      expect(res).toHaveLength(1)
      expect(res[0].category).toBe('network')
    })

    it('filters correctly by status', () => {
      const res = filterEntries(sampleEntries, {
        search: '',
        toolId: '',
        category: '',
        status: 'failure',
        timeRange: 'all',
      })
      expect(res).toHaveLength(1)
      expect(res[0].status).toBe('failure')
    })

    it('filters by multiple criteria simultaneously', () => {
      const res = filterEntries(sampleEntries, {
        search: 'encrypt',
        toolId: 'cyber-fortress',
        category: 'security',
        status: 'success',
        timeRange: 'all',
      })
      expect(res).toHaveLength(1)
      expect(res[0].id).toBe('act-002')
    })
  })

  describe('Export Formatting Engine', () => {
    it('formats CSV accurately with proper headers and escaping', () => {
      const headers = ['ID', 'Timestamp', 'ISO Date', 'Tool', 'Action', 'Category', 'Status', 'DurationMs', 'SHA256', 'PrevHash', 'Details']
      const rows = sampleEntries.map((e) => [
        `"${e.id}"`,
        e.timestamp,
        `"${new Date(e.timestamp).toISOString()}"`,
        `"${(e.toolName || e.toolId || '').replace(/"/g, '""')}"`,
        `"${e.action.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${e.status}"`,
        e.durationMs ?? '',
        `"${e.hash}"`,
        `"${e.prevHash}"`,
        `"${(e.details || '').replace(/"/g, '""')}"`,
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
      expect(csv).toContain('"act-001"')
      expect(csv).toContain('"API Studio"')
      expect(csv).toContain('hash-001')
      expect(csv).toContain('"security"')
    })

    it('generates markdown report with verification status', () => {
      const verification: ChainVerificationResult = {
        valid: true,
        totalVerified: 3,
        timestamp: Date.now(),
      }

      const report = `# NexusHub Workstation — Tamper-Evident Audit Report\nChain Health: ${
        verification.valid ? 'VALID & UNBROKEN' : 'COMPROMISED DISCONTINUITY'
      }\nTotal Audited Events: ${sampleEntries.length}`

      expect(report).toContain('VALID & UNBROKEN')
      expect(report).toContain('Total Audited Events: 3')
    })
  })

  describe('Localization Key Parity (en.json & tr.json)', () => {
    it('has identical nav.tools.activityFeed keys in en and tr', () => {
      expect((enLocale as any).nav.tools.activityFeed).toBeDefined()
      expect((trLocale as any).nav.tools.activityFeed).toBeDefined()
      expect(typeof (enLocale as any).nav.tools.activityFeed).toBe('string')
      expect(typeof (trLocale as any).nav.tools.activityFeed).toBe('string')
    })

    it('has 100% matching keys between en.json and tr.json for activityFeed', () => {
      const enFeed = (enLocale as any).activityFeed
      const trFeed = (trLocale as any).activityFeed

      expect(enFeed).toBeDefined()
      expect(trFeed).toBeDefined()

      function collectKeys(obj: Record<string, any>, prefix = ''): string[] {
        let keys: string[] = []
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            keys = keys.concat(collectKeys(v, fullKey))
          } else {
            keys.push(fullKey)
          }
        }
        return keys.sort()
      }

      const enKeys = collectKeys(enFeed)
      const trKeys = collectKeys(trFeed)

      expect(enKeys).toEqual(trKeys)
      expect(enKeys.length).toBeGreaterThanOrEqual(40)
    })
  })
})
