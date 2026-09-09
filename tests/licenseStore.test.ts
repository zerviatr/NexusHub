import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { validateLicenseKey, formatLicenseKey } from '../src/shared/licenseValidator'

const TEST_SECRET = 'TEST_SECRET_KEY_FOR_UNIT_TESTS'

function generateTestKey(tierChar: 'F' | 'P' | 'T' | 'L', monthsFrom2024: number, secret = TEST_SECRET, entropy?: string): string {
  const eee = monthsFrom2024.toString(16).padStart(3, '0').toUpperCase()
  if (entropy) {
    const ssss = entropy.slice(0, 4).toUpperCase()
    const payload = tierChar + eee + ssss
    const hmac = createHmac('sha256', secret).update(payload).digest('hex').toUpperCase().slice(0, 12)
    const full = `NEXUS${tierChar}${eee}${ssss}${hmac}`
    return formatLicenseKey(full)
  }
  const payload = tierChar + eee
  const hmac = createHmac('sha256', secret).update(payload).digest('hex').toUpperCase().slice(0, 16)
  const full = `NEXUS${tierChar}${eee}${hmac}`
  return formatLicenseKey(full)
}

function validateKeyPure(rawKey: string, secret = TEST_SECRET) {
  return validateLicenseKey(rawKey, secret)
}

describe('ZenDev License Cryptography & Validation', () => {
  it('should successfully validate a valid Lifetime key', () => {
    const key = generateTestKey('L', 0)
    const res = validateKeyPure(key)
    expect(res.valid).toBe(true)
    expect(res.tier).toBe('lifetime')
    expect(res.expiresAt).toBe(0)
  })

  it('should successfully validate new entropy-salt keys and prevent collisions', () => {
    const key1 = generateTestKey('L', 0, TEST_SECRET, 'A1B2')
    const key2 = generateTestKey('L', 0, TEST_SECRET, 'F9E8')
    expect(key1).not.toBe(key2)
    const res1 = validateKeyPure(key1)
    const res2 = validateKeyPure(key2)
    expect(res1.valid).toBe(true)
    expect(res2.valid).toBe(true)
    expect(res1.tier).toBe('lifetime')
    expect(res2.tier).toBe('lifetime')
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
    expect(res.reason).toBe('License key has expired')
  })
})
