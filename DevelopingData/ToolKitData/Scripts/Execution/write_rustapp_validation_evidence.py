from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE_DIR = ROOT / "UserData" / "LogData" / "RustAppValidation"
EVIDENCE_FILE = EVIDENCE_DIR / "latest_validation_evidence.json"


def bool_arg(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "pass", "passed"}


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

    evidence = {
        "schema": "translateit.rustapp.validation_evidence.v2",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "branch_context": "ChatGPT-ConvertEngine",
        "status": "internal_validation_only",
        "rust_check_passed": rust_check,
        "frontend_typecheck_passed": typecheck,
        "frontend_build_passed": frontend_build,
        "tauri_build_passed": tauri_build,
        "packaging_validation_passed": packaging,
        "local_worker_stack_passed": local_worker_stack,
        "manual_runtime_evidence": {
            "microphone_capture_smoke_test": False,
            "asr_transcript_smoke_test": False,
            "translation_smoke_test": False,
            "tts_playback_smoke_test": False,
            "launcher_package_open_test": False,
        },
        "owner_validation_allowed": False,
        "release_candidate_allowed": False,
        "note": "Evidence file is generated for internal validation tracking only. Owner validation remains blocked until local worker stack, runtime smoke tests, and package checks pass.",
    }

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print("PASS: wrote RustApp validation evidence")
    print(EVIDENCE_FILE.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
