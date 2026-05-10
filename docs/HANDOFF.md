# Agent Handoff & Current State

> **Single source of truth**: This file is the only handoff document for this project.
> Do not create or maintain a separate root-level `handoff.md`; future `agent-continuity` checkpoints should be appended here.

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

- **Phase 6B (Backend A/B Test Execution)**: **CLOSED (CLOSE_NOW)**.
  - Accepted checkpoint range: `01PH6BABSMOKE000000000102` through `...108`.
  - Execution pattern is stable and repeatable:
    - strict guards before seed,
    - runtime seed via `scripts/seed_phase6b_backend_ab_smoke.sh`,
    - bounded watch with heartbeat-aware extension policy,
    - acceptance gates on triad/terminal/endpoint-test evidence/quality gate.
  - Cursor (OpenClaw path) and Codex both reached terminal `completed` across accepted checkpoints.
  - Final closure docs:
    - `docs/phase-6b-report.md`
    - `docs/phase-6b-closure-memo.md`
  - Design reference remains in `docs/phase-6b-backend-ab-plan.md`.

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
  - Continuation updates on 2026-04-30:
    - Added Hermes minimal validation plan doc: `docs/phase-6e-hermes-validation-plan.md`
    - Executed Hermes stub contract validation task `01PH6EHERMESVAL000000000001`; terminal artifacts match expected stub failure (`phase_6e_stub`) with empty `changed_files`
    - Added Codex tuning notes: `docs/codex-runner-tuning.md`
    - Codex adapter now supports optional tuning knobs with default-safe behavior:
      - `CODEX_TIMEOUT_BUFFER_SECONDS`
      - `CODEX_PLAN_MAX_CHARS`
      - `CODEX_TEST_PLAN_MAX_CHARS`
      - `CODEX_STDERR_TAIL_CHARS`
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

The next agent should treat Phase 6B as closed and move into focused post-closure
tracks while preserving the now-stable execution baseline.

**Immediate To-Dos for the new session:**

1. Start Hermes review track from the stable Phase 6B baseline.
2. Start Codex usage optimization track (cost/latency/reliability tuning).
3. Keep Claude backend execution deferred until access and non-interactive route are confirmed.
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

## 7. Session Closure Note (2026-04-29)

- This session used a two-agent coordination model (Cursor <-> Codex) through file-based communication under `agent/comms/`.
- Phase 6B closure was completed under that model, including:
  - accepted checkpoint range `...102` to `...108`,
  - closure artifacts in:
    - `docs/phase-6b-report.md`
    - `docs/phase-6b-closure-memo.md`
    - updated `docs/HANDOFF.md`
- This current agent session is intentionally stopping after handoff preparation.
- Next agent should continue discussion and execution planning for:
  - HermesAgent track,
  - Codex CLI optimization track.
- Keep using scoped commits, avoid runtime artifact commits, and keep `target-repos/api` non-destructive unless explicitly approved.

## 8. Continuity Snapshot (2026-05-03)

This section reconciles `PLAN.md`, phase docs, and current workspace state for safe resume.

### 8.1 Baseline Alignment

- `PLAN.md` currently declares **Phase 6E implemented and validated** as the active execution baseline.
- `docs/phase-6e-report.md` records Local Runner delivery:
  - `agent/jobs/` contract and schemas,
  - runner lifecycle (`queued/claimed/running/...`),
  - Cursor completion artifact protocol,
  - repeatability + chaos validations up to parent `...015`.
- `docs/phase-6e-acceptance-memo.md` accepts 6E as baseline, but explicitly **not** full original POC closure.

### 8.2 Pending vs Closed Clarification

- `REPORT.md` reflects a **historical Phase 5 baseline** where pass rate was 0% due to then-unstable implementation path.
- This does not invalidate Phase 6E acceptance; it means:
  - orchestration reliability was proven earlier,
  - implementation reliability improved later via Local Runner,
  - strict full-plan re-baseline (10-task runner path + full metrics rollup) remains pending.

### 8.3 Additional Planning Artifacts Present

- `docs/phase-6e-hermes-validation-plan.md` defines minimal, non-destructive Hermes stub contract validation (expected deterministic failed terminal artifacts, no repo mutation).
- `docs/codex-runner-tuning.md` records optional Codex adapter tuning knobs and safe rollout profile for reliability/latency/cost control.

### 8.4 Live Workspace Evidence (2026-05-03)

From `git status --short` at repository root:

- tracked modified:
  - `docker-compose.yml`
  - `n8n-workflows/execution-analysis-agent.n8n.js`
  - `runner/adapters/cursor-openclaw.js`
- untracked highlights:
  - `REPORT.md`
  - `handoff.md`
  - fanout workflow exports (`n8n-workflows/fanout-aggregator.*`, `n8n-workflows/fanout-child-releaser.*`)
  - Phase 6 helper scripts under `scripts/`
  - fixture repos under `target-repos/{api,batch,bff,web}/`

Operational consequence:

- repository is intentionally dirty; do **not** do destructive cleanup or resets without explicit human approval.

### 8.5 Resume Priority (Updated)

1. Keep Phase 6E Local Runner as execution baseline.
2. Treat Backend A/B as pending and gate execution on second backend readiness + non-interactive path.
3. Keep Hermes track in contract-validation mode unless explicitly upgraded beyond stub.
4. If Codex backend is enabled, apply tuning knobs conservatively and benchmark against baseline before broad rollout.
5. Preserve archive-first policy for historical runtime artifacts; no direct deletion of forensic traces.

## 9. Agent Continuity Handoff (2026-05-03)

### Status
READY TO CONTINUE

### Original Goal
Stabilize OpenClaw local runtime for current operations, keep MiniMax path active, remove unusable OpenAI path, and recover WeCom channel usability without breaking CLI startup.

### Current State
- Confirmed fact with evidence: this project uses `docs/HANDOFF.md` as the single handoff document (`Single source of truth` note at top of this file).
- Confirmed fact with evidence: repository working tree is still intentionally dirty (`git status --short`) with tracked edits in `docker-compose.yml`, `docs/HANDOFF.md`, `n8n-workflows/execution-analysis-agent.n8n.js`, `runner/adapters/cursor-openclaw.js`, plus existing untracked runtime/fixture files.
- Confirmed fact with evidence: active OpenClaw agents are `main`, `dev`, `research`, `voice`, `image-orchestrator` (`openclaw config get agents.list`).
- Confirmed fact with evidence: active model providers contain only `minimax-cn` (`openclaw config get models.providers`).
- Confirmed fact with evidence: WeCom channel is currently healthy (`openclaw channels status --deep` -> `wecom default (企业微信): enabled, configured, running`).
- Confirmed fact with evidence: WeCom plugin currently loads (`openclaw plugins inspect wecom-openclaw-plugin` -> `Status: loaded`).
- Confirmed fact with evidence: `openclaw-weixin` plugin is uninstalled (`openclaw plugins inspect openclaw-weixin` -> `Plugin not found`).
- Confirmed fact with evidence: WeCom plugin runtime export was locally patched to align plugin id (`~/.openclaw/extensions/wecom-openclaw-plugin/dist/index.esm.js` contains `id: "wecom-openclaw-plugin"`).

### Recent Progress
- Removed OpenAI runtime usage path from OpenClaw config and removed `~/.openclaw/agents/openai`.
- Diagnosed WeCom startup breakage as plugin id mismatch between config id and plugin runtime export.
- Applied local compatibility patch in WeCom plugin dist files and restored successful load.
- Verified end state with channel and plugin status commands.

### Next Minimal Step
Run one live WeCom send/read smoke check from OpenClaw to confirm end-to-end message path (not only loaded/configured state).

### Next 3 Steps
1. Run `openclaw channels status --deep` and `openclaw plugins inspect wecom-openclaw-plugin` once at session start to confirm service still healthy after restarts.
2. Perform one non-destructive WeCom test action (`channels` or `message` command) and capture outcome in this handoff.
3. If plugin update/reinstall occurs, re-check plugin id consistency; if mismatch reappears, reapply or replace with official fixed release.

### Unfinished Work
#### High
- Validate WeCom real message flow (send/receive) beyond status-level checks; dependency: available test recipient; verification: successful command + observable delivery.

#### Medium
- Formalize a persistent plugin policy (`plugins.allow`) to reduce auto-discovery noise and avoid accidental loading regressions; dependency: decide trusted plugin allowlist; verification: startup logs no longer warn on broad auto-load.

#### Low
- Document local WeCom compatibility patch procedure in project docs so future operators can recover quickly after plugin reinstall.

### Blockers
- Blocker: none active for current MiniMax + WeCom baseline.
  - Likely cause: n/a.
  - Impact: n/a.
  - Confidence: high.
  - Possible workaround: n/a.

### Do Not Retry Without New Evidence
- Do not re-enable/reinstall OpenAI agent/provider path unless API billing is explicitly available; previous run returned `You exceeded your current quota`.
- Do not repeatedly run interactive uninstall commands without `--force`; the first uninstall attempt stalled at `y/N` prompt.

### Files And Artifacts
- `docs/HANDOFF.md`: canonical continuity source, updated with this section.
- `~/.openclaw/openclaw.json`: current OpenClaw runtime config (MiniMax-only providers; WeCom plugin enabled).
- `~/.openclaw/extensions/wecom-openclaw-plugin/dist/index.esm.js`: local compatibility patch (`id: "wecom-openclaw-plugin"`).
- `~/.openclaw/extensions/wecom-openclaw-plugin/dist/index.cjs.js`: local compatibility patch mirror.

