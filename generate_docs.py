import os

dst = r"C:\Users\jacef\Documents\Agentic-Commerce-Zero-Capital-Launch-Kit"

def w(path, content):
    with open(os.path.join(dst, path), "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Model Synthesis
w(r"docs\strategy\model-comparison-synthesis.md", """
# Model Comparison Synthesis

- **Codex / Antigravity**: Identified the fastest path to revenue as AI Shopping Visibility snapshots for Shopify merchants.
- **DeepSeek**: Corroborated the visibility audit approach, emphasizing the importance of product feed hygiene.
- **Gemini Pro**: Highlighted the MCP (Model Context Protocol) 2026-07-28 stateless core release. This insight led to the creation of Track B: the API-to-MCP Wrapper Service for B2B/SaaS companies.
""")

# Market Intelligence
w(r"docs\market-intelligence\claims-to-treat-carefully.md", """
# Claims to Treat Carefully

- **Affiliate MCP Servers**: Expecting agents to blindly trust affiliate links in MCP discovery registries is highly speculative. Do not rely on this for early revenue.
- **Consumer Wallets**: Agent-controlled wallets and payment networks (like AP2/ACP) are infrastructure plays, not services a zero-capital founder should sell directly.
- **Immediate Lost Traffic**: Avoid claiming "you are losing $X to AI search." Use "AI Shopping Visibility Snapshot" to show where they rank, letting the merchant draw the conclusion.
""")

w(r"docs\sales\qualification-checklists.md", """
# Qualification Checklists

## Track A: Shopify Merchants
- [ ] Revenue: $1M - $10M
- [ ] Platform: Shopify or similar structured catalog
- [ ] Sector: High consideration products (supplements, skincare, outdoor gear, B2B)
- [ ] Need: Existing SEO/ads spend (proves they care about traffic)

## Track B: API/SaaS Companies
- [ ] Revenue: Seed to Series A ($500k - $5M ARR)
- [ ] Product: Developer tool, data API, or B2B workflow
- [ ] Documentation: Public REST or GraphQL API docs available
- [ ] Gap: No existing official MCP server listed in registries
""")

# Deployment
w(r"deployment\github-setup.md", """
# GitHub Setup

1. Initialize git: `git init`
2. Add files: `git add .`
3. Commit: `git commit -m "Initial commit of Launch Kit"`
4. Push to remote repository.
""")

w(r"deployment\vercel-notes.md", """
# Vercel Deployment Notes

- The MCP Server (Track B) can be deployed to Vercel via Serverless Functions if adapted for HTTP transports (e.g., SSE).
- Currently, the demo uses `stdio` which is best for local execution and direct Claude Desktop integration.
""")

w(r"deployment\local-dev.md", """
# Local Development

- Use Python 3.11+
- Ensure `pip` is updated.
- Run scripts from the root directory or their respective tool directories.
""")

# Root files
w("README.md", """
# Agentic Commerce Zero-Capital Launch Kit

A consolidated repository for a solo founder building productized services in the agentic commerce ecosystem.

## Two Tracks to Revenue
1. **Track A (AI Shopping Visibility)**: Audit Shopify merchants for agentic readiness.
2. **Track B (API-to-MCP Wrapper)**: Turn B2B/SaaS REST APIs into secure MCP servers.

See `docs/strategy/30-day-launch-plan.md` for the execution playbook.

## Tools
- `tools/track-a-ai-shopping-visibility/`: The V2 GEO audit tool.
- `tools/track-b-api-to-mcp-wrapper/`: The MCP server wrapper demo.
""")

w(".gitignore", """
__pycache__/
*.pyc
.venv/
.env
*.log
""")

w("LICENSE", """
MIT License
""")

# Scripts
w(r"scripts\run_track_a_demo.ps1", """
cd ../tools/track-a-ai-shopping-visibility
python ai_shopping_visibility_audit.py --help
""")

w(r"scripts\run_track_b_demo.ps1", """
cd ../tools/track-b-api-to-mcp-wrapper
python client_smoke_test.py
""")

print("Docs generated.")
