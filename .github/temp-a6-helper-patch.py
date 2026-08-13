from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
HELPER = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"


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


text = RUNTIME.read_text(encoding="utf-8")
text = once(
    text,
    '''        "status" | "tts_preflight" => WORKER_STATUS_RESPONSE_DEADLINE_MS,\n        "asr_preload" | "translation_preload" => WORKER_PRELOAD_RESPONSE_DEADLINE_MS,\n        "transcribe" | "translate" => WORKER_INFERENCE_RESPONSE_DEADLINE_MS,\n        "synthesize" => WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS,\n''',
    '''        "status" => WORKER_STATUS_RESPONSE_DEADLINE_MS,\n        "asr_preload" | "translation_preload" | "voice_actor_preflight" => {\n            WORKER_PRELOAD_RESPONSE_DEADLINE_MS\n        }\n        "transcribe" | "translate" => WORKER_INFERENCE_RESPONSE_DEADLINE_MS,\n        "voice_actor_synthesize" => WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS,\n''',
    "deadlines",
)
text = once(
    text,
    '    let tts_ready = worker_nested_bool(status, "readiness", "tts");\n',
    '    let tts_ready = worker_nested_bool(status, "readiness", "voice_actor_tts");\n',
    "required-tts-readiness",
)
text = once(
    text,
    '''        let required_outbound_prepare_failed = !ok\n            && (stage == "asr_preload"\n                || stage == "tts_preflight"\n                || (stage == "translation_preload"\n                    && value.get("direction_pair").and_then(Value::as_str) == Some("id->en")));\n''',
    '''        let blocker = worker_text(value, "blocker").unwrap_or_default();\n        let hard_voice_actor_failure = stage == "voice_actor_synthesize"\n            && !matches!(\n                blocker.as_str(),\n                "voice_actor:empty_text" | "voice_actor:text_too_large"\n            );\n        let required_outbound_prepare_failed = !ok\n            && (stage == "asr_preload"\n                || stage == "voice_actor_preflight"\n                || hard_voice_actor_failure\n                || (stage == "translation_preload"\n                    && value.get("direction_pair").and_then(Value::as_str) == Some("id->en")));\n''',
    "hard-voice-failure",
)
text = text.replace('                    "tts": true,\n', '                    "voice_actor_tts": true,\n')
RUNTIME.write_text(text, encoding="utf-8", newline="\n")

