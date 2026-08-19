from __future__ import annotations

import argparse
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
MODEL_REPO = "google/translategemma-4b-it"
MODEL_REF = "main"
REQUIRED_FILES = [
    "README.md",
    "added_tokens.json",
    "chat_template.jinja",
    "config.json",
    "generation_config.json",
    "model-00001-of-00002.safetensors",
    "model-00002-of-00002.safetensors",
    "model.safetensors.index.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer.model",
    "tokenizer_config.json",
]


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


def verify_frozen_inputs(repo_root: Path) -> dict[str, str]:
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
    return observed


def sibling_metadata(sibling: Any) -> dict[str, Any]:
    lfs = getattr(sibling, "lfs", None)
    lfs_sha256 = None
    if isinstance(lfs, dict):
        lfs_sha256 = lfs.get("sha256")
    elif lfs is not None:
        lfs_sha256 = getattr(lfs, "sha256", None)
    return {
        "name": str(getattr(sibling, "rfilename", "")),
        "size": getattr(sibling, "size", None),
        "blob_id": getattr(sibling, "blob_id", None),
        "lfs_sha256": lfs_sha256,
    }


def resolve_and_acquire_model(round2_root: Path, model_dir: Path) -> dict[str, Any]:
    from huggingface_hub import HfApi, snapshot_download

    pin_path = round2_root / "translategemma_revision.txt"
    api = HfApi()
    if pin_path.is_file() and pin_path.read_text(encoding="utf-8").strip():
        revision = pin_path.read_text(encoding="utf-8").strip()
    else:
        info = api.model_info(MODEL_REPO, revision=MODEL_REF, files_metadata=True, token=True)
        revision = str(info.sha or "").strip()
        if not revision:
            raise RuntimeError("TranslateGemma exact revision could not be resolved")
        pin_path.write_text(revision + "\n", encoding="utf-8")

    info = api.model_info(MODEL_REPO, revision=revision, files_metadata=True, token=True)
    siblings = {
        str(getattr(item, "rfilename", "")): item for item in (info.siblings or [])
    }
    missing_remote = [name for name in REQUIRED_FILES if name not in siblings]
    if missing_remote:
        raise RuntimeError(f"TranslateGemma pinned revision is missing required files: {missing_remote}")

    snapshot_download(
        repo_id=MODEL_REPO,
        revision=revision,
        local_dir=str(model_dir),
        allow_patterns=REQUIRED_FILES,
        token=True,
    )

    missing_local = [name for name in REQUIRED_FILES if not (model_dir / name).is_file()]
    if missing_local:
        raise RuntimeError(f"TranslateGemma local evaluation asset is incomplete: {missing_local}")

    files: list[dict[str, Any]] = []
    for name in REQUIRED_FILES:
        remote = sibling_metadata(siblings[name])
        local_size = (model_dir / name).stat().st_size
        remote_size = remote.get("size")
        if remote_size is not None and int(remote_size) != int(local_size):
            raise RuntimeError(
                f"TranslateGemma file size mismatch for {name}: local={local_size} remote={remote_size}"
            )
        files.append({**remote, "local_size": local_size})

    return {
        "repo": MODEL_REPO,
        "resolved_revision": revision,
        "revision_pin_path": str(pin_path),
        "model_dir": str(model_dir),
        "files": files,
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
            raise RuntimeError("Failed to open TranslateGemma worker pipes")

    def read(self) -> dict[str, Any]:
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(
                f"TranslateGemma worker exited without response; code={self.process.poll()}"
            )
        value = json.loads(line)
        if not isinstance(value, dict):
            raise RuntimeError("TranslateGemma worker response is not a JSON object")
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


def hard_diagnostics(prescreen: dict[str, Any], results: list[dict[str, Any]]) -> dict[str, Any]:
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
        by_pair_direction[(row["pair_id"], row["direction"])] = normalize_meaning_surface(
            translated
        )

    contrast_collapses: list[dict[str, Any]] = []
    for group_name, pair_ids_raw in prescreen.get("contrast_groups", {}).items():
        pair_ids = [str(value) for value in pair_ids_raw]
        for direction in ("en->id", "id->en"):
            surfaces = [
                (pair_id, by_pair_direction.get((pair_id, direction), ""))
                for pair_id in pair_ids
            ]
            if any(not surface for _, surface in surfaces):
                continue
            for index, (left_id, left_surface) in enumerate(surfaces):
                for right_id, right_surface in surfaces[index + 1 :]:
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
            "Rejection-only diagnostics catch runtime/completion failure, opaque-literal loss, "
            "and exact semantic minimal-pair collapse. They cannot establish semantic correctness."
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
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    round2_root = Path(args.round2_root).resolve()
    model_dir = round2_root / "translategemma_4b_model"
    report_path = round2_root / "translategemma_prescreen_report.json"
    review_path = round2_root / "translategemma_semantic_review_pack.jsonl"
    stderr_path = round2_root / "translategemma_worker_stderr.log"
    round2_root.mkdir(parents=True, exist_ok=True)

    report: dict[str, Any] = {
        "schema": "translateit.round2_translategemma_int8_prescreen.v1",
        "candidate": {
            "repo": MODEL_REPO,
            "requested_ref": MODEL_REF,
            "runtime": "transformers_4x_bitsandbytes_llm_int8",
            "do_sample": False,
        },
        "purpose": "Compatibility + rejection-only semantic prescreen; cannot authorize production migration.",
        "promotion_authority": False,
        "production_modified": False,
        "prescreen_state": "HARNESS_FAILED",
        "full_benchmark_run": False,
        "external_sample_run": False,
        "performance_repeat_run": False,
        "semantic_planned_cases": 32,
        "semantic_completed_cases": 0,
    }

    worker: JsonWorker | None = None
    return_code = 1
    try:
        report["integrity"] = verify_frozen_inputs(repo_root)
        try:
            provenance = resolve_and_acquire_model(round2_root, model_dir)
        except Exception as exc:
            name = type(exc).__name__
            message = str(exc)
            lowered = message.lower()
            if name in {"GatedRepoError", "RepositoryNotFoundError"} or "gated" in lowered or "403" in lowered or "401" in lowered:
                report["prescreen_state"] = "BLOCKED_GEMMA_ACCESS"
                report["access_blocker"] = {"type": name, "message": message}
                report["next_step"] = (
                    "Accept the google/translategemma-4b-it Gemma terms in the same Hugging Face account, "
                    "ensure Hugging Face authentication is available, then rerun this same prescreen."
                )
                return_code = 0
                return return_code
            raise

        report["provenance"] = provenance
        report["candidate"]["resolved_revision"] = provenance["resolved_revision"]

        prescreen_data = load_json(
            repo_root / "tools" / "translation_quality" / "round2_rejection_prescreen.json"
        )
        cases = build_directional_cases(prescreen_data)

        worker = JsonWorker(
            [
                str(Path(args.candidate_python).resolve()),
                str(repo_root / "tools" / "translation_quality" / "round2_translategemma_worker.py"),
                "--model-dir",
                str(model_dir),
            ],
            repo_root,
            stderr_path,
        )
        preload = worker.read()
        report["preload"] = preload
        if not preload.get("ok"):
            report["prescreen_state"] = "REJECTED_RUNTIME"
            report["next_step"] = (
                "STOP. TranslateGemma LLM.int8 failed the target runtime/load gate; "
                "do not add another quantization/backend profile in this round."
            )
            return_code = 0
            return return_code

        smoke_cases = [
            {
                "case_id": "smoke.id_en",
                "direction": "id->en",
                "source": "Selamat pagi. Tolong simpan file ini di komputer lokal.",
            },
            {
                "case_id": "smoke.en_id",
                "direction": "en->id",
                "source": "Good morning. Please keep this file on the local computer.",
            },
        ]
        smoke_results: list[dict[str, Any]] = []
        for smoke in smoke_cases:
            source_language, target_language = smoke["direction"].split("->")
            response, wall_ms = worker.request(
                {
                    "command": "translate",
                    "source_language": source_language,
                    "target_language": target_language,
                    "text": smoke["source"],
                }
            )
            smoke_results.append({**smoke, "request_wall_ms": wall_ms, "response": response})
            if not response.get("ok"):
                report["smoke_results"] = smoke_results
                report["prescreen_state"] = "REJECTED_RUNTIME"
                report["next_step"] = "STOP. Official chat-template smoke translation did not complete."
                return_code = 0
                return return_code
        report["smoke_results"] = smoke_results

        results: list[dict[str, Any]] = []
        final_diagnostics: dict[str, Any] = hard_diagnostics(prescreen_data, results)
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
            report["semantic_completed_cases"] = len(results)
            print(f"[TranslateGemma] semantic {index}/{len(cases)}", flush=True)
            final_diagnostics = hard_diagnostics(prescreen_data, results)
            if final_diagnostics["automatic_reject"]:
                break

        report["semantic_results"] = results
        report["automatic_diagnostics"] = final_diagnostics
        if final_diagnostics["automatic_reject"]:
            report["prescreen_state"] = "REJECTED_AUTOMATIC"
            report["next_step"] = (
                "STOP. TranslateGemma hit a rejection-only hard diagnostic; do not run the remaining "
                "semantic cases, external sampling, full benchmark, or production migration."
            )
        elif len(results) == len(cases):
            write_review_pack(review_path, results)
            report["semantic_review_pack"] = str(review_path)
            report["prescreen_state"] = "AWAITING_MANUAL_SEMANTIC_REVIEW"
            report["next_step"] = (
                "STOP and review all 32 semantic outputs. Only zero CRITICAL errors may authorize "
                "a separate small external/performance proof."
            )
        else:
            raise RuntimeError("Semantic prescreen ended early without a hard rejection")
        return_code = 0
    except Exception as exc:
        report["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(limit=16),
        }
        report["next_step"] = "STOP and diagnose the harness/runtime failure; do not widen the candidate matrix."
        return_code = 1
    finally:
        if worker is not None:
            worker.close()
        report["finished_utc_unix"] = time.time()
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nRound 2 TranslateGemma report: {report_path}", flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
