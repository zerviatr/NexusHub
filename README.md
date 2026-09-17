# ZenDev (NexusHub) — Enterprise Multi-Tool Desktop Workstation

[![Electron Version](https://img.shields.io/badge/Electron-v35.2.1-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React Version](https://img.shields.io/badge/React-v19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.8.3_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-629%20Passed-2ea44f?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Architecture](https://img.shields.io/badge/Architecture-Electron_DMZ_%2B_Preload-6f42c1)](https://github.com/zerviatr/NexusHub)

> **ZenDev** is an ultra-fast, privacy-first desktop engineering suite engineered for cybersecurity specialists, software engineers, and system architects. Combining over 25 native developer utilities into a single, high-performance binary, ZenDev operates 100% offline with zero external telemetry, hardware-bound credential encryption (Windows DPAPI / macOS Keychain), and mathematical tamper-evident cryptographic audit journaling.

---

## 🌟 Key Highlights & Architectural Features

- 🛡️ **Zero Telemetry & Local Execution**: All computations, hashings, shreddings, and decryptions execute locally on-device.
- ⚡ **Tray Memory Sweep & Background Sleep Engine**:
  - Automatically suspends CPU telemetry (`os.cpus()`) and auxiliary timers when minimized or hidden in the system tray.
  - Triggers V8 Garbage Collection and clears transient session memory caches, shrinking background RAM footprint to ~70–90 MB.
- 📜 **Tamper-Evident Activity Feed & Audit Journal**:
  - Continuous NIST FIPS 180-4 SHA-256 cryptographic hash chaining (`/activity-feed`).
  - Strict two-tier privacy sanitization (automatic redaction of PEM keys, JWTs, API tokens, and Luhn Mod-10 credit card PANs).
  - Crash-resilient append-only JSONL persistence with sliding-window retention pruning.
- 🚀 **Hardware-Accelerated Tool Arsenal**:
  - **ApiStudio**: Full-featured HTTP/REST workspace with cURL import/export, environments (`{{var}}`), and SSRF private IP shield.
  - **CyberFortress**: DoD 5220.22-M 7-pass file shredder, AES-256-GCM vault, and LSB image steganography engine.
  - **JwtStudio**: Offline JWT inspector, HMAC-SHA256 signature verifier, claim validator, and token expiration visualizer.
  - **ResourceSentinel**: Real-time per-core CPU and memory telemetry with one-touch RAM optimization.
  - **SqliteViewer**: In-browser WebAssembly SQL exploration (`sql.js`) with schema visualizer.
  - **BulkOrganizer**: Multi-rule, MIME-aware batch file classifier with atomic single-click undo journal.
  - **UniversalDecrypter**: Phishing URL defense, UTM parameter cleaner, and Punycode detector.
- 🔒 **Enterprise DMZ Security**: Strict `contextIsolation: true`, `sandbox: true`, disabled Node integration in renderer, and strict Content Security Policy.

---

## 🏗️ System Architecture

```
ZenDev (NexusHub)
├── src/
│   ├── main/                    # Electron Main Process (Node.js 22.14, Chromium 134)
│   │   ├── index.ts             # App lifecycle, Tray sleep/wake listeners, Memory sweep
│   │   ├── tray.ts              # System tray integration with RAM sweep & quick actions
│   │   ├── updater.ts           # Differential background auto-updater (electron-updater)
│   │   ├── licenseStore.ts      # DPAPI-encrypted offline license store & HWID binding
│   │   ├── ipc/                 # 18 Type-safe IPC channels (Net, SafeStorage, Sentinel, etc.)
│   │   └── services/            # Cryptographic journal service, file gateway, vault crypto
│   ├── preload/                 # Security DMZ Boundary
│   │   ├── index.ts             # Typed contextBridge exposing `window.nexusAPI`
│   │   └── index.d.ts           # Preload TypeScript interfaces
│   └── renderer/                # Sandboxed React 19 Frontend
│       ├── src/
│       │   ├── App.tsx          # Global routes, theme provider, and tray lifecycle bindings
│       │   ├── components/      # Reusable UI widgets, TitleBar, Command Palette (Ctrl+K)
│       │   ├── pages/           # 25+ Functional developer tool workstations
│       │   └── lib/             # IPC clients, audio engine (Web Audio API), i18n
├── server/                      # Independent Express 5 + LibSQL Cloud Licensing Service
├── docs/
│   └── archive/                 # Archived planning specifications and feasibility reports
├── scripts/
│   ├── archive-legacy-docs.mjs  # Automated doc archival and workspace sanitization utility
│   └── gen-icons.js             # High-resolution multi-format icon generation
└── tests/                       # 34 Automated Test Suites (629 unit, integration & stress tests)
```

---

## 🚀 Quick Start & Development

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **OS**: Windows 10/11 (x64), macOS (Intel/Apple Silicon), or Linux (x64)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/zerviatr/NexusHub.git
cd NexusHub
npm install
```

### 2. Run in Development Mode
Launch Vite HMR for renderer with hot Electron reloading:
```bash
npm run dev
```

### 3. Run Automated Tests
Execute the comprehensive Vitest test suite (629 automated tests covering IPC, cryptographic hash chaining, and security bounds):
```bash
npm run test
```

### 4. Archive Legacy Documentation
Sanitize workspace and archive obsolete root planning documents into `docs/archive/`:
```bash
npm run docs:archive
```

### 5. Build Distribution Packages
Compile the production bundles for your target platform:
```bash
# Current platform
npm run dist

# Windows NSIS Installer (x64)
npm run dist:win

# macOS DMG & Zip (Universal / Hardened Runtime)
npm run dist:mac

# Linux AppImage & DEB
npm run dist:linux
```

---

## 🧹 Memory Management & Tray Sweep Engine

ZenDev implements an intelligent background resource management lifecycle:
1. **Tray Sleep Mode**: When the user closes or minimizes the window to the system tray, Electron emits `app:visibility-change(false)` and `app:memory-sweep`.
2. **Interval Suspension**: Heavy intervals (e.g., ResourceSentinel's 1,500ms `os.cpus()` sampler and FloatingOrb's telemetry loops) immediately enter low-power sleep.
3. **V8 Garbage Collection & Cache Flush**: Electron triggers V8 GC and flushes non-essential WebContents session caches.
4. **Instant Wake**: Restoring or opening ZenDev from the system tray sends `app:visibility-change(true)`, instantly resuming live polling and fetching fresh hardware metrics without UI hitching.

---

## 🛡️ Security & Compliance

| Security Dimension | Implementation Standard |
|---|---|
| **Process Isolation** | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` |
| **Credential Storage** | Windows DPAPI / macOS Keychain via Electron `safeStorage` |
| **Outbound Requests** | SSRF Shield blocking loopback (`127.0.0.1`), LAN subnets, and cloud metadata (`169.254.169.254`) |
| **Audit Logs** | SHA-256 length-prefixed chained hashes with automatic PII / secret scrubbing |
| **Content Security Policy** | Dynamic CSP with strict self-origin boundaries and dev/prod separation |

---

## 📜 License

Copyright © 2026 Lee Boonstra. Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
