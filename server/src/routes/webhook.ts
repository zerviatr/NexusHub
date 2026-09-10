/**
 * server/src/routes/webhook.ts
 *
 * POST /webhook/lemonsqueezy
 *
 * Handles incoming LemonSqueezy webhook events.
 * Verifies the HMAC-SHA256 signature, then:
 *   - order_created → generate key, store in DB, email to buyer
 *   - subscription_cancelled → revoke key
 *
 * Docs: https://docs.lemonsqueezy.com/help/webhooks
 */
import { Router, Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { getDb } from '../db'
import { generateKey, tierToExpiry } from '../keyGen'
import { sendLicenseEmail } from '../email'

export const webhookRouter = Router()

// LemonSqueezy sends the raw body as the signature input — we need it unparsed.
// In index.ts we mount this router BEFORE express.json() for this path.
webhookRouter.post(
  '/lemonsqueezy',
  async (req: Request, res: Response): Promise<void> => {
    // ── 1. Verify signature ───────────────────────────────────────────────
    const secret    = process.env['LEMONSQUEEZY_WEBHOOK_SECRET'] ?? ''
    const sigHeader = req.headers['x-signature'] as string | undefined

    if (!secret || !sigHeader) {
      res.status(401).json({ error: 'Missing webhook secret or signature' })
      return
    }

    const rawBody = (req as any).rawBody as Buffer | undefined
    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw body' })
      return
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

    try {
      const sigBuf = Buffer.from(sigHeader, 'hex')
      const expBuf = Buffer.from(expected,  'hex')
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }
    } catch {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    // ── 2. Parse event ────────────────────────────────────────────────────
    const event    = req.headers['x-event-name'] as string | undefined
    const payload  = JSON.parse(rawBody.toString('utf8'))
    const data     = payload?.data
    const attrs    = data?.attributes

    console.log(`[webhook] event=${event}`)

    // ── 3. Handle order_created ───────────────────────────────────────────
    if (event === 'order_created' && attrs?.status === 'paid') {
      const orderId = String(data?.id ?? '')
      const email   = attrs?.user_email as string | undefined

      if (!email) {
        res.status(400).json({ error: 'No email in payload' })
        return
      }

      // Map LemonSqueezy variant/product to tier
      const variantName = (
        attrs?.first_order_item?.variant_name as string ?? ''
      ).toLowerCase()

      let tier = 'lifetime'
      if (variantName.includes('team') || variantName.includes('studio')) tier = 'team'
      else if (variantName.includes('free')) tier = 'free'
      else if (variantName.includes('annual') || variantName.includes('year') || variantName.includes('sub')) tier = 'pro'

      const secret   = process.env['NEXUS_LICENSE_SECRET'] ?? 'NEXUS_DEV_SECRET_DO_NOT_USE_IN_PROD'
      const expiresAt = tierToExpiry(tier)
      const key       = generateKey(tier, expiresAt, secret)

      const db = getDb()

      // Check for duplicate order (idempotency)
      const existing = await db.execute({
        sql:  'SELECT key FROM licenses WHERE order_id = ?',
        args: [orderId],
      })

      if (existing.rows.length > 0) {
        console.log(`[webhook] Duplicate order ${orderId}, skipping`)
        res.json({ ok: true, duplicate: true })
        return
      }

      const userName = (attrs?.user_name || attrs?.customer_name || '').trim()
      const userCountry = (attrs?.country || attrs?.billing_address?.country || '').trim()

      await db.execute({
        sql: `
          INSERT INTO licenses (key, tier, expires_at, order_id, email, customer_name, customer_country, max_activations, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [key, tier, expiresAt, orderId, email, userName || null, userCountry || null, (tier === 'team' || variantName.includes('studio')) ? 3 : (tier === 'lifetime' ? 2 : 2), Date.now()],
      })

      // Send email with the key
      try {
        await sendLicenseEmail({ to: email, key, tier, expiresAt })
        console.log(`[webhook] License key sent to ${email}`)
      } catch (err) {
        console.error('[webhook] Email failed:', err)
        // Don't fail the webhook — key is in DB, can be resent manually
      }

      res.json({ ok: true, key })
      return
    }

    // ── 4. Handle subscription_cancelled → revoke ─────────────────────────
    // Handle refund / chargeback -> instantly revoke license
    if (event === 'order_refunded' || event === 'subscription_cancelled' || event === 'subscription_expired') {
      const orderId = String(attrs?.order_id ?? data?.id ?? '')
      if (orderId) {
        await getDb().execute({
          sql:  'UPDATE licenses SET is_revoked = 1 WHERE order_id = ?',
          args: [orderId],
        })
        console.log(`[webhook] Revoked license due to ${event} for order ${orderId}`)
      }
      res.json({ ok: true, revoked: true })
      return
    }

    if (false && event === 'subscription_cancelled') {
      const orderId = String(attrs?.order_id ?? data?.attributes?.order_id ?? '')
      if (orderId) {
        await getDb().execute({
          sql:  'UPDATE licenses SET is_revoked = 1 WHERE order_id = ?',
          args: [orderId],
        })
        console.log(`[webhook] Revoked license for order ${orderId}`)
      }
      res.json({ ok: true })
      return
    }

    // Unhandled event — return 200 to prevent LS retry spam
    res.json({ ok: true, ignored: true })
  },
)
