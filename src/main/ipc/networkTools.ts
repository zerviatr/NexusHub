/**
 * Network Tools IPC Handler
 *
 * Uses Node.js built-ins only — no extra npm packages.
 * IPC channels:
 *   network:ipLookup   → (host: string) → IpLookupResult
 *   network:dnsQuery   → (host: string, type: DnsType) → DnsQueryResult
 *   network:portScan   → (host: string, ports: number[]) → PortScanResult
 *   network:ping       → (host: string) → PingResult
 */

import { ipcMain } from 'electron'
import * as dns from 'dns'
import * as net from 'net'
import * as tls from 'tls'
import { promisify } from 'util'
import { execFile } from 'child_process'
import axios from 'axios'

const execFileAsync = promisify(execFile)
const dnsLookup = promisify(dns.lookup)

// ===== Types =====

export interface IpLookupResult {
  success: boolean
  host: string
  ip?: string
  family?: number
  error?: string
}

export type DnsType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME'

export interface DnsQueryResult {
  success: boolean
  host: string
  type: DnsType
  records?: string[]
  error?: string
}

export interface PortStatus {
  port: number
  open: boolean
  service: string
}

export interface PortScanResult {
  success: boolean
  host: string
  ports: PortStatus[]
  error?: string
}

export interface PingResult {
  success: boolean
  host: string
  output?: string
  avgMs?: number
  minMs?: number
  maxMs?: number
  latencies?: number[]
  packetLoss?: string
  error?: string
}

export interface SslCertResult {
  success: boolean
  host: string
  subject?: { CN?: string; O?: string; C?: string }
  issuer?: { CN?: string; O?: string; C?: string }
  validFrom?: string
  validTo?: string
  daysRemaining?: number
  isExpired?: boolean
  serialNumber?: string
  fingerprint256?: string
  protocol?: string
  error?: string
}

// ===== Common services map =====
const SERVICES: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  465: 'SMTPS',
  587: 'SMTP (TLS)',
  993: 'IMAPS',
  995: 'POP3S',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  27017: 'MongoDB',
}

// ===== Helpers =====

function checkPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
    socket.connect(port, host)
  })
}

function parsePingAvg(output: string): number | undefined {
  // Windows: "Minimum = 1ms, Maximum = 3ms, Average = 2ms"
  const winMatch = output.match(/Average\s*=\s*(\d+)ms/i)
  if (winMatch) return parseInt(winMatch[1])
  // Unix: "rtt min/avg/max/mdev = 1.234/2.345/3.456/0.123 ms"
  const unixMatch = output.match(/min\/avg\/max\/mdev\s*=\s*[\d.]+\/([\d.]+)/)
  if (unixMatch) return parseFloat(unixMatch[1])
  return undefined
}

function parsePingPacketLoss(output: string): string | undefined {
  const match = output.match(/(\d+)%\s*(packet\s*)?loss/i)
  return match ? `${match[1]}%` : undefined
}

function parsePingLatencies(output: string): number[] {
  const latencies: number[] = []
  // Matches "time=14ms", "time<1ms", "time 14.2 ms"
  const regex = /time[=<]([\d.]+)\s*ms/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(output)) !== null) {
    const val = parseFloat(match[1])
    if (!isNaN(val)) latencies.push(val)
  }
  return latencies
}

function parsePingMinMax(output: string): { minMs?: number; maxMs?: number } {
  // Windows: "Minimum = 1ms, Maximum = 3ms, Average = 2ms"
  const winMin = output.match(/Minimum\s*=\s*(\d+)ms/i)
  const winMax = output.match(/Maximum\s*=\s*(\d+)ms/i)
  if (winMin || winMax) {
    return {
      minMs: winMin ? parseInt(winMin[1]) : undefined,
      maxMs: winMax ? parseInt(winMax[1]) : undefined,
    }
  }
  // Unix: "rtt min/avg/max/mdev = 1.234/2.345/3.456/0.123 ms"
  const unixMatch = output.match(/min\/avg\/max\/mdev\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/)
  if (unixMatch) {
    return {
      minMs: parseFloat(unixMatch[1]),
      maxMs: parseFloat(unixMatch[3]),
    }
  }
  return {}
}

