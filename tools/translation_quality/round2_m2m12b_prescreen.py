from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import time
import traceback
from pathlib import Path
from typing import Any

PRESCREEN_BLOB = "eb59c2f1456e75a2d0c61dc1ae4d94c04cb40b07"
FROZEN_CASE_BLOB = "e33753f2106ea2287bce24052ccd97a08af61236"
FROZEN_CONTRACT_BLOB = "1b49065ad58b041187b6d69aaa575ecd4d941c7b"
MODEL_REPO = "facebook/m2m100_1.2B"
MODEL_REVISION = "7b36184180524c1a1bbfa37f120a608046250b98"
WEIGHTS_SHA256 = "a58ef8f42362ef12adeddc600b3425f1e2bbd019cfa6aae6b0051e2e3e055cd4"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def git_blob(repo_root: Path, path: Path) -> str:
    result = subprocess.run(
        ["git", "hash-object", str(path)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_inputs(repo_root: Path, model_dir: Path) -> dict[str, Any]:
    prescreen_path = repo_root / "tools" / "translation_quality" / "round2_rejection_prescreen.json"
    cases_path = repo_root / "tools" / "translation_quality" / "benchmark_cases.json"
    contract_path = repo_root / "tools" / "translation_quality" / "benchmark_contract.json"
    observed = {
        "prescreen_blob": git_blob(repo_root, prescreen_path),
        "benchmark_cases_blob": git_blob(repo_root, cases_path),
        "benchmark_contract_blob": git_blob(repo_root, contract_path),
    }
    expected = {
        "prescreen_blob": PRESCREEN_BLOB,
        "benchmark_cases_blob": FROZEN_CASE_BLOB,
        "benchmark_contract_blob": FROZEN_CONTRACT_BLOB,
    }
    if observed != expected:
        raise RuntimeError(f"Evaluation fixture integrity failed: observed={observed} expected={expected}")

    weights = model_dir / "pytorch_model.bin"
    if not weights.is_file():
        raise RuntimeError(f"M2M100-1.2B weights missing: {weights}")
    observed_sha = sha256_file(weights)
    if observed_sha != WEIGHTS_SHA256:
        raise RuntimeError(f"M2M100-1.2B weights hash mismatch: {observed_sha} != {WEIGHTS_SHA256}")

    required = [
        "config.json",
        "generation_config.json",
        "pytorch_model.bin",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenizer_config.json",
        "vocab.json",
    ]
    missing = [name for name in required if not (model_dir / name).is_file()]
    if missing:
        raise RuntimeError(f"M2M100-1.2B evaluation asset incomplete: {missing}")
    return {"observed": observed, "expected": expected, "weights_sha256": observed_sha}


def normalize_meaning_surface(value: str) -> str:
    text = str(value or "").casefold()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


class JsonWorker:
    def __init__(self, command: list[str], cwd: Path, stderr_path: Path) -> None:
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
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
            raise RuntimeError("Failed to open M2M100-1.2B worker pipes")

    def read(self) -> dict[str, Any]:
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(f"M2M100-1.2B worker exited without response; code={self.process.poll()}")
        value = json.loads(line)
        if not isinstance(value, dict):
            raise RuntimeError("M2M100-1.2B worker response is not a JSON object")
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
                _ = self.process.stdout.readline() if self.process.stdout else ""
            if self.process.stdin:
                self.process.stdin.close()
            self.process.wait(timeout=20)
        except Exception:
            self.process.kill()
            self.process.wait(timeout=10)
        finally:
            self.stderr_handle.close()


def build_directional_cases(prescreen: dict[str, Any]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for pair in prescreen["pairs"]:
        common = {
            "pair_id": str(pair["id"]),
            "category": str(pair["category"]),
            "requirement": str(pair["requirement"]),
            "literals": [str(value) for value in pair.get("literals", [])],
        }
        output.extend(
            [
                {
                    **common,
                    "case_id": f"{pair['id']}.en_id",
                    "direction": "en->id",
                    "source": str(pair["en"]),
                    "reference": str(pair["id_text"]),
                },
                {
                    **common,
                    "case_id": f"{pair['id']}.id_en",
                    "direction": "id->en",
                    "source": str(pair["id_text"]),
                    "reference": str(pair["en"]),
                },
            ]
        )
    if len(output) != 32:
        raise RuntimeError(f"Round 2 semantic prescreen count changed: {len(output)}")
    return output


def automatic_diagnostics(prescreen: dict[str, Any], results: list[dict[str, Any]]) -> dict[str, Any]:
    failures: list[dict[str, Any]] = []
    literal_failures: list[dict[str, Any]] = []
    by_pair_direction: dict[tuple[str, str], str] = {}
    for row in results:
        response = row["response"]
        if not response.get("ok"):
            failures.append(
                {
                    "case_id": row["case_id"],
                    "blocker": response.get("blocker", "translation_failed"),
                    "note": response.get("note", ""),
                }
            )
            continue
        translated = str(response.get("translated_text", ""))
        missing = [literal for literal in row["literals"] if literal not in translated]
        if missing:
            literal_failures.append(
                {
                    "case_id": row["case_id"],
                    "missing": missing,
                    "translated_text": translated,
                }
            )
        by_pair_direction[(row["pair_id"], row["direction"])] = normalize_meaning_surface(translated)

    contrast_collapses: list[dict[str, Any]] = []
    for group_name, pair_ids in prescreen.get("contrast_groups", {}).items():
        pair_ids = [str(value) for value in pair_ids]
        for direction in ("en->id", "id->en"):
            surfaces = [
                (pair_id, by_pair_direction.get((pair_id, direction), ""))
                for pair_id in pair_ids
            ]
            nonempty = [(pair_id, surface) for pair_id, surface in surfaces if surface]
            for index, (left_id, left_surface) in enumerate(nonempty):
                for right_id, right_surface in nonempty[index + 1 :]:
                    if left_surface == right_surface:
                        contrast_collapses.append(
                            {
                                "group": group_name,
                                "direction": direction,
                                "left_pair": left_id,
                                "right_pair": right_id,
                                "normalized_output": left_surface,
                            }
                        )

    return {
        "automatic_reject": bool(failures or literal_failures or contrast_collapses),
        "generation_or_completion_failures": failures,
        "protected_literal_failures": literal_failures,
        "semantic_contrast_collapses": contrast_collapses,
        "automatic_scope_note": (
            "These diagnostics only catch mechanical failures, opaque-literal loss, and exact minimal-pair collapse. "
            "They do not prove semantic correctness; manual review of all 32 directional outputs remains mandatory."
        ),
    }


def write_review_pack(path: Path, results: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in results:
            handle.write(
                json.dumps(
                    {
                        "case_id": row["case_id"],
                        "category": row["category"],
                        "direction": row["direction"],
                        "source": row["source"],
                        "reference": row["reference"],
                        "requirement": row["requirement"],
                        "candidate_output": str(row["response"].get("translated_text", "")),
                        "candidate_ok": bool(row["response"].get("ok")),
                        "review": {"severity": "", "notes": ""},
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--round2-root", required=True)
    parser.add_argument("--candidate-python", required=True)
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    round2_root = Path(args.round2_root).resolve()
    model_dir = Path(args.model_dir).resolve()
    round2_root.mkdir(parents=True, exist_ok=True)
    report_path = round2_root / "m2m12b_prescreen_report.json"
    review_path = round2_root / "m2m12b_semantic_review_pack.jsonl"
    stderr_path = round2_root / "m2m12b_worker_stderr.log"

    report: dict[str, Any] = {
        "schema": "translateit.round2_m2m12b_prescreen.v1",
        "candidate": {
            "repo": MODEL_REPO,
            "revision": MODEL_REVISION,
            "weights_sha256": WEIGHTS_SHA256,
            "runtime_dtype": "torch.bfloat16",
            "num_beams": 5,
            "do_sample": False,
        },
        "purpose": "Rejection-only semantic prescreen. This report cannot authorize production migration.",
        "promotion_authority": False,
        "production_modified": False,
        "prescreen_state": "HARNESS_FAILED",
        "full_benchmark_run": False,
        "external_sample_run": False,
        "performance_repeat_run": False,
    }

    worker: JsonWorker | None = None
    try:
        report["integrity"] = verify_inputs(repo_root, model_dir)
        prescreen = load_json(
            repo_root / "tools" / "translation_quality" / "round2_rejection_prescreen.json"
        )
        cases = build_directional_cases(prescreen)
        report["case_count"] = len(cases)

        worker = JsonWorker(
            [
                str(Path(args.candidate_python).resolve()),
                str(repo_root / "tools" / "translation_quality" / "round2_m2m12b_worker.py"),
                "--model-dir",
                str(model_dir),
            ],
            repo_root,
            stderr_path,
        )
        preload = worker.read()
        if not preload.get("ok"):
            raise RuntimeError(f"M2M100-1.2B preload failed: {preload}")
        report["preload"] = preload

        results: list[dict[str, Any]] = []
        for index, case in enumerate(cases, 1):
            source_language, target_language = case["direction"].split("->")
            response, wall_ms = worker.request(
                {
                    "command": "translate",
                    "source_language": source_language,
                    "target_language": target_language,
                    "text": case["source"],
                }
            )
            results.append({**case, "request_wall_ms": wall_ms, "response": response})
            print(f"[M2M100-1.2B] semantic {index}/{len(cases)}", flush=True)

        report["semantic_results"] = results
        diagnostics = automatic_diagnostics(prescreen, results)
        report["automatic_diagnostics"] = diagnostics
        write_review_pack(review_path, results)
        report["semantic_review_pack"] = str(review_path)
        if diagnostics["automatic_reject"]:
            report["prescreen_state"] = "REJECTED_AUTOMATIC"
            report["next_step"] = "STOP. Do not run external sampling, the full benchmark, or production migration for M2M100-1.2B."
        else:
            report["prescreen_state"] = "AWAITING_MANUAL_SEMANTIC_REVIEW"
            report["next_step"] = (
                "STOP and manually review all 32 directional semantic outputs. "
                "Only zero CRITICAL errors may authorize a separate small external/performance prescreen."
            )
        return_code = 0
    except Exception as exc:
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=14),
        }
        report["next_step"] = "STOP and diagnose the harness/runtime failure; do not widen the candidate matrix."
        return_code = 1
    finally:
        if worker is not None:
            worker.close()
        report["finished_utc_unix"] = time.time()
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nRound 2 M2M100-1.2B report: {report_path}", flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
