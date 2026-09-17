/**
 * tauriBridge.ts
 *
 * Full typed implementation of window.nexusAPI powered by Tauri v2 invoke & listen.
 * Injects window.nexusAPI before React mounts to guarantee ZERO UI CODE CHANGES.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

// Detect Tauri runtime environment
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
}

// Safe invoke wrapper with logging and fallback
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (!isTauriEnvironment()) {
    console.debug(`[TauriBridge:BrowserMock] ${cmd}`, args)
    if (fallback !== undefined) return fallback
    return undefined as unknown as T
  }
  try {
    return await invoke<T>(cmd, args)
  } catch (error: any) {
    console.error(`[TauriBridge:Error] ${cmd}:`, error)
    throw error
  }
}

// Helper for synchronous unlisten returned in React useEffect
function setupEventListener<T>(eventName: string, cb: (payload: T) => void): () => void {
  let isCleanedUp = false
  let unlistenFn: UnlistenFn | null = null

  if (isTauriEnvironment()) {
    listen<T>(eventName, (event) => {
      if (!isCleanedUp) cb(event.payload)
    }).then((fn) => {
      if (isCleanedUp) {
        fn()
      } else {
        unlistenFn = fn
      }
    }).catch(console.error)
  }

  return () => {
    isCleanedUp = true
    if (unlistenFn) {
      unlistenFn()
    }
  }
}

export const tauriNexusAPI = {
  // ── 1. Link Bypasser ──
  bypassLink: (url: string) => safeInvoke('bypass_link', { url }),

  // ── 2. Temp Mail ──
  // ── 3. Link Decrypter ──
  decrypter: {
    clean: (url: string) => safeInvoke('decrypter_clean', { url }),
    cleanBatch: (urls: string[]) => safeInvoke('decrypter_clean_batch', { urls }),
  },

  // ── 4. Bulk File Organizer ──
  organizer: {
    selectDir: () => safeInvoke('organizer_select_dir', {}, { canceled: true, filePaths: [] }),
    scan: (dirPath: string) => safeInvoke('organizer_scan', { dirPath }),
    execute: (operations: any[]) => safeInvoke('organizer_execute', { operations }),
    canUndo: () => safeInvoke('organizer_can_undo', {}, false),
    undo: () => safeInvoke('organizer_undo', {}, { success: false, restored: 0, errors: [] }),
  },

  // ── 6. Network Tools ──
  network: {
    ipLookup: (host: string) => safeInvoke('network_ip_lookup', { host }),
    dnsQuery: (host: string, type: string) => safeInvoke('network_dns_query', { host, queryType: type }),
    portScan: (host: string, ports: number[]) => safeInvoke('network_port_scan', { host, ports }),
    ping: (host: string) => safeInvoke('network_ping', { host }),
    sslInspect: (host: string, port?: number) => safeInvoke('network_ssl_inspect', { host, port }),
    myIp: () => safeInvoke('network_my_ip'),
  },

  // ── 7. Image Toolkit ──
  image: {
    selectFiles: () => safeInvoke('image_select_files', {}, []),
    getMetadata: (filePath: string) => safeInvoke('image_get_metadata', { filePath }),
    process: (jobs: any[]) => safeInvoke('image_process', { jobs }),
  },

  // ── 8. Resource Sentinel ──
  sentinel: {
    getStats: () => safeInvoke('sentinel_get_stats', {}, {
      success: true,
      cpu: { model: 'Tauri CPU', cores: 8, speed: 3000, overallLoad: 5, loadPerCore: [5, 5, 5, 5, 5, 5, 5, 5] },
      memory: { total: 16 * 1024 * 1024 * 1024, free: 8 * 1024 * 1024 * 1024, used: 8 * 1024 * 1024 * 1024, percentUsed: 50 },
      os: { platform: 'tauri', arch: 'x64', release: '2.0.0', hostname: 'localhost', uptime: 1000 },
    }),
    optimizeMemory: () => safeInvoke('sentinel_optimize_memory', {}, { success: true, freeMem: 8 * 1024 * 1024 * 1024 }),
  },

  // ── 9. Cyber Fortress & Shredder ──
  fortress: {
    selectFile: () => safeInvoke('fortress_select_file', {}, null),
    shredFile: (filePath: string) => safeInvoke('fortress_shred_file', { filePath }),
    encryptFile: (payload: { filePath: string; passphrase: string }) =>
      safeInvoke('fortress_encrypt_file', { filePath: payload.filePath, passphrase: payload.passphrase }),
    decryptFile: (payload: { filePath: string; passphrase: string }) =>
      safeInvoke('fortress_decrypt_file', { filePath: payload.filePath, passphrase: payload.passphrase }),
  },

  // ── 10. PDF Toolkit ──
  pdf: {
    selectFiles: (allowMultiple?: boolean) => safeInvoke('pdf_select_files', { allowMultiple }, []),
    inspectFiles: (filePaths: string[]) => safeInvoke('pdf_inspect_files', { filePaths }, []),
    merge: (payload: { filePaths: string[]; outputFileName?: string }) =>
      safeInvoke('pdf_merge', { filePaths: payload.filePaths, outputFileName: payload.outputFileName }),
    split: (payload: { filePath: string; pageRange: string }) =>
      safeInvoke('pdf_split', { filePath: payload.filePath, pageRange: payload.pageRange }),
  },

  // ── 11. License & Activation ──
  license: {
    check: () => safeInvoke('license_check', {}, { status: 'active', tier: 'pro', expiresAt: 0, key: 'PRO-TAURI-MIGRATION' }),
    activate: (key: string) => safeInvoke('license_activate', { key }, { success: true, tier: 'pro', expiresAt: 0 }),
    deactivate: () => safeInvoke('license_deactivate', {}, { success: true }),
    bgVerify: () => safeInvoke('license_bg_verify', {}, { valid: true }),
    onRevoked: (cb: () => void) => setupEventListener('license:revoked', cb),
  },

  // ── 12. Updater ──
  updater: {
    checkNow: () => safeInvoke('updater_check_now', {}, { hasUpdate: false, isLatest: true, currentVersion: '2.4.2' }),
    installNow: () => { safeInvoke('updater_install_now') },
    onAvailable: (cb: (info: unknown) => void) => setupEventListener('updater:available', cb),
    onNotAvailable: (cb: (info: unknown) => void) => setupEventListener('updater:not-available', cb),
    onProgress: (cb: (p: unknown) => void) => setupEventListener('updater:progress', cb),
    onDownloaded: (cb: (info: unknown) => void) => setupEventListener('updater:downloaded', cb),
    onError: (cb: (err: string) => void) => setupEventListener('updater:error', cb),
    onApplyingPatch: (cb: () => void) => setupEventListener('updater:applying-patch', cb),
  },

  // ── 14. Settings ──
  settings: {
    getAutoLaunch: () => safeInvoke('settings_get_auto_launch', {}, false),
    setAutoLaunch: (enable: boolean) => safeInvoke('settings_set_auto_launch', { enable }, true),
  },

  // ── 16. Safe Storage ──
  safeStorage: {
    isAvailable: () => safeInvoke('safe_storage_is_available', {}, true),
    encrypt: (plainText: string) => safeInvoke('safe_storage_encrypt', { plainText }, btoa(plainText)),
    decrypt: (cipherText: string) => safeInvoke('safe_storage_decrypt', { cipherText }, atob(cipherText)),
    store: (key: string, value: string) => safeInvoke('safe_storage_store', { key, value }, true),
    retrieve: (key: string) => safeInvoke('safe_storage_retrieve', { key }, null),
    delete: (key: string) => safeInvoke('safe_storage_delete', { key }, true),
  },

  // ── 17. Outbound Network Dispatcher (API Studio) ──
  net: {
    dispatchRequest: (options: any) => safeInvoke('net_dispatch_request', { options }),
    dnsLookup: (host: string) => safeInvoke('net_dns_lookup', { host }),
    tcpPing: (host: string, port: number, timeoutMs?: number) =>
      safeInvoke('net_tcp_ping', { host, port, timeoutMs }),
    sslCheck: (host: string, port?: number) => safeInvoke('net_ssl_check', { host, port }),
  },

  // ── 18. Activity Journal ──
  journal: {
    record: (entry: any) => safeInvoke('journal_record', { entry }),
    query: (params?: any) => safeInvoke('journal_query', { params }, { entries: [], total: 0, hasMore: false }),
    clear: () => safeInvoke('journal_clear', {}, { success: true, clearedCount: 0 }),
    verifyChain: () => safeInvoke('journal_verify_chain', {}, { valid: true, totalVerified: 0, timestamp: Date.now() }),
    export: (format: 'json' | 'csv', filter?: any) => safeInvoke('journal_export', { format, filter }, {
      success: true,
      content: '',
      filename: 'export.json',
      mimeType: 'application/json',
    }),
    getStats: () => safeInvoke('journal_get_stats', {}, {
      totalEntries: 0,
      entriesByStatus: { success: 0, failure: 0, warning: 0, info: 0 },
      entriesByCategory: { security: 0, network: 0, system: 0, file: 0, crypto: 0, api: 0, general: 0 },
      chainValid: true,
    }),
    onActivity: (cb: (entry: any) => void) => setupEventListener('journal:new-entry', cb),
  },

  // ── 19. Pub/Sub ──
  pubsub: {
    publish: (topic: string, data: any) => { safeInvoke('pubsub_publish', { topic, data }) },
    subscribe: (topic: string, cb: (data: any) => void) => {
      safeInvoke('pubsub_subscribe', { topic }).catch(() => {})
      return setupEventListener(`pubsub:message:${topic}`, cb)
    },
  },

  // ── 20. Window & Desktop Integration ──
  openExternal: (url: string) => safeInvoke('open_external', { url }),
  getVersion: () => safeInvoke('app_get_version', {}, '2.4.2'),
  minimize: () => { safeInvoke('window_minimize') },
  maximize: () => { safeInvoke('window_maximize') },
  close: () => { safeInvoke('window_close') },
  isMaximized: () => safeInvoke<boolean>('window_is_maximized', {}, false),
  toggleAlwaysOnTop: () => safeInvoke<boolean>('window_toggle_always_on_top', {}, false),
  isAlwaysOnTop: () => safeInvoke<boolean>('window_is_always_on_top', {}, false),
  onNavigate: (cb: (path: string) => void) => setupEventListener('navigate:to', cb),
  onPaletteToggle: (cb: () => void) => setupEventListener('palette:toggle', cb),
  onHudToggle: (cb: () => void) => setupEventListener('hud:toggle', cb),
  onVisibilityChange: (cb: (visible: boolean) => void) => setupEventListener('app:visibility-change', cb),
  onMemorySweep: (cb: () => void) => setupEventListener('app:memory-sweep', cb),
  memorySweep: () => safeInvoke('app_memory_sweep', {}, { success: true }),
}

// Global injection
if (typeof window !== 'undefined') {
  ;(window as any).nexusAPI = tauriNexusAPI
}
