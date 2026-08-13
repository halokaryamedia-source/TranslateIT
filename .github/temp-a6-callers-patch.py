from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
HELPER = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
RUNTIME_COMMAND = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs"
FACADE = ROOT / "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, new: str, label: str) -> str:
    result, count = re.subn(pattern, new, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return result


text = HELPER.read_text(encoding="utf-8")
text = once(
    text,
    '''const REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT: &str =\n    "UserData/CacheData/helper_functional_readiness/required_outbound_myvoice.wav";\n''',
    '''const REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT: &str =\n    "UserData/CacheData/helper_functional_readiness/required_outbound_myvoice.wav";\nconst REQUIRED_OUTBOUND_DIAGNOSTIC_VOICE_OUTPUT: &str =\n    "UserData/CacheData/helper_functional_readiness/diagnostic_myvoice.wav";\n''',
    "diagnostic-output",
)
text = once(
    text,
    '''        .filter(|cached| {\n            cached.generation_token == generation_token\n                && cached.verified_unix_ms > 0\n                && runtime_generation_is_authoritative(cached.meeting_generation)\n        })\n''',
    '''        .filter(|cached| cached.generation_token == generation_token && cached.verified_unix_ms > 0)\n''',
    "setup-functional-cache",
)
pattern = r"\npub fn prepare_required_outbound_ai_runtime\(meeting_generation: u64\) -> Result<\(\), &'static str> \{.*?\n}\n\n#\[tauri::command\]"
replacement = '''\nfn run_required_outbound_ai_probe(\n    meeting_generation: Option<u64>,\n    output_path: &str,\n) -> Result<(u64, String), &'static str> {\n    if meeting_generation\n        .map(|generation| generation == 0 || !runtime_generation_is_authoritative(generation))\n        .unwrap_or(false)\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err("Meeting authority");\n    }\n    let meeting_start_prepare = meeting_generation.is_some();\n\n    // Refresh cheap capability truth first so a newly approved/rebuilt My Voice is\n    // visible to explicit setup checks and to the generation-bound Meeting probe.\n    let refreshed = send_worker_task(\n        "status",\n        json!({\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !refreshed.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err("local translation runtime");\n    }\n    let helper = get_helper_bridge_status();\n    if helper.state != "ready" || !helper.provider_ready || helper.generation_token == 0 {\n        invalidate_required_outbound_ai_readiness();\n        return Err("local translation runtime");\n    }\n    let generation_token = helper.generation_token;\n\n    let asr = send_worker_task(\n        "asr_preload",\n        json!({\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !asr.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err("speech recognition");\n    }\n\n    let translation = send_worker_task(\n        "translate",\n        json!({\n            "text": REQUIRED_OUTBOUND_FUNCTIONAL_ID_FIXTURE,\n            "source_language": "id",\n            "target_language": "en",\n            "max_new_tokens": 24,\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let Some(translated_fixture) = functional_translation_output(&translation) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("Indonesian to English translation");\n    };\n\n    let actor_preflight = send_worker_task(\n        "voice_actor_preflight",\n        json!({\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !actor_preflight.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    }\n    let Some(actor_token) = worker_text(&worker_response_value(&actor_preflight), "actor_token") else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    };\n\n    let voice = send_worker_task(\n        "voice_actor_synthesize",\n        json!({\n            "text": translated_fixture,\n            "output_path": output_path,\n            "expected_actor_token": actor_token.clone(),\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let Some(functional_voice_path) = functional_voice_actor_output_path(&voice) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    };\n\n    let asr_inference = send_worker_task(\n        "transcribe",\n        json!({\n            "audio_path": functional_voice_path,\n            "language": "en",\n            "beam_size": 1,\n            "vad_filter": false,\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let functional_voice_path = worker_response_value(&voice)\n        .get("output_path")\n        .and_then(Value::as_str)\n        .map(str::to_string);\n    if let Some(path) = functional_voice_path.as_deref() {\n        let _ = fs::remove_file(path);\n    }\n    if !functional_asr_output(&asr_inference) {\n        invalidate_required_outbound_ai_readiness();\n        return Err("speech recognition");\n    }\n\n    let status = send_worker_task(\n        "status",\n        json!({\n            "meeting_start_prepare": meeting_start_prepare,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !status.ok\n        || worker_text(&worker_response_value(&status), "voice_actor_token").as_deref()\n            != Some(actor_token.as_str())\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    }\n    let current = get_helper_bridge_status();\n    if current.state != "ready"\n        || !current.provider_ready\n        || current.generation_token != generation_token\n        || meeting_generation\n            .map(|generation| !runtime_generation_is_authoritative(generation))\n            .unwrap_or(false)\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err("local translation runtime");\n    }\n\n    Ok((generation_token, actor_token))\n}\n\npub fn verify_required_outbound_ai_runtime() -> Result<(), &'static str> {\n    let (generation_token, actor_token) = run_required_outbound_ai_probe(\n        None,\n        REQUIRED_OUTBOUND_DIAGNOSTIC_VOICE_OUTPUT,\n    )?;\n    remember_required_outbound_functional_readiness(generation_token, 0, actor_token);\n    Ok(())\n}\n\npub fn prepare_required_outbound_ai_runtime(meeting_generation: u64) -> Result<(), &'static str> {\n    let (generation_token, actor_token) = run_required_outbound_ai_probe(\n        Some(meeting_generation),\n        REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT,\n    )?;\n    if !runtime_generation_is_authoritative(meeting_generation) {\n        invalidate_required_outbound_ai_readiness();\n        return Err("Meeting authority");\n    }\n    remember_required_outbound_functional_readiness(\n        generation_token,\n        meeting_generation,\n        actor_token,\n    );\n    Ok(())\n}\n\n#[tauri::command]'''
text = regex_once(text, pattern, replacement, "split-diagnostic-and-meeting-probe")
HELPER.write_text(text, encoding="utf-8", newline="\n")

text = RUNTIME_COMMAND.read_text(encoding="utf-8")
text = once(
    text,
    "    if let Err(stage) = helper_bridge::prepare_required_outbound_ai_runtime() {\n",
    "    if let Err(stage) = helper_bridge::verify_required_outbound_ai_runtime() {\n",
    "diagnostic-caller",
)
RUNTIME_COMMAND.write_text(text, encoding="utf-8", newline="\n")

text = FACADE.read_text(encoding="utf-8")
text = once(
    text,
    "      ttsReady: readiness.tts === true,\n",
    "      ttsReady: readiness.voice_actor_tts === true,\n",
    "frontend-worker-readiness",
)
FACADE.write_text(text, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], check=True)
helper = HELPER.read_text(encoding="utf-8")
if "pub fn verify_required_outbound_ai_runtime()" not in helper:
    raise RuntimeError("diagnostic functional probe missing")
if "pub fn prepare_required_outbound_ai_runtime(meeting_generation: u64)" not in helper:
    raise RuntimeError("Meeting generation-bound probe missing")
if "remember_required_outbound_functional_readiness(generation_token, 0, actor_token)" not in helper:
    raise RuntimeError("setup functional evidence is not retained")
if "readiness.voice_actor_tts" not in FACADE.read_text(encoding="utf-8"):
    raise RuntimeError("frontend still projects legacy TTS readiness")
print("A6_DIRECT_CALLERS_PATCH=PASS")
