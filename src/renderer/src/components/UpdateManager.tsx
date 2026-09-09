import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, ArrowRight, RefreshCw, X, CheckCircle2 } from 'lucide-react'

export default function UpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    const api = window.nexusAPI?.updater
    if (!api) return

    const unbindAvailable = api.onAvailable?.((info: any) => {
      if (info?.version) {
        setUpdateAvailable(info.version)
      }
    })

    const unbindProgress = api.onProgress?.((progress: any) => {
      if (typeof progress?.percent === 'number') {
        setDownloadProgress(progress.percent)
      }
    })

    const unbindDownloaded = api.onDownloaded?.((info: any) => {
      setDownloadedVersion(info?.version || 'Yeni Sürüm')
      setDownloadProgress(null)
      setIsDismissed(false)
    })

    return () => {
      unbindAvailable?.()
      unbindProgress?.()
      unbindDownloaded?.()
    }
  }, [])

  const handleInstallNow = () => {
    setIsInstalling(true)
    // Small delay so the user sees the Discord-style updating transition
    setTimeout(() => {
      window.nexusAPI?.updater?.installNow?.()
    }, 450)
  }

  return (
    <>
      {/* 1. Fullscreen Discord-Style Cyber Updating Splash */}
      <AnimatePresence>
        {isInstalling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-nexus-bg/95 backdrop-blur-2xl text-nexus-text select-none cursor-wait"
          >
            {/* Ambient Background Pulse */}
            <div className="absolute w-[500px] h-[500px] bg-nexus-cyan/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

            {/* Cyber Radar Rings & Logo */}
            <div className="relative mb-8 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border border-dashed border-nexus-cyan/40 animate-spin [animation-duration:8s]" />
              <div className="absolute w-20 h-20 rounded-full border border-nexus-accent/40 animate-spin [animation-duration:12s] [animation-direction:reverse]" />
              <div className="absolute w-14 h-14 rounded-2xl bg-gradient-to-tr from-nexus-cyan via-nexus-accent to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.6)]">
                <RefreshCw className="w-7 h-7 text-nexus-bg animate-spin [animation-duration:3s]" />
              </div>
            </div>

            {/* Text & Status */}
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-mono text-2xl font-bold tracking-wider text-white mb-2"
            >
              NexusHub Güncelleniyor...
            </motion.h2>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-nexus-muted text-center max-w-md mb-6 leading-relaxed"
            >
              Yeni sürüm uygulanıyor ve NexusHub otomatik olarak yeniden başlatılıyor.
              <br />
              <span className="text-xs text-nexus-cyan/80 font-mono">
                Lütfen uygulamayı kapatmayın...
              </span>
            </motion.p>

            {/* Glowing Progress Bar Simulator */}
            <div className="w-64 h-1.5 bg-nexus-border/60 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-nexus-cyan via-nexus-accent to-emerald-400 rounded-full"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Download In-Progress Subtle Toast (Top-Right) */}
      <AnimatePresence>
        {downloadProgress !== null && downloadProgress < 100 && !downloadedVersion && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-12 right-6 z-[990] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-nexus-card/90 backdrop-blur-xl border border-nexus-cyan/40 shadow-[0_8px_30px_rgba(0,0,0,0.5)] text-xs text-nexus-text"
          >
            <div className="w-6 h-6 rounded-lg bg-nexus-cyan/15 border border-nexus-cyan/30 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 text-nexus-cyan animate-bounce" />
            </div>
            <div>
              <div className="font-medium text-white flex items-center gap-1.5">
                <span>Güncelleme İndiriliyor</span>
                <span className="font-mono text-nexus-cyan font-bold">%{downloadProgress}</span>
              </div>
              <div className="w-36 h-1 bg-nexus-border/80 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-nexus-cyan to-nexus-accent transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Discord-Style Floating Update Ready Banner (Top-Center) */}
      <AnimatePresence>
        {downloadedVersion && !isDismissed && !isInstalling && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[990] flex items-center gap-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-nexus-card via-nexus-card to-nexus-bg border border-nexus-cyan/60 shadow-[0_12px_45px_rgba(6,182,212,0.35)] select-none"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-nexus-cyan/20 to-emerald-500/20 border border-nexus-cyan/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-nexus-cyan animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>NexusHub Güncellemesi Hazır</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-nexus-cyan/15 text-nexus-cyan font-mono text-[10px] border border-nexus-cyan/30">
                    {downloadedVersion}
                  </span>
                </div>
                <div className="text-[11px] text-nexus-muted">
                  Yeni özellikler ve optimizasyonlar yüklendi.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-nexus-border/60">
              <button
                type="button"
                onClick={handleInstallNow}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-bold font-mono text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
              >
                <span>Yeniden Başlat & Kur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-border/40 transition-colors"
                title="Daha Sonra"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
