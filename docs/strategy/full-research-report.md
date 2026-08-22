# Full Research Report


## Evidence Base and Market Reality

Useful signals from 2025-2026:

- OpenAI and Stripe launched the Agentic Commerce Protocol (ACP), with Instant Checkout in ChatGPT and an open standard for commerce flows between buyers, agents, and merchants. Source: [OpenAI](https://openai.com/index/buy-it-in-chatgpt/), [Stripe](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce), [OpenAI developer docs](https://developers.openai.com/commerce).
- Stripe says ACP is meant to let businesses sell through AI agents while keeping control of catalog, fulfillment, and customer relationships. Source: [Stripe](https://stripe.com/newsroom/news/stripe-openai-instant-checkout).
- Google announced Agent Payments Protocol (AP2), an open protocol for secure agent-led payments that extends A2A and MCP concepts. Source: [Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol), [AP2 docs](https://ap2-protocol.org/).
- Anthropic introduced MCP as an open standard for connecting AI apps to tools and data. Source: [Anthropic](https://www.anthropic.com/news/model-context-protocol).
- Google launched A2A for agent interoperability and later donated it to the Linux Foundation. Source: [Google Developers Blog](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/), [Google donation post](https://developers.googleblog.com/en/google-cloud-donates-a2a-to-linux-foundation/).
- Visa Intelligent Commerce focuses on secure AI-initiated transactions with payment credentials, controls, authentication, and protections. Source: [Visa](https://www.visa.com/en-us/solutions/intelligent-commerce).
- Mastercard Agent Pay focuses on secure AI-agent payment experiences, with later expansion into machine payments. Source: [Mastercard Agent Pay](https://www.mastercard.com/us/en/news-and-trends/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai.html), [Agent Pay for Machines](https://www.mastercard.com/us/en/news-and-trends/press/2026/june/mastercard-launches-agent-pay-for-machines.html).
- Shopify reports Q1 2026 AI-driven traffic to Shopify stores grew 8x year over year and orders from AI-powered searches grew nearly 13x. Source: [Shopify](https://www.shopify.com/blog/how-agentic-commerce-works), [Shopify enterprise AI search insights](https://www.shopify.com/enterprise/blog/ai-search-insights).
- Adobe reported generative-AI traffic to US retail sites rose 1,200% from July 2024 to February 2025. Source: [Adobe](https://blog.adobe.com/en/publish/2025/03/17/adobe-analytics-traffic-to-us-retail-websites-from-generative-ai-sources-jumps-1200-percent).
- McKinsey estimates agents could mediate $3 trillion to $5 trillion of global consumer commerce by 2030 under moderate scenarios. Source: [McKinsey](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-automation-curve-in-agentic-commerce).
- Deloitte reports agentic AI usage is expected to rise sharply, but governance is lagging: only about one in five companies has mature governance for autonomous agents. Source: [Deloitte State of AI](https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html), [Deloitte insights](https://www.deloitte.com/us/en/insights/topics/emerging-technologies/ai-agents-scaling-faster.html).
- Gartner predicts 33% of enterprise software applications will include agentic AI by 2028, but also warns that over 40% of agentic AI projects may be canceled by the end of 2027. Source: [Gartner cancellation forecast](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027), [Gartner enterprise app forecast](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025).

Interpretation: demand exists, but it is strongest in "prepare my existing business for AI-mediated buying" and "automate painful commerce workflows," not in speculative consumer agents that require mass behavioral change.

## Agentic Commerce Ecosystem Map

| Layer | What it does | Example players/protocols | Money flow |
|---|---|---|---|
| Foundation models | Reasoning, planning, multimodal understanding | OpenAI, Google Gemini, Anthropic, Meta, open-weight models | API usage, subscriptions, enterprise contracts |
| Agent development frameworks | Build, orchestrate, test, and run agents | LangGraph, CrewAI, AutoGen, Google ADK, OpenAI Agents SDK, LlamaIndex | Developer tooling, cloud usage, support |
| Tool access and MCP | Connect agents to data, APIs, apps, files, stores | MCP, MCP servers, app/tool connectors | SaaS connectors, implementation fees, usage |
| Agent-to-agent protocols | Let agents discover capabilities and coordinate | Google A2A, Linux Foundation A2A | Platform control, enterprise integration |
| Commerce protocols | Make product discovery and checkout agent-readable | ACP, AP2, emerging commerce specs, Shopify Catalog | Merchant onboarding, transaction fees, platform fees |
| Product data layer | Catalog feeds, schema, availability, pricing, shipping, returns | Shopify, Google Merchant Center, PIMs, feed tools | SaaS, agency services, higher conversion |
| Discovery layers | AI shopping answers, product recommendations, agent search | ChatGPT shopping, Gemini, Perplexity, Copilot, Daydream | Ads, affiliate, merchant fees, subscriptions |
| Identity/authentication | Know the user, agent, merchant, and delegated authority | Visa, Mastercard, FIDO, passkeys, verifiable credentials | Authentication fees, risk products, network fees |
| Payments and wallets | Tokenized payments, spending limits, stablecoins, agent wallets | Stripe, Visa, Mastercard, PayPal, Crossmint, Nevermined, Coinbase x402 | Payment take rate, wallet fees, settlement fees |
| Trust, fraud, security | Agent permissions, fraud detection, bot distinction, monitoring | Visa, Mastercard, Stripe Radar, security startups | Risk fees, enterprise subscriptions |
| Governance and audit | Policies, logs, approvals, compliance, explainability | Enterprise AI governance vendors, consulting firms | SaaS seats, audits, compliance retainers |
| Marketplace infrastructure | Where agents/tools/merchants are listed and transacted | GPTs, MCP registries, Shopify app ecosystem, agent marketplaces | Listing fees, rev share, subscriptions |
| Vertical agents | Agents for procurement, travel, fashion, retail ops, B2B buying | Daydream, Perplexity shopping, enterprise procurement agents | SaaS, transaction fees, affiliate, services |
| Integration and operations | Make existing merchants and workflows agent-compatible | Agencies, consultants, system integrators, solo specialists | Setup fees, retainers, project work |

## Value Chain: Where Money Flows

1. Consumer or business buyer expresses intent in an AI assistant.
2. Discovery platform ranks products, services, vendors, or workflows.
3. Agent queries merchant data, product feeds, reviews, inventory, policies, and pricing.
4. Merchant wins or loses recommendation based on data quality, trust signals, price, availability, shipping, reviews, and AI answer visibility.
5. Checkout occurs through merchant site, embedded checkout, delegated payment, wallet, or protocol-based transaction.
6. Payment network, processor, wallet, and fraud layers take fees.
7. Merchant captures revenue.
8. Data, monitoring, optimization, and governance vendors sell ongoing services to improve conversion and reduce risk.

For a solo founder, the monetizable chokepoint is step 3 and step 4: make merchants legible and attractive to AI agents.

## Layer-by-Layer Defensibility Analysis

Scores: 1 is weak, 10 is strong. "Suitability" measures fit for a zero-capital solo founder.

| Layer | Market size | Maturity | Competition | Defensibility | Ease entry | Speed customer | Solo fit | AI leverage | Notes |
|---|---:|---:|---|---:|---:|---:|---:|---:|---|
| Payment networks | Huge | Medium | Visa, Mastercard, PayPal | 10 | 1 | 1 | 1 | 4 | Dominated by incumbents, regulatory and trust moat. |
| Payment/wallet infrastructure | Huge | Early-medium | Stripe, Crossmint, Nevermined, Coinbase | 8 | 2 | 2 | 2 | 5 | High upside, high compliance and engineering burden. |
| Identity/auth/delegation | Huge | Early | FIDO, networks, IAM vendors | 9 | 2 | 2 | 2 | 5 | Hard but strategically critical. |
| Commerce protocols | Large | Early | OpenAI, Stripe, Google, Shopify | 7 | 3 | 2 | 2 | 6 | Standards work is not a fast revenue path. |
| MCP/tool connectors | Large | Medium | Many developers, SaaS vendors | 5 | 6 | 5 | 6 | 8 | Buildable, but connector commoditization is likely. |
| Agent frameworks | Large | Medium | Open source plus hyperscalers | 4 | 5 | 3 | 4 | 8 | Developer audience is crowded and hard to monetize. |
| Product data readiness | Large | Medium | Agencies, PIM/feed tools | 6 | 8 | 8 | 9 | 9 | Best fit: concrete pain, fast delivery, low cost. |
| AI visibility/GEO for commerce | Large | Early-medium | SEO tools, new AI visibility tools | 6 | 8 | 8 | 9 | 9 | Strong solo-founder wedge if positioned around revenue. |
| Vertical commerce agents | Medium-large | Early | Startups, agencies, marketplaces | 6 | 6 | 5 | 7 | 9 | Good if narrowed to one buying workflow. |
| Workflow automation | Large | Medium | Agencies, Zapier, Make, n8n, SI firms | 5 | 8 | 9 | 9 | 9 | Fastest cash if sold as ROI automation. |
| Governance/audit | Large | Early | Big consultancies, GRC vendors | 7 | 6 | 5 | 7 | 8 | Good for founder strong in systems and research. |
| Monitoring/evaluation | Medium-large | Early | Observability/eval vendors | 7 | 6 | 5 | 7 | 8 | Better after consulting wedge produces data. |
| Marketplaces | Potentially huge | Early | Platforms have distribution | 8 | 3 | 2 | 2 | 6 | Requires liquidity, usually not zero-capital friendly. |
| Consumer shopping agent | Huge | Early | OpenAI, Perplexity, Amazon, Google | 5 | 4 | 3 | 3 | 8 | Distribution problem is brutal. |
| Enterprise procurement agents | Huge | Early-medium | ERP/procurement vendors, startups | 8 | 3 | 3 | 3 | 7 | Long sales cycles, integration burden. |

Best balance of defensibility and accessibility: **AI commerce readiness plus AI visibility monitoring for specific verticals**. It is accessible because it starts as consulting. It can become defensible through proprietary benchmarks, repeated test prompts, vertical datasets, before/after case studies, and merchant-specific monitoring.

## Business Model Analysis

| Model | Revenue model | Startup cost | MVP time | First sale time | Customer | Pricing | Margins | Success likelihood |
|---|---|---:|---:|---:|---|---|---:|---:|
| Agentic commerce readiness service | Fixed-fee audit plus implementation | $0-$100 | 3-7 days | 7-21 days | Shopify/ecommerce brands | $750-$5,000 | 70-90% | High |
| AI visibility/GEO monitoring | SaaS plus setup | $0-$100 | 14-30 days | 14-45 days | Brands, agencies | $99-$499/mo | 80%+ | Medium-high |
| Product-feed enrichment service | Project fee or retainer | $0 | 3-10 days | 7-21 days | Merchants with messy catalogs | $500-$3,000 | 75-90% | High |
| Vertical buying agent | SaaS or usage | $0-$300 | 21-45 days | 30-90 days | Niche B2B buyers | $49-$500/mo | 60-85% | Medium |
| Workflow automation agency | Project and retainer | $0-$100 | 3-10 days | 3-21 days | SMB operations teams | $1,000-$10,000 | 70-90% | High |
| MCP connector niche | Open source plus paid hosted connector | $0-$200 | 14-30 days | 30-90 days | Developers, operators | $19-$299/mo | 80%+ | Medium |
| Agent evaluation toolkit | SaaS | $0-$300 | 21-45 days | 45-120 days | AI teams, agencies | $99-$1,000/mo | 80%+ | Medium |
| Governance templates/playbooks | Digital product plus consulting | $0 | 3-14 days | 7-30 days | SMEs, agencies, compliance teams | $49-$2,500 | 90%+ | Medium-high |
| Agent security review | Audit fee | $0 | 7-21 days | 21-60 days | Startups deploying agents | $1,500-$10,000 | 80%+ | Medium |
| Agent marketplace | Listing/rev share | $100-$1,000 | 30-90 days | 90+ days | Agent builders/users | 10-30% take | Variable | Low |
| Affiliate AI shopping site | Affiliate commission | $0-$100 | 7-21 days | 30-90 days | Consumers | 1-20% commission | High | Medium-low |
| Prompt systems for ecommerce teams | Templates, training, implementation | $0 | 3-7 days | 7-21 days | Merchants, agencies | $49-$2,000 | 90%+ | Medium |
| Enterprise consulting | Day rate/project | $0 | 7-14 days | 30-120 days | Mid-market/enterprise | $5,000-$50,000 | 70-90% | Medium |
| Voice commerce agent setup | Project plus usage | $0-$300 | 14-30 days | 30-60 days | Premium brands, local services | $1,500-$8,000 | 60-85% | Medium |
| Compliance monitoring | Retainer | $0-$300 | 21-45 days | 45-120 days | Regulated AI teams | $500-$5,000/mo | 70-90% | Medium |

## Opportunities Created by AI

AI reduces barriers most where the work is research-heavy, content-heavy, repetitive, or integration-oriented.

| Barrier reduced | Opportunity | How AI helps |
|---|---|---|
| Engineering | No-code/low-code automations, simple dashboards, MCP wrappers, feed validators | Codex and Antigravity can scaffold apps, scripts, tests, and connectors. |
| Design | Audit reports, landing pages, dashboards, productized service collateral | Gemini and design assistants can generate wireframes, copy, tables, and visuals. |
| Marketing | Personalized outbound, competitive audits, SEO/GEO content | AI can produce merchant-specific observations and short sales assets. |
| Operations | Repeated audits, reporting, monitoring, test-prompt runs | Agents can run checklists, scrape structured data, compare outputs, and produce reports. |
| Staffing | Solo founder can deliver agency-like output | AI handles first drafts, code scaffolds, QA checklists, and customer documents. |

The key is not to sell "AI agents" in the abstract. Sell a measurable business result: more AI-referred visibility, fewer catalog errors, faster quoting, reduced manual ops, or better checkout readiness.

## SWOT for the Top Opportunities

### 1. Shopify Agentic Commerce Readiness Sprint

Strengths: immediate merchant pain, low build cost, evidence-backed demand, easy to demonstrate with live AI-search tests.

Weaknesses: service-heavy at first, results can be noisy because AI answers vary.

Opportunities: convert audits into monthly monitoring, sell to agencies, create vertical benchmarks.

Threats: Shopify and SEO platforms may productize parts of this.

### 2. AI Search Visibility Audit

Strengths: extremely fast to package, clear before/after deliverable, strong fit for research and prompt engineering.

Weaknesses: may be perceived as "new SEO" unless tied to revenue and conversion.

Opportunities: category-specific prompt libraries and tracking dashboards.

Threats: low-cost tools and agencies entering fast.

### 3. Product-Feed/Schema Cleanup

Strengths: concrete implementation, measurable issues, close to purchase intent.

Weaknesses: platform-specific details can create support work.

Opportunities: Shopify, WooCommerce, Google Merchant Center, marketplaces.

Threats: commoditized if sold as generic data cleanup.

### 4. B2B Quote/Procurement Automation

Strengths: high willingness to pay, direct ROI, less hype-dependent.

Weaknesses: requires workflow discovery and integrations.

Opportunities: wholesalers, distributors, industrial suppliers, medical supply, office services.

Threats: longer sales cycles and messy legacy systems.

### 5. AI Visibility Monitoring for Agencies

Strengths: agencies already resell reports, recurring revenue potential.

Weaknesses: requires reliable automation and reporting.

Opportunities: white-label dashboards and weekly insight emails.

Threats: SEO platforms add similar capabilities.

