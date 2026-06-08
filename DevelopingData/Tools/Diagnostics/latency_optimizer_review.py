from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:  # pragma: no cover - direct script execution
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from EngineData.LauncherApp.app_config import PROJECT_ROOT
from EngineData.LauncherApp.latency_profile import build_latency_profile_payload
from EngineData.LauncherApp.latency_report_reader import summarize_latency_report


DEFAULT_REPORT_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_debug_latest.json"
DEFAULT_MD_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_optimizer_review_latest.md"
DEFAULT_JSON_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_optimizer_review_latest.json"


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


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
        if parsed is not None and parsed > 0:
            return parsed
    return None


def _candidate_bottlenecks(report_data: dict[str, Any]) -> list[dict[str, Any]]:
    segment = report_data.get("segment") if isinstance(report_data.get("segment"), dict) else {}
    segment_latency = segment.get("latency") if isinstance(segment.get("latency"), dict) else {}
    text_latency = report_data.get("text_latency") if isinstance(report_data.get("text_latency"), dict) else {}
    breakdowns = {
        "Audio Verify": report_data.get("audio_verify_breakdown") if isinstance(report_data.get("audio_verify_breakdown"), dict) else {},
        "ASR": report_data.get("stt_breakdown") if isinstance(report_data.get("stt_breakdown"), dict) else {},
        "Translate": report_data.get("translate_breakdown") if isinstance(report_data.get("translate_breakdown"), dict) else {},
        "TTS": report_data.get("tts_breakdown") if isinstance(report_data.get("tts_breakdown"), dict) else {},
        "UI": report_data.get("ui_breakdown") if isinstance(report_data.get("ui_breakdown"), dict) else {},
    }

    audio_verify_ms = _first_int(
        breakdowns["Audio Verify"].get("ms"),
        segment_latency.get("endpoint_wait_ms"),
        segment_latency.get("speech_confirmation_ms"),
        text_latency.get("delay_after_speech_end_ms"),
    )
    asr_ms = _first_int(
        breakdowns["ASR"].get("ms"),
        segment_latency.get("asr_ms"),
        text_latency.get("asr_ms"),
    )
    translate_ms = _first_int(
        breakdowns["Translate"].get("ms"),
        segment_latency.get("translation_ms"),
        text_latency.get("translation_ms"),
    )
    tts_ms = _first_int(
        segment_latency.get("tts_voice_start_proxy_ms"),
        text_latency.get("voice_start_proxy_ms"),
        segment_latency.get("tts_playback_start_ms"),
        text_latency.get("playback_start_time"),
        breakdowns["TTS"].get("ms"),
        text_latency.get("speech_end_to_voice_proxy_ms"),
        segment_latency.get("speech_end_to_voice_proxy_ms"),
        text_latency.get("output_latency_budget_ms"),
        segment_latency.get("output_latency_budget_ms"),
        segment_latency.get("tts_audio_ready_ms"),
    )
    ui_ms = _first_int(
        breakdowns["UI"].get("ms"),
        segment_latency.get("ui_ms"),
    )

    return [
        {"stage": "Audio Verify", "ms": audio_verify_ms, "source": "endpoint_wait_ms" if audio_verify_ms is not None else "unavailable"},
        {"stage": "ASR", "ms": asr_ms, "source": "asr_ms" if asr_ms is not None else "unavailable"},
        {"stage": "Translate", "ms": translate_ms, "source": "translation_ms" if translate_ms is not None else "unavailable"},
        {"stage": "TTS", "ms": tts_ms, "source": "tts_voice_start_proxy_ms" if tts_ms is not None else "unavailable"},
        {"stage": "UI", "ms": ui_ms, "source": "ui_ms" if ui_ms is not None else "unavailable"},
    ]


def _select_largest_bottleneck(report_data: dict[str, Any]) -> dict[str, Any]:
    candidates = [candidate for candidate in _candidate_bottlenecks(report_data) if candidate["ms"] is not None]
    if not candidates:
        return {"stage": "Unknown", "ms": None, "source": "unavailable"}
    largest = max(candidates, key=lambda item: item["ms"])
    return largest


