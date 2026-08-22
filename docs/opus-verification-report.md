# Opus Verification Report

Date: August 8, 2026
Auditor: Claude Opus 4.6

---

## Track A: AI Shopping Visibility Auditor

### Test 1: Nonexistent domain (adversarial)

```
Command: python ai_shopping_visibility_audit.py https://thisdomaindoesnotexist999999.com --json
CWD: tools/track-a-ai-shopping-visibility/
Result: EXIT 0
```

Output: Score 0, error "Could not reach homepage", outreach "SKIP OUTREACH".
Verdict: **Handles gracefully. PASS.**

### Test 2: Allbirds (historical reference site)

```
Command: python ai_shopping_visibility_audit.py https://allbirds.com --json
CWD: tools/track-a-ai-shopping-visibility/
Result: EXIT 0
```

Output: Score 0, error "Could not reach homepage."
Verdict: **Allbirds blocks the tool's User-Agent. The historical 50/100 score (from V1 geo_audit_engine.py) is NOT reproducible with the canonical V2 tool. The tool correctly outputs SKIP OUTREACH rather than generating misleading findings. PASS for error handling, FAIL for reproducing the historical claim.**

### Test 3: Gymshark (non-Shopify-style large store)

```
Command: python ai_shopping_visibility_audit.py https://gymshark.com --json
CWD: tools/track-a-ai-shopping-visibility/
Result: EXIT 0
```

Output: Score 31/100.
- AI crawler accessibility: 15/15 PASS
- Machine-readable catalog endpoint: 0/15 (no /products.json)
- Product-page structured data: 0/25 (no product pages sampled because no /products.json and no product links discovered from homepage)
- Catalog content completeness: 5/20
- Trust signals: 8/10 PASS
- Agent manifest: 0/5

Verdict: **Tool runs correctly. The low score is an honest reflection: no /products.json means no product sampling. However, the outreach still generates findings for a store that may actually have good structured data on product pages -- the tool simply cannot discover them without /products.json or visible product links. This is a known limitation. PASS with caveat.**

### Test 4: Tentree (Shopify store)

```
Command: python ai_shopping_visibility_audit.py https://tentree.com --json
CWD: tools/track-a-ai-shopping-visibility/
Result: EXIT 0
```

Output: Score 67/100.
- AI crawler accessibility: 15/15 PASS
- Machine-readable catalog endpoint: 15/15 PASS (found 20 products)
- Product-page structured data: 0/25 (0/5 pages had Product JSON-LD, 0 price, 0 availability)
- Catalog content completeness: 20/20 PASS
- Trust signals: 10/10 PASS
- Agent manifest: 0/5

Verdict: **Interesting result. /products.json exists and has good content, but the product pages themselves lack JSON-LD structured data. This is exactly the kind of finding the tool is designed to surface. Score accurately reflects the gap. PASS.**

### Test 5: Batch mode

```
Command: python ai_shopping_visibility_audit.py https://gymshark.com https://tentree.com --json
Result: EXIT 0
```

Output: Both results returned in a JSON array. batch_outreach_summary.json written.
Verdict: **Batch mode works correctly. PASS.**

---

## Track B: API-to-MCP Wrapper

### Test 6: client_smoke_test.py (API wrapper without MCP)

```
Command: python client_smoke_test.py
CWD: tools/track-b-api-to-mcp-wrapper/
Result: EXIT 1 (SSL handshake timeout on second API call)
```

The search_books call succeeded and returned results (including work key OL16151990W). The get_work_details call then timed out with an SSL handshake error. The entire script crashed because client_smoke_test.py has no error handling.

Verdict: **The API wrapper itself works. The smoke test is fragile -- a single network timeout crashes everything. FAIL for resilience. The underlying openlibrary_api.py correctly raises APIError with a clear message.**

### Test 7: MCP server compilation

```
Command: .venv\Scripts\python.exe -m py_compile server.py
CWD: tools/track-b-api-to-mcp-wrapper/
Result: EXIT 0
```

Verdict: **PASS.**

### Test 8: mcp_types import verification

```
Command: .venv\Scripts\python.exe -c "import mcp_types; print('found:', mcp_types.__file__)"
Result: mcp_types found at .venv/Lib/site-packages/mcp_types/__init__.py
```

Verdict: **mcp-types==2.0.0 is a legitimate companion package to mcp==2.0.0. The import is correct. PASS.**

### Test 9: Full MCP stdio smoke test

```
Command: .venv\Scripts\python.exe .\mcp_stdio_smoke_test.py
CWD: tools/track-b-api-to-mcp-wrapper/
Result: EXIT 0
```

Output:
```json
{
  "tools": ["search_books", "get_work_details", "explain_wrapper_pattern"],
  "search_books_result": [... 2 book results for "pricing strategy" ...],
  "explain_wrapper_pattern_result": [... pattern explanation ...]
}
```

Verified behavior:
- MCP client initializes stdio session with server.py
- Client lists 3 tools with correct names
- search_books returns real Open Library results
- explain_wrapper_pattern returns the service explanation

Verdict: **This is a genuine, working MCP server over stdio. PASS.**

### Test 10: Dependency installation from clean venv

```
Command: python -m venv .venv; .venv\Scripts\python.exe -m pip install -r requirements.txt
CWD: tools/track-b-api-to-mcp-wrapper/
Result: Successfully installed mcp-2.0.0, mcp-types-2.0.0, and 33 dependencies
```

Verdict: **Clean install works. PASS.**

---

## Repository Checks

### Test 11: Git status

```
Command: git status
CWD: Agentic-Commerce-Zero-Capital-Launch-Kit/
Result: fatal: not a git repository
```

Verdict: **No git repo initialized. Expected at this stage. Noted.**

### Test 12: Dangerous language search (canonical code only, excluding archive/)

Searched for: "losing AI", "dropping purchase", "guaranteed", "mandatory", "certified", "compliance approval"

Results:
- "losing AI" -- only in archive/ (correctly quarantined)
- "dropping purchase" -- not found outside archive/
- "guaranteed" -- only in disclaimers ("not guaranteed")
- "mandatory" -- only in disclaimers ("not currently mandatory")
- "certified" -- not found in canonical code
- "compliance approval" -- not found

Verdict: **Canonical code is clean. Old aggressive language correctly confined to archive/. PASS.**

### Test 13: Hardcoded path search

Found:
- sample_mcp_config.json: C:\Users\jacef\Documents\Codex\... -- FIXED
- track-d-governability-audit/diff.txt: development artifact -- acceptable
- verification_notes.md line 36: cd C:\Users\jacef\... -- documentation context, acceptable

Verdict: **Critical path fixed. Minor references in docs are contextual. PASS after fix.**

---

## Summary

| Test | Component | Result |
|---|---|---|
| 1 | Track A: nonexistent domain | PASS |
| 2 | Track A: blocked site (Allbirds) | PASS (graceful), historical claim not reproducible |
| 3 | Track A: non-Shopify (Gymshark) | PASS with caveat |
| 4 | Track A: Shopify (Tentree) | PASS |
| 5 | Track A: batch mode | PASS |
| 6 | Track B: client smoke test | FAIL (no error handling) |
| 7 | Track B: server compile | PASS |
| 8 | Track B: mcp_types import | PASS |
| 9 | Track B: MCP stdio test | PASS |
| 10 | Track B: clean install | PASS |
| 11 | Repository: git | No repo (expected) |
| 12 | Outreach: dangerous language | PASS (clean) |
| 13 | Repository: hardcoded paths | PASS (after fix) |
