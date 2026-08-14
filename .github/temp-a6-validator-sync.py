from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "EngineData/Frontend/RustApp"
VALIDATOR = APP / "scripts/validate_startup_runtime_readiness.mjs"
EXPECTED = ["EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"]


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


text = VALIDATOR.read_text(encoding="utf-8")
stale = '  "functional native Meeting output callback",\n'
if text.count(stale) != 1:
    raise RuntimeError(f"stale C5 prose marker count={text.count(stale)}")
text = text.replace(stale, "", 1)
VALIDATOR.write_text(text, encoding="utf-8", newline="\n")

run("git", "diff", "--check", "--", EXPECTED[0])
run("npm.cmd", "ci", cwd=APP)
run("npm.cmd", "run", "validate:quick", cwd=APP)
run("git", "add", "--", *EXPECTED)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")

run("git", "config", "user.name", "TranslateIT Source Proof")
run("git", "config", "user.email", "actions@users.noreply.github.com")
run("git", "commit", "-m", "Remove stale C5 prose-only validator marker")
run("git", "push", "origin", "HEAD:New")
print("A6_C5_VALIDATOR_SYNC=PASS")
