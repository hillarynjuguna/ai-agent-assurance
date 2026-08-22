import re
import os
import shutil

source_file = r"C:\Users\jacef\Documents\Codex\2026-08-05\deep-research-prompt-agentic-commerce-opportunities\outputs\agentic-commerce-zero-capital-founder-report.md"
dest_dir = r"C:\Users\jacef\Documents\Agentic-Commerce-Zero-Capital-Launch-Kit"

with open(source_file, "r", encoding="utf-8") as f:
    content = f.read()

# Split logic based on headers
sections = re.split(r'\n## ', '\n' + content)

docs = {}
for sec in sections:
    if not sec.strip():
        continue
    if sec.startswith('# Agentic'):
        continue
    
    lines = sec.split('\n', 1)
    title = lines[0].strip()
    body = '## ' + sec.strip() + '\n'
    docs[title] = body

def write_doc(path, titles, intro=None):
    full_path = os.path.join(dest_dir, path)
    with open(full_path, "w", encoding="utf-8") as f:
        if intro:
            f.write(intro + "\n\n")
        for t in titles:
            if t in docs:
                f.write(docs[t] + "\n")
            else:
                print(f"Warning: {t} not found in parsed sections.")

write_doc(r"docs\strategy\executive-summary.md", ["Executive Summary"], "# Executive Summary\n")
write_doc(r"docs\strategy\30-day-launch-plan.md", ["30-Day Roadmap"], "# 30-Day Launch Plan\n")
write_doc(r"docs\strategy\90-day-roadmap.md", ["90-Day Roadmap"], "# 90-Day Roadmap\n")
write_doc(r"docs\strategy\opportunity-ranking.md", ["Decision Matrix: Top 10 Recommendations", "Top 20 Speed-to-Revenue Opportunities"], "# Opportunity Ranking\n")
write_doc(r"docs\strategy\full-research-report.md", [
    "Evidence Base and Market Reality",
    "Agentic Commerce Ecosystem Map",
    "Value Chain: Where Money Flows",
    "Layer-by-Layer Defensibility Analysis",
    "Business Model Analysis",
    "Opportunities Created by AI",
    "SWOT for the Top Opportunities"
], "# Full Research Report\n")

write_doc(r"docs\market-intelligence\competitive-landscape.md", ["Competitive Intelligence"], "# Competitive Landscape\n")
write_doc(r"docs\market-intelligence\references.md", ["References"], "# References\n")

write_doc(r"docs\sales\track-a-shopify-visibility-offer.md", ["Recommended First Product", "Post-Antigravity Artifact Review Addendum"], "# Track A: AI Shopping Visibility Snapshot\n")
write_doc(r"docs\sales\pricing.md", [], "# Pricing\n\nSee `track-a-shopify-visibility-offer.md` for pricing details.\n")

print("Done splitting agentic-commerce-zero-capital-founder-report.md")
