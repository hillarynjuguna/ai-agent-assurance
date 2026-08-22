# Opus Claims Audit

Date: August 8, 2026

Every externally-facing claim assessed for evidence, confidence, and recommended language.

---

## Track A Claims

### Claim: "AI Shopping Visibility Snapshot"
- **Source:** Track A README, report output, outreach copy
- **Evidence:** The tool measures machine-readability signals (robots.txt, JSON-LD, /products.json, trust keywords). It does not measure actual AI shopping visibility.
- **Confidence:** Medium -- the signals are reasonable proxies but not direct measurements.
- **Acceptable wording:** "Machine-readability snapshot estimating how easily AI shopping assistants can interpret your catalog."
- **Do not say:** "Your AI shopping visibility score is X" as if it were a direct measurement.

### Claim: "Not proof of lost traffic"
- **Source:** Report disclaimer line, outreach copy
- **Evidence:** Correctly stated. The tool cannot measure traffic.
- **Confidence:** High -- this is an honest disclaimer.
- **Status:** Keep. This language is good.

### Claim: Allbirds scored 50/100
- **Source:** Historical Antigravity V1 result, archived in batch_outreach_summary.json
- **Evidence:** Not reproducible with canonical V2 tool. Allbirds blocks requests.
- **Confidence:** None for current tool.
- **Acceptable wording:** Do not cite this result in any customer-facing material. If referencing historical work, say "an earlier prototype produced this result under different conditions."
- **Do not say:** "Allbirds scores 50/100" as if it were a current finding.

### Claim: "$750-$1,500 audit pricing"
- **Source:** Track A offer doc, executive summary
- **Evidence:** Analogized from consulting market pricing. No customer has paid this amount.
- **Confidence:** Low -- plausible but untested.
- **Acceptable wording:** "Intended pricing range: $750-$1,500 (to be validated with first customers)."
- **Do not say:** "The market rate is $750-$1,500" without customer evidence.

### Claim: "This does not mean you are losing sales today"
- **Source:** Outreach copy in ai_shopping_visibility_audit.py
- **Evidence:** Correctly hedged language.
- **Confidence:** High.
- **Status:** Keep. This is the correct framing.

### Claim: "Low-effort improvements to make your products easier for AI systems to parse"
- **Source:** Outreach copy
- **Evidence:** Adding JSON-LD structured data IS genuinely low-effort for most Shopify stores (theme settings or apps). Improving robots.txt IS trivial.
- **Confidence:** High for Shopify stores. Medium for non-Shopify.
- **Status:** Keep.

---

## Track B Claims

### Claim: "Turn your REST/GraphQL API into a secure MCP server in 7 days"
- **Source:** Track B README, prospect one-pager, offer doc
- **Evidence:** The demo wrapper was built in under a day. A real customer API would be more complex. "7 days" has not been tested against a real customer engagement.
- **Confidence:** Medium for simple APIs. Low for complex/authenticated APIs.
- **Acceptable wording:** "We can build an initial MCP wrapper for your API, typically in 5-10 business days for straightforward REST APIs."
- **Do not say:** "Guaranteed 7-day delivery" without qualifying by API complexity.

### Claim: "$1,500 starter package"
- **Source:** Track B offer doc, README
- **Evidence:** No customer has paid this. The price is plausible for custom integration work but untested.
- **Confidence:** Low.
- **Acceptable wording:** "Starting at $1,500 for simple 1-2 tool wrappers (pricing confirmed during scoping)."

### Claim: MCP server is "secure"
- **Source:** Track B README ("secure, discoverable MCP server")
- **Evidence:** The demo has input validation and narrow tool schemas. It does NOT have authentication, rate limiting, secrets management, or deployment hardening.
- **Confidence:** Low for the word "secure."
- **Acceptable wording:** "MCP server with narrow, schema-validated tool actions."
- **Do not say:** "Secure" without qualifying what security measures are included.

### Claim: "The same pattern can wrap your product catalog, customer records, pricing data..."
- **Source:** Track B README
- **Evidence:** Architecturally true. The pattern of wrapping REST calls as MCP tools is general. But customer records and pricing data involve auth, PII, and sensitivity that the demo does not address.
- **Confidence:** Medium.
- **Acceptable wording:** Keep, but add "with appropriate authentication and access controls" when mentioning sensitive data.

---

## Strategy/Research Claims

### Claim: "60-75% probability of first $1,000"
- **Source:** Opportunity ranking table
- **Evidence:** None. AI-generated subjective estimate.
- **Confidence:** None.
- **Acceptable wording:** "Untested hypothesis. Probability to be determined by outbound experiment (50 prospects, measure reply rate, call rate, paid pilot rate)."
- **Do not say:** Any specific probability percentage.

### Claim: "Shopify AI traffic grew 8x YoY"
- **Source:** Full research report, with citation
- **Evidence:** Cited from Shopify Q1 2026 reporting. Source is credible.
- **Confidence:** High (for the citation itself).
- **Status:** Keep, with attribution.

### Claim: "Adobe reported 1,200% AI traffic increase"
- **Source:** Full research report, with citation
- **Evidence:** Cited from Adobe Analytics blog post, Feb 2025. Source is credible.
- **Confidence:** High (for the citation itself).
- **Status:** Keep, with attribution.

### Claim: "McKinsey estimates $3-5 trillion by 2030"
- **Source:** Full research report, with citation
- **Evidence:** Cited from McKinsey. Note: this is a "moderate scenario" forecast, not a certainty.
- **Confidence:** Medium (McKinsey forecasts have wide error bars).
- **Acceptable wording:** "McKinsey estimates agents could mediate $3-5T of consumer commerce by 2030 under moderate scenarios."
- **Do not say:** "The market will be $5 trillion."

### Claim: "Gartner: 40%+ of agentic AI projects may be canceled"
- **Source:** Full research report, with citation
- **Evidence:** Cited from Gartner press release. An important counterbalance.
- **Confidence:** High (for the citation).
- **Status:** Keep. This demonstrates intellectual honesty.

---

## Claims That Should Not Appear Anywhere in Canonical Code

These were removed during V1-to-V2 transition. Verify they stay removed:

| Phrase | Status | Location if found |
|---|---|---|
| "losing AI Shopping Agent traffic" | Quarantined | archive/ only |
| "dropping purchase intents" | Quarantined | archive/ only |
| "agent transactions break" | Quarantined | archive/ only |
| "Urgent:" subject line | Quarantined | archive/ only |
| "mandatory MCP manifest" | Not found | Clean |
| "certified" | Not found | Clean |
| "compliance approval" | Not found | Clean |
| "guaranteed ranking" | Only in negation | Correct usage |
