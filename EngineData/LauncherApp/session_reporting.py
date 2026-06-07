from __future__ import annotations

from datetime import datetime
from typing import Any

from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


def _app_version_if_available() -> str:
    return ""


def _field(source: Any, name: str, default: Any = "") -> Any:
    if source is None:
        return default
    if isinstance(source, dict):
        return source.get(name, default)
    return getattr(source, name, default)


def _segment_id(source: Any) -> str:
    value = _field(source, "segment_id", "")
    return str(value or "")


def _quality_status(source: Any) -> str:
    quality = _field(source, "quality", None)
    if isinstance(quality, dict):
        return str(quality.get("status", "") or "")
    return str(getattr(quality, "status", "") or "")


def _latency(source: Any) -> Any:
    return _field(source, "latency", None)


def _metric_raw(source: Any, name: str) -> Any:
    if source is None:
        return None
    if isinstance(source, dict):
        return source.get(name)
    data = getattr(source, "_data", None)
    if isinstance(data, dict):
        return data.get(name)
    return getattr(source, name, None)


def _delta_ms(start_iso: Any, end_iso: Any) -> int | None:
    if not start_iso or not end_iso:
        return None
    try:
        start_dt = datetime.fromisoformat(str(start_iso))
        end_dt = datetime.fromisoformat(str(end_iso))
    except Exception:
        return None
    return int(max(0, (end_dt - start_dt).total_seconds() * 1000))


def _coerce_int_or_none(value: Any) -> int | None:
    if value in (None, "", "unavailable"):
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(str(value).strip())
    except Exception:
        return None


def _voice_out_state(
    *,
    voice_start_proxy_ms: int | None,
    speech_end_to_voice_proxy_ms: int | None,
    direct_playback: bool,
) -> str:
    if voice_start_proxy_ms is not None or speech_end_to_voice_proxy_ms is not None or direct_playback:
        return "proxy"
    return "unavailable"


def _issue_status_label(quality_status: str, measurement_status: str) -> str:
    normalized_quality = str(quality_status or "").strip().lower()
    normalized_measurement = str(measurement_status or "").strip().lower()
    if normalized_quality and normalized_quality not in {"accepted", "measured", "ok"}:
        return normalized_quality
    if normalized_measurement in {"measured", "partial", "unavailable"}:
        return normalized_measurement
    if normalized_quality:
        return normalized_quality
    return "unknown"


def _build_issue_signals(
    *,
    quality_status: str,
    measurement_status: str,
    main_bottleneck_stage: str,
    main_bottleneck_reason: str,
    speech_end_to_voice_proxy_ms: int | None,
    missing_latency_ms: int,
    tts_queue_depth: Any,
    first_voice_out_is_real_or_proxy: str,
    audio_verify_bottleneck: str,
    stt_bottleneck: str,
    translate_bottleneck: str,
    tts_bottleneck: str,
) -> dict[str, Any]:
    issue_stage = main_bottleneck_stage if main_bottleneck_stage and main_bottleneck_stage != "Not Run" else ""
    queue_depth = _coerce_int_or_none(tts_queue_depth)
    triage_points: list[str] = []
    if quality_status:
        triage_points.append(f"quality={quality_status}")
    if measurement_status:
        triage_points.append(f"measurement={measurement_status}")
    if issue_stage:
        triage_points.append(f"bottleneck={issue_stage}")
    if missing_latency_ms > 0:
        triage_points.append(f"missing_latency={missing_latency_ms}ms")
    if speech_end_to_voice_proxy_ms is not None:
        triage_points.append(f"voice_proxy={speech_end_to_voice_proxy_ms}ms")
    if queue_depth is not None and queue_depth > 0:
        triage_points.append(f"tts_queue_depth={queue_depth}")
    if first_voice_out_is_real_or_proxy != "unavailable":
        triage_points.append(f"voice_signal={first_voice_out_is_real_or_proxy}")
    if not triage_points:
        triage_points.append("no_issue_signals")
    return {
        "status": _issue_status_label(quality_status, measurement_status),
        "primary_stage": issue_stage or "Unknown",
        "primary_reason": main_bottleneck_reason or "unavailable",
        "audio_verify": audio_verify_bottleneck or "Not Run",
        "stt": stt_bottleneck or "Not Run",
        "translate": translate_bottleneck or "Not Run",
        "tts": tts_bottleneck or "Not Run",
        "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms,
        "missing_latency_ms": missing_latency_ms,
        "tts_queue_depth": queue_depth,
        "voice_signal_state": first_voice_out_is_real_or_proxy,
        "triage_points": triage_points,
        "triage_hint": "; ".join(triage_points),
    }


