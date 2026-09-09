export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusHub — Enterprise License Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            nexus: {
              bg: '#08090D',
              surface: '#0E1118',
              card: '#141824',
              border: 'rgba(255, 255, 255, 0.08)',
              cyan: '#00F0FF',
              accent: '#8B5CF6',
              emerald: '#10B981',
              rose: '#F43F5E',
              amber: '#F59E0B',
              muted: '#717A8C'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #08090D; font-family: 'Plus Jakarta Sans', sans-serif; color: #F1F5F9; }
    .neon-border-cyan:focus { border-color: #00F0FF; box-shadow: 0 0 15px rgba(0, 240, 255, 0.2); }
    .glass-card { background: rgba(14, 17, 24, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.07); }
    .glass-card:hover { border-color: rgba(255, 255, 255, 0.14); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #08090D; }
    ::-webkit-scrollbar-thumb { background: #1E2333; border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #2E354D; }
    @keyframes pulseGlow { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }
    .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-nexus-cyan/20 selection:text-nexus-cyan">

  <!-- Ambient Glows -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-nexus-cyan/15 rounded-full blur-3xl animate-pulse-glow"></div>
    <div class="absolute top-1/3 -right-40 w-96 h-96 bg-nexus-accent/15 rounded-full blur-3xl animate-pulse-glow"></div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"></div>

  <!-- ========================================================================= -->
  <!-- 1. LOGIN SCREEN -->
  <!-- ========================================================================= -->
  <div id="login-view" class="flex-1 flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative border border-nexus-border">
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-nexus-cyan/20 to-nexus-accent/20 border border-nexus-cyan/30 flex items-center justify-center mb-4 shadow-lg shadow-nexus-cyan/10">
          <i data-lucide="shield-check" class="w-7 h-7 text-nexus-cyan"></i>
        </div>
        <h1 class="text-xl font-extrabold text-white tracking-tight">NexusHub Master Console</h1>
        <p class="text-xs text-nexus-muted mt-1">Sıfır-Veri Lisans & Yetki Sistemi</p>
      </div>

      <form id="login-form" class="space-y-4" onsubmit="handleLogin(event)">
        <div>
          <label class="block text-xs font-semibold text-nexus-muted uppercase tracking-wider mb-2">Master Admin Şifresi</label>
          <div class="relative">
            <i data-lucide="lock" class="w-4 h-4 text-nexus-muted absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input
              type="password"
              id="admin-password"
              required
              placeholder="••••••••••••"
              class="w-full bg-nexus-surface/90 border border-nexus-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none neon-border-cyan transition duration-200"
            />
          </div>
        </div>

        <button
          type="submit"
          id="login-btn"
          class="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-nexus-cyan to-blue-500 hover:from-nexus-cyan/90 hover:to-blue-600 text-black shadow-lg shadow-nexus-cyan/20 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>Giriş Yap</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>

        <p class="text-[11px] text-center text-nexus-muted/60 mt-4 flex items-center justify-center gap-1">
          <i data-lucide="lock" class="w-3 h-3"></i>
          <span>Uçtan uca zamanlama saldırısına karşı korumalı</span>
        </p>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 2. MAIN DASHBOARD VIEW -->
  <!-- ========================================================================= -->
  <div id="dashboard-view" class="hidden flex-1 flex flex-col">
    <!-- Navbar -->
    <header class="border-b border-nexus-border bg-nexus-surface/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-nexus-cyan to-nexus-accent flex items-center justify-center font-bold text-black text-sm shadow-md shadow-nexus-cyan/20">
          N
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-white leading-none">NexusHub Key Controller</h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/30">Zero-PII Enterprise</span>
          </div>
          <p class="text-[11px] text-nexus-muted mt-0.5 flex items-center gap-2">
            <span id="server-telemetry" class="text-nexus-emerald flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-nexus-emerald animate-ping"></span>
              <span>Canlı Sunucu</span>
            </span>
            <span>&bull;</span>
            <span id="telemetry-stats" class="text-nexus-muted/70 hidden sm:inline">Uptime: — | DB: —</span>
          </p>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button onclick="openNotifModal()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-amber-400 hover:bg-amber-400/10 transition text-xs font-semibold flex items-center gap-1.5" title="Telegram & Discord Bildirimleri">
          <i data-lucide="bell" class="w-3.5 h-3.5"></i>
          <span class="hidden md:inline">Bildirimler</span>
        </button>
        <button onclick="openCouponsModal()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-cyan hover:bg-nexus-cyan/10 transition text-xs font-semibold flex items-center gap-1.5" title="Kuponlar & Süre Uzatma">
          <i data-lucide="ticket" class="w-3.5 h-3.5"></i>
          <span class="hidden md:inline">Kuponlar</span>
        </button>
        <button onclick="openDiagnosticsModal()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-cyan hover:bg-nexus-cyan/10 transition text-xs font-semibold flex items-center gap-1.5" title="Lisans Teşhis & Simülatör">
          <i data-lucide="scan-search" class="w-3.5 h-3.5"></i>
          <span class="hidden md:inline">Teşhis</span>
        </button>
        <button onclick="openAuditLogsModal()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-accent hover:bg-nexus-accent/10 transition text-xs font-semibold flex items-center gap-1.5" title="Güvenlik İşlem Geçmişi">
          <i data-lucide="history" class="w-3.5 h-3.5"></i>
          <span class="hidden md:inline">Loglar</span>
        </button>
        <button onclick="exportToCsv()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-nexus-emerald hover:bg-nexus-emerald/10 transition text-xs font-semibold flex items-center gap-1.5" title="Tüm Lisansları CSV Olarak İndir">
          <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
          <span class="hidden md:inline">CSV İndir</span>
        </button>
        <button onclick="refreshKeys()" class="p-2 rounded-xl bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white transition text-xs" title="Yenile">
          <i data-lucide="refresh-cw" id="refresh-icon" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="openChangePasswordModal()" class="p-2 px-2.5 rounded-xl bg-nexus-card border border-nexus-border text-slate-300 hover:text-white hover:border-nexus-cyan/40 transition text-xs font-semibold flex items-center gap-1.5">
          <i data-lucide="key-round" class="w-3.5 h-3.5 text-nexus-cyan"></i>
          <span class="hidden lg:inline">Şifre</span>
        </button>
        <button onclick="handleLogout()" class="p-2 px-2.5 rounded-xl bg-nexus-rose/10 border border-nexus-rose/30 text-nexus-rose hover:bg-nexus-rose/20 transition text-xs font-semibold flex items-center gap-1.5">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          <span class="hidden lg:inline">Çıkış</span>
        </button>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24">

      <!-- Revenue & Financial Summary Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div class="glass-card p-4 rounded-2xl border border-nexus-cyan/20 bg-gradient-to-br from-nexus-cyan/5 to-transparent flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-pulse"></span>
              <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-cyan">Tahmini Brüt Hasılat</p>
            </div>
            <h3 id="stat-revenue" class="text-2xl font-black text-white mt-1">$0</h3>
            <p id="stat-revenue-sub" class="text-[10px] text-slate-400 mt-0.5">0 Satış | Ortalama: $0</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan">
            <i data-lucide="dollar-sign" class="w-5 h-5"></i>
          </div>
        </div>

        <div class="glass-card p-4 rounded-2xl border border-nexus-border flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">Tier Dağılımı</p>
            <div class="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span class="text-blue-400">Pro: <b id="stat-pro-count" class="text-white">0</b></span>
              <span class="text-slate-600">|</span>
              <span class="text-nexus-cyan">Lifetime: <b id="stat-life-count" class="text-white">0</b></span>
              <span class="text-slate-600">|</span>
              <span class="text-nexus-accent">Team: <b id="stat-team-count" class="text-white">0</b></span>
            </div>
            <p class="text-[10px] text-slate-400 mt-1">Stok & Dağıtım Dengesi</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center text-nexus-accent">
            <i data-lucide="pie-chart" class="w-5 h-5"></i>
          </div>
        </div>

        <div class="glass-card p-4 rounded-2xl border border-nexus-border flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">HWID Güvenlik & Risk Radarı</p>
            </div>
            <h3 id="stat-risk-count" class="text-2xl font-black text-nexus-emerald mt-1">0 Risk</h3>
            <p id="stat-risk-sub" class="text-[10px] text-slate-400 mt-0.5">Tüm cihaz aktivasyonları normal</p>
          </div>
          <div id="stat-risk-icon-wrap" class="w-10 h-10 rounded-xl bg-nexus-emerald/10 border border-nexus-emerald/20 flex items-center justify-center text-nexus-emerald">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </div>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">Toplam Lisans</p>
            <h3 id="stat-total" class="text-2xl font-black text-white mt-1">0</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center text-nexus-cyan">
            <i data-lucide="key" class="w-5 h-5"></i>
          </div>
        </div>

        <div class="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">Aktif Lisanslar</p>
            <h3 id="stat-active" class="text-2xl font-black text-nexus-emerald mt-1">0</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-emerald/10 border border-nexus-emerald/20 flex items-center justify-center text-nexus-emerald">
            <i data-lucide="check-circle-2" class="w-5 h-5"></i>
          </div>
        </div>

        <div class="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">Süresi Azalan (&lt;7g)</p>
            <h3 id="stat-expiring" class="text-2xl font-black text-nexus-amber mt-1">0</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-amber/10 border border-nexus-amber/20 flex items-center justify-center text-nexus-amber">
            <i data-lucide="clock" class="w-5 h-5"></i>
          </div>
        </div>

        <div class="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-nexus-muted">İptal Edilenler</p>
            <h3 id="stat-revoked" class="text-2xl font-black text-nexus-rose mt-1">0</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-nexus-rose/10 border border-nexus-rose/20 flex items-center justify-center text-nexus-rose">
            <i data-lucide="ban" class="w-5 h-5"></i>
          </div>
        </div>
      </div>

      <!-- Generator Card with Mode Switcher (Tekli vs Toplu Üretim) -->
      <div class="glass-card p-6 rounded-2xl border border-nexus-border relative overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Lisans Üretim Motoru</h3>
              <p class="text-xs text-nexus-muted">HMAC-SHA256 imzalı tekli veya toplu anahtar oluşturma</p>
            </div>
          </div>

          <!-- Mode Toggle Tabs -->
          <div class="flex items-center gap-1 bg-nexus-surface p-1 rounded-xl border border-nexus-border">
            <button onclick="setGenMode('single')" id="gen-mode-single" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-nexus-card shadow">Tekli Üretim</button>
            <button onclick="setGenMode('bulk')" id="gen-mode-bulk" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white">Toplu Üretim (Bulk)</button>
          </div>
        </div>

        <!-- 1. Single Generator Form -->
        <form id="single-gen-form" onsubmit="handleSingleGenerate(event)" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Lisans Tipi</label>
            <select id="single-tier" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="pro">Pro Edition</option>
              <option value="team">Team Edition</option>
              <option value="lifetime">Lifetime (Ömür Boyu)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Geçerlilik Süresi</label>
            <select id="single-duration" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="30">30 Gün (1 Ay)</option>
              <option value="90">90 Gün (3 Ay)</option>
              <option value="180">180 Gün (6 Ay)</option>
              <option value="365" selected>365 Gün (1 Yıl)</option>
              <option value="0">Sınırsız (Lifetime)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Cihaz Limiti</label>
            <select id="single-devices" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="1">1 Cihaz</option>
              <option value="2" selected>2 Cihaz (Standart)</option>
              <option value="5">5 Cihaz (Team)</option>
              <option value="10">10 Cihaz (Kurumsal)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Satış Kanalı</label>
            <select id="single-channel" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="Direct" selected>Doğrudan / Web</option>
              <option value="Shopier">Shopier</option>
              <option value="Discord">Discord Direct</option>
              <option value="Crypto">Kripto</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Müşteri Bilgisi</label>
            <input type="text" id="single-customer" placeholder="Ahmet Y. / @discord" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan" />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Özel Not / Etiket</label>
            <input type="text" id="single-note" placeholder="VIP Client, vb." class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan" />
          </div>

          <div class="md:col-span-3 lg:col-span-6 flex items-center justify-between pt-2">
            <span class="text-xs text-nexus-muted">Kişisel veri gerektirmez. Üretilen anahtar anında aktifleştirilebilir.</span>
            <button type="submit" id="single-gen-btn" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-nexus-cyan to-blue-500 hover:from-nexus-cyan/90 hover:to-blue-600 text-black shadow-lg shadow-nexus-cyan/20 transition duration-200 flex items-center gap-2">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Tekli Lisans Üret</span>
            </button>
          </div>
        </form>

        <!-- 2. Bulk Generator Form -->
        <form id="bulk-gen-form" onsubmit="handleBulkGenerate(event)" class="hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Üretilecek Adet</label>
            <select id="bulk-count" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="5" selected>5 Adet</option>
              <option value="10">10 Adet</option>
              <option value="25">25 Adet</option>
              <option value="50">50 Adet (Maksimum)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Lisans Tipi</label>
            <select id="bulk-tier" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="pro">Pro Edition</option>
              <option value="team">Team Edition</option>
              <option value="lifetime">Lifetime (Ömür Boyu)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Süre</label>
            <select id="bulk-duration" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="30">30 Gün</option>
              <option value="90">90 Gün</option>
              <option value="365" selected>365 Gün (1 Yıl)</option>
              <option value="0">Sınırsız (Lifetime)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Cihaz Limiti</label>
            <select id="bulk-devices" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="1">1 Cihaz</option>
              <option value="2" selected>2 Cihaz</option>
              <option value="5">5 Cihaz</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Satış Kanalı</label>
            <select id="bulk-channel" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="Direct" selected>Doğrudan / Web</option>
              <option value="Shopier">Shopier</option>
              <option value="Discord">Discord Direct</option>
              <option value="Crypto">Kripto</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Etiket Ön Eki</label>
            <input type="text" id="bulk-prefix" placeholder="Örn: BATCH_MAYIS" value="BULK" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan" />
          </div>

          <div class="md:col-span-3 lg:col-span-6 flex items-center justify-between pt-2">
            <span class="text-xs text-nexus-muted">Toplu üretilen anahtarları anında TXT veya CSV olarak indirebilirsiniz.</span>
            <button type="submit" id="bulk-gen-btn" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-nexus-accent to-purple-600 hover:from-nexus-accent/90 hover:to-purple-700 text-white shadow-lg shadow-nexus-accent/20 transition duration-200 flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4"></i>
              <span>Toplu Lisansları Üret</span>
            </button>
          </div>
        </form>

        <!-- Newly Generated Single Key Alert -->
        <div id="new-key-box" class="hidden mt-4 p-4 rounded-xl bg-nexus-cyan/10 border border-nexus-cyan/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-nexus-cyan/20 text-nexus-cyan flex items-center justify-center shrink-0">
              <i data-lucide="check" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-[11px] text-nexus-muted uppercase font-bold">Yeni Lisans Başarıyla Üretildi</p>
              <p id="new-key-display" class="text-sm sm:text-base font-mono font-bold text-white tracking-wider"></p>
            </div>
          </div>
          <button onclick="copyGeneratedKey()" class="px-4 py-2 rounded-lg bg-nexus-cyan text-black font-bold text-xs hover:bg-nexus-cyan/90 transition flex items-center gap-1.5 shrink-0">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span id="new-key-copy-text">Kopyala</span>
          </button>
        </div>

        <!-- Newly Generated Bulk Result Box -->
        <div id="bulk-result-box" class="hidden mt-4 p-4 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-white flex items-center gap-2">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-nexus-accent"></i>
              <span id="bulk-result-count">5 Adet Lisans Başarıyla Üretildi</span>
            </p>
            <div class="flex items-center gap-2">
              <button onclick="copyBulkKeys()" class="px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border text-xs font-semibold text-white hover:bg-nexus-card transition flex items-center gap-1">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Tümünü Kopyala</span>
              </button>
              <button onclick="downloadBulkTxt()" class="px-3 py-1.5 rounded-lg bg-nexus-accent text-white text-xs font-bold hover:bg-nexus-accent/90 transition flex items-center gap-1">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>TXT İndir</span>
              </button>
            </div>
          </div>
          <textarea id="bulk-keys-textarea" readonly rows="4" class="w-full bg-nexus-surface/90 border border-nexus-border rounded-xl p-3 font-mono text-xs text-nexus-cyan focus:outline-none"></textarea>
        </div>
      </div>

      <!-- Key Registry Table Card -->
      <div class="glass-card rounded-2xl border border-nexus-border overflow-hidden">
        <!-- Controls Bar -->
        <div class="p-4 border-b border-nexus-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Filter Tabs -->
          <div class="flex items-center gap-1 bg-nexus-surface p-1 rounded-xl border border-nexus-border w-full sm:w-auto overflow-x-auto">
            <button onclick="setFilter('all')" id="filter-all" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-nexus-card shadow">Tümü</button>
            <button onclick="setFilter('active')" id="filter-active" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white">Aktif</button>
            <button onclick="setFilter('expiring')" id="filter-expiring" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white">Süresi Azalan</button>
            <button onclick="setFilter('expired')" id="filter-expired" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white">Süresi Dolan</button>
            <button onclick="setFilter('revoked')" id="filter-revoked" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white">İptal Edilen</button>
          </div>

          <!-- Search Input & Row Count -->
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="relative w-full sm:w-64">
              <i data-lucide="search" class="w-3.5 h-3.5 text-nexus-muted absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input
                type="text"
                id="search-input"
                oninput="handleSearch(this.value)"
                placeholder="Key veya Not ara (Ctrl+K)..."
                class="w-full bg-nexus-surface border border-nexus-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan"
              />
            </div>
            <span id="filtered-count" class="text-xs text-nexus-muted whitespace-nowrap hidden sm:inline">0 lisans</span>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-nexus-surface/80 text-nexus-muted uppercase tracking-wider font-bold border-b border-nexus-border text-[10px]">
              <tr>
                <th class="py-3 px-4 w-10">
                  <input type="checkbox" id="select-all-cb" onchange="toggleSelectAll(this.checked)" class="rounded bg-nexus-surface border-nexus-border text-nexus-cyan focus:ring-0 cursor-pointer" />
                </th>
                <th class="py-3 px-4">Lisans Anahtarı</th>
                <th class="py-3 px-4">Tip</th>
                <th class="py-3 px-4">Kanal & Müşteri</th>
                <th class="py-3 px-4">Not / Etiket (Düzenle)</th>
                <th class="py-3 px-4">Cihaz Slotu</th>
                <th class="py-3 px-4">Kalan Süre</th>
                <th class="py-3 px-4">Durum</th>
                <th class="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody id="keys-table-body" class="divide-y divide-nexus-border/50">
              <tr>
                <td colspan="9" class="py-8 text-center text-nexus-muted">
                  <div class="flex items-center justify-center gap-2">
                    <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
                    <span>Lisanslar yükleniyor...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>

    <!-- ========================================================================= -->
    <!-- FLOATING BATCH ACTIONS DOCK (Visible when >= 1 item selected) -->
    <!-- ========================================================================= -->
    <div id="batch-dock" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-nexus-surface border border-nexus-cyan/40 shadow-2xl shadow-nexus-cyan/10 p-3 px-5 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-nexus-cyan animate-pulse"></span>
        <span id="selected-badge" class="font-bold text-xs text-white">0 anahtar seçildi</span>
      </div>

      <div class="h-4 w-px bg-nexus-border"></div>

      <div class="flex items-center gap-2">
        <button onclick="handleBatchAction('extend', 30)" class="px-3 py-1.5 rounded-lg bg-nexus-card border border-nexus-border text-nexus-cyan hover:bg-nexus-cyan/10 text-xs font-semibold transition" title="Seçilenlere 30 Gün Ekle">
          +30 Gün Ekle
        </button>
        <button onclick="handleBatchAction('revoke')" class="px-3 py-1.5 rounded-lg bg-nexus-rose/10 border border-nexus-rose/30 text-nexus-rose hover:bg-nexus-rose/20 text-xs font-semibold transition" title="Seçilenleri İptal Et">
          İptal Et
        </button>
        <button onclick="handleBatchAction('unrevoke')" class="px-3 py-1.5 rounded-lg bg-nexus-emerald/10 border border-nexus-emerald/30 text-nexus-emerald hover:bg-nexus-emerald/20 text-xs font-semibold transition" title="Seçilenleri Aktifleştir">
          Aktifleştir
        </button>
        <button onclick="handleBatchAction('reset-devices')" class="px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 text-xs font-semibold transition" title="Cihaz Slotlarını Temizle">
          Cihazları Sıfırla
        </button>
        <button onclick="handleBatchAction('delete')" class="px-3 py-1.5 rounded-lg bg-nexus-rose text-white hover:bg-nexus-rose/90 text-xs font-bold transition flex items-center gap-1">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Seçilenleri Sil</span>
        </button>
      </div>

      <button onclick="clearSelection()" class="p-1 rounded-lg text-nexus-muted hover:text-white" title="Seçimi Temizle">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

  </div>

  <!-- ========================================================================= -->
  <!-- 3. CUSTOM DANGER CONFIRMATION MODAL -->
  <!-- ========================================================================= -->
  <div id="confirm-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-nexus-rose/40 space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-nexus-rose/10 border border-nexus-rose/30 flex items-center justify-center text-nexus-rose mx-auto shadow-lg shadow-nexus-rose/10">
        <i data-lucide="alert-triangle" class="w-6 h-6"></i>
      </div>
      <div class="text-center">
        <h3 id="confirm-modal-title" class="text-base font-bold text-white">İşlemi Onaylıyor Musunuz?</h3>
        <p id="confirm-modal-desc" class="text-xs text-nexus-muted mt-1.5">Bu işlem geri alınamaz.</p>
      </div>
      <div class="flex items-center justify-center gap-3 pt-2">
        <button onclick="closeConfirmModal(false)" class="flex-1 py-2 px-4 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white hover:bg-nexus-card transition">
          Vazgeç
        </button>
        <button id="confirm-modal-action-btn" onclick="closeConfirmModal(true)" class="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-nexus-rose text-white hover:bg-nexus-rose/90 transition shadow-lg shadow-nexus-rose/20">
          Onayla
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 4. CHANGE PASSWORD MODAL -->
  <!-- ========================================================================= -->
  <div id="password-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-nexus-cyan">
          <i data-lucide="key-round" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Master Admin Şifresini Değiştir</h3>
        </div>
        <button onclick="closeChangePasswordModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="change-password-form" onsubmit="handleChangePassword(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-nexus-muted uppercase mb-1.5">Mevcut Şifre</label>
          <input
            type="password"
            id="pwd-current"
            required
            placeholder="••••••••••••"
            class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-nexus-muted uppercase mb-1.5">Yeni Şifre (En az 6 karakter)</label>
          <input
            type="password"
            id="pwd-new"
            required
            minlength="6"
            placeholder="••••••••••••"
            class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-nexus-muted uppercase mb-1.5">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            id="pwd-confirm"
            required
            minlength="6"
            placeholder="••••••••••••"
            class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onclick="closeChangePasswordModal()"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white hover:bg-nexus-card transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            id="pwd-submit-btn"
            class="px-5 py-2 rounded-xl text-xs font-bold bg-nexus-cyan text-black hover:bg-nexus-cyan/90 transition shadow-lg shadow-nexus-cyan/20"
          >
            Şifreyi Güncelle
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 5. DIAGNOSTICS MODAL -->
  <!-- ========================================================================= -->
  <div id="diagnostics-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-nexus-cyan">
          <i data-lucide="scan-search" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Lisans Kriptografik Teşhis Laboratuvarı</h3>
        </div>
        <button onclick="closeDiagnosticsModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="space-y-3">
        <label class="block text-xs font-semibold text-nexus-muted uppercase">Sorgulanacak Lisans Anahtarı</label>
        <div class="flex gap-2">
          <input
            type="text"
            id="diag-key-input"
            placeholder="NEXUS-PA1B2-C3D4E-F5G6H-I7J8K"
            class="flex-1 bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none neon-border-cyan"
          />
          <button onclick="runDiagnostics()" class="px-4 py-2 rounded-xl bg-nexus-cyan text-black font-bold text-xs hover:bg-nexus-cyan/90 transition">
            Test Et
          </button>
        </div>
      </div>

      <!-- Diagnostic Results Box -->
      <div id="diag-results" class="hidden p-4 rounded-xl bg-nexus-surface border border-nexus-border space-y-3 text-xs">
        <div class="flex items-center justify-between border-b border-nexus-border pb-2">
          <span class="text-nexus-muted">Format & Uzunluk:</span>
          <span id="diag-format" class="font-bold"></span>
        </div>
        <div class="flex items-center justify-between border-b border-nexus-border pb-2">
          <span class="text-nexus-muted">HMAC-SHA256 İmzası:</span>
          <span id="diag-hmac" class="font-bold"></span>
        </div>
        <div class="flex items-center justify-between border-b border-nexus-border pb-2">
          <span class="text-nexus-muted">Çözümlenen Bitiş Tarihi:</span>
          <span id="diag-expiry" class="font-bold"></span>
        </div>
        <div class="flex items-center justify-between border-b border-nexus-border pb-2">
          <span class="text-nexus-muted">Veritabanı Durumu:</span>
          <span id="diag-db" class="font-bold"></span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-nexus-muted">Aktif Cihazlar:</span>
          <span id="diag-devices" class="font-bold"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 6. AUDIT LOGS MODAL -->
  <!-- ========================================================================= -->
  <div id="audit-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-2xl p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-4 max-h-[85vh] flex flex-col">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-nexus-accent">
          <i data-lucide="history" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Güvenlik İşlem Geçmişi (Audit Logs)</h3>
        </div>
        <button onclick="closeAuditLogsModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-2 pr-1" id="audit-logs-list">
        <p class="text-center text-xs text-nexus-muted py-6">Kayıtlar yükleniyor...</p>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 7. WEBHOOK & NOTIFICATIONS MODAL -->
  <!-- ========================================================================= -->
  <div id="notif-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-xl p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-5 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-amber-400">
          <i data-lucide="bell-ring" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Telegram & Discord Bildirim Merkezi</h3>
        </div>
        <button onclick="closeNotifModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Telegram Config Card -->
      <div class="p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <i data-lucide="send" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-white">Telegram Bot Bildirimleri</p>
              <p class="text-[10px] text-nexus-muted">Aktivasyon ve alarmları Telegram grubuna veya özel chat'e yollar</p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="notif-tg-enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-nexus-surface border border-nexus-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Bot Token</label>
            <input type="password" id="notif-tg-token" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan font-mono" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Chat ID</label>
            <input type="text" id="notif-tg-chat" placeholder="-100123456789 veya 98765432" class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan font-mono" />
          </div>
        </div>

        <div class="flex justify-end pt-1">
          <button type="button" onclick="testNotification('telegram')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition flex items-center gap-1.5">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            <span>Telegram Test Gönder</span>
          </button>
        </div>
      </div>

      <!-- Discord Config Card -->
      <div class="p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <i data-lucide="message-square" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="text-xs font-bold text-white">Discord Webhook</p>
              <p class="text-[10px] text-nexus-muted">Zenginleştirilmiş renkli Embed mesajlarıyla Discord sunucuna iletir</p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="notif-dc-enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-nexus-surface border border-nexus-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Webhook URL</label>
          <input type="password" id="notif-dc-webhook" placeholder="https://discord.com/api/webhooks/..." class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan font-mono" />
        </div>

        <div class="flex justify-end pt-1">
          <button type="button" onclick="testNotification('discord')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition flex items-center gap-1.5">
            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
            <span>Discord Test Gönder</span>
          </button>
        </div>
      </div>

      <!-- Notification Triggers Toggles -->
      <div class="p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border space-y-2.5">
        <p class="text-xs font-bold text-white mb-1">Bildirim Tetikleyicileri</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <label class="flex items-center gap-2 text-nexus-muted cursor-pointer hover:text-white">
            <input type="checkbox" id="notif-on-activate" class="rounded bg-nexus-surface border-nexus-border text-nexus-cyan focus:ring-0 cursor-pointer">
            <span>Yeni Aktivasyon</span>
          </label>
          <label class="flex items-center gap-2 text-nexus-muted cursor-pointer hover:text-white">
            <input type="checkbox" id="notif-on-revoke" class="rounded bg-nexus-surface border-nexus-border text-nexus-rose focus:ring-0 cursor-pointer">
            <span>Lisans İptal / Kick</span>
          </label>
          <label class="flex items-center gap-2 text-nexus-muted cursor-pointer hover:text-white">
            <input type="checkbox" id="notif-on-alert" class="rounded bg-nexus-surface border-nexus-border text-nexus-amber focus:ring-0 cursor-pointer">
            <span>Güvenlik Uyarısı</span>
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-nexus-border">
        <button type="button" onclick="closeNotifModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white hover:bg-nexus-card transition">
          Kapat
        </button>
        <button type="button" onclick="saveNotifSettings()" class="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/20">
          Ayarları Kaydet
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 8. COUPONS MANAGEMENT MODAL -->
  <!-- ========================================================================= -->
  <div id="coupons-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-3xl p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-5 max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-nexus-cyan">
          <i data-lucide="ticket" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Süre Uzatma Kuponları (Coupons Engine)</h3>
        </div>
        <button onclick="closeCouponsModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Coupon Generator Form -->
      <form onsubmit="handleCreateCoupons(event)" class="p-4 rounded-xl bg-nexus-surface/80 border border-nexus-border grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Eklenecek Gün</label>
          <select id="coupon-days" class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan">
            <option value="30" selected>+30 Gün (1 Ay)</option>
            <option value="60">+60 Gün (2 Ay)</option>
            <option value="90">+90 Gün (3 Ay)</option>
            <option value="180">+180 Gün (6 Ay)</option>
            <option value="365">+365 Gün (1 Yıl)</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Adet</label>
          <select id="coupon-count" class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan">
            <option value="1">1 Adet</option>
            <option value="5" selected>5 Adet</option>
            <option value="10">10 Adet</option>
            <option value="25">25 Adet</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Kampanya / Not</label>
          <input type="text" id="coupon-note" placeholder="Shopier Hediye vb." class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan" />
        </div>
        <div class="flex items-end">
          <button type="submit" id="coupon-gen-btn" class="w-full py-2 px-3 rounded-xl text-xs font-bold bg-nexus-cyan text-black hover:bg-nexus-cyan/90 transition shadow-lg shadow-nexus-cyan/20 flex items-center justify-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Kupon Üret</span>
          </button>
        </div>
      </form>

      <!-- Coupons Table List -->
      <div class="flex-1 overflow-y-auto pr-1">
        <table class="w-full text-left text-xs">
          <thead class="bg-nexus-surface text-nexus-muted uppercase tracking-wider font-bold border-b border-nexus-border text-[10px]">
            <tr>
              <th class="py-2.5 px-3">Kupon Kodu</th>
              <th class="py-2.5 px-3">Süre</th>
              <th class="py-2.5 px-3">Not</th>
              <th class="py-2.5 px-3">Durum</th>
              <th class="py-2.5 px-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody id="coupons-table-body" class="divide-y divide-nexus-border/50">
            <tr><td colspan="5" class="py-8 text-center text-nexus-muted">Kuponlar yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 9. REDEEM COUPON MODAL -->
  <!-- ========================================================================= -->
  <div id="redeem-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div class="glass-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-nexus-border space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-nexus-border">
        <div class="flex items-center gap-2 text-nexus-cyan">
          <i data-lucide="gift" class="w-5 h-5"></i>
          <h3 class="font-bold text-white text-sm">Lisansa Kupon Uygula</h3>
        </div>
        <button onclick="closeRedeemModal()" class="p-1 rounded-lg text-nexus-muted hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form onsubmit="handleRedeemCoupon(event)" class="space-y-3">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Hedef Lisans Anahtarı</label>
          <input type="text" id="redeem-target-key" readonly class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-mono text-nexus-cyan focus:outline-none" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-nexus-muted mb-1">Kupon Kodu</label>
          <input type="text" id="redeem-coupon-code" required placeholder="NEXUS-EXT-30D-XXXXXXXX" class="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none neon-border-cyan uppercase" />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-nexus-border">
          <button type="button" onclick="closeRedeemModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-nexus-muted hover:text-white transition">
            Vazgeç
          </button>
          <button type="submit" id="redeem-submit-btn" class="px-5 py-2 rounded-xl text-xs font-bold bg-nexus-cyan text-black hover:bg-nexus-cyan/90 transition shadow-lg shadow-nexus-cyan/20">
            Kuponu Uygula & Uzat
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- JavaScript App Logic -->
  <script>
    let token = localStorage.getItem('nexus_admin_token') || '';
    let allKeys = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedKeys = new Set();
    let currentBulkKeys = [];
    let confirmResolver = null;

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Initialize
    window.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      if (token) {
        showDashboard();
      } else {
        showLogin();
      }

      // Global keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeConfirmModal(false);
          closeChangePasswordModal();
          closeDiagnosticsModal();
          closeAuditLogsModal();
          closeNotifModal();
          closeCouponsModal();
          closeRedeemModal();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.focus();
        }
      });
    });

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bg = type === 'success' ? 'bg-nexus-emerald/90 text-white' : 'bg-nexus-rose/90 text-white';
      toast.className = \`px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md pointer-events-auto flex items-center gap-2 transition duration-300 transform translate-y-2 opacity-0 \${bg}\`;
      toast.innerHTML = \`<span>\${message}</span>\`;
      container.appendChild(toast);

      setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    function showLogin() {
      document.getElementById('login-view').classList.remove('hidden');
      document.getElementById('dashboard-view').classList.add('hidden');
    }

    function showDashboard() {
      document.getElementById('login-view').classList.add('hidden');
      document.getElementById('dashboard-view').classList.remove('hidden');
      refreshKeys();
      fetchTelemetry();
          fetchRevenueStats();
    }

    async function handleLogin(e) {
      e.preventDefault();
      const rawPassword = document.getElementById('admin-password').value;
      const password = (rawPassword || '').trim();
      const btn = document.getElementById('login-btn');
      btn.disabled = true;
      btn.innerHTML = 'Doğrulanıyor...';

      try {
        const res = await fetch('/admin/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          token = data.token;
          localStorage.setItem('nexus_admin_token', token);
          showToast('Başarıyla giriş yapıldı!');
          showDashboard();
        } else {
          showToast(data.error || 'Hatalı master şifre!', 'error');
        }
      } catch {
        showToast('Sunucu bağlantı hatası!', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Giriş Yap</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
        lucide.createIcons();
      }
    }

    function handleLogout() {
      token = '';
      localStorage.removeItem('nexus_admin_token');
      showToast('Çıkış yapıldı.');
      showLogin();
    }

    // ── Telemetry Stats ──────────────────────────────────────────────────────
    async function fetchTelemetry() {
      try {
        const res = await fetch('/admin/api/server-stats', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await res.json();
        if (data.success) {
          const hours = Math.floor(data.uptimeSec / 3600);
          const mins = Math.floor((data.uptimeSec % 3600) / 60);
          document.getElementById('telemetry-stats').innerText =
            \`Uptime: \${hours}sa \${mins}dk | RAM: \${data.memoryMb}MB | DB: \${data.dbLatencyMs}ms\`;
        }
      } catch {}
    }

    // ── Generator Mode Switcher ──────────────────────────────────────────────
    function setGenMode(mode) {
      const singleTab = document.getElementById('gen-mode-single');
      const bulkTab = document.getElementById('gen-mode-bulk');
      const singleForm = document.getElementById('single-gen-form');
      const bulkForm = document.getElementById('bulk-gen-form');

      if (mode === 'single') {
        singleTab.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-nexus-card shadow';
        bulkTab.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white';
        singleForm.classList.remove('hidden');
        bulkForm.classList.add('hidden');
      } else {
        bulkTab.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-nexus-card shadow';
        singleTab.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white';
        bulkForm.classList.remove('hidden');
        singleForm.classList.add('hidden');
      }
    }

    async function handleSingleGenerate(e) {
      e.preventDefault();
      const tier = document.getElementById('single-tier').value;
      const duration = parseInt(document.getElementById('single-duration').value, 10);
      const devices = parseInt(document.getElementById('single-devices').value, 10);
      const channel = document.getElementById('single-channel').value;
      const customer = document.getElementById('single-customer').value.trim();
      const note = document.getElementById('single-note').value.trim();

      const btn = document.getElementById('single-gen-btn');
      btn.disabled = true;

      try {
        const res = await fetch('/admin/api/keys/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({
            tier,
            durationDays: duration,
            maxActivations: devices,
            note,
            salesChannel: channel,
            customerNote: customer
          })
        });

        const data = await res.json();
        if (data.success && data.key) {
          showToast('Yeni lisans başarıyla oluşturuldu!');
          document.getElementById('new-key-box').classList.remove('hidden');
          document.getElementById('new-key-display').innerText = data.key;
          document.getElementById('single-note').value = '';
          document.getElementById('single-customer').value = '';
          refreshKeys();
        } else {
          showToast(data.error || 'Lisans oluşturulamadı', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      } finally {
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    async function handleBulkGenerate(e) {
      e.preventDefault();
      const count = parseInt(document.getElementById('bulk-count').value, 10);
      const tier = document.getElementById('bulk-tier').value;
      const duration = parseInt(document.getElementById('bulk-duration').value, 10);
      const devices = parseInt(document.getElementById('bulk-devices').value, 10);
      const channel = document.getElementById('bulk-channel').value;
      const prefix = document.getElementById('bulk-prefix').value.trim() || 'BULK';

      const btn = document.getElementById('bulk-gen-btn');
      btn.disabled = true;
      btn.innerText = 'Üretiliyor...';

      try {
        const res = await fetch('/admin/api/keys/bulk-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({
            count,
            tier,
            durationDays: duration,
            maxActivations: devices,
            notePrefix: prefix,
            salesChannel: channel,
            customerNote: prefix
          })
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.keys)) {
          currentBulkKeys = data.keys;
          document.getElementById('bulk-result-box').classList.remove('hidden');
          document.getElementById('bulk-result-count').innerText = \`\${data.keys.length} Adet Lisans Başarıyla Üretildi\`;
          document.getElementById('bulk-keys-textarea').value = data.keys.join('\\n');
          showToast(\`\${data.keys.length} adet lisans üretildi!\`);
          refreshKeys();
        } else {
          showToast(data.error || 'Toplu üretim başarısız', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="layers" class="w-4 h-4"></i><span>Toplu Lisansları Üret</span>';
        lucide.createIcons();
      }
    }

    function copyGeneratedKey() {
      const key = document.getElementById('new-key-display').innerText;
      copyText(key);
      const copyTextSpan = document.getElementById('new-key-copy-text');
      copyTextSpan.innerText = 'Kopyalandı!';
      setTimeout(() => copyTextSpan.innerText = 'Kopyala', 2000);
    }

    function copyBulkKeys() {
      if (!currentBulkKeys.length) return;
      copyText(currentBulkKeys.join('\\n'));
      showToast('Tüm anahtarlar panoya kopyalandı!');
    }

    function downloadBulkTxt() {
      if (!currentBulkKeys.length) return;
      const blob = new Blob([currentBulkKeys.join('\\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`nexushub_keys_\${Date.now()}.txt\`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // ── CSV Export ───────────────────────────────────────────────────────────
    function exportToCsv() {
      if (!allKeys.length) {
        showToast('Dışa aktarılacak lisans bulunamadı.', 'error');
        return;
      }

      const headers = ['License Key', 'Tier', 'Sales Channel', 'Customer Note', 'Note', 'Active Devices', 'Max Devices', 'Status', 'Expires At', 'Created At'];
      const rows = allKeys.map(k => {
        const isRevoked = k.is_revoked === 1;
        const isExpired = k.expires_at !== 0 && k.expires_at <= Date.now();
        const status = isRevoked ? 'Revoked' : (isExpired ? 'Expired' : 'Active');
        const exp = k.expires_at === 0 ? 'Lifetime' : new Date(k.expires_at).toISOString();
        const created = new Date(k.created_at).toISOString();
        const ch = (k.sales_channel || 'Direct').replace(/"/g, '""');
        const cust = (k.customer_note || '').replace(/"/g, '""');
        const note = (k.order_id || '').replace(/"/g, '""');
        return [k.key, k.tier, \`"\${ch}"\`, \`"\${cust}"\`, \`"\${note}"\`, k.activation_count, k.max_activations, status, exp, created];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`nexushub_licenses_\${new Date().toISOString().slice(0,10)}.csv\`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV dosyası indirildi!');
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt).then(() => showToast('Panoya kopyalandı!'));
    }

    // ── Table Fetch & Render ─────────────────────────────────────────────────
    async function refreshKeys() {
      const refreshIcon = document.getElementById('refresh-icon');
      if (refreshIcon) refreshIcon.classList.add('animate-spin');

      try {
        const res = await fetch('/admin/api/keys', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });

        if (res.status === 401) {
          handleLogout();
          return;
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.keys)) {
          allKeys = data.keys;
          updateMetrics();
          renderTable();
          fetchTelemetry();
        } else {
          showToast('Anahtarlar çekilemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      } finally {
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
      }
    }

    function updateMetrics() {
      const now = Date.now();
      const sevenDays = 7 * 24 * 3600 * 1000;

      const total = allKeys.length;
      const revoked = allKeys.filter(k => k.is_revoked === 1).length;
      const active = allKeys.filter(k => k.is_revoked === 0 && (k.expires_at === 0 || k.expires_at > now)).length;
      const expiring = allKeys.filter(k => k.is_revoked === 0 && k.expires_at !== 0 && (k.expires_at - now) > 0 && (k.expires_at - now) <= sevenDays).length;

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-active').innerText = active;
      document.getElementById('stat-expiring').innerText = expiring;
      document.getElementById('stat-revoked').innerText = revoked;

      // Tier breakdown
      const proCount = allKeys.filter(k => k.tier === 'standard' || k.tier === 'pro').length;
      const lifeCount = allKeys.filter(k => k.tier === 'lifetime').length;
      const teamCount = allKeys.filter(k => k.tier === 'team').length;
      const elPro = document.getElementById('stat-pro-count');
      const elLife = document.getElementById('stat-life-count');
      const elTeam = document.getElementById('stat-team-count');
      if (elPro) elPro.innerText = proCount;
      if (elLife) elLife.innerText = lifeCount;
      if (elTeam) elTeam.innerText = teamCount;

      // Risk radar
      const riskKeys = allKeys.filter(k => (k.activation_count || 0) >= (k.max_activations || 2) && k.is_revoked === 0);
      const riskEl = document.getElementById('stat-risk-count');
      const riskSub = document.getElementById('stat-risk-sub');
      const riskIcon = document.getElementById('stat-risk-icon-wrap');
      if (riskEl) {
        if (riskKeys.length > 0) {
          riskEl.innerText = riskKeys.length + ' Dolu Slot';
          riskEl.className = 'text-2xl font-black text-amber-400 mt-1';
          if (riskSub) riskSub.innerText = riskKeys.length + ' anahtar max cihaz limitinde';
          if (riskIcon) riskIcon.className = 'w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400';
        } else {
          riskEl.innerText = '0 Risk';
          riskEl.className = 'text-2xl font-black text-nexus-emerald mt-1';
          if (riskSub) riskSub.innerText = 'Tüm cihaz aktivasyonları normal';
          if (riskIcon) riskIcon.className = 'w-10 h-10 rounded-xl bg-nexus-emerald/10 border border-nexus-emerald/20 flex items-center justify-center text-nexus-emerald';
        }
      }
    }

    function setFilter(f) {
      activeFilter = f;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-nexus-muted hover:text-white';
      });
      const activeBtn = document.getElementById(\`filter-\${f}\`);
      if (activeBtn) {
        activeBtn.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-nexus-card shadow';
      }
      renderTable();
    }

    function handleSearch(q) {
      searchQuery = q.toLowerCase().trim();
      renderTable();
    }

    function toggleSelectAll(checked) {
      const checkboxes = document.querySelectorAll('.key-row-cb');
      checkboxes.forEach(cb => {
        cb.checked = checked;
        const key = cb.dataset.key;
        if (checked) selectedKeys.add(key);
        else selectedKeys.delete(key);
      });
      updateBatchDock();
    }

    function toggleSelectRow(key, checked) {
      if (checked) selectedKeys.add(key);
      else selectedKeys.delete(key);

      const allCbs = document.querySelectorAll('.key-row-cb');
      const allSelected = Array.from(allCbs).every(cb => cb.checked);
      document.getElementById('select-all-cb').checked = allSelected && allCbs.length > 0;

      updateBatchDock();
    }

    function clearSelection() {
      selectedKeys.clear();
      document.querySelectorAll('.key-row-cb').forEach(cb => cb.checked = false);
      document.getElementById('select-all-cb').checked = false;
      updateBatchDock();
    }

    function updateBatchDock() {
      const dock = document.getElementById('batch-dock');
      const badge = document.getElementById('selected-badge');
      if (selectedKeys.size > 0) {
        badge.innerText = \`\${selectedKeys.size} anahtar seçildi\`;
        dock.classList.remove('hidden');
      } else {
        dock.classList.add('hidden');
      }
    }

    function renderTable() {
      const tbody = document.getElementById('keys-table-body');
      const now = Date.now();

      let filtered = allKeys.filter(k => {
        if (searchQuery) {
          const inKey = k.key.toLowerCase().includes(searchQuery);
          const inNote = (k.order_id || '').toLowerCase().includes(searchQuery);
          if (!inKey && !inNote) return false;
        }

        const isRevoked = k.is_revoked === 1;
        const isExpired = k.expires_at !== 0 && k.expires_at <= now;
        const isExpiring = !isRevoked && !isExpired && k.expires_at !== 0 && (k.expires_at - now) <= 7 * 24 * 3600 * 1000;
        const isActive = !isRevoked && !isExpired;

        if (activeFilter === 'active') return isActive;
        if (activeFilter === 'expiring') return isExpiring;
        if (activeFilter === 'expired') return isExpired;
        if (activeFilter === 'revoked') return isRevoked;
        return true;
      });

      document.getElementById('filtered-count').innerText = \`\${filtered.length} lisans\`;

      if (filtered.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="8" class="py-12 text-center text-nexus-muted">
              <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
              <p>Hiçbir lisans anahtarı bulunamadı.</p>
            </td>
          </tr>
        \`;
        lucide.createIcons();
        return;
      }

      tbody.innerHTML = filtered.map(k => {
        const isRevoked = k.is_revoked === 1;
        const isExpired = k.expires_at !== 0 && k.expires_at <= now;
        const isLifetime = k.expires_at === 0;
        const isChecked = selectedKeys.has(k.key);

        let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-emerald/10 text-nexus-emerald border border-nexus-emerald/30">Aktif</span>';
        if (isRevoked) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-rose/10 text-nexus-rose border border-nexus-rose/30">İptal Edildi</span>';
        } else if (isExpired) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">Süresi Doldu</span>';
        }

        let remainingText = '<span class="text-nexus-cyan font-bold">Ömür Boyu (∞)</span>';
        if (!isLifetime) {
          if (isExpired) {
            remainingText = '<span class="text-nexus-rose font-bold">Süresi Doldu</span>';
          } else {
            const diffDays = Math.ceil((k.expires_at - now) / (24 * 3600 * 1000));
            remainingText = \`<span class="\${diffDays <= 7 ? 'text-nexus-amber font-bold' : 'text-slate-300'}">\${diffDays} gün kaldı</span>\`;
          }
        }

        let tierColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (k.tier === 'lifetime') tierColor = 'bg-nexus-cyan/10 text-nexus-cyan border-nexus-cyan/30';
        if (k.tier === 'team') tierColor = 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30';

        const note = k.order_id || '';
        const activations = \`\${k.activation_count || 0} / \${k.max_activations || 2}\`;

        return \`
          <tr class="hover:bg-nexus-surface/40 transition duration-150">
            <td class="py-3 px-4">
              <input type="checkbox" data-key="\${k.key}" \${isChecked ? 'checked' : ''} onchange="toggleSelectRow('\${k.key}', this.checked)" class="key-row-cb rounded bg-nexus-surface border-nexus-border text-nexus-cyan focus:ring-0 cursor-pointer" />
            </td>
            <td class="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
              <span>\${escapeHtml(k.key)}</span>
              <button onclick="copyText('\${escapeHtml(k.key)}')" class="p-1 rounded text-nexus-muted hover:text-white transition" title="Kopyala">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border \${tierColor}">
                \${escapeHtml(k.tier)}
              </span>
            </td>
            <td class="py-3 px-4">
              \${(() => {
                const ch = (k.sales_channel || 'Direct').trim();
                let b = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/30">Direct</span>';
                if (ch.toLowerCase().includes('shopier')) b = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">Shopier</span>';
                else if (ch.toLowerCase().includes('discord')) b = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Discord</span>';
                else if (ch.toLowerCase().includes('crypto') || ch.toLowerCase().includes('kripto')) b = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Crypto</span>';
                const cust = (k.customer_note || '').trim();
                return \`
                  <div class="flex flex-col gap-0.5">
                    <div>\${b}</div>
                    \${cust ? \`<span class="text-[10px] text-slate-400 truncate max-w-[120px]" title="\${escapeHtml(cust)}">\${escapeHtml(cust)}</span>\` : ''}
                  </div>
                \`;
              })()}
            </td>
            <td class="py-3 px-4">
              <div id="note-display-\${escapeHtml(k.key)}" class="flex items-center gap-1.5 group cursor-pointer" onclick="enableNoteEdit('\${escapeHtml(k.key)}')">
                <span class="text-nexus-muted truncate max-w-[130px] group-hover:text-white">\${note ? escapeHtml(note) : '<span class="italic text-nexus-muted/40">Not ekle...</span>'}</span>
                <i data-lucide="pencil" class="w-3 h-3 text-nexus-muted opacity-0 group-hover:opacity-100 transition"></i>
              </div>
              <div id="note-edit-\${escapeHtml(k.key)}" class="hidden flex items-center gap-1">
                <input type="text" id="note-input-\${escapeHtml(k.key)}" value="\${escapeHtml(note)}" class="bg-nexus-surface border border-nexus-border rounded px-1.5 py-0.5 text-xs text-white w-28 focus:outline-none" />
                <button onclick="saveNote('\${escapeHtml(k.key)}')" class="p-1 text-nexus-emerald hover:text-white"><i data-lucide="check" class="w-3.5 h-3.5"></i></button>
                <button onclick="cancelNoteEdit('\${escapeHtml(k.key)}')" class="p-1 text-nexus-rose hover:text-white"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
              </div>
            </td>
            <td class="py-3 px-4 font-mono text-slate-300 flex items-center gap-1.5">
              <span>\${activations}</span>
              \${(k.activation_count > 0) ? \`
                <button onclick="resetDevices('\${k.key}')" class="p-1 rounded text-amber-400/70 hover:text-amber-400 transition" title="Cihaz Slotlarını Sıfırla">
                  <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                </button>
              \` : ''}
            </td>
            <td class="py-3 px-4 font-mono">\${remainingText}</td>
            <td class="py-3 px-4">\${statusBadge}</td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                \${!isLifetime ? \`
                  <button onclick="openRedeemModal('\${k.key}')" class="px-2 py-1 rounded bg-nexus-card border border-nexus-border text-amber-400 hover:bg-amber-400/10 font-bold text-[11px] transition flex items-center gap-1" title="Kupon ile Süre Uzat">
                    <i data-lucide="ticket" class="w-3 h-3"></i> Kupon
                  </button>
                  <button onclick="extendKey('\${k.key}', 30)" class="px-2 py-1 rounded bg-nexus-card border border-nexus-border text-nexus-cyan hover:bg-nexus-cyan/10 font-bold text-[11px] transition" title="Süreye +30 Gün Ekle">
                    +30g
                  </button>
                \` : ''}
                <button onclick="toggleRevoke('\${k.key}', \${k.is_revoked ? 0 : 1})" class="px-2 py-1 rounded font-bold text-[11px] transition \${k.is_revoked ? 'bg-nexus-emerald/10 text-nexus-emerald border border-nexus-emerald/30 hover:bg-nexus-emerald/20' : 'bg-nexus-rose/10 text-nexus-rose border border-nexus-rose/30 hover:bg-nexus-rose/20'}">
                  \${k.is_revoked ? 'Aktifleştir' : 'İptal Et'}
                </button>
                <button onclick="resendEmailPrompt('\${k.key}')" class="p-1 rounded text-nexus-muted hover:text-nexus-cyan transition" title="Lisans Bilgisini E-posta ile Gönder">
                  <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="deleteKey('\${k.key}')" class="p-1 rounded text-nexus-muted hover:text-nexus-rose transition" title="Sil">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');

      lucide.createIcons();
    }

    // ── Inline Note Editing ──────────────────────────────────────────────────
    function enableNoteEdit(key) {
      document.getElementById(\`note-display-\${key}\`).classList.add('hidden');
      const editBox = document.getElementById(\`note-edit-\${key}\`);
      editBox.classList.remove('hidden');
      document.getElementById(\`note-input-\${key}\`).focus();
      lucide.createIcons();
    }

    function cancelNoteEdit(key) {
      document.getElementById(\`note-edit-\${key}\`).classList.add('hidden');
      document.getElementById(\`note-display-\${key}\`).classList.remove('hidden');
    }

    async function saveNote(key) {
      const newNote = document.getElementById(\`note-input-\${key}\`).value.trim();
      try {
        const res = await fetch('/admin/api/keys/update-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key, note: newNote })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Etiket güncellendi!');
          const target = allKeys.find(k => k.key === key);
          if (target) target.order_id = newNote;
          renderTable();
        }
      } catch {
        showToast('Not güncellenemedi', 'error');
      }
    }

    // ── Custom Confirm Dialog ────────────────────────────────────────────────
    function customConfirm(title, desc) {
      document.getElementById('confirm-modal-title').innerText = title;
      document.getElementById('confirm-modal-desc').innerText = desc;
      document.getElementById('confirm-modal').classList.remove('hidden');

      return new Promise((resolve) => {
        confirmResolver = resolve;
      });
    }

    function closeConfirmModal(result) {
      document.getElementById('confirm-modal').classList.add('hidden');
      if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
      }
    }

    // ── Single Actions ───────────────────────────────────────────────────────
    async function toggleRevoke(key, revokeState) {
      const action = revokeState === 1 ? 'iptal etmek' : 'yeniden aktifleştirmek';
      const confirmed = await customConfirm(\`Lisansı \${action} istiyor musunuz?\`, \`\${key} anahtarının durumu değiştirilecek.\`);
      if (!confirmed) return;

      try {
        const res = await fetch('/admin/api/keys/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key, is_revoked: revokeState })
        });
        const data = await res.json();
        if (data.success) {
          showToast(revokeState === 1 ? 'Lisans iptal edildi.' : 'Lisans yeniden aktif.');
          refreshKeys();
        } else {
          showToast(data.error || 'İşlem başarısız', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    async function extendKey(key, days) {
      try {
        const res = await fetch('/admin/api/keys/extend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key, daysToAdd: days })
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`\${days} gün başarıyla eklendi!\`);
          refreshKeys();
        } else {
          showToast(data.error || 'Süre uzatılamadı', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    async function resetDevices(key) {
      const confirmed = await customConfirm('Cihaz Slotlarını Sıfırla?', \`\${key} için tüm aktif cihazlar kaldırılacak.\`);
      if (!confirmed) return;

      try {
        const res = await fetch('/admin/api/keys/reset-devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Cihaz slotları sıfırlandı.');
          refreshKeys();
        } else {
          showToast(data.error || 'Sıfırlama başarısız', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    async function fetchRevenueStats() {
      try {
        const res = await fetch('/admin/api/revenue-stats', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            const rev = data.stats;
            const revEl = document.getElementById('stat-revenue');
            const revSub = document.getElementById('stat-revenue-sub');
            if (revEl) revEl.innerText = '$' + Number(rev.estimatedRevenueUSD || 0).toLocaleString();
            if (revSub) revSub.innerText = rev.totalPaidLicenses + ' Satış | Pro: ' + rev.breakdown.pro + ' · Studio: ' + rev.breakdown.lifetime;
          }
        }
      } catch (e) {
        console.warn('Revenue stats error:', e);
      }
    }

    async function resendEmailPrompt(key) {
      const email = prompt('Lisans anahtarı ve indirme bağlantısını iletmek istediğiniz e-posta adresi:');
      if (!email || !email.includes('@')) {
        if (email) alert('Geçersiz e-posta formatı.');
        return;
      }

      showToast('E-posta gönderiliyor...');
      try {
        const res = await fetch('/admin/api/keys/resend-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ key, email: email.trim() })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Lisans e-postası başarıyla iletildi: ' + email);
        } else {
          alert('E-posta iletilemedi: ' + (data.error || 'Bilinmeyen hata'));
        }
      } catch (err) {
        alert('İstek hatası: ' + err.message);
      }
    }
    async function deleteKey(key) {
      const confirmed = await customConfirm('Lisansı Kalıcı Olarak Sil?', \`\${key} lisansı ve tüm kayıtları veritabanından yok edilecek.\`);
      if (!confirmed) return;

      try {
        const res = await fetch('/admin/api/keys/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Lisans kalıcı olarak silindi.');
          selectedKeys.delete(key);
          updateBatchDock();
          refreshKeys();
        } else {
          showToast(data.error || 'Silinemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    // ── Batch Multi-Select Actions ───────────────────────────────────────────
    async function handleBatchAction(action, days = 30) {
      const keys = Array.from(selectedKeys);
      if (!keys.length) return;

      if (action === 'delete') {
        const confirmed = await customConfirm('Seçilenleri Sil?', \`Seçtiğiniz \${keys.length} adet lisans kalıcı olarak silinecektir.\`);
        if (!confirmed) return;
      }

      try {
        const res = await fetch('/admin/api/keys/bulk-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ action, keys, daysToAdd: days })
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`\${keys.length} lisans için işlem tamamlandı!\`);
          clearSelection();
          refreshKeys();
        } else {
          showToast(data.error || 'Toplu işlem başarısız', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    // ── Password Modal Handlers ──────────────────────────────────────────────
    function openChangePasswordModal() {
      document.getElementById('password-modal').classList.remove('hidden');
      document.getElementById('pwd-current').value = '';
      document.getElementById('pwd-new').value = '';
      document.getElementById('pwd-confirm').value = '';
      document.getElementById('pwd-current').focus();
    }

    function closeChangePasswordModal() {
      document.getElementById('password-modal').classList.add('hidden');
    }

    async function handleChangePassword(e) {
      e.preventDefault();
      const currentPassword = document.getElementById('pwd-current').value.trim();
      const newPassword = document.getElementById('pwd-new').value.trim();
      const confirmPassword = document.getElementById('pwd-confirm').value.trim();

      if (newPassword !== confirmPassword) {
        showToast('Yeni şifreler birbiriyle uyuşmuyor!', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showToast('Yeni şifre en az 6 karakter olmalıdır!', 'error');
        return;
      }

      const btn = document.getElementById('pwd-submit-btn');
      btn.disabled = true;
      btn.innerText = 'Kaydediliyor...';

      try {
        const res = await fetch('/admin/api/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Şifreniz başarıyla değiştirildi!');
          closeChangePasswordModal();
        } else {
          showToast(data.error || 'Şifre değiştirilemedi!', 'error');
        }
      } catch {
        showToast('Sunucu bağlantı hatası!', 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Şifreyi Güncelle';
      }
    }

    // ── Diagnostics Modal ────────────────────────────────────────────────────
    function openDiagnosticsModal() {
      document.getElementById('diagnostics-modal').classList.remove('hidden');
      document.getElementById('diag-key-input').value = '';
      document.getElementById('diag-results').classList.add('hidden');
      document.getElementById('diag-key-input').focus();
    }

    function closeDiagnosticsModal() {
      document.getElementById('diagnostics-modal').classList.add('hidden');
    }

    async function runDiagnostics() {
      const key = document.getElementById('diag-key-input').value.trim();
      if (!key) return;

      try {
        const res = await fetch('/admin/api/keys/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key })
        });

        const data = await res.json();
        const resultsBox = document.getElementById('diag-results');
        resultsBox.classList.remove('hidden');

        document.getElementById('diag-format').innerHTML = data.validFormat
          ? '<span class="text-nexus-emerald">✓ Geçerli (25 Karakter)</span>'
          : '<span class="text-nexus-rose">✗ Geçersiz Format</span>';

        document.getElementById('diag-hmac').innerHTML = data.isHmacValid
          ? '<span class="text-nexus-emerald">✓ Doğrulandı (HMAC-SHA256 Eşleşti)</span>'
          : '<span class="text-nexus-rose">✗ İMZA GEÇERSİZ</span>';

        let expText = 'Ömür Boyu (Lifetime)';
        if (data.decodedExpiresAt !== 0) {
          expText = \`\${new Date(data.decodedExpiresAt).toLocaleDateString()} (\${data.isExpired ? 'Süresi Dolmuş' : 'Aktif'})\`;
        }
        document.getElementById('diag-expiry').innerText = expText;

        document.getElementById('diag-db').innerHTML = data.inDatabase
          ? \`<span class="text-nexus-emerald">✓ Veritabanında Kayıtlı (\${data.dbDetails.is_revoked ? 'İPTAL EDİLMİŞ' : 'Aktif'})</span>\`
          : '<span class="text-amber-400">Veritabanında Yok (Sadece Offline İmzası Geçerli)</span>';

        document.getElementById('diag-devices').innerText = data.dbDetails
          ? \`\${data.dbDetails.active_devices} / \${data.dbDetails.max_activations} cihaz\`
          : '—';

      } catch {
        showToast('Teşhis sorgusu başarısız', 'error');
      }
    }

    // ── Audit Logs Modal ─────────────────────────────────────────────────────
    function openAuditLogsModal() {
      document.getElementById('audit-modal').classList.remove('hidden');
      loadAuditLogs();
    }

    function closeAuditLogsModal() {
      document.getElementById('audit-modal').classList.add('hidden');
    }

    async function loadAuditLogs() {
      const container = document.getElementById('audit-logs-list');
      try {
        const res = await fetch('/admin/api/audit-logs', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
          container.innerHTML = data.logs.map(log => {
            const date = new Date(log.created_at).toLocaleString();
            let actionColor = 'text-nexus-cyan bg-nexus-cyan/10 border-nexus-cyan/30';
            if (log.action.includes('DELETE') || log.action.includes('REVOKE')) {
              actionColor = 'text-nexus-rose bg-nexus-rose/10 border-nexus-rose/30';
            } else if (log.action.includes('LOGIN_SUCCESS')) {
              actionColor = 'text-nexus-emerald bg-nexus-emerald/10 border-nexus-emerald/30';
            }
            return \`
              <div class="p-3 rounded-xl bg-nexus-surface border border-nexus-border flex items-center justify-between gap-3 text-xs">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border \${actionColor}">\${log.action}</span>
                    <span class="text-white font-medium">\${log.details}</span>
                  </div>
                  <p class="text-[10px] text-nexus-muted mt-1">IP: \${log.ip}</p>
                </div>
                <span class="text-[11px] font-mono text-nexus-muted whitespace-nowrap">\${date}</span>
              </div>
            \`;
          }).join('');
        } else {
          container.innerHTML = '<p class="text-center text-xs text-nexus-muted py-6">Henüz işlem kaydı bulunamadı.</p>';
        }
      } catch {
        container.innerHTML = '<p class="text-center text-xs text-nexus-rose py-6">Loglar yüklenemedi.</p>';
      }
    }

    // ── Notifications Modal ──────────────────────────────────────────────────
    async function openNotifModal() {
      document.getElementById('notif-modal').classList.remove('hidden');
      await fetchNotifSettings();
      lucide.createIcons();
    }

    function closeNotifModal() {
      document.getElementById('notif-modal').classList.add('hidden');
    }

    async function fetchNotifSettings() {
      try {
        const res = await fetch('/admin/api/notifications/settings', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          document.getElementById('notif-tg-token').value = s.telegram_bot_token || '';
          document.getElementById('notif-tg-chat').value = s.telegram_chat_id || '';
          document.getElementById('notif-tg-enabled').checked = !!s.telegram_enabled;
          document.getElementById('notif-dc-webhook').value = s.discord_webhook_url || '';
          document.getElementById('notif-dc-enabled').checked = !!s.discord_enabled;
          document.getElementById('notif-on-activate').checked = s.notify_on_activate !== false;
          document.getElementById('notif-on-revoke').checked = s.notify_on_revoke !== false;
          document.getElementById('notif-on-alert').checked = s.notify_on_alert !== false;
        }
      } catch {
        showToast('Bildirim ayarları alınamadı', 'error');
      }
    }

    async function saveNotifSettings() {
      const payload = {
        telegram_bot_token: document.getElementById('notif-tg-token').value.trim(),
        telegram_chat_id: document.getElementById('notif-tg-chat').value.trim(),
        telegram_enabled: document.getElementById('notif-tg-enabled').checked,
        discord_webhook_url: document.getElementById('notif-dc-webhook').value.trim(),
        discord_enabled: document.getElementById('notif-dc-enabled').checked,
        notify_on_activate: document.getElementById('notif-on-activate').checked,
        notify_on_revoke: document.getElementById('notif-on-revoke').checked,
        notify_on_alert: document.getElementById('notif-on-alert').checked,
      };

      try {
        const res = await fetch('/admin/api/notifications/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Bildirim ayarları kaydedildi!');
          closeNotifModal();
        } else {
          showToast(data.error || 'Ayarlar kaydedilemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    async function testNotification(channel) {
      showToast('Test bildirimi gönderiliyor...');
      try {
        const res = await fetch('/admin/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ channel })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Test mesajı başarıyla yollandı!');
        } else {
          showToast(data.error || 'Test başarısız', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    // ── Coupons Modal ────────────────────────────────────────────────────────
    async function openCouponsModal() {
      document.getElementById('coupons-modal').classList.remove('hidden');
      await fetchCoupons();
      lucide.createIcons();
    }

    function closeCouponsModal() {
      document.getElementById('coupons-modal').classList.add('hidden');
    }

    async function fetchCoupons() {
      const tbody = document.getElementById('coupons-table-body');
      try {
        const res = await fetch('/admin/api/coupons/list', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.coupons)) {
          if (data.coupons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-nexus-muted">Henüz oluşturulmuş kupon yok.</td></tr>';
            return;
          }
          tbody.innerHTML = data.coupons.map(c => {
            const isUsed = Number(c.is_used) === 1;
            const safeUsedByKey = c.used_by_key ? escapeHtml(c.used_by_key.slice(0, 10)) + '...' : '';
            const statusBadge = isUsed
              ? \`<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-nexus-rose/10 text-nexus-rose border border-nexus-rose/30">Kullanıldı (\${safeUsedByKey})</span>\`
              : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-nexus-emerald/10 text-nexus-emerald border border-nexus-emerald/30">Kullanılabilir</span>';
            return \`
              <tr class="hover:bg-nexus-surface/50 transition">
                <td class="py-2.5 px-3 font-mono font-bold text-white flex items-center gap-1.5">
                  <span>\${escapeHtml(c.code)}</span>
                  <button onclick="copyText('\${escapeHtml(c.code)}')" class="p-1 rounded text-nexus-muted hover:text-white transition" title="Kopyala">
                    <i data-lucide="copy" class="w-3 h-3"></i>
                  </button>
                </td>
                <td class="py-2.5 px-3 font-bold text-nexus-cyan">+\${Number(c.days_to_add || 0)} Gün</td>
                <td class="py-2.5 px-3 text-slate-300">\${c.note ? escapeHtml(c.note) : '—'}</td>
                <td class="py-2.5 px-3">\${statusBadge}</td>
                <td class="py-2.5 px-3 text-right">
                  <button onclick="deleteCoupon('\${escapeHtml(c.code)}')" class="p-1 rounded text-nexus-muted hover:text-nexus-rose transition" title="Kuponu Sil">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            \`;
          }).join('');
          lucide.createIcons();
        }
      } catch {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-nexus-rose">Kuponlar yüklenemedi.</td></tr>';
      }
    }

    async function handleCreateCoupons(e) {
      e.preventDefault();
      const daysToAdd = parseInt(document.getElementById('coupon-days').value, 10);
      const count = parseInt(document.getElementById('coupon-count').value, 10);
      const note = document.getElementById('coupon-note').value.trim();
      const btn = document.getElementById('coupon-gen-btn');
      btn.disabled = true;

      try {
        const res = await fetch('/admin/api/coupons/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ daysToAdd, count, note })
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`\${count} adet kupon başarıyla üretildi!\`);
          document.getElementById('coupon-note').value = '';
          fetchCoupons();
        } else {
          showToast(data.error || 'Kupon üretilemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      } finally {
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    async function deleteCoupon(code) {
      const confirmed = await customConfirm('Kuponu Sil?', \`\${code} kuponu kalıcı olarak silinecek.\`);
      if (!confirmed) return;

      try {
        const res = await fetch('/admin/api/coupons/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Kupon silindi.');
          fetchCoupons();
        } else {
          showToast(data.error || 'Silinemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }

    // ── Redeem Coupon Modal ──────────────────────────────────────────────────
    let currentRedeemKey = '';
    function openRedeemModal(key) {
      currentRedeemKey = key;
      document.getElementById('redeem-target-key').value = key;
      document.getElementById('redeem-coupon-code').value = '';
      document.getElementById('redeem-modal').classList.remove('hidden');
      document.getElementById('redeem-coupon-code').focus();
    }

    function closeRedeemModal() {
      document.getElementById('redeem-modal').classList.add('hidden');
      currentRedeemKey = '';
    }

    async function handleRedeemCoupon(e) {
      e.preventDefault();
      const key = currentRedeemKey;
      const couponCode = document.getElementById('redeem-coupon-code').value.trim();
      if (!key || !couponCode) return;

      const btn = document.getElementById('redeem-submit-btn');
      btn.disabled = true;
      btn.innerText = 'Uygulanıyor...';

      try {
        const res = await fetch('/admin/api/coupons/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ key, couponCode })
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`Kupon uygulandı! +\${data.daysAdded} gün eklendi (Yeni Bitiş: \${data.newExpiryDate})\`);
          closeRedeemModal();
          refreshKeys();
        } else {
          showToast(data.error || 'Kupon uygulanamadı', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Kuponu Uygula & Uzat';
      }
    }
  </script>
</body>
</html>`;
}
