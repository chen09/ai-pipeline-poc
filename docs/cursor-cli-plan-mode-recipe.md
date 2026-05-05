# Cursor CLI Plan Mode Recipe

> Portable reference for any future agent that needs a reliable headless Cursor plan
> mode call. Verified on 2026-05-04 against `cursor-agent 2026.05.01-eea359f`.
> Companion record: `docs/HANDOFF.md` Sections 13, 14, 15.

## 1. TL;DR

- `cursor-agent --print --mode plan --output-format text` → empty stdout. **Do not use.**
- `cursor-agent --print --mode plan --output-format json` → `result` is progress
  text only. **Do not use.**
- `cursor-agent --print --mode plan --output-format stream-json` → reliable.
  The final markdown plan rides inside a tool call event:

  ```jsonc
  {"type":"tool_call","subtype":"completed",
   "tool_call":{"createPlanToolCall":{"args":{
       "plan":"<full markdown>",
       "todos":[{"id":"...","content":"...","status":"TODO_STATUS_PENDING",...}],
       "overview":"...","name":"...","phases":[]
   }}}}
  ```

- The canonical wrapper that handles invocation + extraction in one call lives at
  `agent-cli-matrix-tests/scripts/cursor_plan_run.sh`. Read its `--help` or
  `agent-cli-matrix-tests/scripts/README.md` before reimplementing the contract.

## 2. Why the obvious paths fail

`--mode plan` does not stream the final plan as assistant text. The model emits
the plan via a structured tool call so the IDE can render it into the plan UI
panel. In stream-json the event is visible; in `text` and `json` formats it is
silently dropped. The `result` event of `--output-format json` only carries the
final progress narration ("正在查看 ...", "已确认 ...").

OpenClaw's `cursor-agent` plugin
(`~/.openclaw/extensions/cursor-agent/dist/index.js`) does parse the stream
internally, but its event normalizers (`extractToolName`, `extractToolArgs`,
`extractToolResult`) only recognize `args.path / pattern / globPattern / command`
and `result / output / content`. They do not pull `args.plan` or `args.todos`,
so the value the plugin returns to the calling agent (`buildConclusion` uses the
last assistant text only) does not contain the plan body. The plugin also injects
a hardcoded "CRITICAL INSTRUCTION ... do not summarize ... say only: 'Cursor
Agent analysis completed, results shown above'" footer, which prevents the
calling agent from reconstructing the plan even if it tried.

Hermes does not ship a Cursor-specific plugin. It calls `cursor-agent` via its
generic `terminal` tool, so the same caveats apply: stream-json is the only
channel that surfaces the plan body.

## 3. Recommended primitives

### 3.1 Direct call (any shell, any agent that can run a command)

```bash
agent-cli-matrix-tests/scripts/cursor_plan_run.sh \
  --prompt-file <PROMPT_FILE> \
  --workspace <WORKSPACE_DIR> \
  --out-dir <OUT_DIR> \
  --label <LABEL> \
  --ask-fallback
```

Outputs in `<OUT_DIR>`:

| File | Purpose |
|------|---------|
| `<LABEL>.stream.ndjson` | Raw cursor-agent stream-json log. Source of truth. |
| `<LABEL>.plan.md` | Extracted markdown plan (no frontmatter). |
| `<LABEL>.todos.json` | One JSON line per `createPlanToolCall.completed` event, containing the structured todo array (`id`, `content`, `status`, `dependencies`, ...). |
| `<LABEL>.meta.txt` | `label`, `mode`, `workspace`, ts_start/ts_end, `exit_code`, `elapsed_sec`, `stream_bytes`, `stream_lines`, `session_id`, `model`, `createPlanCount`, `interactionQueryCount`, `resultIsError`, `plan_extracted`, optional `askfallback_*`. |
| `<LABEL>.stderr.log` | Captured stderr. |
| `<LABEL>.askfallback.md` | Only when `--ask-fallback` was used **and** plan extraction was empty. |

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | Plan markdown extracted (or ask-fallback succeeded with markdown). |
| 2 | Cursor exited 0 but no `createPlanToolCall.completed` was emitted, and ask fallback (if any) also empty. |
| 3 | `cursor-agent` itself exited non-zero. |
| 4 | Argument / dependency error (missing `jq`, missing prompt file, ...). |

### 3.2 Pure extractor (when you already have a stream-json file)

```bash
agent-cli-matrix-tests/scripts/cursor_plan_extract.sh \
  <STREAM_NDJSON_PATH> \
  --out <PLAN_MD> \
  --with-todos <TODOS_JSON>
```

Same exit code conventions. The script is intentionally tiny so it can be
embedded into other automation (n8n Code node, runner adapter, etc.).

### 3.3 Equivalent inline jq (if you don't want the wrapper)

```bash
jq -r 'select(.type=="tool_call" and .subtype=="completed" and (.tool_call.createPlanToolCall != null)) | .tool_call.createPlanToolCall.args.plan' <STREAM_NDJSON>
jq -c 'select(.type=="tool_call" and .subtype=="completed" and (.tool_call.createPlanToolCall != null)) | .tool_call.createPlanToolCall.args.todos' <STREAM_NDJSON>
```

## 4. Prompt template

