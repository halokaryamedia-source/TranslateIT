---
name: local-ai-runtime-development
description: TranslateIT specialist for the local AI inference/runtime boundary: canonical helper/worker orchestration, ASR, translation, TTS synthesis, model/provider lifecycle, Realtime/Quality execution, CUDA-preferred/CPU-fallback behavior, inference context/tone consumption, and AI capability truth. Do not use for microphone/VAD/device routing, desktop presentation, document parsing, persistence, or packaging.
---

# Local AI Runtime Development

Use after `development-brief` proves that the current acceptance boundary is
local inference/runtime behavior.

## Owns

- canonical local AI helper/runtime orchestration;
- ASR inference;
- text translation inference;
- English TTS synthesis;
- model/provider loading and readiness;
- `Realtime / Quality` inference behavior;
- CUDA-preferred / CPU-fallback execution;
- inference-side context and tone consumption;
- AI capability/error truth and inference-side latency stages.

## Does Not Own

- physical microphone discovery/capture;
- VAD/silence/audio-signal segmentation mechanics;
- speaker/virtual-device/meeting audio delivery;
- desktop navigation, readiness presentation, or user-facing recovery copy;
- installer/package delivery;
- History/Saved persistence or raw-audio retention policy;
- DOCX/PDF/SRT/VTT parsing/format preservation.

## Core Boundary

```text
audio/text input
-> local AI runtime
-> transcript / translated text / generated speech
```

Audio runtime captures/segments/delivers audio. AI runtime understands/transforms
content.

## Current Architecture First

Prefer **one canonical AI runtime orchestration owner**. Do not keep text helper,
voice helper, direct Python spawn, alternate worker, and fallback pipeline active
for the same semantic responsibility without a proved requirement.

Provider/model/framework names are replaceable implementation details. Do not make
a provider-specific name a product contract.

## Domain Rules

- `Realtime` and `Quality` are the canonical modes; do not invent a third active
  `Fast` mode merely to preserve stale naming.
- Prefer one runtime owner with mode-dependent configuration/execution over two
  unrelated engines unless current evidence proves separate engines are required.
- CUDA is preferred, not mandatory. CPU is an approved fallback path.
- CPU fallback handles known capability conditions; do not use broad exception
  fallback to hide unknown failures.
- Cloud fallback is never automatic. A future cloud path requires explicit product
  policy/consent and its own approved boundary.
- Context metadata existing does not prove contextual inference. Context must reach
  and materially inform the actual inference request before claiming contextual
  translation.
- Tone settings existing do not prove tone behavior. The canonical tone value must
  reach the inference/provider contract.
- Model file presence does not prove model load; model load does not prove output
  quality; one sample does not prove product-wide quality/performance.
- Successful AI-stage timing does not equal full meeting latency.
- Separate expected capability conditions (`model_missing`, `cuda_unavailable`,
  `cpu_degraded`) from unexpected runtime failures.

## Input/Output Boundaries

ASR:

```text
Input: valid finalized audio/segment reference
Output: transcript + relevant metadata
```

Translation:

```text
Input: source text, language direction, mode, tone, bounded context when applicable
Output: translated text
```

TTS:

```text
Input: English text + voice/profile selection
Output: generated audio artifact/stream
```

Do not put Windows meeting-device routing into the TTS contract.

## Provider And Model Evaluation

Evaluate a provider/model from the **required capability**, not from popularity or
its repository name.

Before adopting or replacing an ASR, translation, TTS, or voice-profile provider:

1. identify the exact current product capability and acceptance claim;
2. inspect the current provider/runtime owner and determine whether replacement is
   actually necessary;
3. identify the version/current source being evaluated;
4. retrieve current documentation; Context7 may help with version-sensitive
   library/API retrieval when available, but material behavior must be checked
   against official documentation or primary source;
5. compare only criteria relevant to the current stage, including as applicable:
   - required languages/directions and input/output contract;
   - local/offline operation and licensing/commercial constraints;
   - Windows support and production installation assumptions;
   - CPU/CUDA execution, memory/model size, startup/preload behavior;
   - latency/throughput needs for `Realtime` versus `Quality`;
   - quality appropriate to ASR/translation/TTS rather than generic benchmark rank;
   - streaming/batching support when the current runtime actually requires it;
   - dependency/runtime footprint and release-packaging consequences;
   - checkpoint/model acquisition and reproducible build inputs;
   - sample/reference requirements for custom-voice/profile generation;
   - known failure/degraded behavior and observability;
6. prefer extending/replacing the provider inside the existing canonical AI
   runtime owner rather than creating a parallel engine;
7. keep a named provider a candidate until the required evidence supports adoption.

Do not use one provider's convenience API to collapse approved semantic stages. For
example, an ASR system capable of speech translation does not automatically replace
the canonical ASR -> translation boundary when TranslateIT needs separate
translation context/tone control.

Provider evaluation source evidence can narrow a decision, but model quality,
actual CUDA/CPU behavior, latency, and generated audio quality remain local/runtime
claims when those are material acceptance criteria.

## Boundary Examples

If VAD never finalizes speech, use `windows-audio-runtime-development`. If a valid
segment is finalized but ASR does not process it, use this specialist.

If DOCX extraction is broken, this specialist does not own it. If extracted text
is correct but translation context/tone is wrong, this specialist may own it.

## Procedure

1. Ground intended inference behavior from the development brief.
2. Identify the canonical helper/runtime owner and exact stage: ASR, translation,
   TTS, model lifecycle, or execution device.
3. Check for competing active execution paths.
4. If provider/model choice is material, run the bounded provider/model evaluation
   above rather than adopting a named project by default.
5. Separate known capability condition, approved fallback, and unknown failure.
6. Preserve one orchestration path and make the smallest complete change.
7. Run the smallest proof appropriate to the claim.
8. Return to the development-brief acceptance gate.

## Proof

GitHub/static proof can establish request/response wiring, provider selection,
context/tone handoff, mode mapping, fallback policy, orchestration ownership, and
provider capability/documentation evidence.

Model load, CUDA use, CPU usability, ASR output, translation quality, TTS validity,
voice-clone/profile quality, and performance require targeted local/runtime proof
when those are the claims.

## Anti-Slop Boundary

Do not create another AI engine because old code is confusing; parallel helper/
worker paths; automatic cloud fallback; provider-specific product policy; broad
catch-all fallback; CUDA as mandatory app requirement; AI-owned microphone/device
routing; AI-owned persistence; AI-owned desktop UX; or generic provider registries
for hypothetical future integrations.
