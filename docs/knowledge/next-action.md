# TranslateIT — Next Action

## Current Status

`PHASE 3 TOOLING READY / TARGET-WINDOWS SEQUENTIAL M2M100→LMT RUN NEXT / FROZEN BENCHMARK LOCKED / NO PRODUCTION SWITCH / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / NVIDIA GeForce RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer before the frozen Phase 3 comparison is reviewed.

Durable decisions remain D-025, D-026, and D-027.

## Canonical Translation Target

If accepted, TranslateIT uses exactly one translation model/runtime:

```text
NiuTrans/LMT-60-1.7B
revision 2ff175e2a450d2f2458b33234bfb74953468b3a2
PyTorch / compatible Transformers 4.x
CUDA / BF16
AutoModelForCausalLM
official LMT translation prompt + chat template
num_beams=5
do_sample=False
use_cache=True / DynamicCache
native PyTorch SDPA
resident model
model.eval() + torch.inference_mode()
```

The same canonical translator serves Standalone Text ID↔EN, Meeting outbound ID→EN, and optional incoming EN→ID. No second translator, fallback router, quality/speed profile, CTranslate2 translation backend, external FlashAttention2 dependency, `torch.compile`, static full-context cache, FP16/INT8/INT4 alternate mode, beam-reduced mode, or speculative decoding is approved.

M2M100 remains only the current pre-migration baseline and Phase 3 sequential comparison reference. If LMT is accepted, M2M100 is retired from the production manifest/runtime/release path rather than retained as fallback.

## Frozen Benchmark — Immutable After First LMT Output

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The benchmark was frozen and critically reviewed before any LMT output was generated. LMT output now exists from Phase 2 compatibility probes, therefore the frozen stress/holdout source text, references, semantic requirements, counts, and promotion rules must not be edited for this comparison round. A material later benchmark change requires a new contract version and new unseen holdout material.

Frozen product evaluation:

```text
historical regression         7 directional cases
semantic stress              72 directional cases
sealed holdout               48 directional cases
product semantic total      120 directional cases
external FLORES+           1012 rows per direction
```

## Phase 2 Target-Windows Compatibility Evidence — PASS

Evidence source:

```text
UserData/CacheData/TranslationQuality/Phase2/phase2_lmt_compatibility_report.json
schema translateit.phase2_lmt_compatibility.v1
ok = true
production_modified = false
```

### Exact external reference proof

```text
FLORES+ repo       openlanguagedata/flores_plus
version            4.6
revision           5fec6c13f9e5a4db2f745d4ec0d7c9721ddc4f06
eng_Latn devtest   1012 rows
ind_Latn devtest   1012 rows
alignment IDs      verified equal/in-order
```

### Environment / GPU proof

```text
Python             3.12.10
PyTorch            2.11.0+cu126
Transformers       4.51.3
CUDA runtime       12.6
CUDA available     true
BF16 supported     true
GPU                NVIDIA GeForce RTX 3070
VRAM total         8191.5 MiB
compute capability 8.6
```

### Exact approved runtime proof

```text
backend             pytorch_transformers
device              cuda
dtype               torch.bfloat16
attention           sdpa
use_cache           true
cache implementation dynamic
num_beams           5
do_sample           false
```

### Load / memory evidence

```text
cold load                         2317.84 ms
whole-device VRAM before load      818 MiB
whole-device VRAM after load      4259 MiB
whole-device VRAM after probes    4361 MiB
framework allocated after load   3282.25 MiB
framework peak after load        3282.25 MiB
framework peak during probes     3329.76 MiB
framework allocated after probe  3290.38 MiB
```

Observed whole-device increase from pre-load to post-probe was about 3543 MiB. Translation-only state therefore fits the target 8 GB GPU with material remaining headroom, but this does **not** prove the later combined ASR + LMT + My Voice stack fits; that remains Phase 7 evidence.

### Context / completion proof

```text
model context                    32768 tokens
synthetic rendered prompt       120024 tokens
generation budget                   96 tokens
oversized input rejected before generation = true
continuation-only decode verified
known EOS completion verified in both directions
```

### Compatibility translation probes

ID → EN:

```text
source      Selamat pagi. Tolong simpan file ini di komputer lokal.
output      Good morning. Please save this file on your local computer.
prompt      39 tokens
generated   13 tokens including EOS
warm time   262.39 ms
EOS         true
```

EN → ID:

```text
source      Good morning. Please keep this file on the local computer.
output      Selamat pagi. Tolong simpan file ini di komputer lokal Anda.
prompt      35 tokens
generated   18 tokens including EOS
warm time   356.49 ms
EOS         true
```

The generated wording is semantically plausible and natural for these two smoke probes. These two outputs are **not** general translation-quality acceptance and must not be used to tune the frozen holdout.

The generation message `Setting pad_token_id to eos_token_id:151643 for open-end generation` was informational during these probes and did not prevent deterministic completion/EOS proof. It is not currently a compatibility blocker.

## Phase 2 Interpretation

Phase 2 passes the exact compatibility boundary requested:

```text
pinned FLORES+ reference verified          PASS
pinned LMT acquired outside RuntimeAssets  PASS
Python / Transformers isolated contract    PASS
CUDA                                       PASS
BF16                                       PASS
native SDPA                                PASS
DynamicCache                               PASS
beam 5 deterministic generation            PASS
official prompt/chat-template path         PASS
prompt-aware context rejection             PASS
continuation-only decoding                 PASS
EOS completion                             PASS
ID→EN non-empty translation                PASS
EN→ID non-empty translation                PASS
cold load / warm latency / VRAM recorded   PASS
production modified                        NO
```

Early latency is encouraging: the two short LMT smoke probes measured 262.39 ms and 356.49 ms after warmup. Do **not** directly declare LMT faster/slower than M2M100 from these two cases; previous M2M evidence used different representative/segmented requests. Phase 3 owns the apples-to-apples latency comparison using identical frozen inputs and procedure.

## Phase 3 Boundary

Phase 3 must compare only:

```text
current M2M100 baseline
vs
single approved LMT-60-1.7B runtime
```

Sequential fresh processes only; never two production engines simultaneously.

Required evidence under the frozen contract:

```text
1. 7 historical regression cases
2. 72 semantic stress directional cases
3. 48 sealed holdout directional cases
4. FLORES+ 1012 rows per direction
5. chrF++ primary external reference metric
6. BLEU secondary external metric
7. COMET supplementary/non-blocking
8. deterministic protected-literal diagnostics
9. human semantic severity review
10. blind naturalness review after semantic safety passes
11. short / medium / long warm p50 / p90 / max latency
12. cold load and VRAM/memory stability
```

Promotion rules remain controlled by the frozen benchmark contract; metrics cannot override a demonstrated critical semantic error.

## Phase 3 Dev-Only Tooling

```text
tools/translation_quality/run_phase3_translation_benchmark.ps1
tools/translation_quality/phase3_translation_benchmark.py
tools/translation_quality/phase3_lmt_worker.py
```

The Phase 3 design deliberately avoids reimplementing the M2M baseline. The baseline process is the current canonical `realtime_local_worker.py` launched through the current WorkerRuntime Python authority, so its M2M tokenizer/generation/completion behavior is the actual product baseline. After that process exits, the approved LMT candidate is launched through the already-proven Phase 2 isolated environment.

One run performs:

```text
canonical M2M100 worker
→ frozen product + FLORES outputs
→ short/medium/long 5 warmups + 30 measured requests
→ process exit / GPU release

