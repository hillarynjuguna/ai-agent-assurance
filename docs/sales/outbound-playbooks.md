# Track B Outbound Playbook: API-to-MCP Wrapper Service

## Objective

Validate whether B2B SaaS/API companies will pay for a productized MCP wrapper service.

## Offer

> We turn your existing REST or GraphQL API into a secure, discoverable MCP server in 7 days.

## Target Customer

Prioritize companies with:

- Public API docs.
- Useful data or workflow actions.
- Developer, data, analytics, ecommerce, CRM, support, billing, or operations products.
- No visible MCP server.
- Small enough that founders or product leaders reply directly.

Avoid:

- Enterprise-only companies.
- Heavily regulated data unless you already understand the compliance surface.
- APIs dominated by destructive actions.
- Companies with no public docs or no clear use case for agent access.

## Prospect Search Queries

Use search, LinkedIn, GitHub, or directories:

- `"API docs" "pricing" "startup" "analytics"`
- `"REST API" "developer docs" "Shopify app"`
- `"GraphQL API" "B2B SaaS" "docs"`
- `"public API" "CRM" "startup"`
- `"developer docs" "no MCP"`
- `"API reference" "ecommerce data"`

## Qualification Checklist

Score each prospect 0-2:

| Signal | 0 | 1 | 2 |
|---|---|---|---|
| Public API quality | none | minimal | clear docs |
| Agent value | unclear | plausible | obvious |
| Buyer reachable | no | maybe | founder/product/CTO visible |
| Integration size | too complex | medium | simple |
| MCP gap | already has MCP | unknown | no MCP found |

Contact prospects scoring 7+ out of 10.

## Cold Email 1

Subject: MCP wrapper idea for {{company}}

Hi {{first_name}},

I was looking at {{company}}'s API docs and noticed you have a few endpoints that look naturally useful for AI agents, especially {{specific_endpoint_or_use_case}}.

I built a small demo showing how a legacy REST API can be exposed as a Model Context Protocol server with narrow tools, typed inputs, and safe outputs.

The practical offer is simple: turn 1-3 high-value API actions into a working MCP server in 7 days, with docs and a test harness.

Worth sending the demo and a 2-minute note on which {{company}} endpoints I would wrap first?

Best,
{{name}}

## Cold Email 2

Subject: making {{company}} usable by AI agents

Hi {{first_name}},

Most APIs are still built for human developers reading docs. MCP changes the interface: agents need clear tools, typed inputs, and constrained actions.

I think {{company}} could expose {{specific_action}} as an MCP tool without rebuilding the core product.

I can send a short teardown showing:

- Which endpoints map cleanly to MCP tools.
- What the first server would expose.
- What I would avoid exposing for safety.

Useful?

## LinkedIn DM

Saw your API docs for {{company}}. I’m testing a productized service that wraps existing REST/GraphQL APIs into MCP servers so AI agents can call approved actions safely. I have a working demo and can map 2-3 candidate tools for {{company}} if useful.

## Discovery Call Questions

1. Which API actions do customers already struggle to integrate?
2. Are customers asking about ChatGPT, Claude, Gemini, Copilot, or internal agents?
3. Which actions are read-only and safe to expose first?
4. What auth model do you use today?
5. Would a demo MCP server help sales, support, developer relations, or product adoption?

## First Paid Package

Starter MCP Wrapper: $1,500

Includes:

- 1-2 read-only tools.
- Input validation.
- Stdio MCP server.
- Smoke test.
- README.
- Host config sample.
- Safety recommendations.

Upsell:

- Authenticated tools.
- Hosted deployment.
- Write-action approval gates.
- Logging and monitoring.
- Customer-facing docs.

## Success Metrics

For the 50-prospect test:

- 50 personalized messages sent.
- 5+ replies.
- 2+ calls.
- 1 paid starter project or strong verbal buying signal.

If Track B gets fewer replies than Track A, keep it as a secondary offer.
