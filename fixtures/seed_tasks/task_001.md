---
task_id: 01JSP4YA9D0000000000000001
title: Add health endpoint
created_at: 2026-04-25T05:13:33Z
status: pending
current_step: planning
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 3
target_repo: target-repos/api
priority: normal
---

## Goal

Add a `GET /health` endpoint to the Express API that returns:

```json
{ "status": "ok" }
```

## Constraints

- Keep the implementation minimal and idiomatic for the existing Express app.
- Do not change unrelated routes or middleware.
- Add or update tests only as needed to verify the endpoint.

## Done-when

- `GET /health` responds with HTTP 200.
- The JSON response body is exactly `{ "status": "ok" }`.
- The target repo test suite passes.
