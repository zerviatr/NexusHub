/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * RequestBar.tsx
 * Primary action bar for HTTP method selection, URL input with variable pills,
 * execution trigger, cURL import/export, and active environment selector.
 */

import React, { useState } from 'react'
import {
  Send,
  Loader2,
  Download,
  FileCode,
  Bookmark,
  Globe,
  Settings2,
  ChevronDown,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import { HttpMethod, ApiEnvironment } from './types'
import { cyberAudio } from '../../lib/cyberAudio'
import { useT } from '../../lib/i18n'
import { getUnresolvedVariables } from '../../utils/envInterpolator'

interface RequestBarProps {
  method: HttpMethod
  onMethodChange: (method: HttpMethod) => void
  url: string
  onUrlChange: (url: string) => void
  onSend: () => void
  isSending: boolean
  environments: ApiEnvironment[]
  activeEnvId: string
  onSelectEnv: (envId: string) => void
  onOpenEnvModal: () => void
  onOpenCurlImport: () => void
  onExportCurl: () => void
  onOpenSaveModal: () => void
  activeEnvDict: Record<string, string>
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<HttpMethod, { text: string; bg: string; border: string }> = {
  GET: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  POST: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  PUT: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  PATCH: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  DELETE: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  HEAD: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  OPTIONS: { text: 'text-zinc-300', bg: 'bg-zinc-700/20', border: 'border-zinc-600/30' },
}

export const RequestBar: React.FC<RequestBarProps> = ({
  method,
  onMethodChange,
  url,
  onUrlChange,
  onSend,
  isSending,
  environments,
  activeEnvId,
  onSelectEnv,
  onOpenEnvModal,
  onOpenCurlImport,
  onExportCurl,
  onOpenSaveModal,
  activeEnvDict,
}) => {
  const { t } = useT()
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const unresolvedVars = getUnresolvedVariables(url, activeEnvDict)
  const activeEnv = environments.find((e) => e.id === activeEnvId)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSend()
    }
  }

  const handleExportCurl = () => {
    cyberAudio.copySuccess()
    onExportCurl()
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 1800)
  }

  return (
    <div className="space-y-2">
      {/* Top Utility Row: Environment + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Environment Picker */}
        <div className="flex items-center gap-1.5 bg-nexus-card/80 border border-nexus-accent/20 rounded-lg p-1 px-2">
          <Globe className="w-3.5 h-3.5 text-nexus-cyan" />
          <span className="text-nexus-muted font-medium">{t('apiStudio.env.label')}:</span>
          <select
            value={activeEnvId}
            onChange={(e) => onSelectEnv(e.target.value)}
            className="bg-transparent text-nexus-text font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="none" className="bg-nexus-card text-nexus-muted">
              {t('apiStudio.env.noEnv')}
            </option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} className="bg-nexus-card text-nexus-text">
                {env.name}
              </option>
            ))}
          </select>
          <button
            onClick={onOpenEnvModal}
            title={t('apiStudio.env.manage')}
            className="p-1 hover:bg-nexus-card rounded text-nexus-muted hover:text-nexus-cyan transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Actions: cURL Import, Export, Save */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCurlImport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nexus-card/70 border border-nexus-accent/20 text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/40 transition-colors"
            title={t('apiStudio.curl.importTitle')}
          >
            <Download className="w-3.5 h-3.5 text-nexus-cyan" />
            <span>{t('apiStudio.curl.import')}</span>
          </button>

          <button
            onClick={handleExportCurl}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nexus-card/70 border border-nexus-accent/20 text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/40 transition-colors"
            title={t('apiStudio.curl.exportTitle')}
          >
            {copiedCurl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('apiStudio.curl.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-nexus-accent" />
                <span>{t('apiStudio.curl.export')}</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenSaveModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nexus-card/70 border border-nexus-accent/20 text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/40 transition-colors"
            title={t('apiStudio.request.saveTitle')}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('apiStudio.request.save')}</span>
          </button>
        </div>
      </div>

      {/* Main Request Bar: Method Selector + URL Bar + Send Button */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-nexus-card border border-nexus-accent/25 shadow-lg shadow-black/20 focus-within:border-nexus-accent/60 transition-all">
        {/* Method Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMethodDropdownOpen(!methodDropdownOpen)}
            className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider border transition-all ${METHOD_COLORS[method].bg} ${METHOD_COLORS[method].text} ${METHOD_COLORS[method].border}`}
          >
            <span>{method}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {methodDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMethodDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-32 py-1 bg-nexus-card border border-nexus-accent/30 rounded-lg shadow-2xl z-50 backdrop-blur-md">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onMethodChange(m)
                      setMethodDropdownOpen(false)
                      cyberAudio.click()
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-between hover:bg-nexus-card/80 ${
                      m === method ? METHOD_COLORS[m].text : 'text-nexus-muted hover:text-nexus-text'
                    }`}
                  >
                    <span>{m}</span>
                    {m === method && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* URL Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('apiStudio.urlPlaceholder')}
            className="w-full bg-transparent px-3 py-1.5 text-sm text-nexus-text font-mono placeholder:text-nexus-muted/40 focus:outline-none"
          />

          {/* Unresolved variable alert pill */}
          {unresolvedVars.length > 0 && (
            <div
              title={`${t('apiStudio.env.unresolvedVars')}: ${unresolvedVars.join(', ')}`}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full pointer-events-none"
            >
              <AlertCircle className="w-3 h-3" />
              <span>{unresolvedVars.length} {t('apiStudio.env.missing')}</span>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={isSending || !url.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-nexus-accent to-nexus-cyan text-white font-semibold text-xs tracking-wide shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('apiStudio.sending')}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t('apiStudio.send')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