text = HELPER.read_text(encoding="utf-8")
text = once(
    text,
    '''const REQUIRED_OUTBOUND_FUNCTIONAL_TTS_OUTPUT: &str =\n    "UserData/CacheData/helper_functional_readiness/required_outbound.wav";\n''',
    '''const REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT: &str =\n    "UserData/CacheData/helper_functional_readiness/required_outbound_myvoice.wav";\n''',
    "fixture-output",
)
text = once(
    text,
    '''struct RequiredOutboundFunctionalReadiness {\n    generation_token: u64,\n    verified_unix_ms: u128,\n}\n''',
    '''struct RequiredOutboundFunctionalReadiness {\n    generation_token: u64,\n    meeting_generation: u64,\n    actor_token: String,\n    verified_unix_ms: u128,\n}\n''',
    "readiness-identity",
)
text = once(
    text,
    '''        .filter(|cached| cached.generation_token == generation_token && cached.verified_unix_ms > 0)\n''',
    '''        .filter(|cached| {\n            cached.generation_token == generation_token\n                && cached.verified_unix_ms > 0\n                && runtime_generation_is_authoritative(cached.meeting_generation)\n        })\n''',
    "verified-authority",
)
text = regex_once(
    text,
    r"\nfn required_outbound_functional_readiness_cached\(.*?\n}\n",
    "\n",
    "remove-cross-meeting-cache",
)
text = once(
    text,
    '''fn remember_required_outbound_functional_readiness(generation_token: u64) {\n    if generation_token == 0 {\n        return;\n    }\n    if let Ok(mut guard) = required_outbound_functional_readiness_store().lock() {\n        *guard = Some(RequiredOutboundFunctionalReadiness {\n            generation_token,\n            verified_unix_ms: unix_ms(),\n        });\n    }\n}\n''',
    '''fn remember_required_outbound_functional_readiness(\n    generation_token: u64,\n    meeting_generation: u64,\n    actor_token: String,\n) {\n    if generation_token == 0 || meeting_generation == 0 || actor_token.is_empty() {\n        return;\n    }\n    if let Ok(mut guard) = required_outbound_functional_readiness_store().lock() {\n        *guard = Some(RequiredOutboundFunctionalReadiness {\n            generation_token,\n            meeting_generation,\n            actor_token,\n            verified_unix_ms: unix_ms(),\n        });\n    }\n}\n\npub fn required_outbound_voice_actor_token(meeting_generation: u64) -> Option<String> {\n    if meeting_generation == 0 || !runtime_generation_is_authoritative(meeting_generation) {\n        return None;\n    }\n    required_outbound_functional_readiness_store()\n        .lock()\n        .ok()\n        .and_then(|guard| guard.as_ref().cloned())\n        .filter(|cached| cached.meeting_generation == meeting_generation)\n        .map(|cached| cached.actor_token)\n        .filter(|token| !token.is_empty())\n}\n''',
    "remember-actor-token",
)
text = text.replace("functional_tts_output_path", "functional_voice_actor_output_path")
text = once(
    text,
    '        "status" | "asr_preload" | "translation_preload" | "tts_preflight" => true,\n',
    '        "status" | "asr_preload" | "translation_preload" | "voice_actor_preflight" => true,\n',
    "invalidate-preflight",
)
text = once(
    text,
    '        "synthesize" => !matches!(blocker.as_str(), "tts:empty_text" | "tts:text_too_large"),\n',
    '''        "voice_actor_synthesize" => !matches!(\n            blocker.as_str(),\n            "voice_actor:empty_text" | "voice_actor:text_too_large"\n        ),\n''',
    "invalidate-synthesis",
)
text = once(
    text,
    '''        if task == "synthesize" || !response.ok || !runtime_generation_is_authoritative(generation)\n        {\n''',
    '''        if task == "voice_actor_synthesize"\n            || !response.ok\n            || !runtime_generation_is_authoritative(generation)\n        {\n''',
    "outbound-pipeline-clear",
)

