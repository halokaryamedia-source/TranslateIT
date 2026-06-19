from __future__ import annotations

import argparse
import inspect
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def find_repository_root() -> Path:
    start = Path(__file__).resolve()
    for candidate in [start.parent, *start.parents]:
        if all((candidate / name).is_dir() for name in ("EngineData", "DevelopingData", "UserData")):
            return candidate
    raise RuntimeError("repository_root_not_found")


REPOSITORY_ROOT = find_repository_root()
APP_ROOT = REPOSITORY_ROOT / "EngineData" / "LauncherApp" / "RustApp"
CACHE_ROOT = REPOSITORY_ROOT / "DevelopingData" / "ToolKitData" / "ModelCache"
HF_HOME = CACHE_ROOT / "HuggingFaceHome"
REPORT_PATH = REPOSITORY_ROOT / "UserData" / "CacheData" / "validation" / "MODEL_PREPARATION_REPORT.json"

os.environ["HF_HOME"] = str(HF_HOME)
os.environ["TRANSFORMERS_CACHE"] = str(HF_HOME)


MODELS: tuple[dict[str, Any], ...] = (
    {
        "key": "asr_primary",
        "engine": "ASR Primary",
        "runtime_id": "large-v3-turbo",
        "preferred_repo": "Systran/faster-whisper-large-v3-turbo",
        "repo": "dropbox-dash/faster-whisper-large-v3-turbo",
        "target": REPOSITORY_ROOT
        / "EngineData"
        / "TranscriptEngine"
        / "ModelData"
        / "faster-whisper-large-v3-turbo",
        "required": (
            ("model.bin",),
            ("config.json",),
            ("tokenizer.json", "tokenizer.model", "vocabulary.json"),
        ),
    },
    {
        "key": "asr_backup",
        "engine": "ASR Backup",
        "runtime_id": "medium",
        "repo": "Systran/faster-whisper-medium",
        "target": REPOSITORY_ROOT
        / "EngineData"
        / "TranscriptEngine"
        / "ModelData"
        / "faster-whisper-medium",
        "required": (
            ("model.bin",),
            ("config.json",),
            ("tokenizer.json", "tokenizer.model", "vocabulary.json"),
        ),
    },
    {
        "key": "translation_primary",
        "engine": "Translation Primary",
        "runtime_id": "local-nllb-distilled",
        "repo": "facebook/nllb-200-distilled-600M",
        "target": REPOSITORY_ROOT
        / "EngineData"
        / "TranslateEngine"
        / "ModelData"
        / "nllb-200-distilled-600M",
        "required": (
            ("config.json",),
            ("tokenizer_config.json",),
            ("sentencepiece.bpe.model", "tokenizer.json", "spiece.model"),
            ("*.safetensors", "pytorch_model*.bin"),
        ),
    },
    {
        "key": "translation_fallback",
        "engine": "Translation Fallback",
        "runtime_id": "marianmt-id-en",
        "repo": "Helsinki-NLP/opus-mt-id-en",
        "target": REPOSITORY_ROOT
        / "EngineData"
        / "TranslateEngine"
        / "ModelData"
        / "marianmt-id-en",
        "required": (
            ("config.json",),
            ("source.spm", "tokenizer.json", "spiece.model"),
            ("target.spm", "tokenizer.json", "spiece.model"),
            ("*.safetensors", "pytorch_model*.bin"),
        ),
    },
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def relative(path: Path) -> str:
    return path.resolve().relative_to(REPOSITORY_ROOT).as_posix()


def matching_files(root: Path, patterns: tuple[str, ...]) -> list[str]:
    matches: list[str] = []
    for pattern in patterns:
        for path in root.glob(pattern):
            if path.is_file():
                matches.append(path.relative_to(root).as_posix())
    return sorted(set(matches))


def marker_status(model: dict[str, Any]) -> dict[str, Any]:
    target: Path = model["target"]
    groups = []
    complete = target.is_dir()
    for alternatives in model["required"]:
        matches = matching_files(target, alternatives) if target.is_dir() else []
        group_ok = bool(matches)
        complete = complete and group_ok
        groups.append(
            {
                "alternatives": list(alternatives),
                "found": matches,
                "ok": group_ok,
            }
        )
    return {"complete": complete, "groups": groups}


def directory_size(path: Path) -> int:
    if not path.is_dir():
        return 0
    total = 0
    for item in path.rglob("*"):
        if item.is_file():
            try:
                total += item.stat().st_size
            except OSError:
                continue
    return total


def write_report(results: list[dict[str, Any]], started_at: str) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "schema_version": 1,
        "started_at": started_at,
        "generated_at": utc_now(),
        "repository_root": str(REPOSITORY_ROOT),
        "model_root_strategy": "project-local",
        "cache": {
            "model_cache": relative(CACHE_ROOT),
            "hf_home": relative(HF_HOME),
        },
        "models": results,
        "summary": {
            "complete": sum(1 for result in results if result["ready"]),
            "failed": sum(1 for result in results if result["result"] == "FAIL"),
            "total": len(results),
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")


def download_model(snapshot_download: Any, model: dict[str, Any], max_workers: int) -> dict[str, Any]:
    target: Path = model["target"]
    target.mkdir(parents=True, exist_ok=True)
    before = marker_status(model)
    result: dict[str, Any] = {
        "key": model["key"],
        "engine": model["engine"],
        "runtime_id": model["runtime_id"],
        "repo": model["repo"],
        "preferred_repo": model.get("preferred_repo"),
        "local_path": relative(target),
        "started_at": utc_now(),
    }

    if before["complete"]:
        result.update(
            {
                "result": "PASS",
                "status": "skipped_complete",
                "ready": True,
                "markers": before,
                "size_bytes": directory_size(target),
                "notes": "Existing model markers are complete; download was skipped.",
                "finished_at": utc_now(),
            }
        )
        return result

    kwargs: dict[str, Any] = {
        "repo_id": model.get("preferred_repo") or model["repo"],
        "local_dir": str(target),
        "cache_dir": str(HF_HOME),
        "max_workers": max_workers,
    }
    supported = inspect.signature(snapshot_download).parameters
    if "local_dir_use_symlinks" in supported:
        kwargs["local_dir_use_symlinks"] = False
    if "resume_download" in supported:
        kwargs["resume_download"] = True

    try:
        snapshot_download(**kwargs)
        after = marker_status(model)
        ready = bool(after["complete"])
        result.update(
            {
                "result": "PASS" if ready else "FAIL",
                "status": "downloaded" if ready else "download_incomplete",
                "ready": ready,
                "markers": after,
                "size_bytes": directory_size(target),
                "notes": (
                    "Snapshot download completed and required markers are present."
                    if ready
                    else "Snapshot download returned, but one or more required marker groups are missing."
                ),
            }
        )
    except Exception as exc:
        after = marker_status(model)
        result.update(
            {
                "result": "FAIL",
                "status": "download_failed",
                "ready": bool(after["complete"]),
                "markers": after,
                "size_bytes": directory_size(target),
                "error_type": type(exc).__name__,
                "error": str(exc),
                "notes": "Partial files were retained. Re-run this script to resume the snapshot download.",
            }
        )
    result["finished_at"] = utc_now()
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download TranslateIT local runtime models.")
    parser.add_argument(
        "--only",
        action="append",
        choices=[model["key"] for model in MODELS],
        help="Download only the selected model key. May be passed more than once.",
    )
    parser.add_argument("--max-workers", type=int, default=4)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    started_at = utc_now()
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    HF_HOME.mkdir(parents=True, exist_ok=True)
    selected = [model for model in MODELS if not args.only or model["key"] in args.only]
    results: list[dict[str, Any]] = []

    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:
        for model in selected:
            results.append(
                {
                    "key": model["key"],
                    "engine": model["engine"],
                    "runtime_id": model["runtime_id"],
                    "repo": model["repo"],
                    "preferred_repo": model.get("preferred_repo"),
                    "local_path": relative(model["target"]),
                    "result": "FAIL",
                    "status": "dependency_missing",
                    "ready": False,
                    "size_bytes": directory_size(model["target"]),
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                    "notes": "Install huggingface_hub, then re-run this script.",
                }
            )
        write_report(results, started_at)
        return 1

    for model in selected:
        print(f"[prepare] {model['engine']}: {model['repo']}", flush=True)
        result = download_model(snapshot_download, model, max(1, args.max_workers))
        results.append(result)
        print(
            f"[{result['result']}] {model['key']} status={result['status']} "
            f"size_bytes={result['size_bytes']}",
            flush=True,
        )
        write_report(results, started_at)

    failed = [result for result in results if not result["ready"]]
    print(f"[report] {REPORT_PATH}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
