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
import { useT } from '../lib/i18n'
import { useFileGatewayDrop } from '../lib/fileGateway'
import { logActivity } from '../lib/activityLogger'

interface SelectedPDF {
  path: string
  name: string
  size: number
  pageCount?: number
  title?: string
  author?: string
}

export default function PdfStudio() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge')

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<SelectedPDF[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [isDraggingMerge, setIsDraggingMerge] = useState(false)
  const [mergeResult, setMergeResult] = useState<{ success: boolean; path?: string; pageCount?: number; size?: number; error?: string } | null>(null)

  // Ingest dropped files from global File Gateway
  useFileGatewayDrop(async (detail) => {
    if (!detail.name.toLowerCase().endsWith('.pdf')) return
    setActiveTab('merge')
    if (detail.path && window.nexusAPI?.pdf?.inspectFiles) {
      try {
        const inspected = await window.nexusAPI.pdf.inspectFiles([detail.path])
        if (inspected && inspected.length > 0) {
          setMergeFiles((prev) => [...prev, ...inspected])
          setMergeResult(null)
          try { cyberAudio.click() } catch {}
          return
        }
      } catch {}
    }
    setMergeFiles((prev) => [
      ...prev,
      {
        path: detail.path || detail.name,
        name: detail.name,
        size: detail.size,
      },
    ])
    setMergeResult(null)
    try { cyberAudio.click() } catch {}
  })

  // Split State
  const [splitFile, setSplitFile] = useState<SelectedPDF | null>(null)
  const [pageRange, setPageRange] = useState<string>('1-2')
  const [isSplitting, setIsSplitting] = useState(false)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
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

  // Handle drag and drop for merge
  const handleMergeDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingMerge(false)
    const files = Array.from(e.dataTransfer.files)
    const paths = files
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .map((f) => (f as any).path)
      .filter(Boolean)

    if (paths.length > 0 && window.nexusAPI?.pdf?.inspectFiles) {
      const inspected = await window.nexusAPI.pdf.inspectFiles(paths)
      if (inspected && inspected.length > 0) {
        setMergeFiles((prev) => [...prev, ...inspected])
        setMergeResult(null)
        cyberAudio.click()
      }
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
        outputFileName: 'ZenDev_Birlestirilmis.pdf',
      })
      if (res && res.success) {
        setMergeResult({ success: true, path: res.outputPath, pageCount: res.totalCount, size: res.size })
        cyberAudio.copySuccess()
      } else if (res && !res.canceled) {
        setMergeResult({ success: false, error: res.error || 'Birleştirme başarısız oldu' })
      }

      if (res && !res.canceled) {
        logActivity({
          toolId: 'pdf-studio',
          action: 'merge_pdf',
          category: 'file',
          status: res.success ? 'success' : 'failure',
          details: `Merged ${mergeFiles.length} PDF files into ${res.outputPath ? res.outputPath.split(/[/\\]/).pop() : 'document'}`,
          metadata: {
            inputCount: mergeFiles.length,
            fileNames: mergeFiles.map((f) => f.name),
            totalPages: res.totalCount,
            outputPath: res.outputPath,
            sizeBytes: res.size,
            error: res.error,
          },
        })
      }
    } catch (err: any) {
      setMergeResult({ success: false, error: err.message })
      logActivity({
        toolId: 'pdf-studio',
        action: 'merge_pdf',
        category: 'file',
        status: 'failure',
        details: `PDF merge failed: ${err.message}`,
        metadata: {
          inputCount: mergeFiles.length,
          error: err.message,
        },
      })
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

  // Handle drag and drop for split
  const handleSplitDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingSplit(false)
    const files = Array.from(e.dataTransfer.files)
    const firstPdf = files.find((f) => f.name.toLowerCase().endsWith('.pdf'))
    if (firstPdf && (firstPdf as any).path && window.nexusAPI?.pdf?.inspectFiles) {
      const inspected = await window.nexusAPI.pdf.inspectFiles([(firstPdf as any).path])
      if (inspected && inspected.length > 0) {
        setSplitFile(inspected[0])
        setSplitResult(null)
        if (inspected[0].pageCount && inspected[0].pageCount > 1) {
          setPageRange(`1-${Math.min(3, inspected[0].pageCount)}`)
        } else {
          setPageRange('1')
        }
        cyberAudio.click()
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

      if (res && !res.canceled) {
        logActivity({
          toolId: 'pdf-studio',
          action: 'split_pdf',
          category: 'file',
          status: res.success ? 'success' : 'failure',
          details: `Split PDF pages [${pageRange.trim()}] from ${splitFile.name}`,
          metadata: {
            fileName: splitFile.name,
            pageRange: pageRange.trim(),
            extractedPages: res.pageCount,
            outputPath: res.outputPath,
            error: res.error,
          },
        })
      }
    } catch (err: any) {
      setSplitResult({ success: false, error: err.message })
      logActivity({
        toolId: 'pdf-studio',
        action: 'split_pdf',
        category: 'file',
        status: 'failure',
        details: `PDF split failed for ${splitFile.name}: ${err.message}`,
        metadata: {
          fileName: splitFile.name,
          pageRange: pageRange.trim(),
          error: err.message,
        },
      })
    } finally {
      setIsSplitting(false)
    }
  }

  return (
    <BaseToolTemplate
      title={t('pdfStudio.title')}
      description={t('pdfStudio.description')}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'merge'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t('pdfStudio.tabMerge')}
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('split')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              {t('pdfStudio.tabSplit')}
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted font-mono flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {t('pdfStudio.engineBadge')}
          </span>
        </div>

        {/* ─── TAB 1: MERGE ──────────────────────────────────────────────── */}
        {activeTab === 'merge' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('pdfStudio.mergeList')}</h3>
                <p className="text-xs text-nexus-muted">
                  {t('pdfStudio.mergeListDesc')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectMergeFiles}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('pdfStudio.addPdf')}
                </button>
                {mergeFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMergeFiles([])}
                    className="p-2 rounded-xl hover:bg-rose-500/10 text-nexus-muted hover:text-rose-400 transition-colors cursor-pointer"
                    title={t('pdfStudio.clearList')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {mergeFiles.length === 0 ? (
              <div
                onClick={handleSelectMergeFiles}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingMerge(true) }}
                onDragLeave={() => setIsDraggingMerge(false)}
                onDrop={handleMergeDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all space-y-3 bg-nexus-surface/20 ${
                  isDraggingMerge
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01] shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'border-nexus-border/50 hover:border-amber-500/50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('pdfStudio.dropMerge')}</p>
                  <p className="text-xs text-nexus-muted mt-1">{t('pdfStudio.dropMergeSub')}</p>
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
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-nexus-muted hover:text-white transition-colors cursor-pointer"
                          title="Yukarı Taşı"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === mergeFiles.length - 1}
                          onClick={() => moveFile(index, 'down')}
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-nexus-muted hover:text-white transition-colors cursor-pointer"
                          title="Aşağı Taşı"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-nexus-muted hover:text-rose-400 transition-colors cursor-pointer"
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
                    {t('pdfStudio.mergeSummary', {
                      files: mergeFiles.length,
                      pages: mergeFiles.reduce((acc, f) => acc + (f.pageCount || 0), 0),
                    })}
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
                        <span>{t('pdfStudio.merging')}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{t('pdfStudio.mergeBtn')}</span>
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
                          {t('pdfStudio.mergeSuccess', { pages: mergeResult.pageCount ?? 0, path: mergeResult.path || '' })}
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
                onDragOver={(e) => { e.preventDefault(); setIsDraggingSplit(true) }}
                onDragLeave={() => setIsDraggingSplit(false)}
                onDrop={handleSplitDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all space-y-3 bg-nexus-surface/20 ${
                  isDraggingSplit
                    ? 'border-rose-400 bg-rose-500/10 scale-[1.01] shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                    : 'border-nexus-border/50 hover:border-rose-500/50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('pdfStudio.dropSplit')}</p>
                  <p className="text-xs text-nexus-muted mt-1">{t('pdfStudio.dropSplitSub')}</p>
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
                        <span className="text-rose-400 font-bold">{splitFile.pageCount} Pages</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectSplitFile}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-nexus-muted hover:text-white transition-colors cursor-pointer"
                  >
                    {t('pdfStudio.selectOther')}
                  </button>
                </div>

                {/* Page Range Input */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white block mb-1">
                      {t('pdfStudio.rangeLabel')}
                    </label>
                    <p className="text-[11px] text-nexus-muted mb-2">
                      {t('pdfStudio.rangeHint')}
                    </p>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="1-5, 8"
                      className="w-full bg-nexus-bg border border-nexus-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-nexus-muted">{t('pdfStudio.quickSelect')}</span>
                    <button
                      type="button"
                      onClick={() => setPageRange('1')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors cursor-pointer"
                    >
                      {t('pdfStudio.pageOne')}
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
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors cursor-pointer"
                      >
                        {t('pdfStudio.oddPages')}
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
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-nexus-muted hover:text-white transition-colors cursor-pointer"
                      >
                        {t('pdfStudio.evenPages')}
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
                          <span>{t('pdfStudio.splitting')}</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4" />
                          <span>{t('pdfStudio.splitBtn')}</span>
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
                          {t('pdfStudio.splitSuccess', { pages: splitResult.pageCount ?? 0, path: splitResult.path || '' })}
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
