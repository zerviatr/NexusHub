import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderArchive,
  FolderOpen,
  Loader2,
  Search,
  Settings2,
  Play,
  CheckCircle2,
  AlertCircle,
  Undo2,
  Sparkles,
  Eye,
  Check,
  X,
  Code2,
  Camera,
  FileText,
  Filter,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ScannedFile, FileOperation, OrganizerExecutionResult } from '../lib/ipc'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'

type PresetMode = 'custom' | 'dev' | 'photo' | 'office'

export default function BulkOrganizer() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [selectedDir, setSelectedDir] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([])

  // Presets & Settings
  const [preset, setPreset] = useState<PresetMode>('custom')
  const [organizeByCategory, setOrganizeByCategory] = useState(true)
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())

  // Dry-Run Diff Modal
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false)

  // Execution
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<OrganizerExecutionResult | null>(null)

  // Undo state
  const [canUndo, setCanUndo] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoMessage, setUndoMessage] = useState<string | null>(null)

  const checkUndo = async () => {
    try {
      const able = await nexusAPI.organizer.canUndo()
      setCanUndo(able)
    } catch {}
  }

  useEffect(() => {
    checkUndo()
  }, [])

  // Apply preset configurations
  const applyPreset = (mode: PresetMode) => {
    setPreset(mode)
    if (mode === 'dev') {
      setOrganizeByCategory(true)
      setPrefix('dev_')
      setSuffix('')
    } else if (mode === 'photo') {
      setOrganizeByCategory(true)
      setPrefix('media_')
      setSuffix('')
    } else if (mode === 'office') {
      setOrganizeByCategory(true)
      setPrefix('doc_')
      setSuffix('')
    } else {
      setPrefix('')
      setSuffix('')
    }
  }

  const handleUndo = async () => {
    setIsUndoing(true)
    setUndoMessage(null)
    try {
      const res = await nexusAPI.organizer.undo()
      if (res.success) {
        const msg = `${res.restored} dosya başarıyla eski konumlarına geri yüklendi!`
        setUndoMessage(msg)
        showToastSuccess('Geri Alındı', msg)
        setCanUndo(false)
        if (selectedDir) handleScan()
      } else {
        const warn = `Geri alma uyarısı: ${res.errors.join(', ')}`
        setUndoMessage(warn)
        showToastError('Uyarı', warn)
      }
    } catch (err: any) {
      setUndoMessage(err.message || 'Geri alma başarısız')
      showToastError('Hata', err.message || 'Geri alma başarısız')
    } finally {
      setIsUndoing(false)
    }
  }

  const handleSelectDir = async () => {
    const result = await nexusAPI.organizer.selectDir()
    if (!result.canceled && result.filePaths.length > 0) {
      setSelectedDir(result.filePaths[0])
      setScannedFiles([])
      setExecutionResult(null)
      setExcludedIndices(new Set())
    }
  }

  const handleScan = async () => {
    if (!selectedDir) return
    setIsScanning(true)
    setExecutionResult(null)
    setUndoMessage(null)
    setExcludedIndices(new Set())
    try {
      const res = await nexusAPI.organizer.scan(selectedDir)
      if (res.success && res.files) {
        setScannedFiles(res.files)
        showToastSuccess('Tarama Tamamlandı', `${res.files.length} dosya bulundu.`)
      }
    } catch (err: any) {
      showToastError('Tarama Hatası', err.message || 'Klasör taranamadı.')
    } finally {
      setIsScanning(false)
    }
  }

  // Generate Preview operations
  const generatePreview = (): (FileOperation & { index: number; originalFile: ScannedFile })[] => {
    if (!selectedDir) return []
    return scannedFiles.map((file, index) => {
      let newName = file.originalName
      const ext = file.extension
      const nameWithoutExt = newName.slice(0, -ext.length || undefined)

      if (prefix || suffix) {
        newName = `${prefix}${nameWithoutExt}${suffix}${ext}`
      }

      let targetDir = selectedDir
      if (organizeByCategory) {
        targetDir = `${selectedDir}\\${file.suggestedCategory}`
      }

      return {
        index,
        originalFile: file,
        oldPath: file.originalPath,
        newPath: `${targetDir}\\${newName}`,
      }
    })
  }

  const previewOps = generatePreview()
  const activeOps = previewOps.filter((op) => !excludedIndices.has(op.index))

  const toggleExclude = (index: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleExecute = async () => {
    if (activeOps.length === 0) return
    setIsExecuting(true)
    setIsDiffModalOpen(false)

    try {
      const opsToSend: FileOperation[] = activeOps.map(({ oldPath, newPath }) => ({ oldPath, newPath }))
      const res = await nexusAPI.organizer.execute(opsToSend)
      setExecutionResult(res)
      if (res.success) {
        showToastSuccess('Düzenleme Tamamlandı!', `${res.successfulOperations} dosya kategorize edilip taşındı.`)
        setScannedFiles([])
      } else {
        showToastError('Hata Oluştu', `${res.failedOperations} dosya taşınamadı.`)
      }
      await checkUndo()
    } catch (err: any) {
      showToastError('İşlem Hatası', err.message || 'Bilinmeyen hata.')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <BaseToolTemplate
      title={t('nav.tools.bulkOrganizer') || 'Smart Bulk File Organizer'}
      description={
        t('dashboard.tools.bulkOrganizer.desc') ||
        'Dağınık klasörleri otomatik kategorize edin, kural şablonları uygulayın ve çalıştırmadan önce Canlı Diff tablosunda doğrulayın.'
      }
      icon={FolderArchive}
      gradient="from-emerald-500 to-teal-600"
    >
      <div className="space-y-6">
        {/* Undo feedback banner */}
        {undoMessage && (
          <div className="p-4 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-between text-xs text-white">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-nexus-cyan shrink-0" />
              {undoMessage}
            </span>
            <button
              type="button"
              onClick={() => setUndoMessage(null)}
              className="text-nexus-muted hover:text-white ml-2 text-xs"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Step 1: Select & Scan Card */}
        <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 min-w-0 w-full">
            <h3 className="text-sm font-semibold text-white mb-1">
              {t('organizer.targetDir') || 'Hedef Çalışma Dizini'}
            </h3>
            <p className="text-xs text-nexus-muted truncate font-mono bg-nexus-bg/50 p-2.5 rounded-xl border border-nexus-border/30 select-all">
              {selectedDir || t('organizer.noFolder') || 'Henüz bir klasör seçilmedi...'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            {canUndo && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUndo}
                disabled={isUndoing}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 hover:bg-amber-500/25 transition-all"
              >
                <Undo2 className={`w-4 h-4 ${isUndoing ? 'animate-spin' : ''}`} />
                <span>{isUndoing ? 'Geri Alınıyor...' : 'Son İşlemi Geri Al'}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectDir}
              className="px-4 py-2.5 rounded-xl bg-nexus-card border border-nexus-border/50 text-white text-xs font-semibold flex items-center gap-2 hover:bg-nexus-bg transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-nexus-accent" />
              <span>{t('organizer.selectFolder') || 'Klasör Seç'}</span>
            </motion.button>

            <motion.button
              whileHover={selectedDir && !isScanning ? { scale: 1.02 } : {}}
              whileTap={selectedDir && !isScanning ? { scale: 0.98 } : {}}
              onClick={handleScan}
              disabled={!selectedDir || isScanning}
              className={`
                px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all
                ${
                  selectedDir && !isScanning
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer'
                    : 'bg-nexus-card text-nexus-muted cursor-not-allowed border border-nexus-border/30'
                }
              `}
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{t('organizer.scan') || 'Tara'}</span>
            </motion.button>
          </div>
        </div>

        {/* Execution Result Banner */}
        <AnimatePresence>
          {executionResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                executionResult.success
                  ? 'bg-nexus-success/10 border-nexus-success/30 text-nexus-success'
                  : 'bg-nexus-error/10 border-nexus-error/30 text-nexus-error'
              }`}
            >
              {executionResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <div>
                <p className="text-sm font-bold">
                  {executionResult.success ? 'Düzenleme Başarıyla Tamamlandı!' : 'Bazı Hatalarla Tamamlandı'}
                </p>
                <p className="text-xs opacity-80 mt-1">
                  Başarıyla taşınan: {executionResult.successfulOperations} dosya.
                  {executionResult.failedOperations > 0 && ` Başarısız: ${executionResult.failedOperations}`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Rules, Presets & Diff Preview */}
        {scannedFiles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rules & Preset Panel */}
            <div className="glass-card p-6 h-fit space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-nexus-accent">
                  <Settings2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-white">Kural Şablonları & Ayarlar</h3>
                </div>
                <span className="hud-badge text-[10px] text-nexus-cyan font-mono">
                  {activeOps.length} / {scannedFiles.length} Aktif
                </span>
              </div>

              {/* Presets Chips */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-nexus-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-nexus-cyan" />
                  <span>Akıllı Şablon Seçimi</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyPreset('custom')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                      preset === 'custom'
                        ? 'bg-nexus-accent/20 border-nexus-accent text-white'
                        : 'bg-nexus-bg/50 border-white/5 text-nexus-muted hover:text-white'
                    }`}
                  >
                    Özel Kural
                  </button>
                  <button
                    onClick={() => applyPreset('dev')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                      preset === 'dev'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-nexus-bg/50 border-white/5 text-nexus-muted hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Geliştirici (Dev)</span>
                  </button>
                  <button
                    onClick={() => applyPreset('photo')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                      preset === 'photo'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-nexus-bg/50 border-white/5 text-nexus-muted hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Medya & Foto</span>
                  </button>
                  <button
                    onClick={() => applyPreset('office')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                      preset === 'office'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-nexus-bg/50 border-white/5 text-nexus-muted hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ofis & Belge</span>
                  </button>
                </div>
              </div>

              {/* Toggles & Inputs */}
              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={organizeByCategory}
                      onChange={(e) => setOrganizeByCategory(e.target.checked)}
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        organizeByCategory ? 'bg-nexus-accent' : 'bg-nexus-bg border border-nexus-border'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${
                          organizeByCategory ? 'left-6' : 'left-1'
                        }`}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-white font-medium group-hover:text-nexus-accent transition-colors">
                    Kategori Klasörlerine Taşı (Görseller, Belgeler...)
                  </span>
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs text-nexus-muted">Ön Ek Ekle (Prefix)</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="örn: clean_"
                    className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-xs text-white outline-none focus:border-nexus-accent transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-nexus-muted">Son Ek Ekle (Suffix)</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="örn: _v1"
                    className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-xs text-white outline-none focus:border-nexus-accent transition-colors font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDiffModalOpen(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-nexus-cyan bg-nexus-cyan/15 hover:bg-nexus-cyan/25 border border-nexus-cyan/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Canlı Diff Önizleme Tablosu</span>
                  </motion.button>

                  <motion.button
                    whileHover={!isExecuting ? { scale: 1.02 } : {}}
                    whileTap={!isExecuting ? { scale: 0.98 } : {}}
                    onClick={handleExecute}
                    disabled={isExecuting || activeOps.length === 0}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isExecuting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>{activeOps.length} Dosyayı Düzenle & Taşı</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Quick Preview List */}
            <div className="lg:col-span-2 glass-card p-6 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white text-sm">Hızlı Önizleme Akışı</h3>
                  <p className="text-xs text-nexus-muted">
                    İstemediğiniz dosyaları sağdaki butondan veya Diff tablosundan hariç tutabilirsiniz.
                  </p>
                </div>
                <button
                  onClick={() => setIsDiffModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-nexus-card hover:bg-nexus-accent/20 border border-white/5 text-xs text-nexus-cyan font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Gelişmiş Tablo</span>
                </button>
              </div>

              <div className="flex-1 bg-nexus-bg/50 rounded-xl border border-nexus-border/30 overflow-hidden flex flex-col">
                <div className="overflow-y-auto max-h-[420px] divide-y divide-white/5 p-2">
                  {previewOps.slice(0, 100).map((op) => {
                    const originalName = op.oldPath.split('\\').pop() || op.oldPath.split('/').pop()
                    const newName = op.newPath.split('\\').pop() || op.newPath.split('/').pop()
                    const destFolder = organizeByCategory
                      ? op.newPath.split('\\').slice(-2, -1)[0]
                      : 'Aynı Dizin'
                    const isExcluded = excludedIndices.has(op.index)

                    return (
                      <div
                        key={op.index}
                        className={`p-3 rounded-lg transition-colors flex items-center justify-between gap-3 ${
                          isExcluded ? 'opacity-40 bg-white/2 line-through' : 'hover:bg-nexus-card/50'
                        }`}
                      >
                        <div className="flex flex-col gap-1 text-xs font-mono min-w-0 flex-1">
                          <span className="text-nexus-muted truncate">{originalName}</span>
                          <div className="flex items-center gap-2 text-white">
                            <span className="text-nexus-success font-bold">→</span>
                            {organizeByCategory && (
                              <span className="hud-badge text-[10px] text-nexus-accent font-sans">
                                {destFolder}
                              </span>
                            )}
                            <span className="truncate font-semibold text-nexus-cyan">{newName}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExclude(op.index)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
                            isExcluded
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-nexus-card border-white/5 text-nexus-muted hover:text-white'
                          }`}
                          title={isExcluded ? 'Dahil Et' : 'Hariç Tut'}
                        >
                          {isExcluded ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                  {previewOps.length > 100 && (
                    <div className="p-4 text-center text-xs text-nexus-muted font-medium">
                      + {previewOps.length - 100} dosya daha var (Gelişmiş Tablo'dan inceleyin)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE DRY-RUN DIFF MODAL */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isDiffModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-5xl max-h-[85vh] bg-nexus-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-nexus-card/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Canlı Dry-Run Diff Karşılaştırma</h3>
                      <p className="text-xs text-nexus-muted">
                        İşlem uygulanmadan önce dosya yollarını, boyutlarını ve hedef kategorilerini doğrulayın.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDiffModalOpen(false)}
                    className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-nexus-muted uppercase tracking-wider font-sans">
                        <th className="p-3 w-12 text-center">Durum</th>
                        <th className="p-3">Mevcut Dosya Adı</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Yeni Hedef Konum</th>
                        <th className="p-3 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewOps.map((op) => {
                        const originalName = op.oldPath.split('\\').pop() || op.oldPath.split('/').pop()
                        const newName = op.newPath.split('\\').pop() || op.newPath.split('/').pop()
                        const destFolder = organizeByCategory
                          ? op.newPath.split('\\').slice(-2, -1)[0]
                          : 'Aynı Dizin'
                        const isExcluded = excludedIndices.has(op.index)

                        return (
                          <tr
                            key={op.index}
                            className={`transition-colors ${
                              isExcluded ? 'opacity-35 bg-rose-500/5' : 'hover:bg-nexus-card/40'
                            }`}
                          >
                            <td className="p-3 text-center">
                              {isExcluded ? (
                                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                              )}
                            </td>
                            <td className="p-3 font-semibold text-nexus-muted truncate max-w-[200px]">
                              {originalName}
                            </td>
                            <td className="p-3 font-sans">
                              <span className="hud-badge text-[10px] text-nexus-accent">
                                {op.originalFile.suggestedCategory}
                              </span>
                            </td>
                            <td className="p-3 text-nexus-cyan font-bold truncate max-w-[280px]">
                              {organizeByCategory ? `[${destFolder}] ` : ''}
                              {newName}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => toggleExclude(op.index)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold border transition-all ${
                                  isExcluded
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                    : 'bg-nexus-card border-white/5 text-nexus-text hover:text-white'
                                }`}
                              >
                                {isExcluded ? 'Geri Al' : 'Hariç Tut'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between bg-nexus-card/40">
                  <div className="text-xs text-nexus-muted font-mono">
                    Taşınacak: <span className="text-white font-bold">{activeOps.length}</span> dosya |
                    Hariç tutulan: <span className="text-amber-400 font-bold">{excludedIndices.size}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsDiffModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white transition-colors"
                    >
                      İptal
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExecute}
                      disabled={activeOps.length === 0}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      Onayla ve {activeOps.length} Dosyayı Taşı
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </BaseToolTemplate>
  )
}
