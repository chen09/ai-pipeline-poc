# Hermes Weekly Research Digest

Week: 2026-W20
Topic: local-multi-agent-productization
Owner: Hermes
Inputs:
- agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md

## One-Sentence Conclusion
For this project’s current baseline, the highest-ROI path is to keep the existing supervisor-plus-specialist architecture, add stricter tool-level governance and eval gates, and validate scale limits with a small, measured fanout experiment instead of introducing another orchestration stack now.

## Obsidian-Ready Note
- Thesis: multi-agent productization fails mostly on operations (handoff/state/observability), not prompt quality.
- Current fit: project already has strong file-based state + local runner ownership (`agent/jobs`) + n8n orchestration, matching top 2026 patterns.
- Immediate upgrades:
  1) tool-level HITL for high-risk operations,
  2) eval-gated change control for prompts/model/routes,
  3) explicit circuit-breakers and escalation.
- Scale policy: treat agent count as a controlled variable; benchmark determinism/cost vs throughput before adding parallelism.
- Deferral: do not onboard heavy new control-plane/framework dependencies until current baseline metrics prove bottlenecks.

## Deduplicated Key Findings
1. Architecture convergence: supervisor-plus-specialist with explicit state/checkpoints is the strongest common pattern across LangGraph/CrewAI/AutoGen evidence.
2. HITL granularity matters: tool-level approval outperforms coarse workflow-level pausing for safety/latency tradeoffs.
3. Reliability failures are systemic: silent partial completion, state blindness, and tool-output corruption dominate incidents.
4. Durable state should be artifact-first: file/state-machine handoff beats session-memory dependence for multi-session continuity.
5. Observability + eval loops are mandatory: full causal traces and continuous eval gating are repeatedly identified as production prerequisites.
6. Cost/determinism limit: adding agents introduces coordination tax; spawn rate/agent count must be benchmarked, not assumed.

## Productization Priorities
P0 (this week)
- Add policy matrix for tool-level approval in n8n (high-risk tool calls require human approval + timeout + fallback route).
- Define and enforce completion contract for all implementation jobs (heartbeat freshness, terminal proof, timeout semantics).
- Add minimal eval gate for agent changes (prompt/model/router changes require passing a fixed regression task set).

P1 (next)
- Run bounded fanout benchmark to measure throughput vs determinism vs cost at different parallelism levels.
- Add circuit-breaker rules: repeated retries, stale heartbeats, or schema-invalid tool outputs trigger escalation.

P2 (later, conditional)
- Evaluate external control-plane options (e.g., OpenHands) only if internal governance/visibility is insufficient at >3-5 active agents.

## POC Action Checklist
- [ ] Create `docs/research/w20-productization-controls.md` with:
  - risk tiers per tool/action
  - HITL rule table (require_approval, timeout, fallback)
  - escalation triggers and owner
- [ ] Add a small regression suite descriptor under `agent/research/` for “agent-change eval gate” (fixed task IDs, pass criteria, max runtime).
- [ ] Define benchmark matrix (parallelism = 1/2/4, same task mix) and output schema (success rate, p50/p95 latency, retry count, manual interventions).
- [ ] Add a “terminal proof checklist” template for run validation write-back (artifacts present, tests executed, review verdict, final status).

## Worth Trying
- Deterministic routing for common transitions + LLM adjudication only for ambiguous cases.
- Strict schema validation on every tool output before downstream handoff.
- Lightweight approval channels for high-risk operations only (avoid alert fatigue).

## Watching
- OpenHands control-plane maturity post-1.7.0 (fleet governance, audit, RBAC).
- Nx-style self-healing CI loop patterns for future CI-integrated autonomous fixes.
- Model-license volatility in 2026 that may impact commercial use assumptions.

## Not Investing Now
- Replatforming orchestration to a new framework before measuring current baseline bottlenecks.
- Large decentralized swarm topologies without strong containment/eval infrastructure.
- Broad tool access expansion per agent role without role-scoped controls.

## Execution Prompt For Codex/Cursor
Goal: validate productization controls on current local runner baseline without changing providers/credentials/gateway/launchd/n8n topology.

Scope constraints:
- Do NOT modify provider configs, credentials, launchd, gateway wiring, Local Runner core architecture, n8n deployment topology, or `agent/jobs` contract ownership.
- Treat WeCom only as notification/human command channel, never as queue state.

Tasks:
1) Write `docs/research/w20-productization-controls.md` containing:
   - Tool Risk Matrix (low/medium/high) for this repo’s current workflow actions.
   - HITL Policy Table: tool/action, approval required (Y/N), timeout, fallback path, audit fields.
   - Escalation Triggers: stale heartbeat, retry exhaustion, schema validation failure, missing terminal artifact.
2) Produce `agent/research/processing/2026-W20-benchmark-plan.json` with benchmark design:
   - task set definition
   - parallelism levels [1,2,4]
   - metrics schema: success_rate, duplicate_rate, p50_latency_s, p95_latency_s, retry_rate, manual_intervention_count, estimated_cost
   - acceptance thresholds (explicit)
3) Create `agent/research/done/2026-W20-validation-checklist.md` as a reusable write-back template:
   - run metadata
   - artifact completeness checks
   - determinism checks
   - risk incidents
   - go/no-go summary

Validation:
- Ensure all new files are lint-clean markdown/json.
- Provide a short summary of assumptions and any missing evidence.

Output:
- Return only changed file paths + a 10-line summary.

## Validation Write-Back
Recommended write-back fields for each validation run:
- run_id, date_utc, operator/agent
- task cohort and parallelism level
- completion outcomes (done/error/stuck)
- duplicate/loss evidence
- heartbeat and timeout incidents
- HITL interventions (count, type, decision latency)
- test pass/fail and review verdict coverage
- known gaps + next action owner

## Sources And Uncertainty
Primary source used:
- OpenClaw report: `agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md`

Confidence by theme:
- High: supervisor-plus-specialist convergence; need for observability/evals; systemic handoff failure modes.
- Medium: claimed quantitative rates from secondary reports (e.g., recovery percentages, adoption shares) due to limited reproducible benchmark context.
- Medium: new platform/control-plane maturity claims (recent releases may shift quickly).

Uncertainty notes:
- Several figures in source are directional and may come from vendor/practitioner publications rather than controlled, workload-matched comparisons.
- No project-specific A/B benchmark was provided in input; priority decisions here are evidence-weighted but should be validated via the bounded benchmark plan above.
