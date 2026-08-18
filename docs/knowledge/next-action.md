# TranslateIT — Next Action

## Current Status

`PRE-TEST HARDENING APPROVED — IMPLEMENTATION QUEUE ACTIVE / INSTALLER DEFERRED`

Current repository authority:

```text
Local      → current development authority
Developing → GitHub default branch; retained historical/recovery only
```

## Active Boundary

Before full target-Windows acceptance testing, implement only the bounded hardening items below. The purpose is to remove known source-level weaknesses that would otherwise make runtime-test results ambiguous.

Do **not** broaden this into general feature expansion. The approved initial product remains:

```text
Meeting
Text
VoiceLab
Settings
```

Installer/package implementation remains explicitly deferred until product scope is stable again.

The previously approved future packaging boundary is preserved only as deferred context:

```text
one user-facing automatic fully offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

## Pre-Test Hardening Implementation Queue

### P0-1 — VoiceLab evidence-based candidate selection

Current training effectively promotes the final produced GPT/SoVITS checkpoint pair into held-out evaluation. That is not sufficient for the quality-first product contract because a later checkpoint is not automatically the best speaker/quality result.

Implement a **small bounded candidate-selection flow**:

```text
training
→ retain a small justified candidate set
→ generate the same held-out evaluation sentences per candidate
→ collect comparable generated-speech evidence
→ rank/select the best candidate using actual evidence
→ present the selected candidate for user listening
→ explicit user approval
→ atomic promotion to My Voice
```

Requirements:

- do not keep every epoch merely because it exists;
- do not assume the final epoch is best;
- keep checkpoint/candidate count bounded;
- use the same held-out sentences for fair comparison;
- automatic evidence may rank/select a candidate, but must not replace final user listening approval;
- the previous approved My Voice remains intact until a new candidate is explicitly approved;
- no new TTS engine/provider/runtime.

Acceptance:

- VoiceLab can produce more than one bounded candidate when training evidence warrants it;
- held-out generated evidence belongs to the exact candidate being evaluated;
- the candidate presented for approval is selected from that evidence rather than implicitly from training order;
- user approval remains mandatory before promotion.

### P0-2 — Complete translation envelope and standalone Text chunking

Current Text accepts up to 2,000 characters while standalone translation uses a fixed generation budget that may be too small for some otherwise valid inputs. The worker correctly rejects incomplete output, but the accepted input envelope and guaranteed output envelope must be reconciled before testing.

Implement two related corrections.

#### A. Meeting utterance translation

- keep Meeting translation scoped to one finalized utterance at a time;
- replace the inherited fixed output budget with a **bounded adaptive generation budget** derived from the actual request/model capacity;
- never silently truncate source text;
- never promote output that did not complete with the model's valid completion boundary;
- do not introduce document-style chunking into Meeting speech.

#### B. Standalone Text

Implement **safe paragraph-aware chunking** for valid longer Text input:

```text
user text
→ preserve paragraph/order boundaries
→ split only when required by the model envelope
→ translate every chunk through the same canonical ID ↔ EN model path
→ fail explicitly if any required chunk is incomplete
→ reassemble in original order while preserving paragraph structure
```

Requirements:

- no silent source truncation;
- no partial-success result presented as complete;
- no automatic conversation/history context;
- no second translation engine;
- preserve ordinary paragraph separation instead of flattening all input into one whitespace stream;
- keep the UI limit truthful and aligned with what the runtime can actually complete.

Acceptance:

- every UI-accepted Text input either returns one complete ordered translation or one explicit bounded failure;
- paragraph structure is preserved at the supported boundary;
- Meeting utterances remain low-latency finalized-utterance translation rather than document translation.

### P0-3 — Windows sleep / hibernate authority invalidation

The product requirement already states that Windows sleep/hibernate must invalidate an active Meeting and voice output must not silently resume after wake. Current safe-close handling is present, but suspend/resume ownership must be implemented before lifecycle testing.

Implement a Windows lifecycle boundary such that:

```text
Meeting Live
→ Windows suspend / hibernate
→ revoke current Meeting output authority
→ stop/cancel owned audio + helper/output work through canonical cleanup ownership
→ preserve truthful cleanup state if cleanup cannot be fully confirmed
→ Windows resume
→ remain stopped / Setup Needed or Ready as appropriate
→ require a new explicit Start Translation
```

Requirements:

- no automatic voice-output resume after wake;
- no reuse of a stale Meeting generation;
- no duplicate lifecycle owner outside the existing Meeting/runtime authority;
- reuse canonical Stop/cleanup semantics where possible rather than creating a second cleanup implementation;
- minimize/hide without Windows suspend must continue to preserve a healthy Meeting as currently required.

Acceptance:

- suspend invalidates current Meeting authority;
- stale pre-suspend work cannot deliver after resume;
- resume does not auto-start Translation;
- user can explicitly start a fresh Meeting after the runtime/devices are ready again.

### P1-4 — VoiceLab dataset coverage readiness

VoiceLab already provides a broad guided English line set, but build readiness is currently dominated by accepted speech duration plus a very small take-count floor. Duration alone is not sufficient evidence that the dataset covers the speaking variety needed by a high-fidelity meeting voice.

Add a **small guided-coverage readiness check** using the existing guided material.

The readiness decision should consider representative coverage such as:

- short conversational phrases;
- longer explanatory speech;
- questions / changing intonation;
- names, numbers, dates or technical wording;
- normal varied sentence structure.

Requirements:

- keep the existing minimum usable-speech duration as a safety floor, not as proof of quality;
- do not replace it with another arbitrary large recording-minute target;
- do not require all 128 lines;
- keep coverage categories simple and product-facing guidance non-technical;
- actual final quality still comes from trained held-out output + user listening approval.

Acceptance:

- `Create My Voice` is not enabled solely because duration is high;
- the accepted set must satisfy a small representative coverage contract;
- UI tells the user which broad kind of recording is still useful without exposing training internals.

## Test-Support Observability

Before target-Windows performance testing, use current Diagnostics first. Add only the smallest missing instrumentation needed to interpret failures.

If current diagnostics cannot expose enough evidence, add **non-persistent diagnostic-only** visibility for:

```text
loaded ASR runtime/device
loaded translation direction(s)/device
loaded My Voice runtime/device
CUDA availability
GPU/VRAM usage or availability when reliably obtainable
per-stage outbound timing already owned by Meeting
```

This instrumentation is not permission to add user-facing model/CUDA controls, telemetry, a new monitoring service, automatic model eviction, or a new scheduler. VRAM residency strategy should only change if target evidence proves an actual memory problem.

## Already Sufficient for Pre-Test Source Scope

Do **not** redesign these before evidence shows a failure:

- Meeting transactional Start / rollback;
- canonical Stop / cleanup ownership;
- generation/stale-work rejection;
- bounded finalized-utterance backlog and freshness preference;
- VoiceLab/Meeting mutual exclusion;
- optional incoming lane separation from required outbound;
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

Those runtime-sensitive areas should be tested after the known P0/P1 hardening above rather than redesigned from assumption.

## R3.2 Release Baseline — Preserved / Deferred

R3.2 remains the current size baseline only; it is not the final release size after future product changes.

```text
Exact optimized Tauri release resources
8,036,451,493 bytes

Measured solid 7z/LZMA2 distribution candidate
4,429,538,835 bytes
```

The optimizer and compression evidence remain valid as historical/current release baseline until product scope is re-frozen. Do not continue installer implementation now.

## Target Test After Hardening

Once the pre-test hardening queue is complete, target-capable testing should determine real behavior rather than trigger speculative redesign. The important evidence remains:

```text
microphone capture / VAD segmentation
ID → EN ASR + translation quality
EN → ID Text/incoming quality
VoiceLab training success and speaker fidelity
My Voice persistence after restart
ASR + translation + My Voice combined VRAM practicality
outbound end-to-end latency
Meeting Microphone delivery in real meeting applications
optional Meeting Sound capture/suppression
Stop / Close / sleep / wake lifecycle
long-session memory/thread/queue stability
standalone Text completeness
```

Installer/package work remains deferred until those product/runtime results and any resulting feature changes are stable enough to freeze release inputs again.

## Next Step

**Implement P0-1 first: bounded evidence-based VoiceLab candidate/checkpoint selection. Preserve the existing GPT-SoVITS V2ProPlus engine, guided dataset ownership, held-out evaluation, explicit user approval, and atomic My Voice promotion while removing the assumption that the final training checkpoint is automatically the best candidate.**
