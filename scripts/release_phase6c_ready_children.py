#!/usr/bin/env python3
"""Release staged Phase 6C child tasks whose dependencies are done."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}

    fields: dict[str, str] = {}
    for line in text[3:end].strip().splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()
    return fields


def parse_depends_on(value: str) -> list[str]:
    return re.findall(r"[A-Z0-9]+", value)


def dependencies_done(agent_dir: Path, dependencies: list[str]) -> bool:
    return all((agent_dir / "done" / task_id).exists() for task_id in dependencies)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parent_task_id", help="Parent fanout task id")
    parser.add_argument(
        "--agent-dir",
        default="agent",
        help="Path to agent state directory, default: agent",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show releasable tasks without moving files",
    )
    args = parser.parse_args()

    agent_dir = Path(args.agent_dir)
    staged_dir = agent_dir / "fanout" / "staged" / args.parent_task_id
    running_dir = agent_dir / "running"

    if not staged_dir.exists():
        print(f"No staged directory found: {staged_dir}")
        return 0

    released = 0
    waiting = 0

    for task_path in sorted(staged_dir.glob("*.md")):
        fields = parse_frontmatter(task_path.read_text(encoding="utf-8"))
        dependencies = parse_depends_on(fields.get("depends_on", "[]"))
        if not dependencies_done(agent_dir, dependencies):
            waiting += 1
            print(f"waiting: {task_path.name} depends_on={dependencies}")
            continue

        destination = running_dir / task_path.name
        if destination.exists():
            raise SystemExit(f"Refusing to overwrite existing running task: {destination}")

        released += 1
        if args.dry_run:
            print(f"would release: {task_path.name}")
        else:
            shutil.move(str(task_path), str(destination))
            print(f"released: {task_path.name}")

    print()
    print(f"released={released} waiting={waiting}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
