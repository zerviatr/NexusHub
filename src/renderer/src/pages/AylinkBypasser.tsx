import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight, CheckCircle2, XCircle, Loader2, Shield, Zap, Copy, Check } from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, BypassResult } from '../lib/ipc'
import { useT } from '../lib/i18n'

const EXAMPLE_URLS = [
  'https://aylink.co/example',
  'https://cpmlink.pro/example',
  'https://ay.live/example',
]

export default function AylinkBypasser() {
  const { t } = useT()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<BypassResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Array<{ url: string; result: BypassResult }>>([])

  const handleBypass = async () => {
    if (!url.trim() || isLoading) return
    setIsLoading(true)
    setResult(null)
    try {
      const res = await nexusAPI.bypassLink(url.trim())
      setResult(res)
      if (res.success) {
        setHistory((prev) => [{ url: url.trim(), result: res }, ...prev.slice(0, 9)])
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBypass()
  }

  return (
    <BaseToolTemplate
      icon={Link2}
      title={t('nav.tools.aylinkBypasser') || "Aylink Bypasser"}
      description={t('dashboard.tools.aylinkBypasser.desc') || "Bypass aylink, cpmlink, ay.live and similar monetised redirect pages instantly — no browser interaction required."}
      gradient="from-violet-600 to-purple-600"
    >
      {/* Input */}
      <div className="space-y-3 mb-6">
        <label className="text-xs font-semibold text-nexus-muted tracking-widest uppercase">
          {t('aylink.pasteLink') || 'Paste Link'}
        </label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
            <input
              id="aylink-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://aylink.co/..."
              className="w-full bg-nexus-card border border-nexus-border rounded-xl pl-10 pr-4 py-3 text-sm text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-nexus-accent transition-colors"
            />
          </div>
          <motion.button
            id="aylink-bypass-btn"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleBypass}
            disabled={isLoading || !url.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {t('aylink.bypass') || 'Bypass'} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>

        {/* Example chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-nexus-muted">{t('aylink.examples') || 'Examples:'}</span>
          {EXAMPLE_URLS.map((ex) => (
            <button
              key={ex}
              onClick={() => setUrl(ex)}
              className="text-[10px] text-nexus-muted/60 hover:text-nexus-accent border border-nexus-border/50 rounded-full px-2 py-0.5 transition-colors"
            >
              {new URL(ex).hostname}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.success ? 'success' : 'error'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className={`glass-card p-5 border ${
              result.success ? 'border-nexus-success/30' : 'border-red-500/30'
            } mb-6`}
          >
            {result.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-nexus-success text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('aylink.success') || 'Bypass Successful'}
                  {result.trackersRemoved !== undefined && result.trackersRemoved > 0 && (
                    <span className="ml-auto text-[11px] font-normal text-nexus-muted">
                      {result.trackersRemoved} tracker{result.trackersRemoved > 1 ? 's' : ''} removed
                    </span>
                  )}
                </div>

                {result.url && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('aylink.finalUrl') || 'Final URL'}</p>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm text-white font-mono break-all leading-relaxed">
                        {result.url}
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCopy(result.url!)}
                        className="shrink-0 p-1.5 rounded-lg bg-nexus-card hover:bg-nexus-accent/20 text-nexus-muted hover:text-nexus-accent transition-colors mt-0.5"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-nexus-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {result.alias && (
                  <p className="text-xs text-nexus-muted">
                    Alias: <span className="text-nexus-text">{result.alias}</span>
                  </p>
                )}

                {result.intermediateUrl && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('aylink.intermediateUrl') || 'Intermediate URL'}</p>
                    <p className="text-xs text-nexus-muted/80 font-mono break-all">{result.intermediateUrl}</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => nexusAPI.openExternal(result.url!)}
                  className="mt-1 w-full py-2 rounded-lg bg-nexus-success/10 border border-nexus-success/20 text-nexus-success text-sm font-medium flex items-center justify-center gap-2 hover:bg-nexus-success/20 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">{t('aylink.failed') || 'Bypass Failed'}</p>
                  <p className="text-xs text-nexus-muted">{result.error || t('aylink.unknownError') || 'Unknown error'}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Zap, label: 'Supported Domains', value: '5+', color: 'text-violet-400' },
          { icon: Shield, label: 'Tracker Removal', value: 'Auto', color: 'text-nexus-success' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3">
            <div className={`${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-nexus-muted">{s.label}</p>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
            {t('aylink.recent') || 'Recent Bypasses'}
          </p>
          {history.map((h, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setUrl(h.url)}
              className="w-full glass-card px-4 py-2.5 text-left flex items-center gap-3 hover:border-nexus-accent/30 transition-colors group"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-nexus-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-nexus-muted truncate">{h.url}</p>
                <p className="text-xs text-nexus-text truncate font-mono">{h.result.url}</p>
              </div>
              <Copy className="w-3 h-3 text-nexus-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      )}
    </BaseToolTemplate>
  )
}
