import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  archiveLegacyDocs,
  LEGACY_DOC_FILES,
  OBSOLETE_ARTIFACTS
} from '../scripts/archive-legacy-docs.mjs'

describe('Automated Legacy Documentation Archival Tests (tests/archiveLegacyDocs.test.ts)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zendev-archive-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('moves all existing legacy markdown documents to docs/archive and removes obsolete artifacts', () => {
    // Populate temp directory with legacy docs
    for (const filename of LEGACY_DOC_FILES) {
      fs.writeFileSync(path.join(tempDir, filename), `# Test Content for ${filename}`)
    }

    // Populate obsolete artifacts
    const backupDir = path.join(tempDir, '.ag-kit-backups')
    fs.mkdirSync(backupDir, { recursive: true })
    fs.writeFileSync(path.join(backupDir, 'backup.json'), '{}')

    const tsBuildInfo = path.join(tempDir, 'tsconfig.web.tsbuildinfo')
    fs.writeFileSync(tsBuildInfo, 'mock buildinfo')

    // Execute archival
    const result = archiveLegacyDocs(tempDir)
    expect(result.movedCount).toBe(LEGACY_DOC_FILES.length)
    expect(result.deletedCount).toBe(OBSOLETE_ARTIFACTS.length)

    // Verify all 9 files are in docs/archive/ and removed from root
    const archiveDir = path.join(tempDir, 'docs', 'archive')
    expect(fs.existsSync(archiveDir)).toBe(true)

    for (const filename of LEGACY_DOC_FILES) {
      expect(fs.existsSync(path.join(tempDir, filename))).toBe(false)
      expect(fs.existsSync(path.join(archiveDir, filename))).toBe(true)
      const content = fs.readFileSync(path.join(archiveDir, filename), 'utf-8')
      expect(content).toBe(`# Test Content for ${filename}`)
    }

    // Verify obsolete artifacts are deleted
    expect(fs.existsSync(backupDir)).toBe(false)
    expect(fs.existsSync(tsBuildInfo)).toBe(false)
  })

  it('is idempotent: running a second time handles already-archived files gracefully', () => {
    // Populate 3 legacy docs
    const partialFiles = LEGACY_DOC_FILES.slice(0, 3)
    for (const filename of partialFiles) {
      fs.writeFileSync(path.join(tempDir, filename), `First run for ${filename}`)
    }

    // First run
    const res1 = archiveLegacyDocs(tempDir)
    expect(res1.movedCount).toBe(3)

    // Second run
    const res2 = archiveLegacyDocs(tempDir)
    expect(res2.movedCount).toBe(0)
    expect(res2.deletedCount).toBe(0)

    // Verify docs remain intact in docs/archive
    for (const filename of partialFiles) {
      const archivedFile = path.join(tempDir, 'docs', 'archive', filename)
      expect(fs.existsSync(archivedFile)).toBe(true)
    }
  })

  it('handles safe overwrite when target file already exists in docs/archive', () => {
    const filename = LEGACY_DOC_FILES[0]
    const archiveDir = path.join(tempDir, 'docs', 'archive')
    fs.mkdirSync(archiveDir, { recursive: true })

    // Existing archived file
    fs.writeFileSync(path.join(archiveDir, filename), 'Old archived content')
    // Newly updated file in root
    fs.writeFileSync(path.join(tempDir, filename), 'Updated fresh content')

    const res = archiveLegacyDocs(tempDir)
    expect(res.movedCount).toBe(1)

    const content = fs.readFileSync(path.join(archiveDir, filename), 'utf-8')
    expect(content).toBe('Updated fresh content')
  })

  it('safely skips missing legacy files without throwing', () => {
    // Empty directory with no legacy files
    const res = archiveLegacyDocs(tempDir)
    expect(res.movedCount).toBe(0)
    expect(res.deletedCount).toBe(0)
    expect(fs.existsSync(path.join(tempDir, 'docs', 'archive'))).toBe(true)
  })
})
