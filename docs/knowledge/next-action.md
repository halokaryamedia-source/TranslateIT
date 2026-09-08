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
- Python WorkerRuntime hygiene is enforced in Code Health on Linux and hosted Windows with Ruff import/static rules (`E4,E7,E9,F,I`) plus `ruff format --check` before pytest.
- Safe-close decision policy is separated from the Svelte composition root and covered by deterministic frontend runtime-policy tests, including fail-closed states and precedence.

## Active Boundary

Current proof remains `REMOTE_GITHUB`. Physical microphone/GPU/VB-CABLE/meeting-app reception/semantic model quality/real latency/installed-runtime/clean-machine claims are deliberately **not** marked PASS yet.

The large realtime Rust coordinators are intentionally not being decomposed further before first target-Windows execution. Source/unit proof cannot tell us whether a structural refactor preserved the physical audio and timing behavior we have not measured yet.

## Next Step

Run the first **TARGET_WINDOWS baseline** from the exact current `Local` source identity. Use the smallest ordered acceptance set that establishes the required outbound path and its shutdown behavior: confirm actual CUDA/ASR capability as required by A2/A3, physical capture/route truth with B1/B2/B5, then C0 → C1 → C4 → C5. Record real per-stage timing during C1 and stop on the first failed owner instead of compensating around it. Do not begin large Meeting/helper/audio decomposition until this baseline is captured; use the baseline as the behavior reference for any later refactor.
