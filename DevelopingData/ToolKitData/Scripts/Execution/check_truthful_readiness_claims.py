from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

CHECK_FILES = [
    ROOT / "TranslateIT.vbs",
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "README.md",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "record_rustapp_manual_runtime_evidence.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "summarize_translateit_readiness.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1",
    ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml",
]

REQUIRED_TRUTH_TERMS = {
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "README.md": [
        "not production-ready yet",
        "Owner validation is blocked",
        "Release-candidate status remains blocked",
    ],
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "README.md": [
        "does not claim production readiness",
        "Owner validation remains blocked",
        "Input and output files are constrained",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py": [
        "owner_validation_allowed",
        "release_candidate_allowed",
        "False",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "summarize_translateit_readiness.py": [
        "must not be treated as commercial-ready",
        "blockers",
        "release_ready",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1": [
        "Do not mark Ready",
        "manual runtime evidence",
        "Do not mark owner validation",
    ],
}

FORBIDDEN_EXACT_TERMS = [
    "write_rustapp_validation_evidence.py true true true true true true",
    "write_rustapp_validation_evidence.py True True True True True True",
    "owner_validation_allowed\": true",
    "release_candidate_allowed\": true",
    "production_ready\": true",
]


def main() -> int:
    missing_files = [str(path.relative_to(ROOT)) for path in CHECK_FILES if not path.exists()]
    if missing_files:
        print("TRUTHFUL_READINESS_FILES_MISSING")
        for item in missing_files:
            print("-", item)
        return 1

    violations: list[str] = []
    for path in CHECK_FILES:
        text = path.read_text(encoding="utf-8")
        for term in FORBIDDEN_EXACT_TERMS:
            if term in text:
                violations.append(f"{path.relative_to(ROOT)} contains forbidden exact term: {term}")

    for path, terms in REQUIRED_TRUTH_TERMS.items():
        text = path.read_text(encoding="utf-8")
        for term in terms:
            if term not in text:
                violations.append(f"{path.relative_to(ROOT)} missing truth term: {term}")

    if violations:
        print("TRUTHFUL_READINESS_CLAIMS_INCOMPLETE")
        for item in violations:
            print("-", item)
        return 1

    print("PASS: Truthful readiness wording, blocked owner/release claims, no hardcoded pass evidence, and local-only validation disclaimers are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
