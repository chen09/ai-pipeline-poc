# POC: Multi-Agent AI Development Pipeline (Local-First)

> **Audience**: Cursor Agent executing this plan autonomously, on the user's macOS machine.
> **Project root**: `/Volumes/WDC2T/Project/ai-pipeline-poc/`
> **Execution rule**: Do phases IN ORDER. Each TODO is atomic. Verify Exit Criteria before moving to next phase. If blocked, write `errors/phase-<N>-step-<X>.md` and halt.

---

## 0. Context

**Problem we're solving**
Before committing to expensive models (Codex/Claude) or a complex multi-agent framework, we need a reliable engineering foundation:
- Can we run N tasks end-to-end with zero loss, zero duplication?
- Can we recover from crashes without manual cleanup?
- Can we observe cost and latency per step to guide future spending?

**User's existing assets** (do NOT re-install)
- macOS + Docker Desktop
- Cursor IDE
- n8n (previously run via Docker on Mac)
- OpenClaw (installed)
- LLM APIs: DeepSeek, Minimax coding plan
- Optional future: Hermes Agent, Codex, Claude Code

**Philosophy**
- n8n = orchestrator only (no in-flow agent loops)
- LiteLLM = single LLM ingress (provider routing + fallback + budget)
- Langfuse = single observability backend
- File system = state machine (markdown files with YAML frontmatter)
- OpenClaw = execution layer (Cursor stays as the human-facing IDE)

---

## 1. POC Success Criteria

The POC is DONE when ALL of these are true:

- [ ] 10 seed tasks flow end-to-end, 100% reach `done/` OR `error/` (no stuck items)
- [ ] 0 duplicate executions across 3 consecutive `docker compose restart` cycles
- [ ] Every LLM call visible in Langfuse with latency + token cost
- [ ] Killing one `n8n-worker` mid-flight does not corrupt or lose a task
- [ ] Model fallback works: revoking DeepSeek key → Minimax takes over automatically
- [ ] Total POC run cost ≤ $2 on real APIs

---

## 2. Architecture

```
Host: macOS
/Volumes/WDC2T/Project/ai-pipeline-poc/
├── docker-compose.yml         # all services
├── .env                       # secrets (gitignored)
├── litellm/config.yaml        # model routing + fallback + langfuse callback
├── agent/                     # bind-mounted into n8n workers as /files/agent
│   ├── inbox/      pending tasks
│   ├── running/    claimed, with .lock file
│   ├── plan/       generated plans
│   ├── build/      build in progress
│   ├── test/       test logs
│   ├── review/     review notes
│   ├── done/       success
│   └── error/      failure (with retry history)
├── target-repos/              # the code we operate on
│   └── api/                   # POC single repo (Node.js)
├── n8n-workflows/             # exported workflow JSONs (version-controlled)
├── scripts/                   # helper shell scripts
├── docs/                      # schema, conventions
└── errors/                    # agent-execution blockers (if any)

Docker services:
├── postgres        n8n + langfuse + litellm databases
├── redis           n8n queue + langfuse events
├── clickhouse      langfuse traces (OLAP)
├── minio           langfuse blob storage (S3-compatible, required by Langfuse v3)
├── n8n-main        editor, scheduler (port 5678)
├── n8n-worker x2   executors
├── litellm         LLM gateway (port 4000)
├── langfuse-web    UI (port 3000)
└── langfuse-worker background ingestion
```

**Happy-path flow per task**

```
inbox/task_X.md
  → n8n Schedule (5s) sees file
  → atomic `mv` to running/ + create .lock
  → POST /v1/chat → litellm (plan-model)  [traced to langfuse]
  → write plan/task_X.md
  → openclaw applies plan in target-repos/api
  → npm test → test/task_X.log
  → POST /v1/chat → litellm (review-model) [traced to langfuse]
  → if review == pass → done/
  → if retry < 3 → re-queue (inbox/) with retry_count++
  → else → error/
```

---

## 3. Component Inventory

