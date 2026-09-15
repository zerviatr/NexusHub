/*
 Copyright 2025 Lee Boonstra

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logActivity, LogActivityInput } from '../src/renderer/src/lib/activityLogger'

describe('Activity Logger Client Helper (tests/activityLogger.test.ts)', () => {
  const originalWindow = (globalThis as any).window

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Successful Logging with mock window.nexusAPI.journal
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Successful Logging via window.nexusAPI.journal.record', () => {
    it('calls journal.record with sanitized payload and returns recorded entry', async () => {
      const mockRecord = vi.fn().mockImplementation(async (payload) => ({
        id: 'mock-entry-1',
        sequence: 1,
        timestamp: Date.now(),
        ...payload,
        hash: 'mock-hash-1',
        prevHash: '0'.repeat(64),
      }))

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      const input: LogActivityInput = {
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'success',
        details: 'Dispatched GET /api/v1/users successfully',
        metadata: {
          endpoint: '/api/v1/users',
          timeMs: 34,
          statusCode: 200,
        },
        durationMs: 34,
      }

      const result = await logActivity(input)

      expect(mockRecord).toHaveBeenCalledTimes(1)
      const recordedPayload = mockRecord.mock.calls[0][0]

      expect(recordedPayload.toolId).toBe('api-studio')
      expect(recordedPayload.action).toBe('dispatch_request')
      expect(recordedPayload.category).toBe('api')
      expect(recordedPayload.status).toBe('success')
      expect(recordedPayload.details).toBe('Dispatched GET /api/v1/users successfully')
      expect(recordedPayload.metadata).toEqual({
        endpoint: '/api/v1/users',
        timeMs: 34,
        statusCode: 200,
      })
      expect(recordedPayload.durationMs).toBe(34)

      expect(result).not.toBeNull()
      expect(result.id).toBe('mock-entry-1')
    })

    it('defaults status to "success" when status is omitted', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ id: 'entry-default-status' })

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      await logActivity({
        toolId: 'hash-studio',
        action: 'file_hash',
        category: 'crypto',
        details: 'Generated SHA-256 checksum',
      })

      expect(mockRecord).toHaveBeenCalledTimes(1)
      expect(mockRecord.mock.calls[0][0].status).toBe('success')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Client-Side Pre-Sanitization
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Client-Side Pre-Sanitization', () => {
    it('pre-sanitizes API keys and tokens in details string before sending to IPC', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ id: 'entry-sanitized' })

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      const rawDetails = 'Calling OpenAI endpoint with key sk-proj-123456789012345678901234567890 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.abc'
      await logActivity({
        toolId: 'api-studio',
        action: 'test_ai_model',
        category: 'api',
        details: rawDetails,
      })

      expect(mockRecord).toHaveBeenCalledTimes(1)
      const payload = mockRecord.mock.calls[0][0]

      expect(payload.details).not.toContain('sk-proj-123456789012345678901234567890')
      expect(payload.details).toContain('[REDACTED_API_KEY]')
      expect(payload.details).toContain('Bearer [REDACTED_TOKEN]')
    })

    it('pre-sanitizes sensitive metadata properties (password, token, secret) on client side', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ id: 'entry-sanitized-meta' })

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      await logActivity({
        toolId: 'cyber-fortress',
        action: 'encrypt_vault',
        category: 'security',
        details: 'Encrypted sensitive document',
        metadata: {
          fileName: 'confidential.docx',
          password: 'TopSecretPassword999!',
          apiKey: 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q',
          secret: 'super-vault-secret',
          safeParam: 'public-data',
        },
      })

      expect(mockRecord).toHaveBeenCalledTimes(1)
      const payload = mockRecord.mock.calls[0][0]

      expect(payload.metadata.password).toBe('[REDACTED_SECRET]')
      expect(payload.metadata.apiKey).toBe('[REDACTED_SECRET]')
      expect(payload.metadata.secret).toBe('[REDACTED_SECRET]')
      expect(payload.metadata.safeParam).toBe('public-data')
      expect(payload.metadata.fileName).toBe('confidential.docx')
    })

    it('redacts credit card numbers in metadata with Luhn Mod-10 check', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ id: 'entry-sanitized-cc' })

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      await logActivity({
        toolId: 'api-studio',
        action: 'payment_checkout',
        category: 'api',
        details: 'Processed card 4000-0012-3456-7899 and device # 1234567890123456',
      })

      expect(mockRecord).toHaveBeenCalledTimes(1)
      const payload = mockRecord.mock.calls[0][0]

      expect(payload.details).not.toContain('4000-0012-3456-7899')
      expect(payload.details).toContain('[REDACTED_CREDIT_CARD]')
      // Harmless non-card 16-digit id preserved
      expect(payload.details).toContain('1234567890123456')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Non-Throwing Guarantee
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Non-Throwing Guarantee', () => {
    it('returns null and does not throw when window.nexusAPI is undefined', async () => {
      ;(globalThis as any).window = {}

      const result = await logActivity({
        toolId: 'system-optimizer',
        action: 'flush_dns',
        category: 'system',
        details: 'Flushed system DNS cache',
      })

      expect(result).toBeNull()
    })

    it('returns null and does not throw when window.nexusAPI.journal is undefined', async () => {
      ;(globalThis as any).window = {
        nexusAPI: {},
      }

      const result = await logActivity({
        toolId: 'port-killer',
        action: 'kill_process',
        category: 'system',
        details: 'Killed process on port 3000',
      })

      expect(result).toBeNull()
    })

    it('returns null and does not throw when window itself is undefined', async () => {
      ;(globalThis as any).window = undefined

      const result = await logActivity({
        toolId: 'pdf-studio',
        action: 'merge_pdf',
        category: 'file',
        details: 'Merged 3 PDF files',
      })

      expect(result).toBeNull()
    })

    it('returns null and does not throw when journal.record throws an error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: vi.fn().mockRejectedValue(new Error('IPC Bridge disconnected unexpectedly')),
          },
        },
      }

      const result = await logActivity({
        toolId: 'image-toolkit',
        action: 'batch_convert',
        category: 'file',
        details: 'Converted 10 PNGs to WebP',
      })

      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('handles circular references in metadata safely without throwing', async () => {
      const mockRecord = vi.fn().mockResolvedValue({ id: 'circ-recorded' })

      ;(globalThis as any).window = {
        nexusAPI: {
          journal: {
            record: mockRecord,
          },
        },
      }

      const circularObj: any = { name: 'circular-meta' }
      circularObj.self = circularObj

      const result = await logActivity({
        toolId: 'bulk-organizer',
        action: 'organize_batch',
        category: 'file',
        details: 'Organized batch files',
        metadata: circularObj,
      })

      expect(result).not.toBeNull()
      expect(mockRecord).toHaveBeenCalled()
      expect(mockRecord.mock.calls[0][0].metadata.self).toBe('[CIRCULAR]')
    })
  })
})
