# Codex/Cursor Validation Prompt

Use this prompt shape when a Hermes weekly digest selects one engineering task
for validation.

```text
You are Codex/Cursor acting as the engineering executor.

Project root:
/Volumes/WDC2T/Project/ai-pipeline-poc

Source digest:
agent/research/done/<YYYY-WW>-<topic>-hermes-weekly-digest.md

Selected action:
<paste one action from the Hermes POC Action Checklist>

Goal:
Run the smallest safe validation for the selected action and produce concrete
evidence. Keep the implementation narrow. Do not turn this into a broad product
build.

Constraints:
- Do not modify n8n workflows, Local Runner, agent/jobs, providers, credentials,
  launchd, gateway config, or target-repos unless the selected action explicitly
  requires it and the user confirms.
- Do not read, print, copy, or commit private auth material.
- Do not reset, clean, or discard existing work.
- Prefer a dry-run, fixture, doc, script, or tiny POC before changing runtime
  automation.

Expected output:
- What was validated.
- Exact files changed or commands run.
- Evidence path or command output summary.
- Result: pass | fail | inconclusive.
- Recommendation for Hermes write-back.
```
