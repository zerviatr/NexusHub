/**
 * server/src/landingPageHtml.ts
 *
 * NexusHub Official High-Conversion "Harpoon" Landing Page.
 * Dark cyberpunk-fintech aesthetics, live interactive hero widgets,
 * SaaS killer comparison matrix, live pricing tiers, and direct purchase triggers.
 */

export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="tr" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusHub — Abonelik Tuzağına Son. 15+ Siber Güç Tek Yazılımda.</title>
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

      <div class="hidden md:flex items-center gap-8 text-sm font-medium text-nexus-muted">
        <a href="#features" class="hover:text-nexus-cyan transition-colors">Özellikler</a>
        <a href="#comparison" class="hover:text-nexus-cyan transition-colors">SaaS Katili</a>
        <a href="#arsenal" class="hover:text-nexus-cyan transition-colors">15+ Cephane</a>
        <a href="#pricing" class="hover:text-nexus-cyan transition-colors">Fiyatlandırma</a>
        <a href="#faq" class="hover:text-nexus-cyan transition-colors">SSS</a>
      </div>

      <div class="flex items-center gap-3">
        <a href="/admin" class="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg border border-nexus-border hover:border-nexus-cyan/50 text-xs font-mono text-nexus-muted hover:text-white transition-all">
          Yönetici Paneli
        </a>
        <a href="#pricing" class="px-4 py-2 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-bold font-heading text-sm shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all">
          Lisans Al
        </a>
      </div>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <section class="relative z-10 pt-16 pb-24 overflow-hidden">
    <div class="max-w-7xl mx-auto px-6">
      
      <!-- Top Live Banner -->
      <div class="flex justify-center mb-8">
        <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full card-glass border border-nexus-cyan/30 text-xs font-mono text-nexus-cyan shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-ping"></span>
          <span>v2.0.3 Yayında</span>
          <span class="text-nexus-border">|</span>
          <span class="text-white">15+ Siber Güç</span>
          <span class="text-nexus-border">|</span>
          <span class="text-emerald-400">Sıfır Abonelik Tuzağı</span>
        </div>
      </div>

      <!-- Main Headline -->
      <div class="text-center max-w-4xl mx-auto mb-10">
        <h1 class="font-heading font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-white leading-[1.08] mb-6">
          Aylık Aboneliklere <span class="bg-gradient-to-r from-nexus-cyan via-nexus-accent to-purple-400 bg-clip-text text-transparent">Son.</span><br>
          Tek Yazılım, <span class="underline decoration-nexus-cyan/40 underline-offset-8">15+ Siber Güç.</span>
        </h1>
        <p class="text-base sm:text-lg md:text-xl text-nexus-muted leading-relaxed max-w-2xl mx-auto font-sans">
          Tek kullanımlık geçici posta, reklam & link çözücü, DoD askeri veri imha kalkanı, donanım monitörü ve şifreli kasa. Her şeye ayrı ayrı para ödemeyi bırakın.
        </p>
      </div>

      <!-- Hero Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-nexus-cyan via-sky-400 to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-heading font-black text-base flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Windows için İndir (v2.0.3)</span>
        </a>
        <a href="#pricing" class="w-full sm:w-auto px-8 py-4 rounded-2xl card-glass border border-nexus-border/80 hover:border-nexus-cyan/50 active:scale-95 text-white font-heading font-bold text-base flex items-center justify-center gap-2 transition-all">
          <span>Ömür Boyu Pro Lisans</span>
          <svg class="w-4 h-4 text-nexus-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- Trust Badges -->
      <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-mono text-nexus-muted mb-16">
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Windows 10 & 11 Uyumlu</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> %100 Yerel (Sıfır Veri Toplama)</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Tek Seferlik Ödeme (Ömür Boyu)</span>
        <span class="flex items-center gap-2"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Anında Otomatik Anahtar Teslimi</span>
      </div>

      <!-- LIVE INTERACTIVE HERO DEMO WIDGET (ZIPKIN ÇENGELİ) -->
      <div class="max-w-3xl mx-auto rounded-3xl card-glass border border-nexus-cyan/40 p-6 sm:p-8 neon-glow relative">
        <div class="flex items-center justify-between border-b border-nexus-border/60 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="flex gap-1.5">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <span class="text-xs font-mono text-nexus-muted tracking-wider">CANLI TEST VİTRİNİ • İNDİRMEDEN DENE</span>
          </div>
          <div class="flex bg-nexus-surface rounded-xl p-1 border border-nexus-border/60">
            <button onclick="switchTab('pass')" id="tab-btn-pass" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-nexus-cyan text-nexus-bg transition-all">Şifre Motoru</button>
            <button onclick="switchTab('link')" id="tab-btn-link" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-nexus-muted hover:text-white transition-all">Link Çözücü</button>
          </div>
        </div>

        <!-- Tab 1: Password Engine -->
        <div id="demo-tab-pass">
          <div class="text-xs text-nexus-muted mb-2 font-mono">Askeri Entropili Şifre Üretici:</div>
          <div class="flex items-center gap-3 mb-4">
            <input type="text" id="demo-pass-output" readonly value="N7#x9$K2!pQ8@mZ4&L1*vR5%wY" class="flex-1 bg-nexus-bg border border-nexus-border/80 rounded-xl px-4 py-3 font-mono text-sm text-nexus-cyan font-bold outline-none select-all">
            <button onclick="copyDemoPass()" id="demo-copy-btn" class="px-4 py-3 rounded-xl bg-nexus-surface border border-nexus-border/80 hover:border-nexus-cyan text-white text-xs font-mono font-semibold transition-all">Kopyala</button>
            <button onclick="generateDemoPass()" class="px-4 py-3 rounded-xl bg-nexus-cyan/20 border border-nexus-cyan/40 hover:bg-nexus-cyan/30 text-nexus-cyan text-xs font-mono font-bold transition-all">Yenile ↻</button>
          </div>
          <div class="flex flex-wrap items-center justify-between text-xs text-nexus-muted font-mono gap-3">
            <div class="flex items-center gap-2">
              <span>Uzunluk: <b id="pass-len-val" class="text-white">24</b></span>
              <input type="range" min="12" max="48" value="24" oninput="updatePassLen(this.value)" class="accent-nexus-cyan cursor-pointer">
            </div>
            <div class="flex items-center gap-2 text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Entropi: 142-bit (Kırılamaz)</span>
            </div>
          </div>
        </div>

        <!-- Tab 2: Link Cleaner -->
        <div id="demo-tab-link" class="hidden">
          <div class="text-xs text-nexus-muted mb-2 font-mono">Kısaltılmış / Reklamlı / Takipçi Yüklü Link:</div>
          <div class="flex items-center gap-3 mb-4">
            <input type="text" id="demo-link-input" value="https://bc.vc/xYz789?utm_source=tracker&utm_campaign=spy" class="flex-1 bg-nexus-bg border border-nexus-border/80 rounded-xl px-4 py-3 font-mono text-xs text-nexus-muted outline-none">
            <button onclick="cleanDemoLink()" class="px-5 py-3 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent text-nexus-bg text-xs font-heading font-bold transition-all hover:brightness-110">Temizle & Çöz</button>
          </div>
          <div id="demo-link-result" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center justify-between">
            <span class="truncate">✓ Temiz Hedef: <b>https://github.com/zerviatr/NexusHub</b></span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] uppercase font-bold shrink-0">Takipçiler Silindi</span>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- SAAS KILLER COMPARISON TABLE -->
  <section id="comparison" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-bg/50">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">Neden NexusHub?</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          SaaS Abonelik Yorgunluğunu Bitirin.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg">
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
                <td class="p-5 text-red-300">Aylık $35 - $60 (Her araç için ayrı ödeme)</td>
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
                <td class="p-5 text-emerald-400 font-bold bg-nexus-cyan/5">İnternet kesilse dahi tüm araçlar aktiftir</td>
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
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">Şeffaf & Adil Fiyatlandırma</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          Abonelik Yok. Bir Kez Al, Ömür Boyu Kullan.
        </h2>
        <p class="text-nexus-muted font-sans text-base sm:text-lg">
          Gizli yenileme ücreti yok. İster kredi kartıyla, ister kriptoyla, ister Discord üzerinden saniyeler içinde edinin.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">

        <!-- Plan 1: Free Starter -->
        <div class="p-8 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div>
            <div class="text-xs font-mono text-nexus-muted uppercase tracking-wider mb-2">Başlangıç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Free Starter</h3>
            <div class="flex items-baseline gap-2 mb-6">
              <span class="font-heading font-black text-5xl text-white">₺0</span>
              <span class="text-xs font-mono text-nexus-muted">/ Sonsuza dek</span>
            </div>
            <p class="text-xs text-nexus-muted mb-8 leading-relaxed">
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
          <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="w-full py-3.5 rounded-xl border border-nexus-border/80 hover:border-nexus-cyan text-white text-xs font-mono font-bold text-center transition-all">
            Ücretsiz İndir
          </a>
        </div>

        <!-- Plan 2: Nexus Pro (HERO TIER) -->
        <div class="p-8 rounded-3xl card-glass border-2 border-nexus-cyan flex flex-col justify-between relative shadow-[0_0_50px_rgba(6,182,212,0.25)] scale-105 bg-nexus-card">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-nexus-cyan to-nexus-accent text-nexus-bg font-heading font-black text-xs uppercase tracking-widest shadow-lg">
            ⭐ EN ÇOK SATAN
          </div>
          <div>
            <div class="text-xs font-mono text-nexus-cyan uppercase tracking-wider mb-2">Bireysel Güç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Nexus Pro Lifetime</h3>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="font-heading font-black text-5xl text-white">₺349</span>
              <span class="text-xs font-mono text-nexus-cyan font-semibold line-through">₺699</span>
              <span class="text-xs font-mono text-nexus-muted">/ Tek Seferlik</span>
            </div>
            <p class="text-xs text-nexus-cyan/90 font-mono mb-6">
              Ömür boyu kullanım hakkı • Sıfır abonelik
            </p>
            <ul class="space-y-3.5 text-xs text-nexus-text font-medium mb-8">
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> <b>TÜM 15+ Siber Araç (Limitsiz)</b></li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> TempMail & Canlı Gelen Kutusu</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Evrensel Link & Reklam Çözücü</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Cyber Fortress (DoD 7-Pass İmha & Kasa)</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Desktop Floating Orb Mini Widget</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> 1 Cihaz HWID Kilitli (Cihaz Aktarılabilir)</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-nexus-cyan shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Ömür Boyu Güncellemeler (Auto-Updater)</li>
            </ul>
          </div>
          <button onclick="openCheckoutModal('pro', 'Nexus Pro Lifetime', '₺349')" class="w-full py-4 rounded-2xl bg-gradient-to-r from-nexus-cyan via-sky-400 to-nexus-accent hover:brightness-110 active:scale-95 text-nexus-bg font-heading font-black text-sm text-center shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all cursor-pointer">
            Hemen Satın Al (Anında Teslim)
          </button>
        </div>

        <!-- Plan 3: Multi-Device / Studio -->
        <div class="p-8 rounded-3xl card-glass border border-nexus-border/80 flex flex-col justify-between">
          <div>
            <div class="text-xs font-mono text-nexus-muted uppercase tracking-wider mb-2">Çoklu Güç</div>
            <h3 class="font-heading font-black text-2xl text-white mb-4">Nexus Studio (3 Cihaz)</h3>
            <div class="flex items-baseline gap-2 mb-6">
              <span class="font-heading font-black text-5xl text-white">₺699</span>
              <span class="text-xs font-mono text-nexus-muted">/ Tek Seferlik</span>
            </div>
            <p class="text-xs text-nexus-muted mb-8 leading-relaxed">
              Hem ev hem iş bilgisayarınız veya ekibiniz için çoklu cihaz lisansı.
            </p>
            <ul class="space-y-3.5 text-xs text-nexus-text font-medium mb-8">
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> <b>3 Ayrı Bilgisayar Eşzamanlı Lisans</b></li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Tüm Pro Özellikler & Araçlar</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> VIP Discord Rolü & Özel Destek Hattı</li>
              <li class="flex items-center gap-2.5"><svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Öncelikli Beta Güncellemeleri</li>
            </ul>
          </div>
          <button onclick="openCheckoutModal('studio', 'Nexus Studio (3 Cihaz)', '₺699')" class="w-full py-3.5 rounded-xl border border-nexus-border/80 hover:border-nexus-cyan text-white text-xs font-mono font-bold text-center transition-all cursor-pointer">
            Studio Paketi Al
          </button>
        </div>

      </div>

      <!-- Payment Channels Banner -->
      <div class="mt-16 text-center">
        <p class="text-xs font-mono text-nexus-muted mb-4">GÜVENLİ ÖDEME KANALLARI:</p>
        <div class="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-nexus-text">
          <span class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60">💳 Kredi / Banka Kartı (Shopier 3D)</span>
          <span class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60">⚡ Kripto (USDT TRC-20, BTC, LTC)</span>
          <span class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60">💬 Discord Ticket & Destek</span>
        </div>
      </div>

    </div>
  </section>

  <!-- FAQ ACCORDION -->
  <section id="faq" class="relative z-10 py-24 border-t border-nexus-border/40 bg-nexus-bg">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-xs font-mono uppercase tracking-widest text-nexus-cyan">Merak Edilenler</span>
        <h2 class="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight mt-2 mb-4">
          Sıkça Sorulan Sorular.
        </h2>
      </div>

      <div class="space-y-4">
        <details class="group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Lisans anahtarım satın aldıktan sonra ne zaman gelir?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed">
            Satın alma işleminiz onaylandığı anda lisans anahtarınız doğrudan ekranda gösterilir ve verdiğiniz e-posta adresine iletilir. Uygulamayı açıp anahtarınızı girerek saniyeler içinde Pro seviyeye geçebilirsiniz.
          </p>
        </details>

        <details class="group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Bilgisayarıma format atarsam veya yenisini alırsam lisansım yanar mı?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed">
            Asla yanmaz! NexusHub içerisinde yer alan "Lisansı Bu Cihazdan Kaldır" (Deactivate) özelliği ile eski bilgisayarınızdaki cihaz kilidini boşa çıkarabilir ve yeni bilgisayarınızda aynı anahtarla aktivasyon yapabilirsiniz.
          </p>
        </details>

        <details class="group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Verilerim sunucularınıza iletiliyor mu?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed">
            Hayır! NexusHub %100 yerel (offline-first) mimariyle çalışır. Dosya imha, şifreleme, görsel dönüştürme ve pano geçmişiniz sadece ve sadece sizin bilgisayarınızın RAM ve diskinde işlenir. Sunucumuz yalnızca lisans geçerliliğini doğrular.
          </p>
        </details>

        <details class="group p-6 rounded-2xl card-glass border border-nexus-border/80 cursor-pointer">
          <summary class="font-heading font-bold text-base text-white flex items-center justify-between list-none">
            <span>Gelecek güncellemeler için tekrar ücret ödeyecek miyim?</span>
            <span class="text-nexus-cyan group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p class="mt-3 text-xs sm:text-sm text-nexus-muted leading-relaxed">
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
        <a href="/admin" class="hover:text-nexus-cyan transition-colors">Admin Console</a>
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
      <a href="https://github.com/zerviatr/NexusHub/releases/latest" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-nexus-border text-white font-mono text-xs transition-colors">
        İndir
      </a>
      <a href="#pricing" class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-nexus-cyan to-nexus-accent hover:brightness-110 text-nexus-bg font-heading font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
        Lisans Al
      </a>
    </div>
  </div>

  <!-- CHECKOUT MODAL -->
  <div id="checkout-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-3xl card-glass border border-nexus-cyan/50 p-6 sm:p-8 text-nexus-text relative shadow-2xl">
      <button onclick="closeCheckoutModal()" class="absolute top-5 right-5 text-nexus-muted hover:text-white p-1 rounded-lg hover:bg-nexus-border">✕</button>
      
      <div class="text-xs font-mono text-nexus-cyan mb-1 uppercase tracking-wider">GÜVENLİ SİPARİŞ</div>
      <h3 id="modal-plan-name" class="font-heading font-black text-2xl text-white mb-2">Nexus Pro Lifetime</h3>
      <div id="modal-plan-price" class="text-3xl font-mono font-bold text-white mb-6">₺349</div>

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
        <span>Ödeme sonrası lisans anahtarınız anında aktive edilir.</span>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    // Tab Switching
    function switchTab(tab) {
      const passTab = document.getElementById('demo-tab-pass');
      const linkTab = document.getElementById('demo-tab-link');
      const passBtn = document.getElementById('tab-btn-pass');
      const linkBtn = document.getElementById('tab-btn-link');

      if (tab === 'pass') {
        passTab.classList.remove('hidden');
        linkTab.classList.add('hidden');
        passBtn.className = 'px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-nexus-cyan text-nexus-bg transition-all';
        linkBtn.className = 'px-3 py-1 rounded-lg text-xs font-mono font-semibold text-nexus-muted hover:text-white transition-all';
      } else {
        passTab.classList.add('hidden');
        linkTab.classList.remove('hidden');
        linkBtn.className = 'px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-nexus-cyan text-nexus-bg transition-all';
        passBtn.className = 'px-3 py-1 rounded-lg text-xs font-mono font-semibold text-nexus-muted hover:text-white transition-all';
      }
    }

    // Interactive Password Generator Demo
    let passLen = 24;
    function updatePassLen(val) {
      passLen = parseInt(val);
      document.getElementById('pass-len-val').innerText = val;
      generateDemoPass();
    }

    function generateDemoPass() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      let res = '';
      for (let i = 0; i < passLen; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      document.getElementById('demo-pass-output').value = res;
    }

    function copyDemoPass() {
      const text = document.getElementById('demo-pass-output').value;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('demo-copy-btn');
        btn.innerText = 'Kopyalandı!';
        btn.classList.add('text-emerald-400');
        setTimeout(() => {
          btn.innerText = 'Kopyala';
          btn.classList.remove('text-emerald-400');
        }, 2000);
      });
    }

    // Interactive Link Decrypter Demo
    function cleanDemoLink() {
      const input = document.getElementById('demo-link-input');
      const result = document.getElementById('demo-link-result');
      result.innerHTML = '<span class="animate-pulse text-nexus-cyan">Çözülüyor ve reklamlar bypass ediliyor...</span>';
      setTimeout(() => {
        result.innerHTML = '<span class="truncate">✓ Temiz Hedef: <b>https://github.com/zerviatr/NexusHub</b></span><span class="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] uppercase font-bold shrink-0">Takipçiler Silindi</span>';
      }, 600);
    }

    // Modal Control
    function openCheckoutModal(planId, name, price) {
      document.getElementById('modal-plan-name').innerText = name;
      document.getElementById('modal-plan-price').innerText = price;
      document.getElementById('checkout-modal').classList.remove('hidden');
    }

    function closeCheckoutModal() {
      document.getElementById('checkout-modal').classList.add('hidden');
    }

    // Sticky Bottom Bar on Scroll
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
  </script>
</body>
</html>`;
}
