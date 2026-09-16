# ZenDev Tauri Migration: E2E Test Infrastructure

**Document Version**: 1.0.0  
**Target Environment**: Tauri v2 / Rust Backend & React 18 Frontend  
**Authoritative Reference**: `ORIGINAL_REQUEST.md`, `PROJECT.md`  
**Test Harness & Runner**: Vitest 5.x (`npx vitest run tests/e2e`)  
**Test Classification**: Requirement-Driven Opaque-Box E2E Test Suite (Tiers 1–4)

---

## 1. Executive Summary & Quality Strategy

This document establishes the architecture, test methodology, and execution framework for the full-scale migration of the **ZenDev** multi-tool desktop application from Electron/Node.js to **Tauri v2 / Rust**.

### 1.1 Core Principles
1. **Requirement-Driven**: All test cases are derived strictly from user requirements in `ORIGINAL_REQUEST.md` and interface specifications in `PROJECT.md`, never from internal implementation quirks.
2. **Opaque-Box Testing**: Features and backend engines are exercised exactly as external clients and UI components experience them — via IPC contracts, binary layout invariants, protocol parsers, and system boundaries.
3. **4-Tier Progressive Test Methodology**:
   - **Tier 1 — Feature Coverage**: Comprehensive positive validation for each feature domain (minimum 5 tests per feature).
   - **Tier 2 — Boundary & Corner Cases**: Robust validation of edge conditions, malformed payloads, zero-length inputs, unauthorized attempts, and boundary limits (minimum 5 tests per feature).
   - **Tier 3 — Cross-Feature Combinations**: Pairwise and multi-module interaction suites verifying atomic handoffs between cryptographic, network, media, and system utilities.
   - **Tier 4 — Real-World Application Scenarios**: Multi-step realistic workflows mirroring enterprise user journeys (onboarding, sensitive data handling, threat triage, document bundling, media batch publishing).
4. **Self-Contained & Deterministic**: Each test generates its own isolated fixtures, uses temporary directories with automatic teardown, avoids order dependency, and enforces strict assertions.

---

## 2. Feature Inventory & Requirements Traceability Matrix

| Feature ID | Domain | Feature Description | Contract / Reference | Target Test File |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-01** | Tauri Skeleton & IPC | Vite config, package.json cleanup (no Electron), `window.nexusAPI` bridge, window management | `R1`, `PROJECT.md § Feature 1-7` | `tests/e2e/tauriSkeleton.e2e.test.ts` |
| **FEAT-02** | HWID & Licensing | Windows MachineGuid extraction, 2-stage SHA256+HMAC, backward compatible `node-machine-id` format, DPAPI SafeStorage, license check/activate | `R3`, `PROJECT.md § Feature 8-13` | `tests/e2e/hwidLicense.e2e.test.ts` |
| **FEAT-03** | Cyber Fortress | AES-256-GCM 51-byte header (`NEXUSV1`+salt+iv+tag), PBKDF2-SHA256 (100k rounds), DoD 5220.22-M 7-pass shredder, path guards | `R2`, `PROJECT.md § Feature 14-17` | `tests/e2e/cyberFortress.e2e.test.ts` |
| **FEAT-04** | Network Tools & API | Ping engine, TCP port scanner, process watchdog (safe termination & PID protection), SSL cert inspection, API Studio HTTP dispatcher, SSRF & CRLF guards | `R2`, `PROJECT.md § Feature 18-22` | `tests/e2e/networkTools.e2e.test.ts` |
| **FEAT-05** | Media Engines | PDF metadata inspection, document merge with object renumbering, page range split (`1-3, 5`), Lanczos3 image resize, aspect ratio preservation, format conversion, EXIF strip | `R2`, `PROJECT.md § Feature 23-27` | `tests/e2e/mediaEngines.e2e.test.ts` |
| **FEAT-06** | System Utilities | Bulk organizer categorization & undo, adaptive clipboard history (50 items/50KB), TempMail proxy, Link bypasser (15-hop redirect & tracker strip), Sentinel metrics, Activity journal blockchain | `PROJECT.md § Feature 28-34` | `tests/e2e/systemUtilities.e2e.test.ts` |
| **FEAT-07** | Cross-Feature Interaction | Pairwise multi-module operations (HWID+License+SafeStorage, Encrypt+Shred+Audit, Organizer+Shredder, DNS+SSRF+HTTP) | `PROJECT.md § Milestone M7` | `tests/e2e/tier3_crossFeature.e2e.test.ts` |
| **FEAT-08** | Real-World Workflows | Enterprise license provisioning, secure document lifecycle, network threat triage, document bundle publisher, media production pipeline | `ORIGINAL_REQUEST.md Acceptance Criteria` | `tests/e2e/tier4_scenarios.e2e.test.ts` |

