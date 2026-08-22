# Antigravity vs Codex: Agentic Commerce Artifact Audit

Date: August 5, 2026

## Bottom Line

Antigravity and Codex independently converged on the same main recommendation: **the fastest zero-capital path is an agentic commerce / AI visibility readiness service for ecommerce merchants**, not payment rails, wallets, tokenization, protocols, or consumer shopping agents.

Antigravity went further by producing a working prototype: a Python audit engine, sample report, and cold outreach generator. That is directionally useful, but it should not be used for real outreach without cleanup. The current tool overstates commercial certainty, uses weak technical checks, and includes claims that could damage credibility with serious merchants.

## Artifact Inventory

Antigravity created these artifacts:

| Artifact | Path | Status |
|---|---|---|
| Research report | `C:\Users\jacef\.gemini\antigravity-ide\brain\5ae54dd1-4ea5-4a59-a2ca-01964ca34f68\agentic_commerce_research_report.md` | Useful but too hype-forward |
| Core audit engine | `C:\Users\jacef\.gemini\antigravity-ide\brain\5ae54dd1-4ea5-4a59-a2ca-01964ca34f68\scratch\agentic-geo-audit\geo_audit_engine.py` | Prototype only |
| Sample audit report | `C:\Users\jacef\.gemini\antigravity-ide\brain\5ae54dd1-4ea5-4a59-a2ca-01964ca34f68\scratch\agentic-geo-audit\geo_audit_result.md` | Useful format, weak claims |
| Batch outreach generator | `C:\Users\jacef\.gemini\antigravity-ide\brain\5ae54dd1-4ea5-4a59-a2ca-01964ca34f68\scratch\agentic-geo-audit\batch_audit_outreach.py` | Needs rewrite before use |
| Batch outreach output | `C:\Users\jacef\.gemini\antigravity-ide\brain\5ae54dd1-4ea5-4a59-a2ca-01964ca34f68\scratch\agentic-geo-audit\batch_outreach_summary.json` | Demonstrates pipeline, not reliable proof |

Codex created:

| Artifact | Path | Status |
|---|---|---|
| Research report | `C:\Users\jacef\Documents\Codex\2026-08-05\deep-research-prompt-agentic-commerce-opportunities\outputs\agentic-commerce-zero-capital-founder-report.md` | More conservative and evidence weighted |

## Where Antigravity Was Strong

1. **It validated the same best wedge**

   Antigravity ranked "Merchant Data Legibility / GEO" as the top opportunity. That matches the Codex conclusion: sell agentic commerce readiness and AI visibility services before building SaaS.

2. **It produced a useful Day 1 prototype**

   The audit engine checks:

   - `robots.txt`
   - JSON-LD Product / Offer schema
   - `/.well-known/mcp.json` or `/.well-known/agentic-commerce.json`
   - Shopify `/products.json`

   These are reasonable first-pass checks, especially for Shopify prospecting.

3. **It found extra competitive intelligence worth merging**

   Antigravity added several startups that were not emphasized in the Codex report:

   - Skyfire: agent identity and payments, including KYA / KYAPay positioning.
   - Basis Theory: tokenization and vault infrastructure, with agentic commerce relevance.
   - FERMAT: AI-native commerce journeys and checkout-adjacent experience layer.
   - Nekuda: agentic payments infrastructure, reported $5M seed.
   - Rye: checkout orchestration and agentic commerce landscape content.

   These names improve the competitive landscape section.

## Where Antigravity Was Too Aggressive

1. **The probabilities are not credible**

   Antigravity claims:

   - GEO audit probability of first $1k: 90%.
   - Niche affiliate MCP probability of $10k/month: 70%.
   - B2B micro-procurement probability of $10k/month: 75%.

   I would not use those figures. My more conservative estimates are:

   | Opportunity | Antigravity claim | More realistic estimate |
   |---|---:|---:|
   | GEO audit first $1k | 90% | 60-75% if doing direct outreach seriously |
   | GEO audit $10k/month | 65% | 20-30% in 90-180 days |
   | Affiliate MCP $10k/month | 70% | 5-15% unless distribution is already solved |
   | B2B procurement $10k/month | 75% | 20-35% with strong niche selection and sales |

   Reason: distribution is the hard part. Building an MCP endpoint does not mean agents will use it, directories will send meaningful traffic, or affiliate programs will attribute commissions reliably.

