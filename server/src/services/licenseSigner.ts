/**
 * server/src/services/licenseSigner.ts
 *
 * Enterprise Asymmetric ECDSA (NIST P-256 / prime256v1) License Signer for ZenDev.
 * Generates offline-verifiable cryptographically signed licenses with Base32 encoding.
 *
 * KEY FORMAT: ZENDEV-BASE32(version + payloadLength + payloadJSON + signatureDER)
 */

import {
  sign as cryptoSign,
  generateKeyPairSync,
  createPublicKey,
  type KeyLike,
} from 'crypto'
import fs from 'fs'
import path from 'path'

export type LicenseTier = 'free' | 'pro' | 'team' | 'lifetime'

export interface EcdsaLicensePayload {
  tier: LicenseTier
  hwid?: string
  expiresAt: number // Unix ms timestamp. 0 = lifetime (never expires)
  features?: string[]
  issuedAt?: number
  customer?: string
  extra?: Record<string, any>
}

// ─── Official Public Key ──────────────────────────────────────────────────────
export const DEFAULT_ECDSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoQ97L2t26dcKGAvpeiBi+MdFHU4h
5kKdlcun3MBI2sMrbiT0EouZb6KkoNKQtRW3bfPfZNDXXJzxOyEPmQi7eA==
-----END PUBLIC KEY-----`

/**
 * @deprecated Hardcoded private key has been eliminated for security.
 * Production requires process.env.ZENDEV_LICENSE_PRIVATE_KEY.
 * Development mode generates an ephemeral key pair dynamically if unset.
 */
export const DEFAULT_ECDSA_PRIVATE_KEY = undefined as unknown as string

// ─── Base32 Codec ─────────────────────────────────────────────────────────────
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

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

// ─── Key Pair Management & Fallback Generator ─────────────────────────────────
let cachedPrivateKey: string | null = null
let cachedPublicKey: string | null = null

export function _resetKeyCache(): void {
  cachedPrivateKey = null
  cachedPublicKey = null
}

/**
 * Loads the ECDSA Key Pair with cascading fallbacks:
 * 1. Environment variables: ZENDEV_LICENSE_PRIVATE_KEY / ZENDEV_LICENSE_PUBLIC_KEY
 * 2. File paths: ZENDEV_PRIVATE_KEY_PATH / ZENDEV_PUBLIC_KEY_PATH
 * 3. Local directory: server/keys/ecdsa_private.pem & server/keys/ecdsa_public.pem
 * 4. Production guard: Throws error if private key is missing in production
 * 5. Dev mode fallback: Generates ephemeral in-memory key pair dynamically with warning
 */
export function loadOrGenerateKeyPair(keysDir?: string): {
  publicKey: string
  privateKey: string
} {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey }
  }

  // 1. Check environment variables
  const envPrivate = process.env['ZENDEV_LICENSE_PRIVATE_KEY']
  const envPublic = process.env['ZENDEV_LICENSE_PUBLIC_KEY']
  if (envPrivate) {
    cachedPrivateKey = envPrivate.trim()
    if (envPublic) {
      cachedPublicKey = envPublic.trim()
    } else {
      try {
        cachedPublicKey = createPublicKey(cachedPrivateKey).export({ type: 'spki', format: 'pem' }) as string
      } catch {
        cachedPublicKey = DEFAULT_ECDSA_PUBLIC_KEY
      }
    }
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey }
  }

  // 2. Check explicitly configured paths
  const privatePath = process.env['ZENDEV_PRIVATE_KEY_PATH']
  const publicPath = process.env['ZENDEV_PUBLIC_KEY_PATH']
  if (privatePath && publicPath && fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    cachedPrivateKey = fs.readFileSync(privatePath, 'utf8').trim()
    cachedPublicKey = fs.readFileSync(publicPath, 'utf8').trim()
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey }
  }

  // 3. Check default keys directory (server/keys or root keys)
  const targetDir = keysDir || path.resolve(process.cwd(), 'keys')
  const defaultPrivFile = path.join(targetDir, 'ecdsa_private.pem')
  const defaultPubFile = path.join(targetDir, 'ecdsa_public.pem')

  if (fs.existsSync(defaultPrivFile) && fs.existsSync(defaultPubFile)) {
    try {
      cachedPrivateKey = fs.readFileSync(defaultPrivFile, 'utf8').trim()
      cachedPublicKey = fs.readFileSync(defaultPubFile, 'utf8').trim()
      return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey }
    } catch {
      // Fall through to validation/generation
    }
  }

  // 4. Production guard: enforce required private key
  const isProduction = process.env['NODE_ENV'] === 'production'
  if (isProduction) {
    throw new Error(
      '[SECURITY FATAL] ZENDEV_LICENSE_PRIVATE_KEY environment variable is required in production mode. Refusing to run without verified private key.'
    )
  }

  // 5. Development mode: generate ephemeral in-memory ECDSA key pair with explicit warning
  console.warn(
    '[SECURITY WARNING] ZENDEV_LICENSE_PRIVATE_KEY is not set. Generating ephemeral in-memory ECDSA key pair for development mode. Generated licenses will NOT be valid across restarts or against production public keys.'
  )
  const ephemeral = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  cachedPrivateKey = ephemeral.privateKey
  cachedPublicKey = ephemeral.publicKey

  return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey }
}

/**
 * Generates an entirely fresh NIST P-256 (prime256v1) keypair on demand.
 */
export function generateFreshKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKey, privateKey }
}

export function getEcdsaPrivateKey(): string {
  return loadOrGenerateKeyPair().privateKey
}

export function getEcdsaPublicKey(): string {
  return loadOrGenerateKeyPair().publicKey
}

// ─── License Generation & Signing ─────────────────────────────────────────────
const FORMAT_VERSION_V1 = 0x01

/**
 * Formats a key with dashed chunks (ZENDEV-XXXXX-XXXXX-...)
 */
export function formatEcdsaKey(raw: string, chunkSize = 5): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const chunks: string[] = []
  for (let i = 0; i < clean.length; i += chunkSize) {
    chunks.push(clean.slice(i, i + chunkSize))
  }
  return `ZENDEV-${chunks.join('-')}`
}

/**
 * Signs payload with ECDSA Private Key and returns raw buffers and Base32 key.
 */
export function signEcdsaPayload(
  payload: EcdsaLicensePayload,
  privateKeyPem?: string | KeyLike
): {
  licenseKey: string
  signature: Buffer
  packedBuffer: Buffer
} {
  const resolvedPrivateKey = privateKeyPem || getEcdsaPrivateKey()

  // Ensure issuedAt timestamp is stamped
  const canonicalPayload: EcdsaLicensePayload = {
    ...payload,
    issuedAt: payload.issuedAt ?? Date.now(),
    features: payload.features ?? ['offline', 'cloud_sync'],
  }

  const payloadJson = JSON.stringify(canonicalPayload)
  const payloadBuf = Buffer.from(payloadJson, 'utf8')

  if (payloadBuf.length > 65535) {
    throw new Error('Payload size exceeds maximum allowed envelope capacity (64KB)')
  }

  // Sign with NIST P-256 ECDSA + SHA256 (DER format)
  const signature = cryptoSign('sha256', payloadBuf, resolvedPrivateKey)

  // Pack: [version(1)] + [payloadLen(2)] + [payloadBuf] + [signature]
  const packedBuffer = Buffer.alloc(1 + 2 + payloadBuf.length + signature.length)
  packedBuffer[0] = FORMAT_VERSION_V1
  packedBuffer.writeUInt16BE(payloadBuf.length, 1)
  payloadBuf.copy(packedBuffer, 3)
  signature.copy(packedBuffer, 3 + payloadBuf.length)

  // Encode to Base32
  const base32 = base32Encode(packedBuffer)
  const formattedKey = formatEcdsaKey(base32)

  return {
    licenseKey: formattedKey,
    signature,
    packedBuffer,
  }
}

/**
 * Generates an ECDSA signed license key string.
 *
 * @param payload       - License payload details (tier, hwid, expiresAt, features)
 * @param privateKeyPem - Optional custom ECDSA Private Key PEM
 * @param formatted     - Whether to format with dashes (defaults to true)
 * @returns Complete license key string: ZENDEV-XXXXX-XXXXX-...
 */
export function generateEcdsaLicense(
  payload: EcdsaLicensePayload,
  privateKeyPem?: string | KeyLike,
  formatted = true
): string {
  const { licenseKey, packedBuffer } = signEcdsaPayload(payload, privateKeyPem)
  if (!formatted) {
    return `ZENDEV-${base32Encode(packedBuffer)}`
  }
  return licenseKey
}