---

## 3. Test Architecture & Harness Design

### 3.1 Test Directory Structure
```
tests/
├── e2e/
│   ├── helpers/
│   │   └── testHarness.ts         # Mock IPC bridge, crypto validators, temp dir manager
│   ├── tauriSkeleton.e2e.test.ts  # Tier 1 & 2: Skeleton, build & bridge verification
│   ├── hwidLicense.e2e.test.ts    # Tier 1 & 2: HWID derivation, HMAC, ECDSA, SafeStorage
│   ├── cyberFortress.e2e.test.ts  # Tier 1 & 2: 51B vault format, GCM, DoD 7-pass shredder
│   ├── networkTools.e2e.test.ts   # Tier 1 & 2: Ping, Port watchdog, SSL inspect, SSRF/CRLF
│   ├── mediaEngines.e2e.test.ts   # Tier 1 & 2: PDF merge/split, Lanczos3 resize, EXIF strip
│   ├── systemUtilities.e2e.test.ts# Tier 1 & 2: Organizer, Clipboard, TempMail, Journal
│   ├── tier3_crossFeature.e2e.test.ts # Tier 3: Pairwise cross-module combinations
│   └── tier4_scenarios.e2e.test.ts    # Tier 4: End-to-end real-world user workflows
```

### 3.2 Opaque-Box Bridge Adapter (`testHarness.ts`)
The test harness simulates and validates both sides of the contract:
- **Tauri IPC Bridge Contract**: Validates all 20 namespaces (`network`, `fortress`, `pdf`, `image`, `organizer`, `clipboard`, `tempMail`, `decrypter`, `port`, `sentinel`, `journal`, `license`, `safeStorage`, `system`, `settings`, `updater`, etc.).
- **Cryptographic Invariants**:
  - Vault header: 51 bytes = `NEXUSV1` (7B) + Salt (16B) + IV (12B) + AuthTag (16B).
  - Hardware ID: `HMAC-SHA256("nexus-device-salt", SHA256(normalized_guid))`.
  - Activity Journal: Monotonic sequence with length-prefixed SHA-256 blockchain hashing.
- **Filesystem Sandbox**: Every test run operates within an ephemeral temporary directory generated with `fs.mkdtemp` and purged in `afterEach`.

---

## 4. 4-Tier Test Breakdown

### Tier 1: Feature Coverage (Happy Path & Core Contract)
- **Tauri Skeleton**: Verifies absence of Electron in `package.json`, Vite configuration, and complete `window.nexusAPI` bridge presence.
- **HWID & Licensing**: Verifies Registry GUID normalization, double-hashing algorithm, and valid Pro/Lifetime license acceptance.
- **Cyber Fortress**: Validates AES-256-GCM encryption with 51-byte header, zero-byte restoration error, and 7-pass shredding.
- **Network Tools**: Tests Ping response format, TCP socket connectivity, process listing, SSL certificate parsing, and HTTP requests.
- **PDF & Image**: Tests PDF metadata extraction, document concatenation, page range parsing, Lanczos3 resizing, and format transcoding.
- **System Utilities**: Tests 8-category extension sorting, clipboard push/pop, TempMail session generation, redirect resolution, and audit chain creation.

