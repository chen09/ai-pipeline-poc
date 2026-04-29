# Agent Handoff & Current State

**Date**: April 29, 2026
**Project**: Multi-Agent AI Development Pipeline (Local-First POC)
**Goal**: Provide context and exact status for the next AI Agent picking up this workspace.

## 1. Current State (当前现状)

- **Phase 0 (Infrastructure Bootstrap)**: **COMPLETED**.
  - All local services are running via Docker Compose (Postgres, Redis, ClickHouse, MinIO, n8n-main, n8n-worker x2, LiteLLM, Langfuse-web, Langfuse-worker).
  - Secrets are generated and stored in `.env`.
  - LiteLLM (`litellm/config.yaml`) is configured with `plan-model` (DeepSeek) and `plan-model-backup` (MiniMax M2.7) routing, plus Langfuse observability callbacks.
- **Phase 1 (Contract & Artifact Loop)**: **COMPLETED**.
  - The pipeline has been upgraded to a **v0.1 TDD-like multi-agent feedback loop**.
  - Local file-system directories for the state machine are initialized (`agent/inbox/`, `agent/running/`, `agent/plan/`, etc.).
  - `docs/task-schema.md` and `docs/idempotency.md` enforce the new contract: Planning -> Test Generation -> Implementation -> Execution -> Review.
  - `scripts/validate_tasks.py` validates frontmatter and schemas successfully.
  - Git commit created for Phase 1.
- **Phase 2 (Planning Agent n8n Workflow)**: **COMPLETED**.
  - n8n workflow `Planning Agent` (`planning-agent`) source is complete and importable.
  - Workflow source is versioned in `n8n-workflows/planning-agent.json` and `n8n-workflows/planning-agent.n8n.js`.
  - Three plan artifacts exist in `agent/plan/` for the seed tasks.
  - Detailed notes are in `docs/phase-2-report.md`.
- **Phase 3 (Test Generation / Implementation / Execution)**: **COMPLETED**.
  - New workflows are implemented and active:
    - `Test Generation Agent` (`test-generation-agent`)
    - `Implementation Agent` (`implementation-agent`)
    - `Execution & Analysis Agent` (`execution-analysis-agent`)
  - Workflow sources are versioned in:
    - `n8n-workflows/test-generation-agent.json`
    - `n8n-workflows/test-generation-agent.n8n.js`
    - `n8n-workflows/implementation-agent.json`
    - `n8n-workflows/implementation-agent.n8n.js`
    - `n8n-workflows/execution-analysis-agent.json`
    - `n8n-workflows/execution-analysis-agent.n8n.js`
  - Runtime verification snapshot:
    - TDD gate, retry routing, and execution paths are validated end-to-end.
    - Seed benchmark tasks converge without duplication/loss.
  - Detailed notes are in `docs/phase-3-report.md`.

- **Phase 4 (Review & Optimization Agent)**: **COMPLETED**.
  - Workflow `Review & Optimization Agent` (`review-optimization-agent`) is implemented and active.
  - Workflow sources versioned at:
    - `n8n-workflows/review-optimization-agent.json`
    - `n8n-workflows/review-optimization-agent.n8n.js`
  - Langfuse callbacks enabled in `litellm/config.yaml`, keys configured, and smoke traces verified.
  - Detailed notes are in `docs/phase-4-report.md`.

- **Phase 5 (POC Validation)**: **COMPLETED**.
  - `scripts/seed_tasks.sh` implemented for 10-task mixed-difficulty bulk generation.
  - Bulk run completed with chaos test + fallback test.
  - Final report generated at project root: `REPORT.md`.
  - Detailed notes are in `docs/phase-5-report.md`.

- **Phase 6A (Vertical Slice Hardening)**: **COMPLETED**.
  - `Implementation Agent` now calls OpenClaw Gateway, which routes to `cursor_agent`.
  - A single task (`01PH6AVERTICAL000000000602`) reached `done/`.
  - Cursor Agent modified `target-repos/api`, `npm test` passed, and Review returned `pass`.
  - Repeatable seed script added: `scripts/seed_phase6_vertical_slice.sh`.
  - Detailed notes are in `docs/phase-6a-report.md`.

- **Phase 6B (Backend A/B Test Design)**: **DESIGN COMPLETED**.
  - Backend A/B is prioritized before multi-repo fanout because implementation quality is still the largest variable.
  - Cursor via OpenClaw `cursor_agent` is the current baseline.
  - Codex/Claude variants are deferred until the user confirms access and a non-interactive tool path exists.
  - Implementation Agent now has backend selector metadata (`cursor` default; unsupported future values fail explicitly).
  - Metric template added: `docs/phase-6b-report.md`.
  - Detailed design is in `docs/phase-6b-backend-ab-plan.md`.

