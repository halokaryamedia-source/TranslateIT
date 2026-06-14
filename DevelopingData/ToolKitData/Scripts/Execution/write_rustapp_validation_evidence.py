from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE_DIR = ROOT / "UserData" / "LogData" / "RustAppValidation"
EVIDENCE_FILE = EVIDENCE_DIR / "latest_validation_evidence.json"
WORKER_SMOKE_EVIDENCE = EVIDENCE_DIR / "latest_local_worker_smoke_evidence.json"

MANUAL_DEFAULTS = {
    "microphone_capture_smoke_test": False,
    "asr_transcript_smoke_test": False,
    "translation_smoke_test": False,
    "tts_playback_smoke_test": False,
    "launcher_package_open_test": False,
}


def bool_arg(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "pass", "passed"}


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def preserved_manual_evidence() -> dict:
    previous = read_json(EVIDENCE_FILE).get("manual_runtime_evidence", {})
    manual = dict(MANUAL_DEFAULTS)
    for key in manual:
        manual[key] = bool(previous.get(key, False))
    return manual


def worker_smoke_summary() -> dict:
    smoke = read_json(WORKER_SMOKE_EVIDENCE)
    if not smoke:
        return {
            "loaded": False,
            "ok": False,
            "evidence_path": str(WORKER_SMOKE_EVIDENCE.relative_to(ROOT)).replace("\\", "/"),
        }
    return {
        "loaded": True,
        "ok": bool(smoke.get("ok", False)),
        "schema": smoke.get("schema"),
        "generated_at_utc": smoke.get("generated_at_utc"),
        "mode": smoke.get("mode"),
        "persistent_worker": bool(smoke.get("persistent_worker", False)),
        "latency_summary": smoke.get("latency_summary", {}),
        "evidence_path": str(WORKER_SMOKE_EVIDENCE.relative_to(ROOT)).replace("\\", "/"),
    }


def main() -> int:
    if len(sys.argv) < 6:
        print("usage: write_rustapp_validation_evidence.py <rust_check> <typecheck> <frontend_build> <tauri_build> <packaging> [local_worker_stack]")
        return 2

    rust_check = bool_arg(sys.argv[1])
    typecheck = bool_arg(sys.argv[2])
    frontend_build = bool_arg(sys.argv[3])
    tauri_build = bool_arg(sys.argv[4])
    packaging = bool_arg(sys.argv[5])
    local_worker_stack = bool_arg(sys.argv[6]) if len(sys.argv) >= 7 else False
    manual = preserved_manual_evidence()
    worker_smoke = worker_smoke_summary()

    evidence = {
        "schema": "translateit.rustapp.validation_evidence.v3",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "branch_context": "ChatGPT-ConvertEngine",
        "status": "internal_validation_only",
        "rust_check_passed": rust_check,
        "frontend_typecheck_passed": typecheck,
        "frontend_build_passed": frontend_build,
        "tauri_build_passed": tauri_build,
        "packaging_validation_passed": packaging,
        "local_worker_stack_passed": local_worker_stack,
        "local_worker_smoke_evidence": worker_smoke,
        "manual_runtime_evidence": manual,
        "owner_validation_allowed": False,
        "release_candidate_allowed": False,
        "note": "Evidence file is generated for internal validation tracking only. Owner validation remains blocked until local worker stack, persistent runtime smoke tests, manual runtime checks, and package checks pass.",
    }

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print("PASS: wrote RustApp validation evidence")
    print(EVIDENCE_FILE.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
