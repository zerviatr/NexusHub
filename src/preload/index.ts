import { contextBridge, ipcRenderer } from 'electron'

// Typed API surface exposed to the renderer via contextBridge
const nexusAPI = {
  // Tool IPC
  bypassLink: (url: string) => ipcRenderer.invoke('link:bypass', url),
  tempMail: {
    generate: () => ipcRenderer.invoke('tempmail:generate'),
    check: (email: string) => ipcRenderer.invoke('tempmail:check', email),
    read: (email: string, id: string) => ipcRenderer.invoke('tempmail:read', email, id),
  },
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

  // Clipboard Manager
  clipboard: {
    getHistory: () => ipcRenderer.invoke('clipboard:getHistory'),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    delete: (id: string) => ipcRenderer.invoke('clipboard:delete', id),
    write: (text: string) => ipcRenderer.invoke('clipboard:write', text),
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
      ipcRenderer.on('updater:available', (_, i) => cb(i))
      return () => ipcRenderer.removeAllListeners('updater:available')
    },
    onProgress:   (cb: (p: unknown) => void) => {
      ipcRenderer.on('updater:progress', (_, p) => cb(p))
      return () => ipcRenderer.removeAllListeners('updater:progress')
    },
    onDownloaded: (cb: (info: unknown) => void) => {
      ipcRenderer.on('updater:downloaded', (_, i) => cb(i))
      return () => ipcRenderer.removeAllListeners('updater:downloaded')
    },
    onNotAvailable: (cb: (info: unknown) => void) => {
      ipcRenderer.on('updater:not-available', (_, i) => cb(i))
      return () => ipcRenderer.removeAllListeners('updater:not-available')
    },
    onError: (cb: (err: string) => void) => {
      ipcRenderer.on('updater:error', (_, msg) => cb(msg))
      return () => ipcRenderer.removeAllListeners('updater:error')
    },
    onApplyingPatch: (cb: () => void) => {
      ipcRenderer.on('updater:applying-patch', () => cb())
      return () => ipcRenderer.removeAllListeners('updater:applying-patch')
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

  // System Optimizer
  system: {
    flushDns: () => ipcRenderer.invoke('system:flushDns'),
    scanTemp: () => ipcRenderer.invoke('system:scanTemp'),
    cleanTemp: () => ipcRenderer.invoke('system:cleanTemp'),
    pingHost: (host: string) => ipcRenderer.invoke('system:pingHost', host),
    optimizeAll: () => ipcRenderer.invoke('system:optimizeAll'),
  },

  // System Settings
  settings: {
    getAutoLaunch: () => ipcRenderer.invoke('settings:getAutoLaunch'),
    setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('settings:setAutoLaunch', enable),
  },

  // Port & Process Watchdog
  port: {
    scan: () => ipcRenderer.invoke('port:scanActivePorts'),
    kill: (pid: number) => ipcRenderer.invoke('port:killProcess', pid),
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

