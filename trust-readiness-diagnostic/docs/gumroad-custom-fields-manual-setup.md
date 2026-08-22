# Gumroad Custom Checkout Fields Manual Setup Runbook

**Status:** Required Action (API/CLI does not support programmatic custom field mutations)  
**Target Storefront:** Hillary Njuguna (`hillarynjuguna.gumroad.com`)  

---

## 📌 Overview

The Gumroad API v2 (`PUT /v2/products/:id`) and Gumroad CLI (`gumroad.exe products update`) do not allow updating checkout custom fields via API calls. To collect buyer workflow details at checkout, these fields must be enabled manually in the Gumroad Dashboard.

---

## 🛠️ Click-by-Click Setup Instructions

### 1. Product 1: Agent Trust Readiness Report ($19)
- **Direct Edit Link:** [https://app.gumroad.com/products/uazesx/edit](https://app.gumroad.com/products/uazesx/edit)
- **Steps:**
  1. Open [https://app.gumroad.com/products/uazesx/edit](https://app.gumroad.com/products/uazesx/edit)
  2. Click the **Checkout** tab at the top.
  3. Scroll down to the **Custom Fields** section.
  4. Click **Add custom field** and add the following 5 fields:

| Field Name | Type | Required? | Purpose |
|:---|:---|:---:|:---|
| `Report ID` | Text | Optional | Autofills or pairs diagnostic payload `rep_xxxxxxxx` |
| `Company / Project Name` | Text | **Required** | Identifies buyer organization |
| `What does the AI agent do?` | Text | **Required** | Workflow authorization & scope overview |
| `Primary Counterparty Concern` | Dropdown | **Required** | Choices: `Payment Processors`, `Investors`, `Insurers`, `Enterprise Clients`, `Regulators` |
| `Deadline` | Text | Optional | E.g., `Within 24 hours` or `Before Friday investor call` |

  5. Click **Save changes** (top right).

---

### 2. Product 2: Founder Trust Review ($149)
- **Direct Edit Link:** [https://app.gumroad.com/products/hd8oOeH9NheiiQ_v6RFBGQ==/edit](https://app.gumroad.com/products/hd8oOeH9NheiiQ_v6RFBGQ==/edit)
- **Steps:**
  1. Open [https://app.gumroad.com/products/hd8oOeH9NheiiQ_v6RFBGQ==/edit](https://app.gumroad.com/products/hd8oOeH9NheiiQ_v6RFBGQ==/edit)
  2. Click the **Checkout** tab at the top.
  3. Scroll down to the **Custom Fields** section.
  4. Click **Add custom field** and add the following 6 fields:

| Field Name | Type | Required? | Purpose |
|:---|:---|:---:|:---|
| `Report ID` | Text | Optional | Links full diagnostic payload `rep_xxxxxxxx` |
| `Company / Project Name` | Text | **Required** | Identifies buyer organization |
| `Workflow Summary` | Text | **Required** | Detailed description of agent tools & capabilities |
| `Primary Counterparty Focus` | Dropdown | **Required** | Choices: `Payment Processors`, `Investors`, `Insurers`, `Enterprise Clients`, `Regulators` |
| `Preferred Review Focus / Key Questions` | Text | **Required** | Specific diligence questions for governance team |
| `Deadline` | Text | Optional | Diligence meeting target date |

  5. Click **Save changes** (top right).

---

## 🔍 Verification After Manual Setup

Once saved in the dashboard, test the checkout modal on both public landing pages:
1. `https://hillarynjuguna.gumroad.com/l/agent-trust-readiness-report`
2. `https://hillarynjuguna.gumroad.com/l/founder-trust-review`

Verify that clicking **Get Report ($19)** or **Get Review ($149)** displays the custom form fields during checkout.
