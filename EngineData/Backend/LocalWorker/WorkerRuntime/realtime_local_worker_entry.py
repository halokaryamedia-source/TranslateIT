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


def handle_pipeline_handoff_stub(payload: dict[str, Any]) -> dict[str, Any]:
    command = str(payload.get("command", "pipeline_handoff")).strip() or "pipeline_handoff"
    if command == "translation_handoff":
        blocker = "translation:handoff_runtime_not_implemented"
        note = "Translation handoff command was received by the Python worker, but translated transcript runtime is not implemented on this helper route yet."
        next_runtime = "Connect ASR transcript text to the local translation model after decoder proof."
    elif command == "tts_handoff":
        blocker = "tts:handoff_runtime_not_implemented"
        note = "TTS handoff command was received by the Python worker, but synthesized voice output runtime is not implemented on this helper route yet."
        next_runtime = "Connect translated text to local TTS after translation runtime proof."
    else:
        blocker = "pipeline:handoff_runtime_not_implemented"
        note = "Pipeline handoff command was received by the Python worker, but runtime is not implemented on this helper route yet."
        next_runtime = "Connect the previous pipeline stage first."
    return {
        "ok": False,
        "stage": command,
        "command_received": True,
        "asr_boundary_ready": bool(payload.get("asr_boundary_ready", False)),
        "asr_request_prepared": bool(payload.get("asr_request_prepared", False)),
        "asr_dispatch_attempted": bool(payload.get("asr_dispatch_attempted", False)),
        "asr_dispatch_ok": bool(payload.get("asr_dispatch_ok", False)),
        "frames_received": payload.get("frames_received", 0),
        "buffered_duration_ms": payload.get("buffered_duration_ms", 0),
        "generation_token": payload.get("generation_token", 0),
        **deadline_fields(payload),
        "runtime_claim": "pipeline_handoff_migration_stub_no_runtime_claim",
        "blocker": blocker,
        "note": note,
        "next_actions": [
            "Keep this as pipeline wiring evidence until local compile/runtime proof is available.",
            next_runtime,
            "Do not claim live meeting runtime until audio, ASR, translation, TTS, and virtual mic evidence exist.",
        ],
    }


base.HANDLERS["capture_start"] = handle_capture_migration_stub
base.HANDLERS["capture_stop"] = handle_capture_migration_stub
base.HANDLERS["asr_handoff"] = handle_asr_handoff_stub
base.HANDLERS["translation_handoff"] = handle_pipeline_handoff_stub
base.HANDLERS["tts_handoff"] = handle_pipeline_handoff_stub


if __name__ == "__main__":
    raise SystemExit(base.main())
