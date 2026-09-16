import React, { useState, useEffect } from 'react';
import { Binary, Copy, Check, ShieldCheck } from 'lucide-react';

export const LiveHashDemo: React.FC = () => {
  const [input, setInput] = useState('ZenDev v2.5.2 Tauri Edition — 100% Offline & Private');
  const [sha256, setSha256] = useState('');
  const [copied, setCopied] = useState(false);

  const calculateHash = async (text: string) => {
    setInput(text);
    if (!text) {
      setSha256('');
      return;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setSha256(hashHex);
    } catch {
      setSha256('Hesaplanamadı');
    }
  };

  useEffect(() => {
    calculateHash(input);
  }, []);

  const handleCopy = () => {
    if (!sha256) return;
    navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            HashStudio: SHA-256 Motoru
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3 h-3" />
          <span>Sıfır Ağ İsteği / Web Crypto</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">Girdi Metni (Canlı):</label>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => calculateHash(e.target.value)}
          placeholder="Hashlenecek metni buraya yazın..."
          className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg p-3 text-sm font-mono text-white outline-none transition resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-mono text-gray-400">SHA-256 Çıktısı:</label>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
        <div className="bg-[#050711] border border-cyan-500/30 rounded-lg p-3 font-mono text-xs text-cyan-300 break-all select-all flex items-center justify-between">
          <span>{sha256 || '...'}</span>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between pt-1">
        <span>Bit Genişliği: 256-bit (64 Hex Karakteri)</span>
        <span>Masaüstü Sürüm: MD5, SHA-1, SHA-512, bcrypt ve Dosya Checksum</span>
      </div>
    </div>
  );
};
