# Multi-Repo Fanout Task Schema

Phase 6C adds a coordination layer above the existing single-repo
`code-default/v0.1` pipeline. The goal is to support one user request that
expands into multiple repo-scoped child tasks without changing the proven
single-repo artifact loop.

## Parent Pipeline

Parent tasks use a separate pipeline family:

```yaml
pipeline: multi-repo-default
pipeline_version: v0.1
```

Parent tasks describe the user-level request and the repo dependency graph.
They do not directly invoke implementation backends. A Fanout Planner expands
the parent task into repo-scoped child tasks, and a Fanout Aggregator computes
the parent terminal state from child results.

### Parent Frontmatter

```yaml
---
task_id: 01PH6CFANOUT000000000001
title: Expose version across repos
created_at: 2026-04-26T00:00:00Z
status: pending
current_step: fanout_planning
pipeline: multi-repo-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 1
priority: normal
target_repos:
  - target-repos/api
  - target-repos/bff
  - target-repos/web
  - target-repos/batch
---
```

Required parent body sections:

```markdown
## Goal

User-level goal spanning multiple repositories.

## Repositories

Repo-specific expectations.

## Dependency Graph

Ordered child task dependencies.

## Done-when

Aggregate completion criteria.
```

### Parent Steps

| `current_step` | Owner | Produces |
| --- | --- | --- |
| `fanout_planning` | Fanout Planner | child task files + `fanout.md` |
| `fanout_waiting` | Fanout Aggregator | updated aggregate status |
| `done` | — | terminal success |
| `error` | — | terminal failure |

## Child Tasks

Child tasks continue to use the existing single-repo pipeline:

```yaml
pipeline: code-default
pipeline_version: v0.1
```

Phase 6C adds optional fanout metadata:

```yaml
parent_task_id: 01PH6CFANOUT000000000001
fanout_role: api
depends_on: []
```

Rules:

- Each child task must target exactly one repository via `target_repo`.
- Child task IDs must be globally unique.
- Child artifacts keep the existing naming convention:
  - `agent/plan/{child_task_id}.plan.md`
  - `agent/test/{child_task_id}.test-plan.md`
  - `agent/build/{child_task_id}.build.md`
  - `agent/test/{child_task_id}.test-run.md`
  - `agent/review/{child_task_id}.review.md`
- The Fanout Aggregator reads terminal child directories only:
  - `agent/done/{child_task_id}/`
  - `agent/error/{child_task_id}/`

## Fanout Artifact

The Fanout Planner writes:

```text
agent/fanout/{parent_task_id}.fanout.md
```

Minimum frontmatter:

```yaml
---
task_id: 01PH6CFANOUT000000000001
artifact: fanout
agent_role: Fanout Planner
pipeline: multi-repo-default
pipeline_version: v0.1
revision: 0
source_step: fanout_planning
aggregate_status: waiting
children:
  - task_id: 01PH6CAPI000000000000001
    target_repo: target-repos/api
    depends_on: []
  - task_id: 01PH6CBFF000000000000001
    target_repo: target-repos/bff
    depends_on:
      - 01PH6CAPI000000000000001
---
```

Recommended body sections:

```markdown
# Fanout: Expose version across repos

## Children

Child task table with repo, role, dependencies, and current terminal state.

## Aggregation Rules

Required child success/failure rules.
```

## Aggregation Semantics

The parent task reaches `done` only when all required child tasks are terminal
successes.

The parent task reaches `error` when any required child reaches terminal error
and no retry or reroute is available.

If some children are terminal and others are still absent or in flight, the
parent remains `fanout_waiting`.

## Guardrails

- Do not mutate the existing `code-default/v0.1` required fields.
- Do not allow a child task to modify more than one `target_repo`.
- Do not aggregate from non-terminal artifact files alone; use `done/` and
  `error/` directories as the source of truth.
- Do not reset dirty repositories as part of fanout planning.