| Layer | Tool | Port | Purpose |
|---|---|---|---|
| Orchestrator | n8n (queue mode) | 5678 | Workflow control |
| Execution | OpenClaw CLI | — | Agent loop |
| LLM Gateway | LiteLLM Proxy | 4000 | Routing, fallback, budget |
| Observability | Langfuse | 3000 | Tracing, cost, eval |
| State DB | Postgres 16 | 5432 | n8n + langfuse + litellm metadata |
| Queue/Cache | Redis 7 | 6379 | n8n BullMQ, langfuse events |
| Trace Store | ClickHouse 24 | 8123 | Langfuse traces |
| Blob Store | MinIO (S3) | 9090 | Langfuse event/media/export payloads |
| IDE | Cursor | — | Human multi-repo editor |

---

## 4. Phased Execution

### Phase 0 — Bootstrap Infrastructure (Est: 45–60 min)

**Goal**: Stand up all infra services locally; they all respond to healthchecks.

#### P0.1 Create project skeleton
- [ ] `cd /Volumes/WDC2T/Project/ai-pipeline-poc`
- [ ] `git init`
- [ ] Create `.gitignore` with: `.env`, `data/`, `*.lock`, `target-repos/*/node_modules`, `errors/`, `.DS_Store`
- [ ] Create empty dirs: `litellm/`, `agent/`, `target-repos/`, `n8n-workflows/`, `scripts/`, `docs/`, `errors/`

#### P0.2 Generate secrets to `.env`
- [ ] Populate `.env` using these commands (run one by one, collect into file):
  ```bash
  echo "POSTGRES_PASSWORD=$(openssl rand -base64 16)"
  echo "REDIS_PASSWORD=$(openssl rand -base64 16)"
  echo "N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)"
  echo "N8N_BASIC_AUTH_USER=admin"
  echo "N8N_BASIC_AUTH_PASSWORD=$(openssl rand -base64 16)"
  echo "LITELLM_MASTER_KEY=sk-$(openssl rand -hex 24)"
  echo "LANGFUSE_SALT=$(openssl rand -base64 16)"
  echo "LANGFUSE_ENCRYPTION_KEY=$(openssl rand -hex 32)"
  echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
  echo "CLICKHOUSE_PASSWORD=$(openssl rand -base64 16)"
  ```
- [ ] Ask the user (DO NOT invent) to provide real values for:
  - `DEEPSEEK_API_KEY=`
  - `MINIMAX_API_KEY=`
  - `MINIMAX_GROUP_ID=`
- [ ] `chmod 600 .env`

#### P0.3 Write `docker-compose.yml`
- [ ] Create `docker-compose.yml` with the following services on a shared bridge network `agent-net`:
  - `postgres` (image: `postgres:16-alpine`, volume `pg_data`, databases: `n8n`, `langfuse`)
  - `redis` (image: `redis:7-alpine`, requirepass from `.env`)
  - `clickhouse` (image: `clickhouse/clickhouse-server:24-alpine`, volume `ch_data`)
  - `n8n-main` (image: `n8nio/n8n:latest`):
    - env: `EXECUTIONS_MODE=queue`, Redis/Postgres vars, `N8N_ENCRYPTION_KEY`, basic auth
    - port `5678:5678`
    - bind mount `./agent:/files/agent`
  - `n8n-worker` (same image, `command: worker`, `deploy.replicas: 2` OR use `docker compose up --scale`, same volume mount)
  - `litellm` (image: `ghcr.io/berriai/litellm:main-stable`):
    - env: `LITELLM_MASTER_KEY`, `DATABASE_URL` to postgres, API keys
    - mount `./litellm/config.yaml:/app/config.yaml`
    - port `4000:4000`
  - `langfuse-web` (image: `langfuse/langfuse:3`):
    - env: `DATABASE_URL`, `REDIS_CONNECTION_STRING`, `CLICKHOUSE_URL`, secrets from `.env`
    - port `3000:3000`
  - `langfuse-worker` (image: `langfuse/langfuse-worker:3`, same env)
