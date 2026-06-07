from __future__ import annotations

from dataclasses import dataclass

from EngineData.TranscriptEngine.audio_noise_filter import AudioNoiseFilter


@dataclass(frozen=True, slots=True)
class VADPresetConfig:
    name: str
    pre_roll_audio_ms: int
    minimum_speech_duration_ms: int
    minimum_silence_duration_ms: int
    maximum_segment_duration_s: int
    noise_gate: str
    post_asr_rejection: bool = True


@dataclass(slots=True)
class VADDecision:
    accepted: bool
    reason: str = ""
    preset: str = "Headset"
    should_hide: bool = True


HEADSET_PRESET = VADPresetConfig(
    name="Headset",
    pre_roll_audio_ms=180,
    minimum_speech_duration_ms=100,
    minimum_silence_duration_ms=80,
    maximum_segment_duration_s=8,
    noise_gate="adaptive light",
)

PRESET_LIBRARY: dict[str, VADPresetConfig] = {
    "Headset": HEADSET_PRESET,
    "Normal Room": HEADSET_PRESET,
    "Noisy Room": VADPresetConfig(
        name="Noisy Room",
        pre_roll_audio_ms=300,
        minimum_speech_duration_ms=180,
        minimum_silence_duration_ms=240,
        maximum_segment_duration_s=8,
        noise_gate="adaptive strong",
    ),
    "Push to Talk": VADPresetConfig(
        name="Push to Talk",
        pre_roll_audio_ms=120,
        minimum_speech_duration_ms=200,
        minimum_silence_duration_ms=200,
        maximum_segment_duration_s=8,
        noise_gate="manual trigger",
    ),
    "Developer Raw": VADPresetConfig(
        name="Developer Raw",
        pre_roll_audio_ms=0,
        minimum_speech_duration_ms=100,
        minimum_silence_duration_ms=150,
        maximum_segment_duration_s=8,
        noise_gate="raw",
    ),
}


