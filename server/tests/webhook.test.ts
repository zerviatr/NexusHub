import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import {
  createTestApp,
  resetTestDb,
  signWebhookPayload,
  seedTestLicense,
  nextIp,
} from './helpers'
import { getDb } from '../src/db'

describe('Server Webhook & DLQ API Endpoints (/webhook/*)', () => {
  const app = createTestApp()

  beforeEach(async () => {
    await resetTestDb()
  })

  describe('HMAC-SHA256 Signature Verification', () => {
    it('should reject request missing x-signature header with 401', async () => {
      const payload = JSON.stringify({ data: { type: 'orders' } })
      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(res.status).toBe(401)
      expect(res.body.error).toContain('Missing webhook secret or signature')
    })

    it('should reject request with forged/invalid x-signature with 401', async () => {
      const payload = JSON.stringify({ data: { type: 'orders' } })
      const forgedSig = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', forgedSig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(res.status).toBe(401)
      expect(res.body.error).toContain('Invalid signature')
    })

    it('should reject malformed signature buffer with 401', async () => {
      const payload = JSON.stringify({ data: { type: 'orders' } })
      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', 'not-even-hex!')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(res.status).toBe(401)
      expect(res.body.error).toContain('Invalid signature')
    })
  })

  describe('Payload Parsing & DLQ Logging for Corrupted Payloads', () => {
    it('should catch malformed JSON payloads, log to webhook_dlq, and return 400 Bad Request', async () => {
      const corruptPayload = '{ "data": { "id": 12345, invalid json...'
      const sig = signWebhookPayload(corruptPayload)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(corruptPayload)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Bad Request')

      // Verify that DLQ recorded the malformed payload
      const db = getDb()
      const dlqRows = await db.execute({
        sql: 'SELECT * FROM webhook_dlq WHERE event_name = ?',
        args: ['order_created'],
      })
      expect(dlqRows.rows.length).toBeGreaterThanOrEqual(1)
      expect(dlqRows.rows[0]?.error_message).toContain('JSON')
    })
  })

  describe('Event: order_created (Successful License Generation)', () => {
    it('should generate Pro license on valid paid order_created event', async () => {
      const orderPayload = {
        data: {
          id: 'ord_test_1001',
          attributes: {
            status: 'paid',
            user_email: 'buyer@example.com',
            user_name: 'Alice Smith',
            country: 'US',
            first_order_item: {
              variant_name: 'ZenDev Pro Annual License',
            },
          },
        },
      }

      const bodyStr = JSON.stringify(orderPayload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.key).toBeDefined()
      expect(res.body.key).toMatch(/^NEXUS/)

      // Verify license stored in DB
      const db = getDb()
      const dbRes = await db.execute({
        sql: 'SELECT * FROM licenses WHERE order_id = ?',
        args: ['ord_test_1001'],
      })
      expect(dbRes.rows.length).toBe(1)
      expect(dbRes.rows[0]?.tier).toBe('pro')
      expect(dbRes.rows[0]?.email).toBe('buyer@example.com')
      expect(dbRes.rows[0]?.customer_name).toBe('Alice Smith')
    })

    it('should map Studio/Team variant names to tier=team with 3 max activations', async () => {
      const orderPayload = {
        data: {
          id: 'ord_studio_2002',
          attributes: {
            status: 'paid',
            user_email: 'studio@creative.io',
            first_order_item: {
              variant_name: 'ZenDev Studio Pack (3 Seats)',
            },
          },
        },
      }

      const bodyStr = JSON.stringify(orderPayload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const db = getDb()
      const dbRes = await db.execute({
        sql: 'SELECT * FROM licenses WHERE order_id = ?',
        args: ['ord_studio_2002'],
      })
      expect(dbRes.rows[0]?.tier).toBe('team')
      expect(Number(dbRes.rows[0]?.max_activations)).toBe(3)
    })

    it('should handle duplicate order_created idempotently without creating multiple licenses', async () => {
      const orderPayload = {
        data: {
          id: 'ord_idempotent_3003',
          attributes: {
            status: 'paid',
            user_email: 'repeat@example.com',
            first_order_item: { variant_name: 'Lifetime License' },
          },
        },
      }

      const bodyStr = JSON.stringify(orderPayload)
      const sig = signWebhookPayload(bodyStr)

      // First webhook post
      const res1 = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)
      expect(res1.status).toBe(200)
      expect(res1.body.key).toBeDefined()

      // Second webhook post (exact duplicate replay)
      const res2 = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)
      expect(res2.status).toBe(200)
      expect(res2.body.ok).toBe(true)
      expect(res2.body.duplicate).toBe(true)

      // Verify only 1 row in DB
      const db = getDb()
      const rows = await db.execute({
        sql: 'SELECT * FROM licenses WHERE order_id = ?',
        args: ['ord_idempotent_3003'],
      })
      expect(rows.rows.length).toBe(1)
    })

    it('should catch missing email during order_created and route to DLQ with 500', async () => {
      const payload = {
        data: {
          id: 'ord_no_email',
          attributes: {
            status: 'paid',
            // Missing user_email
          },
        },
      }
      const bodyStr = JSON.stringify(payload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(500)
      expect(res.body.dlq).toBe(true)

      // Verify DLQ stored the failure
      const db = getDb()
      const dlqRows = await db.execute({
        sql: 'SELECT * FROM webhook_dlq WHERE payload LIKE ?',
        args: ['%ord_no_email%'],
      })
      expect(dlqRows.rows.length).toBe(1)
      expect(dlqRows.rows[0]?.error_message).toContain('email')
    })
  })

  describe('Events: Revocation (order_refunded & subscription_cancelled)', () => {
    it('should immediately revoke license on order_refunded', async () => {
      // First seed a license linked to order 5555
      const db = getDb()
      await db.execute({
        sql: `INSERT INTO licenses (key, tier, order_id, email, is_revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
        args: ['REFUND-TARGET-KEY', 'pro', 'ord_refund_5555', 'buyer@test.com', Date.now()],
      })

      const refundPayload = {
        data: {
          id: 'ord_refund_5555',
          attributes: {
            order_id: 'ord_refund_5555',
            status: 'refunded',
          },
        },
      }
      const bodyStr = JSON.stringify(refundPayload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_refunded')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.revoked).toBe(true)

      // Verify in DB that is_revoked = 1
      const updated = await db.execute({
        sql: 'SELECT is_revoked FROM licenses WHERE order_id = ?',
        args: ['ord_refund_5555'],
      })
      expect(Number(updated.rows[0]?.is_revoked)).toBe(1)
    })

    it('should revoke license on subscription_cancelled or subscription_expired', async () => {
      const db = getDb()
      await db.execute({
        sql: `INSERT INTO licenses (key, tier, order_id, email, is_revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
        args: ['SUB-TARGET-KEY', 'pro', 'sub_9999', 'sub@test.com', Date.now()],
      })

      const cancelPayload = {
        data: {
          id: 'sub_9999',
          attributes: {
            order_id: 'sub_9999',
          },
        },
      }
      const bodyStr = JSON.stringify(cancelPayload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'subscription_cancelled')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(200)
      expect(res.body.revoked).toBe(true)

      const updated = await db.execute({
        sql: 'SELECT is_revoked FROM licenses WHERE order_id = ?',
        args: ['sub_9999'],
      })
      expect(Number(updated.rows[0]?.is_revoked)).toBe(1)
    })

    it('should return ignored: true for unhandled webhook events', async () => {
      const payload = { data: { type: 'license_keys' } }
      const bodyStr = JSON.stringify(payload)
      const sig = signWebhookPayload(bodyStr)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'unhandled_custom_event')
        .set('X-Forwarded-For', nextIp())
        .send(bodyStr)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.ignored).toBe(true)
    })
  })

  describe('DLQ Inspection and Management Endpoints (/webhook/dlq)', () => {
    it('should list DLQ entries with limit and status filtering', async () => {
      const db = getDb()
      await db.execute({
        sql: `INSERT INTO webhook_dlq (event_name, payload, error_message, status, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: ['order_created', '{"test":1}', 'Email timeout', 'failed', Date.now()],
      })
      await db.execute({
        sql: `INSERT INTO webhook_dlq (event_name, payload, error_message, status, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: ['subscription_updated', '{"test":2}', 'DB constraint violation', 'resolved', Date.now()],
      })

      // Get all
      const resAll = await request(app).get('/webhook/dlq').set('X-Forwarded-For', nextIp())
      expect(resAll.status).toBe(200)
      expect(resAll.body.success).toBe(true)
      expect(resAll.body.entries.length).toBe(2)

      // Filter by status=failed
      const resFailed = await request(app)
        .get('/webhook/dlq?status=failed')
        .set('X-Forwarded-For', nextIp())
      expect(resFailed.status).toBe(200)
      expect(resFailed.body.entries.length).toBe(1)
      expect(resFailed.body.entries[0].error_message).toBe('Email timeout')
    })

    it('should validate ID and handle retry attempts on DLQ entries', async () => {
      const resInvalid = await request(app)
        .post('/webhook/dlq/retry/abc')
        .set('X-Forwarded-For', nextIp())
      expect(resInvalid.status).toBe(400)
      expect(resInvalid.body.error).toContain('Valid DLQ ID')

      // Retry non-existent entry
      const res404 = await request(app)
        .post('/webhook/dlq/retry/99999')
        .set('X-Forwarded-For', nextIp())
      expect(res404.status).toBe(422)
      expect(res404.body.success).toBe(false)
    })
  })
})
