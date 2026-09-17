---
type: project
created: 2026-09-17
updated: 2026-09-17
---

# ZenDev SaaS Dönüşüm Direktifi — Kurumsal Sistem Kararı

## Kurumsal Karar Özeti
ZenDev (NexusHub) projesi, yerel bir İsviçre çakısı / hobi araç kutusundan **API-ağırlıklı geliştiriciler ve mühendislik ekipleri için B2B/Pro Masaüstü Geliştirici SaaS platformuna** dönüştürülmüştür.

Bu karar doğrultusunda tüm mimari, kodlama, ürün tasarımı ve PR süreçlerinde **5 Temel İlke** en üst düzey değişmez direktif olarak kabul edilmiştir.

---

## 5 Temel İlke ve Yol Haritası

### 1. Ürün Konumlandırması (Positioning)
- **Hedef Kitle:** API-ağırlıklı çalışan backend, frontend, full-stack geliştiriciler ve küçük-orta ölçekli yazılım ekipleri.
- **Değer Önerisi:** Dağınık web araçlarını (JSON, cURL/API, Regex, JWT, Cron, Mermaid, Encoding) tek, ultra hızlı, offline-first, yerel gizlilik korumalı masaüstü uygulamasında birleştirmek ve takımlar arası iş birliği ile güçlendirmek.
- **Model:** B2B/Team ağırlıklı koltuk bazlı abonelik ve B2C PLG Pro katmanı.

### 2. Kaldırılacak / Ayrıştırılacak Modüller
- **Sistem Müdahale Araçları:** `Port Killer (Port Watchdog)` ve `System Optimizer` çekirdek SaaS ürününden tamamen kaldırılmalıdır (OS-seviyesi kırılganlık ve destek yükü).
- **Sessiz Otonom Güncelleyici:** Arka planda gizli çalışan (`CREATE_NO_WINDOW`) sessiz güncelleyici yasaklanmıştır. Güvenlik ve EDR malware şüphelerini önlemek için güncellemeler sürüm notları ile şeffaf, kullanıcı onaylı bir modal akışına dönüştürülmelidir.
- **Kötüye Kullanım / Anonimlik Araçları:** `Temp Mail` yasal riskler ve abuse nedeniyle çekirdekten tasfiye edilmelidir.
- **Düşük Diferansiyasyonlu OS Araçları:** `Clipboard Manager` ve basit not defteri (scratchpad) gibi araçlar ana pazarlamadan ve yol haritasından düşürülmelidir.

### 3. Table Stakes SaaS Altyapısı (Öncelikli)
- **Cloud Sync:** Çalışma alanları, ortam değişkenleri (environments), API test koleksiyonları ve regex/mock şablonlarının uçtan uca şifreli (E2EE) senkronizasyonu.
- **Team Auth & Workspaces:** Multi-tenant organizasyonlar, takım davetleri, RBAC (Owner/Admin/Member/Viewer), SSO (GitHub/Google/SAML).
- **Ödeme ve Abonelik (Billing):** Stripe/Paddle entegrasyonu, Free/Pro/Team planları, sunucu taraflı lisanslama ve koltuk (seat) yönetimi.
- **Gizlilik Odaklı Telemetri:** Kullanıcı onaylı (opt-in) hata takibi (Sentry / OpenTelemetry).

### 4. Diferansiyasyon Sütunları (B2B Moat)
- **Workflow Chains (İş Akışı Zincirleri):** Geliştirici araçlarını birbirine bağlayan görsel ve scriptable pipeline motoru (cURL → JSON parse → Base64 encode → HMAC sign → Webhook POST).
- **Paylaşılabilir Takım Koleksiyonları (Team Collections):** Versiyon kontrollü, takım içi paylaşılan API uç noktaları, mock veri setleri, regex kuralları, mimari şemalar.
- **AI Destekli Akıllı Ayrıştırıcı (AI Smart Dispatcher):** Pano veya girdi verisini otomatik tespit edip doğru araca yönlendiren ve düzeltmeler öneren akıllı yerel analiz katmanı.

### 5. Ödeme Testi (Willingness-to-Pay Gate)
- Soru: *"Bir yazılım geliştirici veya ekip bu özellik için ayda para öder mi, yoksa 2 saniyede ücretsiz bir web sitesi veya 1 satırlık CLI komutuyla çözer mi?"*
- Ücretsiz alternatif yeterliyse özellik çekirdek yol haritasından reddedilir.
- Tüm öneriler `.agents/skills/zendev-feature-gatekeeper/` 5 filtre süzgecinden geçmek zorundadır.

---

## İlgili Dosyalar
- Kural: `.agents/rules/zendev-saas-directive.md`
- Gatekeeper: `.agents/skills/zendev-feature-gatekeeper/SKILL.md`
- ZenDev Skill: `.agents/skills/zendev/SKILL.md`
- Backlog / Roadmap: `YAPILACAKLAR.md`
- Hızlı Referans: `.agents/rules/quick-reference.md`
