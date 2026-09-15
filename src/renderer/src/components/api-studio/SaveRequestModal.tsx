/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * SaveRequestModal.tsx
 * Dialog to save the active request configuration to Collections.
 */

import React, { useState } from 'react'
import { X, Bookmark, FolderPlus } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface SaveRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, collectionName?: string) => void
  initialName?: string
}

export const SaveRequestModal: React.FC<SaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
}) => {
  const { t } = useT()
  const [name, setName] = useState(initialName || 'My API Request')
  const [collectionName, setCollectionName] = useState('')

  if (!isOpen) return null

  const handleSave = () => {
    if (!name.trim()) return
    cyberAudio.copySuccess()
    onSave(name.trim(), collectionName.trim() || undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-nexus-card border border-nexus-accent/30 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 px-6 border-b border-nexus-accent/20 bg-nexus-card/90">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-nexus-text">
              {t('apiStudio.saveModal.title')}
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-nexus-text">
              {t('apiStudio.saveModal.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get User Profile"
              className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-lg px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-nexus-cyan"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-nexus-text">
              {t('apiStudio.saveModal.collectionLabel')}
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Authentication API (optional)"
              className="w-full bg-nexus-bg/80 border border-nexus-accent/25 rounded-lg px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-nexus-cyan"
            />
          </div>

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
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-nexus-accent to-nexus-cyan text-white hover:brightness-110 disabled:opacity-40 transition-all"
            >
              {t('apiStudio.saveModal.saveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
