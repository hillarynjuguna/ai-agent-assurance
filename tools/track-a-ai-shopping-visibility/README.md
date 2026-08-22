# AI Shopping Visibility Snapshot Toolkit v2

This is a cleaned, more conservative version of the Antigravity GEO audit prototype.

It is designed for first-pass merchant prospecting, not for making guaranteed ranking or lost-revenue claims.

## What It Checks

- AI crawler accessibility in `robots.txt`
- Shopify-style `/products.json` availability
- Product-page JSON-LD schema on sampled product pages
- Product content completeness signals
- Trust and policy page signals
- Experimental agent manifest presence

## What It Does Not Claim

- It does not prove lost AI traffic.
- It does not prove broken agent transactions.
- It does not treat `/.well-known/mcp.json` as a mandatory standard.
- It does not guarantee ChatGPT, Gemini, Perplexity, or Google AI Mode rankings.

## Usage

```powershell
python ai_shopping_visibility_audit.py https://allbirds.com
python ai_shopping_visibility_audit.py https://allbirds.com https://gymshark.com --json
```

Outputs are written to the current directory:

- `visibility_snapshot_<domain>.md`
- `visibility_snapshot_<domain>.json`
- `batch_outreach_summary.json` when multiple URLs are supplied

## Suggested Offer

Use this as a teaser for a paid audit:

- Free teaser: 5 to 10 checks, one-page snapshot.
- Paid audit: $750 to $1,500, deeper product-page sampling, competitor prompts, AI-answer screenshots, and fix plan.

## Safer Outreach Copy

Subject: Quick AI shopping visibility check for `{{domain}}`

Hi `{{brand}}` team,

I ran a quick machine-readability snapshot on `{{domain}}` to see how easily AI shopping assistants and search systems can interpret your catalog.

I found a few readiness gaps worth reviewing:

`{{findings}}`

This does not mean you are losing sales today. It does suggest there may be low-effort improvements to make your products easier for AI systems to parse, compare, and cite.

Worth sending the one-page snapshot?

