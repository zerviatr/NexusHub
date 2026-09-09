/**
 * server/src/routes/admin.ts
 *
 * Secure Web Admin Console API & Dashboard for NexusHub.
 * Strict Zero-PII Policy: Never stores or exposes user personal data.
 *
 * Endpoints:
 *   GET    /admin                  — Serves the modern Web Dashboard HTML
 *   POST   /admin/api/login        — Timing-safe Master Password validation
 *   POST   /admin/api/change-password — Update Master Password in database
 *   GET    /admin/api/keys         — List all licenses (keys, tiers, status, remaining days)
 *   POST   /admin/api/keys/generate— Create new cryptographic license key
 *   POST   /admin/api/keys/revoke  — Revoke / Suspend or Reactivate a key
 *   POST   /admin/api/keys/extend  — Add +X days to an existing key
 *   POST   /admin/api/keys/reset-devices — Clear activation device slots for a key
 *   DELETE /admin/api/keys         — Permanently delete a license key
 */
import { Router, Request, Response, NextFunction } from 'express'
import { createHmac, timingSafeEqual, randomBytes, pbkdf2Sync } from 'crypto'
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

  if (record.lockedUntil <= now && record.count >= 10) {
    // Lock expired, reset
    loginAttempts.delete(ip)
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  record.count++
  if (record.count >= 10) {
    // Lock for 5 minutes after 10 failed attempts
    record.lockedUntil = now + 5 * 60 * 1000
  }
  loginAttempts.set(ip, record)
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// ─── Cryptographic Password Hashing (PBKDF2-SHA512) ─────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPasswordAgainstHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const calculated = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  const bufA = Buffer.from(calculated, 'hex')
  const bufB = Buffer.from(hash, 'hex')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

async function verifyAdminPassword(provided?: string): Promise<boolean> {
  if (!provided || typeof provided !== 'string') return false
  const clean = provided.trim()
  if (!clean) return false

  try {
    const db = getDb()
    const row = await db.execute({
      sql: 'SELECT value FROM admin_settings WHERE key = ?',
      args: ['admin_password_hash']
    })

    if (row.rows.length > 0 && row.rows[0]?.value) {
      const stored = String(row.rows[0].value)
      return verifyPasswordAgainstHash(clean, stored)
    }

    // Fallback if not yet customized in DB:
    // Accept standard default keys:
    const acceptable = [
      'nexus_admin_2026_master',
      'nexus_admin_default_2026',
      process.env['ADMIN_SECRET'] || ''
    ].filter(Boolean)

    const isMatch = acceptable.some(expected => {
      const bufA = Buffer.from(clean, 'utf-8')
      const bufB = Buffer.from(expected, 'utf-8')
      if (bufA.length !== bufB.length) return false
      return timingSafeEqual(bufA, bufB)
    })

    if (isMatch) {
      // Auto-initialize DB hash on first successful login
      const initialHash = hashPassword(clean)
      await db.execute({
        sql: `INSERT INTO admin_settings (key, value, updated_at) VALUES ('admin_password_hash', ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [initialHash, Date.now()]
      })
      return true
    }

    return false
  } catch (err) {
    console.error('[admin] verifyAdminPassword error:', err)
    return false
  }
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
adminRouter.post('/api/login', async (req: Request, res: Response): Promise<void> => {
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
  const isValid = await verifyAdminPassword(password)

  if (!isValid) {
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

// ─── POST /admin/api/change-password ────────────────────────────────────────
adminRouter.post('/api/change-password', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Mevcut şifre ve yeni şifre alanları zorunludur' })
      return
    }

    const cleanNew = newPassword.trim()
    if (cleanNew.length < 6) {
      res.status(400).json({ success: false, error: 'Yeni şifre en az 6 karakter olmalıdır' })
      return
    }

    const isCurrentValid = await verifyAdminPassword(currentPassword)
    if (!isCurrentValid) {
      res.status(401).json({ success: false, error: 'Mevcut şifreniz hatalı!' })
      return
    }

    const newHash = hashPassword(cleanNew)
    const db = getDb()

    await db.execute({
      sql: `INSERT INTO admin_settings (key, value, updated_at) VALUES ('admin_password_hash', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [newHash, Date.now()]
    })

    res.json({ success: true, message: 'Master admin şifresi başarıyla güncellendi!' })
  } catch (err: any) {
    console.error('[admin] change-password error:', err)
    res.status(500).json({ success: false, error: err.message || 'Şifre güncellenemedi' })
  }
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

// ─── POST /admin/api/keys/delete & DELETE /admin/api/keys ───────────────────
async function handleDeleteKey(req: Request, res: Response): Promise<void> {
  try {
    const rawKey = req.body?.key || req.query?.key || req.params?.key
    const key = typeof rawKey === 'string' ? rawKey.trim() : ''

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

    console.log(`[admin] Key deleted successfully: ${key}`)
    res.json({ success: true, key })
  } catch (err: any) {
    console.error('[admin] delete error:', err)
    res.status(500).json({ success: false, error: err.message || 'Lisans silinemedi' })
  }
}

adminRouter.post('/api/keys/delete', requireAdminAuth, handleDeleteKey)
adminRouter.delete('/api/keys', requireAdminAuth, handleDeleteKey)
adminRouter.delete('/api/keys/:key', requireAdminAuth, handleDeleteKey)

