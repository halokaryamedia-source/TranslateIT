from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
ENGINE_SRC = RUST_APP / "src-tauri" / "src" / "engine"
INTERNAL_GATE = ENGINE_SRC / "adapters" / "internal_validation_gate_logic.rs"
MAIN_RS = RUST_APP / "src-tauri" / "src" / "main.rs"
EVIDENCE_WRITER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py"
MANUAL_EVIDENCE_RECORDER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "record_rustapp_manual_runtime_evidence.py"
VALIDATION_RUNNER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1"
LOCAL_WORKER_STACK_CHECK = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_local_realtime_worker_stack.py"

REQUIRED_FILES = [
    INTERNAL_GATE,
    MAIN_RS,
    EVIDENCE_WRITER,
    MANUAL_EVIDENCE_RECORDER,
    VALIDATION_RUNNER,
    LOCAL_WORKER_STACK_CHECK,
]

REQUIRED_TERMS = {
    INTERNAL_GATE: [
        "ValidationEvidenceFile",
        "ManualRuntimeEvidence",
        "local_worker_stack_passed",
        "LocalWorkerManifestReport",
        "read_validation_evidence",
        "manual_evidence_updated_at_utc",
        "ready_for_owner_validation",
        "ready_for_release_candidate",
    ],
    MAIN_RS: [
        "analyze_internal_validation",
        "InternalValidationGateReport",
    ],
    EVIDENCE_WRITER: [
        "latest_validation_evidence.json",
        "local_worker_stack_passed",
        "owner_validation_allowed",
        "release_candidate_allowed",
        "manual_runtime_evidence",
    ],
    MANUAL_EVIDENCE_RECORDER: [
        "microphone_capture_smoke_test",
        "asr_transcript_smoke_test",
        "translation_smoke_test",
        "tts_playback_smoke_test",
        "launcher_package_open_test",
        "owner_validation_allowed",
    ],
    VALIDATION_RUNNER: [
        "write_rustapp_validation_evidence.py",
        "check_local_realtime_worker_stack.py",
        "$LocalWorkerStackPassed",
        "$RustCheckPassed",
        "$TypecheckPassed",
        "$FrontendBuildPassed",
        "$PackagingPassed",
    ],
    LOCAL_WORKER_STACK_CHECK: [
        "realtime_local_worker.py",
        "requirements-realtime.txt",
        "realtime_stack_manifest.json",
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

    print("PASS: Rust validation evidence boundary, local worker stack gate, and manual runtime evidence recorder are present and wired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
