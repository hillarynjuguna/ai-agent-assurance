# Agent Trust Readiness Diagnostic

**Positioning:** Find out whether your agentic AI workflow is safe enough for payment processors, investors, insurers, clients, or regulators to trust.

The **Agent Trust Readiness Diagnostic** is an institutional pre-diligence assessment system designed for high-stakes agentic AI operations. It evaluates 10 core governance dimensions, from audit provenance and reversibility to blast-radius containment, and synthesizes scores into clear counterparty trust gate readiness levels.

---

## Current MVP Capabilities (Phase 2 Release)

- **Interactive Diagnostic Surface (`/`)**: 10 reframed counterparty objection questions with real-time capability (0-3) and assurance (0-4) scoring.
- **Dynamic Diligence Matrix & Trust Gates**: Automatic calculation of external reliance posture across 5 counterparty gates: Payment Processors, Investors, Insurers, Enterprise Clients, and Regulators.
- **Polished Free Preview & Locked Vault (`/report/[reportId]`)**: Free summaries reveal capability/assurance scores, reliance verdict, and top 3 priority gaps, while gating full evidence checklists, remediation plans, and audit questions behind Gumroad checkout buttons.
- **Low-Friction Gumroad Surface**: Direct link helpers (`src/lib/payments/gumroad.ts`) redirecting users to Gumroad checkout products or routing to `/purchase` when env vars are unconfigured.
- **Public Evaluator API (`POST /api/diagnostics/evaluate`)**: Programmatic endpoint returning schema version `0.1.0` diligence matrices, priority gaps, evidence requirements, and counterparty readiness summaries.

---

## Product Architecture & Low-Friction Fulfillment

- **Fulfillment Mode:** Gumroad Low-Friction MVP (Manual Early-Access Fulfillment).
- **Payment Layer:** Payments are processed securely via external Gumroad product links (`NEXT_PUBLIC_GUMROAD_REPORT_URL` & `NEXT_PUBLIC_GUMROAD_EXPERT_URL`).
- **Data Persistence:** Local development MVP relies on file-based JSON storage (`.data/reports/`) and memory caching.

---

## Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_GUMROAD_REPORT_URL="https://yourname.gumroad.com/l/trust-report"
NEXT_PUBLIC_GUMROAD_EXPERT_URL="https://yourname.gumroad.com/l/expert-trust-review"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Application Routes

- `/`: Diagnostic input form, real-time matrix, and counterparty trust gates.
- `/report/[reportId]`: Pre-diligence report preview (free vs locked paid sections).
- `/purchase`: Customer-facing early access purchase & manual fulfillment setup page.
- `/access`: Customer license key entry page (Phase 3 API hook).

---

## API Endpoints

- `POST /api/diagnostics/evaluate`: Programmatic diagnostic evaluation endpoint.
- `POST /api/create-checkout-session`: Server-side score evaluation & report record creation.
- `GET /api/reports/[reportId]`: JSON endpoint to retrieve stored report records.
- `POST /api/stripe-webhook`: Dormant Stripe webhook listener for future phase.

See [`docs/api-contract.md`](docs/api-contract.md) for full cURL examples and JSON response contracts.

---

## Documentation

- [`docs/product-roadmap.md`](docs/product-roadmap.md): Complete Phase 1-6 product roadmap.
- [`docs/gumroad-setup.md`](docs/gumroad-setup.md): Step-by-step Gumroad product configuration.
- [`docs/api-contract.md`](docs/api-contract.md): API contract specification and code examples.
- [`docs/local-qa-checklist.md`](docs/local-qa-checklist.md): Manual QA checklist for release validation.

---

## Product Disclaimers & Known Limitations

- **Pre-Diligence Aid:** Results represent self-assessed pre-diligence evaluations and do not constitute formal legal, regulatory, cyber insurance, or payment processor approval advice.
- **Local Storage:** Storage is currently file-based (`.data/reports/`). Swap `src/lib/reports/store.ts` for Supabase/PostgreSQL prior to serverless deployment.

