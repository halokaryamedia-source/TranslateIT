"""Guarded virtual audio route provider for TranslateIT.

This module is intentionally conservative. It can be called by the Rust meeting
audio owner to validate the selected virtual route or to route a generated TTS WAV
file into the selected virtual audio output device. Runtime execution remains
guarded explicitly.

Runtime proof is NOT implied by this source file. The caller must validate this on
Windows with the selected virtual cable / VB-Audio / Voicemeeter device.
"""

from __future__ import annotations

import json
import os
import sys
import wave
from pathlib import Path
from typing import Any

RUNTIME_CLAIM_DISABLED = "virtual_audio_route_provider_guarded_disabled_no_audio_execution"
RUNTIME_CLAIM_READY = "virtual_audio_route_provider_ready_needs_windows_runtime_validation"
RUNTIME_CLAIM_PREFLIGHT = "virtual_audio_route_provider_preflight_verified_needs_windows_playback_validation"
RUNTIME_CLAIM_MISSING_DEP = "virtual_audio_route_provider_dependency_missing"
RUNTIME_CLAIM_EXECUTED = "virtual_audio_route_provider_execution_attempted_needs_windows_runtime_validation"


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _response(**kwargs: Any) -> dict[str, Any]:
    base = {
        "ok": False,
        "stage": "virtual_audio_route_provider",
        "preflight_verified": False,
        "route_execution_attempted": False,
        "audio_route_ready": False,
        "blocker": "virtual_audio_route_provider:not_started",
        "next_action": "inspect_provider_response",
        "runtime_claim": RUNTIME_CLAIM_DISABLED,
    }
    base.update(kwargs)
    return base


def _load_payload() -> dict[str, Any]:
    if len(sys.argv) > 1 and sys.argv[1].strip():
        candidate = Path(sys.argv[1])
        if candidate.is_file():
            return json.loads(candidate.read_text(encoding="utf-8"))
        return json.loads(sys.argv[1])
    raw = sys.stdin.read().strip()
    return json.loads(raw) if raw else {}


def _audio_metadata(path: Path) -> dict[str, Any]:
    with wave.open(str(path), "rb") as wav:
        frames = wav.getnframes()
        sample_rate = wav.getframerate()
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()
        duration_ms = round((frames / sample_rate) * 1000) if sample_rate else 0
        return {
            "frames": frames,
            "sample_rate": sample_rate,
            "channels": channels,
            "sample_width": sample_width,
            "duration_ms": duration_ms,
        }


def _find_output_device(sd: Any, requested_name: str) -> dict[str, Any] | None:
    for index, device in enumerate(sd.query_devices()):
        name = str(device.get("name", ""))
        max_output_channels = int(device.get("max_output_channels", 0) or 0)
        if max_output_channels > 0 and name == requested_name:
            return {"index": index, "name": name, "max_output_channels": max_output_channels}
    return None


def _import_audio_runtime() -> tuple[Any, Any]:
    import numpy as np  # type: ignore
    import sounddevice as sd  # type: ignore

    return np, sd


def _preflight_virtual_audio(
    env_enabled: bool,
    payload_enabled: bool,
    selected_output_device: str,
) -> dict[str, Any]:
    if not selected_output_device:
        return _response(
            blocker="virtual_audio_route_provider:missing_selected_output_device",
            next_action="select_virtual_output_device",
        )

    if not env_enabled or not payload_enabled:
        return _response(
            blocker="virtual_audio_route_provider:execution_guard_disabled",
            next_action="enable_runtime_guards_after_ci_local_windows_validation",
            selected_output_device=selected_output_device,
        )

    try:
        _np, sd = _import_audio_runtime()
    except Exception as exc:  # pragma: no cover - dependency-specific runtime path
        return _response(
            blocker="virtual_audio_route_provider:dependency_missing_sounddevice_numpy",
            next_action="install_and_validate_sounddevice_numpy_on_windows",
            selected_output_device=selected_output_device,
            error=str(exc),
            runtime_claim=RUNTIME_CLAIM_MISSING_DEP,
        )

    output_device = _find_output_device(sd, selected_output_device)
    if not output_device:
        return _response(
            blocker="virtual_audio_route_provider:selected_output_device_not_found",
            next_action="choose_existing_virtual_output_device",
            selected_output_device=selected_output_device,
            runtime_claim=RUNTIME_CLAIM_MISSING_DEP,
        )

    return _response(
        ok=True,
        blocker="",
        next_action="start_meeting_delivery",
        selected_output_device=selected_output_device,
        selected_output_device_info=output_device,
        preflight_verified=True,
        audio_route_ready=True,
        runtime_claim=RUNTIME_CLAIM_PREFLIGHT,
    )


