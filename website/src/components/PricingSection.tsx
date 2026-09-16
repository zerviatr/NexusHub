import React, { useState } from 'react';
import { Check, ShieldCheck, Sparkles, Tag, ArrowRight, Lock } from 'lucide-react';
import { Language, Currency, PricingPlan } from '../lib/types';
import { PRICING_PLANS } from '../lib/toolsData';
import { translations } from '../lib/translations';
import confetti from 'canvas-confetti';

interface PricingSectionProps {
  lang: Language;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ lang, currency, setCurrency }) => {
  const [coupon, setCoupon] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const t = translations[lang].pricing;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const clean = coupon.trim().toUpperCase();
    if (clean === 'ZENDEV20' || clean === 'LAUNCH20') {
      setDiscountPercent(20);
      setCouponApplied(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
    } else if (clean === 'CYBER30') {
      setDiscountPercent(30);
      setCouponApplied(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.7 }
      });
    } else {
      setCouponError('Geçersiz kupon kodu.');
    }
  };

  const getDiscountedPrice = (original: number) => {
    if (discountPercent <= 0) return original;
    return Math.round(original * (1 - discountPercent / 100));
  };

  return (
    <section id="pricing" className="py-24 bg-[#05060b] relative">
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

          {/* Currency Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 bg-[#0a0d18] border border-gray-800 p-1.5 rounded-xl text-xs font-mono">
            <span className="text-gray-400 px-2">{t.currencyToggle}</span>
            {(['TRY', 'USD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1 rounded-lg transition ${
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
        <div className="max-w-md mx-auto mb-12">
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
              className="px-4 py-2 text-xs font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 rounded-xl transition"
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const priceInfo = plan.prices[currency];
            const finalPrice = getDiscountedPrice(priceInfo.current);
            const isStudio = plan.id === 'studio';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all flex flex-col justify-between ${
                  isStudio
                    ? 'bg-gradient-to-b from-[#0e1326] to-[#080b16] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10'
                    : 'bg-[#0a0d18] border border-gray-800 shadow-xl'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-400 text-black text-[11px] font-mono font-bold tracking-wider uppercase shadow-lg">
                    {lang === 'tr' ? plan.badgeTr : plan.badgeEn}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white font-mono">
                        {lang === 'tr' ? plan.nameTr : plan.nameEn}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {lang === 'tr' ? plan.descriptionTr : plan.descriptionEn}
                      </p>
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white font-mono">
                        {priceInfo.symbol}
                        {finalPrice}
                      </span>
                      <span className="text-xs text-cyan-400 font-mono font-bold uppercase">
                        / TEK SEFERLİK ÖDEME
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-gray-500">
                      <span className="line-through">
                        {priceInfo.symbol}
                        {priceInfo.original}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        %{Math.round(((priceInfo.original - finalPrice) / priceInfo.original) * 100)} Kazanç
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 pt-4 border-t border-gray-800">
                    {(lang === 'tr' ? plan.featuresTr : plan.featuresEn).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs font-mono text-gray-300">
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="mt-8 pt-6 border-t border-gray-800/80">
                  <a
                    href="https://zendev.lemonsqueezy.com"
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold font-mono rounded-xl transition ${
                      isStudio
                        ? 'text-black bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 shadow-lg shadow-cyan-500/25'
                        : 'text-white bg-[#141a2e] hover:bg-[#1a223c] border border-gray-700'
                    }`}
                  >
                    <span>{t.buyNow}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>{t.secureCheckout}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-4 py-2 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.moneyBack}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
