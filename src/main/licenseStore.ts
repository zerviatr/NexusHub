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
import path                    from 'path'
import fs                      from 'fs'
import { createHmac }          from 'crypto'
import { machineIdSync }       from 'node-machine-id'

// ─── Config ──────────────────────────────────────────────────────────────────
// Build-time / runtime secret alignment with the licensing server
const SECRET: string =
  process.env.NEXUS_LICENSE_SECRET ||
  process.env['NEXUS_LICENSE_SECRET'] ||
  'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

/** Base URL for the license API server. */
const API_URL: string = 'https://zendev-production-4a5b.up.railway.app'

import {
  validateLicenseKey,
  LicenseTier,
  ValidationResult,
  TIER_MAP,
  JAN_2024_MS,
  MONTH_MS,
} from '../shared/licenseValidator'

export type { LicenseTier, ValidationResult }

export type LicenseData = {
  key: string
  tier: LicenseTier
  /** Unix ms timestamp — 0 means never expires */
  expiresAt: number
  activatedAt: number
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.enc')
const TRIAL_FILE   = path.join(app.getPath('userData'), 'trial.enc')
const TRIAL_DURATION_MS = 72 * 60 * 60 * 1000 // 72 hours Pro trial

// ─── Key validation ───────────────────────────────────────────────────────────
export function validateKey(rawKey: string): ValidationResult {
  return validateLicenseKey(rawKey, SECRET, getDeviceId())
}

// ─── safeStorage persistence ─────────────────────────────────────────────────
function canUseStorage(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function storeLicense(data: LicenseData): void {
  if (!canUseStorage()) {
    if (app.isPackaged) {
      console.error('[license] safeStorage encryption unavailable in production!')
      return
    }
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

  // Dev fallback only when NOT packaged
  if (!app.isPackaged) {
    const devFile = LICENSE_FILE + '.dev'
    if (fs.existsSync(devFile)) {
      try {
        return JSON.parse(fs.readFileSync(devFile, 'utf8')) as LicenseData
      } catch {
        fs.rmSync(devFile, { force: true })
      }
    }
  }

  return null
}

export function clearLicense(): void {
  fs.rmSync(LICENSE_FILE, { force: true })
  if (!app.isPackaged) {
    fs.rmSync(LICENSE_FILE + '.dev', { force: true })
  }
}

/** Check if a stored license is currently valid (re-validates key + expiry). */
export function checkStoredLicense(): ValidationResult | null {
  const stored = loadLicense()
  if (!stored) return null
  return validateKey(stored.key)
}

export interface TrialStatus {
  active: boolean
  isExpired: boolean
  expiresAt: number
  hoursLeft: number
}

/** Check or initiate a 72-hour Pro Trial for this device. */
export function getOrCreateTrial(): TrialStatus {
  const now = Date.now()
  let trialData: { startedAt: number; expiresAt: number; deviceId: string } | null = null

  if (fs.existsSync(TRIAL_FILE) && canUseStorage()) {
    try {
      const buf = fs.readFileSync(TRIAL_FILE)
      const json = safeStorage.decryptString(buf)
      trialData = JSON.parse(json)
    } catch {}
  } else if (!app.isPackaged && fs.existsSync(TRIAL_FILE + '.dev')) {
    try {
      trialData = JSON.parse(fs.readFileSync(TRIAL_FILE + '.dev', 'utf8'))
    } catch {}
  }

  if (!trialData) {
    // First-time launch: initialize 72-hour Pro trial
    trialData = {
      startedAt: now,
      expiresAt: now + TRIAL_DURATION_MS,
      deviceId: getDeviceId(),
    }
    const json = JSON.stringify(trialData)
    if (canUseStorage()) {
      fs.writeFileSync(TRIAL_FILE, safeStorage.encryptString(json))
    } else if (!app.isPackaged) {
      fs.writeFileSync(TRIAL_FILE + '.dev', json, 'utf8')
    }
  }

  const hoursLeft = Math.max(0, Math.ceil((trialData.expiresAt - now) / (60 * 60 * 1000)))
  const active = now < trialData.expiresAt

  return {
    active,
    isExpired: !active,
    expiresAt: trialData.expiresAt,
    hoursLeft,
  }
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
