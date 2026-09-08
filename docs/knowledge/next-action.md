# Next Action

## Current Status

- `Local` is the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker; required outbound remains fail-closed and optional incoming remains degradable.
- Code Health classifies changed source domains. Frontend proof includes typecheck, production build, deterministic policy tests, source contracts, and production dependency audit; unchanged Python/Rust domains do not consume their hosted runners.
- Frontend policy tests use canonical `scripts/tests/*.test.ts` auto-discovery, so new tests do not require manual package-script registration.
- R3 Release Contract is scoped to actual release/package inputs; the current pinned FFmpeg release identity completed source contract, controlled Windows staging/optimization, bounded payload evidence, and evidence upload.
- Meeting Voice readiness, global voice-state refresh, setup/resume flow, bridge fail-closed ownership, diagnostics redaction, settings crash recovery, atomic built-in replacement, and release payload closure have deterministic remote proof.
- Source-size budgets prevent existing large realtime coordinators from silently growing.

## Active Boundary

Current proof remains `REMOTE_GITHUB`. Physical microphone/GPU/VB-CABLE/meeting-app reception, semantic quality, real latency, installed-runtime success, speaker fidelity, and clean-machine success are **not** PASS.

TARGET_WINDOWS is not currently available.

The repository has reached the **remote-cleanup freeze**: do not continue polishing or restructuring code merely because more cleanup is possible. New REMOTE_GITHUB changes should require a concrete failing verifier, a reproducible source-contract defect, a security/privacy issue, or another high-value correctness problem with deterministic proof.

Do not perform large Meeting/helper/audio coordinator decomposition before a measured Windows baseline exists.

## Next Step

While TARGET_WINDOWS remains unavailable:

1. Keep `Local` stable and let Repository Verify, selective Code Health, and R3 protect the current contracts.
2. Fix only concrete regressions or newly discovered high-value defects with an owning deterministic verifier/test.
3. Do not add speculative realtime optimizations, broad coordinator refactors, or cosmetic architecture churn.
4. Keep proof identities exact-SHA and update this documentation only when a meaningful proof boundary changes.

When TARGET_WINDOWS becomes available, run the exact then-current `Local`: A2/A3, B1/B2/B5, then C0 → C1 → C4 → C5, recording real C1 stage timing. Only after that baseline should large realtime coordinator decomposition resume.
