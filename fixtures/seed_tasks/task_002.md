---
task_id: 01JSP4YA9D0000000000000002
title: Fix README heading typo
created_at: 2026-04-25T05:13:33Z
status: pending
current_step: planning
pipeline: code-default
pipeline_version: v0.1
revision: 0
retry_count: 0
max_retry: 3
target_repo: target-repos/api
priority: low
---

## Goal

Fix the typo in the target repository `README.md` heading.

## Constraints

- Only modify the typo in the heading.
- Do not rewrite the rest of the README.
- If the README does not exist yet, create the smallest README needed to make
  the target repository understandable.

## Done-when

- The README heading is correctly spelled.
- No unrelated README content is changed.
- The target repo test suite still passes.
