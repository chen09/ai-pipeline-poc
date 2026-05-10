# Research Mode Manual Runbook

This runbook is for manual research-only operation. It is not the coding
implementation pipeline.

## Purpose

Use Research Mode when the goal is to understand a topic, compare options, write
article material, or decide whether a future validation task is worth doing.

Research Mode should not modify:

- n8n workflows
- Local Runner logic
- `agent/jobs/`
- provider, credential, gateway, or launchd config
- target repo fixtures

## Roles

- OpenClaw: external-world radar. It searches public sources and writes a daily
  discovery report to `agent/research/inbox/`.
- Hermes: synthesis and project-management layer. It reads OpenClaw reports,
  deduplicates findings, groups priorities, and writes digests to
  `agent/research/done/`.
- WeCom: notification and human command surface. It is not machine queue state.
- Codex/Cursor: optional validation executors. Use them only after a human
  explicitly chooses Validation Mode.

## Manual Flow

1. Choose one narrow research topic.
2. Ask OpenClaw to run the discovery prompt:
   `agent/research/templates/openclaw-daily-discovery-prompt.md`
3. Confirm OpenClaw wrote:
   `agent/research/inbox/{date}-{topic}-openclaw.md`
4. Ask Hermes to run the synthesis prompt:
   `agent/research/templates/hermes-weekly-synthesis-prompt.md`
5. Confirm Hermes wrote:
   `agent/research/processing/{week}-{topic}.status.json`
   and `agent/research/done/{week}-{topic}-hermes-weekly-digest.md`.
6. Send a readable Chinese WeCom summary using:
   `agent/research/templates/wecom-digest-notification-cn.md`
7. Record notable decisions and failures in:
   `docs/wechat-article/research-digest-side-branch-notes.md`

## Roundup Flow

Use a roundup when several research runs already exist and the goal is a weekly
or stage-level synthesis.

Inputs:

- selected `agent/research/inbox/*-openclaw.md` reports
- selected `agent/research/done/*-hermes-*.md` digests
- any related `agent/research/processing/*.json` status files

Outputs:

- `agent/research/done/{week}-research-mode-roundup.md`
- optional Chinese WeCom summary

The roundup should answer:

- What did we learn across topics?
- What is worth continuing to research?
- What should stay in observation mode?
- What should not enter Validation Mode yet?
- What human decision is needed next?

## Research Mode vs Validation Mode

Research Mode:

- public investigation
- synthesis
- prioritization
- Chinese WeCom summary
- no engineering experiment required

Validation Mode:

- runs local or cloud experiments
- touches development environments
- may use Codex/Cursor
- requires explicit human approval

Do not move from Research Mode to Validation Mode automatically.