def _health_overview_note() -> str:
    return "Use health_overview first: it combines engine health, playback health, and issue triage without changing runtime behavior."


def build_cache_session_guard_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def build_forensic_trace_payload(segment: TranscriptSegment, *, session_id: str) -> dict[str, Any]:
    return build_forensic_metric_trace_payload(segment, session_id=session_id)


def build_engine_stability_audit_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def build_error_health_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": _quality_status(segment) or "Unknown"}


def build_long_turn_safety_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def _playback_failure_signals(segment: TranscriptSegment | dict[str, Any]) -> dict[str, str]:
    tts_requested = bool(_field(segment, "tts_requested", False))
    tts_audio_ready = bool(_field(segment, "tts_audio_ready", False))
    playback_requested = bool(_field(segment, "playback_requested", False))
    playback_queued = bool(_field(segment, "playback_queued", False))
    playback_backend_started = bool(_field(segment, "playback_backend_started_if_available", False))
    playback_failed = bool(_field(segment, "playback_failed", False))
    audio_valid = bool(_field(segment, "audio_valid", False))
    audio_validation_error = str(_field(segment, "audio_validation_error", "") or "")
    playback_error = str(_field(segment, "playback_error", "") or "")

    failure_reason = playback_error or audio_validation_error
    if not failure_reason and not tts_audio_ready and tts_requested:
        failure_reason = "TTS audio is not ready yet."
    if not failure_reason and playback_queued and not playback_backend_started:
        failure_reason = "Playback was queued but the backend did not start."

    if playback_failed:
        if audio_validation_error and not audio_valid:
            failure_stage = "audio_validation"
        elif tts_requested and not tts_audio_ready:
            failure_stage = "tts_generation"
        elif playback_backend_started:
            failure_stage = "playback_backend"
        else:
            failure_stage = "playback_dispatch"
    elif audio_validation_error and not audio_valid:
        failure_stage = "audio_validation"
    elif tts_requested and not tts_audio_ready:
        failure_stage = "tts_generation"
    elif playback_requested and not playback_backend_started and not playback_queued:
        failure_stage = "playback_dispatch"
    else:
        failure_stage = "healthy"

    return {
        "playback_failure_stage": failure_stage,
        "playback_failure_reason": failure_reason or "unavailable",
        "playback_health_note": (
            "Use playback_failure_stage and issue_summary first when playback stalls or fails."
            if failure_stage != "healthy"
            else "Playback is healthy; use issue_summary only if you need a broader engine view."
        ),
    }


def build_playback_health_payload(segment: TranscriptSegment) -> dict[str, Any]:
    payload = build_engine_health_payload(segment)
    groups = build_metric_groups(segment)
    issue_signals = groups.get("issue_signals", {}) if isinstance(groups.get("issue_signals"), dict) else {}
    playback_failure = _playback_failure_signals(segment)
    payload.update(
        {
            "playback_note": "Use playback_failure_stage first, then issue_primary_stage if playback is blocked upstream.",
            "playback_issue_summary": groups.get("issue_summary", ""),
            "playback_issue_status": issue_signals.get("status", "unknown"),
            **playback_failure,
            "health_overview": build_health_overview_payload(segment),
        }
    )
    return payload


def build_short_path_guard_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def build_stt_optimization_payload(segment: TranscriptSegment | dict[str, Any] | None = None, **context: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "segment_id": _segment_id(segment or context),
        "status": "initialized",
    }
    if context:
        payload.update({str(key): _safe_value(value) for key, value in context.items()})
    return payload


def build_start_stop_lifecycle_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return build_startup_lifecycle_payload(segment)


