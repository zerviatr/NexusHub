/**
 * Clipboard Manager IPC Handler
 *
 * Tracks clipboard history using an adaptive, event-driven watcher with dynamic
 * backoff, window focus/blur optimization, power-state awareness, and deduplicated
 * broadcast notifications.
 *
 * Stores up to MAX_HISTORY entries in-memory.
 * IPC channels:
 *   clipboard:getHistory  → ClipboardEntry[]
 *   clipboard:clear       → void
 *   clipboard:delete      → (id: string) → void
 *   clipboard:write       → (text: string) → void
 * IPC events emitted:
 *   clipboard:changed     → ClipboardEntry
 */

import { ipcMain, clipboard, app, BrowserWindow, powerMonitor } from 'electron'

export interface ClipboardEntry {
  id: string
  text: string
  timestamp: number
  preview: string
}

const MAX_HISTORY = 50
const MAX_TEXT_LENGTH = 50000 // 50KB per entry max

// Adaptive polling interval configuration
const ACTIVE_INTERVAL_MS = 1000       // 1s when active or window is focused
const MAX_FOCUSED_INTERVAL_MS = 3000  // 3s max when focused but clipboard unchanged
const IDLE_INTERVAL_MS = 4500         // 4.5s max when window is blurred/idle
const UNCHANGED_TICKS_THRESHOLD = 3   // Start backoff after 3 unchanged checks

let history: ClipboardEntry[] = []
let lastText = ''
let pollerTimeout: ReturnType<typeof setTimeout> | null = null
let currentIntervalMs = ACTIVE_INTERVAL_MS
let unchangedStreak = 0
let isPaused = false
let isInitialized = false

function generateId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function broadcastEntry(entry: ClipboardEntry): void {
  try {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('clipboard:changed', entry)
      }
    }
  } catch {
    // Non-fatal if windows are tearing down
  }
}

function addEntry(text: string): boolean {
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH)
  }
  if (!text.trim() || text === lastText) return false
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

  // Broadcast change event to renderer windows so renderer avoids polling
  broadcastEntry(entry)
  return true
}

function checkClipboard(): boolean {
  try {
    const text = clipboard.readText()
    if (!text || text === lastText) {
      return false
    }
    return addEntry(text)
  } catch {
    // Clipboard can throw on rare OS locks/state transitions — swallow safely
    return false
  }
}

function scheduleNextTick(delayMs: number): void {
  if (pollerTimeout) {
    clearTimeout(pollerTimeout)
    pollerTimeout = null
  }
  if (isPaused) return

  pollerTimeout = setTimeout(() => {
    pollerTick()
  }, delayMs)
}

function pollerTick(): void {
  if (isPaused) return

  const hasChanged = checkClipboard()

  if (hasChanged) {
    // Immediate reset to active interval upon change
    unchangedStreak = 0
    currentIntervalMs = ACTIVE_INTERVAL_MS
  } else {
    unchangedStreak++
    if (unchangedStreak >= UNCHANGED_TICKS_THRESHOLD) {
      // Check if any window is actively focused
      let hasFocusedWindow = false
      try {
        hasFocusedWindow = BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isFocused())
      } catch {
        hasFocusedWindow = false
      }

      const maxInterval = hasFocusedWindow ? MAX_FOCUSED_INTERVAL_MS : IDLE_INTERVAL_MS
      currentIntervalMs = Math.min(maxInterval, Math.round(currentIntervalMs * 1.5))
    }
  }

  scheduleNextTick(currentIntervalMs)
}

function wakeWatcher(): void {
  unchangedStreak = 0
  currentIntervalMs = ACTIVE_INTERVAL_MS
  checkClipboard()
  scheduleNextTick(ACTIVE_INTERVAL_MS)
}

function pauseWatcher(): void {
  isPaused = true
  if (pollerTimeout) {
    clearTimeout(pollerTimeout)
    pollerTimeout = null
  }
}

function resumeWatcher(): void {
  isPaused = false
  wakeWatcher()
}

function startWatcher(): void {
  if (isInitialized) return
  isInitialized = true

  // Capture initial clipboard value
  try {
    lastText = clipboard.readText()
  } catch {
    lastText = ''
  }

  // Instant wake-up when any application window gains focus
  try {
    app.on('browser-window-focus', () => {
      wakeWatcher()
    })
  } catch {
    // Headless or mock environment fallback
  }

  // Power monitor listeners: pause timer on sleep/lock, resume on wake
  try {
    if (powerMonitor) {
      powerMonitor.on('suspend', () => pauseWatcher())
      powerMonitor.on('resume', () => resumeWatcher())
      powerMonitor.on('lock-screen', () => pauseWatcher())
      powerMonitor.on('unlock-screen', () => resumeWatcher())
    }
  } catch {
    // powerMonitor may be unready in test environments
  }

  // Schedule first tick
  scheduleNextTick(ACTIVE_INTERVAL_MS)
}

export function registerClipboardIPC(): void {
  app.on('will-quit', () => {
    pauseWatcher()
  })

  startWatcher()

  ipcMain.handle('clipboard:getHistory', (): ClipboardEntry[] => {
    // Sync before returning in case a rapid copy occurred
    checkClipboard()
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
    wakeWatcher()
  })
}