class VADPipeline:
    """Segment gate and speech validation scaffold."""

    def __init__(self, preset_name: str = "Headset") -> None:
        self.set_preset(preset_name)

    def set_preset(self, preset_name: str) -> None:
        self.preset = PRESET_LIBRARY.get(preset_name, HEADSET_PRESET)

    def _speech_focus_score(
        self,
        *,
        speech_to_noise_gap: float,
        voiced_frame_ratio: float,
        rms: float,
        peak: float,
        noise_floor_rms: float,
    ) -> float:
        if speech_to_noise_gap <= 0.0 and voiced_frame_ratio <= 0.0:
            return 0.0
        gap_score = min(
            1.0,
            max(
                0.0,
                (speech_to_noise_gap - max(0.0, noise_floor_rms * 0.10))
                / max(0.0015, noise_floor_rms * 0.35),
            ),
        )
        voiced_score = min(1.0, max(0.0, voiced_frame_ratio / 0.06))
        energy_score = min(
            1.0,
            max(
                0.0,
                (rms - noise_floor_rms)
                / max(0.0014, noise_floor_rms * 0.28),
            ),
        )
        peak_score = min(
            1.0,
            max(
                0.0,
                (peak - max(0.004, noise_floor_rms * 1.05))
                / max(0.010, noise_floor_rms * 1.9),
            ),
        )
        return round(
            (gap_score * 0.35) + (voiced_score * 0.30) + (energy_score * 0.20) + (peak_score * 0.15),
            3,
        )

    def should_accept_segment(
        self,
        *,
        duration_ms: int,
        silence_ms: int,
        speech_duration_ms: int | None = None,
        speech_confirmed: bool = True,
        rms: float | None = None,
        peak: float | None = None,
        noise_floor_rms: float = 0.0,
        clipping_risk: float = 0.0,
        noise_risk: float = 0.0,
        speech_to_noise_gap: float = 0.0,
        voiced_frame_ratio: float = 0.0,
        zero_crossing_rate: float = 0.0,
        peak_to_rms_ratio: float = 0.0,
        frame_energy_concentration: float = 0.0,
        frame_active_ratio: float = 0.0,
        impulse_edge_ratio: float = 0.0,
        echo_match: bool = False,
    ) -> VADDecision:
        if echo_match:
            return VADDecision(False, "Echo match detected", self.preset.name, True)
        if not speech_confirmed:
            return VADDecision(False, "VAD did not confirm speech", self.preset.name, True)
        strong_voiced_speech = (
            self.preset.name == "Headset"
            and speech_duration_ms is not None
            and speech_duration_ms >= 200
            and voiced_frame_ratio >= 0.16
            and speech_to_noise_gap >= -0.0003
        )
        if rms is not None and rms <= max(0.0025, noise_floor_rms * 1.08):
            if not strong_voiced_speech:
                return VADDecision(False, "Below calibrated energy threshold", self.preset.name, True)
        if clipping_risk >= 0.8:
            return VADDecision(False, "Severe clipping", self.preset.name, True)
        if noise_risk >= 0.8:
            return VADDecision(False, "Dominant stationary noise", self.preset.name, True)
        focus_score = self._speech_focus_score(
            speech_to_noise_gap=speech_to_noise_gap,
            voiced_frame_ratio=voiced_frame_ratio,
            rms=float(rms or 0.0),
            peak=float(peak or 0.0),
            noise_floor_rms=noise_floor_rms,
        )
        if strong_voiced_speech:
            effective_speech_ms = duration_ms if speech_duration_ms is None else speech_duration_ms
            if silence_ms < self.preset.minimum_silence_duration_ms:
                return VADDecision(False, "Insufficient end silence", self.preset.name, True)
            if duration_ms > self.preset.maximum_segment_duration_s * 1000:
                return VADDecision(False, "Segment too long", self.preset.name, True)
            if effective_speech_ms < self.preset.minimum_speech_duration_ms:
                return VADDecision(False, "Segment too short", self.preset.name, True)
            return VADDecision(True, "Accepted", self.preset.name, False)
        if (
            self.preset.name in {"Headset", "Normal Room", "Noisy Room"}
            and duration_ms >= 220
            and (speech_to_noise_gap > 0.0 or voiced_frame_ratio > 0.0)
        ):
            legacy_noise_like_segment = (
                duration_ms >= 180
                and voiced_frame_ratio <= 0.045
                and speech_to_noise_gap <= max(0.0030, noise_floor_rms * 0.24)
                and (
                    peak_to_rms_ratio >= 8.0
                    or frame_energy_concentration >= 0.75
                    or frame_active_ratio <= 0.18
                    or impulse_edge_ratio >= 0.08
                    or (peak_to_rms_ratio >= 6.2 and frame_active_ratio <= 0.22 and zero_crossing_rate <= 0.20)
                    or (peak_to_rms_ratio >= 6.8 and zero_crossing_rate <= 0.24 and frame_active_ratio <= 0.28)
                )
            )
            noise_assessment = AudioNoiseFilter.classify(
                type(
                    "NoiseSignal",
                    (),
                    {
                        "audio_duration_ms": duration_ms,
                        "voiced_frame_ratio": voiced_frame_ratio,
                        "speech_to_noise_gap": speech_to_noise_gap,
                        "audio_peak": float(peak or 0.0),
                        "audio_rms": float(rms or 0.0),
                        "peak_to_rms_ratio": peak_to_rms_ratio,
                        "frame_energy_concentration": frame_energy_concentration,
                        "frame_active_ratio": frame_active_ratio,
                        "impulse_edge_ratio": impulse_edge_ratio,
                        "zero_crossing_rate": zero_crossing_rate,
                        "no_speech_probability": 0.0,
                    },
                )()
            )
            if noise_assessment.matched or legacy_noise_like_segment:
                return VADDecision(False, "Noise-like segment", self.preset.name, True)
            low_focus = focus_score <= 0.42
            extended_low_focus = (
                duration_ms >= 700
                and focus_score <= 0.48
                and speech_to_noise_gap <= max(0.0008, noise_floor_rms * 0.15)
                and voiced_frame_ratio <= 0.018
                and peak <= max(0.011, noise_floor_rms * 2.0)
            )
            if low_focus or extended_low_focus:
                return VADDecision(False, "Low speech focus", self.preset.name, True)
        effective_speech_ms = duration_ms if speech_duration_ms is None else speech_duration_ms
        if effective_speech_ms < self.preset.minimum_speech_duration_ms:
            return VADDecision(False, "Segment too short", self.preset.name, True)
        if silence_ms < self.preset.minimum_silence_duration_ms:
            return VADDecision(False, "Insufficient end silence", self.preset.name, True)
        if duration_ms > self.preset.maximum_segment_duration_s * 1000:
            return VADDecision(False, "Segment too long", self.preset.name, True)
        return VADDecision(True, "Accepted", self.preset.name, False)
