#!/usr/bin/env python3
"""Read-only heuristic discovery for architectural guardrails.

This scanner inventories signals and possible bypasses. It is not a security proof.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any, Iterable


SKIP_DIRS = {
    ".git", ".next", ".nuxt", ".turbo", ".venv", "build", "coverage",
    "dist", "node_modules", "out", "target", "vendor",
}
INCLUDED_HIDDEN_DIRS = {".claude", ".codex", ".github"}
TEXT_SUFFIXES = {
    ".cjs", ".cts", ".graphql", ".gql", ".js", ".jsx", ".json", ".md",
    ".mjs", ".mts", ".prisma", ".py", ".rb", ".rs", ".sql", ".toml",
    ".ts", ".tsx", ".yaml", ".yml",
}
PATTERNS = {
    "server_actions": re.compile(r"(?:['\"]use server['\"]|\bServer Action\b)"),
    "server_only": re.compile(r"(?:server-only|server_only)"),
    "protected_boundary": re.compile(
        r"(?:protectedProcedure|authenticatedProcedure|authorizedProcedure|requireAuth|authorize\s*\()",
        re.IGNORECASE,
    ),
    "public_procedure": re.compile(r"\bpublicProcedure\b"),
    "runtime_validation": re.compile(
        r"(?:\bz\.object\s*\(|safeParse\s*\(|\.parse\s*\(|valibot|yup\.|joi\.)",
        re.IGNORECASE,
    ),
    "tenant_scope": re.compile(r"(?:tenantId|tenant_id|organizationId|orgId|workspaceId)"),
    "authorization": re.compile(r"(?:authorize|permission|ownership|policy|ability|can\s*\()", re.IGNORECASE),
    "rate_limit": re.compile(r"(?:rate.?limit|throttl|quota|cost.?limit)", re.IGNORECASE),
    "audit": re.compile(r"(?:audit.?log|auditEvent|security.?event)", re.IGNORECASE),
    "orm_or_db": re.compile(r"(?:@prisma/client|drizzle-orm|typeorm|sequelize|mongoose|\bdb\.|\bprisma\.)"),
    "lint_disable": re.compile(r"(?:eslint-disable|biome-ignore|nolint|noqa)"),
}


def iter_files(root: Path, max_bytes: int) -> Iterable[Path]:
    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(
            d for d in dirs
            if d not in SKIP_DIRS and (not d.startswith(".") or d in INCLUDED_HIDDEN_DIRS)
        )
        for name in sorted(files):
            path = Path(current) / name
            if path.suffix.lower() not in TEXT_SUFFIXES and name not in {
                "AGENTS.md", "CLAUDE.md", "Dockerfile", "package.json", "tsconfig.json",
            }:
                continue
            try:
                if path.stat().st_size <= max_bytes:
                    yield path
            except OSError:
                continue


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def scan(root: Path, max_bytes: int, sample_limit: int) -> dict[str, Any]:
    files = list(iter_files(root, max_bytes))
    signals: dict[str, dict[str, Any]] = {
        key: {"files": 0, "matches": 0, "samples": []} for key in PATTERNS
    }
    instructions: list[str] = []
    configs: list[str] = []
    possible_direct_db: list[str] = []

    for path in files:
        relative = rel(path, root)
        lower = relative.lower()
        if path.name in {"AGENTS.md", "CLAUDE.md"} or "/.claude/rules/" in f"/{lower}":
            instructions.append(relative)
        if path.name in {"package.json", "tsconfig.json"} or "eslint" in path.name.lower() or ".github/workflows/" in lower:
            configs.append(relative)

        content = read_text(path)
        for key, pattern in PATTERNS.items():
            matches = list(pattern.finditer(content))
            if not matches:
                continue
            signals[key]["files"] += 1
            signals[key]["matches"] += len(matches)
            if len(signals[key]["samples"]) < sample_limit:
                signals[key]["samples"].append(relative)

        clientish = any(part in lower for part in ("/client/", "/components/", "/ui/", "/pages/"))
        dataish = any(part in lower for part in ("/data/", "/db/", "/repository", "/server/"))
        if clientish and not dataish and PATTERNS["orm_or_db"].search(content):
            possible_direct_db.append(relative)

    strict_ts: bool | None = None
    tsconfig = root / "tsconfig.json"
    if tsconfig.is_file():
        strict_match = re.search(r'"strict"\s*:\s*(true|false)', read_text(tsconfig))
        if strict_match:
            strict_ts = strict_match.group(1) == "true"

    return {
        "notice": "Heuristic discovery only; absence of a match is not proof of absence.",
        "repository": str(root),
        "files_scanned": len(files),
        "instruction_files": sorted(set(instructions)),
        "configuration_files": sorted(set(configs)),
        "typescript_strict": strict_ts,
        "signals": signals,
        "possible_direct_db_access_from_client_or_ui": sorted(set(possible_direct_db))[:sample_limit],
        "manual_follow_up": [
            "Trace at least one read and mutation end to end.",
            "Inventory API, RPC, GraphQL, Server Action, webhook, job, CLI, SDK, and direct database entry paths.",
            "Verify authentication, tenant membership, action, and object authorization separately.",
            "Inspect negative-path tests, CI enforcement, exceptions, and audit redaction.",
        ],
    }


def render_markdown(result: dict[str, Any]) -> str:
    lines = [
        "# Guardrail Doctor", "",
        f"- Repository: `{result['repository']}`",
        f"- Files scanned: {result['files_scanned']}",
        f"- TypeScript strict: {result['typescript_strict']}",
        f"- Notice: {result['notice']}", "", "## Signals", "",
        "| Signal | Files | Matches | Samples |", "|---|---:|---:|---|",
    ]
    for name, data in result["signals"].items():
        samples = ", ".join(f"`{item}`" for item in data["samples"]) or "—"
        lines.append(f"| {name} | {data['files']} | {data['matches']} | {samples} |")
    lines.extend(["", "## Instruction and configuration files", ""])
    for label, key in (
        ("Instructions", "instruction_files"),
        ("Configuration/CI", "configuration_files"),
    ):
        items = result[key]
        value = ", ".join(f"`{item}`" for item in items) if items else "none found"
        lines.append(f"- {label}: {value}")
    lines.extend(["", "## Possible direct database access from client/UI paths", ""])
    items = result["possible_direct_db_access_from_client_or_ui"]
    lines.extend(f"- `{item}`" for item in items)
    if not items:
        lines.append("- No heuristic matches. This is not proof that no bypass exists.")
    lines.extend(["", "## Manual follow-up", ""])
    lines.extend(f"- {item}" for item in result["manual_follow_up"])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="repository path (default: current directory)")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--max-file-bytes", type=int, default=1_000_000)
    parser.add_argument("--sample-limit", type=int, default=12)
    args = parser.parse_args()

    root = Path(args.repo).resolve()
    if not root.is_dir():
        parser.error(f"repository path is not a directory: {root}")
    if args.max_file_bytes <= 0 or args.sample_limit <= 0:
        parser.error("limits must be positive integers")

    result = scan(root, args.max_file_bytes, args.sample_limit)
    if args.format == "json":
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(render_markdown(result), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
