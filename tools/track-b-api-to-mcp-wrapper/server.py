import anyio
import json
from typing import Any, Dict, List

import mcp_types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server
from openlibrary_api import get_work_details as fetch_work_details
from openlibrary_api import search_books as search_openlibrary_books
from openlibrary_api import explain_wrapper_pattern as explain_pattern


def text_result(payload: Any, is_error: bool = False) -> types.CallToolResult:
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=json.dumps(payload, indent=2))],
        isError=is_error,
    )


async def list_tools(_ctx, _params) -> types.ListToolsResult:
    return types.ListToolsResult(
        tools=[
            types.Tool(
                name="search_books",
                description=(
                    "Search a legacy REST API and return a compact list of matching books. "
                    "Use this when a user wants to find books by title, author, subject, or keyword."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search phrase such as a title, author, subject, or keyword.",
                        },
                        "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10,
                            "default": 5,
                            "description": "Maximum number of results to return.",
                        },
                    },
                    "required": ["query"],
                    "additionalProperties": False,
                },
            ),
            types.Tool(
                name="get_work_details",
                description="Fetch details for an Open Library work key returned by search_books.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "work_key": {
                            "type": "string",
                            "description": "Open Library work key such as /works/OL45883W.",
                        }
                    },
                    "required": ["work_key"],
                    "additionalProperties": False,
                },
            ),
            types.Tool(
                name="explain_wrapper_pattern",
                description="Explain how this demo maps to a real API-to-MCP wrapper service.",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
            ),
        ]
    )


async def call_tool(_ctx, params: types.CallToolRequestParams) -> types.CallToolResult:
    args = params.arguments or {}
    try:
        if params.name == "search_books":
            query = str(args.get("query", "")).strip()
            limit = int(args.get("limit", 5))
            results: List[Dict[str, Any]] = search_openlibrary_books(query=query, limit=limit)
            return text_result(results)

        if params.name == "get_work_details":
            work_key = str(args.get("work_key", "")).strip()
            result = fetch_work_details(work_key)
            return text_result(result)

        if params.name == "explain_wrapper_pattern":
            return text_result(explain_pattern())

        return text_result({"error": f"Unknown tool: {params.name}"}, is_error=True)
    except Exception as exc:
        return text_result({"error": str(exc)}, is_error=True)


server = Server(
    "api-to-mcp-wrapper-demo",
    version="1.0.0",
    title="API-to-MCP Wrapper Demo",
    description="Demo wrapping the Open Library REST API as MCP tools.",
    on_list_tools=list_tools,
    on_call_tool=call_tool,
)


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    anyio.run(main)
