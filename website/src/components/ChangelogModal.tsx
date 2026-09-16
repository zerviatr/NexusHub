import React from 'react';
import { X, Sparkles, Check, Zap, Shield, Cpu, Terminal, Layers } from 'lucide-react';
import { Language } from '../lib/types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const isTr = lang === 'tr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0e1b] border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#060812] border-b border-gray-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                {isTr ? 'ZenDev Sürüm Günlüğü & Yenilikler' : 'ZenDev Changelog & Release Notes'}
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {isTr ? 'En son resmi sürüm: v2.5.2' : 'Latest official release: v2.5.2'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll */}
        <div className="p-6 overflow-y-auto space-y-8 font-mono text-xs">
          {/* v2.5.2 - Silent Subprocess & NSIS Background Updater */}
          <div className="border-l-2 border-cyan-400 pl-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-cyan-300">
                {isTr
                  ? 'v2.5.2 — Sessiz Komut Alt-İşlem Mimarisi & NSIS Arka Plan Güncelleyici'
                  : 'v2.5.2 — Silent Subprocess Architecture & Silent NSIS Updater'}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[10px]">
                {isTr ? 'GÜNCEL SÜRÜM' : 'LATEST RELEASE'}
              </span>
              <span className="text-[10px] text-gray-500">
                {isTr ? '16 Eylül 2026' : 'September 16, 2026'}
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              {isTr
                ? 'Windows üzerinde Port Watchdog, Ağ Araçları, Sistem İyileştirici, HWID ve Güncelleyici arka plan yoklamalarında konsol penceresi (cmd.exe) sıçraması tamamen engellendi. NSIS arka plan sessiz kurulum iş akışı entegre edildi.'
                : 'Eliminated intrusive cmd.exe console popup windows during background polling across Port Watchdog, Network Recon, Optimizer, HWID, and Updater on Windows. Added silent NSIS background auto-updates.'}
            </p>
            <ul className="space-y-1.5 pt-1 text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Merkezi CREATE_NO_WINDOW (0x08000000) bayrağıyla Windows alt-işlemlerinde (tasklist, netstat, ping, nslookup, ipconfig, REG.exe) konsol parlaması sıfıra indirildi.'
                    : 'Centralized CREATE_NO_WINDOW (0x08000000) flag across all Windows subprocesses (tasklist, netstat, ping, nslookup, ipconfig, REG.exe) eliminating flashing windows.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Tauri v2 updater ve NSIS yükleyici /S parametresiyle kullanıcı iş akışı bölünmeden arka planda sessiz ve kesintisiz güncelleme desteği.'
                    : 'Silent background updater workflow leveraging Tauri v2 and NSIS /S silent flags without interrupting developer workflows.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Tokio asenkron I/O akışları ve sıfır ek yüklü (zero-overhead) platform extension mimarisi ile kusursuz veri akışı.'
                    : 'Preserved full Tokio async stdout/stderr streaming and zero-overhead cross-platform command execution abstractions.'}
                </span>
              </li>
            </ul>
          </div>

          {/* v2.5.1 - Elevation Developer Studios */}
          <div className="border-l-2 border-emerald-400 pl-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-emerald-300">
                {isTr
                  ? 'v2.5.1 — Geliştirici Stüdyoları Yükseltmesi (Elevation Studios)'
                  : 'v2.5.1 — Developer Elevation Studios Suite'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px]">
                {isTr ? 'GELİŞTİRİCİ PAKETİ' : 'STUDIO DROP'}
              </span>
              <span className="text-[10px] text-gray-500">
                {isTr ? '16 Eylül 2026' : 'September 16, 2026'}
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              {isTr
                ? 'Geliştirici cephaneliği 27\'den 31 araca genişletildi. Dört yeni tam teşekküllü SaaS geliştirici stüdyosu hem masaüstü hem web ortamına kazandırıldı.'
                : 'Expanded tool arsenal from 27 to 31 power workstations. Introduced four high-demand developer SaaS utilities across desktop and web environments.'}
            </p>
            <ul className="space-y-1.5 pt-1 text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'JwtStudio: JWT başlık ve yük çözücü, HMAC-SHA256 canlı imza doğrulama, süre sonu zaman çizelgesi ve token oluşturucu.'
                    : 'JwtStudio: Header/payload decoding, HMAC-SHA256 signature verification, expiry timeline visualizer, and custom token generator.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'CronStudio: Görsel cron ifadesi oluşturucu, Türkçe ve İngilizce insan tarafından okunabilir açıklamalar, sonraki 10 çalışma zamanı çizelgesi.'
                    : 'CronStudio: Visual cron schedule builder, human-readable explanations in Turkish and English, next 10 execution timestamps.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'MermaidStudio: Canlı mimari ve akış diyagramları (Flowcharts, Sequence, ERD), anlık sözdizimi denetimi, SVG ve PNG dışa aktarım.'
                    : 'MermaidStudio: Real-time architectural diagram visualizer (flowcharts, sequence, ERD) with syntax linting and SVG/PNG export.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'EncodingStudio: Base64 / Hex / Data-URL iki yönlü metin ve dosya dönüşüm motoru, Hex dump görüntüleyici.'
                    : 'EncodingStudio: Two-way Base64, Hex, and Data-URL encoder/decoder with multimedia visualizer and Hex dump inspector.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Tüm yeni stüdyolar için %100 TR/EN dil desteği, reaktif arama ve klavye kısayol entegrasyonu.'
                    : '100% key parity across TR/EN localizations, reactive search indexing, and keyboard shortcut integrations.'}
                </span>
              </li>
            </ul>
          </div>

          {/* v2.5.0 - Tauri v2 + Rust Architecture Revolution */}
          <div className="border-l-2 border-purple-400 pl-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-purple-300">
                {isTr
                  ? 'v2.5.0 — Tauri v2 + Rust Mimari Devrimi'
                  : 'v2.5.0 — Tauri v2 + Rust Architecture Revolution'}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[10px]">
                {isTr ? 'MİMARİ DÖNÜŞÜM' : 'MAJOR ARCHITECTURE'}
              </span>
              <span className="text-[10px] text-gray-500">
                {isTr ? '15 Eylül 2026' : 'September 15, 2026'}
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              {isTr
                ? 'Ağır Electron ve Node.js altyapısı tamamen kaldırılarak yüksek performanslı, bellek korumalı Rust arka ucu ve Tauri v2 mimarisine geçildi.'
                : 'Completely replaced heavy Electron and Node.js runtimes with a high-performance, memory-safe Rust backend and Tauri v2 IPC bridge.'}
            </p>
            <ul className="space-y-1.5 pt-1 text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Bellek Tüketimi Devrimi: 450+ MB RAM tüketen Electron yerine yerel WebView2 ile <26 MB RAM ayak izi (%94.2 tasarruf).'
                    : 'RAM Consumption: Slashed memory footprint from 450+ MB (Electron) to <26 MB RAM via Windows native WebView2 (94.2% reduction).'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Ultra Kompakt Yükleyici: Ağır C++ ikilileri ve Chromium paketinden arındırılarak yükleyici boyutu 4.6 MB\'a düşürüldü (%96.2 küçülme).'
                    : 'Ultra-Compact Binary: Eliminated bundled Chromium, reducing the standalone NSIS installer to just 4.6 MB (96.2% smaller).'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Şimşek Hızında Açılış: Soğuk başlatma süresi 3.2 saniyeden 0.35 saniyeye indirildi (%89.1 hızlanma).'
                    : 'Instant Cold Start: Launch latency dropped from 3.2s to 0.35s with zero bootstrap delay (89.1% faster).'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Ağ, port izleme, CyberFortress AES-256-GCM kasa, PDF ve donanım kimliği (machine-uid) işlemleri Rust crate\'leri ile baştan yazıldı.'
                    : 'Rewrote network recon, Port Watchdog, CyberFortress AES-256-GCM vault, PDF engine, and machine-uid HWID compatibility natively in Rust.'}
                </span>
              </li>
            </ul>
          </div>

          {/* v2.4.2 */}
          <div className="border-l-2 border-gray-600 pl-4 space-y-2 opacity-80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-300">
                {isTr ? 'v2.4.2 — Tray Memory Sweep' : 'v2.4.2 — Tray Memory Sweep'}
              </span>
              <span className="text-[10px] text-gray-500">
                {isTr ? '14 Eylül 2026' : 'September 14, 2026'}
              </span>
            </div>
            <ul className="space-y-1.5 text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'Sistem tepsisine (Tray) küçültüldüğünde belleği otomatik boşaltan bellek süpürme mekanizması.'
                    : 'Automated memory sweep engine purging transient session caches upon minimizing to system tray.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'HashStudio büyük dosya işleme bellek taşması (OOM) koruması.'
                    : 'HashStudio out-of-memory (OOM) buffer protection for multi-gigabyte files.'}
                </span>
              </li>
            </ul>
          </div>

          {/* v2.4.1 */}
          <div className="border-l-2 border-gray-700 pl-4 space-y-2 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400">
                {isTr ? 'v2.4.1 — Güvenlik & Kripto Sertifikasyonu' : 'v2.4.1 — Security & Crypto Certification'}
              </span>
              <span className="text-[10px] text-gray-500">
                {isTr ? '10 Eylül 2026' : 'September 10, 2026'}
              </span>
            </div>
            <ul className="space-y-1.5 text-gray-500">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'DoD 5220.22-M 7-pass dosya parçalama motoru (Shredder) eklendi.'
                    : 'DoD 5220.22-M 7-pass cryptographic file shredder added.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                <span>
                  {isTr
                    ? 'NetDispatcher yerel ağ SSRF ve DNS rebinding kalkanı devreye alındı.'
                    : 'NetDispatcher local network SSRF and DNS rebinding shield activated.'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#060812] border-t border-gray-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold font-mono text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg transition"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
