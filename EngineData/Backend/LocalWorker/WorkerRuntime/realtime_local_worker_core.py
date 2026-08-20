from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import translation_envelope
import voice_lab_gpt_sovits as voice_actor_provider

SCRIPT_ROOT = Path(__file__).resolve().parents[4]


def configured_absolute_root(environment_name: str, fallback: Path) -> Path:
    raw = str(os.environ.get(environment_name, "")).strip()
    if not raw:
        return fallback.resolve()
    candidate = Path(raw)
    if not candidate.is_absolute():
        raise RuntimeError(f"worker:{environment_name.lower()}_must_be_absolute")
    return candidate.resolve()


RUNTIME_ROOT = configured_absolute_root("TRANSLATEIT_RUNTIME_ROOT", SCRIPT_ROOT)
USER_DATA_ROOT = configured_absolute_root("TRANSLATEIT_USER_DATA_ROOT", SCRIPT_ROOT / "UserData")
RUNTIME_ASSETS_ROOT = RUNTIME_ROOT / "EngineData" / "Backend" / "RuntimeAssets"
ASR_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "ASR" / "ModelData"
TRANSLATION_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "Translation" / "ModelData"
ASR_MODEL = ASR_MODEL_ROOT / "faster-whisper-large-v3-turbo"
ASR_BACKUP_MODEL = ASR_MODEL_ROOT / "faster-whisper-medium"
TRANSLATION_MODEL = TRANSLATION_MODEL_ROOT / "m2m100-418m"
GPT_SOVITS_SOURCE_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "GPTSoVITS" / "Source"
VOICE_ACTOR_ROOT = USER_DATA_ROOT / "SavedProject" / "VoiceLab" / "MyVoice"
CACHE_ROOT = USER_DATA_ROOT / "CacheData"
LOG_ROOT = USER_DATA_ROOT / "LogData"
ALLOWED_INPUT_ROOTS = [CACHE_ROOT, LOG_ROOT]
ALLOWED_OUTPUT_ROOTS = [CACHE_ROOT]

MAX_WORKER_REQUEST_BYTES = 1_000_000
MAX_TRANSLATION_TEXT_CHARS = 2_000
MAX_TTS_TEXT_CHARS = 1_000
MAX_TRANSCRIPT_TEXT_CHARS = 4_000
MAX_AUDIO_INPUT_BYTES = 25 * 1024 * 1024
MAX_REASONABLE_MODEL_TOKEN_LIMIT = 1_000_000

ASR_RUNTIME: Any | None = None
ASR_RUNTIME_DEVICE = "not_loaded"
ASR_RUNTIME_COMPUTE = "not_loaded"
ASR_RUNTIME_MODEL_ID = "not_loaded"
TRANSLATION_RUNTIME: dict[str, dict[str, Any]] = {}
VOICE_ACTOR_RUNTIME: dict[str, Any] | None = None
VOICE_ACTOR_RUNTIME_FINGERPRINT: Any | None = None


def now_ms() -> int:
    return int(time.time() * 1000)


def request_deadline_remaining_ms(payload: dict[str, Any] | None) -> int | None:
    if not isinstance(payload, dict):
        return None
    try:
        deadline = int(payload.get("deadline_unix_ms", 0))
    except (TypeError, ValueError):
        return None
    if deadline <= 0:
        return None
    return max(0, deadline - now_ms())


def request_deadline_expired(payload: dict[str, Any] | None) -> bool:
    remaining = request_deadline_remaining_ms(payload)
    return remaining is not None and remaining <= 0


