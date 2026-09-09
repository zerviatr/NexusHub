import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Key, Shield, LogOut, Clock, Infinity, RefreshCw, Check, Download, AlertCircle, Sparkles } from 'lucide-react'
import { useLicense } from '../lib/LicenseContext'
import { useT } from '../lib/i18n'

export default function Account() {
  const { tier, key, expiresAt, deactivate } = useLicense()
  const { t, locale, setLocale } = useT()

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'ready' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; current?: string; message?: string }>({})
  const [downloadPercent, setDownloadPercent] = useState<number>(0)

  useEffect(() => {
    window.nexusAPI?.getVersion?.().then((ver: string) => {
      if (ver) {
        setUpdateInfo((prev) => ({ ...prev, current: ver.startsWith('v') ? ver : `v${ver}` }))
      }
    })

    const unbindAvailable = window.nexusAPI?.updater?.onAvailable?.((info: any) => {
      setUpdateStatus('available')
      setUpdateInfo((prev) => ({ ...prev, version: info?.version ? (String(info.version).startsWith('v') ? info.version : `v${info.version}`) : undefined }))
    })
    const unbindProgress = window.nexusAPI?.updater?.onProgress?.((prog: any) => {
      setUpdateStatus('available')
      if (typeof prog?.percent === 'number') {
        setDownloadPercent(Math.round(prog.percent))
      }
    })
    const unbindNotAvailable = window.nexusAPI?.updater?.onNotAvailable?.((info: any) => {
      setUpdateStatus('latest')
      setUpdateInfo((prev) => ({ ...prev, current: info?.version ? (String(info.version).startsWith('v') ? info.version : `v${info.version}`) : (prev.current || 'v1.0.2') }))
    })
    const unbindDownloaded = window.nexusAPI?.updater?.onDownloaded?.((info: any) => {
      setUpdateStatus('ready')
      setDownloadPercent(100)
      setUpdateInfo((prev) => ({ ...prev, version: info?.version ? (String(info.version).startsWith('v') ? info.version : `v${info.version}`) : undefined }))
    })
    const sanitizeMsg = (msg?: string) => {
      const lower = String(msg || '').toLowerCase()
      if (
        lower.includes('latest.yml') ||
        lower.includes('404') ||
        lower.includes('httperror') ||
        lower.includes('enotfound') ||
        lower.includes('econnrefused') ||
        lower.includes('network')
      ) {
        return 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor. En kısa sürede çözülecektir.'
      }
      return msg || 'Sunucuya bağlantı kurulamadı, en kısa sürede çözülecektir.'
    }

    const unbindError = window.nexusAPI?.updater?.onError?.((err: string) => {
      setUpdateStatus('error')
      setUpdateInfo({ message: sanitizeMsg(err) })
    })
    return () => {
      unbindAvailable?.()
      unbindProgress?.()
      unbindNotAvailable?.()
      unbindDownloaded?.()
      unbindError?.()
    }
  }, [])

  const handleCheckUpdates = async () => {
    if (updateStatus === 'checking') return
    setUpdateStatus('checking')
    setDownloadPercent(0)
    try {
      const res = await window.nexusAPI?.updater?.checkNow?.()
      const cur = res?.currentVersion ? (res.currentVersion.startsWith('v') ? res.currentVersion : `v${res.currentVersion}`) : 'v1.0.2'
      const upd = res?.updateVersion ? (res.updateVersion.startsWith('v') ? res.updateVersion : `v${res.updateVersion}`) : undefined

      if (res?.error) {
        const lower = String(res.error).toLowerCase()
        const friendly =
          lower.includes('latest.yml') || lower.includes('404') || lower.includes('httperror') || lower.includes('enotfound')
            ? 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor. En kısa sürede çözülecektir.'
            : res.error
        setUpdateStatus('error')
        setUpdateInfo({ message: friendly, current: cur })
      } else if (res?.hasUpdate) {
        setUpdateStatus('available')
        setUpdateInfo({ version: upd, current: cur })
      } else if (res?.isLatest) {
        setUpdateStatus('latest')
        setUpdateInfo({ current: cur })
      } else {
        setUpdateStatus('latest')
        setUpdateInfo({ current: cur })
      }
    } catch (err: any) {
      setUpdateStatus('error')
      setUpdateInfo({ message: 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda derleniyor. En kısa sürede çözülecektir.', current: 'v1.0.2' })
    }
  }

  // Mask the key except for the last 5 characters
  const maskedKey = key
    ? key.substring(0, key.length - 5).replace(/[A-Z0-9]/g, '•') + key.substring(key.length - 5)
    : '••••••••••••••••••••••••'

  const tierLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
    lifetime: t('account.lifetime') || 'Lifetime',
  }

  const formatExpiry = (ms: number | null) => {
    if (!ms) return t('account.neverExpires')
    const date = new Date(ms)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleDeactivate = async () => {
    // In a real app, you might want to show a confirmation dialog first
    if (confirm(t('account.deactivateConfirm') || 'Are you sure you want to deactivate?')) {
      await deactivate()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-nexus-surface border border-nexus-border flex items-center justify-center shadow-lg">
          <Settings className="w-5 h-5 text-nexus-cyan" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('account.title') || 'Account Settings'}</h1>
          <p className="text-nexus-muted text-sm">{t('account.subtitle') || 'Manage your license and application settings'}</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setLocale('en')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'en' ? 'bg-nexus-cyan/20 text-white border border-nexus-cyan/30' : 'bg-nexus-surface border border-nexus-border text-nexus-muted hover:text-white'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale('tr')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'tr' ? 'bg-nexus-cyan/20 text-white border border-nexus-cyan/30' : 'bg-nexus-surface border border-nexus-border text-nexus-muted hover:text-white'}`}
          >
            TR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-nexus-accent" />
              <h2 className="text-lg font-medium">{t('account.licenseStatus') || 'License Status'}</h2>
            </div>
            <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-semibold tracking-wider uppercase">
              {t('account.active') || 'Active'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-nexus-muted uppercase tracking-widest mb-1">{t('account.currentTier') || 'Current Tier'}</p>
              <p className="text-xl font-semibold text-white">{tier ? tierLabels[tier] || tier : 'Unknown'}</p>
            </div>
            
            <div>
              <p className="text-xs text-nexus-muted uppercase tracking-widest mb-1">{t('account.licenseKey') || 'License Key'}</p>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-nexus-muted" />
                <code className="text-sm font-mono text-nexus-cyan bg-nexus-cyan/10 px-2 py-1 rounded">{maskedKey}</code>
              </div>
            </div>

            <div>
              <p className="text-xs text-nexus-muted uppercase tracking-widest mb-1">{t('account.validUntil') || 'Valid Until'}</p>
              <div className="flex items-center gap-2">
                {expiresAt === 0 || !expiresAt ? (
                  <Infinity className="w-4 h-4 text-nexus-muted" />
                ) : (
                  <Clock className="w-4 h-4 text-nexus-muted" />
                )}
                <span className="text-sm text-nexus-text">
                  {expiresAt === 0 ? t('account.lifetime') || 'Lifetime' : formatExpiry(expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Desktop Integration & Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="glass-card p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-nexus-cyan" />
                <h2 className="text-lg font-medium">{t('account.desktop.title') || 'Desktop Integration'}</h2>
              </div>
              <span className="px-3 py-1 bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/20 rounded-full text-xs font-semibold tracking-wider uppercase">
                {t('account.desktop.trayActive') || 'Tray Active'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Windows Startup Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-nexus-surface/60 border border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">{t('account.desktop.autoLaunch') || 'Launch on Startup'}</p>
                  <p className="text-xs text-nexus-muted mt-0.5">{t('account.desktop.autoLaunchDesc') || 'Silently starts in system tray on boot'}</p>
                </div>
                <input
                  type="checkbox"
                  id="autoLaunchToggle"
                  onChange={async (e) => {
                    const checked = e.target.checked
                    await window.nexusAPI?.settings?.setAutoLaunch?.(checked)
                  }}
                  className="w-4 h-4 rounded border-nexus-border/40 text-nexus-cyan focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Global Hotkeys Info */}
              <div className="p-3 rounded-xl bg-nexus-surface/60 border border-white/5 space-y-2">
                <p className="text-xs font-semibold text-nexus-muted uppercase tracking-wider">{t('account.desktop.hotkeys') || 'System Hotkeys'}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-nexus-text">Clipboard Summon:</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-nexus-cyan text-[11px]">
                    Ctrl + Shift + V
                  </kbd>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-nexus-text">Command Palette:</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-nexus-cyan text-[11px]">
                    Ctrl + Shift + K
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Check for Updates Action */}
          <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">NexusHub {updateInfo.current || 'v1.0.0'}</span>
                <p className="text-[11px] text-nexus-muted">
                  {updateStatus === 'idle' && (t('account.desktop.autoUpdatesActive') || 'Otomatik güncellemeler devrede')}
                  {updateStatus === 'checking' && (t('account.desktop.checkingUpdate') || 'GitHub sürümleri taranıyor...')}
                  {updateStatus === 'latest' && (t('account.desktop.allUpToDate') || 'En son kararlı sürümü kullanıyorsunuz')}
                  {updateStatus === 'available' && (t('account.desktop.updateFound') || 'Yeni sürüm mevcut')}
                  {updateStatus === 'ready' && (t('account.desktop.updateReadyDesc') || 'Yüklemeye hazır')}
                  {updateStatus === 'error' && (t('account.desktop.updateErrorDesc') || 'Sürüm sunucusuna erişilemedi')}
                </p>
              </div>

              <button
                type="button"
                disabled={updateStatus === 'checking'}
                onClick={handleCheckUpdates}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all hover:border-nexus-cyan/40 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin text-nexus-cyan' : ''}`} />
                {t('account.desktop.checkUpdates') || 'Güncellemeleri Denetle'}
              </button>
            </div>

            {/* Status Badges */}
            {updateStatus === 'latest' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('account.desktop.latestMsg') || '✓ Program güncel! Kurulu sürüm:'} {updateInfo.current || 'v1.0.0'}</span>
              </div>
            )}

            {updateStatus === 'available' && (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-sky-400 shrink-0 animate-bounce" />
                    <span>{t('account.desktop.newVersionDownloading') || 'Yeni sürüm bulundu:'} {updateInfo.version || ''}</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold">{downloadPercent > 0 ? `%${downloadPercent}` : (t('account.desktop.downloading') || 'İndiriliyor...')}</span>
                </div>
                {downloadPercent > 0 && (
                  <div className="w-full bg-sky-950/60 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-sky-400 h-full rounded-full transition-all duration-300" style={{ width: `${downloadPercent}%` }} />
                  </div>
                )}
              </div>
            )}

            {updateStatus === 'ready' && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-white text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-nexus-cyan shrink-0" />
                  <span>{t('account.desktop.updateReady') || 'Güncelleme hazır!'} {updateInfo.version}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    const btn = e.currentTarget
                    btn.disabled = true
                    btn.innerText = 'Yeniden Başlatılıyor...'
                    window.nexusAPI?.updater?.installNow?.()
                  }}
                  className="px-3 py-1 rounded bg-nexus-cyan text-black font-semibold hover:bg-nexus-cyan/90 transition-all text-xs active:scale-95 cursor-pointer"
                >
                  {t('account.desktop.restartInstall') || 'Yeniden Başlat & Kur'}
                </button>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{updateInfo.message || t('account.desktop.offlineWarning') || 'GitHub sürüm kontrolü yapılamadı.'}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* UX & System Preferences + Backup/Restore */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="glass-card p-6 border-nexus-border/40 mt-8 space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-nexus-border/30">
          <div>
            <h3 className="font-semibold text-nexus-text text-sm">Siber Haptik & Ses Efektleri (Audio SFX)</h3>
            <p className="text-xs text-nexus-muted mt-0.5">Tıklama, kopyalama ve işlem bildirimleri için hafif mekanik sesler</p>
          </div>
          <button
            onClick={() => {
              const current = cyberAudio.isEnabled()
              cyberAudio.setEnabled(!current)
              if (!current) cyberAudio.copySuccess()
              // force re-render
              setUpdateStatus((s) => s)
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              cyberAudio.isEnabled()
                ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20'
                : 'bg-nexus-bg text-nexus-muted border border-nexus-border'
            }`}
          >
            {cyberAudio.isEnabled() ? 'SESLER AÇIK' : 'SESSİZ MOD'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-nexus-text text-sm">Veri ve Ayar Yedekleme (Backup & Restore)</h3>
            <p className="text-xs text-nexus-muted mt-0.5">Tüm yerel ayarları, geçmişi ve tercihleri tek tıkla dışa/içe aktar</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const dump: Record<string, any> = {}
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i)
                  if (k) dump[k] = localStorage.getItem(k)
                }
                const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `nexushub_config_backup_${Date.now()}.nexusbackup`
                a.click()
                URL.revokeObjectURL(url)
                cyberAudio.copySuccess()
              }}
              className="px-3.5 py-2 rounded-xl bg-nexus-bg hover:bg-nexus-surface border border-nexus-border text-xs font-mono text-nexus-text transition-colors"
            >
              Yedek İndir (.nexusbackup)
            </button>

            <label className="px-3.5 py-2 rounded-xl bg-nexus-accent/10 hover:bg-nexus-accent/20 border border-nexus-accent/30 text-xs font-mono text-nexus-accent transition-colors cursor-pointer">
              Yedeği Geri Yükle
              <input
                type="file"
                accept=".json,.nexusbackup"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string)
                      Object.keys(data).forEach((k) => localStorage.setItem(k, data[k]))
                      cyberAudio.copySuccess()
                      alert('NexusHub yapılandırması başarıyla geri yüklendi! Sayfa yenileniyor.')
                      window.location.reload()
                    } catch {
                      alert('Geçersiz yedekleme dosyası!')
                    }
                  }
                  reader.readAsText(file)
                }}
              />
            </label>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-card p-6 border-red-500/20 bg-red-500/5 mt-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-red-400 font-medium mb-1">{t('account.dangerZone') || 'Danger Zone'}</h3>
            <p className="text-sm text-nexus-muted">{t('account.deactivateDesc') || 'Deactivating will log you out and require a license key to use the app again.'}</p>
          </div>
          <button
            onClick={handleDeactivate}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('account.deactivateBtn') || 'Deactivate License'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
