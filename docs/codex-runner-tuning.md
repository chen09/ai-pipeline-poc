# Codex Runner Tuning Notes (Reliability / Latency / Cost)

**Date**: 2026-04-30  
**Scope**: Practical tuning for `runner/adapters/codex.js` while preserving current stable execution pattern and guardrails.

## Baseline invariants to preserve

- Keep default backend flow unchanged (`request -> runner -> result`).
- Keep non-destructive repo handling policy unchanged.
- Keep completion-artifact contract unchanged.
- Keep timeout authority from job request (`timeout_seconds`) as the base budget.

## Newly supported optional knobs

The following environment variables are optional and default-safe:

- `CODEX_TIMEOUT_BUFFER_SECONDS` (default `0`)
  - Adds extra kill-buffer to the adapter process timeout.
  - Effective timeout: `(request.timeout_seconds + buffer) * 1000`.
- `CODEX_PLAN_MAX_CHARS` (default `0`, disabled)
  - Truncates `plan.md` content injected into Codex prompt.
- `CODEX_TEST_PLAN_MAX_CHARS` (default `0`, disabled)
  - Truncates `test-plan.md` content injected into Codex prompt.
- `CODEX_STDERR_TAIL_CHARS` (default `4000`)
  - Controls max stderr tail stored in adapter failure details.

## Recommended starting profile

Use this profile for practical cost/latency control with low stability risk:

```bash
export CODEX_TIMEOUT_BUFFER_SECONDS=30
export CODEX_PLAN_MAX_CHARS=12000
export CODEX_TEST_PLAN_MAX_CHARS=12000
export CODEX_STDERR_TAIL_CHARS=6000
```

## Why these knobs

- **Reliability**: timeout buffer reduces false timeout at boundary conditions.
- **Latency/Cost**: prompt truncation reduces large-context overhead on repetitive long artifacts.
- **Debuggability**: adjustable stderr tail keeps enough diagnostics without bloating artifacts.

## Rollout guidance

1. Apply knobs only in controlled smoke runs first.
2. Compare with baseline on:
   - terminal completion rate,
   - end-to-end latency,
   - retry count,
   - error classification.
3. If regression appears, set the knob back to default immediately.
