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

/**
 * @file apiStudioHelpers.ts
 * @description State, storage, and presentation utilities for NexusHub API Studio.
 * Provides collection persistence, history trimming, and response formatting helpers.
 */

import { ParsedRequest } from './curlParser'

export interface ApiCollectionItem {
  id: string
  name: string
  folder?: string
  request: ParsedRequest
  createdAt: number
  updatedAt: number
}

export interface ApiHistoryItem {
  id: string
  method: string
  url: string
  status: number
  timeMs: number
  sizeBytes: number
  timestamp: number
  request: ParsedRequest
}

export type StatusVariant = 'success' | 'info' | 'warning' | 'error'

const COLLECTIONS_STORAGE_KEY = 'nexus_api_studio_collections'
const HISTORY_STORAGE_KEY = 'nexus_api_studio_history'
const DEFAULT_MAX_HISTORY = 50

/**
 * Formats a byte size into human-readable B, KB, MB, or GB.
 *
 * @param {number} bytes - Number of bytes.
 * @returns {string} Human-formatted size string.
 */
export function formatBytes(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const formatted = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)

  return `${formatted} ${units[i]}`
}

/**
 * Formats round-trip duration in milliseconds.
 *
 * @param {number} ms - Milliseconds.
 * @returns {string} Formatted duration (e.g. "45 ms", "1.25 s").
 */
