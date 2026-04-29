# Phase 6E — Local Implementation Runner / Backend Adapter

**Date**: 2026-04-27  
**Status**: Implemented (plan retained as design reference)  
**Decision trigger**: Phase 6D proved that artifact persistence inside n8n is reliable, but
OpenClaw Gateway has no stable run-status RPC. Rather than polling an external system
for state, a local runner script becomes the single source of truth through `agent/jobs/` files.

---

## 1. Motivation

### What Phase 6D found

| Observation | Evidence |
| --- | --- |
| n8n Code node can reliably write files when it reaches the persistence path | `agent/debug/tasks/*.jsonl` shows verified writes for all diagnostic runs |
| OpenClaw `chat.send` runs Cursor Agent successfully | `target-repos/api` tests pass with new files |
| OpenClaw has no run-status/result RPC | All candidate methods returned `INVALID_REQUEST: unknown method` |
| `chat.history` polling is fragile | Per-task sessions still time out within the 180 s window |

### Root cause of failure

The n8n `Implementation Agent` holds an open WebSocket and polls the external
OpenClaw process for completion. n8n has no visibility into external-process state,
and OpenClaw has no callback or push mechanism. This is structurally unreliable.

### Decision

Move state control into a self-owned local runner process:

- n8n writes a **job request** file and exits the Code node immediately.
- The **Local Runner** owns the WebSocket, drives the backend, and writes all status/result artifacts.
- n8n polls the **result file** (cheap file I/O), not an external API.

---

## 2. Target Architecture

```
n8n Implementation Agent
  │
  └── writes ──> agent/jobs/{task_id}.request.json
                       │
                       ▼
            Local Implementation Runner (runner/runner.js)
                  │
                  ├── writes ──> agent/jobs/{task_id}.status.json  (queued→claimed→running→completed|failed)
                  │
                  └── dispatches ──> Backend Adapter
                                          │
                                          ├── cursor-openclaw.js  (OpenClaw → cursor_agent)
                                          ├── hermes.js            (HermesAgent, future)
                                          └── ...                  (Codex, Claude, future)
                  │
                  └── writes ──> agent/jobs/{task_id}.result.json

n8n (polls)
  │
  └── reads ──> agent/jobs/{task_id}.result.json
               │
               └── writes ──> agent/build/{task_id}.build.md
                              (then standard Execution → Review → done/error routing)
```

---

## 3. Job Artifact Contract

### 3.1 Directory layout

```
agent/jobs/
  {task_id}.request.json     # written by n8n; consumed by runner
  {task_id}.status.json      # written and updated by runner only
  {task_id}.result.json      # written by runner on terminal state; read by n8n
  {task_id}.logs/            # optional: per-line JSONL from backend adapter
    adapter.jsonl
```

### 3.2 State enum

| State | Who sets it | Meaning |
| --- | --- | --- |
| `queued` | n8n (initial write) | request written, runner not yet claimed |
| `claimed` | runner | runner has atomically claimed the job |
| `running` | runner | backend adapter is actively executing |
| `completed` | runner | backend finished with usable result |
| `failed` | runner | backend finished with error; result has error_message |
| `timeout` | runner | backend did not complete within deadline |
| `cancelled` | runner | runner received SIGTERM before completion |

State transitions (valid only):

```
queued → claimed → running → completed
                           → failed
                           → timeout
         claimed → cancelled   (SIGTERM during claim setup)
         running → cancelled   (SIGTERM mid-execution)
```

### 3.3 job-request.json schema

```jsonc
{
  "task_id": "01PH6EAPI000000000000001",
  "target_repo": "target-repos/api",           // relative to project root
  "backend": "cursor-openclaw",                // enum: cursor-openclaw | hermes
  "plan_ref": "agent/plan/01PH6E...plan.md",
  "test_plan_ref": "agent/test/01PH6E...test-plan.md",
  "task_brief": "Add GET /feature endpoint…",  // plaintext summary for backend
  "created_at": "2026-04-27T05:00:00.000Z",
  "timeout_seconds": 300                       // runner hard deadline
}
```

### 3.4 job-status.json schema

```jsonc
{
  "task_id": "01PH6EAPI000000000000001",
  "state": "running",                          // current state
  "backend": "cursor-openclaw",
  "started_at": "2026-04-27T05:00:05.000Z",
  "updated_at": "2026-04-27T05:01:30.000Z",
  "pid": 12345                                 // runner process pid (for debugging)
}
```

### 3.5 job-result.json schema

```jsonc
{
  "task_id": "01PH6EAPI000000000000001",
  "state": "completed",                        // terminal state
  "backend": "cursor-openclaw",
  "summary": "Added GET /feature in src/index.js; test added in tests/feature.test.js",
  "changed_files": [
    "target-repos/api/src/index.js",
    "target-repos/api/tests/feature.test.js"
  ],
  "exit_code": 0,
  "error_message": null,                       // populated on failed/timeout
  "completed_at": "2026-04-27T05:03:10.000Z"
}
```

