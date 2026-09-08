import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

// ===== Types =====
export interface ScannedFile {
  originalName: string
  originalPath: string
  extension: string
  size: number
  suggestedCategory: string
}

export interface FileOperation {
  oldPath: string
  newPath: string
}

export interface ExecutionResult {
  success: boolean
  successfulOperations: number
  failedOperations: number
  errors: string[]
}

// ===== Constants =====
const CATEGORIES: Record<string, string[]> = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.flv', '.m4v'],
  Audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv', '.odt', '.ods'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
  Installers: ['.exe', '.msi', '.dmg', '.pkg', '.apk', '.iso', '.appimage'],
  Code: ['.js', '.ts', '.py', '.html', '.css', '.json', '.xml', '.md', '.yml', '.yaml', '.sql', '.sh', '.bat', '.ps1', '.env', '.log', '.cpp', '.c', '.java', '.go', '.rs'],
}

function getCategory(ext: string): string {
  const lowerExt = ext.toLowerCase()
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category
    }
  }
  return 'Others'
}

// ===== Logic =====

async function selectDirectory(): Promise<{ canceled: boolean; filePaths: string[] }> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Folder to Organize',
  })
  return result
}

async function scanDirectory(
  dirPath: string
): Promise<{ success: boolean; files?: ScannedFile[]; error?: string }> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files: ScannedFile[] = []

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name)
        const fullPath = path.join(dirPath, entry.name)
        
        try {
          const stats = await fs.stat(fullPath)
          files.push({
            originalName: entry.name,
            originalPath: fullPath,
            extension: ext,
            size: stats.size,
            suggestedCategory: getCategory(ext),
          })
        } catch (statErr) {
          // Ignore files we can't stat (permissions etc)
          console.warn(`[Organizer] Could not stat file: ${fullPath}`)
        }
      }
    }

    return { success: true, files }
  } catch (error: any) {
    console.error('[Organizer] Scan error:', error.message)
    return { success: false, error: error.message || 'Failed to scan directory' }
  }
}

async function getUniquePath(targetPath: string): Promise<string> {
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

async function executeOperations(operations: FileOperation[]): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: false,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
  }

  for (const op of operations) {
    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(op.newPath)
      await fs.mkdir(destDir, { recursive: true })

      // Prevent silent overwrite by finding a unique destination path
      const safePath = await getUniquePath(op.newPath)

      // Perform the move/rename
      await fs.rename(op.oldPath, safePath)
      result.successfulOperations++
    } catch (error: any) {
      result.failedOperations++
      result.errors.push(`Failed to move ${op.oldPath}: ${error.message}`)
    }
  }

  result.success = result.failedOperations === 0
  return result
}

// ===== IPC Registration =====
export function registerFileOrganizerIPC(): void {
  ipcMain.handle('organizer:selectDir', async () => selectDirectory())
  ipcMain.handle('organizer:scan', async (_event, dirPath: string) => scanDirectory(dirPath))
  ipcMain.handle('organizer:execute', async (_event, operations: FileOperation[]) =>
    executeOperations(operations)
  )
}
