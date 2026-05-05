#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INBOX_DIR="$ROOT_DIR/agent/inbox"
FORCE=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

mkdir -p "$INBOX_DIR"

shopt -s nullglob
existing=("$INBOX_DIR"/*.md)
shopt -u nullglob

if [[ ${#existing[@]} -gt 0 && $FORCE -ne 1 ]]; then
  echo "Inbox is not empty: $INBOX_DIR" >&2
  echo "Use --force to replace existing inbox task files." >&2
  exit 1
fi

if [[ $FORCE -eq 1 && ${#existing[@]} -gt 0 ]]; then
  rm -f "$INBOX_DIR"/*.md
fi

created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

write_task() {
  local file="$1"
  local task_id="$2"
  local title="$3"
  local priority="$4"
  local goal="$5"
  local constraints="$6"
  local done_when="$7"

  cat > "$INBOX_DIR/$file" <<EOF
---
task_id: $task_id
title: $title
created_at: $created_at
status: pending
current_step: planning
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 3
target_repo: target-repos/api
priority: $priority
---

## Goal

$goal

## Constraints

$constraints

## Done-when

$done_when
EOF
}

# 4 trivial tasks (pass first try, low ambiguity)
write_task "task_101.md" "01PH5000000000000000000101" "Add /health endpoint test coverage" "normal" \
"Add tests that verify GET /health returns HTTP 200 and body { \"status\": \"ok\" }." \
"Only modify tests unless route is missing; keep existing routes untouched." \
"Test suite passes and includes explicit assertions for /health status code and JSON body."

write_task "task_102.md" "01PH5000000000000000000102" "Fix README title spelling only" "low" \
"Ensure README heading is exactly '# API Project'." \
"Only update README heading; no source code changes." \
"README heading is corrected and tests still pass."

write_task "task_103.md" "01PH5000000000000000000103" "Add root endpoint response test" "normal" \
"Add/adjust tests for GET / to assert status 200 and stable payload keys." \
"Do not change endpoint behavior unless assertion mismatch is detected." \
"Root route test passes with deterministic payload assertions."

write_task "task_104.md" "01PH5000000000000000000104" "Document local run command in README" "low" \
"Add a short 'Run locally' section with npm install + npm test commands." \
"README-only change; keep wording concise." \
"README contains run instructions and test suite remains green."

# 3 medium tasks (likely one retry due tighter requirements)
write_task "task_201.md" "01PH5000000000000000000201" "Add /ready endpoint and tests" "high" \
"Introduce GET /ready endpoint returning { \"status\": \"ready\" } and add tests." \
"Keep /health unchanged; avoid unrelated refactors." \
"/ready route exists, tests cover /ready and /health, and all tests pass."

write_task "task_202.md" "01PH5000000000000000000202" "Split smoke tests into focused suites" "normal" \
"Refactor tests into endpoint-focused files without reducing coverage." \
"No functional API changes; test-only refactor preferred." \
"Tests are split by endpoint, coverage intent preserved, all tests pass."

write_task "task_203.md" "01PH5000000000000000000203" "Add 404 JSON contract test" "normal" \
"Add a test that unknown routes return 404 (JSON preferred if already implemented)." \
"Do not add global middleware unless necessary; keep implementation minimal." \
"Unknown route behavior is validated by tests and existing routes continue to pass."

# 2 hard tasks (expected to fail or route to error)
write_task "task_301.md" "01PH5000000000000000000301" "Implement time-travel API" "urgent" \
"Create an API endpoint that can reverse real-world time by 5 minutes." \
"Do not fake success; explain technical infeasibility if blocked." \
"Pipeline identifies infeasibility and routes task safely after retries."

write_task "task_302.md" "01PH5000000000000000000302" "Zero-downtime hot reload without restart hooks" "high" \
"Implement zero-downtime hot code reload for production runtime without process managers." \
"No new infrastructure dependencies allowed." \
"Either working solution with tests or explicit, structured failure analysis via pipeline loop."

# 1 malformed task (should fail schema/frontmatter handling quickly)
cat > "$INBOX_DIR/task_999_malformed.md" <<'EOF'
## Goal

This task intentionally omits YAML frontmatter.

## Constraints

- Keep this malformed file unchanged.

## Done-when

- The pipeline routes this task to error due to invalid schema.
EOF

# Validate only well-formed tasks (exclude malformed sentinel by filename).
python "$ROOT_DIR/scripts/validate_tasks.py" \
  "$INBOX_DIR"/task_101.md \
  "$INBOX_DIR"/task_102.md \
  "$INBOX_DIR"/task_103.md \
  "$INBOX_DIR"/task_104.md \
  "$INBOX_DIR"/task_201.md \
  "$INBOX_DIR"/task_202.md \
  "$INBOX_DIR"/task_203.md \
  "$INBOX_DIR"/task_301.md \
  "$INBOX_DIR"/task_302.md

echo "Seeded 10 tasks into $INBOX_DIR:"
echo "- 4 trivial"
echo "- 3 medium"
echo "- 2 hard"
echo "- 1 malformed frontmatter sentinel (task_999_malformed.md)"