def build_ui_interaction_health_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def build_worker_health_payload(segment: TranscriptSegment | dict[str, Any]) -> dict[str, Any]:
    worker_alive = bool(_field(segment, "worker_alive", False))
    active_workers = _field(segment, "active_workers", [])
    failed_workers = _field(segment, "failed_workers", [])
    stale_job_rejected_count = int(max(0, _field(segment, "stale_job_rejected_count", 0) or 0))
    last_exception = str(_field(segment, "last_exception", "") or "")
    last_job_started_time = str(_field(segment, "last_job_started_time", "") or "")
    last_job_finished_time = str(_field(segment, "last_job_finished_time", "") or "")
    last_heartbeat_time = str(_field(segment, "last_heartbeat_time", "") or "")
    queue_sizes = _field(segment, "queue_sizes", {})
    queue_oldest_item_age_ms = _field(segment, "queue_oldest_item_age_ms", {})
    worker_states = _field(segment, "worker_states", [])
    safe_to_restart = not failed_workers and not last_exception and not stale_job_rejected_count and worker_alive
    worker_issue_status = "healthy"
    worker_issue_reason = "Worker is healthy."
    if last_exception:
        worker_issue_status = "error"
        worker_issue_reason = last_exception
    elif failed_workers:
        worker_issue_status = "degraded"
        worker_issue_reason = "One or more workers failed."
    elif stale_job_rejected_count > 0:
        worker_issue_status = "degraded"
        worker_issue_reason = "Stale callbacks were rejected."
    elif not worker_alive and active_workers:
        worker_issue_status = "degraded"
        worker_issue_reason = "Active workers are reported, but the worker loop is not alive."
    return {
        "segment_id": _segment_id(segment),
        "status": "initialized",
        "worker_alive": worker_alive,
        "active_workers": active_workers,
        "failed_workers": failed_workers,
        "worker_states": worker_states,
        "queue_sizes": queue_sizes,
        "queue_oldest_item_age_ms": queue_oldest_item_age_ms,
        "stale_job_rejected_count": stale_job_rejected_count,
        "last_exception": last_exception,
        "last_job_started_time": last_job_started_time,
        "last_job_finished_time": last_job_finished_time,
        "last_heartbeat_time": last_heartbeat_time,
        "worker_issue_status": worker_issue_status,
        "worker_issue_reason": worker_issue_reason,
        "worker_health_note": "Use worker_issue_status and last_exception first when worker behavior looks inconsistent.",
        "safe_to_restart": safe_to_restart,
    }


def write_benchmark_reports(segment: TranscriptSegment, *, session_id: str) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "segment_id": _segment_id(segment),
        "status": "initialized",
        "metric_groups": build_metric_groups(segment),
    }


def _safe_value(value: Any, seen: set[int] | None = None) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if seen is None:
        seen = set()
    obj_id = id(value)
    if obj_id in seen:
        return "<recursion>"
    seen.add(obj_id)
    if isinstance(value, dict):
        return {str(key): _safe_value(item, seen) for key, item in value.items() if not str(key).endswith("_obj")}
    if isinstance(value, (list, tuple, set)):
        return [_safe_value(item, seen) for item in value]
    if hasattr(value, "to_dict") and callable(getattr(value, "to_dict")):
        try:
            return _safe_value(value.to_dict(), seen)
        except Exception:
            return str(value)
    if hasattr(value, "__dict__"):
        return {key: _safe_value(item, seen) for key, item in vars(value).items() if not key.startswith("_")}
    return str(value)


def _trace(segment: TranscriptSegment) -> dict[str, Any]:
    latency = _latency(segment)
    if latency is None:
        return {}
    metric_trace = _field(latency, "metric_trace", {})
    if not isinstance(metric_trace, dict):
        return {}
    trace = metric_trace.get("official_trace")
    return trace if isinstance(trace, dict) else {}


def _trace_obj(segment: TranscriptSegment) -> Any | None:
    latency = _latency(segment)
    if latency is None:
        return None
    metric_trace = _field(latency, "metric_trace", {})
    if not isinstance(metric_trace, dict):
        return None
    trace = metric_trace.get("official_trace_obj")
    return trace if trace is not None else None


def build_forensic_metric_trace_payload(segment: TranscriptSegment, *, session_id: str) -> dict[str, Any]:
    trace = _trace(segment)
    measurement_status = trace.get("measurement_status")
    if not measurement_status:
        measurement_status = "MEASURED" if trace else "PARTIAL"
    return {
        "session_id": session_id,
        "segment_id": _segment_id(segment),
        "trace_id": str(_field(segment, "trace_id", "") or ""),
        "trace": trace,
        "measurement_status": measurement_status,
    }


