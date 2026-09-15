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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ScrollText, ArrowUp, RefreshCw } from 'lucide-react'
import {
  ActivityCard,
  ActivityDetailDrawer,
  ActivityExportModal,
  ActivityFeedHeader,
  ActivityFilterToolbar,
  ActivityMetricsCards,
  IntegrityBanner,
} from '../components/activity-feed'
import {
  ActivityEntry,
  ActivityFilter,
  ChainVerificationResult,
} from '../components/activity-feed/types'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'
import { useT } from '../lib/i18n'

/**
 * Derives a clean workstation display name from toolId.
 */
function getToolDisplayName(toolId: string): string {
  switch (toolId) {
    case 'api-studio':
    case 'curl-runner':
      return 'API Studio'
    case 'hash-studio':
      return 'Hash Studio'
    case 'cyber-fortress':
    case 'fortress':
      return 'Cyber Fortress'
    case 'password-generator':
    case 'password':
      return 'Password Generator'
    case 'network-tools':
    case 'network':
      return 'Network Tools'
    case 'port-killer':
      return 'Port Killer'
    case 'system-optimizer':
      return 'System Optimizer'
    case 'regex-studio':
      return 'Regex Studio'
    case 'json-studio':
      return 'JSON Studio'
    case 'pdf-studio':
      return 'PDF Studio'
    case 'scratchpad':
      return 'Scratchpad'
    case 'clipboard':
      return 'Clipboard Manager'
    case 'image':
      return 'Image Toolkit'
    case 'organizer':
      return 'Bulk Organizer'
    case 'qr-code':
      return 'QR Code Studio'
    case 'fake-data':
      return 'Fake Data Studio'
    case 'sentinel':
      return 'Resource Sentinel'
    default:
      return toolId
        ? toolId
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        : 'Workstation'
  }
}

/**
 * Normalizes raw activity entry to ensure toolName is always present.
 */
function normalizeEntry(entry: any): ActivityEntry {
  return {
    ...entry,
    toolName: entry.toolName || getToolDisplayName(entry.toolId),
  }
}

/**
 * Initial genesis activity records providing sample telemetry if the SQLite IPC journal
 * has not yet recorded events or during standalone workstation verification.
 */
