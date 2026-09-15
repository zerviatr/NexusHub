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

import { describe, it, expect } from 'vitest'
import {
  luhnCheck,
  sanitizeString,
  sanitizeMetadata,
} from '../src/shared/auditSanitization'

describe('Audit Sanitization & Sensitive Data Redaction (tests/auditSanitization.test.ts)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. API Key Redaction (OpenAI, Claude, Gemini, GitHub, AWS)
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. API Key Redaction', () => {
    it('redacts standard and project OpenAI API keys (sk-...)', () => {
      const openAiStandard = 'sk-abcdef12345678901234567890abcdef'
      const openAiProject = 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'
      const text = `Connecting with OpenAI key: ${openAiStandard} and fallback: ${openAiProject}`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain(openAiStandard)
      expect(sanitized).not.toContain(openAiProject)
      expect(sanitized).toBe('Connecting with OpenAI key: [REDACTED_API_KEY] and fallback: [REDACTED_API_KEY]')
    })

    it('redacts Anthropic Claude API keys (sk-ant-...)', () => {
      const claudeKey = 'sk-ant-api03-abcdef1234567890abcdef1234567890'
      const text = `Claude prompt dispatched with token: ${claudeKey}`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain(claudeKey)
      expect(sanitized).toBe('Claude prompt dispatched with token: [REDACTED_API_KEY]')
    })

    it('redacts Google / Gemini API keys (AIza...)', () => {
      // 39 chars total (AIza + 35 alphanumeric/dash/underscore chars)
      const geminiKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q'
      const text = `Gemini-2.0-flash initialized with key ${geminiKey}`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain(geminiKey)
      expect(sanitized).toBe('Gemini-2.0-flash initialized with key [REDACTED_API_KEY]')
    })

    it('redacts GitHub personal access tokens (ghp_...) and AWS access keys (AKIA...)', () => {
      const ghp = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const aws = 'AKIAIOSFODNN7EXAMPLE'
      const text = `Syncing repo via ${ghp} and s3 via ${aws}`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain(ghp)
      expect(sanitized).not.toContain(aws)
      expect(sanitized).toBe('Syncing repo via [REDACTED_API_KEY] and s3 via [REDACTED_API_KEY]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Authorization Headers (Bearer & Basic)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Authorization Header Redaction', () => {
    it('redacts Bearer authentication tokens from headers and raw strings', () => {
      const bearerHeader = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M'
      const sanitized = sanitizeString(bearerHeader)

      expect(sanitized).not.toContain('eyJhbGciOi')
      expect(sanitized).toMatch(/Bearer \[REDACTED_TOKEN\]/i)
    })

    it('redacts Basic authorization credentials', () => {
      const basicHeader = 'Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQxMjM='
      const sanitized = sanitizeString(basicHeader)

      expect(sanitized).not.toContain('dXNlcm5hbWU6cGFzc3dvcmQxMjM=')
      expect(sanitized).toMatch(/Basic \[REDACTED_AUTH\]/i)
    })

    it('redacts Bearer tokens ending with base64 padding without leaking padding signs', () => {
      const bWithDoublePadding = 'Authorization: Bearer dXNlcnBhc3M=='
      const bWithSinglePadding = 'Bearer dXNlcnBhc3M='
      expect(sanitizeString(bWithDoublePadding)).toBe('Authorization: Bearer [REDACTED_TOKEN]')
      expect(sanitizeString(bWithSinglePadding)).toBe('Bearer [REDACTED_TOKEN]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. JSON Web Tokens (JWT)
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. JSON Web Tokens (JWT) Redaction', () => {
    it('redacts standard 3-part JWT tokens in strings without Bearer prefix', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const logLine = `User session verified: token=${jwtToken}; origin=127.0.0.1`

      const sanitized = sanitizeString(logLine)
      expect(sanitized).not.toContain(jwtToken)
      expect(sanitized).toContain('[REDACTED_JWT]')
      expect(sanitized).toBe('User session verified: token=[REDACTED_JWT]; origin=127.0.0.1')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Credit Card Numbers with Luhn Algorithm Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Credit Card Numbers (PAN) with Luhn Algorithm Validation', () => {
    it('validates Luhn Mod-10 algorithm correctly for known valid and invalid numbers', () => {
      // Valid Luhn test numbers
      expect(luhnCheck('4000001234567899')).toBe(true)
      expect(luhnCheck('4000 0012 3456 7899')).toBe(true)
      expect(luhnCheck('4000-0012-3456-7899')).toBe(true)

      // Invalid Luhn test numbers (single digit corruption)
      expect(luhnCheck('4000001234567891')).toBe(false)
      expect(luhnCheck('1234567890123456')).toBe(false)
      expect(luhnCheck('9999999999999999')).toBe(false)
      expect(luhnCheck('abc')).toBe(false)
      expect(luhnCheck('')).toBe(false)
    })

    it('redacts real Luhn-valid card numbers formatted with dashes or spaces', () => {
      const validCardDashes = '4000-0012-3456-7899'
      const text = `Processed payment transaction for card ${validCardDashes}`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain(validCardDashes)
      expect(sanitized).toBe('Processed payment transaction for card [REDACTED_CREDIT_CARD]')
    })

    it('preserves harmless 16-digit non-card identifiers and hashes that fail Luhn check', () => {
      // 1234567890123456 is not a valid Luhn card
      const nonCardId = '1234567890123456'
      const text = `Device telemetry sequence # ${nonCardId} processed successfully`

      const sanitized = sanitizeString(text)
      expect(sanitized).toContain(nonCardId)
      expect(sanitized).not.toContain('[REDACTED_CREDIT_CARD]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Cryptographic Private Keys (RSA / EC / OpenSSH PEM)
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Cryptographic Private Keys Redaction', () => {
    it('redacts standard PKCS#8 PEM private key blocks', () => {
      const pemKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VXTU96as...
-----END PRIVATE KEY-----`
      const text = `Generated client TLS certificate with key:\n${pemKey}\nRegistration completed.`

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VXTU96as')
      expect(sanitized).toBe('Generated client TLS certificate with key:\n[REDACTED_PRIVATE_KEY]\nRegistration completed.')
    })

    it('redacts RSA and EC private key blocks', () => {
      const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3y...
-----END RSA PRIVATE KEY-----`
      const ecKey = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEI...
-----END EC PRIVATE KEY-----`

      expect(sanitizeString(rsaKey)).toBe('[REDACTED_PRIVATE_KEY]')
      expect(sanitizeString(ecKey)).toBe('[REDACTED_PRIVATE_KEY]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6. URL Query String Secrets
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. URL Query String Secrets Redaction', () => {
    it('redacts secret values in URL query strings while preserving safe parameters', () => {
      const url = 'https://api.example.com/v1/auth?token=SUPER_SECRET_12345&user=john_doe&apiKey=SEC_KEY_888&page=2'
      const sanitized = sanitizeString(url)

      expect(sanitized).not.toContain('SUPER_SECRET_12345')
      expect(sanitized).not.toContain('SEC_KEY_888')
      expect(sanitized).toContain('user=john_doe')
      expect(sanitized).toContain('page=2')
      expect(sanitized).toBe('https://api.example.com/v1/auth?token=[REDACTED]&user=john_doe&apiKey=[REDACTED]&page=2')
    })

    it('redacts password parameter in login URLs', () => {
      const url = 'http://localhost:8080/login?user=admin&password=SuperSecretPassword!&remember=true'
      const sanitized = sanitizeString(url)

      expect(sanitized).not.toContain('SuperSecretPassword!')
      expect(sanitized).toBe('http://localhost:8080/login?user=admin&password=[REDACTED]&remember=true')
    })

    it('redacts OAuth query parameters including access_token, refresh_token, and client_secret', () => {
      const url = 'https://auth.example.com/oauth/callback?access_token=secretAccessToken123&refresh_token=secretRefreshToken456&client_secret=superClientSecret789'
      const sanitized = sanitizeString(url)

      expect(sanitized).not.toContain('secretAccessToken123')
      expect(sanitized).not.toContain('secretRefreshToken456')
      expect(sanitized).not.toContain('superClientSecret789')
      expect(sanitized).toBe('https://auth.example.com/oauth/callback?access_token=[REDACTED]&refresh_token=[REDACTED]&client_secret=[REDACTED]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Sensitive Object Properties in Metadata
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. Sensitive Object Properties in Metadata', () => {
    it('redacts sensitive keys (password, token, secret, apiKey, etc.) with [REDACTED_SECRET]', () => {
      const metadata = {
        tool: 'api-studio',
        endpoint: '/api/v1/checkout',
        password: 'PlainTextPassword123',
        token: 'auth-token-value',
        secret: 'app-secret-value',
        apiKey: 'api-key-value',
        authorization: 'custom-auth-scheme',
        cookie: 'session_id=xyz789',
        private_key: 'private-key-data',
        accessToken: 'access-token-val',
        refreshToken: 'refresh-token-val',
        clientSecret: 'client-secret-val',
        safeProperty: 'KeepMeIntact',
        count: 42,
      }

      const sanitized = sanitizeMetadata(metadata)

      expect(sanitized.password).toBe('[REDACTED_SECRET]')
      expect(sanitized.token).toBe('[REDACTED_SECRET]')
      expect(sanitized.secret).toBe('[REDACTED_SECRET]')
      expect(sanitized.apiKey).toBe('[REDACTED_SECRET]')
      expect(sanitized.authorization).toBe('[REDACTED_SECRET]')
      expect(sanitized.cookie).toBe('[REDACTED_SECRET]')
      expect(sanitized.private_key).toBe('[REDACTED_SECRET]')
      expect(sanitized.accessToken).toBe('[REDACTED_SECRET]')
      expect(sanitized.refreshToken).toBe('[REDACTED_SECRET]')
      expect(sanitized.clientSecret).toBe('[REDACTED_SECRET]')

      // Non-sensitive properties preserved
      expect(sanitized.tool).toBe('api-studio')
      expect(sanitized.endpoint).toBe('/api/v1/checkout')
      expect(sanitized.safeProperty).toBe('KeepMeIntact')
      expect(sanitized.count).toBe(42)
    })

    it('sanitizes strings inside non-sensitive metadata properties', () => {
      const metadata = {
        actionDetails: 'Connecting with key sk-abcdef12345678901234567890abcdef',
        requestUrl: 'https://api.example.com?apiKey=MY_KEY_XYZ',
      }

      const sanitized = sanitizeMetadata(metadata)
      expect(sanitized.actionDetails).toBe('Connecting with key [REDACTED_API_KEY]')
      expect(sanitized.requestUrl).toBe('https://api.example.com?apiKey=[REDACTED]')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Circular References & Max Depth Handling
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. Circular References & Max Depth Handling', () => {
    it('safely handles circular references in metadata without crashing', () => {
      const obj: any = { name: 'RootNode', items: [1, 2, 3] }
      obj.self = obj
      obj.nested = { parent: obj }

      const sanitized = sanitizeMetadata(obj)
      expect(sanitized.name).toBe('RootNode')
      expect(sanitized.self).toBe('[CIRCULAR]')
      expect(sanitized.nested.parent).toBe('[CIRCULAR]')
    })

    it('truncates recursion at max depth 8 with [MAX_DEPTH]', () => {
      // Build a deeply nested object beyond depth 8
      let current: any = { level: 0 }
      const root = current
      for (let i = 1; i <= 12; i++) {
        current.child = { level: i }
        current = current.child
      }

      const sanitized = sanitizeMetadata(root)
      expect(sanitized.level).toBe(0)
      expect(sanitized.child.level).toBe(1)

      // Traverse to depth 9
      let node = sanitized
      let depth = 0
      while (node && typeof node === 'object' && node.child) {
        node = node.child
        depth++
      }

      // Beyond depth 8, child is marked [MAX_DEPTH]
      expect(depth).toBeLessThanOrEqual(9)
      expect(node).toBe('[MAX_DEPTH]')
    })

    it('handles null, undefined, primitives, and arrays cleanly', () => {
      expect(sanitizeMetadata(null)).toBeNull()
      expect(sanitizeMetadata(undefined)).toBeUndefined()
      expect(sanitizeMetadata(123)).toBe(123)
      expect(sanitizeMetadata(true)).toBe(true)

      const arr = [
        'sk-abcdef12345678901234567890abcdef',
        { password: '123' },
        42,
      ]
      const sanitizedArr = sanitizeMetadata(arr)
      expect(sanitizedArr[0]).toBe('[REDACTED_API_KEY]')
      expect(sanitizedArr[1].password).toBe('[REDACTED_SECRET]')
      expect(sanitizedArr[2]).toBe(42)
    })
  })
})
