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
 * @file netDispatcher.ts
 * @description Electron main-process IPC router for native outbound networking.
 * Completely bypasses browser CORS constraints, executes DNS diagnostic queries,
 * measures TCP latency, and inspects remote TLS/SSL certificates.
 */

import { ipcMain } from 'electron'
import * as dns from 'node:dns/promises'
import * as net from 'node:net'
import * as tls from 'node:tls'
import {
  validateRequestTarget,
  validateAndSanitizeHeaders,
  validatePort,
  validateHostname,
} from './netDispatcherSecurity'

export interface RequestOptions {
  id?: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
  followRedirects?: boolean
}

export interface ResponseResult {
  status: number
  statusText: string
  headers: Record<string, string>
  data: string
  timeMs: number
  sizeBytes: number
  error?: string
}

export interface DnsRecord {
  type: string
  address?: string
  value?: string
  ttl?: number
  priority?: number
}

export interface DnsLookupResult {
  host: string
  records: DnsRecord[]
  timeMs: number
  error?: string
}

export interface TcpPingResult {
  host: string
  port: number
  open: boolean
  timeMs: number
  error?: string
}

export interface SslCheckResult {
  host: string
  port: number
  valid: boolean
  issuer: Record<string, string>
  subject: Record<string, string>
  validFrom: string
  validTo: string
  daysRemaining: number
  fingerprint: string
  cipher: string
  error?: string
}

/**
 * Dispatches an outbound HTTP/HTTPS request using Node.js native networking.
 *
 * @param {RequestOptions} options - Request parameters.
 * @returns {Promise<ResponseResult>} Structured response or error details.
 */
export async function dispatchOutboundRequest(options: RequestOptions): Promise<ResponseResult> {
  const startTime = Date.now()

  // 1. Security & URL Validation
  const targetCheck = validateRequestTarget(options.url)
  if (!targetCheck.valid || !targetCheck.parsedUrl) {
    return {
      status: 0,
      statusText: 'Security Error',
      headers: {},
      data: '',
      timeMs: Date.now() - startTime,
      sizeBytes: 0,
      error: targetCheck.error || 'Invalid target URL',
    }
  }

  // 2. Header Sanitization
  const headerCheck = validateAndSanitizeHeaders(options.headers, { strict: true })
  if (!headerCheck.valid) {
    return {
      status: 0,
      statusText: 'Header Security Error',
      headers: {},
      data: '',
      timeMs: Date.now() - startTime,
      sizeBytes: 0,
      error: headerCheck.error || 'Invalid request headers',
    }
  }

  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 30000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: headerCheck.sanitizedHeaders,
      redirect: options.followRedirects === false ? 'manual' : 'follow',
      signal: controller.signal,
    }

    if (
      options.body &&
      options.method !== 'GET' &&
      options.method !== 'HEAD'
    ) {
      fetchOptions.body = options.body
    }

    const res = await fetch(targetCheck.parsedUrl.toString(), fetchOptions)
    clearTimeout(timeoutId)

    const text = await res.text()
    const timeMs = Date.now() - startTime

    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    const sizeBytes = Buffer.byteLength(text, 'utf8')

    return {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      data: text,
      timeMs,
      sizeBytes,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    const timeMs = Date.now() - startTime
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted')

    return {
      status: 0,
      statusText: isTimeout ? 'Timeout' : 'Network Error',
      headers: {},
      data: '',
      timeMs,
      sizeBytes: 0,
      error: isTimeout ? `Request timed out after ${timeoutMs}ms` : err?.message || 'Network request failed',
    }
  }
}

/**
 * Performs comprehensive DNS record lookups (A, AAAA, MX, TXT) for a hostname.
 *
 * @param {string} rawHost - Target hostname.
 * @returns {Promise<DnsLookupResult>} Discovered DNS records.
 */
