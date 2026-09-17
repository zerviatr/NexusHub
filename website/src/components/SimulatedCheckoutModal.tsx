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

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Check, Copy, CreditCard, ShieldCheck, Sparkles, ArrowRight, Lock, Key, CheckCircle2, ExternalLink } from 'lucide-react';
import { Language, Currency, PricingPlan, BillingCycle } from '../lib/types';
import { cyberAudio } from '../lib/cyberAudio';

interface SimulatedCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan;
  billingCycle: BillingCycle;
  currency: Currency;
  discountPercent: number;
  lang: Language;
}

export const SimulatedCheckoutModal: React.FC<SimulatedCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  currency,
  discountPercent,
  lang
}) => {
  const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');
  const [email, setEmail] = useState('developer@zendev.app');
  const [name, setName] = useState('Lee Boonstra');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('review');
      setGeneratedKey('');
      setCopiedKey(false);
    }
  }, [isOpen, plan.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Price calculations
  const priceTier = plan.prices[currency];
  const rawPrice = billingCycle === 'yearly' ? priceTier.yearly : priceTier.monthly;
  const discountAmount = discountPercent > 0 ? (rawPrice * discountPercent) / 100 : 0;
  const finalPrice = Math.max(0, Math.round((rawPrice - discountAmount) * 100) / 100);

  // Generate realistic license key format
  const generateLicenseKey = () => {
    const prefix = plan.id === 'studio' ? 'ZEN-TEAM' : 'ZEN-PRO';
    const randomHex = () => {
      const chars = '0123456789ABCDEF';
      let str = '';
      for (let i = 0; i < 4; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
      }
      return str;
    };
    return `${prefix}-${randomHex()}-${randomHex()}-${randomHex()}-2026`;
  };

  const handleStartCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    cyberAudio.playClick();
    setStep('processing');

    setTimeout(() => {
      const key = generateLicenseKey();
      setGeneratedKey(key);
      setStep('success');
      cyberAudio.playSuccess();

      // Fire celebratory confetti explosion
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#8b5cf6', '#10b981', '#38bdf8', '#f59e0b']
      });
    }, 750);
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    cyberAudio.playSuccess();
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleGoToPortal = () => {
    onClose();
    const portalEl = document.getElementById('portal');
    if (portalEl) {
      portalEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090d1a] border border-cyan-500/40 shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#060812]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {lang === 'tr' ? 'ZenDev Simüle SaaS Ödeme & Lisans' : 'ZenDev Simulated SaaS Checkout'}
            </span>
          </div>

          <button
            onClick={() => {
              cyberAudio.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {step === 'review' && (
            <form onSubmit={handleStartCheckout} className="space-y-5">
              {/* Simulation Mode Info Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {lang === 'tr'
                    ? 'Simülasyon Modu: Gerçek kartınızdan para çekilmez. Anında çalışan bir test lisansı üretilir.'
                    : 'Simulation Mode: No real charges will be made. An instant active test license will be issued.'}
                </span>
              </div>

              {/* Order Summary Box */}
              <div className="p-4 rounded-xl bg-[#060812] border border-gray-800 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center text-gray-300">
                  <span className="font-semibold text-white">
                    {lang === 'tr' ? plan.nameTr : plan.nameEn}
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {billingCycle === 'yearly'
                      ? (lang === 'tr' ? 'Yıllık Faturalandırma' : 'Annual Billing')
                      : (lang === 'tr' ? 'Aylık Faturalandırma' : 'Monthly Billing')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-gray-400 pt-1 border-t border-gray-800/60">
                  <span>{lang === 'tr' ? 'Normal Liste Fiyatı:' : 'List Price:'}</span>
                  <span>{priceTier.symbol}{rawPrice}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>{lang === 'tr' ? `Kupon İndirimi (%${discountPercent}):` : `Coupon Discount (${discountPercent}%):`}</span>
                    <span>-{priceTier.symbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-gray-700">
                  <span>{lang === 'tr' ? 'Toplam Tutar:' : 'Total Amount:'}</span>
                  <span className="text-cyan-300 font-mono text-base">
                    {priceTier.symbol}{finalPrice}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    {lang === 'tr' ? 'Lisans Sahibi Adı:' : 'License Holder Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#050711] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    {lang === 'tr' ? 'E-Posta Adresi (Lisans buraya iletilir):' : 'Email Address:'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#050711] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    {lang === 'tr' ? 'Ödeme Bilgisi (Test Kartı):' : 'Payment Information (Test Card):'}
                  </label>
                  <div className="flex items-center gap-2 bg-[#050711] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-300">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>{cardNumber}</span>
                    <span className="ml-auto text-gray-500">12/28 • CVC 123</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold font-mono text-black bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:from-cyan-300 hover:to-sky-200 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {lang === 'tr'
                    ? 'Simüle Ödemeyi Tamamla ve Lisansı Al'
                    : 'Complete Simulated Checkout & Get License'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center space-y-4 font-mono">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
              <div className="text-sm font-bold text-white">
                {lang === 'tr' ? 'SaaS Lisansı Hazırlanıyor...' : 'Generating SaaS License Key...'}
              </div>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {lang === 'tr'
                  ? 'Kriptografik HMAC imzası oluşturuluyor ve aktivasyon yuvası rezerve ediliyor.'
                  : 'Synthesizing cryptographic HMAC signature and allocating workstation machine slot.'}
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono">
              {/* Success Badge */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'tr' ? 'Tebrikler! Lisansınız Hazır.' : 'Congratulations! Your License is Ready.'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'tr'
                    ? `${plan.nameTr} başarıyla aktive edildi.`
                    : `${plan.nameEn} has been simulated & generated.`}
                </p>
              </div>

              {/* Generated Key Card */}
              <div className="p-4 rounded-xl bg-[#060812] border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20 text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'tr' ? 'Resmi Lisans Anahtarınız' : 'Official License Key'}</span>
                </div>

                <div className="text-base sm:text-lg font-black text-cyan-300 tracking-wider my-2 select-all break-all">
                  {generatedKey}
                </div>

                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? (lang === 'tr' ? 'Kopyalandı!' : 'Copied!') : (lang === 'tr' ? 'Anahtarı Kopyala' : 'Copy License Key')}</span>
                </button>
              </div>

              {/* 3 Steps Instructions */}
              <div className="p-3.5 rounded-xl bg-gray-900/50 border border-gray-800 space-y-2 text-xs text-gray-300">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 text-cyan-400">
                  {lang === 'tr' ? 'Nasıl Aktive Edilir?' : 'How to Activate?'}
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                  <span>{lang === 'tr' ? 'Yukarıdaki lisans anahtarınızı kopyalayın.' : 'Copy your newly created license key above.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                  <span>{lang === 'tr' ? 'ZenDev v2.5.3 masaüstü uygulamasını açın.' : 'Launch the ZenDev v2.5.3 desktop application.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
                  <span>{lang === 'tr' ? 'Ayarlar → Lisans bölümüne yapıştırarak tüm özellikleri açın.' : 'Paste in Settings → License to unlock all stations instantly.'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleGoToPortal}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold bg-[#12182d] hover:bg-[#18203c] border border-cyan-500/40 text-cyan-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? 'Müşteri Portalında Test Et' : 'Test in License Portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cyberAudio.playClick();
                    onClose();
                  }}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-lg text-xs font-bold text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 transition cursor-pointer"
                >
                  {lang === 'tr' ? 'Kapat' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
