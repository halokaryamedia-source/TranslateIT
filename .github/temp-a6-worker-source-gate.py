from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
EXPECTED = sorted([
    "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
    "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py",
    "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_voice_actor_inference.py",
    "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_prepare_model_assets.py",
    "EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json",
    "EngineData/Backend/RuntimeAssets/Voice/README.md",
])


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


run("python", ".github/temp-a6-worker-patch.py")
run("python", ".github/temp-a6-worker-contract-patch.py")
run("git", "diff", "--check")
run("git", "add", "--", *EXPECTED)
staged = sorted(subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines())
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")
run("git", "config", "user.name", "TranslateIT Source Proof")
run("git", "config", "user.email", "actions@users.noreply.github.com")
run("git", "commit", "-m", "Make MyVoice the canonical daily TTS authority")
run("git", "push", "origin", "HEAD:New")
print("A6_WORKER_SOURCE_COMMIT=PASS")
