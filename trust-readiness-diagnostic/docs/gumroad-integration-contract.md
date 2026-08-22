# Gumroad Integration Contract

**Date:** August 6, 2026  
**System:** Agent Trust Readiness Diagnostic & Gumroad Handoff Architecture  

---

## 1. Product Definitions & Endpoints

| Product Name | Price | Gumroad Product ID | Product Permalink / URL |
|:---|:---|:---|:---|
| **Agent Trust Readiness Report** | $19 | `uazesx` | [agent-trust-readiness-report](https://hillarynjuguna.gumroad.com/l/agent-trust-readiness-report) |
| **Founder Trust Review** | $149 | `hd8oOeH9NheiiQ_v6RFBGQ==` | [founder-trust-review](https://hillarynjuguna.gumroad.com/l/founder-trust-review) |

---

## 2. API Contracts & Server Routes

### A. License Verification Endpoint
- **Route:** `POST /api/gumroad/verify-license`
- **Request Payload:**
  ```json
  {
    "licenseKey": "XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX",
    "productId": "uazesx",
    "reportId": "rep_178599182312",
    "email": "buyer@company.com"
  }
  ```
- **Response Payload:**
  ```json
  {
    "success": true,
    "verified": true,
    "productTier": "readiness-report",
    "purchaseEmail": "buyer@company.com",
    "purchaseDate": "2026-08-06T12:00:00Z",
    "reportMatchStatus": "matched_and_updated"
  }
  ```

### B. Webhook / Ping Intake Endpoint
- **Route:** `POST /api/gumroad/ping`
- **Supported Content Types:** `application/x-www-form-urlencoded` or `application/json`
- **Extracted Payload:** `sale_id`, `email`, `license_key`, `product_id`, `custom_fields[Report ID]`.

### C. Admin Fulfillment & Matching Endpoint
- **Route:** `GET /api/admin/fulfillment?token=<ADMIN_ACCESS_TOKEN>`
- **Route:** `POST /api/admin/match?token=<ADMIN_ACCESS_TOKEN>`
- **Body:** `{ "pingId": "sale_123", "reportId": "rep_123" }`

---

## 3. Custom Fields Contract

| Product | Field Label | Requirement | Purpose |
|:---|:---|:---:|:---|
| **$19 Report** | `Report ID` | Optional | Links `rep_xxxxxxxx` payload |
| **$19 Report** | `Company / Project Name` | Required | Identifies buyer org |
| **$19 Report** | `What does the AI agent do?` | Required | Workflow scope overview |
| **$19 Report** | `Primary Counterparty Concern` | Required Dropdown | Target gate focus |
| **$149 Review** | `Preferred Review Focus / Key Questions` | Required | Specific diligence questions |
