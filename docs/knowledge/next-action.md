# TranslateIT — Next Action

## Current Mode

**Maintenance / P5 Rust Source Hygiene CLOSED — RELEASE/LOCAL EVIDENCE DEFERRED**

VoiceLab A1 through A6, the pre-local VoiceLab quality audit, P3 runtime/model packaging source closure, P4 Meeting audio provider distribution policy, and the bounded P5 Rust source-hygiene cleanup are source-closed. Target/local Windows validation remains explicitly deferred by the user.

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

## Existing Source-Closed Boundaries

The following remain closed source-side:

```text
VoiceLab A1-A6
VoiceLab pre-local quality audit
VoiceLab 128-line guided script final curation
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

**Implement the explicitly requested Guided Recording `Skip` action. Skip must only move past the current line while no recording/review action is active; it must not mark the line accepted or failed, must not change the existing build-duration gate, and must not create persistent skip history or a new workflow/state owner. The 128-line script remains an optional recording pool.**