def build_metric_groups(segment: TranscriptSegment | dict[str, Any]) -> dict[str, Any]:
    latency = _latency(segment)
    if latency is None:
        latency = {}
    trace_obj = _trace_obj(segment)
    speech_duration_ms = int(max(0, _field(latency, "speech_duration_ms", 0) or 0))
    delay_after_speech_end_ms = int(max(0, _field(latency, "delay_after_speech_end_ms", 0) or 0))
    total_latency_ms = int(max(0, _field(latency, "speech_start_to_first_voice_output_ms", 0) or _field(latency, "latency_ms", 0) or 0))
    audio_verify_ms = int(max(0, _field(latency, "endpoint_wait_ms", 0) or _field(latency, "vad_speech_detect_ms", 0) or 0))
    stt_ms = int(max(0, _field(latency, "asr_latency_ms", 0) or _field(latency, "asr_ms", 0) or 0))
    translate_ms = int(max(0, _field(latency, "translation_latency_ms", 0) or _field(latency, "translation_ms", 0) or 0))
    speech_end_to_voice_proxy_ms = _metric_raw(latency, "speech_end_to_voice_proxy_ms")
    if speech_end_to_voice_proxy_ms is None:
        speech_end_to_voice_proxy_ms = _delta_ms(_field(latency, "speech_end_time", ""), _field(latency, "tts_voice_start_proxy_time", ""))
    speech_end_to_voice_proxy_ms = int(max(0, speech_end_to_voice_proxy_ms or 0)) if speech_end_to_voice_proxy_ms is not None else None
    tts_ms = int(
        max(
            0,
            _field(latency, "tts_voice_start_proxy_ms", 0)
            or _field(latency, "tts_playback_start_ms", 0)
            or _field(latency, "tts_direct_speak_called_ms", 0)
            or _field(latency, "tts_voice_generate_ms", 0)
            or 0,
        )
    )
    component_total = audio_verify_ms + stt_ms + translate_ms + tts_ms
    missing_latency_ms = max(0, total_latency_ms - component_total)
    input_latency_budget_ms = audio_verify_ms + stt_ms + translate_ms
    output_latency_budget_ms = speech_end_to_voice_proxy_ms if speech_end_to_voice_proxy_ms is not None else (
        max(0, total_latency_ms - input_latency_budget_ms) if total_latency_ms > 0 else tts_ms
    )
    io_latency_budget_ms = input_latency_budget_ms + output_latency_budget_ms
    quality_status = _quality_status(segment)
    measurement_status = "MEASURED" if component_total > 0 else "UNAVAILABLE"
    issue_signals = _build_issue_signals(
        quality_status=quality_status,
        measurement_status=measurement_status,
        main_bottleneck_stage=max(
            {"Audio Verify": audio_verify_ms, "STT": stt_ms, "Translate": translate_ms, "TTS": tts_ms},
            key=lambda key: {"Audio Verify": audio_verify_ms, "STT": stt_ms, "Translate": translate_ms, "TTS": tts_ms}[key],
        )
        if component_total > 0
        else "Not Run",
        main_bottleneck_reason="Derived from preserved segment latency metrics" if component_total > 0 else "No measurable component recorded",
        speech_end_to_voice_proxy_ms=speech_end_to_voice_proxy_ms,
        missing_latency_ms=missing_latency_ms,
        tts_queue_depth=_field(latency, "tts_queue_depth", 0),
        first_voice_out_is_real_or_proxy=_voice_out_state(
            voice_start_proxy_ms=_coerce_int_or_none(_metric_raw(latency, "tts_voice_start_proxy_ms")),
            speech_end_to_voice_proxy_ms=speech_end_to_voice_proxy_ms,
            direct_playback=bool(_field(latency, "tts_backend_selected", "") == "sapi_direct_async"),
        ),
        audio_verify_bottleneck="endpoint_wait_ms" if audio_verify_ms > 0 else "Not Run",
        stt_bottleneck="asr_latency_ms" if stt_ms > 0 else "Not Run",
        translate_bottleneck="translation_latency_ms" if translate_ms > 0 else "Not Run",
        tts_bottleneck="tts_voice_start_proxy_ms" if tts_ms > 0 else "Not Run",
    )
    issue_summary = issue_signals.get("triage_hint") or issue_signals.get("primary_reason") or ""
    return {
        "speech_duration_ms": speech_duration_ms,
        "delay_after_speech_end_ms": delay_after_speech_end_ms,
        "total_latency_ms": total_latency_ms,
        "input_latency_budget_ms": input_latency_budget_ms,
        "output_latency_budget_ms": output_latency_budget_ms,
        "io_latency_budget_ms": io_latency_budget_ms,
        "component_total_delay_ms": component_total,
        "pipeline_component_total_ms": component_total,
        "main_bottleneck_stage": max(
            {"Audio Verify": audio_verify_ms, "STT": stt_ms, "Translate": translate_ms, "TTS": tts_ms},
            key=lambda key: {"Audio Verify": audio_verify_ms, "STT": stt_ms, "Translate": translate_ms, "TTS": tts_ms}[key],
        )
        if component_total > 0
        else "Not Run",
        "main_bottleneck_reason": "Derived from preserved segment latency metrics" if component_total > 0 else "No measurable component recorded",
        "audio_verify_bottleneck": "endpoint_wait_ms" if audio_verify_ms > 0 else "Not Run",
        "stt_bottleneck": "asr_latency_ms" if stt_ms > 0 else "Not Run",
        "translate_bottleneck": "translation_latency_ms" if translate_ms > 0 else "Not Run",
        "tts_bottleneck": "tts_voice_start_proxy_ms" if tts_ms > 0 else "Not Run",
        "issue_signals": issue_signals,
        "issue_summary": issue_summary,
        "audio_verify_ms": audio_verify_ms,
        "stt_ms": stt_ms,
        "translate_ms": translate_ms,
        "tts_ms": tts_ms,
        "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms,
        "missing_latency_ms": missing_latency_ms,
        "app_vs_stopwatch_delta_ms": int(max(0, missing_latency_ms)),
        "missing_latency_assigned_to": "unattributed" if missing_latency_ms > 0 else "",
        "raw_component_total_ms": component_total,
        "calibrated_total_ms": total_latency_ms,
        "speech_start_to_first_voice_ms": total_latency_ms,
        "total_after_eos_ms": delay_after_speech_end_ms,
        "component_rows_ms": _safe_value(getattr(trace_obj, "component_rows_ms", {})),
        "component_totals_ms": _safe_value(getattr(trace_obj, "component_totals_ms", {})),
        "adjacent_gaps_ms": _safe_value(getattr(trace_obj, "adjacent_gaps_ms", {})),
        "candidate_latencies_ms": _safe_value(getattr(trace_obj, "candidate_latencies_ms", {})),
        "bottleneck": _safe_value(getattr(trace_obj, "bottleneck", {})),
        "stopwatch_alignment_delta_ms": 0,
        "legacy_metric_not_trusted": True,
    }


