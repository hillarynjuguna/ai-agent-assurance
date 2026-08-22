import os
import sys
import json
import urllib.request
import urllib.parse
import re
from datetime import datetime

class AgenticGeoAuditor:
    """
    Agentic Commerce Readiness & GEO (Generative Engine Optimization) Auditor.
    Evaluates whether an e-commerce storefront is legible, discoverable, and actionable
    for autonomous AI agents (ChatGPT, Claude, Perplexity, Gemini).
    """

    def __init__(self, target_url: str):
        # Normalize URL
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            target_url = "https://" + target_url
        self.target_url = target_url.rstrip("/")
        self.domain = urllib.parse.urlparse(self.target_url).netloc
        
        self.results = {
            "target_url": self.target_url,
            "domain": self.domain,
            "timestamp": datetime.now().isoformat(),
            "score": 0,
            "max_score": 100,
            "checks": {},
            "recommendations": [],
            "generated_mcp_manifest": None,
            "generated_jsonld_schema": None
        }

    def fetch_url(self, path: str = "", timeout: int = 8) -> tuple[int, str]:
        """Utility to fetch page or endpoint content."""
        url = self.target_url + path if path else self.target_url
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgenticCommerceBot/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.status, response.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            return e.code, ""
        except Exception as e:
            return 0, ""

    def audit_robots_txt(self):
        """Check if AI Agent crawlers are allowed in robots.txt."""
        status, content = self.fetch_url("/robots.txt")
        crawlers = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"]
        blocked_bots = []
        allowed_bots = []

        if status == 200 and content:
            for bot in crawlers:
                if f"User-agent: {bot}" in content and "Disallow: /" in content:
                    blocked_bots.append(bot)
                else:
                    allowed_bots.append(bot)
            
            is_passed = len(blocked_bots) == 0
            score = 20 if is_passed else (10 if len(blocked_bots) < 3 else 0)
        else:
            is_passed = True  # Default open if no robots.txt
            score = 20
            allowed_bots = crawlers

        self.results["checks"]["robots_txt"] = {
            "name": "AI Crawler Accessibility (robots.txt)",
            "passed": is_passed,
            "score": score,
            "max": 20,
            "details": f"Allowed Bots: {', '.join(allowed_bots)} | Blocked Bots: {', '.join(blocked_bots) if blocked_bots else 'None'}"
        }
        if blocked_bots:
            self.results["recommendations"].append(f"Unblock AI crawlers ({', '.join(blocked_bots)}) in robots.txt to allow product discovery.")

    def audit_json_ld_schemas(self, html_content: str):
        """Check for valid Product & Offer JSON-LD schemas."""
        json_ld_blocks = re.findall(r'<script\s+type=["\']application/ld\+json["\']\s*>(.*?)</script>', html_content, re.DOTALL | re.IGNORECASE)
        found_product_schema = False
        found_offer_schema = False
        found_availability = False
        found_price = False

        for block in json_ld_blocks:
            try:
                data = json.loads(block.strip())
                items = data if isinstance(data, list) else [data]
                for item in items:
                    item_type = item.get("@type", "")
                    if item_type == "Product" or (isinstance(item_type, list) and "Product" in item_type):
                        found_product_schema = True
                        offers = item.get("offers", {})
                        if offers:
                            found_offer_schema = True
                            if isinstance(offers, list):
                                offers = offers[0]
                            if "price" in offers or "lowPrice" in offers:
                                found_price = True
                            if "availability" in offers:
                                found_availability = True
            except Exception:
                continue

        score = 0
        if found_product_schema: score += 10
        if found_offer_schema: score += 5
        if found_price: score += 5
        if found_availability: score += 5

        self.results["checks"]["json_ld_schema"] = {
            "name": "Structured Data Legibility (JSON-LD Product/Offer Schema)",
            "passed": found_product_schema and found_price and found_availability,
            "score": score,
            "max": 25,
            "details": f"Product Schema: {'✓' if found_product_schema else '✗'}, Offer Schema: {'✓' if found_offer_schema else '✗'}, Price: {'✓' if found_price else '✗'}, Stock Availability: {'✓' if found_availability else '✗'}"
        }

        if not found_product_schema or not found_availability:
            self.results["recommendations"].append("Inject full JSON-LD Product & Offer schemas with real-time stock availability and exact price fields.")

    def audit_mcp_manifest(self):
        """Check for /well-known/mcp.json or agentic commerce manifest."""
        status_mcp, content_mcp = self.fetch_url("/.well-known/mcp.json")
        status_agent, content_agent = self.fetch_url("/.well-known/agentic-commerce.json")

        has_manifest = (status_mcp == 200 and len(content_mcp) > 10) or (status_agent == 200 and len(content_agent) > 10)
        score = 25 if has_manifest else 0

        self.results["checks"]["mcp_manifest"] = {
            "name": "Model Context Protocol (MCP) Manifest Endpoint",
            "passed": has_manifest,
            "score": score,
            "max": 25,
            "details": "Found /.well-known/mcp.json" if status_mcp == 200 else ("Found /.well-known/agentic-commerce.json" if status_agent == 200 else "Missing Agentic MCP Manifest Endpoint")
        }

        if not has_manifest:
            self.results["recommendations"].append("Deploy a standard /.well-known/mcp.json manifest so AI shopping agents can discover product APIs directly.")

    def audit_products_api(self):
        """Check if store exposes machine-readable products.json (e.g. Shopify)."""
        status, content = self.fetch_url("/products.json?limit=5")
        has_api = False
        product_count = 0

        if status == 200 and content:
            try:
                data = json.loads(content)
                if "products" in data and isinstance(data["products"], list):
                    has_api = True
                    product_count = len(data["products"])
            except Exception:
                pass

        score = 30 if has_api else 0
        self.results["checks"]["products_api"] = {
            "name": "Machine-Readable Product Catalog API Endpoint",
            "passed": has_api,
            "score": score,
            "max": 30,
            "details": f"Accessible /products.json exposing {product_count}+ structured products" if has_api else "No public structured JSON catalog API detected"
        }

        if not has_api:
            self.results["recommendations"].append("Expose an unauthenticated, rate-limited `/api/agent-catalog.json` feed for real-time AI product queries.")

    def generate_fix_artifacts(self, store_name: str):
        """Generate ready-to-deploy MCP manifest & JSON-LD schema template."""
        self.results["generated_mcp_manifest"] = {
            "name": f"{store_name} Agentic Commerce API",
            "version": "1.0.0",
            "description": f"Official Model Context Protocol endpoint for autonomous shopping agents searching {store_name}.",
            "endpoints": {
                "catalog": f"{self.target_url}/products.json",
                "search": f"{self.target_url}/search/suggest.json?q={{query}}",
                "cart_checkout": f"{self.target_url}/cart/add"
            },
            "capabilities": ["product_search", "realtime_stock", "direct_cart_link"],
            "agentic_protocol_version": "UCP/1.0"
        }

        self.results["generated_jsonld_schema"] = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "SAMPLE PRODUCT NAME",
            "image": [f"{self.target_url}/cdn/sample-image.jpg"],
            "description": "High-legibility product description optimized for LLM indexing.",
            "sku": "SKU-12345",
            "offers": {
                "@type": "Offer",
                "url": f"{self.target_url}/products/sample-product",
                "priceCurrency": "USD",
                "price": "49.99",
                "availability": "https://schema.org/InStock",
                "itemCondition": "https://schema.org/NewCondition"
            }
        }

    def run_full_audit(self):
        """Run all audits and compute final GEO score."""
        status, html_content = self.fetch_url()
        if status != 200 or not html_content:
            print(f"[-] Error: Unable to reach target URL: {self.target_url} (HTTP Status {status})")
            return self.results

        self.audit_robots_txt()
        self.audit_json_ld_schemas(html_content)
        self.audit_mcp_manifest()
        self.audit_products_api()

        total_score = sum(c["score"] for c in self.results["checks"].values())
        self.results["score"] = total_score
        self.generate_fix_artifacts(self.domain.split(".")[0].capitalize())

        return self.results

    def generate_markdown_report(self) -> str:
        res = self.results
        score = res["score"]
        status_emoji = "🟢 PASS (Agent Ready)" if score >= 80 else ("🟡 WARNING (Partially Legible)" if score >= 50 else "🔴 CRITICAL (Invisible to AI Agents)")

        md = f"""# Agentic Commerce & GEO Readiness Audit Report
**Target Store**: [{res['domain']}]({res['target_url']})  
**Audit Date**: {res['timestamp']}  
**Overall Readiness Score**: **{score} / 100** — {status_emoji}

---

## Executive Summary
This store was evaluated for **Machine Legibility, AI Crawler Accessibility, and Agentic Protocol Readiness**. 
When autonomous AI agents (ChatGPT, Perplexity, Claude) search for products on behalf of buyers, they rely on structured APIs and schemas rather than visual HTML.

Current Status: **{score}% Machine Legibility**. High risk of dropped agent checkout conversions.

---

## Audit Breakdown

| Indicator | Score | Status | Details |
| :--- | :---: | :---: | :--- |
"""
        for check in res["checks"].values():
            status = "✓ Pass" if check["passed"] else "✗ Fail"
            md += f"| **{check['name']}** | {check['score']} / {check['max']} | {status} | {check['details']} |\n"

        md += "\n---\n\n## Actionable Recommendations\n"
        for i, rec in enumerate(res["recommendations"], 1):
            md += f"{i}. **{rec}**\n"

        md += f"""\n---\n\n## Ready-to-Deploy Drop-in Solutions

### 1. Generated Model Context Protocol Manifest (`/.well-known/mcp.json`)
```json
{json.dumps(res['generated_mcp_manifest'], indent=2)}
```

### 2. High-Legibility JSON-LD Schema Snippet
```json
{json.dumps(res['generated_jsonld_schema'], indent=2)}
```

---
*Report Generated by Agentic GEO Audit Engine v1.0*
"""
        return md


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        target = "https://shopify.com"

    print(f"[*] Starting Agentic GEO Audit for: {target}")
    auditor = AgenticGeoAuditor(target)
    results = auditor.run_full_audit()

    report_md = auditor.generate_markdown_report()
    report_filename = "geo_audit_result.md"
    
    with open(report_filename, "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"[+] Audit Complete! Overall GEO Score: {results['score']}/100")
    print(f"[+] Detailed Audit Report saved to: {report_filename}")
