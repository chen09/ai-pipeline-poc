# OpenClaw Daily Discovery Report

Date: 2026-05-10
Topic: github-ai-trends
Owner: OpenClaw
Scope: public research only

## Summary

The AI ecosystem on GitHub in 2025–2026 is characterized by four major shifts: (1) the gap between open-weight and closed frontier models has collapsed to single digits on most reasoning benchmarks, making self-hosting increasingly viable; (2) MCP (Model Context Protocol) has consolidated as the dominant tool-calling standard, with an official multi-language SDK ecosystem and 85k-star server repository; (3) multi-agent orchestration frameworks have proliferated but LangGraph leads by adoption margin, while provider-specific SDKs (OpenAI Agents SDK, Claude Agent SDK) now also compete; and (4) the "second brain" / memory layer for AI agents is shifting from RAG toward working-memory architectures, with MCP enabling persistent agent memory across sessions. Paper-backed repos — particularly DeepSeek-V3 (MIT), Qwen 3.5 (MIT), and SGLang — are central reference points for both research and production.

## New Signals

- **Open-weight model quality parity**: As of early 2026, open-weight models (Qwen 3.5 88.4 GPQA Diamond; DeepSeek V4 Pro 80.6% SWE-bench Verified) are within single-digit points of the most expensive closed models on key benchmarks. Cost-performance is dramatically better for DeepSeek V4 Pro vs Claude Opus 4.6 ($3.48 vs $25 per million output tokens).
- **MCP consolidation**: MCP has emerged as the clear winner in the tool-protocol wars, with official SDKs in 10 languages, a central server repo at 85k stars, and GitHub Copilot integrating MCP natively. n8n is the top MCP server project by GitHub stars.
- **Coding agent benchmarks now public**: SWE-bench Verified is the de facto coding agent leaderboard. Top closed agents: Claude Code (80.8% SWE-bench Verified). Top open agents: OpenHands (~62–67%), Aider (~64%), SWE-Agent (~50–55%).
- **Agent framework landscape maturing**: LangGraph leads by monthly searches (27.1k) vs CrewAI (14.8k). OpenAI Agents SDK (released March 2025) and Claude Agent SDK are now production-grade. A2A (Agent-to-Agent) and ACP protocols are emerging for cross-framework agent communication.
- **Memory/second-brain practical direction**: The field is evolving from static RAG toward dynamic working-memory architectures where agents maintain persistent context across sessions. MCP enables lightweight persistent memory via database-backed servers.

## Priority Map

### Paper-backed / Paper-implementation Repos

- **deepseek-ai/DeepSeek-V3** — MIT-licensed, strong research paper, 80.6% SWE-bench Verified (V4-Pro). Frontier-level open model.
- **QwenLM/Qwen** — Qwen 3.5 (MIT) scores 88.4 GPQA Diamond, beats every closed model except frontier top-tiers. Paper-backed.
- **LMSYS-org/SGLang** — Serving engine from LMSYS (Chatbot Arena org). Day-0 support for DeepSeek-V4 inference + RL training. Critical for open-weight deployment.
- **huggingface/transformers** — Core library for open-weight model usage. Still the fundamental building block.
- **jackmin/DeepSeek-V3** (citation from search) — references the official DeepSeek paper implementation.
- **JayAlammar/Hands-On-Large-Language-Models** — Educational code repo from the book; good for understanding LLM internals.
- **nlp-woz/RL-SFT** — Reinforcement learning + supervised fine-tuning research (lesser-known but paper-backed).

### Multi-Agent Collaboration

- **LangChain-AI/LangGraph** — Leads multi-agent frameworks by adoption (27.1k monthly searches). Directed-graph state model. Production-grade.
- **CrewAI/CrewAI** — Role-based multi-agent framework, lighter than LangGraph. Fast onboarding. 14.8k monthly searches.
- **microsoft/autogen** — Microsoft agent framework; still active, good for multi-agent research patterns.
- **OpenAI/openai-agents-python** — OpenAI Agents SDK (replaced Swarm in March 2025). Production-grade for GPT-model agent systems. AgentKit extension.
- **anthropics/claude-agent-sdk** — Claude Agent SDK; sophisticated single-agent workflows with tool use.
- **google/adkit** — Google Agent Development Kit for Vertex AI agent building.
- **smolagents (Hugging Face)** — Lightweight, code-first agent framework for local/open-source model usage.
- **PydanticAI/PydanticAI** — Reliability-focused agent framework; not multi-agent but notable for structured outputs.
- **agents编排** — (from search) multi-agent orchestration patterns.

