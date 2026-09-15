/**
 * tests/securityHardening.test.ts
 *
 * Enterprise Security Hardening Test Suite:
 * 1. Hardened Rate Limiter: req.ip extraction, IP whitelist bypass, IP blacklist rejection (403)
 * 2. License Signer: Elimination of hardcoded private key, dynamic ephemeral key in dev, production enforcement
 * 3. SafeStorage: Encryption and decryption round-trip, secure key-value store persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from '../server/src/middleware/rateLimiter'
import { loadOrGenerateKeyPair, _resetKeyCache } from '../server/src/services/licenseSigner'
import {
  encryptString,
  decryptString,
  storeSecret,
  retrieveSecret,
  deleteSecret,
} from '../src/main/ipc/safeStorage'

function createMockHttp(options: { ip?: string; forwardedFor?: string } = {}) {
  const { ip = '127.0.0.1', forwardedFor } = options
  const headers: Record<string, string | number> = {}
  if (forwardedFor) {
    headers['x-forwarded-for'] = forwardedFor
  }

  let statusCode = 200
  let jsonResponse: any = null

  const req: any = {
    headers,
    ip,
    socket: { remoteAddress: ip },
  }

  const res: any = {
    setHeader: (name: string, value: string | number) => {
      headers[name] = value
    },
    status: (code: number) => {
      statusCode = code
      return res
    },
    json: (payload: any) => {
      jsonResponse = payload
      return res
    },
  }

  return { req, res, getHeaders: () => headers, getStatus: () => statusCode, getJson: () => jsonResponse }
}

describe('Enterprise Security Hardening', () => {
  describe('1. Rate Limiter Hardening', () => {
    it('should bypass rate limits for whitelisted IPs', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 1, // Only 1 request allowed for normal users
        whitelist: ['127.0.0.1', '10.0.0.5'],
      })

      // Whitelisted IP makes 5 consecutive requests without being rate limited
      for (let i = 0; i < 5; i++) {
        const http = createMockHttp({ ip: '127.0.0.1' })
        const next = vi.fn()
        limiter(http.req, http.res, next)
        expect(next).toHaveBeenCalledOnce()
        expect(http.getStatus()).toBe(200)
      }
    })

    it('should immediately reject blacklisted IPs with 403 Forbidden', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 10,
        blacklist: ['198.51.100.99', '203.0.113.50'],
        blacklistMessage: 'Blocked by firewall',
      })

      const http = createMockHttp({ ip: '198.51.100.99' })
      const next = vi.fn()
      limiter(http.req, http.res, next)

      expect(next).not.toHaveBeenCalled()
      expect(http.getStatus()).toBe(403)
      expect(http.getJson()?.success).toBe(false)
      expect(http.getJson()?.error).toBe('Blocked by firewall')
    })

    it('should normalize IPv6-mapped IPv4 addresses for whitelist/blacklist checks', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 1,
        whitelist: ['192.168.1.100'],
      })

      // Express with trust proxy can return '::ffff:192.168.1.100'
      const http = createMockHttp({ ip: '::ffff:192.168.1.100' })
      const next = vi.fn()
      limiter(http.req, http.res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(http.getStatus()).toBe(200)
    })

    it('should use Express validated req.ip rather than spoofed X-Forwarded-For header', () => {
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 1,
      })

      // Attacker sends request from real IP 10.0.0.1, attempting to spoof with X-Forwarded-For: 8.8.8.8
      const http1 = createMockHttp({ ip: '10.0.0.1', forwardedFor: '8.8.8.8' })
      const next1 = vi.fn()
      limiter(http1.req, http1.res, next1)
      expect(next1).toHaveBeenCalledOnce()

      // Second request from same real IP 10.0.0.1, spoofing a different X-Forwarded-For: 1.1.1.1
      const http2 = createMockHttp({ ip: '10.0.0.1', forwardedFor: '1.1.1.1' })
      const next2 = vi.fn()
      limiter(http2.req, http2.res, next2)

      // Must be blocked because rate limiting is keyed on req.ip (10.0.0.1)
      expect(next2).not.toHaveBeenCalled()
      expect(http2.getStatus()).toBe(429)
    })
  })

  describe('2. License Signer Security', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      process.env = { ...originalEnv }
      _resetKeyCache()
    })

    afterEach(() => {
      process.env = originalEnv
      _resetKeyCache()
    })

    it('should generate ephemeral ECDSA key pair dynamically in dev mode with warning when keys are absent', () => {
      delete process.env['ZENDEV_LICENSE_PRIVATE_KEY']
      delete process.env['ZENDEV_LICENSE_PUBLIC_KEY']
      delete process.env['ZENDEV_PRIVATE_KEY_PATH']
      process.env['NODE_ENV'] = 'development'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Point to an empty non-existent directory to simulate missing keys
      const keys = loadOrGenerateKeyPair('non_existent_keys_dir_' + Date.now())

      expect(keys.privateKey).toBeDefined()
      expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
      expect(keys.publicKey).toBeDefined()
      expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY WARNING] ZENDEV_LICENSE_PRIVATE_KEY is not set')
      )

      warnSpy.mockRestore()
    })

    it('should enforce ZENDEV_LICENSE_PRIVATE_KEY in production mode and reject startup if missing', () => {
      delete process.env['ZENDEV_LICENSE_PRIVATE_KEY']
      delete process.env['ZENDEV_LICENSE_PUBLIC_KEY']
      delete process.env['ZENDEV_PRIVATE_KEY_PATH']
      process.env['NODE_ENV'] = 'production'

      expect(() => {
        loadOrGenerateKeyPair('non_existent_keys_dir_' + Date.now())
      }).toThrow(/ZENDEV_LICENSE_PRIVATE_KEY environment variable is required in production/i)
    })
  })

  describe('3. SafeStorage IPC and Secrets Store', () => {
    it('should encrypt and decrypt strings round-trip successfully', () => {
      const secret = 'sk-proj-test1234567890abcdef'
      const encrypted = encryptString(secret)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(secret)

      const decrypted = decryptString(encrypted)
      expect(decrypted).toBe(secret)
    })

    it('should store, retrieve, and delete secrets in the persistent secure vault', () => {
      const testKey = 'test_openai_key'
      const testValue = 'sk-test-secret-value-999'

      const stored = storeSecret(testKey, testValue)
      expect(stored).toBe(true)

      const retrieved = retrieveSecret(testKey)
      expect(retrieved).toBe(testValue)

      const deleted = deleteSecret(testKey)
      expect(deleted).toBe(true)

      const afterDelete = retrieveSecret(testKey)
      expect(afterDelete).toBeNull()
    })
  })
})
