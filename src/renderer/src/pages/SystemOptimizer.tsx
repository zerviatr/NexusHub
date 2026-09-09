import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, Trash2, Globe, Activity, CheckCircle2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'

interface TempScanResult {
  path: string
  fileCount: number
  totalBytes: number
  sizeFormatted: string
  error?: string
}

export default function SystemOptimizer() {
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const [pinging, setPinging] = useState(false)

  const [tempStats, setTempStats] = useState<TempScanResult | null>(null)
  const [cleanLog, setCleanLog] = useState<string | null>(null)
  const [dnsLog, setDnsLog] = useState<string | null>(null)
  const [latencyResults, setLatencyResults] = useState<{ host: string; latency: number | null }[]>([])

  const scanTempFiles = async () => {
    if (!window.nexusAPI?.system?.scanTemp) return
    setScanning(true)
    cyberAudio.click()
    try {
      const res = await window.nexusAPI.system.scanTemp()
      setTempStats(res)
    } finally {
      setScanning(false)
    }
  }

  const cleanTempFiles = async () => {
    if (!window.nexusAPI?.system?.cleanTemp) return
    setCleaning(true)
    cyberAudio.shred()
    try {
      const res = await window.nexusAPI.system.cleanTemp()
      if (res.success) {
        setCleanLog(`Başarıyla ${res.deletedCount} adet eski geçici dosya temizlendi. Kazanılan Alan: ${res.freedFormatted}`)
        await scanTempFiles()
      } else {
        setCleanLog(`Hata: ${res.error}`)
      }
    } finally {
      setCleaning(false)
    }
  }

  const flushDnsCache = async () => {
    if (!window.nexusAPI?.system?.flushDns) return
    setFlushing(true)
    cyberAudio.click()
    try {
      const res = await window.nexusAPI.system.flushDns()
      if (res.success) {
        setDnsLog(res.output || 'Windows DNS Çözümleyici Önbelleği Başarıyla Temizlendi.')
        cyberAudio.copySuccess()
      } else {
        setDnsLog(`Hata: ${res.output}`)
      }
    } finally {
      setFlushing(false)
    }
  }

  const benchmarkLatencies = async () => {
    if (!window.nexusAPI?.system?.pingHost) return
    setPinging(true)
    cyberAudio.click()
    const targets = ['1.1.1.1', '8.8.8.8', 'google.com']
    const results: { host: string; latency: number | null }[] = []

    for (const t of targets) {
      const pingRes = await window.nexusAPI.system.pingHost(t)
      results.push({ host: t, latency: pingRes.latency })
    }
    setLatencyResults(results)
    setPinging(false)
  }

  useEffect(() => {
    scanTempFiles()
    benchmarkLatencies()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nexus-text flex items-center gap-3">
            <Cpu className="w-7 h-7 text-nexus-accent" />
            Windows System Optimizer & Cache Purger
          </h1>
          <p className="text-sm text-nexus-muted mt-1">
            Windows yerel önbellek, DNS çözümleyici ve çöp geçici dosyaları güvenle temizleyen performans santrali
          </p>
        </div>
      </div>

      {/* Battle Station Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temp File Cleaner Card */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center text-nexus-accent">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-nexus-text">Geçici Dosya & Çöp Temizleyici</h2>
                  <span className="text-[11px] font-mono text-nexus-muted truncate block max-w-xs">
                    {tempStats?.path || '%TEMP%'}
                  </span>
                </div>
              </div>
              <button
                onClick={scanTempFiles}
                disabled={scanning}
                className="p-2 rounded-lg bg-nexus-bg hover:bg-nexus-border/30 text-nexus-muted hover:text-nexus-text transition-colors"
                title="Yeniden Tara"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-nexus-accent' : ''}`} />
              </button>
            </div>

            <div className="bg-nexus-bg rounded-xl p-4 border border-nexus-border/30 my-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-nexus-muted">Taranan Çöp Dosya Sayısı:</span>
                <span className="font-mono font-semibold text-nexus-text">
                  {tempStats ? `${tempStats.fileCount} dosya` : 'Hesaplanıyor...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-nexus-muted">Kazanılabilir Disk Alanı:</span>
                <span className="font-mono font-bold text-nexus-accent text-sm">
                  {tempStats?.sizeFormatted || '0.00 MB'}
                </span>
              </div>
            </div>

            {cleanLog && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cleanLog}</span>
              </div>
            )}
          </div>

          <button
            onClick={cleanTempFiles}
            disabled={cleaning || !tempStats || tempStats.fileCount === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-nexus-accent/20 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{cleaning ? 'Çöpler Temizleniyor...' : 'Geçici Dosyaları Güvenle Temizle'}</span>
          </button>
        </div>

        {/* DNS Cache Purger Card */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-6 shadow-lg flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center text-nexus-cyan">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-nexus-text">Windows DNS Önbellek Boşaltıcı</h2>
                <span className="text-[11px] font-mono text-nexus-muted">
                  ipconfig /flushdns Yerel Komutu
                </span>
              </div>
            </div>

            <p className="text-xs text-nexus-muted leading-relaxed my-4">
              Bayatlamış DNS kayıtlarını, engellenen alan adlarını ve bozulmuş host yönlendirmelerini tek tıkla yenileyin. Bağlantı tıkanıklıklarını çözer.
            </p>

            {dnsLog && (
              <div className="p-3 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/30 text-nexus-cyan text-xs font-mono flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{dnsLog}</span>
              </div>
            )}
          </div>

          <button
            onClick={flushDnsCache}
            disabled={flushing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-nexus-cyan hover:bg-nexus-cyan/90 disabled:opacity-50 text-black font-bold rounded-xl text-xs shadow-lg shadow-nexus-cyan/20 transition-all active:scale-95"
          >
            <Activity className="w-4 h-4" />
            <span>{flushing ? 'DNS Temizleniyor...' : 'DNS Önbelleğini Sıfırla (Flush)'}</span>
          </button>
        </div>
      </div>

      {/* Latency & Connectivity Telemetry */}
      <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-nexus-accent" />
            <h3 className="text-sm font-semibold text-nexus-text">Yerel Ağ & Omurga Gecikme Benchmark'ı</h3>
          </div>
          <button
            onClick={benchmarkLatencies}
            disabled={pinging}
            className="flex items-center gap-1 text-xs font-mono text-nexus-accent hover:underline"
          >
            <RefreshCw className={`w-3 h-3 ${pinging ? 'animate-spin' : ''}`} />
            <span>Testi Yenile</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {latencyResults.map((r) => (
            <div
              key={r.host}
              className="bg-nexus-bg border border-nexus-border/30 p-3 rounded-xl flex items-center justify-between font-mono"
            >
              <span className="text-xs text-nexus-muted">{r.host}</span>
              <span className={`text-xs font-bold ${r.latency && r.latency < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {r.latency !== null ? `${r.latency} ms` : 'Zaman aşımı'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
