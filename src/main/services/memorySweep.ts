import type { BrowserWindow } from 'electron'

export interface MemorySweepResult {
  success: boolean
  freedMem?: number
  error?: string
}

/**
 * Performs a comprehensive memory sweep:
 * 1. Invokes V8 Garbage Collection if exposed via --expose-gc
 * 2. Instructs renderer webContents to execute memory cleanup
 * 3. Clears session memory cache safely without affecting user persistence
 */
export function performMemorySweep(targetWindow?: BrowserWindow | null): MemorySweepResult {
  try {
    const memBefore = process.memoryUsage().heapUsed

    if (typeof (global as any).gc === 'function') {
      try {
        ;(global as any).gc()
      } catch (gcErr) {
        console.warn('[MemorySweep] V8 garbage collection call failed:', gcErr)
      }
    }

    if (targetWindow && !targetWindow.isDestroyed()) {
      try {
        if (!targetWindow.webContents?.isDestroyed?.()) {
          targetWindow.webContents.send('app:memory-sweep')
        }
      } catch {}

      try {
        targetWindow.webContents.session?.clearCache?.().catch(() => {})
      } catch {}
    }

    const memAfter = process.memoryUsage().heapUsed
    const freedMem = Math.max(0, memBefore - memAfter)

    return { success: true, freedMem }
  } catch (err: any) {
    console.error('[MemorySweep] Failed to perform memory sweep:', err)
    return { success: false, error: err?.message || 'Unknown memory sweep error' }
  }
}
