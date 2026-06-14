from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
VALIDATION = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_validation_evidence.json"
SMOKE = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_local_worker_smoke_evidence.json"
SUMMARY = ROOT / "UserData" / "LogData" / "RustAppValidation" / "latest_readiness_summary.json"

BUILD_CHECKS = ["rust_check_passed", "frontend_typecheck_passed", "frontend_build_passed", "tauri_build_passed", "packaging_validation_passed", "local_worker_stack_passed"]
MANUAL_CHECKS = ["microphone_capture_smoke_test", "asr_transcript_smoke_test", "translation_smoke_test", "tts_playback_smoke_test", "launcher_package_open_test"]


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
    blockers: list[str] = []
    score = 0

    for key in BUILD_CHECKS:
        if validation.get(key):
            score += 8
        else:
            blockers.append(key)

    if smoke.get("ok") and smoke.get("persistent_worker"):
        score += 10
    else:
        blockers.append("persistent_local_worker_smoke_evidence")

    manual = validation.get("manual_runtime_evidence", {}) if isinstance(validation.get("manual_runtime_evidence"), dict) else {}
    for key in MANUAL_CHECKS:
        if manual.get(key):
            score += 8
        else:
            blockers.append(key)

    release_ready = bool(validation.get("owner_validation_allowed")) and bool(validation.get("release_candidate_allowed"))
    payload = {
        "schema": "translateit.readiness_summary.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "commercial_readiness_percent": min(score, 100),
        "release_ready": release_ready,
        "validation_evidence_loaded": bool(validation),
        "worker_smoke_loaded": bool(smoke),
        "blockers": blockers,
        "note": "Evidence-based summary only; not commercial-ready until blockers are empty and owner/release gates are explicitly allowed.",
    }
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0 if release_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
