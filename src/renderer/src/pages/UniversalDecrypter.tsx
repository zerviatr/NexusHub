import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Loader2, Link2, Copy, Check, ShieldAlert, ArrowRight, ClipboardPaste, RotateCcw } from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, DecryptResult } from '../lib/ipc'
import { useT } from '../lib/i18n'

export default function UniversalDecrypter() {
  const { t } = useT()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<DecryptResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isValidUrl = url.trim().length > 0 && url.startsWith('http')

  const handleProcess = async () => {
    if (!isValidUrl || isProcessing) return

    setResult(null)
    setIsProcessing(true)

    try {
      const response = await nexusAPI.decrypter.clean(url.trim())
      setResult(response)
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'An unexpected error occurred.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.cleanUrl) return
    await navigator.clipboard.writeText(result.cleanUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
      inputRef.current?.focus()
    } catch {
      /* clipboard permission denied */
    }
  }

  const handleReset = () => {
    setUrl('')
    setResult(null)
    setCopied(false)
    inputRef.current?.focus()
  }

  const handleOpenExternal = () => {
    if (result?.cleanUrl) window.nexusAPI.openExternal(result.cleanUrl)
  }

  return (
    <BaseToolTemplate
      title={t('nav.tools.decrypter') || "Universal Link Decrypter"}
      description={t('dashboard.tools.decrypter.desc') || "Resolve shortened links to their true destination and strip privacy-invading trackers."}
      icon={ShieldCheck}
    >
      <div className="space-y-6">
        {/* ===== Input Section ===== */}
        <div className="glass-card p-6">
          <label className="block text-sm font-semibold text-nexus-text mb-3">
            {t('decrypter.placeholder') || "Enter Link (bit.ly, t.co, or URL with trackers)"}
          </label>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                placeholder="https://bit.ly/example?utm_source=fb"
                disabled={isProcessing}
                className={`
                  w-full px-4 py-3 pr-10 rounded-xl bg-nexus-bg/80 border text-sm text-white
                  placeholder:text-nexus-muted/50 outline-none transition-all duration-300
                  font-mono disabled:opacity-50
                  ${
                    isValidUrl
                      ? 'border-nexus-success/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : url.length > 0
                        ? 'border-nexus-error/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        : 'border-nexus-border/50 focus:border-nexus-accent/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                  }
                `}
              />
              <button
                onClick={handlePaste}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-nexus-muted hover:text-nexus-accent hover:bg-nexus-accent/10 transition-all"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            </div>

            <motion.button
              whileHover={isValidUrl && !isProcessing ? { scale: 1.02 } : {}}
              whileTap={isValidUrl && !isProcessing ? { scale: 0.98 } : {}}
              onClick={handleProcess}
              disabled={!isValidUrl || isProcessing}
              className={`
                relative px-8 py-3 rounded-xl font-semibold text-sm text-white
                transition-all duration-300 overflow-hidden min-w-[160px]
                ${
                  isValidUrl && !isProcessing
                    ? 'bg-gradient-to-r from-nexus-success to-emerald-500 hover:shadow-lg hover:shadow-nexus-success/25 cursor-pointer'
                    : 'bg-nexus-card text-nexus-muted cursor-not-allowed border border-nexus-border/30'
                }
              `}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('decrypter.decrypting') || "Decrypting..."}
                </span>
              ) : (
                t('decrypter.decrypt') || "Decrypt & Clean"
              )}

              {isValidUrl && !isProcessing && (
                <div className="absolute inset-0 shimmer-bg pointer-events-none" />
              )}
            </motion.button>
          </div>
        </div>

        {/* ===== Processing Visual ===== */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-5 overflow-hidden flex items-center justify-center gap-4 text-nexus-success"
            >
              <div className="relative">
                <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                <div className="absolute inset-0 bg-nexus-success/20 blur-md rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-medium">Resolving redirects & burning trackers...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Result Card ===== */}
        <AnimatePresence>
          {result && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="glass-card p-6 relative overflow-hidden"
            >
              {result.success ? (
                <>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nexus-success/50 to-transparent" />

                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-nexus-success/20 flex items-center justify-center border border-nexus-success/30">
                        <ShieldCheck className="w-5 h-5 text-nexus-success" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-nexus-success">{t('decrypter.success') || 'Link Cleaned'}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-lg bg-nexus-accent/10 border border-nexus-accent/20 flex items-center gap-2 text-xs font-medium text-nexus-accent">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {result.trackersRemoved} Trackers Removed
                      </div>
                      <button
                        onClick={handleReset}
                        className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-all"
                        title="New link"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* URL Comparison */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-nexus-card border border-nexus-border/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Link2 className="w-4 h-4 text-nexus-muted" />
                      </div>
                      <div className="flex-1 min-w-0 bg-nexus-bg/50 p-3 rounded-xl border border-nexus-border/30">
                        <p className="text-[10px] uppercase tracking-widest text-nexus-muted font-bold mb-1">{t('decrypter.original') || 'Original'}</p>
                        <p className="text-xs text-nexus-muted font-mono break-all line-through opacity-70">
                          {result.finalUrl}
                        </p>
                      </div>
                    </div>

                    <div className="pl-4 border-l-2 border-nexus-border/30 ml-4 py-1">
                      <ArrowRight className="w-4 h-4 text-nexus-accent" />
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-nexus-success/20 border border-nexus-success/30 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <Check className="w-4 h-4 text-nexus-success" />
                      </div>
                      <div className="flex-1 min-w-0 bg-nexus-success/5 p-4 rounded-xl border border-nexus-success/20">
                        <p className="text-[10px] uppercase tracking-widest text-nexus-success font-bold mb-1">{t('decrypter.decrypted') || 'Decrypted'}</p>
                        <p className="text-sm text-white font-mono break-all font-semibold">
                          {result.cleanUrl}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopy}
                      className={`
                        flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                        text-sm font-semibold transition-all duration-300
                        ${
                          copied
                            ? 'bg-nexus-success/20 text-nexus-success border border-nexus-success/30'
                            : 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30 hover:bg-nexus-accent/30'
                        }
                      `}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Safe Link
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenExternal}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                        bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/30 hover:bg-nexus-cyan/30
                        transition-all duration-300"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Open Safely
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nexus-error/50 to-transparent" />
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-nexus-error/20 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-4 h-4 text-nexus-error" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-nexus-error">{t('decrypter.failed') || 'Decryption Failed'}</h3>
                      <p className="text-sm text-nexus-muted mt-1">{result.error}</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-nexus-error/10 text-nexus-error border border-nexus-error/20 hover:bg-nexus-error/20 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BaseToolTemplate>
  )
}
