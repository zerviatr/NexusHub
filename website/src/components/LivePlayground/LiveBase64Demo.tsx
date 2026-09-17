// Copyright 2025 Lee Boonstra
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState, useEffect } from 'react';
import { Binary, ArrowRightLeft, Copy, Check, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { cyberAudio } from '../../lib/cyberAudio';

type Base64Mode = 'encode' | 'decode';

export const LiveBase64Demo: React.FC = () => {
  const [mode, setMode] = useState<Base64Mode>('encode');
  const [input, setInput] = useState('ZenDev v2.5.3: Hızlı, Güvenli ve Özgür Geliştirici Paketi! 🚀');
  const [urlSafe, setUrlSafe] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // UTF-8 safe encode helper
  const encodeUtf8 = (str: string, isUrlSafe: boolean): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    let b64 = btoa(binary);
    if (isUrlSafe) {
      b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return b64;
  };

  // UTF-8 safe decode helper
  const decodeUtf8 = (b64: string): string => {
    let clean = b64.trim();
    if (!clean) return '';
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  };

  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      if (mode === 'encode') {
        const encoded = encodeUtf8(input, urlSafe);
        setOutput(encoded);
        setError(null);
      } else {
        const decoded = decodeUtf8(input);
        setOutput(decoded);
        setError(null);
      }
    } catch (err: unknown) {
      setOutput('');
      setError(
        mode === 'decode'
          ? 'Geçersiz Base64 dizisi veya bozuk UTF-8 bayt dizilimi.'
          : 'Kodlama sırasında beklenmeyen hata oluştu.'
      );
    }
  }, [input, mode, urlSafe]);

  const handleSwapMode = () => {
    cyberAudio.playClick();
    if (output && !error) {
      const currentOutput = output;
      setMode((prev) => (prev === 'encode' ? 'decode' : 'encode'));
      setInput(currentOutput);
    } else {
      setMode((prev) => (prev === 'encode' ? 'decode' : 'encode'));
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    cyberAudio.playSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadPreset = (presetText: string, presetMode: Base64Mode) => {
    cyberAudio.playClick();
    setMode(presetMode);
    setInput(presetText);
  };

  // Byte calculations
  const inputBytes = new TextEncoder().encode(input).byteLength;
  const outputBytes = output ? new TextEncoder().encode(output).byteLength : 0;

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            Base64Studio: İki Yönlü UTF-8 Güvenli Dönüştürücü
          </span>
        </div>

        {/* Mode Toggle & URL-Safe Option */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#050711] border border-gray-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => {
                cyberAudio.playClick();
                setMode('encode');
              }}
              className={`px-3 py-1 rounded-md transition ${
                mode === 'encode'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ENCODE (Metin → Base64)
            </button>
            <button
              onClick={() => {
                cyberAudio.playClick();
                setMode('decode');
              }}
              className={`px-3 py-1 rounded-md transition ${
                mode === 'decode'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              DECODE (Base64 → Metin)
            </button>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapMode}
            title="Girdi ve Çıktıyı Değiş Tokuş Et"
            className="p-1.5 rounded-lg bg-[#050711] border border-gray-800 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-300 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div>
        <div className="flex items-center justify-between mb-1 text-xs font-mono text-gray-400">
          <label>
            {mode === 'encode' ? 'Ham Metin / UTF-8 Girdi:' : 'Base64 Kodlanmış Dize:'}
          </label>
          <span className="text-[11px] text-gray-500">
            {input.length} Karakter • {inputBytes} Bayt
          </span>
        </div>
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === 'encode'
              ? 'Kodlamak istediğiniz metni veya JSON verisini girin...'
              : 'Çözümlemek istediğiniz Base64 dizesini girin...'
          }
          className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg p-3 text-xs font-mono text-gray-200 outline-none transition resize-none"
        />
      </div>

      {/* Options & Presets Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {mode === 'encode' && (
          <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => {
                cyberAudio.playClick();
                setUrlSafe(e.target.checked);
              }}
              className="rounded border-gray-700 bg-gray-900 text-cyan-400 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-[11px]">URL-Safe Base64 (+, / yerine -, _ kullan)</span>
          </label>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-gray-500">Hazır Örnekler:</span>
          <button
            onClick={() => loadPreset('ZenDev v2.5.3: Hızlı, Güvenli ve Özgür Geliştirici Paketi! 🚀', 'encode')}
            className="px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-[11px] text-gray-300 border border-gray-800"
          >
            Türkçe & Emoji
          </button>
          <button
            onClick={() => loadPreset('{"app":"ZenDev","tier":"Pro","engine":"Tauri v2"}', 'encode')}
            className="px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-[11px] text-gray-300 border border-gray-800"
          >
            JSON
          </button>
          <button
            onClick={() => loadPreset('WmVuRGV2IHYyLjUuMjogSMSxemzEsSwgR8O8dmVubGkgdmUgw5Z6Z8O8ciBHZWxpxZ90aXJpY2kgUGFrZXRpISDwn5qA', 'decode')}
            className="px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-[11px] text-cyan-300 border border-cyan-500/30"
          >
            Base64 Örneği
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-gray-400">
            {mode === 'encode' ? 'Base64 Çıktı:' : 'Çözümlenmiş UTF-8 Metin:'}
          </span>
          <div className="flex items-center gap-3">
            {output && !error && (
              <span className="text-[11px] font-mono text-gray-500">
                {output.length} Karakter • {outputBytes} Bayt
              </span>
            )}
            <button
              onClick={handleCopy}
              disabled={!output || !!error}
              className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Kopyalandı' : 'Sonucu Kopyala'}</span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-rose-950/20 border border-rose-500/40 rounded-lg p-3 font-mono text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="bg-[#050711] border border-cyan-500/30 rounded-lg p-3 font-mono text-xs text-cyan-300 break-all select-all min-h-[50px] flex items-center">
            {output || <span className="text-gray-600">// Çıktı burada görünecek</span>}
          </div>
        )}
      </div>
    </div>
  );
};
