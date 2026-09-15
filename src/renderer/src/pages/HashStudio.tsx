import { useState, useMemo, useEffect } from 'react'
import {
  FileCheck,
  Copy,
  Check,
  Upload,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Type,
  FileUp,
  RefreshCw
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'
import { useFileGatewayDrop } from '../lib/fileGateway'
import { logActivity } from '../lib/activityLogger'

type HashTab = 'text' | 'file'

// Lightweight standard client MD5 implementation
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }
  function addUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000
    const lY8 = lY & 0x80000000
    const lX4 = lX & 0x40000000
    const lY4 = lY & 0x40000000
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8
    } else {
      return lResult ^ lX8 ^ lY8
    }
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z) }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z) }
  function H(x: number, y: number, z: number) { return x ^ y ^ z }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z) }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(str: string) {
    let lWordCount: number
    const lMessageLength = str.length
    const lNumberOfWordsTempOne = lMessageLength + 8
    const lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64
    const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16
    const lWordArray = Array(lNumberOfWords - 1)
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition)
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }

  function wordToHex(lValue: number) {
    let wordToHexValue = '', wordToHexValueTemp = '', lByte: number, lCount: number
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      wordToHexValueTemp = '0' + lByte.toString(16)
      wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2)
    }
    return wordToHexValue
  }

  const x = convertToWordArray(string)
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478)
    d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756)
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db)
    b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee)
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf)
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a)
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613)
    b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501)
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8)
    d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af)
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1)
    b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be)
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122)
    d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193)
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e)
    b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821)

    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562)
    d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340)
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51)
    b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa)
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d)
    d = GG(d, a, b, c, x[k + 10], 9, 0x02441453)
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681)
    b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8)
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6)
    d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6)
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87)
    b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed)
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905)
    d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8)
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9)
    b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a)

    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942)
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681)
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122)
    b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c)
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44)
    d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9)
    c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60)
    b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70)
    a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6)
    d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa)
    c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085)
    b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05)
    a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039)
    d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5)
    c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8)
    b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665)

    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244)
    d = II(d, a, b, c, x[k + 7], 10, 0x432aff97)
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7)
    b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039)
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3)
    d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92)
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d)
    b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1)
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f)
    d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0)
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314)
    b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1)
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82)
    d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235)
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb)
    b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391)

    a = addUnsigned(a, AA)
    b = addUnsigned(b, BB)
    c = addUnsigned(c, CC)
    d = addUnsigned(d, DD)
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

