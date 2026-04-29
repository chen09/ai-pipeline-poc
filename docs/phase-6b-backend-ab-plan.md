# Phase 6B Plan — Backend A/B Test Design

**Date**: 2026-04-26  
**Status**: Design completed; implementation prep started; execution deferred until an alternative backend is available  
**Decision**: Run backend A/B preparation after the Phase 6E runner baseline is accepted.

## Why This Phase Comes Next

Phase 6A proved that the pipeline can complete one vertical slice using:

```text
n8n -> OpenClaw Gateway -> cursor_agent -> npm test -> Review pass
```

The next biggest uncertainty is not orchestration or repository count. It is implementation backend quality:

- Can Cursor Agent solve simple and medium tasks reliably?
- Would Codex or Claude Code improve pass rate enough to justify cost/subscription?
- Can all coding backends fit behind the same OpenClaw routing contract?

Therefore Phase 6B defines a controlled A/B benchmark from the post-6E baseline.

## Current Entry Conditions (post-6E)

- `cursor-openclaw` is the only production-real backend adapter path today.
- `hermes` exists as a Local Runner stub adapter and is not runnable for real coding yet.
- `codex` / `claude` require confirmed access plus a non-interactive execution path before they can enter a real A/B run.

## Backend Variants

### Variant A — Cursor Backend (Baseline, Available)

```text
Implementation Agent -> OpenClaw Gateway -> cursor_agent
```

Status:

- Available now.
- Proven by PH6A task `01PH6AVERTICAL000000000602`.
- Current baseline for all future comparisons.

### Variant B — Codex Backend (Future)

```text
Implementation Agent -> OpenClaw Gateway -> codex_agent or codex_cli wrapper
```

Entry criteria:

- User confirms Codex subscription/API access.
- OpenClaw exposes a Codex-capable tool, or a wrapper can call Codex CLI locally.
- Tool can run in non-interactive mode and return structured output.

### Variant C — Claude Code Backend (Future)

```text
Implementation Agent -> OpenClaw Gateway -> claude_code wrapper
```

Entry criteria:

- User confirms Claude Code availability and cost acceptance.
- Tool can run in non-interactive mode.
- Output can be captured without leaking secrets.

## A/B Test Contract

Every backend must receive the same inputs:

- Task file body.
- `plan.md`.
- `test-plan.md`.
- Target repo path.
- Hard constraints:
  - Modify only files under the target repo.
  - Do not read or print secrets.
  - Run `npm test` if practical.
  - Return changed files, commands run, test result, and blockers.
  - Include `IMPLEMENTATION_RESULT:{task_id}` in the final response.

Every backend must produce the same artifact:

```text
agent/build/{task_id}.build.md
```

Minimum required fields:

- `backend`: `cursor | codex | claude | other`
- `classification`: `implemented | backend_blocked | backend_timeout | implementation_failed`
- `exit_code`
- `repo_change_summary`
- `output`

## Metrics

Primary metrics:

- Terminal pass rate: task reaches `done/`.
- Test pass rate: Execution & Analysis returns `classification: pass`.
- Review pass rate: Review & Optimization returns `verdict: pass`.
- Manual intervention count.

Secondary metrics:

- Implementation latency.
- End-to-end latency.
- Token/cost if visible through Langfuse or backend logs.
- Number of changed files.
- Retry count.
- Failure classification distribution.

## Benchmark Set

Use a small fixed set before scaling:

- 3 trivial tasks:
  - Add a single endpoint and test.
  - Add a README-only change.
  - Add a focused test for existing behavior.
- 2 medium tasks:
  - Add route + tests + small refactor.
  - Add 404 contract or validation behavior.
- 1 negative-control task:
  - Intentionally impossible or policy-blocked.

Rules:

- Tasks must be deterministic.
- Each task must have a unique endpoint/file target to avoid collisions.
- Reset the target repo or use a fresh worktree before each backend run.
- Keep Planning/Test Generation outputs fixed across backend variants.

## Execution Procedure

1. Prepare a clean target repo snapshot.
2. Generate fixed task, plan, and test-plan artifacts.
3. Run Variant A (Cursor baseline).
4. Reset target repo to the same snapshot.
5. Run Variant B or C when available.
6. Compare artifacts:
   - `build.md`
   - `test-run.md`
   - `review.md`
   - target repo diff
7. Record metrics in a report.

## Guardrails

- Do not buy/enable paid APIs automatically.
- Do not send `.env`, tokens, or secrets to any backend.
- Do not mix backend results in the same OpenClaw session unless correlation IDs are enforced.
- Do not compare backends on tasks that mutated an already-dirty target repo.
- Prefer archiving benchmark artifacts over deleting them.

## Required Implementation Before Running A/B

Before an actual A/B run, implement:

1. A backend selector in the Implementation Agent:
   - default: `cursor`
   - optional future values: `codex`, `claude`
2. Backend metadata in `build.md`:
   - `backend`
   - `backend_detail`
   - `backend_selector`
3. A benchmark seed script that creates fixed artifacts for each backend variant.
4. A reset strategy for `target-repos/api` between variants.
5. A `docs/phase-6b-report.md` template for metric collection.

Current prep status:

- Backend selector added to `n8n-workflows/implementation-agent.n8n.js`.
- Default backend is `cursor`.
- Unsupported `codex`/`claude` values return `backend_unsupported` until explicit tool paths exist.
- Build artifacts now include backend metadata fields.
- Metric template added at `docs/phase-6b-report.md`.

## Current Recommendation

Do not run Codex/Claude A/B yet.

Next concrete step:

1. Keep Cursor as the baseline.
2. Add benchmark seed/reset helpers when a second backend is available.
3. Only after a second backend is available, run the A/B benchmark.
