# Local QA Checklist

Use this manual QA checklist to verify product readiness prior to tagging releases or running client demonstrations.

---

## Manual Verification Vector Checklist

- [ ] **1. Homepage Load & Hero Hook**
  - Open `http://localhost:3000/`.
  - Confirm headline reads: *"Can Your AI Agent Workflow Survive Outside Scrutiny?"*
  - Verify pill toggles for audience, actions, and risk levels are interactive and keyboard selectable (using Enter/Space).

- [ ] **2. Interactive Matrix & Score Engine**
  - Adjust Capability and Assurance dropdowns for D1 to D10.
  - Verify Capability % and Assurance % update dynamically.
  - Confirm Trust Gate badges update status (`READY`, `AT RISK`, `HIGH RISK`, `WEAK`, `CONDITIONAL`, `EVIDENCE GAP`).

- [ ] **3. Report Record Creation**
  - Click "Unlock Full Report on Gumroad" or "Request Expert Review on Gumroad".
  - Confirm a report payload is saved and generated with ID format `rep_xxxxxxxxxxxxxxxx`.

- [ ] **4. Unpaid / Mock Report Preview (`/report/[reportId]`)**
  - Confirm page renders headline: *"Trust Readiness Assessment Report"*.
  - Verify scores and reliance verdict match the input state.
  - Verify **only top 3 priority gaps** are shown under "Top Priority Gaps (Free Preview)".
  - Confirm notice shows remaining locked gaps (e.g. "+ 15 additional priority gaps locked in Full Report").

- [ ] **5. Visually Gated Content Vault**
  - Confirm the lock banner *"🔒 Full Governance & Evidence Vault Gated"* is clearly visible on unpaid reports.
  - Confirm full evidence checklists, remediation plans, and counterparty DDQs are blurred/gated.

- [ ] **6. Gumroad Fallback Handling**
  - Unset `NEXT_PUBLIC_GUMROAD_REPORT_URL` in `.env.local`.
  - Click "Unlock Full Report on Gumroad".
  - Confirm user is gracefully redirected to `/purchase?reportId=rep_xxx&type=readiness-report`.

- [ ] **7. Honest Access & License Verification (`/access`)**
  - Open `/access`.
  - Enter email and license key, click "Verify Access".
  - Confirm status banner explicitly states automated license verification is not connected yet and manual fulfillment applies (no faked success!).

- [ ] **8. Public Evaluator API (`POST /api/diagnostics/evaluate`)**
  - Send POST request with sample payload.
  - Verify response JSON contains `schemaVersion: "0.1.0"`, `diligenceMatrix`, `trustGates`, `evidenceChecklist`, `remediationPlan`, and `counterpartyReadinessSummary`.

- [ ] **9. Legal & Pre-Diligence Disclaimers**
  - Scroll to bottom of `/report/[reportId]`.
  - Confirm Legal Disclaimer is visible: *"This diagnostic tool is designed as a pre-diligence governance evaluation aid..."*

- [ ] **10. Mobile Responsiveness**
  - Resize browser viewport to 375px width (mobile size).
  - Verify layout collapses cleanly to single-column without horizontal scrolling or text overflow.
