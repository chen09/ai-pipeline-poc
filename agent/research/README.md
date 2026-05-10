# Research Digest Pipeline

`agent/research/` is a side-branch protocol for research digests. It is not the
coding implementation pipeline.

The current coding pipeline remains owned by `agent/jobs/`, the Local Runner,
and n8n implementation workflows. Do not place research digest inputs, status
files, or outputs in `agent/jobs/`.

## Roles

- OpenClaw owns discovery: daily reports, web search, GitHub activity, papers,
  API changes, demos, and community discussions.
- Hermes owns digestion and landing: weekly synthesis across multiple OpenClaw
  reports, deduplication, grouping, priority judgment, Obsidian note generation,
  POC action checklist generation, execution prompts for Codex or Cursor, and
  conclusion write-back after validation.
- Codex and Cursor own engineering execution and verification when a digest item
  becomes an implementation task.
- WeCom is only a notification and human command surface. It is not a reliable
  machine queue and should not be treated as the source of truth.

In short:

- OpenClaw is the external-world radar.
- Hermes is the personal knowledge base and project manager.
- Codex/Cursor are engineering executors.

## Version 1 Scope

Version 1 is a manual file protocol only.

- No n8n workflow integration.
- No Local Runner integration.
- No automatic scheduling or polling.
- No provider, credential, launchd, or gateway changes.

The intended operating rhythm is a small number of high-quality daily discovery
reports plus one weekly Hermes review. This is steadier than adding many cron
jobs before the research loop is understood.

After this protocol works cleanly for three manual weekly reviews, consider
whether to add n8n or Local Runner automation.

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

Manual input queue for OpenClaw daily discovery reports.

Filename:

```text
agent/research/inbox/{date}-{topic}-openclaw.md
```

Example:

```text
agent/research/inbox/2026-05-10-digital-human-openclaw.md
```

Multiple daily reports can feed one weekly Hermes review.

### `processing/`

Manual status files for Hermes digest work in progress.

Filename:

```text
agent/research/processing/{date}-{topic}.status.json
```

For weekly synthesis, use:

```text
agent/research/processing/{week}-{topic}.status.json
```

Suggested minimal fields:

```json
{
  "state": "processing",
  "owner": "hermes",
  "inputs": [
    "agent/research/inbox/2026-05-10-digital-human-openclaw.md",
    "agent/research/inbox/2026-05-11-digital-human-openclaw.md"
  ],
  "updated_at": "2026-05-10T00:00:00Z",
  "notes": "Deduplicating daily reports and grouping weekly priorities."
}
```

### `done/`

Terminal output directory for Hermes digests.

Filename:

```text
agent/research/done/{date}-{topic}-hermes-digest.md
```

For weekly synthesis, use:

```text
agent/research/done/{week}-{topic}-hermes-weekly-digest.md
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

1. OpenClaw writes daily discovery reports to `inbox/`.
2. Hermes reads several OpenClaw reports during a weekly review.
3. Hermes creates or updates a matching status file in `processing/`.
4. Hermes writes the weekly digest, Obsidian-ready notes, POC action checklist,
   and Codex/Cursor execution prompts to `done/`.
5. A human reviews the digest and chooses which execution prompt should become a
   Codex/Cursor task.
6. Codex/Cursor executes the selected validation task.
7. Hermes writes back the validation conclusion and next step in the next digest
   or a follow-up note.
8. Old artifacts can be moved to `archive/` when they are no longer active.

## Hermes Digest Shape

Each digest should include:

- One-sentence conclusion.
- Deduplicated key findings.
- Obsidian-ready note summary.
- POC action checklist.
- Worth trying.
- Watching.
- Not investing now.
- Execution prompt for Codex/Cursor.
- Validation conclusion and next-step write-back, when a prior action was run.
- Sources and uncertainty notes.
