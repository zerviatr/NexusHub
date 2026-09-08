/**
 * Clipboard Manager IPC Handler
 *
 * Tracks clipboard history using Electron's clipboard API + polling.
 * Stores up to MAX_HISTORY entries in-memory.
 * IPC channels:
 *   clipboard:getHistory  → ClipboardEntry[]
 *   clipboard:clear       → void
 *   clipboard:delete      → (id: string) → void
 *   clipboard:write       → (text: string) → void
 */

import { ipcMain, clipboard } from 'electron'

export interface ClipboardEntry {
  id: string
  text: string
  timestamp: number
  preview: string
}

const MAX_HISTORY = 50
const POLL_INTERVAL_MS = 1000

let history: ClipboardEntry[] = []
let lastText = ''
let pollerInterval: ReturnType<typeof setInterval> | null = null

function generateId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function addEntry(text: string): void {
  if (!text.trim() || text === lastText) return
  lastText = text

  const entry: ClipboardEntry = {
    id: generateId(),
    text,
    timestamp: Date.now(),
    preview: text.length > 120 ? text.slice(0, 120) + '…' : text,
  }

  // Deduplicate: remove existing same-text entry
  history = history.filter((e) => e.text !== text)
  // Prepend newest
  history.unshift(entry)
  // Cap size
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY)
  }
}

function startPoller(): void {
  if (pollerInterval) return
  // Capture initial value
  lastText = clipboard.readText()

  pollerInterval = setInterval(() => {
    try {
      const current = clipboard.readText()
      if (current && current !== lastText) {
        addEntry(current)
      }
    } catch {
      // Clipboard can throw on some OS states — swallow silently
    }
  }, POLL_INTERVAL_MS)
}

export function registerClipboardIPC(): void {
  startPoller()

  ipcMain.handle('clipboard:getHistory', (): ClipboardEntry[] => {
    return history
  })

  ipcMain.handle('clipboard:clear', (): void => {
    history = []
  })

  ipcMain.handle('clipboard:delete', (_, id: string): void => {
    history = history.filter((e) => e.id !== id)
  })

  ipcMain.handle('clipboard:write', (_, text: string): void => {
    clipboard.writeText(text)
    // Don't re-add to history — it's already there or user is re-copying
    lastText = text
  })
}
