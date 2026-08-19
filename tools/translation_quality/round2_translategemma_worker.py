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
MAX_NEW_TOKENS = 200


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


def environment_probe() -> dict[str, Any]:
    import bitsandbytes as bnb
    import torch
    import transformers
    import accelerate

    cuda_available = bool(torch.cuda.is_available())
    bf16_supported = bool(cuda_available and torch.cuda.is_bf16_supported())
    gpu_name = torch.cuda.get_device_name(0) if cuda_available else ""
    compute_capability = (
        ".".join(str(v) for v in torch.cuda.get_device_capability(0))
        if cuda_available
        else ""
    )
    linear8_available = bool(getattr(getattr(bnb, "nn", None), "Linear8bitLt", None))
    return {
        "ok": bool(cuda_available and bf16_supported and linear8_available),
        "stage": "environment_probe",
        "python": sys.version.split()[0],
        "torch": torch.__version__,
        "transformers": transformers.__version__,
        "accelerate": accelerate.__version__,
        "bitsandbytes": bnb.__version__,
        "cuda_runtime": torch.version.cuda,
        "cuda_available": cuda_available,
        "bf16_supported": bf16_supported,
        "gpu_name": gpu_name,
        "compute_capability": compute_capability,
        "llm_int8_module_available": linear8_available,
        "blocker": "" if cuda_available and bf16_supported and linear8_available else "environment_not_ready",
    }


