# TranslateIT — Next Action

## Current Status

`PHASE 2B BLOCKED ONLY BY FLORES+ GATED ACCESS / NO LMT INFERENCE YET / FROZEN BENCHMARK UNCHANGED / PRODUCTION UNCHANGED / INSTALLER DEFERRED`

Authority:

```text
Local      → current development authority
Developing → historical/recovery only
Target PC  → Windows / RTX 3070 8 GB / CUDA
```

Do **not** modify the production translator, production `model_manifest.json`, production `uv.lock`, Meeting/VoiceLab behavior, or installer during Phase 2.

Durable decisions remain D-025, D-026, and D-027.

## Canonical Translation Target

If accepted, TranslateIT uses exactly one translator/runtime:

```text
NiuTrans/LMT-60-1.7B
revision 2ff175e2a450d2f2458b33234bfb74953468b3a2
PyTorch / Transformers 4.x
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

The same canonical translator serves Standalone Text ID↔EN, Meeting outbound ID→EN, and optional incoming EN→ID. No CTranslate2 translation profile, FlashAttention2 dependency, `torch.compile`, static cache, FP16/INT8/INT4 alternate profile, beam-reduced mode, speculative decoding, second translator, or user-facing quality/speed mode is approved.

M2M100 remains only the pre-migration baseline. If LMT is accepted, M2M100 is retired rather than retained as fallback.

## Frozen Benchmark — Do Not Edit After First LMT Output

```text
tools/translation_quality/benchmark_cases.json
Git blob e33753f2106ea2287bce24052ccd97a08af61236

tools/translation_quality/benchmark_contract.json
Git blob 1b49065ad58b041187b6d69aaa575ecd4d941c7b
```

The 72 stress + 48 sealed-holdout directional cases and promotion rules were critically reviewed and frozen before any LMT output. Any material benchmark change after the first LMT output invalidates the comparison and requires a new contract version plus new unseen holdout material.

## Phase 2 Exact External Pins

FLORES+ is supporting external evidence only, not the sealed holdout.

```text
dataset   openlanguagedata/flores_plus
version   4.6
revision  5fec6c13f9e5a4db2f745d4ec0d7c9721ddc4f06
split     devtest
files     devtest/eng_Latn.jsonl
          devtest/ind_Latn.jsonl
