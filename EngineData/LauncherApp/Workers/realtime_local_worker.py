from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
ASR_MODEL = ROOT / "EngineData" / "TranscriptEngine" / "ModelData" / "faster-whisper-large-v3-turbo"
TRANSLATION_MODEL = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "marianmt-id-en"
QUALITY_TRANSLATION_MODEL = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "nllb-200-distilled-600M"
PIPER_ROOT = ROOT / "EngineData" / "VoiceEngine" / "Piper"


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


def build_status() -> WorkerStatus:
    faster_whisper_ready = import_ready("faster_whisper")
    transformers_ready = import_ready("transformers")
    asr_ready = model_ready(ASR_MODEL, "model.bin")
    translation_ready = model_ready(TRANSLATION_MODEL)
    quality_ready = model_ready(QUALITY_TRANSLATION_MODEL)
    piper_ready = model_ready(PIPER_ROOT)

    blockers: list[str] = []
    if not faster_whisper_ready:
        blockers.append("dependency:faster_whisper_missing")
    if not transformers_ready:
        blockers.append("dependency:transformers_missing")
    if not asr_ready:
        blockers.append("model:faster_whisper_large_v3_turbo_missing")
    if not translation_ready:
        blockers.append("model:marianmt_id_en_missing")
    if not piper_ready:
        blockers.append("model:piper_voice_missing")

    return WorkerStatus(
        ok=not blockers,
        stage="local_realtime_worker_preflight",
        asr_model_ready=asr_ready,
        translation_model_ready=translation_ready,
        quality_translation_model_ready=quality_ready,
        piper_ready=piper_ready,
        faster_whisper_import_ready=faster_whisper_ready,
        transformers_import_ready=transformers_ready,
        blocker=";".join(blockers),
        note="Local worker preflight only. Inference is allowed only when dependencies and local model files are present.",
    )


def handle_status(_: dict[str, Any]) -> dict[str, Any]:
    return asdict(build_status())


def handle_ping(_: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "stage": "ping", "unix_ms": int(time.time() * 1000)}


def handle_asr_preload(_: dict[str, Any]) -> dict[str, Any]:
    status = build_status()
    if not status.faster_whisper_import_ready or not status.asr_model_ready:
        return {"ok": False, "stage": "asr_preload", "blocker": status.blocker, "note": status.note}
    return {
        "ok": True,
        "stage": "asr_preload",
        "model_path": str(ASR_MODEL),
        "model_id": "faster-whisper-large-v3-turbo",
        "device": "cuda",
        "compute_type": "int8_float16",
        "note": "ASR dependency and model files are present. Runtime model loading is the next integration step.",
    }


def handle_translation_preload(payload: dict[str, Any]) -> dict[str, Any]:
    mode = str(payload.get("mode", "Realtime"))
    model_path = QUALITY_TRANSLATION_MODEL if mode.lower() == "quality" else TRANSLATION_MODEL
    model_id = "nllb-200-distilled-600M" if mode.lower() == "quality" else "marianmt-id-en"
    status = build_status()
    if not status.transformers_import_ready or not model_path.exists():
        return {"ok": False, "stage": "translation_preload", "model_id": model_id, "blocker": status.blocker, "note": status.note}
    return {
        "ok": True,
        "stage": "translation_preload",
        "model_path": str(model_path),
        "model_id": model_id,
        "mode": mode,
        "note": "Translation dependency and model files are present. Runtime model loading is the next integration step.",
    }


def handle_tts_preflight(_: dict[str, Any]) -> dict[str, Any]:
    executable = PIPER_ROOT / "piper.exe"
    voices = list(PIPER_ROOT.glob("**/*.onnx")) if PIPER_ROOT.exists() else []
    ok = executable.exists() and bool(voices)
    return {
        "ok": ok,
        "stage": "tts_preflight",
        "piper_executable": str(executable),
        "voice_count": len(voices),
        "blocker": "" if ok else "tts:piper_executable_or_voice_missing",
        "note": "Piper local TTS requires piper.exe and at least one .onnx voice file under EngineData/VoiceEngine/Piper.",
    }


HANDLERS = {
    "ping": handle_ping,
    "status": handle_status,
    "asr_preload": handle_asr_preload,
    "translation_preload": handle_translation_preload,
    "tts_preflight": handle_tts_preflight,
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
