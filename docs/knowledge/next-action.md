# Next Action

## Current Status

- `Local` is the sole active repository authority. Development, governance, CI, proof, continuation, and release-source validation remain on `Local` only.
- Current application architecture is Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health now executes strict frontend TypeScript/bridge type checks, Linux and hosted-Windows Python compile + E4/E7/E9/full-F static checks + contract/unit tests, Linux and hosted-Windows Rust compiler/dead-code + Clippy correctness + unit tests, and production npm dependency audit.
- Controlled release staging no longer depends on a dated BtbN FFmpeg autobuild URL. The selected n8.1 LGPL release asset must carry a GitHub SHA-256 digest and pass staged binary/license/build-profile validation.
- VoiceLab training now has an executable `SOVITS_EPOCHS = 8` contract protected by regression coverage.
- Built-in Male/Female are presented as the day-one Meeting voice path in current Setup and Meeting UI; My Voice remains an optional personalized replacement.
- Legacy Dev-Rust/DevelopingData issues were closed as obsolete and are not continuation authority.
- Optional incoming Meeting work distinguishes ASR-stage deferral from ASR failure before transcript validation. A deferred finalized WAV is retained as `NeedsAsr`, retried FIFO after required outbound yields the helper pipeline, and released on completion, stale/overflow eviction, disable, or session cleanup.
- Finalized Meeting WAV promotion is fail-closed: a failed write no longer reports a promoted audio path, and failed write/flush/promotion paths remove the partial `.wav.tmp` artifact. Regression coverage exercises cleanup after a forced promotion failure.

## Active Boundary

Required outbound remains fail-closed and prioritized; optional incoming remains degradable. The user has explicitly deferred `LOCAL_CODE` / `TARGET_WINDOWS` execution for now, so continuation remains inside `REMOTE_GITHUB` source and CI hardening without upgrading target-device claims.

One bounded incoming-queue residue remains worth resolving remotely: repeated outbound preemption currently reconstructs deferred ASR/translation jobs with a fresh `enqueued_unix_ms`, so `MAX_DEFERRED_INCOMING_AGE_MS` is not yet a hard age ceiling from the first deferral. The original deferral timestamp should survive every requeue while FIFO ordering and outbound priority remain unchanged.

Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime and clean-machine claims still require `TARGET_WINDOWS` evidence under `docs/foundation/03-acceptance-scenarios.md` when the user later resumes that proof context.

## Next Step

Preserve the original deferred-incoming enqueue timestamp across ASR and translation requeues, with regression coverage proving repeated outbound preemption cannot reset the 20-second age budget; do not redesign the scheduler or weaken outbound priority.
