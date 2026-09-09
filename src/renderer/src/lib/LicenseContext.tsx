import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type LicenseStatus = 'checking' | 'active' | 'inactive' | 'expired' | 'revoked'

interface LicenseContextValue {
  status: LicenseStatus
  tier: string | null
  expiresAt: number | null
  key: string | null
  activate: (key: string) => Promise<{ success: boolean; reason?: string }>
  deactivate: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined)

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus>('checking')
  const [tier, setTier] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [key, setKey] = useState<string | null>(null)

  useEffect(() => {
    // Initial check on mount
    window.nexusAPI?.license?.check?.()?.then((res: any) => {
      if (!res) {
        setStatus('inactive')
        return
      }
      setStatus(res.status)
      if (res.status === 'active') {
        setTier(res.tier)
        setExpiresAt(res.expiresAt)
        setKey(res.key)
      }
    })?.catch((err: any) => {
      console.warn('License check failed:', err)
      setStatus('inactive')
    })

    const unbindRevoked = window.nexusAPI?.license?.onRevoked?.(() => {
      console.warn('[LicenseContext] IPC license:revoked received. Purging session.')
      try {
        localStorage.removeItem('nexus_free_tier')
      } catch {}
      setStatus('revoked')
      setTier(null)
      setExpiresAt(null)
      setKey(null)
    })

    return () => {
      unbindRevoked?.()
    }
  }, [])

  const activate = async (newKey: string) => {
    const res: any = await window.nexusAPI.license.activate(newKey)
    if (res.success) {
      setStatus('active')
      setTier(res.tier)
      setExpiresAt(res.expiresAt)
      setKey(newKey)
      return { success: true }
    }
    return { success: false, reason: res.reason }
  }

  const deactivate = useCallback(async () => {
    await window.nexusAPI.license.deactivate()
    setStatus('inactive')
    setTier(null)
    setExpiresAt(null)
    setKey(null)
  }, [])

  // ── Production-grade heartbeat verify (60m interval + debounced window focus) ──
  useEffect(() => {
    if (status !== 'active') return

    const BASE_INTERVAL_MS = 60 * 60 * 1000 // 60 minutes regular heartbeat
    let currentInterval = BASE_INTERVAL_MS
    let timerId: NodeJS.Timeout | null = null
    let lastCheckTime = Date.now()

    const run = async (isFocusTrigger = false) => {
      // Throttle window focus triggers to minimum 2 minutes apart to prevent spamming server
      const now = Date.now()
      if (isFocusTrigger && now - lastCheckTime < 2 * 60 * 1000) {
        return
      }
      lastCheckTime = now

      try {
        const result: any = await window.nexusAPI?.license?.bgVerify?.()
        if (result && result.valid === false) {
          console.warn('[LicenseContext] Remote license revoked/deactivated:', result.reason)
          try {
            localStorage.removeItem('nexus_free_tier')
          } catch {}
          setStatus('revoked')
          setTier(null)
          setExpiresAt(null)
          setKey(null)
        }
        // Reset to regular interval on success
        currentInterval = BASE_INTERVAL_MS
      } catch (err) {
        console.warn('[LicenseContext] Heartbeat verify failed, backing off:', err)
        // Backoff: 5m, 10m, capped at 60m on network error
        currentInterval = Math.min(BASE_INTERVAL_MS, Math.max(5 * 60 * 1000, currentInterval * 2))
      } finally {
        if (status === 'active') {
          if (timerId) clearTimeout(timerId)
          timerId = setTimeout(() => run(false), currentInterval)
        }
      }
    }

    const onFocus = () => run(true)
    const onOnline = () => run(false)

    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    timerId = setTimeout(() => run(false), currentInterval)

    return () => {
      if (timerId) clearTimeout(timerId)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [status])

  return (
    <LicenseContext.Provider value={{ status, tier, expiresAt, key, activate, deactivate }}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense() {
  const context = useContext(LicenseContext)
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider')
  }
  return context
}
