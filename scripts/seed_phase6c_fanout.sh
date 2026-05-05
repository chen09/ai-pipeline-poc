#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"

RUNTIME=0
ALL_CHILDREN=0
PARENT_TASK_ID="01PH6CFANOUT000000000001"

usage() {
  cat <<'EOF'
Usage:
  scripts/seed_phase6c_fanout.sh [--runtime] [--all-children] [--parent-task-id TASK_ID]

Creates a deterministic Phase 6C multi-repo fanout seed.

Default mode is safe dry-run mode: files are written to a temporary directory
and removed when the script exits.

Use --runtime to write into agent/:
  - agent/fanout/{parent_task_id}.fanout.md
  - agent/plan/{child_task_id}.plan.md
  - agent/test/{child_task_id}.test-plan.md
  - root child tasks in agent/running/task_phase6c_{role}.md
  - dependent child tasks in agent/fanout/staged/{parent_task_id}/

Runtime mode may trigger active n8n workflows because child tasks start at
current_step=coding with pre-generated plan/test-plan artifacts.

Use --all-children only when intentionally testing parallel child execution.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime)
      RUNTIME=1
      shift
      ;;
    --all-children)
      ALL_CHILDREN=1
      shift
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
STAGED_DIR="$FANOUT_DIR/staged/$PARENT_TASK_ID"

mkdir -p "$FANOUT_DIR" "$PLAN_DIR" "$TEST_DIR" "$RUNNING_DIR" "$STAGED_DIR"

fanout_path="$FANOUT_DIR/${PARENT_TASK_ID}.fanout.md"

if [[ "$PARENT_TASK_ID" =~ ([0-9]{3})$ ]]; then
  TASK_SUFFIX="${BASH_REMATCH[1]}"
else
  TASK_SUFFIX="$(date -u +"%H%M%S")"
fi

API_TASK_ID="01PH6CAPI000000000000${TASK_SUFFIX}"
BFF_TASK_ID="01PH6CBFF000000000000${TASK_SUFFIX}"
WEB_TASK_ID="01PH6CWEB000000000000${TASK_SUFFIX}"
BATCH_TASK_ID="01PH6CBATCH000000000${TASK_SUFFIX}"

refuse_if_exists() {
  local path="$1"
  if [[ -e "$path" ]]; then
    echo "Refusing to overwrite existing file: $path" >&2
    exit 1
  fi
}

write_child() {
  local role="$1"
  local task_id="$2"
  local title="$3"
  local target_repo="$4"
  local depends_on="$5"
  local goal="$6"
  local constraints="$7"
  local done_when="$8"
  local plan_body="$9"
  local test_body="${10}"

  local plan_path="$PLAN_DIR/${task_id}.plan.md"
  local test_plan_path="$TEST_DIR/${task_id}.test-plan.md"
  local task_dir="$RUNNING_DIR"
  if [[ "$depends_on" != "[]" && $ALL_CHILDREN -ne 1 ]]; then
    task_dir="$STAGED_DIR"
  fi
  local task_path="$task_dir/task_phase6c_${role}.md"

  refuse_if_exists "$plan_path"
  refuse_if_exists "$test_plan_path"
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
fanout_role: $role
---

# Plan: $title

$plan_body
EOF

  cat > "$test_plan_path" <<EOF
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
fanout_role: $role
---

# Test Plan: $title

$test_body
EOF

  cat > "$task_path" <<EOF
---
task_id: $task_id
title: $title
created_at: $created_at
status: running
current_step: coding
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 1
target_repo: $target_repo
priority: normal
parent_task_id: $PARENT_TASK_ID
fanout_role: $role
depends_on: $depends_on
---

## Goal

$goal

## Constraints

$constraints

## Done-when

$done_when
EOF
}

refuse_if_exists "$fanout_path"

cat > "$fanout_path" <<EOF
---
task_id: $PARENT_TASK_ID
artifact: fanout
agent_role: Fanout Planner
pipeline: multi-repo-default
pipeline_version: v0.1
revision: 0
source_step: fanout_planning
aggregate_status: waiting
created_at: $created_at
children:
  - task_id: $API_TASK_ID
    target_repo: target-repos/api
    depends_on: []
  - task_id: $BFF_TASK_ID
    target_repo: target-repos/bff
    depends_on: [$API_TASK_ID]
  - task_id: $WEB_TASK_ID
    target_repo: target-repos/web
    depends_on: [$BFF_TASK_ID]
  - task_id: $BATCH_TASK_ID
    target_repo: target-repos/batch
    depends_on: []
---

# Fanout: Expose Version Across Repos

## Children

