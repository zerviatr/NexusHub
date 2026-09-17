import React from 'react';
import { Terminal, Github, MessageSquare, ShieldCheck, ArrowUp } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/translations';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const t = translations[lang].footer;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#040509] border-t border-gray-800/80 pt-16 pb-12 text-gray-400 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 p-[1px] flex items-center justify-center">
                <div className="w-full h-full bg-[#05060b] rounded-[7px] flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Zen<span className="text-cyan-400">Dev</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-bold">
                v2.5.3
              </span>
            </div>
            <p className="text-gray-400 text-xs max-w-md leading-relaxed">
              {t.tagline}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/zerviatr/NexusHub"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#0a0d18] border border-gray-800 hover:border-cyan-500/40 hover:text-white transition"
                title="GitHub Repository"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://discord.gg/zendev"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#0a0d18] border border-gray-800 hover:border-cyan-500/40 hover:text-white transition"
                title="Discord Community"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="https://www.virustotal.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#0a0d18] border border-gray-800 hover:border-emerald-500/40 hover:text-emerald-400 transition"
                title="VirusTotal 0/72 Clean Code"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Hızlı Erişim</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#download" className="hover:text-cyan-400 transition">İndirme Merkezi</a>
              </li>
              <li>
                <a href="#playground" className="hover:text-cyan-400 transition">Canlı Simülatör</a>
              </li>
              <li>
                <a href="#arsenal" className="hover:text-cyan-400 transition">27+ Araç Kataloğu</a>
              </li>
              <li>
                <a href="#radar" className="hover:text-cyan-400 transition">Tauri v2 Hız Testi</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-cyan-400 transition">Fiyatlandırma</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Destek & Güvenlik</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#portal" className="hover:text-cyan-400 transition">HWID Sıfırlama Portalı</a>
              </li>
              <li>
                <a href="/robots.txt" className="hover:text-cyan-400 transition">Robots & Sitemap</a>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">Son Kullanıcı Lisansı (EULA)</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">Gizlilik Politikası (%100 Yerel)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-gray-500 text-center sm:text-left">
            <div>© 2026 ZenDev Desktop. {t.allRights}</div>
            <div className="text-[10px] text-gray-600 mt-1">{t.disclaimer}</div>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0d18] border border-gray-800 hover:border-cyan-500/40 text-gray-400 hover:text-white transition"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Yukarı Çık</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
