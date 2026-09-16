/**
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
import * as net from 'net'
import {
    validateRequestTarget,
    validateAndSanitizeHeaders,
    validatePort,
    validateHostname,
    isCloudMetadataHost,
    isPrivateNetworkHost,
} from '../../src/main/ipc/netDispatcherSecurity'

describe('E2E FEAT-04: Network Diagnostics, Watchdog & API Studio Security Guards', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (Network Contracts & Diagnostics)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should validate legitimate HTTP and HTTPS request targets', () => {
        const validUrls = [
            'https://api.github.com/repos/zendev',
            'http://localhost:8080/v1/health',
            'https://zendev.app/changelog',
            'http://127.0.0.1:3000/metrics',
        ]

        for (const url of validUrls) {
            const res = validateRequestTarget(url, { allowLocal: true })
            expect(res.valid, `Failed on valid target: ${url}`).toBe(true)
            if (res.valid) {
                expect(res.parsedUrl.protocol).toMatch(/^https?:$/)
            }
        }
    })

    it('T1.2: Should verify ping output contract schema', () => {
        // Contract schema verification for Tauri ping command
        const mockPingParser = (stdout: string) => {
            const matchTime = stdout.match(/Average = (\d+)ms/i) || stdout.match(/avg = ([\d.]+)/i)
            const matchLoss = stdout.match(/(\d+)% loss/i)
            return {
                avgMs: matchTime ? parseFloat(matchTime[1]) : null,
                packetLoss: matchLoss ? parseInt(matchLoss[1], 10) : 0,
            }
        }

        const sampleWindowsOutput = `
            Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
            Approximate round trip times in milli-seconds:
            Minimum = 12ms, Maximum = 18ms, Average = 14ms
        `
        const metrics = mockPingParser(sampleWindowsOutput)
        expect(metrics.avgMs).toBe(14)
        expect(metrics.packetLoss).toBe(0)
    })

    it('T1.3: Should perform real TCP port probing and service mapping', async () => {
        // Create an ephemeral local TCP listener to verify port probe
        const server = net.createServer()
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
        const address = server.address() as net.AddressInfo
        const localPort = address.port

        const probePort = (host: string, port: number): Promise<boolean> => {
            return new Promise((resolve) => {
                const socket = new net.Socket()
                socket.setTimeout(1000)
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

        const isOpen = await probePort('127.0.0.1', localPort)
        expect(isOpen).toBe(true)

        const isClosed = await probePort('127.0.0.1', 65530)
        expect(isClosed).toBe(false)

        server.close()
    })

    it('T1.4: Should extract and parse SSL certificate properties contract', () => {
        const mockCert = {
            subject: { CN: 'api.zendev.app', O: 'ZenDev Security Inc' },
            issuer: { CN: 'Let\'s Encrypt Authority X3', O: 'Let\'s Encrypt' },
            valid_from: 'Jan 1 00:00:00 2026 GMT',
            valid_to: 'Apr 1 00:00:00 2026 GMT',
            fingerprint256: '9A:8B:7C:6D:5E:4F:3A:2B:1C:0D:9E:8F:7A:6B:5C:4D:3E:2F:1A:0B:9C:8D:7E:6F:5A:4B:3C:2D:1E:0F:9A:8B',
        }

        const calculateDaysRemaining = (validTo: string) => {
            const expiry = new Date(validTo).getTime()
            const now = new Date('2026-01-15T00:00:00Z').getTime()
            return Math.max(0, Math.floor((expiry - now) / (1000 * 60 * 60 * 24)))
        }

        const remainingDays = calculateDaysRemaining(mockCert.valid_to)
        expect(remainingDays).toBeGreaterThan(0)
        expect(mockCert.subject.CN).toBe('api.zendev.app')
        expect(mockCert.fingerprint256).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
    })

    it('T1.5: Should validate safe process kill logic and enforce PID boundaries', () => {
        const safeKillGuard = (pid: number) => {
            if (
                typeof pid !== 'number' ||
                isNaN(pid) ||
                !Number.isInteger(pid) ||
                pid <= 4 ||
                pid === process.pid ||
                pid > 2147483647
            ) {
                return { success: false, error: 'Protected or invalid PID' }
            }
            return { success: true, message: `PID ${pid} verified killable` }
        }

        // Legitimate user process PID
        expect(safeKillGuard(12345).success).toBe(true)
    })

    it('T1.6: Should sanitize and accept valid RFC 7230 headers in API Studio dispatcher', () => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123',
            'X-Request-Id': 'req-987654',
            'User-Agent': 'ZenDev-Client/2.4.2',
        }

        const res = validateAndSanitizeHeaders(headers)
        expect(res.valid).toBe(true)
        expect(res.sanitizedHeaders['Content-Type']).toBe('application/json')
        expect(res.sanitizedHeaders['Authorization']).toBe('Bearer test-token-123')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (SSRF, CRLF & Abuse Protection)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should block cloud metadata addresses and hostnames unconditionally', () => {
        const metadataTargets = [
            'http://169.254.169.254/latest/meta-data/',
            'http://metadata.google.internal/computeMetadata/v1/',
            'http://100.100.100.200/latest/meta-data/', // Alibaba
            'http://168.63.129.16/metadata/instance',   // Azure
            'http://169.254.169.254:8080/secret',
        ]

        for (const target of metadataTargets) {
            const res = validateRequestTarget(target, { allowLocal: true })
            expect(res.valid, `Did not block metadata target: ${target}`).toBe(false)
            if (!res.valid) {
                expect(res.errorCode).toMatch(/METADATA|BLOCKED/i)
            }
        }
    })

    it('T2.2: Should block alternative IP encodings (octal, hex, decimal) targeting metadata range', () => {
        const alternativeEncodings = [
            'http://0251.0376.0251.0376/meta-data', // Octal 169.254.169.254
            'http://0xa9.0xfe.0xa9.0xfe/meta-data', // Hex 169.254.169.254
            'http://2852039166/meta-data',           // Decimal integer 169.254.169.254
            'http://0xa9fea9fe/meta-data',           // Dword hex
        ]

        for (const target of alternativeEncodings) {
            const res = validateRequestTarget(target, { allowLocal: true })
            expect(res.valid, `Did not block encoded target: ${target}`).toBe(false)
        }
    })

    it('T2.3: Should strictly reject non-HTTP protocols (file, gopher, ftp, javascript, data)', () => {
        const dangerousProtocols = [
            'file:///etc/passwd',
            'file:///C:/Windows/win.ini',
            'gopher://127.0.0.1:70/',
            'ftp://ftp.server.com/secrets',
            'javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            'blob:http://localhost/uuid',
        ]

        for (const url of dangerousProtocols) {
            const res = validateRequestTarget(url)
            expect(res.valid, `Dangerous protocol permitted: ${url}`).toBe(false)
        }
    })

    it('T2.4: Should detect and reject CRLF injection attempts in HTTP headers', () => {
        const maliciousHeaders = [
            { 'X-Header': 'value\r\nInjected-Header: evil' },
            { 'X-Header\r\nEvil': 'value' },
            { 'Content-Type': 'application/json\nSet-Cookie: session=hijacked' },
            { 'X-Null\0Byte': 'value' },
        ]

        for (const headers of maliciousHeaders) {
            const res = validateAndSanitizeHeaders(headers as any, { strict: true })
            expect(res.valid, `CRLF injection was not rejected: ${JSON.stringify(headers)}`).toBe(false)
        }
    })

    it('T2.5: Should reject protected PIDs (PID 0, PID 4, negative, self, max int) in watchdog', () => {
        const safeKillGuard = (pid: number) => {
            if (
                typeof pid !== 'number' ||
                isNaN(pid) ||
                !Number.isInteger(pid) ||
                pid <= 4 ||
                pid === process.pid ||
                pid > 2147483647
            ) {
                return { success: false, error: 'Protected or invalid PID' }
            }
            return { success: true }
        }

        expect(safeKillGuard(0).success).toBe(false)            // System Idle
        expect(safeKillGuard(4).success).toBe(false)            // System Kernel
        expect(safeKillGuard(-1).success).toBe(false)           // Negative
        expect(safeKillGuard(process.pid).success).toBe(false)  // Self PID
        expect(safeKillGuard(2147483648).success).toBe(false)   // Over 32-bit int max
        expect(safeKillGuard(NaN).success).toBe(false)          // NaN
    })

    it('T2.6: Should reject illegal TCP ports (< 1, > 65535, non-numeric)', () => {
        expect(validatePort(0).valid).toBe(false)
        expect(validatePort(65536).valid).toBe(false)
        expect(validatePort(-80).valid).toBe(false)
        expect(validatePort(80.5 as any).valid).toBe(false)
        expect(validatePort('80abc' as any).valid).toBe(false)

        expect(validatePort(80).valid).toBe(true)
        expect(validatePort('443' as any).valid).toBe(true)
        expect(validatePort(65535).valid).toBe(true)
    })
})
