# ZenDev — SaaS Yol Haritası & Backlog (YAPILACAKLAR.md)

> **BAĞLAYICI DİREKTİF:** Bu yol haritası, `.agents/rules/zendev-saas-directive.md` (ZenDev SaaS Dönüşüm Direktifi) ve `.agents/skills/zendev-feature-gatekeeper/` çerçevesine göre yapılandırılmıştır.
> Ürünün çekirdek odağı: **API-ağırlıklı geliştiriciler ve yazılım ekipleri için kurumsal B2B/Pro Masaüstü Geliştirici SaaS platformudur.**

---

## 🎯 Öncelikli SaaS Dönüşüm Fazları

### Faz 1 — Modül Temizliği, Güvenlik & Ayrıştırma (Deprecation & Hardening)
*Amaç: SaaS kimliğiyle çelişen, güvenlik yazılımlarında şüphe doğuran ve yüksek OS bakım maliyeti getiren modüllerin çekirdekten tasfiyesi ve şeffaflaştırılması.*

- [x] **Port Killer (Port Watchdog) Tasfiyesi:**
  - İşletim sistemi süreçlerini sonlandırma (`taskkill`, `kill`) ve yerel soket müdahale mekanizmasının çekirdekten çıkarılması.
  - UI ve API rotalarından kaldırılması veya harici, izole bir opsiyonel yardımcıya ayrıştırılması.
- [x] **System Optimizer Tasfiyesi:**
  - DNS önbellek temizliği (`ipconfig /flushdns`) ve `%TEMP%` disk temizleme mantığının çekirdekten tasfiyesi.
- [ ] **Sessiz Otonom Güncelleyicinin Şeffaf / Kullanıcı Onaylı Akışa Dönüştürülmesi:**
  - Arka planda `CREATE_NO_WINDOW` ile kullanıcının haberi olmadan çalışan otonom NSIS güncelleme akışının durdurulması.
  - Antivirüs ve EDR (Endpoint Detection and Response) sistemlerinde false-positive malware şüphesi yaratmayacak şeffaf modal akışına geçilmesi.
  - Yeni sürüm bulunduğunda changelog modalı gösterilmesi; indirme ve kurulumun yalnızca **açık kullanıcı onayı** ile başlatılması.
- [x] **Temp Mail Tasfiyesi:**
  - Tek kullanımlık e-posta üreticisinin yasal riskler, abuse ve spam tehditleri nedeniyle SaaS çekirdeğinden kaldırılması.
- [x] **Düşük Diferansiyasyonlu OS Araçlarının Arka Plana Alınması:**
  - `Clipboard Manager` ve basit scratchpad'in ana yol haritası ve pazarlama vitrininden düşürülmesi.

---

### Faz 2 — Table Stakes SaaS Altyapısı (Cloud, Auth, Billing & Licensing)
*Amaç: B2B ve Pro kullanıcıların para ödemeye hazır olduğu kurumsal temel servislerin inşası.*

- [ ] **Cloud Sync Motoru (Uçtan Uca Şifreli Bulut Senkronizasyonu):**
  - Geliştirici çalışma alanları, API ortam değişkenleri (`environments`), istek koleksiyonları, regex kuralları ve mock veri şablonlarının cihazlar arası güvenli senkronizasyonu.
  - Yerel-öncelikli (offline-first) çalışan, internet bağlandığında E2EE (Zero-Knowledge AES-256-GCM) ile sunucuya senkronize olan veri mimarisi.
- [ ] **Team Auth, Workspaces & RBAC:**
  - Multi-tenant organizasyon ve takım çalışma alanı yönetimi.
  - Takım üyesi davet etme akışları, rol ve izin matrisi (Owner, Admin, Member, Viewer).
  - Kurumsal kimlik doğrulama: GitHub OAuth, Google SSO, SAML 2.0 / Okta desteği.
- [ ] **Monetization, Stripe / Paddle & Faturalandırma:**
  - Free (Bireysel Temel), Pro (Bireysel Güçlü Geliştirici) ve Team (Sınırsız Çalışma Alanı & İş Birliği) fiyatlandırma katmanları.
  - Stripe Checkout ve Müşteri Faturalandırma Portalı entegrasyonu.
  - Webhook dinleyicileri (abonelik başlatma, yenileme, iptal, fatura geçmişi).
- [ ] **Sunucu Taraflı Lisanslama ve Koltuk (Seat) Yönetimi:**
  - Mevcut statik offline HMAC doğrulamasının yerini alan, periyodik token tabanlı sunucu lisans doğrulama altyapısı.
  - Aktif cihaz/koltuk limitlerinin dinamik takibi ve yönetimi.
- [ ] **Şeffaf ve Gizlilik Odaklı Telemetri:**
  - Kullanıcı onayına bağlı (opt-in), KVKK/GDPR uyumlu anonimleştirilmiş hata ve çökme raporlama (Sentry / OpenTelemetry).

