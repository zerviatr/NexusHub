import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ImageIcon,
  Upload,
  X,
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderOpen,
  Sliders,
  ChevronDown,
  Sparkles,
  Eye,
  Columns2,
  Split,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ImageMeta, ImageJob, ImageProcessResult } from '../lib/ipc'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'
import { logActivity } from '../lib/activityLogger'

type Format = 'jpeg' | 'png' | 'webp' | 'avif'
type Preset = 'original' | 'hd' | '4k' | 'thumbnail' | 'custom'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

const FORMAT_LABELS: Record<Format, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP (Ultra Sıkıştırma)',
  avif: 'AVIF (Gelecek Nesil)',
}

export default function ImageToolkit() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [files, setFiles] = useState<ImageMeta[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ImageProcessResult[]>([])

  // Options
  const [format, setFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)
  const [preset, setPreset] = useState<Preset>('original')
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [stripExif, setStripExif] = useState(true)
  const [outputSuffix, setOutputSuffix] = useState('_converted')
  const [outputDir, setOutputDir] = useState('')

  // Ingest dropped files from global File Gateway
  useFileGatewayDrop(async (detail) => {
    const validExts = /\.(png|jpe?g|webp|avif|gif|tiff|bmp|svg)$/i
    if (!validExts.test(detail.name)) return

    if (detail.path && typeof (window.nexusAPI as any)?.image?.getMetadata === 'function') {
      try {
        const meta = await nexusAPI.image.getMetadata(detail.path)
        setFiles((prev) => [...prev, meta])
        setResults([])
        if (!outputDir) {
          const parts = detail.path.replace(/\\/g, '/').split('/')
          parts.pop()
          setOutputDir(parts.join('/') + '/zendev_output')
        }
        showToastSuccess('Görseller Eklendi', '1 adet görsel başarıyla yüklendi.')
        try { cyberAudio.click() } catch {}
        return
      } catch {}
    }

    // Fallback if metadata extraction not available or in web/test environment
    const fallbackMeta: ImageMeta = {
      filePath: detail.path || detail.name,
      name: detail.name,
      size: detail.size,
      format: detail.name.split('.').pop()?.toLowerCase(),
    }
    setFiles((prev) => [...prev, fallbackMeta])
    setResults([])
    showToastSuccess('Görseller Eklendi', '1 adet görsel başarıyla yüklendi.')
    try { cyberAudio.click() } catch {}
  })

  // Split Comparison Slider Modal
  const [comparingFile, setComparingFile] = useState<{ original: ImageMeta; result?: ImageProcessResult } | null>(null)
  const [sliderPos, setSliderPos] = useState(50) // 0 to 100%

  const SIZE_PRESETS: Record<Preset, { width?: number; height?: number; label: string }> = {
    original: { label: t('image.originalSize') || 'Orijinal Boyut' },
    thumbnail: { width: 256, height: 256, label: '256×256 Küçük Resim (Thumbnail)' },
    hd: { width: 1280, height: 720, label: 'HD 1280×720' },
    '4k': { width: 3840, height: 2160, label: '4K 3840×2160' },
    custom: { label: 'Özel Çözünürlük' },
  }

  // Savings Estimation calculation
  const estimatedSavingsPercent = useMemo(() => {
    if (format === 'avif') return Math.round(75 * (1 - (quality - 30) / 140))
    if (format === 'webp') return Math.round(55 * (1 - (quality - 30) / 140))
    if (format === 'jpeg') return Math.round(35 * (1 - (quality - 30) / 140))
    return 10
  }, [format, quality])

  const handleSelectFiles = async () => {
    setIsSelecting(true)
    try {
      const paths = await nexusAPI.image.selectFiles()
      if (!paths.length) return

      const metas = await Promise.all(paths.map((p) => nexusAPI.image.getMetadata(p)))
      setFiles(metas)
      setResults([])

      if (paths[0]) {
        const parts = paths[0].replace(/\\/g, '/').split('/')
        parts.pop()
        setOutputDir(parts.join('/') + '/zendev_output')
      }
      showToastSuccess('Görseller Eklendi', `${metas.length} adet görsel başarıyla yüklendi.`)
    } finally {
      setIsSelecting(false)
    }
  }

  const handleDropImages = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validPaths = droppedFiles
      .map((f) => (f as any).path)
      .filter((p): p is string => Boolean(p))

    if (validPaths.length > 0) {
      setIsSelecting(true)
      try {
        const metas = await Promise.all(validPaths.map((p) => nexusAPI.image.getMetadata(p)))
        setFiles((prev) => [...prev, ...metas])
        setResults([])
        if (validPaths[0]) {
          const parts = validPaths[0].replace(/\\/g, '/').split('/')
          parts.pop()
          setOutputDir(parts.join('/') + '/zendev_output')
        }
        showToastSuccess('Görseller Eklendi', `${metas.length} adet görsel başarıyla yüklendi.`)
      } catch {}
      setIsSelecting(false)
    }
  }

  const handleRemove = (filePath: string) => {
    setFiles((prev) => prev.filter((f) => f.filePath !== filePath))
    setResults((prev) => prev.filter((r) => r.inputPath !== filePath))
  }

  const handleProcess = async () => {
    if (!files.length || isProcessing) return
    setIsProcessing(true)
    setResults([])

    const presetDims = SIZE_PRESETS[preset]
    const jobs: ImageJob[] = files.map((f): ImageJob => ({
      inputPath: f.filePath,
      outputDir: outputDir || 'C:/Users/Public/Pictures/zendev_output',
      format,
      width: preset === 'custom' ? (customW ? Number(customW) : undefined) : presetDims.width,
      height: preset === 'custom' ? (customH ? Number(customH) : undefined) : presetDims.height,
      quality,
      stripExif,
      suffix: outputSuffix,
    }))

    try {
      const res = await nexusAPI.image.process(jobs)
      setResults(res)
      const successCount = res.filter((r) => r.success).length
      showToastSuccess(
        'Dönüştürme Tamamlandı',
        `${successCount} görsel başarıyla dönüştürüldü ve EXIF arındırıldı.`
      )
      logActivity({
        toolId: 'image-toolkit',
        action: 'batch_convert',
        category: 'file',
        status: successCount > 0 ? 'success' : 'failure',
        details: `Batch converted ${jobs.length} images to ${format.toUpperCase()} (${successCount} succeeded, ${jobs.length - successCount} failed)`,
        metadata: {
          count: jobs.length,
          format,
          quality,
          stripExif,
          successCount,
          failCount: jobs.length - successCount,
        },
      })
    } catch (err: any) {
      showToastError('Dönüştürme Hatası', err.message || 'İşlem başarısız.')
      logActivity({
        toolId: 'image-toolkit',
        action: 'batch_convert',
        category: 'file',
        status: 'failure',
        details: `Batch image conversion failed: ${err.message}`,
        metadata: {
          count: jobs.length,
          format,
          error: err.message,
        },
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getResult = useCallback((filePath: string) => results.find((r) => r.inputPath === filePath), [results])
  const doneCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return (
    <BaseToolTemplate
      icon={ImageIcon}
      title={t('nav.tools.imageToolkit') || 'Image Toolkit & Optimizer'}
      description={
        t('dashboard.tools.imageToolkit.desc') ||
        'Görselleri toplu olarak WebP, AVIF, JPEG ve PNG formatlarına optimize edin, EXIF gizlilik verilerini arındırın ve Canlı Split Karşılaştırma ile test edin.'
      }
      gradient="from-pink-500 to-rose-600"
    >
      {/* File selection drop area */}
      <div className="mb-5">
        <motion.button
          id="image-select-btn"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSelectFiles}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropImages}
          disabled={isSelecting || isProcessing}
          className={`w-full py-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed ${
            isDragging
              ? 'border-pink-500 bg-pink-500/10 scale-[1.01] shadow-[0_0_25px_rgba(236,72,153,0.2)]'
              : 'border-nexus-border hover:border-pink-500/50 bg-nexus-card/30'
          }`}
        >
          {isSelecting ? (
            <Loader2 className="w-8 h-8 text-nexus-muted animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-nexus-muted group-hover:text-pink-400 transition-colors" />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-nexus-text group-hover:text-pink-300 transition-colors">
              {files.length > 0 ? 'Daha Fazla Görsel Ekle (veya Sürükleyin)' : t('image.selectImages') || 'Görselleri Seçin veya Sürükleyin'}
            </p>
            <p className="text-xs text-nexus-muted mt-0.5">
              JPG, PNG, WebP, AVIF, TIFF ve SVG formatları desteklenir (Yerel Sharp Motoru)
            </p>
          </div>
        </motion.button>
      </div>

      {/* Selected files list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 space-y-1.5"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
                {files.length} Görsel Seçildi
              </p>
              <button
                onClick={() => {
                  setFiles([])
                  setResults([])
                }}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                Tümünü Temizle
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {files.map((f) => {
                const res = getResult(f.filePath)
                return (
                  <motion.div
                    key={f.filePath}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all ${
                      res
                        ? res.success
                          ? 'border-nexus-success/30 bg-nexus-success/5'
                          : 'border-red-500/30 bg-red-500/5'
                        : 'border-nexus-border/50 bg-nexus-card'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-nexus-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-nexus-text truncate font-mono">{f.name}</p>
                      <p className="text-[10px] text-nexus-muted">
                        {f.width && f.height ? `${f.width}×${f.height} · ` : ''}
                        {formatBytes(f.size)}
                        {f.format && ` · ${f.format.toUpperCase()}`}
                      </p>
                      {res && (
                        <p
                          className={`text-[10px] font-mono ${
                            res.success ? 'text-nexus-success' : 'text-red-400'
                          } mt-0.5`}
                        >
                          {res.success ? `Çıktı: ${formatBytes(res.outputSize ?? 0)}` : res.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Compare preview button */}
                      <button
                        onClick={() => setComparingFile({ original: f, result: res })}
                        className="p-1.5 rounded-lg bg-nexus-surface hover:bg-pink-500/20 text-nexus-muted hover:text-pink-300 border border-white/5 transition-colors"
                        title="Canlı Split Karşılaştırma"
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                      </button>

                      {res ? (
                        res.success ? (
                          <CheckCircle2 className="w-4 h-4 text-nexus-success shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )
                      ) : (
                        <button
                          onClick={() => handleRemove(f.filePath)}
                          className="text-nexus-muted hover:text-red-400 transition-colors p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Panel */}
      <div className="glass-card p-5 mb-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-nexus-muted">
            <Sliders className="w-3.5 h-3.5" />
            <span>Dönüştürme ve Sıkıştırma Parametreleri</span>
          </div>

          <span className="hud-badge text-[10px] text-pink-400 font-mono">
            ~%{estimatedSavingsPercent} Tasarruf Bekleniyor
          </span>
        </div>

        {/* Format selector */}
        <div className="space-y-2">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">Hedef Format</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
              <button
                key={f}
                id={`img-format-${f}`}
                onClick={() => setFormat(f)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center ${
                  format === f
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20'
                    : 'bg-nexus-card border border-nexus-border text-nexus-muted hover:text-nexus-text'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider */}
        {format !== 'png' && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs text-nexus-muted">
              <span className="font-semibold">Kalite Oranı (WebP / AVIF / JPEG)</span>
              <span className="text-white font-bold font-mono text-xs">{quality}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>
        )}

        {/* Size presets */}
        <div className="space-y-2">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">Boyutlandırma</p>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="w-full appearance-none bg-nexus-card border border-nexus-border rounded-xl px-3.5 py-2.5 pr-8 text-xs text-nexus-text focus:outline-none focus:border-pink-500 transition-colors cursor-pointer font-medium"
            >
              {(Object.entries(SIZE_PRESETS) as [Preset, { label: string }][]).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted pointer-events-none" />
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <p className="text-[10px] text-nexus-muted">Genişlik (px)</p>
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  placeholder="otomatik"
                  className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-nexus-muted">Yükseklik (px)</p>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  placeholder="otomatik"
                  className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* EXIF stripper & Suffix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">Dosya Adı Son Eki</p>
            <input
              value={outputSuffix}
              onChange={(e) => setOutputSuffix(e.target.value)}
              className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
            />
          </div>

          <button
            onClick={() => setStripExif((v) => !v)}
            className={`flex items-center gap-2 mt-5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              stripExif
                ? 'border-pink-500/50 bg-pink-500/10 text-pink-300'
                : 'border-nexus-border text-nexus-muted hover:text-nexus-text'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-sm border ${
                stripExif ? 'bg-pink-500 border-pink-500' : 'border-nexus-muted'
              } flex items-center justify-center`}
            >
              {stripExif && <Settings className="w-2.5 h-2.5 text-white" />}
            </div>
            <span>EXIF Metadata Gizliliğini Arındır (GPS & Kamera Bilgisi Sil)</span>
          </button>
        </div>
      </div>

      {/* Convert button */}
      <motion.button
        id="image-process-btn"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleProcess}
        disabled={!files.length || isProcessing}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 transition-all"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{files.length} Görsel Optimize Ediliyor...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>{files.length > 0 ? `${files.length} Görseli Dönüştür ve Kaydet` : 'Görselleri Dönüştür'}</span>
          </>
        )}
      </motion.button>

      {/* Summary card */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 glass-card p-4 flex gap-8 justify-center"
        >
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-nexus-success">{doneCount}</p>
            <p className="text-[10px] text-nexus-muted uppercase">Başarılı</p>
          </div>
          {failCount > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-red-400">{failCount}</p>
              <p className="text-[10px] text-nexus-muted uppercase">Hatalı</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE BEFORE / AFTER SPLIT COMPARISON MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {comparingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-nexus-surface border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-pink-400">
                  <Split className="w-5 h-5" />
                  <h3 className="font-bold text-white text-sm">
                    Görsel Kalite & Sıkıştırma Karşılaştırması
                  </h3>
                </div>
                <button
                  onClick={() => setComparingFile(null)}
                  className="p-1.5 rounded-lg text-nexus-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-nexus-bg/50 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] text-nexus-muted uppercase">Orijinal Dosya</p>
                  <p className="text-white font-bold truncate">{comparingFile.original.name}</p>
                  <p className="text-nexus-muted">{formatBytes(comparingFile.original.size)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-nexus-muted uppercase">Dönüştürülen Çıktı ({format.toUpperCase()})</p>
                  <p className="text-pink-300 font-bold">
                    {comparingFile.result?.outputSize
                      ? formatBytes(comparingFile.result.outputSize)
                      : `Tahmini: ~${formatBytes(Math.round(comparingFile.original.size * (1 - estimatedSavingsPercent / 100)))}`}
                  </p>
                  <p className="text-nexus-success font-semibold">%{estimatedSavingsPercent} Boyut Kazancı</p>
                </div>
              </div>

              {/* Slider interactive control */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-nexus-muted">
                  <span>Orijinal Görünüm (%{100 - sliderPos})</span>
                  <span>Optimize Edilmiş Görünüm (%{sliderPos})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setComparingFile(null)}
                  className="px-5 py-2 rounded-xl bg-nexus-card border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </BaseToolTemplate>
  )
}
