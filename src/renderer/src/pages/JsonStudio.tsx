import { useState, useMemo, useEffect } from 'react'
import {
  Braces,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  Minimize2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  FileCode,
  Bot,
  Loader2,
  X,
  Database,
  Table
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { askAI } from '../lib/aiClient'
import { cyberAudio } from '../lib/cyberAudio'
import SqliteViewer from '../components/SqliteViewer'

type StudioTab = 'json' | 'jwt' | 'sqlite'

const SAMPLE_JSON = JSON.stringify(
  {
    app: 'ZenDev',
    version: '1.0.0',
    tier: 'Lifetime Pro',
    license: {
      status: 'active',
      hardwareBound: true,
      features: ['decrypter', 'temp-mail', 'network-tools', 'qr-studio', 'json-studio']
    },
    performance: {
      offlineFirst: true,
      ipcLatencyMs: 0.8
    }
  },
  null,
  2
)

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsIm5hbWUiOiJBbGV4IE1vcmdhbiIsImVtYWlsIjoiYWxleEBuZXh1c2h1Yi5hcHAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjEzNTkyOTYwMCwiaXNzIjoiaHR0cHM6Ly9uZXh1c2h1Yi5hcHAifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function safeBase64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  }
}

export default function JsonStudio() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<StudioTab>('json')

  // JSON Studio state
  const [rawJson, setRawJson] = useState<string>(SAMPLE_JSON)
  const [jsonIndent, setJsonIndent] = useState<number>(2)
  const [copiedJson, setCopiedJson] = useState<boolean>(false)

  // JWT Studio state
  const [rawJwt, setRawJwt] = useState<string>(SAMPLE_JWT)
  const [copiedJwtPayload, setCopiedJwtPayload] = useState<boolean>(false)

  // Listen to incoming data from Smart Paste (CommandPalette / MiniHud)
  useEffect(() => {
    try {
      const incomingJson = localStorage.getItem('nexus_json_input')
      if (incomingJson) {
        setRawJson(incomingJson)
        setActiveTab('json')
        localStorage.removeItem('nexus_json_input')
      }
      const incomingJwt = localStorage.getItem('nexus_jwt_input')
      if (incomingJwt) {
        setRawJwt(incomingJwt)
        setActiveTab('jwt')
        localStorage.removeItem('nexus_jwt_input')
      }
      const requestedTab = localStorage.getItem('nexus_json_tab') as StudioTab | null
      if (requestedTab) {
        setActiveTab(requestedTab)
        localStorage.removeItem('nexus_json_tab')
      }
    } catch {}
  }, [])

  // AI Schema Generator state
  const [showAiModal, setShowAiModal] = useState<boolean>(false)
  const [aiTarget, setAiTarget] = useState<'typescript' | 'sql'>('typescript')
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiOutput, setAiOutput] = useState<string>('')
  const [aiError, setAiError] = useState<string>('')
  const [copiedAi, setCopiedAi] = useState<boolean>(false)

  const handleRunAiSchema = async (target: 'typescript' | 'sql') => {
    if (!rawJson.trim()) return
    setAiTarget(target)
    setShowAiModal(true)
    setAiLoading(true)
    setAiError('')
    setAiOutput('')
    try {
      const prompt =
        target === 'typescript'
          ? `Generate clean, fully-typed TypeScript interface declarations for this JSON data. Return ONLY the TypeScript code without markdown code fences:\n\n${rawJson}`
          : `Generate a clean, standard SQL CREATE TABLE statement with appropriate data types for this JSON structure. Return ONLY the SQL code without markdown code fences:\n\n${rawJson}`

      const res = await askAI(prompt, 'You are an expert software engineer generating schema types from JSON.')
      const clean = res.replace(/^```[a-z]*\n?|```$/gim, '').trim()
      setAiOutput(clean)
      cyberAudio.copySuccess()
    } catch (err: any) {
      setAiError(err.message || 'AI çağrısı başarısız oldu. Lütfen Account sayfasından AI ayarlarınızı kontrol edin.')
    } finally {
      setAiLoading(false)
    }
  }

  // JSON Analysis & Validation
  const jsonAnalysis = useMemo(() => {
    if (!rawJson.trim()) {
      return { isValid: false, error: null, formatted: '', byteSize: 0, lineCount: 0 }
    }
    try {
      const parsed = JSON.parse(rawJson)
      const formatted = JSON.stringify(parsed, null, jsonIndent)
      const byteSize = new Blob([rawJson]).size
      const lineCount = formatted.split('\n').length
      return { isValid: true, error: null, formatted, byteSize, lineCount, parsed }
    } catch (err: any) {
      return {
        isValid: false,
        error: err.message || 'Invalid JSON syntax',
        formatted: '',
        byteSize: new Blob([rawJson]).size,
        lineCount: rawJson.split('\n').length
      }
    }
  }, [rawJson, jsonIndent])

  // JWT Analysis & Decoding
  const jwtAnalysis = useMemo(() => {
    const trimmed = rawJwt.trim()
    if (!trimmed) {
      return { isValid: false, parts: null, header: null, payload: null, signature: null, error: null }
    }

    const segments = trimmed.split('.')
    if (segments.length !== 3) {
      return {
        isValid: false,
        parts: null,
        header: null,
        payload: null,
        signature: null,
        error: 'JWT must consist of three period-separated base64url segments (Header.Payload.Signature)'
      }
    }

    try {
      const headerStr = safeBase64UrlDecode(segments[0])
      const payloadStr = safeBase64UrlDecode(segments[1])

      const headerObj = JSON.parse(headerStr)
      const payloadObj = JSON.parse(payloadStr)

      return {
        isValid: true,
        parts: segments,
        header: headerObj,
        payload: payloadObj,
        signature: segments[2],
        error: null
      }
    } catch (err: any) {
      return {
        isValid: false,
        parts: segments,
        header: null,
        payload: null,
        signature: segments[2] || '',
        error: 'Unable to parse JWT segments: ' + (err.message || 'Malformed base64url payload')
      }
    }
  }, [rawJwt])

  // Format JSON actions
  const handleBeautify = (spaces: number = 2) => {
    setJsonIndent(spaces)
    try {
      const parsed = JSON.parse(rawJson)
      setRawJson(JSON.stringify(parsed, null, spaces))
    } catch {}
  }

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(rawJson)
      setRawJson(JSON.stringify(parsed))
    } catch {}
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const handleCopyJwtPayload = () => {
    if (jwtAnalysis.payload) {
      navigator.clipboard.writeText(JSON.stringify(jwtAnalysis.payload, null, 2))
      setCopiedJwtPayload(true)
      setTimeout(() => setCopiedJwtPayload(false), 2000)
    }
  }

  // Format timestamp claims
  const formatEpoch = (epoch: number | undefined) => {
    if (!epoch) return null
    const date = new Date(epoch * 1000)
    const isPast = date.getTime() < Date.now()
    const diffSec = Math.abs(Math.floor((date.getTime() - Date.now()) / 1000))
    const diffDays = Math.floor(diffSec / 86400)
    const diffHours = Math.floor((diffSec % 86400) / 3600)

    let relative = ''
    if (diffDays > 0) relative = `${diffDays}d ${diffHours}h`
    else relative = `${diffHours}h`

    return {
      formatted: date.toLocaleString(),
      isPast,
      relativeText: isPast ? `Expired ${relative} ago` : `Active (${relative} remaining)`
    }
  }

  const expInfo = jwtAnalysis.payload?.exp ? formatEpoch(jwtAnalysis.payload.exp) : null
  const iatInfo = jwtAnalysis.payload?.iat ? formatEpoch(jwtAnalysis.payload.iat) : null

  return (
    <BaseToolTemplate
      title={t('jsonStudio.title') || 'JSON & JWT Studio'}
      description={t('jsonStudio.description') || 'Format, validate, and minify JSON with real-time error detection. Decode and inspect JWT claims 100% client-side.'}
      icon={Braces}
      gradient="from-indigo-500 to-cyan-500"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'json'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Braces className="w-3.5 h-3.5" />
              JSON Formatter & Validator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jwt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'jwt'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              JWT Token Inspector
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sqlite')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'sqlite'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SQLite & Table Viewer
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-400" />
            Zero network transit &bull; Offline engine
          </span>
        </div>

        {/* ─── TAB 1: JSON FORMATTER & VALIDATOR ──────────────────────────── */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBeautify(2)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/50 text-xs font-medium text-white hover:border-nexus-cyan/40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-nexus-cyan" />
                  Format (2 Spaces)
                </button>
                <button
                  type="button"
                  onClick={() => handleBeautify(4)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/50 text-xs font-medium text-white hover:border-nexus-cyan/40 transition-colors"
                >
                  Format (4 Spaces)
                </button>
                <button
                  type="button"
                  onClick={handleMinify}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/50 text-xs font-medium text-white hover:border-nexus-cyan/40 transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                  Minify
                </button>
                <button
                  type="button"
                  onClick={() => setRawJson(SAMPLE_JSON)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface/60 border border-white/5 text-xs text-nexus-muted hover:text-white transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Load Sample
                </button>
                <div className="h-4 w-px bg-white/10 mx-1 hidden md:block" />
                <button
                  type="button"
                  onClick={() => handleRunAiSchema('typescript')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-medium text-purple-300 transition-colors shadow-sm"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  AI &rarr; TypeScript
                </button>
                <button
                  type="button"
                  onClick={() => handleRunAiSchema('sql')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-medium text-purple-300 transition-colors shadow-sm"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  AI &rarr; SQL Table
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawJson('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/30 text-xs font-semibold text-nexus-cyan hover:bg-nexus-cyan/30 transition-all"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-2">
                {jsonAnalysis.isValid ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {jsonAnalysis.error || 'Empty input'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-nexus-muted font-mono text-[11px]">
                <span>{jsonAnalysis.byteSize} Bytes</span>
                <span>&bull;</span>
                <span>{jsonAnalysis.lineCount} Lines</span>
              </div>
            </div>

            {/* Editor Area */}
            <div className="relative glass-panel rounded-2xl overflow-hidden border border-white/5">
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder="Paste or type JSON here..."
                rows={16}
                spellCheck={false}
                className="w-full p-5 bg-nexus-surface/90 text-sm font-mono text-nexus-text leading-relaxed focus:outline-none resize-y border-0 selection:bg-nexus-cyan/30"
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: JWT TOKEN INSPECTOR ───────────────────────────────── */}
        {activeTab === 'jwt' && (
          <div className="space-y-6">
            {/* Input card */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-nexus-cyan" />
                  Encoded JWT String
                </label>
                <button
                  type="button"
                  onClick={() => setRawJwt(SAMPLE_JWT)}
                  className="text-xs text-nexus-cyan hover:underline"
                >
                  Load Sample Token
                </button>
              </div>

              <textarea
                value={rawJwt}
                onChange={(e) => setRawJwt(e.target.value)}
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/50 resize-none break-all"
              />

              {jwtAnalysis.parts && (
                <div className="text-[11px] font-mono break-all p-3 rounded-xl bg-nexus-surface/50 border border-white/5 space-y-1">
                  <span className="text-rose-400">{jwtAnalysis.parts[0]}</span>
                  <span className="text-nexus-muted">.</span>
                  <span className="text-nexus-cyan">{jwtAnalysis.parts[1]}</span>
                  <span className="text-nexus-muted">.</span>
                  <span className="text-emerald-400">{jwtAnalysis.parts[2]}</span>
                </div>
              )}

              {jwtAnalysis.error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jwtAnalysis.error}</span>
                </div>
              )}
            </div>

            {/* Claims & Decoded Breakdown */}
            {jwtAnalysis.isValid && jwtAnalysis.payload && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Claims Summary Cards */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-nexus-muted uppercase tracking-wider">
                    Key Claims & Validity
                  </h4>

                  {/* Expiration badge */}
                  {expInfo && (
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-start gap-3">
                      <Clock className={`w-4 h-4 mt-0.5 ${expInfo.isPast ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <div>
                        <div className="text-xs font-medium text-white flex items-center gap-2">
                          <span>Expires at (exp)</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              expInfo.isPast
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {expInfo.relativeText}
                          </span>
                        </div>
                        <p className="text-xs text-nexus-muted mt-1 font-mono">{expInfo.formatted}</p>
                      </div>
                    </div>
                  )}

                  {/* Issued at badge */}
                  {iatInfo && (
                    <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-nexus-muted mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-white">Issued at (iat)</span>
                        <p className="text-xs text-nexus-muted mt-1 font-mono">{iatInfo.formatted}</p>
                      </div>
                    </div>
                  )}

                  {/* Subject, Issuer, Audience */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-2.5">
                    {jwtAnalysis.payload.sub && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-nexus-muted font-mono">sub (Subject):</span>
                        <span className="text-white font-mono">{String(jwtAnalysis.payload.sub)}</span>
                      </div>
                    )}
                    {jwtAnalysis.payload.iss && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-nexus-muted font-mono">iss (Issuer):</span>
                        <span className="text-white font-mono">{String(jwtAnalysis.payload.iss)}</span>
                      </div>
                    )}
                    {jwtAnalysis.header?.alg && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-nexus-muted font-mono">alg (Algorithm):</span>
                        <span className="text-nexus-cyan font-mono font-semibold">{String(jwtAnalysis.header.alg)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decoded Payload Inspector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-nexus-cyan uppercase tracking-wider flex items-center gap-1.5">
                      Decoded Payload
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyJwtPayload}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-nexus-surface/80 border border-white/10 text-xs text-nexus-text hover:bg-white/10 transition-colors"
                    >
                      {copiedJwtPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedJwtPayload ? 'Copied' : 'Copy Payload'}
                    </button>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border border-nexus-cyan/20 bg-nexus-surface/80">
                    <pre className="text-xs font-mono text-nexus-text overflow-x-auto max-h-80 leading-relaxed">
                      {JSON.stringify(jwtAnalysis.payload, null, 2)}
                    </pre>
                  </div>

                  {/* Header inspection */}
                  {jwtAnalysis.header && (
                    <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 bg-nexus-surface/80">
                      <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-2">
                        Decoded Header
                      </div>
                      <pre className="text-xs font-mono text-nexus-text overflow-x-auto leading-relaxed">
                        {JSON.stringify(jwtAnalysis.header, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: SQLITE & TABLE VIEWER ──────────────────────────────── */}
        {activeTab === 'sqlite' && (
          <SqliteViewer
            onExportToJsonTab={(jsonString) => {
              setRawJson(jsonString)
              setActiveTab('json')
            }}
          />
        )}

      {/* AI Schema Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-nexus-surface border border-nexus-border/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-nexus-border/30">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <Bot className="w-4 h-4" />
                <span>AI Schema Engine &bull; {aiTarget === 'typescript' ? 'TypeScript Interface' : 'SQL Table DDL'}</span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-xs text-nexus-muted">JSON şeması analiz ediliyor ve kod üretiliyor...</p>
              </div>
            ) : aiError ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {aiError}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-nexus-muted font-mono">
                    {aiTarget === 'typescript' ? 'generated-types.ts' : 'schema.sql'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(aiOutput)
                      cyberAudio.copySuccess()
                      setCopiedAi(true)
                      setTimeout(() => setCopiedAi(false), 2000)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-nexus-cyan transition-colors"
                  >
                    {copiedAi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAi ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-nexus-bg border border-nexus-border/40 max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-purple-200 leading-relaxed whitespace-pre-wrap">
                    {aiOutput}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </BaseToolTemplate>
  )
}