- **Phase 6C (Multi-Repo Fanout Runtime)**: **AUTOMATED FANOUT + WORKER RESTART CHAOS PASSED**.
  - Live runtime inspection on 2026-04-26 confirmed services healthy and no active files in `agent/inbox/` or `agent/running/`.
  - Phase 6A terminal proof remains available at `agent/done/01PH6AVERTICAL000000000602/`.
  - Note: the bundled Phase 6A task file still has `status: running` / `current_step: reviewing`; directory placement + review verdict are the terminal-state evidence.
  - `target-repos/api` is dirty and on branch `task/01JSP4YA9D0000000000000002`; do not reset it without user approval.
  - Cursor remains the only active implementation backend.
  - Added fixture repos: `target-repos/bff`, `target-repos/web`, and `target-repos/batch`.
  - Added fanout schema and helpers:
    - `docs/fanout-task-schema.md`
    - `scripts/seed_phase6c_fanout.sh`
    - `scripts/aggregate_phase6c_fanout.py`
    - `scripts/release_phase6c_ready_children.py`
  - First runtime fanout was started with `./scripts/seed_phase6c_fanout.sh --runtime`.
  - Root child tasks were released for `api` and `batch`; dependent `bff` and `web` were later released in dependency order.
  - `target-repos/api` was modified successfully with `GET /version` and `tests/version.test.js`; `npm test` passes.
  - All four child tasks reached `done`: `api`, `batch`, `bff`, and `web`.
  - Repeatability run passed with new parent task id `01PH6CFANOUT000000000002`; all four `...002` child tasks reached `done`.
  - Added and activated `Fanout Aggregator` workflow:
    - `n8n-workflows/fanout-aggregator.json`
    - `n8n-workflows/fanout-aggregator.n8n.js`
  - Parent fanout artifacts are now terminalized into `agent/done/{parent_task_id}/`.
  - Automated parent aggregation was verified with `01PH6CFANOUT000000000003`; parent and all four child tasks reached `done`.
  - Added and activated `Fanout Child Releaser` workflow:
    - `n8n-workflows/fanout-child-releaser.json`
    - `n8n-workflows/fanout-child-releaser.n8n.js`
  - Dependency-gated child release was verified with `01PH6CFANOUT000000000004`; only the initial seed was manual.
  - `Fanout Child Releaser` released staged `bff` and `web` automatically when dependencies reached `done`.
  - `Fanout Aggregator` terminalized parent `01PH6CFANOUT000000000004` into `agent/done/01PH6CFANOUT000000000004/`.
  - Worker restart chaos validation was run with `01PH6CFANOUT000000000005`.
  - The chaos run exposed and fixed an Aggregator race: `missing/staged/running` children must keep parent `waiting`; only explicit child `error` should parent-error.
  - Parent `01PH6CFANOUT000000000005` and all four child tasks reached `done` after recovery.
  - A second worker restart chaos run was executed at the staged release boundary with `01PH6CFANOUT000000000006`.
  - Restart timing: `bff` was running and `web` was still staged.
  - Parent `01PH6CFANOUT000000000006` and all four child tasks reached `done`; `agent/fanout/`, `agent/running/`, and Phase 6C error state are empty.
  - `agent/running/` and `agent/error/` are empty after the run.
  - Exported Implementation and Execution workflow sources now resolve `target_repo` from task frontmatter.
  - Phase 6C deterministic fixture fast paths were added to avoid n8n task-runner heartbeat timeouts on the OpenClaw/Cursor path.
  - Planning and validation notes:
    - `docs/phase-6c-multirepo-plan.md`
    - `docs/phase-6c-report.md`

