# Agent Trust Readiness Diagnostic - Product Roadmap

## Overview
The Agent Trust Readiness Diagnostic evaluates whether agentic AI workflows satisfy counterparty due diligence requirements across payment processors, investors, insurers, enterprise clients, and regulators.

---

## Roadmap Phases

### Phase 1: Current Local & Preview MVP (Active)
- State-driven diagnostic UI (`src/app/page.tsx`) with 10 reframed counterparty dimensions.
- Server-side scoring engine and dynamic trust gate calculation (Payment Processor, Investor, Insurer, Enterprise Client, Regulator).
- Diagnostic Report Storage Abstraction (`src/lib/reports/store.ts`) with filesystem and in-memory persistence (`.data/reports/`).
- Polished free preview page (`/report/[reportId]`) showing capability/assurance scores, reliance verdict, trust gates, and top 3 priority gaps, with gated previews for full evidence and remediation plans.
- Public Evaluator API endpoint (`POST /api/diagnostics/evaluate`).

### Phase 2: Gumroad Low-Friction Launch & Manual Fulfillment (Immediate Next)
- Direct CTA integration with Gumroad checkout links (`NEXT_PUBLIC_GUMROAD_REPORT_URL` & `NEXT_PUBLIC_GUMROAD_EXPERT_URL`).
- Local fallback `/purchase` setup route for early testers and unconfigured environments.
- Manual delivery of full compliance vaults and expert architecture review sessions upon purchase notification.

### Phase 3: License Key Verification & Self-Service Unlock
- Integration with Gumroad License Verification API (`api.gumroad.com/v2/licenses/verify`).
- Activation flow on `/access` page allowing buyers to enter their license key to dynamically unlock paid report features.

### Phase 4: Database Persistence & Storage Upgrade
- Swap local filesystem store (`src/lib/reports/store.ts`) for Supabase / PostgreSQL.
- Enable multi-region serverless deployment on Vercel without ephemeral storage loss.

### Phase 5: Automated PDF Generation & Vault Export
- Server-side PDF rendering engine (using `@react-pdf/renderer` or Puppeteer).
- Downloadable exportable PDF compliance packets formatted for data rooms and procurement review.

### Phase 6: Enterprise Paid API & Continuous Audit Monitoring
- Monetized API access for automated continuous diagnostic evaluation during CI/CD deployment pipelines.
- Webhook alerts when model deployment drifts degrade counterparty trust gate readiness.
