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

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  FileCode,
  Lock,
} from 'lucide-react'
import { ActivityEntry } from './types'
import { cyberAudio } from '../../lib/cyberAudio'
import { useT } from '../../lib/i18n'

interface ActivityDetailDrawerProps {
  entry: ActivityEntry | null
  isOpen: boolean
  onClose: () => void
  onCopyText: (text: string, label: string) => void
  onNavigateToTool?: (toolId: string) => void
}

/**
 * Maps a tool identifier to the corresponding internal workstation route path.
 */
function getToolRoutePath(toolId: string): string | null {
  switch (toolId) {
    case 'api-studio':
    case 'curl-runner':
      return '/api-studio'
    case 'hash-studio':
      return '/hash-studio'
    case 'cyber-fortress':
    case 'fortress':
      return '/fortress'
    case 'password-generator':
    case 'password':
      return '/password'
    case 'network-tools':
    case 'network':
      return '/network'
    case 'port-killer':
      return '/port-killer'
    case 'system-optimizer':
      return '/system-optimizer'
    case 'regex-studio':
      return '/regex-studio'
    case 'json-studio':
      return '/json-studio'
    case 'pdf-studio':
      return '/pdf-studio'
    case 'scratchpad':
      return '/scratchpad'
    case 'clipboard':
      return '/clipboard'
    case 'image':
      return '/image'
    case 'organizer':
      return '/organizer'
    case 'qr-code':
      return '/qr-code'
    case 'fake-data':
      return '/fake-data'
    default:
      return null
  }
}

/**
 * Slide-over drawer displaying comprehensive audit record telemetry,
 * SHA-256 block hash proofs, parent block linkage, and sanitized metadata.
 */
export const ActivityDetailDrawer: React.FC<ActivityDetailDrawerProps> = ({
  entry,
  isOpen,
  onClose,
  onCopyText,
  onNavigateToTool,
}) => {
  const { t } = useT()
  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedPrevHash, setCopiedPrevHash] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  if (!isOpen || !entry) return null

  const targetPath = getToolRoutePath(entry.toolId)
  const formattedDate = new Date(entry.timestamp).toLocaleString()
  const metadataString = entry.metadata
    ? JSON.stringify(entry.metadata, null, 2)
    : '{}'

  const handleCopy = (text: string, type: 'hash' | 'prevHash' | 'json', label: string) => {
    cyberAudio.copySuccess()
    onCopyText(text, label)
    if (type === 'hash') {
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    } else if (type === 'prevHash') {
      setCopiedPrevHash(true)
      setTimeout(() => setCopiedPrevHash(false), 2000)
    } else {
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), 2000)
    }
  }

  const handleOpenTool = () => {
    if (targetPath && onNavigateToTool) {
      cyberAudio.navigate()
      onNavigateToTool(targetPath)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            cyberAudio.click()
            onClose()
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-xl bg-nexus-surface border-l border-white/10 shadow-2xl flex flex-col h-full z-10 overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-nexus-card/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {t('activityFeed.drawer.title') || 'Audit Record Inspector'}
                </h2>
                <p className="text-xs font-mono text-nexus-muted truncate max-w-xs">
                  ID: {entry.id}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                cyberAudio.click()
                onClose()
              }}
              className="p-1.5 rounded-lg text-nexus-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hidden">
            {/* Overview Metadata Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 rounded-lg bg-nexus-card/60 border border-white/5">
                <span className="text-[11px] text-nexus-muted font-medium block">
                  {t('activityFeed.drawer.tool') || 'Origin Tool'}
                </span>
                <span className="text-xs font-bold text-white mt-1 block">
                  {entry.toolName}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-nexus-card/60 border border-white/5">
                <span className="text-[11px] text-nexus-muted font-medium block">
                  {t('activityFeed.drawer.action') || 'Action Dispatched'}
                </span>
                <span className="text-xs font-bold text-nexus-text mt-1 block">
                  {entry.action}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-nexus-card/60 border border-white/5">
                <span className="text-[11px] text-nexus-muted font-medium block">
                  {t('activityFeed.drawer.status') || 'Execution Status'}
                </span>
                <span className="text-xs font-bold capitalize mt-1 block text-emerald-400">
                  {entry.status}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-nexus-card/60 border border-white/5">
                <span className="text-[11px] text-nexus-muted font-medium block">
                  {t('activityFeed.drawer.duration') || 'Duration / Latency'}
                </span>
                <span className="text-xs font-mono font-bold text-nexus-cyan mt-1 block">
                  {entry.durationMs !== undefined ? `${entry.durationMs}ms` : 'N/A'}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-lg bg-nexus-card/60 border border-white/5">
                <span className="text-[11px] text-nexus-muted font-medium block">
                  {t('activityFeed.drawer.timestamp') || 'Timestamp'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-nexus-muted" />
                  <span className="text-xs font-mono text-white">{formattedDate}</span>
                  <span className="text-[11px] font-mono text-nexus-muted">
                    ({entry.timestamp})
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Proofs Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-nexus-cyan" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Cryptographic SHA-256 Proofs
                </h3>
              </div>

              {/* Current Block Hash */}
              <div className="p-3.5 rounded-lg bg-nexus-card/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-nexus-cyan">
                    {t('activityFeed.drawer.currentHash') || 'SHA-256 Block Hash'}
                  </span>
                  <button
                    onClick={() => handleCopy(entry.hash, 'hash', 'SHA-256 Block Hash')}
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                  >
                    {copiedHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-black/40 font-mono text-xs text-white break-all select-all border border-white/5">
                  {entry.hash}
                </div>
              </div>

              {/* Previous Block Hash */}
              <div className="p-3.5 rounded-lg bg-nexus-card/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-nexus-muted">
                    {t('activityFeed.drawer.previousHash') || 'Previous Block Hash'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(entry.prevHash, 'prevHash', 'Previous Block Hash')
                    }
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                  >
                    {copiedPrevHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedPrevHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-black/40 font-mono text-xs text-nexus-muted break-all select-all border border-white/5">
                  {entry.prevHash || '00000000000000000000000000000000 (GENESIS)'}
                </div>
              </div>
            </div>

            {/* Sanitized Metadata JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-nexus-accent" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    {t('activityFeed.drawer.metadata') || 'Sanitized Metadata & Payload'}
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy(metadataString, 'json', 'Metadata JSON')}
                  className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                >
                  {copiedJson ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 max-h-56 overflow-y-auto font-mono text-xs text-nexus-text">
                <pre className="whitespace-pre-wrap break-words">{metadataString}</pre>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-nexus-card/80 flex items-center justify-between gap-3">
            {targetPath ? (
              <button
                onClick={handleOpenTool}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan hover:bg-nexus-cyan/30 transition-all shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('activityFeed.drawer.openTool') || 'Open Origin Studio'}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => {
                cyberAudio.click()
                onClose()
              }}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-nexus-text hover:bg-white/10 transition-all"
            >
              {t('activityFeed.drawer.close') || 'Close Inspector'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ActivityDetailDrawer
