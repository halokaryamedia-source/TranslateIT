from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
import time
from pathlib import Path
from typing import Any

MODEL_SPECS = [
    {
        "key": "milmmt_1b",
        "label": "Scenario A — MiLMMT-46-1B-v1.0 BF16",
        "model_id": "xiaomi-research/MiLMMT-46-1B-v1.0",
        "precision": "bf16",
        "model_dir": "models/milmmt_1b_model",
    },
    {
        "key": "milmmt_4b",
        "label": "Scenario B — MiLMMT-46-4B-v1.0 INT8",
        "model_id": "xiaomi-research/MiLMMT-46-4B-v1.0",
        "precision": "int8",
        "model_dir": "models/milmmt_4b_model",
    },
]

CASE_IDS = [
    "meeting.id_en.03.clarification",
    "meeting.id_en.06.technical_facts",
    "meeting.id_en.12.scope",
    "meeting.en_id.03.clarification",
    "meeting.en_id.06.technical_facts",
    "meeting.en_id.12.scope",
]

REPEATS = 3
MAX_IDLE_VRAM_MIB = 2048
MAX_IDLE_GPU_UTIL_PERCENT = 10


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
    if snap["memory_used_mib"] > MAX_IDLE_VRAM_MIB or snap["gpu_util_percent"] > MAX_IDLE_GPU_UTIL_PERCENT:
        raise RuntimeError(
            f"GPU is not clean enough at {stage}: memory={snap['memory_used_mib']} MiB, "
            f"util={snap['gpu_util_percent']}%. Close GPU-heavy apps and rerun. "
            f"Required <= {MAX_IDLE_VRAM_MIB} MiB and <= {MAX_IDLE_GPU_UTIL_PERCENT}% utilization."
        )
    return snap


class JsonWorker:
    def __init__(self, command: list[str], cwd: Path, stderr_path: Path) -> None:
        env = {
            **dict(__import__("os").environ),
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8": "1",
            "HF_HUB_OFFLINE": "1",
            "TRANSFORMERS_OFFLINE": "1",
        }
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
            raise RuntimeError("Failed to open MiLMMT worker pipes")

    def read(self) -> dict[str, Any]:
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(f"MiLMMT worker exited without response; code={self.process.poll()}")
        value = json.loads(line)
        if not isinstance(value, dict):
            raise RuntimeError("MiLMMT worker response is not a JSON object")
        return value

    def request(self, payload: dict[str, Any]) -> tuple[dict[str, Any], float]:
        started = time.perf_counter()
        self.process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self.process.stdin.flush()
        response = self.read()
        wall_ms = (time.perf_counter() - started) * 1000.0
        return response, round(wall_ms, 2)

    def close(self) -> None:
        try:
            if self.process.stdin and self.process.poll() is None:
                self.process.stdin.write(json.dumps({"command": "shutdown"}) + "\n")
                self.process.stdin.flush()
                if self.process.stdout:
                    _ = self.process.stdout.readline()
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
    response, wall_ms = worker.request(
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
        "request_wall_ms": wall_ms,
        "response": response,
    }


def summarize_samples(samples: list[dict[str, Any]]) -> dict[str, Any]:
    successful = [row for row in samples if row["response"].get("ok")]
    wall = [float(row["request_wall_ms"]) for row in successful]
    inference = [float(row["response"].get("inference_ms", 0.0)) for row in successful]
    outputs_by_case: dict[str, set[str]] = {}
    for row in successful:
        outputs_by_case.setdefault(row["case_id"], set()).add(str(row["response"].get("translated_text", "")))
    return {
        "planned_samples": len(samples),
        "successful_samples": len(successful),
        "failed_samples": len(samples) - len(successful),
        "wall_ms": {
            "p50": percentile(wall, 0.50),
            "p90": percentile(wall, 0.90),
            "mean": round(statistics.mean(wall), 2) if wall else None,
            "max": round(max(wall), 2) if wall else None,
        },
        "inference_ms": {
            "p50": percentile(inference, 0.50),
            "p90": percentile(inference, 0.90),
            "mean": round(statistics.mean(inference), 2) if inference else None,
            "max": round(max(inference), 2) if inference else None,
        },
        "deterministic_outputs_same": all(len(values) == 1 for values in outputs_by_case.values()),
    }


