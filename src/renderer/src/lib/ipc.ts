/**
 * Typed IPC wrappers for the renderer process.
 * Thin abstraction over window.nexusAPI for future extensibility.
 */

export interface BypassResult {
  success: boolean
  url?: string
  intermediateUrl?: string
  alias?: string
  status?: string
  trackersRemoved?: number
  error?: string
}

export interface RemovedTrackerInfo {
  name: string
  category: 'analytics' | 'social' | 'ads' | 'campaign' | 'other'
  description: string
}

export interface DecryptResult {
  success: boolean
  originalUrl?: string
  finalUrl?: string
  cleanUrl?: string
  trackersRemoved?: number
  removedList?: RemovedTrackerInfo[]
  error?: string
}

export interface ScannedFile {
  originalName: string
  originalPath: string
  extension: string
  size: number
  suggestedCategory: string
}

export interface FileOperation {
  oldPath: string
  newPath: string
}

export interface OrganizerExecutionResult {
  success: boolean
  successfulOperations: number
  failedOperations: number
  errors: string[]
}

export interface TempMailMessage {
  id: string
  from: string
  subject: string
  date: string
}

export interface TempMailMessageDetails extends TempMailMessage {
  attachments: { filename: string; contentType: string; size: number }[]
  body: string
  textBody: string
  htmlBody: string
}

// ── Clipboard Manager ────────────────────────────────────────────────────────

export interface ClipboardEntry {
  id: string
  text: string
  timestamp: number
  preview: string
}

// ── Network Tools ────────────────────────────────────────────────────────────

export interface IpLookupResult {
  success: boolean
  host: string
  ip?: string
  family?: number
  error?: string
}

export type DnsType = 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME'

export interface DnsQueryResult {
  success: boolean
  host: string
  type: DnsType
  records?: string[]
  error?: string
}

export interface PortStatus {
  port: number
  open: boolean
  service: string
}

export interface PortScanResult {
  success: boolean
  host: string
  ports: PortStatus[]
  error?: string
}

export interface PingResult {
  success: boolean
  host: string
  output?: string
  avgMs?: number
  minMs?: number
  maxMs?: number
  latencies?: number[]
  packetLoss?: string
  error?: string
}

export interface SslCertResult {
  success: boolean
  host: string
  subject?: { CN?: string; O?: string; C?: string }
  issuer?: { CN?: string; O?: string; C?: string }
  validFrom?: string
  validTo?: string
  daysRemaining?: number
  isExpired?: boolean
  serialNumber?: string
  fingerprint256?: string
  protocol?: string
  error?: string
}

// ── Image Toolkit ────────────────────────────────────────────────────────────

export interface ImageMeta {
  filePath: string
  name: string
  width?: number
  height?: number
  format?: string
  size: number
  error?: string
}

export interface ImageJob {
  inputPath: string
  outputDir: string
  format: 'jpeg' | 'png' | 'webp' | 'avif'
  width?: number
  height?: number
  quality: number
  stripExif: boolean
  suffix: string
}

export interface ImageProcessResult {
  inputPath: string
  outputPath: string
  success: boolean
  outputSize?: number
  error?: string
}

export interface MyIpResult {
  success: boolean
  ip?: string
  city?: string
  region?: string
  country?: string
  countryCode?: string
  org?: string
  timezone?: string
  error?: string
}

