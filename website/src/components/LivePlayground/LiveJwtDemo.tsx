import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';

export const LiveJwtDemo: React.FC = () => {
  // Sample valid JWT
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlplbkRldiBVc2VyIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  );

  const decodeJwt = (jwtString: string) => {
    try {
      const parts = jwtString.trim().split('.');
      if (parts.length < 2) {
        return { valid: false, header: null, payload: null, error: 'Token 3 parçadan (Header.Payload.Signature) oluşmalıdır.' };
      }
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { valid: true, header, payload, error: null };
    } catch {
      return { valid: false, header: null, payload: null, error: 'Geçersiz Base64 / JSON JWT formatı.' };
    }
  };

  const decoded = decodeJwt(token);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold text-sky-300 uppercase tracking-wider">
            JsonStudio: JWT Token Çözücü & İnceleyici
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {decoded.valid ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Geçerli JWT Yapısı
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {decoded.error}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-1">JWT Dizgisi:</label>
        <textarea
          rows={2}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOi..."
          className="w-full bg-[#090d1a] border border-gray-800 focus:border-sky-400 rounded-lg p-3 text-xs font-mono text-gray-300 outline-none transition resize-none break-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="block text-[11px] font-mono text-rose-400 font-bold mb-1">
            HEADER (Başlık):
          </span>
          <pre className="bg-[#050711] border border-rose-500/20 rounded-lg p-3 font-mono text-xs text-rose-300 overflow-x-auto min-h-[90px]">
            {decoded.header ? JSON.stringify(decoded.header, null, 2) : '// Bekleniyor...'}
          </pre>
        </div>
        <div>
          <span className="block text-[11px] font-mono text-sky-400 font-bold mb-1">
            PAYLOAD (Veri Yükü):
          </span>
          <pre className="bg-[#050711] border border-sky-500/20 rounded-lg p-3 font-mono text-xs text-sky-300 overflow-x-auto min-h-[90px]">
            {decoded.payload ? JSON.stringify(decoded.payload, null, 2) : '// Bekleniyor...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
