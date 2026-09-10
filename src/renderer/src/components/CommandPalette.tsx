import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { detectSmartPaste } from '../lib/smartPasteDetector'
import SmartPasteCard from './SmartPasteCard'
import {
  Search,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Key,
  FolderArchive,
  Clipboard,
  Globe,
  ImageIcon,
  QrCode,
  Braces,
  Settings,
  ArrowRight,
  Sparkles,
  Command,
  FileCheck,
  Activity,
  Code2,
  ShieldAlert,
  Terminal,
  Zap,
  Cpu,
  Send,
  Palette,
  FileText,
  Radio,
  Clock,
} from 'lucide-react'

interface PaletteItem {
  id: string
  title: string
  subtitle: string
  category: 'Tools' | 'Preferences'
  path: string
  icon: React.ElementType
  keywords: string[]
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Overview and status of all ZenDev tools',
    category: 'Tools',
    path: '/',
    icon: LayoutDashboard,
    keywords: ['home', 'overview', 'main', 'start']
  },
  {
    id: 'color-studio',
    title: 'Color & Contrast Studio',
    subtitle: 'HEX/RGB/HSL/CMYK converter, EyeDropper, WCAG 2.1 validator & gradient generator',
    category: 'Tools',
    path: '/color-studio',
    icon: Palette,
    keywords: ['color', 'contrast', 'wcag', 'hex', 'rgb', 'hsl', 'cmyk', 'eyedropper', 'palette', 'gradient']
  },
  {
    id: 'port-killer',
    title: 'Port Killer & TCP Watchdog',
    subtitle: 'Active TCP listeners, PID lookup, process inspector & one-click termination',
    category: 'Tools',
    path: '/port-killer',
    icon: Radio,
    keywords: ['port', 'killer', 'tcp', 'listener', 'pid', 'process', 'kill', 'watchdog', 'netstat']
  },
  {
    id: 'scratchpad',
    title: 'Markdown Scratchpad',
    subtitle: 'Instant live markdown editor with split preview, metrics & export',
    category: 'Tools',
    path: '/scratchpad',
    icon: FileText,
    keywords: ['markdown', 'scratchpad', 'notes', 'editor', 'preview', 'export', 'text']
  },
  {
    id: 'pdf-studio',
    title: 'PDF Studio Pro',
    subtitle: 'Merge multiple PDFs, split by custom page ranges & inspect metadata locally',
    category: 'Tools',
    path: '/pdf-studio',
    icon: FileText,
    keywords: ['pdf', 'merge', 'split', 'pages', 'document', 'combine', 'extract', 'evrak']
  },
  {
    id: 'regex-studio',
    title: 'Regex Lab & Live Tester',
    subtitle: 'Test regular expressions live, view named groups, & cheat sheet',
    category: 'Tools',
    path: '/regex-studio',
    icon: Terminal,
    keywords: ['regex', 'regular', 'expression', 'test', 'tester', 'pattern', 'match']
  },
  {
    id: 'fake-data',
    title: 'Fake Data & Mock Generator',
    subtitle: 'Generate Turkish mock identities, credit cards, phones, and bulk export',
    category: 'Tools',
    path: '/fake-data',
    icon: Zap,
    keywords: ['fake', 'mock', 'data', 'identity', 'generator', 'tc', 'test', 'csv', 'json']
  },
  {
    id: 'curl-runner',
    title: 'HTTP & cURL Runner',
    subtitle: 'Micro API testing client with latency benchmark and JSON viewer',
    category: 'Tools',
    path: '/curl-runner',
    icon: Send,
    keywords: ['curl', 'http', 'api', 'postman', 'fetch', 'rest', 'request']
  },
  {
    id: 'system-optimizer',
    title: 'Windows System Optimizer',
    subtitle: 'Flush DNS resolver cache and purge temporary junk disk files',
    category: 'Tools',
    path: '/system-optimizer',
    icon: Cpu,
    keywords: ['optimizer', 'dns', 'flush', 'temp', 'cleaner', 'purge', 'disk', 'ram', 'speed']
  },
  {
    id: 'hash-studio',
    title: 'Hash & Checksum Studio',
    subtitle: 'Compute MD5, SHA-1, SHA-256, and SHA-512 hashes',
    category: 'Tools',
    path: '/hash-studio',
    icon: FileCheck,
    keywords: ['hash', 'md5', 'sha256', 'sha512', 'checksum', 'verify', 'integrity']
  },
  {
    id: 'qr-code',
    title: 'QR Code Studio',
    subtitle: 'Generate styled QR codes for WiFi, URLs, vCards, & text',
    category: 'Tools',
    path: '/qr-code',
    icon: QrCode,
    keywords: ['qr', 'code', 'wifi', 'vcard', 'barcode', 'svg', 'png']
  },
  {
    id: 'json-studio',
    title: 'JSON, JWT & SQLite Studio',
    subtitle: 'Format/minify JSON, decode JWT & inspect SQLite (.db/.sqlite/.sql) tables locally',
    category: 'Tools',
    path: '/json-studio',
    icon: Braces,
    keywords: ['json', 'jwt', 'token', 'format', 'minify', 'beautify', 'decode', 'sqlite', 'sql', 'db', 'table', 'database']
  },
  {
    id: 'temp-mail',
    title: 'TempMail Generator',
    subtitle: 'Instant disposable mailboxes to bypass spam',
    category: 'Tools',
    path: '/temp-mail',
    icon: Mail,
    keywords: ['email', 'temp', 'fake', 'inbox', 'disposable', 'spam']
  },
  {
    id: 'decrypter',
    title: 'Universal Decrypter',
    subtitle: 'Bypass shortlinks (Aylink, bit.ly) and strip trackers',
    category: 'Tools',
    path: '/decrypter',
    icon: ShieldCheck,
    keywords: ['aylink', 'shortlink', 'bypass', 'clean', 'tracker', 'decrypt']
  },
  {
    id: 'password',
    title: 'Password Generator',
    subtitle: 'Generate secure random passwords, passphrases, and PINs',
    category: 'Tools',
    path: '/password',
    icon: Key,
    keywords: ['pass', 'password', 'pin', 'phrase', 'crypto', 'entropy']
  },
  {
    id: 'organizer',
    title: 'Bulk File Organizer',
    subtitle: 'Sort files into categorized folders automatically',
    category: 'Tools',
    path: '/organizer',
    icon: FolderArchive,
    keywords: ['files', 'folder', 'organize', 'sort', 'clean', 'desktop']
  },
  {
    id: 'clipboard',
    title: 'Clipboard Manager',
    subtitle: 'Search and restore local clipboard history',
    category: 'Tools',
    path: '/clipboard',
    icon: Clipboard,
    keywords: ['copy', 'paste', 'history', 'clipboard', 'text']
  },
  {
    id: 'network',
    title: 'Network Tools',
    subtitle: 'ICMP Ping, DNS resolver, and port scanner',
    category: 'Tools',
    path: '/network',
    icon: Globe,
    keywords: ['ping', 'dns', 'port', 'scan', 'network', 'ip', 'host']
  },
  {
    id: 'image',
    title: 'Image Toolkit',
    subtitle: 'Batch convert, resize, and strip EXIF metadata',
    category: 'Tools',
    path: '/image',
    icon: ImageIcon,
    keywords: ['image', 'convert', 'webp', 'avif', 'png', 'jpg', 'resize', 'exif']
  },
  {
    id: 'sentinel',
    title: 'Resource Sentinel',
    subtitle: 'Real-time CPU/RAM telemetry, per-core load, working set flush',
    category: 'Tools',
    path: '/sentinel',
    icon: Activity,
    keywords: ['sentinel', 'cpu', 'ram', 'memory', 'core', 'telemetry', 'hardware', 'performance', 'optimize']
  },
  {
    id: 'dev-sandbox',
    title: 'Dev Sandbox',
    subtitle: 'Native HTTP/REST & Webhook studio, response inspection & cURL export',
    category: 'Tools',
    path: '/dev-sandbox',
    icon: Code2,
    keywords: ['dev', 'sandbox', 'http', 'api', 'rest', 'webhook', 'curl', 'headers', 'payload', 'fetch']
  },
  {
    id: 'cyber-fortress',
    title: 'Cyber Fortress',
    subtitle: 'DoD 5220.22-M 7-pass file shredder & AES-256-GCM vault',
    category: 'Tools',
    path: '/fortress',
    icon: ShieldAlert,
    keywords: ['cyber', 'fortress', 'shred', 'shredder', 'wipe', 'dod', 'vault', 'aes', 'encrypt', 'decrypt', 'security']
  },
  {
    id: 'account',
    title: 'Account Settings',
    subtitle: 'Manage license tier, activation, and language',
    category: 'Preferences',
    path: '/account',
    icon: Settings,
    keywords: ['license', 'key', 'activate', 'tier', 'settings', 'account', 'language']
  }
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Context-aware Smart Paste / Input detector
  const smartPasteResult = useMemo(() => detectSmartPaste(query), [query])

  // Load recent items
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexus_recent_tools')
      if (stored) {
        setRecentIds(JSON.parse(stored))
      }
    } catch (e) {
      console.error(e)
    }
  }, [isOpen])

  // Listen for Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleCustomOpen = () => {
      setIsOpen(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('nexus:open-palette', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('nexus:open-palette', handleCustomOpen)
    }
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Filter & sort items based on query + recents
  const filteredItems = (() => {
    if (!query.trim()) {
      // Put recent items first
      const recents = recentIds
        .map((id) => PALETTE_ITEMS.find((item) => item.id === id))
        .filter(Boolean) as PaletteItem[]
      const others = PALETTE_ITEMS.filter((item) => !recentIds.includes(item.id))
      return [...recents, ...others]
    }
    const q = query.toLowerCase()
    return PALETTE_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  })()

  // Keyboard navigation inside palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (smartPasteResult && smartPasteResult.type === 'math') {
        navigator.clipboard.writeText(smartPasteResult.result)
        setQuery(smartPasteResult.result)
        return
      }
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex].id, filteredItems[selectedIndex].path)
      }
    }
  }

  const handleSelectItem = (id: string, path: string) => {
    try {
      const nextRecents = [id, ...recentIds.filter((x) => x !== id)].slice(0, 5)
      localStorage.setItem('nexus_recent_tools', JSON.stringify(nextRecents))
    } catch (e) {
      console.error(e)
    }
    navigate(path)
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl glass-panel rounded-2xl border border-nexus-cyan/30 shadow-2xl overflow-hidden z-10 flex flex-col bg-nexus-surface/95"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
              <Search className="w-5 h-5 text-nexus-cyan shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a command or search tools..."
                className="w-full bg-transparent text-sm text-white placeholder-nexus-muted focus:outline-none"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-nexus-surface border border-white/10 text-[10px] text-nexus-muted font-mono">
                <span>ESC</span>
              </div>
            </div>

            {/* Context-Aware Smart Paste Detector Result */}
            {smartPasteResult && (
              <SmartPasteCard
                result={smartPasteResult}
                onApplyResult={(val) => setQuery(val)}
                onClose={() => setIsOpen(false)}
              />
            )}

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-nexus-muted">
                  No matching tools found for "{query}"
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon
                  const isSelected = index === selectedIndex
                  const isRecent = !query.trim() && recentIds.includes(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item.id, item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-nexus-cyan/20 to-nexus-accent/10 border border-nexus-cyan/30 text-white'
                          : 'text-nexus-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-nexus-cyan/20 text-nexus-cyan' : 'bg-white/5 text-nexus-muted'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            {item.title}
                            {isRecent && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-normal">
                                <Clock className="w-2.5 h-2.5" /> Recent
                              </span>
                            )}
                            <span className="text-[10px] text-nexus-muted px-1.5 py-0.2 rounded bg-white/5 font-normal">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-nexus-muted line-clamp-1">{item.subtitle}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-nexus-cyan text-xs font-medium">
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-nexus-bg/50 border-t border-white/5 text-[11px] text-nexus-muted font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↵</span> Select
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-nexus-cyan" />
                <span>ZenDev Quick Switcher</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
