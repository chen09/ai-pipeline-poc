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
