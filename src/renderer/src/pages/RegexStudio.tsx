import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  Copy,
  Check,
  Play,
  BookOpen,
  AlertCircle,
  Sparkles,
  Bot,
  Loader2,
  X,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Flame,
  FileCode,
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'
import { askAI } from '../lib/aiClient'
import {
  analyzeReDoS,
  parseRegexAST,
  generateCodeSnippets,
  type RegexToken
} from '../lib/regexEngine'

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
    sample: 'test.user@example.com\ninvalid-email@\nadmin@zendev.io'
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
    sample: 'https://zendev.io/docs?ref=test\nhttp://google.com\nftp://invalid'
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
  },
  {
    name: 'Şifre Politikası (Güçlü)',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    flags: 'm',
    desc: 'En az 8 karakter, büyük-küçük harf, rakam ve özel karakter lookahead şartı',
    sample: 'Password123!\nweakpass\nNexus#2026Secure'
  },
  {
    name: 'ReDoS Tehlike Örneği (Test)',
    pattern: '([a-zA-Z0-9]+)*$',
    flags: 'g',
    desc: 'Nested quantifier içeren potansiyel Catastrophic Backtracking deseni',
    sample: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!'
  }
]

type ActiveTab = 'ast' | 'redos' | 'presets'

export default function RegexStudio() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
  const [flags, setFlags] = useState('gm')
  const [testString, setTestString] = useState(
    'Bize info@zendev.io üzerinden veya support@company.org adresinden ulaşabilirsiniz.\nGeçersiz: user@.com'
  )
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ast')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'group' | 'class' | 'quantifier' | 'anchor'>('all')

  // Code Export Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedLang, setSelectedLang] = useState<'typescript' | 'python' | 'go' | 'rust' | 'java' | 'csharp'>('typescript')
  const [exportCopied, setExportCopied] = useState(false)

  // AI Co-Pilot state
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiMode, setAiMode] = useState<'generate' | 'explain'>('generate')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')

  // 1. ReDoS Vulnerability Analysis
  const redosAnalysis = useMemo(() => {
    return analyzeReDoS(pattern)
  }, [pattern])

  // 2. AST Token Breakdown
  const astTokens = useMemo(() => {
    return parseRegexAST(pattern)
  }, [pattern])

  const filteredTokens = useMemo(() => {
    if (tokenFilter === 'all') return astTokens
    if (tokenFilter === 'group') return astTokens.filter((t) => t.type === 'group' || t.type === 'lookaround')
    if (tokenFilter === 'class') return astTokens.filter((t) => t.type === 'class')
    if (tokenFilter === 'quantifier') return astTokens.filter((t) => t.type === 'quantifier')
    if (tokenFilter === 'anchor') return astTokens.filter((t) => t.type === 'anchor')
    return astTokens
  }, [astTokens, tokenFilter])

  // 3. Multi-Language Code Snippets
  const codeSnippets = useMemo(() => {
    return generateCodeSnippets(pattern, flags, testString)
  }, [pattern, flags, testString])

  const currentSnippet = useMemo(() => {
    return codeSnippets.find((s) => s.id === selectedLang) || codeSnippets[0]
  }, [codeSnippets, selectedLang])

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

  const toggleFlag = (f: string) => {
    cyberAudio.click()
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f))
  }

  // Safe live match evaluation
  const { matches, error, highlightedHtml } = useMemo(() => {
    if (!pattern) return { matches: [], error: null, highlightedHtml: testString }
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const allMatches: { match: string; index: number; groups?: Record<string, string> }[] = []
      let m: RegExpExecArray | null

      let iterations = 0
      while ((m = re.exec(testString)) !== null && iterations < 500) {
        iterations++
        allMatches.push({
          match: m[0],
          index: m.index,
          groups: m.groups
        })
        if (m[0].length === 0) {
          re.lastIndex++
        }
        if (!flags.includes('g')) break
      }

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

  const handleCopyExportCode = () => {
    if (currentSnippet) {
      navigator.clipboard.writeText(currentSnippet.code)
      cyberAudio.copySuccess()
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 1600)
    }
  }

  const loadPreset = (p: RegexPreset) => {
    cyberAudio.click()
    setPattern(p.pattern)
    setFlags(p.flags)
    setTestString(p.sample)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-nexus-accent/15 border border-nexus-accent/40 text-nexus-accent">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-nexus-text">
                  Regex Lab Pro
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold bg-gradient-to-r from-nexus-accent to-nexus-cyan text-white rounded-md shadow-sm">
                  PRO SUITE
                </span>
              </div>
              <p className="text-xs text-nexus-muted mt-0.5">
                Multi-Language Code Export • ReDoS Security Scanner • AST Grup ve Token Analizcisi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Multi-Language Export Button */}
          <button
            onClick={() => {
              cyberAudio.click()
              setShowExportModal(true)
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-nexus-cyan/10 hover:bg-nexus-cyan/20 border border-nexus-cyan/40 rounded-xl text-xs font-semibold text-nexus-cyan transition-all shadow-sm active:scale-95"
          >
            <Code2 className="w-4 h-4 text-nexus-cyan" />
            <span>Kod Dışa Aktar (6 Dil)</span>
          </button>

          {/* AI Co-Pilot Button */}
          <button
            onClick={() => {
              cyberAudio.click()
              setShowAiModal(true)
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-xl text-xs font-semibold text-purple-300 transition-colors shadow-sm active:scale-95"
          >
            <Bot className="w-4 h-4 text-purple-400" />
            <span>AI Co-Pilot</span>
          </button>

          {/* Copy Pattern Button */}
          <button
            onClick={handleCopyPattern}
            className="flex items-center gap-2 px-3.5 py-2 bg-nexus-surface border border-nexus-border rounded-xl text-xs font-mono text-nexus-text hover:border-nexus-accent/40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="max-w-[180px] truncate">/{pattern}/{flags}</span>
          </button>
        </div>
      </div>

      {/* Regex Input & Flags Bar with ReDoS Status Indicator */}
      <div className="bg-nexus-surface border border-nexus-border/50 rounded-2xl p-5 shadow-lg space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full flex items-center bg-nexus-bg border border-nexus-border rounded-xl px-3.5 py-3 focus-within:border-nexus-accent focus-within:ring-1 focus-within:ring-nexus-accent/30 transition-all font-mono text-sm">
            <span className="text-nexus-muted select-none mr-2 font-bold text-base">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Regex desenini buraya yazın (örn: ^(?<user>[a-z]+)@...)..."
              className="flex-1 bg-transparent border-none text-nexus-text placeholder-nexus-muted focus:outline-none"
            />
            <span className="text-nexus-muted select-none ml-2 font-bold text-base">/</span>
          </div>

          {/* Flag Toggle Pills */}
          <div className="flex items-center gap-1.5 shrink-0 bg-nexus-bg p-1.5 rounded-xl border border-nexus-border/40">
            {['g', 'i', 'm', 's', 'u'].map((flag) => {
              const active = flags.includes(flag)
              return (
                <button
                  key={flag}
                  onClick={() => toggleFlag(flag)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                    active
                      ? 'bg-nexus-accent text-white shadow-md shadow-nexus-accent/25 scale-105'
                      : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-surface'
                  }`}
                  title={`Flag /${flag}: ${
                    flag === 'g'
                      ? 'Global (Tüm eşleşmeler)'
                      : flag === 'i'
                        ? 'Case-insensitive (Büyük/küçük harf duyarsız)'
                        : flag === 'm'
                          ? 'Multiline (^ ve $ her satır başı/sonu)'
                          : flag === 's'
                            ? 'DotAll (. yeni satırla da eşleşir)'
                            : 'Unicode desteği'
                  }`}
                >
                  {flag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick ReDoS & Health Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-nexus-border/30 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                cyberAudio.click()
                setActiveTab('redos')
              }}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono font-medium transition-all ${
                redosAnalysis.severity === 'critical'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25 animate-pulse'
                  : redosAnalysis.severity === 'medium' || redosAnalysis.severity === 'low'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
              }`}
            >
              {redosAnalysis.severity === 'critical' ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : redosAnalysis.severity === 'safe' ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <Flame className="w-3.5 h-3.5" />
              )}
              <span>ReDoS Güvenlik Skoru: {redosAnalysis.score}/100</span>
              <span className="text-[10px] opacity-80 underline ml-1">Detaylar</span>
            </button>

            <span className="text-nexus-muted font-mono text-[11px] hidden sm:inline">
              Karmaşıklık: <strong className="text-nexus-text">{redosAnalysis.worstCaseComplexity}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-nexus-muted">
            <span>{astTokens.length} AST Token</span>
            <span>•</span>
            <span>{astTokens.filter((t) => t.type === 'group').length} Yakalama Grubu</span>
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

      {/* Workspace Grid: Test String & Live Match Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test String Input */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-nexus-muted flex items-center gap-2 font-semibold">
              <Play className="w-3.5 h-3.5 text-nexus-accent" /> Test Metni (Input Payload)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-nexus-muted font-mono">{testString.length} karakter</span>
              {testString && (
                <button
                  onClick={() => setTestString('')}
                  className="text-[11px] text-nexus-muted hover:text-rose-400 transition-colors font-mono"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            rows={8}
            className="w-full flex-1 bg-nexus-bg border border-nexus-border/40 rounded-xl p-3.5 text-xs text-nexus-text font-mono focus:outline-none focus:border-nexus-accent transition-colors resize-none leading-relaxed"
            placeholder="Test edilecek metni buraya yapıştır..."
          />
        </div>

        {/* Live Match Highlighting */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-nexus-muted flex items-center gap-2 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-nexus-cyan" /> Canlı Eşleşme Önizleme
            </label>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                matches.length > 0
                  ? 'bg-nexus-cyan/15 text-nexus-cyan border-nexus-cyan/40'
                  : 'bg-nexus-muted/10 text-nexus-muted border-nexus-border'
              }`}
            >
              {matches.length} Eşleşme Bulundu
            </span>
          </div>
          <div
            className="w-full flex-1 bg-nexus-bg border border-nexus-border/40 rounded-xl p-3.5 text-xs text-nexus-text font-mono overflow-y-auto whitespace-pre-wrap leading-relaxed min-h-[180px] max-h-[260px]"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />

          {/* Match groups preview if any match has named or captured groups */}
          {matches.length > 0 && matches[0].groups && Object.keys(matches[0].groups).length > 0 && (
            <div className="mt-3 pt-3 border-t border-nexus-border/30">
              <div className="text-[11px] font-mono text-nexus-muted mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-nexus-accent" />
                <span>İlk Eşleşmenin Grupları:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(matches[0].groups).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] font-mono bg-nexus-accent/15 border border-nexus-accent/30 text-nexus-text px-2 py-0.5 rounded-md"
                  >
                    <strong className="text-nexus-cyan">{k}:</strong> "{v}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pro Suite Tabs: AST Breakdown | ReDoS Scanner | Preset Library */}
      <div className="bg-nexus-surface border border-nexus-border/50 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nexus-border/40 pb-3">
          <div className="flex items-center gap-1 bg-nexus-bg p-1 rounded-xl border border-nexus-border/40">
            <button
              onClick={() => {
                cyberAudio.click()
                setActiveTab('ast')
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ast'
                  ? 'bg-nexus-accent text-white shadow-sm'
                  : 'text-nexus-muted hover:text-nexus-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grup ve Token Açıklayıcı (AST)</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/20 font-mono">
                {astTokens.length}
              </span>
            </button>

            <button
              onClick={() => {
                cyberAudio.click()
                setActiveTab('redos')
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'redos'
                  ? redosAnalysis.severity === 'critical'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-nexus-cyan text-black shadow-sm'
                  : 'text-nexus-muted hover:text-nexus-text'
              }`}
            >
              {redosAnalysis.severity === 'critical' ? (
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>ReDoS Güvenlik Radarı</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  redosAnalysis.severity === 'critical'
                    ? 'bg-rose-900 text-rose-200'
                    : 'bg-black/20 text-black'
                }`}
              >
                {redosAnalysis.score}
              </span>
            </button>

            <button
              onClick={() => {
                cyberAudio.click()
                setActiveTab('presets')
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'presets'
                  ? 'bg-nexus-surface text-nexus-text border border-nexus-border shadow-sm'
                  : 'text-nexus-muted hover:text-nexus-text'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-nexus-accent" />
              <span>Hazır Şablonlar (Presets)</span>
            </button>
          </div>

          {/* Secondary contextual controls */}
          {activeTab === 'ast' && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'group', label: 'Gruplar' },
                  { id: 'class', label: 'Sınıflar' },
                  { id: 'quantifier', label: 'Niceleyiciler' },
                  { id: 'anchor', label: 'Çapalar' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    cyberAudio.click()
                    setTokenFilter(f.id)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    tokenFilter === f.id
                      ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/40 font-bold'
                      : 'text-nexus-muted hover:text-nexus-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content: AST Breakdown */}
        {activeTab === 'ast' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-nexus-muted">
              <p>
                Regex deseni sözdizimsel parçalara (AST Tokens) ayrılarak insan dilinde açıklanmıştır.
              </p>
              <span className="font-mono text-[11px]">
                Gösterilen: {filteredTokens.length} / {astTokens.length} Token
              </span>
            </div>

            {filteredTokens.length === 0 ? (
              <div className="text-center py-8 text-nexus-muted text-xs font-mono bg-nexus-bg rounded-xl border border-nexus-border/30">
                Seçili filtreye uygun AST token bulunamadı veya regex deseni boş.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredTokens.map((token, idx) => (
                  <div
                    key={token.id || idx}
                    className="p-3 bg-nexus-bg border border-nexus-border/40 hover:border-nexus-accent/40 rounded-xl transition-all flex items-start gap-3 group"
                  >
                    <div className="shrink-0 pt-0.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          token.type === 'lookaround'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                            : token.type === 'group'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                              : token.type === 'class'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                : token.type === 'quantifier'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : token.type === 'anchor'
                                    ? 'bg-pink-500/15 text-pink-300 border-pink-500/40'
                                    : token.type === 'alternation'
                                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                                      : 'bg-nexus-surface text-nexus-muted border-nexus-border'
                        }`}
                      >
                        {token.badge}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-nexus-text group-hover:text-nexus-cyan transition-colors truncate">
                          {token.title}
                        </span>
                        <code className="text-xs font-mono font-bold text-nexus-cyan bg-nexus-cyan/10 px-1.5 py-0.5 rounded shrink-0">
                          {token.raw}
                        </code>
                      </div>
                      <p className="text-[11px] text-nexus-muted leading-relaxed">
                        {token.explanation}
                      </p>
                      {token.depth > 0 && (
                        <div className="text-[10px] font-mono text-nexus-muted/70 mt-1 flex items-center gap-1">
                          <span>Derinlik Seviyesi:</span>
                          <span className="font-bold text-nexus-text">L{token.depth}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: ReDoS Scanner */}
        {activeTab === 'redos' && (
          <div className="space-y-4">
            {/* Health summary card */}
            <div
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                redosAnalysis.severity === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : redosAnalysis.severity === 'medium' || redosAnalysis.severity === 'low'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    redosAnalysis.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-400'
                      : redosAnalysis.severity === 'medium' || redosAnalysis.severity === 'low'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {redosAnalysis.severity === 'critical' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-nexus-text">
                      {redosAnalysis.headline}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        redosAnalysis.severity === 'critical'
                          ? 'bg-rose-500 text-white'
                          : redosAnalysis.severity === 'medium' || redosAnalysis.severity === 'low'
                            ? 'bg-amber-500 text-black'
                            : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {redosAnalysis.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-nexus-muted mt-1">
                    En Kötü Durum Zaman Karmaşıklığı (Worst-Case Time Complexity):{' '}
                    <strong className="text-nexus-text font-mono">
                      {redosAnalysis.worstCaseComplexity}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-nexus-text">
                    {redosAnalysis.score}
                    <span className="text-xs text-nexus-muted">/100</span>
                  </div>
                  <div className="text-[10px] font-mono text-nexus-muted uppercase">Güvenlik İndeksi</div>
                </div>
                <div className="w-14 h-2 bg-nexus-bg rounded-full overflow-hidden border border-nexus-border">
                  <div
                    className={`h-full transition-all duration-500 ${
                      redosAnalysis.score >= 85
                        ? 'bg-emerald-400'
                        : redosAnalysis.score >= 50
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${redosAnalysis.score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Findings breakdown */}
            {redosAnalysis.findings.length > 0 ? (
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono uppercase text-nexus-muted font-bold flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Tespit Edilen ReDoS Riskleri ve Çözüm Önerileri ({redosAnalysis.findings.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {redosAnalysis.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-nexus-bg border border-nexus-border/50 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          {f.title}
                        </span>
                        <code className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          {f.patternSnippet}
                        </code>
                      </div>
                      <p className="text-xs text-nexus-muted leading-relaxed">
                        {f.explanation}
                      </p>
                      <div className="p-2 rounded-lg bg-nexus-surface border border-nexus-border/40 text-xs text-nexus-text font-mono flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-emerald-400">Çözüm Önerisi:</strong> {f.remedy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-nexus-bg border border-emerald-500/20 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-nexus-text">
                    Tebrikler! Desende ReDoS Zafiyeti Bulunmadı.
                  </div>
                  <div className="text-nexus-muted mt-0.5 text-[11px]">
                    İç içe quantifiers, örtüşen belirsiz kümeler veya katastrofik geri adım tuzakları tespit edilmedi. Desen güvenle sunucu ortamında çalıştırılabilir.
                  </div>
                </div>
              </div>
            )}

            {/* Pathological Test String Simulator */}
            {redosAnalysis.pathologicalInput && (
              <div className="p-3 bg-nexus-bg/70 border border-nexus-border/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-nexus-muted flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Potansiyel Backtracking Simülasyon Payload'ı:
                  </span>
                  <button
                    onClick={() => {
                      setTestString(redosAnalysis.pathologicalInput || '')
                      cyberAudio.click()
                    }}
                    className="text-[11px] text-nexus-cyan hover:underline font-mono"
                  >
                    Test Kutusuna Aktar ↗
                  </button>
                </div>
                <code className="block p-2 rounded-lg bg-black/40 border border-nexus-border/30 text-xs font-mono text-amber-300 break-all">
                  {redosAnalysis.pathologicalInput}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-xs text-nexus-muted">
              Sık kullanılan endüstri standardı regex kalıplarını tek tıkla stüdyoya yükleyin:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <motion.div
                  key={p.name}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => loadPreset(p)}
                  className="p-3.5 bg-nexus-bg border border-nexus-border/40 hover:border-nexus-accent/50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-nexus-text group-hover:text-nexus-accent transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-nexus-cyan bg-nexus-cyan/10 px-1.5 py-0.5 rounded">
                      /{p.flags}
                    </span>
                  </div>
                  <p className="text-[11px] text-nexus-muted line-clamp-2 leading-relaxed">
                    {p.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Language Code Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-3xl bg-nexus-surface border border-nexus-border rounded-2xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-nexus-border/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-nexus-cyan/15 text-nexus-cyan border border-nexus-cyan/30">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-nexus-text flex items-center gap-2">
                      Multi-Language Code Export
                    </h3>
                    <p className="text-xs text-nexus-muted">
                      6 popüler dilde doğrudan projeye yapıştırabileceğiniz üretim seviyesi kod şablonları
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Language Selector Tabs */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {codeSnippets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      cyberAudio.click()
                      setSelectedLang(s.id)
                    }}
                    className={`px-3 py-2 rounded-xl border text-center transition-all ${
                      selectedLang === s.id
                        ? 'bg-nexus-accent text-white border-nexus-accent shadow-md shadow-nexus-accent/20 font-bold'
                        : 'bg-nexus-bg text-nexus-muted hover:text-nexus-text border-nexus-border/40'
                    }`}
                  >
                    <div className="text-xs truncate">{s.name}</div>
                    <div className="text-[10px] opacity-70 font-mono">.{s.extension}</div>
                  </button>
                ))}
              </div>

              {/* Code Snippet Box */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between text-xs text-nexus-muted">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-nexus-cyan" />
                    {currentSnippet.description}
                  </span>
                  <span className="font-mono text-[11px] text-nexus-muted">
                    Format: /{pattern}/{flags}
                  </span>
                </div>

                <div className="relative flex-1 bg-black/60 border border-nexus-border/60 rounded-xl p-4 overflow-auto font-mono text-xs leading-relaxed text-emerald-300 selection:bg-nexus-accent/40 selection:text-white max-h-[340px]">
                  <pre>{currentSnippet.code}</pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-nexus-border/30">
                <div className="text-xs text-nexus-muted font-mono hidden sm:block">
                  Çalışır durumda hazır şablon panoya kopyalanmaya hazır.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={handleCopyExportCode}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-nexus-accent hover:bg-nexus-accent/90 text-xs font-semibold text-white transition-all shadow-lg shadow-nexus-accent/25 active:scale-95"
                  >
                    {exportCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{currentSnippet.name} Kodunu Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Co-Pilot Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
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
      </AnimatePresence>
    </div>
  )
}
