from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEXT = ROOT / "docs" / "knowledge" / "next-action.md"
CONTEXT = ROOT / "CONTEXT.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


next_text = NEXT.read_text(encoding="utf-8")
old_tail = """## Current Mode\n\n**Backend Hardening Wave A — SOURCE/REMOTE PROOF CLOSED (A1-A7).** Resume release-blocking executable proof without reopening closed hardening slices unless new evidence requires it.\n\n## Next Step — P2.3: Real Python / Model Execution Proof\n\nExecute the canonical locked WorkerRuntime against real installed assets and collect truthful evidence for ASR, ID→EN translation, EN→ID translation, English TTS, CUDA-preferred behavior, and explicit CPU fallback. Keep P2.3 focused on real AI runtime execution; do not mix the deferred Windows audio-route/device acceptance cleanup or broad P3 dead-code cleanup into the model proof."""
new_tail = """## P2.3 Remote CPU Model Execution — PARTIAL PROOF ACCEPTED\n\nGitHub-hosted Windows run `31595127627` executed the canonical persistent `realtime_local_worker.py` from the committed `uv.lock` environment against real downloaded model assets. The proof used the primary `faster-whisper-large-v3-turbo` asset plus both MarianMT direction assets, and used the worker's explicit English Windows SAPI provider to synthesize the speech fixture that was then fed back through real ASR inference. Generated translation/transcript bodies and runtime paths were omitted from the proof summary.\n\nObserved runtime evidence:\n\n```text\nlocked WorkerRuntime environment                 -> PASS\nreal primary ASR preload + inference             -> PASS / CPU int8\nreal ID -> EN MarianMT preload + inference       -> PASS / CPU / EOS complete\nreal EN -> ID MarianMT preload + inference       -> PASS / CPU / EOS complete\nEnglish TTS preflight + synthesis                -> PASS / Windows SAPI / en-US\npersistent worker retained ASR + both directions -> PASS\nexplicit CPU fallback                            -> PASS / degraded truth preserved\ntracked repository state after execution         -> clean\n```\n\nThe runner exposed no NVIDIA runtime (`nvidia-smi` unavailable, Torch CUDA false, CTranslate2 CUDA false). The worker truthfully reported `cuda_primary_requested=true`, selected CPU for ASR and translation, and returned explicit CUDA-unavailable fallback reasons. This **proves the real CPU fallback path**, but it does **not** prove that ASR or translation can actually load and execute on CUDA hardware. No physical microphone, Meeting virtual-audio route, installer, or user-local-PC execution occurred in this slice.\n\n## Current Mode\n\n**P2.3 ACTIVE — REMOTE REAL-MODEL CPU PATH PROVEN.** Backend hardening A1-A7 remains closed. Real ASR, both translation directions, English TTS, persistent model lifecycle, and explicit CPU fallback now have remote execution evidence; actual CUDA execution remains the only unfinished P2.3 device claim.\n\n## Next Step — P2.3: GPU-Capable Windows CUDA Execution Proof\n\nRun the same canonical locked WorkerRuntime with the approved real ASR and MarianMT assets on a Windows environment that exposes a usable NVIDIA CUDA device. Require actual ASR and both translation directions to report and execute on CUDA, while preserving the already-proven CPU fallback contract. Do not mix Windows Meeting audio/device acceptance, installer staging, or P3 cleanup into this proof."""
next_text = replace_once(next_text, old_tail, new_tail, "P2.3 next-action tail")
NEXT.write_text(next_text, encoding="utf-8", newline="\n")

context = CONTEXT.read_text(encoding="utf-8")
context = replace_once(
    context,
    "Actual PythonRuntime bytes, vendored packages, installer placement, model execution, Meeting provider imports, and clean-machine behavior remain local release proof.",
    "Actual packaged PythonRuntime bytes, vendored-package placement, Meeting provider imports, installer placement, and clean-machine behavior remain local release proof. Separate GitHub-hosted P2.3 evidence now proves the locked persistent worker can execute the primary ASR model, both MarianMT directions, English Windows SAPI TTS, and explicit CPU fallback; real CUDA execution still requires a GPU-capable Windows target.",
    "release boundary model-proof statement",
)
context = replace_once(
    context,
    "The user currently postpones **user-local-PC**, real model/audio/device, installer, and clean-machine testing. This changes **where/when** the remaining proof is executed, not the acceptance standard.",
    "The user currently postpones **user-local-PC**, real Windows audio/device, installer, and clean-machine testing. Model execution is no longer wholly deferred: the locked WorkerRuntime has now been executed remotely on a GitHub-hosted Windows CPU environment. This changes **where/when** the remaining proof is executed, not the acceptance standard; actual CUDA execution still requires a GPU-capable Windows target.",
    "deferred proof boundary opening",
)
context = replace_once(
    context,
    "fresh real Rust settings/new-state -> native First Setup projection with zero Python descendants\n```",
    "fresh real Rust settings/new-state -> native First Setup projection with zero Python descendants\nreal locked Python worker/model execution -> ASR + ID<->EN + English TTS on CPU fallback\n```",
    "remote proof list P2.3 entry",
)
context = replace_once(
    context,
    "Fresh First Setup remote proofs remain intentionally before capability execution and have shown zero Python child processes. They do **not** prove Python worker/model inference, physical microphone behavior, Meeting virtual-audio routing, real Meeting-app reception, sleep/wake behavior during a live session, latency/stability, installer placement, or clean-machine execution.",
    "Fresh First Setup remote proofs remain intentionally before capability execution and have shown zero Python child processes. Those startup proofs themselves do **not** prove Python inference, physical microphone behavior, Meeting virtual-audio routing, real Meeting-app reception, sleep/wake behavior during a live session, latency/stability, installer placement, or clean-machine execution. Separate P2.3 run `31595127627` now proves real persistent-worker ASR/translation/TTS execution on the hosted CPU path; it does not prove CUDA execution or any Windows Meeting-audio/device behavior.",
    "fresh First Setup qualification",
)
context = replace_once(
    context,
    "private PythonRuntime + worker/model execution\nWindows Meeting audio/device validation",
    "private PythonRuntime packaging + GPU-capable CUDA execution proof\nWindows Meeting audio/device validation",
    "remaining proof list",
)
CONTEXT.write_text(context, encoding="utf-8", newline="\n")
