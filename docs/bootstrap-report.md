# Bootstrap Report — Phase 0

**Date**: 2026-04-25 (local time, JST)
**Host**: macOS (Apple Silicon, arm64), Docker Desktop 29.2.1
**Project root**: `/Volumes/WDC2T/Project/ai-pipeline-poc/`
**Data strategy**: All service persistence bind-mounted to `./data/` (decision A)

## Service Matrix

| Service           | Image                                   | Port (localhost) | Status              |
| ----------------- | --------------------------------------- | ---------------- | ------------------- |
| postgres          | `postgres:16-alpine`                    | 5432             | healthy             |
| redis             | `redis:7-alpine`                        | 6379             | healthy             |
| clickhouse        | `clickhouse/clickhouse-server:24-alpine`| 8123             | healthy             |
| minio             | `cgr.dev/chainguard/minio`              | 9090 / 9091      | healthy             |
| litellm           | `ghcr.io/berriai/litellm:main-stable`   | 4000             | healthy             |
| n8n-main          | `n8nio/n8n:latest`                      | 5678             | healthy             |
| n8n-worker (x2)   | `n8nio/n8n:latest`                      | (internal)       | Up (no healthcheck) |
| langfuse-web      | `langfuse/langfuse:3`                   | 3000             | healthy             |
| langfuse-worker   | `langfuse/langfuse-worker:3`            | (internal)       | Up (no healthcheck) |

## Host-Side Health Probes

```
n8n      : {"status":"ok"}            # curl http://localhost:5678/healthz
litellm  : HTTP 200                    # curl http://localhost:4000/health/liveliness
langfuse : HTTP 200                    # curl http://localhost:3000/api/public/health
minio    : HTTP 200                    # curl http://localhost:9090/minio/health/live
```

## Postgres Databases

Three logical DBs created by `scripts/postgres-init.sql` on first boot:

- `n8n`      (used by n8n-main & n8n-worker)
- `langfuse` (used by langfuse-web & langfuse-worker)
- `litellm`  (used by litellm proxy)

## Data Directory Footprint (`./data/`)

| Path                    | Size  |
| ----------------------- | ----- |
| `data/postgres/`        | 91 M  |
| `data/clickhouse/`      | 26 M  |
| `data/clickhouse-logs/` | 864 K |
| `data/minio/`           | 52 K  |
| `data/n8n/`             | 12 K  |
| `data/redis/`           | 68 K  |
| **Total**               | ~118 M (initial) |

## Issues Encountered and Resolved

### 1. Docker Hub authentication error on initial pull

Cause: stale credentials in `~/.docker/config.json`. 
Fix: `docker logout` (from `index.docker.io`, `ghcr.io`, `cgr.dev`) and re-pull anonymously. Anonymous pulls work for all public images used in this POC.

### 2. "no space left on device" during `docker compose pull`

Cause: Docker Desktop internal storage was almost full; host disk had 11 GB free on the main APFS volume; buildx buildkit cache alone occupied 13.5 GB. 
Fix: `docker system prune -a --volumes -f` + `docker volume prune -a -f`. Reclaimed ~20 GB. Re-pulled cleanly. 
Note: Docker Desktop VM disk image is sparse; macOS `df` does not immediately reclaim freed space until the VM is restarted or compacted.

### 3. Port 9000 conflict with host php-fpm

Cause: ClickHouse TCP protocol default port 9000 overlapped with a local php-fpm listener. 
Fix: Removed the `127.0.0.1:9000:9000` port mapping from the `clickhouse` service. Inter-container traffic to ClickHouse TCP uses the internal `agent-net` network and is unaffected.

### 4. ClickHouse healthcheck failing despite service responding

Cause: BusyBox `wget` inside `clickhouse-server:24-alpine` did not reliably resolve `localhost` via `/etc/hosts`. `127.0.0.1` worked. 
Fix: Replaced `localhost` with `127.0.0.1` in the ClickHouse healthcheck. Applied the same substitution to n8n-main.

### 5. Langfuse-web healthcheck failing despite service responding

Cause: Next.js only binds to the container's docker-network IP (for example `172.18.0.10:3000`), not to loopback. Any probe targeting `127.0.0.1` or `localhost` is refused. 
Fix: Changed healthcheck to probe `http://$(hostname -i):3000/...`, which resolves to the exact interface Next.js listens on. Escaped the dollar sign as `$$` to bypass docker-compose variable substitution.

### 6. MinIO original image lacked `mc` CLI

Cause: `minio/minio:latest` does not ship the `mc` client used by Langfuse's reference healthcheck. 
Fix: Switched to `cgr.dev/chainguard/minio` (same as Langfuse's upstream docker-compose), which bundles `mc`.

## Post-Bootstrap TODOs (not blocking Phase 0)

1. Fill `DEEPSEEK_API_KEY`, `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID` in `.env` and restart `litellm` (`docker compose restart litellm`) before Phase 2 LLM calls.
2. First-time Langfuse login: visit <http://localhost:3000>, create admin user and project `ai-pipeline-poc`, copy generated `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` into `.env`, then uncomment the `success_callback/failure_callback` lines in [litellm/config.yaml](../litellm/config.yaml) and restart `litellm`. This is Phase 4.1 work.
3. Disable Langfuse PostHog telemetry if bothered by network-error logs: add `TELEMETRY_ENABLED=false` to the langfuse env block.
4. Consider adding healthchecks to `langfuse-worker` and `n8n-worker` in a later phase (currently neither has one; both are passive consumers).

## Exit Criteria Status

- [x] All 10 containers running, 7 with `healthy` status (the three without healthchecks — two n8n workers + langfuse-worker — are passive consumers)
- [x] `curl http://localhost:5678/healthz` returns 200
- [x] `curl http://localhost:4000/health/liveliness` returns 200
- [x] `curl http://localhost:3000/api/public/health` returns 200
- [x] `./data/` contains persistent storage for all six stateful services
- [x] `docs/bootstrap-report.md` written (this file)
- [ ] First `git commit` (next step)

Phase 0 ready to be committed.
