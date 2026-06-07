from __future__ import annotations

from dataclasses import dataclass
import copy
import hashlib
import importlib.util
from datetime import datetime
from pathlib import Path
from time import perf_counter
from collections import OrderedDict
from typing import Any

import numpy as np


@dataclass(slots=True)
class ASRRuntimeProfile:
    model_name: str
    performance_mode: bool = False
    device: str = "cuda"
    compute_type: str = "float16"
    language: str = "id"
    task: str = "transcribe"
    temperature: int = 0
    beam_size: int = 1
    best_of: int = 1
    condition_on_previous_text: bool = False
    vad_filter: bool = False
    word_timestamps: bool = False
    initial_prompt: str = ""


@dataclass(slots=True)
class ASRLoadResult:
    requested_model: str
    selected_model: str
    loaded: bool
    fallback_used: bool
    dependency_status: str
    message: str
    model: Any | None = None


@dataclass(slots=True)
class ASRSegmentText:
    text: str
    start_time_ms: int
    end_time_ms: int
    average_log_probability: float = 0.0
    no_speech_probability: float = 0.0
    compression_ratio: float = 0.0


@dataclass(slots=True)
class ASRTranscriptionResult:
    status: str
    text: str
    language: str
    model_name: str
    latency_ms: int
    segments: list[ASRSegmentText]
    message: str
    queue_wait_ms: int = 0
    audio_prepare_ms: int = 0
    input_audio_duration_ms: int = 0
    model_inference_ms: int = 0
    decode_finalize_ms: int = 0
    asr_total_ms: int = 0
    asr_queue_wait_ms: int = 0
    asr_audio_prepare_ms: int = 0
    asr_input_audio_duration_ms: int = 0
    asr_model_inference_ms: int = 0
    asr_decode_finalize_ms: int = 0
    model_loaded_before_segment: bool = True
    warmup_segment: bool = False
    cuda_active: bool = False
    asr_device: str = "cuda"
    asr_compute_type: str = "float16"
    word_timestamps_enabled: bool = False
    vad_filter_inside_asr_enabled: bool = False
    beam_size: int = 3
    condition_on_previous_text: bool = False
    best_of: int = 1
    task: str = "transcribe"
    language_probability: float = 0.0
    initial_prompt: str = ""


