import React from 'react';
import { Cpu, Zap, HardDrive, ShieldCheck, Check, X } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/translations';

interface ArchitectureRadarProps {
  lang: Language;
}

export const ArchitectureRadar: React.FC<ArchitectureRadarProps> = ({ lang }) => {
  const t = translations[lang].radar;

  return (
    <section id="radar" className="py-24 bg-[#070913] border-t border-gray-800/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            {t.tag}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {t.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400">
            {t.subtitle}
          </p>
        </div>

        {/* 4 Metric Benchmark Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. RAM Usage */}
          <div className="bg-[#0b0e1b] border border-cyan-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  BELLEK (RAM)
                </span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.ram.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.ram.desc}
              </p>
            </div>

            <div className="mt-6 space-y-3 pt-4 border-t border-gray-800/80">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-cyan-300 font-bold">ZenDev v2.4.3 (Tauri)</span>
                  <span className="text-cyan-400 font-bold">~35 MB</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-[10%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-gray-400">Klasik Electron</span>
                  <span className="text-rose-400 font-bold">450+ MB</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[95%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Binary Size */}
          <div className="bg-[#0b0e1b] border border-purple-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
                  DİSK & PAKET BOYUTU
                </span>
                <HardDrive className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.size.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.size.desc}
              </p>
            </div>

            <div className="mt-6 space-y-3 pt-4 border-t border-gray-800/80">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-purple-300 font-bold">ZenDev v2.4.3 NSIS</span>
                  <span className="text-purple-400 font-bold">~15 MB</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 w-[12%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-gray-400">Electron Dağıtımı</span>
                  <span className="text-rose-400 font-bold">180+ MB</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[90%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Boot Time */}
          <div className="bg-[#0b0e1b] border border-sky-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                  BAŞLATMA GECİKMESİ
                </span>
                <Zap className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.boot.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.boot.desc}
              </p>
            </div>

            <div className="mt-6 space-y-3 pt-4 border-t border-gray-800/80">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-sky-300 font-bold">ZenDev Açılış</span>
                  <span className="text-sky-400 font-bold">0.4 Saniye</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 w-[14%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-gray-400">Electron Soğuk Başlatma</span>
                  <span className="text-rose-400 font-bold">3.2 Saniye</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[85%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Privacy & Telemetry */}
          <div className="bg-[#0b0e1b] border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  GİZLİLİK STANDARDI
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.privacy.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.privacy.desc}
              </p>
            </div>

            <div className="mt-6 space-y-2 pt-4 border-t border-gray-800/80 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>ZenDev: Sıfır Ağ İsteği</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>%100 Yerel AES Kasası</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <X className="w-4 h-4 text-rose-500" />
                <span className="line-through">Bulut İzleme / Telemetri</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
