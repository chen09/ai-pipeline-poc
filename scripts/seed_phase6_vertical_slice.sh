#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"
PLAN_DIR="$AGENT_DIR/plan"
TEST_DIR="$AGENT_DIR/test"
RUNNING_DIR="$AGENT_DIR/running"

DRY_RUN=0
TASK_ID=""

usage() {
  cat <<'EOF'
Usage:
  scripts/seed_phase6_vertical_slice.sh [--dry-run] [--task-id TASK_ID]

Creates a repeatable Phase 6 vertical-slice task that starts at current_step=coding.
It writes:
  - agent/plan/{task_id}.plan.md
  - agent/test/{task_id}.test-plan.md
  - agent/running/task_ph6_vertical_slice_{task_id}.md

Notes:
  - This intentionally bypasses Planning/Test Generation to focus on the
    Implementation Agent -> OpenClaw Gateway -> cursor_agent backend path.
  - If n8n workflows are active and --dry-run is not used, the task may be
    claimed immediately.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --task-id)
      TASK_ID="${2:-}"
      if [[ -z "$TASK_ID" ]]; then
        echo "--task-id requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
if [[ -z "$TASK_ID" ]]; then
  TASK_ID="01PH6VERTICAL$(date -u +"%Y%m%d%H%M%S")"
fi

task_file="task_ph6_vertical_slice_${TASK_ID}.md"

if [[ $DRY_RUN -eq 1 ]]; then
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  PLAN_DIR="$tmp_dir/plan"
  TEST_DIR="$tmp_dir/test"
  RUNNING_DIR="$tmp_dir/running"
fi

mkdir -p "$PLAN_DIR" "$TEST_DIR" "$RUNNING_DIR"

plan_path="$PLAN_DIR/${TASK_ID}.plan.md"
test_plan_path="$TEST_DIR/${TASK_ID}.test-plan.md"
task_path="$RUNNING_DIR/$task_file"

for path in "$plan_path" "$test_plan_path" "$task_path" "$task_path.lock"; do
  if [[ -e "$path" ]]; then
    echo "Refusing to overwrite existing file: $path" >&2
    exit 1
  fi
done

cat > "$plan_path" <<EOF
---
task_id: $TASK_ID
artifact: plan
agent_role: Planning Agent
pipeline: code-default
pipeline_version: v0.1
revision: 0
source_step: planning
created_at: $created_at
---

# Plan: Add Phase 6 Vertical Slice Status Endpoint

Implement a small Express endpoint in \`target-repos/api\`:

- Add \`GET /phase6/vertical-slice\`.
- Return HTTP 200 with JSON body \`{ "phase": "6", "slice": "vertical", "status": "ok" }\`.
- Add a focused Supertest/Vitest assertion.
- Keep changes limited to the target API repository.
EOF

cat > "$test_plan_path" <<EOF
---
task_id: $TASK_ID
artifact: test-plan
agent_role: Test Generation Agent
pipeline: code-default
pipeline_version: v0.1
revision: 0
source_step: test_planning
created_at: $created_at
---

# Test Plan: Add Phase 6 Vertical Slice Status Endpoint

Add or update a focused automated test in \`target-repos/api\`:

\`\`\`javascript
const response = await request(app).get("/phase6/vertical-slice");
expect(response.statusCode).toBe(200);
expect(response.body).toEqual({ phase: "6", slice: "vertical", status: "ok" });
\`\`\`

The target repo test command must pass:

\`\`\`bash
npm test
\`\`\`
EOF

cat > "$task_path" <<EOF
---
task_id: $TASK_ID
title: Add Phase 6 vertical-slice status endpoint
created_at: $created_at
status: running
current_step: coding
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 1
target_repo: target-repos/api
priority: normal
---

## Goal

Add a tiny endpoint to repeatedly validate the Phase 6 implementation backend path.

## Constraints

- Use the target repo at \`target-repos/api\`.
- Add \`GET /phase6/vertical-slice\`.
- Return JSON body \`{ "phase": "6", "slice": "vertical", "status": "ok" }\`.
- Add or update focused tests.
- Keep all code changes inside \`target-repos/api\`.

## Done-when

- \`npm test\` passes in \`target-repos/api\`.
- The implementation step produces \`agent/build/${TASK_ID}.build.md\`.
EOF

python "$ROOT_DIR/scripts/validate_tasks.py" "$task_path"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run OK. Would create PH6 vertical-slice task:"
else
  echo "Created PH6 vertical-slice task:"
fi

echo "- task_id: $TASK_ID"
echo "- plan: $plan_path"
echo "- test-plan: $test_plan_path"
echo "- task: $task_path"
echo
echo "If n8n workflows are active, the task may now be claimed from running/."
