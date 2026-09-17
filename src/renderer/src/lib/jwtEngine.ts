/**
 * jwtEngine.ts
 * High-performance, offline-first JWT parsing, HMAC-SHA256 signature verification,
 * and token generation engine using native Web Crypto API (`window.crypto.subtle`).
 */

export interface JwtHeader {
  alg: string
  typ?: string
  kid?: string
  [key: string]: unknown
}

export interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [key: string]: unknown
}

export interface JwtParts {
  headerRaw: string
  payloadRaw: string
  signatureRaw: string
  header: JwtHeader | null
  payload: JwtPayload | null
  headerJson: string
  payloadJson: string
  isValidFormat: boolean
  error?: string
}

export type JwtExpiryStatus = 'active' | 'expiring-soon' | 'expired' | 'no-expiry'

export interface JwtExpiryInfo {
  status: JwtExpiryStatus
  exp?: number
  iat?: number
  totalDurationSec?: number
  elapsedSec?: number
  remainingSec?: number
  percentageRemaining?: number
  formattedExp?: string
  formattedIat?: string
  humanRemaining?: string
}

export interface JwtVerificationResult {
  valid: boolean
  error?: string
}

/**
 * Convert string or Uint8Array to base64url format without padding (+ -> -, / -> _).
 */
export function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convert bytes to base64url format.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode base64url string to UTF-8 decoded text.
 */
export function base64UrlToUtf8(str: string): string {
  let base64 = str.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Decode base64url string to raw byte array.
 */
export function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Parses and validates the format and structure of a JWT string.
 */
export function parseJwt(token: string): JwtParts {
  const clean = token.trim()
  if (!clean) {
    return {
      headerRaw: '',
      payloadRaw: '',
      signatureRaw: '',
      header: null,
      payload: null,
      headerJson: '',
      payloadJson: '',
      isValidFormat: false,
      error: 'Token is empty',
    }
  }

  const parts = clean.split('.')
  if (parts.length !== 3) {
    return {
      headerRaw: parts[0] || '',
      payloadRaw: parts[1] || '',
      signatureRaw: parts[2] || '',
      header: null,
      payload: null,
      headerJson: '',
      payloadJson: '',
      isValidFormat: false,
      error: `Invalid JWT format: expected 3 dot-separated segments, got ${parts.length}`,
    }
  }

  const [headerRaw, payloadRaw, signatureRaw] = parts

  let header: JwtHeader | null = null
  let headerJson = ''
  let payload: JwtPayload | null = null
  let payloadJson = ''
  let error: string | undefined

  try {
    const headerStr = base64UrlToUtf8(headerRaw)
    header = JSON.parse(headerStr) as JwtHeader
    headerJson = JSON.stringify(header, null, 2)
  } catch (err: unknown) {
    error = `Header decoding error: ${err instanceof Error ? err.message : String(err)}`
  }

  try {
    const payloadStr = base64UrlToUtf8(payloadRaw)
    payload = JSON.parse(payloadStr) as JwtPayload
    payloadJson = JSON.stringify(payload, null, 2)
  } catch (err: unknown) {
    const msg = `Payload decoding error: ${err instanceof Error ? err.message : String(err)}`
    error = error ? `${error} | ${msg}` : msg
  }

  return {
    headerRaw,
    payloadRaw,
    signatureRaw,
    header,
    payload,
    headerJson,
    payloadJson,
    isValidFormat: !error && header !== null && payload !== null,
    error,
  }
}

/**
 * Format a duration in seconds into a friendly human-readable format.
 */
export function formatDurationHuman(seconds: number): string {
  const abs = Math.abs(seconds)
  const days = Math.floor(abs / 86400)
  const hours = Math.floor((abs % 86400) / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const secs = Math.floor(abs % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)

  return parts.slice(0, 2).join(' ')
}

/**
 * Calculates expiry status, remaining duration, and timeline percentages for a JWT payload.
 */
export function calculateExpiryInfo(
  payload: JwtPayload | null,
  nowSeconds = Math.floor(Date.now() / 1000)
): JwtExpiryInfo {
  if (!payload || typeof payload.exp !== 'number') {
    return {
      status: 'no-expiry',
    }
  }

  const exp = payload.exp
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined
  const remainingSec = exp - nowSeconds

  let status: JwtExpiryStatus = 'active'
  if (remainingSec <= 0) {
    status = 'expired'
  } else if (remainingSec <= 3600) {
    status = 'expiring-soon'
  }

  let totalDurationSec: number | undefined
  let elapsedSec: number | undefined
  let percentageRemaining = 100

  if (iat !== undefined && exp > iat) {
    totalDurationSec = exp - iat
    elapsedSec = Math.max(0, nowSeconds - iat)
    percentageRemaining = Math.max(
      0,
      Math.min(100, Math.round(((exp - nowSeconds) / totalDurationSec) * 100))
    )
  } else if (remainingSec <= 0) {
    percentageRemaining = 0
  }

  return {
    status,
    exp,
    iat,
    totalDurationSec,
    elapsedSec,
    remainingSec,
    percentageRemaining,
    formattedExp: new Date(exp * 1000).toLocaleString(),
    formattedIat: iat ? new Date(iat * 1000).toLocaleString() : undefined,
    humanRemaining: formatDurationHuman(remainingSec),
  }
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    return (globalThis as any).crypto.subtle
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment')
}

/**
 * Verify HMAC-SHA256 signature using native Web Crypto API.
 */
export async function verifyHmacSha256(
  token: string,
  secret: string,
  isSecretBase64 = false
): Promise<JwtVerificationResult> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'Token must have exactly 3 parts separated by dots' }
  }
  if (!secret) {
    return { valid: false, error: 'Secret key is empty' }
  }

  try {
    const [b64Header, b64Payload, b64Sig] = parts
    const data = `${b64Header}.${b64Payload}`
    const enc = new TextEncoder()
    const dataBytes = enc.encode(data)

    let keyBytes: Uint8Array
    if (isSecretBase64) {
      keyBytes = base64UrlToBytes(secret)
    } else {
      keyBytes = enc.encode(secret)
    }

    const subtle = getSubtleCrypto()
    const cryptoKey = await subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const sigBytes = base64UrlToBytes(b64Sig)
    const isValid = await subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource
    )

    return {
      valid: isValid,
      error: isValid ? undefined : 'Signature does not match header + payload + secret',
    }
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Sign header and payload into a full JWT token using HMAC-SHA256 or none.
 */
