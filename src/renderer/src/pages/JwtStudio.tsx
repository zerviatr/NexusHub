import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'
import {
  parseJwt,
  calculateExpiryInfo,
  verifyHmacSha256,
  signHmacSha256,
  JWT_GENERATOR_PRESETS,
  type JwtParts,
  type JwtExpiryInfo,
} from '../lib/jwtEngine'

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOTQ4MjcxMDQiLCJuYW1lIjoiQWxleCBNb3JnYW4iLCJlbWFpbCI6ImFsZXgubW9yZ2FuQHplbmRldi5hcHAiLCJyb2xlIjoiZGV2ZWxvcGVyIiwiaWF0IjoxNzA5ODU2MDAwLCJleHAiOjIxMzU5Mjk2MDAsImlzcyI6Imh0dHBzOi8vemVuZGV2LmFwcCJ9.tF_gN3y7a5qL8uB-q5aYm7gE8vH9tI2k3j4l5m6n7p8'

const SAMPLE_SECRET = 'zendev-secret-key-2026'

export default function JwtStudio() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<'debugger' | 'generator'>('debugger')

  // Debugger state
  const [rawToken, setRawToken] = useState<string>(SAMPLE_JWT)
  const [secret, setSecret] = useState<string>(SAMPLE_SECRET)
  const [isSecretBase64, setIsSecretBase64] = useState<boolean>(false)
  const [showSecret, setShowSecret] = useState<boolean>(false)
  const [copiedToken, setCopiedToken] = useState<boolean>(false)
  const [copiedHeader, setCopiedHeader] = useState<boolean>(false)
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false)

  // Verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [verificationResult, setVerificationResult] = useState<{
    status: 'unverified' | 'valid' | 'invalid'
    error?: string
  }>({ status: 'unverified' })

  // Generator state
  const [genAlgorithm, setGenAlgorithm] = useState<'HS256' | 'none'>('HS256')
  const [genPreset, setGenPreset] = useState<string>('userAuth')
  const [genHeaderJson, setGenHeaderJson] = useState<string>(
    JSON.stringify(JWT_GENERATOR_PRESETS.userAuth.header, null, 2)
  )
  const [genPayloadJson, setGenPayloadJson] = useState<string>(
    JSON.stringify(JWT_GENERATOR_PRESETS.userAuth.payload, null, 2)
  )
  const [genSecret, setGenSecret] = useState<string>('my-super-secret-key-32-chars-long')
  const [genSecretBase64, setGenSecretBase64] = useState<boolean>(false)
  const [genExpiryOption, setGenExpiryOption] = useState<string>('1h')
  const [generatedToken, setGeneratedToken] = useState<string>('')
  const [copiedGenToken, setCopiedGenToken] = useState<boolean>(false)

  // Ingest dropped .jwt files
  useFileGatewayDrop(async (detail) => {
    if (detail.name.toLowerCase().endsWith('.jwt') || detail.name.toLowerCase().endsWith('.txt')) {
      try {
        const text = await detail.file.text()
        if (text.includes('.')) {
          setRawToken(text.trim())
          setActiveTab('debugger')
          cyberAudio.click()
        }
      } catch (err) {
        console.error('Failed to read dropped JWT file:', err)
      }
    }
  })

  // Read smart paste data from localStorage
  useEffect(() => {
    try {
      const incoming = localStorage.getItem('nexus_jwt_input')
      if (incoming) {
        setRawToken(incoming.trim())
        setActiveTab('debugger')
        localStorage.removeItem('nexus_jwt_input')
      }
    } catch {}
  }, [])

  // Parse token
  const parsedJwt: JwtParts = useMemo(() => {
    return parseJwt(rawToken)
  }, [rawToken])

  // Expiry calculation
  const expiryInfo: JwtExpiryInfo = useMemo(() => {
    return calculateExpiryInfo(parsedJwt.payload)
  }, [parsedJwt.payload])

  // Real-time HMAC-SHA256 signature verification
  const runVerification = useCallback(async () => {
    if (!parsedJwt.isValidFormat || !secret) {
      setVerificationResult({ status: 'unverified' })
      return
    }

    if (parsedJwt.header?.alg === 'none') {
      setVerificationResult({
        status: parsedJwt.signatureRaw === '' ? 'valid' : 'invalid',
        error: parsedJwt.signatureRaw === '' ? undefined : 'Algorithm is none but signature is present',
      })
      return
    }

    if (parsedJwt.header?.alg !== 'HS256') {
      setVerificationResult({
        status: 'unverified',
        error: `Signature verification currently supports HS256 and none (token uses ${parsedJwt.header?.alg || 'unknown'})`,
      })
      return
    }

    setIsVerifying(true)
    try {
      const res = await verifyHmacSha256(rawToken, secret, isSecretBase64)
      if (res.valid) {
        setVerificationResult({ status: 'valid' })
      } else {
        setVerificationResult({ status: 'invalid', error: res.error })
      }
    } catch (err: unknown) {
      setVerificationResult({
        status: 'invalid',
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsVerifying(false)
    }
  }, [rawToken, secret, isSecretBase64, parsedJwt])

  useEffect(() => {
    const timer = setTimeout(() => {
      runVerification()
    }, 150)
    return () => clearTimeout(timer)
  }, [runVerification])

  // Generate signed JWT
  const handleGenerate = async () => {
    cyberAudio.click()
    try {
      const headerObj = JSON.parse(genHeaderJson)
      headerObj.alg = genAlgorithm
      const payloadObj = JSON.parse(genPayloadJson)

      const now = Math.floor(Date.now() / 1000)
      if (!payloadObj.iat) {
        payloadObj.iat = now
      }

      if (genExpiryOption !== 'none') {
        let delta = 3600
        if (genExpiryOption === '15m') delta = 900
        else if (genExpiryOption === '1h') delta = 3600
        else if (genExpiryOption === '24h') delta = 86400
        else if (genExpiryOption === '7d') delta = 604800
        else if (genExpiryOption === '30d') delta = 2592000
        payloadObj.exp = now + delta
      }

      const signed = await signHmacSha256(headerObj, payloadObj, genSecret, genSecretBase64)
      setGeneratedToken(signed)
      cyberAudio.copySuccess()
    } catch (err: unknown) {
      cyberAudio.error()
      alert(`Generation failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleApplyPreset = (presetKey: string) => {
    cyberAudio.click()
    setGenPreset(presetKey)
    const p = JWT_GENERATOR_PRESETS[presetKey as keyof typeof JWT_GENERATOR_PRESETS]
    if (p) {
      setGenHeaderJson(JSON.stringify(p.header, null, 2))
      setGenPayloadJson(JSON.stringify(p.payload, null, 2))
    }
  }

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    cyberAudio.copySuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <BaseToolTemplate
      title={t('jwtStudio.title') || 'JWT & Token Studio'}
      description={
        t('jwtStudio.description') ||
        'Inspect, decode, verify HMAC-SHA256 signatures, and generate JSON Web Tokens 100% offline.'
      }
      icon={KeyRound}
      gradient="from-violet-600 to-indigo-600"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('debugger')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'debugger'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t('jwtStudio.tabs.debugger') || 'JWT Inspector'}
            </button>
            <button
              type="button"
              onClick={() => {
                cyberAudio.click()
                setActiveTab('generator')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'generator'
                  ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                  : 'text-nexus-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-nexus-cyan" />
              {t('jwtStudio.tabs.generator') || 'Token Generator'}
            </button>
          </div>

          <span className="text-[11px] text-nexus-muted flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-400" />
            Zero network transit &bull; Native Web Crypto API
          </span>
        </div>

        {/* ─── TAB 1: JWT INSPECTOR / DEBUGGER ──────────────────────────────── */}
        {activeTab === 'debugger' && (
          <div className="space-y-6">
            {/* Raw Token Input Panel */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-nexus-cyan" />
                  Encoded JWT Token
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.click()
                      setRawToken(SAMPLE_JWT)
                      setSecret(SAMPLE_SECRET)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface/60 border border-white/5 text-[11px] text-nexus-muted hover:text-white transition-colors"
                  >
                    <FileCode className="w-3 h-3" />
                    Load Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cyberAudio.purge()
                      setRawToken('')
                      setSecret('')
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(rawToken, setCopiedToken)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-nexus-border/50 text-[11px] text-white hover:border-nexus-cyan/40 transition-colors"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Segmented 3-part Color Token Display */}
              <div className="relative">
                <textarea
                  value={rawToken}
                  onChange={(e) => setRawToken(e.target.value)}
                  placeholder={
                    t('jwtStudio.tokenPlaceholder') || 'Paste your JWT token here (eyJhbGciOi...)'
                  }
                  rows={4}
                  className="w-full bg-nexus-base/80 border border-nexus-border/60 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/60 transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* Color breakdown badges */}
              {parsedJwt.isValidFormat && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Header: {parsedJwt.headerRaw.slice(0, 16)}...
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Payload: {parsedJwt.payloadRaw.slice(0, 16)}...
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Signature: {parsedJwt.signatureRaw.slice(0, 16)}...
                  </span>
                </div>
              )}

              {parsedJwt.error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{parsedJwt.error}</span>
                </div>
              )}
            </div>

            {/* Expiry Timeline Visualizer */}
            {parsedJwt.payload && (
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-nexus-cyan" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      {t('jwtStudio.timeline.title') || 'Token Expiry Timeline'}
                    </h3>
                  </div>

                  {/* Status Badges */}
                  <div>
                    {expiryInfo.status === 'active' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('jwtStudio.timeline.active') || 'Active Token'} (
                        {expiryInfo.humanRemaining})
                      </span>
                    )}
                    {expiryInfo.status === 'expiring-soon' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t('jwtStudio.timeline.expiringSoon') || 'Expiring Soon'} (
                        {expiryInfo.humanRemaining})
                      </span>
                    )}
                    {expiryInfo.status === 'expired' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t('jwtStudio.timeline.expired') || 'Expired'} (
                        {expiryInfo.humanRemaining} ago)
                      </span>
                    )}
                    {expiryInfo.status === 'no-expiry' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-nexus-muted border border-white/10">
                        No Expiration (exp claim missing)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {expiryInfo.status !== 'no-expiry' && (
                  <div className="space-y-1.5">
                    <div className="w-full bg-nexus-base h-2 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-500 ${
                          expiryInfo.status === 'expired'
                            ? 'bg-rose-500 w-full'
                            : expiryInfo.status === 'expiring-soon'
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        }`}
                        style={{
                          width:
                            expiryInfo.status === 'expired'
                              ? '100%'
                              : `${expiryInfo.percentageRemaining ?? 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-nexus-muted">
                      <span>
                        {t('jwtStudio.timeline.issuedAt') || 'Issued At'}:{' '}
                        {expiryInfo.formattedIat || 'Not set'}
                      </span>
                      <span>
                        {t('jwtStudio.timeline.expiresAt') || 'Expires At'}:{' '}
                        {expiryInfo.formattedExp || 'Not set'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Split Decoded Cards: Header & Payload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Header Card */}
              <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <h3 className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                      {t('jwtStudio.header') || 'Header (Algorithm & Type)'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(parsedJwt.headerJson, setCopiedHeader)}
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white transition-colors"
                  >
                    {copiedHeader ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy JSON
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-nexus-base/80 border border-white/5 text-xs font-mono text-rose-200 overflow-x-auto min-h-[160px]">
                  {parsedJwt.headerJson || '// No header parsed'}
                </pre>
              </div>

              {/* Payload Card */}
              <div className="glass-panel p-4 rounded-2xl border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                      {t('jwtStudio.payload') || 'Payload (Claims)'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(parsedJwt.payloadJson, setCopiedPayload)}
                    className="flex items-center gap-1 text-[11px] text-nexus-muted hover:text-white transition-colors"
                  >
                    {copiedPayload ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy JSON
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-nexus-base/80 border border-white/5 text-xs font-mono text-indigo-200 overflow-x-auto min-h-[160px]">
                  {parsedJwt.payloadJson || '// No payload parsed'}
                </pre>
              </div>
            </div>

            {/* Standard Claims Visual Inspector */}
            {parsedJwt.payload && (
              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-xs font-semibold text-nexus-muted uppercase tracking-wider">
                  Decoded Standard Claims
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries({
                    sub: { label: t('jwtStudio.claims.sub') || 'Subject', val: parsedJwt.payload.sub },
                    iss: { label: t('jwtStudio.claims.iss') || 'Issuer', val: parsedJwt.payload.iss },
                    aud: {
                      label: t('jwtStudio.claims.aud') || 'Audience',
                      val: Array.isArray(parsedJwt.payload.aud)
                        ? parsedJwt.payload.aud.join(', ')
                        : parsedJwt.payload.aud,
                    },
                    exp: {
                      label: t('jwtStudio.claims.exp') || 'Expiration Time',
                      val: parsedJwt.payload.exp
                        ? `${parsedJwt.payload.exp} (${new Date(parsedJwt.payload.exp * 1000).toLocaleString()})`
                        : undefined,
                    },
                    iat: {
                      label: t('jwtStudio.claims.iat') || 'Issued At',
                      val: parsedJwt.payload.iat
                        ? `${parsedJwt.payload.iat} (${new Date(parsedJwt.payload.iat * 1000).toLocaleString()})`
                        : undefined,
                    },
                    jti: { label: t('jwtStudio.claims.jti') || 'JWT ID', val: parsedJwt.payload.jti },
                  }).map(([key, item]) => {
                    if (!item.val) return null
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl bg-nexus-base/60 border border-white/5 flex flex-col gap-0.5"
                      >
                        <span className="text-[10px] uppercase font-mono text-nexus-muted">
                          {key} &bull; {item.label}
                        </span>
                        <span className="text-xs font-mono text-white truncate" title={String(item.val)}>
                          {String(item.val)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Signature Verification Card */}
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    {t('jwtStudio.signature') || 'Signature Verification'}
                  </h3>
                </div>

                {/* Verification Status Pill */}
                <div className="flex items-center gap-2">
                  {verificationResult.status === 'valid' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      {t('jwtStudio.verified') || 'Signature Verified (HMAC-SHA256)'}
                    </span>
                  )}
                  {verificationResult.status === 'invalid' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      {t('jwtStudio.invalidSignature') || 'Invalid Signature / Mismatched Secret'}
                    </span>
                  )}
                  {verificationResult.status === 'unverified' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-nexus-muted border border-white/10">
                      <KeyRound className="w-3.5 h-3.5" />
                      {t('jwtStudio.unsigned') || 'Enter secret key to verify signature'}
                    </span>
                  )}
                </div>
              </div>

              {/* Secret Key Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-nexus-muted">
                    {t('jwtStudio.secretKey') || 'HMAC Secret Key'}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-nexus-muted cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={isSecretBase64}
                      onChange={(e) => setIsSecretBase64(e.target.checked)}
                      className="rounded border-nexus-border bg-nexus-base text-nexus-cyan focus:ring-0"
                    />
                    {t('jwtStudio.base64Secret') || 'Secret is Base64 Encoded'}
                  </label>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={
                      t('jwtStudio.secretPlaceholder') || 'Enter secret key to verify signature...'
                    }
                    className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white pr-10 focus:outline-none focus:border-nexus-cyan/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 text-nexus-muted hover:text-white transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {verificationResult.error && verificationResult.status === 'invalid' && (
                  <p className="text-[11px] text-rose-400 font-mono">
                    {verificationResult.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TOKEN GENERATOR ───────────────────────────────────────── */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-nexus-cyan" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Sign & Create New Token
                  </h3>
                </div>

                {/* Preset selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-nexus-muted">
                    {t('jwtStudio.generatorLabels.claimsPreset') || 'Preset'}:
                  </span>
                  {Object.entries(JWT_GENERATOR_PRESETS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleApplyPreset(k)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        genPreset === k
                          ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 font-medium'
                          : 'bg-nexus-surface/60 text-nexus-muted hover:text-white border border-white/5'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Algorithm & Expiry Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-nexus-muted font-medium">
                    {t('jwtStudio.generatorLabels.algorithm') || 'Algorithm'}
                  </label>
                  <select
                    value={genAlgorithm}
                    onChange={(e) => setGenAlgorithm(e.target.value as 'HS256' | 'none')}
                    className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexus-cyan/60"
                  >
                    <option value="HS256">HS256 (HMAC-SHA256)</option>
                    <option value="none">none (Unsecured)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-nexus-muted font-medium">
                    {t('jwtStudio.generatorLabels.expiry') || 'Expiration'}
                  </label>
                  <select
                    value={genExpiryOption}
                    onChange={(e) => setGenExpiryOption(e.target.value)}
                    className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexus-cyan/60"
                  >
                    <option value="15m">+15 Minutes</option>
                    <option value="1h">+1 Hour</option>
                    <option value="24h">+24 Hours</option>
                    <option value="7d">+7 Days</option>
                    <option value="30d">+30 Days</option>
                    <option value="none">Never (No exp claim)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-nexus-muted font-medium">HMAC Secret</label>
                    <label className="text-[10px] text-nexus-muted flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genSecretBase64}
                        onChange={(e) => setGenSecretBase64(e.target.checked)}
                        className="rounded border-nexus-border bg-nexus-base text-nexus-cyan focus:ring-0"
                      />
                      Base64
                    </label>
                  </div>
                  <input
                    type="text"
                    value={genSecret}
                    disabled={genAlgorithm === 'none'}
                    onChange={(e) => setGenSecret(e.target.value)}
                    placeholder="Enter signing secret..."
                    className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-nexus-cyan/60 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* JSON Editors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-rose-300 font-semibold uppercase tracking-wider">
                    Header JSON
                  </label>
                  <textarea
                    value={genHeaderJson}
                    onChange={(e) => setGenHeaderJson(e.target.value)}
                    rows={6}
                    className="w-full bg-nexus-base border border-rose-500/20 rounded-xl p-3 text-xs font-mono text-rose-200 focus:outline-none focus:border-rose-500/40 resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                    Payload JSON
                  </label>
                  <textarea
                    value={genPayloadJson}
                    onChange={(e) => setGenPayloadJson(e.target.value)}
                    rows={6}
                    className="w-full bg-nexus-base border border-indigo-500/20 rounded-xl p-3 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-500/40 resize-y"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {t('jwtStudio.generatorLabels.generate') || 'Generate Signed Token'}
              </button>
            </div>

            {/* Generated Token Result Box */}
            {generatedToken && (
              <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {t('jwtStudio.generatorLabels.generatedToken') || 'Generated Token'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        cyberAudio.click()
                        setRawToken(generatedToken)
                        setSecret(genSecret)
                        setIsSecretBase64(genSecretBase64)
                        setActiveTab('debugger')
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface/60 border border-white/5 text-[11px] text-nexus-cyan hover:bg-nexus-cyan/10 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Inspect in Debugger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedToken, setCopiedGenToken)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-nexus-border/50 text-[11px] text-white hover:border-nexus-cyan/40 transition-colors"
                    >
                      {copiedGenToken ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          {t('jwtStudio.generatorLabels.copyToken') || 'Copy Token'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="p-3.5 rounded-xl bg-nexus-base border border-emerald-500/20 text-xs font-mono text-emerald-200 break-all whitespace-pre-wrap leading-relaxed">
                  {generatedToken}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseToolTemplate>
  )
}
