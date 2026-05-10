# OpenClaw Daily Discovery Report

Date: 2026-05-10
Topic: digital-human-manual
Owner: OpenClaw
Scope: public research only

## Summary

The digital-human open-source landscape has shifted meaningfully since early-to-mid 2025. Several Tencent-backed projects (HunyuanVideo-Avatar, MuseTalk) are now public with code and weights. SadTalker remains a mature, widely-used talking-head option. Key constraints for local Mac mini deployment remain significant: most pipelines require CUDA/NVIDIA GPU, and Apple Silicon support is not yet native for the core diffusion-based models. The gap between "cloud-hosted digital human API" and "local Mac mini workflow" is still large — but concrete building blocks exist to narrow it.

---

## New Signals

- **May 2026**: AVAATR (Soralios) launched — a commercial "Better Self" digital cloning platform, positioning itself as a next-generation alternative to Delphi.ai. Not open source. No Mac mini signal.
- **March 2026**: LHM++ (Large Animatable Human Model) open-sourced — supports 8-view input on 8GB GPU memory. Relevant for 3D avatar work, but still CUDA-dependent.
- **May 2025**: Tencent released HunyuanVideo-Avatar with full inference code and model weights. Audio-driven talking avatar from a single portrait image + audio clip. Multi-character support. Open-source plan active.
- **MuseTalk 1.5** (2025 update): Real-time lip-sync model achieving 30+ FPS on NVIDIA V100. Now has ComfyUI integration and a production-ready REST API fork (ruxir-ig/MuseTalk-API with Docker support).
- **HeyGem.ai** surfaced on GitHub —声称fully offline video synthesis tool targeting Windows. Open source with claimed voice/appearance cloning. Chinese-language repo; community sizing uncertain.
- **WeClone** mentioned in LlamaFactory context — one-stop solution for creating digital avatar from chat logs. Unclear if this is a standalone project or feature.

---

## Projects / Links

### 1. HunyuanVideo-Avatar
- **Link**: https://github.com/tencent-hunyuan/hunyuanvideo-avatar | https://huggingface.co/tencent/HunyuanVideo-Avatar
- **Type**: GitHub / paper / open-source model
- **Why it matters**: Tencent's audio-driven talking avatar from single image + audio. Multi-character animation. Released May 28, 2025 with full inference code and model weights on Hugging Face. Part of a larger open-source family (HunyuanVideo, HunyuanImage-3.0).
- **Local feasibility**: Requires CUDA. Single-GPU inference possible with low-VRAM mode (~10GB via TeaCache/Wan2GP). No Apple Silicon/MPS support documented. Linux-only installation guide.
- **Mac mini fit**: Not directly. CUDA required; Apple MPS not confirmed working. Could run if Docker/Linux environment with NVIDIA GPU present, but Mac mini context makes this near-impossible.
- **GPU/cloud requirement**: NVIDIA GPU (CUDA 11.8/12.4). Single-GPU low-VRAM mode exists (~10GB). Cloud inference required for Mac mini native.
- **Confidence**: High — public repo, active commit history, arXiv paper, Hugging Face weights posted. Commercial Tencent backing.

---

### 2. MuseTalk
- **Link**: https://github.com/TMElyralab/MuseTalk | https://huggingface.co/TMElyralab/MuseTalk
- **Type**: GitHub / open-source model
- **Why it matters**: Real-time lip-sync at 30+ FPS on NVIDIA V100. 5.7k GitHub stars, 812 forks. Version 1.5 improves visual quality vs lip-sync accuracy balance. ComfyUI integration exists. MuseTalk-API fork adds Docker + REST API for production use.
- **Local feasibility**: Designed for NVIDIA GPU. Whisper-tiny for audio encoding (can run on CPU). Stable Diffusion UNet architecture — could theoretically run on Apple Silicon via MPS with effort, but not tested/verified.
- **Mac mini fit**: Lip-sync component (Whisper + UNet) is the bottleneck. Real-time performance (30+ FPS) requires CUDA. On Mac CPU/GPU, expect much lower FPS — likely <5 FPS.
- **GPU/cloud requirement**: NVIDIA GPU strongly preferred for real-time. CPU fallback exists but non-real-time.
- **Confidence**: High — active repo (last update April 2025), active community, clear documentation. Multiple forks and third-party integrations.

