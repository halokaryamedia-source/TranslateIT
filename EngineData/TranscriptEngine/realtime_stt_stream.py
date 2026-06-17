from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Deque

import numpy as np

from EngineData.TranscriptEngine.asr_model_loader import ASRModelLoader, ASRRuntimeProfile


@dataclass(slots=True)
class RealtimeSTTConfig:
    sample_rate: int = 16000
    chunk_ms: int = 160
    partial_interval_ms: int = 480
    min_partial_audio_ms: int = 360
    rolling_window_ms: int = 1600
    max_partial_latency_ms: int = 600
    final_flush_silence_ms: int = 280
    min_final_audio_ms: int = 240


@dataclass(slots=True)
class RealtimeSTTPartial:
    text: str
    status: str
    latency_ms: int
    audio_window_ms: int
    is_final: bool = False
    model_name: str = ""
    language: str = ""
    message: str = ""
    budget_passed: bool = True


@dataclass(slots=True)
class _BufferedChunk:
    samples: np.ndarray
    duration_ms: int
    speech_confirmed: bool


@dataclass(slots=True)
class RealtimeSTTStream:
    asr_loader: ASRModelLoader
    config: RealtimeSTTConfig = field(default_factory=RealtimeSTTConfig)
    profile: ASRRuntimeProfile | None = None
    _chunks: Deque[_BufferedChunk] = field(default_factory=deque)
    _audio_ms: int = 0
    _speech_ms: int = 0
    _silence_ms: int = 0
    _last_partial_at_ms: int = 0
    _last_partial_text: str = ""

    def push_chunk(self, samples: Any, *, speech_confirmed: bool) -> RealtimeSTTPartial | None:
        chunk_started = perf_counter()
        audio = np.asarray(samples, dtype=np.float32).reshape(-1)
        if not audio.flags.c_contiguous:
            audio = np.ascontiguousarray(audio, dtype=np.float32)
        duration_ms = int(round((audio.size / max(1, self.config.sample_rate)) * 1000.0))
        if duration_ms <= 0:
            return None
        self._chunks.append(_BufferedChunk(audio, duration_ms, bool(speech_confirmed)))
        self._audio_ms += duration_ms
        if speech_confirmed:
            self._speech_ms += duration_ms
            self._silence_ms = 0
        else:
            self._silence_ms += duration_ms
        self._trim_to_rolling_window()
        if self._audio_ms < self.config.min_partial_audio_ms:
            return None
        if self._last_partial_at_ms and (self._audio_ms - self._last_partial_at_ms) < self.config.partial_interval_ms:
            return None
        if self._speech_ms < self.config.min_final_audio_ms:
            return None
        result = self._transcribe_window(is_final=False, started=chunk_started)
        if result.status == "Completed":
            self._last_partial_at_ms = self._audio_ms
            self._last_partial_text = result.text
        return result

    def flush_final(self) -> RealtimeSTTPartial:
        started = perf_counter()
        if self._speech_ms < self.config.min_final_audio_ms or self._audio_ms <= 0:
            self.reset()
            return RealtimeSTTPartial(text="", status="Skipped", latency_ms=int((perf_counter() - started) * 1000), audio_window_ms=0, is_final=True, message="Not enough speech audio to finalize.")
        result = self._transcribe_window(is_final=True, started=started)
        self.reset()
        return result

    def should_flush_final(self) -> bool:
        return self._speech_ms >= self.config.min_final_audio_ms and self._silence_ms >= self.config.final_flush_silence_ms

    def reset(self) -> None:
        self._chunks.clear()
        self._audio_ms = 0
        self._speech_ms = 0
        self._silence_ms = 0
        self._last_partial_at_ms = 0
        self._last_partial_text = ""

    def _trim_to_rolling_window(self) -> None:
        while self._chunks and self._audio_ms > self.config.rolling_window_ms:
            removed = self._chunks.popleft()
            self._audio_ms -= removed.duration_ms
            if removed.speech_confirmed:
                self._speech_ms = max(0, self._speech_ms - removed.duration_ms)

    def _window_audio(self) -> np.ndarray:
        if not self._chunks:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate([chunk.samples for chunk in self._chunks]).astype(np.float32)

    def _transcribe_window(self, *, is_final: bool, started: float) -> RealtimeSTTPartial:
        profile = self.profile or self.asr_loader.realtime_profile()
        result = self.asr_loader.transcribe_audio(self._window_audio(), profile=profile)
        latency_ms = int((perf_counter() - started) * 1000)
        text = str(result.text or "").strip()
        status = result.status
        if not is_final and text and text == self._last_partial_text:
            status = "Unchanged"
        return RealtimeSTTPartial(text=text, status=status, latency_ms=latency_ms, audio_window_ms=self._audio_ms, is_final=is_final, model_name=result.model_name, language=result.language, message=result.message, budget_passed=latency_ms <= self.config.max_partial_latency_ms if not is_final else True)