- [ ] All services use `restart: unless-stopped`
- [ ] Add healthchecks to `postgres`, `redis`, `clickhouse`, `n8n-main`, `litellm`, `langfuse-web`

#### P0.4 Write `litellm/config.yaml`
- [ ] Create minimal config with two providers under one logical name + fallback + langfuse callback:
  ```yaml
  model_list:
    - model_name: plan-model
      litellm_params:
        model: deepseek/deepseek-chat
        api_key: os.environ/DEEPSEEK_API_KEY
    - model_name: plan-model-backup
      litellm_params:
        model: openai/abab6.5s-chat
        api_base: https://api.minimax.chat/v1
        api_key: os.environ/MINIMAX_API_KEY
    - model_name: review-model
      litellm_params:
        model: deepseek/deepseek-reasoner
        api_key: os.environ/DEEPSEEK_API_KEY

  router_settings:
    fallbacks:
      - plan-model: ["plan-model-backup"]
    num_retries: 2
    timeout: 60

  litellm_settings:
    success_callback: ["langfuse"]
    failure_callback: ["langfuse"]
    drop_params: true
    max_budget: 2.0            # USD cap for POC
    budget_duration: 24h

  general_settings:
    master_key: os.environ/LITELLM_MASTER_KEY
  ```
- [ ] Add env vars `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST=http://langfuse-web:3000` to litellm service (fill in after P4.1).

#### P0.5 Boot and verify
- [ ] `docker compose up -d`
- [ ] Wait 60s
- [ ] Run each check, record to `docs/bootstrap-report.md`:
  - [ ] `curl -f http://localhost:5678/healthz` → 200
  - [ ] `curl -f http://localhost:4000/health/liveliness` → 200
  - [ ] `curl -f http://localhost:3000/api/public/health` → 200
  - [ ] `docker compose ps` all `healthy`
- [ ] Commit: `git add -A && git commit -m "phase 0: infra bootstrap"`

**Exit Criteria**: all services healthy, `docs/bootstrap-report.md` written.

---

### Phase 1 — Task File State Machine (Est: 30 min)

**Goal**: Fix the contract that all downstream components must honor.

#### P1.1 Create state directories
- [ ] `mkdir -p agent/{inbox,running,plan,build,test,review,done,error}`
- [ ] Create `agent/README.md` explaining each folder

#### P1.2 Define task schema
- [ ] Create `docs/task-schema.md` with:
  - YAML frontmatter fields: `task_id` (ULID), `title`, `created_at`, `status`, `retry_count`, `max_retry`, `target_repo`, `priority`
  - Valid `status` values (state machine): `pending | planning | plan_ready | building | testing | reviewing | done | error`
  - State transition diagram (ASCII)
  - Required body sections: `## Goal`, `## Constraints`, `## Done-when`

#### P1.3 Define idempotency rules
- [ ] Create `docs/idempotency.md`:
  - Claim = atomic `mv inbox/X.md running/X.md` (single filesystem op on same device)
  - After successful claim, write `running/X.md.lock` with worker id + timestamp + ttl (10min)
  - Stale lock recovery: a cron workflow unlocks locks older than 10min and moves file back to `inbox/`
  - Step idempotency: every LiteLLM call carries `X-Idempotency-Key: {task_id}-{step}-{retry_count}` (stored as metadata in Langfuse)
  - Downstream writes are idempotent by path (e.g., `plan/X.md`) — worker refuses to overwrite unless retry_count increased

#### P1.4 Create 3 seed tasks
- [ ] `agent/inbox/task_001.md` — "Add /health endpoint returning {status: 'ok'} to Express server" (easy)
- [ ] `agent/inbox/task_002.md` — "Fix the typo in README.md heading" (trivial)
- [ ] `agent/inbox/task_003.md` — "Implement impossible requirement: reverse time" (designed to fail, validates error path)

**Exit Criteria**: `ls agent/inbox/` shows 3 files, each with valid frontmatter per schema.

---

