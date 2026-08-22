import anyio
import json
import sys

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client


async def main() -> None:
    params = StdioServerParameters(
        command=sys.executable,
        args=["server.py"],
        cwd=".",
    )
    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = await session.list_tools()
            search_result = await session.call_tool(
                "search_books",
                {"query": "pricing strategy", "limit": 2},
            )
            pattern_result = await session.call_tool("explain_wrapper_pattern", {})

    output = {
        "tools": [tool.name for tool in tools.tools],
        "search_books_result": [content.text for content in search_result.content],
        "explain_wrapper_pattern_result": [content.text for content in pattern_result.content],
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    anyio.run(main)
