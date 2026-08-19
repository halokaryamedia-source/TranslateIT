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
SMALL100_REPO = "alirezamsh/small100"
SMALL100_REVISION = "8ab680e26a596d2e3d2d2d17ae0f68df1037328c"
SMALL100_WEIGHTS_SHA256 = "dd3b845a36ea4ed90437fd0b9b477e30c21f144d3658679fd5c945e3c96b0fbc"


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

    weights = model_dir / "model.safetensors"
    if not weights.is_file():
        raise RuntimeError(f"SMaLL-100 safetensors weights missing: {weights}")
    observed_sha = sha256_file(weights)
    if observed_sha != SMALL100_WEIGHTS_SHA256:
        raise RuntimeError(
            f"SMaLL-100 weights hash mismatch: {observed_sha} != {SMALL100_WEIGHTS_SHA256}"
        )

    required = [
        "config.json",
        "model.safetensors",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenization_small100.py",
        "tokenizer_config.json",
        "vocab.json",
    ]
    missing = [name for name in required if not (model_dir / name).is_file()]
    if missing:
        raise RuntimeError(f"SMaLL-100 evaluation asset incomplete: {missing}")

    return {
        "observed": observed,
        "expected": expected,
        "weights_sha256": observed_sha,
    }


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
            raise RuntimeError("Failed to open SMaLL-100 worker pipes")

    def read(self) -> dict[str, Any]:
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(f"SMaLL-100 worker exited without response; code={self.process.poll()}")
        value = json.loads(line)
        if not isinstance(value, dict):
            raise RuntimeError("SMaLL-100 worker response is not a JSON object")
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
            "literals": [str(v) for v in pair.get("literals", [])],
        }
        output.append(
            {
                **common,
                "case_id": f"{pair['id']}.en_id",
                "direction": "en->id",
                "source": str(pair["en"]),
                "reference": str(pair["id_text"]),
            }
        )
        output.append(
            {
                **common,
                "case_id": f"{pair['id']}.id_en",
                "direction": "id->en",
                "source": str(pair["id_text"]),
                "reference": str(pair["en"]),
            }
        )
    if len(output) != 32:
        raise RuntimeError(f"Round 2 semantic prescreen count changed: {len(output)}")
    return output


def automatic_diagnostics(
    prescreen: dict[str, Any], results: list[dict[str, Any]]
) -> dict[str, Any]:
    failures = []
    literal_failures = []
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

    contrast_collapses = []
    groups = prescreen.get("contrast_groups", {})
    for group_name, pair_ids in groups.items():
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

    rejected = bool(failures or literal_failures or contrast_collapses)
    return {
        "automatic_reject": rejected,
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
                        "review": {
                            "severity": "",
                            "notes": "",
                        },
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
    report_path = round2_root / "small100_prescreen_report.json"
    review_path = round2_root / "small100_semantic_review_pack.jsonl"
    stderr_path = round2_root / "small100_worker_stderr.log"

    report: dict[str, Any] = {
        "schema": "translateit.round2_small100_prescreen.v1",
        "candidate": {
            "repo": SMALL100_REPO,
            "revision": SMALL100_REVISION,
            "weights_sha256": SMALL100_WEIGHTS_SHA256,
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
        integrity = verify_inputs(repo_root, model_dir)
        prescreen = load_json(
            repo_root / "tools" / "translation_quality" / "round2_rejection_prescreen.json"
        )
        cases = build_directional_cases(prescreen)
        report["integrity"] = integrity
        report["case_count"] = len(cases)

        worker_script = repo_root / "tools" / "translation_quality" / "round2_small100_worker.py"
        worker = JsonWorker(
            [
                str(Path(args.candidate_python).resolve()),
                str(worker_script),
                "--model-dir",
                str(model_dir),
            ],
            repo_root,
            stderr_path,
        )
        preload = worker.read()
        if not preload.get("ok"):
            raise RuntimeError(f"SMaLL-100 preload failed: {preload}")
        report["preload"] = preload

        results: list[dict[str, Any]] = []
        for index, case in enumerate(cases, 1):
            response, wall_ms = worker.request(
                {
                    "command": "translate",
                    "source_language": case["direction"].split("->")[0],
                    "target_language": case["direction"].split("->")[1],
                    "text": case["source"],
                }
            )
            results.append({**case, "request_wall_ms": wall_ms, "response": response})
            print(f"[SMaLL-100] semantic {index}/{len(cases)}", flush=True)

        report["semantic_results"] = results
        diagnostics = automatic_diagnostics(prescreen, results)
        report["automatic_diagnostics"] = diagnostics
        write_review_pack(review_path, results)
        report["semantic_review_pack"] = str(review_path)

        if diagnostics["automatic_reject"]:
            report["prescreen_state"] = "REJECTED_AUTOMATIC"
            report["next_step"] = (
                "STOP. Do not run external sampling, repeated performance, the frozen full benchmark, "
                "or production migration for SMaLL-100."
            )
        else:
            report["prescreen_state"] = "AWAITING_MANUAL_SEMANTIC_REVIEW"
            report["next_step"] = (
                "STOP and manually review all 32 directional semantic outputs. "
                "Only a zero-CRITICAL review may authorize a separate small external/performance prescreen."
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
        report_path.write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\nRound 2 SMaLL-100 report: {report_path}", flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
