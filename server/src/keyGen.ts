/**
 * server/src/keyGen.ts
 *
 * License key generation — mirrors the validation logic in
 * Electron's licenseStore.ts so both sides share the same format.
 *
 * KEY FORMAT: NEXUS-TEEEH-HHHHH-HHHHH-HHHHH   (25 base chars + 4 dashes)
 *   T    [1 char]  Tier: F=Free  P=Pro  T=Team  L=Lifetime
 *   EEE  [3 chars] Hex months-since-2024-01-01 (000 = never expires)
 *   H×16 [16 chars] HMAC-SHA256(T+EEE, SECRET)[0..16].hex().upper()
 */
import { createHmac } from 'crypto'

const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
const MONTH_MS    = 30.44 * 24 * 3600 * 1000

const TIER_CHAR: Record<string, string> = {
  free:     'F',
  pro:      'P',
  team:     'T',
  lifetime: 'L',
}

/**
 * Generate a license key.
 *
 * @param tier       - 'free' | 'pro' | 'team' | 'lifetime'
 * @param expiresAt  - Unix ms timestamp, 0 = never expires (lifetime)
 * @param secret     - HMAC secret (NEXUS_LICENSE_SECRET env var)
 */
export function generateKey(
  tier: string,
  expiresAt: number,
  secret: string,
): string {
  const T = TIER_CHAR[tier]
  if (!T) throw new Error(`Unknown tier: ${tier}`)

  // Encode expiry as hex months from Jan 2024
  let EEE = '000'
  if (expiresAt !== 0) {
    const months = Math.round((expiresAt - JAN_2024_MS) / MONTH_MS)
    EEE = months.toString(16).padStart(3, '0').toUpperCase()
  }

  const payload = `${T}${EEE}`
  const hmac    = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()

  // Format: NEXUS-TEEEH-HHHHH-HHHHH-HHHHH
  const raw = `NEXUS${T}${EEE}${hmac}` // 25 chars
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
