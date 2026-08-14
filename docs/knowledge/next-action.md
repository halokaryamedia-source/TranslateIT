# TranslateIT — Next Action

## Current Mode

**Developing / Frontend P0 Alignment CLOSED — P1 VOICELAB HUMANIZATION NEXT**

VoiceLab A1 through A6, the pre-local VoiceLab quality audit, the final 128-line guided-script curation, the explicit Guided Recording Skip action, P3 runtime/model packaging source closure, P4 Meeting audio provider distribution policy, and the bounded P5 Rust source-hygiene cleanup are source-closed. Target/local Windows validation remains explicitly deferred by the user.

## P5 Result

A maintenance pass followed the next independently grounded source concern rather than expanding provider/installer work.

The audit first checked the current privacy/storage owner against PR-101 through PR-103. `engine/logging.rs` already keeps runtime logs bounded and redacts local paths, email-like values, and obvious secret tokens. No concrete privacy leak was established from that owner, so no new privacy framework, storage abstraction, telemetry layer, or cleanup subsystem was added.

The pass did identify three recurring Rust warning residues from accepted hosted builds:

```text
private-interface mismatch for OutboundTimingContext
dead GUIDED_TAKE_BITS_PER_SAMPLE constant
dead MeetingOutputDeliveryReport cancelled/note fields and their unused detail plumbing
```

They were removed at their existing owners without changing Meeting lifecycle, playback authority, output timing, blocker semantics, guided-recording format, or product UI.

The resulting Meeting output report now carries only values actually consumed by the Meeting owner:

```text
ok
execution_attempted
first_playback_at
first_playback_unix_ms
blocker
```

No `#[allow(dead_code)]`, broad warning suppression, compatibility wrapper, or duplicate report type was introduced.

## Accepted P5 Hosted Proof

Final bounded source-hygiene proof:

```text
run 31783820476
Windows Server 2022
frontend production build for Tauri context -> PASS
bounded source patch + git diff --check -> PASS
cargo check --locked with RUSTFLAGS=-Dwarnings -> PASS
cargo test --locked -> PASS
source commit -> 57f7dbae21144366e2fb53a35209a9df12ab24c2
```

The first attempt `31783548020` did not modify product source. It exposed two proof/cleanup details: the Tauri macro required the frontend `dist` build to exist, and removing the dead callback note also made the callback-error binding unused. The proof was corrected rather than weakening the warning gate.

The temporary P5 workflow was removed after the successful proof.

## VoiceLab Guided Script Maintenance

The user-requested VoiceLab content pass is now source-closed as the final pre-recording baseline. The canonical `GUIDED_LINES` owner still contains exactly 128 English recording lines and no recording, storage, training, evaluation, or inference architecture was added.

The final curation rewrote the pool around human reading comfort rather than completion count. It intentionally contains exactly 24 short, 72 medium, and 32 long utterances, with no line longer than 27 words. The set keeps natural questions, confirmations, disagreement, everyday speech, meeting language, names, dates, times, prices, counts, percentages, version numbers, one spelled-out A P I example, and bounded technical vocabulary. Artificial pangrams, process instructions, VoiceLab/model meta-sentences, digit-heavy text, semicolon/colon scan friction, and paragraph-like lines were removed.

The official GPT-SoVITS training boundary consumes labeled audio/text pairs, so once real accepted takes are recorded against this baseline, exact guided text must not be changed casually. A later wording change requires the affected take to be recorded again rather than pairing old audio with new transcript text.

Accepted hosted source proof:

```text
run 31791279320
128 unique contiguous guided lines -> PASS
24 short / 72 medium / 32 long -> PASS
maximum 27 words per line -> PASS
spelled-out numeric text / no digit literals -> PASS
no semicolon or colon scan-friction -> PASS
no VoiceLab/model/process meta phrases -> PASS
held-out evaluation text separation -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
cargo check --locked with RUSTFLAGS=-Dwarnings -> PASS
cargo test --locked -> PASS
source commit -> 7b717e325f514d673ee282e4f10619525cfaade2
```

The temporary curation workflow and script were removed after the successful proof.

## VoiceLab Guided Skip Closure