### Phase 2 — n8n Plan Workflow (Est: 90 min)

**Goal**: n8n polls inbox, atomically claims tasks, produces plans via LiteLLM, writes to `plan/`.

#### P2.1 Configure n8n
- [ ] Open `http://localhost:5678`, log in with basic auth from `.env`
- [ ] Create HTTP Header Auth credential `LiteLLM Proxy`:
  - Header: `Authorization`
  - Value: `Bearer {LITELLM_MASTER_KEY}`

#### P2.2 Build workflow "Agent — Plan"
- [ ] Nodes (in order):
  1. **Schedule Trigger** every 5s
  2. **Execute Command**: `ls /files/agent/inbox/*.md 2>/dev/null | head -1 | tr -d "\n"`
  3. **IF** stdout non-empty
  4. **Execute Command** (atomic claim): single shell line that does
     - `mv <path> /files/agent/running/` AND
     - `echo "{worker_id}|{ISO-now}|600" > /files/agent/running/X.md.lock`
     - must abort if `mv` fails (another worker won)
  5. **Read Binary File**: `running/X.md`
  6. **Code (JS)** node: parse YAML frontmatter (use `js-yaml` if available, else regex), extract `task_id`, `title`, body
  7. **HTTP Request** to `http://litellm:4000/v1/chat/completions`:
     - Body: `{ "model": "plan-model", "messages": [system, user], "metadata": { "trace_id": "{task_id}-plan", "user_id": "poc" } }`
     - Auth: credential from P2.1
  8. **Code** node: extract assistant message, wrap in markdown, update frontmatter with `status: plan_ready`
  9. **Write Binary File**: `/files/agent/plan/{task_id}.md`
  10. **Error branch**: on any node failure, move file to `error/` and append error to frontmatter + increment `retry_count`

#### P2.3 Export and version the workflow
- [ ] From n8n UI, export JSON to `n8n-workflows/agent-plan.json`
- [ ] Commit

