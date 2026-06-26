from __future__ import annotations

import json
from pathlib import Path
import subprocess

import anyio
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client


ROOT = Path(__file__).resolve().parents[1]
FS_BIN = ROOT / "node_modules" / ".bin" / "mcp-server-filesystem.cmd"
READONLY_FS_SERVER = ROOT / "scripts" / "readonly-filesystem-server.mjs"


def resolve_git_root() -> Path:
    command = ["git", "rev-parse", "--show-toplevel"]
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return Path(result.stdout.strip()).resolve()


GIT_ROOT = resolve_git_root()


def extract_text(tool_result: object) -> str:
    content = getattr(tool_result, "content", None)
    if not content:
        return str(tool_result)

    texts: list[str] = []
    for item in content:
        text = getattr(item, "text", None)
        if text:
            texts.append(text)

    return "\n".join(texts) if texts else str(tool_result)


def find_excerpt(text: str, marker: str, radius: int = 3) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if marker in line:
            start = max(0, index - radius)
            end = min(len(lines), index + radius + 1)
            return "\n".join(lines[start:end])
    return ""


async def collect_git() -> dict:
    server = StdioServerParameters(
        command="python",
        args=["-m", "mcp_server_git", "--repository", str(GIT_ROOT)],
        cwd=str(ROOT),
    )

    async with stdio_client(server) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = await session.list_tools()
            log_result = await session.call_tool(
                "git_log", {"repo_path": str(GIT_ROOT), "max_count": 1}
            )

            return {
                "status": "ok",
                "repository": str(GIT_ROOT),
                "tools": [tool.name for tool in tools.tools],
                "git_log": str(log_result),
            }


async def collect_filesystem_docs() -> dict:
    server = StdioServerParameters(
        command="node",
        args=[str(READONLY_FS_SERVER), str(ROOT / "docs" / "novatech")],
        cwd=str(ROOT),
    )

    async with stdio_client(server) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            with anyio.fail_after(25):
                await session.initialize()

            tools = await session.list_tools()
            listing = await session.call_tool(
                "list_directory", {"path": str(ROOT / "docs" / "novatech")}
            )
            sample = await session.call_tool(
                "read_text_file",
                {
                    "path": str(
                        ROOT / "docs" / "novatech" / "POL-001-politica-devolucao.md"
                    ),
                    "head": 20,
                },
            )

            return {
                "status": "ok",
                "tools": [tool.name for tool in tools.tools],
                "list_directory": str(listing),
                "read_text_file_head": str(sample),
            }


async def collect_filesystem_retrieval() -> dict:
    retrieval_question = 'Posso devolver carga perigosa?'
    server = StdioServerParameters(
        command="node",
        args=[str(READONLY_FS_SERVER), str(ROOT / "data" / "retrieval-corpus")],
        cwd=str(ROOT),
    )

    async with stdio_client(server) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            with anyio.fail_after(25):
                await session.initialize()

            tools = await session.list_tools()

            search = await session.call_tool(
                "search_files",
                {
                    "path": str(ROOT / "data" / "retrieval-corpus"),
                    "pattern": "chunks-novatech",
                },
            )
            chunk = await session.call_tool(
                "read_text_file",
                {
                    "path": str(ROOT / "data" / "retrieval-corpus" / "chunks-novatech.md"),
                },
            )

            chunk_text = extract_text(chunk)
            question_excerpt = find_excerpt(chunk_text, retrieval_question)
            primary_excerpt = find_excerpt(chunk_text, "Chunk POL-001-B")
            secondary_excerpt = find_excerpt(chunk_text, "FAQ-03")

            return {
                "status": "ok",
                "tools": [tool.name for tool in tools.tools],
                "write_tools_present": any(
                    tool.name in {"write_file", "edit_file", "create_directory", "move_file"}
                    for tool in tools.tools
                ),
                "retrieval_question": retrieval_question,
                "question_mapping_found": retrieval_question in chunk_text,
                "primary_chunk_found": "Chunk POL-001-B" in chunk_text,
                "secondary_reference_found": "FAQ-03" in chunk_text,
                "question_excerpt": question_excerpt,
                "primary_chunk_excerpt": primary_excerpt,
                "secondary_reference_excerpt": secondary_excerpt,
                "search_files": str(search),
                "chunks_text": str(chunk),
            }


async def main() -> None:
    evidence: dict[str, dict] = {}

    try:
        evidence["git_mcp"] = await collect_git()
    except Exception as exc:  # noqa: BLE001
        evidence["git_mcp"] = {"status": "error", "error": repr(exc)}

    try:
        evidence["filesystem_docs_mcp"] = await collect_filesystem_docs()
    except Exception as exc:  # noqa: BLE001
        evidence["filesystem_docs_mcp"] = {"status": "error", "error": repr(exc)}

    try:
        evidence["filesystem_retrieval_mcp"] = await collect_filesystem_retrieval()
    except Exception as exc:  # noqa: BLE001
        evidence["filesystem_retrieval_mcp"] = {"status": "error", "error": repr(exc)}

    out_file = ROOT / "mcp-evidence.json"
    out_file.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Arquivo gerado: {out_file}")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))


async def main_git_only() -> None:
    evidence: dict[str, dict] = {}

    try:
        evidence["git_mcp"] = await collect_git()
    except Exception as exc:  # noqa: BLE001
        evidence["git_mcp"] = {"status": "error", "error": repr(exc)}

    out_file = ROOT / "mcp-evidence.json"
    out_file.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Arquivo gerado: {out_file}")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "--full"

    if mode == "--git-only":
        anyio.run(main_git_only)
    else:
        anyio.run(main)