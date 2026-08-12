from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEXT = ROOT / "docs" / "knowledge" / "next-action.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


text = NEXT.read_text(encoding="utf-8")
old = """## Current Mode

**P2.3 BLOCKED ON GPU EXECUTOR — REMOTE REAL-MODEL CPU PATH PROVEN.** Backend hardening A1-A7 remains closed. Real ASR, both translation directions, English TTS, persistent model lifecycle, and explicit CPU fallback have execution evidence. The remaining CUDA claim cannot be executed through the current standard GitHub-hosted Windows runner because it exposes no NVIDIA runtime. This repository is currently owned by a personal GitHub account, so GitHub-hosted GPU larger runners cannot be provisioned for it under the current repository ownership. User-local-PC execution remains deferred and must not be substituted silently.

## Next Step — Provide an Approved GPU-Capable Windows Executor for P2.3

Provide or explicitly approve a Windows execution target with a usable NVIDIA CUDA device that this workflow can access. Once available, rerun the same canonical locked WorkerRuntime proof and require ASR plus ID→EN and EN→ID translation to actually report and execute on `cuda`; preserve the already-proven CPU fallback contract. Do not mix Windows Meeting audio/device acceptance, installer staging, or P3 cleanup into this proof."""
new = """## Backend Pre-Local Readiness Audit — MAPPED

The user has deferred the unavailable CUDA executor proof and asked to make the active backend efficient, deterministic, and operationally ready before user-local-PC testing. P2.3 CPU execution evidence remains valid; CUDA execution remains deferred, not waived.

The pre-local audit identified six bounded readiness waves, ordered by dependency/root cause rather than warning count:

```text
B1 Virtual route ownership
-> move Meeting translated-audio playback into the Rust/Windows-audio owner
-> remove per-utterance Python route subprocess/payload/evidence handoff
-> remove hidden positive execution guard and stale unowned route preference
-> reconcile route validators with the active read-only route-status command

B2 Windows CUDA dependency truth
-> choose one supported PyTorch/CTranslate2/CUDA Windows matrix
-> make the frozen WorkerRuntime environment reproduce that matrix
-> classify real CUDA load/move failures truthfully instead of broad CPU fallback
-> pin the developer Python baseline used for local/runtime proof

B3 Runtime hot-path efficiency
-> make active Meeting status polling cheap and side-effect-light
-> stop re-enumerating Windows devices and writing routine trace/evidence on every poll/utterance
-> keep optional incoming activation from delaying required outbound Start
-> remove nvidia-smi subprocess work from routine worker status

B4 Lifecycle readiness
-> make the normal post-setup worker lifecycle self-starting/lazy instead of requiring Check Setup after each app restart
-> move suspend/resume cleanup work out of the Windows window-procedure callback while preserving authority-first Stop semantics

B5 Local proof tooling
-> provide one deterministic developer model-asset acquisition path using canonical model ownership
-> update worker smoke to current direction-based ID<->EN contract, TTS, optional ASR, and device/fallback truth
-> stop deleting the whole Cargo target cache on every ordinary local compile check
-> require the canonical quick/source validators to agree and pass

B6 Bounded dead-code/documentation cleanup
-> remove only zero-caller/unregistered runtime scaffolding proven obsolete after B1-B5
-> remove stale Realtime/Quality/NLLB documentation and dead compatibility naming
-> keep VAD thresholds/quality tuning unchanged until real audio evidence exists
-> reduce compiler warnings to a small explainable set before local acceptance
```

Known release-only work (packaged private `PythonRuntime`, NSIS staging, clean-machine install) remains after local runtime acceptance and must not be pulled into these pre-local waves.

## Current Mode

**Maintenance / Backend Pre-Local Readiness.** Backend hardening A1-A7 remains closed. P2.3 real CPU model execution remains proven; CUDA execution remains deferred until a GPU-capable Windows executor exists. The active objective is now to remove backend inefficiency, hidden gates, duplicate ownership, and stale local-proof tooling before user-local-PC testing.

## Next Step — Backend Pre-Local B1: Consolidate Meeting Virtual Output Route

Replace the per-utterance Python `sounddevice` Meeting-output provider with the existing Rust Windows-audio boundary, preserving the matched virtual-cable pair, Meeting generation authority, cancellation, and at-most-once delivery. Remove the now-redundant hidden route-execution environment gate, stale persisted route preference, payload/evidence handoff, and contradictory route validator contract. Do not mix CUDA dependency work, VAD tuning, installer packaging, or broad dead-code cleanup into B1."""
text = replace_once(text, old, new, "pre-local audit state")
NEXT.write_text(text, encoding="utf-8", newline="\n")
