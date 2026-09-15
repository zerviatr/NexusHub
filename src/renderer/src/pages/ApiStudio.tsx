/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * ApiStudio.tsx
 * Unified Enterprise API Studio & Native Network Diagnostics Workstation.
 * Integrates multi-tab request construction, response inspection, cURL import/export,
 * variable interpolation, persistent collections, history, and native network diagnostics.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Send,
  Code2,
  Settings2,
  Bookmark,
  History,
  Activity,
  KeyRound,
  Sliders,
  Sparkles,
  FileCode,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import axios from 'axios'

import {
  HttpMethod,
  KeyValueItem,
  AuthData,
  BodyType,
  RawContentType,
  ApiResponse,
  ApiEnvironment,
  SavedRequest,
  ApiHistoryItem,
} from '../components/api-studio/types'
import { RequestBar } from '../components/api-studio/RequestBar'
import { ParamsTab } from '../components/api-studio/ParamsTab'
import { HeadersTab } from '../components/api-studio/HeadersTab'
import { AuthTab } from '../components/api-studio/AuthTab'
import { BodyTab } from '../components/api-studio/BodyTab'
import { DiagnosticsTab } from '../components/api-studio/DiagnosticsTab'
import { ResponsePanel } from '../components/api-studio/ResponsePanel'
import { CollectionsSidebar } from '../components/api-studio/CollectionsSidebar'
import { EnvironmentModal } from '../components/api-studio/EnvironmentModal'
import { CurlImportModal } from '../components/api-studio/CurlImportModal'
import { SaveRequestModal } from '../components/api-studio/SaveRequestModal'

import { exportToCurl, ParsedCurlRequest } from '../utils/curlParser'
import {
  interpolateString,
  interpolateKeyValuePairs,
  buildQueryString,
} from '../utils/envInterpolator'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'
import { cyberAudio } from '../lib/cyberAudio'
import { logActivity } from '../lib/activityLogger'

// Default Environments
const DEFAULT_ENVIRONMENTS: ApiEnvironment[] = [
  {
    id: 'env_default_local',
    name: 'Local Dev',
    variables: [
      {
        id: 'v_1',
        key: 'baseUrl',
        value: 'http://localhost:3000',
        enabled: true,
        isSecret: false,
      },
      {
        id: 'v_2',
        key: 'token',
        value: 'dev_token_sample_123',
        enabled: true,
        isSecret: true,
      },
    ],
  },
  {
    id: 'env_default_staging',
    name: 'Staging',
    variables: [
      {
        id: 'v_3',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
        isSecret: false,
      },
    ],
  },
]

type ActiveRequestTab = 'params' | 'headers' | 'auth' | 'body' | 'diagnostics'

