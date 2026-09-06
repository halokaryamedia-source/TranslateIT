# Next Action

## Current Status

- `Local` is the sole active repository authority. Development, governance, CI, proof, continuation, and release-source validation remain on `Local` only.
- Current application architecture is Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health now executes real Python contract/unit tests and Rust unit tests in addition to compile/source checks; production npm dependencies are audited in CI.
- Controlled release staging no longer depends on a dated BtbN FFmpeg autobuild URL. The selected n8.1 LGPL release asset must carry a GitHub SHA-256 digest and pass staged binary/license/build-profile validation.
- VoiceLab training now has an executable `SOVITS_EPOCHS = 8` contract protected by regression coverage.
- Built-in Male/Female are presented as the day-one Meeting voice path in current Setup and Meeting UI; My Voice remains an optional personalized replacement.
- Legacy Dev-Rust/DevelopingData issues were closed as obsolete and are not continuation authority.

## Active Boundary

REMOTE_GITHUB source/CI work is substantially hardened, but one reproduced optional-incoming correctness residue remains: an incoming `transcribe` request can yield to the required outbound helper pipeline before ASR execution, while `meeting_session.rs` currently reaches its generic ASR-failure branch before the later translation-stage deferred-queue handling. Required outbound remains fail-closed and prioritized; the residue affects the optional incoming lane and its status/retention semantics.

The current GitHub connector can replace that large owner only as a complete file, so an unreviewable full-file transfer is intentionally not used to patch a small logic hunk. This is a transfer boundary, not a request to redesign the scheduler.

Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime and clean-machine claims still require `TARGET_WINDOWS` evidence under `docs/foundation/03-acceptance-scenarios.md`.

## Next Step

Resolve the reproduced incoming ASR-stage deferral ordering in the exact current `meeting_session.rs` with a minimal regression-tested edit; do not redesign the required outbound scheduler or weaken outbound priority.
