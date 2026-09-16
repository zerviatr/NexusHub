import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resolveGatewayRoute,
  setPendingDrop,
  getPendingDrop,
  consumePendingDrop,
  dispatchGatewayDrop,
  FileGatewayDropDetail,
} from '../src/renderer/src/lib/fileGateway'

describe('File Gateway — Extension Routing & Rejection', () => {
  describe('Supported Extensions Routing', () => {
    it('routes PDF documents to /pdf-studio', () => {
      expect(resolveGatewayRoute('contract.pdf')).toBe('/pdf-studio')
      expect(resolveGatewayRoute('DOCUMENT.PDF')).toBe('/pdf-studio')
      expect(resolveGatewayRoute('report.final.pdf')).toBe('/pdf-studio')
    })

    it('routes SQLite and SQL database files to /json-studio', () => {
      expect(resolveGatewayRoute('database.sqlite')).toBe('/json-studio')
      expect(resolveGatewayRoute('app.db')).toBe('/json-studio')
      expect(resolveGatewayRoute('backup.db3')).toBe('/json-studio')
      expect(resolveGatewayRoute('dump.sql')).toBe('/json-studio')
      expect(resolveGatewayRoute('SCHEMA.SQL')).toBe('/json-studio')
    })

    it('routes raster and vector images to /image', () => {
      const imageFiles = [
        'photo.png',
        'picture.jpg',
        'graphic.jpeg',
        'banner.webp',
        'photo.avif',
        'animation.gif',
        'scan.tiff',
        'icon.bmp',
        'vector.svg',
        'PHOTO.PNG',
        'IMAGE.JPEG',
      ]
      for (const file of imageFiles) {
        expect(resolveGatewayRoute(file)).toBe('/image')
      }
    })

    it('routes encrypted vaults to /fortress', () => {
      expect(resolveGatewayRoute('secure_keys.nexusvault')).toBe('/fortress')
      expect(resolveGatewayRoute('BACKUP.NEXUSVAULT')).toBe('/fortress')
    })

    it('routes JSON documents to /json-studio', () => {
      expect(resolveGatewayRoute('config.json')).toBe('/json-studio')
      expect(resolveGatewayRoute('PACKAGE.JSON')).toBe('/json-studio')
    })

    it('routes JWT tokens to /jwt-studio', () => {
      expect(resolveGatewayRoute('auth_token.jwt')).toBe('/jwt-studio')
      expect(resolveGatewayRoute('TOKEN.JWT')).toBe('/jwt-studio')
      expect(resolveGatewayRoute('session.bearer.jwt')).toBe('/jwt-studio')
    })

    it('routes cron schedule files to /cron-studio', () => {
      expect(resolveGatewayRoute('backup.cron')).toBe('/cron-studio')
      expect(resolveGatewayRoute('SCHEDULE.CRON')).toBe('/cron-studio')
      expect(resolveGatewayRoute('crontab.tab')).toBe('/cron-studio')
      expect(resolveGatewayRoute('TASKS.TAB')).toBe('/cron-studio')
    })

    it('routes Mermaid diagram files to /mermaid-studio', () => {
      expect(resolveGatewayRoute('architecture.mmd')).toBe('/mermaid-studio')
      expect(resolveGatewayRoute('FLOW.MMD')).toBe('/mermaid-studio')
      expect(resolveGatewayRoute('system.mermaid')).toBe('/mermaid-studio')
      expect(resolveGatewayRoute('SEQUENCE.MERMAID')).toBe('/mermaid-studio')
    })

    it('routes encoding and binary dump files to /encoding-studio', () => {
      expect(resolveGatewayRoute('payload.b64')).toBe('/encoding-studio')
      expect(resolveGatewayRoute('EXPORT.B64')).toBe('/encoding-studio')
      expect(resolveGatewayRoute('memory.hex')).toBe('/encoding-studio')
      expect(resolveGatewayRoute('BUFFER.HEX')).toBe('/encoding-studio')
      expect(resolveGatewayRoute('firmware.bin')).toBe('/encoding-studio')
      expect(resolveGatewayRoute('RAW_DATA.BIN')).toBe('/encoding-studio')
    })

    it('routes markdown and plain text notes to /scratchpad', () => {
      expect(resolveGatewayRoute('README.md')).toBe('/scratchpad')
      expect(resolveGatewayRoute('notes.markdown')).toBe('/scratchpad')
      expect(resolveGatewayRoute('todo.txt')).toBe('/scratchpad')
      expect(resolveGatewayRoute('CHANGELOG.MD')).toBe('/scratchpad')
    })

    it('routes checksum and hash digests to /hash-studio', () => {
      expect(resolveGatewayRoute('release.sha256')).toBe('/hash-studio')
      expect(resolveGatewayRoute('dist.sha512')).toBe('/hash-studio')
      expect(resolveGatewayRoute('checksums.md5')).toBe('/hash-studio')
      expect(resolveGatewayRoute('VERIFY.SHA256')).toBe('/hash-studio')
    })
  })

  describe('Invalid Extension Rejection (Challenger 2 Remediation)', () => {
    it('strictly rejects executable and binary files with null', () => {
      expect(resolveGatewayRoute('malware.exe')).toBeNull()
      expect(resolveGatewayRoute('system.dll')).toBeNull()
      expect(resolveGatewayRoute('disk.iso')).toBeNull()
      expect(resolveGatewayRoute('driver.sys')).toBeNull()
      expect(resolveGatewayRoute('setup.msi')).toBeNull()
    })

    it('strictly rejects multimedia video/audio files with null', () => {
      expect(resolveGatewayRoute('video.mp4')).toBeNull()
      expect(resolveGatewayRoute('audio.mp3')).toBeNull()
      expect(resolveGatewayRoute('movie.mkv')).toBeNull()
      expect(resolveGatewayRoute('sound.wav')).toBeNull()
    })

    it('strictly rejects shell scripts and compressed archives with null', () => {
      expect(resolveGatewayRoute('script.sh')).toBeNull()
      expect(resolveGatewayRoute('installer.bat')).toBeNull()
      expect(resolveGatewayRoute('archive.tar.gz')).toBeNull()
      expect(resolveGatewayRoute('backup.zip')).toBeNull()
      expect(resolveGatewayRoute('bundle.rar')).toBeNull()
    })

    it('strictly rejects files without extension or unsupported documents with null', () => {
      expect(resolveGatewayRoute('unsupported_file')).toBeNull()
      expect(resolveGatewayRoute('LICENSE')).toBeNull()
      expect(resolveGatewayRoute('document.docx')).toBeNull()
      expect(resolveGatewayRoute('spreadsheet.xlsx')).toBeNull()
    })
  })
})

