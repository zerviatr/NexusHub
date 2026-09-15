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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// ── In-Memory Electron & Node Networking Mocks via vi.hoisted ────────────────
const {
  ipcHandlers,
  mockIpcMain,
  mockDnsResolve4,
  mockDnsResolve6,
  mockDnsResolveMx,
  mockDnsResolveTxt,
  mockNetSocketInstance,
  mockTlsConnect,
} = vi.hoisted(() => {
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
    mockDnsResolve4: vi.fn(),
    mockDnsResolve6: vi.fn(),
    mockDnsResolveMx: vi.fn(),
    mockDnsResolveTxt: vi.fn(),
    mockNetSocketInstance: {
      current: null as any,
    },
    mockTlsConnect: vi.fn(),
  }
})

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}))

vi.mock('node:dns/promises', () => ({
  resolve4: mockDnsResolve4,
  resolve6: mockDnsResolve6,
  resolveMx: mockDnsResolveMx,
  resolveTxt: mockDnsResolveTxt,
}))

vi.mock('node:net', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:net')>()
  return {
    ...actual,
    Socket: function () {
      return mockNetSocketInstance.current
    } as any,
  }
})

vi.mock('node:tls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:tls')>()
  return {
    ...actual,
    connect: (...args: any[]) => mockTlsConnect(...args),
  }
})

// Import netDispatcher modules after electron and network mocks are hoisted
import { registerNetDispatcherIPC } from '../src/main/ipc/netDispatcher'

// Helper to simulate calling ipcRenderer.invoke()
async function invokeNetIpc(channel: string, ...args: any[]): Promise<any> {
  const handler = ipcHandlers.get(channel)
  if (!handler) {
    throw new Error(`[IPC Error] No handler registered for channel '${channel}'`)
  }
  return handler({ sender: {} }, ...args)
}