function inspectSslCertificate(rawHost: string, port = 443, timeoutMs = 6000): Promise<SslCertResult> {
  return new Promise((resolve) => {
    const cleanHost = rawHost.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
    if (!cleanHost) return resolve({ success: false, host: rawHost, error: 'Host is empty' })

    const socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true)
          const protocol = socket.getProtocol() || undefined
          socket.destroy()

          if (!cert || Object.keys(cert).length === 0) {
            return resolve({ success: false, host: cleanHost, error: 'Sunucu geçerli bir SSL sertifikası sağlamadı.' })
          }

          const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined
          const validFrom = cert.valid_from ? new Date(cert.valid_from) : undefined
          const now = new Date()
          const daysRemaining = validTo
            ? Math.round((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : undefined

          resolve({
            success: true,
            host: cleanHost,
            subject: {
              CN: Array.isArray(cert.subject?.CN) ? cert.subject.CN.join(', ') : cert.subject?.CN,
              O: Array.isArray(cert.subject?.O) ? cert.subject.O.join(', ') : cert.subject?.O,
              C: Array.isArray(cert.subject?.C) ? cert.subject.C.join(', ') : cert.subject?.C,
            },
            issuer: {
              CN: Array.isArray(cert.issuer?.CN) ? cert.issuer.CN.join(', ') : cert.issuer?.CN,
              O: Array.isArray(cert.issuer?.O) ? cert.issuer.O.join(', ') : cert.issuer?.O,
              C: Array.isArray(cert.issuer?.C) ? cert.issuer.C.join(', ') : cert.issuer?.C,
            },
            validFrom: validFrom ? validFrom.toLocaleDateString() : undefined,
            validTo: validTo ? validTo.toLocaleDateString() : undefined,
            daysRemaining,
            isExpired: daysRemaining !== undefined ? daysRemaining <= 0 : false,
            serialNumber: cert.serialNumber,
            fingerprint256: cert.fingerprint256,
            protocol,
          })
        } catch (err: any) {
          resolve({ success: false, host: cleanHost, error: err.message || 'Sertifika çözümlenemedi.' })
        }
      }
    )

    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, host: cleanHost, error: 'SSL el sıkışması zaman aşımına uğradı (Timeout).' })
    })

    socket.on('error', (err) => {
      socket.destroy()
      resolve({ success: false, host: cleanHost, error: err.message || 'SSL bağlantı hatası.' })
    })
  })
}

// ===== IPC Registration =====

