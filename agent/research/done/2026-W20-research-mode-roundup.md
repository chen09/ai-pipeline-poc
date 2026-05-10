# Research Mode Roundup

Week: 2026-W20
Owner: Hermes
Mode: Research Mode
Inputs:
- agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md
- agent/research/done/2026-W20-digital-human-manual-hermes-weekly-digest.md
- agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md
- agent/research/done/2026-W20-local-multi-agent-productization-hermes-weekly-digest.md
- docs/research/w20-productization-controls.md
- agent/research/processing/2026-W20-benchmark-plan.json
- agent/research/done/2026-W20-validation-checklist.md

## 一句话结论
本周研究结论很明确：当前 ai-pipeline-poc 最优路径不是“再加新框架或马上做实验”，而是先在既有 supervisor+specialist 基线下，用更强的控制策略（HITL、可追踪、可回放、可度量）降低多智能体失稳风险，并把数字人方向定位为“本地可行基线 + 云端高质量候补”的双轨认知。

## 本周已经确认的事情
- 数字人方向：高质量方案（如 HunyuanVideo-Avatar、MuseTalk 一类）依然明显偏 CUDA/NVIDIA；Mac mini 本地直跑高质量扩散链路仍缺少可靠公开证据。
- 本地可行性方向：SadTalker/Wav2Lip 仍是更现实的“可跑基线”，但质量与实时性上限低于扩散路线。
- 多智能体方向：行业共识正在收敛到 supervisor+specialist 架构；问题核心不是 prompt，而是状态交接、部分完成静默失败、工具调用污染下游。
- 治理粒度方向：HITL 应下沉到“工具调用级”而非“整条流程级”，并配超时与回退。
- 可靠性方向：持续评测门禁（eval gate）和全链路可观测（含工具调用因果链）已经是产品化前置条件，而非上线后补丁。

## 仍然值得继续研究的方向
- Apple Silicon/MPS 对数字人关键链路的真实可行区间（不仅能跑，还要看稳定性、速度、质量）。
- 本地多智能体并发规模的“收益-确定性-成本”拐点：并发数并非越大越好，需持续度量协调税。
- 高风险动作的审批策略：哪些动作必须人工批准、哪些动作可自动化、超时如何降级。
- 模型与框架供应链的许可变化监控（2026 年许可收紧信号明显），避免后期合规返工。

## 先不要进入实验的方向
- 暂不进入：为追求“理论最优质量”而直接投入 CUDA-first 数字人重链路本地化改造。
- 暂不进入：在未证明现有基线瓶颈前，进行大规模编排框架迁移或控制平面替换。
- 暂不进入：无明确回滚与审计策略的高风险自动外部动作扩张。

## 对当前 ai-pipeline-poc 的启发
- 方向上应“先稳后快”：先把状态契约、终态证据、审批与回退收紧，再谈更大并发和更多自治。
- 现有资产可复用性高：`agent/jobs` 的状态归属、研究/控制文档、验证清单已经形成可持续治理骨架。
- 决策应以门槛驱动：先定义通过阈值（成功率、重复率、p95、人工介入次数、成本），再决定是否扩大自动化范围。
- 架构策略可双轨：数字人保持“本地基线可用 + 云端高质量兜底”预案，减少单路线押注风险。

## 企业微信中文通知摘要
W20 研究模式周报：
1) 数字人方向已确认：高质量路线仍高度依赖 CUDA/NVIDIA，Mac mini 本地直跑高质量扩散链路暂无强证据；SadTalker/Wav2Lip 仍是本地可行基线。  
2) 多智能体产品化方向已确认：核心风险在状态交接与治理，不在 prompt；应坚持 supervisor+specialist，并把审批下沉到工具调用级（含超时与回退）。  
3) 当前项目最优策略：先强化可观测、终态证据和评测门禁，再决定是否扩并发或引入新控制平面，避免过早重构。  
4) 本周建议的人工决策集中在三件事：数字人优先级（本地基线 vs 云质量）、HITL 风险分级边界、并发扩容阈值与停机线。  
结论：先稳住控制面，再放大自动化规模。

## 下一步人工决策
- 选择数字人策略优先级：A) 本地可运行基线优先（质量次之）/ B) 云端质量优先（本地只做编排）/ C) 双轨并行但设明确预算上限。
- 确认 HITL 风险边界：哪些工具调用属于“必须人工批准”，哪些可自动通过，审批超时时默认拒绝还是默认降级。
- 确认并发扩容策略：先锁定保守并发上限，还是接受更高并发以换取吞吐，并明确触发回退的阈值（重复、丢任务、p95 超标）。

## 本地归档
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/done/2026-W20-digital-human-manual-hermes-weekly-digest.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/inbox/2026-05-10-local-multi-agent-productization-openclaw.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/done/2026-W20-local-multi-agent-productization-hermes-weekly-digest.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/docs/research/w20-productization-controls.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/processing/2026-W20-benchmark-plan.json
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/done/2026-W20-validation-checklist.md
- /Volumes/WDC2T/Project/ai-pipeline-poc/agent/research/done/2026-W20-research-mode-roundup.md
