# Phase 5 Final Report

Date: 2026-04-25
Scope: P5.1 ~ P5.5 validation for local multi-agent pipeline POC

## 1) Success Rate

- Main bulk set size: 10 tasks
  - 4 trivial
  - 3 medium
  - 2 hard
  - 1 malformed frontmatter
- Resolved: 10 / 10
- Passed to done: 0 / 10
- Failed to error: 10 / 10
- **Success rate: 0%** (target was >= 80%)

This metric is from the baseline batch run before OpenClaw Gateway + `cursor_agent`
was fully wired as the implementation backend.

### Interpretation

The orchestration loop is stable (no lost tasks, no duplicates), but implementation capability
was the bottleneck in this baseline run because OpenClaw execution was not reliably available
from worker runtime at that time. The pipeline demonstrated robust failure handling rather than
production pass-rate.

## 2) Average Cost per Task (USD)

Source: Langfuse public observations API (trace IDs for the 9 valid-schema tasks in the 10-task bulk set).
Computed metric: average aggregated `costDetails.total` per trace.

- **Average cost per task: $0.001998**

Note: The malformed frontmatter task has no valid `task_id` trace and is excluded from cost aggregation.

## 3) Average Latency per Step

Source: Langfuse observation `latency` grouped by `name` for Phase 5 traces.

- Planning (`planning`): **15.072 s**
- Test Generation (`test_planning`): **17.911 s**
- Review (`reviewing`): **7.256 s**

No stable average for `coding` / `test_running` from Langfuse observations in this run because most
tasks exited early due to implementation-path constraints.

## 4) Top 3 Failure Modes

1. `openclaw_unavailable` — 8 tasks
   Baseline failure mode before gateway auth/origin/device settings were aligned for n8n workers.
2. `test_issue_retry_exhausted` — 1 task
   Review loop repeatedly returned `test_issue` and exhausted revision budget.
3. `malformed_frontmatter` — 1 task
   Invalid task schema was correctly routed to error by Planning Agent.

## 5) Chaos Test Result (P5.3)

Action: restarted `ai-pipeline-poc-n8n-worker-1` during active processing.
Result:

- No duplicated task files observed.
- No task loss observed.
- Pipeline resumed and resolved all 10 tasks.

Conclusion: queue-based orchestration tolerated single-worker restart within acceptable delay.

## 6) Fallback Test Result (P5.4)

Action sequence:

1. Set `DEEPSEEK_API_KEY=invalid-for-fallback-test`.
2. Recreated `litellm`.
3. Injected 2 fresh tasks (`task_401`, `task_402`).
4. Verified fallback path.
5. Restored original DeepSeek key and recreated `litellm`.

Verification evidence:

- Direct `plan-model` probe returned `model=MiniMax-M2.7`.
- Langfuse observations included fallback models: `openai/MiniMax-M2.7`.

Conclusion: LiteLLM fallback from `plan-model` to `plan-model-backup` works.

## 7) Container & Queue Health (Exit Criteria)

- All core containers are up (Postgres, Redis, ClickHouse, MinIO, n8n-main, n8n-workers, Langfuse web/worker).
- No orphan markdown tasks in `agent/inbox/` or `agent/running/`.

## 8) Recommendation for Next Iteration

Prioritize a vertical-slice rerun on the new execution path:
`n8n -> OpenClaw Gateway -> cursor_agent`.

Reason:

- Current blocker was implementation-path capability and connectivity, not orchestrator reliability.
- The routing layer is now available; re-benchmarking a small task set will measure true impact quickly.
- After this rerun, optional Codex/Claude backends can be added behind the same routing contract for A/B tests.
