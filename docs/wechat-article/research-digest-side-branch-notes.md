# Research Digest Side Branch Notes

Date: 2026-05-10
Branch: `research-digest-side-branch`

## Step 1: Separate the Work From the Existing Dirty Tree

The workspace already had unrelated WeChat article edits under
`docs/wechat-article/`. The first decision was to create a dedicated branch for
the research digest protocol and keep staging path-limited. This keeps the PR
reviewable and prevents article draft work from being mixed with protocol work.

Article angle: a useful local-agent workflow is not just "make files"; it is
also preserving the boundary between unrelated human work and agent-generated
changes.

## Step 2: Keep Research Outside the Coding Pipeline

The existing POC has a coding implementation pipeline where `agent/jobs/` is the
state source for Local Runner execution. The research digest task has a different
shape: OpenClaw discovers information, Hermes digests it, and a human decides
whether to turn it into a coding task later.

The protocol was therefore placed under `agent/research/`, not under
`agent/jobs/`. This avoids mixing "research input and judgment" with "execution
job state".

Article angle: the safest extension point is often a side branch with its own
artifact contract, not immediate integration into the main automation path.

## Step 3: Defer n8n and Local Runner Automation

The first version intentionally does not connect to n8n or Local Runner. The
missing evidence is not whether automation is possible; it is whether the manual
research digest loop is useful and stable across repeated runs.

The chosen rule is: run it manually three times, then decide whether automation
is worth the added operational surface.

Article angle: "manual first" is not a retreat from automation. It is how the
team learns the right queue shape, status fields, and failure modes before
turning them into machinery.

## Step 4: Treat WeCom as a Human Surface, Not a Queue

WeCom can notify people and let a human steer the next action, but it is not the
source of truth for machine state. The reliable state is the file protocol under
`agent/research/`.

Article angle: chat tools are useful for command and awareness, but machine
queues need durable state, predictable filenames, and inspectable artifacts.

## Step 5: Provide Examples Before Automation

The examples show both ends of the loop: an OpenClaw discovery report and a
Hermes digest. They use fake public-style content, not private sources or
credentials, so the protocol can be reviewed safely.

Article angle: examples are part of the interface. They reduce ambiguity for the
next agent more effectively than a prose-only README.

## Step 6: Clarify the Real Role Split

The better mental model is not "OpenClaw reports news, Hermes is another
agent." The stronger structure is:

- OpenClaw is the external-world radar.
- Hermes is the personal knowledge base and project manager.
- Codex/Cursor are engineering executors.

That means OpenClaw can run daily discovery across news, GitHub, papers, APIs,
and community discussions. Hermes should not merely summarize one report; it
should periodically synthesize multiple reports, remove duplicates, group themes,
choose priorities, create Obsidian-ready notes, create POC action lists, and
write execution prompts.

Article angle: the pipeline becomes useful when each agent has a different
operational posture. Radar, project manager, and executor are different roles.
Adding more cron jobs would be weaker than making this role split explicit.

## Step 7: Prefer Daily Discovery Plus Weekly Review

The target operating rhythm is small, high-quality OpenClaw daily reports and a
weekly Hermes review. The weekly review is where raw signals become project
direction: what to try, what to watch, what to ignore, and what to hand to
Codex/Cursor for verification.

After Codex/Cursor executes a selected validation task, Hermes should write back
the conclusion and the next step. That write-back closes the loop and prevents
research from becoming a pile of disconnected links.

Article angle: the important loop is not "search automatically." It is
"discover, synthesize, validate, write back." The write-back step is what turns
research into accumulated judgment.

## Step 8: Turn the Role Split Into Copyable Prompts

After the role split was clear, the next implementation step was to stop leaving
the workflow as architecture prose. The protocol now includes prompt templates
for OpenClaw daily discovery, Hermes weekly synthesis, and Codex/Cursor
validation.

This matters because prompts are the operational interface between agents. The
same file protocol can fail if each run asks for a different shape of output.
Templates make the loop repeatable without prematurely wiring n8n, cron, or
Local Runner automation.

Article angle: in an agent workflow, a good prompt template is not just text. It
is an API contract for another agent.

## Step 9: Run the First Real Flow Test

The first live test exposed an important integration detail. Asking OpenClaw to
both research and write the inbox file did not work on the first pass:

- First attempt: OpenClaw Gateway timed out after a long run.
- Fallback attempt: the OpenClaw `research` agent hit a session lock.
- Second attempt with a new session id avoided the lock, but the `research`
  agent did not have a file-writing tool available.
