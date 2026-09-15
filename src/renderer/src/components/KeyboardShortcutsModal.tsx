import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X, Command, Sparkles, Volume2, Pin, Search } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'
import { useT } from '../lib/i18n'

interface ShortcutItem {
  keys: string[]
  keyName: string
  category: 'global' | 'tools' | 'editor'
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], keyName: 'cmdPalette', category: 'global' },
  { keys: ['Ctrl', 'Shift', 'Space'], keyName: 'miniHud', category: 'global' },
  { keys: ['Ctrl', 'Shift', 'T'], keyName: 'pinToTop', category: 'global' },
  { keys: ['Ctrl', 'Shift', 'S'], keyName: 'toggleSfx', category: 'global' },
  { keys: ['?'], keyName: 'toggleGuide', category: 'global' },
  { keys: ['Esc'], keyName: 'closeEsc', category: 'global' },

  { keys: ['Ctrl', 'F'], keyName: 'scratchpadFind', category: 'editor' },
  { keys: ['Ctrl', 'S'], keyName: 'scratchpadSave', category: 'editor' },
  { keys: ['Tab'], keyName: 'scratchpadIndent', category: 'editor' },

  { keys: ['Alt', 'D'], keyName: 'gotoDashboard', category: 'tools' },
  { keys: ['Alt', 'O'], keyName: 'gotoOptimizer', category: 'tools' },
  { keys: ['Alt', 'P'], keyName: 'gotoPortKiller', category: 'tools' },
  { keys: ['Alt', 'F'], keyName: 'gotoFortress', category: 'tools' },
]

export default function KeyboardShortcutsModal() {
  const { t, language } = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input, textarea or contenteditable
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setIsOpen((prev) => {
          if (!prev) cyberAudio.click()
          return !prev
        })
      } else if (e.key === 'F1' && !isInput) {
        e.preventDefault()
        setIsOpen((prev) => {
          if (!prev) cyberAudio.click()
          return !prev
        })
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    const handleCustomOpen = () => {
      setIsOpen(true)
      cyberAudio.click()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('nexus:toggle-shortcuts', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('nexus:toggle-shortcuts', handleCustomOpen)
    }
  }, [isOpen])

  const filteredShortcuts = SHORTCUTS.map((s) => ({
    ...s,
    desc: t(`shortcutsModal.${s.keyName}`)
  })).filter(
    (s) =>
      s.desc.toLowerCase().includes(filter.toLowerCase()) ||
      s.keys.some((k) => k.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-nexus-surface/95 border border-nexus-accent/40 rounded-3xl p-6 shadow-2xl shadow-nexus-accent/15 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nexus-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center text-nexus-accent shadow-md">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {t('shortcutsModal.title')}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/30">
                      {t('shortcutsModal.badge')}
                    </span>
                  </h2>
                  <p className="text-xs text-nexus-muted mt-0.5">
                    {t('shortcutsModal.desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-nexus-muted hover:text-white hover:bg-nexus-bg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter search bar */}
            <div className="mt-4 mb-3 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nexus-muted" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('shortcutsModal.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-nexus-bg/80 border border-nexus-border/50 rounded-xl text-xs text-white placeholder:text-nexus-muted outline-none focus:border-nexus-cyan/60 transition-colors"
                autoFocus
              />
            </div>

            {/* Shortcut List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {filteredShortcuts.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-nexus-bg/50 border border-nexus-border/20 hover:border-nexus-accent/30 transition-all text-xs"
                >
                  <span className="text-nexus-text font-medium">{s.desc}</span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {s.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 rounded-lg bg-nexus-surface border border-nexus-border/70 text-nexus-cyan font-mono text-[11px] font-bold shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-8 text-xs text-nexus-muted font-mono">
                  {t('shortcutsModal.noResults')}
                </div>
              )}
            </div>

            {/* Footer quick hint */}
            <div className="pt-3 border-t border-nexus-border/30 flex items-center justify-between text-[11px] font-mono text-nexus-muted">
              <span>
                {language === 'tr' ? (
                  <>
                    İpucu: Bu pencereyi istediğiniz zaman <kbd className="px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-cyan border border-nexus-border">?</kbd> tuşuna basarak açabilirsiniz.
                  </>
                ) : (
                  <>
                    Tip: You can open this window anytime by pressing <kbd className="px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-cyan border border-nexus-border">?</kbd>
                  </>
                )}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-nexus-accent/20 hover:bg-nexus-accent/30 border border-nexus-accent/40 text-nexus-accent font-bold cursor-pointer transition-all"
              >
                {t('shortcutsModal.close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
