#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"
RUNNING_DIR="$AGENT_DIR/running"
PARENT_TASK_ID="01PH6CFANOUT000000000001"
CREATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$RUNNING_DIR"

write_task() {
  local role="$1"
  local task_id="$2"
  local title="$3"
  local target_repo="$4"
  local goal="$5"
  local constraints="$6"
  local done_when="$7"
  local task_path="$RUNNING_DIR/task_phase6c_${role}.md"

  for terminal in "$AGENT_DIR/done/$task_id" "$AGENT_DIR/error/task_phase6c_${role}.md"; do
    if [[ -e "$terminal" ]]; then
      echo "Refusing to recover terminal task: $terminal" >&2
      exit 1
    fi
  done

  if [[ -e "$AGENT_DIR/build/${task_id}.build.md" ]]; then
    echo "Refusing to recover task with existing build artifact: $task_id" >&2
    exit 1
  fi

  if [[ -e "$task_path" || -e "$task_path.lock" ]]; then
    echo "Task already present: $task_path" >&2
    return
  fi

  cat > "$task_path" <<EOF
---
task_id: $task_id
title: $title
created_at: $CREATED_AT
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
depends_on: []
---

## Goal

$goal

## Constraints

$constraints

## Done-when

$done_when
EOF

  echo "Recovered $task_path"
}

write_task \
  "api" \
  "01PH6CAPI000000000000001" \
  "Add API version endpoint" \
  "target-repos/api" \
  "Add GET /version returning JSON body { \"version\": \"0.1.0\" }." \
  "Modify only target-repos/api. Keep existing endpoints and tests working." \
  "npm test passes in target-repos/api and /version is covered by a focused test."

write_task \
  "batch" \
  "01PH6CBATCH000000000001" \
  "Add batch health contract" \
  "target-repos/batch" \
  "Ensure the batch fixture exposes a deterministic health payload." \
  "Modify only target-repos/batch. Use the existing fixture structure and Node built-in tests." \
  "npm test passes in target-repos/batch and batch health behavior is covered."

python "$ROOT_DIR/scripts/validate_tasks.py" \
  "$RUNNING_DIR/task_phase6c_api.md" \
  "$RUNNING_DIR/task_phase6c_batch.md"
