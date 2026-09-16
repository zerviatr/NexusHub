/**
 * server/src/routes/webhook.ts
 *
 * POST /webhook/lemonsqueezy
 *
 * Handles incoming LemonSqueezy webhook events.
 * Verifies HMAC-SHA256 signature, enforces idempotency, processes orders/revocations
 * atomically via LibSQL transactions, and implements a Dead-Letter Queue (DLQ)
 * to ensure failed webhook events are never lost.
 *
 * Docs: https://docs.lemonsqueezy.com/help/webhooks
 */
import { Router, Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { getDb, withTransaction } from '../db'
import { generateKey, tierToExpiry } from '../keyGen'
import { sendLicenseEmail } from '../email'

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer
    }
  }
}

export interface WebhookRequest extends Request {
  rawBody?: Buffer
}

export interface WebhookDlqRecord {
  id: number
  event_name: string | null
  payload: string
  error_message: string
  retry_count: number
  status: 'failed' | 'retried' | 'resolved'
  created_at: number
  last_retry_at: number | null
}

export interface ProcessWebhookResult {
  handled: boolean
  key?: string
  revoked?: boolean
  duplicate?: boolean
  ignored?: boolean
  emailSent?: boolean
}

/**
 * Enqueues a failed or unprocessable webhook event into the Dead-Letter Queue (DLQ).
 */
export async function enqueueWebhookDlq(
  eventName: string | null | undefined,
  payload: unknown,
  errorMessage: string
): Promise<number | null> {
  try {
    const db = getDb()
    const payloadStr =
      typeof payload === 'string'
        ? payload
        : payload instanceof Buffer
          ? payload.toString('utf8')
          : JSON.stringify(payload ?? {})

    const result = await db.execute({
      sql: `INSERT INTO webhook_dlq (event_name, payload, error_message, retry_count, status, created_at)
            VALUES (?, ?, ?, 0, 'failed', ?)`,
      args: [eventName ?? 'unknown', payloadStr, errorMessage, Date.now()],
    })
    console.warn(`[webhook:dlq] Stored failed event '${eventName}' in DLQ (id=${result.lastInsertRowid}): ${errorMessage}`)
    return Number(result.lastInsertRowid ?? 0)
  } catch (dlqErr) {
    console.error('[webhook:dlq] Critical: Failed to record event into webhook_dlq table:', dlqErr)
    return null
  }
}

/**
 * Retrieves records from the Dead-Letter Queue for auditing and replay.
 */
export async function getWebhookDlqEntries(
  limit: number = 50,
  status?: string
): Promise<WebhookDlqRecord[]> {
  const db = getDb()
  const res = status
    ? await db.execute({
        sql: `SELECT * FROM webhook_dlq WHERE status = ? ORDER BY created_at DESC LIMIT ?`,
        args: [status, limit],
      })
    : await db.execute({
        sql: `SELECT * FROM webhook_dlq ORDER BY created_at DESC LIMIT ?`,
        args: [limit],
      })

  return res.rows.map((row) => ({
    id: Number(row.id),
    event_name: row.event_name ? String(row.event_name) : null,
    payload: String(row.payload ?? ''),
    error_message: String(row.error_message ?? ''),
    retry_count: Number(row.retry_count ?? 0),
    status: (row.status as 'failed' | 'retried' | 'resolved') || 'failed',
    created_at: Number(row.created_at ?? 0),
    last_retry_at: row.last_retry_at ? Number(row.last_retry_at) : null,
  }))
}

/**
 * Core processor for validated LemonSqueezy webhook payloads.
 * Wrapped with LibSQL transaction support.
 */
