import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Pipette,
  Copy,
  Check,
  Upload,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  SunMedium,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'

// Color conversion utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    }
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    }
  }
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rP = r / 255
  const gP = g / 255
  const bP = b / 255
  const k = 1 - Math.max(rP, gP, bP)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = Math.round(((1 - rP - k) / (1 - k)) * 100)
  const m = Math.round(((1 - gP - k) / (1 - k)) * 100)
  const y = Math.round(((1 - bP - k) / (1 - k)) * 100)
  return { c, m, y, k: Math.round(k * 100) }
}

// WCAG Luminance & Contrast
function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1) || { r: 255, g: 255, b: 255 }
  const rgb2 = hexToRgb(hex2) || { r: 0, g: 0, b: 0 }
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2))
}

type TabMode = 'converter' | 'palette' | 'contrast' | 'gradient'

export default function ColorStudio() {
  const { success: showToastSuccess, error: showToastError } = useToast()
  const [activeTab, setActiveTab] = useState<TabMode>('converter')

  // Converter state
  const [hex, setHex] = useState('#8B5CF6')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Eyedropper support
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  // Palette Extractor state
  const [extractedPalette, setExtractedPalette] = useState<string[]>([
    '#8B5CF6',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#EC4899',
  ])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Contrast state
  const [fgColor, setFgColor] = useState('#FFFFFF')
  const [bgColor, setBgColor] = useState('#0A0A0F')

  // Gradient state
  const [gradColor1, setGradColor1] = useState('#8B5CF6')
  const [gradColor2, setGradColor2] = useState('#06B6D4')
  const [gradAngle, setGradAngle] = useState(135)
  const [gradType, setGradType] = useState<'linear' | 'radial'>('linear')

  // Computed conversions
  const rgb = hexToRgb(hex) || { r: 139, g: 92, b: 246 }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b)

  const contrastRatio = getContrastRatio(fgColor, bgColor)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    try {
      cyberAudio.copySuccess()
    } catch {}
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
    showToastSuccess('Kopyalandı', text)
  }

  // EyeDropper handler
  const handlePickColor = async () => {
    if (!hasEyeDropper) return
    try {
      cyberAudio.click()
      const eyeDropper = new (window as any).EyeDropper()
      const res = await eyeDropper.open()
      if (res?.sRGBHex) {
        setHex(res.sRGBHex.toUpperCase())
        cyberAudio.copySuccess()
        showToastSuccess('Renk Seçildi', res.sRGBHex)
      }
    } catch {
      // User cancelled picker
    }
  }

  // Image upload and palette extraction
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      setImagePreview(src)
      extractPaletteFromImage(src)
    }
    reader.readAsDataURL(file)
  }

  const extractPaletteFromImage = (src: string) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 64
      canvas.height = 64
      ctx.drawImage(img, 0, 0, 64, 64)

      const imgData = ctx.getImageData(0, 0, 64, 64).data
      const colorCounts = new Map<string, number>()

      for (let i = 0; i < imgData.length; i += 16) {
        const r = Math.round(imgData[i] / 24) * 24
        const g = Math.round(imgData[i + 1] / 24) * 24
        const b = Math.round(imgData[i + 2] / 24) * 24
        const a = imgData[i + 3]
        if (a > 128) {
          const h = rgbToHex(r, g, b).toUpperCase()
          colorCounts.set(h, (colorCounts.get(h) || 0) + 1)
        }
      }

      const sorted = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([c]) => c)

      if (sorted.length > 0) {
        setExtractedPalette(sorted)
        cyberAudio.copySuccess()
        showToastSuccess('Palet Çıkarıldı', `${sorted.length} dominant renk tespit edildi.`)
      }
    }
    img.src = src
  }

  const cssGradientString =
    gradType === 'linear'
      ? `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})`
      : `radial-gradient(circle, ${gradColor1}, ${gradColor2})`

  return (
    <BaseToolTemplate
      icon={Palette}
      title="Color Studio & Contrast Suite"
      description="HEX, RGB, HSL ve CMYK renk dönüştürücü, ekran damlalığı, görselden renk paleti çıkarıcı ve WCAG 2.1 kontrast denetleyici."
      gradient="from-purple-600 to-pink-500"
    >
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10 w-fit mb-6">
        {[
          { id: 'converter', label: 'Renk Dönüştürücü & Damlalık' },
          { id: 'palette', label: 'Görsel Paleti Çıkarıcı' },
          { id: 'contrast', label: 'WCAG Kontrast Denetleyici' },
          { id: 'gradient', label: 'CSS Gradyan Stüdyosu' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              cyberAudio.click()
              setActiveTab(tab.id as TabMode)
            }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20 font-semibold'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Converter & Eyedropper */}
      {activeTab === 'converter' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 glass-card p-6 flex flex-col items-center justify-center gap-6">
            <div
              className="w-44 h-44 rounded-3xl shadow-2xl border-4 border-white/10 transition-all duration-300 relative group flex items-center justify-center"
              style={{ backgroundColor: hex }}
            >
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value.toUpperCase())}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Renk Paletini Aç"
              />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono text-white pointer-events-none">
                Değiştirmek İçin Tıkla
              </span>
            </div>

            {hasEyeDropper && (
              <button
                type="button"
                onClick={handlePickColor}
                className="w-full py-2.5 px-4 rounded-xl bg-nexus-surface hover:bg-white/[0.06] border border-nexus-border text-xs font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
              >
                <Pipette className="w-4 h-4 text-nexus-cyan" />
                <span>Ekranda İstediğin Yerden Renk Seç (Damlalık)</span>
              </button>
            )}
          </div>

          <div className="lg:col-span-7 glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-nexus-accent" />
              <span>Anlık Renk Kodları & Çıktılar</span>
            </h3>

            {[
              { label: 'HEX', val: hex, key: 'hex' },
              { label: 'RGB', val: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, key: 'rgb' },
              { label: 'HSL', val: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, key: 'hsl' },
              { label: 'CMYK', val: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`, key: 'cmyk' },
              { label: 'CSS Var', val: `--color-primary: ${hex};`, key: 'css' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-nexus-surface/60 border border-nexus-border/40"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-nexus-muted uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <span className="text-sm font-mono text-white font-semibold">{item.val}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.val, item.key)}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-all active:scale-90"
                  title="Kopyala"
                >
                  {copiedKey === item.key ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Palette Extractor */}
      {activeTab === 'palette' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Görselden Renk Paleti Çıkarma</h3>
              <p className="text-xs text-nexus-muted mt-0.5">
                Fotoğraf veya banner yükleyin, algoritma dominant renkleri otomatik çıkarsın.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-nexus-accent hover:bg-nexus-accent/90 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-nexus-accent/20 transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Görsel Yükle</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {imagePreview && (
            <div className="w-full h-44 rounded-2xl overflow-hidden bg-black/40 border border-nexus-border flex items-center justify-center relative">
              <img src={imagePreview} alt="Uploaded preview" className="h-full object-contain" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-mono text-nexus-muted mb-3 uppercase tracking-wider">
              Dominant Renk Paleti (Kopyalamak İçin Tıkla)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {extractedPalette.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => copyToClipboard(color, `pal_${idx}`)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-nexus-surface/60 border border-nexus-border/50 hover:border-nexus-cyan/50 hover:scale-105 transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-xl shadow-md border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-nexus-muted group-hover:text-white">
                    {color}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: WCAG Contrast Checker */}
      {activeTab === 'contrast' && (
        <div className="glass-card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-white block">Metin Rengi (Foreground)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-white block">Arka Plan Rengi (Background)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Contrast Score Box */}
          <div className="p-6 rounded-2xl border border-nexus-border flex flex-col md:flex-row items-center justify-between gap-6" style={{ backgroundColor: bgColor }}>
            <div>
              <p className="text-2xl font-bold font-sans" style={{ color: fgColor }}>
                Büyük Başlık Örneği
              </p>
              <p className="text-sm font-sans mt-1 opacity-90" style={{ color: fgColor }}>
                Bu metin seçtiğiniz renk kombinasyonunun gerçek okunabilirliğini test eder.
              </p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shrink-0">
              <span className="text-3xl font-mono font-extrabold text-white">
                {contrastRatio}:1
              </span>
              <span className="text-[10px] block font-mono text-nexus-muted mt-0.5">Kontrast Skoru</span>
            </div>
          </div>

          {/* WCAG Compliance Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'AA Normal Metin', required: '>= 4.5:1', pass: contrastRatio >= 4.5 },
              { label: 'AA Büyük Metin', required: '>= 3.0:1', pass: contrastRatio >= 3.0 },
              { label: 'AAA Normal Metin', required: '>= 7.0:1', pass: contrastRatio >= 7.0 },
              { label: 'AAA Büyük Metin', required: '>= 4.5:1', pass: contrastRatio >= 4.5 },
            ].map((check, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-2 ${
                  check.pass
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{check.label}</span>
                  {check.pass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <span className="text-[10px] font-mono opacity-70">Standart: {check.required}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: CSS Gradient Studio */}
      {activeTab === 'gradient' && (
        <div className="glass-card p-6 space-y-6">
          <div
            className="w-full h-48 rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 flex items-center justify-center"
            style={{ background: cssGradientString }}
          >
            <span className="px-4 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white font-mono text-xs border border-white/10">
              Canlı CSS Gradyan Önizleme
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-white block mb-2">Başlangıç Rengi</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradColor1}
                  onChange={(e) => setGradColor1(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={gradColor1}
                  onChange={(e) => setGradColor1(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-2">Bitiş Rengi</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradColor2}
                  onChange={(e) => setGradColor2(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={gradColor2}
                  onChange={(e) => setGradColor2(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-nexus-surface border border-nexus-border text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-2">
                Açı: {gradAngle}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={gradAngle}
                onChange={(e) => setGradAngle(parseInt(e.target.value, 10))}
                className="w-full accent-nexus-accent mt-3"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-nexus-surface border border-nexus-border">
            <code className="text-xs font-mono text-nexus-cyan truncate mr-4">
              background: {cssGradientString};
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(`background: ${cssGradientString};`, 'grad_css')}
              className="px-4 py-2 rounded-xl bg-nexus-accent text-white text-xs font-mono font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-nexus-accent/20 shrink-0"
            >
              {copiedKey === 'grad_css' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Kopyala</span>
            </button>
          </div>
        </div>
      )}
    </BaseToolTemplate>
  )
}
