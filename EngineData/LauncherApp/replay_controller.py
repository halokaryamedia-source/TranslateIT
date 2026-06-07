from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from EngineData.LauncherApp.audio_playback import AudioPlaybackService


@dataclass(slots=True)
class ReplayResult:
    status: str
    message: str
    audio_path: Path | None = None


class ReplayController:
    """Replay helper that keeps playback separate from microphone capture."""

    def __init__(self, playback: AudioPlaybackService | None = None) -> None:
        self.playback = playback or AudioPlaybackService()

    def reset_runtime_state(self) -> int:
        return self.playback.clear_pending_requests()

    def replay_audio(self, audio_path: Path | None, *, output_device_id: int | None = None) -> ReplayResult:
        if audio_path is None:
            return ReplayResult("Unavailable", "No replay audio path is available.")
        resolved_path = Path(audio_path)
        if not resolved_path.exists():
            return ReplayResult("Unavailable", f"Replay audio does not exist: {resolved_path}", resolved_path)
        if resolved_path.suffix.lower() != ".wav":
            return ReplayResult("Unsupported", "Only WAV replay is scaffolded for the first prototype.", resolved_path)
        result = self.playback.play_wav(resolved_path, output_device_id=output_device_id)
        return ReplayResult(result.status, result.message, result.audio_path)
