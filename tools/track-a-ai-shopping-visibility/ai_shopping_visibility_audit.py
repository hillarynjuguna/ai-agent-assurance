import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from html import unescape
from typing import Any, Dict, Iterable, List, Optional, Tuple


AI_CRAWLERS = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
]


@dataclass
class CheckResult:
    name: str
    score: int
    max_score: int
    passed: bool
    details: str
    evidence: List[str] = field(default_factory=list)


class AIShoppingVisibilityAuditor:
    def __init__(self, target_url: str, sample_size: int = 5, timeout: int = 12) -> None:
        if not target_url.startswith(("http://", "https://")):
            target_url = "https://" + target_url
        self.target_url = target_url.rstrip("/")
        parsed = urllib.parse.urlparse(self.target_url)
        self.domain = parsed.netloc.lower()
        self.sample_size = max(1, sample_size)
        self.timeout = timeout
        self.errors: List[str] = []
        self.product_urls: List[str] = []
        self.product_samples: List[Dict[str, Any]] = []
        self.checks: List[CheckResult] = []

    def fetch(self, path_or_url: str = "") -> Tuple[int, str, str]:
        url = path_or_url if path_or_url.startswith(("http://", "https://")) else self.target_url + path_or_url
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "AIShoppingVisibilitySnapshot/2.0 (+research; contact: audit)",
                "Accept": "text/html,application/json,text/plain,*/*",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode("utf-8", errors="replace")
                final_url = response.geturl()
                return response.status, body, final_url
        except urllib.error.HTTPError as exc:
            return exc.code, "", url
        except Exception as exc:
            self.errors.append(f"Fetch failed for {url}: {exc}")
            return 0, "", url

    def run(self) -> Dict[str, Any]:
        status, homepage, final_url = self.fetch("")
        if status == 0:
            return self.result(error="Could not reach homepage.")

        self.checks.append(self.audit_robots_txt())
        self.checks.append(self.audit_product_api())

        if self.product_urls:
            sampled = self.product_urls[: self.sample_size]
        else:
            sampled = self.discover_product_links(homepage)[: self.sample_size]
        self.product_urls = sampled

        self.checks.append(self.audit_product_schema(sampled))
        self.checks.append(self.audit_content_completeness())
        self.checks.append(self.audit_trust_signals(homepage))
        self.checks.append(self.audit_agent_manifest())

        return self.result()

    def result(self, error: Optional[str] = None) -> Dict[str, Any]:
        total = sum(check.score for check in self.checks)
        max_score = sum(check.max_score for check in self.checks) or 100
        normalized = round((total / max_score) * 100) if max_score else 0
        recommendations = self.recommendations()
        if error:
            recommendations = [
                "Verify the URL, storefront availability, and whether the site blocks automated requests before using this prospect."
            ]
        return {
            "target_url": self.target_url,
            "domain": self.domain,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "score": normalized,
            "raw_score": total,
            "max_score": max_score,
            "error": error,
            "errors": self.errors,
            "sampled_product_urls": self.product_urls,
            "checks": [check.__dict__ for check in self.checks],
            "recommendations": recommendations,
        }

    def audit_robots_txt(self) -> CheckResult:
        status, body, _ = self.fetch("/robots.txt")
        if status == 404:
            return CheckResult(
                "AI crawler accessibility",
                15,
                15,
                True,
                "No robots.txt found; crawlers are generally not explicitly blocked.",
            )
        if status != 200:
            return CheckResult(
                "AI crawler accessibility",
                8,
                15,
                False,
                f"robots.txt could not be read reliably. HTTP status {status}.",
            )

        blocked = []
        for crawler in AI_CRAWLERS:
            rules = self.rules_for_agent(body, crawler)
            if self.is_root_disallowed(rules):
                blocked.append(crawler)

        score = 15 if not blocked else max(0, 15 - len(blocked) * 3)
        return CheckResult(
            "AI crawler accessibility",
            score,
            15,
            not blocked,
            "No sampled AI crawlers appear fully blocked." if not blocked else "Some AI crawlers appear blocked.",
            evidence=[f"Blocked: {', '.join(blocked)}"] if blocked else [],
        )

    def rules_for_agent(self, robots_txt: str, agent: str) -> List[Tuple[str, str]]:
        groups: List[Tuple[List[str], List[Tuple[str, str]]]] = []
        current_agents: List[str] = []
        current_rules: List[Tuple[str, str]] = []

        for raw_line in robots_txt.splitlines():
            line = raw_line.split("#", 1)[0].strip()
            if not line or ":" not in line:
                continue
            key, value = [part.strip() for part in line.split(":", 1)]
            key_lower = key.lower()
            if key_lower == "user-agent":
                if current_agents and current_rules:
                    groups.append((current_agents, current_rules))
                    current_rules = []
                if current_rules:
                    groups.append((current_agents, current_rules))
                    current_agents = []
                    current_rules = []
                current_agents.append(value.lower())
            elif key_lower in {"allow", "disallow"} and current_agents:
                current_rules.append((key_lower, value))

        if current_agents or current_rules:
            groups.append((current_agents, current_rules))

        agent_lower = agent.lower()
        exact_rules = []
        wildcard_rules = []
        for agents, rules in groups:
            if agent_lower in agents:
                exact_rules.extend(rules)
            elif "*" in agents:
                wildcard_rules.extend(rules)
        return exact_rules or wildcard_rules

    def is_root_disallowed(self, rules: Iterable[Tuple[str, str]]) -> bool:
        decisive = None
        for directive, path in rules:
            if path == "/":
                decisive = directive
        return decisive == "disallow"

    def audit_product_api(self) -> CheckResult:
        status, body, _ = self.fetch("/products.json?limit=20")
        if status != 200 or not body:
            return CheckResult(
                "Machine-readable catalog endpoint",
                0,
                15,
                False,
                "No Shopify-style /products.json endpoint detected.",
            )

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return CheckResult(
                "Machine-readable catalog endpoint",
                0,
                15,
                False,
                "/products.json exists but did not return valid JSON.",
            )

        products = data.get("products", [])
        for product in products[: self.sample_size]:
            handle = product.get("handle")
            if handle:
                self.product_urls.append(f"{self.target_url}/products/{handle}")
            self.product_samples.append(product)

        if products:
            return CheckResult(
                "Machine-readable catalog endpoint",
                15,
                15,
                True,
                f"Found {len(products)} products from /products.json sample.",
                evidence=[url for url in self.product_urls[:3]],
            )

        return CheckResult(
            "Machine-readable catalog endpoint",
            5,
            15,
            False,
            "/products.json exists but no products were found in the sample.",
        )

    def discover_product_links(self, html: str) -> List[str]:
        links = set()
        for href in re.findall(r'href=["\']([^"\']*/products/[^"\']+)["\']', html, flags=re.I):
            clean = unescape(href).split("?", 1)[0]
            if clean.startswith("//"):
                clean = "https:" + clean
            elif clean.startswith("/"):
                clean = self.target_url + clean
            elif not clean.startswith(("http://", "https://")):
                clean = urllib.parse.urljoin(self.target_url + "/", clean)
            if urllib.parse.urlparse(clean).netloc.lower() == self.domain:
                links.add(clean.rstrip("/"))
        return sorted(links)

    def audit_product_schema(self, product_urls: List[str]) -> CheckResult:
        if not product_urls:
            return CheckResult(
                "Product-page structured data",
                0,
                25,
                False,
                "No product pages could be sampled.",
            )

        product_schema_count = 0
        price_count = 0
        availability_count = 0
        evidence = []

        for url in product_urls:
            status, html, _ = self.fetch(url)
            time.sleep(0.25)
            if status != 200 or not html:
                continue
            items = self.extract_json_ld_items(html)
            product_items = [item for item in items if self.item_has_type(item, "Product")]
            if product_items:
                product_schema_count += 1
                evidence.append(url)
                offer_items = []
                for item in product_items:
                    offers = item.get("offers")
                    if isinstance(offers, list):
                        offer_items.extend([offer for offer in offers if isinstance(offer, dict)])
                    elif isinstance(offers, dict):
                        offer_items.append(offers)
                if any("price" in offer or "lowPrice" in offer for offer in offer_items):
                    price_count += 1
                if any("availability" in offer for offer in offer_items):
                    availability_count += 1

        sample_total = len(product_urls)
        score = 0
        score += round(12 * product_schema_count / sample_total)
        score += round(7 * price_count / sample_total)
        score += round(6 * availability_count / sample_total)

        return CheckResult(
            "Product-page structured data",
            score,
            25,
            score >= 18,
            f"{product_schema_count}/{sample_total} sampled product pages had Product JSON-LD; {price_count} had price; {availability_count} had availability.",
            evidence=evidence[:5],
        )

    def extract_json_ld_items(self, html: str) -> List[Dict[str, Any]]:
        blocks = re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            flags=re.I | re.S,
        )
        items: List[Dict[str, Any]] = []
        for block in blocks:
            text = unescape(block).strip()
            if not text:
                continue
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue
            items.extend(self.flatten_json_ld(data))
        return items

    def flatten_json_ld(self, data: Any) -> List[Dict[str, Any]]:
        if isinstance(data, list):
            out: List[Dict[str, Any]] = []
            for item in data:
                out.extend(self.flatten_json_ld(item))
            return out
        if isinstance(data, dict):
            graph = data.get("@graph")
            if isinstance(graph, list):
                return [item for item in graph if isinstance(item, dict)] + [data]
            return [data]
        return []

    def item_has_type(self, item: Dict[str, Any], expected: str) -> bool:
        item_type = item.get("@type")
        if isinstance(item_type, str):
            return item_type.lower() == expected.lower()
        if isinstance(item_type, list):
            return any(str(value).lower() == expected.lower() for value in item_type)
        return False

    def audit_content_completeness(self) -> CheckResult:
        if not self.product_samples:
            return CheckResult(
                "Catalog content completeness",
                5,
                20,
                False,
                "No product API sample available; content completeness could not be deeply checked.",
            )

        total = len(self.product_samples)
        descriptions = sum(1 for product in self.product_samples if len(strip_html(product.get("body_html", ""))) > 120)
        images = sum(1 for product in self.product_samples if product.get("images"))
        variants = sum(1 for product in self.product_samples if product.get("variants"))
        tags = sum(1 for product in self.product_samples if product.get("tags"))

        score = round(5 * descriptions / total)
        score += round(5 * images / total)
        score += round(5 * variants / total)
        score += round(5 * tags / total)

        return CheckResult(
            "Catalog content completeness",
            score,
            20,
            score >= 15,
            f"Descriptions: {descriptions}/{total}; images: {images}/{total}; variants: {variants}/{total}; tags: {tags}/{total}.",
        )

    def audit_trust_signals(self, homepage: str) -> CheckResult:
        text = homepage.lower()
        signals = {
            "shipping": "shipping" in text,
            "returns": "return" in text or "refund" in text,
            "contact": "contact" in text or "support" in text,
            "reviews": "review" in text or "rating" in text,
            "faq": "faq" in text or "questions" in text,
        }
        count = sum(1 for value in signals.values() if value)
        score = count * 2
        return CheckResult(
            "Merchant trust and policy signals",
            score,
            10,
            score >= 6,
            "Detected trust/policy signals: " + (", ".join(name for name, present in signals.items() if present) if count > 0 else "None detected on homepage."),
        )

    def audit_agent_manifest(self) -> CheckResult:
        candidates = [
            "/.well-known/agentic-commerce.json",
            "/.well-known/mcp.json",
            "/.well-known/ai-plugin.json",
        ]
        found = []
        for path in candidates:
            status, body, _ = self.fetch(path)
            if status == 200 and len(body.strip()) > 20:
                found.append(path)

        return CheckResult(
            "Experimental agent/API manifest",
            5 if found else 0,
            5,
            bool(found),
            "Found experimental manifest: " + ", ".join(found) if found else "No experimental agent/API manifest detected. This is forward-looking, not currently mandatory.",
            evidence=found,
        )

    def recommendations(self) -> List[str]:
        recs = []
        by_name = {check.name: check for check in self.checks}
        if by_name.get("AI crawler accessibility") and not by_name["AI crawler accessibility"].passed:
            recs.append("Review robots.txt rules for AI and search crawlers; avoid accidental full blocks unless intentional.")
        if by_name.get("Product-page structured data") and by_name["Product-page structured data"].score < 18:
            recs.append("Improve Product and Offer JSON-LD on product pages, including price, availability, SKU, images, and canonical URL.")
        if by_name.get("Catalog content completeness") and by_name["Catalog content completeness"].score < 15:
            recs.append("Improve product descriptions, variant metadata, tags/specs, and image completeness for priority SKUs.")
        if by_name.get("Merchant trust and policy signals") and by_name["Merchant trust and policy signals"].score < 6:
            recs.append("Make shipping, returns, support, FAQ, and review signals easier for AI systems to extract.")
        if by_name.get("Machine-readable catalog endpoint") and not by_name["Machine-readable catalog endpoint"].passed:
            recs.append("Consider a rate-limited machine-readable product feed for agent and search integrations.")
        if by_name.get("Experimental agent/API manifest") and not by_name["Experimental agent/API manifest"].passed:
            recs.append("Track ACP/AP2/MCP-style discovery standards, but prioritize proven product data and schema fixes first.")
        return recs

    def markdown_report(self, result: Dict[str, Any]) -> str:
        status = "Strong" if result["score"] >= 80 else "Moderate" if result["score"] >= 55 else "Needs work"
        lines = [
            "# AI Shopping Visibility Snapshot",
            "",
            f"Target: [{result['domain']}]({result['target_url']})",
            f"Date: {result['timestamp']}",
            f"Readiness score: **{result['score']} / 100** ({status})",
            "",
            "This snapshot estimates how easy it is for AI shopping assistants and search systems to interpret the store's catalog. It is not proof of lost traffic or guaranteed AI ranking performance.",
            "",
            "## Checks",
            "",
            "| Check | Score | Status | Details |",
            "|---|---:|---|---|",
        ]
        for check in result["checks"]:
            status_text = "Pass" if check["passed"] else "Review"
            lines.append(f"| {check['name']} | {check['score']} / {check['max_score']} | {status_text} | {check['details']} |")

        if result["sampled_product_urls"]:
            lines.extend(["", "## Sampled Product URLs", ""])
            for url in result["sampled_product_urls"]:
                lines.append(f"- {url}")

        lines.extend(["", "## Recommended Next Actions", ""])
        for index, rec in enumerate(result["recommendations"], 1):
            lines.append(f"{index}. {rec}")

        lines.extend(["", "## Outreach Summary", "", conservative_outreach(result)])
        return "\n".join(lines) + "\n"


def strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def conservative_outreach(result: Dict[str, Any]) -> str:
    if result.get("error"):
        return (
            f"SKIP OUTREACH: {result['domain'] or 'store'}\n\n"
            f"The audit could not reach the homepage: {str(result['error']).rstrip('.')}. "
            f"Verify the URL manually before contacting this merchant."
        )

    domain = result["domain"] or "store"
    brand = domain.split(".")[0].replace("-", " ").title()
    findings = []
    for check in result.get("checks", []):
        if not check.get("passed"):
            details = check.get("details") or "Needs review."
            if details.endswith(": "):
                details = details[:-2] + ": none detected in first-pass homepage scan."
            findings.append(f"- {check['name']}: {details}")
    findings_text = "\n".join(findings[:4]) if findings else "- No major first-pass issues found; deeper AI answer testing may still be useful."
    return (
        f"Subject: Quick AI shopping visibility check for {domain}\n\n"
        f"Hi {brand} team,\n\n"
        f"I ran a quick machine-readability snapshot on {domain} to see how easily AI shopping assistants and search systems can interpret your catalog.\n\n"
        f"I found a few readiness signals worth reviewing:\n\n"
        f"{findings_text}\n\n"
        f"This does not mean you are losing sales today. It does suggest there may be low-effort improvements to make your products easier for AI systems to parse, compare, and cite.\n\n"
        f"Worth sending the one-page snapshot?\n"
    )


