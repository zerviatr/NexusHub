# AGENTS.md — ZenDev Multi-Agent System Directives

> **PRIMARY DIRECTIVE:** All AI agents, orchestrators, and autonomous coders operating within this repository MUST strictly follow the **ZenDev SaaS Dönüşüm Direktifi** (`.agents/rules/zendev-saas-directive.md`). This is a P0 non-negotiable directive that takes precedence over any generic assistant instincts.

---

## 1. Project Context & Identity
- **Product:** ZenDev (NexusHub) — Enterprise-grade Desktop Developer SaaS for API-heavy developers and software engineering teams.
- **Tech Stack:** Tauri v2, Rust backend (`src-tauri/`), React 19, TypeScript, Vite, Tailwind CSS / custom design tokens (`src/renderer/`).
- **Target Audience:** Backend/Frontend/Full-Stack API developers, microservice engineers, small-to-medium dev teams, DevOps.

---

## 2. The 5 Inviolable SaaS Principles

### Principle 1: Product Positioning (Desktop SaaS, NOT Swiss Army Toy)
- ZenDev is NOT a loose local toolkit or OS-tweaking utility.
- Core Value Proposition: *Consolidate scattered web tools (JSON, cURL, Regex, JWT, Cron, Mermaid, Encoding) into a single, lightning-fast, offline-first desktop application with seamless cloud sync and team collaboration.*
- Revenue Model: B2B/Team seat-based subscription + B2C PLG Pro tier.

### Principle 2: Deprecated & Decoupled Modules
- **System-Level Intrusions (MUST BE REMOVED):** `Port Killer (Port Watchdog)` (killing system processes) and `System Optimizer` (DNS flushing, %TEMP% cleanup).
- **Silent Autonomous Updater (MUST BE REFACTORED):** Silent background execution (`CREATE_NO_WINDOW`) is BANNED. Updates must follow a transparent, user-approved modal/dialog flow with changelog details to prevent AV/EDR malware heuristic false positives.
- **Abuse/Legal Risk (MUST BE REMOVED):** `Temp Mail` (disposable email generator).
- **Low-Differentiation OS Utilities (DEPRECATED):** `Clipboard Manager`, plain scratchpads (commoditized; must not be marketed or prioritized).

### Principle 3: Table Stakes SaaS Infrastructure (High Priority)
1. **Cloud Sync:** End-to-end encrypted (E2EE) cross-device sync for environments, API collections, regex patterns, and snippets.
2. **Team Auth & Workspaces:** Multi-tenant workspaces, team member invitations, RBAC (Owner/Admin/Member/Viewer), enterprise SSO.
3. **Monetization & Billing:** Stripe & Paddle integration, Free/Pro/Team tiers, billing portal, server-side licensing and seat management.
4. **Transparent Telemetry:** Opt-in, privacy-preserving error tracking and usage analytics (Sentry/OpenTelemetry).

### Principle 4: Differentiation Moat (B2B Expansion Drivers)
1. **Workflow Chains:** Visual or scripted pipeline chaining developer studios together (e.g. cURL → JSON extract → Base64 encode → HMAC sign → Webhook).
2. **Shareable Team Collections:** Version-controlled team presets, mock templates, API catalogs, regex rulesets, and Mermaid architecture diagrams.
3. **AI Smart Dispatcher:** Privacy-first contextual analyzer that detects clipboard/input data types and routes to the right studio with instant remediation actions.

### Principle 5: The Willingness-to-Pay Gate (Feature Gatekeeper)
- Before proposing or implementing any feature, ask:
  *"Would a developer or team pay a monthly/annual subscription for this, or can they solve it in 2 seconds on a free website or 1-line CLI command?"*
- If a free alternative suffices: REJECT or demote to background bonus module.
- All proposals must pass the 5-filter evaluation in `.agents/skills/zendev-feature-gatekeeper/SKILL.md`.

---

## 3. Agent Execution Protocol
1. Consult `.agents/rules/zendev-saas-directive.md` and `.agents/memory/MEMORY.md` at session start.
2. Align all roadmap items and feature proposals with `YAPILACAKLAR.md`.
3. Never introduce features from the permanent blacklist.
4. Maintain bilingual i18n parity (`tr.json` and `en.json`) and 100% type safety across Rust and TypeScript.
