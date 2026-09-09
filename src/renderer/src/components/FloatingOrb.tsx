import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Cpu,
  Mail,
  Zap,
  Check,
  Copy,
  ChevronRight,
  Maximize2,
  X,
  Search,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FloatingOrb() {
  const [isOpen, setIsOpen] = useState(false)
  const [cpuPercent, setCpuPercent] = useState<number>(14)
  const [memPercent, setMemPercent] = useState<number>(42)
  const [tempMail, setTempMail] = useState<string | null>(null)
  const [copiedMail, setCopiedMail] = useState(false)
  const [isGeneratingMail, setIsGeneratingMail] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optSuccess, setOptSuccess] = useState(false)

  const navigate = useNavigate()
  const intervalRef = useRef<any>(null)

  // Live telemetry polling
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        if (window.nexusAPI?.sentinel?.getStats) {
          const stats = await window.nexusAPI.sentinel.getStats()
          if (stats?.cpu?.overallLoad !== undefined) {
            setCpuPercent(Math.round(stats.cpu.overallLoad))
          }
          if (stats?.memory?.percentUsed !== undefined) {
            setMemPercent(Math.round(stats.memory.percentUsed))
          }
        }
      } catch (err) {
        // fallback simulated telemetry if IPC idle
      }
    }

    fetchTelemetry()
    intervalRef.current = setInterval(fetchTelemetry, 3000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // 1-Click Fast TempMail
  const handleQuickMail = async () => {
    if (isGeneratingMail) return
    setIsGeneratingMail(true)
    try {
      if (window.nexusAPI?.tempMail?.generate) {
        const res = await window.nexusAPI.tempMail.generate()
        if (res?.email) {
          setTempMail(res.email)
          await navigator.clipboard.writeText(res.email)
          setCopiedMail(true)
          setTimeout(() => setCopiedMail(false), 2500)
        }
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingMail(false)
    }
  }

  // Quick RAM Optimizer
  const handleQuickOptimize = async () => {
    if (isOptimizing) return
    setIsOptimizing(true)
    try {
      if (window.nexusAPI?.sentinel?.optimizeMemory) {
        await window.nexusAPI.sentinel.optimizeMemory()
        setOptSuccess(true)
        setTimeout(() => setOptSuccess(false), 2500)
      }
    } catch {
      // ignore
    } finally {
      setIsOptimizing(false)
    }
  }

  // Open Command Palette
  const handleOpenPalette = () => {
    window.dispatchEvent(new CustomEvent('nexus:open-palette'))
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none flex flex-col items-end">
      {/* Expanded Cyber Telemetry HUD */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-3 w-80 rounded-2xl bg-nexus-card/90 backdrop-blur-2xl border border-nexus-border/80 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-4 text-xs font-sans text-nexus-text overflow-hidden relative"
          >
            {/* Header / Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-nexus-cyan/15 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-nexus-border/40 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-nexus-cyan animate-ping" />
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-nexus-cyan">
                  Nexus Orb HUD
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-nexus-muted hover:text-white p-1 rounded-lg hover:bg-nexus-border/30 transition-colors"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Metrics Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* CPU Metric */}
              <div className="p-2.5 rounded-xl bg-nexus-bg/60 border border-nexus-border/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-nexus-muted mb-1">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Cpu className="w-3 h-3 text-nexus-cyan" /> CPU
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">{cpuPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-nexus-border/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-nexus-cyan to-nexus-accent rounded-full"
                    animate={{ width: `${Math.min(cpuPercent, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* RAM Metric */}
              <div className="p-2.5 rounded-xl bg-nexus-bg/60 border border-nexus-border/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-nexus-muted mb-1">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Activity className="w-3 h-3 text-purple-400" /> RAM
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">{memPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-nexus-border/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-nexus-accent rounded-full"
                    animate={{ width: `${Math.min(memPercent, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Fast Action 1: 1-Click TempMail */}
            <div className="mb-2 p-2 rounded-xl bg-nexus-bg/40 border border-nexus-border/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-nexus-cyan" />
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-nexus-muted font-medium">Hızlı Geçici Posta</div>
                  <div className="text-[11px] font-mono text-nexus-text truncate select-all">
                    {tempMail || 'Henüz üretilmedi'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleQuickMail}
                disabled={isGeneratingMail}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-nexus-cyan/15 hover:bg-nexus-cyan/25 border border-nexus-cyan/30 text-nexus-cyan font-mono text-[10px] flex items-center gap-1 transition-all active:scale-95"
              >
                {copiedMail ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Kopyalandı
                  </>
                ) : isGeneratingMail ? (
                  '...'
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Üret & Kopyala
                  </>
                )}
              </button>
            </div>

            {/* Fast Action 2: RAM Optimizer & Palette Launcher */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleQuickOptimize}
                disabled={isOptimizing}
                className="p-2 rounded-xl bg-nexus-bg/40 border border-nexus-border/40 hover:border-nexus-accent/40 text-left transition-all group flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-white">
                    {optSuccess ? 'Temizlendi!' : isOptimizing ? 'Temizleniyor...' : 'Bellek Boşalt'}
                  </div>
                  <div className="text-[9px] text-nexus-muted font-mono">RAM Flush</div>
                </div>
              </button>

              <button
                onClick={handleOpenPalette}
                className="p-2 rounded-xl bg-nexus-bg/40 border border-nexus-border/40 hover:border-nexus-cyan/40 text-left transition-all group flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center shrink-0">
                  <Search className="w-3 h-3 text-nexus-cyan group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-white">Komut Paleti</div>
                  <div className="text-[9px] text-nexus-muted font-mono">Ctrl + K</div>
                </div>
              </button>
            </div>

            {/* Quick Link Footer */}
            <div className="pt-2 border-t border-nexus-border/30 flex items-center justify-between text-[10px] text-nexus-muted">
              <span className="font-mono">NexusHub v2.0.2</span>
              <button
                onClick={() => {
                  navigate('/sentinel')
                  setIsOpen(false)
                }}
                className="text-nexus-cyan hover:underline flex items-center gap-0.5"
              >
                Sentinel'i Aç <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Orb Core Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={`relative group w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] ${
          isOpen
            ? 'bg-nexus-cyan text-nexus-bg ring-4 ring-nexus-cyan/30'
            : 'bg-gradient-to-tr from-nexus-card via-nexus-bg to-nexus-border/80 border border-nexus-cyan/50 text-nexus-cyan hover:border-nexus-cyan'
        }`}
        title="Nexus Quick Orb Telemetry & Tools"
      >
        {/* Continuous spinning radar ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-nexus-cyan/30 animate-spin [animation-duration:12s] pointer-events-none" />

        {/* Ambient pulse effect */}
        <div className="absolute -inset-1 rounded-full bg-nexus-cyan/20 blur-sm group-hover:bg-nexus-cyan/40 transition-colors pointer-events-none" />

        {/* Inner Icon */}
        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X className="w-5 h-5 transition-transform" />
          ) : (
            <Activity className="w-5 h-5 text-nexus-cyan group-hover:animate-pulse transition-transform" />
          )}
        </div>

        {/* CPU badge indicator dot */}
        <span
          className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-nexus-bg transition-colors ${
            cpuPercent > 80
              ? 'bg-red-500 animate-ping'
              : cpuPercent > 50
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
        />
      </motion.button>
    </div>
  )
}
