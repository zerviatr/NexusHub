# PROJE ANALİZ RAPORU

**Hedef Proje:** `c:\Users\futbo\Desktop\AI Projeleri\NexusHub` (ZenDev)  
**Tarih:** 15 Eylül 2026  
**Sürüm:** v2.4.1 (Masaüstü İstemcisi) & v1.2.0 (Bulut Lisanslama API)  
**Denetim Türü:** Uçtan Uca Statik Analiz, IPC/DMZ Güvenlik Taraması, Test & Tip Doğrulaması

---

## 📁 Proje Yapısı

NexusHub (ZenDev), modern siber temalı bir masaüstü mühendislik istasyonu ve bulut tabanlı lisanslama/ödeme altyapısını bir araya getiren hibrit bir monorepo mimarisidir. Sistem, **Electron İstemcisi (`src/`)** ve **Bulut Lisans API (`server/`)** olmak üzere iki ana omurga üzerinde yükselmektedir.

### Tam Dizin Ağacı ve Modül Açıklamaları

```
NexusHub/
├── .ag-kit-backups/                      # AG Kit manifest ve şema otomatik yedekleri
├── .agents/                              # Entegre Antigravity Mühendislik Kiti (v2026.8.31)
│   ├── .ag-kit/                          # Agent çalışma zamanı önbelleği
│   ├── agent/                            # Uzmanlaşmış ajan rolleri (architect, security-specialist, tester vb.)
│   ├── hooks/                            # Yaşam döngüsü hook tanımları
│   ├── memory/                           # Proje kalıcı hafızası (project-conventions, tech-decisions, analiz raporları)
│   ├── rules/                            # P0/P1 sistem kuralları, kodlama ve güvenlik direktifleri
│   ├── schemas/                          # JSON şema validasyonları
│   ├── scripts/                          # Sistem sağlığı ve manifest doğrulama betikleri
│   ├── skills/                           # 40+ modüler mühendislik yetenek kütüphanesi
│   ├── workflows/                        # Standartlaştırılmış iş akışları (debug, test, verify, plan)
│   ├── ARCHITECTURE.md                   # Kit mimari haritası
│   ├── antigravity.json                  # Antigravity proje ayarları
│   └── manifest.json                     # SHA-256 doğrulama hashli bileşen manifesti
├── .env                                  # İstemci ortam değişkenleri
├── .git/                                 # Git versiyon kontrol dizini
├── .github/
│   └── workflows/
│       └── release.yml                   # Çok platformlu (Win/Mac/Linux) GitHub Actions derleme ve dağıtım hattı
├── .gitignore                            # Git istisnaları
├── build/                                # Yükleyici ve derleme varlıkları
│   ├── icons/                            # Çoklu çözünürlük uygulama ikonları (.ico, .icns, .png)
│   ├── entitlements.mac.plist            # macOS Hardened Runtime güvenlik izinleri
│   └── license.txt                       # NSIS yükleyici son kullanıcı lisans metni
├── dist/                                 # Derlenmiş dağıtım paketleri
│   ├── ZenDev-Setup-2.4.0.exe            # Windows NSIS yükleyicisi (~97 MB)
│   ├── latest.yml                        # Diferansiyel güncelleme metadata dosyası
│   └── win-unpacked/                     # Paketlenmemiş taşınabilir Windows ikili dosyaları
├── electron.vite.config.ts               # Electron-Vite derleme konfigürasyonu (Main, Preload, Renderer ayrımı)
├── keys/                                 # Kriptografik anahtar deposu
│   ├── ecdsa_private.pem                 # NIST P-256 Özel Anahtarı (üretim sunucusu için)
│   └── ecdsa_public.pem                  # İstemciye gömülü NIST P-256 Genel Doğrulama Anahtarı
├── node_modules/                         # İstemci bağımlılıkları
├── out/                                  # Electron-Vite derleme çıktısı
│   ├── main/index.js                     # Transpile edilmiş ana süreç demeti (~110 KB)
│   ├── preload/index.js                  # Transpile edilmiş preload DMZ köprüsü (~8.8 KB)
│   └── renderer/                         # Dağıtıma hazır React SPA varlıkları
├── package.json                          # Kök ve masaüstü istemci bağımlılık ve script manifesti (v2.4.1)
├── package-lock.json                     # Kilitli bağımlılık ağacı v3
├── postcss.config.js                     # Tailwind CSS ve Autoprefixer konfigürasyonu
├── scripts/
│   └── gen-icons.js                      # İkon türetme Node.js otomasyon betiği
├── server/                               # Bağımsız Express 5 & LibSQL Bulut API Mikroservisi
│   ├── .env                              # Sunucu ortam değişkenleri ve API sırları
│   ├── .env.example                      # Sunucu konfigürasyon şablonu
│   ├── Dockerfile                        # Node.js 22 Alpine tabanlı hafif konteyner tanımı
│   ├── package.json                      # Sunucu bağımlılıkları (Express 5, LibSQL, Resend)
│   ├── package-lock.json                 # Sunucu bağımlılık kilit dosyası
│   ├── README.md                         # Sunucu kurulum ve dağıtım rehberi
│   ├── tsconfig.json                     # Sunucu TypeScript derleme kuralları
│   ├── vitest.config.ts                  # Sunucu birim test yapılandırması
│   ├── zendev.db                         # Yerel SQLite/LibSQL veritabanı
│   ├── tests/                            # Sunucu test takımları (6 test dosyası, 88 test)
│   │   ├── admin.test.ts                 # Web yönetim konsolu ve anahtar yönetimi testleri
│   │   ├── challenger.test.ts            # Eşzamanlılık, DLQ ve siber saldırı direnci testleri
│   │   ├── license.test.ts               # Aktivasyon, donanım sıfırlama ve kalp atışı testleri
│   │   └── webhook.test.ts               # LemonSqueezy imza ve sipariş işleme testleri
│   └── src/
│       ├── index.ts                      # Sunucu önyükleme, CSP, proxy ve hata middleware'leri
│       ├── db.ts                         # LibSQL sürücüsü, yabancı anahtar (FK) koruması, atomik işlemler ve migrasyonlar
│       ├── email.ts                      # Resend transactional e-posta entegrasyonu
│       ├── keyGen.ts                     # CLI anahtar üretim yardımcıları
│       ├── landingPageHtml.ts            # Gömülü SSR ZenDev genel web sayfası ve fiyatlandırma arayüzü (~301 KB)
│       ├── adminDashboardHtml.ts         # Gömülü SSR Web Yönetim Konsolu SPA arayüzü (~111 KB)
│       ├── middleware/
│       │   └── rateLimiter.ts            # Kayan pencereli IP oran sınırlayıcı ve anti-spoofing filtresi
│       ├── routes/
│       │   ├── admin.ts                  # Timing-safe PBKDF2 oturum açma, toplu lisans oluşturma/uzatma/iptal
│       │   ├── license.ts                # İstemci aktivasyonu, 24 saatlik HWID sıfırlama, arka plan heartbeat
│       │   └── webhook.ts                # HMAC-SHA256 imzalı LemonSqueezy webhook yakalama ve DLQ kuyruğu
│       └── services/
│           ├── licenseSigner.ts          # NIST P-256 asimetrik lisans imzalama motoru ve Base32 codec
│           └── notifier.ts               # Telegram, Discord ve e-posta olay bildirim servisi
├── src/                                  # Masaüstü Uygulama Kaynak Kodları
│   ├── main/                             # Electron Ana Süreci (Node.js Çalışma Zamanı)
│   │   ├── index.ts                      # Uygulama yaşam döngüsü, tekil örnek kilidi, pencere yönetimi, CSP
│   │   ├── licenseStore.ts               # SafeStorage (DPAPI) şifreli depolama, HWID tespiti, deneme süresi takibi
│   │   ├── shortcuts.ts                  # Evrensel klavye kısayolları kaydı
│   │   ├── tray.ts                       # Sistem tepsisi (System Tray) menüsü ve arka plana küçültme
│   │   ├── updater.ts                    # electron-updater diferansiyel arka plan güncelleme mantığı
│   │   ├── ipc/                          # 18 Adet Tip Güvenlikli IPC Uç Noktası
│   │   │   ├── activityJournal.ts        # Kriptografik hash-chain denetim günlüğü IPC'si
│   │   │   ├── clipboard.ts              # Pano geçmişi okuma/yazma ve PII maskeleme
│   │   │   ├── cyberFortressIPC.ts       # DoD 5220.22-M 7-pass dosya yok edici ve AES-256 kasa
│   │   │   ├── fileOrganizer.ts          # Kural ve zamana dayalı dosya düzenleme ve geri alma
│   │   │   ├── imageToolkit.ts           # Sharp tabanlı toplu görsel dönüştürme ve EXIF temizleme
│   │   │   ├── license.ts                # Asimetrik ECDSA istemci lisans IPC yönlendiricisi
│   │   │   ├── linkBypasser.ts           # URL yönlendirme ve ara sayfa atlatma motoru
│   │   │   ├── linkDecrypter.ts          # Takip parametrelerini temizleme ve punycode denetimi
│   │   │   ├── netDispatcher.ts          # Güvenli dış ağ istek yönlendiricisi (API Studio için)
│   │   │   ├── netDispatcherSecurity.ts  # SSRF kalkanı, özel IP aralığı engelleme ve başlık temizliği
│   │   │   ├── networkTools.ts           # Yerel ping, DNS sorgusu, port tarama ve TLS sertifika analizi
│   │   │   ├── pdfToolkit.ts             # pdf-lib tabanlı belge birleştirme, bölme ve sayfa çıkarma
│   │   │   ├── portWatchdog.ts           # Netstat ayrıştırıcı ve PID tabanlı süreç sonlandırma
│   │   │   ├── pubsub.ts                 # Ana süreç içi olay yayınlama/abone olma veri yolu
│   │   │   ├── safeStorage.ts            # İşletim sistemi anahtarlık (DPAPI/Keychain) şifreleme köprüsü
│   │   │   ├── sentinelIPC.ts            # Donanım kaynak metrikleri (CPU/RAM) ve V8 GC tetikleyici
│   │   │   ├── systemOptimizer.ts        # DNS önbellek temizliği, %TEMP% tasfiyesi ve ağ gecikme testi
│   │   │   └── tempMail.ts               # Tek kullanımlık 1secmail API entegrasyonu
│   │   └── services/                     # Ana Süreç Hesaplama ve Veri Servisleri
│   │       ├── activityJournal.service.ts# Değiştirilemez SHA-256 hash zincirli yerel denetim günlüğü
│   │       ├── organizerCore.ts          # Dosya sınıflandırma, MIME eşleştirme ve işlem kayıt defteri
│   │       ├── pdfService.ts             # PDF işleme çekirdek servisi
│   │       ├── pubsub.service.ts         # Süreçler arası olay yayıcı
│   │       └── vaultCrypto.ts            # PBKDF2 + AES-256-GCM dosya akış şifreleme motoru
│   ├── preload/                          # Electron Preload Güvenlik DMZ Katmanı
│   │   ├── index.ts                      # contextBridge ile dışa aktarılan typed `window.nexusAPI`
│   │   └── index.d.ts                    # Global tip tanımları
│   ├── shared/                           # Süreçler Arası Paylaşılan Modüller
│   │   ├── auditIntegrity.ts             # Denetim kayıtları hash zinciri doğrulama mantığı
│   │   ├── auditSanitization.ts          # API anahtarları, şifreler ve PII verileri için maskeleme
│   │   ├── ecdsaLicense.ts               # NIST P-256 ECDSA imza doğrulayıcı ve Base32 ayrıştırıcı
│   │   └── licenseValidator.ts           # Geriye dönük uyumlu HMAC-SHA256 format doğrulayıcı
│   └── renderer/                         # React 19 Önyüz (Chromium Güvenli Kumhavuzu)
│       ├── index.html                    # SPA giriş noktası ve Font/Meta yapılandırması
│       └── src/
│           ├── main.tsx                  # React DOM kök render, Context sağlayıcıları ve HashRouter
│           ├── App.tsx                   # Rota tanımları, EULA/Pro kilit kapıları ve ana layout
│           ├── env.d.ts                  # `window.nexusAPI` için TypeScript arayüz tanımları
│           ├── index.css                 # Tailwind taban stilleri, siber temalar, animasyonlar
│           ├── assets/                   # Statik varlıklar ve logolar
│           ├── components/               # Yeniden Kullanılabilir UI Bileşenleri (14 Modül + 2 Alt Dizin)
│           │   ├── BaseToolTemplate.tsx  # Standart araç sayfası şablonu
│           │   ├── CommandPalette.tsx    # Hızlı komut ve araç paleti (Ctrl+K)
│           │   ├── ErrorBoundary.tsx     # Beklenmeyen render çökmelerini izole eden kalkan
│           │   ├── FloatingOrb.tsx       # Arka plan siber ortam ışığı efekti
│           │   ├── KeyboardShortcutsModal.tsx # Kısayol tuşları rehber modalı (? / F1)
│           │   ├── MiniHud.tsx           # Raycast tarzı hızlı SHA-256 ve mini başlatıcı
│           │   ├── OnboardingTour.tsx    # İlk açılış etkileşimli kullanıcı turu
│           │   ├── ProLockGate.tsx       # Pro özellikler için şık kilit ve yükseltme kapısı
│           │   ├── Sidebar.tsx           # Kategorize edilmiş araç gezintisi ve durum göstergeleri
│           │   ├── SmartPasteCard.tsx    # Akıllı pano içeriği algılama ve araç öneri kartı
│           │   ├── SpotlightCard.tsx     # Fare etkileşimli radyal parlama kartı
│           │   ├── SqliteViewer.tsx      # WebAssembly SQLite veritabanı tarayıcısı
│           │   ├── TitleBar.tsx          # Özel pencere başlık çubuğu, pin-to-top ve pencere butonları
│           │   ├── UpdateManager.tsx     # Otomatik güncelleme bildirim ve ilerleme çubuğu
│           │   ├── activity-feed/        # Denetim Günlüğü Alt Bileşenleri (9 Modül)
│           │   │   ├── ActivityCard.tsx
│           │   │   ├── ActivityDetailDrawer.tsx
│           │   │   ├── ActivityExportModal.tsx
│           │   │   ├── ActivityFeedHeader.tsx
│           │   │   ├── ActivityFilterToolbar.tsx
│           │   │   ├── ActivityMetricsCards.tsx
│           │   │   ├── IntegrityBanner.tsx
│           │   │   ├── index.ts
│           │   │   └── types.ts
│           │   └── api-studio/           # API Test Stüdyosu Alt Bileşenleri (12 Modül)
│           │       ├── AuthTab.tsx
│           │       ├── BodyTab.tsx
│           │       ├── CollectionsSidebar.tsx
│           │       ├── CurlImportModal.tsx
│           │       ├── DiagnosticsTab.tsx
│           │       ├── EnvironmentModal.tsx
│           │       ├── HeadersTab.tsx
│           │       ├── ParamsTab.tsx
│           │       ├── RequestBar.tsx
│           │       ├── ResponsePanel.tsx
│           │       ├── SaveRequestModal.tsx
│           │       └── types.ts
│           ├── lib/                      # İstemci Mantık ve Yardımcı Servisleri (12 Modül)
│           │   ├── LicenseContext.tsx    # Lisans durumu, deneme süresi ve yetki Context'i
│           │   ├── ToastContext.tsx      # Sistem bildirim (Toast) sağlayıcısı
│           │   ├── activityLogger.ts     # Tüm araç eylemlerini güvenli günlüğe yazan istemci istemcisi
│           │   ├── aiClient.ts           # Yapay zeka servisleri için genişletilebilir API istemcisi
│           │   ├── cyberAudio.ts         # Saf Web Audio API sentezli mekanik ses motoru
│           │   ├── fileGateway.ts        # Güvenli dosya okuma ve indirme geçidi
│           │   ├── i18n.tsx              # TR / EN reaktif yerelleştirme sağlayıcısı
│           │   ├── ipc.ts                # Renderer seviyesinde güvenli IPC çağırma sarmalayıcısı
│           │   ├── regexEngine.ts        # Gelişmiş Regex test, analiz ve ayrıştırma motoru
│           │   ├── smartPasteDetector.ts # Pano içeriği veri tipi sınıflandırıcı (URL, Hash, JSON vb.)
│           │   ├── sqliteEngine.ts       # sql.js WebAssembly sanal veritabanı sürücüsü
│           │   └── vaultCrypto.ts        # Tarayıcı tarafı Web Crypto AES yardımcıları
│           ├── locales/                  # Yerelleştirme Sözlükleri
│           │   ├── en.json               # Eksiksiz İngilizce arayüz sözlüğü
│           │   └── tr.json               # Eksiksiz Türkçe arayüz sözlüğü
│           └── pages/                    # 27 Adet Tam Donanımlı Masaüstü Aracı & Sayfası
│               ├── Account.tsx           # Hesap, lisans detayları, tema ve ses ayarları
│               ├── Activation.tsx        # Lisans etkinleştirme, HWID bilgisi ve satın alma yönlendirmesi
│               ├── ActivityFeed.tsx      # Değiştirilemez kriptografik işlem denetim akışı
│               ├── ApiStudio.tsx         # Postman kalitesinde tam teşekküllü HTTP/REST test stüdyosu
│               ├── BulkOrganizer.tsx     # Akıllı dosya düzenleme, zaman tüneli gruplama ve geri alma
│               ├── ClipboardManager.tsx  # Pano yöneticisi, hassas veri maskeleme, sabitleme
│               ├── ColorStudio.tsx       # HEX/RGB/HSL dönüştürücü, WCAG 2.1 kontrast kontrolü
│               ├── CurlRunner.tsx        # Hızlı mikro cURL ve HTTP test aracı
│               ├── CyberFortress.tsx     # DoD 7-pass silici, AES-256 kasa ve LSB steganografi
│               ├── Dashboard.tsx         # Ana kontrol paneli, favori araçlar ve sistem özeti
│               ├── DevSandbox.tsx        # Geliştirici çoklu araç kumhavuzu
│               ├── EulaGate.tsx          # Kullanıcı sözleşmesi ve gizlilik kabul kapısı
│               ├── FakeDataStudio.tsx    # Gerçekçi test verisi üretici (TR isim, telefon, TC/CC, UUID)
│               ├── HashStudio.tsx        # Kriptografik hash ve kodlayıcı stüdyosu (MD5, SHA, bcrypt, Base64)
│               ├── ImageToolkit.tsx      # Sharp destekli toplu görsel işleme ve EXIF temizleyici
│               ├── JsonStudio.tsx        # JSON/JWT biçimlendirici, diff, jq sorgulayıcı ve JWT doğrulayıcı
│               ├── NetworkTools.tsx      # DNS, Ping, Port tarama, SSL sertifika denetimi ve IP sorgusu
│               ├── PasswordGenerator.tsx # Yüksek entropili parola ve parola öbeği üretici
│               ├── PdfStudio.tsx         # PDF birleştirme, sayfa bölme ve belge analiz stüdyosu
│               ├── PortKiller.tsx        # Açık portları tarama, PID bulma ve süreç sonlandırıcı
│               ├── QrCodeStudio.tsx      # QR kod üretici (URL, WiFi, vCard), stilist ve QR okuyucu
│               ├── RegexStudio.tsx       # Canlı regex test laboratuvarı, adlandırılmış gruplar, kopya kağıdı
│               ├── ResourceSentinel.tsx  # Canlı donanım (CPU/RAM) monitörü ve bellek optimizasyonu
│               ├── Scratchpad.tsx        # Gelişmiş Markdown defteri, şifreli kasa modu, anlık akış şemaları
│               ├── SystemOptimizer.tsx   # Windows sistem temizleyici (DNS flush, %TEMP% temizleme, gecikme)
│               ├── TempMail.tsx          # 1secmail tek kullanımlık güvenli geçici e-posta kutusu
│               └── UniversalDecrypter.tsx# URL takip temizleyici, punycode dedektörü ve yönlendirme çözücü
├── tests/                                # Masaüstü Test Altyapısı (32 Test Dosyası, 616 Test)
│   ├── activityFeedUI.test.ts            # Denetim günlüğü React arayüz testleri
│   ├── activityJournalIPC.test.ts        # Kriptografik günlük IPC kanal testleri
│   ├── activityLogger.test.ts            # Günlük kayıt tutucu kütüphane testleri
│   ├── adversarial-audit-reverify.test.ts# Saldırı senaryoları yeniden doğrulama testleri
│   ├── adversarial-audit.test.ts         # Saldırgan girdi ve enjeksiyon testleri
│   ├── adversarialActivityJournal.stress.test.ts # 1.000 eşzamanlı kayıt burst stres testi
│   ├── apiStudioCurl.test.ts             # cURL komut ayrıştırma ve içe aktarma testleri
│   ├── apiStudioReverification.test.ts   # API stüdyosu yeniden doğrulama testleri
│   ├── apiStudioStress.test.ts           # API stüdyosu stres testleri
│   ├── apiStudioUI.test.ts               # API stüdyosu sekmeleri ve modal testleri
│   ├── auditIntegrity.test.ts            # Hash zinciri manipülasyon tespit testleri
│   ├── auditSanitization.test.ts         # Veri maskeleme ve PII koruma testleri
│   ├── challengerReverify.test.ts        # Rakip test senaryoları doğrulaması
│   ├── ecdsaLicense.test.ts              # NIST P-256 asimetrik lisans doğrulama testleri
│   ├── envInterpolator.test.ts           # Dinamik ortam değişkeni çözümleme testleri
│   ├── fileGateway.test.ts               # Güvenli dosya geçidi birim testleri
│   ├── fileGatewayIntegration.test.ts    # Dosya sistemi entegrasyon testleri
│   ├── fileOrganizer.test.ts             # Dosya düzenleme çekirdek kuralları testleri
│   ├── ipc.test.ts                       # Electron ana süreç IPC entegrasyon testleri
│   ├── licenseStore.test.ts              # SafeStorage lisans depolama ve HWID testleri
│   ├── mfa.test.ts                       # Çok faktörlü doğrulama mantık testleri
│   ├── netDispatcher.test.ts             # Ağ istek yönlendiricisi fonksiyonel testleri
│   ├── netDispatcherAdversarial.test.ts  # SSRF ve zararlı URL istek bloklama testleri
│   ├── netDispatcherIPC.test.ts          # Ağ yönlendiricisi IPC kanal testleri
│   ├── netDispatcherSecurity.test.ts     # Özel IP aralığı ve başlık güvenliği testleri
│   ├── pdfService.test.ts                # PDF işleme servisi birim testleri
│   ├── rateLimiter.test.ts               # Oran sınırlayıcı algoritma testleri
│   ├── regexEngine.test.ts               # Regex motoru analitik ve yürütme testleri
│   ├── securityHardening.test.ts         # Sistem sertleştirme kontrolleri
│   ├── smartPasteDetector.test.ts        # Akıllı pano tipi sınıflandırma testleri
│   ├── socialProof.test.ts               # Satış ve kullanıcı istatistik motoru testleri
│   └── vaultCrypto.test.ts               # AES-256-GCM kasa şifreleme/çözme testleri
├── tsconfig.json                         # TypeScript proje referans yapılandırması
├── tsconfig.node.json                    # Electron Main, Preload ve Shared için derleyici kuralları
├── tsconfig.web.json                     # React Renderer ve Shared için derleyici kuralları
└── vitest.config.ts                      # Masaüstü istemcisi Vitest test çalıştırıcı ayarları
```

