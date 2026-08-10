from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

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
USER_DATA_ROOT = configured_absolute_root(
    "TRANSLATEIT_USER_DATA_ROOT", SCRIPT_ROOT / "UserData"
)
RUNTIME_ASSETS_ROOT = RUNTIME_ROOT / "EngineData" / "Backend" / "RuntimeAssets"
ASR_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "ASR" / "ModelData"
TRANSLATION_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "Translation" / "ModelData"
ASR_MODEL = ASR_MODEL_ROOT / "faster-whisper-large-v3-turbo"
ASR_BACKUP_MODEL = ASR_MODEL_ROOT / "faster-whisper-medium"
TRANSLATION_MODEL_ID_EN = TRANSLATION_MODEL_ROOT / "marianmt-id-en"
TRANSLATION_MODEL_EN_ID = TRANSLATION_MODEL_ROOT / "marianmt-en-id"
PIPER_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "Piper"
CACHE_ROOT = USER_DATA_ROOT / "CacheData"
LOG_ROOT = USER_DATA_ROOT / "LogData"
ALLOWED_INPUT_ROOTS = [CACHE_ROOT, LOG_ROOT]
ALLOWED_OUTPUT_ROOTS = [CACHE_ROOT]

MAX_WORKER_REQUEST_BYTES = 1_000_000
MAX_TRANSLATION_TEXT_CHARS = 2_000
MAX_TTS_TEXT_CHARS = 1_000
MAX_TRANSCRIPT_TEXT_CHARS = 4_000
MAX_AUDIO_INPUT_BYTES = 25 * 1024 * 1024
MAX_GENERATION_TOKENS = 128
MAX_REASONABLE_MODEL_TOKEN_LIMIT = 1_000_000

ASR_RUNTIME: Any | None = None
ASR_RUNTIME_DEVICE = "not_loaded"
ASR_RUNTIME_COMPUTE = "not_loaded"
ASR_RUNTIME_MODEL_ID = "not_loaded"
TRANSLATION_RUNTIME: dict[str, dict[str, Any]] = {}
SAPI_STATUS: tuple[bool, list[dict[str, str]], str] | None = None


def now_ms() -> int:
    return int(time.time() * 1000)


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


def compatibility_mode_label(value: Any) -> str:
    """Keep old caller response shape while model routing no longer depends on mode."""
    text = str(value or "").strip().lower()
    if text == "quality":
        return "Quality"
    if text == "realtime":
        return "Realtime"
    return "Canonical"


def torch_status() -> tuple[bool, bool]:
    try:
        import torch

        return True, bool(torch.cuda.is_available())
    except Exception:
        return False, False


def ctranslate2_status() -> tuple[bool, bool]:
    try:
        import ctranslate2

        probe = getattr(ctranslate2, "get_cuda_device_count", None)
        if callable(probe):
            return True, int(probe()) > 0
        return True, False
    except Exception:
        return False, False


def nvidia_smi_available() -> bool:
    try:
        completed = subprocess.run(
            ["nvidia-smi", "-L"],
            text=True,
            capture_output=True,
            timeout=10,
            check=False,
        )
        return completed.returncode == 0 and bool(completed.stdout.strip())
    except Exception:
        return False


def probe_gpu_runtime() -> dict[str, Any]:
    torch_ready, torch_cuda_available = torch_status()
    ctranslate2_ready, ctranslate2_cuda_available = ctranslate2_status()
    return {
        "torch_import_ready": torch_ready,
        "torch_cuda_available": torch_cuda_available,
        "ctranslate2_import_ready": ctranslate2_ready,
        "ctranslate2_cuda_available": ctranslate2_cuda_available,
        "nvidia_smi_available": nvidia_smi_available(),
        "cuda_primary_requested": True,
        "selected_device": "cuda" if ctranslate2_cuda_available else "cpu",
        "selected_translation_device": "cuda" if torch_cuda_available else "cpu",
        "selected_compute_type": "int8_float16" if ctranslate2_cuda_available else "int8",
        "fallback_reason": "" if ctranslate2_cuda_available else "cuda_unavailable",
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
        f"{normalize_language(source_language, 'id')}"
        f"->{normalize_language(target_language, 'en')}"
    )


