import { ToolItem, PricingPlan, Testimonial, FaqItem } from './types';

export const ZENDEV_TOOLS: ToolItem[] = [
  // ── SİBER GÜVENLİK & KRİPTOGRAFİ ─────────────────────────────
  {
    id: 'cyber-fortress',
    name: 'CyberFortress',
    category: 'security',
    titleTr: 'AES-256-GCM Askeri Kasa & DoD 7-Pass Shredder',
    titleEn: 'AES-256-GCM Military Vault & DoD 7-Pass Shredder',
    descriptionTr: 'Hassas dosya ve metinlerinizi kuantum-dirençli AES-256-GCM ile şifreleyin. DoD 5220.22-M 7-aşama üzerine yazma algoritmasıyla verileri geri getirilemez şekilde imha edin.',
    descriptionEn: 'Encrypt confidential files and text with quantum-resilient AES-256-GCM. Obliterate files irrecoverably using the DoD 5220.22-M 7-pass overwrite standard.',
    badgeTr: 'Askeri Standart',
    badgeEn: 'Military Grade',
    icon: 'ShieldAlert',
    hasInBrowserDemo: false,
    highlightTag: 'AES-256 + Shredder',
    techSpecs: ['AES-256-GCM', 'PBKDF2 / Argon2', 'DoD 5220.22-M', 'Sıfır Bulut İzi']
  },
  {
    id: 'hash-studio',
    name: 'HashStudio',
    category: 'security',
    titleTr: 'Çoklu Hash & Kriptografik İmza Laboratuvarı',
    titleEn: 'Multi-Hash & Cryptographic Signature Lab',
    descriptionTr: 'MD5, SHA-1, SHA-256, SHA-512, bcrypt ve HMAC hashlerini tek tıkla üretin. Büyük dosyaların sağlama toplamlarını (checksum) bellek taşması olmadan hesaplayın.',
    descriptionEn: 'Generate MD5, SHA-1, SHA-256, SHA-512, bcrypt, and HMAC signatures in milliseconds. Calculate checksums for multi-gigabyte files with OOM safety.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Binary',
    hasInBrowserDemo: true,
    highlightTag: 'HMAC & Checksums',
    techSpecs: ['Web Crypto API', 'SHA-256 / SHA-512', 'HMAC Doğrulama', 'Streaming Hash']
  },
  {
    id: 'password-generator',
    name: 'PasswordGenerator',
    category: 'security',
    titleTr: 'Kriptografik Parola & Entropi Kalkanı',
    titleEn: 'Cryptographic Password & Entropy Shield',
    descriptionTr: 'Donanım kaynaklı CSPRNG rastgeleliği ile kırılması yüzyıllar sürecek parolalar üretin. Canlı zxcvbn entropi puanlamasıyla zayıf şifreleri anında tespit edin.',
    descriptionEn: 'Generate bulletproof passwords with hardware CSPRNG entropy. Detect vulnerabilities instantly with real-time zxcvbn entropy scoring.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'KeyRound',
    hasInBrowserDemo: true,
    highlightTag: 'CSPRNG + zxcvbn',
    techSpecs: ['CSPRNG Rastgelelik', 'zxcvbn Entropi', 'Karakter Seti Kuralları', 'Sızıntı Kontrolü']
  },
  {
    id: 'universal-decrypter',
    name: 'UniversalDecrypter',
    category: 'security',
    titleTr: 'Evrensel Çoklu Kod Çözücü & Analizci',
    titleEn: 'Universal Multi-Format Decrypter & Decoder',
    descriptionTr: 'Base64, Hex, URL Encode, HTML Entities, Binary, ROT13 ve Sezar şifrelemelerini anında otomatik tespit edip tek tıkla çözün.',
    descriptionEn: 'Auto-detect and decode Base64, Hex, URL Encode, HTML Entities, Binary, ROT13, and Caesar ciphers seamlessly in real-time.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Unlock',
    hasInBrowserDemo: true,
    highlightTag: '7 Format Çözücü',
    techSpecs: ['Base64 / Hex', 'URL & HTML Entity', 'Binary Byte Çevirici', 'Otomatik Biçim Algılama']
  },

  // ── YAZILIM GELİŞTİRİCİ & APİ GÜÇ İSTASYONU ──────────────────
  {
    id: 'api-studio',
    name: 'ApiStudio & CurlRunner',
    category: 'developer',
    titleTr: 'Yerel REST İstemcisi & cURL Köprüsü',
    titleEn: 'Offline REST Client & cURL Bridge',
    descriptionTr: 'Postman ve Insomnia aboneliklerini çöpe atın. Ortam değişkenleri, başlık düzenleyici, gövde doğrulama ve cURL içe/dışa aktarımıyla tamamen yerel API geliştirme.',
    descriptionEn: 'Ditch Postman SaaS lock-in. Full offline REST workstation with environment variables, header presets, JSON body validation, and 1-click cURL runner.',
    badgeTr: 'Postman Katili',
    badgeEn: 'Postman Killer',
    icon: 'Send',
    hasInBrowserDemo: false,
    highlightTag: 'cURL & REST',
    techSpecs: ['cURL Parser', 'Çevre Değişkenleri', 'Gelişmiş Başlıklar', 'İstek Geçmişi']
  },
  {
    id: 'json-sqlite-studio',
    name: 'JsonStudio & SqliteViewer',
    category: 'developer',
    titleTr: 'JSON Ağaç Formatlayıcı & WASM SQLite Konsolu',
    titleEn: 'JSON Tree Formatter & WASM SQLite Console',
    descriptionTr: 'Bozuk JSON verilerini otomatik onarın, renkli ağaç yapısında gezin ve JWT tokenları anında çözün. sql.js WebAssembly ile herhangi bir SQLite veritabanını tarayıcı hızında sorgulayın.',
    descriptionEn: 'Auto-repair broken JSON, navigate complex objects in tree view, and inspect JWT tokens. Run raw SQL queries against any SQLite database via WebAssembly sql.js.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Database',
    hasInBrowserDemo: true,
    highlightTag: 'WASM SQLite',
    techSpecs: ['sql.js WebAssembly', 'JWT Header/Payload', 'JSONPath Sorguları', 'CSV Export']
  },
  {
    id: 'regex-studio',
    name: 'RegexStudio',
    category: 'developer',
    titleTr: 'Düzenli İfade Test & Hata Teşhis Motoru',
    titleEn: 'Regular Expression Tester & Diagnostic Lab',
    descriptionTr: 'Karmaşık düzenli ifadeleri eşzamanlı eşleşme renklendirmesiyle test edin. Yakalama gruplarını (capture groups) ve bayrakları (flags) interaktif hata ipuçlarıyla analiz edin.',
    descriptionEn: 'Test complex regular expressions with live regex match highlighting, capture group inspect, and human-readable syntax breakdown.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Regex',
    hasInBrowserDemo: true,
    highlightTag: 'Anlık Eşleşme',
    techSpecs: ['Canlı RegExp Motoru', 'Grup Ayrıştırma', 'Hazır Regex Kütüphanesi', 'Detaylı Hata İpuçları']
  },
  {
    id: 'dev-sandbox',
    name: 'DevSandbox',
    category: 'developer',
    titleTr: 'İzole JavaScript & TypeScript REPL Konsolu',
    titleEn: 'Isolated JS/TS REPL & Code Sandbox',
    descriptionTr: 'Tarayıcı geliştirici konsolunu kirletmeden, temiz ve izole sanal alanda JavaScript ve TypeScript kod parçacıklarını anında çalıştırıp konsol çıktılarını inceleyin.',
    descriptionEn: 'Safely execute arbitrary JavaScript and TypeScript snippets in an isolated runtime sandbox with formatted console outputs.',
    badgeTr: 'İzole REPL',
    badgeEn: 'Isolated REPL',
    icon: 'Terminal',
    hasInBrowserDemo: false,
    highlightTag: 'JS / TS Koşturucu',
    techSpecs: ['İzole Runtime', 'Konsol Çıktı Yakalama', 'TypeScript Desteği', 'Zaman Aşımı Koruması']
  },
  {
    id: 'fake-data-studio',
    name: 'FakeDataStudio',
    category: 'developer',
    titleTr: 'Sentetik Test Verisi & Mock Üreticisi',
    titleEn: 'Synthetic Mock Data & Factory Generator',
    descriptionTr: 'Veritabanı ve API testleri için tek tıkla binlerce sahte kullanıcı, Türk/Yabancı ad-soyad, sahte TC kimlik, IBAN, kredi kartı ve adres verisi üretip JSON/CSV/SQL formatında indirin.',
    descriptionEn: 'Generate thousands of realistic mock records (users, addresses, emails, credit cards, transactions) in JSON, CSV, or SQL INSERT format for stress testing.',
    badgeTr: 'Mock Veri Fabrikası',
    badgeEn: 'Mock Factory',
    icon: 'Shuffle',
    hasInBrowserDemo: false,
    highlightTag: 'JSON / CSV / SQL',
    techSpecs: ['Yerelleştirilmiş Kimlik', 'Toplu Üretim', 'SQL Schema Uyumlu', 'İlişkisel Çıktı']
  },

  // ── SİSTEM, SÜREÇ & AĞ MÜHENDİSLİĞİ ─────────────────────────
  {
    id: 'network-tools',
    name: 'NetworkTools',
    category: 'system',
    titleTr: 'Gelişmiş Ağ Teşhis & İstihbarat Kiti',
    titleEn: 'Advanced Network Diagnostic & Recon Kit',
    descriptionTr: 'Düşük gecikmeli Ping, DNS A/AAAA/MX/TXT çözümleyici, TCP Port Taraması, Whois sorgulaması ve IP coğrafi konum belirleme araçları.',
    descriptionEn: 'Sub-millisecond ICMP Ping, comprehensive DNS resolver (A/MX/TXT/NS), TCP Port Scanner, Whois lookup, and GeoIP map visualizer.',
    badgeTr: 'Ağ Analizi',
    badgeEn: 'Network Recon',
    icon: 'Network',
    hasInBrowserDemo: false,
    highlightTag: 'DNS & Ping & GeoIP',
    techSpecs: ['DNS Kayıt Analizcisi', 'TCP Socket Scanner', 'Whois İstihbaratı', 'Düşük Gecikme Ölçümü']
  },
  {
    id: 'resource-sentinel',
    name: 'ResourceSentinel',
    category: 'system',
    titleTr: 'Canlı Donanım Teşhisi & Telemetri Radarı',
    titleEn: 'Live Hardware Diagnostics & Telemetry Radar',
    descriptionTr: 'CPU yükü, RAM tahsisi, disk I/O hızları ve sıcaklık sensörlerini saniyelik grafiklerle izleyin. Ağır derleme işlemlerinde sistem darboğazlarını anında yakalayın.',
    descriptionEn: 'Monitor real-time CPU utilization, RAM pressure, disk I/O velocity, and thermal status with 60fps telemetry radar.',
    badgeTr: 'Canlı Radar',
    badgeEn: 'Live Radar',
    icon: 'Activity',
    hasInBrowserDemo: false,
    highlightTag: '60 FPS Donanım',
    techSpecs: ['Çekirdek Başına CPU', 'RAM Bellek Baskısı', 'Disk Okuma/Yazma', 'Termal Eşik Uyarıları']
  },

  // ── GÜNLÜK İŞ AKIŞI & ÜRETKENLİK ───────────────────────────
  {
    id: 'scratchpad',
    name: 'Scratchpad Ultimate',
    category: 'productivity',
    titleTr: 'Çok Sekmeli Markdown Defteri & Sıfır Veri Kaybı',
    titleEn: 'Multi-Tab Markdown Scratchpad & Zero-Loss Engine',
    descriptionTr: 'Elektrik kesilse dahi tek kelime kaybetmeyin. Sekmeli mimari, sözdizimi vurgulamalı Markdown editörü ve yerel otomatik kaydetme motoru.',
    descriptionEn: 'Never lose a thought. Multi-tab Markdown scratchpad with instant SQLite backing, code syntax highlighting, and zero-loss crash resilience.',
    badgeTr: 'Sıfır Veri Kaybı',
    badgeEn: 'Zero Data Loss',
    icon: 'FileText',
    hasInBrowserDemo: false,
    highlightTag: 'Sekmeli Markdown',
    techSpecs: ['Sekmeli Mimari', 'Anlık Markdown Önizleme', 'Yerel SQLite Kalıcılığı', 'Dışa Aktarma']
  },
  {
    id: 'bulk-organizer',
    name: 'BulkOrganizer',
    category: 'productivity',
    titleTr: 'Akıllı Toplu Dosya Yeniden Adlandırma & Düzenleyici',
    titleEn: 'Smart Bulk File Renamer & Category Organizer',
    descriptionTr: 'Yüzlerce dosyayı regex şablonları, sayaçlar, uzantı kuralları ve zaman damgalarıyla anında yeniden adlandırın. Hata yapmadan önce canlı önizleme yapın.',
    descriptionEn: 'Rename hundreds of files simultaneously using regex templates, prefix/suffix counters, and date tokens with live preview before applying.',
    badgeTr: 'Toplu Yeniden Adlandırma',
    badgeEn: 'Batch Renamer',
    icon: 'FolderSync',
    hasInBrowserDemo: false,
    highlightTag: 'Regex Destekli',
    techSpecs: ['Regex Değiştirici', 'Sayı Sayacı & Sıralama', 'Canlı Önizleme Matrisi', 'Geri Alma (Undo) Desteği']
  },
  {
    id: 'pdf-studio',
    name: 'PdfStudio',
    category: 'productivity',
    titleTr: 'Yerel PDF Çalışma İstasyonu & Filigran Kalkanı',
    titleEn: 'Offline PDF Workstation & Security Watermarker',
    descriptionTr: 'Belgelerinizi asla yabancı sunuculara yüklemeyin. pdf-lib tabanlı yerel motor ile PDF sayfalarını birleştirin, bölün, döndürün, şifreleyin ve filigran ekleyin.',
    descriptionEn: 'Never upload sensitive company contracts to third-party cloud tools. Merge, split, rotate, encrypt, and watermark PDFs 100% locally.',
    badgeTr: '100% Yerel PDF',
    badgeEn: '100% Local PDF',
    icon: 'FileCheck2',
    hasInBrowserDemo: false,
    highlightTag: 'Buluta Dosya Yüklemez',
    techSpecs: ['pdf-lib Yerel Motor', 'Sayfa Ayırma/Birleştirme', 'AES Parola Koruma', 'Özelleştirilmiş Filigran']
  },
  {
    id: 'image-toolkit',
    name: 'ImageToolkit',
    category: 'productivity',
    titleTr: 'Görsel Optimizasyonu & EXIF Gizlilik Temizleyici',
    titleEn: 'Image Optimization & EXIF Metadata Scrubber',
    descriptionTr: 'PNG ve JPEG dosyalarını modern WebP ve AVIF formatlarına dönüştürün, kayıpsız sıkıştırın ve fotoğraflardaki GPS konum/cihaz EXIF bilgilerini sıyırın.',
    descriptionEn: 'Convert PNG/JPEG to WebP/AVIF, compress with visual fidelity, and scrub sensitive GPS location and camera EXIF metadata before sharing.',
    badgeTr: 'WebP / AVIF Dönüştürücü',
    badgeEn: 'WebP / AVIF Converter',
    icon: 'Image',
    hasInBrowserDemo: false,
    highlightTag: 'Kayıpsız Sıkıştırma',
    techSpecs: ['WebP & AVIF Çıkış', 'EXIF Metadata Silici', 'Boyutlandırma Motoru', 'Toplu Dönüştürme']
  },
  {
    id: 'color-studio',
    name: 'ColorStudio',
    category: 'productivity',
    titleTr: 'Renk Laboratuvarı & WCAG Erişilebilirlik Denetimi',
    titleEn: 'Color Studio & WCAG 2.1 Contrast Checker',
    descriptionTr: 'HEX, RGB, HSL, OKLCH renk alanları arasında anında dönüşüm yapın. Arka plan ve metin kontrastını WCAG 2.1 AA/AAA standartlarında canlı denetleyin.',
    descriptionEn: 'Convert between HEX, RGB, HSL, and OKLCH. Audit foreground/background contrast compliance with WCAG 2.1 AA/AAA accessibility metrics.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Palette',
    hasInBrowserDemo: true,
    highlightTag: 'WCAG AAA Denetimi',
    techSpecs: ['OKLCH / HSL / HEX', 'WCAG 2.1 AA/AAA Skor', 'Harmonik Palet Üretici', 'CSS Değişken Dışa Aktarma']
  },
  {
    id: 'qr-code-studio',
    name: 'QrCodeStudio',
    category: 'productivity',
    titleTr: 'Vektörel QR Kod İstasyonu & Okuyucu',
    titleEn: 'Vector QR Studio & Offline Decoder',
    descriptionTr: 'WiFi, URL, Metin ve VCard için yüksek çözünürlüklü SVG/PNG QR kodları üretin, logonuzu merkezine yerleştirin ve ekran görüntüsünden QR kod okuyun.',
    descriptionEn: 'Generate high-res vector SVG/PNG QR codes with embedded center logos and custom colors. Read QR codes directly from images offline.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'QrCode',
    hasInBrowserDemo: true,
    highlightTag: 'SVG / PNG Logo Gömme',
    techSpecs: ['Vektörel SVG Çıktı', 'Özel Logo Gömme', 'Hata Düzeltme Seviyesi (H)', 'Görselden QR Okuma']
  },

  // ── YAZILIM GELİŞTİRİCİ: YENİ ELEVASYON STÜDYOLARI (v2.5.3) ──
  {
    id: 'jwt-studio',
    name: 'JwtStudio',
    category: 'developer',
    titleTr: 'JWT & Token Çözümleyici, İmzalayıcı & Süre Takipçisi',
    titleEn: 'JWT & Token Inspector, HMAC-SHA256 Signer & Expiry Tracker',
    descriptionTr: 'JSON Web Token (JWT) başlık ve yüklerini anında çözümleyin, HMAC-SHA256 imzalarını gizli anahtar ile doğrulayın, süre bitiş zaman çizelgesini izleyin ve %100 çevrimdışı imzalı token üretin.',
    descriptionEn: 'Inspect and decode JWT headers and payloads, verify HMAC-SHA256 signatures with custom secrets, track token expiration timelines, and generate signed tokens 100% offline.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'KeyRound',
    hasInBrowserDemo: true,
    highlightTag: 'HMAC-SHA256 & Token',
    techSpecs: ['HMAC-SHA256 İmzalama', 'Canlı Token Çözümleyici', 'Süre Dolanım Zaman Çizelgesi', 'Özel Talep (Claims) Üretici']
  },
  {
    id: 'cron-studio',
    name: 'CronStudio',
    category: 'developer',
    titleTr: 'Görsel Cron İfade Mimarı & Doğal Dil Zamanlayıcısı',
    titleEn: 'Visual Cron Expression Builder & Natural Language Scheduler',
    descriptionTr: '5 segmentli (dakika, saat, gün, ay, haftanın günü) görsel cron ifadeleri oluşturun, Türkçe ve İngilizce doğal dil açıklamalarını inceleyin ve sonraki 10 çalışma zaman damgasını canlı geri sayımla takip edin.',
    descriptionEn: 'Build 5-part cron expressions visually (minute, hour, day, month, weekday), read natural language schedule breakdowns, and forecast the next 10 execution timestamps with live countdowns.',
    badgeTr: 'Doğal Dil Motoru',
    badgeEn: 'Natural Language Engine',
    icon: 'Clock',
    hasInBrowserDemo: false,
    highlightTag: 'Doğal Dil & 10 Çalışma',
    techSpecs: ['5 Segmentli Görsel Kurucu', 'Türkçe & İngilizce Açıklama', 'Sonraki 10 Çalışma Zamanı', 'Popüler Şablon Kütüphanesi']
  },
  {
    id: 'mermaid-studio',
    name: 'MermaidStudio',
    category: 'developer',
    titleTr: 'Canlı Markdown & Mermaid Mimari Şema Tuvali',
    titleEn: 'Real-Time Markdown & Mermaid Architecture Diagram Canvas',
    descriptionTr: 'Akış şemaları (flowchart), sekans diyagramları, ERD ve durum makinelerini siberpunk karanlık temada gerçek zamanlı render edin. Yakınlaştırma/kaydırma kontrolleriyle vektörel SVG veya yüksek çözünürlüklü PNG olarak indirin.',
    descriptionEn: 'Render flowcharts, sequence diagrams, ER diagrams, and state machines in real time. Pan, zoom, and export production-ready vector SVG or high-resolution PNG assets with zero cloud latency.',
    badgeTr: 'Vektörel Şema Tuvali',
    badgeEn: 'Vector Diagram Canvas',
    icon: 'Workflow',
    hasInBrowserDemo: false,
    highlightTag: 'SVG / PNG Vektör Dışa Aktar',
    techSpecs: ['Akış & Sekans Şemaları', 'ERD & Durum Makineleri', 'Vektörel SVG / PNG İndir', 'Siberpunk Karanlık Tema']
  },
  {
    id: 'encoding-studio',
    name: 'EncodingStudio',
    category: 'developer',
    titleTr: 'Evrensel Çok Modlu Base64, Hex & Data-URL Laboratuvarı',
    titleEn: 'Universal Multi-Modal Base64, Hex, Data-URL & Hex Dump Lab',
    descriptionTr: 'Metin, Base64, Hex ve URL formatları arasında iki yönlü eşzamanlı dönüşüm yapın. Medya dosyalarını Data-URL formatına çevirip HTML/CSS kodlarını kopyalayın ve kanonik 16-bayt hex dökümünü etkileşimli inceleyin.',
    descriptionEn: 'Two-way synchronized conversion between Text, Base64, Hex, and URL encoding. Convert media files to Data-URLs with ready-to-use HTML/CSS snippets, and inspect canonical 16-byte hex dumps with interactive byte hover.',
    badgeTr: 'Canlı Demo Var',
    badgeEn: 'Live Demo Available',
    icon: 'Binary',
    hasInBrowserDemo: true,
    highlightTag: '16-Bayt Hex Dökümü',
    techSpecs: ['İki Yönlü Eşzamanlı Çeviri', 'Medya Data-URL Üretici', 'Kanonik 16-Bayt Hex Dökümü', 'C-Array / URL Encode Çıkışı']
  }
];

