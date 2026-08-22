# API Contract Specification

This document details the public and internal API endpoints for the **Agent Trust Readiness Diagnostic** system.

---

## Endpoints

### 1. Evaluator API
- **Endpoint:** `POST /api/diagnostics/evaluate`
- **Description:** Evaluates raw dimension scores and metadata, returning counterparty trust gate calculations, priority gaps, evidence checklists, and remediation plans.
- **Request Body:**
```json
{
  "metadata": {
    "criticality": "Financial",
    "operationAssessed": "Automated Treasury Agent"
  },
  "dimensions": {
    "1": { "cap": 1, "evid": 0, "na": false },
    "2": { "cap": 3, "evid": 3, "na": false }
  }
}
```
- **Response Payload (200 OK):**
```json
{
  "diagnosticId": "diag_a1b2c3d4e5f6",
  "schemaVersion": "0.1.0",
  "generatedAt": "2026-08-06T00:00:00.000Z",
  "metadata": {
    "criticality": "Financial",
    "isHighRisk": true,
    "operationAssessed": "Automated Treasury Agent"
  },
  "diligenceMatrix": {
    "capabilityScore": 18,
    "assuranceScore": 11,
    "capabilityZone": "low",
    "assuranceZone": "low"
  },
  "trustGates": {
    "payment": { "status": "NOT READY", "cssClass": "status-not-ready", "text": "HIGH RISK" },
    "investor": { "status": "AT RISK", "cssClass": "status-weak", "text": "AT RISK" },
    "insurer": { "status": "EVIDENCE GAP", "cssClass": "status-gap", "text": "WEAK" },
    "client": { "status": "NOT READY", "cssClass": "status-not-ready", "text": "NOT READY" },
    "regulator": { "status": "READY", "cssClass": "status-ready", "text": "READY" }
  },
  "relianceVerdict": {
    "recommendation": "Reliance Verdict: NOT RELIANCE-READY",
    "rationale": "High-risk operational controls are insufficient for unconditional reliance."
  },
  "priorityGaps": ["D1: Capability deficit (Reversibility)", "D10: Capability deficit (Containment)"],
  "evidenceChecklist": [ ... ],
  "remediationPlan": [ ... ],
  "counterpartyReadinessSummary": "...",
  "recommendedNextActions": [ ... ]
}
```

#### cURL Request Example
```bash
curl -X POST "http://localhost:3000/api/diagnostics/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "criticality": "Financial",
      "operationAssessed": "Automated Treasury Agent"
    },
    "dimensions": {
      "1": { "cap": 1, "evid": 0, "na": false },
      "2": { "cap": 3, "evid": 3, "na": false },
      "10": { "cap": 0, "evid": 0, "na": false }
    }
  }'
```

#### PowerShell Request Example (`Invoke-RestMethod`)
```powershell
$body = @{
    metadata = @{
        criticality = "Financial"
        operationAssessed = "Automated Treasury Agent"
    }
    dimensions = @{
        "1" = @{ cap = 1; evid = 0; na = $false }
        "2" = @{ cap = 3; evid = 3; na = $false }
        "10" = @{ cap = 0; evid = 0; na = $false }
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:3000/api/diagnostics/evaluate" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

> **API Authentication Note:** The public evaluator endpoint is currently unauthenticated for Phase 1/2 pre-diligence evaluations. Paid API keys and quota rate-limiting are planned for Phase 6.

---

### 2. Create Checkout / Save Report API
- **Endpoint:** `POST /api/create-checkout-session`
- **Description:** Computes diagnostic scores server-side, creates a persistent report record, and returns target redirect details.
- **Request Body:**
```json
{
  "reportType": "readiness-report",
  "reportData": {
    "metaRisk": "Financial",
    "operationAssessed": "Automated Treasury Agent",
    "dimensionData": { ... }
  }
}
```
- **Response Payload (200 OK):**
```json
{
  "url": "http://localhost:3000/report/rep_12345678?mock=true",
  "sessionId": "mock_session_rep_12345678",
  "reportId": "rep_12345678"
}
```

---

### 3. Report Retrieval API
- **Endpoint:** `GET /api/reports/[reportId]`
- **Description:** Retrieves the full stored report object by ID.
- **Response Payload (200 OK):** `DiagnosticReportRecord` JSON object.

---

### 4. Stripe Webhook Listener (Legacy / Optional)
- **Endpoint:** `POST /api/stripe-webhook`
- **Description:** Listens for `checkout.session.completed` events and updates report `paymentStatus` to `"paid"`.

---

## Known Limitations & Constraints

1. **Storage Persistence:** Reports are currently saved to local `.data/reports/` JSON files and memory cache. Before multi-instance serverless production deployment, swap `src/lib/reports/store.ts` to Supabase/PostgreSQL.
2. **Gumroad Integration:** Checkout redirection uses query parameters. Automated license key verification API calls (`/access`) are scheduled for Phase 3.
3. **Pre-Diligence Scope:** Outputs represent self-assessed pre-diligence evaluations and do not replace legal or formal regulatory audit certifications.