def translation_model_for_direction(
    source_language: str, target_language: str
) -> tuple[str, Path] | None:
    pair = direction_pair(source_language, target_language)
    if pair == "id->en":
        return "marianmt-id-en", TRANSLATION_MODEL_ID_EN
    if pair == "en->id":
        return "marianmt-en-id", TRANSLATION_MODEL_EN_ID
    return None


def normalize_tts_language_code(value: Any) -> str:
    return str(value or "").strip().replace("_", "-").lower()


def is_english_language_code(value: Any) -> bool:
    code = normalize_tts_language_code(value)
    return code == "en" or code.startswith("en-")


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
    if not (path / "config.json").is_file():
        return False
    if not has_any(path, ("*.safetensors", "pytorch_model*.bin")):
        return False
    return has_any(path, ("source.spm", "tokenizer.json", "spiece.model")) and has_any(
        path, ("target.spm", "tokenizer.json", "spiece.model")
    )


def piper_voice_config_path(voice_path: Path) -> Path:
    return Path(f"{voice_path}.json")


def piper_voice_language_code(voice_path: Path) -> str | None:
    config_path = piper_voice_config_path(voice_path)
    if not config_path.is_file():
        return None
    try:
        payload = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception:
        return None

    language = payload.get("language")
    if isinstance(language, dict):
        for key in ("code", "family"):
            code = normalize_tts_language_code(language.get(key))
            if code:
                return code
    elif isinstance(language, str):
        code = normalize_tts_language_code(language)
        if code:
            return code

    espeak = payload.get("espeak")
    if isinstance(espeak, dict):
        code = normalize_tts_language_code(espeak.get("voice"))
        if code:
            return code
    return None


def select_english_piper_voice(root: Path | None = None) -> dict[str, Any] | None:
    root = root or PIPER_ROOT
    if not root.exists():
        return None

    candidates: list[dict[str, Any]] = []
    for voice_path in sorted(root.glob("**/*.onnx")):
        language_code = piper_voice_language_code(voice_path)
        if not is_english_language_code(language_code):
            continue
        candidates.append(
            {
                "voice_id": voice_path.stem,
                "language_code": normalize_tts_language_code(language_code),
                "voice_path": voice_path,
                "config_path": piper_voice_config_path(voice_path),
            }
        )

    if not candidates:
        return None
    candidates.sort(
        key=lambda item: (
            0 if item["language_code"] == "en-us" else 1,
            item["language_code"],
            item["voice_id"].lower(),
            str(item["voice_path"]).lower(),
        )
    )
    return candidates[0]