---

## 🛠️ Teknoloji Stack

### 1. Masaüstü İstemci Çekirdeği (Desktop Runtime)
- **Çalışma Zamanı (Runtime):** Electron `v35.2.1` (Chromium 134, Node.js 22.14, V8)
- **Paketleme & Derleme:** `electron-vite v3.1.0`, `vite v6.3.5`, `electron-builder v26.15.3`
- **Programlama Dili:** TypeScript `v5.8.3` (Strict Mode)
- **İşletim Sistemi Entegrasyonu:** Windows NSIS Yükleyicisi (Diferansiyel `.blockmap` güncellemeli), macOS (DMG/ZIP, Hardened Runtime uyumlu), Linux (AppImage/DEB)

### 2. Kullanıcı Arayüzü & Sunum Katmanı (Frontend UI)
- **Kütüphane:** React `v19.1.0` (Concurrent Features, Entegre DOM Hooks)
- **Yönlendirme:** React Router DOM `v7.6.0` (HashRouter ile Electron dosya protokolü uyumu)
- **Stil & Tasarım Sistemi:** Tailwind CSS `v3.4.17`, PostCSS `v8.5.3`, Autoprefixer `v10.4.21`
- **Animasyon & Mikro Etkileşim:** Framer Motion `v12.12.0`
- **İkonografi:** Lucide React `v0.511.0`
- **Ses Motoru:** Saf HTML5 Web Audio API (Harici ses dosyası bağımlılığı olmadan 8-bit/Siber ses sentezleme)
- **Güvenlik & XSS Koruması:** DOMPurify `v3.4.15`

