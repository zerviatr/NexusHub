import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle2 } from 'lucide-react'
import { useT } from '../lib/i18n'

interface EulaGateProps {
  onAccept: () => void
}

export default function EulaGate({ onAccept }: EulaGateProps) {
  const { t, locale, setLocale } = useT()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!contentRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    // Add a small 10px threshold to account for rounding errors
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      setHasScrolledToBottom(true)
    }
  }

  // Check if content is short enough that scrolling isn't needed
  useEffect(() => {
    if (contentRef.current) {
      const { scrollHeight, clientHeight } = contentRef.current
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true)
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen bg-nexus-bg text-nexus-text">
      <div className="flex-1 flex items-center justify-center relative p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl flex flex-col max-h-[85vh] bg-nexus-surface/50 border border-nexus-surface-light/20 backdrop-blur-xl rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-nexus-surface-light/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-nexus-accent/10 border border-nexus-accent/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-nexus-accent" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t('eula.title') || 'End User License Agreement'}</h1>
              <p className="text-sm text-nexus-text-muted">{t('eula.subtitle') || 'Please read and accept the terms to continue'}</p>
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

          {/* Scrollable EULA Content */}
          <div
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-8 space-y-6 text-sm text-nexus-muted leading-relaxed scroll-smooth"
          >
            <section>
              <h3 className="text-white font-semibold mb-2">{t('eula.s1.title') || '1. Terms of Use'}</h3>
              <p>{t('eula.s1.body') || 'By using NexusHub, you agree to these terms. This software is provided for legal, educational, and authorized security testing purposes only.'}</p>
            </section>
            
            <section>
              <h3 className="text-white font-semibold mb-2">{t('eula.s2.title') || '2. Privacy & Telemetry'}</h3>
              <p>{t('eula.s2.body') || 'NexusHub processes all data locally on your machine. We do not collect, transmit, or store your passwords, decrypted links, or generated data.'}</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">{t('eula.s3.title') || '3. Licensing & Restrictions'}</h3>
              <p>{t('eula.s3.body') || 'Your license is for personal or commercial use depending on your tier. You may not reverse engineer, redistribute, or resell the software.'}</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">{t('eula.s4.title') || '4. Disclaimer of Warranties'}</h3>
              <p>{t('eula.s4.body') || 'This software is provided "as is", without warranty of any kind. The authors shall not be liable for any damages arising from the use of this software.'}</p>
            </section>
            
            {/* Extra padding so users can clearly see they've reached the end */}
            <div className="h-12 flex items-end justify-center text-xs text-nexus-text-muted/50 italic">
              -- End of Agreement --
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-nexus-surface-light/20 bg-nexus-surface/30 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <p className={`text-sm transition-colors ${hasScrolledToBottom ? 'text-nexus-cyan' : 'text-nexus-text-muted'}`}>
                {hasScrolledToBottom 
                  ? t('eula.ready') || 'You can now accept the agreement.' 
                  : t('eula.scroll') || 'Please scroll to the bottom to accept.'}
              </p>
              
              <button
                onClick={onAccept}
                disabled={!hasScrolledToBottom}
                className="flex items-center gap-2 px-6 py-2.5 bg-nexus-accent hover:bg-nexus-accent-hover text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                {t('eula.accept') || 'I Agree'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
