#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"

RUNTIME=0
BACKEND_MODE="both"
PARENT_TASK_ID="01PH6BABSMOKE000000000001"

usage() {
  cat <<'EOF'
Usage:
  scripts/seed_phase6b_backend_ab_smoke.sh [--runtime] [--backend cursor|codex|both] [--parent-task-id TASK_ID]

Creates a Phase 6B backend A/B smoke fanout seed.

Default mode is safe dry-run mode (writes into a temporary directory and removes it on exit).

Runtime mode writes into agent/:
  - agent/fanout/{parent_task_id}.fanout.md
  - agent/plan/{child_task_id}.plan.md
  - agent/test/{child_task_id}.test-plan.md
  - agent/running/task_phase6b_ab_{backend}.md

No target repo reset/clean operations are performed by this script.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime)
      RUNTIME=1
      shift
      ;;
    --backend)
      BACKEND_MODE="${2:-}"
      if [[ -z "$BACKEND_MODE" ]]; then
        echo "--backend requires cursor|codex|both" >&2
        exit 1
      fi
      shift 2
      ;;
    --parent-task-id)
      PARENT_TASK_ID="${2:-}"
      if [[ -z "$PARENT_TASK_ID" ]]; then
        echo "--parent-task-id requires a value" >&2
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

if [[ "$BACKEND_MODE" != "cursor" && "$BACKEND_MODE" != "codex" && "$BACKEND_MODE" != "both" ]]; then
  echo "Invalid --backend value: $BACKEND_MODE (expected cursor|codex|both)" >&2
  exit 1
fi

created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ $RUNTIME -eq 1 ]]; then
  OUT_DIR="$AGENT_DIR"
else
  OUT_DIR="$(mktemp -d)"
  trap 'rm -rf "$OUT_DIR"' EXIT
fi

FANOUT_DIR="$OUT_DIR/fanout"
PLAN_DIR="$OUT_DIR/plan"
TEST_DIR="$OUT_DIR/test"
RUNNING_DIR="$OUT_DIR/running"

mkdir -p "$FANOUT_DIR" "$PLAN_DIR" "$TEST_DIR" "$RUNNING_DIR"

if [[ "$PARENT_TASK_ID" =~ ([0-9]{3})$ ]]; then
  TASK_SUFFIX="${BASH_REMATCH[1]}"
else
  TASK_SUFFIX="$(date -u +"%H%M%S")"
fi

CURSOR_TASK_ID="01PH6BABCURSOR000000000${TASK_SUFFIX}"
CODEX_TASK_ID="01PH6BABCODEX000000000${TASK_SUFFIX}"
CURSOR_ENDPOINT="/phase6b-ab-cursor-${TASK_SUFFIX}"
CODEX_ENDPOINT="/phase6b-ab-codex-${TASK_SUFFIX}"

has_cursor=0
has_codex=0
if [[ "$BACKEND_MODE" == "cursor" || "$BACKEND_MODE" == "both" ]]; then
  has_cursor=1
fi
if [[ "$BACKEND_MODE" == "codex" || "$BACKEND_MODE" == "both" ]]; then
  has_codex=1
fi

refuse_if_exists() {
  local target="$1"
  if [[ -e "$target" ]]; then
    echo "Refusing to overwrite existing file: $target" >&2
    exit 1
  fi
}

