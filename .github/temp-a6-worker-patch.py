from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
WORKER = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"


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


text = WORKER.read_text(encoding="utf-8")
text = once(text, "import subprocess\n", "", "remove-subprocess")
text = once(text, 'PIPER_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "Piper"\n', "", "remove-piper-root")
text = once(
    text,
    "SAPI_PROBE_TIMEOUT_SECONDS = 8.0\nPIPER_SYNTHESIS_TIMEOUT_SECONDS = 10.0\nSAPI_SYNTHESIS_TIMEOUT_SECONDS = 30.0\nREQUEST_SUBPROCESS_RESERVE_MS = 500\n",
    "",
    "remove-legacy-timeouts",
)
text = once(text, "SAPI_STATUS: tuple[bool, list[dict[str, str]], str] | None = None\n", "", "remove-sapi-cache")
text = regex_once(
    text,
    r"\ndef bounded_subprocess_timeout_seconds\(.*?\n\ndef import_ready\(",
    "\n\ndef import_ready(",
    "remove-legacy-subprocess-budget",
)
text = regex_once(
    text,
    r"\ndef normalize_tts_language_code\(.*?\n\ndef clear_voice_actor_runtime\(",
    "\n\ndef clear_voice_actor_runtime(",
    "remove-legacy-language-selection",
)
text = regex_once(
    text,
    r"\ndef piper_voice_config_path\(.*?\n\ndef choose_asr_model\(",
    "\n\ndef choose_asr_model(",
    "remove-piper-sapi-selection",
)

anchor = '''def voice_actor_blocker(exc: Exception) -> str:\n    detail = str(exc).strip()\n    if isinstance(exc, voice_actor_provider.VoiceLabProviderError) and detail:\n        safe = "".join(character for character in detail if character.isascii() and (character.isalnum() or character in "_:-"))\n        if safe:\n            return f"voice_actor:{safe[:160]}"\n    return f"voice_actor:runtime_failed:{type(exc).__name__}"\n\n\n'''
addition = anchor + '''def voice_actor_package_token(package: dict[str, Any]) -> str:\n    fingerprint = package.get("fingerprint")\n    if not isinstance(fingerprint, tuple) or not fingerprint:\n        raise voice_actor_provider.VoiceLabProviderError("actor_identity_missing")\n    token = json.dumps(fingerprint, ensure_ascii=True, separators=(",", ":"))\n    if not token or len(token) > 512:\n        raise voice_actor_provider.VoiceLabProviderError("actor_identity_invalid")\n    return token\n\n\ndef voice_actor_static_status() -> dict[str, Any]:\n    try:\n        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)\n        voice_actor_provider.inference_source_assets(GPT_SOVITS_SOURCE_ROOT)\n        return {\n            "ready": True,\n            "actor_token": voice_actor_package_token(package),\n            "blocker": "",\n        }\n    except Exception as exc:\n        clear_voice_actor_runtime()\n        return {\n            "ready": False,\n            "actor_token": "",\n            "blocker": voice_actor_blocker(exc),\n        }\n\n\n'''
text = once(text, anchor, addition, "add-actor-status")

text = once(
    text,
    '''    if "tts:" in joined:\n        actions.append(\n            "Provide a Piper English voice with metadata or an installed Windows SAPI English voice."\n        )\n''',
    '''    if "voice_actor:" in joined:\n        actions.append(\n            "Create and approve My Voice in VoiceLab, or repair the installed VoiceLab runtime assets."\n        )\n''',
    "status-action",
)
text = once(
    text,
    '''    tts_selection = select_english_tts_voice(payload)\n    tts_ready = bool(tts_selection["ok"])\n''',
    '''    actor_status = voice_actor_static_status()\n    voice_actor_ready = bool(actor_status["ready"])\n''',
    "status-actor-selection",
)
text = once(
    text,
    '''    if not tts_ready:\n        blockers.append(tts_selection["blocker"])\n''',
    '''    if not voice_actor_ready:\n        blockers.append(str(actor_status["blocker"]))\n''',
    "status-actor-blocker",
)
text = once(text, "        and tts_ready\n", "        and voice_actor_ready\n", "provider-ready")
text = once(text, '            "tts": tts_ready,\n', '            "voice_actor_tts": voice_actor_ready,\n', "readiness-key")
text = once(
    text,
    '''        "tts": {\n            "ready": tts_ready,\n            "provider": tts_selection["provider"],\n            "voice_id": tts_selection["voice_id"],\n            "language_code": tts_selection["language_code"],\n            "blocker": tts_selection["blocker"],\n            "sapi_voices": tts_selection["sapi_voices"],\n            "voice_actor_marcel_ready": False,\n        },\n''',
    '''        "tts": {\n            "ready": voice_actor_ready,\n            "provider": "gpt-sovits-v2proplus" if voice_actor_ready else None,\n            "voice_id": "MyVoice" if voice_actor_ready else None,\n            "language_code": "en",\n            "blocker": str(actor_status["blocker"]),\n            "actor_token": str(actor_status["actor_token"]),\n        },\n''',
    "status-tts-section",
)
text = once(
    text,
    '''        "piper_ready": tts_selection["provider"] == "piper",\n        "sapi_ready": tts_selection["provider"] == "windows-sapi",\n        "tts_default_ready": tts_ready,\n        "voice_actor_marcel_ready": False,\n''',
    '''        "voice_actor_ready": voice_actor_ready,\n        "voice_actor_token": str(actor_status["actor_token"]),\n''',
    "remove-legacy-status-fields",
)
text = once(
    text,
    '''            "translation_directions": sorted(TRANSLATION_RUNTIME.keys()),\n''',
    '''            "translation_directions": sorted(TRANSLATION_RUNTIME.keys()),\n            "voice_actor": VOICE_ACTOR_RUNTIME is not None,\n            "voice_actor_device": str(VOICE_ACTOR_RUNTIME.get("device", "not_loaded")) if VOICE_ACTOR_RUNTIME else "not_loaded",\n''',
    "loaded-actor-status",
)

