from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import statistics
import subprocess
import time
import traceback
from pathlib import Path
from typing import Any

MODEL_SPECS = [
    {
        "key": "milmmt_1b",
        "label": "Scenario A — MiLMMT-46-1B-v1.0 BF16",
        "repo": "xiaomi-research/MiLMMT-46-1B-v1.0",
        "precision": "bf16",
    },
    {
        "key": "milmmt_4b",
        "label": "Scenario B — MiLMMT-46-4B-v1.0 INT8",
        "repo": "xiaomi-research/MiLMMT-46-4B-v1.0",
        "precision": "int8",
    },
]


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


class JsonWorker:
    def __init__(self, command: list[str], cwd: Path, stderr_path: Path) -> None:
        stderr_path.parent.mkdir(parents=True, exist_ok=True)
        self.stderr_handle = stderr_path.open("w", encoding="utf-8")
        runtime_env = dict(os.environ)
        runtime_env["PYTHONIOENCODING"] = "utf-8"
        runtime_env["PYTHONUTF8"] = "1"
        self.process = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=self.stderr_handle,
            text=True,
            encoding="utf-8",
            bufsize=1,
            env=runtime_env,
        )
        if self.process.stdin is None or self.process.stdout is None:
            raise RuntimeError("Failed to open worker pipes")

    def read(self) -> dict[str, Any]:
        line = self.process.stdout.readline()
        if not line:
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


def acquire_model(spec: dict[str, str], output_root: Path) -> dict[str, Any]:
    from huggingface_hub import HfApi, snapshot_download

    key = spec["key"]
    repo = spec["repo"]
    pin_path = output_root / f"{key}_revision.txt"
    model_dir = output_root / f"{key}_model"
    api = HfApi()

    if pin_path.is_file() and pin_path.read_text(encoding="utf-8").strip():
        revision = pin_path.read_text(encoding="utf-8").strip()
    else:
        info = api.model_info(repo, revision="main", files_metadata=True)
        revision = str(info.sha or "").strip()
        if not revision:
            raise RuntimeError(f"Could not resolve exact revision for {repo}")
        pin_path.write_text(revision + "\n", encoding="utf-8")

    info = api.model_info(repo, revision=revision, files_metadata=True)
    snapshot_download(repo_id=repo, revision=revision, local_dir=str(model_dir))

    weight_files = sorted(
        str(path.relative_to(model_dir)).replace("\\", "/")
        for path in model_dir.rglob("*.safetensors")
        if path.is_file()
    )
    if not weight_files:
        raise RuntimeError(f"No safetensors weights found after acquisition for {repo}")
    required = ["config.json", "tokenizer_config.json"]
    missing = [name for name in required if not (model_dir / name).is_file()]
    if missing:
        raise RuntimeError(f"Model acquisition incomplete for {repo}: missing {missing}")

    return {
        "key": key,
        "label": spec["label"],
        "repo": repo,
        "precision": spec["precision"],
        "resolved_revision": revision,
        "model_dir": str(model_dir),
        "weight_files": weight_files,
        "local_bytes": sum(path.stat().st_size for path in model_dir.rglob("*") if path.is_file()),
        "last_modified": str(getattr(info, "last_modified", "")),
    }


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
        "category": case["category"],
        "source": case["source"],
        "reference": case["reference"],
        "protected_literals": case.get("protected_literals", []),
        "request_wall_ms": wall_ms,
        "response": response,
    }


