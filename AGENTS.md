# AGENTS.md

## Agent Instructions — Modular Implementation of UPI Offline Payment PWA

This file instructs Claude and other agentic systems/coders on how to iteratively scope, deliver, and customize the modular architecture for this open-source project.

***

### **AGENT PHASES \& CHECKLIST**

#### **PHASE 1: MVP Delivery**

- [ ] Set up Next.js PWA shell and basic routing/layout
- [ ] Integrate Supabase Auth for registration/login
- [ ] Implement wallet setup and IndexedDB offline queue
- [ ] Build NFC payment flow with offline transaction creation
- [ ] Enable QR fallback and merchant caching


#### **PHASE 2: Core Modules Expansion**

- [ ] Add merchant management, QR generator, and settlement dashboard
- [ ] Implement background transaction synchronization (service worker)
- [ ] Connect Upstash/Redis for session rate limiting and async jobs
- [ ] Add biometric authentication integration (WebAuthn)


#### **PHASE 3: Security \& Compliance**

- [ ] Strictly enforce NPCI transaction limits and wallet compliance
- [ ] Add security modules (device fingerprinting, fraud logic)
- [ ] Perform code and security reviews, optimize service boundaries
- [ ] Ensure encrypted data handling and secure token management


#### **PHASE 4: Modularity \& Customization**

- [ ] Refactor features into independent, pluggable modules/components
- [ ] Add feature flags and hooks for user-specific logic
- [ ] Document API endpoints, configuration, and setup
- [ ] QA modularity by switching modules on/off and substituting mock services

***

### **AGENTIC INSTRUCTIONS AND CONVENTIONS**

- Use blueprints and prior design analysis as ground-truth for data structures and flows.
- For every new module, annotate with comments referencing the functional/technical requirements and phase.
- Identify places for iterative agent-driven delivery (stepwise module addition, config updates, code refactors).
- When customizing for specific use cases, use the blueprint modularity sections as a reference.
- Deploy all code on free-tier services; validate compliance with their quotas and limits.
- Cross-validate implementation steps, ensuring security, performance, user experience, and privacy are prioritized.

***

### **CONTRIBUTION CONVENTIONS**

- All contributions and scripts should reference **AGENTS.md** and **CLAUDE.md** in PR descriptions.
- Any agentic automation tooling should ensure modularity and extensibility for personal or broader use cases.
- Subsequent refactors and enhancements should map to the defined project roadmap phases.
- Updates to the blueprint must be systematically reflected in these instruction files.

***

### **TESTING & REPORTING WORKFLOW**

1. **Preparation**
	- Run `npm install` and configure `.env.local` using `.env.local.example` before executing any suite.
	- Verify required hardware (NFC-capable device, QR-capable camera) is available for manual validation.

2. **Execution Order (no skipping):**
	1. `npm run type-check`
	2. `npm run lint`
	3. `npm run build`
	4. `npm run test:unit`
	5. `npm run test:integration`
	6. `npm run test:e2e`
	- Unit, integration, and e2e commands must be run individually. If the script does not exist yet, mark it as `TODO` in `docs/TESTING.md` and open an issue/PR to add the suite.

3. **Artifacts**
	- Redirect each CLI run to `docs/testing-artifacts/<YYYY-MM-DD>/<command>.log` (create directories as needed).
	- Store screenshots or videos from visual checks in the same folder with a short `README.txt` explaining the scenario.

4. **Reporting & Escalation**
	- After the matrix completes, add a dated section to `docs/TESTING.md` summarizing pass/fail results and linking to artifacts.
	- Any failure blocks further work until resolved; document remediation steps and retest.

5. **Audit Hooks**
	- Reference both this workflow and `CLAUDE.md` testing guidance in PR templates.
	- Keep artifacts for the whole phase to support regression analysis and future agent handoffs.

***

**End of agent instructions.**
Review and update this file with every major architectural or functional change, referencing the original system design for consistency and completeness.