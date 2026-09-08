# Next Action

## Current Status

- `Local` is the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.
- Meeting ownership, queue/staging/parser boundaries, hosted Linux/Windows source tests, and canonical translation/provider contracts have REMOTE_GITHUB proof.
- Outbound ID→EN Meeting context is limited to the last three committed own-voice pairs for an authoritative `you` lane/session/generation. Incoming, standalone, reverse, and incomplete/spoofed metadata remain context-free.
- Worker protocol rejects malformed/non-object/non-finite/oversized requests before dispatch and bounds failure diagnostics.
- Translation success requires non-empty, complete, EOS-terminated output; standalone failures discard partial output. Provider/model failures are normalized and runtime-cache invalidation is bounded by failure class.
- Code Health enforces WorkerRuntime Ruff `E4,E7,E9,F,I`, `ruff format --check`, and pytest on Linux and hosted Windows.
- Safe-close policy is separated from the Svelte composition root and covered by deterministic runtime-policy tests.

## Active Boundary

Current proof remains `REMOTE_GITHUB`. Physical microphone/GPU/VB-CABLE/meeting-app reception, semantic quality, real latency, installed-runtime, and clean-machine claims are **not** PASS.

Large Meeting/helper/audio refactors remain deferred until the first target-Windows baseline so later structural changes have a measured behavior reference.

## Next Step

Run the first **TARGET_WINDOWS baseline** from the exact current `Local` identity: A2/A3 for actual CUDA/ASR, B1/B2/B5 for physical capture/route truth, then C0 → C1 → C4 → C5 for day-one start, outbound end-to-end, safe stop, and repeated-session stability. Record real per-stage timing during C1 and stop on the first failed owner. Only after this baseline should large realtime coordinator decomposition resume.
