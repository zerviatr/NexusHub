import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { Language, Currency } from '../lib/types';
import { translations } from '../lib/translations';

interface RoiCalculatorProps {
  lang: Language;
  currency: Currency;
}

interface SaaSToolOption {
  id: string;
  name: string;
  monthlyCost: Record<Currency, number>;
  replacesZendev: string;
}

const SAAS_TOOLS: SaaSToolOption[] = [
  {
    id: 'postman',
    name: 'Postman Professional (REST Client)',
    monthlyCost: { TRY: 450, USD: 14, EUR: 13 },
    replacesZendev: 'ApiStudio & CurlRunner'
  },
  {
    id: 'db_tool',
    name: 'TablePlus / Navicat (DB GUI)',
    monthlyCost: { TRY: 280, USD: 8, EUR: 7.5 },
    replacesZendev: 'SqliteViewer (WASM SQLite)'
  },
  {
    id: 'pdf_tool',
    name: 'Adobe Acrobat / PDF Editor SaaS',
    monthlyCost: { TRY: 400, USD: 13, EUR: 12 },
    replacesZendev: 'PdfStudio (Local pdf-lib)'
  },
  {
    id: 'pwd_tool',
    name: '1Password / Bitwarden Family',
    monthlyCost: { TRY: 160, USD: 5, EUR: 4.5 },
    replacesZendev: 'PasswordGenerator & CyberFortress'
  },
  {
    id: 'cleaner',
    name: 'CleanMyPC / Disk Space Manager',
    monthlyCost: { TRY: 120, USD: 4, EUR: 3.5 },
    replacesZendev: 'SystemOptimizer & BulkOrganizer'
  },
  {
    id: 'network',
    name: 'Network & Port Diagnostic Tool',
    monthlyCost: { TRY: 150, USD: 5, EUR: 4.5 },
    replacesZendev: 'PortKiller & NetworkTools'
  }
];

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ lang, currency }) => {
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'postman',
    'db_tool',
    'pdf_tool',
    'pwd_tool'
  ]);

  const t = translations[lang].roi;

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';
  const zendevPrice = currency === 'TRY' ? 349 : currency === 'USD' ? 29 : 27;

  const { annualSaaS, netSavings, paybackDays } = useMemo(() => {
    const monthlyTotal = selectedTools.reduce((acc, id) => {
      const tool = SAAS_TOOLS.find((t) => t.id === id);
      return acc + (tool ? tool.monthlyCost[currency] : 0);
    }, 0);

    const annual = monthlyTotal * 12;
    const net = Math.max(0, annual - zendevPrice);
    const days = annual > 0 ? Math.round((zendevPrice / annual) * 365) : 0;

    return {
      annualSaaS: annual,
      netSavings: net,
      paybackDays: Math.max(1, days)
    };
  }, [selectedTools, currency, zendevPrice]);

  return (
    <section id="calculator" className="py-24 bg-[#05060b] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            {t.tag}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {t.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400">
            {t.subtitle}
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Tool selection checkboxes */}
          <div className="lg:col-span-7 bg-[#0a0d18] border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-sm font-bold font-mono text-gray-200 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Mevcut Ödediğiniz SaaS Araçları:</span>
              <span className="text-xs text-cyan-400">{selectedTools.length} Seçildi</span>
            </h3>

            <div className="space-y-3">
              {SAAS_TOOLS.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`cursor-pointer flex items-center justify-between p-3.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-[#101526] border-cyan-500/50 shadow-sm'
                        : 'bg-[#070912] border-gray-800/80 hover:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                          isSelected ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-gray-700'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-white">{tool.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          ZenDev Karşılığı: <span className="text-cyan-300">{tool.replacesZendev}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-rose-400">
                        -{tool.monthlyCost[currency]} {currencySymbol}/ay
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {tool.monthlyCost[currency] * 12} {currencySymbol}/yıl
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0c1020] via-[#090d1a] to-[#120f26] border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />

            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-6">
                <TrendingUp className="w-4 h-4" />
                <span>Hesaplanan Tasarruf Raporu</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-400">{t.annualSavings}</span>
                  <span className="text-rose-400 font-bold text-sm">
                    {annualSaaS.toLocaleString()} {currencySymbol}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-400">{t.zendevCost}</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {zendevPrice} {currencySymbol} (Ömür Boyu)
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <span className="block text-xs font-mono text-gray-300 mb-1">
                    {t.netProfit}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300 font-mono">
                    +{netSavings.toLocaleString()} {currencySymbol}
                  </div>
                </div>

                <div className="bg-[#050711]/80 border border-gray-800 rounded-xl p-3 text-xs font-mono flex items-center justify-between">
                  <span className="text-gray-400">{t.paybackPeriod}</span>
                  <span className="text-cyan-300 font-bold">
                    ~{paybackDays} {t.days} içinde kendini amorti eder
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="#pricing"
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-xl shadow-lg shadow-cyan-500/25 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Hemen Tasarrufa Başlayın</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