describe('File Gateway — Drop Caching & Event Dispatch', () => {
  beforeEach(() => {
    consumePendingDrop()
  })

  it('stores and retrieves pending drop detail via setPendingDrop and getPendingDrop', () => {
    const mockFile = new File(['test content'], 'sample.pdf', { type: 'application/pdf' })
    const detail: FileGatewayDropDetail = {
      file: mockFile,
      name: 'sample.pdf',
      path: 'C:\\docs\\sample.pdf',
      size: mockFile.size,
      type: mockFile.type,
    }

    setPendingDrop(detail)
    expect(getPendingDrop()).toEqual(detail)
    if (typeof window !== 'undefined') {
      expect(window.__nexus_pending_drop).toEqual(detail)
    }
  })

  it('consumes pending drop and clears both module cache and window.__nexus_pending_drop', () => {
    const mockFile = new File(['test notes'], 'notes.md', { type: 'text/markdown' })
    const detail: FileGatewayDropDetail = {
      file: mockFile,
      name: 'notes.md',
      path: 'C:\\notes.md',
      size: mockFile.size,
      type: mockFile.type,
    }

    setPendingDrop(detail)
    const consumed = consumePendingDrop()
    expect(consumed).toEqual(detail)

    // Second consume should return null (cleared)
    expect(consumePendingDrop()).toBeNull()
    expect(getPendingDrop()).toBeNull()
    if (typeof window !== 'undefined') {
      expect(window.__nexus_pending_drop).toBeUndefined()
    }
  })

  it('dispatches nexus:file-gateway-drop event and caches pending drop', () => {
    if (typeof window === 'undefined') return

    const listener = vi.fn()
    window.addEventListener('nexus:file-gateway-drop', listener)

    const mockFile = new File(['{"tier": "pro"}'], 'data.json', { type: 'application/json' })
    const detail: FileGatewayDropDetail = {
      file: mockFile,
      name: 'data.json',
      path: 'C:\\data.json',
      size: mockFile.size,
      type: mockFile.type,
    }

    dispatchGatewayDrop(detail)

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent<FileGatewayDropDetail>
    expect(event.detail).toEqual(detail)
    expect(getPendingDrop()).toEqual(detail)

    window.removeEventListener('nexus:file-gateway-drop', listener)
  })
})
