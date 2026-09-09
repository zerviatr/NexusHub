import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Eye,
  EyeOff,
  Sliders,
  Hash,
  Type,
  BookmarkPlus,
  Search,
  Trash2,
  Download,
  Upload,
  User,
  Tag,
  FileText,
  X,
  Lock,
  Sparkles,
  Layers,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'
import {
  type SavedPasswordItem,
  saveEncryptedVault,
  loadDecryptedVault,
} from '../lib/vaultCrypto'

// ─── Strength keys ───────────────────────────────────────────────────────────
type StrengthKey = 'none' | 'weak' | 'fair' | 'good' | 'strong'

function estimateStrength(password: string): { score: number; key: StrengthKey; color: string } {
  if (!password) return { score: 0, key: 'none', color: '#374151' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[a-z]/.test(password))          score++
  if (/[A-Z]/.test(password))          score++
  if (/[0-9]/.test(password))          score++
  if (/[^a-zA-Z0-9]/.test(password))   score++
  if (password.length >= 20) score++

  if (score <= 2) return { score: score / 8, key: 'weak',   color: '#ef4444' }
  if (score <= 4) return { score: score / 8, key: 'fair',   color: '#f59e0b' }
  if (score <= 6) return { score: score / 8, key: 'good',   color: '#3b82f6' }
  return           { score: score / 8, key: 'strong', color: '#22c55e' }
}

export function calculateEntropy(pwd: string): number {
  if (!pwd) return 0
  let pool = 0
  if (/[a-z]/.test(pwd)) pool += 26
  if (/[A-Z]/.test(pwd)) pool += 26
  if (/[0-9]/.test(pwd)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32
  if (pool === 0) pool = 10
  return Math.round(pwd.length * Math.log2(pool))
}

export async function checkPwnedPassword(password: string): Promise<{ breached: boolean; count: number }> {
  if (!password) return { breached: false, count: 0 }
  try {
    const enc = new TextEncoder().encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', enc)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    const prefix = hashHex.slice(0, 5)
    const suffix = hashHex.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
    if (!res.ok) throw new Error('Pwned API error')
    const text = await res.text()
    const lines = text.split('\n')
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        return { breached: true, count: parseInt(countStr, 10) || 1 }
      }
    }
    return { breached: false, count: 0 }
  } catch {
    return { breached: false, count: 0 }
  }
}

// ─── Word list for passphrase ─────────────────────────────────────────────────
const WORDLIST = [
  'apple','bridge','castle','dragon','eagle','forest','garden','harbor',
  'island','jungle','knight','lemon','mountain','needle','ocean','palace',
  'quartz','river','silver','thunder','umbrella','valley','whisper','xerox',
  'yellow','zenith','anchor','breeze','crimson','dagger','eclipse','falcon',
  'glacier','hollow','ivory','jasper','kernel','lantern','mosaic','nectar',
  'oracle','pepper','rabbit','summit','tiger','united','vortex','walnut',
  'xenon','yogurt','zealot','arctic','blaze','cobalt','dusk','ember',
  'flame','gravel','haze','impact','jade','kindred','lunar','mirage',
]

// ─── Character sets ───────────────────────────────────────────────────────────
const CHARS = {
  lower:     'abcdefghijklmnopqrstuvwxyz',
  upper:     'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits:    '0123456789',
  symbols:   '!@#$%^&*()-_=+[]{}|;:,.<>?',
  ambiguous: 'iIlL1oO0',
}

function generatePassword(opts: {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}): string {
  let pool = ''
  if (opts.lower)   pool += CHARS.lower
  if (opts.upper)   pool += CHARS.upper
  if (opts.digits)  pool += CHARS.digits
  if (opts.symbols) pool += CHARS.symbols
  if (opts.excludeAmbiguous) {
    for (const ch of CHARS.ambiguous) pool = pool.replace(new RegExp(ch, 'g'), '')
  }
  if (!pool) pool = CHARS.lower + CHARS.digits

  const arr = new Uint32Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((n) => pool[n % pool.length]).join('')
}

