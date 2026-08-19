from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import subprocess
import sys
import time
import traceback
import queue
import threading
from pathlib import Path
from typing import Any

MODEL_ID = "xiaomi-research/MiLMMT-46-1B-v1.0"
MODEL_REVISION = "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"
INPUT_CONTEXT_LIMIT = 2048
MAX_NEW_TOKENS = 256
REPEATS = 3
WARMUP_PASSES = 2
MAX_IDLE_VRAM_MIB = 2048
MAX_IDLE_GPU_UTIL_PERCENT = 10
MIN_MATERIAL_P50_GAIN = 0.05
MAX_ACCEPTABLE_P90_REGRESSION = 0.05

PERF_CASE_IDS = [
    "meeting.id_en.03.clarification",
    "meeting.id_en.06.technical_facts",
    "meeting.id_en.12.scope",
    "meeting.en_id.03.clarification",
    "meeting.en_id.06.technical_facts",
    "meeting.en_id.12.scope",
]

VARIANTS = {
    "baseline_production_like": {
        "label": "Baseline production-like — default attention/cache",
        "attention": "default",
        "cache": "default",
        "compile": False,
    },
    "sdpa_dynamic": {
        "label": "Explicit PyTorch SDPA — default cache",
        "attention": "sdpa",
        "cache": "default",
        "compile": False,
    },
    "sdpa_static_no_compile": {
        "label": "Explicit PyTorch SDPA + StaticCache — compile disabled",
        "attention": "sdpa",
        "cache": "static",
        "compile": False,
    },
    "sdpa_static_compile": {
        "label": "Explicit PyTorch SDPA + StaticCache + reduce-overhead compile",
        "attention": "sdpa",
        "cache": "static",
        "compile": True,
    },
}


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return round(ordered[0], 2)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return round(ordered[lower], 2)
    weight = position - lower
    return round(ordered[lower] * (1.0 - weight) + ordered[upper] * weight, 2)


def mib(value: int | float) -> float:
    return round(float(value) / (1024.0 * 1024.0), 2)


def gpu_snapshot() -> dict[str, int]:
    result = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=memory.used,utilization.gpu",
            "--format=csv,noheader,nounits",
            "--id=0",
        ],
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )
    parts = [part.strip() for part in result.stdout.strip().split(",")]
    if len(parts) != 2:
        raise RuntimeError(f"Unexpected nvidia-smi output: {result.stdout!r}")
    return {"memory_used_mib": int(parts[0]), "gpu_util_percent": int(parts[1])}


def require_idle_gpu(stage: str) -> dict[str, int]:
    snap = gpu_snapshot()
    if (
        snap["memory_used_mib"] > MAX_IDLE_VRAM_MIB
        or snap["gpu_util_percent"] > MAX_IDLE_GPU_UTIL_PERCENT
    ):
        raise RuntimeError(
            f"GPU is not clean enough at {stage}: memory={snap['memory_used_mib']} MiB, "
            f"util={snap['gpu_util_percent']}%. Required <= {MAX_IDLE_VRAM_MIB} MiB and "
            f"<= {MAX_IDLE_GPU_UTIL_PERCENT}% utilization."
        )
    return snap


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