def run_candidate(
    repo_root: Path,
    candidate_python: Path,
    worker_script: Path,
    provenance: dict[str, Any],
    cases: list[dict[str, Any]],
    output_root: Path,
) -> dict[str, Any]:
    key = provenance["key"]
    worker = JsonWorker(
        [
            str(candidate_python),
            str(worker_script),
            "--model-dir",
            provenance["model_dir"],
            "--model-id",
            provenance["repo"],
            "--precision",
            provenance["precision"],
        ],
        repo_root,
        output_root / f"{key}_stderr.log",
    )
    try:
        preload = worker.read()
        if not preload.get("ok"):
            return {
                "candidate": key,
                "label": provenance["label"],
                "provenance": provenance,
                "preload": preload,
                "results": [],
            }

        warmup_case = {
            "id": "warmup",
            "direction": "id->en",
            "category": "warmup",
            "source": "Terima kasih, saya akan cek hasilnya setelah meeting selesai.",
            "reference": "Thank you, I will check the results after the meeting ends.",
            "protected_literals": [],
        }
        _ = request_translation(worker, warmup_case)

        results: list[dict[str, Any]] = []
        for index, case in enumerate(cases, 1):
            row = request_translation(worker, case)
            results.append(row)
            print(f"[{key}] realtime case {index}/{len(cases)}", flush=True)
        return {
            "candidate": key,
            "label": provenance["label"],
            "provenance": provenance,
            "preload": preload,
            "results": results,
        }
    finally:
        worker.close()


def translated_text(row: dict[str, Any]) -> str:
    response = row.get("response", {})
    return str(response.get("translated_text", "")) if response.get("ok") else ""


def summarize_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    from sacrebleu.metrics import BLEU, CHRF

    rows = candidate.get("results", [])
    successful = [row for row in rows if row.get("response", {}).get("ok")]
    failed = len(rows) - len(successful)
    latencies = [float(row["request_wall_ms"]) for row in successful]

    literal_total = 0
    literal_preserved = 0
    literal_failures: list[dict[str, Any]] = []
    for row in successful:
        output = translated_text(row)
        missing = []
        for literal in row.get("protected_literals", []):
            literal_total += 1
            if str(literal) in output:
                literal_preserved += 1
            else:
                missing.append(str(literal))
        if missing:
            literal_failures.append({"case_id": row["case_id"], "missing": missing, "output": output})

    chrf = CHRF(word_order=2)
    bleu = BLEU(effective_order=True)
    directions: dict[str, Any] = {}
    for direction in ("id->en", "en->id"):
        directional = [row for row in successful if row["direction"] == direction]
        hypotheses = [translated_text(row) for row in directional]
        references = [row["reference"] for row in directional]
        directions[direction] = {
            "count": len(directional),
            "chrf_pp": round(chrf.corpus_score(hypotheses, [references]).score, 2) if directional else None,
            "bleu": round(bleu.corpus_score(hypotheses, [references]).score, 2) if directional else None,
        }

    return {
        "planned_cases": len(rows),
        "successful_cases": len(successful),
        "failed_cases": failed,
        "latency_wall_ms": {
            "p50": percentile(latencies, 0.50),
            "p90": percentile(latencies, 0.90),
            "mean": round(statistics.mean(latencies), 2) if latencies else None,
            "max": round(max(latencies), 2) if latencies else None,
        },
        "protected_literals": {
            "total": literal_total,
            "preserved": literal_preserved,
            "rate": round(literal_preserved / literal_total, 4) if literal_total else 1.0,
            "failures": literal_failures,
        },
        "reference_metrics": directions,
        "preload": candidate.get("preload", {}),
    }