def build_review_output(report_data: dict[str, Any], *, requested_vad_preset: str | None = None) -> dict[str, Any]:
    summary = summarize_latency_report(report_data)
    bottleneck = _select_largest_bottleneck(report_data)
    bottleneck_key = bottleneck["stage"].lower().replace(" ", "_")
    profile_metric_groups = {
        "main_bottleneck_stage": bottleneck["stage"],
    }
    if bottleneck.get("ms") is not None:
        profile_metric_groups[f"{bottleneck_key}_ms"] = bottleneck["ms"]
    profile = build_latency_profile_payload(
        requested_vad_preset=requested_vad_preset,
        metric_groups=profile_metric_groups,
    )
    ui_report_latency_match = summary.speech_end_to_voice_proxy_ms is not None and summary.speech_end_to_voice_proxy_ms == _coerce_int(
        report_data.get("text_latency", {}).get("speech_end_to_voice_proxy_ms") if isinstance(report_data.get("text_latency"), dict) else None
    )
    status = "PASS" if bottleneck["ms"] is not None else "WARN"
    return {
        "status": status,
        "requested_vad_preset": profile["requested_vad_preset"],
        "selected_vad_preset": profile["selected_vad_preset"],
        "unsafe_vad_replaced": profile["unsafe_vad_replaced"],
        "profile_is_safe": profile["profile_is_safe"],
        "largest_remaining_bottleneck_stage": profile["largest_remaining_bottleneck_stage"],
        "largest_remaining_bottleneck_ms": profile["largest_remaining_bottleneck_ms"],
        "largest_remaining_bottleneck_source": bottleneck["source"],
        "ui_report_latency_match": ui_report_latency_match,
        "summary": summary.to_markdown(),
        "candidate_bottlenecks": [candidate for candidate in _candidate_bottlenecks(report_data)],
    }


def _format_unavailable(value: Any) -> str:
    return "unavailable" if value in (None, "", 0) else str(value)


def _render_markdown(output: dict[str, Any]) -> str:
    lines = [
        "# Latency Optimizer Review",
        "",
        f"- status: {_format_unavailable(output.get('status'))}",
        f"- requested_vad_preset: {_format_unavailable(output.get('requested_vad_preset'))}",
        f"- selected_vad_preset: {_format_unavailable(output.get('selected_vad_preset'))}",
        f"- unsafe_vad_replaced: {str(bool(output.get('unsafe_vad_replaced')))}",
        f"- profile_is_safe: {str(bool(output.get('profile_is_safe')))}",
        f"- largest_remaining_bottleneck_stage: {_format_unavailable(output.get('largest_remaining_bottleneck_stage'))}",
        f"- largest_remaining_bottleneck_ms: {_format_unavailable(output.get('largest_remaining_bottleneck_ms'))}",
        f"- largest_remaining_bottleneck_source: {_format_unavailable(output.get('largest_remaining_bottleneck_source'))}",
        f"- ui_report_latency_match: {str(bool(output.get('ui_report_latency_match')))}",
        "",
        "## Latest Summary",
        "",
        str(output.get("summary", "unavailable")),
        "",
        "## Candidate Bottlenecks",
        "",
        json.dumps(output.get("candidate_bottlenecks", []), indent=2, sort_keys=True),
        "",
    ]
    return "\n".join(lines)


def _write_output(output: dict[str, Any], md_path: Path, json_path: Path) -> None:
    md_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(_render_markdown(output), encoding="utf-8")
    json_path.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Review latency bottlenecks and selected safe VAD profile.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--output-md", type=Path, default=DEFAULT_MD_PATH)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_JSON_PATH)
    parser.add_argument("--requested-vad-preset", type=str, default=None)
    args = parser.parse_args(argv)

    report_data = _load_json(args.report)
    output = build_review_output(report_data, requested_vad_preset=args.requested_vad_preset)
    _write_output(output, args.output_md, args.output_json)
    print(_render_markdown(output), end="")
    return 0 if output["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