/**
 * Total active native developer workstations in ZenDev v2.5.3 suite.
 * Synchronized across website Navbar, Hero, Catalog, CommandPalette, and Pricing.
 */
export const TOTAL_TOOLS_COUNT = 27;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    nameTr: 'ZenDev Community Free',
    nameEn: 'ZenDev Community Free',
    badgeTr: 'Kalıcı Ücretsiz',
    badgeEn: 'Free Forever',
    descriptionTr: 'Temel geliştirici yardımcı araçları ve hafif günlük iş akışları için sonsuza dek ücretsiz sürüm.',
    descriptionEn: 'Perpetual free edition for lightweight developer utilities and everyday essential tasks.',
    prices: {
      TRY: { monthly: 0, yearly: 0, monthlyEquivalent: 0, symbol: '₺' },
      USD: { monthly: 0, yearly: 0, monthlyEquivalent: 0, symbol: '$' },
      EUR: { monthly: 0, yearly: 0, monthlyEquivalent: 0, symbol: '€' }
    },
    featuresTr: [
      '8 Temel Geliştirici Stüdyosu (Hash, QR, Regex, Base64 vb.)',
      'Tek Bilgisayarda Yerel & Çevrimdışı Kullanım',
      'Tauri v2 + Rust Ultra Hafif Motor (<26 MB RAM)',
      '%100 Çevrimdışı Çalışma & Sıfır Telemetri',
      'Topluluk Desteği & Açık Dokümantasyon'
    ],
    featuresEn: [
      '8 Essential Developer Studios (Hash, QR, Regex, Base64 etc.)',
      'Single machine offline usage',
      'Tauri v2 + Rust ultra-lean engine (<26 MB RAM)',
      '100% offline privacy & zero telemetry',
      'Community Discord & public documentation'
    ],
    limitationsTr: [
      'ApiStudio REST & cURL Köprüsü (Kilitli)',
      'E2EE Uçtan Uca Şifreli Bulut Senkronizasyonu (Kilitli)',
      'Workflow Chains Pipeline Motoru (Kilitli)',
      'Paylaşılabilir Takım Koleksiyonları (Kilitli)',
      'Mermaid & Cron İfade Stüdyoları (Kilitli)',
      'Çoklu Çalışma Alanları & Koltuk Yönetimi (Kilitli)'
    ],
    limitationsEn: [
      'ApiStudio REST & cURL Bridge (Locked)',
      'E2EE Cross-Device Cloud Sync (Locked)',
      'Workflow Chains Pipeline Engine (Locked)',
      'Shareable Team Collections (Locked)',
      'Mermaid & Cron Architecture Studios (Locked)',
      'Multi-tenant Workspaces & Seat Admin (Locked)'
    ],
    ctaTr: 'Ücretsiz İndir',
    ctaEn: 'Download Free',
    ctaHref: '#download'
  },
  {
    id: 'personal',
    nameTr: 'ZenDev Pro Developer SaaS',
    nameEn: 'ZenDev Pro Developer SaaS',
    badgeTr: 'En Popüler / Geliştirici SaaS',
    badgeEn: 'Most Popular / Developer SaaS',
    descriptionTr: 'Tüm 27+ güce tam erişim. Sürekli yeni araç güncellemeleri, bulut senkronizasyonu ve öncelikli destek.',
    descriptionEn: 'Full access to all 27+ power tools. Continuous drops, cloud sync, and priority engineering support.',
    recommended: true,
    prices: {
      TRY: { monthly: 149, yearly: 1190, monthlyEquivalent: 99, symbol: '₺' },
      USD: { monthly: 9.99, yearly: 79, monthlyEquivalent: 6.58, symbol: '$' },
      EUR: { monthly: 8.99, yearly: 69, monthlyEquivalent: 5.75, symbol: '€' }
    },
    featuresTr: [
      '27+ Geliştirici Stüdyosunun Tamamına Kesintisiz Erişim',
      'ApiStudio REST & cURL İstasyonları Kilitsiz',
      'E2EE Uçtan Uca Şifreli Cihazlar Arası Bulut Senkronizasyonu',
      'Workflow Chains & AI Smart Dispatcher Önizleme Erişimi',
      '2 Adet Kişisel Bilgisayarda Eşzamanlı Aktivasyon',
      'Tauri v2 + Rust Ultra Düşük Bellek Mimarisi (<26 MB RAM)',
      '%100 Yerel Veri Gizliliği & Çevrimdışı Çalışabilme Garantisi',
      'Self-Service Donanım Kimliği (HWID) Transfer Portalı',
      'Esnek Faturalandırma & İstediğin Zaman Tek Tıkla İptal'
    ],
    featuresEn: [
      'Continuous access to all 27+ developer studios',
      'Unlocked ApiStudio REST & cURL bridge',
      'E2EE cross-device cloud synchronization',
      'Workflow Chains & AI Smart Dispatcher preview',
      'Activate on 2 personal machines simultaneously',
      'Tauri v2 + Rust ultra-lean engine (<26 MB RAM)',
      '100% offline-first privacy & zero tracking',
      'Self-service HWID machine transfer portal',
      'Flexible billing & 1-click hassle-free cancellation'
    ],
    ctaTr: 'Pro Abonelik Başlat',
    ctaEn: 'Start Pro Subscription',
    ctaHref: 'https://zendev.lemonsqueezy.com'
  },
  {
    id: 'studio',
    nameTr: 'ZenDev Team & Studio SaaS',
    nameEn: 'ZenDev Team & Studio SaaS',
    badgeTr: '5 Geliştirici / Kurumsal SaaS',
    badgeEn: '5 Dev Seats / Team SaaS',
    descriptionTr: 'Yazılım ekipleri ve ajanslar için paylaşımlı kurumsal SaaS. 5 koltuk, merkezi yönetim ve fatura desteği.',
    descriptionEn: 'Shared team SaaS for engineering squads and agencies. 5 seats, centralized seat admin, and VAT invoices.',
    prices: {
      TRY: { monthly: 449, yearly: 3590, monthlyEquivalent: 299, symbol: '₺' },
      USD: { monthly: 29.99, yearly: 239, monthlyEquivalent: 19.90, symbol: '$' },
      EUR: { monthly: 25.99, yearly: 209, monthlyEquivalent: 17.40, symbol: '€' }
    },
    featuresTr: [
      'Pro plandaki her şey + 5 Adet Geliştirici Koltuğu Dahil',
      'Ticari ve Kurumsal Projelerde Sınırsız Kullanım İzni',
      'Merkezi Takım Lisans Yönetim Paneli ve Koltuk Tahsisi',
      'E2EE Şifreli Takım Koleksiyonları (API, regex, mock, şemalar)',
      'Çoklu Çalışma Alanı (Multi-tenant Workspace) ve Rol Yönetimi',
      'Kurumsal E-Fatura ve Şirket Gider Makbuzu Desteği',
      'Doğrudan Mühendislik Desteği & Kurumsal SLA Garantisi',
      'Gelecek Eklenti (Plugin SDK) Erken Erişim Hakkı'
    ],
    featuresEn: [
      'Everything in Pro + 5 simultaneous developer seats included',
      'Commercial usage rights for agency and enterprise projects',
      'Centralized team license management portal & seat allocation',
      'E2EE encrypted shared team collections (API, regex, mock, schemas)',
      'Multi-tenant workspaces & role-based access management',
      'Official company VAT/Tax invoice support',
      'Direct engineering support & enterprise SLA',
      'Early access to upcoming Plugin SDK ecosystem'
    ],
    ctaTr: 'Ekip Aboneliği Başlat',
    ctaEn: 'Start Team Subscription',
    ctaHref: 'https://zendev.lemonsqueezy.com'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    author: 'Kaan Demir',
    role: 'Senior Backend Architect',
    company: 'Fintech Hub',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    toolUsed: 'ApiStudio + Workflow Chains',
    textTr: 'Postman ve dağınık web araçları yerine ZenDev Team SaaS\'a geçtik. ApiStudio, JsonStudio ve Workflow zincirleri ekibimizin API geliştirme hızını ikiye katladı. Üstelik Tauri v2 ile yalnızca 30 MB RAM tüketiyor.',
    textEn: 'We cancelled team Postman subscriptions and switched to ZenDev Team SaaS. ApiStudio, JsonStudio, and Workflow Chains doubled our engineering velocity, consuming just 30 MB RAM.'
  },
  {
    id: '2',
    author: 'Elena Rostova',
    role: 'Lead Security Auditor',
    company: 'CyberShield EU',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    toolUsed: 'JwtStudio + CyberFortress',
    textTr: 'Takım koleksiyonları ve JWT/Cron stüdyolarının %100 yerel ve E2EE şifreli çalışması kurumsal güvenlik politikalarımız için kusursuz. Müşteri API anahtarlarını ve tokenlarını güvenle inceliyoruz.',
    textEn: 'The offline-first architecture, JwtStudio, and E2EE Team Collections align seamlessly with our strict enterprise audit standards. Zero network leaks, 100% offline-first security.'
  },
  {
    id: '3',
    author: 'Murat Yıldırım',
    role: 'Full-Stack Developer',
    company: 'Freelance & Indie',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    rating: 5,
    toolUsed: 'MermaidStudio + SqliteViewer',
    textTr: 'Mermaid mimari şemaları, WASM SQLite konsolu ve Encoding laboratuvarı tek uygulamada elimin altında. Tarayıcıda 20 sekme açıp RAM tüketme derdi bitti.',
    textEn: 'Mermaid architectural diagrams, WASM SQLite explorer, and Encoding lab right at my fingertips in one ultra-fast client. No more 20 browser tabs draining my workstation RAM.'
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'general',
    questionTr: 'ZenDev nedir ve masaüstü geliştirici SaaS modeli nasıl çalışır?',
    questionEn: 'What is ZenDev and how does the desktop developer SaaS model work?',
    answerTr: 'ZenDev, API-ağırlıklı çalışan yazılım geliştiriciler ve mühendislik ekipleri için dağınık web araçlarını (JSON, cURL, Regex, JWT, Cron, Mermaid, Encoding) tek çatı altında toplayan ultra hızlı ve offline-first bir Masaüstü SaaS platformudur. Verileriniz asla yabancı bulutlara sızmaz, yerel olarak Rust ile işlenir ve ekipler arası şifreli senkronizasyonla iş birliği sunar.',
    answerEn: 'ZenDev is an ultra-fast, offline-first Desktop Developer SaaS platform designed for API-heavy developers and software engineering teams. It consolidates scattered web tools (JSON, cURL, Regex, JWT, Cron, Mermaid, Encoding) into one unified desktop client with end-to-end encrypted team collaboration and zero cloud data leaks.'
  },
  {
    id: 'faq-2',
    category: 'technical',
    questionTr: 'Tauri v2 ve Rust mimarisinin Electron\'dan farkı nedir?',
    questionEn: 'How does Tauri v2 + Rust differ from traditional Electron apps?',
    answerTr: 'Klasik Electron uygulamaları arka planda tam bir Chromium ve Node.js motoru çalıştırarak 400-600 MB RAM tüketir. ZenDev v2.5.3 ise Windows yerel WebView2 ve Rust işletim sistemi köprüsü kullanarak yalnızca < 26 MB RAM harcar ve 0.35 saniyede açılır.',
    answerEn: 'Traditional Electron apps bundle a full Chromium browser and consume 400-600 MB RAM. ZenDev v2.5.3 leverages Windows native WebView2 and a Rust backend, consuming only < 26 MB RAM with 0.35s boot latency.'
  },
  {
    id: 'faq-3',
    category: 'license',
    questionTr: 'Bilgisayarımı değiştirirsem lisansımı yeni cihaza aktarabilir miyim?',
    questionEn: 'If I change my computer, can I transfer my license to the new machine?',
    answerTr: 'Evet! Web sitemizdeki "Müşteri Portalı" üzerinden lisans anahtarınızı girerek eski bilgisayarınızın donanım kimliğini (HWID) tek tıkla sıfırlayabilir ve yeni cihazınızda hemen aktive edebilirsiniz.',
    answerEn: 'Yes! Using our website\'s Self-Service Customer Portal, you can enter your license key, release your old HWID slot with 1-click, and activate on your new computer.'
  },
  {
    id: 'faq-4',
    category: 'security',
    questionTr: 'Verilerim buluta veya sunucularınıza gönderiliyor mu?',
    questionEn: 'Is any of my data sent to the cloud or your servers?',
    answerTr: 'Kesinlikle HAYIR. ZenDev %100 offline-first prensibiyle çalışır. Dosyalarınız, parolalarınız, API istekleriniz ve SQLite veritabanlarınız yalnızca sizin bilgisayarınızda işlenir ve saklanır. Sıfır telemetri.',
    answerEn: 'Absolutely NOT. ZenDev operates on a strict 100% offline-first philosophy. Your files, passwords, API requests, and databases never leave your local machine. Zero telemetry.'
  }
];
