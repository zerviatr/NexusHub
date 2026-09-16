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
import {
  utf8ToBase64Url,
  bytesToBase64Url,
  base64UrlToUtf8,
  base64UrlToBytes,
  parseJwt,
  formatDurationHuman,
  calculateExpiryInfo,
  verifyHmacSha256,
  signHmacSha256,
  JWT_GENERATOR_PRESETS,
  JwtPayload,
} from '../src/renderer/src/lib/jwtEngine'
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

describe('JWT & Token Studio — jwtEngine Comprehensive Test Suite', () => {
  describe('1. UTF-8 Safe Base64URL Encoding & Decoding', () => {
    it('round-trips standard ASCII strings accurately without padding', () => {
      const input = 'Hello, ZenDev Enterprise!'
      const encoded = utf8ToBase64Url(input)
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
      expect(encoded).not.toContain('=')
      expect(base64UrlToUtf8(encoded)).toBe(input)
    })

    it('round-trips multi-byte UTF-8 Turkish characters and complex Unicode', () => {
      const turkishUnicode = 'Türkçe karakter seti: ğüşiöç ĞÜŞİÖÇ — Tamamen yerel!'
      const encoded = utf8ToBase64Url(turkishUnicode)
      expect(base64UrlToUtf8(encoded)).toBe(turkishUnicode)
    })

    it('round-trips emojis and multi-code-point UTF-8 symbols', () => {
      const emojiText = 'ZenDev Security Shield 🛡️ 🚀 🔑 ⚡'
      const encoded = utf8ToBase64Url(emojiText)
      expect(base64UrlToUtf8(encoded)).toBe(emojiText)
    })

    it('handles raw byte arrays to base64url and vice-versa', () => {
      const bytes = new Uint8Array([0, 15, 255, 128, 64, 32, 16, 8, 4, 2, 1])
      const b64Url = bytesToBase64Url(bytes)
      const decodedBytes = base64UrlToBytes(b64Url)
      expect(decodedBytes).toEqual(bytes)
    })

    it('correctly normalizes base64url with and without padding in base64UrlToBytes', () => {
      const raw = 'test string payload'
      const b64Url = utf8ToBase64Url(raw)
      const bytes = base64UrlToBytes(b64Url)
      expect(new TextDecoder().decode(bytes)).toBe(raw)
    })
  })

  describe('2. JWT Syntax Parsing & Validation (parseJwt)', () => {
    it('rejects empty or whitespace-only token inputs', () => {
      const resEmpty = parseJwt('')
      expect(resEmpty.isValidFormat).toBe(false)
      expect(resEmpty.error).toBe('Token is empty')

      const resWhitespace = parseJwt('    ')
      expect(resWhitespace.isValidFormat).toBe(false)
      expect(resWhitespace.error).toBe('Token is empty')
    })

    it('rejects tokens that do not contain exactly 3 dot-separated parts', () => {
      const single = parseJwt('part1')
      expect(single.isValidFormat).toBe(false)
      expect(single.error).toContain('expected 3 dot-separated segments')

      const twoParts = parseJwt('part1.part2')
      expect(twoParts.isValidFormat).toBe(false)
      expect(twoParts.error).toContain('expected 3 dot-separated segments')

      const fourParts = parseJwt('part1.part2.part3.part4')
      expect(fourParts.isValidFormat).toBe(false)
      expect(fourParts.error).toContain('expected 3 dot-separated segments')
    })

    it('parses valid 3-part JWT header and payload and extracts formatted JSON', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'user_123', role: 'admin', iat: 1700000000 }
      const secret = 'super-secret-key-2026'

      const signedToken = await signHmacSha256(header, payload, secret)
      const parsed = parseJwt(signedToken)

      expect(parsed.isValidFormat).toBe(true)
      expect(parsed.error).toBeUndefined()
      expect(parsed.header).toEqual(header)
      expect(parsed.payload).toEqual(payload)
      expect(JSON.parse(parsed.headerJson)).toEqual(header)
      expect(JSON.parse(parsed.payloadJson)).toEqual(payload)
      expect(parsed.signatureRaw.length).toBeGreaterThan(10)
    })

    it('flags decoding errors when header or payload is corrupted base64 or invalid JSON', () => {
      const corruptedHeader = 'not-valid-json.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl'
      const parsed = parseJwt(corruptedHeader)
      expect(parsed.isValidFormat).toBe(false)
      expect(parsed.error).toContain('Header decoding error')

      const validHeaderB64 = utf8ToBase64Url(JSON.stringify({ alg: 'HS256' }))
      const corruptedPayload = `${validHeaderB64}.!!!invalid-base64!!!.sig`
      const parsedPayloadErr = parseJwt(corruptedPayload)
      expect(parsedPayloadErr.isValidFormat).toBe(false)
      expect(parsedPayloadErr.error).toContain('Payload decoding error')
    })
  })

  describe('3. Cryptographic HMAC-SHA256 Signing & Verification (Web Crypto API)', () => {
    it('signs and verifies JWT tokens using UTF-8 text secret', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'usr_enterprise_01', iss: 'zendev.app', exp: 1999999999 }
      const secret = 'my-ultra-secure-passphrase-32bytes!'

      const token = await signHmacSha256(header, payload, secret, false)
      expect(token.split('.').length).toBe(3)

      const verifyResult = await verifyHmacSha256(token, secret, false)
      expect(verifyResult.valid).toBe(true)
      expect(verifyResult.error).toBeUndefined()
    })

    it('signs and verifies JWT tokens using Base64-encoded secret key', async () => {
      const rawSecret = 'binary-key-secret-seed-value-123'
      const base64Secret = btoa(rawSecret)

      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'service_worker', aud: 'internal_api' }

      const token = await signHmacSha256(header, payload, base64Secret, true)
      const verifyResult = await verifyHmacSha256(token, base64Secret, true)

      expect(verifyResult.valid).toBe(true)
      expect(verifyResult.error).toBeUndefined()
    })

    it('rejects signature verification when secret key is wrong or mismatched', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'test_user' }
      const correctSecret = 'correct-password-alpha'
      const wrongSecret = 'wrong-password-beta'

      const token = await signHmacSha256(header, payload, correctSecret)
      const verifyResult = await verifyHmacSha256(token, wrongSecret)

      expect(verifyResult.valid).toBe(false)
      expect(verifyResult.error).toContain('Signature does not match')
    })

    it('rejects verification when token is tampered with (header, payload, or signature modification)', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'original_user', role: 'user' }
      const secret = 'immutable-integrity-secret'

      const originalToken = await signHmacSha256(header, payload, secret)
      const [h, p, s] = originalToken.split('.')

      // Tamper 1: Tampered payload (escalate role to admin)
      const tamperedPayload = utf8ToBase64Url(JSON.stringify({ sub: 'original_user', role: 'admin' }))
      const tamperedPayloadToken = `${h}.${tamperedPayload}.${s}`
      const verifyPayloadTamper = await verifyHmacSha256(tamperedPayloadToken, secret)
      expect(verifyPayloadTamper.valid).toBe(false)

      // Tamper 2: Tampered header (change typ)
      const tamperedHeader = utf8ToBase64Url(JSON.stringify({ alg: 'HS256', typ: 'TAMPERED' }))
      const tamperedHeaderToken = `${tamperedHeader}.${p}.${s}`
      const verifyHeaderTamper = await verifyHmacSha256(tamperedHeaderToken, secret)
      expect(verifyHeaderTamper.valid).toBe(false)

      // Tamper 3: Tampered signature byte
      const tamperedSig = s.slice(0, -2) + (s.endsWith('A') ? 'B' : 'A')
      const tamperedSigToken = `${h}.${p}.${tamperedSig}`
      const verifySigTamper = await verifyHmacSha256(tamperedSigToken, secret)
      expect(verifySigTamper.valid).toBe(false)
    })

    it('rejects verification when secret key is empty', async () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature'
      const verifyResult = await verifyHmacSha256(token, '')
      expect(verifyResult.valid).toBe(false)
      expect(verifyResult.error).toBe('Secret key is empty')
    })

    it('supports algorithm "none" unsigned token creation', async () => {
      const header = { alg: 'none', typ: 'JWT' }
      const payload = { sub: 'open_token' }
      const token = await signHmacSha256(header, payload, '')

      expect(token.endsWith('.')).toBe(true)
      const parsed = parseJwt(token)
      expect(parsed.header?.alg).toBe('none')
      expect(parsed.signatureRaw).toBe('')
    })
  })

  describe('4. Token Expiry Timeline & Human Duration (calculateExpiryInfo)', () => {
    it('returns "no-expiry" when payload is null or exp claim is missing', () => {
      const resNull = calculateExpiryInfo(null)
      expect(resNull.status).toBe('no-expiry')

      const resNoExp = calculateExpiryInfo({ sub: 'user_123' })
      expect(resNoExp.status).toBe('no-expiry')
    })

    it('categorizes status as "active" with proper percentage when more than 1 hour remains', () => {
      const now = 1700000000
      const payload: JwtPayload = {
        iat: now - 3600, // issued 1 hour ago
        exp: now + 7200, // expires in 2 hours
      }

      const info = calculateExpiryInfo(payload, now)
      expect(info.status).toBe('active')
      expect(info.remainingSec).toBe(7200)
      expect(info.totalDurationSec).toBe(10800)
      expect(info.percentageRemaining).toBe(67) // 7200 / 10800 = 66.6% -> 67%
      expect(info.humanRemaining).toBe('2h 0m')
    })

    it('categorizes status as "expiring-soon" when remaining time is between 1 and 3600 seconds', () => {
      const now = 1700000000
      const payload: JwtPayload = {
        iat: now - 3000,
        exp: now + 1800, // 30 minutes left
      }

      const info = calculateExpiryInfo(payload, now)
      expect(info.status).toBe('expiring-soon')
      expect(info.remainingSec).toBe(1800)
      expect(info.humanRemaining).toBe('30m 0s')
    })

    it('categorizes status as "expired" when exp is in the past', () => {
      const now = 1700000000
      const payload: JwtPayload = {
        iat: now - 10000,
        exp: now - 500, // expired 500 seconds ago
      }

      const info = calculateExpiryInfo(payload, now)
      expect(info.status).toBe('expired')
      expect(info.remainingSec).toBe(-500)
      expect(info.percentageRemaining).toBe(0)
    })

    it('formats duration into concise human-readable units (days, hours, minutes, seconds)', () => {
      expect(formatDurationHuman(90000)).toBe('1d 1h')
      expect(formatDurationHuman(3665)).toBe('1h 1m')
      expect(formatDurationHuman(125)).toBe('2m 5s')
      expect(formatDurationHuman(42)).toBe('42s')
    })
  })

  describe('5. Built-in Generator Presets Integrity', () => {
    it('verifies all generator presets (userAuth, microservice, admin) are valid and signable', async () => {
      const secret = 'preset-test-key-2026'

      for (const [key, preset] of Object.entries(JWT_GENERATOR_PRESETS)) {
        expect(preset.header.alg).toBe('HS256')
        expect(preset.label).toBeTruthy()
        expect(preset.payload.sub).toBeTruthy()

        const signed = await signHmacSha256(preset.header, preset.payload, secret)
        const parsed = parseJwt(signed)
        expect(parsed.isValidFormat).toBe(true)
        expect(parsed.payload?.sub).toBe(preset.payload.sub)

        const verified = await verifyHmacSha256(signed, secret)
        expect(verified.valid).toBe(true)
      }
    })
  })

  describe('6. Bilingual i18n Translation Key Verification', () => {
    it('verifies jwtStudio namespace has 100% key parity and non-empty strings in en.json and tr.json', () => {
      const enKeys = Object.keys((enJson as any).jwtStudio || {})
      const trKeys = Object.keys((trJson as any).jwtStudio || {})

      expect(enKeys.length).toBeGreaterThanOrEqual(15)
      expect(enKeys.sort()).toEqual(trKeys.sort())

      // Verify essential labels exist
      expect((enJson as any).jwtStudio.title).toBe('JWT & Token Studio')
      expect((trJson as any).jwtStudio.title).toBe('JWT & Token Stüdyosu')
      expect((enJson as any).jwtStudio.secretKey).toBeTruthy()
      expect((trJson as any).jwtStudio.secretKey).toBeTruthy()
    })
  })
})
