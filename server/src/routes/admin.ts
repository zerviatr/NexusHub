/**
 * server/src/routes/admin.ts
 *
 * Enterprise Web Admin Console API & Dashboard for NexusHub.
 * Strict Zero-PII Policy: Never stores or exposes user personal data.
 *
 * Capabilities:
 *   - Timing-safe Master Password authentication with PBKDF2 hash persistence.
 *   - Single & Bulk License Key Generation with custom durations and device counts.
 *   - Bulk Actions: Batch Revoke, Batch Extend (+X days), Batch Delete, Batch Device Reset.
 *   - Inline Note/Tag editing per license.
 *   - Real-time cryptographic License Diagnostic tool.
 *   - Security Audit & Activity Logging.
 *   - Server Telemetry & Latency health checks.
 */
import { Router, Request, Response, NextFunction } from 'express'
import { createHmac, timingSafeEqual, randomBytes, pbkdf2Sync } from 'crypto'
import { getDb } from '../db'
import { generateKey } from '../keyGen'
import { getAdminDashboardHtml } from '../adminDashboardHtml'
import {
  getNotificationSettings,
  saveNotificationSettings,
  sendTelegram,
  sendDiscord,
  notifyKeyRevoked
} from '../services/notifier'

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
    loginAttempts.delete(ip)
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  record.count++
  if (record.count >= 10) {
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

// ─── Audit Logging Helper ───────────────────────────────────────────────────
async function recordAudit(action: string, details: string, ip: string = 'internal'): Promise<void> {
  try {
    const db = getDb()
    await db.execute({
      sql: `INSERT INTO admin_audit_logs (action, details, ip, created_at) VALUES (?, ?, ?, ?)`,
      args: [action, details, ip, Date.now()]
    })
  } catch (err) {
    console.error('[admin] recordAudit failed silently:', err)
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
    await recordAudit('LOGIN_FAILED', 'Invalid master password attempt', ip)
    res.status(401).json({ success: false, error: 'Geçersiz master şifre!' })
    return
  }

  clearFailedAttempts(ip)

  const token = randomBytes(32).toString('hex')
  const now = Date.now()
  activeSessions.set(token, {
    token,
    createdAt: now,
    expiresAt: now + 24 * 3600 * 1000,
  })

  await recordAudit('LOGIN_SUCCESS', 'Admin session started', ip)
  res.json({ success: true, token })
})

// ─── POST /admin/api/change-password ────────────────────────────────────────
adminRouter.post('/api/change-password', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
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

    await recordAudit('PASSWORD_CHANGED', 'Master password updated', ip)
    res.json({ success: true, message: 'Master admin şifresi başarıyla güncellendi!' })
  } catch (err: any) {
    console.error('[admin] change-password error:', err)
    res.status(500).json({ success: false, error: err.message || 'Şifre güncellenemedi' })
  }
})

// ─── GET /admin/api/keys ────────────────────────────────────────────────────
adminRouter.get('/api/keys', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb()
    const result = await db.execute(`
      SELECT 
        l.key, 
        l.tier, 
        l.expires_at, 
        l.order_id, 
        l.sales_channel,
        l.customer_note,
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
      sales_channel: row.sales_channel || '',
      customer_note: row.customer_note || '',
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
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const {
      tier = 'pro',
      durationDays = 365,
      maxActivations = 2,
      note = '',
      salesChannel = 'Direct',
      customerNote = ''
    } = req.body as {
      tier?: string
      durationDays?: number
      maxActivations?: number
      note?: string
      salesChannel?: string
      customerNote?: string
    }

    const secret = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

    let expiresAt = 0
    if (tier !== 'lifetime' && Number(durationDays) > 0) {
      expiresAt = Date.now() + Number(durationDays) * 24 * 3600 * 1000
    }

    const key = generateKey(tier, expiresAt, secret)
    const db = getDb()

    await db.execute({
      sql: `INSERT INTO licenses (key, tier, expires_at, order_id, email, max_activations, is_revoked, created_at, sales_channel, customer_note)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      args: [
        key,
        tier,
        expiresAt,
        note || `MANUAL-${Date.now().toString().slice(-6)}`,
        'anonymous@nexushub.local',
        Number(maxActivations) || 2,
        Date.now(),
        salesChannel,
        customerNote
      ]
    })

    await recordAudit('KEY_GENERATED', `Key ${key} (${tier}, ${durationDays}d, ${salesChannel})`, ip)
    res.json({ success: true, key, tier, expiresAt, maxActivations })
  } catch (err: any) {
    console.error('[admin] generate error:', err)
    res.status(500).json({ success: false, error: err.message || 'Lisans üretilemedi' })
  }
})

