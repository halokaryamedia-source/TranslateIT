from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:  # pragma: no cover - direct script execution
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from EngineData.LauncherApp.app_config import PROJECT_ROOT
from EngineData.LauncherApp.latency_report_reader import summarize_latency_report
from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


DEFAULT_REPORT_PATH = PROJECT_ROOT / "UserData" / "LogData" / "latency_debug_latest.json"
DEFAULT_MD_PATH = PROJECT_ROOT / "UserData" / "LogData" / "manual_latency_review_latest.md"
DEFAULT_JSON_PATH = PROJECT_ROOT / "UserData" / "LogData" / "manual_latency_review_latest.json"


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


def _format_unavailable(value: Any) -> str:
    if value in (None, "", "unavailable", 0, "0"):
        return "Latency unavailable"
    parsed = _coerce_int(value)
    if parsed is None:
        return "Latency unavailable"
    if parsed <= 0:
        return "Latency unavailable"
    return f"{parsed} ms"


def _label_to_int(label: str) -> int | None:
    match = re.search(r"(\d+)", label)
    return int(match.group(1)) if match else None


def build_review_output(report_data: dict[str, Any]) -> dict[str, Any]:
    segment_data = report_data.get("segment") if isinstance(report_data.get("segment"), dict) else {}
    text_latency = report_data.get("text_latency") if isinstance(report_data.get("text_latency"), dict) else {}
    metric_groups = report_data.get("metric_groups") if isinstance(report_data.get("metric_groups"), dict) else {}

    segment = TranscriptSegment.from_dict(segment_data)
    view_model = TranscriptCardViewModel.from_segment(segment)
    summary = summarize_latency_report(report_data)

    report_latency_ms = _coerce_int(
        text_latency.get("speech_end_to_voice_proxy_ms")
        or metric_groups.get("speech_end_to_voice_proxy_ms")
        or getattr(segment.latency, "speech_end_to_voice_proxy_ms", None)
        or summary.speech_end_to_voice_proxy_ms
    )
    ui_latency_ms = _label_to_int(view_model.total_latency_label)
    ui_report_latency_match = ui_latency_ms is not None and report_latency_ms is not None and ui_latency_ms == report_latency_ms

    return {
        "segment_id": segment.segment_id,
        "session_id": segment.session_id,
        "ui_latency_label": view_model.total_latency_label,
        "ui_latency_ms": ui_latency_ms,
        "report_latency_label": _format_unavailable(report_latency_ms),
        "report_latency_ms": report_latency_ms,
        "speech_end_to_voice_proxy_ms": report_latency_ms,
        "speech_start_to_first_voice_output_ms": _coerce_int(getattr(segment.latency, "speech_start_to_first_voice_output_ms", None)),
        "ui_report_latency_match": ui_report_latency_match,
        "status": "PASS" if ui_report_latency_match and report_latency_ms is not None else "WARN",
        "summary": summary.to_markdown(),
    }


def _render_markdown(output: dict[str, Any]) -> str:
    lines = [
        "# Manual Latency Review",
        "",
        f"- status: {_format_unavailable(output.get('status'))}",
        f"- segment_id: {_format_unavailable(output.get('segment_id'))}",
        f"- session_id: {_format_unavailable(output.get('session_id'))}",
        f"- ui_latency_label: {_format_unavailable(output.get('ui_latency_label'))}",
        f"- report_latency_label: {_format_unavailable(output.get('report_latency_label'))}",
        f"- ui_report_latency_match: {str(bool(output.get('ui_report_latency_match')))}",
        f"- speech_end_to_voice_proxy_ms: {_format_unavailable(output.get('speech_end_to_voice_proxy_ms'))}",
        f"- speech_start_to_first_voice_output_ms: {_format_unavailable(output.get('speech_start_to_first_voice_output_ms'))}",
        "",
        "## Latest Summary",
        "",
        str(output.get("summary", "unavailable")),
        "",
        "## Review Payload",
        "",
        json.dumps({key: value for key, value in output.items() if key != "summary"}, indent=2, sort_keys=True),
        "",
    ]
    return "\n".join(lines)


def _write_output(output: dict[str, Any], md_path: Path, json_path: Path) -> None:
    md_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(_render_markdown(output), encoding="utf-8")
    json_path.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Review UI card latency against the latest latency report.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--output-md", type=Path, default=DEFAULT_MD_PATH)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_JSON_PATH)
    args = parser.parse_args(argv)

    report_data = _load_json(args.report)
    output = build_review_output(report_data)
    _write_output(output, args.output_md, args.output_json)
    print(_render_markdown(output), end="")
    return 0 if output["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