- **Phase 6D (Cursor/OpenClaw Fanout Smoke)**: **COMPLETE — ARCHITECTURAL PIVOT TO PHASE 6E**.
  - n8n runner timeout config was tuned in `docker-compose.yml`:
    - `N8N_RUNNERS_HEARTBEAT_INTERVAL=300`
    - `N8N_RUNNERS_TASK_REQUEST_TIMEOUT=300`
  - `Implementation Agent` now supports `force_cursor: true` to skip deterministic fast paths for selected child tasks.
  - Cursor completion detection now performs a final `chat.history` check for the task's `IMPLEMENTATION_RESULT:{task_id}` marker.
  - Added seed helper: `scripts/seed_phase6d_cursor_smoke.sh`.
  - Runtime smoke fanout `01PH6DFANOUT000000000001` completed:
    - `api` child used real Cursor/OpenClaw and reached `done`.
    - `bff`, `web`, and `batch` used deterministic paths and reached `done`.
    - parent aggregate reached `done`.
  - API Cursor child added `GET /cursor-smoke` and `tests/cursor-smoke.test.js`.
  - Final tests passed:
    - `api`: 3 files / 4 tests
    - `bff`: 2 tests
    - `web`: 2 tests
    - `batch`: 1 test
  - Repeatability attempt `01PH6DFANOUT000000000002` exposed remaining risk:
    - initial API child attempt hit `openclaw_gateway_unreachable: websocket open timeout`
    - retry allowed Cursor/OpenClaw to modify code successfully (`GET /cursor-smoke-002`, focused test)
    - local API tests passed with 4 files / 5 tests
    - but the n8n artifact loop did not persist standard build/test/review/done artifacts for the retried API child
    - parent `...002` was manually terminalized as error to stop active fanout scanning
  - Implementation Agent artifact persistence instrumentation was added:
    - `agent/debug/implementation-agent.jsonl`
    - `agent/debug/tasks/{task_id}.jsonl`
    - atomic write + read-back verification for build, running task updates, and error routing
  - Diagnostic run `01PH6DFANOUT000000000003` proved standard build/error artifacts are written and verified when the Code node reaches the persistence path.
  - Diagnostic run `01PH6DFANOUT000000000004` exposed stale history contamination from shared OpenClaw session state.
  - Implementation Agent now uses per-task OpenClaw session keys: `agent:dev:main:{task_id}`.
  - Diagnostic run `01PH6DFANOUT000000000005` no longer mixed stale history, but Cursor/OpenClaw did not complete within the 180 second polling window; build/error artifacts were written and verified.
  - Completion polling probe was added and run with `01PH6DFANOUT000000000006`.
  - All probed run-status RPC methods (`runs.get`, `runs.status`, `run.get`, `run.status`, `chat.run.*`) returned `INVALID_REQUEST: unknown method`.
  - **Conclusion**: Artifact persistence is reliable. OpenClaw has no stable status/result RPC. The state source must be self-owned.
  - **Architectural decision**: Phase 6E introduces a Local Implementation Runner that owns `agent/jobs/` as the source of truth. OpenClaw becomes one pluggable backend adapter.
  - Detailed notes are in `docs/phase-6d-report.md`.

- **Phase 6E (Local Implementation Runner)**: **IMPLEMENTED — CURSOR-BACKED FANOUT VALIDATED**.
  - Added schemas:
    - `runner/schemas/job-request.schema.json`
    - `runner/schemas/job-status.schema.json`
    - `runner/schemas/job-result.schema.json`
  - Added local runner and adapters:
    - `runner/runner.js`
    - `runner/adapters/cursor-openclaw.js`
    - `runner/adapters/hermes.js` (stub)
  - Added runner dependency:
    - `runner/package.json`
    - `runner/package-lock.json`
  - `Implementation Agent` now submits/polls local job artifacts:
    - writes `agent/jobs/{task_id}.request.json`
    - reads `agent/jobs/{task_id}.status.json` / `result.json`
    - returns `JOB_PENDING` while waiting
  - Synthetic integration smoke validated end-to-end:
    - request submission
    - runner status/result writes
    - implementation-agent result consumption and build artifact generation
  - Deterministic Cursor completion channel added:
    - Cursor now writes `agent/jobs/{task_id}.completion.json`
    - Runner uses completion artifact as primary terminal signal
  - Full runtime validation passed with parent `01PH6DFANOUT000000000012`:
    - API child (`01PH6DAPI000000000000012`) completed through local runner
    - completion artifact and result artifact both present
    - all four children reached `done`
    - fanout parent reached `done`
  - Additional stability hardening on 2026-04-29:
    - Repeatability run passed with parent `01PH6DFANOUT000000000013` (all children + parent `done`)
    - Chaos run passed with parent `01PH6DFANOUT000000000014` after mid-flight `docker compose restart n8n-worker`
    - Post-fix validation run passed with parent `01PH6DFANOUT000000000015` after runner restart
    - `task_phase6e_hermes_smoke.md` stale lock residue was cleaned from `agent/running/`
    - Runner heartbeat added (`LOCAL_RUNNER_HEARTBEAT_MS`, default 15s): `status.json.updated_at` now refreshes while `running`
    - Implementation watchdog added (`LOCAL_RUNNER_STALE_RUNNING_SECONDS`, default 900s): stale `running` jobs are terminalized as timeout
    - Runner result path normalization added: `changed_files` now emitted as project-relative paths under `target-repos/...`
  - Historical cleanup completed:
    - historical staged leftovers for `01PH6DFANOUT000000000007` through `...011` were archived under `agent/archive/phase6d-history-cleanup-20260429T044149Z/`
    - matching fanout error files for `...007` through `...011` were archived under `agent/archive/phase6d-history-cleanup-20260429T044149Z/error/files/`
    - traceability manifest: `agent/archive/phase6d-history-cleanup-20260429T044149Z/manifest.txt`
    - unrelated older forensic artifacts may still remain under `agent/error/`
  - Detailed notes are in `docs/phase-6e-report.md`.

