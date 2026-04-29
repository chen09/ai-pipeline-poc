# Phase 6B Report Template — Backend A/B Metrics

**Date**: 2026-04-29  
**Status**: Checkpoint `...103` accepted after scoped verification  
**Scope**: Compare implementation backends behind the same artifact contract.

## Backend Variants

| Variant | Backend | Status | Notes |
| --- | --- | --- | --- |
| A | `cursor` | Baseline available | OpenClaw Gateway -> `cursor_agent` |
| B | `codex` | Smoke checkpoint evidence captured (`...102`, `...103`) | Local Runner `codex` adapter executed end-to-end with terminal `completed` in both checkpoints |
| C | `claude` | Deferred | Requires confirmed access and cost acceptance |

## First Live Smoke Slice

- Seed helper: `scripts/seed_phase6b_backend_ab_smoke.sh`
- Default parent task id: `01PH6BABSMOKE000000000001`
- Backend options:
  - `--backend cursor`
  - `--backend codex`
  - `--backend both` (default)
- Task ID pattern:
  - cursor: `01PH6BABCURSOR000000000{suffix}`
  - codex: `01PH6BABCODEX000000000{suffix}`
- Runtime guard notes:
  - dry-run mode writes to temp dir and should not leave files in `agent/`,
  - runtime mode writes fanout/plan/test/running task artifacts under `agent/`,
  - script refuses to overwrite existing artifact paths,
  - script does not reset/clean `target-repos/api`.

### Fill After Runtime Seed

- Parent task id used: `01PH6BABSMOKE000000000102`
- Cursor task id: `01PH6BABCURSOR000000000102`
- Codex task id: `01PH6BABCODEX000000000102`
- Runtime seed timestamp: `2026-04-29T09:49:55Z` (first child request submission)
- Guard checks passed: yes (`running/inbox/fanout-staged` clear, no active queued/claimed/running status rows, codex command resolvable)

## Checkpoint `...102` Evidence

- **Checkpoint role**: first clean Phase 6B A/B smoke evidence after transport/dispatch fixes.
- **Pickup/stall-clear note**: dispatch stall cleared once continuous local runner consumer stayed active (`node runner/runner.js`) during bounded re-watch.
- **Per-backend terminal outcomes**:
  - `01PH6BABCODEX000000000102`: `completed`
  - `01PH6BABCURSOR000000000102`: `completed`
- **Endpoint + focused test evidence**:
  - endpoint: `/phase6b-ab-codex-102` with test `tests/phase6b-ab-codex-102.test.js`
  - endpoint: `/phase6b-ab-cursor-102` with test `tests/phase6b-ab-cursor-102.test.js`
  - route definitions present in `target-repos/api/src/index.js`
- **Verification commands**:
  - `npm test` in `target-repos/api` -> pass (`17` files, `18` tests)
  - scoped artifact consistency checks on child `.status/.result/.completion` files -> pass

## Checkpoint `...103` Evidence

- **Parent / child IDs**:
  - parent: `01PH6BABSMOKE000000000103`
  - cursor: `01PH6BABCURSOR000000000103`
  - codex: `01PH6BABCODEX000000000103`
- **Guard + seed summary**:
  - pre-seed guards passed (runtime directories clear, no active queued/claimed/running status rows, codex command resolvable)
  - seed command succeeded for parent `...103`
- **Bounded watch note**:
  - continuous runner consumer remained healthy during the watch
  - both child tasks reached terminal `completed` in bounded window
- **Per-backend endpoint/test evidence**:
  - codex: `/phase6b-ab-codex-103` + `tests/phase6b-ab-codex-103.test.js`
  - cursor: `/phase6b-ab-cursor-103` + `tests/phase6b-ab-cursor-103.test.js`
  - both route declarations present in `target-repos/api/src/index.js`
- **Verification commands + outcomes**:
  - `rg -n "phase6b-ab-codex-103|phase6b-ab-cursor-103" target-repos/api` -> routes/tests found
  - `npm test` in `target-repos/api` -> pass (`19` files, `20` tests)
  - child artifact triad (`.status/.result/.completion`) consistency checks -> pass
- **Checkpoint decision**:
  - `01PH6BABSMOKE000000000103` is closed/accepted in this round.

## Run Configuration

- Target repo snapshot:
- Task set:
- Reset strategy:
- n8n workflows active:
- OpenClaw session strategy:
- LiteLLM / Langfuse trace scope:

## Metrics Summary

| Backend | Tasks | Done | Error | Test Pass | Review Pass | Manual Interventions | Avg E2E Latency | Avg Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `cursor` | 2 | 2 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `codex` | 2 | 2 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `claude` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Failure Classification

| Backend | Failure Class | Count | Notes |
| --- | --- | ---: | --- |
| `cursor` | none (checkpoints `...102`, `...103`) | 0 | completed via continuous runner watch |
| `codex` | none (checkpoints `...102`, `...103`) | 0 | completed via continuous runner watch |
| `claude` | TBD | TBD | TBD |

## Per-Task Results

| Task ID | Backend | Build Classification | Test Classification | Review Verdict | Changed Files | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `01PH6BABCURSOR000000000102` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-102.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000102` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-102.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCURSOR000000000103` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-103.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000103` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-103.test.js` | completion artifact and result agree on blocker=`none` |

## Decision

Checkpoint decisions:

- `01PH6BABSMOKE000000000102`: accepted as first clean Phase 6B A/B smoke checkpoint candidate.
- `01PH6BABSMOKE000000000103`: **closed/accepted** after scoped verification in this round.

## Next Slice Readiness (Proposal Only)

- Candidate parent id placeholder: `01PH6BABSMOKE000000000104`
- Preconditions before authorizing next slice:
  - continuous runner consumer confirmed active at slice start,
  - guard checks clean (`running/inbox/fanout-staged`, active status scan, codex availability),
  - checkpoints `...102` and `...103` evidence accepted by codex review.

## Open Questions

- Which second backend is available first: Codex or Claude?
- Should each backend run in an isolated OpenClaw session?
- Should benchmark tasks run in fresh git worktrees?
- What cost ceiling should apply per backend run?
