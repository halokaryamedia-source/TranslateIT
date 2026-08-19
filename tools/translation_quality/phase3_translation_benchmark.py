from __future__ import annotations

import argparse
import json
import math
import os
import random
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any

FROZEN_CASE_BLOB = "e33753f2106ea2287bce24052ccd97a08af61236"
FROZEN_CONTRACT_BLOB = "1b49065ad58b041187b6d69aaa575ecd4d941c7b"
M2M_REVISION = "55c2e61bbf05dfb8d7abccdc3fae6fc8512fd636"
LMT_REVISION = "2ff175e2a450d2f2458b33234bfb74953468b3a2"
FLORES_ROWS = 1012


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if line:
                value = json.loads(line)
                if not isinstance(value, dict):
                    raise RuntimeError(f"Non-object JSONL row in {path}")
                rows.append(value)
    return rows


def row_id(row: dict[str, Any]) -> str:
    for key in ("id", "sentence_id", "sentence_index"):
        if key in row:
            return str(row[key])
    raise RuntimeError(f"FLORES row id unavailable. Keys: {sorted(row)}")


def row_text(row: dict[str, Any]) -> str:
    for key in ("text", "sentence", "sentence_text", "translation"):
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    raise RuntimeError(f"FLORES sentence text unavailable. Keys: {sorted(row)}")


