from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODEL_REPO = "NiuTrans/LMT-60-1.7B"
MODEL_REVISION = "2ff175e2a450d2f2458b33234bfb74953468b3a2"
FLORES_REPO = "openlanguagedata/flores_plus"
FLORES_REVISION = "5fec6c13f9e5a4db2f745d4ec0d7c9721ddc4f06"
FLORES_VERSION = "4.6"
FLORES_ROWS = 1012
FLORES_FILES = {
    "en": "devtest/eng_Latn.jsonl",
    "id": "devtest/ind_Latn.jsonl",
}
MODEL_ALLOW_PATTERNS = [
    "added_tokens.json",
    "chat_template.jinja",
    "config.json",
    "generation_config.json",
    "merges.txt",
    "model.safetensors",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
]
LANGUAGE_NAMES = {"en": "English", "id": "Indonesian"}
PROBES = [
    ("id", "en", "Selamat pagi. Tolong simpan file ini di komputer lokal."),
    ("en", "id", "Good morning. Please keep this file on the local computer."),
]
MAX_NEW_TOKENS = 96


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def mib(value: int | float) -> float:
    return round(float(value) / (1024 * 1024), 2)


def whole_device_vram_mib() -> int | None:
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.used",
                "--format=csv,noheader,nounits",
                "--id=0",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if completed.returncode != 0:
            return None
        first = completed.stdout.strip().splitlines()[0].strip()
        return int(first)
    except Exception:
        return None


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, 1):
            line = raw.strip()
            if not line:
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise RuntimeError(f"FLORES row {line_number} is not an object: {path.name}")
            rows.append(value)
    return rows


def row_id(row: dict[str, Any]) -> str:
    for key in ("id", "sentence_id", "sentence_index"):
        if key in row:
            return str(row[key])
    raise RuntimeError("FLORES row does not expose an alignment id field")


def verify_flores(root: Path, token: str) -> dict[str, Any]:
    from huggingface_hub import HfApi, hf_hub_download

    api = HfApi()
    info = api.dataset_info(FLORES_REPO, revision=FLORES_REVISION, token=token)
    resolved_sha = str(info.sha or "")
    if resolved_sha != FLORES_REVISION:
        raise RuntimeError(
            f"FLORES revision mismatch: expected {FLORES_REVISION}, resolved {resolved_sha or '<none>'}"
        )

    flores_dir = root / "flores_plus"
    flores_dir.mkdir(parents=True, exist_ok=True)
    readme = Path(
        hf_hub_download(
            FLORES_REPO,
            filename="README.md",
            repo_type="dataset",
            revision=FLORES_REVISION,
            token=token,
            local_dir=flores_dir,
        )
    )
    readme_text = readme.read_text(encoding="utf-8")
    version_patterns = [
        rf"current version[^`]*`{re.escape(FLORES_VERSION)}`",
        rf"version\s*[:=]\s*['\"]?{re.escape(FLORES_VERSION)}",
    ]
    if not any(re.search(pattern, readme_text, flags=re.IGNORECASE) for pattern in version_patterns):
        raise RuntimeError(f"FLORES README at pinned revision does not declare version {FLORES_VERSION}")

    local_files: dict[str, Path] = {}
    for language, filename in FLORES_FILES.items():
        local_files[language] = Path(
            hf_hub_download(
                FLORES_REPO,
                filename=filename,
                repo_type="dataset",
                revision=FLORES_REVISION,
                token=token,
                local_dir=flores_dir,
            )
        )

    en_rows = read_jsonl(local_files["en"])
    id_rows = read_jsonl(local_files["id"])
    if len(en_rows) != FLORES_ROWS or len(id_rows) != FLORES_ROWS:
        raise RuntimeError(
            f"FLORES devtest row count mismatch: en={len(en_rows)}, id={len(id_rows)}, expected={FLORES_ROWS}"
        )
    en_ids = [row_id(row) for row in en_rows]
    id_ids = [row_id(row) for row in id_rows]
    if en_ids != id_ids:
        raise RuntimeError("FLORES eng_Latn and ind_Latn devtest alignment ids do not match in order")

    return {
        "repo": FLORES_REPO,
        "revision": FLORES_REVISION,
        "version": FLORES_VERSION,
        "rows_per_language": FLORES_ROWS,
        "alignment_verified": True,
        "files": {key: str(value) for key, value in local_files.items()},
    }


