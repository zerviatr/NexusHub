import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ImageMeta, ImageJob, ImageProcessResult } from '../lib/ipc'
import { useT } from '../lib/i18n'

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
  webp: 'WebP',
  avif: 'AVIF',
}

export default function ImageToolkit() {
  const { t } = useT()
  const [files, setFiles] = useState<ImageMeta[]>([])

  const SIZE_PRESETS: Record<Preset, { width?: number; height?: number; label: string }> = {
    original: { label: t('image.originalSize') || 'Original size' },
    thumbnail: { width: 256, height: 256, label: '256×256 Thumbnail' },
    hd: { width: 1280, height: 720, label: 'HD 1280×720' },
    '4k': { width: 3840, height: 2160, label: '4K 3840×2160' },
    custom: { label: 'Custom' },
  }
  const [isSelecting, setIsSelecting] = useState(false)
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

  const handleSelectFiles = async () => {
    setIsSelecting(true)
    try {
      const paths = await nexusAPI.image.selectFiles()
      if (!paths.length) return

      const metas = await Promise.all(paths.map((p) => nexusAPI.image.getMetadata(p)))
      setFiles(metas)
      setResults([])

      // Default output dir = same as first file's dir
      if (paths[0]) {
        const parts = paths[0].replace(/\\/g, '/').split('/')
        parts.pop()
        setOutputDir(parts.join('/') + '/nexushub_output')
      }
    } finally {
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
      outputDir: outputDir || 'C:/Users/Public/Pictures/nexushub_output',
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
      title={t('nav.tools.imageToolkit') || "Image Toolkit"}
      description={t('dashboard.tools.imageToolkit.desc') || "Batch resize and convert images to JPEG, PNG, WebP, or AVIF. Strip EXIF metadata. Processes locally via sharp — no upload needed."}
      gradient="from-pink-500 to-rose-600"
    >
      {/* File selection */}
      <div className="mb-5">
        <motion.button
          id="image-select-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSelectFiles}
          disabled={isSelecting || isProcessing}
          className="w-full py-8 rounded-2xl border-2 border-dashed border-nexus-border hover:border-pink-500/50 transition-colors flex flex-col items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSelecting ? (
            <Loader2 className="w-8 h-8 text-nexus-muted animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-nexus-muted group-hover:text-pink-400 transition-colors" />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-nexus-text group-hover:text-pink-300 transition-colors">
              {files.length > 0 ? 'Add More Images' : (t('image.selectImages') || 'Select Images')}
            </p>
            <p className="text-xs text-nexus-muted mt-0.5">
              {t('image.supported') || 'JPG, PNG, WebP, AVIF, GIF, TIFF supported'}
            </p>
          </div>
        </motion.button>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 space-y-1.5"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
                {files.length} Image{files.length > 1 ? 's' : ''} Selected
              </p>
              <button
                onClick={() => { setFiles([]); setResults([]) }}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                      res
                        ? res.success
                          ? 'border-nexus-success/30 bg-nexus-success/5'
                          : 'border-red-500/30 bg-red-500/5'
                        : 'border-nexus-border/50 bg-nexus-card'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-nexus-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-nexus-text truncate font-mono">{f.name}</p>
                      <p className="text-[10px] text-nexus-muted">
                        {f.width && f.height ? `${f.width}×${f.height} · ` : ''}{formatBytes(f.size)}
                        {f.format && ` · ${f.format.toUpperCase()}`}
                      </p>
                      {res && (
                        <p className={`text-[10px] ${res.success ? 'text-nexus-success' : 'text-red-400'} mt-0.5`}>
                          {res.success
                            ? `→ ${formatBytes(res.outputSize ?? 0)}`
                            : res.error}
                        </p>
                      )}
                    </div>
                    {res ? (
                      res.success ? (
                        <CheckCircle2 className="w-4 h-4 text-nexus-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )
                    ) : (
                      <button
                        onClick={() => handleRemove(f.filePath)}
                        className="text-nexus-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="glass-card p-4 mb-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-nexus-muted">
          <Sliders className="w-3.5 h-3.5" />
          {t('image.options') || 'Conversion Options'}
        </div>

        {/* Format */}
        <div className="space-y-2">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('image.outputFormat') || 'Output Format'}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
              <button
                key={f}
                id={`img-format-${f}`}
                onClick={() => setFormat(f)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  format === f
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                    : 'bg-nexus-card border border-nexus-border text-nexus-muted hover:text-nexus-text'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        {format !== 'png' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-nexus-muted">
              <span>{t('image.quality') || 'Quality'}</span>
              <span className="text-white font-semibold">{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>
        )}

        {/* Size preset */}
        <div className="space-y-2">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('image.resize') || 'Resize Preset'}</p>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="w-full appearance-none bg-nexus-card border border-nexus-border rounded-lg px-3 py-2.5 pr-8 text-sm text-nexus-text focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
            >
              {(Object.entries(SIZE_PRESETS) as [Preset, { label: string }][]).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted pointer-events-none" />
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-nexus-muted">Width (px)</p>
                <input type="number" value={customW} onChange={(e) => setCustomW(e.target.value)}
                  placeholder="auto"
                  className="w-full bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-nexus-muted">Height (px)</p>
                <input type="number" value={customH} onChange={(e) => setCustomH(e.target.value)}
                  placeholder="auto"
                  className="w-full bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Output suffix + EXIF */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('image.suffix') || 'Filename Suffix'}</p>
            <input value={outputSuffix} onChange={(e) => setOutputSuffix(e.target.value)}
              className="w-full bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
            />
          </div>
          <button onClick={() => setStripExif((v) => !v)}
            className={`flex items-center gap-2 mt-5 px-3 py-2 rounded-lg border text-xs transition-all ${
              stripExif ? 'border-pink-500/50 bg-pink-500/10 text-pink-300' : 'border-nexus-border text-nexus-muted hover:text-nexus-text'
            }`}
          >
            <div className={`w-3 h-3 rounded-sm border ${stripExif ? 'bg-pink-500 border-pink-500' : 'border-nexus-muted'} flex items-center justify-center`}>
              {stripExif && <Settings className="w-2 h-2 text-white" />}
            </div>
            {t('image.stripExif') || 'Strip EXIF'}
          </button>
        </div>

        {/* Output dir */}
        <div className="space-y-1">
          <p className="text-[10px] text-nexus-muted uppercase tracking-widest">{t('image.outputDir') || 'Output Directory'}</p>
          <div className="flex gap-2">
            <input value={outputDir} onChange={(e) => setOutputDir(e.target.value)}
              placeholder={t('image.sameFolder') || "Same folder as input..."}
              className="flex-1 bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-pink-500 transition-colors font-mono"
            />
            <button className="p-2 rounded-lg bg-nexus-card border border-nexus-border text-nexus-muted hover:text-pink-400 transition-colors">
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Process button */}
      <motion.button
        id="image-process-btn"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleProcess}
        disabled={!files.length || isProcessing}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-pink-500/30 transition-shadow"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing {files.length} image{files.length > 1 ? 's' : ''}...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Convert {files.length > 0 ? files.length : ''} Image{files.length !== 1 ? 's' : ''}
          </>
        )}
      </motion.button>

      {/* Summary */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 glass-card p-4 flex gap-6 justify-center"
        >
          <div className="text-center">
            <p className="text-xl font-bold text-nexus-success">{doneCount}</p>
            <p className="text-[10px] text-nexus-muted">Converted</p>
          </div>
          {failCount > 0 && (
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{failCount}</p>
              <p className="text-[10px] text-nexus-muted">Failed</p>
            </div>
          )}
        </motion.div>
      )}
    </BaseToolTemplate>
  )
}
