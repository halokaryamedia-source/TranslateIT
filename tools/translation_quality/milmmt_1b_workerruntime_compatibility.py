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
from pathlib import Path
from typing import Any

MODEL_ID = "xiaomi-research/MiLMMT-46-1B-v1.0"
MODEL_REVISION = "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"
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


class JsonWorker:
    def __init__(self, command: list[str], cwd: Path, stderr_path: Path) -> None:
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["TOKENIZERS_PARALLELISM"] = "false"
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
            raise RuntimeError("Failed to open MiLMMT compatibility worker pipes")

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
        assert self.process.stdin is not None
        self.process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self.process.stdin.flush()
        response = self.read()
        return response, round((time.perf_counter() - started) * 1000.0, 2)

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


def expected_outputs(quality_report: dict[str, Any]) -> dict[str, str]:
    rows = quality_report.get("candidates", {}).get("milmmt_1b", {}).get("results", [])
    expected: dict[str, str] = {}
    for row in rows:
        response = row.get("response", {})
        if response.get("ok"):
            expected[str(row.get("case_id", ""))] = str(response.get("translated_text", ""))
    if len(expected) != 24:
        raise RuntimeError(f"Expected 24 authoritative MiLMMT-1B outputs, found {len(expected)}")
    return expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    evidence_root = repo_root / "UserData" / "CacheData" / "TranslationQuality" / "MiLMMTRealtimeAB"
    model_dir = evidence_root / "models" / "milmmt_1b_model"
    revision_path = evidence_root / "models" / "milmmt_1b_revision.txt"
    if not revision_path.is_file():
        revision_path = evidence_root / "milmmt_1b_revision.txt"
    quality_path = evidence_root / "milmmt_realtime_ab_report.json"
    cases_path = repo_root / "tools" / "translation_quality" / "realtime_use_cases.json"
    worker_script = repo_root / "tools" / "translation_quality" / "milmmt_realtime_worker.py"
    report_path = evidence_root / "milmmt_1b_workerruntime_compatibility_report.json"
    stderr_path = evidence_root / "milmmt_1b_workerruntime_compatibility_stderr.log"

    report: dict[str, Any] = {
        "schema": "translateit.milmmt_1b_workerruntime_compatibility.v1",
        "purpose": "Verify the selected MiLMMT-1B checkpoint under the canonical WorkerRuntime Python dependency matrix before production source migration.",
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION,
        "production_modified": False,
        "model_download": False,
        "decision_state": "COMPATIBILITY_FAILED",
    }
    return_code = 1

    try:
        required = [model_dir, quality_path, cases_path, worker_script]
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            raise RuntimeError(f"Required compatibility input is missing: {missing}")
        if not revision_path.is_file():
            raise RuntimeError("Pinned MiLMMT-1B revision file is missing")
        observed_revision = revision_path.read_text(encoding="utf-8").strip()
        if observed_revision != MODEL_REVISION:
            raise RuntimeError(
                f"MiLMMT-1B revision mismatch: expected {MODEL_REVISION}, observed {observed_revision}"
            )

        quality_report = json.loads(quality_path.read_text(encoding="utf-8"))
        expected = expected_outputs(quality_report)
        cases_doc = json.loads(cases_path.read_text(encoding="utf-8"))
        cases = list(cases_doc.get("cases", []))
        if len(cases) != 24:
            raise RuntimeError(f"Representative case count changed unexpectedly: {len(cases)}")

        report["initial_gpu"] = require_idle_gpu("compatibility start")
        report["python_executable"] = sys.executable
        report["python_version"] = sys.version

        worker = JsonWorker(
            [
                sys.executable,
                str(worker_script),
                "--model-dir",
                str(model_dir),
                "--model-id",
                MODEL_ID,
                "--precision",
                "bf16",
            ],
            repo_root,
            stderr_path,
        )
        try:
            preload = worker.read()
            report["preload"] = preload
            if not preload.get("ok"):
                raise RuntimeError(f"MiLMMT-1B preload failed under WorkerRuntime: {preload}")
            if str(preload.get("device")) != "cuda" or str(preload.get("precision")) != "bf16":
                raise RuntimeError(f"Unexpected runtime path: {preload}")

            warmup, _ = worker.request(
                {
                    "command": "translate",
                    "source_language": "id",
                    "target_language": "en",
                    "text": "Terima kasih, saya akan cek hasilnya setelah meeting selesai.",
                }
            )
            if not warmup.get("ok"):
                raise RuntimeError(f"MiLMMT-1B warmup failed under WorkerRuntime: {warmup}")

            rows: list[dict[str, Any]] = []
            changed: list[dict[str, str]] = []
            failed: list[dict[str, Any]] = []
            latencies: list[float] = []
            for index, case in enumerate(cases, 1):
                source_language, target_language = str(case["direction"]).split("->")
                response, wall_ms = worker.request(
                    {
                        "command": "translate",
                        "source_language": source_language,
                        "target_language": target_language,
                        "text": case["source"],
                    }
                )
                case_id = str(case["id"])
                actual = str(response.get("translated_text", "")) if response.get("ok") else ""
                expected_text = expected[case_id]
                row = {
                    "case_id": case_id,
                    "direction": case["direction"],
                    "request_wall_ms": wall_ms,
                    "ok": bool(response.get("ok")),
                    "exact_output_match": bool(response.get("ok") and actual == expected_text),
                    "expected": expected_text,
                    "actual": actual,
                    "blocker": str(response.get("blocker", "")),
                }
                rows.append(row)
                if response.get("ok"):
                    latencies.append(wall_ms)
                    if actual != expected_text:
                        changed.append({"case_id": case_id, "expected": expected_text, "actual": actual})
                else:
                    failed.append({"case_id": case_id, "response": response})
                print(f"[WorkerRuntime compatibility] case {index}/{len(cases)} {wall_ms} ms", flush=True)

            report["results"] = rows
            report["comparison"] = {
                "all_successful": not failed,
                "exact_output_equality_24_of_24": not failed and not changed and len(rows) == 24,
                "failed": failed,
                "changed": changed,
            }
            report["latency_wall_ms"] = {
                "p50": percentile(latencies, 0.50),
                "p90": percentile(latencies, 0.90),
                "mean": round(statistics.mean(latencies), 2) if latencies else None,
                "max": round(max(latencies), 2) if latencies else None,
            }
            if failed:
                raise RuntimeError("One or more representative translations failed under WorkerRuntime")
            if changed:
                raise RuntimeError(
                    f"WorkerRuntime dependency matrix changed {len(changed)} of 24 deterministic outputs"
                )
            report["decision_state"] = "WORKERRUNTIME_COMPATIBLE"
            return_code = 0
        finally:
            worker.close()

        time.sleep(3)
        report["final_gpu"] = gpu_snapshot()
    except Exception as exc:
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=16),
        }
        return_code = 1
    finally:
        report["finished_utc_unix"] = time.time()
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nWorkerRuntime compatibility report: {report_path}", flush=True)
        print(f"Decision state: {report.get('decision_state')}", flush=True)

    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
