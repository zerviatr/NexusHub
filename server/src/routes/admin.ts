/**
 * server/src/routes/admin.ts
 *
 * Secure Web Admin Console API & Dashboard for NexusHub.
 * Strict Zero-PII Policy: Never stores or exposes user personal data.
 *
 * Endpoints:
 *   GET    /admin                  — Serves the modern Web Dashboard HTML
 *   POST   /admin/api/login        — Timing-safe Master Password validation
 *   GET    /admin/api/keys         — List all licenses (keys, tiers, status, remaining days)
 *   POST   /admin/api/keys/generate— Create new cryptographic license key
 *   POST   /admin/api/keys/revoke  — Revoke / Suspend or Reactivate a key
 *   POST   /admin/api/keys/extend  — Add +X days to an existing key
 *   POST   /admin/api/keys/reset-devices — Clear activation device slots for a key
 *   DELETE /admin/api/keys         — Permanently delete a license key
 */
import { Router, Request, Response, NextFunction } from 'express'
import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { getDb } from '../db'
import { generateKey } from '../keyGen'
import { getAdminDashboardHtml } from '../adminDashboardHtml'

export const adminRouter = Router()

// ─── In-Memory Active Admin Sessions (24h TTL) ──────────────────────────────
interface Session {
  token: string
  createdAt: number
  expiresAt: number
}
const activeSessions = new Map<string, Session>()

// Cleanup expired sessions every hour
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token)
    }
  }
}, 3600 * 1000)

// ─── Rate Limiting for Login (Brute-Force Protection) ────────────────────────
interface AttemptRecord {
  count: number
  lockedUntil: number
}
const loginAttempts = new Map<string, AttemptRecord>()

function checkRateLimit(ip: string): { allowed: boolean; waitSec?: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record) return { allowed: true }

  if (record.lockedUntil > now) {
    return { allowed: false, waitSec: Math.ceil((record.lockedUntil - now) / 1000) }
  }

  if (record.lockedUntil <= now && record.count >= 5) {
    // Lock expired, reset
    loginAttempts.delete(ip)
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  record.count++
  if (record.count >= 5) {
    // Lock for 15 minutes after 5 failed attempts
    record.lockedUntil = now + 15 * 60 * 1000
  }
  loginAttempts.set(ip, record)
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// ─── Helpers: Timing-Safe Secret Validation ──────────────────────────────────
function verifyAdminSecret(provided?: string): boolean {
  const expected = process.env['ADMIN_SECRET'] ?? 'nexus_admin_default_2026'
  if (!provided || typeof provided !== 'string') return false

  const bufProvided = Buffer.from(provided, 'utf-8')
  const bufExpected = Buffer.from(expected, 'utf-8')

  if (bufProvided.length !== bufExpected.length) return false
  return timingSafeEqual(bufProvided, bufExpected)
}

// ─── Auth Middleware ────────────────────────────────────────────────────────
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' })
    return
  }

  const session = activeSessions.get(token)
  if (!session || session.expiresAt <= Date.now()) {
    if (session) activeSessions.delete(token)
    res.status(401).json({ success: false, error: 'Session expired. Please log in again.' })
    return
  }

  next()
}

// ─── Web Dashboard HTML View ────────────────────────────────────────────────
adminRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(getAdminDashboardHtml())
})

adminRouter.get('/dashboard', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(getAdminDashboardHtml())
})

// ─── POST /admin/api/login ──────────────────────────────────────────────────
adminRouter.post('/api/login', (req: Request, res: Response): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const rate = checkRateLimit(ip)

  if (!rate.allowed) {
    res.status(429).json({
      success: false,
      error: `Çok fazla hatalı giriş denemesi! Lütfen ${rate.waitSec} saniye bekleyin.`
    })
    return
  }

  const { password } = req.body as { password?: string }

  if (!verifyAdminSecret(password)) {
    recordFailedAttempt(ip)
    res.status(401).json({ success: false, error: 'Geçersiz master şifre!' })
    return
  }

  clearFailedAttempts(ip)

  // Issue 24-hour cryptographic token
  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  activeSessions.set(token, {
    token,
    createdAt: now,
    expiresAt: now + 24 * 3600 * 1000,
  })

  res.json({ success: true, token })
})

// ─── GET /admin/api/keys ────────────────────────────────────────────────────
// Strict Zero-PII: Does NOT select or return customer email or machine hashes.
adminRouter.get('/api/keys', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb()
    const result = await db.execute(`
      SELECT 
        l.key, 
        l.tier, 
        l.expires_at, 
        l.order_id, 
        l.max_activations, 
        l.is_revoked, 
        l.created_at,
        (SELECT COUNT(*) FROM activations a WHERE a.license_key = l.key) as activation_count
      FROM licenses l
      ORDER BY l.created_at DESC
    `)

    const keys = result.rows.map((row: any) => ({
      key: row.key,
      tier: row.tier,
      expires_at: Number(row.expires_at || 0),
      order_id: row.order_id || '',
      max_activations: Number(row.max_activations || 2),
      is_revoked: Number(row.is_revoked || 0),
      created_at: Number(row.created_at || 0),
      activation_count: Number(row.activation_count || 0),
    }))

    res.json({ success: true, keys })
  } catch (err: any) {
    console.error('[admin] get keys error:', err)
    res.status(500).json({ success: false, error: err.message || 'Veritabanı hatası' })
  }
})

