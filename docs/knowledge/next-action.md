# TranslateIT — Next Action

## Current Status

`PRODUCTION M2M100-418M UNCHANGED / TRANSLATEGEMMA NO LONGER ACTIVE / MILMMT-46 v1.0 1B + 4B SELECTED FOR ONE REPRESENTATIVE REALTIME A/B / NO SHORT-CIRCUIT / NO SINGLE-ERROR REJECTION / NO AUTOMATIC MODEL 3`

Authority:

```text
Local      → current development authority
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

## Decision Boundary

The earlier rejection-only modality prescreen was useful for surfacing a semantic weakness but was too aggressive as a whole-model selection decision. Do not continue model hopping from one crafted failure.

From this point, translation selection is based on representative product behavior:

```text
current production M2M100-418M
vs
MiLMMT-46-1B-v1.0 BF16
vs
MiLMMT-46-4B-v1.0 INT8
```

TranslateGemma is no longer an active challenger. Preserve its report as historical evidence; do not use its single `should -> harus` finding as a standalone model-rejection rule.

## Why MiLMMT v1.0

Official Xiaomi v1.0 was released in August 2026 and builds on Gemma 3 with multilingual continual pretraining, supervised fine-tuning, reinforcement learning and checkpoint merging. Indonesian and English are supported. Published v1.0 results report improvement over the earlier SFT model and strong recent open translation baselines including TranslateGemma. These are positive candidate signals, not production acceptance.

## Practical Candidate Configurations

```text
MiLMMT-46-1B-v1.0
  official Xiaomi checkpoint
  BF16
  AutoModelForCausalLM
  official Xiaomi translation prompt
  deterministic generation

MiLMMT-46-4B-v1.0
  official Xiaomi checkpoint
  bitsandbytes LLM.int8
  non-quantized compute BF16
  AutoModelForCausalLM
  official Xiaomi translation prompt
  deterministic generation
```

No Q4/GGUF/community checkpoint, routing, fallback profile or phrase-specific output repair is part of this comparison.

## Representative Realtime A/B

Owner files:

```text
tools/translation_quality/realtime_use_cases.json
tools/translation_quality/milmmt_realtime_worker.py
tools/translation_quality/realtime_translation_ab.py
tools/translation_quality/run_milmmt_realtime_ab.ps1
```

The comparison uses 24 representative Meeting/Text utterances:

```text
12 Indonesian -> English
12 English -> Indonesian

status updates
client deadlines
clarification/corrections
professional disagreement
conditional planning
technical handoff
numbers/IP/version facts
schedule
branch instructions
code switching
questions
scope constraints
natural recommendation/prohibition context
```

Rules:

- every candidate runs all 24 cases unless the runtime itself cannot run;
- no semantic short-circuit;
- one minor/major wording issue is never an automatic candidate rejection;
- references are review anchors, not exact-output assertions;
- record completion, literal preservation, chrF++/BLEU as supporting signals, request wall-time p50/p90, load/VRAM evidence and all raw translations;
- final quality decision requires aggregate human semantic/factual/naturalness review;
- newer release date alone cannot authorize migration.

## Decision Rule After A/B

```text
MiLMMT candidate clearly improves representative semantic/factual/naturalness quality
AND latency/VRAM are practical
→ candidate may proceed to final production migration proof.

Improvement is marginal, mixed, or operationally too expensive
→ retain M2M100-418M and STOP model search.

Both MiLMMT candidates are materially poor
→ do not automatically download another model; require a new explicit decision first.
```

Production `model_manifest.json`, production worker behavior, Meeting/VoiceLab behavior and installer remain unchanged during this comparison.

## Next Step

**Fast-forward `Local` and run `tools/translation_quality/run_milmmt_realtime_ab.ps1` once. First run downloads and exact-revision-pins the official Xiaomi MiLMMT-46-1B-v1.0 and MiLMMT-46-4B-v1.0 checkpoints. Return/upload `UserData/CacheData/TranslationQuality/MiLMMTRealtimeAB/milmmt_realtime_ab_report.json` or `milmmt_realtime_ab_review.md`. Do not migrate production or download another model before aggregate review.**
