import React from 'react';
import { Star, ShieldCheck, Heart, Quote } from 'lucide-react';
import { Language } from '../lib/types';
import { TESTIMONIALS } from '../lib/toolsData';

interface TestimonialsWallProps {
  lang: Language;
}

export const TestimonialsWall: React.FC<TestimonialsWallProps> = ({ lang }) => {
  return (
    <section id="testimonials" className="py-24 bg-[#05060b] relative border-t border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider mb-4">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
            <span>{lang === 'tr' ? 'MÜHENDİS ONAYLI' : 'ENGINEER VERIFIED'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {lang === 'tr' ? 'Yazılımcılar ve Siber Güvenlik Uzmanları Ne Diyor?' : 'What Engineers & Security Auditors Are Saying'}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-400">
            {lang === 'tr'
              ? 'Abonelik tuzaklarından kurtulup tek yazılımla 27+ güce kavuşan geliştiricilerin gerçek deneyimleri.'
              : 'Real feedback from developers who ditched subscription traps for ZenDev.'}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0a0d18] border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Doğrulanmış Lisans</span>
                  </div>
                </div>

                <Quote className="w-6 h-6 text-cyan-500/30 mb-2" />
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                  "{lang === 'tr' ? rev.textTr : rev.textEn}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs font-mono">{rev.author}</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {rev.role} • {rev.company}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/20">
                  {rev.toolUsed}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