def safe_filename(domain: str) -> str:
    return re.sub(r"[^a-z0-9.-]+", "_", domain.lower()).strip("_")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run AI shopping visibility snapshots for ecommerce stores.")
    parser.add_argument("urls", nargs="+", help="Store URLs to audit")
    parser.add_argument("--sample-size", type=int, default=5, help="Number of product pages to sample")
    parser.add_argument("--json", action="store_true", help="Print JSON result to stdout")
    args = parser.parse_args(argv)

    batch = []
    for url in args.urls:
        auditor = AIShoppingVisibilityAuditor(url, sample_size=args.sample_size)
        result = auditor.run()
        domain_file = safe_filename(result["domain"] or urllib.parse.urlparse(url).netloc or "store")
        json_path = f"visibility_snapshot_{domain_file}.json"
        md_path = f"visibility_snapshot_{domain_file}.md"

        with open(json_path, "w", encoding="utf-8") as json_file:
            json.dump(result, json_file, indent=2)
        with open(md_path, "w", encoding="utf-8") as md_file:
            md_file.write(auditor.markdown_report(result))

        batch.append(
            {
                "domain": result["domain"],
                "score": result["score"],
                "error": result.get("error"),
                "recommendations": result["recommendations"],
                "outreach": conservative_outreach(result),
                "json_report": json_path,
                "markdown_report": md_path,
            }
        )
        if not args.json:
            print(f"[+] {result['domain']}: {result['score']}/100 -> {md_path}")

    if len(batch) > 1:
        with open("batch_outreach_summary.json", "w", encoding="utf-8") as batch_file:
            json.dump(batch, batch_file, indent=2)

    if args.json:
        print(json.dumps(batch, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
