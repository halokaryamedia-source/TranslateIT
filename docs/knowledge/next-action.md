# TranslateIT — Next Action

## Current Status

`PRE-TEST HARDENING + OBSERVABILITY SOURCE COMPLETE / TARGET-WINDOWS ACCEPTANCE TEST NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

The bounded pre-test source hardening queue is complete. Do not add another feature, redesign Meeting/runtime ownership, or resume installer/package implementation before target-Windows evidence identifies a concrete need.

Approved initial product remains:

```text
Meeting
Text
VoiceLab
Settings
```

Installer/package implementation remains explicitly deferred until product/runtime scope is stable enough to re-freeze release inputs.

The previously approved future packaging direction remains deferred context only:

```text
one user-facing automatic fully offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

## P0-1 — VoiceLab Evidence-Based Candidate Selection

### Source implementation complete

Commit `8fae16a7e9c1dad114d070bd91359cdf8b428dd6` removes the implicit `final checkpoint = best candidate` assumption from the canonical GPT-SoVITS provider.

Current bounded behavior is:

```text
accepted guided dataset
→ GPT-SoVITS V2ProPlus training
→ periodic SoVITS/GPT weights
→ at most 3 representative progress candidates
→ same held-out sentences for every candidate
→ speaker-similarity + generated-WAV SHA-256 evidence
→ deterministic evidence ranking
→ materialize only the selected pair
→ user listens to selected previews
→ explicit approval
→ atomic promotion to My Voice
```

With the current 8 SoVITS / 15 GPT epoch configuration, the representative progress pairs resolve to `s2-g5`, `s6-g10`, and `s8-g15`.

Selection uses mean held-out speaker similarity first and minimum held-out similarity as a deterministic tie-break. No absolute quality threshold is treated as product truth; final acceptance remains user listening approval.

Source/syntax and deterministic selection/ranking logic are implemented. Real multi-candidate training time, generated-audio fidelity, similarity behavior, VRAM practicality, and final speaker preference remain target-capable evidence.

## P0-2 — Complete Translation Envelope And Standalone Text Chunking

### Source implementation complete

The canonical worker and Text boundary reconcile the previous `valid input` versus fixed output-budget mismatch without changing Marian models or creating a second translation engine.

Implementation commits:

```text
d78b6b570a2d2e242eff47bef1d56dfb2a060b98
→ bounded translation-envelope helper

ebdee42018fb6909f8c15d9efd9e33c45027de5d
→ canonical worker adaptive generation + standalone paragraph-aware translation

0ca8d24189c352f61f4300a4911b9e01592f1b40
→ Rust Text boundary requires complete/EOS/structured worker result

2f0cbf578038375872e9f98a834d978c78a78a18
→ packaged WorkerRuntime/resource validators include translation_envelope.py
```

Meeting remains one finalized utterance at a time. Existing caller values such as `max_new_tokens: 96` are a bounded floor hint rather than a hard output ceiling. The worker derives the actual generation budget from verified input token count and exposed Marian/tokenizer capacity, keeps `truncation=False`, and rejects generated output whose normal EOS completion cannot be verified.

Standalone Text preserves blank-line paragraph boundaries, splits only when required by the model envelope, translates every chunk through the same canonical ID ↔ EN Marian path, fails the whole request if any required chunk is incomplete, and reassembles one ordered complete result. The plan is bounded to at most 32 translation chunks.

Rust Text requires the worker result to explicitly prove the canonical translation contract, `complete = true`, `finished_with_eos = true`, and `paragraph_structure_preserved = true` before presenting success.

`translation_envelope.py` is included in the existing Tauri release resource map and release validators so the canonical private worker will not lose that source dependency when packaging work is eventually reactivated.

Real Marian quality, target-PC latency, and GPU/CPU performance remain target/runtime evidence.

## P0-3 — Windows Sleep / Hibernate Authority Invalidation

### Source implementation complete

Commit `8ffc6786ba8395782b968c6e9d9c2e540f0d198e` closes the remaining race in the existing Windows power-lifecycle hook.

Current behavior is:

```text
Windows suspend / resume power event
→ inspect current runtime owner
→ if application Meeting owns the session:
     revoke that generation synchronously
     cancel any active Meeting playback via its atomic cancel control
→ return to Windows without waiting on heavy cleanup
→ lifecycle worker invokes canonical Stop Translation
→ Stop releases capture / Meeting Sound / helper / outbound consumer / incoming consumer
→ session remains stopped
```

Handled Windows power transitions are `PBT_APMSUSPEND`, `PBT_APMRESUMECRITICAL`, `PBT_APMRESUMESUSPEND`, and `PBT_APMRESUMEAUTOMATIC`.

The immediate callback establishes only the fail-closed authority/output boundary. Full resource convergence remains owned by the existing idempotent `stop_meeting_translation()` path. Resume repeats Stop convergence only; there is no automatic Start path. Normal minimize/hide is unaffected.

Actual Windows message delivery, CPAL/device behavior through real sleep/wake, cleanup timing around hardware suspension, and successful explicit fresh Start after wake remain target-Windows evidence.

## P1-4 — VoiceLab Dataset Coverage Readiness

### Source implementation complete

Commit `64bcf2d4b849f6144dff5eff5741df24a28c22de` prevents duration-only VoiceLab readiness.

