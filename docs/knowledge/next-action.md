# TranslateIT — Next Action

## Current Mode

**Plan / R1.1 Python GPL Dependency Containment CLOSED — R1.2 FFMPEG PROVENANCE NEXT**

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

## Frontend P3 Shell / Status Cleanup Closure

The bounded shell/status redundancy cleanup is source-closed at the existing `App.svelte` and `Meeting.svelte` owners. The app keeps the same routes, sidebar, transient notice, active-Meeting return control, product-state projection, Meeting polling, and lifecycle behavior while removing duplicated normal-user status presentation.

The global direction pill was removed from the app header because Meeting and Text already communicate direction in their own primary surfaces and the pill was irrelevant in Settings. Its derived `direction` and `currentSettings` presentation-only projections were removed with it; no settings or navigation behavior changed.

Meeting no longer shows a redundant page-header `Live` badge when the live activity surface already communicates `Listening`, `Translating`, or `Speaking`. Header badges remain for Starting/Stopping and attention states such as Unavailable, Checking, and Setup Needed. `MeetingActivity`, transcript behavior, Start/Stop ownership, and Meeting state semantics are unchanged.

Accepted hosted source proof:

```text
run 31799253711
shell/status P3 source contract -> PASS
bounded App + Meeting frontend change -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> 762178e4132826ffbfdff5f878a8b85e101d9caa
```

The temporary P3 patch/proof files were removed after the successful proof.

## Frontend P4 First Setup Polish Closure

The bounded First Setup normal-user polish wave is source-closed at the existing `FirstSetup.svelte` owner. The wizard keeps the same five persisted checkpoints, setup state transitions, candidate device transactions, readiness checks, Set Up Later behavior, My Voice handoff, setup repair, and completion rules.

The progress header now presents `Step X of 5` without a redundant percentage; the existing progress bar still derives from the same five-step checkpoint value. Step 4 now uses ordinary `Meeting microphone` language: the instruction asks the user to choose the exact microphone shown in their meeting app, and the status detail explains that TranslateIT uses that microphone to send the English voice into the meeting. The previous `paired virtual-audio route` implementation wording and the `Meeting microphone device` label were removed from the normal setup surface.

No readiness logic, audio route, device selection transaction, persisted schema, setup checkpoint semantics, My Voice behavior, or new wizard/state/component owner was changed.

Accepted hosted source proof:

```text
run 31799647424
First Setup P4 normal-user contract -> PASS
bounded single-owner frontend change -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> df8c54b588bfb3d27dca299660547e4cd2bc9ebb
```

The temporary P4 patch/proof files were removed after the successful proof.

## Frontend P5 Source Closure Audit

The final bounded frontend source-closure audit is complete. It re-checked the current App shell, Sidebar, Meeting and live activity, Text, VoiceLab recording/build surfaces, Settings, First Setup, shared status components, semantic tokens, and the direct product-facing runtime contracts. The audit did not establish a need for a new design system, component framework, state owner, or broad visual rewrite.

Three concrete residues were found and corrected at their existing frontend owners:

1. `VoiceLab.svelte` no longer passes arbitrary Guided Recording `result.message` values directly into normal UI. Recording action states are projected to bounded product-facing messages, preventing backend storage/cleanup wording and the stale `Voice Actor dataset` success text from leaking into the normal experience.
2. `Text.svelte` now uses the shared semantic `StatusBadge` for non-ready Text states. `Checking` remains neutral, `Setup Needed` is warning, and `Unavailable` is danger instead of all three appearing as the same neutral metadata pill.
3. `Meeting.svelte` removes the second healthy `Ready` indicator from the direction strip because the footer already owns readiness guidance and the sidebar owns global presence. Starting/Stopping badges are also kept neutral instead of inheriting a success tone from a still-ready preflight.

No runtime readiness semantics, translation logic, Meeting lifecycle, VoiceLab recording/build behavior, device routing, Settings behavior, First Setup checkpoints, persisted schema, or backend source changed.

Accepted hosted source proof:

```text
run 31800338557
cross-surface frontend closure contract -> PASS
bounded Meeting + Text + VoiceLab change -> PASS
frontend typecheck -> PASS
frontend production build -> PASS
source commit -> c5a17e4900d400df115b9827381583c2566d8cc7
```

The temporary P5 audit/proof files were removed after the successful proof.

At source level, the current frontend now has no independently grounded additional cleanup wave. This is deliberately not a rendered-UI or target-Windows claim.

## R1 Release Licensing / Controlled Asset Audit

The non-local release licensing and provenance audit is complete at the existing release owners. It does not declare a particular distribution legally cleared; it records exact source provenance where source evidence is sufficient and makes unresolved licensing gates explicit before installer rehearsal.

Verified source-side inventory:

```text
CPython runtime -> 3.12.10 Windows embeddable distribution / PSF License 2 + incorporated-software notices
faster-whisper-large-v3-turbo -> pinned HF revision / MIT
Marian ID->EN -> pinned HF revision / Apache-2.0
Marian EN->ID -> pinned HF revision / Apache-2.0
GPT-SoVITS application source -> d523079fc05d9a8028d6085bffe4a2757c32abb6 / MIT
GPT-SoVITS pretrained snapshot -> lj1995/GPT-SoVITS @ 336b2ec4e8d4ac74740798dd40af44e74659ecaf
standard VB-CABLE -> conditional donationware distribution policy; concrete release rights still external evidence
```

The canonical model inventory now carries the reviewed GPT-SoVITS pretrained snapshot and SHA-256 values for `s1v3.ckpt`, the speaker-verification checkpoint, and the V2ProPlus generator/discriminator weights. `RuntimeAssets` and `Voice` now distinguish payload presence from license clearance and preserve CMUdict attribution requirements.

Two material non-local release blockers remain:

1. The frozen Python dependency graph resolves `g2p-en==2.1.0 -> distance==0.1.3`. Upstream g2p-en is permissively licensed, while Distance declares GPL. No legal conclusion about the full application is fabricated, but the current private PythonRuntime is not treated as cleared for a closed/commercial release until the dependency/obligations are resolved.
2. The current `ffmpeg.exe` payload contract has no proved Windows build configuration/license profile. FFmpeg is LGPL by default and can become GPL depending on enabled components, so the fact that a binary exists or is hosted beside MIT-labelled model assets is insufficient release-license evidence.

VB-CABLE remains a separate conditional distribution gate: the source contains the required origin/donationware notice, but applicable rights for the concrete release must still be established outside source. Python PSF and third-party license/acknowledgement texts must also accompany the final staged runtime.

Accepted hosted source proof:

```text
run 31801724764
bounded release-owner change -> PASS
model inventory JSON validation -> PASS
release package source contract -> PASS
source commit -> 51e12dc6ed2e35d842f7daabc9baa2b1a21f7202
```

This remains source/provenance evidence only. It does not prove legal advice, actual staged-byte compliance, installer generation, driver installation, installed runtime, or clean-machine operation.

## R1.1 Python GPL Dependency Containment Closure

The bounded non-local Python dependency containment is source-closed at the existing WorkerRuntime/release owners. The approved GPT-SoVITS/VoiceLab behavior and Python runtime architecture are unchanged.

`g2p-en` is now pinned to `2.1.0`. The canonical `[tool.uv]` policy requires `uv>=0.12.0` and uses the version-scoped `exclude-dependencies` mechanism to omit only `distance` as declared by that exact `g2p-en` release. Regenerating `uv.lock` removed only `distance==0.1.3`; no other package was added, removed, upgraded, or downgraded, and the lock retains `g2p-en==2.1.0` without a Distance dependency edge.

Hosted runtime proof used an isolated Python 3.12.10 environment where `g2p-en==2.1.0` was installed without its declared dependencies, the actually required G2P dependencies/resources were then supplied, and `distance` remained absent. Inspection of every installed `g2p_en/**/*.py` file found no `distance` reference. English G2P successfully processed ordinary speech, a homograph sentence, and an out-of-vocabulary word. The existing VoiceLab provider contract test then passed in the same Distance-free environment.

The release package source validator now fails if the scoped exception drifts, if Distance reappears in the lock, or if the reviewed g2p-en version changes without reconciliation. This containment removes the identified GPL package from the private Python dependency graph; it is not a legal opinion or overall release-clearance claim. FFmpeg and VB-CABLE retain their separate release gates.

Accepted hosted proof:

```text
run 31802727204
Windows Server 2022
uv 0.12.0 scoped exclusion recognized -> PASS
bounded uv.lock delta: only distance 0.1.3 removed -> PASS
g2p-en 2.1.0 retained -> PASS
installed g2p-en runtime source contains no Distance reference -> PASS
English G2P smoke with Distance absent -> PASS
VoiceLab provider contract with Distance absent -> PASS
release package source contract -> PASS
source commit -> 163954baa1bcd023711df4eeeb8c2127a720455e
```

Two earlier hosted attempts did not produce a product commit: the first exposed only a PowerShell quoting error in the proof command; the second proved the isolated G2P path but invoked the VoiceLab regression with a bare Python missing `ffmpeg-python`. The final run corrected the proof harness rather than weakening product or acceptance requirements.

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
Frontend P3 shell / Meeting status redundancy cleanup
Frontend P4 First Setup normal-user polish
Frontend P5 cross-surface source closure audit
R1 release licensing / controlled asset provenance audit
R1.1 g2p-en / Distance dependency containment
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

**R1.2 — resolve the controlled `ffmpeg.exe` release provenance/license-profile gate without changing VoiceLab audio behavior. Identify an exact Windows FFmpeg build origin and build configuration whose redistribution obligations are reviewable, pin the selected artifact/version and SHA-256 in the existing voice/release owners, and update the release contract so a floating or provenance-unknown FFmpeg binary cannot be promoted. If no acceptable distributable build/profile can be established from authoritative evidence, STOP and record that blocker instead of substituting another decoder or claiming release clearance. Do not start local Windows testing.**
