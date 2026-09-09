import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Copy, Check, Play, BookOpen, AlertCircle, Sparkles, Bot, Loader2, X } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'
import { askAI } from '../lib/aiClient'

interface RegexPreset {
  name: string
  pattern: string
  flags: string
  desc: string
  sample: string
}

const PRESETS: RegexPreset[] = [
  {
    name: 'E-posta Adresi',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: 'g',
    desc: 'Standart RFC uyumlu e-posta formatı kontrolü',
    sample: 'test.user@example.com\ninvalid-email@\nadmin@nexushub.io'
  },
  {
    name: 'IPv4 Adresi',
    pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
    flags: 'g',
    desc: 'Geçerli 0-255 arası 4 oktetlik IPv4 adresi',
    sample: '192.168.1.1\n10.0.0.254\n999.1.1.1'
  },
  {
    name: 'URL / Bağlantı',
    pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    flags: 'g',
    desc: 'HTTP ve HTTPS protokolüne sahip web bağlantıları',
    sample: 'https://nexushub.io/docs?ref=test\nhttp://google.com\nftp://invalid'
  },
  {
    name: 'TR Telefon Numarası',
    pattern: '(?:\\+90|0)?\\s?5[0-9]{2}\\s?[0-9]{3}\\s?[0-9]{2}\\s?[0-9]{2}',
    flags: 'g',
    desc: 'Türkiye GSM operatör hatları (05xx xxx xx xx)',
    sample: '0532 123 45 67\n+90 544 987 65 43\n5551234567'
  },
  {
    name: 'HEX Renk Kodu',
    pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b',
    flags: 'g',
    desc: '3 veya 6 haneli CSS hex renk kodları (#fff, #00f0ff)',
    sample: '#00f0ff\n#fff\n#123456\ninvalid#12'
  },
  {
    name: 'Tarih (YYYY-MM-DD)',
    pattern: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b',
    flags: 'g',
    desc: 'ISO 8601 standart tarih formatı',
    sample: '2026-09-09\n1999-12-31\n2026-15-40'
  }
]

