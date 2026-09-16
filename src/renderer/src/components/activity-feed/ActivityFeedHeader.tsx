/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect } from 'react'
import {
  ScrollText,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
  Download,
  ArrowDownToLine,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react'
import { ActivityEntry } from './types'
import { quickExportCsv, quickExportJson } from './exportUtils'
import { cyberAudio } from '../../lib/cyberAudio'
import { useT } from '../../lib/i18n'

interface ActivityFeedHeaderProps {
  isLive: boolean
  onToggleLive: () => void
  isVerifying: boolean
  onVerifyChain: () => void
  onClearJournal: () => void
  onOpenExport: () => void
  autoScroll: boolean
  onToggleAutoScroll: () => void
  totalCount: number
  onQuickExportCsv?: () => void
  onQuickExportJson?: () => void
  entries?: ActivityEntry[]
}

/**
 * Header bar for the Activity Feed workstation featuring live telemetry status,
 * cryptographic verification trigger, journal purge, and export actions.
 */
export const ActivityFeedHeader: React.FC<ActivityFeedHeaderProps> = ({
  isLive,
  onToggleLive,
  isVerifying,
  onVerifyChain,
  onClearJournal,
  onOpenExport,
  autoScroll,
  onToggleAutoScroll,
  totalCount,
  onQuickExportCsv,
  onQuickExportJson,
  entries,
}) => {
  const { t } = useT()

  const fetchEntriesForQuickExport = async (): Promise<ActivityEntry[]> => {
    if (entries && entries.length > 0) return entries
    if (window.nexusAPI?.journal?.query) {
      try {
        const response = await window.nexusAPI.journal.query({ limit: 1000 })
        const queried = Array.isArray(response) ? response : response?.entries || []
        if (queried && queried.length > 0) return queried
      } catch {}
    }
    return []
  }

  const handleQuickCsv = async () => {
    if (totalCount === 0) return
    cyberAudio.copySuccess()
    if (onQuickExportCsv) {
      onQuickExportCsv()
      return
    }
    const data = await fetchEntriesForQuickExport()
    if (data.length > 0) {
      quickExportCsv(data)
    }
  }

  const handleQuickJson = async () => {
    if (totalCount === 0) return
    cyberAudio.copySuccess()
    if (onQuickExportJson) {
      onQuickExportJson()
      return
    }
    const data = await fetchEntriesForQuickExport()
    if (data.length > 0) {
      quickExportJson(data)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (e.shiftKey) {
          handleQuickJson()
        } else {
          handleQuickCsv()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [totalCount, onQuickExportCsv, onQuickExportJson, entries])

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/5">
      {/* Title & Icon Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nexus-accent/20 via-nexus-card to-nexus-cyan/20 border border-nexus-cyan/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] flex-shrink-0">
          <ScrollText className="w-6 h-6 text-nexus-cyan" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t('activityFeed.title') || 'Activity Feed & Audit Journal'}
            </h1>
            {/* Live / Paused Status Pill */}
            <div
              onClick={() => {
                cyberAudio.click()
                onToggleLive()
              }}
              title={isLive ? 'Click to pause feed' : 'Click to resume live stream'}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase cursor-pointer transition-all ${
                isLive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </span>
              <span>
                {isLive
                  ? t('activityFeed.live') || 'LIVE STREAM'
                  : t('activityFeed.paused') || 'STREAM PAUSED'}
              </span>
            </div>
          </div>
          <p className="text-sm text-nexus-muted mt-1">
            {t('activityFeed.description') ||
              'Cryptographically chained cross-tool audit trail and live workstation activity journal.'}
          </p>
        </div>
      </div>

      {/* Action Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {/* Auto-scroll toggle */}
        <button
          onClick={() => {
            cyberAudio.click()
            onToggleAutoScroll()
          }}
          title={t('activityFeed.autoScroll') || 'Auto-scroll'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            autoScroll
              ? 'bg-nexus-cyan/15 text-nexus-cyan border-nexus-cyan/40 shadow-sm'
              : 'bg-nexus-card/60 text-nexus-muted border-white/10 hover:text-nexus-text hover:border-white/20'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>{t('activityFeed.autoScroll') || 'Auto-scroll'}</span>
        </button>

        {/* Pause / Resume button */}
        <button
          onClick={() => {
            cyberAudio.click()
            onToggleLive()
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isLive
              ? 'bg-nexus-card/80 text-nexus-text border-white/10 hover:border-amber-500/40 hover:text-amber-300'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
          }`}
        >
          {isLive ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('activityFeed.pause') || 'Pause Feed'}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('activityFeed.resume') || 'Resume Feed'}</span>
            </>
          )}
        </button>

        {/* Verify Chain button */}
        <button
          onClick={() => {
            cyberAudio.click()
            onVerifyChain()
          }}
          disabled={isVerifying || totalCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-nexus-accent/20 to-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan hover:bg-nexus-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(6,182,212,0.1)]"
        >
          {isVerifying ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-nexus-cyan" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-nexus-cyan" />
          )}
          <span>{t('activityFeed.verifyChain') || 'Verify Audit Chain'}</span>
        </button>

        {/* Quick CSV Export */}
        <button
          onClick={handleQuickCsv}
          disabled={totalCount === 0}
          title="Direct CSV Export (Ctrl+E)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-nexus-card/80 text-nexus-text border border-white/10 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>CSV</span>
          <kbd className="hidden sm:inline-block text-[9px] font-mono text-nexus-muted group-hover:text-emerald-300/80 bg-white/5 px-1 py-0.5 rounded border border-white/10">
            Ctrl+E
          </kbd>
        </button>

        {/* Quick JSON Export */}
        <button
          onClick={handleQuickJson}
          disabled={totalCount === 0}
          title="Direct JSON Export (Ctrl+Shift+E)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-nexus-card/80 text-nexus-text border border-white/10 hover:border-amber-500/40 hover:text-amber-300 hover:bg-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <FileJson className="w-3.5 h-3.5 text-amber-400" />
          <span>JSON</span>
          <kbd className="hidden sm:inline-block text-[9px] font-mono text-nexus-muted group-hover:text-amber-300/80 bg-white/5 px-1 py-0.5 rounded border border-white/10">
            Ctrl+Shift+E
          </kbd>
        </button>

        {/* Export button */}
        <button
          onClick={() => {
            cyberAudio.click()
            onOpenExport()
          }}
          disabled={totalCount === 0}
          title={t('activityFeed.exportModal.title') || 'Export Options Modal'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-nexus-card/80 text-nexus-text border border-white/10 hover:border-nexus-cyan/40 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-nexus-muted" />
          <span>{t('activityFeed.export') || 'Export'}</span>
        </button>

        {/* Clear Journal button */}
        <button
          onClick={() => {
            cyberAudio.purge()
            onClearJournal()
          }}
          disabled={totalCount === 0}
          title={t('activityFeed.clearJournal') || 'Clear Journal'}
          className="flex items-center justify-center p-1.5 rounded-lg text-xs font-medium bg-nexus-card/80 text-nexus-muted border border-white/10 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ActivityFeedHeader
