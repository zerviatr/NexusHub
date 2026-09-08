import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  Server,
  Radio,
  Terminal,
  ChevronDown,
  MapPin,
  Copy,
  Check,
  RefreshCw,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import {
  nexusAPI,
  IpLookupResult,
  DnsQueryResult,
  PortScanResult,
  PingResult,
  DnsType,
  MyIpResult,
  SslCertResult,
} from '../lib/ipc'
import { useT } from '../lib/i18n'
import { useToast } from '../lib/ToastContext'

type Tab = 'myip' | 'ip' | 'dns' | 'port' | 'ping' | 'ssl'

const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389, 5432, 5900, 6379, 8080, 27017]
const DNS_TYPES: DnsType[] = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME']

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'myip', label: 'Public IP', icon: MapPin },
  { id: 'ip', label: 'IP Lookup', icon: Globe },
  { id: 'dns', label: 'DNS Query', icon: Server },
  { id: 'port', label: 'Port Scan', icon: Radio },
  { id: 'ping', label: 'Ping & Latency Wave', icon: Wifi },
  { id: 'ssl', label: 'SSL Inspector', icon: Lock },
]

function StatusBadge({ open }: { open: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        open ? 'bg-nexus-success/10 text-nexus-success' : 'bg-red-500/10 text-red-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-nexus-success animate-pulse' : 'bg-red-500'}`}
      />
      {open ? 'Açık' : 'Kapalı'}
    </span>
  )
}

export default function NetworkTools() {
  const { t } = useT()
  const { success: showToastSuccess, error: showToastError } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>('ip')
  const [host, setHost] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // DNS
  const [dnsType, setDnsType] = useState<DnsType>('A')
  const [dnsResult, setDnsResult] = useState<DnsQueryResult | null>(null)

  // IP
  const [ipResult, setIpResult] = useState<IpLookupResult | null>(null)

  // Port
  const [selectedPorts, setSelectedPorts] = useState<number[]>([80, 443, 22, 3306])
  const [customPorts, setCustomPorts] = useState('')
  const [portResult, setPortResult] = useState<PortScanResult | null>(null)

  // Ping
  const [pingResult, setPingResult] = useState<PingResult | null>(null)

  // SSL Inspector
  const [sslResult, setSslResult] = useState<SslCertResult | null>(null)
  const [copiedFingerprint, setCopiedFingerprint] = useState(false)

  // My IP
  const [myIpResult, setMyIpResult] = useState<MyIpResult | null>(null)
  const [isDetectingIp, setIsDetectingIp] = useState(false)
  const [copiedIp, setCopiedIp] = useState(false)

  const detectMyIp = async () => {
    setIsDetectingIp(true)
    try {
      const res = await nexusAPI.network.myIp()
      setMyIpResult(res)
    } catch (err: any) {
      setMyIpResult({ success: false, error: err.message || 'Detection failed' })
    } finally {
      setIsDetectingIp(false)
    }
  }

  const handleCopyIp = () => {
    if (myIpResult?.ip) {
      navigator.clipboard.writeText(myIpResult.ip)
      setCopiedIp(true)
      showToastSuccess('Kopyalandı', 'IP adresi panoya kopyalandı.')
      setTimeout(() => setCopiedIp(false), 2000)
    }
  }

  const handleCopyFingerprint = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedFingerprint(true)
    showToastSuccess('Kopyalandı', 'SHA-256 parmak izi kopyalandı.')
    setTimeout(() => setCopiedFingerprint(false), 2000)
  }

  const clearResults = () => {
    setIpResult(null)
    setDnsResult(null)
    setPortResult(null)
    setPingResult(null)
    setSslResult(null)
  }

  const handleRun = async () => {
    if (!host.trim() || isLoading) return
    setIsLoading(true)
    clearResults()
    try {
      if (activeTab === 'ip') {
        const r = await nexusAPI.network.ipLookup(host.trim())
        setIpResult(r)
      } else if (activeTab === 'dns') {
        const r = await nexusAPI.network.dnsQuery(host.trim(), dnsType)
        setDnsResult(r)
      } else if (activeTab === 'port') {
        let ports = [...selectedPorts]
        if (customPorts.trim()) {
          const extra = customPorts.split(/[,\s]+/).map(Number).filter((n) => n > 0 && n <= 65535)
          ports = [...new Set([...ports, ...extra])].slice(0, 50)
        }
        const r = await nexusAPI.network.portScan(host.trim(), ports)
        setPortResult(r)
      } else if (activeTab === 'ping') {
        const r = await nexusAPI.network.ping(host.trim())
        setPingResult(r)
      } else if (activeTab === 'ssl') {
        const r = await nexusAPI.network.sslInspect(host.trim())
        setSslResult(r)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRun()
  }

  const togglePort = (port: number) => {
    setSelectedPorts((prev) =>
      prev.includes(port) ? prev.filter((p) => p !== port) : [...prev, port]
    )
  }

  const currentResult = ipResult || dnsResult || portResult || pingResult || sslResult
  const isSuccess = currentResult?.success

  return (
    <BaseToolTemplate
      icon={Globe}
      title={t('nav.tools.networkTools') || 'Network Tools & Diagnostic'}
      description={
        t('dashboard.tools.networkTools.desc') ||
        'IP çözümleme, DNS sorgusu, port taraması, canlı ping dalgası ve SSL sertifika denetimi.'
      }
      gradient="from-emerald-500 to-cyan-600"
    >
      {/* Tab bar */}
      <div className="flex gap-1.5 mb-5 p-1 bg-nexus-card rounded-xl border border-nexus-border/50 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`net-tab-${id}`}
            onClick={() => {
              setActiveTab(id)
              clearResults()
              if (id === 'myip' && !myIpResult) detectMyIp()
            }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-md'
                : 'text-nexus-muted hover:text-nexus-text'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: MY PUBLIC IP & GEOLOCATION ─── */}
      {activeTab === 'myip' && (
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-nexus-cyan" />
              <h3 className="text-sm font-semibold text-white">Public IP & Taşıyıcı İstihbaratı</h3>
            </div>
            <button
              type="button"
              onClick={detectMyIp}
              disabled={isDetectingIp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/50 text-xs font-medium text-nexus-text hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-nexus-cyan ${isDetectingIp ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>

          {isDetectingIp ? (
            <div className="py-12 flex flex-col items-center justify-center text-nexus-muted space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-nexus-cyan" />
              <span className="text-xs">Dış IP ve ISS rota bilgisi alınıyor...</span>
            </div>
          ) : myIpResult?.success ? (
            <div className="space-y-6">
              {/* Primary IP Hero Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-nexus-cyan/10 to-nexus-accent/5 border border-nexus-cyan/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-nexus-muted uppercase tracking-widest font-mono font-semibold">
                    Genel IPv4 / IPv6 Adresiniz
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-wide mt-1">
                    {myIpResult.ip || '—'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyIp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nexus-cyan/20 hover:bg-nexus-cyan/30 text-nexus-cyan border border-nexus-cyan/30 text-xs font-semibold transition-all"
                >
                  {copiedIp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedIp ? 'Kopyalandı' : 'IP Kopyala'}</span>
                </button>
              </div>

              {/* Geo Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Ülke', value: myIpResult.country ? `${myIpResult.country} (${myIpResult.countryCode})` : null },
                  { label: 'Bölge / Şehir', value: [myIpResult.region, myIpResult.city].filter(Boolean).join(', ') || null },
                  { label: 'İSS / Operatör', value: myIpResult.org },
                  { label: 'Zaman Dilimi', value: myIpResult.timezone },
                ].map(
                  ({ label, value }) =>
                    value && (
                      <div key={label} className="p-3.5 rounded-xl bg-nexus-surface/50 border border-white/5">
                        <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">{label}</p>
                        <p className="text-xs font-medium text-white mt-1 truncate">{value}</p>
                      </div>
                    )
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-rose-400">
              {myIpResult?.error || 'Genel IP bilgisi çözümlenemedi.'}
            </div>
          )}
        </div>
      )}

      {/* Host input (for other tabs) */}
      {activeTab !== 'myip' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted" />
              <input
                id="net-host-input"
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTab === 'port'
                    ? 'example.com veya 1.2.3.4'
                    : activeTab === 'ssl'
                    ? 'example.com (https:// olmadan)'
                    : 'Sunucu adı veya IP...'
                }
                className="w-full bg-nexus-card border border-nexus-border rounded-xl pl-9 pr-4 py-3 text-sm text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            {/* DNS type selector */}
            {activeTab === 'dns' && (
              <div className="relative">
                <select
                  value={dnsType}
                  onChange={(e) => setDnsType(e.target.value as DnsType)}
                  className="appearance-none bg-nexus-card border border-nexus-border rounded-xl px-4 py-3 pr-8 text-sm text-nexus-text focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  {DNS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-muted pointer-events-none" />
              </div>
            )}

            <motion.button
              id="net-run-btn"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRun}
              disabled={isLoading || !host.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sorgula</span>}
            </motion.button>
          </div>

          {/* Port selector */}
          {activeTab === 'port' && (
            <div className="glass-card p-4 mb-4 space-y-3">
              <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
                Yaygın Portlar (Açıp kapatmak için tıklayın)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PORTS.map((port) => (
                  <button
                    key={port}
                    onClick={() => togglePort(port)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      selectedPorts.includes(port)
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-nexus-card border border-nexus-border text-nexus-muted hover:text-nexus-text'
                    }`}
                  >
                    {port}
                  </button>
                ))}
              </div>
              <input
                placeholder="Özel portlar: 8443, 9200, 5601..."
                value={customPorts}
                onChange={(e) => setCustomPorts(e.target.value)}
                className="w-full bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-xs text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          )}
        </>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {(isLoading || currentResult) && (
          <motion.div
            key={activeTab + String(isLoading)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-5"
          >
            {isLoading ? (
              <div className="flex items-center gap-3 text-nexus-muted py-4">
                <Loader2 className="w-4 h-4 animate-spin text-nexus-cyan" />
                <span className="text-sm">Hedef analiz ediliyor, lütfen bekleyin...</span>
              </div>
            ) : !isSuccess ? (
              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">İşlem Başarısız Oldu</p>
                  <p className="text-xs text-nexus-muted">
                    {(currentResult as any)?.error || 'Bilinmeyen ağ hatası.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-nexus-success text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sorgu Sonucu</span>
                  </div>
                  <span className="text-[11px] font-mono text-nexus-muted">{host}</span>
                </div>

                {/* IP Lookup result */}
                {ipResult?.success && (
                  <div className="space-y-2">
                    {[
                      { label: 'Host', value: ipResult.host },
                      { label: 'IP Adresi', value: ipResult.ip },
                      { label: 'IP Ailesi', value: ipResult.family === 4 ? 'IPv4' : 'IPv6' },
                    ].map(
                      ({ label, value }) =>
                        value && (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-[10px] text-nexus-muted uppercase tracking-widest w-24 shrink-0">
                              {label}
                            </span>
                            <span className="text-sm text-white font-mono">{value}</span>
                          </div>
                        )
                    )}
                  </div>
                )}

                {/* DNS result */}
                {dnsResult?.success && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-nexus-muted uppercase tracking-widest w-24 shrink-0">
                        Tür
                      </span>
                      <span className="text-sm text-white font-mono">{dnsResult.type}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-nexus-muted uppercase tracking-widest">
                        Kayıtlar ({dnsResult.records?.length ?? 0})
                      </span>
                      <div className="space-y-1 mt-1">
                        {dnsResult.records?.map((r, i) => (
                          <div
                            key={i}
                            className="font-mono text-sm text-nexus-text bg-nexus-card rounded-lg px-3 py-2"
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Port scan result */}
                {portResult?.success && (
                  <div className="space-y-2">
                    <div className="flex gap-4 text-xs text-nexus-muted mb-2">
                      <span className="text-nexus-success">
                        {portResult.ports.filter((p) => p.open).length} açık
                      </span>
                      <span className="text-red-400">
                        {portResult.ports.filter((p) => !p.open).length} kapalı
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {portResult.ports.map((p) => (
                        <div
                          key={p.port}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                            p.open
                              ? 'bg-nexus-success/5 border border-nexus-success/20'
                              : 'bg-nexus-card border border-nexus-border/30'
                          }`}
                        >
                          <span className="font-mono text-sm text-white w-12 shrink-0">{p.port}</span>
                          <span className="flex-1 text-xs text-nexus-muted">{p.service}</span>
                          <StatusBadge open={p.open} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Ping Result & Latency Wave Chart ─── */}
                {pingResult?.success && (
                  <div className="space-y-4">
                    {/* Stat Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="glass-card p-3 text-center border border-white/5">
                        <p className="text-xl font-bold font-mono text-emerald-400">
                          {pingResult.avgMs !== undefined ? `${pingResult.avgMs}ms` : '—'}
                        </p>
                        <p className="text-[10px] text-nexus-muted uppercase">Ortalama (Avg)</p>
                      </div>

                      <div className="glass-card p-3 text-center border border-white/5">
                        <p className="text-xl font-bold font-mono text-cyan-400">
                          {pingResult.minMs !== undefined ? `${pingResult.minMs}ms` : '—'}
                        </p>
                        <p className="text-[10px] text-nexus-muted uppercase">En Düşük (Min)</p>
                      </div>

                      <div className="glass-card p-3 text-center border border-white/5">
                        <p className="text-xl font-bold font-mono text-amber-400">
                          {pingResult.maxMs !== undefined ? `${pingResult.maxMs}ms` : '—'}
                        </p>
                        <p className="text-[10px] text-nexus-muted uppercase">En Yüksek (Max)</p>
                      </div>

                      <div className="glass-card p-3 text-center border border-white/5">
                        <p
                          className={`text-xl font-bold font-mono ${
                            pingResult.packetLoss === '0%' ? 'text-nexus-success' : 'text-rose-400'
                          }`}
                        >
                          {pingResult.packetLoss || '0%'}
                        </p>
                        <p className="text-[10px] text-nexus-muted uppercase">Paket Kaybı</p>
                      </div>
                    </div>

                    {/* Latency Wave Visualization SVG */}
                    {pingResult.latencies && pingResult.latencies.length > 0 && (
                      <div className="p-4 rounded-xl bg-nexus-bg/70 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-nexus-text">
                            <Activity className="w-3.5 h-3.5 text-nexus-cyan" />
                            <span>Canlı RTT Gecikme Dalgası (Latency Wave)</span>
                          </div>
                          <span className="hud-badge text-[10px] text-nexus-cyan">
                            {pingResult.avgMs && pingResult.avgMs < 35
                              ? 'A+ (Düşük Gecikme)'
                              : pingResult.avgMs && pingResult.avgMs < 80
                              ? 'B (İyi Bağlantı)'
                              : 'C (Orta / Yüksek)'}
                          </span>
                        </div>

                        {/* Responsive SVG chart */}
                        <div className="h-28 w-full relative">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="pingWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Guidelines */}
                            <line x1="0" y1="25" x2="400" y2="25" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                            <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                            <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                            {(() => {
                              const lats = pingResult.latencies!
                              const maxVal = Math.max(...lats, (pingResult.maxMs || 20) * 1.2, 10)
                              const points = lats.map((val, idx) => {
                                const x = lats.length > 1 ? (idx / (lats.length - 1)) * 380 + 10 : 200
                                const y = 90 - (val / maxVal) * 75
                                return { x, y, val }
                              })

                              const pathD = points.reduce(
                                (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                                ''
                              )
                              const areaD = `${pathD} L ${points[points.length - 1].x} 95 L ${points[0].x} 95 Z`

                              return (
                                <>
                                  <path d={areaD} fill="url(#pingWaveGrad)" />
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke="#06b6d4"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  {points.map((p, i) => (
                                    <g key={i}>
                                      <circle cx={p.x} cy={p.y} r="4" fill="#06b6d4" className="animate-pulse" />
                                      <circle cx={p.x} cy={p.y} r="2" fill="#ffffff" />
                                      <text
                                        x={p.x}
                                        y={p.y - 8}
                                        textAnchor="middle"
                                        fill="#a1a1aa"
                                        fontSize="9"
                                        fontFamily="monospace"
                                      >
                                        {p.val}ms
                                      </text>
                                    </g>
                                  ))}
                                </>
                              )
                            })()}
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Raw terminal output */}
                    {pingResult.output && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-nexus-muted uppercase tracking-widest flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" /> <span>Ham Konsol Çıktısı</span>
                        </p>
                        <pre className="text-[11px] text-nexus-muted font-mono bg-nexus-card rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-white/5">
                          {pingResult.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── SSL Inspector Result ─── */}
                {sslResult?.success && (
                  <div className="space-y-4">
                    {/* Header Card */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-nexus-cyan/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            sslResult.isExpired
                              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {sslResult.isExpired ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {sslResult.subject?.CN || sslResult.host}
                            </h4>
                            <span
                              className={`hud-badge text-[10px] ${
                                sslResult.isExpired ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {sslResult.isExpired ? 'Süresi Dolmuş' : 'Geçerli & Güvenli'}
                            </span>
                          </div>
                          <p className="text-xs text-nexus-muted">
                            Protokol: <span className="text-white font-mono">{sslResult.protocol || 'TLS'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          {sslResult.daysRemaining !== undefined
                            ? `${sslResult.daysRemaining} Gün Kaldı`
                            : '—'}
                        </div>
                        <p className="text-[10px] text-nexus-muted uppercase">Sertifika Bitiş Süresi</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-nexus-card border border-white/5 space-y-1">
                        <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">
                          Yayınlayan Kuruluş (Issuer CA)
                        </p>
                        <p className="text-xs font-semibold text-white">
                          {sslResult.issuer?.O || sslResult.issuer?.CN || 'Bilinmiyor'}
                        </p>
                        {sslResult.issuer?.CN && (
                          <p className="text-[11px] text-nexus-muted font-mono">{sslResult.issuer.CN}</p>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-nexus-card border border-white/5 space-y-1">
                        <p className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-nexus-cyan" />
                          <span>Geçerlilik Süresi</span>
                        </p>
                        <p className="text-xs text-nexus-text">
                          <span className="text-nexus-muted">Başlangıç:</span> {sslResult.validFrom || '—'}
                        </p>
                        <p className="text-xs text-nexus-text">
                          <span className="text-nexus-muted">Bitiş:</span> {sslResult.validTo || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Fingerprint & Serial */}
                    {sslResult.fingerprint256 && (
                      <div className="p-3.5 rounded-xl bg-nexus-card border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-nexus-muted uppercase tracking-wider font-semibold">
                            SHA-256 Parmak İzi (Fingerprint)
                          </span>
                          <button
                            onClick={() => handleCopyFingerprint(sslResult.fingerprint256!)}
                            className="flex items-center gap-1 text-[11px] text-nexus-cyan hover:underline font-medium"
                          >
                            {copiedFingerprint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedFingerprint ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-nexus-muted break-all select-all bg-nexus-bg/80 p-2 rounded-lg border border-white/5">
                          {sslResult.fingerprint256}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BaseToolTemplate>
  )
}
