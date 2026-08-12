from __future__ import annotations

from pathlib import Path

helper = Path(__file__).with_name("backend_prelocal_b3_patch.py")
try:
    exec(
        compile(helper.read_text(encoding="utf-8"), str(helper), "exec"),
        {"__name__": "__main__", "__file__": str(helper)},
    )
except RuntimeError as exc:
    if not str(exc).startswith("advance canonical next-action from B3 to B4:"):
        raise

root = helper.parents[1]
next_path = root / "docs" / "knowledge" / "next-action.md"
body = next_path.read_text(encoding="utf-8")
marker = "## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B2 CLOSED.**"
if body.count(marker) != 1:
    raise RuntimeError(f"B3 canonical tail marker changed unexpectedly: {body.count(marker)} matches")
prefix = body.split(marker, 1)[0]
new_tail = '''## Backend Pre-Local B3 — CLOSED

Active Meeting polling now reuses the generation-bound Start preflight snapshot instead of rebuilding microphone/helper/virtual-route readiness every 1.2-second status request. Internal virtual-route reads are side-effect-free; route evidence is written only by the explicit route-status Tauri command. The native Meeting output owner retains the CPAL output device prepared during Start, so each synthesized utterance no longer re-enumerates the Windows output-device list before playback. The bound virtual-route output name is also read directly from the generation-owned selection rather than rebuilding route discovery.

Optional incoming Meeting Sound activation now starts independently after required outbound has committed Live. Its slow Windows loopback preparation no longer holds the Start action open; activation rechecks the current Meeting before and after capture/consumer startup and degrades only the optional lane when startup fails. Required outbound Start remains successful once its own resources are committed.

Routine worker GPU capability status now uses the canonical PyTorch/CTranslate2 probes only. The old `nvidia-smi -L` subprocess and its status field are removed from the worker hot path; explicit GPU execution truth still comes from actual target-Windows CUDA proof.

Remote Windows/source proof for this slice passed:

```text
Worker routine GPU probe subprocess guard -> PASS
WorkerRuntime Ruff/pytest/compileall       -> PASS
Rust B3 route/preflight tests              -> PASS
B3 hot-path source contract                -> PASS
cargo check                                -> PASS
canonical npm ci                           -> PASS
Tauri release build --no-bundle            -> PASS
```

This proves the hot-path ownership and compile/runtime-independent behavior above. It does not prove physical-device hotplug timing, real Meeting Sound activation latency, VB-Cable playback, or NVIDIA CUDA execution; those remain target-Windows proof. No lifecycle redesign, VAD tuning, installer staging, proof-tool reconciliation, or broad dead-code cleanup occurred in B3.

## Current Mode

**Maintenance / Backend Pre-Local Readiness — B3 CLOSED.** Backend hardening A1-A7 and pre-local B1-B3 are source/proof closed. P2.3 CPU model execution remains proven; real CUDA execution remains deferred to a GPU-capable Windows target. Continue the mapped pre-local readiness waves in order.

## Next Step — Backend Pre-Local B4: Lifecycle Readiness

Make the normal post-setup helper lifecycle self-starting/lazy when Text or Meeting capability is actually needed, without starting Python during fresh First Setup, and move Windows suspend/resume Meeting cleanup out of the window-procedure callback into a nonblocking handoff that still converges through canonical authority-first Stop. Keep B4 limited to lifecycle readiness; do not mix B5 proof-tool reconciliation, VAD tuning, installer staging, or broad cleanup.
'''
next_path.write_text(prefix + new_tail, encoding="utf-8", newline="\n")
print("Backend pre-local B3 patch staged")
