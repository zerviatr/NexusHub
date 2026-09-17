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
import { Check, X, Sparkles, Shield, Cpu, Users, ChevronDown } from 'lucide-react';
import { Language, Currency, PricingPlan } from '../lib/types';
import { cyberAudio } from '../lib/cyberAudio';

interface PricingMatrixProps {
  lang: Language;
  currency: Currency;
  onSelectPlan: (planId: 'personal' | 'studio') => void;
}

interface MatrixFeature {
  nameTr: string;
  nameEn: string;
  tooltipTr?: string;
  tooltipEn?: string;
  free: string | boolean;
  personal: string | boolean;
  studio: string | boolean;
}

interface MatrixCategory {
  titleTr: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  features: MatrixFeature[];
}

export const PricingMatrix: React.FC<PricingMatrixProps> = ({
  lang,
  currency,
  onSelectPlan
}) => {
  const categories: MatrixCategory[] = [
    {
      titleTr: 'Çekirdek Mimari & Donanım Performansı',
      titleEn: 'Core Architecture & Hardware Performance',
      icon: Cpu,
      features: [
        {
          nameTr: 'Çalışma Motoru',
          nameEn: 'Runtime Engine',
          free: 'Tauri v2 + Rust',
          personal: 'Tauri v2 + Rust',
          studio: 'Tauri v2 + Rust'
        },
        {
          nameTr: 'Bellek (RAM) Ayak İzi',
          nameEn: 'RAM Footprint',
          free: '< 26 MB',
          personal: '< 26 MB',
          studio: '< 26 MB'
        },
        {
          nameTr: 'Soğuk Başlatma Hızı',
          nameEn: 'Cold Start Latency',
          free: '0.35 Saniye',
          personal: '0.35 Saniye',
          studio: '0.35 Saniye'
        },
        {
          nameTr: '%100 Çevrimdışı Çalışma',
          nameEn: '100% Offline Capability',
          free: true,
          personal: true,
          studio: true
        },
        {
          nameTr: 'Sıfır Telemetri & Sıfır İzleme',
          nameEn: 'Zero Telemetry & Tracking',
          free: true,
          personal: true,
          studio: true
        }
      ]
    },
    {
      titleTr: 'Geliştirici Araçları & İstasyonlar',
      titleEn: 'Developer Tools & Workstations',
      icon: Sparkles,
      features: [
        {
          nameTr: 'Temel Yardımcı Araçlar (Hash, QR, Regex, Base64, JSON vb.)',
          nameEn: 'Essential Tools (Hash, QR, Regex, Base64, JSON etc.)',
          free: '8 Temel Araç',
          personal: '27+ Tüm Araçlar',
          studio: '27+ Tüm Araçlar'
        },
        {
          nameTr: 'Workflow Chains Pipeline Motoru (cURL → JSON → HMAC)',
          nameEn: 'Workflow Chains Pipeline Engine (cURL → JSON → HMAC)',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'ApiStudio REST & GraphQL Hızlı Test İstemcisi',
          nameEn: 'ApiStudio REST & GraphQL Rapid Client',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'SQLite Studio & Çevrimdışı Veritabanı Tarayıcı',
          nameEn: 'SQLite Studio & Offline Database Browser',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'CyberFortress Askeri 7-Pass İmha & AES-256 Kasası',
          nameEn: 'CyberFortress Military 7-Pass Shredder & AES Vault',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'PdfStudio Yerel Filigran & Güvenlik Kilitleyici',
          nameEn: 'PdfStudio Local Watermarker & Encrypted Lock',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'ResourceSentinel Canlı Donanım & CPU Radarı',
          nameEn: 'ResourceSentinel Live Hardware & CPU Radar',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'JWT Studio, Cron Studio, Mermaid & Encoding Studio',
          nameEn: 'JWT Studio, Cron Studio, Mermaid & Encoding Studio',
          free: false,
          personal: true,
          studio: true
        }
      ]
    },
    {
      titleTr: 'Lisanslama, Ekipler & Kurumsal Haklar',
      titleEn: 'Licensing, Team Collaboration & Rights',
      icon: Users,
      features: [
        {
          nameTr: 'Dahil Olan Cihaz / Kullanıcı Sayısı',
          nameEn: 'Included Machines / Seats',
          free: '1 Kişisel Cihaz',
          personal: '2 Eşzamanlı Cihaz',
          studio: '5 Geliştirici Koltuğu'
        },
        {
          nameTr: 'Ticari Proje & Müşteri İşi Kullanım Hakkı',
          nameEn: 'Commercial & Client Project Rights',
          free: 'Kişisel / Açık Kaynak',
          personal: true,
          studio: true
        },
        {
          nameTr: 'Self-Service Donanım (HWID) Transfer Portalı',
          nameEn: 'Self-Service HWID Transfer Portal',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'Merkezi Ekip Yönetim Paneli (Seat Manager)',
          nameEn: 'Central Team Seat Management Admin',
          free: false,
          personal: false,
          studio: true
        },
        {
          nameTr: 'Paylaşımlı Ekip Snippet & Şifreli Şablonlar',
          nameEn: 'Shared Encrypted Team Presets & Snippets',
          free: false,
          personal: false,
          studio: true
        },
        {
          nameTr: 'KDV Dahil Resmi Kurumsal Fatura Desteği',
          nameEn: 'Official Corporate VAT Invoices',
          free: false,
          personal: true,
          studio: true
        },
        {
          nameTr: 'Mühendislik Destek Düzeyi',
          nameEn: 'Engineering Support Level',
          free: 'Topluluk (Discord)',
          personal: 'Öncelikli E-Posta & Bilet',
          studio: 'Özel SLA & Canlı Mühendis'
        }
      ]
    }
  ];

  const renderCell = (val: string | boolean) => {
    if (typeof val === 'boolean') {
      return val ? (
        <div className="flex justify-center">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-500/50 border border-rose-500/20 flex items-center justify-center">
            <X className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return (
      <span className="text-xs font-mono font-medium text-gray-200">
        {val}
      </span>
    );
  };

  return (
    <div className="mt-20 max-w-7xl mx-auto">
      {/* Matrix Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          {lang === 'tr' ? 'DETAYLI KARŞILAŞTIRMA MATRİSİ' : 'DETAILED COMPARISON MATRIX'}
        </div>
        <h3 className="text-2xl font-bold text-white font-mono">
          {lang === 'tr' ? 'Hangi Plan İhtiyaçlarınıza En Uygun?' : 'Which Plan Fits Your Workflow Best?'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {lang === 'tr'
            ? 'Community Free, Pro Developer ve Studio Team planları arasındaki tüm farklar.'
            : 'Detailed feature comparison across Community Free, Pro Developer, and Studio Team plans.'}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#080b16] shadow-2xl shadow-black/80">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-gray-800 bg-[#060812]">
              <th className="p-4 sm:p-5 text-xs font-mono text-gray-400 uppercase tracking-wider w-2/5">
                {lang === 'tr' ? 'Özellik / Yetenek' : 'Feature / Capability'}
              </th>
              <th className="p-4 sm:p-5 text-center w-1/5">
                <div className="text-sm font-bold text-gray-300 font-mono">Free</div>
                <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                  {currency === 'TRY' ? '0 ₺' : '$0'}
                </div>
              </th>
              <th className="p-4 sm:p-5 text-center w-1/5 bg-cyan-950/20 border-x border-cyan-500/30">
                <div className="inline-flex items-center gap-1 text-sm font-bold text-cyan-300 font-mono">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Pro Developer
                </div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                  {currency === 'TRY' ? '99 ₺ / ay' : '$6.58 / mo'}
                </div>
              </th>
              <th className="p-4 sm:p-5 text-center w-1/5">
                <div className="text-sm font-bold text-purple-300 font-mono">Team Studio</div>
                <div className="text-[11px] font-mono text-purple-400 mt-0.5">
                  {currency === 'TRY' ? '299 ₺ / ay' : '$19.90 / mo'}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, catIdx) => {
              const Icon = cat.icon;
              return (
                <React.Fragment key={catIdx}>
                  {/* Category Section Row */}
                  <tr className="bg-[#0c1020] border-y border-gray-800/80">
                    <td
                      colSpan={4}
                      className="py-3 px-4 sm:px-5 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lang === 'tr' ? cat.titleTr : cat.titleEn}</span>
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {cat.features.map((feat, featIdx) => (
                    <tr
                      key={featIdx}
                      className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-5 text-xs font-mono text-gray-300">
                        {lang === 'tr' ? feat.nameTr : feat.nameEn}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderCell(feat.free)}
                      </td>
                      <td className="py-3.5 px-4 text-center bg-cyan-950/10 border-x border-cyan-500/20">
                        {renderCell(feat.personal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderCell(feat.studio)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Bottom CTA Row */}
            <tr className="bg-[#060812] border-t border-gray-800">
              <td className="p-4 sm:p-5 text-xs font-mono text-gray-400">
                {lang === 'tr' ? 'Hemen Başlayın' : 'Get Started Now'}
              </td>
              <td className="p-4 text-center">
                <a
                  href="#download"
                  className="inline-block px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 transition"
                >
                  {lang === 'tr' ? 'İndir' : 'Download'}
                </a>
              </td>
              <td className="p-4 text-center bg-cyan-950/20 border-x border-cyan-500/30">
                <button
                  onClick={() => {
                    cyberAudio.playClick();
                    onSelectPlan('personal');
                  }}
                  className="inline-block px-4 py-1.5 text-xs font-mono font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black shadow-md shadow-cyan-500/20 transition cursor-pointer"
                >
                  {lang === 'tr' ? 'Pro Satın Al' : 'Choose Pro'}
                </button>
              </td>
              <td className="p-4 text-center">
                <button
                  onClick={() => {
                    cyberAudio.playClick();
                    onSelectPlan('studio');
                  }}
                  className="inline-block px-4 py-1.5 text-xs font-mono font-semibold rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 transition cursor-pointer"
                >
                  {lang === 'tr' ? 'Team Seç' : 'Choose Team'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