2. **It treats `/.well-known/mcp.json` as more standard than it is**

   In `geo_audit_engine.py`, missing `/.well-known/mcp.json` is worth 25 points and the recommendation says to deploy a "standard" endpoint. MCP itself is real and important, but a merchant-hosted `/.well-known/mcp.json` is not yet a universal ecommerce requirement. OpenAI ACP, Google AP2, Shopify Catalog, product feeds, schema.org, robots/crawler access, and merchant center feeds are more defensible readiness checks.

   Fix: rename this check from **MCP Manifest Endpoint** to **Agent Discovery / API Manifest Experimental Check**, reduce its score weight, and explain that it is forward-looking rather than mandatory.

3. **The robots.txt parser is too naive**

   The script checks whether `"User-agent: GPTBot"` and `"Disallow: /"` appear anywhere in the file. Real `robots.txt` parsing is group-based. A generic `Disallow: /` in another group could be incorrectly attributed to GPTBot, and casing, spacing, wildcards, `Allow`, and user-agent groups are not handled.

   Fix: use a real robots parser or implement group-aware parsing for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and common AI crawlers.

4. **The JSON-LD audit only checks the homepage**

   The audit runs JSON-LD extraction on the target homepage. Many Shopify stores do not place Product schema on the homepage; they place it on product detail pages. This produced likely misleading failures for Allbirds and Gymshark.

   Fix: pull 3 to 10 product URLs from `/products.json`, then audit JSON-LD on actual product pages.

5. **The outreach language is too alarmist**

   Current generated subject:

   `Urgent: allbirds.com is losing AI Shopping Agent traffic (ChatGPT/Perplexity)`

   Current body says "AI agents are currently dropping purchase intents" and "exactly where agent transactions break."

   That is too strong. The audit does not prove lost traffic or broken transactions. It proves machine-readiness gaps.

   Better subject:

   `Quick AI shopping visibility check for allbirds.com`

   Better claim:

   `I found a few machine-readability gaps that may make it harder for AI shopping assistants to interpret your product catalog consistently.`

6. **The batch script has an edge-case bug**

   In `batch_outreach_summary.json`, `chubbieswear.com` scored 0 but had no missing checks, because `run_full_audit()` returns early if the site cannot be reached and never populates check failures. The generated email then includes an empty bullet.

   Fix: add an `error` field and skip outreach when the audit could not reach the site.

7. **The report has encoding damage**

   Several characters render as mojibake: `FERMÃ€T`, `â€”`, `âœ“`, etc. This is not fatal but should be cleaned before sharing.

## Technical Verdict on Antigravity's Prototype

| Component | Keep | Revise | Reject |
|---|---|---|---|
| URL normalization and fetch utility | Yes | Add retries, redirects, robots-safe rate limiting | No |
| Shopify `/products.json` check | Yes | Use it to discover product URLs and sample SKUs | No |
| JSON-LD extraction | Yes | Run on product pages, support `@graph`, nested arrays, microdata | No |
| MCP manifest check | Partial | Make experimental and lower weight | Do not sell as required standard |
| Generated `mcp.json` | Partial | Reframe as concept/manifest, not drop-in standard | Do not deploy blindly |
| Outreach generator | Partial | Rewrite tone and remove unproven claims | Do not use current copy |
| Batch prospecting flow | Yes | Add error states, CSV input, polite rate limits, audit evidence | No |

## Comparison Against Codex Research

| Question | Codex answer | Antigravity answer | Best combined answer |
|---|---|---|---|
| Fastest path | Shopify / ecommerce agentic readiness sprint | GEO audit and schema agency | Same answer: productized service first |
| Best first price | $750-$2,500 | $350 + $99/mo | Start at $500-$750 beta, move to $1,500+ after proof |
| Second opportunity | Product-feed/schema cleanup, B2B automation | Affiliate MCP broker | B2B workflow automation is safer than affiliate MCP |
| Infrastructure startups | OpenAI, Stripe, Google, Visa, Mastercard, Shopify, Crossmint, Nevermined | Adds Basis Theory, Skyfire, Rye, FERMAT, Nekuda | Merge the startup list |
| Technical artifact | Research only | Audit/outreach prototype | Keep prototype, repair before use |
| Tone | Conservative | High-conviction, sometimes hypey | Use conservative claims for customer-facing assets |

