from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any

INPUT_CONTEXT_LIMIT = 2048
MAX_NEW_TOKENS = 256


def mib(value: int | float) -> float:
    return round(float(value) / (1024.0 * 1024.0), 2)


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


def normalized_ids(value: Any) -> set[int]:
    values = value if isinstance(value, (list, tuple, set)) else [value]
    output: set[int] = set()
    for item in values:
        try:
            parsed = int(item)
        except (TypeError, ValueError):
            continue
        if parsed >= 0:
            output.add(parsed)
    return output


def language_name(code: str) -> str:
    mapping = {"id": "Indonesian", "en": "English"}
    if code not in mapping:
        raise ValueError("direction_not_supported")
    return mapping[code]


class MiLMMTRuntime:
    def __init__(self, model_dir: Path, model_id: str, precision: str) -> None:
        import torch
        import transformers
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        self.torch = torch
        self.transformers = transformers
        self.model_id = model_id
        self.precision = precision

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable")
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError("BF16 compute support is unavailable")

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        before_vram = whole_device_vram_mib()
        started = time.perf_counter()

        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
        load_kwargs: dict[str, Any] = {
            "local_files_only": True,
            "device_map": {"": 0},
            "torch_dtype": torch.bfloat16,
        }
        if precision == "int8":
            load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
        elif precision != "bf16":
            raise ValueError(f"unsupported_precision:{precision}")

        self.model = AutoModelForCausalLM.from_pretrained(str(model_dir), **load_kwargs)
        self.model.eval()
        torch.cuda.synchronize()

        if precision == "int8" and not bool(getattr(self.model, "is_loaded_in_8bit", False)):
            raise RuntimeError("MiLMMT 4B did not report an 8-bit loaded state")

        device_map = dict(getattr(self.model, "hf_device_map", {}) or {})
        disallowed = {
            str(value)
            for value in device_map.values()
            if value not in {0, "cuda", "cuda:0"}
        }
        if disallowed:
            raise RuntimeError(f"MiLMMT offloaded outside CUDA: {sorted(disallowed)}")

        self.load_report = {
            "ok": True,
            "stage": "translation_preload",
            "model_id": model_id,
            "precision": precision,
            "device": "cuda",
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda_runtime": torch.version.cuda,
            "input_context_limit_tokens": INPUT_CONTEXT_LIMIT,
            "max_new_tokens": MAX_NEW_TOKENS,
            "do_sample": False,
            "cold_load_ms": round((time.perf_counter() - started) * 1000.0, 2),
            "whole_device_vram_before_load_mib": before_vram,
            "whole_device_vram_after_load_mib": whole_device_vram_mib(),
            "framework_allocated_after_load_mib": mib(torch.cuda.memory_allocated()),
            "framework_reserved_after_load_mib": mib(torch.cuda.memory_reserved()),
            "framework_peak_after_load_mib": mib(torch.cuda.max_memory_allocated()),
            "gpu_total_memory_mib": mib(torch.cuda.get_device_properties(0).total_memory),
            "hf_device_map": {key: str(value) for key, value in device_map.items()},
        }

    def translate(self, source_language: str, target_language: str, source_text: str) -> dict[str, Any]:
        if source_language == target_language:
            raise ValueError("source_and_target_must_differ")
        source_name = language_name(source_language)
        target_name = language_name(target_language)
        text = str(source_text or "").strip()
        if not text:
            raise ValueError("empty_text")

        prompt = (
            f"Translate this from {source_name} to {target_name}:\n"
            f"{source_name}: {text}\n"
            f"{target_name}:"
        )
        inputs = self.tokenizer(
            prompt,
            add_special_tokens=False,
            return_tensors="pt",
            truncation=False,
        )
        prompt_tokens = int(inputs["input_ids"].shape[-1])
        if prompt_tokens > INPUT_CONTEXT_LIMIT:
            raise RuntimeError(f"prompt_too_long:{prompt_tokens}>{INPUT_CONTEXT_LIMIT}")

        inputs = {key: value.to("cuda") for key, value in inputs.items()}
        generation_budget = min(MAX_NEW_TOKENS, max(64, prompt_tokens * 2 + 32))
        self.torch.cuda.synchronize()
        started = time.perf_counter()
        with self.torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                max_new_tokens=generation_budget,
                do_sample=False,
                return_dict_in_generate=True,
            )
        self.torch.cuda.synchronize()
        inference_ms = (time.perf_counter() - started) * 1000.0

        continuation = generated.sequences[0, prompt_tokens:]
        ids = [int(value) for value in continuation.detach().cpu().tolist()]
        pad_ids = normalized_ids(getattr(self.tokenizer, "pad_token_id", None))
        pad_ids.update(normalized_ids(getattr(self.model.config, "pad_token_id", None)))
        generation_config = getattr(self.model, "generation_config", None)
        pad_ids.update(normalized_ids(getattr(generation_config, "pad_token_id", None)))
        while ids and ids[-1] in pad_ids:
            ids.pop()
        if not ids:
            raise RuntimeError("empty_generation_sequence")

        eos_ids = normalized_ids(getattr(self.tokenizer, "eos_token_id", None))
        eos_ids.update(normalized_ids(getattr(self.model.config, "eos_token_id", None)))
        eos_ids.update(normalized_ids(getattr(generation_config, "eos_token_id", None)))
        finished_with_eos = bool(eos_ids and ids[-1] in eos_ids)
        hit_token_ceiling = len(ids) >= generation_budget

        translated = self.tokenizer.decode(ids, skip_special_tokens=True).strip()
        if not translated:
            raise RuntimeError("empty_decoded_translation")

        return {
            "ok": True,
            "stage": "translate",
            "model_id": self.model_id,
            "precision": self.precision,
            "device": "cuda",
            "source_language": source_language,
            "target_language": target_language,
            "prompt_tokens": prompt_tokens,
            "generation_budget_tokens": generation_budget,
            "generated_tokens": len(ids),
            "finished_with_eos": finished_with_eos,
            "hit_token_ceiling": hit_token_ceiling,
            "translated_text": translated,
            "inference_ms": round(inference_ms, 2),
            "framework_allocated_mib": mib(self.torch.cuda.memory_allocated()),
            "framework_reserved_mib": mib(self.torch.cuda.memory_reserved()),
            "framework_peak_mib": mib(self.torch.cuda.max_memory_allocated()),
            "whole_device_vram_mib": whole_device_vram_mib(),
            "blocker": "",
        }


def respond(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--precision", choices=["bf16", "int8"], required=True)
    args = parser.parse_args()

    try:
        runtime = MiLMMTRuntime(Path(args.model_dir).resolve(), args.model_id, args.precision)
        respond(runtime.load_report)
    except Exception as exc:
        respond(
            {
                "ok": False,
                "stage": "translation_preload",
                "model_id": args.model_id,
                "precision": args.precision,
                "blocker": type(exc).__name__,
                "note": str(exc),
                "traceback": traceback.format_exc(limit=12),
            }
        )
        return 1

    for raw in sys.stdin:
        try:
            request = json.loads(raw)
            if request.get("command") == "shutdown":
                respond({"ok": True, "stage": "shutdown"})
                return 0
            if request.get("command") != "translate":
                raise ValueError("unknown_command")
            respond(
                runtime.translate(
                    str(request.get("source_language", "")),
                    str(request.get("target_language", "")),
                    str(request.get("text", "")),
                )
            )
        except Exception as exc:
            respond(
                {
                    "ok": False,
                    "stage": "translate",
                    "model_id": args.model_id,
                    "precision": args.precision,
                    "blocker": type(exc).__name__,
                    "note": str(exc),
                }
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
