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

import { CATEGORIES, getCategory, getUniquePath, safeMoveFile } from '../services/organizerCore'

export { CATEGORIES, getCategory, getUniquePath, safeMoveFile }

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

let lastExecutionMoves: FileOperation[] = []

async function executeOperations(operations: FileOperation[]): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: false,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
  }

  const recordedMoves: FileOperation[] = []

  for (const op of operations) {
    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(op.newPath)
      await fs.mkdir(destDir, { recursive: true })

      // Prevent silent overwrite by finding a unique destination path
      const safePath = await getUniquePath(op.newPath)

      // Perform the move/rename safely with cross-device support
      await safeMoveFile(op.oldPath, safePath)
      recordedMoves.push({ oldPath: op.oldPath, newPath: safePath })
      result.successfulOperations++
    } catch (error: any) {
      result.failedOperations++
      result.errors.push(`Failed to move ${op.oldPath}: ${error.message}`)
    }
  }

  if (recordedMoves.length > 0) {
    lastExecutionMoves = recordedMoves
  }

  result.success = result.failedOperations === 0
  return result
}

async function undoLastExecution(): Promise<{ success: boolean; restored: number; errors: string[] }> {
  if (lastExecutionMoves.length === 0) {
    return { success: false, restored: 0, errors: ['No previous operations to undo'] }
  }

  let restored = 0
  const errors: string[] = []

  // Move back in reverse
  for (const move of [...lastExecutionMoves].reverse()) {
    try {
      await safeMoveFile(move.newPath, move.oldPath)
      restored++
    } catch (err: any) {
      errors.push(`Failed to restore ${move.newPath} to ${move.oldPath}: ${err.message}`)
    }
  }

  // Clear log after undo
  lastExecutionMoves = []
  return { success: errors.length === 0, restored, errors }
}

// ===== IPC Registration =====
export function registerFileOrganizerIPC(): void {
  ipcMain.handle('organizer:selectDir', async () => selectDirectory())
  ipcMain.handle('organizer:scan', async (_event, dirPath: string) => scanDirectory(dirPath))
  ipcMain.handle('organizer:execute', async (_event, operations: FileOperation[]) => {
    if (!Array.isArray(operations)) {
      return { success: false, successfulOperations: 0, failedOperations: 0, errors: ['Geçersiz operasyon formatı'] }
    }
    return executeOperations(operations)
  })
  ipcMain.handle('organizer:canUndo', async () => lastExecutionMoves.length > 0)
  ipcMain.handle('organizer:undo', async () => undoLastExecution())
}
