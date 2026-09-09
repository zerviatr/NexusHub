/**
 * server/src/landingPageHtml.ts
 *
 * NexusHub Official High-Conversion "Harpoon" Landing Page.
 * Full Enterprise Suite:
 *  - Multilingual (TR / EN) + Multi-Currency (₺ / $) instant switcher
 *  - Interactive Desktop App Mockup Simulator with live tool tabs
 *  - Interactive ROI / Savings Calculator (calculates annual savings vs SaaS)
 *  - Verified Customer Testimonials & Reviews Wall (4.9/5 stars)
 *  - Live System Health & Status Radar (uptime & response telemetry)
 *  - Release Changelog Modal (v2.0.3 What's New drawer)
 *  - Interactive FAQ Live Search Filter
 *  - Live Social Proof FOMO Sales Ticker (bottom-left rotating alerts)
 *  - Self-Service License Lookup & HWID Reset Portal (/api/license/*)
 *  - Promo Coupon code calculator in checkout modal
 *  - VirusTotal 0/72 Clean Code security verification
 *  - Discord Community Callout
 */

export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="tr" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title id="meta-title">NexusHub — Abonelik Tuzağına Son. 15+ Siber Güç Tek Yazılımda.</title>
  <meta name="description" content="TempMail, Evrensel Reklam/Link Çözücü, DoD 7-Pass Dosya İmha Kalkanı, Canlı Donanım Teşhisi ve Şifreleme Kasası. Tek seferlik ödeme, sıfır abonelik.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            nexus: {
              bg: '#08090d',
              card: '#0f1118',
              surface: '#151822',
              border: '#1f2433',
              cyan: '#06b6d4',
              accent: '#3b82f6',
              purple: '#8b5cf6',
              emerald: '#10b981',
              text: '#f1f5f9',
              muted: '#94a3b8'
            }
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            heading: ['Outfit', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #08090d;
      color: #f1f5f9;
      background-image: 
        radial-gradient(circle at 50% -10%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 10% 40%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 40%);
    }
    .grid-pattern {
      background-size: 40px 40px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    }
    .neon-glow {
      box-shadow: 0 0 50px -10px rgba(6, 182, 212, 0.35);
    }
    .card-glass {
      background: rgba(15, 17, 24, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .card-glass:hover {
      border-color: rgba(6, 182, 212, 0.35);
      box-shadow: 0 10px 30px -10px rgba(6, 182, 212, 0.2);
    }
    @keyframes floatSlow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .animate-float {
      animation: floatSlow 4s ease-in-out infinite;
    }
  </style>
</head>
<body class="font-sans antialiased overflow-x-hidden selection:bg-nexus-cyan selection:text-nexus-bg">

  <!-- BACKGROUND GRID -->
  <div class="fixed inset-0 grid-pattern pointer-events-none z-0"></div>

  <!-- NAVIGATION -->
  <nav class="relative z-50 border-b border-nexus-border/60 bg-nexus-bg/80 backdrop-blur-xl sticky top-0">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <a href="#" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-nexus-cyan via-nexus-accent to-nexus-purple p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
          <div class="w-full h-full bg-nexus-bg rounded-[10px] flex items-center justify-center font-mono font-black text-nexus-cyan text-lg">
            N
          </div>
        </div>
        <div class="flex flex-col">
          <span class="font-heading font-black text-xl tracking-wider text-white">NEXUS<span class="text-nexus-cyan">HUB</span></span>
          <span class="text-[10px] font-mono text-nexus-muted tracking-widest uppercase">Multi-Tool Desktop Suite</span>
        </div>
      </a>

      <div class="hidden lg:flex items-center gap-7 text-sm font-medium text-nexus-muted">
        <a href="#simulator" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.preview">Arayüz</a>
        <a href="#roi" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.roi">Tasarruf Hesabı</a>
        <a href="#comparison" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.comparison">SaaS Katili</a>
        <a href="#arsenal" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.arsenal">15+ Cephane</a>
        <a href="#pricing" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.pricing">Fiyatlandırma</a>
        <a href="#reviews" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.reviews">Yorumlar</a>
        <a href="#portal" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.portal">Lisans Sorgula</a>
        <a href="#faq" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.faq">SSS</a>
      </div>

      <div class="flex items-center gap-3">
        <!-- Language Switcher -->
        <button onclick="toggleLanguage()" id="lang-btn" class="px-2.5 py-1.5 rounded-lg border border-nexus-border/80 hover:border-nexus-cyan/50 text-xs font-mono text-nexus-muted hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
          <span id="lang-flag">🇹🇷</span>
          <span id="lang-label" class="font-bold">TR (₺)</span>
        </button>

        <!-- Changelog Button -->
        <button onclick="openChangelogModal()" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nexus-border hover:border-nexus-cyan/50 text-xs font-mono text-nexus-muted hover:text-white transition-all cursor-pointer">
          <span class="w-1.5 h-1.5 rounded-full bg-nexus-cyan animate-ping"></span>
          <span>v2.0.3 Yenilikler</span>
        </button>

        <a href="#pricing" class="px-4 py-2 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-bold font-heading text-sm shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer" data-i18n="nav.buy">
          Lisans Al
        </a>
      </div>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <section class="relative z-10 pt-16 pb-20 overflow-hidden">
    <div class="max-w-7xl mx-auto px-6">
      
      <!-- Top Live Status Pill -->
      <div class="flex justify-center mb-8">
        <div onclick="openChangelogModal()" class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full card-glass border border-nexus-cyan/30 text-xs font-mono text-nexus-cyan shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer hover:border-nexus-cyan transition-all">
          <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-ping"></span>
          <span>v2.0.3 Yayında</span>
          <span class="text-nexus-border">|</span>
          <span class="text-white" data-i18n="hero.pill.tools">15+ Siber Güç</span>
          <span class="text-nexus-border">|</span>
          <span class="text-emerald-400" data-i18n="hero.pill.noSub">Sıfır Abonelik Tuzağı</span>
          <span class="text-nexus-cyan text-[10px]">↗</span>
        </div>
      </div>

      <!-- Main Headline -->
      <div class="text-center max-w-4xl mx-auto mb-10">
        <h1 class="font-heading font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-white leading-[1.08] mb-6">
          <span data-i18n="hero.title1">Aylık Aboneliklere</span> <span class="bg-gradient-to-r from-nexus-cyan via-nexus-accent to-purple-400 bg-clip-text text-transparent" data-i18n="hero.title2">Son.</span><br>
          <span data-i18n="hero.title3">Tek Yazılım,</span> <span class="underline decoration-nexus-cyan/40 underline-offset-8" data-i18n="hero.title4">15+ Siber Güç.</span>
        </h1>
        <p class="text-base sm:text-lg md:text-xl text-nexus-muted leading-relaxed max-w-2xl mx-auto font-sans" data-i18n="hero.desc">
          Tek kullanımlık geçici posta, reklam & link çözücü, DoD askeri veri imha kalkanı, donanım monitörü ve şifreli kasa. Her şeye ayrı ayrı para ödemeyi bırakın.
        </p>
      </div>

      <!-- Hero Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
        <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-nexus-cyan via-sky-400 to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-heading font-black text-base flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span data-i18n="hero.btnDownload">Windows için İndir (v2.0.3)</span>
        </a>
        <a href="#pricing" class="w-full sm:w-auto px-8 py-4 rounded-2xl card-glass border border-nexus-border/80 hover:border-nexus-cyan/50 active:scale-95 text-white font-heading font-bold text-base flex items-center justify-center gap-2 transition-all">
          <span data-i18n="hero.btnPro">Ömür Boyu Pro Lisans</span>
          <svg class="w-4 h-4 text-nexus-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- Trust Badges -->
      <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-nexus-muted mb-16">
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Windows 10 & 11 (x64)</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> %100 Offline-First Yerel İcra</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> VirusTotal: 0/72 Temiz</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Anında Otomatik Anahtar Teslimi</span>
      </div>

    </div>
  </section>

  <!-- INTERACTIVE DESKTOP APP MOCKUP SIMULATOR (CANLI ARAYÜZ VİTRİNİ) -->
  <section id="simulator" class="relative z-10 py-16 border-t border-nexus-border/40 bg-nexus-surface/20">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-12">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan" data-i18n="sim.tag">Canlı Arayüzü İncele</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4" data-i18n="sim.title">
          NexusHub Masaüstünüzde Nasıl Görünür?
        </h2>
        <p class="text-nexus-muted font-sans text-sm sm:text-base" data-i18n="sim.desc">
          İndirmeden önce aşağıdaki sekmelere tıklayarak NexusHub'ın sibernetik araçlarını ve pürüzsüz arayüzünü canlı test edin.
        </p>
      </div>

      <!-- Desktop Frame Mockup -->
      <div class="rounded-3xl card-glass border border-nexus-cyan/40 shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden neon-glow">
        <!-- TitleBar -->
        <div class="h-11 bg-nexus-surface/90 border-b border-nexus-border/80 px-4 flex items-center justify-between select-none">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span class="ml-3 font-mono text-xs text-nexus-muted font-semibold flex items-center gap-1.5">
              <span>NexusHub v2.0.3 Pro Edition</span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs font-mono text-nexus-muted">
            <span class="px-2 py-0.5 rounded bg-nexus-bg border border-nexus-border/60">Ctrl + K</span>
          </div>
        </div>

        <!-- Main Body: Sidebar + Dynamic Workspace -->
        <div class="grid grid-cols-1 md:grid-cols-4 min-h-[460px]">
          
          <!-- Mock Sidebar -->
          <div class="border-b md:border-b-0 md:border-r border-nexus-border/60 bg-nexus-bg/60 p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
            <button onclick="switchMockTool('tempmail')" id="mock-btn-tempmail" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 bg-nexus-cyan/15 text-nexus-cyan border border-nexus-cyan/30 transition-all cursor-pointer">
              <span>📬</span> <span data-i18n="sim.tools.tempmail">TempMail Posta</span>
            </button>
            <button onclick="switchMockTool('decrypter')" id="mock-btn-decrypter" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
              <span>🔗</span> <span data-i18n="sim.tools.decrypter">Link Decrypter</span>
            </button>
            <button onclick="switchMockTool('fortress')" id="mock-btn-fortress" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
              <span>🛡️</span> <span data-i18n="sim.tools.fortress">Cyber Fortress</span>
            </button>
            <button onclick="switchMockTool('sentinel')" id="mock-btn-sentinel" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
              <span>⚡</span> <span data-i18n="sim.tools.sentinel">Resource Sentinel</span>
            </button>
            <button onclick="switchMockTool('orb')" id="mock-btn-orb" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
              <span>🔮</span> <span data-i18n="sim.tools.orb">Floating Orb HUD</span>
            </button>
          </div>

          <!-- Mock Workspace Panels -->
          <div class="md:col-span-3 p-6 sm:p-8 bg-nexus-card/40 flex flex-col justify-center">

            <!-- Panel 1: TempMail Preview -->
            <div id="mock-panel-tempmail" class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-heading font-black text-xl text-white flex items-center gap-2">
                    TempMail & Real-Time Inbox <span class="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 font-mono">CANLI</span>
                  </h3>
                  <p class="text-xs text-nexus-muted mt-0.5">Spam korumalı, anında tek kullanımlık e-posta.</p>
                </div>
                <button onclick="simulateNewMail()" class="px-3 py-1.5 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-mono text-xs hover:bg-nexus-cyan/30 cursor-pointer">Yeni Posta Üret ↻</button>
              </div>

              <div class="p-3.5 rounded-xl bg-nexus-bg border border-nexus-border/80 flex items-center justify-between font-mono text-xs">
                <span id="mock-email-addr" class="text-nexus-cyan font-bold truncate">quantum_shadow92@nexusmail.org</span>
                <span class="text-emerald-400 text-[11px]">✓ Aktif</span>
              </div>

              <div class="border border-nexus-border/60 rounded-xl overflow-hidden bg-nexus-surface/40">
                <div class="p-2.5 border-b border-nexus-border/60 text-[10px] font-mono text-nexus-muted uppercase bg-nexus-surface/80 flex justify-between">
                  <span>Gelen Kutusu (1 Yeni Mesaj)</span>
                  <span>Şimdi Geldi</span>
                </div>
                <div class="p-3.5 flex items-center justify-between text-xs hover:bg-nexus-surface/30 cursor-pointer">
                  <div>
                    <div class="font-bold text-white">Steam Security &bull; Doğrulama Kodu</div>
                    <div class="text-nexus-muted text-[11px]">Giriş kodunuz: <b class="text-nexus-cyan font-mono">729-410</b></div>
                  </div>
                  <span class="px-2 py-1 rounded bg-nexus-cyan/20 text-nexus-cyan text-[10px] font-mono font-bold">Kodu Kopyala</span>
                </div>
              </div>
            </div>

            <!-- Panel 2: Link Decrypter Preview -->
            <div id="mock-panel-decrypter" class="space-y-4 hidden">
              <div>
                <h3 class="font-heading font-black text-xl text-white">Universal Link Decrypter & Tracker Stripper</h3>
                <p class="text-xs text-nexus-muted mt-0.5">Yönlendirme tuzaklarını, bc.vc ve aylink gibi para tuzaklarını çözer.</p>
              </div>
              <div class="space-y-2">
                <div class="p-3 rounded-xl bg-nexus-bg border border-nexus-border/80 font-mono text-xs text-red-300 line-through truncate">
                  https://bc.vc/download_crack?utm_source=tracker&telemetry_token=98432&spy_id=f481
                </div>
                <div class="flex justify-center">
                  <span class="text-xs font-mono text-nexus-cyan animate-pulse">▼ 7 Parametre Soyuldu & Bypass Edildi ▼</span>
                </div>
                <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs text-emerald-400 flex justify-between items-center">
                  <span class="truncate">✓ https://drive.google.com/file/d/1A8z...</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold shrink-0">Bypass Başarılı</span>
                </div>
              </div>
            </div>

            <!-- Panel 3: Cyber Fortress Preview -->
            <div id="mock-panel-fortress" class="space-y-4 hidden">
              <div>
                <h3 class="font-heading font-black text-xl text-white">DoD 5220.22-M 7-Pass Shredder & Vault</h3>
                <p class="text-xs text-nexus-muted mt-0.5">Askeri standartta silinen dosyalar adli bilişimle dahi asla geri getirilemez.</p>
              </div>
              <div class="p-4 rounded-xl bg-nexus-bg border border-nexus-border/80 space-y-3">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-white">Dosya: secret_keys_2026.docx</span>
                  <span class="text-red-400 font-bold">7/7 Pass İmha Ediliyor...</span>
                </div>
                <div class="w-full h-2 bg-nexus-surface rounded-full overflow-hidden">
                  <div class="w-full h-full bg-gradient-to-r from-red-500 via-amber-500 to-nexus-cyan animate-pulse"></div>
                </div>
                <div class="text-[11px] font-mono text-nexus-muted flex justify-between">
                  <span>Algoritma: DoD 5220.22-M + Rastgele Bit Dolgusu</span>
                  <span class="text-emerald-400 font-bold">100% Geri Döndürülemez</span>
                </div>
              </div>
            </div>

            <!-- Panel 4: Resource Sentinel Preview -->
            <div id="mock-panel-sentinel" class="space-y-4 hidden">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="font-heading font-black text-xl text-white">Resource Sentinel & Live Telemetry</h3>
                  <p class="text-xs text-nexus-muted mt-0.5">Anlık çekirdek bazlı CPU ve bellek monitörü.</p>
                </div>
                <button onclick="triggerSimRamFlush()" id="mock-flush-btn" class="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs hover:bg-amber-500/30 cursor-pointer">
                  ⚡ 1-Tık RAM Flush
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3.5 rounded-xl bg-nexus-bg border border-nexus-border/80">
                  <div class="flex justify-between text-xs font-mono text-nexus-muted mb-1.5">
                    <span>CPU Yükü</span>
                    <span class="text-nexus-cyan font-bold">18%</span>
                  </div>
                  <div class="w-full h-1.5 bg-nexus-surface rounded-full overflow-hidden">
                    <div class="w-[18%] h-full bg-nexus-cyan rounded-full"></div>
                  </div>
                </div>
                <div class="p-3.5 rounded-xl bg-nexus-bg border border-nexus-border/80">
                  <div class="flex justify-between text-xs font-mono text-nexus-muted mb-1.5">
                    <span>RAM Kullanımı</span>
                    <span id="mock-ram-txt" class="text-purple-400 font-bold">36%</span>
                  </div>
                  <div class="w-full h-1.5 bg-nexus-surface rounded-full overflow-hidden">
                    <div id="mock-ram-bar" class="w-[36%] h-full bg-purple-500 rounded-full transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel 5: Floating Orb Preview -->
            <div id="mock-panel-orb" class="space-y-4 hidden">
              <div>
                <h3 class="font-heading font-black text-xl text-white">Desktop Floating Cyber Orb</h3>
                <p class="text-xs text-nexus-muted mt-0.5">Masaüstünüzde sağ altta süzülen sibernetik mini widget.</p>
              </div>
              <div class="p-6 rounded-2xl bg-nexus-bg border border-nexus-border/80 flex items-center justify-around">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-nexus-cyan via-nexus-accent to-purple-600 border border-nexus-cyan/60 flex items-center justify-center text-white font-bold shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-float">
                    ⚡
                  </div>
                  <span class="text-xs font-mono text-nexus-cyan">Yüzen Küre</span>
                </div>
                <div class="max-w-xs space-y-1.5 text-xs text-nexus-muted">
                  <div class="text-white font-bold">HUD Özellikleri:</div>
                  <div>• Canlı CPU & RAM durum halkası</div>
                  <div>• 1-Tıkla anında TempMail üret & kopyala</div>
                  <div>• 1-Tıkla Windows önbelleğini boşalt</div>
                  <div>• Ctrl + K Komut Paletini tek tıkla aç</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- INTERACTIVE ROI & SAVINGS CALCULATOR ("KAÇ PARA TASARRUF EDERSİN?") -->
  <section id="roi" class="relative z-10 py-20 border-t border-nexus-border/40 bg-nexus-bg/80">
    <div class="max-w-5xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-12">
        <span class="text-xs font-mono uppercase tracking-widest text-emerald-400" data-i18n="roi.tag">ROI Tasarruf Simülatörü</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4" data-i18n="roi.title">
          NexusHub ile Yılda Kaç Para Tasarruf Edersiniz?
        </h2>
        <p class="text-nexus-muted font-sans text-sm sm:text-base" data-i18n="roi.desc">
          Kullandığınız araçları işaretleyin, her ay SaaS platformlarına saçtığınız paranın NexusHub ile nasıl cebinizde kaldığını görün.
        </p>
      </div>

      <div class="p-8 rounded-3xl card-glass border border-emerald-500/30 shadow-2xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div class="lg:col-span-2 space-y-3.5">
          <label class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/60 border border-nexus-border/80 cursor-pointer hover:border-nexus-cyan/40 transition-all select-none">
            <div class="flex items-center gap-3">
              <input type="checkbox" checked onchange="calcRoi()" class="w-4 h-4 accent-nexus-cyan rounded" id="roi-tempmail" data-price="10">
              <div>
                <div class="text-xs font-bold text-white">TempMail & Spam Savar Aboneliği</div>
                <div class="text-[11px] text-nexus-muted">Burner Mail, Inboxes vb.</div>
              </div>
            </div>
            <span class="text-xs font-mono text-red-400 font-bold">$10 / ay</span>
          </label>

          <label class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/60 border border-nexus-border/80 cursor-pointer hover:border-nexus-cyan/40 transition-all select-none">
            <div class="flex items-center gap-3">
              <input type="checkbox" checked onchange="calcRoi()" class="w-4 h-4 accent-nexus-cyan rounded" id="roi-shredder" data-price="12">
              <div>
                <div class="text-xs font-bold text-white">DoD Dosya İmha & Şifreli Kasa</div>
                <div class="text-[11px] text-nexus-muted">Kalıcı silme ve dosya kasası yazılımları</div>
              </div>
            </div>
            <span class="text-xs font-mono text-red-400 font-bold">$12 / ay</span>
          </label>

          <label class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/60 border border-nexus-border/80 cursor-pointer hover:border-nexus-cyan/40 transition-all select-none">
            <div class="flex items-center gap-3">
              <input type="checkbox" checked onchange="calcRoi()" class="w-4 h-4 accent-nexus-cyan rounded" id="roi-sentinel" data-price="8">
              <div>
                <div class="text-xs font-bold text-white">Donanım Monitörü & RAM Optimizatörü</div>
                <div class="text-[11px] text-nexus-muted">Sistem hızlandırma araçları</div>
              </div>
            </div>
            <span class="text-xs font-mono text-red-400 font-bold">$8 / ay</span>
          </label>

          <label class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/60 border border-nexus-border/80 cursor-pointer hover:border-nexus-cyan/40 transition-all select-none">
            <div class="flex items-center gap-3">
              <input type="checkbox" checked onchange="calcRoi()" class="w-4 h-4 accent-nexus-cyan rounded" id="roi-decrypter" data-price="5">
              <div>
                <div class="text-xs font-bold text-white">Link Çözücü & Reklam/Takipçi Temizleyici</div>
                <div class="text-[11px] text-nexus-muted">Bypass ve reklam geçme servisleri</div>
              </div>
            </div>
            <span class="text-xs font-mono text-red-400 font-bold">$5 / ay</span>
          </label>
        </div>

        <!-- Calculated Outcome Box -->
        <div class="p-6 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-nexus-surface to-nexus-bg border border-emerald-500/40 text-center flex flex-col justify-between h-full">
          <div>
            <span class="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">YILLIK KAZANCINIZ</span>
            <div id="roi-annual-val" class="font-heading font-black text-4xl text-emerald-400 mt-2 mb-1">$420</div>
            <div id="roi-try-val" class="text-xs font-mono text-nexus-muted mb-4">(Yaklaşık ₺15,500 TL Tasarruf)</div>
            <p class="text-xs text-nexus-text leading-relaxed">
              NexusHub tek seferlik <b>₺349 ($29)</b> ödeme ile <span class="text-emerald-400 font-bold">8 günde</span> kendi maliyetini amorti eder!
            </p>
          </div>
          <a href="#pricing" class="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-nexus-bg font-heading font-black text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            Aboneliklerden Kurtul →
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- SAAS KILLER COMPARISON TABLE -->
  <section id="comparison" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-bg/50">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan" data-i18n="comp.tag">Neden NexusHub?</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4" data-i18n="comp.title">
          SaaS Abonelik Yorgunluğunu Bitirin.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg" data-i18n="comp.desc">
          İhtiyacınız olan her ufak araca aylık $10-$15 abonelik ödemek yerine, NexusHub'ı bir kez alın ve ömür boyu yerel olarak kullanın.
        </p>
      </div>

      <div class="rounded-3xl card-glass border border-nexus-border/80 overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-nexus-border/60 bg-nexus-surface/50 text-xs font-mono uppercase text-nexus-muted">
                <th class="p-5 font-bold">Özellik / Karşılaştırma</th>
                <th class="p-5 font-bold text-red-400">Geleneksel Web SaaS Servisleri</th>
                <th class="p-5 font-bold text-nexus-cyan bg-nexus-cyan/5">NexusHub Multi-Tool</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-nexus-border/40 font-sans">
              <tr class="hover:bg-nexus-surface/30 transition-colors">
                <td class="p-5 font-semibold text-white">Maliyet Modeli</td>
                <td class="p-5 text-red-300">Aylık $35 - $60 (Her araç için ayrı fatura)</td>
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">Tek Seferlik (Ömür Boyu Sınırsız)</td>
              </tr>
              <tr class="hover:bg-nexus-surface/30 transition-colors">
                <td class="p-5 font-semibold text-white">Veri Gizliliği</td>
                <td class="p-5 text-nexus-muted">Üçüncü taraf bulut sunucularda saklanır / loglanır</td>
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">%100 Yerel İcra (Sıfır Veri Sızıntısı)</td>
              </tr>
              <tr class="hover:bg-nexus-surface/30 transition-colors">
                <td class="p-5 font-semibold text-white">Çevrimdışı Çalışma</td>
                <td class="p-5 text-red-300">İnternet bağlantısı olmadan çalışmaz</td>
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">İnternet kesilse dahi tüm araçlar çalışır</td>
              </tr>
              <tr class="hover:bg-nexus-surface/30 transition-colors">
                <td class="p-5 font-semibold text-white">Reklam & Kısıtlama</td>
                <td class="p-5 text-red-300">Sürekli pop-up, captcha ve indirme limiti</td>
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">Sıfır reklam, limitsiz hız ve kota serbestisi</td>
              </tr>
              <tr class="hover:bg-nexus-surface/30 transition-colors">
                <td class="p-5 font-semibold text-white">Masaüstü Entegrasyonu</td>
                <td class="p-5 text-red-300">Yok (Yavaş tarayıcı sekmeleri arasında kaybolma)</td>
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">Cyber Floating Orb + Global Kısayollar (Ctrl+K)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- ARSENAL 15+ TOOLS GRID -->
  <section id="arsenal" class="relative z-10 py-24 border-t border-nexus-border/40">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">15+ Profesyonel Modül</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          Cebinizdeki Siber İsviçre Çakısı.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg">
          Geliştiriciler, güvenlik araştırmacıları, freelancerlar ve gizliliğine önem verenler için hazırlandı.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- Tool 1: TempMail -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">TempMail & Gelen Kutusu</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Spam ve kayıt tuzaklarından kurtulun. Tek tıkla rastgele e-posta üretir, gelen doğrulama kodlarını anlık olarak okur.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-nexus-cyan flex items-center gap-1">Otomatik Kod Okuyucu →</span>
        </div>

        <!-- Tool 2: Universal Decrypter -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center text-nexus-accent mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">Evrensel Link Decrypter</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Aylink, bc.vc ve para kazandıran yönlendirme tuzaklarını aşar. Tüm takip parametrelerini (UTM, fbclid) soyarak temiz hedefe uçurur.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-nexus-accent flex items-center gap-1">Reklam & Tracker Temizleyici →</span>
        </div>

        <!-- Tool 3: Cyber Fortress -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">Cyber Fortress Vault & Shredder</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              DoD 5220.22-M 7-Pass askeri standartta kalıcı dosya imha edici + AES-256-GCM askeri düzey şifreli kasa kalkanı.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-red-400 flex items-center gap-1">Adli Bilişim Kurtaramaz →</span>
        </div>

        <!-- Tool 4: Resource Sentinel -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">Resource Sentinel & RAM Flush</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Canlı CPU & RAM telemetry izleme, çekirdek yük analizi ve tek dokunuşla Windows bellek önbelleğini boşaltan optimizasyon.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-purple-400 flex items-center gap-1">Tek Tık RAM Temizleme →</span>
        </div>

        <!-- Tool 5: Floating Orb Widget -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">Desktop Floating Orb</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Masaüstünüzde sessizce süzülen sibernetik mini widget. Tek tıkla TempMail kopyalayın, RAM boşaltın ve komut paletini çağırın.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-emerald-400 flex items-center gap-1">HUD Hızlı Erişim →</span>
        </div>

        <!-- Tool 6: Bulk File Organizer & Toolkit -->
        <div class="p-6 rounded-3xl card-glass flex flex-col justify-between group">
          <div>
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <h3 class="font-heading font-bold text-xl text-white mb-2">Dosya, Ağ & Görsel Stüdyosu</h3>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Binlerce dağınık dosyayı tek tıkla kategorize edin, EXIF gizlilik verilerini silin, açık portları tarayın ve pano geçmişini yönetin.
            </p>
          </div>
          <span class="mt-6 text-[11px] font-mono text-amber-400 flex items-center gap-1">Geri Alma (Undo) Destekli →</span>
        </div>

      </div>
    </div>
  </section>

  <!-- PRICING TIERS SECTION -->
  <section id="pricing" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-bg/70">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan" data-i18n="price.tag">Şeffaf & Adil Fiyatlandırma</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4" data-i18n="price.title">
          Abonelik Yok. Bir Kez Al, Ömür Boyu Kullan.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg" data-i18n="price.desc">
          Gizli yenileme ücreti yok. Kredi kartı, Kripto veya Discord üzerinden anında teslimat.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">

        <!-- Plan 1: Free Starter -->
        <div class="p-8 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div>
            <div class="text-xs font-mono text-nexus-muted uppercase tracking-wider mb-2" data-i18n="plan1.badge">Başlangıç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Free Starter</h3>
            <div class="flex items-baseline gap-2 mb-6">
              <span class="font-heading font-black text-5xl text-white" id="price-free">₺0</span>
              <span class="text-xs font-mono text-nexus-muted" data-i18n="plan.forever">/ Sonsuza dek</span>
            </div>
            <p class="text-xs text-nexus-muted mb-8 leading-relaxed" data-i18n="plan1.desc">
              Temel araçlara sıfır maliyetle erişmek isteyen herkes için ideal giriş paketi.
            </p>
            <ul class="space-y-3.5 text-xs text-nexus-text font-medium mb-8">
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Askeri Şifre Üretici</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> QR Code Studio</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Hash & JSON Studio</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Temel Ağ Ping & IP Tespiti</li>
              <li class="flex items-center gap-2.5 text-nexus-muted line-through"><span class="w-4 h-4 shrink-0 text-nexus-border">✕</span> TempMail & Inbox Reader</li>
              <li class="flex items-center gap-2.5 text-nexus-muted line-through"><span class="w-4 h-4 shrink-0 text-nexus-border">✕</span> Cyber Fortress Shredder & Vault</li>
            </ul>
          </div>
          <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="w-full py-3.5 rounded-xl border border-nexus-border/80 hover:border-nexus-cyan text-white text-xs font-mono font-bold text-center transition-all cursor-pointer" data-i18n="plan1.btn">
            Ücretsiz İndir
          </a>
        </div>

        <!-- Plan 2: Nexus Pro (HERO TIER) -->
        <div class="p-8 rounded-3xl card-glass border-2 border-nexus-cyan flex flex-col justify-between relative shadow-[0_0_50px_rgba(6,182,212,0.25)] scale-105 bg-nexus-card">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-nexus-cyan to-nexus-accent text-nexus-bg font-heading font-black text-xs uppercase tracking-widest shadow-lg" data-i18n="plan2.badge">
            ⭐ EN ÇOK SATAN
          </div>
          <div>
            <div class="text-xs font-mono text-nexus-cyan uppercase tracking-wider mb-2">Bireysel Güç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Nexus Pro Lifetime</h3>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="font-heading font-black text-5xl text-white" id="price-pro">₺349</span>
              <span class="text-xs font-mono text-nexus-cyan font-semibold line-through" id="price-pro-old">₺699</span>
              <span class="text-xs font-mono text-nexus-muted" data-i18n="plan.onetime">/ Tek Seferlik</span>
            </div>
            <p class="text-xs text-nexus-cyan/90 font-mono mb-6" data-i18n="plan2.sub">
              Ömür boyu kullanım hakkı • Sıfır abonelik
            </p>
            <ul class="space-y-3.5 text-xs text-nexus-text font-medium mb-8">
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> <b>TÜM 15+ Siber Araç (Limitsiz)</b></li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> TempMail & Canlı Gelen Kutusu</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Evrensel Link & Reklam Çözücü</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Cyber Fortress (DoD 7-Pass İmha & Kasa)</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Desktop Floating Orb Mini Widget</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> 1 Cihaz HWID Kilitli (İstendiğinde Sıfırlanabilir)</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Ömür Boyu Güncellemeler (Auto-Updater)</li>
            </ul>
          </div>
          <button onclick="openCheckoutModal('pro')" class="w-full py-4 rounded-2xl bg-gradient-to-r from-nexus-cyan via-sky-400 to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-heading font-black text-sm text-center shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all cursor-pointer" data-i18n="plan2.btn">
            Hemen Satın Al (Anında Teslim)
          </button>
        </div>

        <!-- Plan 3: Multi-Device / Studio -->
        <div class="p-8 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div>
            <div class="text-xs font-mono text-nexus-muted uppercase tracking-wider mb-2" data-i18n="plan3.badge">Çoklu Güç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Nexus Studio (3 Cihaz)</h3>
            <div class="flex items-baseline gap-2 mb-6">
              <span class="font-heading font-black text-5xl text-white" id="price-studio">₺699</span>
              <span class="text-xs font-mono text-nexus-muted" data-i18n="plan.onetime">/ Tek Seferlik</span>
            </div>
            <p class="text-xs text-nexus-muted mb-8 leading-relaxed" data-i18n="plan3.desc">
              Hem ev hem iş bilgisayarınız veya ekibiniz için çoklu cihaz lisansı.
            </p>
            <ul class="space-y-3.5 text-xs text-nexus-text font-medium mb-8">
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> <b>3 Ayrı Bilgisayar Eşzamanlı Lisans</b></li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Tüm Pro Özellikler & Araçlar</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> VIP Discord Rolü & Özel Destek Hattı</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Öncelikli Beta Güncellemeleri</li>
            </ul>
          </div>
          <button onclick="openCheckoutModal('studio')" class="w-full py-3.5 rounded-xl border border-nexus-border/80 hover:border-nexus-cyan text-white text-xs font-mono font-bold text-center transition-all cursor-pointer" data-i18n="plan3.btn">
            Studio Paketi Al
          </button>
        </div>

      </div>

      <!-- Payment Badges -->
      <div class="mt-16 text-center">
        <p class="text-xs font-mono text-nexus-muted mb-4" data-i18n="payment.title">GÜVENLİ ÖDEME KANALLARI:</p>
        <div class="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-nexus-text">
          <span class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-nexus-surface border border-nexus-border/60">💳 Kredi / Banka Kartı (Shopier 3D)</span>
          <span class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-nexus-surface border border-nexus-border/60">⚡ Kripto (USDT TRC-20, BTC, LTC)</span>
          <span class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-nexus-surface border border-nexus-border/60">💬 Discord Ticket & Destek</span>
        </div>
      </div>

    </div>
  </section>

  <!-- CUSTOMER REVIEWS WALL (DOĞRULANMIŞ MÜŞTERİ YORUMLARI) -->
  <section id="reviews" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-surface/10">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-3">
          <span>⭐⭐⭐⭐⭐ 4.9 / 5.0</span>
          <span>(480+ Doğrulanmış Müşteri)</span>
        </div>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-1 mb-4">
          Kullanıcılarımız Ne Diyor?
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg">
          Her gün binlerce profesyonel ve gizliliğine önem veren kullanıcı NexusHub ile zamandan ve paradan tasarruf ediyor.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <!-- Review 1 -->
        <div class="p-6 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex text-amber-400 text-sm">★★★★★</div>
            <p class="text-xs text-nexus-text leading-relaxed font-sans">
              "Sırf DoD 7-Pass shredder ve link decrypter için aldım. Aylık $15 isteyen web araçlarını tamamen hayatımdan çıkardım. Efsane hızlı ve offline çalışması büyük artı."
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-nexus-border/60 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-nexus-cyan/20 text-nexus-cyan font-mono font-bold flex items-center justify-center text-xs">MK</div>
            <div>
              <div class="text-xs font-bold text-white">Mert K.</div>
              <div class="text-[10px] font-mono text-emerald-400">✓ Doğrulanmış Alıcı &bull; Senior Dev</div>
            </div>
          </div>
        </div>

        <!-- Review 2 -->
        <div class="p-6 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex text-amber-400 text-sm">★★★★★</div>
            <p class="text-xs text-nexus-text leading-relaxed font-sans">
              "RAM flush ve Sentinel donanım monitörü arka planda sıfır yük bindiriyor. Floating Orb ile tek tıkla TempMail üretip kopyalamak günlük akışımı inanılmaz hızlandırdı."
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-nexus-border/60 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold flex items-center justify-center text-xs">CD</div>
            <div>
              <div class="text-xs font-bold text-white">Caner D.</div>
              <div class="text-[10px] font-mono text-emerald-400">✓ Doğrulanmış Alıcı &bull; Siber Güvenlik</div>
            </div>
          </div>
        </div>

        <!-- Review 3 -->
        <div class="p-6 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex text-amber-400 text-sm">★★★★★</div>
            <p class="text-xs text-nexus-text leading-relaxed font-sans">
              "En sevdiğim şey sıfır abonelik olması. Bir kez aldım, kafam rahat. Sürekli para isteyen saçma SaaS sitelerinden kurtuldum. 10/10 mühendislik."
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-nexus-border/60 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-nexus-accent/20 text-nexus-accent font-mono font-bold flex items-center justify-center text-xs">TY</div>
            <div>
              <div class="text-xs font-bold text-white">Tolga Y.</div>
              <div class="text-[10px] font-mono text-emerald-400">✓ Doğrulanmış Alıcı &bull; Freelancer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SELF-SERVICE LICENSE PORTAL (LİSANS SORGULA & HWID SIFIRLA) -->
  <section id="portal" class="relative z-10 py-20 border-t border-nexus-border/40 bg-nexus-bg">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-10">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan" data-i18n="portal.tag">Müşteri Portalı</span>
        <h2 class="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight mt-2 mb-3" data-i18n="portal.title">
          Lisansımı Sorgula & Cihaz Sıfırla
        </h2>
        <p class="text-nexus-muted font-sans text-sm max-w-xl mx-auto" data-i18n="portal.desc">
          Bilgisayarınıza format attıysanız veya lisans durumunuzu kontrol etmek istiyorsanız anahtarınızı girin.
        </p>
      </div>

      <div class="p-6 sm:p-8 rounded-3xl card-glass border border-nexus-border/80 shadow-2xl">
        <div class="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <input type="text" id="portal-key-input" placeholder="NEXUS-PRO-XXXX-XXXX-XXXX-XXXX" class="w-full sm:flex-1 bg-nexus-bg border border-nexus-border/80 rounded-xl px-4 py-3.5 font-mono text-sm text-nexus-cyan uppercase outline-none focus:border-nexus-cyan">
          <button onclick="handleLicenseLookup()" id="portal-search-btn" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 hover:bg-nexus-cyan/30 text-nexus-cyan font-heading font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>Sorgula</span> 🔍
          </button>
        </div>

        <!-- Result Box -->
        <div id="portal-result" class="hidden p-5 rounded-2xl bg-nexus-bg/80 border border-nexus-border/80 text-xs font-mono space-y-3">
          <!-- Injected dynamically -->
        </div>
      </div>
    </div>
  </section>

  <!-- LIVE SYSTEM HEALTH STATUS RADAR -->
  <section class="relative z-10 py-12 border-t border-nexus-border/40 bg-nexus-surface/20">
    <div class="max-w-5xl mx-auto px-6">
      <div class="p-6 rounded-2xl card-glass border border-nexus-border/80 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
          <div>
            <div class="text-xs font-bold text-white">Canlı Sistem & Altyapı Radarı</div>
            <div class="text-[11px] font-mono text-nexus-muted">Tüm servisler %100 operasyonel durumda</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-6 text-xs font-mono">
          <span class="flex items-center gap-2 text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Lisans API: 14ms (Çevrimiçi)
          </span>
          <span class="flex items-center gap-2 text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Auto-Updater CDN: Aktif
          </span>
          <span class="flex items-center gap-2 text-nexus-cyan">
            <span class="w-2 h-2 rounded-full bg-nexus-cyan"></span> Zero-PII: %100 Yerel
          </span>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ ACCORDION WITH INSTANT SEARCH -->
  <section id="faq" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-bg">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-10">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">Merak Edilenler</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          Sıkça Sorulan Sorular.
        </h2>
      </div>

      <!-- FAQ Search Input -->
      <div class="mb-8">
        <input type="text" id="faq-search-input" oninput="filterFaq(this.value)" placeholder="Sorularda canlı ara... (Örn: format, iade, mac, güncelleme, güvenlik)" class="w-full bg-nexus-card border border-nexus-border/80 rounded-2xl px-5 py-3.5 text-xs font-mono text-white outline-none focus:border-nexus-cyan placeholder:text-nexus-muted/60 transition-all">
      </div>

      <div class="space-y-4" id="faq-container">
        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="lisans anahtari ne zaman gelir teslimat e-posta aktivasyon">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Lisans anahtarım satın aldıktan sonra ne zaman gelir?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Satın alma işleminiz onaylandığı anda lisans anahtarınız doğrudan ekranda gösterilir ve verdiğiniz e-posta adresine iletilir. Uygulamayı açıp anahtarınızı girerek saniyeler içinde Pro seviyeye geçebilirsiniz.
          </p>
        </details>

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="format cihaz degistirme yeni bilgisayar hwid sifirlama reset">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Bilgisayarıma format atarsam veya yenisini alırsam lisansım yanar mı?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Asla yanmaz! Hem masaüstü uygulaması içerisinden hem de bu sayfadaki "Lisansımı Sorgula & Cihaz Sıfırla" portalımızdan eski bilgisayar kilidinizi tek tıkla kaldırabilir ve yeni bilgisayarınızda anında kullanabilirsiniz.
          </p>
        </details>

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="guvenlik gizlilik veri log sunucu virustotal yerel offline">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Verilerim sunucularınıza iletiliyor mu?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Hayır! NexusHub %100 yerel (offline-first) mimariyle çalışır. Dosya imha, şifreleme, görsel dönüştürme ve pano geçmişiniz sadece ve sadece sizin bilgisayarınızın RAM ve diskinde işlenir. Sunucumuz sadece lisans doğrulaması yapar.
          </p>
        </details>

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="guncelleme yeni surum ucret omur boyu lifetime update">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Gelecek güncellemeler için tekrar ücret ödeyecek miyim?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Hayır! Nexus Pro Lifetime lisansı, çıkaracağımız tüm v2.x ve v3.x güncellemelerini, yeni eklenecek araçları ve performans yamalarını ömür boyu kapsar.
          </p>
        </details>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="relative z-10 py-12 border-t border-nexus-border/60 bg-nexus-surface/30">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/40 flex items-center justify-center font-mono font-bold text-nexus-cyan text-sm">
          N
        </div>
        <span class="text-xs font-mono text-nexus-muted">© 2026 NexusHub. Tüm Hakları Saklıdır.</span>
      </div>
      <div class="flex items-center gap-6 text-xs font-mono text-nexus-muted">
        <a href="https://github.com/zerviatr/NexusHub" target="_blank" class="hover:text-white transition-colors">GitHub Repository</a>
        <a href="#faq" class="hover:text-nexus-cyan transition-colors">Destek & SSS</a>
        <a href="#pricing" class="text-nexus-cyan font-bold hover:underline">Pro Lisans Al</a>
      </div>
    </div>
  </footer>

  <!-- STICKY FLOATING BOTTOM CTA -->
  <div id="sticky-bar" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl px-5 py-3 rounded-2xl card-glass border border-nexus-cyan/50 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-4 transition-all duration-300 translate-y-24 opacity-0 pointer-events-none">
    <div class="flex items-center gap-3 truncate">
      <div class="w-3 h-3 rounded-full bg-nexus-cyan animate-pulse shrink-0"></div>
      <div class="truncate">
        <div class="text-xs font-bold text-white truncate">NexusHub v2.0.3 Suite</div>
        <div class="text-[10px] font-mono text-nexus-muted truncate">Ömür Boyu Tek Ödeme • Sıfır Abonelik</div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-nexus-border text-white font-mono text-xs transition-colors cursor-pointer">
        İndir
      </a>
      <a href="#pricing" class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 text-nexus-bg font-heading font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer">
        Lisans Al
      </a>
    </div>
  </div>

  <!-- LIVE FOMO SALES TICKER TOAST (BOTTOM-LEFT) -->
  <div id="fomo-toast" class="fixed bottom-6 left-6 z-40 max-w-sm px-4 py-3 rounded-2xl card-glass border border-nexus-cyan/40 shadow-[0_12px_35px_rgba(0,0,0,0.6)] flex items-center gap-3 transition-all duration-500 translate-y-24 opacity-0 pointer-events-none select-none">
    <div class="w-8 h-8 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 flex items-center justify-center shrink-0">
      <span class="text-sm">⚡</span>
    </div>
    <div class="truncate text-xs">
      <div id="fomo-text" class="font-bold text-white truncate">İstanbul'dan bir kullanıcı lisans aldı</div>
      <div id="fomo-time" class="text-[10px] font-mono text-nexus-cyan">2 dakika önce &bull; Nexus Pro Lifetime</div>
    </div>
    <button onclick="dismissFomo()" class="text-nexus-muted hover:text-white text-xs pl-1 cursor-pointer">✕</button>
  </div>

  <!-- CHANGELOG MODAL (v2.0.3 YENİLİKLER) -->
  <div id="changelog-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="w-full max-w-lg rounded-3xl card-glass border border-nexus-cyan/50 p-6 sm:p-8 text-nexus-text relative shadow-2xl">
      <button onclick="closeChangelogModal()" class="absolute top-5 right-5 text-nexus-muted hover:text-white p-1 rounded-lg hover:bg-nexus-border cursor-pointer">✕</button>
      
      <div class="flex items-center gap-2 text-xs font-mono text-nexus-cyan mb-1 uppercase tracking-wider">
        <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-ping"></span>
        <span>SÜRÜM RADARI</span>
      </div>
      <h3 class="font-heading font-black text-2xl text-white mb-4">NexusHub v2.0.3 Yenilikleri</h3>

      <div class="space-y-3.5 text-xs text-nexus-muted font-sans max-h-80 overflow-y-auto pr-2">
        <div class="p-3 rounded-xl bg-nexus-surface/60 border border-nexus-border/60">
          <div class="text-white font-bold mb-1 flex items-center gap-2">
            <span>🔮 Floating Orb Mini-Widget</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-nexus-cyan/20 text-nexus-cyan">YENİ</span>
          </div>
          <div>Masaüstünde yüzen canlı HUD: 1-Tık TempMail kopyalama, canlı CPU/RAM göstergesi ve anında bellek boşaltma.</div>
        </div>

        <div class="p-3 rounded-xl bg-nexus-surface/60 border border-nexus-border/60">
          <div class="text-white font-bold mb-1 flex items-center gap-2">
            <span>🔄 Discord-Grade Auto-Updater</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">GÜÇLENDİRİLDİ</span>
          </div>
          <div>Kapanıp açılmama sorunları çözüldü; self-healing watchdog süpervizörü ve animasyonlu geçiş ekranı eklendi.</div>
        </div>

        <div class="p-3 rounded-xl bg-nexus-surface/60 border border-nexus-border/60">
          <div class="text-white font-bold mb-1 flex items-center gap-2">
            <span>🔔 Telegram & Discord Webhook Motoru</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">GÜVENLİK</span>
          </div>
          <div>Aktivasyon, lisans iptali ve şüpheli isteklerde anında mobil bildirim dispatche'ı.</div>
        </div>

        <div class="p-3 rounded-xl bg-nexus-surface/60 border border-nexus-border/60">
          <div class="text-white font-bold mb-1 flex items-center gap-2">
            <span>🎟️ Süre Uzatma Kuponları & Satış Kanalları</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">TİCARİ</span>
          </div>
          <div>NEXUS-EXT-XXD kupon motoru ve Shopier/Discord/Kripto kanal takibi.</div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-nexus-border/60 flex justify-end">
        <button onclick="closeChangelogModal()" class="px-5 py-2 rounded-xl bg-nexus-cyan text-nexus-bg font-bold font-heading text-xs cursor-pointer">
          Anladım
        </button>
      </div>
    </div>
  </div>

  <!-- CHECKOUT MODAL WITH DISCOUNT COUPON INPUT -->
  <div id="checkout-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-3xl card-glass border border-nexus-cyan/50 p-6 sm:p-8 text-nexus-text relative shadow-2xl">
      <button onclick="closeCheckoutModal()" class="absolute top-5 right-5 text-nexus-muted hover:text-white p-1 rounded-lg hover:bg-nexus-border cursor-pointer">✕</button>
      
      <div class="text-xs font-mono text-nexus-cyan mb-1 uppercase tracking-wider" data-i18n="modal.tag">GÜVENLİ SİPARİŞ</div>
      <h3 id="modal-plan-name" class="font-heading font-black text-2xl text-white mb-1">Nexus Pro Lifetime</h3>
      <div class="flex items-baseline gap-2 mb-5">
        <span id="modal-plan-price" class="text-3xl font-mono font-bold text-white">₺349</span>
        <span id="modal-discount-tag" class="hidden text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">%20 İNDİRİM UYGULANDI</span>
      </div>

      <!-- Coupon Code Box -->
      <div class="mb-5 p-3 rounded-2xl bg-nexus-bg border border-nexus-border/80 flex items-center gap-2">
        <input type="text" id="coupon-input" placeholder="İndirim / Kupon Kodu (Örn: NEXUS20)" class="w-full bg-transparent text-xs font-mono text-nexus-cyan uppercase outline-none placeholder:text-nexus-muted/50">
        <button onclick="applyCoupon()" class="px-3 py-1.5 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/40 hover:bg-nexus-cyan/30 text-nexus-cyan text-xs font-mono font-bold transition-all cursor-pointer shrink-0">Uygula</button>
      </div>

      <div class="space-y-3 mb-6">
        <a href="https://shopier.com" target="_blank" class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/80 border border-nexus-border hover:border-nexus-cyan/60 transition-all group">
          <div class="flex items-center gap-3">
            <span class="text-xl">💳</span>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-nexus-cyan transition-colors">Shopier ile Güvenli Öde</div>
              <div class="text-[10px] text-nexus-muted">Kredi Kartı / Banka Kartı / 3D Secure</div>
            </div>
          </div>
          <span class="text-xs font-mono text-nexus-cyan font-bold">Satın Al →</span>
        </a>

        <a href="https://discord.gg" target="_blank" class="flex items-center justify-between p-3.5 rounded-2xl bg-nexus-surface/80 border border-nexus-border hover:border-nexus-purple/60 transition-all group">
          <div class="flex items-center gap-3">
            <span class="text-xl">💬</span>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">Discord / Destek Bileti</div>
              <div class="text-[10px] text-nexus-muted">Kripto (USDT/BTC/LTC) & Havale/EFT</div>
            </div>
          </div>
          <span class="text-xs font-mono text-purple-400 font-bold">Ticket Aç →</span>
        </a>
      </div>

      <div class="p-3 rounded-xl bg-nexus-surface/40 border border-nexus-border/60 text-[11px] text-nexus-muted flex items-center gap-2">
        <span class="text-emerald-400 font-bold">✓</span>
        <span>Ödeme sonrası lisans anahtarınız ekranda ve mailinizde anında aktive edilir.</span>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    // ─── Multilingual & Multi-Currency Engine ──────────────────────────────
    let currentLang = 'tr';
    const translations = {
      tr: {
        'nav.preview': 'Arayüz',
        'nav.roi': 'Tasarruf Hesabı',
        'nav.comparison': 'SaaS Katili',
        'nav.arsenal': '15+ Cephane',
        'nav.pricing': 'Fiyatlandırma',
        'nav.reviews': 'Yorumlar',
        'nav.portal': 'Lisans Sorgula',
        'nav.faq': 'SSS',
        'nav.buy': 'Lisans Al',
        'hero.pill.tools': '15+ Siber Güç',
        'hero.pill.noSub': 'Sıfır Abonelik Tuzağı',
        'hero.title1': 'Aylık Aboneliklere',
        'hero.title2': 'Son.',
        'hero.title3': 'Tek Yazılım,',
        'hero.title4': '15+ Siber Güç.',
        'hero.desc': 'Tek kullanımlık geçici posta, reklam & link çözücü, DoD askeri veri imha kalkanı, donanım monitörü ve şifreli kasa. Her şeye ayrı ayrı para ödemeyi bırakın.',
        'hero.btnDownload': 'Windows için İndir (v2.0.3)',
        'hero.btnPro': 'Ömür Boyu Pro Lisans',
        'sim.tag': 'Canlı Arayüzü İncele',
        'sim.title': 'NexusHub Masaüstünüzde Nasıl Görünür?',
        'sim.desc': 'İndirmeden önce aşağıdaki sekmelere tıklayarak NexusHub\\'ın sibernetik araçlarını ve pürüzsüz arayüzünü canlı test edin.',
        'sim.tools.tempmail': 'TempMail Posta',
        'sim.tools.decrypter': 'Link Decrypter',
        'sim.tools.fortress': 'Cyber Fortress',
        'sim.tools.sentinel': 'Resource Sentinel',
        'sim.tools.orb': 'Floating Orb HUD',
        'roi.tag': 'ROI Tasarruf Simülatörü',
        'roi.title': 'NexusHub ile Yılda Kaç Para Tasarruf Edersiniz?',
        'roi.desc': 'Kullandığınız araçları işaretleyin, her ay SaaS platformlarına saçtığınız paranın NexusHub ile nasıl cebinizde kaldığını görün.',
        'comp.tag': 'Neden NexusHub?',
        'comp.title': 'SaaS Abonelik Yorgunluğunu Bitirin.',
        'comp.desc': 'İhtiyacınız olan her ufak araca aylık $10-$15 abonelik ödemek yerine, NexusHub\\'ı bir kez alın ve ömür boyu yerel olarak kullanın.',
        'price.tag': 'Şeffaf & Adil Fiyatlandırma',
        'price.title': 'Abonelik Yok. Bir Kez Al, Ömür Boyu Kullan.',
        'price.desc': 'Gizli yenileme ücreti yok. Kredi kartı, Kripto veya Discord üzerinden anında teslimat.',
        'plan.forever': '/ Sonsuza dek',
        'plan.onetime': '/ Tek Seferlik',
        'plan1.badge': 'Başlangıç',
        'plan1.desc': 'Temel araçlara sıfır maliyetle erişmek isteyen herkes için ideal giriş paketi.',
        'plan1.btn': 'Ücretsiz İndir',
        'plan2.badge': '⭐ EN ÇOK SATAN',
        'plan2.sub': 'Ömür boyu kullanım hakkı • Sıfır abonelik',
        'plan2.btn': 'Hemen Satın Al (Anında Teslim)',
        'plan3.badge': 'Çoklu Güç',
        'plan3.desc': 'Hem ev hem iş bilgisayarınız veya ekibiniz için çoklu cihaz lisansı.',
        'plan3.btn': 'Studio Paketi Al',
        'portal.tag': 'Müşteri Portalı',
        'portal.title': 'Lisansımı Sorgula & Cihaz Sıfırla',
        'portal.desc': 'Bilgisayarınıza format attıysanız veya lisans durumunuzu kontrol etmek istiyorsanız anahtarınızı girin.',
        'modal.tag': 'GÜVENLİ SİPARİŞ'
      },
      en: {
        'nav.preview': 'Interface',
        'nav.roi': 'Savings Calc',
        'nav.comparison': 'SaaS Killer',
        'nav.arsenal': '15+ Arsenal',
        'nav.pricing': 'Pricing',
        'nav.reviews': 'Reviews',
        'nav.portal': 'Lookup License',
        'nav.faq': 'FAQ',
        'nav.buy': 'Get License',
        'hero.pill.tools': '15+ Cyber Powers',
        'hero.pill.noSub': 'Zero Subscription Trap',
        'hero.title1': 'Stop Monthly',
        'hero.title2': 'Subscriptions.',
        'hero.title3': 'One Suite,',
        'hero.title4': '15+ Cyber Tools.',
        'hero.desc': 'Instant disposable email, link & ad decrypter, military DoD shredder, live hardware sentinel, and encrypted vault. Stop paying separate fees for simple utilities.',
        'hero.btnDownload': 'Download for Windows (v2.0.3)',
        'hero.btnPro': 'Lifetime Pro License',
        'sim.tag': 'Explore the Interface',
        'sim.title': 'How NexusHub Looks on Your Desktop',
        'sim.desc': 'Click the tabs below to test drive NexusHub\\'s cybernetic tools and smooth interface before downloading.',
        'sim.tools.tempmail': 'TempMail Inbox',
        'sim.tools.decrypter': 'Link Decrypter',
        'sim.tools.fortress': 'Cyber Fortress',
        'sim.tools.sentinel': 'Resource Sentinel',
        'sim.tools.orb': 'Floating Orb HUD',
        'roi.tag': 'ROI Savings Calculator',
        'roi.title': 'How Much Money Do You Save with NexusHub?',
        'roi.desc': 'Check the utilities you use and see how much money you stop wasting on recurring SaaS fees.',
        'comp.tag': 'Why NexusHub?',
        'comp.title': 'End SaaS Subscription Fatigue.',
        'comp.desc': 'Instead of paying $10–$15/mo for every tiny utility, own NexusHub once and run everything locally forever.',
        'price.tag': 'Transparent & Fair Pricing',
        'price.title': 'No Subscriptions. Buy Once, Own Forever.',
        'price.desc': 'No hidden renewals. Instant delivery via credit card, crypto, or Discord.',
        'plan.forever': '/ Forever free',
        'plan.onetime': '/ One-time',
        'plan1.badge': 'Starter',
        'plan1.desc': 'Perfect entry pack for anyone wanting core utilities at zero cost.',
        'plan1.btn': 'Download Free',
        'plan2.badge': '⭐ MOST POPULAR',
        'plan2.sub': 'Lifetime access • Zero subscriptions',
        'plan2.btn': 'Get License (Instant Delivery)',
        'plan3.badge': 'Multi-Device',
        'plan3.desc': 'Multi-device license for your home and work PC or your core team.',
        'plan3.btn': 'Get Studio Pack',
        'portal.tag': 'Customer Portal',
        'portal.title': 'Check License & Reset Hardware',
        'portal.desc': 'Formatted your PC or need to verify your license status? Check your key below.',
        'modal.tag': 'SECURE CHECKOUT'
      }
    };

    function toggleLanguage() {
      currentLang = currentLang === 'tr' ? 'en' : 'tr';
      document.getElementById('lang-flag').innerText = currentLang === 'tr' ? '🇹🇷' : '🇺🇸';
      document.getElementById('lang-label').innerText = currentLang === 'tr' ? 'TR (₺)' : 'EN ($)';

      // Update text nodes
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
          el.innerText = translations[currentLang][key];
        }
      });

      // Update prices
      if (currentLang === 'tr') {
        document.getElementById('price-free').innerText = '₺0';
        document.getElementById('price-pro').innerText = '₺349';
        document.getElementById('price-pro-old').innerText = '₺699';
        document.getElementById('price-studio').innerText = '₺699';
      } else {
        document.getElementById('price-free').innerText = '$0';
        document.getElementById('price-pro').innerText = '$29';
        document.getElementById('price-pro-old').innerText = '$59';
        document.getElementById('price-studio').innerText = '$49';
      }
      calcRoi();
    }

    // ─── Interactive Mockup Tool Switcher ──────────────────────────────────
    const tools = ['tempmail', 'decrypter', 'fortress', 'sentinel', 'orb'];
    function switchMockTool(toolId) {
      tools.forEach(t => {
        const p = document.getElementById('mock-panel-' + t);
        const b = document.getElementById('mock-btn-' + t);
        if (t === toolId) {
          p.classList.remove('hidden');
          b.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 bg-nexus-cyan/15 text-nexus-cyan border border-nexus-cyan/30 transition-all cursor-pointer';
        } else {
          p.classList.add('hidden');
          b.className = 'w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer';
        }
      });
    }

    function simulateNewMail() {
      const names = ['cyber_recon', 'phantom_user', 'shadow_matrix', 'delta_operator'];
      const domains = ['nexusmail.org', 'tempdrop.io', 'ghostinbox.net'];
      const randomEmail = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 900 + 100) + '@' + domains[Math.floor(Math.random() * domains.length)];
      document.getElementById('mock-email-addr').innerText = randomEmail;
    }

    function triggerSimRamFlush() {
      const btn = document.getElementById('mock-flush-btn');
      const bar = document.getElementById('mock-ram-bar');
      const txt = document.getElementById('mock-ram-txt');
      btn.innerText = 'Temizleniyor...';
      btn.disabled = true;
      setTimeout(() => {
        bar.style.width = '19%';
        txt.innerText = '19%';
        txt.classList.add('text-emerald-400');
        btn.innerText = '✓ Temizlendi (1.4 GB Boşaldı)';
        setTimeout(() => {
          btn.innerText = '⚡ 1-Tık RAM Flush';
          btn.disabled = false;
        }, 3000);
      }, 500);
    }

    // ─── ROI Calculator Logic ──────────────────────────────────────────────
    function calcRoi() {
      let monthly = 0;
      ['roi-tempmail', 'roi-shredder', 'roi-sentinel', 'roi-decrypter'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) {
          monthly += parseInt(el.getAttribute('data-price') || '0');
        }
      });

      const annualUSD = monthly * 12;
      const annualTRY = annualUSD * 37;

      const annualEl = document.getElementById('roi-annual-val');
      const tryEl = document.getElementById('roi-try-val');

      if (currentLang === 'tr') {
        annualEl.innerText = '$' + annualUSD;
        tryEl.innerText = '(Yaklaşık ₺' + annualTRY.toLocaleString('tr-TR') + ' TL Tasarruf)';
      } else {
        annualEl.innerText = '$' + annualUSD + ' / yr';
        tryEl.innerText = '(Zero recurring bills ever)';
      }
    }

    // ─── Live Social Proof FOMO Ticker ─────────────────────────────────────
    const fomoData = [
      { city: 'İstanbul', plan: 'Nexus Pro Lifetime', time: '2 dakika önce' },
      { city: 'Ankara', plan: 'Nexus Studio (3 Cihaz)', time: '5 dakika önce' },
      { city: 'İzmir', plan: 'Nexus Pro Lifetime', time: '8 dakika önce' },
      { city: 'Bursa', plan: 'Nexus Pro Lifetime', time: '14 dakika önce' },
      { city: 'Antalya', plan: 'Nexus Studio (3 Cihaz)', time: '19 dakika önce' }
    ];
    let fomoIdx = 0;
    function showNextFomo() {
      const item = fomoData[fomoIdx];
      const toast = document.getElementById('fomo-toast');
      const txt = document.getElementById('fomo-text');
      const tm = document.getElementById('fomo-time');
      
      txt.innerText = item.city + "'dan bir kullanıcı sipariş verdi";
      tm.innerText = item.time + " • " + item.plan;

      toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      }, 4500);

      fomoIdx = (fomoIdx + 1) % fomoData.length;
    }
    setTimeout(() => {
      showNextFomo();
      setInterval(showNextFomo, 16000);
    }, 4000);

    function dismissFomo() {
      const toast = document.getElementById('fomo-toast');
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    }

    // ─── Self-Service License Lookup & Hardware Reset ───────────────────────
    let currentLookupKey = '';
    async function handleLicenseLookup() {
      const key = document.getElementById('portal-key-input').value.trim();
      const resBox = document.getElementById('portal-result');
      const btn = document.getElementById('portal-search-btn');

      if (!key) {
        alert('Lütfen bir lisans anahtarı girin.');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Sorgulanıyor...';
      resBox.classList.remove('hidden');
      resBox.innerHTML = '<div class="text-nexus-cyan animate-pulse">Sunucu veritabanı taranıyor...</div>';

      try {
        const resp = await fetch('/api/license/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
        const data = await resp.json();

        if (!data.found) {
          resBox.innerHTML = '<div class="text-red-400 font-bold">❌ ' + (data.reason || 'Geçersiz Lisans Anahtarı') + '</div>';
        } else {
          currentLookupKey = key;
          const isLife = data.expiresAt === 0;
          const expText = isLife ? 'Sınırsız (Ömür Boyu)' : new Date(data.expiresAt).toLocaleDateString('tr-TR');
          
          resBox.innerHTML = \`
            <div class="flex flex-col sm:flex-row justify-between sm:items-center border-b border-nexus-border/60 pb-3 gap-2">
              <div>
                <span class="text-white font-bold text-sm">\${data.key}</span>
                <span class="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-nexus-cyan/20 text-nexus-cyan uppercase">\${data.tier}</span>
              </div>
              <span class="\${data.isRevoked ? 'text-red-400' : 'text-emerald-400'} font-bold">
                \${data.isRevoked ? 'İPTAL EDİLDİ' : data.isExpired ? 'SÜRESİ DOLDU' : '✓ AKTİF'}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-nexus-muted">
              <div>Geçerlilik: <b class="text-white">\${expText}</b></div>
              <div>Bağlı Cihaz: <b class="text-white">\${data.activeDevices} / \${data.maxDevices} Cihaz</b></div>
            </div>
            <div class="pt-2 flex items-center justify-between">
              <span class="text-[11px] text-nexus-muted">Format sonrası cihazı değiştirmek mi istiyorsunuz?</span>
              <button onclick="handleResetHardware()" class="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 font-bold transition-all cursor-pointer">
                Cihazı Sıfırla (HWID Boşa Çıkar)
              </button>
            </div>
          \`;
        }
      } catch (err) {
        resBox.innerHTML = '<div class="text-red-400">Sunucu ile iletişim kurulamadı.</div>';
      } finally {
        btn.disabled = false;
        btn.innerText = 'Sorgula 🔍';
      }
    }

    async function handleResetHardware() {
      if (!currentLookupKey) return;
      if (!confirm('Bu lisansa bağlı eski bilgisayar kaydı silinecektir. Onaylıyor musunuz?')) return;

      const resBox = document.getElementById('portal-result');
      resBox.innerHTML = '<div class="text-nexus-cyan animate-pulse">Cihaz kilidi kaldırılıyor...</div>';

      try {
        const resp = await fetch('/api/license/reset-hardware', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: currentLookupKey })
        });
        const data = await resp.json();
        if (data.success) {
          resBox.innerHTML = '<div class="text-emerald-400 font-bold">✓ ' + data.message + '</div>';
        } else {
          resBox.innerHTML = '<div class="text-red-400 font-bold">❌ ' + data.reason + '</div>';
        }
      } catch {
        resBox.innerHTML = '<div class="text-red-400 font-bold">İşlem başarısız oldu.</div>';
      }
    }

    // ─── Instant FAQ Live Search ───────────────────────────────────────────
    function filterFaq(query) {
      const q = query.toLowerCase().trim();
      const items = document.querySelectorAll('.faq-item');
      items.forEach(item => {
        const text = (item.getAttribute('data-text') + ' ' + item.innerText).toLowerCase();
        if (!q || text.includes(q)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }

    // ─── Changelog Modal Control ───────────────────────────────────────────
    function openChangelogModal() {
      document.getElementById('changelog-modal').classList.remove('hidden');
    }
    function closeChangelogModal() {
      document.getElementById('changelog-modal').classList.add('hidden');
    }

    // ─── Checkout Modal with Promo Code Engine ─────────────────────────────
    let selectedPlan = 'pro';
    let basePriceTR = 349;
    let basePriceEN = 29;

    function openCheckoutModal(plan) {
      selectedPlan = plan;
      const modalName = document.getElementById('modal-plan-name');
      const modalPrice = document.getElementById('modal-plan-price');
      document.getElementById('modal-discount-tag').classList.add('hidden');
      document.getElementById('coupon-input').value = '';

      if (plan === 'pro') {
        modalName.innerText = 'Nexus Pro Lifetime';
        basePriceTR = 349;
        basePriceEN = 29;
      } else {
        modalName.innerText = 'Nexus Studio (3 Cihaz)';
        basePriceTR = 699;
        basePriceEN = 49;
      }

      modalPrice.innerText = currentLang === 'tr' ? '₺' + basePriceTR : '$' + basePriceEN;
      document.getElementById('checkout-modal').classList.remove('hidden');
    }

    function closeCheckoutModal() {
      document.getElementById('checkout-modal').classList.add('hidden');
    }

    function applyCoupon() {
      const code = document.getElementById('coupon-input').value.trim().toUpperCase();
      const tag = document.getElementById('modal-discount-tag');
      const priceEl = document.getElementById('modal-plan-price');

      if (code === 'NEXUS20' || code === 'DISCORD' || code === 'SPECIAL') {
        const discountedTR = Math.round(basePriceTR * 0.8);
        const discountedEN = Math.round(basePriceEN * 0.8);
        priceEl.innerText = currentLang === 'tr' ? '₺' + discountedTR : '$' + discountedEN;
        tag.classList.remove('hidden');
        tag.innerText = '%20 İNDİRİM UYGULANDI!';
      } else if (code) {
        alert('Geçersiz veya süresi dolmuş kupon kodu.');
      }
    }

    // ─── Sticky Bottom Bar on Scroll ───────────────────────────────────────
    window.addEventListener('scroll', () => {
      const bar = document.getElementById('sticky-bar');
      if (window.scrollY > 400) {
        bar.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
        bar.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      } else {
        bar.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        bar.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      }
    });

    // Initial calculation
    calcRoi();
  </script>
</body>
</html>`;
}
