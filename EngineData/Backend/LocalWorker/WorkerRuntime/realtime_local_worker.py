from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[4]
RUNTIME_ASSETS_ROOT = ROOT / "EngineData" / "Backend" / "RuntimeAssets"
ASR_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "ASR" / "ModelData"
TRANSLATION_MODEL_ROOT = RUNTIME_ASSETS_ROOT / "Translation" / "ModelData"
ASR_MODEL = ASR_MODEL_ROOT / "faster-whisper-large-v3-turbo"
ASR_BACKUP_MODEL = ASR_MODEL_ROOT / "faster-whisper-medium"
TRANSLATION_MODEL = TRANSLATION_MODEL_ROOT / "marianmt-id-en"
QUALITY_TRANSLATION_MODEL = TRANSLATION_MODEL_ROOT / "nllb-200-distilled-600M"
PIPER_ROOT = RUNTIME_ASSETS_ROOT / "Voice" / "Piper"
RUNTIME_MANIFEST = ROOT / "EngineData" / "Backend" / "RuntimeContracts" / "MODEL_RUNTIME_MANIFEST.json"
CACHE_ROOT = ROOT / "UserData" / "CacheData"
ALLOWED_INPUT_ROOTS = [ROOT / "UserData" / "CacheData", ROOT / "UserData" / "LogData"]
ALLOWED_OUTPUT_ROOTS = [ROOT / "UserData" / "CacheData"]

MAX_WORKER_REQUEST_BYTES = 1_000_000
MAX_TRANSLATION_TEXT_CHARS = 2_000
MAX_TTS_TEXT_CHARS = 1_000
MAX_TRANSCRIPT_TEXT_CHARS = 4_000
MAX_AUDIO_INPUT_BYTES = 25 * 1024 * 1024
MAX_GENERATION_TOKENS = 128

NLLB_LANGUAGE_CODES = {
    "id": "ind_Latn",
    "ind": "ind_Latn",
    "indonesian": "ind_Latn",
    "en": "eng_Latn",
    "eng": "eng_Latn",
    "english": "eng_Latn",
}

ASR_RUNTIME: Any | None = None
ASR_RUNTIME_DEVICE = "not_loaded"
ASR_RUNTIME_COMPUTE = "not_loaded"
ASR_RUNTIME_MODEL_ID = "not_loaded"
TRANSLATION_RUNTIME: dict[str, dict[str, Any]] = {}
SAPI_STATUS: tuple[bool, list[str], str] | None = None


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
    return "".join(character for character in text if character.isascii() and (character.isalnum() or character == "_"))[:64]


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
        completed = subprocess.run(["nvidia-smi", "-L"], text=True, capture_output=True, timeout=10, check=False)
        return completed.returncode == 0 and bool(completed.stdout.strip())
    except Exception:
        return False


def probe_gpu_runtime() -> dict[str, Any]:
    torch_ready, torch_cuda_available = torch_status()
    ctranslate2_ready, ctranslate2_cuda_available = ctranslate2_status()
    asr_gpu_available = bool(ctranslate2_cuda_available)
    translation_gpu_available = bool(torch_cuda_available)
    return {
        "torch_import_ready": torch_ready,
        "torch_cuda_available": torch_cuda_available,
        "ctranslate2_import_ready": ctranslate2_ready,
        "ctranslate2_cuda_available": ctranslate2_cuda_available,
        "nvidia_smi_available": nvidia_smi_available(),
        "cuda_primary_requested": True,
        "selected_device": "cuda" if asr_gpu_available else "cpu",
        "selected_translation_device": "cuda" if translation_gpu_available else "cpu",
        "selected_compute_type": "int8_float16" if asr_gpu_available else "int8",
        "fallback_reason": "" if asr_gpu_available else "cuda_unavailable",
    }


def normalize_language(value: Any, fallback: str) -> str:
    text = str(value or fallback).strip().lower().replace("_latn", "")
    if text.startswith("ind") or text == "id":
        return "id"
    if text.startswith("eng") or text == "en":
        return "en"
    return text[:2] if text else fallback


def nllb_language_code(value: Any, fallback: str) -> str:
    normalized = normalize_language(value, fallback)
    return NLLB_LANGUAGE_CODES.get(normalized, NLLB_LANGUAGE_CODES[fallback])


