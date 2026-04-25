# Agent State Directory

This directory is the file-backed state machine for the local AI pipeline.
Every task is a markdown file with YAML frontmatter. Workflows move files
between directories using atomic same-filesystem operations.

## Stable Directories

These directories are part of the durable contract and remain stable across
all future pipeline versions:

| Directory  | Meaning                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| `inbox/`   | New tasks waiting to be claimed (source-of-truth request).                   |
| `running/` | Tasks claimed by a worker. A sibling `.lock` file records ownership and TTL. |
| `done/`    | Successful terminal state. Contains a bundle of all artifacts.               |
| `error/`   | Failed terminal state, including retry history and failure reason.           |

## Pipeline v0.1 Artifact Directories

These directories hold the versioned artifacts produced by each agent. They
are pipeline-version-specific and may evolve. Listed in execution order:

| Directory | Artifacts stored | Produced by |
| --------- | ---------------- | ----------- |
| `plan/`   | `{task_id}.plan.md` | Planning Agent |
| `test/`   | `{task_id}.test-plan.md` (before build) | Test Generation Agent |
| `build/`  | `{task_id}.build.md` | Implementation Agent |
| `test/`   | `{task_id}.test-run.md` (after build) | Execution & Analysis Agent |
| `review/` | `{task_id}.review.md` (routing decision) | Review & Optimization Agent |

## TDD-like Multi-Agent Pipeline (v0.1)

The pipeline follows a **test-first order**: the Test Generation Agent runs
after planning but *before* implementation. The Implementation Agent is
therefore constrained by pre-defined acceptance criteria rather than
inventing them after the fact.

```
 Request (task.md)
       │
       ▼
 ┌──────────────────────────┐
 │  1. Planning Agent       │
 └─────────────┬────────────┘
               │ plan.md
               ▼
 ┌──────────────────────────┐
 │  2. Test Generation      │  ← reads request + plan
 │     Agent                │
 └─────────────┬────────────┘
               │ test-plan.md
               │
               │  (TDD gate: coding cannot start until test-plan.md exists)
               ▼
 ┌──────────────────────────┐
 │  3. Implementation       │  ← reads plan + test-plan
 │     Agent                │
 └─────────────┬────────────┘
               │ build.md
               ▼
 ┌──────────────────────────┐
 │  4. Execution &          │  ← reads build + test-plan
 │     Analysis Agent       │
 └─────────────┬────────────┘
               │ test-run.md
               │
               ├─── implementation_failure ──→ Implementation Agent (short-circuit)
               └─── plan_ambiguity         ──→ Planning Agent (short-circuit)
               │
               ▼
 ┌──────────────────────────┐
 │  5. Review &             │  ← reads all artifacts
 │     Optimization Agent   │
 └─────────────┬────────────┘
               │ review decision
               │
       ┌───────┼──────────────┬─────────────┐
       ▼       ▼              ▼             ▼
     pass  plan_issue    code_issue    test_issue
       │       │              │             │
       ▼       ▼              ▼             ▼
     done  Planning      Implementation  Test Gen.
           Agent         Agent           Agent

 (on revision >= max_retry at any reroute) ──→ error
```

### Agent Responsibilities

| Agent | `current_step` | Reads | Produces |
| --- | --- | --- | --- |
| Planning Agent | `planning` | request | `plan.md` |
| Test Generation Agent | `test_planning` | request + plan | `test-plan.md` |
| Implementation Agent | `coding` | plan + **test-plan** (gate) | `build.md` |
| Execution & Analysis Agent | `test_running` | build + test-plan | `test-run.md` |
| Review & Optimization Agent | `reviewing` | request + plan + test-plan + build + test-run | `review.md` |

### Feedback Routes

The Review & Optimization Agent's decision in `review.md` determines the next
step and which artifacts must be re-generated:

| Verdict | Route | Must re-generate |
| --- | --- | --- |
| `pass` | → `done/` | — |
| `plan_issue` | → Planning Agent | plan, test-plan, build, test-run, review |
| `code_issue` | → Implementation Agent | build, test-run, review |
| `test_issue` | → Test Generation Agent | test-plan, build, test-run, review |
| `critical` | → `error/` immediately | — |

