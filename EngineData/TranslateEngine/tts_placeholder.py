from __future__ import annotations

import base64
import copy
import hashlib
from dataclasses import dataclass
from datetime import datetime
import tempfile
from pathlib import Path
import shutil
import subprocess
import sys
from time import perf_counter
import os
from collections import OrderedDict
import queue
import threading
import wave

try:  # pragma: no cover - optional runtime dependency
    import numpy as np
except Exception:  # pragma: no cover
    np = None

try:  # pragma: no cover - optional runtime dependency
    import sounddevice as sd
except Exception:  # pragma: no cover
    sd = None

from EngineData.LauncherApp.app_config import PROJECT_ROOT
from EngineData.LauncherApp.app_logger import append_runtime_pipeline_log
from EngineData.TranslateEngine.voice_provider_selection import (
    VoiceActorProfile,
    VoiceProviderSelector,
    resolve_voice_actor_profile,
)


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


@dataclass(slots=True)
class TTSRequest:
    segment_id: str
    text: str
    language: str = "en"
    output_path: str | None = None
    trace_id: str = ""
    voice_profile_id: str = ""
    voice_profiles_root: str = ""
    force_provider_retest: bool = False


@dataclass(slots=True)
class TTSResult:
    segment_id: str
    status: str
    mode: str
    trace_id: str = ""
    audio_path: str | None = None
    latency_ms: int = 0
    notes: str = ""
    queue_wait_ms: int = 0
    text_prep_ms: int = 0
    voice_generate_ms: int = 0
    audio_cache_ms: int = 0
    playback_prepare_ms: int = 0
    playback_start_ms: int = 0
    total_ms: int = 0
    engine_name: str = ""
    available: bool = False
    cached: bool = False
    cache_hit: bool = False
    target_audio_path: str = ""
    output_device_name: str = ""
    tts_error: str = ""
    backend_name: str = "legacy_sapi_wav"
    backend_selected: str = "legacy_sapi_wav"
    backend_fallback_reason: str = ""
    supports_streaming: bool = False
    supports_direct_playback: bool = False
    direct_playback: bool = False
    tts_request_start_ms: int = 0
    tts_first_chunk_ready_ms: int = 0
    tts_direct_speak_called_ms: int = 0
    voice_start_proxy_ms: int = 0
    voice_completed_ms: int = 0
    process_start_overhead_ms: int = 0
    voice_start_proxy_time: str = ""
    voice_completed_time: str = ""
    provider_used: str = ""
    provider_benchmark_ms: int = 0
    provider_selection_reason: str = ""
    provider_voice_profile_id: str = ""
    provider_model_version: str = ""


