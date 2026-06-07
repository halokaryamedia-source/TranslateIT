from __future__ import annotations

from typing import Any

from EngineData.TranscriptEngine.vad_pipeline import PRESET_LIBRARY


DEFAULT_SAFE_VAD_PRESET = "Headset"


def _is_safe_preset_name(name: str) -> bool:
    preset = PRESET_LIBRARY.get(name)
    if preset is None:
        return False
    if preset.noise_gate == "raw":
        return False
    if preset.pre_roll_audio_ms <= 0:
        return False
    if preset.minimum_speech_duration_ms <= 0:
        return False
    if preset.minimum_silence_duration_ms <= 0:
        return False
    return True


def resolve_safe_vad_preset(requested_name: str | None) -> str:
    requested = str(requested_name or "").strip()
    if requested == "Normal Room":
        return DEFAULT_SAFE_VAD_PRESET
    if requested and _is_safe_preset_name(requested):
        return requested
    return DEFAULT_SAFE_VAD_PRESET


def build_latency_profile_payload(
    *,
    requested_vad_preset: str | None,
    metric_groups: dict[str, Any] | None = None,
) -> dict[str, Any]:
    metric_groups = metric_groups or {}
    selected_vad_preset = resolve_safe_vad_preset(requested_vad_preset)
    unsafe_vad_replaced = bool(requested_vad_preset and requested_vad_preset != selected_vad_preset)
    bottleneck_stage = str(metric_groups.get("main_bottleneck_stage") or "Unknown")
    bottleneck_ms = metric_groups.get(f"{bottleneck_stage.lower().replace(' ', '_')}_ms")
    return {
        "requested_vad_preset": str(requested_vad_preset or ""),
        "selected_vad_preset": selected_vad_preset,
        "unsafe_vad_replaced": unsafe_vad_replaced,
        "profile_is_safe": _is_safe_preset_name(selected_vad_preset),
        "largest_remaining_bottleneck_stage": bottleneck_stage,
        "largest_remaining_bottleneck_ms": bottleneck_ms,
    }