def normalize_sapi_voices(raw: Any) -> list[dict[str, str]]:
    if isinstance(raw, dict):
        raw_items = [raw]
    elif isinstance(raw, list):
        raw_items = raw
    else:
        raw_items = []

    voices: list[dict[str, str]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = compact_runtime_text(item.get("name"), 200)
        culture = normalize_tts_language_code(item.get("culture"))
        if name:
            voices.append({"name": name, "culture": culture})
    return voices


def sapi_status() -> tuple[bool, list[dict[str, str]], str]:
    global SAPI_STATUS
    if SAPI_STATUS is not None:
        return SAPI_STATUS
    if sys.platform != "win32":
        SAPI_STATUS = (False, [], "tts:windows_sapi_unavailable")
        return SAPI_STATUS

    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$voices = @($s.GetInstalledVoices() | ForEach-Object { "
        "@{name=$_.VoiceInfo.Name; culture=$_.VoiceInfo.Culture.Name} }); "
        "$s.Dispose(); "
        "@{voices=$voices} | ConvertTo-Json -Compress -Depth 4"
    )
    try:
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
            text=True,
            capture_output=True,
            timeout=20,
            check=False,
        )
        if completed.returncode != 0:
            SAPI_STATUS = (False, [], completed.stderr.strip() or "tts:sapi_probe_failed")
        else:
            payload = json.loads(completed.stdout.strip())
            voices = normalize_sapi_voices(payload.get("voices", []))
            SAPI_STATUS = (bool(voices), voices, "")
    except Exception as exc:
        SAPI_STATUS = (False, [], f"{type(exc).__name__}:{exc}")
    return SAPI_STATUS


def select_english_sapi_voice(
    voices: list[dict[str, str]] | None = None,
) -> dict[str, str] | None:
    if voices is None:
        _ready, voices, _error = sapi_status()
    candidates = [
        voice
        for voice in (voices or [])
        if voice.get("name") and is_english_language_code(voice.get("culture"))
    ]
    if not candidates:
        return None
    candidates.sort(
        key=lambda item: (
            0 if normalize_tts_language_code(item.get("culture")) == "en-us" else 1,
            normalize_tts_language_code(item.get("culture")),
            item.get("name", "").lower(),
        )
    )
    selected = candidates[0]
    return {
        "name": selected["name"],
        "culture": normalize_tts_language_code(selected.get("culture")),
    }


def select_english_tts_voice() -> dict[str, Any]:
    executable = PIPER_ROOT / "piper.exe"
    piper_voice = select_english_piper_voice()
    if executable.is_file() and piper_voice is not None:
        return {
            "ok": True,
            "provider": "piper",
            "voice_id": piper_voice["voice_id"],
            "language_code": piper_voice["language_code"],
            "voice_path": piper_voice["voice_path"],
            "config_path": piper_voice["config_path"],
            "sapi_voices": [],
            "blocker": "",
        }

    sapi_probe_ready, sapi_voices, sapi_error = sapi_status()
    sapi_voice = select_english_sapi_voice(sapi_voices)
    if sapi_probe_ready and sapi_voice is not None:
        return {
            "ok": True,
            "provider": "windows-sapi",
            "voice_id": sapi_voice["name"],
            "language_code": sapi_voice["culture"],
            "voice_path": None,
            "config_path": None,
            "sapi_voices": sapi_voices,
            "blocker": "",
        }

    if sapi_probe_ready and sapi_voice is None:
        blocker = "tts:no_english_sapi_voice"
    elif executable.is_file() and piper_voice is None:
        blocker = "tts:no_verified_english_piper_voice"
    else:
        blocker = sapi_error or "tts:no_verified_english_voice_available"
    return {
        "ok": False,
        "provider": None,
        "voice_id": None,
        "language_code": None,
        "voice_path": None,
        "config_path": None,
        "sapi_voices": sapi_voices,
        "blocker": blocker,
    }


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
    if "marianmt_id_en" in joined:
        actions.append(
            "Provide marianmt-id-en under RuntimeAssets/Translation/ModelData."
        )
    if "marianmt_en_id" in joined:
        actions.append(
            "Provide marianmt-en-id under RuntimeAssets/Translation/ModelData for EN -> ID translation."
        )
    if "tts:" in joined:
        actions.append(
            "Provide a Piper English voice with metadata or an installed Windows SAPI English voice."
        )
    if "cuda" in joined:
        actions.append("CUDA is optional; CPU fallback remains explicit degraded operation.")
    return list(dict.fromkeys(actions))


def build_status_payload() -> dict[str, Any]:
    faster_whisper_ready = import_ready("faster_whisper")
    transformers_ready = import_ready("transformers")
    gpu_runtime = probe_gpu_runtime()
    torch_ready = bool(gpu_runtime["torch_import_ready"])
    cuda_available = bool(gpu_runtime["torch_cuda_available"])
    ctranslate2_cuda_available = bool(gpu_runtime["ctranslate2_cuda_available"])

    asr_primary_ready = asr_model_ready(ASR_MODEL)
    asr_backup_ready = asr_model_ready(ASR_BACKUP_MODEL)
    asr_active_ready = asr_primary_ready or asr_backup_ready
    asr_active_model_id, asr_active_model_path = choose_asr_model()
    asr_readiness_grade = (
        "primary"
        if asr_primary_ready
        else "fallback_degraded"
        if asr_backup_ready
        else "blocked"
    )

    translation_id_en_ready = translation_model_ready(TRANSLATION_MODEL_ID_EN)
    translation_en_id_ready = translation_model_ready(TRANSLATION_MODEL_EN_ID)
    translation_bidirectional_ready = translation_id_en_ready and translation_en_id_ready
    tts_selection = select_english_tts_voice()
    tts_ready = bool(tts_selection["ok"])

    blockers: list[str] = []
    warnings: list[str] = []
    if not faster_whisper_ready:
        blockers.append("dependency:faster_whisper_missing")
    if not transformers_ready:
        blockers.append("dependency:transformers_missing")
    if not torch_ready:
        blockers.append("dependency:torch_missing")
    if not asr_active_ready:
        blockers.append("model:faster_whisper_large_v3_turbo_and_medium_missing")
    elif not asr_primary_ready:
        warnings.append("asr_primary_large_v3_turbo_missing_using_medium_fallback")
    if not asr_backup_ready:
        warnings.append("asr_backup_faster_whisper_medium_missing")
    if not translation_id_en_ready:
        blockers.append("model:marianmt_id_en_missing")
    if not translation_en_id_ready:
        warnings.append("model:marianmt_en_id_missing_reverse_translation_unavailable")
    if not tts_ready:
        blockers.append(tts_selection["blocker"])
    if not cuda_available or not ctranslate2_cuda_available:
        warnings.append("cuda_unavailable_cpu_fallback_active")

    # `ok/provider_ready` intentionally represent the required outbound Meeting path.
    # Reverse EN -> ID is separately visible because incoming is optional and must not
    # block an otherwise healthy outbound Meeting start.
    provider_ready = (
        faster_whisper_ready
        and torch_ready
        and transformers_ready
        and asr_active_ready
        and translation_id_en_ready
        and tts_ready
    )
    note = (
        "Worker reports the required outbound AI capabilities available."
        if provider_ready
        else "Worker is running, but one or more required outbound AI capabilities are unavailable."
    )
    if provider_ready and not translation_en_id_ready:
        note += " EN -> ID translation is unavailable, so optional incoming/Text reverse translation is degraded."
    if not cuda_available or not ctranslate2_cuda_available:
        note += " CUDA is not fully available; CPU fallback is explicit degraded operation."

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
            # Compatibility aliases for current Rust bridge. Routing no longer uses
            # Realtime/Quality mode; both directions are selected by language pair.
            "translation_realtime": translation_id_en_ready
            and transformers_ready
            and torch_ready,
            "translation_quality": translation_bidirectional_ready
            and transformers_ready
            and torch_ready,
            "translation_id_en": translation_id_en_ready
            and transformers_ready
            and torch_ready,
            "translation_en_id": translation_en_id_ready
            and transformers_ready
            and torch_ready,
            "translation_bidirectional": translation_bidirectional_ready
            and transformers_ready
            and torch_ready,
            "tts": tts_ready,
            "cuda_degraded": not cuda_available or not ctranslate2_cuda_available,
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
                "id": "marianmt-id-en",
                "ready": translation_id_en_ready,
                "path": str(TRANSLATION_MODEL_ID_EN),
            },
            "translation_en_id": {
                "id": "marianmt-en-id",
                "ready": translation_en_id_ready,
                "path": str(TRANSLATION_MODEL_EN_ID),
            },
            # Compatibility names only; there is no longer mode-based model routing.
            "translation_realtime": {
                "id": "marianmt-id-en",
                "ready": translation_id_en_ready,
                "path": str(TRANSLATION_MODEL_ID_EN),
            },
            "translation_quality": {
                "id": "marianmt-en-id",
                "ready": translation_en_id_ready,
                "path": str(TRANSLATION_MODEL_EN_ID),
            },
        },
        "tts": {
            "ready": tts_ready,
            "provider": tts_selection["provider"],
            "voice_id": tts_selection["voice_id"],
            "language_code": tts_selection["language_code"],
            "blocker": tts_selection["blocker"],
            "sapi_voices": tts_selection["sapi_voices"],
            "voice_actor_marcel_ready": False,
        },
        "gpu": gpu_runtime,
        "asr_primary_model_ready": asr_primary_ready,
        "asr_model_ready": asr_active_ready,
        "asr_backup_model_ready": asr_backup_ready,
        "asr_active_model_id": asr_active_model_id,
        "asr_active_model_path": str(asr_active_model_path),
        "asr_readiness_grade": asr_readiness_grade,
        "translation_model_ready": translation_id_en_ready,
        "quality_translation_model_ready": translation_en_id_ready,
        "translation_id_en_ready": translation_id_en_ready,
        "translation_en_id_ready": translation_en_id_ready,
        "translation_bidirectional_ready": translation_bidirectional_ready,
        "piper_ready": tts_selection["provider"] == "piper",
        "sapi_ready": tts_selection["provider"] == "windows-sapi",
        "tts_default_ready": tts_ready,
        "voice_actor_marcel_ready": False,
        "faster_whisper_import_ready": faster_whisper_ready,
        "transformers_import_ready": transformers_ready,
        "torch_import_ready": torch_ready,
        "torch_cuda_available": cuda_available,
        "ctranslate2_cuda_available": ctranslate2_cuda_available,
        "nvidia_smi_available": bool(gpu_runtime["nvidia_smi_available"]),
        "gpu_primary_requested": bool(gpu_runtime["cuda_primary_requested"]),
        "selected_device": str(gpu_runtime["selected_device"]),
        "selected_translation_device": str(gpu_runtime["selected_translation_device"]),
        "selected_compute_type": str(gpu_runtime["selected_compute_type"]),
        "fallback_reason": str(gpu_runtime["fallback_reason"]),
        "loaded": {
            "asr": ASR_RUNTIME is not None,
            "asr_device": ASR_RUNTIME_DEVICE,
            "asr_compute_type": ASR_RUNTIME_COMPUTE,
            "asr_model_id": ASR_RUNTIME_MODEL_ID,
            "translation_directions": sorted(TRANSLATION_RUNTIME.keys()),
        },
    }