class TranslateGemmaRuntime:
    def __init__(self, model_dir: Path) -> None:
        import bitsandbytes as bnb
        import torch
        import transformers
        from transformers import AutoModelForImageTextToText, AutoTokenizer, BitsAndBytesConfig

        self.bnb = bnb
        self.torch = torch
        self.transformers = transformers

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable for TranslateGemma prescreen")
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError("BF16 compute support is unavailable for TranslateGemma prescreen")

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        before_vram = whole_device_vram_mib()
        started = time.perf_counter()

        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
        quantization_config = BitsAndBytesConfig(load_in_8bit=True)
        self.model = AutoModelForImageTextToText.from_pretrained(
            str(model_dir),
            local_files_only=True,
            quantization_config=quantization_config,
            device_map={"": 0},
            torch_dtype=torch.bfloat16,
        )
        self.model.eval()
        torch.cuda.synchronize()

        quantized_linear_count = sum(
            1 for module in self.model.modules() if isinstance(module, bnb.nn.Linear8bitLt)
        )
        if quantized_linear_count <= 0:
            raise RuntimeError("LLM.int8 quantized linear modules were not created")
        if not bool(getattr(self.model, "is_loaded_in_8bit", False)):
            raise RuntimeError("TranslateGemma did not report an 8-bit loaded state")

        device_map = dict(getattr(self.model, "hf_device_map", {}) or {})
        disallowed = {
            str(value)
            for value in device_map.values()
            if value not in {0, "cuda", "cuda:0"}
        }
        if disallowed:
            raise RuntimeError(f"TranslateGemma offloaded outside CUDA: {sorted(disallowed)}")

        self.load_report = {
            "ok": True,
            "stage": "translation_preload",
            "model_id": "translategemma-4b-it-int8",
            "device": "cuda",
            "quantization": "bitsandbytes_llm_int8",
            "non_quantized_compute_dtype": "torch.bfloat16",
            "transformers": transformers.__version__,
            "bitsandbytes": bnb.__version__,
            "torch": torch.__version__,
            "cuda_runtime": torch.version.cuda,
            "input_context_limit_tokens": INPUT_CONTEXT_LIMIT,
            "max_new_tokens": MAX_NEW_TOKENS,
            "do_sample": False,
            "quantized_linear_modules": quantized_linear_count,
            "hf_device_map": {key: str(value) for key, value in device_map.items()},
            "cold_load_ms": round((time.perf_counter() - started) * 1000.0, 2),
            "whole_device_vram_before_load_mib": before_vram,
            "whole_device_vram_after_load_mib": whole_device_vram_mib(),
            "framework_allocated_after_load_mib": mib(torch.cuda.memory_allocated()),
            "framework_reserved_after_load_mib": mib(torch.cuda.memory_reserved()),
            "framework_peak_after_load_mib": mib(torch.cuda.max_memory_allocated()),
            "gpu_total_memory_mib": mib(torch.cuda.get_device_properties(0).total_memory),
        }

    def translate(self, source_language: str, target_language: str, source_text: str) -> dict[str, Any]:
        if source_language not in {"id", "en"} or target_language not in {"id", "en"}:
            raise ValueError("direction_not_supported")
        if source_language == target_language:
            raise ValueError("source_and_target_must_differ")
        text = str(source_text or "").strip()
        if not text:
            raise ValueError("empty_text")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "source_lang_code": source_language,
                        "target_lang_code": target_language,
                        "text": text,
                    }
                ],
            }
        ]
        inputs = self.tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
        )
        if "input_ids" not in inputs:
            raise RuntimeError("chat_template_did_not_return_input_ids")
        prompt_tokens = int(inputs["input_ids"].shape[-1])
        if prompt_tokens > INPUT_CONTEXT_LIMIT:
            raise RuntimeError(
                f"prompt_too_long_for_translategemma:{prompt_tokens}>{INPUT_CONTEXT_LIMIT}"
            )

        inputs = {key: value.to("cuda") for key, value in inputs.items()}
        self.torch.cuda.synchronize()
        started = time.perf_counter()
        with self.torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                do_sample=False,
                return_dict_in_generate=True,
            )
        self.torch.cuda.synchronize()
        inference_ms = (time.perf_counter() - started) * 1000.0

        continuation = generated.sequences[0, prompt_tokens:]
        ids = [int(value) for value in continuation.detach().cpu().tolist()]
        pad_ids = normalized_ids(getattr(self.tokenizer, "pad_token_id", None))
        pad_ids.update(normalized_ids(getattr(self.model.config, "pad_token_id", None)))
        pad_ids.update(
            normalized_ids(getattr(getattr(self.model, "generation_config", None), "pad_token_id", None))
        )
        while ids and ids[-1] in pad_ids:
            ids.pop()
        if not ids:
            raise RuntimeError("empty_generation_sequence")

        eos_ids = normalized_ids(getattr(self.tokenizer, "eos_token_id", None))
        eos_ids.update(normalized_ids(getattr(self.model.config, "eos_token_id", None)))
        eos_ids.update(
            normalized_ids(getattr(getattr(self.model, "generation_config", None), "eos_token_id", None))
        )
        if not eos_ids:
            raise RuntimeError("eos_token_unavailable")
        finished_with_eos = ids[-1] in eos_ids
        hit_token_ceiling = len(ids) >= MAX_NEW_TOKENS
        if not finished_with_eos:
            suffix = "_hit_token_ceiling" if hit_token_ceiling else ""
            raise RuntimeError(f"generation_ended_without_eos{suffix}")

        translated = self.tokenizer.decode(ids, skip_special_tokens=True).strip()
        if not translated:
            raise RuntimeError("empty_decoded_translation")

        return {
            "ok": True,
            "stage": "translate",
            "model_id": "translategemma-4b-it-int8",
            "device": "cuda",
            "source_language": source_language,
            "target_language": target_language,
            "prompt_tokens": prompt_tokens,
            "max_input_context_tokens": INPUT_CONTEXT_LIMIT,
            "max_new_tokens": MAX_NEW_TOKENS,
            "generated_tokens_including_eos": len(ids),
            "finished_with_eos": True,
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
    parser.add_argument("--model-dir")
    parser.add_argument("--environment-probe", action="store_true")
    args = parser.parse_args()

    if args.environment_probe:
        try:
            result = environment_probe()
            respond(result)
            return 0 if result.get("ok") else 1
        except Exception as exc:
            respond(
                {
                    "ok": False,
                    "stage": "environment_probe",
                    "blocker": type(exc).__name__,
                    "note": str(exc),
                    "traceback": traceback.format_exc(limit=8),
                }
            )
            return 1

    if not args.model_dir:
        respond(
            {
                "ok": False,
                "stage": "translation_preload",
                "blocker": "model_dir_required",
                "note": "--model-dir is required unless --environment-probe is used",
            }
        )
        return 1

    try:
        runtime = TranslateGemmaRuntime(Path(args.model_dir).resolve())
        respond(runtime.load_report)
    except Exception as exc:
        respond(
            {
                "ok": False,
                "stage": "translation_preload",
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
                    "blocker": type(exc).__name__,
                    "note": str(exc),
                }
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
