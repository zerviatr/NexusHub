import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ── In-Memory Electron IPC Registry Mock via vi.hoisted ─────────────────────
const {
  ipcHandlers,
  ipcListeners,
  mockIpcMain,
  mockDialog,
  mockSafeStorage,
  mockApp,
  mockBrowserWindow,
} = vi.hoisted(() => {
  const handlers = new Map<string, Function>()
  const listeners = new Map<string, Function>()

  return {
    ipcHandlers: handlers,
    ipcListeners: listeners,
    mockIpcMain: {
      handle: (channel: string, listener: Function) => {
        handlers.set(channel, listener)
      },
      on: (channel: string, listener: Function) => {
        listeners.set(channel, listener)
      },
      removeHandler: (channel: string) => {
        handlers.delete(channel)
      },
    },
    mockDialog: {
      showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] })),
    },
    mockSafeStorage: {
      isEncryptionAvailable: vi.fn(() => true),
      encryptString: vi.fn((plain: string) => Buffer.from(`ENC:${plain}`, 'utf8')),
      decryptString: vi.fn((buf: Buffer) => {
        const str = buf.toString('utf8')
        if (str.startsWith('ENC:')) return str.slice(4)
        return str
      }),
    },
    mockApp: {
      getPath: vi.fn(() => require('os').tmpdir()),
      isPackaged: false,
    },
    mockBrowserWindow: {
      getAllWindows: vi.fn(() => []),
    },
  }
})

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  safeStorage: mockSafeStorage,
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
}))

// Helper to invoke an IPC handler simulating ipcRenderer.invoke()
async function invokeIpc(channel: string, ...args: any[]): Promise<any> {
  const handler = ipcHandlers.get(channel)
  if (!handler) {
    throw new Error(`[IPC Test Error] No handler registered for channel '${channel}'`)
  }
  return handler({ sender: {} }, ...args)
}

// Import IPC modules after electron mock is set up
import { registerPortWatchdogIPC } from '../src/main/ipc/portWatchdog'
import { registerCyberFortressIPC } from '../src/main/ipc/cyberFortressIPC'
import { registerSafeStorageIPC } from '../src/main/ipc/safeStorage'
import { registerLicenseIPC } from '../src/main/ipc/license'

