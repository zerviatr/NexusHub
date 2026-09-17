/**
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Hoisted mocks for Tauri core & event
const { mockInvoke, mockListen } = vi.hoisted(() => {
  return {
    mockInvoke: vi.fn(),
    mockListen: vi.fn(),
  }
})

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}))

import { tauriNexusAPI, isTauriEnvironment } from '../src/renderer/src/lib/tauriBridge'

describe('Empirical Challenge: Tauri Bridge Fallback, Idempotency, & Argument Resilience', () => {
  const originalWindow = (globalThis as any).window

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).window = (globalThis as any).window || {}
  })

  afterEach(() => {
    if (originalWindow !== undefined) {
      ;(globalThis as any).window = originalWindow
    } else {
      delete (globalThis as any).window
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Task 1.1: Bridge Fallback Behavior When Tauri Core is Not Present
  // ───────────────────────────────────────────────────────────────────────────
  describe('1.1 Bridge Fallback Behavior (Non-Tauri Environment)', () => {
    it('correctly detects non-Tauri browser/mock environment', () => {
      // Ensure __TAURI_INTERNALS__ and __TAURI__ are absent
      delete (globalThis as any).window.__TAURI_INTERNALS__
      delete (globalThis as any).window.__TAURI__

      expect(isTauriEnvironment()).toBe(false)
    })

    it('correctly detects Tauri environment when __TAURI_INTERNALS__ or __TAURI__ present', () => {
      ;(globalThis as any).window.__TAURI_INTERNALS__ = {}
      expect(isTauriEnvironment()).toBe(true)

      delete (globalThis as any).window.__TAURI_INTERNALS__
      ;(globalThis as any).window.__TAURI__ = {}
      expect(isTauriEnvironment()).toBe(true)

      // Clean up
      delete (globalThis as any).window.__TAURI__
    })

    it('returns expected default fallback values without invoking native core', async () => {
      delete (globalThis as any).window.__TAURI_INTERNALS__
      delete (globalThis as any).window.__TAURI__

      // License fallback
      const licenseCheck = await tauriNexusAPI.license.check()
      expect(licenseCheck).toEqual({
        status: 'active',
        tier: 'pro',
        expiresAt: 0,
        key: 'PRO-TAURI-MIGRATION',
      })

      const licenseActivate = await tauriNexusAPI.license.activate('ANY-KEY')
      expect(licenseActivate).toEqual({ success: true, tier: 'pro', expiresAt: 0 })

      const licenseDeactivate = await tauriNexusAPI.license.deactivate()
      expect(licenseDeactivate).toEqual({ success: true })

      const licenseBgVerify = await tauriNexusAPI.license.bgVerify()
      expect(licenseBgVerify).toEqual({ valid: true })

      // Organizer fallback
      const dirSelect = await tauriNexusAPI.organizer.selectDir()
      expect(dirSelect).toEqual({ canceled: true, filePaths: [] })

      const canUndo = await tauriNexusAPI.organizer.canUndo()
      expect(canUndo).toBe(false)

      const undoRes = await tauriNexusAPI.organizer.undo()
      expect(undoRes).toEqual({ success: false, restored: 0, errors: [] })

      // Principle 2 Purged modules are undefined on tauriNexusAPI
      expect((tauriNexusAPI as any).clipboard).toBeUndefined()
      expect((tauriNexusAPI as any).tempMail).toBeUndefined()
      expect((tauriNexusAPI as any).system).toBeUndefined()
      expect((tauriNexusAPI as any).port).toBeUndefined()

      // Image & PDF fallbacks
      const imgFiles = await tauriNexusAPI.image.selectFiles()
      expect(imgFiles).toEqual([])

      const pdfFiles = await tauriNexusAPI.pdf.selectFiles()
      expect(pdfFiles).toEqual([])

      const pdfInspect = await tauriNexusAPI.pdf.inspectFiles(['test.pdf'])
      expect(pdfInspect).toEqual([])

      // Sentinel stats fallback
      const stats = await tauriNexusAPI.sentinel.getStats()
      expect(stats.success).toBe(true)
      expect(stats.cpu.cores).toBe(8)
      expect(stats.memory.percentUsed).toBe(50)

      // Fortress selectFile fallback
      const fortFile = await tauriNexusAPI.fortress.selectFile()
      expect(fortFile).toBeNull()

      // Updater checkNow fallback
      const updaterInfo = await tauriNexusAPI.updater.checkNow()
      expect(updaterInfo).toEqual({ hasUpdate: false, isLatest: true, currentVersion: '2.4.2' })

      // SafeStorage fallbacks
      expect(await tauriNexusAPI.safeStorage.isAvailable()).toBe(true)
      expect(await tauriNexusAPI.safeStorage.store('secret', '123')).toBe(true)
      expect(await tauriNexusAPI.safeStorage.retrieve('secret')).toBeNull()
      expect(await tauriNexusAPI.safeStorage.delete('secret')).toBe(true)

      // Journal fallbacks
      const journalQuery = await tauriNexusAPI.journal.query()
      expect(journalQuery).toEqual({ entries: [], total: 0, hasMore: false })

      const journalClear = await tauriNexusAPI.journal.clear()
      expect(journalClear.success).toBe(true)

      const chainRes = await tauriNexusAPI.journal.verifyChain()
      expect(chainRes.valid).toBe(true)

      const exportRes = await tauriNexusAPI.journal.export('json')
      expect(exportRes.success).toBe(true)

      const journalStats = await tauriNexusAPI.journal.getStats()
      expect(journalStats.totalEntries).toBe(0)

      // Window & Desktop fallbacks
      expect(await tauriNexusAPI.getVersion()).toBe('2.4.2')
      expect(await tauriNexusAPI.isMaximized()).toBe(false)
      expect(await tauriNexusAPI.toggleAlwaysOnTop()).toBe(false)
      expect(await tauriNexusAPI.isAlwaysOnTop()).toBe(false)
      expect(await tauriNexusAPI.memorySweep()).toEqual({ success: true })

      // Native invoke was NEVER called because we are in browser mock
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('returns resolved undefined for methods without explicit fallback', async () => {
      delete (globalThis as any).window.__TAURI_INTERNALS__
      delete (globalThis as any).window.__TAURI__

      expect(await tauriNexusAPI.bypassLink('http://foo.com')).toBeUndefined()
      expect(await tauriNexusAPI.decrypter.clean('http://foo.com')).toBeUndefined()
      expect(await tauriNexusAPI.decrypter.cleanBatch(['http://foo.com'])).toBeUndefined()
      expect(await tauriNexusAPI.organizer.scan('/test')).toBeUndefined()
      expect(await tauriNexusAPI.organizer.execute([])).toBeUndefined()
      expect(await tauriNexusAPI.network.ipLookup('example.com')).toBeUndefined()
      expect(await tauriNexusAPI.network.dnsQuery('example.com', 'A')).toBeUndefined()
      expect(await tauriNexusAPI.network.portScan('example.com', [80])).toBeUndefined()
      expect(await tauriNexusAPI.network.ping('example.com')).toBeUndefined()
      expect(await tauriNexusAPI.network.sslInspect('example.com')).toBeUndefined()
      expect(await tauriNexusAPI.network.myIp()).toBeUndefined()
      expect(await tauriNexusAPI.image.getMetadata('test.png')).toBeUndefined()
      expect(await tauriNexusAPI.image.process([])).toBeUndefined()
      expect(await tauriNexusAPI.fortress.shredFile('secret.txt')).toBeUndefined()
      expect(await tauriNexusAPI.net.dispatchRequest({})).toBeUndefined()
      expect(await tauriNexusAPI.net.dnsLookup('example.com')).toBeUndefined()
      expect(await tauriNexusAPI.net.tcpPing('example.com', 80)).toBeUndefined()
      expect(await tauriNexusAPI.net.sslCheck('example.com')).toBeUndefined()
      expect(await tauriNexusAPI.journal.record({ action: 'test' })).toBeUndefined()
      expect(await tauriNexusAPI.openExternal('http://example.com')).toBeUndefined()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Task 1.2: Event Listener Unlisten Functions & Idempotent Cleanup
  // ───────────────────────────────────────────────────────────────────────────
  describe('1.2 Unlisten Idempotency & Safe Cleanup', () => {
    it('returns safe, idempotent unlisten function in non-Tauri mode', () => {
      delete (globalThis as any).window.__TAURI_INTERNALS__
      delete (globalThis as any).window.__TAURI__

      const listeners = [
        tauriNexusAPI.license.onRevoked(() => {}),
        tauriNexusAPI.updater.onAvailable(() => {}),
        tauriNexusAPI.updater.onNotAvailable(() => {}),
        tauriNexusAPI.updater.onProgress(() => {}),
        tauriNexusAPI.updater.onDownloaded(() => {}),
        tauriNexusAPI.updater.onError(() => {}),
        tauriNexusAPI.updater.onApplyingPatch(() => {}),
        tauriNexusAPI.journal.onActivity(() => {}),
        tauriNexusAPI.pubsub.subscribe('test-topic', () => {}),
        tauriNexusAPI.onNavigate(() => {}),
        tauriNexusAPI.onPaletteToggle(() => {}),
        tauriNexusAPI.onHudToggle(() => {}),
        tauriNexusAPI.onVisibilityChange(() => {}),
        tauriNexusAPI.onMemorySweep(() => {}),
      ]

      for (const unlisten of listeners) {
        expect(typeof unlisten).toBe('function')
        // Call multiple times to test idempotency
        expect(() => {
          unlisten()
          unlisten()
          unlisten()
        }).not.toThrow()
      }
    })

    it('in Tauri mode: calls underlying unlisten on unmount and supports multiple invocations', async () => {
      ;(globalThis as any).window.__TAURI_INTERNALS__ = {}

      let unlistenCallCount = 0
      const mockUnlisten = vi.fn(() => {
        unlistenCallCount++
      })

      mockListen.mockResolvedValue(mockUnlisten)

      const unlisten = tauriNexusAPI.onPaletteToggle(() => {})

      expect(mockListen).toHaveBeenCalledWith('palette:toggle', expect.any(Function))

      // Wait for listen promise resolution
      await Promise.resolve()

      // Call unlisten
      unlisten()
      expect(mockUnlisten).toHaveBeenCalledTimes(1)

      // Call unlisten again (idempotency check)
      unlisten()
      expect(mockUnlisten.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('in Tauri mode: handles React 18 fast unmount before listen promise resolves', async () => {
      ;(globalThis as any).window.__TAURI_INTERNALS__ = {}

      let resolveListen: (fn: any) => void
      const listenPromise = new Promise<any>((resolve) => {
        resolveListen = resolve
      })

      const mockUnlisten = vi.fn()
      mockListen.mockReturnValue(listenPromise)

      // React mounts and subscribes
      const unlisten = tauriNexusAPI.onHudToggle(() => {})

      // React StrictMode immediately unmounts before promise resolves!
      unlisten()

      // Later, Tauri listen promise resolves
      resolveListen!(mockUnlisten)
      await Promise.resolve()
      await Promise.resolve()

      // setupEventListener must have cleaned up the listener immediately upon resolution!
      expect(mockUnlisten).toHaveBeenCalledTimes(1)
    })

    it('in Tauri mode: catches rejection if listen rejects without unhandled rejection', async () => {
      ;(globalThis as any).window.__TAURI_INTERNALS__ = {}

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockListen.mockRejectedValue(new Error('Tauri IPC permission denied'))

      expect(() => {
        const unlisten = tauriNexusAPI.onNavigate(() => {})
        unlisten()
      }).not.toThrow()

      await Promise.resolve()
      await Promise.resolve()

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Task 1.3: Namespace Shape & Undefined Argument Stress Testing
  // ───────────────────────────────────────────────────────────────────────────
  describe('1.3 Namespace Shape & Argument Stress Testing', () => {
    beforeEach(() => {
      delete (globalThis as any).window.__TAURI_INTERNALS__
      delete (globalThis as any).window.__TAURI__
    })

    it('safeStorage.encrypt & decrypt base64 fallback behavior under standard and non-latin1 strings', async () => {
      // Standard ASCII
      const enc = await tauriNexusAPI.safeStorage.encrypt('hello-world')
      expect(enc).toBe(btoa('hello-world'))
      const dec = await tauriNexusAPI.safeStorage.decrypt(enc)
      expect(dec).toBe('hello-world')

      // Stress test: what happens with non-Latin1 characters in btoa?
      // btoa throws InvalidCharacterError in browser/node when character > 0xFF
      let errorThrown = false
      try {
        await tauriNexusAPI.safeStorage.encrypt('🔒 secret key')
      } catch (err: any) {
        errorThrown = true
        expect(err.name).toMatch(/InvalidCharacterError/)
      }
      expect(errorThrown).toBe(true)
    })

    it('tests all namespaces with undefined / missing parameters', async () => {
      // 1. bypassLink
      await expect(tauriNexusAPI.bypassLink(undefined as any)).resolves.toBeUndefined()

      // 3. decrypter
      await expect(tauriNexusAPI.decrypter.clean(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.decrypter.cleanBatch(undefined as any)).resolves.toBeUndefined()

      // 4. organizer
      await expect(tauriNexusAPI.organizer.scan(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.organizer.execute(undefined as any)).resolves.toBeUndefined()

      // 6. network
      await expect(tauriNexusAPI.network.ipLookup(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.network.dnsQuery(undefined as any, undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.network.portScan(undefined as any, undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.network.ping(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.network.sslInspect(undefined as any)).resolves.toBeUndefined()

      // 7. image
      await expect(tauriNexusAPI.image.getMetadata(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.image.process(undefined as any)).resolves.toBeUndefined()

      // 8. sentinel
      await expect(tauriNexusAPI.sentinel.getStats()).resolves.toBeDefined()
      await expect(tauriNexusAPI.sentinel.optimizeMemory()).resolves.toBeDefined()

      // 9. fortress - observe shredFile vs encryptFile/decryptFile
      await expect(tauriNexusAPI.fortress.shredFile(undefined as any)).resolves.toBeUndefined()

      // Note: fortress.encryptFile takes payload: { filePath, passphrase }. If passed undefined:
      let encryptThrows = false
      try {
        await tauriNexusAPI.fortress.encryptFile(undefined as any)
      } catch (err: any) {
        encryptThrows = true
        expect(err).toBeInstanceOf(TypeError)
      }
      expect(encryptThrows).toBe(true)

      let decryptThrows = false
      try {
        await tauriNexusAPI.fortress.decryptFile(undefined as any)
      } catch (err: any) {
        decryptThrows = true
        expect(err).toBeInstanceOf(TypeError)
      }
      expect(decryptThrows).toBe(true)

      // When payload object is provided with empty/undefined fields:
      await expect(
        tauriNexusAPI.fortress.encryptFile({ filePath: undefined as any, passphrase: undefined as any })
      ).resolves.toBeUndefined()

      // 10. pdf - observe merge / split when passed undefined vs empty object
      let pdfMergeThrows = false
      try {
        await tauriNexusAPI.pdf.merge(undefined as any)
      } catch (err: any) {
        pdfMergeThrows = true
        expect(err).toBeInstanceOf(TypeError)
      }
      expect(pdfMergeThrows).toBe(true)

      let pdfSplitThrows = false
      try {
        await tauriNexusAPI.pdf.split(undefined as any)
      } catch (err: any) {
        pdfSplitThrows = true
        expect(err).toBeInstanceOf(TypeError)
      }
      expect(pdfSplitThrows).toBe(true)

      await expect(
        tauriNexusAPI.pdf.merge({ filePaths: undefined as any })
      ).resolves.toBeUndefined()

      // 11. license
      await expect(tauriNexusAPI.license.activate(undefined as any)).resolves.toBeDefined()

      // 14. settings
      await expect(tauriNexusAPI.settings.setAutoLaunch(undefined as any)).resolves.toBeDefined()

      // 16. safeStorage
      await expect(tauriNexusAPI.safeStorage.store(undefined as any, undefined as any)).resolves.toBe(true)
      await expect(tauriNexusAPI.safeStorage.retrieve(undefined as any)).resolves.toBeNull()
      await expect(tauriNexusAPI.safeStorage.delete(undefined as any)).resolves.toBe(true)

      // 17. net
      await expect(tauriNexusAPI.net.dispatchRequest(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.net.dnsLookup(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.net.tcpPing(undefined as any, undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.net.sslCheck(undefined as any)).resolves.toBeUndefined()

      // 18. journal
      await expect(tauriNexusAPI.journal.record(undefined as any)).resolves.toBeUndefined()
      await expect(tauriNexusAPI.journal.query(undefined as any)).resolves.toBeDefined()
      await expect(tauriNexusAPI.journal.export(undefined as any, undefined as any)).resolves.toBeDefined()

      // 19. pubsub
      expect(() => tauriNexusAPI.pubsub.publish(undefined as any, undefined as any)).not.toThrow()
      expect(() => {
        const unsub = tauriNexusAPI.pubsub.subscribe(undefined as any, undefined as any)
        unsub()
      }).not.toThrow()

      // 20. window
      await expect(tauriNexusAPI.openExternal(undefined as any)).resolves.toBeUndefined()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Task 2: Package.json Dependency Isolation Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Package.json Dependency Isolation', () => {
    const pkgPath = path.resolve(__dirname, '../package.json')

    it('verifies zero traces of forbidden Electron and legacy native binary packages in package.json', () => {
      const rawPkg = fs.readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(rawPkg)

      const forbiddenPackages = [
        'electron',
        'electron-vite',
        'electron-builder',
        'electron-updater',
        'sharp',
        'pdf-lib',
        'node-machine-id',
      ]

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
        ...pkg.optionalDependencies,
      }

      for (const forbidden of forbiddenPackages) {
        expect(allDeps[forbidden], `Forbidden package found in dependencies: ${forbidden}`).toBeUndefined()
      }

      // Deep string check across dependencies section
      const depsString = JSON.stringify({
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      })

      for (const forbidden of forbiddenPackages) {
        const regex = new RegExp(`"${forbidden}"`, 'i')
        expect(regex.test(depsString), `Direct mention of ${forbidden} in package manifest dependencies`).toBe(false)
      }
    })

    it('confirms Tauri v2 dependencies are properly isolated in package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

      expect(pkg.dependencies['@tauri-apps/api']).toBeDefined()
      expect(pkg.devDependencies['@tauri-apps/cli']).toBeDefined()
    })
  })
})
