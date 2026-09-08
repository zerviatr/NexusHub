# NexusHub — Yapilacaklar Listesi

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
