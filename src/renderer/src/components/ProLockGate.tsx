// Copyright 2025 Lee Boonstra
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles, Key, ExternalLink, Check, Zap } from 'lucide-react'
import { useT } from '../lib/i18n'

interface ProLockGateProps {
  toolName: string
  toolDesc: string
}

export default function ProLockGate({ toolName, toolDesc }: ProLockGateProps) {
  const navigate = useNavigate()
  const { locale } = useT()
  const isTr = locale === 'tr'

  const handleBuy = () => {
    const storeUrl = (import.meta as any).env?.VITE_STORE_URL || 'https://zendev-production-4a5b.up.railway.app#pricing'
    window.nexusAPI?.openExternal(storeUrl)
  }

  const perks = isTr ? [
    '27+ Geliştirici ve Siber Güvenlik Aracının Tamamı',
    'ApiStudio, JwtStudio, ResourceSentinel & PdfStudio',
    'Sürekli Yeni Araç Güncellemeleri & Eklenti Paketleri',
    '2 Kişisel Bilgisayarda Eşzamanlı Kullanım',
    'Taahhütsüz İstediğin Zaman Tek Tıkla İptal'
  ] : [
    'Complete access to all 27+ developer & cyber tools',
    'Unlocked ApiStudio, JwtStudio, ResourceSentinel & PdfStudio',
    'Continuous tool updates & automatic feature drops',
    'Activate on 2 personal machines simultaneously',
    'Cancel anytime with zero long-term commitment'
  ]

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel p-8 rounded-3xl border border-nexus-accent/40 shadow-2xl relative overflow-hidden text-center bg-nexus-surface/95 backdrop-blur-xl"
      >
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-nexus-accent/20 via-nexus-cyan/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nexus-accent/30 via-nexus-cyan/20 to-purple-500/10 border border-nexus-accent/50 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-nexus-accent/25">
          <Sparkles className="w-8 h-8 text-nexus-cyan animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase mb-4">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{isTr ? 'ZenDev Pro SaaS Özel' : 'ZenDev Pro SaaS Exclusive'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-heading">{toolName}</h2>
        <p className="text-sm text-nexus-muted max-w-lg mx-auto mb-6 leading-relaxed">
          {toolDesc}
        </p>

        {/* Perks Box */}
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mb-7 text-left max-w-md mx-auto space-y-2">
          <div className="text-[11px] font-mono font-bold text-nexus-cyan uppercase tracking-wider mb-2">
            {isTr ? 'Pro Abonelikle Açılan Özellikler:' : 'Unlocked with Pro Subscription:'}
          </div>
          {perks.map((perk, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-nexus-text">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Pricing Highlight Pill */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-nexus-cyan/15 to-nexus-accent/15 border border-nexus-cyan/30 text-xs font-mono">
          <span className="text-nexus-muted">{isTr ? 'Aylık:' : 'Monthly:'}</span>
          <span className="text-white font-bold text-sm">{isTr ? '149 ₺ / ay' : '$9.99 / mo'}</span>
          <span className="text-emerald-400 font-semibold text-[11px]">{isTr ? '(Yıllık 99 ₺/ay)' : '(Annual $6.58/mo)'}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nexus-surface hover:bg-white/10 border border-white/15 text-nexus-text font-semibold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Key className="w-4 h-4 text-nexus-cyan" />
            <span>{isTr ? 'Lisans Anahtarı Gir' : 'Enter License Key'}</span>
          </button>

          <button
            type="button"
            onClick={handleBuy}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-nexus-cyan via-sky-400 to-nexus-accent text-nexus-bg font-bold text-xs shadow-lg shadow-nexus-cyan/20 hover:brightness-110 transition-all active:scale-95 cursor-pointer"
          >
            <span>{isTr ? 'Pro\'ya Abone Ol' : 'Subscribe to Pro'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-nexus-muted/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isTr ? '30 Gün Koşulsuz Para İade Garantisi' : '30-Day Money-Back Guarantee'}</span>
        </div>
      </motion.div>
    </div>
  )
}
