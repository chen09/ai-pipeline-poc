# AI Pipeline POC

> **🤖 如何开启一个新的 Agent 对话？**
> 每次在这个项目中新开 Cursor Agent 对话时，请直接复制并发送以下这句话：
> 
> ```text
> 当你开始一个新任务时，你必须（MUST）主动阅读 docs/HANDOFF.md 和 PLAN.md 来获取现状和下一步目标。不要去瞎猜项目背景。
> ```

Local-first, multi-agent AI development pipeline. See [PLAN.md](PLAN.md) for the full design document.

**Project root**: `/Volumes/WDC2T/Project/ai-pipeline-poc/`

## Architecture (Current / Phase 6E+)

Nine Docker services, all data bind-mounted into `./data/`:

| Service           | Port (localhost) | Purpose                                 |
| ----------------- | ---------------- | --------------------------------------- |
| `postgres`        | 5432             | n8n / langfuse / litellm metadata       |
| `redis`           | 6379             | n8n BullMQ queue + langfuse events      |
| `clickhouse`      | 8123 / 9000      | Langfuse OLAP traces                    |
| `minio`           | 9090 / 9091      | Langfuse blob storage (S3-compatible)   |
| `n8n-main`        | 5678             | Workflow editor + scheduler             |
| `n8n-worker` (x2) | —                | Queue-mode executors                    |
| `litellm`         | 4000             | LLM gateway (routing + fallback)        |
| `langfuse-web`    | 3000             | Observability UI                        |
| `langfuse-worker` | —                | Background ingestion for langfuse       |

Execution path for coding tasks:

- `n8n Implementation Agent` -> `agent/jobs` request -> `Local Runner` -> `OpenClaw/cursor_agent` adapter -> `agent/jobs` result
- Local Runner acts as the local execution control plane; OpenClaw/cursor_agent is the default backend adapter.

## Prerequisites

- Docker Desktop (macOS)
- ~4 GB free RAM, ~5 GB free disk
- API keys (can be added later, not required for bootstrap):
  - `DEEPSEEK_API_KEY`
  - `MINIMAX_API_KEY` and `MINIMAX_GROUP_ID`

## Quick Start

```bash
./scripts/bootstrap.sh        # generate .env with random secrets (idempotent)
# Edit .env to add your LLM API keys (optional for Phase 0)
make up                       # pull images + start all services
make ps                       # verify all services are healthy
```

Then open:

- n8n:      <http://localhost:5678>  (user: `admin`, password: see `.env`)
- Langfuse: <http://localhost:3000>
- LiteLLM:  <http://localhost:4000/health/liveliness>
- MinIO:    <http://localhost:9091>  (user: see `.env` `MINIO_ROOT_USER`)

## Seed vs Runtime (Important)

- `fixtures/seed_tasks/` is the **Git-managed source-of-truth** for sample tasks.
- `agent/inbox/` is **runtime queue state** and is intentionally ignored by Git.
- To load seeds into the runtime inbox:

```bash
./scripts/load_seed_tasks.sh
```

If `agent/inbox/` already contains task files and you want to replace them:

```bash
./scripts/load_seed_tasks.sh --force
```

## Local Runner Tuning (Phase 6E+)

For long-running Cursor/OpenClaw jobs, the local runner and the Implementation Agent
now use heartbeat + watchdog controls through environment variables:

- `LOCAL_RUNNER_HEARTBEAT_MS` (default: `15000`)
  - Runner-side heartbeat interval.
  - While a job is `running`, the runner refreshes `agent/jobs/{task_id}.status.json`
    `updated_at` at this interval.
- `LOCAL_RUNNER_STALE_RUNNING_SECONDS` (default: `900`)
  - Workflow-side stale-running watchdog threshold.
  - If a job remains `running` without heartbeat progress beyond this threshold,
    the Implementation Agent writes timeout `result.json` / `status.json` to force deterministic convergence.

Recommended tuning:

- Stable local environment: keep defaults.
- Slow model/tool path: increase `LOCAL_RUNNER_STALE_RUNNING_SECONDS` first.
- High observability needs: decrease `LOCAL_RUNNER_HEARTBEAT_MS` moderately (avoid too frequent file writes).

`runner/runner.js` also normalizes terminal `changed_files` to project-relative
paths under `target-repos/...` for consistent downstream aggregation.

## Directory Layout

```
.
├── agent/              # task/artifact state-machine
│   ├── jobs/           # Local Runner request/status/result artifacts
│   └── comms/          # temporary agent discussion notes, not runtime input
├── fixtures/           # git-managed seed task inputs
├── data/               # persistent storage for all services (gitignored)
├── docker-compose.yml
├── docs/               # reports, schemas, conventions
├── errors/             # execution blockers
├── litellm/config.yaml # LLM routing + fallback + budget
├── Makefile            # up / down / ps / logs / reset
├── n8n-workflows/      # exported workflow JSONs (Phase 2+)
├── PLAN.md             # full design document
├── runner/             # Local Implementation Runner and backend adapters
├── scripts/            # bootstrap, init SQL, seed helpers
└── target-repos/       # repos under test (Phase 3+)
```

## Common Commands

```bash
make up                # docker compose up -d
make down              # docker compose down (keeps data/)
make ps                # service status
make logs s=n8n-main   # tail a specific service
make reset             # stop + wipe data/ (interactive confirm)
```

## Phase Roadmap

The current baseline is Phase 6E: Local Runner owns implementation state through `agent/jobs/`, while OpenClaw/cursor_agent is the default backend adapter. See [docs/HANDOFF.md](docs/HANDOFF.md) and [docs/phase-6e-report.md](docs/phase-6e-report.md) for current status. Backend A/B is preparation-only until a second real backend and non-interactive execution path are confirmed.

## Integration Notes for Tutorials

- n8n + OpenClaw Gateway joint-debugging runbook:
  - [docs/n8n-openclaw-integration-runbook.md](docs/n8n-openclaw-integration-runbook.md)
