/**
 * server/src/index.ts
 *
 * ZenDev License API Server
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
import { createRateLimiter } from './middleware/rateLimiter'

const app  = express()
app.disable('x-powered-by')
const PORT = Number(process.env['PORT'] ?? 3000)

// ── Raw body capture for webhook signature verification ────────────────────
// Must run BEFORE express.json() for the /webhook/* routes
app.use('/webhook', (req: Request, res: Response, next: NextFunction) => {
  const chunks: Buffer[] = []
  let totalBytes = 0
  const MAX_WEBHOOK_SIZE = 1024 * 1024 // 1MB limit

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

// ── Body parsing for all other routes ─────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

// ── Enhanced Security Headers ──────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  next()
})

const waitlistLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Kısa süre içinde çok fazla bekleme listesi kaydı yapıldı. Lütfen daha sonra tekrar deneyin.',
})

const feedLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Çok fazla istek gönderildi.',
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
// ── SEO: robots.txt ────────────────────────────────────────────────────────
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /webhook/

Sitemap: https://zendev-production-4a5b.up.railway.app/sitemap.xml
`.trim())
})

// ── SEO: sitemap.xml ───────────────────────────────────────────────────────
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const baseUrl = 'https://zendev-production-4a5b.up.railway.app'
  const currentDate = new Date().toISOString().split('T')[0]

  const urls = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: '/#simulator', priority: '0.9', changefreq: 'monthly' },
    { path: '/#arsenal', priority: '0.9', changefreq: 'monthly' },
    { path: '/#pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/#faq', priority: '0.7', changefreq: 'monthly' }
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${baseUrl}${u.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`.trim()

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.send(xml)
})

app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(renderLandingPage())
})

// ── Waitlist Lead Capture ──────────────────────────────────────────────────
app.post('/api/waitlist', waitlistLimiter, async (req: Request, res: Response) => {
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
      coupon: 'ZENDEV20',
    })
  } catch (err: any) {
    console.error('[waitlist] error:', err)
    res.status(500).json({ success: false, reason: 'Sunucu hatası' })
  }
})


// ── Privacy-Preserving Real Social Proof Helpers ────────────────────────────
function maskCustomer(name?: string, email?: string): string {
  if (name && name.trim().length > 1) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      const first = parts[0]
      const last = parts[parts.length - 1]
      return `${first[0]}***${first.slice(-1)} ${last[0]}.`
    }
    const single = parts[0]
    return `${single[0]}***${single.slice(-1)}`
  }
  if (email && email.includes('@')) {
    const [user] = email.split('@')
    if (user.length <= 2) return `${user[0]}***`
    return `${user[0]}***${user.slice(-1)}`
  }
  return 'Geliştirici'
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'az önce'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dakika önce`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} saat önce`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

function resolveTierTitle(tier: string): string {
  if (tier === 'lifetime') return 'ZenDev Lifetime Pro'
  if (tier === 'team' || tier === 'studio') return 'ZenDev Studio Pack'
  if (tier === 'trial') return 'ZenDev Pro Deneme'
  return 'ZenDev Pro'
}

// ── Real Recent Social Proof Activations Feed ───────────────────────────────
app.get('/api/recent-activations', feedLimiter, async (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const result = await db.execute(`
      SELECT 
        l.key,
        l.tier,
        l.email,
        l.customer_name,
        l.customer_country,
        l.created_at,
        (SELECT COUNT(*) FROM activations a WHERE a.license_key = l.key) as activation_count,
        (SELECT MAX(a.activated_at) FROM activations a WHERE a.license_key = l.key) as last_activated_at
      FROM licenses l
      WHERE l.is_revoked = 0
      ORDER BY l.created_at DESC
      LIMIT 15
    `)

    const activations = result.rows.map((r: any) => {
      const maskedUser = maskCustomer(r.customer_name, r.email)
      const country = r.customer_country || 'Global'
      const tierTitle = resolveTierTitle(r.tier)
      const hasActivated = Number(r.activation_count || 0) > 0
      const eventTimestamp = Number(hasActivated && r.last_activated_at ? r.last_activated_at : r.created_at)

      return {
        icon: hasActivated ? '⚡' : '🎟️',
        user: `${maskedUser} (${country})`,
        action: hasActivated ? `${tierTitle} lisansını aktive etti` : `${tierTitle} satın aldı`,
        time: formatRelativeTime(eventTimestamp),
        country,
        tier: r.tier,
        key: r.key ? `${String(r.key).slice(0, 8)}***` : '',
      }
    })

    // Return under both keys for backward and forward compatibility
    res.json({ success: true, activations, feed: activations })
  } catch (err: any) {
    console.error('[recent-activations] error:', err)
    res.json({ success: false, activations: [], feed: [] })
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
    console.log(`[server] ZenDev License API running on port ${PORT}`)
    console.log(`[server] Env: ${process.env['NODE_ENV'] ?? 'development'}`)
  })
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err)
  process.exit(1)
})