| Role | Task ID | Target Repo | Depends On |
| --- | --- | --- | --- |
| api | $API_TASK_ID | target-repos/api | — |
| bff | $BFF_TASK_ID | target-repos/bff | $API_TASK_ID |
| web | $WEB_TASK_ID | target-repos/web | $BFF_TASK_ID |
| batch | $BATCH_TASK_ID | target-repos/batch | — |

## Aggregation Rules

The parent reaches done only when all four child tasks reach done. Any required
child error makes the parent error.
EOF

write_child \
  "api" \
  "$API_TASK_ID" \
  "Add API version endpoint" \
  "target-repos/api" \
  "[]" \
  "Add GET /version returning JSON body { \"version\": \"0.1.0\" }." \
  "Modify only target-repos/api. Keep existing endpoints and tests working." \
  "npm test passes in target-repos/api and /version is covered by a focused test." \
  "Implement a small Express route GET /version that returns HTTP 200 with { \"version\": \"0.1.0\" }. Add or update Supertest/Vitest coverage." \
  'Add a focused assertion:

```javascript
const response = await request(app).get("/version");
expect(response.statusCode).toBe(200);
expect(response.body).toEqual({ version: "0.1.0" });
```

Run `npm test` in `target-repos/api`.'

write_child \
  "bff" \
  "$BFF_TASK_ID" \
  "Adapt API version payload" \
  "target-repos/bff" \
  "[$API_TASK_ID]" \
  "Ensure the BFF adapter exposes API version payloads as { source: \"api\", version }." \
  "Modify only target-repos/bff. Use the existing fixture structure and Node built-in tests." \
  "npm test passes in target-repos/bff and version adapter behavior is covered." \
  "Use the existing adaptApiVersion function as the contract boundary. Keep it deterministic and dependency-free." \
  'Keep or add Node test coverage for:

```javascript
assert.deepEqual(adaptApiVersion({ version: "0.1.0" }), {
  source: "api",
  version: "0.1.0",
});
```

Run `npm test` in `target-repos/bff`.'

write_child \
  "web" \
  "$WEB_TASK_ID" \
  "Render API version label" \
  "target-repos/web" \
  "[$BFF_TASK_ID]" \
  "Ensure the web fixture renders the version view model as API version: 0.1.0." \
  "Modify only target-repos/web. Use the existing fixture structure and Node built-in tests." \
  "npm test passes in target-repos/web and version label behavior is covered." \
  "Use the existing renderVersionLabel function as the client display contract. Keep it deterministic and dependency-free." \
  'Keep or add Node test coverage for:

```javascript
assert.equal(renderVersionLabel({ version: "0.1.0" }), "API version: 0.1.0");
```

Run `npm test` in `target-repos/web`.'

write_child \
  "batch" \
  "$BATCH_TASK_ID" \
  "Add batch health contract" \
  "target-repos/batch" \
  "[]" \
  "Ensure the batch fixture exposes a deterministic health payload." \
  "Modify only target-repos/batch. Use the existing fixture structure and Node built-in tests." \
  "npm test passes in target-repos/batch and batch health behavior is covered." \
  "Use the existing getBatchHealth function as the background-job health contract. Keep it deterministic and dependency-free." \
  'Keep or add Node test coverage for:

```javascript
assert.deepEqual(getBatchHealth(), {
  service: "batch",
  status: "ok",
});
```

Run `npm test` in `target-repos/batch`.'

shopt -s nullglob
task_files=("$RUNNING_DIR"/task_phase6c_*.md "$STAGED_DIR"/task_phase6c_*.md)
shopt -u nullglob

python "$ROOT_DIR/scripts/validate_tasks.py" "${task_files[@]}"

if [[ $RUNTIME -eq 1 ]]; then
  echo "Created Phase 6C runtime fanout seed:"
else
  echo "Dry run OK. Would create Phase 6C runtime fanout seed:"
fi

echo "- parent_task_id: $PARENT_TASK_ID"
echo "- fanout: $fanout_path"
echo "- child tasks:"
echo "  - $API_TASK_ID -> target-repos/api (released)"
echo "  - $BFF_TASK_ID -> target-repos/bff $([[ $ALL_CHILDREN -eq 1 ]] && echo "(released)" || echo "(staged)")"
echo "  - $WEB_TASK_ID -> target-repos/web $([[ $ALL_CHILDREN -eq 1 ]] && echo "(released)" || echo "(staged)")"
echo "  - $BATCH_TASK_ID -> target-repos/batch (released)"

if [[ $RUNTIME -eq 0 ]]; then
  echo
  echo "No runtime files were retained. Re-run with --runtime to write into agent/."
fi