write_task_bundle() {
  local backend="$1"
  local task_id="$2"
  local endpoint="$3"
  local plan_path="$PLAN_DIR/${task_id}.plan.md"
  local test_path="$TEST_DIR/${task_id}.test-plan.md"
  local task_path="$RUNNING_DIR/task_phase6b_ab_${backend}.md"

  refuse_if_exists "$plan_path"
  refuse_if_exists "$test_path"
  refuse_if_exists "$task_path"
  refuse_if_exists "$task_path.lock"

  cat > "$plan_path" <<EOF
---
task_id: $task_id
artifact: plan
agent_role: Fanout Planner
pipeline: code-default
pipeline_version: v0.1
revision: 0
source_step: planning
created_at: $created_at
parent_task_id: $PARENT_TASK_ID
fanout_role: $backend
---

# Plan: Phase 6B $backend backend smoke endpoint

Add endpoint \`${endpoint}\` in \`target-repos/api\` returning:

\`\`\`json
{ "backend": "$backend", "status": "ok" }
\`\`\`

Keep changes minimal and add focused test coverage.
EOF

  cat > "$test_path" <<EOF
---
task_id: $task_id
artifact: test-plan
agent_role: Fanout Planner
pipeline: code-default
pipeline_version: v0.1
revision: 0
source_step: test_planning
created_at: $created_at
parent_task_id: $PARENT_TASK_ID
fanout_role: $backend
---

# Test Plan: Phase 6B $backend backend smoke endpoint

- Request \`${endpoint}\` returns HTTP 200.
- Response body equals:
  - backend: "$backend"
  - status: "ok"
- Existing API tests continue to pass.
- Run \`npm test\` in \`target-repos/api\`.
EOF

  cat > "$task_path" <<EOF
---
task_id: $task_id
title: Phase 6B backend A/B smoke ($backend)
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
parent_task_id: $PARENT_TASK_ID
fanout_role: $backend
depends_on: []
implementation_backend: $backend
force_cursor: true
---

## Goal

Add endpoint \`${endpoint}\` returning \`{ "backend": "$backend", "status": "ok" }\`,
add focused test coverage, and run \`npm test\`.

## Constraints

- Modify only \`target-repos/api\`.
- Do not read or print secrets.
- Do not reset or clean the repo.

## Done-when

- \`${endpoint}\` exists and is tested.
- API tests pass.
EOF
}

fanout_path="$FANOUT_DIR/${PARENT_TASK_ID}.fanout.md"
refuse_if_exists "$fanout_path"

children_yaml=""
children_table=""
if [[ $has_cursor -eq 1 ]]; then
  children_yaml="${children_yaml}
  - task_id: $CURSOR_TASK_ID
    target_repo: target-repos/api
    depends_on: []"
  children_table="${children_table}
| cursor | $CURSOR_TASK_ID | target-repos/api | ${CURSOR_ENDPOINT} |"
fi
if [[ $has_codex -eq 1 ]]; then
  children_yaml="${children_yaml}
  - task_id: $CODEX_TASK_ID
    target_repo: target-repos/api
    depends_on: []"
  children_table="${children_table}
| codex | $CODEX_TASK_ID | target-repos/api | ${CODEX_ENDPOINT} |"
fi

cat > "$fanout_path" <<EOF
---
task_id: $PARENT_TASK_ID
artifact: fanout
agent_role: Fanout Planner
pipeline: backend-ab-smoke
pipeline_version: v0.1
revision: 0
source_step: fanout_planning
aggregate_status: waiting
created_at: $created_at
children:${children_yaml}
---

# Fanout: Phase 6B Backend A/B Smoke

## Children

| Backend | Task ID | Target Repo | Endpoint |
| --- | --- | --- | --- |${children_table}
EOF

if [[ $has_cursor -eq 1 ]]; then
  write_task_bundle "cursor" "$CURSOR_TASK_ID" "$CURSOR_ENDPOINT"
fi
if [[ $has_codex -eq 1 ]]; then
  write_task_bundle "codex" "$CODEX_TASK_ID" "$CODEX_ENDPOINT"
fi

shopt -s nullglob
task_files=("$RUNNING_DIR"/task_phase6b_ab_*.md)
shopt -u nullglob
if [[ ${#task_files[@]} -eq 0 ]]; then
  echo "No task files created" >&2
  exit 1
fi

python "$ROOT_DIR/scripts/validate_tasks.py" "${task_files[@]}"

if [[ $RUNTIME -eq 1 ]]; then
  echo "Created Phase 6B backend A/B smoke seed:"
else
  echo "Dry run OK. Would create Phase 6B backend A/B smoke seed:"
fi
echo "- parent_task_id: $PARENT_TASK_ID"
if [[ $has_cursor -eq 1 ]]; then
  echo "- cursor_task_id: $CURSOR_TASK_ID (${CURSOR_ENDPOINT})"
fi
if [[ $has_codex -eq 1 ]]; then
  echo "- codex_task_id: $CODEX_TASK_ID (${CODEX_ENDPOINT})"
fi
echo "- fanout: $fanout_path"

if [[ $RUNTIME -eq 0 ]]; then
  echo
  echo "No runtime files were retained. Re-run with --runtime to write into agent/."
fi