export const nexusAPI = {
  bypassLink: (url: string): Promise<BypassResult> => {
    return window.nexusAPI.bypassLink(url)
  },

  tempMail: {
    generate: () => window.nexusAPI.tempMail.generate(),
    check: (email: string) => window.nexusAPI.tempMail.check(email),
    read: (email: string, id: string) => window.nexusAPI.tempMail.read(email, id),
  },

  decrypter: {
    clean: (url: string): Promise<DecryptResult> => window.nexusAPI.decrypter.clean(url),
    cleanBatch: (urls: string[]): Promise<DecryptResult[]> => window.nexusAPI.decrypter.cleanBatch(urls),
  },

  organizer: {
    selectDir: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
      window.nexusAPI.organizer.selectDir(),
    scan: (dirPath: string): Promise<{ success: boolean; files?: ScannedFile[]; error?: string }> =>
      window.nexusAPI.organizer.scan(dirPath),
    execute: (operations: FileOperation[]): Promise<OrganizerExecutionResult> =>
      window.nexusAPI.organizer.execute(operations),
    canUndo: (): Promise<boolean> => window.nexusAPI.organizer.canUndo(),
    undo: (): Promise<{ success: boolean; restored: number; errors: string[] }> =>
      window.nexusAPI.organizer.undo(),
  },

  openExternal: (url: string): Promise<void> => {
    return window.nexusAPI.openExternal(url)
  },

  minimize: (): void => window.nexusAPI.minimize(),
  maximize: (): void => window.nexusAPI.maximize(),
  close: (): void => window.nexusAPI.close(),
  isMaximized: (): Promise<boolean> => window.nexusAPI.isMaximized(),

  // ── Clipboard Manager ──────────────────────────────────────────────────────
  clipboard: {
    getHistory: (): Promise<ClipboardEntry[]> => window.nexusAPI.clipboard.getHistory(),
    clear: (): Promise<void> => window.nexusAPI.clipboard.clear(),
    delete: (id: string): Promise<void> => window.nexusAPI.clipboard.delete(id),
    write: (text: string): Promise<void> => window.nexusAPI.clipboard.write(text),
  },

  // ── Network Tools ──────────────────────────────────────────────────────────
  network: {
    ipLookup: (host: string): Promise<IpLookupResult> => window.nexusAPI.network.ipLookup(host),
    dnsQuery: (host: string, type: DnsType): Promise<DnsQueryResult> =>
      window.nexusAPI.network.dnsQuery(host, type),
    portScan: (host: string, ports: number[]): Promise<PortScanResult> =>
      window.nexusAPI.network.portScan(host, ports),
    ping: (host: string): Promise<PingResult> => window.nexusAPI.network.ping(host),
    sslInspect: (host: string, port?: number): Promise<SslCertResult> =>
      window.nexusAPI.network.sslInspect(host, port),
    myIp: (): Promise<MyIpResult> => window.nexusAPI.network.myIp(),
  },

  // ── Image Toolkit ──────────────────────────────────────────────────────────
  image: {
    selectFiles: (): Promise<string[]> => window.nexusAPI.image.selectFiles(),
    getMetadata: (filePath: string): Promise<ImageMeta> =>
      window.nexusAPI.image.getMetadata(filePath),
    process: (jobs: ImageJob[]): Promise<ImageProcessResult[]> =>
      window.nexusAPI.image.process(jobs),
  },

  // ── Sentinel (Hardware & Process Monitor) ───────────────────────────────────
  sentinel: {
    getStats: (): Promise<any> => window.nexusAPI.sentinel.getStats(),
    optimizeMemory: (): Promise<any> => window.nexusAPI.sentinel.optimizeMemory(),
  },

  // ── Cyber Fortress (Vault & DoD Shredder) ───────────────────────────────────
  fortress: {
    selectFile: (): Promise<{ filePath: string; name: string; size: number } | null> =>
      window.nexusAPI.fortress.selectFile(),
    shredFile: (filePath: string): Promise<{ success: boolean; passes?: number; size?: number; error?: string }> =>
      window.nexusAPI.fortress.shredFile(filePath),
    encryptFile: (payload: { filePath: string; passphrase: string }): Promise<{ success: boolean; outPath?: string; name?: string; error?: string }> =>
      window.nexusAPI.fortress.encryptFile(payload),
    decryptFile: (payload: { filePath: string; passphrase: string }): Promise<{ success: boolean; outPath?: string; name?: string; error?: string }> =>
      window.nexusAPI.fortress.decryptFile(payload),
  },

  // ── System Optimizer ────────────────────────────────────────────────────────
  system: {
    flushDns: (): Promise<{ success: boolean; output: string }> => window.nexusAPI.system.flushDns(),
    scanTemp: (): Promise<{ path: string; fileCount: number; totalBytes: number; sizeFormatted: string; error?: string }> =>
      window.nexusAPI.system.scanTemp(),
    cleanTemp: (): Promise<{ success: boolean; deletedCount: number; freedBytes: number; freedFormatted: string; error?: string }> =>
      window.nexusAPI.system.cleanTemp(),
    pingHost: (host: string): Promise<{ success: boolean; latency: number | null; host: string }> =>
      window.nexusAPI.system.pingHost(host),
  },

  // ── Settings & Startup ──────────────────────────────────────────────────────
  settings: {
    getAutoLaunch: (): Promise<boolean> => window.nexusAPI.settings.getAutoLaunch(),
    setAutoLaunch: (enable: boolean): Promise<boolean> => window.nexusAPI.settings.setAutoLaunch(enable),
  },

  // ── Updater ─────────────────────────────────────────────────────────────────
  updater: {
    checkNow: (): Promise<any> => window.nexusAPI.updater.checkNow(),
    installNow: (): void => window.nexusAPI.updater.installNow(),
    onApplyingPatch: (cb: () => void): (() => void) | undefined => window.nexusAPI.updater.onApplyingPatch?.(cb),
  },
}
