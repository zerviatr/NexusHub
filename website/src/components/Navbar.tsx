import React, { useState, useEffect } from 'react';
import { Download, Globe, Menu, X, Sparkles, Terminal } from 'lucide-react';
import { Language, Currency } from '../lib/types';
import { translations } from '../lib/translations';

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onOpenChangelog: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  setLang,
  currency,
  setCurrency,
  onOpenChangelog
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[lang].nav;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070913]/90 backdrop-blur-md border-b border-cyan-500/20 shadow-lg shadow-black/40 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand / Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
            <div className="w-full h-full bg-[#070913] rounded-[10px] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono">
                Zen<span className="text-cyan-400">Dev</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                v2.4.3
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider">
              TAURI v2 + RUST
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-gray-300">
          <a href="#playground" className="hover:text-cyan-400 transition flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {t.playground}
          </a>
          <a href="#arsenal" className="hover:text-cyan-400 transition">
            {t.tools}
          </a>
          <a href="#radar" className="hover:text-cyan-400 transition">
            {t.performance}
          </a>
          <a href="#calculator" className="hover:text-cyan-400 transition">
            {t.calculator}
          </a>
          <a href="#pricing" className="hover:text-cyan-400 transition">
            {t.pricing}
          </a>
          <a href="#portal" className="hover:text-cyan-400 transition">
            {t.portal}
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Currency Switcher */}
          <div className="flex items-center bg-[#0d1222] border border-gray-800 rounded-lg p-1 text-xs font-mono">
            {(['TRY', 'USD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2 py-0.5 rounded transition ${
                  currency === c
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'}
              </button>
            ))}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="flex items-center gap-1.5 text-xs font-mono text-gray-300 hover:text-cyan-300 px-2.5 py-1.5 rounded-lg bg-[#0d1222] border border-gray-800 hover:border-cyan-500/40 transition"
            title="Dili Değiştir / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* What's new modal button */}
          <button
            onClick={onOpenChangelog}
            className="text-xs font-mono text-purple-300 hover:text-purple-200 px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 hover:border-purple-500/60 transition"
          >
            {t.whatsNew}
          </button>

          {/* Download CTA */}
          <a
            href="#download"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadBtn}</span>
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="text-xs font-mono text-gray-300 px-2 py-1 rounded bg-[#0d1222] border border-gray-800"
          >
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-gray-300 hover:text-white rounded-lg bg-[#0d1222] border border-gray-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#070913]/98 border-b border-gray-800 px-6 py-6 space-y-4 shadow-2xl backdrop-blur-xl">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-gray-300">
            <a
              href="#playground"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-1 text-cyan-400"
            >
              <Sparkles className="w-4 h-4" />
              {t.playground}
            </a>
            <a href="#arsenal" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {t.tools}
            </a>
            <a href="#radar" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {t.performance}
            </a>
            <a href="#calculator" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {t.calculator}
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {t.pricing}
            </a>
            <a href="#portal" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {t.portal}
            </a>
          </nav>

          <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-[#0d1222] p-1 rounded-lg border border-gray-800 text-xs font-mono">
              {(['TRY', 'USD', 'EUR'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 rounded ${
                    currency === c ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-gray-400'
                  }`}
                >
                  {c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenChangelog();
              }}
              className="text-xs font-mono text-purple-300 px-3 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30"
            >
              {t.whatsNew}
            </button>
          </div>

          <a
            href="#download"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-sky-400 rounded-lg shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadBtn}</span>
          </a>
        </div>
      )}
    </header>
  );
};
