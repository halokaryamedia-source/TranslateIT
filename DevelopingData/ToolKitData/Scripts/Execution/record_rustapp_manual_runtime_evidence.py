from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE_FILE = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_validation_evidence.json"

MANUAL_KEYS = [
    "microphone_capture_smoke_test",
    "asr_transcript_smoke_test",
    "translation_smoke_test",
    "tts_playback_smoke_test",
    "launcher_package_open_test",
]

BUILD_KEYS = [
    "rust_check_passed",
    "frontend_typecheck_passed",
    "frontend_build_passed",
    "tauri_build_passed",
    "packaging_validation_passed",
    "local_worker_stack_passed",
]


def load_evidence() -> dict:
    if EVIDENCE_FILE.exists():
        return json.loads(EVIDENCE_FILE.read_text(encoding="utf-8"))
    return {
        "schema": "translateit.rustapp.validation_evidence.v2",
        "status": "internal_validation_only",
        "local_worker_stack_passed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Record TranslateIT RustApp manual runtime evidence.")
    for key in MANUAL_KEYS:
        parser.add_argument(f"--{key.replace('_', '-')}", action="store_true")
    parser.add_argument("--allow-release-candidate", action="store_true")
    args = parser.parse_args()

    evidence = load_evidence()
    evidence["schema"] = "translateit.rustapp.validation_evidence.v2"
    manual = evidence.setdefault("manual_runtime_evidence", {})
    for key in MANUAL_KEYS:
        manual[key] = bool(getattr(args, key)) or bool(manual.get(key, False))

    all_build = all(bool(evidence.get(key, False)) for key in BUILD_KEYS)
    all_manual = all(bool(manual.get(key, False)) for key in MANUAL_KEYS)
    owner_allowed = all_build and all_manual

    evidence["manual_evidence_updated_at_utc"] = datetime.now(timezone.utc).isoformat()
    evidence["owner_validation_allowed"] = owner_allowed
    evidence["release_candidate_allowed"] = owner_allowed and bool(args.allow_release_candidate)
    evidence["note"] = (
        "Manual runtime evidence was updated. Owner validation is allowed only when build/package validation, local worker stack validation, and all manual runtime smoke tests pass."
    )

    EVIDENCE_FILE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print("PASS: recorded RustApp manual runtime evidence")
    print(EVIDENCE_FILE.relative_to(ROOT))
    print("owner_validation_allowed:", evidence["owner_validation_allowed"])
    print("release_candidate_allowed:", evidence["release_candidate_allowed"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
