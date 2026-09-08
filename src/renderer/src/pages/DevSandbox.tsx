import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  Copy,
  Check,
  Code2,
  Sliders,
  Terminal,
  Clock,
  Sparkles,
  Braces,
  KeyRound,
  FileCode2,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useToast } from '../lib/ToastContext'
import axios from 'axios'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
type RequestTab = 'params' | 'headers' | 'auth' | 'body'

export default function DevSandbox() {
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [activeTab, setActiveTab] = useState<RequestTab>('params')

  // Request state
  const [queryParams, setQueryParams] = useState<string>('')
  const [headersText, setHeadersText] = useState<string>('{\n  "Accept": "application/json"\n}')
  const [bearerToken, setBearerToken] = useState<string>('')
  const [bodyText, setBodyText] = useState<string>('{\n  "title": "NexusHub Test",\n  "completed": false\n}')

  // Response state
  const [isSending, setIsSending] = useState(false)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseStatusText, setResponseStatusText] = useState<string>('')
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string> | null>(null)
  const [responseData, setResponseData] = useState<any>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [copiedBody, setCopiedBody] = useState(false)

  const handleSend = async () => {
    if (!url.trim()) return
    setIsSending(true)
    setResponseStatus(null)
    setResponseData(null)
    setResponseHeaders(null)
    setLatencyMs(null)

    const startTime = performance.now()

    try {
      let parsedHeaders: Record<string, string> = {}
      if (headersText.trim()) {
        try {
          parsedHeaders = JSON.parse(headersText)
        } catch {
          showToastError('JSON Hatası', 'Headers geçerli bir JSON objesi olmalıdır.')
        }
      }

      if (bearerToken.trim()) {
        parsedHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`
      }

      let parsedBody: any = undefined
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText.trim()) {
        try {
          parsedBody = JSON.parse(bodyText)
        } catch {
          parsedBody = bodyText
        }
      }

      let targetUrl = url.trim()
      if (queryParams.trim()) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryParams.trim()
      }

      const res = await axios({
        method,
        url: targetUrl,
        headers: parsedHeaders,
        data: parsedBody,
        timeout: 15000,
      })

      const duration = Math.round(performance.now() - startTime)
      setLatencyMs(duration)
      setResponseStatus(res.status)
      setResponseStatusText(res.statusText || 'OK')
      setResponseData(res.data)
      setResponseHeaders(res.headers as any)
      showToastSuccess('İstek Başarılı', `${res.status} ${res.statusText} (${duration}ms)`)
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime)
      setLatencyMs(duration)
      if (err.response) {
        setResponseStatus(err.response.status)
        setResponseStatusText(err.response.statusText || 'Error')
        setResponseData(err.response.data)
        setResponseHeaders(err.response.headers)
      } else {
        setResponseStatus(0)
        setResponseStatusText('Bağlantı Hatası')
        setResponseData({ error: err.message || 'Sunucuya ulaşılamadı.' })
      }
      showToastError('İstek Başarısız', err.message || 'Hata oluştu.')
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyCurl = async () => {
    let curl = `curl -X ${method} "${url}"`
    if (bearerToken) curl += ` \\\n  -H "Authorization: Bearer ${bearerToken}"`
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyText.replace(/\n/g, '')}'`
    }
    await navigator.clipboard.writeText(curl)
    showToastSuccess('cURL Kopyalandı', 'Terminal komutu panoya aktarıldı.')
  }

  const handleCopyBody = async () => {
    if (!responseData) return
    await navigator.clipboard.writeText(JSON.stringify(responseData, null, 2))
    setCopiedBody(true)
    setTimeout(() => setCopiedBody(false), 2000)
  }

  const methodColors: Record<HttpMethod, string> = {
    GET: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    POST: 'text-nexus-cyan border-nexus-cyan/40 bg-nexus-cyan/10',
    PUT: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    DELETE: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    PATCH: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  }

  return (
    <BaseToolTemplate
      icon={Code2}
      title="DevSandbox — API Studio"
      description="Hafif, ultra hızlı REST API ve Webhook test stüdyosu. Ağır araçlara ihtiyaç duymadan GET/POST isteklerini anında gönderin, gecikmeyi ölçün ve cURL çıktısı alın."
      gradient="from-indigo-500 to-nexus-cyan"
    >
      <div className="space-y-6">
        {/* Main Request Bar */}
        <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-3">
          {/* Method selector */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold font-mono outline-none cursor-pointer ${methodColors[method]}`}
          >
            <option value="GET" className="bg-nexus-surface text-white">GET</option>
            <option value="POST" className="bg-nexus-surface text-white">POST</option>
            <option value="PUT" className="bg-nexus-surface text-white">PUT</option>
            <option value="DELETE" className="bg-nexus-surface text-white">DELETE</option>
            <option value="PATCH" className="bg-nexus-surface text-white">PATCH</option>
          </select>

          {/* URL input */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="https://api.example.com/v1/resource"
            className="flex-1 w-full bg-nexus-bg/80 border border-nexus-border rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-nexus-muted/40 font-mono outline-none focus:border-nexus-cyan transition-colors"
          />

          {/* Send button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              disabled={isSending || !url.trim()}
              className="flex-1 md:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-nexus-cyan to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-nexus-cyan/25 disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 fill-current" />
              )}
              <span>{isSending ? 'Gönderiliyor...' : 'İsteği Gönder'}</span>
            </motion.button>

            <button
              onClick={handleCopyCurl}
              className="p-2.5 rounded-xl bg-nexus-card border border-white/5 text-nexus-muted hover:text-white transition-colors"
              title="cURL Komutu Olarak Kopyala"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Request Configuration Tabs */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex gap-2 border-b border-white/5 pb-2">
            {[
              { id: 'params', label: 'Query Parametreleri' },
              { id: 'headers', label: 'Headers (JSON)' },
              { id: 'auth', label: 'Bearer Token' },
              { id: 'body', label: 'Body (JSON Payload)' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as RequestTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/30'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'params' && (
            <div className="space-y-1">
              <label className="text-[10px] text-nexus-muted uppercase font-semibold">URL Parametreleri</label>
              <input
                value={queryParams}
                onChange={(e) => setQueryParams(e.target.value)}
                placeholder="limit=10&page=1&sort=desc"
                className="w-full bg-nexus-bg border border-nexus-border rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
              />
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="space-y-1">
              <label className="text-[10px] text-nexus-muted uppercase font-semibold">Özel HTTP Başlıkları (JSON)</label>
              <textarea
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                rows={4}
                className="w-full bg-nexus-bg border border-nexus-border rounded-xl p-3 text-xs text-white font-mono outline-none resize-y"
              />
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-1">
              <label className="text-[10px] text-nexus-muted uppercase font-semibold flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-nexus-cyan" /> Bearer Token Değeri
              </label>
              <input
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="eyJh..."
                className="w-full bg-nexus-bg border border-nexus-border rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
              />
            </div>
          )}

          {activeTab === 'body' && (
            <div className="space-y-1">
              <label className="text-[10px] text-nexus-muted uppercase font-semibold">İstek Gövdesi (JSON)</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={5}
                className="w-full bg-nexus-bg border border-nexus-border rounded-xl p-3 text-xs text-white font-mono outline-none resize-y"
              />
            </div>
          )}
        </div>

        {/* Response Inspector */}
        {(responseStatus !== null || isSending) && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Yanıt (Response)</span>
                {responseStatus !== null && (
                  <span
                    className={`hud-badge text-[11px] font-mono font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : responseStatus >= 400
                        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                        : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}
                  >
                    {responseStatus} {responseStatusText}
                  </span>
                )}
                {latencyMs !== null && (
                  <span className="hud-badge text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {latencyMs}ms
                  </span>
                )}
              </div>

              {responseData && (
                <button
                  onClick={handleCopyBody}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-nexus-card hover:bg-white/10 text-xs font-medium text-nexus-muted hover:text-white transition-colors"
                >
                  {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBody ? 'Kopyalandı' : 'JSON Kopyala'}</span>
                </button>
              )}
            </div>

            {isSending ? (
              <div className="py-12 flex flex-col items-center justify-center text-nexus-muted space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-nexus-cyan" />
                <span className="text-xs">Sunucudan yanıt bekleniyor...</span>
              </div>
            ) : responseData ? (
              <pre className="p-4 rounded-xl bg-nexus-bg/90 border border-white/5 text-xs text-white font-mono overflow-x-auto max-h-96 whitespace-pre-wrap select-text">
                {JSON.stringify(responseData, null, 2)}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
