# 🛠️ ZenDev Systematic BugFix & Hardening Master Plan

**Hedef:** ZenDev v2.4.0+ Masaüstü Uygulaması  
**Proje Konumu:** `c:\Users\futbo\Desktop\AI Projeleri\NexusHub`  
**Metodoloji:** AG-Kit /systematic-debugging + /coordinate + 3 Paralel Subagent Denetimi

---

## 🔍 1. Kök Neden Analizi (Root Cause Analysis - 5 Whys)

### Sorun: Güncelleştirme Denetimi GitHub'ta Sürüm Olsa Bile Çalışmıyor / Hata Veriyor
1. **Neden:** `Account.tsx` içindeki "Güncellemeleri Denetle" butonuna tıklandığında "Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor" uyarısı dönüyor.
2. **Neden:** `src/main/updater.ts` dosyasındaki `autoUpdater.checkForUpdates()` çağrısı GitHub'tan 404 Not Found HTTP hatası alıyor.
3. **Neden:** `src/main/updater.ts` içinde `autoUpdater.setFeedURL({ provider: 'github', owner: 'zerviatr', repo: 'ZenDev' })` şeklinde repo adı `'ZenDev'` olarak hardcoded ayarlanmış!
4. **Neden:** GitHub'taki gerçek ve resmi repository adı `https://github.com/zerviatr/NexusHub`! `package.json` içindeki `publish.repo` alanı da `"NexusHub"`!
5. **KÖK NEDEN (ROOT CAUSE):** `setFeedURL` repo adı ile gerçek GitHub repo adı (`NexusHub`) uyuşmuyor; geliştirici modunda doğrudan GitHub REST API fallback'i bulunmuyor; sürüm karşılaştırması `v` önekini temizlemeyen naif string eşitliği (`!==`) ile yapılıyor ve `Account.tsx` hata bloğunda `'v1.0.2'` hardcoded sürümü dönüyor.

---

## 📋 2. Tespit Edilen Diğer Kritik & İkincil Hatalar (Subagent Taraması)

| # | Bileşen / Dosya | Tespit Edilen Bug | Etki & Risk |
|---|----------------|-------------------|-------------|
| 1 | `src/main/updater.ts` | `repo: 'ZenDev'` 404 hatası & GitHub API fallback eksikliği | Güncellemeler asla algılanamıyor. |
| 2 | `src/main/updater.ts` | Naif sürüm karşılaştırması (`updateVersion !== currentVersion`) | `v2.4.0` ile `2.4.0` uyumsuzluğu veya eski sürümleri yeni sayma riski. |
| 3 | `src/renderer/src/pages/Account.tsx` | Satır 128'de `'v1.0.2'` hardcoded fallback | Hata anında kullanıcıya v1.0.2 gibi yanlış sürüm gösterme. |
| 4 | `src/renderer/src/components/MiniHud.tsx` | Satır 44'te `<AnimatePresence>` öncesi `if (!isOpen) return null` erken çıkışı | Mini-HUD kapatılırken framer-motion çıkış animasyonu asla oynamıyor, ani kayboluyor. |
| 5 | `src/main/tray.ts` | Menü tıklamalarında `mainWindow.isMinimized()` kontrolünün eksik olması | Simge durumundaki pencere tray menüsünden tıklandığında restore edilmeyebiliyor. |
| 6 | `src/main/ipc/pdfToolkit.ts` | Boş/hatalı sayfa aralığında veya 0 sayfalık dosyalarda unhandled error | PDF ayırma işlemi çökme veya belirsiz hata üretebiliyor. |

---

## 🛠️ 3. Uygulama ve Düzeltme Planı (Actionable Implementation Plan)

### Aşama 1: `src/main/updater.ts` Tamiratı ve Akıllı GitHub API Fallback Motoru
1. `setFeedURL` ayarını `repo: 'NexusHub'` olarak düzeltmek.
2. `isNewerVersion(remote, current)` semver karşılaştırıcı fonksiyonu eklemek (`v` öneklerini ve önemsiz build eklerini soyup `[major, minor, patch]` sayısal karşılaştırması).
3. `updater:check-now` kanalına **Doğrudan GitHub REST API Fallback** mekanizması entegre etmek:
   - `https://api.github.com/repos/zerviatr/NexusHub/releases/latest` endpoint'ine `fetch` ile istek atmak.
   - En son sürüm etiketini (`tag_name`), sürüm notlarını (`body`) ve `assets` (örn: `ZenDev-Setup-2.4.0.exe` doğrudan indirme URL'si) bilgilerini çekmek.
   - Böylece hem dev modunda (`!app.isPackaged`) hem de `latest.yml` gecikmelerinde kullanıcıya **%100 garantili** güncel sürüm durumu sunmak.
4. `updater:install-now` çağrısındaki gereksiz PowerShell watchdog riskini kaldırıp temiz ve güvenli NSIS güncelleme akışını devreye almak.

### Aşama 2: `src/renderer/src/pages/Account.tsx` UI & Hata Giderme
1. Hata durumundaki `'v1.0.2'` hardcoded değerini kaldırıp dinamik `res?.currentVersion || 'v2.4.0'` ile değiştirmek.
2. Güncelleme bulunduğunda (`res.hasUpdate === true`) kullanıcıya:
   - İndirme ilerleme çubuğu
   - "Otomatik Yükle & Yeniden Başlat"
   - "GitHub'tan Doğrudan İndir (.exe)" harici bağlantı butonu sunmak.

### Aşama 3: `src/renderer/src/components/MiniHud.tsx` Animasyon Düzeltmesi
1. `if (!isOpen) return null` erken dönüşünü kaldırıp JSX içerisine `<AnimatePresence>{isOpen && (...) }</AnimatePresence>` standardına uygun yerleştirmek.

### Aşama 4: `src/main/tray.ts` ve IPC İyileştirmesi
1. Tüm menü tıklamalarına `if (mainWindow.isMinimized()) mainWindow.restore()` zırhı eklemek.
2. `mainWindow.webContents.send('app:visibility-change', true)` yayınını garantiye almak.

---

## 🧪 4. Doğrulama ve Test Adımları
1. **TypeScript Derleme:** `npx tsc --noEmit`
2. **Vitest Test Paketi:** `npm test -- --run`
3. **Canlı GitHub API & Sürüm Testi:** Node.js ile hem `autoUpdater` hem de GitHub Releases API fallback'inin `v2.4.0` çıktısını doğrulayan simülasyon script'i.
4. **Electron-Vite Derlemesi:** `npx electron-vite build`
5. **Git Commit & Push:** `fix(updater): point to NexusHub repo, add GitHub API fallback, fix semver comparison and MiniHud animation`
