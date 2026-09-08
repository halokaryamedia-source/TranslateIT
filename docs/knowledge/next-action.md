# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Meeting authority, helper scheduler/bridge ownership, audio finalized-utterance generation ownership, queue bounds, staging, parser boundaries, and hosted Linux/Windows source/unit gates have deterministic REMOTE_GITHUB proof.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.
- WorkerRuntime enforces outbound-only rolling translation context: only authoritative ID->EN Meeting lane `you` requests with non-empty session id and positive generation may forward the capped last-three context pairs. Incoming, standalone, reverse-direction, and incomplete/spoofed metadata remain context-free.
- Canonical newline protocol framing rejects malformed JSON, non-object requests, non-finite JSON numbers, and oversized request lines before handler dispatch. Protocol responses require an object and bound stage/blocker/note diagnostics; unexpected handler exceptions use a stable namespaced blocker.
- Translation success is contract-guarded: translated text must be non-empty, successful provider/chunk responses must be complete and EOS-terminated, and direct/reassembled standalone output is capped at twice the source character budget. Standalone chunk failure discards partial output and preserves chunk index/count.
- Translation/provider/model failures are normalized at the canonical boundary. Safe namespaced domain blockers are preserved; raw exception class names become stable translation/dependency blockers; notes are bounded and sanitized. Capability/runtime failures clear the shared bidirectional translation cache, while content/input/EOS/deadline failures preserve the loaded runtime and are not retried by the worker.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`; physical microphone/GPU/VB-CABLE/meeting-app reception/semantic model quality/real latency/clean-machine claims remain target-Windows work.

## Next Step

Audit Python source hygiene against the configured Ruff rules. Enable import rule `I` and `ruff format --check` in Code Health only after making the minimum import/format-only corrections required for the current WorkerRuntime source to pass on Linux and hosted Windows. Do not mix semantic runtime changes into that hygiene unit. Keep GPU practicality, semantic translation quality, and real latency for `TARGET_WINDOWS`.
