from __future__ import annotations

from typing import Any

import realtime_local_worker as base


def deadline_fields(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "request_unix_ms": payload.get("request_unix_ms"),
        "deadline_unix_ms": payload.get("deadline_unix_ms"),
        "deadline_ms": payload.get("deadline_ms"),
        "deadline_metadata_received": bool(payload.get("deadline_unix_ms")),
    }


def text_field(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if value is None:
        return ""
    return str(value).strip()


def handle_capture_migration_stub(payload: dict[str, Any]) -> dict[str, Any]:
    command = str(payload.get("command", "capture")).strip() or "capture"
    return {
        "ok": False,
        "stage": command,
        "command_received": True,
        "provider_ready": bool(payload.get("provider_ready", False)),
        "cuda_ready": bool(payload.get("cuda_ready", False)),
        "generation_token": payload.get("generation_token", 0),
        **deadline_fields(payload),
        "runtime_claim": "capture_helper_dispatch_migration_stub",
        "blocker": "capture:helper_runtime_not_implemented",
        "note": "Capture helper command was received by the Python worker, but helper-routed capture runtime is not implemented yet.",
        "next_actions": [
            "Keep main Start/Stop Capture on the existing capture path for now.",
            "Use this dispatch only to verify Rust/Tauri to Python helper command wiring.",
            "Implement helper-routed microphone capture after local Rust/Tauri compile proof.",
        ],
    }


def handle_asr_handoff_stub(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": False,
        "stage": "asr_handoff",
        "command_received": True,
        "boundary_ready": bool(payload.get("boundary_ready", False)),
        "frames_received": payload.get("frames_received", 0),
        "buffered_duration_ms": payload.get("buffered_duration_ms", 0),
        "ready_for_target_asr_frame": bool(payload.get("ready_for_target_asr_frame", False)),
        "generation_token": payload.get("generation_token", 0),
        **deadline_fields(payload),
        "runtime_claim": "asr_handoff_migration_stub_no_decoder_runtime_claim",
        "blocker": "asr:handoff_runtime_not_implemented",
        "note": "ASR handoff command was received by the Python worker, but decoder runtime is not implemented on this helper route yet.",
        "next_actions": [
            "Keep ASR handoff as boundary evidence until local Rust/Tauri compile proof is available.",
            "Attach a real target audio frame payload after the capture boundary is proven locally.",
            "Connect Whisper/Faster-Whisper decoding only after model loading proof.",
        ],
    }


def handle_asr_decode_contract(payload: dict[str, Any]) -> dict[str, Any]:
    audio_path = text_field(payload, "audio_path")
    audio_base64_present = bool(payload.get("audio_base64_present")) or bool(payload.get("audio_base64"))
    generation_token = payload.get("generation_token", 0)
    source_language = text_field(payload, "source_language") or text_field(payload, "language") or "id"
    base_payload: dict[str, Any] = {
        "stage": "asr_decode",
        "command_received": True,
        "generation_token": generation_token,
        **deadline_fields(payload),
        "boundary_ready": bool(payload.get("boundary_ready", False)),
        "audio_payload_ready": bool(payload.get("audio_payload_ready", False)),
        "audio_path": audio_path or None,
        "audio_base64_present": audio_base64_present,
        "sample_rate_hz": payload.get("sample_rate_hz"),
        "channels": payload.get("channels"),
        "pcm_format": payload.get("pcm_format"),
        "frame_count": payload.get("frame_count"),
        "duration_ms": payload.get("duration_ms"),
        "source_language": source_language,
        "runtime_claim": "asr_decode_worker_payload_contract_no_decoder_runtime_claim",
    }

    if not audio_path and not audio_base64_present:
        return {
            **base_payload,
            "ok": False,
            "blocker": "asr:missing_audio_payload",
            "note": "ASR decode command was received, but no audio_path or audio_base64 payload is available.",
            "next_actions": [
                "Use dispatch_asr_decode_request after the live target segment writer has produced a PCM16 WAV payload.",
                "Keep this as worker command contract evidence until a local Windows runtime test is available.",
            ],
        }

    if audio_base64_present and not audio_path:
        return {
            **base_payload,
            "ok": False,
            "blocker": "asr:audio_base64_not_supported_yet",
            "note": "ASR decode received an inline audio marker, but the worker contract currently accepts the cached WAV audio_path boundary first.",
            "next_actions": [
                "Prefer cached PCM16 WAV handoff while source-side payload size and memory safety are being validated.",
                "Add base64 decode only after payload limits and compile proof are validated.",
            ],
        }

    try:
        resolved_audio_path = base.resolve_worker_path(
            audio_path,
            base.CACHE_ROOT / "audio_segments" / "latest_live_target_segment.wav",
            base.ALLOWED_INPUT_ROOTS,
        )
    except Exception as exc:
        return {
            **base_payload,
            "ok": False,
            "blocker": f"asr:audio_path_invalid:{type(exc).__name__}",
            "note": str(exc),
            "next_actions": [
                "Keep ASR audio payloads inside UserData/CacheData or UserData/LogData.",
                "Rebuild the payload from the Rust live segment writer.",
            ],
        }

    if not resolved_audio_path.is_file():
        return {
            **base_payload,
            "ok": False,
            "blocker": "asr:audio_file_missing",
            "resolved_audio_path": str(resolved_audio_path),
            "note": "ASR decode received an audio_path, but the worker cannot find the cached WAV file.",
            "next_actions": [
                "Run capture until Transcript Boundary is ready, then dispatch ASR Decode again.",
                "Confirm the Rust live segment writer created latest_live_target_segment.wav.",
            ],
        }

    status = base.build_status_payload()
    model_ready = bool(status.get("faster_whisper_import_ready")) and bool(status.get("asr_model_ready"))
    if not model_ready:
        return {
            **base_payload,
            "ok": False,
            "blocker": "asr:model_not_ready",
            "resolved_audio_path": str(resolved_audio_path),
            "asr_model_ready": bool(status.get("asr_model_ready")),
            "faster_whisper_import_ready": bool(status.get("faster_whisper_import_ready")),
            "asr_active_model_id": status.get("asr_active_model_id"),
            "asr_active_model_path": status.get("asr_active_model_path"),
            "warnings": status.get("warnings", []),
            "next_actions": status.get("next_actions", [
                "Install faster-whisper and place the Whisper Large V3 Turbo or Medium model assets.",
            ]),
            "note": "ASR decode has a valid audio payload boundary, but model import/assets are not ready yet.",
        }

    return {
        **base_payload,
        "ok": False,
        "blocker": "asr:decoder_runtime_not_enabled_in_wrapper",
        "resolved_audio_path": str(resolved_audio_path),
        "asr_model_ready": True,
        "faster_whisper_import_ready": True,
        "asr_active_model_id": status.get("asr_active_model_id"),
        "asr_active_model_path": status.get("asr_active_model_path"),
        "note": "ASR decode payload and model readiness contract passed. The wrapper intentionally stops before Whisper transcription until local Rust/Tauri compile and Windows runtime proof are available.",
        "next_actions": [
            "After npm run check:tauri-rust-local passes, route this command to base.handle_transcribe(payload).",
            "Capture the worker response as asr_evidence before promoting transcript text into the live pipeline.",
            "Do not claim transcript/runtime proof until this command returns real transcript_text on Windows.",
        ],
    }


def handle_pipeline_handoff_stub(payload: dict[str, Any]) -> dict[str, Any]:
    command = str(payload.get("command", "pipeline_handoff")).strip() or "pipeline_handoff"
    transcript_text = text_field(payload, "transcript_text")
    translated_text = text_field(payload, "translated_text")
    tts_text = text_field(payload, "tts_text")
    transcript_available = bool(payload.get("transcript_available")) and bool(transcript_text)
    translation_available = bool(payload.get("translation_available")) and bool(translated_text)
    tts_text_available = bool(payload.get("tts_text_available")) and bool(tts_text)
    payload_source = str(payload.get("payload_source", "unknown")).strip() or "unknown"

    ok = False
    blocker = "pipeline:handoff_runtime_not_implemented"
    note = "Pipeline handoff command was received by the Python worker, but runtime is not implemented on this helper route yet."
    next_runtime = "Connect the previous pipeline stage first."
    contract_payload: dict[str, Any] = {}

    if command == "translation_handoff":
        if transcript_available:
            ok = True
            blocker = ""
            note = "Translation handoff dev payload contract accepted. No local translation model was executed."
            next_runtime = "Replace dev transcript payload with real ASR decoder output, then run the local translation model."
            contract_payload = {
                "transcript_text": transcript_text,
                "translated_text": translated_text,
                "translation_placeholder": translated_text or f"[dev-contract translation pending for] {transcript_text}",
            }
        else:
            blocker = "translation:missing_transcript_payload"
            note = "Translation handoff was received, but no transcript payload is available."
            next_runtime = "Seed a developer transcript or connect real ASR decoder output first."
    elif command == "tts_handoff":
        candidate_tts_text = tts_text or translated_text
        if translation_available or tts_text_available or candidate_tts_text:
            ok = True
            blocker = ""
            note = "TTS handoff dev payload contract accepted. No local TTS synthesis was executed."
            next_runtime = "Replace dev translated text with real translation output, then run local TTS synthesis."
            contract_payload = {
                "translated_text": translated_text,
                "tts_text": candidate_tts_text,
                "audio_output_ready": False,
            }
        else:
            blocker = "tts:missing_translated_text_payload"
            note = "TTS handoff was received, but no translated/TTS text payload is available."
            next_runtime = "Seed developer translated text or connect real translation output first."

    return {
        "ok": ok,
        "stage": command,
        "command_received": True,
        "asr_boundary_ready": bool(payload.get("asr_boundary_ready", False)),
        "asr_request_prepared": bool(payload.get("asr_request_prepared", False)),
        "asr_dispatch_attempted": bool(payload.get("asr_dispatch_attempted", False)),
        "asr_dispatch_ok": bool(payload.get("asr_dispatch_ok", False)),
        "frames_received": payload.get("frames_received", 0),
        "buffered_duration_ms": payload.get("buffered_duration_ms", 0),
        "transcript_available": transcript_available,
        "translation_available": translation_available,
        "tts_text_available": tts_text_available,
        "payload_source": payload_source,
        "contract_payload": contract_payload,
        "generation_token": payload.get("generation_token", 0),
        **deadline_fields(payload),
        "runtime_claim": "pipeline_dev_payload_contract_acceptance_no_model_runtime_claim",
        "blocker": blocker,
        "note": note,
        "next_actions": [
            "Keep this as pipeline payload contract evidence until local compile/runtime proof is available.",
            next_runtime,
            "Do not claim live meeting runtime until audio, ASR, translation, TTS, and virtual mic evidence exist.",
        ],
    }


def handle_dev_pipeline_contract_smoke(payload: dict[str, Any]) -> dict[str, Any]:
    transcript_text = text_field(payload, "transcript_text") or "Hello from the worker-side TranslateIT pipeline contract smoke."
    translated_text = text_field(payload, "translated_text") or "Halo dari worker-side pipeline contract smoke TranslateIT."
    generation_token = payload.get("generation_token", 0)

    translation_payload = {
        "command": "translation_handoff",
        "generation_token": generation_token,
        "transcript_available": True,
        "translation_available": False,
        "tts_text_available": False,
        "transcript_text": transcript_text,
        "translated_text": "",
        "tts_text": "",
        "payload_source": "worker_dev_pipeline_contract_smoke",
    }
    translation_result = handle_pipeline_handoff_stub(translation_payload)

    tts_payload = {
        "command": "tts_handoff",
        "generation_token": generation_token,
        "transcript_available": True,
        "translation_available": True,
        "tts_text_available": True,
        "transcript_text": transcript_text,
        "translated_text": translated_text,
        "tts_text": translated_text,
        "payload_source": "worker_dev_pipeline_contract_smoke",
    }
    tts_result = handle_pipeline_handoff_stub(tts_payload)
    ok = bool(translation_result.get("ok")) and bool(tts_result.get("ok"))

    return {
        "ok": ok,
        "stage": "dev_pipeline_contract_smoke",
        "command_received": True,
        "generation_token": generation_token,
        **deadline_fields(payload),
        "translation_contract_ok": bool(translation_result.get("ok")),
        "tts_contract_ok": bool(tts_result.get("ok")),
        "translation_result": translation_result,
        "tts_result": tts_result,
        "runtime_claim": "worker_pipeline_contract_smoke_no_model_runtime_claim",
        "blocker": "" if ok else "worker_pipeline_contract_smoke:failed_contract",
        "note": "Worker-side pipeline contract smoke completed without running ASR, translation, TTS, or audio output models.",
        "next_actions": [
            "Use this as worker handler contract evidence only.",
            "Replace smoke payloads with real ASR transcript and real translation output after local compile/runtime proof.",
            "Do not claim live meeting runtime until audio, ASR, translation, TTS, and virtual mic evidence exist.",
        ],
    }


base.HANDLERS["capture_start"] = handle_capture_migration_stub
base.HANDLERS["capture_stop"] = handle_capture_migration_stub
base.HANDLERS["asr_handoff"] = handle_asr_handoff_stub
base.HANDLERS["asr_decode"] = handle_asr_decode_contract
base.HANDLERS["translation_handoff"] = handle_pipeline_handoff_stub
base.HANDLERS["tts_handoff"] = handle_pipeline_handoff_stub
base.HANDLERS["dev_pipeline_contract_smoke"] = handle_dev_pipeline_contract_smoke


if __name__ == "__main__":
    raise SystemExit(base.main())
