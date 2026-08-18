# TranslateIT — Next Action

## Current Status

`PRE-TEST HARDENING — P0-1/P0-2/P0-3/P1-4 SOURCE IMPLEMENTED / OBSERVABILITY CHECK NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

The bounded pre-test hardening queue is source-complete through P1-4. Before full target-Windows acceptance testing, perform only the minimum Diagnostics/observability check needed to interpret hardware/runtime failures. Do not reopen installer work or add deferred product features.

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

VoiceLab no longer treats accepted duration plus a small take count as sufficient build readiness.

The existing 128 guided English lines are already curated in five contiguous material blocks. Build readiness now uses those existing line-ID blocks directly rather than inventing word-count or text-regex heuristics:

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

When duration is sufficient but variety is incomplete, the existing build status message gives one product-facing next action such as `Try one accepted line from Lines 25-30 for questions and changing intonation.` The normal UI now surfaces that canonical guidance instead of showing only a generic `record more` message.

The build command reuses the same readiness result and fails closed with `more_recording_needed` if the dataset changes before Start. No new VoiceLab state store, scoring metric, training engine, or quality threshold was added.

Regression coverage protects the two material invariants:

- many accepted lines from a single curated block do not satisfy variety;
- one accepted line from each curated block satisfies the variety portion of readiness.

Final Voice Actor quality remains owned by the existing held-out generated evidence, evidence-based candidate selection, and explicit user listening approval.

### Proof boundary

The source contract now prevents duration-only readiness and provides bounded product-facing variety guidance. This does **not** prove that five-block coverage is sufficient for every real speaker, nor does it prove trained audio fidelity. Actual speaker quality remains target-capable VoiceLab evidence and should tune this contract only if real test results justify a change.

## Test-Support Observability — NEXT

Before target-Windows performance testing, use existing Diagnostics first. Add only the smallest missing diagnostic-only visibility needed to interpret failures, potentially including:

```text
loaded ASR runtime/device
loaded translation direction(s)/device
loaded My Voice runtime/device
CUDA availability
GPU/VRAM usage or availability when reliably obtainable
existing per-stage Meeting timing
```

This is not permission to create telemetry, user-facing CUDA/model controls, a monitoring service, automatic model eviction, or another scheduler. If existing Diagnostics already exposes enough reliable information, make no source change and proceed to target testing.

## Already Sufficient for Pre-Test Source Scope

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

## R3.2 Release Baseline — Preserved / Deferred

R3.2 remains only the current historical release-size baseline; pre-test product/runtime changes can alter the eventual final release input.

```text
Exact optimized Tauri release resources
8,036,451,493 bytes

Measured solid 7z/LZMA2 distribution candidate
4,429,538,835 bytes
```

Do not continue installer work now.

## Target Test After Hardening

After the observability check, target-capable testing should determine:

```text
microphone capture / VAD segmentation
ID → EN ASR + translation quality
EN → ID Text/incoming quality
VoiceLab multi-candidate training success and speaker fidelity
My Voice persistence after restart
ASR + translation + My Voice combined VRAM practicality
outbound end-to-end latency
Meeting Microphone delivery in real meeting applications
optional Meeting Sound capture/suppression
Stop / Close / sleep / wake lifecycle
long-session memory/thread/queue stability
standalone Text completeness
```

Installer/package remains deferred until product/runtime results and any resulting product changes are stable enough to freeze release inputs again.

## Next Step

**Audit the existing Advanced → Diagnostics output against the minimum test-support list above. Add only genuinely missing, reliable diagnostic visibility needed to interpret target-Windows failures—especially combined runtime device/VRAM truth if it is not already available. If current Diagnostics is already sufficient, make no change and proceed to target-Windows acceptance testing.**
