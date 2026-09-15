/**
 * tests/mfa.test.ts
 *
 * Comprehensive Integration Test Suite for Enterprise Multi-Factor Authentication (MFA / TOTP)
 * Testing RFC 6238 TOTP engine, Base32 secret codec, 2-phase challenge/verify,
 * replay attack defense, backup codes consumption, and rate limiting lockouts.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac, randomBytes, createHash } from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i])
    if (idx === -1) throw new Error(`Invalid Base32 character: ${clean[i]}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

function generateTotp(secretBase32: string, timeMs: number = Date.now(), periodSec: number = 30): string {
  const key = base32Decode(secretBase32)
  const counter = Math.floor(timeMs / (periodSec * 1000))

  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))

  const hmac = createHmac('sha1', key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 1000000
  return otp.toString().padStart(6, '0')
}

class MfaAuthenticatorService {
  private mfaSecretBase32: string | null = null
  private mfaEnabled: boolean = false
  private usedCounters = new Set<number>()
  private failedAttempts: number = 0
  private lockedUntil: number = 0
  private hashedBackupCodes: Set<string> = new Set()
  private pendingChallenges = new Map<string, { expiresAt: number }>()

  public enableMfa(secretBase32: string, verificationCode: string): { success: boolean; backupCodes?: string[]; error?: string } {
    if (!this.verifyTotp(secretBase32, verificationCode)) {
      return { success: false, error: 'Geçersiz doğrulama kodu. MFA etkinleştirilemedi.' }
    }

    this.mfaSecretBase32 = secretBase32
    this.mfaEnabled = true

    const plainBackupCodes: string[] = []
    this.hashedBackupCodes.clear()

    for (let i = 0; i < 8; i++) {
      const code = `${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`
      plainBackupCodes.push(code)
      const hash = createHash('sha256').update(code).digest('hex')
      this.hashedBackupCodes.add(hash)
    }

    return { success: true, backupCodes: plainBackupCodes }
  }

  public disableMfa(currentCode: string): { success: boolean; error?: string } {
    if (!this.mfaEnabled || !this.mfaSecretBase32) {
      return { success: false, error: 'MFA zaten aktif değil.' }
    }
    if (!this.verifyTotp(this.mfaSecretBase32, currentCode)) {
      return { success: false, error: 'MFA devre dışı bırakılamadı: Kod geçersiz.' }
    }
    this.mfaEnabled = false
    this.mfaSecretBase32 = null
    this.hashedBackupCodes.clear()
    return { success: true }
  }

  public createChallenge(): { challengeToken: string; expiresAt: number } {
    const challengeToken = randomBytes(24).toString('hex')
    const expiresAt = Date.now() + 5 * 60 * 1000
    this.pendingChallenges.set(challengeToken, { expiresAt })
    return { challengeToken, expiresAt }
  }

  public verifyChallenge(
    challengeToken: string,
    userInputCode: string
  ): { success: boolean; error?: string; isBackupCodeUsed?: boolean } {
    const now = Date.now()

    if (this.lockedUntil > now) {
      const waitSec = Math.ceil((this.lockedUntil - now) / 1000)
      return { success: false, error: `Çok fazla hatalı kod denemesi. Lütfen ${waitSec} saniye bekleyin.` }
    }

    const challenge = this.pendingChallenges.get(challengeToken)
    if (!challenge || challenge.expiresAt <= now) {
      if (challenge) this.pendingChallenges.delete(challengeToken)
      return { success: false, error: 'Doğrulama oturumu zaman aşımına uğradı.' }
    }

    const cleanInput = userInputCode.trim().toUpperCase()
    const inputHash = createHash('sha256').update(cleanInput).digest('hex')

    if (this.hashedBackupCodes.has(inputHash)) {
      this.hashedBackupCodes.delete(inputHash)
      this.pendingChallenges.delete(challengeToken)
      this.failedAttempts = 0
      return { success: true, isBackupCodeUsed: true }
    }

    if (!this.mfaSecretBase32) {
      return { success: false, error: 'MFA yapılandırılmamış.' }
    }

    const periodSec = 30
    const currentCounter = Math.floor(now / (periodSec * 1000))
    let matched = false

    for (const offset of [-1, 0, 1]) {
      const checkCounter = currentCounter + offset
      if (this.usedCounters.has(checkCounter)) {
        continue
      }

      const expected = generateTotp(this.mfaSecretBase32, checkCounter * periodSec * 1000, periodSec)
      if (expected === cleanInput) {
        matched = true
        this.usedCounters.add(checkCounter)
        break
      }
    }

    if (matched) {
      this.pendingChallenges.delete(challengeToken)
      this.failedAttempts = 0
      return { success: true }
    } else {
      this.failedAttempts++
      if (this.failedAttempts >= 5) {
        this.lockedUntil = now + 5 * 60 * 1000
      }
      return { success: false, error: 'Geçersiz doğrulama kodu.' }
    }
  }

  public isMfaActive(): boolean {
    return this.mfaEnabled
  }

  public getRemainingBackupCodesCount(): number {
    return this.hashedBackupCodes.size
  }

  private verifyTotp(secret: string, code: string): boolean {
    const clean = code.trim()
    const now = Date.now()
    const currentCounter = Math.floor(now / 30000)

    for (const offset of [-1, 0, 1]) {
      if (generateTotp(secret, (currentCounter + offset) * 30000) === clean) {
        return true
      }
    }
    return false
  }
}

describe('MFA & TOTP Integration Authentication Flow (tests/mfa.test.ts)', () => {
  let mfaService: MfaAuthenticatorService
  let testSecretBase32: string

  beforeEach(() => {
    mfaService = new MfaAuthenticatorService()
    const rawSecret = randomBytes(20)
    testSecretBase32 = base32Encode(rawSecret)
  })

  describe('RFC 6238 TOTP Algorithm & Base32 Codec', () => {
    it('should generate exact 6-digit numeric TOTP codes', () => {
      const code = generateTotp(testSecretBase32)
      expect(code).toMatch(/^\d{6}$/)
    })

    it('should produce identical codes within the same 30-second window', () => {
      const t1 = 1710000000000
      const t2 = 1710000015000

      const code1 = generateTotp(testSecretBase32, t1)
      const code2 = generateTotp(testSecretBase32, t2)
      expect(code1).toBe(code2)
    })

    it('should produce different codes across different 30-second windows', () => {
      const t1 = 1710000000000
      const t2 = 1710000035000

      const code1 = generateTotp(testSecretBase32, t1)
      const code2 = generateTotp(testSecretBase32, t2)
      expect(code1).not.toBe(code2)
    })
  })

  describe('MFA Enrollment & Activation Flow', () => {
    it('should reject enrollment when confirmation TOTP code is incorrect', () => {
      const res = mfaService.enableMfa(testSecretBase32, '000000')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Geçersiz doğrulama kodu')
      expect(mfaService.isMfaActive()).toBe(false)
    })

    it('should successfully enroll MFA with valid initial TOTP code and return 8 backup codes', () => {
      const currentCode = generateTotp(testSecretBase32)
      const res = mfaService.enableMfa(testSecretBase32, currentCode)

      expect(res.success).toBe(true)
      expect(mfaService.isMfaActive()).toBe(true)
      expect(res.backupCodes).toBeDefined()
      expect(res.backupCodes?.length).toBe(8)
      expect(res.backupCodes?.[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
      expect(mfaService.getRemainingBackupCodesCount()).toBe(8)
    })
  })

  describe('Two-Phase Authentication Challenge Lifecycle', () => {
    let backupCodes: string[] = []

    beforeEach(() => {
      const currentCode = generateTotp(testSecretBase32)
      const res = mfaService.enableMfa(testSecretBase32, currentCode)
      backupCodes = res.backupCodes || []
    })

    it('should successfully authenticate when challenge token and matching TOTP code are provided', () => {
      const { challengeToken } = mfaService.createChallenge()
      const validOtp = generateTotp(testSecretBase32)

      const verifyResult = mfaService.verifyChallenge(challengeToken, validOtp)
      expect(verifyResult.success).toBe(true)
      expect(verifyResult.isBackupCodeUsed).toBeUndefined()
    })

    it('should reject authentication on invalid TOTP code', () => {
      const { challengeToken } = mfaService.createChallenge()
      const verifyResult = mfaService.verifyChallenge(challengeToken, '999999')

      expect(verifyResult.success).toBe(false)
      expect(verifyResult.error).toContain('Geçersiz doğrulama kodu')
    })

    it('should prevent replay attacks by rejecting the exact same TOTP code within the same time window', () => {
      const { challengeToken: token1 } = mfaService.createChallenge()
      const validOtp = generateTotp(testSecretBase32)

      const res1 = mfaService.verifyChallenge(token1, validOtp)
      expect(res1.success).toBe(true)

      const { challengeToken: token2 } = mfaService.createChallenge()
      const res2 = mfaService.verifyChallenge(token2, validOtp)
      expect(res2.success).toBe(false)
      expect(res2.error).toContain('Geçersiz doğrulama kodu')
    })

    it('should successfully authenticate using an emergency backup recovery code and consume it', () => {
      const { challengeToken } = mfaService.createChallenge()
      const backupCode = backupCodes[0]

      const res1 = mfaService.verifyChallenge(challengeToken, backupCode)
      expect(res1.success).toBe(true)
      expect(res1.isBackupCodeUsed).toBe(true)
      expect(mfaService.getRemainingBackupCodesCount()).toBe(7)

      const { challengeToken: token2 } = mfaService.createChallenge()
      const res2 = mfaService.verifyChallenge(token2, backupCode)
      expect(res2.success).toBe(false)
    })

    it('should trigger rate limiting lock after 5 consecutive failed MFA attempts', () => {
      for (let i = 0; i < 5; i++) {
        const { challengeToken } = mfaService.createChallenge()
        mfaService.verifyChallenge(challengeToken, `11111${i}`)
      }

      const { challengeToken: lockedToken } = mfaService.createChallenge()
      const validOtp = generateTotp(testSecretBase32)
      const lockedRes = mfaService.verifyChallenge(lockedToken, validOtp)

      expect(lockedRes.success).toBe(false)
      expect(lockedRes.error).toContain('Çok fazla hatalı kod denemesi')
    })

    it('should allow disabling MFA only when a valid TOTP code is provided', () => {
      const failRes = mfaService.disableMfa('123456')
      expect(failRes.success).toBe(false)
      expect(mfaService.isMfaActive()).toBe(true)

      const validOtp = generateTotp(testSecretBase32)
      const successRes = mfaService.disableMfa(validOtp)
      expect(successRes.success).toBe(true)
      expect(mfaService.isMfaActive()).toBe(false)
    })
  })
})