export default function ApiStudio() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  // ─── Primary Request State ──────────────────────────────────────────────────
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [activeTab, setActiveTab] = useState<ActiveRequestTab>('params')

  // Request Tabs state
  const [params, setParams] = useState<KeyValueItem[]>([])
  const [headers, setHeaders] = useState<KeyValueItem[]>([
    { id: 'hdr_init_1', key: 'Accept', value: 'application/json', enabled: true },
  ])
  const [auth, setAuth] = useState<AuthData>({ type: 'none' })
  const [bodyType, setBodyType] = useState<BodyType>('none')
  const [bodyRaw, setBodyRaw] = useState('{\n  "title": "ZenDev / NexusHub",\n  "completed": false\n}')
  const [rawContentType, setRawContentType] = useState<RawContentType>('text/plain')
  const [formData, setFormData] = useState<KeyValueItem[]>([])
  const [urlEncoded, setUrlEncoded] = useState<KeyValueItem[]>([])
  const [graphqlQuery, setGraphqlQuery] = useState('')
  const [graphqlVariables, setGraphqlVariables] = useState('')

  // ─── Execution & Response State ─────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)

  // ─── Environments State ─────────────────────────────────────────────────────
  const [environments, setEnvironments] = useState<ApiEnvironment[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_api_environments')
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_ENVIRONMENTS
  })

  const [activeEnvId, setActiveEnvId] = useState<string>(() => {
    try {
      return localStorage.getItem('nexus_api_active_env') || 'env_default_staging'
    } catch {
      return 'env_default_staging'
    }
  })

  // Save environments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_api_environments', JSON.stringify(environments))
    } catch {}
  }, [environments])

  useEffect(() => {
    try {
      localStorage.setItem('nexus_api_active_env', activeEnvId)
    } catch {}
  }, [activeEnvId])

  // Active Environment Key-Value Dictionary
  const activeEnvDict = useMemo<Record<string, string>>(() => {
    if (activeEnvId === 'none') return {}
    const env = environments.find((e) => e.id === activeEnvId)
    if (!env) return {}
    const dict: Record<string, string> = {}
    for (const v of env.variables) {
      if (v.enabled && v.key.trim()) {
        dict[v.key.trim()] = v.value
      }
    }
    return dict
  }, [environments, activeEnvId])

  // ─── Saved Requests & Collections ───────────────────────────────────────────
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_api_collections')
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      {
        id: 'sample_get_todos',
        name: 'Get Todos Sample',
        collectionName: 'JSONPlaceholder',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        params: [],
        headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
        updatedAt: Date.now(),
      },
    ]
  })

  useEffect(() => {
    try {
      localStorage.setItem('nexus_api_collections', JSON.stringify(savedRequests))
    } catch {}
  }, [savedRequests])

  // ─── Request History ────────────────────────────────────────────────────────
  const [history, setHistory] = useState<ApiHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_api_history')
      if (saved) return JSON.parse(saved)
    } catch {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem('nexus_api_history', JSON.stringify(history))
    } catch {}
  }, [history])

  // ─── Modals & Sidebar State ─────────────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false)
  const [isCurlImportOpen, setIsCurlImportOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

  // ─── Auto-Sync Params ↔ URL Query String ────────────────────────────────────
  const isInternalUrlSyncRef = React.useRef(false)

  // When params change, update URL query string
  const handleParamsChange = (newParams: KeyValueItem[]) => {
    setParams(newParams)
    try {
      isInternalUrlSyncRef.current = true
      const rawBase = url.split('?')[0]
      const qs = buildQueryString(newParams, {})
      setUrl(rawBase + qs)
    } finally {
      setTimeout(() => {
        isInternalUrlSyncRef.current = false
      }, 50)
    }
  }

  // When user types in URL bar with ?, extract params if not from internal sync
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    if (isInternalUrlSyncRef.current) return

    const qIndex = newUrl.indexOf('?')
    if (qIndex >= 0) {
      const qs = newUrl.slice(qIndex + 1)
      const searchParams = new URLSearchParams(qs)
      const parsedParams: KeyValueItem[] = []
      searchParams.forEach((value, key) => {
        parsedParams.push({
          id: 'param_' + Math.random().toString(36).substring(2, 7),
          key,
          value,
          enabled: true,
        })
      })
      if (parsedParams.length > 0) {
        setParams(parsedParams)
      }
    }
  }

  // ─── cURL Export ────────────────────────────────────────────────────────────
  const handleExportCurl = useCallback(() => {
    const rawHeaders: Record<string, string> = {}
    headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        rawHeaders[h.key.trim()] = h.value
      })

    let bodyPayload: string | undefined = undefined
    if (bodyType === 'json' || bodyType === 'raw') {
      bodyPayload = bodyRaw
    } else if (bodyType === 'form-data') {
      const fd = formData.filter((f) => f.enabled && f.key.trim()).map((f) => `${f.key}=${f.value}`)
      bodyPayload = fd.join('&')
    } else if (bodyType === 'x-www-form-urlencoded') {
      const ue = urlEncoded.filter((u) => u.enabled && u.key.trim()).map((u) => `${u.key}=${u.value}`)
      bodyPayload = ue.join('&')
    } else if (bodyType === 'graphql') {
      bodyPayload = JSON.stringify({ query: graphqlQuery, variables: graphqlVariables })
    }

    const curlString = exportToCurl({
      method,
      url,
      headers: rawHeaders,
      body: bodyPayload,
      auth: auth as any,
    })

    navigator.clipboard.writeText(curlString)
    showToastSuccess(t('apiStudio.curl.copiedToastTitle'), t('apiStudio.curl.copiedToastDesc'))
  }, [method, url, headers, bodyType, bodyRaw, formData, urlEncoded, graphqlQuery, graphqlVariables, auth, t, showToastSuccess])

  // ─── cURL Import ────────────────────────────────────────────────────────────
  const handleImportCurl = (parsed: ParsedCurlRequest) => {
    setMethod(parsed.method)
    setUrl(parsed.url)

    // Parse headers
    const newHeaders: KeyValueItem[] = Object.entries(parsed.headers).map(([k, v], idx) => ({
      id: 'hdr_imp_' + idx,
      key: k,
      value: v,
      enabled: true,
    }))
    setHeaders(newHeaders.length > 0 ? newHeaders : [])

    // Auth
    if (parsed.auth) {
      setAuth(parsed.auth as any)
    }

    // Body
    if (parsed.body) {
      setBodyType('json')
      setBodyRaw(parsed.body)
    } else {
      setBodyType('none')
    }

    // Auto extract params from imported URL
    const qIndex = parsed.url.indexOf('?')
    if (qIndex >= 0) {
      const searchParams = new URLSearchParams(parsed.url.slice(qIndex + 1))
      const parsedParams: KeyValueItem[] = []
      searchParams.forEach((val, k) => {
        parsedParams.push({
          id: 'p_imp_' + Math.random().toString(36).substring(2, 6),
          key: k,
          value: val,
          enabled: true,
        })
      })
      setParams(parsedParams)
    }

    showToastSuccess(t('apiStudio.curl.importedToastTitle'), t('apiStudio.curl.importedToastDesc'))
  }

  // ─── Save Request to Collections ────────────────────────────────────────────
  const handleSaveRequest = (name: string, collectionName?: string) => {
    const newSaved: SavedRequest = {
      id: 'req_' + Date.now(),
      name,
      collectionName,
      method,
      url,
      params,
      headers,
      auth,
      bodyType,
      bodyRaw,
      rawContentType,
      bodyFormData: formData,
      bodyUrlEncoded: urlEncoded,
      graphqlQuery,
      graphqlVariables,
      updatedAt: Date.now(),
    }
    setSavedRequests([newSaved, ...savedRequests])
    showToastSuccess(t('apiStudio.request.savedToastTitle'), `${name} saved to collections.`)
  }

  // ─── Load Saved Request ─────────────────────────────────────────────────────
  const handleLoadSavedRequest = (saved: SavedRequest) => {
    setMethod(saved.method)
    setUrl(saved.url)
    setParams(saved.params || [])
    setHeaders(saved.headers || [])
    setAuth(saved.auth || { type: 'none' })
    setBodyType(saved.bodyType || 'none')
    if (saved.bodyRaw !== undefined) setBodyRaw(saved.bodyRaw)
    if (saved.rawContentType) setRawContentType(saved.rawContentType)
    if (saved.bodyFormData) setFormData(saved.bodyFormData)
    if (saved.bodyUrlEncoded) setUrlEncoded(saved.bodyUrlEncoded)
    if (saved.graphqlQuery) setGraphqlQuery(saved.graphqlQuery)
    if (saved.graphqlVariables) setGraphqlVariables(saved.graphqlVariables)
    showToastSuccess('Loaded Request', saved.name)
  }

  // ─── Load History Item ──────────────────────────────────────────────────────
  const handleLoadHistoryItem = (item: ApiHistoryItem) => {
    setMethod(item.method)
    setUrl(item.url)
    if (item.requestSnapshot) {
      setParams(item.requestSnapshot.params || [])
      setHeaders(item.requestSnapshot.headers || [])
      setAuth(item.requestSnapshot.auth || { type: 'none' })
      setBodyType(item.requestSnapshot.bodyType || 'none')
      if (item.requestSnapshot.bodyRaw !== undefined) setBodyRaw(item.requestSnapshot.bodyRaw)
      if (item.requestSnapshot.rawContentType) setRawContentType(item.requestSnapshot.rawContentType)
      if (item.requestSnapshot.bodyFormData) setFormData(item.requestSnapshot.bodyFormData)
      if (item.requestSnapshot.bodyUrlEncoded) setUrlEncoded(item.requestSnapshot.bodyUrlEncoded)
      if (item.requestSnapshot.graphqlQuery) setGraphqlQuery(item.requestSnapshot.graphqlQuery)
      if (item.requestSnapshot.graphqlVariables)
        setGraphqlVariables(item.requestSnapshot.graphqlVariables)
    }
    showToastSuccess('Loaded from History', `${item.method} ${item.url}`)
  }

  // ─── Execute HTTP Request ───────────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!url.trim()) return
    setIsSending(true)
    setResponse(null)
    cyberAudio.click()
    const startTime = performance.now()

    // 1. Interpolate URL with active environment
    let targetUrl = interpolateString(url.trim(), activeEnvDict)
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    // 2. Prepare Headers & inject Auth
    const dispatchHeaders: Record<string, string> = {}
    for (const h of headers) {
      if (h.enabled && h.key.trim()) {
        const k = interpolateString(h.key.trim(), activeEnvDict)
        const v = interpolateString(h.value, activeEnvDict)
        dispatchHeaders[k] = v
      }
    }

    // Inject Auth
    if (auth.type === 'bearer' && auth.bearerToken) {
      const token = interpolateString(auth.bearerToken.trim(), activeEnvDict)
      dispatchHeaders['Authorization'] = `Bearer ${token}`
    } else if (auth.type === 'basic' && auth.basicUser) {
      const u = interpolateString(auth.basicUser.trim(), activeEnvDict)
      const p = interpolateString(auth.basicPass || '', activeEnvDict)
      dispatchHeaders['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`
    } else if (auth.type === 'apiKey' && auth.apiKeyName && auth.apiKeyValue) {
      const keyName = interpolateString(auth.apiKeyName.trim(), activeEnvDict)
      const keyVal = interpolateString(auth.apiKeyValue, activeEnvDict)
      if (auth.apiKeyLocation === 'query') {
        const sep = targetUrl.includes('?') ? '&' : '?'
        targetUrl += `${sep}${encodeURIComponent(keyName)}=${encodeURIComponent(keyVal)}`
      } else {
        dispatchHeaders[keyName] = keyVal
      }
    }

    // 3. Prepare Body
    let dispatchBody: string | undefined = undefined
    if (bodyType === 'json') {
      dispatchBody = interpolateString(bodyRaw, activeEnvDict)
      if (!dispatchHeaders['Content-Type']) {
        dispatchHeaders['Content-Type'] = 'application/json'
      }
    } else if (bodyType === 'raw') {
      dispatchBody = interpolateString(bodyRaw, activeEnvDict)
      if (!dispatchHeaders['Content-Type']) {
        dispatchHeaders['Content-Type'] = rawContentType
      }
    } else if (bodyType === 'form-data') {
      const pairs = interpolateKeyValuePairs(formData, activeEnvDict)
      const fd = pairs.filter((p) => p.enabled && p.key.trim()).map((p) => `${p.key}=${p.value}`)
      dispatchBody = fd.join('&')
      if (!dispatchHeaders['Content-Type']) {
        dispatchHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    } else if (bodyType === 'x-www-form-urlencoded') {
      const pairs = interpolateKeyValuePairs(urlEncoded, activeEnvDict)
      const searchParams = new URLSearchParams()
      for (const p of pairs) {
        if (p.enabled && p.key.trim()) searchParams.append(p.key.trim(), p.value)
      }
      dispatchBody = searchParams.toString()
      if (!dispatchHeaders['Content-Type']) {
        dispatchHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    } else if (bodyType === 'graphql') {
      let parsedVars = {}
      try {
        parsedVars = JSON.parse(interpolateString(graphqlVariables || '{}', activeEnvDict))
      } catch {}
      dispatchBody = JSON.stringify({
        query: interpolateString(graphqlQuery, activeEnvDict),
        variables: parsedVars,
      })
      if (!dispatchHeaders['Content-Type']) {
        dispatchHeaders['Content-Type'] = 'application/json'
      }
    }

    try {
      let finalResult: ApiResponse

      // Method A: Native Electron IPC Net Dispatcher (CORS-Bypass)
      if (window.nexusAPI?.net?.dispatchRequest) {
        const ipcRes = await window.nexusAPI.net.dispatchRequest({
          url: targetUrl,
          method,
          headers: dispatchHeaders,
          body: dispatchBody,
          timeoutMs: 30000,
          followRedirects: true,
        })
        finalResult = {
          status: ipcRes.status,
          statusText: ipcRes.statusText,
          headers: ipcRes.headers || {},
          data: ipcRes.data || '',
          timeMs: ipcRes.timeMs || Math.round(performance.now() - startTime),
          sizeBytes: ipcRes.sizeBytes || (ipcRes.data ? new Blob([ipcRes.data]).size : 0),
          error: ipcRes.error,
        }
      } else {
        // Method B: Renderer Fetch Fallback (Standalone / Web Preview)
        const fetchOptions: RequestInit = {
          method,
          headers: dispatchHeaders,
        }
        if (method !== 'GET' && method !== 'HEAD' && dispatchBody !== undefined) {
          fetchOptions.body = dispatchBody
        }

        const res = await fetch(targetUrl, fetchOptions)
        const elapsed = Math.round(performance.now() - startTime)
        const text = await res.text()

        const resHeaders: Record<string, string> = {}
        res.headers.forEach((v, k) => {
          resHeaders[k] = v
        })

        finalResult = {
          status: res.status,
          statusText: res.statusText || (res.status === 200 ? 'OK' : ''),
          headers: resHeaders,
          data: text,
          timeMs: elapsed,
          sizeBytes: new Blob([text]).size,
        }
      }

      setResponse(finalResult)
      cyberAudio.copySuccess()

      // Record in History
      const historyItem: ApiHistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: Date.now(),
        method,
        url: targetUrl,
        status: finalResult.status,
        statusText: finalResult.statusText,
        timeMs: finalResult.timeMs,
        sizeBytes: finalResult.sizeBytes,
        requestSnapshot: {
          params,
          headers,
          auth,
          bodyType,
          bodyRaw,
          rawContentType,
          bodyFormData: formData,
          bodyUrlEncoded: urlEncoded,
          graphqlQuery,
          graphqlVariables,
        },
      }
      setHistory((prev) => [historyItem, ...prev.slice(0, 49)])

      if (finalResult.error) {
        showToastError('Request Error', finalResult.error)
      } else {
        showToastSuccess(
          'Request Completed',
          `${finalResult.status} ${finalResult.statusText} in ${finalResult.timeMs}ms`
        )
      }

      logActivity({
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: finalResult.status < 400 && !finalResult.error ? 'success' : 'failure',
        details: `${method} ${targetUrl} - ${finalResult.status} ${finalResult.statusText || ''} (${finalResult.timeMs}ms)`,
        metadata: {
          method,
          url: targetUrl,
          status: finalResult.status,
          sizeBytes: finalResult.sizeBytes,
          timeMs: finalResult.timeMs,
          error: finalResult.error,
        },
        durationMs: finalResult.timeMs,
      })
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime)
      const errorMsg =
        err.message || 'Connection failed. Possible CORS restriction or offline target.'
      setResponse({
        status: 0,
        statusText: 'ERR_FAILED',
        headers: {},
        data: '',
        timeMs: elapsed,
        sizeBytes: 0,
        error: errorMsg,
      })
      cyberAudio.error()
      showToastError('Request Failed', errorMsg)

      logActivity({
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'failure',
        details: `${method} ${targetUrl} failed: ${errorMsg}`,
        metadata: {
          method,
          url: targetUrl,
          error: errorMsg,
          timeMs: elapsed,
        },
        durationMs: elapsed,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-5.5rem)] -m-8 overflow-hidden bg-nexus-bg">
      {/* Modals */}
      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        environments={environments}
        onChangeEnvironments={setEnvironments}
        activeEnvId={activeEnvId}
        onSelectEnv={setActiveEnvId}
      />

      <CurlImportModal
        isOpen={isCurlImportOpen}
        onClose={() => setIsCurlImportOpen(false)}
        onImport={handleImportCurl}
      />

      <SaveRequestModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveRequest}
        initialName={`${method} ${url.split('?')[0].split('/').pop() || 'Request'}`}
      />

      {/* Collapsible Collections & History Sidebar */}
      <CollectionsSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        savedRequests={savedRequests}
        history={history}
        onLoadSavedRequest={handleLoadSavedRequest}
        onLoadHistoryItem={handleLoadHistoryItem}
        onDeleteSavedRequest={(id) => setSavedRequests(savedRequests.filter((r) => r.id !== id))}
        onClearHistory={() => setHistory([])}
      />

      {/* Main Studio Workstation */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 pb-2 border-b border-nexus-accent/20 bg-nexus-card/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg border transition-all ${
                isSidebarOpen
                  ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-cyan'
                  : 'bg-nexus-card border-nexus-accent/20 text-nexus-muted hover:text-white'
              }`}
              title={isSidebarOpen ? 'Hide Collections Sidebar' : 'Show Collections Sidebar'}
            >
              <Layers className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent to-nexus-cyan flex items-center justify-center shadow-md">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-nexus-text flex items-center gap-2">
                  <span>API Studio & Diagnostics</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-nexus-cyan/15 text-nexus-cyan border border-nexus-cyan/30">
                    NATIVE IPC
                  </span>
                </h1>
                <p className="text-[11px] text-nexus-muted">
                  CORS-bypassed HTTP client, environment interpolation, and network diagnostics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Body: Split View (Left: Request Builder, Right: Response Panel) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden min-h-0">
          {/* Left Pane: Request Builder */}
          <div className="flex flex-col h-full overflow-hidden space-y-3">
            {/* Request Bar */}
            <RequestBar
              method={method}
              onMethodChange={setMethod}
              url={url}
              onUrlChange={handleUrlChange}
              onSend={handleSendRequest}
              isSending={isSending}
              environments={environments}
              activeEnvId={activeEnvId}
              onSelectEnv={setActiveEnvId}
              onOpenEnvModal={() => setIsEnvModalOpen(true)}
              onOpenCurlImport={() => setIsCurlImportOpen(true)}
              onExportCurl={handleExportCurl}
              onOpenSaveModal={() => setIsSaveModalOpen(true)}
              activeEnvDict={activeEnvDict}
            />

            {/* Request Tabs Header */}
            <div className="flex items-center gap-1 p-1 bg-nexus-card/70 border border-nexus-accent/20 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('params')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'params'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-bold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                <span>{t('apiStudio.tabs.params')}</span>
                {params.filter((p) => p.enabled && p.key.trim()).length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-nexus-cyan" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('headers')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'headers'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-bold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                <span>{t('apiStudio.tabs.headers')}</span>
                {headers.filter((h) => h.enabled && h.key.trim()).length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-nexus-accent" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'auth'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-bold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                <span>{t('apiStudio.tabs.auth')}</span>
                {auth.type !== 'none' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('body')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'body'
                    ? 'bg-nexus-accent/20 text-nexus-cyan border border-nexus-accent/30 font-bold'
                    : 'text-nexus-muted hover:text-white'
                }`}
              >
                <span>{t('apiStudio.tabs.body')}</span>
                {bodyType !== 'none' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'diagnostics'
                    ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 font-bold'
                    : 'text-nexus-muted hover:text-nexus-cyan'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{t('apiStudio.tabs.diagnostics')}</span>
              </button>
            </div>

            {/* Request Tab Contents */}
            <div className="flex-1 p-4 rounded-2xl bg-nexus-card border border-nexus-accent/20 overflow-y-auto">
              {activeTab === 'params' && (
                <ParamsTab params={params} onChange={handleParamsChange} />
              )}
              {activeTab === 'headers' && (
                <HeadersTab headers={headers} onChange={setHeaders} />
              )}
              {activeTab === 'auth' && <AuthTab auth={auth} onChange={setAuth} />}
              {activeTab === 'body' && (
                <BodyTab
                  bodyType={bodyType}
                  onBodyTypeChange={setBodyType}
                  bodyRaw={bodyRaw}
                  onBodyRawChange={setBodyRaw}
                  rawContentType={rawContentType}
                  onRawContentTypeChange={setRawContentType}
                  formData={formData}
                  onFormDataChange={setFormData}
                  urlEncoded={urlEncoded}
                  onUrlEncodedChange={setUrlEncoded}
                  graphqlQuery={graphqlQuery}
                  onGraphqlQueryChange={setGraphqlQuery}
                  graphqlVariables={graphqlVariables}
                  onGraphqlVariablesChange={setGraphqlVariables}
                />
              )}
              {activeTab === 'diagnostics' && <DiagnosticsTab currentUrl={url} />}
            </div>
          </div>

          {/* Right Pane: Response Inspector */}
          <div className="flex flex-col h-full overflow-hidden">
            <ResponsePanel response={response} loading={isSending} />
          </div>
        </div>
      </div>
    </div>
  )
}