### Decisions
- Decision: keep OpenAI path removed for now.
  - Reason: user does not want OpenAI API paid usage.
  - Evidence: successful cleanup and provider list now MiniMax-only.
- Decision: keep WeCom plugin restored and loaded with local compatibility patch.
  - Reason: user confirmed WeCom is useful and wants it operational.
  - Evidence: plugin inspect reports `Status: loaded`; channel status reports `running`.

### Assumptions
- Assumption: local WeCom plugin patch is acceptable as a temporary operational workaround.
  - Why it is plausible: it resolved startup mismatch immediately and channel status is healthy.
  - How to verify: continue successful operation across gateway restarts and after any plugin update.

### Quick Resume
OpenClaw baseline is currently MiniMax-only, with WeCom channel restored and running. `openclaw-weixin` is removed, and WeCom plugin now loads via a local id-compatibility patch. Next agent should run one real WeCom message smoke test, then record proof in this file. Keep `docs/HANDOFF.md` as the only handoff source.

## 10. OpenClaw WeCom Recovery Update (2026-05-03)

### Status
WECom SEND PATH RESTORED

### What Changed
- Codex environment note: the `openclaw` shim under Node v24 may still execute with Codex's Node v20 PATH. Use:
  - `/Users/chenxin/.nvm/versions/node/v24.14.0/bin/node /Users/chenxin/.nvm/versions/node/v24.14.0/lib/node_modules/openclaw/openclaw.mjs ...`
- Confirmed gateway and channel health after repair:
  - `gateway health` -> `OK`
  - `channels status --deep` -> `wecom default (企业微信): enabled, configured, running`
  - `plugins inspect wecom-openclaw-plugin` -> `Status: loaded`
- Patched local WeCom plugin dist files for OpenClaw 2026.4.23 SDK compatibility:
  - `~/.openclaw/extensions/wecom-openclaw-plugin/dist/index.esm.js`
  - `~/.openclaw/extensions/wecom-openclaw-plugin/dist/index.cjs.js`
- Backups created before patch:
  - `index.esm.js.bak-codex-20260503-compat`
  - `index.cjs.js.bak-codex-20260503-compat`

### Compatibility Fixes Applied
- Replaced old `openclaw/plugin-sdk` aggregate import usage with current SDK subpaths:
  - `openclaw/plugin-sdk/json-store`
  - `openclaw/plugin-sdk/file-lock`
  - `openclaw/plugin-sdk/setup`
  - `openclaw/plugin-sdk/channel-plugin-common`
- Replaced the removed `formatPairingApproveHint(...)` call with a static approve hint.
- Removed unsafe `...rest` expansion from WeCom `sendText` / `sendMedia` debug logs because gateway runtime objects can contain circular `Timeout` references and can leak config.

### Verification
- Restarted gateway service with `openclaw gateway restart`.
- WeCom websocket reached authenticated state and saved MCP config.
- Smoke send succeeded:
  - command target: `ChenXin`
  - result: `Sent via gateway (wecom)`
  - message id: `aibot_send_msg_1777799509920_dfb982cc`

### Important Target Note
- `Macmini` in the Enterprise WeChat UI is the bot display name, not a valid WeCom API chat id.
- Sending to `Macmini` reaches the WeCom SDK but fails with `errcode=93006 invalid chatid`.
- Use a real WeCom user/chat id such as the verified `ChenXin` target, or have the desired recipient send a fresh message to the bot so the runtime can expose/log the correct sender target.

### Remaining Follow-Up
- Consider setting a strict `plugins.allow` list to remove auto-load warnings and reduce future plugin regressions.
- If the WeCom plugin is updated or reinstalled, re-check the local compatibility patch and plugin id patch before relying on message delivery.

## 11. OpenClaw Daily WeCom Cron Recovery (2026-05-03)

### Status
VOICE AI DAILY CRON VERIFIED

### What Changed
- Found two existing daily OpenClaw cron jobs:
  - `cf79fcc6-8e9b-45c7-b36c-ff4b440b7731`: `全球新闻简报`, `30 7 * * *`, delivery `wecom:ChenXin`.
  - `c0e0f4bb-2f57-493e-a042-3b53d0266581`: `语音 AI 热点播报`, `0 8 * * *`, delivery `wecom:ChenXin`.
- Recent cron failures were due to two separate drift points:
  - delivery resolver error: `Unsupported channel: wecom`
  - legacy model setting: `minimax-cn/MiniMax-M2.5`, which the current MiniMax token plan no longer supports.
- Updated both cron jobs to use `minimax-cn/MiniMax-M2.7`.

### Verification
- Manually triggered `语音 AI 热点播报` with:
  - `openclaw cron run c0e0f4bb-2f57-493e-a042-3b53d0266581 --expect-final --timeout 180000`
- Resulting cron task:
  - task id: `cb5b2f9c-2c3a-49ef-8076-9e61c9084a49`
  - status: `succeeded`
  - cron list status: `ok`
  - delivery state reported `delivered`.
- The daily voice AI report should now run again at 08:00 Asia/Tokyo and deliver to `ChenXin`.

### Remaining Follow-Up
- `全球新闻简报` has been updated to `MiniMax-M2.7` but has not yet been manually re-run after the model update in this checkpoint.
- Historical failed cron tasks remain in OpenClaw task history; do not delete runtime/forensic records unless the user explicitly approves cleanup.

## 12. Global News Brief Manual Run (2026-05-03)

### Status
GLOBAL NEWS BRIEF GENERATED AND DELIVERED TO CHENXIN

### What Happened
- Manually triggered `全球新闻简报` after updating it to `minimax-cn/MiniMax-M2.7`.
- First attempt created cron task `7328bf94-2d28-40cc-bb2a-67c3a5cd3191`, which became `lost` with `backing session missing` at about five minutes.
- The report text was nevertheless generated and recovery delivery attempted to send stale queue entries first.
- Stale delivery queue entries targeted invalid WeCom destinations:
  - old group/chat id beginning `-100...`
  - `Macmini`, which is a bot display name and not a valid WeCom chat id.

### Verification
- The generated report was delivered to `ChenXin`.
- Gateway log confirmed:
  - `Reply ack received for reqId: aibot_send_msg_1777807711164_eb6ebbb4`
  - `Sent message to ChenXin, messageId=aibot_send_msg_1777807711164_eb6ebbb4`
- OpenClaw also sent a failure alert to `ChenXin` because stale queue delivery to the invalid group/chat id failed before the successful `ChenXin` delivery.

### Cleanup
- Archived five stale delivery queue files to:
  - `~/.openclaw/delivery-queue/archive-codex-20260503/`
- After archival, `~/.openclaw/delivery-queue/` had no remaining top-level queued files.
- No delivery artifacts were deleted.

### Remaining Follow-Up
- `cron list` may still show `全球新闻简报` status `error` until the next clean scheduled/manual run updates the job state.
- The job now has `timeoutSeconds: 900` to avoid five-minute loss for longer global-news runs.

## 13. Local Agent CLI Matrix Check (2026-05-04)

### Status
OPENCLAW/HERMES X CURSOR/CODEX MATRIX PARTIALLY VERIFIED

### Root And CLI Baseline
- Confirmed matrix test root under `/Volumes/WDC2T/Project`.
- Test artifacts were isolated under:
  - `/Volumes/WDC2T/Project/agent-cli-matrix-tests/logs`
  - `/Volumes/WDC2T/Project/agent-cli-matrix-tests/workspaces`
- Confirmed CLI paths:
  - `cursor-agent`: `/Users/chenxin/.local/bin/cursor-agent`, version `2026.05.01-eea359f`
  - `codex`: `/Users/chenxin/.local/bin/codex`, version `codex-cli 0.128.0`
  - `hermes`: `/Users/chenxin/.local/bin/hermes`, version `Hermes Agent v0.11.0 (2026.4.23)`
  - OpenClaw explicit CLI path remains `/Users/chenxin/.nvm/versions/node/v24.14.0/bin/node /Users/chenxin/.nvm/versions/node/v24.14.0/lib/node_modules/openclaw/openclaw.mjs`

### OpenClaw Configuration Findings
- OpenClaw Gateway health is OK.
- `cursor-agent` and `codex-agent` plugins are loaded and register `cursor_agent` / `codex_agent`.
- `cursor-agent` plugin has `project-root` mapped to `/Volumes/WDC2T/Project`.
- Global `tools.allow` now contains `cursor_agent` and `codex_agent`; backup before this change:
  - `~/.openclaw/openclaw.json.bak-codex-20260504-tools-allow`
- Important: `openclaw agent --agent main --message "/cursor ..."` does not prove plugin invocation. It is treated as normal agent text in this path.
- Important: `--agent main` did not inject the plugin tools during this check, even with global `tools.allow`.
- Use `--agent dev` for verified OpenClaw plugin tests. The `dev` agent has per-agent `tools.alsoAllow: cursor_agent, codex_agent`.

