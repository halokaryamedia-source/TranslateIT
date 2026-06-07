from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
import tempfile
from time import perf_counter
import threading
from typing import Any, Callable
import wave

try:  # pragma: no cover - optional runtime dependency
    import onnxruntime as ort
except Exception:  # pragma: no cover - optional dependency missing
    ort = None

try:  # pragma: no cover - optional runtime dependency
    from piper import PiperVoice, SynthesisConfig
except Exception:  # pragma: no cover - optional dependency missing
    PiperVoice = None  # type: ignore[assignment]
    SynthesisConfig = None  # type: ignore[assignment]


def _ensure_piper_runtime() -> tuple[object | None, object | None]:
    global PiperVoice, SynthesisConfig
    if PiperVoice is not None and SynthesisConfig is not None:
        return PiperVoice, SynthesisConfig
    try:  # pragma: no cover - runtime dependency recovery
        from piper import PiperVoice as LoadedPiperVoice, SynthesisConfig as LoadedSynthesisConfig
    except Exception:
        return None, None
    PiperVoice = LoadedPiperVoice  # type: ignore[assignment]
    SynthesisConfig = LoadedSynthesisConfig  # type: ignore[assignment]
    return PiperVoice, SynthesisConfig


@dataclass(slots=True)
class VoiceActorProfile:
    profile_id: str
    display_name: str
    language: str
    model_path: Path
    config_path: Path
    fallback_voice_profile_id: str = ""
    fallback_render_profile: str = "premium"
    model_version: str = ""


@dataclass(slots=True)
class ProviderBenchmark:
    provider_used: str
    provider_benchmark_ms: int
    provider_selection_reason: str
    model_version: str
    voice_profile_id: str
    cached: bool = False
    cuda_benchmark_ms: int = 0
    cpu_benchmark_ms: int = 0


@dataclass(slots=True)
class VoiceProviderSelectionResult:
    benchmark: ProviderBenchmark
    provider: "PiperVoiceActorRenderer | None"


def _safe_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp_path.replace(path)


def _fingerprint_path(path: Path) -> str:
    try:
        stat = path.stat()
    except FileNotFoundError:
        return "missing"
    digest = hashlib.sha256(
        f"{path.resolve()}|{stat.st_size}|{stat.st_mtime_ns}".encode("utf-8")
    ).hexdigest()
    return digest[:16]


def _voice_profile_key(profile_id: str, model_version: str) -> str:
    return f"{profile_id.strip()}|{model_version.strip()}"


def _normalize_profile_id(profile_id: str) -> str:
    value = profile_id.strip()
    if value.startswith("voice-actor:"):
        return value.split(":", 1)[1].strip()
    return value


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def resolve_voice_actor_profile(
    *,
    voice_profiles_root: Path | None,
    voice_profile_id: str,
    explicit_model_path: Path | None = None,
    explicit_config_path: Path | None = None,
) -> VoiceActorProfile | None:
    normalized_profile_id = _normalize_profile_id(voice_profile_id)
    if not normalized_profile_id and explicit_model_path is None:
        return None

    model_path = explicit_model_path
    config_path = explicit_config_path
    if explicit_model_path is not None and not normalized_profile_id:
        display_name = explicit_model_path.stem
    else:
        display_name = normalized_profile_id
    language = "en"
    fallback_voice_profile_id = ""
    fallback_render_profile = "premium"
    model_version = ""

    if voice_profiles_root is not None and normalized_profile_id:
        profile_dir = voice_profiles_root / normalized_profile_id
        manifest_path = profile_dir / "voice_actor.json"
        if manifest_path.exists():
            payload = _load_json(manifest_path)
            display_name = str(payload.get("display_name", normalized_profile_id) or normalized_profile_id)
            language = str(payload.get("language", "en") or "en")
            fallback_voice_profile_id = str(payload.get("fallback_voice_profile_id", "") or "")
            fallback_render_profile = str(payload.get("fallback_render_profile", "premium") or "premium")
            model_path_value = str(payload.get("model_path", "model.onnx") or "model.onnx")
            config_path_value = str(payload.get("config_path", "model.onnx.json") or "model.onnx.json")
            model_path = (profile_dir / model_path_value).resolve()
            config_path = (profile_dir / config_path_value).resolve()
            model_version = _fingerprint_path(model_path) + ":" + _fingerprint_path(config_path)
        else:
            speaker_pack_path = profile_dir / "speaker_pack.json"
            if speaker_pack_path.exists():
                payload = _load_json(speaker_pack_path)
                fallback_voice_profile_id = str(payload.get("fallback_voice_profile_id", "") or "")
                fallback_render_profile = str(payload.get("fallback_render_profile", "premium") or "premium")
                display_name = str(payload.get("display_name", normalized_profile_id) or normalized_profile_id)
                language = str(payload.get("language", "en") or "en")

    if model_path is None:
        return None
    if config_path is None:
        config_path = Path(f"{model_path}.json")
    model_path = model_path.resolve()
    config_path = config_path.resolve()
    model_version = model_version or (_fingerprint_path(model_path) + ":" + _fingerprint_path(config_path))
    return VoiceActorProfile(
        profile_id=normalized_profile_id or model_path.stem,
        display_name=display_name or normalized_profile_id or model_path.stem,
        language=language,
        model_path=model_path,
        config_path=config_path,
        fallback_voice_profile_id=fallback_voice_profile_id,
        fallback_render_profile=fallback_render_profile,
        model_version=model_version,
    )


