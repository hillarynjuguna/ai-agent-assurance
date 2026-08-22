# AI Shopping Visibility Snapshot

Target: [tentree.com](https://tentree.com)
Date: 2026-08-08T12:53:28
Readiness score: **67 / 100** (Moderate)

This snapshot estimates how easy it is for AI shopping assistants and search systems to interpret the store's catalog. It is not proof of lost traffic or guaranteed AI ranking performance.

## Checks

| Check | Score | Status | Details |
|---|---:|---|---|
| AI crawler accessibility | 15 / 15 | Pass | No sampled AI crawlers appear fully blocked. |
| Machine-readable catalog endpoint | 15 / 15 | Pass | Found 20 products from /products.json sample. |
| Product-page structured data | 0 / 25 | Review | 0/5 sampled product pages had Product JSON-LD; 0 had price; 0 had availability. |
| Catalog content completeness | 20 / 20 | Pass | Descriptions: 5/5; images: 5/5; variants: 5/5; tags: 5/5. |
| Merchant trust and policy signals | 10 / 10 | Pass | Detected trust/policy signals: shipping, returns, contact, reviews, faq |
| Experimental agent/API manifest | 0 / 5 | Review | No experimental agent/API manifest detected. This is forward-looking, not currently mandatory. |

## Sampled Product URLs

- https://tentree.com/products/treeblend-baker-t-shirt-cottage-red-heather
- https://tentree.com/products/treeblend-baker-t-shirt-blue-horizon-heather
- https://tentree.com/products/treeblend-baker-t-shirt-ashwood-heather
- https://tentree.com/products/treeblend-baker-hooded-longsleeve-red-chestnut-heather
- https://tentree.com/products/treeblend-baker-hooded-longsleeve-ashwood-heather

## Recommended Next Actions

1. Improve Product and Offer JSON-LD on product pages, including price, availability, SKU, images, and canonical URL.
2. Track ACP/AP2/MCP-style discovery standards, but prioritize proven product data and schema fixes first.

## Outreach Summary

Subject: Quick AI shopping visibility check for tentree.com

Hi Tentree team,

I ran a quick machine-readability snapshot on tentree.com to see how easily AI shopping assistants and search systems can interpret your catalog.

I found a few readiness signals worth reviewing:

- Product-page structured data: 0/5 sampled product pages had Product JSON-LD; 0 had price; 0 had availability.
- Experimental agent/API manifest: No experimental agent/API manifest detected. This is forward-looking, not currently mandatory.

This does not mean you are losing sales today. It does suggest there may be low-effort improvements to make your products easier for AI systems to parse, compare, and cite.

Worth sending the one-page snapshot?

