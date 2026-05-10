# 2026-W20 Validation Checklist (Reusable Write-Back Template)

## Run Metadata
- run_id:
- date_utc:
- operator_or_agent:
- benchmark_id:
- parallelism_level:
- cohort_name:
- cohort_task_ids:
- environment_notes:

## Scope/Guardrail Confirmation
- [ ] No provider/credential changes
- [ ] No topology changes
- [ ] `agent/jobs` remained source of truth
- [ ] WeCom used only for notification/HITL

## Artifact Completeness (Terminal Proof)
For each terminal `task_id`:
- [ ] `agent/jobs/{task_id}.result.json` present and terminal
- [ ] `build/{task_id}.build.md` present
- [ ] `test/{task_id}.test-run.md` present with test execution evidence
- [ ] `review/{task_id}.review.md` present with explicit verdict
- [ ] Task frontmatter status matches terminal verdict

## Determinism Checks
- [ ] No lost tasks (inbox/running/done/error accounting reconciled)
- [ ] No duplicate active execution for same `task_id`
- [ ] Retry behavior stayed within policy
- [ ] Stale heartbeat handling behaved as designed

## Metrics (Fill Values)
- success_rate:
- duplicate_rate:
- p50_latency_s:
- p95_latency_s:
- retry_rate:
- manual_intervention_count:
- estimated_cost:

## HITL / Policy Events
| timestamp_utc | task_id | action | approval_required | decision | decision_latency_s | notes |
|---|---|---|---|---|---:|---|

## Risk Incidents
| severity | trigger | task_id | impact | mitigation | owner | status |
|---|---|---|---|---|---|---|

## Threshold Evaluation
- [ ] success_rate >= target
- [ ] duplicate_rate <= target
- [ ] p95_latency_s <= target
- [ ] retry_rate <= target
- [ ] manual_intervention_count <= target
- [ ] estimated_cost <= target
- [ ] stuck_tasks == 0

## Evidence Links
- logs:
- artifacts:
- dashboards/traces:
- incident notes:

## Assumptions and Missing Evidence
- Assumption(s):
- Missing evidence:
- Confidence level (high/medium/low):

## Go / No-Go Summary
- Decision: GO / HOLD / ROLLBACK
- Why:
- Next action:
- Next owner:
