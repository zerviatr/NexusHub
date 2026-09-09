import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Copy, Check, Play, BookOpen, AlertCircle, Sparkles } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'

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
    </div>
  )
}
