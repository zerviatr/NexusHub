import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, Mail, Hash, Shield, Terminal, ArrowRight, X, Cpu, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cyberAudio } from '../lib/cyberAudio'

export default function MiniHud() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [quickHash, setQuickHash] = useState('')
  const [quickResult, setQuickResult] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Listen to global IPC shortcut or window custom event
    const unbind = window.nexusAPI?.onHudToggle?.(() => {
      setIsOpen((prev) => !prev)
      cyberAudio.navigate()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        cyberAudio.navigate()
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleCustomToggle = () => {
      setIsOpen((prev) => !prev)
      cyberAudio.navigate()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('nexus:toggle-hud', handleCustomToggle)
    return () => {
      unbind?.()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('nexus:toggle-hud', handleCustomToggle)
    }
  }, [isOpen])

  const handleComputeQuickHash = async (val: string) => {
    setQuickHash(val)
    if (!val.trim()) {
      setQuickResult('')
      return
    }
    try {
      const buffer = new TextEncoder().encode(val)
      const digest = await crypto.subtle.digest('SHA-256', buffer)
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      setQuickResult(hex)
    } catch {
      setQuickResult('')
    }
  }

  const handleGo = (path: string) => {
    cyberAudio.click()
    setIsOpen(false)
    navigate(path)
  }

  const quickActions = [
    { name: 'Regex Lab', path: '/regex-studio', icon: Terminal, desc: 'Canlı Regex test ve grup analizi' },
    { name: 'Fake Data', path: '/fake-data', icon: Zap, desc: 'Sahte kimlik & Mock test verisi' },
    { name: 'System Optimizer', path: '/system-optimizer', icon: Cpu, desc: 'DNS temizleme & Temp disk alanı' },
    { name: 'cURL Runner', path: '/curl-runner', icon: Globe, desc: 'Micro HTTP API istek testi' },
    { name: 'TempMail', path: '/temp-mail', icon: Mail, desc: 'Anlık tek kullanımlık e-posta' },
    { name: 'Cyber Fortress', path: '/fortress', icon: Shield, desc: 'DoD 7-pass shredder & AES vault' },
  ]

  const filtered = quickActions.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -20 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl bg-nexus-surface/95 border border-nexus-accent/30 rounded-2xl shadow-2xl shadow-nexus-accent/10 overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-nexus-border/30 bg-nexus-surface/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-nexus-accent animate-pulse" />
              <span className="text-xs font-mono font-semibold tracking-wider text-nexus-accent uppercase">
                Nexus Mini-HUD <span className="text-nexus-muted font-normal">(Ctrl+Shift+Space)</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-nexus-muted hover:text-nexus-text transition-colors p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Hash Box */}
          <div className="p-4 bg-nexus-bg/50 border-b border-nexus-border/20">
            <label className="text-[11px] font-mono text-nexus-muted mb-1.5 block flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-nexus-cyan" /> Anlık Hızlı SHA-256 Hesaplayıcı
            </label>
            <input
              type="text"
              value={quickHash}
              onChange={(e) => handleComputeQuickHash(e.target.value)}
              placeholder="Herhangi bir metin yaz..."
              className="w-full bg-nexus-surface border border-nexus-border/40 rounded-lg px-3 py-2 text-xs text-nexus-text font-mono focus:outline-none focus:border-nexus-cyan transition-colors"
            />
            {quickResult && (
              <div
                onClick={() => {
                  navigator.clipboard.writeText(quickResult)
                  cyberAudio.copySuccess()
                }}
                className="mt-2 text-[11px] font-mono text-nexus-cyan bg-nexus-cyan/10 border border-nexus-cyan/20 p-2 rounded truncate cursor-pointer hover:bg-nexus-cyan/20 transition-colors flex items-center justify-between"
                title="Kopyalamak için tıkla"
              >
                <span className="truncate">{quickResult}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 bg-nexus-cyan/30 rounded shrink-0 ml-2">Kopyala</span>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-nexus-border/30">
            <Search className="w-4 h-4 text-nexus-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Araç veya işlem ara (örn: regex, optimizer, mock, mail)..."
              className="flex-1 bg-transparent border-none text-sm text-nexus-text placeholder-nexus-muted focus:outline-none font-sans"
            />
          </div>

          {/* Tool Grid */}
          <div className="p-3 max-h-72 overflow-y-auto space-y-1">
            {filtered.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => handleGo(item.path)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-nexus-accent/10 border border-transparent hover:border-nexus-accent/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nexus-bg flex items-center justify-center text-nexus-accent group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-nexus-text group-hover:text-nexus-accent transition-colors">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-nexus-muted">{item.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-nexus-muted group-hover:text-nexus-accent group-hover:translate-x-0.5 transition-all" />
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-nexus-bg/70 border-t border-nexus-border/20 flex items-center justify-between text-[11px] text-nexus-muted">
            <span>ESC ile kapat</span>
            <span className="font-mono text-nexus-accent">NexusHub HUD v2.5</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
