import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clipboard,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  X,
  Clock,
  Loader2,
  Code2,
  Link2,
  Palette,
  Shield,
  Eye,
  EyeOff,
  Pin,
  Sparkles,
  Lock,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ClipboardEntry } from '../lib/ipc'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'

import { cyberAudio } from '../lib/cyberAudio'

type CategoryFilter = 'all' | 'code' | 'urls' | 'colors' | 'sensitive'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s önce`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}dk önce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}sa önce`
  return `${Math.floor(h / 24)}g önce`
}

function formatBytes(text: string): string {
  const bytes = new TextEncoder().encode(text).length
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

// ── Smart Classifiers ────────────────────────────────────────────────────────
function isUrl(text: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(text.trim())
}

function isColor(text: string): boolean {
  const t = text.trim()
  return (
    /^#(?:[0-9a-fA-F]{3,4}){1,2}$/.test(t) ||
    /^rgba?\([^)]+\)$/i.test(t) ||
    /^hsla?\([^)]+\)$/i.test(t)
  )
}

function isCode(text: string): boolean {
  const t = text.trim()
  return (
    (t.includes('{') && t.includes('}')) ||
    (t.includes('function') || t.includes('const ') || t.includes('import ') || t.includes('class ')) ||
    (t.startsWith('<') && t.endsWith('>')) ||
    (t.startsWith('{') && t.endsWith('}')) ||
    (t.startsWith('[') && t.endsWith(']'))
  )
}

function isSensitive(text: string): boolean {
  const t = text.trim()
  return (
    /^eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}$/.test(t) || // JWT
    /ghp_[a-zA-Z0-9]{30,}/.test(t) || // GitHub PAT
    /AKIA[0-9A-Z]{16}/.test(t) || // AWS Access Key
    /sk-[a-zA-Z0-9]{30,}/.test(t) || // OpenAI / Claude API keys
    /sk_live_[a-zA-Z0-9]{24,}/.test(t) || // Stripe Live Key
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/.test(t.replace(/[\s-]/g, '')) || // Credit Cards
    /\b[1-9][0-9]{10}\b/.test(t) || // TC No
    /-----BEGIN[ A-Z_-]+KEY-----/.test(t) || // Private Keys
    /(?:bearer|api_key|token|secret|password|passwd|sifre)[=:\s]{1,5}["']?[a-zA-Z0-9_\-.]{10,}["']?/i.test(t)
  )
}