def import_ready(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception:
        return False


def bounded_int(value: Any, fallback: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except Exception:
        parsed = fallback
    return max(minimum, min(maximum, parsed))


def bounded_float(value: Any, fallback: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value)
    except Exception:
        parsed = fallback
    return max(minimum, min(maximum, parsed))


def compact_runtime_text(value: Any, max_chars: int) -> str:
    text = str(value or "").strip().replace("\x00", "")
    compact = " ".join(text.split())
    return compact[:max_chars] if len(compact) > max_chars else compact


def runtime_text_too_large(value: Any, max_chars: int) -> bool:
    return len(str(value or "")) > max_chars


def safe_command_name(value: Any) -> str:
    text = str(value or "status").strip().lower()
    return "".join(
        character
        for character in text
        if character.isascii() and (character.isalnum() or character == "_")
    )[:64]


def torch_status() -> dict[str, Any]:
    try:
        import torch
    except Exception as exc:
        return {
            "import_ready": False,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": f"dependency:torch_import_failed:{type(exc).__name__}",
        }

    try:
        cuda_available = bool(torch.cuda.is_available())
    except Exception as exc:
        return {
            "import_ready": True,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": f"cuda:torch_probe_failed:{type(exc).__name__}",
        }
    return {
        "import_ready": True,
        "cuda_probe_ok": True,
        "cuda_available": cuda_available,
        "blocker": "",
    }


def ctranslate2_status() -> dict[str, Any]:
    try:
        import ctranslate2
    except Exception as exc:
        return {
            "import_ready": False,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": f"dependency:ctranslate2_import_failed:{type(exc).__name__}",
        }

    probe = getattr(ctranslate2, "get_cuda_device_count", None)
    if not callable(probe):
        return {
            "import_ready": True,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": "cuda:ctranslate2_probe_unavailable",
        }
    try:
        cuda_available = int(probe()) > 0
    except Exception as exc:
        return {
            "import_ready": True,
            "cuda_probe_ok": False,
            "cuda_available": False,
            "blocker": f"cuda:ctranslate2_probe_failed:{type(exc).__name__}",
        }
    return {
        "import_ready": True,
        "cuda_probe_ok": True,
        "cuda_available": cuda_available,
        "blocker": "",
    }


def probe_gpu_runtime(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    torch_probe = torch_status()
    ctranslate2_probe = ctranslate2_status()
    torch_ready = bool(torch_probe["import_ready"])
    torch_probe_ok = bool(torch_probe["cuda_probe_ok"])
    torch_cuda_available = bool(torch_probe["cuda_available"])
    ctranslate2_ready = bool(ctranslate2_probe["import_ready"])
    ctranslate2_probe_ok = bool(ctranslate2_probe["cuda_probe_ok"])
    ctranslate2_cuda_available = bool(ctranslate2_probe["cuda_available"])

    cuda_capability_known = (
        torch_ready and torch_probe_ok and ctranslate2_ready and ctranslate2_probe_ok
    )
    cpu_fallback_active = cuda_capability_known and (
        not torch_cuda_available or not ctranslate2_cuda_available
    )

    if ctranslate2_ready and ctranslate2_probe_ok:
        selected_device = "cuda" if ctranslate2_cuda_available else "cpu"
        selected_compute_type = "int8_float16" if ctranslate2_cuda_available else "int8"
    else:
        selected_device = "blocked"
        selected_compute_type = "blocked"

    if torch_ready and torch_probe_ok:
        selected_translation_device = "cuda" if torch_cuda_available else "cpu"
    else:
        selected_translation_device = "blocked"

    probe_blockers = [
        blocker for blocker in (torch_probe["blocker"], ctranslate2_probe["blocker"]) if blocker
    ]

    return {
        "torch_import_ready": torch_ready,
        "torch_cuda_probe_ok": torch_probe_ok,
        "torch_cuda_available": torch_cuda_available,
        "torch_cuda_probe_blocker": str(torch_probe["blocker"]),
        "ctranslate2_import_ready": ctranslate2_ready,
        "ctranslate2_cuda_probe_ok": ctranslate2_probe_ok,
        "ctranslate2_cuda_available": ctranslate2_cuda_available,
        "ctranslate2_cuda_probe_blocker": str(ctranslate2_probe["blocker"]),
        "cuda_capability_known": cuda_capability_known,
        "cpu_fallback_active": cpu_fallback_active,
        "cuda_probe_blocker": ";".join(probe_blockers),
        "cuda_primary_requested": True,
        "selected_device": selected_device,
        "selected_translation_device": selected_translation_device,
        "selected_compute_type": selected_compute_type,
        "fallback_reason": "cuda_unavailable" if cpu_fallback_active else "",
    }


def normalize_language(value: Any, fallback: str) -> str:
    text = str(value or fallback).strip().lower().replace("_latn", "")
    if text.startswith("ind") or text == "id":
        return "id"
    if text.startswith("eng") or text == "en":
        return "en"
    return text[:2] if text else fallback


def direction_pair(source_language: str, target_language: str) -> str:
    return (
        f"{normalize_language(source_language, 'id')}->{normalize_language(target_language, 'en')}"
    )


def translation_model_for_direction(
    source_language: str, target_language: str
) -> tuple[str, Path] | None:
    pair = direction_pair(source_language, target_language)
    if pair in {"id->en", "en->id"}:
        return "m2m100-418m", TRANSLATION_MODEL
    return None


def clear_voice_actor_runtime() -> None:
    global VOICE_ACTOR_RUNTIME, VOICE_ACTOR_RUNTIME_FINGERPRINT
    VOICE_ACTOR_RUNTIME = None
    VOICE_ACTOR_RUNTIME_FINGERPRINT = None


def voice_actor_blocker(exc: Exception) -> str:
    detail = str(exc).strip()
    if isinstance(exc, voice_actor_provider.VoiceLabProviderError) and detail:
        safe = "".join(character for character in detail if character.isascii() and (character.isalnum() or character in "_:-"))
        if safe:
            return f"voice_actor:{safe[:160]}"
    return f"voice_actor:runtime_failed:{type(exc).__name__}"


def voice_actor_package_token(package: dict[str, Any]) -> str:
    fingerprint = package.get("fingerprint")
    if not isinstance(fingerprint, tuple) or not fingerprint:
        raise voice_actor_provider.VoiceLabProviderError("actor_identity_missing")
    token = json.dumps(fingerprint, ensure_ascii=True, separators=(",", ":"))
    if not token or len(token) > 512:
        raise voice_actor_provider.VoiceLabProviderError("actor_identity_invalid")
    return token


def voice_actor_static_status() -> dict[str, Any]:
    try:
        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
        voice_actor_provider.inference_source_assets(GPT_SOVITS_SOURCE_ROOT)
        return {
            "ready": True,
            "actor_token": voice_actor_package_token(package),
            "blocker": "",
        }
    except Exception as exc:
        clear_voice_actor_runtime()
        return {
            "ready": False,
            "actor_token": "",
            "blocker": voice_actor_blocker(exc),
        }


def get_voice_actor_runtime() -> dict[str, Any]:
    global VOICE_ACTOR_RUNTIME, VOICE_ACTOR_RUNTIME_FINGERPRINT
    try:
        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
    except Exception:
        clear_voice_actor_runtime()
        raise
    fingerprint = package["fingerprint"]
    if VOICE_ACTOR_RUNTIME is not None and VOICE_ACTOR_RUNTIME_FINGERPRINT == fingerprint:
        return VOICE_ACTOR_RUNTIME
    clear_voice_actor_runtime()
    runtime = voice_actor_provider.load_voice_actor_runtime(GPT_SOVITS_SOURCE_ROOT, VOICE_ACTOR_ROOT)
    if runtime.get("fingerprint") != fingerprint:
        clear_voice_actor_runtime()
        raise voice_actor_provider.VoiceLabProviderError("actor_changed_during_load")
    latest = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
    if latest["fingerprint"] != fingerprint:
        clear_voice_actor_runtime()
        raise voice_actor_provider.VoiceLabProviderError("actor_changed_during_load")
    VOICE_ACTOR_RUNTIME = runtime
    VOICE_ACTOR_RUNTIME_FINGERPRINT = fingerprint
    return runtime


def resolve_worker_path(value: Any, default_path: Path, allowed_roots: list[Path]) -> Path:
    raw = str(value).strip() if value not in (None, "") else str(default_path)
    path = Path(raw)
    if not path.is_absolute():
        normalized = raw.replace("\\", "/")
        if normalized == "UserData" or normalized.startswith("UserData/"):
            relative = normalized.removeprefix("UserData").lstrip("/")
            path = USER_DATA_ROOT / relative
        else:
            path = RUNTIME_ROOT / path
    resolved = path.resolve()
    allowed = [root.resolve() for root in allowed_roots]
    if not any(resolved == root or root in resolved.parents for root in allowed):
        raise ValueError("worker:path_outside_allowed_roots")
    return resolved


def has_any(path: Path, patterns: tuple[str, ...]) -> bool:
    return path.is_dir() and any(
        any(item.is_file() for item in path.glob(pattern)) for pattern in patterns
    )


def asr_model_ready(path: Path) -> bool:
    return (
        (path / "model.bin").is_file()
        and (path / "config.json").is_file()
        and has_any(path, ("tokenizer.json", "tokenizer.model", "vocabulary.json"))
    )


def translation_model_ready(path: Path) -> bool:
    return (
        (path / "config.json").is_file()
        and (path / "generation_config.json").is_file()
        and (path / "pytorch_model.bin").is_file()
        and (path / "sentencepiece.bpe.model").is_file()
        and (path / "vocab.json").is_file()
    )


def choose_asr_model() -> tuple[str, Path]:
    if asr_model_ready(ASR_MODEL):
        return "faster-whisper-large-v3-turbo", ASR_MODEL
    if asr_model_ready(ASR_BACKUP_MODEL):
        return "faster-whisper-medium", ASR_BACKUP_MODEL
    return "faster-whisper-large-v3-turbo", ASR_MODEL


def status_action_items(blockers: list[str], warnings: list[str]) -> list[str]:
    actions: list[str] = []
    joined = ";".join(blockers + warnings)
    if "dependency:" in joined:
        actions.append("Install WorkerRuntime Python dependencies inside the worker environment.")
    if "faster_whisper" in joined:
        actions.append("Provide the approved local faster-whisper ASR runtime/model assets.")
    if "transformers" in joined or "torch" in joined:
        actions.append("Install torch and transformers for local translation.")
    if "m2m100_418m" in joined:
        actions.append("Provide pinned m2m100-418m under RuntimeAssets/Translation/ModelData.")
    if "voice_actor:" in joined:
        actions.append(
            "Create and approve My Voice in VoiceLab, or repair the installed VoiceLab runtime assets."
        )
    if "cuda_unavailable" in joined:
        actions.append(
            "CUDA is optional; known unavailability uses explicit CPU degraded operation."
        )
    if "cuda:" in joined:
        actions.append(
            "Repair the locked CUDA runtime/probe failure; do not mask it with CPU fallback."
        )
    return list(dict.fromkeys(actions))


def build_status_payload(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    faster_whisper_ready = import_ready("faster_whisper")
    transformers_ready = import_ready("transformers")
    gpu_runtime = probe_gpu_runtime(payload)
    torch_ready = bool(gpu_runtime["torch_import_ready"])
    torch_cuda_probe_ok = bool(gpu_runtime["torch_cuda_probe_ok"])
    cuda_available = bool(gpu_runtime["torch_cuda_available"])
    ctranslate2_ready = bool(gpu_runtime["ctranslate2_import_ready"])
    ctranslate2_probe_ok = bool(gpu_runtime["ctranslate2_cuda_probe_ok"])
    ctranslate2_cuda_available = bool(gpu_runtime["ctranslate2_cuda_available"])
    cuda_capability_known = bool(gpu_runtime["cuda_capability_known"])
    cpu_fallback_active = bool(gpu_runtime["cpu_fallback_active"])

    asr_primary_ready = asr_model_ready(ASR_MODEL)
    asr_backup_ready = asr_model_ready(ASR_BACKUP_MODEL)
    asr_active_ready = asr_primary_ready or asr_backup_ready
    asr_active_model_id, asr_active_model_path = choose_asr_model()
    asr_readiness_grade = (
        "primary" if asr_primary_ready else "fallback_degraded" if asr_backup_ready else "blocked"
    )

    translation_model_available = translation_model_ready(TRANSLATION_MODEL)
    translation_id_en_ready = translation_model_available
    translation_en_id_ready = translation_model_available
    translation_bidirectional_ready = translation_model_available
    actor_status = voice_actor_static_status()
    voice_actor_ready = bool(actor_status["ready"])

    blockers: list[str] = []
    warnings: list[str] = []
    if not faster_whisper_ready:
        blockers.append("dependency:faster_whisper_missing")
    if not transformers_ready:
        blockers.append("dependency:transformers_missing")
    if not torch_ready:
        blockers.append("dependency:torch_missing")
    if not ctranslate2_ready:
        blockers.append("dependency:ctranslate2_missing")
    if torch_ready and not torch_cuda_probe_ok:
        blockers.append(str(gpu_runtime["torch_cuda_probe_blocker"]))
    if ctranslate2_ready and not ctranslate2_probe_ok:
        blockers.append(str(gpu_runtime["ctranslate2_cuda_probe_blocker"]))
    if not asr_active_ready:
        blockers.append("model:faster_whisper_large_v3_turbo_and_medium_missing")
    elif not asr_primary_ready:
        warnings.append("asr_primary_large_v3_turbo_missing_using_medium_fallback")
    if not asr_backup_ready:
        warnings.append("asr_backup_faster_whisper_medium_missing")
    if not translation_model_available:
        blockers.append("model:m2m100_418m_missing")
    if not voice_actor_ready:
        blockers.append(str(actor_status["blocker"]))
    if cpu_fallback_active:
        warnings.append("cuda_unavailable_cpu_fallback_active")

    provider_ready = (
        faster_whisper_ready
        and torch_ready
        and ctranslate2_ready
        and torch_cuda_probe_ok
        and ctranslate2_probe_ok
        and transformers_ready
        and asr_active_ready
        and translation_id_en_ready
        and voice_actor_ready
    )
    note = (
        "Worker reports the required outbound AI capabilities available."
        if provider_ready
        else "Worker is running, but one or more required outbound AI capabilities are unavailable."
    )
    if cpu_fallback_active:
        note += " CUDA capability is unavailable; CPU fallback is explicit degraded operation."
    elif not cuda_capability_known and (torch_ready or ctranslate2_ready):
        note += " CUDA capability probing failed; CPU fallback was not activated."

    return {
        "ok": provider_ready,
        "stage": "local_realtime_worker_preflight",
        "blocker": ";".join(blockers),
        "blockers": blockers,
        "warnings": warnings,
        "next_actions": status_action_items(blockers, warnings),
        "note": note,
        "provider_ready": provider_ready,
        "readiness": {
            "asr": asr_active_ready and faster_whisper_ready,
            "translation_id_en": translation_id_en_ready and transformers_ready and torch_ready,
            "translation_en_id": translation_en_id_ready and transformers_ready and torch_ready,
            "translation_bidirectional": translation_bidirectional_ready
            and transformers_ready
            and torch_ready,
            "voice_actor_tts": voice_actor_ready,
            "cuda_degraded": cpu_fallback_active,
        },
        "dependencies": {
            "faster_whisper": faster_whisper_ready,
            "transformers": transformers_ready,
            "torch": torch_ready,
            "ctranslate2": bool(gpu_runtime["ctranslate2_import_ready"]),
        },
        "models": {
            "asr_primary": {
                "id": "faster-whisper-large-v3-turbo",
                "ready": asr_primary_ready,
                "path": str(ASR_MODEL),
            },
            "asr_backup": {
                "id": "faster-whisper-medium",
                "ready": asr_backup_ready,
                "path": str(ASR_BACKUP_MODEL),
            },
            "translation_id_en": {
                "id": "m2m100-418m",
                "ready": translation_id_en_ready,
                "path": str(TRANSLATION_MODEL),
            },
            "translation_en_id": {
                "id": "m2m100-418m",
                "ready": translation_en_id_ready,
                "path": str(TRANSLATION_MODEL),
            },
        },
        "tts": {
            "ready": voice_actor_ready,
            "provider": "gpt-sovits-v2proplus" if voice_actor_ready else None,
            "voice_id": "MyVoice" if voice_actor_ready else None,
            "language_code": "en",
            "blocker": str(actor_status["blocker"]),
            "actor_token": str(actor_status["actor_token"]),
        },
        "gpu": gpu_runtime,
        "asr_primary_model_ready": asr_primary_ready,
        "asr_model_ready": asr_active_ready,
        "asr_backup_model_ready": asr_backup_ready,
        "asr_active_model_id": asr_active_model_id,
        "asr_active_model_path": str(asr_active_model_path),
        "asr_readiness_grade": asr_readiness_grade,
        "translation_id_en_ready": translation_id_en_ready,
        "translation_en_id_ready": translation_en_id_ready,
        "translation_bidirectional_ready": translation_bidirectional_ready,
        "voice_actor_ready": voice_actor_ready,
        "voice_actor_token": str(actor_status["actor_token"]),
        "faster_whisper_import_ready": faster_whisper_ready,
        "transformers_import_ready": transformers_ready,
        "torch_import_ready": torch_ready,
        "torch_cuda_available": cuda_available,
        "ctranslate2_cuda_available": ctranslate2_cuda_available,
        "gpu_primary_requested": bool(gpu_runtime["cuda_primary_requested"]),
        "selected_device": str(gpu_runtime["selected_device"]),
        "selected_translation_device": str(gpu_runtime["selected_translation_device"]),
        "selected_compute_type": str(gpu_runtime["selected_compute_type"]),
        "fallback_reason": str(gpu_runtime["fallback_reason"]),
        "cuda_capability_known": cuda_capability_known,
        "cpu_fallback_active": cpu_fallback_active,
        "cuda_probe_blocker": str(gpu_runtime["cuda_probe_blocker"]),
        "loaded": {
            "asr": ASR_RUNTIME is not None,
            "asr_device": ASR_RUNTIME_DEVICE,
            "asr_compute_type": ASR_RUNTIME_COMPUTE,
            "asr_model_id": ASR_RUNTIME_MODEL_ID,
            "translation_directions": sorted(TRANSLATION_RUNTIME.keys()),
            "voice_actor": VOICE_ACTOR_RUNTIME is not None,
            "voice_actor_device": str(VOICE_ACTOR_RUNTIME.get("device", "not_loaded")) if VOICE_ACTOR_RUNTIME else "not_loaded",
        },
    }


def handle_status(_: dict[str, Any]) -> dict[str, Any]:
    return build_status_payload(_)


def handle_ping(_: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "stage": "ping", "unix_ms": now_ms()}


def asr_runtime_config(payload: dict[str, Any] | None = None) -> tuple[str, str, str]:
    gpu_runtime = probe_gpu_runtime(payload)
    selected_device = str(gpu_runtime["selected_device"])
    if selected_device == "blocked":
        blocker = str(gpu_runtime["cuda_probe_blocker"] or "cuda:ctranslate2_capability_unknown")
        raise RuntimeError(blocker)
    if selected_device == "cuda":
        return "cuda", "int8_float16", ""
    return "cpu", "int8", str(gpu_runtime["fallback_reason"])


def get_asr_runtime(payload: dict[str, Any] | None = None) -> Any:
    global ASR_RUNTIME, ASR_RUNTIME_DEVICE, ASR_RUNTIME_COMPUTE, ASR_RUNTIME_MODEL_ID
    if ASR_RUNTIME is not None:
        return ASR_RUNTIME
    from faster_whisper import WhisperModel

    device, compute_type, _fallback_reason = asr_runtime_config(payload)
    model_id, model_path = choose_asr_model()
    ASR_RUNTIME = WhisperModel(str(model_path), device=device, compute_type=compute_type)
    ASR_RUNTIME_DEVICE = device
    ASR_RUNTIME_COMPUTE = compute_type
    ASR_RUNTIME_MODEL_ID = model_id
    return ASR_RUNTIME


def failed_from_status(
    stage: str, status: dict[str, Any], extra: dict[str, Any] | None = None
) -> dict[str, Any]:
    payload = {
        "ok": False,
        "stage": stage,
        "blocker": status.get("blocker", "runtime:not_ready"),
        "blockers": status.get("blockers", []),
        "warnings": status.get("warnings", []),
        "next_actions": status.get("next_actions", []),
        "note": status.get("note", "Runtime is not ready."),
        "selected_device": status.get("selected_device"),
        "selected_compute_type": status.get("selected_compute_type"),
        "fallback_reason": status.get("fallback_reason"),
    }
    if extra:
        payload.update(extra)
    return payload


def handle_asr_preload(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    status = build_status_payload(payload)
    if not status["faster_whisper_import_ready"] or not status["asr_model_ready"]:
        return failed_from_status(
            "asr_preload",
            status,
            {
                "model_id": status["asr_active_model_id"],
                "model_path": status["asr_active_model_path"],
            },
        )
    try:
        get_asr_runtime(payload)
        return {
            "ok": True,
            "stage": "asr_preload",
            "model_path": str(choose_asr_model()[1]),
            "model_id": choose_asr_model()[0],
            "device": ASR_RUNTIME_DEVICE,
            "compute_type": ASR_RUNTIME_COMPUTE,
            "fallback_reason": ""
            if ASR_RUNTIME_DEVICE == "cuda"
            else "cuda_unavailable_cpu_fallback_active",
            "elapsed_ms": now_ms() - started,
            "warnings": status.get("warnings", []),
            "note": "ASR model loaded for local transcription.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "asr_preload",
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }


def handle_transcribe(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    try:
        audio_path = resolve_worker_path(
            payload.get("audio_path", ""),
            CACHE_ROOT / "audio_segments" / "latest_live_target_segment.wav",
            ALLOWED_INPUT_ROOTS,
        )
    except Exception as exc:
        return {
            "ok": False,
            "stage": "transcribe",
            "blocker": type(exc).__name__,
            "note": str(exc),
        }
    if not audio_path.is_file():
        return {
            "ok": False,
            "stage": "transcribe",
            "blocker": "asr:audio_file_missing",
            "audio_path": str(audio_path),
        }
    if audio_path.stat().st_size > MAX_AUDIO_INPUT_BYTES:
        return {
            "ok": False,
            "stage": "transcribe",
            "blocker": "asr:audio_file_too_large",
            "max_bytes": MAX_AUDIO_INPUT_BYTES,
        }
    try:
        model = get_asr_runtime(payload)
        segments, info = model.transcribe(
            str(audio_path),
            language=normalize_language(payload.get("language", "id"), "id"),
            task="transcribe",
            beam_size=bounded_int(payload.get("beam_size", 1), 1, 1, 5),
            temperature=bounded_float(payload.get("temperature", 0), 0.0, 0.0, 1.0),
            condition_on_previous_text=False,
            vad_filter=bool(payload.get("vad_filter", True)),
            word_timestamps=False,
        )
        text = compact_runtime_text(
            " ".join(segment.text.strip() for segment in segments),
            MAX_TRANSCRIPT_TEXT_CHARS,
        )
        return {
            "ok": bool(text),
            "stage": "transcribe",
            "transcript_text": text,
            "language": getattr(info, "language", "id"),
            "language_probability": float(getattr(info, "language_probability", 0.0)),
            "device": ASR_RUNTIME_DEVICE,
            "compute_type": ASR_RUNTIME_COMPUTE,
            "model_id": ASR_RUNTIME_MODEL_ID,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if text else "asr:empty_transcript",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "transcribe",
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }


def translation_runtime_config() -> tuple[str, str]:
    probe = torch_status()
    if not probe["import_ready"]:
        raise RuntimeError(str(probe["blocker"] or "dependency:torch_missing"))
    if not probe["cuda_probe_ok"]:
        raise RuntimeError(str(probe["blocker"] or "cuda:torch_capability_unknown"))
    if probe["cuda_available"]:
        return "cuda", ""
    return "cpu", "torch_cuda_unavailable"


def get_translation_runtime(source_language: str, target_language: str) -> dict[str, Any]:
    pair = direction_pair(source_language, target_language)
    selected = translation_model_for_direction(source_language, target_language)
    if selected is None:
        raise ValueError("translation:direction_not_supported")
    if pair in TRANSLATION_RUNTIME:
        return TRANSLATION_RUNTIME[pair]

    if TRANSLATION_RUNTIME:
        shared = next(iter(TRANSLATION_RUNTIME.values()))
        runtime = dict(shared)
        runtime["direction_pair"] = pair
        TRANSLATION_RUNTIME[pair] = runtime
        return runtime

    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    model_id, model_path = selected
    device, fallback_reason = translation_runtime_config()
    device_note = "cuda_available" if device == "cuda" else "cpu_runtime"
    degraded = device != "cuda"
    tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(str(model_path), local_files_only=True)
    if not callable(getattr(tokenizer, "get_lang_id", None)):
        raise RuntimeError("translation:m2m100_language_token_api_unavailable")
    if device == "cuda":
        model = model.to("cuda")
    model.eval()
    runtime = {
        "direction_pair": pair,
        "model_id": model_id,
        "model_path": str(model_path),
        "tokenizer": tokenizer,
        "model": model,
        "device": device,
        "device_note": device_note,
        "translation_gpu_requested": True,
        "translation_torch_cuda_available": device == "cuda",
        "translation_degraded": degraded,
        "translation_fallback_reason": fallback_reason,
    }
    TRANSLATION_RUNTIME[pair] = runtime
    return runtime


def handle_translation_preload(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    source_language = normalize_language(payload.get("source_language", "id"), "id")
    target_language = normalize_language(payload.get("target_language", "en"), "en")
    pair = direction_pair(source_language, target_language)
    selected = translation_model_for_direction(source_language, target_language)
    if selected is None:
        return {
            "ok": False,
            "stage": "translation_preload",
            "direction_pair": pair,
            "blocker": "translation:direction_not_supported",
            "note": "Initial translation core supports only Indonesian <-> English.",
        }
    model_id, model_path = selected
    model_ready = translation_model_ready(model_path)
    status = build_status_payload(payload)
    if (
        not status["transformers_import_ready"]
        or not status["torch_import_ready"]
        or not model_ready
    ):
        blockers = list(status.get("blockers", []))
        if not model_ready:
            blockers.append("model:m2m100_418m_missing")
        return failed_from_status(
            "translation_preload",
            {**status, "blocker": ";".join(blockers), "blockers": blockers},
            {
                "model_id": model_id,
                "model_path": str(model_path),
                "direction_pair": pair,
            },
        )
    try:
        runtime = get_translation_runtime(source_language, target_language)
        return {
            "ok": True,
            "stage": "translation_preload",
            "model_path": str(model_path),
            "model_id": model_id,
            "direction_pair": pair,
            "device": runtime["device"],
            "device_note": runtime["device_note"],
            "translation_gpu_requested": runtime["translation_gpu_requested"],
            "translation_torch_cuda_available": runtime["translation_torch_cuda_available"],
            "translation_degraded": runtime["translation_degraded"],
            "translation_fallback_reason": runtime["translation_fallback_reason"],
            "elapsed_ms": now_ms() - started,
            "warnings": status.get("warnings", []),
            "note": "Canonical bidirectional translation model loaded for the requested language direction.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "translation_preload",
            "model_id": model_id,
            "direction_pair": pair,
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }


def move_inputs_to_device(inputs: Any, device: str) -> Any:
    if device != "cuda":
        return inputs
    return {key: value.to("cuda") for key, value in inputs.items()}


def input_token_count(inputs: Any) -> int | None:
    try:
        input_ids = inputs["input_ids"]
        shape = getattr(input_ids, "shape", None)
        if shape is None or len(shape) < 2:
            return None
        return int(shape[-1])
    except Exception:
        return None


def translation_input_token_limit(tokenizer: Any, model: Any) -> int | None:
    return translation_envelope.input_token_limit(
        tokenizer, model, MAX_REASONABLE_MODEL_TOKEN_LIMIT
    )


def normalized_token_id_set(value: Any) -> set[int]:
    if value is None:
        return set()
    if isinstance(value, (list, tuple, set)):
        values = value
    else:
        values = [value]
    result: set[int] = set()
    for item in values:
        try:
            token_id = int(item)
        except Exception:
            continue
        if token_id >= 0:
            result.add(token_id)
    return result


def generation_eos_token_ids(tokenizer: Any, model: Any) -> set[int]:
    token_ids = normalized_token_id_set(getattr(tokenizer, "eos_token_id", None))
    generation_config = getattr(model, "generation_config", None)
    token_ids.update(normalized_token_id_set(getattr(generation_config, "eos_token_id", None)))
    config = getattr(model, "config", None)
    token_ids.update(normalized_token_id_set(getattr(config, "eos_token_id", None)))
    return token_ids


def generation_pad_token_ids(tokenizer: Any, model: Any) -> set[int]:
    token_ids = normalized_token_id_set(getattr(tokenizer, "pad_token_id", None))
    generation_config = getattr(model, "generation_config", None)
    token_ids.update(normalized_token_id_set(getattr(generation_config, "pad_token_id", None)))
    config = getattr(model, "config", None)
    token_ids.update(normalized_token_id_set(getattr(config, "pad_token_id", None)))
    return token_ids


def first_sequence_token_ids(sequences: Any) -> list[int] | None:
    try:
        first = sequences[0]
    except Exception:
        return None
    try:
        raw = first.tolist()
    except Exception:
        raw = first
    if not isinstance(raw, (list, tuple)):
        return None
    result: list[int] = []
    for item in raw:
        try:
            result.append(int(item))
        except Exception:
            return None
    return result


def trim_trailing_pad_token_ids(
    sequence_ids: list[int], tokenizer: Any, model: Any
) -> list[int]:
    effective = list(sequence_ids)
    pad_ids = generation_pad_token_ids(tokenizer, model)
    while effective and effective[-1] in pad_ids:
        effective.pop()
    return effective


def generated_token_count(sequence_ids: list[int], model: Any) -> int | None:
    if not sequence_ids:
        return None
    config = getattr(model, "config", None)
    is_encoder_decoder = bool(getattr(config, "is_encoder_decoder", False))
    if is_encoder_decoder:
        return max(0, len(sequence_ids) - 1)
    return len(sequence_ids)


def translation_generation_completion(
    sequences: Any,
    tokenizer: Any,
    model: Any,
    max_new_tokens: int,
) -> dict[str, Any]:
    raw_sequence_ids = first_sequence_token_ids(sequences)
    if raw_sequence_ids is None or not raw_sequence_ids:
        return {
            "complete": False,
            "blocker": "translation:output_completion_unverifiable",
            "finished_with_eos": False,
            "generated_tokens": None,
            "hit_token_ceiling": None,
        }

    sequence_ids = trim_trailing_pad_token_ids(raw_sequence_ids, tokenizer, model)
    if not sequence_ids:
        return {
            "complete": False,
            "blocker": "translation:output_completion_unverifiable",
            "finished_with_eos": False,
            "generated_tokens": None,
            "hit_token_ceiling": None,
        }

    eos_ids = generation_eos_token_ids(tokenizer, model)
    if not eos_ids:
        return {
            "complete": False,
            "blocker": "translation:eos_token_unavailable",
            "finished_with_eos": False,
            "generated_tokens": generated_token_count(sequence_ids, model),
            "hit_token_ceiling": None,
        }

    count = generated_token_count(sequence_ids, model)
    if count is None:
        return {
            "complete": False,
            "blocker": "translation:output_completion_unverifiable",
            "finished_with_eos": False,
            "generated_tokens": None,
            "hit_token_ceiling": None,
        }

    finished_with_eos = sequence_ids[-1] in eos_ids
    hit_token_ceiling = count >= max_new_tokens
    if not finished_with_eos:
        return {
            "complete": False,
            "blocker": (
                "translation:output_hit_token_ceiling_without_eos"
                if hit_token_ceiling
                else "translation:output_ended_without_eos"
            ),
            "finished_with_eos": False,
            "generated_tokens": count,
            "hit_token_ceiling": hit_token_ceiling,
        }

    return {
        "complete": True,
        "blocker": "",
        "finished_with_eos": True,
        "generated_tokens": count,
        "hit_token_ceiling": hit_token_ceiling,
    }


def translation_generation_options(
    tokenizer: Any, target_language: str, max_new_tokens: int
) -> dict[str, Any]:
    get_lang_id = getattr(tokenizer, "get_lang_id", None)
    if not callable(get_lang_id):
        raise RuntimeError("translation:m2m100_language_token_api_unavailable")
    try:
        target_language_id = int(get_lang_id(target_language))
    except Exception as exc:
        raise RuntimeError("translation:target_language_token_unavailable") from exc
    return {
        "max_new_tokens": max_new_tokens,
        "forced_bos_token_id": target_language_id,
        "return_dict_in_generate": True,
    }


def handle_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TRANSLATION_TEXT_CHARS):
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:text_too_large",
            "max_chars": MAX_TRANSLATION_TEXT_CHARS,
        }

    text = translation_envelope.compact_unit(payload.get("text", ""))
    source_language = normalize_language(payload.get("source_language", "id"), "id")
    target_language = normalize_language(payload.get("target_language", "en"), "en")
    pair = direction_pair(source_language, target_language)
    selected = translation_model_for_direction(source_language, target_language)

    if not text:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:empty_text",
            "direction_pair": pair,
        }
    if selected is None:
        return {
            "ok": False,
            "stage": "translate",
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": False,
            "blocker": "translation:direction_not_supported",
            "note": "Initial translation core supports only Indonesian <-> English.",
            "elapsed_ms": now_ms() - started,
        }

    model_id, model_path = selected
    if not translation_model_ready(model_path):
        return {
            "ok": False,
            "stage": "translate",
            "model_id": model_id,
            "model_path": str(model_path),
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": True,
            "blocker": "model:m2m100_418m_missing",
            "note": "The pinned local bidirectional translation model is not installed or incomplete.",
            "elapsed_ms": now_ms() - started,
        }

    try:
        runtime = get_translation_runtime(source_language, target_language)
        tokenizer = runtime["tokenizer"]
        model = runtime["model"]
        device = runtime["device"]

        tokenizer.src_lang = source_language
        inputs = tokenizer(text, return_tensors="pt", truncation=False)
        token_count = input_token_count(inputs)
        max_input_tokens = translation_input_token_limit(tokenizer, model)
        if token_count is None:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": runtime["model_id"],
                "direction_pair": pair,
                "blocker": "translation:input_token_count_unavailable",
                "note": "Translation was not executed because input token count could not be verified safely.",
                "elapsed_ms": now_ms() - started,
            }
        if max_input_tokens is None:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": runtime["model_id"],
                "direction_pair": pair,
                "input_tokens": token_count,
                "blocker": "translation:model_input_limit_unknown",
                "note": "Translation was not executed because the active model/tokenizer did not expose a trustworthy input limit.",
                "elapsed_ms": now_ms() - started,
            }
        if token_count > max_input_tokens:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": runtime["model_id"],
                "source_language": source_language,
                "target_language": target_language,
                "direction_pair": pair,
                "input_tokens": token_count,
                "max_input_tokens": max_input_tokens,
                "blocker": "translation:input_too_long_for_model",
                "note": "Source text was rejected before inference; no tokenizer truncation was performed.",
                "elapsed_ms": now_ms() - started,
            }

        max_new_tokens = translation_envelope.adaptive_generation_budget(
            payload.get("max_new_tokens", translation_envelope.MIN_GENERATION_TOKENS),
            token_count,
            tokenizer,
            model,
            max_input_tokens,
            MAX_REASONABLE_MODEL_TOKEN_LIMIT,
        )
        inputs = move_inputs_to_device(inputs, device)
        generation_options = translation_generation_options(
            tokenizer, target_language, max_new_tokens
        )
        import torch

        with torch.inference_mode():
            generation = model.generate(**inputs, **generation_options)
        sequences = getattr(generation, "sequences", None)
        if sequences is None:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": runtime["model_id"],
                "direction_pair": pair,
                "generation_budget_tokens": max_new_tokens,
                "blocker": "translation:missing_generation_sequences",
                "note": "Translation output was not promoted because generation sequences were unavailable.",
                "elapsed_ms": now_ms() - started,
            }

        completion = translation_generation_completion(sequences, tokenizer, model, max_new_tokens)
        if not completion["complete"]:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": runtime["model_id"],
                "device": device,
                "source_language": source_language,
                "target_language": target_language,
                "direction_pair": pair,
                "input_tokens": token_count,
                "max_input_tokens": max_input_tokens,
                "generation_budget_tokens": max_new_tokens,
                **completion,
                "note": "Generated translation was rejected because normal EOS completion could not be verified. No partial translation should be promoted to Text or TTS.",
                "elapsed_ms": now_ms() - started,
            }

        decoded = tokenizer.batch_decode(sequences, skip_special_tokens=True)[0]
        translated = translation_envelope.compact_unit(decoded)
        return {
            "ok": bool(translated),
            "stage": "translate",
            "translation_contract": "canonical_bidirectional_id_en",
            "model_id": runtime["model_id"],
            "device": device,
            "device_note": runtime["device_note"],
            "translation_gpu_requested": runtime["translation_gpu_requested"],
            "translation_torch_cuda_available": runtime["translation_torch_cuda_available"],
            "translation_degraded": runtime["translation_degraded"],
            "translation_fallback_reason": runtime["translation_fallback_reason"],
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": True,
            "input_tokens": token_count,
            "max_input_tokens": max_input_tokens,
            "generation_budget_tokens": max_new_tokens,
            **completion,
            "translated_text": translated,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if translated else "translation:empty_output",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "translate",
            "model_id": model_id,
            "blocker": type(exc).__name__,
            "note": str(exc),
            "direction_pair": pair,
            "elapsed_ms": now_ms() - started,
        }


