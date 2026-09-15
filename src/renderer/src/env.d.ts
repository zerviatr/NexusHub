/// <reference types="vite/client" />

interface NexusAPI {
  bypassLink: (url: string) => Promise<{
    success: boolean
    url?: string
    intermediateUrl?: string
    alias?: string
    status?: string
    trackersRemoved?: number
    error?: string
  }>
  tempMail: {
    generate: () => Promise<{ success: boolean; email?: string; error?: string }>
    check: (email: string) => Promise<{ success: boolean; messages?: any[]; error?: string }>
    read: (email: string, id: string) => Promise<{ success: boolean; message?: any; error?: string }>
  }
  decrypter: {
    clean: (url: string) => Promise<{
      success: boolean
      originalUrl?: string
      finalUrl?: string
      cleanUrl?: string
      trackersRemoved?: number
      removedList?: { name: string; category: 'analytics' | 'social' | 'ads' | 'campaign' | 'other'; description: string }[]
      error?: string
    }>
    cleanBatch: (urls: string[]) => Promise<any[]>
  }
  organizer: {
    selectDir: () => Promise<{ canceled: boolean; filePaths: string[] }>
    scan: (dirPath: string) => Promise<{ success: boolean; files?: any[]; error?: string }>
    execute: (operations: any[]) => Promise<any>
    canUndo: () => Promise<boolean>
    undo: () => Promise<{ success: boolean; restored: number; errors: string[] }>
  }
  clipboard: {
    getHistory: () => Promise<any[]>
    clear: () => Promise<void>
    delete: (id: string) => Promise<void>
    write: (text: string) => Promise<void>
  }
  network: {
    ipLookup: (host: string) => Promise<any>
    dnsQuery: (host: string, type: string) => Promise<any>
    portScan: (host: string, ports: number[]) => Promise<any>
    ping: (host: string) => Promise<any>
    sslInspect: (host: string, port?: number) => Promise<any>
    myIp: () => Promise<any>
  }
  image: {
    selectFiles: () => Promise<string[]>
    getMetadata: (filePath: string) => Promise<any>
    process: (jobs: any[]) => Promise<any[]>
  }
  sentinel: {
    getStats: () => Promise<any>
    optimizeMemory: () => Promise<any>
  }
  fortress: {
    selectFile: () => Promise<any>
    shredFile: (filePath: string) => Promise<any>
    encryptFile: (payload: { filePath: string; passphrase: string }) => Promise<any>
    decryptFile: (payload: { filePath: string; passphrase: string }) => Promise<any>
  }
  pdf: {
    selectFiles: (allowMultiple?: boolean) => Promise<Array<{ path: string; name: string; size: number; pageCount?: number; title?: string; author?: string }>>
    inspectFiles: (filePaths: string[]) => Promise<Array<{ path: string; name: string; size: number; pageCount?: number; title?: string; author?: string; error?: string }>>
    merge: (payload: { filePaths: string[]; outputFileName?: string }) => Promise<{ success: boolean; outputPath?: string; totalCount?: number; size?: number; canceled?: boolean; error?: string }>
    split: (payload: { filePath: string; pageRange: string }) => Promise<{ success: boolean; outputPath?: string; pageCount?: number; size?: number; canceled?: boolean; error?: string }>
  }
  license: {
    check:      () => Promise<{ status: string; tier?: string; expiresAt?: number }>
    activate:   (key: string) => Promise<{ success: boolean; tier?: string; reason?: string }>
    deactivate: () => Promise<{ success: boolean }>
    bgVerify:   () => Promise<{ valid: boolean }>
    onRevoked:  (cb: () => void) => () => void
  }
  updater: {
    onAvailable:     (cb: (info: unknown) => void) => () => void
    onNotAvailable?: (cb: (info: unknown) => void) => () => void
    onProgress:      (cb: (p: unknown) => void) => () => void
    onDownloaded:    (cb: (info: unknown) => void) => () => void
    onError?:        (cb: (err: string) => void) => () => void
    onApplyingPatch?: (cb: () => void) => () => void
    installNow:      () => void
    checkNow:        () => Promise<any>
  }
  openExternal: (url: string) => Promise<void>
  getVersion?: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  toggleAlwaysOnTop?: () => Promise<boolean>
  isAlwaysOnTop?: () => Promise<boolean>
  onNavigate?: (cb: (path: string) => void) => () => void
  onPaletteToggle?: (cb: () => void) => () => void
  onHudToggle?: (cb: () => void) => () => void
  onVisibilityChange?: (cb: (visible: boolean) => void) => () => void
  onMemorySweep?: (cb: () => void) => () => void
  memorySweep?: () => Promise<{ success: boolean; freedMem?: number }>
  system: {
    flushDns: () => Promise<{ success: boolean; output?: string }>
    scanTemp: () => Promise<{ path: string; fileCount: number; totalBytes: number; sizeFormatted: string; error?: string }>
    cleanTemp: () => Promise<{ success: boolean; deletedCount: number; freedBytes: number; freedFormatted: string; error?: string }>
    pingHost: (host: string) => Promise<{ success: boolean; latency: number | null; host: string }>
    optimizeAll?: () => Promise<{ success: boolean; dnsFlushed: boolean; deletedFiles: number; freedFormatted: string; freedBytes: number; error?: string }>
  }
  settings: {
    getAutoLaunch: () => Promise<boolean>
    setAutoLaunch: (enable: boolean) => Promise<boolean>
  }
  port?: {
    scan: () => Promise<{
      success: boolean
      ports: {
        protocol: string
        localAddress: string
        port: number
        state: string
        pid: number
        processName: string
      }[]
      error?: string
    }>
    kill: (pid: number) => Promise<{ success: boolean; message?: string; error?: string }>
  }
  safeStorage?: {
    isAvailable: () => Promise<boolean>
    encrypt: (plainText: string) => Promise<string>
    decrypt: (cipherText: string) => Promise<string>
    store: (key: string, value: string) => Promise<boolean>
    retrieve: (key: string) => Promise<string | null>
    delete: (key: string) => Promise<boolean>
  }
  net?: {
    dispatchRequest: (options: {
      id?: string
      url: string
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
      headers?: Record<string, string>
      body?: string
      timeoutMs?: number
      followRedirects?: boolean
    }) => Promise<{
      status: number
      statusText: string
      headers: Record<string, string>
      data: string
      timeMs: number
      sizeBytes: number
      error?: string
    }>
    dnsLookup: (host: string) => Promise<{
      host: string
      records: Array<{ type: string; address?: string; value?: string; ttl?: number; priority?: number }>
      timeMs: number
      error?: string
    }>
    tcpPing: (host: string, port: number, timeoutMs?: number) => Promise<{
      host: string
      port: number
      open: boolean
      timeMs: number
      error?: string
    }>
    sslCheck: (host: string, port?: number) => Promise<{
      host: string
      port: number
      valid: boolean
      issuer: Record<string, string>
      subject: Record<string, string>
      validFrom: string
      validTo: string
      daysRemaining: number
      fingerprint: string
      cipher: string
      error?: string
    }>
  }
  journal?: {
    record: (entry: {
      id?: string
      sequence?: number
      timestamp?: number
      toolId: string
      action: string
      category: 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'
      status?: 'success' | 'failure' | 'warning' | 'info'
      details: string
      metadata?: Record<string, any>
      durationMs?: number
    }) => Promise<{
      success: boolean
      entry?: {
        id: string
        sequence: number
        timestamp: number
        toolId: string
        action: string
        category: 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'
        status: 'success' | 'failure' | 'warning' | 'info'
        details: string
        metadata?: Record<string, any>
        durationMs?: number
        prevHash: string
        hash: string
      }
      error?: string
    }>
    query: (params?: {
      toolId?: string
      category?: 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'
      status?: 'success' | 'failure' | 'warning' | 'info'
      search?: string
      startDate?: number
      endDate?: number
      limit?: number
      offset?: number
      order?: 'asc' | 'desc'
    }) => Promise<{
      entries: Array<{
        id: string
        sequence: number
        timestamp: number
        toolId: string
        action: string
        category: 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'
        status: 'success' | 'failure' | 'warning' | 'info'
        details: string
        metadata?: Record<string, any>
        durationMs?: number
        prevHash: string
        hash: string
      }>
      total: number
      hasMore: boolean
    }>
    clear: () => Promise<{ success: boolean; clearedCount: number; error?: string }>
    verifyChain: () => Promise<{
      valid: boolean
      totalVerified: number
      brokenIndex?: number
      brokenEntryId?: string
      brokenReason?: string
      error?: string
      expectedHash?: string
      actualHash?: string
      timestamp: number
    }>
    export: (
      format: 'json' | 'csv',
      filter?: any
    ) => Promise<{
      success: boolean
      content: string
      filename: string
      mimeType: string
      error?: string
    }>
    getStats: () => Promise<{
      totalEntries: number
      entriesByStatus: Record<'success' | 'failure' | 'warning' | 'info', number>
      entriesByCategory: Record<
        'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general',
        number
      >
      oldestTimestamp?: number
      newestTimestamp?: number
      chainValid: boolean
    }>
    onActivity: (
      cb: (entry: {
        id: string
        sequence: number
        timestamp: number
        toolId: string
        action: string
        category: 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'
        status: 'success' | 'failure' | 'warning' | 'info'
        details: string
        metadata?: Record<string, any>
        durationMs?: number
        prevHash: string
        hash: string
      }) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    nexusAPI: NexusAPI
  }
}

export {}
