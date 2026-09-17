import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { cyberAudio } from '../../lib/cyberAudio';

export const LiveQrDemo: React.FC = () => {
  const [text, setText] = useState('https://zendev-production-4a5b.up.railway.app');
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!text.trim()) {
      setDataUrl('');
      return;
    }
    QRCode.toDataURL(text, {
      width: 220,
      margin: 1,
      color: {
        dark: '#00f2fe',
        light: '#070914'
      }
    })
      .then((url) => setDataUrl(url))
      .catch(() => {});
  }, [text]);

  const handleDownload = () => {
    if (!dataUrl) return;
    cyberAudio.playSuccess();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'zendev-qrcode.png';
    a.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    cyberAudio.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            QrCodeStudio: Vektörel QR İstasyonu
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
          İstemci Taraflı PNG / SVG
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-2 space-y-3">
          <label className="block text-xs font-mono text-gray-400">QR Koda Dönüştürülecek URL veya Metin:</label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              cyberAudio.playClick();
            }}
            placeholder="Metin veya bağlantı girin..."
            className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2.5 text-sm font-mono text-white outline-none"
          />

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-black font-bold bg-cyan-400 hover:bg-cyan-300 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG Olarak İndir</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-300 bg-[#090d1a] border border-gray-800 hover:text-white transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
            </button>
          </div>
        </div>

        {/* QR Preview Canvas/Image */}
        <div className="flex flex-col items-center justify-center p-3 bg-[#050711] border border-cyan-500/30 rounded-xl shadow-lg">
          {dataUrl ? (
            <img src={dataUrl} alt="ZenDev QR Code" className="w-32 h-32 rounded" />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center text-gray-600 text-xs font-mono">
              QR Yok
            </div>
          )}
          <span className="text-[10px] font-mono text-gray-500 mt-2">v2.5.3 QR Motoru</span>
        </div>
      </div>
    </div>
  );
};
