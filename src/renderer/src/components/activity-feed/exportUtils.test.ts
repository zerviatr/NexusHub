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
import { generateCsv, generateReport } from './exportUtils'
import { FILTER_PRESETS } from './ActivityFilterToolbar'
import { ActivityEntry, ActivityFilter } from './types'

describe('Worker M2 Desktop UX & Hardening Unit Tests', () => {
  const sampleEntries: ActivityEntry[] = [
    {
      id: 'act-001',
      sequence: 1,
      timestamp: 1700000000000,
      toolId: 'cyber-fortress',
      toolName: 'Cyber Fortress',
      action: 'Vault Encrypted',
      category: 'security',
      status: 'success',
      details: 'AES-GCM encryption with 256-bit key',
      hash: 'hash-001',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    {
      id: 'act-002',
      sequence: 2,
      timestamp: 1700001000000,
      toolId: 'network-tools',
      toolName: 'Network Tools',
      action: 'TCP Ping',
      category: 'network',
      status: 'failure',
      details: 'Connection refused',
      hash: 'hash-002',
      prevHash: 'hash-001',
    },
  ]

  describe('Activity Feed Filter Presets', () => {
    it('contains all 7 required presets', () => {
      const ids = FILTER_PRESETS.map((p) => p.id)
      expect(ids).toEqual(['all', 'security', 'crypto', 'network', 'system', 'failures', 'today'])
    })

    it('correctly applies and detects the "all" preset', () => {
      const allPreset = FILTER_PRESETS.find((p) => p.id === 'all')!
      const initial: ActivityFilter = {
        search: 'test',
        toolId: 'tool-x',
        category: 'security',
        status: 'failure',
        timeRange: 'today',
      }
      const applied = allPreset.apply(initial)
      expect(applied.search).toBe('')
      expect(applied.toolId).toBe('')
      expect(applied.category).toBe('')
      expect(applied.status).toBe('')
      expect(applied.timeRange).toBe('all')
      expect(allPreset.isActive(applied)).toBe(true)
    })

    it('correctly applies and detects category presets', () => {
      const securityPreset = FILTER_PRESETS.find((p) => p.id === 'security')!
      const applied = securityPreset.apply({ search: '', toolId: '', category: '', status: '', timeRange: 'all' })
      expect(applied.category).toBe('security')
      expect(securityPreset.isActive(applied)).toBe(true)

      const cryptoPreset = FILTER_PRESETS.find((p) => p.id === 'crypto')!
      const appliedCrypto = cryptoPreset.apply(applied)
      expect(appliedCrypto.category).toBe('crypto')
      expect(cryptoPreset.isActive(appliedCrypto)).toBe(true)
    })

    it('correctly applies and detects the "failures" preset', () => {
      const failuresPreset = FILTER_PRESETS.find((p) => p.id === 'failures')!
      const applied = failuresPreset.apply({ search: '', toolId: '', category: '', status: '', timeRange: 'all' })
      expect(applied.status).toBe('failure')
      expect(failuresPreset.isActive(applied)).toBe(true)
    })

    it('correctly applies and detects the "today" preset', () => {
      const todayPreset = FILTER_PRESETS.find((p) => p.id === 'today')!
      const applied = todayPreset.apply({ search: '', toolId: '', category: '', status: '', timeRange: 'all' })
      expect(applied.timeRange).toBe('today')
      expect(todayPreset.isActive(applied)).toBe(true)
    })
  })

  describe('Export Utilities', () => {
    it('generates compliant CSV with escaped headers and rows', () => {
      const csv = generateCsv(sampleEntries)
      expect(csv).toContain('ID,Timestamp,ISO Date,Tool,Action,Category,Status,DurationMs,SHA256,PrevHash,Details')
      expect(csv).toContain('"act-001"')
      expect(csv).toContain('"Cyber Fortress"')
      expect(csv).toContain('"Vault Encrypted"')
      expect(csv).toContain('"security"')
      expect(csv).toContain('"hash-001"')
    })

    it('generates cryptographic audit report', () => {
      const report = generateReport(sampleEntries, { valid: true, totalVerified: 2, timestamp: Date.now() })
      expect(report).toContain('# NexusHub Workstation — Tamper-Evident Audit Report')
      expect(report).toContain('VALID & UNBROKEN')
      expect(report).toContain('Total Audited Events: 2')
      expect(report).toContain('Verified Blocks: 2')
    })
  })
})
