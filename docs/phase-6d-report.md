# Phase 6D Report — Cursor/OpenClaw Fanout Smoke

**Date**: 2026-04-26  
**Status**: COMPLETE — artifact persistence verified; architectural pivot to Phase 6E Local Runner  
**Scope**: Reintroduce one real Cursor/OpenClaw implementation child into the automated multi-repo fanout pipeline.

## Goal

Phase 6C proved that multi-repo fanout orchestration is stable when child
implementation uses deterministic fixture fast paths. Phase 6D validates that
the same pipeline can complete with one child using the real Cursor/OpenClaw
backend path.

## Configuration Changes

Updated n8n runner configuration in `docker-compose.yml`:

```yaml
N8N_RUNNERS_HEARTBEAT_INTERVAL: "300"
N8N_RUNNERS_TASK_REQUEST_TIMEOUT: "300"
```

Why:

- The earlier Cursor/OpenClaw path could keep a Code node busy long enough for
  n8n to mark the task runner unresponsive.
- During the first Phase 6D attempt, n8n reported `Task request timed out after
  60 seconds`; increasing `N8N_RUNNERS_TASK_REQUEST_TIMEOUT` allowed the runner
  queue to recover.

## Workflow Changes

Updated `n8n-workflows/implementation-agent.n8n.js`:

- Added `force_cursor: true` support.
- When `force_cursor: true`, deterministic fast paths are skipped and the task
  goes through Cursor/OpenClaw.
- Improved Cursor completion detection with a final `chat.history` check for
  the task's `IMPLEMENTATION_RESULT:{task_id}` marker.

## Seed

Added:

- `scripts/seed_phase6d_cursor_smoke.sh`

Runtime command:

```bash
./scripts/seed_phase6d_cursor_smoke.sh --runtime --parent-task-id 01PH6DFANOUT000000000001
```

Fanout shape:

| Role | Task ID | Target Repo | Implementation Path |
| --- | --- | --- | --- |
| api | `01PH6DAPI000000000000001` | `target-repos/api` | Cursor/OpenClaw |
| bff | `01PH6DBFF000000000000001` | `target-repos/bff` | deterministic |
| web | `01PH6DWEB000000000000001` | `target-repos/web` | deterministic |
| batch | `01PH6DBATCH000000000001` | `target-repos/batch` | deterministic |

## Result

Cursor/OpenClaw child:

- `01PH6DAPI000000000000001`
- build artifact: `backend: cursor`
- build classification: `implemented`
- review verdict: `pass`
- changed files:
  - `target-repos/api/src/index.js`
  - `target-repos/api/tests/cursor-smoke.test.js`

Parent aggregate:

```text
parent_task_id: 01PH6DFANOUT000000000001
aggregate_status: done

01PH6DAPI000000000000001   done
01PH6DBFF000000000000001   done
01PH6DWEB000000000000001   done
01PH6DBATCH000000000001 done
```

Parent terminal artifact:

- `agent/done/01PH6DFANOUT000000000001/01PH6DFANOUT000000000001.fanout-result.md`

## Final Validation

| Check | Result |
| --- | --- |
| `target-repos/api` tests | Pass: 3 files / 4 tests |
| `target-repos/bff` tests | Pass: 2 tests |
| `target-repos/web` tests | Pass: 2 tests |
| `target-repos/batch` tests | Pass: 1 test |
| Fanout aggregate | `done` |
| `agent/running/` | empty |
| Phase 6D errors | none |

## Repeatability Attempt

A repeatability run was attempted with a fresh parent id:

```bash
./scripts/seed_phase6d_cursor_smoke.sh --runtime --parent-task-id 01PH6DFANOUT000000000002
```

The seed script was updated so each parent suffix generates a unique Cursor
endpoint. For parent `...002`, the API child requested:

- `GET /cursor-smoke-002`
- `tests/cursor-smoke-002.test.js`

Observed result:

- The first attempt failed before Cursor execution with
  `openclaw_gateway_unreachable: websocket open timeout`.
- A direct worker-container WebSocket probe to OpenClaw later succeeded.
- The API child was retried after archiving the failed attempt.
- Cursor/OpenClaw modified `target-repos/api` successfully:
  - `GET /cursor-smoke-002`
  - `tests/cursor-smoke-002.test.js`
- Local API tests passed with 4 test files and 5 tests.

However, the repeatability run did not complete as an automated artifact loop:

- the API child task disappeared from `agent/running/`
- no standard build/test/review/done artifact was persisted for the retried API
  child
- parent `01PH6DFANOUT000000000002` could not complete automatically

The failed repeat parent was terminalized manually as error to stop active
fanout scanning:

- `agent/error/01PH6DFANOUT000000000002.fanout-result.md`
- `agent/error/01PH6DFANOUT000000000002/`

Final repeatability validation:

| Check | Result |
| --- | --- |
| `target-repos/api` tests | Pass: 4 files / 5 tests |
| `target-repos/bff` tests | Pass: 2 tests |
| `target-repos/web` tests | Pass: 2 tests |
| `target-repos/batch` tests | Pass: 1 test |
| Repeat parent aggregate | `error` after manual terminalization |
| `agent/fanout/` | empty |
| `agent/running/` | empty |

## Artifact Persistence Instrumentation

Added persistent instrumentation to `n8n-workflows/implementation-agent.n8n.js`:

