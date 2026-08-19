from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

MIN_GENERATION_TOKENS = 32
MAX_GENERATION_TOKENS = 512
OUTPUT_TOKEN_MULTIPLIER = 2
OUTPUT_TOKEN_MARGIN = 16
LANGUAGE_NAMES = {"en": "English", "id": "Indonesian"}

TOKENIZER: Any | None = None
MODEL: Any | None = None
TORCH: Any | None = None
MODEL_DIR: Path | None = None
RUNTIME: dict[str, Any] = {}


def mib(value: int | float) -> float:
    return round(float(value) / (1024 * 1024), 2)


def whole_device_vram_mib() -> int | None:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.used",
                "--format=csv,noheader,nounits",
                "--id=0",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        if result.returncode != 0:
            return None
        return int(result.stdout.strip().splitlines()[0].strip())
    except Exception:
        return None


def normalize_language(value: Any) -> str:
    text = str(value or "").strip().lower().replace("_latn", "")
    if text.startswith("ind") or text == "id":
        return "id"
    if text.startswith("eng") or text == "en":
        return "en"
    raise ValueError("translation:direction_not_supported")


def token_ids(value: Any) -> set[int]:
    values = value if isinstance(value, (list, tuple, set)) else [value]
    result: set[int] = set()
    for item in values:
        try:
            parsed = int(item)
        except (TypeError, ValueError):
            continue
        if parsed >= 0:
            result.add(parsed)
    return result


def eos_ids(tokenizer: Any, model: Any) -> set[int]:
    result: set[int] = set()
    result.update(token_ids(getattr(tokenizer, "eos_token_id", None)))
    result.update(token_ids(getattr(model.config, "eos_token_id", None)))
    result.update(token_ids(getattr(model.generation_config, "eos_token_id", None)))
    return result


def pad_ids(tokenizer: Any, model: Any) -> set[int]:
    result: set[int] = set()
    result.update(token_ids(getattr(tokenizer, "pad_token_id", None)))
    result.update(token_ids(getattr(model.config, "pad_token_id", None)))
    result.update(token_ids(getattr(model.generation_config, "pad_token_id", None)))
    return result


def trim_pads(ids: list[int], tokenizer: Any, model: Any) -> list[int]:
    result = list(ids)
    pads = pad_ids(tokenizer, model)
    while result and result[-1] in pads:
        result.pop()
    return result


def generation_budget(source_tokens: int, requested_floor: Any) -> int:
    try:
        floor = int(requested_floor)
    except (TypeError, ValueError):
        floor = MIN_GENERATION_TOKENS
    floor = max(MIN_GENERATION_TOKENS, min(MAX_GENERATION_TOKENS, floor))
    estimate = source_tokens * OUTPUT_TOKEN_MULTIPLIER + OUTPUT_TOKEN_MARGIN
    return min(MAX_GENERATION_TOKENS, max(floor, estimate))


def render_prompt(
    tokenizer: Any, source_language: str, target_language: str, source_text: str
) -> str:
    src = LANGUAGE_NAMES[source_language]
    tgt = LANGUAGE_NAMES[target_language]
    prompt = (
        f"Translate the following text from {src} into {tgt}:\n"
        f"{src}: {source_text}\n"
        f"{tgt}:"
    )
    return tokenizer.apply_chat_template(
        [{"role": "user", "content": prompt}],
        tokenize=False,
        add_generation_prompt=True,
    )


def preload() -> dict[str, Any]:
    global TOKENIZER, MODEL, TORCH, RUNTIME
    if MODEL is not None:
        return {"ok": True, "stage": "translation_preload", **RUNTIME}

    import torch
    import transformers
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if transformers.__version__ != "4.51.3":
        raise RuntimeError(
            f"translation:lmt_transformers_version_mismatch:{transformers.__version__}"
        )
    if not torch.cuda.is_available():
        raise RuntimeError("translation:lmt_cuda_unavailable")
    if not torch.cuda.is_bf16_supported():
        raise RuntimeError("translation:lmt_bf16_unavailable")
    if MODEL_DIR is None or not MODEL_DIR.is_dir():
        raise RuntimeError("translation:lmt_model_dir_missing")

    before = whole_device_vram_mib()
    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats()
    started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(
        str(MODEL_DIR), local_files_only=True, padding_side="left"
    )
    model = AutoModelForCausalLM.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
        torch_dtype=torch.bfloat16,
        attn_implementation="sdpa",
    ).to("cuda")
    model.eval()
    torch.cuda.synchronize()
    cold_ms = (time.perf_counter() - started) * 1000.0

    dtype = str(next(model.parameters()).dtype)
    attention = str(getattr(model.config, "_attn_implementation", ""))
    if "bfloat16" not in dtype:
        raise RuntimeError(f"translation:lmt_dtype_mismatch:{dtype}")
    if attention != "sdpa":
        raise RuntimeError(f"translation:lmt_attention_mismatch:{attention}")

    TOKENIZER = tokenizer
    MODEL = model
    TORCH = torch
    RUNTIME = {
        "model_id": "lmt-60-1.7b",
        "device": "cuda",
        "dtype": dtype,
        "attention": attention,
        "use_cache": True,
        "cache_implementation": "dynamic",
        "num_beams": 5,
        "do_sample": False,
        "cold_load_ms": round(cold_ms, 2),
        "whole_device_vram_before_load_mib": before,
        "whole_device_vram_after_load_mib": whole_device_vram_mib(),
        "framework_allocated_after_load_mib": mib(torch.cuda.memory_allocated()),
        "framework_peak_after_load_mib": mib(torch.cuda.max_memory_allocated()),
        "transformers": transformers.__version__,
        "torch": torch.__version__,
    }
    return {"ok": True, "stage": "translation_preload", **RUNTIME}


