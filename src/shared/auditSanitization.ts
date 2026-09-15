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

const SENSITIVE_KEY_REGEX =
  /^(password|pass|passphrase|secret|token|apiKey|api_key|authorization|cookie|private_key|privatekey|secretaccesskey|credential|credentials|auth|accessToken|access_token|refreshToken|refresh_token|clientSecret|client_secret)$/i

const SENSITIVE_SUBSTRING_REGEX = /(password|passphrase|secret|apiKey|api_key|privateKey|private_key)/i

/**
 * Validates a candidate credit card number using Luhn's Mod-10 algorithm.
 * Avoids false-positive redaction of random numeric sequences, hashes, or timestamps.
 */
export function luhnCheck(cardNo: string): boolean {
  if (!cardNo || typeof cardNo !== 'string') return false
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

/**
 * Redacts sensitive credentials, tokens, private keys, and PII from a string.
 * Covers:
 * - PEM Cryptographic Private Keys
 * - JSON Web Tokens (JWT)
 * - OpenAI (sk-...), Anthropic Claude (sk-ant-...), Gemini (AIza...) API keys
 * - GitHub (ghp_...) and AWS access keys
 * - HTTP Bearer and Basic authorization headers
 * - URL query string credentials
 * - Luhn-validated Credit Card numbers (PAN)
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return val

  let sanitized = val

  // 1. PEM Cryptographic Private Keys (PKCS#1, PKCS#8, EC, RSA, OpenSSH)
  sanitized = sanitized.replace(
    /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  )

  // 2. HTTP Bearer & Basic Auth headers
  sanitized = sanitized.replace(
    /\bBearer\s+[a-zA-Z0-9\-._~+/]+={0,2}(?=\s|$|[^\w=])/gi,
    'Bearer [REDACTED_TOKEN]'
  )
  sanitized = sanitized.replace(
    /\bBasic\s+[a-zA-Z0-9+/=]{10,}(?=\s|$|[^\w=])/gi,
    'Basic [REDACTED_AUTH]'
  )

  // 3. JSON Web Tokens (JWT)
  sanitized = sanitized.replace(
    /\bey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-+/=]{10,}\b/g,
    '[REDACTED_JWT]'
  )

  // 4. API Keys
  // Anthropic Claude
  sanitized = sanitized.replace(/\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_API_KEY]')
  // OpenAI standard, project, and admin keys
  sanitized = sanitized.replace(/\bsk-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_API_KEY]')
  // Google / Gemini API Keys
  sanitized = sanitized.replace(/\bAIza[0-9A-Za-z\-_]{35}\b/g, '[REDACTED_API_KEY]')
  // GitHub personal access tokens
  sanitized = sanitized.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/g, '[REDACTED_API_KEY]')
  // AWS Access Key IDs
  sanitized = sanitized.replace(/\b(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_API_KEY]')

  // 5. Query string secrets in URLs
  sanitized = sanitized.replace(
    /(?<=[?&](?:password|pass|passphrase|token|secret|apiKey|api_key|auth|apikey|access_token|accessToken|refresh_token|refreshToken|client_secret|clientSecret)=)[^&#\s]+/gi,
    '[REDACTED]'
  )

  // 6. Credit Card PAN (with Luhn Mod-10 algorithm check)
  sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    return luhnCheck(match) ? '[REDACTED_CREDIT_CARD]' : match
  })

  return sanitized
}

/**
 * Recursively scrubs sensitive values from metadata structures.
 * Enforces:
 * - Key blacklist redaction ([REDACTED_SECRET])
 * - Content-based string sanitization via sanitizeString
 * - Circular reference safety ([CIRCULAR])
 * - Maximum traversal depth guard (depth > 8 -> [MAX_DEPTH])
 */
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
    if (SENSITIVE_KEY_REGEX.test(key) || SENSITIVE_SUBSTRING_REGEX.test(key)) {
      result[key] = '[REDACTED_SECRET]'
    } else {
      result[key] = sanitizeMetadata(value, depth + 1, visited)
    }
  }
  return result
}
