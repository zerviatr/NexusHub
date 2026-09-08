/**
 * src/main/ipc/license.ts
 * IPC handlers for license activation, status check, and deactivation.
 *
 * Channels:
 *   license:check      → LicenseStatusPayload   (called on every app start)
 *   license:activate   → LicenseActivateResult  (validate + store + online register)
 *   license:deactivate → void                   (clear stored + online deregister)
 *   license:bgVerify   → void                   (24h background heartbeat)
 */
import { ipcMain } from 'electron'
import {
  validateKey,
  storeLicense,
  loadLicense,
  clearLicense,
  checkStoredLicense,
  getDeviceId,
  activateOnline,
  verifyOnline,
  deactivateOnline,
  type LicenseData,
  type LicenseTier,
} from '../licenseStore'

export type LicenseStatusPayload =
  | { status: 'active';   tier: string; expiresAt: number; key: string }
  | { status: 'inactive' }
  | { status: 'expired';  tier: string }

export type LicenseActivateResult =
  | { success: true;  tier: string; expiresAt: number }
  | { success: false; reason: string }

/** 24h in ms — how long we allow offline grace before requiring reverification */
const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000

export function registerLicenseIPC(): void {
  // ─── Check stored license (called on startup) ──────────────────────────
  ipcMain.handle('license:check', async (): Promise<LicenseStatusPayload> => {
    const stored = loadLicense()
    if (!stored) return { status: 'inactive' }

    const result = checkStoredLicense()
    if (!result || !result.valid) {
      clearLicense()
      return { status: 'inactive' }
    }

    if (result.expiresAt !== 0 && Date.now() > result.expiresAt) {
      return { status: 'expired', tier: stored.tier }
    }

    // Background: try an online verify — but don't block the UI
    // If it fails (network down), allow offline for up to OFFLINE_GRACE_MS
    setImmediate(async () => {
      const deviceId = getDeviceId()
      const online   = await verifyOnline(stored.key, deviceId)

      if (!online.ok && !online.networkError) {
        // Server says key is invalid/revoked — clear local license
        console.log('[license] Online verify failed (revoked?), clearing:', online.reason)
        clearLicense()
        // Notify renderer to re-check
        ipcMain.emit('license:revoked')
      } else if (online.ok) {
        // Update stored data with fresh server response
        const updated: LicenseData = {
          ...stored,
          tier:      online.tier as LicenseTier,
          expiresAt: online.expiresAt,
        }
        storeLicense(updated)
      }
    })

    return {
      status:    'active',
      tier:      stored.tier,
      expiresAt: stored.expiresAt,
      key:       stored.key,
    }
  })

  // ─── Activate: validate key, online register, then persist ────────────
  ipcMain.handle('license:activate', async (_, rawKey: string): Promise<LicenseActivateResult> => {
    if (!rawKey || typeof rawKey !== 'string') {
      return { success: false, reason: 'No key provided' }
    }

    if (rawKey.length > 64) {
      return { success: false, reason: 'Invalid key format' }
    }

    // Step 1: Local HMAC validation (fast, offline)
    const localResult = validateKey(rawKey)
    if (!localResult.valid) {
      return { success: false, reason: localResult.reason }
    }

    // Step 2: Online registration (required for first activation)
    const deviceId    = getDeviceId()
    const onlineResult = await activateOnline(rawKey.trim().toUpperCase(), deviceId)

    if (!onlineResult.ok) {
      if (onlineResult.networkError) {
        return { success: false, reason: 'Internet connection required to activate your license for the first time.' }
      }
      return { success: false, reason: onlineResult.reason }
    }

    // Step 3: Persist locally
    const data: LicenseData = {
      key:         rawKey.trim().toUpperCase(),
      tier:        onlineResult.tier as LicenseTier,
      expiresAt:   onlineResult.expiresAt,
      activatedAt: Date.now(),
    }

    storeLicense(data)

    return {
      success:   true,
      tier:      onlineResult.tier,
      expiresAt: onlineResult.expiresAt,
    }
  })

  // ─── Deactivate: clear locally + free server slot ─────────────────────
  ipcMain.handle('license:deactivate', async (): Promise<void> => {
    const stored = loadLicense()
    if (stored) {
      const deviceId = getDeviceId()
      await deactivateOnline(stored.key, deviceId)
    }
    clearLicense()
  })

  // ─── Background verify (called every 24h by renderer) ─────────────────
  ipcMain.handle('license:bgVerify', async (): Promise<{ valid: boolean; reason?: string }> => {
    const stored = loadLicense()
    if (!stored) return { valid: false, reason: 'No license stored' }

    const deviceId = getDeviceId()
    const result   = await verifyOnline(stored.key, deviceId)

    if (!result.ok && !result.networkError) {
      // Revoked remotely — clear local license
      clearLicense()
      return { valid: false, reason: result.reason }
    }

    if (result.ok) {
      // Refresh stored data
      storeLicense({ ...stored, tier: result.tier as LicenseTier, expiresAt: result.expiresAt })
      return { valid: true }
    }

    // Network error — allow offline grace
    return { valid: true, reason: 'offline-grace' }
  })
}
