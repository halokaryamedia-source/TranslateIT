from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import argparse
import ctypes
import math
import os
import sys
import threading
from time import perf_counter
import wave
from typing import Any, Callable, Iterable
import traceback

if __package__ in {None, ""}:  # pragma: no cover - direct script execution
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from EngineData.LauncherApp.app_config import PROJECT_ROOT, EngineConfig, load_default_config
from EngineData.LauncherApp.app_logger import append_log, append_log_async, append_runtime_pipeline_log, format_exception, install_global_crash_recorders, write_crash_record, write_json_report, write_json_report_async, write_text_report, write_text_report_async
from EngineData.LauncherApp.audio_settings import AudioSettings, load_audio_settings, save_audio_settings
from EngineData.LauncherApp.cuda_validation import CUDA_CORE_PASS, CudaValidationResult, validate_cuda
from EngineData.LauncherApp.live_pipeline import (
    CAPTURE_MODE_DIAGNOSTIC_ONLY,
    CAPTURE_MODE_MOCK_PIPELINE,
    CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION,
    CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION,
    LivePipelineThread,
    PipelineSegmentResult,
)
from EngineData.LauncherApp.replay_controller import ReplayController
from EngineData.LauncherApp.latency_meter import MetricTrace
from EngineData.LauncherApp.latency_profile import resolve_safe_vad_preset
from EngineData.LauncherApp.single_instance import SingleInstanceLock, show_already_running_message
from EngineData.LauncherApp.runtime_validation import build_validation_items, validation_exit_code
from EngineData.LauncherApp.session_reporting import (
    _app_version_if_available,
    build_audio_verify_breakdown,
    build_cache_session_guard_payload,
    build_health_overview_payload,
    build_engine_health_payload,
    build_engine_stability_audit_payload,
    build_error_health_payload,
    build_forensic_trace_payload,
    build_issue_triage_payload,
    build_metric_groups,
    build_long_turn_safety_payload,
    build_playback_health_payload,
    build_short_utterance_debug_payload,
    build_short_path_guard_payload,
    build_stt_optimization_payload,
    build_stt_breakdown,
    build_start_stop_lifecycle_payload,
    build_model_runtime_optimization_payload,
    build_text_latency_breakdown,
    build_text_latency_payload,
    build_translate_breakdown,
    build_ui_interaction_health_payload,
    build_tts_breakdown,
    build_worker_health_payload,
    write_benchmark_reports,
)
from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.LauncherApp.ui_theme import build_operator_stylesheet
from EngineData.LauncherApp.ui_state import UIState
from EngineData.TranscriptEngine.asr_model_loader import ASRModelLoader
from EngineData.TranscriptEngine.audio_calibration import AudioCalibration, CalibrationResult, normalize_input_sensitivity
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.TranscriptEngine.audio_preprocessing import AudioPreprocessor
from EngineData.TranscriptEngine.audio_noise_filter import AudioNoiseFilter
from EngineData.TranscriptEngine.microphone_diagnostic import MicrophoneDiagnosticResult, run_microphone_diagnostic
from EngineData.TranscriptEngine.segment_builder import SegmentBuilder
from EngineData.TranscriptEngine.transcript_segment import MetricMetrics, QualityMetrics, ReplayPaths, TranscriptSegment
from EngineData.TranscriptEngine.transcript_session import TranscriptSession
from EngineData.TranscriptEngine.vad_pipeline import VADPipeline
from EngineData.TranslateEngine.translation_engine import TranslationEngine
from EngineData.TranslateEngine.tts_placeholder import TTSPlaceholder, TTSRequest
from EngineData.TranslateEngine.voice_provider_selection import discover_voice_actor_profiles

try:  # pragma: no cover - optional dependency
    from PySide6.QtCore import Qt, QThread, QTimer, Signal
    from PySide6.QtWidgets import (
        QApplication,
        QCheckBox,
        QComboBox,
        QDialog,
        QFrame,
        QGridLayout,
        QHBoxLayout,
        QLabel,
        QMainWindow,
        QLineEdit,
        QMessageBox,
        QPushButton,
        QProgressBar,
        QScrollArea,
        QSizePolicy,
        QStackedWidget,
        QToolButton,
        QTextEdit,
        QVBoxLayout,
        QWidget,
    )

    PYSIDE_AVAILABLE = True
except ImportError:  # pragma: no cover - dependency missing in current env
    PYSIDE_AVAILABLE = False
    QApplication = None  # type: ignore[assignment]
    Qt = None  # type: ignore[assignment]
    QThread = object  # type: ignore[assignment]


if PYSIDE_AVAILABLE:
    class CrashLoggingApplication(QApplication):
        def notify(self, receiver, event):  # type: ignore[override]
            try:
                return super().notify(receiver, event)
            except Exception as exc:
                try:
                    write_crash_record(
                        "app_crash",
                        "qt_notify_exception",
                        exc,
                        context={
                            "receiver": _safe_str(receiver),
                            "event_type": _safe_str(getattr(event, "type", lambda: "unavailable")()),
                        },
                    )
                except Exception:
                    pass
                raise
else:
    CrashLoggingApplication = None  # type: ignore[assignment]


CAPTURE_MODES = [
    CAPTURE_MODE_DIAGNOSTIC_ONLY,
    CAPTURE_MODE_MOCK_PIPELINE,
    CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION,
    CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION,
]


def _safe_int_or_zero(value: object) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def _format_latency_or_unavailable(value: object) -> str:
    if value in (None, "", "unavailable", 0, "0"):
        return "Latency unavailable"
    try:
        numeric = int(value)
    except Exception:
        return "Latency unavailable"
    if numeric <= 0:
        return "Latency unavailable"
    return f"{numeric} ms"


def _status_widget_for(window: object, key: str) -> QLabel:
    labels = getattr(window, "status_labels", {})
    if key in labels:
        return labels[key]
    alias_map = getattr(window, "status_label_aliases", None) or {
        "Runtime status": "runtime",
        "Python runtime": "python",
        "CUDA Core App status": "cuda",
        "ASR model": "asr",
        "Translation model": "translation",
        "Voice actor": "voice",
        "Microphone status": "mic",
        "Capture status": "capture",
        "Capture worker state": "worker",
        "Stream active": "stream",
        "Callback count": "callbacks",
        "Frames received": "frames",
        "Last audio frame time": "last_frame",
        "Last error": "last_error",
        "Session status": "session",
        "Privacy/local-only": "privacy",
        "benchmark": "Benchmark",
    }
    reverse_map = {new: old for old, new in alias_map.items()}
    candidates = [key, alias_map.get(key), reverse_map.get(key)]
    widget = None
    for candidate in candidates:
        if candidate is None:
            continue
        try:
            widget = labels[candidate]
            break
        except Exception:
            if hasattr(labels, "get"):
                widget = labels.get(candidate)
                if widget is not None:
                    break
    if widget is None:
        raise KeyError(key)
    return widget


def _safe_latency_badge_ms(text: str) -> int | None:
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def _format_transcript_card_latency_label(latency: object) -> str:
    latency_data = getattr(latency, "_data", {}) if latency is not None else {}
    if not isinstance(latency_data, dict):
        latency_data = {}
    raw_value: object | None = latency_data.get("speech_end_to_voice_proxy_ms")
    if raw_value in (None, ""):
        return "Latency unavailable"
    try:
        numeric = int(raw_value)
    except Exception:
        return "Latency unavailable"
    if numeric <= 0:
        return "Latency unavailable"
    return f"{numeric} ms"


def _delta_ms_from_iso(start_iso: object, end_iso: object) -> int | None:
    try:
        if not start_iso or not end_iso:
            return None
        start_dt = datetime.fromisoformat(str(start_iso))
        end_dt = datetime.fromisoformat(str(end_iso))
    except Exception:
        return None
    return int(max(0, (end_dt - start_dt).total_seconds() * 1000))


def _capture_start_transition_in_progress(
    *,
    engine_startup_ready: bool,
    current_status: UIState,
    live_thread_running: bool,
    startup_worker_running: bool,
    pending_start_after_ready: bool,
) -> bool:
    return bool(
        engine_startup_ready
        and current_status == UIState.PREPARING
        and not live_thread_running
        and not startup_worker_running
        and not pending_start_after_ready
    )


def _startup_warmup_is_ready(
    *,
    asr_loaded: bool,
    asr_warmup_loaded: bool,
    translation_loaded: bool,
    translation_warmup_loaded: bool,
    tts_warmup_loaded: bool,
) -> bool:
    del tts_warmup_loaded
    return bool(
        asr_loaded
        and asr_warmup_loaded
        and translation_loaded
        and translation_warmup_loaded
    )


def _build_latency_details_view_model(segment: TranscriptSegment) -> dict[str, object]:
    groups = build_metric_groups(segment)
    audio_verify_group = build_audio_verify_breakdown(segment)
    stt_breakdown = build_stt_breakdown(segment)
    translate_breakdown = build_translate_breakdown(segment)
    tts_breakdown = build_tts_breakdown(segment)

    audio_verify_total = int(max(0, groups.get("audio_verify_ms", 0)))
    stt_total = int(max(0, groups.get("stt_ms", 0)))
    translate_total = int(max(0, groups.get("translate_ms", 0)))
    tts_total = int(max(0, groups.get("tts_ms", 0)))
    measured_output_latency_ms = groups.get("speech_end_to_voice_proxy_ms")
    measured_output_latency_ms = int(max(0, measured_output_latency_ms)) if measured_output_latency_ms is not None else 0
    pipeline_component_total_ms = audio_verify_total + stt_total + translate_total + tts_total
    playback_queue_wait_ms = max(0, measured_output_latency_ms - pipeline_component_total_ms)
    stage_totals = {
        "Audio Verify": audio_verify_total,
        "STT": stt_total,
        "Translate": translate_total,
        "TTS": tts_total + playback_queue_wait_ms,
    }
    speech_duration_ms = int(max(0, groups.get("speech_duration_ms", segment.latency.speech_duration_ms) or segment.latency.speech_duration_ms))
    main_bottleneck_stage = max(stage_totals, key=stage_totals.get) if any(stage_totals.values()) else str(groups.get("main_bottleneck_stage", groups.get("bottleneck", "N/A")))
    main_bottleneck_reason = str(groups.get("main_bottleneck_reason", groups.get("bottleneck_reason", "")))
    slowest_detail_by_stage = {
        "Audio Verify": groups.get("audio_verify_bottleneck", "N/A"),
        "STT": groups.get("stt_bottleneck", "N/A"),
        "Translate": groups.get("translate_bottleneck", "N/A"),
        "TTS": groups.get("tts_bottleneck", "N/A"),
    }
    slowest_detail = str(slowest_detail_by_stage.get(main_bottleneck_stage, "N/A"))
    summary_items = [
        ("Speech Duration", _format_latency_or_unavailable(speech_duration_ms if speech_duration_ms > 0 else None), "neutral"),
        ("Latency", _format_latency_or_unavailable(groups.get("speech_end_to_voice_proxy_ms")), "neutral"),
    ]
    sections: list[dict[str, object]] = [
        {
            "title": "Audio Verify",
            "description": "Detects real speech, removes silence/noise, and decides when the sentence ended.",
            "total_ms": audio_verify_total,
            "rows": [
                ("Endpoint Wait", int(audio_verify_group.get("endpoint_wait_ms", 0)), None, None),
                ("Speech Confirmation", int(audio_verify_group.get("speech_confirmation_ms", 0)), None, None),
                ("Capture Buffer", int(audio_verify_group.get("capture_buffer_ms", 0)), None, None),
                ("Silence Accumulation", int(audio_verify_group.get("silence_accumulation_ms", 0)), None, None),
            ],
            "expanded": main_bottleneck_stage == "Audio Verify",
            "unavailable": False,
            "footer_note": f"Slowest detail: {groups.get('audio_verify_bottleneck', 'N/A')}",
        },
        {
            "title": "STT",
            "description": "Converts speech audio into Indonesian text.",
            "total_ms": stt_total,
            "rows": [
                ("Queue Wait", int(stt_breakdown.get("asr_queue_wait_ms", 0)), None, None),
                ("Audio Prepare", int(stt_breakdown.get("asr_audio_prepare_ms", 0)), None, None),
                ("Model Inference", int(stt_breakdown.get("asr_model_inference_ms", 0)), None, None),
                ("Decode Finalize", int(stt_breakdown.get("asr_decode_finalize_ms", 0)), None, None),
            ],
            "expanded": main_bottleneck_stage == "STT",
            "unavailable": False,
            "footer_note": f"Slowest detail: {groups.get('stt_bottleneck', 'N/A')}",
        },
        {
            "title": "Translate",
            "description": "Translates Indonesian text into English.",
            "total_ms": translate_total,
            "rows": [
                ("Queue Wait", int(translate_breakdown.get("translation_queue_wait_ms", 0)), None, None),
                ("Model Prepare", int(translate_breakdown.get("translation_prepare_ms", 0)), None, None),
                ("Model Inference", int(translate_breakdown.get("translation_model_inference_ms", 0)), None, None),
                ("Finalize", int(translate_breakdown.get("translation_finalize_ms", 0)), None, None),
            ],
            "expanded": main_bottleneck_stage == "Translate",
            "unavailable": bool(translate_breakdown.get("translation_error")),
            "footer_note": f"Slowest detail: {groups.get('translate_bottleneck', 'N/A')}",
        },
    ]
    tts_unavailable = bool(tts_breakdown.get("tts_error")) or (
        bool(segment.latency.tts_start_time)
        and not bool(tts_breakdown.get("tts_available"))
        and int(tts_total) <= 0
    )
    tts_rows: list[tuple[str, int | float | str, dict[str, bool] | None, str | None]] = [
        ("Direct Speak Called", int(tts_breakdown.get("tts_direct_speak_called_ms", 0)), None, None),
    ]
    if playback_queue_wait_ms > 0:
        tts_rows.append(("Playback Wait", int(playback_queue_wait_ms), None, None))
    tts_rows.extend(
        [
            ("Voice Start Proxy", int(tts_breakdown.get("voice_start_proxy_ms", 0)), None, None),
            ("Voice Completed", int(tts_breakdown.get("voice_completed_ms", 0)), None, None),
            ("Process Start Overhead", int(tts_breakdown.get("process_start_overhead_ms", 0)), None, None),
        ]
    )
    sections.append(
        {
            "title": "TTS",
            "description": "Creates and prepares the translated voice.",
            "total_ms": tts_total + playback_queue_wait_ms,
            "rows": tts_rows,
            "expanded": main_bottleneck_stage == "TTS",
            "unavailable": tts_unavailable,
            "footer_note": (
                "Local TTS engine is not configured."
                if tts_unavailable
                else f"Slowest detail: {groups.get('tts_bottleneck', 'N/A')}"
            ),
        }
    )
    return {
        "summary_items": summary_items,
        "sections": sections,
        "main_bottleneck_stage": main_bottleneck_stage,
        "main_bottleneck_reason": main_bottleneck_reason,
        "slowest_detail": slowest_detail,
        "stage_totals": stage_totals,
        "missing_latency_ms": max(0, measured_output_latency_ms - pipeline_component_total_ms),
        "summary_note": "Latency is shown only when measured; unavailable values are preserved as unavailable.",
    }


@dataclass(slots=True)
class PrototypeRuntime:
    config: EngineConfig
    capture: AudioCapture = field(default_factory=AudioCapture)
    calibration: AudioCalibration = field(default_factory=AudioCalibration)
    preprocessor: AudioPreprocessor = field(default_factory=AudioPreprocessor)
    vad: VADPipeline = field(default_factory=VADPipeline)
    segment_builder: SegmentBuilder = field(default_factory=SegmentBuilder)
    asr_loader: ASRModelLoader = field(default_factory=ASRModelLoader)
    translation_engine: TranslationEngine = field(default_factory=TranslationEngine)
    tts: TTSPlaceholder = field(default_factory=TTSPlaceholder)
    replay: ReplayController = field(default_factory=ReplayController)
    audio_settings: AudioSettings = field(default_factory=load_audio_settings)
    session: TranscriptSession = field(init=False)
    current_status: UIState = UIState.IDLE
    current_calibration: CalibrationResult | None = None
    cuda_status: CudaValidationResult | None = None
    cpu_degraded_mode_enabled: bool = False
    accepted_count: int = 0
    rejected_count: int = 0
    error_count: int = 0
    _pending_pipeline_results: list[Any] = field(default_factory=list, init=False, repr=False)
    _pending_pipeline_results_lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)

    def __post_init__(self) -> None:
        AudioNoiseFilter.configure(self.config.noise_thresholds)
        self.asr_loader = ASRModelLoader.from_config(self.config)
        self.translation_engine = TranslationEngine(
            primary_engine_name=self.config.translation_engine_name,
            fallback_engine_name=self.config.translation_fallback_engine_name,
            model_root=self.config.translation_model_dir,
        )
        self.tts = TTSPlaceholder(
            custom_voice_profile_id=self.audio_settings.voice_actor_profile_id.strip(),
            custom_voice_profiles_root=self.audio_settings.voice_actor_profiles_root if self.audio_settings.voice_actor_profiles_root else None,
        )
        self.vad.set_preset(resolve_safe_vad_preset(self.config.vad_preset))
        self.session = self.create_session()
        self.refresh_cuda_status(write_reports=False)

    def create_session(self) -> TranscriptSession:
        session_id = datetime.now().strftime("SESSION-%Y%m%d-%H%M%S")
        return TranscriptSession(
            session_id=session_id,
            input_language=self.config.source_language,
            output_language=self.config.target_language,
            asr_model=self.config.primary_asr_model,
            translation_engine=self.translation_engine.primary_engine_name,
            cache_root=self.config.cache_dir,
            saved_root=self.config.saved_data_dir,
        )

    def reset_session(self) -> None:
        self.session = self.create_session()
        self.accepted_count = 0
        self.rejected_count = 0
        self.error_count = 0
        self.clear_pending_pipeline_results()
        self._session_reset_count += 1

    def set_status(self, status: UIState) -> UIState:
        self.current_status = status
        return self.current_status

    def log_event(self, level: str, message: str, details: object | None = None) -> None:
        try:
            append_log_async("launcher_latest.log", level, message, details)
        except Exception:
            append_log("launcher_latest.log", level, message, details)

    def refresh_cuda_status(self, *, write_reports: bool = False) -> CudaValidationResult:
        if self.cuda_status is not None and not write_reports:
            return self.cuda_status
        self.cuda_status = validate_cuda(write_reports=write_reports)
        return self.cuda_status

    def cuda_core_ready(self) -> bool:
        return self.cuda_status is not None and self.cuda_status.core_status == CUDA_CORE_PASS

    def apply_asr_device_policy(self) -> None:
        if self.cuda_core_ready():
            self.asr_loader.device = "cuda"
            self.asr_loader.compute_type = "float16"
        elif self.cpu_degraded_mode_enabled:
            self.asr_loader.device = "cpu"
            self.asr_loader.compute_type = "int8"
        else:
            self.asr_loader.device = "cuda"
            self.asr_loader.compute_type = "float16"

    def save_audio_settings(self) -> Path:
        return save_audio_settings(self.audio_settings)

    def should_show_segment(self, segment: TranscriptSegment) -> bool:
        return segment.quality.status == "Completed"

    def add_pipeline_segment(self, segment: TranscriptSegment) -> bool:
        if self.should_show_segment(segment):
            self.session.add_segment(segment)
            self.accepted_count += 1
            return True
        self.rejected_count += 1
        return False

    def queue_pipeline_result(self, result: Any) -> None:
        with self._pending_pipeline_results_lock:
            self._pending_pipeline_results.append(result)

    def drain_pipeline_results(self) -> list[Any]:
        with self._pending_pipeline_results_lock:
            if not self._pending_pipeline_results:
                return []
            pending = list(self._pending_pipeline_results)
            self._pending_pipeline_results.clear()
            return pending

    def clear_pending_pipeline_results(self) -> None:
        with self._pending_pipeline_results_lock:
            self._pending_pipeline_results.clear()

    def build_mock_segment(self) -> TranscriptSegment:
        segment_id = f"SEG-{self.session.segment_count + 1:06d}"
        replay = ReplayPaths(source_audio_path=self.session.segment_audio_path(self.config.cache_dir, segment_id))
        return self.segment_builder.build_segment(
            segment_id=segment_id,
            session_id=self.session.session_id,
            input_language=self.config.source_language,
            output_language=self.config.target_language,
            start_time_ms=0,
            end_time_ms=1000,
            input_text="[Mock] Selamat pagi, ini adalah uji alur TranslateIT.",
            translated_text="[Mock] Good morning, this is a TranslateIT workflow test.",
            latency=MetricMetrics(),
            quality=QualityMetrics(input_quality="Mock", asr_confidence=1.0, status="Completed", notes="Mock segment."),
            replay=replay,
            capture_mode=CAPTURE_MODE_MOCK_PIPELINE,
            asr_model_used="Mock ASR",
            translation_engine_used="Mock Translation",
        )

    def cache_current_session(self) -> Path:
        return self.session.save_to_cache_root(self.config.cache_dir)

    def save_current_session(self) -> Path:
        saved = self.session.save_bundle_to_saved_root(self.config.saved_data_dir)
        self._write_session_benchmark_reports_if_changed()
        return saved

    def export_reports(self) -> tuple[Path, Path]:
        self._write_session_benchmark_reports_if_changed()
        benchmark_payload = _build_benchmark_export_payload(self)
        benchmark_json = self.config.cache_dir.parent / "LogData" / "benchmark_latest.json"
        benchmark_txt = self.config.cache_dir.parent / "LogData" / "benchmark_latest.txt"
        write_json_report(benchmark_json.name, benchmark_payload)
        write_text_report(benchmark_txt.name, _build_benchmark_export_lines(benchmark_payload))
        return benchmark_json, benchmark_txt

    def _build_session_benchmark_signature(self) -> tuple[Any, ...]:
        session = self.runtime.session
        last_segment = session.segments[-1] if session.segments else None
        return (
            session.session_id,
            len(session.segments),
            getattr(self.runtime, "accepted_count", 0),
            getattr(self.runtime, "rejected_count", 0),
            getattr(last_segment, "segment_id", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "tts_end_time", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "tts_voice_start_proxy_time", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "speech_end_to_voice_proxy_ms", 0) if last_segment is not None else 0,
        )

    def _write_session_benchmark_reports_if_changed(self) -> dict[str, Any]:
        signature = self._build_session_benchmark_signature()
        cached_signature = getattr(self, "_session_benchmark_report_signature", None)
        cached_report = getattr(self, "_session_benchmark_report_cache", None)
        if cached_signature == signature and cached_report is not None:
            return dict(cached_report)
        report = write_benchmark_reports(self.session)
        self._session_benchmark_report_signature = signature
        self._session_benchmark_report_cache = dict(report)
        return report

    def dependency_status_lines(self) -> list[str]:
        return [
            f"PySide6: {'available' if PYSIDE_AVAILABLE else 'missing'}",
            f"Language focus: {self.config.language_focus_mode}",
            f"sounddevice: {'available' if self.capture.backend_status().available else 'missing'}",
            f"faster_whisper: {self.asr_loader.dependency_status()}",
            f"torch/transformers: {self.translation_engine.dependency_status().message}",
        ]

    def model_status_lines(self) -> list[str]:
        primary_asr = self.config.asr_model_dir / "faster-whisper-large-v3-turbo" / "model.bin"
        backup_asr = self.config.asr_model_dir / "faster-whisper-medium" / "model.bin"
        primary_translation = self.config.translation_model_dir / "nllb-200-distilled-600M" / "config.json"
        backup_translation = self.config.translation_model_dir / "marianmt-id-en" / "config.json"
        return [
            f"ASR primary: {'found' if primary_asr.exists() else 'missing'}",
            f"ASR backup: {'found' if backup_asr.exists() else 'missing'}",
            f"ASR target: {self.config.primary_asr_model} on {self.asr_loader.device}/{self.asr_loader.compute_type}",
            f"Translation primary: {'found' if primary_translation.exists() else 'missing'}",
            f"Translation backup: {'found' if backup_translation.exists() else 'missing'}",
            f"Translation target: {self.config.translation_engine_name}",
        ]


def create_runtime(config: EngineConfig | None = None) -> PrototypeRuntime:
    return PrototypeRuntime(config or load_default_config())


def build_startup_summary(config: EngineConfig) -> list[str]:
    return [
        f"Application: {config.app_name}",
        f"Primary ASR: {config.primary_asr_model}",
        f"Backup ASR: {config.backup_asr_model}",
        f"Device: {config.device}",
        f"Compute type: {config.compute_type}",
        f"Source language: {config.source_language}",
        f"Target language: {config.target_language}",
        f"Custom voice: {'enabled' if config.use_custom_voice_actor else 'disabled'}",
        f"Voice profile: {config.voice_actor_profile_id or 'not selected'}",
        f"Voice profiles root: {config.voice_actor_profiles_root}",
        f"Local-only mode: {config.local_only_mode}",
        f"Cache dir: {config.cache_dir}",
        f"Saved dir: {config.saved_data_dir}",
    ]


def build_dependency_summary(runtime: PrototypeRuntime) -> list[str]:
    return runtime.dependency_status_lines()


def build_tts_request_for_segment(
    *,
    segment_id: str,
    text: str,
    language: str,
    output_path: str,
    trace_id: str,
    audio_settings: AudioSettings,
) -> TTSRequest:
    custom_voice_enabled = bool(audio_settings.use_custom_voice_actor and audio_settings.voice_actor_profile_id.strip())
    voice_profile_id = audio_settings.voice_actor_profile_id.strip() if custom_voice_enabled else ""
    voice_profiles_root = audio_settings.voice_actor_profiles_root if custom_voice_enabled and audio_settings.voice_actor_profiles_root else ""
    return TTSRequest(
        segment_id=segment_id,
        text=text,
        language=language,
        output_path=output_path,
        trace_id=trace_id,
        voice_profile_id=voice_profile_id,
        voice_profiles_root=voice_profiles_root,
    )


def should_bypass_translation_voice_cache(audio_settings: AudioSettings) -> bool:
    return bool(audio_settings.use_custom_voice_actor and audio_settings.voice_actor_profile_id.strip())


def print_lines(lines: Iterable[str]) -> None:
    for line in lines:
        print(line)


def run_validate_only() -> int:
    items = build_validation_items()
    for item in items:
        print(item.line())
    return validation_exit_code(items)


