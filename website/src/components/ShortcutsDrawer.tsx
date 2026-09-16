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

import React, { useState } from 'react';
import { X, Command, Terminal, Copy, Check, Sparkles, Search } from 'lucide-react';
import { Language } from '../lib/types';
import { cyberAudio } from '../lib/cyberAudio';

interface ShortcutsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

interface ShortcutItem {
  keys: string[];
  actionTr: string;
  actionEn: string;
  category: 'global' | 'tools' | 'window';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], actionTr: 'Küresel Omni-Arama Konsolu (Tüm Araçlar)', actionEn: 'Global Omni-Launcher Console (All Tools)', category: 'global' },
  { keys: ['Alt', 'Space'], actionTr: 'MiniHud Yüzen Pencere (Hızlı Dönüştürücü)', actionEn: 'MiniHud Floating Widget (Instant Converter)', category: 'global' },
  { keys: ['Ctrl', 'Shift', 'P'], actionTr: 'PortKiller Anında Tetikleyici', actionEn: 'PortKiller Direct Invocation', category: 'tools' },
  { keys: ['Ctrl', 'Shift', 'L'], actionTr: 'Acil Kilit (CyberFortress AES-256 Kasa)', actionEn: 'Emergency Lock (CyberFortress AES Vault)', category: 'tools' },
  { keys: ['Ctrl', 'Shift', 'H'], actionTr: 'Pano Verisini Anında Hashle (SHA-256)', actionEn: 'Instant Clipboard Hash (SHA-256)', category: 'tools' },
  { keys: ['Ctrl', 'Shift', 'N'], actionTr: 'Yeni Scratchpad Sekmesi Aç', actionEn: 'Open New Scratchpad Note Tab', category: 'tools' },
  { keys: ['Ctrl', 'Tab'], actionTr: 'Açık Araç Çalışma Alanları Arasında Geçiş', actionEn: 'Cycle Through Active Tool Workspaces', category: 'window' },
  { keys: ['Ctrl', '`'], actionTr: 'Entegre Mini Terminali Aç / Kapat', actionEn: 'Toggle Embedded Mini Terminal', category: 'window' },
  { keys: ['F11'], actionTr: 'Tam Ekran Odaklanma Modu', actionEn: 'Zen Fullscreen Focus Mode', category: 'window' },
  { keys: ['Esc'], actionTr: 'Aktif Modalı / Paneli Kapat', actionEn: 'Close Active Overlay / Modal', category: 'window' }
];

const CLI_COMMANDS = [
  { cmd: 'zendev --version', descTr: 'ZenDev Rust derleme sürümünü ve telemetrisini gösterir', descEn: 'Show ZenDev Rust build version and telemetry' },
  { cmd: 'zendev kill --port 3000', descTr: '3000 portunu işgal eden süreci anında SIGKILL ile sonlandırır', descEn: 'Instantly SIGKILL process locking port 3000' },
  { cmd: 'zendev shred ./secrets.env --passes 7', descTr: 'DoD 5220.22-M uyumlu 7 aşamalı kalıcı veri imhası', descEn: 'Permanent 7-pass DoD 5220.22-M data eradication' },
  { cmd: 'zendev hash --sha256 ./setup.exe', descTr: 'Dosyanın SHA-256 doğrulama özetini terminale basar', descEn: 'Print SHA-256 verification digest to stdout' },
  { cmd: 'zendev license --status', descTr: 'Yerel lisans durumu ve HWID yuva bilgisini görüntüler', descEn: 'Inspect local offline license status & HWID slot' }
];

export const ShortcutsDrawer: React.FC<ShortcutsDrawerProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'cli'>('shortcuts');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const isTr = lang === 'tr';

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    cyberAudio.playSuccess();
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredShortcuts = SHORTCUTS.filter(s => {
    const q = searchQuery.toLowerCase();
    const action = (isTr ? s.actionTr : s.actionEn).toLowerCase();
    const keys = s.keys.join(' ').toLowerCase();
    return !q || action.includes(q) || keys.includes(q);
  });

  const filteredCli = CLI_COMMANDS.filter(c => {
    const q = searchQuery.toLowerCase();
    const desc = (isTr ? c.descTr : c.descEn).toLowerCase();
    return !q || c.cmd.toLowerCase().includes(q) || desc.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090d1a] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#060913]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center">
              <Command className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>{isTr ? 'ZenDev v2.4.3 Kısayol & CLI Kılavuzu' : 'ZenDev v2.4.3 Cheatsheet & CLI'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  CheatSheet
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                {isTr ? 'Masaüstü iş akışınızı 10 kat hızlandıracak klavye komutları' : 'Power commands to accelerate your desktop workflow 10x'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cyberAudio.playClick();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Strip */}
        <div className="px-6 py-3 border-b border-gray-800 bg-[#070b16] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                cyberAudio.playClick();
                setActiveTab('shortcuts');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition ${
                activeTab === 'shortcuts'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Command className="w-3.5 h-3.5" />
              <span>{isTr ? 'Klavye Kısayolları' : 'Keyboard Shortcuts'}</span>
            </button>
            <button
              onClick={() => {
                cyberAudio.playClick();
                setActiveTab('cli');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition ${
                activeTab === 'cli'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isTr ? 'CLI Komut Satırı' : 'Terminal CLI'}</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTr ? 'Kısayol ara...' : 'Filter shortcuts...'}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0e1322] border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3 font-mono">
          {activeTab === 'shortcuts' ? (
            filteredShortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0b0f1d] border border-gray-800/80 hover:border-cyan-500/30 transition group"
              >
                <span className="text-xs text-gray-300 group-hover:text-white font-sans">
                  {isTr ? sc.actionTr : sc.actionEn}
                </span>
                <div className="flex items-center gap-1.5">
                  {sc.keys.map((k, ki) => (
                    <kbd
                      key={ki}
                      className="px-2 py-1 bg-[#151c30] border border-gray-700/80 rounded text-[11px] font-mono text-cyan-300 shadow-sm shadow-black"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))
          ) : (
            filteredCli.map((item, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#0b0f1d] border border-gray-800/80 hover:border-cyan-500/30 transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-300 font-mono font-bold">$ {item.cmd}</span>
                  <button
                    onClick={() => copyToClipboard(item.cmd)}
                    className="p-1 text-gray-400 hover:text-cyan-300 transition"
                    title={isTr ? 'Komutu kopyala' : 'Copy command'}
                  >
                    {copiedCmd === item.cmd ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 font-sans">
                  {isTr ? item.descTr : item.descEn}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 bg-[#060913] flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <span className="flex items-center gap-1 text-cyan-400/80">
            <Sparkles className="w-3 h-3" />
            {isTr ? 'Tüm kısayollar masaüstü Ayarlar panelinden özelleştirilebilir' : 'All keybindings customizable in desktop Settings'}
          </span>
          <button
            onClick={() => {
              cyberAudio.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white underline"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
