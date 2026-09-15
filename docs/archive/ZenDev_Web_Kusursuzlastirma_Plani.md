# 🌐 ZENDEV RESMİ WEB SİTESİ DEVASA KUSURSUZLAŞTIRMA VE BÜYÜME PLANI

> **Motto:** "Turn ZenDev.app into a 10/10 High-Conversion, Zero-Friction Global Showcase"  
> **Denetlenen Sistemler:** `server/src/landingPageHtml.ts`, `server/src/index.ts`, `server/src/routes/webhook.ts`, `server/src/keyGen.ts`  
> **Canlı Adres:** `https://zendev-production-4a5b.up.railway.app`  
> **Denetim Kurulu:** AG-Kit Specialist Subagents (`Web UI/UX & Conversion`, `SEO & Performance`, `Trust & Monetization`)

---

## 📊 1. ÖZET DENETİM KARNESİ (AUDIT SCORECARD)

| Boyut | Mevcut Durum | Tespit Edilen Kritik Sorun | Hedeflenen Seviye |
|---|---|---|---|
| **Dönüşüm & CTA** | ⚠️ **40/100** | İndirme butonunda *"Çok Yakında"* kilidi var; kullanıcı 2.4.0'ı indiremiyor. Shopier ve LemonSqueezy linkleri kırık/genel. | **100/100** (Tek tıkla v2.4.0 indirme & sorunsuz ödeme) |
| **Mobil UI/UX** | ⚠️ **55/100** | Mobilde menü linkleri kayboluyor, **hamburger drawer yok**. Ses efektleri varsayılan açık. | **95/100** (Akıcı mobil menü, sessiz açılış, WCAG AA) |
| **Teknik SEO** | ⚠️ **45/100** | `og:image` ve `twitter:image` yok. `/robots.txt` ve `/sitemap.xml` 404 dönüyor. Canonical URL eksik. | **100/100** (Kusursuz Open Graph, sitemap & robots) |
| **Schema.org** | ⚠️ **60/100** | Sadece temel `SoftwareApplication` var. `FAQPage` ve `Organization` şeması yok. | **100/100** (Google SERP akordeon zengin sonuçları) |
| **Performans** | ⚠️ **50/100** | 295 KB HTML sıkıştırmasız iletiliyor (Express `compression` yok). Matrix yağmuru arka planda pili bitiriyor. | **95/100** (Gzip ile ~45 KB, görünürlük kontrollü canvas) |
| **Güven & Yasal** | ⚠️ **35/100** | Privacy Policy, Terms of Service ve Refund Policy metinleri yok. Footer'da eski "N" logosu kalmış. | **100/100** (Tam yasal şeffaflık & 30 gün iade garantisi) |
| **Çoklu Dil (i18n)** | ⚠️ **30/100** | Sayfanın %85'i İngilizce modunda dahi Türkçe kalıyor. Otomatik dil/para birimi algılama yok. | **95/100** (Tam EN/TR kapsamı, IP/Browser dil tespiti) |

---

## 🚨 2. ANINDA GİDERİLMESİ GEREKEN EN KRİTİK 7 HATA (P0 BLOCKERS)

1. **İndirme Butonundaki Kilit (Download Blocker):**
   - *Hata:* Hero alanındaki `Windows için İndir` butonuna basıldığında `handleDownloadDisabled()` fonksiyonu çalışıyor, ekrana *"İndirmeler Geçici Olarak Kapalı"* uyarısı verip bekleme listesi modalı açıyor.
   - *Çözüm:* Buton doğrudan en güncel GitHub Release indirme linkine bağlanmalı:  
     `https://github.com/zerviatr/NexusHub/releases/latest/download/ZenDev-Setup-2.4.0.exe`
2. **Kırık & Genel Ödeme Linkleri:**
   - *Hata:* Shopier linki doğrudan `https://shopier.com` ana sayfasına gidiyor! LemonSqueezy linki ise genel mağaza sayfasına yönlendiriyor (`zendev.lemonsqueezy.com`). Discord linki `https://discord.gg` kırık.
   - *Çözüm:* Shopier için gerçek ürün veya dükkan URL'si; LemonSqueezy için doğrudan `/checkout/buy/{variant_id}` parametreli güvenli ödeme modalı entegre edilmeli.
3. **Webhook & Lisans Süresi Hatası (`server/src/routes/webhook.ts` & `keyGen.ts`):**
   - *Hata 1:* Sitede satılan paket adı "Studio". Webhook ise sadece `lifetime`, `team` ve `free` kelimelerini arıyor. Studio alan kullanıcıya sistem `tier = 'pro'` atıyor (2 cihaz yerine 3 cihaz verilmiyor).
   - *Hata 2:* Sitede "Pro Lifetime" satılıyor. Fakat `keyGen.ts` içinde `tier === 'pro'` lisansları 12 ay sonra expire ediyor! Sadece `tier === 'lifetime'` süresiz (`0`).
   - *Çözüm:* Webhook içine `studio` kontrolü eklenmeli ve Pro Lifetime alan kullanıcılara `expires_at = 0` atanmalı.
