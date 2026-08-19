from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any

MIN_GENERATION_TOKENS = 32
MAX_GENERATION_TOKENS = 256


def mib(value: int | float) -> float:
    return round(float(value) / (1024.0 * 1024.0), 2)


def whole_device_vram_mib() -> int | None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits", "--id=0"],
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


class M2M12BRuntime:
    def __init__(self, model_dir: Path) -> None:
        import torch
        import transformers
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.torch = torch
        self.transformers = transformers
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable for M2M100-1.2B prescreen")
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError("BF16 is unavailable for M2M100-1.2B prescreen")

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        before_vram = whole_device_vram_mib()
        started = time.perf_counter()

        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            str(model_dir),
            local_files_only=True,
            torch_dtype=torch.bfloat16,
        ).to("cuda")
        self.model.eval()
        torch.cuda.synchronize()

        if not callable(getattr(self.tokenizer, "get_lang_id", None)):
            raise RuntimeError("M2M100 target-language token API unavailable")
        self.context_limit = int(getattr(self.model.config, "max_position_embeddings", 0) or 0)
        if self.context_limit <= 0:
            raise RuntimeError("M2M100 model context limit unavailable")

        self.load_report = {
            "ok": True,
            "stage": "translation_preload",
            "model_id": "m2m100-1.2b",
            "device": "cuda",
            "dtype": str(next(self.model.parameters()).dtype),
            "transformers": transformers.__version__,
            "torch": torch.__version__,
            "cuda_runtime": torch.version.cuda,
            "context_tokens": self.context_limit,
            "num_beams": 5,
            "do_sample": False,
            "cold_load_ms": round((time.perf_counter() - started) * 1000.0, 2),
            "whole_device_vram_before_load_mib": before_vram,
            "whole_device_vram_after_load_mib": whole_device_vram_mib(),
            "framework_allocated_after_load_mib": mib(torch.cuda.memory_allocated()),
            "framework_peak_after_load_mib": mib(torch.cuda.max_memory_allocated()),
        }

    def translate(self, source_language: str, target_language: str, source_text: str) -> dict[str, Any]:
        if source_language not in {"id", "en"} or target_language not in {"id", "en"}:
            raise ValueError("direction_not_supported")
        if source_language == target_language:
            raise ValueError("source_and_target_must_differ")
        text = str(source_text or "").strip()
        if not text:
            raise ValueError("empty_text")

        self.tokenizer.src_lang = source_language
        inputs = self.tokenizer(text, return_tensors="pt", truncation=False)
        input_tokens = int(inputs["input_ids"].shape[-1])
        if input_tokens > self.context_limit:
            raise RuntimeError(f"input_too_long_for_model:{input_tokens}>{self.context_limit}")

        generation_budget = min(
            MAX_GENERATION_TOKENS,
            max(MIN_GENERATION_TOKENS, input_tokens * 2 + 16),
        )
        target_id = int(self.tokenizer.get_lang_id(target_language))
        inputs = {key: value.to("cuda") for key, value in inputs.items()}

        self.torch.cuda.synchronize()
        started = time.perf_counter()
        with self.torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                max_new_tokens=generation_budget,
                forced_bos_token_id=target_id,
                num_beams=5,
                do_sample=False,
                return_dict_in_generate=True,
            )
        self.torch.cuda.synchronize()
        inference_ms = (time.perf_counter() - started) * 1000.0

        sequences = generated.sequences
        ids = [int(value) for value in sequences[0].detach().cpu().tolist()]
        pad_ids = normalized_ids(getattr(self.tokenizer, "pad_token_id", None))
        pad_ids.update(normalized_ids(getattr(self.model.config, "pad_token_id", None)))
        while ids and ids[-1] in pad_ids:
            ids.pop()
        if not ids:
            raise RuntimeError("empty_generation_sequence")

        eos_ids = normalized_ids(getattr(self.tokenizer, "eos_token_id", None))
        eos_ids.update(normalized_ids(getattr(self.model.config, "eos_token_id", None)))
        if not eos_ids:
            raise RuntimeError("eos_token_unavailable")
        generated_tokens = max(0, len(ids) - 1)
        finished_with_eos = ids[-1] in eos_ids
        hit_token_ceiling = generated_tokens >= generation_budget
        if not finished_with_eos:
            suffix = "_hit_token_ceiling" if hit_token_ceiling else ""
            raise RuntimeError(f"generation_ended_without_eos{suffix}")

        translated = self.tokenizer.batch_decode(sequences, skip_special_tokens=True)[0].strip()
        if not translated:
            raise RuntimeError("empty_decoded_translation")

        return {
            "ok": True,
            "stage": "translate",
            "model_id": "m2m100-1.2b",
            "device": "cuda",
            "dtype": str(next(self.model.parameters()).dtype),
            "source_language": source_language,
            "target_language": target_language,
            "input_tokens": input_tokens,
            "context_tokens": self.context_limit,
            "generation_budget_tokens": generation_budget,
            "generated_tokens": generated_tokens,
            "finished_with_eos": True,
            "hit_token_ceiling": hit_token_ceiling,
            "translated_text": translated,
            "inference_ms": round(inference_ms, 2),
            "framework_allocated_mib": mib(self.torch.cuda.memory_allocated()),
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
    args = parser.parse_args()

    try:
        runtime = M2M12BRuntime(Path(args.model_dir).resolve())
        respond(runtime.load_report)
    except Exception as exc:
        respond(
            {
                "ok": False,
                "stage": "translation_preload",
                "blocker": type(exc).__name__,
                "note": str(exc),
                "traceback": traceback.format_exc(limit=10),
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
