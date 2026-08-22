# Gumroad Product QA & Launch Checklist

This checklist provides a standardized quality assurance protocol for preparing, launching, and verifying products on Gumroad. Every new digital product, report, or service offering published under this storefront must pass this QA protocol before driving live buyer traffic.

---

## Standardized QA Checklist Table

| Item # | Verification Category | QA Standard & Verification Criteria | Status | Notes / Instructions |
|:---:|:---|:---|:---:|:---|
| **1** | **Product Title** | Clean, descriptive, and free of sensationalized claims. Must accurately state the deliverable. | [ ] | e.g. *Agent Trust Readiness Report* or *Founder Trust Review* |
| **2** | **URL Slug (Permalink)** | Human-readable, hyphen-separated, and clean. No random generated characters. | [ ] | e.g. `agent-trust-readiness-report` |
| **3** | **Price & Currency** | Price formatted correctly (`$19`, `$149`, etc.). Free lead magnets configured as `$0+` or PWYW. | [ ] | Verify exact checkout currency is USD |
| **4** | **Thumbnail Image** | Square image, at least 600x600 px. High contrast, crisp badge or icon, legible at small sizes. | [ ] | Upload product-specific PNG |
| **5** | **Cover Image** | Horizontal 16:9 image, at least 1280x720 px. Product-specific and visually consistent with the catalog. | [ ] | Upload product-specific PNG |
| **6** | **Landing Page CTA** | Clear buy buttons with `data-gumroad-action="buy"`. Exact price matching (`$19`, not `$$19`). | [ ] | Verify mobile and desktop click targets |
| **7** | **Post-Purchase Message** | Concise custom receipt text, ideally under 500 characters, that does not truncate in email clients. | [ ] | Must specify next steps and support email |
| **8** | **Attached Fulfillment File** | PDF guide attached to the Content tab explaining manual fulfillment steps and expectations. | [ ] | Verify PDF opens and text extracts cleanly |
| **9** | **License Key Behavior** | Explains that the license key is a purchase reference and that automated API verification is a future milestone. | [ ] | Prevent buyer confusion during manual phase |
| **10** | **Custom Checkout Fields** | Collects essential workflow details such as company, agent description, target gate, and Report ID. | [ ] | Ensure required fields are enabled in Gumroad |
| **11** | **Receipt Clarity** | Gumroad customer receipt email clearly states purchase reference and expected delivery window. | [ ] | Inspect actual test purchase email |
| **12** | **Creator Sale Email** | Creator notification email contains buyer inputs for manual fulfillment. | [ ] | Verify creator receives order details |
| **13** | **Recommendation Cards** | Gumroad post-purchase discovery cards display correct upsell titles, clean images, and pricing. | [ ] | Product 1 should upsell Product 2 |
| **14** | **Refund Policy** | Clear refund or satisfaction policy stated in product details without over-promising outcomes. | [ ] | Avoid claims that imply third-party acceptance |
| **15** | **Disclaimer Language** | States product is a pre-diligence diagnostic aid, not formal legal, regulatory, insurer, investor, or processor advice. | [ ] | No "certified", "approved", or promised third-party acceptance |
| **16** | **Support Email** | Direct support address provided across landing page, PDF, receipt, and access page. | [ ] | Must be `thegeiya@gmail.com` |
| **17** | **Test Purchase Verification** | Execute a test transaction or creator preview purchase to confirm the end-to-end flow. | [ ] | Confirm receipt, download, fields, and fulfillment instructions |
| **18** | **Mobile Layout Check** | Load landing page on 375px-414px viewport to ensure no overflow or broken text. | [ ] | Verify font sizing and button bounds |
| **19** | **Desktop Layout Check** | Load landing page on 1280px-1440px viewport to verify visual hierarchy and product clarity. | [ ] | Verify hero, CTA, proof blocks, and footer |

---

## Step-by-Step QA Workflow

### Step 1: Pre-Publish Audit

1. Run `python build_landing.py` or the product-specific landing build script.
2. Confirm no mojibake, em-dash variants, placeholder domains, or double dollar signs (`$$`) exist.
3. Run `gumroad products page preview <id> ./landing.html --json` and verify the sanitization report has no fatal stripped tags.

### Step 2: Media & Copy Verification

1. Verify cover image and thumbnail dimensions.
2. Confirm the cover image is product-specific and not a repeated generic asset.
3. Check that the custom receipt message uses the standard template:

```text
Thank you for purchasing.

Next step: Reply to this receipt with your Report ID. If you do not have one, send a short workflow description.

Your report will be delivered manually within [12/48] business hours.

Keep your license key. It is your purchase reference for manual fulfillment and future access verification.

Support: thegeiya@gmail.com
```

### Step 3: Post-Publish Verification

1. Run `gumroad products page publish <id> ./landing.html`.
2. Open the public URL in a browser and click the primary CTA to verify the Gumroad checkout opens with the correct price.
3. Complete a test order and inspect the buyer receipt, creator sale email, content screen, PDF, license key display, and recommendations.
4. Record screenshots of the buyer journey for future audit evidence.

### Step 4: Safety Copy Audit

1. Search for risky or overclaiming terms:

```powershell
rg -i "guaranteed approval|certified|compliance approval|legal assurance|legal advice|insurance approval|processor approval" landing.html landing2.html docs src README.md
```

2. Rewrite any buyer-facing claim that implies third-party approval, legal assurance, insurance acceptance, or regulatory certification.
3. Keep language anchored in pre-diligence, trust readiness, counterparty readiness, manual review, and operational evidence.

### Step 5: Release Decision

Use one of three launch states:

| State | Meaning |
|:---|:---|
| **Internal Only** | Not ready for public traffic. Critical buyer journey or claim-risk issues remain. |
| **Soft Launch** | Ready for limited real traffic and manual fulfillment, with screenshots and fulfillment tracking. |
| **Scale Launch** | Ready for broader traffic after repeated clean purchases, fulfillment SLAs, and support workflow validation. |
