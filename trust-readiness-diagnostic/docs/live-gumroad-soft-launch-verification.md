# Live Gumroad Soft Launch Verification Evidence

**Verification Timestamp:** August 6, 2026  
**Environment:** Production Storefront (`hillarynjuguna.gumroad.com`)  
**Launch Verdict:** **Soft Launch Ready with manual intake caveat**  

---

## Product Identification & Slugs Checked

| Product Title | ID | Slug | Price | Status | Public URL |
|:---|:---|:---|:---|:---|:---|
| **Agent Trust Readiness Report** | `uazesx` | `agent-trust-readiness-report` | $19 | Published | [View Product](https://hillarynjuguna.gumroad.com/l/agent-trust-readiness-report) |
| **Founder Trust Review** | `hd8oOeH9NheiiQ_v6RFBGQ==` | `founder-trust-review` | $149 | Published | [View Product](https://hillarynjuguna.gumroad.com/l/founder-trust-review) |

---

## Commands Used

```powershell
python build_landing.py
python build_landing2.py
gumroad.exe products page publish uazesx ./landing.html --json --no-input --non-interactive
gumroad.exe products page publish hd8oOeH9NheiiQ_v6RFBGQ== ./landing2.html --json --no-input --non-interactive
npm.cmd run lint
npm.cmd run build
rg -n "\$\$19|\$\$149|AI Agent Compliance Assessment|support@yourdomain|yourdomain|mojibake variants|guaranteed approval|Guaranteed approval" landing.html landing2.html docs src README.md build_landing.py build_landing2.py generate_fulfillment_pdfs.py
```

---

## Verification Criteria

### CTA & Price Rendering

The Gumroad `data-gumroad-field="price"` span must not be preceded by a hardcoded `$`, because Gumroad injects the formatted price with currency.

Expected source pattern:

```html
Get Report (<span data-gumroad-field="price">19</span>)
```

### Receipt Messages

Receipt messages should remain concise, specify the manual next step, set the 12hr or 48hr delivery expectation, and use `thegeiya@gmail.com` as support contact.

### Custom Checkout Fields

Current Gumroad CLI verification shows both products returning an empty `custom_fields` array:

```json
{
  "Agent Trust Readiness Report": [],
  "Founder Trust Review": []
}
```

This means custom checkout fields are not currently confirmed through the Gumroad CLI. During soft launch, fulfillment depends on the receipt message and attached PDF asking the buyer to reply with their Report ID or workflow details.

Before broader traffic, configure and verify custom checkout fields manually in Gumroad or through an API surface that supports them.

### PDF Attachments

Fulfillment PDFs should use clean ASCII bullets and explain:

- Report ID handling
- Manual fulfillment window
- License key as purchase reference
- Pre-diligence disclaimer
- Support email

### Claim Safety

Buyer-facing landing pages must avoid language that implies third-party approval, certification, insurance acceptance, legal advice, or regulatory sign-off.

---

## Remaining Operational Risks

1. **Custom checkout fields not confirmed:** Gumroad CLI currently reports no custom fields on both products.
2. **Manual fulfillment latency:** Orders still require manual email fulfillment.
3. **License key automation is dormant:** The license key is only a manual purchase reference during early access.
4. **Catalog confusion:** `TBW` should be hidden or repositioned before broader traffic.

---

## Final Launch State

**VERDICT: Soft Launch Ready, not Scale Launch Ready**

This is ready for limited real buyer traffic because the receipt and attached PDFs provide a manual intake path. It is not ready for broader traffic until Gumroad custom checkout fields are visibly configured and confirmed in a fresh test purchase.
