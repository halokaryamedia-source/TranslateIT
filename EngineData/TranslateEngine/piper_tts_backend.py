from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import shutil
from time import perf_counter
from typing import Sequence


@dataclass(slots=True)
class TTSCapability:
    available: bool
    engine_name: str
    mode: str
    message: str
    executable_path: str = ""
    voice_model_path: str = ""


@dataclass(slots=True)
class TTSPlan:
    status: str
    text: str
    engine_name: str
    mode: str
    estimated_latency_budget_ms: int
    executable_path: str = ""
    voice_model_path: str = ""
    error: str = ""


@dataclass(slots=True)
class TTSBenchmarkContract:
    status: str
    target_latency_ms: int
    sample_count: int
    engine_name: str
    message: str
    required_metrics: tuple[str, ...] = (
        "latency_ms",
        "audio_duration_ms",
        "realtime_factor",
        "voice_model_path",
        "executable_path",
    )


class PiperTTSBackend:
    """Optional local Piper TTS capability layer for realtime voice output.

    This module intentionally separates readiness checks from actual audio
    playback. The runtime must only report Piper as active when both executable
    and voice model are present.
    """

    def __init__(self, model_root: Path | None = None, *, target_latency_ms: int = 300) -> None:
        self.model_root = model_root
        self.target_latency_ms = target_latency_ms
        self.engine_name = "piper-local-tts"

    def dependency_status(self, *, language: str = "en", voice_name: str = "") -> TTSCapability:
        executable = self._resolve_executable()
        if not executable:
            return TTSCapability(False, self.engine_name, "missing_dependency", "Piper executable was not found.")
        voice_model = self.resolve_voice_model(language=language, voice_name=voice_name)
        if voice_model is None:
            return TTSCapability(
                False,
                self.engine_name,
                "missing_voice_model",
                "Piper voice model was not found under TranslateEngine/ModelData.",
                executable_path=executable,
            )
        return TTSCapability(
            True,
            self.engine_name,
            "local_tts_ready",
            "Piper TTS is ready for runtime synthesis.",
            executable_path=executable,
            voice_model_path=str(voice_model),
        )

    def plan_synthesis(self, *, text: str, language: str = "en", voice_name: str = "") -> TTSPlan:
        started = perf_counter()
        clean_text = str(text or "").strip()
        capability = self.dependency_status(language=language, voice_name=voice_name)
        if not clean_text:
            return TTSPlan("Skipped", clean_text, self.engine_name, "empty_text", self.target_latency_ms, error="Empty text.")
        if not capability.available:
            return TTSPlan(
                "Unavailable",
                clean_text,
                capability.engine_name,
                capability.mode,
                self.target_latency_ms,
                executable_path=capability.executable_path,
                voice_model_path=capability.voice_model_path,
                error=capability.message,
            )
        return TTSPlan(
            "Ready",
            clean_text,
            capability.engine_name,
            capability.mode,
            self.target_latency_ms,
            executable_path=capability.executable_path,
            voice_model_path=capability.voice_model_path,
        )

    def benchmark_contract(self, *, samples: Sequence[str] | None = None, language: str = "en", voice_name: str = "") -> TTSBenchmarkContract:
        sample_texts = tuple(samples or (
            "Hello, this is a TranslateIT realtime voice test.",
            "I will deploy the build tonight.",
            "Please wait a moment while the engine translates the sentence.",
        ))
        capability = self.dependency_status(language=language, voice_name=voice_name)
        if not capability.available:
            return TTSBenchmarkContract(
                "Unavailable",
                self.target_latency_ms,
                len(sample_texts),
                self.engine_name,
                capability.message,
            )
        elapsed_ms = int((perf_counter() - perf_counter()) * 1000)
        del elapsed_ms
        return TTSBenchmarkContract(
            "Ready",
            self.target_latency_ms,
            len(sample_texts),
            self.engine_name,
            "Piper is ready; runtime benchmark must measure latency_ms, audio_duration_ms, and realtime_factor per sample.",
        )

    def resolve_voice_model(self, *, language: str, voice_name: str = "") -> Path | None:
        if self.model_root is None:
            return None
        normalized_language = str(language or "en").strip().lower()
        candidates: list[Path] = []
        piper_root = self.model_root / "piper"
        if voice_name:
            candidates.extend([
                piper_root / f"{voice_name}.onnx",
                piper_root / voice_name / f"{voice_name}.onnx",
            ])
        language_prefixes = {
            "en": ("en_US", "en_GB", "en"),
            "eng": ("en_US", "en_GB", "en"),
            "english": ("en_US", "en_GB", "en"),
            "id": ("id_ID", "id"),
            "ind": ("id_ID", "id"),
            "indonesian": ("id_ID", "id"),
        }.get(normalized_language, (normalized_language,))
        if piper_root.exists():
            for prefix in language_prefixes:
                candidates.extend(sorted(piper_root.glob(f"{prefix}*.onnx")))
                candidates.extend(sorted(piper_root.glob(f"**/{prefix}*.onnx")))
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
        return None

    @staticmethod
    def _resolve_executable() -> str:
        env_path = os.environ.get("TRANSLATEIT_PIPER_EXE", "").strip()
        if env_path and Path(env_path).exists():
            return env_path
        return shutil.which("piper") or ""