Before re-generating, archive old revision artifacts and increment `revision`.
See [../docs/idempotency.md](../docs/idempotency.md) for archiving rules.

## Research-Backed Pipeline Practices

The following patterns are incorporated into v0.1. References are from
peer-reviewed papers available at [arxiv.org](https://arxiv.org).

### Plan Reminder

Every agent step receives a **Plan Reminder** block prepended to its system
prompt. This reduces plan violations and improves step compliance.

```text
[Plan Reminder]
Request summary : {request title and goal}
Current plan    : {plan.md full content}
Your role       : {agent role name}
Your step       : {current_step}
Allowed outputs : {exactly one artifact filename}
Do NOT produce outputs outside your defined role.
```

Rationale: *From Plan to Action* (2026, arxiv 2604.12147) shows that periodic
plan re-injection into agent prompts reduces plan violations and improves task
resolution, especially for multi-step workflows.

### Test-First Gate

The Implementation Agent must not start until `test/{task_id}.test-plan.md`
exists. n8n workflows enforce this gate by checking the file before claiming
a `coding` step.

Effect: acceptance criteria are defined before code is written, which improves
implementation accuracy and reduces review rework cycles.

Rationale: *TDFlow* (EACL 2026, arxiv 2510.23761) shows +27.8% improvement on
SWE-Bench Lite with test-driven workflows. *TENET* shows +9.5 pp Pass@1 on
RepoEval under TDD settings.

### Execution Feedback Loop

The Execution & Analysis Agent classifies every test failure before routing,
enabling short-circuit paths that bypass the full review cycle:

| Outcome | Classification | Route |
| --- | --- | --- |
| All tests pass | — | → Review & Optimization Agent |
| Tests run but fail | `implementation_failure` | → Implementation Agent |
| Tests invalid or cannot run | `plan_ambiguity` | → Planning Agent |

Short-circuit routes save tokens and latency; they increment `retry_count` (not
`revision`) because the plan and test-plan artifacts remain valid.

Rationale: *The Rise of Agentic Testing* (2026, arxiv 2601.02454) — closed-loop
execution feedback reduces invalid tests by 60% and improves coverage by 30%.

### Best-of-K + Verifier Rerank (Phase 4+ Extension, Optional)

When token budget is not a constraint, generate K implementations (K = 3–5),
run the test-plan against each, and select the one with the highest test-pass
rate using an LLM judge or a lightweight verifier.

```text
Implementation Agent × K      → K build artifacts
Execution & Analysis Agent × K → K test-run artifacts
Verifier (LLM judge)           → select best → Review & Optimization Agent
```

Rationale: *SWE-Gym* (2025, arxiv 2412.21139) shows +11.4% improvement on
SWE-Bench Verified via Best-of-8 + verifier reranking. Not required for Phase 2.

## Artifact Naming Convention

All artifact filenames are deterministic and based on `task_id`. Listed in
execution order:

```text
agent/plan/{task_id}.plan.md             ← Planning Agent
agent/test/{task_id}.test-plan.md        ← Test Generation Agent (before build)
agent/build/{task_id}.build.md           ← Implementation Agent
agent/test/{task_id}.test-run.md         ← Execution & Analysis Agent
agent/review/{task_id}.review.md         ← Review & Optimization Agent
```

On feedback-loop reroute, old revision artifacts are archived under
`{task_id}.{artifact}.r{revision}.md` before `revision` is incremented.

## File Naming

Seed tasks use readable filenames such as `task_001.md`, but workflows must
key by `task_id` from frontmatter. Filenames are convenience labels; `task_id`
is the durable identity.

## Extending the Pipeline

To add a new pipeline type, create a new `pipeline_version` value (e.g., `v1`)
and document its agent steps and artifact paths in this file and in
[../docs/task-schema.md](../docs/task-schema.md). Do not mutate existing
pipeline versions after tasks are in flight.