def acquire_model(root: Path, token: str | None) -> Path:
    from huggingface_hub import snapshot_download

    model_dir = root / "lmt_model"
    snapshot_download(
        repo_id=MODEL_REPO,
        revision=MODEL_REVISION,
        allow_patterns=MODEL_ALLOW_PATTERNS,
        local_dir=model_dir,
        token=token,
    )
    required = [model_dir / item for item in MODEL_ALLOW_PATTERNS]
    missing = [str(path.name) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError("Pinned LMT snapshot is incomplete: " + ", ".join(missing))
    return model_dir


def render_prompt(tokenizer: Any, source_language: str, target_language: str, source_text: str) -> str:
    src_name = LANGUAGE_NAMES[source_language]
    tgt_name = LANGUAGE_NAMES[target_language]
    prompt = (
        f"Translate the following text from {src_name} into {tgt_name}:\n"
        f"{src_name}: {source_text}\n"
        f"{tgt_name}:"
    )
    messages = [{"role": "user", "content": prompt}]
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


def eos_ids(tokenizer: Any, model: Any) -> set[int]:
    values: list[Any] = [
        getattr(tokenizer, "eos_token_id", None),
        getattr(getattr(model, "config", None), "eos_token_id", None),
        getattr(getattr(model, "generation_config", None), "eos_token_id", None),
    ]
    result: set[int] = set()
    for value in values:
        items = value if isinstance(value, (list, tuple, set)) else [value]
        for item in items:
            try:
                parsed = int(item)
            except (TypeError, ValueError):
                continue
            if parsed >= 0:
                result.add(parsed)
    return result


def translate_once(
    torch: Any,
    tokenizer: Any,
    model: Any,
    source_language: str,
    target_language: str,
    source_text: str,
) -> dict[str, Any]:
    rendered = render_prompt(tokenizer, source_language, target_language, source_text)
    inputs = tokenizer(rendered, return_tensors="pt", truncation=False)
    prompt_tokens = int(inputs["input_ids"].shape[-1])
    context_limit = int(getattr(model.config, "max_position_embeddings", 0) or 0)
    if context_limit <= 0:
        raise RuntimeError("LMT model did not expose max_position_embeddings")
    if prompt_tokens + MAX_NEW_TOKENS > context_limit:
        raise RuntimeError(
            f"Prompt-aware context budget rejected probe before inference: {prompt_tokens}+{MAX_NEW_TOKENS}>{context_limit}"
        )
    inputs = {key: value.to("cuda") for key, value in inputs.items()}

    torch.cuda.synchronize()
    started = time.perf_counter()
    with torch.inference_mode():
        generated = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            num_beams=5,
            do_sample=False,
            use_cache=True,
            cache_implementation="dynamic",
            return_dict_in_generate=True,
        )
    torch.cuda.synchronize()
    elapsed_ms = (time.perf_counter() - started) * 1000.0

    sequences = generated.sequences
    full_ids = sequences[0]
    continuation = full_ids[prompt_tokens:]
    continuation_ids = [int(value) for value in continuation.detach().cpu().tolist()]
    if not continuation_ids:
        raise RuntimeError("LMT generated an empty continuation")
    known_eos = eos_ids(tokenizer, model)
    if not known_eos:
        raise RuntimeError("LMT EOS token ids are unavailable")
    finished_with_eos = continuation_ids[-1] in known_eos
    hit_token_ceiling = len(continuation_ids) >= MAX_NEW_TOKENS and not finished_with_eos
    if not finished_with_eos:
        raise RuntimeError(
            "LMT continuation did not end with a known EOS token"
            + (" and hit max_new_tokens" if hit_token_ceiling else "")
        )
    translated = tokenizer.decode(continuation_ids, skip_special_tokens=True).strip()
    if not translated:
        raise RuntimeError("LMT decoded continuation is empty")

    return {
        "source_language": source_language,
        "target_language": target_language,
        "source_text": source_text,
        "translated_text": translated,
        "prompt_tokens": prompt_tokens,
        "generated_tokens_including_eos": len(continuation_ids),
        "max_position_embeddings": context_limit,
        "max_new_tokens": MAX_NEW_TOKENS,
        "finished_with_eos": finished_with_eos,
        "latency_ms": round(elapsed_ms, 2),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: phase2_lmt_compatibility.py <phase2-cache-root>", file=sys.stderr)
        return 2
    root = Path(sys.argv[1]).resolve()
    root.mkdir(parents=True, exist_ok=True)
    report_path = root / "phase2_lmt_compatibility_report.json"
    report: dict[str, Any] = {
        "schema": "translateit.phase2_lmt_compatibility.v1",
        "started_utc": utc_now(),
        "ok": False,
        "model": {"repo": MODEL_REPO, "revision": MODEL_REVISION},
        "flores": {"repo": FLORES_REPO, "revision": FLORES_REVISION},
        "production_modified": False,
    }
    try:
        from huggingface_hub import get_token

        token = get_token() or os.environ.get("HF_TOKEN")
        if not token:
            raise RuntimeError(
                "Hugging Face authentication is required before Phase 2. Accept FLORES+ terms, then run `hf auth login` in this isolated environment or set HF_TOKEN."
            )

        report["flores"] = verify_flores(root, token)
        model_dir = acquire_model(root, token)
        report["model"]["local_path"] = str(model_dir)

        import torch
        import transformers
        from transformers import AutoModelForCausalLM, AutoTokenizer

        report["environment"] = {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda_runtime": torch.version.cuda,
            "cuda_available": bool(torch.cuda.is_available()),
            "bf16_supported": bool(torch.cuda.is_bf16_supported()) if torch.cuda.is_available() else False,
        }
        if sys.version_info[:2] != (3, 12):
            raise RuntimeError(f"Phase 2 requires Python 3.12; got {sys.version.split()[0]}")
        if transformers.__version__ != "4.51.3":
            raise RuntimeError(f"Phase 2 requires Transformers 4.51.3; got {transformers.__version__}")
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable in the isolated Phase 2 environment")
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError("Target CUDA runtime reports BF16 unsupported")

        props = torch.cuda.get_device_properties(0)
        report["gpu"] = {
            "name": props.name,
            "total_memory_mib": mib(props.total_memory),
            "compute_capability": f"{props.major}.{props.minor}",
            "whole_device_vram_before_load_mib": whole_device_vram_mib(),
        }

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        load_started = time.perf_counter()
        tokenizer = AutoTokenizer.from_pretrained(
            str(model_dir), local_files_only=True, padding_side="left"
        )
        if not callable(getattr(tokenizer, "apply_chat_template", None)):
            raise RuntimeError("Pinned tokenizer does not expose apply_chat_template")
        model = AutoModelForCausalLM.from_pretrained(
            str(model_dir),
            local_files_only=True,
            torch_dtype=torch.bfloat16,
            attn_implementation="sdpa",
        ).to("cuda")
        model.eval()
        torch.cuda.synchronize()
        load_ms = (time.perf_counter() - load_started) * 1000.0

        config_dtype = str(getattr(model.config, "torch_dtype", ""))
        attn_impl = str(getattr(model.config, "_attn_implementation", ""))
        if "bfloat16" not in config_dtype:
            raise RuntimeError(f"Loaded model config dtype is not BF16: {config_dtype}")
        if attn_impl != "sdpa":
            raise RuntimeError(f"Loaded model attention backend is not SDPA: {attn_impl or '<unknown>'}")

        report["runtime"] = {
            "backend": "pytorch_transformers",
            "device": "cuda",
            "dtype": config_dtype,
            "attention": attn_impl,
            "use_cache": True,
            "cache_implementation": "dynamic",
            "num_beams": 5,
            "do_sample": False,
            "cold_load_ms": round(load_ms, 2),
            "framework_peak_after_load_mib": mib(torch.cuda.max_memory_allocated()),
            "framework_allocated_after_load_mib": mib(torch.cuda.memory_allocated()),
            "whole_device_vram_after_load_mib": whole_device_vram_mib(),
        }

        synthetic = "translation-boundary " * 40000
        rendered = render_prompt(tokenizer, "en", "id", synthetic)
        synthetic_inputs = tokenizer(rendered, return_tensors="pt", truncation=False)
        synthetic_prompt_tokens = int(synthetic_inputs["input_ids"].shape[-1])
        context_limit = int(model.config.max_position_embeddings)
        report["context_accounting"] = {
            "model_context_tokens": context_limit,
            "synthetic_prompt_tokens": synthetic_prompt_tokens,
            "generation_budget_tokens": MAX_NEW_TOKENS,
            "oversized_rejected_before_generation": synthetic_prompt_tokens + MAX_NEW_TOKENS > context_limit,
        }
        if not report["context_accounting"]["oversized_rejected_before_generation"]:
            raise RuntimeError("Synthetic oversized prompt did not exceed the model context as expected")
        del synthetic_inputs

        for source_language, target_language, source_text in PROBES:
            _ = translate_once(torch, tokenizer, model, source_language, target_language, source_text)
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        measured: list[dict[str, Any]] = []
        for source_language, target_language, source_text in PROBES:
            measured.append(
                translate_once(torch, tokenizer, model, source_language, target_language, source_text)
            )

        report["probes"] = measured
        report["runtime"]["framework_peak_probe_mib"] = mib(torch.cuda.max_memory_allocated())
        report["runtime"]["framework_allocated_after_probe_mib"] = mib(torch.cuda.memory_allocated())
        report["runtime"]["whole_device_vram_after_probe_mib"] = whole_device_vram_mib()
        report["ok"] = True
        report["note"] = (
            "Phase 2 compatibility proof passed. This is not the full frozen quality benchmark and does not authorize production migration."
        )
        return_code = 0
    except Exception as exc:
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=12),
        }
        report["note"] = "Phase 2 compatibility proof failed; production remains unchanged."
        return_code = 1
    finally:
        report["finished_utc"] = utc_now()
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        print(f"\nReport: {report_path}")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