def handle_status(_: dict[str, Any]) -> dict[str, Any]:
    return build_status_payload()


def handle_ping(_: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "stage": "ping", "unix_ms": now_ms()}


def asr_runtime_config() -> tuple[str, str, str]:
    gpu_runtime = probe_gpu_runtime()
    if gpu_runtime["selected_device"] == "cuda":
        return "cuda", "int8_float16", ""
    return "cpu", "int8", str(gpu_runtime["fallback_reason"])


def get_asr_runtime() -> Any:
    global ASR_RUNTIME, ASR_RUNTIME_DEVICE, ASR_RUNTIME_COMPUTE, ASR_RUNTIME_MODEL_ID
    if ASR_RUNTIME is not None:
        return ASR_RUNTIME
    from faster_whisper import WhisperModel

    device, compute_type, _fallback_reason = asr_runtime_config()
    model_id, model_path = choose_asr_model()
    try:
        ASR_RUNTIME = WhisperModel(str(model_path), device=device, compute_type=compute_type)
        ASR_RUNTIME_DEVICE = device
        ASR_RUNTIME_COMPUTE = compute_type
        ASR_RUNTIME_MODEL_ID = model_id
    except Exception:
        if device != "cuda":
            raise
        ASR_RUNTIME = WhisperModel(str(model_path), device="cpu", compute_type="int8")
        ASR_RUNTIME_DEVICE = "cpu"
        ASR_RUNTIME_COMPUTE = "int8"
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