---

### Faz 3 — Diferansiyasyon & B2B Moat (Workflow Chains, Team Collections, AI Dispatcher)
*Amaç: ZenDev'i web sitelerinden ve ücretsiz rakiplerinden ayıran, düzenli abonelik ödemesini haklı çıkaran rekabet kalkanı.*

- [ ] **Workflow Chains (İş Akışı Zincirleri Motoru):**
  - Geliştirici stüdyolarını görsel veya script ile birbirine bağlayan pipeline çalıştırma motoru.
  - *Örnek Akış:* cURL ile API endpoint'ini çağır → Yanıttaki JSON'dan belirli alanı jq ile filtrele → Base64 dönüştür → HMAC-SHA256 ile imzala → Webhook'a ilet.
  - Önceden tanımlı hazır zincir şablonları (OAuth token yenileme, Webhook payload imzalama, API test zincirleri).
- [ ] **Paylaşılabilir Takım Koleksiyonları (Team Collections):**
  - Git-dostu JSON/YAML formatında saklanan, ekipler arası anında senkronize olan paylaşımlı API koleksiyonları.
  - Takım regex kütüphanesi, paylaşımlı Cron görev takvimleri, Mermaid mimari diyagram depoları.
- [ ] **AI Destekli Akıllı Ayrıştırıcı (AI Smart Dispatcher):**
  - Kullanıcının panosuna kopyaladığı veya editöre yapıştırdığı veriyi otomatik olarak analiz eden akıllı katman:
    - JWT token'ı algılayıp doğrudan `JwtStudio`'da çözümleme ve süre sonu uyarısı verme.
    - cURL komutunu algılayıp `ApiStudio`'da hazır istek formatına dönüştürme.
    - Bozuk JSON'u algılayıp sözdizimi onarımı önerme.
    - SQL sorgusu, stacktrace veya Base64 dizisini tanıyıp uygun aksiyonu önerme.

---

### Faz 4 — Güvenlik, Uyumluluk & Dağıtım Mükemmeliyeti
*Amaç: Kurumsal BT ve güvenlik departmanlarından sıfır engelle onay almak.*

- [ ] **Genişletilmiş Kod İmzalama (EV Code Signing):**
  - Windows SmartScreen ve macOS Notarization uyarılarını tamamen kaldıran kurumsal sertifikasyon.
- [ ] **EDR & Antivirüs Temizliği:**
  - Windows Defender, CrowdStrike, SentinelOne gibi kurumsal güvenlik yazılımlarında 0 false-positive skoru.
- [ ] **Kurumsal Denetim İzi (Audit Log):**
  - Takım çalışma alanlarında yapılan kritik değişiklikler (anahtar güncelleme, ortam değişkeni silme vb.) için denetim kaydı.

---

## 🏛️ Mevcut Durum & Çekirdek Stüdyo Envanteri (v2.5.3)

ZenDev, **Tauri v2 + Rust + React 19** mimarisi üzerinde çalışan ve 27 stüdyo içeren güçlü bir çekirdeğe sahiptir:

### Aktif Çekirdek Geliştirici Stüdyoları
- **JSON Studio:** Formatlama, küçültme, ayrıştırma ve JSON diff.
- **API Studio & cURL Runner:** REST API testi, cURL çalıştırma, gecikme ölçümü.
- **Regex Studio:** Canlı eşleşme, named groups, bayraklar, test bankası.
- **JWT Studio:** Başlık/yük çözümleme, HMAC-SHA256 doğrulama, süre sonu zaman tüneli.
- **Cron Studio:** Görsel cron oluşturucu, Türkçe/İngilizce açıklama, sonraki 10 çalışma zamanı.
- **Mermaid Studio:** Mimari akış, sıralama ve ERD diyagramları (SVG/PNG aktarımı).
- **Encoding Studio:** Base64, Hex, URL Encoding ve Data-URL görselleştirici.
- **Hash Studio:** MD5, SHA-1, SHA-256, SHA-512 kriptografik hash üretici.
- **Universal Decrypter:** Şifreli bağlantı ve algoritma analizi.
- **Password Generator:** Güçlü, özelleştirilebilir şifre üretici.
- **Cyber Fortress:** AES-GCM şifreleme ve güvenli veri koruma.
- **Image Toolkit:** Görsel sıkıştırma, format dönüştürme (WebP), boyutlandırma.
- **PDF Studio:** PDF birleştirme, bölme ve şifreleme.
- **Bulk Organizer:** Toplu dosya yeniden adlandırma ve klasör düzenleme.
- **QR Code Studio:** QR kod üretici ve tersine görsel okuyucu.
- **Color Studio:** HEX/RGB/HSL/CMYK dönüştürücü, WCAG kontrast analizi, CSS gradyan.
- **Fake Data Studio:** Gerçekçi mock veri üretici (TR/EN yerel desteği).
