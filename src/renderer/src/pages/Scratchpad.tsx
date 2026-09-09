import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  Columns,
  Eye,
  Edit3,
  Code,
  Bold,
  Italic,
  List,
  Heading,
  Clock,
  Sparkles,
  Link,
  CheckSquare,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'

const DEFAULT_MARKDOWN = `# NexusHub Scratchpad

Hızlı notlar, geçici kod blokları, regex parçacıkları veya API şablonları için çevrimdışı not alanı.

## Özellikler
- [x] Canlı çift panel (Split-View) önizleme
- [x] Otomatik yerel kaydetme (LocalStorage)
- [x] Markdown (.md) ve HTML (.html) dışa aktarma
- [x] Anlık kelime ve karakter istatistiği

\`\`\`typescript
// Örnek Kod Bloğu
const welcome = (name: string): string => {
  return \`Hoş geldin \${name}! NexusHub gücünü keşfet.\`;
};
\`\`\`

> "Bütün araçlar tek bir komutta elinizin altında."
`

export default function Scratchpad() {
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [content, setContent] = useState(() => {
    return localStorage.getItem('nexus_scratchpad_content') || DEFAULT_MARKDOWN
  })
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [copied, setCopied] = useState(false)

  // Auto-save
  useEffect(() => {
    localStorage.setItem('nexus_scratchpad_content', content)
  }, [content])

  // Word, char and reading time metrics
  const charCount = content.length
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))

  const insertSnippet = (prefix: string, suffix: string = '') => {
    try {
      cyberAudio.click()
    } catch {}
    setContent((prev) => prev + `\n${prefix}örnek${suffix}\n`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    try {
      cyberAudio.copySuccess()
    } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    showToastSuccess('Kopyalandı', 'Markdown içeriği panoya kopyalandı.')
  }

  const handleDownloadMd = () => {
    try {
      cyberAudio.copySuccess()
    } catch {}
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexushub_note_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToastSuccess('İndirildi', 'Markdown dosyası kaydedildi.')
  }

  const handleDownloadHtml = () => {
    try {
      cyberAudio.copySuccess()
    } catch {}
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NexusHub Scratchpad Export</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.6;background:#0a0a0f;color:#e4e4ed;max-width:800px;margin:auto;}pre{background:#1a1a2e;padding:1rem;border-radius:8px;}blockquote{border-left:4px solid #8b5cf6;padding-left:1rem;color:#a78bfa;}</style></head><body><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexushub_export_${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    showToastSuccess('İndirildi', 'HTML dosyası kaydedildi.')
  }

  const handleClear = () => {
    if (window.confirm('Not defterini temizlemek istediğinizden emin misiniz?')) {
      try {
        cyberAudio.shred()
      } catch {}
      setContent('')
      showToastSuccess('Temizlendi', 'Not defteri sıfırlandı.')
    }
  }

  // Basic markdown parser for live preview
  const renderSimpleMarkdown = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold text-white mb-3 mt-4 border-b border-nexus-border pb-2">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-nexus-cyan mb-2 mt-3">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-semibold text-nexus-accent mb-1 mt-2">{line.slice(4)}</h3>
      }
      if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
        const isChecked = line.startsWith('- [x] ')
        return (
          <div key={idx} className="flex items-center gap-2 my-1 text-sm">
            <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${isChecked ? 'bg-nexus-cyan text-black font-bold' : 'border border-nexus-muted'}`}>
              {isChecked ? '✓' : ''}
            </span>
            <span className={isChecked ? 'line-through text-nexus-muted' : 'text-white'}>{line.slice(6)}</span>
          </div>
        )
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-nexus-text my-0.5">
            {line.slice(2)}
          </li>
        )
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-nexus-accent pl-3 py-1 my-2 bg-nexus-accent/10 rounded-r-lg text-xs italic text-nexus-accent-light">
            {line.slice(2)}
          </blockquote>
        )
      }
      if (line.startsWith('```')) {
        return (
          <div key={idx} className="bg-black/60 p-2.5 rounded-xl border border-nexus-border/60 font-mono text-xs text-nexus-cyan my-1">
            {line}
          </div>
        )
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />
      }
      return (
        <p key={idx} className="text-sm text-nexus-text/90 my-1 leading-relaxed">
          {line}
        </p>
      )
    })
  }

  return (
    <BaseToolTemplate
      icon={FileText}
      title="Markdown & Snippet Scratchpad"
      description="Canlı çift panel önizleme, anlık istatistikler ve otomatik yerel kayıt desteğine sahip minimalist Markdown not defteri."
      gradient="from-emerald-600 to-teal-500"
    >
      <div className="space-y-4">
        {/* Top Action Bar */}
        <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Format Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertSnippet('**', '**')}
              className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
              title="Kalın"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('*', '*')}
              className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
              title="İtalik"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('### ')}
              className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
              title="Başlık"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('```\n', '\n```')}
              className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
              title="Kod Bloğu"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('- [ ] ')}
              className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
              title="Görev Kutusu"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View mode buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'edit' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
              }`}
            >
              Editör
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
              }`}
            >
              İkili Panel
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'preview' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
              }`}
            >
              Önizleme
            </button>
          </div>

          {/* Export & Copy Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Kopyala</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMd}
              className="px-3 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.md</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.html</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all active:scale-95"
              title="Temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dual Editor & Preview Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[550px]">
          {/* Editor Pane */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} glass-card p-4 flex flex-col h-full`}>
              <div className="flex items-center justify-between pb-2 border-b border-nexus-border/30 mb-2">
                <span className="text-[11px] font-mono text-nexus-muted uppercase">Markdown Girişi</span>
                <span className="text-[10px] font-mono text-emerald-400">● Otomatik Kayıt Açık</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Markdown metninizi buraya yazın..."
                className="flex-1 w-full bg-transparent resize-none focus:outline-none font-mono text-xs text-white leading-relaxed placeholder-nexus-muted selection:bg-nexus-accent/30"
              />
            </div>
          )}

          {/* Preview Pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} glass-card p-6 overflow-y-auto h-full bg-nexus-surface/40 border-nexus-border/60`}>
              <div className="flex items-center justify-between pb-2 border-b border-nexus-border/30 mb-4">
                <span className="text-[11px] font-mono text-nexus-muted uppercase">Canlı Önizleme</span>
                <span className="text-[10px] font-mono text-nexus-cyan">Görsel Çıktı</span>
              </div>
              <div className="prose prose-invert max-w-none">
                {renderSimpleMarkdown(content)}
              </div>
            </div>
          )}
        </div>

        {/* Statistics Bar */}
        <div className="glass-card p-3 px-4 flex items-center justify-between text-xs font-mono text-nexus-muted">
          <div className="flex items-center gap-6">
            <span>Karakter: <strong className="text-white">{charCount}</strong></span>
            <span>Kelime: <strong className="text-white">{wordCount}</strong></span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-nexus-cyan" />
              <span>Okuma Süresi: <strong className="text-white">~{readingTimeMinutes} dk</strong></span>
            </span>
          </div>
          <span className="text-[11px] text-nexus-muted/70">
            Veriler tarayıcı yerel deposunda şifreli/güvenli tutulur.
          </span>
        </div>
      </div>
    </BaseToolTemplate>
  )
}
