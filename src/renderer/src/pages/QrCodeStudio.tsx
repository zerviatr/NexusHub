import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  QrCode,
  Download,
  Copy,
  Check,
  Wifi,
  Link as LinkIcon,
  Type,
  User,
  Mail,
  MessageSquare,
  Sparkles,
  Sliders,
  Palette
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'

type QrType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'sms'

const PRESET_COLORS = [
  { label: 'Cyan', fg: '#06b6d4', bg: '#0b132b' },
  { label: 'Emerald', fg: '#10b981', bg: '#06281e' },
  { label: 'Classic', fg: '#ffffff', bg: '#0f172a' },
  { label: 'Amber', fg: '#f59e0b', bg: '#2b1a06' },
  { label: 'Monochrome', fg: '#000000', bg: '#ffffff' }
]

export default function QrCodeStudio() {
  const { t } = useT()

  // QR Type & Input state
  const [qrType, setQrType] = useState<QrType>('url')
  const [url, setUrl] = useState('https://github.com/zerviatr/ZenDev')
  const [text, setText] = useState('ZenDev Premium Suite')
  
  // WiFi state
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [wifiHidden, setWifiHidden] = useState(false)

  // vCard state
  const [vcardName, setVcardName] = useState('')
  const [vcardPhone, setVcardPhone] = useState('')
  const [vcardEmail, setVcardEmail] = useState('')
  const [vcardCompany, setVcardCompany] = useState('')

  // Email & SMS state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [smsPhone, setSmsPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')

  // Customization state
  const [fgColor, setFgColor] = useState('#06b6d4')
  const [bgColor, setBgColor] = useState('#0b132b')
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [margin, setMargin] = useState(2)
  const [size] = useState(280)

  // UI state
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Compute raw payload based on type
  const getRawPayload = (): string => {
    switch (qrType) {
      case 'url':
        return url.trim() || 'https://'
      case 'text':
        return text || ' '
      case 'wifi':
        return `WIFI:T:${wifiAuth};S:${wifiSsid};P:${wifiPassword};H:${wifiHidden ? 'true' : 'false'};;`
      case 'vcard':
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${vcardName}`,
          `ORG:${vcardCompany}`,
          `TEL:${vcardPhone}`,
          `EMAIL:${vcardEmail}`,
          'END:VCARD'
        ].join('\n')
      case 'email':
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}`
      case 'sms':
        return `SMSTO:${smsPhone}:${smsMessage}`
      default:
        return url
    }
  }

  // Render QR Code onto canvas and generate data URL
  useEffect(() => {
    const raw = getRawPayload()
    if (!raw.trim()) {
      setQrDataUrl('')
      return
    }

    QRCode.toDataURL(raw, {
      width: size,
      margin: margin,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: fgColor,
        light: bgColor
      }
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl)
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Error generating QR code')
      })
  }, [
    qrType,
    url,
    text,
    wifiSsid,
    wifiPassword,
    wifiAuth,
    wifiHidden,
    vcardName,
    vcardPhone,
    vcardEmail,
    vcardCompany,
    emailTo,
    emailSubject,
    smsPhone,
    smsMessage,
    fgColor,
    bgColor,
    errorLevel,
    margin,
    size
  ])

  // Download PNG
  const handleDownloadPng = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `zendev-qrcode-${qrType}-${Date.now()}.png`
    a.click()
  }

  // Download SVG
  const handleDownloadSvg = async () => {
    try {
      const raw = getRawPayload()
      const svgString = await QRCode.toString(raw, {
        type: 'svg',
        margin: margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: fgColor,
          light: bgColor
        }
      })
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `zendev-qrcode-${qrType}-${Date.now()}.svg`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      setError(err.message || 'SVG export failed')
    }
  }

  // Copy to Clipboard
  const handleCopyImage = async () => {
    if (!qrDataUrl) return
    try {
      const res = await fetch(qrDataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback to text copy
      navigator.clipboard.writeText(getRawPayload())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <BaseToolTemplate
      title={t('qr.title') || 'QR Code Studio'}
      description={t('qr.description') || 'Generate high-resolution, custom-styled QR codes for URLs, WiFi networks, digital business cards, and contact info.'}
      icon={QrCode}
      gradient="from-cyan-500 to-blue-600"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Config Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Type Selector Tabs */}
          <div className="glass-panel p-2 rounded-2xl flex flex-wrap gap-1 border border-white/5">
            {[
              { id: 'url', label: 'URL', icon: LinkIcon },
              { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
              { id: 'vcard', label: 'vCard', icon: User },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'sms', label: 'SMS', icon: MessageSquare }
            ].map(({ id, label, icon: TabIcon }) => {
              const active = qrType === id
              return (
                <button
                  key={id}
                  onClick={() => setQrType(id as QrType)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                      : 'text-nexus-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Dynamic Payload Form */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-nexus-cyan" />
              Content Parameters
            </h3>

            {qrType === 'url' && (
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Destination URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/50"
                />
              </div>
            )}

            {qrType === 'text' && (
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Plain Text Payload</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Enter any text, instructions, or notes..."
                  className="w-full px-4 py-3 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/50 resize-none"
                />
              </div>
            )}

            {qrType === 'wifi' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="e.g. MyHomeNetwork"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Password</label>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="WPA / WEP key"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-nexus-muted mb-1.5">Encryption</label>
                    <select
                      value={wifiAuth}
                      onChange={(e) => setWifiAuth(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-xs text-white focus:outline-none"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="wifiHidden"
                      checked={wifiHidden}
                      onChange={(e) => setWifiHidden(e.target.checked)}
                      className="rounded border-nexus-border/40 text-nexus-cyan focus:ring-0"
                    />
                    <label htmlFor="wifiHidden" className="text-xs text-nexus-muted cursor-pointer">
                      Hidden Network
                    </label>
                  </div>
                </div>
              </div>
            )}

            {qrType === 'vcard' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-4 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full px-4 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Email</label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full px-4 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Company / Organization</label>
                  <input
                    type="text"
                    value={vcardCompany}
                    onChange={(e) => setVcardCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-4 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
              </div>
            )}

            {qrType === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Recipient Email</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="support@company.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Project Inquiry"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
              </div>
            )}

            {qrType === 'sms' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-nexus-muted mb-1.5">Pre-filled Message</label>
                  <input
                    type="text"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Hello from ZenDev"
                    className="w-full px-4 py-2.5 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-sm text-white focus:outline-none focus:border-nexus-cyan/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Style & Error Correction Customizer */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-nexus-cyan" />
              Styling & Density
            </h3>

            {/* Color presets */}
            <div>
              <label className="block text-xs font-medium text-nexus-muted mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Color Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFgColor(preset.fg)
                      setBgColor(preset.bg)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-nexus-surface/60 hover:bg-white/10 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.fg }}
                    />
                    <span className="text-nexus-text text-[11px]">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom hex colors */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Foreground Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-nexus-surface/80 border border-nexus-border/40 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-nexus-surface/80 border border-nexus-border/40 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Error correction & Quiet Zone */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Error Correction</label>
                <select
                  value={errorLevel}
                  onChange={(e) => setErrorLevel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-nexus-surface/80 border border-nexus-border/40 text-xs text-white focus:outline-none"
                >
                  <option value="L">Level L (7% Recovery)</option>
                  <option value="M">Level M (15% Recovery)</option>
                  <option value="Q">Level Q (25% Recovery)</option>
                  <option value="H">Level H (30% Best)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-nexus-muted mb-1.5">Quiet Margin ({margin}x)</label>
                <input
                  type="range"
                  min="0"
                  max="6"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-nexus-cyan mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Preview & Export */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-6 w-full max-w-sm space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-nexus-cyan/20 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-nexus-cyan/5 to-transparent pointer-events-none" />

              {/* QR Canvas Render */}
              <div
                className="p-4 rounded-2xl shadow-inner transition-all duration-300"
                style={{ backgroundColor: bgColor }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Generated QR Code"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-nexus-muted text-xs">
                    No data to render
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-3 text-rose-400 text-xs text-center px-4">
                  {error}
                </div>
              )}

              <p className="mt-4 text-[11px] text-nexus-muted text-center tracking-wide">
                Live rendered vector preview &bull; 100% offline client-side
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!qrDataUrl}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-nexus-cyan hover:bg-nexus-cyan/90 text-nexus-bg font-semibold text-xs shadow-lg shadow-nexus-cyan/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={!qrDataUrl}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-nexus-surface hover:bg-nexus-surface/80 border border-nexus-border/50 text-white font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download SVG
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={!qrDataUrl}
                className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-nexus-surface/60 hover:bg-white/10 border border-white/10 text-nexus-text font-medium text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Image to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseToolTemplate>
  )
}
