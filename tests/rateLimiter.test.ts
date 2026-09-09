import { describe, it, expect, vi } from 'vitest'
import { createRateLimiter } from '../server/src/middleware/rateLimiter'

function createMockHttp(ip = '127.0.0.1') {
  const headers: Record<string, string | number> = {}
  let statusCode = 200
  let jsonResponse: any = null

  const req: any = {
    headers: { 'x-forwarded-for': ip },
    ip,
    socket: { remoteAddress: ip },
  }

  const res: any = {
    setHeader: (name: string, value: string | number) => {
      headers[name] = value
    },
    status: (code: number) => {
      statusCode = code
      return res
    },
    json: (payload: any) => {
      jsonResponse = payload
      return res
    },
  }

  return { req, res, getHeaders: () => headers, getStatus: () => statusCode, getJson: () => jsonResponse }
}

describe('In-Memory Sliding Window Rate Limiter (rateLimiter)', () => {
  it('should allow requests within limit and set X-RateLimit headers', () => {
    const limiter = createRateLimiter({
      windowMs: 10000,
      maxRequests: 3,
    })

    const http1 = createMockHttp('10.0.0.1')
    const next1 = vi.fn()
    limiter(http1.req, http1.res, next1)
    expect(next1).toHaveBeenCalledOnce()
    expect(http1.getHeaders()['X-RateLimit-Limit']).toBe(3)
    expect(http1.getHeaders()['X-RateLimit-Remaining']).toBe(2)

    const http2 = createMockHttp('10.0.0.1')
    const next2 = vi.fn()
    limiter(http2.req, http2.res, next2)
    expect(next2).toHaveBeenCalledOnce()
    expect(http2.getHeaders()['X-RateLimit-Remaining']).toBe(1)
  })

  it('should reject requests exceeding maxRequests with 429 and Retry-After', () => {
    const limiter = createRateLimiter({
      windowMs: 5000,
      maxRequests: 2,
      message: 'Rate limit exceeded for testing',
    })

    // Req 1 - Allowed
    const h1 = createMockHttp('192.168.1.50')
    const next1 = vi.fn()
    limiter(h1.req, h1.res, next1)
    expect(next1).toHaveBeenCalledOnce()

    // Req 2 - Allowed
    const h2 = createMockHttp('192.168.1.50')
    const next2 = vi.fn()
    limiter(h2.req, h2.res, next2)
    expect(next2).toHaveBeenCalledOnce()

    // Req 3 - Blocked
    const h3 = createMockHttp('192.168.1.50')
    const next3 = vi.fn()
    limiter(h3.req, h3.res, next3)
    expect(next3).not.toHaveBeenCalled()
    expect(h3.getStatus()).toBe(429)
    expect(h3.getJson()?.success).toBe(false)
    expect(h3.getJson()?.error).toBe('Rate limit exceeded for testing')
    expect(Number(h3.getHeaders()['Retry-After'])).toBeGreaterThanOrEqual(1)
  })

  it('should isolate rate limits across different IP addresses', () => {
    const limiter = createRateLimiter({
      windowMs: 5000,
      maxRequests: 1,
    })

    // IP A - Req 1
    const hA = createMockHttp('1.1.1.1')
    const nextA = vi.fn()
    limiter(hA.req, hA.res, nextA)
    expect(nextA).toHaveBeenCalledOnce()

    // IP A - Req 2 (Blocked)
    const hA2 = createMockHttp('1.1.1.1')
    const nextA2 = vi.fn()
    limiter(hA2.req, hA2.res, nextA2)
    expect(nextA2).not.toHaveBeenCalled()
    expect(hA2.getStatus()).toBe(429)

    // IP B - Req 1 (Allowed)
    const hB = createMockHttp('2.2.2.2')
    const nextB = vi.fn()
    limiter(hB.req, hB.res, nextB)
    expect(nextB).toHaveBeenCalledOnce()
    expect(hB.getStatus()).toBe(200)
  })
})