### Matrix Results
- OpenClaw -> Cursor:
  - ask: passed via `openclaw agent --agent dev`, sentinel `OPENCLAW_DEV_CURSOR_TOOL_ASK_OK`.
  - model/mode: Cursor model list was confirmed directly and via Hermes; `auto` exists. OpenClaw->Cursor model/plan runs returned "analysis completed" with no useful streamed details.
  - agent: passed; project created at `/Volumes/WDC2T/Project/agent-cli-matrix-tests/workspaces/openclaw-dev-cursor-python`; bash and zsh test runs passed with 11 unittest cases.
  - plan: callable, but headless Cursor plan output was empty/non-useful in this environment.
- OpenClaw -> Codex:
  - ask: passed via `openclaw agent --agent dev`, sentinel `OPENCLAW_DEV_CODEX_TOOL_ASK_OK`.
  - model/mode: passed; Codex current model reported `gpt-5.5`; debug catalog includes `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.2`, `codex-auto-review`; sandbox modes include `read-only`, `workspace-write`, and `danger-full-access`.
  - agent: passed; project created at `/Volumes/WDC2T/Project/agent-cli-matrix-tests/workspaces/openclaw-dev-codex-python`; bash and zsh test runs passed with 2 unittest cases.
  - plan: passed; returned a non-executing README-index plan and stated no files were modified; sentinel `OPENCLAW_DEV_CODEX_PLAN_OK`.
- Hermes -> Cursor:
  - ask: passed, sentinel `HERMES_CURSOR_ASK_OK`.
  - model/auto: passed; `cursor-agent models` reports `auto`, and `cursor-agent --model auto --mode ask` returned `HERMES_CURSOR_AUTO_ASK_OK`.
  - agent: passed; project created at `/Volumes/WDC2T/Project/agent-cli-matrix-tests/workspaces/hermes-cursor-python`; bash test run passed with 2 unittest cases.
  - plan: command route works, but Cursor plan mode produced empty stdout; Hermes can summarize a plan itself, but that is not proof that Cursor produced one.
- Hermes -> Codex:
  - ask: passed, sentinel `HERMES_CODEX_ASK_OK`.
  - model: passed; `codex debug models` exposed Codex model catalog.
  - agent: passed; project created at `/Volumes/WDC2T/Project/agent-cli-matrix-tests/workspaces/hermes-codex-python`; tests pass when run from that project directory. Its generated `scripts/run_tests.sh` is cwd-dependent.
  - plan: passed; returned a non-executing plan with sentinel `HERMES_CODEX_PLAN_OK`.

### Remaining Follow-Up
- Set an explicit `plugins.allow` list for local plugins to remove the OpenClaw trust warning.
- Decide whether `main` should inherit the verified `dev` agent tool policy or whether matrix/runner work should intentionally use `dev`.
- Cursor Agent headless `--mode plan` returns empty stdout in this environment; treat plan-mode Cursor results as not reliable until fixed upstream or wrapped with a different capture path.

### Cursor Plan Mode Follow-Up (2026-05-04)
- OpenClaw `--agent dev` is accepted as the intended route for OpenClaw -> Cursor/Codex work. Future agents should default to `openclaw agent --agent dev ...` when they need the `cursor_agent` or `codex_agent` plugin tools.
- Cursor official docs/changelog say CLI plan mode exists via `/plan` or `--mode=plan`, and plan mode can ask clarifying questions before producing a plan.
- Local CLI help confirms:
  - `--mode plan`: read-only/planning, analyze and propose plans, no edits
  - `--plan`: shorthand for `--mode=plan`
  - `--output-format`: `text`, `json`, or `stream-json`, only with `--print`
- Local headless retest:
  - `cursor-agent --print --mode plan --output-format text ...` exited 0 with empty stdout.
  - `cursor-agent --print --mode plan --output-format json ...` exited 0 and returned JSON, but the `result` stopped at research/status text and did not emit the requested final markdown plan or sentinel.
  - Adding "Do not ask clarifying questions" still returned only progress/status text, not the final plan.
- Initial conclusion (now superseded): Cursor CLI plan mode is documented, but this installed headless path is not yet reliable as an agent-to-agent "return final Markdown plan" primitive.
- Resolution: see Section 14 below. Plan mode is reliable headless once captured via `--output-format stream-json` and the `createPlanToolCall.completed` event.

## 14. Cursor CLI Plan Mode Resolution (2026-05-04)

### Status
HEADLESS PLAN MODE FIXED VIA STREAM-JSON CAPTURE PATH

### Root Cause
`cursor-agent --print --mode plan` does not deliver the final markdown plan via stdout text or via the `result` field of `--output-format json`. The model emits the final plan as a structured **tool call** that the IDE renders into its plan UI:

```jsonc
{
  "type": "tool_call",
  "subtype": "completed",
  "tool_call": {
    "createPlanToolCall": {
      "args": {
        "plan": "<full markdown plan>",
        "todos": [{ "id": "...", "content": "...", "status": "TODO_STATUS_PENDING", ... }],
        "overview": "...",
        "name": "...",
        "phases": []
      }
    }
  }
}
```

`--output-format text` therefore prints almost nothing (only background progress text from the assistant stream, which is also empty in plan mode). `--output-format json` reports `{"type":"result","subtype":"success","result":"<progress-only>"}` and never carries the plan body. The plan is only visible in the **stream-json** event log, which exposes every tool call.

### Verified Headless Capture Recipe
1. Run plan mode with the stream protocol:
   ```bash
   cursor-agent --print --mode plan \
     --output-format stream-json \
     --trust --workspace <DIR> \
     "<PROMPT>"
   ```
2. Extract the markdown body and structured todos from the stream:
   ```bash
   jq -r 'select(.type=="tool_call" and .subtype=="completed" and (.tool_call.createPlanToolCall != null)) | .tool_call.createPlanToolCall.args.plan' stream.ndjson
   jq -c 'select(.type=="tool_call" and .subtype=="completed" and (.tool_call.createPlanToolCall != null)) | .tool_call.createPlanToolCall.args.todos' stream.ndjson
   ```

### Reproducible Matrix Evidence (2026-05-04)
All experiments use the same prompt body, target workspace `/Volumes/WDC2T/Project`, and a sentinel line in the prompt to confirm the plan completed. Logs are under `/Volumes/WDC2T/Project/agent-cli-matrix-tests/logs/cursor-plan/`.

| Label | Mode | `--output-format` | Exit | stdout bytes | Sentinel | Verdict |
|-------|------|-------------------|------|--------------|----------|---------|
| A | plan | stream-json | 0 | 60942 (240 lines) | yes (in tool_call) | reliable |
| B | plan | text | 0 | 1 | no | empty stdout |
| C | plan | json | 0 | 691 | no | result holds progress text only |
| D | plan | stream-json + `--stream-partial-output` | 0 | 71511 (312 lines) | yes (in tool_call) | reliable, same extraction |
| E | ask | text | 0 | 4258 | yes | reliable fallback (markdown direct in stdout) |
| F | plan + ambiguous prompt | stream-json | 0 | 152149 (98 lines) | yes (in tool_call) | clarifying questions are auto-skipped server-side; plan still produced |
| E2E | plan via `cursor_plan_run.sh` wrapper | stream-json | 0 | extracted plan.md 4128 bytes | yes | wrapper writes `*.plan.md`, `*.todos.json`, `*.meta.txt` |

Key behavioral findings:
- Headless plan mode **does not block on clarifying questions**. With ambiguous prompts the assistant stream contains lines like "用户跳过了范围题...我们以已探明的 fish-speech 为主制定计划" and the plan still completes. Treat clarifying behavior as informational, not as a blocker.
- The IDE-side approval channel `interaction_query/createPlanRequestQuery` is auto-acknowledged in headless mode (the `interaction_query/response` carries `result.success`), so no manual confirmation is required.
- `--stream-partial-output` only adds extra `assistant` text deltas for live UI rendering; the `createPlanToolCall.completed` event is identical and the same extractor works.
- Prompt with explicit target file paths and an explicit sentinel line is the simplest way to keep plans within scope. We do not need to add "Do not ask clarifying questions" wording.

### Local Plan Storage Notes
- `~/.cursor/plans/` contains historical IDE-side plan markdown files named like `<slug>_<8-char-hash>.plan.md` with YAML frontmatter (`name`, `overview`, `todos`, `isProject`). These are written by the **interactive IDE** plan UI; headless `cursor-agent --print` runs do not add new files there. Do not depend on this folder as a headless capture channel.
- `~/.cursor/chats/<workspace_hash>/<chat_uuid>/store.db` is a tiny SQLite KV store with two tables (`blobs(id, data BLOB)`, `meta(key, value)`). Format is private and not a stable extraction surface.

### Tooling Added (Test Harness Only, Not Project Business Code)
- `agent-cli-matrix-tests/scripts/cursor_plan_extract.sh` — extracts the markdown plan and structured todos from any cursor-agent stream-json log. Exit codes: 0 success, 2 no plan event found, 3 jq missing, 4 input error.
- `agent-cli-matrix-tests/scripts/cursor_plan_run.sh` — end-to-end wrapper. Runs cursor-agent in stream-json plan mode, writes raw `*.stream.ndjson`, extracts `*.plan.md` + `*.todos.json` via `cursor_plan_extract.sh`, and records `*.meta.txt` (timing, exit code, session id, model, event counts). Optional `--ask-fallback` re-runs the same prompt in `--mode ask --output-format text` if plan extraction fails.