export default function ClipboardManager() {
  const { t } = useT()
  const { success: showToastSuccess } = useToast()

  const [history, setHistory] = useState<ClipboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Masking state: set of revealed sensitive IDs
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())

  // Pinned entries persisted in localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nexus_pinned_clipboard') || '[]')
    } catch {
      return []
    }
  })

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [id, ...prev]
      localStorage.setItem('nexus_pinned_clipboard', JSON.stringify(next))
      return next
    })
  }

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRevealedSecrets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const refresh = async () => {
    try {
      const entries = await nexusAPI.clipboard.getHistory()
      setHistory(entries)
    } finally {
      setIsLoading(false)
    }
  }

  const [isVisible, setIsVisible] = useState(() => (typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true))

  // Listen to desktop tray sleep/wake lifecycle events
  useEffect(() => {
    const handleVisChange = (e: any) => {
      const visible = e.detail?.visible !== undefined ? Boolean(e.detail.visible) : (document.visibilityState !== 'hidden')
      setIsVisible(visible)
      if (visible) refresh()
    }
    const handleDomVis = () => {
      const visible = document.visibilityState !== 'hidden'
      setIsVisible(visible)
      if (visible) refresh()
    }

    window.addEventListener('nexus:app-visibility' as any, handleVisChange)
    document.addEventListener('visibilitychange', handleDomVis)

    const unbindIpc = nexusAPI.onVisibilityChange?.((visible: boolean) => {
      setIsVisible(visible)
      if (visible) refresh()
    })

    return () => {
      window.removeEventListener('nexus:app-visibility' as any, handleVisChange)
      document.removeEventListener('visibilitychange', handleDomVis)
      unbindIpc?.()
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [isVisible])

  const handleCopy = async (entry: ClipboardEntry) => {
    await nexusAPI.clipboard.write(entry.text)
    setCopied(entry.id)
    showToastSuccess('Kopyalandı', 'İçerik panoya geri yüklendi.')
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await nexusAPI.clipboard.delete(id)
    setHistory((prev) => prev.filter((e) => e.id !== id))
    setPinnedIds((prev) => {
      const next = prev.filter((i) => i !== id)
      localStorage.setItem('nexus_pinned_clipboard', JSON.stringify(next))
      return next
    })
  }

  const handleClearAll = async () => {
    await nexusAPI.clipboard.clear()
    setHistory([])
    setPinnedIds([])
    localStorage.removeItem('nexus_pinned_clipboard')
    showToastSuccess('Temizlendi', 'Tüm pano geçmişi silindi.')
  }

  // Filter and sort entries (pinned items on top)
  const filtered = useMemo(() => {
    let list = history.filter((e) => {
      const matchesSearch =
        !search ||
        e.text.toLowerCase().includes(search.toLowerCase()) ||
        e.preview.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (category === 'code') return isCode(e.text)
      if (category === 'urls') return isUrl(e.text)
      if (category === 'colors') return isColor(e.text)
      if (category === 'sensitive') return isSensitive(e.text)
      return true
    })

    // Sort pinned items to the very top
    return list.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id)
      const bPinned = pinnedIds.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.timestamp - a.timestamp
    })
  }, [history, search, category, pinnedIds])

  return (
    <BaseToolTemplate
      icon={Clipboard}
      title={t('nav.tools.clipboardManager') || 'Smart Clipboard Manager'}
      description={
        t('dashboard.tools.clipboardManager.desc') ||
        'Pano geçmişini otomatik kaydeder, hassas verileri gizler (maskeleme), kod ve linkleri akıllıca kategorize eder.'
      }
      gradient="from-sky-500 to-indigo-600"
    >
      <div className="space-y-5">
        {/* Controls & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted" />
            <input
              id="clipboard-search"
              type="text"
              placeholder={t('clipboard.search') || 'Pano geçmişinde ara...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-nexus-card border border-nexus-border rounded-xl pl-9 pr-8 py-2.5 text-xs text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-sky-500 transition-colors font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={refresh}
              className="p-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-muted hover:text-sky-400 hover:border-sky-500/40 transition-all"
              title="Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>

            {history.length > 0 && (
              <motion.button
                id="clipboard-clear-btn"
                whileTap={{ scale: 0.95 }}
                onClick={handleClearAll}
                className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('clipboard.clear') || 'Tümünü Temizle'}</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-nexus-card rounded-xl border border-nexus-border/50 overflow-x-auto">
          {[
            { id: 'all', label: 'Tümü', icon: Clipboard, count: history.length },
            {
              id: 'code',
              label: 'Kod & Veri',
              icon: Code2,
              count: history.filter((e) => isCode(e.text)).length,
            },
            {
              id: 'urls',
              label: 'Bağlantılar',
              icon: Link2,
              count: history.filter((e) => isUrl(e.text)).length,
            },
            {
              id: 'colors',
              label: 'Renkler',
              icon: Palette,
              count: history.filter((e) => isColor(e.text)).length,
            },
            {
              id: 'sensitive',
              label: 'Hassas & Token',
              icon: Shield,
              count: history.filter((e) => isSensitive(e.text)).length,
            },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setCategory(id as CategoryFilter)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                category === id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-nexus-muted hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    category === id ? 'bg-white/20 text-white' : 'bg-nexus-bg text-nexus-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {isLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center glass-card"
            >
              <Clipboard className="w-10 h-10 text-nexus-muted/30 mb-3" />
              <p className="text-sm font-medium text-nexus-muted">
                {search
                  ? 'Aramanızla eşleşen hiçbir pano kaydı bulunamadı.'
                  : 'Bu kategoride henüz pano kaydı yok.'}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filtered.map((entry, i) => {
                const isExpanded = expanded === entry.id
                const isLong = entry.text.length > 140
                const sensitive = isSensitive(entry.text)
                const isRevealed = revealedSecrets.has(entry.id)
                const isPinned = pinnedIds.includes(entry.id)
                const isColorItem = isColor(entry.text)

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleCopy(entry)}
                    className={`glass-card p-4 group cursor-pointer transition-all hover:border-sky-500/40 relative overflow-hidden ${
                      isPinned ? 'border-sky-500/30 bg-sky-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Color Preview Swatch or Category Icon */}
                      {isColorItem ? (
                        <div
                          className="w-8 h-8 rounded-xl border border-white/20 shrink-0 shadow-md"
                          style={{ backgroundColor: entry.text.trim() }}
                        />
                      ) : sensitive ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : isCode(entry.text) ? (
                        <div className="w-8 h-8 rounded-xl bg-nexus-cyan/15 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan shrink-0">
                          <Code2 className="w-4 h-4" />
                        </div>
                      ) : isUrl(entry.text) ? (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                          <Link2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-nexus-card border border-white/5 flex items-center justify-center text-nexus-muted shrink-0">
                          <Clipboard className="w-4 h-4" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {sensitive && !isRevealed ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
                            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">•••••••••••••••••••••••••••••••• (Gizli Anahtar Maskelendi)</span>
                            <button
                              onClick={(e) => toggleReveal(entry.id, e)}
                              className="ml-auto p-1 rounded hover:bg-amber-500/20 text-amber-400"
                              title="Maskeyi Kaldır"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p
                              className={`text-xs text-nexus-text font-mono leading-relaxed select-text ${
                                isLong && !isExpanded ? 'line-clamp-2' : ''
                              }`}
                            >
                              {entry.text}
                            </p>
                            {sensitive && isRevealed && (
                              <button
                                onClick={(e) => toggleReveal(entry.id, e)}
                                className="text-[10px] text-amber-400 hover:underline mt-1 flex items-center gap-1"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Maskeyi Tekrar Aç</span>
                              </button>
                            )}
                          </>
                        )}

                        {isLong && (!sensitive || isRevealed) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpanded(isExpanded ? null : entry.id)
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 mt-1 transition-colors"
                          >
                            {isExpanded ? 'Daha az göster' : `Tümünü göster (${entry.text.length} karakter)`}
                          </button>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[10px] text-nexus-muted">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(entry.timestamp)}
                          </span>
                          <span className="text-[10px] text-nexus-muted font-mono">
                            {formatBytes(entry.text)}
                          </span>
                          {isPinned && (
                            <span className="hud-badge text-[9px] text-sky-400 flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" /> Sabitlendi
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => togglePin(entry.id, e)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPinned
                              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                              : 'bg-nexus-card border-white/5 text-nexus-muted hover:text-white'
                          }`}
                          title={isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(entry)
                          }}
                          className="p-1.5 rounded-lg bg-nexus-card hover:bg-sky-500/20 border border-white/5 text-nexus-muted hover:text-sky-400 transition-colors"
                          title="Kopyala"
                        >
                          {copied === entry.id ? (
                            <Check className="w-3.5 h-3.5 text-nexus-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={(e) => handleDelete(entry.id, e)}
                          className="p-1.5 rounded-lg bg-nexus-card hover:bg-red-500/20 border border-white/5 text-nexus-muted hover:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </BaseToolTemplate>
  )
}
