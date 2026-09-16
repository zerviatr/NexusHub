import React, { useState, useMemo } from 'react';
import { Palette, Check, AlertTriangle } from 'lucide-react';
import { cyberAudio } from '../../lib/cyberAudio';

export const LiveColorDemo: React.FC = () => {
  const [hex, setHex] = useState('#00f2fe');

  // Compute RGB from HEX
  const rgb = useMemo(() => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b };
  }, [hex]);

  // Compute Relative Luminance for WCAG Contrast
  const luminance = useMemo(() => {
    const a = [rgb.r, rgb.g, rgb.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }, [rgb]);

  // Contrast against black (0) and white (1)
  const contrastOnDark = useMemo(() => {
    const darkLum = 0.05; // #05060b lum approx
    return Number(((Math.max(luminance, darkLum) + 0.05) / (Math.min(luminance, darkLum) + 0.05)).toFixed(2));
  }, [luminance]);

  const passesAA = contrastOnDark >= 4.5;
  const passesAAA = contrastOnDark >= 7.0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            ColorStudio: WCAG 2.1 Kontrast & Renk Laboratuvarı
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
          WCAG 2.1 AA / AAA
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Color Input & Swatch */}
        <div className="space-y-3 bg-[#090d1a] border border-gray-800 p-4 rounded-xl">
          <label className="block text-xs font-mono text-gray-400">Renk Seçici veya HEX Kodu:</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={hex}
              onChange={(e) => {
                setHex(e.target.value);
                cyberAudio.playClick();
              }}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="flex-1 bg-[#050711] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none uppercase"
            />
          </div>

          <div className="text-xs font-mono text-gray-400 space-y-1 pt-1">
            <div>RGB: <span className="text-cyan-300">rgb({rgb.r}, {rgb.g}, {rgb.b})</span></div>
            <div>CSS Token: <span className="text-purple-300">var(--color-brand)</span></div>
          </div>
        </div>

        {/* Live Contrast Compliance Box */}
        <div className="bg-[#090d1a] border border-gray-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <span className="block text-xs font-mono text-gray-400 mb-2">Koyu Zemin Kontrast Skoru:</span>
            <div className="text-3xl font-black font-mono text-white flex items-baseline gap-2">
              <span>{contrastOnDark}:1</span>
              <span className="text-xs font-normal text-gray-400">oranı</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                passesAA
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>WCAG AA (4.5:1)</span>
              {passesAA ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            </div>

            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                passesAAA
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}
            >
              <span>WCAG AAA (7.0:1)</span>
              {passesAAA ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
