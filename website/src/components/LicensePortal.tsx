import React, { useState } from 'react';
import { KeyRound, RotateCcw, CheckCircle2, AlertCircle, Laptop, ShieldCheck } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/translations';
import { lookupLicense, resetHwid, LicenseLookupResponse } from '../lib/api';

interface LicensePortalProps {
  lang: Language;
}

export const LicensePortal: React.FC<LicensePortalProps> = ({ lang }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LicenseLookupResponse | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const t = translations[lang].portal;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      const data = await lookupLicense(licenseKey);
      setResult(data);
      if (!data.valid) {
        setMessage({ text: data.reason || 'Geçersiz lisans anahtarı.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Sunucuyla bağlantı kurulamadı.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetHwid = async () => {
    if (!licenseKey.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await resetHwid(licenseKey);
      if (res.success) {
        setMessage({ text: t.resetSuccess, type: 'success' });
        // Refresh lookup
        const updated = await lookupLicense(licenseKey);
        setResult(updated);
      } else {
        setMessage({ text: res.reason || 'Sıfırlama başarısız oldu.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Sıfırlama işlemi sırasında hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="portal" className="py-24 bg-[#070914] border-t border-gray-800/80 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            {t.tag}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {t.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400">
            {t.subtitle}
          </p>
        </div>

        {/* Portal Form Box */}
        <div className="bg-[#0a0d18] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder={t.keyPlaceholder}
                className="w-full bg-[#050711] border border-gray-800 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono text-cyan-300 tracking-wider uppercase outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-xs sm:text-sm font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              {loading ? 'Sorgulanıyor...' : t.btnLookup}
            </button>
          </form>

          {/* Feedback message */}
          {message && (
            <div
              className={`mt-4 p-3.5 rounded-xl border flex items-center gap-2 text-xs font-mono ${
                message.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* License Results Card */}
          {result && result.valid && (
            <div className="mt-6 pt-6 border-t border-gray-800/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060812] border border-emerald-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold font-mono text-emerald-300">
                      {t.statusValid}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      Plan: <span className="text-white uppercase">{result.tier}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-gray-300">
                  <span>
                    {t.activations}{' '}
                    <strong className="text-cyan-400">
                      {result.activations?.length || 0} / {result.max_activations || 2}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Active machines list */}
              {result.activations && result.activations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-gray-400">Bağlı Donanımlar (HWID):</span>
                  {result.activations.map((act, i) => (
                    <div
                      key={i}
                      className="bg-[#050711] border border-gray-800 p-3 rounded-lg flex items-center justify-between text-xs font-mono text-gray-300"
                    >
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-cyan-400" />
                        <span>HWID: {act.hwid.slice(0, 16)}...</span>
                        {act.hostname && <span className="text-gray-500">({act.hostname})</span>}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(act.activated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reset HWID Slot CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetHwid}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 rounded-xl transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.btnResetHwid}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
