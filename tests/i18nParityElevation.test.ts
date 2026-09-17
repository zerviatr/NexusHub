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
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

/**
 * Recursively flattens a nested JSON object into a map of dot-notation keys -> string values.
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = String(value ?? '')
    }
  }

  return result
}

describe('Internationalization (i18n) — 100% Key Parity & Elevation Verification', () => {
  const enFlat = flattenKeys(enJson as Record<string, unknown>)
  const trFlat = flattenKeys(trJson as Record<string, unknown>)

  const enKeys = Object.keys(enFlat).sort()
  const trKeys = Object.keys(trFlat).sort()

  describe('1. Global Dictionary Parity & Cardinality', () => {
    it('verifies exact total count of 738 keys in both en.json and tr.json', () => {
      expect(enKeys.length).toBe(738)
      expect(trKeys.length).toBe(738)
    })

    it('verifies zero missing keys in tr.json relative to en.json', () => {
      const missingInTr = enKeys.filter((k) => !trFlat.hasOwnProperty(k))
      expect(missingInTr).toEqual([])
    })

    it('verifies zero missing keys in en.json relative to tr.json', () => {
      const missingInEn = trKeys.filter((k) => !enFlat.hasOwnProperty(k))
      expect(missingInEn).toEqual([])
    })

    it('verifies zero empty strings or undefined values in en.json', () => {
      const emptyEn = Object.entries(enFlat)
        .filter(([_, v]) => !v || v.trim() === '')
        .map(([k]) => k)
      expect(emptyEn).toEqual([])
    })

    it('verifies zero empty strings or undefined values in tr.json', () => {
      const emptyTr = Object.entries(trFlat)
        .filter(([_, v]) => !v || v.trim() === '')
        .map(([k]) => k)
      expect(emptyTr).toEqual([])
    })
  })

  describe('2. Four New Developer SaaS Utilities Namespaces Parity', () => {
    it('verifies jwtStudio namespace parity (49 keys)', () => {
      const enJwt = enKeys.filter((k) => k.startsWith('jwtStudio.'))
      const trJwt = trKeys.filter((k) => k.startsWith('jwtStudio.'))

      expect(enJwt.length).toBe(49)
      expect(trJwt.length).toBe(49)
      expect(enJwt).toEqual(trJwt)
    })

    it('verifies cronStudio namespace parity (30 keys)', () => {
      const enCron = enKeys.filter((k) => k.startsWith('cronStudio.'))
      const trCron = trKeys.filter((k) => k.startsWith('cronStudio.'))

      expect(enCron.length).toBe(30)
      expect(trCron.length).toBe(30)
      expect(enCron).toEqual(trCron)
    })

    it('verifies mermaidStudio namespace parity (24 keys)', () => {
      const enMermaid = enKeys.filter((k) => k.startsWith('mermaidStudio.'))
      const trMermaid = trKeys.filter((k) => k.startsWith('mermaidStudio.'))

      expect(enMermaid.length).toBe(24)
      expect(trMermaid.length).toBe(24)
      expect(enMermaid).toEqual(trMermaid)
    })

    it('verifies encodingStudio namespace parity (32 keys)', () => {
      const enEncoding = enKeys.filter((k) => k.startsWith('encodingStudio.'))
      const trEncoding = trKeys.filter((k) => k.startsWith('encodingStudio.'))

      expect(enEncoding.length).toBe(32)
      expect(trEncoding.length).toBe(32)
      expect(enEncoding).toEqual(trEncoding)
    })
  })

  describe('3. Desktop UX Elevation Modules Namespaces Parity', () => {
    it('verifies portKiller namespace was purged in v2.5.3 per SaaS Directive Principle 2', () => {
      const enPort = enKeys.filter((k) => k.startsWith('portKiller.'))
      const trPort = trKeys.filter((k) => k.startsWith('portKiller.'))

      expect(enPort.length).toBe(0)
      expect(trPort.length).toBe(0)
    })

    it('verifies activityFeed namespace parity (87 keys)', () => {
      const enFeed = enKeys.filter((k) => k.startsWith('activityFeed.'))
      const trFeed = trKeys.filter((k) => k.startsWith('activityFeed.'))

      expect(enFeed.length).toBe(87)
      expect(trFeed.length).toBe(87)
      expect(enFeed).toEqual(trFeed)
    })

    it('verifies nav.tools namespace parity (23 keys including all 4 new tools)', () => {
      const enNav = enKeys.filter((k) => k.startsWith('nav.tools.'))
      const trNav = trKeys.filter((k) => k.startsWith('nav.tools.'))

      expect(enNav.length).toBe(23)
      expect(trNav.length).toBe(23)
      expect(enNav).toEqual(trNav)

      // Ensure 4 new tools exist in navigation
      expect(enNav).toContain('nav.tools.jwtStudio')
      expect(enNav).toContain('nav.tools.cronStudio')
      expect(enNav).toContain('nav.tools.mermaidStudio')
      expect(enNav).toContain('nav.tools.encodingStudio')
    })

    it('verifies dashboard.tools namespace parity (12 keys)', () => {
      const enDash = enKeys.filter((k) => k.startsWith('dashboard.tools.'))
      const trDash = trKeys.filter((k) => k.startsWith('dashboard.tools.'))

      expect(enDash.length).toBe(12)
      expect(trDash.length).toBe(12)
      expect(enDash).toEqual(trDash)

      // Ensure 4 new tools exist in dashboard descriptions
      expect(enDash).toContain('dashboard.tools.jwtStudio.desc')
      expect(enDash).toContain('dashboard.tools.cronStudio.desc')
      expect(enDash).toContain('dashboard.tools.mermaidStudio.desc')
      expect(enDash).toContain('dashboard.tools.encodingStudio.desc')
    })
  })

  describe('4. Interpolation Placeholders Parity for Elevation Workstations', () => {
    it('verifies all {{variable}} interpolation tags match between en.json and tr.json across elevated namespaces', () => {
      const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g
      const elevatedPrefixes = [
        'jwtStudio.',
        'cronStudio.',
        'mermaidStudio.',
        'encodingStudio.',
        'activityFeed.',
      ]

      const elevatedKeys = enKeys.filter((k) =>
        elevatedPrefixes.some((prefix) => k.startsWith(prefix))
      )

      for (const key of elevatedKeys) {
        const enVal = enFlat[key]
        const trVal = trFlat[key]

        const enVars = [...enVal.matchAll(regex)].map((m) => m[1]).sort()
        const trVars = [...trVal.matchAll(regex)].map((m) => m[1]).sort()

        expect(
          trVars,
          `Variable mismatch in key "${key}": EN has [${enVars.join(', ')}] vs TR has [${trVars.join(', ')}]`
        ).toEqual(enVars)
      }
    })
  })
})