def direction_pair(source_language: str, target_language: str) -> str:
    return f"{normalize_language(source_language, 'id')}->{normalize_language(target_language, 'en')}"


def resolve_worker_path(value: Any, default_path: Path, allowed_roots: list[Path]) -> Path:
    raw = str(value).strip() if value not in (None, "") else str(default_path)
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT / path
    resolved = path.resolve()
    allowed = [root.resolve() for root in allowed_roots]
    if not any(resolved == root or root in resolved.parents for root in allowed):
        raise ValueError("worker:path_outside_allowed_roots")
    return resolved


def has_any(path: Path, patterns: tuple[str, ...]) -> bool:
    return path.is_dir() and any(any(item.is_file() for item in path.glob(pattern)) for pattern in patterns)


def asr_model_ready(path: Path) -> bool:
    return (
        (path / "model.bin").is_file()
        and (path / "config.json").is_file()
        and has_any(path, ("tokenizer.json", "tokenizer.model", "vocabulary.json"))
    )


def translation_model_ready(path: Path, nllb: bool = False) -> bool:
    if not (path / "config.json").is_file():
        return False
    if not has_any(path, ("*.safetensors", "pytorch_model*.bin")):
        return False
    if nllb:
        return (path / "tokenizer_config.json").is_file() and has_any(
            path, ("sentencepiece.bpe.model", "tokenizer.json", "spiece.model")
        )
    return has_any(path, ("source.spm", "tokenizer.json", "spiece.model")) and has_any(
        path, ("target.spm", "tokenizer.json", "spiece.model")
    )


def piper_ready() -> bool:
    executable = PIPER_ROOT / "piper.exe"
    voices = list(PIPER_ROOT.glob("**/*.onnx")) if PIPER_ROOT.exists() else []
    return executable.exists() and bool(voices)


def first_piper_voice() -> Path | None:
    voices = sorted(PIPER_ROOT.glob("**/*.onnx")) if PIPER_ROOT.exists() else []
    return voices[0] if voices else None


def read_runtime_manifest() -> dict[str, Any]:
    try:
        return json.loads(RUNTIME_MANIFEST.read_text(encoding="utf-8"))
    except Exception:
        return {}


def sapi_status() -> tuple[bool, list[str], str]:
    global SAPI_STATUS
    if SAPI_STATUS is not None:
        return SAPI_STATUS
    if sys.platform != "win32":
        SAPI_STATUS = (False, [], "tts:windows_sapi_unavailable")
        return SAPI_STATUS
    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$voices = @($s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }); "
        "$s.Dispose(); "
        "@{ready=($voices.Count -gt 0); voices=$voices} | ConvertTo-Json -Compress"
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
            raw_voices = payload.get("voices", [])
            voices = [raw_voices] if isinstance(raw_voices, str) else [str(value) for value in raw_voices]
            SAPI_STATUS = (bool(payload.get("ready")), voices, "")
    except Exception as exc:
        SAPI_STATUS = (False, [], f"{type(exc).__name__}:{exc}")
    return SAPI_STATUS


def choose_asr_model() -> tuple[str, Path]:
    if asr_model_ready(ASR_MODEL):
        return "faster-whisper-large-v3-turbo", ASR_MODEL
    if asr_model_ready(ASR_BACKUP_MODEL):
        return "faster-whisper-medium", ASR_BACKUP_MODEL
    return "faster-whisper-large-v3-turbo", ASR_MODEL


def translation_model_for_mode(mode: str) -> tuple[str, Path]:
    if mode.lower() == "quality":
        return "nllb-200-distilled-600M", QUALITY_TRANSLATION_MODEL
    return "marianmt-id-en", TRANSLATION_MODEL


def realtime_direction_supported(source_language: str, target_language: str) -> bool:
    return normalize_language(source_language, "id") == "id" and normalize_language(target_language, "en") == "en"


