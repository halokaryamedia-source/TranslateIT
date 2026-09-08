# Next Action

## Current Status

- `Local` is the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.
- Meeting ownership, queue/staging/parser boundaries, hosted Linux/Windows source tests, and canonical translation/provider contracts have REMOTE_GITHUB proof.
- Outbound ID→EN Meeting context is limited to the last three committed own-voice pairs for an authoritative `you` lane/session/generation. Incoming, standalone, reverse, and incomplete/spoofed metadata remain context-free.
- Worker protocol rejects malformed/non-object/non-finite/oversized requests before dispatch and bounds failure diagnostics.
- Translation success requires non-empty, complete, EOS-terminated output; standalone failures discard partial output. Provider/model failures are normalized and runtime-cache invalidation is bounded by failure class.
- Code Health classifies changed source domains so frontend-only work does not spend unchanged Python/Rust Windows runners. Frontend proof includes typecheck, production build, deterministic policy tests, source contracts, and production dependency audit.
- R3 Release Contract is path-scoped to actual release/package inputs instead of all frontend scripts.
- Meeting Voice readiness is a tested product gate: a selected voice is required before Ready, unknown voice state remains Checking, and a missing selected voice owns blocker `meeting_voice:not_selected`.
- Successful built-in selection or My Voice approval refreshes the App-owned product snapshot immediately; Meeting mount reuses that snapshot and only probes its route-specific status.
- Built-in Meeting voice replacement is staged and directory-swapped with rollback/recovery tests rather than writing over the selected actor in place.
- My Voice recording-variety guidance is structured data rather than frontend parsing of backend prose.
- Safe-close policy is separated from the Svelte composition root and covered by deterministic runtime-policy tests.
- Source-size budgets block new oversized TS/Svelte/Rust files and prevent existing large realtime coordinators from silently growing before their measured refactor baseline exists.

## Active Boundary

Current proof remains `REMOTE_GITHUB`. Physical microphone/GPU/VB-CABLE/meeting-app reception, semantic quality, real latency, installed-runtime, and clean-machine claims are **not** PASS.

TARGET_WINDOWS is not currently available. Continue only remote work that has a concrete source/static/unit/CI proof surface and a clear product, correctness, maintainability, or CI-efficiency benefit. Do not simulate physical-device proof and do not perform large Meeting/helper/audio coordinator decomposition before a measured Windows baseline exists.

## Remote-Only Next Step

While TARGET_WINDOWS remains unavailable, use this order:

1. Close concrete source-contract inconsistencies found by audit, with deterministic tests where practical.
2. Improve CI/release trigger precision only when proof coverage is preserved or strengthened; unrelated domains should not consume heavy runners.
3. Harden bounded failure/recovery, state ownership, stale-work rejection, storage atomicity, privacy/redaction, and release/package contracts that can be proven remotely.
4. Prefer extracting small pure policies/tests from UI orchestration over speculative runtime rewrites.
5. Keep documentation aligned with the exact proof boundary after meaningful source changes.

Stop remote refactoring when the remaining issue depends on microphone behavior, GPU practicality, VB-CABLE delivery, meeting-app reception, real latency, installed runtime, speaker fidelity, or clean-machine behavior.

## Deferred TARGET_WINDOWS Baseline

When target Windows becomes available, use the exact then-current `Local` identity and run A2/A3 for actual CUDA/ASR, B1/B2/B5 for physical capture/route truth, then C0 → C1 → C4 → C5 for day-one start, outbound end-to-end, safe stop, and repeated-session stability. Record real per-stage timing during C1 and stop on the first failed owner. Only after this baseline should large realtime coordinator decomposition resume.
