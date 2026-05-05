# WeChat Article Image Production Pack

## Purpose

This pack turns the final POC story into a set of WeChat-ready visuals.

- Article positioning: long-form build tutorial for technical managers and engineers.
- Visual direction: premium SaaS architecture, warm white background, clean vector style.
- Text policy: short Chinese labels only; complex explanation stays in the article body and captions.
- Hero image: keep the existing final architecture diagram.
- New images: generate figures 1-6 with ChatGPT / GPT Image latest image model.

## Source Images To Reuse

| Role | File |
| --- | --- |
| Hero / opening proof | `docs/images/poc-final-architecture-2026-05-05-full.png` |
| Historical reference 1 | `docs/images/poc-history-01-initial-chatgpt-architecture.png` |
| Historical reference 2 | `docs/images/poc-history-02-test-plan-research-alignment.png` |
| Historical reference 3 | `docs/images/poc-history-03-gpt55-reference-architecture.png` |

## Output Naming

Save generated images under `docs/wechat-article/images/` using:

| Figure | Filename |
| --- | --- |
| Figure 1 | `fig-01-single-agent-to-multi-agent.png` |
| Figure 2 | `fig-02-zero-to-phase6e-roadmap.png` |
| Figure 3 | `fig-03-tdd-like-agent-pipeline.png` |
| Figure 4 | `fig-04-local-runner-state-root.png` |
| Figure 5 | `fig-05-research-practice-alignment.png` |
| Figure 6 | `fig-06-poc-validation-dashboard.png` |

Recommended source export: PNG, 16:9, at least 1792px wide. Prefer 3840x2160 if available.

## Figure 1: Single Agent To Engineered Multi-Agent

### Use In Article

Section: why this POC exists.

Caption:

> 图 1：问题不是让一个 Agent 变得更神，而是把软件开发拆成可编排、可验证、可恢复的多个角色。

### GPT Image Prompt

```text
Create a polished Chinese infographic for a WeChat technical article.

Theme: from single coding agent to engineered multi-agent software pipeline.

Canvas: 16:9 landscape, warm white background, modern SaaS architecture style, clean vector illustration, high readability, no tiny text, no text overflow.

Composition:
Left side: a single large AI agent card labeled “单 Agent”, surrounded by messy arrows, scattered notes, test failures, unclear state, and cost question marks.
Right side: a clean multi-agent pipeline with 5 connected cards:
1. 规划
2. 测试生成
3. 代码实现
4. 执行分析
5. 评审优化

Between left and right, add a clear transformation arrow labeled “工程化编排”.

Visual tone:
professional, elegant, technical, not cartoonish.
Use blue, green, orange accents.
Use simple icons: brain, checklist, code, terminal, review shield.
Keep Chinese labels short and large.
No paragraphs.
No fake UI screenshots.
```

### Quality Checks

- Left side should feel messy but still readable.
- Right side should be clearly more structured.
- The words `单 Agent`, `工程化编排`, `规划`, `测试生成`, `代码实现`, `执行分析`, `评审优化` must be correct.

## Figure 2: Zero To Phase 6E Roadmap

### Use In Article

Section: from zero to current system.

Caption:

> 图 2：Phase 6E 的关键不是又接了一个模型，而是把执行状态源收回到本地。

### GPT Image Prompt

```text
Create a beautiful Chinese roadmap infographic for a WeChat technical article.

Title: “从零到 Phase 6E”

Canvas: 16:9 landscape, warm off-white background, premium SaaS presentation style, clean vector timeline, generous spacing.

Show a horizontal timeline with 7 milestones:
Phase 0 基础设施
Phase 1 文件状态机
Phase 2-4 多 Agent 流水线
Phase 5 10-task 验证
Phase 6A-6C 多 Repo Fanout
Phase 6D 暴露状态源问题
Phase 6E Local Runner

Highlight Phase 6D as a warning point and Phase 6E as the turning point.
Use a green success badge near Phase 6E: “状态根收敛”.

Include small visual metaphors:
Docker stack, workflow graph, file folders, test checklist, multi-repo blocks, warning signal, runner gear.

Use short Chinese labels only.
No dense text.
No tiny labels.
Elegant, credible, engineering-focused.
```

### Quality Checks

- Timeline should be readable on mobile.
- `Phase 6D` must look like a warning.
- `Phase 6E` must look like the validated turning point.

## Figure 3: TDD-like Multi-Agent Pipeline

### Use In Article

Section: core architecture.

Caption:

> 图 3：TDD-like 的重点是先定义验证目标，再让实现 Agent 围绕测试目标收敛。

### GPT Image Prompt

```text
Create a clean Chinese architecture diagram for a WeChat technical article.

Title: “TDD-like 多角色 Agent 流水线”

Canvas: 16:9 landscape, white background, modern flat vector, clear arrows, high readability.

Show 5 large connected cards left to right:
1. Planning Agent
   label: plan.md
2. Test Generation Agent
   label: test-plan.md
3. Implementation Agent
   label: build.md
4. Execution & Analysis
   label: test-run.md
5. Review & Optimization
   label: review.md

Add a red dashed feedback arrow from Review back to earlier stages.
Label the feedback arrow: “失败分类 → 重试 / 回滚 / 重新规划”

Add one small note near Test Generation:
“TDD Gate：先定义验证目标”

Style:
professional SaaS technical diagram.
Blue main container, red feedback line, subtle shadows.
No paragraphs.
All text must be large and inside boxes.
No overlapping text.
```

### Quality Checks

- The red dashed feedback arrow must not overlap the text.
- `test-plan.md` and `TDD Gate：先定义验证目标` must be clear.
- If English agent names are distorted, regenerate rather than accepting.

## Figure 4: Local Runner State Root

### Use In Article