---

### 3. SadTalker
- **Link**: https://github.com/OpenTalker/SadTalker | https://sadtalker.ai/ | https://github.com/liutaocode/talking-face-arxiv-daily
- **Type**: GitHub / paper (CVPR 2023) / tutorial
- **Why it matters**: Mature, well-documented talking head animation from single image + audio. One of the most cited works in the space. Available via Hugging Face Spaces and Google Colab for no-setup testing. The arxiv-daily repo tracks 2,770 commits of related papers — active research field.
- **Local feasibility**: Can run locally via pip install. Some components CPU-friendly. Quality lower than diffusion-based alternatives.
- **Mac mini fit**: Reasonable — Python-based, documented Colab path. Real-time not confirmed but batch inference works.
- **GPU/cloud requirement**: GPU speeds it up significantly. CPU-only is viable for lower-quality/async use cases.
- **Confidence**: High — established project, heavy citation, active maintenance. Widely referenced in tutorials.

---

### 4. Duix-Avatar / Duix-Mobile
- **Link**: https://github.com/duixcom/Duix-Avatar | https://github.com/duixcom/Duix-Mobile
- **Type**: GitHub / SDK
- **Why it matters**: Claims to be "truly open-source AI avatar" with offline video generation and digital human cloning. Duix-Mobile is an SDK for real-time interactive AI avatars on mobile devices.
- **Local feasibility**: Desktop version Docker-based (Windows primary). Mobile SDK available. True cross-platform native not confirmed.
- **Mac mini fit**: Docker + Windows target — not Mac-native. Mobile SDK could work on iOS but no Metal/Core ML signal.
- **GPU/cloud requirement**: Desktop version requires decent GPU via Docker. Mobile version targets mobile hardware.
- **Confidence**: Medium — open-source claim is there, but community sizing unclear. Chinese-language primary documentation.
- **Uncertainty**: License says free for commercial use but enterprise restrictions apply. Real-world adoption/stability unverified.

---

### 5. HeyGem.ai
- **Link**: https://github.com/botoai/HeyGem.ai
- **Type**: GitHub / open-source (claimed)
- **Why it matters**: Claims fully offline video synthesis for Windows, precise appearance and voice cloning. Chinese-language repo.
- **Local feasibility**: Windows-only based on repo description. No Mac build.
- **Mac mini fit**: None — Windows target explicitly.
- **GPU/cloud requirement**: Unknown. Assumed NVIDIA GPU.
- **Confidence**: Low — limited community visibility, no clear stars/commit activity visible from public search. Windows focus makes it irrelevant for Mac mini pipeline unless dual-boot considered.
- **Uncertainty**: Cannot verify repo activity or community size from available data.

---

### 6. Linly-Talker
- **Link**: https://github.com/Kedreamix/Linly-Talker
- **Type**: GitHub / digital human system
- **Why it matters**: Digital human conversational system integrating LLMs, TTS, and talking avatar. Chinese project. Combines multiple AI components in one pipeline.
- **Local feasibility**: Python-based, likely runs on Linux/CUDA. Apple Silicon MPS not verified.
- **Mac mini fit**: Unlikely to be Mac mini optimized. LLM component will be heavy without GPU.
- **GPU/cloud requirement**: CUDA assumed.
- **Confidence**: Medium — GitHub repo exists but community sizing unclear.

---

### 7. MuseV
- **Link**: https://github.com/TMElyralab/MuseV
- **Type**: GitHub / video generation
- **Why it matters**: Virtual human video generation model from the same lab as MuseTalk. Intended to be combined with MuseTalk as a complete pipeline. Gradio interface available.
- **Local feasibility**: CUDA-required diffusion model. MuseTalk can lip-sync MuseV output.
- **Mac mini fit**: Not directly compatible.
- **GPU/cloud requirement**: NVIDIA GPU required.
- **Confidence**: Medium — same org as MuseTalk, active development.

---