def status_action_items(blockers: list[str], warnings: list[str]) -> list[str]:
    actions: list[str] = []
    joined = ";".join(blockers + warnings)
    if "dependency:" in joined:
        actions.append("Install WorkerRuntime Python dependencies inside the worker environment.")
    if "faster_whisper" in joined:
        actions.append("Install faster-whisper and make sure faster-whisper large-v3-turbo or medium model assets exist.")
    if "transformers" in joined or "torch" in joined:
        actions.append("Install torch and transformers for local translation.")
    if "marianmt_id_en" in joined:
        actions.append("Place the realtime marianmt-id-en model under RuntimeAssets/Translation/ModelData.")
    if "nllb_quality_model_missing" in joined:
        actions.append("Place the NLLB quality model later if Quality mode is required.")
    if "tts:" in joined or "voice_actor" in joined:
        actions.append("Provide Piper voice assets or rely on Windows SAPI as a temporary local fallback.")
    if "cuda" in joined:
        actions.append("CUDA is optional for now; CPU fallback is allowed but marked degraded.")
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
    asr_readiness_grade = "primary" if asr_primary_ready else "fallback_degraded" if asr_backup_ready else "blocked"

    realtime_translation_ready = translation_model_ready(TRANSLATION_MODEL)
    quality_translation_ready = translation_model_ready(QUALITY_TRANSLATION_MODEL, nllb=True)
    piper_is_ready = piper_ready()
    sapi_is_ready, sapi_voices, sapi_error = sapi_status()
    tts_ready = piper_is_ready or sapi_is_ready
    runtime_manifest = read_runtime_manifest()
    marcel_ready = bool(runtime_manifest.get("tts", {}).get("voice_actor_ready", False))

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
    if not realtime_translation_ready:
        blockers.append("model:marianmt_id_en_missing")
    if not quality_translation_ready:
        warnings.append("model:nllb_quality_model_missing")
    if not tts_ready:
        blockers.append(sapi_error or "tts:no_local_provider_available")
    if not marcel_ready:
        warnings.append("voice_actor_marcel_missing")
    if not cuda_available or not ctranslate2_cuda_available:
        warnings.append("cuda_unavailable_cpu_fallback_active")

    ok = not blockers
    provider_ready = ok and asr_active_ready and realtime_translation_ready and tts_ready
    note = (
        "Worker ready for realtime local runtime." if provider_ready else
        "Worker is running, but required runtime dependencies or assets are still incomplete."
    )
    if not cuda_available or not ctranslate2_cuda_available:
        note += " CUDA is not fully available; CPU fallback is active and should be treated as degraded."

    return {
        "ok": ok,
        "stage": "local_realtime_worker_preflight",
        "blocker": ";".join(blockers),
        "blockers": blockers,
        "warnings": warnings,
        "next_actions": status_action_items(blockers, warnings),
        "note": note,
        "provider_ready": provider_ready,
        "readiness": {
            "asr": asr_active_ready and faster_whisper_ready,
            "translation_realtime": realtime_translation_ready and transformers_ready and torch_ready,
            "translation_quality": quality_translation_ready and transformers_ready and torch_ready,
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
            "asr_primary": {"id": "faster-whisper-large-v3-turbo", "ready": asr_primary_ready, "path": str(ASR_MODEL)},
            "asr_backup": {"id": "faster-whisper-medium", "ready": asr_backup_ready, "path": str(ASR_BACKUP_MODEL)},
            "translation_realtime": {"id": "marianmt-id-en", "ready": realtime_translation_ready, "path": str(TRANSLATION_MODEL)},
            "translation_quality": {"id": "nllb-200-distilled-600M", "ready": quality_translation_ready, "path": str(QUALITY_TRANSLATION_MODEL)},
        },
        "tts": {
            "piper_ready": piper_is_ready,
            "sapi_ready": sapi_is_ready,
            "sapi_voices": sapi_voices,
            "voice_actor_marcel_ready": marcel_ready,
            "provider": "piper" if piper_is_ready else "windows-sapi" if sapi_is_ready else None,
            "blocker": "" if tts_ready else sapi_error or "tts:no_local_provider_available",
        },
        "gpu": gpu_runtime,
        "asr_primary_model_ready": asr_primary_ready,
        "asr_model_ready": asr_active_ready,
        "asr_backup_model_ready": asr_backup_ready,
        "asr_active_model_id": asr_active_model_id,
        "asr_active_model_path": str(asr_active_model_path),
        "asr_readiness_grade": asr_readiness_grade,
        "asr_primary_missing": not asr_primary_ready,
        "translation_model_ready": realtime_translation_ready,
        "quality_translation_model_ready": quality_translation_ready,
        "piper_ready": piper_is_ready,
        "sapi_ready": sapi_is_ready,
        "tts_default_ready": tts_ready,
        "voice_actor_marcel_ready": marcel_ready,
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
            "translation_modes": sorted(TRANSLATION_RUNTIME.keys()),
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
        if device == "cuda":
            ASR_RUNTIME = WhisperModel(str(model_path), device="cpu", compute_type="int8")
            ASR_RUNTIME_DEVICE = "cpu"
            ASR_RUNTIME_COMPUTE = "int8"
            ASR_RUNTIME_MODEL_ID = model_id
        else:
            raise
    return ASR_RUNTIME


def failed_from_status(stage: str, status: dict[str, Any], extra: dict[str, Any] | None = None) -> dict[str, Any]:
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
            {"model_id": status["asr_active_model_id"], "model_path": status["asr_active_model_path"]},
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
            "fallback_reason": "" if ASR_RUNTIME_DEVICE == "cuda" else "cuda_unavailable_cpu_fallback_active",
            "elapsed_ms": now_ms() - started,
            "warnings": status.get("warnings", []),
            "note": "ASR model is loaded and ready for local transcription. CUDA is used when available; CPU fallback is explicit.",
        }
    except Exception as exc:
        return {"ok": False, "stage": "asr_preload", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


def handle_transcribe(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    try:
        audio_path = resolve_worker_path(payload.get("audio_path", ""), CACHE_ROOT / "audio_segments" / "latest_live_target_segment.wav", ALLOWED_INPUT_ROOTS)
    except Exception as exc:
        return {"ok": False, "stage": "transcribe", "blocker": type(exc).__name__, "note": str(exc)}
    if not audio_path.is_file():
        return {"ok": False, "stage": "transcribe", "blocker": "asr:audio_file_missing", "audio_path": str(audio_path)}
    if audio_path.stat().st_size > MAX_AUDIO_INPUT_BYTES:
        return {"ok": False, "stage": "transcribe", "blocker": "asr:audio_file_too_large", "max_bytes": MAX_AUDIO_INPUT_BYTES}
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
        text = compact_runtime_text(" ".join(segment.text.strip() for segment in segments), MAX_TRANSCRIPT_TEXT_CHARS)
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
        return {"ok": False, "stage": "transcribe", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


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


def get_translation_runtime(mode: str) -> dict[str, Any]:
    mode_key = "Quality" if mode.lower() == "quality" else "Realtime"
    if mode_key in TRANSLATION_RUNTIME:
        return TRANSLATION_RUNTIME[mode_key]
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    model_id, model_path = translation_model_for_mode(mode_key)
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
        "mode": mode_key,
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
    TRANSLATION_RUNTIME[mode_key] = runtime
    return runtime


def handle_translation_preload(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    mode = str(payload.get("mode", "Realtime"))
    model_id, model_path = translation_model_for_mode(mode)
    model_ready = translation_model_ready(model_path, nllb=(mode.lower() == "quality"))
    status = build_status_payload()
    if not status["transformers_import_ready"] or not status["torch_import_ready"] or not model_ready:
        blockers = list(status.get("blockers", []))
        if not model_ready:
            blockers.append(f"model:{model_id}_missing")
        return failed_from_status(
            "translation_preload",
            {**status, "blocker": ";".join(blockers), "blockers": blockers},
            {"model_id": model_id, "model_path": str(model_path), "mode": "Quality" if mode.lower() == "quality" else "Realtime"},
        )
    try:
        runtime = get_translation_runtime(mode)
        return {
            "ok": True,
            "stage": "translation_preload",
            "model_path": str(model_path),
            "model_id": model_id,
            "mode": runtime["mode"],
            "device": runtime["device"],
            "device_note": runtime["device_note"],
            "translation_gpu_requested": runtime["translation_gpu_requested"],
            "translation_torch_cuda_available": runtime["translation_torch_cuda_available"],
            "translation_degraded": runtime["translation_degraded"],
            "translation_fallback_reason": runtime["translation_fallback_reason"],
            "elapsed_ms": now_ms() - started,
            "warnings": status.get("warnings", []),
            "note": "Translation model is loaded and ready for local execution.",
        }
    except Exception as exc:
        return {"ok": False, "stage": "translation_preload", "model_id": model_id, "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


def move_inputs_to_device(inputs: Any, device: str) -> Any:
    if device != "cuda":
        return inputs
    return {key: value.to("cuda") for key, value in inputs.items()}


def nllb_generate_kwargs(tokenizer: Any, mode: str, source_language: str, target_language: str) -> dict[str, Any]:
    if mode != "Quality":
        return {}
    source_code = nllb_language_code(source_language, "id")
    target_code = nllb_language_code(target_language, "en")
    if hasattr(tokenizer, "src_lang"):
        tokenizer.src_lang = source_code
    lang_map = getattr(tokenizer, "lang_code_to_id", {}) or {}
    if target_code in lang_map:
        return {"forced_bos_token_id": lang_map[target_code]}
    if hasattr(tokenizer, "convert_tokens_to_ids"):
        token_id = tokenizer.convert_tokens_to_ids(target_code)
        if isinstance(token_id, int) and token_id >= 0:
            return {"forced_bos_token_id": token_id}
    return {}


def handle_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TRANSLATION_TEXT_CHARS):
        return {"ok": False, "stage": "translate", "blocker": "translation:text_too_large", "max_chars": MAX_TRANSLATION_TEXT_CHARS}
    text = compact_runtime_text(payload.get("text", ""), MAX_TRANSLATION_TEXT_CHARS)
    mode = str(payload.get("mode", "Realtime"))
    source_language = normalize_language(payload.get("source_language", "id"), "id")
    target_language = normalize_language(payload.get("target_language", "en"), "en")
    pair = direction_pair(source_language, target_language)
    if not text:
        return {"ok": False, "stage": "translate", "blocker": "translation:empty_text", "direction_pair": pair}
    if mode.lower() != "quality" and not realtime_direction_supported(source_language, target_language):
        return {
            "ok": False,
            "stage": "translate",
            "mode": "Realtime",
            "model_id": "marianmt-id-en",
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": False,
            "blocker": "translation:direction_not_supported_by_realtime_model",
            "fallback_mode": "Quality",
            "elapsed_ms": now_ms() - started,
        }
    try:
        runtime = get_translation_runtime(mode)
        tokenizer = runtime["tokenizer"]
        model = runtime["model"]
        device = runtime["device"]
        max_new_tokens = bounded_int(payload.get("max_new_tokens", 32), 32, 1, MAX_GENERATION_TOKENS)
        generate_kwargs = nllb_generate_kwargs(tokenizer, runtime["mode"], source_language, target_language)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
        inputs = move_inputs_to_device(inputs, device)
        try:
            import torch

            with torch.inference_mode():
                output_tokens = model.generate(**inputs, max_new_tokens=max_new_tokens, num_beams=1, **generate_kwargs)
        except Exception:
            output_tokens = model.generate(**inputs, max_new_tokens=max_new_tokens, num_beams=1, **generate_kwargs)
        translated = compact_runtime_text(tokenizer.batch_decode(output_tokens, skip_special_tokens=True)[0], MAX_TRANSLATION_TEXT_CHARS)
        return {
            "ok": bool(translated),
            "stage": "translate",
            "mode": runtime["mode"],
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
            "translated_text": translated,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if translated else "translation:empty_output",
        }
    except Exception as exc:
        return {"ok": False, "stage": "translate", "blocker": type(exc).__name__, "note": str(exc), "direction_pair": pair, "elapsed_ms": now_ms() - started}


def handle_tts_preflight(_: dict[str, Any]) -> dict[str, Any]:
    executable = PIPER_ROOT / "piper.exe"
    voice = first_piper_voice()
    piper_is_ready = executable.exists() and voice is not None
    sapi_is_ready, sapi_voices, sapi_error = sapi_status()
    ok = piper_is_ready or sapi_is_ready
    warnings = [] if read_runtime_manifest().get("tts", {}).get("voice_actor_ready") else ["voice_actor_marcel_missing"]
    return {
        "ok": ok,
        "stage": "tts_preflight",
        "provider": "piper" if piper_is_ready else "windows-sapi" if sapi_is_ready else None,
        "piper_executable": str(executable),
        "voice_path": str(voice) if voice else None,
        "sapi_voices": sapi_voices,
        "blocker": "" if ok else sapi_error or "tts:no_local_provider_available",
        "warnings": warnings,
        "next_actions": status_action_items([] if ok else [sapi_error or "tts:no_local_provider_available"], warnings),
        "note": "Piper uses local ONNX assets when available. Windows SAPI is the local fallback and does not satisfy the custom Marcel voice requirement.",
    }


def handle_synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    if runtime_text_too_large(payload.get("text", ""), MAX_TTS_TEXT_CHARS):
        return {"ok": False, "stage": "synthesize", "blocker": "tts:text_too_large", "max_chars": MAX_TTS_TEXT_CHARS}
    text = compact_runtime_text(payload.get("text", ""), MAX_TTS_TEXT_CHARS)
    if not text:
        return {"ok": False, "stage": "synthesize", "blocker": "tts:empty_text"}
    executable = PIPER_ROOT / "piper.exe"
    voice = first_piper_voice()
    try:
        output_path = resolve_worker_path(payload.get("output_path", ""), CACHE_ROOT / "tts_output.wav", ALLOWED_OUTPUT_ROOTS)
    except Exception as exc:
        return {"ok": False, "stage": "synthesize", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if executable.exists() and voice is not None:
        try:
            completed = subprocess.run(
                [str(executable), "--model", str(voice), "--output_file", str(output_path)],
                input=text,
                text=True,
                capture_output=True,
                timeout=10,
                check=False,
            )
            ok = completed.returncode == 0 and output_path.is_file()
            return {
                "ok": ok,
                "stage": "synthesize",
                "provider": "piper",
                "output_path": str(output_path),
                "elapsed_ms": now_ms() - started,
                "blocker": "" if ok else "tts:piper_failed",
                "stderr": completed.stderr[-500:],
            }
        except Exception as exc:
            return {"ok": False, "stage": "synthesize", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}

    sapi_is_ready, sapi_voices, sapi_error = sapi_status()
    if not sapi_is_ready:
        return {"ok": False, "stage": "synthesize", "blocker": sapi_error or "tts:no_local_provider_available", "next_actions": status_action_items([sapi_error or "tts:no_local_provider_available"], [])}
    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.SetOutputToWaveFile($env:TRANSLATEIT_TTS_OUTPUT); "
        "$s.Speak($env:TRANSLATEIT_TTS_TEXT); "
        "$s.Dispose()"
    )
    try:
        environment = os.environ.copy()
        environment["TRANSLATEIT_TTS_TEXT"] = text
        environment["TRANSLATEIT_TTS_OUTPUT"] = str(output_path)
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
            env=environment,
        )
        ok = completed.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 44
        return {
            "ok": ok,
            "stage": "synthesize",
            "provider": "windows-sapi",
            "sapi_voices": sapi_voices,
            "output_path": str(output_path),
            "elapsed_ms": now_ms() - started,
            "blocker": "" if ok else "tts:sapi_synthesis_failed",
            "stderr": completed.stderr[-500:],
        }
    except Exception as exc:
        return {"ok": False, "stage": "synthesize", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


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
            respond({"ok": False, "stage": "worker_request", "blocker": "worker:request_too_large", "max_bytes": MAX_WORKER_REQUEST_BYTES})
            continue
        try:
            request = json.loads(raw)
            if not isinstance(request, dict):
                respond({"ok": False, "stage": "worker_request", "blocker": "worker:request_must_be_object"})
                continue
            command = safe_command_name(request.get("command", "status"))
            handler = HANDLERS.get(command)
            if handler is None:
                respond({"ok": False, "stage": command or "unknown", "blocker": "worker:unknown_command"})
                continue
            respond(handler(request))
        except Exception as exc:
            respond({"ok": False, "stage": "worker_error", "blocker": type(exc).__name__, "note": str(exc)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
