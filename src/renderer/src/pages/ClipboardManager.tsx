import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ClipboardEntry } from '../lib/ipc'
import { useT } from '../lib/i18n'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatBytes(text: string): string {
  const bytes = new TextEncoder().encode(text).length
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export default function ClipboardManager() {
  const { t } = useT()
  const [history, setHistory] = useState<ClipboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const refresh = async () => {
    setIsLoading(true)
    try {
      const entries = await nexusAPI.clipboard.getHistory()
      setHistory(entries)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // Poll every 2s to pick up new clipboard activity
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleCopy = async (entry: ClipboardEntry) => {
    await nexusAPI.clipboard.write(entry.text)
    setCopied(entry.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async (id: string) => {
    await nexusAPI.clipboard.delete(id)
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  const handleClearAll = async () => {
    await nexusAPI.clipboard.clear()
    setHistory([])
  }

  const filtered = history.filter(
    (e) =>
      !search ||
      e.text.toLowerCase().includes(search.toLowerCase()) ||
      e.preview.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <BaseToolTemplate
      icon={Clipboard}
      title={t('nav.tools.clipboardManager') || "Clipboard Manager"}
      description={t('dashboard.tools.clipboardManager.desc') || "Tracks your clipboard history automatically. Click any entry to copy it back. Up to 50 entries stored in-memory."}
      gradient="from-sky-500 to-indigo-600"
    >
      {/* Controls */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted" />
          <input
            id="clipboard-search"
            type="text"
            placeholder={t('clipboard.search') || "Search history..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-nexus-card border border-nexus-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-nexus-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={refresh}
          className="p-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-muted hover:text-sky-400 hover:border-sky-500/40 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </motion.button>
        {history.length > 0 && (
          <motion.button
            id="clipboard-clear-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handleClearAll}
            className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('clipboard.clear') || "Clear All"}
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t('clipboard.total') || 'Total Entries', value: history.length, color: 'text-sky-400' },
          { label: t('clipboard.shown') || 'Shown', value: filtered.length, color: 'text-nexus-accent' },
          {
            label: t('clipboard.latest') || 'Latest',
            value: history[0] ? timeAgo(history[0].timestamp) : '—',
            color: 'text-nexus-muted',
          },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-nexus-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-nexus-muted animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Clipboard className="w-8 h-8 text-nexus-muted/30 mb-3" />
            <p className="text-sm text-nexus-muted">
              {search 
                ? t('clipboard.noSearch') || 'No entries match your search.' 
                : t('clipboard.noHistory') || 'No clipboard history yet. Copy something!'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((entry, i) => {
              const isExpanded = expanded === entry.id
              const isLong = entry.text.length > 120

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-3.5 group hover:border-sky-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-nexus-text font-mono leading-relaxed ${isLong && !isExpanded ? 'line-clamp-2' : ''}`}>
                        {entry.text}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                          className="text-[10px] text-sky-400 hover:text-sky-300 mt-1 transition-colors"
                        >
                          {isExpanded 
                            ? t('clipboard.showLess') || 'Show less' 
                            : t('clipboard.showMore', { count: entry.text.length }) || `Show more (${entry.text.length} chars)`}
                        </button>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-nexus-muted">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(entry.timestamp)}
                        </span>
                        <span className="text-[10px] text-nexus-muted">{formatBytes(entry.text)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleCopy(entry)}
                        className="p-1.5 rounded-lg hover:bg-sky-500/20 text-nexus-muted hover:text-sky-400 transition-colors"
                        title={t('clipboard.copy') || "Copy to clipboard"}
                      >
                        {copied === entry.id ? (
                          <Check className="w-3.5 h-3.5 text-nexus-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-nexus-muted hover:text-red-400 transition-colors"
                        title={t('clipboard.delete') || "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </BaseToolTemplate>
  )
}