if PYSIDE_AVAILABLE:  # pragma: no cover - interactive UI path

    class DiagnosticWorker(QThread):
        message = Signal(str)
        finished_result = Signal(object)
        error = Signal(str)

        def __init__(self, runtime: PrototypeRuntime, selected_device_id: int | None, sensitivity: str = "Normal") -> None:
            super().__init__()
            self.runtime = runtime
            self.selected_device_id = selected_device_id
            self.sensitivity = sensitivity

        def run(self) -> None:
            try:
                self.message.emit("Stay silent for noise measurement.")
                result = run_microphone_diagnostic(
                    device_id=self.selected_device_id,
                    capture=self.runtime.capture,
                    preprocessor=self.runtime.preprocessor,
                    calibration=self.runtime.calibration,
                    sensitivity=self.sensitivity,
                )
                self.finished_result.emit(result)
            except Exception as exc:
                self.error.emit(format_exception(exc))


    class TTSWorker(QThread):
        finished_result = Signal(object)
        error = Signal(str)

        def __init__(self, runtime: PrototypeRuntime, request: TTSRequest) -> None:
            super().__init__()
            self.runtime = runtime
            self.request = request

        def run(self) -> None:
            try:
                self.finished_result.emit(self.runtime.tts.speak(self.request))
            except Exception as exc:
                self.error.emit(format_exception(exc))


    class StartupWarmupWorker(QThread):
        message = Signal(str)
        finished_result = Signal(object)
        error = Signal(str)

        def __init__(self, runtime: PrototypeRuntime) -> None:
            super().__init__()
            self.runtime = runtime

        def run(self) -> None:
            try:
                result: dict[str, object] = {}
                asr_profile = self.runtime.asr_loader.realtime_profile()
                custom_voice_enabled = bool(
                    getattr(self.runtime.audio_settings, "use_custom_voice_actor", False)
                    and str(getattr(self.runtime.audio_settings, "voice_actor_profile_id", "")).strip()
                )
                self.message.emit("Loading ASR.")
                asr_started = perf_counter()
                asr_result = self.runtime.asr_loader.load_model(asr_profile)
                result["asr_loaded"] = asr_result.loaded
                result["asr_message"] = asr_result.message
                result["asr_model"] = asr_result.selected_model
                result["asr_load_ms"] = int((perf_counter() - asr_started) * 1000)

                self.message.emit("Loading translation.")
                translation_started = perf_counter()
                translation_capability = self.runtime.translation_engine.load_local_model()
                result["translation_loaded"] = translation_capability.available
                result["translation_message"] = translation_capability.message
                result["translation_engine"] = translation_capability.engine_name
                result["translation_load_ms"] = int((perf_counter() - translation_started) * 1000)

                self.message.emit("Warming ASR.")
                asr_warm_started = perf_counter()
                asr_warmup = self.runtime.asr_loader.warmup_model(asr_profile)
                result["asr_warmup_loaded"] = bool(asr_warmup.get("loaded", False))
                result["asr_warmup_message"] = asr_warmup.get("message", "")
                result["asr_warmup_reused"] = bool(asr_warmup.get("reused", False))
                result["asr_warmup_ms"] = int((perf_counter() - asr_warm_started) * 1000)
                if result["asr_warmup_reused"]:
                    self.message.emit("ASR already warm. Reusing resident state.")

                self.message.emit("Warming translation.")
                translation_warm_started = perf_counter()
                translation_warmup = self.runtime.translation_engine.warmup_model()
                result["translation_warmup_loaded"] = bool(translation_warmup.get("loaded", False))
                result["translation_warmup_message"] = translation_warmup.get("message", "")
                result["translation_warmup_reused"] = bool(translation_warmup.get("reused", False))
                result["translation_warmup_ms"] = int((perf_counter() - translation_warm_started) * 1000)
                if result["translation_warmup_reused"]:
                    self.message.emit("Translation already warm. Reusing resident state.")

                if sys.platform.startswith("win"):
                    self.message.emit("Queueing voice engine warmup in background.")
                    tts_warm_started = perf_counter()
                    begin_background_warmup = getattr(self.runtime.tts, "begin_background_warmup", None)
                    background_started = False
                    if callable(begin_background_warmup):
                        try:
                            background_started = bool(begin_background_warmup())
                        except Exception:
                            background_started = False
                    result["tts_warmup_loaded"] = bool(getattr(self.runtime.tts, "_warmup_cached_success", None))
                    result["tts_warmup_message"] = (
                        "Voice engine warmup queued in background."
                        if background_started
                        else "Voice engine warmup deferred."
                    )
                    result["tts_warmup_reused"] = bool(getattr(self.runtime.tts, "_warmup_cached_success", None))
                    result["tts_warmup_ms"] = int((perf_counter() - tts_warm_started) * 1000)

                self.finished_result.emit(result)
            except Exception as exc:
                self.error.emit(format_exception(exc))


    class ClickableFrame(QFrame):
        clicked = Signal()

        def mousePressEvent(self, event) -> None:  # type: ignore[override]
            if hasattr(event, "button") and event.button() == Qt.MouseButton.LeftButton:
                self.clicked.emit()
            super().mousePressEvent(event)


    class ClickableLabel(QLabel):
        clicked = Signal()

        def mousePressEvent(self, event) -> None:  # type: ignore[override]
            if hasattr(event, "button") and event.button() == Qt.MouseButton.LeftButton:
                self.clicked.emit()
            super().mousePressEvent(event)


    def _latency_state(ms: int) -> str:
        if ms < 700:
            return "ready"
        if ms < 1200:
            return "warning"
        return "error"


    def _latency_icon(ms: int) -> str:
        if ms < 700:
            return "▂▃▅▇"
        if ms < 1200:
            return "▂▃▅▇"
        return "▂▃▅▇"


    def _format_latency_badge(ms: int) -> str:
        return f"{_latency_icon(ms)} {ms} ms"


    def _format_latency_badge_optional(ms: int | None) -> str:
        if ms is None:
            return "Latency unavailable"
        return _format_latency_badge(max(0, int(ms)))


    class LatencyDetailsDialog(QDialog):
        def __init__(self, segment: TranscriptSegment, parent: QWidget | None = None) -> None:
            super().__init__(parent)
            self.setWindowTitle("Latency Details")
            self.setModal(True)
            self.setObjectName("panel")
            self.resize(920, 760)
            root_layout = QVBoxLayout(self)
            root_layout.setContentsMargins(18, 18, 18, 18)
            root_layout.setSpacing(12)

            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setFrameShape(QFrame.Shape.NoFrame)
            root_layout.addWidget(scroll)

            content = QWidget()
            scroll.setWidget(content)
            layout = QVBoxLayout(content)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(12)

            def status_meta(
                value: int | float | str,
                *,
                unavailable: bool = False,
                cached: bool = False,
                disabled: bool = False,
                not_needed: bool = False,
                skipped: bool = False,
                na: bool = False,
            ) -> tuple[str, str, str]:
                if unavailable:
                    return "Unavailable", "error", "Unavailable"
                if disabled:
                    return "Disabled", "info", "Disabled"
                if cached:
                    return "Cached", "info", "Cached"
                if not_needed:
                    return "Not Needed", "info", "Not Needed"
                if skipped:
                    return "Skipped", "info", "Skipped"
                if na:
                    return "N/A", "info", "N/A"
                if isinstance(value, str):
                    normalized = value.strip()
                    if not normalized:
                        return "N/A", "info", "N/A"
                    lowered = normalized.lower()
                    if lowered in {"unavailable", "error", "failed"}:
                        return "Unavailable", "error", "Unavailable"
                    if lowered == "cached":
                        return "Cached", "info", "Cached"
                    if lowered in {"not needed", "disabled", "skipped", "n/a"}:
                        label = normalized.title() if lowered != "n/a" else "N/A"
                        return label, "info", label
                    return normalized, "ready", normalized
                numeric = int(value)
                if numeric <= 0:
                    return "No Delay", "ready", "No Delay"
                if numeric < 700:
                    return "OK", "ready", "OK"
                if numeric < 1200:
                    return "Slow", "warning", "Slow"
                return "Slow", "warning", "Slow"

            def value_text_for(
                value: int | float | str,
                *,
                unavailable: bool = False,
                cached: bool = False,
                disabled: bool = False,
                not_needed: bool = False,
                skipped: bool = False,
                na: bool = False,
            ) -> str:
                status_text, _, _ = status_meta(
                    value,
                    unavailable=unavailable,
                    cached=cached,
                    disabled=disabled,
                    not_needed=not_needed,
                    skipped=skipped,
                    na=na,
                )
                if status_text in {"Unavailable", "Disabled", "Cached", "Not Needed", "Skipped", "N/A"}:
                    return status_text
                if isinstance(value, str):
                    return value.strip() or "N/A"
                numeric = int(value)
                return "No Delay" if numeric <= 0 else f"{numeric} ms"

            def metric_row(
                label: str,
                value: int | float | str,
                *,
                note: str = "",
                unavailable: bool = False,
                cached: bool = False,
                disabled: bool = False,
                not_needed: bool = False,
                skipped: bool = False,
                na: bool = False,
            ) -> QWidget:
                row_widget = QWidget()
                row_layout = QHBoxLayout(row_widget)
                row_layout.setContentsMargins(0, 0, 0, 0)
                row_layout.setSpacing(10)
                label_widget = QLabel(label)
                label_widget.setObjectName("mutedText")
                value_status, value_state, status_text = status_meta(
                    value,
                    unavailable=unavailable,
                    cached=cached,
                    disabled=disabled,
                    not_needed=not_needed,
                    skipped=skipped,
                    na=na,
                )
                value_widget = QLabel(value_text_for(
                    value,
                    unavailable=unavailable,
                    cached=cached,
                    disabled=disabled,
                    not_needed=not_needed,
                    skipped=skipped,
                    na=na,
                ))
                value_widget.setObjectName("badge")
                value_widget.setProperty("statusState", value_state)
                status_widget = QLabel(status_text)
                status_widget.setObjectName("badge")
                status_widget.setProperty("statusState", value_state)
                row_layout.addWidget(label_widget)
                row_layout.addStretch(1)
                row_layout.addWidget(value_widget)
                return row_widget

            def add_note(parent_layout: QVBoxLayout, note: str) -> None:
                if not note:
                    return
                note_label = QLabel(note)
                note_label.setWordWrap(True)
                note_label.setObjectName("mutedText")
                parent_layout.addWidget(note_label)

            class CollapsibleSection(QFrame):
                def __init__(
                    self,
                    title: str,
                    description: str,
                    total_ms: int,
                    rows: list[tuple[str, int | float | str, dict[str, bool] | None, str | None]],
                    *,
                    expanded: bool = False,
                    unavailable: bool = False,
                    cached: bool = False,
                    footer_note: str = "",
                ) -> None:
                    super().__init__()
                    self.setObjectName("panel")
                    outer = QVBoxLayout(self)
                    outer.setContentsMargins(14, 12, 14, 12)
                    outer.setSpacing(8)

                    header = QHBoxLayout()
                    header.setSpacing(10)
                    self.toggle_button = QToolButton()
                    self.toggle_button.setCheckable(True)
                    self.toggle_button.setChecked(expanded)
                    self.toggle_button.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)
                    self.toggle_button.setArrowType(Qt.ArrowType.DownArrow if expanded else Qt.ArrowType.RightArrow)
                    self.toggle_button.setText(title)
                    self.toggle_button.setCursor(Qt.CursorShape.PointingHandCursor)
                    self.toggle_button.setObjectName("sectionLabel")
                    self.toggle_button.clicked.connect(self._toggle)

                    title_box = QVBoxLayout()
                    desc_label = QLabel(description)
                    desc_label.setWordWrap(True)
                    desc_label.setObjectName("mutedText")
                    title_box.addWidget(self.toggle_button)
                    title_box.addWidget(desc_label)
                    header.addLayout(title_box)
                    header.addStretch(1)

                    total_text, total_state, total_status = status_meta(total_ms, unavailable=unavailable, cached=cached)
                    total_value = QLabel(total_text if total_text in {"Unavailable", "Cached", "Not Needed", "Disabled", "Skipped", "N/A", "No Delay"} else f"{int(total_ms)} ms")
                    total_value.setObjectName("badge")
                    total_value.setProperty("statusState", total_state)
                    header.addWidget(total_value)
                    outer.addLayout(header)

                    self.body = QWidget()
                    body_layout = QVBoxLayout(self.body)
                    body_layout.setContentsMargins(0, 4, 0, 0)
                    body_layout.setSpacing(8)
                    for row_label, row_value, row_flags, row_note in rows:
                        flags = row_flags or {}
                        row = metric_row(
                            row_label,
                            row_value,
                            unavailable=flags.get("unavailable", False),
                            cached=flags.get("cached", False),
                            disabled=flags.get("disabled", False),
                            not_needed=flags.get("not_needed", False),
                            skipped=flags.get("skipped", False),
                            na=flags.get("na", False),
                            note=row_note or "",
                        )
                        body_layout.addWidget(row)
                        if row_note:
                            add_note(body_layout, row_note)
                    add_note(body_layout, footer_note)
                    self.body.setVisible(expanded)
                    outer.addWidget(self.body)

                def _toggle(self) -> None:
                    expanded = self.toggle_button.isChecked()
                    self.toggle_button.setArrowType(Qt.ArrowType.DownArrow if expanded else Qt.ArrowType.RightArrow)
                    self.body.setVisible(expanded)

            latency_view = _build_latency_details_view_model(segment)
            summary_items = latency_view["summary_items"]
            stage_totals = latency_view["stage_totals"]
            main_bottleneck_stage = str(latency_view["main_bottleneck_stage"])
            main_bottleneck_reason = str(latency_view["main_bottleneck_reason"])
            slowest_detail = str(latency_view["slowest_detail"])
            missing_latency_ms = int(max(0, latency_view["missing_latency_ms"] or 0))

            summary_frame = QFrame()
            summary_frame.setObjectName("panel")
            summary_layout = QVBoxLayout(summary_frame)
            summary_layout.setContentsMargins(14, 14, 14, 14)
            summary_layout.setSpacing(10)
            summary_title = QLabel("Summary")
            summary_title.setObjectName("sectionLabel")
            summary_layout.addWidget(summary_title)

            summary_grid = QGridLayout()
            summary_grid.setHorizontalSpacing(14)
            summary_grid.setVerticalSpacing(8)
            for row, (label_text, value_text, state_text) in enumerate(summary_items):
                lbl = QLabel(label_text)
                lbl.setObjectName("mutedText")
                val = QLabel(value_text)
                val.setObjectName("badge")
                val.setProperty("statusState", state_text)
                summary_grid.addWidget(lbl, row, 0)
                summary_grid.addWidget(val, row, 1)
            summary_layout.addLayout(summary_grid)
            summary_note = QLabel(str(latency_view["summary_note"]))
            summary_note.setWordWrap(True)
            summary_note.setObjectName("mutedText")
            summary_layout.addWidget(summary_note)
            layout.addWidget(summary_frame)

            stage_header = QLabel("Details")
            stage_header.setObjectName("sectionLabel")
            layout.addWidget(stage_header)

            for section in latency_view["sections"]:
                layout.addWidget(
                    CollapsibleSection(
                        str(section["title"]),
                        str(section["description"]),
                        int(section["total_ms"]),
                        [
                            (str(row_label), row_value, row_flags, row_note)
                            for row_label, row_value, row_flags, row_note in section["rows"]
                        ],
                        expanded=bool(section["expanded"]),
                        unavailable=bool(section["unavailable"]),
                        footer_note=str(section["footer_note"]),
                    )
                )
            focus_frame = QFrame()
            focus_frame.setObjectName("panel")
            focus_layout = QVBoxLayout(focus_frame)
            focus_layout.setContentsMargins(14, 14, 14, 14)
            focus_layout.setSpacing(8)
            focus_title = QLabel("Performance Monitor")
            focus_title.setObjectName("sectionLabel")
            focus_layout.addWidget(focus_title)
            focus_pairs = [
                ("Highest Stage", main_bottleneck_stage),
                ("Highest Detail", slowest_detail),
                ("Time", f"{stage_totals.get(main_bottleneck_stage, 0)} ms" if main_bottleneck_stage in stage_totals else "N/A"),
                ("Reason", f"{main_bottleneck_reason.replace('_', ' ')}" if main_bottleneck_reason else "No bottleneck was measured."),
            ]
            focus_grid = QGridLayout()
            focus_grid.setHorizontalSpacing(14)
            focus_grid.setVerticalSpacing(8)
            for row, (label_text, value_text) in enumerate(focus_pairs):
                lbl = QLabel(label_text)
                lbl.setObjectName("mutedText")
                val = QLabel(value_text)
                val.setWordWrap(True)
                val.setObjectName("panelTitle" if row in {0, 1} else "mutedText")
                focus_grid.addWidget(lbl, row, 0)
                focus_grid.addWidget(val, row, 1)
            focus_layout.addLayout(focus_grid)
            note_text = "This panel shows the part of the pipeline that took the longest."
            if missing_latency_ms > 0:
                note_text += f" The {missing_latency_ms} ms alignment gap is the stopwatch-to-app difference and is shown separately."
            note_label = QLabel(note_text)
            note_label.setWordWrap(True)
            note_label.setObjectName("mutedText")
            focus_layout.addWidget(note_label)
            layout.addWidget(focus_frame)

            close_button = QPushButton("Close")
            close_button.clicked.connect(self.accept)
            close_button.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
            root_layout.addWidget(close_button, 0, Qt.AlignmentFlag.AlignRight)


    class TranscriptCardWidget(QFrame):
        @staticmethod
        def _make_view_model_fingerprint(view_model: TranscriptCardViewModel) -> tuple[Any, ...]:
            return (
                view_model.segment_id,
                view_model.session_id,
                view_model.source_text,
                view_model.translated_text,
                view_model.timestamp_label,
                view_model.total_latency_label,
                view_model.quality_label,
                view_model.latency_detail_label,
                view_model.asr_model_label,
                view_model.translation_engine_label,
                view_model.compute_label,
                view_model.can_replay_source,
                view_model.can_replay_translation,
                view_model.translation_placeholder,
                str(view_model.source_audio_path or ""),
                str(view_model.translated_audio_path or ""),
            )

        def __init__(
            self,
            view_model: TranscriptCardViewModel,
            *,
            on_replay_source: Callable[[], None] | None = None,
            on_replay_translation: Callable[[], None] | None = None,
            on_show_latency: Callable[[], None] | None = None,
            parent: QWidget | None = None,
        ) -> None:
            super().__init__(parent)
            self.view_model = view_model
            self._view_model_fingerprint = self._make_view_model_fingerprint(view_model)
            self._on_show_latency = on_show_latency
            self.setObjectName("transcriptEntry")
            self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Maximum)
            self.setProperty("clickableCard", "true")
            layout = QVBoxLayout(self)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(10)
            top_row = QHBoxLayout()
            top_row_widget = ClickableFrame()
            top_row_widget.setObjectName("transcriptTopRow")
            top_row_widget.setProperty("clickable", "true")
            top_row_widget.setCursor(Qt.CursorShape.PointingHandCursor)
            top_row_layout = QHBoxLayout(top_row_widget)
            top_row_layout.setContentsMargins(0, 0, 0, 0)
            top_row_layout.setSpacing(0)
            avatar = QLabel("Y")
            avatar.setObjectName("avatar")
            speaker = QLabel("You")
            speaker.setObjectName("sectionLabel")
            meta = QLabel(f"{view_model.timestamp_label} | {view_model.segment_id}")
            meta.setObjectName("mutedText")
            self.latency_label = ClickableLabel(
                _format_latency_badge_optional(_safe_latency_badge_ms(view_model.total_latency_label))
            )
            self.latency_label.setObjectName("badge")
            self.latency_label.setCursor(Qt.CursorShape.PointingHandCursor)
            self.latency_label.setToolTip("Click to open latency details.")
            try:
                total_latency_value = _safe_latency_badge_ms(view_model.total_latency_label)
            except Exception:
                total_latency_value = None
            latency_state = _latency_state(total_latency_value or 0)
            self.latency_label.setProperty("statusState", latency_state)
            top_row_layout.addWidget(avatar)
            top_row_layout.addWidget(speaker)
            top_row_layout.addWidget(meta)
            top_row_layout.addStretch(1)
            top_row_layout.addWidget(self.latency_label)

            def line_frame(
                role: str,
                text: str,
                *,
                line_role: str = "in",
                on_click: Callable[[], None] | None = None,
            ) -> QFrame:
                frame = ClickableFrame()
                frame.setObjectName("lineFrame")
                frame.setProperty("clickable", "true")
                frame.setCursor(Qt.CursorShape.PointingHandCursor)
                frame.setToolTip("Click to replay source audio." if line_role == "in" else "Click to play translation voice.")
                row = QHBoxLayout(frame)
                row.setContentsMargins(12, 9, 12, 9)
                row.setSpacing(10)
                role_label = QLabel(role)
                role_label.setObjectName("lineRole")
                separator = QLabel("|")
                separator.setObjectName("mutedText")
                body = QLabel(text or "-")
                body.setWordWrap(True)
                for widget in (role_label, separator, body):
                    widget.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
                row.addWidget(role_label)
                row.addWidget(separator)
                row.addWidget(body, 1)
                frame.setProperty("lineRole", line_role)
                if on_click is not None:
                    frame.clicked.connect(on_click)
                return frame

            self.source_body_label = QLabel(view_model.source_text)
            self.source_body_label.setWordWrap(True)
            self.translation_body_label = QLabel(view_model.translated_text)
            self.translation_body_label.setWordWrap(True)
            source_label = line_frame("IN", "", on_click=on_replay_source)
            translation_label = line_frame("OUT", "", line_role="out", on_click=on_replay_translation)
            source_label.layout().itemAt(2).widget().setParent(None)  # type: ignore[union-attr]
            translation_label.layout().itemAt(2).widget().setParent(None)  # type: ignore[union-attr]
            source_label.layout().addWidget(self.source_body_label, 1)  # type: ignore[union-attr]
            translation_label.layout().addWidget(self.translation_body_label, 1)  # type: ignore[union-attr]
            if on_show_latency is not None:
                self.latency_label.clicked.connect(on_show_latency)
            layout.addWidget(top_row_widget)
            if view_model.latency_detail_label:
                latency_detail = QLabel(view_model.latency_detail_label)
                latency_detail.setObjectName("mutedText")
                latency_detail.setWordWrap(True)
                layout.addWidget(latency_detail)
            layout.addWidget(source_label)
            layout.addWidget(translation_label)

        def update_view_model(self, view_model: TranscriptCardViewModel) -> None:
            new_fingerprint = self._make_view_model_fingerprint(view_model)
            if new_fingerprint == self._view_model_fingerprint:
                return
            self.view_model = view_model
            self._view_model_fingerprint = new_fingerprint
            self.source_body_label.setText(view_model.source_text or "[no transcript text]")
            self.translation_body_label.setText(view_model.translated_text or "[translation pending]")
            parsed_latency = _safe_latency_badge_ms(view_model.total_latency_label)
            self.latency_label.setText(_format_latency_badge_optional(parsed_latency))
            self.latency_label.setProperty("statusState", _latency_state(parsed_latency or 0))


    class TranslateITWindow(QMainWindow):
        def __init__(self, runtime: PrototypeRuntime) -> None:
            super().__init__()
            self.runtime = runtime
            self.app_started_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self.live_thread: LivePipelineThread | None = None
            self.diagnostic_worker: DiagnosticWorker | None = None
            self.tts_worker: TTSWorker | None = None
            self.startup_worker: StartupWarmupWorker | None = None
            self.pending_tts_segment_id: str | None = None
            self.pending_tts_autoplay = False
            self.pending_tts_jobs: list[tuple[TranscriptSegment, bool]] = []
            self.pending_tts_queue_limit = 1
            self._pending_tts_drain_scheduled = False
            self._capture_generation = 0
            self._session_persist_lock = threading.Lock()
            self._session_persist_running = False
            self._processed_pipeline_segment_ids: set[str] = set()
            self._pipeline_result_flush_timer = QTimer(self)
            self._pipeline_result_flush_timer.setInterval(120)
            self._pipeline_result_flush_timer.timeout.connect(self._drain_pending_pipeline_results)
            self.auto_play_out_voice = self.runtime.audio_settings.auto_play_out_voice
            self.transcript_widgets_by_segment_id: dict[str, TranscriptCardWidget] = {}
            self._pending_playback_request_perf_by_path: dict[str, float] = {}
            self._pending_playback_queue_perf_by_path: dict[str, float] = {}
            self._pending_playback_worker_dequeue_perf_by_path: dict[str, float] = {}
            self._pending_playback_backend_prep_start_perf_by_path: dict[str, float] = {}
            self._pending_playback_backend_prep_end_perf_by_path: dict[str, float] = {}
            self._pending_playback_backend_start_perf_by_path: dict[str, float] = {}
            self._pending_playback_audio_start_perf_by_path: dict[str, float] = {}
            self._pending_playback_backend_return_perf_by_path: dict[str, float] = {}
            self._pending_playback_submit_perf_by_path: dict[str, float] = {}
            self._pending_playback_segment_id_by_path: dict[str, str] = {}
            self.engine_startup_ready = False
            self.start_pressed_time = ""
            self.ready_to_listen_time = ""
            self.start_pressed_perf: float | None = None
            self.ready_to_listen_perf: float | None = None
            self.model_preload_start_perf: float | None = None
            self.model_preload_end_perf: float | None = None
            self.stream_open_start_perf: float | None = None
            self.stream_open_end_perf: float | None = None
            self.first_audio_callback_perf: float | None = None
            self.warmup_perf: float | None = None
            self.false_ready_prevented = False
            self._active_latency_dialog: QDialog | None = None
            self._last_worker_error = ""
            self._last_playback_error = ""
            self._last_lifecycle_error = ""
            self._last_ui_latency_segment_id = ""
            self._ui_latency_modal_open = False
            self._stale_callbacks_rejected = 0
            self._status_refresh_pending = False
            self._status_panel_signature: tuple[Any, ...] | None = None
            self._benchmark_panel_signature: tuple[Any, ...] | None = None
            self._validation_items_cache: list[Any] = []
            self._validation_items_cache_at = 0.0
            self._benchmark_summary_cache: dict[str, Any] | None = None
            self._benchmark_summary_cache_key: tuple[str, int, int] | None = None
            self._benchmark_summary_cache_at = 0.0
            self._transcript_card_vm_cache: dict[str, tuple[tuple[Any, ...], TranscriptCardViewModel]] = {}
            self._trace_export_event_count_cache: dict[str, int] = {}
            self._trace_summary_cache: dict[str, tuple[int, dict[str, Any]]] = {}
            self._stopwatch_alignment_event_count_cache: dict[str, int] = {}
            self._health_snapshot_cache: dict[str, tuple[tuple[Any, ...], object]] = {}
            self._session_persist_signature: tuple[Any, ...] | None = None
            self._session_benchmark_report_signature: tuple[Any, ...] | None = None
            self._session_benchmark_report_cache: dict[str, Any] | None = None
            self._session_reset_count = 0
            self._stop_requested_time = ""
            self._stop_completed_time = ""
            self._pending_start_after_ready = False
            playback = self.runtime.replay.playback
            if hasattr(playback, "on_playback_requested"):
                playback.on_playback_requested = self.handle_playback_requested
            if hasattr(playback, "on_playback_queued"):
                playback.on_playback_queued = self.handle_playback_queued
            if hasattr(playback, "on_playback_worker_dequeued"):
                playback.on_playback_worker_dequeued = self.handle_playback_worker_dequeued
            if hasattr(playback, "on_playback_backend_prep_start"):
                playback.on_playback_backend_prep_start = self.handle_playback_backend_prep_start
            if hasattr(playback, "on_playback_backend_prep_end"):
                playback.on_playback_backend_prep_end = self.handle_playback_backend_prep_end
            if hasattr(playback, "on_playback_backend_call_start"):
                playback.on_playback_backend_call_start = self.handle_playback_backend_call_start
            if hasattr(playback, "on_playback_started"):
                playback.on_playback_started = self.handle_playback_started
            if hasattr(playback, "on_playback_backend_return"):
                playback.on_playback_backend_return = self.handle_playback_backend_return
            if hasattr(playback, "on_playback_audio_file_open_start"):
                playback.on_playback_audio_file_open_start = self.handle_playback_audio_file_open_start
            if hasattr(playback, "on_playback_audio_file_open_end"):
                playback.on_playback_audio_file_open_end = self.handle_playback_audio_file_open_end
            if hasattr(playback, "on_playback_audio_file_read_start"):
                playback.on_playback_audio_file_read_start = self.handle_playback_audio_file_read_start
            if hasattr(playback, "on_playback_audio_file_read_end"):
                playback.on_playback_audio_file_read_end = self.handle_playback_audio_file_read_end
            self.setWindowTitle("TranslateIT Operator Console")
            self.resize(1500, 900)
            self.setMinimumSize(1180, 720)
            self.setStyleSheet(build_operator_stylesheet())

            container = QWidget()
            container.setObjectName("appRoot")
            outer = QHBoxLayout(container)
            outer.setContentsMargins(0, 0, 0, 0)
            outer.setSpacing(0)

            outer.addWidget(self.build_sidebar())
            outer.addWidget(self.build_workspace(), 1)
            self.setCentralWidget(container)

            self.populate_microphones()
            self.populate_voice_actor_profiles()
            self.connect_actions()
            self.begin_startup_warmup()
            self.refresh_status_panel()
            self.write_engine_health_snapshot("app_launch")
            self.write_worker_health_snapshot("app_launch")
            self.write_engine_stability_audit_snapshot("app_launch")
            self.log_event("INFO", "TranslateIT launcher opened.")

        def make_badge(self, text: str, state: str = "info") -> QLabel:
            badge = QLabel(text)
            badge.setObjectName("badge")
            badge.setProperty("statusState", state)
            return badge

        def _active_worker_snapshot(self) -> tuple[list[dict[str, object]], list[dict[str, object]], dict[str, object]]:
            playback = self.runtime.replay.playback
            workers = [
                {
                    "name": "startup_worker",
                    "alive": bool(self.startup_worker is not None and self.startup_worker.isRunning()),
                    "last_error": "",
                },
                {
                    "name": "diagnostic_worker",
                    "alive": bool(self.diagnostic_worker is not None and self.diagnostic_worker.isRunning()),
                    "last_error": "",
                },
                {
                    "name": "live_thread",
                    "alive": bool(self.live_thread is not None and self.live_thread.isRunning()),
                    "last_error": str(getattr(self.live_thread, "last_error", "")) if self.live_thread is not None else "",
                },
                {
                    "name": "tts_worker",
                    "alive": bool(self.tts_worker is not None and self.tts_worker.isRunning()),
                    "last_error": self._last_worker_error,
                },
                {
                    "name": "playback_worker",
                    "alive": bool(getattr(playback, "_playback_worker_started", False)),
                    "last_error": self._last_playback_error,
                },
            ]
            active_workers = [item for item in workers if item["alive"]]
            failed_workers = [item for item in workers if item["last_error"]]
            queue_sizes = {
                "pending_tts_jobs": len(self.pending_tts_jobs),
                "transcript_cards": len(self.transcript_widgets_by_segment_id),
                "session_segments": self.runtime.session.segment_count,
            }
            queue_oldest_item_age_ms = {
                "pending_playback_requests": int(max(0, len(self._pending_playback_request_perf_by_path))),
            }
            return active_workers, failed_workers, {
                "workers": workers,
                "queue_sizes": queue_sizes,
                "queue_oldest_item_age_ms": queue_oldest_item_age_ms,
            }

        def _engine_health_context(self, *, segment: TranscriptSegment | None = None, extra: dict[str, object] | None = None) -> dict[str, object]:
            active_workers, failed_workers, worker_details = self._active_worker_snapshot()
            live_thread = self.live_thread
            playback = self.runtime.replay.playback
            cuda_status = self.runtime.cuda_status
            translation_loaded = bool(
                getattr(self.runtime.translation_engine, "_model", None) is not None
                and getattr(self.runtime.translation_engine, "_tokenizer", None) is not None
            )
            asr_loaded = bool(self.runtime.asr_loader.last_loaded_at_iso)
            playback_worker_alive = bool(getattr(playback, "_playback_worker_started", False))
            if segment is not None:
                current_segment_id = segment.segment_id
            elif self.runtime.session.segments:
                current_segment_id = self.runtime.session.segments[-1].segment_id
            else:
                current_segment_id = ""
            context: dict[str, object] = {
                "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                "app_started": True,
                "app_version_if_available": _app_version_if_available(),
                "active_workspace": str(PROJECT_ROOT),
                "python_runtime": sys.executable,
                "cuda_available": bool(cuda_status and cuda_status.torch_cuda_available),
                "cuda_core_pass": self.runtime.cuda_core_ready(),
                "asr_model_loaded": asr_loaded,
                "asr_device": self.runtime.asr_loader.device,
                "asr_compute_type": self.runtime.asr_loader.compute_type,
                "translation_model_loaded": translation_loaded,
                "tts_engine_available": bool(self.runtime.tts is not None),
                "playback_worker_alive": playback_worker_alive,
                "microphone_device_selected": self.device_combo.currentText() if hasattr(self, "device_combo") else "",
                "microphone_callback_frames_seen": int(getattr(live_thread, "frames_received", 0) if live_thread is not None else 0),
                "output_device_selected_if_available": self.output_device_combo.currentText() if hasattr(self, "output_device_combo") else "",
                "current_session_id": self.runtime.session.session_id,
                "cache_guard_active": bool(self.runtime.session.cache_root == self.runtime.config.cache_dir),
                "stale_cache_blocked": bool(self._session_reset_count > 0 or self.runtime.session.segment_count == 0),
                "active_workers": active_workers,
                "failed_workers": failed_workers,
                "last_error": self._last_worker_error or self._last_playback_error or self._last_lifecycle_error or str(getattr(live_thread, "last_error", "")),
                "engine_ready_state": self.runtime.current_status.value,
                "safe_to_start_capture": bool(
                    self.engine_startup_ready
                    and self.live_thread is None
                    and self.runtime.current_status not in {UIState.PREPARING, UIState.STREAM_CHECK}
                ),
                "safe_to_process_segments": bool(self.live_thread is not None and self.live_thread.isRunning()),
                "safe_to_play_audio": bool(playback_worker_alive or hasattr(self.runtime.replay, "playback")),
                "ui_latency_modal_working": bool(self._active_latency_dialog is None or self._ui_latency_modal_open),
                "current_segment_id": current_segment_id,
                "worker_details": worker_details,
            }
            if extra:
                context.update(extra)
            return context

        def write_engine_health_snapshot(self, reason: str = "", *, segment: TranscriptSegment | None = None) -> None:
            try:
                context = self._engine_health_context(segment=segment, extra={"reason": reason})
                payload = build_engine_health_payload(context)
                payload.setdefault(
                    "report_note",
                    "Use health_overview and issue_summary to diagnose engine health without changing runtime behavior.",
                )
                fingerprint = (
                    reason,
                    context.get("current_status", ""),
                    context.get("current_segment_id", ""),
                    tuple(context.get("active_workers", []) or []),
                    tuple(context.get("failed_workers", []) or []),
                    bool(context.get("playback_worker_alive")),
                    bool(context.get("ui_latency_modal_working")),
                )
                self._write_snapshot_if_changed("engine_health_latest.json", fingerprint, "engine_health_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write engine health snapshot.", exc)

        def write_engine_stability_audit_snapshot(self, reason: str = "", *, segment: TranscriptSegment | None = None) -> None:
            try:
                context = self._engine_health_context(segment=segment, extra={"reason": reason})
                payload = build_engine_stability_audit_payload(context)
                payload.setdefault(
                    "report_note",
                    "Use issue_summary and issue_primary_stage to diagnose stability without changing engine behavior.",
                )
                fingerprint = (
                    reason,
                    context.get("current_status", ""),
                    context.get("current_segment_id", ""),
                    tuple(context.get("active_workers", []) or []),
                    tuple(context.get("failed_workers", []) or []),
                )
                self._write_snapshot_if_changed("engine_stability_audit_latest.json", fingerprint, "engine_stability_audit_latest.json", payload)
                text_lines = [
                    f"{item.get('status', 'INFO')}: {item.get('area', 'check')} - {item.get('message', '')}"
                    for item in payload.get("checks", [])
                    if isinstance(item, dict)
                ]
                text_fingerprint = fingerprint + (tuple(text_lines),)
                cache_store = getattr(self, "_health_snapshot_cache", None)
                if cache_store is None:
                    cache_store = {}
                    try:
                        self._health_snapshot_cache = cache_store
                    except Exception:
                        pass
                cached = cache_store.get("engine_stability_audit_latest.txt")
                if cached is None or cached[0] != text_fingerprint:
                    cache_store["engine_stability_audit_latest.txt"] = (text_fingerprint, text_lines)
                    write_text_report_async("engine_stability_audit_latest.txt", text_lines)
            except Exception as exc:
                self.log_event("WARN", "Could not write engine stability audit snapshot.", exc)

        def write_worker_health_snapshot(self, reason: str = "", *, segment: TranscriptSegment | None = None) -> None:
            try:
                context = self._engine_health_context(segment=segment, extra={"reason": reason})
                payload = build_worker_health_payload(
                        {
                            **context,
                            "worker_alive": bool(self.live_thread is not None and self.live_thread.isRunning()),
                            "worker_start_time": self.start_pressed_time if self.start_pressed_time else "",
                            "active_workers": context.get("active_workers", []),
                            "failed_workers": context.get("failed_workers", []),
                            "worker_states": context.get("worker_details", {}).get("workers", []) if isinstance(context.get("worker_details"), dict) else [],
                            "queue_sizes": context.get("worker_details", {}).get("queue_sizes", {}) if isinstance(context.get("worker_details"), dict) else {},
                            "queue_oldest_item_age_ms": context.get("worker_details", {}).get("queue_oldest_item_age_ms", {}) if isinstance(context.get("worker_details"), dict) else {},
                            "stale_job_rejected_count": int(getattr(self.live_thread, "stale_callbacks_rejected_count", self._stale_callbacks_rejected) if self.live_thread is not None else self._stale_callbacks_rejected),
                            "last_exception": context.get("last_error", ""),
                            "last_job_started_time": getattr(self.live_thread, "last_job_started_time", "") if self.live_thread is not None else "",
                            "last_job_finished_time": getattr(self.live_thread, "last_job_finished_time", "") if self.live_thread is not None else self.ready_to_listen_time,
                            "last_heartbeat_time": getattr(self.live_thread, "last_heartbeat_time", "") if self.live_thread is not None else datetime.now().astimezone().isoformat(timespec="milliseconds"),
                        }
                    ),
                fingerprint = (
                    reason,
                    context.get("current_status", ""),
                    context.get("current_segment_id", ""),
                    bool(self.live_thread is not None and self.live_thread.isRunning()),
                    self.start_pressed_time if self.start_pressed_time else "",
                    self.ready_to_listen_time,
                    int(getattr(self.live_thread, "stale_callbacks_rejected_count", self._stale_callbacks_rejected) if self.live_thread is not None else self._stale_callbacks_rejected),
                    getattr(self.live_thread, "last_job_started_time", "") if self.live_thread is not None else "",
                    getattr(self.live_thread, "last_job_finished_time", "") if self.live_thread is not None else self.ready_to_listen_time,
                    getattr(self.live_thread, "last_heartbeat_time", "") if self.live_thread is not None else "",
                )
                self._write_snapshot_if_changed("worker_health_latest.json", fingerprint, "worker_health_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write worker health snapshot.", exc)

        def write_start_stop_lifecycle_snapshot(self, reason: str = "") -> None:
            try:
                active_workers, failed_workers, worker_details = self._active_worker_snapshot()
                safe_to_restart = not bool(
                    any(item.get("alive", False) for item in worker_details.get("workers", []))
                )
                payload_input = {
                    "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    "start_requested_time": self.start_pressed_time,
                    "start_ready_time": self.ready_to_listen_time,
                    "mic_frames_confirmed": int(getattr(self.live_thread, "frames_received", 0) if self.live_thread is not None else 0),
                    "stop_requested_time": self._stop_requested_time,
                    "stop_completed_time": self._stop_completed_time,
                    "stale_callbacks_rejected": int(getattr(self.live_thread, "stale_callbacks_rejected_count", 0) if self.live_thread is not None else self._stale_callbacks_rejected),
                    "workers_alive_after_stop": [item for item in worker_details.get("workers", []) if item.get("alive", False)],
                    "safe_to_restart": safe_to_restart,
                    "lifecycle_error": self._last_lifecycle_error,
                }
                payload = build_start_stop_lifecycle_payload(payload_input)
                fingerprint = (
                    reason,
                    self.start_pressed_time,
                    self.ready_to_listen_time,
                    payload_input["mic_frames_confirmed"],
                    self._stop_requested_time,
                    self._stop_completed_time,
                    payload_input["stale_callbacks_rejected"],
                    tuple(item.get("worker_id", "") for item in payload_input["workers_alive_after_stop"]),
                    safe_to_restart,
                    self._last_lifecycle_error,
                )
                self._write_snapshot_if_changed("start_stop_lifecycle_latest.json", fingerprint, "start_stop_lifecycle_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write start/stop lifecycle snapshot.", exc)

        def write_playback_health_snapshot(
            self,
            *,
            tts_requested: bool = False,
            tts_audio_ready: bool = False,
            audio_path: str = "",
            audio_valid: bool = False,
            audio_validation_error: str = "",
            playback_requested: bool = False,
            playback_queued: bool = False,
            playback_backend_started_if_available: bool = False,
            playback_failed: bool = False,
            playback_error: str = "",
            output_backend: str = "",
            output_device_name_if_available: str = "",
        ) -> None:
            try:
                playback = self.runtime.replay.playback
                payload_input = {
                    "tts_requested": tts_requested,
                    "tts_audio_ready": tts_audio_ready,
                    "audio_path": audio_path,
                    "audio_valid": audio_valid,
                    "audio_validation_error": audio_validation_error,
                    "playback_requested": playback_requested,
                    "playback_queued": playback_queued,
                    "playback_worker_alive": bool(getattr(playback, "_playback_worker_started", False)),
                    "playback_backend_started_if_available": playback_backend_started_if_available,
                    "playback_failed": playback_failed,
                    "playback_error": playback_error,
                    "output_backend": output_backend,
                    "output_device_name_if_available": output_device_name_if_available,
                }
                payload = build_playback_health_payload(payload_input)
                fingerprint = (
                    tts_requested,
                    tts_audio_ready,
                    audio_path,
                    audio_valid,
                    audio_validation_error,
                    playback_requested,
                    playback_queued,
                    bool(getattr(playback, "_playback_worker_started", False)),
                    playback_backend_started_if_available,
                    playback_failed,
                    playback_error,
                    output_backend,
                    output_device_name_if_available,
                )
                payload.setdefault(
                    "report_note",
                    "Use health_overview, playback_failure_stage, and issue_summary to diagnose playback without changing engine behavior.",
                )
                self._write_snapshot_if_changed("playback_health_latest.json", fingerprint, "playback_health_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write playback health snapshot.", exc)

        def write_cache_session_guard_snapshot(self, reason: str = "", *, segment: TranscriptSegment | None = None) -> None:
            try:
                stale_segment = bool(segment is not None and segment.session_id != self.runtime.session.session_id)
                context = {
                    **self._engine_health_context(segment=segment, extra={"reason": reason}),
                    "live_input_source": self.device_combo.currentText() if hasattr(self, "device_combo") else "",
                    "sample_wav_used_for_live_input": False,
                    "replay_simulation_used_for_live_input": False,
                    "stale_audio_rejected": stale_segment,
                    "stale_context_reset": bool(self._session_reset_count > 0),
                    "stale_latency_payload_rejected": stale_segment or bool(self._session_reset_count > 0),
                    "stale_tts_cache_rejected": bool(self.pending_tts_jobs or self.pending_tts_segment_id),
                    "previous_session_state_cleared": bool(self._session_reset_count > 0),
                }
                payload = build_cache_session_guard_payload(context)
                fingerprint = (
                    context.get("reason", ""),
                    context.get("current_status", ""),
                    context.get("current_segment_id", ""),
                    context.get("live_input_source", ""),
                    context.get("stale_audio_rejected", False),
                    context.get("stale_context_reset", False),
                    context.get("stale_latency_payload_rejected", False),
                    context.get("stale_tts_cache_rejected", False),
                    context.get("previous_session_state_cleared", False),
                    bool(self.pending_tts_jobs),
                    self.pending_tts_segment_id or "",
                )
                self._write_snapshot_if_changed("cache_session_guard_latest.json", fingerprint, "cache_session_guard_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write cache/session guard snapshot.", exc)

        def write_short_path_guard_snapshot(self, segment: TranscriptSegment, reason: str = "") -> None:
            try:
                speech_duration_ms = int(max(0, segment.latency.speech_duration_ms))
                short_path_used = speech_duration_ms <= 2000
                payload_input = {
                    "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    "segment_id": segment.segment_id,
                    "utterance_type": "short" if short_path_used else "long",
                    "short_path_used": short_path_used,
                    "long_streaming_logic_skipped": short_path_used,
                    "stable_chunk_logic_skipped": short_path_used,
                    "final_tts_once": bool(segment.translated_audio_path),
                    "duplicate_segment_created": False,
                    "duplicate_tts_request": bool(self.tts_worker is not None and self.tts_worker.isRunning()),
                    "notes": reason,
                }
                payload = build_short_path_guard_payload(payload_input)
                fingerprint = (
                    payload_input["segment_id"],
                    payload_input["utterance_type"],
                    payload_input["short_path_used"],
                    payload_input["long_streaming_logic_skipped"],
                    payload_input["stable_chunk_logic_skipped"],
                    payload_input["final_tts_once"],
                    payload_input["duplicate_segment_created"],
                    payload_input["duplicate_tts_request"],
                    payload_input["notes"],
                )
                self._write_snapshot_if_changed("short_path_guard_latest.json", fingerprint, "short_path_guard_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write short path guard snapshot.", exc)

        def write_long_turn_safety_snapshot(self, segment: TranscriptSegment, reason: str = "") -> None:
            try:
                payload_input = {
                    "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    "segment_id": segment.segment_id,
                    "full_turn_audio_buffer_exists": bool(segment.latency.speech_duration_ms > 2000),
                    "full_turn_audio_duration_ms": int(max(0, segment.latency.speech_duration_ms)),
                    "stable_chunk_count": 0,
                    "final_used_full_turn_audio": bool(segment.latency.speech_duration_ms > 2000),
                    "final_used_tail_only": False,
                    "audio_loss_suspected": False,
                    "card_reused_for_turn": False,
                    "duplicate_chunk_detected": False,
                }
                payload = build_long_turn_safety_payload(payload_input)
                fingerprint = (
                    payload_input["segment_id"],
                    payload_input["full_turn_audio_buffer_exists"],
                    payload_input["full_turn_audio_duration_ms"],
                    payload_input["stable_chunk_count"],
                    payload_input["final_used_full_turn_audio"],
                    payload_input["final_used_tail_only"],
                    payload_input["audio_loss_suspected"],
                    payload_input["card_reused_for_turn"],
                    payload_input["duplicate_chunk_detected"],
                )
                self._write_snapshot_if_changed("long_turn_safety_latest.json", fingerprint, "long_turn_safety_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write long turn safety snapshot.", exc)

        def write_ui_interaction_health_snapshot(
            self,
            segment: TranscriptSegment | None,
            *,
            latency_badge_clicked: bool = False,
            modal_opened: bool = False,
            modal_error: str = "",
        ) -> None:
            try:
                payload_input = {
                    "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    "latency_badge_clicked": latency_badge_clicked,
                    "segment_id": segment.segment_id if segment is not None else "",
                    "latency_payload_available": bool(segment is not None),
                    "modal_opened": modal_opened,
                    "modal_error": modal_error,
                    "simplified_latency_ui_active": True,
                }
                payload = build_ui_interaction_health_payload(payload_input)
                fingerprint = (
                    latency_badge_clicked,
                    segment.segment_id if segment is not None else "",
                    bool(segment is not None),
                    modal_opened,
                    modal_error,
                )
                self._write_snapshot_if_changed("ui_interaction_health_latest.json", fingerprint, "ui_interaction_health_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write UI interaction health snapshot.", exc)

        def write_error_health_snapshot(self, *, segment: TranscriptSegment | None = None, error_message: str = "") -> None:
            try:
                playback = self.runtime.replay.playback
                live_thread = self.live_thread
                payload_input = {
                    "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    "missing_microphone": "microphone" in error_message.lower() and "missing" in error_message.lower(),
                    "invalid_mic_device": "invalid" in error_message.lower() and "device" in error_message.lower(),
                    "no_mic_callback_frames": bool(getattr(live_thread, "callback_count", 0) <= 0) if live_thread is not None else False,
                    "cuda_unavailable": not self.runtime.cuda_core_ready(),
                    "asr_model_missing": bool("asr" in error_message.lower() and "missing" in error_message.lower()),
                    "translation_model_missing": bool("translation" in error_message.lower() and "missing" in error_message.lower()),
                    "tts_unavailable": bool("tts" in error_message.lower() and ("unavailable" in error_message.lower() or "failed" in error_message.lower())),
                    "playback_worker_dead": not bool(getattr(playback, "_playback_worker_started", False)),
                    "audio_file_invalid": bool("audio" in error_message.lower() and ("invalid" in error_message.lower() or "missing" in error_message.lower())),
                    "queue_blocked": bool("queue" in error_message.lower() or "blocked" in error_message.lower()),
                    "worker_exception": error_message,
                    "suspected_hallucination": False,
                    "silence_only_audio": False,
                    "last_error": error_message,
                }
                payload = build_error_health_payload(payload_input)
                fingerprint = (
                    payload_input["missing_microphone"],
                    payload_input["invalid_mic_device"],
                    payload_input["no_mic_callback_frames"],
                    payload_input["cuda_unavailable"],
                    payload_input["asr_model_missing"],
                    payload_input["translation_model_missing"],
                    payload_input["tts_unavailable"],
                    payload_input["playback_worker_dead"],
                    payload_input["audio_file_invalid"],
                    payload_input["queue_blocked"],
                    payload_input["worker_exception"],
                    payload_input["last_error"],
                )
                self._write_snapshot_if_changed("error_health_latest.json", fingerprint, "error_health_latest.json", payload)
            except Exception as exc:
                self.log_event("WARN", "Could not write error health snapshot.", exc)

        def build_sidebar(self) -> QFrame:
            sidebar = QFrame()
            sidebar.setObjectName("sidebar")
            sidebar.setFixedWidth(300)
            self.main_sidebar_width = 300
            self.main_sidebar = sidebar
            layout = QVBoxLayout(sidebar)
            layout.setContentsMargins(18, 20, 18, 18)
            layout.setSpacing(12)

            brand_row = QHBoxLayout()
            mark = QLabel("TI")
            mark.setObjectName("brandMark")
            title = QLabel("TranslateIT")
            title.setObjectName("brandTitle")
            brand_row.addWidget(mark)
            brand_row.addWidget(title)
            brand_row.addStretch(1)
            layout.addLayout(brand_row)

            projects = QLabel("PROJECTS")
            projects.setObjectName("sectionLabel")
            layout.addWidget(projects)

            session_box = QFrame()
            session_box.setObjectName("panel")
            session_layout = QVBoxLayout(session_box)
            session_layout.setContentsMargins(10, 10, 10, 10)
            session_layout.setSpacing(6)
            active = QPushButton("Unsaved Session")
            active.setObjectName("sidebarItem")
            active.setProperty("active", "true")
            self.sidebar_session_label = QLabel(self.runtime.session.session_id)
            self.sidebar_session_label.setObjectName("mutedText")
            session_layout.addWidget(active)
            session_layout.addWidget(self.sidebar_session_label)
            saved = QLabel("Saved Sessions")
            saved.setObjectName("mutedText")
            bench = QLabel("Benchmark Reports")
            bench.setObjectName("mutedText")
            session_layout.addWidget(saved)
            session_layout.addWidget(bench)
            layout.addWidget(session_box)
            layout.addStretch(1)

            diagnostics_button = QPushButton("Settings")
            diagnostics_button.setObjectName("sidebarItem")
            diagnostics_button.clicked.connect(self.show_menu_dialog)
            layout.addWidget(diagnostics_button)
            return sidebar

        def build_workspace(self) -> QFrame:
            workspace = QFrame()
            workspace.setObjectName("workspace")
            layout = QVBoxLayout(workspace)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(0)

            header = QFrame()
            header.setObjectName("topHeader")
            self.main_header = header
            header_layout = QHBoxLayout(header)
            header_layout.setContentsMargins(20, 18, 20, 18)
            header_layout.setSpacing(12)
            title_stack = QVBoxLayout()
            self.page_title_label = QLabel("Unsaved Session")
            self.page_title_label.setObjectName("pageTitle")
            self.session_update_badge = self.make_badge("Updated", "ready")
            title_stack.addWidget(self.page_title_label)
            title_stack.addWidget(self.session_update_badge, 0)
            header_layout.addLayout(title_stack, 1)

            self.runtime_badge = self.make_badge("Status: Ready", "ready")
            header_layout.addWidget(self.runtime_badge)
            self.menu_button = QPushButton("Menu")
            self.menu_button.setObjectName("menuButton")
            self.start_button = QPushButton("Start")
            self.start_button.setObjectName("primaryButton")
            self.stop_button = QPushButton("Stop")
            self.stop_button.setObjectName("dangerButton")
            self.stop_button.setVisible(False)
            self.stop_button.setEnabled(False)
            header_layout.addWidget(self.menu_button)
            header_layout.addWidget(self.start_button)
            layout.addWidget(header)

            self.workspace_stack = QStackedWidget()
            self.workspace_stack.setObjectName("workspaceStack")
            self.workspace_stack.setStyleSheet("background: transparent; border: none;")

            transcript_page = QFrame()
            transcript_page.setObjectName("workspace")
            transcript_layout = QVBoxLayout(transcript_page)
            transcript_layout.setContentsMargins(20, 20, 20, 20)
            transcript_layout.setSpacing(16)
            transcript_layout.addWidget(self.build_transcript_panel(), 1)
            self.workspace_stack.addWidget(transcript_page)

            settings_page = self.build_settings_page()
            self.workspace_stack.addWidget(settings_page)

            layout.addWidget(self.workspace_stack, 1)
            return workspace

        def build_settings_page(self) -> QFrame:
            page = QFrame()
            page.setObjectName("workspace")
            layout = QVBoxLayout(page)
            layout.setContentsMargins(12, 12, 12, 12)
            layout.setSpacing(0)

            shell = QFrame()
            shell.setObjectName("settingsShell")
            shell_layout = QHBoxLayout(shell)
            shell_layout.setContentsMargins(8, 8, 8, 8)
            shell_layout.setSpacing(0)

            sidebar = QFrame()
            sidebar.setObjectName("settingsSidebar")
            sidebar.setFixedWidth(176)
            sidebar_layout = QVBoxLayout(sidebar)
            sidebar_layout.setContentsMargins(6, 8, 6, 6)
            sidebar_layout.setSpacing(3)

            nav_box = QFrame()
            nav_box.setObjectName("settingsPanel")
            nav_layout = QVBoxLayout(nav_box)
            nav_layout.setContentsMargins(7, 7, 7, 7)
            nav_layout.setSpacing(3)

            title_row = QHBoxLayout()
            mark = QLabel("TI")
            mark.setObjectName("brandMark")
            brand = QLabel("TranslateIT")
            brand.setObjectName("brandTitle")
            title_row.addWidget(mark)
            title_row.addWidget(brand)
            title_row.addStretch(1)
            nav_layout.addLayout(title_row)

            subtitle = QLabel("Settings")
            subtitle.setObjectName("sectionLabel")
            nav_layout.addWidget(subtitle)

            self.menu_nav_buttons = {}
            self.menu_pages = {}
            self.menu_stack = QStackedWidget()
            self.menu_stack.setStyleSheet("background: transparent; border: none;")

            self.capture_mode_combo = QComboBox()
            self.capture_mode_combo.addItems(CAPTURE_MODES)
            self.capture_mode_combo.setCurrentText(CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION)
            self.capture_mode_combo.setVisible(False)

            page_specs = [
                ("audio", "Audio", self.build_microphone_panel()),
                ("translate", "Translate", self.build_translate_page()),
                ("diagnostics", "Diagnostics & Logs", self.build_diagnostics_logs_page()),
            ]
            for key, label, inner_page in page_specs:
                scroll = QScrollArea()
                scroll.setWidgetResizable(True)
                scroll.setFrameShape(QFrame.Shape.NoFrame)
                scroll.setObjectName("settingsPage")
                scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
                scroll.setWidget(inner_page)
                self.menu_pages[key] = scroll
                self.menu_stack.addWidget(scroll)
                button = QPushButton(label)
                button.setObjectName("settingsSidebarItem")
                button.setCheckable(True)
                button.clicked.connect(lambda _checked=False, page_key=key: self.set_menu_page(page_key))
                self.menu_nav_buttons[key] = button
                nav_layout.addWidget(button)

            back_button = QPushButton("Back")
            back_button.setObjectName("menuButton")
            back_button.clicked.connect(self.show_transcript_page)
            nav_layout.addStretch(1)
            nav_layout.addWidget(back_button)
            sidebar_layout.addWidget(nav_box)
            sidebar_layout.addStretch(1)

            content = QFrame()
            content.setObjectName("settingsContent")
            content_layout = QHBoxLayout(content)
            content_layout.setContentsMargins(10, 10, 10, 10)
            content_layout.setSpacing(0)

            body = QFrame()
            body.setObjectName("settingsBody")
            body.setMaximumWidth(1200)
            body_layout = QVBoxLayout(body)
            body_layout.setContentsMargins(20, 18, 20, 18)
            body_layout.setSpacing(12)

            page_header = QFrame()
            page_header.setObjectName("settingsPanel")
            page_header_layout = QVBoxLayout(page_header)
            page_header_layout.setContentsMargins(18, 16, 18, 16)
            page_header_layout.setSpacing(4)
            self.settings_page_title_label = QLabel("Audio")
            self.settings_page_title_label.setObjectName("panelTitle")
            self.settings_page_desc_label = QLabel("Choose the microphone and speaker TranslateIT should use. Advanced options stay automatic in the background.")
            self.settings_page_desc_label.setObjectName("mutedText")
            self.settings_page_desc_label.setWordWrap(True)
            page_header_layout.addWidget(self.settings_page_title_label)
            page_header_layout.addWidget(self.settings_page_desc_label)

            self.settings_page_descriptions = {
                "audio": ("Audio", "Choose the microphone and speaker TranslateIT should use. Advanced options stay automatic in the background."),
                "translate": ("Translate", "Choose the voice actor used for translation output."),
                "diagnostics": ("Diagnostics & Logs", "Review health overview, logs, and rejected segments in one place."),
            }

            body_layout.addWidget(page_header)
            page_surface = QFrame()
            page_surface.setObjectName("settingsSurface")
            page_surface_layout = QVBoxLayout(page_surface)
            page_surface_layout.setContentsMargins(16, 16, 16, 16)
            page_surface_layout.setSpacing(12)
            page_surface_layout.addWidget(self.menu_stack, 1)
            body_layout.addWidget(page_surface, 1)

            content_layout.addWidget(body, 1)

            shell_layout.addWidget(sidebar)
            shell_layout.addWidget(content, 1)
            layout.addWidget(shell, 1)
            self.set_menu_page("audio")
            return page

        def build_status_panel(self) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSection")
            layout = QGridLayout(box)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(10)
            self.status_labels: dict[str, QLabel] = {}
            rows = [
                ("runtime", "Runtime"),
                ("python", "Python"),
                ("cuda", "CUDA"),
                ("asr", "ASR"),
                ("translation", "Translate"),
                ("voice", "Voice"),
                ("mic", "Mic"),
                ("capture", "Capture"),
                ("replay", "Replay"),
                ("worker", "Worker"),
                ("stream", "Stream"),
                ("callbacks", "Callbacks"),
                ("frames", "Frames"),
                ("last_frame", "Last frame"),
                ("last_error", "Last error"),
                ("session", "Session"),
                ("privacy", "Privacy"),
                ("Benchmark", "Benchmark"),
            ]
            for row, (key, title) in enumerate(rows):
                layout.addWidget(QLabel(title), row, 0)
                value = QLabel("Pending")
                value.setWordWrap(True)
                self.status_labels[key] = value
                layout.addWidget(value, row, 1)
            self.status_label_aliases = {
                "Runtime status": "runtime",
                "Python runtime": "python",
                "CUDA Core App status": "cuda",
                "ASR model": "asr",
                "Translation model": "translation",
                "Voice actor": "voice",
                "Microphone status": "mic",
                "Capture status": "capture",
                "Replay status": "replay",
                "Capture worker state": "worker",
                "Stream active": "stream",
                "Callback count": "callbacks",
                "Frames received": "frames",
                "Last audio frame time": "last_frame",
                "Last error": "last_error",
                "Session status": "session",
                "Privacy/local-only": "privacy",
                "benchmark": "Benchmark",
            }
            for alias_key, canonical_key in self.status_label_aliases.items():
                widget = self.status_labels.get(canonical_key)
                if widget is not None:
                    self.status_labels[alias_key] = widget
            summary_note = QLabel("This is the live engine snapshot used for quick troubleshooting and recovery actions.")
            summary_note.setObjectName("mutedText")
            summary_note.setWordWrap(True)
            layout.addWidget(summary_note, len(rows), 0, 1, 2)
            self.refresh_cuda_button = QPushButton("Refresh CUDA Status")
            self.run_cuda_validation_button = QPushButton("Run CUDA Validation")
            self.open_cuda_guide_button = QPushButton("Open CUDA Setup Guide")
            self.enable_degraded_button = QPushButton("Enable Degraded CPU Mode")
            self.diagnostic_button = QPushButton("Run Microphone Diagnostic")
            self.calibration_button = QPushButton("Run Calibration")
            self.calibration_button.setVisible(False)
            self.calibration_result_label = QLabel("Calibration result: not run")
            self.calibration_result_label.setWordWrap(True)
            button_row = QHBoxLayout()
            button_row.addWidget(self.refresh_cuda_button)
            button_row.addWidget(self.run_cuda_validation_button)
            button_row.addWidget(self.open_cuda_guide_button)
            button_row.addWidget(self.enable_degraded_button)
            button_row.addWidget(self.diagnostic_button)
            layout.addLayout(button_row, len(rows) + 1, 0, 1, 2)
            layout.addWidget(self.calibration_result_label, len(rows) + 2, 0, 1, 2)
            return box

        def build_microphone_panel(self) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSection")
            layout = QVBoxLayout(box)
            layout.setContentsMargins(20, 18, 20, 18)
            layout.setSpacing(14)
            layout.setAlignment(Qt.AlignmentFlag.AlignTop)
            input_title = QLabel("Input Device")
            input_title.setObjectName("sectionLabel")
            self.device_combo = QComboBox()
            self.device_combo.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            output_title = QLabel("Output Device")
            output_title.setObjectName("sectionLabel")
            self.output_device_combo = QComboBox()
            self.output_device_combo.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            self.test_output_button = QPushButton("Test Output")
            self.output_status_label = QLabel("Output uses Windows default playback when direct device targeting is unavailable.")
            self.output_status_label.setObjectName("mutedText")
            self.output_status_label.setWordWrap(True)
            self.selected_device_label = QLabel("Selected input: none")
            self.selected_device_label.setWordWrap(True)
            self.selected_device_label.setObjectName("mutedText")
            self.refresh_devices_button = QPushButton("Refresh devices")
            self.level_bar = QProgressBar()
            self.level_bar.setRange(0, 100)
            self.level_state_label = QLabel("Mic level: idle")
            self.level_state_label.setObjectName("mutedText")
            self.level_state_label.setWordWrap(True)

            self.advanced_devices_toggle = QCheckBox("Show Advanced Devices")
            self.advanced_devices_toggle.setChecked(self.runtime.audio_settings.show_advanced_devices)
            self.advanced_devices_toggle.setVisible(False)
            self.use_anyway_toggle = QCheckBox("Use this microphone anyway if input is low but usable")
            self.use_anyway_toggle.setChecked(self.runtime.audio_settings.allow_low_but_usable_input)
            self.use_anyway_toggle.setVisible(False)
            self.auto_play_out_voice_toggle = QCheckBox("Auto-play translation voice after translation")
            self.auto_play_out_voice_toggle.setChecked(self.runtime.audio_settings.auto_play_out_voice)
            self.auto_play_out_voice_toggle.setVisible(False)

            grid = QGridLayout()
            grid.setHorizontalSpacing(16)
            grid.setVerticalSpacing(16)
            grid.setAlignment(Qt.AlignmentFlag.AlignTop)
            grid.setColumnStretch(0, 1)
            grid.setColumnStretch(1, 1)

            input_card = QFrame()
            input_card.setObjectName("settingsSurface")
            input_layout = QVBoxLayout(input_card)
            input_layout.setContentsMargins(18, 16, 18, 16)
            input_layout.setSpacing(10)
            input_layout.addWidget(input_title)
            input_layout.addWidget(self.device_combo)
            input_layout.addWidget(self.selected_device_label)

            output_card = QFrame()
            output_card.setObjectName("settingsSurface")
            output_layout = QVBoxLayout(output_card)
            output_layout.setContentsMargins(18, 16, 18, 16)
            output_layout.setSpacing(10)
            output_layout.addWidget(output_title)
            output_layout.addWidget(self.output_device_combo)
            output_layout.addWidget(self.output_status_label)
            button_row = QHBoxLayout()
            button_row.addWidget(self.test_output_button)
            button_row.addWidget(self.refresh_devices_button)
            output_layout.addLayout(button_row)

            meter_card = QFrame()
            meter_card.setObjectName("settingsSurface")
            meter_layout = QVBoxLayout(meter_card)
            meter_layout.setContentsMargins(18, 16, 18, 16)
            meter_layout.setSpacing(10)
            meter_layout.addWidget(QLabel("Microphone activity"))
            meter_layout.addWidget(self.level_bar)
            meter_layout.addWidget(self.level_state_label)

            footer_note = QLabel("Microphone fallback and playback behavior are handled automatically.")
            footer_note.setObjectName("mutedText")
            footer_note.setWordWrap(True)
            meter_layout.addWidget(footer_note)

            grid.addWidget(input_card, 0, 0)
            grid.addWidget(output_card, 0, 1)
            grid.addWidget(meter_card, 1, 0, 1, 2)
            layout.addLayout(grid)
            return box

        def build_translate_page(self) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSection")
            layout = QVBoxLayout(box)
            layout.setContentsMargins(20, 18, 20, 18)
            layout.setSpacing(14)
            layout.setAlignment(Qt.AlignmentFlag.AlignTop)
            section_title = QLabel("Translation Voice Actor")
            section_title.setObjectName("sectionLabel")

            self.voice_actor_toggle = QCheckBox("Use custom voice for translation")
            self.voice_actor_toggle.setChecked(self.runtime.audio_settings.use_custom_voice_actor)
            self.voice_actor_toggle.setVisible(False)

            self.voice_actor_profiles_root_edit = QLineEdit(self.runtime.audio_settings.voice_actor_profiles_root)
            self.voice_actor_profiles_root_edit.setVisible(False)

            self.voice_actor_profiles_combo = QComboBox()
            self.voice_actor_profiles_combo.setEditable(False)
            self.voice_actor_profiles_combo.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            self.voice_actor_profiles_combo.setPlaceholderText("No voice actors found.")

            self.voice_actor_profile_hint = QLabel("Pick a voice actor for translation output. Refresh the list after adding or removing profiles.")
            self.voice_actor_profile_hint.setObjectName("mutedText")
            self.voice_actor_profile_hint.setWordWrap(True)

            self.refresh_voice_profiles_button = QPushButton("Refresh Voice Actors")
            self.voice_actor_empty_label = QLabel("No voice actors found.")
            self.voice_actor_empty_label.setObjectName("emptyState")
            self.voice_actor_empty_label.setWordWrap(True)
            self.voice_actor_empty_label.setVisible(False)

            self.update_voice_actor_controls_enabled(self.runtime.audio_settings.use_custom_voice_actor)

            card = QFrame()
            card.setObjectName("settingsSurface")
            card_layout = QVBoxLayout(card)
            card_layout.setContentsMargins(18, 16, 18, 16)
            card_layout.setSpacing(10)
            card_layout.addWidget(section_title)
            card_layout.addWidget(self.voice_actor_profiles_combo)
            card_layout.addWidget(self.voice_actor_empty_label)
            card_layout.addWidget(self.voice_actor_profile_hint)
            card_layout.addWidget(self.refresh_voice_profiles_button)

            layout.addWidget(card)
            layout.addStretch(1)
            return box

        def update_voice_actor_controls_enabled(self, enabled: bool) -> None:
            combo = getattr(self, "voice_actor_profiles_combo", None)
            refresh = getattr(self, "refresh_voice_profiles_button", None)
            hint = getattr(self, "voice_actor_profile_hint", None)
            empty = getattr(self, "voice_actor_empty_label", None)
            if combo is not None:
                combo.setEnabled(bool(enabled))
            if refresh is not None:
                refresh.setEnabled(True)
            if hint is not None:
                hint.setText(
                    "Select a voice actor for translation output."
                    if enabled
                    else "Pick a voice actor to enable the translation voice."
                )
            if empty is not None:
                empty.setVisible(not enabled)

        def build_transcript_panel(self) -> QFrame:
            box = QFrame()
            box.setObjectName("transcriptPanel")
            layout = QVBoxLayout(box)
            layout.setContentsMargins(16, 16, 16, 16)
            layout.setSpacing(14)
            header = QHBoxLayout()
            title = QLabel("Transcript")
            title.setObjectName("panelTitle")
            self.benchmark_label = QLabel("Last latency unavailable")
            self.benchmark_label.setObjectName("mutedText")
            self.benchmark_label.setWordWrap(True)
            header.addWidget(title)
            header.addStretch(1)
            header.addWidget(self.benchmark_label)
            self.transcript_area = QScrollArea()
            self.transcript_area.setWidgetResizable(True)
            self.transcript_host = QWidget()
            self.transcript_host.setObjectName("workspace")
            self.transcript_host.setStyleSheet("background: #0E1420;")
            self.transcript_layout = QVBoxLayout(self.transcript_host)
            self.transcript_layout.setContentsMargins(8, 8, 8, 8)
            self.transcript_layout.setSpacing(14)
            self.empty_state_label = QLabel("Ready to translate. Press Start and speak Indonesian or English.")
            self.empty_state_label.setObjectName("emptyState")
            self.empty_state_label.setWordWrap(True)
            session_header = QFrame()
            session_header.setObjectName("sessionHeader")
            session_layout = QHBoxLayout(session_header)
            session_layout.setContentsMargins(14, 10, 14, 10)
            session_title = QLabel("Current Session")
            session_title.setObjectName("sectionLabel")
            self.session_meta_label = QLabel(self.runtime.session.session_id)
            self.session_meta_label.setObjectName("mutedText")
            session_layout.addWidget(session_title)
            session_layout.addWidget(self.session_meta_label)
            session_layout.addStretch(1)
            self.transcript_layout.addWidget(session_header)
            self.transcript_layout.addWidget(self.empty_state_label)
            self.transcript_layout.addStretch(1)
            self.transcript_area.setWidget(self.transcript_host)
            layout.addLayout(header)
            layout.addWidget(self.transcript_area, 1)
            return box

        def build_log_panel(self) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSurface")
            layout = QVBoxLayout(box)
            layout.setContentsMargins(18, 16, 18, 16)
            layout.setSpacing(10)
            layout.setAlignment(Qt.AlignmentFlag.AlignTop)
            title = QLabel("Logs & Events")
            title.setObjectName("panelTitle")
            help_text = QLabel("Review recent launcher events and rejected segments. Expand the section only when you need raw detail.")
            help_text.setObjectName("mutedText")
            help_text.setWordWrap(True)
            self.log_text = QTextEdit()
            self.log_text.setReadOnly(True)
            self.log_text.setMinimumHeight(220)
            self.rejected_text = QTextEdit()
            self.rejected_text.setReadOnly(True)
            self.rejected_text.setMinimumHeight(220)
            layout.addWidget(title)
            layout.addWidget(help_text)
            layout.addWidget(self.log_text, 1)
            layout.addWidget(QLabel("Rejected segments / warnings"))
            layout.addWidget(self.rejected_text, 1)
            return box

        def build_diagnostics_summary_panel(self) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSurface")
            layout = QVBoxLayout(box)
            layout.setContentsMargins(20, 18, 20, 18)
            layout.setSpacing(12)
            layout.setAlignment(Qt.AlignmentFlag.AlignTop)
            title = QLabel("Health Overview")
            title.setObjectName("panelTitle")
            help_text = QLabel("A quick health overview is shown first. Open the details below only when you need deeper troubleshooting.")
            help_text.setObjectName("mutedText")
            help_text.setWordWrap(True)
            layout.addWidget(title)
            layout.addWidget(help_text)

            grid = QGridLayout()
            grid.setHorizontalSpacing(18)
            grid.setVerticalSpacing(12)
            grid.setColumnStretch(1, 1)
            grid.setColumnStretch(3, 1)
            summary_rows = [
                ("runtime", "Runtime"),
                ("python", "Python"),
                ("cuda", "CUDA/GPU"),
                ("asr", "ASR"),
                ("translation", "Translate"),
                ("voice", "Voice"),
                ("mic", "Microphone"),
                ("capture", "Capture"),
                ("privacy", "Privacy"),
            ]
            self.diagnostics_summary_labels: dict[str, QLabel] = {}
            for row, (key, label_text) in enumerate(summary_rows):
                column_group = 0 if row % 2 == 0 else 2
                row_index = row // 2
                label = QLabel(label_text)
                label.setObjectName("mutedText")
                value = QLabel("Unavailable")
                value.setObjectName("badge")
                value.setProperty("statusState", "warning")
                value.setMinimumWidth(120)
                value.setMinimumHeight(30)
                grid.addWidget(label, row_index, column_group)
                grid.addWidget(value, row_index, column_group + 1)
                self.diagnostics_summary_labels[key] = value
            layout.addLayout(grid)
            self.diagnostics_summary_note = QLabel("These labels reflect the live engine state and stay safe to read while TranslateIT is running.")
            self.diagnostics_summary_note.setObjectName("mutedText")
            self.diagnostics_summary_note.setWordWrap(True)
            layout.addWidget(self.diagnostics_summary_note)
            return box

        def _wrap_collapsible_panel(self, title: str, description: str, content: QWidget, *, expanded: bool = False) -> QFrame:
            box = QFrame()
            box.setObjectName("settingsSurface")
            outer = QVBoxLayout(box)
            outer.setContentsMargins(20, 18, 20, 18)
            outer.setSpacing(10)

            header = QHBoxLayout()
            header.setSpacing(12)
            toggle = QToolButton()
            toggle.setCheckable(True)
            toggle.setChecked(expanded)
            toggle.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)
            toggle.setArrowType(Qt.ArrowType.DownArrow if expanded else Qt.ArrowType.RightArrow)
            toggle.setText(title)
            toggle.setCursor(Qt.CursorShape.PointingHandCursor)
            toggle.setObjectName("sectionLabel")

            desc_label = QLabel(description)
            desc_label.setWordWrap(True)
            desc_label.setObjectName("mutedText")
            title_box = QVBoxLayout()
            title_box.addWidget(toggle)
            title_box.addWidget(desc_label)
            header.addLayout(title_box)
            header.addStretch(1)
            outer.addLayout(header)

            content.setVisible(expanded)
            outer.addWidget(content)

            def _toggle() -> None:
                state = toggle.isChecked()
                toggle.setArrowType(Qt.ArrowType.DownArrow if state else Qt.ArrowType.RightArrow)
                content.setVisible(state)

            toggle.clicked.connect(_toggle)
            return box

        def build_diagnostics_logs_page(self) -> QFrame:
            page = QFrame()
            page.setObjectName("settingsPage")
            layout = QVBoxLayout(page)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(14)
            layout.setAlignment(Qt.AlignmentFlag.AlignTop)
            layout.addWidget(self.build_diagnostics_summary_panel())

            advanced_panel = self.build_status_panel()
            advanced_wrapper = self._wrap_collapsible_panel(
                "Advanced diagnostics",
                "Use this section for technical status details and CUDA recovery actions.",
                advanced_panel,
                expanded=False,
            )
            layout.addWidget(advanced_wrapper)

            log_panel = self.build_log_panel()
            log_wrapper = self._wrap_collapsible_panel(
                "Logs and rejected segments",
                "Use this section when you need raw event logs or rejected segment details.",
                log_panel,
                expanded=False,
            )
            layout.addWidget(log_wrapper)
            return page

        def set_menu_page(self, page_key: str) -> None:
            stack = getattr(self, "menu_stack", None)
            pages = getattr(self, "menu_pages", {})
            buttons = getattr(self, "menu_nav_buttons", {})
            page = pages.get(page_key)
            if stack is not None and page is not None:
                stack.setCurrentWidget(page)
            header_map = getattr(self, "settings_page_descriptions", {})
            title_label = getattr(self, "settings_page_title_label", None)
            desc_label = getattr(self, "settings_page_desc_label", None)
            page_header = header_map.get(page_key)
            if page_header is not None:
                title_text, desc_text = page_header
                if title_label is not None:
                    title_label.setText(title_text)
                if desc_label is not None:
                    desc_label.setText(desc_text)
            for key, button in buttons.items():
                active = key == page_key
                button.setProperty("active", "true" if active else "false")
                button.style().unpolish(button)
                button.style().polish(button)

        def show_menu_dialog(self) -> None:
            self.set_workspace_page("settings")

        def show_transcript_page(self) -> None:
            self.set_workspace_page("transcript")

        def set_workspace_page(self, page_key: str) -> None:
            stack = getattr(self, "workspace_stack", None)
            if not isinstance(stack, QStackedWidget):
                return
            sidebar = getattr(self, "main_sidebar", None)
            header = getattr(self, "main_header", None)
            if page_key == "settings":
                stack.setCurrentIndex(1)
                self.set_menu_page("audio")
                self.menu_button.setText("Back")
                if sidebar is not None:
                    sidebar.setVisible(False)
                    sidebar.setMaximumWidth(0)
                if header is not None:
                    header.setVisible(False)
            else:
                stack.setCurrentIndex(0)
                self.menu_button.setText("Menu")
                if sidebar is not None:
                    sidebar.setVisible(True)
                    sidebar.setMaximumWidth(getattr(self, "main_sidebar_width", 300))
                if header is not None:
                    header.setVisible(True)

        def connect_actions(self) -> None:
            self.refresh_devices_button.clicked.connect(self.populate_microphones)
            self.device_combo.currentIndexChanged.connect(self.handle_device_changed)
            self.output_device_combo.currentIndexChanged.connect(self.handle_output_device_changed)
            self.advanced_devices_toggle.toggled.connect(self.handle_advanced_devices_changed)
            self.use_anyway_toggle.toggled.connect(self.handle_use_anyway_changed)
            self.auto_play_out_voice_toggle.toggled.connect(self.handle_auto_play_out_voice_changed)
            self.voice_actor_toggle.toggled.connect(self.handle_voice_actor_toggle_changed)
            self.voice_actor_profiles_root_edit.editingFinished.connect(self.handle_voice_actor_profiles_root_changed)
            self.voice_actor_profiles_combo.currentTextChanged.connect(self.handle_voice_actor_profile_changed)
            self.refresh_voice_profiles_button.clicked.connect(self.handle_refresh_voice_profiles)
            self.test_output_button.clicked.connect(self.handle_test_output)
            self.menu_button.clicked.connect(self.show_menu_dialog)
            self.diagnostic_button.clicked.connect(self.handle_run_diagnostic)
            self.calibration_button.clicked.connect(self.handle_run_diagnostic)
            self.start_button.clicked.connect(self.handle_primary_start_stop)
            self.stop_button.clicked.connect(self.handle_stop_capture)
            self.refresh_cuda_button.clicked.connect(self.handle_refresh_cuda_status)
            self.run_cuda_validation_button.clicked.connect(self.handle_run_cuda_validation)
            self.open_cuda_guide_button.clicked.connect(self.handle_open_cuda_guide)
            self.enable_degraded_button.clicked.connect(self.handle_enable_degraded_cpu_mode)

        def log_event(self, level: str, message: str, details: object | None = None) -> None:
            text = f"{level}: {message}" if details is None else f"{level}: {message} | {details}"
            self.log_text.append(text)
            self.runtime.log_event(level, message, details)

        def log_rejected(self, message: str) -> None:
            self.rejected_text.append(message)
            self.runtime.log_event("WARN", message)

        def selected_device_id(self) -> int | None:
            data = self.device_combo.currentData()
            return int(data) if data is not None else None

        def selected_output_device_id(self) -> int | None:
            data = self.output_device_combo.currentData()
            return int(data) if data is not None else None

        def selected_capture_mode(self) -> str:
            data = self.capture_mode_combo.currentData()
            return str(data) if data is not None else self.capture_mode_combo.currentText()

        def friendly_device_name(self, name: str) -> str:
            cleaned = name.replace("Microsoft Sound Mapper - Input", "Default Input")
            cleaned = cleaned.replace("Microsoft Sound Mapper - Output", "Default Output")
            for suffix in [" (Windows WASAPI)", " (MME)", " (DirectSound)", " (WDM-KS)"]:
                cleaned = cleaned.replace(suffix, "")
            return " ".join(cleaned.split())

        def should_hide_device(self, name: str) -> bool:
            if self.runtime.audio_settings.show_advanced_devices:
                return False
            lowered = name.lower()
            return any(token in lowered for token in ["sound mapper", "primary sound", "mapper", "loopback"])

        def should_hide_input_device(self, device: object) -> bool:
            if self.runtime.audio_settings.show_advanced_devices:
                return False
            name = str(getattr(device, "name", "")).lower()
            return bool(getattr(device, "is_virtual", False)) or bool(getattr(device, "is_loopback", False)) or any(
                token in name
                for token in ["sound mapper", "primary sound", "vb-audio", "cable", "stereo mix", "line in"]
            )

        def should_hide_output_device(self, device: object) -> bool:
            if self.runtime.audio_settings.show_advanced_devices:
                return False
            name = str(getattr(device, "name", "")).lower()
            return bool(getattr(device, "is_virtual", False)) or any(
                token in name for token in ["sound mapper", "primary sound", "vb-audio", "cable", "output ()"]
            )

        def populate_microphones(self) -> None:
            self.device_combo.clear()
            devices = self.runtime.capture.list_microphone_devices()
            if not devices:
                self.device_combo.addItem("No microphone devices detected", None)
                _status_widget_for(self, "mic").setText("No microphone")
                self.log_event("WARN", "No microphone devices detected.")
                return
            simplified = []
            seen: set[tuple[str, int, int]] = set()
            for device in sorted(devices, key=lambda item: (not item.is_default, self.should_hide_input_device(item), item.name.lower())):
                if self.should_hide_input_device(device) and any(not self.should_hide_input_device(other) for other in devices):
                    continue
                key = (self.friendly_device_name(device.name).lower(), device.max_input_channels)
                if key in seen and not self.runtime.audio_settings.show_advanced_devices:
                    continue
                seen.add(key)
                simplified.append(device)
            for device in simplified:
                label = self.friendly_device_name(device.name)
                if self.runtime.audio_settings.show_advanced_devices:
                    label = f"{device.device_id}: {label} | {device.max_input_channels} ch | {device.sample_rate} Hz"
                if device.is_default:
                    label += "  Default"
                self.device_combo.addItem(label, device.device_id)
                if self.runtime.audio_settings.input_device_id == device.device_id:
                    self.device_combo.setCurrentIndex(self.device_combo.count() - 1)
            self.handle_device_changed()
            self.populate_output_devices()
            self.log_event("INFO", f"Loaded {len(simplified)} simplified microphone device(s).")

        def populate_output_devices(self) -> None:
            self.output_device_combo.clear()
            devices = self.runtime.capture.list_output_devices()
            if not devices:
                self.output_device_combo.addItem("No output devices detected", None)
                self.output_status_label.setText("No output device detected.")
                return
            seen: set[tuple[str, int, int]] = set()
            simplified = []
            for device in sorted(devices, key=lambda item: (not item.is_default, self.should_hide_output_device(item), item.name.lower())):
                if self.should_hide_output_device(device) and any(not self.should_hide_output_device(other) for other in devices):
                    continue
                key = (self.friendly_device_name(device.name).lower(), device.max_output_channels)
                if key in seen and not self.runtime.audio_settings.show_advanced_devices:
                    continue
                seen.add(key)
                simplified.append(device)
            for device in simplified:
                label = self.friendly_device_name(device.name)
                if self.runtime.audio_settings.show_advanced_devices:
                    label = f"{device.device_id}: {label} | {device.max_output_channels} ch | {device.sample_rate} Hz"
                if device.is_default:
                    label += "  Default"
                self.output_device_combo.addItem(label, device.device_id)
                if self.runtime.audio_settings.output_device_id == device.device_id:
                    self.output_device_combo.setCurrentIndex(self.output_device_combo.count() - 1)
            self.handle_output_device_changed()

        def handle_device_changed(self) -> None:
            self.runtime.audio_settings.input_device_id = self.selected_device_id()
            self.runtime.save_audio_settings()
            self.selected_device_label.setText(f"Selected input: {self.device_combo.currentText()}")
            request_status_refresh = getattr(self, "_request_status_refresh", None)
            if callable(request_status_refresh):
                request_status_refresh()
            else:
                self.refresh_status_panel()

        def handle_output_device_changed(self) -> None:
            self.runtime.audio_settings.output_device_id = self.selected_output_device_id()
            self.runtime.save_audio_settings()
            if self.selected_output_device_id() is None:
                self.output_status_label.setText("No output device selected.")
            else:
                self.output_status_label.setText(
                    "Output device selection is saved. Current playback backend uses Windows default output."
                )

        def handle_sensitivity_changed(self, value: str | None = None) -> None:
            if value is not None:
                self.runtime.audio_settings.input_sensitivity = value
            if hasattr(self, "sensitivity_value_label"):
                self.sensitivity_value_label.setText(self.runtime.audio_settings.input_sensitivity)
            self.runtime.save_audio_settings()
            self.log_event("INFO", f"Microphone sensitivity preserved as {self.runtime.audio_settings.input_sensitivity}.")

        def handle_advanced_devices_changed(self, checked: bool) -> None:
            self.runtime.audio_settings.show_advanced_devices = checked
            self.runtime.save_audio_settings()
            self.populate_microphones()

        def handle_use_anyway_changed(self, checked: bool) -> None:
            self.runtime.audio_settings.allow_low_but_usable_input = checked
            self.runtime.save_audio_settings()

        def handle_auto_play_out_voice_changed(self, checked: bool) -> None:
            self.runtime.audio_settings.auto_play_out_voice = checked
            self.auto_play_out_voice = checked
            self.runtime.save_audio_settings()
            self.log_event("INFO", f"Auto-play translation voice set to {checked}.")

        def refresh_tts_runtime(self) -> None:
            previous_tts = getattr(self.runtime, "tts", None)
            shutdown_runtime_state = getattr(previous_tts, "shutdown_runtime_state", None)
            if callable(shutdown_runtime_state):
                try:
                    shutdown_runtime_state()
                except Exception:
                    pass
            custom_voice_enabled = bool(self.runtime.audio_settings.use_custom_voice_actor and self.runtime.audio_settings.voice_actor_profile_id.strip())
            tts_runtime = TTSPlaceholder(
                custom_voice_profile_id=self.runtime.audio_settings.voice_actor_profile_id.strip() if custom_voice_enabled else "",
                custom_voice_profiles_root=self.runtime.audio_settings.voice_actor_profiles_root if custom_voice_enabled and self.runtime.audio_settings.voice_actor_profiles_root else None,
            )
            self.runtime.tts = tts_runtime
            self.log_event(
                "INFO",
                "TTS runtime refreshed.",
                {
                    "custom_voice_actor": self.runtime.audio_settings.use_custom_voice_actor,
                    "voice_profile_id": self.runtime.audio_settings.voice_actor_profile_id,
                },
            )

        def populate_voice_actor_profiles(self) -> None:
            root_value = self.runtime.audio_settings.voice_actor_profiles_root.strip()
            self.voice_actor_profiles_combo.blockSignals(True)
            self.voice_actor_profiles_combo.clear()
            profiles = discover_voice_actor_profiles(Path(root_value)) if root_value else []
            for profile in profiles:
                label = f"{profile.display_name} ({profile.profile_id})"
                self.voice_actor_profiles_combo.addItem(label, profile.profile_id)
            saved_profile_id = self.runtime.audio_settings.voice_actor_profile_id.strip()
            current_index = self.voice_actor_profiles_combo.findData(saved_profile_id)
            if current_index >= 0:
                self.voice_actor_profiles_combo.setCurrentIndex(current_index)
            elif profiles:
                preferred_index = next((index for index, profile in enumerate(profiles) if profile.profile_id.lower() == "marcel"), 0)
                self.voice_actor_profiles_combo.setCurrentIndex(preferred_index)
                self.runtime.audio_settings.voice_actor_profile_id = str(self.voice_actor_profiles_combo.currentData() or "").strip()
                self.runtime.save_audio_settings()
            else:
                self.voice_actor_profiles_combo.addItem("No custom voice actors found.", "")
                self.voice_actor_profiles_combo.setCurrentIndex(0)
            self.voice_actor_profiles_combo.blockSignals(False)
            has_profiles = bool(profiles)
            self.voice_actor_profiles_combo.setEnabled(has_profiles)
            self.voice_actor_empty_label.setVisible(not has_profiles)
            self.voice_actor_profile_hint.setText(
                "Choose a voice actor for translation output."
                if has_profiles
                else "No custom voice actors found. Add voice actor files and refresh the list."
            )
            if not has_profiles:
                self.runtime.audio_settings.voice_actor_profile_id = ""
            self.runtime.audio_settings.use_custom_voice_actor = bool(self.runtime.audio_settings.voice_actor_profile_id.strip())
            self.voice_actor_toggle.setChecked(self.runtime.audio_settings.use_custom_voice_actor)
            request_status_refresh = getattr(self, "_request_status_refresh", None)
            if callable(request_status_refresh):
                request_status_refresh()
            else:
                self.refresh_status_panel()

        def handle_voice_actor_profiles_root_changed(self) -> None:
            root_text = self.voice_actor_profiles_root_edit.text().strip()
            self.runtime.audio_settings.voice_actor_profiles_root = root_text
            self.runtime.save_audio_settings()
            self.refresh_tts_runtime()
            self.populate_voice_actor_profiles()
            self.log_event("INFO", "Voice profiles root updated.", root_text or "empty")

        def handle_voice_actor_profile_changed(self, value: str) -> None:
            profile_id = value.strip()
            if profile_id == "No custom voice actors found.":
                profile_id = ""
            if profile_id.endswith(")") and "(" in profile_id:
                candidate = profile_id.rsplit("(", 1)[-1].rstrip(")").strip()
                if candidate:
                    profile_id = candidate
            self.runtime.audio_settings.voice_actor_profile_id = profile_id
            self.runtime.audio_settings.use_custom_voice_actor = bool(profile_id)
            self.runtime.save_audio_settings()
            self.refresh_tts_runtime()
            request_status_refresh = getattr(self, "_request_status_refresh", None)
            if callable(request_status_refresh):
                request_status_refresh()
            else:
                self.refresh_status_panel()

        def handle_voice_actor_toggle_changed(self, checked: bool) -> None:
            self.runtime.audio_settings.use_custom_voice_actor = checked
            self.runtime.save_audio_settings()
            self.refresh_tts_runtime()
            self.update_voice_actor_controls_enabled(checked)
            self._request_status_refresh()

        def handle_refresh_voice_profiles(self) -> None:
            self.populate_voice_actor_profiles()
            self.log_event("INFO", "Voice profiles refreshed.", self.runtime.audio_settings.voice_actor_profiles_root)

        def handle_test_output(self) -> None:
            try:
                path = self.runtime.config.cache_dir / "output_test_translateit.wav"
                path.parent.mkdir(parents=True, exist_ok=True)
                sample_rate = 16_000
                duration_s = 0.35
                frames = bytearray()
                for index in range(int(sample_rate * duration_s)):
                    value = int(0.24 * 32767 * math.sin(2.0 * math.pi * 880.0 * index / sample_rate))
                    frames.extend(value.to_bytes(2, byteorder="little", signed=True))
                with wave.open(str(path), "wb") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(bytes(frames))
                replay_result = self.runtime.replay.replay_audio(path, output_device_id=self.selected_output_device_id())
                level = "INFO" if replay_result.status in {"Playing", "Queued", "Completed"} else "ERROR"
                self.log_event(
                    level,
                    "Output test requested.",
                    replay_result.message,
                )
                self.output_status_label.setText(replay_result.message)
            except Exception as exc:
                self.handle_worker_error(format_exception(exc))

        def refresh_status_panel(self) -> None:
            set_text_if_changed = getattr(self, "_set_text_if_changed", None)
            if not callable(set_text_if_changed):
                set_text_if_changed = TranslateITWindow._set_text_if_changed
            validation_items = self._get_validation_items()
            failed = [item for item in validation_items if item.level == "FAIL"]
            runtime_error_message = ""
            if self.live_thread is not None:
                runtime_error_message = str(getattr(self.live_thread, "last_error", "") or "")
            runtime_runtime_error = self.runtime.current_status == UIState.ERROR and bool(runtime_error_message)
            runtime_ok = not runtime_runtime_error
            set_text_if_changed(_status_widget_for(self, "runtime"), "FAIL" if runtime_runtime_error else "PASS")
            set_text_if_changed(_status_widget_for(self, "python"), "available")
            cuda_status = self.runtime.cuda_status or self.runtime.refresh_cuda_status()
            cuda_ready = cuda_status.core_status == CUDA_CORE_PASS
            cuda_label = (
                f"{cuda_status.core_status} | GPU {cuda_status.gpu_name or 'not detected'} | "
                f"driver {cuda_status.driver_version or 'missing'} | "
                f"torch {cuda_status.torch_version or 'missing'} | "
                f"torch CUDA {cuda_status.torch_cuda_build} | "
                f"available {cuda_status.torch_cuda_available} | "
                f"tensor {cuda_status.torch_tensor_execution}"
            )
            if cuda_status.torch_imported and cuda_status.torch_cuda_build is None:
                cuda_label += " | PyTorch CPU-only build detected. Use TranslateIT.bat option 4."
            if self.runtime.cpu_degraded_mode_enabled:
                cuda_label += " | CPU DEGRADED MODE ENABLED"
            set_text_if_changed(_status_widget_for(self, "cuda"), cuda_label)
            set_text_if_changed(_status_widget_for(self, "asr"), " | ".join(self.runtime.model_status_lines()[:3]))
            set_text_if_changed(_status_widget_for(self, "translation"), " | ".join(self.runtime.model_status_lines()[3:]))
            voice_actor_enabled = bool(self.runtime.audio_settings.use_custom_voice_actor)
            voice_actor_profile_id = self.runtime.audio_settings.voice_actor_profile_id.strip()
            voice_actor_root = self.runtime.audio_settings.voice_actor_profiles_root.strip() or "not set"
            voice_actor_ready = bool(getattr(self.runtime.tts, "_warmup_cached_success", None))
            voice_actor_warming = bool(getattr(self.runtime.tts, "_warmup_in_progress", False))
            startup_worker = getattr(self, "startup_worker", None)
            startup_worker_running = bool(startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning())
            if voice_actor_profile_id:
                voice_actor_text = (
                    f"{'enabled' if voice_actor_enabled else 'disabled'} | {voice_actor_profile_id} | {voice_actor_root} | "
                    f"{'ready' if voice_actor_ready else ('warming' if voice_actor_warming else 'idle')}"
                )
            else:
                voice_actor_text = (
                    f"{'enabled' if voice_actor_enabled else 'disabled'} | "
                    f"{'ready' if voice_actor_ready else ('warming' if voice_actor_warming else 'idle')}"
                )
            set_text_if_changed(_status_widget_for(self, "voice"), voice_actor_text)
            set_text_if_changed(_status_widget_for(self, "mic"), self.device_combo.currentText() or "No microphone")
            capture_start_transition = _capture_start_transition_in_progress(
                engine_startup_ready=self.engine_startup_ready,
                current_status=self.runtime.current_status,
                live_thread_running=bool(
                    self.live_thread is not None
                    and callable(getattr(self.live_thread, "isRunning", None))
                    and self.live_thread.isRunning()
                ),
                startup_worker_running=startup_worker_running,
                pending_start_after_ready=bool(getattr(self, "_pending_start_after_ready", False)),
            )
            capture_status_text = {
                UIState.READY: "Ready",
                UIState.READY_TO_LISTEN: "Ready to listen",
                UIState.LISTENING: "Listening",
                UIState.SPEECH_DETECTED: "Processing",
                UIState.TRANSCRIBING: "Processing",
                UIState.TRANSLATING: "Translating",
                UIState.PREPARING: "Preparing",
                UIState.STREAM_CHECK: "Preparing",
                UIState.STOPPED: "Stopped",
                UIState.ERROR: "Error",
                UIState.IDLE: "Idle",
            }.get(self.runtime.current_status, self.runtime.current_status.value)
            if capture_start_transition:
                capture_status_text = "Preparing"
            set_text_if_changed(_status_widget_for(self, "capture"), capture_status_text)
            if self.live_thread is not None:
                capture_worker_state = "running" if self.live_thread.isRunning() else "stopped"
                stream_active = getattr(self.live_thread, "stream_active", False)
                callback_count = getattr(self.live_thread, "callback_count", 0)
                frames_received = getattr(self.live_thread, "frames_received", 0)
                last_audio_frame_time = getattr(self.live_thread, "last_audio_frame_time", "")
                last_error = getattr(self.live_thread, "last_error", "")
            else:
                capture_worker_state = "idle"
                stream_active = False
                callback_count = 0
                frames_received = 0
                last_audio_frame_time = ""
                last_error = ""
            set_text_if_changed(_status_widget_for(self, "worker"), capture_worker_state)
            set_text_if_changed(_status_widget_for(self, "stream"), "yes" if stream_active else "no")
            set_text_if_changed(_status_widget_for(self, "callbacks"), str(callback_count))
            set_text_if_changed(_status_widget_for(self, "frames"), str(frames_received))
            set_text_if_changed(_status_widget_for(self, "last_frame"), last_audio_frame_time or "-")
            set_text_if_changed(_status_widget_for(self, "last_error"), last_error or "-")
            set_text_if_changed(
                _status_widget_for(self, "session"),
                f"{self.runtime.session.session_id} | accepted {self.runtime.accepted_count} | rejected {self.runtime.rejected_count}",
            )
            replay_locked = bool(
                (self.live_thread is not None and self.live_thread.isRunning())
                or self.runtime.current_status in {
                    UIState.PREPARING,
                    UIState.LISTENING,
                    UIState.SPEECH_DETECTED,
                    UIState.TRANSCRIBING,
                    UIState.TRANSLATING,
                }
            )
            try:
                set_text_if_changed(
                    _status_widget_for(self, "replay"),
                    "Replay: Locked" if replay_locked else "Replay: Available",
                )
            except KeyError:
                pass
            set_text_if_changed(_status_widget_for(self, "privacy"), "Local-only; no cloud services")
            set_text_if_changed(self.page_title_label, "Unsaved Session")
            set_text_if_changed(self.sidebar_session_label, self.runtime.session.session_id)
            set_text_if_changed(self.session_meta_label, f"{self.runtime.session.session_id} | {self.runtime.accepted_count} accepted")
            model_ready = all("found" in line for line in self.runtime.model_status_lines()[:5] if "target" not in line.lower())
            mic_validation = self.runtime.capture.validate_device_selection(self.selected_device_id())
            calibration = self.runtime.current_calibration
            status_text = "Ready"
            status_state = "ready"
            if not mic_validation.valid:
                status_text = "Error"
                status_state = "error"
            elif self.runtime.current_status == UIState.ERROR:
                active_stream = bool(self.live_thread and getattr(self.live_thread, "stream_active", False))
                if active_stream and not last_error:
                    status_text = "Ready"
                    status_state = "ready"
                elif last_error and any(token in last_error.lower() for token in ["microphone stream", "callback", "audio frames"]):
                    status_text = "Error"
                    status_state = "error"
                else:
                    status_text = "Ready"
                    status_state = "ready"
            elif self.runtime.current_status in {UIState.READY, UIState.READY_TO_LISTEN, UIState.LISTENING}:
                if self.runtime.current_status == UIState.READY:
                    status_text = "Ready"
                elif self.runtime.current_status == UIState.READY_TO_LISTEN:
                    status_text = "Ready to listen"
                else:
                    status_text = "Listening"
                status_state = "ready"
            elif calibration is not None:
                input_state = calibration.input_state.lower()
                if input_state in {"too quiet", "no signal"}:
                    status_text = "Preparing"
                    status_state = "warning"
                else:
                    status_text = "Ready"
                    status_state = "ready"
            else:
                status_text = "Ready"
                status_state = "ready"
            state = self.runtime.current_status
            if state in {UIState.PREPARING, UIState.STREAM_CHECK}:
                status_text = "Preparing"
                status_state = "warning"
            elif state == UIState.READY:
                status_text, status_state = "Ready", "ready"
            elif state == UIState.READY_TO_LISTEN:
                status_text, status_state = "Ready to listen", "ready"
            elif state == UIState.LISTENING:
                status_text, status_state = "Listening", "ready"
            elif state in {UIState.SPEECH_DETECTED, UIState.TRANSCRIBING, UIState.TRANSLATING}:
                status_text, status_state = "Processing", "warning"
            elif state == UIState.ERROR:
                status_text, status_state = "Error", "error"
            elif state == UIState.STOPPED:
                status_text, status_state = "Stopped", "info"
            elif state == UIState.IDLE:
                status_text, status_state = "Idle", "info"
            else:
                status_text, status_state = "Ready", "info"
            refresh_diagnostics_summary = getattr(self, "refresh_diagnostics_summary", None)
            if callable(refresh_diagnostics_summary):
                refresh_diagnostics_summary()
            status_signature = (
                runtime_runtime_error,
                cuda_label,
                voice_actor_text,
                self.device_combo.currentText() or "No microphone",
                capture_status_text,
                capture_worker_state,
                stream_active,
                callback_count,
                frames_received,
                last_audio_frame_time or "-",
                last_error or "-",
                f"{self.runtime.session.session_id} | accepted {self.runtime.accepted_count} | rejected {self.runtime.rejected_count}",
                "Local-only; no cloud services",
                status_text,
                status_state,
                self.runtime.session.session_id,
                f"{self.runtime.session.session_id} | {self.runtime.accepted_count} accepted",
            )
            if getattr(self, "_status_panel_signature", None) == status_signature:
                self.update_benchmark_panel()
                return
            self._status_panel_signature = status_signature
            self._set_text_if_changed(self.runtime_badge, f"Status: {status_text}")
            self.runtime_badge.setProperty("statusState", status_state)
            badge_signature = (status_text, status_state)
            if getattr(self, "_runtime_badge_signature", None) != badge_signature:
                self._runtime_badge_signature = badge_signature
                for badge in [self.runtime_badge]:
                    badge.style().unpolish(badge)
                    badge.style().polish(badge)
            self.update_start_button_state()
            self.update_benchmark_panel()

        def refresh_diagnostics_summary(self) -> None:
            summary_labels = getattr(self, "diagnostics_summary_labels", None)
            if not isinstance(summary_labels, dict):
                return
            set_text_if_changed = getattr(self, "_set_text_if_changed", None)
            if not callable(set_text_if_changed):
                set_text_if_changed = TranslateITWindow._set_text_if_changed

            def set_badge(key: str, text: str, state: str) -> None:
                widget = summary_labels.get(key)
                if widget is None:
                    return
                set_text_if_changed(widget, text)
                widget.setProperty("statusState", state)
                widget.style().unpolish(widget)
                widget.style().polish(widget)

            runtime_state = self.runtime.current_status
            runtime_error_message = ""
            if self.live_thread is not None:
                runtime_error_message = str(getattr(self.live_thread, "last_error", "") or "")
            if runtime_state == UIState.ERROR or runtime_error_message:
                runtime_text, runtime_state_flag = "Error", "error"
            elif runtime_state in {UIState.PREPARING, UIState.STREAM_CHECK}:
                runtime_text, runtime_state_flag = "Preparing", "warning"
            elif runtime_state == UIState.STOPPED:
                runtime_text, runtime_state_flag = "Stopped", "info"
            else:
                runtime_text, runtime_state_flag = "Ready", "ready"
            set_badge("runtime", runtime_text, runtime_state_flag)
            set_badge("python", "Available" if sys.executable else "Missing", "ready" if sys.executable else "error")

            cuda_status = self.runtime.cuda_status or self.runtime.refresh_cuda_status()
            if self.runtime.cpu_degraded_mode_enabled:
                cuda_text, cuda_state = "CPU fallback", "warning"
            elif cuda_status.core_status == CUDA_CORE_PASS:
                cuda_text, cuda_state = "Available", "ready"
            elif cuda_status.core_status:
                cuda_text, cuda_state = "Error", "error"
            else:
                cuda_text, cuda_state = "Unknown", "warning"
            set_badge("cuda", cuda_text, cuda_state)

            model_lines = [str(line).lower() for line in self.runtime.model_status_lines()]
            asr_lines = model_lines[:3]
            translate_lines = model_lines[3:]
            if any("missing" in line or "failed" in line for line in asr_lines):
                asr_text, asr_state = "Error", "error"
            elif any("found" in line or "ready" in line for line in asr_lines):
                asr_text, asr_state = "Ready", "ready"
            else:
                asr_text, asr_state = "Warning", "warning"
            if any("missing" in line or "failed" in line for line in translate_lines):
                translate_text, translate_state = "Error", "error"
            elif any("found" in line or "ready" in line for line in translate_lines):
                translate_text, translate_state = "Ready", "ready"
            else:
                translate_text, translate_state = "Warning", "warning"
            set_badge("asr", asr_text, asr_state)
            set_badge("translation", translate_text, translate_state)

            voice_actor_enabled = bool(self.runtime.audio_settings.use_custom_voice_actor and self.runtime.audio_settings.voice_actor_profile_id.strip())
            voice_actor_ready = bool(getattr(self.runtime.tts, "_warmup_cached_success", None))
            voice_actor_warming = bool(getattr(self.runtime.tts, "_warmup_in_progress", False))
            if voice_actor_enabled and voice_actor_ready:
                voice_text, voice_state = "Ready", "ready"
            elif voice_actor_enabled and voice_actor_warming:
                voice_text, voice_state = "Warning", "warning"
            elif voice_actor_enabled:
                voice_text, voice_state = "Warning", "warning"
            else:
                voice_text, voice_state = "Not selected", "warning"
            set_badge("voice", voice_text, voice_state)

            microphone_name = self.device_combo.currentText() if hasattr(self, "device_combo") and self.device_combo.count() else ""
            if microphone_name and "no microphone" not in microphone_name.lower():
                mic_text, mic_state = microphone_name, "ready"
            else:
                mic_text, mic_state = "Not detected", "warning"
            set_badge("mic", mic_text, mic_state)

            if self.runtime.current_status == UIState.READY_TO_LISTEN:
                capture_text, capture_state = "Ready to listen", "ready"
            elif self.runtime.current_status == UIState.LISTENING:
                capture_text, capture_state = "Listening", "ready"
            elif self.engine_startup_ready and self.runtime.current_status not in {UIState.ERROR, UIState.PREPARING, UIState.STREAM_CHECK}:
                capture_text, capture_state = "Ready", "ready"
            elif self.runtime.current_status == UIState.ERROR:
                capture_text, capture_state = "Error", "error"
            else:
                capture_text, capture_state = "Not ready", "warning"
            set_badge("capture", capture_text, capture_state)
            set_badge("privacy", "Local-only", "info" if self.runtime.config.local_only_mode else "warning")

        def _request_status_refresh(self) -> None:
            if self._status_refresh_pending:
                return
            self._status_refresh_pending = True

            def runner() -> None:
                try:
                    self.refresh_status_panel()
                finally:
                    self._status_refresh_pending = False

            try:
                QTimer.singleShot(0, runner)
            except Exception:
                self._status_refresh_pending = False
                runner()

        def handle_refresh_cuda_status(self) -> None:
            result = self.runtime.refresh_cuda_status()
            self.runtime.apply_asr_device_policy()
            self.log_event("INFO" if result.core_status == CUDA_CORE_PASS else "ERROR", "CUDA status refreshed.", result.to_dict())
            self._invalidate_validation_items_cache()
            self._request_status_refresh()

        def handle_run_cuda_validation(self) -> None:
            result = self.runtime.refresh_cuda_status()
            level = "INFO" if result.core_status == CUDA_CORE_PASS else "ERROR"
            self.log_event(level, f"CUDA validation result: {result.core_status}", result.blocker or result.to_dict())
            self._invalidate_validation_items_cache()
            self._request_status_refresh()

        def handle_open_cuda_guide(self) -> None:
            guide_path = PROJECT_ROOT / "DevelopingData" / "DocumentationData" / "SourceDocument" / "ProjectDocuments" / "CUDA_SETUP_GUIDE.md"
            if guide_path.exists():
                try:
                    os.startfile(str(guide_path))  # type: ignore[attr-defined]
                    self.log_event("INFO", "Opened CUDA setup guide.", guide_path)
                except Exception as exc:
                    self.log_event("WARN", "Could not open CUDA setup guide automatically.", f"{guide_path}: {exc}")
            else:
                self.log_event("WARN", "CUDA setup guide not found yet.", guide_path)

        def handle_enable_degraded_cpu_mode(self) -> None:
            self.runtime.cpu_degraded_mode_enabled = True
            self.runtime.apply_asr_device_policy()
            self.log_event(
                "WARN",
                "CPU DEGRADED MODE enabled by user. Real ASR may be slow and is not target Core App performance.",
            )
            self._request_status_refresh()

        def update_benchmark_panel(self) -> None:
            set_text_if_changed = getattr(self, "_set_text_if_changed", None)
            if not callable(set_text_if_changed):
                set_text_if_changed = TranslateITWindow._set_text_if_changed
            get_benchmark_summary = getattr(self, "_get_benchmark_summary", None)
            if callable(get_benchmark_summary):
                summary = get_benchmark_summary()
            else:
                summary = self.runtime.session.benchmark_summary()
            total_after_eos = None
            if isinstance(summary, dict):
                total_after_eos = summary.get("total_after_eos")
            else:
                total_after_eos = getattr(summary, "total_after_eos", None)
            p50_ms = 0
            p95_ms = 0
            worst_ms = 0
            if total_after_eos is not None:
                if isinstance(total_after_eos, dict):
                    p50_ms = int(total_after_eos.get("p50_ms", 0) or 0)
                    p95_ms = int(total_after_eos.get("p95_ms", 0) or 0)
                    worst_ms = int(total_after_eos.get("worst_ms", 0) or 0)
                else:
                    p50_ms = int(getattr(total_after_eos, "p50_ms", 0) or 0)
                    p95_ms = int(getattr(total_after_eos, "p95_ms", 0) or 0)
                    worst_ms = int(getattr(total_after_eos, "worst_ms", 0) or 0)
            accepted_segments = getattr(summary, "completed_segments", getattr(summary, "segment_count", 0))
            rejected_segments = getattr(self.runtime, "rejected_count", 0)
            average_asr_ms = getattr(summary, "average_asr_ms", getattr(summary, "mean_asr_ms", 0))
            average_translation_ms = getattr(summary, "average_translation_ms", getattr(summary, "mean_translation_ms", 0))
            benchmark_text = (
                f"Accepted {accepted_segments} | Rejected {rejected_segments} | "
                f"p50 {p50_ms} ms | "
                f"p95 {p95_ms} ms | "
                f"worst {worst_ms} ms | "
                f"ASR avg {average_asr_ms} ms | Translation avg {average_translation_ms} ms"
            )
            text = (
                benchmark_text
            )
            last_latency = 0
            last_latency_available = False
            if self.runtime.session.segments:
                last_segment = self.runtime.session.segments[-1]
                parsed_last_latency = _safe_latency_badge_ms(
                    self._build_transcript_card_view_model(last_segment).total_latency_label
                )
                if parsed_last_latency is not None:
                    last_latency = parsed_last_latency
                    last_latency_available = True
            benchmark_signature = (
                benchmark_text,
                last_latency,
                last_latency_available,
                getattr(self.runtime.session, "session_id", ""),
                len(self.runtime.session.segments),
            )
            if getattr(self, "_benchmark_panel_signature", None) == benchmark_signature:
                return
            self._benchmark_panel_signature = benchmark_signature
            set_text_if_changed(
                self.benchmark_label,
                f"Last latency {last_latency} ms" if last_latency_available else "Last latency unavailable",
            )
            set_text_if_changed(_status_widget_for(self, "benchmark"), text)

        def _invalidate_validation_items_cache(self) -> None:
            self._validation_items_cache = []
            self._validation_items_cache_at = 0.0

        def _invalidate_benchmark_summary_cache(self) -> None:
            self._benchmark_summary_cache = None
            self._benchmark_summary_cache_key = None
            self._benchmark_summary_cache_at = 0.0
            self._benchmark_panel_signature = None

        def _write_snapshot_if_changed(self, cache_key: str, fingerprint: tuple[Any, ...], file_name: str, payload: object) -> bool:
            cache_store = getattr(self, "_health_snapshot_cache", None)
            if cache_store is None:
                cache_store = {}
                try:
                    self._health_snapshot_cache = cache_store
                except Exception:
                    pass
            cached = cache_store.get(cache_key)
            if cached is not None and cached[0] == fingerprint:
                return False
            cache_store[cache_key] = (fingerprint, payload)
            write_json_report_async(file_name, payload)
            return True

        def _build_session_benchmark_signature(self) -> tuple[Any, ...]:
            session = self.runtime.session
            last_segment = session.segments[-1] if session.segments else None
            return (
                session.session_id,
                len(session.segments),
                getattr(self.runtime, "accepted_count", 0),
                getattr(self.runtime, "rejected_count", 0),
                getattr(last_segment, "segment_id", "") if last_segment is not None else "",
                getattr(getattr(last_segment, "latency", None), "tts_end_time", "") if last_segment is not None else "",
                getattr(getattr(last_segment, "latency", None), "tts_voice_start_proxy_time", "") if last_segment is not None else "",
                getattr(getattr(last_segment, "latency", None), "speech_end_to_voice_proxy_ms", 0) if last_segment is not None else 0,
            )

        def _write_session_benchmark_reports_if_changed(self) -> dict[str, Any]:
            signature = self._build_session_benchmark_signature()
            cached_signature = getattr(self, "_session_benchmark_report_signature", None)
            cached_report = getattr(self, "_session_benchmark_report_cache", None)
            if cached_signature == signature and cached_report is not None:
                return dict(cached_report)
            report = write_benchmark_reports(self.runtime.session, session_id=self.runtime.session.session_id)
            self._session_benchmark_report_signature = signature
            self._session_benchmark_report_cache = dict(report)
            return report

    def _build_benchmark_export_payload(self) -> dict[str, Any]:
        summary = self.session.benchmark_summary_dict()
        cuda_status = self.cuda_status or self.refresh_cuda_status()
        benchmark_mode = "CUDA mode" if cuda_status.core_status == CUDA_CORE_PASS else "CPU mode"
        benchmark_note = (
            "This benchmark was run with CUDA acceleration."
            if cuda_status.core_status == CUDA_CORE_PASS
            else "This benchmark was run without CUDA acceleration."
        )
        return {
            "session_id": self.session.session_id,
            "input_language": self.config.source_language,
            "output_language": self.config.target_language,
            "asr_model": self.config.primary_asr_model,
            "translation_engine": self.config.translation_engine_name,
            "cuda_core_status": cuda_status.core_status,
            "active_asr_device": self.asr_loader.device,
            "active_asr_compute_type": self.asr_loader.compute_type,
            "gpu_name": cuda_status.gpu_name,
            "torch_version": cuda_status.torch_version,
            "torch_cuda_build": cuda_status.torch_cuda_build,
            "benchmark_mode": benchmark_mode,
            "benchmark_note": benchmark_note,
            "latency_groups": list(summary.get("latency_groups", [])) if isinstance(summary, dict) else [],
            "stt_breakdown": list(summary.get("stt_breakdown", [])) if isinstance(summary, dict) else [],
            "summary": summary,
        }

    def _build_benchmark_export_lines(payload: dict[str, Any]) -> list[str]:
        summary = payload.get("summary", {})
        total_after_eos = summary.get("total_after_eos", {}) if isinstance(summary, dict) else {}
        if not isinstance(total_after_eos, dict):
            total_after_eos = {}
        total_p50 = int(total_after_eos.get("p50_ms", 0) or 0)
        total_p95 = int(total_after_eos.get("p95_ms", 0) or 0)
        total_worst = int(total_after_eos.get("worst_ms", 0) or 0)
        benchmark_mode = str(payload.get("benchmark_mode", "Unknown"))
        benchmark_note = str(payload.get("benchmark_note", ""))
        return [
            f"Session: {payload.get('session_id', '')}",
            f"CUDA Core status: {payload.get('cuda_core_status', '')}",
            f"Benchmark mode: {benchmark_mode}",
            f"GPU: {payload.get('gpu_name', '') or 'not detected'}",
            f"torch: {payload.get('torch_version', '') or 'missing'} / CUDA build {payload.get('torch_cuda_build', '') or 'missing'}",
            benchmark_note,
            f"Segments: {int(summary.get('completed_segments', 0) or 0)} completed / {int(summary.get('rejected_segments', 0) or 0)} rejected",
            f"Total after EOS: p50 {total_p50} ms, p95 {total_p95} ms, worst {total_worst} ms",
            f"Targets: p50 <= {int(summary.get('p50_target_ms', 0) or 0)} ms ({bool(summary.get('meets_p50_target', False))}), p95 <= {int(summary.get('p95_target_ms', 0) or 0)} ms ({bool(summary.get('meets_p95_target', False))})",
            f"Averages: ASR {int(summary.get('average_asr_ms', 0) or 0)} ms, translation {int(summary.get('average_translation_ms', 0) or 0)} ms",
            f"Bottleneck reason: {summary.get('bottleneck_reason', 'Unknown')}",
            f"Fallbacks: {int(summary.get('fallback_count', 0) or 0)}, errors: {int(summary.get('error_count', 0) or 0)}",
        ]

    def _build_engine_readiness_payload(self, state: UIState) -> tuple[tuple[Any, ...], dict[str, Any]]:
        live_thread = self.live_thread
        total_start_to_ready_ms = 0
        if self.start_pressed_perf is not None and self.ready_to_listen_perf is not None:
            total_start_to_ready_ms = int(max(0.0, (self.ready_to_listen_perf - self.start_pressed_perf) * 1000))
        payload = {
            "state": state.value,
            "cuda_ready": self.runtime.cuda_core_ready(),
            "asr_device": self.runtime.asr_loader.device,
            "asr_compute_type": self.runtime.asr_loader.compute_type,
            "input_device": self.device_combo.currentText(),
            "output_device": self.output_device_combo.currentText(),
            "auto_play_out_voice": self.auto_play_out_voice,
            "capture_worker_state": "running" if live_thread is not None and live_thread.isRunning() else "stopped",
            "stream_active": bool(getattr(live_thread, "stream_active", False)) if live_thread is not None else False,
            "callback_count": int(getattr(live_thread, "callback_count", 0)) if live_thread is not None else 0,
            "frames_received": int(getattr(live_thread, "frames_received", 0)) if live_thread is not None else 0,
            "last_audio_frame_time": str(getattr(live_thread, "last_audio_frame_time", "")) if live_thread is not None else "",
            "last_error": str(getattr(live_thread, "last_error", "")) if live_thread is not None else "",
            "start_pressed_time": self.start_pressed_time,
            "ready_to_listen_time": self.ready_to_listen_time,
            "total_start_to_ready_ms": total_start_to_ready_ms,
            "model_preload_duration_ms": int(max(0.0, ((self.model_preload_end_perf or 0.0) - (self.model_preload_start_perf or 0.0)) * 1000)) if self.model_preload_start_perf and self.model_preload_end_perf else 0,
            "cuda_check_duration_ms": 0,
            "stream_open_duration_ms": int(max(0.0, ((self.stream_open_end_perf or 0.0) - (self.stream_open_start_perf or 0.0)) * 1000)) if self.stream_open_start_perf and self.stream_open_end_perf else 0,
            "first_audio_callback_delay_ms": int(max(0.0, ((self.first_audio_callback_perf or 0.0) - (self.start_pressed_perf or 0.0)) * 1000)) if self.first_audio_callback_perf and self.start_pressed_perf else 0,
            "warmup_duration_ms": int(max(0.0, (self.warmup_perf or 0.0) * 1000)) if self.warmup_perf else 0,
            "false_ready_prevented": bool(self.false_ready_prevented),
            "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
        }
        fingerprint = (
            payload["state"],
            payload["cuda_ready"],
            payload["asr_device"],
            payload["asr_compute_type"],
            payload["input_device"],
            payload["output_device"],
            payload["auto_play_out_voice"],
            payload["capture_worker_state"],
            payload["stream_active"],
            payload["callback_count"],
            payload["frames_received"],
            payload["last_audio_frame_time"],
            payload["last_error"],
            payload["start_pressed_time"],
            payload["ready_to_listen_time"],
            payload["total_start_to_ready_ms"],
            payload["model_preload_duration_ms"],
            payload["cuda_check_duration_ms"],
            payload["stream_open_duration_ms"],
            payload["first_audio_callback_delay_ms"],
            payload["warmup_duration_ms"],
            payload["false_ready_prevented"],
        )
        return fingerprint, payload

    @staticmethod
    def _set_text_if_changed(widget: object, text: str) -> bool:
        current_text = getattr(widget, "text", None)
        if callable(current_text):
            try:
                if current_text() == text:
                    return False
            except Exception:
                pass
        setter = getattr(widget, "setText", None)
        if callable(setter):
            setter(text)
            return True
        return False

    def _status_widget(self, key: str) -> QLabel:
        alias_map = getattr(self, "status_label_aliases", None) or {
            "runtime": "Runtime status",
            "python": "Python runtime",
            "cuda": "CUDA Core App status",
            "asr": "ASR model",
            "translation": "Translation model",
            "voice": "Voice actor",
            "mic": "Microphone status",
            "capture": "Capture status",
            "worker": "Capture worker state",
            "stream": "Stream active",
            "callbacks": "Callback count",
            "frames": "Frames received",
            "last_frame": "Last audio frame time",
            "last_error": "Last error",
            "session": "Session status",
            "privacy": "Privacy/local-only",
            "benchmark": "Benchmark",
        }
        canonical_key = alias_map.get(key, key)
        widget = self.status_labels.get(canonical_key)
        if widget is None:
            raise KeyError(key)
        return widget

    def _get_validation_items(self, *, force_refresh: bool = False) -> list[Any]:
        now = perf_counter()
        if not force_refresh and self._validation_items_cache and (now - self._validation_items_cache_at) < 15.0:
            return list(self._validation_items_cache)
        items = build_validation_items()
        self._validation_items_cache = list(items)
        self._validation_items_cache_at = now
        return items

    def _get_benchmark_summary(self) -> object:
        session = self.runtime.session
        cache_key = (session.session_id, len(session.segments), getattr(self.runtime, "rejected_count", 0))
        now = perf_counter()
        if (
            self._benchmark_summary_cache is not None
            and self._benchmark_summary_cache_key == cache_key
            and (now - self._benchmark_summary_cache_at) < 5.0
        ):
            return self._benchmark_summary_cache
        summary = session.benchmark_summary()
        if hasattr(summary, "to_dict"):
            cached_summary: Any = summary
        else:
            cached_summary = summary
        self._benchmark_summary_cache = cached_summary
        self._benchmark_summary_cache_key = cache_key
        self._benchmark_summary_cache_at = now
        return cached_summary

    def _segment_card_view_model_fingerprint(self, segment: TranscriptSegment) -> tuple[Any, ...]:
        latency = getattr(segment, "latency", None)
        replay = getattr(segment, "replay", None)
        quality = getattr(segment, "quality", None)
        return (
            getattr(segment, "segment_id", ""),
            getattr(segment, "input_text", ""),
            getattr(segment, "translated_text", ""),
            getattr(segment, "created_at_iso", ""),
            getattr(quality, "status", ""),
            getattr(latency, "latency_ms", 0),
            getattr(latency, "asr_latency_ms", 0),
            getattr(latency, "translation_latency_ms", 0),
            getattr(latency, "speech_end_to_voice_proxy_ms", 0),
            getattr(latency, "tts_voice_start_proxy_ms", 0),
            getattr(latency, "tts_voice_completed_ms", 0),
            getattr(latency, "tts_process_start_overhead_ms", 0),
            str(getattr(replay, "source_audio_path", "") or ""),
            str(getattr(replay, "translated_audio_path", "") or ""),
            bool(getattr(replay, "target_voice_available", False)),
            bool(getattr(replay, "source_replay_available", False)),
        )

    def _status_message_widget(self) -> QLabel | None:
        widget = getattr(self, "runtime_badge", None)
        if widget is not None:
            return widget
        widget = getattr(self, "capture_status_label", None)
        if widget is not None:
            return widget
        return None

    def set_status(self, state: UIState) -> None:
        set_text_if_changed = getattr(self, "_set_text_if_changed", None)
        if not callable(set_text_if_changed):
            set_text_if_changed = TranslateITWindow._set_text_if_changed
        self.runtime.set_status(state)
        status_widget_getter = getattr(self, "_status_message_widget", None)
        if callable(status_widget_getter):
            status_widget = status_widget_getter()
        else:
            status_widget = _status_message_widget(self)
        if state == UIState.PREPARING:
            startup_worker = getattr(self, "startup_worker", None)
            startup_worker_running = bool(startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning())
            if status_widget is not None:
                set_text_if_changed(status_widget, "Preparing")
        elif state == UIState.STREAM_CHECK:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Processing")
        elif state == UIState.READY_TO_LISTEN:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Ready")
            if self.ready_to_listen_perf is None:
                self.ready_to_listen_perf = perf_counter()
                self.ready_to_listen_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            if self.live_thread is not None and getattr(self.live_thread, "first_audio_callback_perf", None) is not None:
                self.first_audio_callback_perf = getattr(self.live_thread, "first_audio_callback_perf")
        elif state == UIState.LISTENING:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Listening")
            if self.live_thread is not None and getattr(self.live_thread, "first_audio_callback_perf", None) is not None:
                self.first_audio_callback_perf = getattr(self.live_thread, "first_audio_callback_perf")
        elif state == UIState.TRANSCRIBING:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Processing")
        elif state == UIState.TRANSLATING:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Translating")
        elif state == UIState.ERROR:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Fix Setup")
        elif state == UIState.STOPPED:
            if status_widget is not None:
                set_text_if_changed(status_widget, "Stopped")
        else:
            if status_widget is not None:
                set_text_if_changed(status_widget, state.value)
        self.update_start_button_state()
        request_status_refresh = getattr(self, "_request_status_refresh", None)
        if callable(request_status_refresh):
            request_status_refresh()
        else:
            self.refresh_status_panel()
        self.write_engine_readiness_report(state)

    def update_start_button_state(self) -> None:
        set_text_if_changed = getattr(self, "_set_text_if_changed", None)
        if not callable(set_text_if_changed):
            set_text_if_changed = TranslateITWindow._set_text_if_changed
        state = self.runtime.current_status
        running = self.live_thread is not None and self.live_thread.isRunning()
        stop_in_progress = bool(getattr(self, "_stop_in_progress", False))
        startup_worker = getattr(self, "startup_worker", None)
        startup_worker_running = bool(startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning())
        pending_start_after_ready = bool(getattr(self, "_pending_start_after_ready", False))
        runtime_tts = getattr(self.runtime, "tts", None)
        runtime_tts_idle = True
        if runtime_tts is not None:
            is_runtime_idle = getattr(runtime_tts, "is_runtime_idle", None)
            if callable(is_runtime_idle):
                try:
                    runtime_tts_idle = bool(is_runtime_idle())
                except Exception:
                    runtime_tts_idle = True
        if running or startup_worker_running or pending_start_after_ready:
            set_text_if_changed(self.start_button, "Stop")
            self.start_button.setProperty("runState", "listening" if running else "processing")
            self.start_button.setEnabled(True)
            start_button_signature = (self.start_button.text(), self.start_button.property("runState"), self.start_button.isEnabled())
            if getattr(self, "_start_button_signature", None) != start_button_signature:
                self._start_button_signature = start_button_signature
                self.start_button.style().unpolish(self.start_button)
                self.start_button.style().polish(self.start_button)
            return
        if state in {UIState.PREPARING, UIState.STREAM_CHECK}:
            if self.engine_startup_ready and not startup_worker_running and not pending_start_after_ready and not running:
                set_text_if_changed(self.start_button, "Start")
                self.start_button.setProperty("runState", "idle")
                self.start_button.setEnabled(True)
                start_button_signature = (self.start_button.text(), self.start_button.property("runState"), self.start_button.isEnabled())
                if getattr(self, "_start_button_signature", None) != start_button_signature:
                    self._start_button_signature = start_button_signature
                    self.start_button.style().unpolish(self.start_button)
                    self.start_button.style().polish(self.start_button)
                return
            set_text_if_changed(self.start_button, "Preparing")
            self.start_button.setProperty("runState", "processing")
            self.start_button.setEnabled(False)
            start_button_signature = (self.start_button.text(), self.start_button.property("runState"), self.start_button.isEnabled())
            if getattr(self, "_start_button_signature", None) != start_button_signature:
                self._start_button_signature = start_button_signature
                self.start_button.style().unpolish(self.start_button)
                self.start_button.style().polish(self.start_button)
            return
        if stop_in_progress:
            set_text_if_changed(self.start_button, "Start")
            self.start_button.setProperty("runState", "idle")
            self.start_button.setEnabled(False)
            start_button_signature = (self.start_button.text(), self.start_button.property("runState"), self.start_button.isEnabled())
            if getattr(self, "_start_button_signature", None) != start_button_signature:
                self._start_button_signature = start_button_signature
                self.start_button.style().unpolish(self.start_button)
                self.start_button.style().polish(self.start_button)
            return
        if state in {
            UIState.READY_TO_LISTEN,
            UIState.LISTENING,
            UIState.SPEECH_DETECTED,
            UIState.TRANSCRIBING,
            UIState.TRANSLATING,
        } or running:
            set_text_if_changed(self.start_button, "Stop")
            self.start_button.setProperty("runState", "listening")
            self.start_button.setEnabled(True)
        elif state == UIState.READY:
            set_text_if_changed(self.start_button, "Start")
            self.start_button.setProperty("runState", "idle")
            self.start_button.setEnabled(True)
        elif state in {UIState.STOPPED, UIState.PAUSED}:
            set_text_if_changed(self.start_button, "Start")
            self.start_button.setProperty("runState", "idle")
            self.start_button.setEnabled(True)
        elif state == UIState.ERROR:
            set_text_if_changed(self.start_button, "Fix Setup")
            self.start_button.setProperty("runState", "error")
            self.start_button.setEnabled(True)
        elif startup_worker_running or not self.engine_startup_ready:
            set_text_if_changed(self.start_button, "Preparing")
            self.start_button.setProperty("runState", "processing")
            self.start_button.setEnabled(not running)
        else:
            set_text_if_changed(self.start_button, "Start")
            self.start_button.setProperty("runState", "idle")
            self.start_button.setEnabled(True)
        start_button_signature = (self.start_button.text(), self.start_button.property("runState"), self.start_button.isEnabled())
        if getattr(self, "_start_button_signature", None) != start_button_signature:
            self._start_button_signature = start_button_signature
            self.start_button.style().unpolish(self.start_button)
            self.start_button.style().polish(self.start_button)

    def write_engine_readiness_report(self, state: UIState) -> None:
        try:
            fingerprint, payload = self._build_engine_readiness_payload(state)
            self._write_snapshot_if_changed("engine_readiness", fingerprint, "engine_readiness_latest.json", payload)
        except Exception as exc:
            self.log_event("WARN", "Could not write engine readiness report.", exc)

    def begin_startup_warmup(self) -> None:
        if self.startup_worker is not None and self.startup_worker.isRunning():
            return
        self.startup_worker = None
        self.engine_startup_ready = False
        self.model_preload_start_perf = perf_counter()
        self.model_preload_end_perf = None
        self.false_ready_prevented = True
        self.set_status(UIState.PREPARING)
        self.log_event(
            "INFO",
            "Preparing engine on startup. Please wait.",
            [
                "Loading ASR",
                "Loading translation",
                "Checking CUDA",
                "Calibrating microphone defaults",
            ],
        )
        self.startup_worker = StartupWarmupWorker(self.runtime)
        self.startup_worker.message.connect(lambda message: self.log_event("INFO", message))
        self.startup_worker.finished_result.connect(self.handle_startup_warmup_result)
        self.startup_worker.error.connect(
            lambda message, worker=self.startup_worker: self._handle_startup_warmup_error(worker, message)
        )
        self.startup_worker.finished.connect(lambda worker=self.startup_worker: self._clear_startup_worker(worker))
        self.startup_worker.start()

    def _begin_post_stop_warmup(self) -> None:
        try:
            self.begin_startup_warmup()
        except Exception as exc:
            self.log_event("WARN", "Could not schedule engine rewarm after stop.", exc)

    def _clear_startup_worker(self, worker: object | None = None) -> None:
        current_worker = getattr(self, "startup_worker", None)
        if worker is None or current_worker is worker:
            self.startup_worker = None

    def _clear_pending_start_after_ready(self) -> None:
        self._pending_start_after_ready = False

    def _runtime_tts_is_idle(self) -> bool:
        runtime_tts = getattr(self.runtime, "tts", None)
        if runtime_tts is None:
            return True
        is_runtime_idle = getattr(runtime_tts, "is_runtime_idle", None)
        if not callable(is_runtime_idle):
            return True
        try:
            return bool(is_runtime_idle())
        except Exception:
            return True

    def _request_pending_start_after_ready(self, reason: str) -> None:
        if not bool(getattr(self, "_pending_start_after_ready", False)):
            self.log_event("INFO", f"Start request queued until engine is ready. ({reason})")
        self._pending_start_after_ready = True

    def _launch_pending_start_after_ready(self) -> None:
        if not bool(getattr(self, "_pending_start_after_ready", False)):
            return
        if bool(getattr(self, "_stop_in_progress", False)):
            try:
                QTimer.singleShot(150, self._launch_pending_start_after_ready)
            except Exception:
                self._launch_pending_start_after_ready()
            return
        startup_worker = getattr(self, "startup_worker", None)
        if startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning():
            try:
                QTimer.singleShot(150, self._launch_pending_start_after_ready)
            except Exception:
                self._launch_pending_start_after_ready()
            return
        live_thread = getattr(self, "live_thread", None)
        if live_thread is not None and callable(getattr(live_thread, "isRunning", None)) and live_thread.isRunning():
            try:
                QTimer.singleShot(150, self._launch_pending_start_after_ready)
            except Exception:
                self._launch_pending_start_after_ready()
            return
        try:
            self.handle_start_capture()
        except Exception as exc:
            self.log_event("WARN", "Could not launch queued start request.", exc)

    def _handle_startup_warmup_error(self, worker: object | None, message: str) -> None:
        self._clear_startup_worker(worker)
        self.handle_worker_error(message)

    def _reset_tts_dispatch_state(self) -> None:
        reset_runtime_state = getattr(self.runtime.tts, "reset_runtime_state", None)
        try:
            if callable(reset_runtime_state):
                reset_runtime_state()
            else:
                self.runtime.tts.cancel_active_speech()
        except Exception as exc:
            self._last_playback_error = format_exception(exc)
            log_event = getattr(self, "log_event", None)
            if callable(log_event):
                log_event("WARN", "TTS runtime reset failed; falling back to cancel-only cleanup.", exc)
            try:
                self.runtime.tts.cancel_active_speech()
            except Exception:
                pass
        replay_runtime = getattr(self.runtime, "replay", None)
        reset_replay_state = getattr(replay_runtime, "reset_runtime_state", None)
        try:
            if callable(reset_replay_state):
                reset_replay_state()
        except Exception as exc:
            log_event = getattr(self, "log_event", None)
            if callable(log_event):
                log_event("WARN", "Replay queue reset failed during runtime cleanup.", exc)
        self.pending_tts_jobs.clear()
        self.pending_tts_segment_id = None
        self.pending_tts_autoplay = False
        self._pending_tts_drain_scheduled = False
        self._pending_playback_request_perf_by_path.clear()
        self._pending_playback_queue_perf_by_path.clear()
        self._pending_playback_worker_dequeue_perf_by_path.clear()
        self._pending_playback_backend_prep_start_perf_by_path.clear()
        self._pending_playback_backend_prep_end_perf_by_path.clear()
        self._pending_playback_backend_start_perf_by_path.clear()
        self._pending_playback_audio_start_perf_by_path.clear()
        self._pending_playback_backend_return_perf_by_path.clear()
        self._pending_playback_submit_perf_by_path.clear()
        self._pending_playback_segment_id_by_path.clear()

    def handle_startup_warmup_result(self, result: object) -> None:
        clear_startup_worker = getattr(self, "_clear_startup_worker", None)
        if callable(clear_startup_worker):
            clear_startup_worker()
        elif hasattr(self, "startup_worker"):
            try:
                self.startup_worker = None
            except Exception:
                pass
        if bool(getattr(self, "_startup_warmup_cancel_requested", False)):
            self._startup_warmup_cancel_requested = False
            self.engine_startup_ready = False
            self._request_status_refresh()
            return
        self.model_preload_end_perf = perf_counter()
        warmup_ready = False
        warmup_attempted = isinstance(result, dict)
        if isinstance(result, dict):
            asr_loaded = bool(result.get("asr_loaded", False))
            asr_warmup_loaded = bool(result.get("asr_warmup_loaded", False))
            translation_loaded = bool(result.get("translation_loaded", False))
            translation_warmup_loaded = bool(result.get("translation_warmup_loaded", False))
            tts_warmup_loaded = bool(result.get("tts_warmup_loaded", False))
            warmup_ready = _startup_warmup_is_ready(
                asr_loaded=asr_loaded,
                asr_warmup_loaded=asr_warmup_loaded,
                translation_loaded=translation_loaded,
                translation_warmup_loaded=translation_warmup_loaded,
                tts_warmup_loaded=tts_warmup_loaded,
            )
            self.log_event(
                "INFO",
                "Engine warmup completed.",
                {
                    "asr_loaded": asr_loaded,
                    "asr_model": result.get("asr_model", ""),
                    "asr_load_ms": int(result.get("asr_load_ms", 0) or 0),
                    "asr_warmup_loaded": asr_warmup_loaded,
                    "asr_warmup_ms": int(result.get("asr_warmup_ms", 0) or 0),
                    "asr_warmup_reused": bool(result.get("asr_warmup_reused", False)),
                    "asr_warmup_message": result.get("asr_warmup_message", ""),
                    "translation_loaded": translation_loaded,
                    "translation_engine": result.get("translation_engine", ""),
                    "translation_load_ms": int(result.get("translation_load_ms", 0) or 0),
                    "translation_warmup_loaded": translation_warmup_loaded,
                    "translation_warmup_ms": int(result.get("translation_warmup_ms", 0) or 0),
                    "translation_warmup_reused": bool(result.get("translation_warmup_reused", False)),
                    "translation_warmup_message": result.get("translation_warmup_message", ""),
                    "tts_warmup_loaded": tts_warmup_loaded,
                    "tts_warmup_ms": int(result.get("tts_warmup_ms", 0) or 0),
                    "tts_warmup_reused": bool(result.get("tts_warmup_reused", False)),
                    "tts_warmup_message": result.get("tts_warmup_message", ""),
                },
            )
            self.engine_startup_ready = warmup_ready
            try:
                write_json_report_async(
                    "model_runtime_optimization_latest.json",
                    build_model_runtime_optimization_payload(
                        asr_loader=self.runtime.asr_loader,
                        translation_model=self.runtime.translation_engine.primary_engine_name,
                        cuda_core_pass=self.runtime.cuda_core_ready(),
                        cpu_fallback_used=self.runtime.asr_loader.device == "cpu",
                        quality_downgraded=False,
                        warmup_status="ready" if warmup_ready else "partial",
                        warmup_ready=warmup_ready,
                        warmup_attempted=warmup_attempted,
                        asr_warmup_loaded=asr_warmup_loaded,
                        asr_warmup_ms=int(result.get("asr_warmup_ms", 0) or 0),
                        asr_warmup_reused=bool(result.get("asr_warmup_reused", False)),
                        translation_warmup_loaded=translation_warmup_loaded,
                        translation_warmup_ms=int(result.get("translation_warmup_ms", 0) or 0),
                        translation_warmup_reused=bool(result.get("translation_warmup_reused", False)),
                        tts_warmup_loaded=tts_warmup_loaded,
                        tts_warmup_ms=int(result.get("tts_warmup_ms", 0) or 0),
                        tts_warmup_reused=bool(result.get("tts_warmup_reused", False)),
                        warmup_note=(
                            "Startup warmup is complete for capture." if warmup_ready else "Startup warmup is partial; the engine remains in preparing state."
                        ),
                    ),
                )
            except Exception as exc:
                self.log_event("WARN", "Could not write runtime optimization report.", exc)
            if warmup_ready:
                live_thread = getattr(self, "live_thread", None)
                live_thread_running = bool(
                    live_thread is not None
                    and callable(getattr(live_thread, "isRunning", None))
                    and live_thread.isRunning()
                )
                pending_start_after_ready = bool(getattr(self, "_pending_start_after_ready", False))
                if not live_thread_running and not pending_start_after_ready:
                    self.set_status(UIState.READY)
            elif self.runtime.current_status in {UIState.PREPARING, UIState.STREAM_CHECK}:
                self.log_event("WARN", "Engine warmup is not complete yet; retrying until the engine is ready.")
                try:
                    schedule_rewarm = getattr(self, "_begin_post_stop_warmup", None)
                    if callable(schedule_rewarm):
                        QTimer.singleShot(250, schedule_rewarm)
                except Exception:
                    schedule_rewarm = getattr(self, "_begin_post_stop_warmup", None)
                    if callable(schedule_rewarm):
                        schedule_rewarm()
        else:
            self.engine_startup_ready = False
        if not warmup_ready and self.runtime.current_status in {UIState.PREPARING, UIState.STREAM_CHECK}:
            self.set_status(UIState.PREPARING)
        if warmup_attempted and not warmup_ready and bool(getattr(self, "_pending_start_after_ready", False)):
            self.log_event("WARN", "Engine warmup is not complete yet; start remains queued.")
        if warmup_ready and bool(getattr(self, "_pending_start_after_ready", False)):
            try:
                launch_pending_start = getattr(self, "_launch_pending_start_after_ready", None)
                if callable(launch_pending_start):
                    QTimer.singleShot(0, launch_pending_start)
                else:
                    self.handle_start_capture()
            except Exception:
                launch_pending_start = getattr(self, "_launch_pending_start_after_ready", None)
                if callable(launch_pending_start):
                    launch_pending_start()
        self._request_status_refresh()
        self.write_engine_health_snapshot("startup_warmup_complete")
        self.write_worker_health_snapshot("startup_warmup_complete")
        self.write_engine_stability_audit_snapshot("startup_warmup_complete")

    def show_replay_blocked_notification(self, row_type: str, segment_id: str | None = None) -> None:
        message = "Stop the engine to use Replay."
        status_widget_getter = getattr(self, "_status_message_widget", None)
        if callable(status_widget_getter):
            status_widget = status_widget_getter()
        else:
            status_widget = _status_message_widget(self)
        if status_widget is not None:
            status_widget.setText("Replay locked.")
            status_widget.setProperty("statusState", "warning")
            status_widget.style().unpolish(status_widget)
            status_widget.style().polish(status_widget)
        try:
            app = QApplication.instance()
            if app is None:
                raise RuntimeError("No QApplication available")
            try:
                dialog = QDialog(self)
            except TypeError:
                dialog = QDialog()
            dialog.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint)
            dialog.setModal(True)
            dialog.setObjectName("appRoot")
            dialog.setStyleSheet(build_operator_stylesheet())
            dialog.setMinimumWidth(460)
            layout = QVBoxLayout(dialog)
            layout.setContentsMargins(14, 14, 14, 14)
            layout.setSpacing(0)
            panel = QFrame()
            panel.setObjectName("panel")
            panel.setStyleSheet(
                """
QFrame#panel {
    background: #131C2B;
    border: 1px solid #23324A;
    border-radius: 12px;
}
"""
            )
            panel_layout = QVBoxLayout(panel)
            panel_layout.setContentsMargins(18, 16, 18, 18)
            panel_layout.setSpacing(14)
            title = QLabel("Replay Locked")
            title.setObjectName("panelTitle")
            body_row = QHBoxLayout()
            body_row.setSpacing(12)
            icon = QLabel("i")
            icon.setObjectName("avatar")
            icon.setFixedSize(28, 28)
            icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
            body = QLabel(message)
            body.setObjectName("sectionLabel")
            body.setWordWrap(True)
            body_row.addWidget(icon, 0, Qt.AlignmentFlag.AlignTop)
            body_row.addWidget(body, 1)
            ok_row = QHBoxLayout()
            ok_row.addStretch(1)
            ok_button = QPushButton("OK")
            ok_button.setObjectName("primaryButton")
            ok_button.setMinimumWidth(92)
            ok_button.setMaximumWidth(112)
            ok_button.setProperty("runState", "error")
            ok_button.clicked.connect(dialog.accept)
            ok_row.addWidget(ok_button)
            ok_row.addStretch(1)
            panel_layout.addWidget(title)
            panel_layout.addLayout(body_row)
            panel_layout.addLayout(ok_row)
            layout.addWidget(panel)
            dialog.adjustSize()
            dialog.open()
        except Exception:
            pass
        self.log_event(
            "WARN",
            "replay_blocked_capture_active",
            {"segment_id": segment_id or "", "row_type": row_type, "app_state": self.runtime.current_status.value},
        )
        try:
            if getattr(self, "replay_notification_timer", None) is not None:
                self.replay_notification_timer.stop()
        except Exception:
            pass
        try:
            self.replay_notification_timer = QTimer(self)
        except TypeError:
            self.replay_notification_timer = QTimer()
        self.replay_notification_timer.setSingleShot(True)
        self.replay_notification_timer.timeout.connect(self.refresh_status_panel)
        self.replay_notification_timer.start(3500)

    def set_level(self, value: int) -> None:
        self.level_bar.setValue(max(0, min(100, value)))

    def set_input_state(self, state: str) -> None:
        self.level_state_label.setText(f"Mic level: {state}")

    def handle_primary_start_stop(self) -> None:
        live_thread = getattr(self, "live_thread", None)
        startup_worker = getattr(self, "startup_worker", None)
        live_thread_running = bool(live_thread is not None and callable(getattr(live_thread, "isRunning", None)) and live_thread.isRunning())
        startup_worker_running = bool(startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning())
        pending_start_after_ready = bool(getattr(self, "_pending_start_after_ready", False))
        if live_thread_running or startup_worker_running or pending_start_after_ready or bool(getattr(self, "_stop_in_progress", False)):
            self.handle_stop_capture()
        else:
            self.handle_start_capture()

    def handle_run_diagnostic(self) -> None:
        if self.diagnostic_worker is not None and self.diagnostic_worker.isRunning():
            self.log_event("WARN", "Diagnostic already running.")
            return
        self.diagnostic_worker = DiagnosticWorker(
            self.runtime,
            self.selected_device_id(),
            self.runtime.audio_settings.input_sensitivity,
        )
        self.diagnostic_worker.message.connect(lambda message: self.log_event("INFO", message))
        self.diagnostic_worker.finished_result.connect(self.handle_diagnostic_result)
        self.diagnostic_worker.error.connect(self.handle_worker_error)
        self.log_event("INFO", "Microphone diagnostic started. Stay silent, then speak when prompted.")
        self.diagnostic_worker.start()

    def handle_diagnostic_result(self, result: MicrophoneDiagnosticResult) -> None:
        diagnosis_line = f"{result.diagnostic_label} ({result.diagnostic_code})" if result.diagnostic_code else result.diagnostic_label
        recommendation = result.recommendation or "No recommendation available."
        can_reuse_for_calibration = result.diagnostic_code in {"usable", "too_quiet"}
        if can_reuse_for_calibration and (result.usable_input or self.runtime.audio_settings.allow_low_but_usable_input):
            recommended_preset = self.runtime.calibration.recommend_preset(result.rms, result.noise_floor_rms, result.peak)
            self.runtime.current_calibration = CalibrationResult(
                noise_floor_rms=result.noise_floor_rms,
                speech_rms=result.speech_rms,
                peak_level=result.speech_peak,
                clipping_risk=1.0 if result.clipping else result.peak,
                speech_to_noise_gap=result.speech_to_noise_gap,
                speech_to_noise_ratio=result.speech_to_noise_ratio,
                voiced_frame_ratio=result.voiced_frame_ratio,
                final_vad_threshold=result.final_vad_threshold,
                recommended_preset=recommended_preset,
                input_state=result.input_state,
                capture_allowed=result.usable_input or self.runtime.audio_settings.allow_low_but_usable_input,
            )
        self.calibration_result_label.setText(
            f"{result.message} | {diagnosis_line} | noise floor {result.noise_floor_rms:.5f} | "
            f"RMS {result.rms:.5f} | peak {result.peak:.3f} | clipping {result.clipping} | "
            f"usable {'yes' if result.usable_input else 'no'} | {recommendation}"
        )
        self.level_bar.setValue(int(max(0.0, min(1.0, result.peak)) * 100))
        log_message = f"Microphone diagnostic completed: {diagnosis_line}."
        self.log_event("INFO" if result.usable_input else "WARN", log_message, result.to_dict())
        self._request_status_refresh()

    def handle_start_capture(self) -> None:
        if bool(getattr(self, "_stop_in_progress", False)):
            self.log_event("WARN", "Stop is still finishing. Please wait.")
            self._request_pending_start_after_ready("stop still finishing")
            self.set_status(UIState.PREPARING)
            self._request_status_refresh()
            return
        if bool(getattr(self, "_restart_settle_pending", False)):
            self._restart_settle_pending = False
        else:
            stop_completed_time = str(getattr(self, "_stop_completed_time", "") or "")
            if stop_completed_time:
                try:
                    restart_settle_elapsed_ms = _delta_ms_from_iso(
                        stop_completed_time,
                        datetime.now().astimezone().isoformat(timespec="milliseconds"),
                    )
                except Exception:
                    restart_settle_elapsed_ms = None
                if restart_settle_elapsed_ms is not None and restart_settle_elapsed_ms < 250:
                    delay_ms = max(50, 250 - restart_settle_elapsed_ms)
                    self._restart_settle_pending = True
                    self.log_event(
                        "INFO",
                        f"Restart settling for {delay_ms} ms before reopening microphone stream.",
                    )
                    try:
                        QTimer.singleShot(delay_ms, self.handle_start_capture)
                    except Exception:
                        self._restart_settle_pending = True
                        self.handle_start_capture()
                    return
        self._startup_warmup_cancel_requested = False
        if self.live_thread is not None and self.live_thread.isRunning():
            self.log_event("WARN", "Capture is already active.")
            return
        self._clear_pending_start_after_ready()
        self._reset_tts_dispatch_state()
        invalidate_benchmark_summary_cache = getattr(self, "_invalidate_benchmark_summary_cache", None)
        if callable(invalidate_benchmark_summary_cache):
            invalidate_benchmark_summary_cache()
        if not self.engine_startup_ready:
            if self.startup_worker is None or not self.startup_worker.isRunning():
                self._begin_post_stop_warmup()
            self.log_event("INFO", "Engine is still preparing. Please wait.")
            self._request_pending_start_after_ready("engine still preparing")
            self.set_status(UIState.PREPARING)
            self._request_status_refresh()
            return
        self._capture_generation += 1
        now_perf = perf_counter()
        self.start_pressed_perf = now_perf
        self.start_pressed_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._stop_requested_time = ""
        self._stop_completed_time = ""
        self._stale_callbacks_rejected = 0
        self._last_worker_error = ""
        self._last_playback_error = ""
        self._last_lifecycle_error = ""
        self.pending_tts_jobs.clear()
        self.pending_tts_segment_id = None
        self._pending_playback_request_perf_by_path.clear()
        self._pending_playback_queue_perf_by_path.clear()
        self._pending_playback_worker_dequeue_perf_by_path.clear()
        self._pending_playback_backend_start_perf_by_path.clear()
        self._pending_playback_audio_start_perf_by_path.clear()
        self._pending_playback_backend_return_perf_by_path.clear()
        self._pending_playback_submit_perf_by_path.clear()
        self._active_latency_dialog = None
        self._ui_latency_modal_open = False
        self.ready_to_listen_perf = None
        self.ready_to_listen_time = ""
        self.stream_open_start_perf = None
        self.stream_open_end_perf = None
        self.first_audio_callback_perf = None
        self.warmup_perf = None
        self.false_ready_prevented = True
        self.set_status(UIState.PREPARING)
        self.log_event(
            "INFO",
            "Preparing engine. Please wait.",
            [
                "Loading ASR",
                "Loading translation",
                "Checking CUDA",
                "Starting microphone stream",
                "Applying calibration",
                "Preparing pipeline",
            ],
        )
        selected_mode = self.selected_capture_mode()
        selected_device_id = self.selected_device_id()
        self.runtime.refresh_cuda_status(write_reports=False)
        real_mode = selected_mode in {CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION, CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION}
        self.runtime.apply_asr_device_policy()
        if real_mode and not self.runtime.cuda_core_ready():
            if self.runtime.cpu_degraded_mode_enabled:
                self.log_event(
                    "WARN",
                    "CPU DEGRADED MODE - slower, not target performance. Real ASR is running without CUDA Core pass.",
                )
            else:
                self.set_status(UIState.ERROR)
                blocker = self.runtime.cuda_status.blocker if self.runtime.cuda_status else "CUDA validation has not run."
                self.log_event(
                    "ERROR",
                    "Real ASR mode blocked because CUDA_CORE_PASS is not achieved.",
                    blocker,
                )
                return
        if real_mode and self.runtime.cpu_degraded_mode_enabled:
            self.log_event(
                "WARN",
                "CPU DEGRADED MODE - slower, not target performance. Real ASR is running without CUDA Core pass.",
            )
        if selected_mode != CAPTURE_MODE_MOCK_PIPELINE:
            validation = self.runtime.capture.validate_device_selection(selected_device_id)
            if not validation.valid:
                self.set_status(UIState.ERROR)
                self.log_event("ERROR", validation.message, validation.warnings)
                return
            if self.runtime.current_calibration is None and selected_mode != CAPTURE_MODE_DIAGNOSTIC_ONLY:
                self.log_event("WARN", "No calibration exists. The live worker will run calibration first.")
        self.stream_open_start_perf = perf_counter()
        self.live_thread = LivePipelineThread(
            self.runtime,
            selected_device_id=selected_device_id,
            developer_mode=bool(getattr(getattr(self, "developer_toggle", None), "isChecked", lambda: False)()),
            capture_mode=selected_mode,
            calibration=self.runtime.current_calibration,
        )
        self.live_thread.message.connect(lambda message: self.log_event("INFO", message))
        self.live_thread.status_changed.connect(lambda value: self.set_status(UIState(value)))
        self.live_thread.level_changed.connect(self.set_level)
        self.live_thread.input_state_changed.connect(self.set_input_state)
        self.live_thread.calibration_ready.connect(self.handle_pipeline_calibration)
        self.live_thread.segment_ready.connect(self._on_pipeline_segment_ready)
        self.live_thread.error.connect(self.handle_pipeline_error)
        self.live_thread.finished_signal.connect(self.handle_pipeline_finished)
        self.stop_button.setEnabled(True)
        self._log_pipeline_trace(
            "app_listening_started",
            stage="ui",
            status="started",
            details={"capture_mode": selected_mode, "device_id": selected_device_id if selected_device_id is not None else "default"},
            fallback=self.runtime.session.session_id,
        )
        self.log_event("INFO", f"Capture started in mode: {selected_mode}")
        self.write_engine_health_snapshot("start_requested")
        self.write_worker_health_snapshot("start_requested")
        self.write_cache_session_guard_snapshot("start_requested")
        self.write_start_stop_lifecycle_snapshot("start_requested")
        self._pipeline_result_flush_timer.start()
        self.live_thread.start()

    def handle_stop_capture(self) -> None:
        startup_worker = getattr(self, "startup_worker", None)
        startup_worker_running = bool(startup_worker is not None and callable(getattr(startup_worker, "isRunning", None)) and startup_worker.isRunning())
        live_thread_running = bool(self.live_thread is not None and callable(getattr(self.live_thread, "isRunning", None)) and self.live_thread.isRunning())
        pending_start_after_ready = bool(getattr(self, "_pending_start_after_ready", False))
        if pending_start_after_ready and not live_thread_running and not startup_worker_running:
            self._clear_pending_start_after_ready()
            self._startup_warmup_cancel_requested = False
            self._stop_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self._stop_completed_time = self._stop_requested_time
            self.log_event("INFO", "Queued start request cancelled.")
            self.set_status(UIState.READY if self.engine_startup_ready else UIState.STOPPED)
            self.write_engine_health_snapshot("queued_start_cancelled")
            self.write_worker_health_snapshot("queued_start_cancelled")
            self.write_start_stop_lifecycle_snapshot("queued_start_cancelled")
            return
        if not live_thread_running and startup_worker_running:
            self._startup_warmup_cancel_requested = True
            self._clear_pending_start_after_ready()
            self.engine_startup_ready = False
            self._stop_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self._stop_completed_time = self._stop_requested_time
            self.log_event("INFO", "Startup warmup cancel requested.")
            self.set_status(UIState.STOPPED)
            self.write_engine_health_snapshot("startup_warmup_cancel_requested")
            self.write_worker_health_snapshot("startup_warmup_cancel_requested")
            self.write_start_stop_lifecycle_snapshot("startup_warmup_cancel_requested")
            return
        if self.live_thread is not None and self.live_thread.isRunning():
            self._stop_in_progress = True
            self._clear_pending_start_after_ready()
            self._stop_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self._stale_callbacks_rejected = int(getattr(self.live_thread, "stale_callbacks_rejected_count", 0))
            self._reset_tts_dispatch_state()
            invalidate_benchmark_summary_cache = getattr(self, "_invalidate_benchmark_summary_cache", None)
            if callable(invalidate_benchmark_summary_cache):
                invalidate_benchmark_summary_cache()
            self._capture_generation += 1
            self._stopwatch_alignment_event_count_cache.clear()
            self._health_snapshot_cache.clear()
            self._session_benchmark_report_signature = None
            self._session_benchmark_report_cache = None
            self._benchmark_panel_signature = None
            self.live_thread.request_stop()
            self.log_event("INFO", "Capture stop requested.")
            self.set_status(UIState.STOPPED)
            self.stop_button.setEnabled(False)
            self.write_engine_health_snapshot("stop_requested")
            self.write_worker_health_snapshot("stop_requested")
            self.write_start_stop_lifecycle_snapshot("stop_requested")
            return
        self.log_event("INFO", "Capture is not active.")

    def add_transcript_card(self, card: TranscriptCardViewModel, segment: TranscriptSegment | None = None) -> None:
        segment = segment or self.find_segment(card.segment_id)
        self._log_pipeline_trace(
            "ui_update_requested",
            segment=segment,
            stage="ui",
            status="requested",
            details={"segment_id": card.segment_id, "has_segment": segment is not None},
        )
        try:
            self._log_pipeline_trace(
                "ui_card_create_or_update_started",
                segment=segment,
                stage="ui",
                status="started",
                details={"segment_id": card.segment_id},
            )
            existing_widget = self.transcript_widgets_by_segment_id.get(card.segment_id)
            if existing_widget is not None:
                current_fingerprint_builder = getattr(existing_widget, "_make_view_model_fingerprint", None)
                current_fingerprint = getattr(existing_widget, "_view_model_fingerprint", None)
                next_fingerprint = None
                if callable(current_fingerprint_builder):
                    try:
                        next_fingerprint = current_fingerprint_builder(card)
                    except Exception:
                        next_fingerprint = None
                if next_fingerprint is not None and next_fingerprint == current_fingerprint:
                    widget = existing_widget
                else:
                    existing_widget.update_view_model(card)
                    widget = existing_widget
            else:
                widget = TranscriptCardWidget(
                    card,
                    on_replay_source=lambda current_card=card: self.handle_replay_card(current_card),
                    on_replay_translation=lambda current_card=card: self.handle_speak_translation(current_card),
                    on_show_latency=(lambda current_segment=segment: self.show_latency_details(current_segment) if current_segment is not None else None),
                )
                self.transcript_widgets_by_segment_id[card.segment_id] = widget
                self.transcript_layout.insertWidget(self.transcript_layout.count() - 1, widget)
            self.empty_state_label.hide()
            self._log_pipeline_trace(
                "ui_card_create_or_update_completed",
                segment=segment,
                stage="ui",
                status="completed",
                details={"segment_id": card.segment_id},
            )
        except Exception as exc:
            self._log_pipeline_trace(
                "ui_card_render_exception",
                segment=segment,
                stage="ui",
                status="failed",
                details={"segment_id": card.segment_id, "error": format_exception(exc)},
            )
            self.log_event("ERROR", "Transcript card render failed.", exc)

    def _build_transcript_card_view_model(self, segment: TranscriptSegment) -> TranscriptCardViewModel:
        cache_key = str(getattr(segment, "segment_id", ""))
        fingerprint_builder = getattr(self, "_segment_card_view_model_fingerprint", None)
        if callable(fingerprint_builder):
            fingerprint = fingerprint_builder(segment)
        else:
            fingerprint = (
                getattr(segment, "segment_id", ""),
                getattr(segment, "input_text", ""),
                getattr(segment, "translated_text", ""),
                getattr(segment, "created_at_iso", ""),
            )
        cached_card = self._transcript_card_vm_cache.get(cache_key)
        if cached_card is not None and cached_card[0] == fingerprint:
            return cached_card[1]
        try:
            view_model = TranscriptCardViewModel.from_segment(segment)
            self._transcript_card_vm_cache[cache_key] = (fingerprint, view_model)
            return view_model
        except Exception as exc:
            self._log_pipeline_trace(
                "ui_card_model_build_failed",
                segment=segment,
                stage="ui",
                status="failed",
                details={"segment_id": getattr(segment, "segment_id", "unavailable"), "error": format_exception(exc)},
            )
            self.log_event("WARN", "Transcript card fallback used.", exc)
            source_text = (
                getattr(segment, "source_text", "")
                or getattr(segment, "text", "")
                or getattr(segment, "transcript", "")
                or getattr(segment, "input_text", "")
                or "[no transcript text]"
            )
            translated_text_value = (
                getattr(segment, "translated_text", "")
                or getattr(segment, "translation", "")
                or getattr(segment, "target_text", "")
            )
            if translated_text_value:
                translated_text = translated_text_value
            elif str(getattr(segment.quality, "status", "")).startswith("Rejected"):
                translated_text = "[No translation for rejected segment]"
            else:
                translated_text = "[Translation pending local model]"
            try:
                created_at = datetime.fromisoformat(getattr(segment, "created_at_iso", ""))
                timestamp_label = created_at.strftime("%H:%M:%S")
            except Exception:
                timestamp_label = f"{getattr(segment, 'start_time_ms', 0)} ms - {getattr(segment, 'end_time_ms', 0)} ms"
            view_model = TranscriptCardViewModel(
                segment_id=getattr(segment, "segment_id", "unavailable"),
                session_id=getattr(segment, "session_id", "unavailable"),
                source_text=source_text,
                translated_text=translated_text,
                timestamp_label=timestamp_label,
                total_latency_label=_format_transcript_card_latency_label(getattr(segment, "latency", None)),
                quality_label=str(getattr(segment.quality, "status", "Unknown") or "Unknown"),
                asr_model_label=str(getattr(segment, "asr_model_used", "") or "ASR model pending"),
                translation_engine_label=str(getattr(segment, "translation_engine_used", "") or "Translation engine pending"),
                compute_label=(
                    "GPU CUDA"
                    if getattr(segment, "asr_device_used", "") == "cuda"
                    else ("CPU Degraded" if getattr(segment, "asr_device_used", "") == "cpu" else "Demo")
                ),
                can_replay_source=bool(
                    getattr(segment.replay, "source_replay_available", False)
                    or (
                        getattr(segment.replay, "source_audio_path", None) is not None
                        and Path(getattr(segment.replay, "source_audio_path")).exists()
                    )
                ),
                can_replay_translation=bool(
                    getattr(segment.replay, "target_voice_available", False)
                    or (
                        getattr(segment.replay, "translated_audio_path", None) is not None
                        and Path(getattr(segment.replay, "translated_audio_path")).exists()
                    )
                ),
                translation_placeholder=not bool(translated_text_value),
                source_audio_path=getattr(segment.replay, "source_audio_path", None),
                translated_audio_path=getattr(segment.replay, "translated_audio_path", None),
            )
            self._transcript_card_vm_cache[cache_key] = (fingerprint, view_model)
            return view_model

    def show_latency_details(self, segment: TranscriptSegment | None) -> None:
        if segment is None:
            self.log_event("WARN", "Latency details requested, but segment was not found.")
            self.write_ui_interaction_health_snapshot(
                None,
                latency_badge_clicked=True,
                modal_opened=False,
                modal_error="missing_segment",
            )
            return
        try:
            self.log_event("INFO", "Latency details requested.", segment.segment_id)
            dialog = LatencyDetailsDialog(segment, self)
            self._active_latency_dialog = dialog
            self._ui_latency_modal_open = True
            self._last_ui_latency_segment_id = segment.segment_id
            dialog.finished.connect(lambda _: setattr(self, "_active_latency_dialog", None))
            self.write_ui_interaction_health_snapshot(
                segment,
                latency_badge_clicked=True,
                modal_opened=True,
                modal_error="",
            )
            dialog.exec()
            self._active_latency_dialog = None
            self._ui_latency_modal_open = False
            self.log_event("INFO", "Latency details dialog closed.", segment.segment_id)
        except Exception as exc:
            self._active_latency_dialog = None
            self._ui_latency_modal_open = False
            self.write_ui_interaction_health_snapshot(
                segment,
                latency_badge_clicked=True,
                modal_opened=False,
                modal_error=str(exc),
            )
            self.log_event("ERROR", "Could not open latency details dialog.", exc)

    def find_segment(self, segment_id: str) -> TranscriptSegment | None:
        for segment in self.runtime.session.segments:
            if segment.segment_id == segment_id:
                return segment
        return None

    def _pipeline_trace_id(self, segment: TranscriptSegment | None = None, *, fallback: str = "") -> str:
        if segment is not None and getattr(segment, "trace_id", ""):
            return str(getattr(segment, "trace_id", ""))
        if segment is not None and getattr(segment, "segment_id", ""):
            return f"trace-{segment.segment_id}"
        if fallback:
            return f"trace-{fallback}"
        return "unavailable"

    def _log_pipeline_trace(
        self,
        event: str,
        *,
        segment: TranscriptSegment | None = None,
        stage: str = "",
        status: str = "",
        details: object | None = None,
        fallback: str = "",
    ) -> None:
        try:
            append_runtime_pipeline_log(
                self._pipeline_trace_id(segment, fallback=fallback),
                event,
                stage=stage,
                segment_id=getattr(segment, "segment_id", fallback),
                status=status,
                details=details,
            )
        except Exception:
            pass

    def _on_pipeline_segment_ready(self, result: PipelineSegmentResult) -> None:
        segment = getattr(result, "segment", None)
        self._log_pipeline_trace(
            "segment_ready_received",
            segment=segment,
            stage="ui",
            status="received",
            details={
                "segment_id": getattr(segment, "segment_id", "unavailable"),
                "accepted": bool(getattr(result, "accepted", False)),
            },
        )
        self._drain_pending_pipeline_results()

    def _drain_pending_pipeline_results(self) -> None:
        pending_results = self.runtime.drain_pipeline_results()
        if not pending_results:
            return
        for result in pending_results:
            segment = getattr(result, "segment", None)
            segment_id = str(getattr(segment, "segment_id", "") or "")
            if segment_id and segment_id in self._processed_pipeline_segment_ids:
                self._log_pipeline_trace(
                    "segment_ready_duplicate_skipped",
                    segment=segment,
                    stage="ui",
                    status="skipped",
                    details={"segment_id": segment_id},
                )
                continue
            try:
                self.handle_pipeline_segment(result)
            except Exception as exc:
                self._log_pipeline_trace(
                    "segment_delivery_handle_failed",
                    segment=segment,
                    stage="ui",
                    status="failed",
                    details={
                        "segment_id": segment_id or "unavailable",
                        "error": format_exception(exc),
                    },
                )
                self.log_event("ERROR", "Pending pipeline segment delivery failed.", exc)

    def handle_pipeline_calibration(self, calibration: object) -> None:
        if isinstance(calibration, CalibrationResult):
            self.runtime.current_calibration = calibration
            self.calibration_result_label.setText(
                f"Calibration ready | noise floor {calibration.noise_floor_rms:.5f} | "
                f"RMS {calibration.speech_rms:.5f} | peak {calibration.peak_level:.3f} | "
                f"usable {calibration.capture_allowed}"
            )
            self.log_event("INFO", "Calibration ready.", calibration.to_dict())
            try:
                write_json_report_async(
                    "microphone_threshold_debug_latest.json",
                    {
                        "selected_device": self.device_combo.currentText(),
                        "sample_rate": self.runtime.preprocessor.target_sample_rate,
                        "channels": 1,
                        "dtype": "float32",
                        "noise_rms": calibration.noise_floor_rms,
                        "noise_peak": 0.0,
                        "speech_rms": calibration.speech_rms,
                        "speech_peak": calibration.peak_level,
                        "speech_to_noise_ratio": calibration.speech_to_noise_ratio,
                        "voiced_frame_ratio": calibration.voiced_frame_ratio,
                        "selected_sensitivity": self.runtime.audio_settings.input_sensitivity,
                        "final_vad_threshold": calibration.final_vad_threshold,
                        "final_classification": calibration.input_state,
                        "capture_allowed": calibration.capture_allowed,
                        "vad_reason_if_rejected": "" if calibration.capture_allowed else calibration.input_state,
                        "audio_scale_min_max": [-1.0, 1.0],
                    },
                )
            except Exception as exc:
                self.log_event("WARN", "Could not write microphone threshold debug report.", exc)

    def handle_pipeline_segment(self, result: PipelineSegmentResult) -> None:
        segment = getattr(result, "segment", None)
        segment_id = str(getattr(segment, "segment_id", "") or "")
        if segment is None or getattr(segment, "latency", None) is None or getattr(segment, "quality", None) is None or getattr(segment, "replay", None) is None:
            self.log_event(
                "WARN",
                "Pipeline segment missing required runtime fields; dropping event to protect launcher stability.",
                {"segment_id": segment_id or "unknown"},
            )
            self._log_pipeline_trace(
                "segment_delivery_handle_failed",
                segment=segment,
                stage="ui",
                status="failed",
                details={
                    "segment_id": segment_id or "unknown",
                    "error": "segment missing latency/quality/replay runtime fields",
                },
            )
            return
        if segment_id and segment_id in self._processed_pipeline_segment_ids:
            self._log_pipeline_trace(
                "segment_delivery_duplicate_skipped",
                segment=segment,
                stage="ui",
                status="skipped",
                details={"segment_id": segment_id},
            )
            return
        if segment_id:
            self._processed_pipeline_segment_ids.add(segment_id)
        ui_started = perf_counter()
        visible = self.runtime.add_pipeline_segment(segment)
        if result.accepted and not visible:
            if self.runtime.rejected_count > 0:
                self.runtime.rejected_count -= 1
            self.runtime.session.add_segment(segment)
            self.runtime.accepted_count += 1
            visible = True
            self._log_pipeline_trace(
                "segment_visibility_recovered",
                segment=segment,
                stage="ui",
                status="recovered",
                details={
                    "segment_id": segment.segment_id,
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                },
            )
            self.log_event(
                "WARN",
                "Accepted segment failed visibility gate; recovered for UI presentation.",
                segment.segment_id,
            )
        segment.latency.ui_ms = int((perf_counter() - ui_started) * 1000)
        segment.latency.ui_emit_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._log_pipeline_trace(
            "segment_accepted_or_rejected",
            segment=segment,
            stage="ui",
            status="accepted" if result.accepted and visible else "rejected",
            details={
                "visible": visible,
                "accepted": result.accepted,
                "rejection_reason": result.rejection_reason or "unavailable",
                "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
            },
        )
        if visible:
            visible_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            if not segment.latency.transcript_text_ready_time:
                segment.latency.transcript_text_ready_time = segment.latency.asr_end_time or visible_time
            if not segment.latency.translation_text_ready_time:
                segment.latency.translation_text_ready_time = (
                    segment.latency.translation_end_time
                    or segment.latency.transcript_text_ready_time
                    or visible_time
                )
            segment.latency.transcript_text_visible_time = visible_time
            segment.latency.translation_text_visible_time = visible_time
            if segment.translated_text.strip():
                self.start_tts_generation(segment, autoplay=self.auto_play_out_voice)
            try:
                card = self._build_transcript_card_view_model(segment)
                self.add_transcript_card(card, segment)
            except Exception as exc:
                self._log_pipeline_trace(
                    "ui_card_render_exception",
                    segment=segment,
                    stage="ui",
                    status="failed",
                    details={"segment_id": segment.segment_id, "error": format_exception(exc)},
                )
                self.log_event("ERROR", "Transcript card render failed.", exc)
            self.log_event(
                "INFO",
                f"Accepted {segment.segment_id}",
                f"ASR {result.asr_status}; translation {result.translation_status}",
            )
            self._write_text_latency_reports(segment, accepted=True)
            self.write_short_path_guard_snapshot(segment, "accepted_segment")
            self.write_long_turn_safety_snapshot(segment, "accepted_segment")
            self.write_cache_session_guard_snapshot("accepted_segment", segment=segment)
            self.write_engine_health_snapshot("accepted_segment", segment=segment)
            self.write_worker_health_snapshot("accepted_segment", segment=segment)
            invalidate_benchmark_summary_cache = getattr(self, "_invalidate_benchmark_summary_cache", None)
            if callable(invalidate_benchmark_summary_cache):
                invalidate_benchmark_summary_cache()
        else:
            reason = result.rejection_reason or segment.quality.notes or segment.quality.status
            self.log_rejected(f"{segment.segment_id}: {reason}")
            self.write_cache_session_guard_snapshot("rejected_segment", segment=segment)
            self.write_engine_health_snapshot("rejected_segment", segment=segment)
        if result.event_messages:
            for message in result.event_messages:
                self.log_event("INFO", message)
        try:
            self._schedule_session_persist()
            trace = self._segment_trace(segment)
            bundle = self._build_latency_report_bundle(segment)
            metric_groups = bundle["metric_groups"]
            if segment.latency.speech_start_perf_ns > 0:
                trace.mark_at(
                    "speech_start",
                    segment.latency.speech_start_perf_ns,
                    "LivePipelineThread",
                    "speech start detected by VAD at first voiced frame",
                )
            else:
                trace.mark("speech_start", "LivePipelineThread", "speech start accepted by VAD")
            if segment.latency.speech_end_perf_ns > 0:
                trace.mark_at(
                    "speech_end",
                    segment.latency.speech_end_perf_ns,
                    "LivePipelineThread",
                    "speech end detected by endpointing",
                )
            else:
                trace.mark("speech_end", "LivePipelineThread", "speech end accepted by endpointing")
            engine_ready_ms = 0
            if self.ready_to_listen_perf is not None and self.start_pressed_perf is not None:
                engine_ready_ms = int(max(0.0, (self.ready_to_listen_perf - self.start_pressed_perf) * 1000))
            segment_timing = {
                "segment_candidate_start_time": segment.latency.segment_candidate_start_time,
                "first_energy_above_noise_time": segment.latency.first_energy_above_noise_time,
                "first_voiced_frame_time": segment.latency.first_voiced_frame_time,
                "first_confirmed_speech_time": segment.latency.first_confirmed_speech_time,
                "first_user_speech_time": segment.latency.first_user_speech_time,
                "speech_detect_time": segment.latency.first_voiced_frame_time,
                "speech_detect_ms": int(max(0, segment.latency.speech_detection_ms or segment.latency.vad_speech_detect_ms)),
                "speech_confirmation_ms": segment.latency.speech_confirmation_ms,
                "speech_end_time": segment.latency.speech_end_time,
                "endpoint_decision_time": segment.latency.endpoint_decision_time,
                "asr_queue_enter_time": segment.latency.asr_queue_enter_time,
                "asr_queue_submit_time": segment.latency.asr_queue_submit_time or segment.latency.asr_queue_enter_time,
                "asr_worker_start_time": segment.latency.asr_worker_start_time or segment.latency.asr_start_time,
                "asr_start_time": segment.latency.asr_start_time,
                "asr_end_time": segment.latency.asr_end_time,
                "transcript_text_ready_time": segment.latency.transcript_text_ready_time or segment.latency.asr_end_time,
                "translation_start_time": segment.latency.translation_start_time,
                "translation_end_time": segment.latency.translation_end_time,
                "translate_queue_submit_time": segment.latency.translate_queue_submit_time or segment.latency.translation_start_time,
                "translate_worker_start_time": segment.latency.translate_worker_start_time or segment.latency.translation_start_time,
                "translation_text_ready_time": segment.latency.translation_text_ready_time or segment.latency.translation_end_time,
                "transcript_text_visible_time": segment.latency.transcript_text_visible_time,
                "translation_text_visible_time": segment.latency.translation_text_visible_time,
                "tts_start_time": segment.latency.tts_start_time,
                "tts_end_time": segment.latency.tts_end_time,
            }
            write_json_report_async(
                "latency_debug_latest.json",
                {
                    "session_id": self.runtime.session.session_id,
                    "segment_id": segment.segment_id,
                    "segment_timestamp": segment.created_at_iso,
                    "segment_timing": segment_timing,
                    "text_latency": bundle["text_latency"],
                    "text_latency_breakdown": bundle["text_latency_breakdown"],
                    "audio_verify_breakdown": bundle["audio_verify_breakdown"],
                    "stt_breakdown": bundle["stt_breakdown"],
                    "translate_breakdown": bundle["translate_breakdown"],
                    "tts_breakdown": bundle["tts_breakdown"],
                    "metric_groups": metric_groups,
                    "main_bottleneck_stage": metric_groups["main_bottleneck_stage"],
                    "main_bottleneck_reason": metric_groups["main_bottleneck_reason"],
                    "audio_verify_bottleneck": metric_groups["audio_verify_bottleneck"],
                    "stt_bottleneck": metric_groups["stt_bottleneck"],
                    "translate_bottleneck": metric_groups["translate_bottleneck"],
                    "tts_bottleneck": metric_groups["tts_bottleneck"],
                    "accepted": result.accepted,
                    "rejection_reason": result.rejection_reason,
                    "asr_status": result.asr_status,
                    "translation_status": result.translation_status,
                    "event_messages": result.event_messages or [],
                    "active_asr_device": self.runtime.asr_loader.device,
                    "active_asr_compute_type": self.runtime.asr_loader.compute_type,
                    "cuda_core_status": self.runtime.cuda_status.core_status if self.runtime.cuda_status else "",
                    "adaptive_audio_verify": {
                        "endpoint_profile_used": segment.latency.endpoint_profile_used,
                        "adaptive_endpoint_reason": segment.latency.bottleneck_reason,
                        "adaptive_endpoint_target_ms": segment.latency.endpoint_wait_ms,
                        "actual_endpoint_wait_ms": segment.latency.endpoint_wait_ms,
                        "speech_duration_ms": segment.latency.speech_duration_ms,
                        "trailing_silence_ms": segment.latency.trailing_silence_ms,
                        "speech_to_noise_ratio": segment.quality.speech_to_noise_gap,
                        "voiced_frame_ratio": segment.quality.voiced_frame_ratio,
                        "final_decision": "accepted" if result.accepted else "rejected",
                    },
                },
            )
            write_json_report_async(
                "stt_debug_latest.json",
                {
                    "session_id": self.runtime.session.session_id,
                    "segment_id": segment.segment_id,
                    "segment_timestamp": segment.created_at_iso,
                    "stt_breakdown": bundle["stt_breakdown"],
                    "asr_model_name": self.runtime.asr_loader.default_profile().model_name,
                    "asr_device": self.runtime.asr_loader.device,
                    "asr_compute_type": self.runtime.asr_loader.compute_type,
                    "cuda_active": bool(self.runtime.cuda_status and self.runtime.cuda_status.core_status),
                    "model_loaded_before_segment": bool(getattr(self.runtime.asr_loader, "model_loaded_before_segment", True)),
                    "warmup_segment": bool(getattr(segment.latency, "model_load_ms", 0) > 0),
                    "asr_model_loaded_at": self.runtime.asr_loader.last_loaded_at_iso,
                    "asr_model_load_ms": self.runtime.asr_loader.last_load_ms,
                    "asr_warmup_at": self.runtime.asr_loader.last_warmup_at_iso,
                    "asr_warmup_ms": self.runtime.asr_loader.last_warmup_ms,
                    "asr_model_reload_count": self.runtime.asr_loader.model_reload_count,
                    "asr_warmup_count": self.runtime.asr_loader.warmup_count,
                    "queue_wait_status": "measured",
                    "quality_mode_active": "default-quality",
                    "low_latency_mode_available": False,
                    "translate_breakdown": bundle["translate_breakdown"],
                    "tts_breakdown": bundle["tts_breakdown"],
                },
            )
            write_json_report_async(
                "stt_optimization_latest.json",
                build_stt_optimization_payload(self.runtime.session, asr_loader=self.runtime.asr_loader),
            )
        except Exception as exc:
            self.log_event("WARN", "Could not refresh pipeline telemetry after accepted segment.", exc)
        invalidate_benchmark_summary_cache = getattr(self, "_invalidate_benchmark_summary_cache", None)
        if callable(invalidate_benchmark_summary_cache):
            invalidate_benchmark_summary_cache()
        request_status_refresh = getattr(self, "_request_status_refresh", None)
        if callable(request_status_refresh):
            request_status_refresh()
        else:
            self.refresh_status_panel()

    def handle_pipeline_error(self, message: str) -> None:
        self.runtime.error_count += 1
        self._last_lifecycle_error = message
        self.set_status(UIState.ERROR)
        self.log_event("ERROR", message)
        self.write_error_health_snapshot(error_message=message)
        self.write_engine_health_snapshot("pipeline_error")
        self.write_engine_stability_audit_snapshot("pipeline_error")

    def handle_worker_error(self, message: str) -> None:
        self.runtime.error_count += 1
        self._last_worker_error = message
        self._last_lifecycle_error = message
        self.set_status(UIState.ERROR)
        self.log_event("ERROR", message)
        self.write_error_health_snapshot(error_message=message)
        self.write_worker_health_snapshot("worker_error")
        self.write_engine_health_snapshot("worker_error")
        self.write_engine_stability_audit_snapshot("worker_error")

    def handle_pipeline_finished(self) -> None:
        self._stop_in_progress = False
        self._drain_pending_pipeline_results()
        self._pipeline_result_flush_timer.stop()
        self.live_thread = None
        self.stop_button.setEnabled(False)
        self._stopwatch_alignment_event_count_cache.clear()
        self._health_snapshot_cache.clear()
        self._session_persist_signature = None
        self._session_benchmark_report_signature = None
        self._session_benchmark_report_cache = None
        self._benchmark_panel_signature = None
        if self.runtime.current_status not in {UIState.PAUSED, UIState.ERROR}:
            self.set_status(UIState.STOPPED)
        self._stop_completed_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self.log_event("INFO", "Capture stopped.")
        self.write_start_stop_lifecycle_snapshot("stop_completed")
        self.write_worker_health_snapshot("stop_completed")
        self.write_engine_health_snapshot("stop_completed")
        if bool(getattr(self, "_pending_start_after_ready", False)):
            launch_pending_start = getattr(self, "_launch_pending_start_after_ready", None)
            if callable(launch_pending_start):
                try:
                    QTimer.singleShot(0, launch_pending_start)
                except Exception:
                    launch_pending_start()
        request_status_refresh = getattr(self, "_request_status_refresh", None)
        if callable(request_status_refresh):
            request_status_refresh()
        else:
            self.refresh_status_panel()

    def handle_replay_card(self, card: TranscriptCardViewModel) -> None:
        capture_active = (self.live_thread is not None and self.live_thread.isRunning()) or self.runtime.current_status in {
            UIState.PREPARING,
            UIState.LISTENING,
            UIState.SPEECH_DETECTED,
            UIState.TRANSCRIBING,
            UIState.TRANSLATING,
        }
        if capture_active:
            self.show_replay_blocked_notification("IN", card.segment_id)
            return
        if card.source_audio_path is None:
            self.log_event("ERROR", "Source audio is not available for this segment.")
            return
        segment = self.find_segment(card.segment_id)
        replay_result = self.runtime.replay.replay_audio(
            card.source_audio_path,
            output_device_id=self.selected_output_device_id(),
        )
        level = "INFO" if replay_result.status in {"Playing", "Queued", "Completed"} else "ERROR"
        self.log_event(level, replay_result.message)
        if segment is not None:
            segment.quality.replay_error = "" if replay_result.status in {"Playing", "Queued", "Completed"} else replay_result.message

    def handle_speak_translation(self, card: TranscriptCardViewModel) -> None:
        capture_active = (self.live_thread is not None and self.live_thread.isRunning()) or self.runtime.current_status in {
            UIState.PREPARING,
            UIState.LISTENING,
            UIState.SPEECH_DETECTED,
            UIState.TRANSCRIBING,
            UIState.TRANSLATING,
        }
        if capture_active:
            self.show_replay_blocked_notification("OUT", card.segment_id)
            return
        if not card.translated_text.strip():
            self.log_event("WARN", "No translated text is available for voice output.")
            return

        segment = self.find_segment(card.segment_id)
        if segment is None:
            self.log_event("ERROR", "Cannot create translation voice because the segment is missing.", card.segment_id)
            return

        try:
            autoplay = True
            if segment.translated_audio_path and Path(segment.translated_audio_path).exists():
                segment.quality.tts_status = "Ready (cached)"
                segment.quality.tts_error = ""
                segment.latency.tts_cached = True
                segment.latency.tts_available = True
                segment.latency.tts_cache_hit = True
                segment.latency.tts_engine_name = "cached"
                segment.latency.target_audio_path = str(segment.translated_audio_path)
                segment.latency.output_device_name = self.output_device_combo.currentText()
                self._log_pipeline_trace(
                    "tts_backend_requested",
                    segment=segment,
                    stage="tts",
                    status="cached",
                    details={
                        "backend_env": self.runtime.tts.backend_name,
                        "autoplay": autoplay,
                        "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                    },
                )
                self._log_pipeline_trace(
                    "tts_backend_selected",
                    segment=segment,
                    stage="tts",
                    status="cached",
                    details={
                        "backend_name": "cached",
                        "backend_selected": "cached",
                        "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                    },
                )
                if autoplay:
                    request_perf = perf_counter()
                    self._pending_playback_segment_id_by_path[str(segment.translated_audio_path)] = segment.segment_id
                    self._pending_playback_request_perf_by_path[str(segment.translated_audio_path)] = request_perf
                    segment.latency.tts_playback_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
                replay_result = self.runtime.replay.replay_audio(
                    Path(segment.translated_audio_path),
                    output_device_id=self.selected_output_device_id(),
                )
                level = "INFO" if replay_result.status in {"Playing", "Queued", "Completed"} else "ERROR"
                self.log_event(level, replay_result.message)
                segment.quality.replay_error = "" if replay_result.status in {"Playing", "Queued", "Completed"} else replay_result.message
                return
            self.start_tts_generation(segment, autoplay=True)
        except Exception as exc:
            self.handle_worker_error(format_exception(exc))

    def start_tts_generation(self, segment: TranscriptSegment, *, autoplay: bool) -> None:
        if not segment.translated_text.strip():
            return
        self.runtime.audio_settings = load_audio_settings()
        custom_voice_requested = should_bypass_translation_voice_cache(self.runtime.audio_settings)
        self._log_pipeline_trace(
            "tts_backend_requested",
            segment=segment,
            stage="tts",
            status="requested",
            details={
                "backend_env": self.runtime.tts.backend_name,
                "autoplay": autoplay,
                "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
            },
        )
        runtime_tts_busy = not self._runtime_tts_is_idle()
        if self.tts_worker is not None and callable(getattr(self.tts_worker, "isRunning", None)) and self.tts_worker.isRunning():
            runtime_tts_busy = True
        if runtime_tts_busy:
            self._queue_pending_tts_job(segment, autoplay)
            self._log_pipeline_trace(
                "tts_request_deferred",
                segment=segment,
                stage="tts",
                status="queued",
                details={
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                    "runtime_tts_idle": False,
                    "pending_jobs": len(self.pending_tts_jobs),
                },
            )
            return
        if not custom_voice_requested and segment.translated_audio_path and Path(segment.translated_audio_path).exists():
            segment.quality.tts_status = "Ready (cached)"
            segment.quality.tts_error = ""
            segment.latency.tts_cached = True
            segment.latency.tts_available = True
            segment.latency.tts_cache_hit = True
            segment.latency.tts_engine_name = "cached"
            segment.latency.target_audio_path = str(segment.translated_audio_path)
            segment.latency.output_device_name = self.output_device_combo.currentText()
            self._log_pipeline_trace(
                "tts_backend_selected",
                segment=segment,
                stage="tts",
                status="cached",
                details={
                    "backend_name": "cached",
                    "backend_selected": "cached",
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                },
            )
            if autoplay:
                replay_result = self.runtime.replay.replay_audio(
                    Path(segment.translated_audio_path),
                    output_device_id=self.selected_output_device_id(),
                )
                self.log_event(
                    "INFO" if replay_result.status in {"Playing", "Queued", "Completed"} else "ERROR",
                    replay_result.message,
                )
            return
        if self.tts_worker is not None and self.tts_worker.isRunning():
            self._queue_pending_tts_job(segment, autoplay)
            return
        segment.quality.tts_status = "Preparing translation voice..."
        segment.quality.tts_error = ""
        output_path = self.runtime.session.segment_audio_path(
            self.runtime.config.cache_dir,
            f"{segment.segment_id}-translation",
        )
        segment.quality.output_device_name = self.output_device_combo.currentText()
        segment.latency.tts_request_start_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_start_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_queue_depth = len(self.pending_tts_jobs)
        self.pending_tts_segment_id = segment.segment_id
        self.pending_tts_autoplay = autoplay
        self.log_event("INFO", "Translation voice generation started.", segment.segment_id)
        self._log_pipeline_trace(
            "tts_request_started",
            segment=segment,
            stage="tts",
            status="started",
            details={
                "output_path": str(output_path),
                "backend": self.runtime.tts.backend_name,
                "queue_depth": int(segment.latency.tts_queue_depth or 0),
            },
        )
        segment.latency.tts_capture_generation = self._capture_generation
        self._segment_trace(segment).mark(
            "tts_request_start",
            "AppMain.start_tts_generation",
            "TTS request submitted from UI",
        )
        self.tts_worker = TTSWorker(
            self.runtime,
            build_tts_request_for_segment(
                segment_id=segment.segment_id,
                text=segment.translated_text,
                language=self.runtime.config.target_language,
                output_path=str(output_path),
                trace_id=self._pipeline_trace_id(segment),
                audio_settings=self.runtime.audio_settings,
            ),
        )
        self.tts_worker.finished_result.connect(self.handle_tts_result)
        self.tts_worker.error.connect(self.handle_worker_error)
        self.tts_worker.start()

    def _dequeue_pending_tts_job(self) -> tuple[TranscriptSegment, bool] | None:
        if not self.pending_tts_jobs:
            return None
        return self.pending_tts_jobs.pop(0)

    def _queue_pending_tts_job(self, segment: TranscriptSegment, autoplay: bool) -> None:
        if self.pending_tts_queue_limit <= 1:
            dropped = self.pending_tts_jobs[-1][0].segment_id if self.pending_tts_jobs else ""
            self.pending_tts_jobs[:] = [(segment, autoplay)]
            segment.latency.tts_queue_depth = len(self.pending_tts_jobs)
            if dropped:
                self.log_event(
                    "WARN",
                    "Translation voice generation is already running; replaced queued request with the latest segment.",
                    {"dropped_segment_id": dropped, "queued_segment_id": segment.segment_id, "queue_depth": len(self.pending_tts_jobs)},
                )
            else:
                self.log_event(
                    "WARN",
                    "Translation voice generation is already running; queued the latest request.",
                    {"queue_depth": len(self.pending_tts_jobs)},
                )
            self._schedule_pending_tts_drain()
            return
        if len(self.pending_tts_jobs) >= self.pending_tts_queue_limit:
            dropped_segment, _dropped_autoplay = self.pending_tts_jobs.pop(0)
            self.log_event(
                "WARN",
                "Translation voice generation is already running; dropped the oldest queued request.",
                {
                    "dropped_segment_id": dropped_segment.segment_id,
                    "queued_segment_id": segment.segment_id,
                    "queue_depth": len(self.pending_tts_jobs),
                },
            )
        self.pending_tts_jobs.append((segment, autoplay))
        segment.latency.tts_queue_depth = len(self.pending_tts_jobs)
        self.log_event(
            "WARN",
            "Translation voice generation is already running; queued request.",
            {"queue_depth": len(self.pending_tts_jobs)},
        )
        self._schedule_pending_tts_drain()

    def _schedule_pending_tts_drain(self, delay_ms: int = 150) -> None:
        if bool(getattr(self, "_pending_tts_drain_scheduled", False)):
            return
        self._pending_tts_drain_scheduled = True

        def runner() -> None:
            self._pending_tts_drain_scheduled = False
            if not self.pending_tts_jobs:
                return
            if self.tts_worker is not None and callable(getattr(self.tts_worker, "isRunning", None)) and self.tts_worker.isRunning():
                self._schedule_pending_tts_drain(250)
                return
            if not self._runtime_tts_is_idle():
                self._schedule_pending_tts_drain(150)
                return
            queued_job = self._dequeue_pending_tts_job()
            if queued_job is None:
                return
            queued_segment, queued_autoplay = queued_job
            try:
                self.start_tts_generation(queued_segment, autoplay=queued_autoplay)
            except Exception as exc:
                self.log_event("WARN", "Could not launch queued translation request.", exc)
                if self.pending_tts_jobs:
                    self._schedule_pending_tts_drain(250)

        try:
            QTimer.singleShot(max(0, int(delay_ms)), runner)
        except Exception:
            runner()

    def _schedule_session_persist(self) -> None:
        session = self.runtime.session
        last_segment = session.segments[-1] if session.segments else None
        persist_signature = (
            session.session_id,
            len(session.segments),
            getattr(self.runtime, "accepted_count", 0),
            getattr(self.runtime, "rejected_count", 0),
            getattr(last_segment, "segment_id", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "tts_end_time", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "tts_voice_start_proxy_time", "") if last_segment is not None else "",
            getattr(getattr(last_segment, "latency", None), "speech_end_to_voice_proxy_ms", 0) if last_segment is not None else 0,
        )
        with self._session_persist_lock:
            if self._session_persist_running:
                return
            if self._session_persist_signature == persist_signature:
                return
            self._session_persist_running = True
            self._session_persist_signature = persist_signature

        def runner() -> None:
            try:
                self.runtime.cache_current_session()
                benchmark_writer = getattr(self, "_write_session_benchmark_reports_if_changed", None)
                if callable(benchmark_writer):
                    benchmark_writer()
                else:
                    write_benchmark_reports(self.runtime.session, session_id=self.runtime.session.session_id)
            except Exception as exc:
                append_log(
                    "launcher_latest.log",
                    "WARN",
                    "Background session persist failed.",
                    format_exception(exc),
                )
            finally:
                with self._session_persist_lock:
                    self._session_persist_running = False

        threading.Thread(target=runner, name="TranslateITSessionPersist", daemon=True).start()

    def _build_latency_report_bundle(self, segment: TranscriptSegment) -> dict[str, object]:
        metric_groups = build_metric_groups(segment)
        latency = segment.latency
        backend_name = str(getattr(latency, "tts_backend_name", "") or "")
        backend_selected = str(getattr(latency, "tts_backend_selected", "") or backend_name)
        latency_data = getattr(latency, "_data", {}) if latency is not None else {}
        speech_end_to_voice_proxy_ms = latency_data.get("speech_end_to_voice_proxy_ms") if isinstance(latency_data, dict) else None
        issue_signals = metric_groups.get("issue_signals", {})
        issue_summary = str(metric_groups.get("issue_summary", "") or "")
        health_overview = build_health_overview_payload(segment)
        return {
            "metric_groups": metric_groups,
            "health_overview": health_overview,
            "text_latency": {
                "session_id": self.runtime.session.session_id,
                "segment_id": segment.segment_id,
                "trace_id": str(getattr(segment, "trace_id", "") or ""),
                "tts_backend_name": backend_name,
                "tts_backend_selected": backend_selected,
                "tts_backend_fallback_reason": str(getattr(latency, "tts_backend_fallback_reason", "") or ""),
                "tts_backend_is_streaming": backend_selected == "experimental_streaming",
                "first_voice_out_is_real_or_proxy": "proxy" if backend_selected else "unavailable",
                "issue_signals": issue_signals,
                "issue_summary": issue_summary,
                "health_overview": health_overview,
                "speech_duration_ms": metric_groups["speech_duration_ms"],
                "delay_after_speech_end_ms": metric_groups["delay_after_speech_end_ms"],
                "total_realtime_ms": metric_groups["total_latency_ms"],
                "measurement_status": "MEASURED" if metric_groups["total_latency_ms"] > 0 else "UNAVAILABLE",
                "input_latency_budget_ms": metric_groups["input_latency_budget_ms"],
                "output_latency_budget_ms": metric_groups["output_latency_budget_ms"],
                "io_latency_budget_ms": metric_groups["io_latency_budget_ms"],
                "speech_start_time": getattr(latency, "speech_start_time", ""),
                "speech_end_time": getattr(latency, "speech_end_time", ""),
                "vad_endpoint_time": getattr(latency, "endpoint_decision_time", ""),
                "asr_start_time": getattr(latency, "asr_start_time", ""),
                "asr_end_time": getattr(latency, "asr_end_time", ""),
                "translation_start_time": getattr(latency, "translation_start_time", ""),
                "translation_end_time": getattr(latency, "translation_end_time", ""),
                "tts_start_time": getattr(latency, "tts_start_time", ""),
                "tts_audio_ready_time": getattr(latency, "tts_result_received_time", ""),
                "playback_enqueue_time": getattr(latency, "tts_playback_requested_time", ""),
                "playback_start_time": getattr(latency, "tts_playback_start_time", ""),
                "first_voice_out_time": getattr(latency, "tts_playback_audio_start_time", ""),
                "first_voice_out_proxy_time": getattr(latency, "tts_playback_audio_start_time", ""),
                "voice_start_proxy_time": getattr(latency, "tts_voice_start_proxy_time", ""),
                "voice_completed_time": getattr(latency, "tts_voice_completed_time", getattr(latency, "tts_audio_ready_time", "")),
                "voice_start_proxy_ms": getattr(latency, "tts_voice_start_proxy_ms", 0),
                "voice_completed_ms": getattr(latency, "tts_voice_completed_ms", 0),
                "process_start_overhead_ms": getattr(latency, "tts_process_start_overhead_ms", 0),
                "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms,
            },
            "text_latency_breakdown": {
                "speech_duration_ms": metric_groups["speech_duration_ms"],
                "delay_after_speech_end_ms": metric_groups["delay_after_speech_end_ms"],
                "total_realtime_ms": metric_groups["total_latency_ms"],
                "speech_start_to_first_voice_ms": metric_groups["speech_start_to_first_voice_ms"],
                "voice_start_proxy_ms": getattr(latency, "tts_voice_start_proxy_ms", metric_groups["total_latency_ms"]),
                "voice_completed_ms": getattr(latency, "tts_voice_completed_ms", 0),
                "process_start_overhead_ms": getattr(latency, "tts_process_start_overhead_ms", 0),
                "speech_end_to_voice_proxy_ms": speech_end_to_voice_proxy_ms,
                "input_latency_budget_ms": metric_groups["input_latency_budget_ms"],
                "output_latency_budget_ms": metric_groups["output_latency_budget_ms"],
                "io_latency_budget_ms": metric_groups["io_latency_budget_ms"],
                "issue_summary": issue_summary,
                "health_overview": health_overview,
            },
            "audio_verify_breakdown": build_audio_verify_breakdown(segment),
            "stt_breakdown": build_stt_breakdown(segment),
            "translate_breakdown": build_translate_breakdown(segment),
            "tts_breakdown": build_tts_breakdown(segment),
            "short_debug": build_short_utterance_debug_payload(segment),
        }

    def _write_text_latency_reports(self, segment: TranscriptSegment, *, accepted: bool) -> None:
        try:
            bundle = self._build_latency_report_bundle(segment)
            metric_groups = bundle["metric_groups"]
            issue_triage_payload = build_issue_triage_payload(segment)
            write_json_report_async("text_latency_latest.json", bundle["text_latency"])
            write_json_report_async("text_latency_breakdown_latest.json", bundle["text_latency_breakdown"])
            write_json_report_async(
                "real_latency_breakdown_latest.json",
                {
                    "session_id": self.runtime.session.session_id,
                    "segment_id": segment.segment_id,
                    "accepted": accepted,
                    "measurement_basis": "App timestamps grouped into Audio Verify, STT, Translate, and TTS.",
                    "app_vs_stopwatch_delta_ms": metric_groups.get("app_vs_stopwatch_delta_ms", 0),
                    "missing_latency_ms": metric_groups.get("missing_latency_ms", 0),
                    "missing_latency_assigned_to": metric_groups.get("missing_latency_assigned_to", ""),
                    "metric_groups": metric_groups,
                    "audio_verify_breakdown": bundle["audio_verify_breakdown"],
                    "stt_breakdown": bundle["stt_breakdown"],
                    "translate_breakdown": bundle["translate_breakdown"],
                    "tts_breakdown": bundle["tts_breakdown"],
                    "issue_summary": bundle["text_latency"].get("issue_summary", ""),
                    "health_overview": bundle.get("health_overview", {}),
                    "input_latency_budget_ms": metric_groups["input_latency_budget_ms"],
                    "output_latency_budget_ms": metric_groups["output_latency_budget_ms"],
                    "io_latency_budget_ms": metric_groups["io_latency_budget_ms"],
                },
            )
            write_json_report_async(
                "simple_latency_breakdown_latest.json",
                {
                    "session_id": self.runtime.session.session_id,
                    "segment_id": segment.segment_id,
                    "speech_duration_ms": metric_groups.get("speech_duration_ms", segment.latency.speech_duration_ms),
                    "delay_after_speech_end_ms": metric_groups.get("delay_after_speech_end_ms", 0),
                    "total_realtime_ms": metric_groups.get("total_latency_ms", 0),
                    "component_total_delay_ms": metric_groups.get("component_total_delay_ms", metric_groups.get("pipeline_component_total_ms", 0)),
                    "audio_verify_ms": metric_groups.get("audio_verify_ms", 0),
                    "stt_ms": metric_groups.get("stt_ms", 0),
                    "translate_ms": metric_groups.get("translate_ms", 0),
                    "tts_ms": metric_groups.get("tts_ms", 0),
                    "input_latency_budget_ms": metric_groups.get("input_latency_budget_ms", 0),
                    "output_latency_budget_ms": metric_groups.get("output_latency_budget_ms", 0),
                    "io_latency_budget_ms": metric_groups.get("io_latency_budget_ms", 0),
                    "issue_summary": metric_groups.get("issue_summary", ""),
                    "health_overview": bundle.get("health_overview", {}),
                },
            )
            write_json_report_async("short_utterance_debug_latest.json", bundle["short_debug"])
            write_json_report_async("issue_triage_latest.json", issue_triage_payload)
            write_text_report_async(
                "issue_triage_latest.md",
                [
                    "# Issue Triage",
                    "",
                    f"- Issue status: {issue_triage_payload.get('issue_status', 'unknown')}",
                    f"- Primary stage: {issue_triage_payload.get('primary_stage', 'Unknown')}",
                    f"- Primary reason: {issue_triage_payload.get('primary_reason', 'unavailable')}",
                    f"- Issue summary: {issue_triage_payload.get('issue_summary', '') or 'unavailable'}",
                    f"- Speech end to voice proxy ms: {issue_triage_payload.get('speech_end_to_voice_proxy_ms', 'unavailable')}",
                    f"- Missing latency ms: {issue_triage_payload.get('missing_latency_ms', 'unavailable')}",
                    f"- TTS queue depth: {issue_triage_payload.get('tts_queue_depth', 'unavailable')}",
                    f"- Voice signal state: {issue_triage_payload.get('voice_signal_state', 'unavailable')}",
                    "",
                    "## Triage Note",
                    "",
                    str(issue_triage_payload.get("triage_note", "")),
                    "",
                    "## Triage Points",
                    "",
                    "\n".join(f"- {point}" for point in issue_triage_payload.get("triage_points", [])) or "- unavailable",
                    "",
                ],
            )
        except Exception as exc:
            self.log_event("WARN", "Could not write text latency or breakdown report.", exc)

    def handle_tts_result(self, result: object) -> None:
        segment_id = str(getattr(result, "segment_id", self.pending_tts_segment_id or ""))
        segment = self.find_segment(segment_id)
        if segment is not None and (
            getattr(segment, "latency", None) is None
            or getattr(segment, "quality", None) is None
            or getattr(segment, "replay", None) is None
        ):
            self.log_event(
                "WARN",
                "TTS result segment missing required runtime fields; dropping event to protect launcher stability.",
                {"segment_id": segment_id or "unknown"},
            )
            self._log_pipeline_trace(
                "tts_result_handle_failed",
                segment=segment,
                stage="tts",
                status="failed",
                details={
                    "segment_id": segment_id or "unknown",
                    "error": "segment missing latency/quality/replay runtime fields",
                },
            )
            if getattr(self, "tts_worker", None) is not None:
                self.tts_worker = None
            self.pending_tts_segment_id = None
            self.pending_tts_autoplay = False
            if self.pending_tts_jobs:
                self._schedule_pending_tts_drain()
            return
        current_capture_generation = int(getattr(self, "_capture_generation", 0) or 0)
        segment_generation = int(getattr(getattr(segment, "latency", None), "tts_capture_generation", current_capture_generation) or current_capture_generation)
        if segment is not None and segment_generation != current_capture_generation and str(getattr(result, "status", "")).strip().lower() != "cancelled":
            self._log_pipeline_trace(
                "tts_result_stale_skipped",
                segment=segment,
                stage="tts",
                status="skipped",
                details={
                    "segment_id": segment_id,
                    "segment_generation": segment_generation,
                    "current_generation": current_capture_generation,
                },
            )
            if getattr(self, "tts_worker", None) is not None:
                self.tts_worker = None
            self.pending_tts_segment_id = None
            self.pending_tts_autoplay = False
            if self.pending_tts_jobs:
                self._schedule_pending_tts_drain()
            return
        trace_id = self._pipeline_trace_id(segment, fallback=segment_id)
        backend_name = str(getattr(result, "backend_name", getattr(result, "engine_name", "unavailable")) or "unavailable")
        backend_selected = str(getattr(result, "backend_selected", backend_name) or backend_name)
        self._log_pipeline_trace(
            "tts_backend_selected",
            segment=segment,
            stage="tts",
            status=str(getattr(result, "status", "unavailable")),
            details={
                "backend_name": backend_name,
                "backend_selected": backend_selected,
                "direct_playback": bool(getattr(result, "direct_playback", False)),
                "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0) if segment is not None else 0),
            },
        )
        if segment is not None:
            result_received_perf = perf_counter()
            segment.latency.tts_result_received_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            trace = self._segment_trace(segment)
            trace.mark_at(
                "tts_result_received",
                int(result_received_perf * 1_000_000_000),
                "TTSWorker.run",
                "TTS result received by UI handler",
            )
        self.tts_worker = None
        autoplay = self.pending_tts_autoplay
        self.pending_tts_segment_id = None
        self.pending_tts_autoplay = False
        direct_playback = bool(getattr(result, "direct_playback", False))
        if str(getattr(result, "status", "")).strip().lower() == "cancelled":
            if segment is not None:
                segment.quality.tts_status = "Cancelled"
                segment.quality.tts_error = ""
                segment.replay.target_voice_available = False
            self._last_playback_error = ""
            self._log_pipeline_trace(
                "tts_cancelled",
                segment=segment,
                stage="tts",
                status="cancelled",
                details={
                    "backend_selected": backend_selected,
                    "direct_playback": direct_playback,
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0) if segment is not None else 0),
                },
            )
            if self.pending_tts_jobs:
                self._schedule_pending_tts_drain()
            return
        if segment is not None:
            segment.latency.tts_pending_jobs_remaining = len(self.pending_tts_jobs)
        if getattr(result, "status", "") != "Completed" and not direct_playback:
            self._log_pipeline_trace(
                "tts_completed_or_failed",
                segment=segment,
                stage="tts",
                status="failed",
                details={"notes": str(getattr(result, "notes", "Translation voice unavailable."))},
            )
            if segment is not None:
                segment.quality.tts_status = "Translation voice unavailable: local TTS engine is not installed or failed."
                segment.quality.tts_error = str(getattr(result, "notes", "Translation voice unavailable."))
                segment.replay.target_voice_available = False
            self.log_event("ERROR", getattr(result, "notes", "Translation voice is unavailable."))
            self._last_playback_error = str(getattr(result, "notes", "Translation voice is unavailable."))
            self.write_playback_health_snapshot(
                tts_requested=True,
                tts_audio_ready=False,
                audio_path=str(getattr(result, "audio_path", "")),
                audio_valid=False,
                audio_validation_error=str(getattr(result, "notes", "Translation voice unavailable.")),
                playback_requested=False,
                playback_queued=False,
                playback_backend_started_if_available=False,
                playback_failed=True,
                playback_error=str(getattr(result, "notes", "Translation voice unavailable.")),
                output_backend="TTS",
                output_device_name_if_available=self.output_device_combo.currentText(),
            )
            if self.pending_tts_jobs:
                self._schedule_pending_tts_drain()
            return
        translated_audio_path = Path(str(getattr(result, "audio_path", ""))) if getattr(result, "audio_path", None) else None
        if segment is not None:
            if translated_audio_path is not None:
                segment.translated_audio_path = translated_audio_path
                segment.replay.translated_audio_path = translated_audio_path
                segment.replay.target_voice_available = translated_audio_path.exists() or direct_playback
            else:
                segment.replay.target_voice_available = direct_playback
            segment.quality.tts_status = "Ready"
            segment.quality.tts_error = ""
            segment.quality.output_device_name = self.output_device_combo.currentText()
            segment.latency.tts_request_start_ms = int(getattr(result, "tts_request_start_ms", 0) or 0)
            segment.latency.tts_queue_wait_ms = int(getattr(result, "queue_wait_ms", 0) or 0)
            segment.latency.tts_text_prepare_ms = int(getattr(result, "text_prep_ms", 0) or 0)
            segment.latency.tts_voice_generate_ms = int(getattr(result, "voice_generate_ms", 0) or 0)
            segment.latency.tts_audio_cache_ms = int(getattr(result, "audio_cache_ms", 0) or 0)
            segment.latency.tts_playback_prepare_ms = int(getattr(result, "playback_prepare_ms", 0) or 0)
            voice_start_proxy_ms = _safe_int_or_zero(
                getattr(result, "voice_start_proxy_ms", 0)
                or getattr(result, "playback_start_ms", 0)
                or getattr(result, "tts_direct_speak_called_ms", 0)
                or getattr(result, "queue_wait_ms", 0)
            )
            voice_completed_ms = _safe_int_or_zero(getattr(result, "voice_completed_ms", 0) or getattr(result, "latency_ms", 0))
            process_start_overhead_ms = _safe_int_or_zero(getattr(result, "process_start_overhead_ms", 0))
            voice_start_proxy_time = str(
                getattr(result, "voice_start_proxy_time", "")
                or getattr(segment.latency, "tts_voice_start_proxy_time", "")
                or getattr(segment.latency, "tts_playback_audio_start_time", "")
                or ""
            )
            voice_completed_time = str(
                getattr(result, "voice_completed_time", "")
                or getattr(segment.latency, "tts_voice_completed_time", "")
                or getattr(segment.latency, "tts_audio_ready_time", "")
                or ""
            )
            segment.latency.tts_playback_start_ms = voice_start_proxy_ms
            segment.latency.tts_direct_speak_called_ms = int(getattr(result, "tts_direct_speak_called_ms", 0) or 0)
            segment.latency.tts_voice_start_proxy_ms = voice_start_proxy_ms
            segment.latency.tts_voice_completed_ms = voice_completed_ms
            segment.latency.tts_process_start_overhead_ms = process_start_overhead_ms
            segment.latency.tts_first_chunk_ready_ms = int(getattr(result, "tts_first_chunk_ready_ms", 0) or 0)
            segment.latency.tts_provider_used = str(getattr(result, "provider_used", "") or "")
            segment.latency.tts_provider_benchmark_ms = int(getattr(result, "provider_benchmark_ms", 0) or 0)
            segment.latency.tts_provider_selection_reason = str(getattr(result, "provider_selection_reason", "") or "")
            segment.latency.tts_provider_voice_profile_id = str(getattr(result, "provider_voice_profile_id", "") or "")
            segment.latency.tts_provider_model_version = str(getattr(result, "provider_model_version", "") or "")
            if voice_start_proxy_time:
                segment.latency.tts_voice_start_proxy_time = voice_start_proxy_time
            if voice_completed_time:
                segment.latency.tts_voice_completed_time = voice_completed_time
            speech_end_to_voice_proxy_ms = _delta_ms_from_iso(
                getattr(segment.latency, "speech_end_time", ""),
                voice_start_proxy_time,
            )
            if speech_end_to_voice_proxy_ms is not None:
                segment.latency.speech_end_to_voice_proxy_ms = speech_end_to_voice_proxy_ms
            if voice_completed_time:
                segment.latency.tts_audio_ready_time = voice_completed_time
            segment.latency.speech_start_to_first_voice_output_ms = voice_start_proxy_ms
            segment.latency.latency_ms = voice_start_proxy_ms
            trace = self._segment_trace(segment)
            segment.latency.metric_trace["official_trace"] = trace.to_dict()
            segment.latency.tts_engine_name = str(getattr(result, "engine_name", ""))
            segment.latency.tts_backend_name = str(getattr(result, "backend_name", getattr(result, "engine_name", "")))
            segment.latency.tts_backend_selected = str(getattr(result, "backend_selected", getattr(result, "backend_name", "")))
            segment.latency.tts_backend_fallback_reason = str(getattr(result, "backend_fallback_reason", ""))
            segment.latency.tts_available = bool(getattr(result, "available", False))
            segment.latency.tts_cache_hit = bool(getattr(result, "cache_hit", False))
            segment.latency.tts_cached = bool(getattr(result, "cached", False))
            segment.latency.target_audio_path = str(getattr(result, "target_audio_path", str(translated_audio_path or "")))
            segment.latency.output_device_name = str(getattr(result, "output_device_name", self.output_device_combo.currentText()))
            segment.latency.tts_error = str(getattr(result, "tts_error", ""))
            segment.latency.tts_end_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
            invalidate_benchmark_summary_cache = getattr(self, "_invalidate_benchmark_summary_cache", None)
            if callable(invalidate_benchmark_summary_cache):
                invalidate_benchmark_summary_cache()
            self._log_pipeline_trace(
                "tts_audio_ready",
                segment=segment,
                stage="tts",
                status=str(getattr(result, "status", "unavailable")),
                details={
                    "backend_selected": backend_selected,
                    "audio_path": str(translated_audio_path or "") or "unavailable",
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                    "pending_jobs_remaining": int(len(self.pending_tts_jobs)),
                    "voice_start_proxy_ms": voice_start_proxy_ms,
                    "voice_completed_ms": voice_completed_ms,
                    "process_start_overhead_ms": process_start_overhead_ms,
                    "provider_used": str(getattr(result, "provider_used", "") or ""),
                    "provider_benchmark_ms": int(getattr(result, "provider_benchmark_ms", 0) or 0),
                },
            )
            if voice_completed_ms > 0:
                self._log_pipeline_trace(
                    "voice_completed",
                    segment=segment,
                    stage="tts",
                    status="completed",
                    details={
                        "voice_completed_ms": voice_completed_ms,
                        "process_start_overhead_ms": process_start_overhead_ms,
                        "voice_start_proxy_ms": voice_start_proxy_ms,
                    },
                )
            if translated_audio_path is not None:
                self._pending_playback_segment_id_by_path[str(translated_audio_path)] = segment.segment_id
            if autoplay:
                request_perf = perf_counter()
                if translated_audio_path is not None:
                    self._pending_playback_request_perf_by_path[str(translated_audio_path)] = request_perf
                segment.latency.tts_playback_request_ready_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
                segment.latency.tts_playback_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
                trace.mark("voice_start_proxy", "TTSWorker.run", "voice start proxy reached")
                if voice_completed_ms > 0:
                    trace.mark("voice_completed", "TTSWorker.run", "voice synthesis completed")
                if direct_playback:
                    trace.mark("tts_direct_speak_called", "TTSPlaceholder._speak_direct_async")
                trace.mark_at(
                    "tts_playback_request_ready",
                    int(request_perf * 1_000_000_000),
                    "AppMain.handle_tts_result",
                    "Playback request is ready to dispatch",
                )
                trace.mark_at(
                    "playback_request",
                    int(request_perf * 1_000_000_000),
                    "AppMain.handle_tts_result",
                    "Playback request prepared before any post-TTS UI/report work",
                )
                self._log_pipeline_trace(
                    "playback_started_or_proxy",
                    segment=segment,
                    stage="ui",
                    status="proxy" if direct_playback else "requested",
                    details={
                        "audio_path": str(translated_audio_path or "") or "unavailable",
                        "direct_playback": direct_playback,
                    "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0)),
                    },
                )
            updated_widget = self.transcript_widgets_by_segment_id.get(segment.segment_id)
            if updated_widget is not None:
                updated_widget.update_view_model(self._build_transcript_card_view_model(segment))
            self._schedule_post_tts_ui_refresh(segment)
            self._write_post_tts_health_snapshot(
                result,
                translated_audio_path or Path(""),
                playback_requested=autoplay,
                playback_queued=False,
                playback_backend_started_if_available=False,
                playback_failed=False,
                playback_error="",
            )
            self.log_event(
                "INFO",
                "Translation voice generated locally.",
                f"{getattr(result, 'mode', 'local_tts')}; start_proxy={voice_start_proxy_ms} ms; completed={voice_completed_ms} ms",
            )
        self._log_pipeline_trace(
            "tts_completed_or_failed",
            segment=segment,
            stage="tts",
            status="completed" if getattr(result, "status", "") == "Completed" or direct_playback else "failed",
            details={
                "mode": getattr(result, "mode", "unavailable"),
                "latency_ms": int(getattr(result, "latency_ms", 0) or 0),
                "trace_id": trace_id,
                "queue_depth": _safe_int_or_zero(getattr(segment.latency, "tts_queue_depth", 0) if segment is not None else 0),
            },
        )
        if autoplay and translated_audio_path is not None and not direct_playback:
            if not translated_audio_path.exists() or translated_audio_path.stat().st_size <= 0:
                self._last_playback_error = f"Generated audio is invalid: {translated_audio_path}"
                self.write_playback_health_snapshot(
                    tts_requested=True,
                    tts_audio_ready=False,
                    audio_path=str(translated_audio_path),
                    audio_valid=False,
                    audio_validation_error=self._last_playback_error,
                    playback_requested=False,
                    playback_queued=False,
                    playback_backend_started_if_available=False,
                    playback_failed=True,
                    playback_error=self._last_playback_error,
                    output_backend=getattr(result, "mode", "local_tts"),
                    output_device_name_if_available=self.output_device_combo.currentText(),
                )
                self.log_event("ERROR", self._last_playback_error)
                if self.pending_tts_jobs:
                    self._schedule_pending_tts_drain()
                return
            self._pending_playback_segment_id_by_path[str(translated_audio_path)] = segment.segment_id
            request_perf = self._pending_playback_request_perf_by_path.get(str(translated_audio_path), perf_counter())
            replay_result = self.runtime.replay.replay_audio(
                translated_audio_path,
                output_device_id=self.selected_output_device_id(),
            )
            level = "INFO" if replay_result.status in {"Playing", "Queued", "Completed"} else "ERROR"
            self.log_event(level, replay_result.message)
            if segment is not None:
                segment.quality.tts_status = replay_result.message
                segment.quality.tts_error = "" if replay_result.status in {"Playing", "Queued", "Completed"} else replay_result.message
                segment.quality.replay_error = "" if replay_result.status in {"Playing", "Queued", "Completed"} else replay_result.message
            self.write_playback_health_snapshot(
                tts_requested=True,
                tts_audio_ready=True,
                audio_path=str(translated_audio_path),
                audio_valid=translated_audio_path.exists() and translated_audio_path.stat().st_size > 0,
                playback_requested=True,
                playback_queued=replay_result.status == "Queued",
                playback_backend_started_if_available=replay_result.status in {"Playing", "Completed"},
                playback_failed=replay_result.status not in {"Playing", "Queued", "Completed"},
                playback_error="" if replay_result.status in {"Playing", "Queued", "Completed"} else replay_result.message,
                output_backend="Windows playback",
                output_device_name_if_available=self.output_device_combo.currentText(),
                )
            self._schedule_playback_reports(segment, translated_audio_path, self.selected_output_device_id())
        elif direct_playback:
            self._schedule_direct_playback_reports(segment)
        try:
            if segment is not None:
                segment_timing = {
                    "segment_candidate_start_time": segment.latency.segment_candidate_start_time,
                    "first_energy_above_noise_time": segment.latency.first_energy_above_noise_time,
                    "first_voiced_frame_time": segment.latency.first_voiced_frame_time,
                    "first_confirmed_speech_time": segment.latency.first_confirmed_speech_time,
                    "first_user_speech_time": segment.latency.first_user_speech_time,
                    "speech_detect_time": segment.latency.first_voiced_frame_time,
                    "speech_detect_ms": int(max(0, segment.latency.speech_detection_ms or segment.latency.vad_speech_detect_ms)),
                    "speech_confirmation_ms": segment.latency.speech_confirmation_ms,
                    "speech_end_time": segment.latency.speech_end_time,
                    "endpoint_decision_time": segment.latency.endpoint_decision_time,
                    "asr_queue_enter_time": segment.latency.asr_queue_enter_time,
                    "asr_queue_submit_time": segment.latency.asr_queue_submit_time or segment.latency.asr_queue_enter_time,
                    "asr_worker_start_time": segment.latency.asr_worker_start_time or segment.latency.asr_start_time,
                    "asr_start_time": segment.latency.asr_start_time,
                    "asr_end_time": segment.latency.asr_end_time,
                    "transcript_text_ready_time": segment.latency.transcript_text_ready_time or segment.latency.asr_end_time,
                    "translation_start_time": segment.latency.translation_start_time,
                    "translation_end_time": segment.latency.translation_end_time,
                    "translate_queue_submit_time": segment.latency.translate_queue_submit_time or segment.latency.translation_start_time,
                    "translate_worker_start_time": segment.latency.translate_worker_start_time or segment.latency.translation_start_time,
                    "translation_text_ready_time": segment.latency.translation_text_ready_time or segment.latency.translation_end_time,
                    "transcript_text_visible_time": segment.latency.transcript_text_visible_time,
                    "translation_text_visible_time": segment.latency.translation_text_visible_time,
                    "tts_start_time": segment.latency.tts_start_time,
                    "tts_end_time": segment.latency.tts_end_time,
                    "tts_result_received_time": segment.latency.tts_result_received_time,
                    "tts_playback_request_ready_time": segment.latency.tts_playback_request_ready_time,
                }
                bundle = self._build_latency_report_bundle(segment)
                write_json_report_async(
                    "latency_debug_latest.json",
                    {
                        "segment": segment.to_dict(),
                        "segment_timing": segment_timing,
                        "text_latency": bundle["text_latency"],
                        "text_latency_breakdown": bundle["text_latency_breakdown"],
                        "audio_verify_breakdown": bundle["audio_verify_breakdown"],
                        "stt_breakdown": bundle["stt_breakdown"],
                        "translate_breakdown": bundle["translate_breakdown"],
                        "tts_breakdown": bundle["tts_breakdown"],
                        "accepted": True,
                        "rejection_reason": "",
                        "asr_status": "Completed",
                        "translation_status": "Completed",
                        "event_messages": [f"TTS {getattr(result, 'status', '')}"],
                        "active_asr_device": self.runtime.asr_loader.device,
                        "active_asr_compute_type": self.runtime.asr_loader.compute_type,
                        "cuda_core_status": self.runtime.cuda_status.core_status if self.runtime.cuda_status else "",
                    },
                )
        except Exception as exc:
            self.log_event("WARN", "Could not refresh latency or benchmark report after TTS.", exc)
        self._schedule_session_persist()
        if self.pending_tts_jobs:
            self._schedule_pending_tts_drain()

    def _resolve_playback_segment(self, audio_path: Path) -> TranscriptSegment | None:
        segment_id = self._pending_playback_segment_id_by_path.get(str(audio_path), "")
        if not segment_id:
            return None
        return self.find_segment(segment_id)

    def _segment_trace(self, segment: TranscriptSegment) -> MetricTrace:
        trace = segment.latency.metric_trace.get("official_trace_obj")
        if isinstance(trace, MetricTrace):
            return trace
        trace = MetricTrace(
            session_id=segment.session_id,
            segment_id=segment.segment_id,
            source_text=segment.input_text,
            translated_text=segment.translated_text,
        )
        segment.latency.metric_trace["official_trace_obj"] = trace
        return trace

    def _sync_trace_export(self, segment: TranscriptSegment) -> None:
        trace = self._segment_trace(segment)
        cache_key = str(getattr(segment, "segment_id", ""))
        event_count = len(trace.events)
        summary_cache_store = getattr(self, "_trace_summary_cache", None)
        if summary_cache_store is None:
            summary_cache_store = {}
            try:
                self._trace_summary_cache = summary_cache_store
            except Exception:
                pass
        event_count_cache_store = getattr(self, "_trace_export_event_count_cache", None)
        if event_count_cache_store is None:
            event_count_cache_store = {}
            try:
                self._trace_export_event_count_cache = event_count_cache_store
            except Exception:
                pass
        stopwatch_alignment_cache = getattr(self, "_stopwatch_alignment_event_count_cache", None)
        if stopwatch_alignment_cache is None:
            stopwatch_alignment_cache = {}
            try:
                self._stopwatch_alignment_event_count_cache = stopwatch_alignment_cache
            except Exception:
                pass
        summary_cache = summary_cache_store.get(cache_key)
        if summary_cache is not None and summary_cache[0] == event_count:
            trace_payload = summary_cache[1]
            if event_count_cache_store.get(cache_key) == event_count:
                return
            event_count_cache_store[cache_key] = event_count
        else:
            if event_count_cache_store.get(cache_key) == event_count:
                return
            event_count_cache_store[cache_key] = event_count
            trace.build_summary()
            trace_payload = trace.to_dict()
            summary_cache_store[cache_key] = (event_count, trace_payload)
        segment.latency.metric_trace["official_trace"] = trace_payload
        write_json_report_async("simple_metric_trace_latest.json", trace_payload)
        if stopwatch_alignment_cache.get(cache_key) != event_count:
            stopwatch_alignment_cache[cache_key] = event_count
            self._write_stopwatch_alignment(segment)

    def _schedule_post_tts_ui_refresh(self, segment: TranscriptSegment | None) -> None:
        if segment is None:
            return
        def runner() -> None:
            try:
                self.update_benchmark_panel()
                write_json_report_async(
                    "short_utterance_debug_latest.json",
                    build_short_utterance_debug_payload(segment),
                )
            except Exception as exc:
                self.log_event("WARN", "Could not refresh post-TTS UI state.", exc)

        try:
            QTimer.singleShot(0, runner)
        except Exception:
            runner()

    def _write_post_tts_health_snapshot(
        self,
        result: object,
        translated_audio_path: Path,
        *,
        playback_requested: bool,
        playback_queued: bool,
        playback_backend_started_if_available: bool,
        playback_failed: bool,
        playback_error: str,
    ) -> None:
        self.write_playback_health_snapshot(
            tts_requested=True,
            tts_audio_ready=True,
            audio_path=str(translated_audio_path),
            audio_valid=translated_audio_path.exists() and translated_audio_path.stat().st_size > 0,
            playback_requested=playback_requested,
            playback_queued=playback_queued,
            playback_backend_started_if_available=playback_backend_started_if_available,
            playback_failed=playback_failed,
            playback_error=playback_error,
            output_backend=getattr(result, "mode", "local_tts"),
            output_device_name_if_available=self.output_device_combo.currentText(),
        )

    def _schedule_playback_reports(self, segment: TranscriptSegment, audio_path: Path, output_device_id: int | None) -> None:
        def runner() -> None:
            try:
                metric_groups = build_metric_groups(segment)
                write_json_report_async(
                    "latency_debug_latest.json",
                    {
                        "segment": segment.to_dict(),
                        "segment_timing": {
                            "tts_request_start_time": segment.latency.tts_request_start_time,
                            "tts_playback_requested_time": segment.latency.tts_playback_requested_time,
                            "tts_playback_queue_put_time": segment.latency.tts_playback_queue_put_time,
                            "tts_playback_worker_dequeued_time": segment.latency.tts_playback_worker_dequeued_time,
                            "tts_playback_backend_prep_start_time": segment.latency.tts_playback_backend_prep_start_time,
                            "tts_playback_backend_prep_end_time": segment.latency.tts_playback_backend_prep_end_time,
                            "tts_playback_backend_call_start_time": segment.latency.tts_playback_backend_call_start_time,
                            "tts_playback_audio_start_time": segment.latency.tts_playback_audio_start_time,
                            "tts_playback_backend_return_time": segment.latency.tts_playback_backend_return_time,
                            "tts_playback_audio_path": str(audio_path),
                            "tts_playback_output_device_id": output_device_id,
                        },
                        "text_latency": build_text_latency_payload(segment, session_id=segment.session_id),
                        "text_latency_breakdown": build_text_latency_breakdown(segment),
                        "metric_groups": metric_groups,
                        "main_bottleneck_stage": metric_groups["main_bottleneck_stage"],
                        "main_bottleneck_reason": metric_groups["main_bottleneck_reason"],
                        "audio_verify_bottleneck": metric_groups["audio_verify_bottleneck"],
                        "stt_bottleneck": metric_groups["stt_bottleneck"],
                        "translate_bottleneck": metric_groups["translate_bottleneck"],
                        "tts_bottleneck": metric_groups["tts_bottleneck"],
                        "accepted": True,
                        "rejection_reason": "",
                        "asr_status": "Completed",
                        "translation_status": "Completed",
                        "event_messages": ["Playback audio started."],
                        "active_asr_device": self.runtime.asr_loader.device,
                        "active_asr_compute_type": self.runtime.asr_loader.compute_type,
                        "cuda_core_status": self.runtime.cuda_status.core_status if self.runtime.cuda_status else "",
                    },
                )
                write_json_report_async(
                    "forensic_metric_trace_latest.json",
                    build_forensic_trace_payload(
                        segment,
                        session_id=segment.session_id,
                    ),
                )
                self.write_playback_health_snapshot(
                    tts_requested=True,
                    tts_audio_ready=True,
                    audio_path=str(audio_path),
                    audio_valid=audio_path.exists() and audio_path.stat().st_size > 0,
                    playback_requested=True,
                    playback_queued=True,
                    playback_backend_started_if_available=True,
                    playback_failed=False,
                    playback_error="",
                    output_backend="Windows playback",
                    output_device_name_if_available=self.output_device_combo.currentText(),
                )
            except Exception as exc:
                self.log_event("WARN", "Could not refresh latency report after playback start.", exc)

        threading.Thread(target=runner, name=f"TranslateITPlaybackReport-{segment.segment_id}", daemon=True).start()

    def _schedule_direct_playback_reports(self, segment: TranscriptSegment) -> None:
        def runner() -> None:
            try:
                metric_groups = build_metric_groups(segment)
                write_json_report_async(
                    "latency_debug_latest.json",
                    {
                        "segment": segment.to_dict(),
                        "segment_timing": {
                            "tts_request_start_time": getattr(segment.latency, "tts_request_start_time", ""),
                            "tts_audio_ready_time": getattr(segment.latency, "tts_audio_ready_time", ""),
                            "tts_direct_speak_called_time": getattr(segment.latency, "tts_direct_speak_called_time", ""),
                            "tts_backend_name": getattr(segment.latency, "tts_backend_name", ""),
                            "tts_backend_selected": getattr(segment.latency, "tts_backend_selected", ""),
                        },
                        "text_latency": build_text_latency_payload(segment, session_id=segment.session_id),
                        "text_latency_breakdown": build_text_latency_breakdown(segment),
                        "metric_groups": metric_groups,
                        "main_bottleneck_stage": metric_groups["main_bottleneck_stage"],
                        "main_bottleneck_reason": metric_groups["main_bottleneck_reason"],
                        "audio_verify_bottleneck": metric_groups["audio_verify_bottleneck"],
                        "stt_bottleneck": metric_groups["stt_bottleneck"],
                        "translate_bottleneck": metric_groups["translate_bottleneck"],
                        "tts_bottleneck": metric_groups["tts_bottleneck"],
                        "accepted": True,
                        "rejection_reason": "",
                        "asr_status": "Completed",
                        "translation_status": "Completed",
                        "event_messages": ["Direct SAPI playback started."],
                        "active_asr_device": self.runtime.asr_loader.device,
                        "active_asr_compute_type": self.runtime.asr_loader.compute_type,
                        "cuda_core_status": self.runtime.cuda_status.core_status if self.runtime.cuda_status else "",
                    },
                )
            except Exception as exc:
                self.log_event("WARN", "Could not refresh direct playback report.", exc)

        threading.Thread(target=runner, name=f"TranslateITDirectPlaybackReport-{segment.segment_id}", daemon=True).start()

    def _write_stopwatch_alignment(self, segment: TranscriptSegment) -> None:
        try:
            manual_ref_path = PROJECT_ROOT / "UserData" / "ConfigData" / "manual_latency_reference.json"
            manual_stopwatch_ms: int | None = None
            if manual_ref_path.exists():
                data = json.loads(manual_ref_path.read_text(encoding="utf-8"))
                value = data.get("latest_manual_stopwatch_ms")
                if isinstance(value, (int, float)) and value > 0:
                    manual_stopwatch_ms = int(value)
            trace = self._segment_trace(segment)
            trace.build_summary()
            official = trace.official_metrics
            candidates = trace.candidate_latencies_ms
            app_official_latency_ms = 0
            closest_candidate_event = ""
            closest_candidate_latency_ms = None
            closest_candidate_delta_ms = None
            if manual_stopwatch_ms is not None:
                best_delta: int | None = None
                for name, value in candidates.items():
                    if not isinstance(value, int) or value <= 0:
                        continue
                    delta = abs(manual_stopwatch_ms - value)
                    if best_delta is None or delta < best_delta:
                        best_delta = delta
                        closest_candidate_event = name
                        closest_candidate_latency_ms = value
                        closest_candidate_delta_ms = delta
            delta_ms = None
            if manual_stopwatch_ms is not None and isinstance(app_official_latency_ms, int):
                delta_ms = abs(manual_stopwatch_ms - app_official_latency_ms)
            payload = {
                "manual_stopwatch_reference_ms": manual_stopwatch_ms,
                "app_official_latency_ms": app_official_latency_ms,
                "delta_ms": delta_ms,
                "candidate_latencies_ms": candidates,
                "closest_candidate_event": closest_candidate_event,
                "closest_candidate_latency_ms": closest_candidate_latency_ms,
                "closest_candidate_delta_ms": closest_candidate_delta_ms,
                "recommended_end_event": official.get("official_voice_latency_end_event", ""),
                "measurement_status": official.get("measurement_status", "PARTIAL"),
                "reason": official.get("official_voice_latency_end_event_reason", ""),
            }
            write_json_report_async("stopwatch_alignment_latest.json", payload)
            if manual_stopwatch_ms is not None and isinstance(app_official_latency_ms, int):
                failure_payload = {
                    "manual_stopwatch_ms": manual_stopwatch_ms,
                    "app_official_latency_ms": app_official_latency_ms,
                    "delta_ms": delta_ms,
                    "official_end_event": official.get("official_voice_latency_end_event", ""),
                    "candidate_latencies_ms": candidates,
                    "closest_candidate": closest_candidate_event,
                    "closest_candidate_delta_ms": closest_candidate_delta_ms,
                    "missing_unmeasurable_event": official.get("official_voice_latency_end_event_reason", ""),
                    "backend_limitation": trace.playback_backend.get("backend_event_limitation", ""),
                    "next_engineering_recommendation": "Expose an actual audible-start callback from the playback backend or replace the blocking backend with a timestampable output stream hook.",
                }
                if delta_ms is None or delta_ms > 200:
                    write_json_report_async("latency_measurement_failure_latest.json", failure_payload)
        except Exception as exc:
            self.log_event("WARN", "Could not write stopwatch alignment report.", exc)

    def handle_playback_requested(self, audio_path: Path, output_device_id: int | None, requested_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_request_perf_by_path[str(audio_path)] = requested_perf
        segment.latency.tts_playback_requested_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        trace = self._segment_trace(segment)
        requested_ns = int(requested_perf * 1_000_000_000)
        trace.mark_at(
            "replay_request",
            requested_ns,
            "ReplayController.replay_audio",
            "Replay request dispatched from UI",
        )
        trace.mark_at(
            "playback_request",
            requested_ns,
            "AudioPlaybackService.play_wav",
            "Playback request entered playback service",
        )
        trace.playback_backend.update(
            {
                "backend_name": "sounddevice" if getattr(self.runtime.replay.playback, "_play_with_sounddevice_stream", None) is not None else "winsound",
                "backend_blocking": True,
                "backend_flags": "OutputStream" if getattr(self.runtime.replay.playback, "_play_with_sounddevice_stream", None) is not None else "SND_FILENAME|SND_SYNC|SND_NODEFAULT",
                "backend_start_is_actual_audible_start": "sounddevice_callback" if getattr(self.runtime.replay.playback, "_play_with_sounddevice_stream", None) is not None else "unknown",
                "backend_event_limitation": "Sounddevice callback marks audible start; winsound is fallback only.",
            }
        )
        self._sync_trace_export(segment)

    def handle_playback_queued(self, audio_path: Path, output_device_id: int | None, queued_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_queue_perf_by_path[str(audio_path)] = queued_perf
        segment.latency.tts_playback_queue_put_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._segment_trace(segment).mark_at(
            "playback_queue_put",
            int(queued_perf * 1_000_000_000),
            "AudioPlaybackService.play_wav",
            "Playback item was queued",
        )
        self._sync_trace_export(segment)

    def handle_playback_worker_dequeued(self, audio_path: Path, output_device_id: int | None, dequeued_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_worker_dequeue_perf_by_path[str(audio_path)] = dequeued_perf
        segment.latency.tts_playback_worker_dequeued_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._segment_trace(segment).mark_at(
            "playback_worker_dequeue",
            int(dequeued_perf * 1_000_000_000),
            "AudioPlaybackService.worker",
            "Playback worker picked up the item",
        )
        self._sync_trace_export(segment)

    def handle_playback_backend_prep_start(self, audio_path: Path, output_device_id: int | None, started_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_backend_prep_start_perf_by_path[str(audio_path)] = started_perf
        segment.latency.tts_playback_backend_prep_start_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._segment_trace(segment).mark_at(
            "playback_before_backend_call",
            int(started_perf * 1_000_000_000),
            "AudioPlaybackService._play_one",
            "Playback backend preparation started",
        )
        self._sync_trace_export(segment)

    def handle_playback_backend_prep_end(self, audio_path: Path, output_device_id: int | None, ended_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_backend_prep_end_perf_by_path[str(audio_path)] = ended_perf
        segment.latency.tts_playback_backend_prep_end_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._segment_trace(segment).mark_at(
            "playback_backend_prep_end",
            int(ended_perf * 1_000_000_000),
            "AudioPlaybackService._play_one",
            "Playback backend preparation ended",
        )
        self._sync_trace_export(segment)

    def handle_playback_backend_call_start(self, audio_path: Path, output_device_id: int | None, started_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_backend_start_perf_by_path[str(audio_path)] = started_perf
        prep_start_perf = self._pending_playback_backend_prep_start_perf_by_path.get(str(audio_path))
        prep_end_perf = self._pending_playback_backend_prep_end_perf_by_path.get(str(audio_path))
        request_perf = self._pending_playback_request_perf_by_path.get(str(audio_path))
        queue_perf = self._pending_playback_queue_perf_by_path.get(str(audio_path))
        worker_perf = self._pending_playback_worker_dequeue_perf_by_path.get(str(audio_path))
        segment.latency.tts_playback_request_time = segment.latency.tts_playback_request_time or datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_playback_queue_put_time = segment.latency.tts_playback_queue_put_time or datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_playback_worker_dequeued_time = segment.latency.tts_playback_worker_dequeued_time or datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_playback_backend_call_start_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._segment_trace(segment).mark_at(
            "playback_backend_call_start",
            int(started_perf * 1_000_000_000),
            "AudioPlaybackService._play_one",
            "Playback backend call started",
        )
        segment.latency.tts_playback_prepare_ms = 0
        segment.latency.tts_playback_start_ms = 0
        updated_widget = self.transcript_widgets_by_segment_id.get(segment.segment_id)
        if updated_widget is not None:
            updated_widget.update_view_model(self._build_transcript_card_view_model(segment))
        self.write_playback_health_snapshot(
            tts_requested=True,
            tts_audio_ready=True,
            audio_path=str(audio_path),
            audio_valid=audio_path.exists() and audio_path.stat().st_size > 0,
            playback_requested=True,
            playback_queued=True,
            playback_backend_started_if_available=True,
            playback_failed=False,
            playback_error="",
            output_backend="Windows playback",
            output_device_name_if_available=self.output_device_combo.currentText(),
        )
        self._sync_trace_export(segment)

    def handle_playback_started(self, audio_path: Path, output_device_id: int | None, started_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_audio_start_perf_by_path[str(audio_path)] = started_perf
        request_perf = self._pending_playback_request_perf_by_path.get(str(audio_path))
        request_time = _parse_iso_time(segment.latency.tts_playback_requested_time) or _parse_iso_time(segment.latency.tts_playback_request_ready_time)
        if request_perf is not None and request_time is not None:
            segment.latency.tts_playback_audio_start_time = (
                request_time + timedelta(seconds=max(0.0, started_perf - request_perf))
            ).isoformat(timespec="milliseconds")
        else:
            segment.latency.tts_playback_audio_start_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        segment.latency.tts_playback_start_time = segment.latency.tts_playback_audio_start_time
        trace = self._segment_trace(segment)
        started_ns = int(started_perf * 1_000_000_000)
        trace.mark_at(
            "playback_first_buffer_submit",
            started_ns,
            "AudioPlaybackService.callback",
            "first measurable output buffer submission",
        )
        trace.mark_at(
            "actual_first_audio_buffer_played",
            started_ns,
            "AudioPlaybackService.callback",
            "best available audible start marker",
        )
        self._log_pipeline_trace(
            "playback_started_or_proxy",
            segment=segment,
            stage="playback",
            status="proxy",
            details={"audio_path": str(audio_path), "output_device_id": output_device_id if output_device_id is not None else "default"},
        )
        self._sync_trace_export(segment)
        updated_widget = self.transcript_widgets_by_segment_id.get(segment.segment_id)
        if updated_widget is not None:
            updated_widget.update_view_model(self._build_transcript_card_view_model(segment))
        self._schedule_playback_reports(segment, audio_path, output_device_id)

    def handle_playback_backend_return(self, audio_path: Path, output_device_id: int | None, returned_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._pending_playback_backend_return_perf_by_path[str(audio_path)] = returned_perf
        segment.latency.tts_playback_backend_return_time = datetime.now().astimezone().isoformat(timespec="milliseconds")
        self._sync_trace_export(segment)

    def handle_playback_audio_file_open_start(self, audio_path: Path, output_device_id: int | None, started_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._segment_trace(segment).mark_at(
            "playback_audio_file_open_start",
            int(started_perf * 1_000_000_000),
            "AudioPlaybackService._read_wav",
            "Playback audio file open started",
        )
        self._sync_trace_export(segment)

    def handle_playback_audio_file_open_end(self, audio_path: Path, output_device_id: int | None, ended_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._segment_trace(segment).mark_at(
            "playback_audio_file_open_end",
            int(ended_perf * 1_000_000_000),
            "AudioPlaybackService._read_wav",
            "Playback audio file open ended",
        )
        self._sync_trace_export(segment)

    def handle_playback_audio_file_read_start(self, audio_path: Path, output_device_id: int | None, started_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        self._segment_trace(segment).mark_at(
            "playback_audio_file_read_start",
            int(started_perf * 1_000_000_000),
            "AudioPlaybackService._read_wav",
            "Playback audio file read started",
        )
        self._sync_trace_export(segment)

    def handle_playback_audio_file_read_end(self, audio_path: Path, output_device_id: int | None, ended_perf: float) -> None:
        segment = self._resolve_playback_segment(audio_path)
        if segment is None:
            return
        metric_groups = build_metric_groups(segment)
        trace = self._segment_trace(segment)
        trace.mark_at(
            "playback_audio_file_read_end",
            int(ended_perf * 1_000_000_000),
            "AudioPlaybackService._read_wav",
            "Playback audio file read ended",
        )
        self._sync_trace_export(segment)
        try:
            write_json_report_async(
                "latency_debug_latest.json",
                {
                    "segment": segment.to_dict(),
                    "segment_timing": {
                        "tts_playback_requested_time": segment.latency.tts_playback_requested_time,
                        "tts_playback_queue_put_time": segment.latency.tts_playback_queue_put_time,
                        "tts_playback_worker_dequeued_time": segment.latency.tts_playback_worker_dequeued_time,
                        "tts_playback_backend_prep_start_time": segment.latency.tts_playback_backend_prep_start_time,
                        "tts_playback_backend_prep_end_time": segment.latency.tts_playback_backend_prep_end_time,
                        "tts_playback_backend_call_start_time": segment.latency.tts_playback_backend_call_start_time,
                        "tts_playback_backend_return_time": segment.latency.tts_playback_backend_return_time,
                        "tts_playback_audio_path": str(audio_path),
                        "tts_playback_output_device_id": output_device_id,
                    },
                    "text_latency": build_text_latency_payload(segment, session_id=segment.session_id),
                    "text_latency_breakdown": build_text_latency_breakdown(segment),
                    "metric_groups": metric_groups,
                    "main_bottleneck_stage": metric_groups["main_bottleneck_stage"],
                    "main_bottleneck_reason": metric_groups["main_bottleneck_reason"],
                    "audio_verify_bottleneck": metric_groups["audio_verify_bottleneck"],
                    "stt_bottleneck": metric_groups["stt_bottleneck"],
                    "translate_bottleneck": metric_groups["translate_bottleneck"],
                    "tts_bottleneck": metric_groups["tts_bottleneck"],
                    "accepted": True,
                    "rejection_reason": "",
                    "asr_status": "Completed",
                    "translation_status": "Completed",
                    "event_messages": ["Playback backend returned."],
                    "active_asr_device": self.runtime.asr_loader.device,
                    "active_asr_compute_type": self.runtime.asr_loader.compute_type,
                    "cuda_core_status": self.runtime.cuda_status.core_status if self.runtime.cuda_status else "",
                },
            )
            write_json_report_async(
                "forensic_metric_trace_latest.json",
                build_forensic_trace_payload(
                    segment,
                    session_id=segment.session_id,
                ),
            )
            self.write_playback_health_snapshot(
                tts_requested=True,
                tts_audio_ready=True,
                audio_path=str(audio_path),
                audio_valid=audio_path.exists() and audio_path.stat().st_size > 0,
                playback_requested=True,
                playback_queued=True,
                playback_backend_started_if_available=True,
                playback_failed=False,
                playback_error="",
                output_backend="Windows playback",
                output_device_name_if_available=self.output_device_combo.currentText(),
            )
        except Exception as exc:
            self.log_event("WARN", "Could not refresh latency report after playback return.", exc)

    def handle_copy_text(self, text: str) -> None:
            QApplication.clipboard().setText(text)
            self.log_event("INFO", "Copied text to clipboard.")


    _TRANSLATE_IT_WINDOW_METHOD_NAMES = [
        "_build_engine_readiness_payload",
        "_set_text_if_changed",
        "_get_validation_items",
        "_get_benchmark_summary",
        "_segment_card_view_model_fingerprint",
        "set_status",
        "update_start_button_state",
        "write_engine_readiness_report",
        "begin_startup_warmup",
        "_reset_tts_dispatch_state",
        "handle_startup_warmup_result",
        "show_replay_blocked_notification",
        "set_level",
        "set_input_state",
        "handle_primary_start_stop",
        "handle_run_diagnostic",
        "handle_diagnostic_result",
        "handle_start_capture",
        "handle_stop_capture",
        "add_transcript_card",
        "_build_transcript_card_view_model",
        "show_latency_details",
        "find_segment",
        "_pipeline_trace_id",
        "_log_pipeline_trace",
        "_on_pipeline_segment_ready",
        "_drain_pending_pipeline_results",
        "handle_pipeline_calibration",
        "handle_pipeline_segment",
        "handle_pipeline_error",
        "handle_worker_error",
        "handle_pipeline_finished",
        "handle_replay_card",
        "handle_speak_translation",
        "start_tts_generation",
        "_dequeue_pending_tts_job",
        "_queue_pending_tts_job",
        "_schedule_session_persist",
        "_build_latency_report_bundle",
        "_write_text_latency_reports",
        "handle_tts_result",
        "_resolve_playback_segment",
        "_segment_trace",
        "_sync_trace_export",
        "_schedule_post_tts_ui_refresh",
        "_write_post_tts_health_snapshot",
        "_schedule_playback_reports",
        "_schedule_direct_playback_reports",
        "_write_stopwatch_alignment",
        "_begin_post_stop_warmup",
        "_clear_startup_worker",
        "_clear_pending_start_after_ready",
        "_runtime_tts_is_idle",
        "_request_pending_start_after_ready",
        "_launch_pending_start_after_ready",
        "_handle_startup_warmup_error",
        "handle_playback_requested",
        "handle_playback_queued",
        "handle_playback_worker_dequeued",
        "handle_playback_backend_prep_start",
        "handle_playback_backend_prep_end",
        "handle_playback_backend_call_start",
        "handle_playback_started",
        "handle_playback_backend_return",
        "handle_playback_audio_file_open_start",
        "handle_playback_audio_file_open_end",
        "handle_playback_audio_file_read_start",
        "handle_playback_audio_file_read_end",
        "handle_copy_text",
    ]
    for _method_name in _TRANSLATE_IT_WINDOW_METHOD_NAMES:
        setattr(TranslateITWindow, _method_name, globals()[_method_name])
    del _method_name
    del _TRANSLATE_IT_WINDOW_METHOD_NAMES


def try_create_qt_application() -> object | None:
    if not PYSIDE_AVAILABLE:
        return None
    application_class = CrashLoggingApplication if CrashLoggingApplication is not None else QApplication
    return application_class([])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="TranslateIT launcher")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args(argv)
    if args.validate_only:
        return run_validate_only()
    install_global_crash_recorders(
        startup_context=lambda: {
            "phase": "app_main.main",
            "project_root": str(PROJECT_ROOT),
            "pyside_available": PYSIDE_AVAILABLE,
        },
    )
    lock = SingleInstanceLock()
    if not lock.acquire():
        append_log("launcher_latest.log", "WARN", "another_instance_detected", {"project_root": str(PROJECT_ROOT)})
        show_already_running_message()
        return 0
    try:
        config = load_default_config()
        runtime = create_runtime(config)
        print_lines(build_startup_summary(config))
        print_lines(build_dependency_summary(runtime))
        runtime.log_event("INFO", "Launcher startup.", build_startup_summary(config))
        if not PYSIDE_AVAILABLE:
            append_log("app_crash_latest.log", "ERROR", "PySide6 is not installed. Console diagnostics only.")
            return run_validate_only()
        app = try_create_qt_application()
        if app is None:
            append_log("app_crash_latest.log", "ERROR", "Qt application could not be created.")
            return 1
        window = TranslateITWindow(runtime)
        window.showMaximized()
        return app.exec()  # type: ignore[no-any-return]
    except Exception as exc:
        crash_log = PROJECT_ROOT / "UserData" / "LogData" / "app_crash_latest.log"
        write_crash_record(
            "app_crash",
            "app_main_startup_failed",
            exc,
            details=traceback.format_exc(),
            context={
                "phase": "app_main.main",
                "project_root": str(PROJECT_ROOT),
                "pyside_available": PYSIDE_AVAILABLE,
            },
        )
        try:
            ctypes.windll.user32.MessageBoxW(  # type: ignore[attr-defined]
                None,
                f"TranslateIT failed to start. See {crash_log}.",
                "TranslateIT",
                0x10 | 0x40000,
            )
        except Exception:
            pass
        append_log("launcher_latest.log", "ERROR", "TranslateIT startup failed.", str(exc))
        return 1
    finally:
        lock.release()


if __name__ == "__main__":
    raise SystemExit(main())
