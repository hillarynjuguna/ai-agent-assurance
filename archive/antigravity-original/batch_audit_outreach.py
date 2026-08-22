import os
import json
from geo_audit_engine import AgenticGeoAuditor

def generate_cold_email(domain: str, score: int, missing_checks: list[str]) -> str:
    missing_str = "\n- " + "\n- ".join(missing_checks)
    email = f"""Subject: Urgent: {domain} is losing AI Shopping Agent traffic (ChatGPT/Perplexity)

Hi {domain.split('.')[0].capitalize()} Team,

I ran an autonomous AI shopping agent evaluation on {domain}. 

When AI agents like ChatGPT, Claude, and Perplexity attempt to search for products on behalf of shoppers, {domain} scored only **{score}/100 in Machine Legibility**.

Key reasons AI agents are currently dropping purchase intents for your store:
{missing_str}

We generated a 1-page Agentic Readiness Audit Report showing exactly where agent transactions break, along with a ready-to-deploy `/.well-known/mcp.json` manifest snippet.

Would you be open to seeing the 60-second video audit and the drop-in schema fix?

Best regards,
Agentic Commerce Readiness Team
"""
    return email

def run_batch_audit(store_urls: list[str]):
    print(f"[*] Starting Batch GEO Audit for {len(store_urls)} stores...")
    summary = []

    for url in store_urls:
        auditor = AgenticGeoAuditor(url)
        res = auditor.run_full_audit()

        domain = res["domain"]
        score = res["score"]
        missing_checks = []
        for key, check in res["checks"].items():
            if not check["passed"]:
                missing_checks.append(check["name"])

        email_script = generate_cold_email(domain, score, missing_checks)
        summary.append({
            "domain": domain,
            "score": score,
            "missing_checks": missing_checks,
            "cold_email": email_script
        })

        print(f"  [+] Audited {domain} -> Score: {score}/100")

    # Save summary report
    with open("batch_outreach_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[+] Batch Audit Complete! Generated outreach templates in batch_outreach_summary.json")

if __name__ == "__main__":
    sample_stores = [
        "https://allbirds.com",
        "https://gymshark.com",
        "https://chubbieswear.com"
    ]
    run_batch_audit(sample_stores)