def build_text_latency_payload(segment: TranscriptSegment, *, session_id: str) -> dict[str, Any]:
    groups = build_metric_groups(segment)
    latency = _latency(segment) or {}
    backend_name = str(_field(latency, "tts_backend_name", "") or "")
    backend_selected = str(_field(latency, "tts_backend_selected", "") or backend_name)
    fallback_reason = str(_field(latency, "tts_backend_fallback_reason", "") or "")
    is_streaming_backend = backend_selected == "experimental_streaming"
    voice_signal_state = _voice_out_state(
        voice_start_proxy_ms=_coerce_int_or_none(_metric_raw(latency, "tts_voice_start_proxy_ms")),
        speech_end_to_voice_proxy_ms=_coerce_int_or_none(_metric_raw(latency, "speech_end_to_voice_proxy_ms")),
        direct_playback=bool(backend_selected == "sapi_direct_async"),
    )
    speech_end_to_voice_proxy_ms = _metric_raw(latency, "speech_end_to_voice_proxy_ms")
    issue_signals = groups.get("issue_signals", {})
    return {
        "session_id": session_id,
        "segment_id": _segment_id(segment),
        "trace_id": str(_field(segment, "trace_id", "") or ""),
        "tts_backend_name": backend_name,
        "tts_backend_selected": backend_selected,
        "tts_backend_fallback_reason": fallback_reason,
        "tts_backend_is_streaming": is_streaming_backend,
        "first_voice_out_is_real_or_proxy": voice_signal_state,
        "provider_used": _field(latency, "tts_provider_used", ""),
        "provider_benchmark_ms": _field(latency, "tts_provider_benchmark_ms", 0),
        "provider_selection_reason": _field(latency, "tts_provider_selection_reason", ""),
        "provider_voice_profile_id": _field(latency, "tts_provider_voice_profile_id", ""),
        "provider_model_version": _field(latency, "tts_provider_model_version", ""),
        "voice_start_proxy_ms": _field(latency, "tts_voice_start_proxy_ms", 0),
        "voice_completed_ms": _field(latency, "tts_voice_completed_ms", 0),
        "process_start_overhead_ms": _field(latency, "tts_process_start_overhead_ms", 0),
        "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms if speech_end_to_voice_proxy_ms is not None else groups["speech_end_to_voice_proxy_ms"],
        "speech_duration_ms": groups["speech_duration_ms"],
        "delay_after_speech_end_ms": groups["delay_after_speech_end_ms"],
        "total_realtime_ms": groups["total_latency_ms"],
        "measurement_status": "MEASURED" if groups["total_latency_ms"] > 0 else "UNAVAILABLE",
        "input_latency_budget_ms": groups["input_latency_budget_ms"],
        "output_latency_budget_ms": groups["output_latency_budget_ms"],
        "io_latency_budget_ms": groups["io_latency_budget_ms"],
        "speech_start_time": _field(latency, "speech_start_time", ""),
        "speech_end_time": _field(latency, "speech_end_time", ""),
        "vad_endpoint_time": _field(latency, "endpoint_decision_time", ""),
        "asr_start_time": _field(latency, "asr_start_time", ""),
        "asr_end_time": _field(latency, "asr_end_time", ""),
        "translation_start_time": _field(latency, "translation_start_time", ""),
        "translation_end_time": _field(latency, "translation_end_time", ""),
        "tts_start_time": _field(latency, "tts_start_time", ""),
        "tts_audio_ready_time": _field(latency, "tts_result_received_time", ""),
        "playback_enqueue_time": _field(latency, "tts_playback_requested_time", ""),
        "playback_start_time": _field(latency, "tts_playback_start_time", ""),
        "first_voice_out_time": _field(latency, "tts_playback_audio_start_time", ""),
        "first_voice_out_proxy_time": _field(latency, "tts_playback_audio_start_time", ""),
        "voice_start_proxy_time": _field(latency, "tts_voice_start_proxy_time", ""),
        "voice_completed_time": _field(latency, "tts_voice_completed_time", ""),
        "issue_signals": issue_signals,
        "issue_summary": groups.get("issue_summary", ""),
    }


