# Next Action

## Current Status

- `Local` is the sole active repository authority. Development, governance, CI, proof, continuation, and release-source validation remain on `Local` only.
- Current application architecture is Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health now executes strict frontend TypeScript/bridge type checks, Linux and hosted-Windows Python compile + E4/E7/E9/full-F static checks + contract/unit tests, Linux and hosted-Windows Rust compiler/dead-code + Clippy correctness + unit tests, and production npm dependency audit.
- Controlled release staging no longer depends on a dated BtbN FFmpeg autobuild URL. The selected n8.1 LGPL release asset must carry a GitHub SHA-256 digest and pass staged binary/license/build-profile validation.
- VoiceLab training now has an executable `SOVITS_EPOCHS = 8` contract protected by regression coverage.
- Built-in Male/Female are presented as the day-one Meeting voice path in current Setup and Meeting UI; My Voice remains an optional personalized replacement.
- Legacy Dev-Rust/DevelopingData issues were closed as obsolete and are not continuation authority.
- Optional incoming Meeting work now distinguishes ASR-stage deferral from ASR failure before transcript validation. A deferred finalized WAV is retained as `NeedsAsr`, retried FIFO after required outbound yields the helper pipeline, and released on completion, stale/overflow eviction, disable, or session cleanup. Regression coverage protects the deferred-before-failure classification.

## Active Boundary

The reproduced REMOTE_GITHUB incoming ASR-stage deferral ordering residue is resolved in current source without redesigning the required outbound scheduler or weakening outbound priority. Required outbound remains fail-closed and prioritized; optional incoming ASR/translation deferrals retain their original stage and FIFO ordering rather than being misreported as generic ASR failure.

Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime and clean-machine claims still require `TARGET_WINDOWS` evidence under `docs/foundation/03-acceptance-scenarios.md`.

## Next Step

Execute `TARGET_WINDOWS` scenario C1 (Outbound end-to-end) on the exact current `Local` SHA, satisfying its relevant A/B prerequisites on the target machine before treating Meeting delivery as verified.