## 2. Pipeline v0.1 Architecture Summary

Instead of a monolithic agent or linear script, tasks flow through an artifact-driven loop mapped to specialized roles:

1. **Planning Agent**: Reads request → outputs `plan.md`.
2. **Test Generation Agent**: Reads request+plan → outputs `test-plan.md` *(TDD Gate)*.
3. **Implementation Agent**: Reads plan+test-plan → writes/polls Local Runner artifacts under `agent/jobs/{task_id}.request.json`, `status.json`, and `result.json`; Local Runner dispatches to OpenClaw/Cursor as the default backend adapter → outputs `build.md`.
4. **Execution & Analysis Agent**: Runs `npm test` → outputs `test-run.md` (short-circuits on basic failures).
5. **Review & Optimization Agent**: LLM-as-a-judge reads all artifacts → outputs `review.md` with routing verdict.

*(See `docs/RESEARCH_REFERENCES.md` for the academic papers backing this design).*

## 3. Next Steps for the New Agent (交接任务)

The next agent should finish documentation synchronization first, then write a short
6E acceptance snapshot memo, then prepare Backend A/B entry gates. Core runtime
validation with one real Cursor child has passed.

**Immediate To-Dos for the new session:**

1. Finish doc synchronization for the Phase 6E Local Runner baseline.
2. Write a 6E acceptance snapshot memo after docs are synchronized.
3. Prepare Backend A/B gates, while keeping Codex/Claude execution deferred until the user confirms access and a non-interactive path.
4. Do not reset or clean `target-repos/api` without explicit user confirmation.
5. Apply the historical archive policy below whenever cleanup is needed.

## 4. Seed & Runtime Policy

- `fixtures/seed_tasks/` stores canonical seed inputs and is tracked by Git.
- `agent/inbox/` is runtime queue state and is ignored by Git.
- Before demos/tests, load seeds with:

```bash
./scripts/load_seed_tasks.sh
```

- Use `--force` only when you intentionally want to replace current inbox tasks.

### Historical Archive Policy

- Baseline archive completed on 2026-04-29: `agent/archive/phase6d-history-cleanup-20260429T044149Z/`.
- For future cleanup, **archive first, never direct-delete**:
  - move stale historical files into `agent/archive/phase6d-history-cleanup-<UTC_TIMESTAMP>/`
  - write a `manifest.txt` listing source path, destination path, and missing entries
- Only archive artifacts that are not active runtime state (must not be in `agent/inbox/`, `agent/running/`, or pending `agent/jobs/` flow).
- Keep archived artifacts as forensic evidence; any hard deletion requires explicit user approval.

## 5. Integration Knowledge for Teaching

- n8n + OpenClaw Gateway 联调经验已沉淀在：
  - `docs/n8n-openclaw-integration-runbook.md`
- 该文档包含真实故障分类、人工干预点、验证清单和安全注意事项，可直接作为教程素材。

## 6. Tutorial Backlog (AI Chat Collaboration First)

暂不写教程正文，先记录“后续要写什么”：

1. 主题聚焦：不是“正确架构结论”，而是“如何与 Cursor 协同，再把 Prompt 交给 OpenClaw 执行并回传结果”。
2. 固定循环：`向 Cursor 要执行 Prompt -> 粘贴到 OpenClaw -> 回传原始输出 -> 让 Cursor 生成下一轮 Prompt`。
3. 标准回传模板：必须包含 `input prompt`、`raw output`、`exit/error`、`changed files`。
4. 失败处理框架：先分类（环境/权限/工具路由/业务逻辑），再生成下一步最小动作 Prompt。
5. 安全边界：严禁回传 secrets（`.env`、tokens、keys）；仅共享必要日志片段。