def git_blob(repo_root: Path, path: Path) -> str:
    result = subprocess.run(
        ["git", "hash-object", str(path)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def verify_frozen(repo_root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    case_path = repo_root / "tools" / "translation_quality" / "benchmark_cases.json"
    contract_path = repo_root / "tools" / "translation_quality" / "benchmark_contract.json"
    if git_blob(repo_root, case_path) != FROZEN_CASE_BLOB:
        raise RuntimeError("Frozen benchmark_cases.json blob changed")
    if git_blob(repo_root, contract_path) != FROZEN_CONTRACT_BLOB:
        raise RuntimeError("Frozen benchmark_contract.json blob changed")
    return load_json(case_path), load_json(contract_path)


def verify_manifest(repo_root: Path) -> None:
    manifest = load_json(
        repo_root
        / "EngineData"
        / "Backend"
        / "LocalWorker"
        / "WorkerRuntime"
        / "model_manifest.json"
    )
    candidates = [
        row
        for row in manifest.get("models", [])
        if row.get("model_id") == "m2m100-418m"
    ]
    if len(candidates) != 1 or candidates[0].get("revision") != M2M_REVISION:
        raise RuntimeError("Canonical M2M baseline manifest revision changed")


def verify_phase2(phase2_root: Path) -> Path:
    report = load_json(phase2_root / "phase2_lmt_compatibility_report.json")
    if not report.get("ok"):
        raise RuntimeError("Phase 2 LMT compatibility report is not PASS")
    if report.get("model", {}).get("revision") != LMT_REVISION:
        raise RuntimeError("Phase 2 LMT revision does not match frozen Phase 3 target")
    model_dir = Path(str(report["model"]["local_path"]))
    if not model_dir.is_dir():
        raise RuntimeError(f"Phase 2 LMT model directory missing: {model_dir}")
    return model_dir


def expand_cases(case_file: dict[str, Any]) -> list[dict[str, Any]]:
    categories = [str(value) for value in case_file["categories"]]
    output: list[dict[str, Any]] = []
    for row in case_file["regression"]:
        output.append(
            {
                "case_id": str(row[0]),
                "set": "regression",
                "category": "historical_regression",
                "direction": str(row[1]),
                "source": str(row[2]),
                "reference": str(row[3]),
                "requirements": str(row[6]),
                "literals": [str(v) for v in row[7]] if len(row) > 7 else [],
            }
        )
    for row in case_file["pairs"]:
        category = categories[int(row[0])]
        pair_number = int(row[1])
        set_name = "stress" if pair_number <= 3 else "holdout"
        literals = [str(v) for v in row[5]] if len(row) > 5 else []
        output.extend(
            [
                {
                    "case_id": f"{set_name}.{category}.{pair_number:02d}.en_id",
                    "set": set_name,
                    "category": category,
                    "direction": "en->id",
                    "source": str(row[2]),
                    "reference": str(row[3]),
                    "requirements": str(row[4]),
                    "literals": literals,
                },
                {
                    "case_id": f"{set_name}.{category}.{pair_number:02d}.id_en",
                    "set": set_name,
                    "category": category,
                    "direction": "id->en",
                    "source": str(row[3]),
                    "reference": str(row[2]),
                    "requirements": str(row[4]),
                    "literals": literals,
                },
            ]
        )
    counts = {
        name: sum(1 for row in output if row["set"] == name)
        for name in ("regression", "stress", "holdout")
    }
    if counts != {"regression": 7, "stress": 72, "holdout": 48}:
        raise RuntimeError(f"Frozen product counts changed: {counts}")
    return output


def load_flores(phase2_root: Path) -> list[dict[str, str]]:
    en_rows = read_jsonl(phase2_root / "flores_plus" / "devtest" / "eng_Latn.jsonl")
    id_rows = read_jsonl(phase2_root / "flores_plus" / "devtest" / "ind_Latn.jsonl")
    if len(en_rows) != FLORES_ROWS or len(id_rows) != FLORES_ROWS:
        raise RuntimeError("FLORES row count changed")
    pairs = []
    for en_row, id_row in zip(en_rows, id_rows):
        if row_id(en_row) != row_id(id_row):
            raise RuntimeError("FLORES alignment ids changed")
        pairs.append(
            {"row_id": row_id(en_row), "en": row_text(en_row), "id": row_text(id_row)}
        )
    return pairs


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return round(ordered[0], 2)
    pos = (len(ordered) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return round(ordered[lo], 2)
    frac = pos - lo
    return round(ordered[lo] * (1 - frac) + ordered[hi] * frac, 2)


def vram_mib() -> int | None:
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


class JsonWorker:
    def __init__(
        self,
        command: list[str],
        cwd: Path,
        stderr_path: Path,
        environment: dict[str, str] | None = None,
    ) -> None:
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
            env=environment,
        )
        if self.process.stdin is None or self.process.stdout is None:
            raise RuntimeError("Failed to open worker pipes")

    def request(self, payload: dict[str, Any]) -> tuple[dict[str, Any], float]:
        started = time.perf_counter()
        self.process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        wall_ms = (time.perf_counter() - started) * 1000.0
        if not line:
            raise RuntimeError(f"Worker exited without response; code={self.process.poll()}")
        response = json.loads(line)
        if not isinstance(response, dict):
            raise RuntimeError("Worker response is not an object")
        return response, round(wall_ms, 2)

    def close(self) -> None:
        try:
            if self.process.stdin:
                self.process.stdin.close()
            self.process.wait(timeout=20)
        except Exception:
            self.process.kill()
            self.process.wait(timeout=10)
        finally:
            self.stderr_handle.close()


def request_translation(
    worker: JsonWorker, case_id: str, direction: str, source: str
) -> dict[str, Any]:
    source_language, target_language = direction.split("->")
    response, wall_ms = worker.request(
        {
            "command": "translate",
            "source_language": source_language,
            "target_language": target_language,
            "text": source,
        }
    )
    return {
        "case_id": case_id,
        "direction": direction,
        "request_wall_ms": wall_ms,
        "response": response,
    }


def performance(
    worker: JsonWorker,
    cases: dict[str, dict[str, Any]],
    classes: dict[str, list[str]],
) -> dict[str, Any]:
    result: dict[str, Any] = {"classes": {}, "vram_before_mib": vram_mib()}
    for class_name in ("short", "medium", "long"):
        all_samples: list[float] = []
        case_rows = []
        for case_id in classes[class_name]:
            case = cases[case_id]
            warmup_ok = True
            for _ in range(5):
                row = request_translation(worker, case_id, case["direction"], case["source"])
                if not row["response"].get("ok"):
                    warmup_ok = False
                    break
            samples: list[float] = []
            blocker = ""
            if warmup_ok:
                for _ in range(30):
                    row = request_translation(
                        worker, case_id, case["direction"], case["source"]
                    )
                    if not row["response"].get("ok"):
                        blocker = str(row["response"].get("blocker", "translation_failed"))
                        break
                    samples.append(float(row["request_wall_ms"]))
            else:
                blocker = "warmup_failed"
            all_samples.extend(samples)
            case_rows.append(
                {
                    "case_id": case_id,
                    "samples": len(samples),
                    "p50_ms": percentile(samples, 0.50),
                    "p90_ms": percentile(samples, 0.90),
                    "max_ms": round(max(samples), 2) if samples else None,
                    "blocker": blocker,
                }
            )
        result["classes"][class_name] = {
            "cases": case_rows,
            "samples": len(all_samples),
            "p50_ms": percentile(all_samples, 0.50),
            "p90_ms": percentile(all_samples, 0.90),
            "max_ms": round(max(all_samples), 2) if all_samples else None,
            "vram_after_class_mib": vram_mib(),
        }
    result["vram_after_mib"] = vram_mib()
    return result


def run_engine(
    name: str,
    worker: JsonWorker,
    product_cases: list[dict[str, Any]],
    flores: list[dict[str, str]],
    perf_classes: dict[str, list[str]],
) -> dict[str, Any]:
    report: dict[str, Any] = {
        "engine": name,
        "vram_before_preload_mib": vram_mib(),
        "product_results": [],
        "flores": {"en_id": [], "id_en": []},
    }
    preload, preload_wall = worker.request(
        {
            "command": "translation_preload",
            "source_language": "id",
            "target_language": "en",
        }
    )
    if not preload.get("ok"):
        raise RuntimeError(f"{name} preload failed: {preload}")
    report["preload"] = preload
    report["preload_wall_ms"] = preload_wall
    report["vram_after_preload_mib"] = vram_mib()

    for index, case in enumerate(product_cases, 1):
        report["product_results"].append(
            request_translation(worker, case["case_id"], case["direction"], case["source"])
        )
        if index % 25 == 0 or index == len(product_cases):
            print(f"[{name}] product {index}/{len(product_cases)}", flush=True)

    for token, direction in (("en_id", "en->id"), ("id_en", "id->en")):
        for index, pair in enumerate(flores, 1):
            source = pair["en"] if direction == "en->id" else pair["id"]
            row = request_translation(
                worker, f"flores.{pair['row_id']}.{token}", direction, source
            )
            row["row_id"] = pair["row_id"]
            report["flores"][token].append(row)
            if index % 100 == 0 or index == len(flores):
                print(f"[{name}] FLORES {token} {index}/{len(flores)}", flush=True)

    by_id = {row["case_id"]: row for row in product_cases}
    report["performance"] = performance(worker, by_id, perf_classes)
    report["vram_after_run_mib"] = vram_mib()
    return report


def result_map(engine_report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["case_id"]: row for row in engine_report["product_results"]}


def completed_text(row: dict[str, Any]) -> str:
    response = row["response"]
    return str(response.get("translated_text", "")) if response.get("ok") else ""


def write_lines(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for line in lines:
            handle.write(str(line).replace("\r", " ").replace("\n", " ") + "\n")


def external_metrics(
    root: Path, flores: list[dict[str, str]], m2m: dict[str, Any], lmt: dict[str, Any]
) -> dict[str, Any]:
    from sacrebleu.metrics import BLEU, CHRF

    output: dict[str, Any] = {}
    for token, direction in (("en_id", "en->id"), ("id_en", "id->en")):
        refs = [pair["id"] if direction == "en->id" else pair["en"] for pair in flores]
        m_rows, l_rows = m2m["flores"][token], lmt["flores"][token]
        m_fail = sum(1 for row in m_rows if not row["response"].get("ok"))
        l_fail = sum(1 for row in l_rows if not row["response"].get("ok"))
        if m_fail or l_fail:
            output[token] = {
                "valid": False,
                "m2m_failed": m_fail,
                "lmt_failed": l_fail,
                "reason": "Incomplete external outputs; corpus metrics not computed.",
            }
            continue

        systems = {
            "m2m": [completed_text(row) for row in m_rows],
            "lmt": [completed_text(row) for row in l_rows],
        }
        scores: dict[str, Any] = {}
        for name, hypotheses in systems.items():
            bleu = BLEU(tokenize="13a", lowercase=False)
            chrf = CHRF(word_order=2, lowercase=False)
            b = bleu.corpus_score(hypotheses, [refs])
            c = chrf.corpus_score(hypotheses, [refs])
            scores[name] = {
                "bleu": {"score": round(b.score, 4), "signature": str(bleu.get_signature())},
                "chrf_plus_plus": {
                    "score": round(c.score, 4),
                    "signature": str(chrf.get_signature()),
                },
            }

        metric_dir = root / "metrics" / token
        ref_file = metric_dir / "reference.txt"
        m_file = metric_dir / "m2m100.txt"
        l_file = metric_dir / "lmt.txt"
        write_lines(ref_file, refs)
        write_lines(m_file, systems["m2m"])
        write_lines(l_file, systems["lmt"])
        env = dict(os.environ)
        env["SACREBLEU_SEED"] = "12345"
        cmd = [
            sys.executable,
            "-m",
            "sacrebleu",
            str(ref_file),
            "-i",
            str(m_file),
            str(l_file),
            "-m",
            "bleu",
            "chrf",
            "--tokenize",
            "13a",
            "--chrf-word-order",
            "2",
            "--paired-bs",
            "--paired-bs-n",
            "1000",
            "--format",
            "text",
        ]
        paired = subprocess.run(cmd, capture_output=True, text=True, env=env, check=False)
        output[token] = {
            "valid": True,
            "scores": scores,
            "paired_bootstrap": {
                "returncode": paired.returncode,
                "stdout": paired.stdout,
                "stderr": paired.stderr,
                "seed": 12345,
                "resamples": 1000,
            },
        }
    return output


def literal_diagnostics(
    product_cases: list[dict[str, Any]], m2m: dict[str, Any], lmt: dict[str, Any]
) -> list[dict[str, Any]]:
    m_map, l_map = result_map(m2m), result_map(lmt)
    rows = []
    for case in product_cases:
        if not case["literals"]:
            continue
        for name, mapping in (("m2m", m_map), ("lmt", l_map)):
            text = completed_text(mapping[case["case_id"]])
            missing = [literal for literal in case["literals"] if literal not in text]
            rows.append(
                {
                    "case_id": case["case_id"],
                    "engine": name,
                    "required": case["literals"],
                    "missing": missing,
                    "all_preserved": not missing,
                }
            )
    return rows


def review_packs(
    root: Path, product_cases: list[dict[str, Any]], m2m: dict[str, Any], lmt: dict[str, Any]
) -> dict[str, str]:
    rng = random.Random(12345)
    m_map, l_map = result_map(m2m), result_map(lmt)
    semantic = root / "phase3_semantic_review_pack.jsonl"
    naturalness = root / "phase3_naturalness_review_pack.jsonl"
    key_path = root / "phase3_blind_review_key.json"
    key = {}

    with semantic.open("w", encoding="utf-8", newline="\n") as sem, naturalness.open(
        "w", encoding="utf-8", newline="\n"
    ) as nat:
        for case in product_cases:
            case_id = case["case_id"]
            systems = [
                ("m2m", completed_text(m_map[case_id])),
                ("lmt", completed_text(l_map[case_id])),
            ]
            if rng.random() < 0.5:
                systems.reverse()
            key[case_id] = {"A": systems[0][0], "B": systems[1][0]}
            sem.write(
                json.dumps(
                    {
                        "case_id": case_id,
                        "set": case["set"],
                        "category": case["category"],
                        "direction": case["direction"],
                        "source": case["source"],
                        "reference": case["reference"],
                        "requirements": case["requirements"],
                        "system_A": systems[0][1],
                        "system_B": systems[1][1],
                        "review": {
                            "A_severity": "",
                            "B_severity": "",
                            "A_notes": "",
                            "B_notes": "",
                        },
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            if case["set"] == "holdout":
                nat.write(
                    json.dumps(
                        {
                            "case_id": case_id,
                            "direction": case["direction"],
                            "source": case["source"],
                            "system_A": systems[0][1],
                            "system_B": systems[1][1],
                            "preference": "",
                            "notes": "",
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
    key_path.write_text(json.dumps(key, indent=2), encoding="utf-8")
    return {
        "semantic": str(semantic),
        "naturalness": str(naturalness),
        "key": str(key_path),
    }


def summarize_completion(engine_report: dict[str, Any]) -> dict[str, int]:
    product_failed = sum(
        1 for row in engine_report["product_results"] if not row["response"].get("ok")
    )
    flores_failed = sum(
        1
        for rows in engine_report["flores"].values()
        for row in rows
        if not row["response"].get("ok")
    )
    return {
        "product_total": len(engine_report["product_results"]),
        "product_failed": product_failed,
        "flores_total": sum(len(rows) for rows in engine_report["flores"].values()),
        "flores_failed": flores_failed,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--phase2-root", required=True)
    parser.add_argument("--phase3-root", required=True)
    parser.add_argument("--baseline-python", required=True)
    parser.add_argument("--lmt-python", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    phase2_root = Path(args.phase2_root).resolve()
    phase3_root = Path(args.phase3_root).resolve()
    phase3_root.mkdir(parents=True, exist_ok=True)
    summary_path = phase3_root / "phase3_automatic_comparison.json"

    summary: dict[str, Any] = {
        "schema": "translateit.phase3_automatic_comparison.v1",
        "automatic_run_complete": False,
        "quality_decision": "NOT_DECIDED_REQUIRES_SEMANTIC_REVIEW",
        "production_modified": False,
    }

    baseline_worker: JsonWorker | None = None
    lmt_worker: JsonWorker | None = None
    try:
        case_file, contract = verify_frozen(repo_root)
        verify_manifest(repo_root)
        lmt_model_dir = verify_phase2(phase2_root)
        product_cases = expand_cases(case_file)
        flores = load_flores(phase2_root)
        perf_classes = {
            key: [str(v) for v in contract["performance"]["translation_only_case_ids"][key]]
            for key in ("short", "medium", "long")
        }

        worker_script = (
            repo_root
            / "EngineData"
            / "Backend"
            / "LocalWorker"
            / "WorkerRuntime"
            / "realtime_local_worker.py"
        )
        env = dict(os.environ)
        env["TRANSLATEIT_RUNTIME_ROOT"] = str(repo_root)
        env["TRANSLATEIT_USER_DATA_ROOT"] = str(repo_root / "UserData")
        baseline_worker = JsonWorker(
            [str(Path(args.baseline_python).resolve()), str(worker_script)],
            repo_root,
            phase3_root / "m2m_worker_stderr.log",
            env,
        )
        m2m = run_engine("m2m100", baseline_worker, product_cases, flores, perf_classes)
        baseline_worker.close()
        baseline_worker = None
        (phase3_root / "phase3_m2m100_results.json").write_text(
            json.dumps(m2m, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        time.sleep(2)

        lmt_script = repo_root / "tools" / "translation_quality" / "phase3_lmt_worker.py"
        lmt_worker = JsonWorker(
            [
                str(Path(args.lmt_python).resolve()),
                str(lmt_script),
                "--model-dir",
                str(lmt_model_dir),
            ],
            repo_root,
            phase3_root / "lmt_worker_stderr.log",
        )
        lmt = run_engine("lmt", lmt_worker, product_cases, flores, perf_classes)
        lmt_worker.close()
        lmt_worker = None
        (phase3_root / "phase3_lmt_results.json").write_text(
            json.dumps(lmt, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        summary.update(
            {
                "benchmark_blobs": {
                    "cases": FROZEN_CASE_BLOB,
                    "contract": FROZEN_CONTRACT_BLOB,
                },
                "completion": {
                    "m2m100": summarize_completion(m2m),
                    "lmt": summarize_completion(lmt),
                },
                "performance": {
                    "m2m100": {
                        "preload_wall_ms": m2m["preload_wall_ms"],
                        "preload": m2m["preload"],
                        **m2m["performance"],
                    },
                    "lmt": {
                        "preload_wall_ms": lmt["preload_wall_ms"],
                        "preload": lmt["preload"],
                        **lmt["performance"],
                    },
                },
                "protected_literals": literal_diagnostics(product_cases, m2m, lmt),
                "external_metrics": external_metrics(phase3_root, flores, m2m, lmt),
                "review_packs": review_packs(phase3_root, product_cases, m2m, lmt),
                "comet": {
                    "status": "DEFERRED_UNTIL_SEMANTIC_SAFETY",
                    "reason": "Frozen contract marks COMET supplementary/non-blocking; do not spend extra evaluation compute before semantic safety review.",
                },
                "automatic_run_complete": True,
                "note": (
                    "Automatic Phase 3 evidence is complete. No production migration is authorized. "
                    "Complete semantic severity review next; use naturalness pack only if semantic safety passes."
                ),
            }
        )
        return_code = 0
    except Exception as exc:
        summary["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=16),
        }
        return_code = 1
    finally:
        if baseline_worker is not None:
            baseline_worker.close()
        if lmt_worker is not None:
            lmt_worker.close()
        summary_path.write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\nPhase 3 summary: {summary_path}")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