def handle_standalone_text_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    raw_source = translation_envelope.clean_source_text(payload.get("text", ""))
    if not raw_source:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:empty_text",
        }
    if len(raw_source) > MAX_TRANSLATION_TEXT_CHARS:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:text_too_large",
            "max_chars": MAX_TRANSLATION_TEXT_CHARS,
        }

    source_language = normalize_language(payload.get("source_language", "id"), "id")
    target_language = normalize_language(payload.get("target_language", "en"), "en")
    pair = direction_pair(source_language, target_language)
    selected = translation_model_for_direction(source_language, target_language)
    if selected is None:
        return handle_translate(payload)
    model_id, model_path = selected
    if not translation_model_ready(model_path):
        return handle_translate(payload)

    try:
        runtime = get_translation_runtime(source_language, target_language)
        tokenizer = runtime["tokenizer"]
        model = runtime["model"]
        tokenizer.src_lang = source_language
        max_input_tokens = translation_input_token_limit(tokenizer, model)
        if max_input_tokens is None:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": model_id,
                "direction_pair": pair,
                "blocker": "translation:model_input_limit_unknown",
                "note": "Standalone Text could not build a safe chunk plan because the model input limit is unknown.",
                "elapsed_ms": now_ms() - started,
            }
        try:
            plan = translation_envelope.standalone_plan(
                raw_source, tokenizer, max_input_tokens
            )
        except translation_envelope.TranslationEnvelopeError as exc:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": model_id,
                "direction_pair": pair,
                "blocker": str(exc),
                "note": "Standalone Text could not be split into a complete safe translation plan. No partial result was promoted.",
                "elapsed_ms": now_ms() - started,
            }
        if not plan:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": model_id,
                "direction_pair": pair,
                "blocker": "translation:standalone_chunk_plan_empty",
                "elapsed_ms": now_ms() - started,
            }

        chunk_total = sum(len(paragraph) for paragraph in plan)
        chunk_index = 0
        paragraph_outputs: list[list[str]] = []
        total_input_tokens = 0
        total_generated_tokens = 0
        max_generation_budget = 0
        any_token_ceiling = False
        last_success: dict[str, Any] | None = None

        for paragraph in plan:
            translated_paragraph: list[str] = []
            for chunk in paragraph:
                chunk_index += 1
                if request_deadline_expired(payload):
                    return {
                        "ok": False,
                        "stage": "translate",
                        "model_id": model_id,
                        "direction_pair": pair,
                        "chunk_index": chunk_index,
                        "chunk_count": chunk_total,
                        "paragraph_count": len(plan),
                        "blocker": "worker:request_deadline_expired",
                        "note": "Standalone Text stopped before the next chunk because the bounded worker deadline expired. No partial result was promoted.",
                        "elapsed_ms": now_ms() - started,
                    }

                chunk_payload = dict(payload)
                chunk_payload["text"] = chunk
                chunk_payload["request_kind"] = "standalone_text_chunk"
                result = handle_translate(chunk_payload)
                if not result.get("ok"):
                    failed = dict(result)
                    failed.update(
                        {
                            "ok": False,
                            "translated_text": "",
                            "chunk_index": chunk_index,
                            "chunk_count": chunk_total,
                            "paragraph_count": len(plan),
                            "note": "Standalone Text failed before every required chunk completed. No partial translation was promoted.",
                            "elapsed_ms": now_ms() - started,
                        }
                    )
                    return failed

                translated_chunk = str(result.get("translated_text", "")).strip()
                if not translated_chunk:
                    return {
                        "ok": False,
                        "stage": "translate",
                        "model_id": model_id,
                        "direction_pair": pair,
                        "chunk_index": chunk_index,
                        "chunk_count": chunk_total,
                        "paragraph_count": len(plan),
                        "blocker": "translation:empty_output",
                        "note": "Standalone Text produced an empty required chunk. No partial translation was promoted.",
                        "elapsed_ms": now_ms() - started,
                    }
                translated_paragraph.append(translated_chunk)
                total_input_tokens += int(result.get("input_tokens") or 0)
                total_generated_tokens += int(result.get("generated_tokens") or 0)
                max_generation_budget = max(
                    max_generation_budget,
                    int(result.get("generation_budget_tokens") or 0),
                )
                any_token_ceiling = any_token_ceiling or bool(
                    result.get("hit_token_ceiling")
                )
                last_success = result
            paragraph_outputs.append(translated_paragraph)

        translated = translation_envelope.reassemble(paragraph_outputs)
        if not translated or last_success is None:
            return {
                "ok": False,
                "stage": "translate",
                "model_id": model_id,
                "direction_pair": pair,
                "blocker": "translation:empty_output",
                "note": "Standalone Text completed no promotable translation.",
                "elapsed_ms": now_ms() - started,
            }

        combined = dict(last_success)
        combined.update(
            {
                "ok": True,
                "stage": "translate",
                "translation_contract": "canonical_bidirectional_id_en",
                "complete": True,
                "finished_with_eos": True,
                "translated_text": translated,
                "input_tokens": total_input_tokens,
                "generated_tokens": total_generated_tokens,
                "generation_budget_tokens": max_generation_budget,
                "hit_token_ceiling": any_token_ceiling,
                "chunk_count": chunk_total,
                "paragraph_count": len(plan),
                "paragraph_structure_preserved": True,
                "elapsed_ms": now_ms() - started,
                "blocker": "",
            }
        )
        return combined
    except Exception as exc:
        return {
            "ok": False,
            "stage": "translate",
            "model_id": model_id,
            "blocker": type(exc).__name__,
            "note": str(exc),
            "direction_pair": pair,
            "elapsed_ms": now_ms() - started,
        }