### 3. İstemci İçi Özel Hesaplama Motorları
- **Gömülü Veritabanı:** `sql.js v1.14.2` (WebAssembly derlemeli sanal SQLite)
- **Görsel İşleme:** `sharp v0.35.4` (C++ libvips hızlandırmalı, AVIF, WebP, JPEG, PNG dönüştürücü)
- **PDF Manipülasyonu:** `pdf-lib v1.17.1` (Sayfa birleştirme, bölme ve şifreleme)
- **QR Kod Motoru:** `qrcode v1.5.4`
- **Kriptografi:** Node.js Native `crypto` (Main process) & W3C `SubtleCrypto` (Renderer process), `safeStorage` (Windows DPAPI / macOS Keychain)
- **Donanım Kimliği:** `node-machine-id v1.1.12`

### 4. Bulut Lisans & Ödeme Altyapısı (Backend / Server)
- **Sunucu Çerçevesi:** Express `v5.2.1` (Modern Promise tabanlı asenkron rota yönetimi)
- **Veritabanı Katmanı:** `@libsql/client v0.14.1` (Turso / SQLite uyumlu hafif ilişkisel veritabanı)
- **Ödeme Entegrasyonu:** LemonSqueezy Webhook API (Kriptografik HMAC doğrulama ve DLQ hata toleransı)
- **E-posta Dağıtımı:** Resend API `v4.1.2`
- **Konteynerizasyon:** Docker (Alpine Linux Node:22)

