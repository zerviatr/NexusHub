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
import { X, Gift, Sparkles, Check, Copy, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Language } from '../lib/types';
import { joinWaitlist } from '../lib/api';
import { cyberAudio } from '../lib/cyberAudio';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isTr = lang === 'tr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg(isTr ? 'Lütfen geçerli bir e-posta adresi girin.' : 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    cyberAudio.playClick();

    try {
      const res = await joinWaitlist(email);
      if (res.success) {
        cyberAudio.playSuccess();
        setCouponCode(res.coupon || 'ZENDEV20');
      } else {
        setErrorMsg(res.message || (isTr ? 'Bir hata oluştu.' : 'Failed to join waitlist.'));
      }
    } catch {
      // Fallback code if network issue
      cyberAudio.playSuccess();
      setCouponCode('ZENDEV20');
    } finally {
      setLoading(false);
    }
  };

  const copyCoupon = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    cyberAudio.playSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#090d1a] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 p-6 sm:p-8 overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-600/20 blur-[90px] rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            cyberAudio.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        {!couponCode ? (
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090d1a] rounded-[14px] flex items-center justify-center">
                <Gift className="w-6 h-6 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono mb-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{isTr ? '%20 Erken Erişim İndirimi' : '20% Early Access Discount'}</span>
              </div>
              <h3 className="text-2xl font-bold text-white font-mono">
                {isTr ? 'Geliştirici İndiriminizi Alın' : 'Claim Your Developer Discount'}
              </h3>
              <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                {isTr
                  ? 'E-posta adresinizi bırakın, ZenDev v2.4.3 ömür boyu lisansında geçerli anlık %20 indirim kupon kodunu hemen kazanın.'
                  : 'Enter your email to receive an instant 20% off coupon code redeemable at checkout for ZenDev v2.4.3 lifetime license.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 bg-[#0c1020] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition font-mono"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-mono">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold font-mono text-xs sm:text-sm text-black bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isTr ? 'Hazırlanıyor...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isTr ? 'Kupon Kodunu Üret' : 'Generate Coupon Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-gray-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isTr ? 'Spam yok. Sadece sürüm güncellemeleri ve güvenlik bültenleri.' : 'No spam. Only release notes and security advisories.'}</span>
            </div>
          </div>
        ) : (
          /* Coupon Revealed Celebration State */
          <div className="space-y-6 text-center py-2 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white font-mono">
                {isTr ? 'Tebrikler! Kuponunuz Hazır' : 'Congratulations! Coupon Ready'}
              </h3>
              <p className="text-sm text-gray-300 mt-1">
                {isTr
                  ? 'Aşağıdaki kodu ödeme adımında kupon kutusuna yapıştırarak %20 indirimden yararlanın:'
                  : 'Paste the coupon code below during checkout to apply your 20% discount:'}
              </p>
            </div>

            {/* Coupon Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-cyan-500/50 flex items-center justify-between">
              <span className="text-xl font-mono font-extrabold text-cyan-300 tracking-wider">
                {couponCode}
              </span>
              <button
                onClick={copyCoupon}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/40 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTr ? 'Kopyalandı' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Kopyala' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            <a
              href="#pricing"
              onClick={() => {
                cyberAudio.playClick();
                onClose();
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 text-black text-xs sm:text-sm font-mono font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition"
            >
              <span>{isTr ? 'Hemen Fiyatlandırmaya Git & Uygula' : 'Go to Pricing & Apply Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
