# Phase 6E Report — Local Implementation Runner Implementation

**Date**: 2026-04-27  
**Status**: Implemented and validated with Cursor-backed fanout completion artifact protocol  
**Scope**: Move implementation execution state ownership to local artifacts under `agent/jobs/`.

## Delivered

### 1) Job contract schemas

Added:

- `runner/schemas/job-request.schema.json`
- `runner/schemas/job-status.schema.json`
- `runner/schemas/job-result.schema.json`

Contract states are aligned with the plan:

- `queued`
- `claimed`
- `running`
- `completed`
- `failed`
- `timeout`
- `cancelled`

### 2) Local runner and adapters

Added:

- `runner/runner.js`
- `runner/adapters/cursor-openclaw.js`
- `runner/adapters/hermes.js`
- `runner/package.json`
- `runner/package-lock.json`

Runner behavior:

- Scans `agent/jobs/*.request.json`
- Atomically claims jobs through `status.json` create-without-overwrite (`wx`)
- Updates `status.json` through `claimed -> running -> terminal`
- Writes terminal `result.json` with atomic temp-rename + read-back verification
- Writes adapter logs to `agent/jobs/{task_id}.logs/adapter.jsonl`
- Handles SIGINT/SIGTERM by attempting `cancelled` terminalization

### 3) Implementation Agent refactor

Updated:

- `n8n-workflows/implementation-agent.n8n.js`

Behavior change:

- Non-deterministic implementation backends (`cursor`, `hermes`) now use:
  - submit request: `agent/jobs/{task_id}.request.json`
  - poll result: `agent/jobs/{task_id}.result.json`
- When result is missing, code node returns quickly with:
  - `status: JOB_PENDING`
- When result exists:
  - `completed` -> normal build artifact + move toward `test_running`
  - `failed|timeout|cancelled` -> build artifact + retry/error routing

Deterministic fixture fast paths for Phase 6C/6D remain unchanged.

### 4) Deterministic completion channel for Cursor/OpenClaw

Updated:

- `runner/adapters/cursor-openclaw.js`

Protocol change:

- Cursor prompt now requires writing `agent/jobs/{task_id}.completion.json`
- Runner polls for that completion artifact as the primary completion signal
- `chat.history` remains only as best-effort fallback/diagnostic path

Completion artifact fields:

- `task_id`
- `success`
- `summary`
- `blocker`
- `changed_files`
- `commands`
- `tests`
- `error`

## Smoke Validation

### A) Runner contract smoke (hermes stub)

Input:

- `agent/jobs/01PH6EIMPLSMOKE000000000001.request.json`

Observed:

- `status.json` terminalized to `failed`
- `result.json` written with:
  - `state: failed`
  - `summary: Hermes adapter is not implemented yet`
- adapter log file created under `.logs/adapter.jsonl`

### B) Implementation Agent submission/polling smoke

Synthetic task:

- `agent/running/task_phase6e_hermes_smoke.md`
- `implementation_backend: hermes`

Observed:

1. First script run returns `JOB_PENDING` and writes request JSON.
2. Runner processes request and writes `status/result`.
3. Second script run consumes result and returns `RETRY_SCHEDULED`.
4. Build artifact written:
   - `agent/build/01PH6EIMPLSMOKE000000000001.build.md`

This validates job submission and result consumption without long-lived OpenClaw polling in n8n.

### C) Cursor adapter runtime check

Validation request:

- `agent/jobs/01PH6ECURSORADAPTERTEST00003.request.json`

With intentionally unreachable gateway (`OPENCLAW_GATEWAY_URL=http://127.0.0.1:1`), runner produced:

- `result.state: failed`
- `error_message: websocket open failed`

This confirms cursor adapter wiring and error classification path.

### D) Full Cursor-backed fanout pass with completion artifact

Validation parent:

- `01PH6DFANOUT000000000012`

Observed:

- Cursor child wrote completion artifact:
  - `agent/jobs/01PH6DAPI000000000000012.completion.json`
- Runner terminalized job as `completed`:
  - `agent/jobs/01PH6DAPI000000000000012.result.json`
- Implementation Agent consumed runner result and generated build artifact:
  - `agent/done/01PH6DAPI000000000000012/01PH6DAPI000000000000012.build.md`
- Fanout aggregate reached terminal `done`:
  - `agent/done/01PH6DFANOUT000000000012/01PH6DFANOUT000000000012.fanout-result.md`
  - children `api/bff/web/batch` all `done`

## Notable Fix During Implementation

`runner/runner.js` initially kept timeout timers alive after `Promise.race`, causing `--once` to hang.
Fixed by explicitly tracking and clearing timeout handles after adapter resolution.

## Follow-up Status (2026-04-29)

1. Repeatability run completed with parent `01PH6DFANOUT000000000013` (all children + parent `done`).
2. Chaos run completed with parent `01PH6DFANOUT000000000014` after mid-flight `docker compose restart n8n-worker` (all children + parent `done`).
3. Runner restart + validation run `01PH6DFANOUT000000000015` completed (all children + parent `done`).
4. Runner heartbeat implemented in `runner/runner.js` (`LOCAL_RUNNER_HEARTBEAT_MS`, default 15s). During a live Cursor/OpenClaw run, `status.updated_at` advanced repeatedly with `job_heartbeat` log events.
5. Stale-running watchdog implemented in `n8n-workflows/implementation-agent.n8n.js` (`LOCAL_RUNNER_STALE_RUNNING_SECONDS`, default 900s). If `running` status exceeds threshold without heartbeat progress, workflow writes timeout `result.json` + timeout `status.json` and routes failure deterministically.
6. `changed_files` normalization implemented in `runner/runner.js`; terminal results now use project-relative paths rooted at `target-repos/...`.
