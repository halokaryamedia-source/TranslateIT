# TranslateIT — Next Action

## Current Status

`PRE-TEST HARDENING — P0-1/P0-2/P0-3 SOURCE IMPLEMENTED / P1-4 NEXT / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

Before full target-Windows acceptance testing, complete only the bounded hardening queue below. The goal is to remove known source-level weaknesses that would otherwise make runtime-test results ambiguous.

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

Standalone Text now preserves blank-line paragraph boundaries, splits only when required by the model envelope, translates every chunk through the same canonical ID ↔ EN Marian path, fails the whole request if any required chunk is incomplete, and reassembles one ordered complete result. The plan is bounded to at most 32 translation chunks.

Rust Text requires the worker result to explicitly prove the canonical translation contract, `complete = true`, `finished_with_eos = true`, and `paragraph_structure_preserved = true` before presenting success.

`translation_envelope.py` is included in the existing Tauri release resource map and release validators so the canonical private worker will not lose that source dependency when packaging work is eventually reactivated.

Real Marian quality, target-PC latency, and GPU/CPU performance remain target/runtime evidence.

## P0-3 — Windows Sleep / Hibernate Authority Invalidation

### Source implementation complete

Commit `8ffc6786ba8395782b968c6e9d9c2e540f0d198e` closes the remaining race in the existing Windows power-lifecycle hook.

The application already used a Windows `WM_POWERBROADCAST` subclass hook and a bounded lifecycle cleanup worker. Previously the power callback only queued canonical `Stop Translation`, so Meeting authority could remain active until that worker ran.

Current behavior is now:

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

Handled Windows power transitions are:

```text
PBT_APMSUSPEND
PBT_APMRESUMECRITICAL
PBT_APMRESUMESUSPEND
PBT_APMRESUMEAUTOMATIC
```

The immediate callback does **not** create another cleanup implementation. It only establishes the fail-closed authority/output boundary. Full resource convergence remains owned by the existing idempotent `stop_meeting_translation()` path.

This means stale AI/TTS work from the pre-suspend generation fails the existing generation-authority guards, and an already-running Meeting playback receives both revoked generation truth and the existing atomic playback cancellation signal.

Resume power events repeat the same invalidation/Stop convergence idempotently. There is no automatic Start path, so wake cannot intentionally resume Translation. Normal minimize/hide is unaffected because it does not enter the Windows power-broadcast path.

### Proof boundary

Source wiring now establishes synchronous authority invalidation before the power callback returns, immediate active-playback cancellation, bounded/nonblocking cleanup handoff, canonical Stop ownership, and no auto-Start path.

This remains **source proof**, not physical sleep/hibernate proof. Actual delivery of the Windows power messages, CPAL/device behavior through real sleep/wake, timing of cleanup around hardware suspension, and successful explicit fresh Start after wake remain target-Windows lifecycle evidence.

Do not add polling, a second lifecycle service, automatic restart, or device-rebind architecture before target evidence shows a separate problem.

## Remaining Pre-Test Hardening Queue

### P1-4 — VoiceLab Dataset Coverage Readiness — NEXT

Keep minimum usable-speech duration as a safety floor, but do not let duration alone make `Create My Voice` ready.

Use the existing guided line set to require small representative coverage across broad categories such as:

- short conversational phrases;
- longer explanatory speech;
- questions / changing intonation;
- names, numbers, dates, or technical wording;
- normal varied sentence structure.

Do not require all 128 lines and do not replace the current floor with another arbitrary large recording-minute target.

Acceptance:

- high duration alone cannot satisfy build readiness;
- accepted takes satisfy a small representative coverage contract;
- UI guidance stays product-facing and non-technical;
- final trained quality remains held-out output + user listening approval.

## Test-Support Observability

Before target-Windows performance testing, use existing Diagnostics first. Add only the smallest missing diagnostic-only visibility needed to interpret failures, potentially including:

```text
loaded ASR runtime/device
loaded translation direction(s)/device
loaded My Voice runtime/device
CUDA availability
GPU/VRAM usage or availability when reliably obtainable
existing per-stage Meeting timing
```

This is not permission to create telemetry, user-facing CUDA/model controls, a monitoring service, automatic model eviction, or another scheduler. VRAM residency strategy changes only if target evidence proves an actual memory problem.

## Already Sufficient for Pre-Test Source Scope

Do not redesign without evidence:

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

After P0/P1 hardening, target-capable testing should determine:

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

**Implement P1-4: VoiceLab dataset coverage readiness. Keep the current minimum usable-speech duration only as a safety floor, then require a small representative coverage contract across the existing guided English material so `Create My Voice` cannot become ready from duration alone. Keep the guidance simple, do not require all 128 lines, and leave final actor quality to held-out generated evidence plus user listening approval.**
