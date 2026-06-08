from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime
import queue
import threading
import uuid
from pathlib import Path
from time import perf_counter
from typing import Any
import wave

import numpy as np

try:  # pragma: no cover - optional GUI dependency
    from PySide6.QtCore import QThread, Signal
except ImportError:  # pragma: no cover - fallback for importability
    QThread = object  # type: ignore[assignment]

    class _SignalFactory:
        def __call__(self, *args: Any, **kwargs: Any) -> Any:
            return None

    Signal = _SignalFactory()  # type: ignore[assignment]

try:  # pragma: no cover - optional runtime dependency
    import sounddevice as sd
except ImportError:  # pragma: no cover - dependency missing in some environments
    sd = None

from EngineData.LauncherApp.app_config import EngineConfig
from EngineData.LauncherApp.app_logger import (
    append_runtime_pipeline_log,
    write_json_report,
    write_json_report_async,
    write_text_report_async,
)
from EngineData.LauncherApp.language_routing import (
    infer_language_bias_from_text,
    is_focus_language,
    normalize_short_id_focus_source_text,
    should_translate_segment,
)
from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.LauncherApp.ui_state import UIState
from EngineData.TranscriptEngine.asr_model_loader import ASRModelLoader
from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport
from EngineData.TranscriptEngine.audio_calibration import AudioCalibration, CalibrationResult
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.TranscriptEngine.audio_preprocessing import AudioPreprocessor
from EngineData.TranscriptEngine.audio_calibration import normalize_input_sensitivity
from EngineData.TranscriptEngine.segment_builder import SegmentBuilder
from EngineData.TranscriptEngine.transcript_segment import (
    MetricMetrics,
    QualityMetrics,
    ReplayPaths,
    TranscriptSegment,
)
from EngineData.TranscriptEngine.vad_pipeline import VADPipeline
from EngineData.TranslateEngine.translation_engine import TranslationEngine, TranslationRequest


@dataclass(slots=True)
class PipelineSegmentResult:
    accepted: bool
    segment: TranscriptSegment
    card: TranscriptCardViewModel
    source_audio_path: Path
    calibration: CalibrationResult
    rejection_reason: str = ""
    asr_status: str = ""
    translation_status: str = ""
    event_messages: list[str] | None = None


CAPTURE_MODE_DIAGNOSTIC_ONLY = "Diagnostic Only"
CAPTURE_MODE_MOCK_PIPELINE = "Mock Pipeline"
CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION = "Real ASR + Mock Translation"
CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION = "Real ASR + Real Translation"


def _concat_blocks(blocks: list[np.ndarray]) -> np.ndarray:
    if not blocks:
        return np.zeros(0, dtype=np.float32)
    normalized_blocks = [np.asarray(block, dtype=np.float32).reshape(-1) for block in blocks]
    return np.concatenate(normalized_blocks).astype(np.float32)


def _write_wav(path: Path, samples: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.asarray(samples, dtype=np.float32), -1.0, 1.0)
    pcm16 = (pcm * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm16.tobytes())


def _write_wav_async(path: Path, samples: np.ndarray, sample_rate: int) -> None:
    thread = threading.Thread(
        target=_write_wav,
        args=(path, np.asarray(samples, dtype=np.float32).copy(), sample_rate),
        daemon=True,
        name=f"TranslateIT-WavWrite-{path.stem}",
    )
    thread.start()


