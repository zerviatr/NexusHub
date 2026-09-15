/**
 * lib/i18n.tsx
 * Lightweight, zero-dependency i18n for ZenDev.
 *
 * Usage:
 *   const { t, locale, setLocale } = useT()
 *   t('nav.dashboard')              → "Kontrol Paneli"
 *   t('password.bulk.generate', { count: 10 }) → "10 Tane Üret"
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import en from '../locales/en.json'
import tr from '../locales/tr.json'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Locale = 'en' | 'tr'
type NestedDict = Record<string, unknown>
type Vars = Record<string, string | number>

// ─── Locale registry ──────────────────────────────────────────────────────────
const locales: Record<Locale, NestedDict> = { en, tr }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a dot-notation key against a nested object. Returns the key itself on miss. */
function resolve(obj: NestedDict, key: string): string {
  const parts = key.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return key
    cur = (cur as NestedDict)[part]
  }
  return typeof cur === 'string' ? cur : key
}

/** Replace {{placeholder}} tokens with values from `vars`. */
function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

// ─── Context ──────────────────────────────────────────────────────────────────
type I18nCtx = {
  locale: Locale
  language: Locale
  setLocale: (l: Locale) => void
  /**
   * Translate a dot-notation key.
   * Falls back to English if the key is missing in the active locale.
   * Falls back to the key string itself if missing in both.
   */
  t: (key: string, vars?: Vars) => string
}

const I18nContext = createContext<I18nCtx | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({
  children,
  defaultLocale = 'tr',
}: {
  children: ReactNode
  defaultLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('nexus_locale') as Locale
      return saved === 'en' || saved === 'tr' ? saved : defaultLocale
    } catch {
      return defaultLocale
    }
  })

  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem('nexus_locale', l)
    } catch {}
    setLocaleState(l)
  }

  const t = (key: string, vars?: Vars): string => {
    const primary = resolve(locales[locale], key)
    // fallback to English when the key is unresolved in the active locale
    const raw = primary !== key ? primary : resolve(locales.en, key)
    return interpolate(raw, vars)
  }

  return (
    <I18nContext.Provider value={{ locale, language: locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useT(): I18nCtx {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT() must be called inside <I18nProvider>')
  return ctx
}
