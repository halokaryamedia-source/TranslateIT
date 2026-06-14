from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
VALIDATION = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_validation_evidence.json"
SMOKE = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_local_worker_smoke_evidence.json"
SUMMARY = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_readiness_summary.json"

CHECKS = [
    ("rust_check_passed", 8),
    ("frontend_typecheck_passed", 8),
    ("frontend_build_passed", 8),
    ("tauri_build_passed", 10),
    ("packaging_validation_passed", 10),
    ("local_worker_stack_passed", 12),
]

MANUAL_CHECKS = [
    ("microphone_capture_smoke_test", 8),
    ("asr_transcript_smoke_test", 10),
    ("translation_smoke_test", 8),
    ("tts_playback_smoke_test", 8),
    ("launcher_package_open_test", 8),
]


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    validation = read_json(VALIDATION)
    smoke = read_json(SMOKE)
    score = 0
    blockers: list[str] = []

    for key, weight in CHECKS:
        if bool(validation.get(key, False)):
            score += weight
        else:
            blockers.append(key)

    smoke_ok = bool(smoke.get("ok", False)) and bool(smoke.get("persistent_worker", False))
    if smoke_ok:
        score += 10
    else:
        blockers.append("persistent_local_worker_smoke_evidence")

    manual = validation.get("manual_runtime_evidence", {}) if isinstance(validation.get("manual_runtime_evidence"), dict) else {}
    for key, weight in MANUAL_CHECKS:
        if bool(manual.get(key, False)):
            score += weight
        else:
            blockers.append(key)

    score = min(score, 100)
    release_ready = bool(validation.get("owner_validation_allowed", False)) and bool(validation.get("release_candidate_allowed", False))
    payload = {
        "schema": "translateit.readiness_summary.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "commercial_readiness_percent": score,
        "release_ready": release_ready,
        "validation_evidence_loaded": bool(validation),
        "worker_smoke_loaded": bool(smoke),
        "blockers": blockers,
        "note": "This score is evidence-based and must not be treated as commercial-ready until blockers are empty and owner/release gates are explicitly allowed.",
    }
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0 if release_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
