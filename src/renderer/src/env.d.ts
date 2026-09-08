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
      error?: string
    }>
  }
  organizer: {
    selectDir: () => Promise<{ canceled: boolean; filePaths: string[] }>
    scan: (dirPath: string) => Promise<{ success: boolean; files?: any[]; error?: string }>
    execute: (operations: any[]) => Promise<any>
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
  }
  image: {
    selectFiles: () => Promise<string[]>
    getMetadata: (filePath: string) => Promise<any>
    process: (jobs: any[]) => Promise<any[]>
  }
  license: {
    check:      () => Promise<{ status: string; tier?: string; expiresAt?: number }>
    activate:   (key: string) => Promise<{ success: boolean; tier?: string; reason?: string }>
    deactivate: () => Promise<{ success: boolean }>
    bgVerify:   () => Promise<{ valid: boolean }>
    onRevoked:  (cb: () => void) => () => void
  }
  updater: {
    onAvailable:  (cb: (info: unknown) => void) => () => void
    onProgress:   (cb: (p: unknown) => void) => () => void
    onDownloaded: (cb: (info: unknown) => void) => () => void
    installNow: () => void
    checkNow:   () => Promise<unknown>
  }
  openExternal: (url: string) => Promise<void>
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onNavigate?: (cb: (path: string) => void) => () => void
  onPaletteToggle?: (cb: () => void) => () => void
  settings?: {
    getAutoLaunch: () => Promise<boolean>
    setAutoLaunch: (enable: boolean) => Promise<boolean>
  }
}

declare global {
  interface Window {
    nexusAPI: NexusAPI
  }
}

export {}