def _audio_evidence(samples: np.ndarray, noise_floor_rms: float, sensitivity: str = "Normal") -> dict[str, float | str]:
    sensitivity = normalize_input_sensitivity(sensitivity)
    array = np.asarray(samples, dtype=np.float32).reshape(-1)
    if array.size == 0:
        return {
            "reason": "rejected_silence",
            "rms": 0.0,
            "peak": 0.0,
            "peak_to_rms_ratio": 0.0,
            "speech_to_noise_gap": 0.0,
            "voiced_frame_ratio": 0.0,
            "zero_crossing_rate": 0.0,
            "frame_energy_concentration": 0.0,
            "frame_active_ratio": 0.0,
            "impulse_edge_ratio": 0.0,
        }
    rms = float(np.sqrt(np.mean(np.square(array), dtype=np.float32)))
    peak = float(np.max(np.abs(array)))
    peak_to_rms_ratio = peak / max(rms, 0.0001)
    threshold = max(0.0025, noise_floor_rms * 1.45)
    voiced_ratio = float(np.count_nonzero(np.abs(array) >= threshold) / max(1, array.size))
    diff = np.diff(array)
    abs_diff = np.abs(diff)
    zero_crossing_rate = float(np.count_nonzero(np.signbit(array[:-1]) != np.signbit(array[1:])) / max(1, array.size - 1)) if array.size > 1 else 0.0
    impulse_threshold = max(0.006, noise_floor_rms * 1.8, rms * 1.7)
    impulse_edge_ratio = float(np.count_nonzero(abs_diff >= impulse_threshold) / max(1, abs_diff.size)) if abs_diff.size else 0.0
    frame_size = 320
    frame_count = max(1, array.size // frame_size)
    frame_energy_concentration = 0.0
    frame_active_ratio = 0.0
    if array.size >= frame_size:
        usable = array[: frame_count * frame_size].reshape(frame_count, frame_size)
        frame_energy = np.mean(np.square(usable, dtype=np.float32), axis=1)
        total_energy = float(np.sum(frame_energy, dtype=np.float32))
        if total_energy > 0.0:
            top_count = min(3, frame_energy.size)
            top_energy = float(np.sum(np.sort(frame_energy)[-top_count:], dtype=np.float32))
            frame_energy_concentration = top_energy / total_energy
        active_threshold = max((noise_floor_rms * 1.25) ** 2, (rms * 0.45) ** 2, 1e-7)
        frame_active_ratio = float(np.count_nonzero(frame_energy >= active_threshold) / max(1, frame_energy.size))
    min_peak = {"Low": 0.0085, "Normal": 0.0055, "High": 0.0040}.get(sensitivity, 0.0055)
    min_rms = {"Low": 0.0019, "Normal": 0.0010, "High": 0.0008}.get(sensitivity, 0.0010)
    min_voiced = {"Low": 0.040, "Normal": 0.020, "High": 0.012}.get(sensitivity, 0.020)
    gap = rms - noise_floor_rms
    strong_voiced_speech = sensitivity == "High" and voiced_ratio >= 0.16 and gap >= -0.0002 and peak >= max(min_peak * 0.80, 0.0042)
    reason = ""
    if peak < 0.002 and rms < 0.001:
        reason = "rejected_silence"
    elif rms < min_rms and peak < min_peak and not strong_voiced_speech:
        reason = "rejected_low_energy"
    elif gap < max(0.0010, noise_floor_rms * 0.18) and peak < max(min_peak * 1.20, 0.010):
        reason = "rejected_low_snr"
    elif voiced_ratio < min_voiced and peak < max(min_peak * 1.10, 0.009) and not strong_voiced_speech:
        reason = "rejected_unconfirmed_speech"
    elif array.size >= 320 and (
        (
            peak_to_rms_ratio >= 6.0
            and voiced_ratio <= 0.14
            and gap <= max(0.014, noise_floor_rms * 0.30)
            and frame_energy_concentration >= 0.58
            and frame_active_ratio <= 0.32
            and (
                impulse_edge_ratio >= 0.035
                or zero_crossing_rate <= 0.18
                or voiced_ratio <= 0.08
            )
        )
        or (
            peak_to_rms_ratio >= 7.2
            and voiced_ratio <= 0.10
            and gap <= max(0.012, noise_floor_rms * 0.25)
            and frame_energy_concentration >= 0.68
            and frame_active_ratio <= 0.24
            and impulse_edge_ratio >= 0.03
        )
    ) and not strong_voiced_speech:
        reason = "rejected_noise_like_impact"
    elif array.size >= 640 and (
        (
            peak_to_rms_ratio >= 7.0
            and voiced_ratio <= 0.10
            and frame_energy_concentration >= 0.70
            and frame_active_ratio <= 0.35
        )
        or (
            frame_energy_concentration >= 0.85
            and frame_active_ratio <= 0.28
            and peak_to_rms_ratio >= 5.5
            and voiced_ratio <= 0.10
        )
        or (
            impulse_edge_ratio >= 0.05
            and voiced_ratio <= 0.10
            and peak_to_rms_ratio >= 5.5
        )
        or (
            zero_crossing_rate <= 0.12
            and voiced_ratio <= 0.10
            and peak_to_rms_ratio >= 5.0
            and frame_active_ratio <= 0.35
        )
    ) and not strong_voiced_speech:
        reason = "rejected_noise_like_impulse"
    return {
        "reason": reason,
        "rms": rms,
        "peak": peak,
        "peak_to_rms_ratio": peak_to_rms_ratio,
        "speech_to_noise_gap": gap,
        "voiced_frame_ratio": voiced_ratio,
        "zero_crossing_rate": zero_crossing_rate,
        "frame_energy_concentration": frame_energy_concentration,
        "frame_active_ratio": frame_active_ratio,
        "impulse_edge_ratio": impulse_edge_ratio,
    }


def _reject_reason_code(reason: str) -> str:
    lowered = reason.lower()
    if "silence" in lowered:
        return "rejected_silence"
    if "profan" in lowered or "nonsense" in lowered or "hallucination" in lowered or "contextless" in lowered:
        return "rejected_content"
    if "focus" in lowered:
        return "rejected_focus"
    if "energy" in lowered or "threshold" in lowered:
        return "rejected_low_energy"
    if "impact" in lowered:
        return "rejected_noise_like_impact"
    if "snr" in lowered or "noise" in lowered:
        return "rejected_low_snr"
    if "short" in lowered:
        return "rejected_short_speech"
    if "clipping" in lowered:
        return "rejected_clipping"
    if "confirm" in lowered or "speech" in lowered:
        return "rejected_unconfirmed_speech"
    return reason


def _rejection_status_for_reason(reason: str) -> str:
    lowered = reason.lower()
    if "profan" in lowered or "nonsense" in lowered or "hallucination" in lowered or "contextless" in lowered:
        return "Rejected Content"
    if "focus" in lowered:
        return "Rejected Focus"
    if "silence" in lowered or "energy" in lowered or "snr" in lowered or "noise" in lowered or "impact" in lowered or "unconfirmed" in lowered:
        return "Rejected Silence"
    return "Rejected Content"


def _largest_latency_stage(segment: TranscriptSegment) -> str:
    stages = {
        "endpointing": segment.latency.endpointing_ms,
        "vad": segment.latency.vad_ms,
        "asr": segment.latency.asr_ms,
        "translation": segment.latency.translation_ms,
        "ui": segment.latency.ui_ms,
        "model_load": segment.latency.model_load_ms,
    }
    return max(stages, key=lambda key: stages[key])


def _select_endpoint_profile(
    *,
    speech_duration_ms: int,
    silence_ms: int,
    rms: float,
    peak: float,
    noise_floor_rms: float,
    voiced_frame_ratio: float,
    sensitivity: str,
    calibration: CalibrationResult | None = None,
) -> str:
    del speech_duration_ms, silence_ms, rms, peak, noise_floor_rms, voiced_frame_ratio, sensitivity, calibration
    return "unified_adaptive"


def _adaptive_endpoint_target_ms(
    *,
    speech_duration_ms: int,
    rms: float,
    peak: float,
    noise_floor_rms: float,
    voiced_frame_ratio: float,
    sensitivity: str,
) -> int:
    sensitivity = normalize_input_sensitivity(sensitivity)
    sensitivity_bias = {"Low": 80, "Normal": 0, "High": -160}.get(sensitivity, 0)
    short_speech = speech_duration_ms <= 1800
    compact_speech = speech_duration_ms <= 900
    very_short_speech = speech_duration_ms <= 700
    strong_signal = (
        voiced_frame_ratio >= 0.16
        and peak >= max(0.012, noise_floor_rms * 2.2)
        and (rms - noise_floor_rms) >= max(0.0028, noise_floor_rms * 0.55)
    )
    decent_signal = (
        voiced_frame_ratio >= 0.08
        and peak >= max(0.0075, noise_floor_rms * 1.55)
        and (rms - noise_floor_rms) >= max(0.0014, noise_floor_rms * 0.32)
    )
    if very_short_speech and strong_signal:
        return max(80, 105 + sensitivity_bias)
    if compact_speech and strong_signal:
        return max(90, 130 + sensitivity_bias)
    if short_speech and strong_signal:
        return max(110, 155 + sensitivity_bias)
    if short_speech and decent_signal:
        return max(130, 185 + sensitivity_bias)
    if strong_signal:
        return max(140, 210 + sensitivity_bias)
    if decent_signal:
        return max(180, 280 + sensitivity_bias)
    return max(220, 340 + sensitivity_bias)


def _cap_safe_endpoint_wait_ms(speech_duration_ms: int, endpoint_wait_ms: int) -> int:
    if speech_duration_ms <= 500 and endpoint_wait_ms > 55:
        return 55
    if speech_duration_ms <= 900 and endpoint_wait_ms > 60:
        return 60
    if speech_duration_ms <= 1400 and endpoint_wait_ms > 95:
        return 95
    if speech_duration_ms <= 2200 and endpoint_wait_ms > 150:
        return 150
    return endpoint_wait_ms


def _trim_silence_padding(samples: np.ndarray, *, sample_rate: int, noise_floor_rms: float) -> tuple[np.ndarray, int, int]:
    if samples.size == 0:
        return samples, 0, 0
    threshold = max(noise_floor_rms * 1.08, 0.0022)
    energy = np.abs(samples) >= threshold
    if not np.any(energy):
        return np.zeros(0, dtype=np.float32), 0, int(round(samples.size / max(1, sample_rate) * 1000.0))
    indices = np.where(energy)[0]
    start = max(0, int(indices[0] - 0.12 * sample_rate))
    end = min(samples.size, int(indices[-1] + 0.16 * sample_rate))
    trimmed = samples[start:end]
    trim_leading_ms = int(round((start / max(1, sample_rate)) * 1000.0))
    trim_trailing_ms = int(round(((samples.size - end) / max(1, sample_rate)) * 1000.0))
    return trimmed.astype(np.float32), trim_leading_ms, trim_trailing_ms


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def _speech_frame_confirmed(
    rms: float,
    peak: float,
    noise_floor_rms: float,
    sensitivity: str,
) -> bool:
    sensitivity = normalize_input_sensitivity(sensitivity)
    min_rms = {"Low": 0.0009, "Normal": 0.0006, "High": 0.00045}.get(sensitivity, 0.0006)
    min_peak = {"Low": 0.0035, "Normal": 0.0022, "High": 0.0018}.get(sensitivity, 0.0022)
    snr_gap = rms - noise_floor_rms
    snr_ratio = rms / max(noise_floor_rms, 0.00025)
    return (
        rms >= max(min_rms, noise_floor_rms * 1.002)
        and peak >= min_peak
        and (snr_gap >= max(0.00003, noise_floor_rms * 0.006) or snr_ratio >= 1.003)
    )


class LivePipelineThread(QThread):
    status_changed = Signal(str)
    level_changed = Signal(int)
    input_state_changed = Signal(str)
    message = Signal(str)
    calibration_ready = Signal(object)
    segment_ready = Signal(object)
    error = Signal(str)
    finished_signal = Signal()

    def __init__(
        self,
        runtime: Any,
        *,
        selected_device_id: int | None = None,
        developer_mode: bool = False,
        capture_mode: str = CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION,
        calibration: CalibrationResult | None = None,
    ) -> None:
        super().__init__()
        self.runtime = runtime
        self.selected_device_id = selected_device_id
        self.developer_mode = developer_mode
        self.capture_mode = capture_mode
        self.existing_calibration = calibration
        self.stop_requested = False
        self.quality_filter = ASRQualityFilter()
        self.segment_counter = max(0, self.runtime.session.segment_count)
        self.model_load_ms = 0
        self.stream_open_success = False
        self.stream_active = False
        self.callback_count = 0
        self.frames_received = 0
        self.last_audio_frame_time = ""
        self.last_error = ""
        self.last_worker_error = ""
        self.last_vad_rejection_reason = ""
        self.first_audio_callback_perf: float | None = None
        self.last_heartbeat_time = ""
        self.last_job_started_time = ""
        self.last_job_finished_time = ""
        self.stale_callbacks_rejected_count = 0

    def _segment_trace_id(self, segment: TranscriptSegment | None = None, *, segment_id: str = "") -> str:
        if segment is not None and getattr(segment, "trace_id", ""):
            return str(getattr(segment, "trace_id", ""))
        if segment is not None and getattr(segment, "segment_id", ""):
            base = str(getattr(segment, "segment_id", ""))
        else:
            base = segment_id
        if base:
            return f"trace-{base}"
        return f"trace-{uuid.uuid4().hex[:12]}"

    def _trace(
        self,
        event: str,
        *,
        segment: TranscriptSegment | None = None,
        stage: str = "",
        status: str = "",
        details: Any | None = None,
        segment_id: str = "",
    ) -> None:
        try:
            trace_id = self._segment_trace_id(segment, segment_id=segment_id)
            append_runtime_pipeline_log(
                trace_id,
                event,
                stage=stage,
                segment_id=getattr(segment, "segment_id", segment_id),
                status=status,
                details=details,
            )
        except Exception:
            pass

    def request_stop(self) -> None:
        self.stop_requested = True

    def _next_segment_id(self) -> str:
        self.segment_counter += 1
        return f"SEG-{self.segment_counter:06d}"

    def _emit_mock_segment(self) -> None:
        segment_id = self._next_segment_id()
        trace_id = self._segment_trace_id(segment_id=segment_id)
        source_audio_path = self.runtime.session.segment_audio_path(self.runtime.config.cache_dir, segment_id)
        sample_rate = self.runtime.preprocessor.target_sample_rate
        duration_s = 0.9
        t = np.linspace(0.0, duration_s, int(sample_rate * duration_s), endpoint=False)
        samples = (0.22 * np.sin(2.0 * np.pi * 660.0 * t)).astype(np.float32)
        fade_len = min(320, samples.size // 8)
        if fade_len > 0:
            fade = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
            samples[:fade_len] *= fade
            samples[-fade_len:] *= fade[::-1]
        _write_wav_async(source_audio_path, samples, sample_rate)
        segment = self.runtime.segment_builder.build_segment(
            segment_id=segment_id,
            trace_id=trace_id,
            session_id=self.runtime.session.session_id,
            input_language=self.runtime.config.source_language,
            output_language=self.runtime.config.target_language,
            start_time_ms=0,
            end_time_ms=1000,
            input_text="[Mock] Selamat pagi, ini adalah uji alur TranslateIT.",
            translated_text="[Mock] Good morning, this is a TranslateIT workflow test.",
            latency=MetricMetrics(
                capture_ms=20,
                preprocessing_ms=10,
                vad_ms=5,
                endpointing_ms=700,
                asr_ms=40,
                translation_ms=20,
                speech_start_time=_now_iso(),
                speech_start_perf_ns=0,
                speech_end_time=_now_iso(),
                speech_end_perf_ns=0,
            ),
            quality=QualityMetrics(
                input_quality="Mock",
                asr_confidence=1.0,
                status="Completed",
                notes="Mock Pipeline mode. Replay audio is an audible test tone; no ASR or real translation was used.",
            ),
            replay=ReplayPaths(source_audio_path=source_audio_path),
            capture_mode=self.capture_mode,
            asr_model_used="Mock ASR",
            translation_engine_used="Mock Translation",
        )
        calibration = CalibrationResult(
            noise_floor_rms=0.0,
            speech_rms=0.0,
            peak_level=0.0,
            clipping_risk=0.0,
            speech_to_noise_gap=0.0,
            recommended_preset=self.runtime.config.vad_preset,
            input_state="Mock",
        )
        result = PipelineSegmentResult(
            accepted=True,
            segment=segment,
            card=TranscriptCardViewModel.from_segment(segment),
            source_audio_path=source_audio_path,
            calibration=calibration,
            asr_status="Mock",
            translation_status="Mock",
            event_messages=["Mock Pipeline generated a labeled sample segment."],
        )
        queue_result = getattr(self.runtime, "queue_pipeline_result", None)
        if callable(queue_result):
            try:
                queue_result(result)
            except Exception:
                pass
        self._trace(
            "segment_ready_emit_started",
            segment=segment,
            stage="mock_pipeline",
            status="accepted",
            details={"segment_id": segment.segment_id},
        )
        self.segment_ready.emit(result)
        self._trace(
            "segment_ready_emit_completed",
            segment=segment,
            stage="mock_pipeline",
            status="accepted",
            details={"segment_id": segment.segment_id},
        )
        self._trace(
            "segment_created",
            segment=segment,
            stage="mock_pipeline",
            status="accepted",
            details={"source_text": segment.input_text or "unavailable", "translated_text": segment.translated_text or "unavailable"},
        )
        self._trace(
            "segment_source_text",
            segment=segment,
            stage="mock_pipeline",
            status="accepted",
            details={"source_text": segment.input_text or "unavailable"},
        )
        self._trace(
            "segment_translated_text",
            segment=segment,
            stage="mock_pipeline",
            status="accepted",
            details={"translated_text": segment.translated_text or "unavailable"},
        )

    def _resolve_device(self):
        capture: AudioCapture = self.runtime.capture
        devices = capture.list_microphone_devices()
        if self.selected_device_id is not None:
            selected = capture.find_microphone_device(self.selected_device_id)
            if selected is not None:
                return selected
        for device in devices:
            if device.is_default:
                return device
        if devices:
            return devices[0]
        return None

    def _emit_monitor(self, rms: float, peak: float, noise_floor_rms: float) -> None:
        capture: AudioCapture = self.runtime.capture
        meter_percent = int(max(0.0, min(1.0, peak)) * 100)
        self.level_changed.emit(meter_percent)
        self.input_state_changed.emit(capture.build_level_state(rms, peak, noise_floor_rms=noise_floor_rms))

    def _capture_calibration(
        self,
        audio_queue: "queue.Queue[np.ndarray]",
        *,
        sample_rate: int,
        noise_seconds: float = 3.0,
        speech_seconds: float = 2.5,
    ) -> tuple[CalibrationResult, float]:
        self.message.emit("Calibration started. Stay quiet for a few seconds.")
        frame_ms = self.runtime.capture.frame_duration_ms
        input_sensitivity = normalize_input_sensitivity(getattr(self.runtime.audio_settings, "input_sensitivity", "Headset"))
        silence_blocks: list[np.ndarray] = []
        speech_blocks: list[np.ndarray] = []
        silence_target = max(1, int((noise_seconds * 1000) / frame_ms))
        speech_target = max(1, int((speech_seconds * 1000) / frame_ms))
        frame_timeout = 2.0
        for _ in range(silence_target):
            if self.stop_requested:
                break
            try:
                data = audio_queue.get(timeout=frame_timeout)
            except queue.Empty as exc:
                raise RuntimeError("Microphone stream started but no audio frames were received.") from exc
            prepared = self.runtime.preprocessor.prepare_for_vad(data, source_rate=sample_rate)
            silence_blocks.append(prepared.samples)
            self._emit_monitor(prepared.stats.rms, prepared.stats.peak, 0.0)
        self.message.emit("Speak one normal Indonesian or English sentence now.")
        for _ in range(speech_target):
            if self.stop_requested:
                break
            try:
                data = audio_queue.get(timeout=frame_timeout)
            except queue.Empty as exc:
                raise RuntimeError("Microphone stream started but no audio frames were received.") from exc
            prepared = self.runtime.preprocessor.prepare_for_vad(data, source_rate=sample_rate)
            speech_blocks.append(prepared.samples)
            self._emit_monitor(prepared.stats.rms, prepared.stats.peak, 0.0)
        noise_floor_rms = self.runtime.calibration.estimate_noise_floor(_concat_blocks(silence_blocks))
        calibration = self.runtime.calibration.run_first_run_calibration(
            _concat_blocks(silence_blocks),
            _concat_blocks(speech_blocks),
            sensitivity=input_sensitivity,
        )
        return calibration, noise_floor_rms

    def _quality_report_from_asr(self, asr_result: Any) -> ASRQualityReport:
        segment_reports = list(getattr(asr_result, "segments", []))
        if not segment_reports:
            return ASRQualityReport(
                transcript_text=str(getattr(asr_result, "text", "")).strip(),
                empty_output=not bool(getattr(asr_result, "text", "").strip()),
                language_probability=float(getattr(asr_result, "language_probability", 0.0) or 0.0),
                language_ok=True,
                timestamp_ok=True,
            )
        avg_log_probability = float(
            sum(getattr(report, "average_log_probability", 0.0) for report in segment_reports)
            / max(1, len(segment_reports))
        )
        max_no_speech_probability = max(
            float(getattr(report, "no_speech_probability", 0.0)) for report in segment_reports
        )
        max_compression_ratio = max(float(getattr(report, "compression_ratio", 0.0)) for report in segment_reports)
        language_ok = is_focus_language(
            getattr(asr_result, "language", ""),
            allowed_languages=(self.runtime.config.source_language, self.runtime.config.target_language),
        )
        timestamp_ok = all(
            int(getattr(report, "end_time_ms", 0)) >= int(getattr(report, "start_time_ms", 0))
            for report in segment_reports
        )
        repeated_text = False
        text = str(getattr(asr_result, "text", "")).strip().lower()
        if text:
            words = text.split()
            repeated_text = len(words) >= 4 and len(set(words)) <= 2
        return ASRQualityReport(
            transcript_text=str(getattr(asr_result, "text", "")).strip(),
            no_speech_probability=max_no_speech_probability,
            average_log_probability=avg_log_probability,
            compression_ratio=max_compression_ratio,
            language_probability=float(getattr(asr_result, "language_probability", 0.0) or 0.0),
            language_ok=language_ok,
            timestamp_ok=timestamp_ok,
            repetitive_text=repeated_text,
            empty_output=not bool(text),
        )

    def _finalize_segment(
        self,
        *,
        samples: np.ndarray,
        start_time_ms: int,
        end_time_ms: int,
        silence_ms: int,
        endpoint_target_ms: int = 0,
        capture_buffer_ms: int = 0,
        noise_floor_rms: float,
        calibration: CalibrationResult,
        preprocessing_ms: int = 0,
        capture_start_time: str = "",
        first_audio_frame_time: str = "",
        first_user_speech_time: str = "",
        segment_candidate_start_time: str = "",
        first_energy_above_noise_time: str = "",
        first_voiced_frame_time: str = "",
        first_confirmed_speech_time: str = "",
        speech_detected_time: str = "",
        speech_end_time: str = "",
        speech_end_perf: float | None = None,
        sustained_speech_ms: int = 0,
        speech_detection_ms: int = 0,
        segment_candidate_start_perf: float | None = None,
        first_voiced_frame_perf: float | None = None,
        first_confirmed_speech_perf: float | None = None,
    ) -> PipelineSegmentResult:
        preprocessor: AudioPreprocessor = self.runtime.preprocessor
        sample_rate = preprocessor.target_sample_rate
        sensitivity = normalize_input_sensitivity(getattr(self.runtime.audio_settings, "input_sensitivity", "Headset"))
        evidence = _audio_evidence(samples, noise_floor_rms, sensitivity)
        segment_rms = float(evidence["rms"])
        segment_peak = float(evidence["peak"])
        duration_ms = max(0, end_time_ms - start_time_ms)
        clipping_risk = 1.0 if segment_peak >= 0.99 else segment_peak
        noise_risk = min(1.0, noise_floor_rms / max(segment_rms, 0.0001))
        speech_duration_ms = max(0, duration_ms - silence_ms)
        endpoint_profile_used = _select_endpoint_profile(
            speech_duration_ms=speech_duration_ms,
            silence_ms=silence_ms,
            rms=segment_rms,
            peak=segment_peak,
            noise_floor_rms=noise_floor_rms,
            voiced_frame_ratio=float(evidence["voiced_frame_ratio"]),
            sensitivity=sensitivity,
            calibration=calibration,
        )
        trim_leading_ms = 60
        trim_trailing_ms = 100
        pre_asr_validation_started = perf_counter()
        evidence_reason = str(evidence["reason"])
        weak_audio_override = (
            evidence_reason in {"rejected_low_energy", "rejected_low_snr"}
            and speech_duration_ms >= 260
            and sustained_speech_ms >= 120
            and float(evidence["voiced_frame_ratio"]) >= 0.03
            and float(evidence["frame_active_ratio"]) >= 0.18
            and float(evidence["impulse_edge_ratio"]) <= 0.04
            and float(evidence["frame_energy_concentration"]) <= 0.82
            and float(evidence["zero_crossing_rate"]) >= 0.08
            and (segment_peak >= 0.0065 or segment_rms >= 0.0015)
        )
        if evidence_reason and not weak_audio_override:
            decision = type(
                "EvidenceDecision",
                (),
                {"accepted": False, "reason": evidence_reason, "should_hide": True},
            )()
        elif sustained_speech_ms < 80:
            short_but_real_speech = (
                speech_duration_ms >= 320
                and segment_rms >= 0.001
                and segment_peak >= 0.005
                and float(evidence["voiced_frame_ratio"]) >= 0.01
            )
            if short_but_real_speech:
                decision = self.runtime.vad.should_accept_segment(
                    duration_ms=duration_ms,
                    silence_ms=silence_ms,
                    speech_duration_ms=speech_duration_ms,
                    speech_confirmed=True,
                    rms=segment_rms,
                    peak=segment_peak,
                    noise_floor_rms=noise_floor_rms,
                    clipping_risk=clipping_risk,
                    noise_risk=noise_risk,
                    speech_to_noise_gap=float(evidence["speech_to_noise_gap"]),
                    voiced_frame_ratio=float(evidence["voiced_frame_ratio"]),
                    zero_crossing_rate=float(evidence["zero_crossing_rate"]),
                    peak_to_rms_ratio=float(evidence["peak_to_rms_ratio"]),
                    frame_energy_concentration=float(evidence["frame_energy_concentration"]),
                    frame_active_ratio=float(evidence["frame_active_ratio"]),
                    impulse_edge_ratio=float(evidence["impulse_edge_ratio"]),
                )
            else:
                decision = type(
                    "EvidenceDecision",
                    (object,),
                    {"accepted": False, "reason": "rejected_unconfirmed_speech", "should_hide": True},
                )()
        else:
            decision = self.runtime.vad.should_accept_segment(
                duration_ms=duration_ms,
                silence_ms=silence_ms,
                speech_duration_ms=speech_duration_ms,
                speech_confirmed=True,
                rms=segment_rms,
                peak=segment_peak,
                noise_floor_rms=noise_floor_rms,
                clipping_risk=clipping_risk,
                noise_risk=noise_risk,
                speech_to_noise_gap=float(evidence["speech_to_noise_gap"]),
                voiced_frame_ratio=float(evidence["voiced_frame_ratio"]),
                zero_crossing_rate=float(evidence["zero_crossing_rate"]),
                peak_to_rms_ratio=float(evidence["peak_to_rms_ratio"]),
                frame_energy_concentration=float(evidence["frame_energy_concentration"]),
                frame_active_ratio=float(evidence["frame_active_ratio"]),
                impulse_edge_ratio=float(evidence["impulse_edge_ratio"]),
            )
        pre_asr_validation_ms = int((perf_counter() - pre_asr_validation_started) * 1000)
        segment_finalize_started = perf_counter()
        segment_id = self._next_segment_id()
        trace_id = self._segment_trace_id(segment_id=segment_id)
        source_audio_path = self.runtime.session.segment_audio_path(self.runtime.config.cache_dir, segment_id)
        _write_wav_async(source_audio_path, samples, sample_rate)
        trimmed_samples, trim_leading_ms_actual, trim_trailing_ms_actual = _trim_silence_padding(
            samples,
            sample_rate=sample_rate,
            noise_floor_rms=noise_floor_rms,
        )
        endpoint_wait_ms = min(max(0, silence_ms), max(0, endpoint_target_ms or silence_ms))
        endpoint_wait_ms = _cap_safe_endpoint_wait_ms(speech_duration_ms, endpoint_wait_ms)
        silence_accumulation_ms = max(0, silence_ms - endpoint_wait_ms)
        vad_speech_detect_ms = max(
            0,
            int((first_voiced_frame_perf - (segment_candidate_start_perf or first_voiced_frame_perf or 0.0)) * 1000)
            if first_voiced_frame_perf is not None and segment_candidate_start_perf is not None
            else speech_detection_ms,
        )
        speech_confirmation_ms = max(
            0,
            int((first_confirmed_speech_perf - (first_voiced_frame_perf or first_confirmed_speech_perf or 0.0)) * 1000)
            if first_confirmed_speech_perf is not None and first_voiced_frame_perf is not None
            else sustained_speech_ms,
        )
        capture_buffer_ms = max(0, int(capture_buffer_ms))
        audio_queue_backlog_ms = 0
        frames_dropped_silence_count = max(0, int(max(0, silence_ms - endpoint_wait_ms) // max(1, frame_ms)) if (frame_ms := self.runtime.capture.frame_duration_ms) else 0)
        empty_audio_rejected_count = 1 if trimmed_samples.size == 0 else 0
        segment_finalize_ms = int((perf_counter() - segment_finalize_started) * 1000)
        speech_detect_total_ms = int(max(0, vad_speech_detect_ms))
        audio_verify_total_ms = int(
            speech_detect_total_ms
            + speech_confirmation_ms
            + endpoint_wait_ms
            + silence_accumulation_ms
            + pre_asr_validation_ms
            + segment_finalize_ms
        )
        audio_stage_totals = {
            "speech_detect": speech_detect_total_ms,
            "speech_confirmation": speech_confirmation_ms,
            "endpoint_wait": endpoint_wait_ms,
            "silence_accumulation": silence_accumulation_ms,
            "segment_finalize": segment_finalize_ms,
            "pre_asr_validation": pre_asr_validation_ms,
        }
        bottleneck_stage = max(audio_stage_totals, key=audio_stage_totals.get) if any(audio_stage_totals.values()) else "unknown"
        segment_latency = MetricMetrics(
            capture_ms=duration_ms,
            speech_detection_ms=speech_detect_total_ms,
            model_load_ms=self.model_load_ms,
            preprocessing_ms=preprocessing_ms,
            vad_ms=pre_asr_validation_ms,
            endpointing_ms=endpoint_wait_ms,
            speech_start_time=first_voiced_frame_time or first_confirmed_speech_time or speech_detected_time,
            speech_start_perf_ns=int(first_voiced_frame_perf * 1_000_000_000) if first_voiced_frame_perf is not None else 0,
            speech_end_time=speech_end_time,
            speech_end_perf_ns=int(speech_end_perf * 1_000_000_000) if speech_end_perf is not None else 0,
            capture_start_time=capture_start_time,
            first_audio_frame_time=first_audio_frame_time,
            first_user_speech_time=first_user_speech_time,
            segment_candidate_start_time=segment_candidate_start_time,
            first_energy_above_noise_time=first_energy_above_noise_time,
            first_voiced_frame_time=first_voiced_frame_time,
            first_confirmed_speech_time=first_confirmed_speech_time,
            vad_start_time=_now_iso(),
            vad_confirmed_speech_time=speech_detected_time,
            speech_detected_time=speech_detected_time,
            endpoint_silence_start_time=speech_end_time,
            endpoint_decision_time=_now_iso(),
            asr_queue_enter_time=_now_iso(),
            model_loaded_before_segment=bool(self.model_load_ms == 0),
            translation_model_loaded_before_segment=bool(
                getattr(self.runtime.translation_engine, "_model", None) is not None
            ),
            segment_finalized_time=_now_iso(),
            audio_verify_total_ms=audio_verify_total_ms,
            capture_buffer_ms=capture_buffer_ms,
            vad_speech_detect_ms=vad_speech_detect_ms,
            speech_confirmation_ms=speech_confirmation_ms,
            endpoint_wait_ms=endpoint_wait_ms,
            silence_accumulation_ms=silence_accumulation_ms,
            segment_finalize_ms=segment_finalize_ms,
            pre_asr_validation_ms=pre_asr_validation_ms,
            audio_queue_backlog_ms=audio_queue_backlog_ms,
            frames_dropped_silence_count=frames_dropped_silence_count,
            empty_audio_rejected_count=empty_audio_rejected_count,
            endpoint_profile_used=endpoint_profile_used,
            speech_duration_ms=speech_duration_ms,
            trailing_silence_ms=max(0, silence_ms),
            trim_leading_ms=min(trim_leading_ms_actual or trim_leading_ms, trim_leading_ms),
            trim_trailing_ms=min(trim_trailing_ms_actual or trim_trailing_ms, trim_trailing_ms),
            bottleneck_reason=bottleneck_stage,
        )
        quality = QualityMetrics(
            input_quality=calibration.input_state,
            asr_confidence=0.0,
            status="Rejected Silence" if not decision.accepted else "Pending",
            notes=decision.reason if not decision.accepted else "Awaiting ASR",
            raw_rms=segment_rms,
            raw_peak=segment_peak,
            speech_to_noise_gap=float(evidence["speech_to_noise_gap"]),
            voiced_frame_ratio=float(evidence["voiced_frame_ratio"]),
        )
        segment = self.runtime.segment_builder.build_segment(
            segment_id=segment_id,
            trace_id=trace_id,
            session_id=self.runtime.session.session_id,
            input_language=self.runtime.config.source_language,
            output_language=self.runtime.config.target_language,
            start_time_ms=start_time_ms,
            end_time_ms=end_time_ms,
            input_text="",
            translated_text="",
            latency=segment_latency,
            quality=quality,
            replay=ReplayPaths(source_audio_path=source_audio_path),
            capture_mode=self.capture_mode,
            asr_model_used=self.runtime.config.primary_asr_model,
            asr_device_used=self.runtime.asr_loader.device,
            asr_compute_type_used=self.runtime.asr_loader.compute_type,
            translation_engine_used=self.runtime.translation_engine.primary_engine_name,
        )
        segment.trace_id = trace_id
        self._trace(
            "segment_created",
            segment=segment,
            stage="segment_builder",
            status="pending",
            details={"segment_id": segment.segment_id, "source_text": segment.input_text or "unavailable"},
        )
        self._trace(
            "segment_source_text",
            segment=segment,
            stage="segment_builder",
            status="pending",
            details={"source_text": segment.input_text or "unavailable"},
        )
        self._trace("segment_id", segment=segment, stage="segment_builder", status="pending", details={"segment_id": segment.segment_id})
        if not decision.accepted:
            segment.quality.status = _rejection_status_for_reason(str(decision.reason))
            segment.quality.notes = _reject_reason_code(str(decision.reason))
            self._trace(
                "segment_accepted_or_rejected",
                segment=segment,
                stage="vad_pipeline",
                status="rejected",
                details={"reason": _reject_reason_code(str(decision.reason))},
            )
            return PipelineSegmentResult(
                accepted=False,
                segment=segment,
                card=TranscriptCardViewModel.from_segment(segment),
                source_audio_path=source_audio_path,
                calibration=calibration,
                rejection_reason=_reject_reason_code(str(decision.reason)),
                event_messages=[
                    (
                        "Pre-ASR rejection: "
                        f"{_reject_reason_code(str(decision.reason))}; rms={segment_rms:.5f}; peak={segment_peak:.5f}; "
                        f"snr_gap={float(evidence['speech_to_noise_gap']):.5f}; "
                        f"voiced={float(evidence['voiced_frame_ratio']):.3f}"
                    )
                ],
            )

        if trimmed_samples.size == 0:
            segment.quality.status = "Rejected Silence"
            segment.quality.notes = "rejected_silence"
            segment.quality.replay_error = "Silence was removed before ASR."
            self._trace(
                "segment_accepted_or_rejected",
                segment=segment,
                stage="vad_pipeline",
                status="rejected",
                details={"reason": "rejected_silence"},
            )
            return PipelineSegmentResult(
                accepted=False,
                segment=segment,
                card=TranscriptCardViewModel.from_segment(segment),
                source_audio_path=source_audio_path,
                calibration=calibration,
                rejection_reason="rejected_silence",
                event_messages=["Rejected silence before ASR."],
            )
        segment.latency.asr_queue_submit_time = _now_iso()
        self._trace("audio_input_detected", segment=segment, stage="audio_capture", status="accepted", details={"speech_duration_ms": speech_duration_ms})
        asr_queue_enter_perf = perf_counter()
        segment.latency.asr_queue_enter_time = _now_iso()
        asr_audio_prepare_started = perf_counter()
        asr_samples = self.runtime.preprocessor.prepare_for_asr(
            trimmed_samples,
            source_rate=self.runtime.preprocessor.target_sample_rate,
            collect_stats=False,
        ).samples
        asr_audio_prepare_ms = int((perf_counter() - asr_audio_prepare_started) * 1000)
        segment.latency.asr_worker_start_time = _now_iso()
        segment.latency.asr_start_time = segment.latency.asr_worker_start_time
        asr_profile = self.runtime.asr_loader.realtime_profile()
        self._trace(
            "asr_started",
            segment=segment,
            stage="asr_loader",
            status="started",
            details={"asr_device": self.runtime.asr_loader.device, "compute_type": self.runtime.asr_loader.compute_type},
        )
        asr_started = perf_counter()
        asr_result = self.runtime.asr_loader.transcribe_audio(asr_samples, asr_profile)
        asr_latency_ms = int((perf_counter() - asr_started) * 1000)
        segment.latency.asr_end_time = _now_iso()
        segment.latency.transcript_text_ready_time = segment.latency.asr_end_time
        self._trace("asr_completed", segment=segment, stage="asr_loader", status="completed", details={"asr_latency_ms": asr_latency_ms})
        asr_queue_wait_ms = int(max(0.0, (asr_started - asr_queue_enter_perf) * 1000))
        report = self._quality_report_from_asr(asr_result)
        report.audio_rms = segment_rms
        report.audio_peak = segment_peak
        report.peak_to_rms_ratio = float(evidence["peak_to_rms_ratio"])
        report.speech_to_noise_gap = float(evidence["speech_to_noise_gap"])
        report.voiced_frame_ratio = float(evidence["voiced_frame_ratio"])
        report.audio_duration_ms = duration_ms
        report.sustained_speech_ms = sustained_speech_ms
        report.zero_crossing_rate = float(evidence["zero_crossing_rate"])
        report.frame_energy_concentration = float(evidence["frame_energy_concentration"])
        report.frame_active_ratio = float(evidence["frame_active_ratio"])
        report.impulse_edge_ratio = float(evidence["impulse_edge_ratio"])
        quality_decision = self.quality_filter.evaluate(report)
        if not quality_decision.accepted:
            segment.input_text = str(getattr(asr_result, "text", "")).strip()
            self._trace(
                "asr_text",
                segment=segment,
                stage="asr_loader",
                status="rejected",
                details={"asr_text": segment.input_text or "unavailable"},
            )
            segment.quality.input_quality = calibration.input_state
            segment.quality.status = _rejection_status_for_reason(str(quality_decision.reason))
            segment.quality.asr_confidence = 0.0
            segment.quality.notes = quality_decision.reason
            segment.latency.asr_ms = int(max(0, getattr(asr_result, "asr_total_ms", getattr(asr_result, "latency_ms", asr_latency_ms)) or asr_latency_ms))
            segment.asr_model_used = str(getattr(asr_result, "model_name", segment.asr_model_used))
            segment.model_fallback_used = segment.asr_model_used != self.runtime.config.primary_asr_model
            if getattr(asr_result, "status", "") != "Completed":
                segment.error_message = str(getattr(asr_result, "message", ""))
            segment.quality.no_speech_probability = report.no_speech_probability
            segment.quality.average_log_probability = report.average_log_probability
            segment.quality.compression_ratio = report.compression_ratio
            segment.quality.language_ok = report.language_ok
            segment.latency.endpointing_ms = max(0, silence_ms)
            return PipelineSegmentResult(
                accepted=False,
                segment=segment,
                card=TranscriptCardViewModel.from_segment(segment),
                source_audio_path=source_audio_path,
                calibration=calibration,
                rejection_reason=quality_decision.reason,
                asr_status=getattr(asr_result, "status", ""),
                event_messages=[
                    (
                        f"Rejected hallucination/no-speech candidate: {segment.input_text}"
                        if "Hallucination" in quality_decision.reason or "no-speech" in quality_decision.reason
                        else f"Post-ASR rejection: {quality_decision.reason}"
                    )
                ],
            )

        segment.input_text = str(getattr(asr_result, "text", "")).strip()
        self._trace(
            "asr_text",
            segment=segment,
            stage="asr_loader",
            status="completed",
            details={"asr_text": segment.input_text or "unavailable"},
        )
        segment.asr_model_used = str(getattr(asr_result, "model_name", segment.asr_model_used))
        segment.asr_device_used = self.runtime.asr_loader.device
        segment.asr_compute_type_used = self.runtime.asr_loader.compute_type
        segment.model_fallback_used = segment.asr_model_used != self.runtime.config.primary_asr_model
        segment.quality.input_quality = calibration.input_state
        segment.quality.asr_confidence = max(0.0, 1.0 - max(0.0, report.no_speech_probability))
        segment.quality.status = "Translating"
        segment.quality.no_speech_probability = report.no_speech_probability
        segment.quality.average_log_probability = report.average_log_probability
        segment.quality.compression_ratio = report.compression_ratio
        segment.quality.language_ok = report.language_ok
        segment.quality.notes = "ASR completed"
        segment.latency.asr_ms = int(max(0, getattr(asr_result, "asr_total_ms", getattr(asr_result, "latency_ms", asr_latency_ms)) or asr_latency_ms))
        segment.latency.endpointing_ms = endpoint_wait_ms
        segment.latency.asr_queue_wait_ms = int(getattr(asr_result, "asr_queue_wait_ms", asr_queue_wait_ms) or asr_queue_wait_ms)
        segment.latency.asr_audio_prepare_ms = int(getattr(asr_result, "asr_audio_prepare_ms", asr_audio_prepare_ms) or asr_audio_prepare_ms)
        segment.latency.asr_input_audio_duration_ms = int(getattr(asr_result, "asr_input_audio_duration_ms", 0) or 0)
        segment.latency.asr_model_inference_ms = int(getattr(asr_result, "asr_model_inference_ms", 0) or 0)
        segment.latency.asr_decode_finalize_ms = int(getattr(asr_result, "asr_decode_finalize_ms", 0) or 0)
        segment.latency.asr_total_ms = int(getattr(asr_result, "asr_total_ms", getattr(asr_result, "latency_ms", asr_latency_ms)) or asr_latency_ms)
        segment.latency.asr_model_name = str(getattr(asr_result, "model_name", segment.asr_model_used))
        segment.latency.asr_device = str(getattr(asr_result, "asr_device", self.runtime.asr_loader.device))
        segment.latency.asr_compute_type = str(getattr(asr_result, "asr_compute_type", self.runtime.asr_loader.compute_type))
        segment.latency.cuda_active = bool(getattr(asr_result, "cuda_active", self.runtime.asr_loader.device == "cuda"))
        segment.latency.audio_duration_vs_inference_ratio = float(
            segment.latency.asr_input_audio_duration_ms / max(1.0, float(segment.latency.asr_model_inference_ms or 1))
        )
        segment.latency.word_timestamps_enabled = bool(getattr(asr_result, "word_timestamps_enabled", False))
        segment.latency.vad_filter_inside_asr_enabled = bool(getattr(asr_result, "vad_filter_inside_asr_enabled", False))
        segment.latency.beam_size = int(getattr(asr_result, "beam_size", 0) or 0)
        segment.latency.best_of = int(getattr(asr_result, "best_of", 0) or 0)
        segment.latency.condition_on_previous_text = bool(getattr(asr_result, "condition_on_previous_text", False))
        segment.latency.language = str(getattr(asr_result, "language", segment.input_language))
        segment.latency.task = str(getattr(asr_result, "task", self.runtime.config.asr_task))
        self.status_changed.emit(UIState.TRANSLATING.value)
        segment.latency.translate_queue_submit_time = _now_iso()
        segment.latency.translate_worker_start_time = segment.latency.translate_queue_submit_time
        segment.latency.translation_start_time = segment.latency.translate_worker_start_time
        self._trace(
            "translation_started",
            segment=segment,
            stage="translation_engine",
            status="started",
            details={"source_text": segment.input_text or "unavailable"},
        )
        translation_started = perf_counter()
        if self.capture_mode == CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION:
            translation_result = type(
                "MockTranslationResult",
                (),
                {
                    "translated_text": f"[Mock Translation] {segment.input_text}",
                    "engine_name": "Mock Translation",
                    "mode": "mock",
                    "status": "Mock",
                    "notes": "Mock translation active; ASR used real microphone audio.",
                },
            )()
        else:
            detected_language = infer_language_bias_from_text(
                segment.input_text,
                detected_language=str(getattr(asr_result, "language", "") or segment.input_language),
                source_language=segment.input_language,
                target_language=segment.output_language,
                language_probability=float(getattr(asr_result, "language_probability", 0.0) or 0.0),
            )
            normalized_source_text = normalize_short_id_focus_source_text(
                segment.input_text,
                source_language=segment.input_language,
                target_language=segment.output_language,
            )
            if normalized_source_text and normalized_source_text != segment.input_text:
                segment.input_text = normalized_source_text
            if should_translate_segment(
                detected_language=detected_language,
                source_language=segment.input_language,
                target_language=segment.output_language,
            ):
                translation_result = self.runtime.translation_engine.translate(
                    TranslationRequest(
                        segment_id=segment.segment_id,
                        source_text=segment.input_text,
                        source_language=segment.input_language,
                        target_language=segment.output_language,
                        context_window=self.runtime.translation_engine.context.get_window(),
                    )
                )
            else:
                translation_result = self.runtime.translation_engine.passthrough_translation(
                    TranslationRequest(
                        segment_id=segment.segment_id,
                        source_text=segment.input_text,
                        source_language=segment.input_language,
                        target_language=segment.output_language,
                        context_window=self.runtime.translation_engine.context.get_window(),
                    ),
                    detected_language=detected_language,
                )
        segment.translated_text = translation_result.translated_text
        segment.latency.translation_ms = int((perf_counter() - translation_started) * 1000)
        segment.latency.translation_end_time = _now_iso()
        segment.latency.translation_text_ready_time = segment.latency.translation_end_time
        self._trace(
            "translation_completed",
            segment=segment,
            stage="translation_engine",
            status="completed",
            details={"translation_ms": segment.latency.translation_ms},
        )
        self._trace(
            "translated_text",
            segment=segment,
            stage="translation_engine",
            status="completed",
            details={"translated_text": segment.translated_text or "unavailable"},
        )
        self._trace(
            "segment_translated_text",
            segment=segment,
            stage="translation_engine",
            status="completed",
            details={"translated_text": segment.translated_text or "unavailable"},
        )
        segment.latency.translate_queue_wait_ms = int(getattr(translation_result, "queue_wait_ms", 0) or 0)
        segment.latency.translate_text_prepare_ms = int(getattr(translation_result, "text_prep_ms", 0) or 0)
        segment.latency.translate_tokenize_ms = int(getattr(translation_result, "tokenize_ms", 0) or 0)
        segment.latency.translate_inference_ms = int(getattr(translation_result, "translate_inference_ms", 0) or 0)
        segment.latency.translate_decode_finalize_ms = int(getattr(translation_result, "decode_finalize_ms", 0) or 0)
        segment.latency.translate_context_update_ms = int(getattr(translation_result, "context_update_ms", 0) or 0)
        segment.latency.translate_total_ms = int(getattr(translation_result, "total_ms", segment.latency.translation_ms) or segment.latency.translation_ms)
        segment.latency.translation_engine_name = str(getattr(translation_result, "engine_name", segment.translation_engine_used))
        segment.latency.translation_device = str(getattr(translation_result, "device", self.runtime.translation_engine._device))
        segment.latency.translation_dtype = str(getattr(translation_result, "dtype", self.runtime.translation_engine._dtype))
        segment.latency.translation_context_used = bool(getattr(translation_result, "context_used", False))
        segment.latency.translation_input_chars = int(getattr(translation_result, "input_chars", len(segment.input_text)) or 0)
        segment.latency.translation_output_chars = int(getattr(translation_result, "output_chars", len(segment.translated_text)) or 0)
        segment.latency.translation_fallback_used = bool(getattr(translation_result, "fallback_used", False))
        segment.latency.translation_error = str(getattr(translation_result, "error", ""))
        segment.latency.translation_model_loaded_before_segment = bool(getattr(translation_result, "model_loaded_before_segment", False))
        segment.latency.total_after_eos_ms = 0
        segment.quality.status = "Completed"
        segment.quality.notes = translation_result.notes or "Completed"
        segment.translation_engine_used = str(getattr(translation_result, "engine_name", ""))
        if getattr(translation_result, "status", "") != "Completed" and self.capture_mode != CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION:
            segment.error_message = str(getattr(translation_result, "notes", ""))
        segment.replay.source_audio_path = source_audio_path
        segment.replay.source_replay_available = source_audio_path.exists()
        segment.replay.translated_audio_path = None
        segment.latency.audio_verify_total_ms = audio_verify_total_ms
        segment.latency.capture_buffer_ms = capture_buffer_ms
        segment.latency.vad_speech_detect_ms = vad_speech_detect_ms
        segment.latency.speech_confirmation_ms = speech_confirmation_ms
        segment.latency.endpoint_wait_ms = endpoint_wait_ms
        segment.latency.silence_accumulation_ms = silence_accumulation_ms
        segment.latency.segment_finalize_ms = segment_finalize_ms
        segment.latency.pre_asr_validation_ms = pre_asr_validation_ms
        segment.latency.audio_queue_backlog_ms = audio_queue_backlog_ms
        segment.latency.frames_dropped_silence_count = frames_dropped_silence_count
        segment.latency.empty_audio_rejected_count = empty_audio_rejected_count
        segment.latency.endpoint_profile_used = endpoint_profile_used
        segment.latency.speech_duration_ms = speech_duration_ms
        segment.latency.trailing_silence_ms = max(0, silence_ms)
        segment.latency.trim_leading_ms = trim_leading_ms_actual or trim_leading_ms
        segment.latency.trim_trailing_ms = trim_trailing_ms_actual or trim_trailing_ms
        segment.latency.speech_start_time = (
            first_voiced_frame_time
            or first_confirmed_speech_time
            or first_user_speech_time
            or segment_candidate_start_time
            or speech_detected_time
        )
        if endpoint_profile_used == "unified_adaptive" and endpoint_wait_ms > 1500:
            segment.latency.bottleneck_reason = "short_utterance_endpoint_exceeded_target"
        elif silence_accumulation_ms > 1000:
            segment.latency.bottleneck_reason = "excessive_silence_accumulation"
        self._trace(
            "vad_speech_start",
            segment=segment,
            stage="vad_pipeline",
            status="detected",
            details={"speech_start_time": segment.latency.speech_start_time or "unavailable"},
        )
        self._trace(
            "vad_speech_end",
            segment=segment,
            stage="vad_pipeline",
            status="detected",
            details={"speech_end_time": speech_end_time or "unavailable"},
        )
        self._trace(
            "vad_endpoint",
            segment=segment,
            stage="vad_pipeline",
            status="completed",
            details={"endpoint_wait_ms": endpoint_wait_ms, "silence_accumulation_ms": silence_accumulation_ms},
        )
        self._trace(
            "segment_status",
            segment=segment,
            stage="segment_builder",
            status=segment.quality.status,
            details={"quality_status": segment.quality.status, "notes": segment.quality.notes},
        )
        self._trace(
            "segment_accepted_or_rejected",
            segment=segment,
            stage="vad_pipeline",
            status="accepted",
            details={"reason": "accepted"},
        )
        event_messages = [
            f"ASR model used: {segment.asr_model_used}",
            f"Translation engine used: {segment.translation_engine_used}",
        ]
        return PipelineSegmentResult(
            accepted=True,
            segment=segment,
            card=TranscriptCardViewModel.from_segment(segment),
            source_audio_path=source_audio_path,
            calibration=calibration,
            asr_status=getattr(asr_result, "status", ""),
            translation_status=translation_result.status,
            event_messages=event_messages,
        )

    def run(self) -> None:  # pragma: no cover - threaded runtime path
        capture: AudioCapture = self.runtime.capture
        if self.capture_mode == CAPTURE_MODE_MOCK_PIPELINE:
            self.message.emit("Mock Pipeline mode active. Generating labeled sample segment.")
            self._emit_mock_segment()
            self.finished_signal.emit()
            return
        if sd is None:
            self.error.emit("sounddevice is not available")
            self.finished_signal.emit()
            return
        device = self._resolve_device()
        if device is None:
            self.error.emit("No valid microphone device was found")
            self.finished_signal.emit()
            return
        validation = capture.validate_device_selection(device.device_id)
        if not validation.valid:
            self.error.emit(validation.message)
            self.finished_signal.emit()
            return
        sample_rate = device.sample_rate or 44_100
        frame_ms = capture.frame_duration_ms
        blocksize = max(1, int(sample_rate * frame_ms / 1000))
        audio_queue: "queue.Queue[np.ndarray]" = queue.Queue(maxsize=max(32, int(1200 / max(1, frame_ms))))
        stream_open_success = False
        stream_active = False
        callback_count = 0
        raw_frames_received = 0
        normalized_frames_received = 0
        queue_push_count = 0
        queue_pop_count = 0
        vad_frame_count = 0
        voiced_frame_count = 0
        rejected_silence_count = 0
        candidate_segment_count = 0
        accepted_candidate_count = 0
        rejected_candidate_count = 0
        asr_submitted_count = 0
        last_callback_error = ""
        last_worker_error = ""
        last_vad_rejection_reason = ""

        def audio_callback(indata, frames, time_info, status) -> None:  # type: ignore[override]
            nonlocal callback_count, raw_frames_received, queue_push_count, last_callback_error
            if self.stop_requested:
                self.stale_callbacks_rejected_count += 1
                return
            callback_count += 1
            raw_frames_received += 1
            if self.first_audio_callback_perf is None:
                self.first_audio_callback_perf = perf_counter()
                self._trace(
                    "audio_input_detected",
                    stage="audio_capture",
                    status="detected",
                    details={"device_id": device.device_id, "sample_rate": sample_rate, "blocksize": blocksize},
                    segment_id="bootstrap",
                )
            if status:
                last_callback_error = str(status)
            try:
                block = np.asarray(indata, dtype=np.float32).copy()
                if audio_queue.full():
                    try:
                        audio_queue.get_nowait()
                    except queue.Empty:
                        pass
                audio_queue.put_nowait(block)
                queue_push_count += 1
            except Exception as exc:
                last_callback_error = str(exc)
            self.callback_count = callback_count
            self.last_error = last_callback_error
            self.last_heartbeat_time = _now_iso()

        asr_profile = self.runtime.asr_loader.realtime_profile()
        if self.capture_mode in {CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION, CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION}:
            self.status_changed.emit(UIState.TRANSCRIBING.value)
            self.message.emit(
                f"Loading ASR model on {self.runtime.asr_loader.device}/{self.runtime.asr_loader.compute_type}..."
            )
            model_load_started = perf_counter()
            load_result = self.runtime.asr_loader.load_model(asr_profile)
            self.model_load_ms = int((perf_counter() - model_load_started) * 1000)
            if not load_result.loaded:
                self.error.emit(load_result.message)
                self.finished_signal.emit()
                return
            self.message.emit(
                f"ASR ready: {load_result.selected_model} on {self.runtime.asr_loader.device}/{self.runtime.asr_loader.compute_type}."
            )
            if self.capture_mode == CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION:
                translation_load_started = perf_counter()
                self.runtime.translation_engine.load_local_model()
                self.model_load_ms += int((perf_counter() - translation_load_started) * 1000)
        self.status_changed.emit(UIState.STREAM_CHECK.value)
        self.message.emit(f"Using microphone: {device.name}")
        try:
            with sd.InputStream(
                device=device.device_id,
                samplerate=sample_rate,
                channels=1,
                dtype="float32",
                callback=audio_callback,
                blocksize=blocksize,
            ) as stream:
                stream_open_success = True
                stream_active = True
                self.stream_open_success = True
                self.stream_active = True
                if self.existing_calibration is None:
                    calibration = CalibrationResult(
                        noise_floor_rms=0.0032,
                        speech_rms=0.0065,
                        peak_level=0.018,
                        clipping_risk=0.018,
                        speech_to_noise_gap=0.0033,
                        speech_to_noise_ratio=2.0,
                        voiced_frame_ratio=0.10,
                        final_vad_threshold=0.0022,
                        recommended_preset=self.runtime.config.vad_preset,
                        input_state="Input low but usable",
                        capture_allowed=True,
                    )
                    noise_floor_rms = calibration.noise_floor_rms
                    self.message.emit("Using default microphone sensitivity. Run calibration for better accuracy.")
                else:
                    calibration = self.existing_calibration
                    noise_floor_rms = calibration.noise_floor_rms
                self.calibration_ready.emit(calibration)
                self.message.emit(
                    f"Calibration ready. Noise floor {calibration.noise_floor_rms:.4f}, preset {calibration.recommended_preset}."
                )
                self.status_changed.emit(UIState.READY_TO_LISTEN.value)
                self.message.emit("Ready to listen.")
                input_sensitivity = normalize_input_sensitivity(getattr(self.runtime.audio_settings, "input_sensitivity", "Headset"))
                capture_stabilization_ms = 220
                pre_roll_frames = deque(maxlen=max(1, int(self.runtime.vad.preset.pre_roll_audio_ms / frame_ms)))
                speech_frames: list[np.ndarray] = []
                speech_active = False
                segment_preprocessing_ms = 0
                total_elapsed_ms = 0
                segment_start_ms = 0
                last_speech_ms = 0
                capture_start_time = _now_iso()
                first_audio_frame_time = ""
                speech_detected_time = ""
                speech_end_time = ""
                speech_end_perf: float | None = None
                speech_detection_ms = 0
                segment_candidate_start_ms = 0
                segment_candidate_start_perf: float | None = None
                segment_candidate_start_time = ""
                first_energy_above_noise_time = ""
                first_energy_above_noise_perf: float | None = None
                first_voiced_frame_time = ""
                first_voiced_frame_perf: float | None = None
                first_confirmed_speech_time = ""
                first_confirmed_speech_perf: float | None = None
                speech_detect_ms = 0
                speech_confirmation_ms_elapsed = 0
                consecutive_speech_frames = 0
                sustained_speech_ms = 0
                sustained_required_frames = 1
                frames_received = 0
                capture_error = ""
                health_check_started = perf_counter()
                callback_count_after_2s = 0
                frames_received_after_2s = 0
                health_snapshot_captured = False
                ready_to_listen_emitted = False
                while not self.stop_requested:
                    try:
                        data = audio_queue.get(timeout=2.0)
                        queue_pop_count += 1
                    except queue.Empty:
                        if self.stop_requested:
                            break
                        if callback_count <= 0 and (perf_counter() - health_check_started) >= 2.0:
                            capture_error = "Microphone stream started but no audio frames were received."
                            stream_active = False
                            self.stream_active = False
                            self.last_error = capture_error
                            self.error.emit(capture_error)
                            break
                        continue
                    except Exception as exc:
                        if self.stop_requested:
                            break
                        capture_error = str(exc)
                        stream_active = False
                        self.stream_active = False
                        self.last_error = capture_error
                        self.error.emit(f"Microphone stream read failed: {exc}")
                        break
                    frames_received += 1
                    normalized_frames_received += 1
                    self.frames_received = frames_received
                    self.last_job_started_time = _now_iso()
                    total_elapsed_ms += frame_ms
                    if not first_audio_frame_time:
                        first_audio_frame_time = _now_iso()
                        self.last_audio_frame_time = first_audio_frame_time
                    if not health_snapshot_captured and (perf_counter() - health_check_started) >= 2.0:
                        callback_count_after_2s = callback_count
                        frames_received_after_2s = frames_received
                        health_snapshot_captured = True
                    preprocessing_started = perf_counter()
                    prepared = self.runtime.preprocessor.prepare_for_vad(
                        data,
                        source_rate=sample_rate,
                    )
                    preprocessing_latency_ms = int((perf_counter() - preprocessing_started) * 1000)
                    stats = prepared.stats
                    self._emit_monitor(stats.rms, stats.peak, noise_floor_rms)
                    pre_roll_frames.append(prepared.samples)
                    adaptive_energy_threshold = max(
                        noise_floor_rms * 1.008,
                        {"Low": 0.0018, "Normal": 0.0011, "High": 0.00075}.get(
                            input_sensitivity,
                            0.0011,
                        ),
                    )
                    energy_above_noise = stats.rms >= adaptive_energy_threshold or stats.peak >= max(adaptive_energy_threshold * 1.8, 0.0045)
                    if energy_above_noise and not first_energy_above_noise_time:
                        first_energy_above_noise_perf = perf_counter()
                        first_energy_above_noise_time = _now_iso()
                    if total_elapsed_ms < capture_stabilization_ms:
                        continue
                    speech_detected = _speech_frame_confirmed(
                        stats.rms,
                        stats.peak,
                        noise_floor_rms,
                        input_sensitivity,
                    )
                    vad_frame_count += 1
                    if speech_detected:
                        voiced_frame_count += 1
                        if not first_voiced_frame_time:
                            first_voiced_frame_perf = perf_counter()
                            first_voiced_frame_time = _now_iso()
                            if segment_candidate_start_perf is None:
                                segment_candidate_start_perf = first_voiced_frame_perf
                                segment_candidate_start_time = first_voiced_frame_time
                                segment_candidate_start_ms = total_elapsed_ms
                            speech_detect_ms = 0
                        last_vad_rejection_reason = ""
                    elif not speech_active:
                        rejected_silence_count += 1
                        last_vad_rejection_reason = "rejected_silence"
                    if self.capture_mode == CAPTURE_MODE_DIAGNOSTIC_ONLY:
                        continue
                    if not speech_active:
                        if speech_detected:
                            consecutive_speech_frames += 1
                        else:
                            consecutive_speech_frames = 0
                        if consecutive_speech_frames >= sustained_required_frames:
                            speech_active = True
                            if not first_confirmed_speech_time:
                                first_confirmed_speech_perf = perf_counter()
                                first_confirmed_speech_time = _now_iso()
                                if segment_candidate_start_perf is None:
                                    segment_candidate_start_perf = first_confirmed_speech_perf
                                    segment_candidate_start_time = first_confirmed_speech_time
                                    segment_candidate_start_ms = total_elapsed_ms
                                if first_voiced_frame_perf is not None:
                                    speech_detect_ms = max(
                                        0,
                                        int((first_confirmed_speech_perf - first_voiced_frame_perf) * 1000),
                                    )
                                speech_confirmation_ms_elapsed = max(
                                    0,
                                    int((first_confirmed_speech_perf - (first_voiced_frame_perf or first_confirmed_speech_perf)) * 1000),
                                )
                            self.status_changed.emit(UIState.LISTENING.value)
                            segment_start_ms = max(0, total_elapsed_ms - len(pre_roll_frames) * frame_ms)
                            speech_frames = list(pre_roll_frames)
                            segment_preprocessing_ms = preprocessing_latency_ms
                            last_speech_ms = total_elapsed_ms
                            speech_detected_time = _now_iso()
                            speech_detection_ms = speech_detect_ms
                            sustained_speech_ms = consecutive_speech_frames * frame_ms
                            self.status_changed.emit(UIState.SPEECH_DETECTED.value)
                        continue
                    speech_frames.append(prepared.samples)
                    segment_preprocessing_ms += preprocessing_latency_ms
                    if speech_detected:
                        last_speech_ms = total_elapsed_ms
                        if speech_end_perf is None:
                            speech_end_perf = perf_counter()
                        speech_end_time = _now_iso()
                        sustained_speech_ms += frame_ms
                    else:
                        consecutive_speech_frames = 0
                    silence_ms = total_elapsed_ms - last_speech_ms
                    duration_ms = total_elapsed_ms - segment_start_ms
                    voiced_ratio = min(1.0, max(0.0, stats.rms / max(noise_floor_rms * 1.6, 0.00025)))
                    endpoint_silence_target = _adaptive_endpoint_target_ms(
                        speech_duration_ms=duration_ms,
                        rms=stats.rms,
                        peak=stats.peak,
                        noise_floor_rms=noise_floor_rms,
                        voiced_frame_ratio=voiced_ratio,
                        sensitivity=input_sensitivity,
                    )
                    endpoint_silence_target = min(endpoint_silence_target, 125)
                    if duration_ms <= 900:
                        endpoint_silence_target = min(endpoint_silence_target, 75 if voiced_ratio >= 0.2 else 95)
                    elif duration_ms <= 1400:
                        endpoint_silence_target = min(endpoint_silence_target, 95 if voiced_ratio >= 0.18 else 110)
                    elif duration_ms <= 2200:
                        endpoint_silence_target = min(endpoint_silence_target, 115 if voiced_ratio >= 0.16 else 135)
                    if duration_ms > 2500:
                        endpoint_silence_target = max(endpoint_silence_target, min(self.runtime.vad.preset.minimum_silence_duration_ms, 360))
                    if (
                        duration_ms >= self.runtime.vad.preset.maximum_segment_duration_s * 1000
                        or (
                            duration_ms >= self.runtime.vad.preset.minimum_speech_duration_ms
                            and silence_ms >= endpoint_silence_target
                        )
                    ):
                        candidate_segment_count += 1
                        accepted_candidate_count += 1
                        self.status_changed.emit(UIState.TRANSCRIBING.value)
                        result = self._finalize_segment(
                            samples=_concat_blocks(speech_frames),
                            start_time_ms=segment_start_ms,
                            end_time_ms=total_elapsed_ms,
                            silence_ms=silence_ms,
                            endpoint_target_ms=endpoint_silence_target,
                            capture_buffer_ms=min(duration_ms, len(pre_roll_frames) * frame_ms),
                            preprocessing_ms=segment_preprocessing_ms,
                            noise_floor_rms=noise_floor_rms,
                            calibration=calibration,
                            capture_start_time=capture_start_time,
                            first_audio_frame_time=first_audio_frame_time,
                            first_user_speech_time=first_confirmed_speech_time or first_voiced_frame_time or speech_detected_time,
                            segment_candidate_start_time=segment_candidate_start_time,
                            first_energy_above_noise_time=first_energy_above_noise_time,
                            first_voiced_frame_time=first_voiced_frame_time,
                            first_confirmed_speech_time=first_confirmed_speech_time,
                            speech_detected_time=speech_detected_time,
                            speech_end_time=speech_end_time,
                            speech_end_perf=speech_end_perf,
                            sustained_speech_ms=sustained_speech_ms,
                            speech_detection_ms=speech_detection_ms,
                            segment_candidate_start_perf=segment_candidate_start_perf,
                            first_voiced_frame_perf=first_voiced_frame_perf,
                            first_confirmed_speech_perf=first_confirmed_speech_perf,
                        )
                        asr_submitted_count += 1 if result.accepted else 0
                        if not result.accepted:
                            rejected_candidate_count += 1
                            last_vad_rejection_reason = result.rejection_reason
                        queue_result = getattr(self.runtime, "queue_pipeline_result", None)
                        if callable(queue_result):
                            try:
                                queue_result(result)
                            except Exception:
                                pass
                        self._trace(
                            "segment_ready_emit_started",
                            segment=result.segment,
                            stage="vad_pipeline",
                            status="accepted" if result.accepted else "rejected",
                            details={"segment_id": result.segment.segment_id},
                        )
                        self.segment_ready.emit(result)
                        self._trace(
                            "segment_ready_emit_completed",
                            segment=result.segment,
                            stage="vad_pipeline",
                            status="accepted" if result.accepted else "rejected",
                            details={"segment_id": result.segment.segment_id},
                        )
                        self.last_job_finished_time = _now_iso()
                        self.model_load_ms = 0
                        speech_active = False
                        speech_frames = []
                        segment_preprocessing_ms = 0
                        pre_roll_frames.clear()
                        consecutive_speech_frames = 0
                        sustained_speech_ms = 0
                        speech_detected_time = ""
                        speech_end_time = ""
                        speech_end_perf = None
                        speech_detection_ms = 0
                        segment_candidate_start_ms = 0
                        segment_candidate_start_perf = None
                        segment_candidate_start_time = ""
                        first_energy_above_noise_time = ""
                        first_energy_above_noise_perf = None
                        first_voiced_frame_time = ""
                        first_voiced_frame_perf = None
                        first_confirmed_speech_time = ""
                        first_confirmed_speech_perf = None
                        speech_detect_ms = 0
                        speech_confirmation_ms_elapsed = 0
                        self.status_changed.emit(UIState.READY_TO_LISTEN.value)
                if callback_count <= 0:
                    capture_error = "Microphone stream started but callback did not fire."
                elif frames_received <= 0:
                    capture_error = "Microphone stream started but no audio frames were received."
                if not health_snapshot_captured:
                    callback_count_after_2s = callback_count
                    frames_received_after_2s = frames_received
                self.last_error = capture_error
                self.stream_active = stream_active and not bool(capture_error)
                try:
                    write_json_report(
                        "capture_health_latest.json",
                        {
                            "selected_device_index": device.device_id,
                            "selected_device_name": device.name,
                            "device_exists": True,
                            "saved_selected_device": self.selected_device_id,
                            "resolved_selected_device": device.device_id,
                            "actual_stream_device": device.device_id,
                            "input_channels": 1,
                            "default_samplerate": device.sample_rate,
                            "hostapi": "",
                            "device_resolution_reason": "selected device used"
                            if self.selected_device_id == device.device_id
                            else "default device resolved",
                            "samplerate": sample_rate,
                            "channels": 1,
                            "requested_blocksize": blocksize,
                            "actual_callback_count": callback_count,
                            "callback_count_after_2s": callback_count_after_2s,
                            "frames_received": frames_received,
                            "frames_received_after_2s": frames_received_after_2s,
                            "first_frame_time": first_audio_frame_time,
                            "last_frame_time": _now_iso() if first_audio_frame_time else "",
                            "audio_queue_size": 0,
                            "stream_started": stream_open_success,
                            "stream_active": stream_active and not bool(capture_error),
                            "error": capture_error,
                            "capture_allowed": not bool(capture_error),
                            "last_callback_error": last_callback_error,
                            "last_worker_error": last_worker_error,
                            "last_vad_rejection_reason": last_vad_rejection_reason,
                            "stream_open_attempt_count": 1,
                            "stream_open_success": stream_open_success,
                        },
                    )
                    live_debug_payload = {
                        "stream_open_attempt_count": 1,
                        "stream_open_success": stream_open_success,
                        "stream_active": stream_active and not bool(capture_error),
                        "callback_count": callback_count,
                        "raw_frames_received": raw_frames_received,
                        "normalized_frames_received": normalized_frames_received,
                        "queue_push_count": queue_push_count,
                        "queue_pop_count": queue_pop_count,
                        "vad_frame_count": vad_frame_count,
                        "voiced_frame_count": voiced_frame_count,
                        "candidate_segment_count": candidate_segment_count,
                        "rejected_silence_count": rejected_silence_count,
                        "rejected_candidate_count": rejected_candidate_count,
                        "accepted_candidate_count": accepted_candidate_count,
                        "asr_submitted_count": asr_submitted_count,
                        "selected_device_name": device.name,
                        "capture_error": capture_error,
                        "last_callback_error": last_callback_error,
                        "last_worker_error": last_worker_error,
                        "last_vad_rejection_reason": last_vad_rejection_reason,
                    }
                    write_json_report_async("live_capture_debug_latest.json", live_debug_payload)
                    write_text_report_async(
                        "live_capture_debug_latest.txt",
                        [f"{key}: {value}" for key, value in live_debug_payload.items()],
                    )
                except Exception as exc:
                    self.log_event(
                        "WARN",
                        f"Could not write capture health report: {exc}",
                    )
            self.message.emit("Pipeline stop requested.")
        except Exception as exc:
            self.error.emit(str(exc))
        finally:
            self.finished_signal.emit()
