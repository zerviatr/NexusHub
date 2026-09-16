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

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, HardDrive, ShieldCheck, Check, X, ArrowDownRight, Sparkles } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/translations';

interface ArchitectureRadarProps {
  lang: Language;
}

export const ArchitectureRadar: React.FC<ArchitectureRadarProps> = ({ lang }) => {
  const t = translations[lang].radar;

  return (
    <section id="radar" className="py-24 bg-[#070913] border-t border-gray-800/80 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold tracking-wider mb-4"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            {t.tag}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono"
          >
            {t.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-sm sm:text-base text-gray-400"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* 4 Animated Benchmark Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. RAM Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[#0b0e1b] border border-cyan-500/30 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {lang === 'tr' ? 'BELLEK (RAM)' : 'MEMORY (RAM)'}
                </span>
                <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.ram.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.ram.desc}
              </p>

              {/* Advantage Highlight */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'tr' ? '%94.2 Daha Az RAM' : '94.2% Less RAM'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3.5 pt-4 border-t border-gray-800/80">
              {/* ZenDev Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    ZenDev (Tauri v2)
                  </span>
                  <span className="text-cyan-400 font-extrabold">&lt; 26 MB</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-cyan-500/20">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '5.8%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 15, stiffness: 60, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)] min-w-[12px]"
                  />
                </div>
              </div>

              {/* Electron Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-gray-400">Klasik Electron</span>
                  <span className="text-rose-400 font-bold">450+ MB</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 20, stiffness: 60, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. Binary & Installer Size */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#0b0e1b] border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
                  {lang === 'tr' ? 'DİSK & PAKET BOYUTU' : 'DISK & BINARY SIZE'}
                </span>
                <div className="p-2 rounded-lg bg-purple-950/50 border border-purple-500/30 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.size.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.size.desc}
              </p>

              {/* Advantage Highlight */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-500/30 text-[11px] font-mono text-purple-300">
                <ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />
                <span>{lang === 'tr' ? '%96.2 Daha Kompakt' : '96.2% Smaller'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3.5 pt-4 border-t border-gray-800/80">
              {/* ZenDev Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    ZenDev NSIS
                  </span>
                  <span className="text-purple-400 font-extrabold">4.6 MB</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-purple-500/20">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '3.8%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 15, stiffness: 60, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)] min-w-[12px]"
                  />
                </div>
              </div>

              {/* Electron Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-gray-400">Electron Dağıtımı</span>
                  <span className="text-rose-400 font-bold">120 MB</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 20, stiffness: 60, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 3. Boot Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-[#0b0e1b] border border-sky-500/30 hover:border-sky-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                  {lang === 'tr' ? 'BAŞLATMA GECİKMESİ' : 'BOOT LATENCY'}
                </span>
                <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-500/30 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.boot.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.boot.desc}
              </p>

              {/* Advantage Highlight */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/40 border border-sky-500/30 text-[11px] font-mono text-sky-300">
                <ArrowDownRight className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'tr' ? '%89.1 Daha Hızlı Açılış' : '89.1% Faster Boot'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3.5 pt-4 border-t border-gray-800/80">
              {/* ZenDev Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-sky-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    ZenDev Açılış
                  </span>
                  <span className="text-sky-400 font-extrabold">0.35s</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-sky-500/20">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '10.9%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 15, stiffness: 60, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)] min-w-[12px]"
                  />
                </div>
              </div>

              {/* Electron Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-gray-400">Electron Soğuk Başlatma</span>
                  <span className="text-rose-400 font-bold">3.2s</span>
                </div>
                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 20, stiffness: 60, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 4. Privacy & Telemetry */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-[#0b0e1b] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {lang === 'tr' ? 'GİZLİLİK STANDARDI' : 'PRIVACY STANDARD'}
                </span>
                <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white font-mono">{t.metrics.privacy.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t.metrics.privacy.desc}
              </p>

              {/* Advantage Highlight */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'tr' ? '%100 Çevrimdışı & Yerel' : '100% Offline & Local'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 pt-4 border-t border-gray-800/80 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ZenDev: {lang === 'tr' ? 'Sıfır Ağ İsteği' : 'Zero Network Requests'}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'tr' ? '%100 Yerel AES-256 Kasası' : '100% Local AES-256 Vault'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="line-through">{lang === 'tr' ? 'Bulut İzleme / Telemetri' : 'Cloud Tracking / Telemetry'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