export async function processWebhookPayload(
  event: string | undefined,
  payload: Record<string, any>
): Promise<ProcessWebhookResult> {
  const data = payload?.data
  const attrs = data?.attributes

  // ── 1. Handle order_created ───────────────────────────────────────────
  if (event === 'order_created' && attrs?.status === 'paid') {
    const orderId = String(data?.id ?? '')
    const email = attrs?.user_email as string | undefined

    if (!email || !orderId) {
      throw new Error(`Missing required fields in order_created: orderId='${orderId}', email='${email}'`)
    }

    // Map LemonSqueezy variant/product to tier and duration
    const variantName = (attrs?.first_order_item?.variant_name as string ?? '').toLowerCase()

    let tier = 'pro'
    let monthsExpiry = 12
    if (variantName.includes('team') || variantName.includes('studio')) {
      tier = 'team'
      monthsExpiry = variantName.includes('month') ? 1 : 12
    } else if (variantName.includes('free')) {
      tier = 'free'
      monthsExpiry = 0
    } else if (variantName.includes('month')) {
      tier = 'pro'
      monthsExpiry = 1
    } else if (variantName.includes('lifetime')) {
      tier = 'lifetime'
      monthsExpiry = 0
    } else {
      tier = 'pro'
      monthsExpiry = 12
    }

    const secret = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'
    const expiresAt = monthsExpiry === 0 ? 0 : Date.now() + monthsExpiry * (30.44 * 24 * 3600 * 1000)
    const key = generateKey(tier, expiresAt, secret)

    const db = getDb()

    // Check for duplicate order (idempotency)
    const existing = await db.execute({
      sql: 'SELECT key FROM licenses WHERE order_id = ?',
      args: [orderId],
    })

    if (existing.rows.length > 0) {
      console.log(`[webhook] Duplicate order ${orderId}, skipping`)
      return { handled: true, duplicate: true }
    }

    const userName = (attrs?.user_name || attrs?.customer_name || '').trim()
    const userCountry = (attrs?.country || attrs?.billing_address?.country || '').trim()
    const maxActivations = (tier === 'team' || variantName.includes('studio')) ? (variantName.includes('5') ? 5 : 3) : 2

    // Atomically persist license in a transaction
    await withTransaction(async (tx) => {
      await tx.execute({
        sql: `
          INSERT INTO licenses (key, tier, expires_at, order_id, email, customer_name, customer_country, max_activations, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          key,
          tier,
          expiresAt,
          orderId,
          email,
          userName || null,
          userCountry || null,
          maxActivations,
          Date.now(),
        ],
      })
    })

    let emailSent = false
    try {
      await sendLicenseEmail({ to: email, key, tier, expiresAt })
      emailSent = true
      console.log(`[webhook] License key sent to ${email}`)
    } catch (err: unknown) {
      const emailError = err instanceof Error ? err.message : String(err)
      console.error('[webhook] Email delivery failed:', emailError)
      // Save to DLQ so transactional email can be inspected and retried
      await enqueueWebhookDlq('order_email_delivery_failed', { orderId, email, key, tier, expiresAt }, emailError)
    }

    return { handled: true, key, emailSent }
  }

  // ── 2. Handle refund / chargeback / subscription cancellation ────────
  if (event === 'order_refunded' || event === 'subscription_cancelled' || event === 'subscription_expired') {
    const orderId = String(attrs?.order_id ?? data?.id ?? '')
    if (!orderId) {
      throw new Error(`Missing orderId for revocation event '${event}'`)
    }

    await withTransaction(async (tx) => {
      await tx.execute({
        sql: 'UPDATE licenses SET is_revoked = 1 WHERE order_id = ?',
        args: [orderId],
      })
    })

    console.log(`[webhook] Revoked license due to ${event} for order ${orderId}`)
    return { handled: true, revoked: true }
  }

  return { handled: false, ignored: true }
}

/**
 * Retries a failed event stored in the Dead-Letter Queue.
 */
export async function retryWebhookDlqEntry(id: number): Promise<{ success: boolean; error?: string }> {
  const db = getDb()
  const rows = await db.execute({
    sql: 'SELECT * FROM webhook_dlq WHERE id = ?',
    args: [id],
  })

  if (rows.rows.length === 0) {
    return { success: false, error: 'DLQ record not found' }
  }

  const record = rows.rows[0]
  const event = record.event_name ? String(record.event_name) : undefined
  const payloadStr = String(record.payload ?? '{}')

  let payload: Record<string, any>
  try {
    payload = JSON.parse(payloadStr)
  } catch (err: unknown) {
    const parseError = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Invalid payload JSON: ${parseError}` }
  }

  try {
    await processWebhookPayload(event, payload)
    await db.execute({
      sql: `UPDATE webhook_dlq SET status = 'resolved', retry_count = retry_count + 1, last_retry_at = ? WHERE id = ?`,
      args: [Date.now(), id],
    })
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await db.execute({
      sql: `UPDATE webhook_dlq SET retry_count = retry_count + 1, last_retry_at = ?, error_message = ? WHERE id = ?`,
      args: [Date.now(), errorMsg, id],
    })
    return { success: false, error: errorMsg }
  }
}

export const webhookRouter = Router()

// LemonSqueezy sends the raw body as the signature input — we need it unparsed.
webhookRouter.post(
  '/lemonsqueezy',
  async (req: WebhookRequest, res: Response): Promise<void> => {
    // ── 1. Verify signature ───────────────────────────────────────────────
    const secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET'] ?? ''
    const sigHeader = req.headers['x-signature'] as string | undefined

    if (!secret || !sigHeader) {
      res.status(401).json({ error: 'Missing webhook secret or signature' })
      return
    }

    const rawBody = req.rawBody
    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw body' })
      return
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

    try {
      const sigBuf = Buffer.from(sigHeader, 'hex')
      const expBuf = Buffer.from(expected, 'hex')
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }
    } catch {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    // ── 2. Parse event ────────────────────────────────────────────────────
    const event = req.headers['x-event-name'] as string | undefined
    let payload: Record<string, any>
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch (e: unknown) {
      const parseError = e instanceof Error ? e.message : 'Invalid JSON payload'
      await enqueueWebhookDlq(event, rawBody.toString('utf8'), `Payload JSON parse failure: ${parseError}`)
      res.status(400).json({ error: 'Bad Request' })
      return
    }

    console.log(`[webhook] event=${event}`)

    // ── 3. Process event with Dead-Letter Queue protection ───────────────
    try {
      const result = await processWebhookPayload(event, payload)
      res.json({ ok: true, ...result })
    } catch (processErr: unknown) {
      const errorMsg = processErr instanceof Error ? processErr.message : String(processErr)
      console.error(`[webhook] Processing failed for event '${event}':`, errorMsg)
      await enqueueWebhookDlq(event, payload, errorMsg)
      res.status(500).json({ error: 'Webhook processing failed', dlq: true })
    }
  },
)

// ── 4. DLQ Inspection and Management Endpoints ─────────────────────────
webhookRouter.get('/dlq', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 50)))
    const status = req.query['status'] as string | undefined
    const entries = await getWebhookDlqEntries(limit, status)
    res.json({ success: true, count: entries.length, entries })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message })
  }
})

webhookRouter.post('/dlq/retry/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params['id'])
    if (!id || isNaN(id)) {
      res.status(400).json({ success: false, error: 'Valid DLQ ID is required' })
      return
    }

    const retryResult = await retryWebhookDlqEntry(id)
    if (retryResult.success) {
      res.json({ success: true, message: `DLQ entry ${id} reprocessed successfully` })
    } else {
      res.status(422).json({ success: false, error: retryResult.error })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message })
  }
})
