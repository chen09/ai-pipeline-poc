# Research Digest Pipeline

`agent/research/` is a side-branch protocol for research digests. It is not the
coding implementation pipeline.

The current coding pipeline remains owned by `agent/jobs/`, the Local Runner,
and n8n implementation workflows. Do not place research digest inputs, status
files, or outputs in `agent/jobs/`.

## Roles

- OpenClaw owns discovery: daily reports, web search, GitHub activity, papers,
  API changes, demos, and community discussions.
- Hermes owns digestion: deduplication, grouping, priority judgment, action
  checklist generation, and execution prompts for Codex or Cursor.
- WeCom is only a notification and human command surface. It is not a reliable
  machine queue and should not be treated as the source of truth.

## Version 1 Scope

Version 1 is a manual file protocol only.

- No n8n workflow integration.
- No Local Runner integration.
- No automatic scheduling or polling.
- No provider, credential, launchd, or gateway changes.

After this protocol works cleanly for three manual runs, consider whether to add
n8n or Local Runner automation.

## Directory Protocol

```text
agent/research/
├── inbox/
├── processing/
├── done/
├── archive/
└── examples/
```

### `inbox/`

Manual input queue for OpenClaw discovery reports.

Filename:

```text
agent/research/inbox/{date}-{topic}-openclaw.md
```

Example:

```text
agent/research/inbox/2026-05-10-digital-human-openclaw.md
```

### `processing/`

Manual status files for Hermes digest work in progress.

Filename:

```text
agent/research/processing/{date}-{topic}.status.json
```

Suggested minimal fields:

```json
{
  "state": "processing",
  "owner": "hermes",
  "input": "agent/research/inbox/2026-05-10-digital-human-openclaw.md",
  "updated_at": "2026-05-10T00:00:00Z",
  "notes": "Deduplicating sources and grouping findings."
}
```

### `done/`

Terminal output directory for Hermes digests.

Filename:

```text
agent/research/done/{date}-{topic}-hermes-digest.md
```

### `archive/`

Manual archive for old inputs, status files, and digests. Archive first when
cleaning historical research artifacts. Do not delete research artifacts unless
the user explicitly approves deletion.

### `examples/`

Fake examples that describe the expected shape of OpenClaw input and Hermes
digest output. Examples must not contain real private accounts, credentials, or
private source material.

## Expected Manual Flow

1. OpenClaw writes a daily discovery report to `inbox/`.
2. Hermes creates or updates a matching status file in `processing/`.
3. Hermes writes the final digest to `done/`.
4. A human reviews the digest and decides whether to turn the execution prompt
   into a Codex/Cursor task.
5. Old artifacts can be moved to `archive/` when they are no longer active.

## Hermes Digest Shape

Each digest should include:

- One-sentence conclusion.
- Deduplicated key findings.
- Worth trying.
- Watching.
- Not investing now.
- Execution prompt for Codex/Cursor.
- Sources and uncertainty notes.
