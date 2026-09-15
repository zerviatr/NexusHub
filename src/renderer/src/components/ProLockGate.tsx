import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles, Key, ExternalLink, ArrowRight } from 'lucide-react'
import { useT } from '../lib/i18n'

interface ProLockGateProps {
  toolName: string
  toolDesc: string
}

export default function ProLockGate({ toolName, toolDesc }: ProLockGateProps) {
  const navigate = useNavigate()
  const { t } = useT()

  const handleBuy = () => {
    const storeUrl = (import.meta as any).env?.VITE_STORE_URL || 'https://zendev-production-4a5b.up.railway.app#pricing'
    window.nexusAPI?.openExternal(storeUrl)
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-8 rounded-3xl border border-nexus-accent/30 shadow-2xl relative overflow-hidden text-center bg-nexus-surface/90 backdrop-blur-xl"
      >
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-nexus-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nexus-accent/20 to-nexus-cyan/10 border border-nexus-accent/40 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-nexus-accent/20">
          <Sparkles className="w-8 h-8 text-nexus-accent" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Pro Tier Exclusive</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{toolName}</h2>
        <p className="text-sm text-nexus-muted max-w-md mx-auto mb-8 leading-relaxed">
          {toolDesc}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nexus-accent hover:bg-nexus-accent/90 text-white font-semibold text-xs shadow-lg shadow-nexus-accent/25 transition-all active:scale-95"
          >
            <Key className="w-4 h-4" />
            Enter License Key
          </button>

          <button
            type="button"
            onClick={handleBuy}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nexus-surface hover:bg-white/10 border border-white/10 text-nexus-text font-semibold text-xs transition-all active:scale-95"
          >
            <span>Get Pro Lifetime</span>
            <ExternalLink className="w-3.5 h-3.5 text-nexus-cyan" />
          </button>
        </div>

        <p className="text-[11px] text-nexus-muted/80 mt-6">
          Enjoy unlimited access to all 25+ tools, native clipboard watcher, and future cloud bridges.
        </p>
      </motion.div>
    </div>
  )
}
