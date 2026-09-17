# Changelog

All notable changes to the **ZenDev (NexusHub)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.5.3] - 2026-09-17

### Changed
- **Release Synchronization**:
  - Bumped version to `2.5.3` across all 9 manifest and lockfile targets: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `website/package.json`, `website/package-lock.json`, `.github/workflows/release.yml`, and `website/src/lib/downloadHelper.ts`.
  - Synchronized download helper endpoints for Windows NSIS Setup (`ZenDev-Setup-2.5.3.exe`) and Portable binaries (`ZenDev-Portable-2.5.3.exe`).
  - Updated all marketing web application components, FAQ entries, hero benchmarks, and demo states to v2.5.3.
  - Aligned repository regression and challenge test suites (`tests/nsisSilentUpdate.test.ts`, `tests/websiteM1.challenge.test.ts`) to assert `2.5.3`.

## [2.4.2] - 2026-09-15

### Added
- **Tray Memory Sweep & Background Sleep Engine**:
  - Implemented dedicated `performMemorySweep` in `src/main/services/memorySweep.ts` to trigger V8 garbage collection and purge transient session caches upon hiding or minimizing to tray.
  - Enabled `--expose-gc` V8 flag in `src/main/index.ts` to unlock real V8 compaction during memory sweep calls.
  - Added `app:visibility-change` and `app:memory-sweep` lifecycle events hooked to `mainWindow.on('hide')`, `mainWindow.on('show')`, `mainWindow.on('minimize')`, and `mainWindow.on('restore')`.
  - Added on-demand `🧹 Belleği Temizle (RAM Sweep)` action to the system tray context menu (`src/main/tray.ts`) calling the unified memory sweep service.
  - Added typed DMZ bridge methods in `src/preload/index.ts`: `onVisibilityChange`, `onMemorySweep`, and `memorySweep`.
  - Exposed lifecycle event listeners in `src/renderer/src/App.tsx` dispatching custom window events (`nexus:app-visibility` and `nexus:app-memory-sweep`).
  - Added dedicated test suites `tests/memorySweep.test.ts` (9 tests) and `tests/archiveLegacyDocs.test.ts` (4 tests) raising verified test coverage to 629 passed tests.
- **Automated Documentation Archival Utility**:
  - Added standalone archival script `scripts/archive-legacy-docs.mjs` supporting custom directory targeting and idempotent safe replacement.
  - Added npm script `"docs:archive": "node scripts/archive-legacy-docs.mjs"` to `package.json`.
  - Created centralized archive directory `docs/archive/` to house legacy specifications and feasibility reports.
- **Root Project Documentation**:
  - Authored comprehensive root `README.md` detailing architecture, security model, tool capabilities, and development workflows.

### Changed
- **ResourceSentinel Optimization**:
  - Paused 1,500ms `os.cpus()` polling loop in `ResourceSentinel.tsx` when the application is minimized or hidden in the system tray, eliminating background CPU spikes.
  - Auto-resumes live telemetry immediately upon window restore or focus.
- **TempMail Optimization**:
  - Paused 5,000ms inbox polling loop in `TempMail.tsx` while minimized or hidden in tray.
  - Automatically polls for new messages on window wake.
- **FloatingOrb Optimization**:
  - Paused telemetry polling completely in `FloatingOrb.tsx` during background tray states using both DOM visibility and `nexus:app-visibility` events.
- **ClipboardManager Optimization**:
  - Paused 2,000ms history refresh loop in `ClipboardManager.tsx` while minimized or hidden in tray, automatically syncing on restore.
- **Build Infrastructure**:
  - Configured `tsconfig.web.json` to emit buildinfo directly into `node_modules/.cache/` preventing root directory pollution.

### Removed
- **Workspace Sanitization**:
  - Archived 9 obsolete root planning markdown files to `docs/archive/` (`YAPILACAKLAR.md`, `ZenDev - Ticari Fizibilite ve Monetizasyon Raporu.md`, `ZenDev_BugFix_ve_Kusursuzlastirma_Plani.md`, `ZenDev_Devasa_BugFix_Master_Plani.md`, `ZenDev_Devasa_Masterplan.md`, `ZenDev_Durum_ve_Eksikler_Raporu.md`, `ZenDev_Publish_Raporu.md`, `ZenDev_Uygulama_Kusursuzlastirma_Plani.md`, `ZenDev_Web_Kusursuzlastirma_Plani.md`).
  - Purged obsolete build artifact `tsconfig.web.tsbuildinfo`.
  - Removed stale backup directory `.ag-kit-backups/`.

---

## [2.4.1] - 2026-09-10

### Fixed
- Fixed BulkOrganizer state initialization when switching directories.
- Added HashStudio OOM guard to prevent hashing files > 200 MB in renderer memory.
- Fixed Account page theme reloader synchronization.
- Fixed TitleBar maximize state toggle on Windows frameless display.
- Hardened auto-updater differential update provider endpoints.

---

## [2.4.0] - 2026-09-01

### Added
- **Unified Cross-Tool Activity Feed & Cryptographic Audit Journal** (`/activity-feed`):
  - NIST FIPS 180-4 SHA-256 hash chaining for tamper-evident activity logging.
  - Two-tier privacy sanitization engine stripping API keys, JWTs, OAuth tokens, and credit card PANs.
  - Crash-resilient append-only JSONL storage with sliding-window retention pruning (>5,000 entries).
  - React 19 workstation UI with live stream controls, multi-filter toolbar, and JSON/CSV export.
- **ApiStudio**: Full-featured HTTP/REST workspace with cURL import/export and SSRF private IP shield.
- **CyberFortress**: DoD 5220.22-M 7-pass file shredder, AES-256-GCM vault, and LSB image steganography.