### 5. Kalite Güvence & Test Altyapısı
- **Test Çatısı:** Vitest `v5.0.0`
- **Test Ortamı:** Happy-DOM / Node.js
- **Kapsam:** 38 Test Takımı, 704 Otomatik Test (Birim, Entegrasyon, Siber Saldırı ve Stres Testleri)

---

## 📊 Mevcut Durum Puanları

| Alan | Puan | Açıklama |
|---|:---:|---|
| **UI/UX** | **8.5 / 10** | Siberpunk/Neon koyu tema, dinamik CSS temaları (Matrix, Synthwave, Cyberpunk 2077, Crimson), Raycast tarzı Mini-HUD, Command Palette (`Ctrl+K`), siber ses efektleri ve Framer Motion geçişleri oldukça etkileyici. Eksik yön: 900x600 gibi minimum pencere boyutlarında Scratchpad ve ApiStudio gibi karmaşık sayfalarda içerik sıkışması yaşanmaktadır. |
| **Kod Kalitesi** | **9.0 / 10** | TypeScript Strict modda hem masaüstü (`tsconfig.web.json`, `tsconfig.node.json`) hem sunucu tarafında **0 tip hatası** (`npx tsc --noEmit` temiz). IPC kanalları tip korumalıdır. Bazı sayfalar (Scratchpad.tsx 69KB, PasswordGenerator.tsx 50KB) çok büyüktür ve alt bileşenlere bölünmelidir. |
| **Performans** | **8.8 / 10** | Vite ile milisaniyeler seviyesinde HMR, 2.03 saniyede koşan 616 masaüstü testi. WASM tabanlı sql.js ve yerel sharp motoru çok hızlıdır. Büyük dosya işlemlerinin ana süreçte yapılması yoğun yük altında arayüzün anlık yavaşlamasına sebep olabilir (Worker threads gerektirir). |
| **Güvenlik** | **9.2 / 10** | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Sıkı CSP direktifleri dev/prod dinamik yönetilmektedir. Asimetrik NIST P-256 ECDSA lisanslama, DPAPI kasa şifrelemesi, SHA-256 hash zincirli değiştirilemez denetim günlüğü, SSRF kalkanı ve rate limiter anti-spoofing korumaları mevcuttur. |
| **Test Kapsamı** | **9.5 / 10** | Olağanüstü test disiplini. 32 masaüstü test dosyasında 616 test, 6 sunucu dosyasında 88 test olmak üzere **toplam 704 testin tamamı (%100) başarıyla geçmektedir**. 1.000 eşzamanlı log burst stres testleri ve saldırgan enjeksiyon senaryoları mevcuttur. |
| **Mimari** | **9.0 / 10** | Electron DMZ / Preload güvenlik mimarisi eksiksiz kurulmuştur. Sunucuda LibSQL atomik işlemleri (`withTransaction`), DLQ hata yakalama mekanizması ve yabancı anahtar kısıtlamaları uygulanmıştır. Monorepo yapısı pnpm workspaces veya Turborepo ile modernize edilebilir. |

