/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * CurlImportModal.tsx
 * Dialog to import raw cURL commands and populate the studio workspace.
 */

import React, { useState } from 'react'
import { X, Download, Code2, AlertTriangle } from 'lucide-react'
import { parseCurl, ParsedCurlRequest } from '../../utils/curlParser'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface CurlImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (parsed: ParsedCurlRequest) => void
}

export const CurlImportModal: React.FC<CurlImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const { t } = useT()
  const [curlText, setCurlText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleImport = () => {
    if (!curlText.trim()) return
    setError(null)
    try {
      const parsed = parseCurl(curlText.trim())
      if (!parsed.url) {
        setError('No valid URL found in the provided cURL command.')
        cyberAudio.error()
        return
      }
      cyberAudio.copySuccess()
      onImport(parsed)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to parse cURL command.')
      cyberAudio.error()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-nexus-card border border-nexus-accent/30 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 px-6 border-b border-nexus-accent/20 bg-nexus-card/90">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-nexus-cyan" />
            <h2 className="text-base font-bold text-nexus-text">
              {t('apiStudio.curl.modalTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-nexus-muted">
            {t('apiStudio.curl.modalDesc')}
          </p>

          <textarea
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder={`curl -X POST "https://api.example.com/v1/users" \\\n  -H "Authorization: Bearer token123" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Nexus"}'`}
            rows={8}
            className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-xl p-3 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan resize-y leading-relaxed"
          />

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-nexus-muted hover:text-white transition-colors"
            >
              {t('apiStudio.cancel')}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!curlText.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-nexus-accent to-nexus-cyan text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t('apiStudio.curl.importBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
