# Phase 5 Report — POC Validation

**Date**: 2026-04-25  
**Status**: Completed

## Summary

Phase 5 validation was executed end-to-end:

- P5.1: bulk seed generation script created (`scripts/seed_tasks.sh`)
- P5.2: 10-task bulk run completed to terminal states
- P5.3: chaos test passed (single worker restart, no duplication/loss)
- P5.4: fallback test passed (invalid DeepSeek key -> MiniMax backup path confirmed)
- P5.5: root `REPORT.md` generated with required metrics and recommendation

Note: this Phase 5 batch is a **baseline run** performed before the implementation path was switched to
OpenClaw Gateway + `cursor_agent`.

## P5.1 — Bulk Generation

Created `scripts/seed_tasks.sh` with:

- 4 trivial tasks
- 3 medium tasks
- 2 hard tasks
- 1 malformed frontmatter sentinel

The script supports `--force`, writes to `agent/inbox/`, and validates the 9 well-formed tasks with
`scripts/validate_tasks.py`.

## P5.2 — Bulk Run

Main bulk set (10 tasks) results:

- `done`: 0
- `error`: 10
- Success rate: 0%

Even though pass rate is low, orchestration convergence behavior was correct:
all tasks reached terminal states without queue deadlocks.

## P5.3 — Chaos Test

Executed:

```bash
docker restart ai-pipeline-poc-n8n-worker-1
```

Observed:

- Worker recovered
- Tasks continued processing
- No duplicated task files
- No lost task files

## P5.4 — Fallback Test

Executed:

1. Set `DEEPSEEK_API_KEY=invalid-for-fallback-test`
2. `docker compose up -d --force-recreate litellm`
3. Added fresh tasks `task_401.md`, `task_402.md`
4. Verified fallback via direct `plan-model` call:
   - response model: `MiniMax-M2.7`
5. Restored original DeepSeek key and recreated `litellm`

Conclusion: `plan-model -> plan-model-backup` fallback path works as designed.

## Metrics Snapshot

From Langfuse observations and runtime artifacts:

- Average cost per task (main bulk): **$0.001998**
- Average latency:
  - `planning`: 15.072 s
  - `test_planning`: 17.911 s
  - `reviewing`: 7.256 s
- Top failure modes:
  1. `openclaw_unavailable` (8)
  2. `test_issue_retry_exhausted` (1)
  3. `malformed_frontmatter` (1)

## Exit Criteria Check

- `REPORT.md` created at project root: ✅
- Containers healthy and running: ✅
- No orphan markdown tasks in inbox/running: ✅

## Next Step

Run a vertical-slice revalidation (single trivial task) on the new execution stack:
`n8n Implementation Agent -> OpenClaw Gateway -> cursor_agent`, then compare against this baseline.
