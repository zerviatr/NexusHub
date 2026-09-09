import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'

// Replicating pure key validation logic for unit testing independent of Electron runtime
const TIER_MAP: Record<string, string> = {
  F: 'free',
  P: 'pro',
  T: 'team',
  L: 'lifetime',
}

const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
const MONTH_MS = 30.44 * 24 * 3600 * 1000
const TEST_SECRET = 'TEST_SECRET_KEY_FOR_UNIT_TESTS'

function generateTestKey(tierChar: 'F' | 'P' | 'T' | 'L', monthsFrom2024: number, secret = TEST_SECRET): string {
  const eee = monthsFrom2024.toString(16).padStart(3, '0').toUpperCase()
  const payload = tierChar + eee
  const hmac = createHmac('sha256', secret).update(payload).digest('hex').toUpperCase().slice(0, 16)
  const full = `NEXUS${tierChar}${eee}${hmac}`
  return `${full.slice(0, 5)}-${full.slice(5, 10)}-${full.slice(10, 15)}-${full.slice(15, 20)}-${full.slice(20, 25)}`
}

function validateKeyPure(rawKey: string, secret = TEST_SECRET) {
  const stripped = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!stripped.startsWith('NEXUS') || stripped.length !== 25) {
    return { valid: false, reason: 'Invalid key format' }
  }

  const code = stripped.slice(5)
  const T = code[0]
  const EEE = code.slice(1, 4)
  const H = code.slice(4)

  const tier = TIER_MAP[T]
  if (!tier) return { valid: false, reason: 'Unknown license tier' }

  const expectedHmac = createHmac('sha256', secret)
    .update(T + EEE)
    .digest('hex')
    .toUpperCase()
    .slice(0, 16)

  if (H !== expectedHmac) {
    return { valid: false, reason: 'Cryptographic signature mismatch' }
  }

  const months = parseInt(EEE, 16)
  let expiresAt = 0
  if (months > 0) {
    expiresAt = JAN_2024_MS + months * MONTH_MS
    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'License has expired' }
    }
  }

  return { valid: true, tier, expiresAt }
}

describe('NexusHub License Cryptography & Validation', () => {
  it('should successfully validate a valid Lifetime key', () => {
    const key = generateTestKey('L', 0)
    const res = validateKeyPure(key)
    expect(res.valid).toBe(true)
    expect(res.tier).toBe('lifetime')
    expect(res.expiresAt).toBe(0)
  })

  it('should successfully validate a valid Pro key with future expiry', () => {
    // Month 120 (far in future)
    const key = generateTestKey('P', 120)
    const res = validateKeyPure(key)
    expect(res.valid).toBe(true)
    expect(res.tier).toBe('pro')
    expect(res.expiresAt).toBeGreaterThan(Date.now())
  })

  it('should reject a key with tampered HMAC signature', () => {
    const validKey = generateTestKey('P', 120)
    // Tamper the last character
    const tampered = validKey.slice(0, -1) + (validKey.slice(-1) === 'A' ? 'B' : 'A')
    const res = validateKeyPure(tampered)
    expect(res.valid).toBe(false)
    expect(res.reason).toBe('Cryptographic signature mismatch')
  })

  it('should reject malformed keys', () => {
    expect(validateKeyPure('INVALID-KEY-12345').valid).toBe(false)
    expect(validateKeyPure('').valid).toBe(false)
    expect(validateKeyPure('NEXUS-TOO-SHORT').valid).toBe(false)
  })

  it('should reject expired licenses', () => {
    // 1 month past Jan 2024 = Feb 2024 (already expired in 2026)
    const expiredKey = generateTestKey('P', 1)
    const res = validateKeyPure(expiredKey)
    expect(res.valid).toBe(false)
    expect(res.reason).toBe('License has expired')
  })
})
