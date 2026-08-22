# API-to-MCP Wrapper Demo

This demo is Track B for the agentic commerce strategy:

> "We turn your REST/GraphQL API into a secure, discoverable MCP server in 7 days."

It wraps the public Open Library API into a Model Context Protocol server. The business point is not books. The point is proof that a legacy HTTP API can be converted into agent-callable tools with clear schemas, safe inputs, and useful outputs.

## What This Demonstrates

- A legacy REST API can become an MCP tool surface.
- Tools expose narrow, schema-defined actions instead of arbitrary URL fetching.
- The same pattern can wrap SaaS APIs, product catalogs, data feeds, CRMs, documentation systems, or ecommerce backends.
- The core API wrapper is testable without an MCP host.

## Files

| File | Purpose |
|---|---|
| `openlibrary_api.py` | Dependency-free REST API wrapper around Open Library. |
| `server.py` | MCP server exposing the wrapper as agent-callable tools. |
| `client_smoke_test.py` | Local smoke test for the API wrapper core. |
| `mcp_stdio_smoke_test.py` | End-to-end MCP stdio test that lists and calls tools. |
| `requirements.txt` | MCP SDK dependency for running the server. |
| `sample_mcp_config.json` | Example host configuration. |
| `prospect_one_pager.md` | Prospect-facing service description. |

## Quick Smoke Test

This does not require MCP:

```powershell
python client_smoke_test.py
```

Expected result: JSON showing search results for a sample query.

This smoke test has been verified in the current workspace against the live Open Library API. See `sample_output.json` for an example response.

## Run as an MCP Server

Install the verified Python MCP SDK version:

```powershell
python -m pip install -r requirements.txt
```

Run the server over stdio:

```powershell
python server.py
```

Most MCP hosts launch stdio servers themselves, so you usually configure the host rather than running the server manually.

## End-to-End MCP Verification

The live MCP stdio path has been verified in this workspace with a local virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe .\mcp_stdio_smoke_test.py
```

Verified behavior:

- Client initializes an MCP stdio session.
- Client lists tools from `server.py`.
- Client calls `search_books`.
- Client calls `explain_wrapper_pattern`.

The server uses the installed `mcp==2.0.0` low-level `Server` API. It does not use the older `mcp.server.fastmcp` import path.

## Exposed MCP Tools

### `search_books`

Searches Open Library by title, author, or subject.

Inputs:

- `query`: search phrase.
- `limit`: number of results, 1-10.

### `get_work_details`

Fetches details for an Open Library work key returned by `search_books`.

Inputs:

- `work_key`: a key such as `/works/OL45883W`.

### `explain_wrapper_pattern`

Returns a short explanation of how this demo maps to a real SaaS/API wrapper engagement.

## How to Sell This

Use this demo to show B2B SaaS/API prospects:

- "Your API already works for developers. MCP makes it discoverable and usable by AI agents."
- "We can expose only approved actions, with narrow schemas and rate limits."
- "The deliverable is not just code. It includes docs, sample prompts, a test harness, deployment instructions, and safety notes."

## Suggested Service Packaging

Starter wrapper:

- $1,500
- 1-2 tools
- Public or API-key-protected REST API
- Stdio MCP server
- README and test script

Pro wrapper:

- $3,500-$5,000
- 3-6 tools
- Authentication
- Input validation
- Hosted HTTP transport option
- Example prompts and QA checklist

## Outbound Test

Use this alongside the ecommerce visibility offer:

- Send Track A to 50 Shopify/ecommerce merchants.
- Send Track B to 50 SaaS/API companies.
- Compare reply rate, call-booking rate, and willingness to pay.

Track B prospect filters:

- Has public REST or GraphQL docs.
- Sells data, workflow, analytics, developer tools, commerce, CRM, support, or operations software.
- No obvious MCP server listed in docs.
- Founder/product/CTO reachable by email or LinkedIn.

## Important Caveats

- This demo does not implement OAuth or customer-specific authentication.
- It does not expose arbitrary URL fetching, intentionally.
- Production wrappers should add rate limiting, auth, observability, logging, and secrets management.
- For risky actions like writes, billing, or data deletion, keep human approval in the loop.
