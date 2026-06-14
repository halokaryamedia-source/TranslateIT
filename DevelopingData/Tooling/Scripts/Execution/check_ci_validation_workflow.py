from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKFLOW = ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml"

REQUIRED_TERMS = [
    "workflow_dispatch",
    "windows-latest",
    "actions/checkout@v4",
    "actions/setup-node@v4",
    "dtolnay/rust-toolchain@stable",
    "run_rustapp_final_validation.ps1",
    "latest_validation_evidence.json",
    "latest_readiness_summary.json",
    "latest_local_worker_smoke_evidence.json",
    "launcher_latest.log",
    "if-no-files-found: warn",
]

FORBIDDEN_TERMS = [
    "write_rustapp_validation_evidence.py true true true true true true",
    "write_rustapp_validation_evidence.py True True True True True True",
]


def main() -> int:
    if not WORKFLOW.exists():
        print("CI_VALIDATION_WORKFLOW_MISSING")
        print(WORKFLOW.relative_to(ROOT))
        return 1
    text = WORKFLOW.read_text(encoding="utf-8")
    missing = [term for term in REQUIRED_TERMS if term not in text]
    forbidden = [term for term in FORBIDDEN_TERMS if term in text]
    if missing or forbidden:
        print("CI_VALIDATION_WORKFLOW_INCOMPLETE")
        for term in missing:
            print("- missing", term)
        for term in forbidden:
            print("- forbidden", term)
        return 1
    print("PASS: CI validation workflow runs the truthful validation runner and uploads evidence, readiness, smoke, and launcher logs without hardcoded pass evidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
