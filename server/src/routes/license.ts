/**
 * server/src/routes/license.ts
 *
 * REST endpoints consumed by the Electron app:
 *
 *   POST /api/license/activate    — validate key + register device
 *   POST /api/license/verify      — periodic heartbeat check
 *   POST /api/license/deactivate  — free up an activation slot
 */
import { Router, Request, Response } from 'express'
import { createHmac } from 'crypto'
import { getDb } from '../db'
import { notifyKeyActivated } from '../services/notifier'
import { createRateLimiter } from '../middleware/rateLimiter'

export const licenseRouter = Router()

// Rate limiters for anti-piracy and brute-force mitigation
const activateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Çok fazla aktivasyon denemesi yapıldı. Lütfen 1 dakika sonra tekrar deneyin.',
})

const verifyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Lisans doğrulama istek sınırı aşıldı.',
})

const lookupLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Lisans sorgulama istek sınırı aşıldı.',
})

const resetHwidLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Cihaz sıfırlama istek sınırı aşıldı. Lütfen daha sonra tekrar deneyin.',
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hash the raw device ID so we never store plain machine identifiers. */
function hashDevice(rawDeviceId: string): string {
  const secret = process.env['DEVICE_HMAC_SECRET'] || process.env['NEXUS_LICENSE_SECRET'] || 'nexus_device_guard_2026_entropy_key'
  return createHmac('sha256', secret).update(rawDeviceId).digest('hex')
}

async function getLicense(key: string) {
  const db = getDb()
  const res = await db.execute({
    sql:  'SELECT * FROM licenses WHERE key = ?',
    args: [key],
  })
  return res.rows[0] ?? null
}

async function getActivationCount(key: string): Promise<number> {
  const db  = getDb()
  const res = await db.execute({
    sql:  'SELECT COUNT(*) as cnt FROM activations WHERE license_key = ?',
    args: [key],
  })
  return Number(res.rows[0]?.cnt ?? 0)
}

// ─── POST /api/license/activate ──────────────────────────────────────────────
licenseRouter.post('/activate', activateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, deviceId } = req.body as { key?: string; deviceId?: string }

    if (!key || !deviceId) {
      res.status(400).json({ success: false, reason: 'key and deviceId required' })
      return
    }

    const license = await getLicense(key.trim().toUpperCase())

    if (!license) {
      res.json({ success: false, reason: 'License key not found' })
      return
    }

    if (license.is_revoked) {
      res.json({ success: false, reason: 'License key has been revoked' })
      return
    }

    const expiresAt = Number(license.expires_at)
    if (expiresAt !== 0 && Date.now() > expiresAt) {
      res.json({ success: false, reason: 'License key has expired' })
      return
    }

    const hashedDevice  = hashDevice(deviceId)
    const db            = getDb()

    // Check if this device is already activated for this key
    const existingActivation = await db.execute({
      sql:  'SELECT id FROM activations WHERE license_key = ? AND device_id = ?',
      args: [key, hashedDevice],
    })

    if (existingActivation.rows.length > 0) {
      // Already activated on this device — just update last_seen
      await db.execute({
        sql:  'UPDATE activations SET last_seen = ? WHERE license_key = ? AND device_id = ?',
        args: [Date.now(), key, hashedDevice],
      })
      res.json({ success: true, tier: license.tier, expiresAt })
      return
    }

    // Check activation limit
    const count   = await getActivationCount(key)
    const maxSlots = Number(license.max_activations)

    if (count >= maxSlots) {
      res.json({
        success: false,
        reason:  `Activation limit reached (${maxSlots} devices). Deactivate another device first.`,
      })
      return
    }

    // Register new activation
    await db.execute({
      sql:  'INSERT INTO activations (license_key, device_id, activated_at, last_seen) VALUES (?, ?, ?, ?)',
      args: [key, hashedDevice, Date.now(), Date.now()],
    })

    console.log(`[license] Activated key=${key.slice(-8)} device=${hashedDevice.slice(0, 8)}...`)

    notifyKeyActivated({
      key,
      tier: String(license.tier),
      deviceId: hashedDevice,
      salesChannel: license['sales_channel'] ? String(license['sales_channel']) : undefined,
      customerInfo: license['customer_note'] ? String(license['customer_note']) : (license['email'] ? String(license['email']) : undefined),
      expiresAt,
    })

    res.json({ success: true, tier: license.tier, expiresAt })
  } catch (err: any) {
    console.error('[license] activate error:', err)
    res.status(500).json({ success: false, reason: 'Internal server error' })
  }
})