export function registerNetworkToolsIPC(): void {
  // IP Lookup
  ipcMain.handle('network:ipLookup', async (_, host: string): Promise<IpLookupResult> => {
    try {
      let sanitized = host.trim()
      // Disallow flags or leading hyphens to prevent argument injection
      while (sanitized.startsWith('-')) {
        sanitized = sanitized.slice(1).trim()
      }
      if (!sanitized) {
        throw new Error('Invalid host provided')
      }
      if (!sanitized) throw new Error('Host cannot be empty')
      const result = await dnsLookup(sanitized)
      return {
        success: true,
        host: sanitized,
        ip: result.address,
        family: result.family,
      }
    } catch (err: any) {
      return { success: false, host, error: err.message }
    }
  })

  // DNS Query
  ipcMain.handle(
    'network:dnsQuery',
    async (_, host: string, type: DnsType): Promise<DnsQueryResult> => {
      try {
        const sanitized = host.trim()
        if (!sanitized) throw new Error('Host cannot be empty')

        let records: string[] = []

        if (type === 'A') {
          const res = await promisify(dns.resolve4)(sanitized)
          records = res
        } else if (type === 'AAAA') {
          const res = await promisify(dns.resolve6)(sanitized)
          records = res
        } else if (type === 'MX') {
          const res = await promisify(dns.resolveMx)(sanitized)
          records = res.map((r) => `${r.priority} ${r.exchange}`)
        } else if (type === 'TXT') {
          const res = await promisify(dns.resolveTxt)(sanitized)
          records = res.map((r) => r.join(''))
        } else if (type === 'NS') {
          const res = await promisify(dns.resolveNs)(sanitized)
          records = res
        } else if (type === 'CNAME') {
          const res = await promisify(dns.resolveCname)(sanitized)
          records = res
        }

        return { success: true, host: sanitized, type, records }
      } catch (err: any) {
        return { success: false, host, type, error: err.message }
      }
    }
  )

  // Port Scanner
  ipcMain.handle(
    'network:portScan',
    async (_, host: string, ports: number[]): Promise<PortScanResult> => {
      try {
        const sanitized = host.trim()
        if (!sanitized) throw new Error('Host cannot be empty')
        if (!ports || ports.length === 0) throw new Error('No ports specified')
        if (ports.length > 50) throw new Error('Maximum 50 ports per scan')

        const results = await Promise.all(
          ports.map(async (port): Promise<PortStatus> => {
            const open = await checkPort(sanitized, port)
            return {
              port,
              open,
              service: SERVICES[port] || 'Unknown',
            }
          })
        )

        return { success: true, host: sanitized, ports: results }
      } catch (err: any) {
        return { success: false, host, ports: [], error: err.message }
      }
    }
  )

  // Ping
  ipcMain.handle('network:ping', async (_, host: string): Promise<PingResult> => {
    try {
      const sanitized = host.trim()
      if (!sanitized) throw new Error('Host cannot be empty')

      // Strict validation: Host must be a valid IPv4, IPv6 or hostname. No shell metacharacters.
      const HOST_SAFE_REGEX = /^[a-zA-Z0-9.:-]+$/
      if (!HOST_SAFE_REGEX.test(sanitized)) {
        throw new Error('Invalid host format. Only alphanumeric characters, dots, colons, and hyphens are allowed.')
      }

      const isWin = process.platform === 'win32'
      const args = isWin ? ['-n', '4', sanitized] : ['-c', '4', sanitized]

      const { stdout, stderr } = await execFileAsync('ping', args, { timeout: 10000 })
      const output = stdout || stderr
      const minMax = parsePingMinMax(output)
      const latencies = parsePingLatencies(output)

      return {
        success: true,
        host: sanitized,
        output,
        avgMs: parsePingAvg(output),
        minMs: minMax.minMs,
        maxMs: minMax.maxMs,
        latencies,
        packetLoss: parsePingPacketLoss(output),
      }
    } catch (err: any) {
      return { success: false, host, error: err.message || String(err) }
    }
  })

  // SSL Certificate Inspector
  ipcMain.handle('network:sslInspect', async (_, host: string, port?: number): Promise<SslCertResult> => {
    return inspectSslCertificate(host, port || 443)
  })

  // My IP & Geolocation
  ipcMain.handle('network:myIp', async (): Promise<any> => {
    try {
      const res = await axios.get('https://ipapi.co/json/', { timeout: 6000 })
      return {
        success: true,
        ip: res.data.ip,
        city: res.data.city,
        region: res.data.region,
        country: res.data.country_name,
        countryCode: res.data.country_code,
        org: res.data.org,
        timezone: res.data.timezone,
      }
    } catch (err: any) {
      try {
        const fallback = await axios.get('https://api.ipify.org?format=json', { timeout: 4000 })
        return { success: true, ip: fallback.data.ip }
      } catch {
        return { success: false, error: err.message || 'Failed to resolve public IP' }
      }
    }
  })
}
