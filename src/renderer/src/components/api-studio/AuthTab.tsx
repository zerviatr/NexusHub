/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * AuthTab.tsx
 * Authentication configuration (Bearer Token, Basic Auth, API Key, or None).
 */

import React, { useState } from 'react'
import { KeyRound, Shield, Eye, EyeOff, Info } from 'lucide-react'
import { AuthData, AuthType, ApiKeyLocation } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface AuthTabProps {
  auth: AuthData
  onChange: (auth: AuthData) => void
}

export const AuthTab: React.FC<AuthTabProps> = ({ auth, onChange }) => {
  const { t } = useT()
  const [showSecret, setShowSecret] = useState(false)

  const handleTypeChange = (type: AuthType) => {
    cyberAudio.click()
    onChange({
      ...auth,
      type,
    })
  }

  const handleFieldChange = (field: keyof AuthData, value: any) => {
    onChange({
      ...auth,
      [field]: value,
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Auth Type Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-nexus-text">
          {t('apiStudio.auth.type')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'bearer', 'basic', 'apiKey'] as AuthType[]).map((type) => {
            const isActive = auth.type === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-nexus-accent/15 border-nexus-accent text-white shadow-sm'
                    : 'bg-nexus-card/50 border-nexus-accent/20 text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/40'
                }`}
              >
                <Shield className={`w-3.5 h-3.5 ${isActive ? 'text-nexus-cyan' : 'opacity-60'}`} />
                <span className="capitalize">{t(`apiStudio.auth.${type}`)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dynamic Form based on Auth Type */}
      {auth.type === 'none' && (
        <div className="p-6 text-center border border-dashed border-nexus-accent/20 rounded-xl bg-nexus-card/30">
          <p className="text-xs text-nexus-muted">{t('apiStudio.auth.noneDesc')}</p>
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="space-y-3 p-4 rounded-xl bg-nexus-card/50 border border-nexus-accent/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-nexus-text flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-nexus-cyan" />
              <span>{t('apiStudio.auth.bearerToken')}</span>
            </label>
            <span className="text-[11px] text-nexus-muted">
              {t('apiStudio.auth.supportVars')}
            </span>
          </div>

          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={auth.bearerToken || ''}
              onChange={(e) => handleFieldChange('bearerToken', e.target.value)}
              placeholder="e.g. eyJhbGciOi... or {{authToken}}"
              className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-nexus-muted">
            <Info className="w-3.5 h-3.5 text-nexus-cyan" />
            <span>
              {t('apiStudio.auth.bearerHeaderPreview')}:{' '}
              <code className="text-nexus-cyan font-mono">Authorization: Bearer &lt;token&gt;</code>
            </span>
          </div>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-3 p-4 rounded-xl bg-nexus-card/50 border border-nexus-accent/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-nexus-text">
                {t('apiStudio.auth.username')}
              </label>
              <input
                type="text"
                value={auth.basicUser || ''}
                onChange={(e) => handleFieldChange('basicUser', e.target.value)}
                placeholder="admin or {{apiUser}}"
                className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-nexus-text">
                {t('apiStudio.auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={auth.basicPass || ''}
                  onChange={(e) => handleFieldChange('basicPass', e.target.value)}
                  placeholder="•••••••• or {{apiPass}}"
                  className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-nexus-muted">
            <Info className="w-3.5 h-3.5 text-nexus-cyan" />
            <span>
              {t('apiStudio.auth.basicHeaderPreview')}:{' '}
              <code className="text-nexus-cyan font-mono">Authorization: Basic base64(user:pass)</code>
            </span>
          </div>
        </div>
      )}

      {auth.type === 'apiKey' && (
        <div className="space-y-3 p-4 rounded-xl bg-nexus-card/50 border border-nexus-accent/20">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-nexus-text">
                {t('apiStudio.auth.keyName')}
              </label>
              <input
                type="text"
                value={auth.apiKeyName || ''}
                onChange={(e) => handleFieldChange('apiKeyName', e.target.value)}
                placeholder="X-API-Key or api_key"
                className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-nexus-text">
                {t('apiStudio.auth.keyValue')}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={auth.apiKeyValue || ''}
                  onChange={(e) => handleFieldChange('apiKeyValue', e.target.value)}
                  placeholder="key_value or {{apiKey}}"
                  className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-cyan"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-nexus-text">
                {t('apiStudio.auth.addTo')}
              </label>
              <select
                value={auth.apiKeyLocation || 'header'}
                onChange={(e) => handleFieldChange('apiKeyLocation', e.target.value as ApiKeyLocation)}
                className="w-full bg-nexus-bg/70 border border-nexus-accent/30 rounded-lg px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-nexus-cyan"
              >
                <option value="header">{t('apiStudio.auth.addToHeader')}</option>
                <option value="query">{t('apiStudio.auth.addToQuery')}</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
