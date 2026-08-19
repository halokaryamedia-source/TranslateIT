from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any

MAX_TARGET_LENGTH = 256


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


def load_tokenizer_class(model_dir: Path) -> Any:
    path = model_dir / "tokenization_small100.py"
    if not path.is_file():
        raise RuntimeError(f"SMaLL-100 tokenizer source missing: {path}")
    spec = importlib.util.spec_from_file_location("translateit_small100_tokenizer", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load SMaLL-100 tokenizer source")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    tokenizer_class = getattr(module, "SMALL100Tokenizer", None)
    if tokenizer_class is None:
        raise RuntimeError("SMALL100Tokenizer class unavailable")
    return tokenizer_class


def normalized_token_ids(value: Any) -> set[int]:
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


def generation_eos_ids(tokenizer: Any, model: Any) -> set[int]:
    output = normalized_token_ids(getattr(tokenizer, "eos_token_id", None))
    output.update(normalized_token_ids(getattr(model.config, "eos_token_id", None)))
    output.update(
        normalized_token_ids(getattr(getattr(model, "generation_config", None), "eos_token_id", None))
    )
    return output


def generation_pad_ids(tokenizer: Any, model: Any) -> set[int]:
    output = normalized_token_ids(getattr(tokenizer, "pad_token_id", None))
    output.update(normalized_token_ids(getattr(model.config, "pad_token_id", None)))
    output.update(
        normalized_token_ids(getattr(getattr(model, "generation_config", None), "pad_token_id", None))
    )
    return output


class Small100Runtime:
    def __init__(self, model_dir: Path) -> None:
        import torch
        import transformers
        from transformers import AutoModelForSeq2SeqLM

        self.torch = torch
        self.transformers = transformers
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable for SMaLL-100 prescreen")

        self.model_dir = model_dir
        tokenizer_class = load_tokenizer_class(model_dir)

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        before_vram = whole_device_vram_mib()
        started = time.perf_counter()

        self.tokenizer = tokenizer_class.from_pretrained(
            str(model_dir),
            local_files_only=True,
            tgt_lang="en",
        )
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            str(model_dir),
            local_files_only=True,
            use_safetensors=True,
            torch_dtype=torch.float32,
        ).to("cuda")
        self.model.eval()
        torch.cuda.synchronize()

        self.context_limit = int(getattr(self.model.config, "max_position_embeddings", 0) or 0)
        if self.context_limit <= 0:
            raise RuntimeError("SMaLL-100 model context limit unavailable")

        self.load_report = {
            "ok": True,
            "stage": "translation_preload",
            "model_id": "small100",
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

        self.tokenizer.tgt_lang = target_language
        inputs = self.tokenizer(text, return_tensors="pt", truncation=False)
        input_tokens = int(inputs["input_ids"].shape[-1])
        if input_tokens > self.context_limit:
            raise RuntimeError(
                f"input_too_long_for_model:{input_tokens}>{self.context_limit}"
            )
        budget = MAX_TARGET_LENGTH - 1
        inputs = {key: value.to("cuda") for key, value in inputs.items()}

        self.torch.cuda.synchronize()
        started = time.perf_counter()
        with self.torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                max_length=MAX_TARGET_LENGTH,
                num_beams=5,
                do_sample=False,
                return_dict_in_generate=True,
            )
        self.torch.cuda.synchronize()
        inference_ms = (time.perf_counter() - started) * 1000.0

        sequences = generated.sequences
        ids = [int(v) for v in sequences[0].detach().cpu().tolist()]
        pad_ids = generation_pad_ids(self.tokenizer, self.model)
        while ids and ids[-1] in pad_ids:
            ids.pop()
        if not ids:
            raise RuntimeError("empty_generation_sequence")
        eos_ids = generation_eos_ids(self.tokenizer, self.model)
        if not eos_ids:
            raise RuntimeError("eos_token_unavailable")
        finished_with_eos = ids[-1] in eos_ids
        generated_tokens = max(0, len(ids) - 1)
        hit_token_ceiling = generated_tokens >= budget
        if not finished_with_eos:
            suffix = "_hit_token_ceiling" if hit_token_ceiling else ""
            raise RuntimeError(f"generation_ended_without_eos{suffix}")

        translated = self.tokenizer.batch_decode(
            sequences, skip_special_tokens=True
        )[0].strip()
        if not translated:
            raise RuntimeError("empty_decoded_translation")

        return {
            "ok": True,
            "stage": "translate",
            "model_id": "small100",
            "device": "cuda",
            "dtype": str(next(self.model.parameters()).dtype),
            "source_language": source_language,
            "target_language": target_language,
            "input_tokens": input_tokens,
            "context_tokens": self.context_limit,
            "generation_budget_tokens": budget,
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
    model_dir = Path(args.model_dir).resolve()

    try:
        runtime = Small100Runtime(model_dir)
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
            result = runtime.translate(
                str(request.get("source_language", "")),
                str(request.get("target_language", "")),
                str(request.get("text", "")),
            )
            respond(result)
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