Both scripts live under the matrix-test harness directory and are intentionally not added to the project's `scripts/` tree.

### Recommended A2A Plan Recipe
1. Compose the prompt with: target file paths, acceptance criteria, output sections, and a unique sentinel line.
2. Call `cursor_plan_run.sh --prompt-file ... --workspace ... --out-dir ... --label ... --ask-fallback`.
3. Read `<label>.plan.md` (markdown plan) and `<label>.todos.json` (structured todo list with stable ids) for downstream agents.
4. Use `<label>.meta.txt` for traceability (`session_id`, `model`, `elapsed_sec`, `createPlanCount`).

### Fallback / Substitute Plan Channels
- `--mode ask --output-format text`: returns the markdown plan directly in stdout. Use as fallback when stream-json extraction yields zero `createPlanToolCall` events. Trade-off: ask mode is conversational, not plan-tool semantics, so there is no structured todo list and no `interaction_query` lifecycle. Quality is comparable for short, well-scoped tasks.
- Codex plan via OpenClaw `--agent dev` (already verified in Section 13: `OPENCLAW_DEV_CODEX_PLAN_OK`, `HERMES_CODEX_PLAN_OK`). Useful when Cursor is rate-limited or when a non-Cursor plan source is desired for diversity.
- Cursor `agent` mode (no `--mode`): writes files. Not suitable as a planning primitive; use only for execution.

### Known Caveats
- `createPlanToolCall` is a private Cursor stream event name. If a future cursor-agent release renames it, the extractor must be updated. Pin cursor-agent version when relying on this contract; current verified version is `cursor-agent 2026.05.01-eea359f`.
- `--mode plan` returns no plan when the model decides to defer (e.g., model-side error, or refusal). The wrapper exits with code `2` in that case. The `--ask-fallback` flag covers this gracefully.
- Network/model latency averages ~85–150 s per plan call in this environment. Treat plan as a slow but reliable primitive; do not poll inside short-deadline n8n Code nodes.

### Decisions
- Headless Cursor plan mode is now considered reliable for agent-to-agent automation **only** through the stream-json + `createPlanToolCall` capture path documented above.
- The matrix-test wrapper is the canonical entry point for cross-agent integrations; project workflows should call it rather than re-implementing the capture logic.
- No project business code was modified during this fix.

### Quick Resume
Cursor CLI plan mode works headless. Use `--output-format stream-json` and extract `createPlanToolCall.completed.args.plan` (and `.args.todos`). Plain text/json output formats are confirmed unreliable. The wrapper at `agent-cli-matrix-tests/scripts/cursor_plan_run.sh` is the verified single-call interface and includes an ask-mode fallback. `~/.cursor/plans/` is IDE-only and not part of the headless contract.

## 15. OpenClaw / Hermes Cursor Plan Bridge Verified (2026-05-04)

### Status
LOCAL AGENT CLI MATRIX 8/8 GREEN

### Updated Full Matrix
| Caller → Backend | ask | agent | plan | Plan evidence |
|------------------|-----|-------|------|---------------|
| OpenClaw → Cursor | PASS (`OPENCLAW_DEV_CURSOR_TOOL_ASK_OK`) | PASS (Python project + 11 tests) | **PASS** | Section 15 / G3 — dev agent shell-bridge to `cursor_plan_run.sh` |
| OpenClaw → Codex  | PASS (`OPENCLAW_DEV_CODEX_TOOL_ASK_OK`)  | PASS (Python project + 2 tests)  | PASS (`OPENCLAW_DEV_CODEX_PLAN_OK`) | Section 13 |
| Hermes → Cursor   | PASS (`HERMES_CURSOR_ASK_OK`)            | PASS (Python project + 2 tests)  | **PASS** | Section 15 / G2 — terminal tool + cursor-agent stream-json + jq + fence echo |
| Hermes → Codex    | PASS (`HERMES_CODEX_ASK_OK`)             | PASS (Python project + 2 tests)  | PASS (`HERMES_CODEX_PLAN_OK`) | Section 13 |

### Why the Two Cursor-plan Cells Were Yellow Until Now
Section 14 fixed the **CLI primitive**: stream-json + `createPlanToolCall.completed.args.plan` reliably surfaces the plan body for any direct caller. But the wrapper layers above were still losing the plan:

- **OpenClaw cursor-agent plugin** (`~/.openclaw/extensions/cursor-agent/dist/index.js`):
  - Already runs cursor-agent with `--output-format stream-json` (`buildCommand` line ~155–160).
  - Parses `tool_call.completed` events but only normalizes them into `{ toolName, toolResult }` via `extractToolName` / `extractToolResult`, which look for `result|output|content` strings. They **do not** read `createPlanToolCall.args.plan` or `args.todos`.
  - Returns to the caller only `events[]` (tool name list + last assistant text) plus `resultText = result.result`, both of which are progress narration, not the plan.
  - Adds a hardcoded "CRITICAL INSTRUCTION ... Say ONLY: 'Cursor Agent analysis completed, results shown above.'" trailer that prevents the calling agent from reconstructing the plan even if it tried.
- **Hermes** does not ship a Cursor-specific plugin. It calls cursor-agent via the generic `terminal` tool, so the inner CLI fix is enough as long as the Hermes prompt asks it to use `--output-format stream-json` and `jq`-extract the plan.

### Experiment G2 — Hermes → Cursor plan (PASS)
- Command:
  ```bash
  hermes -z "<outer-prompt-that-runs-cursor-agent-stream-json-and-jq-extract-and-echoes-plan-between-fences>" --accept-hooks
  ```
- Outer prompt instructs Hermes to (a) save the inner prompt to `/tmp/hermes_inner_prompt.txt`, (b) run `cursor-agent --print --mode plan --output-format stream-json --trust --workspace /Volumes/WDC2T/Project "$(cat /tmp/hermes_inner_prompt.txt)"`, (c) `jq` extract `createPlanToolCall.args.plan`, (d) reply with the plan body wrapped between `<<<HERMES_CURSOR_FINAL_BEGIN>>>` and `<<<HERMES_CURSOR_FINAL_END>>>` ending in sentinel `CURSOR_PLAN_HERMES_BRIDGE_SENTINEL_001`.
- Result: exit 0, 103 s, stdout 3964 bytes, both fences present, sentinel hit, full markdown plan in fence.
- Logs: `agent-cli-matrix-tests/logs/cursor-plan/G2_hermes_plan_*.{stdout.txt,meta.txt,stderr.log}`.

### Experiment G1 — OpenClaw dev → Cursor plan via cursor_agent tool (FAILED)
- Command:
  ```bash
  openclaw agent --agent dev --message "<prompt-asking-dev-agent-to-call-cursor_agent-mode=plan-and-echo-plan>"
  ```
- Result: exit 0, 104 s, both fences present, but the fence contained a candid disclosure from dev agent: "the plan tool's raw output did not include the rendered markdown body in the returned text. ... the plan content itself is not present in the available output." Sentinel was 0.
- Confirms the OpenClaw plugin extraction gap diagnosed above.
- Logs: `agent-cli-matrix-tests/logs/cursor-plan/G1_openclaw_dev_plan_*.{stdout.txt,meta.txt,stderr.log}`.

### Experiment G3 — OpenClaw dev → Cursor plan via shell-bridge (PASS)
- Command:
  ```bash
  openclaw agent --agent dev --message "<prompt-asking-dev-agent-to-shell-out-to-cursor_plan_run.sh-then-read-plan.md-and-echo-it>"
  ```
- Outer prompt explicitly tells dev agent to use its shell tool (not `cursor_agent`) to invoke `agent-cli-matrix-tests/scripts/cursor_plan_run.sh` with `--ask-fallback`, then read the resulting `*.plan.md` and frame the body between `<<<OPENCLAW_DEV_FINAL_BEGIN>>>` / `<<<OPENCLAW_DEV_FINAL_END>>>` ending in sentinel `CURSOR_PLAN_OPENCLAW_SHELL_BRIDGE_SENTINEL_001`.
- Result: exit 0, 362 s end-to-end (dev agent reasoning + shell + cursor-agent ~46 s + read + final reply), wrapper-internal `plan_extracted=1`, both fences present, sentinel hit, full markdown plan in fence (`*.plan.md` was 4522 bytes, todos JSON 635 bytes, stream 51376 bytes).
- Logs: `agent-cli-matrix-tests/logs/cursor-plan/G3_openclaw_dev_shell_*.{stdout.txt,meta.txt,stderr.log}` plus wrapper artifacts under `/tmp/openclaw_g3_plan/`.

### Recommended Caller Patterns
- **Universal contract**: have the caller (OpenClaw dev agent, Hermes, n8n shell node, runner adapter) shell out to `agent-cli-matrix-tests/scripts/cursor_plan_run.sh`. The wrapper owns the stream-json capture and `createPlanToolCall` extraction; callers only have to read `*.plan.md` and `*.todos.json`.
- **OpenClaw dev**: explicitly tell the dev agent to use its shell tool, NOT `cursor_agent`. Otherwise the OpenClaw plugin will drop the plan body.
- **Hermes**: either call the wrapper, or instruct Hermes to run cursor-agent + jq inline. Both work because Hermes has no Cursor-specific plugin to lose information through.
- **Direct (no caller agent)**: just call the wrapper from any shell.

