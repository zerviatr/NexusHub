/**
 * src/main/licenseStore.ts
 *
 * Handles offline HMAC-SHA256 license key validation and
 * encrypted persistence via Electron's safeStorage API.
 *
 * KEY FORMAT: NEXUS-TEEEH-HHHHH-HHHHH-HHHHH   (25 visible chars + 4 dashes)
 *   T    [1 char]  Tier: F=Free  P=Pro  T=Team  L=Lifetime
 *   EEE  [3 chars] Hex-encoded months since 2024-01-01 (0x000 = never expires)
 *   H×16 [16 chars] HMAC-SHA256(T+EEE, SECRET)[0..8].hex().upper()
 *
 * SECURITY NOTE:
 *   The HMAC secret is read from NEXUS_LICENSE_SECRET at build time.
 *   In production, inject it via CI environment variable — never commit
 *   the real secret to source control. The dev fallback below is public
 *   and only suitable for local testing.
 */
import { safeStorage, app }    from 'electron'
import { createHmac }          from 'crypto'
import path                    from 'path'
import fs                      from 'fs'
import { machineIdSync }       from 'node-machine-id'

// ─── Config ──────────────────────────────────────────────────────────────────
const SECRET: string =
  process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

/** Base URL for the license API server. Set NEXUS_API_URL in .env at build time. */
const API_URL: string =
  process.env['NEXUS_API_URL'] ?? 'http://localhost:3000'

// ─── Types ───────────────────────────────────────────────────────────────────
export type LicenseTier = 'free' | 'pro' | 'team' | 'lifetime'

export type LicenseData = {
  key: string
  tier: LicenseTier
  /** Unix ms timestamp — 0 means never expires */
  expiresAt: number
  activatedAt: number
}

export type ValidationResult =
  | { valid: true;  tier: LicenseTier; expiresAt: number }
  | { valid: false; reason: string }

// ─── Constants ───────────────────────────────────────────────────────────────
const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
const MONTH_MS    = 30.44 * 24 * 3600 * 1000
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.enc')

const TIER_MAP: Record<string, LicenseTier> = {
  F: 'free',
  P: 'pro',
  T: 'team',
  L: 'lifetime',
}

// ─── Key validation ───────────────────────────────────────────────────────────
export function validateKey(rawKey: string): ValidationResult {
  // Normalise: strip everything except alphanumeric, uppercase
  const stripped = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Must start with NEXUS + exactly 20 alphanumeric chars = 25 total
  if (!stripped.startsWith('NEXUS') || stripped.length !== 25) {
    return { valid: false, reason: 'Invalid key format' }
  }

  const code = stripped.slice(5) // 20 chars

  const T   = code[0]           // tier char
  const EEE = code.slice(1, 4)  // 3-char hex expiry months
  const H   = code.slice(4)     // 16-char HMAC fragment

  // Validate tier
  const tier = TIER_MAP[T]
  if (!tier) return { valid: false, reason: 'Unknown license tier' }

  // Validate HMAC
  const payload  = `${T}${EEE}`
  const expected = createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()

  if (H !== expected) {
    return { valid: false, reason: 'Invalid license key' }
  }

  // Decode expiry
  let expiresAt = 0
  if (EEE !== '000') {
    const months   = parseInt(EEE, 16)
    expiresAt      = JAN_2024_MS + months * MONTH_MS
  }

  // Check expiry (0 = lifetime, never expires)
  if (expiresAt !== 0 && Date.now() > expiresAt) {
    return { valid: false, reason: 'License key has expired' }
  }

  return { valid: true, tier, expiresAt }
}

