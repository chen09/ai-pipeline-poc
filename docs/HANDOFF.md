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
  - Three seed tasks (`task_001.md`, `task_002.md`, `task_003.md`) exist in `agent/inbox/`.
  - `scripts/validate_tasks.py` validates frontmatter and schemas successfully.
  - Git commit created for Phase 1.

## 2. Pipeline v0.1 Architecture Summary

Instead of a monolithic agent or linear script, tasks flow through an artifact-driven loop mapped to specialized roles:

1. **Planning Agent**: Reads request → outputs `plan.md`.
2. **Test Generation Agent**: Reads request+plan → outputs `test-plan.md` *(TDD Gate)*.
3. **Implementation Agent**: Reads plan+test-plan → writes code via OpenClaw → outputs `build.md`.
4. **Execution & Analysis Agent**: Runs `npm test` → outputs `test-run.md` (short-circuits on basic failures).
5. **Review & Optimization Agent**: LLM-as-a-judge reads all artifacts → outputs `review.md` with routing verdict.

*(See `docs/RESEARCH_REFERENCES.md` for the academic papers backing this design).*

## 3. Next Steps for the New Agent (交接任务)

The next agent should begin at **Phase 2 — n8n Plan Workflow** (refer to `PLAN.md`).

**Immediate To-Dos for the new session:**
1. Open n8n at `http://localhost:5678` (Credentials in `.env`).
2. Create an HTTP Header Auth credential in n8n for LiteLLM (`Authorization: Bearer {LITELLM_MASTER_KEY}`).
3. Build the first n8n workflow: **"Planning Agent"** (following the exact node specs in `PLAN.md` P2.2).
4. Implement the atomic claim shell command (`mv` + lock file).
5. Configure the HTTP node to hit LiteLLM (`http://litellm:4000/v1/chat/completions`) with the **Plan Reminder** prompt block.
6. Write the resulting artifact to `agent/plan/{task_id}.plan.md` and update the task's frontmatter to `current_step: test_planning`.
7. Export the workflow JSON to `n8n-workflows/planning-agent.json` and smoke test it.
