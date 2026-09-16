import React, { useState } from 'react';
import { Unlock, ArrowRightLeft, Copy, Check } from 'lucide-react';

export const LiveDecrypterDemo: React.FC = () => {
  const [input, setInput] = useState('WmVuRGV2IHYyLjQuMyAtIEFib25lbGlrIFR1emHEn8SxbmEgU29uIQ==');
  const [format, setFormat] = useState<'base64' | 'hex' | 'url' | 'binary'>('base64');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    try {
      if (format === 'base64') {
        setOutput(decodeURIComponent(escape(atob(input))));
      } else if (format === 'hex') {
        const cleanHex = input.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
          str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        setOutput(str);
      } else if (format === 'url') {
        setOutput(decodeURIComponent(input));
      } else if (format === 'binary') {
        const clean = input.trim().split(/\s+/);
        setOutput(clean.map((bin) => String.fromCharCode(parseInt(bin, 2))).join(''));
      }
    } catch {
      setOutput('// Çözümlenemedi: Giriş biçimi hatalı.');
    }
  }, [input, format]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Unlock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
            UniversalDecrypter: Çoklu Kod Çözücü
          </span>
        </div>
        {/* Format Selector */}
        <div className="flex items-center gap-1 bg-[#050711] border border-gray-800 rounded-lg p-1 text-xs font-mono">
          {(['base64', 'hex', 'url', 'binary'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-2 py-0.5 rounded transition ${
                format === fmt
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">Şifrelenmiş / Kodlanmış Metin:</label>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-[#090d1a] border border-gray-800 focus:border-emerald-400 rounded-lg p-3 text-xs font-mono text-gray-300 outline-none transition resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-mono text-gray-400">Çözümlenmiş Saf Metin:</label>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
        <div className="bg-[#050711] border border-emerald-500/30 rounded-lg p-3 font-mono text-sm text-emerald-300 break-words min-h-[44px]">
          {output}
        </div>
      </div>
    </div>
  );
};
