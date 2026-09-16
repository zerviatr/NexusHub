import React from 'react';
import { X, Sparkles, Check, Zap, Shield, Cpu } from 'lucide-react';
import { Language } from '../lib/types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0e1b] border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#060812] border-b border-gray-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                ZenDev Sürüm Günlüğü & Yenilikler
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {lang === 'tr' ? 'En son resmi sürüm: v2.4.3' : 'Latest official release: v2.4.3'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll */}
        <div className="p-6 overflow-y-auto space-y-8 font-mono text-xs">
          {/* v2.4.3 */}
          <div className="border-l-2 border-cyan-400 pl-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cyan-300">v2.4.3 — Tauri v2 + Rust Geçişi</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[10px]">
                GÜNCEL SÜRÜM
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Masaüstü mimarisi Electron'dan tamamen Tauri v2 ve Rust tabanına geçirildi. Bellek tüketimi 450 MB'tan 35 MB'a düşürüldü.
            </p>
            <ul className="space-y-1.5 pt-1 text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Çift motorlu (Dual-engine) otomatik güncelleyici entegre edildi (GitHub Releases köprüsü).</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>libvips ve C++ bağımlılıkları arındırılarak kurulum boyutu 15 MB'a indirildi.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Windows NSIS ve bağımsız taşınabilir (Portable) paketleme iş akışları tamamlandı.</span>
              </li>
            </ul>
          </div>

          {/* v2.4.2 */}
          <div className="border-l-2 border-purple-400 pl-4 space-y-2 opacity-80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-purple-300">v2.4.2 — Tray Memory Sweep</span>
              <span className="text-[10px] text-gray-500">14 Eylül 2026</span>
            </div>
            <ul className="space-y-1.5 text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>Sistem tepsisine (Tray) küçültüldüğünde belleği otomatik boşaltan bellek süpürme mekanizması.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>HashStudio büyük dosya işleme bellek taşması (OOM) koruması.</span>
              </li>
            </ul>
          </div>

          {/* v2.4.1 */}
          <div className="border-l-2 border-gray-700 pl-4 space-y-2 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-300">v2.4.1 — Güvenlik & Kripto Sertifikasyonu</span>
              <span className="text-[10px] text-gray-500">10 Eylül 2026</span>
            </div>
            <ul className="space-y-1.5 text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                <span>DoD 5220.22-M 7-pass dosya parçalama motoru (Shredder) eklendi.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                <span>NetDispatcher yerel ağ SSRF ve DNS rebinding kalkanı devreye alındı.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#060812] border-t border-gray-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
