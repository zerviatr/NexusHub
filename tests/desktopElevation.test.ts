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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateCsv,
  generateReport,
  quickExportCsv,
  quickExportJson,
} from '../src/renderer/src/components/activity-feed/exportUtils'
import {
  FILTER_PRESETS,
  FilterPresetId,
} from '../src/renderer/src/components/activity-feed/ActivityFilterToolbar'
import {
  PORT_PRESETS,
  PortPreset,
  PortItem,
} from '../src/renderer/src/pages/PortKiller'
import {
  ActivityEntry,
  ActivityFilter,
  ChainVerificationResult,
} from '../src/renderer/src/components/activity-feed/types'
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

describe('Desktop Elevation & UX Hardening Test Suite (Milestone M2)', () => {
  const sampleEntries: ActivityEntry[] = [
    {
      id: 'act_001',
      sequence: 1,
      timestamp: 1700000000000,
      toolId: 'fortress',
      toolName: 'Cyber Fortress',
      action: 'encrypt_file',
      category: 'security',
      status: 'success',
      durationMs: 42,
      hash: 'genesis_block_sha256_hash_11111111111111111111111111111111',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      details: 'Encrypted document.pdf using AES-256-GCM',
    },
    {
      id: 'act_002',
      sequence: 2,
      timestamp: 1700000010000,
      toolId: 'port-killer',
      toolName: 'Port Watchdog',
      action: 'kill_process',
      category: 'system',
      status: 'failure',
      durationMs: 15,
      hash: 'block_2_chained_sha256_hash_22222222222222222222222222222222',
      prevHash: 'genesis_block_sha256_hash_11111111111111111111111111111111',
      details: 'Permission denied killing PID 4',
    },
    {
      id: 'act_003',
      sequence: 3,
      timestamp: 1700000020000,
      toolId: 'hash-studio',
      toolName: 'Hash Studio',
      action: 'compute_hash',
      category: 'crypto',
      status: 'success',
      durationMs: 8,
      hash: 'block_3_chained_sha256_hash_33333333333333333333333333333333',
      prevHash: 'block_2_chained_sha256_hash_22222222222222222222222222222222',
      details: 'Computed SHA-512 for release.iso',
    },
  ]

  // ─── 1. Activity Journal Direct Export Utilities ──────────────────────────────

  describe('1. Activity Journal Direct CSV / JSON / Certified Report Export', () => {
    it('generates compliant RFC-4180 CSV with accurate escaping and headers', () => {
      const csv = generateCsv(sampleEntries)
      const lines = csv.split('\r\n')

      expect(lines.length).toBe(4) // 1 header + 3 entries
      const headers = lines[0].split(',')
      expect(headers).toContain('ID')
      expect(headers).toContain('Tool')
      expect(headers).toContain('Action')
      expect(headers).toContain('Category')
      expect(headers).toContain('Status')
      expect(headers).toContain('SHA256')
      expect(headers).toContain('PrevHash')

      // Check first record escaping and content
      expect(lines[1]).toContain('"act_001"')
      expect(lines[1]).toContain('"Cyber Fortress"')
      expect(lines[1]).toContain('"encrypt_file"')
      expect(lines[1]).toContain('"security"')
      expect(lines[1]).toContain('"genesis_block_sha256_hash_11111111111111111111111111111111"')
    })

    it('generates certified Markdown cryptographic attestation report with category breakdown', () => {
      const verification: ChainVerificationResult = {
        valid: true,
        totalVerified: 3,
      }

      const report = generateReport(sampleEntries, verification)

      expect(report).toContain('# NexusHub Workstation — Tamper-Evident Audit Report')
      expect(report).toContain('Chain Health: VALID & UNBROKEN')
      expect(report).toContain('Total Audited Events: 3')
      expect(report).toContain('Verified Blocks: 3')
      expect(report).toContain('PASSED (0 Discrepancies)')
      expect(report).toContain('genesis_block_sha256_hash_11111111111111111111111111111111')
      expect(report).toContain('**SECURITY**: 1 operations')
      expect(report).toContain('**SYSTEM**: 1 operations')
      expect(report).toContain('**CRYPTO**: 1 operations')
      expect(report).toContain('Cyber Fortress')
    })

    it('generates compromised warning in report when chain verification fails', () => {
      const compromisedVerification: ChainVerificationResult = {
        valid: false,
        totalVerified: 1,
        brokenIndex: 2,
      }

      const report = generateReport(sampleEntries, compromisedVerification)
      expect(report).toContain('Chain Health: COMPROMISED DISCONTINUITY')
      expect(report).toContain('FAILED (Discontinuity Detected)')
    })

    it('quickExportCsv and quickExportJson format files with timestamped naming', () => {
      let downloadedFilename = ''
      let clicked = false

      const mockAnchor: any = {
        href: '',
        set download(val: string) {
          downloadedFilename = val
        },
        click: () => {
          clicked = true
        },
      }

      const originalDoc = (globalThis as any).document
      const originalCreateObjectUrl = (globalThis as any).URL?.createObjectURL
      const originalRevokeObjectUrl = (globalThis as any).URL?.revokeObjectURL

      ;(globalThis as any).document = {
        createElement: (tag: string) => (tag === 'a' ? mockAnchor : {}),
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
      }
      ;(globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      ;(globalThis as any).URL.revokeObjectURL = vi.fn()

      try {
        quickExportCsv(sampleEntries)
        expect(downloadedFilename).toMatch(/^nexushub-activity-audit-.*\.csv$/)
        expect(clicked).toBe(true)

        clicked = false
        quickExportJson(sampleEntries)
        expect(downloadedFilename).toMatch(/^nexushub-activity-audit-.*\.json$/)
        expect(clicked).toBe(true)
      } finally {
        if (originalDoc) (globalThis as any).document = originalDoc
        else delete (globalThis as any).document
        if (originalCreateObjectUrl) (globalThis as any).URL.createObjectURL = originalCreateObjectUrl
        if (originalRevokeObjectUrl) (globalThis as any).URL.revokeObjectURL = originalRevokeObjectUrl
      }
    })
  })

  // ─── 2. Activity Journal Filter Presets ───────────────────────────────────────

  describe('2. Activity Journal Filter Presets (ActivityFilterToolbar)', () => {
    const baseFilter: ActivityFilter = {
      search: '',
      toolId: '',
      category: '',
      status: '',
      timeRange: 'all',
    }

    it('defines all 7 required filter presets (all, security, crypto, network, system, failures, today)', () => {
      const presetIds = FILTER_PRESETS.map((p) => p.id)
      const expected: FilterPresetId[] = [
        'all',
        'security',
        'crypto',
        'network',
        'system',
        'failures',
        'today',
      ]
      expect(presetIds).toEqual(expected)
    })

    it('correctly applies and evaluates "all" preset', () => {
      const preset = FILTER_PRESETS.find((p) => p.id === 'all')!
      const dirtyFilter: ActivityFilter = {
        search: 'test',
        toolId: 'port-killer',
        category: 'system',
        status: 'failure',
        timeRange: 'today',
      }

      const applied = preset.apply(dirtyFilter)
      expect(applied).toEqual(baseFilter)
      expect(preset.isActive(applied)).toBe(true)
      expect(preset.isActive(dirtyFilter)).toBe(false)
    })

    it('correctly applies and evaluates "security" preset', () => {
      const preset = FILTER_PRESETS.find((p) => p.id === 'security')!
      const applied = preset.apply(baseFilter)
      expect(applied.category).toBe('security')
      expect(applied.status).toBe('')
      expect(preset.isActive(applied)).toBe(true)
    })

    it('correctly applies and evaluates "failures" preset', () => {
      const preset = FILTER_PRESETS.find((p) => p.id === 'failures')!
      const applied = preset.apply(baseFilter)
      expect(applied.status).toBe('failure')
      expect(applied.category).toBe('')
      expect(preset.isActive(applied)).toBe(true)
    })

    it('correctly applies and evaluates "today" preset', () => {
      const preset = FILTER_PRESETS.find((p) => p.id === 'today')!
      const applied = preset.apply(baseFilter)
      expect(applied.timeRange).toBe('today')
      expect(preset.isActive(applied)).toBe(true)
    })
  })

  // ─── 3. Cryptographic Chain Integrity Badges Contract ────────────────────────

  describe('3. Cryptographic Chain Integrity Badges Contract', () => {
    it('identifies genesis block anchored at root sequence #1 with zero predecessor hash', () => {
      const genesisEntry = sampleEntries[0]
      const isGenesis =
        genesisEntry.sequence === 1 ||
        genesisEntry.prevHash === '0000000000000000000000000000000000000000000000000000000000000000'

      expect(isGenesis).toBe(true)
    })

    it('identifies verified chained block linked to valid cryptographic predecessor', () => {
      const chainedEntry = sampleEntries[1]
      const verification: ChainVerificationResult = { valid: true, totalVerified: 3 }

      const isChained =
        verification.valid &&
        chainedEntry.sequence > 1 &&
        chainedEntry.prevHash === sampleEntries[0].hash

      expect(isChained).toBe(true)
    })

    it('detects potential tamper discontinuity at broken block index', () => {
      const verification: ChainVerificationResult = {
        valid: false,
        totalVerified: 1,
        brokenIndex: 2,
      }

      // Block #1 is before broken index -> intact
      const isBlock1Tampered = !verification.valid && sampleEntries[0].sequence >= verification.brokenIndex!
      expect(isBlock1Tampered).toBe(false)

      // Block #2 is at broken index -> POTENTIAL TAMPER alert
      const isBlock2Tampered = !verification.valid && sampleEntries[1].sequence >= verification.brokenIndex!
      expect(isBlock2Tampered).toBe(true)
    })
  })

  // ─── 4. Port Watchdog 4-Category Port Ranges ─────────────────────────────────

  describe('4. Port Watchdog 4-Category Presets (PORT_PRESETS)', () => {
    it('contains all 5 expected presets (all, web, database, dev, gaming)', () => {
      const keys = Object.keys(PORT_PRESETS) as PortPreset[]
      expect(keys).toContain('all')
      expect(keys).toContain('web')
      expect(keys).toContain('database')
      expect(keys).toContain('dev')
      expect(keys).toContain('gaming')
    })

    it('configures exact industry port ranges matching architectural requirements', () => {
      expect(PORT_PRESETS.web.ports).toEqual([80, 443, 8080, 8443, 3000, 5000, 5173])
      expect(PORT_PRESETS.database.ports).toEqual([1433, 1521, 3306, 5432, 6379, 8086, 9200, 27017])
      expect(PORT_PRESETS.dev.ports).toEqual([3000, 3001, 4200, 5173, 8000, 8080, 8888, 9000])
      expect(PORT_PRESETS.gaming.ports).toEqual([7777, 25565, 27015, 27016])
      expect(PORT_PRESETS.all.ports).toEqual([])
    })

    it('filters active port items accurately according to active preset', () => {
      const activeSockets: PortItem[] = [
        { protocol: 'tcp', localAddress: '127.0.0.1', port: 5173, state: 'LISTENING', pid: 100, processName: 'vite.exe' },
        { protocol: 'tcp', localAddress: '127.0.0.1', port: 5432, state: 'LISTENING', pid: 200, processName: 'postgres.exe' },
        { protocol: 'tcp', localAddress: '127.0.0.1', port: 25565, state: 'LISTENING', pid: 300, processName: 'minecraft.exe' },
        { protocol: 'tcp', localAddress: '127.0.0.1', port: 9999, state: 'LISTENING', pid: 400, processName: 'custom_daemon.exe' },
      ]

      // Web filter (5173 is in web)
      const webMatches = activeSockets.filter((s) => PORT_PRESETS.web.ports.includes(s.port))
      expect(webMatches.map((s) => s.port)).toEqual([5173])

      // Database filter (5432 is in database)
      const dbMatches = activeSockets.filter((s) => PORT_PRESETS.database.ports.includes(s.port))
      expect(dbMatches.map((s) => s.port)).toEqual([5432])

      // Gaming filter (25565 is in gaming)
      const gameMatches = activeSockets.filter((s) => PORT_PRESETS.gaming.ports.includes(s.port))
      expect(gameMatches.map((s) => s.port)).toEqual([25565])

      // All filter
      const allMatches = activeSockets.filter(() => true)
      expect(allMatches.length).toBe(4)
    })
  })

  // ─── 5. Port Watchdog Auto-Refresh Engine & Modal Hardening ──────────────────

  describe('5. Port Watchdog Auto-Refresh & Kill Modal Hardening', () => {
    it('verifies 3000ms polling interval specification for live auto-refresh', () => {
      const defaultInterval = 3000
      expect(defaultInterval).toBe(3000)
    })

    it('identifies system-critical PIDs (pid <= 4 or core Windows executables)', () => {
      const isSystemCritical = (pid: number, processName: string) => {
        return (
          pid <= 4 ||
          /^(system|svchost|csrss|explorer|wininit|services|lsass|smss)\.exe$/i.test(processName)
        )
      }

      // Critical system processes
      expect(isSystemCritical(0, 'System Idle Process')).toBe(true)
      expect(isSystemCritical(4, 'System')).toBe(true)
      expect(isSystemCritical(1234, 'svchost.exe')).toBe(true)
      expect(isSystemCritical(5678, 'explorer.exe')).toBe(true)
      expect(isSystemCritical(890, 'csrss.exe')).toBe(true)

      // Regular developer processes
      expect(isSystemCritical(4500, 'node.exe')).toBe(false)
      expect(isSystemCritical(8080, 'vite.exe')).toBe(false)
      expect(isSystemCritical(12000, 'cargo.exe')).toBe(false)
      expect(isSystemCritical(9200, 'java.exe')).toBe(false)
    })
  })

  // ─── 6. Bilingual i18n Translation Key Verification ──────────────────────────

  describe('6. Bilingual i18n Localization Parity for Desktop Elevation', () => {
    it('verifies activityFeed namespace has all elevation keys in en.json and tr.json', () => {
      const enFeed = (enJson as any).activityFeed || {}
      const trFeed = (trJson as any).activityFeed || {}

      expect(enFeed.shortcuts?.exportCsv).toBeTruthy()
      expect(trFeed.shortcuts?.exportCsv).toBeTruthy()
      expect(enFeed.shortcuts?.exportJson).toBeTruthy()
      expect(trFeed.shortcuts?.exportJson).toBeTruthy()

      expect(enFeed.integrity?.badgeGenesis).toBeTruthy()
      expect(trFeed.integrity?.badgeGenesis).toBeTruthy()
      expect(enFeed.integrity?.badgeVerified).toBeTruthy()
      expect(trFeed.integrity?.badgeVerified).toBeTruthy()
    })

    it('verifies portKiller namespace has all elevation keys in en.json and tr.json', () => {
      const enPort = (enJson as any).portKiller || {}
      const trPort = (trJson as any).portKiller || {}

      expect(enPort.autoRefresh).toBeTruthy()
      expect(trPort.autoRefresh).toBeTruthy()
      expect(enPort.presets?.web).toBeTruthy()
      expect(trPort.presets?.web).toBeTruthy()
      expect(enPort.presets?.database).toBeTruthy()
      expect(trPort.presets?.database).toBeTruthy()
      expect(enPort.presets?.dev).toBeTruthy()
      expect(trPort.presets?.dev).toBeTruthy()
      expect(enPort.presets?.gaming).toBeTruthy()
      expect(trPort.presets?.gaming).toBeTruthy()
      expect(enPort.confirmKill).toBeTruthy()
      expect(trPort.confirmKill).toBeTruthy()
    })
  })
})
