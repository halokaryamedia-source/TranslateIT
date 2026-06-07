from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from EngineData.LauncherApp.app_config import PROJECT_ROOT


DEFAULT_REPORT_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_debug_latest.json"
DEFAULT_SUMMARY_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_latest_summary.md"


def _format_unavailable(value: Any) -> str:
    return "unavailable" if value in (None, "", 0) else str(value)


def _coerce_int_or_none(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    try:
        text = str(value).strip()
        if not text:
            return None
        return int(text)
    except Exception:
        return None


def _delta_ms(start_iso: Any, end_iso: Any) -> int | None:
    if not start_iso or not end_iso:
        return None
    try:
        start_dt = datetime.fromisoformat(str(start_iso))
        end_dt = datetime.fromisoformat(str(end_iso))
    except Exception:
        return None
    return int(max(0, (end_dt - start_dt).total_seconds() * 1000))


def _voice_signal_state(
    *,
    voice_start_proxy_ms: int | None,
    speech_end_to_voice_proxy_ms: int | None,
    direct_playback: bool,
) -> str:
    if voice_start_proxy_ms is not None or speech_end_to_voice_proxy_ms is not None or direct_playback:
        return "proxy"
    return "unavailable"


def _issue_signals_from_payload(text_latency: dict[str, Any], metric_groups: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    issue_signals = text_latency.get("issue_signals")
    if isinstance(issue_signals, dict):
        return issue_signals
    issue_signals = metric_groups.get("issue_signals")
    if isinstance(issue_signals, dict):
        return issue_signals
    issue_signals = data.get("issue_signals")
    return issue_signals if isinstance(issue_signals, dict) else {}


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


@dataclass(slots=True)
class LatencyReportSummary:
    tts_backend_name: str = ""
    tts_backend_selected: str = ""
    tts_backend_fallback_reason: str = ""
    tts_backend_is_streaming: str = "unavailable"
    first_voice_out_is_real_or_proxy: str = "unavailable"
    provider_used: str = ""
    provider_benchmark_ms: int | None = None
    provider_selection_reason: str = ""
    tts_request_start_ms: int | None = None
    speech_start_to_first_voice_proxy_ms: int | None = None
    speech_end_to_first_voice_proxy_ms: int | None = None
    vad_endpoint_delay_ms: int | None = None
    asr_ms: int | None = None
    translation_ms: int | None = None
    tts_audio_ready_ms: int | None = None
    tts_direct_speak_called_ms: int | None = None
    voice_start_proxy_ms: int | None = None
    voice_completed_ms: int | None = None
    process_start_overhead_ms: int | None = None
    speech_end_to_voice_proxy_ms: int | None = None
    tts_first_chunk_ready_ms: int | None = None
    playback_enqueue_ms: int | None = None
    playback_start_proxy_ms: int | None = None
    first_voice_out_proxy_ms: int | None = None
    tts_queue_depth: int | None = None
    tts_pending_jobs_remaining: int | None = None
    input_latency_budget_ms: int | None = None
    output_latency_budget_ms: int | None = None
    io_latency_budget_ms: int | None = None
    main_bottleneck_stage: str = ""
    health_overview_status: str = "unknown"
    health_overview_stage: str = "Unknown"
    health_overview_note: str = ""
    issue_summary: str = ""
    issue_status: str = "unknown"
    playback_failure_stage: str = "unknown"
    playback_failure_reason: str = ""
    playback_health_note: str = ""

    def to_markdown(self) -> str:
        lines = [
            "# Latest Latency Summary",
            "",
            "## Health Overview",
            "",
            f"- Health overview status: {_format_unavailable(self.health_overview_status)}",
            f"- Health overview stage: {_format_unavailable(self.health_overview_stage)}",
            f"- Issue summary: {_format_unavailable(self.issue_summary)}",
            f"- Playback failure stage: {_format_unavailable(self.playback_failure_stage)}",
            f"- Playback failure reason: {_format_unavailable(self.playback_failure_reason)}",
            f"- Health overview note: {_format_unavailable(self.health_overview_note)}",
            f"- Playback health note: {_format_unavailable(self.playback_health_note)}",
            "",
            "## Issue Triage",
            "",
            f"- Issue status: {_format_unavailable(self.issue_status)}",
            f"- Note: This summary uses preserved latency metrics only.",
            "",
            f"- TTS backend selected: {_format_unavailable(self.tts_backend_selected)}",
            f"- TTS backend fallback reason: {_format_unavailable(self.tts_backend_fallback_reason)}",
            f"- First voice out: {_format_unavailable(self.first_voice_out_is_real_or_proxy)}",
            f"- Provider used: {_format_unavailable(self.provider_used)}",
            f"- Provider benchmark ms: {_format_unavailable(self.provider_benchmark_ms)}",
            f"- TTS request start ms: {_format_unavailable(self.tts_request_start_ms)}",
            f"- Speech start to first voice proxy ms: {_format_unavailable(self.speech_start_to_first_voice_proxy_ms)}",
            f"- Speech end to first voice proxy ms: {_format_unavailable(self.speech_end_to_first_voice_proxy_ms)}",
            f"- ASR ms: {_format_unavailable(self.asr_ms)}",
            f"- Translation ms: {_format_unavailable(self.translation_ms)}",
            f"- TTS audio ready ms: {_format_unavailable(self.tts_audio_ready_ms)}",
            f"- Voice start proxy ms: {_format_unavailable(self.voice_start_proxy_ms)}",
            f"- Voice completed ms: {_format_unavailable(self.voice_completed_ms)}",
            f"- Playback start proxy ms: {_format_unavailable(self.playback_start_proxy_ms)}",
            f"- TTS queue depth: {_format_unavailable(self.tts_queue_depth)}",
            f"- Input latency budget ms: {_format_unavailable(self.input_latency_budget_ms)}",
            f"- Output latency budget ms: {_format_unavailable(self.output_latency_budget_ms)}",
            f"- Main bottleneck stage: {_format_unavailable(self.main_bottleneck_stage)}",
            f"- Playback failure stage: {_format_unavailable(self.playback_failure_stage)}",
            f"- Playback failure reason: {_format_unavailable(self.playback_failure_reason)}",
            "",
        ]
        return "\n".join(lines)


def summarize_latency_report(data: dict[str, Any]) -> LatencyReportSummary:
    segment = data.get("segment") if isinstance(data.get("segment"), dict) else {}
    text_latency = data.get("text_latency") if isinstance(data.get("text_latency"), dict) else {}
    metric_groups = data.get("metric_groups") if isinstance(data.get("metric_groups"), dict) else {}
    segment_latency = segment.get("latency") if isinstance(segment.get("latency"), dict) else {}

    backend_name = str(segment_latency.get("tts_backend_name", "") or data.get("tts_backend_name", ""))
    backend_selected = str(segment_latency.get("tts_backend_selected", "") or data.get("tts_backend_selected", ""))
    fallback_reason = str(segment_latency.get("tts_backend_fallback_reason", "") or data.get("tts_backend_fallback_reason", ""))
    backend_streaming = "yes" if backend_selected == "experimental_streaming" else "no" if backend_selected else "unavailable"
    direct_playback = bool(segment_latency.get("tts_backend_selected") == "sapi_direct_async" or data.get("tts_backend_selected") == "sapi_direct_async")
    provider_used = str(segment_latency.get("tts_provider_used", "") or data.get("tts_provider_used", ""))
    provider_benchmark_ms = _coerce_int_or_none(segment_latency.get("tts_provider_benchmark_ms") or data.get("tts_provider_benchmark_ms"))
    provider_selection_reason = str(segment_latency.get("tts_provider_selection_reason", "") or data.get("tts_provider_selection_reason", ""))
    tts_request_start_ms = _coerce_int_or_none(segment_latency.get("tts_request_start_ms"))

    speech_start_to_first_voice = _coerce_int_or_none(
        metric_groups.get("speech_start_to_first_voice_ms")
        or text_latency.get("total_realtime_ms")
        or segment_latency.get("speech_start_to_first_voice_output_ms")
    )
    speech_end_to_first_voice = _coerce_int_or_none(
        metric_groups.get("delay_after_speech_end_ms")
        or text_latency.get("delay_after_speech_end_ms")
        or segment_latency.get("delay_after_speech_end_ms")
    )
    vad_endpoint_delay = _coerce_int_or_none(segment_latency.get("speech_confirmation_ms") or segment_latency.get("endpoint_wait_ms"))
    asr_ms = _coerce_int_or_none(
        metric_groups.get("stt_ms")
        or text_latency.get("asr_ms")
        or segment_latency.get("asr_latency_ms")
        or segment_latency.get("asr_ms")
    )
    translation_ms = _coerce_int_or_none(
        metric_groups.get("translate_ms")
        or text_latency.get("translation_ms")
        or segment_latency.get("translation_latency_ms")
        or segment_latency.get("translation_ms")
    )
    voice_start_proxy_ms = _coerce_int_or_none(
        segment_latency.get("tts_voice_start_proxy_ms")
        or segment_latency.get("tts_playback_start_ms")
        or segment_latency.get("tts_direct_speak_called_ms")
        or segment_latency.get("tts_voice_generate_ms")
    )
    voice_completed_ms = _coerce_int_or_none(segment_latency.get("tts_voice_completed_ms") or segment_latency.get("tts_audio_ready_ms"))
    process_start_overhead_ms = _coerce_int_or_none(segment_latency.get("tts_process_start_overhead_ms"))
    speech_end_to_voice_proxy_ms = _coerce_int_or_none(
        segment_latency.get("speech_end_to_voice_proxy_ms")
        or text_latency.get("speech_end_to_voice_proxy_ms")
        or metric_groups.get("speech_end_to_voice_proxy_ms")
    )
    if speech_end_to_voice_proxy_ms is None:
        speech_end_to_voice_proxy_ms = _delta_ms(text_latency.get("speech_end_time"), text_latency.get("voice_start_proxy_time"))
    tts_audio_ready_ms = voice_completed_ms
    tts_direct_speak_called_ms = _coerce_int_or_none(segment_latency.get("tts_direct_speak_called_ms"))
    tts_first_chunk_ready_ms = _coerce_int_or_none(segment_latency.get("tts_first_chunk_ready_ms"))
    playback_enqueue_ms = _coerce_int_or_none(segment_latency.get("tts_playback_requested_ms") or segment_latency.get("tts_playback_request_ready_ms"))
    playback_start_proxy_ms = voice_start_proxy_ms or _coerce_int_or_none(segment_latency.get("tts_playback_start_ms") or metric_groups.get("tts_ms"))
    first_voice_out_proxy_ms = playback_start_proxy_ms or speech_start_to_first_voice
    tts_queue_depth = _coerce_int_or_none(segment_latency.get("tts_queue_depth"))
    tts_pending_jobs_remaining = _coerce_int_or_none(segment_latency.get("tts_pending_jobs_remaining"))
    input_latency_budget_ms = _coerce_int_or_none(
        segment_latency.get("input_latency_budget_ms") or text_latency.get("input_latency_budget_ms") or metric_groups.get("input_latency_budget_ms")
    )
    output_latency_budget_ms = _coerce_int_or_none(
        segment_latency.get("output_latency_budget_ms") or text_latency.get("output_latency_budget_ms") or metric_groups.get("output_latency_budget_ms")
    )
    io_latency_budget_ms = _coerce_int_or_none(
        segment_latency.get("io_latency_budget_ms") or text_latency.get("io_latency_budget_ms") or metric_groups.get("io_latency_budget_ms")
    )
    main_bottleneck_stage = str(metric_groups.get("main_bottleneck_stage") or data.get("main_bottleneck_stage") or "")
    health_overview = data.get("health_overview") if isinstance(data.get("health_overview"), dict) else {}
    if not health_overview and isinstance(text_latency.get("health_overview"), dict):
        health_overview = text_latency.get("health_overview", {})
    if not health_overview and isinstance(metric_groups.get("health_overview"), dict):
        health_overview = metric_groups.get("health_overview", {})
    issue_summary = str(
        text_latency.get("issue_summary")
        or metric_groups.get("issue_summary")
        or data.get("issue_summary")
        or ""
    )
    issue_signals = _issue_signals_from_payload(text_latency, metric_groups, data)
    issue_status = str(issue_signals.get("status") or data.get("issue_status", "unknown") or "unknown")
    health_overview_status = str(health_overview.get("status") or issue_status or "unknown")
    health_overview_stage = str(health_overview.get("issue_primary_stage") or issue_signals.get("primary_stage") or "Unknown")
    health_overview_note = str(health_overview.get("note") or "Use health_overview first: it combines engine health, playback health, and issue triage without changing runtime behavior.")
    playback_failure_stage = str(
        data.get("playback_failure_stage")
        or text_latency.get("playback_failure_stage")
        or health_overview.get("playback_failure_stage")
        or "unknown"
    )
    playback_failure_reason = str(
        data.get("playback_failure_reason")
        or text_latency.get("playback_failure_reason")
        or health_overview.get("playback_failure_reason")
        or ""
    )
    playback_health_note = str(
        data.get("playback_health_note")
        or text_latency.get("playback_health_note")
        or health_overview.get("playback_health_note")
        or ""
    )
    first_voice_out_state = _voice_signal_state(
        voice_start_proxy_ms=voice_start_proxy_ms,
        speech_end_to_voice_proxy_ms=speech_end_to_voice_proxy_ms,
        direct_playback=direct_playback,
    )
    return LatencyReportSummary(
        tts_backend_name=backend_name,
        tts_backend_selected=backend_selected,
        tts_backend_fallback_reason=fallback_reason,
        tts_backend_is_streaming=backend_streaming,
        first_voice_out_is_real_or_proxy=first_voice_out_state,
        provider_used=provider_used,
        provider_benchmark_ms=provider_benchmark_ms,
        provider_selection_reason=provider_selection_reason,
        tts_request_start_ms=tts_request_start_ms,
        speech_start_to_first_voice_proxy_ms=speech_start_to_first_voice,
        speech_end_to_first_voice_proxy_ms=speech_end_to_first_voice,
        vad_endpoint_delay_ms=vad_endpoint_delay,
        asr_ms=asr_ms,
        translation_ms=translation_ms,
        tts_audio_ready_ms=tts_audio_ready_ms,
        tts_direct_speak_called_ms=tts_direct_speak_called_ms,
        voice_start_proxy_ms=voice_start_proxy_ms,
        voice_completed_ms=voice_completed_ms,
        process_start_overhead_ms=process_start_overhead_ms,
        speech_end_to_voice_proxy_ms=speech_end_to_voice_proxy_ms,
        tts_first_chunk_ready_ms=tts_first_chunk_ready_ms,
        playback_enqueue_ms=playback_enqueue_ms,
        playback_start_proxy_ms=playback_start_proxy_ms,
        first_voice_out_proxy_ms=first_voice_out_proxy_ms,
        tts_queue_depth=tts_queue_depth,
        tts_pending_jobs_remaining=tts_pending_jobs_remaining,
        input_latency_budget_ms=input_latency_budget_ms,
        output_latency_budget_ms=output_latency_budget_ms,
        io_latency_budget_ms=io_latency_budget_ms,
        main_bottleneck_stage=main_bottleneck_stage,
        health_overview_status=health_overview_status,
        health_overview_stage=health_overview_stage,
        health_overview_note=health_overview_note,
        issue_summary=issue_summary,
        issue_status=issue_status,
        playback_failure_stage=playback_failure_stage,
        playback_failure_reason=playback_failure_reason,
        playback_health_note=playback_health_note,
    )


def write_summary(summary: LatencyReportSummary, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(summary.to_markdown(), encoding="utf-8")
    return output_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read the latest TranslateIT latency report.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_SUMMARY_PATH)
    args = parser.parse_args(argv)
    summary = summarize_latency_report(_load_json(args.report))
    write_summary(summary, args.output)
    print(summary.to_markdown(), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
