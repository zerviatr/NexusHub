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
import { Download, Globe, Menu, X, Sparkles, Terminal, Volume2, VolumeX, Search, Command, Gift } from 'lucide-react';
import { Language, Currency } from '../lib/types';
import { translations } from '../lib/translations';
import { cyberAudio } from '../lib/cyberAudio';
import { ZENDEV_RELEASE_CONFIG, triggerDirectDownload } from '../lib/downloadHelper';

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onOpenChangelog: () => void;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
  onOpenWaitlist: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  setLang,
  currency,
  setCurrency,
  onOpenChangelog,
  onOpenSearch,
  onOpenShortcuts,
  onOpenWaitlist
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [audioActive, setAudioActive] = useState(cyberAudio.enabled);
  const t = translations[lang].nav;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleAudio = () => {
    const next = cyberAudio.toggle();
    setAudioActive(next);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070913]/92 backdrop-blur-md border-b border-cyan-500/20 shadow-lg shadow-black/40 py-2.5'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
              <div className="w-full h-full bg-[#070913] rounded-[10px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white font-mono">
                  Zen<span className="text-cyan-400">Dev</span>
                </span>
              </div>
              <span className="text-[9px] text-gray-400 font-mono tracking-wider">
                TAURI v2 + RUST
              </span>
            </div>
          </a>

          {/* Clickable version badge for changelog */}
          <button
            onClick={() => {
              cyberAudio.playClick();
              onOpenChangelog();
            }}
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-white transition cursor-pointer whitespace-nowrap"
            title={lang === 'tr' ? 'v2.5.2 Yenilikleri Gör' : "View v2.5.2 What's New"}
          >
            v2.5.2
          </button>
        </div>

        {/* Desktop Nav Links (Streamlined to 5 non-wrapping concise items) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-medium text-gray-300 font-mono">
          <a
            href="#playground"
            className="hover:text-cyan-400 transition flex items-center gap-1 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>{lang === 'tr' ? 'Demo' : 'Playground'}</span>
          </a>
          <a href="#arsenal" className="hover:text-cyan-400 transition whitespace-nowrap">
            {lang === 'tr' ? 'Araçlar' : 'Arsenal'}
          </a>
          <a href="#radar" className="hover:text-cyan-400 transition whitespace-nowrap">
            {lang === 'tr' ? 'Mimari' : 'Architecture'}
          </a>
          <a href="#pricing" className="hover:text-cyan-400 transition whitespace-nowrap">
            {lang === 'tr' ? 'Fiyatlar' : 'Pricing'}
          </a>
          <a href="#faq" className="hover:text-cyan-400 transition whitespace-nowrap">
            FAQ
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          {/* Global Search Ctrl+K Button */}
          <button
            onClick={() => {
              cyberAudio.playClick();
              onOpenSearch();
            }}
            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-[#0d1222] border border-gray-800 hover:border-cyan-500/40 transition cursor-pointer whitespace-nowrap"
            title="Komut Paleti (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <kbd className="text-[10px] bg-[#161d30] px-1.5 py-0.5 rounded border border-gray-700 text-gray-300 font-mono">
              Ctrl K
            </kbd>
          </button>

          {/* Shortcuts Drawer Button */}
          <button
            onClick={() => {
              cyberAudio.playClick();
              onOpenShortcuts();
            }}
            className="p-1.5 text-gray-400 hover:text-cyan-300 rounded-lg bg-[#0d1222] border border-gray-800 hover:border-cyan-500/40 transition cursor-pointer"
            title={lang === 'tr' ? 'Kısayollar & CLI Kılavuzu' : 'Shortcuts & CLI Cheatsheet'}
          >
            <Command className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Cyber Audio Synthesizer Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              audioActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-[#0d1222] text-gray-500 border-gray-800 hover:text-gray-300'
            }`}
            title={
              audioActive
                ? (lang === 'tr' ? 'Sesi Kapat' : 'Mute Sci-Fi Audio')
                : (lang === 'tr' ? 'Sesi Aç' : 'Enable Sci-Fi Audio')
            }
          >
            {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* %20 Waitlist Coupon Trigger */}
          <button
            onClick={() => {
              cyberAudio.playClick();
              onOpenWaitlist();
            }}
            className="flex items-center gap-1 text-xs font-mono text-amber-300 hover:text-amber-200 px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 hover:border-amber-500/70 transition cursor-pointer whitespace-nowrap"
            title={lang === 'tr' ? '%20 Erken Erişim İndirimi' : 'Claim 20% Discount'}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>%20 {lang === 'tr' ? 'İndirim' : 'Off'}</span>
          </button>

          {/* Currency Switcher */}
          <div className="flex items-center bg-[#0d1222] border border-gray-800 rounded-lg p-0.5 text-xs font-mono whitespace-nowrap">
            {(['TRY', 'USD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-1.5 py-0.5 rounded transition ${
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
            className="flex items-center gap-1 text-xs font-mono text-gray-300 hover:text-cyan-300 px-2 py-1.5 rounded-lg bg-[#0d1222] border border-gray-800 hover:border-cyan-500/40 transition cursor-pointer whitespace-nowrap"
            title="Dili Değiştir / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Direct Download CTA */}
          <a
            href={ZENDEV_RELEASE_CONFIG.setupExe}
            download="ZenDev-Setup-2.5.2.exe"
            onClick={(e) => {
              cyberAudio.playClick();
            }}
            title="Download ZenDev v2.5.2 Setup (.exe)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition transform hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.downloadBtn}</span>
          </a>
        </div>

        {/* Mobile Action Row */}
        <div className="flex lg:hidden items-center gap-2">
          {/* Quick Search trigger on mobile */}
          <button
            onClick={() => {
              cyberAudio.playClick();
              onOpenSearch();
            }}
            className="p-2 text-cyan-400 rounded-lg bg-[#0d1222] border border-gray-800"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Audio toggle on mobile */}
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg border ${
              audioActive ? 'text-cyan-300 border-cyan-500/40 bg-cyan-950/50' : 'text-gray-500 border-gray-800 bg-[#0d1222]'
            }`}
          >
            {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="text-xs font-mono text-gray-300 px-2 py-1.5 rounded bg-[#0d1222] border border-gray-800"
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
              {lang === 'tr' ? 'Canlı Demo Simülatörü' : 'Live Playground'}
            </a>
            <a href="#arsenal" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? '31+ Araç Kataloğu' : '31+ Tools Arsenal'}
            </a>
            <a href="#radar" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? 'Tauri v2 vs Electron Mimarisi' : 'Architecture Radar'}
            </a>
            <a href="#testimonials" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? 'Mühendis İncelemeleri' : 'Customer Reviews'}
            </a>
            <a href="#calculator" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? 'Tasarruf Hesaplayıcısı' : 'Savings Calculator'}
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? 'Fiyatlandırma & Lisans' : 'Pricing & Licensing'}
            </a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              FAQ
            </a>
            <a href="#portal" onClick={() => setMobileOpen(false)} className="py-1 hover:text-cyan-400">
              {lang === 'tr' ? 'Müşteri Lisans Portalı' : 'Customer Portal'}
            </a>
          </nav>

          <div className="pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2">
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
                onOpenShortcuts();
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30"
            >
              <Command className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Kısayollar' : 'Shortcuts'}</span>
            </button>

            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenWaitlist();
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-amber-300 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>%20 Kupon</span>
            </button>

            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenChangelog();
              }}
              className="text-xs font-mono text-purple-300 px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30"
            >
              {t.whatsNew}
            </button>
          </div>

          <a
            href={ZENDEV_RELEASE_CONFIG.setupExe}
            download="ZenDev-Setup-2.5.2.exe"
            onClick={() => {
              cyberAudio.playClick();
              setMobileOpen(false);
            }}
            title="Download ZenDev v2.5.2 Setup (.exe)"
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-sky-400 rounded-lg shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadBtn}</span>
          </a>
        </div>
      )}
    </header>
  );
};
