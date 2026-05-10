# Hermes Weekly Research Digest

Week: 2026-W20
Topic: digital-human
Owner: Hermes
Inputs: `agent/research/inbox/2026-05-10-digital-human-openclaw.md`

## One-Sentence Conclusion
Digital-human本地化路径已具备可执行条件，建议本周以“Mac mini先跑通离线/批处理闭环、实时口型同步后置验证”的策略推进POC，优先验证端到端质量与资源瓶颈而非追求第一周实时化。

## Obsidian-Ready Note
- 主题: digital-human
- 周次: 2026-W20
- 结论: 开源组件已覆盖 STT→LLM→TTS/克隆→口型同步→Avatar 的全链路，但实时口型同步仍是GPU瓶颈。
- 本周优先级:
  1) 先做本地最小闭环（批处理）
  2) 再做口型同步质量对比
  3) 最后评估是否需要混合云GPU
- 平台判断:
  - Mac mini M4 Pro: 适合先行POC与语音链路
  - 实时口型同步: 多数公开证据仍偏向NVIDIA GPU
- 决策边界: 不做provider/credential/gateway/n8n/Local Runner/agent/jobs改动。

## Deduplicated Key Findings
1. 全链路开源可用性已形成：报告明确指出STT、LLM、TTS/克隆、lip-sync、avatar各环节均有可用开源组件。
2. 核心瓶颈仍在lip-sync与视频阶段的GPU需求：MuseTalk/Wav2Lip等环节GPU依赖强，Mac集显实时性证据不足。
3. Mac mini M4 Pro（48-64GB统一内存）可承担“对话大脑+语音链路”类负载，但同机叠加lip-sync/渲染会产生内存与性能压力。
4. 声音克隆本地可行（F5-TTS/GPT-SoVITS等），但质量仍可能出现韵律/音色漂移，需业务验收标准。
5. bitHuman信号支持“macOS本地语音栈可落地”，但其可独立复核性较弱（报告已标注分发门槛与不确定性）。
6. Inochi2D为2D路线提供低成本替代，适合作为早期可控演示路径。
7. Reallusion iClone/CC5路线更偏商业生产级与RTX生态，不适合作为当前本地POC首周核心投入。
8. AMD Ryzen AI Max+（128GB）提供更高内存上限，属于“后续硬件扩容选项”，不是本周必要前置。
9. 目前不存在“单一统一框架”，工程集成成本真实存在，需以模块化与验收栅栏管理复杂度。

## POC Action Checklist
- [ ] A1. 定义最小闭环输入输出契约（音频入、文本中间态、TTS出、lip-sync视频出），仅文档化，不改现有运行栈。
- [ ] A2. 在Mac mini路径先完成批处理流程：STT -> 本地LLM(如Ollama类运行时) -> 轻量TTS（Kokoro/MeloTTS方向）-> 单张人像lip-sync离线输出。
- [ ] A3. 建立质量验收表：语音自然度、嘴型匹配、端到端时延、失败率；每项给“可接受阈值”。
- [ ] A4. 做两组lip-sync对比样本（如MuseTalk基线 + 另一工具基线），比较质量/耗时/显存与稳定性。
- [ ] A5. 若A4不达标，触发“可选混合模式”评估：仅将lip-sync/渲染阶段外置GPU，其余保持本地。
- [ ] A6. 输出W20复盘：明确“继续本地深化”或“进入混合架构”决策。

## Worth Trying
1. 批处理优先策略：先证明全链路可用，再追实时，能显著降低首周不确定性。
2. 2D Avatar先行（Inochi2D方向）：避开3D高成本和商业授权约束。
3. 语音链路本地化优先：TTS/克隆环节先稳定，再推进视频质量。
4. 模块化替换实验：保持每阶段可替换，降低“无统一框架”带来的锁定风险。

## Watching
1. LatentSync独立基准是否增多（当前报告标注为较新，独立评测有限）。
2. Apple Silicon上MuseTalk等工具的实时性能公开复现数据。
3. bitHuman相关可公开复核材料是否增加。
4. 商业3D工具（Reallusion 2026路线）功能实际落地与成本曲线。

## Not Investing Now
1. 本周不投入“端到端实时”作为硬指标（先批处理闭环）。
2. 本周不投入商业3D重制作链路作为主线（iClone/CC5/RTX路线后置）。
3. 本周不进行硬件更换决策（如直接采购新平台）——先用现有资产产出质量与性能证据。

## Execution Prompt For Codex/Cursor
You are executing a digital-human POC planning sprint in `/Volumes/WDC2T/Project/ai-pipeline-poc` for week `2026-W20`.

Goal:
Produce an evidence-driven POC plan and validation template for a local-first digital-human pipeline based ONLY on `agent/research/inbox/2026-05-10-digital-human-openclaw.md`.

Hard constraints:
- Do NOT change providers, credentials, launchd, gateway, n8n, Local Runner, or `agent/jobs`.
- Do NOT treat WeCom as queue state.
- Do NOT invent claims beyond the source report.
- Do NOT include private links, accounts, credentials, or auth values.

Tasks:
1) Create `docs/digital-human/2026-W20-poc-plan.md` with:
   - scope, assumptions, and non-goals
   - phased validation path: batch-first then real-time check
   - measurable acceptance criteria (quality + latency + stability)
2) Create `docs/digital-human/2026-W20-eval-matrix.md` comparing candidate stages:
   - STT, LLM runtime, TTS/voice cloning, lip-sync, avatar layer
   - columns: local feasibility, Mac mini fit, GPU dependence, uncertainty
3) Create `docs/digital-human/2026-W20-hazards.md`:
   - top risks, trigger signals, mitigation, fallback decision gates
4) Add a short write-back note to `docs/HANDOFF.md` continuity section summarizing that this was a research-planning update only (no runtime/control-plane mutation).

Output requirements:
- Keep content concise, source-grounded, and execution-ready.
- End with a checklist of next-week experiments.

## Validation Write-Back
- 状态文件已先写入：`agent/research/processing/2026-W20-digital-human.status.json`。
- 本Digest已写入：`agent/research/done/2026-W20-digital-human-hermes-weekly-digest.md`。
- 本次仅做研究综合与行动规划输出；未触及provider/credential/launchd/gateway/n8n/Local Runner/agent/jobs。

## Sources And Uncertainty
Primary source:
- `agent/research/inbox/2026-05-10-digital-human-openclaw.md`

Uncertainty handling:
- 已沿用输入报告中的不确定性标注（如Apple Silicon实时性能公开证据不足、LatentSync独立基准有限、bitHuman独立验证门槛等）。
- 未新增外部断言，未引入未在输入中出现的私有信息。
