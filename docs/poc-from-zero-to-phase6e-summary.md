# From Zero to Phase 6E: Multi-Agent AI Pipeline POC Journey

## Executive Summary

This POC started as a conversation-driven architecture sketch and ended as a local-first, observable, restart-tolerant multi-agent engineering pipeline. The system now has a verified execution baseline: n8n orchestrates, LiteLLM routes model calls, Langfuse records traces/cost/latency, Local Runner owns implementation job state, and OpenClaw/Hermes can bridge to Cursor/Codex CLI backends.

## Historical Milestones

1. Initial architecture imagination: `docs/images/poc-history-01-initial-chatgpt-architecture.png`.
2. Test-plan / TDD-like design aligned with emerging research and best practice: `docs/images/poc-history-02-test-plan-research-alignment.png`.
3. Later GPT-5.5 generated architecture reference: `docs/images/poc-history-03-gpt55-reference-architecture.png`.
4. Final corrected architecture diagram: `docs/images/poc-final-architecture-2026-05-05.png`.

## What Changed During the POC

- The early design assumed visible n8n agent-like diagrams, but the implemented system used n8n as an orchestrator and kept complex logic in workflow scripts.
- The pipeline evolved into a TDD-like multi-role loop: Planning -> Test Generation -> Implementation -> Execution & Analysis -> Review & Optimization.
- OpenClaw Gateway initially looked like the state source, but Phase 6D proved that stable status/result RPC was not available. Phase 6E moved the state source into `agent/jobs/` through Local Runner.
- Cursor/OpenClaw became the default implementation backend. Codex and Hermes became validated or partially validated alternative backend tracks.
- Langfuse was repaired and canonicalized so traces, cost, latency, and token usage now land in one observable place.

## Final Architecture Roles

- n8n: orchestrator, scheduler, router, and UI workflow surface. It should not be the agent brain.
- LiteLLM: single model ingress and fallback layer.
- Langfuse: trace, cost, latency, and token observability.
- Local Runner: execution control plane and state root for implementation jobs.
- OpenClaw: gateway/router that exposes local tools and CLI backends to agents.
- Hermes: second orchestration/agent shell path, useful for tool routing and MCP integrations.
- Cursor/Codex: actual CLI execution backends for ask, plan, code/agent workflows, and image/tool extensions.
- Filesystem artifacts: durable state, audit trail, retry/recovery substrate.
- Docs/skills/MCP: project memory and tool surface. Obsidian was not used in the final loop, but remains a natural extension for knowledge memory and study vaults.

## Verification Snapshot

- 10-task re-baseline batch converged to terminal states with no stuck tasks.
- Three consecutive Docker Compose restarts recovered cleanly.
- Langfuse cost/latency rollup completed from ClickHouse source data.
- CLI matrix reached 8/8 for ask/plan/agent across OpenClaw/Hermes calling Cursor/Codex.
- Codex image generation bridge was validated; image-generation workflows are now part of the broader tool capability.

## Cost and Effort Notes

- Cursor Premium: about USD 200/month.
- Codex Plus: about USD 20/month.
- MiniMax Starter/coding plan: about RMB 29/month.
- DeepSeek API key available and usable through LiteLLM.
- Human time: about one week, roughly 4-5 hours/day of AI-assisted iteration.

## Current Conclusion

The POC can stop here as a validated engineering baseline. It is not yet production-grade, and the n8n canvas is not yet as visually maintainable as desired, but the core thesis is proven: a general engineering task can be decomposed into multi-role agents, controlled through local artifacts, executed through pluggable CLI backends, and verified through tests, restart behavior, and observability data.
