# AI Pipeline POC

Local-first, multi-agent AI development pipeline. See [PLAN.md](PLAN.md) for the full design document.

**Project root**: `/Volumes/WDC2T/Project/ai-pipeline-poc/`

## Architecture (Phase 0)

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

## Directory Layout

```
.
├── agent/              # task state-machine (Phase 1+)
├── data/               # persistent storage for all services (gitignored)
├── docker-compose.yml
├── docs/               # reports, schemas, conventions
├── errors/             # execution blockers
├── litellm/config.yaml # LLM routing + fallback + budget
├── Makefile            # up / down / ps / logs / reset
├── n8n-workflows/      # exported workflow JSONs (Phase 2+)
├── PLAN.md             # full design document
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

See [PLAN.md](PLAN.md) for detailed phase breakdown. Phase 0 (this phase) only brings up infrastructure. No agent workflows are active yet.
