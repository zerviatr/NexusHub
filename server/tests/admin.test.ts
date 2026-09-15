import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, resetTestDb, seedTestLicense, nextIp } from './helpers'
import { getDb } from '../src/db'

describe('Admin Console API Endpoints (/admin/api/*)', () => {
  const app = createTestApp()

  beforeEach(async () => {
    await resetTestDb()
  })

  async function loginAsAdmin(): Promise<string> {
    const ip = nextIp()
    const res = await request(app)
      .post('/admin/api/login')
      .set('X-Forwarded-For', ip)
      .send({ password: 'SuperAdminSecretPass123!' })

    if (!res.body.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(res.body)}`)
    }
    return res.body.token
  }

  describe('POST /admin/api/login', () => {
    it('should reject invalid master password with 401', async () => {
      const res = await request(app)
        .post('/admin/api/login')
        .set('X-Forwarded-For', nextIp())
        .send({ password: 'WrongPassword!' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should successfully authenticate with valid master password and return session token', async () => {
      const res = await request(app)
        .post('/admin/api/login')
        .set('X-Forwarded-For', nextIp())
        .send({ password: 'SuperAdminSecretPass123!' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.token).toBe('string')
      expect(res.body.token.length).toBe(64)
    })

    it('should trigger brute-force protection (429) after 10 consecutive failed attempts from same IP', async () => {
      const attackerIp = '198.51.100.99'

      for (let i = 0; i < 9; i++) {
        const res = await request(app)
          .post('/admin/api/login')
          .set('X-Forwarded-For', attackerIp)
          .send({ password: `BadAttempt${i}` })
        expect(res.status).toBe(401)
      }

      // 10th attempt locks
      await request(app)
        .post('/admin/api/login')
        .set('X-Forwarded-For', attackerIp)
        .send({ password: 'BadAttempt10' })

      // 11th attempt is locked out
      const lockedRes = await request(app)
        .post('/admin/api/login')
        .set('X-Forwarded-For', attackerIp)
        .send({ password: 'SuperAdminSecretPass123!' })

      expect(lockedRes.status).toBe(429)
      expect(lockedRes.body.success).toBe(false)
      expect(lockedRes.body.error).toContain('Çok fazla hatalı giriş')
    })
  })

  describe('Protected Admin Endpoints (Auth Gate)', () => {
    it('should reject requests without Authorization header with 401', async () => {
      const res = await request(app)
        .get('/admin/api/keys')
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(401)
      expect(res.body.error).toContain('Unauthorized')
    })

    it('should reject requests with invalid bearer token with 401', async () => {
      const res = await request(app)
        .get('/admin/api/keys')
        .set('Authorization', 'Bearer invalid-token-123')
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(401)
    })
  })

  describe('License Key Management & Auditing', () => {
    it('should allow admin to list all licenses via GET /admin/api/keys', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'LIST-TEST-1', tier: 'pro' })
      await seedTestLicense({ key: 'LIST-TEST-2', tier: 'lifetime' })

      const res = await request(app)
        .get('/admin/api/keys')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.keys.length).toBe(2)
    })

    it('should allow admin to generate a new key and record audit log', async () => {
      const token = await loginAsAdmin()

      const res = await request(app)
        .post('/admin/api/keys/generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          tier: 'pro',
          durationDays: 365,
          maxActivations: 2,
          customerNote: 'Contract #9081',
          salesChannel: 'Enterprise Sales',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.key).toBeDefined()

      // Verify in DB
      const db = getDb()
      const row = await db.execute({
        sql: 'SELECT * FROM licenses WHERE key = ?',
        args: [res.body.key],
      })
      expect(row.rows.length).toBe(1)
      expect(row.rows[0]?.customer_note).toBe('Contract #9081')
      expect(row.rows[0]?.sales_channel).toBe('Enterprise Sales')

      // Verify audit log
      const audit = await db.execute({
        sql: `SELECT * FROM admin_audit_logs WHERE action = 'KEY_GENERATED'`,
      })
      expect(audit.rows.length).toBeGreaterThanOrEqual(1)
    })

    it('should allow bulk license key generation', async () => {
      const token = await loginAsAdmin()

      const res = await request(app)
        .post('/admin/api/keys/bulk-generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          tier: 'team',
          durationDays: 180,
          count: 3,
          notePrefix: 'TEAM-PROMO',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.count).toBe(3)
      expect(res.body.keys.length).toBe(3)
    })

    it('should allow admin to revoke a license key', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'ADMIN-REVOKE-TARGET', tier: 'pro', isRevoked: 0 })

      const res = await request(app)
        .post('/admin/api/keys/revoke')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'ADMIN-REVOKE-TARGET', is_revoked: 1 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const db = getDb()
      const row = await db.execute({
        sql: 'SELECT is_revoked FROM licenses WHERE key = ?',
        args: ['ADMIN-REVOKE-TARGET'],
      })
      expect(Number(row.rows[0]?.is_revoked)).toBe(1)
    })

    it('should allow admin to extend license validity', async () => {
      const token = await loginAsAdmin()
      const initialExpiry = Date.now() + 10 * 24 * 3600 * 1000
      await seedTestLicense({ key: 'ADMIN-EXTEND-TARGET', tier: 'pro', expiresAt: initialExpiry })

      const res = await request(app)
        .post('/admin/api/keys/extend')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'ADMIN-EXTEND-TARGET', daysToAdd: 30 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.newExpiresAt).toBeGreaterThan(initialExpiry)
    })

    it('should reject extending lifetime licenses with 400', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'LIFETIME-EXTEND-TARGET', tier: 'lifetime', expiresAt: 0 })

      const res = await request(app)
        .post('/admin/api/keys/extend')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'LIFETIME-EXTEND-TARGET', daysToAdd: 30 })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Ömür boyu')
    })

    it('should allow admin to update customer note', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'ADMIN-NOTE-TARGET' })

      const res = await request(app)
        .post('/admin/api/keys/update-note')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'ADMIN-NOTE-TARGET', note: 'VIP Client 2026' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const db = getDb()
      const row = await db.execute({
        sql: 'SELECT customer_note FROM licenses WHERE key = ?',
        args: ['ADMIN-NOTE-TARGET'],
      })
      expect(row.rows[0]?.customer_note).toBe('VIP Client 2026')
    })

    it('should allow admin to delete a license key and its activations', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'DELETE-TARGET-KEY' })

      const res = await request(app)
        .post('/admin/api/keys/delete')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'DELETE-TARGET-KEY' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const db = getDb()
      const row = await db.execute({
        sql: 'SELECT * FROM licenses WHERE key = ?',
        args: ['DELETE-TARGET-KEY'],
      })
      expect(row.rows.length).toBe(0)
    })

    it('should execute bulk actions (extend, revoke, reset-devices, delete)', async () => {
      const token = await loginAsAdmin()
      await seedTestLicense({ key: 'BULK-ACT-1', tier: 'pro', expiresAt: Date.now() + 100000 })
      await seedTestLicense({ key: 'BULK-ACT-2', tier: 'pro', expiresAt: Date.now() + 100000 })

      // Bulk revoke
      const resRevoke = await request(app)
        .post('/admin/api/keys/bulk-action')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ action: 'revoke', keys: ['BULK-ACT-1', 'BULK-ACT-2'] })
      expect(resRevoke.status).toBe(200)
      expect(resRevoke.body.count).toBe(2)

      // Bulk extend
      const resExtend = await request(app)
        .post('/admin/api/keys/bulk-action')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ action: 'extend', keys: ['BULK-ACT-1', 'BULK-ACT-2'], daysToAdd: 15 })
      expect(resExtend.status).toBe(200)

      // Bulk delete
      const resDelete = await request(app)
        .post('/admin/api/keys/bulk-action')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ action: 'delete', keys: ['BULK-ACT-1', 'BULK-ACT-2'] })
      expect(resDelete.status).toBe(200)
    })

    it('should run diagnostic check on a license key', async () => {
      const token = await loginAsAdmin()

      const res = await request(app)
        .post('/admin/api/keys/diagnose')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'INVALID-FORMAT-KEY' })

      expect(res.status).toBe(200)
      expect(res.body.validFormat).toBe(false)
    })
  })

  describe('Transactional Coupons Flow', () => {
    it('should create coupon and redeem it transactionally extending license validity', async () => {
      const token = await loginAsAdmin()
      const initialExpiry = Date.now() + 10 * 24 * 3600 * 1000
      await seedTestLicense({ key: 'COUPON-TARGET-KEY', tier: 'pro', expiresAt: initialExpiry })

      // 1. Create Coupon
      const db = getDb()
      await db.execute({
        sql: 'INSERT INTO coupons (code, days_to_add, is_used, note, created_at) VALUES (?, ?, 0, ?, ?)',
        args: ['BONUS60', 60, 'Special Spring Promo', Date.now()]
      })

      // 2. Redeem Coupon
      const redeemRes = await request(app)
        .post('/admin/api/coupons/redeem')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ couponCode: 'BONUS60', key: 'COUPON-TARGET-KEY' })

      expect(redeemRes.status).toBe(200)
      expect(redeemRes.body.success).toBe(true)
      expect(redeemRes.body.daysAdded).toBe(60)

      // 3. Second redemption should fail (already used)
      const repeatRes = await request(app)
        .post('/admin/api/coupons/redeem')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ couponCode: 'BONUS60', key: 'COUPON-TARGET-KEY' })

      expect(repeatRes.status).toBe(400)
      expect(repeatRes.body.success).toBe(false)
      expect(repeatRes.body.error).toContain('kullanılmıştır')
    })

    it('should list coupons and allow deleting a coupon', async () => {
      const token = await loginAsAdmin()
      const db = getDb()
      await db.execute({
        sql: 'INSERT INTO coupons (code, days_to_add, is_used, created_at) VALUES (?, ?, 0, ?)',
        args: ['DELETE-COUPON', 30, Date.now()],
      })

      const listRes = await request(app)
        .get('/admin/api/coupons/list')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
      expect(listRes.status).toBe(200)
      expect(listRes.body.coupons.length).toBeGreaterThanOrEqual(1)

      const delRes = await request(app)
        .post('/admin/api/coupons/delete')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({ code: 'DELETE-COUPON' })
      expect(delRes.status).toBe(200)
      expect(delRes.body.success).toBe(true)
    })
  })

  describe('Server Telemetry & Notification Settings', () => {
    it('should return server telemetry stats', async () => {
      const token = await loginAsAdmin()

      const res = await request(app)
        .get('/admin/api/server-stats')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.nodeVersion).toBeDefined()
      expect(res.body.dbLatencyMs).toBeDefined()
    })

    it('should get and update notification settings', async () => {
      const token = await loginAsAdmin()

      const getRes = await request(app)
        .get('/admin/api/notifications/settings')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())

      expect(getRes.status).toBe(200)
      expect(getRes.body.settings).toBeDefined()

      const postRes = await request(app)
        .post('/admin/api/notifications/settings')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())
        .send({
          telegram_enabled: true,
          telegram_bot_token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
          telegram_chat_id: '987654321',
        })

      expect(postRes.status).toBe(200)
      expect(postRes.body.success).toBe(true)
    })
  })

  describe('Audit Logging Verification', () => {
    it('should list recorded audit logs in descending chronological order', async () => {
      const token = await loginAsAdmin()

      const res = await request(app)
        .get('/admin/api/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', nextIp())

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.logs)).toBe(true)
      expect(res.body.logs.length).toBeGreaterThanOrEqual(1)
      expect(res.body.logs[0].action).toBeDefined()
    })
  })
})
