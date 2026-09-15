import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Activity,
  HardDrive,
  Zap,
  RotateCw,
  Server,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI } from '../lib/ipc'
import { useToast } from '../lib/ToastContext'
import { useT } from '../lib/i18n'

interface SystemStats {
  cpu: {
    model: string
    cores: number
    speed: number
    overallLoad: number
    loadPerCore: number[]
  }
  memory: {
    total: number
    free: number
    used: number
    percentUsed: number
  }
  os: {
    platform: string
    arch: string
    release: string
    hostname: string
    uptime: number
  }
}

function formatGigabytes(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatUptime(seconds: number, locale: string = 'tr'): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (locale === 'en') {
    return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`
  }
  return `${days > 0 ? `${days}g ` : ''}${hours}sa ${minutes}dk`
}

export default function ResourceSentinel() {
  const { t, locale } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isVisible, setIsVisible] = useState(() => (typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true))

  const fetchStats = async () => {
    try {
      const res = await nexusAPI.sentinel.getStats()
      if (res.success) {
        setStats(res)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Sleep/wake handler when window hides or minimizes to tray
  useEffect(() => {
    const handleVisChange = (e: any) => {
      const visible = e.detail?.visible !== undefined ? Boolean(e.detail.visible) : (document.visibilityState !== 'hidden')
      setIsVisible(visible)
      if (visible) fetchStats()
    }
    const handleDomVis = () => {
      const visible = document.visibilityState !== 'hidden'
      setIsVisible(visible)
      if (visible) fetchStats()
    }

    window.addEventListener('nexus:app-visibility' as any, handleVisChange)
    document.addEventListener('visibilitychange', handleDomVis)

    const unbindIpc = nexusAPI.onVisibilityChange?.((visible: boolean) => {
      setIsVisible(visible)
      if (visible) fetchStats()
    })

    const handleSweep = () => {
      if (typeof (window as any).gc === 'function') {
        try { (window as any).gc() } catch {}
      }
    }
    window.addEventListener('nexus:app-memory-sweep', handleSweep)

    return () => {
      window.removeEventListener('nexus:app-visibility' as any, handleVisChange)
      document.removeEventListener('visibilitychange', handleDomVis)
      window.removeEventListener('nexus:app-memory-sweep', handleSweep)
      unbindIpc?.()
    }
  }, [])

  useEffect(() => {
    if (!isVisible || !isAutoRefresh) return
    fetchStats()
    const interval = setInterval(fetchStats, 1500)
    return () => clearInterval(interval)
  }, [isAutoRefresh, isVisible])

  const handleOptimizeMemory = async () => {
    setIsOptimizing(true)
    try {
      const res = await nexusAPI.sentinel.optimizeMemory()
      if (res.success) {
        await fetchStats()
        showToastSuccess(
          t('sentinel.toastSuccess'),
          t('sentinel.toastSuccessDesc')
        )
      } else {
        showToastError(t('sentinel.toastError'), res.error || 'Failed')
      }
    } catch (err: any) {
      showToastError(t('sentinel.toastError'), err.message || 'Unknown error')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <BaseToolTemplate
      icon={Activity}
      title={t('sentinel.title')}
      description={t('sentinel.description')}
      gradient="from-cyan-500 to-emerald-600"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {stats?.cpu.model || t('sentinel.scanning')}
              </h3>
              <p className="text-xs text-nexus-muted font-mono">
                {stats ? `${t('sentinel.cores', { cores: stats.cpu.cores })} · ${stats.os.platform.toUpperCase()} (${stats.os.arch}) · ${stats.os.hostname}` : '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoRefresh((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isAutoRefresh
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-nexus-card border-white/5 text-nexus-muted'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              <span>{isAutoRefresh ? t('sentinel.liveActive') : t('sentinel.paused')}</span>
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOptimizeMemory}
              disabled={isOptimizing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-nexus-cyan to-emerald-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-nexus-cyan/20 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-bounce' : 'fill-current'}`} />
              <span>{isOptimizing ? t('sentinel.cleaning') : t('sentinel.cleanRam')}</span>
            </motion.button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU Overall Meter Card */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-nexus-cyan font-bold text-sm">
                  <Cpu className="w-4 h-4" />
                  <span>{t('sentinel.cpuLoad')}</span>
                </div>
                <span className="text-2xl font-black font-mono text-white">
                  %{stats.cpu.overallLoad}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-nexus-card rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400"
                  animate={{ width: `${stats.cpu.overallLoad}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Per-Core Distribution */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">
                  {t('sentinel.coreDistribution', { cores: stats.cpu.cores })}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {stats.cpu.loadPerCore.map((load, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-nexus-bg/60 border border-white/5 text-center space-y-1"
                    >
                      <p className="text-[9px] text-nexus-muted font-mono">C{idx}</p>
                      <p
                        className={`text-xs font-mono font-bold ${
                          load > 80 ? 'text-rose-400' : load > 50 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {load}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RAM Memory Card */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>{t('sentinel.ramStatus')}</span>
                </div>
                <span className="text-2xl font-black font-mono text-white">
                  %{stats.memory.percentUsed}
                </span>
              </div>

              {/* RAM Bar */}
              <div className="h-2 bg-nexus-card rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  animate={{ width: `${stats.memory.percentUsed}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-nexus-bg/60 border border-white/5 text-center">
                  <p className="text-[10px] text-nexus-muted uppercase">{t('sentinel.used')}</p>
                  <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    {formatGigabytes(stats.memory.used)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-nexus-bg/60 border border-white/5 text-center">
                  <p className="text-[10px] text-nexus-muted uppercase">{t('sentinel.free')}</p>
                  <p className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                    {formatGigabytes(stats.memory.free)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-nexus-bg/60 border border-white/5 text-center">
                  <p className="text-[10px] text-nexus-muted uppercase">{t('sentinel.total')}</p>
                  <p className="text-sm font-bold font-mono text-white mt-0.5">
                    {formatGigabytes(stats.memory.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System & OS Info Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Server className="w-3 h-3 text-nexus-cyan" /> {t('sentinel.os')}
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.os.platform} ({stats.os.release})</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> {t('sentinel.uptime')}
              </span>
              <p className="text-xs font-bold text-white font-mono">{formatUptime(stats.os.uptime, locale)}</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-nexus-accent" /> {t('sentinel.archEngine')}
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.os.arch} / Node.js Native</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> {t('sentinel.baseFreq')}
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.cpu.speed} MHz</p>
            </div>
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
