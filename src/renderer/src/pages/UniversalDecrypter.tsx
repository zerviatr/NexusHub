import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Loader2,
  Link2,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  ClipboardPaste,
  RotateCcw,
  Layers,
  Sparkles,
  ExternalLink,
  Tag,
  CheckCircle2,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, DecryptResult, RemovedTrackerInfo } from '../lib/ipc'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'

export default function UniversalDecrypter() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  // Mode: single URL vs batch URLs
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')

  // Single URL state
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<DecryptResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Batch URLs state
  const [batchInput, setBatchInput] = useState('')
  const [batchResults, setBatchResults] = useState<DecryptResult[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [batchCopiedIndex, setBatchCopiedIndex] = useState<number | null>(null)
  const [allBatchCopied, setAllBatchCopied] = useState(false)

  const isValidUrl = url.trim().length > 0 && url.startsWith('http')

  // ─── Single Mode Handlers ───────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!isValidUrl || isProcessing) return

    setResult(null)
    setIsProcessing(true)

    try {
      const response = await nexusAPI.decrypter.clean(url.trim())
      setResult(response)
      if (response.success) {
        showToastSuccess(
          'Bağlantı Temizlendi',
          `${response.trackersRemoved || 0} takipçi parametresi başarıyla kaldırıldı!`
        )
      } else {
        showToastError('Hata', response.error || 'Bağlantı çözülemedi.')
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'An unexpected error occurred.' })
      showToastError('Hata', err.message || 'Beklenmeyen hata.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.cleanUrl) return
    await navigator.clipboard.writeText(result.cleanUrl)
    setCopied(true)
    showToastSuccess('Kopyalandı', 'Güvenli bağlantı panoya kopyalandı.')
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

  // ─── Batch Mode Handlers ────────────────────────────────────────────────────
  const handleBatchProcess = async () => {
    const urls = batchInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'))

    if (urls.length === 0 || isBatchProcessing) return

    setIsBatchProcessing(true)
    setBatchResults([])

    try {
      const results = await nexusAPI.decrypter.cleanBatch(urls)
      setBatchResults(results)
      const totalTrackers = results.reduce((acc, r) => acc + (r.trackersRemoved || 0), 0)
      showToastSuccess(
        'Toplu Temizleme Tamamlandı',
        `${results.length} bağlantıdan toplam ${totalTrackers} takipçi temizlendi.`
      )
    } catch (err: any) {
      showToastError('Toplu İşlem Hatası', err.message || 'Toplu işlem başarısız oldu.')
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleCopyBatchItem = async (cleanUrl: string, idx: number) => {
    await navigator.clipboard.writeText(cleanUrl)
    setBatchCopiedIndex(idx)
    setTimeout(() => setBatchCopiedIndex(null), 1500)
  }

  const handleCopyAllBatch = async () => {
    const text = batchResults
      .map((r) => r.cleanUrl || r.originalUrl)
      .filter(Boolean)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setAllBatchCopied(true)
    showToastSuccess('Tümü Kopyalandı', `${batchResults.length} temiz bağlantı panoya aktarıldı.`)
    setTimeout(() => setAllBatchCopied(false), 2000)
  }

  // Category badge color helper
  const getCategoryBadge = (cat: RemovedTrackerInfo['category']) => {
    switch (cat) {
      case 'ads':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      case 'social':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      case 'analytics':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      case 'campaign':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      default:
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    }
  }

  return (
    <BaseToolTemplate
      title={t('nav.tools.decrypter') || 'Universal Link Decrypter'}
      description={
        t('dashboard.tools.decrypter.desc') ||
        'Kısaltılmış linklerin gerçek hedefini bulun, gizlilik istilacısı Google/Meta/TikTok izleyicilerini arındırın.'
      }
      icon={ShieldCheck}
    >
      <div className="space-y-6">
        {/* ===== Tab Selector ===== */}
        <div className="flex gap-2 p-1 bg-nexus-card rounded-xl border border-nexus-border/50 max-w-md">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'single'
                ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/25'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Tekil Bağlantı</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'batch'
                ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/25'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Toplu Temizleme (Batch)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SINGLE URL MODE */}
        {/* ========================================================================= */}
        {activeTab === 'single' && (
          <>
            {/* Input Section */}
            <div className="glass-card p-6">
              <label className="block text-sm font-semibold text-nexus-text mb-3">
                {t('decrypter.placeholder') || 'Bağlantıyı Girin (bit.ly, t.co veya izleyicili herhangi bir URL)'}
              </label>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                    placeholder="https://example.com/product?utm_source=fb&gclid=123xyz"
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
                    title="Panodan yapıştır"
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
                      <span>{t('decrypter.decrypting') || 'Çözülüyor...'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{t('decrypter.decrypt') || 'Çöz & Temizle'}</span>
                    </span>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Processing Visual */}
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
                  <span className="text-sm font-medium">Yönlendirmeler çözülüyor & izleyiciler arındırılıyor...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Card */}
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
                            <h3 className="text-base font-bold text-nexus-success">
                              {t('decrypter.success') || 'Bağlantı Güvenle Temizlendi'}
                            </h3>
                            <p className="text-xs text-nexus-muted">
                              Gerçek hedef tespit edildi ve tüm gözetim parametreleri budandı.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1.5 rounded-lg bg-nexus-accent/10 border border-nexus-accent/20 flex items-center gap-2 text-xs font-semibold text-nexus-accent">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{result.trackersRemoved || 0} İzleyici Kaldırıldı</span>
                          </div>
                          <button
                            onClick={handleReset}
                            className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-all"
                            title="Yeni bağlantı"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Tracker Taxonomy Badges */}
                      {result.removedList && result.removedList.length > 0 && (
                        <div className="mb-6 p-4 rounded-xl bg-nexus-bg/60 border border-white/5 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-nexus-muted mb-2">
                            <Tag className="w-3.5 h-3.5 text-nexus-cyan" />
                            <span>Kaldırılan Takipçiler & Taksonomi:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.removedList.map((tr, i) => (
                              <div
                                key={i}
                                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 font-mono ${getCategoryBadge(
                                  tr.category
                                )}`}
                              >
                                <span className="font-bold">{tr.name}</span>
                                <span className="text-[10px] opacity-75">({tr.description})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* URL Comparison */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-nexus-card border border-nexus-border/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Link2 className="w-4 h-4 text-nexus-muted" />
                          </div>
                          <div className="flex-1 min-w-0 bg-nexus-bg/50 p-3 rounded-xl border border-nexus-border/30">
                            <p className="text-[10px] uppercase tracking-widest text-nexus-muted font-bold mb-1">
                              {t('decrypter.original') || 'Orijinal Hedef'}
                            </p>
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
                            <p className="text-[10px] uppercase tracking-widest text-nexus-success font-bold mb-1">
                              {t('decrypter.decrypted') || 'Temiz Bağlantı'}
                            </p>
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
                              <span>Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Güvenli Linki Kopyala</span>
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
                          <ExternalLink className="w-4 h-4" />
                          <span>Güvenle Aç</span>
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
                          <h3 className="text-sm font-bold text-nexus-error">
                            {t('decrypter.failed') || 'Çözümleme Başarısız'}
                          </h3>
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
                        <span>Tekrar Dene</span>
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ========================================================================= */}
        {/* BATCH URL MODE */}
        {/* ========================================================================= */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-nexus-text flex items-center gap-2">
                  <Layers className="w-4 h-4 text-nexus-accent" />
                  <span>Toplu Bağlantı Girişi (Her satıra bir URL)</span>
                </label>
                <span className="hud-badge text-[10px] text-nexus-cyan font-mono">
                  {batchInput.split('\n').filter((l) => l.trim().startsWith('http')).length} Geçerli URL
                </span>
              </div>

              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="https://example.com/item1?utm_source=twitter&#10;https://bit.ly/sample-link&#10;https://shop.com/deal?fbclid=abcdef123"
                rows={5}
                disabled={isBatchProcessing}
                className="w-full px-4 py-3 rounded-xl bg-nexus-bg/80 border border-nexus-border/50 text-sm text-white placeholder:text-nexus-muted/40 font-mono outline-none focus:border-nexus-accent/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all resize-y"
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-nexus-muted">
                  Tüm URL'ler sırayla taranacak, izleyicileri arındırılacak ve temiz halleri listelenecektir.
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBatchProcess}
                  disabled={
                    isBatchProcessing ||
                    batchInput.split('\n').filter((l) => l.trim().startsWith('http')).length === 0
                  }
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-nexus-accent to-purple-600 text-white font-semibold text-xs transition-all shadow-lg shadow-nexus-accent/20 hover:shadow-nexus-accent/35 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tümünü Temizle</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Batch Results List */}
            {batchResults.length > 0 && (
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-nexus-success" />
                    <h4 className="text-sm font-bold text-white">
                      Temizlenen Bağlantılar ({batchResults.length})
                    </h4>
                  </div>

                  <button
                    onClick={handleCopyAllBatch}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-card hover:bg-nexus-accent/20 text-nexus-text text-xs font-semibold border border-white/5 transition-all"
                  >
                    {allBatchCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-nexus-accent" />
                    )}
                    <span>{allBatchCopied ? 'Tümü Kopyalandı!' : 'Tümünü Kopyala'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {batchResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-nexus-bg/50 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-nexus-muted font-mono font-bold">#{idx + 1}</span>
                          {item.success ? (
                            <span className="hud-badge text-[10px] text-nexus-success">
                              {item.trackersRemoved || 0} İzleyici Silindi
                            </span>
                          ) : (
                            <span className="hud-badge text-[10px] text-rose-400">Hata</span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-white truncate">
                          {item.cleanUrl || item.originalUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.cleanUrl && (
                          <button
                            onClick={() => handleCopyBatchItem(item.cleanUrl!, idx)}
                            className="p-2 rounded-lg bg-nexus-card hover:bg-nexus-accent/20 text-nexus-muted hover:text-white transition-colors border border-white/5"
                            title="Kopyala"
                          >
                            {batchCopiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {item.cleanUrl && (
                          <button
                            onClick={() => window.nexusAPI.openExternal(item.cleanUrl!)}
                            className="p-2 rounded-lg bg-nexus-card hover:bg-nexus-cyan/20 text-nexus-muted hover:text-white transition-colors border border-white/5"
                            title="Tarayıcıda Aç"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
