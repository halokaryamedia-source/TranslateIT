from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class NoiseThresholds:
    impact_dur_min_ms: int = 40
    impact_dur_max_ms: int = 2600
    impact_pr_min: float = 6.0
    impact_peak_min: float = 0.014
    impact_gap_max: float = 0.014
    impact_energy_min: float = 0.58
    impact_active_max: float = 0.32
    impact_edge_min: float = 0.035
    impact_zcr_max: float = 0.18
    impact_voiced_max: float = 0.14

    imp_dur_min_ms: int = 180
    imp_dur_max_ms: int = 2600
    imp_pr_min: float = 5.0
    imp_peak_min: float = 0.018
    imp_gap_max: float = 0.018
    imp_energy_min: float = 0.72
    imp_active_max: float = 0.36
    imp_edge_min: float = 0.03
    imp_zcr_max: float = 0.12
    imp_voiced_max: float = 0.12

    stat_dur_min_ms: int = 260
    stat_voiced_max: float = 0.10
    stat_gap_max: float = 0.006
    stat_peak_max: float = 0.040
    stat_pr_max: float = 3.8
    stat_active_min: float = 0.68
    stat_energy_max: float = 0.78

    breath_dur_min_ms: int = 300
    breath_dur_max_ms: int = 2200
    breath_voiced_max: float = 0.12
    breath_gap_max: float = 0.0085
    breath_peak_max: float = 0.032
    breath_pr_min: float = 1.2
    breath_pr_max: float = 4.2
    breath_active_min: float = 0.46
    breath_energy_max: float = 0.70

    bg_dur_min_ms: int = 500
    bg_voiced_max: float = 0.14
    bg_gap_max: float = 0.010
    bg_peak_max: float = 0.060
    bg_rms_max: float = 0.025
    bg_pr_max: float = 4.8
    bg_nsp_min: float = 0.04
    bg_energy_max: float = 0.76
    bg_active_min: float = 0.50

    mix_dur_min_ms: int = 240
    mix_voiced_max: float = 0.06
    mix_gap_max: float = 0.0030
    mix_pr_min: float = 4.4
    mix_active_max: float = 0.40
    mix_edge_min: float = 0.05
    mix_energy_min: float = 0.72
    mix_zcr_max: float = 0.24


@dataclass(slots=True)
class AudioNoiseAssessment:
    matched: bool = False
    category: str = ""
    reason: str = ""

    @property
    def label(self) -> str:
        return {
            "impact": "Impact",
            "impulse": "Impulse",
            "stationary": "Stationary",
            "breath_handling": "Breath",
            "background_media": "Background",
            "mixed": "Mixed",
        }.get(self.category, self.category.replace("_", " ").title())


