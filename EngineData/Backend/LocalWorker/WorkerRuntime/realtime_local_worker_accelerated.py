from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import realtime_local_worker as base

CT2_TRANSLATION_MODEL = base.TRANSLATION_MODEL_ROOT / "marianmt-id-en-ct2"
CT2_TRANSLATION_RUNTIME: dict[str, Any] = {}


def now_ms() -> int:
    return int(time.time() * 1000)


def ct2_model_ready(path: Path = CT2_TRANSLATION_MODEL) -> bool:
    return path.is_dir() and (path / "model.bin").is_file() and (path / "config.json").is_file()


def ct2_cuda_ready() -> bool:
    ready, cuda = base.ctranslate2_status()
    return bool(ready and cuda)


def ct2_device() -> tuple[str, str, str]:
    if ct2_cuda_ready():
        return "cuda", "int8_float16", ""
    return "cpu", "int8", "ct2_cuda_unavailable"


def get_ct2_translation_runtime() -> dict[str, Any]:
    if "Realtime" in CT2_TRANSLATION_RUNTIME:
        return CT2_TRANSLATION_RUNTIME["Realtime"]
    if not ct2_model_ready():
        raise FileNotFoundError(f"CTranslate2 translation model is missing: {CT2_TRANSLATION_MODEL}")
    import ctranslate2
    from transformers import AutoTokenizer

    device, compute_type, fallback_reason = ct2_device()
    tokenizer = AutoTokenizer.from_pretrained(str(base.TRANSLATION_MODEL), local_files_only=True)
    try:
        translator = ctranslate2.Translator(str(CT2_TRANSLATION_MODEL), device=device, compute_type=compute_type)
    except Exception as exc:
        if device == "cuda":
            translator = ctranslate2.Translator(str(CT2_TRANSLATION_MODEL), device="cpu", compute_type="int8")
            device = "cpu"
            compute_type = "int8"
            fallback_reason = f"ct2_cuda_fallback:{type(exc).__name__}"
        else:
            raise
    runtime = {
        "mode": "Realtime",
        "model_id": "marianmt-id-en-ct2",
        "model_path": str(CT2_TRANSLATION_MODEL),
        "tokenizer": tokenizer,
        "translator": translator,
        "device": device,
        "compute_type": compute_type,
        "fallback_reason": fallback_reason,
    }
    CT2_TRANSLATION_RUNTIME["Realtime"] = runtime
    return runtime


def encode_tokens(tokenizer: Any, text: str) -> list[str]:
    token_ids = tokenizer.encode(text, add_special_tokens=True, truncation=True, max_length=256)
    return tokenizer.convert_ids_to_tokens(token_ids)


def decode_tokens(tokenizer: Any, tokens: list[str]) -> str:
    token_ids = tokenizer.convert_tokens_to_ids(tokens)
    return base.compact_runtime_text(tokenizer.decode(token_ids, skip_special_tokens=True), base.MAX_TRANSLATION_TEXT_CHARS)


def handle_translate(payload: dict[str, Any]) -> dict[str, Any]:
    started = now_ms()
    text = base.compact_runtime_text(payload.get("text", ""), base.MAX_TRANSLATION_TEXT_CHARS)
    source_language = base.normalize_language(payload.get("source_language", "id"), "id")
    target_language = base.normalize_language(payload.get("target_language", "en"), "en")
    pair = base.direction_pair(source_language, target_language)
    mode = str(payload.get("mode", "Realtime"))
    if not text:
        return {"ok": False, "stage": "translate", "blocker": "translation:empty_text", "direction_pair": pair}
    if mode.lower() == "quality" or not base.realtime_direction_supported(source_language, target_language):
        return base.handle_translate(payload)
    if not ct2_model_ready():
        fallback = base.handle_translate(payload)
        fallback["ct2_model_ready"] = False
        fallback["ct2_model_path"] = str(CT2_TRANSLATION_MODEL)
        fallback["ct2_setup_required"] = True
        return fallback
    try:
        runtime = get_ct2_translation_runtime()
        tokenizer = runtime["tokenizer"]
        translator = runtime["translator"]
        max_decoding_length = base.bounded_int(payload.get("max_new_tokens", 64), 64, 1, base.MAX_GENERATION_TOKENS)
        source_tokens = encode_tokens(tokenizer, text)
        results = translator.translate_batch([source_tokens], beam_size=1, max_decoding_length=max_decoding_length)
        translated = decode_tokens(tokenizer, list(results[0].hypotheses[0])) if results and results[0].hypotheses else ""
        return {
            "ok": bool(translated),
            "stage": "translate",
            "mode": "Realtime",
            "model_id": runtime["model_id"],
            "device": runtime["device"],
            "compute_type": runtime["compute_type"],
            "device_note": "ct2_cuda" if runtime["device"] == "cuda" else "ct2_cpu_fallback",
            "translation_gpu_requested": True,
            "translation_torch_cuda_available": base.translation_cuda_available(),
            "translation_ctranslate2_cuda_available": ct2_cuda_ready(),
            "translation_degraded": runtime["device"] != "cuda",
            "translation_fallback_reason": runtime["fallback_reason"],
            "source_language": source_language,
            "target_language": target_language,
            "direction_pair": pair,
            "direction_supported": True,
            "translated_text": translated,
            "elapsed_ms": now_ms() - started,
            "blocker": "" if translated else "translation:empty_output",
        }
    except Exception as exc:
        fallback = base.handle_translate(payload)
        fallback["ct2_error"] = f"{type(exc).__name__}: {exc}"
        fallback["ct2_fallback_used"] = True
        return fallback


def handle_status(payload: dict[str, Any]) -> dict[str, Any]:
    status = base.handle_status(payload)
    model_ready = ct2_model_ready()
    cuda_ready = ct2_cuda_ready()
    if model_ready and cuda_ready:
        status["selected_translation_device"] = "cuda"
        status["fallback_reason"] = ""
    status["ct2_translation_model_ready"] = model_ready
    status["ct2_translation_model_path"] = str(CT2_TRANSLATION_MODEL)
    status["ct2_translation_cuda_available"] = cuda_ready
    status["translation_acceleration"] = "ct2_cuda_ready" if model_ready and cuda_ready else "ct2_setup_required" if cuda_ready else "ct2_cuda_unavailable"
    return status


HANDLERS = dict(base.HANDLERS)
HANDLERS["status"] = handle_status
HANDLERS["translate"] = handle_translate


def respond(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    for raw in sys.stdin:
        if len(raw.encode("utf-8", errors="ignore")) > base.MAX_WORKER_REQUEST_BYTES:
            respond({"ok": False, "stage": "worker_request", "blocker": "worker:request_too_large", "max_bytes": base.MAX_WORKER_REQUEST_BYTES})
            continue
        try:
            request = json.loads(raw)
            if not isinstance(request, dict):
                respond({"ok": False, "stage": "worker_request", "blocker": "worker:request_must_be_object"})
                continue
            command = base.safe_command_name(request.get("command", "status"))
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