pattern = r"\npub fn prepare_required_outbound_ai_runtime\(\) -> Result<\(\), &'static str> \{.*?\n}\n\n#\[tauri::command\]"
replacement = '''\npub fn prepare_required_outbound_ai_runtime(meeting_generation: u64) -> Result<(), &'static str> {\n    if meeting_generation == 0 || !runtime_generation_is_authoritative(meeting_generation) {\n        invalidate_required_outbound_ai_readiness();\n        return Err("Meeting authority");\n    }\n    let helper = get_helper_bridge_status();\n    if helper.state != "ready" || !helper.provider_ready || helper.generation_token == 0 {\n        invalidate_required_outbound_ai_readiness();\n        return Err("local translation runtime");\n    }\n    let generation_token = helper.generation_token;\n\n    let asr = send_worker_task(\n        "asr_preload",\n        json!({\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !asr.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err("speech recognition");\n    }\n\n    let translation = send_worker_task(\n        "translate",\n        json!({\n            "text": REQUIRED_OUTBOUND_FUNCTIONAL_ID_FIXTURE,\n            "source_language": "id",\n            "target_language": "en",\n            "max_new_tokens": 24,\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let Some(translated_fixture) = functional_translation_output(&translation) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("Indonesian to English translation");\n    };\n\n    let actor_preflight = send_worker_task(\n        "voice_actor_preflight",\n        json!({\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !actor_preflight.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    }\n    let Some(actor_token) = worker_text(&worker_response_value(&actor_preflight), "actor_token") else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    };\n\n    let voice = send_worker_task(\n        "voice_actor_synthesize",\n        json!({\n            "text": translated_fixture,\n            "output_path": REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT,\n            "expected_actor_token": actor_token.clone(),\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let Some(functional_voice_path) = functional_voice_actor_output_path(&voice) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    };\n\n    let asr_inference = send_worker_task(\n        "transcribe",\n        json!({\n            "audio_path": functional_voice_path,\n            "language": "en",\n            "beam_size": 1,\n            "vad_filter": false,\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    let functional_voice_path = worker_response_value(&voice)\n        .get("output_path")\n        .and_then(Value::as_str)\n        .map(str::to_string);\n    if let Some(path) = functional_voice_path.as_deref() {\n        let _ = fs::remove_file(path);\n    }\n    if !functional_asr_output(&asr_inference) {\n        invalidate_required_outbound_ai_readiness();\n        return Err("speech recognition");\n    }\n\n    let status = send_worker_task(\n        "status",\n        json!({\n            "meeting_start_prepare": true,\n            "meeting_generation": meeting_generation,\n        }),\n    );\n    if !status.ok\n        || worker_text(&worker_response_value(&status), "voice_actor_token").as_deref()\n            != Some(actor_token.as_str())\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err("My Voice");\n    }\n    let current = get_helper_bridge_status();\n    if current.state != "ready"\n        || !current.provider_ready\n        || current.generation_token != generation_token\n        || !runtime_generation_is_authoritative(meeting_generation)\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err("local translation runtime");\n    }\n\n    remember_required_outbound_functional_readiness(\n        generation_token,\n        meeting_generation,\n        actor_token,\n    );\n    Ok(())\n}\n\n#[tauri::command]'''
text = regex_once(text, pattern, replacement, "functional-a6")

text = once(
    text,
    '            r#"{\\"ok\\":false,\\"stage\\":\\"synthesize\\",\\"blocker\\":\\"tts:sapi_synthesis_failed\\"}"#,\n',
    '            r#"{\\"ok\\":false,\\"stage\\":\\"voice_actor_synthesize\\",\\"blocker\\":\\"voice_actor:actor_changed_since_meeting_start\\"}"#,\n',
    "test-hard-voice-body",
)
text = once(
    text,
    '''            "synthesize",\n            &hard_tts\n''',
    '''            "voice_actor_synthesize",\n            &hard_tts\n''',
    "test-hard-voice-task",
)
text = once(
    text,
    '''        let cached = RequiredOutboundFunctionalReadiness {\n            generation_token: 9,\n            verified_unix_ms: 1,\n        };\n        assert_eq!(cached.generation_token, 9);\n        assert!(cached.verified_unix_ms > 0);\n        assert_ne!(cached.generation_token, 10);\n''',
    '''        let cached = RequiredOutboundFunctionalReadiness {\n            generation_token: 9,\n            meeting_generation: 41,\n            actor_token: "actor-v1".to_string(),\n            verified_unix_ms: 1,\n        };\n        assert_eq!(cached.generation_token, 9);\n        assert_eq!(cached.meeting_generation, 41);\n        assert_eq!(cached.actor_token, "actor-v1");\n        assert!(cached.verified_unix_ms > 0);\n        assert_ne!(cached.meeting_generation, 42);\n''',
    "test-readiness-identity",
)
HELPER.write_text(text, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], check=True)
helper = HELPER.read_text(encoding="utf-8")
runtime = RUNTIME.read_text(encoding="utf-8")
for forbidden in ('"tts_preflight"', 'task == "synthesize"'):
    if forbidden in helper:
        raise RuntimeError(f"legacy helper TTS surface remains: {forbidden}")
if 'meeting_generation: u64' not in helper or 'actor_token: String' not in helper:
    raise RuntimeError("A6 readiness identity missing")
if '"voice_actor_tts"' not in runtime:
    raise RuntimeError("helper provider readiness is not MyVoice-based")
print("A6_HELPER_PATCH=PASS")