def discover_voice_actor_profiles(voice_profiles_root: Path | None) -> list[VoiceActorProfile]:
    if voice_profiles_root is None:
        return []
    root = Path(voice_profiles_root).expanduser().resolve()
    if not root.exists():
        return []
    discovered: list[VoiceActorProfile] = []
    for profile_dir in sorted(item for item in root.iterdir() if item.is_dir()):
        profile = resolve_voice_actor_profile(
            voice_profiles_root=root,
            voice_profile_id=profile_dir.name,
        )
        if profile is None:
            continue
        if not profile.model_path.exists():
            continue
        discovered.append(profile)
    discovered.sort(key=lambda item: (item.display_name.lower(), item.profile_id.lower()))
    return discovered


class PiperVoiceActorRenderer:
    def __init__(self, *, profile: VoiceActorProfile, provider_used: str) -> None:
        piper_voice_runtime, synthesis_config_runtime = _ensure_piper_runtime()
        if piper_voice_runtime is None or synthesis_config_runtime is None:  # pragma: no cover - dependency missing
            raise RuntimeError("Piper runtime is unavailable")
        self.profile = profile
        self.provider_used = provider_used
        self.provider_name = provider_used
        self._voice = piper_voice_runtime.load(profile.model_path, config_path=profile.config_path, use_cuda=provider_used == "cuda")
        self._profiles = {
            "live": SynthesisConfig(
                length_scale=0.85,
                noise_scale=0.5,
                noise_w_scale=0.6,
                normalize_audio=False,
            ),
            "premium": SynthesisConfig(
                normalize_audio=True,
            ),
        }

    @staticmethod
    def _safe_timeout_text() -> str:
        return "halo"

    def _resolve_syn_config(self, render_profile: str, *, prosody_hints: dict[str, object] | None = None):
        base = self._profiles.get(render_profile, self._profiles["live"])
        if not prosody_hints:
            return base
        try:
            length_scale = float(prosody_hints.get("length_scale", getattr(base, "length_scale", 1.0) or 1.0))
            noise_scale = float(prosody_hints.get("noise_scale", getattr(base, "noise_scale", 0.667) or 0.667))
            noise_w_scale = float(prosody_hints.get("noise_w_scale", getattr(base, "noise_w_scale", 0.8) or 0.8))
            normalize_audio = bool(getattr(base, "normalize_audio", False))
            return SynthesisConfig(
                length_scale=max(0.6, min(1.3, length_scale)),
                noise_scale=max(0.2, min(1.0, noise_scale)),
                noise_w_scale=max(0.2, min(1.0, noise_w_scale)),
                normalize_audio=normalize_audio,
            )
        except Exception:
            return base

    def render(
        self,
        text: str,
        *,
        output_path: Path,
        render_profile: str = "live",
        prosody_hints: dict[str, object] | None = None,
    ) -> dict[str, Any]:
        payload = text.strip()
        if not payload:
            raise RuntimeError("No text was provided for voice rendering")
        chunks = list(self._voice.synthesize(payload, syn_config=self._resolve_syn_config(render_profile, prosody_hints=prosody_hints)))
        if not chunks:
            raise RuntimeError("Piper returned no audio chunks.")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        total_samples = 0
        with wave.open(str(output_path), "wb") as handle:
            handle.setnchannels(chunks[0].sample_channels)
            handle.setsampwidth(chunks[0].sample_width)
            handle.setframerate(chunks[0].sample_rate)
            for chunk in chunks:
                total_samples += len(chunk.audio_int16_array)
                handle.writeframes(chunk.audio_int16_bytes)
        duration_ms = (total_samples / chunks[0].sample_rate) * 1000.0
        return {
            "artifact_path": str(output_path),
            "duration_ms": duration_ms,
            "sample_rate_hz": chunks[0].sample_rate,
            "provider_name": self.provider_name,
            "provider_used": self.provider_used,
            "detail": f"Piper runtime/{render_profile}",
        }


