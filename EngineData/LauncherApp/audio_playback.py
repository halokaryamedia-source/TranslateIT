from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import queue
import threading
from typing import Callable
import wave
import sys
from time import perf_counter

try:  # pragma: no cover - optional runtime dependency
    import numpy as np
except Exception:  # pragma: no cover
    np = None

try:  # pragma: no cover - optional runtime dependency
    import sounddevice as sd
except Exception:  # pragma: no cover
    sd = None

try:  # pragma: no cover - Windows standard library backend
    import winsound
except Exception:  # pragma: no cover
    winsound = None


@dataclass(slots=True)
class PlaybackResult:
    status: str
    message: str
    audio_path: Path | None = None
    output_device_id: int | None = None
    used_default_output: bool = False


class AudioPlaybackService:
    """Asynchronous WAV playback using sounddevice when available."""

    def __init__(self) -> None:
        self._active_threads: list[threading.Thread] = []
        self._playback_queue: "queue.Queue[tuple[Path, int | None]]" = queue.Queue()
        self._playback_worker_started = False
        self._playback_worker_lock = threading.Lock()
        self.on_playback_requested: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_queued: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_worker_dequeued: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_backend_prep_start: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_backend_prep_end: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_backend_call_start: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_started: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_backend_return: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_audio_file_open_start: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_audio_file_open_end: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_audio_file_read_start: Callable[[Path, int | None, float], None] | None = None
        self.on_playback_audio_file_read_end: Callable[[Path, int | None, float], None] | None = None
        # Windows winsound does not expose a reliable audible-start callback.
        # We keep the backend timing callbacks, but do not fake a first-audio event.
        self._windows_playback_startup_ms = 0

    def _read_wav(self, path: Path) -> tuple[object, int]:
        if np is None:
            raise RuntimeError("numpy is not available for audio playback")
        if self.on_playback_audio_file_open_start is not None:
            try:
                self.on_playback_audio_file_open_start(path, None, perf_counter())
            except Exception:
                pass
        with wave.open(str(path), "rb") as wav_file:
            if self.on_playback_audio_file_open_end is not None:
                try:
                    self.on_playback_audio_file_open_end(path, None, perf_counter())
                except Exception:
                    pass
            if self.on_playback_audio_file_read_start is not None:
                try:
                    self.on_playback_audio_file_read_start(path, None, perf_counter())
                except Exception:
                    pass
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            sample_rate = wav_file.getframerate()
            raw = wav_file.readframes(wav_file.getnframes())
        if self.on_playback_audio_file_read_end is not None:
            try:
                self.on_playback_audio_file_read_end(path, None, perf_counter())
            except Exception:
                pass
        if sample_width != 2:
            raise RuntimeError("Only 16-bit PCM WAV playback is supported")
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767.0
        if channels > 1:
            samples = samples.reshape(-1, channels)
        return samples, sample_rate

    def _play_worker(self, samples: object, sample_rate: int, output_device_id: int | None) -> None:
        if sd is None:
            raise RuntimeError("sounddevice is not available for audio playback")
        try:
            sd.play(samples, samplerate=sample_rate, device=output_device_id, blocking=True)
        except Exception:
            if output_device_id is None:
                raise
            sd.play(samples, samplerate=sample_rate, blocking=True)

    def _play_with_sounddevice_stream(self, path: Path, samples: object, sample_rate: int, output_device_id: int | None) -> PlaybackResult:
        if sd is None:
            raise RuntimeError("sounddevice is not available for audio playback")
        if np is None:
            raise RuntimeError("numpy is not available for audio playback")

        try:
            sample_array = np.asarray(samples, dtype=np.float32)
            if sample_array.ndim == 1:
                channels = 1
            else:
                channels = int(sample_array.shape[1])
        except Exception as exc:
            return PlaybackResult("Failed", f"Audio replay failed to prepare playback buffer: {exc}", path, output_device_id)

        if output_device_id is not None:
            try:
                sd.check_output_settings(device=output_device_id, samplerate=sample_rate, channels=channels)
            except Exception:
                output_device_id = None

        used_default_output = output_device_id is None
        sample_index = 0
        playback_started = False
        playback_started_perf: float | None = None
        playback_finished = threading.Event()
        exception_box: list[Exception] = []

        def callback(outdata, frames, time_info, status) -> None:  # type: ignore[no-untyped-def]
            nonlocal sample_index, playback_started, playback_started_perf
            end_index = min(sample_index + frames, len(sample_array))
            chunk = sample_array[sample_index:end_index]
            if channels == 1:
                outdata[:] = 0
                if len(chunk):
                    outdata[: len(chunk), 0] = chunk
            else:
                outdata[:] = 0
                if len(chunk):
                    outdata[: len(chunk), :channels] = chunk
            sample_index = end_index
            if not playback_started:
                playback_started = True
                playback_started_perf = perf_counter()
                try:
                    dac_time = float(getattr(time_info, "outputBufferDacTime", 0.0) or 0.0)
                    current_time = float(getattr(time_info, "currentTime", 0.0) or 0.0)
                    buffer_ahead_seconds = max(0.0, dac_time - current_time)
                    if buffer_ahead_seconds > 0.0:
                        playback_started_perf = playback_started_perf + buffer_ahead_seconds
                except Exception:
                    pass
                if self.on_playback_started is not None:
                    try:
                        self.on_playback_started(path, output_device_id, playback_started_perf)
                    except Exception:
                        pass
            if sample_index >= len(sample_array):
                playback_finished.set()
                raise sd.CallbackStop

        try:
            if self.on_playback_backend_prep_end is not None:
                try:
                    self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                except Exception:
                    pass
            if self.on_playback_backend_call_start is not None:
                try:
                    self.on_playback_backend_call_start(path, output_device_id, perf_counter())
                except Exception:
                    pass
            with sd.OutputStream(
                samplerate=sample_rate,
                device=output_device_id,
                channels=channels,
                dtype="float32",
                callback=callback,
                blocksize=0,
                latency="low",
            ):
                playback_finished.wait()
        except Exception as exc:
            exception_box.append(exc)

        if exception_box:
            if self.on_playback_backend_return is not None:
                try:
                    self.on_playback_backend_return(path, output_device_id, perf_counter())
                except Exception:
                    pass
            return PlaybackResult("Failed", f"Audio replay failed: {exception_box[0]}", path, output_device_id, used_default_output=used_default_output)

        if self.on_playback_backend_return is not None:
            try:
                self.on_playback_backend_return(path, output_device_id, perf_counter())
            except Exception:
                pass
        return PlaybackResult(
            "Completed",
            (
                "Audio replay completed."
                if output_device_id is not None
                else "Audio replay completed using Windows default output device."
            ),
            path,
            output_device_id,
            used_default_output=used_default_output,
        )

    def _ensure_playback_worker(self) -> None:
        with self._playback_worker_lock:
            if self._playback_worker_started:
                return

            def worker() -> None:
                while True:
                    path, output_device_id = self._playback_queue.get()
                    try:
                        if self.on_playback_worker_dequeued is not None:
                            try:
                                self.on_playback_worker_dequeued(path, output_device_id, perf_counter())
                            except Exception:
                                pass
                        self._play_one(path, output_device_id=output_device_id)
                    finally:
                        self._playback_queue.task_done()

            thread = threading.Thread(target=worker, name="TranslateITPlaybackQueue", daemon=True)
            thread.start()
            self._active_threads.append(thread)
            self._playback_worker_started = True

    def clear_pending_requests(self) -> int:
        cleared = 0
        while True:
            try:
                self._playback_queue.get_nowait()
            except queue.Empty:
                break
            else:
                cleared += 1
                try:
                    self._playback_queue.task_done()
                except Exception:
                    pass
        return cleared

    def _play_one(self, path: Path, *, output_device_id: int | None) -> PlaybackResult:
        if self.on_playback_backend_prep_start is not None:
            try:
                self.on_playback_backend_prep_start(path, output_device_id, perf_counter())
            except Exception:
                pass
        if sys.platform.startswith("win") and sd is not None and np is not None:
            try:
                samples, sample_rate = self._read_wav(path)
            except Exception as exc:
                if self.on_playback_backend_prep_end is not None:
                    try:
                        self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                    except Exception:
                        pass
                return PlaybackResult("Failed", f"Replay audio could not be read: {exc}", path, output_device_id)
            return self._play_with_sounddevice_stream(path, samples, sample_rate, output_device_id)
        if sys.platform.startswith("win") and winsound is not None:
            try:
                if self.on_playback_backend_prep_end is not None:
                    try:
                        self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                    except Exception:
                        pass
                if self.on_playback_backend_call_start is not None:
                    try:
                        self.on_playback_backend_call_start(path, output_device_id, perf_counter())
                    except Exception:
                        pass
                winsound.PlaySound(str(path), winsound.SND_FILENAME | winsound.SND_SYNC | winsound.SND_NODEFAULT)
                if self.on_playback_backend_return is not None:
                    try:
                        self.on_playback_backend_return(path, output_device_id, perf_counter())
                    except Exception:
                        pass
                if self.on_playback_backend_prep_end is not None:
                    try:
                        self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                    except Exception:
                        pass
                return PlaybackResult(
                    "Completed",
                    "Audio replay completed using Windows winsound backend.",
                    path,
                    output_device_id,
                    used_default_output=True,
                )
            except Exception:
                pass
        if sd is None or np is None:
            return PlaybackResult("Unsupported", "sounddevice/numpy playback backend is not available.", path, output_device_id)
        try:
            samples, sample_rate = self._read_wav(path)
        except Exception as exc:
            if self.on_playback_backend_prep_end is not None:
                try:
                    self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                except Exception:
                    pass
            return PlaybackResult("Failed", f"Replay audio could not be read: {exc}", path, output_device_id)
        if output_device_id is not None:
            try:
                sd.check_output_settings(device=output_device_id, samplerate=sample_rate, channels=1)
            except Exception:
                output_device_id = None

        used_default_output = output_device_id is None
        try:
            if self.on_playback_backend_prep_end is not None:
                try:
                    self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                except Exception:
                    pass
            if self.on_playback_backend_call_start is not None:
                try:
                    self.on_playback_backend_call_start(path, output_device_id, perf_counter())
                except Exception:
                    pass
            self._play_worker(samples, sample_rate, output_device_id)
        except Exception as exc:
            if self.on_playback_backend_return is not None:
                try:
                    self.on_playback_backend_return(path, output_device_id, perf_counter())
                except Exception:
                    pass
            if self.on_playback_backend_prep_end is not None:
                try:
                    self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
                except Exception:
                    pass
            return PlaybackResult("Failed", f"Audio replay failed: {exc}", path, output_device_id, used_default_output=used_default_output)
        if self.on_playback_backend_return is not None:
            try:
                self.on_playback_backend_return(path, output_device_id, perf_counter())
            except Exception:
                pass
        if self.on_playback_backend_prep_end is not None:
            try:
                self.on_playback_backend_prep_end(path, output_device_id, perf_counter())
            except Exception:
                pass
        return PlaybackResult(
            "Completed",
            (
                "Audio replay completed."
                if output_device_id is not None
                else "Audio replay completed using Windows default output device."
            ),
            path,
            output_device_id,
            used_default_output=used_default_output,
        )

    def play_wav(self, audio_path: Path | None, *, output_device_id: int | None = None) -> PlaybackResult:
        if audio_path is None:
            return PlaybackResult("Unavailable", "No replay audio path is available.")
        path = Path(audio_path)
        if not path.exists():
            return PlaybackResult("Unavailable", f"Replay audio does not exist: {path}", path, output_device_id)
        if path.suffix.lower() != ".wav":
            return PlaybackResult("Unsupported", "Only WAV playback is supported.", path, output_device_id)
        if self.on_playback_requested is not None:
            try:
                self.on_playback_requested(path, output_device_id, perf_counter())
            except Exception:
                pass
        self._ensure_playback_worker()
        self._playback_queue.put((path, output_device_id))
        if self.on_playback_queued is not None:
            try:
                self.on_playback_queued(path, output_device_id, perf_counter())
            except Exception:
                pass
        return PlaybackResult(
            "Queued",
            "Audio replay queued for sequential playback.",
            path,
            output_device_id,
            used_default_output=output_device_id is None,
        )
