/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * EnvironmentModal.tsx
 * Modal to manage multiple environments (Local, Staging, Production)
 * and scoped key-value variables with secret masking.
 */

import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Globe,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Lock,
  Edit2,
  Check,
} from 'lucide-react'
import { ApiEnvironment, EnvVariable } from './types'
import { useT } from '../../lib/i18n'
import { cyberAudio } from '../../lib/cyberAudio'

interface EnvironmentModalProps {
  isOpen: boolean
  onClose: () => void
  environments: ApiEnvironment[]
  onChangeEnvironments: (envs: ApiEnvironment[]) => void
  activeEnvId: string
  onSelectEnv: (id: string) => void
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  onChangeEnvironments,
  activeEnvId,
  onSelectEnv,
}) => {
  const { t } = useT()
  const [selectedEnvId, setSelectedEnvId] = useState<string>(() => {
    return activeEnvId !== 'none' && activeEnvId ? activeEnvId : environments[0]?.id || ''
  })
  const [editingEnvNameId, setEditingEnvNameId] = useState<string | null>(null)
  const [tempEnvName, setTempEnvName] = useState('')
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0]

  // Create new environment
  const handleAddEnvironment = () => {
    cyberAudio.click()
    const newEnv: ApiEnvironment = {
      id: 'env_' + Date.now(),
      name: 'New Environment',
      variables: [
        {
          id: 'var_' + Date.now(),
          key: 'baseUrl',
          value: 'https://api.example.com',
          enabled: true,
          isSecret: false,
        },
      ],
    }
    const updated = [...environments, newEnv]
    onChangeEnvironments(updated)
    setSelectedEnvId(newEnv.id)
  }

  // Delete environment
  const handleDeleteEnvironment = (envId: string) => {
    cyberAudio.click()
    const updated = environments.filter((e) => e.id !== envId)
    onChangeEnvironments(updated)
    if (selectedEnvId === envId) {
      setSelectedEnvId(updated[0]?.id || '')
    }
    if (activeEnvId === envId) {
      onSelectEnv('none')
    }
  }

  // Add variable
  const handleAddVariable = () => {
    if (!currentEnv) return
    cyberAudio.click()
    const newVar: EnvVariable = {
      id: 'var_' + Date.now(),
      key: '',
      value: '',
      enabled: true,
      isSecret: false,
    }
    const updatedEnvs = environments.map((e) => {
      if (e.id === currentEnv.id) {
        return {
          ...e,
          variables: [...e.variables, newVar],
        }
      }
      return e
    })
    onChangeEnvironments(updatedEnvs)
  }

  // Update variable
  const handleUpdateVariable = (
    varId: string,
    field: keyof EnvVariable,
    value: any
  ) => {
    if (!currentEnv) return
    const updatedEnvs = environments.map((e) => {
      if (e.id === currentEnv.id) {
        return {
          ...e,
          variables: e.variables.map((v) => (v.id === varId ? { ...v, [field]: value } : v)),
        }
      }
      return e
    })
    onChangeEnvironments(updatedEnvs)
  }

  // Delete variable
  const handleDeleteVariable = (varId: string) => {
    if (!currentEnv) return
    cyberAudio.click()
    const updatedEnvs = environments.map((e) => {
      if (e.id === currentEnv.id) {
        return {
          ...e,
          variables: e.variables.filter((v) => v.id !== varId),
        }
      }
      return e
    })
    onChangeEnvironments(updatedEnvs)
  }

  // Rename env
  const saveRenameEnv = (envId: string) => {
    if (!tempEnvName.trim()) return
    const updated = environments.map((e) => (e.id === envId ? { ...e, name: tempEnvName.trim() } : e))
    onChangeEnvironments(updated)
    setEditingEnvNameId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-nexus-card border border-nexus-accent/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-nexus-accent/20 bg-nexus-card/90">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-nexus-cyan" />
            <h2 className="text-base font-bold text-nexus-text">
              {t('apiStudio.env.modalTitle')}
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

        {/* Modal Body: Two columns (Environments list + Variables editor) */}
        <div className="flex flex-1 overflow-hidden min-h-[360px]">
          {/* Left Column: Environments */}
          <div className="w-64 border-r border-nexus-accent/20 p-3 flex flex-col justify-between bg-nexus-bg/30">
            <div className="space-y-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 px-1 text-xs text-nexus-muted font-semibold uppercase tracking-wider">
                <span>{t('apiStudio.env.environments')}</span>
                <button
                  type="button"
                  onClick={handleAddEnvironment}
                  className="text-nexus-cyan hover:text-white flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('apiStudio.env.new')}</span>
                </button>
              </div>

              {environments.map((env) => {
                const isSelected = env.id === selectedEnvId
                const isActive = env.id === activeEnvId
                const isEditing = editingEnvNameId === env.id

                return (
                  <div
                    key={env.id}
                    className={`group flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-cyan font-bold shadow-sm'
                        : 'bg-nexus-card/40 border-nexus-accent/10 text-nexus-muted hover:text-nexus-text hover:bg-nexus-card'
                    }`}
                    onClick={() => setSelectedEnvId(env.id)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempEnvName}
                          onChange={(e) => setTempEnvName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameEnv(env.id)
                          }}
                          className="bg-nexus-bg px-1.5 py-0.5 rounded text-nexus-text w-full focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveRenameEnv(env.id)}
                          className="text-emerald-400 hover:text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span className="truncate">{env.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                            Active
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingEnvNameId(env.id)
                            setTempEnvName(env.name)
                          }}
                          className="p-1 hover:text-nexus-cyan"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {environments.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEnvironment(env.id)
                            }}
                            className="p-1 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Set as Active Environment Button */}
            {currentEnv && (
              <button
                type="button"
                onClick={() => {
                  cyberAudio.click()
                  onSelectEnv(currentEnv.id)
                }}
                disabled={activeEnvId === currentEnv.id}
                className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold bg-nexus-card border border-nexus-accent/30 text-nexus-text hover:border-nexus-cyan hover:text-nexus-cyan transition-colors disabled:opacity-40 disabled:cursor-default"
              >
                {activeEnvId === currentEnv.id
                  ? 'Currently Active'
                  : 'Set as Active Environment'}
              </button>
            )}
          </div>

          {/* Right Column: Variables */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {currentEnv ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-nexus-accent/15">
                  <div>
                    <h3 className="text-xs font-bold text-nexus-text">{currentEnv.name}</h3>
                    <p className="text-[11px] text-nexus-muted">
                      Use in URL, headers, or body as{' '}
                      <code className="text-nexus-cyan font-mono">{'{{variableName}}'}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariable}
                    className="flex items-center gap-1 text-xs text-nexus-cyan hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('apiStudio.env.addVar')}</span>
                  </button>
                </div>

                {currentEnv.variables.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-nexus-accent/20 rounded-xl">
                    <p className="text-xs text-nexus-muted mb-2">No variables defined yet.</p>
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-accent/30 text-xs text-nexus-cyan"
                    >
                      + Add Variable
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {currentEnv.variables.map((item) => {
                      const isRevealed = revealedSecrets[item.id] || false
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-1.5 px-2 rounded-lg bg-nexus-card/70 border border-nexus-accent/15 text-xs font-mono"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateVariable(item.id, 'enabled', !item.enabled)
                            }
                            className="text-nexus-muted hover:text-nexus-cyan"
                          >
                            {item.enabled ? (
                              <CheckSquare className="w-4 h-4 text-nexus-cyan" />
                            ) : (
                              <Square className="w-4 h-4 text-nexus-muted" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={item.key}
                            onChange={(e) => handleUpdateVariable(item.id, 'key', e.target.value)}
                            placeholder="VAR_NAME"
                            className="w-1/3 bg-transparent px-2 py-1 text-nexus-cyan font-bold placeholder:text-nexus-muted/40 focus:outline-none"
                          />

                          <span className="text-nexus-muted/40 font-mono">=</span>

                          <div className="relative flex-1">
                            <input
                              type={item.isSecret && !isRevealed ? 'password' : 'text'}
                              value={item.value}
                              onChange={(e) =>
                                handleUpdateVariable(item.id, 'value', e.target.value)
                              }
                              placeholder="value"
                              className="w-full bg-transparent px-2 py-1 pr-14 text-nexus-text placeholder:text-nexus-muted/40 focus:outline-none"
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateVariable(item.id, 'isSecret', !item.isSecret)
                                }
                                title={item.isSecret ? 'Secret variable' : 'Plaintext variable'}
                                className={`p-1 rounded hover:bg-nexus-bg ${
                                  item.isSecret ? 'text-amber-400' : 'text-nexus-muted'
                                }`}
                              >
                                <Lock className="w-3 h-3" />
                              </button>
                              {item.isSecret && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedSecrets((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className="p-1 rounded text-nexus-muted hover:text-white"
                                >
                                  {isRevealed ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(item.id)}
                            className="p-1 text-nexus-muted hover:text-rose-400"
                            title={t('apiStudio.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
