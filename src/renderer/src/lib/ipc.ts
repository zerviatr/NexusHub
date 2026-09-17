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

// ── Activity Feed & Audit Journal ───────────────────────────────────────────

export type ActivityCategory =
  | 'security'
  | 'network'
  | 'system'
  | 'file'
  | 'crypto'
  | 'api'
  | 'general'

export type ActivityStatus = 'success' | 'failure' | 'warning' | 'info'

export interface ActivityEntry {
  id: string
  sequence: number
  timestamp: number
  toolId: string
  action: string
  category: ActivityCategory
  status: ActivityStatus
  details: string
  metadata?: Record<string, any>
  durationMs?: number
  prevHash: string
  hash: string
}

export type NewActivityEntry = Omit<ActivityEntry, 'id' | 'sequence' | 'timestamp' | 'hash' | 'prevHash'> & {
  id?: string
  sequence?: number
  timestamp?: number
  durationMs?: number
}

export interface JournalQueryParams {
  toolId?: string
  category?: ActivityCategory
  status?: ActivityStatus
  search?: string
  startDate?: number
  endDate?: number
  limit?: number
  offset?: number
  order?: 'asc' | 'desc'
}

export interface JournalQueryResponse {
  entries: ActivityEntry[]
  total: number
  hasMore: boolean
}

export interface AuditVerificationResult {
  valid: boolean
  totalVerified: number
  brokenIndex?: number
  brokenEntryId?: string
  brokenReason?: string
  error?: string
  expectedHash?: string
  actualHash?: string
  timestamp: number
}

export interface JournalStatsResult {
  totalEntries: number
  entriesByStatus: Record<ActivityStatus, number>
  entriesByCategory: Record<ActivityCategory, number>
  oldestTimestamp?: number
  newestTimestamp?: number
  chainValid: boolean
}

export interface JournalExportResult {
  success: boolean
  content: string
  filename: string
  mimeType: string
  error?: string
}

export const nexusAPI = {
  bypassLink: (url: string): Promise<BypassResult> => {
    return window.nexusAPI.bypassLink(url)
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

  // ── PDF Toolkit ─────────────────────────────────────────────────────────────
  pdf: {
    selectFiles: (allowMultiple?: boolean) => window.nexusAPI.pdf.selectFiles(allowMultiple),
    inspectFiles: (filePaths: string[]) => window.nexusAPI.pdf.inspectFiles(filePaths),
    merge: (payload: { filePaths: string[]; outputFileName?: string }) => window.nexusAPI.pdf.merge(payload),
    split: (payload: { filePath: string; pageRange: string }) => window.nexusAPI.pdf.split(payload),
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

  // ── Tamper-Evident Activity Feed & Audit Journal ───────────────────────────
  journal: {
    record: (
      entry: NewActivityEntry
    ): Promise<{ success: boolean; entry?: ActivityEntry; error?: string }> =>
      window.nexusAPI?.journal?.record
        ? window.nexusAPI.journal.record(entry)
        : Promise.resolve({ success: false, error: 'Journal IPC unavailable' }),

    query: (params?: JournalQueryParams): Promise<JournalQueryResponse> =>
      window.nexusAPI?.journal?.query
        ? window.nexusAPI.journal.query(params)
        : Promise.resolve({ entries: [], total: 0, hasMore: false }),

    clear: (): Promise<{ success: boolean; clearedCount: number; error?: string }> =>
      window.nexusAPI?.journal?.clear
        ? window.nexusAPI.journal.clear()
        : Promise.resolve({ success: false, clearedCount: 0, error: 'Journal IPC unavailable' }),

    verifyChain: (): Promise<AuditVerificationResult> =>
      window.nexusAPI?.journal?.verifyChain
        ? window.nexusAPI.journal.verifyChain()
        : Promise.resolve({ valid: true, totalVerified: 0, timestamp: Date.now() }),

    export: (
      format: 'json' | 'csv',
      filter?: JournalQueryParams
    ): Promise<JournalExportResult> =>
      window.nexusAPI?.journal?.export
        ? window.nexusAPI.journal.export(format, filter)
        : Promise.resolve({
            success: false,
            content: '',
            filename: '',
            mimeType: '',
            error: 'Journal IPC unavailable'
          }),

    getStats: (): Promise<JournalStatsResult> =>
      window.nexusAPI?.journal?.getStats
        ? window.nexusAPI.journal.getStats()
        : Promise.resolve({
            totalEntries: 0,
            entriesByStatus: { success: 0, failure: 0, warning: 0, info: 0 },
            entriesByCategory: {
              security: 0,
              network: 0,
              system: 0,
              file: 0,
              crypto: 0,
              api: 0,
              general: 0
            },
            chainValid: true
          }),

    onActivity: (cb: (entry: ActivityEntry) => void): (() => void) => {
      if (window.nexusAPI?.journal?.onActivity) {
        return window.nexusAPI.journal.onActivity(cb)
      }
      return () => {}
    }
  },

  // ── Desktop Lifecycle & Memory Sweep ───────────────────────────────────────
  onVisibilityChange: (cb: (visible: boolean) => void): (() => void) => {
    return window.nexusAPI?.onVisibilityChange?.(cb) ?? (() => {})
  },
  onMemorySweep: (cb: () => void): (() => void) => {
    return window.nexusAPI?.onMemorySweep?.(cb) ?? (() => {})
  },
  memorySweep: (): Promise<{ success: boolean; freedMem?: number }> => {
    return window.nexusAPI?.memorySweep?.() ?? Promise.resolve({ success: true })
  },
}
