#!/usr/bin/env python3
"""Read-only preflight checks for a repository software-factory workflow."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


def run(command: list[str], cwd: Path) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            command,
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)
    output = (proc.stdout or proc.stderr).strip()
    return proc.returncode, output


def tool_status(name: str) -> dict[str, Any]:
    path = shutil.which(name)
    return {"available": path is not None, "path": path}


def git_value(repo: Path, args: list[str]) -> str | None:
    code, output = run(["git", *args], repo)
    return output if code == 0 and output else None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect software-factory prerequisites without modifying the repository."
    )
    parser.add_argument("--repo", default=".", help="Repository path to inspect")
    parser.add_argument("--require-remote", action="store_true")
    parser.add_argument("--require-evidence", action="store_true")
    parser.add_argument("--require-review", action="store_true")
    args = parser.parse_args()

    requested = Path(args.repo).expanduser().resolve()
    result: dict[str, Any] = {
        "requested_path": str(requested),
        "ready": False,
        "checks": {},
        "warnings": [],
        "missing_required": [],
    }

    git = tool_status("git")
    result["checks"]["tools"] = {"git": git}
    if not git["available"]:
        result["missing_required"].append("git")
        print(json.dumps(result, indent=2, sort_keys=True))
        return 2

    root = git_value(requested, ["rev-parse", "--show-toplevel"])
    if root is None:
        result["missing_required"].append("git_repository")
        print(json.dumps(result, indent=2, sort_keys=True))
        return 2

    repo = Path(root)
    branch = git_value(repo, ["branch", "--show-current"])
    remote = git_value(repo, ["remote", "get-url", "origin"])
    status = git_value(repo, ["status", "--porcelain=v1"])
    default_ref = git_value(repo, ["symbolic-ref", "refs/remotes/origin/HEAD"])
    default_branch = default_ref.rsplit("/", 1)[-1] if default_ref else None

    instruction_files = [
        name
        for name in ("AGENTS.md", "CLAUDE.md", ".cursorrules")
        if (repo / name).exists()
    ]
    skill_roots = [
        str(path.relative_to(repo))
        for path in (
            repo / ".agents" / "skills",
            repo / ".cursor" / "skills",
            repo / ".claude" / "skills",
        )
        if path.exists()
    ]

    result["repository"] = {
        "root": str(repo),
        "branch": branch,
        "default_branch": default_branch,
        "origin_configured": remote is not None,
        "working_tree_clean": status is None,
        "instruction_files": instruction_files,
        "skill_roots": skill_roots,
    }

    if branch and default_branch and branch == default_branch:
        result["warnings"].append("currently_on_default_branch")
    if status:
        result["warnings"].append("working_tree_has_changes")
    if not instruction_files:
        result["warnings"].append("no_root_agent_instructions")
    if not skill_roots:
        result["warnings"].append("no_project_skill_directory")

    tool_names = ["gh", "jq", "node", "npm", "python3", "ffmpeg", "ffprobe"]
    tools = {name: tool_status(name) for name in tool_names}
    result["checks"]["tools"].update(tools)

    if args.require_remote:
        if remote is None:
            result["missing_required"].append("origin_remote")
        if not tools["gh"]["available"]:
            result["missing_required"].append("gh")

    if args.require_review:
        for name in ("gh", "jq"):
            if not tools[name]["available"]:
                result["missing_required"].append(name)

    if args.require_evidence:
        if not tools["python3"]["available"]:
            result["missing_required"].append("python3")
        if not tools["ffmpeg"]["available"] or not tools["ffprobe"]["available"]:
            result["warnings"].append(
                "video_evidence_unavailable_use_static_or_headless_fallback"
            )

    result["missing_required"] = sorted(set(result["missing_required"]))
    result["ready"] = not result["missing_required"]
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["ready"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
