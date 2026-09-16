import React, { useState } from 'react';
import { Download, ShieldCheck, Copy, Check, Terminal, Zap, Cpu, Lock, ChevronRight, ExternalLink } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/translations';

interface HeroSectionProps {
  lang: Language;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ lang }) => {
  const t = translations[lang].hero;
  const [copiedSha, setCopiedSha] = useState(false);
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<'port' | 'vault' | 'api' | 'sqlite'>('port');

  const sampleSha = 'a8f4c2e9b1d7f6a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2';

  const handleCopySha = () => {
    navigator.clipboard.writeText(sampleSha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <section id="download" className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-cyber-radial">
      {/* Ambient background grids */}
      <div className="absolute inset-0 bg-cyber-grid opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Release & Architecture Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0a0e1c] border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6 shadow-lg shadow-cyan-500/10">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{t.tag}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-gray-400 font-normal">v2.4.3 LATEST</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-mono leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
              {t.titleHighlight}
            </span>{' '}
            <br className="hidden sm:inline" />
            {t.titleMain}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/zerviatr/NexusHub/releases/download/v2.4.3/ZenDev-Setup-2.4.3.exe"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold font-mono text-black bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:from-cyan-300 hover:to-sky-200 rounded-xl shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/45 transition transform hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5" />
              <span>{t.downloadNsis}</span>
            </a>

            <a
              href="https://github.com/zerviatr/NexusHub/releases/download/v2.4.3/ZenDev-Portable-2.4.3.exe"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-semibold font-mono text-gray-200 bg-[#0d1222] hover:bg-[#12182d] border border-gray-700 hover:border-cyan-500/50 rounded-xl transition"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{t.downloadPortable}</span>
            </a>
          </div>

          {/* Checksum & Security Badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-gray-400">
            <button
              onClick={handleCopySha}
              className="flex items-center gap-1.5 hover:text-cyan-300 transition bg-[#090d1a] border border-gray-800 px-3 py-1.5 rounded-lg"
              title="SHA-256 Checksum"
            >
              {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>
                {t.checksumLabel}: <span className="text-gray-300">{sampleSha.slice(0, 8)}...</span>
              </span>
            </button>

            <a
              href="https://www.virustotal.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.cleanCodeBadge}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-[#0b0e1b]/80 border border-cyan-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cyan-400 font-mono">27+</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{t.stats.tools}</div>
            </div>
            <div className="bg-[#0b0e1b]/80 border border-purple-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-purple-400 font-mono">~35 MB</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{t.stats.ram}</div>
            </div>
            <div className="bg-[#0b0e1b]/80 border border-sky-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-sky-400 font-mono">0.4s</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{t.stats.boot}</div>
            </div>
            <div className="bg-[#0b0e1b]/80 border border-emerald-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-emerald-400 font-mono">%100</div>
              <div className="text-xs text-gray-400 font-mono mt-1">{t.stats.license}</div>
            </div>
          </div>
        </div>

        {/* Interactive Desktop App Mockup Simulator */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-[#090c18] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            {/* Top Windows Titlebar */}
            <div className="bg-[#060812] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-mono text-gray-400 ml-2">
                  ZenDev Desktop v2.4.3 [Tauri Rust Engine]
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                <span className="hidden sm:inline text-emerald-400">● 100% Offline Mode</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  RAM: 34.2 MB
                </span>
              </div>
            </div>

            {/* Inner App Simulator Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px]">
              {/* Simulator Sidebar */}
              <div className="bg-[#080a14] border-r border-gray-800/80 p-3 space-y-1 text-xs font-mono">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  İSTASYONLAR
                </div>
                <button
                  onClick={() => setActiveSimulatorTab('port')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                    activeSimulatorTab === 'port'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PortKiller</span>
                </button>

                <button
                  onClick={() => setActiveSimulatorTab('vault')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                    activeSimulatorTab === 'vault'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>CyberFortress</span>
                </button>

                <button
                  onClick={() => setActiveSimulatorTab('api')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                    activeSimulatorTab === 'api'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>ApiStudio</span>
                </button>

                <button
                  onClick={() => setActiveSimulatorTab('sqlite')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                    activeSimulatorTab === 'sqlite'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SqliteViewer</span>
                </button>

                <div className="pt-4 px-3 text-[11px] text-gray-500">
                  + 23 Diğer Araç Masaüstünde Hazır!
                </div>
              </div>

              {/* Simulator Main Content */}
              <div className="md:col-span-3 p-6 flex flex-col justify-between bg-[#0b0e1b]">
                {activeSimulatorTab === 'port' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">
                          PortKiller — Dinlenen Port Analizcisi
                        </h4>
                        <p className="text-xs text-gray-400 font-mono">
                          Dinlenen 3 port tespit edildi. Çakışan süreçleri SIGKILL ile anında sonlandırın.
                        </p>
                      </div>
                      <span className="text-[11px] text-rose-400 font-mono bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
                        1 Çakışma
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between bg-[#080b16] p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">PORT 3000</span>
                          <span className="text-gray-400">PID: 14820 (node.exe)</span>
                          <span className="text-rose-400 text-[10px] bg-rose-950/50 px-1.5 py-0.5 rounded">
                            BLOCKED
                          </span>
                        </div>
                        <button className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition">
                          SIGKILL Sonlandır
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-[#080b16] p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">PORT 5173</span>
                          <span className="text-gray-400">PID: 9144 (vite.exe)</span>
                          <span className="text-emerald-400 text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        </div>
                        <button className="px-3 py-1 rounded bg-gray-800 hover:bg-rose-600 text-gray-300 hover:text-white transition">
                          Kapat
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-[#080b16] p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">PORT 8080</span>
                          <span className="text-gray-400">PID: 23110 (docker-proxy.exe)</span>
                          <span className="text-emerald-400 text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        </div>
                        <button className="px-3 py-1 rounded bg-gray-800 hover:bg-rose-600 text-gray-300 hover:text-white transition">
                          Kapat
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSimulatorTab === 'vault' && (
                  <div className="space-y-4">
                    <div className="border-b border-gray-800 pb-3">
                      <h4 className="text-sm font-bold text-purple-300 font-mono">
                        CyberFortress — AES-256-GCM Askeri Kasa
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">
                        Kuantum dirençli şifreleme ve DoD 5220.22-M 7-pass kalıcı dosya imha kalkanı.
                      </p>
                    </div>

                    <div className="bg-[#080b16] border border-purple-500/30 rounded-lg p-4 font-mono text-xs space-y-3">
                      <div className="flex justify-between text-gray-400">
                        <span>Hedef Dosya: <strong className="text-white">secret_keys.env (2.4 KB)</strong></span>
                        <span className="text-purple-400 font-bold">Durum: Şifrelendi (.zendev)</span>
                      </div>
                      <div className="bg-[#04060d] p-3 rounded border border-gray-800 text-[11px] text-purple-300/80 break-all select-all">
                        IV: 9f8a7c6b5d4e3f2a1b0c | CIPHERTEXT: e7a1f2c984b2d1... | TAG: 4b9a1e8c
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-gray-500 text-[11px]">PBKDF2 100,000 İterasyon SHA-256</span>
                        <button className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition">
                          DoD 7-Pass İmha Et
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSimulatorTab === 'api' && (
                  <div className="space-y-4">
                    <div className="border-b border-gray-800 pb-3">
                      <h4 className="text-sm font-bold text-sky-300 font-mono">
                        ApiStudio — Hafif Yerel REST İstemcisi
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">
                        cURL komutlarını tek tıkla ayrıştırın ve sıfır gecikmeyle API çağrıları yapın.
                      </p>
                    </div>

                    <div className="bg-[#080b16] border border-sky-500/30 rounded-lg p-3 font-mono text-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded">
                          POST
                        </span>
                        <span className="text-gray-300 flex-1 truncate">
                          https://api.zendev.io/v1/telemetry/heartbeat
                        </span>
                        <span className="text-emerald-400 font-bold">200 OK (28ms)</span>
                      </div>
                      <div className="bg-[#04060d] p-3 rounded border border-gray-800 text-[11px] text-sky-300/90 font-mono">
                        {`{\n  "status": "success",\n  "engine": "tauri-v2-rust",\n  "offline_first": true\n}`}
                      </div>
                    </div>
                  </div>
                )}

                {activeSimulatorTab === 'sqlite' && (
                  <div className="space-y-4">
                    <div className="border-b border-gray-800 pb-3">
                      <h4 className="text-sm font-bold text-emerald-300 font-mono">
                        SqliteViewer — WebAssembly SQLite Konsolu
                      </h4>
                      <p className="text-xs text-gray-400 font-mono">
                        Herhangi bir .sqlite veya .db dosyasını doğrudan bellekten ışık hızında sorgulayın.
                      </p>
                    </div>

                    <div className="bg-[#080b16] border border-emerald-500/30 rounded-lg p-3 font-mono text-xs space-y-2">
                      <div className="text-gray-400">
                        Sorgu: <code className="text-emerald-300">SELECT id, name, ram_mb FROM tools ORDER BY ram_mb ASC LIMIT 2;</code>
                      </div>
                      <table className="w-full text-left text-[11px] text-gray-300 border border-gray-800">
                        <thead className="bg-gray-900/60 text-emerald-400">
                          <tr>
                            <th className="p-1.5 border-b border-gray-800">id</th>
                            <th className="p-1.5 border-b border-gray-800">name</th>
                            <th className="p-1.5 border-b border-gray-800">ram_mb</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-800/50">
                            <td className="p-1.5">1</td>
                            <td className="p-1.5">ZenDev v2.4.3 (Tauri)</td>
                            <td className="p-1.5 text-emerald-400 font-bold">34.8 MB</td>
                          </tr>
                          <tr>
                            <td className="p-1.5">2</td>
                            <td className="p-1.5">Eski Electron Sürümü</td>
                            <td className="p-1.5 text-rose-400 font-bold">482.0 MB</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>ZenDev v2.4.3 Masaüstü Sürümünü İndirin</span>
                  <a
                    href="#arsenal"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                  >
                    <span>27 Aracın Tümünü Gör</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
