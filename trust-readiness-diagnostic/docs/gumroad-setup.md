# Gumroad Setup Guide

This guide explains how to connect low-friction Gumroad checkout links to the **Agent Trust Readiness Diagnostic** application.

---

## 1. Create Gumroad Products

Log into your [Gumroad Dashboard](https://gumroad.com/) and create two digital products:

### Product 1: Full Trust Readiness Report
- **Name:** Full Agent Trust Readiness Report
- **Price:** $99 (One-time payment)
- **Description:** Complete 10-dimension governance evaluation, evidence checklist, priority remediation plan, and board-ready counterparty summaries.
- **License Keys:** Enable **"Generate unique license keys for each purchase"** under Product Settings.
- **Custom URL:** Save the product link (e.g. `https://yourname.gumroad.com/l/trust-report`).

### Product 2: Expert Trust Review
- **Name:** Expert Agent Trust Review & Architecture Session
- **Price:** $499+ (One-time payment)
- **Description:** Includes Full Trust Readiness Report, 60-minute live architecture review session, custom remediation design, and direct counterparty DDQ response support.
- **License Keys:** Enable license key generation.
- **Custom URL:** Save the product link (e.g. `https://yourname.gumroad.com/l/expert-trust-review`).

---

## 2. Configure Environment Variables

Create or update your `.env.local` file (or set environment variables in your Vercel deployment project settings):

```env
# Gumroad Checkout URLs
NEXT_PUBLIC_GUMROAD_REPORT_URL="https://yourname.gumroad.com/l/trust-report"
NEXT_PUBLIC_GUMROAD_EXPERT_URL="https://yourname.gumroad.com/l/expert-trust-review"
```

---

## 3. How Checkout & Fulfillment Work

1. **User Action:** After a diagnostic report record exists, clicking "Unlock Full Report on Gumroad" or "Request Expert Review on Gumroad" sends the buyer to the configured Gumroad URL with `?report_id=rep_xxx` appended when available.
2. **Fallback Behavior:** If environment variables are missing, the UI gracefully routes to the local `/purchase` page explaining setup steps for early testers.
3. **Manual Fulfillment Phase:** Automated instant license key unlock via Gumroad API is scheduled for Phase 3. In the current Phase 2 release, purchases are fulfilled manually by sending compliance vault packets to customer buyer emails.
