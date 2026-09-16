import React, { useState } from 'react';
import { Shuffle, Copy, Check, RefreshCw } from 'lucide-react';
import { cyberAudio } from '../../lib/cyberAudio';

export const LiveFakeDataDemo: React.FC = () => {
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const FIRST_NAMES = ['Kaan', 'Elena', 'Ahmet', 'Zeynep', 'Emre', 'Sarah', 'Can', 'Burak', 'David', 'Deniz'];
  const LAST_NAMES = ['Demir', 'Kaya', 'Yılmaz', 'Rostova', 'Öztürk', 'Smith', 'Aydın', 'Miller', 'Koç', 'Yıldız'];
  const CITIES = ['İstanbul', 'Berlin', 'Ankara', 'Londra', 'İzmir', 'Amsterdam', 'Antalya', 'Zürih'];
  const DOMAINS = ['gmail.com', 'zendev.io', 'techhub.dev', 'proton.me'];

  const generateData = () => {
    cyberAudio.playClick();
    const rows = [];
    for (let i = 0; i < count; i++) {
      const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(Math.random() * 90 + 10)}@${domain}`;
      const fakeCard = `4532 **** **** ${Math.floor(Math.random() * 8999 + 1000)}`;
      const uuid = crypto.randomUUID ? crypto.randomUUID() : `usr_${Math.random().toString(36).substr(2, 9)}`;

      rows.push({
        id: uuid,
        name: `${fName} ${lName}`,
        email,
        city,
        card: fakeCard
      });
    }

    if (format === 'json') {
      setOutput(JSON.stringify(rows, null, 2));
    } else {
      const header = 'id,name,email,city,card\n';
      const csvRows = rows.map((r) => `"${r.id}","${r.name}","${r.email}","${r.city}","${r.card}"`).join('\n');
      setOutput(header + csvRows);
    }
  };

  React.useEffect(() => {
    generateData();
  }, [count, format]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    cyberAudio.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
            FakeDataStudio: Sentetik Test Verisi Fabrikası
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFormat('json')}
            className={`px-2 py-0.5 rounded transition ${
              format === 'json' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-gray-400'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setFormat('csv')}
            className={`px-2 py-0.5 rounded transition ${
              format === 'csv' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-gray-400'
            }`}
          >
            CSV
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#090d1a] border border-gray-800 p-2.5 rounded-xl text-xs font-mono text-gray-300">
        <div className="flex items-center gap-2">
          <span>Kayıt Sayısı:</span>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="bg-[#050711] border border-gray-700 text-purple-300 px-2 py-1 rounded"
          >
            <option value={1}>1 Kayıt</option>
            <option value={3}>3 Kayıt</option>
            <option value={5}>5 Kayıt</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateData}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yeniden Üret</span>
          </button>
          <span>•</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
      </div>

      <pre className="bg-[#050711] border border-purple-500/30 rounded-xl p-3 font-mono text-xs text-purple-200/90 overflow-x-auto max-h-48 select-all">
        {output}
      </pre>
    </div>
  );
};