export async function executeDnsLookup(rawHost: string): Promise<DnsLookupResult> {
  const startTime = Date.now()
  const hostValidation = validateHostname(rawHost)
  if (!hostValidation.valid || !hostValidation.sanitizedHost) {
    return {
      host: typeof rawHost === 'string' ? rawHost : '',
      records: [],
      timeMs: 0,
      error: hostValidation.error || 'Invalid hostname',
    }
  }

  const host = hostValidation.sanitizedHost
  const records: DnsRecord[] = []

  try {
    // Query A Records
    try {
      const a = await dns.resolve4(host, { ttl: true })
      for (const rec of a) {
        records.push({ type: 'A', address: rec.address, ttl: rec.ttl })
      }
    } catch {
      // Ignore if no A record
    }

    // Query AAAA Records
    try {
      const aaaa = await dns.resolve6(host, { ttl: true })
      for (const rec of aaaa) {
        records.push({ type: 'AAAA', address: rec.address, ttl: rec.ttl })
      }
    } catch {
      // Ignore if no AAAA record
    }

    // Query MX Records
    try {
      const mx = await dns.resolveMx(host)
      for (const rec of mx) {
        records.push({ type: 'MX', value: rec.exchange, priority: rec.priority })
      }
    } catch {
      // Ignore if no MX record
    }

    // Query TXT Records
    try {
      const txt = await dns.resolveTxt(host)
      for (const entry of txt) {
        records.push({ type: 'TXT', value: entry.join(' ') })
      }
    } catch {
      // Ignore if no TXT record
    }

    return {
      host,
      records,
      timeMs: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      host,
      records,
      timeMs: Date.now() - startTime,
      error: err?.message || 'DNS resolution failed',
    }
  }
}

/**
 * Pings a host and port via TCP socket connection to determine reachability and latency.
 *
 * @param {string} host - Target host.
 * @param {number} port - Target port.
 * @param {number} [timeoutMs=5000] - Connection timeout.
 * @returns {Promise<TcpPingResult>} Connection status and latency.
 */
export async function executeTcpPing(
  host: string,
  port: number,
  timeoutMs: number = 5000
): Promise<TcpPingResult> {
  const startTime = Date.now()
  const portValidation = validatePort(port)

  if (!portValidation.valid) {
    return {
      host,
      port: 0,
      open: false,
      timeMs: 0,
      error: portValidation.error,
    }
  }

  const hostValidation = validateHostname(host)
  if (!hostValidation.valid || !hostValidation.sanitizedHost) {
    return {
      host: typeof host === 'string' ? host : '',
      port: portValidation.port,
      open: false,
      timeMs: 0,
      error: hostValidation.error || 'Invalid hostname',
    }
  }

  const cleanHost = hostValidation.sanitizedHost

  return new Promise((resolve) => {
    const socket = new net.Socket()
    let hasResolved = false

    const finalize = (open: boolean, error?: string) => {
      if (hasResolved) return
      hasResolved = true
      socket.destroy()
      resolve({
        host: cleanHost,
        port: portValidation.port,
        open,
        timeMs: Date.now() - startTime,
        error,
      })
    }

    socket.setTimeout(timeoutMs)

    socket.on('connect', () => {
      finalize(true)
    })

    socket.on('timeout', () => {
      finalize(false, `Connection timed out after ${timeoutMs}ms`)
    })

    socket.on('error', (err: any) => {
      finalize(false, err?.message || 'Connection refused or unreachable')
    })

    try {
      socket.connect(portValidation.port, cleanHost)
    } catch (err: any) {
      finalize(false, err?.message || 'Socket initiation failed')
    }
  })
}

/**
 * Connects to a remote host via TLS to inspect peer certificate validity, issuer, and cipher.
 *
 * @param {string} host - Target host.
 * @param {number} [port=443] - Target port.
 * @param {number} [timeoutMs=5000] - Handshake timeout.
 * @returns {Promise<SslCheckResult>} Certificate and TLS metadata.
 */
