import React, { useState, useMemo } from 'react';
import {
  Search, ShieldAlert, Binary, KeyRound, Unlock, Send, Database, Regex,
  Terminal, Shuffle, ZapOff, Network, Activity, Trash2, FileText, FolderSync,
  FileCheck2, Image, Palette, QrCode, Mail, ClipboardList, Sparkles, X, Check,
  Clock, Workflow
} from 'lucide-react';
import { ToolItem, ToolCategory, Language } from '../lib/types';
import { ZENDEV_TOOLS } from '../lib/toolsData';
import { translations } from '../lib/translations';

interface ToolCatalogProps {
  lang: Language;
}

const ICON_MAP: Record<string, any> = {
  ShieldAlert, Binary, KeyRound, Unlock, Send, Database, Regex,
  Terminal, Shuffle, ZapOff, Network, Activity, Trash2, FileText,
  FolderSync, FileCheck2, Image, Palette, QrCode, Mail, ClipboardList,
  Clock, Workflow
};

export const ToolCatalog: React.FC<ToolCatalogProps> = ({ lang }) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);

  const t = translations[lang].catalog;

  const filteredTools = useMemo(() => {
    return ZENDEV_TOOLS.filter((tool) => {
      const matchCat = selectedCategory === 'all' || tool.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        tool.name.toLowerCase().includes(query) ||
        tool.titleTr.toLowerCase().includes(query) ||
        tool.titleEn.toLowerCase().includes(query) ||
        tool.descriptionTr.toLowerCase().includes(query) ||
        tool.descriptionEn.toLowerCase().includes(query) ||
        tool.techSpecs.some((spec) => spec.toLowerCase().includes(query));

      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section id="arsenal" className="py-24 bg-[#05060b] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {t.tag}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {t.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400">
            {t.subtitle}
          </p>
        </div>

        {/* Filter Controls: Search & Category Tabs */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[#0a0d18] border border-gray-800 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-gray-200 outline-none transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#090c18] border border-gray-800 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto text-xs font-mono">
            {[
              { key: 'all' as const, label: t.categories.all },
              { key: 'security' as const, label: t.categories.security },
              { key: 'developer' as const, label: t.categories.developer },
              { key: 'system' as const, label: t.categories.system },
              { key: 'productivity' as const, label: t.categories.productivity }
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  selectedCategory === cat.key
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const Icon = ICON_MAP[tool.icon] || Terminal;
            const isSecurity = tool.category === 'security';
            const isDev = tool.category === 'developer';
            const isSystem = tool.category === 'system';

            const accentColor = isSecurity
              ? 'border-purple-500/30 text-purple-400 bg-purple-950/20'
              : isDev
              ? 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20'
              : isSystem
              ? 'border-rose-500/30 text-rose-400 bg-rose-950/20'
              : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20';

            return (
              <div
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                className="group cursor-pointer bg-[#0a0d18] hover:bg-[#0f1424] border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl border ${accentColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.hasInBrowserDemo && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                          {t.inBrowserBadge}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                        {lang === 'tr' ? tool.badgeTr : tool.badgeEn}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white font-mono group-hover:text-cyan-300 transition">
                    {tool.name}
                  </h3>
                  <h4 className="text-xs font-medium text-cyan-400/90 font-mono mt-0.5">
                    {lang === 'tr' ? tool.titleTr : tool.titleEn}
                  </h4>

                  <p className="mt-3 text-xs text-gray-400 line-clamp-3 leading-relaxed">
                    {lang === 'tr' ? tool.descriptionTr : tool.descriptionEn}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    {tool.techSpecs.slice(0, 3).map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono text-gray-400 bg-[#060812] px-2 py-0.5 rounded border border-gray-800"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search State */}
        {filteredTools.length === 0 && (
          <div className="text-center py-16 bg-[#0a0d18] rounded-2xl border border-gray-800">
            <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-mono">
              "{searchQuery}" aramasıyla eşleşen araç bulunamadı.
            </p>
          </div>
        )}
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b0e1b] border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setSelectedTool(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                {React.createElement(ICON_MAP[selectedTool.icon] || Terminal, { className: 'w-6 h-6' })}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-mono">{selectedTool.name}</h3>
                <span className="text-xs text-cyan-400 font-mono">
                  {lang === 'tr' ? selectedTool.titleTr : selectedTool.titleEn}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mt-4">
              {lang === 'tr' ? selectedTool.descriptionTr : selectedTool.descriptionEn}
            </p>

            <div className="mt-6">
              <h5 className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold mb-2">
                Teknik Yetenekler & Standartlar:
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {selectedTool.techSpecs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-gray-300 bg-[#060812] p-2 rounded border border-gray-800">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">● ZenDev v2.5.3 ile Yerleşik Gelir</span>
              <a
                href="#download"
                onClick={() => setSelectedTool(null)}
                className="px-4 py-2 text-xs font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg transition"
              >
                Masaüstünde Kullan
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
