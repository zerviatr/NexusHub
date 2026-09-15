/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * CollectionsSidebar.tsx
 * Persistent Collections & Recent Request History with one-click reload.
 */

import React, { useState } from 'react'
import {
  Bookmark,
  History,
  Folder,
  Trash2,
  Clock,
  ChevronRight,
  Plus,
  Search,
  ExternalLink,
  ChevronLeft,
  X,
  Layers,
} from 'lucide-react'
import { SavedRequest, ApiHistoryItem, HttpMethod } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface CollectionsSidebarProps {
  isOpen: boolean
  onToggle: () => void
  savedRequests: SavedRequest[]
  history: ApiHistoryItem[]
  onLoadSavedRequest: (req: SavedRequest) => void
  onLoadHistoryItem: (item: ApiHistoryItem) => void
  onDeleteSavedRequest: (id: string) => void
  onClearHistory: () => void
}

const METHOD_BADGES: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-amber-400 bg-amber-500/10',
  PUT: 'text-sky-400 bg-sky-500/10',
  PATCH: 'text-purple-400 bg-purple-500/10',
  DELETE: 'text-rose-400 bg-rose-500/10',
  HEAD: 'text-cyan-400 bg-cyan-500/10',
  OPTIONS: 'text-zinc-300 bg-zinc-700/20',
}

export const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
  isOpen,
  onToggle,
  savedRequests,
  history,
  onLoadSavedRequest,
  onLoadHistoryItem,
  onDeleteSavedRequest,
  onClearHistory,
}) => {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections')
  const [search, setSearch] = useState('')

  // Format relative timestamp
  const formatTimeAgo = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000)
    if (sec < 60) return 'Just now'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Filter saved requests
  const filteredSaved = savedRequests.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.url.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    )
  })

  // Filter history
  const filteredHistory = history.filter((h) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return h.url.toLowerCase().includes(q) || h.method.toLowerCase().includes(q)
  })

  if (!isOpen) return null

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full bg-nexus-card border-r border-nexus-accent/20 overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-nexus-accent/20 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-nexus-bg/70 p-1 rounded-lg text-xs w-full mr-2">
          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            className={`flex-1 py-1 px-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'collections'
                ? 'bg-nexus-accent/25 text-nexus-cyan font-bold'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('apiStudio.sidebar.collections')} ({savedRequests.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1 px-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'bg-nexus-accent/25 text-nexus-cyan font-bold'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('apiStudio.sidebar.history')} ({history.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-bg transition-colors"
          title="Close Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-nexus-accent/15">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-nexus-bg/60 border border-nexus-accent/20 text-xs">
          <Search className="w-3.5 h-3.5 text-nexus-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'collections'
                ? t('apiStudio.sidebar.searchSaved')
                : t('apiStudio.sidebar.searchHistory')
            }
            className="w-full bg-transparent text-nexus-text placeholder:text-nexus-muted/40 focus:outline-none font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-nexus-muted hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {activeTab === 'collections' ? (
          filteredSaved.length === 0 ? (
            <div className="p-6 text-center text-xs text-nexus-muted">
              <Bookmark className="w-8 h-8 text-nexus-accent/30 mx-auto mb-2" />
              <p>{t('apiStudio.sidebar.noSaved')}</p>
            </div>
          ) : (
            filteredSaved.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-2 p-2 rounded-lg bg-nexus-card/70 border border-nexus-accent/15 hover:border-nexus-cyan/40 hover:bg-nexus-card transition-all cursor-pointer text-xs"
                onClick={() => {
                  cyberAudio.click()
                  onLoadSavedRequest(item)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                        METHOD_BADGES[item.method] || 'text-zinc-300'
                      }`}
                    >
                      {item.method}
                    </span>
                    <span className="font-semibold text-nexus-text truncate">{item.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-nexus-muted truncate">{item.url}</div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    cyberAudio.click()
                    onDeleteSavedRequest(item.id)
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-rose-400 transition-opacity"
                  title={t('apiStudio.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )
        ) : (
          /* HISTORY LIST */
          <div className="space-y-1.5">
            {history.length > 0 && (
              <div className="flex justify-end px-1 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.click()
                    onClearHistory()
                  }}
                  className="text-[11px] text-nexus-muted hover:text-rose-400 transition-colors"
                >
                  {t('apiStudio.sidebar.clearHistory')}
                </button>
              </div>
            )}

            {filteredHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-nexus-muted">
                <History className="w-8 h-8 text-nexus-accent/30 mx-auto mb-2" />
                <p>{t('apiStudio.sidebar.noHistory')}</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-nexus-card/70 border border-nexus-accent/15 hover:border-nexus-cyan/40 hover:bg-nexus-card transition-all cursor-pointer text-xs"
                  onClick={() => {
                    cyberAudio.click()
                    onLoadHistoryItem(item)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                            METHOD_BADGES[item.method] || 'text-zinc-300'
                          }`}
                        >
                          {item.method}
                        </span>
                        {item.status && (
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              item.status < 300
                                ? 'text-emerald-400'
                                : item.status < 400
                                ? 'text-sky-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-nexus-muted">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-nexus-muted truncate">{item.url}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
