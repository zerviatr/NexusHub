/**
 * vaultCrypto.ts
 * AES-GCM 256-bit client-side encryption for ZenDev Password Vault.
 * Uses the Web Crypto API native in modern Chromium/Electron.
 */

export interface SavedPasswordItem {
  id: string
  title: string
  username?: string
  password: string
  strength?: string
  category?: string
  notes?: string
  createdAt: number
  updatedAt?: number
}

const STORAGE_KEY = 'nexus_password_vault_v1'
const SEED_KEY = 'nexus_vault_device_salt'

/** Get or create persistent device salt */
function getDeviceSalt(): Uint8Array {
  let saltStr = localStorage.getItem(SEED_KEY)
  if (!saltStr) {
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)
    saltStr = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(SEED_KEY, saltStr)
  }
  const match = saltStr.match(/.{1,2}/g) || []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

/** Derive a CryptoKey from device salt using PBKDF2 */
async function getVaultKey(): Promise<CryptoKey> {
  const salt = getDeviceSalt()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('ZenDev_Local_Vault_Master_Seed'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Encrypt vault items into an encrypted base64 payload */
export async function saveEncryptedVault(items: SavedPasswordItem[]): Promise<void> {
  try {
    const key = await getVaultKey()
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    const encodedData = new TextEncoder().encode(JSON.stringify(items))
    const encryptedBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      encodedData
    )

    const payload = {
      iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(new Uint8Array(encryptedBuf)).map((b) => b.toString(16).padStart(2, '0')).join(''),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.error('[Vault] Encryption failed, fallback to raw storage:', err)
    // Fallback safe storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }
}

/** Decrypt and load vault items */
export async function loadDecryptedVault(): Promise<SavedPasswordItem[]> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    // If it's already an array (unencrypted fallback or migration)
    if (Array.isArray(parsed)) {
      return parsed
    }

    if (parsed.iv && parsed.data) {
      const key = await getVaultKey()
      const ivMatch = parsed.iv.match(/.{1,2}/g) || []
      const iv = new Uint8Array(ivMatch.map((b: string) => parseInt(b, 16)))

      const dataMatch = parsed.data.match(/.{1,2}/g) || []
      const cipherBytes = new Uint8Array(dataMatch.map((b: string) => parseInt(b, 16)))

      const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
        key,
        cipherBytes as unknown as ArrayBuffer
      )

      const decryptedText = new TextDecoder().decode(decryptedBuf)
      return JSON.parse(decryptedText)
    }

    return []
  } catch (err) {
    console.error('[Vault] Decryption failed:', err)
    return []
  }
}
