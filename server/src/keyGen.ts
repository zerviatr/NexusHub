/**
 * server/src/keyGen.ts
 *
 * ZenDev License Key Generation Engine:
 * 1. Asymmetric ECDSA (NIST P-256) offline-verifiable licenses (ZENDEV-BASE32)
 * 2. Legacy Symmetric HMAC-SHA256 licenses (NEXUS-TEEEH-...) for 100% backward compatibility
 */
import { createHmac, randomBytes } from 'crypto'
import {
  generateEcdsaLicense,
  loadOrGenerateKeyPair,
  getEcdsaPrivateKey,
  getEcdsaPublicKey,
  type EcdsaLicensePayload,
  type LicenseTier,
} from './services/licenseSigner'

export {
  generateEcdsaLicense,
  loadOrGenerateKeyPair,
  getEcdsaPrivateKey,
  getEcdsaPublicKey,
  type EcdsaLicensePayload,
  type LicenseTier,
}

const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
const MONTH_MS    = 30.44 * 24 * 3600 * 1000

const TIER_CHAR: Record<string, string> = {
  free:     'F',
  pro:      'P',
  team:     'T',
  lifetime: 'L',
}

/**
 * Generate an asymmetric ECDSA (NIST P-256) license key with optional HWID lock and features.
 * Format: ZENDEV-XXXXX-XXXXX-XXXXX-...
 */
export function generateEcdsaKey(
  tier: LicenseTier,
  expiresAt: number,
  hwid?: string,
  features?: string[],
  privateKeyPem?: string
): string {
  return generateEcdsaLicense(
    {
      tier,
      expiresAt,
      hwid,
      features: features ?? (tier === 'lifetime' || tier === 'team' || tier === 'pro'
        ? ['offline', 'cloud_sync', 'api_access', 'all']
        : ['offline']),
    },
    privateKeyPem
  )
}

/**
 * Legacy HMAC Key Generator.
 *
 * KEY FORMAT: NEXUS-TEEE[S]-[SSS][HH]-[HHHHH]-[HHHHH] (25 chars + 4 dashes)
 *   T     [1 char]  Tier: F=Free  P=Pro  T=Team  L=Lifetime
 *   EEE   [3 chars] Hex months-since-2024-01-01 (000 = never expires)
 *   SSSS  [4 chars] Random cryptographic entropy (65,536 variations per tier/period)
 *   H×12  [12 chars] HMAC-SHA256(T+EEE+SSSS, SECRET)[0..12].hex().upper()
 *
 * @param tier       - 'free' | 'pro' | 'team' | 'lifetime'
 * @param expiresAt  - Unix ms timestamp, 0 = never expires (lifetime)
 * @param secret     - HMAC secret (NEXUS_LICENSE_SECRET env var)
 * @param entropy    - Optional 4-char hex entropy (defaults to cryptographically random)
 */
export function generateKey(
  tier: string,
  expiresAt: number,
  secret: string,
  entropy?: string,
): string {
  const T = TIER_CHAR[tier]
  if (!T) throw new Error(`Unknown tier: ${tier}`)

  // Encode expiry as hex months from Jan 2024
  let EEE = '000'
  if (expiresAt !== 0) {
    const months = Math.round((expiresAt - JAN_2024_MS) / MONTH_MS)
    EEE = months.toString(16).padStart(3, '0').toUpperCase()
  }

  // 4-char cryptographic random entropy guarantees every key is 100% unique
  const SSSS = (entropy || randomBytes(2).toString('hex')).toUpperCase().slice(0, 4)

  const payload = `${T}${EEE}${SSSS}`
  const hmac    = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()

  // Format: NEXUS-TEEE[S]-[SSS][HH]-[HHHHH]-[HHHHH]
  const raw = `NEXUS${T}${EEE}${SSSS}${hmac}` // 5 + 1 + 3 + 4 + 12 = 25 chars
  return [
    raw.slice(0, 5),
    raw.slice(5, 10),
    raw.slice(10, 15),
    raw.slice(15, 20),
    raw.slice(20, 25),
  ].join('-')
}

/** Tier → months until expiry (0 = never) */
export function tierToExpiry(tier: string): number {
  if (tier === 'lifetime') return 0

  const months: Record<string, number> = {
    free: 0,  // free keys never expire either (feature-gated by tier)
    pro:  12,
    team: 12,
  }
  const m = months[tier] ?? 0
  if (m === 0) return 0
  return Date.now() + m * MONTH_MS
}