// ─── POST /admin/api/keys/bulk-generate ─────────────────────────────────────
adminRouter.post('/api/keys/bulk-generate', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const {
      tier = 'pro',
      durationDays = 365,
      maxActivations = 2,
      count = 5,
      notePrefix = 'BULK',
      salesChannel = 'Direct',
      customerNote = ''
    } = req.body as {
      tier?: string
      durationDays?: number
      maxActivations?: number
      count?: number
      notePrefix?: string
      salesChannel?: string
      customerNote?: string
    }

    const safeCount = Math.min(50, Math.max(1, Number(count) || 1))
    const secret = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'

    let expiresAt = 0
    if (tier !== 'lifetime' && Number(durationDays) > 0) {
      expiresAt = Date.now() + Number(durationDays) * 24 * 3600 * 1000
    }

    const db = getDb()
    const generated: string[] = []
    const now = Date.now()

    for (let i = 1; i <= safeCount; i++) {
      // Offset by i to ensure unique EEE / seeds if generated within same millisecond
      const key = generateKey(tier, expiresAt === 0 ? 0 : expiresAt + i, secret)
      const label = `${notePrefix} #${i}`

      await db.execute({
        sql: `INSERT INTO licenses (key, tier, expires_at, order_id, email, max_activations, is_revoked, created_at, sales_channel, customer_note)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        args: [
          key,
          tier,
          expiresAt,
          label,
          'anonymous@nexushub.local',
          Number(maxActivations) || 2,
          now + i,
          salesChannel,
          customerNote
        ]
      })

      generated.push(key)
    }

    await recordAudit('BULK_KEYS_GENERATED', `${safeCount} keys created (${tier}, ${salesChannel})`, ip)
    res.json({ success: true, count: safeCount, keys: generated })
  } catch (err: any) {
    console.error('[admin] bulk generate error:', err)
    res.status(500).json({ success: false, error: err.message || 'Toplu lisans üretilemedi' })
  }
})

// ─── POST /admin/api/keys/bulk-action ───────────────────────────────────────
adminRouter.post('/api/keys/bulk-action', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const { action, keys = [], daysToAdd = 30 } = req.body as {
      action?: 'revoke' | 'unrevoke' | 'extend' | 'delete' | 'reset-devices'
      keys?: string[]
      daysToAdd?: number
    }

    if (!Array.isArray(keys) || keys.length === 0) {
      res.status(400).json({ success: false, error: 'İşlem için en az bir anahtar seçilmelidir' })
      return
    }

    const db = getDb()

    if (action === 'revoke' || action === 'unrevoke') {
      const isRevoked = action === 'revoke' ? 1 : 0
      for (const k of keys) {
        await db.execute({
          sql: 'UPDATE licenses SET is_revoked = ? WHERE key = ?',
          args: [isRevoked, k]
        })
      }
      await recordAudit('BULK_REVOKE_TOGGLE', `${keys.length} keys set to is_revoked=${isRevoked}`, ip)
    } else if (action === 'extend') {
      const ms = Number(daysToAdd) * 24 * 3600 * 1000
      for (const k of keys) {
        const row = await db.execute({ sql: 'SELECT expires_at, tier FROM licenses WHERE key = ?', args: [k] })
        if (row.rows.length > 0 && row.rows[0]?.tier !== 'lifetime' && Number(row.rows[0]?.expires_at) !== 0) {
          const currentExp = Number(row.rows[0].expires_at)
          const newExp = Math.max(Date.now(), currentExp) + ms
          await db.execute({ sql: 'UPDATE licenses SET expires_at = ? WHERE key = ?', args: [newExp, k] })
        }
      }
      await recordAudit('BULK_EXTEND', `${keys.length} keys extended by ${daysToAdd}d`, ip)
    } else if (action === 'reset-devices') {
      for (const k of keys) {
        await db.execute({ sql: 'DELETE FROM activations WHERE license_key = ?', args: [k] })
      }
      await recordAudit('BULK_DEVICE_RESET', `${keys.length} keys device slots reset`, ip)
    } else if (action === 'delete') {
      for (const k of keys) {
        await db.execute({ sql: 'DELETE FROM activations WHERE license_key = ?', args: [k] })
        await db.execute({ sql: 'DELETE FROM licenses WHERE key = ?', args: [k] })
      }
      await recordAudit('BULK_DELETE', `${keys.length} keys deleted permanently`, ip)
    } else {
      res.status(400).json({ success: false, error: 'Geçersiz aksiyon' })
      return
    }

    res.json({ success: true, count: keys.length, action })
  } catch (err: any) {
    console.error('[admin] bulk action error:', err)
    res.status(500).json({ success: false, error: err.message || 'Toplu işlem başarısız' })
  }
})

// ─── POST /admin/api/keys/update-note ───────────────────────────────────────
adminRouter.post('/api/keys/update-note', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, note } = req.body as { key?: string; note?: string }
    if (!key) {
      res.status(400).json({ success: false, error: 'Key parametresi zorunludur' })
      return
    }

    const db = getDb()
    await db.execute({
      sql: 'UPDATE licenses SET order_id = ? WHERE key = ?',
      args: [note || '', key]
    })

    res.json({ success: true, key, note: note || '' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Not güncellenemedi' })
  }
})

// ─── POST /admin/api/keys/revoke ────────────────────────────────────────────
adminRouter.post('/api/keys/revoke', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
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

    if (is_revoked === 1) {
      notifyKeyRevoked({ key, reason: 'Admin panelinden manuel iptal edildi', ip })
    }

    await recordAudit(is_revoked === 1 ? 'KEY_REVOKED' : 'KEY_REACTIVATED', `Key ${key}`, ip)
    res.json({ success: true, key, is_revoked: is_revoked === 1 ? 1 : 0 })
  } catch (err: any) {
    console.error('[admin] revoke error:', err)
    res.status(500).json({ success: false, error: err.message || 'İptal işlemi başarısız' })
  }
})

// ─── POST /admin/api/keys/extend ────────────────────────────────────────────
adminRouter.post('/api/keys/extend', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
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

    await recordAudit('KEY_EXTENDED', `Key ${key} +${daysToAdd}d`, ip)
    res.json({ success: true, key, newExpiresAt })
  } catch (err: any) {
    console.error('[admin] extend error:', err)
    res.status(500).json({ success: false, error: err.message || 'Süre uzatılamadı' })
  }
})

// ─── POST /admin/api/keys/reset-devices ──────────────────────────────────────
adminRouter.post('/api/keys/reset-devices', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
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

    await recordAudit('DEVICE_SLOTS_RESET', `Key ${key}`, ip)
    res.json({ success: true, key })
  } catch (err: any) {
    console.error('[admin] reset-devices error:', err)
    res.status(500).json({ success: false, error: err.message || 'Cihazlar sıfırlanamadı' })
  }
})

// ─── POST /admin/api/keys/delete & DELETE /admin/api/keys ───────────────────
async function handleDeleteKey(req: Request, res: Response): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
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

    await recordAudit('KEY_DELETED', `Key ${key}`, ip)
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

// ─── POST /admin/api/keys/diagnose ──────────────────────────────────────────
adminRouter.post('/api/keys/diagnose', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key = '' } = req.body as { key?: string }
    const clean = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (!clean.startsWith('NEXUS') || clean.length !== 25) {
      res.json({
        validFormat: false,
        reason: 'Geçersiz format: Anahtar NEXUS ile başlamalı ve toplam 25 karakter olmalıdır.'
      })
      return
    }

    const code = clean.slice(5)
    const T = code[0]
    const EEE = code.slice(1, 4)
    const H = code.slice(4)

    const tierMap: Record<string, string> = { F: 'free', P: 'pro', T: 'team', L: 'lifetime' }
    const tier = tierMap[T] || 'unknown'

    const secret = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'
    const expectedHmac = createHmac('sha256', secret)
      .update(`${T}${EEE}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase()

    const isHmacValid = H === expectedHmac

    const JAN_2024_MS = new Date('2024-01-01T00:00:00Z').getTime()
    const MONTH_MS = 30.44 * 24 * 3600 * 1000
    let decodedExpiresAt = 0
    if (EEE !== '000') {
      decodedExpiresAt = JAN_2024_MS + parseInt(EEE, 16) * MONTH_MS
    }

    // Check database state
    const db = getDb()
    const dbRow = await db.execute({
      sql: `SELECT l.*, (SELECT COUNT(*) FROM activations a WHERE a.license_key = l.key) as act_count FROM licenses l WHERE key = ?`,
      args: [key.trim().toUpperCase()]
    })

    const inDb = dbRow.rows.length > 0
    const dbData = inDb ? dbRow.rows[0] : null

    res.json({
      validFormat: true,
      tier,
      isHmacValid,
      decodedExpiresAt,
      isExpired: decodedExpiresAt !== 0 && Date.now() > decodedExpiresAt,
      inDatabase: inDb,
      dbDetails: dbData ? {
        order_id: dbData.order_id,
        is_revoked: dbData.is_revoked === 1,
        active_devices: dbData.act_count,
        max_activations: dbData.max_activations,
        created_at: dbData.created_at
      } : null
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Teşhis başarısız' })
  }
})

// ─── GET /admin/api/audit-logs ──────────────────────────────────────────────
adminRouter.get('/api/audit-logs', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb()
    const rows = await db.execute(`
      SELECT id, action, details, ip, created_at
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT 50
    `)
    res.json({ success: true, logs: rows.rows })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET /admin/api/server-stats ────────────────────────────────────────────
adminRouter.get('/api/server-stats', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbStart = Date.now()
    const db = getDb()
    const countRes = await db.execute('SELECT COUNT(*) as count FROM licenses')
    const dbLatency = Date.now() - dbStart

    res.json({
      success: true,
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      totalLicenses: countRes.rows[0]?.count || 0,
      dbLatencyMs: dbLatency,
      nodeVersion: process.version,
      platform: process.platform
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET /admin/api/notifications/settings ──────────────────────────────────
adminRouter.get('/api/notifications/settings', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getNotificationSettings()
    res.json({ success: true, settings })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /admin/api/notifications/settings ─────────────────────────────────
adminRouter.post('/api/notifications/settings', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    await saveNotificationSettings(req.body)
    await recordAudit('NOTIF_SETTINGS_UPDATED', 'Webhook/Telegram config updated', ip)
    res.json({ success: true, message: 'Bildirim ayarları kaydedildi' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /admin/api/notifications/test ─────────────────────────────────────
adminRouter.post('/api/notifications/test', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { channel } = req.body as { channel?: 'telegram' | 'discord' }
    const settings = await getNotificationSettings()

    if (channel === 'telegram') {
      if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
        res.status(400).json({ success: false, error: 'Telegram Bot Token veya Chat ID eksik' })
        return
      }
      const testMsg = `<b>🔔 NexusHub Test Bildirimi</b>\n\nTelegram bağlantınız başarıyla doğrulandı! Sunucu ve bildirim botu aktif.`
      const result = await sendTelegram(settings.telegram_bot_token, settings.telegram_chat_id, testMsg)
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error })
        return
      }
      res.json({ success: true, message: 'Telegram test mesajı başarıyla gönderildi!' })
      return
    }

    if (channel === 'discord') {
      if (!settings.discord_webhook_url) {
        res.status(400).json({ success: false, error: 'Discord Webhook URL eksik' })
        return
      }
      const result = await sendDiscord(settings.discord_webhook_url, {
        title: '🔔 NexusHub Test Bildirimi',
        description: 'Discord Webhook bağlantınız başarıyla doğrulandı! Sunucu lisans ve güvenlik alarmları bu kanala akacaktır.',
        color: 0x8b5cf6, // Purple
        fields: [
          { name: 'Durum', value: '🟢 Bağlantı Başarılı', inline: true },
          { name: 'Sunucu', value: 'Railway Production', inline: true },
        ],
      })
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error })
        return
      }
      res.json({ success: true, message: 'Discord test mesajı başarıyla gönderildi!' })
      return
    }

    res.status(400).json({ success: false, error: 'Geçersiz bildirim kanalı' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /admin/api/coupons/generate ───────────────────────────────────────
adminRouter.post('/api/coupons/generate', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const { daysToAdd = 30, count = 1, note = '' } = req.body as {
      daysToAdd?: number
      count?: number
      note?: string
    }

    const safeCount = Math.min(50, Math.max(1, Number(count) || 1))
    const days = Math.max(1, Number(daysToAdd) || 30)
    const db = getDb()
    const now = Date.now()
    const created: any[] = []

    for (let i = 0; i < safeCount; i++) {
      const randStr = randomBytes(4).toString('hex').toUpperCase()
      const code = `NEXUS-EXT-${days}D-${randStr}`

      await db.execute({
        sql: `INSERT INTO coupons (code, days_to_add, is_used, note, created_at)
              VALUES (?, ?, 0, ?, ?)`,
        args: [code, days, note || `Kupon +${days} Gün`, now + i]
      })

      created.push({ code, days_to_add: days, note: note || `Kupon +${days} Gün` })
    }

    await recordAudit('COUPONS_GENERATED', `${safeCount} coupons generated (+${days}d)`, ip)
    res.json({ success: true, count: safeCount, coupons: created })
  } catch (err: any) {
    console.error('[admin] coupon generate error:', err)
    res.status(500).json({ success: false, error: err.message || 'Kupon üretilemedi' })
  }
})

// ─── GET /admin/api/coupons/list ────────────────────────────────────────────
adminRouter.get('/api/coupons/list', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb()
    const resRows = await db.execute(`
      SELECT code, days_to_add, is_used, used_by_key, note, created_at, used_at
      FROM coupons
      ORDER BY created_at DESC
      LIMIT 200
    `)
    res.json({ success: true, coupons: resRows.rows })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /admin/api/coupons/delete ─────────────────────────────────────────
adminRouter.post('/api/coupons/delete', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const { code } = req.body as { code?: string }
    if (!code) {
      res.status(400).json({ success: false, error: 'Kupon kodu zorunludur' })
      return
    }
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM coupons WHERE code = ?', args: [code] })
    await recordAudit('COUPON_DELETED', `Coupon ${code} deleted`, ip)
    res.json({ success: true, code })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST /admin/api/coupons/redeem ─────────────────────────────────────────
adminRouter.post('/api/coupons/redeem', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  try {
    const { key, couponCode } = req.body as { key?: string; couponCode?: string }
    if (!key || !couponCode) {
      res.status(400).json({ success: false, error: 'Lisans anahtarı ve kupon kodu gereklidir' })
      return
    }

    const cleanKey = key.trim().toUpperCase()
    const cleanCoupon = couponCode.trim().toUpperCase()
    const db = getDb()

    // 1. Check coupon validity
    const couponRes = await db.execute({
      sql: 'SELECT * FROM coupons WHERE code = ?',
      args: [cleanCoupon]
    })

    if (couponRes.rows.length === 0) {
      res.status(400).json({ success: false, error: 'Kupon kodu bulunamadı' })
      return
    }

    const coupon = couponRes.rows[0] as any
    if (Number(coupon.is_used) === 1) {
      res.status(400).json({ success: false, error: 'Bu kupon daha önce kullanılmıştır' })
      return
    }

    // 2. Check license exists
    const licenseRes = await db.execute({
      sql: 'SELECT * FROM licenses WHERE key = ?',
      args: [cleanKey]
    })

    if (licenseRes.rows.length === 0) {
      res.status(400).json({ success: false, error: 'Uzatılacak lisans anahtarı bulunamadı' })
      return
    }

    const license = licenseRes.rows[0] as any
    if (license.tier === 'lifetime') {
      res.status(400).json({ success: false, error: 'Bu lisans zaten Ömür Boyu (Lifetime) pakettir' })
      return
    }

    const daysToAdd = Number(coupon.days_to_add) || 30
    const msToAdd = daysToAdd * 24 * 3600 * 1000
    const currentExp = Number(license.expires_at || 0)
    const newExpiresAt = Math.max(Date.now(), currentExp) + msToAdd

    // 3. Update license
    await db.execute({
      sql: 'UPDATE licenses SET expires_at = ? WHERE key = ?',
      args: [newExpiresAt, cleanKey]
    })

    // 4. Mark coupon as used
    await db.execute({
      sql: 'UPDATE coupons SET is_used = 1, used_by_key = ?, used_at = ? WHERE code = ?',
      args: [cleanKey, Date.now(), cleanCoupon]
    })

    await recordAudit('COUPON_REDEEMED', `Coupon ${cleanCoupon} applied to key ${cleanKey} (+${daysToAdd}d)`, ip)

    res.json({
      success: true,
      key: cleanKey,
      couponCode: cleanCoupon,
      daysAdded: daysToAdd,
      newExpiresAt,
      newExpiryDate: new Date(newExpiresAt).toLocaleDateString('tr-TR')
    })
  } catch (err: any) {
    console.error('[admin] redeem coupon error:', err)
    res.status(500).json({ success: false, error: err.message || 'Kupon uygulanamadı' })
  }
})
