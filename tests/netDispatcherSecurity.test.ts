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
  validateRequestTarget,
  validateAndSanitizeHeaders,
  validateHeaders,
  validatePort,
  validateHostname,
  isCloudMetadataHost,
  isPrivateNetworkHost,
  assertSafeRequestTarget,
  SecurityValidationError,
} from '../src/main/ipc/netDispatcherSecurity'

describe('Network Dispatcher — Security & SSRF Protection Test Suite (tests/netDispatcherSecurity.test.ts)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. URL Validation & Protocol Scheme Enforcement
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Protocol Scheme Enforcement', () => {
    it('accepts valid https and http URLs', () => {
      const validUrls = [
        'https://api.github.com/zen',
        'http://example.com:8080/path',
        'HTTPS://API.ENTERPRISE.COM/v1',
        'http://localhost:3000/api',
      ]

      for (const u of validUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(true)
        expect(res.parsedUrl).toBeDefined()
        expect(res.error).toBeUndefined()
      }
    })

    it('rejects file:// protocol with descriptive security error', () => {
      const res = validateRequestTarget('file:///C:/Windows/System32/drivers/etc/hosts')
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/Protocol 'file:' is (forbidden|rejected)/i)
      expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
    })

    it('rejects javascript: scheme preventing DOM/renderer injection', () => {
      const res = validateRequestTarget('javascript:alert(document.cookie)')
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/Protocol 'javascript:' is (dangerous|rejected)/i)
      expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
    })

    it('rejects data: and blob: URIs', () => {
      expect(validateRequestTarget('data:text/html,<script>alert(1)</script>').valid).toBe(false)
      expect(validateRequestTarget('blob:http://example.com/uuid-string').valid).toBe(false)
    })

    it('rejects other unpermitted protocols (ftp, gopher, ws, wss, php, ldap)', () => {
      const forbidden = [
        'ftp://ftp.example.com/file.txt',
        'gopher://gopher.floodgap.com',
        'ws://echo.websocket.org',
        'wss://secure.websocket.org',
        'php://filter/read=convert.base64-encode/resource=index.php',
        'ldap://ldap.example.com/dc=example',
      ]

      for (const u of forbidden) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
      }
    })

    it('rejects empty, non-string, or malformed URLs', () => {
      expect(validateRequestTarget('').valid).toBe(false)
      expect(validateRequestTarget('   ').valid).toBe(false)
      expect(validateRequestTarget('not_a_valid_url').valid).toBe(false)
      expect(validateRequestTarget(null as any).valid).toBe(false)
    })

    it('assertSafeRequestTarget throws SecurityValidationError on forbidden schemes', () => {
      expect(() => assertSafeRequestTarget('file:///etc/shadow')).toThrow(SecurityValidationError)
      expect(() => assertSafeRequestTarget('http://169.254.169.254/latest')).toThrow(SecurityValidationError)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SSRF Protection & Cloud Metadata Endpoint Blocking
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. SSRF Defense & Cloud Metadata Endpoint Blocking', () => {
    it('strictly blocks AWS/GCP/Azure link-local metadata IP 169.254.169.254', () => {
      const metadataUrls = [
        'http://169.254.169.254/latest/meta-data/',
        'https://169.254.169.254/computeMetadata/v1/',
        'http://169.254.169.254:8080/metadata',
      ]

      for (const u of metadataUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
        expect(res.error).toContain('cloud metadata host')
      }
    })

    it('blocks Google Cloud internal metadata hostnames', () => {
      const res = validateRequestTarget('http://metadata.google.internal/computeMetadata/v1/')
      expect(res.valid).toBe(false)
      expect(res.errorCode).toBe('SSRF_BLOCKED')
      expect(res.error).toContain('metadata.google.internal')
    })

    it('blocks entire IPv4 link-local address range 169.254.0.0/16', () => {
      const linkLocalIps = [
        'http://169.254.0.1/status',
        'http://169.254.100.50/',
        'http://169.254.255.254/',
      ]

      for (const u of linkLocalIps) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }
    })

    it('detects and blocks hex and decimal alternative encodings for 169.254.169.254', () => {
      // Hex: 0xa9fea9fe
      expect(validateRequestTarget('http://0xa9fea9fe/latest/meta-data').valid).toBe(false)
      // Decimal: 2852039166
      expect(validateRequestTarget('http://2852039166/latest/meta-data').valid).toBe(false)
      // Dotted hex
      expect(validateRequestTarget('http://0xa9.0xfe.0xa9.0xfe/latest').valid).toBe(false)
      // IPv4-mapped IPv6
      expect(validateRequestTarget('http://[::ffff:169.254.169.254]/latest').valid).toBe(false)
    })

    it('blocks local/private network ranges when allowLocal / allowPrivateNetwork is false', () => {
      const privateUrls = [
        'http://localhost:8080/api',
        'http://127.0.0.1:5000/keys',
        'http://192.168.1.1/admin',
        'http://10.0.0.5/secrets',
        'http://172.16.10.20/db',
      ]

      for (const u of privateUrls) {
        const res = validateRequestTarget(u, { allowLocal: false })
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_PRIVATE_NETWORK_BLOCKED')
      }
    })

    it('allows localhost and local ranges when allowLocal is true (default dev mode)', () => {
      const res = validateRequestTarget('http://localhost:3000/api', { allowLocal: true })
      expect(res.valid).toBe(true)

      const lanRes = validateRequestTarget('http://192.168.1.50:8080', { allowLocal: true })
      expect(lanRes.valid).toBe(true)
    })

    it('continues to block metadata endpoints even when allowLocal is explicitly true', () => {
      const res = validateRequestTarget('http://169.254.169.254/latest', { allowLocal: true })
      expect(res.valid).toBe(false)
      expect(res.errorCode).toBe('SSRF_BLOCKED')
    })

    it('exposes helper functions isCloudMetadataHost and isPrivateNetworkHost', () => {
      expect(isCloudMetadataHost('169.254.169.254')).toBe(true)
      expect(isCloudMetadataHost('metadata.google.internal')).toBe(true)
      expect(isCloudMetadataHost('api.github.com')).toBe(false)

      expect(isPrivateNetworkHost('localhost')).toBe(true)
      expect(isPrivateNetworkHost('127.0.0.1')).toBe(true)
      expect(isPrivateNetworkHost('192.168.1.100')).toBe(true)
      expect(isPrivateNetworkHost('8.8.8.8')).toBe(false)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Header Sanitization & CRLF Injection Prevention
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Header Sanitization & CRLF Injection Defense', () => {
    it('accepts clean, standard HTTP headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123',
        'X-Request-Id': 'req-987-abc',
      }

      const res = validateAndSanitizeHeaders(headers)
      expect(res.valid).toBe(true)
      expect(res.sanitizedHeaders).toEqual(headers)
    })

    it('rejects header values with CRLF in strict mode and sanitizes in default mode', () => {
      const injectedValue = {
        'Content-Type': 'application/json\r\nSet-Cookie: session=evil',
      }

      // Strict mode rejects immediately
      const strictRes = validateAndSanitizeHeaders(injectedValue, { strict: true })
      expect(strictRes.valid).toBe(false)
      expect(strictRes.error).toMatch(/CRLF/i)

      // Default mode sanitizes CRLF characters
      const defaultRes = validateAndSanitizeHeaders(injectedValue)
      expect(defaultRes.valid).toBe(true)
      expect(defaultRes.sanitizedHeaders['Content-Type']).toBe('application/jsonSet-Cookie: session=evil')
    })

    it('rejects header keys containing CRLF or control characters', () => {
      const injectedKey = {
        'X-Forwarded-Host\r\nX-Injected: true': 'localhost',
      }

      const res = validateAndSanitizeHeaders(injectedKey)
      expect(res.valid).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('rejects invalid header keys with illegal RFC 7230 characters', () => {
      const badHeaders = {
        'Header With Spaces': 'value',
        'Header:WithColon': 'value',
        'Header/WithSlash': 'value',
      }

      for (const [key, val] of Object.entries(badHeaders)) {
        const res = validateAndSanitizeHeaders({ [key]: val })
        expect(res.valid).toBe(false)
        expect(res.error).toContain('RFC 7230 token characters')
      }
    })

    it('trims extraneous surrounding whitespace from header names and values', () => {
      const untrimmed = {
        '  Authorization  ': '  Bearer token  ',
      }
      const res = validateAndSanitizeHeaders(untrimmed)
      expect(res.valid).toBe(true)
      expect(res.sanitizedHeaders).toEqual({
        Authorization: 'Bearer token',
      })
    })

    it('validates headers using validateHeaders convenience helper', () => {
      expect(validateHeaders({ 'Content-Type': 'application/json' }).isValid).toBe(true)
      expect(validateHeaders({ 'Bad\r\nHeader': 'value' }).isValid).toBe(false)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Port & Hostname Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Port & Hostname Validation', () => {
    it('accepts valid integer ports between 1 and 65535', () => {
      const validPorts = [1, 80, 443, 3000, 8080, 65535]
      for (const p of validPorts) {
        const res = validatePort(p)
        expect(res.valid).toBe(true)
        expect(res.port).toBe(p)
      }
    })

    it('accepts valid port numbers passed as numeric strings', () => {
      const res80 = validatePort('80')
      expect(res80.valid).toBe(true)
      expect(res80.port).toBe(80)

      const res443 = validatePort('  443  ')
      expect(res443.valid).toBe(true)
      expect(res443.port).toBe(443)

      const res65535 = validatePort('65535')
      expect(res65535.valid).toBe(true)
      expect(res65535.port).toBe(65535)
    })

    it('rejects port 0 and negative port numbers', () => {
      expect(validatePort(0).valid).toBe(false)
      expect(validatePort(-1).valid).toBe(false)
      expect(validatePort('-80').valid).toBe(false)
    })

    it('rejects ports exceeding 65535 boundary', () => {
      expect(validatePort(65536).valid).toBe(false)
      expect(validatePort(99999).valid).toBe(false)
    })

    it('rejects floating-point decimals and non-numeric characters', () => {
      expect(validatePort(80.5).valid).toBe(false)
      expect(validatePort('80abc').valid).toBe(false)
      expect(validatePort('http').valid).toBe(false)
      expect(validatePort(NaN).valid).toBe(false)
      expect(validatePort(Infinity).valid).toBe(false)
      expect(validatePort(null).valid).toBe(false)
      expect(validatePort('').valid).toBe(false)
    })

    it('validates hostnames preventing command injection metacharacters', () => {
      expect(validateHostname('api.example.com').valid).toBe(true)
      expect(validateHostname('127.0.0.1').valid).toBe(true)
      expect(validateHostname('example.com; rm -rf /').valid).toBe(false)
      expect(validateHostname('example.com | cat /etc/passwd').valid).toBe(false)
      expect(validateHostname('--help').valid).toBe(true) // leading hyphens stripped
    })
  })
})
