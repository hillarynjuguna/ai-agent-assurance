# Manual Fulfillment Runbook

**Target SLA:** Under 10 minutes per buyer order  
**Support Email:** `thegeiya@gmail.com`  

---

## ⏱️ 10-Minute Manual Fulfillment Step-by-Step

### Step 1: Order Arrival Notification (0 - 2 mins)
1. Check email notification from Gumroad (`ropelife5@gmail.com` or `thegeiya@gmail.com`) for new order.
2. Note buyer email, product purchased ($19 Report or $149 Founder Review), and `Report ID` (if provided in custom fields or email reply).

### Step 2: Payload Extraction (2 - 4 mins)
1. Open the Admin Dashboard at `http://localhost:3000/admin/fulfillment` (or your live app URL `/admin/fulfillment`) entering your `ADMIN_ACCESS_TOKEN`.
2. Search for the buyer's `Report ID` or email address.
3. If the buyer attached a JSON payload directly via email reply (using the **Download Payload JSON** button), download and inspect `rep_xxxxxxxx-payload.json`.

### Step 3: Report Package Generation (4 - 7 mins)
1. Run the report generator tool or fill the standardized evaluation template for the buyer's 10 dimensions.
2. Verify all 5 counterparty trust gate verdicts (Payment Processors, Investors, Insurers, Enterprise Clients, Regulators).

### Step 4: Dispatch & Confirmation (7 - 10 mins)
1. Attach the completed PDF report to an email addressed to the buyer.
2. Include the standard dispatch message:
   ```text
   Hello,

   Thank you for purchasing the Agent Trust Readiness Diagnostic. Attached is your completed pre-diligence report and evidence vault checklist.

   If you have any questions or require an architecture review follow-up, reply directly to this email.

   Best regards,
   Governance Engineering Team
   thegeiya@gmail.com
   ```
3. Mark order as fulfilled in Gumroad dashboard or Admin Dashboard (`/admin/fulfillment`).