### Plugin-side Improvement (Optional, Not Applied)
A clean fix in the OpenClaw cursor-agent plugin would be:
1. Extend `extractToolArgs` / `extractToolResult` to recognize `createPlanToolCall.args.plan` and emit a dedicated `plan_md` event into `events[]`.
2. Have `formatRunResult` / `buildConclusion` prefer `plan_md` when present, falling back to last assistant text.
3. Drop or relax the hardcoded "CRITICAL INSTRUCTION ... do not summarize" trailer.

These are user-level edits to a third-party plugin; they require explicit user approval and would be overwritten on the next plugin update. The shell-bridge contract is preferred because we own it and it is unaffected by plugin upgrades.

### Files Saved For Future Use
- `docs/cursor-cli-plan-mode-recipe.md` — portable reference any future agent can read without scrolling through the full HANDOFF. Contains TL;DR, root cause, recommended primitives, prompt template, caller integration patterns, and known caveats.
- `agent-cli-matrix-tests/scripts/cursor_plan_run.sh` — one-shot wrapper (added in Section 14, now also documented as the shell-bridge contract used by OpenClaw and Hermes).
- `agent-cli-matrix-tests/scripts/cursor_plan_extract.sh` — pure extractor (added in Section 14).
- `agent-cli-matrix-tests/scripts/README.md` — quick reference for both scripts, exit code table, caller cheatsheet, log layout.

### Decisions
- The local agent CLI matrix is now considered fully green for ask / agent / plan across both OpenClaw and Hermes calling either Cursor or Codex.
- The `cursor_plan_run.sh` wrapper is the canonical headless plan primitive for this project. Callers that need a plan should not re-implement the stream-json + `createPlanToolCall` extraction logic.
- No project business code was modified to achieve this. Only documentation files (`docs/HANDOFF.md`, `docs/cursor-cli-plan-mode-recipe.md`) and the matrix-test harness (`agent-cli-matrix-tests/scripts/*`) were added or extended.

### Quick Resume
Local agent CLI matrix is 8/8 green. For headless Cursor plan, call `agent-cli-matrix-tests/scripts/cursor_plan_run.sh` directly, or have OpenClaw dev / Hermes shell out to it. Do not ask OpenClaw `cursor_agent` tool for plan content — its plugin drops the plan body. See `docs/cursor-cli-plan-mode-recipe.md` for the portable reference and prompt template.

## 16. Codex CLI PNG Image Generation Worker (2026-05-04)

### Status
OPENCLAW + HERMES CODEX IMAGEGEN SHELL-BRIDGE ACTIVE

### Objective
Persist a stable local capability so OpenClaw and Hermes can both generate PNG images through Codex CLI without relying on unstable internal paths as the primary contract.

### Contract (Source of Truth)
- Caller passes JSON request to local wrapper:
  - `workdir`
  - `output_png_path`
  - optional `model`
  - `prompt`
  - optional `timeout_seconds`
- Wrapper executes:
  ```bash
  codex exec --skip-git-repo-check -s workspace-write -C <workdir> -o <workdir>/codex-imagegen-result.md [-m <model>] -
  ```
- Wrapper enforces prompt guardrails:
  - use image generation directly
  - do not fall back to SVG/HTML/Mermaid/Excalidraw/code diagrams unless explicitly allowed
  - save/copy final PNG to exact `output_png_path`
  - never delete originals under `~/.codex/generated_images`
  - on unavailable imagegen, emit `Codex CLI 当前没有可用 image generation tool`
- Wrapper output JSON:
  - success: `ok`, `output_png_path`, `bytes`, `codex_result_path`, `generated_images_path`, `message`
  - failure: `ok=false`, `error_type` (`imagegen_unavailable|timeout|codex_failed|output_missing|permission_denied|invalid_request`), message, tails

### Artifacts Added
- Wrapper:
  - `~/.agents/bin/codex-imagegen`
- Skill:
  - `~/.agents/skills/codex-cli-imagegen/SKILL.md`
- Skill index entry:
  - `~/.agents/SKILLS_INDEX.md` (`codex-cli-imagegen`)

### OpenClaw Integration
- Added new OpenClaw agent in `agents.list`:
  - `id: image-codex`
  - `workspace: /Users/chenxin/.openclaw/workspace-image-codex`
  - `agentDir: /Users/chenxin/.openclaw/agents/image-codex/agent`
  - `tools.alsoAllow: ["codex_agent"]`
- Current recommended usage is still shell-bridge via wrapper (not direct `codex_agent` plugin output parsing).

### Hermes Integration
- `codex-cli-imagegen` is visible in `hermes skills list` as local skill.
- Hermes uses terminal tool to invoke wrapper and returns wrapper JSON.

### Validation Evidence
- Wrapper direct smoke:
  - request: `/tmp/codex-imagegen/job-002/request.json`
  - result: `ok=true`, output `/tmp/codex-imagegen/job-002/output/test-imagegen.png`
  - `file`: PNG image data (1774x887), size 762602 bytes
- E2E caller checks:
  - OpenClaw dev -> wrapper: PASS (`I1_*`)
  - Hermes -> wrapper: PASS (`I2_*`)
  - OpenClaw `image-codex` agent -> wrapper: PASS (`I3_*`)
  - Hermes (repeat) -> wrapper: PASS (`I4_*`)
- Logs stored under:
  - `agent-cli-matrix-tests/logs/cursor-plan/I1_*`
  - `agent-cli-matrix-tests/logs/cursor-plan/I2_*`
  - `agent-cli-matrix-tests/logs/cursor-plan/I3_*`
  - `agent-cli-matrix-tests/logs/cursor-plan/I4_*`

### Important Fix Applied
- Initial wrapper version falsely reported `imagegen_unavailable` when stderr echoed the instruction sentence.
- Fix: only evaluate unavailable sentinel against final output channels (`stdout` + codex result file), not stderr prompt-echo.

### Current Deletion Policy
- Old image paths/tools are **not deleted yet** in this checkpoint to avoid accidental regression.
- Removal should be explicit and targeted after user confirms which legacy items to retire (e.g., specific old prompts/agents/skills).

### Quick Resume
For reliable PNG generation from either OpenClaw or Hermes, call `~/.agents/bin/codex-imagegen` with JSON input and consume `output_png_path` from stdout JSON. Treat `~/.codex/generated_images/...` as traceability only, not as primary output contract.

## 17. MiniMax Coding Plan MCP Integration (2026-05-04)

### Status
HERMES MCP ACTIVE; OPENCLAW MCP CONFIGURED WITH KEY-INJECTION PENDING

### Objective
Enable `minimax-coding-plan-mcp` tools (`web_search`, `understand_image`) in both OpenClaw and Hermes while keeping credentials out of committed files and preserving rollback paths.

### What Was Configured

#### OpenClaw
- Added MCP server entry in `~/.openclaw/openclaw.json`:
  - `name`: `minimax-coding-plan`
  - `command`: `uvx`
  - `args`: `["minimax-coding-plan-mcp", "-y"]`
  - `env`:
    - `MINIMAX_API_HOST=https://api.minimaxi.com`
    - `MINIMAX_API_KEY=${MINIMAX_CN_API_KEY}`
- Verification:
  - `openclaw mcp list` shows `minimax-coding-plan`.
  - `openclaw mcp show minimax-coding-plan` shows expected command/args/env.
- Current warning:
  - OpenClaw runtime reports missing env var `MINIMAX_CN_API_KEY` for this MCP entry, so tool execution is unavailable until that env var is provided to OpenClaw runtime.

#### Hermes
- Added MCP server under `mcp_servers` in `/Volumes/WDC2T/Applications/hermes-home/config.yaml`:
  - `minimax-coding-plan.command: uvx`
  - `minimax-coding-plan.args: [minimax-coding-plan-mcp, -y]`
  - `minimax-coding-plan.env.MINIMAX_API_HOST: https://api.minimaxi.com`
  - `minimax-coding-plan.env.MINIMAX_API_KEY: ${MINIMAX_CN_API_KEY}`
- Verification:
  - `hermes mcp list` shows `minimax-coding-plan` enabled.

### Smoke Tests

#### OpenClaw smoke (`J1_*`)
- Prompt attempted:
  - `web_search("MiniMax token plan pricing")`
  - `understand_image("/Volumes/WDC2T/Project/ai-pipeline-poc/docs/images/phase6e-4repo-multi-agent-architecture-opus.png")`
- Result:
  - MCP tools not available in current OpenClaw call path (`dev` policy exposed only `cursor_agent`/`codex_agent`).
  - stderr also reported missing env var `MINIMAX_CN_API_KEY` for MCP entry.

#### Hermes smoke (`J2_*`)
- Same two tool calls requested.
- Result:
  - `web_search`: success
  - `understand_image`: success
  - Returned correct summary of Token Plan and image structure.

### Required Key Injection (No Secret Printed Here)
- `MINIMAX_API_KEY` value should continue to come from your existing MiniMax credential.
- Current mapping expects `MINIMAX_CN_API_KEY` to exist in process env.
- Recommended local source of truth:
  - Hermes: `/Volumes/WDC2T/Applications/hermes-home/.env` (already in use for MiniMax CN)
  - OpenClaw: provide `MINIMAX_CN_API_KEY` to OpenClaw runtime environment (shell/profile/service environment), so `${MINIMAX_CN_API_KEY}` expansion succeeds for MCP server env.