def build_text_latency_breakdown(segment: TranscriptSegment) -> dict[str, Any]:
    groups = build_metric_groups(segment)
    latency = _latency(segment)
    speech_end_to_voice_proxy_ms = _metric_raw(latency, "speech_end_to_voice_proxy_ms")
    return {
        "speech_duration_ms": groups["speech_duration_ms"],
        "delay_after_speech_end_ms": groups["delay_after_speech_end_ms"],
        "total_realtime_ms": groups["total_latency_ms"],
        "speech_start_to_first_voice_ms": groups["speech_start_to_first_voice_ms"],
        "voice_start_proxy_ms": _field(_latency(segment), "tts_voice_start_proxy_ms", groups["total_latency_ms"]),
        "voice_completed_ms": _field(_latency(segment), "tts_voice_completed_ms", 0),
        "process_start_overhead_ms": _field(_latency(segment), "tts_process_start_overhead_ms", 0),
        "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms if speech_end_to_voice_proxy_ms is not None else groups["speech_end_to_voice_proxy_ms"],
        "issue_summary": groups.get("issue_summary", ""),
    }


def build_audio_verify_breakdown(segment: TranscriptSegment) -> dict[str, Any]:
    latency = segment.latency
    endpoint_wait_ms = int(max(0, getattr(latency, "endpoint_wait_ms", 0) or 0))
    speech_confirmation_ms = int(max(0, getattr(latency, "speech_confirmation_ms", 0) or 0))
    capture_buffer_ms = int(max(0, getattr(latency, "capture_buffer_ms", 0) or 0))
    silence_accumulation_ms = int(max(0, getattr(latency, "silence_accumulation_ms", 0) or 0))
    return {
        "stage": "Audio Verify",
        "ms": endpoint_wait_ms,
        "endpoint_wait_ms": endpoint_wait_ms,
        "speech_confirmation_ms": speech_confirmation_ms,
        "capture_buffer_ms": capture_buffer_ms,
        "silence_accumulation_ms": silence_accumulation_ms,
    }