export function formatTimeMs(ms: number): string {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) {
    return '0 ms'
  }

  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`
  }

  return `${Math.round(ms)} ms`
}

/**
 * Determines status badge style variant according to HTTP status code.
 *
 * @param {number} status - HTTP status code.
 * @returns {StatusVariant} Status variant category.
 */
export function getStatusBadgeVariant(status: number): StatusVariant {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'info'
  if (status >= 400 && status < 500) return 'warning'
  return 'error'
}

/**
 * Formats and validates a JSON string.
 *
 * @param {string} rawJson - Unformatted or formatted JSON.
 * @param {number} [indent=2] - Indentation spaces.
 * @returns {{ formatted: string; isValid: boolean; error?: string }} Formatted result or error.
 */
export function formatJsonPayload(
  rawJson: string,
  indent: number = 2
): { formatted: string; isValid: boolean; error?: string } {
  if (!rawJson || !rawJson.trim()) {
    return { formatted: '', isValid: true }
  }

  try {
    const parsed = JSON.parse(rawJson)
    return {
      formatted: JSON.stringify(parsed, null, indent),
      isValid: true,
    }
  } catch (err: any) {
    return {
      formatted: rawJson,
      isValid: false,
      error: err?.message || 'Invalid JSON format',
    }
  }
}

/**
 * Safely parses JSON from Storage or returns fallback.
 */
function getStoredJson<T>(key: string, fallback: T, storage?: Storage): T {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return fallback
    const raw = store.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Safely saves data to Storage.
 */
function setStoredJson<T>(key: string, value: T, storage?: Storage): void {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Storage quota or sandboxed environment fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Collections Storage Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves all saved collections items.
 *
 * @param {Storage} [storage] - Optional storage provider.
 * @returns {ApiCollectionItem[]} Array of saved items.
 */
export function getCollectionItems(storage?: Storage): ApiCollectionItem[] {
  return getStoredJson<ApiCollectionItem[]>(COLLECTIONS_STORAGE_KEY, [], storage)
}

/**
 * Saves or updates a collection item.
 *
 * @param {Omit<ApiCollectionItem, 'createdAt' | 'updatedAt'> & Partial<Pick<ApiCollectionItem, 'createdAt' | 'updatedAt'>>} item
 * @param {Storage} [storage]
 * @returns {ApiCollectionItem[]} Updated collection list.
 */
export function saveCollectionItem(
  item: Omit<ApiCollectionItem, 'createdAt' | 'updatedAt'> &
    Partial<Pick<ApiCollectionItem, 'createdAt' | 'updatedAt'>>,
  storage?: Storage
): ApiCollectionItem[] {
  const existing = getCollectionItems(storage)
  const now = Date.now()

  const index = existing.findIndex((e) => e.id === item.id)
  if (index >= 0) {
    existing[index] = {
      ...existing[index],
      ...item,
      updatedAt: now,
    }
  } else {
    existing.unshift({
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: now,
    })
  }

  setStoredJson(COLLECTIONS_STORAGE_KEY, existing, storage)
  return existing
}

/**
 * Deletes a collection item by ID.
 *
 * @param {string} id - Item identifier.
 * @param {Storage} [storage]
 * @returns {ApiCollectionItem[]} Updated collection list.
 */
export function deleteCollectionItem(id: string, storage?: Storage): ApiCollectionItem[] {
  const existing = getCollectionItems(storage)
  const filtered = existing.filter((item) => item.id !== id)
  setStoredJson(COLLECTIONS_STORAGE_KEY, filtered, storage)
  return filtered
}

/**
 * Exports all collections items to a JSON string.
 *
 * @param {ApiCollectionItem[]} [items] - Optional items to export.
 * @returns {string} Serialized JSON.
 */
export function exportCollections(items?: ApiCollectionItem[], storage?: Storage): string {
  const data = items || getCollectionItems(storage)
  return JSON.stringify({ version: '1.0.0', exportedAt: Date.now(), items: data }, null, 2)
}

/**
 * Imports collections items from a JSON string with deduplication.
 *
 * @param {string} jsonStr - Exported JSON string.
 * @param {Storage} [storage]
 * @returns {ApiCollectionItem[]} Updated collection list.
 */
export function importCollections(jsonStr: string, storage?: Storage): ApiCollectionItem[] {
  if (!jsonStr || !jsonStr.trim()) {
    throw new Error('Empty JSON string cannot be imported.')
  }

  const parsed = JSON.parse(jsonStr)
  const items: ApiCollectionItem[] = Array.isArray(parsed) ? parsed : parsed.items || []

  if (!Array.isArray(items)) {
    throw new Error('Invalid collections structure.')
  }

  const current = getCollectionItems(storage)
  const currentMap = new Map(current.map((item) => [item.id, item]))

  for (const item of items) {
    if (item && item.id && item.name && item.request) {
      currentMap.set(item.id, {
        ...item,
        updatedAt: Date.now(),
      })
    }
  }

  const merged = Array.from(currentMap.values())
  setStoredJson(COLLECTIONS_STORAGE_KEY, merged, storage)
  return merged
}

// ─────────────────────────────────────────────────────────────────────────────
// Request History Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves the request history list.
 *
 * @param {Storage} [storage]
 * @returns {ApiHistoryItem[]}
 */
export function getHistory(storage?: Storage): ApiHistoryItem[] {
  return getStoredJson<ApiHistoryItem[]>(HISTORY_STORAGE_KEY, [], storage)
}

/**
 * Adds an executed request to the history log, capping at maxEntries.
 *
 * @param {Omit<ApiHistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }} item
 * @param {number} [maxEntries=50]
 * @param {Storage} [storage]
 * @returns {ApiHistoryItem[]} Updated history list.
 */
export function addToHistory(
  item: Omit<ApiHistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  maxEntries: number = DEFAULT_MAX_HISTORY,
  storage?: Storage
): ApiHistoryItem[] {
  const current = getHistory(storage)
  const newItem: ApiHistoryItem = {
    id: item.id || `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    method: item.method,
    url: item.url,
    status: item.status,
    timeMs: item.timeMs,
    sizeBytes: item.sizeBytes,
    timestamp: item.timestamp || Date.now(),
    request: item.request,
  }

  current.unshift(newItem)
  const trimmed = current.slice(0, maxEntries)
  setStoredJson(HISTORY_STORAGE_KEY, trimmed, storage)
  return trimmed
}

/**
 * Clears the history log.
 *
 * @param {Storage} [storage]
 */
export function clearHistory(storage?: Storage): void {
  setStoredJson(HISTORY_STORAGE_KEY, [], storage)
}

/**
 * Filters history items by method, URL, or status code.
 *
 * @param {string} query - Search text.
 * @param {Storage} [storage]
 * @returns {ApiHistoryItem[]} Filtered results.
 */
export function filterHistory(query: string, storage?: Storage): ApiHistoryItem[] {
  const all = getHistory(storage)
  if (!query || !query.trim()) return all

  const cleanQuery = query.toLowerCase().trim()
  return all.filter((item) => {
    return (
      item.method.toLowerCase().includes(cleanQuery) ||
      item.url.toLowerCase().includes(cleanQuery) ||
      String(item.status).includes(cleanQuery)
    )
  })
}
