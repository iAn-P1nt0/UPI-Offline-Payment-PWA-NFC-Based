# Testing Documentation

This document defines the validation workflow for the UPI Offline Payment PWA and records every executed test cycle with linked artifacts (logs, screenshots, screen recordings). All agents must follow the workflow before merging or releasing code.

---

## Test Execution Workflow

1. **Environment Prep**
   - Install dependencies with `npm install` and configure `.env.local`.
   - Ensure NFC-capable hardware or emulator plus QR-capable camera for visual checks.
2. **Command Matrix (run sequentially, no skipping)**
   1. `npm run type-check`
   2. `npm run lint`
   3. `npm run build`
   4. `npm run test:unit`
   5. `npm run test:integration`
   6. `npm run test:e2e`
   - Unit, integration, and e2e suites must be run independently even if a combined script exists.
3. **Artifact Capture**
   - Redirect each CLI command to `docs/testing-artifacts/<YYYY-MM-DD>/<command>.log` (example: `npm run type-check | tee docs/testing-artifacts/2025-11-15/type-check.log`).
   - Store visual proof (PNG/JPEG screenshots, optional MP4/GIF recordings) in the same dated folder. Include `README.txt` describing scenarios validated (e.g., homepage render, NFC tap simulation).
4. **Reporting**
   - Add a dated entry under "Test Runs" with pass/fail status, ticket references for failures, and links to artifacts.
   - Visual verifications must include a note referencing the screenshot filename.
5. **Escalation**
   - Any failed step blocks implementation. Document remediation plan, fix, rerun the full matrix, and update this file.

---

## Current Test Matrix

| Step | Command | Purpose | Artifact Path | Status |
| --- | --- | --- | --- | --- |
| 1 | `npm run type-check` | TS strict build | `docs/testing-artifacts/<date>/type-check.log` | Implemented |
| 2 | `npm run lint` | ESLint quality gate | `docs/testing-artifacts/<date>/lint.log` | Implemented |
| 3 | `npm run build` | Next.js production build | `docs/testing-artifacts/<date>/build.log` | Implemented |
| 4 | `npm run test:unit` | Unit suite (Vitest + jsdom) | `docs/testing-artifacts/<date>/test-unit.log` | Implemented |
| 5 | `npm run test:integration` | Integration suite (Vitest + React Testing Library) | `docs/testing-artifacts/<date>/test-integration.log` | Implemented |
| 6 | `npm run test:e2e` | End-to-end smoke (Playwright) | `docs/testing-artifacts/<date>/test-e2e.log` | Implemented |
| 7 | Visual checks | UI/UX confirmation | `docs/testing-artifacts/<date>/screenshots/` | Implemented |

> **Action items:** add the missing `npm run test:*` scripts in `package.json`, populate `__tests__/unit`, `__tests__/integration`, and `__tests__/e2e`, and backfill this table once suites are live.

---

## Test Runs

### Phase 1 – Feature 1: Project Scaffolding

- **Date:** 2025-11-15
- **Status:** ✅ PASSED (partial matrix: type-check, build, dev server, manual UI checks)
- **Artifacts:** `docs/testing-artifacts/2025-11-15/`

#### Validated Commands

1. **TypeScript Compilation** – `npm run type-check`
   - ✅ Passed; no errors.

2. **Build Process** – `npm run build`
   - ✅ Passed; see `build.log` for trace (compile in 829.8 ms).

3. **Development Server Smoke Test** – `npm run dev`
   - ✅ Passed; ready in 419 ms; verified via localhost + LAN.

4. **Homepage Rendering** – manual visual verification
   - ✅ Gradient background, CTA buttons, responsive breakpoints confirmed.

5. **PWA Configuration** – manual checks
   - ✅ `manifest.json`, head metadata, service worker config present.

6. **Dependencies & Structure Audit**
   - ✅ Dependencies installed (813 packages, 0 vulnerabilities).
   - ✅ Required directories present (`src/*`, `supabase/*`, `docs/*`, `__tests__/` placeholders).

#### Manual Testing Checklist

- Visual: layout, branding, buttons, typography, PWA metadata.
- Functionality: fast dev boot (<500 ms), hot reload, no console errors.
- Responsiveness: mobile/tablet/desktop breakpoints validated.

#### Known Issues / Follow-ups

1. **ESLint auto-fix workflow** – configuration exists but first lintable files pending. Impact: low.
2. **Testing scripts missing** – `npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and coverage commands referenced in README but not defined in `package.json`. Action: add scripts plus Jest/Playwright/Vitest setup.
3. **PWA icons & service worker activation** – directories exist but assets/service worker need completion before release.

#### Next Steps

- Implement Feature 2 (Supabase configuration, migrations, RLS, generated types).
- Add automated test suites and wire up the scripts listed above.
- Populate `docs/testing-artifacts/` with future runs (logs + screenshots) following the workflow table.

### 2025-11-15 – Automated regression matrix

- **Status:** ✅ PASSED (full matrix: type-check, lint, build, unit, integration, e2e)
- **Artifacts:** `docs/testing-artifacts/2025-11-15/`
- **Visual Proof:** `docs/testing-artifacts/2025-11-15/screenshots/homepage.png`

#### Command Results

1. `npm run type-check`
   - ✅ Clean compile per `type-check.log`.
2. `npm run lint`
   - ✅ ESLint flat-config passes; see `lint.log`.
3. `npm run build`
   - ✅ Next.js production build succeeded; trace in `build.log`.
4. `npm run test:unit`
   - ✅ Vitest suite (7 tests) green; reference `test-unit.log`.
5. `npm run test:integration`
   - ✅ Home page rendering assertions pass; see `test-integration.log`.
6. `npm run test:e2e`
   - ✅ Playwright smoke validated hero copy and CTA links; log stored in `test-e2e.log` with screenshot capture.

#### Notes

- Playwright config now injects default Supabase env variables so the dev server boots without `.env.local` during automation.
- E2E screenshot `homepage.png` captures the rendered hero block for regression auditing.

---

## Command Reference

```bash
# Development
npm run dev

# Required validation sequence
npm run type-check
npm run lint
npm run build
npm run test:unit
npm run test:integration
npm run test:e2e

# Code Quality
npm run format
npm run format:check
```

---

## Environment

- **Node.js:** v18.17+
- **Package Manager:** npm
- **OS:** macOS (Darwin 25.1.0)
- **Next.js:** 16.0.3 (Turbopack)
- **React:** 19.2.0
- **TypeScript:** 5.9.3
- **Tailwind CSS:** 4.1.17

---

**Test Conducted By:** Claude Code AI Assistant
**Project:** UPI Offline Payment PWA (NFC-Based)
**Phase:** 1 – MVP Foundations
**Feature:** 1 – Project Scaffolding