### Toggle / Rollback Commands

#### OpenClaw
- Disable/remove MCP server:
  ```bash
  /Users/chenxin/.nvm/versions/node/v24.14.0/bin/node /Users/chenxin/.nvm/versions/node/v24.14.0/lib/node_modules/openclaw/openclaw.mjs mcp unset minimax-coding-plan
  ```
- Re-add MCP server:
  ```bash
  /Users/chenxin/.nvm/versions/node/v24.14.0/bin/node /Users/chenxin/.nvm/versions/node/v24.14.0/lib/node_modules/openclaw/openclaw.mjs mcp set minimax-coding-plan '{"command":"uvx","args":["minimax-coding-plan-mcp","-y"],"env":{"MINIMAX_API_HOST":"https://api.minimaxi.com","MINIMAX_API_KEY":"${MINIMAX_CN_API_KEY}"}}'
  ```

#### Hermes
- Remove MCP server:
  ```bash
  hermes mcp remove minimax-coding-plan
  ```
- Re-enable by restoring `mcp_servers.minimax-coding-plan` block in `/Volumes/WDC2T/Applications/hermes-home/config.yaml`.

### Notes
- This integration is additive and does not affect the codex imagegen shell-bridge (`~/.agents/bin/codex-imagegen`).
- For OpenClaw, effective tool availability depends on both:
  1) agent tool policy (which tools are exposed), and
  2) runtime env key injection for MCP server process.

## 18. OpenClaw MiniMax Access — Official + Minimal Bridge (2026-05-04)

### Status
OFFICIAL `web_search=minimax` PROVIDER + LOCAL BRIDGE FOR `understand_image`

### Final Path (Reflects Official OpenClaw Docs)
- `web_search`: configured per official `tools/minimax-search` docs.
  - `tools.web.search.provider = "minimax"`
  - `plugins.entries.minimax.config.webSearch.region = "cn"`
  - `MINIMAX_API_KEY` injected via launchd plist `EnvironmentVariables`.
- `understand_image`: no native OpenClaw agent-callable equivalent (OpenClaw "media understanding" is a passive pre-digest pipeline for inbound media, not an agent tool). Kept the local bridge plugin to expose `minimax_understand_image` only.

### OpenClaw Final Config
- `~/.openclaw/openclaw.json`:
  - `tools.web.search.provider = "minimax"` (per `docs.openclaw.ai/tools/minimax-search`)
  - `plugins.entries.minimax.enabled = true`, `config.webSearch.region = "cn"`
  - `plugins.entries.minimax-coding-plan-bridge.enabled = true` (only registers `minimax_understand_image`)
  - `plugins.load.paths` includes the bridge plugin path
  - `tools.allow` includes `minimax_understand_image`; restricted agents (`dev`, `image-orchestrator`, `image-codex`) have it in `tools.alsoAllow`
  - `mcp.servers.minimax-coding-plan` retained as registry entry (not relied on for agent tool exposure)
- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`:
  - `EnvironmentVariables` now includes `MINIMAX_API_KEY`, `MINIMAX_CN_API_KEY`, `MINIMAX_API_HOST` (backup at `*.plist.bak.<UTC>`)
- Bridge plugin source: `~/.openclaw/extensions/minimax-coding-plan-bridge/{index.js,openclaw.plugin.json,package.json}` — registers exactly one tool `minimax_understand_image` against `POST /v1/coding_plan/vlm`.

### Verified Tool Pool (per agent)
`main / dev / research / voice / image-orchestrator / image-codex` all show:
`web_search`, `minimax_understand_image`, `codex_agent`, `cursor_agent`

### Functional Smoke
- `dev`: `web_search` (official minimax provider) = ok; `minimax_understand_image` (bridge) = ok
- Tool count before: 3. Tool count after: 4 (no clutter).

## 19. Hermes MiniMax MCP — Verified Clean Against Official Docs (2026-05-04)

### Status
HERMES MCP CONFIG IS PURE-OFFICIAL FORM; NO LOCAL DETOURS

### Reference
- `docs.hermes-agent.nousresearch.com/docs/reference/mcp-config-reference/`
- Tool naming convention: `mcp_<server>_<tool>` with `-`/`.` → `_`.

### Hermes Config (`/Volumes/WDC2T/Applications/hermes-home/config.yaml`)
- `mcp_servers.minimax-coding-plan`:
  - `command: uvx`
  - `args: [minimax-coding-plan-mcp, -y]`
  - `env.MINIMAX_API_HOST: https://api.minimaxi.com`
  - `env.MINIMAX_API_KEY: ${MINIMAX_CN_API_KEY}`
- This is exactly the official stdio MCP server shape; no Hermes-side bridge or shim is needed.

### Verification
- `hermes mcp test minimax-coding-plan`:
  - `✓ Connected (~4s)`
  - `✓ Tools discovered: 2` → `web_search`, `understand_image`
- Agent-side tool names will register as:
  - `mcp_minimax_coding_plan_web_search`
  - `mcp_minimax_coding_plan_understand_image`

### Tavily Cleanup — OpenClaw (2026-05-04)
- Removed duplicate `skills.entries.tavily-search` (only `plugins.entries.openclaw-tavily` remains).
- Removed plaintext `apiKey` from `plugins.entries.openclaw-tavily.config`.
- Injected `TAVILY_API_KEY` into launchd `EnvironmentVariables` (plist backup at `~/Library/LaunchAgents/ai.openclaw.gateway.plist.bak.<UTC>`).
- Plugin now resolves the key via env per `openclaw-tavily` source (`process.env.TAVILY_API_KEY`).
- Exposed `tavily_search / tavily_extract / tavily_crawl / tavily_map / tavily_research` in `tools.allow` and in restricted agents' `tools.alsoAllow` so agents can actually call them.
- Tavily is intentionally retained as a complement/backup to MiniMax web search (broader coverage, separate quota).
- Verified end-to-end: `dev` agent calls `tavily_search(query=...)` and returns ok.

### Tavily Setup — Hermes (2026-05-04)
- Per Hermes official `web` backend docs:
  - `/Volumes/WDC2T/Applications/hermes-home/config.yaml`: `web.backend: tavily`.
  - `/Volumes/WDC2T/Applications/hermes-home/.env`: `TAVILY_API_KEY=...` (mirrored from OpenClaw plist; no plaintext in committed config).
- Restarted Hermes gateway via `hermes gateway restart`.
- Verified end-to-end: `hermes -z "Use web_search ..." --yolo` returns `web_search: ok`.

### Cross-platform Tavily Cleanliness Summary
| Platform | Tavily integration | Key storage | Verified |
| --- | --- | --- | --- |
| OpenClaw | Native plugin `openclaw-tavily` (5 tools) | launchd `EnvironmentVariables.TAVILY_API_KEY` | dev agent → `tavily_search` ok |
| Hermes | Official `web.backend: tavily` | `hermes-home/.env` `TAVILY_API_KEY` | one-shot run → `web_search` ok |

### Cross-platform Cleanliness Summary
| Platform | web_search | understand_image | Official-only? |
| --- | --- | --- | --- |
| Hermes | MCP (`mcp_servers`, official stdio) | MCP (same) | Yes |
| OpenClaw | Official `tools.web.search.provider=minimax` + `plugins.entries.minimax` | Local minimal bridge (`minimax_understand_image`); OpenClaw has no native agent-callable VLM tool | Mostly; bridge is documented as a deliberate exception |

## 21. POC Re-baseline Execution Attempt (2026-05-05)

### Status
PARTIALLY CLOSED (10-TASK RUN + 3x RESTART CYCLES VERIFIED; COST ROLLUP STILL PENDING)

### What Was Executed
- Re-ran POC-style 10-task batch against the current Phase 6E runtime.
- Initial attempt with legacy fixed IDs (`01PH500...`) failed immediately because Planning Agent refused to overwrite existing plan artifacts.
- Re-seeded a fresh unique-ID batch (`01P6R05041616...`) to avoid historical artifact collisions.
- Started Local Runner (`node runner/runner.js`) and waited for all seeded tasks to leave `inbox/` + `running/`.
- Executed three consecutive `docker compose restart` cycles and verified post-restart recovery health.

### 10-Task Terminal Result (unique-ID batch)
- Resolved count: 10 / 10 (no stuck `task_r*.md` in `inbox/` or `running/`).
- `done`: 2 (`task_r101.md`, `task_r103.md`).
- `error`: 8 (`task_r102.md`, `task_r104.md`, `task_r201.md`, `task_r202.md`, `task_r203.md`, `task_r301.md`, `task_r302.md`, `task_r999_malformed.md`).

### Notable Failure Modes Observed
- Historical-dirty target repo side effects produced review critical on strict-constraint tasks.
- OpenClaw adapter failures (`implementation_job_failed`) on multiple coding tasks.
- Long-running adapter path timeouts (`implementation_job_timeout`) on hard tasks.
- Malformed frontmatter sentinel routed correctly to `error`.

### Restart-Cycle Evidence
- Ran 3 consecutive restarts with health checks after each cycle.
- Services recovered to healthy state after warm-up (LiteLLM required additional startup time after migrations).
- No task loss in the unique-ID 10-task batch (`missing=[]`, `extra=[]` against expected set).

### Still Pending For Strict Original PLAN Closure
- Langfuse/cost completeness extraction for this re-baseline run.
- Total cost rollup for the same run.