rows      1012 each
license   CC-BY-SA-4.0
access    gated; user access must be granted before Phase 2 inference
```

The Phase 2 probe verifies the pinned README still declares 4.6, both files contain 1012 records, and alignment IDs match **before model inference begins**.

## Current Phase 2B Evidence — External Access Blocker

The first target-Windows run stopped with:

```text
error type  GatedRepoError
HTTP        403 Forbidden
repo        openlanguagedata/flores_plus
reason      authenticated Hugging Face account is not in the authorized list
```

This is an expected external prerequisite failure, not evidence of an LMT/CUDA/BF16/SDPA/DynamicCache defect.

The report contained no environment/GPU/runtime section because the probe intentionally verifies FLORES+ before model acquisition and before LMT inference. Therefore:

```text
LMT output generated       NO
LMT model compatibility    NOT TESTED YET
CUDA/BF16 compatibility    NOT TESTED YET
production modified        NO
benchmark changed          NO
```

Do not bypass this gate by copying FLORES+ from an unverified mirror or by changing the benchmark after the fact. Access must be requested/accepted from the official gated dataset using the same Hugging Face account represented by the local token. If the dataset uses manual approval, wait until access is accepted before rerunning.

## Phase 2 Dev-Only Tooling

```text
tools/translation_quality/run_phase2_lmt_compatibility.ps1
tools/translation_quality/phase2_lmt_compatibility.py
```

These files are evaluation tooling only. They must not be packaged as the production translation path.

Local evaluation state is isolated under:

```text
UserData/CacheData/TranslationQuality/Phase2/
├─ .venv/
├─ flores_plus/
├─ lmt_model/
└─ phase2_lmt_compatibility_report.json
```

The PowerShell wrapper now parses a failed JSON report and surfaces a concise root cause. In particular, `GatedRepoError` is reported as a gated-dataset access prerequisite rather than a generic compatibility failure.

The probe itself still:

1. requires the `Local` branch;
2. creates/reuses an isolated Python 3.12 environment;
3. uses `torch==2.11.0` from CUDA 12.6 and `transformers==4.51.3` only inside that environment;
4. requires Hugging Face authentication and granted FLORES+ access;
5. verifies exact FLORES+ revision/version/count/alignment before any LMT inference;
6. downloads exact LMT revision into evaluation cache, never RuntimeAssets;
7. loads LMT with CUDA + BF16 + explicit native SDPA;
8. runs `use_cache=True` with DynamicCache, beam 5, deterministic generation;
9. verifies official prompt/chat-template rendering, prompt-aware context rejection, continuation-only decoding, and EOS completion;
10. performs one unmeasured warmup and one measured compatibility translation in each direction;
11. records cold load, measured warm translation latency, framework/whole-device VRAM, environment versions, and translated probe text;
12. writes one JSON report and stops before the full benchmark.

This is compatibility proof only. A successful report does **not** authorize production migration or prove general translation quality.

## Target-Windows Command

After official FLORES+ access has been granted to the same Hugging Face account used by the local token, fast-forward `Local` and rerun from:

```text
D:\Work\AI Stuff\TranslateIT
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\translation_quality\run_phase2_lmt_compatibility.ps1
```

Expected evidence:

```text
UserData/CacheData/TranslationQuality/Phase2/phase2_lmt_compatibility_report.json
```

Do not run the full 120-case benchmark until this report has been reviewed.

## Phase 2 Acceptance

Compatibility passes only if the report proves all of the following on the target PC:

```text
exact FLORES+ 4.6 revision verified before inference
eng_Latn / ind_Latn devtest = 1012 aligned rows
exact LMT revision acquired outside RuntimeAssets
Python 3.12
Transformers 4.51.3
CUDA available
BF16 supported
loaded model dtype = BF16
loaded attention implementation = SDPA
DynamicCache generation succeeds with beam 5
official prompt/chat template renders
prompt-aware context limit rejects oversized input before generation
generated continuation is sliced from prompt
continuation ends with known EOS
non-empty translation succeeds ID→EN and EN→ID
cold load / warm latency / VRAM evidence recorded
production_modified = false
```

If any item fails: STOP and diagnose. Do not introduce a second runtime profile automatically.

## Execution Sequence

```text
Phase 0   architecture/model/runtime audit                    DONE
Phase 1   benchmark creation                                 DONE
Phase 1R  critical pre-inference benchmark review            DONE
Phase 2A  compatibility tooling                              DONE
Phase 2B  official FLORES+ access prerequisite               BLOCKED
Phase 2C  target-Windows compatibility run                   NEXT AFTER ACCESS
Phase 3   sequential M2M100 vs LMT frozen benchmark
Phase 4   one final Standalone envelope decision
Phase 5   atomic one-engine M2M100 → LMT production migration
Phase 6   target Windows Text 2A / 2B / 2C acceptance
Phase 7   combined ASR + SAME LMT + My Voice proof
Phase 8   resume Mic / VoiceLab / Meeting acceptance
```

Installer remains deferred until the canonical runtime stack is stable.

## Next Step

**REQUEST/ACCEPT OFFICIAL FLORES+ ACCESS ONLY: while logged into the same Hugging Face account used by the Phase 2 token, request/accept access to `openlanguagedata/flores_plus`. If approval is manual, wait until granted. Then fast-forward `Local` and rerun `tools/translation_quality/run_phase2_lmt_compatibility.ps1` once. Do not change the benchmark, production translator, model manifest, or dependencies while waiting.**
