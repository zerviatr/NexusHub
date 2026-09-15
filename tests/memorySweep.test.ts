import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { performMemorySweep } from '../src/main/services/memorySweep'
import { nexusAPI } from '../src/renderer/src/lib/ipc'

describe('Memory Sweep & Background Lifecycle Tests (tests/memorySweep.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Main Process performMemorySweep() Service', () => {
    it('executes successfully when targetWindow is undefined/null', () => {
      const res = performMemorySweep(null)
      expect(res.success).toBe(true)
      expect(typeof res.freedMem).toBe('number')
      expect(res.freedMem).toBeGreaterThanOrEqual(0)
    })

    it('sends app:memory-sweep to webContents and clears session cache', async () => {
      const sendMock = vi.fn()
      const clearCacheMock = vi.fn().mockResolvedValue(undefined)

      const mockWindow: any = {
        isDestroyed: () => false,
        webContents: {
          isDestroyed: () => false,
          send: sendMock,
          session: {
            clearCache: clearCacheMock,
          },
        },
      }

      const res = performMemorySweep(mockWindow)
      expect(res.success).toBe(true)
      expect(sendMock).toHaveBeenCalledWith('app:memory-sweep')
      expect(clearCacheMock).toHaveBeenCalled()
    })

    it('safely handles destroyed window or destroyed webContents without throwing', () => {
      const mockDestroyedWindow: any = {
        isDestroyed: () => true,
        webContents: {
          isDestroyed: () => true,
          send: vi.fn(),
        },
      }

      const res = performMemorySweep(mockDestroyedWindow)
      expect(res.success).toBe(true)
      expect(mockDestroyedWindow.webContents.send).not.toHaveBeenCalled()
    })

    it('calls global.gc when exposed and handles potential gc exceptions gracefully', () => {
      const originalGc = (global as any).gc
      const mockGc = vi.fn()
      ;(global as any).gc = mockGc

      try {
        const res = performMemorySweep(null)
        expect(res.success).toBe(true)
        expect(mockGc).toHaveBeenCalled()
      } finally {
        ;(global as any).gc = originalGc
      }
    })

    it('handles unexpected errors gracefully and returns failure object', () => {
      const faultyWindow: any = {
        isDestroyed: () => {
          throw new Error('Fatal window inspection error')
        },
      }

      const res = performMemorySweep(faultyWindow)
      expect(res.success).toBe(false)
      expect(res.error).toBe('Fatal window inspection error')
    })
  })

  describe('2. Renderer IPC Bridge (nexusAPI Lifecycle Hooks)', () => {
    const originalWindow = (global as any).window

    beforeEach(() => {
      ;(global as any).window = {
        nexusAPI: {
          onVisibilityChange: vi.fn((cb) => {
            cb(true)
            return vi.fn()
          }),
          onMemorySweep: vi.fn((cb) => {
            cb()
            return vi.fn()
          }),
          memorySweep: vi.fn().mockResolvedValue({ success: true, freedMem: 1024 }),
        },
      }
    })

    afterEach(() => {
      ;(global as any).window = originalWindow
    })

    it('onVisibilityChange binds callback and returns unbind function', () => {
      const listener = vi.fn()
      const unbind = nexusAPI.onVisibilityChange(listener)
      expect(typeof unbind).toBe('function')
      expect(listener).toHaveBeenCalledWith(true)
    })

    it('onMemorySweep binds callback and returns unbind function', () => {
      const listener = vi.fn()
      const unbind = nexusAPI.onMemorySweep(listener)
      expect(typeof unbind).toBe('function')
      expect(listener).toHaveBeenCalled()
    })

    it('memorySweep triggers IPC invoke and resolves result', async () => {
      const res = await nexusAPI.memorySweep()
      expect(res.success).toBe(true)
      expect(res.freedMem).toBe(1024)
    })

    it('safely falls back when window.nexusAPI methods are undefined', async () => {
      ;(global as any).window = {}

      const unbindVis = nexusAPI.onVisibilityChange(vi.fn())
      expect(typeof unbindVis).toBe('function')

      const unbindSweep = nexusAPI.onMemorySweep(vi.fn())
      expect(typeof unbindSweep).toBe('function')

      const res = await nexusAPI.memorySweep()
      expect(res.success).toBe(true)
    })
  })
})
