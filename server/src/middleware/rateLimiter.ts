/**
 * server/src/middleware/rateLimiter.ts
 *
 * Lightweight, zero-dependency in-memory sliding window rate limiter.
 * Hardened with Express req.ip validation, trusted proxy support,
 * and comprehensive IP whitelist / blacklist access control.
 */

import { Request, Response, NextFunction } from 'express'

interface ClientBucket {
  timestamps: number[]
}

export type IpFilterMatcher = string[] | Set<string> | ((ip: string, req: Request) => boolean)

export interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
  message?: string
  keyGenerator?: (req: Request) => string
  whitelist?: IpFilterMatcher
  blacklist?: IpFilterMatcher
  blacklistMessage?: string
}

function normalizeIp(rawIp?: string): string {
  if (!rawIp) return 'unknown'
  let ip = rawIp.trim()
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7)
  }
  return ip
}

function checkIpFilter(matcher: IpFilterMatcher | undefined, ip: string, req: Request): boolean {
  if (!matcher) return false
  if (typeof matcher === 'function') {
    return matcher(ip, req)
  }
  const normalized = normalizeIp(ip)
  if (matcher instanceof Set) {
    return matcher.has(ip) || matcher.has(normalized)
  }
  if (Array.isArray(matcher)) {
    return matcher.includes(ip) || matcher.includes(normalized)
  }
  return false
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this IP, please try again later.',
    whitelist,
    blacklist,
    blacklistMessage = 'Access denied: Your IP address is blacklisted.',
    keyGenerator = (req: Request) => {
      // Use Express's validated req.ip (powered by app.set('trust proxy', 1))
      // Avoid raw, unvalidated X-Forwarded-For manual string splitting
      return normalizeIp(req.ip || req.socket?.remoteAddress)
    },
  } = options

  const clients = new Map<string, ClientBucket>()

  // Garbage collector to purge idle IP records every 5 minutes (or windowMs)
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of clients.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs)
      if (bucket.timestamps.length === 0) {
        clients.delete(key)
      }
    }
  }, Math.max(60000, windowMs))

  // Allow Node process to exit cleanly in unit test runners
  if (timer.unref) {
    timer.unref()
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const rawIp = req.ip || req.socket?.remoteAddress || 'unknown'
    const ip = normalizeIp(rawIp)

    // 1. Blacklist Check: Immediate 403 Forbidden rejection
    if (checkIpFilter(blacklist, ip, req)) {
      res.status(403).json({
        success: false,
        error: blacklistMessage,
      })
      return
    }

    // 2. Whitelist Check: Bypasses sliding-window rate limit completely
    if (checkIpFilter(whitelist, ip, req)) {
      next()
      return
    }

    // 3. Sliding Window Rate Limiting
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