## Competitive Intelligence Updates Worth Adding

These Antigravity additions are directionally valid based on spot checks:

- **Skyfire** sells agent identity, wallet, and checkout infrastructure. Its site positions itself as an "agentic commerce wallet" and mentions tokenized card transactions and mandates. Source: [Skyfire](https://skyfire.xyz/).
- **Skyfire KYAPay** has been described as verifying that an AI agent acts for an authorized user. Source: [Business Wire](https://www.businesswire.com/news/home/20251218520399/en/Skyfire-Demonstrates-Secure-Agentic-Commerce-Purchase-Using-the-KYAPay-Protocol-and-Visa-Intelligent-Commerce).
- **Basis Theory** is cited by Rye and Eco as having raised a $33M Series B and working on payment vault/tokenization for agentic commerce. Source: [Rye](https://rye.com/blog/agentic-commerce-startups), [Eco](https://eco.com/support/en/articles/14845487-the-agentic-commerce-stack-7-layers).
- **FERMAT** announced a $45M Series B and describes itself as an AI-native commerce platform powering journeys from ad to shop to checkout. Source: [PR Newswire](https://www.prnewswire.com/news-releases/fermat-raises-45m-series-b-to-define-the-future-of-ai-powered-commerce-experiences-302478623.html), [FERMAT](https://www.fermatcommerce.com/).
- **Nekuda** reportedly raised $5M for agentic payments infrastructure. Source: [Pulse 2.0](https://pulse2.com/nekuda-5-million-raised-for-building-infrastructure-for-agentic-payments/), [Madrona](https://www.madrona.com/agents-need-a-payment-stack-nekuda-is-building-it/).

## Recommended Merge Plan

1. Keep the Codex report as the strategic base because it is more evidence-calibrated.
2. Add Antigravity's extra startup intelligence to the competitive intelligence section.
3. Move Antigravity's prototype into a new `work/geo-audit-prototype/` folder only after fixing its claims.
4. Rewrite the tool around three tiers of evidence:

   - **Verified now**: robots/crawler access, product-page schema, Shopify product API, sitemap, Google Merchant Center hints, OpenGraph/product metadata, page speed/accessibility.
   - **Likely readiness signal**: product data completeness, variants, price/availability clarity, shipping/returns clarity, reviews, comparison FAQs.
   - **Experimental/future-facing**: MCP or agent manifest, ACP/AP2 readiness, delegated checkout support.

5. Rewrite scoring so MCP is no more than 5-10 points, not 25.
6. Rewrite outreach to sell a "visibility/readiness check," not "lost traffic."
7. Add source links and screenshots/evidence snippets to each prospect report.

## Revised Day 1 Offer

Offer name: **AI Shopping Visibility Snapshot**

Price: free teaser plus $750 paid audit.

Teaser deliverable:

- 5 buyer-intent prompts.
- 3 competitor comparisons.
- 3 technical readiness checks.
- 1 screenshot or cited evidence point.

Paid deliverable:

- 25-50 buyer-intent prompts.
- Product-page schema audit on 10-25 SKUs.
- Product-feed completeness check.
- AI assistant visibility benchmark across ChatGPT, Gemini, Perplexity, and Google AI Mode where possible.
- Fix list prioritized by expected impact and ease.
- Optional implementation support.

Customer-facing positioning:

> AI shopping assistants are starting to influence product discovery. I ran a quick machine-readability check on your store and found a few places where your product catalog may be harder for AI systems to interpret than competitor catalogs. I can send the snapshot if useful.

## Final Judgment

Antigravity did a good job turning the strategy into a runnable prototype. Codex did a better job staying evidence-calibrated.

The combined best path is:

1. Use Codex's strategic recommendation.
2. Keep Antigravity's audit engine as a prototype.
3. Fix the prototype before outreach.
4. Add verified startup intelligence from Antigravity.
5. Launch with conservative, evidence-based language.

Do not use Antigravity's current generated emails as-is. Use the productized-service idea, not the fear-based copy.
