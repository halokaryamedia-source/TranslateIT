"""One-shot VoiceLab build child owned by the Rust desktop runtime.

This process is intentionally not a server and not a second daily AI worker. It
validates the frozen VoiceLab dataset, delegates the pinned GPT-SoVITS V2ProPlus
stages, and produces one reviewable candidate package.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import Any

from voice_lab_gpt_sovits import (
    ENGINE,
    ENGINE_REVISION,
    VoiceLabProviderError,
    build_candidate,
)

SCHEMA_VERSION = 1


class BuildError(RuntimeError):
    pass


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise BuildError(f"invalid_json:{path.name}:{type(exc).__name__}") from exc
    if not isinstance(value, dict):
        raise BuildError(f"invalid_json_object:{path.name}")
    return value


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def write_status(path: Path, phase: str, message: str) -> None:
    atomic_json(
        path,
        {
            "schema_version": SCHEMA_VERSION,
            "engine": ENGINE,
            "engine_revision": ENGINE_REVISION,
            "phase": phase,
            "message": message,
        },
    )


def validate_manifest(dataset_dir: Path) -> dict[str, Any]:
    manifest = read_json(dataset_dir / "dataset.json")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise BuildError("dataset_schema_mismatch")
    if manifest.get("authorized_voice_confirmed") is not True:
        raise BuildError("authorization_required")
    takes = manifest.get("takes")
    held_out = manifest.get("held_out_lines")
    if not isinstance(takes, list) or len(takes) < 2:
        raise BuildError("insufficient_training_takes")
    if not isinstance(held_out, list) or not held_out:
        raise BuildError("held_out_lines_missing")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--dataset-dir", required=True)
    parser.add_argument("--candidate-dir", required=True)
    parser.add_argument("--evaluation-dir", required=True)
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--status-path", required=True)
    args = parser.parse_args()

    status_path = Path(args.status_path).resolve()
    try:
        dataset_dir = Path(args.dataset_dir).resolve()
        manifest = validate_manifest(dataset_dir)
        write_status(status_path, "preparing", "Preparing VoiceLab training data.")
        build_candidate(
            source_root=Path(args.source_root).resolve(),
            dataset_dir=dataset_dir,
            candidate_dir=Path(args.candidate_dir).resolve(),
            evaluation_dir=Path(args.evaluation_dir).resolve(),
            work_dir=Path(args.work_dir).resolve(),
            manifest=manifest,
            status_writer=lambda phase, message: write_status(status_path, phase, message),
        )
        write_status(status_path, "ready_for_review", "Voice Actor samples are ready for review.")
        return 0
    except (BuildError, VoiceLabProviderError) as exc:
        write_status(status_path, "failed", str(exc))
        print(f"voice_lab_build_failed:{exc}", file=os.sys.stderr)
        return 2
    except Exception as exc:
        write_status(status_path, "failed", f"unexpected:{type(exc).__name__}")
        print(f"voice_lab_build_failed:unexpected:{type(exc).__name__}", file=os.sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
