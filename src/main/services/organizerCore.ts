/**
 * src/main/services/organizerCore.ts
 *
 * Core categorization and filesystem operations for Bulk File Organizer.
 * Decoupled from Electron IPC and UI windows for direct unit testability.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export const CATEGORIES: Record<string, string[]> = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.flv', '.m4v'],
  Audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv', '.odt', '.ods'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
  Installers: ['.exe', '.msi', '.dmg', '.pkg', '.apk', '.iso', '.appimage'],
  Code: ['.js', '.ts', '.py', '.html', '.css', '.json', '.xml', '.md', '.yml', '.yaml', '.sql', '.sh', '.bat', '.ps1', '.env', '.log', '.cpp', '.c', '.java', '.go', '.rs'],
}

/**
 * Returns the category name for a given file extension.
 * Defaults to 'Others' for unknown extensions.
 */
export function getCategory(ext: string): string {
  const lowerExt = ext.toLowerCase()
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category
    }
  }
  return 'Others'
}

/**
 * Generates a unique collision-free path by appending (1), (2), etc.
 * if the destination file already exists.
 */
export async function getUniquePath(targetPath: string): Promise<string> {
  let candidate = targetPath
  const dir = path.dirname(targetPath)
  const ext = path.extname(targetPath)
  const base = path.basename(targetPath, ext)
  let counter = 1

  while (true) {
    try {
      await fs.access(candidate)
      // File exists, generate next candidate
      candidate = path.join(dir, `${base} (${counter})${ext}`)
      counter++
    } catch {
      // File does not exist, candidate is safe to use
      return candidate
    }
  }
}

/**
 * Moves a file with graceful cross-device link (EXDEV) fallback.
 */
export async function safeMoveFile(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.rename(sourcePath, destPath)
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-device link fallback (e.g. C: to D: partition)
      await fs.copyFile(sourcePath, destPath)
      await fs.unlink(sourcePath)
    } else {
      throw err
    }
  }
}
