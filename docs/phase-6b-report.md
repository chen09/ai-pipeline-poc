# Phase 6B Report Template — Backend A/B Metrics

**Date**: 2026-04-29  
**Status**: Checkpoint `...106` accepted after scoped verification  
**Scope**: Compare implementation backends behind the same artifact contract.

## Backend Variants

| Variant | Backend | Status | Notes |
| --- | --- | --- | --- |
| A | `cursor` | Baseline available | OpenClaw Gateway -> `cursor_agent` |
| B | `codex` | Smoke checkpoint evidence captured (`...102`-`...106`) | Local Runner `codex` adapter executed end-to-end with terminal `completed` across checkpoints |
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

## Checkpoint `...104` Evidence

- **Parent / child IDs**:
  - parent: `01PH6BABSMOKE000000000104`
  - cursor: `01PH6BABCURSOR000000000104`
  - codex: `01PH6BABCODEX000000000104`
- **Triad consistency**:
  - both child tasks have `.status.json`, `.result.json`, `.completion.json`
  - triad values align on terminal success
- **Completion health**:
  - both children reached `completed`
  - `error_message` is null
  - `blocker` is `none`
- **Endpoint + focused test evidence**:
  - codex endpoint: `/phase6b-ab-codex-104`, test: `tests/phase6b-ab-codex-104.test.js`
  - cursor endpoint: `/phase6b-ab-cursor-104`, test: `tests/phase6b-ab-cursor-104.test.js`
  - route declarations present in `target-repos/api/src/index.js`
- **Quality gate**:
  - `npm test` in `target-repos/api` -> pass (`21` files, `22` tests)
- **Checkpoint decision**:
  - `01PH6BABSMOKE000000000104` is closed/accepted.

## Checkpoint `...105` Evidence

- **Parent / child IDs**:
  - parent: `01PH6BABSMOKE000000000105`
  - cursor: `01PH6BABCURSOR000000000105`
  - codex: `01PH6BABCODEX000000000105`
- **Guard outputs before seed**:
  - `agent/running`, `agent/inbox`, `agent/fanout/staged` had no non-`.gitkeep` entries
  - no active `queued|claimed|running` rows across `agent/jobs/*.status.json`
  - `command -v codex` succeeded
- **Seed + bounded watch summary**:
  - runtime seed succeeded for parent `...105`
  - codex child reached terminal first (`completed`)
  - cursor child reached terminal during bounded watch (`completed`)
  - no reseed performed in this round
- **Triad consistency**:
  - both children include `.status.json`, `.result.json`, `.completion.json`
  - status/result/completion content agrees on successful completion and blocker=`none`
- **Completion health**:
  - both children terminal `completed`
  - `error_message` null/empty
  - blocker `none`
- **Endpoint + focused test evidence**:
  - codex endpoint: `/phase6b-ab-codex-105`, test: `tests/phase6b-ab-codex-105.test.js`
  - cursor endpoint: `/phase6b-ab-cursor-105`, test: `tests/phase6b-ab-cursor-105.test.js`
  - route declarations present in `target-repos/api/src/index.js`
- **Quality gate**:
  - `npm test` in `target-repos/api` -> pass (`23` files, `24` tests)
- **Checkpoint decision**:
  - `01PH6BABSMOKE000000000105` is closed/accepted.

## Checkpoint `...106` Evidence

- **Parent / child IDs**:
  - parent: `01PH6BABSMOKE000000000106`
  - cursor: `01PH6BABCURSOR000000000106`
  - codex: `01PH6BABCODEX000000000106`
- **Guard outputs before seed**:
  - `find agent/running agent/inbox agent/fanout/staged ...` -> no output
  - `rg -n '"state": "(queued|claimed|running)"' agent/jobs/*.status.json` -> no matches
  - `command -v codex` -> succeeded
- **Continuous runner health**:
  - existing long-running `node runner/runner.js` process remained active during this round
- **Seed + bounded watch summary**:
  - runtime seed succeeded for parent `...106`
  - codex child reached terminal `completed` first
  - cursor child then reached terminal `completed` within baseline watch window
  - no extension and no reseed were needed