- global log: `agent/debug/implementation-agent.jsonl`
- per-task logs: `agent/debug/tasks/{task_id}.jsonl`
- events for:
  - lock acquisition
  - task selection
  - OpenClaw gateway probe
  - Cursor subprocess start/finish
  - parsed Cursor payload
  - build artifact preparation
  - atomic write start and verified write
  - task update
  - error routing

Changed artifact writes to use:

```text
temporary file -> rename -> read-back verification
```

This was applied to:

- build artifacts
- running task updates
- error task routing

## Diagnostic Runs After Instrumentation

Two diagnostic parents were used after instrumentation:

- `01PH6DFANOUT000000000003`
- `01PH6DFANOUT000000000005`

Findings:

1. Artifact persistence itself is now observable and reliable.
   - For `01PH6DAPI000000000000003`, the debug log shows:
     - `build_artifact_write_start`
     - `build_artifact_write_verified`
     - `error_task_write_start`
     - `error_task_write_verified`
   - This proves the n8n Code node can write standard artifacts once it reaches
     that code path.

2. The previous "missing artifact" symptom was caused by task-runner aborts or
   Cursor completion misclassification before standard artifact writing.

3. Shared OpenClaw session history caused stale output contamination.
   - A diagnostic run for task `...004` observed output from a previous
     `cursor-smoke-003` task.
   - Fix applied: the Implementation Agent now uses a per-task session key:
     `agent:dev:main:{task_id}`.

4. With per-task sessions, the latest diagnostic no longer mixes stale history,
   but Cursor/OpenClaw did not complete within the current 180 second polling
   window.
   - For `01PH6DAPI000000000000005`, the log shows:
     - gateway probe succeeded
     - cursor subprocess started
     - cursor subprocess returned `cursor_agent_timeout`
     - build and error artifacts were written and verified
   - Parent `01PH6DFANOUT000000000005` was routed to error by Fanout Aggregator.

Current conclusion:

- Artifact persistence is no longer the primary unknown.
- The remaining blocker is Cursor/OpenClaw completion reliability and polling
  semantics for isolated per-task sessions.

## Completion Polling Probe

The Implementation Agent was updated to probe common run status/result RPC
methods immediately after `chat.send` returns a `runId`.

Probed candidates:

- `runs.get`
- `runs.status`
- `run.get`
- `run.status`
- `chat.run.get`
- `chat.run.status`
- `chat.runs.get`
- `chat.runs.status`

Diagnostic parent:

- `01PH6DFANOUT000000000006`

Result:

- Gateway probe succeeded.
- `chat.send` returned a run id.
- all candidate status/result methods returned `INVALID_REQUEST: unknown method`
- no run status/result RPC was discovered through these common method names
- the Implementation Agent wrote and verified both:
  - `agent/build/01PH6DAPI000000000000006.build.md`
  - `agent/error/task_phase6d_api.md`

The API target repo still passed local tests with 8 test files and 9 tests, but
the fanout parent correctly ended in error because the Cursor/OpenClaw child did
not produce a recognized completion signal inside the polling window.

## Notes

- The first Cursor/OpenClaw attempt produced code successfully, but the
  implementation completion detector marked it as timeout before recognizing
  the final correlation marker.
- The build artifact was corrected after verifying the Cursor output and test
  result, then the task was restored at `test_running` and completed through the
  standard Execution and Review agents.
- The improved completion detector should avoid this specific false timeout on
  future Cursor/OpenClaw runs.

## Remaining Work

1. Get the authoritative OpenClaw Gateway RPC method for run status/result, if
   one exists outside the probed names above.
2. If no Gateway status/result API exists, replace the current `chat.history`
   polling with a more deterministic callback artifact from the Cursor Agent
   prompt, for example writing `IMPLEMENTATION_RESULT:{task_id}.json` into a
   known temp path.
3. Repeat Phase 6D only after completion polling can distinguish:
   - accepted but still running
   - completed successfully
   - completed with blocker
   - backend timeout
4. Only after repeatability passes, add a worker restart chaos run while the
   Cursor/OpenClaw child is executing.

## Conclusion

Phase 6D answered the questions it set out to answer:

| Question | Answer |
| --- | --- |
| Can n8n reliably write build/error artifacts when it reaches the persistence code path? | **Yes** — confirmed by instrumentation with atomic write + read-back verification. |
| Does OpenClaw Gateway expose a run-status or run-result RPC? | **No** — all candidate methods returned `INVALID_REQUEST: unknown method`. |
| Can `chat.history` polling reliably detect Cursor Agent completion? | **No** — per-task sessions still hit timeout before Cursor finishes; polling is fragile. |

### Root cause

The n8n `Implementation Agent` holds a long-lived WebSocket and polls an external
process for completion state it does not own. No callback or push mechanism exists.
This is structurally unreliable regardless of polling interval or retry count.

### Recommended fix (Phase 6E)

Introduce a **Local Implementation Runner** that:

1. Owns the external process connection and drives the backend to completion.
2. Writes `agent/jobs/{task_id}.status.json` and `agent/jobs/{task_id}.result.json` atomically.
3. Gives n8n a simple, cheap file-poll target instead of an external RPC.

OpenClaw/Cursor becomes one pluggable **backend adapter** inside this runner.
HermesAgent and future backends (Codex, Claude) use the same adapter interface.

Full specification: `docs/phase-6e-local-runner-plan.md`.