def translate(payload: dict[str, Any]) -> dict[str, Any]:
    if MODEL is None:
        preload()
    assert TOKENIZER is not None and MODEL is not None and TORCH is not None
    tokenizer, model, torch = TOKENIZER, MODEL, TORCH

    text = str(payload.get("text", "")).replace("\x00", "").strip()
    if not text:
        return {"ok": False, "stage": "translate", "blocker": "translation:empty_text"}
    source_language = normalize_language(payload.get("source_language"))
    target_language = normalize_language(payload.get("target_language"))
    if source_language == target_language:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:direction_not_supported",
        }

    source_encoding = tokenizer(text, add_special_tokens=False, truncation=False)
    source_ids = source_encoding.get("input_ids", [])
    if source_ids and isinstance(source_ids[0], list):
        source_ids = source_ids[0]
    source_tokens = len(source_ids)
    budget = generation_budget(source_tokens, payload.get("max_new_tokens", 32))

    rendered = render_prompt(tokenizer, source_language, target_language, text)
    inputs = tokenizer(rendered, return_tensors="pt", truncation=False)
    prompt_tokens = int(inputs["input_ids"].shape[-1])
    context_limit = int(model.config.max_position_embeddings)
    if prompt_tokens + budget > context_limit:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": "translation:prompt_plus_generation_exceeds_context",
            "source_tokens": source_tokens,
            "prompt_tokens": prompt_tokens,
            "generation_budget_tokens": budget,
            "max_position_embeddings": context_limit,
        }

    inputs = {key: value.to("cuda") for key, value in inputs.items()}
    torch.cuda.synchronize()
    started = time.perf_counter()
    with torch.inference_mode():
        generation = model.generate(
            **inputs,
            max_new_tokens=budget,
            num_beams=5,
            do_sample=False,
            use_cache=True,
            cache_implementation="dynamic",
            return_dict_in_generate=True,
        )
    torch.cuda.synchronize()
    inference_ms = (time.perf_counter() - started) * 1000.0

    full_ids = [int(value) for value in generation.sequences[0].detach().cpu().tolist()]
    continuation = trim_pads(full_ids[prompt_tokens:], tokenizer, model)
    known_eos = eos_ids(tokenizer, model)
    finished = bool(continuation and continuation[-1] in known_eos)
    generated_tokens = len(continuation)
    if not finished:
        return {
            "ok": False,
            "stage": "translate",
            "blocker": (
                "translation:output_hit_token_ceiling_without_eos"
                if generated_tokens >= budget
                else "translation:output_ended_without_eos"
            ),
            "source_tokens": source_tokens,
            "prompt_tokens": prompt_tokens,
            "generation_budget_tokens": budget,
            "generated_tokens": generated_tokens,
            "finished_with_eos": False,
            "inference_ms": round(inference_ms, 2),
        }

    translated = tokenizer.decode(continuation, skip_special_tokens=True).strip()
    return {
        "ok": bool(translated),
        "stage": "translate",
        "model_id": "lmt-60-1.7b",
        "device": "cuda",
        "source_language": source_language,
        "target_language": target_language,
        "source_tokens": source_tokens,
        "prompt_tokens": prompt_tokens,
        "generation_budget_tokens": budget,
        "generated_tokens": generated_tokens,
        "finished_with_eos": True,
        "translated_text": translated,
        "inference_ms": round(inference_ms, 2),
        "blocker": "" if translated else "translation:empty_output",
    }


def respond(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    global MODEL_DIR
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()
    MODEL_DIR = Path(args.model_dir).resolve()

    for raw in sys.stdin:
        try:
            request = json.loads(raw)
            command = str(request.get("command", "")).strip().lower()
            if command == "translation_preload":
                respond(preload())
            elif command == "translate":
                respond(translate(request))
            elif command == "status":
                respond({"ok": True, "loaded": MODEL is not None, **RUNTIME})
            else:
                respond(
                    {
                        "ok": False,
                        "stage": command or "unknown",
                        "blocker": "worker:unknown_command",
                    }
                )
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