4. **Sürüm Numarası Çelişkileri:**
   - *Hata:* Hero'da `v2.4.0`, simülatör başlığında `v2.2.0`, changelog'da `v2.0.3` yazıyor.
   - *Çözüm:* Sitedeki tüm sürüm referansları tek bir merkezden `v2.4.0` olarak eşitlenmeli.
5. **Eksik `og:image` ve Sosyal Kartlar:**
   - *Hata:* `og:image` ve `twitter:image` olmadığı için Twitter, Discord, WhatsApp ve LinkedIn'de paylaşılan linkler gri boş kutu olarak çıkıyor.
   - *Çözüm:* 1200x630 yüksek çözünürlüklü ZenDev Cyberpunk banner görseli meta etiketlerine eklenmeli.
6. **404 Dönen robots.txt ve sitemap.xml:**
   - *Hata:* `server/src/index.ts` içinde `/robots.txt` ve `/sitemap.xml` route'ları tanımlı değil, Google botlarına 404 dönüyor.
   - *Çözüm:* Express seviyesinde dinamik ve standartlara uygun sitemap ve robots yanıtı verilmeli.
7. **Eski "NexusHub" Logo Kalıntısı:**
   - *Hata:* Footer'daki logo kutusunda hala eski NexusHub "N" harfi duruyor.
   - *Çözüm:* Yeni ZenDev "Z" vektör logosu ile değiştirilmeli.

---

## 🛠️ 3. DÖRT AŞAMALI DEVASA UYGULAMA PLANI (EXECUTION PHASES)

### FAZ 1: Dönüşüm, İndirme ve Ödeme Omurgasının Tamiri (Hemen)
- [x] İndirme butonunun kilidini kaldır, doğrudan `ZenDev-Setup-2.4.0.exe` indirmesini başlat.
- [x] Tüm sürüm numaralarını `v2.4.0` olarak sabitle.
- [x] `server/src/routes/webhook.ts` ve `keyGen.ts` içindeki Studio paketi ve Lifetime süre mantığını düzelt.
- [x] Shopier ve LemonSqueezy yönlendirmelerini doğru ödeme sayfalarına bağla.
- [x] Footer'daki eski "N" logosunu "Z" ZenDev logosuyla güncelle.

### FAZ 2: Mobil Navigasyon, UI/UX ve Ses Ergonomisi
- [x] **Mobil Hamburger Menü:** 768px altındaki ekranlar için sağdan kayarak açılan şık cyberpunk drawer menü ekle (`Simülatör`, `Cephanelik`, `Fiyatlandırma`, `SSS`, `İndir`).
- [x] **SFX Varsayılan Kapalı:** Web Audio API seslerini varsayılan olarak `false` yap; kullanıcı hoparlör ikonuna basarsa aktif olsun.
- [x] **Above-the-Fold Görsel:** Hero başlığının hemen altına perspektifli bir ZenDev masaüstü arayüz görseli/mockup'ı yerleştir.
- [x] **Canlı Aktivasyon Bildirimleri (Social Proof Toast):** 35 saniyede bir sol alttan hafifçe beliren gerçekçi lisans aktivasyon balonu entegre et.
- [x] **WCAG AA Kontrast:** 10px altındaki mikro etiketleri minimum 12px'e çek ve okunabilirliği garantiye al.

### FAZ 3: SEO, Schema.org, Core Web Vitals & Performans
- [x] `server/src/index.ts` içine `/robots.txt` ve `/sitemap.xml` rotalarını ekle.
- [x] `<head>` içine `og:image`, `twitter:image`, `<link rel="canonical">` etiketlerini ekle.
- [x] Rich Results için `FAQPage` ve `Organization` JSON-LD yapılandırılmış verilerini entegre et.
- [x] Express sunucusuna `compression` (Gzip) middleware'i ekleyerek HTML transfer boyutunu **295 KB'tan ~45 KB'a düşür**.
- [x] Matrix yağmuru canvas'ına `IntersectionObserver` ekleyerek ekran dışındayken GPU/CPU tüketimini durdur.

### FAZ 4: Güven, Hukuk, i18n ve Terk Edilmiş Sepet Kancası
- [x] **Yasal Sayfalar / Modallar:**
  - `Gizlilik Politikası (Privacy Policy)`
  - `Kullanım Şartları (Terms of Service / EULA)`
  - `30 Gün Koşulsuz İade Politikası (Refund Policy)`
- [x] **Otomatik Dil ve Para Birimi Tespiti:** `navigator.language` ile yabancı ziyaretçilere otomatik olarak İngilizce arayüz ve USD ($) fiyatlarını aç.
- [x] **Tam i18n Çevirisi:** Arsenal gridi, karşılaştırma tablosu, fiyat kartları ve SSS bölümlerinin İngilizce tercümelerini `translations` sözlüğüne ekle.
- [x] **Exit-Intent Modal:** Sayfadan ayrılmak isteyen kullanıcılara %20 indirim kuponu (`ZENDEV20`) sunan çıkış niyet kancası ekle.