// ─── safeStorage persistence ─────────────────────────────────────────────────
function canUseStorage(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function storeLicense(data: LicenseData): void {
  if (!canUseStorage()) {
    // Fallback: plain JSON (dev only — safeStorage not available without OS keychain)
    fs.writeFileSync(LICENSE_FILE + '.dev', JSON.stringify(data), 'utf8')
    return
  }
  const json      = JSON.stringify(data)
  const encrypted = safeStorage.encryptString(json)
  fs.writeFileSync(LICENSE_FILE, encrypted)
}

export function loadLicense(): LicenseData | null {
  // Try encrypted first
  if (fs.existsSync(LICENSE_FILE) && canUseStorage()) {
    try {
      const buf  = fs.readFileSync(LICENSE_FILE)
      const json = safeStorage.decryptString(buf)
      return JSON.parse(json) as LicenseData
    } catch {
      // Corrupted or wrong machine — treat as unlicensed
      fs.rmSync(LICENSE_FILE, { force: true })
    }
  }

  // Dev fallback
  const devFile = LICENSE_FILE + '.dev'
  if (fs.existsSync(devFile)) {
    try {
      return JSON.parse(fs.readFileSync(devFile, 'utf8')) as LicenseData
    } catch {
      fs.rmSync(devFile, { force: true })
    }
  }

  return null
}

export function clearLicense(): void {
  fs.rmSync(LICENSE_FILE,          { force: true })
  fs.rmSync(LICENSE_FILE + '.dev', { force: true })
}

/** Check if a stored license is currently valid (re-validates key + expiry). */
export function checkStoredLicense(): ValidationResult | null {
  const stored = loadLicense()
  if (!stored) return null
  return validateKey(stored.key)
}

// ─── Device fingerprint ───────────────────────────────────────────────────────
/**
 * Returns a stable, anonymous device identifier.
 * Uses node-machine-id under the hood — hashed so the raw machine ID
 * never leaves the machine.
 */
export function getDeviceId(): string {
  try {
    const raw = machineIdSync()
    return createHmac('sha256', 'nexus-device-salt').update(raw).digest('hex')
  } catch {
    // Fallback: hash username + platform
    const fallback = `${process.env['USERNAME'] ?? 'unknown'}-${process.platform}`
    return createHmac('sha256', 'nexus-device-salt').update(fallback).digest('hex')
  }
}

// ─── Online verify ────────────────────────────────────────────────────────────
export type OnlineVerifyResult =
  | { ok: true;  tier: string; expiresAt: number }
  | { ok: false; reason: string; networkError?: boolean }

/**
 * Verify the key + device against the API server.
 * Called on first activation and every 24 hours in the background.
 * Returns `{ ok: false, networkError: true }` if the server is unreachable
 * — the caller can decide whether to allow offline grace period.
 */
export async function verifyOnline(
  key: string,
  deviceId: string,
): Promise<OnlineVerifyResult> {
  try {
    const res = await fetch(`${API_URL}/api/license/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, deviceId }),
      signal:  AbortSignal.timeout(8000),
    })
    const json = await res.json() as any
    if (json.valid) {
      return { ok: true, tier: json.tier, expiresAt: json.expiresAt }
    }
    return { ok: false, reason: json.reason ?? 'Verification failed' }
  } catch (err: any) {
    return { ok: false, reason: 'Network error', networkError: true }
  }
}

/**
 * Activate the key on this device via the API server.
 * Must succeed for first-time activation (requires internet).
 */
export async function activateOnline(
  key: string,
  deviceId: string,
): Promise<OnlineVerifyResult> {
  try {
    const res = await fetch(`${API_URL}/api/license/activate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, deviceId }),
      signal:  AbortSignal.timeout(8000),
    })
    const json = await res.json() as any
    if (json.success) {
      return { ok: true, tier: json.tier, expiresAt: json.expiresAt }
    }
    return { ok: false, reason: json.reason ?? 'Activation failed' }
  } catch {
    return { ok: false, reason: 'Network error — internet required for first activation', networkError: true }
  }
}

/**
 * Deactivate this device on the server (frees up an activation slot).
 * Best-effort — ignore network errors.
 */
export async function deactivateOnline(
  key: string,
  deviceId: string,
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/license/deactivate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, deviceId }),
      signal:  AbortSignal.timeout(5000),
    })
  } catch {
    // Ignore — server might be down, slot will be reclaimed on next verify
  }
}
