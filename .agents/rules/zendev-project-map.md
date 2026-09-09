# ZenDev — Proje Haritası

> Premium multi-tool Electron desktop app. electron-vite + React 19 + TypeScript + Tailwind 3 + framer-motion.
> Frameless window, context-isolated, custom titlebar.

---

## Tech Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Runtime | Electron | 35.x |
| Bundler | electron-vite | 3.x |
| Renderer | React | 19.x |
| Router | react-router-dom | 7.x |
| Animasyon | framer-motion | 12.x |
| İkonlar | lucide-react | 0.511 |
| CSS | Tailwind CSS | 3.4 |
| Görüntü İşleme | sharp | 0.35 |
| HTTP | axios | 1.7 |
| HTML Parse | cheerio | 1.0 |
| Type Check | TypeScript | 5.8 |

Scripts: `npm run dev` (electron-vite dev), `npm run build` (electron-vite build)

---

## Dosya Ağacı

```
ZenDev/
├── package.json
├── tailwind.config.js          ← Design tokens (nexus-* renk sistemi)
├── electron.vite.config.ts
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
│
└── src/
    ├── main/                   ← Electron Main Process
    │   ├── index.ts            ← BrowserWindow, lifecycle, window IPC, register*IPC() çağrıları
    │   └── ipc/                ← Her tool'un backend mantığı
    │       ├── linkBypasser.ts     (15.9KB — Aylink bypass, en büyük handler)
    │       ├── tempMail.ts         (3.5KB)
    │       ├── linkDecrypter.ts    (3.1KB)
    │       ├── fileOrganizer.ts    (4.0KB)
    │       ├── clipboard.ts        (2.3KB)
    │       ├── networkTools.ts     (6.3KB)
    │       └── imageToolkit.ts     (4.7KB)
    │
    ├── preload/
    │   └── index.ts            ← contextBridge.exposeInMainWorld('nexusAPI', {...})
    │                             Tüm IPC kanallarını nexusAPI objesine mapliyor
    │
    └── renderer/
        └── src/
            ├── main.tsx        ← React entry, HashRouter
            ├── App.tsx         ← Routes + AnimatePresence page transitions
            ├── env.d.ts        ← NexusAPI interface (Window.nexusAPI type)
            ├── index.css       ← Tailwind directives + glass-card, glow-*, gradient-text, shimmer-bg
            │
            ├── lib/
            │   └── ipc.ts      ← Typed IPC wrapper — renderer'daki tüm componentler bunu kullanır
            │                     export const nexusAPI = { ... } — window.nexusAPI'yi sarar
            │                     Tüm interface'ler burada tanımlı (BypassResult, DecryptResult, vb.)
            │
            ├── components/
            │   ├── BaseToolTemplate.tsx  ← Reusable tool page layout (icon, title, desc, gradient, children)
            │   ├── Sidebar.tsx          ← Sol navigation, navItems[], layoutId animasyonları
            │   └── TitleBar.tsx         ← Custom frameless titlebar, window controls
            │
            └── pages/
                ├── Dashboard.tsx          /                 (8.4KB)
                ├── TempMail.tsx           /temp-mail        (14.8KB)
                ├── UniversalDecrypter.tsx  /decrypter        (13.3KB)
                ├── BulkOrganizer.tsx       /organizer        (11.8KB)
                ├── AylinkBypasser.tsx      /aylink           (9.6KB)
                ├── PasswordGenerator.tsx   /password         (17.1KB)
                ├── ClipboardManager.tsx    /clipboard        (8.9KB)
                ├── NetworkTools.tsx        /network          (14.5KB)
                └── ImageToolkit.tsx        /image            (15.7KB)
```

---

## Mimari Akış (Yeni Tool Ekleme Paterni)

```
1. src/main/ipc/<tool>.ts        → ipcMain.handle('<tool>:<method>', ...)  — backend mantığı
2. src/main/index.ts             → register<Tool>IPC() çağrısı ekle
3. src/preload/index.ts          → nexusAPI.<tool> = { method: () => ipcRenderer.invoke(...) }
4. src/renderer/src/env.d.ts     → NexusAPI interface'ine <tool> namespace'i ekle
5. src/renderer/src/lib/ipc.ts   → Interface'ler + typed wrapper fonksiyonları
6. src/renderer/src/pages/<Tool>.tsx  → UI component, <BaseToolTemplate> ile sarılır
7. src/renderer/src/App.tsx      → <Route path="/<tool>" element={<Tool />} />
8. src/renderer/src/components/Sidebar.tsx → navItems[] array'ine ekle
```

---

## IPC Kanal Konvansiyonu

`<namespace>:<method>` formatı. Örnekler:
- `link:bypass`, `tempmail:generate`, `tempmail:check`, `tempmail:read`
- `decrypter:clean`, `organizer:selectDir`, `organizer:scan`, `organizer:execute`
- `clipboard:getHistory`, `clipboard:clear`, `clipboard:delete`, `clipboard:write`
- `network:ipLookup`, `network:dnsQuery`, `network:portScan`, `network:ping`
- `image:selectFiles`, `image:getMetadata`, `image:process`
- `window:minimize`, `window:maximize`, `window:close`, `window:isMaximized`
- `shell:openExternal`

---

## Design System (Tailwind Tokens)

```
nexus-bg:           #0a0a0f      (en koyu arka plan)
nexus-surface:      #12121a      (sidebar, panel arka planları)
nexus-card:         #1a1a2e      (kart arka planları)
nexus-border:       #2a2a3e      (kenarlar)
nexus-text:         #e4e4ed      (ana metin)
nexus-muted:        #6b6b8a      (ikincil metin)
nexus-accent:       #8b5cf6      (mor — primary accent)
nexus-accent-light: #a78bfa
nexus-cyan:         #06b6d4      (cyan — secondary accent)
nexus-cyan-light:   #22d3ee
nexus-success:      #10b981
nexus-error:        #ef4444
nexus-warning:      #f59e0b
```

Font: Inter (sans), JetBrains Mono (mono)
Utility class'lar: `.glass-card`, `.gradient-border`, `.glow-accent`, `.glow-cyan`, `.shimmer-bg`, `.gradient-text`, `.no-drag`, `.drag`

---

## Önemli Notlar

- **Frameless window**: `frame: false` → TitleBar.tsx custom drag region (.drag / .no-drag)
- **Context Isolation**: `contextIsolation: true`, `sandbox: false` — preload bridge zorunlu
- **Page Transitions**: AnimatePresence + motion.div, cubic bezier `[0.22, 1, 0.36, 1]`
- **BaseToolTemplate**: Her tool sayfası bu component ile sarılır. Props: `icon`, `title`, `description`, `gradient?` (opsiyonel), `children`
- **ipc.ts ease gotcha**: framer-motion ease array `as [number, number, number, number]` tuple assertion gerektirir
- **env.d.ts senkronizasyon**: Preload'a yeni namespace eklendiğinde env.d.ts'deki NexusAPI interface'i de güncellenmeli
