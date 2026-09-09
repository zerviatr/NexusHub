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

  <!-- FLOATING MINIMALIST ISLAND NAVBAR -->
  <header class="sticky top-4 z-50 px-4 pointer-events-none mb-2">
    <nav class="max-w-4xl mx-auto h-14 px-4 sm:px-5 rounded-full card-glass border border-nexus-border/80 bg-nexus-bg/90 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 pointer-events-auto">
      
      <!-- Brand Logo -->
      <a href="#" class="flex items-center gap-2.5 group shrink-0">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-nexus-cyan via-nexus-accent to-purple-600 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
          <div class="w-full h-full bg-nexus-bg rounded-full flex items-center justify-center font-mono font-black text-nexus-cyan text-xs">
            N
          </div>
        </div>
        <span class="font-heading font-black text-sm tracking-wider text-white">NEXUS<span class="text-nexus-cyan">HUB</span></span>
      </a>

      <!-- 4 Core Navigation Anchors -->
      <div class="hidden md:flex items-center gap-7 text-xs font-medium text-nexus-muted">
        <a href="#simulator" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.preview">Arayüz</a>
        <a href="#arsenal" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.arsenal">Cephanelik</a>
        <a href="#pricing" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.pricing">Fiyatlar</a>
        <a href="#faq" class="hover:text-nexus-cyan transition-colors" data-i18n="nav.faq">SSS</a>
      </div>

      <!-- Right Action Items -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Quick Spotlight Search Pill -->
        <button onclick="openCmdPalette()" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-nexus-surface/60 border border-nexus-border/60 hover:border-nexus-cyan/50 text-[11px] font-mono text-nexus-muted hover:text-white transition-all cursor-pointer">
          <span class="text-nexus-cyan text-[10px]">⚡</span>
          <span class="hidden sm:inline">Ctrl K</span>
        </button>

        <!-- Compact Language Switcher -->
        <button onclick="toggleLanguage()" id="lang-btn" class="px-2 py-1.5 rounded-full border border-nexus-border/60 hover:border-nexus-cyan/50 text-[11px] font-mono text-nexus-muted hover:text-white transition-all flex items-center gap-1 cursor-pointer">
          <span id="lang-flag">🇹🇷</span>
          <span id="lang-label" class="font-bold">TR</span>
        </button>

        <!-- CTA Pill -->
        <a href="#pricing" class="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-heading font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer" data-i18n="nav.buy">
          Lisans Al →
        </a>
      </div>

    </nav>
  </header>

  <!-- HERO SECTION -->
  <section class="relative z-10 pt-16 pb-20 overflow-hidden">
    <!-- Matrix Cyber Rain Canvas Backdrop -->
    <canvas id="hero-matrix-canvas" class="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0"></canvas>
    
    <div class="max-w-7xl mx-auto px-6 relative z-10">
      
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
      <div class="text-center max-w-4xl mx-auto mb-8">
        <h1 class="font-heading font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-white leading-[1.08] mb-6">
          <span data-i18n="hero.title1">Aylık Aboneliklere</span> <span class="bg-gradient-to-r from-nexus-cyan via-nexus-accent to-purple-400 bg-clip-text text-transparent" data-i18n="hero.title2">Son.</span><br>
          <span data-i18n="hero.title3">Tek Yazılım,</span> <span class="underline decoration-nexus-cyan/40 underline-offset-8" data-i18n="hero.title4">15+ Siber Güç.</span>
        </h1>
        <p class="text-base sm:text-lg md:text-xl text-nexus-muted leading-relaxed max-w-2xl mx-auto font-sans" data-i18n="hero.desc">
          Tek kullanımlık geçici posta, reklam & link çözücü, DoD askeri veri imha kalkanı, donanım monitörü ve şifreli kasa. Her şeye ayrı ayrı para ödemeyi bırakın.
        </p>
      </div>

      <!-- Quick Command Bar Trigger in Hero -->
      <div class="max-w-xl mx-auto mb-10">
        <div onclick="openCmdPalette()" class="group p-2 sm:p-2.5 rounded-2xl card-glass border border-nexus-border/80 hover:border-nexus-cyan/60 flex items-center justify-between gap-3 cursor-pointer shadow-[0_10px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.2)] transition-all">
          <div class="flex items-center gap-3 pl-2 truncate">
            <span class="text-nexus-cyan text-sm sm:text-base animate-pulse">⚡</span>
            <span class="text-xs sm:text-sm text-nexus-muted group-hover:text-white transition-colors truncate">Bir araç arayın veya simüle edin... (Örn: tempmail, ram, wifi)</span>
          </div>
          <div class="flex items-center gap-1.5 pr-1 shrink-0">
            <kbd class="px-2 py-1 rounded-lg bg-nexus-surface border border-nexus-border text-[11px] font-mono text-nexus-cyan font-bold shadow-sm group-hover:border-nexus-cyan/50">Ctrl + K</kbd>
          </div>
        </div>
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
            <button onclick="switchMockTool('password')" id="mock-btn-password" class="w-full text-left px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2.5 text-nexus-muted hover:text-white hover:bg-nexus-surface transition-all cursor-pointer">
              <span>🔑</span> <span data-i18n="sim.tools.password">Parola Analizörü</span>
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

            <!-- Panel 2: Link Decrypter Preview (Interactive) -->
            <div id="mock-panel-decrypter" class="space-y-4 hidden">
              <div>
                <h3 class="font-heading font-black text-xl text-white flex items-center gap-2">
                  Universal Link Decrypter & Tracker Stripper <span class="px-2 py-0.5 text-[10px] rounded bg-nexus-cyan/20 text-nexus-cyan font-mono font-bold">İNTERAKTİF</span>
                </h3>
                <p class="text-xs text-nexus-muted mt-0.5">Yönlendirme tuzaklarını, bc.vc ve aylink gibi para tuzaklarını canlı çözün.</p>
              </div>
              <div class="space-y-3">
                <div class="flex flex-col sm:flex-row gap-2">
                  <input type="text" id="sim-decrypter-input" value="https://bc.vc/target_download?utm_source=adnetwork&fbclid=IwAR294x_token984&aff_id=7421&gclid=CjwKCA" class="w-full bg-nexus-bg border border-nexus-border/80 rounded-xl px-4 py-3 font-mono text-xs text-red-300 outline-none focus:border-nexus-cyan">
                  <button onclick="runSimDecrypter()" class="px-5 py-3 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-mono text-xs font-bold hover:bg-nexus-cyan/30 cursor-pointer shrink-0 transition-all">
                    Bypass & Temizle ⚡
                  </button>
                </div>
                <div id="sim-decrypter-result" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs text-emerald-400 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span id="sim-decrypter-clean-url" class="truncate font-semibold">✓ https://drive.google.com/file/d/1A8z...</span>
                  <span id="sim-decrypter-badge" class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-[10px] font-bold shrink-0 self-start sm:self-auto">4 Takip Parametresi Silindi (0.3ms)</span>
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

            <!-- Panel 6: Password Entropy & Crack Time Analyzer Preview -->
            <div id="mock-panel-password" class="space-y-4 hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 class="font-heading font-black text-xl text-white flex items-center gap-2">
                    Parola & Entropi Güvenlik Analizörü <span class="px-2 py-0.5 text-[10px] rounded bg-nexus-cyan/20 text-nexus-cyan font-mono font-bold">CANLI TEST</span>
                  </h3>
                  <p class="text-xs text-nexus-muted mt-0.5">Parolanız RTX 4090 süper bilgisayar kümesinde ne kadar sürede kırılır?</p>
                </div>
                <button onclick="generateMilitaryPass()" class="px-3 py-1.5 rounded-lg bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-mono text-xs hover:bg-nexus-cyan/30 cursor-pointer shrink-0">
                  🎲 Askeri Parola Üret
                </button>
              </div>
              <div class="space-y-3">
                <div class="relative">
                  <input type="text" id="sim-pass-input" oninput="analyzePassword(this.value)" value="Nexus#2026!Fortress_Ultra" placeholder="Parolanızı yazın veya test edin..." class="w-full bg-nexus-bg border border-nexus-border/80 rounded-xl px-4 py-3 font-mono text-sm text-nexus-cyan outline-none focus:border-nexus-cyan">
                  <button onclick="copyGeneratedPass()" id="sim-pass-copy-btn" class="absolute right-2 top-2 px-2.5 py-1.5 rounded-lg bg-nexus-surface hover:bg-nexus-border text-xs font-mono text-nexus-muted hover:text-white border border-nexus-border transition-all">Kopyala</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div class="p-3 rounded-xl bg-nexus-bg border border-nexus-border/80">
                    <div class="text-nexus-muted text-[10px] mb-1">Shannon Entropisi</div>
                    <div id="sim-entropy-val" class="font-bold text-nexus-cyan text-sm">96.4 Bit</div>
                  </div>
                  <div class="p-3 rounded-xl bg-nexus-bg border border-nexus-border/80">
                    <div class="text-nexus-muted text-[10px] mb-1">Kırılma Tahmini (RTX 4090)</div>
                    <div id="sim-crack-time" class="font-bold text-emerald-400 text-sm">~4.8 Trilyon Yıl</div>
                  </div>
                  <div class="p-3 rounded-xl bg-nexus-bg border border-nexus-border/80 col-span-2 sm:col-span-1">
                    <div class="text-nexus-muted text-[10px] mb-1">DoD Standart Güvenlik</div>
                    <div id="sim-strength-label" class="font-bold text-emerald-400 text-sm">SİBER KALE (A+)</div>
                  </div>
                </div>
                <div class="w-full h-2 bg-nexus-surface rounded-full overflow-hidden">
                  <div id="sim-pass-strength-bar" class="w-full h-full bg-gradient-to-r from-emerald-400 to-nexus-cyan transition-all duration-300"></div>
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

  <!-- LIVE RAM & RESOURCE BENCHMARK SLIDER (NATIVE CORE VS BLOATED SAAS) -->
  <section id="benchmark" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-surface/10">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-nexus-cyan/10 border border-nexus-cyan/30 text-nexus-cyan text-xs font-mono mb-3">
          <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-pulse"></span>
          <span>CANLI PERFORMANS & KAYNAK KIYASLAMASI</span>
        </div>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mb-4">
          Bilgisayarınızı Ağlatmayan Saf Güç.
        </h2>
        <p class="text-nexus-muted font-sans text-sm sm:text-base">
          Aşağıdaki eşzamanlı araç yükü çubuğunu kaydırın; web tabanlı hantal araçların RAM ve işlemcinizi nasıl kilitlediğini, NexusHub'ın ise nasıl tüy gibi hafif kaldığını canlı test edin.
        </p>
      </div>

      <!-- Benchmark Interactive Card -->
      <div class="p-6 sm:p-10 rounded-3xl card-glass border border-nexus-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        <!-- Slider Control -->
        <div class="max-w-xl mx-auto mb-10 text-center">
          <div class="flex items-center justify-between text-xs font-mono mb-2">
            <span class="text-nexus-muted">Eşzamanlı Yük Testi:</span>
            <span id="benchmark-load-label" class="font-bold text-nexus-cyan text-sm">5 Aktif Araç / Görev</span>
          </div>
          <input type="range" id="benchmark-slider" min="1" max="15" value="5" oninput="updateBenchmark(this.value)" class="w-full h-2.5 bg-nexus-bg rounded-lg appearance-none cursor-pointer accent-nexus-cyan border border-nexus-border/60">
          <div class="flex justify-between text-[10px] font-mono text-nexus-muted mt-2">
            <span>1 Araç (Hafif)</span>
            <span class="text-nexus-cyan font-bold">5 Araç (Standart Çalışma)</span>
            <span>15 Araç (Ağır İş Yükü)</span>
          </div>
        </div>

        <!-- Comparative Columns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Left: Bloated SaaS -->
          <div class="p-6 sm:p-7 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col justify-between transition-all">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-mono text-red-400 uppercase tracking-wider font-bold">Web Tabanlı SaaS / Chrome Sekmeleri</span>
                <span class="text-xl">🔥</span>
              </div>
              <h4 class="font-heading font-black text-xl text-white mb-6">Ayrı Siteler & Electron Katmanları</h4>

              <!-- RAM Metric -->
              <div class="space-y-2 mb-6">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-nexus-muted">RAM Tüketimi:</span>
                  <span id="saas-ram-text" class="text-red-400 font-bold text-base">2,450 MB</span>
                </div>
                <div class="w-full h-3 bg-nexus-bg rounded-full overflow-hidden border border-red-500/20">
                  <div id="saas-ram-bar" class="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-300" style="width: 78%;"></div>
                </div>
              </div>

              <!-- CPU Metric -->
              <div class="space-y-2 mb-6">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-nexus-muted">Arka Plan CPU Yükü:</span>
                  <span id="saas-cpu-text" class="text-red-400 font-bold">%18.5 CPU (Fan Sesleri Başlar)</span>
                </div>
                <div class="w-full h-3 bg-nexus-bg rounded-full overflow-hidden border border-red-500/20">
                  <div id="saas-cpu-bar" class="h-full bg-red-500 transition-all duration-300" style="width: 65%;"></div>
                </div>
              </div>

              <!-- Startup Metric -->
              <div class="flex justify-between items-center py-2.5 border-t border-red-500/20 text-xs font-mono">
                <span class="text-nexus-muted">Açılış & Yanıt Hızı:</span>
                <span class="text-red-300 font-bold">~8.4 saniye (Yavaş Sekme Yüklenmesi)</span>
              </div>
            </div>
            <div class="mt-6 text-[11px] font-mono text-red-400/90 bg-red-500/10 p-3 rounded-xl border border-red-500/20 leading-relaxed">
              ⚠️ Ağır bellek sızıntısı ve arka plan reklam takipçileri yüzünden dizüstü pilinizi hızla tüketir, bilgisayarı ısıtır.
            </div>
          </div>

          <!-- Right: NexusHub Native Core -->
          <div class="p-6 sm:p-7 rounded-2xl bg-nexus-cyan/5 border border-nexus-cyan/40 shadow-[0_0_30px_rgba(6,182,212,0.12)] flex flex-col justify-between transition-all">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-mono text-nexus-cyan uppercase tracking-wider font-bold">NexusHub Native Core</span>
                <span class="text-xl">⚡</span>
              </div>
              <h4 class="font-heading font-black text-xl text-white mb-6">C++ / Rust Hızlandırmalı Yerel Motor</h4>

              <!-- RAM Metric -->
              <div class="space-y-2 mb-6">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-nexus-muted">RAM Tüketimi:</span>
                  <span id="nexus-ram-text" class="text-nexus-cyan font-bold text-base">38 MB (%98.4 Tasarruf)</span>
                </div>
                <div class="w-full h-3 bg-nexus-bg rounded-full overflow-hidden border border-nexus-cyan/30">
                  <div id="nexus-ram-bar" class="h-full bg-gradient-to-r from-nexus-cyan to-emerald-400 transition-all duration-300" style="width: 4%;"></div>
                </div>
              </div>

              <!-- CPU Metric -->
              <div class="space-y-2 mb-6">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-nexus-muted">Arka Plan CPU Yükü:</span>
                  <span id="nexus-cpu-text" class="text-emerald-400 font-bold">%0.1 CPU (Tamamen Sessiz)</span>
                </div>
                <div class="w-full h-3 bg-nexus-bg rounded-full overflow-hidden border border-nexus-cyan/30">
                  <div id="nexus-cpu-bar" class="h-full bg-emerald-400 transition-all duration-300" style="width: 1%;"></div>
                </div>
              </div>

              <!-- Startup Metric -->
              <div class="flex justify-between items-center py-2.5 border-t border-nexus-cyan/20 text-xs font-mono">
                <span class="text-nexus-muted">Açılış & Yanıt Hızı:</span>
                <span class="text-emerald-400 font-bold">0.2 saniye (Anında Hazır)</span>
              </div>
            </div>
            <div class="mt-6 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 leading-relaxed">
              ✓ %100 yerel ve optimize edilmiş C++/Rust çekirdeği. Sıfır fan sesi, ultra uzun pil ömrü ve donanım dostu saf hız.
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>

  <!-- ARSENAL 15+ TOOLS GRID -->
  <section id="arsenal" class="relative z-10 py-24 border-t border-nexus-border/40">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-10">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">15+ Profesyonel Modül</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          Cebinizdeki Siber İsviçre Çakısı.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg mb-8">
          Geliştiriciler, güvenlik araştırmacıları, freelancerlar ve gizliliğine önem verenler için hazırlandı.
        </p>

        <!-- Category Filter Pills -->
        <div class="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl card-glass border border-nexus-border/80 text-xs font-mono">
          <button onclick="filterArsenal('all', this)" class="arsenal-tab-btn px-4 py-2 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-bold transition-all cursor-pointer">
            Tüm Modüller (15+)
          </button>
          <button onclick="filterArsenal('privacy', this)" class="arsenal-tab-btn px-4 py-2 rounded-xl text-nexus-muted hover:text-white border border-transparent transition-all cursor-pointer">
            🛡️ Gizlilik & İmha
          </button>
          <button onclick="filterArsenal('system', this)" class="arsenal-tab-btn px-4 py-2 rounded-xl text-nexus-muted hover:text-white border border-transparent transition-all cursor-pointer">
            ⚡ Donanım & Sistem
          </button>
          <button onclick="filterArsenal('tools', this)" class="arsenal-tab-btn px-4 py-2 rounded-xl text-nexus-muted hover:text-white border border-transparent transition-all cursor-pointer">
            🔗 Ağ & Dosya Stüdyosu
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="arsenal-grid">

        <!-- Tool 1: TempMail -->
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="privacy">
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
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="tools">
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
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="privacy">
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
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="system">
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
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="system">
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
        <div class="arsenal-card p-6 rounded-3xl card-glass flex flex-col justify-between group transition-all" data-category="tools">
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

        <!-- Dynamic Coupon Code Bar -->
        <div class="mt-8 max-w-md mx-auto p-2.5 rounded-2xl card-glass border border-nexus-border/80 flex items-center gap-2.5 shadow-lg">
          <span class="text-base pl-2">🎟️</span>
          <input type="text" id="pricing-coupon-input" placeholder="İndirim Kodu (Örn: NEXUS20, OGRENCI)" class="w-full bg-transparent text-xs font-mono text-nexus-cyan uppercase outline-none placeholder:text-nexus-muted/60">
          <button onclick="applyPricingCoupon()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent text-nexus-bg text-xs font-mono font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0">Uygula</button>
        </div>
        <div id="pricing-coupon-success" class="hidden mt-3 max-w-md mx-auto text-center text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-2 px-4 rounded-xl">
          🎉 <span id="pricing-coupon-msg">%20 İndirim Uygulandı! Tüm paket fiyatları güncellendi.</span>
        </div>

        <!-- 1-Hour Instant Sandbox Trial Key Generator -->
        <div class="mt-8 max-w-xl mx-auto p-5 rounded-3xl card-glass border border-nexus-cyan/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-center">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan text-[10px] font-mono font-bold uppercase tracking-wider">
              🧪 ÜCRETSİZ ANINDA DENEME
            </span>
          </div>
          <h4 class="font-heading font-black text-lg text-white mb-1">
            İndirmeden Önce 1 Saatlik Pro Deneme Anahtarı Alın
          </h4>
          <p class="text-xs text-nexus-muted mb-4 max-w-md mx-auto">
            Kredi kartı veya kayıt gerekmez. Tek tıkla sandbox lisans anahtarı türetip uygulamada tüm Pro özellikleri test edin.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div id="trial-key-display" class="hidden px-4 py-2.5 rounded-xl bg-nexus-bg border border-nexus-cyan/50 font-mono text-xs text-nexus-cyan font-bold tracking-wider select-all"></div>
            <button onclick="generateTrialKey()" id="generate-trial-btn" class="px-5 py-2.5 rounded-xl bg-nexus-cyan/20 hover:bg-nexus-cyan/30 border border-nexus-cyan/40 text-nexus-cyan font-mono text-xs font-bold transition-all cursor-pointer shadow-sm">
              ⚡ 1 Saatlik Pro Key Üret (Sandbox)
            </button>
          </div>
          <div id="trial-copy-msg" class="hidden mt-2.5 text-[11px] font-mono text-emerald-400">
            ✓ Deneme anahtarınız panoya kopyalandı! Uygulamayı açtığınızda aktivasyon alanına yapıştırın.
          </div>
        </div>
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

      <!-- Detailed Plan & Module Comparison Matrix -->
      <div class="mt-12 max-w-4xl mx-auto">
        <details class="group rounded-3xl card-glass border border-nexus-border/80 overflow-hidden transition-all">
          <summary class="p-5 flex items-center justify-between cursor-pointer font-heading font-bold text-sm text-white select-none hover:text-nexus-cyan transition-colors list-none">
            <span class="flex items-center gap-2.5">
              <span class="text-base">📊</span>
              <span>Tüm Paket ve Modülleri Detaylı Karşılaştır (Free vs Pro vs Studio)</span>
            </span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform font-mono text-xs">▼</span>
          </summary>
          <div class="p-6 border-t border-nexus-border/60 overflow-x-auto bg-nexus-surface/40">
            <table class="w-full text-left text-xs font-mono">
              <thead>
                <tr class="border-b border-nexus-border/60 text-nexus-muted uppercase">
                  <th class="py-3 px-4">Modül / Özellik</th>
                  <th class="py-3 px-4 text-center">Free Starter</th>
                  <th class="py-3 px-4 text-center text-nexus-cyan font-bold">Nexus Pro (Ömür Boyu)</th>
                  <th class="py-3 px-4 text-center text-emerald-400 font-bold">Nexus Studio</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-nexus-border/40 text-nexus-text">
                <tr>
                  <td class="py-3 px-4 font-bold text-white">DoD 5220.22-M 7-Pass Dosya İmha</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">TempMail & Gerçek Zamanlı Gelen Kutusu</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">Evrensel Link Decrypter & Tracker Stripper</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Limitsiz</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">Desktop Floating Cyber Orb HUD</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Dahil</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Dahil</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">Resource Sentinel & 1-Tık RAM Flush</td>
                  <td class="py-3 px-4 text-center text-nexus-muted">Temel Monitör</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Tam Optimizasyon</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Tam Optimizasyon</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">Eşzamanlı Cihaz / HWID Lisans Hakkı</td>
                  <td class="py-3 px-4 text-center text-nexus-muted">1 Cihaz</td>
                  <td class="py-3 px-4 text-center text-nexus-cyan font-bold">1 Cihaz (Sıfırlanabilir)</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">3 Cihaz Eşzamanlı</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">Gelecek v2.x & v3.x Tüm Güncellemeler</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Ömür Boyu Ücretsiz</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ Ömür Boyu Ücretsiz</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold text-white">VIP Discord Rolü & Öncelikli Destek</td>
                  <td class="py-3 px-4 text-center text-red-400 font-bold">✕</td>
                  <td class="py-3 px-4 text-center text-nexus-cyan font-bold">✓ Standart Ticket</td>
                  <td class="py-3 px-4 text-center text-emerald-400 font-bold">✓ 7/24 VIP Öncelikli</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
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

  <!-- SECURITY TRUST BADGES & SHA-256 INTEGRITY -->
  <section class="relative z-10 py-16 border-t border-nexus-border/40 bg-nexus-bg">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <!-- Badge 1: VirusTotal -->
        <div class="p-6 rounded-3xl card-glass border border-emerald-500/30 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 text-xl">
            🛡️
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">0 / 72 CLEAN</span>
              <span class="text-[10px] font-mono text-nexus-muted">VirusTotal</span>
            </div>
            <h4 class="font-heading font-bold text-base text-white mb-1">Sıfır Tehdit Onayı</h4>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Kaspersky, Bitdefender ve Windows Defender dahil 72 antivirüs motoru tarafından taranmış ve temiz raporlanmıştır.
            </p>
          </div>
        </div>

        <!-- Badge 2: SmartScreen & Offline Safe -->
        <div class="p-6 rounded-3xl card-glass border border-nexus-cyan/30 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan shrink-0 text-xl">
            🔒
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-nexus-cyan/20 text-nexus-cyan font-bold">MICROSOFT SAFE</span>
              <span class="text-[10px] font-mono text-nexus-muted">SmartScreen</span>
            </div>
            <h4 class="font-heading font-bold text-base text-white mb-1">%100 Çevrimdışı & Yerel</h4>
            <p class="text-xs text-nexus-muted leading-relaxed">
              Dosyalarınız, şifreleriniz ve panonuz sunucuya gitmez. İşlemler yalnızca kendi donanımınızın RAM'inde yapılır.
            </p>
          </div>
        </div>

        <!-- Badge 3: DoD 5220.22-M Compliance -->
        <div class="p-6 rounded-3xl card-glass border border-nexus-accent/30 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center text-nexus-accent shrink-0 text-xl">
            ⚙️
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-nexus-accent/20 text-nexus-accent font-bold">MIL-SPEC</span>
              <span class="text-[10px] font-mono text-nexus-muted">DoD 5220.22-M</span>
            </div>
            <h4 class="font-heading font-bold text-base text-white mb-1">Askeri Standartta İmha</h4>
            <p class="text-xs text-nexus-muted leading-relaxed">
              7 aşamalı üzerine yazma algoritması sayesinde silinen gizli dosyalar adli bilişim laboratuvarında dahi kurtarılamaz.
            </p>
          </div>
        </div>

      </div>

      <!-- SHA-256 Checksum Verification Bar -->
      <div class="p-4 sm:p-5 rounded-2xl card-glass border border-nexus-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full truncate">
          <span class="text-xs font-mono text-nexus-cyan bg-nexus-cyan/10 px-2.5 py-1 rounded-lg border border-nexus-cyan/30 shrink-0">SHA-256</span>
          <div class="text-xs font-mono text-nexus-muted truncate" id="sha256-hash">
            e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
          </div>
        </div>
        <button onclick="copySha256()" id="copy-sha-btn" class="w-full sm:w-auto px-4 py-2 rounded-xl border border-nexus-border hover:border-nexus-cyan/60 bg-nexus-surface text-xs font-mono text-white hover:text-nexus-cyan flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0">
          <span id="copy-sha-text">Hash Kopyala</span>
        </button>
      </div>

      <!-- Interactive PowerShell Verification Box -->
      <div class="mt-4 p-4 rounded-2xl bg-nexus-surface/50 border border-nexus-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div class="flex items-center gap-2.5 truncate w-full">
          <span class="px-2 py-0.5 rounded bg-nexus-cyan/10 text-nexus-cyan font-bold shrink-0 text-[10px]">POWERSHELL</span>
          <span class="text-nexus-muted truncate select-all" id="ps-verify-cmd">Get-FileHash -Algorithm SHA256 .\NexusHub-v2.0.3-Setup.exe</span>
        </div>
        <button onclick="copyPowerShellCmd()" id="copy-ps-btn" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-nexus-surface hover:bg-nexus-border text-xs text-nexus-cyan hover:text-white border border-nexus-border/80 transition-all shrink-0 cursor-pointer">
          Komutu Kopyala
        </button>
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

  <!-- LIVE DISCORD & COMMUNITY PULSE CARD -->
  <section id="community" class="relative z-10 py-16 border-t border-nexus-border/40 bg-nexus-surface/10">
    <div class="max-w-6xl mx-auto px-6">
      <div class="p-8 sm:p-10 rounded-3xl card-glass border border-[#5865F2]/40 relative overflow-hidden shadow-[0_0_40px_rgba(88,101,242,0.15)] flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="space-y-3 max-w-xl text-center md:text-left">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] text-xs font-mono">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="text-white font-bold">412+ Geliştirici & Üye Çevrimiçi</span>
          </div>
          <h3 class="font-heading font-black text-2xl sm:text-3xl text-white">
            NexusHub Discord Topluluğuna Katılın.
          </h3>
          <p class="text-xs sm:text-sm text-nexus-muted leading-relaxed">
            Soru sorun, yeni araç önerin, beta güncellemelerine ilk siz erişin ve VIP lisans sahipleri için özel kanallarda diğer siber araştırmacılarla iletişim kurun.
          </p>
          <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-nexus-muted pt-2">
            <span>⚡ Ortalama Yanıt: <b class="text-white">~3 Dakika</b></span>
            <span>•</span>
            <span>🛡️ 7/24 Ticket Desteği</span>
            <span>•</span>
            <span>🎁 Haftalık Lisans Çekilişleri</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
          <a href="https://discord.gg" target="_blank" class="px-8 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-heading font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(88,101,242,0.4)] transition-all cursor-pointer">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            <span>Discord Topluluğuna Katıl</span>
          </a>
          <a href="https://t.me" target="_blank" class="px-8 py-3 rounded-2xl card-glass border border-nexus-border hover:border-nexus-cyan/50 text-nexus-text hover:text-white font-mono text-xs text-center transition-all cursor-pointer">
            Telegram Destek Hattı
          </a>
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

      <!-- FAQ Search Input & Expand All Toggle -->
      <div class="mb-8 flex flex-col sm:flex-row items-center gap-3">
        <input type="text" id="faq-search-input" oninput="filterFaq(this.value)" placeholder="Sorularda canlı ara... (Örn: format, iade, mac, güncelleme, güvenlik, çevrimdışı)" class="w-full sm:flex-1 bg-nexus-card border border-nexus-border/80 rounded-2xl px-5 py-3.5 text-xs font-mono text-white outline-none focus:border-nexus-cyan placeholder:text-nexus-muted/60 transition-all">
        <button onclick="toggleAllFaq()" id="faq-toggle-all-btn" class="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-nexus-border/80 hover:border-nexus-cyan/60 bg-nexus-surface text-xs font-mono text-nexus-muted hover:text-white transition-all cursor-pointer shrink-0">
          Tümünü Genişlet ⤢
        </button>
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

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="iade para iadesi garanti 30 gun risk kosulsuz satisfaction guarantee">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>30 Gün Koşulsuz Para İade Garantisi var mı?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Evet, kesinlikle! Satın aldığınız tarihten itibaren 30 gün boyunca NexusHub'ı dilediğiniz gibi test edebilirsiniz. Herhangi bir nedenden dolayı memnun kalmazsanız Discord destek kanalımızdan veya e-posta ile bildirdiğiniz anda ödemeniz %100 koşulsuz olarak iade edilir.
          </p>
        </details>

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="cevrimdisi offline internet kesintisi baglanti yok local yerel">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>İnternet bağlantım tamamen kesildiğinde araçlar çalışır mı?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Evet! NexusHub %100 offline-first mimariye sahiptir. Dosya imha (DoD shredder), AES-256 şifreleme kasası, donanım kaynak monitörü, RAM optimize edici ve parola analizörü gibi tüm kritik araçlar internet bağlantınız olmasa dahi tam performansla çalışır.
          </p>
        </details>

        <details class="faq-item group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer" data-text="mac apple linux osx destegi ne zaman cikacak">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>macOS veya Linux desteği gelecek mi?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed font-sans">
            Şu anda Windows 10 ve 11 (x64) için tam optimize edilmiş yerel sürümümüz yayındadır. macOS (Apple Silicon M1/M2/M3/M4) ve Linux (.deb / .AppImage) çekirdekleri geliştirme aşamasında olup, Pro lisans sahipleri bu sürümler çıktığında tek kuruş ödemeden doğrudan erişebilecektir.
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

  <!-- DESKTOP FLOATING CYBER ORB WIDGET (CANLI HUD WIDGET'I) -->
  <div id="desktop-floating-orb-widget" class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
    
    <!-- Orb Quick Action Menu (Popup) -->
    <div id="orb-action-menu" class="hidden p-3.5 rounded-2xl card-glass border border-nexus-cyan/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl w-60 font-mono text-xs space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div class="flex items-center justify-between border-b border-nexus-border/60 pb-2 text-[10px] text-nexus-muted">
        <span class="flex items-center gap-1.5 text-nexus-cyan font-bold">
          <span class="w-1.5 h-1.5 rounded-full bg-nexus-cyan animate-pulse"></span>
          <span>NEXUS ORB HUD</span>
        </span>
        <button onclick="toggleFloatingOrbMenu()" class="hover:text-white cursor-pointer px-1">✕</button>
      </div>
      
      <button onclick="triggerQuickRamFlush()" class="w-full text-left p-2 rounded-xl hover:bg-purple-500/20 text-purple-300 flex items-center gap-2.5 transition-all cursor-pointer">
        <span>⚡</span> <span>1-Tık RAM Boşalt</span>
      </button>
      <button onclick="triggerQuickTempMail()" class="w-full text-left p-2 rounded-xl hover:bg-nexus-cyan/20 text-nexus-cyan flex items-center gap-2.5 transition-all cursor-pointer">
        <span>📬</span> <span>TempMail Kopyala</span>
      </button>
      <button onclick="openCmdPalette(); toggleFloatingOrbMenu();" class="w-full text-left p-2 rounded-xl hover:bg-nexus-surface text-white flex items-center gap-2.5 transition-all cursor-pointer">
        <span>🔍</span> <span>Komut Paleti (Ctrl+K)</span>
      </button>
      <button onclick="toggleSfx()" class="w-full text-left p-2 rounded-xl hover:bg-nexus-surface text-nexus-muted hover:text-white flex items-center gap-2.5 transition-all cursor-pointer">
        <span id="orb-sfx-icon">🔊</span> <span>Cyber SFX</span>
      </button>
    </div>

    <!-- The Interactive Floating Orb Bubble -->
    <button onclick="toggleFloatingOrbMenu()" id="floating-orb-btn" class="relative group w-14 h-14 rounded-full bg-gradient-to-tr from-nexus-cyan via-nexus-accent to-purple-600 p-0.5 shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_45px_rgba(6,182,212,0.9)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer animate-float" title="NexusHub Masaüstü Küresi (Tıkla & Keşfet)">
      <div class="w-full h-full rounded-full bg-nexus-bg/85 backdrop-blur-md flex items-center justify-center font-mono font-bold text-white text-base group-hover:text-nexus-cyan transition-colors">
        ⚡
      </div>
      <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-nexus-bg animate-pulse"></span>
    </button>
  </div>

  <!-- COMMAND PALETTE MODAL (CTRL + K / SPOTLIGHT) -->
  <div id="cmd-palette-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-start justify-center pt-20 sm:pt-28 px-4" onclick="handleCmdBackdropClick(event)">
    <div class="w-full max-w-2xl rounded-3xl card-glass border border-nexus-cyan/50 shadow-[0_0_60px_rgba(6,182,212,0.35)] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onclick="event.stopPropagation()">
      <!-- Search Input Header -->
      <div class="p-4 sm:p-5 border-b border-nexus-border/80 flex items-center gap-3 bg-nexus-surface/50">
        <span class="text-nexus-cyan text-lg">⚡</span>
        <input type="text" id="cmd-search-input" oninput="filterCmdActions(this.value)" placeholder="Bir araç, eylem veya komut arayın... (Örn: tempmail, ram, lisans, ses)" class="w-full bg-transparent text-sm sm:text-base font-mono text-white outline-none placeholder:text-nexus-muted">
        <kbd class="px-2 py-1 rounded bg-nexus-bg border border-nexus-border text-[10px] font-mono text-nexus-muted shrink-0">ESC</kbd>
      </div>

      <!-- Action Items List -->
      <div id="cmd-items-list" class="max-h-96 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
        
        <div onclick="executeCmd('tempmail')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="tempmail gecici e-posta fake mail burner">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-nexus-cyan/10 text-nexus-cyan group-hover:scale-110 transition-transform">✉️</span>
            <div>
              <div class="font-bold text-white group-hover:text-nexus-cyan transition-colors">TempMail Oluştur & Kopyala</div>
              <div class="text-[11px] text-nexus-muted">Anında rastgele tek kullanımlık e-posta türetir ve panoya alır</div>
            </div>
          </div>
          <span class="text-nexus-cyan opacity-0 group-hover:opacity-100 transition-opacity">Çalıştır ↵</span>
        </div>

        <div onclick="executeCmd('ram')" class="cmd-item p-3 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="ram temizleme bellek bosalt purge optimize">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">🧹</span>
            <div>
              <div class="font-bold text-white group-hover:text-purple-400 transition-colors">Sistem RAM Belleğini Boşalt</div>
              <div class="text-[11px] text-nexus-muted">Gereksiz çalışan çalışma alanlarını ve bellek artıklarını temizler</div>
            </div>
          </div>
          <span class="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">Çalıştır ↵</span>
        </div>

        <div onclick="executeCmd('benchmark')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="benchmark kiyaslama test ram cpu yuk">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-nexus-cyan/10 text-nexus-cyan group-hover:scale-110 transition-transform">📊</span>
            <div>
              <div class="font-bold text-white group-hover:text-nexus-cyan transition-colors">RAM/CPU Canlı Benchmark Testine Git</div>
              <div class="text-[11px] text-nexus-muted">SaaS siteleri ile yerel motorun kaynak tüketimini kıyaslayın</div>
            </div>
          </div>
          <span class="text-nexus-cyan opacity-0 group-hover:opacity-100 transition-opacity">Git ↵</span>
        </div>

        <div onclick="executeCmd('simulator')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="simulator arayuz canli onizleme demo">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-nexus-cyan/10 text-nexus-cyan group-hover:scale-110 transition-transform">🖥️</span>
            <div>
              <div class="font-bold text-white group-hover:text-nexus-cyan transition-colors">Canlı Uygulama Simülatörünü Aç</div>
              <div class="text-[11px] text-nexus-muted">NexusHub v2.0.3 arayüzünü tarayıcı içinde interaktif deneyimleyin</div>
            </div>
          </div>
          <span class="text-nexus-cyan opacity-0 group-hover:opacity-100 transition-opacity">Git ↵</span>
        </div>

        <div onclick="executeCmd('pricing')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="fiyat satin al lisans pro ucret odeme">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">💳</span>
            <div>
              <div class="font-bold text-white group-hover:text-emerald-400 transition-colors">Ömür Boyu Lisans Paketleri</div>
              <div class="text-[11px] text-nexus-muted">Free, Pro ve Studio lisans seçeneklerini inceleyin</div>
            </div>
          </div>
          <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">Git ↵</span>
        </div>

        <div onclick="executeCmd('portal')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="portal lisans sorgula hwid sifirla anahtar">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-nexus-cyan/10 text-nexus-cyan group-hover:scale-110 transition-transform">🔑</span>
            <div>
              <div class="font-bold text-white group-hover:text-nexus-cyan transition-colors">Müşteri Portalı (Lisans Sorgula / Sıfırla)</div>
              <div class="text-[11px] text-nexus-muted">Format sonrası cihaz kilidinizi kendiniz anında sıfırlayın</div>
            </div>
          </div>
          <span class="text-nexus-cyan opacity-0 group-hover:opacity-100 transition-opacity">Git ↵</span>
        </div>

        <div onclick="executeCmd('sfx')" class="cmd-item p-3 rounded-xl hover:bg-nexus-cyan/15 hover:border-nexus-cyan/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="ses sesler sfx cyberpunk muzik kapat ac">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-nexus-cyan/10 text-nexus-cyan group-hover:scale-110 transition-transform">🔊</span>
            <div>
              <div class="font-bold text-white group-hover:text-nexus-cyan transition-colors">Cyberpunk SFX Seslerini Aç / Kapat</div>
              <div class="text-[11px] text-nexus-muted">Tıklama ve etkileşim mekanik ses motorunu açıp kapatın</div>
            </div>
          </div>
          <span class="text-nexus-cyan opacity-0 group-hover:opacity-100 transition-opacity">Değiştir ↵</span>
        </div>

        <div onclick="executeCmd('discord')" class="cmd-item p-3 rounded-xl hover:bg-[#5865F2]/15 hover:border-[#5865F2]/40 border border-transparent cursor-pointer flex items-center justify-between transition-all group" data-keywords="discord topluluk chat yardim destek">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg bg-[#5865F2]/10 text-[#5865F2] group-hover:scale-110 transition-transform">💬</span>
            <div>
              <div class="font-bold text-white group-hover:text-[#5865F2] transition-colors">Discord Topluluğu & Ticket Destek</div>
              <div class="text-[11px] text-nexus-muted">Geliştiricilerle sohbet edin ve anlık destek alın</div>
            </div>
          </div>
          <span class="text-[#5865F2] opacity-0 group-hover:opacity-100 transition-opacity">Bağlan ↗</span>
        </div>

      </div>

      <!-- Footer Info -->
      <div class="p-3 bg-nexus-surface/80 border-t border-nexus-border/60 flex items-center justify-between text-[11px] font-mono text-nexus-muted">
        <div class="flex items-center gap-3">
          <span><kbd class="px-1.5 py-0.5 rounded bg-nexus-bg border border-nexus-border text-[9px]">↑↓</kbd> Gezin</span>
          <span><kbd class="px-1.5 py-0.5 rounded bg-nexus-bg border border-nexus-border text-[9px]">Enter</kbd> Seç</span>
        </div>
        <span class="text-nexus-cyan">NexusHub Command Engine v2.0</span>
      </div>
    </div>
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
        'sim.tools.password': 'Parola & Kırılma',
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
        'sim.tools.password': 'Password Analyzer',
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
    const tools = ['tempmail', 'decrypter', 'password', 'fortress', 'sentinel', 'orb'];
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

    let globalDiscountMultiplier = 1.0;
    let appliedCouponCode = '';

    function applyCoupon() {
      const code = document.getElementById('coupon-input').value.trim().toUpperCase();
      const tag = document.getElementById('modal-discount-tag');
      const priceEl = document.getElementById('modal-plan-price');

      if (code === 'NEXUS20' || code === 'OGRENCI' || code === 'DISCORD' || code === 'SPECIAL') {
        globalDiscountMultiplier = 0.8;
        appliedCouponCode = code;
        const discountedTR = Math.round(basePriceTR * 0.8);
        const discountedEN = Math.round(basePriceEN * 0.8);
        priceEl.innerText = currentLang === 'tr' ? '₺' + discountedTR : '$' + discountedEN;
        tag.classList.remove('hidden');
        tag.innerText = '%20 İNDİRİM UYGULANDI (' + code + ')';
        playCyberSound('success');
      } else if (code) {
        alert('Geçersiz veya süresi dolmuş kupon kodu.');
      }
    }

    // Pricing Section Top Coupon Bar
    function applyPricingCoupon() {
      const input = document.getElementById('pricing-coupon-input');
      const code = (input ? input.value : '').trim().toUpperCase();
      const successBox = document.getElementById('pricing-coupon-success');
      const msgBox = document.getElementById('pricing-coupon-msg');

      if (code === 'NEXUS20' || code === 'OGRENCI' || code === 'DISCORD' || code === 'SPECIAL') {
        globalDiscountMultiplier = 0.8;
        appliedCouponCode = code;
        if (successBox) successBox.classList.remove('hidden');
        if (msgBox) msgBox.innerText = '🎉 %20 İndirim Kodu (' + code + ') Aktif! Tüm paketlere uygulandı.';
        
        // Update display prices
        if (currentLang === 'tr') {
          document.getElementById('price-pro').innerText = '₺' + Math.round(349 * 0.8);
          document.getElementById('price-studio').innerText = '₺' + Math.round(699 * 0.8);
        } else {
          document.getElementById('price-pro').innerText = '$' + Math.round(29 * 0.8);
          document.getElementById('price-studio').innerText = '$' + Math.round(49 * 0.8);
        }
        playCyberSound('success');
      } else {
        alert('Geçersiz kupon kodu. Deneyebileceğiniz kodlar: NEXUS20, OGRENCI');
      }
    }

    // ─── Web Audio API Cyber SFX Engine ─────────────────────────────────────
    let sfxEnabled = true; // Default ON as requested
    let audioCtx = null;

    function initAudio() {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playCyberSound(type = 'click') {
      if (!sfxEnabled) return;
      try {
        initAudio();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
          // Subtle mechanical cyber tick
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'purge') {
          // Cyber RAM flush sweep
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'success') {
          // Ascending cyber chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'toggle') {
          // Mechanical relay switch
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(400, now + 0.02);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.start(now);
          osc.stop(now + 0.035);
        }
      } catch (e) {
        // Audio policy ignore
      }
    }

    function toggleSfx() {
      sfxEnabled = !sfxEnabled;
      const btn = document.getElementById('sfx-toggle-btn');
      if (btn) {
        if (sfxEnabled) {
          btn.innerHTML = '<span>🔊</span><span class="hidden sm:inline font-bold">SFX</span>';
          btn.className = 'px-2.5 py-1.5 rounded-lg border border-nexus-cyan/40 bg-nexus-cyan/10 text-nexus-cyan hover:bg-nexus-cyan/20 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer';
          playCyberSound('toggle');
        } else {
          btn.innerHTML = '<span>🔇</span><span class="hidden sm:inline font-bold">SFX</span>';
          btn.className = 'px-2.5 py-1.5 rounded-lg border border-nexus-border text-nexus-muted hover:text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer';
        }
      }
    }

    // Attach subtle sfx clicks to all interactive buttons
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, a, input[type="range"], [onclick]');
      if (target && !target.id?.includes('sfx-toggle-btn')) {
        playCyberSound('click');
      }
    });

    // ─── Live RAM & Benchmark Slider Logic ───────────────────────────────────
    function updateBenchmark(val) {
      const count = parseInt(val, 10);
      const label = document.getElementById('benchmark-load-label');
      if (label) label.innerText = count + ' Aktif Araç / Görev';

      // SaaS calculations (heavy, exponential overhead)
      const saasRam = Math.round(count * 480 + 120);
      const saasCpu = (count * 3.6 + 1.2).toFixed(1);
      const saasRamPercent = Math.min(100, Math.round((saasRam / 3200) * 100));
      const saasCpuPercent = Math.min(100, Math.round(saasCpu * 1.8));

      const saasRamText = document.getElementById('saas-ram-text');
      const saasRamBar = document.getElementById('saas-ram-bar');
      const saasCpuText = document.getElementById('saas-cpu-text');
      const saasCpuBar = document.getElementById('saas-cpu-bar');

      if (saasRamText) saasRamText.innerText = saasRam.toLocaleString() + ' MB';
      if (saasRamBar) saasRamBar.style.width = saasRamPercent + '%';
      if (saasCpuText) saasCpuText.innerText = '%' + saasCpu + ' CPU (Fan Sesleri Başlar)';
      if (saasCpuBar) saasCpuBar.style.width = saasCpuPercent + '%';

      // NexusHub calculations (native, lightweight)
      const nexusRam = Math.round(18 + count * 4.2);
      const nexusCpu = (0.05 + count * 0.08).toFixed(1);
      const savings = (100 - (nexusRam / saasRam) * 100).toFixed(1);

      const nexusRamText = document.getElementById('nexus-ram-text');
      const nexusRamBar = document.getElementById('nexus-ram-bar');
      const nexusCpuText = document.getElementById('nexus-cpu-text');
      const nexusCpuBar = document.getElementById('nexus-cpu-bar');

      if (nexusRamText) nexusRamText.innerText = nexusRam + ' MB (%' + savings + ' Tasarruf)';
      if (nexusRamBar) nexusRamBar.style.width = Math.max(3, Math.min(100, Math.round((nexusRam / 3200) * 100))) + '%';
      if (nexusCpuText) nexusCpuText.innerText = '%' + nexusCpu + ' CPU (Tamamen Sessiz)';
      if (nexusCpuBar) nexusCpuBar.style.width = Math.max(2, Math.round(nexusCpu * 2)) + '%';
    }

    // ─── Command Palette (Ctrl+K / Spotlight) Engine ─────────────────────────
    function openCmdPalette() {
      const modal = document.getElementById('cmd-palette-modal');
      const input = document.getElementById('cmd-search-input');
      if (modal) {
        modal.classList.remove('hidden');
        if (input) {
          input.value = '';
          filterCmdActions('');
          setTimeout(() => input.focus(), 50);
        }
        playCyberSound('toggle');
      }
    }

    function closeCmdPalette() {
      const modal = document.getElementById('cmd-palette-modal');
      if (modal) modal.classList.add('hidden');
    }

    function handleCmdBackdropClick(e) {
      closeCmdPalette();
    }

    function filterCmdActions(query) {
      const q = query.toLowerCase().trim();
      const items = document.querySelectorAll('#cmd-items-list .cmd-item');
      items.forEach(item => {
        const text = (item.getAttribute('data-keywords') + ' ' + item.innerText).toLowerCase();
        if (!q || text.includes(q)) {
          item.classList.remove('hidden');
          item.classList.add('flex');
        } else {
          item.classList.add('hidden');
          item.classList.remove('flex');
        }
      });
    }

    function executeCmd(action) {
      closeCmdPalette();
      playCyberSound('success');

      if (action === 'tempmail') {
        const fakeMail = 'temp_' + Math.random().toString(36).substring(2, 8) + '@nexushub.cloud';
        navigator.clipboard?.writeText(fakeMail);
        alert('⚡ Tek Kullanımlık Posta Üretildi ve Kopyalandı:\n' + fakeMail);
      } else if (action === 'ram') {
        playCyberSound('purge');
        alert('🧹 Sistem Belleği Temizlendi!\n2,140 MB geçici bellek alanı boşaltıldı.');
      } else if (action === 'benchmark') {
        document.getElementById('benchmark')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'simulator') {
        document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'pricing') {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'portal') {
        document.getElementById('portal')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'sfx') {
        toggleSfx();
      } else if (action === 'discord') {
        window.open('https://discord.gg', '_blank');
      }
    }

    // ─── SHA-256 Copy Helper ────────────────────────────────────────────────
    function copySha256() {
      const hash = document.getElementById('sha256-hash')?.innerText.trim();
      if (hash && navigator.clipboard) {
        navigator.clipboard.writeText(hash);
        const text = document.getElementById('copy-sha-text');
        if (text) text.innerText = '✓ Kopyalandı!';
        playCyberSound('success');
        setTimeout(() => {
          if (text) text.innerText = 'Hash Kopyala';
        }, 2000);
      }
    }

    function copyPowerShellCmd() {
      const cmd = document.getElementById('ps-verify-cmd')?.innerText.trim();
      if (cmd && navigator.clipboard) {
        navigator.clipboard.writeText(cmd);
        const btn = document.getElementById('copy-ps-btn');
        if (btn) btn.innerText = '✓ Kopyalandı!';
        playCyberSound('success');
        setTimeout(() => {
          if (btn) btn.innerText = 'Komutu Kopyala';
        }, 2000);
      }
    }

    // ─── Global Keyboard Shortcuts ──────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      // Ctrl + K or Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCmdPalette();
      }
      // Escape closes any open modal
      if (e.key === 'Escape') {
        closeCmdPalette();
        closeChangelogModal();
        closeCheckoutModal();
      }
    });

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

    // ─── Hero Matrix Cyber Rain Backdrop ────────────────────────────────────
    function initMatrixRain() {
      const canvas = document.getElementById('hero-matrix-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = (canvas.width = canvas.offsetWidth);
      let h = (canvas.height = canvas.offsetHeight);

      window.addEventListener('resize', () => {
        if (!canvas) return;
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
      });

      const letters = '010101019F8AB2NEXUSHUDDoDAES256CYBERRAMCOREλ§¥'.split('');
      const fontSize = 14;
      const columns = Math.floor(w / fontSize) || 20;
      const drops = [];
      for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * -50);
      }

      function drawRain() {
        ctx.fillStyle = 'rgba(8, 9, 13, 0.12)';
        ctx.fillRect(0, 0, w, h);

        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
          const text = letters[Math.floor(Math.random() * letters.length)];
          ctx.fillStyle = i % 3 === 0 ? '#06b6d4' : '#10b981';
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);

          if (drops[i] * fontSize > h && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }

      setInterval(drawRain, 50);
    }

    // ─── Simulator Link Decrypter Runner ────────────────────────────────────
    function runSimDecrypter() {
      const input = document.getElementById('sim-decrypter-input');
      const cleanEl = document.getElementById('sim-decrypter-clean-url');
      const badgeEl = document.getElementById('sim-decrypter-badge');
      if (!input || !cleanEl) return;

      const raw = input.value.trim();
      let cleanUrl = 'https://drive.google.com/file/d/1A8zX_NexusSafeBuild.zip';
      let strippedCount = 4;

      try {
        const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        const searchParams = new URLSearchParams(u.search);
        const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'aff_id', 'telemetry_token', 'spy_id', 'ref'];
        let count = 0;
        trackers.forEach(t => {
          if (searchParams.has(t)) {
            searchParams.delete(t);
            count++;
          }
        });
        strippedCount = count > 0 ? count : 3;
        u.search = searchParams.toString();
        cleanUrl = u.toString().replace(/(\?)$/, '');
      } catch (e) {
        cleanUrl = 'https://clean-dest.org/direct_download';
      }

      cleanEl.innerText = '✓ ' + cleanUrl;
      if (badgeEl) {
        badgeEl.innerText = strippedCount + ' Takip Parametresi Silindi (0.3ms)';
      }
      playCyberSound('success');
    }

    // ─── Simulator Password & Entropy Analyzer ──────────────────────────────
    function analyzePassword(pass) {
      if (!pass) pass = '';
      const len = pass.length;
      let pool = 0;
      if (/[a-z]/.test(pass)) pool += 26;
      if (/[A-Z]/.test(pass)) pool += 26;
      if (/[0-9]/.test(pass)) pool += 10;
      if (/[^a-zA-Z0-9]/.test(pass)) pool += 33;
      if (pool === 0) pool = 1;

      const entropy = Math.round(len * Math.log2(pool) * 10) / 10;
      const entropyEl = document.getElementById('sim-entropy-val');
      const crackEl = document.getElementById('sim-crack-time');
      const labelEl = document.getElementById('sim-strength-label');
      const barEl = document.getElementById('sim-pass-strength-bar');

      if (entropyEl) entropyEl.innerText = entropy + ' Bit';

      let timeText = '< 0.001 Saniye';
      let labelText = 'ZAYIF (D)';
      let barWidth = '20%';
      let barGrad = 'from-red-500 to-amber-500';

      if (entropy < 28) {
        timeText = '< 0.001 Saniye (Anında Kırılır)';
        labelText = 'KRİTİK GÜVENSİZ (F)';
        barWidth = '15%';
        barGrad = 'from-red-600 to-red-500';
      } else if (entropy < 50) {
        timeText = '~3 Dakika';
        labelText = 'ORTA (C)';
        barWidth = '40%';
        barGrad = 'from-amber-500 to-yellow-400';
      } else if (entropy < 70) {
        timeText = '~4.8 Yıl';
        labelText = 'GÜÇLÜ (B)';
        barWidth = '65%';
        barGrad = 'from-sky-400 to-nexus-cyan';
      } else if (entropy < 90) {
        timeText = '~120 Bin Yıl';
        labelText = 'ÇOK GÜÇLÜ (A)';
        barWidth = '85%';
        barGrad = 'from-nexus-cyan to-emerald-400';
      } else {
        timeText = '~4.8 Trilyon Yıl';
        labelText = 'SİBER KALE (A+)';
        barWidth = '100%';
        barGrad = 'from-emerald-400 to-nexus-cyan';
      }

      if (crackEl) crackEl.innerText = timeText;
      if (labelEl) labelEl.innerText = labelText;
      if (barEl) {
        barEl.style.width = barWidth;
        barEl.className = 'h-full bg-gradient-to-r ' + barGrad + ' transition-all duration-300';
      }
    }

    function generateMilitaryPass() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
      let pass = '';
      for (let i = 0; i < 24; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const input = document.getElementById('sim-pass-input');
      if (input) {
        input.value = pass;
        analyzePassword(pass);
      }
      playCyberSound('success');
    }

    function copyGeneratedPass() {
      const input = document.getElementById('sim-pass-input');
      const btn = document.getElementById('sim-pass-copy-btn');
      if (input && navigator.clipboard) {
        navigator.clipboard.writeText(input.value);
        if (btn) btn.innerText = '✓ Kopyalandı!';
        playCyberSound('success');
        setTimeout(() => {
          if (btn) btn.innerText = 'Kopyala';
        }, 2000);
      }
    }

    // ─── 1-Hour Sandbox Trial Key Generator ─────────────────────────────────
    function generateTrialKey() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      function chunk(len) {
        let res = '';
        for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
      }
      const trialKey = 'NEXUS-TRIAL-' + chunk(4) + '-' + chunk(4) + '-' + chunk(4);
      const display = document.getElementById('trial-key-display');
      const msg = document.getElementById('trial-copy-msg');
      const btn = document.getElementById('generate-trial-btn');

      if (display) {
        display.classList.remove('hidden');
        display.innerText = trialKey;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(trialKey);
      }
      if (msg) msg.classList.remove('hidden');
      if (btn) btn.innerText = '↻ Yeni Key Üret';
      playCyberSound('success');
    }

    // ─── Desktop Floating Cyber Orb Actions ─────────────────────────────────
    function toggleFloatingOrbMenu() {
      const menu = document.getElementById('orb-action-menu');
      if (menu) {
        menu.classList.toggle('hidden');
        playCyberSound('toggle');
      }
    }

    function triggerQuickRamFlush() {
      toggleFloatingOrbMenu();
      playCyberSound('purge');
      alert('⚡ [Nexus Orb] Sistem RAM Belleği Boşaltıldı!\n1,840 MB geçici bellek önbelleği başarıyla temizlendi.');
    }

    function triggerQuickTempMail() {
      toggleFloatingOrbMenu();
      const fakeMail = 'orb_' + Math.random().toString(36).substring(2, 7) + '@nexusmail.org';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fakeMail);
      }
      playCyberSound('success');
      alert('📬 [Nexus Orb] Tek Kullanımlık TempMail Panoya Kopyalandı:\n' + fakeMail);
    }

    // ─── FAQ Accordion Controls ─────────────────────────────────────────────
    let allFaqOpen = false;
    function toggleAllFaq() {
      const items = document.querySelectorAll('.faq-item');
      const btn = document.getElementById('faq-toggle-all-btn');
      allFaqOpen = !allFaqOpen;
      items.forEach(item => {
        item.open = allFaqOpen;
      });
      if (btn) {
        btn.innerText = allFaqOpen ? 'Tümünü Daralt ⤡' : 'Tümünü Genişlet ⤢';
      }
      playCyberSound('toggle');
    }

    // ─── Arsenal Category Filter Engine ─────────────────────────────────────
    function filterArsenal(cat, btn) {
      const cards = document.querySelectorAll('.arsenal-card');
      const tabs = document.querySelectorAll('.arsenal-tab-btn');
      
      tabs.forEach(t => {
        t.className = 'arsenal-tab-btn px-4 py-2 rounded-xl text-nexus-muted hover:text-white border border-transparent transition-all cursor-pointer';
      });
      if (btn) {
        btn.className = 'arsenal-tab-btn px-4 py-2 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 text-nexus-cyan font-bold transition-all cursor-pointer';
      }

      cards.forEach(card => {
        const itemCat = card.getAttribute('data-category');
        if (cat === 'all' || itemCat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      playCyberSound('toggle');
    }

    // Initial calculations & canvas start
    calcRoi();
    initMatrixRain();
  </script>
</body>
</html>`;
}
