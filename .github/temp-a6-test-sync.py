from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
VOICE_TEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_voice_actor_inference.py"
WORKER_TEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
EXPECTED = sorted([
    "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_voice_actor_inference.py",
    "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py",
])


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


voice = VOICE_TEST.read_text(encoding="utf-8")
voice = replace_once(
    voice,
    '    monkeypatch.setattr(worker, "get_voice_actor_runtime", lambda: {"device": "cpu", "reference_cached": True})\n',
    '    fingerprint = (("actor.json", 1, 1),)\n'
    '    monkeypatch.setattr(\n'
    '        worker.voice_actor_provider,\n'
    '        "validate_actor_package",\n'
    '        lambda _root: {"fingerprint": fingerprint},\n'
    '    )\n'
    '    monkeypatch.setattr(\n'
    '        worker,\n'
    '        "get_voice_actor_runtime",\n'
    '        lambda: {\n'
    '            "device": "cpu",\n'
    '            "reference_cached": True,\n'
    '            "fingerprint": fingerprint,\n'
    '        },\n'
    '    )\n',
    "voice-actor-runtime-contract",
)
VOICE_TEST.write_text(voice, encoding="utf-8", newline="\n")

worker = WORKER_TEST.read_text(encoding="utf-8")
worker = replace_once(
    worker,
    '    monkeypatch.setattr(worker.subprocess, "run", unexpected_subprocess)\n',
    '    monkeypatch.setattr(subprocess, "run", unexpected_subprocess)\n',
    "gpu-no-subprocess-contract",
)
WORKER_TEST.write_text(worker, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
subprocess.run(["git", "add", "--", *EXPECTED], cwd=ROOT, check=True)
staged = sorted(
    subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
)
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")

subprocess.run(["git", "config", "user.name", "TranslateIT Source Proof"], cwd=ROOT, check=True)
subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
subprocess.run(["git", "commit", "-m", "Sync A6 worker tests with actor authority"], cwd=ROOT, check=True)
subprocess.run(["git", "push", "origin", "HEAD:New"], cwd=ROOT, check=True)
print("A6_TEST_SYNC=PASS")
