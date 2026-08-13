from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "EngineData/Frontend/RustApp"
TAURI = APP / "src-tauri"
HELPER_PATCH = ROOT / ".github/temp-a6-helper-patch.py"
EXPECTED = sorted([
    "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs",
    "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs",
    "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs",
    "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs",
    "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts",
])


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def normalize_helper_test_anchors() -> None:
    lines = HELPER_PATCH.read_text(encoding="utf-8").splitlines()
    old_line = None
    new_line = None
    for index, line in enumerate(lines):
        if "tts:sapi_synthesis_failed" in line:
            old_line = index
        if "voice_actor:actor_changed_since_meeting_start" in line and "r#" in line:
            new_line = index
    if old_line is None or new_line is None:
        raise RuntimeError("temporary helper raw-string anchors are unavailable")
    lines[old_line] = "    '            r#\"{\"ok\":false,\"stage\":\"synthesize\",\"blocker\":\"tts:sapi_synthesis_failed\"}\"#,\\n',"
    lines[new_line] = "    '            r#\"{\"ok\":false,\"stage\":\"voice_actor_synthesize\",\"blocker\":\"voice_actor:actor_changed_since_meeting_start\"}\"#,\\n',"
    HELPER_PATCH.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


normalize_helper_test_anchors()
run("python", ".github/temp-a6-helper-patch.py")
run("python", ".github/temp-a6-meeting-patch.py")
run("python", ".github/temp-a6-callers-patch.py")
run("git", "diff", "--check")
run("npm.cmd", "ci", cwd=APP)
run("npm.cmd", "run", "build:frontend", cwd=APP)
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
