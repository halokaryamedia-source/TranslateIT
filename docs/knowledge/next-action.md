# TranslateIT — Next Action

## Current Mode

**Developing / Frontend P2 Settings Cleanup CLOSED — P3 SHELL STATUS CLEANUP NEXT**

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

## Frontend P1 VoiceLab Humanization Closure

The VoiceLab humanization and hierarchy alignment wave is source-closed. The normal VoiceLab surface keeps the existing recording, Skip, build, evaluation, approval, and 128-line behavior while presenting those capabilities with the same product-facing grammar used by Meeting and Text.

The page header no longer presents `128 available` as a completion target. Guided recording copy now focuses on clear, comfortable recordings and ordinary `My Voice` language. Review copy no longer refers to a Voice Actor dataset or engineering quality policy.

`VoiceLabBuild.svelte` no longer presents the one-minute backend minimum as a user quality target and no longer renders raw `build.message` into the main VoiceLab surface. Build phases are projected into bounded product copy such as `Creating My Voice`, `Preparing voice previews`, and `Review My Voice`; action results are likewise mapped to normal product messages instead of exposing runtime/build detail. The backend minimum, build state machine, training behavior, evaluation contract, and approval authority are unchanged.

Both VoiceLab authorization checkboxes now reuse the canonical `--ti-accent` token instead of the nonexistent `--ti-action` token. No new token, component system, state owner, framework, or backend capability was added.

Accepted hosted source proof:

```text
run 31796853186
VoiceLab P1 humanization source contract -> PASS
bounded two-owner frontend change -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> 2913c8030298e373745182cdff702f7fe43f4e1b
```

The temporary P1 patch/proof files were removed after the successful proof.

## Frontend P2 Settings Cleanup Closure

The bounded Settings cleanup wave is source-closed at the existing `Settings.svelte` owner. Normal `Settings -> Meeting` keeps the same device selection, Mic Test, setup repair, route status, and Advanced/Diagnostics behavior while removing redundant and overly technical normal-user presentation.

The redundant `Check Microphone` action was removed because microphone selection already performs the functional candidate check before saving. `Mic Test` and `Check Setup` remain as distinct actions. Meeting-microphone recovery copy no longer requires the user to understand a matched virtual-audio cable pair; it now directs the user to `Check Setup` in ordinary product language.

Technical troubleshooting detail remains intentionally contained in `Advanced -> Diagnostics`: Worker state, outbound provider status, CUDA/CPU execution information, `Verify Models`, and recent frontend/Tauri command errors were preserved. No device transaction, audio route, setup-repair behavior, backend readiness rule, persisted schema, or new frontend state owner was changed.

Accepted hosted source proof:

```text
run 31797784828
Settings P2 normal-UI contract -> PASS
bounded single-owner frontend change -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> fa5162c2a2aa02f912d1f2ae6219041d989be296
```

The temporary P2 patch/proof files were removed after the successful proof.

## Existing Source-Closed Boundaries

The following remain closed source-side:

```text
VoiceLab A1-A6
VoiceLab pre-local quality audit
VoiceLab 128-line guided script final curation
VoiceLab Guided Recording Skip action
Frontend P0 First Setup / Meeting My Voice alignment
Frontend P1 VoiceLab humanization and hierarchy alignment
Frontend P2 Settings normal-UI cleanup and Diagnostics containment
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

**P3 — Shell/status redundancy cleanup. Keep the existing sidebar, routes, product-state mapping, Meeting polling, and page-level direction UI, but remove the global direction pill from the app header because it duplicates Meeting/Text direction and is irrelevant in Settings, preserve the transient notice plus the active-Meeting return control, and suppress the redundant Meeting page-header `Live` badge when the live activity surface already communicates `Listening / Translating / Speaking`. Keep setup/unavailable/starting/stopping attention states visible. Do not change runtime state semantics, navigation behavior, Meeting lifecycle, or add new shell/state/component systems.**