The explicitly requested Guided Recording `Skip` action is now source-closed at the existing `VoiceLab.svelte` owner. It is deliberately a frontend-only navigation action, not a new VoiceLab runtime/state capability.

Behavior is bounded to:

```text
idle guided line
-> Skip
-> move forward to a later unaccepted line when available
-> otherwise move to the next later line
```

Skip is unavailable while recording, while a take is pending review, while another recording action is busy, or while replay is active. It does not mark a line accepted or failed, does not create persistent skipped state/history, does not add a backend/API command, and does not change the existing build-duration gate. The sidebar remains the way to return to any earlier skipped line.

The user-facing guidance now explicitly says that a difficult line may be skipped and that all 128 lines are an optional recording pool rather than a completion requirement.

Accepted hosted source proof:

```text
run 31792212174
frontend-only Skip contract guard -> PASS
no backend Skip API / persistent skip state -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
read-only closure guard -> PASS
source commit -> a56aaacdb1395ab6bfd3b35ca32323a651b24c04
```

The temporary Skip proof workflow was removed after the successful proof.

## Frontend P0 Alignment Closure

The first frontend alignment wave is source-closed. First Setup and Meeting now treat `My Voice` as a required product concept instead of leaving it implicit behind Meeting readiness.

First Setup now includes `My Voice` in its final readiness summary. When My Voice is missing, the dominant final action is `Create My Voice`; leaving the wizard for VoiceLab persists setup as `deferred`, not `completed`, so the product does not claim setup success early. After an approved voice exists and Meeting readiness is healthy, `Open Meeting` becomes the final action.

Meeting Ready now gives equal required hierarchy to `Your microphone`, `My Voice`, and `Meeting microphone`. Incoming English -> Indonesian text is moved out of the required three-column readiness area into an explicitly `Optional` row. When My Voice is missing, `Create My Voice` replaces the unavailable Start action as the dominant recovery path.

No Rust/backend readiness rule, build-duration rule, audio route, model runtime, or persisted schema was changed. The UI reads the existing canonical VoiceLab build status for approved-voice readiness.

Accepted hosted source proof:

```text
run 31793579827
bounded P0 source contract -> PASS
no backend product-source changes -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> f2d3fa7ad58073964d82beb8693cf20184682484
```

The temporary patch/proof files were removed after the successful proof.

## Existing Source-Closed Boundaries

The following remain closed source-side:

```text
VoiceLab A1-A6
VoiceLab pre-local quality audit
VoiceLab 128-line guided script final curation
VoiceLab Guided Recording Skip action
P3 private Python/runtime/model packaging contract
P4 standard VB-CABLE initial provider policy and controlled staging contract
P5 Rust warning/dead-data cleanup
```

P4 still uses standard VB-Audio VB-CABLE as the one initial release provider direction. The Rust/CPAL matched-pair route remains the runtime owner; provider installation is not a second audio runtime.

## Deferred Target / Installer Evidence

The following remain intentionally unproven while local testing is deferred:

```text
applicable VB-CABLE redistribution/license status for the concrete release
actual official VB-CABLE package bytes used for that release
successful NSIS installer generation with all controlled payloads
VB-CABLE driver installation/elevation/security consent
restart/reboot handling and recovery
installed virtual endpoint appearance and matched-pair detection
physical translated-audio delivery through the pair
Zoom/Meet/Teams reception
installed private Python/model/GPT-SoVITS execution
real MyVoice training/synthesis quality
CUDA/VRAM practicality
latency / long-session stability
safe installed Stop/Close/power lifecycle
clean-machine execution
```

Hosted source/build proof must not be presented as evidence for those claims.

## Next Step

**P1 — VoiceLab humanization and hierarchy alignment. Keep the existing VoiceLab behavior and 128-line pool, but make the normal UI follow the same product grammar as Meeting/Text: remove engineering/process copy from normal-user surfaces, stop presenting `128 available` and the one-minute backend minimum as completion/quality targets, standardize normal vocabulary around `My Voice`, prevent raw build/runtime wording from leaking into the main VoiceLab experience, and fix the existing `--ti-action` token drift by reusing the canonical accent token. Do not redesign the application shell, change training/runtime behavior, or add new state/framework/component systems.**
