# Phase 6E Hermes Adapter Validation Plan (Minimal, Non-Destructive)

**Date**: 2026-04-30  
**Scope**: Validate the Hermes adapter path as a contract-level stub under Local Runner.  
**Goal**: Prove request -> runner claim -> terminal artifacts works reliably for `backend=hermes` without changing target repo code.

## Why this minimal plan

- Current `runner/adapters/hermes.js` is intentionally a stub and returns deterministic `failed` with `phase_6e_stub`.
- The highest-value validation now is not feature coding quality, but pipeline contract correctness and evidence completeness.
- This keeps the stable Phase 6B/6E baseline unchanged and avoids destructive operations.

## Validation entry conditions

- `runner/runner.js` and Local Runner artifact contract are already in use.
- `agent/jobs/` has no active `queued|claimed|running` rows for the chosen `task_id`.
- Reuse existing smoke plan references to avoid generating new planning artifacts:
  - `agent/plan/01PH6EIMPLSMOKE000000000001.plan.md`
  - `agent/test/01PH6EIMPLSMOKE000000000001.test-plan.md`

## Acceptance gates

1. **Request accepted**
   - `agent/jobs/<task_id>.request.json` exists and schema-required fields are present.
2. **Lifecycle progression**
   - `agent/jobs/<task_id>.status.json` reaches terminal state `failed` (expected for stub).
3. **Result artifact complete**
   - `agent/jobs/<task_id>.result.json` exists with:
     - `state: failed`
     - `summary: Hermes adapter is not implemented yet`
     - `error_message: not implemented`
     - `details.adapter: hermes`
     - `details.reason: phase_6e_stub`
4. **No target repo mutation**
   - `changed_files` is empty.
5. **Adapter log traceability**
   - `agent/jobs/<task_id>.logs/adapter.jsonl` exists and includes `job_claimed` and `job_finished`.

## Evidence artifacts

- `agent/jobs/<task_id>.request.json`
- `agent/jobs/<task_id>.status.json`
- `agent/jobs/<task_id>.result.json`
- `agent/jobs/<task_id>.logs/adapter.jsonl`

## Execution procedure

1. Create a unique task id for this run (example: `01PH6EHERMESVAL000000000001`).
2. Write a Hermes request JSON under `agent/jobs/` using existing plan/test references.
3. Run `node runner/runner.js --once`.
4. Inspect status/result/log artifacts.
5. Mark pass only if all acceptance gates pass.

## Out of scope

- Implementing real Hermes coding capability.
- Performance benchmarking against cursor/codex.
- Any cleanup/reset on `target-repos/api`.