- Third attempt changed the contract: OpenClaw returned the Markdown report,
  and Codex persisted it to `agent/research/inbox/`.

Hermes then successfully read the OpenClaw report, wrote a status JSON under
`agent/research/processing/`, and generated a weekly digest under
`agent/research/done/`.

Article angle: the protocol was correct, but the agent capability boundary was
not. OpenClaw can be the radar, but the first implementation may need Codex or a
small bridge to persist OpenClaw output. Testing the loop revealed the missing
adapter before any cron or n8n automation was added.

## Step 10: Add a Restricted Persistence Bridge

The next test was to remove Codex from the middle of the OpenClaw write path
without giving OpenClaw a general-purpose shell or arbitrary file writer. The
chosen design was a tiny OpenClaw plugin with exactly one tool:
`research_inbox_write`.

The tool writes only into `agent/research/inbox/`, accepts only filenames like
`YYYY-MM-DD-topic-openclaw.md`, rejects path separators, requires the standard
OpenClaw report heading, and uses create-only file writes so an existing report
is not silently overwritten.

Article angle: the useful bridge is not "let the research agent write files."
The useful bridge is "let it write one kind of artifact to one controlled
inbox." That preserves the research/coding boundary and keeps `agent/jobs/`
untouched.

## Step 11: Diagnose the Tool Policy Boundary

The first plugin load looked successful: `openclaw plugins inspect` showed
`research-inbox-writer` loaded and listed `research_inbox_write`. But the
research agent still said the tool was unavailable.

The reason was OpenClaw's tool policy layering. The global `tools.allow` was an
explicit whitelist. In that mode, an agent-level `alsoAllow` entry cannot enable
a tool that is missing from the global whitelist. Adding
`research_inbox_write` to the global whitelist made the plugin tool visible to
the embedded research agent.

Article angle: in local-agent systems, "plugin loaded" and "agent can call the
tool" are different states. The missing layer was not JavaScript code; it was
the policy gate between registered tools and runtime-visible tools.

## Step 12: Verify the Bridge With a Real Agent Call

The smoke test asked the OpenClaw `research` agent to call
`research_inbox_write` once and create
`agent/research/inbox/2026-05-10-plugin-smoke-openclaw.md`.

The test passed. This confirms that OpenClaw can now perform the first durable
write in the research digest protocol without Codex manually persisting the
report.

Article angle: the architecture advanced by one small bridge, not by wiring the
whole system into cron or n8n. The next proof should be repeated real reports,
not broader automation.

## Step 13: Restart the Gateway and Test the Real Path

The first successful write used `openclaw agent --local`, which proves the
embedded agent path. The next question was whether the long-running OpenClaw
gateway would pick up the new plugin and tool policy.

After user approval, the gateway was restarted. The post-restart status showed
the LaunchAgent running, loopback connectivity working, and admin capability
available. A non-local `openclaw agent --agent research` smoke test then wrote
`agent/research/inbox/2026-05-10-gateway-smoke-openclaw.md` through the same
restricted plugin.

Article angle: local validation and gateway validation are different proof
levels. The gateway restart converted the bridge from "works in embedded test"
to "works on the real OpenClaw service path."

## Step 14: Run a Manual Dispatch End to End

After the gateway path was verified, the next useful proof was a real manual
dispatch instead of another smoke file. OpenClaw was asked to research the
`digital-human-manual` topic and write the report through the restricted inbox
plugin.

OpenClaw completed the report and wrote:
`agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md`.

Hermes then read that report and wrote:

- `agent/research/processing/2026-W20-digital-human-manual.status.json`
- `agent/research/done/2026-W20-digital-human-manual-hermes-weekly-digest.md`

The digest made a concrete recommendation: start with Mac mini local baselines
around SadTalker/Wav2Lip, and treat CUDA-heavy diffusion avatar models as
cloud/GPU fallback until local feasibility is proven.

Article angle: this is the first real operator loop. It is not fully automated,
but it already has the shape of a working system: external radar, synthesis,
action prompt, and durable files.

## Step 15: Separate WeCom Connectivity From Delivery Target

The WeCom plugin was loaded and channel status showed it was enabled,
configured, and running. A dry-run message using `--channel wecom --target self`
also passed at the OpenClaw CLI layer.

The actual send failed with WeCom `errcode=93006 invalid chatid`. That means
the bridge to WeCom is alive, but `self` is not a valid delivery target for this
plugin. The missing piece is not research automation; it is a concrete WeCom
chat id or a valid inbound conversation target.

