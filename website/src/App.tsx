import React, { useState } from 'react';
import { Language, Currency } from './lib/types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { LivePlayground } from './components/LivePlayground/LivePlayground';
import { ToolCatalog } from './components/ToolCatalog';
import { ArchitectureRadar } from './components/ArchitectureRadar';
import { RoiCalculator } from './components/RoiCalculator';
import { PricingSection } from './components/PricingSection';
import { LicensePortal } from './components/LicensePortal';
import { Footer } from './components/Footer';
import { ChangelogModal } from './components/ChangelogModal';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('tr');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#05060b] text-gray-200 selection:bg-cyan-500 selection:text-black font-sans">
      {/* Top Fixed Navbar */}
      <Navbar
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={setCurrency}
        onOpenChangelog={() => setChangelogOpen(true)}
      />

      {/* Main Content */}
      <main>
        {/* Hero with Download & Desktop Simulator */}
        <HeroSection lang={lang} />

        {/* Live In-Browser WebCrypto/WASM Playground */}
        <LivePlayground lang={lang} />

        {/* 27 Tools Categorized & Filterable Arsenal */}
        <ToolCatalog lang={lang} />

        {/* Tauri v2 vs Electron Architecture Radar */}
        <ArchitectureRadar lang={lang} />

        {/* Anti-SaaS Interactive Savings Calculator */}
        <RoiCalculator lang={lang} currency={currency} />

        {/* Pricing & Checkout with Coupon Engine */}
        <PricingSection lang={lang} currency={currency} setCurrency={setCurrency} />

        {/* Self-Service License & HWID Portal */}
        <LicensePortal lang={lang} />
      </main>

      {/* Footer */}
      <Footer lang={lang} />

      {/* Changelog & What's New Drawer */}
      <ChangelogModal
        isOpen={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        lang={lang}
      />
    </div>
  );
};

export default App;
