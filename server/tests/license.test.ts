import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, resetTestDb, seedTestLicense, nextIp } from './helpers'
import { getDb } from '../src/db'

describe('Server License API Endpoints (/api/license/*)', () => {
  const app = createTestApp()

  beforeEach(async () => {
    await resetTestDb()
  })

  describe('POST /api/license/activate', () => {
    it('should reject request when key or deviceId is missing', async () => {
      const res1 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'SOME-KEY' })
      expect(res1.status).toBe(400)
      expect(res1.body.success).toBe(false)

      const res2 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ deviceId: 'dev-1' })
      expect(res2.status).toBe(400)
      expect(res2.body.success).toBe(false)
    })

    it('should return failure when license key does not exist', async () => {
      const res = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'NON-EXISTENT-KEY', deviceId: 'dev-1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
      expect(res.body.reason).toContain('License key not found')
    })

    it('should reject activation for revoked licenses', async () => {
      await seedTestLicense({
        key: 'REVOKED-KEY-1',
        tier: 'pro',
        isRevoked: 1,
      })

      const res = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'REVOKED-KEY-1', deviceId: 'dev-1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
      expect(res.body.reason).toContain('revoked')
    })

    it('should reject activation for expired licenses', async () => {
      await seedTestLicense({
        key: 'EXPIRED-KEY-1',
        tier: 'pro',
        expiresAt: Date.now() - 10000,
      })

      const res = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'EXPIRED-KEY-1', deviceId: 'dev-1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
      expect(res.body.reason).toContain('expired')
    })

    it('should successfully activate valid license on a new device', async () => {
      const futureExpiry = Date.now() + 30 * 24 * 3600 * 1000
      await seedTestLicense({
        key: 'VALID-PRO-KEY-1',
        tier: 'pro',
        expiresAt: futureExpiry,
        maxActivations: 2,
      })

      const res = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'VALID-PRO-KEY-1', deviceId: 'machine-alpha' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.tier).toBe('pro')
      expect(res.body.expiresAt).toBe(futureExpiry)

      // Verify DB record
      const db = getDb()
      const activations = await db.execute({
        sql: 'SELECT * FROM activations WHERE license_key = ?',
        args: ['VALID-PRO-KEY-1'],
      })
      expect(activations.rows.length).toBe(1)
    })

    it('should allow idempotent re-activation on the same device without consuming extra slot', async () => {
      await seedTestLicense({
        key: 'IDEMPOTENT-KEY',
        tier: 'lifetime',
        expiresAt: 0,
        maxActivations: 1,
      })

      // First activation
      const res1 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'IDEMPOTENT-KEY', deviceId: 'same-device-1' })
      expect(res1.status).toBe(200)
      expect(res1.body.success).toBe(true)

      // Second activation from same device
      const res2 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'IDEMPOTENT-KEY', deviceId: 'same-device-1' })
      expect(res2.status).toBe(200)
      expect(res2.body.success).toBe(true)

      const db = getDb()
      const activations = await db.execute({
        sql: 'SELECT * FROM activations WHERE license_key = ?',
        args: ['IDEMPOTENT-KEY'],
      })
      expect(activations.rows.length).toBe(1)
    })

    it('should enforce activation slot limits and reject devices exceeding max_activations', async () => {
      await seedTestLicense({
        key: 'LIMITED-KEY-2SLOTS',
        tier: 'pro',
        maxActivations: 2,
      })

      // Device 1
      const res1 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'LIMITED-KEY-2SLOTS', deviceId: 'dev-alpha' })
      expect(res1.body.success).toBe(true)

      // Device 2
      const res2 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'LIMITED-KEY-2SLOTS', deviceId: 'dev-beta' })
      expect(res2.body.success).toBe(true)

      // Device 3 (Must exceed slot limit)
      const res3 = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'LIMITED-KEY-2SLOTS', deviceId: 'dev-gamma' })
      expect(res3.status).toBe(200)
      expect(res3.body.success).toBe(false)
      expect(res3.body.reason).toContain('Activation limit reached (2 devices)')
    })
  })

  describe('POST /api/license/verify', () => {
    it('should reject missing key or deviceId', async () => {
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.valid).toBe(false)
    })

    it('should return valid=false for non-existent key', async () => {
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'UNKNOWN-KEY', deviceId: 'dev-1' })
      expect(res.status).toBe(200)
      expect(res.body.valid).toBe(false)
      expect(res.body.reason).toContain('Key not found')
    })

    it('should return valid=false for revoked key', async () => {
      await seedTestLicense({ key: 'REVOKED-KEY', isRevoked: 1 })
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'REVOKED-KEY', deviceId: 'dev-1' })
      expect(res.body.valid).toBe(false)
      expect(res.body.reason).toContain('revoked')
    })

    it('should return valid=false for expired key', async () => {
      await seedTestLicense({ key: 'EXPIRED-KEY', expiresAt: Date.now() - 5000 })
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'EXPIRED-KEY', deviceId: 'dev-1' })
      expect(res.body.valid).toBe(false)
      expect(res.body.reason).toContain('Expired')
    })

    it('should return valid=false if device is not registered', async () => {
      await seedTestLicense({ key: 'VALID-BUT-UNREGISTERED', maxActivations: 2 })
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'VALID-BUT-UNREGISTERED', deviceId: 'unregistered-dev' })
      expect(res.body.valid).toBe(false)
      expect(res.body.reason).toContain('Device not registered')
    })

    it('should return valid=true and update last_seen for registered device', async () => {
      await seedTestLicense({ key: 'HEARTBEAT-KEY', tier: 'lifetime' })
      // First activate
      await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'HEARTBEAT-KEY', deviceId: 'heartbeat-dev' })

      // Then verify heartbeat
      const res = await request(app)
        .post('/api/license/verify')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'HEARTBEAT-KEY', deviceId: 'heartbeat-dev' })

      expect(res.status).toBe(200)
      expect(res.body.valid).toBe(true)
      expect(res.body.tier).toBe('lifetime')
    })
  })

  describe('POST /api/license/deactivate', () => {
    it('should require key and deviceId', async () => {
      const res = await request(app)
        .post('/api/license/deactivate')
        .set('X-Forwarded-For', nextIp())
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.ok).toBe(false)
    })

    it('should successfully deactivate registered device and free up slot', async () => {
      await seedTestLicense({ key: 'DEACT-KEY', maxActivations: 1 })

      // Activate device 1
      await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'DEACT-KEY', deviceId: 'device-1' })

      // Device 2 fails (slot limit)
      const resFail = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'DEACT-KEY', deviceId: 'device-2' })
      expect(resFail.body.success).toBe(false)

      // Deactivate device 1
      const deactRes = await request(app)
        .post('/api/license/deactivate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'DEACT-KEY', deviceId: 'device-1' })
      expect(deactRes.status).toBe(200)
      expect(deactRes.body.ok).toBe(true)

      // Device 2 now succeeds!
      const resSuccess = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'DEACT-KEY', deviceId: 'device-2' })
      expect(resSuccess.body.success).toBe(true)
    })
  })

  describe('POST /api/license/lookup', () => {
    it('should reject missing key with 400', async () => {
      const res = await request(app)
        .post('/api/license/lookup')
        .set('X-Forwarded-For', nextIp())
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.found).toBe(false)
    })

    it('should return found=false for unknown key', async () => {
      const res = await request(app)
        .post('/api/license/lookup')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'UNKNOWN-KEY-99' })
      expect(res.status).toBe(200)
      expect(res.body.found).toBe(false)
    })

    it('should return masked key and metadata for valid key', async () => {
      await seedTestLicense({
        key: 'ZENDEV-PRO-2026-KEY-ABCD',
        tier: 'pro',
        maxActivations: 2,
      })

      const res = await request(app)
        .post('/api/license/lookup')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'ZENDEV-PRO-2026-KEY-ABCD' })

      expect(res.status).toBe(200)
      expect(res.body.found).toBe(true)
      expect(res.body.tier).toBe('pro')
      expect(res.body.maxDevices).toBe(2)
      expect(res.body.activeDevices).toBe(0)
      expect(res.body.key).toContain('****')
    })
  })

  describe('POST /api/license/reset-hardware', () => {
    it('should require key parameter with 400', async () => {
      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('should return failure for unknown key', async () => {
      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'MISSING-KEY' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
    })

    it('should reject reset for revoked licenses', async () => {
      await seedTestLicense({ key: 'REVOKED-RESET-KEY', isRevoked: 1 })
      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'REVOKED-RESET-KEY' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(false)
    })

    it('should successfully reset hardware activations on first reset', async () => {
      await seedTestLicense({ key: 'RESET-KEY-TEST', maxActivations: 1 })

      // Activate device
      await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'RESET-KEY-TEST', deviceId: 'old-motherboard' })

      // Reset hardware
      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'RESET-KEY-TEST' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('başarıyla sıfırlandı')

      // Verify activations cleared
      const db = getDb()
      const activations = await db.execute({
        sql: 'SELECT * FROM activations WHERE license_key = ?',
        args: ['RESET-KEY-TEST'],
      })
      expect(activations.rows.length).toBe(0)

      // New device can activate immediately
      const newAct = await request(app)
        .post('/api/license/activate')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'RESET-KEY-TEST', deviceId: 'new-motherboard' })
      expect(newAct.body.success).toBe(true)
    })

    it('should enforce 24-hour cooldown on subsequent hardware reset attempts (HTTP 429)', async () => {
      await seedTestLicense({
        key: 'COOLDOWN-RESET-KEY',
        lastHwidReset: Date.now() - 3600 * 1000, // Reset 1 hour ago
      })

      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'COOLDOWN-RESET-KEY' })

      expect(res.status).toBe(429)
      expect(res.body.success).toBe(false)
      expect(res.body.reason).toContain('Donanım sıfırlama sınırına ulaşıldı')
    })

    it('should permit reset once 24-hour cooldown period has elapsed', async () => {
      await seedTestLicense({
        key: 'EXPIRED-COOLDOWN-KEY',
        lastHwidReset: Date.now() - 25 * 3600 * 1000, // 25 hours ago
      })

      const res = await request(app)
        .post('/api/license/reset-hardware')
        .set('X-Forwarded-For', nextIp())
        .send({ key: 'EXPIRED-COOLDOWN-KEY' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