old_preflight = '''def handle_voice_actor_preflight(_payload: dict[str, Any]) -> dict[str, Any]:\n    started = now_ms()\n    try:\n        runtime = get_voice_actor_runtime()\n        return {"ok": True, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "device": str(runtime.get("device", "unknown")), "reference_cached": bool(runtime.get("reference_cached")), "elapsed_ms": now_ms() - started, "blocker": "", "note": "The approved My Voice actor is loaded for local English synthesis."}\n    except Exception as exc:\n        return {"ok": False, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "blocker": voice_actor_blocker(exc), "elapsed_ms": now_ms() - started, "note": "The approved My Voice actor could not be loaded."}\n'''
new_preflight = '''def handle_voice_actor_preflight(_payload: dict[str, Any]) -> dict[str, Any]:\n    started = now_ms()\n    try:\n        runtime = get_voice_actor_runtime()\n        actor_token = voice_actor_package_token({"fingerprint": runtime.get("fingerprint")})\n        return {"ok": True, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "device": str(runtime.get("device", "unknown")), "reference_cached": bool(runtime.get("reference_cached")), "actor_token": actor_token, "elapsed_ms": now_ms() - started, "blocker": "", "note": "The approved My Voice actor is loaded for local English synthesis."}\n    except Exception as exc:\n        return {"ok": False, "stage": "voice_actor_preflight", "voice_id": "MyVoice", "language_code": "en", "actor_token": "", "blocker": voice_actor_blocker(exc), "elapsed_ms": now_ms() - started, "note": "The approved My Voice actor could not be loaded."}\n'''
text = once(text, old_preflight, new_preflight, "preflight-token")

text = once(
    text,
    '''    output_path.parent.mkdir(parents=True, exist_ok=True)\n    output_path.unlink(missing_ok=True)\n    try:\n        runtime = get_voice_actor_runtime()\n        synthesis = voice_actor_provider.synthesize_voice_actor(runtime, actor_text, output_path)\n''',
    '''    output_path.parent.mkdir(parents=True, exist_ok=True)\n    output_path.unlink(missing_ok=True)\n    try:\n        expected_actor_token = compact_runtime_text(payload.get("expected_actor_token", ""), 512)\n        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)\n        actor_token = voice_actor_package_token(package)\n        if expected_actor_token and actor_token != expected_actor_token:\n            clear_voice_actor_runtime()\n            raise voice_actor_provider.VoiceLabProviderError("actor_changed_since_meeting_start")\n        runtime = get_voice_actor_runtime()\n        runtime_token = voice_actor_package_token({"fingerprint": runtime.get("fingerprint")})\n        if expected_actor_token and runtime_token != expected_actor_token:\n            clear_voice_actor_runtime()\n            raise voice_actor_provider.VoiceLabProviderError("actor_changed_since_meeting_start")\n        synthesis = voice_actor_provider.synthesize_voice_actor(runtime, actor_text, output_path)\n''',
    "synthesize-expected-token",
)
text = once(
    text,
    '''        return {"ok": True, "stage": "voice_actor_synthesize", "voice_id": "MyVoice", "language_code": "en", "device": synthesis["device"], "reference_cached": synthesis["reference_cached"], "sample_rate": synthesis["sample_rate"], "output_path": str(output_path), "elapsed_ms": now_ms() - started, "blocker": ""}\n''',
    '''        return {"ok": True, "stage": "voice_actor_synthesize", "voice_id": "MyVoice", "language_code": "en", "device": synthesis["device"], "reference_cached": synthesis["reference_cached"], "sample_rate": synthesis["sample_rate"], "actor_token": runtime_token, "output_path": str(output_path), "elapsed_ms": now_ms() - started, "blocker": ""}\n''',
    "synthesize-return-token",
)

text = regex_once(
    text,
    r"\ndef handle_tts_preflight\(.*?\n\nHANDLERS = \{",
    "\n\nHANDLERS = {",
    "remove-legacy-handlers",
)
text = once(text, '    "tts_preflight": handle_tts_preflight,\n    "synthesize": handle_synthesize,\n', "", "remove-handler-registration")

compile(text, str(WORKER), "exec")
WORKER.write_text(text, encoding="utf-8", newline="\n")
subprocess.run(["git", "diff", "--check", "--", str(WORKER.relative_to(ROOT))], check=True)

final = WORKER.read_text(encoding="utf-8")
for forbidden in ('"tts_preflight":', '"synthesize": handle_synthesize', 'PIPER_ROOT', 'windows-sapi'):
    if forbidden in final:
        raise RuntimeError(f"legacy daily TTS surface remains: {forbidden}")
if '"voice_actor_tts": voice_actor_ready' not in final:
    raise RuntimeError("MyVoice is not worker required-TTS readiness")
if 'actor_changed_since_meeting_start' not in final:
    raise RuntimeError("Meeting actor binding guard missing")
print("A6_WORKER_PATCH=PASS")
