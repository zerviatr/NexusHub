import React, { useState } from 'react';
import { ShieldAlert, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { cyberAudio } from '../../lib/cyberAudio';

export const LiveShredderDemo: React.FC = () => {
  const [currentPass, setCurrentPass] = useState(0);
  const [isShredding, setIsShredding] = useState(false);
  const [scrambledData, setScrambledData] = useState('TOP_SECRET_FINANCIAL_REPORT_2026.PDF');
  const [statusText, setStatusText] = useState('Dosya bekliyor. İmha başlatılmadı.');

  const PASS_DESCRIPTIONS = [
    'Pass 1/7: Tüm sektörler 0x00 ile eziliyor...',
    'Pass 2/7: Tüm sektörler 0xFF ile eziliyor...',
    'Pass 3/7: Kriptografik rastgele byte akışı yazılıyor...',
    'Pass 4/7: Sabit desen 0x96 yazılıyor...',
    'Pass 5/7: Ters komplementer desen 0x69 yazılıyor...',
    'Pass 6/7: Donanım CSPRNG gürültüsü ile üzerine yazılıyor...',
    'Pass 7/7: Manyetik artıklar sıfırlanıyor ve doğrulanıyor...'
  ];

  const startShredding = () => {
    if (isShredding) return;
    setIsShredding(true);
    setCurrentPass(1);
    cyberAudio.playPurge();

    let p = 1;
    const interval = setInterval(() => {
      p += 1;
      if (p <= 7) {
        setCurrentPass(p);
        setStatusText(PASS_DESCRIPTIONS[p - 1]);
        cyberAudio.playPurge();
        // Generate random hex bytes visual
        const randomHex = Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(' ');
        setScrambledData(randomHex);
      } else {
        clearInterval(interval);
        setIsShredding(false);
        setCurrentPass(7);
        setStatusText('✅ DoD 5220.22-M Standardında Kalıcı Olarak İmha Edildi! Geri getirilemez.');
        setScrambledData('00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 (ZEROED)');
        cyberAudio.playZap();
      }
    }, 450);
  };

  const resetSim = () => {
    setCurrentPass(0);
    setIsShredding(false);
    setScrambledData('TOP_SECRET_FINANCIAL_REPORT_2026.PDF');
    setStatusText('Dosya bekliyor. İmha başlatılmadı.');
    cyberAudio.playClick();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">
            CyberFortress: DoD 5220.22-M 7-Pass Dosya İmha Simülatörü
          </span>
        </div>
        <span className="text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded">
          Askeri Standart 7 Aşama
        </span>
      </div>

      <div className="bg-[#090d1a] border border-gray-800 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-gray-400">Hedef Veri Sektörü:</span>
          <span className="text-gray-300">Aşama: <strong className="text-cyan-400">{currentPass} / 7</strong></span>
        </div>

        {/* 7-Step visual progress steps */}
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((pass) => (
            <div
              key={pass}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentPass >= pass
                  ? 'bg-gradient-to-r from-rose-500 to-cyan-400 shadow-sm shadow-cyan-500/50'
                  : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Live byte matrix screen */}
        <div className="bg-[#04060d] border border-rose-500/20 rounded-lg p-3 font-mono text-xs text-rose-300/90 break-all select-all min-h-[48px] flex items-center">
          {scrambledData}
        </div>

        <div className="text-[11px] font-mono text-gray-400 flex items-center gap-2">
          {currentPass === 7 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
          <span>{statusText}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={resetSim}
          disabled={isShredding}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white bg-[#090d1a] border border-gray-800 disabled:opacity-40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sıfırla</span>
        </button>
        <button
          onClick={startShredding}
          disabled={isShredding || currentPass === 7}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold font-mono text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition shadow-lg shadow-rose-600/25"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isShredding ? '7 Aşamalı İmha Sürüyor...' : 'DoD 7-Pass İmha Et'}</span>
        </button>
      </div>
    </div>
  );
};
