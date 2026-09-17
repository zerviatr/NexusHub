import { contextBridge, ipcRenderer } from 'electron'

// Reference counting for pubsub subscriptions to avoid premature unsubscribing from backend
const pubsubRefs = new Map<string, number>()

// Typed API surface exposed to the renderer via contextBridge
const nexusAPI = {
  // PubSub Engine
  pubsub: {
    publish: (topic: string, data: any) => ipcRenderer.send('pubsub:publish', topic, data),
    subscribe: (topic: string, cb: (data: any) => void) => {
      const handler = (_: any, incomingTopic: string, data: any) => {
        if (incomingTopic === topic) cb(data)
      }
      ipcRenderer.on('pubsub:message', handler)

      const count = pubsubRefs.get(topic) || 0
      if (count === 0) {
        ipcRenderer.send('pubsub:subscribe', topic)
      }
      pubsubRefs.set(topic, count + 1)

      return () => {
        ipcRenderer.removeListener('pubsub:message', handler)
        const newCount = (pubsubRefs.get(topic) || 1) - 1
        pubsubRefs.set(topic, newCount)
        if (newCount === 0) {
          ipcRenderer.send('pubsub:unsubscribe', topic)
        }
      }
    },
  },

  // Tool IPC
  bypassLink: (url: string) => ipcRenderer.invoke('link:bypass', url),
  decrypter: {
    clean: (url: string) => ipcRenderer.invoke('decrypter:clean', url),
    cleanBatch: (urls: string[]) => ipcRenderer.invoke('decrypter:cleanBatch', urls),
  },
  organizer: {
    selectDir: () => ipcRenderer.invoke('organizer:selectDir'),
    scan: (dirPath: string) => ipcRenderer.invoke('organizer:scan', dirPath),
    execute: (operations: any[]) => ipcRenderer.invoke('organizer:execute', operations),
    canUndo: () => ipcRenderer.invoke('organizer:canUndo'),
    undo: () => ipcRenderer.invoke('organizer:undo'),
  },

  // Network Tools
  network: {
    ipLookup: (host: string) => ipcRenderer.invoke('network:ipLookup', host),
    dnsQuery: (host: string, type: string) => ipcRenderer.invoke('network:dnsQuery', host, type),
    portScan: (host: string, ports: number[]) =>
      ipcRenderer.invoke('network:portScan', host, ports),
    ping: (host: string) => ipcRenderer.invoke('network:ping', host),
    sslInspect: (host: string, port?: number) => ipcRenderer.invoke('network:sslInspect', host, port),
    myIp: () => ipcRenderer.invoke('network:myIp'),
  },

  // Image Toolkit
  image: {
    selectFiles: () => ipcRenderer.invoke('image:selectFiles'),
    getMetadata: (filePath: string) => ipcRenderer.invoke('image:getMetadata', filePath),
    process: (jobs: any[]) => ipcRenderer.invoke('image:process', jobs),
  },

  // Sentinel (Hardware & Process Monitor)
  sentinel: {
    getStats: () => ipcRenderer.invoke('sentinel:getStats'),
    optimizeMemory: () => ipcRenderer.invoke('sentinel:optimizeMemory'),
  },

  // Cyber Fortress & Secure Shredder
  fortress: {
    selectFile: () => ipcRenderer.invoke('fortress:selectFile'),
    shredFile: (filePath: string) => ipcRenderer.invoke('fortress:shredFile', filePath),
    encryptFile: (payload: { filePath: string; passphrase: string }) =>
      ipcRenderer.invoke('fortress:encryptFile', payload),
    decryptFile: (payload: { filePath: string; passphrase: string }) =>
      ipcRenderer.invoke('fortress:decryptFile', payload),
  },

  // PDF Toolkit
  pdf: {
    selectFiles: (allowMultiple?: boolean) => ipcRenderer.invoke('pdf:selectFiles', allowMultiple),
    inspectFiles: (filePaths: string[]) => ipcRenderer.invoke('pdf:inspectFiles', filePaths),
    merge: (payload: { filePaths: string[]; outputFileName?: string }) =>
      ipcRenderer.invoke('pdf:merge', payload),
    split: (payload: { filePath: string; pageRange: string }) =>
      ipcRenderer.invoke('pdf:split', payload),
  },

  // ─── License & Activation ─────────────────────────────────────────────────
  license: {
    /** Check persisted license on startup. Returns status + tier if active. */
    check:      ()           => ipcRenderer.invoke('license:check'),
    /** Validate and store a license key. Returns success/failure + reason. */
    activate:   (key: string) => ipcRenderer.invoke('license:activate', key),
    /** Clear stored license (deactivate this machine). */
    deactivate: ()           => ipcRenderer.invoke('license:deactivate'),
    /** 24h background heartbeat — verify key+device against server. */
    bgVerify:   ()           => ipcRenderer.invoke('license:bgVerify'),
    /** Listen for remote revocation event */
    onRevoked:  (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('license:revoked', handler)
      return () => ipcRenderer.removeListener('license:revoked', handler)
    },
  },

  // ─── Auto-updater events (subscribe pattern → returns cleanup fn) ─────────
  updater: {
    onAvailable:  (cb: (info: unknown) => void) => {
      const handler = (_: any, i: unknown) => cb(i)
      ipcRenderer.on('updater:available', handler)
      return () => ipcRenderer.removeListener('updater:available', handler)
    },
    onProgress:   (cb: (p: unknown) => void) => {
      const handler = (_: any, p: unknown) => cb(p)
      ipcRenderer.on('updater:progress', handler)
      return () => ipcRenderer.removeListener('updater:progress', handler)
    },
    onDownloaded: (cb: (info: unknown) => void) => {
      const handler = (_: any, i: unknown) => cb(i)
      ipcRenderer.on('updater:downloaded', handler)
      return () => ipcRenderer.removeListener('updater:downloaded', handler)
    },
    onNotAvailable: (cb: (info: unknown) => void) => {
      const handler = (_: any, i: unknown) => cb(i)
      ipcRenderer.on('updater:not-available', handler)
      return () => ipcRenderer.removeListener('updater:not-available', handler)
    },
    onError: (cb: (err: string) => void) => {
      const handler = (_: any, msg: string) => cb(msg)
      ipcRenderer.on('updater:error', handler)
      return () => ipcRenderer.removeListener('updater:error', handler)
    },
    onApplyingPatch: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('updater:applying-patch', handler)
      return () => ipcRenderer.removeListener('updater:applying-patch', handler)
    },
    installNow: () => ipcRenderer.send('updater:install-now'),
    checkNow:   () => ipcRenderer.invoke('updater:check-now'),
  },

  // Shell & App
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getVersion:   () => ipcRenderer.invoke('app:getVersion'),

  // Window controls
  minimize:            () => ipcRenderer.send('window:minimize'),
  maximize:            () => ipcRenderer.send('window:maximize'),
  close:               () => ipcRenderer.send('window:close'),
  isMaximized:         () => ipcRenderer.invoke('window:isMaximized'),
  toggleAlwaysOnTop:   () => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  isAlwaysOnTop:       () => ipcRenderer.invoke('window:isAlwaysOnTop'),

  // Desktop integration & navigation events
  onNavigate: (cb: (path: string) => void) => {
    const handler = (_: any, path: string) => cb(path)
    ipcRenderer.on('navigate:to', handler)
    return () => ipcRenderer.removeListener('navigate:to', handler)
  },
  onPaletteToggle: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('palette:toggle', handler)
    return () => ipcRenderer.removeListener('palette:toggle', handler)
  },
  onHudToggle: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('hud:toggle', handler)
    return () => ipcRenderer.removeListener('hud:toggle', handler)
  },
  onVisibilityChange: (cb: (visible: boolean) => void) => {
    const handler = (_: any, visible: boolean) => cb(visible)
    ipcRenderer.on('app:visibility-change', handler)
    return () => ipcRenderer.removeListener('app:visibility-change', handler)
  },
  onMemorySweep: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('app:memory-sweep', handler)
    return () => ipcRenderer.removeListener('app:memory-sweep', handler)
  },
  memorySweep: () => ipcRenderer.invoke('app:memorySweep'),

  // System Settings
  settings: {
    getAutoLaunch: () => ipcRenderer.invoke('settings:getAutoLaunch'),
    setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('settings:setAutoLaunch', enable),
  },

  // Safe Storage (OS Keychain / DPAPI Encryption)
  safeStorage: {
    isAvailable: () => ipcRenderer.invoke('safe-storage:is-available'),
    encrypt: (plainText: string) => ipcRenderer.invoke('safe-storage:encrypt', plainText),
    decrypt: (cipherText: string) => ipcRenderer.invoke('safe-storage:decrypt', cipherText),
    store: (key: string, value: string) => ipcRenderer.invoke('safe-storage:store', key, value),
    retrieve: (key: string) => ipcRenderer.invoke('safe-storage:retrieve', key),
    delete: (key: string) => ipcRenderer.invoke('safe-storage:delete', key),
  },

  // Outbound Network Dispatcher & Diagnostics (API Studio)
  net: {
    dispatchRequest: (options: any) => ipcRenderer.invoke('net:dispatchRequest', options),
    dnsLookup: (host: string) => ipcRenderer.invoke('net:dnsLookup', host),
    tcpPing: (host: string, port: number, timeoutMs?: number) =>
      ipcRenderer.invoke('net:tcpPing', host, port, timeoutMs),
    sslCheck: (host: string, port?: number) => ipcRenderer.invoke('net:sslCheck', host, port),
  },

  // Tamper-Evident Activity Feed & Audit Journal
  journal: {
    record: (entry: any) => ipcRenderer.invoke('journal:record', entry),
    query: (params?: any) => ipcRenderer.invoke('journal:query', params),
    clear: () => ipcRenderer.invoke('journal:clear'),
    verifyChain: () => ipcRenderer.invoke('journal:verifyChain'),
    export: (format: 'json' | 'csv', filter?: any) => ipcRenderer.invoke('journal:export', format, filter),
    getStats: () => ipcRenderer.invoke('journal:getStats'),
    onActivity: (cb: (entry: any) => void) => {
      const handler = (_: any, entry: any) => cb(entry)
      ipcRenderer.on('journal:new-entry', handler)
      return () => ipcRenderer.removeListener('journal:new-entry', handler)
    },
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('nexusAPI', nexusAPI)
  } catch (error) {
    console.error('Failed to expose nexusAPI:', error)
  }
} else {
  // @ts-ignore — fallback for non-isolated contexts
  window.nexusAPI = nexusAPI
}

