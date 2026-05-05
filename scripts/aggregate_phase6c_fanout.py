#!/usr/bin/env python3
"""Summarize Phase 6C fanout child terminal states.

This script is intentionally read-only by default. It reads
agent/fanout/{parent_task_id}.fanout.md, checks whether each child task is in
agent/done/ or agent/error/, and prints an aggregate status.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def parse_child_ids(fanout_text: str) -> list[str]:
    ids: list[str] = []
    for match in re.finditer(r"task_id:\s*([A-Z0-9]+)", fanout_text):
        task_id = match.group(1)
        if task_id not in ids:
            ids.append(task_id)
    return ids[1:]


def classify_child(agent_dir: Path, parent_task_id: str, task_id: str) -> str:
    if (agent_dir / "done" / task_id).exists():
        return "done"
    if (agent_dir / "error" / task_id).exists():
        return "error"
    for task_path in (agent_dir / "running").glob("*.md"):
        try:
            if f"task_id: {task_id}" in task_path.read_text(encoding="utf-8"):
                return "in_flight_or_seeded"
        except OSError:
            continue
    staged_dir = agent_dir / "fanout" / "staged" / parent_task_id
    for task_path in staged_dir.glob("*.md"):
        try:
            if f"task_id: {task_id}" in task_path.read_text(encoding="utf-8"):
                return "staged"
        except OSError:
            continue
    return "missing"


def aggregate_status(child_statuses: list[str]) -> str:
    if any(status == "error" for status in child_statuses):
        return "error"
    if child_statuses and all(status == "done" for status in child_statuses):
        return "done"
    return "waiting"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parent_task_id", help="Parent fanout task id")
    parser.add_argument(
        "--agent-dir",
        default="agent",
        help="Path to agent state directory, default: agent",
    )
    args = parser.parse_args()

    agent_dir = Path(args.agent_dir)
    fanout_path = agent_dir / "fanout" / f"{args.parent_task_id}.fanout.md"
    terminal_fanout_path = agent_dir / "done" / args.parent_task_id / f"{args.parent_task_id}.fanout.md"
    if not fanout_path.exists():
        if terminal_fanout_path.exists():
            fanout_path = terminal_fanout_path
        else:
            raise SystemExit(f"Fanout artifact not found: {fanout_path}")

    child_ids = parse_child_ids(fanout_path.read_text(encoding="utf-8"))
    if not child_ids:
        raise SystemExit(f"No child task ids found in {fanout_path}")

    statuses = [
        (task_id, classify_child(agent_dir, args.parent_task_id, task_id))
        for task_id in child_ids
    ]
    aggregate = aggregate_status([status for _, status in statuses])

    print(f"parent_task_id: {args.parent_task_id}")
    print(f"aggregate_status: {aggregate}")
    print()
    print("| Child Task ID | Status |")
    print("| --- | --- |")
    for task_id, status in statuses:
        print(f"| {task_id} | {status} |")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
