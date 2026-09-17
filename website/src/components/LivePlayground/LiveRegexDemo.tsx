import React, { useState, useMemo } from 'react';
import { Regex, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LiveRegexDemo: React.FC = () => {
  const [pattern, setPattern] = useState('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,7}\\b');
  const [flags, setFlags] = useState('gi');
  const [testString, setTestString] = useState(
    'ZenDev v2.5.3 ile iletisim@zendev.io ve security@nexushub.dev adreslerine ulasabilirsiniz. Port: 3000.'
  );

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [], error: null };
    try {
      const reg = new RegExp(pattern, flags);
      const allMatches = Array.from(testString.matchAll(reg));
      return { matches: allMatches, error: null };
    } catch (err: any) {
      return { matches: [], error: err.message };
    }
  }, [pattern, flags, testString]);

  // Render highlighted text
  const renderedText = useMemo(() => {
    if (!pattern || error || matches.length === 0) {
      return <span>{testString}</span>;
    }

    try {
      const reg = new RegExp(`(${pattern})`, flags);
      const parts = testString.split(reg);

      return parts.map((part, i) => {
        const isMatch = matches.some((m) => m[0] === part);
        if (isMatch) {
          return (
            <mark
              key={i}
              className="bg-cyan-500/30 text-cyan-300 px-1 py-0.5 rounded border border-cyan-400/50 font-bold"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      });
    } catch {
      return <span>{testString}</span>;
    }
  }, [pattern, flags, testString, matches, error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Regex className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            RegexStudio: Canlı Düzenli İfade Teşhisi
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {error ? (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Geçersiz Regex
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {matches.length} Eşleşme Bulundu
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3">
          <label className="block text-xs font-mono text-gray-400 mb-1">Regex Deseni (Pattern):</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm font-mono text-cyan-300 outline-none transition"
            placeholder="Regex deseni girin..."
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-mono text-gray-400 mb-1">Bayraklar:</label>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm font-mono text-white text-center outline-none transition"
            placeholder="gim"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">Test Metni:</label>
        <textarea
          rows={2}
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          className="w-full bg-[#090d1a] border border-gray-800 focus:border-cyan-400 rounded-lg p-3 text-sm font-mono text-gray-300 outline-none transition resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">Canlı Eşleşme Vurgusu:</label>
        <div className="bg-[#050711] border border-gray-800 rounded-lg p-3 font-mono text-xs text-gray-200 leading-relaxed break-words min-h-[44px]">
          {renderedText}
        </div>
      </div>
    </div>
  );
};
