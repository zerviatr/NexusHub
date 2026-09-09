import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Send, Copy, Check, Clock, Code, Play, RefreshCw, AlertCircle } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'

interface HttpResponse {
  status: number
  statusText: string
  timeMs: number
  headers: Record<string, string>
  data: string
}

export default function CurlRunner() {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [headersInput, setHeadersInput] = useState('{\n  "Accept": "application/json"\n}')
  const [bodyInput, setBodyInput] = useState('{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSend = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    cyberAudio.click()

    const start = performance.now()
    try {
      let parsedHeaders: Record<string, string> = {}
      if (headersInput.trim()) {
        try {
          parsedHeaders = JSON.parse(headersInput)
        } catch {
          // ignore parsing error or treat as empty
        }
      }

      const options: RequestInit = {
        method,
        headers: parsedHeaders,
      }

      if (method !== 'GET' && bodyInput.trim()) {
        options.body = bodyInput
      }

      const res = await fetch(url, options)
      const elapsed = Math.round(performance.now() - start)

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((val, key) => {
        responseHeaders[key] = val
      })

      const text = await res.text()
      let formatted = text
      try {
        const json = JSON.parse(text)
        formatted = JSON.stringify(json, null, 2)
      } catch {
        // Keep raw text
      }

      setResponse({
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : ''),
        timeMs: elapsed,
        headers: responseHeaders,
        data: formatted,
      })
      cyberAudio.copySuccess()
    } catch (err: any) {
      setError(err.message || 'İstek gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResponse = () => {
    if (!response) return
    navigator.clipboard.writeText(response.data)
    cyberAudio.copySuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nexus-text flex items-center gap-3">
            <Globe className="w-7 h-7 text-nexus-cyan" />
            HTTP & cURL Micro Runner
          </h1>
          <p className="text-sm text-nexus-muted mt-1">
            Hafif, anlık API istek testi, JSON yanıt ayrıştırıcı ve gecikme ölçer
          </p>
        </div>
      </div>

      {/* Request Bar */}
      <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className="bg-nexus-bg border border-nexus-border/40 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-nexus-accent focus:outline-none focus:border-nexus-accent"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 w-full bg-nexus-bg border border-nexus-border/40 rounded-xl px-3.5 py-2.5 text-xs font-mono text-nexus-text placeholder-nexus-muted focus:outline-none focus:border-nexus-cyan"
        />

        <button
          onClick={handleSend}
          disabled={loading || !url.trim()}
          className="w-full md:w-auto px-6 py-2.5 bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-nexus-accent/20 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>{loading ? 'Gönderiliyor...' : 'İstek Gönder'}</span>
        </button>
      </div>

      {/* Editor & Response Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Config (Headers & Body) */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg space-y-4">
          <div>
            <label className="text-xs font-mono text-nexus-muted mb-2 block uppercase tracking-wider">
              Headers (JSON)
            </label>
            <textarea
              value={headersInput}
              onChange={(e) => setHeadersInput(e.target.value)}
              rows={4}
              className="w-full bg-nexus-bg border border-nexus-border/40 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-accent resize-none leading-relaxed"
            />
          </div>

          {method !== 'GET' && (
            <div>
              <label className="text-xs font-mono text-nexus-muted mb-2 block uppercase tracking-wider">
                Request Body (JSON)
              </label>
              <textarea
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                rows={7}
                className="w-full bg-nexus-bg border border-nexus-border/40 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-accent resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Response Viewer */}
        <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-5 shadow-lg flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-nexus-cyan" />
              <span className="text-xs font-mono uppercase tracking-wider text-nexus-muted">Yanıt (Response)</span>
              {response && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {response.status} {response.statusText}
                </span>
              )}
            </div>

            {response && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-nexus-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-nexus-cyan" /> {response.timeMs} ms
                </span>
                <button
                  onClick={handleCopyResponse}
                  className="p-1.5 rounded-lg bg-nexus-bg border border-nexus-border/30 text-nexus-muted hover:text-nexus-text transition-colors"
                  title="Yanıtı Kopyala"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            readOnly
            value={response ? response.data : 'İstek gönderildiğinde yanıt burada görüntülenecektir.'}
            className="w-full flex-1 bg-nexus-bg border border-nexus-border/40 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}
