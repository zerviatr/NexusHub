import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Globe, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useT } from '../lib/i18n'

interface OnboardingTourProps {
  onComplete: () => void
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { t, locale, setLocale } = useT()
  const [step, setStep] = useState(1)

  const nextStep = () => setStep(s => s + 1)
  const finish = () => onComplete()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md bg-nexus-surface border border-nexus-border rounded-2xl shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-nexus-accent/10 border border-nexus-accent/30 rounded-2xl flex items-center justify-center mb-6 glow-accent">
              <Sparkles className="w-8 h-8 text-nexus-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t('tour.welcome.title') || 'Welcome to NexusHub'}</h2>
            <p className="text-nexus-muted mb-8 leading-relaxed">
              {t('tour.welcome.desc') || 'Your premium multi-tool suite is ready. Let\'s do a quick setup before you get started.'}
            </p>
            <button
              onClick={nextStep}
              className="w-full flex items-center justify-center gap-2 py-3 bg-nexus-accent hover:bg-nexus-accent-hover text-white rounded-xl font-medium transition-colors"
            >
              {t('tour.next') || 'Continue'} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="w-full max-w-md bg-nexus-surface border border-nexus-border rounded-2xl shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-nexus-cyan/10 border border-nexus-cyan/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <Globe className="w-8 h-8 text-nexus-cyan" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t('tour.lang.title') || 'Select Language'}</h2>
            <p className="text-nexus-muted mb-8">
              {t('tour.lang.desc') || 'Choose your preferred interface language. You can change this later in Account Settings.'}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setLocale('en')}
                className={`py-4 rounded-xl border transition-all ${locale === 'en' ? 'bg-nexus-cyan/20 border-nexus-cyan text-white' : 'bg-nexus-bg border-nexus-border text-nexus-muted hover:border-nexus-cyan/50'}`}
              >
                English
              </button>
              <button
                onClick={() => setLocale('tr')}
                className={`py-4 rounded-xl border transition-all ${locale === 'tr' ? 'bg-nexus-cyan/20 border-nexus-cyan text-white' : 'bg-nexus-bg border-nexus-border text-nexus-muted hover:border-nexus-cyan/50'}`}
              >
                Türkçe
              </button>
            </div>

            <button
              onClick={finish}
              className="w-full flex items-center justify-center gap-2 py-3 bg-nexus-cyan hover:bg-nexus-cyan/80 text-nexus-bg rounded-xl font-bold transition-colors"
            >
              <CheckCircle2 className="w-5 h-5" />
              {t('tour.finish') || 'Get Started'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
