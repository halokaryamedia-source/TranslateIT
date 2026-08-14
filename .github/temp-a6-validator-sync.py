from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "EngineData/Frontend/RustApp"
VALIDATOR = APP / "scripts/validate_startup_runtime_readiness.mjs"
EXPECTED = ["EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"]


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


text = VALIDATOR.read_text(encoding="utf-8")
text = replace_once(
    text,
    '  "functional native Meeting output callback",\n',
    "",
    "stale-c5-prose-marker",
)
old_c4 = '''requireMarkers(source.helperBridge, "C4 generation-bound functional ASR/translation/TTS readiness", [
  "required_outbound_functional_readiness_verified_unix_ms",
  "decorate_functional_readiness_status",
  "functional_tts_output_path",
  "functional_asr_output",
  'send_worker_task("asr_preload"',
  '"synthesize",',
  '"transcribe",',
  '"language": "en"',
  '"vad_filter": false',
  "remember_required_outbound_functional_readiness",
]);
'''
new_c4 = '''requireMarkers(source.helperBridge, "C4/A6 generation-bound functional ASR/translation/MyVoice readiness", [
  "required_outbound_functional_readiness_verified_unix_ms",
  "decorate_functional_readiness_status",
  "run_required_outbound_ai_probe(",
  "functional_voice_actor_output_path",
  "functional_asr_output",
  '"asr_preload",',
  '"voice_actor_preflight",',
  '"voice_actor_synthesize",',
  '"expected_actor_token": actor_token.clone()',
  '"transcribe",',
  '"language": "en"',
  '"vad_filter": false',
  "remember_required_outbound_functional_readiness",
]);
'''
text = replace_once(text, old_c4, new_c4, "c4-a6-readiness-block")
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
run("git", "commit", "-m", "Reconcile startup validator with A6 MyVoice readiness")
run("git", "push", "origin", "HEAD:New")
print("A6_VALIDATOR_RECONCILIATION=PASS")
