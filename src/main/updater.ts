/**
 * src/main/updater.ts
 * Auto-updater integration using electron-updater + GitHub Releases fallback.
 */
import { ipcMain, app, BrowserWindow, globalShortcut, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { destroySystemTray } from './tray';
import axios from 'axios';

// ─── Config ──────────────────────────────────────────────────────────────────
autoUpdater.autoDownload = true;          // Download silently in background
autoUpdater.autoInstallOnAppQuit = true;  // Install when user quits naturally
autoUpdater.allowDowngrade = false;       // Never roll back without explicit action
autoUpdater.logger = console;

try {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'zerviatr',
    repo: 'NexusHub',
    releaseType: 'release'
  });
} catch (err) {
  console.warn('[updater] setFeedURL warning:', err);
}

let isAutoUpdaterInitialized = false;
let activeWindow: BrowserWindow | null = null;

function parseSemver(v: string): [number, number, number] {
  const clean = v.replace(/^v/, '').trim();
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewerVersion(remote: string, current: string): boolean {
  const r = parseSemver(remote);
  const c = parseSemver(current);
  if (r[0] !== c[0]) return r[0] > c[0];
  if (r[1] !== c[1]) return r[1] > c[1];
  return r[2] > c[2];
}

async function fetchLatestGitHubRelease(): Promise<{
  version: string;
  notes: string;
  downloadUrl: string;
  htmlUrl: string;
} | null> {
  try {
    const res = await axios.get('https://api.github.com/repos/zerviatr/NexusHub/releases/latest', {
      headers: { 'User-Agent': 'ZenDev-Desktop-Client' },
      timeout: 8000
    });
    if (!res.data || !res.data.tag_name) return null;
    const version = res.data.tag_name.replace(/^v/, '');
    const notes = res.data.body || 'ZenDev yeni sürüm yayınlandı.';
    const htmlUrl = res.data.html_url || 'https://github.com/zerviatr/NexusHub/releases';
    let downloadUrl = htmlUrl;
    if (Array.isArray(res.data.assets)) {
      const exeAsset = res.data.assets.find(
        (a: any) => a.name && (a.name.endsWith('.exe') || a.name.endsWith('.Setup.exe'))
      );
      if (exeAsset && exeAsset.browser_download_url) {
        downloadUrl = exeAsset.browser_download_url;
      }
    }
    return { version, notes, downloadUrl, htmlUrl };
  } catch (err: any) {
    console.warn('[Updater] Direct GitHub API check warning:', err?.message || err);
    return null;
  }
}

export function setupAutoUpdater(win: BrowserWindow): void {
  activeWindow = win;

  if (isAutoUpdaterInitialized) {
    return;
  }
  isAutoUpdaterInitialized = true;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const send = (channel: string, payload?: unknown) => {
    if (activeWindow && !activeWindow.isDestroyed()) {
      activeWindow.webContents.send(channel, payload);
    }
  };

  // ─── Events ───────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update available:', info.version);
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[updater] Update not available. Current is latest:', info.version);
    send('updater:not-available', {
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Update downloaded successfully:', info.version);
    send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] autoUpdater error:', err?.message || err);
    const raw = (err?.message || String(err || '')).toLowerCase();
    const friendlyMsg =
      raw.includes('latest.yml') ||
      raw.includes('404') ||
      raw.includes('httperror') ||
      raw.includes('enotfound') ||
      raw.includes('econnrefused')
        ? 'Sunucuya bağlantı kurulamadı veya yeni sürüm şu anda GitHub üzerinde derleniyor. En kısa sürede çözülecektir.'
        : 'Güncelleme sunucusuna şu anda erişilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.';
    send('updater:error', friendlyMsg);
  });

  // ─── IPC: renderer can trigger install ────────────────────────────────────
  ipcMain.removeAllListeners('updater:install-now');
  ipcMain.on('updater:install-now', () => {
    console.log('[updater] Update sequence initiated...');
    (app as any).isQuitting = true;

    send('updater:applying-patch');

    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.removeAllListeners('close');
      } catch {}
    });

    try {
      globalShortcut.unregisterAll();
    } catch {}
    try {
      destroySystemTray();
    } catch {}

    setTimeout(() => {
      try {
        console.log('[updater] Executing autoUpdater.quitAndInstall(false, true)...');
        autoUpdater.quitAndInstall(false, true);
      } catch (err) {
        console.error('[updater] quitAndInstall error, calling app.quit():', err);
        app.quit();
      }
    }, 1000);
  });

  // ─── IPC: renderer can trigger manual check ───────────────────────────────
  ipcMain.removeHandler('updater:check-now');
  ipcMain.handle('updater:check-now', async () => {
    const currentVersion = app.getVersion();
    console.log('[updater] Check triggered. Current version:', currentVersion, 'isPackaged:', app.isPackaged);

    // If running in development, query GitHub REST API directly
    if (!app.isPackaged) {
      console.log('[updater] Dev mode: checking GitHub REST API...');
      const ghRelease = await fetchLatestGitHubRelease();
      if (ghRelease && isNewerVersion(ghRelease.version, currentVersion)) {
        return {
          hasUpdate: true,
          status: 'available',
          currentVersion,
          updateVersion: ghRelease.version,
          version: ghRelease.version,
          releaseNotes: ghRelease.notes,
          downloadUrl: ghRelease.downloadUrl,
          htmlUrl: ghRelease.htmlUrl,
          isLatest: false
        };
      }
      return {
        hasUpdate: false,
        status: 'latest',
        currentVersion,
        updateVersion: currentVersion,
        version: currentVersion,
        isLatest: true
      };
    }

    // Production mode: try electron-updater first
    try {
      const result = await autoUpdater.checkForUpdates();
      const updateVersion = result?.updateInfo?.version;
      const hasUpdate = Boolean(updateVersion && isNewerVersion(updateVersion, currentVersion));

      if (hasUpdate) {
        return {
          hasUpdate: true,
          status: 'available',
          currentVersion,
          updateVersion,
          version: updateVersion,
          isLatest: false,
          releaseNotes: (result?.updateInfo as any)?.releaseNotes || 'ZenDev yeni güncelleme hazır.'
        };
      }

      return {
        hasUpdate: false,
        status: 'latest',
        currentVersion,
        updateVersion: currentVersion,
        version: currentVersion,
        isLatest: true
      };
    } catch (autoErr: any) {
      console.warn('[updater] electron-updater failed, trying GitHub REST API fallback:', autoErr?.message);
    }

    // Fallback directly to GitHub releases API in case latest.yml is 404 or CDN is lagging
    const fallback = await fetchLatestGitHubRelease();
    if (fallback && isNewerVersion(fallback.version, currentVersion)) {
      return {
        hasUpdate: true,
        status: 'available',
        currentVersion,
        updateVersion: fallback.version,
        version: fallback.version,
        releaseNotes: fallback.notes,
        downloadUrl: fallback.downloadUrl,
        htmlUrl: fallback.htmlUrl,
        isLatest: false
      };
    }

    if (fallback) {
      return {
        hasUpdate: false,
        status: 'latest',
        currentVersion,
        updateVersion: currentVersion,
        version: currentVersion,
        isLatest: true
      };
    }

    return {
      hasUpdate: false,
      status: 'error',
      currentVersion,
      updateVersion: currentVersion,
      isLatest: false,
      error: 'GitHub güncelleme sunucusuna erişilemedi. Lütfen internet bağlantınızı kontrol edin.'
    };
  });

  // ─── Periodic background check: every 4 hours ────────────────────────────
  const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
  setInterval(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[updater] Periodic check error:', err?.message);
      });
    }
  }, CHECK_INTERVAL_MS);

  // ─── Initial check: 5 seconds after launch ──────────────────────────────
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn('[updater] Initial check notice:', e?.message || e);
      });
    }
  }, 5_000);
}