then

isolated LMT worker
→ the SAME frozen product + FLORES inputs
→ the SAME performance case IDs / run counts
→ process exit

then

SacreBLEU 2.6.0 only
→ chrF++ + BLEU by direction
→ paired bootstrap, 1000 resamples, seed 12345
→ protected-literal diagnostics
→ blind semantic/naturalness review packs
```

Comparable latency is recorded as complete request-wall time from request send through JSON translation response, so both engines are measured at the same translation-stage boundary. LMT also retains its internal CUDA-synchronized inference timing in the response. This does not claim full Meeting latency.

COMET is **not removed from the frozen contract**. Because it is supplementary/non-blocking, it is deferred until the semantic severity review shows the candidate is safe enough to justify the additional evaluation compute. Blind naturalness is likewise not scored before semantic safety. This avoids spending extra work on a candidate that already fails the primary semantic gate.

Phase 3 outputs are isolated under:

```text
UserData/CacheData/TranslationQuality/Phase3/
├─ phase3_m2m100_results.json
├─ phase3_lmt_results.json
├─ phase3_automatic_comparison.json
├─ phase3_semantic_review_pack.jsonl
├─ phase3_naturalness_review_pack.jsonl
├─ phase3_blind_review_key.json
└─ metrics/
```

`automatic_run_complete = true` means only that the deterministic translation/metric collection completed. It is **not** a model-quality pass and does not authorize production migration.

## Execution Sequence

```text
Phase 0   architecture/model/runtime audit                    DONE
Phase 1   benchmark creation                                 DONE
Phase 1R  critical pre-inference benchmark review            DONE
Phase 2A  compatibility tooling                              DONE
Phase 2B  FLORES+ access                                     DONE
Phase 2C  target-Windows LMT compatibility proof             PASS
Phase 3A  tooling / deterministic automatic evidence          DONE
Phase 3B  target-Windows sequential benchmark run                NEXT
Phase 3C  semantic severity review; COMET/naturalness if safe
Phase 4   one final Standalone envelope decision
Phase 5   atomic one-engine M2M100 → LMT production migration
Phase 6   target Windows Text 2A / 2B / 2C acceptance
Phase 7   combined ASR + SAME LMT + My Voice proof
Phase 8   resume Mic / VoiceLab / Meeting acceptance
```

Installer remains deferred until the canonical runtime stack is stable.

## Stop Conditions

Stop/review if Phase 3 shows any of the following:

```text
LMT sealed-holdout CRITICAL semantic error
incomplete/truncated generation promoted as success
material direction/category semantic regression
unstable/OOM translation runtime
practical target latency failure under identical frozen inputs
benchmark provenance/integrity problem
a proposed fix requires phrase-specific rewriting, second translator, or alternate production profile
```

## Next Step

**PHASE 3B ONLY: fast-forward `Local`, then run `tools/translation_quality/run_phase3_translation_benchmark.ps1` once on the target RTX 3070. Return `UserData/CacheData/TranslationQuality/Phase3/phase3_automatic_comparison.json` for review. Do not edit the frozen benchmark, do not run production migration, and do not open the blind-review key before semantic review.**
