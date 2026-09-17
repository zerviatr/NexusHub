import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Binary,
  FileCode,
  Sparkles,
  Copy,
  Check,
  Upload,
  FileText,
  FileImage,
  Music,
  Video,
  File,
  Trash2,
  Download,
  Eye,
  Layers,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'
import {
  textToBytes,
  bytesToText,
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  textToUrlEncoded,
  urlEncodedToText,
  generateHexDump,
  exportBytesAsCArray,
  parseDataUrl,
  readFileAsDataUrl,
  readFileAsArrayBuffer,
  formatByteSize,
  type DataUrlParts,
} from '../lib/encodingEngine'

const SAMPLE_TEXT = 'Hello ZenDev! 🚀 Fast, Memory-Safe & Cross-Platform.'

export default function EncodingStudio() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'hexdump'>('text')

  // ─── TAB 1: Synchronized Multi-Modal Converter State ───
  const [rawText, setRawText] = useState<string>(SAMPLE_TEXT)
  const [base64Val, setBase64Val] = useState<string>('')
  const [hexVal, setHexVal] = useState<string>('')
  const [urlVal, setUrlVal] = useState<string>('')
  const [hexSeparator, setHexSeparator] = useState<' ' | ':' | ''>(' ')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Copy states
  const [copiedText, setCopiedText] = useState<boolean>(false)
  const [copiedB64, setCopiedB64] = useState<boolean>(false)
  const [copiedHex, setCopiedHex] = useState<boolean>(false)
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false)
  const [copiedCArray, setCopiedCArray] = useState<boolean>(false)

  // ─── TAB 2: Data-URL & Media State ───
  const [dataUrlInput, setDataUrlInput] = useState<string>('')
  const [dataUrlFile, setDataUrlFile] = useState<{ name: string; size: number } | null>(null)
  const [copiedDataUrl, setCopiedDataUrl] = useState<boolean>(false)
  const [copiedHtmlImg, setCopiedHtmlImg] = useState<boolean>(false)
  const [copiedCssBg, setCopiedCssBg] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── TAB 3: Hex Dump State ───
  const [hexDumpSource, setHexDumpSource] = useState<'text' | 'file'>('text')
  const [dumpFileBytes, setDumpFileBytes] = useState<Uint8Array | null>(null)
  const [hoveredByteIndex, setHoveredByteIndex] = useState<number | null>(null)

  // Ingest dropped files via global File Gateway
  useFileGatewayDrop(async (detail) => {
    const lower = detail.name.toLowerCase()
    cyberAudio.click()
    try {
      const dataUrl = await readFileAsDataUrl(detail.file)
      const buffer = await readFileAsArrayBuffer(detail.file)
      setDataUrlInput(dataUrl)
      setDataUrlFile({ name: detail.name, size: detail.file.size })
      setDumpFileBytes(new Uint8Array(buffer))

      if (lower.endsWith('.b64') || lower.endsWith('.base64') || lower.endsWith('.txt')) {
        const text = await detail.file.text()
        handleTextChange(text)
      } else {
        setActiveTab('file')
      }
    } catch (err) {
      console.error('File Gateway drop failed in EncodingStudio:', err)
    }
  })

  // Synchronize on initial load or rawText change
  const syncFromText = (text: string, sep = hexSeparator) => {
    try {
      const bytes = textToBytes(text)
      setBase64Val(bytesToBase64(bytes))
      setHexVal(bytesToHex(bytes, sep))
      setUrlVal(textToUrlEncoded(text))
      setErrorMsg(null)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    syncFromText(rawText, hexSeparator)
  }, [hexSeparator])

  // Handlers for two-way synchronized inputs
  const handleTextChange = (newText: string) => {
    setRawText(newText)
    syncFromText(newText, hexSeparator)
  }

  const handleBase64Change = (newB64: string) => {
    setBase64Val(newB64)
    if (!newB64.trim()) {
      setRawText('')
      setHexVal('')
      setUrlVal('')
      setErrorMsg(null)
      return
    }
    try {
      const bytes = base64ToBytes(newB64)
      const text = bytesToText(bytes)
      setRawText(text)
      setHexVal(bytesToHex(bytes, hexSeparator))
      setUrlVal(textToUrlEncoded(text))
      setErrorMsg(null)
    } catch (err: unknown) {
      setErrorMsg(`Invalid Base64: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleHexChange = (newHex: string) => {
    setHexVal(newHex)
    if (!newHex.trim()) {
      setRawText('')
      setBase64Val('')
      setUrlVal('')
      setErrorMsg(null)
      return
    }
    try {
      const bytes = hexToBytes(newHex)
      const text = bytesToText(bytes)
      setRawText(text)
      setBase64Val(bytesToBase64(bytes))
      setUrlVal(textToUrlEncoded(text))
      setErrorMsg(null)
    } catch (err: unknown) {
      setErrorMsg(`Invalid Hex: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleUrlChange = (newUrl: string) => {
    setUrlVal(newUrl)
    if (!newUrl.trim()) {
      setRawText('')
      setBase64Val('')
      setHexVal('')
      setErrorMsg(null)
      return
    }
    try {
      const text = urlEncodedToText(newUrl)
      setRawText(text)
      const bytes = textToBytes(text)
      setBase64Val(bytesToBase64(bytes))
      setHexVal(bytesToHex(bytes, hexSeparator))
      setErrorMsg(null)
    } catch (err: unknown) {
      setErrorMsg(`Invalid URL encoding: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Handle local file upload for Data-URL
  const handleFileUpload = async (file: File) => {
    cyberAudio.click()
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const buffer = await readFileAsArrayBuffer(file)
      setDataUrlInput(dataUrl)
      setDataUrlFile({ name: file.name, size: file.size })
      setDumpFileBytes(new Uint8Array(buffer))
    } catch (err) {
      console.error('Failed to read uploaded file:', err)
    }
  }

  // Data-URL parsing
  const parsedDataUrl: DataUrlParts = useMemo(() => {
    return parseDataUrl(dataUrlInput)
  }, [dataUrlInput])

  // Hex Dump Rows
  const hexDumpRows = useMemo(() => {
    const bytes =
      hexDumpSource === 'file' && dumpFileBytes
        ? dumpFileBytes
        : textToBytes(rawText)
    return generateHexDump(bytes)
  }, [hexDumpSource, dumpFileBytes, rawText])

  const handleCopy = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    cyberAudio.copySuccess()
    setFn(true)
    setTimeout(() => setFn(false), 1800)
  }

  const downloadDecodedFile = () => {
    if (!parsedDataUrl.isValid) return
    cyberAudio.click()
    try {
      const bytes = parsedDataUrl.isBase64
        ? base64ToBytes(parsedDataUrl.data)
        : textToBytes(decodeURIComponent(parsedDataUrl.data))
      const blob = new Blob([bytes as unknown as BlobPart], { type: parsedDataUrl.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dataUrlFile?.name || `decoded-file-${Date.now()}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download file:', err)
    }
  }

  return (
    <BaseToolTemplate
      title={t('encodingStudio.title') || 'Base64, Hex & Data-URL Studio'}
      description={
        t('encodingStudio.description') ||
        'Multi-mode data encoder, media Data-URL visualizer, and canonical 16-byte hex dump inspector.'
      }
      icon={Binary}
      gradient="from-emerald-500 to-teal-600"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('text')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'text'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {t('encodingStudio.tabs.text') || 'Text Converter'}
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('file')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'file'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              {t('encodingStudio.tabs.file') || 'File & Data-URL'}
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('hexdump')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'hexdump'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              {t('encodingStudio.tabs.hexdump') || 'Hex Dump Viewer'}
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            UTF-8 Safe &bull; Sub-millisecond conversion
          </span>
        </div>

        {/* ─── TAB 1: SYNCHRONIZED MULTI-MODAL CONVERTER ──────────────────────── */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 1. UTF-8 Plain Text */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-nexus-cyan" />
                    {t('encodingStudio.inputText') || 'Input Text (UTF-8)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-nexus-muted">
                      {new TextEncoder().encode(rawText).length} bytes
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(rawText, setCopiedText)}
                      className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={4}
                  placeholder="Enter UTF-8 plain text..."
                  className="w-full bg-nexus-base/80 border border-nexus-border/60 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/60 resize-y"
                />
              </div>

              {/* 2. Base64 Output / Input */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    {t('encodingStudio.outputBase64') || 'Base64 Output'}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-nexus-muted">
                      {base64Val.length} chars
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(base64Val, setCopiedB64)}
                      className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                    >
                      {copiedB64 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                </div>
                <textarea
                  value={base64Val}
                  onChange={(e) => handleBase64Change(e.target.value)}
                  rows={4}
                  placeholder="Base64 encoded string..."
                  className="w-full bg-nexus-base/80 border border-indigo-500/20 rounded-xl p-3 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-400 resize-y break-all"
                />
              </div>

              {/* 3. Hexadecimal Output / Input */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5" />
                    {t('encodingStudio.outputHex') || 'Hex Output'}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Delimiter toggle */}
                    <div className="flex items-center gap-1 bg-nexus-surface px-1.5 py-0.5 rounded-lg border border-white/5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setHexSeparator(' ')}
                        className={`px-1.5 rounded ${hexSeparator === ' ' ? 'bg-emerald-500 text-black font-bold' : 'text-nexus-muted'}`}
                      >
                        Space
                      </button>
                      <button
                        type="button"
                        onClick={() => setHexSeparator(':')}
                        className={`px-1.5 rounded ${hexSeparator === ':' ? 'bg-emerald-500 text-black font-bold' : 'text-nexus-muted'}`}
                      >
                        Colon
                      </button>
                      <button
                        type="button"
                        onClick={() => setHexSeparator('')}
                        className={`px-1.5 rounded ${hexSeparator === '' ? 'bg-emerald-500 text-black font-bold' : 'text-nexus-muted'}`}
                      >
                        None
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(hexVal, setCopiedHex)}
                      className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                    >
                      {copiedHex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                </div>
                <textarea
                  value={hexVal}
                  onChange={(e) => handleHexChange(e.target.value)}
                  rows={4}
                  placeholder="Hex string (e.g. 48 65 6c 6c 6f)..."
                  className="w-full bg-nexus-base/80 border border-emerald-500/20 rounded-xl p-3 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-400 resize-y break-all"
                />
              </div>

              {/* 4. URL Encoded Output / Input */}
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    {t('encodingStudio.outputUrl') || 'URL Encoded'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(urlVal, setCopiedUrl)}
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <textarea
                  value={urlVal}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  rows={4}
                  placeholder="URL encoded string..."
                  className="w-full bg-nexus-base/80 border border-amber-500/20 rounded-xl p-3 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400 resize-y break-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: FILE & DATA-URL VISUALIZER ──────────────────────────────── */}
        {activeTab === 'file' && (
          <div className="space-y-6">
            {/* Upload & Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleFileUpload(file)
              }}
              className="glass-panel p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-nexus-cyan/40 transition-all cursor-pointer text-center space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
              <Upload className="w-8 h-8 text-nexus-cyan mx-auto animate-bounce" />
              <p className="text-xs font-semibold text-white">
                {t('encodingStudio.dropFile') || 'Drop file here or click to browse'}
              </p>
              <p className="text-[11px] text-nexus-muted">
                Images, Audio, Video, PDF, or binary data up to 10MB
              </p>
              {dataUrlFile && (
                <div className="pt-2 text-xs font-mono text-emerald-300">
                  Active file: {dataUrlFile.name} ({formatByteSize(dataUrlFile.size)})
                </div>
              )}
            </div>

            {/* Direct Data-URL Input */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider">
                  Data-URL String
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDataUrlInput('')
                      setDataUrlFile(null)
                    }}
                    className="text-[11px] text-nexus-muted hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(dataUrlInput, setCopiedDataUrl)}
                    disabled={!dataUrlInput}
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white disabled:opacity-50"
                  >
                    {copiedDataUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {t('encodingStudio.copyDataUrl') || 'Copy Data-URL'}
                  </button>
                </div>
              </div>
              <textarea
                value={dataUrlInput}
                onChange={(e) => setDataUrlInput(e.target.value)}
                placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
                rows={3}
                className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/60 resize-y break-all"
              />
            </div>

            {/* Media Preview & Metadata Card */}
            {parsedDataUrl.isValid && (
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                      {t('encodingStudio.mediaPreview') || 'Media Preview'}
                    </h3>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {t('encodingStudio.mimeType') || 'MIME'}: {parsedDataUrl.mimeType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-nexus-surface border border-white/10 text-white">
                      {t('encodingStudio.fileSize') || 'Size'}: {formatByteSize(parsedDataUrl.byteSize)}
                    </span>
                    <button
                      type="button"
                      onClick={downloadDecodedFile}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/50 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Save File
                    </button>
                  </div>
                </div>

                {/* Live Player by Media Category */}
                <div className="p-4 rounded-xl bg-nexus-base/80 border border-white/5 flex items-center justify-center min-h-[220px]">
                  {parsedDataUrl.mediaCategory === 'image' && (
                    <img
                      src={dataUrlInput}
                      alt="Data-URL Preview"
                      className="max-h-80 max-w-full rounded-lg shadow-md object-contain"
                    />
                  )}

                  {parsedDataUrl.mediaCategory === 'audio' && (
                    <audio controls src={dataUrlInput} className="w-full max-w-md" />
                  )}

                  {parsedDataUrl.mediaCategory === 'video' && (
                    <video controls src={dataUrlInput} className="max-h-80 max-w-full rounded-lg shadow-md" />
                  )}

                  {parsedDataUrl.mediaCategory === 'pdf' && (
                    <iframe
                      src={dataUrlInput}
                      title="PDF Preview"
                      className="w-full h-96 rounded-lg border border-white/10"
                    />
                  )}

                  {parsedDataUrl.mediaCategory === 'text' && (
                    <pre className="text-xs font-mono text-nexus-muted max-h-60 overflow-auto w-full p-2">
                      {parsedDataUrl.isBase64
                        ? bytesToText(base64ToBytes(parsedDataUrl.data))
                        : decodeURIComponent(parsedDataUrl.data)}
                    </pre>
                  )}

                  {parsedDataUrl.mediaCategory === 'unknown' && (
                    <div className="text-center text-nexus-muted text-xs space-y-1">
                      <File className="w-8 h-8 mx-auto text-white/20" />
                      <p>Binary data preview not directly renderable as visual media.</p>
                      <p className="text-[10px]">Use the Save File button above to download.</p>
                    </div>
                  )}
                </div>

                {/* Snippets Generator */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(`<img src="${dataUrlInput}" alt="Embedded Asset" />`, setCopiedHtmlImg)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
                  >
                    {copiedHtmlImg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {t('encodingStudio.copyHtmlImg') || 'Copy HTML <img>'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(`background-image: url("${dataUrlInput}");`, setCopiedCssBg)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-white/10 text-xs text-nexus-muted hover:text-white transition-colors"
                  >
                    {copiedCssBg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {t('encodingStudio.copyCssBg') || 'Copy CSS background'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CANONICAL 16-BYTE HEX DUMP VIEWER ───────────────────────── */}
        {activeTab === 'hexdump' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-nexus-muted font-medium">Source:</span>
                <button
                  type="button"
                  onClick={() => setHexDumpSource('text')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    hexDumpSource === 'text'
                      ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40'
                      : 'bg-nexus-surface/50 text-nexus-muted hover:text-white'
                  }`}
                >
                  Current Text ({new TextEncoder().encode(rawText).length} bytes)
                </button>
                {dumpFileBytes && (
                  <button
                    type="button"
                    onClick={() => setHexDumpSource('file')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      hexDumpSource === 'file'
                        ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40'
                        : 'bg-nexus-surface/50 text-nexus-muted hover:text-white'
                    }`}
                  >
                    Uploaded File ({formatByteSize(dumpFileBytes.length)})
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const bytes =
                      hexDumpSource === 'file' && dumpFileBytes
                        ? dumpFileBytes
                        : textToBytes(rawText)
                    const cCode = exportBytesAsCArray(bytes)
                    handleCopy(cCode, setCopiedCArray)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60 text-xs text-white hover:border-emerald-400/40 transition-colors"
                >
                  {copiedCArray ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  Export C Array
                </button>
              </div>
            </div>

            {/* Canonical 3-Column Hex Dump Grid */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs select-text">
                <thead>
                  <tr className="border-b border-white/10 text-nexus-muted text-[11px] uppercase">
                    <th className="py-2 px-3 w-28">
                      {t('encodingStudio.offset') || 'Offset'}
                    </th>
                    <th className="py-2 px-3">
                      {t('encodingStudio.hexBytes') || 'Hex Bytes (00-0F)'}
                    </th>
                    <th className="py-2 px-3 w-48">
                      {t('encodingStudio.ascii') || 'ASCII Text'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {hexDumpRows.map((row) => (
                    <tr key={row.offset} className="hover:bg-white/[0.02] transition-colors">
                      {/* Offset */}
                      <td className="py-1 px-3 text-cyan-400/80 font-bold whitespace-nowrap">
                        {row.hexOffset}
                      </td>

                      {/* 16 Hex Bytes with middle gap after byte 7 */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <span className="space-x-1.5">
                          {row.hexCodes.slice(0, 8).map((code, idx) => {
                            const globalIdx = row.offset + idx
                            const isHovered = hoveredByteIndex === globalIdx
                            return (
                              <span
                                key={idx}
                                onMouseEnter={() => setHoveredByteIndex(globalIdx)}
                                onMouseLeave={() => setHoveredByteIndex(null)}
                                className={`inline-block px-0.5 rounded cursor-default ${
                                  isHovered
                                    ? 'bg-nexus-cyan text-black font-bold'
                                    : code === '  '
                                    ? 'text-transparent'
                                    : 'text-emerald-300 hover:text-white'
                                }`}
                              >
                                {code}
                              </span>
                            )
                          })}
                        </span>
                        <span className="mx-2 text-white/20">|</span>
                        <span className="space-x-1.5">
                          {row.hexCodes.slice(8, 16).map((code, idx) => {
                            const globalIdx = row.offset + 8 + idx
                            const isHovered = hoveredByteIndex === globalIdx
                            return (
                              <span
                                key={idx}
                                onMouseEnter={() => setHoveredByteIndex(globalIdx)}
                                onMouseLeave={() => setHoveredByteIndex(null)}
                                className={`inline-block px-0.5 rounded cursor-default ${
                                  isHovered
                                    ? 'bg-nexus-cyan text-black font-bold'
                                    : code === '  '
                                    ? 'text-transparent'
                                    : 'text-emerald-300 hover:text-white'
                                }`}
                              >
                                {code}
                              </span>
                            )
                          })}
                        </span>
                      </td>

                      {/* ASCII Column */}
                      <td className="py-1 px-3 text-white/80 font-mono tracking-widest whitespace-nowrap">
                        {row.asciiChars.map((ch, idx) => {
                          const globalIdx = row.offset + idx
                          const isHovered = hoveredByteIndex === globalIdx
                          return (
                            <span
                              key={idx}
                              onMouseEnter={() => setHoveredByteIndex(globalIdx)}
                              onMouseLeave={() => setHoveredByteIndex(null)}
                              className={`inline-block px-0.5 rounded cursor-default ${
                                isHovered
                                  ? 'bg-nexus-cyan text-black font-bold'
                                  : ch === '.'
                                  ? 'text-nexus-muted'
                                  : 'text-white'
                              }`}
                            >
                              {ch}
                            </span>
                          )
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
