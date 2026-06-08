from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from EngineData.LauncherApp.app_config import PROJECT_ROOT
from EngineData.LauncherApp.app_logger import write_json_report
from EngineData.TranscriptEngine.audio_calibration import AudioCalibration, CalibrationResult
from EngineData.TranscriptEngine.audio_calibration import normalize_input_sensitivity
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.TranscriptEngine.audio_preprocessing import AudioPreprocessor


@dataclass(slots=True)
class MicrophoneDiagnosticResult:
    status: str
    message: str
    device_id: int | None
    device_name: str
    sample_rate: int
    duration_ms: int
    rms: float
    peak: float
    clipping: bool
    noise_floor_rms: float
    speech_rms: float
    speech_peak: float
    speech_to_noise_gap: float
    speech_to_noise_ratio: float
    voiced_frame_ratio: float
    final_vad_threshold: float
    usable_input: bool
    input_state: str
    selected_sensitivity: str = "Normal"
    diagnostic_code: str = "unknown"
    diagnostic_label: str = "Unknown"
    recommendation: str = ""
    report_path: Path | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "message": self.message,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "sample_rate": self.sample_rate,
            "duration_ms": self.duration_ms,
            "rms": self.rms,
            "peak": self.peak,
            "clipping": self.clipping,
            "noise_floor_rms": self.noise_floor_rms,
            "speech_rms": self.speech_rms,
            "speech_peak": self.speech_peak,
            "speech_to_noise_gap": self.speech_to_noise_gap,
            "speech_to_noise_ratio": self.speech_to_noise_ratio,
            "voiced_frame_ratio": self.voiced_frame_ratio,
            "final_vad_threshold": self.final_vad_threshold,
            "usable_input": self.usable_input,
            "input_state": self.input_state,
            "selected_sensitivity": self.selected_sensitivity,
            "diagnostic_code": self.diagnostic_code,
            "diagnostic_label": self.diagnostic_label,
            "recommendation": self.recommendation,
            "report_path": str(self.report_path) if self.report_path else None,
        }


def classify_microphone_diagnostic(result: MicrophoneDiagnosticResult) -> tuple[str, str, str]:
    device_name = str(result.device_name or "").lower()
    if result.clipping:
        return (
            "clipping",
            "Input clipping",
            "Lower the microphone gain or move slightly farther from the capsule.",
        )
    if result.device_id is None or any(token in device_name for token in ["loopback", "stereo mix", "virtual", "output"]):
        return (
            "wrong_device",
            "Wrong device or no speech detected",
            "Select the physical microphone input instead of loopback, stereo mix, or virtual audio devices.",
        )
    if result.input_state in {"No Signal", "No input detected"} or (
        result.rms < 0.001 and result.peak < 0.002 and result.voiced_frame_ratio <= 0.01
    ):
        return (
            "wrong_device",
            "Wrong device or no speech detected",
            "Check the selected microphone, then speak directly into it and verify the input meter moves.",
        )
    if result.input_state == "Too Quiet" or (
        result.rms < max(result.final_vad_threshold * 0.90, 0.0018)
        and result.speech_to_noise_ratio < 1.8
        and result.voiced_frame_ratio < 0.20
    ):
        return (
            "too_quiet",
            "Input too quiet",
            "Increase microphone gain, move closer to the mic, or lower background noise in the room.",
        )
    if result.input_state == "Background Noise High" or (
        result.speech_to_noise_ratio < 1.8
        and result.voiced_frame_ratio < 0.15
        and result.rms >= 0.002
    ):
        return (
            "noise_only",
            "Background noise only",
            "Use the physical microphone, reduce room noise, or try a headset mic with the Headset preset.",
        )
    if result.usable_input:
        return (
            "usable",
            "Microphone usable",
            "Your microphone signal is usable. If noise still leaks through, rerun calibration in a quieter room.",
        )
    return (
        "needs_review",
        "Needs review",
        "Repeat the diagnostic and check the selected device, gain level, and nearby noise sources.",
    )


