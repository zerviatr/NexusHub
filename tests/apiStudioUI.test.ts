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

import { describe, it, expect, beforeEach } from 'vitest'
import {
  formatBytes,
  formatTimeMs,
  getStatusBadgeVariant,
  formatJsonPayload,
  saveCollectionItem,
  getCollectionItems,
  deleteCollectionItem,
  exportCollections,
  importCollections,
  addToHistory,
  getHistory,
  clearHistory,
  filterHistory,
  ApiCollectionItem,
} from '../src/renderer/src/utils/apiStudioHelpers'

// In-Memory Storage Mock simulating Web Storage API (localStorage)
class MockStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

describe('API Studio — UI, Collections & Presentation Helpers (tests/apiStudioUI.test.ts)', () => {
  let mockStorage: MockStorage

  beforeEach(() => {
    mockStorage = new MockStorage()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Response Formatting Utilities
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Response Formatting Utilities', () => {
    it('formats bytes into readable human scales (B, KB, MB, GB)', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(-50)).toBe('0 B')
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1024)).toBe('1.00 KB')
      expect(formatBytes(1536)).toBe('1.50 KB')
      expect(formatBytes(1048576)).toBe('1.00 MB')
      expect(formatBytes(2621440)).toBe('2.50 MB')
      expect(formatBytes(1073741824)).toBe('1.00 GB')
    })

    it('formats durations in ms and seconds', () => {
      expect(formatTimeMs(0)).toBe('0 ms')
      expect(formatTimeMs(-10)).toBe('0 ms')
      expect(formatTimeMs(45)).toBe('45 ms')
      expect(formatTimeMs(999)).toBe('999 ms')
      expect(formatTimeMs(1000)).toBe('1.00 s')
      expect(formatTimeMs(2540)).toBe('2.54 s')
    })

    it('determines status badge variant according to HTTP status code ranges', () => {
      // 2xx -> success
      expect(getStatusBadgeVariant(200)).toBe('success')
      expect(getStatusBadgeVariant(201)).toBe('success')
      expect(getStatusBadgeVariant(204)).toBe('success')

      // 3xx -> info
      expect(getStatusBadgeVariant(301)).toBe('info')
      expect(getStatusBadgeVariant(304)).toBe('info')

      // 4xx -> warning
      expect(getStatusBadgeVariant(400)).toBe('warning')
      expect(getStatusBadgeVariant(401)).toBe('warning')
      expect(getStatusBadgeVariant(404)).toBe('warning')
      expect(getStatusBadgeVariant(429)).toBe('warning')

      // 5xx / 0 -> error
      expect(getStatusBadgeVariant(500)).toBe('error')
      expect(getStatusBadgeVariant(502)).toBe('error')
      expect(getStatusBadgeVariant(504)).toBe('error')
      expect(getStatusBadgeVariant(0)).toBe('error')
    })

    it('formats and indents valid JSON payloads with syntax validation', () => {
      const minified = '{"name":"NexusHub","version":"2.4.1","tags":["electron","react"]}'
      const res = formatJsonPayload(minified, 2)

      expect(res.isValid).toBe(true)
      expect(res.formatted).toBe(JSON.stringify(JSON.parse(minified), null, 2))
      expect(res.error).toBeUndefined()
    })

    it('detects invalid JSON payloads and returns original text with error detail', () => {
      const invalidJson = '{"key": "value", trailingComma: }'
      const res = formatJsonPayload(invalidJson)

      expect(res.isValid).toBe(false)
      expect(res.formatted).toBe(invalidJson)
      expect(res.error).toBeDefined()
    })

    it('handles empty payload gracefully in formatJsonPayload', () => {
      expect(formatJsonPayload('')).toEqual({ formatted: '', isValid: true })
      expect(formatJsonPayload('   ')).toEqual({ formatted: '', isValid: true })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Collections Storage Management
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Collections Storage Management', () => {
    it('saves new collection item to storage and retrieves it', () => {
      const item: ApiCollectionItem = {
        id: 'req_001',
        name: 'Get User Profile',
        folder: 'Users',
        request: {
          url: 'https://api.example.com/me',
          method: 'GET',
          headers: { Authorization: 'Bearer token-123' },
        },
        createdAt: 1000,
        updatedAt: 1000,
      }

      saveCollectionItem(item, mockStorage)
      const list = getCollectionItems(mockStorage)

      expect(list.length).toBe(1)
      expect(list[0].id).toBe('req_001')
      expect(list[0].name).toBe('Get User Profile')
      expect(list[0].request.url).toBe('https://api.example.com/me')
    })

    it('updates an existing collection item in place', () => {
      const item: ApiCollectionItem = {
        id: 'req_002',
        name: 'Create Order',
        request: {
          url: 'https://api.example.com/orders',
          method: 'POST',
          headers: {},
        },
        createdAt: 1000,
        updatedAt: 1000,
      }

      saveCollectionItem(item, mockStorage)

      // Update name and add header
      saveCollectionItem(
        {
          id: 'req_002',
          name: 'Create Order (Updated)',
          request: {
            url: 'https://api.example.com/orders',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"qty": 5}',
          },
        },
        mockStorage
      )

      const updatedList = getCollectionItems(mockStorage)
      expect(updatedList.length).toBe(1)
      expect(updatedList[0].name).toBe('Create Order (Updated)')
      expect(updatedList[0].request.body).toBe('{"qty": 5}')
      expect(updatedList[0].updatedAt).toBeGreaterThanOrEqual(1000)
    })

    it('deletes a collection item by ID', () => {
      saveCollectionItem({ id: 'item_1', name: 'Item 1', request: { url: 'https://1', method: 'GET', headers: {} } }, mockStorage)
      saveCollectionItem({ id: 'item_2', name: 'Item 2', request: { url: 'https://2', method: 'GET', headers: {} } }, mockStorage)

      expect(getCollectionItems(mockStorage).length).toBe(2)

      deleteCollectionItem('item_1', mockStorage)

      const remaining = getCollectionItems(mockStorage)
      expect(remaining.length).toBe(1)
      expect(remaining[0].id).toBe('item_2')
    })

    it('exports collections to valid JSON string', () => {
      saveCollectionItem({ id: 'item_exp', name: 'Export Test', request: { url: 'https://exp.io', method: 'GET', headers: {} } }, mockStorage)

      const exportedJson = exportCollections(undefined, mockStorage)
      const parsed = JSON.parse(exportedJson)

      expect(parsed.version).toBe('1.0.0')
      expect(Array.isArray(parsed.items)).toBe(true)
      expect(parsed.items.length).toBe(1)
      expect(parsed.items[0].id).toBe('item_exp')
    })

    it('imports collections and deduplicates by item ID', () => {
      saveCollectionItem({ id: 'item_existing', name: 'Original Name', request: { url: 'https://orig', method: 'GET', headers: {} } }, mockStorage)

      const importPayload = JSON.stringify({
        version: '1.0.0',
        items: [
          { id: 'item_existing', name: 'Overridden Name', request: { url: 'https://orig-updated', method: 'GET', headers: {} } },
          { id: 'item_new', name: 'New Item', request: { url: 'https://new', method: 'POST', headers: {} } },
        ],
      })

      const imported = importCollections(importPayload, mockStorage)

      expect(imported.length).toBe(2)
      const existing = imported.find((i) => i.id === 'item_existing')
      const newItem = imported.find((i) => i.id === 'item_new')

      expect(existing?.name).toBe('Overridden Name')
      expect(existing?.request.url).toBe('https://orig-updated')
      expect(newItem?.name).toBe('New Item')
    })

    it('throws error when importing empty or malformed JSON', () => {
      expect(() => importCollections('', mockStorage)).toThrow('Empty JSON string')
      expect(() => importCollections('invalid json', mockStorage)).toThrow()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Request History Management
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Request History Management', () => {
    it('adds executed requests to history with timestamp and ID', () => {
      addToHistory(
        {
          method: 'GET',
          url: 'https://api.example.com/status',
          status: 200,
          timeMs: 42,
          sizeBytes: 128,
          request: { url: 'https://api.example.com/status', method: 'GET', headers: {} },
        },
        50,
        mockStorage
      )

      const history = getHistory(mockStorage)
      expect(history.length).toBe(1)
      expect(history[0].url).toBe('https://api.example.com/status')
      expect(history[0].status).toBe(200)
      expect(history[0].id).toBeDefined()
      expect(history[0].timestamp).toBeGreaterThan(0)
    })

    it('caps history size at specified maxEntries boundary', () => {
      const maxCap = 5

      for (let i = 1; i <= 10; i++) {
        addToHistory(
          {
            method: 'GET',
            url: `https://api.example.com/item/${i}`,
            status: 200,
            timeMs: i * 10,
            sizeBytes: 100,
            request: { url: `https://api.example.com/item/${i}`, method: 'GET', headers: {} },
          },
          maxCap,
          mockStorage
        )
      }

      const history = getHistory(mockStorage)
      expect(history.length).toBe(maxCap)
      // Most recent item should be item 10 at top of list
      expect(history[0].url).toBe('https://api.example.com/item/10')
      expect(history[maxCap - 1].url).toBe('https://api.example.com/item/6')
    })

    it('clears all history entries', () => {
      addToHistory(
        {
          method: 'DELETE',
          url: 'https://api.example.com/item/1',
          status: 204,
          timeMs: 15,
          sizeBytes: 0,
          request: { url: 'https://api.example.com/item/1', method: 'DELETE', headers: {} },
        },
        50,
        mockStorage
      )

      expect(getHistory(mockStorage).length).toBe(1)
      clearHistory(mockStorage)
      expect(getHistory(mockStorage).length).toBe(0)
    })

    it('filters history by search query across method, url, or status code', () => {
      addToHistory({ method: 'GET', url: 'https://api.example.com/users', status: 200, timeMs: 50, sizeBytes: 500, request: { url: '', method: 'GET', headers: {} } }, 50, mockStorage)
      addToHistory({ method: 'POST', url: 'https://api.example.com/users', status: 201, timeMs: 80, sizeBytes: 200, request: { url: '', method: 'POST', headers: {} } }, 50, mockStorage)
      addToHistory({ method: 'DELETE', url: 'https://api.example.com/items/99', status: 404, timeMs: 30, sizeBytes: 50, request: { url: '', method: 'DELETE', headers: {} } }, 50, mockStorage)

      expect(filterHistory('POST', mockStorage).length).toBe(1)
      expect(filterHistory('users', mockStorage).length).toBe(2)
      expect(filterHistory('404', mockStorage).length).toBe(1)
      expect(filterHistory('nonexistent', mockStorage).length).toBe(0)
      expect(filterHistory('', mockStorage).length).toBe(3)
    })
  })
})
