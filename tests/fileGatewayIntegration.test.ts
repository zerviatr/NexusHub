import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  resolveGatewayRoute,
  setPendingDrop,
  consumePendingDrop,
  dispatchGatewayDrop,
  FileGatewayDropDetail,
} from '../src/renderer/src/lib/fileGateway'

describe('File Gateway Integration & Challenger 2 Audit Remediation', () => {
  const tools = [
    'src/renderer/src/pages/PdfStudio.tsx',
    'src/renderer/src/pages/JsonStudio.tsx',
    'src/renderer/src/pages/ImageToolkit.tsx',
    'src/renderer/src/pages/CyberFortress.tsx',
    'src/renderer/src/pages/Scratchpad.tsx',
    'src/renderer/src/pages/HashStudio.tsx',
    'src/renderer/src/components/SqliteViewer.tsx',
  ]

  it('verifies all 6 target tools and SqliteViewer register useFileGatewayDrop', () => {
    for (const toolRelPath of tools) {
      const fullPath = path.resolve(__dirname, '..', toolRelPath)
      expect(fs.existsSync(fullPath)).toBe(true)
      const content = fs.readFileSync(fullPath, 'utf8')
      expect(content).toContain('useFileGatewayDrop')
    }
  })

  it('verifies App.tsx dispatches fileGatewayDrop and rejects invalid extensions', () => {
    const appPath = path.resolve(__dirname, '..', 'src/renderer/src/App.tsx')
    const content = fs.readFileSync(appPath, 'utf8')
    expect(content).toContain('resolveGatewayRoute')
    expect(content).toContain('dispatchGatewayDrop')
    expect(content).toContain('cyberAudio.error()')
    expect(content).toContain('showToastWarning')
  })

  describe('Full Drop Gateway Pipeline Simulation', () => {
    beforeEach(() => {
      consumePendingDrop()
    })

    it('rejects unsupported extensions with error sound, warning toast, no dispatch, no navigation', () => {
      const audioErrorSpy = vi.fn()
      const toastWarningSpy = vi.fn()
      const navigateSpy = vi.fn()
      const dispatchSpy = vi.fn()

      const unsupportedFiles = [
        'trojan.exe',
        'driver.dll',
        'os.iso',
        'bios.rom',
        'video.mp4',
        'music.mp3',
        'installer.msi',
        'deploy.sh',
        'archive.tar.gz',
        'unsupported_file',
      ]

      for (const fileName of unsupportedFiles) {
        audioErrorSpy.mockClear()
        toastWarningSpy.mockClear()
        navigateSpy.mockClear()
        dispatchSpy.mockClear()

        // Simulate App.tsx handleDrop logic
        const targetRoute = resolveGatewayRoute(fileName)
        if (!targetRoute) {
          audioErrorSpy()
          toastWarningSpy('Unsupported Format', 'Unsupported file format.')
        } else {
          dispatchSpy()
          navigateSpy(targetRoute)
        }

        expect(targetRoute).toBeNull()
        expect(audioErrorSpy).toHaveBeenCalledTimes(1)
        expect(toastWarningSpy).toHaveBeenCalledTimes(1)
        expect(dispatchSpy).not.toHaveBeenCalled()
        expect(navigateSpy).not.toHaveBeenCalled()
        expect(consumePendingDrop()).toBeNull()
      }
    })

    it('routes and caches supported files for workstation on-mount ingestion', () => {
      const supportedTestCases = [
        { file: 'report.pdf', expectedRoute: '/pdf-studio' },
        { file: 'clients.sqlite', expectedRoute: '/json-studio' },
        { file: 'logo.png', expectedRoute: '/image' },
        { file: 'vault.nexusvault', expectedRoute: '/fortress' },
        { file: 'schema.json', expectedRoute: '/json-studio' },
        { file: 'auth_token.jwt', expectedRoute: '/jwt-studio' },
        { file: 'backup.cron', expectedRoute: '/cron-studio' },
        { file: 'crontab.tab', expectedRoute: '/cron-studio' },
        { file: 'system.mmd', expectedRoute: '/mermaid-studio' },
        { file: 'diagram.mermaid', expectedRoute: '/mermaid-studio' },
        { file: 'payload.b64', expectedRoute: '/encoding-studio' },
        { file: 'dump.hex', expectedRoute: '/encoding-studio' },
        { file: 'binary.bin', expectedRoute: '/encoding-studio' },
        { file: 'documentation.md', expectedRoute: '/scratchpad' },
        { file: 'integrity.sha256', expectedRoute: '/hash-studio' },
      ]

      for (const testCase of supportedTestCases) {
        consumePendingDrop()
        const targetRoute = resolveGatewayRoute(testCase.file)
        expect(targetRoute).toBe(testCase.expectedRoute)

        const mockFile = new File(['mock content'], testCase.file, { type: 'application/octet-stream' })
        const detail: FileGatewayDropDetail = {
          file: mockFile,
          name: testCase.file,
          path: `C:\\drop\\${testCase.file}`,
          size: mockFile.size,
          type: mockFile.type,
        }

        dispatchGatewayDrop(detail)

        // Target workstation mounts and consumes pending drop synchronously
        const consumed = consumePendingDrop()
        expect(consumed).not.toBeNull()
        expect(consumed?.name).toBe(testCase.file)
        expect(consumed?.path).toBe(`C:\\drop\\${testCase.file}`)

        // Verify cache is cleared after consumption
        expect(consumePendingDrop()).toBeNull()
      }
    })
  })
})