def handle_asr_preload(_: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    status = build_status_payload()
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
        get_asr_runtime()
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
        model = get_asr_runtime()
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


def translation_device() -> str:
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def translation_cuda_available() -> bool:
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:
        return False


def get_translation_runtime(source_language: str, target_language: str) -> dict[str, Any]:
    pair = direction_pair(source_language, target_language)
    selected = translation_model_for_direction(source_language, target_language)
    if selected is None:
        raise ValueError("translation:direction_not_supported")
    if pair in TRANSLATION_RUNTIME:
        return TRANSLATION_RUNTIME[pair]

    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    model_id, model_path = selected
    device = translation_device()
    device_note = "cuda_available" if device == "cuda" else "cpu_runtime"
    degraded = device != "cuda"
    fallback_reason = "" if device == "cuda" else "torch_cuda_unavailable"
    tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(str(model_path), local_files_only=True)
    if device == "cuda":
        try:
            model = model.to("cuda")
        except Exception as exc:
            model = model.to("cpu")
            device = "cpu"
            device_note = f"cuda_fallback:{type(exc).__name__}"
            degraded = True
            fallback_reason = f"cuda_fallback:{type(exc).__name__}"
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
        "translation_torch_cuda_available": translation_cuda_available(),
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
    compatibility_mode = compatibility_mode_label(payload.get("mode"))
    if selected is None:
        return {
            "ok": False,
            "stage": "translation_preload",
            "mode": compatibility_mode,
            "direction_pair": pair,
            "blocker": "translation:direction_not_supported",
            "note": "Initial translation core supports only Indonesian <-> English.",
        }
    model_id, model_path = selected
    model_ready = translation_model_ready(model_path)
    status = build_status_payload()
    if (
        not status["transformers_import_ready"]
        or not status["torch_import_ready"]
        or not model_ready
    ):
        blockers = list(status.get("blockers", []))
        if not model_ready:
            blockers.append(f"model:{model_id.replace('-', '_')}_missing")
        return failed_from_status(
            "translation_preload",
            {**status, "blocker": ";".join(blockers), "blockers": blockers},
            {
                "model_id": model_id,
                "model_path": str(model_path),
                "mode": compatibility_mode,
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
            "mode": compatibility_mode,
            "direction_pair": pair,
            "device": runtime["device"],
            "device_note": runtime["device_note"],
            "translation_gpu_requested": runtime["translation_gpu_requested"],
            "translation_torch_cuda_available": runtime[
                "translation_torch_cuda_available"
            ],
            "translation_degraded": runtime["translation_degraded"],
            "translation_fallback_reason": runtime["translation_fallback_reason"],
            "elapsed_ms": now_ms() - started,
            "warnings": status.get("warnings", []),
            "note": "Canonical translation model loaded for the requested language direction.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "translation_preload",
            "model_id": model_id,
            "mode": compatibility_mode,
            "direction_pair": pair,
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }


def move_inputs_to_device(inputs: Any, device: str) -> Any:
    if device != "cuda":
        return inputs
    return {key: value.to("cuda") for key, value in inputs.items()}


def finite_positive_token_limit(value: Any) -> int | None:
    try:
        parsed = int(value)
    except Exception:
        return None
    if parsed <= 0 or parsed >= MAX_REASONABLE_MODEL_TOKEN_LIMIT:
        return None
    return parsed


def translation_input_token_limit(tokenizer: Any, model: Any) -> int | None:
    candidates: list[int] = []
    tokenizer_limit = finite_positive_token_limit(
        getattr(tokenizer, "model_max_length", None)
    )
    if tokenizer_limit is not None:
        candidates.append(tokenizer_limit)
    config = getattr(model, "config", None)
    model_limit = finite_positive_token_limit(
        getattr(config, "max_position_embeddings", None)
    )
    if model_limit is not None:
        candidates.append(model_limit)
    return min(candidates) if candidates else None


def input_token_count(inputs: Any) -> int | None:
    try:
        input_ids = inputs["input_ids"]
        shape = getattr(input_ids, "shape", None)
        if shape is None or len(shape) < 2:
            return None
        return int(shape[-1])
    except Exception:
        return None


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
    token_ids.update(
        normalized_token_id_set(getattr(generation_config, "eos_token_id", None))
    )
    config = getattr(model, "config", None)
    token_ids.update(normalized_token_id_set(getattr(config, "eos_token_id", None)))
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
    sequence_ids = first_sequence_token_ids(sequences)
    if sequence_ids is None or not sequence_ids:
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


def handle_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TRANSLATION_TEXT_CHARS):
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:text_too_large",
            "max_chars": MAX_TRANSLATION_TEXT_CHARS,
        }

    text = compact_runtime_text(payload.get("text", ""), MAX_TRANSLATION_TEXT_CHARS)
    source_language = normalize_language(payload.get("source_language", "id"), "id")
    target_language = normalize_language(payload.get("target_language", "en"), "en")
    pair = direction_pair(source_language, target_language)
    compatibility_mode = compatibility_mode_label(payload.get("mode"))
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
            "mode": compatibility_mode,
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
            "mode": compatibility_mode,
            "model_id": model_id,
            "model_path": str(model_path),
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": True,
            "blocker": f"model:{model_id.replace('-', '_')}_missing",
            "note": "The local model for this language direction is not installed or incomplete.",
            "elapsed_ms": now_ms() - started,
        }

    try:
        runtime = get_translation_runtime(source_language, target_language)
        tokenizer = runtime["tokenizer"]
        model = runtime["model"]
        device = runtime["device"]
        max_new_tokens = bounded_int(
            payload.get("max_new_tokens", 32), 32, 1, MAX_GENERATION_TOKENS
        )

        # Deliberately no silent truncation and no automatic previous-turn context.
        inputs = tokenizer(text, return_tensors="pt", truncation=False)
        token_count = input_token_count(inputs)
        max_input_tokens = translation_input_token_limit(tokenizer, model)
        if token_count is None:
            return {
                "ok": False,
                "stage": "translate",
                "mode": compatibility_mode,
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
                "mode": compatibility_mode,
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
                "mode": compatibility_mode,
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

        inputs = move_inputs_to_device(inputs, device)
        import torch

        with torch.inference_mode():
            generation = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                num_beams=1,
                return_dict_in_generate=True,
            )
        sequences = getattr(generation, "sequences", None)
        if sequences is None:
            return {
                "ok": False,
                "stage": "translate",
                "mode": compatibility_mode,
                "model_id": runtime["model_id"],
                "direction_pair": pair,
                "blocker": "translation:missing_generation_sequences",
                "note": "Translation output was not promoted because generation sequences were unavailable.",
                "elapsed_ms": now_ms() - started,
            }

        completion = translation_generation_completion(
            sequences, tokenizer, model, max_new_tokens
        )
        if not completion["complete"]:
            return {
                "ok": False,
                "stage": "translate",
                "mode": compatibility_mode,
                "model_id": runtime["model_id"],
                "device": device,
                "source_language": source_language,
                "target_language": target_language,
                "direction_pair": pair,
                "input_tokens": token_count,
                "max_input_tokens": max_input_tokens,
                **completion,
                "note": "Generated translation was rejected because normal EOS completion could not be verified. No partial translation should be promoted to Text or TTS.",
                "elapsed_ms": now_ms() - started,
            }

        translated = compact_runtime_text(
            tokenizer.batch_decode(sequences, skip_special_tokens=True)[0],
            MAX_TRANSLATION_TEXT_CHARS,
        )
        return {
            "ok": bool(translated),
            "stage": "translate",
            "mode": compatibility_mode,
            "translation_contract": "canonical_bidirectional_id_en",
            "model_id": runtime["model_id"],
            "device": device,
            "device_note": runtime["device_note"],
            "translation_gpu_requested": runtime["translation_gpu_requested"],
            "translation_torch_cuda_available": runtime[
                "translation_torch_cuda_available"
            ],
            "translation_degraded": runtime["translation_degraded"],
            "translation_fallback_reason": runtime["translation_fallback_reason"],
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": True,
            "input_tokens": token_count,
            "max_input_tokens": max_input_tokens,
            **completion,
            "translated_text": translated,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if translated else "translation:empty_output",
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "translate",
            "mode": compatibility_mode,
            "model_id": model_id,
            "blocker": type(exc).__name__,
            "note": str(exc),
            "direction_pair": pair,
            "elapsed_ms": now_ms() - started,
        }


