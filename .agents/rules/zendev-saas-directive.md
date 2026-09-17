---
name: zendev-saas-directive
version: 1.0.0
priority: P0
trigger: always_on
---

# ZenDev SaaS Dönüşüm Direktifi (Değişmez Üst Kural)

> **DİKKAT — TÜM ASİSTANLAR VE MÜHENDİSLER İÇİN BAĞLAYICIDIR:**
> Bu belge, ZenDev (NexusHub) projesinin kişisel bir masaüstü araç kutusundan **kurumsal ve ticari bir B2B/Pro Geliştirici SaaS platformuna** dönüştürülmesini yöneten nihai karar ve üst talimat setidir.
> Tüm yapay zeka asistanları (Gemini, Antigravity, Claude, Cursor vb.), mimarlar ve geliştiriciler; kod yazarken, mimari tasarlarken, PR incelerken veya yeni özellik önerirken aşağıdaki **5 Temel İlkeye** koşulsuz uymakla yükümlüdür.

---

## 1. İlke: Ürün Konumlandırması (Product Positioning)

- **Tanım:** ZenDev, genel amaçlı bir "yerel İsviçre çakısı" (Swiss-army knife) ya da hobi amaçlı sistem kurcalama aracı DEĞİLDİR.
- **Konum:** ZenDev, **API-ağırlıklı çalışan yazılım geliştiriciler ve mühendislik ekipleri** için tasarlanmış profesyonel bir **Masaüstü Geliştirici SaaS (Desktop Developer SaaS)** platformudur.
- **Temel Değer Önerisi:** *"Dağınık web araçlarını (JSON, cURL/API, Regex, JWT, Cron, Mermaid, Encoding) tek, ultra hızlı, offline-first, yerel gizlilik korumalı masaüstü uygulamasında birleştirmek ve takımlar arası kesintisiz iş birliğiyle güçlendirmek."*
- **İdeal Müşteri Profili (ICP):**
  - REST/GraphQL/gRPC API'leri ile yoğun çalışan backend, frontend, full-stack geliştiriciler.
  - Mikroservis mimarileri geliştiren ve hata ayıklayan küçük ve orta ölçekli yazılım ekipleri.
  - DevOps ve platform mühendisleri.
- **Gelir Modeli:** B2B/Team ağırlıklı koltuk bazlı (seat-based) abonelik modeli ve B2C PLG (Product-Led Growth) girişli Pro lisanslama.

---

## 2. İlke: Kaldırılacak / Ayrıştırılacak Modüller (Deprecation & Decoupling)

SaaS konumlandırmasıyla doğrudan çelişen, platformlar arası yüksek destek maliyeti üreten, antivirüs/EDR yazılımları tarafından şüpheli görülebilecek veya sıfır diferansiyasyonlu modüller çekirdek üründen (core) tasfiye edilmeli veya ayrıştırılmalıdır:

1. **Sistem Müdahale Araçları (Kaldırılacak):**
   - `Port Killer (Port Watchdog)`: İşletim sistemi seviyesinde süreç sonlandırma (`taskkill`, `kill`), soket dinleme vb. SaaS mantığıyla çelişir ve OS seviyesinde kırılgan destek yükü yaratır.
   - `System Optimizer`: DNS önbelleği temizleme (`ipconfig /flushdns`), geçici disk temizliği (`%TEMP%`) gibi OS araçları ticari bir geliştirici SaaS ürününde yer alamaz.
2. **Sessiz Otonom Güncelleyici (Şeffaf / Onaylı Akışa Taşınacak):**
   - Arka planda kullanıcının haberi olmadan çalışan, `CREATE_NO_WINDOW` ile gizlenen otonom NSIS güncelleme davranışı KESİNLİKLE TERK EDİLMELİDİR.
   - **Gerekçe:** Güvenlik ve EDR yazılımları tarafından şüpheli/malware davranışı olarak işaretlenme riski taşır.
   - **Yeni Standart:** Güncellemeler kullanıcıya şeffaf sürüm notları (changelog) ile bir bildirim veya modal aracılığıyla sunulmalı; indirme ve kurulum yalnızca açık **kullanıcı onayı** ile başlatılmalıdır.
3. **Kötüye Kullanıma Açık Anonimlik Araçları (Kaldırılacak):**
   - `Temp Mail` (geçici tek kullanımlık e-posta üretici): Yasal riskler, spam ve kötüye kullanım (abuse) riski taşır; profesyonel geliştirici SaaS kimliğine zarar verir.
4. **Düşük Diferansiyasyonlu OS Araçları (Core Dışına İtilecek):**
   - `Clipboard Manager`, basit not defteri (scratchpad) gibi işletim sistemlerinin kendi içinde sunduğu veya pazarda yüzlerce ücretsiz muadili olan araçlar tek başına ödeme gerekçesi oluşturmaz; ana yol haritasından ve pazarlamadan çıkarılmalıdır.