The existing 128 guided English lines are used as five curated material blocks:

```text
Lines   1-24  → short conversational speech
Lines  25-30  → questions and changing intonation
Lines  31-64  → natural varied sentences
Lines  65-96  → names, numbers, dates, or technical details
Lines 97-128  → longer explanations
```

Current readiness is:

```text
minimum 60 seconds usable accepted speech
+
at least 1 accepted usable take from each of the 5 curated blocks
+
no active recording/build conflict
= Create My Voice eligible
```

The 60-second value remains only the existing safety floor; no larger arbitrary recording-minute target was added. Users do not need all 128 lines, and a large number of accepted lines from only one style no longer unlocks training.

When duration is sufficient but variety is incomplete, the existing build status message gives one product-facing next action. The build command reuses the same readiness result and fails closed with `more_recording_needed` if the dataset changes before Start.

Final Voice Actor quality remains owned by held-out generated evidence, evidence-based candidate selection, and explicit user listening approval. Five-block coverage is not itself a claim of speaker fidelity.

## Test-Support Observability

### Source audit complete

Commit `8b0b76f0005adfe300a3390774ec0090d785b4df` exposes existing runtime evidence in `Advanced → Diagnostics` without creating a monitoring subsystem.

The canonical worker already reports:

```text
ASR loaded state / model / device / compute type
selected ASR execution device
loaded translation directions
selected translation execution device
My Voice loaded state / device
CUDA vs CPU/degraded capability truth
```

The Meeting session already records the latest outbound timing stages:

```text
finalization
queue
audio preparation
ASR
translation
My Voice TTS
delivery
total outbound latency
```

Diagnostics now surfaces the test-relevant subset directly:

```text
ASR runtime + device / compute type
Translation loaded directions + selected device
My Voice loaded state + device
latest total outbound latency
latest ASR / translation / My Voice / delivery timing
recent command failures
```

### VRAM measurement boundary

Do **not** add a PyTorch-only allocator number and label it as whole-product VRAM.

TranslateIT currently uses separate GPU runtime ownership:

```text
faster-whisper / ASR → CTranslate2 CUDA allocator
Marian translation   → PyTorch CUDA allocator
GPT-SoVITS My Voice  → PyTorch CUDA allocator
```

Therefore target testing should measure GPU memory from the whole Windows/NVIDIA device view while the real Meeting runtime is loaded. That measurement can capture combined TranslateIT usage plus enough system context to diagnose OOM/VRAM pressure without making the Diagnostics status path initialize or perturb CUDA solely to obtain a number.

No telemetry, monitoring service, automatic model eviction, user-facing GPU control, or second scheduler was added.

## Pre-Test Source Scope — CLOSED

Do not redesign without target evidence:

- Meeting transactional Start / rollback;
- canonical Stop / cleanup ownership;
- generation/stale-work rejection;
- bounded finalized-utterance backlog and freshness preference;
- VoiceLab/Meeting mutual exclusion;
- optional incoming lane separation;
- current WASAPI/CPAL output-loopback approach for Meeting Sound;
- First Setup / Settings feature breadth;
- general History/Saved;
- Pause/Resume;
- Push to Talk;
- tone modes;
- conversation-context prompting;
- Document Translation;
- additional languages;
- installer/package implementation.

A new source change before testing requires one of:

```text
reproducible current source defect
or
target-Windows evidence showing a concrete runtime failure
or
new explicit product decision from the user
```

## R3.2 Release Baseline — Preserved / Deferred

R3.2 remains only the historical release-size baseline. Product/runtime changes and target-test findings may alter the eventual final release input.

```text
Exact optimized Tauri release resources
8,036,451,493 bytes

Measured solid 7z/LZMA2 distribution candidate
4,429,538,835 bytes
```

Do not continue installer work now.

## Target-Windows Acceptance Test — NEXT

The next phase must use the actual target Windows runtime/hardware. Source/static evidence cannot complete these claims.

Test in this order so failures remain attributable:

```text
1. Application / local worker startup
2. Standalone Text ID → EN and EN → ID completeness
3. Microphone selection + Mic Test
4. VoiceLab guided recording / coverage readiness
5. Full VoiceLab training + multi-candidate held-out review
6. Approve My Voice + restart persistence
7. Meeting Start transaction / combined runtime load
8. Outbound ID speech → EN My Voice delivery
9. Optional incoming Meeting Sound EN → ID text
10. Stop / restart / minimize / long-session behavior
11. Sleep / wake + explicit fresh Start
12. Real meeting-app microphone reception
```

Collect only test-relevant evidence:

```text
actual GPU model / driver
whole-device VRAM used/free while Meeting runtime is loaded
Diagnostics loaded ASR / translation / My Voice devices
latest stage timing / total outbound latency
exact blocker/error for failed steps
translation samples that demonstrate semantic/number/name errors
VoiceLab held-out previews and user listening decision
```

Do not tune models, add eviction, change VAD, alter queueing, or add feature scope merely because a metric looks imperfect. First reproduce and identify the failing stage.

## Next Step

**Begin target-Windows acceptance testing from the ordered checklist above. Start with application/worker startup and standalone bidirectional Text, then advance one boundary at a time. Record exact Diagnostics/runtime evidence for failures; do not resume installer work or speculative feature development until target evidence requires a change.**