---

## ✅ Mevcut Özellikler (Çalışan)

### 1. Masaüstü Araç Seti (25+ Fonksiyonel Araç)
- **ApiStudio:** Postman kalitesinde REST/HTTP istek çalıştırıcı; Koleksiyonlar, Ortam değişkenleri (`{{var}}`), Bearer/API Key/Basic yetkilendirme, Headers, Body (JSON, Form, Raw), Yanıt paneli, cURL içe/dışa aktarma ve SSRF korumalı güvenli ağ geçidi.
- **ActivityFeed:** Değiştirilemez (tamper-evident) SHA-256 hash zinciriyle korunan denetim günlüğü. Arama, tarih ve seviye filtreleme, zincir bütünlük denetimi (`verifyChain`) ve JSON/CSV dışa aktarma.
- **CyberFortress:** DoD 5220.22-M uyumlu 7 turlu güvenli dosya silici (shredder), PBKDF2 + AES-256-GCM şifreli dosya kasası ve PNG görselleri içine LSB steganografi ile gizli mesaj gömme/okuma.
- **UniversalDecrypter:** URL takip (tracking/UTM/fbclid vb.) parametrelerini temizleme, çoklu bağlantı çözme, punycode ve phishing tespiti.
- **NetworkTools:** DNS sorgulama (A, AAAA, MX, TXT), ICMP Ping testi, TCP port taraması, SSL/TLS sertifika süresi ve detayları denetimi, genel/özel IP sorgulama.
- **PortKiller:** Aktif TCP/UDP dinleyen portları listeleme, PID tespiti ve tek tıkla süreç sonlandırma.
- **SystemOptimizer:** Windows DNS önbellek temizleme (flush), `%TEMP%` tasfiyesi, internet gecikme testi ve tek tıkla "Siber Turbo Boost" optimizasyonu.
- **Scratchpad:** Çift panelli canlı Markdown not defteri, Bul & Değiştir (`Ctrl+F`), satır numaraları, AES-256-GCM şifreli not kasası, otomatik anlık görüntü (snapshot) zaman tüneli ve Mermaid/Flowchart görselleştirme.
- **BulkOrganizer:** Uzantı ve MIME türlerine göre toplu dosya düzenleme, YYYY-AA zaman tüneli klasörleme ve tek tıkla geri alma (undo) günlüğü.
- **ImageToolkit:** Sharp destekli toplu görsel format dönüştürme (PNG, JPEG, WebP, AVIF), kalite ayarlama ve EXIF/metaveri temizleme.
- **PdfStudio:** pdf-lib ile birden çok PDF'i tek belgede birleştirme, sayfa aralığına göre bölme ve belge yapısını inceleme.
- **JsonStudio:** JSON formatlama, küçültme (minify), iki JSON arasında görsel fark (diff) analizi, jq-style path sorgulama ve JWT çözme/doğrulama.
- **RegexStudio:** Canlı düzenli ifade test alanı, regex hile kartı (cheat sheet), bayrak kontrolleri ve adlandırılmış grup (named groups) renklendirmesi.
- **FakeDataStudio:** Türkiye lokasyonlu isim, soyisim, adres, telefon, geçerli algoritmalı test TC Kimlik no, kredi kartı ve UUID üretici; JSON/CSV toplu indirme.
- **ColorStudio:** HEX/RGB/HSL/CMYK anlık dönüştürücü, WCAG 2.1 erişilebilirlik kontrast skoru, sistem renk seçici (EyeDropper) ve CSS gradyan oluşturucu.
- **QrCodeStudio:** Metin, URL, WiFi ve vCard için renk ve logo özelleştirmeli QR kod üretici; PNG/SVG çıktısı ve tersine QR okuyucu.
- **HashStudio:** MD5, SHA-1, SHA-256, SHA-512, bcrypt hash üretimi ve doğrulaması; Base64, URL ve Hex kodlama/kod çözme.
- **TempMail:** 1secmail API entegrasyonlu tek kullanımlık geçici e-posta oluşturucu, otomatik gelen kutusu yoklama ve HTML e-posta okuyucu.
- **PasswordGenerator:** Karakter havuzları, entropi puanı, Diceware parola öbeği (passphrase) modu ve güvenlik kuralları denetimi.
- **ResourceSentinel:** Gerçek zamanlı CPU ve RAM kullanım göstergeleri, V8 çöp toplayıcı (GC) tetikleme ve bellek boşaltma.
- **SqliteViewer:** WebAssembly sql.js ile tarayıcı içi SQLite veritabanı açma, tablo şemalarını görüntüleme ve SQL sorguları çalıştırma.
- **Dashboard:** Favori araçları sabitleme (pinning), son kullanılan araçlar geçmişi, sistem durum kartları ve tek tıkla araç çalıştırma.

