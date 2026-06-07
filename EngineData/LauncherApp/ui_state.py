from __future__ import annotations

from enum import Enum


class UIState(str, Enum):
    IDLE = "Idle"
    READY = "Ready"
    PREPARING = "Preparing"
    STREAM_CHECK = "Stream Check"
    READY_TO_LISTEN = "Ready to Listen"
    LISTENING = "Listening"
    SPEECH_DETECTED = "Speech Detected"
    TRANSCRIBING = "Transcribing"
    TRANSLATING = "Translating"
    COMPLETED = "Completed"
    PAUSED = "Paused"
    STOPPED = "Stopped"
    ERROR = "Error"
