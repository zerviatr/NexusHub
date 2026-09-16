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

import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, Search, ShieldCheck, Cpu, Key, Layers } from 'lucide-react';
import { Language } from '../lib/types';
import { FAQ_ITEMS } from '../lib/toolsData';
import { cyberAudio } from '../lib/cyberAudio';

interface FaqSectionProps {
  lang: Language;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ lang }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'technical' | 'license' | 'security'>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'faq-1': true // First item open by default
  });

  const isTr = lang === 'tr';

  const toggleItem = (id: string) => {
    cyberAudio.playClick();
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const categories = [
    { id: 'all', labelTr: 'Tümü', labelEn: 'All Questions', icon: Layers },
    { id: 'general', labelTr: 'Genel & Vizyon', labelEn: 'General & Vision', icon: HelpCircle },
    { id: 'technical', labelTr: 'Teknik & Rust', labelEn: 'Technical & Rust', icon: Cpu },
    { id: 'license', labelTr: 'Lisans & Aktivasyon', labelEn: 'Licensing & HWID', icon: Key },
    { id: 'security', labelTr: 'Gizlilik & Güvenlik', labelEn: 'Privacy & Security', icon: ShieldCheck }
  ] as const;

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const qText = (isTr ? item.questionTr : item.questionEn).toLowerCase();
      const aText = (isTr ? item.answerTr : item.answerEn).toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || qText.includes(query) || aText.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, isTr]);

  return (
    <section id="faq" className="py-24 bg-[#05060b] relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-950/20 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTr ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
            {isTr ? 'Aklınıza Takılan Her Şey' : 'Everything You Need to Know'}
          </h2>
          <p className="mt-3 text-gray-400 text-sm sm:text-base">
            {isTr
              ? 'Tauri v2 mimarisi, çevrimdışı gizlilik garantisi ve lisans aktarımı hakkında tüm detaylar.'
              : 'Detailed answers regarding our Tauri v2 engine, 100% offline-first security, and HWID transfers.'}
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mb-10 space-y-4">
          {/* Search Box */}
          <div className="relative max-w-xl mx-auto">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTr ? 'Soru veya konu ara (örn: Rust, HWID, internet)...' : 'Search question or topic (e.g. Rust, HWID, offline)...'}
              className="w-full pl-11 pr-4 py-3 bg-[#0a0d18] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition font-mono"
            />
          </div>

          {/* Category Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    cyberAudio.playClick();
                    setActiveCategory(cat.id);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono transition ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-[#0a0d18] text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isTr ? cat.labelTr : cat.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 border border-gray-800/80 rounded-2xl bg-[#0a0d18]/40">
              <p className="text-gray-400 text-sm font-mono">
                {isTr ? 'Aradığınız kriterlere uygun soru bulunamadı.' : 'No questions found matching your query.'}
              </p>
            </div>
          ) : (
            filteredFaqs.map(item => {
              const isOpen = !!openItems[item.id];
              return (
                <div
                  key={item.id}
                  className={`border rounded-xl transition duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-cyan-500/40 bg-gradient-to-br from-[#0c1224] to-[#070a14] shadow-md shadow-cyan-950/30'
                      : 'border-gray-800/80 bg-[#080b16]/70 hover:border-gray-700'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="font-semibold text-sm sm:text-base text-gray-100 font-mono">
                      {isTr ? item.questionTr : item.questionEn}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-cyan-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-gray-300 border-t border-gray-800/40 leading-relaxed font-sans">
                      {isTr ? item.answerTr : item.answerEn}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
