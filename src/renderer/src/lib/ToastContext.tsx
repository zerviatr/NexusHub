import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  message?: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, message, type = 'info', duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newItem: ToastItem = { id, title, message, type, duration }
      setToasts((prev) => [...prev.slice(-4), newItem]) // Keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss]
  )

  const success = useCallback((title: string, message?: string) => toast({ title, message, type: 'success' }), [toast])
  const error = useCallback((title: string, message?: string) => toast({ title, message, type: 'error', duration: 6000 }), [toast])
  const warning = useCallback((title: string, message?: string) => toast({ title, message, type: 'warning' }), [toast])
  const info = useCallback((title: string, message?: string) => toast({ title, message, type: 'info' }), [toast])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-nexus-cyan shrink-0" />,
  }

  const borderColors = {
    success: 'border-emerald-500/30 bg-emerald-950/40 shadow-emerald-500/10',
    error: 'border-rose-500/30 bg-rose-950/40 shadow-rose-500/10',
    warning: 'border-amber-500/30 bg-amber-950/40 shadow-amber-500/10',
    info: 'border-nexus-cyan/30 bg-nexus-surface/80 shadow-nexus-cyan/10',
  }

  const value = React.useMemo(() => ({ toast, success, error, warning, info, dismiss }), [toast, success, error, warning, info, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast HUD Overlay */}
      <div className="fixed top-12 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-2xl shadow-xl ${borderColors[t.type]}`}
            >
              <div className="mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white tracking-tight">{t.title}</p>
                {t.message && <p className="text-xs text-nexus-muted mt-0.5 line-clamp-2 leading-relaxed">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-nexus-muted hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