### Practical Next Step
- Add a non-secret, scriptable metrics path for cost/traces (or a documented operator runbook query path), then rerun one fresh unique-ID batch for strict cost-complete closure.

## 20. n8n First-Login Note For Teaching (2026-05-05)

### Status
N8N UI ACCESS VERIFIED; ACCOUNT IS USER-INITIALIZED

### What To Teach
- Visiting `http://localhost:5678` can show the Sign-in page.
- n8n credentials are initialized by the local operator on first setup.
- For training/demo sessions, each operator should create and manage their own credentials.
- Do not publish or commit plaintext account/password in repo docs, scripts, or screenshots.

### Suggested Classroom Script
- "If you see the n8n sign-in page, use your own account created during first-time setup."
- "Do not reuse someone else's credentials."
- "If credentials are unknown, reset locally and reinitialize before class."

## 22. Local Credential Retrieval (macOS Keychain)

### Status
LANGFUSE + N8N CREDENTIAL LOOKUP COMMANDS DOCUMENTED (NO PLAINTEXT STORED IN REPO)

### Keychain Service Names
- Langfuse: `ai-pipeline-poc/langfuse`
- n8n: `ai-pipeline-poc/n8n`

### Verify Entry Exists (Metadata Only)
```bash
security find-generic-password -s "ai-pipeline-poc/langfuse"
security find-generic-password -s "ai-pipeline-poc/n8n"
```

### Retrieve Password Value (When Needed)
```bash
security find-generic-password -s "ai-pipeline-poc/langfuse" -w
security find-generic-password -s "ai-pipeline-poc/n8n" -w
```

### Security Note
- Keep credentials in Keychain only.
- Do not write plaintext passwords into repo docs, scripts, commits, screenshots, or chat logs.

## 23. Langfuse Trace Visibility Repair (2026-05-05)

### Status
TRACES VERIFIED VISIBLE AFTER PROJECT-ACCESS ALIGNMENT

### Root Cause
- Two Langfuse projects with the same name (`ai-pipeline-poc`) existed:
  - old project id: `cmoe791lv0006qu072089viig` (used by existing LiteLLM callback keys)
  - new project id: `cmoricgwo0006qu07t3zsffhd` (created during fresh login/setup)
- Current user initially had access only to the new organization/project.
- Result: LiteLLM callbacks were writing to old-project key context, while UI session viewed the new project, which showed `No data`.

### Fix Applied
- Added current user to old organization as `OWNER` in `organization_memberships`.
- Kept existing LiteLLM callback key wiring unchanged (no secret rotation required).
- Re-opened old project trace URL and validated UI access.
- Sent one direct LiteLLM probe call with metadata trace id and verified trace list refresh in old project.

### Verification Evidence
- Trace list now shows rows in old project `Tracing` page, including recent verification call around `2026-05-05 03:09:27`.
- Filters show trace name `litellm-acompletion` with non-zero count.
- UI path confirmed: `/project/cmoe791lv0006qu072089viig/traces`.

### Operator Guidance
- When Langfuse shows `No data`, first verify:
  1. active UI project id,
  2. LiteLLM callback key's bound project id,
  3. user membership on that organization/project.
- Prefer one canonical project for this POC going forward; if rotating keys to a new project, update `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` and restart `litellm`.

### Canonicalization Action Applied
- Kept canonical organization/project/key:
  - org: `cmoe78q3o0001qu07hqmohrmj` (`chen09`)
  - project: `cmoe791lv0006qu072089viig` (`ai-pipeline-poc`)
- Removed non-canonical duplicate organization created during re-login:
  - deleted org `cmoric4fp0001qu0747o9uut7` (cascade removed project `cmoricgwo0006qu07t3zsffhd`)
- Post-cleanup verification:
  - exactly one organization remains,
  - exactly one project remains,
  - exactly one Langfuse API key mapping remains (bound to canonical project).
- Probe validation after cleanup:
  - emitted LiteLLM trace id `canonical-verify-1777918722`,
  - trace row visible in canonical project `Tracing` page.

## 24. Cost/Latency Rollup for Re-baseline Run (2026-05-05)

### Status
LANGFUSE COST/LATENCY CLOSURE COMPLETED FOR UNIQUE-ID BATCH `01P6R05041616...`

### Data Source
- Source of truth: ClickHouse (`default.traces` + `default.observations`) for project `cmoe791lv0006qu072089viig`.
- Selection rule: traces whose input/output contains task-id prefix `01P6R05041616`.
- Matched traces: 8 (LLM-bearing tasks from this batch).

### Aggregate Metrics (Matched 8 Traces / 19 Observations)
- Total cost: **$0.017047**
- Total tokens: **50,570** (prompt 27,080 / completion 22,466)
- Average observation latency: **18.244 s**
- P50 latency: **16.175 s**
- P95 latency: **34.348 s**

### Per-Task Trace Metrics
- `01P6R05041616000000000102`: cost `$0.002135`, avg latency `9.318 s`, tokens `6,905`
- `01P6R05041616000000000101`: cost `$0.003259`, avg latency `16.080 s`, tokens `10,187`
- `01P6R05041616000000000103`: cost `$0.003281`, avg latency `14.144 s`, tokens `10,534`
- `01P6R05041616000000000104`: cost `$0.001017`, avg latency `13.800 s`, tokens `2,865`
- `01P6R05041616000000000201`: cost `$0.001873`, avg latency `25.015 s`, tokens `5,047`
- `01P6R05041616000000000202`: cost `$0.001976`, avg latency `27.213 s`, tokens `5,427`
- `01P6R05041616000000000301`: cost `$0.001480`, avg latency `19.884 s`, tokens `4,069`
- `01P6R05041616000000000302`: cost `$0.002025`, avg latency `28.096 s`, tokens `5,536`

### Model Split
- `deepseek/deepseek-chat`: 16 observations, `$0.011475`, `31,778` tokens
- `deepseek/deepseek-reasoner`: 3 observations, `$0.005572`, `18,792` tokens

### Closure Note
- Earlier pending item in Section 21 ("Langfuse/cost completeness + total rollup") is now resolved for the unique-ID re-baseline batch.
- This rollup is reproducible from ClickHouse queries; UI `Tracing` also shows corresponding rows in the same project.

## 25. POC Closing Package And Historical Artifacts (2026-05-05)

### Status
POC STORY / FINAL DIAGRAM / INTRO DECK GENERATED

### Preserved Historical Images
- Initial ChatGPT architecture sketch:
  - `docs/images/poc-history-01-initial-chatgpt-architecture.png`
- Test-plan design and research/best-practice alignment milestone:
  - `docs/images/poc-history-02-test-plan-research-alignment.png`
- GPT-5.5 generated architecture reference image:
  - `docs/images/poc-history-03-gpt55-reference-architecture.png`

### Final Accurate Architecture Diagram
- `docs/images/poc-final-architecture-2026-05-05.png`
- Purpose: corrected current-state architecture map, emphasizing:
  - n8n as orchestrator, not agent brain,
  - Local Runner as execution control plane and state root,
  - OpenClaw/Hermes as backend bridges,
  - Cursor/Codex as CLI execution backends,
  - LiteLLM/Langfuse as model ingress and observability,
  - filesystem artifacts, docs, skills, MCP, and optional Obsidian-style memory.

### Journey Summary
- `docs/poc-from-zero-to-phase6e-summary.md`
- Captures project motivation, evolution from early sketches, final role split, validation evidence, cost/tooling notes, and conclusion.

### Presentation Deck
- PPTX:
  - `docs/presentations/poc-from-zero/from-zero-to-multi-agent-poc.pptx`
- Slide PNG sources:
  - `docs/presentations/poc-from-zero/slide-01-title.png` through `slide-10-closing.png`
- QA:
  - Visual review found issues in initial draft (text clipping, title truncation, metric overlap).
  - Fixed affected slides and re-ran focused visual QA; no remaining blockers.

### Suggested Talk Title
`从零开始实现一个本地多 Agent 工程流水线 POC：用 Cursor、Codex、n8n、OpenClaw、Hermes 和 Langfuse 把想法跑成证据`

## 26. Final Main Diagram Decision (2026-05-05)

### Status
FINAL MAIN DIAGRAM CONFIRMED BY USER

### Decision
- Keep current final architecture image as the canonical main diagram for this POC wrap-up.
- No further redraw or structural changes are required at this stage unless new architecture changes are introduced later.

### Canonical Files
- SVG source: `docs/images/poc-final-architecture-2026-05-05-full.svg`
- PNG export: `docs/images/poc-final-architecture-2026-05-05-full.png`

## 27. GitHub Publish Handoff (2026-05-05)

### Status
PUBLISHED TO GITHUB

### Remote
- Repository: `git@github.com:chen09/ai-pipeline-poc.git`
- Branch: `main`
- Published commit: `0230fd9 chore: publish phase 6e poc artifacts`
- Local branch state after publish: `main` tracks `origin/main`.

### Published Scope
- Phase 6E POC source, docs, runner, n8n workflow exports, scripts, final diagrams, journey summary, and presentation deck are published.
- Target fixture repos are published as normal source directories under:
  - `target-repos/api`
  - `target-repos/bff`
  - `target-repos/web`
  - `target-repos/batch`

