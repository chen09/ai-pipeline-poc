# Hermes Weekly Research Digest

Week: 2026-W20
Topic: digital-human-manual
Owner: Hermes
Inputs:
- agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md

## One-Sentence Conclusion
For a Mac mini-first digital-human pipeline, prioritize CPU/MPS-feasible lip-sync baselines (SadTalker/Wav2Lip), defer CUDA-heavy diffusion avatars to optional cloud fallback, and validate end-to-end latency with a bounded local POC before any platform expansion.

## Obsidian-Ready Note
- Decision frame: quality vs local feasibility is still the dominant trade-off.
- Immediate focus: prove a local baseline that works reliably on Mac mini (batch-first, not real-time-first).
- Strategic split:
  - Track A (local now): SadTalker/Wav2Lip + local LLM/TTS integration.
  - Track B (quality later): MuseTalk/HunyuanVideo-Avatar via NVIDIA/cloud only if quality gap is unacceptable.
- Success criterion this week: one reproducible benchmark sheet for latency, FPS (if applicable), and output quality notes on representative clips.

## Deduplicated Key Findings
1) Strong signals (high confidence)
- HunyuanVideo-Avatar and MuseTalk are credible, active, and technically strong, but operationally CUDA-centric.
- SadTalker and Wav2Lip remain the most practical open-source baselines for non-CUDA environments.

2) Core constraint
- CUDA dependency is the primary blocker for Mac mini-native deployment of diffusion-heavy avatar generation.

3) Practical implication
- Real-time claims in literature/repos are usually model-stage specific (often lip-sync only) and do not represent full conversational pipeline latency.

4) Pipeline reality
- End-to-end digital-human requires multi-stage orchestration (ASR/LLM/TTS/avatar). Integration overhead is as important as model quality.

5) Weak-evidence items
- HeyGem, Duix-Avatar cross-platform practicality, WeClone standalone viability, and some community-size claims remain uncertain and need direct verification.

## POC Action Checklist
- [ ] Define benchmark protocol (fixed input image/audio set, fixed clip durations, fixed resolution).
- [ ] Run SadTalker local baseline on project machine; record runtime and subjective quality notes.
- [ ] Run Wav2Lip local baseline with same inputs; compare latency/quality against SadTalker.
- [ ] Wire one minimal local chain: TTS output -> lip-sync model input -> rendered video artifact.
- [ ] Capture failure modes (install friction, memory spikes, model crashes, artifact quality issues).
- [ ] Produce go/no-go threshold for "local-only acceptable" vs "needs cloud GPU stage".

## Worth Trying
Priority P0
- SadTalker baseline benchmarking on Mac mini-class hardware.
- Wav2Lip baseline benchmarking on same corpus.

Priority P1
- MuseTalk CPU/MPS exploratory run only to quantify gap (not as delivery path).
- Hybrid architecture draft: local LLM/TTS + optional remote avatar rendering.

Priority P2
- ComfyUI-based orchestration experiments if they reduce integration complexity.

## Watching
- Any confirmed Apple Silicon/MPS success reports for MuseTalk/HunyuanVideo-Avatar/MuseV.
- Community and maintenance trajectory for Chinese-language avatar stacks with offline claims.
- Lightweight avatar models that trade top-end quality for reliable local execution.

## Not Investing Now
- Full productionization of CUDA-first diffusion avatar pipelines on Mac mini-only infrastructure.
- Windows/Docker-first stacks lacking clear Mac path as immediate core direction.
- Broad project sprawl across many uncertain repos before baseline benchmarking is complete.

## Execution Prompt For Codex/Cursor
You are validating a bounded local POC for digital-human-manual in /Volumes/WDC2T/Project/ai-pipeline-poc.

Scope constraints:
- Do NOT change provider/credential/launchd/gateway/n8n/Local Runner/agent/jobs.
- Do NOT use WeCom as queue state.
- Stay inside local benchmarking and documentation artifacts only.

Tasks:
1) Create a reproducible benchmark plan for SadTalker and Wav2Lip using shared test assets.
2) Execute both baselines locally (batch mode acceptable), capturing:
   - wall-clock runtime
   - output resolution/fps
   - observed failures/warnings
   - subjective quality notes (lip sync coherence, artifacts)
3) Produce a comparison table and a short recommendation:
   - local-only viable now? (yes/no/partial)
   - if partial, identify the exact stage needing cloud GPU.
4) Write results to:
   - agent/research/processing/2026-W20-digital-human-manual-validation-notes.md

Definition of done:
- One side-by-side benchmark table exists.
- One explicit go/no-go recommendation exists.
- No forbidden system/config domains were modified.

## Validation Write-Back
When engineering validation completes, append:
- Actual machine/runtime context
- Repro command set used
- Benchmark table
- Decision: Local-only / Hybrid / Cloud-required
- Next action (single owner, single due week)

Target write-back file:
- agent/research/processing/2026-W20-digital-human-manual-validation-notes.md

## Sources And Uncertainty
Primary source:
- OpenClaw discovery report (2026-05-10): agent/research/inbox/2026-05-10-digital-human-manual-openclaw.md

Uncertainty flags:
- HeyGem community/activity and practical viability: weakly evidenced.
- Duix cross-platform maturity and stability: weakly evidenced.
- WeClone standalone project status: unverified.
- Apple Silicon/MPS viability for diffusion-heavy avatar models: unconfirmed and high impact.
