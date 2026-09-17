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
import trJson from '../src/renderer/src/locales/tr.json'
import enJson from '../src/renderer/src/locales/en.json'

/**
 * Normalizes user input URLs by prefixing https:// if scheme is missing.
 * Matches UniversalDecrypter.tsx logic.
 */
export const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

/**
 * Validates whether a URL string is valid, with or without explicit protocol.
 * Matches UniversalDecrypter.tsx logic.
 */
export const isValidUrlFormat = (raw: string): boolean => {
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed)
      return true
    } catch {
      return false
    }
  }
  try {
    const parsed = new URL(`https://${trimmed}`)
    return parsed.hostname.includes('.') && parsed.hostname.length >= 3
  } catch {
    return false
  }
}

describe('Universal Link Decrypter (Bypasser) Comprehensive Test Suite', () => {
  describe('1. URL Scheme Normalization & Input Validation', () => {
    it('normalizes scheme-less domain inputs by prefixing https://', () => {
      expect(normalizeUrl('bit.ly/xyz123')).toBe('https://bit.ly/xyz123')
      expect(normalizeUrl('t.co/abc')).toBe('https://t.co/abc')
      expect(normalizeUrl('google.com/search?q=test&utm_source=fb')).toBe(
        'https://google.com/search?q=test&utm_source=fb'
      )
      expect(normalizeUrl('  sub.domain.org/path  ')).toBe('https://sub.domain.org/path')
    })

    it('preserves existing http:// and https:// schemes without mutation', () => {
      expect(normalizeUrl('https://example.com/item')).toBe('https://example.com/item')
      expect(normalizeUrl('http://legacy.site.org/index.html')).toBe('http://legacy.site.org/index.html')
      expect(normalizeUrl('HTTPS://UPPERCASE.COM/PATH')).toBe('HTTPS://UPPERCASE.COM/PATH')
    })

    it('handles empty, blank, or whitespace-only inputs gracefully', () => {
      expect(normalizeUrl('')).toBe('')
      expect(normalizeUrl('   \t\n  ')).toBe('')
    })

    it('accurately validates standard full URLs with protocols', () => {
      expect(isValidUrlFormat('https://nexus.dev')).toBe(true)
      expect(isValidUrlFormat('http://localhost:3000')).toBe(true)
      expect(isValidUrlFormat('https://example.com/product?id=42&ref=tw')).toBe(true)
    })

    it('accepts valid domain-like URLs without protocol (relaxed validation)', () => {
      expect(isValidUrlFormat('bit.ly/test-link')).toBe(true)
      expect(isValidUrlFormat('t.co/share123')).toBe(true)
      expect(isValidUrlFormat('aylink.co/bypass-me')).toBe(true)
      expect(isValidUrlFormat('subdomain.shop.com.tr/deal')).toBe(true)
    })

    it('rejects malformed, empty, or invalid input strings', () => {
      expect(isValidUrlFormat('')).toBe(false)
      expect(isValidUrlFormat('   ')).toBe(false)
      expect(isValidUrlFormat('justtextwithoutdot')).toBe(false)
      expect(isValidUrlFormat('https://')).toBe(false)
      expect(isValidUrlFormat('http://')).toBe(false)
    })
  })

  describe('2. Batch Mode Processing & Scheme Auto-Prefixing', () => {
    it('processes batch input lines without dropping scheme-less valid domains', () => {
      const batchInput = `
        https://example.com/item1?utm_source=newsletter
        bit.ly/sample-link
        
        t.co/social-post?s=20
        not-a-valid-url
        http://store.org/deal?fbclid=xyz987
      `

      const lines = batchInput.split('\n').map((l) => l.trim())
      const validLines = lines.filter((l) => l.length > 0 && isValidUrlFormat(l))
      const normalizedUrls = validLines.map(normalizeUrl)

      expect(validLines.length).toBe(4)
      expect(normalizedUrls).toEqual([
        'https://example.com/item1?utm_source=newsletter',
        'https://bit.ly/sample-link',
        'https://t.co/social-post?s=20',
        'http://store.org/deal?fbclid=xyz987',
      ])
    })
  })

  describe('3. Modern Tracking Taxonomy & Parameter Stripping Verification', () => {
    // Taxonomy reference keys from bypasser.rs
    const TRACKER_KEYS = new Set([
      'gclid', 'gclsrc', 'wbraid', 'gbraid', 'dclid', 'msclkid', 'yclid',
      'fbclid', 'igshid', 'ttclid', 'twclid', 'si', 's', 't', 'rdt_cid',
      'li_fat_id', 'epik', '_ga', '_gl', 'ym_debug', '_openstat', 'ref',
      'ref_src', 'ref_url', 'mc_cid', 'mc_eid', '_ke', '_hsenc', '_hsmi',
      'hsctatracking', 'ml_subscriber', 'ml_subscriber_hash', 'mkt_tok',
      'pf_rd_r', 'pf_rd_m', 'pf_rd_p', 'pf_rd_s', 'pf_rd_t', 'pf_rd_i'
    ])

    function stripTrackers(urlStr: string): { cleanUrl: string; removedCount: number; removed: string[] } {
      const parsed = new URL(normalizeUrl(urlStr))
      const removed: string[] = []
      const toDelete: string[] = []

      parsed.searchParams.forEach((_, key) => {
        const lower = key.toLowerCase()
        if (TRACKER_KEYS.has(lower) || lower.startsWith('utm_')) {
          removed.push(key)
          toDelete.push(key)
        }
      })

      toDelete.forEach((k) => parsed.searchParams.delete(k))
      return {
        cleanUrl: parsed.toString(),
        removedCount: removed.length,
        removed,
      }
    }

    it('strips contemporary YouTube share tracking parameter "si"', () => {
      const result = stripTrackers('https://youtu.be/dQw4w9WgXcQ?si=abcdef123456')
      expect(result.removedCount).toBe(1)
      expect(result.removed).toContain('si')
      expect(result.cleanUrl).toBe('https://youtu.be/dQw4w9WgXcQ')
    })

    it('strips Twitter / X share parameters "s" and "t"', () => {
      const result = stripTrackers('https://x.com/user/status/123456789?s=20&t=abcdefgh')
      expect(result.removedCount).toBe(2)
      expect(result.removed).toContain('s')
      expect(result.removed).toContain('t')
      expect(result.cleanUrl).toBe('https://x.com/user/status/123456789')
    })

    it('strips Yandex Direct & Metrica trackers (yclid, ym_debug, _openstat)', () => {
      const result = stripTrackers('https://market.yandex.ru/product?id=99&yclid=ya123&ym_debug=1&_openstat=tag456')
      expect(result.removedCount).toBe(3)
      expect(result.removed).toContain('yclid')
      expect(result.removed).toContain('ym_debug')
      expect(result.removed).toContain('_openstat')
      expect(result.cleanUrl).toBe('https://market.yandex.ru/product?id=99')
    })

    it('strips HubSpot email tokens (_hsenc, _hsmi, hsCtaTracking)', () => {
      const result = stripTrackers('https://hubspot.com/offer?_hsenc=token1&_hsmi=msg2&hsCtaTracking=cta3&valid=keep')
      expect(result.removedCount).toBe(3)
      expect(result.removed).toContain('_hsenc')
      expect(result.removed).toContain('_hsmi')
      expect(result.removed).toContain('hsCtaTracking')
      expect(result.cleanUrl).toBe('https://hubspot.com/offer?valid=keep')
    })

    it('strips Reddit, LinkedIn, Pinterest, and MailerLite trackers', () => {
      const result = stripTrackers(
        'https://promo.org/page?rdt_cid=reddit1&li_fat_id=linkedin2&epik=pin3&ml_subscriber=mail4&ml_subscriber_hash=hash5'
      )
      expect(result.removedCount).toBe(5)
      expect(result.cleanUrl).toBe('https://promo.org/page')
    })

    it('strictly preserves legitimate non-tracking query parameters and URL fragments', () => {
      const result = stripTrackers(
        'https://example.com/search?q=tauri+v2+rust&page=2&category=dev&utm_source=twitter#top'
      )
      expect(result.removedCount).toBe(1)
      expect(result.removed).toEqual(['utm_source'])
      expect(result.cleanUrl).toBe('https://example.com/search?q=tauri+v2+rust&page=2&category=dev#top')
    })
  })

  describe('4. Ad Shortener Domain Identification', () => {
    const AD_DOMAINS = ['aylink.co', 'cpmlink.pro', 'ay.live', 'aylink.net', 'aylink.link']

    function isAdShortener(rawUrl: string): boolean {
      try {
        const parsed = new URL(normalizeUrl(rawUrl))
        const host = parsed.hostname.toLowerCase()
        return AD_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
      } catch {
        return false
      }
    }

    it('identifies known Aylink and CPMlink ad shorteners and subdomains', () => {
      expect(isAdShortener('https://aylink.co/xyz123')).toBe(true)
      expect(isAdShortener('http://cpmlink.pro/alias456')).toBe(true)
      expect(isAdShortener('ay.live/redirect')).toBe(true)
      expect(isAdShortener('https://sub.aylink.net/link')).toBe(true)
      expect(isAdShortener('aylink.link/go')).toBe(true)
    })

    it('does not flag benign platforms as ad shorteners', () => {
      expect(isAdShortener('https://youtube.com/watch?v=123')).toBe(false)
      expect(isAdShortener('https://github.com/tauri-apps/tauri')).toBe(false)
      expect(isAdShortener('https://google.com')).toBe(false)
      expect(isAdShortener('https://aylink.co.fake.org/not-real')).toBe(false)
    })
  })

  describe('5. Bilingual i18n Localization Parity for Decrypter', () => {
    const trDecrypter = (trJson as Record<string, any>).decrypter
    const enDecrypter = (enJson as Record<string, any>).decrypter

    it('verifies that decrypter namespace exists in both tr.json and en.json', () => {
      expect(trDecrypter).toBeDefined()
      expect(enDecrypter).toBeDefined()
      expect(typeof trDecrypter).toBe('object')
      expect(typeof enDecrypter).toBe('object')
    })

    function flatten(obj: Record<string, any>, prefix = ''): Record<string, string> {
      const res: Record<string, string> = {}
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          Object.assign(res, flatten(v, full))
        } else {
          res[full] = String(v ?? '')
        }
      }
      return res
    }

    const trFlat = flatten(trDecrypter)
    const enFlat = flatten(enDecrypter)

    it('verifies 100% key parity with zero missing keys between TR and EN', () => {
      const trKeys = Object.keys(trFlat).sort()
      const enKeys = Object.keys(enFlat).sort()

      expect(trKeys).toEqual(enKeys)
      expect(trKeys.length).toBeGreaterThanOrEqual(30)
    })

    it('verifies zero empty or whitespace-only translation strings in decrypter', () => {
      for (const [k, v] of Object.entries(trFlat)) {
        expect(v.trim().length, `TR key "${k}" is empty`).toBeGreaterThan(0)
      }
      for (const [k, v] of Object.entries(enFlat)) {
        expect(v.trim().length, `EN key "${k}" is empty`).toBeGreaterThan(0)
      }
    })

    it('verifies interpolation variables match exactly between TR and EN', () => {
      const varRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g
      for (const key of Object.keys(trFlat)) {
        const trMatches = [...trFlat[key].matchAll(varRegex)].map((m) => m[1]).sort()
        const enMatches = [...enFlat[key].matchAll(varRegex)].map((m) => m[1]).sort()
        expect(
          trMatches,
          `Variable mismatch in decrypter key "${key}": TR has [${trMatches.join(', ')}] vs EN has [${enMatches.join(', ')}]`
        ).toEqual(enMatches)
      }
    })
  })
})
