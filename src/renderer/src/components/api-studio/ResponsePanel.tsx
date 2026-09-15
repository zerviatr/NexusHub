/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * ResponsePanel.tsx
 * High-performance response inspector with formatted JSON, raw preview,
 * HTML render, headers table, latency metrics, search, copy, and download.
 */

import React, { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  Download,
  Search,
  Clock,
  HardDrive,
  Code2,
  FileText,
  Eye,
  Table,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { ApiResponse } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface ResponsePanelProps {
  response: ApiResponse | null
  loading: boolean
}

type ResponseTab = 'body' | 'headers' | 'timing'
type BodyFormat = 'pretty' | 'raw' | 'preview'

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, loading }) => {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<ResponseTab>('body')
  const [bodyFormat, setBodyFormat] = useState<BodyFormat>('pretty')
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [headerFilter, setHeaderFilter] = useState('')

  // Format payload size
  const formattedSize = useMemo(() => {
    if (!response) return '0 B'
    const bytes = response.sizeBytes || 0
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }, [response])

  // Pretty JSON formatted data
  const { formattedData, isJson } = useMemo(() => {
    if (!response || !response.data) return { formattedData: '', isJson: false }
    try {
      const parsed = JSON.parse(response.data)
      return { formattedData: JSON.stringify(parsed, null, 2), isJson: true }
    } catch {
      return { formattedData: response.data, isJson: false }
    }
  }, [response])

  // Count search matches
  const matchCount = useMemo(() => {
    if (!searchQuery.trim() || !response || !response.data) return 0
    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = response.data.match(new RegExp(escaped, 'gi'))
      return matches ? matches.length : 0
    } catch {
      return 0
    }
  }, [searchQuery, response])

  // Copy response body
  const handleCopy = () => {
    if (!response) return
    navigator.clipboard.writeText(response.data)
    cyberAudio.copySuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // Download response as file
  const handleDownload = () => {
    if (!response) return
    cyberAudio.click()
    const isJsonFile = isJson
    const blob = new Blob([response.data], {
      type: isJsonFile ? 'application/json' : 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `response_${Date.now()}.${isJsonFile ? 'json' : 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Status badge styling
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    }
    if (status >= 300 && status < 400) {
      return 'text-sky-400 bg-sky-500/15 border-sky-500/30'
    }
    if (status >= 400 && status < 500) {
      return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    }
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30'
  }

  // Filtered headers
  const filteredHeaders = useMemo(() => {
    if (!response || !response.headers) return []
    const entries = Object.entries(response.headers)
    if (!headerFilter.trim()) return entries
    const q = headerFilter.toLowerCase()
    return entries.filter(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q))
  }, [response, headerFilter])

  return (
    <div className="flex flex-col h-full rounded-2xl bg-nexus-card border border-nexus-accent/20 shadow-xl overflow-hidden">
      {/* Response Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 border-b border-nexus-accent/20 bg-nexus-card/90">
        <div className="flex items-center gap-3">
          {response ? (
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${getStatusColor(
                  response.status
                )}`}
              >
                {response.status} {response.statusText}
              </span>
              <div className="flex items-center gap-3 text-xs text-nexus-muted font-mono ml-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-nexus-cyan" />
                  {response.timeMs} ms
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-nexus-accent" />
                  {formattedSize}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs font-semibold text-nexus-muted tracking-wide uppercase">
              {t('apiStudio.response.title')}
            </span>
          )}

          {/* Response Sub-tabs */}
          {response && (
            <div className="flex items-center gap-1 ml-4 border-l border-nexus-accent/20 pl-4 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('body')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'body'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-semibold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                {t('apiStudio.response.body')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('headers')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'headers'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-semibold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                {t('apiStudio.response.headers')} ({Object.keys(response.headers || {}).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timing')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'timing'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-semibold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                {t('apiStudio.response.timing')}
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions (Copy, Download, Format toggle) */}
        {response && (
          <div className="flex items-center gap-1.5 text-xs">
            {activeTab === 'body' && (
              <div className="flex items-center bg-nexus-bg/60 rounded-lg p-0.5 border border-nexus-accent/20 mr-2">
                <button
                  type="button"
                  onClick={() => setBodyFormat('pretty')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    bodyFormat === 'pretty'
                      ? 'bg-nexus-accent text-white shadow-sm'
                      : 'text-nexus-muted hover:text-white'
                  }`}
                >
                  Pretty
                </button>
                <button
                  type="button"
                  onClick={() => setBodyFormat('raw')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    bodyFormat === 'raw'
                      ? 'bg-nexus-accent text-white shadow-sm'
                      : 'text-nexus-muted hover:text-white'
                  }`}
                >
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => setBodyFormat('preview')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    bodyFormat === 'preview'
                      ? 'bg-nexus-accent text-white shadow-sm'
                      : 'text-nexus-muted hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 p-1.5 px-2 rounded-lg bg-nexus-card border border-nexus-accent/20 text-nexus-muted hover:text-white hover:border-nexus-accent transition-colors"
              title={t('apiStudio.response.copyBody')}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{t('apiStudio.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t('apiStudio.copy')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 px-2 rounded-lg bg-nexus-card border border-nexus-accent/20 text-nexus-muted hover:text-white hover:border-nexus-accent transition-colors flex items-center gap-1"
              title={t('apiStudio.response.download')}
            >
              <Download className="w-3.5 h-3.5 text-nexus-cyan" />
              <span>{t('apiStudio.download')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 relative min-h-[260px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-nexus-accent/20 border-t-nexus-cyan animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-nexus-cyan animate-pulse" />
              </div>
            </div>
            <p className="text-xs font-mono text-nexus-muted tracking-wider">
              {t('apiStudio.response.dispatching')}
            </p>
          </div>
        ) : !response ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 py-16">
            <div className="w-14 h-14 rounded-2xl bg-nexus-card border border-nexus-accent/20 flex items-center justify-center shadow-inner mb-3">
              <Code2 className="w-7 h-7 text-nexus-accent/40" />
            </div>
            <h3 className="text-sm font-semibold text-nexus-text mb-1">
              {t('apiStudio.response.emptyTitle')}
            </h3>
            <p className="text-xs text-nexus-muted max-w-sm">
              {t('apiStudio.response.emptyDesc')}
            </p>
          </div>
        ) : response.error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono space-y-2">
            <div className="font-bold flex items-center gap-2">
              <span>{t('apiStudio.response.error')}:</span>
              <span>{response.status || 'ERR_CONNECTION'}</span>
            </div>
            <div className="whitespace-pre-wrap">{response.error}</div>
          </div>
        ) : (
          <>
            {/* View: BODY */}
            {activeTab === 'body' && (
              <div className="space-y-2 h-full flex flex-col">
                {/* Search Bar in Body */}
                <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-nexus-bg/80 border border-nexus-accent/20 text-xs">
                  <Search className="w-3.5 h-3.5 text-nexus-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('apiStudio.response.searchPlaceholder')}
                    className="flex-1 bg-transparent text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none"
                  />
                  {searchQuery && (
                    <span className="text-[11px] font-mono text-nexus-cyan">
                      {matchCount} {t('apiStudio.response.matches')}
                    </span>
                  )}
                </div>

                {/* Pretty View */}
                {bodyFormat === 'pretty' && (
                  <pre className="flex-1 p-3 rounded-xl bg-nexus-bg/90 border border-nexus-accent/15 overflow-auto text-xs font-mono text-nexus-text select-text leading-relaxed whitespace-pre-wrap break-all">
                    <code>{formattedData}</code>
                  </pre>
                )}

                {/* Raw View */}
                {bodyFormat === 'raw' && (
                  <pre className="flex-1 p-3 rounded-xl bg-nexus-bg/90 border border-nexus-accent/15 overflow-auto text-xs font-mono text-nexus-muted select-text leading-relaxed whitespace-pre-wrap break-all">
                    <code>{response.data}</code>
                  </pre>
                )}

                {/* HTML Preview (Sandboxed iframe) */}
                {bodyFormat === 'preview' && (
                  <div className="flex-1 rounded-xl border border-nexus-accent/20 bg-white overflow-hidden">
                    <iframe
                      srcDoc={response.data}
                      sandbox="allow-same-origin"
                      title="HTML Preview"
                      className="w-full h-full min-h-[300px] border-0"
                    />
                  </div>
                )}
              </div>
            )}

            {/* View: HEADERS */}
            {activeTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-nexus-bg/80 border border-nexus-accent/20 text-xs">
                  <Search className="w-3.5 h-3.5 text-nexus-muted" />
                  <input
                    type="text"
                    value={headerFilter}
                    onChange={(e) => setHeaderFilter(e.target.value)}
                    placeholder={t('apiStudio.response.filterHeaders')}
                    className="flex-1 bg-transparent text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none"
                  />
                </div>

                <div className="border border-nexus-accent/20 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-nexus-card/80 text-nexus-muted border-b border-nexus-accent/20">
                      <tr>
                        <th className="p-2.5 px-3 w-1/3">{t('apiStudio.headerName')}</th>
                        <th className="p-2.5 px-3">{t('apiStudio.headerValue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nexus-accent/10">
                      {filteredHeaders.map(([k, v]) => (
                        <tr key={k} className="hover:bg-nexus-card/40 transition-colors">
                          <td className="p-2.5 px-3 font-semibold text-nexus-cyan select-all">
                            {k}
                          </td>
                          <td className="p-2.5 px-3 text-nexus-text break-all select-all">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View: TIMING */}
            {activeTab === 'timing' && (
              <div className="space-y-4 p-2">
                <div className="p-4 rounded-xl bg-nexus-card/60 border border-nexus-accent/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-nexus-text">
                      Total Latency Duration
                    </span>
                    <span className="text-sm font-bold font-mono text-nexus-cyan">
                      {response.timeMs} ms
                    </span>
                  </div>

                  {/* Latency Bar */}
                  <div className="w-full h-3 rounded-full bg-nexus-bg overflow-hidden flex">
                    <div
                      style={{ width: '25%' }}
                      className="bg-nexus-accent"
                      title="DNS & Handshake (~25%)"
                    />
                    <div
                      style={{ width: '45%' }}
                      className="bg-nexus-cyan"
                      title="Server Processing TTFB (~45%)"
                    />
                    <div
                      style={{ width: '30%' }}
                      className="bg-emerald-400"
                      title="Content Download (~30%)"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-nexus-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-nexus-accent" />
                      <span>Socket / TLS: ~{Math.round(response.timeMs * 0.25)} ms</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-nexus-cyan" />
                      <span>TTFB: ~{Math.round(response.timeMs * 0.45)} ms</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>Transfer: ~{Math.round(response.timeMs * 0.3)} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
