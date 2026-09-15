/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type ActivityCategory = 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api'
export type ActivityStatus = 'success' | 'failure' | 'warning' | 'info'

export interface LogActivityInput {
  toolId: string
  action: string
  category: ActivityCategory
  status?: ActivityStatus
  details: string
  metadata?: Record<string, any>
  durationMs?: number
}

const SENSITIVE_KEY_REGEX =
  /^(password|pass|passphrase|secret|token|apikey|api_key|authorization|cookie|private_key|privatekey|secretaccesskey)$/i

function luhnCheck(cardNo: string): boolean {
  const clean = cardNo.replace(/[\s-]/g, '')
  if (!/^\d{13,19}$/.test(clean)) return false
  let sum = 0
  let double = false
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10)
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return val

  let sanitized = val

  // 1. Private Keys
  sanitized = sanitized.replace(
    /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  )

  // 2. JWTs
  sanitized = sanitized.replace(
    /\bey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-+/=]{10,}\b/g,
    '[REDACTED_JWT]'
  )

  // 3. API Keys
  sanitized = sanitized.replace(/\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_API_KEY]')
  sanitized = sanitized.replace(/\bsk-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_API_KEY]')
  sanitized = sanitized.replace(/\bAIza[0-9A-Za-z\-_]{35}\b/g, '[REDACTED_API_KEY]')

  // 4. Bearer & Basic Auth
  sanitized = sanitized.replace(/\bBearer\s+[a-zA-Z0-9\-._~+/]+=*\b/gi, 'Bearer [REDACTED_TOKEN]')
  sanitized = sanitized.replace(/\bBasic\s+[a-zA-Z0-9+/=]{10,}\b/gi, 'Basic [REDACTED_AUTH]')

  // 5. Query string secrets
  sanitized = sanitized.replace(
    /(?<=[?&](?:password|pass|passphrase|token|secret|apiKey|api_key|auth)=)[^&#\s]+/gi,
    '[REDACTED]'
  )

  // 6. Credit Card PAN (with Luhn check)
  sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    return luhnCheck(match) ? '[REDACTED_CREDIT_CARD]' : match
  })

  return sanitized
}

export function sanitizeMetadata(data: any, depth = 0, visited = new WeakSet()): any {
  if (depth > 8) return '[MAX_DEPTH]'
  if (data === null || data === undefined) return data
  if (typeof data === 'string') return sanitizeString(data)
  if (typeof data !== 'object') return data

  if (visited.has(data)) return '[CIRCULAR]'
  visited.add(data)

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item, depth + 1, visited))
  }

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = '[REDACTED_SECRET]'
    } else {
      result[key] = sanitizeMetadata(value, depth + 1, visited)
    }
  }
  return result
}

/**
 * Universal non-throwing activity logger.
 * Pre-sanitizes details and metadata before delegating to window.nexusAPI.journal.record.
 * If journal service is not available, warns and gracefully returns null.
 */
export async function logActivity(input: LogActivityInput): Promise<any> {
  try {
    const payload = {
      toolId: input.toolId,
      action: input.action,
      category: input.category,
      status: input.status || 'success',
      details: sanitizeString(input.details),
      metadata: sanitizeMetadata(input.metadata || {}),
      durationMs: input.durationMs,
    }

    const journalApi = (window as any)?.nexusAPI?.journal
    if (journalApi && typeof journalApi.record === 'function') {
      return await journalApi.record(payload)
    }

    console.debug('[activityLogger] Journal service unavailable or not ready; skipped recording.')
    return null
  } catch (err) {
    console.warn('[activityLogger] Failed to record activity log:', err)
    return null
  }
}