function generatePassphrase(words: number, delimiter: string, capitalize: boolean): string {
  const arr = new Uint32Array(words)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((n) => {
      const w = WORDLIST[n % WORDLIST.length]
      return capitalize ? w[0].toUpperCase() + w.slice(1) : w
    })
    .join(delimiter)
}

function generatePin(length: number): string {
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((n) => n % 10).join('')
}

type MainTab = 'generator' | 'vault'
type Mode = 'password' | 'passphrase' | 'pin'

export default function PasswordGenerator() {
  const { t } = useT()

  // Top Level Navigation Tab
  const [mainTab, setMainTab] = useState<MainTab>('generator')

  // Generator State
  const [mode, setMode] = useState<Mode>('password')
  const [generated, setGenerated] = useState('')
  const [bulkResults, setBulkResults] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(true)

  // Password Options
  const [length, setLength]                   = useState(16)
  const [useLower, setUseLower]               = useState(true)
  const [useUpper, setUseUpper]               = useState(true)
  const [useDigits, setUseDigits]             = useState(true)
  const [useSymbols, setUseSymbols]           = useState(false)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)

  // Passphrase Options
  const [wordCount, setWordCount]           = useState(4)
  const [delimiter, setDelimiter]           = useState('-')
  const [capitalizeWords, setCapitalizeWords] = useState(true)

  // PIN Options
  const [pinLength, setPinLength] = useState(6)

  // Bulk Generator
  const [bulkCount, setBulkCount] = useState(10)

  // ─── Vault State ─────────────────────────────────────────────────────────────
  const [vaultItems, setVaultItems] = useState<SavedPasswordItem[]>([])
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveUsername, setSaveUsername] = useState('')
  const [saveCategory, setSaveCategory] = useState('social')
  const [saveNotes, setSaveNotes] = useState('')
  const [saveToast, setSaveToast] = useState(false)

  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState('all')
  const [revealedVaultIds, setRevealedVaultIds] = useState<Record<string, boolean>>({})

  // Load vault items on mount
  useEffect(() => {
    loadDecryptedVault().then((items) => {
      if (Array.isArray(items)) {
        setVaultItems(items)
      }
    })
  }, [])

  const { success: showToastSuccess, error: showToastError } = useToast()

  const [pwnedResult, setPwnedResult] = useState<{ checked: boolean; breached: boolean; count: number; loading: boolean }>({
    checked: false,
    breached: false,
    count: 0,
    loading: false,
  })

  const entropyBits = useMemo(() => calculateEntropy(generated), [generated])

  const generate = useCallback(() => {
    setPwnedResult({ checked: false, breached: false, count: 0, loading: false })
    if (mode === 'password') {
      setGenerated(generatePassword({ length, lower: useLower, upper: useUpper, digits: useDigits, symbols: useSymbols, excludeAmbiguous }))
    } else if (mode === 'passphrase') {
      setGenerated(generatePassphrase(wordCount, delimiter, capitalizeWords))
    } else {
      setGenerated(generatePin(pinLength))
    }
  }, [mode, length, useLower, useUpper, useDigits, useSymbols, excludeAmbiguous, wordCount, delimiter, capitalizeWords, pinLength])

  useEffect(() => { generate() }, [generate])

  const handleCheckBreaches = async () => {
    if (!generated || pwnedResult.loading) return
    setPwnedResult((prev) => ({ ...prev, loading: true }))
    const res = await checkPwnedPassword(generated)
    setPwnedResult({ checked: true, breached: res.breached, count: res.count, loading: false })
    if (res.breached) {
      showToastError('Sızıntı Tespiti!', `Bu parola ${res.count.toLocaleString()} farklı veri ihlalinde ele geçirilmiş!`)
    } else {
      showToastSuccess('Parola Temiz!', 'Harika! Bu parola bilinen hiçbir sızıntıda bulunamadı.')
    }
  }

  const generateBulk = () => {
    const results: string[] = []
    for (let i = 0; i < bulkCount; i++) {
      if (mode === 'password') results.push(generatePassword({ length, lower: useLower, upper: useUpper, digits: useDigits, symbols: useSymbols, excludeAmbiguous }))
      else if (mode === 'passphrase') results.push(generatePassphrase(wordCount, delimiter, capitalizeWords))
      else results.push(generatePin(pinLength))
    }
    setBulkResults(results)
  }

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    showToastSuccess('Kopyalandı', 'Parola güvenle panoya kopyalandı.')
    setTimeout(() => setCopied(null), 1500)
  }

  const strength = estimateStrength(generated)

  const MODES: { id: Mode; labelKey: string; icon: typeof Key }[] = [
    { id: 'password',   labelKey: 'password.tabs.password',   icon: Key },
    { id: 'passphrase', labelKey: 'password.tabs.passphrase', icon: Type },
    { id: 'pin',        labelKey: 'password.tabs.pin',        icon: Hash },
  ]

  const charsetToggles = [
    { labelKey: 'password.options.lowercase', value: useLower,   set: setUseLower },
    { labelKey: 'password.options.uppercase', value: useUpper,   set: setUseUpper },
    { labelKey: 'password.options.digits',    value: useDigits,  set: setUseDigits },
    { labelKey: 'password.options.symbols',   value: useSymbols, set: setUseSymbols },
  ]

  // ─── Vault Action Handlers ───────────────────────────────────────────────────
  const handleOpenSaveModal = () => {
    setSaveTitle('')
    setSaveUsername('')
    setSaveCategory('social')
    setSaveNotes('')
    setIsSaveModalOpen(true)
  }

  const handleSaveToVault = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saveTitle.trim()) return

    const newItem: SavedPasswordItem = {
      id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: saveTitle.trim(),
      username: saveUsername.trim() || undefined,
      password: generated,
      strength: strength.key,
      category: saveCategory,
      notes: saveNotes.trim() || undefined,
      createdAt: Date.now(),
    }

    const updated = [newItem, ...vaultItems]
    setVaultItems(updated)
    await saveEncryptedVault(updated)
    setIsSaveModalOpen(false)

    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2500)
  }

  const handleDeleteVaultItem = async (id: string) => {
    if (confirm(t('password.vault.deleteConfirm') || 'Are you sure you want to delete this password?')) {
      const updated = vaultItems.filter((item) => item.id !== id)
      setVaultItems(updated)
      await saveEncryptedVault(updated)
    }
  }

  const toggleRevealVaultPassword = (id: string) => {
    setRevealedVaultIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleExportVault = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vaultItems, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', dataStr)
    dlAnchor.setAttribute('download', `zendev-vault-backup-${new Date().toISOString().slice(0, 10)}.json`)
    dlAnchor.click()
  }

  const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (Array.isArray(parsed)) {
          const merged = [...parsed, ...vaultItems]
          // Deduplicate by ID
          const map = new Map<string, SavedPasswordItem>()
          merged.forEach((item) => {
            if (item.id && item.password) map.set(item.id, item)
          })
          const uniqueItems = Array.from(map.values())
          setVaultItems(uniqueItems)
          await saveEncryptedVault(uniqueItems)
          alert('✓ Yedek başarıyla içe aktarıldı!')
        }
      } catch {
        alert('Geçersiz JSON yedek dosyası!')
      }
    }
    reader.readAsText(file)
  }

  // Filtered vault items
  const filteredVaultItems = useMemo(() => {
    return vaultItems.filter((item) => {
      const matchesSearch =
        vaultSearch === '' ||
        item.title.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        item.username?.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        item.notes?.toLowerCase().includes(vaultSearch.toLowerCase())

      const matchesCat =
        vaultCategoryFilter === 'all' || item.category === vaultCategoryFilter

      return matchesSearch && matchesCat
    })
  }, [vaultItems, vaultSearch, vaultCategoryFilter])

  const categoryColor = (cat?: string) => {
    switch (cat) {
      case 'social':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'work':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'finance':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'personal':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-nexus-surface/80 text-nexus-muted border-white/10'
    }
  }

  return (
    <BaseToolTemplate
      icon={Key}
      title={t('password.title')}
      description={t('password.description')}
      gradient="from-amber-500 to-orange-600"
    >
      {/* Top Main Navigation: Generator vs Vault */}
      <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'generator'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-nexus-muted hover:text-white bg-nexus-surface/40 hover:bg-nexus-surface/80 border border-white/5'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t('password.vault.tabGenerator') || 'Parola Üretici'}</span>
          </button>

          <button
            onClick={() => setMainTab('vault')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'vault'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-nexus-muted hover:text-white bg-nexus-surface/40 hover:bg-nexus-surface/80 border border-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{t('password.vault.tabVault') || 'Kayıtlı Parola Kasası'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-amber-300 font-mono">
              {vaultItems.length}
            </span>
          </button>
        </div>

        {mainTab === 'vault' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportVault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface/60 hover:bg-white/10 border border-white/10 text-xs font-medium text-nexus-text hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-nexus-muted" />
              <span>{t('password.vault.exportBtn') || 'Yedekle'}</span>
            </button>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface/60 hover:bg-white/10 border border-white/10 text-xs font-medium text-nexus-text hover:text-white transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-nexus-muted" />
              <span>{t('password.vault.importBtn') || 'İçe Aktar'}</span>
              <input type="file" accept=".json" onChange={handleImportVault} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* ──────────────── TAB 1: GENERATOR ──────────────── */}
      {mainTab === 'generator' && (
        <>
          {/* Mode selector */}
          <div className="flex gap-2 mb-6 p-1 bg-nexus-card rounded-xl border border-nexus-border/50">
            {MODES.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                id={`pwd-mode-${id}`}
                onClick={() => setMode(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                    : 'text-nexus-muted hover:text-nexus-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {/* Generated output */}
          <div className="glass-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold flex-1">
                {t(`password.generatedLabel.${mode}`)}
              </p>
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="text-nexus-muted hover:text-nexus-text transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <p className={`flex-1 font-mono text-xl text-white tracking-wider break-all bg-black/30 p-3 rounded-xl border border-white/5 ${!showPassword ? 'blur-sm select-none' : ''}`}>
                {generated || '—'}
              </p>
              <div className="flex gap-2 shrink-0">
                <motion.button
                  id="pwd-copy-btn"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCopy(generated, 'main')}
                  className="p-3 rounded-xl bg-nexus-card hover:bg-nexus-accent/20 text-nexus-muted hover:text-nexus-accent transition-colors border border-white/5"
                  title="Panoya Kopyala"
                >
                  {copied === 'main' ? <Check className="w-5 h-5 text-nexus-success" /> : <Copy className="w-5 h-5" />}
                </motion.button>
                <motion.button
                  id="pwd-refresh-btn"
                  whileTap={{ scale: 0.9, rotate: 180 }}
                  onClick={generate}
                  className="p-3 rounded-xl bg-nexus-card hover:bg-amber-500/20 text-nexus-muted hover:text-amber-400 transition-colors border border-white/5"
                  title="Yeniden Üret"
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Action buttons, Entropy & Strength */}
            <div className="flex flex-col gap-3 pt-3 border-t border-white/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Strength bar & Entropy */}
                {mode !== 'pin' ? (
                  <div className="w-full sm:w-1/2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium" style={{ color: strength.color }}>
                        {t(`password.strength.${strength.key}`)}
                      </span>
                      <span className="hud-badge text-[10px] text-nexus-cyan font-mono">
                        {entropyBits} bit Entropi
                      </span>
                    </div>
                    <div className="h-1.5 bg-nexus-card rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        animate={{ width: `${strength.score * 100}%`, backgroundColor: strength.color }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-nexus-muted font-mono">
                    <span className="hud-badge text-[10px] text-nexus-cyan">{pinLength} haneli PIN</span>
                  </div>
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* HaveIBeenPwned Breach Check Button */}
                  <button
                    id="pwd-check-pwned-btn"
                    onClick={handleCheckBreaches}
                    disabled={pwnedResult.loading || !generated}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-nexus-card hover:bg-nexus-accent/15 border border-white/10 hover:border-nexus-accent/40 text-nexus-text text-xs font-semibold transition-all disabled:opacity-50"
                    title="HaveIBeenPwned k-anonymity ile parolanın sızıp sızmadığını test edin"
                  >
                    {pwnedResult.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 text-nexus-accent animate-spin" />
                    ) : pwnedResult.checked && pwnedResult.breached ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ) : pwnedResult.checked && !pwnedResult.breached ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-nexus-muted" />
                    )}
                    <span>
                      {pwnedResult.loading
                        ? 'Taranıyor...'
                        : pwnedResult.checked
                        ? pwnedResult.breached
                          ? `${pwnedResult.count.toLocaleString()} Sızıntı!`
                          : 'Sızıntı Yok (Temiz)'
                        : 'Sızıntı Kontrolü'}
                    </span>
                  </button>

                  {/* Save to Vault Button */}
                  <button
                    onClick={handleOpenSaveModal}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all hover:scale-[1.02]"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('password.vault.saveToVault') || 'Kasaya Kaydet'}</span>
                  </button>
                </div>
              </div>

              {/* Breach Banner alert if checked and breached */}
              {pwnedResult.checked && pwnedResult.breached && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Bu parola HaveIBeenPwned veritabanında <strong>{pwnedResult.count.toLocaleString()}</strong> kez ifşa edilmiş! Farklı bir parola üretmeniz önerilir.
                    </span>
                  </div>
                  <button
                    onClick={generate}
                    className="text-[11px] font-bold text-rose-300 underline hover:text-white shrink-0"
                  >
                    Yenisini Üret
                  </button>
                </motion.div>
              )}
            </div>

            {/* Save Success Toast */}
            {saveToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{t('password.vault.savedToast') || 'Parola şifrelenmiş kasaya güvenle eklendi!'}</span>
              </motion.div>
            )}
          </div>

          {/* Options */}
          <div className="glass-card p-5 mb-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-nexus-muted">
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('password.options.title')}</span>
            </div>

            {mode === 'password' && (
              <>
                {/* Length slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-nexus-muted">
                    <span>{t('password.options.length')}</span>
                    <span className="text-white font-semibold">{length}</span>
                  </div>
                  <input
                    id="pwd-length-slider"
                    type="range" min={6} max={64} value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Character set toggles */}
                <div className="grid grid-cols-2 gap-2">
                  {charsetToggles.map(({ labelKey, value, set }) => (
                    <button
                      key={labelKey}
                      onClick={() => set((v) => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                        value
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                          : 'border-nexus-border text-nexus-muted hover:text-nexus-text'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${value ? 'bg-amber-500 border-amber-500' : 'border-nexus-muted'}`}>
                        {value && <Check className="w-2 h-2 text-white" />}
                      </div>
                      {t(labelKey)}
                    </button>
                  ))}
                </div>

                {/* Exclude ambiguous */}
                <button
                  onClick={() => setExcludeAmbiguous((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs w-full transition-all ${
                    excludeAmbiguous
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-nexus-border text-nexus-muted hover:text-nexus-text'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${excludeAmbiguous ? 'bg-amber-500 border-amber-500' : 'border-nexus-muted'}`}>
                    {excludeAmbiguous && <Check className="w-2 h-2 text-white" />}
                  </div>
                  {t('password.options.excludeAmbiguous')}
                </button>
              </>
            )}

            {mode === 'passphrase' && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-nexus-muted">
                    <span>{t('password.options.wordCount')}</span>
                    <span className="text-white font-semibold">{wordCount}</span>
                  </div>
                  <input type="range" min={2} max={10} value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-nexus-muted">{t('password.options.delimiter')}</p>
                    <input value={delimiter} onChange={(e) => setDelimiter(e.target.value.slice(0, 3))}
                      className="w-full bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <button onClick={() => setCapitalizeWords((v) => !v)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs mt-5 transition-all ${
                      capitalizeWords ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-nexus-border text-nexus-muted'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-sm border ${capitalizeWords ? 'bg-amber-500 border-amber-500' : 'border-nexus-muted'} flex items-center justify-center`}>
                      {capitalizeWords && <Check className="w-2 h-2 text-white" />}
                    </div>
                    {t('password.options.capitalize')}
                  </button>
                </div>
              </>
            )}

            {mode === 'pin' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-nexus-muted">
                  <span>{t('password.options.pinLength')}</span>
                  <span className="text-white font-semibold">{pinLength}</span>
                </div>
                <input type="range" min={4} max={12} value={pinLength}
                  onChange={(e) => setPinLength(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Bulk generator */}
          <div className="glass-card p-5 space-y-3">
            <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              {t('password.bulk.title')}
            </p>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 text-xs text-nexus-muted">
                <span>{t('password.bulk.count')}</span>
                <input
                  type="number" min={1} max={100} value={bulkCount}
                  onChange={(e) => setBulkCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-16 bg-nexus-card border border-nexus-border rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-amber-500 transition-colors text-center"
                />
              </div>
              <motion.button
                id="pwd-bulk-btn"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={generateBulk}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:from-amber-500/30 hover:to-orange-600/30 transition-all"
              >
                {t('password.bulk.generate', { count: bulkCount })}
              </motion.button>
            </div>

            <AnimatePresence>
              {bulkResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 max-h-48 overflow-y-auto pr-1"
                >
                  {bulkResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <p className="flex-1 font-mono text-xs text-nexus-text/80 truncate">{r}</p>
                      <button
                        onClick={() => handleCopy(r, `bulk_${i}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-nexus-muted hover:text-nexus-accent"
                      >
                        {copied === `bulk_${i}` ? <Check className="w-3.5 h-3.5 text-nexus-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ──────────────── TAB 2: VAULT ──────────────── */}
      {mainTab === 'vault' && (
        <div className="space-y-5">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                placeholder={t('password.vault.searchPlaceholder') || 'Hizmet, kullanıcı adı veya notlarda ara...'}
                className="w-full bg-nexus-card border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              {vaultSearch && (
                <button
                  onClick={() => setVaultSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: t('password.vault.categories.all') || 'Tümü' },
                { id: 'social', label: t('password.vault.categories.social') || 'Sosyal' },
                { id: 'work', label: t('password.vault.categories.work') || 'İş' },
                { id: 'finance', label: t('password.vault.categories.finance') || 'Finans' },
                { id: 'personal', label: t('password.vault.categories.personal') || 'Kişisel' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setVaultCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    vaultCategoryFilter === cat.id
                      ? 'bg-amber-500 text-black font-semibold'
                      : 'bg-nexus-surface/60 text-nexus-muted hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vault Items List */}
          {filteredVaultItems.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-base font-medium text-white">{t('password.vault.empty') || 'Kayıtlı parola bulunmuyor'}</p>
                <p className="text-xs text-nexus-muted max-w-sm mt-1">
                  {t('password.vault.emptySub') || 'Üreticiden ürettiğiniz parolaları etiketleyerek buraya kaydedebilirsiniz.'}
                </p>
              </div>
              <button
                onClick={() => setMainTab('generator')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-md hover:scale-105 transition-all"
              >
                + {t('password.vault.tabGenerator') || 'Yeni Parola Üret'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVaultItems.map((item) => {
                const isRevealed = revealedVaultIds[item.id]
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-4 space-y-3 flex flex-col justify-between hover:border-amber-500/30 transition-all group"
                  >
                    <div>
                      {/* Card Header: Title, Category & Delete */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white text-base tracking-wide">{item.title}</h3>
                          {item.category && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${categoryColor(item.category)}`}>
                              {t(`password.vault.categories.${item.category}`) || item.category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteVaultItem(item.id)}
                          className="text-nexus-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Username / Account */}
                      {item.username && (
                        <div className="flex items-center gap-1.5 text-xs text-nexus-text mb-2">
                          <User className="w-3.5 h-3.5 text-nexus-muted" />
                          <span className="font-mono text-nexus-muted">{item.username}</span>
                          <button
                            onClick={() => handleCopy(item.username!, `user_${item.id}`)}
                            className="text-nexus-muted hover:text-white ml-1"
                            title="Kullanıcı adını kopyala"
                          >
                            {copied === `user_${item.id}` ? <Check className="w-3 h-3 text-nexus-success" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}

                      {/* Password Field */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <p className={`flex-1 font-mono text-xs text-white break-all tracking-wider ${!isRevealed ? 'select-none tracking-widest' : ''}`}>
                          {isRevealed ? item.password : '••••••••••••••••'}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleRevealVaultPassword(item.id)}
                            className="p-1 text-nexus-muted hover:text-white transition-colors"
                            title={isRevealed ? 'Gizle' : 'Göster'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopy(item.password, item.id)}
                            className="p-1 text-nexus-muted hover:text-amber-400 transition-colors"
                            title="Parolayı Kopyala"
                          >
                            {copied === item.id ? <Check className="w-3.5 h-3.5 text-nexus-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Notes Preview */}
                      {item.notes && (
                        <p className="text-[11px] text-nexus-muted/80 mt-2 line-clamp-2 italic bg-white/5 p-2 rounded-lg">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {/* Footer Date */}
                    <div className="flex items-center justify-between text-[10px] text-nexus-muted/60 pt-2 border-t border-white/5">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" /> AES-256 Şifreli
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── SAVE TO VAULT MODAL ──────────────── */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card w-full max-w-md p-6 border-amber-500/30 bg-[#0f1015]/95 shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <BookmarkPlus className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {t('password.vault.modalTitle') || 'Parolayı Kasaya Kaydet'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-nexus-muted hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveToVault} className="space-y-4">
                {/* Service / Title */}
                <div>
                  <label className="block text-xs font-semibold text-nexus-muted mb-1">
                    {t('password.vault.titleLabel') || 'Hizmet / Başlık *'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder={t('password.vault.titlePlaceholder') || 'Örn: Instagram, GitHub, Netflix'}
                    className="w-full bg-nexus-card border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Username / Email */}
                <div>
                  <label className="block text-xs font-semibold text-nexus-muted mb-1">
                    {t('password.vault.usernameLabel') || 'Kullanıcı Adı / E-posta'}
                  </label>
                  <input
                    type="text"
                    value={saveUsername}
                    onChange={(e) => setSaveUsername(e.target.value)}
                    placeholder={t('password.vault.usernamePlaceholder') || 'Örn: sam@example.com'}
                    className="w-full bg-nexus-card border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-nexus-muted mb-1">
                    {t('password.vault.categoryLabel') || 'Kategori'}
                  </label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    className="w-full bg-nexus-card border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="social">{t('password.vault.categories.social') || 'Sosyal Medya'}</option>
                    <option value="work">{t('password.vault.categories.work') || 'İş & Yazılım'}</option>
                    <option value="finance">{t('password.vault.categories.finance') || 'Finans & Banka'}</option>
                    <option value="personal">{t('password.vault.categories.personal') || 'Kişisel'}</option>
                    <option value="other">{t('password.vault.categories.other') || 'Diğer'}</option>
                  </select>
                </div>

                {/* Password Preview (Readonly) */}
                <div>
                  <label className="block text-xs font-semibold text-nexus-muted mb-1">
                    Parola
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={generated}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-300 select-all"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-nexus-muted mb-1">
                    {t('password.vault.notesLabel') || 'Notlar (Opsiyonel)'}
                  </label>
                  <textarea
                    rows={2}
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder={t('password.vault.notesPlaceholder') || 'Örn: 2FA kurtarma bilgisi vs.'}
                    className="w-full bg-nexus-card border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-nexus-surface border border-white/10 text-xs font-medium text-nexus-muted hover:text-white transition-colors"
                  >
                    {t('password.vault.cancelBtn') || 'İptal'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
                  >
                    {t('password.vault.saveBtn') || 'Kasaya Ekle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BaseToolTemplate>
  )
}
