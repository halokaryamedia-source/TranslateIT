from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
VALIDATOR = ROOT / "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
EXPECTED = ["EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


text = VALIDATOR.read_text(encoding="utf-8")
text = replace_once(
    text,
    '  text: resolve(root, "src/pages/Text.svelte"),\n',
    '  text: resolve(root, "src/pages/Text.svelte"),\n  voiceLab: resolve(root, "src/pages/VoiceLab.svelte"),\n',
    "voicelab-path",
)
text = replace_once(
    text,
    '  \'type AppRoute = "meeting" | "text" | "settings"\',\n',
    '  \'type AppRoute = "meeting" | "text" | "voicelab" | "settings"\',\n',
    "app-route-marker",
)
text = replace_once(
    text,
    '  "<Text",\n  "<Settings",\n',
    '  "<Text",\n  "<VoiceLab",\n  "<Settings",\n',
    "app-voicelab-marker",
)
text = replace_once(
    text,
    'requireMarkers(source.sidebar, "Primary navigation", ["Meeting", "Text", "Settings", "Ready to translate", "Indonesian ↔ English"]);\n',
    'requireMarkers(source.sidebar, "Primary navigation", ["Meeting", "Text", "VoiceLab", "Settings", "Ready to translate", "Indonesian ↔ English"]);\n',
    "sidebar-voicelab-marker",
)
VALIDATOR.write_text(text, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
subprocess.run(["git", "add", "--", *EXPECTED], cwd=ROOT, check=True)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")

subprocess.run(["git", "config", "user.name", "TranslateIT Source Proof"], cwd=ROOT, check=True)
subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
subprocess.run(["git", "commit", "-m", "Sync startup validator with VoiceLab route"], cwd=ROOT, check=True)
subprocess.run(["git", "push", "origin", "HEAD:New"], cwd=ROOT, check=True)
print("A6_VALIDATOR_SYNC=PASS")
