from __future__ import annotations

import argparse
import fnmatch
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def find_repository_root() -> Path:
    start = Path(__file__).resolve()
    for candidate in [start.parent, *start.parents]:
        if all((candidate / name).is_dir() for name in ("EngineData", "DevelopingData", "UserData")):
            return candidate
    raise RuntimeError("repository_root_not_found")


ROOT = find_repository_root()
WORKER_ROOT = ROOT / "EngineData" / "Backend" / "LocalWorker" / "WorkerRuntime"
MANIFEST_PATH = WORKER_ROOT / "model_manifest.json"
REPORT_PATH = ROOT / "UserData" / "CacheData" / "validation" / "latest_model_setup_preflight.json"

MARKERS: dict[str, tuple[tuple[str, ...], ...]] = {
    "faster-whisper-large-v3-turbo": (("model.bin",), ("config.json",), ("tokenizer.json", "tokenizer.model", "vocabulary.json")),
    "faster-whisper-medium": (("model.bin",), ("config.json",), ("tokenizer.json", "tokenizer.model", "vocabulary.json")),
    "marianmt-id-en": (("config.json",), ("source.spm", "tokenizer.json", "spiece.model"), ("target.spm", "tokenizer.json", "spiece.model"), ("*.safetensors", "pytorch_model*.bin")),
    "nllb-200-distilled-600M": (("config.json",), ("tokenizer_config.json",), ("sentencepiece.bpe.model", "tokenizer.json", "spiece.model"), ("*.safetensors", "pytorch_model*.bin")),
}

FORBIDDEN_PATH_PARTS = (
    "EngineData/TranscriptEngine",
    "EngineData/TranslateEngine",
    "EngineData/VoiceEngine",
    "EngineData/RuntimeAssets",
    "DevelopingData/ToolKitData",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def match_any(root: Path, alternatives: tuple[str, ...]) -> list[str]:
    if not root.is_dir():
        return []
    found: list[str] = []
    for candidate in root.rglob("*"):
        if not candidate.is_file():
            continue
        relative_name = candidate.relative_to(root).as_posix()
        base_name = candidate.name
        if any(fnmatch.fnmatch(relative_name, pattern) or fnmatch.fnmatch(base_name, pattern) for pattern in alternatives):
            found.append(relative_name)
    return sorted(set(found))


def marker_status(model_id: str, expected_path: str) -> dict[str, Any]:
    target = ROOT / expected_path
    groups = MARKERS.get(model_id, tuple())
    details: list[dict[str, Any]] = []
    ready = target.is_dir() and bool(groups)
    for alternatives in groups:
        found = match_any(target, alternatives)
        ok = bool(found)
        ready = ready and ok
        details.append({"alternatives": list(alternatives), "found": found, "ok": ok})
    if not groups and target.is_dir():
        ready = any(target.iterdir())
    return {
        "model_id": model_id,
        "expected_path": expected_path,
        "path_exists": target.is_dir(),
        "ready": ready,
        "groups": details,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TranslateIT approved RuntimeAssets model preflight.")
    parser.add_argument("--model", action="append", default=[], help="Model id or stage to check. Can be passed multiple times.")
    parser.add_argument("--only", action="append", default=[], help="Backward-compatible alias for --model.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    selected = set(args.model + args.only)
    generated_at = utc_now()

    if not MANIFEST_PATH.is_file():
        report = {
            "ok": False,
            "status": "BLOCKED",
            "generated_at": generated_at,
            "manifest": rel(MANIFEST_PATH),
            "blockers": ["model_manifest_missing"],
        }
        write_json(REPORT_PATH, report)
        print(json.dumps(report, indent=2))
        return 2

    manifest = read_json(MANIFEST_PATH)
    models = []
    forbidden_entries = []
    for entry in manifest.get("models", []):
        model_id = str(entry.get("model_id", ""))
        stage = str(entry.get("stage", ""))
        expected_path = str(entry.get("expected_path", ""))
        if selected and model_id not in selected and stage not in selected:
            continue
        if any(expected_path.startswith(part) for part in FORBIDDEN_PATH_PARTS):
            forbidden_entries.append({"model_id": model_id, "expected_path": expected_path})
            continue
        if entry.get("required") or expected_path:
            models.append(marker_status(model_id, expected_path))

    blockers = []
    blockers.extend(f"forbidden_model_route:{item['model_id']}" for item in forbidden_entries)
    blockers.extend(f"missing_required_model:{item['model_id']}" for item in models if not item.get("ready"))
    if not models and not forbidden_entries:
        blockers.append("no_models_selected")

    report = {
        "ok": not blockers,
        "status": "PASS" if not blockers else "BLOCKED",
        "generated_at": generated_at,
        "manifest": rel(MANIFEST_PATH),
        "model_root_strategy": "EngineData/Backend/RuntimeAssets only",
        "models": models,
        "forbidden_entries": forbidden_entries,
        "blockers": blockers,
        "note": "This worker-owned helper only verifies approved RuntimeAssets paths. It does not write into retired model roots.",
    }
    write_json(REPORT_PATH, report)
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
