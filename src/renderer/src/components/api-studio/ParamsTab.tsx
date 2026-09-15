/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * ParamsTab.tsx
 * Key-value query parameters editor with enabled toggles and auto-syncing.
 */

import React from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import { KeyValueItem } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface ParamsTabProps {
  params: KeyValueItem[]
  onChange: (params: KeyValueItem[]) => void
}

export const ParamsTab: React.FC<ParamsTabProps> = ({ params, onChange }) => {
  const { t } = useT()

  const handleAdd = () => {
    cyberAudio.click()
    const newItem: KeyValueItem = {
      id: 'param_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      key: '',
      value: '',
      enabled: true,
    }
    onChange([...params, newItem])
  }

  const handleUpdate = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = params.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val }
      }
      return item
    })
    onChange(updated)
  }

  const handleDelete = (id: string) => {
    cyberAudio.click()
    onChange(params.filter((p) => p.id !== id))
  }

  const handleClearAll = () => {
    cyberAudio.click()
    onChange([])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-nexus-muted pb-1 border-b border-nexus-accent/15">
        <span className="font-medium text-nexus-text">
          {t('apiStudio.params.title')} ({params.filter((p) => p.enabled && p.key.trim()).length} {t('apiStudio.active')})
        </span>
        <div className="flex items-center gap-2">
          {params.length > 0 && (
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
            onClick={handleAdd}
            className="flex items-center gap-1 text-nexus-cyan hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('apiStudio.addParam')}</span>
          </button>
        </div>
      </div>

      {params.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
          <p className="text-xs text-nexus-muted mb-2">{t('apiStudio.params.emptyDesc')}</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-accent/30 text-xs text-nexus-cyan hover:border-nexus-accent transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('apiStudio.addParam')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {params.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-1 px-2 rounded-lg bg-nexus-card/60 border border-nexus-accent/15 hover:border-nexus-accent/30 transition-all text-xs"
            >
              {/* Checkbox */}
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

              {/* Key Input */}
              <input
                type="text"
                value={item.key}
                onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                placeholder={t('apiStudio.keyPlaceholder')}
                className={`w-1/3 bg-transparent px-2 py-1 text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none ${
                  !item.enabled ? 'opacity-40 line-through' : ''
                }`}
              />

              <span className="text-nexus-muted/40 font-mono">=</span>

              {/* Value Input */}
              <input
                type="text"
                value={item.value}
                onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                placeholder={t('apiStudio.valuePlaceholder')}
                className={`flex-1 bg-transparent px-2 py-1 text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none ${
                  !item.enabled ? 'opacity-40 line-through' : ''
                }`}
              />

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1 text-nexus-muted hover:text-rose-400 rounded transition-colors"
                title={t('apiStudio.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
