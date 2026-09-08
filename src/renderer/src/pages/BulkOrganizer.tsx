import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderArchive, FolderOpen, Loader2, Search, Settings2, Play, CheckCircle2, AlertCircle } from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, ScannedFile, FileOperation, OrganizerExecutionResult } from '../lib/ipc'
import { useT } from '../lib/i18n'

export default function BulkOrganizer() {
  const { t } = useT()
  const [selectedDir, setSelectedDir] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([])
  
  // Settings
  const [organizeByCategory, setOrganizeByCategory] = useState(true)
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  // Execution
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<OrganizerExecutionResult | null>(null)

  const handleSelectDir = async () => {
    const result = await nexusAPI.organizer.selectDir()
    if (!result.canceled && result.filePaths.length > 0) {
      setSelectedDir(result.filePaths[0])
      setScannedFiles([])
      setExecutionResult(null)
    }
  }

  const handleScan = async () => {
    if (!selectedDir) return
    setIsScanning(true)
    setExecutionResult(null)
    try {
      const res = await nexusAPI.organizer.scan(selectedDir)
      if (res.success && res.files) {
        setScannedFiles(res.files)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsScanning(false)
    }
  }

  // Generate Preview
  const generatePreview = (): FileOperation[] => {
    if (!selectedDir) return []
    return scannedFiles.map((file) => {
      let newName = file.originalName
      const ext = file.extension
      const nameWithoutExt = newName.slice(0, -ext.length || undefined)

      if (prefix || suffix) {
        newName = `${prefix}${nameWithoutExt}${suffix}${ext}`
      }

      let targetDir = selectedDir
      if (organizeByCategory) {
        // We use forward slash or backslash depending on OS, but electron path.join uses OS specific.
        // For preview, we can just use simple string concat since we pass this to main process which handles it correctly.
        targetDir = `${selectedDir}\\${file.suggestedCategory}`
      }

      return {
        oldPath: file.originalPath,
        newPath: `${targetDir}\\${newName}`,
      }
    })
  }

  const previewOps = generatePreview()

  const handleExecute = async () => {
    if (previewOps.length === 0) return
    setIsExecuting(true)
    try {
      const res = await nexusAPI.organizer.execute(previewOps)
      setExecutionResult(res)
      if (res.success) {
        setScannedFiles([]) // clear to prevent re-execution
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <BaseToolTemplate
      title={t('nav.tools.bulkOrganizer') || "Bulk File Organizer"}
      description={t('dashboard.tools.bulkOrganizer.desc') || "Clean up messy directories by instantly categorizing and bulk-renaming files."}
      icon={FolderArchive}
    >
      <div className="space-y-6">
        
        {/* Step 1: Select & Scan */}
        <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">{t('organizer.targetDir') || 'Target Directory'}</h3>
            <p className="text-xs text-nexus-muted truncate font-mono bg-nexus-bg/50 p-2 rounded-lg border border-nexus-border/30">
              {selectedDir || t('organizer.noFolder') || 'No folder selected'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectDir}
              className="px-4 py-2.5 rounded-xl bg-nexus-card border border-nexus-border/50 text-white text-sm font-medium flex items-center gap-2 hover:bg-nexus-bg transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-nexus-accent" />
              {t('organizer.selectFolder') || 'Select Folder'}
            </motion.button>

            <motion.button
              whileHover={selectedDir && !isScanning ? { scale: 1.02 } : {}}
              whileTap={selectedDir && !isScanning ? { scale: 0.98 } : {}}
              onClick={handleScan}
              disabled={!selectedDir || isScanning}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
                ${selectedDir && !isScanning 
                  ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20 cursor-pointer' 
                  : 'bg-nexus-card text-nexus-muted cursor-not-allowed border border-nexus-border/30'}
              `}
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('organizer.scan') || 'Scan'}
            </motion.button>
          </div>
        </div>

        {/* Execution Result */}
        <AnimatePresence>
          {executionResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                executionResult.success 
                  ? 'bg-nexus-success/10 border-nexus-success/30 text-nexus-success' 
                  : 'bg-nexus-error/10 border-nexus-error/30 text-nexus-error'
              }`}
            >
              {executionResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <div>
                <p className="text-sm font-bold">
                  {executionResult.success ? 'Organization Complete!' : 'Completed with errors'}
                </p>
                <p className="text-xs opacity-80 mt-1">
                  Successfully moved {executionResult.successfulOperations} files. 
                  {executionResult.failedOperations > 0 && ` Failed: ${executionResult.failedOperations}`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Settings & Preview */}
        {scannedFiles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Settings Panel */}
            <div className="glass-card p-6 h-fit">
              <div className="flex items-center gap-2 mb-6 text-nexus-accent">
                <Settings2 className="w-5 h-5" />
                <h3 className="font-semibold">Rules</h3>
              </div>

              <div className="space-y-5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={organizeByCategory}
                      onChange={(e) => setOrganizeByCategory(e.target.checked)}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${organizeByCategory ? 'bg-nexus-accent' : 'bg-nexus-bg border border-nexus-border'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${organizeByCategory ? 'left-6' : 'left-1'}`} />
                    </div>
                  </div>
                  <span className="text-sm text-white font-medium group-hover:text-nexus-accent transition-colors">
                    Move to Category Folders
                  </span>
                </label>

                <div className="space-y-2">
                  <label className="text-xs text-nexus-muted">Add Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. clean_"
                    className="w-full px-3 py-2 rounded-lg bg-nexus-bg border border-nexus-border text-sm text-white outline-none focus:border-nexus-accent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-nexus-muted">Add Suffix</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. _v1"
                    className="w-full px-3 py-2 rounded-lg bg-nexus-bg border border-nexus-border text-sm text-white outline-none focus:border-nexus-accent transition-colors"
                  />
                </div>

                <motion.button
                  whileHover={!isExecuting ? { scale: 1.02 } : {}}
                  whileTap={!isExecuting ? { scale: 0.98 } : {}}
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="w-full py-3 mt-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  Execute Changes
                </motion.button>
              </div>
            </div>

            {/* Preview List */}
            <div className="lg:col-span-2 glass-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Preview Changes</h3>
                <span className="text-xs font-mono bg-nexus-bg px-2 py-1 rounded text-nexus-accent">
                  {scannedFiles.length} files
                </span>
              </div>
              
              <div className="flex-1 bg-nexus-bg/50 rounded-xl border border-nexus-border/30 overflow-hidden flex flex-col">
                <div className="overflow-y-auto max-h-[400px] custom-scrollbar p-2">
                  {previewOps.slice(0, 100).map((op, idx) => {
                    const originalName = op.oldPath.split('\\').pop() || op.oldPath.split('/').pop()
                    const newName = op.newPath.split('\\').pop() || op.newPath.split('/').pop()
                    const destFolder = organizeByCategory ? op.newPath.split('\\').slice(-2, -1)[0] : 'Same Folder'

                    return (
                      <div key={idx} className="p-3 border-b border-nexus-border/30 last:border-0 hover:bg-nexus-card/50 transition-colors">
                        <div className="flex flex-col gap-1 text-xs font-mono">
                          <span className="text-nexus-muted line-through truncate">{originalName}</span>
                          <div className="flex items-center gap-2 text-white">
                            <span className="text-nexus-success">→</span>
                            <span className={organizeByCategory ? 'text-nexus-accent' : ''}>{organizeByCategory ? `[${destFolder}] ` : ''}</span>
                            <span className="truncate">{newName}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {previewOps.length > 100 && (
                    <div className="p-4 text-center text-xs text-nexus-muted font-medium">
                      + {previewOps.length - 100} more files
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
