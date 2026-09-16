import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Download, Calculator, KeyRound, Sparkles, Volume2, ArrowRight, ShieldCheck } from 'lucide-react';
import { ToolItem, Language } from '../lib/types';
import { ZENDEV_TOOLS } from '../lib/toolsData';
import { cyberAudio } from '../lib/cyberAudio';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolItem) => void;
  lang: Language;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  lang
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      cyberAudio.playClick();
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredTools = ZENDEV_TOOLS.filter((t) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.titleTr.toLowerCase().includes(q) ||
      t.titleEn.toLowerCase().includes(q) ||
      t.techSpecs.some((s) => s.toLowerCase().includes(q))
    );
  }).slice(0, 7);

  // Quick navigation items
  const quickActions = [
    {
      id: 'action-download',
      labelTr: 'ZenDev v2.5.2 Yükleyiciyi İndir',
      labelEn: 'Download ZenDev v2.5.2 Installer',
      icon: Download,
      href: '#download'
    },
    {
      id: 'action-playground',
      labelTr: 'Tarayıcıda Canlı Simülatörü Aç',
      labelEn: 'Open In-Browser Live Playground',
      icon: Sparkles,
      href: '#playground'
    },
    {
      id: 'action-calculator',
      labelTr: 'Anti-SaaS Tasarruf Hesaplayıcısına Git',
      labelEn: 'Jump to Anti-SaaS Savings Calculator',
      icon: Calculator,
      href: '#calculator'
    },
    {
      id: 'action-portal',
      labelTr: 'HWID Sıfırlama & Müşteri Portalı',
      labelEn: 'HWID Reset & Customer Portal',
      icon: KeyRound,
      href: '#portal'
    }
  ].filter((a) => {
    if (!query) return true;
    return (
      a.labelTr.toLowerCase().includes(query.toLowerCase()) ||
      a.labelEn.toLowerCase().includes(query.toLowerCase())
    );
  });

  const totalItems = filteredTools.length + quickActions.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cyberAudio.playClick();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cyberAudio.playClick();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      cyberAudio.playSuccess();
      if (selectedIndex < filteredTools.length) {
        onSelectTool(filteredTools[selectedIndex]);
        onClose();
      } else {
        const actionIdx = selectedIndex - filteredTools.length;
        const action = quickActions[actionIdx];
        if (action) {
          window.location.href = action.href;
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0e1b] border border-cyan-500/50 rounded-2xl max-w-2xl w-full shadow-2xl shadow-cyan-500/10 overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-[#070914]">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'tr'
                ? '31+ araç veya aksiyon ara (örn: sqlite, port, sha256)...'
                : 'Search 31+ tools or actions (e.g., sqlite, port, sha256)...'
            }
            className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-500"
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Section 1: Tools */}
          {filteredTools.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {lang === 'tr' ? 'Masaüstü Araçları (31)' : 'Desktop Workstations (31)'}
              </div>
              <div className="space-y-1 mt-1">
                {filteredTools.map((tool, i) => {
                  const isSelected = selectedIndex === i;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => {
                        cyberAudio.playSuccess();
                        onSelectTool(tool);
                        onClose();
                      }}
                      className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#141b30] border border-cyan-500/40 text-white'
                          : 'hover:bg-[#0f1424] text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{tool.name}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({lang === 'tr' ? tool.titleTr : tool.titleEn})
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {tool.techSpecs.slice(0, 3).join(' • ')}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                        {lang === 'tr' ? 'Detay Gör' : 'View Details'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {lang === 'tr' ? 'Hızlı İşlemler' : 'Quick Actions'}
              </div>
              <div className="space-y-1 mt-1">
                {quickActions.map((act, idx) => {
                  const itemIndex = filteredTools.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  const Icon = act.icon;
                  return (
                    <a
                      key={act.id}
                      href={act.href}
                      onClick={() => {
                        cyberAudio.playSuccess();
                        onClose();
                      }}
                      className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#141b30] border border-cyan-500/40 text-white'
                          : 'hover:bg-[#0f1424] text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="font-bold text-white">
                          {lang === 'tr' ? act.labelTr : act.labelEn}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-8 text-gray-500 text-xs">
              "{query}" ile eşleşen araç veya eylem bulunamadı.
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-gray-800 bg-[#070914] flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <span>Seçmek için</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-400">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-400">
              ↓
            </kbd>
            <span>Çalıştırmak için</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-400">
              ENTER
            </kbd>
          </div>
          <span className="text-cyan-400 font-bold">ZenDev Omni-Spotlight</span>
        </div>
      </div>
    </div>
  );
};
