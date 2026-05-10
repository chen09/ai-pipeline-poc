# Research Inbox Writer

Restricted OpenClaw plugin for the research digest side branch.

It exposes one tool:

```text
research_inbox_write
```

The tool only writes Markdown reports under:

```text
/Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/inbox/
```

Allowed filenames must match:

```text
YYYY-MM-DD-topic-openclaw.md
```

The plugin deliberately does not expose shell execution, arbitrary file writes,
provider changes, or access to `agent/jobs/`.

## Installation Notes

This repository keeps the plugin source under:

```text
openclaw-plugins/research-inbox-writer/
```

The tested local OpenClaw installation used a copy at:

```text
~/.openclaw/extensions/research-inbox-writer/
```

The OpenClaw config also needs:

- `plugins.entries.research-inbox-writer.enabled: true`
- `plugins.entries.research-inbox-writer.config.projectRoot` pointing to this
  repo root
- `research_inbox_write` allowed by the OpenClaw tool policy
- the `research` agent allowed to use `research_inbox_write`

The global tool-policy entry is required when `tools.allow` is configured as an
explicit whitelist. Without it, agent-level `alsoAllow` cannot make the plugin
tool visible at runtime.

## Smoke Test

The validated smoke path was:

```text
openclaw agent --local --agent research --session-id research-inbox-writer-smoke-20260510-v5 --timeout 180 --message '<ask the agent to call research_inbox_write once>'
```

Expected result:

```text
agent/research/inbox/2026-05-10-plugin-smoke-openclaw.md
```
