from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np


@dataclass(slots=True)
class AudioFrameStats:
    sample_rate: int
    frame_count: int
    duration_ms: int
    rms: float
    peak: float
    clipping: bool
    input_state: str


@dataclass(slots=True)
class PreprocessingResult:
    samples: np.ndarray
    stats: AudioFrameStats
    noise_gate_threshold: float


class AudioPreprocessor:
    target_sample_rate: int = 16_000
    default_frame_ms: int = 20

    def to_mono(self, samples: np.ndarray) -> np.ndarray:
        array = np.asarray(samples, dtype=np.float32)
        if array.ndim == 1:
            return array
        if array.ndim == 2 and array.shape[1] > 0:
            return array.mean(axis=1)
        return array.reshape(-1)

    def resample(self, samples: np.ndarray, source_rate: int, target_rate: int | None = None) -> np.ndarray:
        target_rate = target_rate or self.target_sample_rate
        array = np.asarray(samples, dtype=np.float32)
        if source_rate <= 0 or source_rate == target_rate or array.size == 0:
            return array
        source_positions = np.linspace(0.0, 1.0, num=array.size, endpoint=True)
        target_size = max(1, int(round(array.size * float(target_rate) / float(source_rate))))
        target_positions = np.linspace(0.0, 1.0, num=target_size, endpoint=True)
        return np.interp(target_positions, source_positions, array).astype(np.float32)

    def rms(self, samples: np.ndarray) -> float:
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return 0.0
        return float(np.sqrt(np.mean(np.square(array), dtype=np.float32)))

    def peak(self, samples: np.ndarray) -> float:
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return 0.0
        return float(np.max(np.abs(array)))

    def soft_normalize(self, samples: np.ndarray, target_peak: float = 0.95) -> np.ndarray:
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return array
        peak = self.peak(array)
        if peak <= 0.0:
            return array
        scale = min(1.0, target_peak / peak)
        return np.clip(array * scale, -1.0, 1.0)

    def noise_gate(self, samples: np.ndarray, floor_rms: float, gate_multiplier: float = 1.8) -> np.ndarray:
        array = np.asarray(samples, dtype=np.float32)
        if array.size == 0:
            return array
        threshold = max(0.005, float(floor_rms) * gate_multiplier)
        gated = array.copy()
        gated[np.abs(gated) < threshold] = 0.0
        return gated

    def classify_state(self, samples: np.ndarray, floor_rms: float = 0.0) -> str:
        rms_value = self.rms(samples)
        peak_value = self.peak(samples)
        if peak_value >= 0.99:
            return "Too Loud / Clipping"
        if rms_value <= max(0.005, floor_rms * 0.5):
            return "Too Quiet"
        if rms_value <= max(0.03, floor_rms * 1.2):
            return "Background Noise High"
        return "Good"

    def analyze(self, samples: np.ndarray, sample_rate: int, floor_rms: float = 0.0) -> AudioFrameStats:
        array = np.asarray(samples, dtype=np.float32)
        duration_ms = int(round((array.size / max(1, sample_rate)) * 1000.0))
        peak = self.peak(array)
        rms = self.rms(array)
        return AudioFrameStats(
            sample_rate=sample_rate,
            frame_count=int(array.size),
            duration_ms=duration_ms,
            rms=rms,
            peak=peak,
            clipping=peak >= 0.99,
            input_state=self.classify_state(array, floor_rms=floor_rms),
        )

    def prepare(
        self,
        samples: np.ndarray,
        source_rate: int,
        *,
        floor_rms: float = 0.0,
        target_rate: int | None = None,
        gate_multiplier: float = 1.8,
    ) -> PreprocessingResult:
        mono = self.to_mono(samples)
        resampled = self.resample(mono, source_rate=source_rate, target_rate=target_rate)
        normalized = self.soft_normalize(resampled)
        gated = self.noise_gate(normalized, floor_rms=floor_rms, gate_multiplier=gate_multiplier)
        stats = self.analyze(gated, sample_rate=target_rate or self.target_sample_rate, floor_rms=floor_rms)
        threshold = max(0.005, float(floor_rms) * gate_multiplier)
        return PreprocessingResult(samples=gated, stats=stats, noise_gate_threshold=threshold)

    def prepare_for_vad(
        self,
        samples: np.ndarray,
        source_rate: int,
        *,
        floor_rms: float = 0.0,
        target_rate: int | None = None,
    ) -> PreprocessingResult:
        """Prepare audio for VAD without normalization or gating.

        VAD must see real input energy. Normalizing before VAD can amplify
        room noise into fake speech and create Whisper hallucinations.
        """
        mono = self.to_mono(samples)
        resampled = self.resample(mono, source_rate=source_rate, target_rate=target_rate)
        stats = self.analyze(resampled, sample_rate=target_rate or self.target_sample_rate, floor_rms=floor_rms)
        return PreprocessingResult(samples=resampled, stats=stats, noise_gate_threshold=0.0)

    def prepare_for_asr(
        self,
        samples: np.ndarray,
        source_rate: int,
        *,
        target_rate: int | None = None,
        collect_stats: bool = True,
    ) -> PreprocessingResult:
        """Prepare already-accepted speech for ASR."""
        mono = self.to_mono(samples)
        resampled = self.resample(mono, source_rate=source_rate, target_rate=target_rate)
        normalized = self.soft_normalize(resampled, target_peak=0.80)
        if collect_stats:
            stats = self.analyze(normalized, sample_rate=target_rate or self.target_sample_rate)
        else:
            sample_rate = target_rate or self.target_sample_rate
            stats = AudioFrameStats(
                sample_rate=sample_rate,
                frame_count=int(normalized.size),
                duration_ms=int(round((normalized.size / max(1, sample_rate)) * 1000.0)),
                rms=0.0,
                peak=0.0,
                clipping=False,
                input_state="Prepared",
            )
        return PreprocessingResult(samples=normalized, stats=stats, noise_gate_threshold=0.0)
