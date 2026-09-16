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
import { Check, X, ShieldCheck, Sparkles, Tag, ArrowRight, Lock, Download } from 'lucide-react';
import { Language, Currency, PricingPlan } from '../lib/types';
import { PRICING_PLANS } from '../lib/toolsData';
import { translations } from '../lib/translations';
import { cyberAudio } from '../lib/cyberAudio';

interface PricingSectionProps {
  lang: Language;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  lang,
  currency,
  setCurrency
}) => {
  const [coupon, setCoupon] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const t = translations[lang].pricing;

  const validCoupons: Record<string, number> = {
    ZENDEV20: 20,
    OGRENCI: 30,
    EARLYBIRD: 20,
    PROMO20: 20,
    SPECIAL25: 25
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCoupon = coupon.trim().toUpperCase();
    if (validCoupons[cleanCoupon]) {
      setDiscountPercent(validCoupons[cleanCoupon]);
      setCouponApplied(true);
      setCouponError('');
      cyberAudio.playSuccess();
    } else {
      setCouponError(lang === 'tr' ? 'Geçersiz indirim kodu.' : 'Invalid coupon code.');
      cyberAudio.playClick();
    }
  };

  const getDiscountedPrice = (price: number) => {
    if (price === 0) return 0;
    if (!couponApplied || discountPercent === 0) return price;
    return Math.round(price * (1 - discountPercent / 100));
  };

  return (
    <section id="pricing" className="py-24 bg-[#05060b] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
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

          {/* Currency Switcher */}
          <div className="mt-8 inline-flex items-center gap-1 bg-[#0a0d18] border border-gray-800 rounded-xl p-1 text-xs font-mono">
            <span className="text-gray-400 px-2">{t.currencyToggle}</span>
            {(['TRY', 'USD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  cyberAudio.playClick();
                  setCurrency(c);
                }}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  currency === c
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {c === 'TRY' ? '₺ TRY' : c === 'USD' ? '$ USD' : '€ EUR'}
              </button>
            ))}
          </div>
        </div>

        {/* Coupon Input Strip */}
        <div className="max-w-md mx-auto mb-14">
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder={t.couponPlaceholder}
                className="w-full bg-[#0a0d18] border border-gray-800 focus:border-cyan-400 rounded-xl pl-10 pr-3 py-2 text-xs font-mono text-cyan-300 uppercase outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 rounded-xl transition cursor-pointer"
            >
              {t.applyCoupon}
            </button>
          </form>

          {couponApplied && (
            <div className="text-xs font-mono text-emerald-400 mt-2 text-center">
              🎉 %{discountPercent} İndirim Kuponu Başarıyla Tanımlandı!
            </div>
          )}
          {couponError && (
            <div className="text-xs font-mono text-rose-400 mt-2 text-center">
              {couponError}
            </div>
          )}
        </div>

        {/* 3-Column Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const priceInfo = plan.prices[currency];
            const finalPrice = getDiscountedPrice(priceInfo.current);
            const isFree = plan.id === 'free';
            const isPersonal = plan.id === 'personal';
            const isStudio = plan.id === 'studio';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 transition-all flex flex-col justify-between ${
                  isPersonal
                    ? 'bg-gradient-to-b from-[#0f172a] via-[#090d1a] to-[#060810] border-2 border-cyan-400/60 shadow-2xl shadow-cyan-500/20 transform md:-translate-y-2'
                    : isStudio
                    ? 'bg-gradient-to-b from-[#131128] to-[#080b16] border border-purple-500/40 shadow-xl'
                    : 'bg-[#080b16] border border-gray-800/90 shadow-lg'
                }`}
              >
                {/* Floating Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 text-black text-[11px] font-mono font-extrabold tracking-wider uppercase shadow-lg shadow-cyan-500/30">
                    {lang === 'tr' ? plan.badgeTr : plan.badgeEn}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {!plan.recommended && (
                        <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#101628] border border-gray-800 text-gray-400 mb-2">
                          {lang === 'tr' ? plan.badgeTr : plan.badgeEn}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-white font-mono">
                        {lang === 'tr' ? plan.nameTr : plan.nameEn}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
                        {lang === 'tr' ? plan.descriptionTr : plan.descriptionEn}
                      </p>
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white font-mono">
                        {isFree ? (lang === 'tr' ? '0 ₺' : '$0') : `${priceInfo.symbol}${finalPrice}`}
                      </span>
                      <span className="text-xs text-cyan-400 font-mono font-bold uppercase">
                        {isFree
                          ? (lang === 'tr' ? '/ KALICI ÜCRETSİZ' : '/ FREE FOREVER')
                          : (lang === 'tr' ? '/ TEK SEFERLİK' : '/ PERPETUAL OWN')}
                      </span>
                    </div>

                    {!isFree && (
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-gray-500">
                        <span className="line-through">
                          {priceInfo.symbol}
                          {priceInfo.original}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          %{Math.round(((priceInfo.original - finalPrice) / priceInfo.original) * 100)} {lang === 'tr' ? 'İndirim' : 'Off'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-4 border-t border-gray-800/80">
                    <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                      {lang === 'tr' ? 'Dahil Olan Özellikler:' : 'Included Features:'}
                    </div>
                    {(lang === 'tr' ? plan.featuresTr : plan.featuresEn).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono text-gray-300">
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}

                    {/* Explicit Limitations for Free Tier */}
                    {isFree && plan.limitationsTr && (
                      <div className="pt-3 mt-3 border-t border-gray-800/40 space-y-2">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">
                          {lang === 'tr' ? 'Ücretsiz Sürümde Kilitli:' : 'Locked in Free:'}
                        </div>
                        {(lang === 'tr' ? plan.limitationsTr : plan.limitationsEn || []).map((lim, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs font-mono text-gray-500 line-through">
                            <X className="w-3.5 h-3.5 text-rose-500/70 shrink-0 mt-0.5" />
                            <span>{lim}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="mt-8 pt-5 border-t border-gray-800/80">
                  {isFree ? (
                    <a
                      href="#download"
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold font-mono rounded-xl bg-[#11172a] hover:bg-[#162038] border border-gray-700 text-gray-200 transition"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'tr' ? (plan.ctaTr || 'Ücretsiz İndir') : (plan.ctaEn || 'Download Free')}</span>
                    </a>
                  ) : (
                    <a
                      href="https://zendev.lemonsqueezy.com"
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold font-mono rounded-xl transition cursor-pointer ${
                        isPersonal
                          ? 'text-black bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:from-cyan-300 hover:to-sky-200 shadow-lg shadow-cyan-500/30 font-extrabold'
                          : 'text-white bg-[#1a1835] hover:bg-[#252248] border border-purple-500/40'
                      }`}
                    >
                      <span>{lang === 'tr' ? plan.ctaTr : plan.ctaEn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-gray-500">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>{isFree ? (lang === 'tr' ? 'Kredi kartı gerekmez' : 'No credit card required') : t.secureCheckout}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guarantee Banner */}
        <div className="mt-14 max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-4 py-2 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.moneyBack}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
