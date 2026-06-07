from __future__ import annotations

import argparse
import ast
import json
import re
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
import sys
from typing import Any

if __package__ in {None, ""}:  # pragma: no cover - direct script execution
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from EngineData.LauncherApp.latency_report_reader import summarize_latency_report
from EngineData.LauncherApp.app_config import PROJECT_ROOT


DEFAULT_REPORT_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_debug_latest.json"
DEFAULT_LOG_PATH = PROJECT_ROOT / "UserData" / "LogData" / "runtime_pipeline_latest.log"
DEFAULT_MD_PATH = PROJECT_ROOT / "UserData" / "LogData" / "input_output_latency_probe_latest.md"
DEFAULT_JSON_PATH = PROJECT_ROOT / "UserData" / "LogData" / "input_output_latency_probe_latest.json"


TRACE_RE = re.compile(r"TRACE:\s*(?P<event>[^|]+)\|\s*(?P<payload>\{.*\})\s*$")


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _parse_trace_line(line: str) -> dict[str, Any] | None:
    match = TRACE_RE.search(line)
    if not match:
        return None
    event = match.group("event").strip()
    payload_text = match.group("payload").strip()
    try:
        payload = ast.literal_eval(payload_text)
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    return {
        "event": event,
        "trace_id": str(payload.get("trace_id", "") or ""),
        "segment_id": str(payload.get("segment_id", "") or ""),
        "status": str(payload.get("status", "") or ""),
        "details": payload.get("details", {}),
        "raw": payload,
    }


