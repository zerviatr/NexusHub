/**
 * src/shared/licenseValidator.ts
 *
 * Decoupled, runtime-agnostic cryptographic license validator for ZenDev.
 * Works uniformly in Electron main process, Node.js background workers, and Vitest test suites.
 *
 * KEY FORMAT: NEXUS-TEEEH-HHHHH-HHHHH-HHHHH (25 visible chars + 4 dashes)
 *   T     [1 char]  Tier: F=Free, P=Pro, T=Team, L=Lifetime
 *   EEE   [3 chars] Hex-encoded months since 2024-01-01 (0x000 = lifetime)
 *   H×16  [16 chars] Cryptographic HMAC signature (Dual mode: 4-char salt + 12-char HMAC, or legacy 16-char HMAC)
 */

import { createHmac } from 'crypto'

export type LicenseTier = 'free' | 'pro' | 'team' | 'lifetime'

export const TIER_MAP: Record<string, LicenseTier> = {
  F: 'free',
  P: 'pro',
  T: 'team',
  L: 'lifetime',
}

export interface ValidatedLicense {
  valid: true
  tier: LicenseTier
  expiresAt: number
}

export interface InvalidLicense {
  valid: false
  reason: string
}

export type ValidationResult = ValidatedLicense | InvalidLicense

export const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
export const MONTH_MS = 30.44 * 24 * 3600 * 1000

export const DEFAULT_LICENSE_SECRET =
  process.env.NEXUS_LICENSE_SECRET ||
  process.env['NEXUS_LICENSE_SECRET'] ||
  'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

/**
 * Validates a ZenDev license key against the HMAC secret.
 * Decoupled from filesystem, Electron APIs, and UI state.
 */
export function validateLicenseKey(rawKey: string, secret: string = DEFAULT_LICENSE_SECRET): ValidationResult {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, reason: 'License key is missing or empty' }
  }

  // Normalise: strip everything except alphanumeric, uppercase
  const stripped = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Must start with NEXUS + exactly 20 alphanumeric chars = 25 total
  if (!stripped.startsWith('NEXUS') || stripped.length !== 25) {
    return { valid: false, reason: 'Invalid key format' }
  }

  const code = stripped.slice(5) // 20 chars

  const T = code[0]          // tier char
  const EEE = code.slice(1, 4) // 3-char hex expiry months
  const H = code.slice(4)    // 16-char HMAC fragment

  // Validate tier
  const tier = TIER_MAP[T]
  if (!tier) {
    return { valid: false, reason: 'Unknown license tier' }
  }

  // Dual-mode cryptographic signature check:
  // 1. High-Entropy Format: SSSS (4 hex chars entropy) + H12 (12 hex chars HMAC of T+EEE+SSSS)
  const SSSS = H.slice(0, 4)
  const H12 = H.slice(4)
  const expectedH12 = createHmac('sha256', secret)
    .update(`${T}${EEE}${SSSS}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()

  // 2. Legacy Format: 16-char HMAC of T+EEE
  const expectedLegacy = createHmac('sha256', secret)
    .update(`${T}${EEE}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()

  const isValidEntropy = H12 === expectedH12
  const isValidLegacy = H === expectedLegacy

  if (!isValidEntropy && !isValidLegacy) {
    return { valid: false, reason: 'Cryptographic signature mismatch' }
  }

  // Decode expiry
  let expiresAt = 0
  if (EEE !== '000') {
    const months = parseInt(EEE, 16)
    expiresAt = JAN_2024_MS + months * MONTH_MS
  }

  // Check expiry (0 = lifetime, never expires)
  if (expiresAt !== 0 && Date.now() > expiresAt) {
    return { valid: false, reason: 'License key has expired' }
  }

  return { valid: true, tier, expiresAt }
}

/**
 * Formats a 25-character normalized key into standard 5-part dash format:
 * NEXUS-XXXXX-XXXXX-XXXXX-XXXXX
 */
export function formatLicenseKey(compactKey: string): string {
  const stripped = compactKey.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (stripped.length !== 25) return compactKey
  return `${stripped.slice(0, 5)}-${stripped.slice(5, 10)}-${stripped.slice(10, 15)}-${stripped.slice(15, 20)}-${stripped.slice(20, 25)}`
}