#### P2.4 Smoke test
- [ ] Activate workflow, wait 30s
- [ ] Verify:
  - [ ] `ls agent/inbox/` empty
  - [ ] `ls agent/plan/` has 3 files
  - [ ] Langfuse UI (login http://localhost:3000) shows traces (may need P4.1 first for keys; if so, proceed and come back to verify here)

**Exit Criteria**: 3 plans generated, workflow exported to `n8n-workflows/`.

---

### Phase 3 — Build + Test Nodes (Est: 2h)

**Goal**: Take a plan, apply changes, run tests, route success/failure.

#### P3.1 Create target repo
- [ ] `cd target-repos && mkdir api && cd api`
- [ ] `npm init -y`
- [ ] Install: `npm i express && npm i -D vitest supertest`
- [ ] Create minimal `src/index.js` with an Express app (no /health yet — that's task_001)
- [ ] Create `tests/smoke.test.js` that boots the app and asserts basic routing
- [ ] Add `"test": "vitest run"` to `package.json`
- [ ] `git init && git add -A && git commit -m "initial api repo"`

#### P3.2 Build workflow "Agent — Build"
- [ ] Nodes:
  1. Schedule Trigger every 5s
  2. Execute Command: look for `plan/*.md` whose corresponding `build/*.md` does NOT exist
  3. Atomic claim (same pattern as P2.2)
  4. Execute Command (BUILD via OpenClaw):
     - Preferred: `openclaw run --repo ../target-repos/api --plan {plan_path} --output {build_log_path} --branch task/{task_id}`
     - Fallback if OpenClaw not scriptable headless: run a shell script `scripts/apply_plan.sh` that calls `claude --print` or `cursor-agent` CLI (document whichever works) OR instructs the user to apply manually and marks status `needs_human`
  5. Capture: exit code, diff summary, any error output
  6. Commit changes in target repo to branch `task/{task_id}`
  7. Write `build/{task_id}.md` with: plan ref, diff path, commit sha, exit code
  8. On success → next workflow (test) picks up; on failure → retry/error logic

#### P3.3 Test workflow "Agent — Test"
- [ ] Nodes:
  1. Schedule Trigger every 5s
  2. Look for `build/*.md` whose `test/*.log` doesn't exist
  3. Execute Command: `cd ../target-repos/api && npm test 2>&1 > /files/agent/test/{task_id}.log; echo $?`
  4. If exit code 0 → enqueue review step (write `review-queue/{task_id}.md`)
  5. If exit code != 0 AND `retry_count < max_retry`:
     - Increment `retry_count` in frontmatter
     - Reset branch in target repo (`git checkout main`, delete feature branch)
     - Move plan file + build log to archive; re-queue task to `inbox/` with hint appended
  6. If exhausted retries → move to `error/` with `reason: test_failed_after_N_retries`

#### P3.4 Exit Criteria
- [ ] task_001 reaches `done/` after plan→build→test pass
- [ ] task_003 ends in `error/` after 3 retries
- [ ] No intermediate folder has a file older than 15 minutes

---

### Phase 4 — Review Node + Full Observability (Est: 90 min)

**Goal**: Close the decision loop. Make cost/latency visible.

#### P4.1 Langfuse bootstrap
- [ ] Open `http://localhost:3000`, sign up first admin, create project `ai-pipeline-poc`
- [ ] Copy `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` to `.env`
- [ ] `docker compose up -d --force-recreate litellm` (reload env)
- [ ] Trigger any plan workflow → verify traces appear

#### P4.2 Review workflow "Agent — Review"
- [ ] Nodes:
  1. Schedule every 5s over `review-queue/`
  2. Gather: plan content, diff (from commit sha in build log), test log
  3. HTTP Request to LiteLLM `review-model`:
     - System prompt: "You are a senior code reviewer. Output JSON with fields: verdict (pass|needs_rework|critical), reasoning, suggestions"
     - Body: full context
     - metadata.trace_id: `{task_id}-review`
  4. Parse JSON. Route:
     - `pass` → move all artifacts to `done/{task_id}/`
     - `needs_rework` → re-queue to `inbox/` with reviewer hint appended to frontmatter; `retry_count++`
     - `critical` → `error/` immediately, include reviewer reasoning

#### P4.3 Observability dashboard
- [ ] In Langfuse, create custom dashboard `poc-ops`:
  - Traces per hour
  - Cost per task (group by trace_id prefix)
  - p50/p95 latency per step (`plan`, `review`)
  - Error rate per model
- [ ] Confirm trace hierarchy per task:
  - trace: `{task_id}`
    - generation: `plan`
    - generation: `review`
  - (build/test are spans emitted via HTTP from n8n Code nodes; if complex, can skip to Phase 5 and add later)

#### P4.4 Budget guardrail
- [ ] Verify LiteLLM daily budget (config `max_budget: 2.0`) works: make a bad request loop, confirm 429 after limit
- [ ] n8n Error Trigger: on 429 from litellm → route task to `error/` with reason `budget_exceeded`, halt workflows

**Exit Criteria**: end-to-end task with 4 traced steps in Langfuse; budget cap proven.

---

### Phase 5 — POC Validation (Est: 60 min)

#### P5.1 Bulk generation
- [ ] Create `scripts/seed_tasks.sh` that emits 10 tasks with mixed difficulty into `inbox/`:
  - 4 trivial (pass first try)
  - 3 medium (likely pass after 1 retry)
  - 2 hard (expected to fail)
  - 1 malformed frontmatter (should go to error immediately)

#### P5.2 Run
- [ ] Execute seed script
- [ ] Watch `agent/done/` and `agent/error/` fill up
- [ ] Stop condition: all 10 tasks resolved OR 30 min elapsed

#### P5.3 Chaos test
- [ ] Mid-run: `docker restart ai-pipeline-poc-n8n-worker-1`
- [ ] Verify: no task duplicated, no task lost (≤ 1 min delay acceptable)

#### P5.4 Fallback test
- [ ] Set `DEEPSEEK_API_KEY=invalid` in `.env`, `docker compose up -d --force-recreate litellm`
- [ ] Drop 2 fresh tasks into `inbox/`
- [ ] Verify they complete via Minimax (check Langfuse trace `model_name: plan-model-backup`)
- [ ] Restore key

#### P5.5 Final report
- [ ] Write `REPORT.md` at project root with:
  - Success rate (target ≥ 80%)
  - Avg cost per task (USD, from Langfuse)
  - Avg latency per step
  - Top 3 failure modes
  - Recommendation for Phase 6+: pick ONE of (multi-repo expansion | Hermes integration | Codex integration)

**Exit Criteria**: `REPORT.md` committed; all containers still healthy; no orphaned tasks.

---

## 5. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Docker volume perf on Mac (many small files) | Med | Med | Keep `agent/` on SSD; avoid binary data in queue mode (n8n known limitation) |
| Stale locks dead-lock tasks | Med | Med | 10-min TTL recovery workflow (add in Phase 3) |
| LLM cost blowout | Med | High | LiteLLM `max_budget: 2.0` + per-call max_tokens + Langfuse alerts |
| Secrets in git | Low | High | `.env` in `.gitignore`; `chmod 600 .env`; pre-commit hook to grep secrets (optional) |
| OpenClaw security incidents (public CVEs reported) | Known | Med | Never expose ports; run local-only; check latest patches before Phase 3 |
| n8n filesystem binary + queue mode conflict | High (official warning) | Low (we store md, not binary) | OK for POC; switch to MinIO/S3 if ever needed |

---

## 6. Out of Scope (Explicit)

- Multi-repo fanout (src/bff/api/batch) — Phase 6+
- Codex / Claude Code integration — Phase 7+
- Hermes Agent integration — Phase 8+
- Cloud deployment / webhook bridges — later
- Agent-to-agent negotiation — later
- Eval framework (LLM-as-judge scoring on a golden set) — later
- Human-in-the-loop approval UI — later

---

## 7. Decisions Locked In

- `n8n` is **orchestrator only**; no in-flow agent loops
- **File-based** task queue; Postgres only for n8n internals, not for task state
- **LiteLLM** is the **only** LLM ingress; no direct provider calls from workflows
- **Langfuse** is the **only** observability backend (for POC)
- **Local-only**; no tunneling
- **OpenClaw** for execution in Phase 3; other agents deferred

---

## 8. Rules for the Executing Cursor Agent

1. Read phases sequentially; do NOT jump ahead.
2. Before starting a phase, verify previous phase's Exit Criteria.
3. Commit after each phase: `git commit -m "phase <N>: <short>"`
4. If any step fails:
   - Write `errors/phase-<N>-step-<X>.md` with: what was attempted, actual output, hypothesis, next attempt plan
   - Retry once automatically; if still failing → HALT and wait for human
5. NEVER commit `.env` or anything with secrets. Pre-check with `git diff --cached | grep -iE "key|secret|password"` before every commit.
6. ASK the human before:
   - Buying/enabling a paid API not in the current plan
   - Installing a tool not listed in Component Inventory
   - Making architectural changes that contradict Section 7
7. When in doubt about model choice: default to cheaper (DeepSeek > Minimax). Do NOT switch to Claude/Codex without explicit approval.
8. Halt and request human help if:
   - Docker service stays `unhealthy` after 3 restart attempts
   - Langfuse has 0 traces after Phase 2 completion
   - Unexpected cost spike > $1 in any single hour

---

## 9. Post-POC Roadmap (not part of this plan)

- **Phase 6**: Extend to 4-repo fanout; introduce task dependency graph
- **Phase 7**: Route complex tasks to Codex / Claude Code selectively; A/B vs. DeepSeek
- **Phase 8**: Integrate Hermes Agent for long-memory and skill accumulation
- **Phase 9**: Move orchestration to cloud n8n, keep execution local via webhook bridge
- **Phase 10**: Build an eval set + automated regression against plan quality

---

END OF PLAN