def route_virtual_audio(payload: dict[str, Any]) -> dict[str, Any]:
    env_enabled = _truthy(os.environ.get("TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER"))
    payload_enabled = _truthy(payload.get("enable_route_runtime")) or _truthy(payload.get("route_execution_enabled"))
    preflight_only = _truthy(payload.get("preflight_only"))
    source_audio_path = str(payload.get("source_audio_path") or "").strip()
    selected_output_device = str(payload.get("selected_output_device") or "").strip()

    if preflight_only:
        return _preflight_virtual_audio(
            env_enabled,
            payload_enabled,
            selected_output_device,
        )

    if not source_audio_path:
        return _response(
            blocker="virtual_audio_route_provider:missing_source_audio_path",
            next_action="finish_tts_audio_output_handoff",
            source_audio_path=None,
        )

    audio_path = Path(source_audio_path)
    if not audio_path.is_file():
        return _response(
            blocker="virtual_audio_route_provider:source_audio_file_missing",
            next_action="provide_existing_tts_audio_output_path",
            source_audio_path=str(audio_path),
        )

    try:
        metadata = _audio_metadata(audio_path)
    except Exception as exc:  # pragma: no cover - defensive runtime path
        return _response(
            blocker="virtual_audio_route_provider:audio_file_unreadable",
            next_action="regenerate_tts_audio_output",
            source_audio_path=str(audio_path),
            error=str(exc),
        )

    if not selected_output_device:
        return _response(
            blocker="virtual_audio_route_provider:missing_selected_output_device",
            next_action="select_virtual_output_device",
            source_audio_path=str(audio_path),
            audio_metadata=metadata,
        )

    if not env_enabled or not payload_enabled:
        return _response(
            ok=True,
            blocker="",
            next_action="enable_runtime_guards_after_ci_local_windows_validation",
            source_audio_path=str(audio_path),
            selected_output_device=selected_output_device,
            audio_metadata=metadata,
            audio_route_ready=True,
            runtime_claim=RUNTIME_CLAIM_READY,
        )

    try:
        np, sd = _import_audio_runtime()
    except Exception as exc:  # pragma: no cover - dependency-specific runtime path
        return _response(
            blocker="virtual_audio_route_provider:dependency_missing_sounddevice_numpy",
            next_action="install_and_validate_sounddevice_numpy_on_windows",
            source_audio_path=str(audio_path),
            selected_output_device=selected_output_device,
            audio_metadata=metadata,
            error=str(exc),
            runtime_claim=RUNTIME_CLAIM_MISSING_DEP,
        )

    output_device = _find_output_device(sd, selected_output_device)
    if not output_device:
        return _response(
            blocker="virtual_audio_route_provider:selected_output_device_not_found",
            next_action="choose_existing_virtual_output_device",
            source_audio_path=str(audio_path),
            selected_output_device=selected_output_device,
            audio_metadata=metadata,
            runtime_claim=RUNTIME_CLAIM_MISSING_DEP,
        )

    if payload.get("dry_run", True):
        return _response(
            ok=True,
            blocker="",
            next_action="disable_dry_run_for_windows_runtime_validation",
            source_audio_path=str(audio_path),
            selected_output_device=selected_output_device,
            selected_output_device_info=output_device,
            audio_metadata=metadata,
            audio_route_ready=True,
            runtime_claim=RUNTIME_CLAIM_READY,
        )

    try:
        with wave.open(str(audio_path), "rb") as wav:
            frames = wav.readframes(wav.getnframes())
            dtype = np.int16 if wav.getsampwidth() == 2 else np.uint8
            data = np.frombuffer(frames, dtype=dtype)
            if wav.getnchannels() > 1:
                data = data.reshape(-1, wav.getnchannels())
            sd.play(data, samplerate=wav.getframerate(), device=output_device["index"], blocking=True)
    except Exception as exc:  # pragma: no cover - device/runtime-specific path
        return _response(
            blocker="virtual_audio_route_provider:playback_failed",
            next_action="inspect_windows_audio_device_and_provider_logs",
            source_audio_path=str(audio_path),
            selected_output_device=selected_output_device,
            selected_output_device_info=output_device,
            audio_metadata=metadata,
            error=str(exc),
            route_execution_attempted=True,
            runtime_claim=RUNTIME_CLAIM_EXECUTED,
        )

    return _response(
        ok=True,
        blocker="",
        next_action="validate_audio_arrived_at_meeting_input",
        source_audio_path=str(audio_path),
        selected_output_device=selected_output_device,
        selected_output_device_info=output_device,
        audio_metadata=metadata,
        route_execution_attempted=True,
        audio_route_ready=True,
        runtime_claim=RUNTIME_CLAIM_EXECUTED,
    )


def main() -> int:
    try:
        payload = _load_payload()
        result = route_virtual_audio(payload)
    except Exception as exc:  # pragma: no cover - top-level defensive path
        result = _response(
            blocker="virtual_audio_route_provider:unhandled_error",
            next_action="inspect_provider_payload_and_logs",
            error=str(exc),
        )
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