def handle_tts_preflight(_: dict[str, Any]) -> dict[str, Any]:
    selection = select_english_tts_voice()
    ok = bool(selection["ok"])
    return {
        "ok": ok,
        "stage": "tts_preflight",
        "provider": selection["provider"],
        "voice_id": selection["voice_id"],
        "language_code": selection["language_code"],
        "voice_path": str(selection["voice_path"]) if selection["voice_path"] else None,
        "sapi_voices": selection["sapi_voices"],
        "blocker": selection["blocker"],
        "warnings": [],
        "next_actions": status_action_items(
            [] if ok else [selection["blocker"]], []
        ),
        "note": (
            "An explicit English TTS voice is selected for local synthesis."
            if ok
            else "TTS remains unavailable until an English-capable voice can be identified explicitly."
        ),
    }


def handle_synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TTS_TEXT_CHARS):
        return {
            "ok": False,
            "stage": "synthesize",
            "blocker": "tts:text_too_large",
            "max_chars": MAX_TTS_TEXT_CHARS,
        }
    text = compact_runtime_text(payload.get("text", ""), MAX_TTS_TEXT_CHARS)
    if not text:
        return {"ok": False, "stage": "synthesize", "blocker": "tts:empty_text"}

    selection = select_english_tts_voice()
    if not selection["ok"]:
        return {
            "ok": False,
            "stage": "synthesize",
            "blocker": selection["blocker"],
            "note": "Synthesis was not attempted because no explicit English-capable TTS voice is available.",
            "next_actions": status_action_items([selection["blocker"]], []),
        }

    try:
        output_path = resolve_worker_path(
            payload.get("output_path", ""),
            CACHE_ROOT / "tts_output.wav",
            ALLOWED_OUTPUT_ROOTS,
        )
    except Exception as exc:
        return {
            "ok": False,
            "stage": "synthesize",
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if selection["provider"] == "piper":
        executable = PIPER_ROOT / "piper.exe"
        voice_path = selection["voice_path"]
        try:
            completed = subprocess.run(
                [
                    str(executable),
                    "--model",
                    str(voice_path),
                    "--output_file",
                    str(output_path),
                ],
                input=text,
                text=True,
                capture_output=True,
                timeout=10,
                check=False,
            )
            ok = (
                completed.returncode == 0
                and output_path.is_file()
                and output_path.stat().st_size > 44
            )
            return {
                "ok": ok,
                "stage": "synthesize",
                "provider": "piper",
                "voice_id": selection["voice_id"],
                "language_code": selection["language_code"],
                "output_path": str(output_path),
                "elapsed_ms": now_ms() - started,
                "blocker": "" if ok else "tts:piper_failed",
                "stderr": completed.stderr[-500:],
            }
        except Exception as exc:
            return {
                "ok": False,
                "stage": "synthesize",
                "provider": "piper",
                "voice_id": selection["voice_id"],
                "language_code": selection["language_code"],
                "blocker": type(exc).__name__,
                "note": str(exc),
                "elapsed_ms": now_ms() - started,
            }

    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.SelectVoice($env:TRANSLATEIT_TTS_VOICE); "
        "$s.SetOutputToWaveFile($env:TRANSLATEIT_TTS_OUTPUT); "
        "$s.Speak($env:TRANSLATEIT_TTS_TEXT); "
        "$s.Dispose()"
    )
    try:
        environment = os.environ.copy()
        environment["TRANSLATEIT_TTS_TEXT"] = text
        environment["TRANSLATEIT_TTS_OUTPUT"] = str(output_path)
        environment["TRANSLATEIT_TTS_VOICE"] = str(selection["voice_id"])
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
            env=environment,
        )
        ok = (
            completed.returncode == 0
            and output_path.is_file()
            and output_path.stat().st_size > 44
        )
        return {
            "ok": ok,
            "stage": "synthesize",
            "provider": "windows-sapi",
            "voice_id": selection["voice_id"],
            "language_code": selection["language_code"],
            "output_path": str(output_path),
            "elapsed_ms": now_ms() - started,
            "blocker": "" if ok else "tts:sapi_synthesis_failed",
            "stderr": completed.stderr[-500:],
        }
    except Exception as exc:
        return {
            "ok": False,
            "stage": "synthesize",
            "provider": "windows-sapi",
            "voice_id": selection["voice_id"],
            "language_code": selection["language_code"],
            "blocker": type(exc).__name__,
            "note": str(exc),
            "elapsed_ms": now_ms() - started,
        }


HANDLERS = {
    "ping": handle_ping,
    "status": handle_status,
    "asr_preload": handle_asr_preload,
    "transcribe": handle_transcribe,
    "translation_preload": handle_translation_preload,
    "translate": handle_translate,
    "tts_preflight": handle_tts_preflight,
    "synthesize": handle_synthesize,
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