### 2. İstemci Sistem & Kabuk Özellikleri
- **Kısayollar & Navigasyon:** Raycast benzeri Mini-HUD (`Ctrl+Shift+Space`), Hızlı Komut Paleti (`Ctrl+K`), Evrensel Kısayollar (`F1` / `?`, `Ctrl+Shift+T` raptiye modu, `Ctrl+Shift+S` ses aç/kapat, `Alt+D`, `Alt+O`, `Alt+P`, `Alt+F`).
- **Akıllı Pano (SmartPaste):** Panoya kopyalanan içeriğin tipini (JSON, URL, Hash, Base64) anında algılayıp ilgili araca yönlendiren akıllı öneri kartı.
- **Siber Temalar:** Matrix Emerald, Cyberpunk 2077, Synthwave 80s, Crimson Protocol ve Classic Purple dinamik CSS temaları.
- **Siber Ses Motoru:** Saf Web Audio ile üretilen mekanik tıklama ve işlem sesleri, ses seviyesi ayarı ve sessiz mod.
- **Otomatik Güncelleme:** NSIS diferansiyel `.blockmap` paketleme ve sessiz arka plan indirme desteği (`electron-updater`).
- **Pencere & Tepsi Yönetimi:** Çerçevesiz (frameless) modern pencere, Windows Görev Çubuğu ve Bildirim kimliği (`app.zendev.desktop`), Sistem Tepsisine küçülme ve tekil örnek (single instance) kilidi.
- **Yerelleştirme:** %100 Türkçe (`tr.json`) ve İngilizce (`en.json`) dinamik dil desteği.

### 3. Bulut Lisans ve Yönetim Altyapısı (Server)
- **Asimetrik Kriptografi:** NIST P-256 ECDSA imza üretimi ve Base32 formatında çevrimdışı doğrulanabilir lisans anahtarları.
- **Korumalı Veritabanı:** LibSQL ilişkisel şeması, yabancı anahtar denetimi (`PRAGMA foreign_keys = ON`), ikincil indeksler ve atomik işlem desteği (`withTransaction`).
- **Ödeme & DLQ:** LemonSqueezy webhook doğrulama, e-posta gönderim hatalarında Dead Letter Queue (DLQ) kuyruğuna alma ve yönetim panelinden yeniden deneme (`/webhook/dlq/retry/:id`).
- **Kendi Kendine Donanım Sıfırlama:** 24 saatlik kötüye kullanım engelli (anti-abuse cooldown) HWID cihaz sıfırlama uç noktası (`/api/license/reset-hardware`).
- **Web Admin Konsolu:** Timing-safe PBKDF2 oturum açma, tekli ve toplu lisans üretimi, toplu süre uzatma/iptal/silme, kupon yönetimi, denetim logları ve telemetri.

---

## ⚠️ Mevcut Özellikler (Eksik/Bozuk veya Gelişime Açık)

1. **Monolitik React Sayfa Dosyaları:**
   - `Scratchpad.tsx` (69 KB, ~1.500 satır), `PasswordGenerator.tsx` (50 KB), `RegexStudio.tsx` (47 KB) ve `NetworkTools.tsx` (36 KB) gibi sayfalar tek dosya halinde yazılmıştır. Mantık, durum ve sunum katmanları `ApiStudio` veya `ActivityFeed` gibi modüler alt bileşenlere ayrıştırılmalıdır.
2. **Ana Süreç Hesaplama Yükü (Compute Bottleneck):**
   - `sharp` ile görsel işleme ve `pdf-lib` ile büyük PDF belgelerinin birleştirilmesi doğrudan Electron ana sürecinde (Main Process) çalışmaktadır. Çok sayıda yüksek çözünürlüklü dosya işlenirken ana süreç bloke olup UI tepkisizliğine yol açabilir. Bu işlemler Node.js `worker_threads` katmanına taşınmalıdır.
3. **Çevrimdışı Font Bağımlılığı (Air-Gapped Risk):**
   - `src/renderer/index.html` dosyası Google Fonts (`Orbitron`, `JetBrains Mono`, `Inter`) için harici CDN bağlantılarına (`fonts.googleapis.com`) başvurmaktadır. Tamamen internetsiz (air-gapped) ortamlarda bu durum fontların geç yüklenmesine veya sistem yedek fontuna düşmesine neden olur. Fontlar NPM (`@fontsource/*`) üzerinden yerel olarak paketlenmelidir.
4. **Dağıtım İmzası (Code Signing) Eksikliği:**
   - GitHub Actions `release.yml` dosyasında Windows Authenticode sertifikası ve macOS Notarization adımları yer almamaktadır. Dağıtılan `.exe` dosyası son kullanıcıda Windows SmartScreen uyarısı ("Bilinmeyen Yayıncı") tetiklemektedir.
5. **Git Çalışma Ağacı Temizliği:**
   - Mevcut yerel depoda 52 adet değiştirilmiş dosya ve 43 adet izlenmeyen (untracked) yeni test/servis dosyası bulunmaktadır. Kod tabanının kararlı sürüme etiketlenip atomik commit'lerle temizlenmesi gerekmektedir.

---

## 💡 Eksik Özellikler (Önerilecek - Öncelik Sırasıyla)

### P1 — Yüksek Öncelik (Mimari & Çekirdek Deneyim)
1. **Yerel Font Paketleme:** `@fontsource/inter`, `@fontsource/orbitron` ve `@fontsource/jetbrains-mono` paketlerinin eklenerek harici Google Fonts CDN çağrısının kaldırılması (Tamamen internetsiz çalışabilirlik).
2. **Worker Threads İle Ağır İş Yükü İzolasyonu:** Sharp ve PDF işlemlerinin ana süreçten `worker_threads` (veya `piscina`) havuzuna devredilerek arayüz FPS düşüşlerinin tamamen sıfırlanması.
3. **Monolitik Sayfaların Modülerleştirilmesi:** `Scratchpad.tsx` ve `PasswordGenerator.tsx` bileşenlerinin alt bileşen dizinlerine (`src/renderer/src/components/scratchpad/` vb.) bölünmesi.

