import React, { useState } from 'react';
import { Sparkles, Binary, KeyRound, Regex, Database, Unlock } from 'lucide-react';
import { Language } from '../../lib/types';
import { translations } from '../../lib/translations';
import { LiveHashDemo } from './LiveHashDemo';
import { LivePasswordDemo } from './LivePasswordDemo';
import { LiveRegexDemo } from './LiveRegexDemo';
import { LiveJwtDemo } from './LiveJwtDemo';
import { LiveDecrypterDemo } from './LiveDecrypterDemo';

interface LivePlaygroundProps {
  lang: Language;
}

type TabKey = 'hash' | 'password' | 'regex' | 'jwt' | 'decoder';

export const LivePlayground: React.FC<LivePlaygroundProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('hash');
  const t = translations[lang].playground;

  const tabList = [
    { key: 'hash' as TabKey, label: t.tabs.hash, icon: Binary, color: 'text-cyan-400' },
    { key: 'password' as TabKey, label: t.tabs.password, icon: KeyRound, color: 'text-purple-400' },
    { key: 'regex' as TabKey, label: t.tabs.regex, icon: Regex, color: 'text-cyan-400' },
    { key: 'jwt' as TabKey, label: t.tabs.jwt, icon: Database, color: 'text-sky-400' },
    { key: 'decoder' as TabKey, label: t.tabs.decoder, icon: Unlock, color: 'text-emerald-400' }
  ];

  return (
    <section id="playground" className="py-24 relative overflow-hidden bg-[#070914] border-t border-b border-gray-800/80">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {t.tag}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {t.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Playground Console Box */}
        <div className="bg-[#0b0e1b] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
          {/* Header Bar */}
          <div className="bg-[#060812] border-b border-gray-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* macOS / Linux style dots */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-gray-400 ml-2 hidden sm:inline">
                ZenDev Simulator v2.4.3 (WebAssembly & WebCrypto Core)
              </span>
            </div>

            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-2.5 py-0.5 rounded border border-cyan-500/30">
              ⚡ 0ms Latency / Client-Side
            </span>
          </div>

          {/* Tab Selector Bar */}
          <div className="bg-[#080b16] border-b border-gray-800/80 px-3 py-2 flex items-center gap-2 overflow-x-auto">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-white border border-cyan-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Demo Content Area */}
          <div className="p-6 sm:p-8 min-h-[290px] flex flex-col justify-center">
            {activeTab === 'hash' && <LiveHashDemo />}
            {activeTab === 'password' && <LivePasswordDemo />}
            {activeTab === 'regex' && <LiveRegexDemo />}
            {activeTab === 'jwt' && <LiveJwtDemo />}
            {activeTab === 'decoder' && <LiveDecrypterDemo />}
          </div>
        </div>
      </div>
    </section>
  );
};