async function bufferToHex(buffer: ArrayBuffer): Promise<string> {
  const byteArray = new Uint8Array(buffer)
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function HashStudio() {
  const { success: showToastSuccess, error: showToastError } = useToast()
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<HashTab>('text')

  // Text state
  const [textInput, setTextInput] = useState('ZenDev Premium Multi-Tool Suite')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHashes, setFileHashes] = useState<{
    md5?: string
    sha1?: string
    sha256?: string
    sha512?: string
  } | null>(null)
  const [isHashingFile, setIsHashingFile] = useState(false)

  // Checksum Comparison
  const [comparisonHash, setComparisonHash] = useState('')

  // Compute text hashes synchronously/asynchronously
  const [textHashes, setTextHashes] = useState<{
    md5: string
    sha1: string
    sha256: string
    sha512: string
  }>({ md5: '', sha1: '', sha256: '', sha512: '' })

  // Re-compute text hashes on input change
  useMemo(() => {
    const encoder = new TextEncoder()
    const data = encoder.encode(textInput)

    const computedMd5 = md5(textInput)

    Promise.all([
      crypto.subtle.digest('SHA-1', data).then(bufferToHex),
      crypto.subtle.digest('SHA-256', data).then(bufferToHex),
      crypto.subtle.digest('SHA-512', data).then(bufferToHex)
    ]).then(([sha1, sha256, sha512]) => {
      setTextHashes({
        md5: computedMd5,
        sha1,
        sha256,
        sha512
      })
    })
  }, [textInput])

  // Process File Hashing
  const handleFileChange = async (file: File) => {
    setSelectedFile(file)
    setIsHashingFile(true)
    setFileHashes(null)
    const startTime = performance.now()

    try {
      if (file.size > 200 * 1024 * 1024) {
        showToastError('Dosya Çok Büyük', 'Tarayıcı bellek güvenliği için maksimum dosya boyutu 200MB\'dir.')
        return
      }
      const buffer = await file.arrayBuffer()
      // Web Crypto for SHA
      const [sha1, sha256, sha512] = await Promise.all([
        crypto.subtle.digest('SHA-1', buffer).then(bufferToHex),
        crypto.subtle.digest('SHA-256', buffer).then(bufferToHex),
        crypto.subtle.digest('SHA-512', buffer).then(bufferToHex)
      ])

      // Safe MD5 processing with chunk or fallback for large buffers
      let computedMd5 = ''
      try {
        const textDecoder = new TextDecoder('iso-8859-1')
        const slice = buffer.byteLength > 64 * 1024 * 1024 ? buffer.slice(0, 64 * 1024 * 1024) : buffer
        const binaryString = textDecoder.decode(slice)
        computedMd5 = md5(binaryString)
      } catch {
        computedMd5 = 'MD5 hesaplanamadı (Dosya çok büyük)'
      }

      setFileHashes({
        md5: computedMd5,
        sha1,
        sha256,
        sha512
      })
      showToastSuccess('Hash Başarılı', 'Dosya bütünlük kodları üretildi.')

      const durationMs = Math.round(performance.now() - startTime)
      logActivity({
        toolId: 'hash-studio',
        action: 'file_hash',
        category: 'crypto',
        status: 'success',
        details: `Computed cryptographic checksums for ${file.name} (${file.size} bytes)`,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          sha256,
          md5: computedMd5,
          sha1,
          sha512,
        },
        durationMs,
      })
    } catch (err: any) {
      console.error('File hashing error:', err)
      showToastError('Hash Hatası', err?.message || 'Dosya hash hesabı başarısız.')
      logActivity({
        toolId: 'hash-studio',
        action: 'file_hash',
        category: 'crypto',
        status: 'failure',
        details: `Failed to compute hash for ${file.name}: ${err?.message || 'Error'}`,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          error: err?.message,
        },
      })
    } finally {
      setIsHashingFile(false)
    }
  }

  // Ingest dropped files from global File Gateway
  useFileGatewayDrop((detail) => {
    setActiveTab('file')
    handleFileChange(detail.file)
    try { cyberAudio.click() } catch {}
  })

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    try { cyberAudio.copySuccess() } catch {}
    showToastSuccess('Kopyalandı', `${key.toUpperCase()} hash değeri panoya kopyalandı.`)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const activeHashes = activeTab === 'text' ? textHashes : fileHashes

  // Comparison matching check
  const checkMatch = (hashValue: string | undefined) => {
    if (!comparisonHash.trim() || !hashValue) return null
    return comparisonHash.trim().toLowerCase() === hashValue.toLowerCase()
  }

  // Checksum verification audit logging
  useEffect(() => {
    const trimmed = comparisonHash.trim()
    if (!trimmed || !activeHashes) return

    const matchEntry = [
      { alg: 'sha256', val: activeHashes.sha256 },
      { alg: 'sha512', val: activeHashes.sha512 },
      { alg: 'sha1', val: activeHashes.sha1 },
      { alg: 'md5', val: activeHashes.md5 },
    ].find((entry) => entry.val && entry.val.toLowerCase() === trimmed.toLowerCase())

    const isMatch = !!matchEntry
    const timer = setTimeout(() => {
      logActivity({
        toolId: 'hash-studio',
        action: 'verify_checksum',
        category: 'crypto',
        status: isMatch ? 'success' : 'warning',
        details: isMatch
          ? `Checksum verified (${matchEntry?.alg.toUpperCase()} match) for ${selectedFile?.name || 'text payload'}`
          : `Checksum mismatch for ${selectedFile?.name || 'text payload'}`,
        metadata: {
          fileName: selectedFile?.name || 'text_payload',
          sha256: activeHashes.sha256,
          expectedHash: trimmed,
          matchResult: isMatch,
          matchedAlgorithm: matchEntry?.alg,
        },
      })
    }, 600)

    return () => clearTimeout(timer)
  }, [comparisonHash, activeHashes, selectedFile])

  return (
    <BaseToolTemplate
      title={t('hashStudio.title') || 'Hash & Checksum Studio'}
      description={t('hashStudio.description') || 'Generate cryptographic checksums (MD5, SHA-1, SHA-256, SHA-512) for text and files with instant integrity verification.'}
      icon={FileCheck}
      gradient="from-emerald-500 to-teal-600"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'text'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Text Checksum
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'file'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              File Checksum
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted font-mono">
            SubtleCrypto Hardware Acceleration
          </span>
        </div>

        {/* ─── TAB 1: TEXT INPUT ─── */}
        {activeTab === 'text' && (
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
            <label className="text-xs font-semibold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-nexus-cyan" />
              Text Payload
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={3}
              placeholder="Type or paste any text..."
              className="w-full p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/50 resize-none"
            />
          </div>
        )}

        {/* ─── TAB 2: FILE UPLOAD ─── */}
        {activeTab === 'file' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
            <input
              type="file"
              id="hashFileInput"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0])
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="hashFileInput"
              className="w-full flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-white/10 hover:border-nexus-cyan/40 rounded-2xl cursor-pointer transition-all bg-nexus-surface/40 hover:bg-nexus-surface/70"
            >
              <Upload className="w-8 h-8 text-nexus-cyan mb-2" />
              <p className="text-sm font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Click to select or drop a file'}
              </p>
              <p className="text-xs text-nexus-muted mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • ${(selectedFile.type || 'Binary file')}`
                  : 'Any format supported • Processed 100% locally'}
              </p>
            </label>

            {isHashingFile && (
              <div className="flex items-center gap-2 text-xs text-nexus-cyan mt-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing hashes...</span>
              </div>
            )}
          </div>
        )}

        {/* Verification Check Input */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
          <label className="text-xs font-semibold text-nexus-muted flex items-center justify-between">
            <span>Verify Against Expected Checksum:</span>
            {comparisonHash && (
              <span className="text-[10px] text-nexus-muted">
                {['md5', 'sha1', 'sha256', 'sha512'].some((alg) =>
                  checkMatch(activeHashes ? (activeHashes as any)[alg] : '')
                ) ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Exact Match Found!
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> No Matching Checksum
                  </span>
                )}
              </span>
            )}
          </label>
          <input
            type="text"
            value={comparisonHash}
            onChange={(e) => setComparisonHash(e.target.value)}
            placeholder="Paste expected hash to verify integrity (e.g. 5d41402abc4b2a76b9719d911017c592)..."
            className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/50"
          />
        </div>

        {/* Hashes Output Cards */}
        <div className="space-y-3">
          {[
            { key: 'sha256', label: 'SHA-256', val: activeHashes?.sha256, bits: '256 bits' },
            { key: 'sha512', label: 'SHA-512', val: activeHashes?.sha512, bits: '512 bits' },
            { key: 'sha1',   label: 'SHA-1',   val: activeHashes?.sha1,   bits: '160 bits' },
            { key: 'md5',    label: 'MD5',     val: activeHashes?.md5,    bits: '128 bits' },
          ].map(({ key, label, val, bits }) => {
            const isMatch = checkMatch(val)
            return (
              <div
                key={key}
                className={`p-4 rounded-xl glass-panel border transition-all ${
                  isMatch === true
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : isMatch === false
                    ? 'border-white/5 opacity-80'
                    : 'border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-nexus-cyan font-mono">{label}</span>
                    <span className="text-[10px] text-nexus-muted px-1.5 py-0.2 rounded bg-white/5 font-mono">
                      {bits}
                    </span>
                    {isMatch === true && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> MATCH
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!val}
                    onClick={() => val && handleCopy(val, key)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface/80 hover:bg-white/10 text-[11px] text-nexus-muted hover:text-white transition-colors"
                  >
                    {copiedKey === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === key ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-xs text-nexus-text break-all select-all leading-relaxed">
                  {val || <span className="text-nexus-muted">No hash generated</span>}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </BaseToolTemplate>
  )
}
