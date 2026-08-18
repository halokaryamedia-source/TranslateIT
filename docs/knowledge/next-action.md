# TranslateIT — Next Action

## Current Status

`PRE-TEST HARDENING — P0-1 SOURCE IMPLEMENTED / P0-2 NEXT / INSTALLER DEFERRED`

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

The previously approved future packaging direction is preserved only as deferred context:

```text
one user-facing automatic fully offline setup experience
+
TranslateIT-Setup.exe
+
colocated external release payload file(s)
```

## P0-1 — VoiceLab Evidence-Based Candidate Selection

### Source implementation complete

Commit `8fae16a7e9c1dad114d070bd91359cdf8b428dd6` replaces the previous implicit `final checkpoint = candidate` assumption inside the canonical GPT-SoVITS provider.

Current bounded build behavior is:

```text
accepted guided dataset
→ GPT-SoVITS V2ProPlus training
→ periodic SoVITS/GPT weight outputs
→ at most 3 representative progress candidates
→ same held-out sentences generated for every candidate
→ per-sample speaker-similarity + SHA-256 evidence
→ deterministic candidate ranking
→ copy only the selected GPT/SoVITS pair into the candidate actor package
→ user listens to selected held-out previews
→ explicit user approval
→ atomic promotion to My Voice
```

With the current 8 SoVITS / 15 GPT epoch configuration, the representative progress pairs resolve to:

```text
s2-g5
s6-g10
s8-g15
```

Selection is based on actual held-out generated evidence, using mean speaker similarity first and minimum held-out similarity only as a deterministic tie-break. No absolute quality threshold was invented; final subjective acceptance remains the user's listening approval.

The evaluation manifest now records:

- selected candidate identity;
- candidate SoVITS/GPT epochs;
- mean/minimum speaker-similarity evidence;
- per-held-out-line similarity and generated-WAV SHA-256 evidence;
- the selected preview samples used by the existing review UI.

The actor manifest records which evidence-selected candidate produced the staged My Voice actor. Unknown extra manifest fields remain compatible with the existing Rust validation boundary.

Temporary checkpoint/evaluation candidates remain cache/build artifacts and are removed after the selected pair and selected review samples are materialized. The previous approved My Voice still remains untouched until explicit approval/promotion.

### Proof boundary

Source/syntax and deterministic selection/ranking logic are implemented. This does **not** claim that one candidate is objectively high quality for a real speaker. Actual multi-candidate GPT-SoVITS training time, generated-audio fidelity, similarity behavior, VRAM practicality, and final user preference remain target-capable VoiceLab evidence for the later acceptance test.

Do not add another TTS engine, automatic quality threshold, every-epoch retention, or automatic promotion to compensate for missing target evidence.

## Remaining Pre-Test Hardening Queue

### P0-2 — Complete translation envelope and standalone Text chunking — NEXT

Current Text accepts up to 2,000 characters while standalone translation uses a fixed generation budget that may be too small for some otherwise valid inputs. The worker correctly rejects incomplete output, but the accepted input envelope and guaranteed output envelope must be reconciled.

Implement two related corrections.

#### A. Meeting utterance translation

- keep one finalized utterance at a time;
- replace inherited fixed output budget with a bounded adaptive generation budget derived from actual request/model capacity;
- never silently truncate source text;
- never promote output that did not complete with the model's valid completion boundary;
- do not add document-style chunking to Meeting speech.

#### B. Standalone Text

Implement safe paragraph-aware chunking:

```text
user text
→ preserve paragraph/order boundaries
→ split only when required by model envelope
→ translate every chunk through canonical ID ↔ EN path
→ explicit failure if any required chunk is incomplete
→ reassemble in original order with paragraph structure preserved
```

Acceptance:

- every UI-accepted Text input returns one complete ordered translation or one explicit bounded failure;
- normal paragraph structure is preserved;
- no partial-success result is presented as complete;
- Meeting remains finalized-utterance translation, not document translation;
- no second translation engine or automatic conversation/history context.

### P0-3 — Windows sleep / hibernate authority invalidation

Implement the existing product requirement:

```text
Meeting Live
→ Windows suspend / hibernate
→ revoke Meeting output authority
→ canonical cleanup of owned audio/helper/output work
→ preserve truthful cleanup state if incomplete
→ resume remains stopped
→ explicit new Start Translation required
```

Acceptance:

- stale pre-suspend work cannot deliver after wake;
- resume never auto-starts Translation;
- minimize/hide without suspend continues to preserve a healthy Meeting;
- no second lifecycle/cleanup owner.

### P1-4 — VoiceLab dataset coverage readiness

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

R3.2 is only the current release-size baseline; pre-test feature/runtime changes may alter it later.

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

Installer/package remains deferred until product/runtime results and resulting feature changes are stable enough to freeze release inputs again.

## Next Step

**Implement P0-2: reconcile the translation completion envelope. Keep Meeting on one finalized utterance with a bounded adaptive generation budget, and add safe paragraph-aware chunking for standalone Text so every UI-accepted input either returns one complete ordered translation or one explicit bounded failure without silent truncation.**
