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
      removedList?: { name: string; category: string; description: string }[]
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
  system?: {
    flushDns: () => Promise<{ success: boolean; output?: string }>
    scanTemp: () => Promise<{ path: string; fileCount: number; totalBytes: number; sizeFormatted: string; error?: string }>
    cleanTemp: () => Promise<{ success: boolean; deletedCount: number; freedBytes: number; freedFormatted: string; error?: string }>
    pingHost: (host: string) => Promise<{ success: boolean; latency: number | null; host: string }>
  }
  settings?: {
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
}

declare global {
  interface Window {
    nexusAPI: NexusAPI
  }
}

export {}
