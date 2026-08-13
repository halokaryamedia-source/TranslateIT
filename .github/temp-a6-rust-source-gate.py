from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
TAURI = ROOT / "EngineData/Frontend/RustApp/src-tauri"
EXPECTED = sorted([
    "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs",
    "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs",
    "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs",
])


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


run("python", ".github/temp-a6-helper-patch.py")
run("python", ".github/temp-a6-meeting-patch.py")
run("git", "diff", "--check")
run("cargo", "check", "--locked", cwd=TAURI)
run("git", "add", "--", *EXPECTED)
staged = sorted(subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines())
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")
run("git", "config", "user.name", "TranslateIT Source Proof")
run("git", "config", "user.email", "actions@users.noreply.github.com")
run("git", "commit", "-m", "Bind Meeting Start and Live output to MyVoice")
run("git", "push", "origin", "HEAD:New")
print("A6_RUST_SOURCE_COMMIT=PASS")