### Tier 2: Boundary & Corner Cases (Defensive & Robustness)
- **Tauri Skeleton**: Bridge error handling on unregistered commands, empty payload handling, null window handles.
- **HWID & Licensing**: Whitespace/newline variants in registry output, missing machine ID fallback, expired licenses, tampered HMAC signature, mismatched hardware lock.
- **Cyber Fortress**: Corrupted authentication tag, incorrect passphrase rejection, Windows system path protection (`C:\Windows`), 0-byte file encryption, destination file collision renaming (`(1).ext`).
- **Network Tools**: SSRF link-local block (`169.254.169.254`), metadata domain block (`metadata.google.internal`), CRLF header injection rejection, PID 0 / PID 4 / negative PID kill guard.
- **PDF & Image**: Malformed page range strings (`-1, 999, foo`), empty PDF bytes, non-image buffers, 1x1 pixel image resize, quality bounds [1, 100].
- **System Utilities**: Organizer undo with missing source files, clipboard entry size cap (50KB), 15-hop redirect limit, corrupted activity journal tampering detection.

### Tier 3: Cross-Feature Combinations (Pairwise Interoperability)
- **HWID + License + SafeStorage**: Derives device ID -> Validates hardware-locked ECDSA license -> Encrypts license in SafeStorage -> Retrieves and re-verifies.
- **Cyber Fortress + Activity Journal**: Encrypts secret file -> Logs cryptographic action into journal -> Decrypts file -> Verifies journal blockchain integrity.
- **File Organizer + DoD Shredder**: Organizes mixed directory into categories -> Selects sensitive category -> Securely shreds files -> Re-scans to verify clean state.
- **Network Tools + API Studio + Link Bypasser**: Resolves DNS -> Validates destination URL with SSRF guards -> Dispatches request -> Sanitizes tracking parameters from response.
- **PDF + Image Processing Pipeline**: Processes raw images to standardized dimensions -> Prepares PDF document bundle -> Splits into target ranges -> Inspects generated artifacts.
- **Sentinel + Optimizer + Clipboard**: Polling system metrics -> Triggers memory sweep and temp file cleanup -> Verifies clipboard history integrity is maintained.

### Tier 4: Real-World Application Scenarios (End-to-End Workflows)
- **Scenario 1 — Enterprise Onboarding & License Activation**: Complete user first-run flow: hardware identification, activation key verification, secure credential storage, and startup bridge initialization.
- **Scenario 2 — Secure Data Lifecycle & Sanitization**: Secure intake of sensitive records, AES-256-GCM vault packaging, DoD 5220.22-M unrecoverable erasure of source plaintext, and tamper-evident audit trail verification.
- **Scenario 3 — Network Incident Response & Service Triage**: Identification of active listening ports, peer SSL certificate validation, authenticated API health probe dispatch, and security event journaling.
- **Scenario 4 — Corporate Document Assembly & Distribution**: Multi-document PDF intake, page range extraction, document merging with object renumbering, extension categorization, and archive packaging.
- **Scenario 5 — High-Volume Digital Asset Transcoding**: Ingestion of multi-format media files, EXIF metadata stripping, aspect-ratio preserved Lanczos3 downscaling, WebP transcoding, and batch report generation.

---

## 5. Runner Invocation & Verification Commands

### Primary E2E Test Runner
```bash
# Execute entire E2E test suite (Tiers 1-4)
npx vitest run tests/e2e

# Execute specific functional test suite
npx vitest run tests/e2e/tauriSkeleton.e2e.test.ts
npx vitest run tests/e2e/hwidLicense.e2e.test.ts
npx vitest run tests/e2e/cyberFortress.e2e.test.ts
npx vitest run tests/e2e/networkTools.e2e.test.ts
npx vitest run tests/e2e/mediaEngines.e2e.test.ts
npx vitest run tests/e2e/systemUtilities.e2e.test.ts
npx vitest run tests/e2e/tier3_crossFeature.e2e.test.ts
npx vitest run tests/e2e/tier4_scenarios.e2e.test.ts
```

---

## 6. Quality Gates & Acceptance Criteria

1. **100% Pass Rate**: Zero failing test cases across all 4 tiers.
2. **Zero Facade Tests**: Every test executes real cryptographic hashes, byte parsing, filesystem operations, and assertion logic.
3. **Strict License Header**: Every authored test file contains the official Apache 2.0 copyright header.
4. **Clean Code & Isolation**: All tests clean up temporary files in `afterEach`.