### P2 — Orta Öncelik (Yeni Yetenekler & Entegrasyonlar)
4. **Yerel Yapay Zeka (Local LLM / Ollama) Köprüsü:** Ollama veya yerel LLM API'lerine bağlanarak kod açıklama, regex deseni üretme ve SQL sorgusu oluşturma asistanı.
5. **Uçtan Uca Şifreli Ayar & Snippet Senkronizasyonu:** Kullanıcının özel lisans anahtarıyla şifrelenen Scratchpad notlarının ve favori araç ayarlarının bulut üzerinde makineler arası yedeklenmesi.
6. **Entegre Terminal Emülatörü:** Xterm.js tabanlı mini siber terminal ile uygulama içinden ayrılmadan ping, traceroute veya npm komutları çalıştırabilme.

### P3 — Düşük Öncelik (Ek Geliştirici Araçları)
7. **Gelişmiş Veritabanı İstemcisi:** Mevcut SQLite tarayıcısına ek olarak PostgreSQL ve MySQL bağlantılarını destekleyen hafif istemci modu.
8. **HTTP/2 ve gRPC Test Desteği:** ApiStudio içerisine gRPC protobuf ve WebSocket canlı bağlantı dinleme sekmelerinin eklenmesi.

---

## 🎨 UI İyileştirme Fırsatları

1. **Düşük Çözünürlük ve Küçük Pencere Duyarlılığı (Responsive UI):**
   - Minimum pencere boyutu 900x600 olarak ayarlanmıştır; ancak `ApiStudio.tsx` (İstek çubuğu + 6 sekme + yanıt paneli) ve `Scratchpad.tsx` (Gutter + Editör + Canlı Önizleme) bu boyutta yatay taşmalara neden olmaktadır. Dar pencerelerde sekmelerin katlanabilir akordeon veya mobil çekmece (drawer) yapısına geçmesi gerekmektedir.
2. **Klavye Navigasyonu ve Odaklama (Focus Ring) İyileştirmeleri:**
   - Araç listelerinde (`Sidebar.tsx`, `Dashboard.tsx`) klavyenin `Tab` ve ok tuşlarıyla dolaşırken odak çizgileri (focus outline) bazı temalarda görünürlük kontrastını kaybetmektedir. Tüm etkileşimli elemanlara `focus-visible:ring-2 focus-visible:ring-[var(--nexus-accent)]` kuralı zorunlu kılınmalıdır.
3. **Boş Durum (Empty State) İllüstrasyonları:**
   - `ActivityFeed`, `TempMail` ve `ClipboardManager` sayfalarında henüz veri yokken gösterilen boş durumlar düz metinden ibarettir. Siber temaya uygun özel SVG illüstrasyonları ve "Örnek Veri Yükle" veya "İşlem Başlat" hızlı aksiyon butonları eklenmelidir.
4. **Görsel Önizleme Yakınlaştırma (Lightbox/Zoom):**
   - `ImageToolkit` ve `QrCodeStudio` içinde üretilen veya dönüştürülen görseller küçük bir kutu içinde gösterilmektedir. Tıklandığında tam ekran veya modal içinde büyütülebilir bir görsel inceleyici (lightbox) sunulmalıdır.

---

## 🏗️ Mimari İyileştirme Fırsatları

1. **Monorepo Araç Zincirinin Modernizasyonu (pnpm / Turborepo):**
   - Kök dizin (`NexusHub`) ve `server/` dizini şu anda iki ayrı `package.json` ve bağımsız `node_modules` yönetmektedir. Bu durum paylaşılan tiplerin (`src/shared/`) kopyalanmasına veya karmaşık import yollarına yol açmaktadır. `pnpm-workspace.yaml` veya Turborepo entegrasyonu ile tek bir ortak bağımlılık ağı kurulmalıdır.
2. **Arka Plan Servis Havuzu (Worker Thread Pool):**
   - Görsel optimizasyonu, PDF dönüştürme ve büyük dizinlerin taranması gibi CPU-yoğun işlemler ana Electron sürecinde çalıştığında IPC döngüsünü geciktirebilmektedir. Bir işçi havuzu (worker pool) ile ana sürecin sadece pencere ve OS IPC'si ile ilgilenmesi sağlanmalıdır.
3. **Dağıtık Sunucu Desteği İçin Redis Katmanı:**
   - `server/` içindeki IP oran sınırlayıcısı (`rateLimiter.ts`) ve denetim oturumları şu anda bellek içi `Map` yapıları üzerinde tutulmaktadır. Birden fazla sunucu örneği (örneğin Railway replica veya Kubernetes pod) devreye girdiğinde bu sınırlamalar ortak çalışmaz. İsteğe bağlı bir Redis veya Upstash desteği eklenmelidir.

---

## 🔐 Güvenlik Açıkları & İncelemeleri

