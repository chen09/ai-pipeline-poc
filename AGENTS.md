# Agent Operating Guide

This repository is often resumed by local coding agents.

Before doing substantial work, after reading this guide, read these files in order:

1. `docs/HANDOFF.md`
2. `PLAN.md`
3. `README.md`

`docs/HANDOFF.md` is the single source of truth for current state, baseline, continuity notes, and active execution assumptions. Do not create or maintain another handoff file at the repo root. Append future continuity checkpoints to `docs/HANDOFF.md`.

## Project Scope

- Project root: `/Volumes/WDC2T/Project/ai-pipeline-poc`
- Treat implementation state as owned through `agent/jobs/` artifacts unless `docs/HANDOFF.md` says otherwise.
- Backend tracks, provider assumptions, and active execution baseline must be read from `docs/HANDOFF.md`.

## Safety Rules

- The working tree may be intentionally dirty. Do not reset, checkout, clean, or discard files unless the user explicitly asks for that operation.
- Do not reset or clean `target-repos/api` without explicit user confirmation.
- Archive runtime or forensic artifacts before cleanup.
- Never directly delete forensic/runtime state unless the user explicitly approves deletion.
- Do not read, print, summarize, or expose secrets from `.env`, token files, OpenClaw credential files, or provider config files.
- Before broad filesystem changes, core config changes, credential/provider changes, or batch operations, ask for confirmation.

## Runtime Notes

- OpenClaw CLI may not be on Codex's `PATH`.
- Known local OpenClaw CLI path:
  `/Users/chenxin/.nvm/versions/node/v24.14.0/bin/openclaw`
- WeCom/OpenClaw status and plugin checks may require running outside the Codex filesystem sandbox because they touch `~/.openclaw`.

## Common Commands

```bash
make ps
make health
node runner/runner.js --once
./scripts/load_seed_tasks.sh
