from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
ASR_MODEL = ROOT / "EngineData" / "TranscriptEngine" / "ModelData" / "faster-whisper-large-v3-turbo"
TRANSLATION_MODEL = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "marianmt-id-en"
QUALITY_TRANSLATION_MODEL = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "nllb-200-distilled-600M"
PIPER_ROOT = ROOT / "EngineData" / "VoiceEngine" / "Piper"

ASR_RUNTIME: Any | None = None
TRANSLATION_RUNTIME: dict[str, Any] = {}


@dataclass(slots=True)
class WorkerStatus:
    ok: bool
    stage: str
    asr_model_ready: bool
    translation_model_ready: bool
    quality_translation_model_ready: bool
    piper_ready: bool
    faster_whisper_import_ready: bool
    transformers_import_ready: bool
    blocker: str
    note: str


def now_ms() -> int:
    return int(time.time() * 1000)


def import_ready(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception:
        return False


def model_ready(path: Path, marker: str | None = None) -> bool:
    if not path.exists():
        return False
    if marker is None:
        return True
    return (path / marker).exists()


def piper_ready() -> bool:
    executable = PIPER_ROOT / "piper.exe"
    voices = list(PIPER_ROOT.glob("**/*.onnx")) if PIPER_ROOT.exists() else []
    return executable.exists() and bool(voices)


def build_status() -> WorkerStatus:
    faster_whisper_ready = import_ready("faster_whisper")
    transformers_ready = import_ready("transformers")
    asr_ready = model_ready(ASR_MODEL, "model.bin")
    translation_ready = model_ready(TRANSLATION_MODEL)
    quality_ready = model_ready(QUALITY_TRANSLATION_MODEL)
    tts_ready = piper_ready()

    blockers: list[str] = []
    if not faster_whisper_ready:
        blockers.append("dependency:faster_whisper_missing")
    if not transformers_ready:
        blockers.append("dependency:transformers_missing")
    if not asr_ready:
        blockers.append("model:faster_whisper_large_v3_turbo_missing")
    if not translation_ready:
        blockers.append("model:marianmt_id_en_missing")
    if not tts_ready:
        blockers.append("model:piper_voice_missing")

    return WorkerStatus(
        ok=not blockers,
        stage="local_realtime_worker_preflight",
        asr_model_ready=asr_ready,
        translation_model_ready=translation_ready,
        quality_translation_model_ready=quality_ready,
        piper_ready=tts_ready,
        faster_whisper_import_ready=faster_whisper_ready,
        transformers_import_ready=transformers_ready,
        blocker=";".join(blockers),
        note="Local worker can execute only when required dependencies and local model files are present.",
    )


def handle_status(_: dict[str, Any]) -> dict[str, Any]:
    status = asdict(build_status())
    status["loaded"] = {
        "asr": ASR_RUNTIME is not None,
        "translation_modes": sorted(TRANSLATION_RUNTIME.keys()),
    }
    return status


def handle_ping(_: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "stage": "ping", "unix_ms": now_ms()}


def get_asr_runtime() -> Any:
    global ASR_RUNTIME
    if ASR_RUNTIME is not None:
        return ASR_RUNTIME
    from faster_whisper import WhisperModel

    ASR_RUNTIME = WhisperModel(str(ASR_MODEL), device="cuda", compute_type="int8_float16")
    return ASR_RUNTIME


def handle_asr_preload(_: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    status = build_status()
    if not status.faster_whisper_import_ready or not status.asr_model_ready:
        return {"ok": False, "stage": "asr_preload", "blocker": status.blocker, "note": status.note}
    try:
        get_asr_runtime()
        return {
            "ok": True,
            "stage": "asr_preload",
            "model_path": str(ASR_MODEL),
            "model_id": "faster-whisper-large-v3-turbo",
            "device": "cuda",
            "compute_type": "int8_float16",
            "elapsed_ms": now_ms() - started,
            "note": "ASR model is loaded and ready for local realtime transcription.",
        }
    except Exception as exc:
        return {"ok": False, "stage": "asr_preload", "blocker": type(exc).__name__, "note": str(exc)}


def handle_transcribe(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    audio_path = Path(str(payload.get("audio_path", "")))
    if not audio_path.is_absolute():
        audio_path = ROOT / audio_path
    if not audio_path.is_file():
        return {"ok": False, "stage": "transcribe", "blocker": "asr:audio_file_missing", "audio_path": str(audio_path)}
    try:
        model = get_asr_runtime()
        segments, info = model.transcribe(
            str(audio_path),
            language=str(payload.get("language", "id")),
            task="transcribe",
            beam_size=int(payload.get("beam_size", 1)),
            temperature=float(payload.get("temperature", 0)),
            condition_on_previous_text=False,
            vad_filter=bool(payload.get("vad_filter", True)),
            word_timestamps=False,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "ok": bool(text),
            "stage": "transcribe",
            "transcript_text": text,
            "language": getattr(info, "language", "id"),
            "language_probability": float(getattr(info, "language_probability", 0.0)),
            "elapsed_ms": now_ms() - started,
            "blocker": "" if text else "asr:empty_transcript",
        }
    except Exception as exc:
        return {"ok": False, "stage": "transcribe", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


def translation_model_for_mode(mode: str) -> tuple[str, Path]:
    if mode.lower() == "quality":
        return "nllb-200-distilled-600M", QUALITY_TRANSLATION_MODEL
    return "marianmt-id-en", TRANSLATION_MODEL


def get_translation_runtime(mode: str) -> dict[str, Any]:
    mode_key = "Quality" if mode.lower() == "quality" else "Realtime"
    if mode_key in TRANSLATION_RUNTIME:
        return TRANSLATION_RUNTIME[mode_key]
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    model_id, model_path = translation_model_for_mode(mode_key)
    tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(str(model_path), local_files_only=True)
    runtime = {"mode": mode_key, "model_id": model_id, "model_path": str(model_path), "tokenizer": tokenizer, "model": model}
    TRANSLATION_RUNTIME[mode_key] = runtime
    return runtime


def handle_translation_preload(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    mode = str(payload.get("mode", "Realtime"))
    model_id, model_path = translation_model_for_mode(mode)
    status = build_status()
    if not status.transformers_import_ready or not model_path.exists():
        return {"ok": False, "stage": "translation_preload", "model_id": model_id, "blocker": status.blocker, "note": status.note}
    try:
        get_translation_runtime(mode)
        return {
            "ok": True,
            "stage": "translation_preload",
            "model_path": str(model_path),
            "model_id": model_id,
            "mode": mode,
            "elapsed_ms": now_ms() - started,
            "note": "Translation model is loaded and ready for local execution.",
        }
    except Exception as exc:
        return {"ok": False, "stage": "translation_preload", "model_id": model_id, "blocker": type(exc).__name__, "note": str(exc)}


def handle_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    text = str(payload.get("text", "")).strip()
    mode = str(payload.get("mode", "Realtime"))
    if not text:
        return {"ok": False, "stage": "translate", "blocker": "translation:empty_text"}
    try:
        runtime = get_translation_runtime(mode)
        tokenizer = runtime["tokenizer"]
        model = runtime["model"]
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
        output_tokens = model.generate(**inputs, max_new_tokens=int(payload.get("max_new_tokens", 32)), num_beams=1)
        translated = tokenizer.batch_decode(output_tokens, skip_special_tokens=True)[0].strip()
        return {
            "ok": bool(translated),
            "stage": "translate",
            "mode": runtime["mode"],
            "model_id": runtime["model_id"],
            "translated_text": translated,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if translated else "translation:empty_output",
        }
    except Exception as exc:
        return {"ok": False, "stage": "translate", "blocker": type(exc).__name__, "note": str(exc), "elapsed_ms": now_ms() - started}


def first_piper_voice() -> Path | None:
    voices = sorted(PIPER_ROOT.glob("**/*.onnx")) if PIPER_ROOT.exists() else []
    return voices[0] if voices else None


def handle_tts_preflight(_: dict[str, Any]) -> dict[str, Any]:
    executable = PIPER_ROOT / "piper.exe"
    voice = first_piper_voice()
    ok = executable.exists() and voice is not None
    return {
        "ok": ok,
        "stage": "tts_preflight",
        "piper_executable": str(executable),
        "voice_path": str(voice) if voice else None,
        "blocker": "" if ok else "tts:piper_executable_or_voice_missing",
        "note": "Piper local TTS requires piper.exe and at least one .onnx voice file under EngineData/VoiceEngine/Piper.",
    }


def handle_synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    text = str(payload.get("text", "")).strip()
    if not text:
        return {"ok": False, "stage": "synthesize", "blocker": "tts:empty_text"}
    executable = PIPER_ROOT / "piper.exe"
    voice = first_piper_voice()
    output_path = Path(str(payload.get("output_path", ROOT / "UserData" / "CacheData" / "tts_output.wav")))
    if not output_path.is_absolute():
        output_path = ROOT / output_path
    if not executable.exists() or voice is None:
        return {"ok": False, "stage": "synthesize", "blocker": "tts:piper_executable_or_voice_missing"}
    output_path.parent.mkdir(parents=True, exist_ok=True)
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
            "output_path": str(output_path),
            "elapsed_ms": now_ms() - started,
            "blocker": "" if ok else "tts:piper_failed",
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
        try:
            request = json.loads(raw)
            command = str(request.get("command", "status"))
            handler = HANDLERS.get(command)
            if handler is None:
                respond({"ok": False, "stage": command, "blocker": "worker:unknown_command"})
                continue
            respond(handler(request))
        except Exception as exc:
            respond({"ok": False, "stage": "worker_error", "blocker": type(exc).__name__, "note": str(exc)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