def build_stt_breakdown(segment: TranscriptSegment) -> dict[str, Any]:
    latency = segment.latency
    asr_latency_ms = int(max(0, getattr(latency, "asr_latency_ms", 0) or 0))
    asr_queue_wait_ms = int(max(0, getattr(latency, "asr_queue_wait_ms", 0) or 0))
    asr_audio_prepare_ms = int(max(0, getattr(latency, "asr_audio_prepare_ms", 0) or 0))
    asr_model_inference_ms = int(max(0, getattr(latency, "asr_model_inference_ms", 0) or 0))
    asr_decode_finalize_ms = int(max(0, getattr(latency, "asr_decode_finalize_ms", 0) or 0))
    return {
        "stage": "STT",
        "ms": asr_latency_ms,
        "asr_latency_ms": asr_latency_ms,
        "asr_queue_wait_ms": asr_queue_wait_ms,
        "asr_audio_prepare_ms": asr_audio_prepare_ms,
        "asr_model_inference_ms": asr_model_inference_ms,
        "asr_decode_finalize_ms": asr_decode_finalize_ms,
        "transcribe_total_ms": asr_model_inference_ms or asr_latency_ms,
        "finalize_total_ms": asr_decode_finalize_ms,
    }


def build_translate_breakdown(segment: TranscriptSegment) -> dict[str, Any]:
    latency = segment.latency
    translation_latency_ms = int(max(0, getattr(latency, "translation_latency_ms", 0) or 0))
    translation_queue_wait_ms = int(max(0, getattr(latency, "translate_queue_wait_ms", 0) or 0))
    translation_prepare_ms = int(max(0, getattr(latency, "translation_prepare_ms", 0) or 0))
    translation_model_inference_ms = int(max(0, getattr(latency, "translation_model_inference_ms", 0) or 0))
    translation_finalize_ms = int(max(0, getattr(latency, "translation_finalize_ms", 0) or 0))
    return {
        "stage": "Translate",
        "ms": translation_latency_ms,
        "translation_latency_ms": translation_latency_ms,
        "translation_queue_wait_ms": translation_queue_wait_ms,
        "translation_prepare_ms": translation_prepare_ms,
        "translation_model_inference_ms": translation_model_inference_ms,
        "translation_finalize_ms": translation_finalize_ms,
        "translation_total_ms": translation_model_inference_ms or translation_latency_ms,
        "finalize_total_ms": translation_finalize_ms,
    }


def build_tts_breakdown(segment: TranscriptSegment) -> dict[str, Any]:
    latency = segment.latency
    voice_start_proxy_ms = int(max(0, getattr(latency, "tts_voice_start_proxy_ms", 0) or 0))
    voice_completed_ms = int(max(0, getattr(latency, "tts_voice_completed_ms", 0) or 0))
    process_start_overhead_ms = int(max(0, getattr(latency, "tts_process_start_overhead_ms", 0) or 0))
    direct_speak_called_ms = int(max(0, getattr(latency, "tts_direct_speak_called_ms", 0) or 0))
    playback_start_ms = int(max(0, getattr(latency, "tts_playback_start_ms", 0) or 0))
    provider_used = str(getattr(latency, "tts_provider_used", "") or "")
    provider_benchmark_ms = int(max(0, getattr(latency, "tts_provider_benchmark_ms", 0) or 0))
    provider_selection_reason = str(getattr(latency, "tts_provider_selection_reason", "") or "")
    return {
        "stage": "TTS",
        "ms": voice_start_proxy_ms or playback_start_ms or direct_speak_called_ms,
        "voice_start_proxy_ms": voice_start_proxy_ms,
        "voice_completed_ms": voice_completed_ms,
        "process_start_overhead_ms": process_start_overhead_ms,
        "tts_direct_speak_called_ms": direct_speak_called_ms,
        "tts_playback_start_ms": playback_start_ms,
        "provider_used": provider_used,
        "provider_benchmark_ms": provider_benchmark_ms,
        "provider_selection_reason": provider_selection_reason,
        "voice_generate_total_ms": voice_completed_ms or voice_start_proxy_ms,
        "finalize_total_ms": process_start_overhead_ms,
    }


def build_short_utterance_debug_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {
        "segment_id": _segment_id(segment),
        "speech_duration_ms": int(max(0, _field(_latency(segment), "speech_duration_ms", 0) or 0)),
        "total_latency_ms": int(max(0, _field(_latency(segment), "speech_start_to_first_voice_output_ms", 0) or 0)),
        "status": "measured" if _field(_latency(segment), "speech_start_to_first_voice_output_ms", 0) else "partial",
    }


