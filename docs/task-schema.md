# Task Schema

Task files are markdown documents with YAML frontmatter. The frontmatter is the
machine-readable contract; the markdown body is the human-readable task brief.

## Default Pipeline

The POC uses the `code-default` pipeline. The current active contract version
is **v0.1**, which supersedes the earlier linear v0 draft.

```yaml
pipeline: code-default
pipeline_version: v0.1
```

### Agent Steps (v0.1)

The `current_step` field indicates which agent should act next. Steps are
listed in execution order. The test-plan gate (step 2) must complete before
the implementation step (step 3) can start:

| Order | `current_step` | Agent | Reads | Produces |
| --- | --- | --- | --- | --- |
| 1 | `planning` | Planning Agent | request | `plan.md` |
| 2 | `test_planning` | Test Generation Agent | request + plan | `test-plan.md` |
| 3 | `coding` | Implementation Agent | plan + **test-plan** (gate) | `build.md` |
| 4 | `test_running` | Execution & Analysis Agent | build + test-plan | `test-run.md` |
| 5 | `reviewing` | Review & Optimization Agent | all artifacts | `review.md` |
| — | `done` | — | — | Terminal success |
| — | `error` | — | — | Terminal failure |

**TDD gate**: a workflow must verify that `test/{task_id}.test-plan.md` exists
before setting `current_step: coding`. If the file is absent, the workflow
keeps the task at `current_step: test_planning` and retries.

### Status vs current_step

`status` is the coarse-grained lifecycle state (visible to orchestrators):

| `status` | Meaning |
| --- | --- |
| `pending` | Not yet claimed |
| `running` | Claimed by a worker, `current_step` indicates what step |
| `done` | Successfully completed |
| `error` | Failed, see `error/` bundle for reason |

`current_step` is the fine-grained routing hint inside `running`. A task at
`status: running, current_step: coding` means the Implementation Agent should
pick it up next — but only after `test-plan.md` exists (TDD gate).

### Directory Mapping (v0.1)

| `status` / `current_step` | Directory | Notes |
| --- | --- | --- |
| `pending` | `agent/inbox/` | Waiting to be claimed |
| `running / planning` | `agent/running/` | Claimed; Planning Agent next |
| `running / test_planning` | `agent/running/` | Test Generation Agent next (TDD gate) |
| `running / coding` | `agent/running/` | Implementation Agent next |
| `running / test_running` | `agent/running/` | Execution & Analysis Agent next |
| `running / reviewing` | `agent/running/` | Review & Optimization Agent next |
| `done` | `agent/done/` | Terminal success |
| `error` | `agent/error/` | Terminal failure |

The task file always lives in `agent/running/` while in flight. The step-specific
artifacts live in their respective artifact directories (`plan/`, `build/`,
`test/`, `review/`).

## Required Frontmatter

```yaml
---
task_id: 01JSP4YA9D0000000000000001
title: Add health endpoint
created_at: 2026-04-25T05:13:33Z
status: pending
current_step: planning
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 3
target_repo: target-repos/api
priority: normal
---
```

### Field Definitions

| Field              | Type                | Required | Description                                                                    |
| ------------------ | ------------------- | -------- | ------------------------------------------------------------------------------ |
| `task_id`          | ULID string         | yes      | Durable task identity. Workflows must use this, not the filename.              |
| `title`            | string              | yes      | Short human-readable title.                                                    |
| `created_at`       | ISO-8601 UTC string | yes      | Task creation timestamp.                                                       |
| `status`           | enum                | yes      | Coarse lifecycle state: `pending`, `running`, `done`, or `error`.              |
| `current_step`     | enum                | yes      | Fine-grained routing step (see Agent Steps table above). Start with `planning`.|
| `pipeline`         | string              | yes      | Pipeline family, for example `code-default`.                                   |
| `pipeline_version` | string              | yes      | Versioned state contract. Current: `v0.1`.                                     |
| `revision`         | integer             | yes      | Feedback-loop iteration counter. Starts at `0`, incremented on each reroute.  |
| `retry_count`      | integer             | yes      | Number of completed retries within a revision. Starts at `0`.                 |
| `max_retry`        | integer             | yes      | Maximum allowed retries before routing to `error/`.                            |
| `target_repo`      | path string         | yes      | Repository path relative to project root.                                      |
| `priority`         | enum                | yes      | `low`, `normal`, `high`, or `urgent`.                                          |
| `blocked_by`       | string              | no       | Optional. Records the artifact or agent that triggered a reroute.             |

### `revision` Semantics

`revision` is incremented each time the Reviewer routes the task back to an
earlier step. It drives artifact filename versioning so old evidence is not
silently overwritten during retries:

- `revision: 0` — first attempt
- `revision: 1` — task re-entered planning or coding after first review failure
- …and so on up to `max_retry`

When `revision` reaches `max_retry`, the next reroute moves the task to
`agent/error/` instead.

## Required Body Sections

Each task body must include these markdown sections:

```markdown
## Goal

What should be achieved.

## Constraints

Rules, limitations, and implementation boundaries.

## Done-when

Observable completion criteria.
```

## Extending the Pipeline

Do not repurpose an existing `pipeline_version` after tasks have been created.
Instead:

1. Add a new version, for example `pipeline_version: v1`.
2. Document its `current_step` enum and agent responsibilities in this file.
3. Update n8n workflows to route by `pipeline` and `pipeline_version`.
4. Keep existing v0.1 tasks compatible until they are fully drained.

Example future documentation pipeline:

```yaml
pipeline: docs-default
pipeline_version: v1
```

```text
pending -> drafting -> reviewing -> done/error
```
