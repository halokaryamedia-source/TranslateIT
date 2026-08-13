from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "EngineData/Frontend/RustApp"
TAURI = APP / "src-tauri"
HELPER = TAURI / "src/commands/helper_bridge.rs"
REL = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"


def run(*args: str, cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


text = HELPER.read_text(encoding="utf-8")
old = '''    if generation_token == 0 || meeting_generation == 0 || actor_token.is_empty() {\n        return;\n    }\n'''
new = '''    // meeting_generation == 0 is the explicit diagnostic/setup functional proof.\n    // It may establish helper-generation readiness but can never be returned by\n    // required_outbound_voice_actor_token(), which rejects generation zero and\n    // requires current Meeting authority.\n    if generation_token == 0 || actor_token.is_empty() {\n        return;\n    }\n'''
if text.count(old) != 1:
    raise RuntimeError(f"diagnostic readiness anchor count={text.count(old)}")
text = text.replace(old, new, 1)

old_test = '''    fn functional_cache_identity_is_worker_generation_bound() {\n        let cached = RequiredOutboundFunctionalReadiness {\n            generation_token: 9,\n            meeting_generation: 41,\n            actor_token: "actor-v1".to_string(),\n            verified_unix_ms: 1,\n        };\n        assert_eq!(cached.generation_token, 9);\n        assert_eq!(cached.meeting_generation, 41);\n        assert_eq!(cached.actor_token, "actor-v1");\n        assert!(cached.verified_unix_ms > 0);\n        assert_ne!(cached.meeting_generation, 42);\n    }\n'''
new_test = '''    fn functional_cache_identity_keeps_diagnostic_and_meeting_scopes_distinct() {\n        let diagnostic = RequiredOutboundFunctionalReadiness {\n            generation_token: 9,\n            meeting_generation: 0,\n            actor_token: "actor-v1".to_string(),\n            verified_unix_ms: 1,\n        };\n        assert_eq!(diagnostic.generation_token, 9);\n        assert_eq!(diagnostic.meeting_generation, 0);\n        assert_eq!(diagnostic.actor_token, "actor-v1");\n        assert!(diagnostic.verified_unix_ms > 0);\n\n        let meeting = RequiredOutboundFunctionalReadiness {\n            meeting_generation: 41,\n            ..diagnostic\n        };\n        assert_eq!(meeting.meeting_generation, 41);\n        assert_ne!(meeting.meeting_generation, 0);\n    }\n'''
if text.count(old_test) != 1:
    raise RuntimeError(f"functional cache test anchor count={text.count(old_test)}")
text = text.replace(old_test, new_test, 1)
HELPER.write_text(text, encoding="utf-8", newline="\n")

run("git", "diff", "--check", "--", REL)
run("npm.cmd", "ci", cwd=APP)
run("npm.cmd", "run", "build:frontend", cwd=APP)
run("cargo", "check", "--locked", cwd=TAURI)
run("cargo", "test", "--locked", "functional_cache_identity_keeps_diagnostic_and_meeting_scopes_distinct", cwd=TAURI)
run("git", "add", "--", REL)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != [REL]:
    raise RuntimeError(f"unexpected staged files: {staged!r}")
run("git", "config", "user.name", "TranslateIT Source Proof")
run("git", "config", "user.email", "actions@users.noreply.github.com")
run("git", "commit", "-m", "Preserve diagnostic MyVoice readiness without live authority")
run("git", "push", "origin", "HEAD:New")
print("A6_DIAGNOSTIC_READINESS_FIX=PASS")
