/**
 * server/src/routes/admin.ts
 *
 * TEMPORARY admin endpoint for generating test license keys.
 * Protected by a simple ADMIN_SECRET header.
 * Remove or disable before production launch.
 *
 * POST /admin/create-key
 *   Body: { tier: 'lifetime' | 'pro' | 'team', adminSecret: string }
 *   → { key, tier, expiresAt }
 */
import { Router, Request, Response } from 'express'
import { getDb } from '../db'
import { generateKey, tierToExpiry } from '../keyGen'

export const adminRouter = Router()

adminRouter.post('/create-key', async (req: Request, res: Response): Promise<void> => {
  const { tier = 'lifetime', adminSecret } = req.body as {
    tier?: string
    adminSecret?: string
  }

  const expected = process.env['ADMIN_SECRET'] ?? 'NEXUS_ADMIN_LOCAL_TEST'

  if (adminSecret !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const secret    = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'
    const expiresAt = tierToExpiry(tier)
    const key       = generateKey(tier, expiresAt, secret)

    const db = getDb()

    const existing = await db.execute({
      sql:  'SELECT key FROM licenses WHERE key = ?',
      args: [key],
    })

    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO licenses (key, tier, expires_at, order_id, email, max_activations, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [key, tier, expiresAt, `ADMIN-${Date.now()}`, 'admin@nexushub.app', 5, Date.now()],
      })
    }

    res.json({ key, tier, expiresAt })
  } catch (err: any) {
    console.error('[admin] create-key error:', err)
    res.status(500).json({ error: 'Internal server error', detail: String(err?.message ?? err) })
  }
})