export default function RegexStudio() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  const [flags, setFlags] = useState('gm')
  const [testString, setTestString] = useState(
    'Bize info@nexushub.io üzerinden veya support@company.org adresinden ulaşabilirsiniz.\nGeçersiz: user@.com'
  )
  const [copied, setCopied] = useState(false)

  // AI Co-Pilot state
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiMode, setAiMode] = useState<'generate' | 'explain'>('generate')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')

  const handleRunAI = async () => {
    setAiLoading(true)
    setAiError('')
    setAiResult('')
    try {
      if (aiMode === 'generate') {
        const res = await askAI(
          `Generate a JavaScript compatible regex pattern for this requirement: "${aiPrompt}". Return ONLY the raw regex pattern itself, no slashes, no quotes, no markdown, no explanation.`,
          'You are a strict regex engine assistant. Return ONLY the regex string.'
        )
        const clean = res.replace(/^\/|\/[a-z]*$/g, '').replace(/`/g, '').trim()
        setPattern(clean)
        setAiResult(`Desen başarıyla yüklendi: /${clean}/`)
        cyberAudio.copySuccess()
      } else {
        const res = await askAI(
          `Explain this regex pattern in Turkish concisely in bullet points: "/${pattern}/${flags}". Test string sample: "${testString.slice(0, 100)}"`,
          'You are an expert developer assistant explaining regex in Turkish.'
        )
        setAiResult(res)
        cyberAudio.copySuccess()
      }
    } catch (err: any) {
      setAiError(err.message || 'AI çağrısı başarısız oldu. Account sayfasından AI ayarlarınızı kontrol edin.')
    } finally {
      setAiLoading(false)
    }
  }

  // Toggle flag helper
  const toggleFlag = (f: string) => {
    cyberAudio.click()
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f))
  }

  // Evaluate regex safely
  const { matches, error, highlightedHtml } = useMemo(() => {
    if (!pattern) return { matches: [], error: null, highlightedHtml: testString }
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const allMatches: { match: string; index: number; groups?: Record<string, string> }[] = []
      let m: RegExpExecArray | null

      // Loop with safety counter
      let iterations = 0
      while ((m = re.exec(testString)) !== null && iterations < 500) {
        iterations++
        allMatches.push({
          match: m[0],
          index: m.index,
          groups: m.groups
        })
        if (!flags.includes('g')) break
      }

      // Generate highlighted HTML
      let html = ''
      let lastIndex = 0
      for (const matchObj of allMatches) {
        const start = matchObj.index
        const end = start + matchObj.match.length
        html += escapeHtml(testString.substring(lastIndex, start))
        html += `<mark class="bg-nexus-accent/30 text-nexus-cyan border-b-2 border-nexus-cyan font-semibold rounded px-0.5">${escapeHtml(matchObj.match)}</mark>`
        lastIndex = end
      }
      html += escapeHtml(testString.substring(lastIndex))

      return { matches: allMatches, error: null, highlightedHtml: html }
    } catch (err: any) {
      return { matches: [], error: err.message, highlightedHtml: escapeHtml(testString) }
    }
  }, [pattern, flags, testString])

  function escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const handleCopyPattern = () => {
    navigator.clipboard.writeText(`/${pattern}/${flags}`)
    cyberAudio.copySuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const loadPreset = (p: RegexPreset) => {
    cyberAudio.click()
    setPattern(p.pattern)
    setFlags(p.flags)
    setTestString(p.sample)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nexus-text flex items-center gap-3">
            <Terminal className="w-7 h-7 text-nexus-accent" />
            Regex Lab & Live Tester
          </h1>
          <p className="text-sm text-nexus-muted mt-1">
            Anlık düzenli ifade deneme, grupları yakalama ve şablon kütüphanesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              cyberAudio.click()
              setShowAiModal(true)
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-xl text-xs font-medium text-purple-300 transition-colors shadow-lg shadow-purple-600/10"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Co-Pilot</span>
          </button>
          <button
            onClick={handleCopyPattern}
            className="flex items-center gap-2 px-3.5 py-2 bg-nexus-surface border border-nexus-border rounded-xl text-xs font-mono text-nexus-text hover:border-nexus-accent/40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>/{pattern}/{flags}</span>
          </button>
        </div>
      </div>

      {/* Regex Input & Flags */}
      <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full flex items-center bg-nexus-bg border border-nexus-border rounded-xl px-3 py-2.5 focus-within:border-nexus-accent transition-colors font-mono text-sm">
            <span className="text-nexus-muted select-none mr-1.5 font-bold">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Regex desenini buraya yaz..."
              className="flex-1 bg-transparent border-none text-nexus-text placeholder-nexus-muted focus:outline-none"
            />
            <span className="text-nexus-muted select-none ml-1.5 font-bold">/</span>
          </div>

          {/* Flag Toggle Pills */}
          <div className="flex items-center gap-1.5 shrink-0 bg-nexus-bg p-1.5 rounded-xl border border-nexus-border/30">
            {['g', 'i', 'm', 's', 'u'].map((flag) => {
              const active = flags.includes(flag)
              return (
                <button
                  key={flag}
                  onClick={() => toggleFlag(flag)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                    active
                      ? 'bg-nexus-accent text-white shadow-md shadow-nexus-accent/20'
                      : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-surface'
                  }`}
                  title={`Flag: ${flag}`}
                >
                  {flag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Regex Sözdizimi Hatası: {error}</span>
          </div>
        )}
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test String Input */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-nexus-muted flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-nexus-accent" /> Test Metni (Input)
            </label>
            <span className="text-xs text-nexus-muted font-mono">{testString.length} karakter</span>
          </div>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            rows={10}
            className="w-full flex-1 bg-nexus-bg border border-nexus-border/40 rounded-xl p-3 text-xs text-nexus-text font-mono focus:outline-none focus:border-nexus-accent transition-colors resize-none leading-relaxed"
            placeholder="Test edilecek metni buraya yapıştır..."
          />
        </div>

        {/* Live Match Highlighting */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-nexus-muted flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-nexus-cyan" /> Canlı Eşleşme Önizleme
            </label>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/30">
              {matches.length} Eşleşme Bulundu
            </span>
          </div>
          <div
            className="w-full flex-1 bg-nexus-bg border border-nexus-border/40 rounded-xl p-3 text-xs text-nexus-text font-mono overflow-y-auto whitespace-pre-wrap leading-relaxed min-h-[220px]"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      </div>

      {/* Preset Library */}
      <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-nexus-accent" />
          <h3 className="text-sm font-semibold text-nexus-text">Hazır Regex Şablonları (Presets)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ scale: 1.01 }}
              onClick={() => loadPreset(p)}
              className="p-3 bg-nexus-bg border border-nexus-border/30 hover:border-nexus-accent/40 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-nexus-text group-hover:text-nexus-accent transition-colors">
                  {p.name}
                </span>
                <span className="text-[10px] font-mono text-nexus-cyan bg-nexus-cyan/10 px-1.5 py-0.5 rounded">
                  /{p.flags}
                </span>
              </div>
              <p className="text-[11px] text-nexus-muted line-clamp-1">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      {/* AI Co-Pilot Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-nexus-surface border border-nexus-border/60 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-nexus-border/30">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <Bot className="w-4 h-4" />
                <span>AI Regex Co-Pilot</span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection */}
            <div className="flex rounded-xl bg-nexus-bg p-1 border border-nexus-border/40">
              <button
                onClick={() => {
                  setAiMode('generate')
                  setAiResult('')
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  aiMode === 'generate'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                Doğal Dilden Regex Üret
              </button>
              <button
                onClick={() => {
                  setAiMode('explain')
                  setAiResult('')
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  aiMode === 'explain'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                Mevcut Deseni Açıkla
              </button>
            </div>

            {aiMode === 'generate' ? (
              <div className="space-y-2">
                <label className="text-xs text-nexus-muted">
                  Nasıl bir metin yakalamak istiyorsunuz?
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Örn: '16 haneli kredi kartı numaraları (boşluklu veya tireli)' ya da 'yalnızca gmail ve hotmail uzantılı mailler'..."
                  className="w-full bg-nexus-bg border border-nexus-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-nexus-bg/60 border border-nexus-border/30 text-xs font-mono text-purple-300">
                Açıklanacak Desen: <span className="font-bold text-white">/{pattern}/{flags}</span>
              </div>
            )}

            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {aiError}
              </div>
            )}

            {aiResult && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                {aiResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
              >
                Kapat
              </button>
              <button
                disabled={aiLoading || (aiMode === 'generate' && !aiPrompt.trim())}
                onClick={handleRunAI}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white transition-all shadow-md shadow-purple-600/20 active:scale-95"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Yanıtlıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiMode === 'generate' ? 'Regex Üret & Yükle' : 'Deseni Açıkla'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
