import { motion } from 'framer-motion'
import { Settings, Key, Shield, LogOut, Clock, Infinity } from 'lucide-react'
import { useLicense } from '../lib/LicenseContext'
import { useT } from '../lib/i18n'

export default function Account() {
  const { tier, key, expiresAt, deactivate } = useLicense()
  const { t, locale, setLocale } = useT()

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
          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-nexus-muted">NexusHub v1.0.0</span>
            <button
              type="button"
              onClick={() => {
                window.nexusAPI?.updater?.checkNow?.()
                alert(t('account.desktop.checkingUpdate') || 'Checking GitHub releases for updates...')
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
            >
              {t('account.desktop.checkUpdates') || 'Check for Updates'}
            </button>
          </div>
        </motion.div>
      </div>

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