class AudioNoiseFilter:
    """Single shared noise classifier for VAD and ASR rejection."""

    thresholds = NoiseThresholds()

    @classmethod
    def configure(cls, thresholds: NoiseThresholds) -> None:
        cls.thresholds = thresholds

    @staticmethod
    def _get(report: Any, name: str, default: float = 0.0) -> float:
        try:
            return float(getattr(report, name, default) or default)
        except Exception:
            return default

    @classmethod
    def classify(cls, report: Any) -> AudioNoiseAssessment:
        duration_ms = int(cls._get(report, "audio_duration_ms", 0))
        voiced_frame_ratio = cls._get(report, "voiced_frame_ratio", 0.0)
        speech_to_noise_gap = cls._get(report, "speech_to_noise_gap", 0.0)
        audio_peak = cls._get(report, "audio_peak", 0.0)
        audio_rms = cls._get(report, "audio_rms", 0.0)
        peak_to_rms_ratio = cls._get(report, "peak_to_rms_ratio", 0.0)
        frame_energy_concentration = cls._get(report, "frame_energy_concentration", 0.0)
        frame_active_ratio = cls._get(report, "frame_active_ratio", 0.0)
        impulse_edge_ratio = cls._get(report, "impulse_edge_ratio", 0.0)
        zero_crossing_rate = cls._get(report, "zero_crossing_rate", 0.0)
        no_speech_probability = cls._get(report, "no_speech_probability", 0.0)

        t = cls.thresholds
        if (
            duration_ms >= t.impact_dur_min_ms
            and duration_ms <= t.impact_dur_max_ms
            and peak_to_rms_ratio >= t.impact_pr_min
            and audio_peak >= t.impact_peak_min
            and speech_to_noise_gap <= t.impact_gap_max
            and frame_energy_concentration >= t.impact_energy_min
            and frame_active_ratio <= t.impact_active_max
            and (
                impulse_edge_ratio >= t.impact_edge_min
                or zero_crossing_rate <= t.impact_zcr_max
                or voiced_frame_ratio <= t.impact_voiced_max
            )
        ):
            return AudioNoiseAssessment(True, "impact", "Impact")

        if (
            duration_ms >= t.imp_dur_min_ms
            and duration_ms <= t.imp_dur_max_ms
            and peak_to_rms_ratio >= t.imp_pr_min
            and audio_peak >= t.imp_peak_min
            and speech_to_noise_gap <= t.imp_gap_max
            and frame_energy_concentration >= t.imp_energy_min
            and frame_active_ratio <= t.imp_active_max
            and (impulse_edge_ratio >= t.imp_edge_min or zero_crossing_rate <= t.imp_zcr_max or voiced_frame_ratio <= t.imp_voiced_max)
        ):
            return AudioNoiseAssessment(True, "impulse", "Impulse")

        if (
            duration_ms >= t.stat_dur_min_ms
            and voiced_frame_ratio <= t.stat_voiced_max
            and speech_to_noise_gap <= t.stat_gap_max
            and audio_peak <= t.stat_peak_max
            and peak_to_rms_ratio <= t.stat_pr_max
            and frame_active_ratio >= t.stat_active_min
            and frame_energy_concentration <= t.stat_energy_max
        ):
            return AudioNoiseAssessment(True, "stationary", "Stationary")

        if (
            duration_ms >= t.breath_dur_min_ms
            and duration_ms <= t.breath_dur_max_ms
            and voiced_frame_ratio <= t.breath_voiced_max
            and speech_to_noise_gap <= t.breath_gap_max
            and audio_peak <= t.breath_peak_max
            and peak_to_rms_ratio >= t.breath_pr_min
            and peak_to_rms_ratio <= t.breath_pr_max
            and frame_active_ratio >= t.breath_active_min
            and frame_energy_concentration <= t.breath_energy_max
        ):
            return AudioNoiseAssessment(True, "breath_handling", "Breath")

        if (
            duration_ms >= t.bg_dur_min_ms
            and voiced_frame_ratio <= t.bg_voiced_max
            and speech_to_noise_gap <= t.bg_gap_max
            and audio_peak <= t.bg_peak_max
            and audio_rms <= t.bg_rms_max
            and peak_to_rms_ratio <= t.bg_pr_max
            and no_speech_probability >= t.bg_nsp_min
            and frame_energy_concentration <= t.bg_energy_max
            and frame_active_ratio >= t.bg_active_min
        ):
            return AudioNoiseAssessment(True, "background_media", "Background")

        if (
            duration_ms >= t.mix_dur_min_ms
            and voiced_frame_ratio <= t.mix_voiced_max
            and speech_to_noise_gap <= t.mix_gap_max
            and peak_to_rms_ratio >= t.mix_pr_min
            and frame_active_ratio <= t.mix_active_max
            and (impulse_edge_ratio >= t.mix_edge_min or frame_energy_concentration >= t.mix_energy_min or zero_crossing_rate <= t.mix_zcr_max)
        ):
            return AudioNoiseAssessment(True, "mixed", "Mixed")

        return AudioNoiseAssessment(False, "", "")
