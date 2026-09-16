export const translations = {
  tr: {
    nav: {
      tools: '31+ Araç',
      playground: 'Canlı Demo',
      performance: 'Tauri v2 Hızı',
      calculator: 'Tasarruf Hesabı',
      pricing: 'Fiyatlandırma',
      portal: 'Lisans Portalı',
      downloadBtn: 'Hemen İndir v2.5.2',
      whatsNew: 'v2.5.2 Yenilikler'
    },
    hero: {
      tag: '🔥 TAURI v2 & RUST İLE SIFIRDAN YAZILDI',
      titleHighlight: 'Abonelik Tuzağına Son.',
      titleMain: '31+ Siber Geliştirici Gücü Tek Masaüstü Yazılımında.',
      subtitle: 'Postman, SQLite tarayıcıları, PDF araçları, parola yöneticileri ve dosya imha yazılımları için her ay yüzlerce dolar ödemeyi bırakın. Tek seferlik lisans, %100 yerel gizlilik, sıfır bulut izi.',
      downloadNsis: 'Windows Yükleyici İndir (x64)',
      downloadPortable: 'Portable .exe İndir',
      checksumLabel: 'SHA-256 Doğrulama',
      copied: 'Kopyalandı!',
      cleanCodeBadge: 'VirusTotal 0/72 Temiz Kod Raporu',
      stats: {
        tools: '31+ Güçlü Araç',
        ram: '<26 MB RAM',
        boot: '0.35s Açılış',
        license: 'Ömür Boyu Lisans'
      }
    },
    playground: {
      tag: 'İNTERAKTİF DENEYİM',
      title: 'İndirmeden Önce Tarayıcınızda Canlı Test Edin',
      subtitle: 'ZenDev\'in gücünü doğrudan istemci tarafında Web Crypto API ve yerel JavaScript motoru ile test edin. Sıfır sunucu gecikmesi.',
      tabs: {
        regex: 'RegexStudio (Canlı Test)',
        hash: 'HashStudio (SHA-256)',
        base64: 'Base64Studio (İki Yönlü UTF-8)',
        qr: 'QrCodeStudio (Vektör)',
        jwt: 'JsonStudio (JWT Çözücü)',
        decoder: 'UniversalDecrypter',
        password: 'PasswordGen (Entropi)'
      }
    },
    catalog: {
      tag: 'TAM CEPHANELİK',
      title: 'Geliştiricinin ve Güvenlik Uzmanının İhtiyacı Olan Her Şey',
      subtitle: 'Birbirinden bağımsız çalışan, arayüzü tek tip ve siberpunk hızında tasarlanmış 31 profesyonel istasyon.',
      categories: {
        all: 'Tümü (31)',
        security: 'Siber Güvenlik & Kasa',
        developer: 'Yazılım & API Geliştirici',
        system: 'Sistem & Ağ Mühendisliği',
        productivity: 'Üretkenlik & İş Akışı'
      },
      searchPlaceholder: 'Araç adı veya özellik ara (örn: sqlite, port, sha256, pdf)...',
      inBrowserBadge: 'Canlı Demo',
      specsLabel: 'Özellikler:'
    },
    radar: {
      tag: 'MİMARİ KARŞILAŞTIRMA',
      title: 'Tauri v2 + Rust: Neden Klasik Electron\'u Terk Ettik?',
      subtitle: 'ZenDev v2.5.2 ile tüm mimariyi baştan aşağı Rust ile yeniden inşa ettik. İşte somut donanım rakamları:',
      metrics: {
        ram: {
          title: 'Bellek (RAM) Tüketimi',
          zendev: '< 26 MB (Tauri v2)',
          electron: '450+ MB (Klasik Electron)',
          desc: 'Chromium ve ağır Node.js motorunu taşımak yerine yerel Windows WebView2 ve optimize edilmiş Rust köprüsü kullanılır.'
        },
        size: {
          title: 'Yükleyici & Paket Boyutu',
          zendev: '4.6 MB Yükleyici',
          electron: '120 MB (Klasik Electron)',
          desc: 'Gereksiz libvips ve ağır C++ ikilileri arındırıldı. Yalnızca 4.6 MB boyutunda ultra kompakt NSIS yükleyici.'
        },
        boot: {
          title: 'Soğuk Başlatma Gecikmesi',
          zendev: '0.35 Saniye',
          electron: '3.2 Saniye',
          desc: 'Uygulama tıklandığı anda hazırdır. Chromium başlatma kuyrukları ve donmalar tamamen ortadan kaldırıldı.'
        },
        privacy: {
          title: 'Veri Mahremiyeti & Telemetri',
          zendev: '%100 Yerel / Çevrimdışı',
          electron: 'Bulut Telemetrisi / Arka Plan İncelemesi',
          desc: 'Hiçbir dosyanız, veritabanınız veya parolanız dışarı sızmaz. Sıfır sunucu isteği, sıfır arka plan analitiği.'
        }
      }
    },
    roi: {
      tag: 'SAAS KONSOLİDASYON & TASARRUF HESAPLAYICISI',
      title: 'Tek Bir ZenDev SaaS Aboneliği ile Ne Kadar Kâr Edeceksiniz?',
      subtitle: 'Ayrı ayrı abone olduğunuz araçları seçin, ZenDev Pro SaaS ile her yıl ne kadar net tasarruf edeceğinizi görün.',
      annualSavings: 'Mevcut Yıllık SaaS Masrafınız:',
      zendevCost: 'ZenDev Pro Yıllık SaaS Ücreti:',
      netProfit: 'Her Yıl Cebe Kalan Net Tasarruf:',
      paybackPeriod: 'Amortisman Süresi:',
      days: 'Gün'
    },
    portal: {
      tag: 'MÜŞTERİ PORTALI',
      title: 'Kendi Kendine Hizmet: Lisans & HWID Yönetimi',
      subtitle: 'Yeni bir bilgisayara mı geçtiniz? Lisans anahtarınızı girin, eski cihazınızı tek tıkla boşa çıkarın.',
      keyPlaceholder: 'ZEN-XXXX-XXXX-XXXX-XXXX',
      btnLookup: 'Lisansı Sorgula',
      btnResetHwid: 'HWID Kilidini Sıfırla',
      statusValid: 'Lisans Geçerli ve Aktif',
      activations: 'Aktivasyon Durumu:',
      resetSuccess: 'Donanım kilidi (HWID) başarıyla sıfırlandı. Yeni bilgisayarınızda aktive edebilirsiniz.'
    },
    pricing: {
      tag: 'ŞEFFAF SAAS FİYATLANDIRMASI',
      title: 'Öngörülebilir, Esnek ve Güçlü Geliştirici Aboneliği',
      subtitle: 'Tüm 31+ güce, bulut senkronizasyonuna ve sürekli gelen yeni araçlara kesintisiz erişin. Taahhüt yok, istediğiniz an iptal edin.',
      billingToggleMonthly: 'Aylık Faturalandırma',
      billingToggleYearly: 'Yıllık Faturalandırma',
      saveBadge: '%33 Tasarruf • 2+ Ay Bedava',
      perMonth: '/ ay',
      perYear: '/ yıl',
      billedAnnually: 'yıllık peşin faturalandırılır',
      billedMonthly: 'aylık düzenli faturalandırılır',
      currencyToggle: 'Para Birimi:',
      buyNow: 'Abonelik Başlat',
      couponPlaceholder: 'İndirim Kuponu (örn: ZENDEV20)',
      applyCoupon: 'Uygula',
      moneyBack: '14 Gün Koşulsuz Para İade Garantisi & Taahhütsüz İptal',
      secureCheckout: 'Stripe & LemonSqueezy 256-bit SSL Güvenli SaaS Ödemesi'
    },
    footer: {
      tagline: 'ZenDev — Geliştiriciler İçin Askeri Standartta Güç & Yerel Gizlilik Paketi.',
      allRights: 'Tüm hakları saklıdır.',
      disclaimer: 'ZenDev bağımsız bir yazılımdır. Bahsi geçen üçüncü taraf markalar (Postman, TablePlus vb.) yalnızca kıyaslama amacıyla kullanılmıştır.'
    }
  },
  en: {
    nav: {
      tools: '31+ Tools',
      playground: 'Live Demo',
      performance: 'Tauri v2 Speed',
      calculator: 'ROI Calculator',
      pricing: 'Pricing',
      portal: 'License Portal',
      downloadBtn: 'Download v2.5.2',
      whatsNew: 'v2.5.2 What\'s New'
    },
    hero: {
      tag: '🔥 REBUILT FROM SCRATCH WITH TAURI v2 & RUST',
      titleHighlight: 'Stop Subscription Fatigue.',
      titleMain: '31+ Cyber Developer Powers in One Desktop Suite.',
      subtitle: 'Stop paying hundreds of dollars every month for Postman, SQLite viewers, PDF utilities, and password managers. One-time license, 100% offline-first privacy, zero telemetry.',
      downloadNsis: 'Download Windows Setup (x64)',
      downloadPortable: 'Download Portable .exe',
      checksumLabel: 'Verify SHA-256',
      copied: 'Copied!',
      cleanCodeBadge: 'VirusTotal 0/72 Clean Code Report',
      stats: {
        tools: '31+ Power Tools',
        ram: '<26 MB RAM',
        boot: '0.35s Cold Start',
        license: 'Lifetime License'
      }
    },
    playground: {
      tag: 'INTERACTIVE PLAYGROUND',
      title: 'Test Live in Your Browser Before Downloading',
      subtitle: 'Experience ZenDev performance right on the client side with Web Crypto API and native JS. Zero server latency.',
      tabs: {
        regex: 'RegexStudio (Live Test)',
        hash: 'HashStudio (SHA-256)',
        base64: 'Base64Studio (Two-Way UTF-8)',
        qr: 'QrCodeStudio (Vector)',
        jwt: 'JsonStudio (JWT Decoder)',
        decoder: 'UniversalDecrypter',
        password: 'PasswordGen (Entropy)'
      }
    },
    catalog: {
      tag: 'THE FULL ARSENAL',
      title: 'Everything Developers & Security Engineers Need',
      subtitle: '31 specialized developer workstations designed with unified cyberpunk aesthetics and lightning responsiveness.',
      categories: {
        all: 'All Tools (31)',
        security: 'Security & Cryptography',
        developer: 'Developer & API Suite',
        system: 'System & Network Recon',
        productivity: 'Workflow & Productivity'
      },
      searchPlaceholder: 'Search tools or features (e.g., sqlite, port, sha256, pdf)...',
      inBrowserBadge: 'Live Demo',
      specsLabel: 'Specs:'
    },
    radar: {
      tag: 'ARCHITECTURE BENCHMARK',
      title: 'Tauri v2 + Rust: Why We Ditched Traditional Electron',
      subtitle: 'With ZenDev v2.5.2, we rebuilt our core foundation with Rust. Here are the real hardware benchmarks:',
      metrics: {
        ram: {
          title: 'Memory (RAM) Footprint',
          zendev: '< 26 MB (Tauri v2)',
          electron: '450+ MB (Standard Electron)',
          desc: 'Leverages native Windows WebView2 and optimized Rust bridge instead of bundling massive Chromium and Node.js runtimes.'
        },
        size: {
          title: 'Installer & Binary Size',
          zendev: '4.6 MB Installer',
          electron: '120 MB (Standard Electron)',
          desc: 'Stripped of heavy C++ binaries. Ultra-compact 4.6 MB NSIS installer downloads and installs in milliseconds.'
        },
        boot: {
          title: 'Cold Start Latency',
          zendev: '0.35 Seconds',
          electron: '3.2 Seconds',
          desc: 'Instantly launches the moment you click. Zero Chromium process bootstrapping delays or spinning wheels.'
        },
        privacy: {
          title: 'Data Privacy & Telemetry',
          zendev: '100% Offline / Local',
          electron: 'Cloud Telemetry / Background Analytics',
          desc: 'Your files, passwords, and databases never leave your workstation. Zero network pings, zero tracking.'
        }
      }
    },
    roi: {
      tag: 'SAAS CONSOLIDATION & SAVINGS CALCULATOR',
      title: 'How Much Will You Save By Consolidating Into ZenDev SaaS?',
      subtitle: 'Select the fragmented subscriptions you currently pay for, and see how much ZenDev Pro SaaS saves every year.',
      annualSavings: 'Your Current Annual SaaS Cost:',
      zendevCost: 'ZenDev Pro Annual SaaS Cost:',
      netProfit: 'Net Annual Savings Retained:',
      paybackPeriod: 'Payback Period:',
      days: 'Days'
    },
    portal: {
      tag: 'CUSTOMER SELF-SERVICE',
      title: 'Self-Service: License & HWID Management',
      subtitle: 'Switched to a new PC? Enter your license key and unbind your old hardware with 1-click.',
      keyPlaceholder: 'ZEN-XXXX-XXXX-XXXX-XXXX',
      btnLookup: 'Lookup License',
      btnResetHwid: 'Reset HWID Slot',
      statusValid: 'License is Valid & Active',
      activations: 'Activation Slots:',
      resetSuccess: 'HWID slot released successfully. You can now activate on your new computer.'
    },
    pricing: {
      tag: 'TRANSPARENT SAAS PRICING',
      title: 'Predictable, Flexible & Powerful Developer Subscription',
      subtitle: 'Continuous access to 31+ cyber developer tools, cloud sync, and automatic feature drops. Cancel anytime with zero lock-in.',
      billingToggleMonthly: 'Monthly Billing',
      billingToggleYearly: 'Annual Billing',
      saveBadge: 'Save 33% • 2 Months Free',
      perMonth: '/ mo',
      perYear: '/ yr',
      billedAnnually: 'billed annually upfront',
      billedMonthly: 'billed monthly',
      currencyToggle: 'Currency:',
      buyNow: 'Start Subscription',
      couponPlaceholder: 'Discount code (e.g., ZENDEV20)',
      applyCoupon: 'Apply',
      moneyBack: '14-Day Hassle-Free Money-Back Guarantee & Instant Cancellation',
      secureCheckout: 'Stripe & LemonSqueezy 256-Bit SSL Encrypted SaaS Checkout'
    },
    footer: {
      tagline: 'ZenDev — Military-Grade Power & Offline-First Privacy Suite for Engineers.',
      allRights: 'All rights reserved.',
      disclaimer: 'ZenDev is an independent software suite. Third-party brand names (Postman, TablePlus etc.) are used solely for comparative purposes.'
    }
  }
};