export async function signHmacSha256(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
  isSecretBase64 = false
): Promise<string> {
  const b64Header = utf8ToBase64Url(JSON.stringify(header))
  const b64Payload = utf8ToBase64Url(JSON.stringify(payload))
  const data = `${b64Header}.${b64Payload}`

  if (header.alg === 'none') {
    return `${data}.`
  }

  const enc = new TextEncoder()
  const dataBytes = enc.encode(data)

  let keyBytes: Uint8Array
  if (isSecretBase64) {
    keyBytes = base64UrlToBytes(secret)
  } else {
    keyBytes = enc.encode(secret)
  }

  const subtle = getSubtleCrypto()
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sigBuffer = await subtle.sign('HMAC', cryptoKey, dataBytes as unknown as BufferSource)
  const b64Sig = bytesToBase64Url(new Uint8Array(sigBuffer))
  return `${data}.${b64Sig}`
}

/**
 * Common presets for JWT generator
 */
export const JWT_GENERATOR_PRESETS = {
  userAuth: {
    label: 'User Auth Session',
    header: { alg: 'HS256', typ: 'JWT' },
    payload: {
      sub: 'usr_94827104',
      name: 'Alex Morgan',
      email: 'alex.morgan@zendev.app',
      role: 'developer',
      scope: ['read:projects', 'write:projects', 'admin:tools'],
    },
  },
  microservice: {
    label: 'Microservice S2S',
    header: { alg: 'HS256', typ: 'JWT', kid: 'svc_key_2026' },
    payload: {
      iss: 'https://auth.zendev.internal',
      sub: 'svc_telemetry_collector',
      aud: 'https://api.zendev.internal',
      scope: ['metrics:push', 'health:read'],
    },
  },
  admin: {
    label: 'Super Admin Bearer',
    header: { alg: 'HS256', typ: 'JWT' },
    payload: {
      sub: 'adm_001_root',
      name: 'Root Administrator',
      email: 'security@zendev.io',
      role: 'superadmin',
      permissions: ['*'],
    },
  },
}
