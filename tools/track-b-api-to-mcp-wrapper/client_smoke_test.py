import json

from openlibrary_api import explain_wrapper_pattern, get_work_details, search_books


def main() -> None:
    results = search_books("pricing strategy", limit=3)
    output = {
        "search_results": results,
        "wrapper_pattern": explain_wrapper_pattern(),
    }
    if results and results[0].get("work_key"):
        try:
            output["first_work_details"] = get_work_details(results[0]["work_key"])
        except Exception as exc:
            output["first_work_details_error"] = str(exc)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

