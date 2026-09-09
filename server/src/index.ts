/**
 * server/src/index.ts
 *
 * NexusHub License API Server
 * Express + LibSQL (Turso) + LemonSqueezy webhooks + Resend email
 *
 * Endpoints:
 *   POST /webhook/lemonsqueezy    — Payment events from LemonSqueezy
 *   POST /api/license/activate    — Electron: activate key on device
 *   POST /api/license/verify      — Electron: 24h heartbeat check
 *   POST /api/license/deactivate  — Electron: free up activation slot
 *   GET  /health                  — Railway health check
 */
import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { getDb, migrate } from './db'
import { webhookRouter } from './routes/webhook'
import { licenseRouter } from './routes/license'
import { adminRouter }   from './routes/admin'
import { renderLandingPage } from './landingPageHtml'

const app  = express()
app.disable('x-powered-by')
const PORT = Number(process.env['PORT'] ?? 3000)

// ── Raw body capture for webhook signature verification ────────────────────
// Must run BEFORE express.json() for the /webhook/* routes
app.use('/webhook', (req: Request, _res: Response, next: NextFunction) => {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => {
    ;(req as any).rawBody = Buffer.concat(chunks)
    next()
  })
})

// ── Body parsing for all other routes ─────────────────────────────────────
app.use(express.json())

// ── Security Headers ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

// ── CORS ───────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  const allowed = process.env['ALLOWED_ORIGINS']
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed)
  } else {
    // Dev: allow all
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(renderLandingPage())
})

// ── Waitlist Lead Capture ──────────────────────────────────────────────────
app.post('/api/waitlist', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string }
    if (!email || !email.includes('@') || !email.includes('.')) {
      res.status(400).json({ success: false, reason: 'Geçerli bir e-posta adresi girin.' })
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    const db = getDb()
    try {
      await db.execute({
        sql: 'INSERT INTO waitlist (email, created_at) VALUES (?, ?)',
        args: [cleanEmail, Date.now()],
      })
    } catch {
      // If already registered, still treat as friendly success
    }

    res.json({
      success: true,
      message: 'Erken erişim bekleme listesine başarıyla eklendiniz! Lansmanda %20 indirim kuponunuzla birlikte e-posta alacaksınız.',
      coupon: 'NEXUS20',
    })
  } catch (err: any) {
    console.error('[waitlist] error:', err)
    res.status(500).json({ success: false, reason: 'Sunucu hatası' })
  }
})


// ── Recent Social Proof Activations Feed ────────────────────────────────────
app.get('/api/recent-activations', async (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const result = await db.execute(`
      SELECT 
        l.tier,
        l.created_at,
        l.sales_channel
      FROM licenses l
      WHERE l.is_revoked = 0
      ORDER BY l.created_at DESC
      LIMIT 12
    `)

    const cities = ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Berlin', 'London', 'San Francisco', 'Amsterdam', 'New York']
    const names = ['Kerem A.', 'Ece T.', 'Caner M.', 'Mert S.', 'Alex R.', 'Zeynep K.', 'David H.', 'Burak D.', 'Sarah L.']

    const feed = result.rows.map((r: any, idx: number) => {
      const city = cities[idx % cities.length]
      const name = names[idx % names.length]
      const tierName = r.tier === 'team' || r.tier === 'studio' ? 'Studio Pack' : 'Lifetime Pro'
      return {
        customer: name,
        location: city,
        tier: tierName,
        timeAgo: `${(idx + 1) * 7 + 2} dk önce`
      }
    })

    res.json({ success: true, feed })
  } catch (err: any) {
    res.json({ success: false, feed: [] })
  }
})

app.use('/webhook',      webhookRouter)
app.use('/api/license',  licenseRouter)
app.use('/admin',        adminRouter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() })
})

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Startup ────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await migrate()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] NexusHub License API running on port ${PORT}`)
    console.log(`[server] Env: ${process.env['NODE_ENV'] ?? 'development'}`)
  })
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err)
  process.exit(1)
})
