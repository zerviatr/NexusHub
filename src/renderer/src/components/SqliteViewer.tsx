import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Database,
  Table,
  Upload,
  Search,
  Play,
  Download,
  Copy,
  Check,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Info,
  X,
  FileCode,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react'
import {
  TableInfo,
  openDatabaseFromBuffer,
  loadDatabaseFromSql,
  getDatabaseTables,
  executeUserQuery,
  createSampleDatabase
} from '../lib/sqliteEngine'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'

interface SqliteViewerProps {
  onExportToJsonTab?: (jsonString: string) => void
  initialFile?: File | null
}

export default function SqliteViewer({ onExportToJsonTab, initialFile }: SqliteViewerProps) {
  const [dbInstance, setDbInstance] = useState<any>(null)
  const [dbName, setDbName] = useState<string>('')
  const [dbSize, setDbSize] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Tables state
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableSearch, setTableSearch] = useState<string>('')
  const [showSchema, setShowSchema] = useState<boolean>(false)

  // Data state
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[][] }>({
    columns: [],
    rows: []
  })
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // SQL Console state
  const [showSqlEditor, setShowSqlEditor] = useState<boolean>(false)
  const [customSql, setCustomSql] = useState<string>('')
  const [queryExecutionTime, setQueryExecutionTime] = useState<number | null>(null)
  const [queryError, setQueryError] = useState<string>('')
  const [copiedAction, setCopiedAction] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Cleanup dbInstance to prevent WebAssembly memory leak
  useEffect(() => {
    return () => {
      if (dbInstance && typeof dbInstance.close === 'function') {
        try { dbInstance.close() } catch (e) {}
      }
    }
  }, [dbInstance])

  // Load sample database on demand or if requested
  const handleLoadSample = async () => {
    setLoading(true)
    setError('')
    try {
      cyberAudio.click()
      const sampleDb = await createSampleDatabase()
      setDbInstance(sampleDb)
      setDbName('zendev_demo.sqlite')
      setDbSize(32768)

      const tbls = getDatabaseTables(sampleDb)
      setTables(tbls)
      if (tbls.length > 0) {
        loadTable(sampleDb, tbls[0].name)
      }
      cyberAudio.copySuccess()
    } catch (err: any) {
      setError(err.message || 'Örnek veritabanı yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  // Load a specific table's contents
  const loadTable = (db: any, tableName: string) => {
    setSelectedTable(tableName)
    setFilterQuery('')
    setSortCol(null)
    setPage(1)
    setCustomSql(`SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 250;`)

    const res = executeUserQuery(db, `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 500;`)
    if (res.error) {
      setError(res.error)
      setTableData({ columns: [], rows: [] })
    } else {
      setTableData({ columns: res.columns, rows: res.values })
    }
  }

  // Handle uploaded file (.sqlite, .db, .sql)
  const processFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      cyberAudio.click()
      setDbName(file.name)
      setDbSize(file.size)

      const isSqlDump = file.name.endsWith('.sql')
      let db: any

      if (isSqlDump) {
        const text = await file.text()
        db = await loadDatabaseFromSql(text)
      } else {
        const buffer = await file.arrayBuffer()
        db = await openDatabaseFromBuffer(buffer)
      }

      setDbInstance(db)
      const tbls = getDatabaseTables(db)
      setTables(tbls)

      if (tbls.length > 0) {
        loadTable(db, tbls[0].name)
      } else {
        setSelectedTable('')
        setTableData({ columns: [], rows: [] })
      }
      cyberAudio.copySuccess()
    } catch (err: any) {
      console.error('File load error:', err)
      setError(err.message || 'Veritabanı dosyası açılamadı. Lütfen geçerli bir .sqlite, .db veya .sql dosyası yükleyin.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-load initial database file passed from tab switch
  useEffect(() => {
    if (initialFile) {
      processFile(initialFile)
    }
  }, [initialFile])

  // Ingest dropped database files when SqliteViewer is mounted
  useFileGatewayDrop((detail) => {
    const lower = detail.name.toLowerCase()
    if (lower.endsWith('.sqlite') || lower.endsWith('.db') || lower.endsWith('.db3') || lower.endsWith('.sql')) {
      processFile(detail.file)
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Execute custom query in REPL
  const handleRunCustomQuery = () => {
    if (!dbInstance || !customSql.trim()) return
    cyberAudio.click()
    setQueryError('')
    const res = executeUserQuery(dbInstance, customSql)
    setQueryExecutionTime(res.executionTimeMs)
    if (res.error) {
      setQueryError(res.error)
    } else {
      setTableData({ columns: res.columns, rows: res.values })
      setFilterQuery('')
      setPage(1)
      setSortCol(null)
    }
  }

  // Filter & Sort table rows in memory
  const processedRows = useMemo(() => {
    let rows = [...tableData.rows]

    // 1. Text filter across all columns
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      rows = rows.filter((row) =>
        row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      )
    }

    // 2. Sorting
    if (sortCol !== null) {
      rows.sort((a, b) => {
        const valA = a[sortCol]
        const valB = b[sortCol]
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA
        }
        return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))
      })
    }

    return rows
  }, [tableData.rows, filterQuery, sortCol, sortAsc])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return processedRows.slice(start, start + pageSize)
  }, [processedRows, page, pageSize])

  // Active table metadata
  const currentTableMeta = useMemo(() => {
    return tables.find((t) => t.name === selectedTable)
  }, [tables, selectedTable])

  // Filter tables in sidebar
  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables
    return tables.filter((t) => t.name.toLowerCase().includes(tableSearch.toLowerCase()))
  }, [tables, tableSearch])

  // Exports
  const handleExportJson = () => {
    const objects = processedRows.map((row) => {
      const obj: Record<string, any> = {}
      tableData.columns.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      return obj
    })
    const jsonStr = JSON.stringify(objects, null, 2)

    if (onExportToJsonTab) {
      onExportToJsonTab(jsonStr)
      cyberAudio.copySuccess()
    } else {
      navigator.clipboard.writeText(jsonStr)
      cyberAudio.copySuccess()
      setCopiedAction('json')
      setTimeout(() => setCopiedAction(null), 2000)
    }
  }

  const handleExportCsv = () => {
    const header = tableData.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')
    const rows = processedRows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '""'
          const str = String(cell).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    )
    const csvContent = [header, ...rows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${selectedTable || 'sqlite_export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    cyberAudio.copySuccess()
  }

  const handleCopyMarkdown = () => {
    if (tableData.columns.length === 0) return
    const header = `| ${tableData.columns.join(' | ')} |`
    const divider = `| ${tableData.columns.map(() => '---').join(' | ')} |`
    const rows = paginatedRows.map(
      (row) => `| ${row.map((c) => (c === null || c === undefined ? '*NULL*' : String(c))).join(' | ')} |`
    )
    const md = [header, divider, ...rows].join('\n')
    navigator.clipboard.writeText(md)
    cyberAudio.copySuccess()
    setCopiedAction('md')
    setTimeout(() => setCopiedAction(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────────
          TOP TOOLBAR & FILE LOADER
      ────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.db,.sqlite3,.sql"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 text-xs font-semibold text-nexus-cyan hover:bg-nexus-cyan/30 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Dosya Yükle (.sqlite / .db / .sql)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-nexus-text hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Örnek DB Yükle</span>
          </button>

          {dbInstance && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-nexus-surface border border-white/5 text-xs font-mono text-nexus-muted">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-semibold truncate max-w-xs">{dbName}</span>
              <span>&bull;</span>
              <span>{(dbSize / 1024).toFixed(1)} KB</span>
              <span>&bull;</span>
              <span className="text-nexus-cyan">{tables.length} Tablo</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {dbInstance && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlEditor(!showSqlEditor)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                showSqlEditor
                  ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent'
                  : 'bg-nexus-surface border-white/10 text-nexus-muted hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>SQL Konsolu</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSchema(!showSchema)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                showSchema
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-nexus-surface border-white/10 text-nexus-muted hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Şema Detayı</span>
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nexus-surface border border-white/10 text-xs font-mono text-nexus-cyan hover:bg-nexus-cyan/20 transition-colors"
              title="JSON Studio'da Aç veya Panoya Kopyala"
            >
              {copiedAction === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>JSON Aktar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nexus-surface border border-white/10 text-xs font-mono text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="CSV Dosyası Olarak İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nexus-surface border border-white/10 text-xs font-mono text-nexus-text hover:bg-white/10 transition-colors"
              title="Markdown Tablosu Olarak Kopyala"
            >
              {copiedAction === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>MD Tablo</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Hata:</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          DRAG & DROP LANDING (WHEN NO DB LOADED)
      ────────────────────────────────────────────────────────────────────── */}
      {!dbInstance && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed transition-all text-center ${
            isDragging
              ? 'border-nexus-cyan bg-nexus-cyan/10 scale-[1.01]'
              : 'border-white/10 bg-nexus-surface/40 hover:border-nexus-cyan/40 hover:bg-nexus-surface/60'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-nexus-cyan/20 to-indigo-500/20 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan mb-4 shadow-xl">
            <Database className="w-8 h-8" />
          </div>

          <h3 className="text-base font-semibold text-white mb-2">
            SQLite veya SQL Dosyasını Buraya Sürükleyin
          </h3>
          <p className="text-xs text-nexus-muted max-w-md mb-6 leading-relaxed">
            Tamamen yerel WebAssembly motoru ile <span className="text-nexus-cyan font-mono">.sqlite</span>,{' '}
            <span className="text-nexus-cyan font-mono">.db</span> ve{' '}
            <span className="text-nexus-cyan font-mono">.sql</span> dump dosyalarını tarayıcınızda offline olarak inceleyin.
            Verileriniz asla cihazınızın dışına çıkmaz.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nexus-cyan text-black font-semibold text-xs hover:bg-nexus-cyan/90 transition-all shadow-lg shadow-nexus-cyan/20"
            >
              <Upload className="w-4 h-4" />
              <span>Cihazdan Dosya Seç</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-nexus-text text-xs hover:text-white hover:border-nexus-cyan/40 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Demo Veritabanı Yükle</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          MAIN EXPLORER (DATABASE LOADED)
      ────────────────────────────────────────────────────────────────────── */}
      {dbInstance && (
        <div className="space-y-4">
          {/* SQL REPL Console (Collapsible) */}
          {showSqlEditor && (
            <div className="glass-panel p-4 rounded-2xl border border-nexus-accent/30 bg-nexus-surface/90 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-nexus-accent">
                  <Code2 className="w-4 h-4" />
                  <span>İnteraktif SQL REPL Konsolu</span>
                </div>
                {queryExecutionTime !== null && (
                  <span className="text-[11px] font-mono text-emerald-400">
                    ⚡ {queryExecutionTime} ms ({tableData.rows.length} sonuç)
                  </span>
                )}
              </div>

              <textarea
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleRunCustomQuery()
                  }
                }}
                rows={3}
                placeholder="Örn: SELECT * FROM users WHERE status = 'active' ORDER BY balance DESC LIMIT 50;"
                className="w-full p-3 rounded-xl bg-nexus-bg border border-nexus-border/50 text-xs font-mono text-white focus:outline-none focus:border-nexus-accent/60 resize-y"
              />

              {queryError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono">
                  {queryError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[11px] text-nexus-muted font-mono">
                  <span>Çalıştırmak için: <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd></span>
                </div>
                <button
                  type="button"
                  onClick={handleRunCustomQuery}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-nexus-accent text-white font-semibold text-xs hover:bg-nexus-accent/90 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Sorguyu Çalıştır</span>
                </button>
              </div>
            </div>
          )}

          {/* Schema Drawer (Collapsible) */}
          {showSchema && currentTableMeta && (
            <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Tablo Şeması: {currentTableMeta.name}</span>
                </h4>
                <span className="text-xs font-mono text-nexus-muted">
                  {currentTableMeta.columns.length} Sütun &bull; {currentTableMeta.rowCount} Toplam Kayıt
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {currentTableMeta.columns.map((col) => (
                  <div
                    key={col.name}
                    className="p-2.5 rounded-xl bg-nexus-surface/80 border border-white/5 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold truncate">{col.name}</span>
                      {col.pk === 1 && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                          PK
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-nexus-muted">
                      <span className="text-nexus-cyan font-bold">{col.type}</span>
                      {col.notnull === 1 && <span className="text-rose-400">NOT NULL</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Selector & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Table Navigation Sidebar */}
            <div className="md:col-span-1 glass-panel p-3.5 rounded-2xl border border-white/5 space-y-2.5 flex flex-col max-h-[600px]">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-nexus-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-nexus-cyan" /> Tablolar ({tables.length})
                </span>
              </div>

              {/* Table search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-nexus-muted absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Tablo ara..."
                  className="w-full pl-8 pr-3 py-1.5 bg-nexus-surface rounded-lg border border-nexus-border/40 text-xs text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-cyan/50"
                />
              </div>

              {/* Table List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredTables.map((tbl) => {
                  const isSelected = tbl.name === selectedTable
                  return (
                    <button
                      key={tbl.name}
                      type="button"
                      onClick={() => loadTable(dbInstance, tbl.name)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-nexus-cyan/20 border border-nexus-cyan/40 text-white font-medium shadow-sm'
                          : 'text-nexus-muted hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Table className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-nexus-cyan' : 'text-nexus-muted'}`} />
                        <span className="text-xs truncate">{tbl.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-nexus-surface text-nexus-muted">
                        {tbl.rowCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Data Grid Section */}
            <div className="md:col-span-3 glass-panel p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col max-h-[600px]">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-nexus-cyan" />
                    <span>{selectedTable || 'Veri Tablosu'}</span>
                  </h3>
                  <span className="text-xs font-mono text-nexus-muted">
                    ({processedRows.length} kayıt {filterQuery ? `filtrelendi` : ''})
                  </span>
                </div>

                {/* Instant Table Search */}
                <div className="flex items-center gap-2">
                  <div className="relative w-56 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-nexus-muted absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => {
                        setFilterQuery(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Tablo içinde anında ara..."
                      className="w-full pl-8 pr-3 py-1.5 bg-nexus-surface rounded-lg border border-nexus-border/50 text-xs text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-cyan/50"
                    />
                    {filterQuery && (
                      <button
                        onClick={() => setFilterQuery('')}
                        className="absolute right-2 top-2 text-nexus-muted hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-nexus-bg/60">
                {tableData.columns.length === 0 ? (
                  <div className="p-8 text-center text-xs text-nexus-muted">
                    Tabloda gösterilecek veri bulunamadı.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="sticky top-0 bg-nexus-surface border-b border-white/10 z-10">
                      <tr>
                        <th className="p-2.5 text-[11px] text-nexus-muted font-normal w-12 text-center">#</th>
                        {tableData.columns.map((col, idx) => (
                          <th
                            key={col}
                            onClick={() => {
                              if (sortCol === idx) {
                                setSortAsc(!sortAsc)
                              } else {
                                setSortCol(idx)
                                setSortAsc(true)
                              }
                            }}
                            className="p-2.5 text-[11px] text-nexus-muted font-semibold hover:text-white cursor-pointer transition-colors select-none"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{col}</span>
                              <ArrowUpDown className="w-3 h-3 opacity-50" />
                              {sortCol === idx && (
                                <span className="text-nexus-cyan text-[10px]">{sortAsc ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 1} className="p-6 text-center text-xs text-nexus-muted">
                            "{filterQuery}" filtresine uyan satır bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row, rIdx) => {
                          const rowNum = (page - 1) * pageSize + rIdx + 1
                          return (
                            <tr
                              key={rIdx}
                              className="hover:bg-nexus-cyan/5 transition-colors group"
                            >
                              <td className="p-2.5 text-center text-nexus-muted/50 text-[10px]">{rowNum}</td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 text-white/90 truncate max-w-xs">
                                  {cell === null || cell === undefined ? (
                                    <span className="text-nexus-muted italic">NULL</span>
                                  ) : typeof cell === 'number' ? (
                                    <span className="text-cyan-300">{cell}</span>
                                  ) : String(cell) === '1' && (tableData.columns[cIdx].includes('is_') || tableData.columns[cIdx].includes('active')) ? (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                      TRUE
                                    </span>
                                  ) : String(cell) === '0' && (tableData.columns[cIdx].includes('is_') || tableData.columns[cIdx].includes('active')) ? (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                                      FALSE
                                    </span>
                                  ) : (
                                    <span>{String(cell)}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-nexus-muted font-mono">
                <div className="flex items-center gap-2">
                  <span>Sayfa başına:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="bg-nexus-surface border border-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Gösterilen: {(page - 1) * pageSize + 1} -{' '}
                    {Math.min(page * pageSize, processedRows.length)} / {processedRows.length} satır
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-nexus-surface border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    Sayfa {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-nexus-surface border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
