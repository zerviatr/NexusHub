# ZenDev — Yapilacaklar Listesi

> Bu dosyayi bana goster, devam edelim.

---

## Yeni Featurelar (Oncelik Sirasina Gore)

### 1. Hash & Encode Suite
- MD5, SHA-1, SHA-256, SHA-512, bcrypt
- Base64 encode/decode
- URL encode/decode
- Hex encode/decode
- Tamamen client-side, IPC gerektirmez
- Sidebar grubu: Gizlilik & Guvenlik

### 2. QR Code Studio
- Metin, URL, WiFi, vCard -> QR uret
- Renk & logo customize
- PNG / SVG export
- Tersine: gorsel yukle -> icerigi oku
- Tamamen client-side

### 3. JSON / JWT Toolkit
- JWT decode & verify
- JSON format (pretty print) & minify
- JSON diff (iki JSON karsilastir)
- jq-style path query

### 4. Regex Tester
- Live match highlight
- Named groups gorsellestirme
- Flag toggle (g, i, m, s, u)
- Test string bank

### 5. Fake Data Generator
- Ad, email, telefon, adres uret
- Kredi karti (test), UUID, lorem ipsum
- Bulk export JSON / CSV
- TR locale destegi

### 6. Color Toolkit
- HEX <-> RGB <-> HSL converter
- Palette extractor (gorselden renk cek)
- Gradient builder
- WCAG kontrast checker

---

## Phase 3 — Monetization Altyapisi

- [ ] LemonSqueezy / Paddle webhook endpoint
- [ ] Odeme sonrasi otomatik lisans key generation
- [ ] Sunucu tarafi lisans dogrulama (su an offline HMAC)
- [ ] Aktivasyon limiti (cihaz basi 1-2 aktivasyon)

---

## Production

- [ ] Code signing (dist:win)
- [ ] Auto-update server endpoint
- [ ] Installer branding finalize

---

## Tamamlananlar

- [x] Regex Lab & Live Tester (`/regex-studio`) — canli eslesme, named groups, flagler, cheat sheet
- [x] Fake Data & Mock Generator (`/fake-data`) — TR ad, telefon, TC/CC test no, UUID, toplu JSON/CSV
- [x] Windows System Optimizer (`/system-optimizer`) — DNS onbellek flush, %TEMP% temizleme, gecikme benchmark
- [x] HTTP & cURL Micro Runner (`/curl-runner`) — micro Postman istek testi, JSON ayrıştırıcı, gecikme ölçer
- [x] Always-on-Top (Pin to Top) — TitleBar raptiye ikonu ile pencereyi daima ustte tutma
- [x] Nexus Mini-HUD (`Ctrl + Shift + Space`) — hizli Raycast/Spotlight araci, anlik SHA-256 ve arac baslatici
- [x] Siber Ses Efekti Motoru (`cyberAudio.ts`) — sifir dosya bagimliligi, saf Web Audio mekanik sesler & ayar toggle
- [x] Yapilandirma Yedekleme & Geri Yukleme (`.nexusbackup` JSON export/import)
- [x] Steganografi Studyosu — PNG piksellerine LSB ile gizli mesaj gomup okuma
- [x] URL Guvenlik & Phishing Taramasi — UniversalDecrypter icinde punycode & TLD analizi
- [x] Tarih / Zaman Cizelgesi Gruplama — BulkOrganizer YYYY-AA klasorleme destegi
- [x] Hassas Veri Algilama & Maskeleme Kalkanı — ClipboardManager kredi karti, TC, JWT, API key maskeleme
- [x] Hash & Encode Suite (`/hash-studio`)
- [x] QR Code Studio (`/qr-code`)
- [x] JSON / JWT Toolkit (`/json-studio`)
- [x] Tam i18n sistemi (TR / EN) — tum tool sayfalari
- [x] Account Settings — dil secici, lisans bilgisi
- [x] EULA — TR/EN gecisi
- [x] Auto-updater dev warning fix
- [x] Offline-first HMAC lisans validasyonu + safeStorage
- [x] CSP hardening (dev/prod dinamik)
- [x] Dashboard, Sidebar, EulaGate cevirisi
- [x] ClipboardManager, BulkOrganizer, ImageToolkit cevirisi
- [x] TempMail, UniversalDecrypter, AylinkBypasser, NetworkTools cevirisi
- [x] PasswordGenerator tam i18n
- [x] ErrorBoundary & Wildcard Rota Kalkanı — Tanımsız rotalarda veya render hatalarında siyah ekranı önleme
- [x] Siber Ses Motoru İzolasyonu (`cyberAudio.ts`) — Donanım ses kanallarında sessiz try-catch koruması
- [x] Anlık Diferansiyel Sessiz Güncelleme — NSIS differentialPackage (.blockmap) ve 150ms kesintisiz geçiş
- [x] GitHub Actions CI Turbo Optimizasyonu — Yalnızca x64 NSIS, Electron binary önbelleği ve 1.5 dk derleme
- [x] Main Process IPC Singleton Zırhı — `updater:check-now` mükerrer handle çökmesini kalıcı engelleme (v2.1.3)
- [x] Renk & Kontrast Stüdyosu (`/color-studio`) — HEX/RGB/HSL/CMYK dönüştürücü, WCAG 2.1 validator, EyeDropper, CSS gradient oluşturucu (v2.1.9)
- [x] Port Killer & TCP Gözlemcisi (`/port-killer`) — Aktif dinleyen portları netstat ile listeleme, PID lookup, güvenli süreç sonlandırma (v2.1.9)
- [x] Markdown Scratchpad Not Defteri (`/scratchpad`) — Ayrık canlı önizleme, anlık metrikler, MD/HTML dışa aktarma, yerel otomatik kaydetme (v2.1.9)
- [x] Favori Araç Sabitleme (Pinned Tools) — Dashboard üzerinde tek tıkla araç yıldızlama ve hızlı erişim paneli (v2.1.9)
- [x] Hızlı Komut Paleti Geçmişi (Recent Tools) — Command Palette'te son kullanılan araçları otomatik hatırlama (v2.1.9)
- [x] Dinamik Siber Temalar (Cyber Themes) — Matrix Emerald, Cyberpunk 2077, Synthwave 80s, Crimson Protocol ve Klasik Mor arayüz motoru (v2.1.9)
- [x] Web Audio SFX Ses Seviyesi Ayarı (Volume Slider) — Account sekmesinde haptik ses şiddeti kontrolü (v2.1.9)
- [x] Markdown Scratchpad Ultimate (`/scratchpad`) — Bul & Değiştir (`Ctrl+F`), Sürükle-Bırak Base64 görsel gömme, Satır Numaraları Gutter, AES-256-GCM Şifreli Kasa Modu, Zen Odaklanma Modu, Snapshot Zaman Tüneli, Canlı Akış Şeması (Flowcharts) (v2.2.0)
- [x] Ana Süreç Kaza Kalkanı & IPC Giriş Doğrulama — `uncaughtException` / `unhandledRejection` yakalayıcıları, güvenli PID tam sayı sınır denetimi ve çapraz platform süreç sonlandırma zırhı (v2.2.1)
- [x] Etkileşimli Klavye Kısayolları HUD Modalı (`?` / `F1`) — Kategorik kısayol listesi, anlık arama filtresi ve TitleBar kısayol erişim butonu (v2.2.1)
- [x] Tek Tıkla Siber Turbo Boost — `system:optimizeAll` ile DNS temizleme, geçici disk alanı tasfiyesi ve Sentinel bellek boşaltmayı tek tıkla başlatan süper santral (v2.2.1)

