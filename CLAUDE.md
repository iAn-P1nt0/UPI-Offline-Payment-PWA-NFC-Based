# CLAUDE.md

## Claude Code CLI Project Guide — UPI Offline Payment PWA (NFC-based)

This document provides instructions and context for **Claude Code CLI** or any Claude-powered agent in VSCode Insiders to phasewise implement the system for an open-source UPI Offline Payment PWA leveraging free-tier cloud services, professional-grade security, robust performance, and iterative modular architecture as described in the referenced blueprint (see last system design response).

***

### 1. Project Vision \& Context

- **Goal:** Deliver an offline-first, privacy-centric Progressive Web App for secure, compliant UPI payments via NFC and QR fallback.
- **Deployment:** Use free cloud services (Vercel, Supabase, Upstash, Cloudflare) for hosting and scalable API/data layers.
- **Blueprint Reference:** Always refer to the detailed blueprint and architecture provided in the previous system design response to Claude.
- **Phasewise Implementation:** Break down delivery into clear, incremental milestones as defined in the roadmap and functional requirements.

***

### 2. Phasewise Implementation Instructions

**Phase 1 — MVP Foundations**

- Implement user authentication via Supabase Auth.
- Build wallet setup, UPI ID linking, and mobile onboarding flows.
- Develop PWA shell with core dashboard, local IndexedDB storage, and service workers for offline readiness.
- Implement offline transaction queue and basic NFC payment flow using Web NFC APIs.
- Enable QR code fallback and local merchant caching.
- Deploy on Vercel; set up environment variables and connect Supabase DB/storage.

**Phase 2 — Advanced Features**

- Add merchant mode, NFC tag programming, and QR code display.
- Enhance sync logic (Background Sync API), analytics dashboard, transaction history, and receipts.
- Integrate biometric authentication (WebAuthn) and device fingerprinting.
- Implement transaction limits and wallet compliance as per NPCI UPI Lite rules.

**Phase 3 — Extended Capabilities \& Security**

- Add multi-device sync, backup, and restore flows.
- Build fraud/anomaly detection logic and emergency wallet freeze.
- Implement merchant settlement reporting and batch offline-to-online settlement.
- Expand API and DB schemas as needed, with automated testing and security audits.

**Phase 4 — Modular Customization \& Optimization**

- Refactor for modular plugin architecture: separate wallet, NFC, QR, sync, analytics, merchant, and security into independent modules/components.
- Add hooks for custom logic and user-specific use cases.
- Document configuration variables, globally accessible contexts, and recommended best practices.

***

### 3. Claude-Specific Instructions

- **Always reference CLAUDE.md and blueprint analysis before code changes.**
- Validate chosen architecture and service/config with the blueprint for every implementation step.
- Use double/triple-checks on security, compliance rules, and modular boundaries per section.
- Refer to AGENTS.md for custom tasks, iterative agent-driven implementation, and modular breakdown.

***

### 4. Code Quality \& Best Practices

- Adhere to provided DB schema, API shape, and security checks.
- Ensure automated testing for every milestone.
- Use atomic, well-documented PRs aligned with architectural phases.
- Perform performance and security audits regularly.
- Document code extensively for each module, with references to the corresponding blueprint sections.

***
