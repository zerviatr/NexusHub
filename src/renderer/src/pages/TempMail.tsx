import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Copy,
  RefreshCw,
  Loader2,
  Inbox,
  Clock,
  Check,
  ChevronLeft,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, TempMailMessage, TempMailMessageDetails } from '../lib/ipc'
import { useT } from '../lib/i18n'

export default function TempMail() {
  const { t } = useT()
  const [email, setEmail] = useState<string | null>(null)
  const [messages, setMessages] = useState<TempMailMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Reading state
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [activeMessage, setActiveMessage] = useState<TempMailMessageDetails | null>(null)
  const [isReading, setIsReading] = useState(false)

  // Generate on mount if no email
  useEffect(() => {
    if (!email) handleGenerate()
  }, [])

  // Auto-refresh inbox every 5 seconds
  useEffect(() => {
    if (!email || activeMessageId) return
    const interval = setInterval(() => {
      handleCheck(true)
    }, 5000)
    return () => clearInterval(interval)
  }, [email, activeMessageId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setMessages([])
    setActiveMessage(null)
    setActiveMessageId(null)
    
    try {
      const res = await nexusAPI.tempMail.generate()
      if (res.success && res.email) {
        setEmail(res.email)
        // Initial check
        handleCheck()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCheck = async (silent = false) => {
    if (!email || isChecking) return
    if (!silent) setIsChecking(true)
    
    try {
      const res = await nexusAPI.tempMail.check(email)
      if (res.success && res.messages) {
        setMessages(res.messages)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setIsChecking(false)
    }
  }

  const handleRead = async (id: string) => {
    if (!email) return
    setActiveMessageId(id)
    setIsReading(true)
    
    try {
      const res = await nexusAPI.tempMail.read(email, id)
      if (res.success && res.message) {
        setActiveMessage(res.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsReading(false)
    }
  }

  const handleBack = () => {
    setActiveMessageId(null)
    setActiveMessage(null)
  }

  const handleCopy = async () => {
    if (!email) return
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <BaseToolTemplate
      icon={Mail}
      title={t('nav.tools.tempMail') || "TempMail Generator"}
      description={t('dashboard.tools.tempMail.desc') || "Instant disposable email addresses to bypass spam and tracking. Reads inbox in real-time."}
      gradient="from-nexus-cyan to-blue-500"
    >
      <div className="space-y-6">
        {/* ===== Header Controls ===== */}
        <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-semibold text-nexus-muted tracking-widest uppercase mb-2">
              Your Temporary Address
            </label>
            <div className="flex items-center gap-3 bg-nexus-bg/80 border border-nexus-border/50 rounded-xl p-2 pr-4 relative overflow-hidden group">
              {isGenerating && (
                <div className="absolute inset-0 bg-nexus-bg flex items-center justify-center z-10">
                  <Loader2 className="w-5 h-5 text-nexus-accent animate-spin" />
                </div>
              )}
              
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-nexus-accent/20 to-nexus-cyan/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-nexus-accent" />
              </div>
              
              <div className="flex-1 overflow-hidden">
                <p className="text-lg font-mono text-white truncate select-all">
                  {email || 'generating...'}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                disabled={!email || isGenerating}
                className="p-2 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-card transition-all"
                title="Copy Address"
              >
                {copied ? <Check className="w-5 h-5 text-nexus-success" /> : <Copy className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCheck(false)}
              disabled={!email || isChecking || !!activeMessageId}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-nexus-card text-white border border-nexus-border/50 hover:border-nexus-accent/50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-nexus-accent' : ''}`} />
              {t('tempMail.refresh') || 'Refresh'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-nexus-accent to-nexus-cyan text-white shadow-lg shadow-nexus-accent/20 disabled:opacity-50"
            >
              <span className="hidden sm:inline">{t('tempMail.generate') || 'Generate New Address'}</span>
            </motion.button>
          </div>
        </div>

        {/* ===== Main Content Area ===== */}
        <div className="glass-card min-h-[400px] overflow-hidden flex flex-col relative">
          <AnimatePresence mode="wait">
            
            {/* INBOX VIEW */}
            {!activeMessageId && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <div className="p-4 border-b border-nexus-border/30 bg-nexus-surface/30 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-nexus-cyan" />
                    Inbox
                    {messages.length > 0 && (
                      <span className="bg-nexus-cyan/20 text-nexus-cyan px-2 py-0.5 rounded-full text-xs ml-2">
                        {messages.length}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-nexus-muted">
                    {isChecking && !isGenerating && (
                      <span className="text-xs text-nexus-muted flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> {t('tempMail.checking') || 'Checking inbox...'}
                      </span>
                    )}
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nexus-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-nexus-success"></span>
                    </span>
                    Auto-refresh active
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-nexus-muted opacity-50 p-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-nexus-card border border-nexus-border/50 flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8" />
                      </div>
                      <p className="text-sm">{t('tempMail.empty') || 'Inbox is empty. Waiting for emails...'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-nexus-border/20">
                      {messages.map((msg, idx) => (
                        <motion.button
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleRead(msg.id)}
                          className="w-full text-left p-4 hover:bg-nexus-card/50 transition-colors group flex items-start gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-nexus-card border border-nexus-border/50 flex items-center justify-center flex-shrink-0 group-hover:border-nexus-accent/50 transition-colors">
                            <span className="text-white font-bold">{msg.from.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-white truncate pr-4">{msg.from}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-nexus-muted whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <p className="text-sm text-nexus-muted truncate group-hover:text-nexus-text transition-colors">
                              {msg.subject || '(No Subject)'}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* MESSAGE VIEW */}
            {activeMessageId && (
              <motion.div
                key="message"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col h-full absolute inset-0 bg-nexus-surface/95 backdrop-blur-md z-10"
              >
                {/* Message Header */}
                <div className="p-4 border-b border-nexus-border/30 bg-nexus-surface flex items-center gap-4 sticky top-0">
                  <motion.button
                    whileHover={{ x: -2 }}
                    onClick={() => setActiveMessageId(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-nexus-muted hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('tempMail.back') || 'Back to Inbox'}
                  </motion.button>
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isReading ? (
                    <div className="flex flex-col items-center justify-center h-full text-nexus-muted gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-nexus-accent" />
                      <p className="text-sm">Fetching message body...</p>
                    </div>
                  ) : activeMessage ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div className="flex items-center justify-between bg-nexus-card/50 p-4 rounded-xl border border-nexus-border/50">
                        <div>
                          <p className="text-xs text-nexus-muted mb-1">{t('tempMail.from') || 'From'}</p>
                          <p className="text-sm font-medium text-white">{activeMessage.from}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-nexus-muted mb-1">Date</p>
                          <p className="text-sm font-medium text-white">
                            {new Date(activeMessage.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl p-6 shadow-inner text-gray-900 min-h-[300px] overflow-hidden">
                        {activeMessage.htmlBody ? (
                          <div 
                            className="prose prose-sm max-w-none break-words"
                            dangerouslySetInnerHTML={{ __html: activeMessage.htmlBody }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm break-words">
                            {activeMessage.textBody || '(Empty Message)'}
                          </pre>
                        )}
                      </div>

                      {activeMessage.attachments?.length > 0 && (
                        <div className="bg-nexus-card/30 p-4 rounded-xl border border-nexus-border/30">
                          <p className="text-xs font-semibold text-nexus-muted uppercase tracking-widest mb-3">
                            Attachments ({activeMessage.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {activeMessage.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 bg-nexus-bg px-3 py-2 rounded-lg border border-nexus-border/50 text-xs text-nexus-muted">
                                <span className="truncate max-w-[150px] text-white">{att.filename}</span>
                                <span className="opacity-50">({Math.round(att.size / 1024)}kb)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </BaseToolTemplate>
  )
}
