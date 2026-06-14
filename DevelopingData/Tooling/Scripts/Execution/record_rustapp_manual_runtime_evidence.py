from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE_DIR = ROOT / "UserData" / "LogData" / "RustAppValidation"
EVIDENCE_FILE = EVIDENCE_DIR / "latest_validation_evidence.json"
WORKER_SMOKE_FILE = EVIDENCE_DIR / "latest_local_worker_smoke_evidence.json"
MANUAL_KEYS = ["microphone_capture_smoke_test", "asr_transcript_smoke_test", "translation_smoke_test", "tts_playback_smoke_test", "launcher_package_open_test"]
BUILD_KEYS = ["rust_check_passed", "frontend_typecheck_passed", "frontend_build_passed", "tauri_build_passed", "packaging_validation_passed", "local_worker_stack_passed"]


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_evidence() -> dict:
    return read_json(EVIDENCE_FILE) or {"schema": "translateit.rustapp.validation_evidence.v3", "status": "internal_validation_only", "local_worker_stack_passed": False, "owner_validation_allowed": False, "release_candidate_allowed": False}


def worker_smoke_summary() -> dict:
    smoke = read_json(WORKER_SMOKE_FILE)
    if not smoke:
        return {"loaded": False, "ok": False, "persistent_worker": False, "evidence_path": str(WORKER_SMOKE_FILE.relative_to(ROOT)).replace("\\", "/")}
    return {"loaded": True, "ok": bool(smoke.get("ok", False)), "schema": smoke.get("schema"), "generated_at_utc": smoke.get("generated_at_utc"), "mode": smoke.get("mode"), "persistent_worker": bool(smoke.get("persistent_worker", False)), "latency_summary": smoke.get("latency_summary", {}), "evidence_path": str(WORKER_SMOKE_FILE.relative_to(ROOT)).replace("\\", "/")}


def main() -> int:
    parser = argparse.ArgumentParser(description="Record TranslateIT RustApp manual runtime evidence.")
    for key in MANUAL_KEYS:
        parser.add_argument(f"--{key.replace('_', '-')}", action="store_true")
    parser.add_argument("--allow-release-candidate", action="store_true")
    args = parser.parse_args()

    evidence = load_evidence()
    evidence["schema"] = "translateit.rustapp.validation_evidence.v3"
    manual = evidence.setdefault("manual_runtime_evidence", {})
    for key in MANUAL_KEYS:
        manual[key] = bool(getattr(args, key)) or bool(manual.get(key, False))

    smoke_summary = worker_smoke_summary()
    evidence["local_worker_smoke_evidence"] = smoke_summary
    smoke_ok = bool(smoke_summary.get("loaded")) and bool(smoke_summary.get("ok")) and bool(smoke_summary.get("persistent_worker"))
    owner_allowed = all(bool(evidence.get(key, False)) for key in BUILD_KEYS) and all(bool(manual.get(key, False)) for key in MANUAL_KEYS) and smoke_ok
    evidence["manual_evidence_updated_at_utc"] = datetime.now(timezone.utc).isoformat()
    evidence["owner_validation_allowed"] = owner_allowed
    evidence["release_candidate_allowed"] = owner_allowed and bool(args.allow_release_candidate)
    evidence["note"] = "Manual runtime evidence was updated. Owner validation requires build/package validation, local worker stack validation, persistent worker smoke evidence, and all manual runtime smoke tests."
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print("PASS: recorded RustApp manual runtime evidence")
    print(EVIDENCE_FILE.relative_to(ROOT))
    print("persistent_worker_smoke_passed:", smoke_ok)
    print("owner_validation_allowed:", evidence["owner_validation_allowed"])
    print("release_candidate_allowed:", evidence["release_candidate_allowed"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
