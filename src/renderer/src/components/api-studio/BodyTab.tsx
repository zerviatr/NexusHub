/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * BodyTab.tsx
 * Comprehensive payload editor: JSON (format & validation), form-data,
 * x-www-form-urlencoded, raw text, and GraphQL queries.
 */

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  Minimize2,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { BodyType, KeyValueItem, RawContentType } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface BodyTabProps {
  bodyType: BodyType
  onBodyTypeChange: (type: BodyType) => void
  bodyRaw: string
  onBodyRawChange: (val: string) => void
  rawContentType: RawContentType
  onRawContentTypeChange: (ct: RawContentType) => void
  formData: KeyValueItem[]
  onFormDataChange: (items: KeyValueItem[]) => void
  urlEncoded: KeyValueItem[]
  onUrlEncodedChange: (items: KeyValueItem[]) => void
  graphqlQuery: string
  onGraphqlQueryChange: (query: string) => void
  graphqlVariables: string
  onGraphqlVariablesChange: (vars: string) => void
}

export const BodyTab: React.FC<BodyTabProps> = ({
  bodyType,
  onBodyTypeChange,
  bodyRaw,
  onBodyRawChange,
  rawContentType,
  onRawContentTypeChange,
  formData,
  onFormDataChange,
  urlEncoded,
  onUrlEncodedChange,
  graphqlQuery,
  onGraphqlQueryChange,
  graphqlVariables,
  onGraphqlVariablesChange,
}) => {
  const { t } = useT()

  // JSON Validation memo
  const jsonStatus = useMemo(() => {
    if (!bodyRaw || !bodyRaw.trim()) return { isValid: true, empty: true, error: null }
    try {
      JSON.parse(bodyRaw)
      return { isValid: true, empty: false, error: null }
    } catch (err: any) {
      return { isValid: false, empty: false, error: err.message }
    }
  }, [bodyRaw])

  const handleBeautifyJson = () => {
    try {
      const parsed = JSON.parse(bodyRaw)
      onBodyRawChange(JSON.stringify(parsed, null, 2))
      cyberAudio.copySuccess()
    } catch {
      cyberAudio.error()
    }
  }

  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(bodyRaw)
      onBodyRawChange(JSON.stringify(parsed))
      cyberAudio.copySuccess()
    } catch {
      cyberAudio.error()
    }
  }

  // Generic key-value helpers for form-data & url-encoded
  const handleAddKv = (list: KeyValueItem[], setter: (items: KeyValueItem[]) => void) => {
    cyberAudio.click()
    setter([
      ...list,
      {
        id: 'kv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        key: '',
        value: '',
        enabled: true,
      },
    ])
  }

  const handleUpdateKv = (
    list: KeyValueItem[],
    setter: (items: KeyValueItem[]) => void,
    id: string,
    field: 'key' | 'value' | 'enabled',
    val: any
  ) => {
    setter(
      list.map((item) => {
        if (item.id === id) return { ...item, [field]: val }
        return item
      })
    )
  }

  const handleDeleteKv = (
    list: KeyValueItem[],
    setter: (items: KeyValueItem[]) => void,
    id: string
  ) => {
    cyberAudio.click()
    setter(list.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Body Type Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-nexus-accent/15">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {(
            [
              { id: 'none', labelKey: 'apiStudio.body.none' },
              { id: 'json', labelKey: 'apiStudio.body.json' },
              { id: 'form-data', labelKey: 'apiStudio.body.formData' },
              { id: 'x-www-form-urlencoded', labelKey: 'apiStudio.body.urlEncoded' },
              { id: 'raw', labelKey: 'apiStudio.body.raw' },
              { id: 'graphql', labelKey: 'apiStudio.body.graphql' },
            ] as Array<{ id: BodyType; labelKey: string }>
          ).map((type) => {
            const isActive = bodyType === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  cyberAudio.click()
                  onBodyTypeChange(type.id)
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/40 font-semibold'
                    : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/50'
                }`}
              >
                {t(type.labelKey)}
              </button>
            )
          })}
        </div>

        {/* Right action controls per body type */}
        {bodyType === 'json' && (
          <div className="flex items-center gap-2 text-xs">
            {!jsonStatus.empty && (
              <div className="flex items-center gap-1">
                {jsonStatus.isValid ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('apiStudio.body.validJson')}
                  </span>
                ) : (
                  <span
                    title={jsonStatus.error || undefined}
                    className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded cursor-help"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {t('apiStudio.body.invalidJson')}
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleBeautifyJson}
              disabled={!bodyRaw.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-nexus-card border border-nexus-accent/20 hover:border-nexus-cyan text-nexus-muted hover:text-white transition-colors disabled:opacity-40"
              title={t('apiStudio.body.beautify')}
            >
              <Sparkles className="w-3 h-3 text-nexus-cyan" />
              <span>{t('apiStudio.body.beautify')}</span>
            </button>
            <button
              type="button"
              onClick={handleMinifyJson}
              disabled={!bodyRaw.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-nexus-card border border-nexus-accent/20 hover:border-nexus-cyan text-nexus-muted hover:text-white transition-colors disabled:opacity-40"
              title={t('apiStudio.body.minify')}
            >
              <Minimize2 className="w-3 h-3" />
              <span>{t('apiStudio.body.minify')}</span>
            </button>
          </div>
        )}

        {bodyType === 'raw' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-nexus-muted">{t('apiStudio.body.contentType')}:</span>
            <select
              value={rawContentType}
              onChange={(e) => onRawContentTypeChange(e.target.value as RawContentType)}
              className="bg-nexus-card border border-nexus-accent/20 rounded px-2 py-1 text-nexus-text text-xs focus:outline-none focus:border-nexus-cyan"
            >
              <option value="text/plain">Text (text/plain)</option>
              <option value="application/json">JSON (application/json)</option>
              <option value="text/html">HTML (text/html)</option>
              <option value="application/xml">XML (application/xml)</option>
              <option value="application/javascript">JavaScript (application/javascript)</option>
            </select>
          </div>
        )}
      </div>

      {/* Body Views */}
      {bodyType === 'none' && (
        <div className="p-8 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
          <p className="text-xs text-nexus-muted">{t('apiStudio.body.noneMessage')}</p>
        </div>
      )}

      {(bodyType === 'json' || bodyType === 'raw') && (
        <div className="space-y-1">
          <textarea
            value={bodyRaw}
            onChange={(e) => onBodyRawChange(e.target.value)}
            placeholder={
              bodyType === 'json'
                ? '{\n  "key": "value",\n  "userId": 101\n}'
                : 'Raw request content...'
            }
            rows={10}
            className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan transition-colors resize-y leading-relaxed"
          />
        </div>
      )}

      {bodyType === 'form-data' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-nexus-muted pb-1">
            <span>{t('apiStudio.body.formDataDescription')}</span>
            <button
              type="button"
              onClick={() => handleAddKv(formData, onFormDataChange)}
              className="flex items-center gap-1 text-nexus-cyan hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('apiStudio.addEntry')}</span>
            </button>
          </div>

          {formData.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
              <p className="text-xs text-nexus-muted mb-2">{t('apiStudio.body.emptyFormData')}</p>
              <button
                type="button"
                onClick={() => handleAddKv(formData, onFormDataChange)}
                className="px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-accent/30 text-xs text-nexus-cyan"
              >
                + {t('apiStudio.addEntry')}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {formData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1 px-2 rounded-lg bg-nexus-card/60 border border-nexus-accent/15 text-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateKv(formData, onFormDataChange, item.id, 'enabled', !item.enabled)
                    }
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-nexus-cyan" />
                    ) : (
                      <Square className="w-4 h-4 text-nexus-muted" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={item.key}
                    onChange={(e) =>
                      handleUpdateKv(formData, onFormDataChange, item.id, 'key', e.target.value)
                    }
                    placeholder="field_name"
                    className="w-1/3 bg-transparent px-2 py-1 text-nexus-text font-mono focus:outline-none"
                  />
                  <span className="text-nexus-muted/40 font-mono">:</span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      handleUpdateKv(formData, onFormDataChange, item.id, 'value', e.target.value)
                    }
                    placeholder="field_value"
                    className="flex-1 bg-transparent px-2 py-1 text-nexus-text font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteKv(formData, onFormDataChange, item.id)}
                    className="p-1 text-nexus-muted hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bodyType === 'x-www-form-urlencoded' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-nexus-muted pb-1">
            <span>{t('apiStudio.body.urlEncodedDescription')}</span>
            <button
              type="button"
              onClick={() => handleAddKv(urlEncoded, onUrlEncodedChange)}
              className="flex items-center gap-1 text-nexus-cyan hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('apiStudio.addEntry')}</span>
            </button>
          </div>

          {urlEncoded.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
              <p className="text-xs text-nexus-muted mb-2">{t('apiStudio.body.emptyUrlEncoded')}</p>
              <button
                type="button"
                onClick={() => handleAddKv(urlEncoded, onUrlEncodedChange)}
                className="px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-accent/30 text-xs text-nexus-cyan"
              >
                + {t('apiStudio.addEntry')}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {urlEncoded.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1 px-2 rounded-lg bg-nexus-card/60 border border-nexus-accent/15 text-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateKv(urlEncoded, onUrlEncodedChange, item.id, 'enabled', !item.enabled)
                    }
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-nexus-cyan" />
                    ) : (
                      <Square className="w-4 h-4 text-nexus-muted" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={item.key}
                    onChange={(e) =>
                      handleUpdateKv(urlEncoded, onUrlEncodedChange, item.id, 'key', e.target.value)
                    }
                    placeholder="key"
                    className="w-1/3 bg-transparent px-2 py-1 text-nexus-text font-mono focus:outline-none"
                  />
                  <span className="text-nexus-muted/40 font-mono">=</span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      handleUpdateKv(urlEncoded, onUrlEncodedChange, item.id, 'value', e.target.value)
                    }
                    placeholder="value"
                    className="flex-1 bg-transparent px-2 py-1 text-nexus-text font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteKv(urlEncoded, onUrlEncodedChange, item.id)}
                    className="p-1 text-nexus-muted hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bodyType === 'graphql' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-nexus-text">
              {t('apiStudio.body.graphqlQuery')}
            </label>
            <textarea
              value={graphqlQuery}
              onChange={(e) => onGraphqlQueryChange(e.target.value)}
              placeholder="query GetUser($id: ID!) {\n  user(id: $id) {\n    name\n    email\n  }\n}"
              rows={9}
              className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan transition-colors resize-y leading-relaxed"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-nexus-text">
              {t('apiStudio.body.graphqlVariables')}
            </label>
            <textarea
              value={graphqlVariables}
              onChange={(e) => onGraphqlVariablesChange(e.target.value)}
              placeholder="{\n  &quot;id&quot;: &quot;123&quot;\n}"
              rows={9}
              className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan transition-colors resize-y leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  )
}
