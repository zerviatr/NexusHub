# CLAUDE.md — Claude Code & Anthropic Agent Configuration

> **BINDING ARCHITECTURAL DIRECTIVE:** All Claude Code and Anthropic assistants operating on this repository MUST strictly abide by the **ZenDev SaaS Dönüşüm Direktifi** (`.agents/rules/zendev-saas-directive.md`). This directive is the highest-level decision rule for all code modifications, refactoring, and feature additions.

---

## 1. System Architecture & Overview
- **Project:** ZenDev (NexusHub) — Enterprise Desktop Developer SaaS for API developers and software engineering teams.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS / custom design tokens (`src/renderer/`).
- **Backend:** Tauri v2, Rust (`src-tauri/`) with IPC bridge.
- **State & Sync Roadmap:** Offline-first client with upcoming End-to-End Encrypted (E2EE) Cloud Sync and Team Workspaces.

---

## 2. The 5 Non-Negotiable SaaS Principles

### 1. Positioning: Desktop Developer SaaS
- ZenDev is a focused developer productivity platform, NOT a generic Swiss-army knife or OS tweaker.
- Core focus: Developer studios (JSON, cURL, Regex, JWT, Cron, Mermaid, Encoding).
- Target audience: API-heavy developers and software engineering teams.

### 2. Modules to Remove / Decouple
- **Port Killer (Port Watchdog):** Deprecated. System process termination is out of scope for a developer SaaS and introduces platform instability.
- **System Optimizer:** Deprecated. DNS cache flushing and disk cleaning belong in OS maintenance utilities, not developer SaaS.
- **Silent Updater:** BANNED. Hidden background process execution (`CREATE_NO_WINDOW`) triggers AV/EDR malware heuristic alerts. Must be refactored into a transparent, user-approved update flow with changelog review.
- **Temp Mail:** Deprecated and slated for removal due to spam and legal risk.
- **Clipboard Manager & Commoditized Tools:** Excluded from core product roadmap and marketing.

### 3. Table Stakes SaaS Infrastructure
1. **Cloud Sync:** Secure, encrypted syncing of environments, collections, snippets, and settings.
2. **Team Auth & Workspaces:** Multi-tenant organization accounts, team invites, RBAC (Owner/Admin/Member/Viewer), enterprise SSO.
3. **Monetization & Billing:** Stripe/Paddle integration, subscription management (Free/Pro/Team), server-side license verification, seat controls.
4. **Privacy-Preserving Telemetry:** Opt-in crash reporting and error tracking (Sentry/OpenTelemetry).

### 4. Differentiation Pillars (Moat)
1. **Workflow Chains:** Studio-to-studio data pipeline execution (e.g. cURL → JSON extract → Base64 encode → HMAC sign → Webhook).
2. **Shareable Team Collections:** Team-wide versioned presets, API catalogs, mock data schemas, and Mermaid architecture diagrams.
3. **AI Smart Dispatcher:** Local context-aware heuristic/AI engine detecting input formats and routing to the right studio.

### 5. Willingness-to-Pay Gate (Feature Gatekeeper)
- Filter question: *"Would a developer or team pay a monthly/annual subscription for this, or can they solve it in 2 seconds on a free website or 1-line CLI command?"*
- Run any feature idea through `.agents/skills/zendev-feature-gatekeeper/SKILL.md`.

---

## 3. Development Guidelines
- Always verify roadmap priority against `YAPILACAKLAR.md`.
- Ensure zero compiler errors: `npm run build` and `cargo check` (in `src-tauri`).
- Keep 100% bilingual i18n coverage in `src/renderer/src/locales/tr.json` and `en.json`.
- Validate any `.agents/` changes with `python .agents/scripts/validate_kit.py`.
