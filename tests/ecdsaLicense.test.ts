import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, createHmac } from 'crypto'
import {
  verifyEcdsaLicense,
  formatEcdsaLicenseKey,
  base32Encode,
  base32Decode,
  packEnvelope,
  unpackEnvelope,
  DEFAULT_ECDSA_PUBLIC_KEY,
  type EcdsaLicensePayload,
} from '../src/shared/ecdsaLicense'
import {
  generateEcdsaLicense,
  DEFAULT_ECDSA_PRIVATE_KEY,
  generateFreshKeyPair,
} from '../server/src/services/licenseSigner'
import {
  generateEcdsaKey,
  generateKey as generateLegacyHmacKey,
} from '../server/src/keyGen'

describe('ECDSA NIST P-256 Asymmetric License Engine', () => {
  const sampleHwid = 'HWID-WIN-A1B2-C3D4-E5F6'

  // ─── 1. Basic Verification & Tiers ──────────────────────────────────────────
  describe('Valid License Verification', () => {
    it('should successfully verify a valid Pro license signed with the official ECDSA key', () => {
      const futureExpiry = Date.now() + 365 * 24 * 3600 * 1000 // 1 year
      const payload: EcdsaLicensePayload = {
        tier: 'pro',
        expiresAt: futureExpiry,
        hwid: sampleHwid,
        features: ['offline', 'cloud_sync', 'api_access'],
        customer: 'alice@example.com',
      }

      const licenseKey = generateEcdsaLicense(payload)
      expect(licenseKey).toMatch(/^ZENDEV(-[A-Z0-9]{1,5})+$/)

      const result = verifyEcdsaLicense(licenseKey, sampleHwid)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.tier).toBe('pro')
        expect(result.expiresAt).toBe(futureExpiry)
        expect(result.hwid).toBe(sampleHwid)
        expect(result.features).toEqual(['offline', 'cloud_sync', 'api_access'])
        expect(result.isLegacyHmac).toBe(false)
        expect(result.payload.customer).toBe('alice@example.com')
      }
    })

    it('should successfully verify a Lifetime license (expiresAt: 0)', () => {
      const payload: EcdsaLicensePayload = {
        tier: 'lifetime',
        expiresAt: 0,
        features: ['offline', 'cloud_sync', 'unlimited_vault', 'priority_support'],
      }

      const licenseKey = generateEcdsaLicense(payload)
      const result = verifyEcdsaLicense(licenseKey)

      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.tier).toBe('lifetime')
        expect(result.expiresAt).toBe(0)
        expect(result.features).toContain('unlimited_vault')
        expect(result.isLegacyHmac).toBe(false)
      }
    })

    it('should successfully verify a Team license created via server/src/keyGen generateEcdsaKey', () => {
      const futureExpiry = Date.now() + 180 * 24 * 3600 * 1000
      const licenseKey = generateEcdsaKey('team', futureExpiry, sampleHwid, ['team_collaboration', 'offline'])

      const result = verifyEcdsaLicense(licenseKey, sampleHwid)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.tier).toBe('team')
        expect(result.features).toContain('team_collaboration')
      }
    })
  })

  // ─── 2. HWID Device-Locking Tests ───────────────────────────────────────────
  describe('Hardware ID (HWID) Device-Locking', () => {
    it('should pass when current HWID matches the license HWID', () => {
      const licenseKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 100000,
        hwid: 'MACHINE-01-SECURE',
      })

      const result = verifyEcdsaLicense(licenseKey, 'MACHINE-01-SECURE')
      expect(result.valid).toBe(true)
    })

    it('should pass with case-insensitive HWID comparison', () => {
      const licenseKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 100000,
        hwid: 'machine-01-secure',
      })

      const result = verifyEcdsaLicense(licenseKey, 'MACHINE-01-SECURE')
      expect(result.valid).toBe(true)
    })

    it('should reject when HWID does not match (wrong HWID)', () => {
      const licenseKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 100000,
        hwid: 'MACHINE-AUTHORIZED-A',
      })

      const result = verifyEcdsaLicense(licenseKey, 'MACHINE-ROGUE-B')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toContain('Hardware ID mismatch')
      }
    })

    it('should reject when license is locked to HWID but caller provided no HWID', () => {
      const licenseKey = generateEcdsaLicense({
        tier: 'team',
        expiresAt: Date.now() + 100000,
        hwid: 'MACHINE-LOCKED-01',
      })

      const result = verifyEcdsaLicense(licenseKey)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toContain('License requires hardware ID verification')
      }
    })

    it('should allow any HWID or empty HWID if license is device-agnostic (hwid is undefined or "*")', () => {
      const keyWildcard = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 100000,
        hwid: '*',
      })
      const keyNoHwid = generateEcdsaLicense({
        tier: 'lifetime',
        expiresAt: 0,
      })

      expect(verifyEcdsaLicense(keyWildcard, 'ANY-MACHINE-XYZ').valid).toBe(true)
      expect(verifyEcdsaLicense(keyWildcard, undefined).valid).toBe(true)
      expect(verifyEcdsaLicense(keyNoHwid, 'RANDOM-LAPTOP-123').valid).toBe(true)
      expect(verifyEcdsaLicense(keyNoHwid, undefined).valid).toBe(true)
    })
  })

  // ─── 3. Expiration Tests ───────────────────────────────────────────────────
  describe('License Expiration Enforcement', () => {
    it('should reject a license whose expiration timestamp is in the past', () => {
      const expiredTimestamp = Date.now() - (7 * 24 * 3600 * 1000) // 7 days ago
      const licenseKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: expiredTimestamp,
      })

      const result = verifyEcdsaLicense(licenseKey)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toBe('License key has expired')
      }
    })

    it('should accept a license whose expiration timestamp is in the future', () => {
      const futureExpiry = Date.now() + 60 * 1000 // 1 minute into future
      const licenseKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: futureExpiry,
      })

      const result = verifyEcdsaLicense(licenseKey)
      expect(result.valid).toBe(true)
    })
  })

  // ─── 4. Cryptographic Tamper-Resistance & Security ──────────────────────────
  describe('Cryptographic Signature Tampering & Forgery Mitigation', () => {
    it('should reject a license signed with an unauthorized/rogue ECDSA private key', () => {
      // Generate a rogue keypair
      const roguePair = generateFreshKeyPair()
      const rogueLicenseKey = generateEcdsaLicense(
        {
          tier: 'lifetime',
          expiresAt: 0,
          features: ['all'],
        },
        roguePair.privateKey
      )

      // Verify against the official client public key
      const result = verifyEcdsaLicense(rogueLicenseKey)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toContain('Cryptographic signature verification failed')
      }

      // But should verify if the rogue public key is explicitly passed
      const validWithRoguePub = verifyEcdsaLicense(rogueLicenseKey, undefined, roguePair.publicKey)
      expect(validWithRoguePub.valid).toBe(true)
    })

    it('should reject a license if characters in the Base32 payload/signature are tampered', () => {
      const originalKey = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 1000000,
      })

      // Flip a character in the middle
      const chars = originalKey.split('')
      const midIdx = Math.floor(chars.length / 2)
      chars[midIdx] = chars[midIdx] === 'A' ? 'B' : 'A'
      const tamperedKey = chars.join('')

      const result = verifyEcdsaLicense(tamperedKey)
      expect(result.valid).toBe(false)
    })

    it('should reject completely malformed strings and random noise', () => {
      expect(verifyEcdsaLicense('').valid).toBe(false)
      expect(verifyEcdsaLicense('ZENDEV-').valid).toBe(false)
      expect(verifyEcdsaLicense('ZENDEV-SHORT').valid).toBe(false)
      expect(verifyEcdsaLicense('NOT-A-LICENSE-KEY').valid).toBe(false)
      expect(verifyEcdsaLicense('ZENDEV-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ').valid).toBe(false)
    })
  })

  // ─── 5. Formatting & Permissive Normalization ───────────────────────────────
  describe('Key Formatting & Transcription Robustness', () => {
    it('should accept keys without dashes (solid Base32)', () => {
      const dashedKey = generateEcdsaLicense({
        tier: 'lifetime',
        expiresAt: 0,
      })
      const solidKey = dashedKey.replace(/-/g, '') // ZENDEV...
      const solidResult = verifyEcdsaLicense(`ZENDEV-${dashedKey.replace(/^ZENDEV-/, '').replace(/-/g, '')}`)
      expect(solidResult.valid).toBe(true)
    })

    it('should accept lowercase and whitespace-padded inputs', () => {
      const key = generateEcdsaLicense({
        tier: 'pro',
        expiresAt: Date.now() + 100000,
      })
      const messyKey = `  \n  ${key.toLowerCase()}  \t `
      const result = verifyEcdsaLicense(messyKey)
      expect(result.valid).toBe(true)
    })
  })

  // ─── 6. Backward Compatibility (Legacy HMAC Fallback) ───────────────────────
  describe('Legacy HMAC License Fallback (Backward Compatibility)', () => {
    const TEST_HMAC_SECRET = process.env['NEXUS_LICENSE_SECRET'] || 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

    it('should transparently validate a valid legacy Lifetime HMAC key', () => {
      // Generate legacy HMAC key
      const legacyKey = generateLegacyHmacKey('lifetime', 0, TEST_HMAC_SECRET)
      expect(legacyKey).toMatch(/^NEXUS-[A-Z0-9]{5}(-[A-Z0-9]{5}){3}$/)

      const result = verifyEcdsaLicense(legacyKey)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.tier).toBe('lifetime')
        expect(result.expiresAt).toBe(0)
        expect(result.isLegacyHmac).toBe(true)
        expect(result.features).toBeDefined()
      }
    })

    it('should transparently validate a valid legacy Pro HMAC key with future expiry', () => {
      const legacyKey = generateLegacyHmacKey('pro', Date.now() + 100 * 24 * 3600 * 1000, TEST_HMAC_SECRET)
      const result = verifyEcdsaLicense(legacyKey)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.tier).toBe('pro')
        expect(result.isLegacyHmac).toBe(true)
        expect(result.expiresAt).toBeGreaterThan(Date.now())
      }
    })

    it('should reject a tampered legacy HMAC key', () => {
      const legacyKey = generateLegacyHmacKey('pro', Date.now() + 100000, TEST_HMAC_SECRET)
      const tampered = legacyKey.slice(0, -1) + (legacyKey.slice(-1) === 'A' ? 'B' : 'A')

      const result = verifyEcdsaLicense(tampered)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toBe('Cryptographic signature mismatch')
      }
    })
  })

  // ─── 7. Base32 Codec Unit Tests ─────────────────────────────────────────────
  describe('Base32 Codec Integrity', () => {
    it('should accurately round-trip arbitrary binary buffers', () => {
      const testBuffer = Buffer.from('ZenDev Cryptographic License Security Engine 2026')
      const encoded = base32Encode(testBuffer)
      const decoded = base32Decode(encoded)
      expect(decoded.equals(testBuffer)).toBe(true)
    })

    it('should unpack binary envelopes accurately', () => {
      const payload: EcdsaLicensePayload = {
        tier: 'team',
        expiresAt: 123456789,
        hwid: 'HWID-UNIT-TEST',
        features: ['vault', 'export'],
      }
      const fakeSig = Buffer.alloc(70, 0xAA)
      const packed = packEnvelope(payload, fakeSig)
      const unpacked = unpackEnvelope(packed)

      expect(unpacked).not.toBeNull()
      if (unpacked) {
        expect(unpacked.version).toBe(1)
        expect(unpacked.payload.tier).toBe('team')
        expect(unpacked.payload.hwid).toBe('HWID-UNIT-TEST')
        expect(unpacked.signature.equals(fakeSig)).toBe(true)
      }
    })
  })
})