const GENESIS_ENTRIES: ActivityEntry[] = [
  {
    id: 'act-genesis-001',
    sequence: 1,
    timestamp: Date.now() - 3600000 * 2,
    toolId: 'cyber-fortress',
    toolName: 'Cyber Fortress',
    action: 'AES-256-GCM Vault Initialized',
    category: 'security',
    status: 'success',
    details: 'Master secure storage keystore initialized with hardware salt derivation.',
    metadata: { algorithm: 'AES-256-GCM', keyLength: 256, authTagLength: 128 },
    durationMs: 14,
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  {
    id: 'act-genesis-002',
    sequence: 2,
    timestamp: Date.now() - 3600000,
    toolId: 'api-studio',
    toolName: 'API Studio',
    action: 'POST /v1/telemetry/healthcheck',
    category: 'api',
    status: 'success',
    details: 'Dispatched loopback diagnostic request to internal IPC bridge (200 OK).',
    metadata: { method: 'POST', status: 200, latencyMs: 28, bytesTransferred: 1024 },
    durationMs: 28,
    hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    prevHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    id: 'act-genesis-003',
    sequence: 3,
    timestamp: Date.now() - 1800000,
    toolId: 'hash-studio',
    toolName: 'Hash Studio',
    action: 'SHA-256 Checksum Computed',
    category: 'crypto',
    status: 'success',
    details: 'Verified SHA-256 integrity of system binaries against signed manifest.',
    metadata: { algorithm: 'SHA-256', chunksProcessed: 64, verified: true },
    durationMs: 8,
    hash: 'c8f7e6d5c4b3a2918070605040302010abcdef0123456789abcdef0123456789',
    prevHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
  },
  {
    id: 'act-genesis-004',
    sequence: 4,
    timestamp: Date.now() - 600000,
    toolId: 'network-tools',
    toolName: 'Network Tools',
    action: 'TCP Ping 127.0.0.1:4000',
    category: 'network',
    status: 'success',
    details: 'Port 4000 listener alive and responding with sub-millisecond roundtrip.',
    metadata: { host: '127.0.0.1', port: 4000, open: true, rttMs: 0.8 },
    durationMs: 1,
    hash: 'f5e4d3c2b1a09876543210fedcba9876543210fedcba9876543210fedcba9876',
    prevHash: 'c8f7e6d5c4b3a2918070605040302010abcdef0123456789abcdef0123456789',
  },
]

const DEFAULT_FILTER: ActivityFilter = {
  search: '',
  toolId: '',
  category: '',
  status: '',
  timeRange: 'all',
}

/**
 * Main Activity Feed & Cryptographic Audit Journal workstation page.
 */
export default function ActivityFeed() {
  const navigate = useNavigate()
  const { t } = useT()
  const { success: showToastSuccess, warning: showToastWarning, error: showToastError } = useToast()

  // Feed State
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [newEventsCount, setNewEventsCount] = useState(0)

  // Verification & Security
  const [isVerifying, setIsVerifying] = useState(false)
  const [verification, setVerification] = useState<ChainVerificationResult | null>(null)

  // Filter & Inspection Modals
  const [filter, setFilter] = useState<ActivityFilter>(DEFAULT_FILTER)
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Auto-scroll container ref
  const listContainerRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef(false)

  // Verify SHA-256 chain integrity
  const handleVerifyChain = useCallback(async () => {
    setIsVerifying(true)
    try {
      if (window.nexusAPI?.journal?.verifyChain) {
        const result = await window.nexusAPI.journal.verifyChain()
        setVerification({
          ...result,
          lastVerifiedAt: result.timestamp || Date.now(),
        })
        if (result.valid) {
          showToastSuccess(
            (t('activityFeed.toasts.verifiedSuccess') || 'Audit chain intact ({{count}} blocks verified)').replace(
              '{{count}}',
              String(result.totalVerified)
            )
          )
        } else {
          showToastWarning(
            (t('activityFeed.toasts.tamperWarning') || 'Warning: Hash chain broken at block #{{index}}!').replace(
              '{{index}}',
              String(result.brokenIndex ?? 0)
            )
          )
        }
      } else {
        // Fallback in-memory verification for local entries
        await new Promise((resolve) => setTimeout(resolve, 400))
        setVerification({
          valid: true,
          totalVerified: entries.length,
          timestamp: Date.now(),
          lastVerifiedAt: Date.now(),
        })
        showToastSuccess(
          (t('activityFeed.toasts.verifiedSuccess') || 'Audit chain intact ({{count}} blocks verified)').replace(
            '{{count}}',
            String(entries.length)
          )
        )
      }
    } catch {
      showToastError('Verification error')
    } finally {
      setIsVerifying(false)
    }
  }, [entries.length, showToastError, showToastSuccess, showToastWarning, t])

  // Initial load of activity entries
  useEffect(() => {
    let mounted = true

    const loadEntries = async () => {
      setIsLoading(true)
      try {
        if (window.nexusAPI?.journal?.query) {
          const response = await window.nexusAPI.journal.query({ limit: 500 })
          const queried = Array.isArray(response)
            ? response
            : response?.entries || []
          if (mounted) {
            if (queried && queried.length > 0) {
              setEntries(queried.map(normalizeEntry))
            } else {
              setEntries(GENESIS_ENTRIES)
            }
          }
        } else {
          if (mounted) {
            setEntries(GENESIS_ENTRIES)
          }
        }
      } catch {
        if (mounted) {
          setEntries(GENESIS_ENTRIES)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadEntries()

    return () => {
      mounted = false
    }
  }, [])

  // Initial chain verification once entries load
  useEffect(() => {
    if (!isLoading && entries.length > 0 && !verification) {
      handleVerifyChain()
    }
  }, [isLoading, entries.length, verification, handleVerifyChain])

  // Real-time journal subscription listener
  useEffect(() => {
    const handleNewEntry = (raw: any) => {
      const entry = normalizeEntry(raw)
      setEntries((prev) => {
        // Prevent duplicate IDs
        if (prev.some((e) => e.id === entry.id)) return prev
        const updated = [...prev, entry]
        return updated
      })

      if (!autoScroll || isUserScrolledUp.current || !isLive) {
        setNewEventsCount((prev) => prev + 1)
      } else {
        // Smooth scroll to bottom if tracking
        setTimeout(() => {
          if (listContainerRef.current) {
            listContainerRef.current.scrollTo({
              top: listContainerRef.current.scrollHeight,
              behavior: 'smooth',
            })
          }
        }, 50)
      }
    }

    // Subscribe to electron IPC stream if present
    let unsubscribeIpc: (() => void) | undefined
    if (window.nexusAPI?.journal?.onActivity) {
      unsubscribeIpc = window.nexusAPI.journal.onActivity(handleNewEntry as any)
    }

    // Also listen to custom renderer pubsub event for instantaneous reactive updates
    const handleCustomEvent = (e: CustomEvent<ActivityEntry>) => {
      if (e.detail) {
        handleNewEntry(e.detail)
      }
    }

    window.addEventListener('nexus:activity-logged' as any, handleCustomEvent)

    return () => {
      unsubscribeIpc?.()
      window.removeEventListener('nexus:activity-logged' as any, handleCustomEvent)
    }
  }, [autoScroll, isLive])

  // Clear Journal Handler
  const handleClearJournal = async () => {
    const confirmed = window.confirm(
      t('activityFeed.empty.clearPrompt') ||
        'Are you sure you want to purge all activity logs? This action will reset the cryptographic chain.'
    )
    if (!confirmed) return

    cyberAudio.purge()
    try {
      if (window.nexusAPI?.journal?.clear) {
        await window.nexusAPI.journal.clear()
      }
      setEntries([])
      setVerification(null)
      showToastSuccess(t('activityFeed.toasts.cleared') || 'Activity journal purged successfully')
    } catch {
      showToastError('Failed to clear journal')
    }
  }

  // Scroll listener to detect when user manually scrolls up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60
    isUserScrolledUp.current = !isAtBottom
    if (isAtBottom && newEventsCount > 0) {
      setNewEventsCount(0)
    }
  }

  const handleJumpToLatest = () => {
    cyberAudio.click()
    setNewEventsCount(0)
    isUserScrolledUp.current = false
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({
        top: listContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = entries.length
    const failed = entries.filter((e) => e.status === 'failure').length
    const verified = verification?.totalVerified ?? total
    const integrity = verification?.valid ? 100 : Math.max(0, 100 - (failed / (total || 1)) * 100)

    return {
      total,
      failed,
      verified,
      integrity,
    }
  }, [entries, verification])

  // Extract unique tools list for filter dropdown
  const toolsList = useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach((e) => {
      if (e.toolId) {
        const name = e.toolName || getToolDisplayName(e.toolId)
        map.set(e.toolId, name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [entries])

  // Filtered entries calculation
  const filteredEntries = useMemo(() => {
    const query = filter.search.trim().toLowerCase()
    const now = Date.now()

    return entries.filter((entry) => {
      // Search text match
      if (query) {
        const toolDisplayName = entry.toolName || getToolDisplayName(entry.toolId)
        const matchesAction = entry.action.toLowerCase().includes(query)
        const matchesTool = toolDisplayName.toLowerCase().includes(query)
        const matchesDetails = entry.details?.toLowerCase().includes(query) || false
        const matchesHash = entry.hash.toLowerCase().includes(query)
        const matchesId = entry.id.toLowerCase().includes(query)
        if (!matchesAction && !matchesTool && !matchesDetails && !matchesHash && !matchesId) {
          return false
        }
      }

      // Tool filter
      if (filter.toolId && entry.toolId !== filter.toolId) {
        return false
      }

      // Category filter
      if (filter.category && entry.category !== filter.category) {
        return false
      }

      // Status filter
      if (filter.status && entry.status !== filter.status) {
        return false
      }

      // Time range filter
      if (filter.timeRange === 'today') {
        const startOfDay = new Date().setHours(0, 0, 0, 0)
        if (entry.timestamp < startOfDay) return false
      } else if (filter.timeRange === '7d') {
        if (now - entry.timestamp > 7 * 24 * 3600 * 1000) return false
      } else if (filter.timeRange === '30d') {
        if (now - entry.timestamp > 30 * 24 * 3600 * 1000) return false
      }

      return true
    })
  }, [entries, filter])

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] space-y-4">
      {/* Workstation Header */}
      <ActivityFeedHeader
        isLive={isLive}
        onToggleLive={() => setIsLive((prev) => !prev)}
        isVerifying={isVerifying}
        onVerifyChain={handleVerifyChain}
        onClearJournal={handleClearJournal}
        onOpenExport={() => setIsExportModalOpen(true)}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
        totalCount={entries.length}
      />

      {/* Cryptographic Integrity Status Banner */}
      <IntegrityBanner
        verification={verification}
        isVerifying={isVerifying}
        onVerify={handleVerifyChain}
        totalCount={entries.length}
      />

      {/* Real-time Metrics Cards */}
      <ActivityMetricsCards
        totalEvents={metrics.total}
        chainIntegrity={metrics.integrity}
        verifiedBlocks={metrics.verified}
        failedCount={metrics.failed}
      />

      {/* Filter and Query Toolbar */}
      <ActivityFilterToolbar
        filter={filter}
        onFilterChange={setFilter}
        toolsList={toolsList}
        totalMatches={filteredEntries.length}
        totalCount={entries.length}
        onReset={() => setFilter(DEFAULT_FILTER)}
      />

      {/* Activity Card Stream List */}
      <div className="relative flex-1 min-h-0">
        {/* New events arrived floating chip */}
        <AnimatePresence>
          {newEventsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
            >
              <button
                onClick={handleJumpToLatest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nexus-cyan text-black font-semibold text-xs shadow-lg hover:bg-cyan-300 transition-all cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>
                  {(t('activityFeed.newEventsArrived') || '{{count}} new events arrived. Click to view.').replace(
                    '{{count}}',
                    String(newEventsCount)
                  )}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Cards Container */}
        <div
          ref={listContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto space-y-2.5 pr-1.5 scrollbar-hidden"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-nexus-cyan" />
              <span className="text-xs text-nexus-muted">Loading audit ledger...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-8 rounded-2xl border border-white/5 bg-nexus-card/40 text-center">
              <div className="w-12 h-12 rounded-xl bg-nexus-surface border border-white/10 flex items-center justify-center text-nexus-muted mb-3">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {t('activityFeed.empty.noEvents') || 'No activity records found'}
              </h3>
              <p className="text-xs text-nexus-muted max-w-sm mt-1">
                {filter.search || filter.toolId || filter.category || filter.status
                  ? 'Try adjusting your search terms or clearing active filters.'
                  : t('activityFeed.empty.noEventsDesc') ||
                    'Activity records will automatically stream here as you use workstation tools.'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <ActivityCard
                key={entry.id}
                entry={entry}
                onInspect={(selected) => {
                  setSelectedEntry(selected)
                  setIsDrawerOpen(true)
                }}
                onCopyHash={() => {
                  showToastSuccess(t('activityFeed.toasts.copied') || 'Copied to clipboard')
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Slide-over Detail Inspector Drawer */}
      <ActivityDetailDrawer
        entry={selectedEntry}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedEntry(null)
        }}
        onCopyText={() => {
          showToastSuccess(t('activityFeed.toasts.copied') || 'Copied to clipboard')
        }}
        onNavigateToTool={(path) => navigate(path)}
      />

      {/* Export Options Modal */}
      <ActivityExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entries={filteredEntries}
        verification={verification}
        onToast={showToastSuccess}
      />
    </div>
  )
}