class TTSPlaceholder:
    """Explicit, local-only translated voice output helper.

    TTS is not run automatically. The UI calls this only when the user presses
    the per-card Speak OUT button.
    """

    enabled_by_default: bool = False

    def __init__(
        self,
        *,
        custom_voice_profile_id: str = "",
        custom_voice_profiles_root: Path | str | None = None,
    ) -> None:
        env_profile_id = os.environ.get("TRANSLATEIT_VOICE_ACTOR_PROFILE_ID", "").strip()
        env_profiles_root = os.environ.get("TRANSLATEIT_VOICE_ACTOR_PROFILES_ROOT", "").strip()
        self._custom_voice_profile_id = (custom_voice_profile_id or env_profile_id).strip()
        if custom_voice_profiles_root is not None:
            self._custom_voice_profiles_root = Path(custom_voice_profiles_root).expanduser()
        elif env_profiles_root:
            self._custom_voice_profiles_root = Path(env_profiles_root)
        else:
            self._custom_voice_profiles_root = None
        env_backend = os.environ.get("TRANSLATEIT_TTS_BACKEND", "legacy_sapi_wav").strip() or "legacy_sapi_wav"
        custom_voice_enabled = bool(self._custom_voice_profile_id and self._custom_voice_profiles_root is not None)
        if custom_voice_enabled:
            self.backend_name = "voice_actor_onnx"
        elif env_backend in {"legacy_sapi_wav", "sapi_direct_async", "experimental_streaming"}:
            self.backend_name = env_backend
        else:
            self.backend_name = "legacy_sapi_wav"
        self._warmup_done = False
        self._tts_cache: "OrderedDict[str, Path]" = OrderedDict()
        self._tts_cache_limit = 64
        self._voice_provider_selector = VoiceProviderSelector(PROJECT_ROOT / "UserData" / "CacheData" / "voice_provider_selection.json")
        self._voice_provider_cache: dict[tuple[str, str, str], VoiceActorProfile] = {}
        self._ps_process: subprocess.Popen[str] | None = None
        self._ps_worker_lock = threading.Lock()
        self._ps_stdout_thread: threading.Thread | None = None
        self._ps_pending: dict[str, tuple[threading.Event, threading.Event, dict[str, str]]] = {}
        self._ps_pending_lock = threading.Lock()
        self._ps_request_counter = 0
        self._ps_worker_ready = False
        self._ps_worker_boot_ms = 0
        self._direct_worker_boot_ms = 0
        self._direct_speech_lock = threading.Lock()
        self._direct_speech_active = False
        self._direct_speech_request_id: str | None = None
        self._direct_speech_done_event: threading.Event | None = None
        self._direct_request_lock = threading.Lock()
        self._warmup_lock = threading.Lock()
        self._warmup_event = threading.Event()
        self._warmup_in_progress = False
        self._warmup_cached_success: dict[str, object] | None = None
        self._warmup_last_result: dict[str, object] | None = None
        self._custom_voice_lock = threading.Lock()
        self._custom_voice_state_lock = threading.Lock()
        self._custom_voice_active = False
        self._custom_voice_cancel_event = threading.Event()

    def begin_background_warmup(self) -> bool:
        backend = self._resolve_backend()
        if backend != "voice_actor_onnx":
            return False
        with self._warmup_lock:
            if self._warmup_cached_success is not None or self._warmup_in_progress:
                return False
            self._warmup_in_progress = True
            self._warmup_event.clear()

            def worker() -> None:
                try:
                    self._run_warmup_once()
                except Exception:
                    pass

            threading.Thread(target=worker, name="TranslateIT-CustomVoiceWarmup", daemon=True).start()
            return True

    def _resolve_backend(self) -> str:
        value = self.backend_name.lower()
        if value in {"legacy_sapi_wav", "legacy", "wav"}:
            return "legacy_sapi_wav"
        if value in {"sapi_direct_async", "sapi_async", "sapi_direct"}:
            return "sapi_direct_async"
        if value in {"voice_actor_onnx", "voice_actor", "custom_voice_onnx", "onnx_voice"}:
            return "voice_actor_onnx"
        if value in {"experimental_streaming", "streaming"}:
            return "experimental_streaming"
        return "legacy_sapi_wav"

    def _trace(self, trace_id: str, event: str, *, stage: str = "", status: str = "", details: object | None = None) -> None:
        try:
            append_runtime_pipeline_log(
                trace_id or "unavailable",
                event,
                stage=stage,
                status=status,
                details=details,
            )
        except Exception:
            pass

    def _drain_pending_direct_requests(self, reason: str) -> None:
        with self._ps_pending_lock:
            pending_items = list(self._ps_pending.items())
            self._ps_pending.clear()
        for request_id, (start_event, done_event, result_box) in pending_items:
            result_box["voice_completed_time"] = _now_iso()
            result_box["line"] = f"ERR|{request_id}|{reason}"
            try:
                start_event.set()
            except Exception:
                pass
            try:
                done_event.set()
            except Exception:
                pass

    def _backend_meta(self, backend_name: str, *, fallback_reason: str = "") -> dict[str, object]:
        return {
            "backend_name": backend_name,
            "backend_selected": backend_name,
            "backend_fallback_reason": fallback_reason,
            "supports_streaming": backend_name == "experimental_streaming",
            "supports_direct_playback": backend_name == "sapi_direct_async",
        }

    @staticmethod
    def _default_voice_provider_meta() -> dict[str, object]:
        return {
            "provider_used": "default_voice",
            "provider_benchmark_ms": 0,
            "provider_selection_reason": "default_voice_fallback",
            "provider_voice_profile_id": "",
            "provider_model_version": "",
        }

    def _resolve_custom_voice_profile(self, request: TTSRequest) -> VoiceActorProfile | None:
        voice_profile_id = str(request.voice_profile_id or self._custom_voice_profile_id or "").strip()
        if not voice_profile_id:
            return None
        voice_profiles_root = Path(request.voice_profiles_root).expanduser() if request.voice_profiles_root else self._custom_voice_profiles_root
        if voice_profiles_root is None:
            return None
        explicit_model_path = None
        explicit_config_path = None
        return resolve_voice_actor_profile(
            voice_profiles_root=voice_profiles_root,
            voice_profile_id=voice_profile_id,
            explicit_model_path=explicit_model_path,
            explicit_config_path=explicit_config_path,
        )

    def _play_custom_voice_stream(
        self,
        *,
        renderer,
        normalized_text: str,
        output_path: Path,
        render_profile: str,
        request_trace_id: str,
        provider_used: str,
        provider_selection_reason: str,
        provider_benchmark_ms: int,
        provider_voice_profile_id: str,
        provider_model_version: str,
        started: float,
        text_prep_ms: int,
        request_start_ms: int,
        segment_id: str,
    ) -> TTSResult:
        if np is None or sd is None:
            raise RuntimeError("Custom voice direct playback requires numpy and sounddevice")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with self._custom_voice_state_lock:
            self._custom_voice_active = True
            self._custom_voice_cancel_event.clear()
        cancel_event = self._custom_voice_cancel_event
        playback_started_event = threading.Event()
        playback_done_event = threading.Event()
        first_chunk_ready_event = threading.Event()
        prebuffer_ready_event = threading.Event()
        error_box: list[BaseException] = []
        captured_frames: list[bytes] = []
        buffered_bytes = 0
        buffered_bytes_lock = threading.Lock()
        prebuffer_target_bytes = 0
        raw_output_stream = getattr(sd, "RawOutputStream", None)
        state: dict[str, object] = {
            "sample_rate": 0,
            "channels": 1,
            "sample_width": 2,
            "started_perf": None,
            "completed_perf": None,
            "first_chunk_perf": None,
            "started": False,
            "closed": False,
        }
        chunk_queue: "queue.Queue[object | None]" = queue.Queue(maxsize=8)
        canceled_box: dict[str, bool] = {"value": False}

        def _cancelled_result(reason: str = "Custom voice playback cancelled.") -> TTSResult:
            return TTSResult(
                segment_id=segment_id,
                status="Cancelled",
                mode="voice_actor_onnx",
                trace_id=request_trace_id,
                audio_path=str(output_path),
                latency_ms=0,
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                voice_generate_ms=0,
                audio_cache_ms=0,
                playback_prepare_ms=0,
                playback_start_ms=0,
                total_ms=int((perf_counter() - started) * 1000),
                engine_name="voice_actor_onnx",
                available=True,
                cached=False,
                cache_hit=False,
                target_audio_path=str(output_path),
                output_device_name="Windows default output",
                tts_error="",
                backend_name="voice_actor_onnx",
                backend_selected="voice_actor_onnx",
                backend_fallback_reason="",
                supports_streaming=True,
                supports_direct_playback=True,
                direct_playback=True,
                tts_request_start_ms=request_start_ms,
                tts_direct_speak_called_ms=0,
                voice_start_proxy_ms=0,
                voice_completed_ms=0,
                process_start_overhead_ms=0,
                voice_start_proxy_time="",
                voice_completed_time="",
                provider_used=provider_used,
                provider_benchmark_ms=provider_benchmark_ms,
                provider_selection_reason=provider_selection_reason,
                provider_voice_profile_id=provider_voice_profile_id,
                provider_model_version=provider_model_version,
                notes=reason,
            )

        def _producer() -> None:
            nonlocal buffered_bytes, prebuffer_target_bytes
            try:
                if cancel_event.is_set():
                    canceled_box["value"] = True
                    return
                for index, chunk in enumerate(renderer._voice.synthesize(normalized_text, syn_config=renderer._resolve_syn_config(render_profile))):
                    if cancel_event.is_set():
                        canceled_box["value"] = True
                        break
                    sample_rate = int(getattr(chunk, "sample_rate", 22050) or 22050)
                    sample_channels = int(getattr(chunk, "sample_channels", 1) or 1)
                    sample_width = int(getattr(chunk, "sample_width", 2) or 2)
                    if index == 0:
                        state["sample_rate"] = sample_rate
                        state["channels"] = sample_channels
                        state["sample_width"] = sample_width
                        prebuffer_target_bytes = max(1, int(sample_rate * sample_channels * sample_width * 0.12))
                        state["first_chunk_perf"] = perf_counter()
                        first_chunk_ready_event.set()
                    frame_bytes = bytes(getattr(chunk, "audio_int16_bytes", b""))
                    if frame_bytes:
                        captured_frames.append(frame_bytes)
                        with buffered_bytes_lock:
                            buffered_bytes += len(frame_bytes)
                            if not prebuffer_ready_event.is_set() and buffered_bytes >= prebuffer_target_bytes:
                                prebuffer_ready_event.set()
                    chunk_queue.put(frame_bytes, timeout=5)
                prebuffer_ready_event.set()
                if not cancel_event.is_set():
                    chunk_queue.put(None, timeout=5)
            except Exception as exc:
                error_box.append(exc)
                first_chunk_ready_event.set()
                prebuffer_ready_event.set()
                try:
                    chunk_queue.put(None, timeout=1)
                except Exception:
                    pass
            finally:
                playback_done_event.set()
                state["closed"] = True

        def _writer() -> None:
            try:
                if cancel_event.is_set():
                    return
                if not playback_done_event.wait(timeout=30):
                    return
                if cancel_event.is_set():
                    return
                if error_box:
                    return
                sample_rate = int(state["sample_rate"] or 0)
                channels = int(state["channels"] or 1)
                sample_width = int(state["sample_width"] or 2)
                if sample_rate <= 0 or channels <= 0 or sample_width <= 0:
                    return
                if not captured_frames:
                    return
                with wave.open(str(output_path), "wb") as wav_file:
                    wav_file.setnchannels(channels)
                    wav_file.setsampwidth(sample_width)
                    wav_file.setframerate(sample_rate)
                    for frame in captured_frames:
                        if frame:
                            wav_file.writeframes(frame)
            except Exception as exc:
                error_box.append(exc)

        def _playback() -> None:
            try:
                if cancel_event.is_set():
                    canceled_box["value"] = True
                    playback_started_event.set()
                    return
                if not first_chunk_ready_event.wait(timeout=8):
                    raise RuntimeError("Custom voice actor did not produce initial audio in time")
                if cancel_event.is_set():
                    canceled_box["value"] = True
                    playback_started_event.set()
                    return
                if error_box:
                    raise error_box[0]
                sample_rate = int(state["sample_rate"] or 0)
                channels = int(state["channels"] or 1)
                sample_width = int(state["sample_width"] or 2)
                if sample_rate <= 0:
                    raise RuntimeError("Custom voice actor did not provide a sample rate")
                if channels <= 0:
                    channels = 1
                if sample_width <= 0:
                    sample_width = 2
                prebuffer_ready_event.wait(timeout=0.1)

                first_frame_box: list[bool] = [False]
                ended_event = threading.Event()
                pending_bytes = bytearray()

                if raw_output_stream is not None:
                    stream = raw_output_stream(
                        samplerate=sample_rate,
                        channels=channels,
                        dtype="int16",
                        blocksize=0,
                        latency="low",
                    )
                else:
                    stream = sd.OutputStream(
                        samplerate=sample_rate,
                        channels=channels,
                        dtype="float32",
                        blocksize=0,
                        latency="low",
                    )
                with stream:
                    while True:
                        if cancel_event.is_set():
                            canceled_box["value"] = True
                            break
                        if error_box:
                            raise error_box[0]
                        try:
                            item = chunk_queue.get(timeout=0.1)
                        except queue.Empty:
                            if cancel_event.is_set():
                                canceled_box["value"] = True
                                break
                            if playback_done_event.is_set():
                                break
                            continue
                        if item is None:
                            if playback_done_event.is_set() and chunk_queue.empty():
                                break
                            continue
                        frame_bytes = bytes(item)
                        if not frame_bytes:
                            continue
                        if not first_frame_box[0]:
                            first_frame_box[0] = True
                            state["started_perf"] = perf_counter()
                            playback_started_event.set()
                        if raw_output_stream is not None:
                            stream.write(frame_bytes)
                        else:
                            sample = np.frombuffer(frame_bytes, dtype=np.int16).astype(np.float32) / 32767.0
                            if channels > 1:
                                sample = sample.reshape(-1, channels)
                            stream.write(sample)
                    ended_event.set()
                state["completed_perf"] = perf_counter()
            except Exception as exc:
                error_box.append(exc)
                playback_started_event.set()
                playback_done_event.set()
            finally:
                playback_done_event.set()
                with self._custom_voice_state_lock:
                    self._custom_voice_active = False
                    self._custom_voice_cancel_event.clear()

        threading.Thread(target=_producer, name=f"TranslateIT-VoiceActor-Produce-{request_trace_id}", daemon=True).start()
        threading.Thread(target=_writer, name=f"TranslateIT-VoiceActor-Write-{request_trace_id}", daemon=True).start()
        threading.Thread(target=_playback, name=f"TranslateIT-VoiceActor-Play-{request_trace_id}", daemon=True).start()
        while not playback_started_event.is_set():
            if cancel_event.is_set():
                return _cancelled_result()
            if not playback_started_event.wait(timeout=0.1):
                if cancel_event.is_set():
                    return _cancelled_result()
                continue
            break
        if cancel_event.is_set() or canceled_box["value"]:
            return _cancelled_result()
        if not playback_started_event.is_set():
            raise RuntimeError("Custom voice playback did not begin in time")
        if error_box:
            raise error_box[0]
        if cancel_event.is_set() or canceled_box["value"]:
            return _cancelled_result()
        started_perf = float(state["started_perf"] or perf_counter())
        voice_start_proxy_ms = max(0, int((started_perf - started) * 1000))
        now_iso = _now_iso()
        return TTSResult(
            segment_id=segment_id,
            status="Playing",
            mode="voice_actor_onnx",
            trace_id=request_trace_id,
            audio_path=str(output_path),
            latency_ms=voice_start_proxy_ms,
            queue_wait_ms=0,
            text_prep_ms=text_prep_ms,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=voice_start_proxy_ms,
            total_ms=voice_start_proxy_ms,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(output_path),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=request_start_ms,
            tts_direct_speak_called_ms=voice_start_proxy_ms,
            voice_start_proxy_ms=voice_start_proxy_ms,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time=now_iso,
            voice_completed_time="",
            provider_used=provider_used,
            provider_benchmark_ms=provider_benchmark_ms,
            provider_selection_reason=provider_selection_reason,
            provider_voice_profile_id=provider_voice_profile_id,
            provider_model_version=provider_model_version,
            notes="Generated translated voice output locally using a custom ONNX voice actor with direct streaming playback; WAV artifact is cached asynchronously.",
        )

    def _speak_with_custom_voice_actor(
        self,
        *,
        request: TTSRequest,
        text: str,
        normalized_text: str,
        output_path: Path,
        started: float,
        text_prep_ms: int,
        request_start_ms: int,
    ) -> TTSResult:
        voice_profile = self._resolve_custom_voice_profile(request)
        if voice_profile is None:
            raise RuntimeError("Custom voice profile is unavailable")
        provider_result = self._voice_provider_selector.select_provider(
            voice_profile,
            force_retest=bool(request.force_provider_retest),
        )
        if provider_result.provider is None or provider_result.benchmark.provider_used == "default_voice":
            forced_result = self._voice_provider_selector.select_provider(voice_profile, force_retest=True)
            if forced_result.provider is not None and forced_result.benchmark.provider_used != "default_voice":
                provider_result = forced_result
            else:
                provider_result = forced_result if forced_result.provider is not None else provider_result
        if provider_result.provider is None or provider_result.benchmark.provider_used == "default_voice":
            fallback = self._speak_with_persistent_powershell(
                request=request,
                text=text,
                normalized_text=normalized_text,
                output_path=output_path,
                started=started,
                text_prep_ms=text_prep_ms,
            )
            fallback.backend_fallback_reason = "default_voice_fallback"
            fallback.provider_used = "default_voice"
            fallback.provider_benchmark_ms = provider_result.benchmark.provider_benchmark_ms
            fallback.provider_selection_reason = provider_result.benchmark.provider_selection_reason or "default_voice_fallback"
            fallback.provider_voice_profile_id = voice_profile.profile_id
            fallback.provider_model_version = voice_profile.model_version
            return fallback

        renderer = provider_result.provider
        assert renderer is not None
        try:
            return self._play_custom_voice_stream(
                renderer=renderer,
                normalized_text=normalized_text,
                output_path=output_path,
                render_profile="live",
                request_trace_id=request.trace_id,
                provider_used=provider_result.benchmark.provider_used,
                provider_selection_reason=provider_result.benchmark.provider_selection_reason,
                provider_benchmark_ms=provider_result.benchmark.provider_benchmark_ms,
                provider_voice_profile_id=voice_profile.profile_id,
                provider_model_version=voice_profile.model_version,
                started=started,
                text_prep_ms=text_prep_ms,
                request_start_ms=request_start_ms,
                segment_id=request.segment_id,
            )
        except Exception as exc:
            self._trace(
                request.trace_id,
                "voice_actor_render_failed",
                stage="tts_voice_actor",
                status="failed",
                details={"error": str(exc), "provider_used": provider_result.benchmark.provider_used},
            )
            fallback = self._speak_with_persistent_powershell(
                request=request,
                text=text,
                normalized_text=normalized_text,
                output_path=output_path,
                started=started,
                text_prep_ms=text_prep_ms,
            )
            fallback.backend_fallback_reason = f"voice_actor_render_failed: {exc}"
            fallback.provider_used = "default_voice"
            fallback.provider_benchmark_ms = provider_result.benchmark.provider_benchmark_ms
            fallback.provider_selection_reason = "default_voice_fallback"
            fallback.provider_voice_profile_id = voice_profile.profile_id
            fallback.provider_model_version = voice_profile.model_version
            return fallback

    def _stop_direct_worker(self) -> None:
        with self._ps_worker_lock:
            process = self._ps_process
            self._ps_worker_ready = False
        with self._direct_speech_lock:
            self._direct_speech_active = False
            self._direct_speech_request_id = None
            self._direct_speech_done_event = None
        self._drain_pending_direct_requests("Direct SAPI worker cancelled.")
        if process is None:
            return
        try:
            if process.stdin is not None:
                process.stdin.write("STOP|0\n")
                process.stdin.flush()
        except Exception:
            pass
        try:
            process.terminate()
            process.wait(timeout=2)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass
        with self._ps_worker_lock:
            if self._ps_process is process:
                self._ps_process = None
            self._ps_stdout_thread = None

    def shutdown_runtime_state(self) -> None:
        with self._warmup_lock:
            self._warmup_in_progress = False
            self._warmup_event.set()
        with self._custom_voice_state_lock:
            self._custom_voice_active = False
            self._custom_voice_cancel_event.set()
            self._custom_voice_cancel_event = threading.Event()
        self._stop_direct_worker()
        with self._ps_pending_lock:
            self._ps_pending.clear()

    def reset_runtime_state(self) -> None:
        self.cancel_active_speech()
        idle_deadline = perf_counter() + 2.5
        while perf_counter() < idle_deadline:
            with self._custom_voice_state_lock:
                custom_voice_active = self._custom_voice_active
            with self._direct_speech_lock:
                direct_speech_active = self._direct_speech_active
            if not custom_voice_active and not direct_speech_active:
                break
            try:
                self._wait_for_direct_speech_turn(timeout=0.1)
            except Exception:
                pass
            self._custom_voice_cancel_event.wait(timeout=0.05)
        with self._warmup_lock:
            if self._warmup_in_progress:
                self._warmup_in_progress = False
                self._warmup_event.set()
        with self._custom_voice_state_lock:
            self._custom_voice_active = False
            self._custom_voice_cancel_event.set()
            self._custom_voice_cancel_event = threading.Event()
        with self._ps_pending_lock:
            self._ps_pending.clear()

    def cancel_active_speech(self) -> bool:
        cancelled = False
        with self._custom_voice_state_lock:
            if self._custom_voice_active:
                self._custom_voice_cancel_event.set()
                cancelled = True
        if self._direct_speech_active:
            self._stop_direct_worker()
            cancelled = True
        return cancelled

    def is_runtime_idle(self) -> bool:
        with self._custom_voice_state_lock:
            custom_voice_active = self._custom_voice_active
        with self._direct_speech_lock:
            direct_speech_active = self._direct_speech_active
        with self._warmup_lock:
            warming = self._warmup_in_progress
        return not custom_voice_active and not direct_speech_active and not warming

    def _wait_for_direct_speech_turn(self, timeout: float = 120.0) -> bool:
        with self._direct_speech_lock:
            active = self._direct_speech_active
            done_event = self._direct_speech_done_event
        if not active or done_event is None:
            return True
        return bool(done_event.wait(timeout=timeout))

    def _ensure_direct_sapi_worker(self) -> bool:
        worker_boot_started = perf_counter()
        with self._ps_worker_lock:
            if self._ps_process is not None and self._ps_process.poll() is None and self._ps_worker_ready:
                return True
            worker_script_path = Path(tempfile.gettempdir()) / "translateit_tts_direct_worker.ps1"
            worker_script_path.write_text(
                r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $culture = [Globalization.CultureInfo]'en-US'
  $speaker.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet,
    [System.Speech.Synthesis.VoiceAge]::Adult, 0, $culture)
} catch { }
try {
  while (($line = [Console]::In.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split('|', 2)
    if ($parts.Length -lt 2) {
      [Console]::Out.WriteLine("ERR|0|bad_request")
      [Console]::Out.Flush()
      continue
    }
    $requestId = $parts[0]
    if ($requestId -eq 'STOP') {
      try {
        $speaker.SpeakAsyncCancelAll()
        [Console]::Out.WriteLine("OK|STOP|cancelled")
        [Console]::Out.Flush()
      } catch {
        [Console]::Out.WriteLine("ERR|STOP|$($_.Exception.Message)")
        [Console]::Out.Flush()
      }
      continue
    }
    $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[1]))
    try {
      [Console]::Out.WriteLine("START|$requestId|direct")
      [Console]::Out.Flush()
      $speaker.Speak($text)
      [Console]::Out.WriteLine("OK|$requestId|direct")
      [Console]::Out.Flush()
    } catch {
      [Console]::Out.WriteLine("ERR|$requestId|$($_.Exception.Message)")
      [Console]::Out.Flush()
    }
  }
} finally {
  $speaker.Dispose()
}
""".lstrip(),
                encoding="utf-8",
            )
            run_kwargs: dict[str, object] = {
                "stdin": subprocess.PIPE,
                "stdout": subprocess.PIPE,
                "stderr": subprocess.STDOUT,
                "text": True,
                "bufsize": 1,
            }
            if sys.platform.startswith("win"):
                creationflags = 0
                if hasattr(subprocess, "CREATE_NO_WINDOW"):
                    creationflags |= subprocess.CREATE_NO_WINDOW
                if creationflags:
                    run_kwargs["creationflags"] = creationflags
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0
                run_kwargs["startupinfo"] = startupinfo
                run_kwargs["env"] = {**os.environ}
            self._ps_process = subprocess.Popen(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-STA", "-WindowStyle", "Hidden", "-File", str(worker_script_path)],
                **run_kwargs,
            )
            self._ps_worker_ready = True

            def reader() -> None:
                assert self._ps_process is not None
                stdout = self._ps_process.stdout
                if stdout is None:
                    return
                for raw_line in stdout:
                    line = str(raw_line).strip()
                    if not line:
                        continue
                    parts = line.split("|", 2)
                    if len(parts) < 2:
                        continue
                    request_id = parts[1]
                    with self._ps_pending_lock:
                        pending = self._ps_pending.pop(request_id, None)
                    if pending is None:
                        continue
                    start_event, done_event, result_box = pending
                    if line.startswith("START|"):
                        result_box["started"] = "1"
                        result_box["voice_start_proxy_time"] = datetime.now().astimezone().isoformat(timespec="milliseconds")
                        start_event.set()
                        with self._ps_pending_lock:
                            self._ps_pending[request_id] = (start_event, done_event, result_box)
                        continue
                    result_box["voice_completed_time"] = datetime.now().astimezone().isoformat(timespec="milliseconds")
                    result_box["line"] = line
                    done_event.set()
                self._ps_worker_ready = False

            self._ps_stdout_thread = threading.Thread(target=reader, name="TranslateIT-Powershell-TTS-Direct-Reader", daemon=True)
            self._ps_stdout_thread.start()
            self._direct_worker_boot_ms = int((perf_counter() - worker_boot_started) * 1000)
            return True

    @staticmethod
    def _tts_cache_key(normalized_text: str, language: str, mode: str) -> str:
        digest = hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()
        return f"{mode}|{language}|{digest}"

    def _resolve_cached_tts_audio(self, cache_key: str, output_path: Path) -> tuple[bool, int]:
        cached_path = self._tts_cache.get(cache_key)
        if cached_path is None:
            return False, 0
        if not cached_path.exists():
            self._tts_cache.pop(cache_key, None)
            return False, 0
        output_path.parent.mkdir(parents=True, exist_ok=True)
        start = perf_counter()
        shutil.copy2(cached_path, output_path)
        self._tts_cache.move_to_end(cache_key)
        return True, int((perf_counter() - start) * 1000)

    def _remember_tts_audio(self, cache_key: str, output_path: Path) -> None:
        if not output_path.exists():
            return
        self._tts_cache[cache_key] = output_path
        self._tts_cache.move_to_end(cache_key)
        while len(self._tts_cache) > self._tts_cache_limit:
            old_key, old_path = self._tts_cache.popitem(last=False)
            if old_path.exists() and old_path.parent == output_path.parent and old_path != output_path:
                try:
                    old_path.unlink(missing_ok=True)
                except Exception:
                    pass

    def warmup_engine(self) -> dict[str, object]:
        backend = self._resolve_backend()
        if backend == "voice_actor_onnx":
            with self._warmup_lock:
                if self._warmup_cached_success is not None:
                    cached_result = copy.deepcopy(self._warmup_cached_success)
                    cached_result["reused"] = True
                    return cached_result
                if self._warmup_in_progress:
                    warmup_event = self._warmup_event
                else:
                    self._warmup_in_progress = True
                    self._warmup_event.clear()
                    warmup_event = None
            if warmup_event is not None:
                if not warmup_event.wait(timeout=60):
                    return {
                        "loaded": False,
                        "mode": "voice_actor_onnx",
                        "latency_ms": 0,
                        "provider_used": "default_voice",
                        "provider_benchmark_ms": 0,
                        "provider_selection_reason": "default_voice_fallback",
                        "message": "Custom voice warmup is still in progress.",
                        "reused": False,
                    }
                with self._warmup_lock:
                    if self._warmup_cached_success is not None:
                        cached_result = copy.deepcopy(self._warmup_cached_success)
                        cached_result["reused"] = True
                        return cached_result
                    if self._warmup_last_result is not None:
                        cached_result = copy.deepcopy(self._warmup_last_result)
                        cached_result["reused"] = bool(cached_result.get("loaded", False)) and bool(self._warmup_cached_success is not None)
                        return cached_result
            return self._run_warmup_once()
        return self._warmup_engine_impl()

    def _run_warmup_once(self) -> dict[str, object]:
        try:
            result = self._warmup_engine_impl()
        except Exception as exc:
            result = {
                "loaded": False,
                "mode": "voice_actor_onnx",
                "latency_ms": 0,
                "message": f"Custom voice warmup attempted but failed: {exc}",
            }
        with self._warmup_lock:
            self._warmup_last_result = copy.deepcopy(result)
            self._warmup_in_progress = False
            if bool(result.get("loaded", False)):
                self._warmup_cached_success = copy.deepcopy(result)
            self._warmup_event.set()
        return result

    def _warmup_engine_impl(self) -> dict[str, object]:
        started = perf_counter()
        if not sys.platform.startswith("win"):
            return {
                "loaded": False,
                "mode": "local_windows_sapi",
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "Warmup skipped: local voice output requires Windows SAPI.",
                "reused": False,
            }
        backend = self._resolve_backend()
        if backend == "sapi_direct_async":
            worker_ready = self._ensure_direct_sapi_worker()
            if not worker_ready:
                return {
                    "loaded": False,
                    "mode": "sapi_direct_async",
                    "latency_ms": int((perf_counter() - started) * 1000),
                    "message": "Warmup skipped: direct SAPI worker is unavailable.",
                    "reused": False,
                }
            self._trace(
                "warmup",
                "tts_direct_async_worker_warmed",
                stage="tts_direct_async",
                status="completed",
                details={"backend": "sapi_direct_async"},
            )
            self._warmup_done = True
            return {
                "loaded": True,
                "mode": "sapi_direct_async",
                "latency_ms": int((perf_counter() - started) * 1000),
                "process_start_overhead_ms": self._direct_worker_boot_ms,
                "message": "Direct SAPI worker warmed.",
                "reused": False,
            }
        if backend == "voice_actor_onnx":
            with self._custom_voice_lock:
                voice_profile = self._resolve_custom_voice_profile(
                    TTSRequest(segment_id="warmup", text="warmup", language="en", output_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts_warmup.wav"))
                )
                if voice_profile is None:
                    return {
                        "loaded": False,
                        "mode": "voice_actor_onnx",
                        "latency_ms": int((perf_counter() - started) * 1000),
                        "message": "Warmup skipped: custom voice profile is unavailable.",
                    }
                try:
                    selection = self._voice_provider_selector.select_provider(voice_profile, force_retest=False)
                    if selection.provider is None:
                        return {
                            "loaded": False,
                            "mode": "voice_actor_onnx",
                            "latency_ms": int((perf_counter() - started) * 1000),
                            "provider_used": selection.benchmark.provider_used,
                            "provider_benchmark_ms": selection.benchmark.provider_benchmark_ms,
                            "provider_selection_reason": selection.benchmark.provider_selection_reason,
                            "message": "Warmup skipped: custom voice actor fell back to default voice.",
                            "reused": False,
                        }
                    self._warmup_done = True
                    return {
                        "loaded": True,
                        "mode": "voice_actor_onnx",
                        "latency_ms": int((perf_counter() - started) * 1000),
                        "provider_used": selection.benchmark.provider_used,
                        "provider_benchmark_ms": selection.benchmark.provider_benchmark_ms,
                        "provider_selection_reason": selection.benchmark.provider_selection_reason,
                        "message": "Custom voice provider warmed.",
                        "reused": False,
                    }
                except Exception as exc:
                    return {
                        "loaded": False,
                        "mode": "voice_actor_onnx",
                        "latency_ms": int((perf_counter() - started) * 1000),
                        "message": f"Custom voice warmup attempted but failed: {exc}",
                        "reused": False,
                    }
        worker_ready = self._ensure_powershell_worker()
        if not worker_ready:
            return {
                "loaded": False,
                "mode": "local_windows_sapi",
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "Warmup skipped: persistent PowerShell TTS worker is unavailable.",
                "reused": False,
            }
        if self._warmup_done:
            return {
                "loaded": True,
                "mode": "local_windows_sapi",
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "Persistent PowerShell TTS worker already warmed.",
                "reused": True,
            }
        try:  # pragma: no cover - optional local dependency
            with tempfile.TemporaryDirectory(prefix="translateit-tts-warmup-") as temp_dir:
                temp_output = Path(temp_dir) / "warmup.wav"
                self._speak_with_persistent_powershell(
                    request=TTSRequest(segment_id="warmup", text="warmup", language="en", output_path=str(temp_output)),
                    text="warmup",
                    normalized_text="warmup",
                    output_path=temp_output,
                    started=perf_counter(),
                    text_prep_ms=0,
                )
                if temp_output.exists():
                    try:
                        temp_output.unlink(missing_ok=True)
                    except Exception:
                        pass
            self._warmup_done = True
            return {
                "loaded": True,
                "mode": "local_windows_sapi",
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": "Persistent PowerShell TTS worker warmed.",
                "reused": False,
            }
        except Exception as exc:
            return {
                "loaded": False,
                "mode": "local_windows_sapi",
                "latency_ms": int((perf_counter() - started) * 1000),
                "message": f"Persistent PowerShell TTS warmup attempted but failed: {exc}",
                "reused": False,
            }

    def speak(self, request: TTSRequest) -> TTSResult:
        started = perf_counter()
        request_start_ms = int((perf_counter() - started) * 1000)
        text = request.text.strip()
        text_prep_started = perf_counter()
        normalized_text = " ".join(text.split())
        text_prep_ms = int((perf_counter() - text_prep_started) * 1000)
        if not text:
            return TTSResult(
                segment_id=request.segment_id,
                status="Unavailable",
                mode="local_windows_sapi",
                notes="No translated text is available for voice output.",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                total_ms=int((perf_counter() - started) * 1000),
                backend_name=self._resolve_backend(),
                backend_selected=self._resolve_backend(),
                **self._default_voice_provider_meta(),
            )
        if not sys.platform.startswith("win"):
            return TTSResult(
                segment_id=request.segment_id,
                status="Unsupported",
                mode="local_windows_sapi",
                notes="Local voice output currently requires Windows SAPI.",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                total_ms=int((perf_counter() - started) * 1000),
                backend_name=self._resolve_backend(),
                backend_selected=self._resolve_backend(),
                **self._default_voice_provider_meta(),
            )
        if request.output_path is None:
            return TTSResult(
                segment_id=request.segment_id,
                status="Unavailable",
                mode="local_windows_sapi",
                notes="No output WAV path was provided.",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                total_ms=int((perf_counter() - started) * 1000),
                backend_name=self._resolve_backend(),
                backend_selected=self._resolve_backend(),
                **self._default_voice_provider_meta(),
            )

        output_path = Path(request.output_path)
        backend = self._resolve_backend()
        custom_voice_requested = bool(
            request.voice_profile_id.strip()
            or self._custom_voice_profile_id
            or backend in {"voice_actor_onnx", "voice_actor", "custom_voice_onnx"}
        )
        if custom_voice_requested:
            try:
                return self._speak_with_custom_voice_actor(
                    request=request,
                    text=text,
                    normalized_text=normalized_text,
                    output_path=output_path,
                    started=started,
                    text_prep_ms=text_prep_ms,
                    request_start_ms=request_start_ms,
                )
            except Exception as exc:
                self._trace(
                    request.trace_id,
                    "tts_fallback_started",
                    stage="tts",
                    status="fallback",
                    details={"reason": str(exc)},
                )
                fallback = self._speak_with_persistent_powershell(
                    request=request,
                    text=text,
                    normalized_text=normalized_text,
                    output_path=output_path,
                    started=started,
                    text_prep_ms=text_prep_ms,
                )
                fallback.backend_fallback_reason = f"custom_voice_actor failed; fell back to legacy_sapi_wav: {exc}"
                fallback.backend_name = "legacy_sapi_wav"
                fallback.backend_selected = "legacy_sapi_wav"
                fallback.provider_used = "default_voice"
                fallback.provider_selection_reason = "default_voice_fallback"
                fallback.provider_benchmark_ms = 0
                return fallback
        if backend == "sapi_direct_async":
            direct_worker_was_ready = bool(self._ps_process is not None and self._ps_process.poll() is None and self._ps_worker_ready)
            try:
                return self._speak_direct_async(
                    request=request,
                    text=text,
                    normalized_text=normalized_text,
                    started=started,
                    text_prep_ms=text_prep_ms,
                    request_start_ms=request_start_ms,
                    worker_was_ready=direct_worker_was_ready,
                )
            except Exception as exc:
                self._trace(
                    request.trace_id,
                    "tts_fallback_started",
                    stage="tts",
                    status="fallback",
                    details={"reason": str(exc)},
                )
                fallback = self._speak_with_persistent_powershell(
                    request=request,
                    text=text,
                    normalized_text=normalized_text,
                    output_path=output_path,
                    started=started,
                    text_prep_ms=text_prep_ms,
                )
                fallback.backend_fallback_reason = f"sapi_direct_async failed; fell back to legacy_sapi_wav: {exc}"
                fallback.backend_name = "legacy_sapi_wav"
                fallback.backend_selected = "legacy_sapi_wav"
                fallback.trace_id = request.trace_id
                fallback.process_start_overhead_ms = 0 if direct_worker_was_ready else fallback.process_start_overhead_ms
                fallback.provider_used = "default_voice"
                fallback.provider_selection_reason = "default_voice_fallback"
                fallback.provider_benchmark_ms = 0
                return fallback
        worker_ready_before = bool(self._ps_process is not None and self._ps_process.poll() is None and self._ps_worker_ready)
        worker_ready = self._ensure_powershell_worker()
        cache_key = self._tts_cache_key(normalized_text, request.language, "powershell")
        cached_hit, cache_ms = self._resolve_cached_tts_audio(cache_key, output_path)
        if cached_hit and output_path.exists():
            total_ms = int((perf_counter() - started) * 1000)
            return TTSResult(
                segment_id=request.segment_id,
                status="Completed",
                mode="local_windows_sapi",
                audio_path=str(output_path),
                latency_ms=total_ms,
                notes="Reused cached local voice output audio.",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                voice_generate_ms=0,
                audio_cache_ms=cache_ms,
                playback_prepare_ms=0,
                playback_start_ms=total_ms,
                total_ms=total_ms,
                engine_name="powershell/sapi",
                available=True,
                cached=True,
                cache_hit=True,
                target_audio_path=str(output_path),
                output_device_name="Windows default output",
                tts_error="",
                backend_name="legacy_sapi_wav",
                backend_selected="legacy_sapi_wav",
                trace_id=request.trace_id,
                supports_streaming=False,
                supports_direct_playback=False,
                direct_playback=False,
                tts_request_start_ms=request_start_ms,
                voice_start_proxy_ms=total_ms,
                voice_completed_ms=total_ms,
                process_start_overhead_ms=0 if worker_ready_before else self._ps_worker_boot_ms,
                **self._default_voice_provider_meta(),
            )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            result = self._speak_with_persistent_powershell(
                request=request,
                text=text,
                normalized_text=normalized_text,
                output_path=output_path,
                started=started,
                text_prep_ms=text_prep_ms,
            )
            if result.status == "Completed" and result.audio_path:
                self._remember_tts_audio(cache_key, Path(result.audio_path))
            return result
        except Exception as exc:
            return TTSResult(
                segment_id=request.segment_id,
                status="Failed",
                mode="local_windows_sapi",
                latency_ms=0,
                notes=f"Local Windows TTS failed: {exc}",
                queue_wait_ms=0,
                text_prep_ms=text_prep_ms,
                tts_error=str(exc),
                backend_name="legacy_sapi_wav",
                backend_selected="legacy_sapi_wav",
                trace_id=request.trace_id,
                voice_completed_ms=int((perf_counter() - started) * 1000),
                process_start_overhead_ms=0 if worker_ready_before else self._ps_worker_boot_ms,
                **self._default_voice_provider_meta(),
            )

    def _speak_direct_async(
        self,
        *,
        request: TTSRequest,
        text: str,
        normalized_text: str,
        started: float,
        text_prep_ms: int,
        request_start_ms: int,
        worker_was_ready: bool = False,
    ) -> TTSResult:
        del normalized_text
        if not sys.platform.startswith("win"):
            raise RuntimeError("Direct SAPI playback is only available on Windows")
        with self._direct_request_lock:
            self._wait_for_direct_speech_turn()
            if not self._ensure_direct_sapi_worker():
                raise RuntimeError("Direct SAPI worker is unavailable")

            def _submit_once() -> tuple[str, threading.Event, threading.Event, dict[str, str], int] | None:
                request_id = str(self._ps_request_counter + 1)
                self._ps_request_counter += 1
                payload = base64.b64encode(text.encode("utf-8")).decode("ascii")
                line = f"{request_id}|{payload}"
                start_event = threading.Event()
                done_event = threading.Event()
                result_box: dict[str, str] = {}
                with self._ps_pending_lock:
                    result_box["trace_id"] = request.trace_id
                    self._ps_pending[request_id] = (start_event, done_event, result_box)
                self._trace(
                    request.trace_id,
                    "powershell_command_started",
                    stage="tts_direct_async",
                    status="started",
                    details={"request_id": request_id, "command": "powershell -File translateit_tts_direct_worker.ps1"},
                )
                process_pid_local = getattr(self._ps_process, "pid", 0)
                self._trace(
                    request.trace_id,
                    "powershell_process_pid",
                    stage="tts_direct_async",
                    status="started",
                    details={"pid": process_pid_local},
                )
                assert self._ps_process is not None
                assert self._ps_process.stdin is not None
                try:
                    self._ps_process.stdin.write(line + "\n")
                    self._ps_process.stdin.flush()
                except Exception as exc:
                    with self._ps_pending_lock:
                        self._ps_pending.pop(request_id, None)
                    raise RuntimeError(f"Direct SAPI request could not be submitted: {exc}") from exc
                if not start_event.wait(timeout=3):
                    with self._ps_pending_lock:
                        self._ps_pending.pop(request_id, None)
                    return None
                return request_id, start_event, done_event, result_box, process_pid_local

            submission = _submit_once()
            if submission is None:
                self._trace(
                    request.trace_id,
                    "tts_direct_async_start_timeout",
                    stage="tts_direct_async",
                    status="timeout",
                    details={"retry": 1},
                )
                self._stop_direct_worker()
                if not self._ensure_direct_sapi_worker():
                    raise RuntimeError("Direct SAPI worker is unavailable after retry")
                submission = _submit_once()
                if submission is None:
                    self._stop_direct_worker()
                    raise RuntimeError("Direct SAPI worker did not begin speaking in time")

            request_id, start_event, done_event, result_box, process_pid = submission
            tts_direct_speak_called_ms = int((perf_counter() - started) * 1000)
            voice_start_proxy_time = result_box.get("voice_start_proxy_time") or datetime.now().astimezone().isoformat(timespec="milliseconds")
            with self._direct_speech_lock:
                self._direct_speech_active = True
                self._direct_speech_request_id = request_id
                self._direct_speech_done_event = done_event
        self._trace(
            request.trace_id,
            "tts_direct_async_process_started",
            stage="tts_direct_async",
            status="started",
            details={"request_id": request_id, "pid": process_pid},
        )
        self._trace(
            request.trace_id,
            "tts_direct_async_dispatch_started",
            stage="tts_direct_async",
            status="started",
            details={"request_id": request_id, "pid": process_pid},
        )

        def waiter() -> None:
            completed = done_event.wait(timeout=120)
            voice_completed_ms = int((perf_counter() - started) * 1000)
            exit_code = None
            try:
                if self._ps_process is not None:
                    exit_code = self._ps_process.poll()
            except Exception:
                exit_code = None
            self._trace(
                request.trace_id,
                "voice_completed",
                stage="tts_direct_async",
                status="completed" if completed else "timeout",
                details={
                    "request_id": request_id,
                    "voice_completed_ms": voice_completed_ms,
                    "exit_code": exit_code if exit_code is not None else "unavailable",
                },
            )
            with self._direct_speech_lock:
                self._direct_speech_active = False
                self._direct_speech_request_id = None
                if self._direct_speech_done_event is done_event:
                    self._direct_speech_done_event = None
            self._trace(
                request.trace_id,
                "tts_direct_async_process_exit_code",
                stage="tts_direct_async",
                status="completed" if completed else "timeout",
                details={"request_id": request_id, "exit_code": exit_code if exit_code is not None else "unavailable"},
            )
            self._trace(
                request.trace_id,
                "powershell_exit_code",
                stage="tts_direct_async",
                status="completed" if completed else "timeout",
                details={"request_id": request_id, "exit_code": exit_code if exit_code is not None else "unavailable"},
            )
            self._trace(
                request.trace_id,
                "direct_async_speak_completed_or_timeout",
                stage="tts_direct_async",
                status="completed" if completed else "timeout",
                details={"request_id": request_id, "exit_code": exit_code if exit_code is not None else "unavailable"},
            )

        threading.Thread(target=waiter, name=f"TranslateIT-TTS-Wait-{request_id}", daemon=True).start()
        self._trace(
            request.trace_id,
            "playback_started_or_proxy",
            stage="tts_direct_async",
            status="proxy",
            details={"request_id": request_id, "proxy": "Speak() child process began speaking"},
        )
        return TTSResult(
            segment_id=request.segment_id,
            status="Playing",
            mode="sapi_direct_async",
            trace_id=request.trace_id,
            notes="Direct SAPI speech started asynchronously.",
            queue_wait_ms=tts_direct_speak_called_ms,
            text_prep_ms=text_prep_ms,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=tts_direct_speak_called_ms,
            total_ms=tts_direct_speak_called_ms,
            engine_name="sapi_direct_async",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path="",
            output_device_name="Windows default output",
            tts_error="",
            backend_name="sapi_direct_async",
            backend_selected="sapi_direct_async",
            backend_fallback_reason="",
            supports_streaming=False,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=request_start_ms,
            tts_direct_speak_called_ms=tts_direct_speak_called_ms,
            voice_start_proxy_ms=tts_direct_speak_called_ms,
            voice_completed_ms=0,
            process_start_overhead_ms=0 if worker_was_ready else self._direct_worker_boot_ms,
            voice_start_proxy_time=str(voice_start_proxy_time),
            **self._default_voice_provider_meta(),
        )

    def _ensure_powershell_worker(self) -> bool:
        worker_boot_started = perf_counter()
        with self._ps_worker_lock:
            if self._ps_process is not None and self._ps_process.poll() is None and self._ps_worker_ready:
                return True
            worker_script_path = Path(tempfile.gettempdir()) / "translateit_tts_worker.ps1"
            worker_script_path.write_text(
                r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $culture = [Globalization.CultureInfo]'en-US'
  $speaker.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet,
    [System.Speech.Synthesis.VoiceAge]::Adult, 0, $culture)
} catch { }
try {
  while (($line = [Console]::In.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split('|', 4)
    if ($parts.Length -lt 4) {
      [Console]::Out.WriteLine("ERR|0|bad_request")
      [Console]::Out.Flush()
      continue
    }
    $requestId = $parts[0]
    $outPath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[1]))
    $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[2]))
    try {
      $dir = Split-Path -Parent $outPath
      if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
      [Console]::Out.WriteLine("START|$requestId|$outPath")
      [Console]::Out.Flush()
      $speaker.SetOutputToWaveFile($outPath)
      $speaker.Speak($text)
      $speaker.SetOutputToNull()
      [Console]::Out.WriteLine("OK|$requestId|$outPath")
      [Console]::Out.Flush()
    } catch {
      [Console]::Out.WriteLine("ERR|$requestId|$($_.Exception.Message)")
      [Console]::Out.Flush()
    }
  }
} finally {
  $speaker.Dispose()
}
""".lstrip(),
                encoding="utf-8",
            )
            run_kwargs: dict[str, object] = {
                "stdin": subprocess.PIPE,
                "stdout": subprocess.PIPE,
                "stderr": subprocess.STDOUT,
                "text": True,
                "bufsize": 1,
            }
            if sys.platform.startswith("win"):
                creationflags = 0
                if hasattr(subprocess, "CREATE_NO_WINDOW"):
                    creationflags |= subprocess.CREATE_NO_WINDOW
                if creationflags:
                    run_kwargs["creationflags"] = creationflags
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0
                run_kwargs["startupinfo"] = startupinfo
                run_kwargs["env"] = {**os.environ}
            self._ps_process = subprocess.Popen(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-STA", "-WindowStyle", "Hidden", "-File", str(worker_script_path)],
                **run_kwargs,
            )
            self._ps_worker_ready = True

            def reader() -> None:
                assert self._ps_process is not None
                stdout = self._ps_process.stdout
                if stdout is None:
                    return
                for raw_line in stdout:
                    line = str(raw_line).strip()
                    if not line:
                        continue
                    parts = line.split("|", 2)
                    if len(parts) < 2:
                        continue
                    request_id = parts[1] if len(parts) > 1 else "0"
                    with self._ps_pending_lock:
                        pending = self._ps_pending.pop(request_id, None)
                    if pending is None:
                        continue
                    start_event, done_event, result_box = pending
                    if line.startswith("START|"):
                        result_box["started"] = "1"
                        start_event.set()
                        with self._ps_pending_lock:
                            self._ps_pending[request_id] = (start_event, done_event, result_box)
                        continue
                    result_box["line"] = line
                    done_event.set()
                self._ps_worker_ready = False

            self._ps_stdout_thread = threading.Thread(target=reader, name="TranslateIT-Powershell-TTS-Reader", daemon=True)
            self._ps_stdout_thread.start()
            self._ps_worker_boot_ms = int((perf_counter() - worker_boot_started) * 1000)
            return True

    def _speak_with_persistent_powershell(
        self,
        *,
        request: TTSRequest,
        text: str,
        normalized_text: str,
        output_path: Path,
        started: float,
        text_prep_ms: int,
    ) -> TTSResult:
        if not self._ensure_powershell_worker():
            raise RuntimeError("Persistent PowerShell TTS worker could not be started")

        request_id = str(self._ps_request_counter + 1)
        self._ps_request_counter += 1
        text_b64 = base64.b64encode(normalized_text.encode("utf-8")).decode("ascii")
        path_b64 = base64.b64encode(str(output_path).encode("utf-8")).decode("ascii")
        line = f"{request_id}|{path_b64}|{text_b64}|0"
        start_event = threading.Event()
        done = threading.Event()
        result_box: dict[str, str] = {}
        with self._ps_pending_lock:
            self._ps_pending[request_id] = (start_event, done, result_box)

        queue_wait_ms = 0
        try:
            assert self._ps_process is not None
            assert self._ps_process.stdin is not None
            queue_started = perf_counter()
            self._ps_process.stdin.write(line + "\n")
            self._ps_process.stdin.flush()
        except Exception as exc:
            with self._ps_pending_lock:
                self._ps_pending.pop(request_id, None)
            raise RuntimeError(f"Could not submit TTS request: {exc}") from exc

        if not start_event.wait(timeout=5):
            with self._ps_pending_lock:
                self._ps_pending.pop(request_id, None)
            raise RuntimeError("Persistent PowerShell TTS worker did not start processing in time")
        queue_wait_ms = int((perf_counter() - queue_started) * 1000)
        voice_start_proxy_time = result_box.get("voice_start_proxy_time") or datetime.now().astimezone().isoformat(timespec="milliseconds")
        wait_started = perf_counter()
        if not done.wait(timeout=30):
            with self._ps_pending_lock:
                self._ps_pending.pop(request_id, None)
            raise RuntimeError("Persistent PowerShell TTS worker timed out")
        response = result_box.get("line", "")
        voice_completed_time = result_box.get("voice_completed_time") or datetime.now().astimezone().isoformat(timespec="milliseconds")
        latency_ms = int((perf_counter() - started) * 1000)
        if not response.startswith("OK|"):
            details = response.partition("|")[2] or "No PowerShell error details."
            result = TTSResult(
                segment_id=request.segment_id,
                status="Failed",
                mode="local_windows_sapi",
                trace_id=request.trace_id,
                latency_ms=queue_wait_ms,
                notes=f"Local Windows TTS failed: {details}",
                queue_wait_ms=queue_wait_ms,
                text_prep_ms=text_prep_ms,
                voice_generate_ms=max(0, latency_ms - queue_wait_ms),
                audio_cache_ms=0,
                playback_prepare_ms=0,
                playback_start_ms=queue_wait_ms,
                total_ms=latency_ms,
                engine_name="powershell/sapi",
                available=True,
                cached=False,
                cache_hit=False,
                target_audio_path=str(output_path),
                output_device_name="Windows default output",
                tts_error=details,
                voice_start_proxy_ms=queue_wait_ms,
                voice_completed_ms=latency_ms,
                process_start_overhead_ms=self._ps_worker_boot_ms,
                voice_start_proxy_time=str(voice_start_proxy_time),
                voice_completed_time=str(voice_completed_time),
                **self._default_voice_provider_meta(),
            )
            self._trace(
                request.trace_id,
                "tts_completed_or_failed",
                stage="tts_legacy",
                status="failed",
                details={"error": details, "latency_ms": latency_ms},
            )
            return result

        if not output_path.exists():
            raise RuntimeError("Persistent PowerShell TTS worker completed but audio file was not created")

        voice_generate_ms = max(0, latency_ms - queue_wait_ms)
        self._trace(
            request.trace_id,
            "legacy_wav_generated",
            stage="tts_legacy",
            status="completed",
            details={"output_path": str(output_path), "latency_ms": latency_ms},
        )
        result = TTSResult(
            segment_id=request.segment_id,
            status="Completed",
            mode="local_windows_sapi",
            trace_id=request.trace_id,
            audio_path=str(output_path),
            latency_ms=queue_wait_ms,
            notes="Generated English voice output locally using Windows SAPI.",
            queue_wait_ms=queue_wait_ms,
            text_prep_ms=text_prep_ms,
            voice_generate_ms=voice_generate_ms,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=queue_wait_ms,
            total_ms=latency_ms,
            engine_name="powershell/sapi",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(output_path),
            output_device_name="Windows default output",
            tts_error="",
            voice_start_proxy_ms=queue_wait_ms,
            voice_completed_ms=latency_ms,
            process_start_overhead_ms=self._ps_worker_boot_ms,
            voice_start_proxy_time=str(voice_start_proxy_time),
            voice_completed_time=str(voice_completed_time),
            **self._default_voice_provider_meta(),
        )
        self._trace(
            request.trace_id,
            "tts_completed_or_failed",
            stage="tts_legacy",
            status="completed",
            details={"latency_ms": latency_ms, "audio_path": str(output_path)},
        )
        return result
