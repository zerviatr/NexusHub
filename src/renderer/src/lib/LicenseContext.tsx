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
    window.nexusAPI.license.check().then((res: any) => {
      setStatus(res.status)
      if (res.status === 'active') {
        setTier(res.tier)
        setExpiresAt(res.expiresAt)
        setKey(res.key)
      }
    })
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

  // ── 24h background verify heartbeat ────────────────────────────────────
  useEffect(() => {
    if (status !== 'active') return

    const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

    const run = async () => {
      const result: any = await window.nexusAPI.license.bgVerify()
      if (result && result.valid === false) {
        // Server revoked — log out
        setStatus('revoked')
        setTier(null)
        setExpiresAt(null)
        setKey(null)
      }
    }

    const timer = setInterval(run, INTERVAL_MS)
    return () => clearInterval(timer)
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
