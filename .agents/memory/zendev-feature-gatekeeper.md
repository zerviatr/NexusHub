---
type: project
created: 2026-09-16
updated: 2026-09-16
---

# ZenDev Feature Gatekeeper Protocol

## Kural
ZenDev (NexusHub) için önerilen her yeni özellikte ve araçta, kişisel heveslerden veya "bu havalı olur" dürtüsünden kaynaklanan özellik şişmesini (feature bloat) önlemek amacıyla **`zendev-feature-gatekeeper`** çerçevesi ve 5 aşamalı filtre zorunlu olarak işletilir.

Asistan hiçbir zaman yüzeysel/otomatik onay ("harika fikir, ekleyelim") veremez. Varsayılan tavır şüphecidir: önce sorgula/reddet, yalnızca 5 filtreden geçenleri kabul et.

## 5 Aşamalı Filtre
1. **Filtre 1 — Ödeme Testi:** Kullanıcı bu özellik için ayda para öder mi, yoksa 2 saniyede ücretsiz web/CLI aracıyla mı çözer? Ücretsiz alternatif yeterliyse reddet veya arka plan bonusu yap.
2. **Filtre 2 — Kişisel İhtiyaç mı, Genel İhtiyaç mı?:** Sadece kurucunun kendi akışından mı doğdu, yoksa hedef kitlenin (API-ağırlıklı geliştiriciler/ekipler) tekrarlayan genel sorunu mu? Kurucuya özgüyse doğrudan reddet.
3. **Filtre 3 — Çekirdekle İlişki Testi:** Geliştirici stüdyoları (JSON, cURL/API, Regex, JWT, Cron, Mermaid, Encoding) odağını güçlendiriyor mu, yoksa dağınık bir araç kutusuna (Swiss Army knife) mı dönüştürüyor? Zayıfsa reddet veya harici eklenti öner.
4. **Filtre 4 — Risk ve Güven Testi:** Kullanıcı onaysız arka plan müdahalesi, sistem müdahalesi, kötüye kullanım veya güvenlik/gizlilik riski var mı? Varsa doğrudan reddet.
5. **Filtre 5 — Bakım Maliyeti Testi:** OS/platform bazlı kırılganlık veya yüksek harici destek yükü getiriyor mu? Diferansiyasyon maliyeti karşılamıyorsa reddet.

## Kalıcı Kara Liste (Asla Core'a Alınmayacaklar)
- Sistem seviyesi müdahale araçları (port/process öldürme, DNS flush, cache temizleme)
- Onaysız sessiz arka plan işlemleri / güncelleyiciler (malware şüphesi riski)
- Kötüye kullanıma açık anonimlik araçları (temp mail vb.)
- OS-native veya genel düşük diferansiyasyonlu araçlar (clipboard manager, not defteri vb.)

## İzin Verilen B2B / Çekirdek Büyüme İstisnaları
- Workflow Chains (araçları zincirleme)
- Paylaşılabilir Takım Koleksiyonları (B2B team sharing)
- AI Destekli Akıllı Ayrıştırıcı (araç önerme katmanı)

## İlgili Dosyalar
- Skill: `.agents/skills/zendev-feature-gatekeeper/SKILL.md`
- ZenDev Skill: `.agents/skills/zendev/SKILL.md`
- Hızlı Referans: `.agents/rules/quick-reference.md`