Article angle: notification systems have two separate states: "channel is
connected" and "this target is deliverable." Treating them as the same state is
how agents silently lose reports.

## Step 16: Use an Inbound WeCom Conversation as the Target

The user sent `test for new job` from WeCom. The channel logs showed the direct
conversation as `chat: ChenXin user: ChenXin`. Retrying the notification with
`--target ChenXin` succeeded and returned `chatId: ChenXin`.

Article angle: the reliable way to establish a chat target is to let the user
create an inbound conversation first, then reuse the target that the channel
adapter actually observes. This is safer than inventing aliases like `self`.

## Step 17: Correct the Hermes Inbound Diagnosis

The first Codex-side observation suggested Hermes was not receiving WeCom
messages because the foreground gateway logs did not show the user's test
message. The user then reported the actual Hermes-side response: Hermes received
"Test a new periodic job.", created `test-new-job-2`, and manually triggered it.

`hermes cron list` confirmed the job exists:

- Job id: `8dda99b6a438`
- Name: `test-new-job-2`
- Schedule: `every 60m`
- Deliver: `origin`
- Last run: `ok`

The same check also warned that the Hermes gateway service is not running, which
means the test job exists but future automatic firing depends on fixing the
Hermes gateway service.

Article angle: operator reports are first-class evidence. Local logs can be
incomplete or pointed at the wrong process; when the user sees a successful
agent response, the diagnosis must be revised instead of forcing the old
interpretation.

## Step 18: Run a Deeper Productization Research Topic

The next manual run used a topic that directly matches the system being built:
local multi-agent workflow productization. OpenClaw was asked to do public web
research across coding agents, orchestration frameworks, human-in-the-loop
operations, durable state, notifications, eval gates, and failure modes.

OpenClaw wrote:
`agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md`.

Hermes then synthesized the report into:

- `agent/research/processing/2026-W20-local-multi-agent-productization.status.json`
- `agent/research/done/2026-W20-local-multi-agent-productization-hermes-weekly-digest.md`

The digest recommendation was pragmatic: keep the current
supervisor-plus-specialist architecture, then add tool-level HITL, eval gates,
and a bounded fanout benchmark before considering a new control plane.

Article angle: this run turned the workflow back on itself. The research topic
was not an external feature idea; it was an investigation into how to
productize the exact local multi-agent operating model we are testing.

## Step 19: Notify Both Surfaces With Different Reliability

OpenClaw notification was direct and reliable: sending to WeCom target `ChenXin`
succeeded and returned a message id.

Hermes notification used a one-shot `origin` cron job because Hermes does not
expose the same simple `message send` CLI surface. The job was created with
repeat count one, manually triggered, and consumed by `hermes cron tick`.

The remaining reliability gap is not the research protocol; it is the Hermes
gateway service. `hermes cron list` still warns that the gateway is not running,
so future automatic delivery cannot be treated as reliable until the Hermes
service startup/logging issue is fixed.

Article angle: two agents can both "receive" a result, but the delivery
mechanisms can differ. Treating delivery reliability as a first-class part of
the experiment prevents false confidence.

## Step 20: Make WeCom Notifications Readable

The first Hermes notification delivered an execution-style response in English.
It listed files that were created, but the user could not understand the result
inside WeCom without opening the local Markdown files.

The fix is a separate Chinese notification template:
`agent/research/templates/wecom-digest-notification-cn.md`.

The rule is simple: WeCom should carry a readable Chinese conclusion, priorities,
next action, and archive paths. Full Codex/Cursor execution prompts stay in the
Markdown digest, not in the chat notification.

Article angle: notification is a user interface, not just delivery plumbing. A
message that technically arrives can still fail if it is not readable at the
place where the user receives it.

## Step 21: Improve Hermes Gateway Startup, But Mark Residual Risk

Hermes gateway service instability was traced to launchd writing stdout/stderr
to the external-drive Hermes log directory. The error was `operation not
permitted` when writing `gateway.log`.

The service plist and wrapper were backed up. The plist stdout/stderr paths were
changed to `~/Library/Logs/hermes-gateway-service.*.log`, leaving `HERMES_HOME`
on the external drive. After reload, launchd showed the gateway service loaded
with a live PID.

Residual risk remains: Hermes CLI still reports the service definition as stale,
and `hermes cron status` still says the gateway is not running. So this is an
improvement, not a completed reliability fix.

Article angle: operational fixes should have states beyond pass/fail. Here the
right status is "startup blocker improved, scheduler reliability not yet proven."
