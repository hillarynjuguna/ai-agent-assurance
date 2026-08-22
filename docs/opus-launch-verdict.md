# Opus Launch Verdict

Date: August 8, 2026

---

## Verdict: CONDITIONAL GREEN -- Launch with Caveats

The Agentic Commerce Zero-Capital Launch Kit is cleared for first customer outreach with the following conditions met:

---

## What Is Ready to Ship

### Track A: AI Shopping Visibility Auditor
The tool produces honest, reproducible results on reachable Shopify stores. The outreach copy is carefully hedged. The scoring model is a reasonable heuristic for machine-readability. The disclaimer language is appropriate.

**You can use this tool today to prospect Shopify merchants.**

### Track B: MCP Server Demo
The MCP server works over stdio and demonstrates the API-to-MCP wrapper pattern convincingly. The demo is suitable for including in outbound emails and discovery calls.

**You can reference this demo in outbound messaging today.**

### Documentation and Strategy
The research report, executive summary, offer docs, qualification checklists, outbound playbooks, and 30-day launch plan are comprehensive and internally consistent. The competitive intelligence is useful. The claims have been audited and the dangerous V1 language is quarantined.

**The strategy docs are ready to guide execution.**

---

## Conditions for Launch

### Must-Have (Before First Paid Customer)

1. **Do not cite the Allbirds 50/100 score.** It was produced by a different tool version under different conditions. The canonical V2 tool cannot reproduce it.

2. **Do not cite revenue probability percentages.** The 70-75% P($1k) figures have no empirical basis. Replace with: "We believe this has strong potential based on market research; the first 50 prospects will validate our pricing and conversion assumptions."

3. **Run the tool against YOUR chosen vertical first.** Generate 10-20 real snapshots in your target niche (e.g., supplements, skincare, outdoor gear) to confirm the tool produces useful, actionable findings before sending outreach.

4. **Clean the repo root before git init.** Stale output files have been removed. Verify no new ones appear before committing.

### Should-Have (Before Week 2)

5. **Track A: Distinguish between "blocked" and "unreachable"** in error messages. Currently both show "Could not reach homepage" which is misleading when a site is actively blocking the tool vs genuinely down.

6. **Track A: Test with a User-Agent string** that doesn't trigger bot protection. The current urllib default User-Agent is blocked by many stores.

7. **Track B: Test the "7-day delivery" promise** against at least one real (even internal) API before promising it to prospects.

---

## What Is NOT Ready

- **Production hosting.** Neither track is deployed. This is fine for a service business where you run tools locally and deliver reports.
- **Automated fulfillment.** Reports are generated locally and delivered manually. Fine for the first 10-20 customers.
- **Non-Shopify support.** The tool is biased toward Shopify's /products.json. Non-Shopify stores will score lower than they should. Know this before prospecting non-Shopify brands.

---

## Recommended First Action

1. Pick ONE vertical (supplements or skincare recommended based on the research).
2. Build a list of 50 Shopify brands in that vertical.
3. Run the auditor against all 50.
4. Select the 20 with the most interesting findings (low schema scores, missing JSON-LD, etc.).
5. Draft 20 personalized outreach emails using the generated outreach copy as a starting point.
6. Send and track responses.
7. Use response data to calibrate pricing, messaging, and tool improvements.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Tool blocked by target site | High (30-50%) | Medium | Pre-test targets, improve User-Agent |
| No replies to outreach | Medium (40%) | High | Test 3 subject lines, 2 verticals |
| Prospect questions tool accuracy | Low (10%) | Medium | Honest disclaimers already in place |
| Competitor launches similar tool | Low (15%) | Low | First-mover in niche vertical wins |
| MCP SDK breaking change | Low (5%) | Low | Pin version, update on schedule |

---

## Summary

The kit is what the research said it should be: a working demonstration of the merchant-readability audit concept, backed by honest documentation and careful outreach copy. It is NOT a production SaaS platform. It IS a viable starting point for a productized service business.

The first $1,000 will come from manually running the tool, interpreting the results, and delivering a polished report to a merchant who cares about AI traffic. The tool does the hard work of data gathering; the founder adds context, judgment, and implementation guidance.

Ship it.