// ─── POST /admin/api/keys/generate ──────────────────────────────────────────
adminRouter.post('/api/keys/generate', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tier = 'pro',
      durationDays = 365,
      maxActivations = 2,
      note = ''
    } = req.body as {
      tier?: string
      durationDays?: number
      maxActivations?: number
      note?: string
    }

    const secret = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

    let expiresAt = 0
    if (tier !== 'lifetime' && Number(durationDays) > 0) {
      expiresAt = Date.now() + Number(durationDays) * 24 * 3600 * 1000
    }

    const key = generateKey(tier, expiresAt, secret)
    const db = getDb()

    await db.execute({
      sql: `INSERT INTO licenses (key, tier, expires_at, order_id, email, max_activations, is_revoked, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        key,
        tier,
        expiresAt,
        note || `MANUAL-${Date.now().toString().slice(-6)}`,
        'anonymous@nexushub.local',
        Number(maxActivations) || 2,
        Date.now()
      ]
    })

    res.json({
      success: true,
      key,
      tier,
      expiresAt,
      maxActivations
    })
  } catch (err: any) {
    console.error('[admin] generate error:', err)
    res.status(500).json({ success: false, error: err.message || 'Lisans üretilemedi' })
  }
})

// ─── POST /admin/api/keys/revoke ────────────────────────────────────────────
adminRouter.post('/api/keys/revoke', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, is_revoked } = req.body as { key?: string; is_revoked?: number }
    if (!key) {
      res.status(400).json({ success: false, error: 'Key parametresi zorunludur' })
      return
    }

    const db = getDb()
    await db.execute({
      sql: 'UPDATE licenses SET is_revoked = ? WHERE key = ?',
      args: [is_revoked === 1 ? 1 : 0, key]
    })

    res.json({ success: true, key, is_revoked: is_revoked === 1 ? 1 : 0 })
  } catch (err: any) {
    console.error('[admin] revoke error:', err)
    res.status(500).json({ success: false, error: err.message || 'İptal işlemi başarısız' })
  }
})

// ─── POST /admin/api/keys/extend ────────────────────────────────────────────
adminRouter.post('/api/keys/extend', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, daysToAdd = 30 } = req.body as { key?: string; daysToAdd?: number }
    if (!key) {
      res.status(400).json({ success: false, error: 'Key parametresi zorunludur' })
      return
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT expires_at, tier FROM licenses WHERE key = ?',
      args: [key]
    })

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Lisans bulunamadı' })
      return
    }

    const row = result.rows[0] as any
    if (row.tier === 'lifetime' || Number(row.expires_at) === 0) {
      res.status(400).json({ success: false, error: 'Ömür boyu lisansların süresi uzatılamaz' })
      return
    }

    const currentExpiry = Number(row.expires_at)
    const baseTime = Math.max(Date.now(), currentExpiry)
    const newExpiresAt = baseTime + Number(daysToAdd) * 24 * 3600 * 1000

    await db.execute({
      sql: 'UPDATE licenses SET expires_at = ? WHERE key = ?',
      args: [newExpiresAt, key]
    })

    res.json({ success: true, key, newExpiresAt })
  } catch (err: any) {
    console.error('[admin] extend error:', err)
    res.status(500).json({ success: false, error: err.message || 'Süre uzatılamadı' })
  }
})

// ─── POST /admin/api/keys/reset-devices ──────────────────────────────────────
adminRouter.post('/api/keys/reset-devices', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body as { key?: string }
    if (!key) {
      res.status(400).json({ success: false, error: 'Key parametresi zorunludur' })
      return
    }

    const db = getDb()
    await db.execute({
      sql: 'DELETE FROM activations WHERE license_key = ?',
      args: [key]
    })

    res.json({ success: true, key })
  } catch (err: any) {
    console.error('[admin] reset-devices error:', err)
    res.status(500).json({ success: false, error: err.message || 'Cihazlar sıfırlanamadı' })
  }
})

// ─── DELETE /admin/api/keys ─────────────────────────────────────────────────
adminRouter.delete('/api/keys', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body as { key?: string }
    if (!key) {
      res.status(400).json({ success: false, error: 'Key parametresi zorunludur' })
      return
    }

    const db = getDb()
    await db.execute({
      sql: 'DELETE FROM activations WHERE license_key = ?',
      args: [key]
    })
    await db.execute({
      sql: 'DELETE FROM licenses WHERE key = ?',
      args: [key]
    })

    res.json({ success: true, key })
  } catch (err: any) {
    console.error('[admin] delete error:', err)
    res.status(500).json({ success: false, error: err.message || 'Lisans silinemedi' })
  }
})
