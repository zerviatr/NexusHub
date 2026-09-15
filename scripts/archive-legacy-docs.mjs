/**
 * Copyright 2026 ZenDev / NexusHub
 * Automated Legacy Documentation Archival & Workspace Sanitization Utility
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const archiveDir = path.join(rootDir, 'docs', 'archive')

export const LEGACY_DOC_FILES = [
  'YAPILACAKLAR.md',
  'ZenDev - Ticari Fizibilite ve Monetizasyon Raporu.md',
  'ZenDev_BugFix_ve_Kusursuzlastirma_Plani.md',
  'ZenDev_Devasa_BugFix_Master_Plani.md',
  'ZenDev_Devasa_Masterplan.md',
  'ZenDev_Durum_ve_Eksikler_Raporu.md',
  'ZenDev_Publish_Raporu.md',
  'ZenDev_Uygulama_Kusursuzlastirma_Plani.md',
  'ZenDev_Web_Kusursuzlastirma_Plani.md'
]

export const OBSOLETE_ARTIFACTS = [
  '.ag-kit-backups',
  'tsconfig.web.tsbuildinfo'
]

export function archiveLegacyDocs(baseDir = rootDir) {
  const archiveDir = path.join(baseDir, 'docs', 'archive')
  console.log(`🚀 [Archive] Starting legacy documentation archival and workspace cleanup in: ${baseDir}...`)

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true })
    console.log(`📁 [Archive] Created archive directory: ${path.relative(baseDir, archiveDir)}`)
  }

  let movedCount = 0
  for (const filename of LEGACY_DOC_FILES) {
    const sourcePath = path.join(baseDir, filename)
    const targetPath = path.join(archiveDir, filename)

    if (fs.existsSync(sourcePath)) {
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath)
        } catch {}
      }
      fs.renameSync(sourcePath, targetPath)
      console.log(`  ✓ Moved: ${filename} -> docs/archive/${filename}`)
      movedCount++
    } else if (fs.existsSync(targetPath)) {
      console.log(`  ℹ Already archived: docs/archive/${filename}`)
    } else {
      console.log(`  ⚠ File not found (skipped): ${filename}`)
    }
  }

  let deletedCount = 0
  for (const item of OBSOLETE_ARTIFACTS) {
    const itemPath = path.join(baseDir, item)
    if (fs.existsSync(itemPath)) {
      const stat = fs.statSync(itemPath)
      if (stat.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true })
        console.log(`  ✓ Removed directory: ${item}`)
      } else {
        fs.unlinkSync(itemPath)
        console.log(`  ✓ Removed file: ${item}`)
      }
      deletedCount++
    }
  }

  console.log(`\n🎉 [Archive] Complete! ${movedCount} documents moved, ${deletedCount} obsolete artifacts removed.`)
  return { movedCount, deletedCount }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  archiveLegacyDocs()
}
