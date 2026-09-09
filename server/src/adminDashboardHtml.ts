export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusHub — Master License Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
    .glass-card:hover { border-color: rgba(255, 255, 255, 0.12); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #08090D; }
    ::-webkit-scrollbar-thumb { background: #1E2333; border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #2E354D; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-nexus-cyan/20 selection:text-nexus-cyan">

  <!-- Ambient Glow -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-nexus-cyan/10 rounded-full blur-3xl"></div>
    <div class="absolute top-1/3 -right-40 w-96 h-96 bg-nexus-accent/10 rounded-full blur-3xl"></div>
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
    <header class="border-b border-nexus-border bg-nexus-surface/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-nexus-cyan to-nexus-accent flex items-center justify-center font-bold text-black text-sm shadow-md shadow-nexus-cyan/20">
          N
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-white leading-none">NexusHub Key Controller</h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-cyan/10 text-nexus-cyan border border-nexus-cyan/30">Zero-PII</span>
          </div>
          <p class="text-[11px] text-nexus-muted mt-0.5">Kullanıcı verisi tutulmaz &bull; Sadece Anahtarlar</p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button onclick="refreshKeys()" class="p-2 rounded-xl bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white transition duration-200 text-xs flex items-center gap-1.5" title="Yenile">
          <i data-lucide="refresh-cw" id="refresh-icon" class="w-3.5 h-3.5"></i>
          <span class="hidden sm:inline">Yenile</span>
        </button>
        <button onclick="openChangePasswordModal()" class="p-2 px-3 rounded-xl bg-nexus-card border border-nexus-border text-slate-300 hover:text-white hover:border-nexus-cyan/40 transition duration-200 text-xs font-semibold flex items-center gap-1.5" title="Şifre Değiştir">
          <i data-lucide="key-round" class="w-3.5 h-3.5 text-nexus-cyan"></i>
          <span class="hidden sm:inline">Şifre Değiştir</span>
        </button>
        <button onclick="handleLogout()" class="p-2 px-3 rounded-xl bg-nexus-rose/10 border border-nexus-rose/30 text-nexus-rose hover:bg-nexus-rose/20 transition duration-200 text-xs font-semibold flex items-center gap-1.5">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          <span>Çıkış</span>
        </button>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

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
            <h3 id="stat-expiring" class="text-2xl font-black text-amber-400 mt-1">0</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
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

      <!-- Generator Card -->
      <div class="glass-card p-6 rounded-2xl border border-nexus-border relative overflow-hidden">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/30 flex items-center justify-center text-nexus-cyan">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Yeni Lisans Anahtarı Üret</h3>
            <p class="text-xs text-nexus-muted">Anında geçerli, kriptografik HMAC-SHA256 imzalı lisans oluşturun</p>
          </div>
        </div>

        <form id="generate-form" onsubmit="handleGenerate(event)" class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Lisans Tipi</label>
            <select id="gen-tier" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="pro">Pro Edition</option>
              <option value="team">Team Edition</option>
              <option value="lifetime">Lifetime (Ömür Boyu)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Geçerlilik Süresi</label>
            <select id="gen-duration" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="30">30 Gün (1 Ay)</option>
              <option value="90">90 Gün (3 Ay)</option>
              <option value="180">180 Gün (6 Ay)</option>
              <option value="365" selected>365 Gün (1 Yıl)</option>
              <option value="0">Sınırsız (Lifetime)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Cihaz Limiti</label>
            <select id="gen-devices" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none neon-border-cyan">
              <option value="1">1 Cihaz</option>
              <option value="2" selected>2 Cihaz (Standart)</option>
              <option value="5">5 Cihaz (Team)</option>
              <option value="10">10 Cihaz (Kurumsal)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-nexus-muted mb-1.5">Özel Not / Etiket</label>
            <input type="text" id="gen-note" placeholder="Örn: VIP Client, Çekiliş" class="w-full bg-nexus-surface border border-nexus-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none neon-border-cyan" />
          </div>

          <div class="md:col-span-4 flex items-center justify-between pt-2">
            <span class="text-xs text-nexus-muted">Kişisel veri gerektirmez. Üretilen anahtar anında aktifleştirilebilir.</span>
            <button type="submit" id="gen-btn" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-nexus-cyan to-blue-500 hover:from-nexus-cyan/90 hover:to-blue-600 text-black shadow-lg shadow-nexus-cyan/20 transition duration-200 flex items-center gap-2">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Lisans Üret</span>
            </button>
          </div>
        </form>

        <!-- Newly Generated Key Alert -->
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

          <!-- Search Input -->
          <div class="relative w-full sm:w-64">
            <i data-lucide="search" class="w-3.5 h-3.5 text-nexus-muted absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input
              type="text"
              id="search-input"
              oninput="handleSearch(this.value)"
              placeholder="Key veya Not ara..."
              class="w-full bg-nexus-surface border border-nexus-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none neon-border-cyan"
            />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-nexus-surface/80 text-nexus-muted uppercase tracking-wider font-bold border-b border-nexus-border text-[10px]">
              <tr>
                <th class="py-3 px-4">Lisans Anahtarı</th>
                <th class="py-3 px-4">Tip</th>
                <th class="py-3 px-4">Not / Etiket</th>
                <th class="py-3 px-4">Cihaz Slotu</th>
                <th class="py-3 px-4">Kalan Süre</th>
                <th class="py-3 px-4">Durum</th>
                <th class="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody id="keys-table-body" class="divide-y divide-nexus-border/50">
              <tr>
                <td colspan="7" class="py-8 text-center text-nexus-muted">
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
  </div>

  <!-- ========================================================================= -->
  <!-- 3. CHANGE PASSWORD MODAL -->
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

  <!-- JavaScript App Logic -->
  <script>
    let token = localStorage.getItem('nexus_admin_token') || '';
    let allKeys = [];
    let activeFilter = 'all';
    let searchQuery = '';

    // Initialize
    window.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      if (token) {
        showDashboard();
      } else {
        showLogin();
      }
    });

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bg = type === 'success' ? 'bg-nexus-emerald/90 text-white' : 'bg-nexus-rose/90 text-white';
      toast.className = \`px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md pointer-events-auto flex items-center gap-2 transition duration-300 transform translate-y-2 opacity-0 \${bg}\`;
      toast.innerHTML = \`<span>\${message}</span>\`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

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
      } catch (err) {
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
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

    function renderTable() {
      const tbody = document.getElementById('keys-table-body');
      const now = Date.now();

      let filtered = allKeys.filter(k => {
        // Search filter
        if (searchQuery) {
          const inKey = k.key.toLowerCase().includes(searchQuery);
          const inNote = (k.order_id || '').toLowerCase().includes(searchQuery);
          if (!inKey && !inNote) return false;
        }

        // Status filter
        const isRevoked = k.is_revoked === 1;
        const isExpired = k.expires_at !== 0 && k.expires_at <= now;
        const isExpiring = !isRevoked && !isExpired && k.expires_at !== 0 && (k.expires_at - now) > 0 && (k.expires_at - now) <= 7 * 24 * 3600 * 1000;
        const isActive = !isRevoked && !isExpired;

        if (activeFilter === 'active') return isActive;
        if (activeFilter === 'expiring') return isExpiring;
        if (activeFilter === 'expired') return isExpired;
        if (activeFilter === 'revoked') return isRevoked;
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" class="py-12 text-center text-nexus-muted">
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

        let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-emerald/10 text-nexus-emerald border border-nexus-emerald/30">Aktif</span>';
        if (isRevoked) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-nexus-rose/10 text-nexus-rose border border-nexus-rose/30">İptal Edildi</span>';
        } else if (isExpired) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">Süresi Doldu</span>';
        }

        // Remaining Days calculation
        let remainingText = '<span class="text-nexus-cyan font-bold">Ömür Boyu (∞)</span>';
        if (!isLifetime) {
          if (isExpired) {
            remainingText = '<span class="text-nexus-rose font-bold">Süresi Doldu</span>';
          } else {
            const diffDays = Math.ceil((k.expires_at - now) / (24 * 3600 * 1000));
            remainingText = \`<span class="\${diffDays <= 7 ? 'text-amber-400 font-bold' : 'text-slate-300'}">\${diffDays} gün kaldı</span>\`;
          }
        }

        // Tier styling
        let tierColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        if (k.tier === 'lifetime') tierColor = 'bg-nexus-cyan/10 text-nexus-cyan border-nexus-cyan/30';
        if (k.tier === 'team') tierColor = 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30';

        const note = k.order_id || '—';
        const activations = \`\${k.activation_count || 0} / \${k.max_activations || 2}\`;

        return \`
          <tr class="hover:bg-nexus-surface/40 transition duration-150">
            <td class="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
              <span>\${k.key}</span>
              <button onclick="copyText('\${k.key}')" class="p-1 rounded text-nexus-muted hover:text-white transition" title="Kopyala">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border \${tierColor}">
                \${k.tier}
              </span>
            </td>
            <td class="py-3 px-4 text-nexus-muted truncate max-w-[140px]">\${note}</td>
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
                  <button onclick="extendKey('\${k.key}', 30)" class="px-2 py-1 rounded bg-nexus-card border border-nexus-border text-nexus-cyan hover:bg-nexus-cyan/10 font-bold text-[11px] transition" title="Süreye +30 Gün Ekle">
                    +30g
                  </button>
                \` : ''}
                <button onclick="toggleRevoke('\${k.key}', \${k.is_revoked ? 0 : 1})" class="px-2 py-1 rounded font-bold text-[11px] transition \${k.is_revoked ? 'bg-nexus-emerald/10 text-nexus-emerald border border-nexus-emerald/30 hover:bg-nexus-emerald/20' : 'bg-nexus-rose/10 text-nexus-rose border border-nexus-rose/30 hover:bg-nexus-rose/20'}">
                  \${k.is_revoked ? 'Aktifleştir' : 'İptal Et'}
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

    async function handleGenerate(e) {
      e.preventDefault();
      const tier = document.getElementById('gen-tier').value;
      const duration = parseInt(document.getElementById('gen-duration').value, 10);
      const devices = parseInt(document.getElementById('gen-devices').value, 10);
      const note = document.getElementById('gen-note').value.trim();

      const btn = document.getElementById('gen-btn');
      btn.disabled = true;

      try {
        const res = await fetch('/admin/api/keys/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ tier, durationDays: duration, maxActivations: devices, note })
        });

        const data = await res.json();
        if (data.success && data.key) {
          showToast('Yeni lisans başarıyla oluşturuldu!');
          document.getElementById('new-key-box').classList.remove('hidden');
          document.getElementById('new-key-display').innerText = data.key;
          document.getElementById('gen-note').value = '';
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

    function copyGeneratedKey() {
      const key = document.getElementById('new-key-display').innerText;
      copyText(key);
      const copyTextSpan = document.getElementById('new-key-copy-text');
      copyTextSpan.innerText = 'Kopyalandı!';
      setTimeout(() => copyTextSpan.innerText = 'Kopyala', 2000);
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt).then(() => {
        showToast('Panoya kopyalandı!');
      });
    }

    async function toggleRevoke(key, revokeState) {
      const action = revokeState === 1 ? 'iptal etmek' : 'yeniden aktifleştirmek';
      if (!confirm(\`\${key} lisansını \${action} istediğinize emin misiniz?\`)) return;

      try {
        const res = await fetch('/admin/api/keys/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
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
      if (!confirm(\`Bu lisansa bağlı tüm aktif cihaz slotları sıfırlanacak. Kullanıcı yeni cihazda aktifleştirebilecek. Onaylıyor musunuz?\`)) return;

      try {
        const res = await fetch('/admin/api/keys/reset-devices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
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

    async function deleteKey(key) {
      if (!confirm(\`UYARI: \${key} lisansı ve tüm aktivasyonları kalıcı olarak silinecek! Onaylıyor musunuz?\`)) return;

      try {
        const res = await fetch('/admin/api/keys/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Lisans kalıcı olarak silindi.');
          refreshKeys();
        } else {
          showToast(data.error || 'Silinemedi', 'error');
        }
      } catch {
        showToast('Bağlantı hatası', 'error');
      }
    }
  </script>
</body>
</html>`;
}