### Local-Only / Ignored State
- Runtime and forensic state remains intentionally excluded from Git:
  - `data/`
  - `agent/jobs/`
  - `agent/archive/`
  - `agent/comms/`
  - `agent/debug/`
  - `target-repos/*/node_modules/`
  - `target-repos/*/agent/`
- `target-repos/api` was previously a nested Git repository. Its inner `.git` directory was not deleted; it was renamed locally to:
  - `target-repos/api/.git.local-backup-20260505-upload`
- That backup is ignored by the parent repo. Do not delete it unless the user explicitly approves cleanup.

### Publish Verification
- `git diff --cached --check`: passed before publish.
- Secret scan found only documented environment variable names, not concrete secret values, in published files.
- Test verification before publish:
  - `runner`: 2/2 passed
  - `target-repos/api`: 32 files / 47 tests passed
  - `target-repos/bff`: 2/2 passed
  - `target-repos/web`: 2/2 passed
  - `target-repos/batch`: 1/1 passed

### Notes For Next Agent
- The GitHub upload is complete; do not reinitialize or recreate the remote.
- If future edits touch target fixtures, remember `target-repos/api` is now source managed by the parent repo, not by its former nested Git metadata.
- Keep future continuity notes appended to this file; do not create a root-level handoff file.

## 28. Research Digest Side Branch Protocol (2026-05-10)

### Status
MANUAL PROTOCOL ADDED

### Summary
- Added `agent/research/` as a separate manual research digest side branch.
- Intended flow: OpenClaw daily discovery -> Hermes weekly synthesis -> human-reviewed action list / Codex or Cursor execution prompt -> Hermes conclusion write-back.
- Role split: OpenClaw is the external-world radar, Hermes is the personal knowledge base and project manager, and Codex/Cursor are engineering executors.
- Added copyable prompt templates under `agent/research/templates/` for OpenClaw daily discovery, Hermes weekly synthesis, Codex/Cursor validation, and weekly status JSON.
- This is intentionally separate from the coding implementation pipeline.
- No changes were made to `agent/jobs/`, n8n workflows, Local Runner logic, provider config, credentials, gateway config, or `target-repos/*`.
- Version 1 is file-protocol only. Prefer high-quality daily reports plus one weekly Hermes review; after three useful manual weekly reviews, consider whether n8n or Local Runner automation is justified.

### First Flow Test
- Created real test artifact `agent/research/inbox/2026-05-10-digital-human-openclaw.md` from OpenClaw's returned Markdown discovery report.
- Hermes successfully wrote `agent/research/processing/2026-W20-digital-human.status.json`.
- Hermes successfully wrote `agent/research/done/2026-W20-digital-human-hermes-weekly-digest.md`.
- Observed integration gap: OpenClaw `research` agent did not write the file directly during this run. The successful path was OpenClaw returns Markdown -> Codex persists inbox artifact -> Hermes reads and synthesizes.
- This confirms the manual research digest loop is viable, while showing that any future automation needs an explicit persistence bridge for OpenClaw output.

### OpenClaw Persistence Bridge Test
- Added a restricted plugin source under `openclaw-plugins/research-inbox-writer/`.
- The plugin exposes one tool, `research_inbox_write`, which only writes Markdown files matching `YYYY-MM-DD-topic-openclaw.md` under `agent/research/inbox/`.
- The tool refuses path separators, refuses non-matching filenames, refuses reports that do not include `# OpenClaw Daily Discovery Report`, and uses no shell execution.
- Local OpenClaw config was updated to enable the plugin and allow `research_inbox_write` for the `research` agent. Because the global `tools.allow` is an explicit whitelist, `research_inbox_write` also had to be added there; agent-level `alsoAllow` alone was not enough.
- Smoke test passed with `openclaw agent --local --agent research --session-id research-inbox-writer-smoke-20260510-v5 --timeout 180`: OpenClaw created `agent/research/inbox/2026-05-10-plugin-smoke-openclaw.md` through the plugin.
- Gateway was restarted with `openclaw gateway restart` after user approval. Post-restart status showed connectivity `ok` and capability `admin-capable`.
- Gateway-path smoke test passed with `openclaw agent --agent research --session-id research-inbox-writer-gateway-smoke-20260510-v1 --timeout 180`: OpenClaw created `agent/research/inbox/2026-05-10-gateway-smoke-openclaw.md` through the plugin.
- This bridge does not alter n8n, Local Runner, `agent/jobs/`, provider credentials, or target repo fixtures.

### Manual Dispatch + WeCom Notification Trial
- Manually dispatched OpenClaw through the gateway for topic `digital-human-manual`.
- OpenClaw wrote `agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md`.
- Manually dispatched Hermes with the OpenClaw report as input.
- Hermes wrote `agent/research/processing/2026-W20-digital-human-manual.status.json`.
- Hermes wrote `agent/research/done/2026-W20-digital-human-manual-hermes-weekly-digest.md`.
- WeCom plugin was loaded and channel status reported `enabled, configured, running`.
- `openclaw message send --channel wecom --account default --target self --dry-run` passed, but real send to `self` failed with WeCom `errcode=93006 invalid chatid`.
- User then sent `test for new job` to OpenClaw/Hermes from WeCom. Logs identified the valid direct target as `ChenXin`.
- Notification retry succeeded with `openclaw message send --channel wecom --account default --target ChenXin ...`; returned `chatId: ChenXin`.
- Conclusion: manual OpenClaw -> Hermes dispatch works, and WeCom notification works when using the valid inbound direct target `ChenXin`; `self` is not a valid delivery target for this plugin.
- Follow-up: user reported Hermes received the WeCom prompt as "Test a new periodic job." Hermes created and manually triggered cron job `test-new-job-2` (`job_id: 8dda99b6a438`) with schedule `every 1h` and delivery `origin`.
- `hermes cron list` confirmed `test-new-job-2` is active and last run was `ok`, but also warned the Hermes gateway service is not running, so automatic future runs may not fire until the Hermes gateway service issue is fixed.

### Manual Deep Research Run: Local Multi-Agent Productization
- User selected topic: local multi-agent workflow productization.
- OpenClaw was dispatched through the `research` agent with public web research scope and wrote `agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md` via `research_inbox_write`.
- Hermes synthesized the OpenClaw report and wrote:
  - `agent/research/processing/2026-W20-local-multi-agent-productization.status.json`
  - `agent/research/done/2026-W20-local-multi-agent-productization-hermes-weekly-digest.md`
- Hermes conclusion: keep the existing supervisor-plus-specialist architecture, add tool-level HITL, eval gates, and a bounded fanout benchmark before adding a new control plane.
- OpenClaw WeCom notification to `ChenXin` succeeded with message id `aibot_send_msg_1778407259062_96d5274d`.
- Hermes notification was attempted through a one-shot `origin` cron job `notify-local-multi-agent-digest-20260510` (`job_id: 801d83bacf48`) and manually triggered with `hermes cron tick`; agent logs confirmed the job entered the scheduler. Hermes gateway service still reports not running, so future automatic scheduled delivery remains unreliable until that service issue is fixed.
- Added `agent/research/templates/wecom-digest-notification-cn.md` to standardize Chinese WeCom notifications. It keeps full execution prompts in Markdown files and sends readable conclusions, priorities, next actions, and archive paths in chat.
- Hermes gateway launchd diagnosis: service failed when launchd wrote stdout/stderr to `/Volumes/WDC2T/Applications/hermes-home/logs/*` (`operation not permitted`). Backed up the launchd plist and wrapper, then changed launchd stdout/stderr to `~/Library/Logs/hermes-gateway-service.*.log`. After reload, the Hermes gateway service was loaded with a live PID, but Hermes CLI still warns the service definition is stale and `hermes cron status` still reports gateway not running. Treat this as improved but not fully resolved.

### Research Mode Runbook + Roundup
- Added `agent/research/RUNBOOK.md` to define manual Research Mode and explicitly separate it from Validation Mode.
- Updated `agent/research/templates/wecom-digest-notification-cn.md` so WeCom notifications default to Chinese readable summaries and do not imply engineering validation unless the user explicitly chooses Validation Mode.
- Hermes created `agent/research/done/2026-W20-research-mode-roundup.md` from existing digital-human and local multi-agent productization research artifacts.
- Roundup conclusion: keep research mode for now; stabilize control-plane evidence and human-readable summaries before scaling automation or running development experiments.
- Sent the roundup Chinese summary to OpenClaw WeCom target `ChenXin`; message id `aibot_send_msg_1778410677319_c73bea13`.

### Research Run: GitHub AI Trends
- User selected next Research Mode topic: popular AI-related GitHub content, with priority for paper-backed repos, multi-agent collaboration, skills/MCP/tool ecosystems, AI usage methods, second brain/memory/PKM, and recent closed/open model rankings.
- OpenClaw wrote `agent/research/inbox/2026-05-10-github-ai-trends-openclaw.md`.
- Hermes wrote:
  - `agent/research/processing/2026-W20-github-ai-trends.status.json`
  - `agent/research/done/2026-W20-github-ai-trends-hermes-digest.md`
- Hermes conclusion: AI engineering ecosystem is entering a protocol/engineering convergence phase; MCP is becoming the practical tool-interoperability standard; model rankings should be interpreted by task layer, not as a single global winner.
- Sent Chinese WeCom summary to `ChenXin`; message id `aibot_send_msg_1778413045344_c17e0850`.
