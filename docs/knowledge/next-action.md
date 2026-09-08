# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Meeting authority, helper scheduler/bridge ownership, audio finalized-utterance generation ownership, queue bounds, staging, parser boundaries, and hosted Linux/Windows source/unit gates have deterministic REMOTE_GITHUB proof.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.
- WorkerRuntime enforces outbound-only rolling translation context: only authoritative ID->EN Meeting lane `you` requests with non-empty session id and positive generation may forward the capped last-three context pairs. Incoming, standalone, reverse-direction, and incomplete/spoofed metadata remain context-free.
- Canonical newline protocol framing rejects malformed JSON, non-object requests, non-finite JSON numbers, and oversized request lines before handler dispatch. Protocol responses require an object and bound stage/blocker/note diagnostics; unexpected handler exceptions use a stable namespaced blocker.
- Translation success is now contract-guarded at the canonical entrypoint: translated text must be non-empty, every successful provider/chunk response must be complete and EOS-terminated, and both direct and reassembled standalone output are capped at twice the accepted source character budget. Standalone chunk failure discards partial output and preserves chunk index/count.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`; physical microphone/GPU/VB-CABLE/meeting-app reception/semantic model quality/real latency/clean-machine claims remain target-Windows work.

## Next Step

Continue canonical Python WorkerRuntime hardening without changing the external JSON shape. Normalize translation/provider/model exceptions into stable bounded domain blockers while preserving runtime cleanup and retry semantics. Then align Code Health with the configured Ruff import rule `I` and add `ruff format --check` once the source is clean enough. Keep GPU practicality, semantic translation quality, and real latency for `TARGET_WINDOWS`.
