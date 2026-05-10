# W20 Productization Controls (Local Multi-Agent Pipeline)

## Scope and Guardrails
- Baseline architecture remains: n8n supervisor workflows + specialist agents + Local Runner ownership of `agent/jobs/*`.
- No changes to provider credentials, gateway wiring, launchd, deployment topology, or state ownership contracts.
- WeCom remains notification / HITL channel only, never queue/state source.

## 1) Tool Risk Matrix

| Risk Tier | Tool / Action Type | Example in This Repo | Primary Failure Modes | Required Controls |
|---|---|---|---|---|
| Low | Read-only inspection | Read task artifacts, list directories, parse logs | Stale interpretation, noisy diagnostics | Schema validation on parsed output; structured logging |
| Low | Deterministic transforms | Markdown/json template generation, report synthesis | Formatting drift, missing fields | JSON schema lint + checklist validation |
| Medium | Non-destructive writes | Create/update `docs/*`, `agent/research/*`, non-runtime planning artifacts | Incomplete docs, wrong assumptions, inconsistent policy | Peer/eval gate against template + assumptions block |
| Medium | Runtime task transitions | Move task states in controlled workflow paths | Race conditions, duplicate handling | Idempotency keys, lock TTL, transition assertions |
| High | Code mutation in target repos | Implementation agent writes to `target-repos/*` | Incorrect code, regressions, partial completion | Test gate, terminal proof, retry budget, review verdict |
| High | External side effects | WeCom sends, webhook calls, destructive commands | Misdelivery, accidental impact, leakage | Tool-level HITL approval, timeout, explicit fallback |
| High | Control-plane/runtime config edits | n8n workflow rewires, runner contract changes | Pipeline instability, hidden coupling | Mandatory approval + rollback plan + bounded canary |

## 2) HITL Policy Table (Tool-Level)

| Tool / Action | Approval Required | Timeout | Fallback Path | Required Audit Fields |
|---|---:|---|---|---|
| Read-only artifact inspection | N | 30s | Retry once, then continue with stale-warning | run_id, task_id, action, timestamp, result_hash |
| Docs/research artifact write (`docs/research/*`, `agent/research/*`) | N | 60s | Write to `agent/research/processing/` staging + flag | run_id, file_path, diff_summary, assumptions |
| Runtime state transition (`inbox→running`, reroute) | N (if policy-compliant) | 30s | Keep current state, emit `transition_blocked` event | run_id, task_id, from_state, to_state, reason |
| Target repo mutation (`target-repos/*`) | Y (for first run of new policy/model/route) | 10m | Abort mutation, emit `needs_human` + preserve artifacts | run_id, task_id, repo, branch, change_scope, approver |
| External delivery (WeCom/webhook) | Y (except pre-approved heartbeat notices) | 2m | Queue notification as pending, no send | run_id, channel, recipient, payload_class, approver |
| Workflow/runner contract change | Y | 15m | Reject change; open tracked review item | run_id, component, risk_tier, rollback_plan, approver |
| Destructive cleanup/archive-delete | Y (always) | 15m | Archive-only path; no hard delete | run_id, target_paths, archive_manifest, approver |

### Approval Semantics
- Approval token must bind to: `run_id + task_id + action + expiry`.
- Expired approval is treated as denied.
- Denied/timeout must route to deterministic safe state (`waiting`/`needs_human`), never silent continuation.

## 3) Escalation Triggers and Ownership

| Trigger | Condition | Auto-Action | Escalate To | SLA |
|---|---|---|---|---|
| Stale heartbeat | `status.updated_at` exceeds stale threshold while `running` | Mark timeout candidate; freeze retries | Supervisor operator | 15 min |
| Retry exhaustion | `retry_count >= max_retry` | Route to `error/` with evidence bundle | Reviewer + operator | 15 min |
| Schema validation failure | Any artifact/tool output fails schema | Block downstream step; create incident note | Workflow owner | 30 min |
| Missing terminal artifact | Done/error reached without required proof artifacts | Reclassify as non-terminal; reopen verification | Execution owner | 30 min |
| Duplicate execution signal | Same `task_id` observed in parallel active runs | Pause fanout lane; lock task for inspection | Runtime owner | 15 min |
| Unsafe side-effect request | High-risk action without valid approval token | Deny action; emit policy incident | Human approver | Immediate |

## 4) Completion / Terminal Proof Contract
A run is terminal only if all are present:
1. `agent/jobs/{task_id}.result.json` with terminal status.
2. `build/{task_id}.build.md` exists and references result summary.
3. `test/{task_id}.test-run.md` exists with executed test evidence.
4. `review/{task_id}.review.md` exists with explicit verdict.
5. Final state in task frontmatter matches terminal route (`done` or `error`).

If any proof is missing, terminal state must be revoked and routed to verification.

## 5) Eval Gate for Agent-Change Control
Any change to prompts/models/routes/policies must pass a fixed regression cohort before broad rollout:
- Cohort: fixed task IDs (see benchmark plan JSON).
- Required checks: success rate threshold, duplicate rate ceiling, p95 latency ceiling, manual intervention cap.
- Gate outcome is binary: `pass` to proceed, otherwise rollback/hold.

## 6) Assumptions and Known Gaps
- Assumes existing runner heartbeat and stale-running watchdog are active as documented in Phase 6E materials.
- Cost metric is estimated unless provider-side token billing is complete for every step.
- HITL channel transport reliability (e.g., WeCom latency variance) should be measured during benchmark runs.
