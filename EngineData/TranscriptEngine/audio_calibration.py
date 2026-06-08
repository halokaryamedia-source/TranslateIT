from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from EngineData.TranscriptEngine.audio_preprocessing import AudioPreprocessor


def normalize_input_sensitivity(value: str) -> str:
    return "High" if str(value or "").strip() == "Headset" else str(value or "Normal")


@dataclass(slots=True)
class CalibrationResult:
    noise_floor_rms: float
    speech_rms: float
    peak_level: float
    clipping_risk: float
    speech_to_noise_gap: float
    speech_to_noise_ratio: float
    voiced_frame_ratio: float
    final_vad_threshold: float
    recommended_preset: str
    input_state: str
    capture_allowed: bool = True

    def to_dict(self) -> dict[str, float | str]:
        return {
            "noise_floor_rms": self.noise_floor_rms,
            "speech_rms": self.speech_rms,
            "peak_level": self.peak_level,
            "clipping_risk": self.clipping_risk,
            "speech_to_noise_gap": self.speech_to_noise_gap,
            "speech_to_noise_ratio": self.speech_to_noise_ratio,
            "voiced_frame_ratio": self.voiced_frame_ratio,
            "final_vad_threshold": self.final_vad_threshold,
            "recommended_preset": self.recommended_preset,
            "input_state": self.input_state,
            "capture_allowed": self.capture_allowed,
        }


class AudioCalibration:
    """First-run microphone calibration scaffold."""

    def __init__(self, preprocessor: AudioPreprocessor | None = None) -> None:
        self.preprocessor = preprocessor or AudioPreprocessor()

    def estimate_noise_floor(self, silent_samples: Any | None = None) -> float:
        if silent_samples is None:
            return 0.0
        array = np.asarray(silent_samples, dtype=np.float32)
        return self.preprocessor.rms(array)

    def measure_speech(self, speech_samples: Any | None = None) -> tuple[float, float]:
        if speech_samples is None:
            return 0.0, 0.0
        array = np.asarray(speech_samples, dtype=np.float32)
        return self.preprocessor.rms(array), self.preprocessor.peak(array)

    def recommend_preset(self, speech_rms: float, noise_floor_rms: float, peak_level: float) -> str:
        return "Headset"

    def classify_input_state(
        self,
        noise_floor_rms: float,
        speech_rms: float,
        peak_level: float,
        *,
        sensitivity: str = "Normal",
    ) -> str:
        sensitivity = normalize_input_sensitivity(sensitivity)
        speech_gap = speech_rms - noise_floor_rms
        speech_to_noise_ratio = speech_rms / max(noise_floor_rms, 0.0005)
        if peak_level >= 0.99:
            return "Too Loud / Clipping"
        if peak_level < 0.0025 and speech_rms < 0.0015:
            return "No Signal"
        if speech_rms <= max(0.0009, noise_floor_rms * 0.45) and peak_level < 0.0055 and speech_gap < 0.0005:
            return "Too Quiet"
        if speech_to_noise_ratio >= 1.08 or speech_gap >= 0.0005 or peak_level >= 0.0038:
            if speech_rms <= max(0.0028, noise_floor_rms * 1.10):
                return "Input low but usable"
            return "Good"
        if speech_rms <= max(0.0038, noise_floor_rms * 1.10):
            return "Background Noise High"
        return "Good"

    def run_first_run_calibration(
        self,
        silent_samples: Any | None = None,
        speech_samples: Any | None = None,
        sensitivity: str = "Normal",
    ) -> CalibrationResult:
        sensitivity = normalize_input_sensitivity(sensitivity)
        noise_floor_rms = self.estimate_noise_floor(silent_samples)
        speech_rms, peak_level = self.measure_speech(speech_samples)
        clipping_risk = 1.0 if peak_level >= 0.99 else peak_level
        speech_to_noise_gap = speech_rms - noise_floor_rms
        recommended_preset = self.recommend_preset(speech_rms, noise_floor_rms, peak_level)
        input_state = self.classify_input_state(
            noise_floor_rms,
            speech_rms,
            peak_level,
            sensitivity=sensitivity,
        )
        speech_to_noise_ratio = speech_rms / max(noise_floor_rms, 0.0005)
        voiced_frame_ratio = 1.0 if speech_rms > noise_floor_rms * 1.15 else 0.0
        final_vad_threshold = {
        "Low": max(0.0015, noise_floor_rms * 1.00),
        "Normal": max(0.0010, noise_floor_rms * 0.92),
        "High": max(0.0008, noise_floor_rms * 0.88),
        }.get(sensitivity, max(0.0010, noise_floor_rms * 0.92))
        return CalibrationResult(
            noise_floor_rms=noise_floor_rms,
            speech_rms=speech_rms,
            peak_level=peak_level,
            clipping_risk=clipping_risk,
            speech_to_noise_gap=speech_to_noise_gap,
            speech_to_noise_ratio=speech_to_noise_ratio,
            voiced_frame_ratio=voiced_frame_ratio,
            final_vad_threshold=final_vad_threshold,
            recommended_preset=recommended_preset,
            input_state=input_state,
            capture_allowed=input_state not in {"Too Quiet", "No Signal", "Too Loud / Clipping"},
        )