def handle_translate_request(payload: dict[str, Any]) -> dict[str, Any]:
    request_kind = str(payload.get("request_kind", "")).strip().lower()
    if request_kind == "standalone_text":
        return handle_standalone_text_translate(payload)
    return handle_translate(payload)


def handle_voice_actor_preflight(_payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    try:
        runtime = get_voice_actor_runtime()
        actor_token = voice_actor_package_token({"fingerprint": runtime.get("fingerprint")})
        return {
            "ok": True,
            "stage": "voice_actor_preflight",
            "voice_id": "MyVoice",
            "language_code": "en",
            "device": str(runtime.get("device", "unknown")),
            "reference_cached": bool(runtime.get("reference_cached")),
            "actor_token": actor_token,
            "elapsed_ms": now_ms() - started,
            "blocker": "",
            "note": "The approved My Voice actor is loaded for local English synthesis.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "voice_actor_preflight",
            "voice_id": "MyVoice",
            "language_code": "en",
            "actor_token": "",
            "blocker": voice_actor_blocker(exc),
            "elapsed_ms": now_ms() - started,
            "note": "The approved My Voice actor could not be loaded.",
        }


def handle_voice_actor_synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TTS_TEXT_CHARS):
        return {
            "ok": False,
            "stage": "voice_actor_synthesize",
            "blocker": "voice_actor:text_too_large",
            "max_chars": MAX_TTS_TEXT_CHARS,
        }
    actor_text = compact_runtime_text(payload.get("text", ""), MAX_TTS_TEXT_CHARS)
    if not actor_text:
        return {"ok": False, "stage": "voice_actor_synthesize", "blocker": "voice_actor:empty_text"}
    try:
        output_path = resolve_worker_path(
            payload.get("output_path", ""),
            CACHE_ROOT / "voice_actor_output.wav",
            ALLOWED_OUTPUT_ROOTS,
        )
    except Exception as exc:
        return {
            "ok": False,
            "stage": "voice_actor_synthesize",
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.unlink(missing_ok=True)
    try:
        expected_actor_token = compact_runtime_text(payload.get("expected_actor_token", ""), 512)
        package = voice_actor_provider.validate_actor_package(VOICE_ACTOR_ROOT)
        actor_token = voice_actor_package_token(package)
        if expected_actor_token and actor_token != expected_actor_token:
            clear_voice_actor_runtime()
            raise voice_actor_provider.VoiceLabProviderError("actor_changed_since_meeting_start")
        runtime = get_voice_actor_runtime()
        runtime_token = voice_actor_package_token({"fingerprint": runtime.get("fingerprint")})
        if expected_actor_token and runtime_token != expected_actor_token:
            clear_voice_actor_runtime()
            raise voice_actor_provider.VoiceLabProviderError("actor_changed_since_meeting_start")
        synthesis = voice_actor_provider.synthesize_voice_actor(runtime, actor_text, output_path)
        if not output_path.is_file() or output_path.stat().st_size <= 44:
            raise voice_actor_provider.VoiceLabProviderError("inference_audio_invalid")
        return {
            "ok": True,
            "stage": "voice_actor_synthesize",
            "voice_id": "MyVoice",
            "language_code": "en",
            "device": synthesis["device"],
            "reference_cached": synthesis["reference_cached"],
            "sample_rate": synthesis["sample_rate"],
            "actor_token": runtime_token,
            "output_path": str(output_path),
            "elapsed_ms": now_ms() - started,
            "blocker": "",
        }
    except Exception as exc:
        output_path.unlink(missing_ok=True)
        return {
            "ok": False,
            "stage": "voice_actor_synthesize",
            "voice_id": "MyVoice",
            "language_code": "en",
            "blocker": voice_actor_blocker(exc),
            "elapsed_ms": now_ms() - started,
            "note": "My Voice synthesis failed without switching to another voice.",
        }


HANDLERS = {
    "ping": handle_ping,
    "status": handle_status,
    "asr_preload": handle_asr_preload,
    "transcribe": handle_transcribe,
    "translation_preload": handle_translation_preload,
    "translate": handle_translate_request,
    "voice_actor_preflight": handle_voice_actor_preflight,
    "voice_actor_synthesize": handle_voice_actor_synthesize,
}


def respond(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    for raw in sys.stdin:
        if len(raw.encode("utf-8", errors="ignore")) > MAX_WORKER_REQUEST_BYTES:
            respond(
                {
                    "ok": False,
                    "stage": "worker_request",
                    "blocker": "worker:request_too_large",
                    "max_bytes": MAX_WORKER_REQUEST_BYTES,
                }
            )
            continue
        try:
            request = json.loads(raw)
            if not isinstance(request, dict):
                respond(
                    {
                        "ok": False,
                        "stage": "worker_request",
                        "blocker": "worker:request_must_be_object",
                    }
                )
                continue
            command = safe_command_name(request.get("command", "status"))
            if request_deadline_expired(request):
                respond(
                    {
                        "ok": False,
                        "stage": command or "worker_request",
                        "blocker": "worker:request_deadline_expired",
                        "note": "The request reached the worker after its host deadline and was not executed.",
                    }
                )
                continue
            handler = HANDLERS.get(command)
            if handler is None:
                respond(
                    {
                        "ok": False,
                        "stage": command or "unknown",
                        "blocker": "worker:unknown_command",
                    }
                )
                continue
            respond(handler(request))
        except Exception as exc:
            respond(
                {
                    "ok": False,
                    "stage": "worker_error",
                    "blocker": type(exc).__name__,
                    "note": str(exc),
                }
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