class ASRModelLoader:
    """Faster-Whisper model selection and load-status wrapper."""

    def __init__(
        self,
        primary_model: str = "large-v3-turbo",
        backup_model: str = "medium",
        *,
        device: str = "cuda",
        compute_type: str = "float16",
        language: str = "id",
        task: str = "transcribe",
        temperature: int = 0,
        beam_size: int = 1,
        condition_on_previous_text: bool = False,
        vad_filter: bool = False,
        word_timestamps: bool = False,
        model_root: Path | None = None,
        initial_prompt: str = "",
    ) -> None:
        self.primary_model = primary_model
        self.backup_model = backup_model
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self.task = task
        self.temperature = temperature
        self.beam_size = beam_size
        self.condition_on_previous_text = condition_on_previous_text
        self.vad_filter = vad_filter
        self.word_timestamps = word_timestamps
        self.model_root = model_root
        self.initial_prompt = initial_prompt or self._build_default_initial_prompt(language=language)
        self._loaded_result: ASRLoadResult | None = None
        self._loaded_key: tuple[str, str, str] | None = None
        self._loaded_request_key: tuple[str, str, str] | None = None
        self._warmup_cache_key: tuple[object, ...] | None = None
        self._warmup_cached_result: dict[str, Any] | None = None
        self._transcription_cache: "OrderedDict[tuple[str, str, str, str, int, bool, bool, bool, int, str], ASRTranscriptionResult]" = OrderedDict()
        self._transcription_cache_limit = 24
        self.last_loaded_at_iso: str = ""
        self.last_load_ms: int = 0
        self.last_warmup_at_iso: str = ""
        self.last_warmup_ms: int = 0
        self.model_reload_count: int = 0
        self.warmup_count: int = 0

    @staticmethod
    def _clone_transcription_result(result: ASRTranscriptionResult) -> ASRTranscriptionResult:
        cloned = copy.copy(result)
        cloned.segments = list(result.segments)
        return cloned

    @staticmethod
    def _build_default_initial_prompt(*, language: str = "id") -> str:
        del language
        return (
            "Live bilingual speech in Indonesian and English. "
            "Indonesian is the primary spoken language. "
            "Transcribe exactly what was spoken, not a paraphrase or translation. "
            "Preserve short Indonesian phrases, filler words, names of people and places. "
            "Keep natural code-switching, numbers, and simple conversational words. "
            "For very short Indonesian utterances, preserve the exact Indonesian words and do not rewrite them in English. "
            "Example: spoken 'halo coba berbicara' should be transcribed as 'halo coba berbicara'; spoken 'lagi' should be transcribed as 'lagi'; spoken 'terima kasih' should be transcribed as 'terima kasih'; spoken 'silakan' should be transcribed as 'silakan'. "
            "Common Indonesian phrases such as 'halo coba berbicara', 'coba bicara', 'lagi', 'terima kasih', and 'silakan' should stay Indonesian when spoken in Indonesian. "
            "Do not invent random words, extra context, or an English rewrite of Indonesian speech."
        )

    @staticmethod
    def _coerce_audio_array(audio_samples: Any) -> np.ndarray:
        audio_array = np.asarray(audio_samples, dtype=np.float32)
        if audio_array.ndim != 1:
            audio_array = audio_array.reshape(-1)
        if not audio_array.flags.c_contiguous:
            audio_array = np.ascontiguousarray(audio_array, dtype=np.float32)
        return audio_array

    @staticmethod
    def _audio_cache_key(audio_array: np.ndarray, profile: ASRRuntimeProfile) -> tuple[str, str, str, str, int, bool, bool, bool, int, str]:
        digest = hashlib.sha256(audio_array.view(np.uint8)).hexdigest()
        prompt_digest = hashlib.sha256(profile.initial_prompt.encode("utf-8")).hexdigest()
        return (
            digest,
            profile.model_name,
            profile.device,
            profile.compute_type,
            int(audio_array.size),
            bool(profile.vad_filter),
            bool(profile.word_timestamps),
            bool(profile.condition_on_previous_text),
            int(profile.best_of),
            prompt_digest,
        )

    @staticmethod
    def _warmup_profile_key(profile: ASRRuntimeProfile) -> tuple[object, ...]:
        prompt_digest = hashlib.sha256(profile.initial_prompt.encode("utf-8")).hexdigest()
        return (
            profile.model_name,
            profile.device,
            profile.compute_type,
            profile.language,
            profile.task,
            int(profile.temperature),
            int(profile.beam_size),
            int(profile.best_of),
            bool(profile.condition_on_previous_text),
            bool(profile.vad_filter),
            bool(profile.word_timestamps),
            prompt_digest,
        )

    @classmethod
    def from_config(cls, config: Any) -> "ASRModelLoader":
        return cls(
            primary_model=config.primary_asr_model,
            backup_model=config.backup_asr_model,
            device=config.device,
            compute_type=config.compute_type,
            language=config.source_language,
            task=config.asr_task,
            temperature=config.temperature,
            beam_size=config.beam_size,
            condition_on_previous_text=config.condition_on_previous_text,
            vad_filter=config.vad_filter,
            word_timestamps=config.word_timestamps,
            model_root=config.asr_model_dir,
            initial_prompt=getattr(config, "asr_initial_prompt", "") or "",
        )

    def default_profile(self) -> ASRRuntimeProfile:
        return ASRRuntimeProfile(
            model_name=self.primary_model,
            device=self.device,
            compute_type=self.compute_type,
            language=self.language,
            task=self.task,
            temperature=self.temperature,
            beam_size=self.beam_size,
            best_of=1,
            condition_on_previous_text=self.condition_on_previous_text,
            vad_filter=self.vad_filter,
            word_timestamps=self.word_timestamps,
            initial_prompt=self.initial_prompt,
        )

    def backup_profile(self) -> ASRRuntimeProfile:
        profile = self.default_profile()
        profile.model_name = self.backup_model
        profile.performance_mode = True
        return profile

    def realtime_profile(self) -> ASRRuntimeProfile:
        """Return the default realtime profile for live capture and warmup."""
        return self.default_profile()

    def dependency_status(self) -> str:
        if importlib.util.find_spec("faster_whisper") is None:
            return "missing:faster_whisper"
        return "available"

    def local_model_path(self, model_name: str) -> Path | None:
        if self.model_root is None:
            return None
        local_names = {
            "large-v3-turbo": "faster-whisper-large-v3-turbo",
            "medium": "faster-whisper-medium",
        }
        local_path = self.model_root / local_names.get(model_name, model_name)
        if (local_path / "model.bin").exists():
            return local_path
        return None

    def model_reference(self, model_name: str) -> str:
        local_path = self.local_model_path(model_name)
        if local_path is not None:
            return str(local_path)
        return model_name

    def select_model_name(
        self,
        *,
        load_failed: bool = False,
        cuda_oom: bool = False,
        gpu_unavailable: bool = False,
        latency_pressure: bool = False,
        performance_mode: bool = False,
    ) -> str:
        if load_failed or cuda_oom or gpu_unavailable or latency_pressure or performance_mode:
            return self.backup_model
        return self.primary_model

    def _cuda_available(self) -> bool:
        try:  # pragma: no cover - optional dependency inspection
            import torch

            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def load_model(self, profile: ASRRuntimeProfile | None = None) -> ASRLoadResult:
        selected_profile = copy.copy(profile or self.default_profile())
        requested_key = (selected_profile.model_name, selected_profile.device, selected_profile.compute_type)
        if self._loaded_result and self._loaded_result.loaded and self._loaded_request_key == requested_key:
            return self._loaded_result
        selected_started = perf_counter()
        dependency_status = self.dependency_status()
        if dependency_status != "available":
            return ASRLoadResult(
                requested_model=selected_profile.model_name,
                selected_model=self.select_model_name(load_failed=True),
                loaded=False,
                fallback_used=True,
                dependency_status=dependency_status,
                message="faster_whisper is not installed in this environment.",
            )
        if selected_profile.device == "cuda" and not self._cuda_available():
            return ASRLoadResult(
                requested_model=selected_profile.model_name,
                selected_model=selected_profile.model_name,
                loaded=False,
                fallback_used=False,
                dependency_status=dependency_status,
                message=(
                    "CUDA was requested for Real ASR, but PyTorch CUDA is not available. "
                    "Real ASR is blocked until CUDA_CORE_PASS or explicit CPU Degraded Mode."
                ),
            )
        candidate_names = [selected_profile.model_name]
        fallback_name = self.select_model_name(load_failed=True)
        if fallback_name not in candidate_names:
            candidate_names.append(fallback_name)
        last_error: Exception | None = None
        try:  # pragma: no cover - depends on optional runtime
            from faster_whisper import WhisperModel
        except Exception as exc:  # pragma: no cover - optional runtime behavior
            return ASRLoadResult(
                requested_model=selected_profile.model_name,
                selected_model=fallback_name,
                loaded=False,
                fallback_used=len(candidate_names) > 1,
                dependency_status=dependency_status,
                message=f"faster_whisper import failed: {exc}",
            )
        for candidate_name in candidate_names:
            candidate_device = selected_profile.device
            candidate_compute_type = selected_profile.compute_type
            if candidate_name == self.backup_model and candidate_device == "cuda" and not self._cuda_available():
                candidate_device = "cpu"
                candidate_compute_type = "float32"
            model_reference = self.model_reference(candidate_name)
            try:  # pragma: no cover - depends on optional runtime
                model = WhisperModel(
                    model_reference,
                    device=candidate_device,
                    compute_type=candidate_compute_type,
                )
                self._loaded_result = ASRLoadResult(
                    requested_model=selected_profile.model_name,
                    selected_model=candidate_name,
                    loaded=True,
                    fallback_used=candidate_name != selected_profile.model_name or candidate_device != selected_profile.device,
                    dependency_status=dependency_status,
                    message=(
                        "ASR model loaded successfully."
                        if candidate_name == selected_profile.model_name
                        else (
                            "Primary ASR model failed to load; backup model loaded successfully."
                            if candidate_device == selected_profile.device
                            else "Primary ASR model failed to load; backup model loaded on CPU successfully."
                        )
                    ),
                    model=model,
                )
                self._loaded_key = (candidate_name, candidate_device, candidate_compute_type)
                self._loaded_request_key = requested_key
                self.last_loaded_at_iso = datetime.now().astimezone().isoformat(timespec="milliseconds")
                self.last_load_ms = int((perf_counter() - selected_started) * 1000)
                self.model_reload_count += 1
                return self._loaded_result
            except Exception as exc:  # pragma: no cover - optional runtime behavior
                last_error = exc
        fallback_used = len(candidate_names) > 1
        message = f"ASR model load failed: {last_error}" if last_error is not None else "ASR model load failed."
        return ASRLoadResult(
            requested_model=selected_profile.model_name,
            selected_model=fallback_name,
            loaded=False,
            fallback_used=fallback_used,
            dependency_status=dependency_status,
            message=message,
        )

    def transcribe_audio(self, audio_samples: Any, profile: ASRRuntimeProfile | None = None) -> ASRTranscriptionResult:
        selected_profile = copy.copy(profile or self.default_profile())
        started = perf_counter()
        audio_array = self._coerce_audio_array(audio_samples)
        input_audio_duration_ms = int((audio_array.size / 16000.0) * 1000.0) if audio_array.size else 0
        cache_key = self._audio_cache_key(audio_array, selected_profile)
        cached_result = self._transcription_cache.get(cache_key)
        if cached_result is not None:
            cache_hit = self._clone_transcription_result(cached_result)
            cache_hit.latency_ms = int((perf_counter() - started) * 1000)
            cache_hit.asr_total_ms = cache_hit.latency_ms
            cache_hit.asr_queue_wait_ms = 0
            cache_hit.asr_audio_prepare_ms = 0
            cache_hit.asr_model_inference_ms = 0
            cache_hit.asr_decode_finalize_ms = 0
            cache_hit.message = "ASR transcription completed (cached)."
            cache_hit.model_loaded_before_segment = True
            cache_hit.warmup_segment = False
            cache_hit.input_audio_duration_ms = input_audio_duration_ms
            cache_hit.asr_input_audio_duration_ms = input_audio_duration_ms
            cache_hit.asr_device = selected_profile.device
            cache_hit.asr_compute_type = selected_profile.compute_type
            cache_hit.word_timestamps_enabled = selected_profile.word_timestamps
            cache_hit.vad_filter_inside_asr_enabled = selected_profile.vad_filter
            cache_hit.beam_size = selected_profile.beam_size
            cache_hit.condition_on_previous_text = selected_profile.condition_on_previous_text
            cache_hit.best_of = selected_profile.best_of
            cache_hit.task = selected_profile.task
            cache_hit.language_probability = float(getattr(cached_result, "language_probability", 0.0) or 0.0)
            return cache_hit
        load_result = self.load_model(selected_profile)
        if not load_result.loaded or load_result.model is None:
            return ASRTranscriptionResult(
                status="DependencyMissing" if load_result.dependency_status != "available" else "LoadFailed",
                text="",
                language=selected_profile.language,
                model_name=load_result.selected_model,
                latency_ms=int((perf_counter() - started) * 1000),
                segments=[],
                message=load_result.message,
                queue_wait_ms=0,
                audio_prepare_ms=0,
                input_audio_duration_ms=input_audio_duration_ms,
                model_inference_ms=0,
                decode_finalize_ms=0,
                model_loaded_before_segment=False,
                warmup_segment=False,
                cuda_active=selected_profile.device == "cuda",
                asr_device=selected_profile.device,
                asr_compute_type=selected_profile.compute_type,
                word_timestamps_enabled=selected_profile.word_timestamps,
                vad_filter_inside_asr_enabled=selected_profile.vad_filter,
                beam_size=selected_profile.beam_size,
                condition_on_previous_text=selected_profile.condition_on_previous_text,
                best_of=selected_profile.best_of,
                task=selected_profile.task,
                language_probability=0.0,
                initial_prompt=selected_profile.initial_prompt,
            )
        try:  # pragma: no cover - requires faster_whisper runtime and model files
            transcribe_started = perf_counter()
            segments_generator, info = load_result.model.transcribe(
                audio_array,
                language=selected_profile.language,
                task=selected_profile.task,
                temperature=selected_profile.temperature,
                beam_size=selected_profile.beam_size,
                best_of=selected_profile.best_of,
                condition_on_previous_text=selected_profile.condition_on_previous_text,
                vad_filter=selected_profile.vad_filter,
                word_timestamps=selected_profile.word_timestamps,
                without_timestamps=not selected_profile.word_timestamps,
                initial_prompt=selected_profile.initial_prompt or None,
            )
            transcribe_ms = int((perf_counter() - transcribe_started) * 1000)
            text_finalize_started = perf_counter()
            segments: list[ASRSegmentText] = []
            build_segments = bool(selected_profile.word_timestamps)
            final_text = str(getattr(info, "text", "") or "").strip()
            if not final_text or build_segments:
                text_parts: list[str] = []
                segments_append = segments.append
                text_parts_append = text_parts.append
                for raw_segment in segments_generator:
                    text = str(getattr(raw_segment, "text", "")).strip()
                    if text:
                        text_parts_append(text)
                    if build_segments:
                        segments_append(
                            ASRSegmentText(
                                text=text,
                                start_time_ms=int(float(getattr(raw_segment, "start", 0.0)) * 1000),
                                end_time_ms=int(float(getattr(raw_segment, "end", 0.0)) * 1000),
                                average_log_probability=float(getattr(raw_segment, "avg_logprob", 0.0) or 0.0),
                                no_speech_probability=float(getattr(raw_segment, "no_speech_prob", 0.0) or 0.0),
                                compression_ratio=float(getattr(raw_segment, "compression_ratio", 0.0) or 0.0),
                            )
                        )
                final_text = " ".join(text_parts).strip()
            text_finalize_ms = int((perf_counter() - text_finalize_started) * 1000)
            total_ms = int((perf_counter() - started) * 1000)
            queue_wait_ms = 0
            audio_prepare_ms = 0
            result = ASRTranscriptionResult(
                status="Completed",
                text=final_text,
                language=str(getattr(info, "language", selected_profile.language)),
                language_probability=float(getattr(info, "language_probability", 0.0) or 0.0),
                model_name=load_result.selected_model,
                latency_ms=total_ms,
                segments=segments,
                message="ASR transcription completed.",
                queue_wait_ms=queue_wait_ms,
                audio_prepare_ms=audio_prepare_ms,
                input_audio_duration_ms=input_audio_duration_ms,
                model_inference_ms=transcribe_ms,
                decode_finalize_ms=text_finalize_ms,
                asr_total_ms=total_ms,
                asr_queue_wait_ms=queue_wait_ms,
                asr_audio_prepare_ms=audio_prepare_ms,
                asr_input_audio_duration_ms=input_audio_duration_ms,
                asr_model_inference_ms=transcribe_ms,
                asr_decode_finalize_ms=text_finalize_ms,
                model_loaded_before_segment=True,
                warmup_segment=False,
                cuda_active=selected_profile.device == "cuda",
                asr_device=selected_profile.device,
                asr_compute_type=selected_profile.compute_type,
                word_timestamps_enabled=selected_profile.word_timestamps,
                vad_filter_inside_asr_enabled=selected_profile.vad_filter,
                beam_size=selected_profile.beam_size,
                condition_on_previous_text=selected_profile.condition_on_previous_text,
                best_of=selected_profile.best_of,
                task=selected_profile.task,
                initial_prompt=selected_profile.initial_prompt,
            )
            self._transcription_cache[cache_key] = self._clone_transcription_result(result)
            while len(self._transcription_cache) > self._transcription_cache_limit:
                self._transcription_cache.popitem(last=False)
            return result
        except Exception as exc:
            return ASRTranscriptionResult(
                status="TranscriptionFailed",
                text="",
                language=selected_profile.language,
                model_name=load_result.selected_model,
                latency_ms=int((perf_counter() - started) * 1000),
                segments=[],
                message=f"ASR transcription failed: {exc}",
                queue_wait_ms=0,
                audio_prepare_ms=0,
                input_audio_duration_ms=input_audio_duration_ms,
                model_inference_ms=0,
                decode_finalize_ms=0,
                asr_total_ms=int((perf_counter() - started) * 1000),
                model_loaded_before_segment=load_result.loaded,
                warmup_segment=False,
                cuda_active=selected_profile.device == "cuda",
                asr_device=selected_profile.device,
                asr_compute_type=selected_profile.compute_type,
                word_timestamps_enabled=selected_profile.word_timestamps,
                vad_filter_inside_asr_enabled=selected_profile.vad_filter,
                beam_size=selected_profile.beam_size,
                condition_on_previous_text=selected_profile.condition_on_previous_text,
                best_of=selected_profile.best_of,
                task=selected_profile.task,
                language_probability=0.0,
                initial_prompt=selected_profile.initial_prompt,
            )

    def warmup_model(self, profile: ASRRuntimeProfile | None = None, *, reuse_if_ready: bool = True) -> dict[str, Any]:
        selected_profile = copy.copy(profile or self.default_profile())
        requested_key = self._warmup_profile_key(selected_profile)
        started = perf_counter()
        load_result = self.load_model(selected_profile)
        if not load_result.loaded or load_result.model is None:
            return {
                "loaded": False,
                "model_name": load_result.selected_model,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": load_result.message,
            }
        if reuse_if_ready and self._warmup_cache_key == requested_key and self._warmup_cached_result is not None:
            cached_result = copy.deepcopy(self._warmup_cached_result)
            cached_result["latency_ms"] = int((perf_counter() - started) * 1000)
            cached_result["message"] = "ASR warmup already satisfied; resident model reused."
            cached_result["reused"] = True
            self.last_warmup_at_iso = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self.last_warmup_ms = int((perf_counter() - started) * 1000)
            return cached_result
        warmup_audio = np.zeros(16000, dtype=np.float32)
        try:  # pragma: no cover - depends on optional runtime and local model files
            warmup_segments, _info = load_result.model.transcribe(
                warmup_audio,
                language=selected_profile.language,
                task=selected_profile.task,
                temperature=selected_profile.temperature,
                beam_size=selected_profile.beam_size,
                best_of=selected_profile.best_of,
                condition_on_previous_text=False,
                vad_filter=False,
                word_timestamps=False,
                without_timestamps=True,
                initial_prompt=selected_profile.initial_prompt or None,
            )
            for _ in warmup_segments:
                pass
            self.last_warmup_at_iso = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self.last_warmup_ms = int((perf_counter() - started) * 1000)
            self.warmup_count += 1
            result = {
                "loaded": True,
                "model_name": load_result.selected_model,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "ASR warmup completed.",
                "reused": False,
            }
            self._warmup_cache_key = requested_key
            self._warmup_cached_result = copy.deepcopy(result)
            return result
        except Exception as exc:
            self.last_warmup_at_iso = datetime.now().astimezone().isoformat(timespec="milliseconds")
            self.last_warmup_ms = int((perf_counter() - started) * 1000)
            return {
                "loaded": True,
                "model_name": load_result.selected_model,
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": f"ASR warmup failed: {exc}",
                "reused": False,
            }