// ─── POST /api/license/verify ────────────────────────────────────────────────
licenseRouter.post('/verify', verifyLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, deviceId } = req.body as { key?: string; deviceId?: string }

    if (!key || !deviceId) {
      res.status(400).json({ valid: false, reason: 'key and deviceId required' })
      return
    }

    const license = await getLicense(key.trim().toUpperCase())

    if (!license) {
      res.json({ valid: false, reason: 'Key not found' })
      return
    }

    if (license.is_revoked) {
      res.json({ valid: false, reason: 'License revoked' })
      return
    }

    const expiresAt = Number(license.expires_at)
    if (expiresAt !== 0 && Date.now() > expiresAt) {
      res.json({ valid: false, reason: 'Expired' })
      return
    }

    const hashedDevice = hashDevice(deviceId)
    const activation   = await getDb().execute({
      sql:  'SELECT id FROM activations WHERE license_key = ? AND device_id = ?',
      args: [key, hashedDevice],
    })

    if (activation.rows.length === 0) {
      res.json({ valid: false, reason: 'Device not registered' })
      return
    }

    // Update last_seen heartbeat
    await getDb().execute({
      sql:  'UPDATE activations SET last_seen = ? WHERE license_key = ? AND device_id = ?',
      args: [Date.now(), key, hashedDevice],
    })

    res.json({ valid: true, tier: license.tier, expiresAt })
  } catch (err: any) {
    console.error('[license] verify error:', err)
    res.status(500).json({ valid: false, reason: 'Internal server error' })
  }
})

// ─── POST /api/license/deactivate ────────────────────────────────────────────
licenseRouter.post('/deactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, deviceId } = req.body as { key?: string; deviceId?: string }

    if (!key || !deviceId) {
      res.status(400).json({ ok: false, reason: 'key and deviceId required' })
      return
    }

    const hashedDevice = hashDevice(deviceId)

    await getDb().execute({
      sql:  'DELETE FROM activations WHERE license_key = ? AND device_id = ?',
      args: [key, hashedDevice],
    })

    console.log(`[license] Deactivated key=${key.slice(-8)} device=${hashedDevice.slice(0, 8)}...`)

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[license] deactivate error:', err)
    res.status(500).json({ ok: false, reason: 'Internal server error' })
  }
})

// ─── POST /api/license/lookup (Public Self-Service Portal) ───────────────────
licenseRouter.post('/lookup', lookupLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body as { key?: string }
    if (!key) {
      res.status(400).json({ found: false, reason: 'Lisans anahtarı gerekli' })
      return
    }

    const cleanKey = key.trim().toUpperCase()
    const license = await getLicense(cleanKey)
    if (!license) {
      res.json({ found: false, reason: 'Geçersiz veya bulunamayan lisans anahtarı' })
      return
    }

    const activeDevices = await getActivationCount(cleanKey)
    const expiresAt = Number(license.expires_at)
    const isExpired = expiresAt !== 0 && Date.now() > expiresAt

    res.json({
      found: true,
      key: cleanKey.slice(0, 10) + '****-****-' + cleanKey.slice(-4),
      tier: license.tier,
      isRevoked: Boolean(license.is_revoked),
      isExpired,
      expiresAt,
      activeDevices,
      maxDevices: Number((license as any).max_activations ?? (license as any).max_devices ?? 2),
      createdAt: Number(license.created_at ?? 0),
    })
  } catch (err: any) {
    console.error('[license] lookup error:', err)
    res.status(500).json({ found: false, reason: 'Sunucu hatası' })
  }
})

// ─── POST /api/license/reset-hardware (Self-Service HWID Clear with Anti-Piracy Cooldown) ──
licenseRouter.post('/reset-hardware', resetHwidLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body as { key?: string }
    if (!key) {
      res.status(400).json({ success: false, reason: 'Lisans anahtarı gerekli' })
      return
    }

    const cleanKey = key.trim().toUpperCase()
    const license = await getLicense(cleanKey)
    if (!license) {
      res.json({ success: false, reason: 'Lisans anahtarı bulunamadı' })
      return
    }

    if (license.is_revoked) {
      res.json({ success: false, reason: 'İptal edilmiş lisans için cihaz sıfırlanamaz' })
      return
    }

    // Anti-Piracy Cooldown: Enforce 24-hour waiting period between resets
    const HWID_RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000
    const lastReset = Number(license['last_hwid_reset'] ?? 0)
    const elapsed = Date.now() - lastReset

    if (lastReset > 0 && elapsed < HWID_RESET_COOLDOWN_MS) {
      const remainingHours = Math.max(1, Math.ceil((HWID_RESET_COOLDOWN_MS - elapsed) / (1000 * 60 * 60)))
      res.status(429).json({
        success: false,
        reason: `Donanım sıfırlama sınırına ulaşıldı. Güvenlik gereği cihaz kilidi 24 saatte en fazla bir kez sıfırlanabilir. Kalan süre: ~${remainingHours} saat.`,
      })
      return
    }

    // Clear active activations
    await getDb().execute({
      sql: 'DELETE FROM activations WHERE license_key = ?',
      args: [cleanKey],
    })

    // Stamp new reset timestamp
    await getDb().execute({
      sql: 'UPDATE licenses SET last_hwid_reset = ? WHERE key = ?',
      args: [Date.now(), cleanKey],
    })

    console.log(`[license] Self-service hardware reset completed for key=${cleanKey.slice(0, 8)}...`)
    res.json({
      success: true,
      message: 'Cihaz kilidi başarıyla sıfırlandı! Artık yeni bilgisayarınızda lisansınızı hemen aktive edebilirsiniz.',
    })
  } catch (err: any) {
    console.error('[license] reset-hardware error:', err)
    res.status(500).json({ success: false, reason: 'Sunucu hatası' })
  }
})
