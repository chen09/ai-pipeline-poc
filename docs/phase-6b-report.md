# Phase 6B Report Template — Backend A/B Metrics

**Date**: 2026-04-29  
**Status**: First clean A/B smoke checkpoint candidate verified (`...102`)  
**Scope**: Compare implementation backends behind the same artifact contract.

## Backend Variants

| Variant | Backend | Status | Notes |
| --- | --- | --- | --- |
| A | `cursor` | Baseline available | OpenClaw Gateway -> `cursor_agent` |
| B | `codex` | First clean smoke evidence captured | Local Runner `codex` adapter executed end-to-end for `...102` with terminal `completed` |
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
| `cursor` | 1 | 1 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `codex` | 1 | 1 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `claude` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Failure Classification

| Backend | Failure Class | Count | Notes |
| --- | --- | ---: | --- |
| `cursor` | none (checkpoint `...102`) | 0 | completed via continuous runner watch |
| `codex` | none (checkpoint `...102`) | 0 | completed via continuous runner watch |
| `claude` | TBD | TBD | TBD |

## Per-Task Results

| Task ID | Backend | Build Classification | Test Classification | Review Verdict | Changed Files | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `01PH6BABCURSOR000000000102` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-102.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000102` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-102.test.js` | completion artifact and result agree on blocker=`none` |

## Decision

Checkpoint decision for `01PH6BABSMOKE000000000102`: **accepted as first clean Phase 6B A/B smoke checkpoint candidate**.

No next slice executed in this round by design.

## Next Slice Readiness (Proposal Only)

- Candidate parent id placeholder: `01PH6BABSMOKE000000000103`
- Preconditions before authorizing next slice:
  - continuous runner consumer confirmed active at slice start,
  - guard checks clean (`running/inbox/fanout-staged`, active status scan, codex availability),
  - checkpoint `...102` evidence accepted by codex review.

## Open Questions

- Which second backend is available first: Codex or Claude?
- Should each backend run in an isolated OpenClaw session?
- Should benchmark tasks run in fresh git worktrees?
- What cost ceiling should apply per backend run?
