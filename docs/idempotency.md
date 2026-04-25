# Idempotency Rules

The pipeline must tolerate restarts, duplicate scheduler ticks, and partial
failures without losing or double-executing tasks.

## Claiming Tasks

A worker claims a task with a same-filesystem atomic move:

```bash
mv agent/inbox/X.md agent/running/X.md
```

If the move fails, another worker won the claim and the current worker must
stop processing that task.

After a successful claim, the worker writes a lock file:

```text
agent/running/X.md.lock
```

Lock file format:

```text
worker_id|claimed_at_iso_utc|ttl_seconds
```

Default TTL:

```text
600 seconds
```

## Stable Terminal States

Terminal states must be write-once for a given `task_id` and `retry_count`:

| State   | Directory      | Rule                                                        |
| ------- | -------------- | ----------------------------------------------------------- |
| `done`  | `agent/done/`  | Do not overwrite an existing success artifact.              |
| `error` | `agent/error/` | Append failure context or create a retry-specific artifact. |

## Artifact Paths and Naming

Every pipeline step writes to a deterministic path based on `task_id`. Listed
in execution order:

```text
agent/plan/{task_id}.plan.md          ← Planning Agent
agent/test/{task_id}.test-plan.md     ← Test Generation Agent (before build)
agent/build/{task_id}.build.md        ← Implementation Agent
agent/test/{task_id}.test-run.md      ← Execution & Analysis Agent
agent/review/{task_id}.review.md      ← Review & Optimization Agent
```

These base paths represent the **current revision's artifacts**. Workers must
refuse to overwrite an existing artifact unless the task's `revision` counter
has been incremented, preventing duplicate scheduler ticks from silently
replacing evidence.

### TDD Gate Enforcement

Before any worker sets `current_step: coding`, it must verify:

```bash
test -f agent/test/{task_id}.test-plan.md
```

If the file is absent, the worker must not proceed. This is the hard gate that
enforces test-first ordering. Workers checking for work to do in `coding` state
should skip tasks where the test-plan artifact is missing.

### Archiving on Feedback Loop

When the Review & Optimization Agent routes a task back to an earlier step,
the current artifacts for the old revision must be archived before `revision`
is incremented:

```text
agent/plan/{task_id}.plan.r{old_revision}.md         # archived
agent/test/{task_id}.test-plan.r{old_revision}.md
agent/build/{task_id}.build.r{old_revision}.md
agent/test/{task_id}.test-run.r{old_revision}.md
agent/review/{task_id}.review.r{old_revision}.md
```

After archiving, the task file's `revision` is incremented, and agents
produce fresh artifacts at the canonical paths (`{task_id}.plan.md`, etc.).

## Artifact Dependency Graph

Each artifact has a defined set of upstream dependencies. An artifact is
**valid** only if all its dependencies are present and share the same `revision`.
The test-plan is an explicit gate: the build artifact may not be created until
test-plan exists.

```
request (task.md)
  └── plan.md              ← depends on: request
        └── test-plan.md   ← depends on: request + plan   [TDD gate]
              └── build.md ← depends on: plan + test-plan [cannot start without test-plan]
                    └── test-run.md  ← depends on: build + test-plan
                          └── review.md ← depends on: request + plan + test-plan + build + test-run
```

## Invalidation Rules

When a feedback loop routes back to an earlier step, all downstream artifacts
from the same revision are stale and must be re-generated:

| Reroute target | Agent | Must re-generate |
| --- | --- | --- |
| `planning` | Planning Agent | plan, test-plan, build, test-run, review |
| `test_planning` | Test Generation Agent | test-plan, build, test-run, review |
| `coding` | Implementation Agent | build, test-run, review |

Before re-generating, archive existing artifacts under the `.r{revision}` suffix
(see above), then increment `revision` in the task frontmatter.

**Short-circuit routes** from Execution & Analysis Agent (classification-based,
not a full revision increment):

| Classification | Route | Action |
| --- | --- | --- |
| `implementation_failure` | → Implementation Agent | increment `retry_count` only; test-plan remains valid |
| `plan_ambiguity` | → Planning Agent | increment `revision`; re-generate all artifacts |

Short-circuit routes that increment only `retry_count` do not require archiving
existing artifacts — the plan and test-plan are still valid.

## LiteLLM Idempotency

Every LLM request should include an idempotency key derived from the task:

```text
{task_id}-{step}-r{revision}-{retry_count}
```

Use the same value in request metadata so Langfuse can group events even when
the provider does not enforce idempotency directly.

Recommended metadata:

```json
{
  "trace_id": "{task_id}",
  "generation_name": "{step}",
  "user_id": "poc",
  "metadata": {
    "task_id": "{task_id}",
    "pipeline": "code-default",
    "pipeline_version": "v0.1",
    "revision": 0,
    "retry_count": 0,
    "agent_role": "{Planning Agent | Test Generation Agent | Implementation Agent | Execution & Analysis Agent | Review & Optimization Agent}",
    "idempotency_key": "{task_id}-{step}-r{revision}-{retry_count}"
  }
}
```

## Stale Lock Recovery

A recovery workflow should periodically scan `agent/running/*.lock`.

If:

```text
now - claimed_at > ttl_seconds
```

then:

1. Move `agent/running/X.md` back to `agent/inbox/X.md`.
2. Move or delete `agent/running/X.md.lock`.
3. Append a recovery note to the task body or frontmatter history.

Recovery must not touch tasks whose lock has not expired.

## Pipeline Versioning

The claim semantics are stable across pipeline versions. Intermediate step
names and artifact paths are not.

Workflows must route by:

```yaml
pipeline: code-default
pipeline_version: v0.1
```

This allows a future pipeline, for example `docs-default/v1`, to add different
intermediate steps without breaking tasks that are already in flight.