---

## 4. Backend Adapter Interface

Every adapter must export a single async function:

```js
/**
 * @param {object} request   — parsed job-request.json
 * @param {object} paths     — { projectRoot, planAbs, testPlanAbs, targetRepoAbs }
 * @param {object} logger    — { info, warn, error } writing to {task_id}.logs/adapter.jsonl
 * @returns {Promise<{state, summary, changed_files, exit_code, error_message}>}
 */
async function run(request, paths, logger) { … }

module.exports = { run };
```

The runner calls the adapter within a timeout guard and translates the return value
into a `result.json` with the appropriate terminal state.

---

## 5. Local Runner Responsibilities

`runner/runner.js` must:

1. **Scan** `agent/jobs/*.request.json` on startup and on a configurable poll interval (default 5 s).
2. **Skip** any request whose `{task_id}.status.json` already exists with `state != queued` (prevent double-claim).
3. **Claim atomically**: write `status.json` with `state: claimed` before starting adapter.
4. **Invoke adapter** based on `request.backend`; update `status.json` to `running`.
5. **Enforce deadline**: `request.timeout_seconds` (default 300). On timeout → write `result.json` with `state: timeout`.
6. **Write result atomically**: `{tmp}.result.json` → rename → verify read-back.
7. **Handle SIGTERM**: update `status.json` to `cancelled` and exit cleanly.
8. **Log** all state transitions to `agent/jobs/{task_id}.logs/adapter.jsonl`.

---

## 6. n8n Implementation Agent Changes

### Before (Phase 6D)

```
Code node (long-running):
  1. Open WebSocket to OpenClaw
  2. chat.send (blocks until response or timeout)
  3. Poll chat.history for completion marker (up to 180 s)
  4. Write build.md or error.md
```

### After (Phase 6E)

```
Code node A (fast, < 1 s):
  1. Resolve plan + test-plan paths
  2. Write agent/jobs/{task_id}.request.json
  3. Return { status: "job_submitted" }

Code node B (poller, runs every 10 s up to 30 polls):
  1. Read agent/jobs/{task_id}.result.json
  2. If exists and state=completed → write build.md → continue pipeline
  3. If state=failed|timeout      → write error.md → retry/error routing
  4. If not yet exists or state=running → wait 10 s → retry
```

This gives n8n short Code-node execution windows and eliminates the WebSocket
timeout risk.

---

## 7. Failure Modes and Mitigations

| Failure | Detection | Mitigation |
| --- | --- | --- |
| Runner process dies mid-job | `status.json` stuck in `running` with old `updated_at` | n8n poller: if status `running` and `updated_at` > TTL (10 min), write `result.json` with `state: timeout` |
| Adapter never writes result | n8n poll exhausted (30 × 10 s = 5 min) | n8n writes `error.md` with `state: timeout`; runner can be restarted independently |
| Double-claim (two runner processes) | Both read request before either writes status | Atomic status write with `O_EXCL` flag; second writer fails and skips |
| OpenClaw unreachable | Adapter returns `{ state: 'failed', error_message: 'websocket open timeout' }` | Standard retry via n8n retry_count logic |
| result.json partial write | Runner uses temp-rename pattern | n8n poller retries until read-back succeeds |

---

## 8. Migration from Phase 6D

Phase 6D artifacts are preserved unchanged:

- `agent/done/01PH6DFANOUT00000000000{1..6}/` — keep as-is
- `agent/error/01PH6DFANOUT000000000002/` — keep as-is
- `n8n-workflows/implementation-agent.n8n.js` — will be modified in P6E.3 only after runner is stable

The migration is **additive**:

1. Add `agent/jobs/` directory (no existing files affected).
2. Add `runner/` scripts (no existing workflows affected).
3. Modify `Implementation Agent` workflow last (after smoke test passes).

Deterministic fast paths in the Implementation Agent remain untouched throughout
Phase 6E and serve as the non-Cursor fallback for all fanout children that do not
set `force_cursor: true`.

---

## 9. Implementation Sequence

| Step | Artifact | Priority |
| --- | --- | --- |
| P6E.1 | `runner/schemas/` JSON schemas | First (contract-first) |
| P6E.2 | `runner/runner.js` + `adapters/cursor-openclaw.js` | Second |
| P6E.3 | n8n `Implementation Agent` job-write + poller nodes | Third |
| P6E.4 | Smoke test (one Cursor-backed fanout child) | Fourth |
| P6E.5 | Repeatability + chaos test | Fifth |
| P6E.6 | `runner/adapters/hermes.js` stub | After smoke (not blocking) |

---

## 10. Exit Criteria

- `runner/runner.js --help` prints usage without errors.
- One fanout child with `force_cursor: true` completes end-to-end via Local Runner, reaching `agent/done/`.
- `agent/jobs/` shows full state progression: `queued → claimed → running → completed`.
- `runner/runner.js` restart does not re-claim an in-flight or completed job.
- Hermes adapter stub is present and returns safe no-op result.
