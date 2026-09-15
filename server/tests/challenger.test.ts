import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express, { Request, Response } from 'express'
import {
  createTestApp,
  resetTestDb,
  signWebhookPayload,
  seedTestLicense,
  nextIp,
} from './helpers'
import { getDb, withTransaction, enableForeignKeys } from '../src/db'
import { createRateLimiter } from '../src/middleware/rateLimiter'
import * as emailModule from '../src/email'

describe('CHALLENGER 1: Adversarial Server & Concurrency Verification', () => {
  let app: express.Express

  beforeEach(async () => {
    await resetTestDb()
    app = createTestApp()
  })

  async function loginAsAdmin(): Promise<string> {
    const res = await request(app)
      .post('/admin/api/login')
      .set('X-Forwarded-For', nextIp())
      .send({ password: 'SuperAdminSecretPass123!' })

    if (!res.body.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(res.body)}`)
    }
    return res.body.token
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 1: Transactional Integrity and Concurrency (withTransaction)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Vector 1: Transactional Integrity & Rollback Mechanics', () => {
    it('should roll back all modifications when a JS exception occurs midway in withTransaction', async () => {
      const db = getDb()
      const testKey = 'ROLLBACK-TEST-KEY-1'

      // Attempt transaction that writes to licenses then throws
      await expect(
        withTransaction(async (tx) => {
          await tx.execute({
            sql: `INSERT INTO licenses (key, tier, created_at) VALUES (?, 'pro', ?)`,
            args: [testKey, Date.now()],
          })

          // Verify row exists INSIDE the active transaction
          const inTx = await tx.execute({
            sql: 'SELECT key FROM licenses WHERE key = ?',
            args: [testKey],
          })
          expect(inTx.rows.length).toBe(1)

          // Simulate unhandled operational error
          throw new Error('SIMULATED_DB_ERROR_MID_TRANSACTION')
        })
      ).rejects.toThrow('SIMULATED_DB_ERROR_MID_TRANSACTION')

      // Verify row was completely rolled back from database
      const check = await db.execute({
        sql: 'SELECT key FROM licenses WHERE key = ?',
        args: [testKey],
      })
      expect(check.rows.length).toBe(0)
    })

    it('should enforce foreign key constraints and roll back prior statements on FK violation', async () => {
      const db = getDb()
      await enableForeignKeys(db)

      const validParentKey = 'PARENT-VALID-KEY'
      await seedTestLicense({ key: validParentKey, tier: 'lifetime' })

      const initialCountRes = await db.execute('SELECT COUNT(*) as count FROM activations')
      const initialCount = Number(initialCountRes.rows[0]?.count ?? 0)

      // Transaction: inserts valid activation, then invalid activation violating FK
      await expect(
        withTransaction(async (tx) => {
          // 1. Valid insertion referencing existing parent
          await tx.execute({
            sql: `INSERT INTO activations (license_key, device_id, activated_at, last_seen) VALUES (?, ?, ?, ?)`,
            args: [validParentKey, 'device_valid_1', Date.now(), Date.now()],
          })

          // 2. Invalid insertion referencing non-existent license key
          await tx.execute({
            sql: `INSERT INTO activations (license_key, device_id, activated_at, last_seen) VALUES (?, ?, ?, ?)`,
            args: ['NON-EXISTENT-PARENT-KEY', 'device_invalid_2', Date.now(), Date.now()],
          })
        })
      ).rejects.toThrow(/FOREIGN KEY|constraint/i)

      // Verify that statement 1 was rolled back and activations count didn't increase
      const afterCountRes = await db.execute('SELECT COUNT(*) as count FROM activations')
      expect(Number(afterCountRes.rows[0]?.count)).toBe(initialCount)
    })

    it('should roll back prior statements on unique constraint violation within withTransaction', async () => {
      const db = getDb()
      const couponA = 'COUPON_DUP_TEST_A'
      const couponB = 'COUPON_DUP_TEST_B'

      // Pre-seed couponB
      await db.execute({
        sql: `INSERT INTO coupons (code, days_to_add, is_used, created_at) VALUES (?, 30, 0, ?)`,
        args: [couponB, Date.now()],
      })

      // Transaction attempts to insert couponA, then couponB again (violating PRIMARY KEY)
      await expect(
        withTransaction(async (tx) => {
          await tx.execute({
            sql: `INSERT INTO coupons (code, days_to_add, is_used, created_at) VALUES (?, 15, 0, ?)`,
            args: [couponA, Date.now()],
          })

          // Violates PRIMARY KEY
          await tx.execute({
            sql: `INSERT INTO coupons (code, days_to_add, is_used, created_at) VALUES (?, 60, 0, ?)`,
            args: [couponB, Date.now()],
          })
        })
      ).rejects.toThrow(/UNIQUE|PRIMARY KEY|constraint/i)

      // Coupon A must NOT exist because transaction rolled back
      const resA = await db.execute({
        sql: 'SELECT code FROM coupons WHERE code = ?',
        args: [couponA],
      })
      expect(resA.rows.length).toBe(0)
    })

    it('concurrency test: simultaneous coupon redemptions under withTransaction race condition', async () => {
      const db = getDb()
      const targetKey = 'CONCURRENT-COUPON-KEY'
      const couponCode = 'CONCURRENT-SINGLE-USE-COUPON'
      const baseExpiry = Date.now() + 100000

      await seedTestLicense({ key: targetKey, tier: 'pro', expiresAt: baseExpiry })

      await db.execute({
        sql: `INSERT INTO coupons (code, days_to_add, is_used, created_at) VALUES (?, 30, 0, ?)`,
        args: [couponCode, Date.now()],
      })

      const adminToken = await loginAsAdmin()

      // Simulate 5 simultaneous requests attempting to redeem the exact same single-use coupon
      const requests = Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/admin/api/coupons/redeem')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Forwarded-For', nextIp())
          .send({ key: targetKey, couponCode })
      )

      const responses = await Promise.all(requests)
      const successResponses = responses.filter((r) => r.status === 200 && r.body.success === true)
      const failedResponses = responses.filter((r) => r.status !== 200 || r.body.success === false)

      console.log(`[adversarial] Concurrent coupon redemptions: ${successResponses.length} succeeded, ${failedResponses.length} rejected`)

      // A single-use coupon MUST only be successfully redeemed ONCE
      expect(successResponses.length).toBe(1)
      expect(failedResponses.length).toBe(4)

      // Verify DB state
      const couponCheck = await db.execute({
        sql: 'SELECT is_used, used_by_key FROM coupons WHERE code = ?',
        args: [couponCode],
      })
      expect(Number(couponCheck.rows[0]?.is_used)).toBe(1)
      expect(couponCheck.rows[0]?.used_by_key).toBe(targetKey)
    })

    it('concurrency test: device activation slots race condition check', async () => {
      const testKey = 'CONCURRENT-ACTIVATE-SLOT-KEY'
      // License allows strictly 1 activation
      await seedTestLicense({ key: testKey, tier: 'pro', maxActivations: 1 })

      // Fire 5 concurrent activation requests with 5 different device IDs
      const requests = Array.from({ length: 5 }).map((_, i) =>
        request(app)
          .post('/api/license/activate')
          .set('X-Forwarded-For', nextIp())
          .send({ key: testKey, deviceId: `hardware-device-uuid-${i}-${Date.now()}` })
      )

      const responses = await Promise.all(requests)
      const successfulActivations = responses.filter((r) => r.body && r.body.success === true)
      const rejectedActivations = responses.filter((r) => r.body && r.body.success === false)

      console.log(`[adversarial] Concurrent activations: ${successfulActivations.length} succeeded, ${rejectedActivations.length} rejected`)

      const db = getDb()
      const dbActivations = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM activations WHERE license_key = ?',
        args: [testKey],
      })
      const count = Number(dbActivations.rows[0]?.count ?? 0)

      // The license permits max 1 activation. If race condition exists, count > 1
      expect(count).toBeLessThanOrEqual(1)
      expect(successfulActivations.length).toBe(1)
      expect(rejectedActivations.length).toBe(4)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 2: Webhook DLQ Resilience on Malformed Inputs & Delivery Failures
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Vector 2: Webhook DLQ Behavior & Error Trapping', () => {
    it('should reject corrupt signatures without polluting DLQ', async () => {
      const db = getDb()
      const payload = JSON.stringify({ data: { type: 'orders', id: 'fake_123' } })

      // Attack: signature with invalid characters (non-hex)
      const resNonHex = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('x-signature', 'this_is_not_hex_at_all!@#$%^')
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(resNonHex.status).toBe(401)
      expect(resNonHex.body.error).toContain('Invalid signature')

      // Attack: signature with odd length (corrupt hex buffer)
      const resOddHex = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('x-signature', 'abc12')
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(resOddHex.status).toBe(401)
      expect(resOddHex.body.error).toContain('Invalid signature')

      // Attack: signature of wrong hash length (e.g. 32 chars MD5 instead of 64 chars SHA256)
      const resWrongLen = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('x-signature', '0123456789abcdef0123456789abcdef')
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(payload)

      expect(resWrongLen.status).toBe(401)
      expect(resWrongLen.body.error).toContain('Invalid signature')

      // Verify DLQ is NOT populated with unauthorized bogus requests
      const dlqRows = await db.execute('SELECT COUNT(*) as count FROM webhook_dlq')
      expect(Number(dlqRows.rows[0]?.count)).toBe(0)
    })

    it('should trap malformed JSON payloads with valid signature into DLQ without server crash', async () => {
      const db = getDb()
      const malformedPayloads = [
        '{ "broken: json syntax...',
        '{"data": {"id": 123, "attributes": { unclosed string',
        '', // Empty body
      ]

      for (const broken of malformedPayloads) {
        const sig = signWebhookPayload(broken)
        const res = await request(app)
          .post('/webhook/lemonsqueezy')
          .set('Content-Type', 'application/json')
          .set('x-signature', sig)
          .set('x-event-name', 'order_created')
          .set('X-Forwarded-For', nextIp())
          .send(broken)

        // Server should safely return 400 Bad Request and NOT crash with unhandled exception
        expect(res.status).toBe(400)
      }

      // Check that DLQ captured the malformed JSON failure
      const dlqRows = await db.execute({
        sql: 'SELECT * FROM webhook_dlq WHERE error_message LIKE ?',
        args: ['%JSON%'],
      })
      expect(dlqRows.rows.length).toBeGreaterThanOrEqual(1)
    })

    it('should gracefully trap missing required fields in order_created and route to DLQ', async () => {
      const db = getDb()
      // Missing email and orderId
      const invalidOrder = {
        data: {
          attributes: {
            status: 'paid',
            // Missing id and user_email
          },
        },
      }
      const rawBody = JSON.stringify(invalidOrder)
      const sig = signWebhookPayload(rawBody)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(rawBody)

      expect(res.status).toBe(500)
      expect(res.body.dlq).toBe(true)
      expect(res.body.error).toContain('Webhook processing failed')

      // Verify that DLQ captured the exact missing field error
      const dlqCheck = await db.execute({
        sql: 'SELECT * FROM webhook_dlq WHERE error_message LIKE ?',
        args: ['%Missing required fields%'],
      })
      expect(dlqCheck.rows.length).toBe(1)
      expect(dlqCheck.rows[0]?.event_name).toBe('order_created')
    })

    it('should create license but enqueue to DLQ when downstream email notifier fails', async () => {
      const db = getDb()

      // Spy on sendLicenseEmail and force a downstream network failure (e.g. Resend API timeout)
      const emailSpy = vi.spyOn(emailModule, 'sendLicenseEmail').mockRejectedValueOnce(
        new Error('Resend API Network Timeout (504 Gateway Timeout)')
      )

      const orderPayload = {
        data: {
          id: 'ord_dlq_email_fail_test',
          attributes: {
            status: 'paid',
            user_email: 'customer_email_fail@test.com',
            user_name: 'Test Customer',
            first_order_item: { variant_name: 'ZenDev Pro' },
          },
        },
      }
      const raw = JSON.stringify(orderPayload)
      const sig = signWebhookPayload(raw)

      const res = await request(app)
        .post('/webhook/lemonsqueezy')
        .set('Content-Type', 'application/json')
        .set('x-signature', sig)
        .set('x-event-name', 'order_created')
        .set('X-Forwarded-For', nextIp())
        .send(raw)

      // Webhook should still acknowledge order completion (200 OK) because payment was collected
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.emailSent).toBe(false)
      expect(res.body.key).toBeDefined()

      // License MUST exist in database
      const licRes = await db.execute({
        sql: 'SELECT key FROM licenses WHERE order_id = ?',
        args: ['ord_dlq_email_fail_test'],
      })
      expect(licRes.rows.length).toBe(1)

      // Downstream failure MUST be logged to DLQ for replay/auditing
      const dlqRes = await db.execute({
        sql: 'SELECT * FROM webhook_dlq WHERE event_name = ?',
        args: ['order_email_delivery_failed'],
      })
      expect(dlqRes.rows.length).toBe(1)
      expect(dlqRes.rows[0]?.error_message).toContain('Resend API Network Timeout')

      emailSpy.mockRestore()
    })

    it('should support replaying and resolving DLQ entries via /webhook/dlq/retry/:id', async () => {
      const db = getDb()
      // Seed a failed event in DLQ
      const testOrderId = 'ord_replay_dlq_test_1'
      const payloadObj = {
        data: {
          id: testOrderId,
          attributes: {
            status: 'paid',
            user_email: 'replayed_customer@test.com',
            first_order_item: { variant_name: 'ZenDev Lifetime' },
          },
        },
      }

      const insertRes = await db.execute({
        sql: `INSERT INTO webhook_dlq (event_name, payload, error_message, status, retry_count, created_at)
              VALUES ('order_created', ?, 'Simulated initial network failure', 'failed', 0, ?)`,
        args: [JSON.stringify(payloadObj), Date.now()],
      })
      const dlqId = Number(insertRes.lastInsertRowid)

      // Call retry endpoint
      const retryRes = await request(app)
        .post(`/webhook/dlq/retry/${dlqId}`)
        .set('X-Forwarded-For', nextIp())

      expect(retryRes.status).toBe(200)
      expect(retryRes.body.success).toBe(true)

      // Verify DLQ entry status updated to 'resolved' and retry_count incremented
      const updatedDlq = await db.execute({
        sql: 'SELECT status, retry_count FROM webhook_dlq WHERE id = ?',
        args: [dlqId],
      })
      expect(updatedDlq.rows[0]?.status).toBe('resolved')
      expect(Number(updatedDlq.rows[0]?.retry_count)).toBe(1)

      // Verify license was created during replay
      const licenseRes = await db.execute({
        sql: 'SELECT key, tier FROM licenses WHERE order_id = ?',
        args: [testOrderId],
      })
      expect(licenseRes.rows.length).toBe(1)
      expect(licenseRes.rows[0]?.tier).toBe('lifetime')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 3: Rate Limiter Bypass Resistance Against Spoofed Headers
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Vector 3: Rate Limiter Bypass Resistance & Spoofing Defense', () => {
    it('adversarial check: multi-hop X-Forwarded-For spoofing resistance with trust proxy=1', async () => {
      const testApp = express()
      testApp.set('trust proxy', 1) // Standard reverse proxy configuration
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 2,
        message: 'Rate limit hit',
      })
      testApp.get('/test-proxy', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // Scenario: Attacker passes multiple client IPs in X-Forwarded-For to trick a naive split()[0] limiter:
      // In a reverse proxy setup, client sends "X-Forwarded-For: attacker_spoofed_ip"
      // Reverse proxy (e.g. Railway / Cloudflare / Nginx) appends real client IP:
      // "X-Forwarded-For: attacker_spoofed_ip, 203.0.113.195"
      // Express with trust proxy = 1 MUST use 203.0.113.195, NOT attacker_spoofed_ip!

      const realClientIp = '203.0.113.195'

      // Request 1: Attacker claims to be 1.1.1.1, but real IP is 203.0.113.195
      const res1 = await request(testApp)
        .get('/test-proxy')
        .set('X-Forwarded-For', `1.1.1.1, ${realClientIp}`)
      expect(res1.status).toBe(200)

      // Request 2: Attacker claims to be 2.2.2.2, but real IP is still 203.0.113.195
      const res2 = await request(testApp)
        .get('/test-proxy')
        .set('X-Forwarded-For', `2.2.2.2, ${realClientIp}`)
      expect(res2.status).toBe(200)

      // Request 3: Attacker claims to be 3.3.3.3, but real IP is still 203.0.113.195
      // Under a naive limiter that took the first IP, this would succeed (3 different IPs).
      // Under Express req.ip with trust proxy = 1, Express correctly identifies the real client IP (203.0.113.195) and BLOCKS request 3!
      const res3 = await request(testApp)
        .get('/test-proxy')
        .set('X-Forwarded-For', `3.3.3.3, ${realClientIp}`)

      expect(res3.status).toBe(429)
      expect(res3.body.error).toBe('Rate limit hit')
    })

    it('adversarial check: direct connection spoofing risk evaluation', async () => {
      const testApp = express()
      testApp.set('trust proxy', 1)
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 2,
      })
      testApp.get('/test-direct', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // When trust proxy = 1, if an attacker sends a SINGLE IP in X-Forwarded-For directly to the server:
      // Express treats the incoming socket as the 1 trusted proxy, and the single IP as the client.
      // Send 3 requests with DIFFERENT single spoofed IPs:
      const r1 = await request(testApp).get('/test-direct').set('X-Forwarded-For', '185.220.101.1')
      const r2 = await request(testApp).get('/test-direct').set('X-Forwarded-For', '185.220.101.2')
      const r3 = await request(testApp).get('/test-direct').set('X-Forwarded-For', '185.220.101.3')

      // Note: In an architectural assessment, trust proxy = 1 requires a reverse proxy in front.
      // If deployed behind Railway / Cloudflare, the reverse proxy guarantees that socket address is trusted proxy,
      // and appends the true remote IP to the end of the header.
      expect(r1.status).toBe(200)
      expect(r2.status).toBe(200)
      expect(r3.status).toBe(200)
    })

    it('adversarial check: verify blacklisted IP cannot bypass using IPv6 mapping or whitespace', async () => {
      const testApp = express()
      testApp.set('trust proxy', 1)

      const blockedIp = '198.51.100.99'
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 10,
        blacklist: [blockedIp],
        blacklistMessage: 'BLOCKED',
      })
      testApp.get('/test-blacklist', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // 1. Direct standard IP
      const r1 = await request(testApp).get('/test-blacklist').set('X-Forwarded-For', blockedIp)
      expect(r1.status).toBe(403)
      expect(r1.body.error).toBe('BLOCKED')

      // 2. IPv4-mapped IPv6 variant (::ffff:198.51.100.99)
      const r2 = await request(testApp).get('/test-blacklist').set('X-Forwarded-For', `::ffff:${blockedIp}`)
      expect(r2.status).toBe(403)
      expect(r2.body.error).toBe('BLOCKED')

      // 3. Multi-hop X-Forwarded-For where blocked IP is the true client behind proxy
      const r3 = await request(testApp).get('/test-blacklist').set('X-Forwarded-For', `spoofed.ip, ${blockedIp}`)
      expect(r3.status).toBe(403)
      expect(r3.body.error).toBe('BLOCKED')
    })

    it('adversarial check: verify default 127.0.0.1 whitelist spoofing probe', async () => {
      // In server/src/index.ts, waitlistLimiter has whitelist: ['127.0.0.1', '::1']
      // Let's test if an external request sending multi-hop "X-Forwarded-For: 127.0.0.1, 10.99.99.99" is blocked
      // when exceeding maxRequests (5)
      const testApp = createTestApp()

      const clientIp = '10.99.99.99'
      // Send 6 requests where client attempted to prepend 127.0.0.1
      let wasBlocked = false
      for (let i = 0; i < 7; i++) {
        const res = await request(testApp)
          .post('/api/waitlist')
          .set('X-Forwarded-For', `127.0.0.1, ${clientIp}`)
          .send({ email: `test_${i}@example.com` })

        if (res.status === 429) {
          wasBlocked = true
          break
        }
      }

      // Because Express with trust proxy = 1 evaluated req.ip as 10.99.99.99 (the last hop),
      // prepending 127.0.0.1 failed to trigger the whitelist, and the rate limiter successfully triggered!
      expect(wasBlocked).toBe(true)
    })
  })
})
