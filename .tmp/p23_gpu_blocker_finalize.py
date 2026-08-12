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

**P2.3 ACTIVE — REMOTE REAL-MODEL CPU PATH PROVEN.** Backend hardening A1-A7 remains closed. Real ASR, both translation directions, English TTS, persistent model lifecycle, and explicit CPU fallback now have remote execution evidence; actual CUDA execution remains the only unfinished P2.3 device claim.

## Next Step — P2.3: GPU-Capable Windows CUDA Execution Proof

Run the same canonical locked WorkerRuntime with the approved real ASR and MarianMT assets on a Windows environment that exposes a usable NVIDIA CUDA device. Require actual ASR and both translation directions to report and execute on CUDA, while preserving the already-proven CPU fallback contract. Do not mix Windows Meeting audio/device acceptance, installer staging, or P3 cleanup into this proof."""
new = """## Current Mode

**P2.3 BLOCKED ON GPU EXECUTOR — REMOTE REAL-MODEL CPU PATH PROVEN.** Backend hardening A1-A7 remains closed. Real ASR, both translation directions, English TTS, persistent model lifecycle, and explicit CPU fallback have execution evidence. The remaining CUDA claim cannot be executed through the current standard GitHub-hosted Windows runner because it exposes no NVIDIA runtime. This repository is currently owned by a personal GitHub account, so GitHub-hosted GPU larger runners cannot be provisioned for it under the current repository ownership. User-local-PC execution remains deferred and must not be substituted silently.

## Next Step — Provide an Approved GPU-Capable Windows Executor for P2.3

Provide or explicitly approve a Windows execution target with a usable NVIDIA CUDA device that this workflow can access. Once available, rerun the same canonical locked WorkerRuntime proof and require ASR plus ID→EN and EN→ID translation to actually report and execute on `cuda`; preserve the already-proven CPU fallback contract. Do not mix Windows Meeting audio/device acceptance, installer staging, or P3 cleanup into this proof."""
text = replace_once(text, old, new, "P2.3 GPU executor blocker state")
NEXT.write_text(text, encoding="utf-8", newline="\n")
