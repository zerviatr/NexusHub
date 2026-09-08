---
name: nexushub
description: >-
  NexusHub Electron uygulamasina ait mimari bilgi, i18n kaliplari,
  IPC conventions, teknoloji stack ve backlog. NexusHub'da degisiklik
  yapilacagi zaman bu skill'i oku.
---

# NexusHub Proje Skill

## Stack
- **Runtime:** Electron (main) + Vite + React 18 + TypeScript (renderer)
- **Styling:** Vanilla CSS + custom design tokens (no Tailwind — custom utility classes)
- **Animasyon:** Framer Motion
- **Ikonlar:** Lucide React
- **i18n:** Custom `lib/i18n.tsx` — `useT()` hook, `I18nProvider`, `en.json` / `tr.json`
- **Lisans:** Offline-first HMAC + `safeStorage` (Electron OS keychain)
- **Build:** `electron-builder`, `dist:win` target

## Mimari Akis
```
App.tsx
  └─ EulaGate          (localStorage: eula_accepted)
       └─ LicenseCheck  (safeStorage: license key + HMAC)
            └─ OnboardingTour (localStorage: tour_complete)
                 └─ Layout
                      ├─ Sidebar (nav)
                      └─ Dashboard / Tool Pages (React Router)
```

## Dizin Yapisi (Onemli)
```
src/
  main/
    index.ts          — IPC handlers, Electron app lifecycle
  renderer/src/
    pages/            — Tool sayfalari (Dashboard, TempMail, vb.)
    components/       — Sidebar, BaseToolTemplate, EulaGate, vb.
    lib/
      i18n.tsx        — I18nProvider, useT hook
      ipc.ts          — nexusAPI tip tanimlari + window.nexusAPI bridge
      LicenseContext.tsx
    locales/
      en.json
      tr.json
.agents/
  rules/
    nexushub-project-map.md   — Canli proje haritasi
    update-project-map.md     — Haritayi ne zaman guncelle kurali
  skills/
    nexushub/SKILL.md         — Bu dosya
YAPILACAKLAR.md               — Backlog (proje kokunde)
```

## i18n Kalibi — Yeni Sayfa Eklerken
1. `import { useT } from '../lib/i18n'`
2. Component icinde `const { t } = useT()`
3. Tum hardcoded string'leri `t('namespace.key') || 'fallback'` yap
4. `en.json` ve `tr.json`'a ayni key'i ekle
5. Namespace = arac adi (tempMail, decrypter, aylink, network, image, organizer, clipboard, password, vb.)
6. `nav.tools.toolAdi` key'ini de ekle (sidebar + dashboard icin)
7. `dashboard.tools.toolAdi.desc` key'ini de ekle

## IPC Kalibi
```typescript
// Renderer tarafi (nexusAPI)
const result = await nexusAPI.toolName.methodName(args)

// Main tarafi (index.ts)
ipcMain.handle('channel-name', async (_, ...args) => {
  // is
  return result
})

// Tip tanimlari: src/renderer/src/lib/ipc.ts
```

## Yeni Tool Ekleme — Adim Adim
1. `src/renderer/src/pages/YeniTool.tsx` olustur
2. `BaseToolTemplate` kullan (icon, title, description, gradient props)
3. `useT()` ile i18n ekle — hic hardcoded string kalmamali
4. `src/renderer/src/App.tsx`'e route ekle
5. `src/renderer/src/components/Sidebar.tsx`'e nav item ekle
6. `src/renderer/src/pages/Dashboard.tsx`'e tool card ekle (tools array)
7. `en.json` + `tr.json`'a:
   - `nav.tools.toolAdi` 
   - `dashboard.tools.toolAdi.desc`
   - Tool-specific namespace block
8. IPC gerektiriyorsa `src/main/index.ts`'e handler, `ipc.ts`'e tip ekle
9. `.agents/rules/nexushub-project-map.md` guncelle

## Tasarim Tokenlari
```
nexus-bg        — Ana arkaplan
nexus-surface   — Yuzeylerin arkaplan
nexus-card      — Kart arkaplan
nexus-border    — Kenar rengi
nexus-text      — Ana metin
nexus-muted     — Soluk metin
nexus-accent    — #8b5cf6 (violet)
nexus-cyan      — #22d3ee
nexus-success   — #10b981
nexus-error     — #ef4444
```

## Kritik Notlar
- **YAPILACAKLAR.md** proje kokunde — backlog icin tek referans
- Project map otomatik guncelleniyor (`.agents/rules/update-project-map.md` kurali)
- Lisans persistence: `safeStorage` (OS keychain)
- EULA / Tour status: `localStorage`
- Dev ortaminda auto-updater loglar: `app.isPackaged` check ile suppress edildi
- CSP: dev'de gevsetilmis, prod'da hardened (dinamik switch)

## Mevcut Toollar
| Tool | Sayfa | IPC |
|------|-------|-----|
| TempMail Generator | TempMail.tsx | nexusAPI.tempMail.* |
| Universal Link Decrypter | UniversalDecrypter.tsx | nexusAPI.decrypter.* |
| Aylink Bypasser | AylinkBypasser.tsx | nexusAPI.bypassLink() |
| Password Generator | PasswordGenerator.tsx | Client-side |
| Bulk File Organizer | BulkOrganizer.tsx | nexusAPI.organizer.* |
| Clipboard Manager | ClipboardManager.tsx | nexusAPI.clipboard.* |
| Image Toolkit | ImageToolkit.tsx | nexusAPI.image.* |
| Network Tools | NetworkTools.tsx | nexusAPI.network.* |

## Backlog (YAPILACAKLAR.md ile senkron)

### Siradaki Featurelar (Oncelik Sirasi)
1. **Hash & Encode Suite** — MD5, SHA-*, bcrypt, Base64, URL, Hex — client-side
2. **QR Code Studio** — Uret (metin/URL/WiFi/vCard) + Oku, PNG/SVG export — client-side
3. **JSON / JWT Toolkit** — decode, format, minify, diff, path query
4. **Regex Tester** — live highlight, named groups, flag toggle, test bank
5. **Fake Data Generator** — bulk JSON/CSV, TR locale
6. **Color Toolkit** — HEX/RGB/HSL converter, palette extractor, WCAG

### Phase 3 — Monetization
- LemonSqueezy / Paddle webhook endpoint
- Sunucu tarafi lisans dogrulama
- Otomatik key generation servisi
- Cihaz basi aktivasyon limiti (1-2)

### Production
- Code signing (`dist:win`)
- Auto-update server endpoint
- Installer branding finalize
