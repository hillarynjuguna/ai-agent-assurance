# Verification Report

Date: August 8, 2026 (replaces August 5, 2026 report)

## Track A: AI Shopping Visibility

**Status:** PASS (with caveats)

**Commands executed:**
```
python ai_shopping_visibility_audit.py https://thisdomaindoesnotexist999999.com --json
python ai_shopping_visibility_audit.py https://allbirds.com --json
python ai_shopping_visibility_audit.py https://gymshark.com https://tentree.com --json
```

**Results:**
- Nonexistent domain: Score 0, SKIP OUTREACH (graceful error handling).
- Allbirds: Score 0 -- site blocks the tool's HTTP requests. Cannot produce results for Allbirds.
- Gymshark: Score 31 -- no /products.json, limited product discovery from homepage.
- Tentree: Score 67 -- /products.json found (20 products), but 0/5 product pages had JSON-LD.

**Caveats:** The tool requires the target site to be reachable and not blocking the User-Agent. Sites behind Cloudflare or aggressive bot protection will return score 0 with SKIP OUTREACH. Non-Shopify stores without /products.json lose 15 points automatically.

## Track B: API-to-MCP Wrapper Service

**Status:** PASS

**Commands executed:**
```
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m py_compile server.py
.\.venv\Scripts\python.exe .\mcp_stdio_smoke_test.py
```

**Results:**
- `mcp[cli]==2.0.0` and `mcp-types==2.0.0` installed successfully in local `.venv`.
- `server.py` compiles without errors.
- `mcp_stdio_smoke_test.py` successfully launched `server.py` over stdio, listed 3 tools (`search_books`, `get_work_details`, `explain_wrapper_pattern`), and invoked `search_books` and `explain_wrapper_pattern` with correct JSON responses.
- `client_smoke_test.py` works for the API wrapper layer but originally crashed on network timeouts. Error handling added.

## Documentation Checks

**Status:** PASS (after fixes)
- Stale path reference in `docs/sales/track-a-shopify-visibility-offer.md` corrected.
- Hardcoded development path in `sample_mcp_config.json` replaced with placeholder.
- `.gitignore` updated to cover nested project artifacts.

## Note on Previous Verification (August 5, 2026)

The original verification report only ran `python ai_shopping_visibility_audit.py --help` for Track A, which proves the script compiles but does not verify it produces correct results against live sites. This updated report includes actual live-site audit results.