def write_review(path: Path, cases: list[dict[str, Any]], candidates: dict[str, dict[str, Any]]) -> None:
    result_maps = {
        key: {row["case_id"]: row for row in value.get("results", [])}
        for key, value in candidates.items()
    }
    labels = {
        "milmmt_1b": "Scenario A — MiLMMT-46-1B-v1.0 BF16",
        "milmmt_4b": "Scenario B — MiLMMT-46-4B-v1.0 INT8",
    }
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("# TranslateIT MiLMMT 1B vs 4B Realtime Review\n\n")
        handle.write(
            "Only the two MiLMMT v1.0 scenarios are compared. Every scenario runs the same representative cases; "
            "one isolated error is not an automatic rejection.\n\n"
        )
        for index, case in enumerate(cases, 1):
            handle.write(f"## {index}. {case['id']} — {case['category']}\n\n")
            handle.write(f"**Direction:** {case['direction']}\n\n")
            handle.write(f"**Source:** {case['source']}\n\n")
            handle.write(f"**Reference anchor:** {case['reference']}\n\n")
            for key in ("milmmt_1b", "milmmt_4b"):
                row = result_maps.get(key, {}).get(case["id"])
                output = translated_text(row) if row else "[NO RESULT]"
                latency = row.get("request_wall_ms") if row else None
                handle.write(f"**{labels[key]} ({latency} ms):** {output}\n\n")
            handle.write("**Review:** semantic correctness / factual fidelity / naturalness / completeness\n\n---\n\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--candidate-python", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    candidate_python = Path(args.candidate_python).resolve()
    output_root = repo_root / "UserData" / "CacheData" / "TranslationQuality" / "MiLMMTRealtimeAB"
    output_root.mkdir(parents=True, exist_ok=True)
    report_path = output_root / "milmmt_realtime_ab_report.json"
    review_path = output_root / "milmmt_realtime_ab_review.md"

    report: dict[str, Any] = {
        "schema": "translateit.milmmt_1b_vs_4b_realtime.v2",
        "decision_state": "HARNESS_FAILED",
        "production_modified": False,
        "automatic_rejection_enabled": False,
        "scenarios": [spec["key"] for spec in MODEL_SPECS],
    }
    return_code = 1
    try:
        cases_doc = json.loads(
            (repo_root / "tools" / "translation_quality" / "realtime_use_cases.json").read_text(encoding="utf-8")
        )
        cases = list(cases_doc["cases"])
        if len(cases) != 24:
            raise RuntimeError(f"Realtime case count changed unexpectedly: {len(cases)}")

        free_bytes = shutil.disk_usage(output_root).free
        report["free_disk_before_bytes"] = free_bytes
        model_root = output_root / "models"
        model_root.mkdir(parents=True, exist_ok=True)
        missing_models = [spec for spec in MODEL_SPECS if not (model_root / f"{spec['key']}_model").exists()]
        if missing_models and free_bytes < 16 * 1024**3:
            raise RuntimeError(
                "At least 16 GiB free disk is required before first MiLMMT 1B+4B acquisition. "
                f"Observed {round(free_bytes / 1024**3, 2)} GiB."
            )

        provenance = [acquire_model(spec, model_root) for spec in MODEL_SPECS]
        report["provenance"] = provenance

        worker_script = repo_root / "tools" / "translation_quality" / "milmmt_realtime_worker.py"
        candidates: dict[str, dict[str, Any]] = {}
        for item in provenance:
            print(f"\nRunning {item['label']}...", flush=True)
            candidates[item["key"]] = run_candidate(
                repo_root,
                candidate_python,
                worker_script,
                item,
                cases,
                output_root,
            )
            time.sleep(2)

        report["candidates"] = candidates
        report["summary"] = {key: summarize_candidate(value) for key, value in candidates.items()}
        report["decision_state"] = "MILMMT_1B_VS_4B_REVIEW_REQUIRED"
        report["decision_rule"] = (
            "Compare MiLMMT-1B and MiLMMT-4B only. Choose from aggregate representative semantic correctness, "
            "factual fidelity, naturalness, completeness, latency and memory. One isolated error does not decide the model."
        )
        write_review(review_path, cases, candidates)
        report["review_pack"] = str(review_path)
        return_code = 0
    except Exception as exc:
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=16),
        }
        return_code = 1
    finally:
        report["finished_utc_unix"] = time.time()
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nMiLMMT 1B vs 4B realtime report: {report_path}", flush=True)
        if report.get("review_pack"):
            print(f"Review pack: {report['review_pack']}", flush=True)
        print(f"Decision state: {report.get('decision_state')}", flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
