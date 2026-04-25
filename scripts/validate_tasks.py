#!/usr/bin/env python3
"""Validate task markdown files against the v0.1 pipeline schema.

Usage:
    python scripts/validate_tasks.py agent/inbox/*.md
    python scripts/validate_tasks.py agent/inbox/task_001.md

Exit codes:
    0 — all files valid
    1 — one or more files have schema errors
"""

import sys
import re
from pathlib import Path

REQUIRED_FIELDS = [
    "task_id",
    "title",
    "created_at",
    "status",
    "current_step",
    "pipeline",
    "pipeline_version",
    "revision",
    "retry_count",
    "max_retry",
    "target_repo",
    "priority",
]

VALID_STATUSES = {"pending", "running", "done", "error"}

VALID_CURRENT_STEPS = {
    "planning",
    "coding",
    "test_planning",
    "test_running",
    "reviewing",
    "done",
    "error",
}

VALID_PRIORITIES = {"low", "normal", "high", "urgent"}

REQUIRED_BODY_SECTIONS = ["## Goal", "## Constraints", "## Done-when"]


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Return (fields_dict, body_text) from a markdown file with YAML frontmatter.

    Only handles simple scalar key: value pairs (no nested YAML). Sufficient
    for the task schema without pulling in PyYAML.
    """
    if not text.startswith("---"):
        return {}, text

    end = text.find("\n---", 3)
    if end == -1:
        return {}, text

    fm_block = text[3:end].strip()
    body = text[end + 4:].strip()

    fields: dict = {}
    for line in fm_block.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()

    return fields, body


def validate_file(path: Path) -> list[str]:
    """Return a list of error strings for the given file (empty = valid)."""
    errors: list[str] = []

    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return [f"Cannot read file: {exc}"]

    fields, body = parse_frontmatter(text)

    if not fields:
        return ["Missing or malformed YAML frontmatter (file must start with ---)"]

    # Required fields
    for field in REQUIRED_FIELDS:
        if field not in fields:
            errors.append(f"Missing required field: {field}")

    # Field value validation
    status = fields.get("status", "")
    if status and status not in VALID_STATUSES:
        errors.append(
            f"Invalid status '{status}'. Valid values: {sorted(VALID_STATUSES)}"
        )

    step = fields.get("current_step", "")
    if step and step not in VALID_CURRENT_STEPS:
        errors.append(
            f"Invalid current_step '{step}'. Valid values: {sorted(VALID_CURRENT_STEPS)}"
        )

    priority = fields.get("priority", "")
    if priority and priority not in VALID_PRIORITIES:
        errors.append(
            f"Invalid priority '{priority}'. Valid values: {sorted(VALID_PRIORITIES)}"
        )

    version = fields.get("pipeline_version", "")
    if version and not re.match(r"^v\d+(\.\d+)*$", version):
        errors.append(
            f"Invalid pipeline_version '{version}'. Expected format: v<major>[.<minor>]"
        )

    for int_field in ("revision", "retry_count", "max_retry"):
        val = fields.get(int_field, "")
        if val and not re.match(r"^\d+$", val):
            errors.append(f"Field '{int_field}' must be a non-negative integer, got '{val}'")

    # Required body sections
    for section in REQUIRED_BODY_SECTIONS:
        if section not in body:
            errors.append(f"Missing required body section: {section}")

    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: validate_tasks.py <file> [file ...]", file=sys.stderr)
        return 1

    paths = [Path(p) for p in argv[1:]]
    total = len(paths)
    failed = 0

    for path in paths:
        errors = validate_file(path)
        if errors:
            failed += 1
            print(f"FAIL  {path}")
            for err in errors:
                print(f"      - {err}")
        else:
            print(f"OK    {path}")

    print()
    print(f"Results: {total - failed}/{total} files valid")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
