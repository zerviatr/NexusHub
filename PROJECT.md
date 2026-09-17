# Project: ZenDev SaaS & Desktop Elevation

## Architecture
ZenDev is a developer productivity platform built with a high-performance Tauri v2 + Rust backend, React 19 + TypeScript + Tailwind CSS frontend, and an independent React 19 + Tailwind v4 + Vite marketing and web application (`website/`).

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    ZenDev Platform                          │
├──────────────────────────────┬──────────────────────────────┤
│    SaaS Landing Website      │      Desktop Application     │
│         (website/)           │   (src/renderer/ + src-tauri)│
│  - React 19 + Tailwind v4    │  - React 19 + TypeScript     │
│  - Animated Benchmark Cards  │  - 27 Core Developer Tools   │
│  - Direct Release Downloads  │  - Activity Journal w/ Chain │
│  - Interactive Playground    │  - Network Recon & API Labs  │
│  - SaaS Pricing & Checkout   │  - Tauri v2 Rust Backend     │
└──────────────────────────────┴──────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Benchmark Cards | Animated Tauri v2 performance cards (4.6 MB installer, <26 MB RAM, 0.35s boot) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Direct Release Wiring | Wire navbar and hero CTA buttons to v2.4.3 setup exe with fallback | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Web Playground | Live trial widgets (Regex, Hash, QR, two-way Base64 encoder) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | SaaS Pricing Matrix | Free, Pro, Team tiers, comparison matrix, simulated checkout modal with confetti | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Activity Journal Upgrades | Filter presets, CSV/JSON direct export, cryptographic integrity badge | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Port Watchdog (Purged) | Purged in v2.5.3 per SaaS Directive Principle 2 (OS process kill decoupled) | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Cyber SFX & Polish | Refined tactile audio profiles and 60 FPS animation smoothness | M2 | ORIGINAL_REQUEST §R2 |
| 8 | JWT Studio | Header/payload decode, HMAC-SHA256 verify, expiry timeline, generator | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Cron Studio | Visual 5-field builder, TR/EN explanations, next 10 executions schedule | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Mermaid Studio | Real-time diagram visualizer (flowchart, sequence, ERD), SVG/PNG export | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Encoding Studio | Base64/Hex/URL converter, Data-URL media visualizer, 16-byte hex dump | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Bilingual i18n Parity | 100% parity between tr.json and en.json for all new tools and features | M4 | ORIGINAL_REQUEST §R4 |
| 13 | Desktop Navigation Wiring | Wire routes in App.tsx, Sidebar.tsx, Dashboard.tsx, CommandPalette | M4 | ORIGINAL_REQUEST §R3 |
| 14 | E2E & Unit Test Suites | Vitest unit/integration tests for all 4 new tools and elevation features | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 15 | Subprocess Invocations Audit | Static audit of all 20 process creation sites across 6 modules | M6 | ORIGINAL_REQUEST §R1 |
| 16 | Centralized Silent Command Module | Implement `src-tauri/src/process_ext.rs` with `CREATE_NO_WINDOW` (0x08000000), `SilentCommand` trait, and constructors | M6 | ORIGINAL_REQUEST §R2 |
| 17 | Call-Site Subprocess Refactor | Refactor all 20 process call sites across 6 modules to use silent execution pattern | M6 | ORIGINAL_REQUEST §R2, §R3 |
| 18 | Automated Static Analysis & Gate Verification | Rust lint test `silent_command_lint_test.rs`, Vitest parity, `.cargo/config.toml`, `cargo check/test`, `npm test` (46 files, 691 tests), `npm run build` | M7 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Website Modernization | `website/`: Benchmarks, release link, Base64 demo, pricing matrix & checkout | none | DONE |
| M2 | Desktop UX Elevation | `ActivityFeed`, audio SFX polish, i18n string replacement | none | DONE |
| M3 | Four New Developer Utilities | `JwtStudio`, `CronStudio`, `MermaidStudio`, `EncodingStudio` page & engine files | none | DONE |
| M4 | Desktop Navigation & i18n | `App.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, `tr.json`, `en.json`, `package.json` | M2, M3 | DONE |
| M5 | Comprehensive Verification | `tests/`: 554+ tests + new test suites, `cargo check`, build passes | M1, M2, M3, M4 | DONE |
| M6 | Silent Command Module & Call-Site Migration | `process_ext.rs`, `lib.rs`, `network.rs`, `hwid.rs`, `updater.rs` (`port_watchdog.rs` & `optimizer.rs` purged in v2.5.3) | M5 | DONE |
| M7 | Automated Static Analysis & Full Suite Gate | `silent_command_lint_test.rs`, `.cargo/config.toml`, `tests/websiteM1.challenge.test.ts`, `cargo check`, `cargo test`, `npm test`, `npm run build` | M6 | DONE |

## Interface Contracts
### Web Playground Contract (`website/src/components/LivePlayground/`)
- `LiveBase64Demo.tsx`:
  - Inputs: Raw Text or Base64 String
  - Actions: Encode (UTF-8 safe via `TextEncoder`), Decode (UTF-8 safe via `TextDecoder`)
  - Error Handling: Graceful visual error for malformed Base64, no uncaught exceptions

### Activity Journal Contract (`src/renderer/src/components/activity-feed/`)
- Filter Presets: `all`, `security`, `crypto`, `network`, `system`, `failures`, `today`
- Export Shortcuts: Instant trigger for CSV and JSON format downloads
- Integrity Badge: Cryptographic chain validation status indicator (Clean chained hash / Genesis / Tamper alert)

### Port Watchdog Contract (Purged in v2.5.3)
- Deprecated & Purged: Decoupled in v2.5.3 per SaaS Transformation Directive Principle 2 (OS process manipulation and support debt eliminated).

### Developer Utilities Contracts (`src/renderer/src/pages/`)
1. `JwtStudio.tsx`:
   - State: `token: string`, `secret: string`, `algorithm: 'HS256' | 'none'`, `headerJson: string`, `payloadJson: string`
   - Verification: Native `window.crypto.subtle` HMAC-SHA256
   - Expiry Timeline: Calculates delta from current timestamp `Date.now() / 1000` to `exp` claim
2. `CronStudio.tsx`:
   - 5 Fields: Minute (0-59), Hour (0-23), Day of Month (1-31), Month (1-12), Day of Week (0-6)
   - Calculations: Pure TS next 10 execution dates, human-readable explanations in Turkish and English
3. `MermaidStudio.tsx`:
   - Renders Mermaid code to SVG using `mermaid: ^11.4.1`
   - Export: Copy SVG, Copy PNG (rendered through HTML5 Canvas)
4. `EncodingStudio.tsx`:
   - Tabs: `Text Convert` (UTF-8, Base64, Hex, URL), `Data URL Viewer` (Image, Audio, Video, PDF render), `Hex Dump` (16-byte offset, hex codes, ASCII)

### i18n Localization Contract (`src/renderer/src/locales/`)
- `tr.json` and `en.json` must maintain strict 1:1 key parity at all times.
- Required namespaces: `activityJournal`, `jwtStudio`, `cronStudio`, `mermaidStudio`, `encodingStudio`, `nav.tools.*`.

### Silent Command Subprocess Contract (`src-tauri/src/process_ext.rs`)
- Win32 Process Creation Flag: `pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;`
- Extension Trait: `pub trait SilentCommand { fn silent(&mut self) -> &mut Self; }`
- Constructors:
  - `pub fn silent_command<S: AsRef<OsStr>>(program: S) -> std::process::Command` (aliases: `std_command`)
  - `pub fn silent_async_command<S: AsRef<OsStr>>(program: S) -> tokio::process::Command` (aliases: `tokio_command`)
- Cross-platform Semantics:
  - On Windows: Conditionally attaches `creation_flags(0x0800_0000)` to eliminate console window flashes.
  - On non-Windows: Compiles as a zero-cost inlined no-op without warnings or allocations.
  - Standard I/O (stdout, stderr, exit code, pipes, tokio streams) functions completely identically.

## Code Layout
- `src-tauri/src/`:
  - `process_ext.rs` (centralized silent command builder and extension trait)
  - `lib.rs` (module export and URL launcher)
  - `network.rs` (async commands: ping.exe, nslookup)
  - `hwid.rs` (fallback registry query: REG.exe)
  - `updater.rs` (installer execution: cmd.exe)
- `src-tauri/tests/`:
  - `silent_command_lint_test.rs` (Rust automated static analysis test enforcing CREATE_NO_WINDOW)
- `src-tauri/.cargo/`:
  - `config.toml` (target configuration for clean test execution)
- `tests/`:
  - `silentCommand.test.ts` (Vitest companion static analysis test)
- `website/src/components/`:
  - `ArchitectureRadar.tsx` (animated benchmark cards)
  - `Navbar.tsx` (direct download button)
  - `HeroSection.tsx` (direct download button)
  - `PricingSection.tsx`, `PricingMatrix.tsx`, `SimulatedCheckoutModal.tsx`
  - `LivePlayground/LiveBase64Demo.tsx`
- `src/renderer/src/components/activity-feed/`:
  - `ActivityFilterToolbar.tsx`, `ActivityFeedHeader.tsx`, `IntegrityBanner.tsx`
- `src/renderer/src/pages/`:
  - `JwtStudio.tsx`
  - `CronStudio.tsx`
  - `MermaidStudio.tsx`
  - `EncodingStudio.tsx`
  - `Dashboard.tsx`
- `src/renderer/src/lib/`:
  - `jwtEngine.ts`, `cronEngine.ts`, `encodingEngine.ts`
- `src/renderer/src/locales/`:
  - `tr.json`, `en.json`
- `tests/`:
  - `jwtStudio.test.ts`, `cronStudio.test.ts`, `mermaidStudio.test.ts`, `encodingStudio.test.ts`, `desktopElevation.test.ts`, `i18nParityElevation.test.ts`
