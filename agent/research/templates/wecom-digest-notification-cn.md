# WeCom Digest Notification Template (Chinese)

Use this template when sending research digest results to WeCom. The notification
must be readable in chat without opening local Markdown files.

Do not paste the full execution prompt for Codex/Cursor into WeCom. Keep
execution prompts in the digest file and only mention the recommended next
action in Chinese.

```text
【Hermes Digest 中文摘要】
主题：<topic-human-name>
日期：<YYYY-MM-DD> / Week <YYYY-WW>

结论：
<one-sentence conclusion in Chinese>

重点发现：
1. <finding one>
2. <finding two>
3. <finding three>

优先级：
P0：<highest priority action>
P1：<next action>
P2：<watch/defer item>

建议下一步：
<one concrete human decision or Codex/Cursor validation task>

本地归档：
OpenClaw 报告：agent/research/inbox/<file>.md
Hermes Digest：agent/research/done/<file>.md
```

Rules:
- Write the body in Chinese.
- Include enough detail for the user to understand the result inside WeCom.
- Include local file paths only as archive references.
- Do not ask Hermes to execute the Codex/Cursor prompt from the digest.
- If sending through Hermes cron, phrase the prompt as "只发送下面这段中文通知，不要执行任务，不要创建文件，不要调用工具".
