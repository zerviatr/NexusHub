import React, { useState, useEffect } from 'react';
import { KeyRound, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';

export const LivePasswordDemo: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(24);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let pool = letters;
    if (includeNumbers) pool += numbers;
    if (includeSymbols) pool += symbols;

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    let res = '';
    for (let i = 0; i < length; i++) {
      res += pool[array[i] % pool.length];
    }
    setPassword(res);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeSymbols, includeNumbers]);

  const calculateEntropy = () => {
    let poolSize = 52;
    if (includeNumbers) poolSize += 10;
    if (includeSymbols) poolSize += 26;
    return Math.round(length * Math.log2(poolSize));
  };

  const entropy = calculateEntropy();

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
            PasswordGenerator: CSPRNG Entropi Kalkanı
          </span>
        </div>
        <button
          onClick={generatePassword}
          className="flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Yeniden Üret</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">Üretilen Parola:</label>
        <div className="bg-[#050711] border border-purple-500/30 rounded-lg p-3 font-mono text-sm text-purple-300 break-all flex items-center justify-between">
          <span className="tracking-wide select-all">{password}</span>
          <button
            onClick={handleCopy}
            className="ml-3 p-1.5 rounded text-gray-400 hover:text-purple-300 hover:bg-purple-950/50 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Entropy bar */}
      <div>
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-gray-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            Entropi Gücü:
          </span>
          <span className="text-emerald-400 font-bold">{entropy} Bit (Kırılamaz)</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (entropy / 160) * 100)}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-gray-300">
        <div className="flex items-center justify-between bg-[#090d1a] border border-gray-800 px-3 py-2 rounded-lg">
          <span>Uzunluk: {length}</span>
          <input
            type="range"
            min={12}
            max={48}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-20 accent-purple-400 cursor-pointer"
          />
        </div>
        <label className="flex items-center gap-2 bg-[#090d1a] border border-gray-800 px-3 py-2 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={includeNumbers}
            onChange={(e) => setIncludeNumbers(e.target.checked)}
            className="accent-purple-400 rounded"
          />
          <span>Rakamlar (0-9)</span>
        </label>
        <label className="flex items-center gap-2 bg-[#090d1a] border border-gray-800 px-3 py-2 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={includeSymbols}
            onChange={(e) => setIncludeSymbols(e.target.checked)}
            className="accent-purple-400 rounded"
          />
          <span>Semboller (!@#$)</span>
        </label>
      </div>
    </div>
  );
};
