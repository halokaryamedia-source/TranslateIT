# Next Action

## Current Status

- `Local` is the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker; required outbound remains fail-closed and optional incoming remains degradable.
- Code Health classifies changed source domains. Frontend proof includes typecheck, production build, deterministic policy tests, source contracts, and production dependency audit; unchanged Python/Rust domains do not consume their hosted runners.
- R3 Release Contract is scoped to actual release/package inputs instead of all frontend scripts.
- Meeting Voice readiness is a tested gate: selected voice is required before Ready, unknown voice state remains Checking, and missing selection owns `meeting_voice:not_selected`.
- Built-in selection and My Voice approval refresh the App-owned snapshot immediately. Meeting mount reuses that snapshot and only probes route-specific status.
- Built-in voice replacement uses staged directory swap with rollback/recovery tests. My Voice coverage guidance is structured data rather than parsed backend prose.
- Safe-close policy and compact setup/resume policy have deterministic tests. Source-size budgets prevent existing large realtime coordinators from silently growing.

## Active Boundary

Current proof remains `REMOTE_GITHUB`. Physical microphone/GPU/VB-CABLE/meeting-app reception, semantic quality, real latency, installed-runtime, speaker fidelity, and clean-machine claims are **not** PASS.

TARGET_WINDOWS is not currently available. Continue only work with a concrete source/static/unit/CI proof surface and clear correctness, maintainability, product-flow, privacy, or CI-efficiency value. Do not simulate physical-device proof or perform large Meeting/helper/audio coordinator decomposition before a measured Windows baseline exists.

## Next Step

While work remains REMOTE_GITHUB-only:

1. Close concrete source-contract inconsistencies found by audit and add deterministic tests where practical.
2. Improve CI/release precision only when proof coverage is preserved or strengthened.
3. Harden bounded failure/recovery, ownership, stale-work rejection, atomic storage, privacy/redaction, and release/package contracts that can be proven remotely.
4. Prefer small pure-policy extraction over speculative realtime rewrites; keep documentation aligned after meaningful changes.
5. Stop when the remaining question depends on physical Windows behavior.

When TARGET_WINDOWS becomes available, run the exact then-current `Local`: A2/A3, B1/B2/B5, then C0 → C1 → C4 → C5, recording real C1 stage timing. Only after that baseline should large realtime coordinator decomposition resume.