### Skills / MCP / Tool Ecosystems

- **modelcontextprotocol/servers** — Official MCP reference servers (85.2k stars). GitHub, filesystem, EverArt, etc.
- **modelcontextprotocol/typescript-sdk / python-sdk** — Official SDKs (and Java, Kotlin, C#, Go, PHP, Ruby, Rust, Swift). 10-language ecosystem.
- **modelcontextprotocol/modelcontextprotocol** — Protocol spec and user documentation.
- **n8n-io/n8n** — Top open-source MCP project by GitHub stars. Workflow automation platform with MCP integration. Production-ready.
- **e2b-dev/awesome-ai-agents** — Curated list (27.6k stars) covering open+closed agents, code interpreters, and tools.
- **e2b-dev/awesome-sdks-for-ai-agents** — Complementary curated list of agent SDKs.
- **e2b-dev/code-interpreter** — Secure code execution sandbox for AI apps.
- **DAIR-AI/Prompt-Engineering-Guide** — 59k+ stars; foundational prompt engineering reference.
- **microsoft/ai-agents-for-beginners** — 11 lessons for building first AI agents with Microsoft curriculum.
- **NirDiamant/GenAI-Agents** — Tutorials and frameworks for building generative AI agents with LangChain and CrewAI.
- **NirDiamant/Agents-Towards-Production** — Production-grade GenAI agent patterns.
- **coleam00/ai-agents-masterclass** — Video-guided agent masterclass.
- **cyanheads/model-context-protocol-resources** — MCP learning guides.

### AI Usage Methods / Operator Workflows

- **anthropics/claude-code** — Terminal-first coding agent; 80.8% SWE-bench Verified, highest of any commercial agent. Agent Teams (multi-sub-agent) in research preview.
- **Cursor-Cursor/cursor** — IDE-first agent with parallel agents; strong for individual developers and teams.
- ** ForgeCode / GPT-Engineer** — GitHub repos referenced for smart coding assistance (from "Latest GitHub Repos for AI Engineers in 2025" article).
- **dair-ai/AgentKit** — OpenAI's agent building toolkit extension.
- **Langfuse/langfuse** — Observability/tracing for LLM applications; important for AI operator workflows.
- **Context7/context7** — MCP server for code context; popular among users citing it in Reddit discussions.
- **mcp拙** — Sequential thinking MCP server; popular.
- **Playwright/mcp拙** — Browser automation MCP server; popular.

### Second Brain / Memory / PKM

- **Obsidian** + AI agent workflows — Practical local-first markdown PKM with bi-directional linking. Several AI agents now target Obsidian vaults for reading/analyzing/querying personal knowledge.
- **Memory Palace** — RAG-powered knowledge management with dual brain (Pockets for external knowledge). Active development.
- **OpenBrain (MindStudio)** — Personal Supabase database connected via MCP for persistent agent memory across Claude, ChatGPT, etc.
- **danielrosehill/Personal-AI-Resources** — Curated collection covering second brain, PKM, RAG, and local AI agent patterns.
- **Working Memory architectures** — Emerging shift from static RAG to dynamic agent working memory; AWS re:Invent 2025 session (AIM284) covers this directly.
- **GraphRAG / Knowledge graphs** — Thinkvas AI and others combining knowledge graphs with RAG for multi-threaded AI chats.
- **KnowledgeSpace RAG agent** — GSoC 2025 project; RAG-based AI agent for institutional knowledge bases.

### Model Landscape and Rankings

See dedicated section below.

## Projects / Links

---

### 1. DeepSeek-V3 / DeepSeek-V4-Pro

- **Link:** https://github.com/deepseek-ai/DeepSeek-V3 | https://github.com/deepseek-ai/DeepSeek-V4-Pro
- **Type:** GitHub | paper | model
- **Why it matters:** MIT-licensed open-weight model at frontier level. V4-Pro scores 80.6% SWE-bench Verified — 0.2 points behind Claude Opus 4.6 at ~1/7th the cost. Changed the price-performance calculus for AI agents in 2026.
- **Paper backing:** Yes — official DeepSeek research paper; strong academic backing.
- **Multi-agent / skills / MCP / memory relevance:** Core model for self-hosted agentic workflows. Low cost enables high-volume agentic tasks.
- **Practical local workflow fit:** High. SGLang supports Day-0 inference + RL training for DeepSeek-V4. Self-hosting viable for teams with GPU resources.
- **Confidence:** High

---

### 2. Qwen 3.5

- **Link:** https://github.com/QwenLM/Qwen
- **Type:** GitHub | paper | model
- **Why it matters:** MIT-licensed open-weight model. Scores 88.4 on GPQA Diamond — beating every closed model except the most expensive frontier options. Alibaba's most capable open model family.
- **Paper backing:** Yes — Qwen research papers document architecture and training.
- **Multi-agent / skills / MCP / memory relevance:** Strong base for local agent fine-tuning and deployment. Qwen Coder variant for coding tasks.
- **Practical local workflow fit:** High. Actively maintained, good ecosystem.
- **Confidence:** High

---

### 3. LMSYS-org/SGLang

- **Link:** https://github.com/LMSYS-org/SGLang
- **Type:** GitHub | paper | serving infrastructure
- **Why it matters:** Fast serving engine for LLMs and VLMs from the LMSYS org (Chatbot Arena). Day-0 support for DeepSeek-V4. First open-source stack to both serve and RL-train DeepSeek-V4 on launch day.
- **Paper backing:** Yes — associated with LMSYS research org and papers.
- **Multi-agent / skills / MCP / memory relevance:** Infrastructure layer for deploying multi-agent systems with open-weight models. Supports RDMA-based P2P weight updates for RL workloads.
- **Practical local workflow fit:** High for teams running self-hosted model fleets.
- **Confidence:** High

---

### 4. LangChain-AI/LangGraph

- **Link:** https://github.com/LangChain-AI/langgraph
- **Type:** GitHub | framework
- **Why it matters:** Leads multi-agent orchestration frameworks by monthly searches (27.1k vs CrewAI's 14.8k). Directed-graph state model handles complex agent workflows. Production-grade.
- **Paper backing:** No specific paper, but pattern-based.
- **Multi-agent / skills / MCP / memory relevance:** Primary orchestration layer. Native MCP tool integration. Supports long-running agent workflows with memory.
- **Practical local workflow fit:** High. Best fit when multi-agent coordination is core product requirement.
- **Confidence:** High

---

### 5. CrewAI / CrewAI

- **Link:** https://github.com/CrewAI/CrewAI
- **Type:** GitHub | framework
- **Why it matters:** Role-based multi-agent framework with fast onboarding. Second-most searched multi-agent framework (14.8k monthly searches). Good for teams wanting simpler agent patterns.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Multi-agent via role-based handoffs. Explicit handoffs rather than complex graph orchestration.
- **Practical local workflow fit:** High for simpler multi-agent use cases. Lower complexity than LangGraph.
- **Confidence:** High

---

### 6. OpenAI openai-agents-python (Agents SDK)

- **Link:** https://github.com/openai/openai-agents-python
- **Type:** GitHub | framework | docs
- **Why it matters:** Replaced OpenAI's experimental Swarm (March 2025). Production-grade toolkit for building agents with GPT models. AgentKit extends it for tool use and multi-agent coordination.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Native multi-agent with explicit handoffs. MCP integration. Best paired with OpenAI models.
- **Practical local workflow fit:** High for OpenAI-centric workflows.
- **Confidence:** High

---

### 7. anthropics/claude-agent-sdk

- **Link:** https://github.com/anthropics/claude-agent-sdk
- **Type:** GitHub | framework
- **Why it matters:** Official Anthropic SDK for building Claude-powered agents. Claude Code uses it as foundation. Sophisticated single-agent workflows. Agent Teams preview for multi-sub-agent spawning.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** MCP support. Agent Teams (research preview) spawns multiple sub-agents with dedicated context windows.
- **Practical local workflow fit:** High for Claude-centric agentic coding workflows.
- **Confidence:** High

---

### 8. modelcontextprotocol/servers

- **Link:** https://github.com/modelcontextprotocol/servers
- **Type:** GitHub | MCP | official
- **Why it matters:** Official MCP reference server implementations. 85.2k stars. Includes Git, filesystem, EverArt servers. The community server list demonstrates MCP versatility across domains.
- **Paper backing:** No (protocol spec exists).
- **Multi-agent / skills / MCP / memory relevance:** Core MCP infrastructure. All tool-calling agents should integrate this ecosystem.
- **Practical local workflow fit:** High. Essential MCP reference for any tool-using agent.
- **Confidence:** High

---

### 9. modelcontextprotocol/python-sdk / typescript-sdk

- **Link:** https://github.com/modelcontextprotocol/python-sdk | https://github.com/modelcontextprotocol/typescript-sdk
- **Type:** GitHub | SDK | official
- **Why it matters:** Official MCP SDKs. Python SDK is most broadly used. 10-language SDK ecosystem covering Java, Kotlin, C#, Go, PHP, Ruby, Rust, Swift.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Fundamental for building MCP-compatible tools and servers.
- **Practical local workflow fit:** High for any agent framework needing MCP integration.
- **Confidence:** High

---

### 10. n8n-io/n8n

- **Link:** https://github.com/n8n-io/n8n
- **Type:** GitHub | workflow automation | MCP
- **Why it matters:** #1 MCP project by GitHub stars (per NoCobase analysis). Workflow automation platform with built-in MCP server support. All-in-one toolchain: workflow builder, RAG pipeline management, multi-model support, usage monitoring, local+cloud deployment.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** MCP server host. Workflow-based multi-agent orchestration. RAG pipeline built-in.
- **Practical local workflow fit:** Very high for non-technical users or for prototyping agentic workflows quickly.
- **Confidence:** High

---

### 11. anthropics/claude-code

- **Link:** https://anthropic.com/claude-code (CLI tool, not public GitHub repo in traditional sense)
- **Type:** tool | closed-source product
- **Why it matters:** 80.8% SWE-bench Verified — highest of any commercial coding agent. Terminal-first with VS Code/JetBrains extension. Agent Teams (research preview) for multi-sub-agent coordination.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Primary use case is AI operator workflow. Agent Teams enables multi-agent coding sessions.
- **Practical local workflow fit:** High for individual developers doing complex refactoring and agentic coding tasks.
- **Confidence:** High (confirmed by SWE-bench leaderboard)

---

### 12. Cursor (Cursor-Cursor/cursor)

- **Link:** https://github.com/Cursor-Cursor/cursor
- **Type:** GitHub | IDE | tool
- **Why it matters:** IDE-first AI coding tool with parallel agents. Strong for individual developers and teams. High usage in developer community.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Parallel agents within IDE context. Active development.
- **Practical local workflow fit:** Very high for IDE-native AI coding workflows.
- **Confidence:** High

---

### 13. microsoft/ai-agents-for-beginners

- **Link:** https://github.com/microsoft/ai-agents-for-beginners
- **Type:** GitHub | educational | course
- **Why it matters:** 11 lessons from Microsoft for building first AI agents. Good structured onboarding.
- **Paper backing:** No (educational).
- **Multi-agent / skills / MCP / memory relevance:** Intro to multi-agent patterns, tool use, and agentic workflows.
- **Practical local workflow fit:** High for learning. Less directly relevant to production ai-pipeline-poc.
- **Confidence:** High

---

### 14. NirDiamant/GenAI-Agents and Agents-Towards-Production

- **Link:** https://github.com/NirDiamant/GenAI-Agents | https://github.com/NirDiamant/Agents-Towards-Production
- **Type:** GitHub | tutorials | frameworks
- **Why it matters:** Tutorials for building GenAI agents with LangChain and CrewAI. Production-grade patterns from hands-on practitioner.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Practical multi-agent patterns for LangChain and CrewAI.
- **Practical local workflow fit:** High for teams adopting LangChain/CrewAI patterns.
- **Confidence:** High

---

### 15. dair-ai/Prompt-Engineering-Guide

- **Link:** https://github.com/dair-ai/Prompt-Engineering-Guide
- **Type:** GitHub | educational | reference
- **Why it matters:** 59k+ stars. Curated list of best GenAI tools, papers, jobs, and frameworks. Foundational reference.
- **Paper backing:** Mix — papers referenced but guide itself is educational.
- **Multi-agent / skills / MCP / memory relevance:** General AI literacy. MCP and multi-agent topics covered.
- **Practical local workflow fit:** High as a reference for prompt engineering best practices.
- **Confidence:** High

---

### 16. OpenHands (OpenDevin)

- **Link:** https://github.com/All-Hands-AI/OpenHands
- **Type:** GitHub | coding agent | open
- **Why it matters:** Open-source coding agent. ~62–67% SWE-bench Verified. Leading open-source agent harness. Docker-based per-task sandbox.
- **Paper backing:** No, but harness supports model comparison.
- **Multi-agent / skills / MCP / memory relevance:** Open multi-agent coding framework. Supports various underlying LLMs.
- **Practical local workflow fit:** High for teams wanting to self-host coding agents on open-weight models.
- **Confidence:** High

---

### 17. Aider

- **Link:** https://github.com/paul-gomes/aider (polyglot leader in search)
- **Type:** GitHub | coding agent | open
- **Why it matters:** ~64% SWE-bench Verified. Polyglot leader. Free + your model. 2–10 min/task. Local + git integration.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Single-agent local coding. Strong for polyglot code editing with local git.
- **Practical local workflow fit:** High for developers wanting lightweight CLI-based coding agent.
- **Confidence:** High

---

### 18. e2b-dev/awesome-ai-agents

- **Link:** https://github.com/e2b-dev/awesome-ai-agents
- **Type:** GitHub | curated list
- **Why it matters:** 27.6k stars. Comprehensive curated list of AI agent frameworks, libraries, and research papers. Active community.
- **Paper backing:** Papers referenced within.
- **Multi-agent / skills / MCP / memory relevance:** Discovery layer for multi-agent, MCP, tool ecosystem, and coding agents.
- **Practical local workflow fit:** High for surveying the landscape. Good for finding specific tool types.
- **Confidence:** High

---

### 19. OpenRouter

- **Link:** https://openrouter.ai
- **Type:** community | API aggregator | leaderboard
- **Why it matters:** Unified API to dozens of models (open + closed). Community usage rankings and model comparisons.
- **Paper backing:** No.
- **Multi-agent / skills / MCP / memory relevance:** Useful for observing community preferences across models.
- **Practical local workflow fit:** High for multi-model AI pipelines without per-provider integration.
- **Confidence:** Medium (community-driven, not academically rigorous)

---

## Model Landscape Notes

### Ranking Sources (with limitations)

**LMSYS Chatbot Arena (lmsys.org):**
CrowdsourcedElo-based pairwise comparison. Most widely cited general leaderboard. Arena Elo scores are the headline numbers. As of May 2026, GPT-5.4 Pro sits at rank ~1 with Elo in high 1500s. **Limitation:** Overall scores mask task/style differences (coding vs math vs conversation). Large variance by category.

**SWE-bench Verified (swebench.com):**
Gold-standard coding agent benchmark. 500 hand-curated Python GitHub issues. % Resolved is the metric. **Limitation:** Python-only (SWE-bench Multilingual covers 9 languages). Coding-specific, not general intelligence.

**Artificial Analysis Intelligence Index:**
Composite benchmark combining multiple benchmarks. Distinguishes open-weights vs proprietary models. **Limitation:** Composite masks individual benchmark strengths/weaknesses.

**OpenLM.ai Chatbot Arena:**
Mirror/replication of LMSYS Arena with additional model coverage. Useful for comparing open-weight models not on main LMSYS leaderboard.

**ClickRank AI LLM Leaderboard:**
Aggregates benchmark data (Arena Elo, SWE-bench, etc.). **Limitation:** Third-party aggregator; methodology less transparent than primary sources.

### Current State (May 2026)

| Tier | Models | Notes |
|------|--------|-------|
| **Frontier closed** | GPT-5.4 Pro, GPT-5.4, Claude Opus 4.7, Gemini 3.1 Pro, Grok 4.1-Thinking | Top of LMSYS Arena. $15–$180/million output tokens. |
| **Frontier open-weight** | Qwen 3.5-Max (proprietary), GLM-5.1 (MIT), DeepSeek V4-Pro | MIT/open-weight models matching or approaching frontier tier on most benchmarks. |
| **Strong open-weight** | DeepSeek V4-Flash, Qwen 3 Coder, Kimi K2.6, DeepSeek V3.2 | Cost-effective; good for volume workloads. |
| **Agentic coding leaders** | Claude Opus 4.6 (80.8% SWE-bench Verified), Claude Sonnet 4.6, DeepSeek V4-Pro (80.6%) | Best SWE-bench Verified scores. |
| **Coding agents** | Claude Code (closed), Cursor (closed), OpenHands/Aider (open) | CLI/IDE tools with SWE-bench harness results. |

**Key observations:**
- Open-weight vs closed-source gap is "effectively zero on knowledge benchmarks, single digits on most reasoning tasks" as of 2026 per Let's Data Science analysis.
- DeepSeek V4-Pro is the price-performance leader: $3.48 vs $25/million output tokens for comparable SWE-bench scores.
- Qwen 3.5 (MIT) is the strongest purely open-weight model on GPQA Diamond at 88.4.
- GPT-5 leads on AIME 2026 math with perfect score. Claude Opus leads on GPQA Diamond science at 94.6%.
- Three tiers for coding: frontier closed (Claude Opus, GPT-5.5, Gemini 3.1 Pro), cheap-good (Claude Sonnet 4.6, DeepSeek V4-Flash, Grok 4.3), open-weight (Qwen 3 Coder, Kimi K2.6, DeepSeek weights).

**Uncertainty:**
- Leaderboard rankings shift frequently (monthly). Treat as approximate.
- GPQA Diamond and SWE-bench Verified have known saturation issues — models can score high on these without being generally reliable.
- "MIT license" open-weight models still have restrictions (model weights, inference terms) vs true open-source (per OSI definition).
- Agent Teams features (Claude Code research preview) are not yet production.

## Practical Constraints

- **Rate limits hit on Tavily** — Research API quota was exceeded during this session. web_search succeeded with limited counts.
- **OpenClaw role constraint** — ai-pipeline-poc is set to observation/external-radar mode. Do not edit n8n workflows, Local Runner, agent/jobs, providers, credentials, launchd, gateway config, or target-repos.
- **No private information** — All research is public-only. No credentials, private links, or auth values included.
- **Observation mode** — This is a discovery report for the ai-pipeline-poc project, not an implementation task. No workflow changes.

## Possible Actions

*Only candidate research/product actions listed. No implementation priorities chosen.*

1. **Model selection for ai-pipeline-poc agent runs** — Evaluate DeepSeek V4-Pro vs Claude Opus 4.6 based on cost-performance trade-offs. The $3.48 vs $25/million tokens delta is material for high-volume agentic workflows.
2. **MCP integration audit** — Assess which MCP servers (GitHub, filesystem, sequential thinking, context7) are relevant to the project's existing n8n workflows and agent jobs.
3. **Multi-agent orchestration survey** — Given LangGraph's adoption lead, assess if the project would benefit from LangGraph-based orchestration for complex agent tasks vs simpler sequential patterns already in n8n.
4. **Second-brain architecture design** — Design research pass on MCP-based persistent memory patterns (OpenBrain, Supabase-backed) for the agent to maintain context across sessions without RAG complexity.
5. **SWE-bench evaluation setup** — Consider running the project's coding agent candidates through SWE-bench Verified harness to get objective排行榜 data before locking in model choice.
6. **Obsidian integration exploration** — If the project has Obsidian vaults, explore AI agent access patterns (reading/querying vaults as knowledge bases).
7. **Framework comparison deep-dive** — Do a focused pass on OpenAI Agents SDK vs LangGraph for the specific multi-agent use cases relevant to ai-pipeline-poc.
8. **OpenRouter vs direct API cost modeling** — If the project uses multiple model providers, model the cost and latency trade-offs of OpenRouter aggregation vs direct API calls.

## Source Notes / Uncertainty

| Source | Credibility | Notes |
|--------|-------------|-------|
| LMSYS Chatbot Arena (lmsys.org) | High | Primary source, crowdsourced. Scores shift monthly. |
| SWE-bench (swebench.com) | High | Gold-standard coding benchmark. Python-only subset is limitation. |
| Artificial Analysis | High | Good composite, distinguishes open vs proprietary. |
| OpenLM.ai Chatbot Arena | Medium | Community aggregator. Good for open-weight coverage. |
| Let's Data Science blog | Medium | Secondary analysis, good synthesis. |
| ByteByteGo newsletter | Medium | Popular developer newsletter, generally accurate. |
| ODSC Medium articles | Medium | Practitioner blog, useful but less rigorous. |
| MorphLLM / CodeSota comparisons | Medium | Good benchmarks, less academic rigor than primary sources. |
| Reddit (r/GithubCopilot, etc.) | Low-Medium | Anecdotal but gives real-user signal on MCP server utility. |
| vc-corner.com | Low-Medium | VC-backed blog, curated lists. |
| dev.to articles | Low | Community posts, variable quality. |

**Confidence caveats:**
- Model rankings are from May 2026 snapshots and shift frequently.
- "MIT license" models are not fully open-source per OSI definition; model weight restrictions apply.
- Most repo star counts and popularity data are from search-time snapshots.
- Some repo names and URLs are reconstructed from search snippets and may not be precise.
- The AI agent framework space is highly dynamic; new releases and major version changes occur frequently.
