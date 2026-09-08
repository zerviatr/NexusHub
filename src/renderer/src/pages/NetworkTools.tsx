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
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { nexusAPI, IpLookupResult, DnsQueryResult, PortScanResult, PingResult, DnsType, MyIpResult } from '../lib/ipc'
import { useT } from '../lib/i18n'

type Tab = 'myip' | 'ip' | 'dns' | 'port' | 'ping'

const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389, 5432, 5900, 6379, 8080, 27017]
const DNS_TYPES: DnsType[] = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME']

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'myip', label: 'My Public IP', icon: MapPin },
  { id: 'ip', label: 'IP Lookup', icon: Globe },
  { id: 'dns', label: 'DNS Query', icon: Server },
  { id: 'port', label: 'Port Scan', icon: Radio },
  { id: 'ping', label: 'Ping', icon: Wifi },
]

function StatusBadge({ open }: { open: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
      open ? 'bg-nexus-success/10 text-nexus-success' : 'bg-red-500/10 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-nexus-success animate-pulse' : 'bg-red-500'}`} />
      {open ? 'Open' : 'Closed'}
    </span>
  )
}

export default function NetworkTools() {
  const { t } = useT()
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
      setTimeout(() => setCopiedIp(false), 2000)
    }
  }

  const clearResults = () => {
    setIpResult(null)
    setDnsResult(null)
    setPortResult(null)
    setPingResult(null)
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

  const currentResult = ipResult || dnsResult || portResult || pingResult
  const isSuccess = currentResult?.success

  return (
    <BaseToolTemplate
      icon={Globe}
      title={t('nav.tools.networkTools') || "Network Tools"}
      description={t('dashboard.tools.networkTools.desc') || "IP resolution, DNS querying, port scanning, and ICMP ping — all running natively through Electron's Node.js runtime."}
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
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-md'
                : 'text-nexus-muted hover:text-nexus-text'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── TAB: MY PUBLIC IP & GEOLOCATION ─── */}
      {activeTab === 'myip' && (
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-nexus-cyan" />
              <h3 className="text-sm font-semibold text-white">Public IP & Carrier Intelligence</h3>
            </div>
            <button
              type="button"
              onClick={detectMyIp}
              disabled={isDetectingIp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/50 text-xs font-medium text-nexus-text hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-nexus-cyan ${isDetectingIp ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isDetectingIp ? (
            <div className="py-12 flex flex-col items-center justify-center text-nexus-muted space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-nexus-cyan" />
              <span className="text-xs">Detecting your external IP and ISP route...</span>
            </div>
          ) : myIpResult?.success ? (
            <div className="space-y-6">
              {/* Primary IP Hero Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-nexus-cyan/10 to-nexus-accent/5 border border-nexus-cyan/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-nexus-muted uppercase tracking-widest font-mono font-semibold">Your Public IPv4 / IPv6</span>
                  <p className="text-2xl font-mono font-bold text-white mt-1 tracking-tight">{myIpResult.ip}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyIp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-nexus-cyan text-nexus-bg font-semibold text-xs shadow-lg shadow-nexus-cyan/20 transition-all active:scale-95"
                >
                  {copiedIp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedIp ? 'Copied' : 'Copy IP Address'}
                </button>
              </div>

              {/* Geo & Carrier details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-nexus-surface/60 border border-white/5 space-y-3">
                  <span className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">Location Data</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">Country:</span>
                      <span className="text-white font-medium">{myIpResult.country || 'Unknown'} ({myIpResult.countryCode || '—'})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">City / Region:</span>
                      <span className="text-white font-medium">{myIpResult.city || '—'}, {myIpResult.region || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">Timezone:</span>
                      <span className="text-white font-mono">{myIpResult.timezone || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-nexus-surface/60 border border-white/5 space-y-3">
                  <span className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">ISP & Network Route</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">Internet Provider:</span>
                      <span className="text-nexus-cyan font-medium truncate max-w-[200px]" title={myIpResult.org}>{myIpResult.org || 'Detected'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">Connection Type:</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Direct Route
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-muted">Telemetry:</span>
                      <span className="text-nexus-muted">Processed locally</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-rose-400">
              {myIpResult?.error || 'Unable to retrieve public IP.'}
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
                placeholder={activeTab === 'port' ? (t('network.placeholderPort') || 'example.com or 1.2.3.4') : (t('network.placeholderHost') || 'hostname or IP...')}
                className="w-full bg-nexus-card border border-nexus-border rounded-xl pl-9 pr-4 py-3 text-sm text-nexus-text placeholder:text-nexus-muted/50 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('network.run') || 'Run')}
            </motion.button>
          </div>

          {/* Port selector */}
          {activeTab === 'port' && (
            <div className="glass-card p-4 mb-4 space-y-3">
              <p className="text-[10px] text-nexus-muted uppercase tracking-widest font-semibold">
                Common Ports (click to toggle)
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
                placeholder="Custom ports: 8443, 9200, 5601..."
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
              <div className="flex items-center gap-3 text-nexus-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {t('network.running') || 'Running...'}
                </span>
              </div>
            ) : !isSuccess ? (
              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-1">{t('network.failed') || 'Failed'}</p>
                  <p className="text-xs text-nexus-muted">{(currentResult as any)?.error || t('network.unknownError') || 'Unknown error'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-nexus-success text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('network.results') || 'Result'}
                </div>

                {/* IP Lookup result */}
                {ipResult?.success && (
                  <div className="space-y-2">
                    {[
                      { label: 'Host', value: ipResult.host },
                      { label: 'IP Address', value: ipResult.ip },
                      { label: 'IP Family', value: ipResult.family === 4 ? 'IPv4' : 'IPv6' },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-[10px] text-nexus-muted uppercase tracking-widest w-24 shrink-0">{label}</span>
                        <span className="text-sm text-white font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* DNS result */}
                {dnsResult?.success && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-nexus-muted uppercase tracking-widest w-24 shrink-0">Type</span>
                      <span className="text-sm text-white font-mono">{dnsResult.type}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-nexus-muted uppercase tracking-widest">Records ({dnsResult.records?.length ?? 0})</span>
                      <div className="space-y-1 mt-1">
                        {dnsResult.records?.map((r, i) => (
                          <div key={i} className="font-mono text-sm text-nexus-text bg-nexus-card rounded-lg px-3 py-2">
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
                        {portResult.ports.filter((p) => p.open).length} open
                      </span>
                      <span className="text-red-400">
                        {portResult.ports.filter((p) => !p.open).length} closed
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {portResult.ports.map((p) => (
                        <div
                          key={p.port}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                            p.open ? 'bg-nexus-success/5 border border-nexus-success/20' : 'bg-nexus-card border border-nexus-border/30'
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

                {/* Ping result */}
                {pingResult?.success && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {pingResult.avgMs !== undefined && (
                        <div className="glass-card p-3 text-center">
                          <p className="text-lg font-bold text-emerald-400">{pingResult.avgMs}ms</p>
                          <p className="text-[10px] text-nexus-muted">Avg Latency</p>
                        </div>
                      )}
                      {pingResult.packetLoss !== undefined && (
                        <div className="glass-card p-3 text-center">
                          <p className={`text-lg font-bold ${pingResult.packetLoss === '0%' ? 'text-nexus-success' : 'text-amber-400'}`}>
                            {pingResult.packetLoss}
                          </p>
                          <p className="text-[10px] text-nexus-muted">Packet Loss</p>
                        </div>
                      )}
                    </div>
                    {pingResult.output && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-nexus-muted uppercase tracking-widest flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" /> {t('network.rawOutput') || 'Raw Output'}
                        </p>
                        <pre className="text-[11px] text-nexus-muted font-mono bg-nexus-card rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                          {pingResult.output}
                        </pre>
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
