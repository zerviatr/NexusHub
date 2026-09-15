import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Lock,
  Unlock,
  Trash2,
  FileCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  FileText,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI } from '../lib/ipc'
import { useToast } from '../lib/ToastContext'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'
import { logActivity } from '../lib/activityLogger'

type FortressMode = 'shredder' | 'vault' | 'stego'

export default function CyberFortress() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [activeTab, setActiveTab] = useState<FortressMode>('shredder')

  // Shredder State
  const [selectedFile, setSelectedFile] = useState<{ filePath: string; name: string; size: number } | null>(null)
  const [isShredding, setIsShredding] = useState(false)
  const [shredConfirm, setShredConfirm] = useState(false)

  // Vault State
  const [vaultFile, setVaultFile] = useState<{ filePath: string; name: string; size: number } | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [isVaultProcessing, setIsVaultProcessing] = useState(false)
  const [vaultAction, setVaultAction] = useState<'encrypt' | 'decrypt'>('encrypt')

  // Stego State
  const [stegoSecretText, setStegoSecretText] = useState('')
  const [stegoResult, setStegoResult] = useState<string | null>(null)

  // Ingest dropped files from global File Gateway
  useFileGatewayDrop((detail) => {
    const filePath = detail.path || detail.name
    if (detail.name.toLowerCase().endsWith('.nexusvault')) {
      setActiveTab('vault')
      setVaultFile({
        filePath,
        name: detail.name,
        size: detail.size,
      })
      setVaultAction('decrypt')
      try { cyberAudio.click() } catch {}
      showToastSuccess('Kasa Dosyası Yüklendi', `${detail.name} şifre çözümü için hazır.`)
    } else {
      setSelectedFile({
        filePath,
        name: detail.name,
        size: detail.size,
      })
      setShredConfirm(false)
      try { cyberAudio.click() } catch {}
    }
  })

  // File pickers
  const handleSelectShredFile = async () => {
    const file = await nexusAPI.fortress.selectFile()
    if (file) {
      setSelectedFile(file)
      setShredConfirm(false)
    }
  }

  const handleSelectVaultFile = async () => {
    const file = await nexusAPI.fortress.selectFile()
    if (file) {
      setVaultFile(file)
      if (file.name.endsWith('.nexusvault')) {
        setVaultAction('decrypt')
      } else {
        setVaultAction('encrypt')
      }
    }
  }

  // Execute Shred
  const handleExecuteShred = async () => {
    if (!selectedFile || !shredConfirm || isShredding) return
    setIsShredding(true)

    try {
      const res = await nexusAPI.fortress.shredFile(selectedFile.filePath)
      if (res.success) {
        showToastSuccess(
          t('fortress.toastShredSuccess'),
          t('fortress.toastShredSuccessDesc', { name: selectedFile.name })
        )
        setSelectedFile(null)
        setShredConfirm(false)
      } else {
        showToastError('İmha Hatası', res.error || 'Dosya silinemedi.')
      }

      logActivity({
        toolId: 'fortress',
        action: 'shred_file',
        category: 'security',
        status: res.success ? 'success' : 'failure',
        details: `DoD 5220.22-M 7-pass shred: ${selectedFile.name}`,
        metadata: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          passes: res.passes ?? 7,
          error: res.error,
        },
      })
    } catch (err: any) {
      showToastError('Hata', err.message || 'Bilinmeyen hata.')
      logActivity({
        toolId: 'fortress',
        action: 'shred_file',
        category: 'security',
        status: 'failure',
        details: `Shred failed for ${selectedFile.name}: ${err.message}`,
        metadata: {
          fileName: selectedFile.name,
          error: err.message,
        },
      })
    } finally {
      setIsShredding(false)
    }
  }

  // Execute Vault (Encrypt / Decrypt)
  const handleExecuteVault = async () => {
    if (!vaultFile || !passphrase || isVaultProcessing) return
    setIsVaultProcessing(true)

    try {
      if (vaultAction === 'encrypt') {
        const res = await nexusAPI.fortress.encryptFile({
          filePath: vaultFile.filePath,
          passphrase,
        })
        if (res.success) {
          showToastSuccess(t('fortress.toastEncryptSuccess'), t('fortress.toastEncryptSuccessDesc', { name: res.name || '' }))
          setVaultFile(null)
          setPassphrase('')
        } else {
          showToastError('Şifreleme Hatası', res.error || 'İşlem başarısız.')
        }

        logActivity({
          toolId: 'fortress',
          action: 'encrypt_vault',
          category: 'security',
          status: res.success ? 'success' : 'failure',
          details: `AES-256-GCM encrypted vault: ${vaultFile.name}`,
          metadata: {
            fileName: vaultFile.name,
            fileSize: vaultFile.size,
            outPath: res.outPath,
            error: res.error,
          },
        })
      } else {
        const res = await nexusAPI.fortress.decryptFile({
          filePath: vaultFile.filePath,
          passphrase,
        })
        if (res.success) {
          showToastSuccess(t('fortress.toastDecryptSuccess'), t('fortress.toastDecryptSuccessDesc', { name: res.name || '' }))
          setVaultFile(null)
          setPassphrase('')
        } else {
          showToastError('Şifre Çözme Hatası', res.error || t('fortress.toastPassError'))
        }

        logActivity({
          toolId: 'fortress',
          action: 'decrypt_vault',
          category: 'security',
          status: res.success ? 'success' : 'failure',
          details: `AES-256-GCM decrypted vault: ${vaultFile.name}`,
          metadata: {
            fileName: vaultFile.name,
            fileSize: vaultFile.size,
            outPath: res.outPath,
            error: res.error,
          },
        })
      }
    } catch (err: any) {
      showToastError('Hata', err.message || 'Bilinmeyen hata.')
      logActivity({
        toolId: 'fortress',
        action: vaultAction === 'encrypt' ? 'encrypt_vault' : 'decrypt_vault',
        category: 'security',
        status: 'failure',
        details: `Vault operation failed for ${vaultFile.name}: ${err.message}`,
        metadata: {
          fileName: vaultFile.name,
          error: err.message,
        },
      })
    } finally {
      setIsVaultProcessing(false)
    }
  }

  return (
    <BaseToolTemplate
      icon={ShieldAlert}
      title={t('fortress.title')}
      description={t('fortress.description')}
      gradient="from-rose-500 to-amber-600"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-nexus-card rounded-xl border border-nexus-border/50 max-w-lg">
          <button
            onClick={() => setActiveTab('shredder')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'shredder'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('fortress.tabShredder')}</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('fortress.tabVault')}</span>
          </button>

          <button
            onClick={() => setActiveTab('stego')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'stego'
                ? 'bg-nexus-cyan text-black shadow-lg shadow-nexus-cyan/25'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('fortress.tabStego')}</span>
          </button>
        </div>

        {/* ─── TAB 1: DoD 7-PASS FILE SHREDDER ─── */}
        {activeTab === 'shredder' && (
          <div className="space-y-5">
            <div className="glass-card p-6 border-rose-500/20 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">
                  {t('fortress.shredStandard')}
                </h3>
              </div>
              <p className="text-xs text-nexus-muted leading-relaxed">
                {t('fortress.shredStandardDesc')}
              </p>

              {/* File Select */}
              <div className="p-4 rounded-xl bg-nexus-bg/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">
                    {t('fortress.targetFile')}
                  </p>
                  <p className="text-xs font-mono text-white truncate mt-1">
                    {selectedFile ? selectedFile.filePath : t('fortress.noFileSelected')}
                  </p>
                </div>
                <button
                  onClick={handleSelectShredFile}
                  className="px-4 py-2 rounded-xl bg-nexus-card hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('fortress.selectFile')}</span>
                </button>
              </div>

              {/* Confirmation Checkbox */}
              {selectedFile && (
                <div className="space-y-4 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <input
                      type="checkbox"
                      checked={shredConfirm}
                      onChange={(e) => setShredConfirm(e.target.checked)}
                      className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-rose-300">
                      {t('fortress.confirmShred')}
                    </span>
                  </label>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleExecuteShred}
                    disabled={!shredConfirm || isShredding}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {isShredding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('fortress.shredding')}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>{t('fortress.shredBtn')}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: AES-256-GCM VAULT (.nexusvault) ─── */}
        {activeTab === 'vault' && (
          <div className="space-y-5">
            <div className="glass-card p-6 border-amber-500/20 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">
                  {t('fortress.vaultTitle')}
                </h3>
              </div>
              <p className="text-xs text-nexus-muted leading-relaxed">
                {t('fortress.vaultDesc')}
              </p>

              {/* Action Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setVaultAction('encrypt')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    vaultAction === 'encrypt'
                      ? 'bg-amber-500 text-black border-amber-500 font-bold'
                      : 'bg-nexus-card border-white/5 text-nexus-muted'
                  }`}
                >
                  {t('fortress.encryptMode')}
                </button>
                <button
                  onClick={() => setVaultAction('decrypt')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    vaultAction === 'decrypt'
                      ? 'bg-nexus-cyan text-black border-nexus-cyan font-bold'
                      : 'bg-nexus-card border-white/5 text-nexus-muted'
                  }`}
                >
                  {t('fortress.decryptMode')}
                </button>
              </div>

              {/* File Select */}
              <div className="p-4 rounded-xl bg-nexus-bg/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">
                    {vaultAction === 'encrypt' ? t('fortress.fileToEncrypt') : t('fortress.vaultToDecrypt')}
                  </p>
                  <p className="text-xs font-mono text-white truncate mt-1">
                    {vaultFile ? vaultFile.filePath : t('fortress.noFileSelected')}
                  </p>
                </div>
                <button
                  onClick={handleSelectVaultFile}
                  className="px-4 py-2 rounded-xl bg-nexus-card hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('fortress.selectFile')}</span>
                </button>
              </div>

              {/* Passphrase Input */}
              {vaultFile && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-nexus-text flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('fortress.passphraseLabel')}</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={t('fortress.passphrasePlaceholder')}
                        className="w-full bg-nexus-bg border border-nexus-border rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-500 transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white cursor-pointer"
                      >
                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleExecuteVault}
                    disabled={!passphrase || isVaultProcessing}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      vaultAction === 'encrypt'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-amber-500/25'
                        : 'bg-gradient-to-r from-nexus-cyan to-teal-500 text-black shadow-nexus-cyan/25'
                    } disabled:opacity-50`}
                  >
                    {isVaultProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : vaultAction === 'encrypt' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    <span>
                      {isVaultProcessing
                        ? t('fortress.processing')
                        : vaultAction === 'encrypt'
                        ? t('fortress.encryptBtn')
                        : t('fortress.decryptBtn')}
                    </span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: DIGITAL STEGANOGRAPHY STUDIO ─── */}
        {activeTab === 'stego' && (
          <div className="space-y-5">
            <div className="glass-card p-6 border-nexus-cyan/20 space-y-5">
              <div className="flex items-center gap-3 text-nexus-cyan">
                <Eye className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-white text-sm">{t('fortress.stegoTitle')}</h3>
                  <p className="text-xs text-nexus-muted mt-0.5">
                    {t('fortress.stegoDesc')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Encode Side */}
                <div className="bg-nexus-bg/60 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-nexus-cyan" /> {t('fortress.stegoEncode')}
                  </h4>
                  <input
                    type="file"
                    accept="image/png"
                    id="stego-encode-input"
                    className="text-xs text-nexus-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-nexus-card file:text-white hover:file:bg-white/10 cursor-pointer"
                  />
                  <textarea
                    rows={4}
                    value={stegoSecretText}
                    onChange={(e) => setStegoSecretText(e.target.value)}
                    placeholder={t('fortress.stegoPlaceholder')}
                    className="w-full bg-nexus-surface border border-nexus-border rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-nexus-cyan resize-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('stego-encode-input') as HTMLInputElement
                      const file = input?.files?.[0]
                      if (!file || !stegoSecretText.trim()) {
                        showToastError('Görsel ve Mesaj Gerekli', 'Lütfen bir PNG görseli ve gizlenecek bir mesaj girin.')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        const img = new Image()
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          canvas.width = img.width
                          canvas.height = img.height
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          ctx.drawImage(img, 0, 0)
                          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                          const data = imgData.data

                          // Header prefix: 4 bytes length
                          const textBytes = new TextEncoder().encode(stegoSecretText)
                          const totalBits = textBytes.length * 8
                          if (totalBits + 32 > data.length / 4) {
                            showToastError('Kapasite Yetersiz', 'Görsel bu mesajı barındırmak için çok küçük!')
                            return
                          }

                          // Embed 32-bit length in first 32 pixels red channel LSB
                          const len = textBytes.length
                          for (let i = 0; i < 32; i++) {
                            const bit = (len >> (31 - i)) & 1
                            data[i * 4] = (data[i * 4] & 0xfe) | bit
                          }

                          // Embed text bytes
                          let bitIdx = 0
                          for (let i = 0; i < textBytes.length; i++) {
                            const byte = textBytes[i]
                            for (let b = 7; b >= 0; b--) {
                              const bit = (byte >> b) & 1
                              const pixelIdx = 32 + bitIdx
                              data[pixelIdx * 4] = (data[pixelIdx * 4] & 0xfe) | bit
                              bitIdx++
                            }
                          }

                          ctx.putImageData(imgData, 0, 0)
                          canvas.toBlob((blob) => {
                            if (!blob) return
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `stego_secret_${Date.now()}.png`
                            a.click()
                            URL.revokeObjectURL(url)
                            showToastSuccess('Steganografi Başarılı', 'Gizli mesaj başarıyla PNG görseline gömüldü ve indirildi!')
                          }, 'image/png')
                        }
                        img.src = e.target?.result as string
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="w-full py-2.5 rounded-xl bg-nexus-cyan text-black font-bold text-xs hover:bg-nexus-cyan/90 transition-all shadow-lg shadow-nexus-cyan/20 active:scale-95 cursor-pointer"
                  >
                    {t('fortress.stegoEmbedBtn')}
                  </button>
                </div>

                {/* Decode Side */}
                <div className="bg-nexus-bg/60 p-4 rounded-xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t('fortress.stegoDecode')}
                  </h4>
                  <input
                    type="file"
                    accept="image/png"
                    id="stego-decode-input"
                    className="text-xs text-nexus-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-nexus-card file:text-white hover:file:bg-white/10 cursor-pointer"
                  />
                  <div className="h-28 bg-nexus-surface border border-nexus-border rounded-xl p-2.5 overflow-y-auto text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {stegoResult || t('fortress.stegoDecodePlaceholder')}
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById('stego-decode-input') as HTMLInputElement
                      const file = input?.files?.[0]
                      if (!file) {
                        showToastError('Görsel Eksik', 'Lütfen şifreli PNG görselini seçin.')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        const img = new Image()
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          canvas.width = img.width
                          canvas.height = img.height
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          ctx.drawImage(img, 0, 0)
                          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

                          // Extract 32-bit length
                          let len = 0
                          for (let i = 0; i < 32; i++) {
                            const bit = data[i * 4] & 1
                            len = (len << 1) | bit
                          }

                          if (len <= 0 || len > 50000 || (32 + len * 8) > data.length / 4) {
                            setStegoResult('Bu görselde gizlenmiş geçerli bir ZenDev mesajı bulunamadı veya boyutu aşıyor.')
                            return
                          }

                          // Extract bytes
                          const bytes = new Uint8Array(len)
                          let bitIdx = 0
                          for (let i = 0; i < len; i++) {
                            let byte = 0
                            for (let b = 0; b < 8; b++) {
                              const pixelIdx = 32 + bitIdx
                              const bit = data[pixelIdx * 4] & 1
                              byte = (byte << 1) | bit
                              bitIdx++
                            }
                            bytes[i] = byte
                          }

                          try {
                            const decoded = new TextDecoder().decode(bytes)
                            setStegoResult(decoded)
                          } catch {
                            setStegoResult('Veri çözümlenemedi (Bozulmuş karakterler).')
                          }
                        }
                        img.src = e.target?.result as string
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    {t('fortress.stegoDecodeBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
