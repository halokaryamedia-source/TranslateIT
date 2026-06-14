from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
ENGINE_SRC = RUST_APP / "src-tauri" / "src" / "engine"
INTERNAL_GATE = ENGINE_SRC / "adapters" / "internal_validation_gate_logic.rs"
MAIN_RS = RUST_APP / "src-tauri" / "src" / "main.rs"
EVIDENCE_WRITER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py"
VALIDATION_RUNNER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1"

REQUIRED_FILES = [
    INTERNAL_GATE,
    MAIN_RS,
    EVIDENCE_WRITER,
    VALIDATION_RUNNER,
]

REQUIRED_TERMS = {
    INTERNAL_GATE: [
        "ValidationEvidenceFile",
        "read_validation_evidence",
        "validation_evidence_loaded",
        "validation_evidence_path",
        "ready_for_owner_validation",
    ],
    MAIN_RS: [
        "analyze_internal_validation",
        "InternalValidationGateReport",
    ],
    EVIDENCE_WRITER: [
        "latest_validation_evidence.json",
        "owner_validation_allowed",
        "release_candidate_allowed",
        "manual_runtime_evidence",
    ],
    VALIDATION_RUNNER: [
        "write_rustapp_validation_evidence.py",
        "$RustCheckPassed",
        "$TypecheckPassed",
        "$FrontendBuildPassed",
        "$PackagingPassed",
    ],
}


def main() -> int:
    missing_files = [str(path.relative_to(ROOT)) for path in REQUIRED_FILES if not path.exists()]
    if missing_files:
        print("RUST_VALIDATION_EVIDENCE_BOUNDARY_MISSING")
        for item in missing_files:
            print("-", item)
        return 1

    missing_terms: list[str] = []
    for path, terms in REQUIRED_TERMS.items():
        text = path.read_text(encoding="utf-8")
        for term in terms:
            if term not in text:
                missing_terms.append(f"{path.relative_to(ROOT)} missing term: {term}")

    if missing_terms:
        print("RUST_VALIDATION_EVIDENCE_BOUNDARY_INCOMPLETE")
        for item in missing_terms:
            print("-", item)
        return 1

    print("PASS: Rust validation evidence boundary is present and wired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