describe('Electron Main-Process IPC Integration Tests (tests/ipc.test.ts)', () => {
  beforeEach(() => {
    ipcHandlers.clear()
    ipcListeners.clear()
    vi.clearAllMocks()

    // Register all target IPC modules
    registerPortWatchdogIPC()
    registerCyberFortressIPC()
    registerSafeStorageIPC()
    registerLicenseIPC()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Port Watchdog & Process Safety Bounds (portWatchdog)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Port Watchdog IPC (port:scanActivePorts & port:killProcess)', () => {
    it('should register port:scanActivePorts and port:killProcess handlers', () => {
      expect(ipcHandlers.has('port:scanActivePorts')).toBe(true)
      expect(ipcHandlers.has('port:killProcess')).toBe(true)
    })

    it('should reject killing System Idle Process (PID 0)', async () => {
      const res = await invokeIpc('port:killProcess', 0)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem kritik işlemleri')
    })

    it('should reject killing System Kernel Process (PID 4)', async () => {
      const res = await invokeIpc('port:killProcess', 4)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem kritik işlemleri')
    })

    it('should reject killing negative PIDs', async () => {
      const res = await invokeIpc('port:killProcess', -1)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem kritik işlemleri')
    })

    it('should reject killing self app process PID (suicide prevention)', async () => {
      const res = await invokeIpc('port:killProcess', process.pid)
      expect(res.success).toBe(false)
      expect(res.error).toContain('ZenDev ana süreci')
    })

    it('should reject oversized PIDs exceeding 32-bit integer limits (> 2147483647)', async () => {
      const res = await invokeIpc('port:killProcess', 2147483648)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem kritik işlemleri')
    })

    it('should reject non-numeric or float PIDs', async () => {
      const res1 = await invokeIpc('port:killProcess', '1234')
      expect(res1.success).toBe(false)

      const res2 = await invokeIpc('port:killProcess', 1234.56)
      expect(res2.success).toBe(false)

      const res3 = await invokeIpc('port:killProcess', NaN)
      expect(res3.success).toBe(false)
    })

    it('should scan active ports and return parsed port array or handle environment', async () => {
      const res = await invokeIpc('port:scanActivePorts')
      expect(res).toBeDefined()
      expect(typeof res.success).toBe('boolean')
      expect(Array.isArray(res.ports)).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Cyber Fortress IPC (DoD 7-Pass Shredder & AES-256 Vault Crypto)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Cyber Fortress IPC (fortress:shredFile, fortress:encryptFile, fortress:decryptFile)', () => {
    const tempDir = path.join(os.tmpdir(), `zendev_ipc_test_${Date.now()}`)

    beforeEach(() => {
      fs.mkdirSync(tempDir, { recursive: true })
    })

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('should block shredding protected Windows system directories', async () => {
      const winDir = process.env.SystemRoot || 'C:\\Windows'
      const protectedPath = path.join(winDir, 'System32', 'notepad.exe')

      const res = await invokeIpc('fortress:shredFile', protectedPath)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem güvenliği nedeniyle korumalı')
    })

    it('should block shredding system drive root (e.g. C:\\)', async () => {
      const sysDrive = (process.env.SystemDrive || 'c:') + '\\'
      const res = await invokeIpc('fortress:shredFile', sysDrive)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Sistem güvenliği')
    })

    it('should reject shredding empty or non-string file paths', async () => {
      const res1 = await invokeIpc('fortress:shredFile', '')
      expect(res1.success).toBe(false)

      const res2 = await invokeIpc('fortress:shredFile', null)
      expect(res2.success).toBe(false)
    })

    it('should execute genuine DoD 5220.22-M 7-pass shredder and permanently destroy the file', async () => {
      const targetFile = path.join(tempDir, 'classified_keys_to_shred.txt')
      const sensitiveData = 'TOP_SECRET_CRYPTOGRAPHIC_ENTROPY_2026_DO_NOT_LEAK'
      fs.writeFileSync(targetFile, sensitiveData, 'utf8')

      expect(fs.existsSync(targetFile)).toBe(true)

      // Invoke shredder over IPC
      const shredRes = await invokeIpc('fortress:shredFile', targetFile)
      expect(shredRes.success).toBe(true)
      expect(shredRes.passes).toBe(7)

      // Forensic verification: file MUST be wiped and unlinked from the filesystem
      expect(fs.existsSync(targetFile)).toBe(false)
    })

    it('should execute AES-256-GCM vault encryption and decryption over IPC preserving byte integrity', async () => {
      const plainFile = path.join(tempDir, 'contract_sample.json')
      const secretContent = JSON.stringify({ customer: 'Nexus Corp', value: 95000, date: '2026-09-13' })
      fs.writeFileSync(plainFile, secretContent, 'utf8')

      const passphrase = 'MasterUltraSecretPassphrase2026!'

      // 1. Encrypt file
      const encRes = await invokeIpc('fortress:encryptFile', {
        filePath: plainFile,
        passphrase,
      })

      expect(encRes.success).toBe(true)
      expect(encRes.outPath).toBeDefined()
      expect(fs.existsSync(encRes.outPath)).toBe(true)

      // Encrypted file should not contain plain text
      const encBytes = fs.readFileSync(encRes.outPath)
      expect(encBytes.toString('utf8')).not.toContain('Nexus Corp')

      // 2. Decrypt file
      const decRes = await invokeIpc('fortress:decryptFile', {
        filePath: encRes.outPath,
        passphrase,
      })

      expect(decRes.success).toBe(true)
      expect(decRes.outPath).toBeDefined()
      expect(fs.existsSync(decRes.outPath)).toBe(true)

      // Decrypted content matches original exactly
      const restored = fs.readFileSync(decRes.outPath, 'utf8')
      expect(restored).toBe(secretContent)
    })

    it('should fail decryption if wrong passphrase is provided (GCM auth tag rejection)', async () => {
      const plainFile = path.join(tempDir, 'fail_auth.txt')
      fs.writeFileSync(plainFile, 'Hello GCM Auth Tag', 'utf8')

      const encRes = await invokeIpc('fortress:encryptFile', {
        filePath: plainFile,
        passphrase: 'CorrectPassphrase123',
      })

      const decRes = await invokeIpc('fortress:decryptFile', {
        filePath: encRes.outPath,
        passphrase: 'WRONG_PASSPHRASE_456',
      })

      expect(decRes.success).toBe(false)
      expect(decRes.error).toBeDefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SafeStorage Crypto Bridge IPC
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. SafeStorage IPC (safe-storage:*)', () => {
    it('should query safeStorage availability', async () => {
      const available = await invokeIpc('safe-storage:is-available')
      expect(typeof available).toBe('boolean')
    })

    it('should encrypt and decrypt string over IPC bridge', async () => {
      const rawText = 'sk-groq-live-api-key-sample-token-12345'
      const encrypted = await invokeIpc('safe-storage:encrypt', rawText)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(rawText)

      const decrypted = await invokeIpc('safe-storage:decrypt', encrypted)
      expect(decrypted).toBe(rawText)
    })

    it('should enforce type checking and throw TypeError for non-string inputs', async () => {
      await expect(invokeIpc('safe-storage:encrypt', 12345)).rejects.toThrow(TypeError)
      await expect(invokeIpc('safe-storage:decrypt', null)).rejects.toThrow(TypeError)
      await expect(invokeIpc('safe-storage:store', 'key', 12345)).rejects.toThrow(TypeError)
    })

    it('should store, retrieve, and delete secrets over IPC key-value bridge', async () => {
      const storeRes = await invokeIpc('safe-storage:store', 'openai_api_key', 'sk-proj-xyz999')
      expect(storeRes).toBe(true)

      const retrieveVal = await invokeIpc('safe-storage:retrieve', 'openai_api_key')
      expect(retrieveVal).toBe('sk-proj-xyz999')

      const deleteRes = await invokeIpc('safe-storage:delete', 'openai_api_key')
      expect(deleteRes).toBe(true)

      const afterDelete = await invokeIpc('safe-storage:retrieve', 'openai_api_key')
      expect(afterDelete).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. License IPC Bridge (license:*)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. License IPC Bridge (license:check, license:activate, license:deactivate)', () => {
    it('should reject activation when no key is provided', async () => {
      const res = await invokeIpc('license:activate', '')
      expect(res.success).toBe(false)
      expect(res.reason).toContain('No key provided')
    })

    it('should reject activation when key is oversized (> 1024 characters)', async () => {
      const giantKey = 'A'.repeat(1025)
      const res = await invokeIpc('license:activate', giantKey)
      expect(res.success).toBe(false)
      expect(res.reason).toContain('Invalid key format')
    })

    it('should reject activation when key has invalid HMAC signature', async () => {
      const res = await invokeIpc('license:activate', 'NEXUSP001INVALIDHMAC12345678')
      expect(res.success).toBe(false)
      expect(res.reason).toBeDefined()
    })

    it('should provide trial status or inactive on initial check', async () => {
      const status = await invokeIpc('license:check')
      expect(status).toBeDefined()
      expect(['active', 'inactive', 'expired']).toContain(status.status)
    })
  })
})