### 8. Wav2Lip + extensions
- **Link**: https://github.com/Rudrabha/Wav2Lip (primary repo)
- **Type**: GitHub / lip-sync
- **Why it matters**: Long-standing GAN-based lip-sync. Wav2Lip HD and CodeFormer extensions improve quality. Multiple language support. Widely used in production.
- **Local feasibility**: Can run on CPU with reduced speed. Python-based, well-documented.
- **Mac mini fit**: Moderate — batch processing possible, real-time challenging on CPU.
- **GPU/cloud requirement**: GPU greatly preferred but not strictly required.
- **Confidence**: High — mature project, heavily forked, production-proven.

---

## Practical Constraints

1. **CUDA dependency is the dominant barrier.** HunyuanVideo-Avatar, MuseTalk, MuseV, HeyGem, Linly-Talker all require NVIDIA CUDA. Apple Silicon MPS support is not documented for any of the diffusion-based models in this space.

2. **Mac mini M4 memory ceiling.** Even if MPS could be forced to run, models like HunyuanVideo-Avatar need ~10GB VRAM for low-VRAM mode. The unified memory Mac mini (up to 64GB) could in theory fit this — but MPS performance and correctness are unverified. No confirmed successful runs on Apple Silicon.

3. **Multi-stage pipeline complexity.** A complete digital human workflow typically needs: speech-to-text (Whisper) → LLM response → TTS → avatar animation. Each stage is a separate model. Chaining them with acceptable latency on local Mac mini is non-trivial.

4. **Real-time vs batch.** MuseTalk claims 30+ FPS on V100 — but that's lip-sync only, not the full pipeline. Full pipeline (LLM + TTS + avatar generation) at real-time requires either very fast TTS/avatar or a cloud fallback for heavy components.

5. **Container/platform gap.** Duix-Avatar requires Docker/Windows. HeyGem targets Windows. Most serious open-source options are Linux/CUDA first.

6. **Avatar quality vs local feasibility.** Best-quality results (diffusion-based, Tencent models) require CUDA. CPU-friendly alternatives (SadTalker, Wav2Lip) have lower quality. This is the core trade-off for Mac mini deployment.

---

## Possible Actions

- **Verify Apple Silicon / MPS compatibility** for SadTalker and Wav2Lip as the most feasible Mac-native options; run benchmarks on M4 Mac mini.
- **Investigate MuseTalk CPU fallback path** — Whisper-tiny encoder runs on CPU, but UNet generation on MPS is the unknown. Test actual FPS on M4 unified memory.
- **Map the LLM + TTS stage** for a Mac mini local pipeline — which LLMs (via Ollama/MLX) and TTS engines run well on M4, and can they feed into SadTalker/MuseTalk?
- **Assess commercial API fallbacks** for heavy diffusion stages — if HunyuanVideo-Avatar or MuseTalk need cloud GPU anyway, understand what cloud options are cost-effective for the project's scale.
- **Check HeyGem.ai repo activity** (stars, commits, open issues) to determine if it's a viable alternative or abandoned.
- **Inventory Duix-Avatar's actual cross-platform support** — whether the mobile SDK (Duix-Mobile) has iOS/Mac targets or Core ML conversion.
- **Explore ComfyUI integrations** for the MuseTalk/SadTalker pipeline — ComfyUI has growing Apple Silicon support and could be a UI layer for the pipeline.
- **Determine if a hybrid approach** (local TTS + lip-sync + cloud video generation) would meet quality requirements at acceptable cost/latency.

---

## Source Notes / Uncertainty

- **HeyGem.ai**: Cannot verify GitHub stars, commit activity, or community size from public research. Windows-only claim is from search snippet, not verified first-party docs.
- **Duix-Avatar**: Cross-platform status unclear. Mobile SDK exists; desktop version is Docker/Windows. Real-world stability/adoption unverified.
- **Apple Silicon/MPS compatibility**: None of the diffusion-based models (HunyuanVideo-Avatar, MuseTalk, MuseV) have confirmed Apple Silicon runs. This is the biggest open question for Mac mini feasibility.
- **MuseTalk REST API fork** (ruxir-ig/MuseTalk-API): Dockerized, production-ready REST API — may be the best path for containerized deployment if NVIDIA GPU is available in the project stack.
- **Linly-Talker**: Community size and activity level unconfirmed. Chinese project may have documentation primarily in Chinese.
- **WeClone**: Mentioned in LlamaFactory context but not independently verified as a standalone project with public code.
