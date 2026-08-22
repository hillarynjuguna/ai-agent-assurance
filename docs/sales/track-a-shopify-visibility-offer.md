# Track A: AI Shopping Visibility Snapshot


## Recommended First Product

Name: **Agent-Ready Commerce Sprint**

Target customer: Shopify merchants with 100 to 5,000 SKUs, meaningful paid search/SEO spend, and products where comparison shopping matters.

Promise: "In 7 days, we show where your products appear or disappear in AI shopping answers and fix the highest-impact product-data issues blocking AI discovery."

Deliverables:

- AI visibility benchmark across ChatGPT, Gemini, Perplexity, and Google AI Mode where available.
- 25 to 100 buyer-intent test prompts.
- Competitive comparison for 3 to 5 competitors.
- Product data gap report: titles, descriptions, schema, specs, images, reviews, shipping, returns, price/availability.
- Structured content fixes for priority SKUs.
- FAQ and product-answer upgrades.
- Analytics tagging plan for AI referrals.
- 30-day retest plan.

Pricing:

- Starter audit: $750, 10 products, 20 prompts, no implementation.
- Sprint: $1,500, 25 products, 50 prompts, implementation guidance and content fixes.
- Plus: $3,000, 50 products, 100 prompts, competitor benchmark, product-feed/schema cleanup support.
- Retainer: $500 to $1,500/month for weekly monitoring and optimization.

Customer acquisition:

1. Pick one vertical: supplements, skincare, specialty food, outdoor gear, baby products, pet products, or B2B supplies.
2. Build a list of 100 Shopify brands.
3. For each, run 5 buyer-intent prompts and capture whether the brand appears.
4. Send a short email with one concrete observation: "You rank in Google, but ChatGPT/Gemini did not mention you for [query]. Here is what showed up instead."
5. Offer a $750 diagnostic with refund/credit toward implementation.
6. Post anonymized teardown threads on LinkedIn and X.
7. Partner with small Shopify agencies as a white-label add-on.

## Post-Antigravity Artifact Review Addendum

After comparing Antigravity's artifacts against this report, the main recommendation is stronger, not weaker. Antigravity independently selected the same fastest-revenue wedge: **merchant legibility / GEO / AI shopping readiness**. It also produced a prototype audit engine and outreach generator.

The prototype is useful, but the original version was too aggressive for real customer-facing use. In particular, it treated `/.well-known/mcp.json` as a required standard, scored missing MCP manifests too heavily, checked JSON-LD mostly from the homepage, and used outreach copy that implied proven lost traffic. Those claims should be avoided.

The cleaned execution path is:

- Use AI visibility and product-data readiness as the offer.
- Sell a conservative "AI Shopping Visibility Snapshot," not fear-based "lost traffic" claims.
- Treat ACP/AP2/MCP-style manifests as emerging signals, while prioritizing proven checks: crawler access, product-page schema, product feed quality, product content completeness, shipping/returns/support clarity, and actual AI-answer visibility tests.
- Use the V2 audit toolkit in `tools/track-a-ai-shopping-visibility/` as a safer starting point for prospecting.

Additional competitive intelligence from Antigravity worth tracking:

- Skyfire: agent identity, wallets, payment mandates, and KYA/KYAPay positioning.
- Basis Theory: tokenization and shared payment-token infrastructure for agentic commerce.
- Rye: checkout orchestration and agentic commerce infrastructure.
- FERMAT: AI-native commerce journeys and checkout-adjacent conversion experiences.
- Nekuda: agentic payments infrastructure.

These reinforce the same conclusion: infrastructure layers are capital-heavy and competitive, while merchant readiness remains accessible to a solo founder.

