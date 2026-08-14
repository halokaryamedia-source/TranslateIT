from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "EngineData/Frontend/RustApp"
TAURI = APP / "src-tauri"
TARGET = TAURI / "src/commands/helper_bridge_runtime.rs"
EXPECTED = ["EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding="utf-8")
text = replace_once(
    text,
    '''mod scheduler_policy_tests {\n    use super::*;\n\n    fn reset_scheduler() {\n''',
    '''mod scheduler_policy_tests {\n    use super::*;\n\n    static SCHEDULER_TEST_SERIAL: OnceLock<Mutex<()>> = OnceLock::new();\n\n    fn scheduler_test_guard() -> std::sync::MutexGuard<'static, ()> {\n        SCHEDULER_TEST_SERIAL\n            .get_or_init(|| Mutex::new(()))\n            .lock()\n            .unwrap_or_else(|poisoned| poisoned.into_inner())\n    }\n\n    fn reset_scheduler() {\n''',
    "scheduler-test-serial-owner",
)
for name in (
    "scheduler_policy_preserves_priority_and_reserved_admission_headroom",
    "scheduler_capacity_rejection_does_not_add_waiting_callers",
    "scheduler_wait_deadline_cleans_counter_and_releases_lower_priority_blocking",
):
    text = replace_once(
        text,
        f"    fn {name}() {{\n",
        f"    fn {name}() {{\n        let _serial = scheduler_test_guard();\n",
        f"serialize-{name}",
    )
TARGET.write_text(text, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
subprocess.run(["npm.cmd", "ci"], cwd=APP, check=True)
subprocess.run(["npm.cmd", "run", "build:frontend"], cwd=APP, check=True)
subprocess.run(
    ["cargo", "test", "--locked", "scheduler_policy_tests", "--", "--nocapture"],
    cwd=TAURI,
    check=True,
)
subprocess.run(["git", "add", "--", *EXPECTED], cwd=ROOT, check=True)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")

subprocess.run(["git", "config", "user.name", "TranslateIT Source Proof"], cwd=ROOT, check=True)
subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
subprocess.run(["git", "commit", "-m", "Serialize shared scheduler policy tests"], cwd=ROOT, check=True)
subprocess.run(["git", "push", "origin", "HEAD:New"], cwd=ROOT, check=True)
print("A6_SCHEDULER_TEST_SYNC=PASS")
