# 💻 ZENDEV MASAÜSTÜ UYGULAMASI DEVASA KUSURSUZLAŞTIRMA VE MÜHENDİSLİK PLANI

> **Motto:** "Elevate ZenDev to Raycast, DevUtils & TablePlus Enterprise Quality"  
> **Denetlenen Alanlar:** `src/main`, `src/renderer`, `src/preload`, `src/shared`, `package.json`, `tests/`  
> **Denetim Kurulu:** AG-Kit Specialist Subagents (`Desktop UI/UX & Tool Completeness`, `Electron Main Process & IPC Security`, `Performance, Packaging & QA`)

---

## 📊 1. ÖZET DENETİM KARNESİ (AUDIT SCORECARD)

| Kategori | Mevcut Skor | Tespit Edilen Kritik Sorun | Kusursuzlaştırma Hedefi |
|---|---|---|---|
| **Paketleme & ASAR Boyutu** | ⚠️ **40 / 100** | `app.asar` 106 MB (frontend kütüphaneleri `dependencies` altında unutulmuş). | **98 / 100** (`app.asar` ~4 MB'a indirilecek, %96 tasarruf) |
| **Native Modüller & Uyum** | ⚠️ **50 / 100** | Windows ARM64 paketine x64 Sharp DLL'leri kopyalandığı için çökme (`ERR_DLOPEN_FAILED`) riski. | **100 / 100** (Kusursuz x64 hedefi, sıfır DLL çökmesi) |
| **IPC Güvenliği & Stabilite** | ⚠️ **55 / 100** | Destructuring çökmeleri, `port:killProcess` ile kendi kendini öldürebilme riski, unhandled promise rejections. | **100 / 100** (Güvenli wrapper, PID koruması, try/catch kalkanı) |
| **Arka Plan & Bellek Tüketimi** | ⚠️ **60 / 100** | Tepsiye küçültüldüğünde 1.5s ResourceSentinel ve 5s TempMail döngüleri durmuyor. Sahte PowerShell RAM temizleyici. | **95 / 100** (Pencere gizlenince uyku modu `visibilitychange`, gerçek RAM optimizasyonu) |
| **UI/UX & Geri Bildirim** | ⚠️ **65 / 100** | `HashStudio` ve `QrCodeStudio` kopyalamada sıfır ses/toast veriyor. 1000x700 pencerede sekme taşmaları. | **95 / 100** (Evrensel ses/toast standardı, flex-wrap responsive barlar) |
| **Çoklu Dil (i18n)** | ⚠️ **50 / 100** | 12 araçta `useT()` eksik. Dashboard kartlarının yarısı İngilizce modda Türkçe kalıyor. | **90 / 100** (Tüm araçlara dil desteği entegrasyonu) |

---

## 🚨 2. ANINDA GİDERİLMESİ GEREKEN EN KRİTİK 6 MÜHENDİSLİK HATASI (P0 BLOCKERS)

1. **Korkunç ASAR Şişkinliği (106.9 MB -> ~4 MB):**
   - *Hata:* `package.json` içerisinde `react`, `react-dom`, `framer-motion`, `lucide-react`, `sql.js`, `@types/*` kütüphaneleri `dependencies` altında tanımlanmış. Vite bunları zaten `out/renderer` içine derlediği için electron-builder 103 MB ham `node_modules` klasörünü gereksiz yere `app.asar` içine gömüyor.
   - *Çözüm:* Frontend bağımlılıkları `devDependencies` altına taşınacak, ASAR boyutu 106 MB'tan **~4 MB'a** indirilecek, açılış disk I/O süresi %80 kısalacak.
2. **Windows ARM64 DLL Çökmesi Önleme:**
   - *Hata:* x64 host derleme makinesinde `win.target` altında `arm64` seçildiğinde x64 Sharp DLL'leri kopyalanıyor ve ARM64 cihazlarda çöküyor.
   - *Çözüm:* Windows derleme hedefi temiz bir şekilde `x64` mimarisine sabitlenecek.
3. **IPC Destructuring ve Parametre Çökmeleri:**
   - *Hata:* `cyberFortressIPC.ts` (`fortress:encryptFile`), `pdfToolkit.ts` (`pdf:merge`, `pdf:split`), `imageToolkit.ts` (`image:process`) kanallarında parametreler denetimsiz destructure ediliyor; boş payload geldiğinde IPC unhandled rejection ile asılı kalıyor.
   - *Çözüm:* Tüm kanallara tip ve varlık doğrulayıcı koruma blokları (`try/catch` ve fallback) eklenecek.
4. **`port:killProcess` Güvenlik Zafiyeti:**
   - *Hata:* Yalnızca `pid <= 4` kontrol ediliyor. Yanlışlıkla ZenDev'in kendi PID'si (`process.pid`) veya Windows explorer/lsass PID'si öldürülebilir; ayrıca string `taskkill` çağrısı enjeksiyon riski barındırıyor.
   - *Çözüm:* `process.pid` ve kritik sistem PID'leri kilitlenecek, `execFileAsync('taskkill', ['/PID', pid, '/F'])` ile parametrik çağrı yapılacak.
5. **Tepside Zombi Polling ve Sahte PowerShell RAM Temizleyici:**
   - *Hata:* Pencere tepsiye küçültüldüğünde 1.5 saniyelik CPU kilitleyen `os.cpus()` döngüsü durmuyor. Ayrıca `sentinelIPC.ts` içinde çalıştırılan PowerShell GC komutu yalnızca PowerShell'in kendi belleğini topluyor, Electron'a faydası yok.
   - *Çözüm:* Main process'ten `app:visibility-change` IPC sinyali ile pencere gizliyken polling durdurulacak; sahte PowerShell çağrısı temizlenecek.
6. **Sessiz ve Bildirimsiz Kalan Araçlar (Feedback Void):**
   - *Hata:* `HashStudio` ve `QrCodeStudio` kopyalama ve üretimde ekrana toast çıkarmaz, ses çalmaz.
   - *Çözüm:* `cyberAudio.copySuccess()` ve `showToastSuccess()` evrensel standardı entegre edilecek.

---

## 🛠️ 3. DÖRT AŞAMALI DEVASA UYGULAMA PLANI (EXECUTION PHASES)

### FAZ 1: Paketleme, ASAR Diyet ve Native Kararlılık (Hemen)
- [x] `package.json` bağımlılıklarını ayrıştır (`react`, `framer-motion`, `lucide-react`, `sql.js` -> `devDependencies`).
- [x] `win.target` yapılandırmasını x64 olarak sabitle, ARM64 DLL çakışmasını engelle.
- [x] `app.asar` boyutunu 106 MB'tan ~4 MB'a düşür.

### FAZ 2: IPC Sertleştirmesi, Güvenlik ve Uyku Modu (Sleep/Resume)
- [x] `src/main/ipc/cyberFortressIPC.ts`, `pdfToolkit.ts` ve `imageToolkit.ts` destructuring açıklarını kapat.
- [x] `src/main/ipc/portWatchdog.ts` içine `process.pid` koruması ve `execFileAsync` entegre et.
- [x] `src/main/ipc/sentinelIPC.ts` içindeki sahte PowerShell GC kodunu temizle.
- [x] `src/main/index.ts` içine pencere `hide` / `show` anlarında `app:visibility-change` yayıncısı ekle.

### FAZ 3: UI/UX Haptik/Ses Standardı & Responsive Esneklik
- [x] `HashStudio.tsx` ve `QrCodeStudio.tsx` için ses ve toast geri bildirimlerini bağla.
- [x] `ColorStudio.tsx` ve `DevSandbox.tsx` sekme barlarına `flex-wrap` ekleyerek 1000x700 pencerede taşmayı yok et.
- [x] `ImageToolkit.tsx` karşılaştırma modalına gerçek görsel önizleme tuvali ekle.

### FAZ 4: Çoklu Dil (i18n) Genişletmesi & Test Kapsamı
- [x] `Dashboard.tsx` araç kartlarının açıklamalarını dil anahtarlarına bağla.
- [x] Eksik araçlar için `locales/tr.json` ve `locales/en.json` çeviri sözlüklerini zenginleştir.
- [x] Vitest test paketine `PortKiller` ve `SystemOptimizer` güvenlik testlerini ekle.
