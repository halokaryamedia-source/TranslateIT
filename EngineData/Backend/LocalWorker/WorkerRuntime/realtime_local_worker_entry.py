from __future__ import annotations

from typing import Any

import realtime_local_worker as base


def handle_capture_migration_stub(payload: dict[str, Any]) -> dict[str, Any]:
    command = str(payload.get("command", "capture")).strip() or "capture"
    return {
        "ok": False,
        "stage": command,
        "command_received": True,
        "provider_ready": bool(payload.get("provider_ready", False)),
        "cuda_ready": bool(payload.get("cuda_ready", False)),
        "generation_token": payload.get("generation_token", 0),
        "request_unix_ms": payload.get("request_unix_ms"),
        "deadline_unix_ms": payload.get("deadline_unix_ms"),
        "deadline_ms": payload.get("deadline_ms"),
        "deadline_metadata_received": bool(payload.get("deadline_unix_ms")),
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
        "request_unix_ms": payload.get("request_unix_ms"),
        "deadline_unix_ms": payload.get("deadline_unix_ms"),
        "deadline_ms": payload.get("deadline_ms"),
        "deadline_metadata_received": bool(payload.get("deadline_unix_ms")),
        "runtime_claim": "asr_handoff_migration_stub_no_decoder_runtime_claim",
        "blocker": "asr:handoff_runtime_not_implemented",
        "note": "ASR handoff command was received by the Python worker, but decoder runtime is not implemented on this helper route yet.",
        "next_actions": [
            "Keep ASR handoff as boundary evidence until local Rust/Tauri compile proof is available.",
            "Attach a real target audio frame payload after the capture boundary is proven locally.",
            "Connect Whisper/Faster-Whisper decoding only after model loading proof.",
        ],
    }


base.HANDLERS["capture_start"] = handle_capture_migration_stub
base.HANDLERS["capture_stop"] = handle_capture_migration_stub
base.HANDLERS["asr_handoff"] = handle_asr_handoff_stub


if __name__ == "__main__":
    raise SystemExit(base.main())
