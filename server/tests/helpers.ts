import express, { Request, Response, NextFunction } from 'express'
import { createHmac } from 'crypto'
import { getDb, migrate } from '../src/db'
import { licenseRouter } from '../src/routes/license'
import { webhookRouter } from '../src/routes/webhook'
import { adminRouter } from '../src/routes/admin'
import { createRateLimiter } from '../src/middleware/rateLimiter'

// Configure test environment variables before anything else
process.env['TURSO_URL'] = 'file::memory:?cache=shared'
process.env['LEMONSQUEEZY_WEBHOOK_SECRET'] = 'test_ls_secret_777'
process.env['NEXUS_LICENSE_SECRET'] = 'test_nexus_secret_888'
process.env['ADMIN_SECRET'] = 'SuperAdminSecretPass123!'
process.env['DEVICE_HMAC_SECRET'] = 'test_device_secret_999'

let _ipCounter = 1
export function nextIp(): string {
  const c = _ipCounter++
  return `10.0.${Math.floor(c / 250)}.${(c % 250) + 1}`
}

/**
 * Creates an Express test application matching the production server architecture
 * without triggering background server listeners or port binds.
 */
export function createTestApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  // 1. Raw body capture for LemonSqueezy webhook signature validation
  app.use('/webhook', (req: Request, res: Response, next: NextFunction) => {
    const chunks: Buffer[] = []
    let totalBytes = 0
    const MAX_WEBHOOK_SIZE = 1024 * 1024

    req.on('error', (err) => next(err))
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > MAX_WEBHOOK_SIZE) {
        res.status(413).json({ error: 'Payload too large' })
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (totalBytes <= MAX_WEBHOOK_SIZE) {
        ;(req as any).rawBody = Buffer.concat(chunks)
        next()
      }
    })
  })

  // 2. Standard JSON body parsing
  app.use(express.json({ limit: '1mb' }))

  // 3. Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    next()
  })

  // 4. CORS
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  })

  // 5. Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, ts: Date.now() })
  })

  // 6. Mount Core Routers
  app.use('/api/license', licenseRouter)
  app.use('/webhook', webhookRouter)
  app.use('/admin', adminRouter)

  // 7. Waitlist Endpoint
  const waitlistLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many waitlist registrations.',
  })

  app.post('/api/waitlist', waitlistLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body as { email?: string }
      if (!email || !email.includes('@') || !email.includes('.')) {
        res.status(400).json({ success: false, reason: 'Invalid email' })
        return
      }
      const cleanEmail = email.trim().toLowerCase()
      const db = getDb()
      try {
        await db.execute({
          sql: 'INSERT INTO waitlist (email, created_at) VALUES (?, ?)',
          args: [cleanEmail, Date.now()],
        })
      } catch {}
      res.json({ success: true, message: 'Added to waitlist', coupon: 'ZENDEV20' })
    } catch (err) {
      res.status(500).json({ success: false, reason: 'Server error' })
    }
  })

  // 8. 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  })

  // 9. Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error', message: err.message })
  })

  return app
}

/**
 * Initializes in-memory test database and clears all table data.
 */
export async function resetTestDb(): Promise<void> {
  await migrate()
  const db = getDb()
  await db.execute('DELETE FROM activations')
  await db.execute('DELETE FROM licenses')
  await db.execute('DELETE FROM coupons')
  await db.execute('DELETE FROM admin_audit_logs')
  await db.execute('DELETE FROM admin_settings')
  await db.execute('DELETE FROM webhook_dlq')
  await db.execute('DELETE FROM waitlist')
}

/**
 * Signs a webhook payload using HMAC-SHA256 matching LemonSqueezy specifications.
 */
export function signWebhookPayload(payload: string | Buffer, secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET']!): string {
  const buf = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload
  return createHmac('sha256', secret).update(buf).digest('hex')
}

/**
 * Helper to seed a license directly into test database.
 */
export async function seedTestLicense(options: {
  key: string
  tier?: string
  expiresAt?: number
  maxActivations?: number
  isRevoked?: number
  email?: string
  customerName?: string
  lastHwidReset?: number
}): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `
      INSERT INTO licenses (
        key, tier, expires_at, max_activations, is_revoked, email, customer_name, last_hwid_reset, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      options.key,
      options.tier ?? 'pro',
      options.expiresAt ?? 0,
      options.maxActivations ?? 2,
      options.isRevoked ?? 0,
      options.email ?? 'test@zendev.app',
      options.customerName ?? 'Test Developer',
      options.lastHwidReset ?? 0,
      Date.now(),
    ],
  })
}
