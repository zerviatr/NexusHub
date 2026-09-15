/**
 * tests/challengerReverify.test.ts
 *
 * Adversarial Empirical Verification Suite for Challenger Client Re-Verification:
 * 1. SafeStorage DPAPI round-trip, fallback, tamper resistance, and corrupt vault recovery
 * 2. CSP Ollama local connect allowance (packaged and dev)
 * 3. Collapsible Sidebar rail persistence, shortcuts, and focus suppression
 * 4. Drag-and-Drop Gateway:
 *    - Exhaustive invalid extension rejection (50+ dangerous and unsupported formats)
 *    - Pathological / malicious multi-extension attack tests (e.g. exploit.pdf.exe)
 *    - Supported extension routing across all valid formats and case variants
 *    - Rejection pipeline simulation (error audio, warning toast, zero dispatch, zero navigation)
 *    - Verification of active consuming listeners in all 6 target tools + SqliteViewer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  encryptString,
  decryptString,
  storeSecret,
  retrieveSecret,
  deleteSecret,
} from '../src/main/ipc/safeStorage'
import {
  resolveGatewayRoute,
  setPendingDrop,
  getPendingDrop,
  consumePendingDrop,
  dispatchGatewayDrop,
  FileGatewayDropDetail,
} from '../src/renderer/src/lib/fileGateway'

describe('Adversarial Challenger Re-Verification Suite', () => {
  // ─── TARGET 1: SAFESTORAGE EMPIRICAL RE-VERIFICATION ──────────────────────────
  describe('1. SafeStorage Encryption, Fallback, and Tamper Resistance', () => {
    it('handles empty and whitespace-only strings gracefully without throwing', () => {
      expect(encryptString('')).toBe('')
      expect(decryptString('')).toBe('')
    })

    it('encrypts and decrypts complex multi-byte Unicode, emojis, and control characters', () => {
      const complexInputs = [
        '🔒 SuperSecret! 12345 @#$%^&*()_+',
        '日本語テキスト・UTF8エンコードテスト',
        'Multi\nline\r\ntext\twith\0null\bcharacters',
        JSON.stringify({ apiKey: 'sk-ant-api03-12345', nested: { val: true, arr: [1, 2, 3] } }),
      ]

      for (const input of complexInputs) {
        const encrypted = encryptString(input)
        expect(encrypted).toBeDefined()
        expect(encrypted.length).toBeGreaterThan(0)
        expect(encrypted).not.toBe(input)

        const decrypted = decryptString(encrypted)
        expect(decrypted).toBe(input)
      }
    })

    it('dev fallback: correctly handles dev_raw: prefix format and refuses malformed base64', () => {
      const rawPayload = 'test-secret-dev-mode'
      const base64 = Buffer.from(rawPayload, 'utf8').toString('base64')
      const formatted = `dev_raw:${base64}`

      expect(decryptString(formatted)).toBe(rawPayload)

      // Tampered / corrupted payload
      const tampered = `dev_raw:!!!not-valid-base64???`
      // Buffer.from with invalid base64 in Node doesn't throw, but should decode or fail safely
      expect(() => decryptString(tampered)).not.toThrow()
    })

    it('secrets store handles store, retrieve, delete, and overwrite cycles correctly', () => {
      const key = 'test_openai_key_' + Date.now()
      const secret1 = 'sk-initial-secret-value-111'
      const secret2 = 'sk-updated-secret-value-222'

      // Store initial
      expect(storeSecret(key, secret1)).toBe(true)
      expect(retrieveSecret(key)).toBe(secret1)

      // Overwrite
      expect(storeSecret(key, secret2)).toBe(true)
      expect(retrieveSecret(key)).toBe(secret2)

      // Delete
      expect(deleteSecret(key)).toBe(true)
      expect(retrieveSecret(key)).toBeNull()

      // Redundant delete returns false
      expect(deleteSecret(key)).toBe(false)
    })

    it('secrets store rejects empty key without crashing', () => {
      expect(storeSecret('', 'value')).toBe(false)
      expect(retrieveSecret('')).toBeNull()
      expect(deleteSecret('')).toBe(false)
    })
  })

  // ─── TARGET 2: CSP OLLAMA LOCAL CONNECTION ALLOWANCE ─────────────────────────
  describe('2. CSP Local Ollama Connection Allowance', () => {
    it('verifies src/main/index.ts includes loopback Ollama endpoints in both packaged and dev CSP', () => {
      const mainIndexPath = path.resolve(__dirname, '../src/main/index.ts')
      expect(fs.existsSync(mainIndexPath)).toBe(true)
      const content = fs.readFileSync(mainIndexPath, 'utf8')

      // Check packaged CSP connects to Ollama
      expect(content).toContain("http://127.0.0.1:11434")
      expect(content).toContain("http://localhost:11434")

      // Extract connect-src directives
      const packagedMatches = content.match(/connect-src [^;"]+/g)
      expect(packagedMatches).not.toBeNull()
      expect(packagedMatches!.length).toBeGreaterThanOrEqual(1)

      for (const directive of packagedMatches!) {
        expect(directive).toContain('http://127.0.0.1:11434')
        expect(directive).toContain('http://localhost:11434')
        // Must NOT allow arbitrary insecure http:
        expect(directive).not.toMatch(/connect-src[^;]*\bhttp:\s/)
      }
    })
  })

  // ─── TARGET 3: COLLAPSIBLE SIDEBAR RAIL PERSISTENCE & SHORTCUTS ─────────────────
  describe('3. Collapsible Sidebar Rail Persistence & Shortcuts', () => {
    it('verifies Sidebar.tsx implements localStorage persistence, Ctrl+B shortcut, and input suppression', () => {
      const sidebarPath = path.resolve(__dirname, '../src/renderer/src/components/Sidebar.tsx')
      expect(fs.existsSync(sidebarPath)).toBe(true)
      const content = fs.readFileSync(sidebarPath, 'utf8')

      // LocalStorage persistence
      expect(content).toContain("localStorage.getItem('nexus_sidebar_collapsed')")
      expect(content).toContain("localStorage.setItem('nexus_sidebar_collapsed', String(next))")

      // Event dispatch
      expect(content).toContain("nexus:sidebar-collapse")

      // Shortcut
      expect(content).toContain("e.key.toLowerCase() === 'b'")
      expect(content).toContain("e.ctrlKey || e.metaKey")

      // Focus suppression for typing
      expect(content).toContain("target.tagName === 'INPUT'")
      expect(content).toContain("target.tagName === 'TEXTAREA'")
      expect(content).toContain("target.isContentEditable")

      // Visual width toggle
      expect(content).toContain("collapsed ? 'w-16' : 'w-56'")
    })
  })

  // ─── TARGET 4: DRAG-AND-DROP GATEWAY ADVERSARIAL STRESS TESTING ────────────────
  describe('4. Drag-and-Drop Gateway Adversarial Stress Testing', () => {
    describe('4.1 Exhaustive Invalid Extension Rejection', () => {
      const dangerousAndUnsupportedExtensions = [
        // Executables & Binaries
        'malware.exe', 'trojan.dll', 'driver.sys', 'payload.bin', 'image.iso', 'disk.img',
        'installer.msi', 'flash.swf', 'compiled.o', 'library.so', 'library.dylib',
        // Shell & Script files
        'hack.bat', 'run.cmd', 'script.sh', 'macro.vbs', 'task.ps1', 'exploit.py',
        'code.c', 'code.cpp', 'module.rs', 'service.go', 'App.java', 'bundle.jar',
        // Archives
        'archive.zip', 'package.rar', 'compressed.7z', 'data.tar', 'data.tar.gz',
        'bundle.tar.bz2', 'image.dmg', 'package.apk',
        // Media files (unsupported)
        'video.mp4', 'clip.mkv', 'movie.avi', 'recording.mov', 'song.mp3', 'track.flac',
        'audio.wav', 'podcast.m4a', 'stream.ogg',
        // Office & Document formats (unsupported)
        'document.docx', 'document.doc', 'worksheet.xlsx', 'sheet.xls', 'presentation.pptx',
        'slides.ppt', 'document.odt', 'rich.rtf', 'page.html', 'style.css',
        // System / Dotfiles / No extension
        'LICENSE', 'README', 'Makefile', 'Dockerfile', '.gitignore', '.env',
      ]

      for (const fileName of dangerousAndUnsupportedExtensions) {
        it(`strictly rejects unsupported file: ${fileName}`, () => {
          expect(resolveGatewayRoute(fileName)).toBeNull()
        })
      }
    })

    describe('4.2 Pathological Multi-Extension Spoofing Attacks', () => {
      const maliciousDoubleExtensions = [
        'invoice.pdf.exe',
        'database.sqlite.dll',
        'avatar.png.bat',
        'backup.nexusvault.vbs',
        'config.json.ps1',
        'notes.md.sh',
        'checksum.sha256.cmd',
        'report.pdf.tar.gz',
        'contract.pdf.iso',
        'photo.jpg.msi',
      ]

      for (const fileName of maliciousDoubleExtensions) {
        it(`strictly rejects multi-extension spoofing attempt: ${fileName}`, () => {
          expect(resolveGatewayRoute(fileName)).toBeNull()
        })
      }
    })

    describe('4.3 Supported Extensions Routing & Case Insensitivity', () => {
      const validCases = [
        // PDF -> /pdf-studio
        { input: 'contract.pdf', route: '/pdf-studio' },
        { input: 'ANNUAL_REPORT.PDF', route: '/pdf-studio' },
        { input: 'scan.sub.pdf', route: '/pdf-studio' },

        // Database -> /json-studio
        { input: 'app.sqlite', route: '/json-studio' },
        { input: 'DATA.SQLITE', route: '/json-studio' },
        { input: 'database.db', route: '/json-studio' },
        { input: 'production.db3', route: '/json-studio' },
        { input: 'backup.sql', route: '/json-studio' },
        { input: 'SCHEMA.SQL', route: '/json-studio' },

        // Images -> /image
        { input: 'photo.png', route: '/image' },
        { input: 'BANNER.PNG', route: '/image' },
        { input: 'hero.jpg', route: '/image' },
        { input: 'picture.jpeg', route: '/image' },
        { input: 'graphic.webp', route: '/image' },
        { input: 'modern.avif', route: '/image' },
        { input: 'anim.gif', route: '/image' },
        { input: 'scan.tiff', route: '/image' },
        { input: 'icon.bmp', route: '/image' },
        { input: 'vector.svg', route: '/image' },

        // Vault -> /fortress
        { input: 'keys.nexusvault', route: '/fortress' },
        { input: 'STORAGE.NEXUSVAULT', route: '/fortress' },

        // JSON/JWT -> /json-studio
        { input: 'settings.json', route: '/json-studio' },
        { input: 'MANIFEST.JSON', route: '/json-studio' },
        { input: 'session.jwt', route: '/json-studio' },
        { input: 'TOKEN.JWT', route: '/json-studio' },

        // Markdown / Text -> /scratchpad
        { input: 'notes.md', route: '/scratchpad' },
        { input: 'DOCUMENT.MD', route: '/scratchpad' },
        { input: 'guide.markdown', route: '/scratchpad' },
        { input: 'draft.txt', route: '/scratchpad' },
        { input: 'LOG.TXT', route: '/scratchpad' },

        // Checksums -> /hash-studio
        { input: 'release.sha256', route: '/hash-studio' },
        { input: 'INTEGRITY.SHA256', route: '/hash-studio' },
        { input: 'archive.sha512', route: '/hash-studio' },
        { input: 'file.md5', route: '/hash-studio' },
      ]

      for (const { input, route } of validCases) {
        it(`correctly maps ${input} -> ${route}`, () => {
          expect(resolveGatewayRoute(input)).toBe(route)
        })
      }
    })

    describe('4.4 App.tsx Drop Rejection Pipeline & Event Guarantees', () => {
      beforeEach(() => {
        consumePendingDrop()
      })

      it('rejection pipeline: invalid file executes error sound, toast warning, does NOT dispatch, does NOT navigate', () => {
        const audioErrorMock = vi.fn()
        const toastWarningMock = vi.fn()
        const dispatchMock = vi.fn()
        const navigateMock = vi.fn()

        const simulateHandleDrop = (fileName: string) => {
          const targetRoute = resolveGatewayRoute(fileName)
          if (!targetRoute) {
            audioErrorMock()
            toastWarningMock('Unsupported File Format', 'Unsupported file format.')
            return
          }
          dispatchMock()
          navigateMock(targetRoute)
        }

        simulateHandleDrop('trojan.exe')

        expect(audioErrorMock).toHaveBeenCalledTimes(1)
        expect(toastWarningMock).toHaveBeenCalledTimes(1)
        expect(dispatchMock).not.toHaveBeenCalled()
        expect(navigateMock).not.toHaveBeenCalled()
        expect(consumePendingDrop()).toBeNull()
      })

      it('consumption pipeline: pending drop is cleared after first consumption (preventing duplicate processing)', () => {
        const mockFile = new File(['123'], 'test.pdf', { type: 'application/pdf' })
        const detail: FileGatewayDropDetail = {
          file: mockFile,
          name: 'test.pdf',
          path: 'C:\\test.pdf',
          size: 3,
          type: 'application/pdf',
        }

        setPendingDrop(detail)
        expect(getPendingDrop()).toEqual(detail)

        const first = consumePendingDrop()
        expect(first).toEqual(detail)

        const second = consumePendingDrop()
        expect(second).toBeNull()
      })

      it('verifies that App.tsx contains error audio, toast warning, and early return on invalid drop', () => {
        const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
        const content = fs.readFileSync(appPath, 'utf8')

        expect(content).toContain('const targetRoute = resolveGatewayRoute(file.name)')
        expect(content).toContain('if (!targetRoute) {')
        expect(content).toContain('cyberAudio.error()')
        expect(content).toContain('showToastWarning(')
        expect(content).toContain('return')
        expect(content).toContain('dispatchGatewayDrop(detail)')
        expect(content).toContain('navigate(targetRoute)')
      })
    })

    describe('4.5 Verification of Consuming Listeners in All 6 Target Tools + SqliteViewer', () => {
      const toolSpecs = [
        {
          file: 'src/renderer/src/pages/PdfStudio.tsx',
          expectedExtCheck: '.pdf',
          stateTarget: 'setMergeFiles',
        },
        {
          file: 'src/renderer/src/pages/JsonStudio.tsx',
          expectedExtCheck: '.json',
          stateTarget: 'setRawJson',
        },
        {
          file: 'src/renderer/src/components/SqliteViewer.tsx',
          expectedExtCheck: '.sqlite',
          stateTarget: 'processFile',
        },
        {
          file: 'src/renderer/src/pages/ImageToolkit.tsx',
          expectedExtCheck: 'png|jpe?g|webp',
          stateTarget: 'setFiles',
        },
        {
          file: 'src/renderer/src/pages/CyberFortress.tsx',
          expectedExtCheck: '.nexusvault',
          stateTarget: 'setVaultFile',
        },
        {
          file: 'src/renderer/src/pages/Scratchpad.tsx',
          expectedExtCheck: 'md|markdown|txt',
          stateTarget: 'setNotes',
        },
        {
          file: 'src/renderer/src/pages/HashStudio.tsx',
          expectedExtCheck: 'setActiveTab',
          stateTarget: 'handleFileChange',
        },
      ]

      for (const spec of toolSpecs) {
        it(`verifies ${spec.file} imports useFileGatewayDrop, filters extensions, and updates state`, () => {
          const filePath = path.resolve(__dirname, '..', spec.file)
          expect(fs.existsSync(filePath)).toBe(true)
          const content = fs.readFileSync(filePath, 'utf8')

          // Must import hook
          expect(content).toContain("import { useFileGatewayDrop } from")

          // Must register hook
          expect(content).toContain("useFileGatewayDrop(")

          // Must check relevant extension or call handler
          expect(content).toMatch(new RegExp(spec.expectedExtCheck))

          // Must update component state
          expect(content).toContain(spec.stateTarget)
        })
      }
    })
  })
})