describe('Network Dispatcher — Main Process IPC Handlers (tests/netDispatcherIPC.test.ts)', () => {
  beforeEach(() => {
    ipcHandlers.clear()
    vi.clearAllMocks()
    registerNetDispatcherIPC()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. IPC Handler Registration
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Channel Registration', () => {
    it('registers all 4 required net:* IPC channels on ipcMain', () => {
      expect(ipcHandlers.has('net:dispatchRequest')).toBe(true)
      expect(ipcHandlers.has('net:dnsLookup')).toBe(true)
      expect(ipcHandlers.has('net:tcpPing')).toBe(true)
      expect(ipcHandlers.has('net:sslCheck')).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. net:dispatchRequest (HTTP / HTTPS Dispatcher)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. net:dispatchRequest Handler', () => {
    it('dispatches a successful GET request via fetch and returns structured result', async () => {
      const mockResponseData = JSON.stringify({ message: 'Success', items: [1, 2, 3] })
      const mockHeaders = new Map<string, string>([
        ['content-type', 'application/json'],
        ['x-server', 'Nexus-Relay'],
      ])

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          status: 200,
          statusText: 'OK',
          headers: mockHeaders,
          text: async () => mockResponseData,
        } as any
      })

      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'https://api.example.com/items',
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(res.statusText).toBe('OK')
      expect(res.data).toBe(mockResponseData)
      expect(res.headers['content-type']).toBe('application/json')
      expect(res.headers['x-server']).toBe('Nexus-Relay')
      expect(res.sizeBytes).toBe(Buffer.byteLength(mockResponseData, 'utf8'))
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
      expect(res.error).toBeUndefined()
    })

    it('dispatches a POST request with payload and custom headers', async () => {
      let capturedInit: RequestInit | undefined

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        capturedInit = init
        return {
          status: 201,
          statusText: 'Created',
          headers: new Map([['content-type', 'application/json']]),
          text: async () => '{"id": 42}',
        } as any
      })

      const payload = '{"title": "Sprint 2"}'
      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'https://api.example.com/tickets',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })

      expect(res.status).toBe(201)
      expect(res.data).toBe('{"id": 42}')
      expect(capturedInit?.method).toBe('POST')
      expect(capturedInit?.body).toBe(payload)
    })

    it('catches and blocks SSRF cloud metadata attempts without throwing unhandled exceptions', async () => {
      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'http://169.254.169.254/latest/meta-data',
        method: 'GET',
      })

      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Security Error')
      expect(res.error).toMatch(/(cloud metadata|SSRF)/i)
    })

    it('catches and blocks dangerous file:// schemes before network invocation', async () => {
      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'file:///etc/passwd',
        method: 'GET',
      })

      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Security Error')
      expect(res.error).toMatch(/Protocol 'file:' is (forbidden|rejected)/i)
    })

    it('blocks CRLF header injection attempts and returns structured security error', async () => {
      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'X-Injected': 'test\r\nSet-Cookie: stolen=token',
        },
      })

      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Header Security Error')
      expect(res.error).toMatch(/CRLF/i)
    })

    it('handles network failure gracefully returning status 0 and descriptive error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.fake.xyz'))

      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'https://api.fake.xyz/test',
        method: 'GET',
      })

      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Network Error')
      expect(res.error).toContain('ENOTFOUND')
    })

    it('handles timeout abort signals cleanly', async () => {
      const abortErr = new Error('The operation was aborted')
      abortErr.name = 'AbortError'
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr)

      const res = await invokeNetIpc('net:dispatchRequest', {
        url: 'https://slow-api.example.com/hang',
        method: 'GET',
        timeoutMs: 100,
      })

      expect(res.status).toBe(0)
      expect(res.statusText).toBe('Timeout')
      expect(res.error).toContain('timed out after 100ms')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. net:dnsLookup (DNS Diagnostic Queries)
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. net:dnsLookup Handler', () => {
    it('returns empty records and error when host is missing', async () => {
      const res = await invokeNetIpc('net:dnsLookup', '')
      expect(res.error).toMatch(/Hostname.*(empty|required)/i)
      expect(res.records).toEqual([])
    })

    it('executes DNS queries returning aggregated record types', async () => {
      mockDnsResolve4.mockResolvedValue([{ address: '93.184.216.34', ttl: 300 }])
      mockDnsResolve6.mockResolvedValue([
        { address: '2606:2800:220:1:248:1893:25c8:1946', ttl: 300 },
      ])
      mockDnsResolveMx.mockResolvedValue([{ exchange: 'mail.example.com', priority: 10 }])
      mockDnsResolveTxt.mockResolvedValue([['v=spf1 -all']])

      const res = await invokeNetIpc('net:dnsLookup', 'example.com')

      expect(res.host).toBe('example.com')
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
      expect(res.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'A', address: '93.184.216.34' }),
          expect.objectContaining({ type: 'AAAA', address: '2606:2800:220:1:248:1893:25c8:1946' }),
          expect.objectContaining({ type: 'MX', value: 'mail.example.com', priority: 10 }),
          expect.objectContaining({ type: 'TXT', value: 'v=spf1 -all' }),
        ])
      )
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. net:tcpPing (TCP Latency Benchmark)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. net:tcpPing Handler', () => {
    it('rejects invalid port numbers with clear error', async () => {
      const res = await invokeNetIpc('net:tcpPing', 'example.com', 99999)
      expect(res.open).toBe(false)
      expect(res.error).toMatch(/between 1 and 65535/i)
    })

    it('connects to socket and measures round-trip latency when open', async () => {
      const mockSocket = new EventEmitter() as any
      mockSocket.setTimeout = vi.fn()
      mockSocket.destroy = vi.fn()
      mockSocket.connect = vi.fn(() => {
        setTimeout(() => mockSocket.emit('connect'), 5)
      })

      mockNetSocketInstance.current = mockSocket

      const res = await invokeNetIpc('net:tcpPing', '127.0.0.1', 8080, 2000)

      expect(res.host).toBe('127.0.0.1')
      expect(res.port).toBe(8080)
      expect(res.open).toBe(true)
      expect(res.timeMs).toBeGreaterThanOrEqual(0)
      expect(mockSocket.destroy).toHaveBeenCalled()
    })

    it('handles connection refused error gracefully', async () => {
      const mockSocket = new EventEmitter() as any
      mockSocket.setTimeout = vi.fn()
      mockSocket.destroy = vi.fn()
      mockSocket.connect = vi.fn(() => {
        setTimeout(() => mockSocket.emit('error', new Error('ECONNREFUSED 127.0.0.1:9090')), 5)
      })

      mockNetSocketInstance.current = mockSocket

      const res = await invokeNetIpc('net:tcpPing', '127.0.0.1', 9090, 2000)

      expect(res.open).toBe(false)
      expect(res.error).toContain('ECONNREFUSED')
      expect(mockSocket.destroy).toHaveBeenCalled()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. net:sslCheck (TLS / SSL Certificate Inspector)
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. net:sslCheck Handler', () => {
    it('rejects invalid ports for SSL check', async () => {
      const res = await invokeNetIpc('net:sslCheck', 'example.com', -1)
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/between 1 and 65535/i)
    })

    it('extracts peer certificate metadata and validity over TLS', async () => {
      const mockSocket = new EventEmitter() as any
      mockSocket.destroy = vi.fn()
      mockSocket.authorized = true
      mockSocket.getPeerCertificate = vi.fn(() => ({
        issuer: { O: "Let's Encrypt", CN: 'R3' },
        subject: { CN: 'api.enterprise.com' },
        valid_from: 'Jan 1 00:00:00 2026 GMT',
        valid_to: 'Dec 31 23:59:59 2026 GMT',
        fingerprint256: 'AA:BB:CC:DD:EE:FF',
      }))
      mockSocket.getCipher = vi.fn(() => ({
        name: 'TLS_AES_256_GCM_SHA384',
        version: 'TLSv1.3',
      }))

      mockTlsConnect.mockImplementation((_opts: any, callback: any) => {
        setTimeout(() => {
          if (callback) callback()
        }, 5)
        return mockSocket
      })

      const res = await invokeNetIpc('net:sslCheck', 'api.enterprise.com', 443, 3000)

      expect(res.host).toBe('api.enterprise.com')
      expect(res.port).toBe(443)
      expect(res.valid).toBe(true)
      expect(res.issuer.O).toBe("Let's Encrypt")
      expect(res.subject.CN).toBe('api.enterprise.com')
      expect(res.cipher).toBe('TLS_AES_256_GCM_SHA384 (TLSv1.3)')
      expect(res.fingerprint).toBe('AA:BB:CC:DD:EE:FF')
      expect(res.daysRemaining).toBeGreaterThanOrEqual(0)
    })

    it('handles TLS connection errors and reports error message cleanly', async () => {
      const mockSocket = new EventEmitter() as any
      mockSocket.destroy = vi.fn()

      mockTlsConnect.mockImplementation(() => {
        setTimeout(() => {
          mockSocket.emit('error', new Error('CERT_HAS_EXPIRED'))
        }, 5)
        return mockSocket
      })

      const res = await invokeNetIpc('net:sslCheck', 'expired.badssl.com', 443)

      expect(res.valid).toBe(false)
      expect(res.error).toContain('CERT_HAS_EXPIRED')
      expect(mockSocket.destroy).toHaveBeenCalled()
    })
  })
})