def run_candidate(
    repo_root: Path,
    python_path: Path,
    output_root: Path,
    worker_script: Path,
    spec: dict[str, str],
    cases: list[dict[str, Any]],
) -> dict[str, Any]:
    model_dir = output_root / spec["model_dir"]
    if not model_dir.is_dir() or not any(model_dir.rglob("*.safetensors")):
        raise RuntimeError(f"Cached model is missing or incomplete: {model_dir}")

    baseline = require_idle_gpu(f"before {spec['key']} load")
    worker = JsonWorker(
        [
            str(python_path),
            str(worker_script),
            "--model-dir",
            str(model_dir),
            "--model-id",
            spec["model_id"],
            "--precision",
            spec["precision"],
        ],
        repo_root,
        output_root / f"{spec['key']}_clean_perf_stderr.log",
    )
    try:
        preload = worker.read()
        if not preload.get("ok"):
            raise RuntimeError(f"{spec['key']} preload failed: {preload}")

        # Two warmups are excluded from measurements.
        for _ in range(2):
            warm = request_translation(worker, cases[0])
            if not warm["response"].get("ok"):
                raise RuntimeError(f"{spec['key']} warmup failed: {warm['response']}")

        samples: list[dict[str, Any]] = []
        for repeat in range(1, REPEATS + 1):
            for index, case in enumerate(cases, 1):
                row = request_translation(worker, case)
                samples.append(row)
                print(
                    f"[{spec['key']}] repeat {repeat}/{REPEATS} case {index}/{len(cases)} "
                    f"{row['request_wall_ms']} ms",
                    flush=True,
                )
        during = gpu_snapshot()
        return {
            "key": spec["key"],
            "label": spec["label"],
            "precision": spec["precision"],
            "baseline_before_load": baseline,
            "preload": preload,
            "gpu_after_measurements": during,
            "samples": samples,
            "summary": summarize_samples(samples),
        }
    finally:
        worker.close()
        time.sleep(5)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--python", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    python_path = Path(args.python).resolve()
    output_root = repo_root / "UserData" / "CacheData" / "TranslationQuality" / "MiLMMTRealtimeAB"
    report_path = output_root / "milmmt_clean_perf_rerun_report.json"
    cases_path = repo_root / "tools" / "translation_quality" / "realtime_use_cases.json"
    worker_script = repo_root / "tools" / "translation_quality" / "milmmt_realtime_worker.py"

    cases_doc = json.loads(cases_path.read_text(encoding="utf-8"))
    by_id = {row["id"]: row for row in cases_doc["cases"]}
    cases = [by_id[case_id] for case_id in CASE_IDS]

    report: dict[str, Any] = {
        "schema": "translateit.milmmt_clean_perf_rerun.v1",
        "purpose": "Clean-GPU performance/VRAM rerun only; does not replace prior aggregate quality review.",
        "quality_rerun": False,
        "model_download": False,
        "cases": CASE_IDS,
        "repeats_per_case": REPEATS,
        "idle_gate": {
            "max_vram_mib": MAX_IDLE_VRAM_MIB,
            "max_gpu_util_percent": MAX_IDLE_GPU_UTIL_PERCENT,
        },
        "initial_gpu": require_idle_gpu("rerun start"),
        "scenarios": {},
    }

    try:
        for index, spec in enumerate(MODEL_SPECS, 1):
            print(f"\n=== {spec['label']} ===", flush=True)
            report["scenarios"][spec["key"]] = run_candidate(
                repo_root, python_path, output_root, worker_script, spec, cases
            )
            if index < len(MODEL_SPECS):
                post = gpu_snapshot()
                report["scenarios"][spec["key"]]["gpu_after_unload"] = post
                require_idle_gpu(f"after {spec['key']} unload")

        report["final_gpu"] = gpu_snapshot()
        report["decision_state"] = "CLEAN_PERFORMANCE_REVIEW_REQUIRED"
        return_code = 0
    except Exception as exc:
        report["decision_state"] = "CLEAN_PERFORMANCE_RERUN_FAILED"
        report["error"] = {"type": type(exc).__name__, "message": str(exc)}
        return_code = 1
    finally:
        report["finished_utc_unix"] = time.time()
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nClean MiLMMT performance report: {report_path}", flush=True)
        for key, scenario in report.get("scenarios", {}).items():
            summary = scenario.get("summary", {})
            preload = scenario.get("preload", {})
            print(
                f"{key}: p50={summary.get('wall_ms', {}).get('p50')} ms | "
                f"p90={summary.get('wall_ms', {}).get('p90')} ms | "
                f"framework_load={preload.get('framework_allocated_after_load_mib')} MiB | "
                f"whole_after_load={preload.get('whole_device_vram_after_load_mib')} MiB",
                flush=True,
            )
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