- **Watch timeline (60s cadence)**:
  - `12:51:44Z`: codex `running`, cursor pending
  - `12:52:44Z`: codex `completed`, cursor pending
  - `12:53:44Z`: cursor `running`, codex `completed`
  - `12:54:44Z`: cursor `running`, codex `completed`
  - `12:55:44Z`: cursor `running`, codex `completed`
  - `12:56:44Z`: both `completed` (watch end)
- **First-emergence matrix**:
  - codex first observed: status exists/running `12:51:44Z`, result+completion+completed `12:52:44Z`
  - cursor first observed: status exists/running `12:53:44Z`, result+completion+completed `12:56:44Z`
- **Triad consistency**:
  - both children include `.status.json`, `.result.json`, `.completion.json`
  - status/result/completion agree on successful completion and blocker=`none`
- **Completion health**:
  - both children terminal `completed`
  - `error_message` null (or empty completion `error`)
  - blocker `none`
- **Endpoint + focused test evidence**:
  - codex endpoint: `/phase6b-ab-codex-106`, test: `tests/phase6b-ab-codex-106.test.js`
  - cursor endpoint: `/phase6b-ab-cursor-106`, test: `tests/phase6b-ab-cursor-106.test.js`
  - route declarations present in `target-repos/api/src/index.js`
- **Quality gate**:
  - `npm test` in `target-repos/api` -> pass (`25` files, `26` tests)
- **Checkpoint decision**:
  - `01PH6BABSMOKE000000000106` is closed/accepted.

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
| `cursor` | 5 | 5 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `codex` | 5 | 5 | 0 | pass | pending manual review | 0 | in-band smoke | n/a |
| `claude` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Failure Classification

| Backend | Failure Class | Count | Notes |
| --- | --- | ---: | --- |
| `cursor` | none (checkpoints `...102`-`...106`) | 0 | completed via continuous runner watch |
| `codex` | none (checkpoints `...102`-`...106`) | 0 | completed via continuous runner watch |
| `claude` | TBD | TBD | TBD |

## Per-Task Results

| Task ID | Backend | Build Classification | Test Classification | Review Verdict | Changed Files | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `01PH6BABCURSOR000000000102` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-102.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000102` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-102.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCURSOR000000000103` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-103.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000103` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-103.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCURSOR000000000104` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-104.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000104` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-104.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCURSOR000000000105` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-105.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000105` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-105.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCURSOR000000000106` | `cursor` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-cursor-106.test.js` | completion artifact and result agree on blocker=`none` |
| `01PH6BABCODEX000000000106` | `codex` | completed | pass | pending manual review | `target-repos/api/src/index.js`, `target-repos/api/tests/phase6b-ab-codex-106.test.js` | completion artifact and result agree on blocker=`none` |

## Decision

Checkpoint decisions:

- `01PH6BABSMOKE000000000102`: accepted as first clean Phase 6B A/B smoke checkpoint candidate.
- `01PH6BABSMOKE000000000103`: **closed/accepted** after scoped verification in this round.
- `01PH6BABSMOKE000000000104`: **closed/accepted** after follow-up completion watch and quality-gate verification.
- `01PH6BABSMOKE000000000105`: **closed/accepted** after bounded watch, triad consistency checks, and quality-gate pass.
- `01PH6BABSMOKE000000000106`: **closed/accepted** after strict guard pass, bounded watch completion, and quality-gate pass.

## Next Slice Readiness (Proposal Only)

- Candidate parent id placeholder: `01PH6BABSMOKE000000000107`
- Preconditions before authorizing next slice:
  - continuous runner consumer confirmed active at slice start,
  - guard checks clean (`running/inbox/fanout-staged`, active status scan, codex availability),
  - checkpoints `...102`-`...106` evidence accepted by codex review.

## Open Questions

- Which second backend is available first: Codex or Claude?
- Should each backend run in an isolated OpenClaw session?
- Should benchmark tasks run in fresh git worktrees?
- What cost ceiling should apply per backend run?