export async function executeSslCheck(
  host: string,
  port: number = 443,
  timeoutMs: number = 5000
): Promise<SslCheckResult> {
  const portValidation = validatePort(port)
  if (!portValidation.valid) {
    return {
      host,
      port: 0,
      valid: false,
      issuer: {},
      subject: {},
      validFrom: '',
      validTo: '',
      daysRemaining: 0,
      fingerprint: '',
      cipher: '',
      error: portValidation.error,
    }
  }

  const hostValidation = validateHostname(host)
  if (!hostValidation.valid || !hostValidation.sanitizedHost) {
    return {
      host: typeof host === 'string' ? host : '',
      port: portValidation.port,
      valid: false,
      issuer: {},
      subject: {},
      validFrom: '',
      validTo: '',
      daysRemaining: 0,
      fingerprint: '',
      cipher: '',
      error: hostValidation.error || 'Invalid hostname',
    }
  }

  const cleanHost = hostValidation.sanitizedHost

  return new Promise((resolve) => {
    let hasResolved = false

    const finalize = (result: Partial<SslCheckResult>, error?: string) => {
      if (hasResolved) return
      hasResolved = true
      socket.destroy()
      resolve({
        host: cleanHost,
        port: portValidation.port,
        valid: result.valid || false,
        issuer: result.issuer || {},
        subject: result.subject || {},
        validFrom: result.validFrom || '',
        validTo: result.validTo || '',
        daysRemaining: result.daysRemaining || 0,
        fingerprint: result.fingerprint || '',
        cipher: result.cipher || '',
        error,
      })
    }

    const isIp = net.isIP(cleanHost) !== 0
    const socket = tls.connect(
      {
        host: cleanHost,
        port: portValidation.port,
        ...(isIp ? {} : { servername: cleanHost }),
        rejectUnauthorized: false, // Inspect certificate even if self-signed or expired
        timeout: timeoutMs,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true)
          const cipher = socket.getCipher()

          if (!cert || Object.keys(cert).length === 0) {
            finalize({}, 'No peer certificate presented by remote host.')
            return
          }

          const validToDate = new Date(cert.valid_to)
          const now = new Date()
          const msRemaining = validToDate.getTime() - now.getTime()
          const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)))
          const isValid = socket.authorized && msRemaining > 0

          finalize({
            valid: isValid,
            issuer: (cert.issuer as any) || {},
            subject: (cert.subject as any) || {},
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            fingerprint: cert.fingerprint256 || cert.fingerprint || '',
            cipher: cipher ? `${cipher.name} (${cipher.version})` : 'Unknown',
          })
        } catch (err: any) {
          finalize({}, err?.message || 'Certificate inspection failed')
        }
      }
    )

    socket.on('timeout', () => {
      finalize({}, `TLS handshake timed out after ${timeoutMs}ms`)
    })

    socket.on('error', (err: any) => {
      finalize({}, err?.message || 'TLS connection error')
    })
  })
}

/**
 * Registers all netDispatcher IPC channels on electron ipcMain.
 */
export function registerNetDispatcherIPC(): void {
  ipcMain.handle('net:dispatchRequest', async (_event, options: RequestOptions) => {
    return dispatchOutboundRequest(options)
  })

  ipcMain.handle('net:dnsLookup', async (_event, input: any) => {
    const host = typeof input === 'string' ? input : input?.host
    return executeDnsLookup(host)
  })

  ipcMain.handle('net:tcpPing', async (_event, arg1: any, arg2?: number, arg3?: number) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      return executeTcpPing(arg1.host, arg1.port, arg1.timeoutMs)
    }
    return executeTcpPing(arg1, arg2 as number, arg3)
  })

  ipcMain.handle('net:sslCheck', async (_event, arg1: any, arg2?: number, arg3?: number) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      return executeSslCheck(arg1.host, arg1.port, arg1.timeoutMs)
    }
    return executeSslCheck(arg1, arg2, arg3)
  })
}

/** Alias for project specification naming convention */
export const registerNetDispatcherHandlers = registerNetDispatcherIPC
export const performDnsLookup = executeDnsLookup
export const performTcpPing = executeTcpPing
export const performSslCheck = executeSslCheck

