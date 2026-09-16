# 🚀 ZenDev: Electron'dan Tauri'ye (Rust) Kusursuz Geçiş Master Planı

Bu belge, ZenDev (NexusHub) projesinin Electron altyapısından Tauri v2 (Rust) altyapısına kusursuz bir şekilde göç (migration) ettirilmesi için hazırlanmış devasa ve yapılandırılmış ana plandır.

## 1. Mimari ve Dizin Stratejisi
Geçişin temel felsefesi: **Frontend (React + Vite + Tailwind) koduna neredeyse hiç dokunmadan, tüm arka uç ve IPC (Inter-Process Communication) katmanını Rust'a taşımak.**

- **Kaldırılacaklar:** `electron`, `electron-builder`, `electron-vite`, `electron-updater` ve Node.js backend bağımlılıkları.
- **Eklenecekler:** `@tauri-apps/api`, `@tauri-apps/cli` ve Tauri eklentileri (plugins).
- **Dizin Değişiklikleri:**
  - `src/main/` ve `src/preload/` dizinleri tamamen silinerek yerine `src-tauri/` (Cargo/Rust altyapısı) inşa edilecektir.
  - `src/renderer/` dizini korunacaktır. `electron.vite.config.ts` iptal edilip, sadece renderer'ı hedef alan standart bir `vite.config.ts` kullanılacaktır.

## 2. Kapsamlı Bağımlılık (Dependency) Haritası
| ZenDev Electron (Node.js) | Tauri (Rust Crate / Plugin) | Kritik Notlar |
| :--- | :--- | :--- |
| `axios` / `cheerio` | `reqwest` + `scraper` | TempMail, Link Bypasser, API Dispatcher (Net) araçları için kullanılacaktır. |
| `sharp` | `image` + `imageops` | Image Toolkit modülü native olarak çalışacaktır. |
| `pdf-lib` | `lopdf` | Mevcut PDF birleştirme ve virgüllü/tireli sayfa ayırma özelliği `lopdf` nesne tabanlı manipülasyon ile native hızda yapılacaktır. |
| `sql.js` (WASM) | **Değişiklik Yok** | Kütüphane sadece frontend'de (`sqliteEngine.ts`) in-memory çalıştığı için arka plana taşınmayacaktır. |
| `node-machine-id` | `machine-uid` | **Kritik:** Lisans kilitleri için donanım parmak izi okuyucusu. Rust tarafı Node.js ile byte-for-byte aynı hash'i üretmelidir. |
| `crypto` (AES-256) | `aes-gcm`, `rand` | Cyber Fortress Dosya Şifreleme (Zero-copy stream buffer ile sıfır RAM sızıntısı). |
| `electron-updater` | `tauri-plugin-updater` | Otomatik güncelleme mekanizması. |
| System Diagnostics | `sysinfo`, `trust-dns-resolver`| Sentinel, Port Watchdog, Net Dispatcher, Ping işlemleri işletim sistemi seviyesine inecektir. |

## 3. Preload (nexusAPI) ve IPC Dönüşümü
Mevcut `src/preload/index.ts` yapısı kırılarak, Frontend'in Electron ortamından koptuğunu anlamaması için `src/renderer/src/lib/ipc.ts` adında bir köprü (bridge) dosyası oluşturulacaktır. Bu dosya `@tauri-apps/api/core` invoke komutlarını mevcut `window.nexusAPI` formatına bağlayacaktır.

## 4. Modül Bazlı Rust Geliştirme Planı
*   **PDF Toolkit:** Ağır buffer limitlerine takılmamak adına `@tauri-apps/plugin-dialog` ile dosya yolları Rust backend'ine aktarılıp `lopdf` ile işlenecektir.
*   **Cyber Fortress (Shredder & GCM):** Dosyalar diske stream halinde yazılacaktır (Chunking). Shredder, DoD 5220.22-M standartlarına uygun olarak `std::fs::OpenOptions` ile 7 pass overwrite yapacaktır.
*   **System Optimizer:** Node.js V8 `global.gc()` komutları iptal edilecek, zira Rust bellek güvenliği (ownership) sayesinde Garbage Collector'a ihtiyaç duymaz.
*   **Activity Journal:** `activityJournal.ts` append-only yapısı, Rust `std::fs::File` lock ve `sha2` crate ile zincirlenecektir.
*   **Ağ & Port Taraması:** Tüm ağ sorguları `tokio` asenkron iş parçacıklarıyla `std::net::TcpStream` üzerinden sıfır milisaniye gecikmeyle (native socket) donanıma indirgenecektir.

## 5. Kritik Riskler ve Mitigation (Azaltma) Stratejileri
1. **Lisans Sistemi Çökme Riski:** Rust'ın okuyacağı MAC adresi / UUID string'inde oluşacak tek bir boşluk (whitespace) veya \n farkı, mevcut kullanıcıların lisans HMAC hash'lerini bozacaktır. Rust tarafı Node.js çıktısını birebir taklit etmek üzere agresif testlerden geçirilmelidir.
2. **Sharp vs ImageOps Format Çıktıları:** Rust `image` crate'ine geçildiğinde ICC renk profili farklılıkları oluşabilir, manuel optimizasyon gerekecektir.
3. **Tray (Sistem Çekmecesi) Event Loop'u:** Tauri v2'de Tray menüsü tamamen Rust'ta yaşar. React ile senkronizasyon için özel bir PubSub event listener mekanizması kurulmalıdır.

## 6. Göç (Migration) Yol Haritası
- **Aşama 1 (İskelet):** Node bağımlılıklarının kaldırılması, `cargo tauri init`.
- **Aşama 2 (Köprü):** `window.nexusAPI` mock köprüsünün Tauri'ye bağlanması.
- **Aşama 3 (Arka Plan Çevirisi):** Core sistemlerin ve modüllerin (Fortress, PDF, TempMail) Rust asenkron mimarisine kodlanması.
- **Aşama 4 (İşletim Sistemi):** Tray, Global Shortcuts ve Updater kurulumu.
- **Aşama 5 (CI/CD):** GitHub Actions yml dosyasının `cargo tauri build` ile değiştirilmesi.