class VoiceProviderSelector:
    def __init__(
        self,
        cache_path: Path,
        *,
        benchmark_text: str = "halo",
        benchmark_timeout_ms: int = 1200,
    ) -> None:
        self._cache_path = cache_path
        self._benchmark_text = benchmark_text
        self._benchmark_timeout_ms = max(250, int(benchmark_timeout_ms))
        self._decision_cache: dict[str, ProviderBenchmark] = {}
        self._renderer_cache: dict[tuple[str, str, str], PiperVoiceActorRenderer] = {}
        self._lock = threading.Lock()
        self._load_cache()

    def _load_cache(self) -> None:
        payload = _load_json(self._cache_path)
        cached_entries = payload.get("entries", {})
        if not isinstance(cached_entries, dict):
            return
        for key, entry in cached_entries.items():
            if not isinstance(entry, dict):
                continue
            try:
                self._decision_cache[str(key)] = ProviderBenchmark(
                    provider_used=str(entry.get("provider_used", "") or ""),
                    provider_benchmark_ms=int(entry.get("provider_benchmark_ms", 0) or 0),
                    provider_selection_reason=str(entry.get("provider_selection_reason", "") or ""),
                    model_version=str(entry.get("model_version", "") or ""),
                    voice_profile_id=str(entry.get("voice_profile_id", "") or ""),
                    cached=True,
                    cuda_benchmark_ms=int(entry.get("cuda_benchmark_ms", 0) or 0),
                    cpu_benchmark_ms=int(entry.get("cpu_benchmark_ms", 0) or 0),
                )
            except Exception:
                continue

    def _save_cache(self) -> None:
        payload = {
            "entries": {
                key: asdict(value)
                for key, value in self._decision_cache.items()
            }
        }
        _safe_json_write(self._cache_path, payload)

    def _available_providers(self) -> list[str]:
        if ort is None:
            return ["cpu"]
        try:
            available = {str(item) for item in ort.get_available_providers()}
        except Exception:
            return ["cpu"]
        providers = ["cpu"]
        if "CUDAExecutionProvider" in available:
            providers.insert(0, "cuda")
        return providers

    def _run_with_timeout(self, func: Callable[[], dict[str, Any]], timeout_ms: int | None = None) -> dict[str, Any]:
        box: dict[str, Any] = {}
        error_box: list[BaseException] = []

        def runner() -> None:
            try:
                box.update(func())
            except BaseException as exc:  # pragma: no cover - defensive
                error_box.append(exc)

        thread = threading.Thread(target=runner, daemon=True)
        thread.start()
        effective_timeout_ms = self._benchmark_timeout_ms if timeout_ms is None else max(1, int(timeout_ms))
        thread.join(timeout=effective_timeout_ms / 1000.0)
        if thread.is_alive():
            raise TimeoutError("voice provider benchmark timed out")
        if error_box:
            raise error_box[0]
        return box

    def _build_renderer(self, profile: VoiceActorProfile, provider_used: str) -> PiperVoiceActorRenderer:
        return PiperVoiceActorRenderer(profile=profile, provider_used=provider_used)

    def _benchmark_renderer(self, renderer: PiperVoiceActorRenderer) -> int:
        with tempfile.TemporaryDirectory(prefix="translateit-voice-benchmark-") as temp_dir:
            temp_path = Path(temp_dir) / "warmup.wav"
            started = perf_counter()
            renderer.render(self._benchmark_text, output_path=temp_path, render_profile="live")
            if not temp_path.exists():
                raise RuntimeError("voice provider benchmark did not produce audio")
            return int((perf_counter() - started) * 1000)

    def select_provider(
        self,
        profile: VoiceActorProfile,
        *,
        force_retest: bool = False,
    ) -> VoiceProviderSelectionResult:
        cache_key = _voice_profile_key(profile.profile_id, profile.model_version)
        with self._lock:
            cached = None if force_retest else self._decision_cache.get(cache_key)
            if cached is not None:
                cached.cached = True
                renderer = self._renderer_cache.get((profile.profile_id, profile.model_version, cached.provider_used))
                if renderer is None and cached.provider_used in {"cuda", "cpu"}:
                    try:
                        renderer = self._build_renderer(profile, cached.provider_used)
                        self._renderer_cache[(profile.profile_id, profile.model_version, cached.provider_used)] = renderer
                    except Exception:
                        renderer = None
                if renderer is not None or cached.provider_used == "default_voice":
                    return VoiceProviderSelectionResult(benchmark=cached, provider=renderer)

        available_providers = self._available_providers()
        cuda_requested = "cuda" in available_providers
        cuda_result: dict[str, Any] | None = None
        cpu_result: dict[str, Any] | None = None
        cuda_failure_reason = ""
        cpu_failure_reason = ""
        selection_reason = ""

        def benchmark_provider(provider_used: str) -> dict[str, Any]:
            started = perf_counter()
            renderer = self._build_renderer(profile, provider_used)
            benchmark_ms = self._benchmark_renderer(renderer)
            return {
                "provider_used": provider_used,
                "provider_benchmark_ms": benchmark_ms,
                "renderer": renderer,
                "elapsed_ms": int((perf_counter() - started) * 1000),
            }

        if cuda_requested:
            try:
                cuda_result = self._run_with_timeout(lambda: benchmark_provider("cuda"), timeout_ms=min(self._benchmark_timeout_ms, 800))
            except TimeoutError:
                cuda_failure_reason = "cuda_failed_warmup"
            except Exception:
                cuda_failure_reason = "cuda_render_failed"

        try:
            cpu_result = self._run_with_timeout(lambda: benchmark_provider("cpu"), timeout_ms=max(self._benchmark_timeout_ms, 5000))
        except TimeoutError:
            cpu_failure_reason = "cpu_fallback"
        except Exception:
            cpu_failure_reason = "cpu_fallback"

        if cuda_result is None and cpu_result is None:
            benchmark = ProviderBenchmark(
                provider_used="default_voice",
                provider_benchmark_ms=0,
                provider_selection_reason="default_voice_fallback",
                model_version=profile.model_version,
                voice_profile_id=profile.profile_id,
                cached=False,
            )
            with self._lock:
                self._decision_cache[cache_key] = benchmark
                self._save_cache()
            return VoiceProviderSelectionResult(benchmark=benchmark, provider=None)

        selected_provider = "default_voice"
        selected_ms = 0
        selected_renderer: PiperVoiceActorRenderer | None = None
        selected_reason = ""

        if cuda_result is not None and cpu_result is not None:
            cuda_ms = int(cuda_result["provider_benchmark_ms"])
            cpu_ms = int(cpu_result["provider_benchmark_ms"])
            if cuda_ms < cpu_ms:
                selected_provider = "cuda"
                selected_ms = cuda_ms
                selected_renderer = cuda_result["renderer"]
                selected_reason = "cuda_fastest"
            else:
                selected_provider = "cpu"
                selected_ms = cpu_ms
                selected_renderer = cpu_result["renderer"]
                selected_reason = "cpu_fastest"
        elif cuda_result is not None:
            selected_provider = "cuda"
            selected_ms = int(cuda_result["provider_benchmark_ms"])
            selected_renderer = cuda_result["renderer"]
            selected_reason = "cuda_fastest"
        elif cpu_result is not None:
            selected_provider = "cpu"
            selected_ms = int(cpu_result["provider_benchmark_ms"])
            selected_renderer = cpu_result["renderer"]
            if cuda_requested:
                selected_reason = cuda_failure_reason or "cuda_failed_warmup"
            else:
                selected_reason = "cuda_unavailable"
        else:
            selected_provider = "default_voice"
            selected_ms = 0
            selected_renderer = None
            selected_reason = "default_voice_fallback"

        benchmark = ProviderBenchmark(
            provider_used=selected_provider,
            provider_benchmark_ms=selected_ms,
            provider_selection_reason=selected_reason or cuda_failure_reason or cpu_failure_reason or "cpu_fallback",
            model_version=profile.model_version,
            voice_profile_id=profile.profile_id,
            cached=False,
            cuda_benchmark_ms=int(cuda_result["provider_benchmark_ms"]) if cuda_result is not None else 0,
            cpu_benchmark_ms=int(cpu_result["provider_benchmark_ms"]) if cpu_result is not None else 0,
        )
        with self._lock:
            self._decision_cache[cache_key] = benchmark
            if selected_renderer is not None:
                self._renderer_cache[(profile.profile_id, profile.model_version, selected_provider)] = selected_renderer
            self._save_cache()
        return VoiceProviderSelectionResult(benchmark=benchmark, provider=selected_renderer)
