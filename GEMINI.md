# GEMINI.md — Gemini & Antigravity Agent Configuration

> **MANDATORY SYSTEM DIRECTIVE:** All Gemini CLI, Google Antigravity, and Gemini-powered agents operating in this workspace MUST enforce the **ZenDev SaaS Dönüşüm Direktifi** (`.agents/rules/zendev-saas-directive.md`). This directive overrides all generic suggestions and serves as the highest-priority architectural compass.

---

## 1. Role & Operating Context
- **Application:** ZenDev (NexusHub) — Enterprise Desktop Developer SaaS for API-driven software engineers and engineering teams.
- **Architecture:** Tauri v2 + Rust backend (`src-tauri/`) + React 19 + TypeScript + Vite (`src/renderer/`).
- **Standard Guidelines:** Strictly adhere to `.agents/rules/` and `.agents/memory/MEMORY.md`.

---

## 2. Binding SaaS Directives (The 5 Core Principles)

### 1. Ürün Konumlandırması (Product Positioning)
- ZenDev is NOT a Swiss-army knife or hobby OS utility.
- It is a **B2B/Pro Desktop Developer SaaS** consolidating scattered web tools (JSON, API/cURL, Regex, JWT, Cron, Mermaid, Encoding) into an offline-first, privacy-respecting client with team collaboration.
- Target audience: API developers and engineering teams. Revenue model: Seat-based subscription + PLG.

### 2. Kaldırılacak / Ayrıştırılacak Modüller (Deprecation & Decoupling)
- **Port Killer (Port Watchdog):** Deprecated and marked for removal. Killing system processes conflicts with SaaS identity and incurs heavy OS-level support debt.
- **System Optimizer:** Deprecated and marked for removal. DNS flushing and disk clearing do not belong in a developer SaaS product.
- **Sessiz Otonom Güncelleyici (Silent Updater):** BANNED. Subprocess execution without user knowledge (`CREATE_NO_WINDOW`) triggers AV/EDR malware heuristic alarms. Must be refactored into a transparent, user-approved update flow with changelog display.
- **Temp Mail:** Deprecated and marked for removal due to spam and abuse liability.
- **Clipboard Manager & Commoditized Tools:** Demoted from core marketing and roadmap.

### 3. Table Stakes SaaS Altyapısı (Table Stakes Infrastructure)
- **Cloud Sync:** End-to-end encrypted (E2EE) cross-device synchronization for workspaces, environments, collections, and custom snippets.
- **Team Auth & RBAC:** Multi-tenant workspaces, team invites, role-based access control, enterprise SSO (GitHub/Google/SAML).
- **Billing & Monetization:** Stripe and Paddle integration, tier management (Free, Pro, Team), customer billing portal, server-side licensing.
- **Privacy-First Observability:** Opt-in crash reporting and anonymous telemetry (Sentry / OpenTelemetry).

### 4. Diferansiyasyon (Differentiation Pillars)
- **Workflow Chains:** Interactive visual and scripted pipelines chaining studios (e.g. cURL → JSON extract → Base64 encode → HMAC sign → Webhook).
- **Team Collections:** Version-controlled, shareable team presets, API test collections, mock data schemas, and Mermaid architecture diagrams.
- **AI Smart Dispatcher:** Smart local heuristic/AI dispatcher that detects payload format and routes to the right studio with remediation recommendations.

### 5. Ödeme Testi (The Willingness-to-Pay Gate)
- Every feature request must answer: *"Would a developer or team pay a monthly/annual subscription for this, or can they solve it in 2 seconds on a free website or 1-line CLI command?"*
- Run every proposal through `.agents/skills/zendev-feature-gatekeeper/SKILL.md`. Default response is skeptical scrutiny.

---

## 3. Workflow & Verification Rules
- Always consult `YAPILACAKLAR.md` before planning or modifying roadmap tasks.
- Keep `tr.json` and `en.json` at 100% key parity.
- Run `python .agents/scripts/validate_kit.py` after any modification to `.agents/`.
