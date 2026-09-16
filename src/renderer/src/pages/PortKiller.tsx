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

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  RefreshCw,
  Search,
  Trash2,
  AlertTriangle,
  Radio,
  ShieldAlert,
  X,
  Globe,
  Database,
  Terminal,
  Gamepad2,
  Layers,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI } from '../lib/ipc'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'
import { useT } from '../lib/i18n'
import { logActivity } from '../lib/activityLogger'

export interface PortItem {
  protocol: string
  localAddress: string
  port: number
  state: string
  pid: number
  processName: string
}

export type PortPreset = 'all' | 'web' | 'database' | 'dev' | 'gaming'

export const PORT_PRESETS: Record<
  PortPreset,
  { labelKey: string; defaultLabel: string; icon: React.ComponentType<{ className?: string }>; ports: number[] }
> = {
  all: {
    labelKey: 'portKiller.presets.all',
    defaultLabel: 'All Ports',
    icon: Layers,
    ports: [],
  },
  web: {
    labelKey: 'portKiller.presets.web',
    defaultLabel: 'Web',
    icon: Globe,
    ports: [80, 443, 8080, 8443, 3000, 5000, 5173],
  },
  database: {
    labelKey: 'portKiller.presets.database',
    defaultLabel: 'Database',
    icon: Database,
    ports: [1433, 1521, 3306, 5432, 6379, 8086, 9200, 27017],
  },
  dev: {
    labelKey: 'portKiller.presets.dev',
    defaultLabel: 'Dev',
    icon: Terminal,
    ports: [3000, 3001, 4200, 5173, 8000, 8080, 8888, 9000],
  },
  gaming: {
    labelKey: 'portKiller.presets.gaming',
    defaultLabel: 'Gaming',
    icon: Gamepad2,
    ports: [7777, 25565, 27015, 27016],
  },
}