Use this skeleton when generating a plan via Cursor. The recipe is robust because
plan mode in headless does not block on clarifying questions: the model
auto-skips ambiguous points and proceeds with reasonable defaults, so the plan
is always produced as long as the prompt names the target file(s) and the
acceptance criteria.

```
You are in plan mode. Produce a final, executable Markdown plan now.
Target file: <ABSOLUTE_OR_REPO_RELATIVE_PATH>
Target test: <ABSOLUTE_OR_REPO_RELATIVE_PATH>

Task: <one-paragraph spec with explicit inputs/outputs/edge cases>.
Do not modify other files.

Output sections:
1. Goal
2. Files to change
3. Step-by-step implementation
4. Test plan (commands)
5. Risks and rollback
6. End the plan with the exact line: <UNIQUE_SENTINEL>
```

The sentinel is optional but strongly recommended — it lets downstream consumers
verify the captured plan is the final one and not a partial flush.

## 5. Caller integrations

### 5.1 OpenClaw `--agent dev` (verified — Section 15 / experiment G3)

The OpenClaw `cursor-agent` plugin does not surface the plan body, so do **not**
ask `dev` agent to call `cursor_agent`. Instead have the dev agent shell out to
the wrapper:

```text
Use your shell tool (NOT cursor_agent) to invoke
agent-cli-matrix-tests/scripts/cursor_plan_run.sh with:
  --prompt-file /tmp/<task>_inner.txt
  --workspace /Volumes/WDC2T/Project
  --out-dir /tmp/<task>_plan
  --label <task>
  --ask-fallback

Then read /tmp/<task>_plan/<task>.plan.md and reply with the plan body wrapped
between fences <<<OPENCLAW_DEV_FINAL_BEGIN>>> ... <<<OPENCLAW_DEV_FINAL_END>>>.
```

End-to-end latency observed: ~360 s (dev agent reasoning + shell + cursor-agent
~85 s + read file + final reply). Wrapper-internal `cursor-agent` call is ~46 s.
The dev agent overhead is the bulk of the time; do not reuse this path inside
short-deadline n8n nodes.

### 5.2 Hermes `-z PROMPT` (verified — Section 15 / experiment G2)

Hermes can either call the wrapper directly:

```bash
hermes -z "Run agent-cli-matrix-tests/scripts/cursor_plan_run.sh ... and reply with the plan body framed between <<<HERMES_CURSOR_FINAL_BEGIN>>> and <<<HERMES_CURSOR_FINAL_END>>>." \
       --accept-hooks
```

Or run `cursor-agent` + inline `jq` itself, since Hermes does not have a Cursor
plugin to lose information through. End-to-end latency observed: ~103 s.

### 5.3 n8n / runner adapter

The local runner (`runner/runner.js`) and n8n nodes can call
`cursor_plan_run.sh` from a shell step and persist the resulting `plan.md` and
`todos.json` as part of the job artifacts. Plan mode is read-only, so it is safe
to run alongside other adapters without coordination.

## 6. Boundary conditions and known caveats

- The event name `createPlanToolCall` is part of Cursor's private stream
  protocol. If a future cursor-agent version renames it, the extractor must be
  updated. Pin cursor-agent to the verified version (`2026.05.01-eea359f`)
  for production-style automation.
- `--mode plan` is read-only by design. The model may issue `read`, `glob`,
  `grep`, and similar reconnaissance tool calls but will **not** edit files.
- `~/.cursor/plans/<slug>_<hash>.plan.md` is written only by the interactive
  Cursor IDE. Headless `--print` runs do not populate this directory; do not
  poll it for headless results.
- `~/.cursor/chats/<workspace_hash>/<chat_uuid>/store.db` is a SQLite KV with
  `blobs(id, data BLOB)` and `meta(key, value)`. The format is private; do not
  parse it.
- Headless plan mode auto-acknowledges the `interaction_query/createPlanRequestQuery`
  approval round-trip. No manual confirmation is required.
- `--stream-partial-output` is compatible — same `createPlanToolCall.completed`
  event, plus extra `assistant` text deltas for live UI rendering.
- Headless plan mode does not block on clarifying questions. Ambiguous prompts
  produce assistant chatter like "用户跳过了范围题" but the plan still emits.
- Latency budget: ~85–150 s per direct cursor-agent plan call in this
  environment; +200–300 s when wrapped by an LLM-driven caller (OpenClaw dev,
  hermes oneshot). Treat plan as a slow-but-reliable primitive.

## 7. Future plugin-side improvement (optional)

A clean fix in the OpenClaw cursor-agent plugin would be:

1. Extend `extractToolArgs` / `extractToolResult` to recognize
   `createPlanToolCall.args.plan` and emit it as a dedicated `plan_md` event.
2. Have `buildConclusion` prefer `plan_md` when present, falling back to the
   last assistant text otherwise.
3. Drop or relax the hardcoded "CRITICAL INSTRUCTION ... do not summarize"
   trailer so the calling agent can include the plan body in its own answer.

These are user-level config edits to a third-party plugin; they require explicit
user approval and would be overwritten on plugin update. For this project the
shell-bridge wrapper is the preferred contract because it is owned by us and
unaffected by plugin upgrades.
