# Phase 6B Report Template — Backend A/B Metrics

**Date**: 2026-04-29  
**Status**: Harness prepared; first live smoke slice pending runtime seed  
**Scope**: Compare implementation backends behind the same artifact contract.

## Backend Variants

| Variant | Backend | Status | Notes |
| --- | --- | --- | --- |
| A | `cursor` | Baseline available | OpenClaw Gateway -> `cursor_agent` |
| B | `codex` | Runner-wired, smoke pending | Local Runner `codex` adapter + fake adapter test coverage in place; first live smoke evidence pending |
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

- Parent task id used:
- Cursor task id:
- Codex task id:
- Runtime seed timestamp:
- Guard checks passed:

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
| `cursor` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `codex` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| `claude` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Failure Classification

| Backend | Failure Class | Count | Notes |
| --- | --- | ---: | --- |
| `cursor` | TBD | TBD | TBD |
| `codex` | TBD | TBD | TBD |
| `claude` | TBD | TBD | TBD |

## Per-Task Results

| Task ID | Backend | Build Classification | Test Classification | Review Verdict | Changed Files | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | `cursor` | TBD | TBD | TBD | TBD | TBD |

## Decision

Record whether a backend should become:

- default backend
- fallback backend
- high-cost escalation backend
- rejected / deferred

## Open Questions

- Which second backend is available first: Codex or Claude?
- Should each backend run in an isolated OpenClaw session?
- Should benchmark tasks run in fresh git worktrees?
- What cost ceiling should apply per backend run?
