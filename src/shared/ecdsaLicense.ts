/**
 * src/shared/ecdsaLicense.ts
 *
 * Enterprise Asymmetric ECDSA (NIST P-256 / prime256v1) License Engine for ZenDev.
 * Provides offline verifiable public-key cryptography, hardware locking (HWID),
 * expiration enforcement, feature gating, and transparent backward compatibility
 * with legacy HMAC-SHA256 licenses.
 *
 * KEY FORMAT: ZENDEV-BASE32(version + payloadLength + payloadJSON + signatureDER)
 * Example formatted: ZENDEV-ABCDE-FGHIJ-KLMNO-...
 */

import {
  verify as cryptoVerify,
  type KeyLike,
} from 'crypto'
import {
  validateHmacLicenseKey as validateLegacyHmacKey,
  type LicenseTier,
  type ValidationResult as LegacyValidationResult,
} from './licenseValidator'

export type { LicenseTier }

// ─── Official Production/Dev Fallback Public Key (NIST P-256) ────────────────
export const DEFAULT_ECDSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoQ97L2t26dcKGAvpeiBi+MdFHU4h
5kKdlcun3MBI2sMrbiT0EouZb6KkoNKQtRW3bfPfZNDXXJzxOyEPmQi7eA==
-----END PUBLIC KEY-----`

// ─── Payload Interfaces ───────────────────────────────────────────────────────
export interface EcdsaLicensePayload {
  tier: LicenseTier
  hwid?: string
  expiresAt: number // Unix ms timestamp. 0 = lifetime (never expires)
  features?: string[]
  issuedAt?: number
  customer?: string
  extra?: Record<string, any>
}

export interface ValidatedEcdsaLicense {
  valid: true
  tier: LicenseTier
  expiresAt: number
  hwid?: string
  features: string[]
  isLegacyHmac: boolean
  payload: EcdsaLicensePayload
}

export interface InvalidEcdsaLicense {
  valid: false
  reason: string
}

export type EcdsaValidationResult = ValidatedEcdsaLicense | InvalidEcdsaLicense

// ─── RFC 4648 Base32 Codec (Zero external dependencies) ──────────────────────
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE32_MAP: Record<string, number> = {}
for (let i = 0; i < BASE32_ALPHABET.length; i++) {
  BASE32_MAP[BASE32_ALPHABET[i]] = i
}
// Robustness aliases for human transcription errors (0->O, 1->I)
BASE32_MAP['0'] = BASE32_MAP['O']
BASE32_MAP['1'] = BASE32_MAP['I']

/**
 * Encodes a Buffer into standard RFC 4648 Base32 string (unpadded).
 */
export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decodes a Base32 string back into a Buffer.
 * Ignores whitespace, dashes, padding '=', and handles case-insensitivity.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const val = BASE32_MAP[char]
    if (val === undefined) continue

    value = (value << 5) | val
    bits += 5

    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(out)
}

// ─── Envelope Binary Packing (Versioned, Self-describing) ──────────────────────
const FORMAT_VERSION_V1 = 0x01

export interface UnpackedEnvelope {
  version: number
  payload: EcdsaLicensePayload
  payloadBuf: Buffer
  signature: Buffer
}

/**
 * Packs payload object + raw signature into a binary buffer:
 * [1 byte version] + [2 bytes payloadLen UInt16BE] + [payloadBuf] + [signature]
 */
export function packEnvelope(payload: EcdsaLicensePayload, signature: Buffer): Buffer {
  const payloadJson = JSON.stringify(payload)
  const payloadBuf = Buffer.from(payloadJson, 'utf8')
  if (payloadBuf.length > 65535) {
    throw new Error('Payload size exceeds 64KB envelope limit')
  }

  const packed = Buffer.alloc(1 + 2 + payloadBuf.length + signature.length)
  packed[0] = FORMAT_VERSION_V1
  packed.writeUInt16BE(payloadBuf.length, 1)
  payloadBuf.copy(packed, 3)
  signature.copy(packed, 3 + payloadBuf.length)

  return packed
}

/**
 * Unpacks binary envelope buffer into payload object, raw payload buffer, and signature buffer.
 */
export function unpackEnvelope(buf: Buffer): UnpackedEnvelope | null {
  if (!Buffer.isBuffer(buf) || buf.length < 3 + 10 + 64) {
    return null
  }

  const version = buf[0]
  if (version !== FORMAT_VERSION_V1) {
    return null
  }

  const payloadLen = buf.readUInt16BE(1)
  if (payloadLen <= 0 || buf.length < 3 + payloadLen + 64) {
    return null
  }

  const payloadBuf = buf.subarray(3, 3 + payloadLen)
  const signature = buf.subarray(3 + payloadLen)

  try {
    const payload = JSON.parse(payloadBuf.toString('utf8')) as EcdsaLicensePayload
    return {
      version,
      payload,
      payloadBuf,
      signature,
    }
  } catch {
    return null
  }
}

// ─── Key Formatting ──────────────────────────────────────────────────────────
/**
 * Formats a raw or base32 ECDSA key into chunked groups:
 * ZENDEV-XXXXX-XXXXX-XXXXX-...
 */
export function formatEcdsaLicenseKey(keyOrBase32: string, chunkSize = 5): string {
  let raw = keyOrBase32.trim().toUpperCase()
  if (raw.startsWith('ZENDEV-')) {
    raw = raw.slice(7)
  } else if (raw.startsWith('ZENDEV')) {
    raw = raw.slice(6)
  }
  // Remove non-alphanumeric
  raw = raw.replace(/[^A-Z0-9]/g, '')
  if (!raw) return keyOrBase32

  const chunks: string[] = []
  for (let i = 0; i < raw.length; i += chunkSize) {
    chunks.push(raw.slice(i, i + chunkSize))
  }
  return `ZENDEV-${chunks.join('-')}`
}

/**
 * Strips formatting dashes and spaces from a license key.
 */
export function normalizeLicenseKey(key: string): string {
  if (!key || typeof key !== 'string') return ''
  return key.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Tests if the given key follows the ECDSA ZENDEV format.
 */
export function isEcdsaLicenseKey(key: string): boolean {
  const norm = normalizeLicenseKey(key)
  return norm.startsWith('ZENDEV-') || norm.startsWith('ZENDEV')
}

/**
 * Tests if the given key follows the legacy HMAC NEXUS format.
 */
export function isLegacyHmacLicenseKey(key: string): boolean {
  const norm = normalizeLicenseKey(key)
  return norm.startsWith('NEXUS-') || norm.startsWith('NEXUS')
}

// ─── Cryptographic Signature Verification (NIST P-256) ───────────────────────
/**
 * Verifies ECDSA signature over payload buffer using NIST P-256 public key.
 * Supports standard DER and IEEE-P1363 encodings.
 */
export function verifySignature(
  payloadBuf: Buffer,
  signatureBuf: Buffer,
  publicKeyPem: string | KeyLike
): boolean {
  try {
    // 1. Standard DER verification (default in Node.js & OpenSSL)
    if (cryptoVerify('sha256', payloadBuf, publicKeyPem, signatureBuf)) {
      return true
    }
  } catch {
    // DER check errored or malformed, continue to IEEE-P1363 check
  }

  try {
    // 2. IEEE-P1363 format check (64 bytes: 32 bytes R + 32 bytes S)
    if (
      cryptoVerify(
        'sha256',
        payloadBuf,
        { key: publicKeyPem as any, dsaEncoding: 'ieee-p1363' },
        signatureBuf
      )
    ) {
      return true
    }
  } catch {
    // Ignore verification errors
  }

  return false
}

// ─── Main Verifier Function ──────────────────────────────────────────────────
/**
 * Offline verifiable public-key license validator.
 * Validates ZENDEV ECDSA licenses against the embedded/provided Public Key.
 * Transparently falls back to legacy HMAC verification for NEXUS- keys.
 *
 * @param licenseKey  - Full license string (ZENDEV-... or legacy NEXUS-...)
 * @param hwid        - Current device Hardware ID (optional, required if license is hardware-locked)
 * @param publicKeyPem - Optional custom Public Key PEM (defaults to official ZenDev Public Key)
 */
export function verifyEcdsaLicense(
  licenseKey: string,
  hwid?: string,
  publicKeyPem?: string
): EcdsaValidationResult {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, reason: 'License key is missing or empty' }
  }

  const normalized = normalizeLicenseKey(licenseKey)

  // ── Backward Compatibility: Legacy HMAC fallback ──────────────────────────
  if (isLegacyHmacLicenseKey(normalized)) {
    const legacyResult: LegacyValidationResult = validateLegacyHmacKey(licenseKey)
    if (!legacyResult.valid) {
      return { valid: false, reason: legacyResult.reason }
    }

    const defaultFeatures = ['pro', 'team', 'lifetime'].includes(legacyResult.tier)
      ? ['offline', 'cloud_sync', 'api_access', 'all']
      : ['offline']

    return {
      valid: true,
      tier: legacyResult.tier,
      expiresAt: legacyResult.expiresAt,
      features: defaultFeatures,
      isLegacyHmac: true,
      payload: {
        tier: legacyResult.tier,
        expiresAt: legacyResult.expiresAt,
        features: defaultFeatures,
      },
    }
  }

  // ── ECDSA Format Check ─────────────────────────────────────────────────────
  let base32Content = normalized
  if (base32Content.startsWith('ZENDEV-')) {
    base32Content = base32Content.slice(7)
  } else if (base32Content.startsWith('ZENDEV')) {
    base32Content = base32Content.slice(6)
  } else {
    // If not starting with ZENDEV or NEXUS, reject early
    return {
      valid: false,
      reason: 'Invalid license format. Expected ZENDEV- or NEXUS- key.',
    }
  }

  // Strip remaining dashes/hyphens from base32
  base32Content = base32Content.replace(/[^A-Z0-9]/g, '')

  if (!base32Content || base32Content.length < 20) {
    return { valid: false, reason: 'License key format is too short or corrupted' }
  }

  // Decode Base32 envelope
  let envelopeBuf: Buffer
  try {
    envelopeBuf = base32Decode(base32Content)
  } catch {
    return { valid: false, reason: 'Failed to decode Base32 license data' }
  }

  const unpacked = unpackEnvelope(envelopeBuf)
  if (!unpacked) {
    return {
      valid: false,
      reason: 'Invalid license envelope structure or corrupted payload',
    }
  }

  const { payload, payloadBuf, signature } = unpacked

  // ── Asymmetric Cryptographic Verification ────────────────────────────────
  const resolvedPublicKey =
    publicKeyPem ||
    process.env['ZENDEV_LICENSE_PUBLIC_KEY'] ||
    DEFAULT_ECDSA_PUBLIC_KEY

  const isSigValid = verifySignature(payloadBuf, signature, resolvedPublicKey)
  if (!isSigValid) {
    return {
      valid: false,
      reason: 'Cryptographic signature verification failed (key tampered or forged)',
    }
  }

  // ── Field Validations ─────────────────────────────────────────────────────
  // 1. Tier validation
  const validTiers: LicenseTier[] = ['free', 'pro', 'team', 'lifetime']
  if (!payload.tier || !validTiers.includes(payload.tier)) {
    return { valid: false, reason: `Unknown or invalid license tier: ${payload.tier}` }
  }

  // 2. Hardware ID (HWID) Device-Locking Check
  if (payload.hwid && payload.hwid !== '*' && payload.hwid.trim().length > 0) {
    const requiredHwid = payload.hwid.trim().toLowerCase()
    if (!hwid || hwid.trim().length === 0) {
      return {
        valid: false,
        reason: 'License requires hardware ID verification, but no HWID was provided',
      }
    }
    const currentHwid = hwid.trim().toLowerCase()
    if (requiredHwid !== currentHwid) {
      return {
        valid: false,
        reason: `Hardware ID mismatch: license is locked to another machine`,
      }
    }
  }

  // 3. Expiration Check (expiresAt: 0 = lifetime, never expires)
  const expiresAt = Number(payload.expiresAt ?? 0)
  if (expiresAt !== 0 && Date.now() > expiresAt) {
    return { valid: false, reason: 'License key has expired' }
  }

  // 4. Features extraction
  const features = Array.isArray(payload.features) ? payload.features : ['all']

  return {
    valid: true,
    tier: payload.tier,
    expiresAt,
    hwid: payload.hwid,
    features,
    isLegacyHmac: false,
    payload,
  }
}