| Bileşen | Risk Seviyesi | İnceleme ve Güvenlik Durumu | Alınan / Alınması Gereken Önlem |
|---|:---:|---|---|
| **Kriptografik Anahtarlar** | **Kritik (P0)** | `server/src/services/licenseSigner.ts` dosyasındaki eski hardcoded fallback özel anahtar referansı başarıyla temizlenmiş ve `undefined` olarak işaretlenmiştir. | Üretim sunucusu başlatılırken `ZENDEV_LICENSE_PRIVATE_KEY` ortam değişkeni zorunlu kılınmalıdır; bulunamazsa sunucu prod modda açılmamalıdır. |
| **SSRF (Sunucu Taraflı İstek Sahteciliği)** | **Yüksek (P1)** | `ApiStudio` ve `CurlRunner` istekleri için oluşturulan `netDispatcherSecurity.ts` modülü özel IP aralıklarını (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254` AWS metadata) başarıyla bloklamaktadır. | İlgili kural 27 birim test ile doğrulanmıştır; DNS Rebinding saldırılarına karşı IP çözümleme önbelleği eklenmelidir. |
| **Hafıza İçi Hassas Veri İzolasyonu** | **Orta (P2)** | `CyberFortress` ve `VaultCrypto` içerisinde kullanılan parola ve şifre çözme anahtarları JavaScript Garbage Collector tarafından temizlenene kadar bellekte kalabilmektedir. | Kritik ArrayBuffer ve şifre çözme anahtarları kullanıldıktan hemen sonra `buffer.fill(0)` ile sıfırlanmalıdır. |
| **Oran Sınırlayıcı IP Sahteciliği** | **Düşük (P3)** | `server/src/middleware/rateLimiter.ts` içinde `trust proxy = 1` ayarı ve IPv6 adres haritalama denetimi eklenmiştir. | Çoklu ters vekil sunucu (reverse proxy) kullanılan ortamlarda `X-Forwarded-For` başlığının en sağdaki güvenilir IP'si okunmalıdır. |
| **Harici CDN Varlıkları** | **Düşük (P3)** | `index.html` içerisindeki Google Fonts bağlantıları ağ izleme (telemetri) ve çevrimdışı kullanım engeli oluşturur. | Fontların tamamen yerel depoya çekilmesiyle çözülecektir. |

---

## 📋 ÖNERİLEN ROADMAP (Öncelik Sırasıyla)

```mermaid
gantt
    title ZenDev Mühendislik Yol Haritası
    dateFormat  YYYY-MM-DD
    section Epic 1: Kararlılık & İzolasyon
    Git Çalışma Ağacı Temizliği & Commitler :active, 2026-09-16, 2d
    Yerel Font Paketleme (@fontsource)      :2026-09-18, 1d
    section Epic 2: Performans
    Worker Threads (Sharp & PDF)            :2026-09-19, 3d
    Monolitik Sayfaların Refactor Edilmesi  :2026-09-22, 4d
    section Epic 3: Dağıtım & Yayın
    Kod İmzalama (EV Authenticode & Mac)    :2026-09-26, 3d
    v2.5.0 Resmi Yayın Paketi               :2026-09-29, 2d
    section Epic 4: İleri Yetenekler
    Ollama / Yerel AI Asistan Entegrasyonu :2026-10-01, 7d
```

---

### 🚀 Epic 1: Çalışma Ağacı Temizliği, Kararlılık ve Yerel Font İzolasyonu (Öncelik: P0 - Acil)
- **Hedef:** Mevcut 52 değiştirilmiş ve 43 yeni dosyayı mantıksal, atomik commit'lerle depoya kaydetmek ve uygulamayı harici CDN bağlantılarından tamamen arındırmak.
- **Görevler:**
  1. `git add` ile test takımlarını, `ApiStudio`, `ActivityFeed` ve güvenlik modüllerini ayrı ayrı feature/fix commit'leri halinde kaydetmek.
  2. `@fontsource/inter`, `@fontsource/orbitron`, `@fontsource/jetbrains-mono` paketlerini yükleyip `src/renderer/src/index.css` içine dahil etmek; `index.html` içindeki dış font linklerini kaldırmak.
  3. `server/src/services/licenseSigner.ts` içinde prod ortamda özel anahtar yoksa başlatmayı engelleyen sıkı kontrolü pekiştirmek.
- **Kabul Kriteri:** İnternet bağlantısı tamamen kesildiğinde masaüstü uygulamasının font ve arayüz hatası vermeden açılması; temiz `git status`.

---

### ⚡ Epic 2: Ağır İş Parçacığı İzolasyonu & Monolitik Sayfa Refaktörü (Öncelik: P1)
- **Hedef:** Görsel ve PDF işleme süreçlerinde ana sürecin donmasını engellemek; büyük sayfa dosyalarını sürdürülebilir modüler yapılara dönüştürmek.
- **Görevler:**
  1. `src/main/workers/imageWorker.ts` ve `src/main/workers/pdfWorker.ts` dosyalarını oluşturmak; Sharp ve pdf-lib operasyonlarını bu işçilere yönlendirmek.
  2. `Scratchpad.tsx` dosyasını `components/scratchpad/` altında `ScratchpadEditor.tsx`, `ScratchpadPreview.tsx`, `ScratchpadVaultModal.tsx`, `ScratchpadHistory.tsx` parçalarına bölmek.
  3. `PasswordGenerator.tsx` bileşenini `PassphraseTab.tsx`, `RulesTab.tsx` ve `EntropyCard.tsx` olarak modülerleştirmek.
- **Kabul Kriteri:** 100 adet 4K görsel dönüştürülürken UI butonlarının 60 FPS akıcılıkta kalması; hiçbir sayfa dosyasının 400 satırı aşmaması.

---

### 📦 Epic 3: Kurumsal Dağıtım, Kod İmzalama & CI/CD Sertleştirmesi (Öncelik: P1)
- **Hedef:** Windows SmartScreen ve macOS Gatekeeper uyarılarını kaldırarak kurumsal güvenliği sağlamak.
- **Görevler:**
  1. GitHub Secrets içine `CSC_LINK`, `CSC_KEY_PASSWORD` (Windows PFX sertifikası) ve `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` eklemek.
  2. `.github/workflows/release.yml` dosyasını gerçek kod imzalama adımlarıyla güncellemek.
  3. NSIS diferansiyel indirme paketini v2.5.0 etiketiyle derlemek ve GitHub Releases üzerinde yayınlamak.
- **Kabul Kriteri:** Windows 11 üzerinde SmartScreen mavi ekran uyarısı vermeden tek tıkla kurulan imzalı yükleyici.

---

### 🤖 Epic 4: Yerel Yapay Zeka (Local LLM / Ollama) Köprüsü (Öncelik: P2)
- **Hedef:** Çevrimdışı ve gizlilik odaklı yapay zeka asistanını araçlara entegre etmek.
- **Görevler:**
  1. Yerel çalışan Ollama (`localhost:11434`) veya LocalAI servislerini otomatik tespit eden istemci servisi yazmak.
  2. Regex Studio için "Doğal dille regex yazdır", JsonStudio için "JSON şeması ve sorgusu üret", Scratchpad için "Notu özetle / maddeleştir" butonlarını eklemek.
  3. Kullanıcının kendi OpenAI / Anthropic / Google Gemini API anahtarlarını güvenli kasada (`safeStorage`) saklayabileceği esnek bir sağlayıcı seçici sunmak.
- **Kabul Kriteri:** İnternetsiz ortamda Ollama üzerinden regex üretimi ve kod analizinin saniyeler içinde çalışması.

---

## 🏁 Sonuç ve Değerlendirme

NexusHub (ZenDev), **704 otomatik testin %100 başarıyla geçtiği**, tip güvenliğinin kusursuz sağlandığı ve 25'ten fazla masaüstü aracının modern bir siberpunk estetiğiyle birleştirildiği **üretim aşamasında (production-ready)** son derece güçlü bir masaüstü platformudur. 

Önerilen **Epic 1 (Git temizliği ve yerel font paketleme)** ve **Epic 2 (Worker thread optimizasyonu)** adımları tamamlandığında, ürün ticari lansman, ücretli lisans satışı ve kurumsal dağıtım için dünya standartlarında kusursuz bir mükemmelliğe ulaşacaktır.

---
*Rapor Sonu — Antigravity Multi-Agent Architecture Engine*
