---
name: zendev
description: >-
  ZenDev Tauri v2 + Rust masaustu SaaS uygulamasina ait mimari bilgi,
  SaaS Donusum Direktifi, i18n kaliplari, IPC konvansiyonlari,
  teknoloji stack ve backlog. ZenDev'da degisiklik yapilacagi zaman bu skill'i oku.
when_to_use: "ZenDev veya NexusHub uygulamasında mimari, i18n, IPC, sayfa ve araç geliştirmeleri veya yol haritası değişiklikleri yapılırken kullanılır."
allowed-tools: Read, Edit, Write, Glob, Grep
version: 1.0.0
---

# ZenDev Proje Skill & Mimari Kılavuz

> **ÜST DİREKTİF (P0):** Bu skill'i uygulayan asistan, her türlü kod ve mimari kararında `.agents/rules/zendev-saas-directive.md` (ZenDev SaaS Dönüşüm Direktifi) kurallarına, `YAPILACAKLAR.md` yol haritasına ve [zendev-feature-gatekeeper](../zendev-feature-gatekeeper/SKILL.md) kurallarına uymakla yükümlüdür.

---

## 1. Teknoloji Yığını (Tech Stack)
- **Masaüstü Çerçevesi:** Tauri v2 (`src-tauri/`)
- **Arka Plan (Backend):** Rust (tokio, reqwest, aes-gcm, lopdf, image)
- **Ön Yüz (Frontend / Renderer):** React 19 + TypeScript + Vite (`src/renderer/`)
- **Stil & Tasarım:** Tailwind CSS + Özel Tasarım Tokenları (`nexus-*` renk sistemi)
- **Animasyon:** Framer Motion
- **İkonlar:** Lucide React
- **Çift Dil Desteği (i18n):** `src/renderer/src/lib/i18n.tsx` — `useT()` hook, `I18nProvider`, `tr.json` / `en.json` (Tam 1-e-1 anahtar eşliği)
- **IPC Köprüsü:** `src/renderer/src/lib/ipc.ts` (Tauri `invoke` API'sini sarmalayan tip-güvenli `nexusAPI`)
- **Derleme & Doğrulama:** `npm run build` (Vite derlemesi), `cargo check` / `cargo test` (`src-tauri`)

---

## 2. ZenDev SaaS Dönüşüm Direktifi (5 Bağlayıcı İlke)

Tüm geliştirmelerde aşağıdaki 5 ilke en üst düzey kural olarak uygulanır:

1. **Konumlandırma (B2B/Pro Developer SaaS):**
   - ZenDev genel bir hobi kutusu veya OS kurcalama aracı değildir.
   - API-ağırlıklı geliştiriciler ve yazılım ekipleri için dağınık web araçlarını tek bir güvenli, offline-first masaüstü platformunda toplayan kurumsal SaaS'tır.
2. **Kaldırılacak / Ayrıştırılacak Modüller:**
   - `Port Killer (Port Watchdog)` ve `System Optimizer` çekirdekten kaldırılacaktır.
   - `Temp Mail` spam ve kötüye kullanım riski nedeniyle çekirdekten çıkarılacaktır.
   - `Clipboard Manager` ve basit not araçları ana pazarlama ve yol haritasından düşürülmüştür.
3. **Table Stakes Altyapı:**
   - Cloud Sync (E2EE senkronizasyon), Team Auth & Workspaces (RBAC, SSO), Stripe/Paddle abonelik ve faturalandırma, sunucu lisanslama.
4. **Diferansiyasyon:**
   - Workflow Chains (araçları birbirine bağlama), Takım Koleksiyonları (paylaşımlı API ve şablon depoları), AI Akıllı Ayrıştırıcı (format tanıma ve yönlendirme).
5. **Ödeme Testi:**
   - Her özellik için "Bir geliştirici/ekip buna aylık para öder mi, yoksa ücretsiz web/CLI aracı yeterli mi?" sorgusu zorunludur.

---

## 3. Özellik ve Araç Kabul Kuralı (Feature Gatekeeper Entegrasyonu)

> 🛑 **ZORUNLU ÖN KOŞUL:** ZenDev için önerilen HER YENİ ÖZELLİK, ARAÇ veya BACKLOG MADDESİ öncelikle [`zendev-feature-gatekeeper`](../zendev-feature-gatekeeper/SKILL.md) 5 aşamalı filtresinden geçirilmek zorundadır. Yüzeysel veya otomatik onay kesinlikle verilemez.

### 5 Aşamalı Filtre Süzgeci
1. **Filtre 1 — Ödeme Testi:** Kullanıcı bu araç için ayda para öder mi, yoksa ücretsiz web/CLI aracı yeterli mi?
2. **Filtre 2 — Kişisel İhtiyaç mı, Genel İhtiyaç mı?:** Kurucunun anlık kişisel hevesi mi, yoksa hedef kitle (API-ağırlıklı geliştiriciler ve ekipler) için tekrarlayan bir problem mi?
3. **Filtre 3 — Çekirdekle İlişki Testi:** Geliştirici stüdyoları (JSON, cURL, Regex, JWT, Cron, Mermaid, Encoding) çekirdeğini güçlendiriyor mu, yoksa ürünü dağınık bir araç kutusuna (Swiss Army knife) mı döndürüyor?
4. **Filtre 4 — Risk ve Güven Testi:** Kullanıcı onaysız arka plan müdahalesi, sistem müdahalesi, kötüye kullanım (spam/abuse) veya güvenlik riski var mı?
5. **Filtre 5 — Bakım Maliyeti Testi:** OS/platform bazlı kırılganlık veya yüksek harici destek yükü getiriyor mu?

### Kalıcı Kara Liste (Asla Kabul Edilmeyecekler)
- Sistem seviyesi müdahale araçları (port/process öldürme, DNS flush, önbellek temizleme)
- Kullanıcı onaysız sessiz arka plan güncelleyicileri/işlemleri (`CREATE_NO_WINDOW` arka plan güncelleyicileri EDR/antivirüs tarafından zararlı yazılım davranışı sayılır)
- Kötüye kullanıma açık anonimlik araçları (temp mail vb.)
- Düşük diferansiyasyonlu OS-native araçlar (clipboard manager, not defteri vb.)

---

## 4. Mimari Uyarılar ve Güvenlik Standartları

### 🛑 Sessiz Otonom Güncelleyici Uyarısı (CRITICAL)
- **Kural:** Arka planda kullanıcının bilgisi dışında çalışan (`CREATE_NO_WINDOW`) otonom NSIS güncelleme akışı KESİNLİKLE YASAKTIR.
- **Mimari Gerekçe:** Kurumsal ortamlarda Windows Defender, CrowdStrike, SentinelOne gibi EDR ve antivirüs sistemleri sessiz arka plan yükleyicilerini zararlı yazılım (malware/dropper) davranışı olarak işaretler.
- **Zorunlu Akış:** Güncellemeler kontrol edilir, yeni sürüm varsa kullanıcıya sürüm notları (changelog) ile bir bildirim veya modal sunulur. İndirme ve kurulum yalnızca **açık kullanıcı onayı** (`Şimdi Güncelle` butonu) alındığında başlatılır.

### 🛑 Sistem Müdahalesi Uyarısı
- İşletim sistemi seviyesinde süreç sonlandırma (`taskkill`), DNS flush veya sistem dosyalarını silme gibi tehlikeli kodlar çekirdeğe eklenemez.

---

## 5. Dizin Yapısı
```
NexusHub/
├── src-tauri/                 ← Rust Arka Planı (Tauri v2)
│   ├── src/
│   │   ├── lib.rs            ← Tauri komut kayıtları ve eklentiler
│   │   ├── main.rs           ← Uygulama giriş noktası
│   │   ├── process_ext.rs    ← Windows CREATE_NO_WINDOW yardımcıları
│   │   ├── hwid.rs           ← Donanım kimliği (node-machine-id uyumlu)
│   │   └── ...               ← Ağ, kripto, pdf, görsel modülleri
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/renderer/src/          ← React 19 Frontend
│   ├── pages/                ← Stüdyo sayfaları (JsonStudio, JwtStudio, vb.)
│   ├── components/           ← Sidebar, BaseToolTemplate, TitleBar, vb.
│   ├── lib/
│   │   ├── ipc.ts            ← Typed nexusAPI köprüsü
│   │   ├── i18n.tsx          ← useT() hook ve I18nProvider
│   │   └── cyberAudio.ts     ← Web Audio haptik ses motoru
│   └── locales/
│       ├── tr.json           ← Türkçe çeviriler
│       └── en.json           ← İngilizce çeviriler
│
├── .agents/                   ← Agent Kit, Kurallar ve Hafıza
│   ├── rules/
│   │   └── zendev-saas-directive.md  ← Bağlayıcı SaaS kuralları
│   ├── memory/
│   │   └── MEMORY.md                 ← Kalıcı sistem hafızası
│   └── skills/
│       ├── zendev/SKILL.md           ← Bu kılavuz
│       └── zendev-feature-gatekeeper/ ← 5 aşamalı özellik filtresi
│
├── AGENTS.md / GEMINI.md / CLAUDE.md / .cursorrules ← Asistan direktifleri
└── YAPILACAKLAR.md            ← Tek yetkili ürün yol haritası ve backlog
```

---

## 6. Yeni Tool Ekleme — Adım Adım
0. **Gatekeeper Değerlendirmesi:** Özelliği/aracı `@zendev-feature-gatekeeper` 5 filtre testinden geçir ve gerekçeli onay al. Kalıcı kara liste maddeleri doğrudan elenir.
1. `src/renderer/src/pages/YeniTool.tsx` oluştur.
2. `BaseToolTemplate` kullan (icon, title, description, gradient props).
3. `useT()` ile i18n ekle — hiç hardcoded string kalmamalı.
4. `src/renderer/src/App.tsx` rotasına ekle.
5. `src/renderer/src/components/Sidebar.tsx` navigasyonuna ekle.
6. `src/renderer/src/pages/Dashboard.tsx` araç kartlarına ekle.
7. `tr.json` ve `en.json` dosyalarına anahtarları tam eşlikle ekle.
8. Rust IPC gerektiriyorsa `src-tauri/src/` içinde komut yaz, `lib.rs` içine kaydet ve `ipc.ts` içine tip ekle.

---

## 7. Yol Haritası ve Backlog (YAPILACAKLAR.md ile Senkron)
1. **Faz 1 — Modül Temizliği & Güvenlik:**
   - Port Killer ve System Optimizer'ın çekirdekten kaldırılması.
   - Sessiz güncelleyicinin şeffaf, onaylı modal akışına refactor edilmesi.
   - Temp Mail'in yasal/abuse riskleri nedeniyle tasfiyesi.
2. **Faz 2 — Table Stakes SaaS Altyapısı:**
   - E2EE Cloud Sync (çalışma alanları ve koleksiyonlar).
   - Team Auth, Workspaces ve RBAC.
   - Stripe / Paddle ödeme, abonelik yönetimi ve sunucu lisanslama.
3. **Faz 3 — Diferansiyasyon & Moat:**
   - Workflow Chains (stüdyo zincirleme motoru).
   - Paylaşılabilir Takım Koleksiyonları.
   - AI Akıllı Ayrıştırıcı (Smart Dispatcher).