Section: Phase 6D to Phase 6E turning point.

Caption:

> 图 4：Local Runner 让 n8n 不再依赖后端长连接状态，而是轮询本地可恢复的 job artifacts。

### GPT Image Prompt

```text
Create a high-quality Chinese technical diagram for a WeChat article.

Title: “Local Runner：把状态拿回本地”

Canvas: 16:9 landscape, warm white background, premium SaaS architecture style.

Composition:
Top: n8n 编排器, labeled “触发 / 路由 / 轮询”
Middle: Local Runner as a strong green control-plane block, labeled “执行控制面”
Inside Local Runner show:
request.json → status.json → result.json
Also show heartbeat, watchdog, restart-safe, idempotent as four small badges.

Bottom: Backend adapters:
OpenClaw / Hermes → Cursor CLI / Codex CLI

On the side, show a folder tree labeled “agent/jobs 状态根”.

Message:
n8n does not directly depend on unstable backend long connections.
Local Runner owns durable job state.

Use very short Chinese labels.
No long paragraphs.
Professional, crisp, clear arrows, no clutter.
```

### Quality Checks

- `request.json → status.json → result.json` must be visually central.
- The green Local Runner block should feel like the control plane.
- Avoid long English sentences in the rendered image; if the model renders them poorly, regenerate with Chinese-only labels.

## Figure 5: Research And Practice Alignment

### Use In Article

Section: why this fits the current multi-agent trend.

Caption:

> 图 5：这个 POC 不是孤立拼工具，而是和角色分工、SOP、工具接口、测试优先和可观测这些研究/工程主线同向。

### GPT Image Prompt

```text
Create an elegant Chinese matrix infographic for a WeChat technical article.

Title: “和 Multi-Agent 研究与工程实践的对齐”

Canvas: 16:9 landscape, white background, modern SaaS report style.

Create a 2-column matrix:
Left column: “外部方向”
Right column: “本 POC 对应实现”

Rows:
ChatDev / MetaGPT → 角色分工 + SOP
SWE-agent → Agent-Computer Interface
TDFlow / Agentic Testing → TDD-like 验证闭环
LangGraph / n8n → 编排图 + 状态流
Anthropic Multi-Agent → 可观测 + checkpoint
Langfuse → trace / cost / latency

Use icons: paper, workflow, terminal, checklist, eye chart, database.
Keep labels short and readable.
No citations URLs inside the image.
No tiny text.
Professional and credible, not flashy.
```

### Quality Checks

- Matrix rows must be aligned and readable.
- Source names must be spelled correctly: `ChatDev`, `MetaGPT`, `SWE-agent`, `TDFlow`, `LangGraph`, `n8n`, `Anthropic`, `Langfuse`.
- No URLs inside the image.

## Figure 6: POC Validation Dashboard

### Use In Article

Section: result and conclusion.

Caption:

> 图 6：POC 最后验证的是工程闭环：终态收敛、重启恢复、可观测和 CLI 能力矩阵。

### GPT Image Prompt

```text
Create a polished Chinese validation dashboard infographic for a WeChat technical article.

Title: “POC 验证结果”

Canvas: 16:9 landscape, warm white background, premium SaaS dashboard style.

Show 4 large metric cards:
1. “10-task”
   “全部终态收敛”
2. “3× restart”
   “恢复通过”
3. “Langfuse”
   “cost / latency 可观测”
4. “CLI Matrix”
   “8/8 PASS”

Below, show a smaller cost strip:
“$0.017047 · 50,570 tokens · avg 18.244s · P95 34.348s”

Use green success accents, blue neutral cards, subtle chart lines.
No tiny text.
No overcrowding.
Professional engineering dashboard, suitable for a presentation and WeChat article.
```

### Quality Checks

- Four metric cards must be the visual focus.
- The cost strip must be readable and not too small.
- If number formatting is wrong, regenerate.

## Article Placement

| Placement | Image | Caption |
| --- | --- | --- |
| Opening | `poc-final-architecture-2026-05-05-full.png` | 最终架构不是概念图，而是已经跑过验证的 POC 结果。 |
| Why | Figure 1 | 问题不是让一个 Agent 变得更神，而是把软件开发拆成可编排、可验证、可恢复的多个角色。 |
| Journey | Figure 2 | Phase 6E 的关键不是又接了一个模型，而是把执行状态源收回到本地。 |
| Architecture | Figure 3 | TDD-like 的重点是先定义验证目标，再让实现 Agent 围绕测试目标收敛。 |
| Turning point | Figure 4 | Local Runner 让 n8n 不再依赖后端长连接状态，而是轮询本地可恢复的 job artifacts。 |
| Research alignment | Figure 5 | 这个 POC 和角色分工、SOP、工具接口、测试优先和可观测这些研究/工程主线同向。 |
| Result | Figure 6 | POC 最后验证的是工程闭环：终态收敛、重启恢复、可观测和 CLI 能力矩阵。 |

## Reference Materials For The Article

Use references in the article body sparingly, then list them at the end.

- Mattermost: Cursor Automations + n8n backlog automation
- n8n: multi-agent systems tutorial
- Anthropic: multi-agent research system engineering write-up
- LangGraph: multi-agent workflows
- Langfuse: agent observability and n8n integration
- ChatDev, MetaGPT, SWE-agent
- Local reference: `docs/RESEARCH_REFERENCES.md`

## Review Checklist After Generation

For each generated image:

- One image, one message.
- 16:9 landscape.
- Chinese labels are correct.
- No tiny text.
- No text overflow.
- No fake citations or URLs.
- No visual clutter.
- Works at mobile article width.
- Looks like the same design family as the other images.

If an image has strong composition but bad text, regenerate with fewer labels instead of manually accepting it.
