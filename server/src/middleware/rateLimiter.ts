/**
 * server/src/middleware/rateLimiter.ts
 *
 * Lightweight, zero-dependency in-memory sliding window rate limiter.
 * Protects public API endpoints from brute-force scanning, DoS floods,
 * and automated license dictionary attacks.
 */

import { Request, Response, NextFunction } from 'express'

interface ClientBucket {
  timestamps: number[]
}

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
  message?: string
  keyGenerator?: (req: Request) => string
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for']
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim()
      }
      return req.ip || req.socket.remoteAddress || 'unknown'
    },
  } = options

  const clients = new Map<string, ClientBucket>()

  // Garbage collector to purge idle IP records every 5 minutes
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of clients.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs)
      if (bucket.timestamps.length === 0) {
        clients.delete(key)
      }
    }
  }, Math.max(60000, windowMs))

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req)
    const now = Date.now()
    let bucket = clients.get(key)

    if (!bucket) {
      bucket = { timestamps: [] }
      clients.set(key, bucket)
    }

    // Retain only requests within the active sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs)

    if (bucket.timestamps.length >= maxRequests) {
      const oldestTs = bucket.timestamps[0]
      const retryAfterSec = Math.ceil((oldestTs + windowMs - now) / 1000)

      res.setHeader('Retry-After', retryAfterSec)
      res.status(429).json({
        success: false,
        error: message,
        retryAfterSec,
      })
      return
    }

    bucket.timestamps.push(now)
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - bucket.timestamps.length)
    next()
  }
}