def _load_traces(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    traces: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        parsed = _parse_trace_line(line)
        if parsed is not None:
            traces.append(parsed)
    return traces


def _latest_accepted_trace(traces: list[dict[str, Any]]) -> str:
    latest_trace_id = ""
    for record in traces:
        if record["event"] == "segment_accepted_or_rejected" and record["status"] == "accepted":
            latest_trace_id = record["trace_id"]
    return latest_trace_id


def _latest_accepted_trace_with_tts(traces: list[dict[str, Any]]) -> str:
    latest_trace_id = ""
    for record in traces:
        if record["event"] == "segment_accepted_or_rejected" and record["status"] == "accepted":
            trace_id = record["trace_id"]
            has_tts_path = any(
                item["trace_id"] == trace_id
                and item["event"] in {"tts_backend_requested", "tts_backend_selected", "voice_start_proxy", "voice_completed", "tts_audio_ready", "playback_started_or_proxy"}
                for item in traces
            )
            if has_tts_path:
                latest_trace_id = trace_id
    return latest_trace_id or _latest_accepted_trace(traces)


def _event_index(traces: list[dict[str, Any]], trace_id: str, event: str) -> int | None:
    for index, record in enumerate(traces):
        if record["trace_id"] == trace_id and record["event"] == event:
            return index
    return None


def _format(value: Any) -> str:
    if isinstance(value, bool):
        return str(value)
    return "unavailable" if value in (None, "", 0) else str(value)


def _coerce_int(value: Any) -> int | None:
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


def _first_int(*values: Any) -> int | None:
    for value in values:
        parsed = _coerce_int(value)
        if parsed is not None and parsed != 0:
            return parsed
    return None


def _parse_iso_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def _delta_ms(start: Any, end: Any) -> int | None:
    start_dt = _parse_iso_datetime(start)
    end_dt = _parse_iso_datetime(end)
    if start_dt is None or end_dt is None:
        return None
    return int(max(0, (end_dt - start_dt).total_seconds() * 1000))


def _latency_unavailable_is_not_fake_zero(total_latency_ms: int | None) -> bool:
    return total_latency_ms is None or total_latency_ms > 0


def _derive_budget_fallback(
    *,
    input_budget: int | None,
    output_budget: int | None,
    io_budget: int | None,
    total_latency: int | None,
    vad_delay: int | None,
    asr_ms: int | None,
    translation_ms: int | None,
    tts_audio_ready_ms: int | None,
    playback_start_ms: int | None,
    tts_first_chunk_ready_ms: int | None,
) -> tuple[int | None, int | None, int | None]:
    resolved_input = input_budget
    if resolved_input is None:
        component_input = [value for value in (vad_delay, asr_ms, translation_ms) if value is not None]
        if component_input:
            resolved_input = sum(component_input)

    resolved_output = output_budget
    if resolved_output is None:
        if total_latency is not None and resolved_input is not None:
            resolved_output = max(0, total_latency - resolved_input)
        else:
            component_output = [value for value in (tts_audio_ready_ms, playback_start_ms, tts_first_chunk_ready_ms) if value is not None]
            if component_output:
                resolved_output = min(component_output)

    resolved_io = io_budget
    if resolved_io is None:
        if resolved_input is not None and resolved_output is not None:
            resolved_io = resolved_input + resolved_output
        else:
            resolved_io = total_latency

    return resolved_input, resolved_output, resolved_io


def build_probe_output(report_data: dict[str, Any], log_data: list[dict[str, Any]]) -> dict[str, Any]:
    summary = summarize_latency_report(report_data)
    metric_groups = report_data.get("metric_groups") if isinstance(report_data.get("metric_groups"), dict) else {}
    text_latency = report_data.get("text_latency") if isinstance(report_data.get("text_latency"), dict) else {}
    segment = report_data.get("segment") if isinstance(report_data.get("segment"), dict) else {}
    segment_latency = segment.get("latency") if isinstance(segment.get("latency"), dict) else {}

    total_latency_ms = _first_int(
        summary.speech_start_to_first_voice_proxy_ms,
        metric_groups.get("speech_start_to_first_voice_ms"),
        text_latency.get("total_realtime_ms"),
        segment_latency.get("speech_start_to_first_voice_output_ms"),
    )
    vad_delay_ms = _first_int(
        summary.vad_endpoint_delay_ms,
        segment_latency.get("speech_confirmation_ms"),
        segment_latency.get("endpoint_wait_ms"),
        metric_groups.get("audio_verify_ms"),
    )
    asr_ms = _first_int(summary.asr_ms, metric_groups.get("stt_ms"), text_latency.get("asr_ms"), segment_latency.get("asr_latency_ms"))
    translation_ms = _first_int(
        summary.translation_ms,
        metric_groups.get("translate_ms"),
        text_latency.get("translation_ms"),
        segment_latency.get("translation_latency_ms"),
    )
    tts_audio_ready_ms = _first_int(summary.tts_audio_ready_ms, segment_latency.get("tts_voice_generate_ms"), segment_latency.get("tts_audio_ready_ms"))
    playback_start_ms = _first_int(summary.playback_start_proxy_ms, segment_latency.get("tts_playback_start_ms"), metric_groups.get("tts_ms"))
    tts_first_chunk_ready_ms = _first_int(summary.tts_first_chunk_ready_ms, segment_latency.get("tts_first_chunk_ready_ms"))
    timestamp_input_budget_ms = _delta_ms(text_latency.get("speech_start_time"), text_latency.get("translation_end_time"))
    if timestamp_input_budget_ms is None:
        timestamp_input_budget_ms = _delta_ms(text_latency.get("speech_start_time"), text_latency.get("tts_start_time"))
    timestamp_output_budget_ms = _delta_ms(text_latency.get("translation_end_time"), text_latency.get("tts_audio_ready_time"))
    if timestamp_output_budget_ms is None:
        timestamp_output_budget_ms = _delta_ms(text_latency.get("translation_end_time"), text_latency.get("playback_start_time"))
    timestamp_total_latency_ms = _delta_ms(text_latency.get("speech_start_time"), text_latency.get("first_voice_out_time"))
    if timestamp_total_latency_ms is None:
        timestamp_total_latency_ms = _delta_ms(text_latency.get("speech_start_time"), text_latency.get("tts_audio_ready_time"))
    if total_latency_ms is None:
        total_latency_ms = timestamp_total_latency_ms
    resolved_input_budget_ms, resolved_output_budget_ms, resolved_io_budget_ms = _derive_budget_fallback(
        input_budget=_first_int(
            summary.input_latency_budget_ms,
            segment_latency.get("input_latency_budget_ms"),
            text_latency.get("input_latency_budget_ms"),
            metric_groups.get("input_latency_budget_ms"),
            timestamp_input_budget_ms,
        ),
        output_budget=_first_int(
            summary.output_latency_budget_ms,
            segment_latency.get("output_latency_budget_ms"),
            text_latency.get("output_latency_budget_ms"),
            metric_groups.get("output_latency_budget_ms"),
            timestamp_output_budget_ms,
        ),
        io_budget=_first_int(
            summary.io_latency_budget_ms,
            segment_latency.get("io_latency_budget_ms"),
            text_latency.get("io_latency_budget_ms"),
            metric_groups.get("io_latency_budget_ms"),
            timestamp_total_latency_ms,
        ),
        total_latency=total_latency_ms,
        vad_delay=vad_delay_ms,
        asr_ms=asr_ms,
        translation_ms=translation_ms,
        tts_audio_ready_ms=tts_audio_ready_ms,
        playback_start_ms=playback_start_ms,
        tts_first_chunk_ready_ms=tts_first_chunk_ready_ms,
    )
    accepted_trace_id = _latest_accepted_trace_with_tts(log_data)
    requested_idx = _event_index(log_data, accepted_trace_id, "tts_backend_requested") if accepted_trace_id else None
    selected_idx = _event_index(log_data, accepted_trace_id, "tts_backend_selected") if accepted_trace_id else None
    voice_start_proxy_idx = _event_index(log_data, accepted_trace_id, "voice_start_proxy") if accepted_trace_id else None
    voice_completed_idx = _event_index(log_data, accepted_trace_id, "voice_completed") if accepted_trace_id else None
    audio_ready_idx = _event_index(log_data, accepted_trace_id, "tts_audio_ready") if accepted_trace_id else None
    playback_idx = _event_index(log_data, accepted_trace_id, "playback_started_or_proxy") if accepted_trace_id else None
    ui_received_idx = _event_index(log_data, accepted_trace_id, "segment_ready_received") if accepted_trace_id else None
    if voice_start_proxy_idx is None:
        voice_start_proxy_idx = playback_idx
    if voice_completed_idx is None:
        voice_completed_idx = audio_ready_idx
    dispatch_before_playback = (
        requested_idx is not None and playback_idx is not None and requested_idx < playback_idx
    )
    dispatch_before_audio_ready = (
        requested_idx is not None and audio_ready_idx is not None and requested_idx < audio_ready_idx
    )
    dispatch_before_voice_start_proxy = (
        requested_idx is not None and voice_start_proxy_idx is not None and requested_idx < voice_start_proxy_idx
    )
    legacy_wav_live_default = summary.tts_backend_selected == "legacy_sapi_wav"
    return {
        "summary": summary.to_markdown(),
        "accepted_trace_id": accepted_trace_id,
        "trace_order": {
            "segment_ready_received": ui_received_idx,
            "tts_backend_requested": requested_idx,
            "tts_backend_selected": selected_idx,
            "voice_start_proxy": voice_start_proxy_idx,
            "voice_completed": voice_completed_idx,
            "tts_audio_ready": audio_ready_idx,
            "playback_started_or_proxy": playback_idx,
        },
        "voice_start_proxy_ms": _first_int(summary.voice_start_proxy_ms, summary.playback_start_proxy_ms, summary.tts_direct_speak_called_ms, summary.tts_request_start_ms),
        "voice_completed_ms": _first_int(summary.voice_completed_ms, summary.tts_audio_ready_ms),
        "process_start_overhead_ms": _first_int(summary.process_start_overhead_ms),
        "dispatch_before_playback": dispatch_before_playback,
        "dispatch_before_audio_ready": dispatch_before_audio_ready,
        "dispatch_before_voice_start_proxy": dispatch_before_voice_start_proxy,
        "legacy_wav_live_default": legacy_wav_live_default,
        "input_latency_budget_ms": resolved_input_budget_ms,
        "output_latency_budget_ms": resolved_output_budget_ms,
        "io_latency_budget_ms": resolved_io_budget_ms,
        "latency_unavailable_is_not_fake_zero": _latency_unavailable_is_not_fake_zero(total_latency_ms),
        "probe_status": "PASS"
        if (
            not legacy_wav_live_default
            and dispatch_before_voice_start_proxy
            and resolved_input_budget_ms is not None
            and resolved_output_budget_ms is not None
            and resolved_io_budget_ms is not None
            and _latency_unavailable_is_not_fake_zero(total_latency_ms)
        )
        else "WARN",
    }


def _render_markdown(output: dict[str, Any]) -> str:
    lines = [
        "# Input/Output Latency Probe",
        "",
        f"- probe_status: {_format(output.get('probe_status'))}",
        f"- accepted_trace_id: {_format(output.get('accepted_trace_id'))}",
        f"- legacy_wav_live_default: {_format(output.get('legacy_wav_live_default'))}",
        f"- voice_start_proxy_ms: {_format(output.get('voice_start_proxy_ms'))}",
        f"- voice_completed_ms: {_format(output.get('voice_completed_ms'))}",
        f"- process_start_overhead_ms: {_format(output.get('process_start_overhead_ms'))}",
        f"- dispatch_before_audio_ready: {_format(output.get('dispatch_before_audio_ready'))}",
        f"- dispatch_before_playback: {_format(output.get('dispatch_before_playback'))}",
        f"- dispatch_before_voice_start_proxy: {_format(output.get('dispatch_before_voice_start_proxy'))}",
        f"- input_latency_budget_ms: {_format(output.get('input_latency_budget_ms'))}",
        f"- output_latency_budget_ms: {_format(output.get('output_latency_budget_ms'))}",
        f"- io_latency_budget_ms: {_format(output.get('io_latency_budget_ms'))}",
        f"- latency_unavailable_is_not_fake_zero: {_format(output.get('latency_unavailable_is_not_fake_zero'))}",
        "",
        "## Latest Summary",
        "",
        output.get("summary", "unavailable"),
        "",
        "## Trace Order",
        "",
        json.dumps(output.get("trace_order", {}), indent=2, sort_keys=True),
        "",
    ]
    return "\n".join(lines)


def _write_markdown(output: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_render_markdown(output), encoding="utf-8")
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Probe input/output latency budget and direct output route.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG_PATH)
    parser.add_argument("--output-md", type=Path, default=DEFAULT_MD_PATH)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_JSON_PATH)
    args = parser.parse_args(argv)

    report_data = _load_json(args.report)
    log_data = _load_traces(args.log)
    output = build_probe_output(report_data, log_data)
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")
    _write_markdown(output, args.output_md)
    print(_render_markdown(output), end="")
    return 0 if output["probe_status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
