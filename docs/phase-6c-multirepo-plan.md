# Phase 6C Plan — Multi-Repo Fanout With Cursor Baseline

**Date**: 2026-04-26  
**Status**: First serial runtime fanout completed  
**Decision**: Continue with Cursor as the implementation baseline while Codex/Claude A/B execution remains deferred.

## Live Runtime Snapshot

Checked on 2026-04-26:

- Docker Compose services are running; core services report healthy:
  - `n8n-main`
  - `litellm`
  - `langfuse-web`
  - `postgres`
  - `redis`
  - `clickhouse`
  - `minio`
- HTTP health checks passed:
  - `http://localhost:5678/healthz`
  - `http://localhost:4000/health/liveliness`
  - `http://localhost:3000/api/public/health`
- Runtime queue has no active work:
  - `agent/inbox/`: no pending task found
  - `agent/running/`: no in-flight task found
- Phase 6A terminal proof exists:
  - `agent/done/01PH6AVERTICAL000000000602/`
  - review verdict: `pass`
  - target repo tests passed during that run
- The bundled Phase 6A task file still has `status: running` and `current_step: reviewing` in frontmatter even though it lives under `done/`; treat this as a runtime consistency issue to fix in future terminal-state handling.
- Target repo `target-repos/api` is dirty and currently on branch `task/01JSP4YA9D0000000000000002`.

Because `target-repos/api` has uncommitted changes, Phase 6C should not start by resetting or reusing it as a destructive baseline. Any benchmark or fanout work should either use fresh worktrees or require explicit user approval before cleanup.

## Why This Phase Comes Next

Phase 6B intentionally deferred Codex/Claude A/B execution until a second backend is confirmed. The current available implementation path is:

```text
n8n -> OpenClaw Gateway -> cursor_agent -> target repo -> npm test -> Review
```

The next useful expansion is therefore not another backend comparison. It is a controlled multi-repo fanout design that keeps Cursor as the implementation backend and tests whether the artifact loop can coordinate multiple repositories without losing task boundaries.

## Scope

Phase 6C should answer:

- Can one user request produce coordinated tasks across multiple target repos?
- Can each repo keep its own plan, test-plan, build, test-run, and review artifacts?
- Can the pipeline express dependencies between repo-level tasks?
- Can failures in one repo be isolated without corrupting other repo artifacts?

Phase 6C should not answer:

- Which implementation backend is best.
- Whether Codex or Claude should replace Cursor.
- How to deploy the system outside localhost.
- How to add a human approval UI.

## Proposed Target Repos

Start with small local repos, each with deterministic tests:

| Repo | Purpose | Initial Contract |
| --- | --- | --- |
| `target-repos/api` | Backend API | Express + Vitest/Supertest |
| `target-repos/bff` | Backend-for-frontend adapter | Node test runner or Vitest |
| `target-repos/web` | Minimal frontend/client | Static or lightweight test command |
| `target-repos/batch` | Background job / worker | Simple CLI + tests |

The Phase 6C fixture repos now exist:

- `target-repos/bff`
- `target-repos/web`
- `target-repos/batch`

They use Node's built-in test runner and do not require dependency installation.

## Contract Changes

Keep the existing single-repo `code-default/v0.1` contract intact. Add a new fanout layer instead of mutating v0.1 task semantics.

Recommended additions:

- A parent orchestration task:
  - `pipeline: multi-repo-default`
  - `pipeline_version: v0.1`
  - owns dependency graph and terminal aggregation
- Child repo tasks:
  - keep `pipeline: code-default`
  - keep `pipeline_version: v0.1`
  - add optional `parent_task_id`
  - add optional `depends_on`
  - each child task still has exactly one `target_repo`

This preserves the proven single-repo loop while adding coordination above it.

## Artifact Layout

Avoid mixing child artifacts from different repos under ambiguous names. Recommended fanout artifact convention:

```text
agent/fanout/{parent_task_id}.fanout.md
agent/plan/{child_task_id}.plan.md
agent/test/{child_task_id}.test-plan.md
agent/build/{child_task_id}.build.md
agent/test/{child_task_id}.test-run.md
agent/review/{child_task_id}.review.md
agent/done/{child_task_id}/...
agent/error/{child_task_id}/...
```

The parent fanout artifact should record:

- requested repos
- generated child task IDs
- dependency edges
- aggregate status
- per-child terminal result
- user-facing summary

## Execution Model

Start with serial execution before enabling parallelism:

1. Parent task enters `agent/inbox/`.
2. Fanout Planner validates repo list and writes child task files.
3. Child tasks run through the existing single-repo pipeline.
4. Parent Aggregator watches child terminal states.
5. Parent task reaches `done` only when all required children are `done`.
6. Parent task reaches `error` if a required child fails and no recovery route is available.

Parallel child execution can be added after serial mode is stable.

## First Multi-Repo Scenario

Use a deterministic vertical slice:

```text
User request:
Expose a version string through api -> bff -> web, and add a batch health check.
```

Suggested child tasks:

- `api`: add `GET /version` returning `{ "version": "0.1.0" }`.
- `bff`: add an adapter function or endpoint that reads the API version contract.
- `web`: add a minimal client display or test fixture for the version value.
- `batch`: add a CLI health check returning `batch:ok`.

For the first run, avoid real network calls between repos. Use contract fixtures so each repo can test deterministically.

## Guardrails

- Do not reset `target-repos/api` without explicit user confirmation.
- Do not run fanout tasks against a dirty repo baseline unless the dirty state is intentionally part of the test.
- Do not introduce paid backends or paid APIs for Phase 6C.
- Do not send `.env`, keys, tokens, or local credential files to implementation backends.
- Keep each child task constrained to exactly one `target_repo`.
- Prefer fresh git worktrees for repeatable benchmark runs.

## Required Implementation Before First Run

1. Create minimal fixture repos for `bff`, `web`, and `batch`. **Done.**
2. Document the parent/child task schema extension. **Done: `docs/fanout-task-schema.md`.**
3. Add a fanout seed script that creates one parent task and deterministic child tasks. **Done: `scripts/seed_phase6c_fanout.sh`.**
4. Add a parent aggregation script or workflow. **Script done: `scripts/aggregate_phase6c_fanout.py`; n8n workflow not started.**
5. Run serial fanout once. **Done with Phase 6C deterministic fixture fast paths.**
6. Record results in a Phase 6C report. **Done: `docs/phase-6c-report.md`.**

## Open Questions

- Should parent tasks live in the same `agent/inbox/` queue or a dedicated `agent/fanout-inbox/` queue?
- Should child task creation be done by n8n, a local script, or a small dedicated Fanout Planner workflow?
- Should every child task get its own OpenClaw session for cleaner correlation?
- Should `target-repos/api` dirty changes be committed, archived, or moved to a fresh worktree before the first Phase 6C run?
