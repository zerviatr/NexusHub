import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { cyberAudio } from '../lib/cyberAudio'

interface SelectedPDF {
  path: string
  name: string
  size: number
  pageCount?: number
  title?: string
  author?: string
}

export default function PdfStudio() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge')

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<SelectedPDF[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ success: boolean; path?: string; pageCount?: number; size?: number; error?: string } | null>(null)

  // Split State
  const [splitFile, setSplitFile] = useState<SelectedPDF | null>(null)
  const [pageRange, setPageRange] = useState<string>('1-2')
  const [isSplitting, setIsSplitting] = useState(false)
  const [splitResult, setSplitResult] = useState<{ success: boolean; path?: string; pageCount?: number; error?: string } | null>(null)

  // Format bytes
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Handle select files for merge
  const handleSelectMergeFiles = async () => {
    cyberAudio.click()
    const files = await window.nexusAPI?.pdf?.selectFiles(true)
    if (files && files.length > 0) {
      setMergeFiles((prev) => [...prev, ...files])
      setMergeResult(null)
    }
  }

  // Reorder merge files
  const moveFile = (index: number, direction: 'up' | 'down') => {
    cyberAudio.click()
    const newFiles = [...mergeFiles]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newFiles.length) return
    const temp = newFiles[index]
    newFiles[index] = newFiles[targetIndex]
    newFiles[targetIndex] = temp
    setMergeFiles(newFiles)
  }

  const removeFile = (index: number) => {
    cyberAudio.click()
    setMergeFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Execute Merge
  const handleMerge = async () => {
    if (mergeFiles.length < 2) return
    setIsMerging(true)
    setMergeResult(null)
    cyberAudio.click()

    try {
      const res = await window.nexusAPI?.pdf?.merge({
        filePaths: mergeFiles.map((f) => f.path),
        outputFileName: 'NexusHub_Birlestirilmis.pdf',
      })
      if (res && res.success) {
        setMergeResult({ success: true, path: res.outputPath, pageCount: res.totalCount, size: res.size })
        cyberAudio.copySuccess()
      } else if (res && !res.canceled) {
        setMergeResult({ success: false, error: res.error || 'Birleştirme başarısız oldu' })
      }
    } catch (err: any) {
      setMergeResult({ success: false, error: err.message })
    } finally {
      setIsMerging(false)
    }
  }

  // Handle select single file for split
  const handleSelectSplitFile = async () => {
    cyberAudio.click()
    const files = await window.nexusAPI?.pdf?.selectFiles(false)
    if (files && files.length > 0) {
      setSplitFile(files[0])
      setSplitResult(null)
      if (files[0].pageCount && files[0].pageCount > 1) {
        setPageRange(`1-${Math.min(3, files[0].pageCount)}`)
      } else {
        setPageRange('1')
      }
    }
  }

  // Execute Split
  const handleSplit = async () => {
    if (!splitFile || !pageRange.trim()) return
    setIsSplitting(true)
    setSplitResult(null)
    cyberAudio.click()

    try {
      const res = await window.nexusAPI?.pdf?.split({
        filePath: splitFile.path,
        pageRange: pageRange.trim(),
      })
      if (res && res.success) {
        setSplitResult({ success: true, path: res.outputPath, pageCount: res.pageCount })
        cyberAudio.copySuccess()
      } else if (res && !res.canceled) {
        setSplitResult({ success: false, error: res.error || 'Sayfa çıkarma başarısız oldu' })
      }
    } catch (err: any) {
      setSplitResult({ success: false, error: err.message })
    } finally {
      setIsSplitting(false)
    }
  }

  return (
    <BaseToolTemplate
      title="PDF Stüdyosu & Evrak Paketi"
      description="PDF dosyalarını sıralı birleştirin, sayfa aralığına göre bölün veya yeni PDF oluşturun. %100 yerel ve gizli."
      icon={FileText}
      gradient="from-amber-500 to-rose-500"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('merge')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'merge'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              PDF Birleştirme (Merge)
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('split')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'split'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              PDF Bölme & Sayfa Çıkarma (Split)
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted font-mono flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            pdf-lib Native Engine &bull; Sıfır Bulut Bağımlılığı
          </span>
        </div>

        {/* ─── TAB 1: MERGE ──────────────────────────────────────────────── */}
        {activeTab === 'merge' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Birleştirilecek PDF Listesi</h3>
                <p className="text-xs text-nexus-muted">
                  Dosyaların birleştirme sırasını yukarı/aşağı butonlarıyla düzenleyebilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectMergeFiles}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  PDF Dosyası Ekle
                </button>
                {mergeFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMergeFiles([])}
                    className="p-2 rounded-xl hover:bg-rose-500/10 text-nexus-muted hover:text-rose-400 transition-colors"
                    title="Listeyi Temizle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {mergeFiles.length === 0 ? (
              <div
                onClick={handleSelectMergeFiles}
                className="border-2 border-dashed border-nexus-border/50 hover:border-amber-500/50 rounded-2xl p-12 text-center cursor-pointer transition-colors space-y-3 bg-nexus-surface/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">PDF Dosyalarını Eklemek İçin Tıklayın</p>
                  <p className="text-xs text-nexus-muted mt-1">İki veya daha fazla PDF seçerek tek bir dosyada toplayın.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {mergeFiles.map((file, index) => (
                    <motion.div
                      key={file.path + index}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 hover:border-nexus-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-mono font-bold text-nexus-muted">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-nexus-muted font-mono">
                            <span>{formatSize(file.size)}</span>
                            {file.pageCount !== undefined && file.pageCount > 0 && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-400">{file.pageCount} Sayfa</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveFile(index, 'up')}
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-nexus-muted hover:text-white transition-colors"
                          title="Yukarı Taşı"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === mergeFiles.length - 1}
                          onClick={() => moveFile(index, 'down')}
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-nexus-muted hover:text-white transition-colors"
                          title="Aşağı Taşı"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-nexus-muted hover:text-rose-400 transition-colors"
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Merge Action Card */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-nexus-surface border border-white/5 mt-4">
                  <div className="text-xs text-nexus-muted">
                    Toplam <span className="text-white font-semibold">{mergeFiles.length} dosya</span>, yaklaşık{' '}
                    <span className="text-amber-300 font-semibold">
                      {mergeFiles.reduce((acc, f) => acc + (f.pageCount || 0), 0)} sayfa
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={mergeFiles.length < 2 || isMerging}
                    onClick={handleMerge}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    {isMerging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Birleştiriliyor...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>PDF'leri Birleştir & Kaydet</span>
                      </>
                    )}
                  </button>
                </div>

                {mergeResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      mergeResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    }`}
                  >
                    {mergeResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Başarıyla birleştirildi ({mergeResult.pageCount} sayfa). Dosya:{' '}
                          <span className="font-mono text-white">{mergeResult.path}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{mergeResult.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: SPLIT ──────────────────────────────────────────────── */}
        {activeTab === 'split' && (
          <div className="space-y-6">
            {!splitFile ? (
              <div
                onClick={handleSelectSplitFile}
                className="border-2 border-dashed border-nexus-border/50 hover:border-rose-500/50 rounded-2xl p-12 text-center cursor-pointer transition-colors space-y-3 bg-nexus-surface/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Bölünecek PDF Dosyasını Seçin</p>
                  <p className="text-xs text-nexus-muted mt-1">Sayfa aralığı veya tekil sayfaları ayıklamak için PDF yükleyin.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File summary */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-nexus-surface border border-nexus-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{splitFile.name}</p>
                      <p className="text-[11px] text-nexus-muted font-mono mt-0.5">
                        {formatSize(splitFile.size)} &bull;{' '}
                        <span className="text-rose-400 font-bold">{splitFile.pageCount} Sayfa</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectSplitFile}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
                  >
                    Farklı Dosya Seç
                  </button>
                </div>

                {/* Page Range Input */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white block mb-1">
                      Çıkarılacak Sayfa Aralığı
                    </label>
                    <p className="text-[11px] text-nexus-muted mb-2">
                      Virgülle ayrılmış sayfa numaraları veya aralıklar girebilirsiniz (Örn: <code className="text-rose-300">1-3, 5, 8-10</code>)
                    </p>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="Örn: 1-5 veya 2, 4, 6"
                      className="w-full bg-nexus-bg border border-nexus-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-nexus-muted">Hızlı Seçim:</span>
                    <button
                      type="button"
                      onClick={() => setPageRange('1')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors"
                    >
                      Yalnızca 1. Sayfa
                    </button>
                    {splitFile.pageCount && splitFile.pageCount >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const odds = Array.from({ length: splitFile.pageCount! }, (_, i) => i + 1)
                            .filter((p) => p % 2 !== 0)
                            .join(', ')
                          setPageRange(odds)
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors"
                      >
                        Tek Sayfalar (1, 3, 5...)
                      </button>
                    )}
                    {splitFile.pageCount && splitFile.pageCount >= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const evens = Array.from({ length: splitFile.pageCount! }, (_, i) => i + 1)
                            .filter((p) => p % 2 === 0)
                            .join(', ')
                          setPageRange(evens)
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors"
                      >
                        Çift Sayfalar (2, 4, 6...)
                      </button>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSplitting || !pageRange.trim()}
                      onClick={handleSplit}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
                    >
                      {isSplitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sayfalar Ayrılıyor...</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4" />
                          <span>Sayfaları Ayıkla & Kaydet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {splitResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      splitResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    }`}
                  >
                    {splitResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Sayfalar başarıyla çıkarıldı ({splitResult.pageCount} sayfa). Dosya:{' '}
                          <span className="font-mono text-white">{splitResult.path}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{splitResult.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