class VariantRuntime:
    def __init__(self, model_dir: Path, variant_key: str) -> None:
        import torch
        import transformers
        from transformers import AutoModelForCausalLM, AutoTokenizer

        if variant_key not in VARIANTS:
            raise ValueError(f"unknown_variant:{variant_key}")
        variant = VARIANTS[variant_key]

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable")
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError("BF16 compute support is unavailable")

        self.torch = torch
        self.transformers = transformers
        self.variant_key = variant_key
        self.variant = variant

        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        before_vram = gpu_snapshot()
        started = time.perf_counter()

        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
        load_kwargs: dict[str, Any] = {
            "local_files_only": True,
            "device_map": {"": 0},
            "torch_dtype": torch.bfloat16,
        }
        if variant["attention"] == "sdpa":
            load_kwargs["attn_implementation"] = "sdpa"

        self.model = AutoModelForCausalLM.from_pretrained(str(model_dir), **load_kwargs)
        self.model.eval()

        device_map = dict(getattr(self.model, "hf_device_map", {}) or {})
        disallowed = {
            str(value)
            for value in device_map.values()
            if value not in {0, "cuda", "cuda:0"}
        }
        if disallowed:
            raise RuntimeError(f"MiLMMT offloaded outside CUDA: {sorted(disallowed)}")

        config_attention = str(
            getattr(
                self.model.config,
                "_attn_implementation",
                getattr(self.model.config, "attn_implementation", ""),
            )
            or ""
        )

        self.compile_config = None
        if bool(variant["compile"]):
            from transformers import CompileConfig

            self.compile_config = CompileConfig(
                fullgraph=False,
                dynamic=None,
                backend="inductor",
                mode="reduce-overhead",
            )

        self.load_report = {
            "ok": True,
            "stage": "translation_preload",
            "variant": variant_key,
            "label": variant["label"],
            "model_id": MODEL_ID,
            "model_revision": MODEL_REVISION,
            "precision": "bf16",
            "device": "cuda",
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda_runtime": torch.version.cuda,
            "attention_backend": config_attention,
            "cache_mode": variant["cache"],
            "compile_requested": bool(variant["compile"]),
            "compile_mode": "reduce-overhead" if variant["compile"] else None,
            "cold_load_ms": round((time.perf_counter() - started) * 1000.0, 2),
            "whole_device_before_load": before_vram,
            "whole_device_after_load": gpu_snapshot(),
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
        generation_kwargs: dict[str, Any] = {
            **inputs,
            "max_new_tokens": generation_budget,
            "do_sample": False,
            "return_dict_in_generate": True,
        }

        if self.variant["cache"] == "static":
            generation_kwargs["cache_implementation"] = "static"
            if self.variant["compile"]:
                generation_kwargs["compile_config"] = self.compile_config
            else:
                generation_kwargs["disable_compile"] = True

        started = time.perf_counter()
        with self.torch.inference_mode():
            generated = self.model.generate(**generation_kwargs)

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

        hot_path_ms = (time.perf_counter() - started) * 1000.0
        return {
            "ok": True,
            "stage": "translate",
            "variant": self.variant_key,
            "model_id": MODEL_ID,
            "model_revision": MODEL_REVISION,
            "precision": "bf16",
            "device": "cuda",
            "source_language": source_language,
            "target_language": target_language,
            "prompt_tokens": prompt_tokens,
            "generation_budget_tokens": generation_budget,
            "generated_tokens": len(ids),
            "finished_with_eos": finished_with_eos,
            "hit_token_ceiling": hit_token_ceiling,
            "translated_text": translated,
            "hot_path_ms": round(hot_path_ms, 2),
            "framework_allocated_mib": mib(self.torch.cuda.memory_allocated()),
            "framework_reserved_mib": mib(self.torch.cuda.memory_reserved()),
            "framework_peak_mib": mib(self.torch.cuda.max_memory_allocated()),
            "blocker": "",
        }


def worker_respond(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def worker_main(args: argparse.Namespace) -> int:
    try:
        runtime = VariantRuntime(Path(args.model_dir).resolve(), args.variant)
        worker_respond(runtime.load_report)
    except Exception as exc:
        worker_respond(
            {
                "ok": False,
                "stage": "translation_preload",
                "variant": args.variant,
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
                worker_respond({"ok": True, "stage": "shutdown"})
                return 0
            if request.get("command") != "translate":
                raise ValueError("unknown_command")
            worker_respond(
                runtime.translate(
                    str(request.get("source_language", "")),
                    str(request.get("target_language", "")),
                    str(request.get("text", "")),
                )
            )
        except Exception as exc:
            worker_respond(
                {
                    "ok": False,
                    "stage": "translate",
                    "variant": args.variant,
                    "blocker": type(exc).__name__,
                    "note": str(exc),
                }
            )
    return 0


class JsonWorker:
    def __init__(
        self,
        command: list[str],
        cwd: Path,
        stderr_path: Path,
        timeout_seconds: int,
    ) -> None:
        self.timeout_seconds = timeout_seconds
        env = {
            **dict(os.environ),
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8": "1",
            "HF_HUB_OFFLINE": "1",
            "TRANSFORMERS_OFFLINE": "1",
            "TOKENIZERS_PARALLELISM": "false",
        }
        stderr_path.parent.mkdir(parents=True, exist_ok=True)
        self.stderr_handle = stderr_path.open("w", encoding="utf-8")
        self.process = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=self.stderr_handle,
            text=True,
            encoding="utf-8",
            bufsize=1,
            env=env,
        )
        if self.process.stdin is None or self.process.stdout is None:
            raise RuntimeError("Failed to open optimization worker pipes")
        self.responses: queue.Queue[str | None] = queue.Queue()
        self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self.reader_thread.start()

    def _reader_loop(self) -> None:
        assert self.process.stdout is not None
        try:
            for line in self.process.stdout:
                self.responses.put(line)
        finally:
            self.responses.put(None)

    def read(self) -> dict[str, Any]:
        try:
            line = self.responses.get(timeout=self.timeout_seconds)
        except queue.Empty as exc:
            self.process.kill()
            raise TimeoutError(
                f"Optimization worker timed out after {self.timeout_seconds}s"
            ) from exc
        if line is None:
            raise RuntimeError(f"Worker exited without response; code={self.process.poll()}")
        value = json.loads(line)
        if not isinstance(value, dict):
            raise RuntimeError("Worker response is not a JSON object")
        return value

    def request(self, payload: dict[str, Any]) -> tuple[dict[str, Any], float]:
        started = time.perf_counter()
        self.process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self.process.stdin.flush()
        response = self.read()
        return response, round((time.perf_counter() - started) * 1000.0, 2)

    def close(self) -> None:
        try:
            if self.process.stdin and self.process.poll() is None:
                self.process.stdin.write(json.dumps({"command": "shutdown"}) + "\n")
                self.process.stdin.flush()
                _ = self.read()
            if self.process.stdin:
                self.process.stdin.close()
            self.process.wait(timeout=30)
        except Exception:
            self.process.kill()
            self.process.wait(timeout=10)
        finally:
            self.stderr_handle.close()


def request_translation(worker: JsonWorker, case: dict[str, Any]) -> dict[str, Any]:
    source_language, target_language = str(case["direction"]).split("->")
    response, request_wall_ms = worker.request(
        {
            "command": "translate",
            "source_language": source_language,
            "target_language": target_language,
            "text": case["source"],
        }
    )
    return {
        "case_id": case["id"],
        "direction": case["direction"],
        "request_wall_ms": request_wall_ms,
        "response": response,
    }


def translated_text(row: dict[str, Any]) -> str:
    response = row.get("response", {})
    return str(response.get("translated_text", "")) if response.get("ok") else ""


def load_authority(
    output_root: Path, repo_root: Path
) -> tuple[list[dict[str, Any]], dict[str, str], dict[str, Any]]:
    quality_report_path = output_root / "milmmt_realtime_ab_report.json"
    clean_report_path = output_root / "milmmt_clean_perf_rerun_report.json"
    cases_path = repo_root / "tools" / "translation_quality" / "realtime_use_cases.json"

    if not quality_report_path.is_file():
        raise RuntimeError(f"Missing aggregate quality authority: {quality_report_path}")
    if not clean_report_path.is_file():
        raise RuntimeError(f"Missing clean performance authority: {clean_report_path}")

    quality_report = json.loads(quality_report_path.read_text(encoding="utf-8"))
    clean_report = json.loads(clean_report_path.read_text(encoding="utf-8"))
    cases_doc = json.loads(cases_path.read_text(encoding="utf-8"))
    cases = list(cases_doc.get("cases", []))
    if len(cases) != 24:
        raise RuntimeError(f"Expected 24 representative cases, found {len(cases)}")

    provenance = next(
        (
            item
            for item in quality_report.get("provenance", [])
            if item.get("key") == "milmmt_1b"
        ),
        None,
    )
    if not provenance or provenance.get("resolved_revision") != MODEL_REVISION:
        raise RuntimeError("MiLMMT-1B quality authority does not match the selected revision")

    rows = (
        quality_report.get("candidates", {})
        .get("milmmt_1b", {})
        .get("results", [])
    )
    reference_outputs = {
        str(row.get("case_id")): str(row.get("response", {}).get("translated_text", ""))
        for row in rows
        if row.get("response", {}).get("ok")
    }
    if len(reference_outputs) != 24:
        raise RuntimeError(
            f"Expected 24 successful baseline outputs in quality authority, found {len(reference_outputs)}"
        )

    clean_summary = (
        clean_report.get("scenarios", {})
        .get("milmmt_1b", {})
        .get("summary", {})
        .get("wall_ms", {})
    )
    if clean_summary.get("p50") is None or clean_summary.get("p90") is None:
        raise RuntimeError("Clean MiLMMT-1B p50/p90 authority is incomplete")

    clean_authority = {
        "report": str(clean_report_path),
        "wall_p50_ms": clean_summary["p50"],
        "wall_p90_ms": clean_summary["p90"],
    }
    return cases, reference_outputs, clean_authority


def compare_outputs(
    rows: list[dict[str, Any]], reference_outputs: dict[str, str]
) -> dict[str, Any]:
    changes = []
    failed = []
    for row in rows:
        case_id = row["case_id"]
        if not row["response"].get("ok"):
            failed.append(
                {
                    "case_id": case_id,
                    "blocker": row["response"].get("blocker"),
                    "note": row["response"].get("note"),
                }
            )
            continue
        actual = translated_text(row)
        expected = reference_outputs.get(case_id, "")
        if actual != expected:
            changes.append(
                {
                    "case_id": case_id,
                    "expected": expected,
                    "actual": actual,
                }
            )
    return {
        "all_successful": not failed and len(rows) > 0,
        "exact_output_equality": not failed and not changes and len(rows) > 0,
        "failed": failed,
        "changed": changes,
    }


def summarize_performance(samples: list[dict[str, Any]]) -> dict[str, Any]:
    successful = [row for row in samples if row["response"].get("ok")]
    request_wall = [float(row["request_wall_ms"]) for row in successful]
    hot_path = [float(row["response"].get("hot_path_ms", 0.0)) for row in successful]
    return {
        "planned_samples": len(samples),
        "successful_samples": len(successful),
        "failed_samples": len(samples) - len(successful),
        "request_wall_ms": {
            "p50": percentile(request_wall, 0.50),
            "p90": percentile(request_wall, 0.90),
            "mean": round(statistics.mean(request_wall), 2) if request_wall else None,
            "max": round(max(request_wall), 2) if request_wall else None,
        },
        "worker_hot_path_ms": {
            "p50": percentile(hot_path, 0.50),
            "p90": percentile(hot_path, 0.90),
            "mean": round(statistics.mean(hot_path), 2) if hot_path else None,
            "max": round(max(hot_path), 2) if hot_path else None,
        },
    }


def material_gain(candidate: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    candidate_p50 = candidate.get("request_wall_ms", {}).get("p50")
    candidate_p90 = candidate.get("request_wall_ms", {}).get("p90")
    baseline_p50 = baseline.get("request_wall_ms", {}).get("p50")
    baseline_p90 = baseline.get("request_wall_ms", {}).get("p90")
    if None in {candidate_p50, candidate_p90, baseline_p50, baseline_p90}:
        return {"material": False, "reason": "missing_latency"}

    p50_gain = 1.0 - float(candidate_p50) / float(baseline_p50)
    p90_change = float(candidate_p90) / float(baseline_p90) - 1.0
    return {
        "material": bool(
            p50_gain >= MIN_MATERIAL_P50_GAIN
            and p90_change <= MAX_ACCEPTABLE_P90_REGRESSION
        ),
        "p50_gain_fraction": round(p50_gain, 4),
        "p90_change_fraction": round(p90_change, 4),
        "rule": (
            f"p50 gain >= {MIN_MATERIAL_P50_GAIN:.0%} and "
            f"p90 regression <= {MAX_ACCEPTABLE_P90_REGRESSION:.0%}"
        ),
    }


def start_variant_worker(
    repo_root: Path,
    python_path: Path,
    model_dir: Path,
    output_root: Path,
    variant_key: str,
) -> tuple[JsonWorker, dict[str, Any]]:
    timeout_seconds = 600 if VARIANTS[variant_key]["compile"] else 180
    worker = JsonWorker(
        [
            str(python_path),
            str(Path(__file__).resolve()),
            "--worker",
            "--model-dir",
            str(model_dir),
            "--variant",
            variant_key,
        ],
        repo_root,
        output_root / f"{variant_key}_latency_optimization_stderr.log",
        timeout_seconds,
    )
    preload = worker.read()
    return worker, preload


def run_quality_once(
    worker: JsonWorker,
    cases: list[dict[str, Any]],
    reference_outputs: dict[str, str],
    variant_key: str,
) -> dict[str, Any]:
    rows = []
    for index, case in enumerate(cases, 1):
        row = request_translation(worker, case)
        rows.append(row)
        print(
            f"[{variant_key}] quality {index}/{len(cases)} "
            f"{row['request_wall_ms']} ms",
            flush=True,
        )
    return {
        "rows": rows,
        "comparison": compare_outputs(rows, reference_outputs),
    }


def run_perf_subset(
    worker: JsonWorker,
    perf_cases: list[dict[str, Any]],
    reference_outputs: dict[str, str],
    variant_key: str,
) -> dict[str, Any]:
    warmup_rows = []
    for warmup_pass in range(1, WARMUP_PASSES + 1):
        for case in perf_cases:
            row = request_translation(worker, case)
            warmup_rows.append(row)
            if not row["response"].get("ok"):
                return {
                    "warmup_rows": warmup_rows,
                    "samples": [],
                    "summary": summarize_performance([]),
                    "subset_output_comparison": compare_outputs(
                        warmup_rows, reference_outputs
                    ),
                    "warmup_failed": True,
                }
        print(
            f"[{variant_key}] warmup pass {warmup_pass}/{WARMUP_PASSES} complete",
            flush=True,
        )

    samples = []
    for repeat in range(1, REPEATS + 1):
        for index, case in enumerate(perf_cases, 1):
            row = request_translation(worker, case)
            samples.append(row)
            print(
                f"[{variant_key}] perf repeat {repeat}/{REPEATS} "
                f"case {index}/{len(perf_cases)} {row['request_wall_ms']} ms",
                flush=True,
            )

    return {
        "warmup_rows": warmup_rows,
        "samples": samples,
        "summary": summarize_performance(samples),
        "subset_output_comparison": compare_outputs(samples, reference_outputs),
        "warmup_failed": False,
    }


def unload_and_wait(worker: JsonWorker) -> dict[str, int]:
    worker.close()
    time.sleep(5)
    return require_idle_gpu("after variant unload")


def run_baseline(
    repo_root: Path,
    python_path: Path,
    model_dir: Path,
    output_root: Path,
    cases: list[dict[str, Any]],
    perf_cases: list[dict[str, Any]],
    reference_outputs: dict[str, str],
) -> dict[str, Any]:
    variant_key = "baseline_production_like"
    baseline_gpu = require_idle_gpu("before baseline load")
    worker, preload = start_variant_worker(
        repo_root, python_path, model_dir, output_root, variant_key
    )
    result: dict[str, Any] = {
        "status": "FAILED",
        "variant": variant_key,
        "label": VARIANTS[variant_key]["label"],
        "baseline_before_load": baseline_gpu,
        "preload": preload,
    }
    try:
        if not preload.get("ok"):
            result["reason"] = "preload_failed"
            return result

        quality = run_quality_once(
            worker, cases, reference_outputs, variant_key
        )
        result["quality"] = quality
        if not quality["comparison"]["exact_output_equality"]:
            result["reason"] = "production_like_baseline_drifted_from_quality_authority"
            return result

        performance = run_perf_subset(
            worker, perf_cases, reference_outputs, variant_key
        )
        result["performance"] = performance
        if (
            performance["warmup_failed"]
            or not performance["subset_output_comparison"]["exact_output_equality"]
            or performance["summary"]["failed_samples"] != 0
        ):
            result["reason"] = "baseline_performance_stage_failed"
            return result

        result["status"] = "PASS"
        result["eligible"] = True
        return result
    finally:
        result["gpu_after_unload"] = unload_and_wait(worker)


def run_candidate_variant(
    repo_root: Path,
    python_path: Path,
    model_dir: Path,
    output_root: Path,
    cases: list[dict[str, Any]],
    perf_cases: list[dict[str, Any]],
    reference_outputs: dict[str, str],
    baseline_perf_summary: dict[str, Any],
    variant_key: str,
) -> dict[str, Any]:
    baseline_gpu = require_idle_gpu(f"before {variant_key} load")
    worker, preload = start_variant_worker(
        repo_root, python_path, model_dir, output_root, variant_key
    )
    result: dict[str, Any] = {
        "status": "FAILED",
        "variant": variant_key,
        "label": VARIANTS[variant_key]["label"],
        "baseline_before_load": baseline_gpu,
        "preload": preload,
    }
    try:
        if not preload.get("ok"):
            result["status"] = "UNSUPPORTED"
            result["reason"] = "preload_failed"
            return result

        performance = run_perf_subset(
            worker, perf_cases, reference_outputs, variant_key
        )
        result["performance"] = performance
        if performance["warmup_failed"] or performance["summary"]["failed_samples"]:
            result["status"] = "UNSUPPORTED"
            result["reason"] = "runtime_or_compile_failed"
            return result

        if not performance["subset_output_comparison"]["exact_output_equality"]:
            result["status"] = "QUALITY_CHANGED"
            result["reason"] = "representative_subset_output_changed"
            return result

        gain = material_gain(performance["summary"], baseline_perf_summary)
        result["material_gain"] = gain
        if not gain["material"]:
            result["status"] = "NO_MATERIAL_GAIN"
            result["reason"] = "performance_gain_below_acceptance_threshold"
            return result

        quality = run_quality_once(
            worker, cases, reference_outputs, variant_key
        )
        result["quality"] = quality
        if not quality["comparison"]["exact_output_equality"]:
            result["status"] = "QUALITY_CHANGED"
            result["reason"] = "full_24_case_exact_output_equality_failed"
            return result

        result["status"] = "PASS"
        result["eligible"] = True
        return result
    finally:
        result["gpu_after_unload"] = unload_and_wait(worker)


def orchestrator_main(args: argparse.Namespace) -> int:
    repo_root = Path(args.repo_root).resolve()
    python_path = Path(args.python).resolve()
    output_root = (
        repo_root
        / "UserData"
        / "CacheData"
        / "TranslationQuality"
        / "MiLMMTRealtimeAB"
    )
    output_root.mkdir(parents=True, exist_ok=True)
    model_dir = output_root / "models" / "milmmt_1b_model"
    report_path = output_root / "milmmt_1b_latency_optimization_report.json"

    report: dict[str, Any] = {
        "schema": "translateit.milmmt_1b_latency_optimization.v1",
        "purpose": (
            "Same-model execution optimization only. Selected MiLMMT-46-1B-v1.0 "
            "BF16 checkpoint/prompt/translation semantics remain fixed."
        ),
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION,
        "precision": "bf16",
        "production_modified": False,
        "model_download": False,
        "quality_reference": "existing 24-case MiLMMT-1B deterministic outputs",
        "clean_gpu_gate": {
            "max_vram_mib": MAX_IDLE_VRAM_MIB,
            "max_gpu_util_percent": MAX_IDLE_GPU_UTIL_PERCENT,
        },
        "variants": {},
        "decision_state": "HARNESS_FAILED",
    }

    try:
        if not python_path.is_file():
            raise RuntimeError(f"MiLMMT evaluation Python missing: {python_path}")
        if not model_dir.is_dir() or not any(model_dir.rglob("*.safetensors")):
            raise RuntimeError(f"Selected MiLMMT-1B model cache missing: {model_dir}")

        cases, reference_outputs, clean_authority = load_authority(
            output_root, repo_root
        )
        report["clean_baseline_authority"] = clean_authority
        by_id = {row["id"]: row for row in cases}
        perf_cases = [by_id[case_id] for case_id in PERF_CASE_IDS]

        report["initial_gpu"] = require_idle_gpu("optimization start")

        print("\n=== BASELINE PRODUCTION-LIKE ===", flush=True)
        baseline = run_baseline(
            repo_root,
            python_path,
            model_dir,
            output_root,
            cases,
            perf_cases,
            reference_outputs,
        )
        report["variants"]["baseline_production_like"] = baseline
        if baseline.get("status") != "PASS":
            raise RuntimeError(
                "Production-like baseline did not preserve the existing 24-case output authority"
            )

        baseline_perf_summary = baseline["performance"]["summary"]
        baseline_p50 = float(
            baseline_perf_summary["request_wall_ms"]["p50"]
        )
        baseline_p90 = float(
            baseline_perf_summary["request_wall_ms"]["p90"]
        )
        clean_p50 = float(clean_authority["wall_p50_ms"])
        clean_p90 = float(clean_authority["wall_p90_ms"])
        report["production_like_vs_clean_authority"] = {
            "new_p50_ms": baseline_p50,
            "new_p90_ms": baseline_p90,
            "authority_p50_ms": clean_p50,
            "authority_p90_ms": clean_p90,
            "p50_change_fraction": round(baseline_p50 / clean_p50 - 1.0, 4),
            "p90_change_fraction": round(baseline_p90 / clean_p90 - 1.0, 4),
        }
        if baseline_p50 > clean_p50 * 1.25 or baseline_p90 > clean_p90 * 1.25:
            raise RuntimeError(
                "Current production-like baseline is >25% slower than the clean authority; "
                "the optimization session is not stable enough for a fair decision."
            )

        baseline_attention = str(
            baseline.get("preload", {}).get("attention_backend", "")
        ).lower()

        candidate_order: list[str] = []
        if "sdpa" not in baseline_attention:
            candidate_order.append("sdpa_dynamic")
        else:
            report["variants"]["sdpa_dynamic"] = {
                "status": "SKIPPED_EQUIVALENT",
                "variant": "sdpa_dynamic",
                "label": VARIANTS["sdpa_dynamic"]["label"],
                "reason": (
                    "Baseline model already reports SDPA attention, so a second explicit-SDPA "
                    "performance run would duplicate the same execution backend."
                ),
            }

        candidate_order.append("sdpa_static_no_compile")
        candidate_order.append("sdpa_static_compile")

        for variant_key in candidate_order:
            print(f"\n=== {VARIANTS[variant_key]['label']} ===", flush=True)
            result = run_candidate_variant(
                repo_root,
                python_path,
                model_dir,
                output_root,
                cases,
                perf_cases,
                reference_outputs,
                baseline_perf_summary,
                variant_key,
            )
            report["variants"][variant_key] = result

            if (
                variant_key == "sdpa_static_no_compile"
                and result.get("status") == "UNSUPPORTED"
            ):
                report["variants"]["sdpa_static_compile"] = {
                    "status": "SKIPPED_PREREQUISITE",
                    "variant": "sdpa_static_compile",
                    "label": VARIANTS["sdpa_static_compile"]["label"],
                    "reason": "StaticCache runtime is unsupported in the selected environment.",
                }
                break
            if (
                variant_key == "sdpa_static_no_compile"
                and result.get("status") == "QUALITY_CHANGED"
            ):
                report["variants"]["sdpa_static_compile"] = {
                    "status": "SKIPPED_PREREQUISITE",
                    "variant": "sdpa_static_compile",
                    "label": VARIANTS["sdpa_static_compile"]["label"],
                    "reason": (
                        "StaticCache changed translation output on the representative subset; "
                        "compiling that cache path is outside the same-quality optimization boundary."
                    ),
                }
                break

        eligible = []
        for key, value in report["variants"].items():
            if value.get("eligible") and value.get("status") == "PASS":
                summary = value.get("performance", {}).get("summary", {})
                p50 = summary.get("request_wall_ms", {}).get("p50")
                p90 = summary.get("request_wall_ms", {}).get("p90")
                if p50 is not None and p90 is not None:
                    eligible.append((float(p50), float(p90), key))

        if not eligible:
            raise RuntimeError("No valid same-quality runtime configuration remained eligible")

        eligible.sort()
        recommended = eligible[0][2]
        report["recommended_variant"] = recommended
        report["recommended_reason"] = (
            "Lowest measured p50 among variants that preserved the selected 24-case output "
            "authority and satisfied the material-gain gate. Baseline remains selected when "
            "no optimization proves a safe material improvement."
        )
        report["final_gpu"] = gpu_snapshot()
        report["decision_state"] = "OPTIMIZATION_REVIEW_READY"
        return_code = 0
    except Exception as exc:
        report["decision_state"] = "OPTIMIZATION_FAILED"
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=16),
        }
        return_code = 1
    finally:
        report["finished_utc_unix"] = time.time()
        report_path.write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\nMiLMMT-1B latency optimization report: {report_path}", flush=True)
        print(f"Decision state: {report.get('decision_state')}", flush=True)
        if report.get("recommended_variant"):
            print(
                f"Recommended runtime variant: {report['recommended_variant']}",
                flush=True,
            )

    return return_code


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root")
    parser.add_argument("--python")
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--model-dir")
    parser.add_argument("--variant", choices=sorted(VARIANTS))
    args = parser.parse_args()

    if args.worker:
        if not args.model_dir or not args.variant:
            raise SystemExit("--model-dir and --variant are required in worker mode")
        return worker_main(args)

    if not args.repo_root or not args.python:
        raise SystemExit("--repo-root and --python are required")
    return orchestrator_main(args)


if __name__ == "__main__":
    raise SystemExit(main())
