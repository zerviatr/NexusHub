import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Activity,
  HardDrive,
  Zap,
  RefreshCw,
  Server,
  Clock,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  RotateCw,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI } from '../lib/ipc'
import { useToast } from '../lib/ToastContext'

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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days > 0 ? `${days}g ` : ''}${hours}sa ${minutes}dk`
}

export default function ResourceSentinel() {
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

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

  useEffect(() => {
    fetchStats()
    if (!isAutoRefresh) return
    const interval = setInterval(fetchStats, 1500)
    return () => clearInterval(interval)
  }, [isAutoRefresh])

  const handleOptimizeMemory = async () => {
    setIsOptimizing(true)
    try {
      const res = await nexusAPI.sentinel.optimizeMemory()
      if (res.success) {
        await fetchStats()
        showToastSuccess(
          'Bellek Optimize Edildi!',
          'Kullanılmayan sistem önbelleği başarıyla temizlendi.'
        )
      } else {
        showToastError('Optimizasyon Hatası', res.error || 'İşlem başarısız.')
      }
    } catch (err: any) {
      showToastError('Hata', err.message || 'Bilinmeyen hata.')
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <BaseToolTemplate
      icon={Activity}
      title="System Resource Sentinel"
      description="Gerçek zamanlı donanım sensörleri, çekirdek bazlı CPU yükü, RAM tüketim analizörü ve tek tıkla bellek temizleme motoru."
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
                {stats?.cpu.model || 'Sistem Donanımı Taranıyor...'}
              </h3>
              <p className="text-xs text-nexus-muted font-mono">
                {stats ? `${stats.cpu.cores} Çekirdek · ${stats.os.platform.toUpperCase()} (${stats.os.arch}) · ${stats.os.hostname}` : '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoRefresh((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isAutoRefresh
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-nexus-card border-white/5 text-nexus-muted'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
              <span>{isAutoRefresh ? 'Canlı Akış Aktif (1.5s)' : 'Duraklatıldı'}</span>
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOptimizeMemory}
              disabled={isOptimizing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-nexus-cyan to-emerald-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-nexus-cyan/20 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-bounce' : 'fill-current'}`} />
              <span>{isOptimizing ? 'Temizleniyor...' : 'RAM Temizle'}</span>
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
                  <span>İşlemci (CPU) Yükü</span>
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
                  Çekirdek Dağılımı ({stats.cpu.cores} Mantıksal Çekirdek)
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
                  <span>Bellek (RAM) Durumu</span>
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
                  <p className="text-[10px] text-nexus-muted uppercase">Kullanılan</p>
                  <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    {formatGigabytes(stats.memory.used)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-nexus-bg/60 border border-white/5 text-center">
                  <p className="text-[10px] text-nexus-muted uppercase">Boşta</p>
                  <p className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                    {formatGigabytes(stats.memory.free)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-nexus-bg/60 border border-white/5 text-center">
                  <p className="text-[10px] text-nexus-muted uppercase">Toplam</p>
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
                <Server className="w-3 h-3 text-nexus-cyan" /> İşletim Sistemi
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.os.platform} ({stats.os.release})</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Çalışma Süresi
              </span>
              <p className="text-xs font-bold text-white font-mono">{formatUptime(stats.os.uptime)}</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-nexus-accent" /> Mimari & Motor
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.os.arch} / Node.js Native</p>
            </div>

            <div className="glass-card p-4 space-y-1">
              <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Temel Frekans
              </span>
              <p className="text-xs font-bold text-white font-mono">{stats.cpu.speed} MHz</p>
            </div>
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
