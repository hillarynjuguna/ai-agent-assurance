import json
import urllib.parse
import urllib.request
from typing import Any, Dict, List


OPEN_LIBRARY_BASE = "https://openlibrary.org"


class APIError(RuntimeError):
    pass


def fetch_json(path: str, timeout: int = 12) -> Dict[str, Any]:
    url = path if path.startswith("https://") else OPEN_LIBRARY_BASE + path
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "API-to-MCP-Wrapper-Demo/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except Exception as exc:
        raise APIError(f"Open Library request failed for {url}: {exc}") from exc


def search_books(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    clean_query = (query or "").strip()
    if not clean_query:
        raise ValueError("query is required")

    safe_limit = max(1, min(int(limit), 10))
    params = urllib.parse.urlencode(
        {
            "q": clean_query,
            "limit": safe_limit,
            "fields": "key,title,author_name,first_publish_year,edition_count,subject",
        }
    )
    data = fetch_json(f"/search.json?{params}")

    results = []
    for item in data.get("docs", [])[:safe_limit]:
        subjects = item.get("subject") or []
        results.append(
            {
                "work_key": item.get("key"),
                "title": item.get("title"),
                "authors": item.get("author_name", [])[:5],
                "first_publish_year": item.get("first_publish_year"),
                "edition_count": item.get("edition_count"),
                "subjects": subjects[:8],
            }
        )
    return results


def get_work_details(work_key: str) -> Dict[str, Any]:
    clean_key = (work_key or "").strip()
    if not clean_key.startswith("/works/"):
        raise ValueError("work_key must look like /works/OL45883W")

    data = fetch_json(f"{clean_key}.json")
    description = data.get("description")
    if isinstance(description, dict):
        description = description.get("value")

    return {
        "work_key": clean_key,
        "title": data.get("title"),
        "description": description,
        "subjects": (data.get("subjects") or [])[:20],
        "subject_places": (data.get("subject_places") or [])[:10],
        "subject_times": (data.get("subject_times") or [])[:10],
    }


def explain_wrapper_pattern() -> Dict[str, Any]:
    return {
        "pattern": "legacy_api_to_mcp",
        "steps": [
            "Select a narrow set of high-value API actions.",
            "Wrap each action in validated Python or TypeScript functions.",
            "Expose those functions as MCP tools with clear JSON schemas.",
            "Add auth, rate limits, logging, and human approval for sensitive actions.",
            "Ship docs, sample prompts, and a test harness.",
        ],
        "buyer_value": [
            "Makes the API usable by AI agents without asking customers to read docs.",
            "Reduces integration friction for AI-native buyers.",
            "Keeps control over approved actions and data boundaries.",
        ],
    }


if __name__ == "__main__":
    print(json.dumps(search_books("agentic commerce", limit=3), indent=2))

