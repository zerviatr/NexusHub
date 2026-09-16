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

import React from 'react'
import {
  Send,
  Key,
  ShieldAlert,
  Globe,
  Radio,
  FileText,
  Terminal,
  Braces,
  FileCheck,
  Cpu,
  Layers,
  Copy,
  Clock,
  ExternalLink,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { ActivityCategory, ActivityEntry, ActivityStatus } from './types'
import { cyberAudio } from '../../lib/cyberAudio'

interface ActivityCardProps {
  entry: ActivityEntry
  onInspect: (entry: ActivityEntry) => void
  onCopyHash: (hash: string) => void
}

/**
 * Returns a fitting Lucide icon based on the tool identifier and category.
 */
function getToolIcon(toolId: string, category: ActivityCategory) {
  switch (toolId) {
    case 'api-studio':
    case 'curl-runner':
      return Send
    case 'hash-studio':
      return FileCheck
    case 'cyber-fortress':
    case 'fortress':
      return ShieldAlert
    case 'password-generator':
    case 'password':
      return Key
    case 'network-tools':
    case 'network':
      return Globe
    case 'port-killer':
      return Radio
    case 'system-optimizer':
      return Cpu
    case 'regex-studio':
      return Terminal
    case 'json-studio':
      return Braces
    case 'pdf-studio':
    case 'scratchpad':
      return FileText
    default:
      if (category === 'security') return ShieldAlert
      if (category === 'network') return Globe
      if (category === 'crypto') return FileCheck
      if (category === 'system') return Cpu
      if (category === 'file') return FileText
      return Layers
  }
}

/**
 * Returns the color scheme for a given category.
 */
function getCategoryBadge(category: ActivityCategory) {
  switch (category) {
    case 'security':
      return 'bg-purple-500/10 text-purple-300 border-purple-500/30'
    case 'network':
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
    case 'crypto':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    case 'system':
      return 'bg-blue-500/10 text-blue-300 border-blue-500/30'
    case 'file':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    case 'api':
      return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
  }
}

/**
 * Returns badge styling and icon for execution status.
 */
function getStatusBadge(status: ActivityStatus) {
  switch (status) {
    case 'success':
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
        label: 'Success',
      }
    case 'failure':
      return {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        icon: AlertCircle,
        label: 'Failed',
      }
    case 'warning':
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: AlertTriangle,
        label: 'Warning',
      }
    case 'info':
      return {
        bg: 'bg-nexus-cyan/10 text-nexus-cyan border-nexus-cyan/30',
        icon: Info,
        label: 'Info',
      }
  }
}

/**
 * Format relative timestamp into a concise readable string.
 */
function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 5) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Card representation of an individual audited activity event.
 */
export const ActivityCard: React.FC<ActivityCardProps> = ({ entry, onInspect, onCopyHash }) => {
  const [copied, setCopied] = React.useState(false)
  const ToolIcon = getToolIcon(entry.toolId, entry.category)
  const categoryClass = getCategoryBadge(entry.category)
  const statusInfo = getStatusBadge(entry.status)
  const StatusIcon = statusInfo.icon

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation()
    cyberAudio.copySuccess()
    onCopyHash(entry.hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCardClick = () => {
    cyberAudio.navigate()
    onInspect(entry)
  }

  const shortHash =
    entry.hash.length > 12
      ? `${entry.hash.substring(0, 6)}...${entry.hash.substring(entry.hash.length - 6)}`
      : entry.hash

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-white/5 bg-nexus-card/60 hover:bg-nexus-card hover:border-nexus-cyan/40 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
    >
      {/* Left side: Tool Icon + Names + Details */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-4">
        {/* Tool Icon */}
        <div className="w-9 h-9 rounded-lg bg-nexus-surface border border-white/10 flex items-center justify-center text-nexus-cyan flex-shrink-0 group-hover:border-nexus-cyan/40 group-hover:bg-nexus-cyan/10 transition-all">
          <ToolIcon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-wide">{entry.toolName}</span>
            <span className="text-nexus-muted text-xs">•</span>
            <span className="text-xs font-medium text-nexus-text truncate">{entry.action}</span>
            {/* Category Pill */}
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryClass}`}
            >
              {entry.category.toUpperCase()}
            </span>

            {/* Cryptographic Ledger Block Badges */}
            {entry.sequence === 1 ||
            entry.prevHash ===
              '0000000000000000000000000000000000000000000000000000000000000000' ||
            !entry.prevHash ? (
              <span
                className="flex items-center gap-1 text-[10px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                title="Root Genesis Block in Cryptographic Chain"
              >
                <ShieldCheck className="w-3 h-3 text-nexus-cyan" />
                <span>GENESIS BLOCK</span>
              </span>
            ) : (
              <span
                className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded"
                title={`Cryptographically Chained SHA-256 Block (Prev: ${entry.prevHash.substring(0, 8)}...)`}
              >
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span>Chained</span>
              </span>
            )}
          </div>

          {/* Details string */}
          {entry.details && (
            <p className="text-xs text-nexus-muted mt-1 truncate max-w-xl font-mono">
              {entry.details}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Status + Duration + Hash chip + Time + Action */}
      <div className="flex flex-wrap items-center gap-2.5 mt-3 md:mt-0 flex-shrink-0 self-end md:self-center">
        {/* Execution Duration */}
        {entry.durationMs !== undefined && (
          <span className="flex items-center gap-1 text-[11px] text-nexus-muted font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
            <Clock className="w-3 h-3 text-nexus-muted" />
            <span>{entry.durationMs < 1 ? '<1ms' : `${entry.durationMs}ms`}</span>
          </span>
        )}

        {/* Status Badge */}
        <span
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.bg}`}
        >
          <StatusIcon className="w-3 h-3" />
          <span>{statusInfo.label}</span>
        </span>

        {/* SHA-256 Hash Chip with Copy */}
        <button
          onClick={handleCopyHash}
          title={`SHA-256 Hash: ${entry.hash} (Click to copy)`}
          className="flex items-center gap-1.5 text-[11px] font-mono text-nexus-cyan bg-nexus-cyan/10 hover:bg-nexus-cyan/20 border border-nexus-cyan/30 px-2 py-0.5 rounded transition-all"
        >
          <span>{shortHash}</span>
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 opacity-70 group-hover:opacity-100" />
          )}
        </button>

        {/* Timestamp */}
        <span className="text-[11px] text-nexus-muted font-mono whitespace-nowrap min-w-[55px] text-right">
          {formatRelativeTime(entry.timestamp)}
        </span>

        {/* Inspect Indicator */}
        <div className="w-6 h-6 rounded flex items-center justify-center text-nexus-muted group-hover:text-white group-hover:bg-white/10 transition-all">
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}

export default ActivityCard
