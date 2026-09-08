import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Key, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import TitleBar from '../components/TitleBar'
import { useLicense } from '../lib/LicenseContext'

interface ActivationProps {
  onContinueFree?: () => void
}

export default function Activation({ onContinueFree }: ActivationProps) {
  const { activate, status } = useLicense()
  const [key, setKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) {
      setError('Please enter a license key.')
      return
    }

    setIsLoading(true)
    setError(null)

    const res = await activate(key)
    if (!res.success) {
      setError(res.reason || 'Invalid license key.')
    }
    
    setIsLoading(false)
  }

  const handlePurchase = () => {
    const storeUrl = (import.meta as any).env?.VITE_STORE_URL || 'https://github.com/zerviatr/NexusHub#get-license'
    window.nexusAPI.openExternal(storeUrl)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-nexus-bg text-nexus-text">
      <TitleBar />

      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-nexus-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-nexus-surface/50 border border-nexus-surface-light/20 backdrop-blur-xl rounded-2xl shadow-2xl p-8"
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-nexus-accent/10 border border-nexus-accent/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Shield className="w-8 h-8 text-nexus-accent" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Activate NexusHub</h1>
            <p className="text-sm text-nexus-text-muted">
              {status === 'expired' 
                ? 'Your license has expired. Please enter a new key to continue using NexusHub.'
                : 'Enter your license key to unlock the premium multi-tool suite.'}
            </p>
          </div>

          <form onSubmit={handleActivate} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="licenseKey" className="text-sm font-medium text-nexus-text-muted ml-1">
                License Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-nexus-text-muted group-focus-within:text-nexus-accent transition-colors">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="licenseKey"
                  type="text"
                  placeholder="NEXUS-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  className="w-full bg-nexus-bg/50 border border-nexus-surface-light/30 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 focus:border-nexus-accent/50 transition-all font-mono text-sm placeholder:text-nexus-surface-light"
                  disabled={isLoading}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading || !key.trim()}
              className="w-full relative group overflow-hidden bg-nexus-accent hover:bg-nexus-accent-hover text-white py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
            >
              <span className="flex items-center justify-center gap-2 relative z-10">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate License'
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-nexus-surface-light/20 flex flex-col items-center gap-4">
            <p className="text-sm text-nexus-text-muted">Don't have a license key yet?</p>
            <button
              onClick={handlePurchase}
              className="flex items-center gap-2 text-sm text-nexus-cyan hover:text-nexus-cyan/80 transition-colors group"
            >
              Purchase a license <ExternalLink className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {onContinueFree && (
              <button
                type="button"
                onClick={onContinueFree}
                className="text-xs text-nexus-muted hover:text-nexus-cyan transition-colors underline pt-1"
              >
                Or continue with Free Community Edition →
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
