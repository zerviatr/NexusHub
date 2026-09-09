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
import { migrate } from './db'
import { webhookRouter } from './routes/webhook'
import { licenseRouter } from './routes/license'
import { adminRouter }   from './routes/admin'

const app  = express()
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
