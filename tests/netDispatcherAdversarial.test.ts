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

/**
 * @file netDispatcherAdversarial.test.ts
 * @description Empirical Challenger 2 Adversarial Stress-Test Suite for netDispatcherSecurity.ts
 * and Electron IPC Network Handlers.
 *
 * Tests comprehensive attack vectors across 6 domains:
 * 1. SSRF bypass vectors (decimal, hex, octal, mapped IPv6, userinfo, trailing dots, metadata aliases, mixed-case).
 * 2. Protocol bypass vectors (file:, javascript:, data:, gopher:, ftp:, ws:, etc.).
 * 3. CRLF injection vectors in HTTP headers (keys, values, strict vs default mode, tab preservation).
 * 4. Port boundary violations (0, -1, 65536, 100000, non-numeric, NaN, floats, sign checks).
 * 5. Hostname injection vectors (shell metacharacters, semicolons, pipes, argument injection, bare hyphens).
 * 6. IPC handler end-to-end integration defense verification.
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
  assertValidPort,
  assertValidHostname,
  SecurityValidationError,
  NetDispatcherSecurity,
} from '../src/main/ipc/netDispatcherSecurity'

import {
  dispatchOutboundRequest,
  executeDnsLookup,
  executeTcpPing,
  executeSslCheck,
} from '../src/main/ipc/netDispatcher'

describe('Adversarial Security Stress Test Suite ? netDispatcherSecurity.ts', () => {
  // =========================================================================
  // 1. SSRF BYPASS VECTORS & METADATA PROTECTION
  // =========================================================================
  describe('1. SSRF Bypass Vectors', () => {
    it('blocks 32-bit decimal integer IP encoding for 169.254.169.254 (2852039166)', () => {
      const decimalUrls = [
        'http://2852039166',
        'http://2852039166/',
        'http://2852039166/latest/meta-data',
        'http://2852039166:8080/computeMetadata/v1',
        'https://2852039166/api',
      ]

      for (const u of decimalUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
        expect(res.error).toMatch(/cloud metadata host/i)
      }

      expect(isCloudMetadataHost('2852039166')).toBe(true)
    })

    it('blocks hex IP notation for 169.254.169.254 (0xa9fea9fe)', () => {
      const hexUrls = [
        'http://0xa9fea9fe',
        'http://0xa9fea9fe/',
        'http://0xa9fea9fe/latest/meta-data',
        'http://0xA9FEA9FE/computeMetadata',
        'http://0xa9.0xfe.0xa9.0xfe/',
        'http://0xa9.0xfe.0xa9.0xfe:8080/path',
      ]

      for (const u of hexUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }

      expect(isCloudMetadataHost('0xa9fea9fe')).toBe(true)
      expect(isCloudMetadataHost('0xA9FEA9FE')).toBe(true)
      expect(isCloudMetadataHost('0xa9.0xfe.0xa9.0xfe')).toBe(true)
    })

    it('blocks dotted octal notation for 169.254.169.254 (0251.0376.0251.0376)', () => {
      const octalUrls = [
        'http://0251.0376.0251.0376',
        'http://0251.0376.0251.0376/',
        'http://0251.0376.0251.0376/latest/meta-data',
        'http://0251.0376.0251.0376:80/',
      ]

      for (const u of octalUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }

      expect(isCloudMetadataHost('0251.0376.0251.0376')).toBe(true)
    })

    it('blocks IPv4-mapped IPv6 addresses targeting link-local metadata space', () => {
      const mappedIpv6Urls = [
        'http://[::ffff:169.254.169.254]',
        'http://[::ffff:169.254.169.254]/latest/meta-data',
        'http://[::ffff:169.254.169.254]:80/',
        'http://[0:0:0:0:0:ffff:169.254.169.254]/latest',
        'http://[::ffff:a9fe:a9fe]/',
      ]

      for (const u of mappedIpv6Urls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }

      expect(isCloudMetadataHost('[::ffff:169.254.169.254]')).toBe(true)
      expect(isCloudMetadataHost('::ffff:169.254.169.254')).toBe(true)
      expect(isCloudMetadataHost('::ffff:a9fe:a9fe')).toBe(true)
    })

    it('blocks userinfo authentication tricks concealing metadata IP destinations', () => {
      const userinfoUrls = [
        'http://admin@169.254.169.254',
        'http://admin@169.254.169.254/',
        'http://admin:secret@169.254.169.254/latest/meta-data',
        'http://user%40example.com@169.254.169.254/',
        'http://root:pass@2852039166/',
        'http://admin@0xa9fea9fe/',
      ]

      for (const u of userinfoUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }
    })

    it('blocks trailing dot FQDN representations of metadata endpoints', () => {
      const trailingDotUrls = [
        'http://169.254.169.254.',
        'http://169.254.169.254./latest',
        'http://metadata.google.internal.',
        'http://metadata.google.internal./computeMetadata/v1/',
        'http://metadata.goog.',
      ]

      for (const u of trailingDotUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }

      expect(isCloudMetadataHost('169.254.169.254.')).toBe(true)
      expect(isCloudMetadataHost('metadata.google.internal.')).toBe(true)
    })

    it('blocks all recognized cloud metadata hostnames, aliases, and Kubernetes in-cluster endpoints', () => {
      const cloudTargets = [
        'http://metadata.google.internal',
        'http://metadata.google.internal/computeMetadata/v1/',
        'http://worker-1.metadata.google.internal/v1',
        'http://metadata.goog',
        'http://instance-data',
        'http://instance-data.ec2.internal',
        'http://100.100.100.200/latest/meta-data',
        'http://168.63.129.16/metadata/instance',
        'http://[fd00:ec2::254]/latest/meta-data',
        'http://kubernetes.default',
        'http://kubernetes.default.svc',
        'http://kubernetes.default.svc.cluster.local',
      ]

      for (const u of cloudTargets) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }
    })

    it('blocks mixed-case scheme and metadata domain variations', () => {
      const mixedCaseUrls = [
        'HTTP://169.254.169.254/',
        'Http://METADATA.GOOGLE.INTERNAL/computeMetadata/v1',
        'HtTpS://Metadata.Goog/v1',
        'HTTP://0xA9feA9fE/',
      ]

      for (const u of mixedCaseUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_BLOCKED')
      }
    })

    it('enforces private network blocking when allowLocal / allowPrivateNetwork is false', () => {
      const privateTargets = [
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://127.127.127.127',
        'http://[::1]',
        'http://0.0.0.0:8000',
        'http://10.0.0.1',
        'http://10.255.255.255',
        'http://172.16.0.1',
        'http://172.31.255.255',
        'http://192.168.0.1',
        'http://192.168.100.50',
        'http://[fd12:3456:789a:1::1]', // IPv6 ULA
      ]

      for (const u of privateTargets) {
        const res = validateRequestTarget(u, { allowLocal: false })
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('SSRF_PRIVATE_NETWORK_BLOCKED')
      }
    })

    it('blocks administrator-configured custom blocked hosts', () => {
      const res = validateRequestTarget('https://evil-analytics.com/log', {
        blockedHosts: ['evil-analytics.com', 'tracking.ad'],
      })
      expect(res.valid).toBe(false)
      expect(res.errorCode).toBe('POLICY_BLOCKED')
      expect(res.error).toContain('blocked by administrator policy')
    })

    it('assertSafeRequestTarget throws SecurityValidationError for blocked SSRF targets', () => {
      expect(() => assertSafeRequestTarget('http://2852039166')).toThrow(SecurityValidationError)
      expect(() => assertSafeRequestTarget('http://metadata.google.internal')).toThrow(SecurityValidationError)
      expect(() => assertSafeRequestTarget('http://[::ffff:169.254.169.254]')).toThrow(SecurityValidationError)
    })
  })

  // =========================================================================
  // 2. PROTOCOL BYPASS VECTORS
  // =========================================================================
  describe('2. Protocol Bypass Vectors', () => {
    it('strictly rejects file:/// URI scheme preventing local file exfiltration', () => {
      const fileTargets = [
        'file:///etc/passwd',
        'file:///C:/Windows/System32/drivers/etc/hosts',
        'file://localhost/etc/shadow',
        'file:///proc/self/environ',
        'FILE:///etc/issue',
      ]

      for (const u of fileTargets) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
        expect(res.error).toMatch(/Protocol 'file:' is (forbidden|rejected)/i)
      }
    })

    it('strictly rejects javascript: URI scheme preventing script execution', () => {
      const jsTargets = [
        'javascript:alert(1)',
        'javascript:alert(document.domain)',
        'javascript:void(0)',
        'javascript:fetch("https://attacker.com")',
        'JAVASCRIPT:console.log(1)',
      ]

      for (const u of jsTargets) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
        expect(res.error).toMatch(/Protocol 'javascript:' is/i)
      }
    })

    it('strictly rejects data: and blob: URI schemes', () => {
      const dataTargets = [
        'data:text/html,<script>alert(1)</script>',
        'data:application/json,{"compromised":true}',
        'data:text/plain;base64,SGVsbG8gV29ybGQ=',
        'blob:http://localhost:3000/some-guid',
      ]

      for (const u of dataTargets) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
      }
    })

    it('strictly rejects gopher, ftp, sftp, ws, wss, php, ldap, dict, jar schemes', () => {
      const dangerousSchemes = [
        'gopher://127.0.0.1:6379/_INFO',
        'ftp://user:pass@ftp.example.com/test.txt',
        'sftp://user:pass@sftp.example.com/test.txt',
        'ws://attacker.com/socket',
        'wss://attacker.com/socket',
        'php://filter/read=convert.base64-encode/resource=index.php',
        'ldap://127.0.0.1:389/cn=admin',
        'ldaps://127.0.0.1:636/cn=admin',
        'dict://127.0.0.1:11211/stat',
        'jar:file:///path/to/archive.jar!/entry',
        'view-source:http://example.com',
      ]

      for (const u of dangerousSchemes) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('FORBIDDEN_PROTOCOL')
      }
    })

    it('rejects raw control characters or null bytes in target URLs', () => {
      const poisonedUrls = [
        'http://example.com\x00/admin',
        'http://example.com\r\n/admin',
        'http\x00://example.com',
        'http://example.com\x1F/path',
      ]

      for (const u of poisonedUrls) {
        const res = validateRequestTarget(u)
        expect(res.valid).toBe(false)
        expect(res.errorCode).toBe('INVALID_CHARACTERS')
      }
    })
  })

  // =========================================================================
  // 3. CRLF INJECTION DEFENSE IN REQUEST HEADERS
  // =========================================================================
  describe('3. CRLF Header Injection Defense', () => {
    it('rejects CRLF in header values under strict mode', () => {
      const attacks = [
        { key: 'Set-Cookie', value: 'compromised=1\r\nInjected-Header: true' },
        { key: 'X-Forwarded-For', value: '127.0.0.1\nSet-Cookie: session=hijacked' },
        { key: 'Content-Type', value: 'application/json\r\n\r\n<script>alert(1)</script>' },
        { key: 'Authorization', value: 'Bearer token\rInjected: carriage-return' },
        { key: 'X-Custom', value: 'valid\u2028Injected: unicode-line-sep' },
        { key: 'X-Custom-2', value: 'valid\u2029Injected: unicode-para-sep' },
        { key: 'X-Null', value: 'valid\0Injected: null-byte' },
      ]

      for (const { key, value } of attacks) {
        const res = validateAndSanitizeHeaders({ [key]: value }, { strict: true })
        expect(res.valid).toBe(false)
        expect(res.error).toMatch(/CRLF/i)
      }
    })

    it('sanitizes and strips CRLF in default mode, neutralizing the injection', () => {
      const rawHeaders = {
        'X-Test-1': 'safe\r\nInjected: true',
        'X-Test-2': 'safe\nInjected: second',
        'X-Test-3': 'safe\0nullbyte',
      }

      const res = validateAndSanitizeHeaders(rawHeaders, { strict: false })
      expect(res.valid).toBe(true)
      expect(res.sanitizedHeaders['X-Test-1']).toBe('safeInjected: true')
      expect(res.sanitizedHeaders['X-Test-2']).toBe('safeInjected: second')
      expect(res.sanitizedHeaders['X-Test-3']).toBe('safenullbyte')
      expect(res.sanitizedHeaders['X-Test-1']).not.toMatch(/[\r\n\0]/)
    })

    it('preserves valid horizontal tabs in header values per RFC 7230', () => {
      const headersWithTabs = {
        'User-Agent': 'NexusHub\tClient/1.0',
      }
      const res = validateAndSanitizeHeaders(headersWithTabs)
      expect(res.valid).toBe(true)
      expect(res.sanitizedHeaders['User-Agent']).toBe('NexusHub\tClient/1.0')
    })

    it('strictly rejects CRLF characters within header field names', () => {
      const maliciousKeys = [
        { 'Header\r\nInjected': 'value' },
        { 'Header\nInjected': 'value' },
        { 'Header\rInjected': 'value' },
        { 'Header\0Injected': 'value' },
      ]

      for (const h of maliciousKeys) {
        const res = validateAndSanitizeHeaders(h)
        expect(res.valid).toBe(false)
        expect(res.error).toMatch(/Header injection attempt detected/i)
      }
    })

    it('strictly enforces RFC 7230 token characters for header names', () => {
      const badKeys = [
        { 'Header With Spaces': 'val' },
        { 'Header:WithColon': 'val' },
        { 'Header/Slash': 'val' },
        { 'Header[Bracket]': 'val' },
        { 'Header{Brace}': 'val' },
        { 'Header@At': 'val' },
        { 'Header=Equals': 'val' },
        { 'Header?Question': 'val' },
        { 'Header"Quote"': 'val' },
      ]

      for (const h of badKeys) {
        const res = validateAndSanitizeHeaders(h)
        expect(res.valid).toBe(false)
        expect(res.error).toContain('RFC 7230 token characters')
      }
    })

    it('validateHeaders helper flags CRLF violations in headers', () => {
      expect(validateHeaders({ 'X-Valid': 'ok' }).isValid).toBe(true)
      expect(validateHeaders({ 'X-Attack': 'val\r\nSet-Cookie: evil=1' }).isValid).toBe(false)
      expect(validateHeaders({ 'X-Attack\r\nName': 'val' }).isValid).toBe(false)
    })
  })

  // =========================================================================
  // 4. PORT BOUNDARY VALIDATION
  // =========================================================================
  describe('4. Port Boundary Validation', () => {
    it('accepts legal boundary integer ports: 1 and 65535', () => {
      expect(validatePort(1).valid).toBe(true)
      expect(validatePort(1).port).toBe(1)
      expect(validatePort(65535).valid).toBe(true)
      expect(validatePort(65535).port).toBe(65535)
      expect(validatePort('1').valid).toBe(true)
      expect(validatePort('65535').valid).toBe(true)
      expect(validatePort('0080').valid).toBe(true)
      expect(validatePort('0080').port).toBe(80)
    })

    it('rejects port 0 and negative values', () => {
      expect(validatePort(0).valid).toBe(false)
      expect(validatePort(-1).valid).toBe(false)
      expect(validatePort(-80).valid).toBe(false)
      expect(validatePort(-65535).valid).toBe(false)
      expect(validatePort('-1').valid).toBe(false)
      expect(validatePort('0').valid).toBe(false)
    })

    it('rejects out-of-range ports: 65536, 100000, and larger integers', () => {
      expect(validatePort(65536).valid).toBe(false)
      expect(validatePort(70000).valid).toBe(false)
      expect(validatePort(100000).valid).toBe(false)
      expect(validatePort(99999999).valid).toBe(false)
      expect(validatePort('65536').valid).toBe(false)
      expect(validatePort('100000').valid).toBe(false)
    })

    it('rejects non-numeric strings, special numeric states (NaN, Infinity), and floats', () => {
      expect(validatePort('abc').valid).toBe(false)
      expect(validatePort('port80').valid).toBe(false)
      expect(validatePort('80-test').valid).toBe(false)
      expect(validatePort('+80').valid).toBe(false)
      expect(validatePort('80\0').valid).toBe(false)
      expect(validatePort(NaN).valid).toBe(false)
      expect(validatePort(Infinity).valid).toBe(false)
      expect(validatePort(-Infinity).valid).toBe(false)
      expect(validatePort(80.5).valid).toBe(false)
      expect(validatePort(3000.1).valid).toBe(false)
      expect(validatePort(0.99).valid).toBe(false)
      expect(validatePort('80.5').valid).toBe(false)
      expect(validatePort(null).valid).toBe(false)
      expect(validatePort(undefined).valid).toBe(false)
      expect(validatePort('').valid).toBe(false)
      expect(validatePort({} as any).valid).toBe(false)
    })

    it('assertValidPort throws SecurityValidationError on invalid ports', () => {
      expect(() => assertValidPort(0)).toThrow(SecurityValidationError)
      expect(() => assertValidPort(65536)).toThrow(SecurityValidationError)
      expect(() => assertValidPort(80.5)).toThrow(SecurityValidationError)
      expect(() => assertValidPort('invalid')).toThrow(SecurityValidationError)
    })
  })

  // =========================================================================
  // 5. HOSTNAME INJECTION DEFENSE
  // =========================================================================
  describe('5. Hostname Injection Defense', () => {
    it('rejects shell command injection metacharacters in hostnames', () => {
      const maliciousHostnames = [
        'localhost; rm -rf /',
        'localhost;rm -rf /',
        'foo|bar',
        'foo||bar',
        'foo&bar',
        'foo&&bar',
        'foo`id`',
        'foo$(whoami)',
        'foo>out.txt',
        'foo<in.txt',
        'foo\rbar',
        'foo\nbar',
        'foo\tbar',
        'foo"bar',
        "foo'bar",
      ]

      for (const h of maliciousHostnames) {
        const res = validateHostname(h)
        expect(res.valid).toBe(false)
        expect(res.error).toBeDefined()
      }
    })

    it('rejects hostnames containing internal whitespace or control characters', () => {
      expect(validateHostname('api .example.com').valid).toBe(false)
      expect(validateHostname('api\texample.com').valid).toBe(false)
      expect(validateHostname('api\nexample.com').valid).toBe(false)
    })

    it('neutralizes command argument injection (leading hyphens)', () => {
      const res = validateHostname('--help.example.com')
      expect(res.valid).toBe(true)
      expect(res.sanitizedHost).toBe('help.example.com')
      expect(res.sanitizedHost?.startsWith('-')).toBe(false)
    })

    it('rejects bare hyphens or strings consisting solely of hyphens', () => {
      expect(validateHostname('-').valid).toBe(false)
      expect(validateHostname('--').valid).toBe(false)
      expect(validateHostname('---').valid).toBe(false)
    })

    it('rejects hostnames exceeding RFC 1035 max length (253 chars)', () => {
      const oversizedHost = 'a'.repeat(254) + '.com'
      const res = validateHostname(oversizedHost)
      expect(res.valid).toBe(false)
      expect(res.error).toContain('maximum permitted length')
    })

    it('assertValidHostname throws SecurityValidationError on attack hostnames', () => {
      expect(() => assertValidHostname('localhost; rm -rf /')).toThrow(SecurityValidationError)
      expect(() => assertValidHostname('foo|bar')).toThrow(SecurityValidationError)
    })
  })

  // =========================================================================
  // 6. IPC HANDLERS END-TO-END SECURITY DEFENSE
  // =========================================================================
  describe('6. IPC Network Handlers End-to-End Defense', () => {
    it('dispatchOutboundRequest rejects decimal IP metadata target with Security Error', async () => {
      const result = await dispatchOutboundRequest({
        url: 'http://2852039166/latest/meta-data',
        method: 'GET',
      })

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Security Error')
      expect(result.error).toMatch(/cloud metadata host/i)
      expect(result.sizeBytes).toBe(0)
    })

    it('dispatchOutboundRequest rejects file:// URLs with Security Error', async () => {
      const result = await dispatchOutboundRequest({
        url: 'file:///etc/passwd',
        method: 'GET',
      })

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Security Error')
      expect(result.error).toMatch(/Protocol 'file:' is forbidden/i)
    })

    it('dispatchOutboundRequest rejects CRLF injected headers with Header Security Error', async () => {
      const result = await dispatchOutboundRequest({
        url: 'https://httpbin.org/get',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer abc\r\nSet-Cookie: stolen=1',
        },
      })

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Header Security Error')
      expect(result.error).toMatch(/CRLF/i)
    })

    it('executeDnsLookup rejects command injection hostname', async () => {
      const result = await executeDnsLookup('example.com; rm -rf /')
      expect(result.records).toHaveLength(0)
      expect(result.error).toBeDefined()
    })

    it('executeTcpPing rejects out-of-range port and dangerous hostname', async () => {
      const badPortResult = await executeTcpPing('example.com', 65536)
      expect(badPortResult.open).toBe(false)
      expect(badPortResult.error).toContain('Port must be a valid integer between 1 and 65535')

      const badHostResult = await executeTcpPing('example.com; rm -rf /', 80)
      expect(badHostResult.open).toBe(false)
      expect(badHostResult.error).toBeDefined()
    })

    it('executeSslCheck rejects invalid port and dangerous hostname', async () => {
      const badPortResult = await executeSslCheck('example.com', -1)
      expect(badPortResult.valid).toBe(false)
      expect(badPortResult.error).toContain('Port must be a valid integer between 1 and 65535')

      const badHostResult = await executeSslCheck('foo|bar', 443)
      expect(badHostResult.valid).toBe(false)
      expect(badHostResult.error).toBeDefined()
    })

    it('NetDispatcherSecurity class wrapper correctly enforces configured security policies', () => {
      const sec = new NetDispatcherSecurity({ allowCloudMetadata: false, allowLocal: false })

      expect(sec.validateRequestTarget('http://169.254.169.254').valid).toBe(false)
      expect(sec.validateRequestTarget('http://localhost:3000').valid).toBe(false)
      expect(sec.validatePort(70000).valid).toBe(false)
      expect(sec.sanitizeHeaders({ 'X-Test': 'value\r\nInjected' }).sanitizedHeaders['X-Test']).toBe('valueInjected')
      expect(sec.validateHostname('host;ls').valid).toBe(false)
    })
  })
})
