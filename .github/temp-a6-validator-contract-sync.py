from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
TAURI = ROOT / "EngineData/Frontend/RustApp/src-tauri"
TARGET = TAURI / "src/commands/helper_bridge_runtime.rs"
REL = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding="utf-8")
text = replace_once(
    text,
    '        assert_eq!(worker_response_deadline_ms("synthesize"), 45_000);\n',
    '        assert_eq!(worker_response_deadline_ms("voice_actor_synthesize"), 45_000);\n',
    "deadline-class-test",
)
text = replace_once(
    text,
    '        let deadline_ms = worker_response_deadline_ms("synthesize");\n',
    '        let deadline_ms = worker_response_deadline_ms("voice_actor_synthesize");\n',
    "metadata-deadline-task",
)
text = replace_once(
    text,
    '        let payload = request_deadline_payload(&json!({"command": "synthesize"}), deadline_ms);\n',
    '        let payload = request_deadline_payload(\n            &json!({"command": "voice_actor_synthesize"}),\n            deadline_ms,\n        );\n',
    "metadata-command",
)
TARGET.write_text(text, encoding="utf-8", newline="\n")

run("git", "diff", "--check", "--", REL)
run("cargo", "test", "--locked", "deadline_policy_tests", "--", "--nocapture", cwd=TAURI)
run("git", "add", "--", REL)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != [REL]:
    raise RuntimeError(f"unexpected staged files: {staged!r}")

run("git", "config", "user.name", "TranslateIT Source Proof")
run("git", "config", "user.email", "actions@users.noreply.github.com")
run("git", "commit", "-m", "Align deadline tests with MyVoice synthesis task")
run("git", "push", "origin", "HEAD:New")
print("A6_DEADLINE_TEST_SYNC=PASS")
