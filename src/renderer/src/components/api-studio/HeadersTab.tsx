/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * HeadersTab.tsx
 * Key-value HTTP header editor with autocomplete suggestions and standard presets.
 */

import React, { useState } from 'react'
import { Plus, Trash2, CheckSquare, Square, Sparkles } from 'lucide-react'
import { KeyValueItem } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface HeadersTabProps {
  headers: KeyValueItem[]
  onChange: (headers: KeyValueItem[]) => void
}

const COMMON_HEADER_SUGGESTIONS = [
  'Accept',
  'Authorization',
  'Content-Type',
  'User-Agent',
  'Cache-Control',
  'X-API-Key',
  'Origin',
  'Referer',
  'Accept-Encoding',
  'Accept-Language',
  'X-Requested-With',
  'If-None-Match',
]

const COMMON_VALUE_SUGGESTIONS: Record<string, string[]> = {
  'content-type': [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'application/xml',
  ],
  accept: ['application/json', '*/*', 'text/html', 'application/xml'],
  'cache-control': ['no-cache', 'no-store', 'max-age=0', 'must-revalidate'],
}

export const HeadersTab: React.FC<HeadersTabProps> = ({ headers, onChange }) => {
  const { t } = useT()
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null)

  const handleAdd = (key = '', value = '') => {
    cyberAudio.click()
    const newItem: KeyValueItem = {
      id: 'header_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      key,
      value,
      enabled: true,
    }
    onChange([...headers, newItem])
  }

  const handleUpdate = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = headers.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val }
      }
      return item
    })
    onChange(updated)
  }

  const handleDelete = (id: string) => {
    cyberAudio.click()
    onChange(headers.filter((h) => h.id !== id))
  }

  const handleClearAll = () => {
    cyberAudio.click()
    onChange([])
  }

  const applyPreset = (preset: 'json' | 'form' | 'noCache') => {
    cyberAudio.click()
    const cloned = [...headers]
    if (preset === 'json') {
      const hasContentType = cloned.find((h) => h.key.toLowerCase() === 'content-type')
      if (hasContentType) {
        hasContentType.value = 'application/json'
        hasContentType.enabled = true
      } else {
        cloned.push({
          id: 'hdr_' + Date.now(),
          key: 'Content-Type',
          value: 'application/json',
          enabled: true,
        })
      }
      const hasAccept = cloned.find((h) => h.key.toLowerCase() === 'accept')
      if (hasAccept) {
        hasAccept.value = 'application/json'
        hasAccept.enabled = true
      } else {
        cloned.push({
          id: 'hdr_' + (Date.now() + 1),
          key: 'Accept',
          value: 'application/json',
          enabled: true,
        })
      }
    } else if (preset === 'form') {
      const hasContentType = cloned.find((h) => h.key.toLowerCase() === 'content-type')
      if (hasContentType) {
        hasContentType.value = 'application/x-www-form-urlencoded'
        hasContentType.enabled = true
      } else {
        cloned.push({
          id: 'hdr_' + Date.now(),
          key: 'Content-Type',
          value: 'application/x-www-form-urlencoded',
          enabled: true,
        })
      }
    } else if (preset === 'noCache') {
      const hasCache = cloned.find((h) => h.key.toLowerCase() === 'cache-control')
      if (hasCache) {
        hasCache.value = 'no-cache'
        hasCache.enabled = true
      } else {
        cloned.push({
          id: 'hdr_' + Date.now(),
          key: 'Cache-Control',
          value: 'no-cache',
          enabled: true,
        })
      }
    }
    onChange(cloned)
  }

  return (
    <div className="space-y-3">
      {/* Header Presets & Utility row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-nexus-accent/15">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-nexus-text">
            {t('apiStudio.headers.title')} ({headers.filter((h) => h.enabled && h.key.trim()).length}{' '}
            {t('apiStudio.active')})
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => applyPreset('json')}
              className="px-2 py-0.5 rounded bg-nexus-card border border-nexus-accent/20 hover:border-nexus-cyan text-[11px] text-nexus-cyan transition-colors"
            >
              + JSON
            </button>
            <button
              type="button"
              onClick={() => applyPreset('form')}
              className="px-2 py-0.5 rounded bg-nexus-card border border-nexus-accent/20 hover:border-nexus-cyan text-[11px] text-nexus-muted hover:text-white transition-colors"
            >
              + Form
            </button>
            <button
              type="button"
              onClick={() => applyPreset('noCache')}
              className="px-2 py-0.5 rounded bg-nexus-card border border-nexus-accent/20 hover:border-nexus-cyan text-[11px] text-nexus-muted hover:text-white transition-colors"
            >
              + No-Cache
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="hover:text-rose-400 transition-colors text-xs"
            >
              {t('apiStudio.clearAll')}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAdd()}
            className="flex items-center gap-1 text-nexus-cyan hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('apiStudio.addHeader')}</span>
          </button>
        </div>
      </div>

      {/* Datalist for Header Autocomplete */}
      <datalist id="common-headers-list">
        {COMMON_HEADER_SUGGESTIONS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>

      {headers.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
          <p className="text-xs text-nexus-muted mb-2">{t('apiStudio.headers.emptyDesc')}</p>
          <button
            type="button"
            onClick={() => handleAdd()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-accent/30 text-xs text-nexus-cyan hover:border-nexus-accent transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('apiStudio.addHeader')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {headers.map((item) => {
            const valSuggestions = COMMON_VALUE_SUGGESTIONS[item.key.toLowerCase()] || []
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 p-1 px-2 rounded-lg bg-nexus-card/60 border border-nexus-accent/15 hover:border-nexus-accent/30 transition-all text-xs"
              >
                {/* Enabled Toggle */}
                <button
                  type="button"
                  onClick={() => handleUpdate(item.id, 'enabled', !item.enabled)}
                  className="text-nexus-muted hover:text-nexus-cyan transition-colors"
                  title={item.enabled ? t('apiStudio.disable') : t('apiStudio.enable')}
                >
                  {item.enabled ? (
                    <CheckSquare className="w-4 h-4 text-nexus-cyan" />
                  ) : (
                    <Square className="w-4 h-4 text-nexus-muted" />
                  )}
                </button>

                {/* Key with Autocomplete */}
                <input
                  type="text"
                  list="common-headers-list"
                  value={item.key}
                  onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                  placeholder={t('apiStudio.headerKeyPlaceholder')}
                  className={`w-1/3 bg-transparent px-2 py-1 text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none ${
                    !item.enabled ? 'opacity-40 line-through' : ''
                  }`}
                />

                <span className="text-nexus-muted/40 font-mono">:</span>

                {/* Value Input with conditional datalist */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    list={valSuggestions.length > 0 ? `val-list-${item.id}` : undefined}
                    value={item.value}
                    onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                    placeholder={t('apiStudio.valuePlaceholder')}
                    className={`w-full bg-transparent px-2 py-1 text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none ${
                      !item.enabled ? 'opacity-40 line-through' : ''
                    }`}
                  />
                  {valSuggestions.length > 0 && (
                    <datalist id={`val-list-${item.id}`}>
                      {valSuggestions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-nexus-muted hover:text-rose-400 rounded transition-colors"
                  title={t('apiStudio.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