def build_engine_health_payload(segment: TranscriptSegment) -> dict[str, Any]:
    groups = build_metric_groups(segment)
    issue_signals = groups.get("issue_signals", {}) if isinstance(groups.get("issue_signals"), dict) else {}
    return {
        "segment_id": _segment_id(segment),
        "status": _quality_status(segment) or "Unknown",
        "speech_duration_ms": int(max(0, _field(_latency(segment), "speech_duration_ms", 0) or 0)),
        "total_latency_ms": int(max(0, _field(_latency(segment), "speech_start_to_first_voice_output_ms", 0) or 0)),
        "issue_status": issue_signals.get("status", "unknown"),
        "issue_summary": groups.get("issue_summary", ""),
        "issue_primary_stage": issue_signals.get("primary_stage", "Unknown"),
        "issue_primary_reason": issue_signals.get("primary_reason", "unavailable"),
        "issue_note": "Use issue_summary and issue_primary_stage first when diagnosing engine health.",
        "health_overview": build_health_overview_payload(segment),
    }


def build_issue_triage_payload(segment: TranscriptSegment) -> dict[str, Any]:
    groups = build_metric_groups(segment)
    issue_signals = groups.get("issue_signals", {}) if isinstance(groups.get("issue_signals"), dict) else {}
    note_lines = [
        "Use this report to identify the most likely stage causing the issue.",
        "The values are derived from preserved latency metrics only, so they stay cheap and stable.",
        "Focus first on primary_stage, issue_status, issue_summary, and triage_points.",
    ]
    return {
        "segment_id": _segment_id(segment),
        "session_id": _field(segment, "session_id", ""),
        "issue_status": issue_signals.get("status", "unknown"),
        "issue_summary": groups.get("issue_summary", ""),
        "primary_stage": issue_signals.get("primary_stage", "Unknown"),
        "primary_reason": issue_signals.get("primary_reason", "unavailable"),
        "audio_verify": issue_signals.get("audio_verify", "Not Run"),
        "stt": issue_signals.get("stt", "Not Run"),
        "translate": issue_signals.get("translate", "Not Run"),
        "tts": issue_signals.get("tts", "Not Run"),
        "speech_end_to_voice_proxy_ms": issue_signals.get("speech_end_to_voice_proxy_ms"),
        "missing_latency_ms": issue_signals.get("missing_latency_ms", 0),
        "tts_queue_depth": issue_signals.get("tts_queue_depth"),
        "voice_signal_state": issue_signals.get("voice_signal_state", "unavailable"),
        "triage_points": issue_signals.get("triage_points", []),
        "triage_note": " ".join(note_lines),
    }


def build_health_overview_payload(segment: TranscriptSegment) -> dict[str, Any]:
    groups = build_metric_groups(segment)
    issue_signals = groups.get("issue_signals", {}) if isinstance(groups.get("issue_signals"), dict) else {}
    issue_summary = str(groups.get("issue_summary", "") or "")
    return {
        "segment_id": _segment_id(segment),
        "session_id": _field(segment, "session_id", ""),
        "status": issue_signals.get("status", "unknown"),
        "issue_status": issue_signals.get("status", "unknown"),
        "issue_summary": issue_summary,
        "issue_primary_stage": issue_signals.get("primary_stage", "Unknown"),
        "issue_primary_reason": issue_signals.get("primary_reason", "unavailable"),
        "engine_status": _quality_status(segment) or "Unknown",
        "measurement_status": "MEASURED" if groups.get("total_latency_ms", 0) > 0 else "UNAVAILABLE",
        "main_bottleneck_stage": groups.get("main_bottleneck_stage", "Not Run"),
        "speech_end_to_voice_proxy_ms": issue_signals.get("speech_end_to_voice_proxy_ms"),
        "missing_latency_ms": issue_signals.get("missing_latency_ms", 0),
        "tts_queue_depth": issue_signals.get("tts_queue_depth"),
        "voice_signal_state": issue_signals.get("voice_signal_state", "unavailable"),
        "triage_points": issue_signals.get("triage_points", []),
        "note": _health_overview_note(),
    }


def build_startup_lifecycle_payload(segment: TranscriptSegment) -> dict[str, Any]:
    return {"segment_id": _segment_id(segment), "status": "initialized"}


def build_model_runtime_optimization_payload(segment: TranscriptSegment | dict[str, Any] | None = None, **context: Any) -> dict[str, Any]:
    segment_id = _segment_id(segment or context)
    payload: dict[str, Any] = {
        "segment_id": segment_id,
        "status": "initialized",
        "notes": "Runtime optimization telemetry is derived from the preserved segment metrics.",
    }
    if context:
        payload.update({str(key): _safe_value(value) for key, value in context.items()})
    return {
        **payload,
    }
