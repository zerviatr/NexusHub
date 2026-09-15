import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Braces,
  KeyRound,
  Palette,
  Calculator,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Zap
} from 'lucide-react'
import { SmartPasteResult } from '../lib/smartPasteDetector'
import { cyberAudio } from '../lib/cyberAudio'
import { useT } from '../lib/i18n'

interface SmartPasteCardProps {
  result: SmartPasteResult
  onApplyResult?: (val: string) => void
  onClose?: () => void
  compact?: boolean
}

export default function SmartPasteCard({
  result,
  onApplyResult,
  onClose,
  compact = false
}: SmartPasteCardProps) {
  const { t } = useT()
  const navigate = useNavigate()
  const [copiedAction, setCopiedAction] = useState<string | null>(null)
  const [showJwtPayload, setShowJwtPayload] = useState<boolean>(false)

  const triggerCopy = (text: string, actionKey: string) => {
    navigator.clipboard.writeText(text)
    cyberAudio.copySuccess()
    setCopiedAction(actionKey)
    setTimeout(() => setCopiedAction(null), 2000)
  }

  const navigateTo = (path: string, stateKey?: string, stateVal?: string) => {
    cyberAudio.click()
    if (stateKey && stateVal) {
      try {
        localStorage.setItem(stateKey, stateVal)
      } catch {}
    }
    onClose?.()
    navigate(path)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. JSON RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (result.type === 'json') {
    return (
      <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-nexus-surface to-cyan-500/10 border border-purple-500/30 shadow-lg shadow-purple-500/5 transition-all">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">
              <Braces className="w-3 h-3 text-purple-400" />
              [{t('smartPaste.jsonDetected')}]
            </span>
            <span className="text-[11px] text-nexus-muted font-mono">
              {result.isObject ? 'Object' : 'Array'} &bull; {result.itemCount} {result.isObject ? t('smartPaste.fields') : t('smartPaste.items')} &bull; {result.byteSize} B
            </span>
          </div>
          <span className="text-[10px] text-purple-400 font-mono hidden sm:inline">Smart Paste</span>
        </div>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {/* Formatla */}
          <button
            type="button"
            onClick={() => triggerCopy(result.formatted, 'json_format')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-purple-500/30 text-xs font-medium text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/60 transition-colors"
            title="Biçimlendir ve Panoya Kopyala"
          >
            {copiedAction === 'json_format' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{copiedAction === 'json_format' ? 'Kopyalandı!' : t('smartPaste.format')}</span>
          </button>

          {/* Minify Et */}
          <button
            type="button"
            onClick={() => triggerCopy(result.minified, 'json_minify')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-purple-500/30 text-xs font-medium text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/60 transition-colors"
            title="Boşlukları kaldırıp tek satır yap ve kopyala"
          >
            {copiedAction === 'json_minify' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{copiedAction === 'json_minify' ? 'Kopyalandı!' : t('smartPaste.minify')}</span>
          </button>

          {/* DevSandbox'ta Aç */}
          <button
            type="button"
            onClick={() => navigateTo('/dev-sandbox', 'nexus_sandbox_body', result.raw)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-nexus-cyan hover:bg-cyan-500/20 hover:border-cyan-500/60 transition-colors"
            title="DevSandbox HTTP Body olarak yükle ve aç"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('smartPaste.openInDevSandbox')}</span>
          </button>

          {/* JsonStudio'da Aç */}
          <button
            type="button"
            onClick={() => navigateTo('/json-studio', 'nexus_json_input', result.raw)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-nexus-text hover:bg-white/10 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{t('smartPaste.openInJsonStudio')}</span>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. JWT RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (result.type === 'jwt') {
    return (
      <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-nexus-surface to-rose-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5 transition-all">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              <KeyRound className="w-3 h-3 text-amber-400" />
              [{t('smartPaste.jwtDetected')}]
            </span>
            <span className="text-[11px] text-nexus-muted font-mono">
              Alg: <span className="text-white font-bold">{result.algorithm}</span>
              {result.subject && <> &bull; Sub: <span className="text-nexus-cyan">{result.subject}</span></>}
            </span>
          </div>

          {result.isExpired !== undefined && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                result.isExpired
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {result.isExpired ? t('smartPaste.expired') : t('smartPaste.valid')}
            </span>
          )}
        </div>

        {/* Action Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {/* Çöz (Decode) */}
          <button
            type="button"
            onClick={() => triggerCopy(JSON.stringify(result.payload, null, 2), 'jwt_decode')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-amber-500/30 text-xs font-medium text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors"
            title="Payload JSON'ı kopyala"
          >
            {copiedAction === 'jwt_decode' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{copiedAction === 'jwt_decode' ? 'Kopyalandı!' : t('smartPaste.decode')}</span>
          </button>

          {/* Payload Gör */}
          <button
            type="button"
            onClick={() => {
              cyberAudio.click()
              setShowJwtPayload(!showJwtPayload)
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface border border-white/10 text-xs font-medium text-nexus-text hover:bg-white/10 transition-colors"
          >
            {showJwtPayload ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            <span>{showJwtPayload ? t('smartPaste.hidePayload') : t('smartPaste.viewPayload')}</span>
          </button>

          {/* JSON Studio'da Aç */}
          <button
            type="button"
            onClick={() => navigateTo('/json-studio', 'nexus_jwt_input', result.raw)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{t('smartPaste.openInJwtStudio')}</span>
          </button>
        </div>

        {/* Inline Payload Preview accordion */}
        {showJwtPayload && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-nexus-text max-h-40 overflow-y-auto leading-relaxed">
            <pre className="text-amber-200/90 whitespace-pre-wrap">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. COLOR RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (result.type === 'color') {
    return (
      <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-nexus-surface to-cyan-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Color Swatch Preview Square */}
            <div
              className="w-8 h-8 rounded-lg border-2 border-white/30 shadow-md shrink-0 transition-transform hover:scale-110"
              style={{ backgroundColor: result.previewColor }}
              title={`Önizleme: ${result.hex}`}
            />

            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                  <Palette className="w-3 h-3 text-emerald-400" />
                  [{t('smartPaste.colorDetected')}]
                </span>
                <span className="text-xs font-mono font-semibold text-white">{result.hex}</span>
              </div>
              <div className="text-[11px] font-mono text-nexus-muted mt-0.5">
                {result.rgb} &bull; {result.hsl}
              </div>
            </div>
          </div>

          {/* Quick Copy Badges */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => triggerCopy(result.hex, 'color_hex')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-nexus-surface border border-emerald-500/30 text-xs font-mono text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              title="HEX Kopyala"
            >
              {copiedAction === 'color_hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>HEX</span>
            </button>

            <button
              type="button"
              onClick={() => triggerCopy(result.rgb, 'color_rgb')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-nexus-surface border border-emerald-500/30 text-xs font-mono text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              title="RGB Kopyala"
            >
              {copiedAction === 'color_rgb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>RGB</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/color-studio', 'nexus_target_color', result.hex)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 transition-colors"
              title="Color & Contrast Studio'da Aç"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{t('smartPaste.openInColorStudio')}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MATH & UNIT CONVERSION RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (result.type === 'math') {
    return (
      <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-r from-nexus-cyan/15 via-nexus-surface to-emerald-500/10 border border-nexus-cyan/40 shadow-lg shadow-nexus-cyan/5 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan shrink-0">
              {result.isUnitConversion ? <Sparkles className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-bold uppercase">
                  {result.isUnitConversion ? t('smartPaste.unitConversion') : t('smartPaste.calcResult')}
                </span>
                <span className="text-[11px] font-mono text-nexus-muted">{result.expression}</span>
              </div>

              {/* Instant Inline Calculation Result */}
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-mono font-bold text-nexus-cyan tracking-wide">
                  = {result.result}
                </span>
                {result.detail && (
                  <span className="text-[11px] font-mono text-nexus-muted hidden sm:inline">
                    ({result.detail})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => triggerCopy(result.result, 'math_result')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/40 text-xs font-semibold text-nexus-cyan hover:bg-nexus-cyan/30 transition-colors"
              title="Sonucu Panoya Kopyala"
            >
              {copiedAction === 'math_result' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedAction === 'math_result' ? 'Kopyalandı!' : t('smartPaste.copyResult')}</span>
            </button>

            {onApplyResult && (
              <button
                type="button"
                onClick={() => {
                  cyberAudio.click()
                  onApplyResult(result.result)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-nexus-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Arama çubuğuna sonucu yaz"
              >
                <span>{t('smartPaste.applyToSearch')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