def run_microphone_diagnostic(
    *,
    device_id: int | None,
    seconds: float = 5.0,
    noise_seconds: float = 2.0,
    speech_seconds: float = 3.0,
    sensitivity: str = "Normal",
    capture: AudioCapture | None = None,
    preprocessor: AudioPreprocessor | None = None,
    calibration: AudioCalibration | None = None,
    write_report: bool = True,
) -> MicrophoneDiagnosticResult:
    capture = capture or AudioCapture()
    preprocessor = preprocessor or AudioPreprocessor()
    calibration = calibration or AudioCalibration(preprocessor)
    display_sensitivity = str(sensitivity or "Headset").strip() or "Headset"
    sensitivity = normalize_input_sensitivity(display_sensitivity)
    device = capture.find_microphone_device(device_id) if device_id is not None else None
    device_name = device.name if device is not None else "No selected microphone"
    sample_rate = device.sample_rate if device is not None and device.sample_rate else preprocessor.target_sample_rate
    validation = capture.validate_device_selection(device_id)
    if not validation.valid:
        result = MicrophoneDiagnosticResult(
            status="FAIL",
            message=validation.message if not validation.warnings else f"{validation.message}: {'; '.join(validation.warnings)}",
            device_id=device_id,
            device_name=device_name,
            sample_rate=sample_rate,
            duration_ms=int(seconds * 1000),
            rms=0.0,
            peak=0.0,
            clipping=False,
            noise_floor_rms=0.0,
            speech_rms=0.0,
            speech_peak=0.0,
            speech_to_noise_gap=0.0,
            speech_to_noise_ratio=0.0,
            voiced_frame_ratio=0.0,
            final_vad_threshold=0.0,
            usable_input=False,
            input_state="No input detected",
            selected_sensitivity=display_sensitivity,
        )
        if write_report:
            result.report_path = write_json_report("microphone_diagnostic_latest.json", result.to_dict())
        return result
    noise_result = capture.capture_seconds(
        seconds=noise_seconds,
        device_id=device_id,
        sample_rate=sample_rate,
        channels=1,
    )
    if noise_result.status != "Captured":
        result = MicrophoneDiagnosticResult(
            status="FAIL",
            message=noise_result.message,
            device_id=device_id,
            device_name=device_name,
            sample_rate=sample_rate,
            duration_ms=int(seconds * 1000),
            rms=0.0,
            peak=0.0,
            clipping=False,
            noise_floor_rms=0.0,
            speech_rms=0.0,
            speech_peak=0.0,
            speech_to_noise_gap=0.0,
            speech_to_noise_ratio=0.0,
            voiced_frame_ratio=0.0,
            final_vad_threshold=0.0,
            usable_input=False,
            input_state="No input detected",
            selected_sensitivity=display_sensitivity,
        )
        if write_report:
            result.report_path = write_json_report("microphone_diagnostic_latest.json", result.to_dict())
        return result

    speech_result = capture.capture_seconds(
        seconds=speech_seconds,
        device_id=device_id,
        sample_rate=sample_rate,
        channels=1,
    )
    if speech_result.status != "Captured":
        result = MicrophoneDiagnosticResult(
            status="FAIL",
            message=speech_result.message,
            device_id=device_id,
            device_name=device_name,
            sample_rate=sample_rate,
            duration_ms=int(seconds * 1000),
            rms=0.0,
            peak=0.0,
            clipping=False,
            noise_floor_rms=0.0,
            speech_rms=0.0,
            speech_peak=0.0,
            speech_to_noise_gap=0.0,
            speech_to_noise_ratio=0.0,
            voiced_frame_ratio=0.0,
            final_vad_threshold=0.0,
            usable_input=False,
            input_state="No input detected",
            selected_sensitivity=display_sensitivity,
        )
        if write_report:
            result.report_path = write_json_report("microphone_diagnostic_latest.json", result.to_dict())
        return result

    prepared_noise = preprocessor.prepare_for_vad(noise_result.samples, source_rate=sample_rate)
    prepared_speech = preprocessor.prepare_for_vad(speech_result.samples, source_rate=sample_rate)
    stats = prepared_speech.stats
    noise_floor = calibration.estimate_noise_floor(prepared_noise.samples)
    speech_gap = stats.rms - noise_floor
    speech_to_noise_ratio = stats.rms / max(noise_floor, 0.0005)
    voiced_frame_ratio = float(np.count_nonzero(np.abs(prepared_speech.samples) >= max(0.003, noise_floor * 1.05)) / max(1, prepared_speech.samples.size))
    final_vad_threshold = {
        "Low": max(0.004, noise_floor * 1.35),
        "Normal": max(0.003, noise_floor * 1.15),
        "High": max(0.002, noise_floor * 1.05),
    }.get(sensitivity, max(0.002, noise_floor * 1.05))
    calibration_result = calibration.run_first_run_calibration(
        prepared_noise.samples,
        prepared_speech.samples,
            sensitivity=sensitivity,
    )
    usable = calibration_result.capture_allowed and stats.peak < 0.99
    if stats.peak >= 0.99:
        message = "Input clipping."
    elif calibration_result.input_state == "No Signal":
        message = "No input detected."
    elif calibration_result.input_state == "Too Quiet":
        message = "Input too low."
    elif calibration_result.input_state == "Input low but usable":
        message = "Input low but usable."
    elif usable:
        message = "Microphone usable."
    else:
        message = calibration_result.input_state
    result = MicrophoneDiagnosticResult(
        status="PASS" if usable else "WARN",
        message=message,
        device_id=device_id,
        device_name=device_name,
        sample_rate=sample_rate,
        duration_ms=noise_result.duration_ms + speech_result.duration_ms,
        rms=stats.rms,
        peak=stats.peak,
        clipping=stats.clipping,
        noise_floor_rms=noise_floor,
        speech_rms=stats.rms,
        speech_peak=stats.peak,
        speech_to_noise_gap=speech_gap,
        speech_to_noise_ratio=speech_to_noise_ratio,
        voiced_frame_ratio=voiced_frame_ratio,
        final_vad_threshold=final_vad_threshold,
        usable_input=usable,
        input_state=calibration_result.input_state,
        selected_sensitivity=display_sensitivity,
    )
    diagnosis_code, diagnosis_label, recommendation = classify_microphone_diagnostic(result)
    result.diagnostic_code = diagnosis_code
    result.diagnostic_label = diagnosis_label
    result.recommendation = recommendation
    if write_report:
        result.report_path = write_json_report("microphone_diagnostic_latest.json", result.to_dict())
        write_json_report(
            "microphone_threshold_debug_latest.json",
            {
                "selected_device": device_name,
                "sample_rate": sample_rate,
                "channels": 1,
                "dtype": "float32",
                "noise_rms": noise_floor,
                "noise_peak": float(np.max(np.abs(prepared_noise.samples))) if prepared_noise.samples.size else 0.0,
                "speech_rms": stats.rms,
                "speech_peak": stats.peak,
                "speech_to_noise_ratio": speech_to_noise_ratio,
                "voiced_frame_ratio": voiced_frame_ratio,
                "selected_sensitivity": display_sensitivity,
                "final_vad_threshold": final_vad_threshold,
                "final_classification": calibration_result.input_state,
                "diagnostic_code": diagnosis_code,
                "diagnostic_label": diagnosis_label,
                "capture_allowed": usable,
                "vad_reason_if_rejected": "" if usable else calibration_result.input_state,
                "recommendation": recommendation,
                "audio_scale_min_max": [-1.0, 1.0],
            },
        )
    return result
