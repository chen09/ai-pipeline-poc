# Agent Handoff & Current State

**Date**: April 25, 2026
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
    - `task_001` and `task_002` are at `current_step: reviewing` in `agent/running/`.
    - `task_003` is in `agent/error/` with `retry_count: 3` (retry exhaustion).
  - Detailed notes are in `docs/phase-3-report.md`.

- **Phase 4 (Review & Optimization Agent)**: **COMPLETED**.
  - Workflow `Review & Optimization Agent` (`review-optimization-agent`) is implemented and active.
  - Workflow sources versioned at:
    - `n8n-workflows/review-optimization-agent.json`
    - `n8n-workflows/review-optimization-agent.n8n.js`
  - Langfuse callbacks enabled in `litellm/config.yaml` (keys still need manual setup at `http://localhost:3000`).
  - Detailed notes are in `docs/phase-4-report.md`.

## 2. Pipeline v0.1 Architecture Summary

Instead of a monolithic agent or linear script, tasks flow through an artifact-driven loop mapped to specialized roles:

1. **Planning Agent**: Reads request → outputs `plan.md`.
2. **Test Generation Agent**: Reads request+plan → outputs `test-plan.md` *(TDD Gate)*.
3. **Implementation Agent**: Reads plan+test-plan → writes code via OpenClaw → outputs `build.md`.
4. **Execution & Analysis Agent**: Runs `npm test` → outputs `test-run.md` (short-circuits on basic failures).
5. **Review & Optimization Agent**: LLM-as-a-judge reads all artifacts → outputs `review.md` with routing verdict.

*(See `docs/RESEARCH_REFERENCES.md` for the academic papers backing this design).*

## 3. Next Steps for the New Agent (交接任务)

The next agent should begin at **Phase 5 — POC Validation** (refer to `PLAN.md`).

**Immediate To-Dos for the new session:**
1. Create `scripts/seed_tasks.sh` to emit 10 tasks with mixed difficulty.
2. Load them into `agent/inbox/` and verify all workflows activate correctly.
3. Run bulk pipeline and collect stats (success rate, average latency per step, error distribution).
4. Complete Langfuse bootstrap: open `http://localhost:3000`, sign up, copy keys to `.env`, force-recreate litellm.
5. Optionally activate P4.5 Best-of-K + Verifier Rerank extension.

## 4. Seed & Runtime Policy

- `fixtures/seed_tasks/` stores canonical seed inputs and is tracked by Git.
- `agent/inbox/` is runtime queue state and is ignored by Git.
- Before demos/tests, load seeds with:

```bash
./scripts/load_seed_tasks.sh
```

- Use `--force` only when you intentionally want to replace current inbox tasks.
