/**
 * src/main/ipc/safeStorage.ts
 *
 * Secure credential and API key storage engine leveraging Electron's
 * native safeStorage API (Windows DPAPI / macOS Keychain / Linux Secret Service).
 * Provides encrypted persistence to prevent plaintext secrets in localStorage or filesystem.
 */

import { ipcMain, safeStorage, app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Cache file path for encrypted persistent key-value store
let secretsFilePath: string | null = null

function getSecretsFilePath(): string {
  if (!secretsFilePath) {
    try {
      const userDataDir = app.getPath('userData')
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true })
      }
      secretsFilePath = path.join(userDataDir, 'nexus_secrets.enc')
    } catch {
      // Fallback for non-standard/test environments without Electron app lifecycle
      secretsFilePath = path.join(os.tmpdir(), 'nexus_secrets.enc')
    }
  }
  return secretsFilePath
}

function isAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

/**
 * Encrypts a plaintext UTF-8 string using OS-level DPAPI/keychain.
 * Returns base64 encoded ciphertext string.
 */
export function encryptString(plainText: string): string {
  if (!plainText) return ''

  if (isAvailable()) {
    const encryptedBuf = safeStorage.encryptString(plainText)
    return encryptedBuf.toString('base64')
  }

  // Graceful fallback for development / headless environments without native keychain
  if (app?.isPackaged) {
    console.error('[safeStorage] Security warning: safeStorage encryption is unavailable in packaged build!')
  } else {
    console.warn('[safeStorage] Native safeStorage unavailable, using fallback encoding for development.')
  }

  // Obfuscated buffer for non-production environments without OS keychain
  const fallbackBuf = Buffer.from(plainText, 'utf8')
  return `dev_raw:${fallbackBuf.toString('base64')}`
}

/**
 * Decrypts a base64 encoded ciphertext string back to plaintext UTF-8.
 */
export function decryptString(cipherTextBase64: string): string {
  if (!cipherTextBase64) return ''

  if (cipherTextBase64.startsWith('dev_raw:')) {
    const raw = cipherTextBase64.slice(8)
    return Buffer.from(raw, 'base64').toString('utf8')
  }

  if (isAvailable()) {
    try {
      const buf = Buffer.from(cipherTextBase64, 'base64')
      return safeStorage.decryptString(buf)
    } catch (err) {
      console.error('[safeStorage] Failed to decrypt ciphertext:', err)
      return ''
    }
  }

  console.warn('[safeStorage] safeStorage unavailable for decryption.')
  return ''
}

interface SecretsMap {
  [key: string]: string // key -> base64 ciphertext
}

function readSecretsMap(): SecretsMap {
  const filePath = getSecretsFilePath()
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as SecretsMap
  } catch {
    return {}
  }
}

function writeSecretsMap(map: SecretsMap): void {
  const filePath = getSecretsFilePath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(map, null, 2), { encoding: 'utf8', mode: 0o600 })
  } catch (err) {
    console.error('[safeStorage] Failed to persist secrets file:', err)
  }
}

/**
 * Stores a secret securely by key.
 */
export function storeSecret(key: string, plainValue: string): boolean {
  if (!key) return false
  try {
    const map = readSecretsMap()
    map[key] = encryptString(plainValue)
    writeSecretsMap(map)
    return true
  } catch (err) {
    console.error(`[safeStorage] Failed to store secret '${key}':`, err)
    return false
  }
}

/**
 * Retrieves and decrypts a secret by key.
 */
export function retrieveSecret(key: string): string | null {
  if (!key) return null
  try {
    const map = readSecretsMap()
    const cipherText = map[key]
    if (!cipherText) return null
    return decryptString(cipherText)
  } catch (err) {
    console.error(`[safeStorage] Failed to retrieve secret '${key}':`, err)
    return null
  }
}

/**
 * Deletes a secret by key.
 */
export function deleteSecret(key: string): boolean {
  if (!key) return false
  try {
    const map = readSecretsMap()
    if (key in map) {
      delete map[key]
      writeSecretsMap(map)
      return true
    }
    return false
  } catch (err) {
    console.error(`[safeStorage] Failed to delete secret '${key}':`, err)
    return false
  }
}

/**
 * Registers safeStorage IPC endpoints for the renderer process.
 */
export function registerSafeStorageIPC(): void {
  // Query availability
  ipcMain.handle('safe-storage:is-available', () => {
    return isAvailable()
  })

  // Direct string encryption / decryption
  ipcMain.handle('safe-storage:encrypt', (_, plainText: string) => {
    if (typeof plainText !== 'string') {
      throw new TypeError('Expected plainText to be a string')
    }
    return encryptString(plainText)
  })

  ipcMain.handle('safe-storage:decrypt', (_, cipherText: string) => {
    if (typeof cipherText !== 'string') {
      throw new TypeError('Expected cipherText to be a string')
    }
    return decryptString(cipherText)
  })

  // Key-value store / retrieve / delete
  ipcMain.handle('safe-storage:store', (_, key: string, value: string) => {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new TypeError('Expected key and value to be strings')
    }
    return storeSecret(key, value)
  })

  ipcMain.handle('safe-storage:retrieve', (_, key: string) => {
    if (typeof key !== 'string') {
      throw new TypeError('Expected key to be a string')
    }
    return retrieveSecret(key)
  })

  ipcMain.handle('safe-storage:delete', (_, key: string) => {
    if (typeof key !== 'string') {
      throw new TypeError('Expected key to be a string')
    }
    return deleteSecret(key)
  })
}
