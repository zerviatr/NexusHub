import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  RefreshCw,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Sliders,
  Terminal,
  Cpu,
  Layers,
  ShieldAlert,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI } from '../lib/ipc'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'
import { useT } from '../lib/i18n'
import { logActivity } from '../lib/activityLogger'

interface PortItem {
  protocol: string
  localAddress: string
  port: number
  state: string
  pid: number
  processName: string
}

export default function PortKiller() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [ports, setPorts] = useState<PortItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activePreset, setActivePreset] = useState<'all' | 'dev' | 'db'>('all')

  // Kill Confirmation Modal
  const [targetProcess, setTargetProcess] = useState<PortItem | null>(null)
  const [isKilling, setIsKilling] = useState(false)

  const scanPorts = async () => {
    setLoading(true)
    try {
      cyberAudio.click()
      const res = await nexusAPI.port.scan()
      if (res.success) {
        setPorts(res.ports)
      } else {
        showToastError('Tarama Hatası', res.error || 'Portlar taranamadı.')
      }

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
    } catch (err: any) {
      showToastError('Hata', err.message || 'Bilinmeyen hata.')
      logActivity({
        toolId: 'port-killer',
        action: 'scan_ports',
        category: 'system',
        status: 'failure',
        details: `Port scan failed: ${err.message}`,
        metadata: { error: err.message },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scanPorts()
  }, [])

  const handleKill = async () => {
    if (!targetProcess) return
    setIsKilling(true)
    try {
      cyberAudio.shred()
      const res = await nexusAPI.port.kill(targetProcess.pid)
      if (res.success) {
        showToastSuccess(
          t('portKiller.toastKilled'),
          t('portKiller.toastKilledDesc', { name: targetProcess.processName, pid: targetProcess.pid, port: targetProcess.port })
        )
        setTargetProcess(null)
        await scanPorts()
      } else {
        showToastError('Sonlandırma Hatası', res.error || 'İşlem sonlandırılamadı.')
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
      showToastError('Hata', err.message || 'Yetki hatası.')
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
  }

  const DEV_PORTS = [3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888, 9000]
  const DB_PORTS = [1433, 3306, 5432, 6379, 27017]

  const filteredPorts = ports.filter((item) => {
    // Preset filter
    if (activePreset === 'dev' && !DEV_PORTS.includes(item.port)) return false
    if (activePreset === 'db' && !DB_PORTS.includes(item.port)) return false

    // Search query filter
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      item.port.toString().includes(q) ||
      item.processName.toLowerCase().includes(q) ||
      item.pid.toString().includes(q)
    )
  })

  return (
    <BaseToolTemplate
      icon={Activity}
      title={t('portKiller.title')}
      description={t('portKiller.description')}
      gradient="from-rose-600 to-amber-600"
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-nexus-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('portKiller.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-accent"
              />
            </div>

            <button
              type="button"
              onClick={scanPorts}
              disabled={loading}
              className="p-2.5 rounded-xl bg-nexus-surface hover:bg-white/[0.06] border border-nexus-border text-nexus-muted hover:text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-nexus-cyan' : ''}`} />
            </button>
          </div>

          {/* Filter presets */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {[
              { id: 'all', label: t('portKiller.allPorts', { count: ports.length }) },
              { id: 'dev', label: t('portKiller.devPorts') },
              { id: 'db', label: t('portKiller.dbPorts') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  cyberAudio.click()
                  setActivePreset(tab.id as any)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activePreset === tab.id
                    ? 'bg-nexus-accent text-white shadow-md shadow-nexus-accent/20 font-semibold'
                    : 'text-nexus-muted hover:text-white bg-white/[0.03]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ports Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-nexus-border/40 text-nexus-muted font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{t('portKiller.colPort')}</th>
                  <th className="py-3 px-4">{t('portKiller.colProcess')}</th>
                  <th className="py-3 px-4">{t('portKiller.colPid')}</th>
                  <th className="py-3 px-4">{t('portKiller.colState')}</th>
                  <th className="py-3 px-4">{t('portKiller.colAddress')}</th>
                  <th className="py-3 px-4 text-right">{t('portKiller.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border/20 font-mono">
                {filteredPorts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-nexus-muted">
                      {loading ? t('portKiller.scanning') : t('portKiller.noPorts')}
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
                          onClick={() => setTargetProcess(item)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all active:scale-95 cursor-pointer"
                          title="Process'i Sonlandır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('portKiller.killBtn')}</span>
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {targetProcess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-nexus-card border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-500/10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t('portKiller.modalTitle')}</h3>
                  <p className="text-xs text-nexus-muted">{t('portKiller.modalSubtitle')}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/50 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-nexus-muted">{t('portKiller.targetPort')}</span>
                  <span className="text-nexus-cyan font-bold">:{targetProcess.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nexus-muted">{t('portKiller.processName')}</span>
                  <span className="text-white font-bold">{targetProcess.processName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nexus-muted">{t('portKiller.pid')}</span>
                  <span className="text-white">{targetProcess.pid}</span>
                </div>
              </div>

              <p className="text-xs text-nexus-muted leading-relaxed">
                {t('portKiller.warning')}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetProcess(null)}
                  disabled={isKilling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white transition-colors cursor-pointer"
                >
                  {t('portKiller.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleKill}
                  disabled={isKilling}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  {isKilling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('portKiller.confirmKill')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BaseToolTemplate>
  )
}
