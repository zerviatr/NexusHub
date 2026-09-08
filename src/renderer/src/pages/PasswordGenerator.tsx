import { useState, useCallback, useEffect } from 'react'
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
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'

// ─── Strength keys (resolved through t() at render time) ─────────────────────
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

type Mode = 'password' | 'passphrase' | 'pin'

export default function PasswordGenerator() {
  const { t } = useT()

  const [mode, setMode] = useState<Mode>('password')
  const [generated, setGenerated] = useState('')
  const [bulkResults, setBulkResults] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(true)

  // Password opts
  const [length, setLength]                   = useState(16)
  const [useLower, setUseLower]               = useState(true)
  const [useUpper, setUseUpper]               = useState(true)
  const [useDigits, setUseDigits]             = useState(true)
  const [useSymbols, setUseSymbols]           = useState(false)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)

  // Passphrase opts
  const [wordCount, setWordCount]           = useState(4)
  const [delimiter, setDelimiter]           = useState('-')
  const [capitalizeWords, setCapitalizeWords] = useState(true)

  // PIN opts
  const [pinLength, setPinLength] = useState(6)

  // Bulk
  const [bulkCount, setBulkCount] = useState(10)

  const generate = useCallback(() => {
    if (mode === 'password') {
      setGenerated(generatePassword({ length, lower: useLower, upper: useUpper, digits: useDigits, symbols: useSymbols, excludeAmbiguous }))
    } else if (mode === 'passphrase') {
      setGenerated(generatePassphrase(wordCount, delimiter, capitalizeWords))
    } else {
      setGenerated(generatePin(pinLength))
    }
  }, [mode, length, useLower, useUpper, useDigits, useSymbols, excludeAmbiguous, wordCount, delimiter, capitalizeWords, pinLength])

  useEffect(() => { generate() }, [generate])

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
    setTimeout(() => setCopied(null), 1500)
  }

  const strength = estimateStrength(generated)

  const MODES: { id: Mode; labelKey: string; icon: typeof Key }[] = [
    { id: 'password',   labelKey: 'password.tabs.password',   icon: Key },
    { id: 'passphrase', labelKey: 'password.tabs.passphrase', icon: Type },
    { id: 'pin',        labelKey: 'password.tabs.pin',        icon: Hash },
  ]

  // Checkbox toggle rows for password character sets
  const charsetToggles = [
    { labelKey: 'password.options.lowercase', value: useLower,   set: setUseLower },
    { labelKey: 'password.options.uppercase', value: useUpper,   set: setUseUpper },
    { labelKey: 'password.options.digits',    value: useDigits,  set: setUseDigits },
    { labelKey: 'password.options.symbols',   value: useSymbols, set: setUseSymbols },
  ]

  return (
    <BaseToolTemplate
      icon={Key}
      title={t('password.title')}
      description={t('password.description')}
      gradient="from-amber-500 to-orange-600"
    >
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
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold flex-1">
            {t(`password.generatedLabel.${mode}`)}
          </p>
          <button
            onClick={() => setShowPassword((v) => !v)}
            className="text-nexus-muted hover:text-nexus-text transition-colors"
          >
            {showPassword ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <p className={`flex-1 font-mono text-lg text-white tracking-wider break-all ${!showPassword ? 'blur-sm select-none' : ''}`}>
            {generated || '—'}
          </p>
          <div className="flex gap-1.5 shrink-0">
            <motion.button
              id="pwd-copy-btn"
              whileTap={{ scale: 0.9 }}
              onClick={() => handleCopy(generated, 'main')}
              className="p-2 rounded-lg bg-nexus-card hover:bg-nexus-accent/20 text-nexus-muted hover:text-nexus-accent transition-colors"
            >
              {copied === 'main' ? <Check className="w-4 h-4 text-nexus-success" /> : <Copy className="w-4 h-4" />}
            </motion.button>
            <motion.button
              id="pwd-refresh-btn"
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={generate}
              className="p-2 rounded-lg bg-nexus-card hover:bg-amber-500/20 text-nexus-muted hover:text-amber-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Strength bar */}
        {mode !== 'pin' && (
          <div className="space-y-1">
            <div className="h-1.5 bg-nexus-card rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${strength.score * 100}%`, backgroundColor: strength.color }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-right font-medium" style={{ color: strength.color }}>
              {t(`password.strength.${strength.key}`)}
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="glass-card p-4 mb-4 space-y-4">
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
      <div className="glass-card p-4 space-y-3">
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
                <div key={i} className="flex items-center gap-2 group">
                  <p className="flex-1 font-mono text-xs text-nexus-text/80 truncate">{r}</p>
                  <button
                    onClick={() => handleCopy(r, `bulk_${i}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-nexus-muted hover:text-nexus-accent"
                  >
                    {copied === `bulk_${i}` ? <Check className="w-3 h-3 text-nexus-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BaseToolTemplate>
  )
}
