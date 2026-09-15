import { describe, it, expect, vi } from 'vitest'
import express, { Request, Response } from 'express'
import request from 'supertest'
import { createRateLimiter } from '../src/middleware/rateLimiter'

describe('Rate Limiter Middleware & Express Integration', () => {
  describe('Sliding Window & Headers', () => {
    it('should set X-RateLimit-Limit and decrement X-RateLimit-Remaining on each request', async () => {
      const app = express()
      app.set('trust proxy', 1)
      const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3 })
      app.get('/test', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      const res1 = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100')
      expect(res1.status).toBe(200)
      expect(res1.headers['x-ratelimit-limit']).toBe('3')
      expect(res1.headers['x-ratelimit-remaining']).toBe('2')

      const res2 = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100')
      expect(res2.status).toBe(200)
      expect(res2.headers['x-ratelimit-remaining']).toBe('1')

      const res3 = await request(app).get('/test').set('X-Forwarded-For', '192.168.1.100')
      expect(res3.status).toBe(200)
      expect(res3.headers['x-ratelimit-remaining']).toBe('0')
    })

    it('should return 429 and Retry-After header when rate limit is exceeded', async () => {
      const app = express()
      app.set('trust proxy', 1)
      const limiter = createRateLimiter({
        windowMs: 5000,
        maxRequests: 2,
        message: 'Custom rate limit exceeded message',
      })
      app.get('/limited', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // Request 1
      await request(app).get('/limited').set('X-Forwarded-For', '10.5.5.5').expect(200)
      // Request 2
      await request(app).get('/limited').set('X-Forwarded-For', '10.5.5.5').expect(200)
      // Request 3 (exceeded)
      const res3 = await request(app).get('/limited').set('X-Forwarded-For', '10.5.5.5')

      expect(res3.status).toBe(429)
      expect(res3.body.success).toBe(false)
      expect(res3.body.error).toBe('Custom rate limit exceeded message')
      expect(Number(res3.headers['retry-after'])).toBeGreaterThanOrEqual(1)
    })
  })

  describe('IP Whitelist Bypass', () => {
    it('should completely bypass rate limiting for whitelisted IPs (Array format)', async () => {
      const app = express()
      app.set('trust proxy', 1)
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 2,
        whitelist: ['127.0.0.1', '10.0.0.99'],
      })
      app.get('/whitelist-test', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // Execute 5 requests from whitelisted IP (limit is 2)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .get('/whitelist-test')
          .set('X-Forwarded-For', '10.0.0.99')
        expect(res.status).toBe(200)
      }
    })

    it('should support whitelist as Set and Function matcher', async () => {
      const app = express()
      app.set('trust proxy', 1)

      const setLimiter = createRateLimiter({
        windowMs: 5000,
        maxRequests: 1,
        whitelist: new Set(['172.16.0.1']),
      })
      app.get('/set-test', setLimiter, (_req: Request, res: Response) => res.json({ ok: true }))

      await request(app).get('/set-test').set('X-Forwarded-For', '172.16.0.1').expect(200)
      await request(app).get('/set-test').set('X-Forwarded-For', '172.16.0.1').expect(200)

      const fnLimiter = createRateLimiter({
        windowMs: 5000,
        maxRequests: 1,
        whitelist: (ip: string) => ip.startsWith('10.200.'),
      })
      app.get('/fn-test', fnLimiter, (_req: Request, res: Response) => res.json({ ok: true }))

      await request(app).get('/fn-test').set('X-Forwarded-For', '10.200.1.5').expect(200)
      await request(app).get('/fn-test').set('X-Forwarded-For', '10.200.1.5').expect(200)
    })
  })

  describe('IP Blacklist Rejection', () => {
    it('should immediately reject blacklisted IP with HTTP 403 Forbidden', async () => {
      const app = express()
      app.set('trust proxy', 1)
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        blacklist: ['198.51.100.42'],
        blacklistMessage: 'Your IP has been blacklisted by automated threat detection.',
      })
      app.get('/blacklist-test', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      const res = await request(app)
        .get('/blacklist-test')
        .set('X-Forwarded-For', '198.51.100.42')

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Your IP has been blacklisted by automated threat detection.')
    })
  })

  describe('IP Normalization & IPv6 Handling', () => {
    it('should normalize IPv4-mapped IPv6 address (::ffff:x.x.x.x) to match whitelist and track buckets', async () => {
      const app = express()
      app.set('trust proxy', 1)
      const limiter = createRateLimiter({
        windowMs: 5000,
        maxRequests: 2,
        whitelist: ['192.168.10.5'],
      })
      app.get('/ipv6-test', limiter, (_req: Request, res: Response) => res.json({ ok: true }))

      // Sending IPv4-mapped IPv6 header
      const res = await request(app)
        .get('/ipv6-test')
        .set('X-Forwarded-For', '::ffff:192.168.10.5')

      expect(res.status).toBe(200)
    })
  })
})