---

## 3. İlke: Table Stakes SaaS Altyapısı (Essential SaaS Infrastructure)

Profesyonel geliştiricilerin ve şirketlerin bir SaaS ürününe güvenle para ödeyebilmesi için "olmazsa olmaz" kabul edilen temel altyapılar en yüksek öncelikle inşa edilmelidir:

1. **Cloud Sync (Uçtan Uca Şifreli Bulut Senkronizasyonu):**
   - Ortam değişkenleri (environments), API koleksiyonları, regex kalıpları, mock şablonları ve özel snippet'ların cihazlar arası anlık, güvenli ve şifreli (E2EE) senkronizasyonu.
2. **Team Auth, Workspaces & RBAC (Takım Kimliği ve Yetkilendirme):**
   - Çoklu çalışma alanları (multi-tenant workspaces), takım üyesi davet mekanizması, rol tabanlı erişim kontrolü (Owner, Admin, Member, Viewer).
   - Kurumsal kimlik doğrulama (SSO: GitHub, Google, SAML/Okta).
3. **Monetization & Billing (Ödeme ve Abonelik Altyapısı):**
   - Stripe / Paddle entegrasyonu; Free (Sonsuz Bireysel Sınırlı), Pro (Gelişmiş Geliştirici), Team (İş Birliği & Sınırsız Çalışma Alanı) katmanları.
   - Müşteri portalı, otomatik faturalandırma, sunucu taraflı lisans/yetki doğrulama ve koltuk (seat) yönetimi.
4. **Şeffaf Telemetri ve Güvenilirlik:**
   - Kullanıcı onayına bağlı (opt-in), KVKK/GDPR uyumlu anonimleştirilmiş kullanım analitiği ve hata raporlama (Sentry / OpenTelemetry).

---

## 4. İlke: Diferansiyasyon ve Rekabet Kalkanı (Differentiation Pillars & Moat)

ZenDev'i sıradan ücretsiz web sitelerinden ayıran ve ekiplerin düzenli abonelik ödemesini sağlayan 3 stratejik diferansiyasyon sütunu:

1. **Workflow Chains (İş Akışı Zincirleri):**
   - Stüdyoları birbirine bağlayan görsel veya scriptable pipeline motoru.
   - *Örnek Senaryo:* cURL ile API endpoint'ine istek at → Dönen JSON yanıtından belirli alanı ayıkla → Base64 / Hex formatına dönüştür → HMAC-SHA256 ile imzala → Webhook'a otomatik post et.
2. **Paylaşılabilir Takım Koleksiyonları (Team Collections):**
   - Versiyon kontrollü (Git-friendly), ekipler arasında tek tıkla paylaşılan API uç noktaları, mock veri setleri, regex kuralları, cron takvimleri ve Mermaid mimari diyagramları.
3. **AI Destekli Akıllı Ayrıştırıcı (AI Smart Dispatcher):**
   - Panodaki veya editördeki veriyi otomatik olarak tanıyan (JWT mi, bozuk JSON mı, cURL komutu mu, SQL sorgusu mu, stacktrace mi?) ve geliştiriciyi tek tıkla doğru stüdyoya yönlendirip onarım/analiz öneren akıllı yerel asistan.

---

## 5. İlke: Ödeme Testi (The Willingness-to-Pay Gate)

Her yeni özellik önerisi, mimari karar veya PR öncesinde asistan şu acımasız soruyu sormak ve yanıtlamak zorundadır:

> **"Bir yazılım geliştirici veya mühendislik ekibi bu özellik için aylık/yıllık para öder mi, yoksa 2 saniyede ücretsiz bir web sitesinde veya tek satırlık CLI komutunda bu işi çözer mi?"**

- **Cevap "Ücretsiz alternatif yeterli" ise:** Özellik ana roadmap'ten DERHAL REDDEDİLİR veya en fazla arka plan bonus modülü statüsüne düşürülür. Asla ana pazarlama mesajına veya çekirdek sürüme dahil edilmez.
- **Cevap "Evet, değer yaratır ve para ödenir" ise:** Özelliğin Takım İş Birliği, Workflow Zincirleme, Güvenlik veya Bulut Senkronizasyonu ile nasıl entegre olacağı belgelenerek uygulanır.

---

## Bağlayıcılık ve Uygulama Protokolü

- **Hiçbir asistan veya geliştirici,** bu 5 ilkeyi atlayarak "bu özellik güzel olur", "şunu da ekleyelim" şeklinde keyfi geliştirmeler yapamaz.
- Özellik önerileri daima `.agents/skills/zendev-feature-gatekeeper/` üzerinden 5 filtre ile değerlendirilir.
- Tüm mimari değişiklikler `YAPILACAKLAR.md` yol haritasında tanımlanan faz sırasına uygun ilerlemek zorundadır.