export default function PortKiller() {
  const { t, locale } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [ports, setPorts] = useState<PortItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activePreset, setActivePreset] = useState<PortPreset>('all')

  // Auto-refresh engine state (default 3000ms / 3s)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [refreshInterval] = useState<number>(3000)

  // Kill Confirmation Modal State
  const [targetProcess, setTargetProcess] = useState<PortItem | null>(null)
  const [isKilling, setIsKilling] = useState<boolean>(false)

  // Primary manual scan with user feedback
  const scanPorts = async (silent = false) => {
    if (!silent) {
      setLoading(true)
      cyberAudio.click()
    }
    try {
      const res = await nexusAPI.port.scan()
      if (res.success && Array.isArray(res.ports)) {
        setPorts(res.ports)
      } else {
        const scanErrorTitle =
          t('portKiller.scanError') && t('portKiller.scanError') !== 'portKiller.scanError'
            ? t('portKiller.scanError')
            : locale === 'en'
              ? 'Scan Error'
              : 'Tarama Hatası'
        const scanErrorMsg =
          res.error ||
          (t('portKiller.scanFailed') && t('portKiller.scanFailed') !== 'portKiller.scanFailed'
            ? t('portKiller.scanFailed')
            : locale === 'en'
              ? 'Ports could not be scanned.'
              : 'Portlar taranamadı.')
        if (!silent) {
          showToastError(scanErrorTitle, scanErrorMsg)
        }
      }

      if (!silent) {
        logActivity({
          toolId: 'port-killer',
          action: 'scan_ports',
          category: 'system',
          status: res.success ? 'success' : 'failure',
          details: `Scanned active listening ports: ${res.ports?.length ?? 0} found`,
          metadata: {
            portCount: res.ports?.length ?? 0,
            error: res.error,
          },
        })
      }
    } catch (err: any) {
      const scanErrorTitle =
        t('portKiller.scanError') && t('portKiller.scanError') !== 'portKiller.scanError'
          ? t('portKiller.scanError')
          : locale === 'en'
            ? 'Scan Error'
            : 'Tarama Hatası'
      if (!silent) {
        showToastError(scanErrorTitle, err.message || (locale === 'en' ? 'Unknown scan error.' : 'Bilinmeyen hata.'))
        logActivity({
          toolId: 'port-killer',
          action: 'scan_ports',
          category: 'system',
          status: 'failure',
          details: `Port scan failed: ${err.message}`,
          metadata: { error: err.message },
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  // Initial load
  useEffect(() => {
    scanPorts(false)
  }, [])

  // Auto-refresh polling loop (silent, non-blocking, zero stutter)
  useEffect(() => {
    if (!autoRefresh) return

    const intervalId = setInterval(() => {
      scanPorts(true)
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval])

  // Handle killing the selected process
  const handleKill = useCallback(async () => {
    if (!targetProcess || isKilling) return
    setIsKilling(true)
    try {
      cyberAudio.shred()
      const res = await nexusAPI.port.kill(targetProcess.pid)
      if (res.success) {
        const toastTitle = t('portKiller.toastKilled') || (locale === 'en' ? 'Process Terminated' : 'İşlem Sonlandırıldı')
        const toastDesc =
          t('portKiller.toastKilledDesc', {
            name: targetProcess.processName,
            pid: targetProcess.pid,
            port: targetProcess.port,
          }) || `${targetProcess.processName} (PID ${targetProcess.pid}) listening on port :${targetProcess.port} terminated.`

        showToastSuccess(toastTitle, toastDesc)
        setTargetProcess(null)
        await scanPorts(true)
      } else {
        const killErrorTitle =
          t('portKiller.killError') && t('portKiller.killError') !== 'portKiller.killError'
            ? t('portKiller.killError')
            : locale === 'en'
              ? 'Termination Error'
              : 'Sonlandırma Hatası'
        const killErrorMsg =
          res.error ||
          (t('portKiller.killFailed') && t('portKiller.killFailed') !== 'portKiller.killFailed'
            ? t('portKiller.killFailed')
            : locale === 'en'
              ? 'Process could not be terminated.'
              : 'İşlem sonlandırılamadı.')
        showToastError(killErrorTitle, killErrorMsg)
      }

      logActivity({
        toolId: 'port-killer',
        action: 'kill_process',
        category: 'system',
        status: res.success ? 'success' : 'failure',
        details: `Terminated process ${targetProcess.processName} (PID ${targetProcess.pid}) on port ${targetProcess.port}`,
        metadata: {
          pid: targetProcess.pid,
          processName: targetProcess.processName,
          port: targetProcess.port,
          error: res.error,
        },
      })
    } catch (err: any) {
      const killErrorTitle =
        t('portKiller.killError') && t('portKiller.killError') !== 'portKiller.killError'
          ? t('portKiller.killError')
          : locale === 'en'
            ? 'Termination Error'
            : 'Sonlandırma Hatası'
      const permissionMsg =
        err.message ||
        (t('portKiller.permissionError') && t('portKiller.permissionError') !== 'portKiller.permissionError'
          ? t('portKiller.permissionError')
          : locale === 'en'
            ? 'Permission error / Administrative access required.'
            : 'Yetki hatası.')
      showToastError(killErrorTitle, permissionMsg)
      logActivity({
        toolId: 'port-killer',
        action: 'kill_process',
        category: 'system',
        status: 'failure',
        details: `Failed to terminate process ${targetProcess.processName} (PID ${targetProcess.pid}): ${err.message}`,
        metadata: {
          pid: targetProcess.pid,
          processName: targetProcess.processName,
          port: targetProcess.port,
          error: err.message,
        },
      })
    } finally {
      setIsKilling(false)
    }
  }, [targetProcess, isKilling, locale, t, showToastError, showToastSuccess])

  // Keyboard accessibility for Kill Confirmation Modal (Enter to confirm, Escape to dismiss)
  useEffect(() => {
    if (!targetProcess) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setTargetProcess(null)
      } else if (e.key === 'Enter' && !isKilling) {
        e.preventDefault()
        handleKill()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [targetProcess, isKilling, handleKill])

  // Filter ports based on active preset and text query
  const filteredPorts = ports.filter((item) => {
    // Preset filter
    if (activePreset !== 'all') {
      const targetPorts = PORT_PRESETS[activePreset].ports
      if (!targetPorts.includes(item.port)) return false
    }

    // Search query filter
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      item.port.toString().includes(q) ||
      item.processName.toLowerCase().includes(q) ||
      item.pid.toString().includes(q) ||
      item.localAddress.toLowerCase().includes(q)
    )
  })

  // Detect critical system PIDs
  const isSystemCritical =
    Boolean(targetProcess) &&
    (targetProcess!.pid <= 4 ||
      /^(system|svchost|csrss|explorer|wininit|services|lsass|smss)\.exe$/i.test(targetProcess!.processName))

  return (
    <BaseToolTemplate
      icon={Activity}
      title={t('portKiller.title') || 'Port & Process Watchdog'}
      description={
        t('portKiller.description') ||
        'Scan active TCP listening ports on Windows, see which process locks which port, and kill troublesome processes with one click.'
      }
      gradient="from-rose-600 to-amber-600"
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-nexus-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('portKiller.searchPlaceholder') || 'Search by port, PID, or process name...'}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-accent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.click()
                    setQuery('')
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => scanPorts(false)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-nexus-surface hover:bg-white/[0.06] border border-nexus-border text-nexus-muted hover:text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t('common.refresh') || 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-nexus-cyan' : ''}`} />
            </button>

            {/* Auto-Refresh Toggle with Pulsing Status Badge */}
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setAutoRefresh((prev) => !prev)
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-nexus-surface hover:bg-white/[0.06] border-nexus-border text-nexus-muted hover:text-white'
              }`}
              title={
                autoRefresh
                  ? 'Auto-refresh active (updates every 3s). Click to pause.'
                  : 'Click to enable 3s auto-refresh polling'
              }
            >
              {autoRefresh ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              ) : (
                <Radio className="w-3.5 h-3.5 text-nexus-muted" />
              )}
              <span>
                {autoRefresh
                  ? `${t('portKiller.autoRefresh') || 'Auto-Refresh'} (${refreshInterval / 1000}s)`
                  : t('portKiller.autoRefresh') || 'Auto-Refresh'}
              </span>
            </button>
          </div>

          {/* Expanded 4-Category Port Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            {(Object.keys(PORT_PRESETS) as PortPreset[]).map((key) => {
              const preset = PORT_PRESETS[key]
              const Icon = preset.icon
              const count =
                key === 'all'
                  ? ports.length
                  : ports.filter((p) => preset.ports.includes(p.port)).length

              const isSelected = activePreset === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    cyberAudio.click()
                    setActivePreset(key)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-nexus-accent text-white shadow-md shadow-nexus-accent/20 font-semibold'
                      : 'text-nexus-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {key === 'all'
                      ? t('portKiller.allPorts', { count }) || `All (${count})`
                      : t(preset.labelKey) || preset.defaultLabel}
                  </span>
                  {key !== 'all' && count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-nexus-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ports Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-nexus-border/40 text-nexus-muted font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{t('portKiller.colPort') || 'Port'}</th>
                  <th className="py-3 px-4">{t('portKiller.colProcess') || 'Process Name'}</th>
                  <th className="py-3 px-4">{t('portKiller.colPid') || 'PID'}</th>
                  <th className="py-3 px-4">{t('portKiller.colState') || 'State'}</th>
                  <th className="py-3 px-4">{t('portKiller.colAddress') || 'Local Address'}</th>
                  <th className="py-3 px-4 text-right">{t('portKiller.colAction') || 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border/20 font-mono">
                {filteredPorts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-nexus-muted">
                      {loading
                        ? t('portKiller.scanning') || 'Scanning ports...'
                        : t('portKiller.noPorts') || 'No matching active listening ports found.'}
                    </td>
                  </tr>
                ) : (
                  filteredPorts.map((item) => (
                    <tr
                      key={`${item.protocol}_${item.port}_${item.pid}`}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-nexus-cyan flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>:{item.port}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {item.processName}
                      </td>
                      <td className="py-3.5 px-4 text-nexus-muted">
                        {item.pid}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                          {item.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-nexus-muted text-[11px]">
                        {item.localAddress}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            cyberAudio.click()
                            setTargetProcess(item)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all active:scale-95 cursor-pointer"
                          title={t('portKiller.killBtn') || 'Kill Process'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('portKiller.killBtn') || 'Kill'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Kill Confirmation Modal */}
      <AnimatePresence>
        {targetProcess && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setTargetProcess(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-nexus-card border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-500/10 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t('portKiller.modalTitle') || 'Kill Process Confirmation'}
                    </h3>
                    <p className="text-xs text-nexus-muted">
                      {t('portKiller.modalSubtitle') || 'You are about to release this port lock.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetProcess(null)}
                  className="text-nexus-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* System Critical Warning Callout */}
              {isSystemCritical && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-start gap-2 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      {locale === 'en' ? 'CRITICAL SYSTEM PROCESS' : 'KRİTİK SİSTEM İŞLEMİ'}
                    </span>
                    <span>
                      {locale === 'en'
                        ? 'Terminating this core Windows process may cause system instability or immediate reboot.'
                        : 'Bu temel Windows sürecini sonlandırmak sistem kararsızlığına veya ani yeniden başlatmaya neden olabilir.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Full Process Details Table */}
              <div className="p-3.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/50 text-xs space-y-2 font-mono">
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-nexus-muted">{t('portKiller.targetPort') || 'Target Port:'}</span>
                  <span className="text-nexus-cyan font-bold text-sm">:{targetProcess.port}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-nexus-muted">{t('portKiller.processName') || 'Process Name:'}</span>
                  <span className="text-white font-bold">{targetProcess.processName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-nexus-muted">{t('portKiller.pid') || 'PID:'}</span>
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded">{targetProcess.pid}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span className="text-nexus-muted">{t('portKiller.colAddress') || 'Local Address:'}</span>
                  <span className="text-nexus-muted">{targetProcess.localAddress}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-nexus-muted">{t('portKiller.colState') || 'State:'}</span>
                  <span className="text-emerald-400 font-semibold">{targetProcess.state} ({targetProcess.protocol.toUpperCase()})</span>
                </div>
              </div>

              {/* Consequence Warning */}
              <p className="text-xs text-nexus-muted leading-relaxed">
                {t('portKiller.warning') ||
                  'Terminating this process will immediately close the associated software. Any unsaved data may be lost.'}
              </p>

              {/* Footer Buttons with Keyboard Shortcut Indicators */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-nexus-muted font-mono">
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-nexus-text border border-white/10">
                    Enter
                  </kbd>
                  <span>{locale === 'en' ? 'confirm' : 'onayla'}</span>
                  <span>•</span>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-nexus-text border border-white/10">
                    Esc
                  </kbd>
                  <span>{locale === 'en' ? 'dismiss' : 'kapat'}</span>
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setTargetProcess(null)}
                    disabled={isKilling}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white transition-colors cursor-pointer"
                  >
                    {t('portKiller.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleKill}
                    disabled={isKilling}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isKilling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{t('portKiller.confirmKill') || 'Force Kill Process'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BaseToolTemplate>
  )
}
