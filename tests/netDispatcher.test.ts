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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as http from 'node:http'
import * as net from 'node:net'
import {
  dispatchOutboundRequest,
  performDnsLookup,
  performTcpPing,
  performSslCheck,
  registerNetDispatcherHandlers,
  RequestOptions,
} from '../src/main/ipc/netDispatcher'
import {
  validateRequestTarget,
  sanitizeHeaders,
  validatePort,
  validateHostname,
} from '../src/main/ipc/netDispatcherSecurity'

// ── In-Memory Electron IPC Registry Mock ────────────────────────────────────
const { ipcHandlers, mockIpcMain } = vi.hoisted(() => {
  const handlers = new Map<string, Function>()
  return {
    ipcHandlers: handlers,
    mockIpcMain: {
      handle: (channel: string, listener: Function) => {
        handlers.set(channel, listener)
      },
      removeHandler: (channel: string) => {
        handlers.delete(channel)
      },
    },
  }
})

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}))

describe('Net Dispatcher & Security Verification Suite (tests/netDispatcher.test.ts)', () => {
  let server: http.Server
  let serverPort: number
  let serverUrl: string

  beforeEach(async () => {
    ipcHandlers.clear()
    vi.clearAllMocks()

    // Start a real in-process HTTP test server for genuine integration testing
    await new Promise<void>((resolve) => {
      server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`)

        if (parsedUrl.pathname === '/echo') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Custom-Echo': 'NexusHub-Dispatcher',
            })
            res.end(
              JSON.stringify({
                method: req.method,
                receivedHeaders: req.headers,
                receivedBody: body,
              })
            )
          })
          return
        }

        if (parsedUrl.pathname === '/status/418') {
          res.writeHead(418, { 'Content-Type': 'text/plain' })
          res.end("I'm a teapot")
          return
        }

        if (parsedUrl.pathname === '/slow') {
          // Delay response to test timeout handling
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Delayed response')
          }, 300)
          return
        }

        if (parsedUrl.pathname === '/redirect-target') {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('Arrived at target')
          return
        }

        if (parsedUrl.pathname === '/redirect') {
          res.writeHead(302, { Location: '/redirect-target' })
          res.end()
          return
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      })

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as net.AddressInfo
        serverPort = addr.port
        serverUrl = `http://127.0.0.1:${serverPort}`
        resolve()
      })
    })
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Security & Validation Controls (netDispatcherSecurity)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Security Guard & Validation Functions', () => {
    it('should reject invalid, empty, or dangerous protocol URLs', () => {
      expect(validateRequestTarget('').valid).toBe(false)
      expect(validateRequestTarget('file:///etc/shadow').valid).toBe(false)
      expect(validateRequestTarget('javascript:alert(1)').valid).toBe(false)
      expect(validateRequestTarget('data:text/html,<h1>attack</h1>').valid).toBe(false)
      expect(validateRequestTarget('ftp://ftp.example.com/file').valid).toBe(false)
      expect(validateRequestTarget('ws://localhost:8080').valid).toBe(false)
    })

    it('should allow valid http and https URLs', () => {
      const httpRes = validateRequestTarget('http://example.com/api')
      expect(httpRes.valid).toBe(true)
      expect(httpRes.parsedUrl?.protocol).toBe('http:')

      const httpsRes = validateRequestTarget('https://api.github.com/users')
      expect(httpsRes.valid).toBe(true)
      expect(httpsRes.parsedUrl?.protocol).toBe('https:')
    })

    it('should block SSRF requests targeting cloud metadata endpoints', () => {
      const awsMetadata = validateRequestTarget('http://169.254.169.254/latest/meta-data/')
      expect(awsMetadata.valid).toBe(false)
      expect(awsMetadata.error).toContain('SSRF Guard')

      const gcpMetadata = validateRequestTarget('http://metadata.google.internal/computeMetadata/v1/')
      expect(gcpMetadata.valid).toBe(false)
      expect(gcpMetadata.error).toContain('SSRF Guard')

      const linkLocal = validateRequestTarget('http://169.254.1.1/secret')
      expect(linkLocal.valid).toBe(false)
    })

    it('should detect and sanitize CRLF header injections', () => {
      const dirtyHeaders = {
        'X-Good': 'safe_value',
        'X-Injected\r\nSet-Cookie: evil=1': 'value',
      }
      const res = sanitizeHeaders(dirtyHeaders)
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/Header injection|Invalid header name/i)

      const dirtyValue = {
        'Authorization': 'Bearer token\r\nEvil-Header: 1',
      }
      const resVal = sanitizeHeaders(dirtyValue, { strict: true })
      expect(resVal.valid).toBe(false)
    })

    it('should pass clean headers through unchanged', () => {
      const clean = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token',
      }
      const res = sanitizeHeaders(clean)
      expect(res.valid).toBe(true)
      expect(res.sanitized).toEqual(clean)
    })

    it('should validate port boundaries (1 to 65535)', () => {
      expect(validatePort(80).valid).toBe(true)
      expect(validatePort(443).valid).toBe(true)
      expect(validatePort('8080').valid).toBe(true)
      expect(validatePort(0).valid).toBe(false)
      expect(validatePort(65536).valid).toBe(false)
      expect(validatePort(-1).valid).toBe(false)
      expect(validatePort('abc').valid).toBe(false)
    })

    it('should validate hostnames and reject dangerous injection strings', () => {
      expect(validateHostname('api.example.com').valid).toBe(true)
      expect(validateHostname('127.0.0.1').valid).toBe(true)
      expect(validateHostname('sub-domain_test.org').valid).toBe(true)
      expect(validateHostname('').valid).toBe(false)
      expect(validateHostname('host; rm -rf /').valid).toBe(false)
      expect(validateHostname('host`calc`').valid).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Outbound Request Dispatcher (net:dispatchRequest)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Outbound HTTP Request Dispatcher', () => {
    it('should perform genuine GET request and capture headers, timing, and payload size', async () => {
      const options: RequestOptions = {
        url: `${serverUrl}/echo`,
        method: 'GET',
        headers: { 'X-Test-Client': 'NexusHub-Test' },
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(200)
      expect(res.statusText).toBe('OK')
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
      expect(res.sizeBytes).toBeGreaterThan(0)
      expect(res.headers['x-custom-echo']).toBe('NexusHub-Dispatcher')

      const parsed = JSON.parse(res.data)
      expect(parsed.method).toBe('GET')
      expect(parsed.receivedHeaders['x-test-client']).toBe('NexusHub-Test')
    })

    it('should perform genuine POST request with JSON payload', async () => {
      const payload = JSON.stringify({ action: 'run_simulation', iterations: 50 })
      const options: RequestOptions = {
        url: `${serverUrl}/echo`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(200)
      const parsed = JSON.parse(res.data)
      expect(parsed.method).toBe('POST')
      expect(parsed.receivedBody).toBe(payload)
    })

    it('should capture custom status codes (418 Im a teapot)', async () => {
      const options: RequestOptions = {
        url: `${serverUrl}/status/418`,
        method: 'GET',
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(418)
      expect(res.data).toBe("I'm a teapot")
    })

    it('should handle request timeouts gracefully via AbortController', async () => {
      const options: RequestOptions = {
        url: `${serverUrl}/slow`,
        method: 'GET',
        timeoutMs: 50, // Server takes 300ms
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Timeout')
      expect(res.error).toContain('timed out after 50ms')
    })

    it('should block SSRF requests before network dispatch', async () => {
      const options: RequestOptions = {
        url: 'http://169.254.169.254/latest/meta-data',
        method: 'GET',
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(0)
      expect(res.statusText).toMatch(/Security/i)
      expect(res.error).toContain('SSRF Guard')
    })

    it('should follow redirects by default', async () => {
      const options: RequestOptions = {
        url: `${serverUrl}/redirect`,
        method: 'GET',
        followRedirects: true,
      }

      const res = await dispatchOutboundRequest(options)
      expect(res.status).toBe(200)
      expect(res.data).toBe('Arrived at target')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Network Diagnostics (DNS, TCP Ping, SSL Check)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Network Diagnostics Core', () => {
    it('should perform DNS resolution and return structured records', async () => {
      const res = await performDnsLookup('localhost')
      expect(res.host).toBe('localhost')
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(res.records)).toBe(true)
      // Localhost resolves to 127.0.0.1 or ::1
      const aOrAaaa = res.records.some((r) => r.type === 'A' || r.type === 'AAAA')
      expect(aOrAaaa).toBe(true)
    })

    it('should reject invalid hostname for DNS lookup', async () => {
      const res = await performDnsLookup('invalid;host')
      expect(res.records).toEqual([])
      expect(res.error).toMatch(/hostname|dangerous|shell/i)
    })

    it('should perform real TCP ping to open port and report open status and latency', async () => {
      const res = await performTcpPing('127.0.0.1', serverPort, 2000)
      expect(res.host).toBe('127.0.0.1')
      expect(res.port).toBe(serverPort)
      expect(res.open).toBe(true)
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
    })

    it('should report open: false for an inaccessible or closed port', async () => {
      // Pick an arbitrary unused high port
      const res = await performTcpPing('127.0.0.1', 65530, 500)
      expect(res.open).toBe(false)
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
    })

    it('should reject invalid ports in TCP ping', async () => {
      const res = await performTcpPing('127.0.0.1', 999999, 1000)
      expect(res.open).toBe(false)
      expect(res.error).toContain('Invalid port')
    })

    it('should handle SSL check on non-SSL server gracefully', async () => {
      const res = await performSslCheck('127.0.0.1', serverPort, 500)
      expect(res.valid).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('should validate hostname and port in SSL check', async () => {
      const res = await performSslCheck('bad_host!$', 443)
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/hostname|dangerous|shell/i)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Electron IPC Channel Registration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. IPC Handler Registration on ipcMain', () => {
    it('should register all net:* IPC channels', () => {
      registerNetDispatcherHandlers()

      expect(ipcHandlers.has('net:dispatchRequest')).toBe(true)
      expect(ipcHandlers.has('net:dnsLookup')).toBe(true)
      expect(ipcHandlers.has('net:tcpPing')).toBe(true)
      expect(ipcHandlers.has('net:sslCheck')).toBe(true)
    })

    it('should invoke net:dispatchRequest via registered IPC handler', async () => {
      registerNetDispatcherHandlers()
      const handler = ipcHandlers.get('net:dispatchRequest')!

      const res = await handler(
        { sender: {} },
        {
          url: `${serverUrl}/echo`,
          method: 'GET',
        }
      )

      expect(res.status).toBe(200)
      expect(res.statusText).toBe('OK')
    })

    it('should invoke net:tcpPing via registered IPC handler with object args', async () => {
      registerNetDispatcherHandlers()
      const handler = ipcHandlers.get('net:tcpPing')!

      const res = await handler(
        { sender: {} },
        {
          host: '127.0.0.1',
          port: serverPort,
          timeoutMs: 1000,
        }
      )

      expect(res.open).toBe(true)
      expect(res.port).toBe(serverPort)
    })
  })
})
