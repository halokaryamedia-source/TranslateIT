from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
ENGINE_SRC = RUST_APP / "src-tauri" / "src" / "engine"
INTERNAL_GATE = ENGINE_SRC / "adapters" / "internal_validation_gate_logic.rs"
MAIN_RS = RUST_APP / "src-tauri" / "src" / "main.rs"
PACKAGE_JSON = RUST_APP / "package.json"
EVIDENCE_WRITER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py"
MANUAL_EVIDENCE_RECORDER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "record_rustapp_manual_runtime_evidence.py"
VALIDATION_RUNNER = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1"
LOCAL_WORKER_STACK_CHECK = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_local_realtime_worker_stack.py"
LOCAL_WORKER_SMOKE = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_local_realtime_worker_smoke_tests.py"
READINESS_SUMMARY = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "summarize_translateit_readiness.py"
CI_WORKFLOW_CHECK = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_ci_validation_workflow.py"
LOCAL_RELEASE_BUNDLE_CHECK = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_translateit_local_release_bundle.py"
TRUTHFUL_READINESS_CHECK = ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "check_truthful_readiness_claims.py"
CI_WORKFLOW = ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml"

REQUIRED_FILES = [
    INTERNAL_GATE,
    MAIN_RS,
    PACKAGE_JSON,
    EVIDENCE_WRITER,
    MANUAL_EVIDENCE_RECORDER,
    VALIDATION_RUNNER,
    LOCAL_WORKER_STACK_CHECK,
    LOCAL_WORKER_SMOKE,
    READINESS_SUMMARY,
    CI_WORKFLOW_CHECK,
    LOCAL_RELEASE_BUNDLE_CHECK,
    TRUTHFUL_READINESS_CHECK,
    CI_WORKFLOW,
]

REQUIRED_TERMS = {
    INTERNAL_GATE: [
        "ValidationEvidenceFile",
        "ManualRuntimeEvidence",
        "LocalWorkerSmokeEvidenceSummary",
        "persistent_worker_smoke_passed",
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
    PACKAGE_JSON: [
        "record:manual-evidence",
        "status:readiness",
        "validate:bundle",
        "validate:full",
        "check_translateit_local_release_bundle.py",
        "summarize_translateit_readiness.py",
    ],
    EVIDENCE_WRITER: [
        "latest_validation_evidence.json",
        "local_worker_stack_passed",
        "local_worker_smoke_evidence",
        "latest_local_worker_smoke_evidence.json",
        "manual_runtime_evidence",
        "owner_validation_allowed",
        "release_candidate_allowed",
    ],
    MANUAL_EVIDENCE_RECORDER: [
        "microphone_capture_smoke_test",
        "asr_transcript_smoke_test",
        "translation_smoke_test",
        "tts_playback_smoke_test",
        "launcher_package_open_test",
        "local_worker_smoke_evidence",
        "latest_local_worker_smoke_evidence.json",
        "persistent_worker_smoke_passed",
        "worker_smoke_passed",
        "owner_validation_allowed",
    ],
    VALIDATION_RUNNER: [
        "write_rustapp_validation_evidence.py",
        "summarize_translateit_readiness.py",
        "check_truthful_readiness_claims.py",
        "Truthful readiness claims",
        "check_ci_validation_workflow.py",
        "check_translateit_local_release_bundle.py",
        "Local release bundle contract",
        "CI validation workflow contract",
        "Invoke-ReadinessSummary",
        "check_local_realtime_worker_stack.py",
        "check_frontend_runtime_contract.py",
        "check_launcher_contract.py",
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
        "PersistentWorker",
        "threaded_non_blocking_stdout_queue",
        "latency_summary",
        "resolve_worker_path",
        "cuda_fallback",
    ],
    LOCAL_WORKER_SMOKE: [
        "PersistentWorker",
        "stream_reader",
        "queue.Queue",
        "persistent_worker",
        "threaded_non_blocking_stdout_queue",
        "latency_summary",
        "latest_local_worker_smoke_evidence.json",
    ],
    READINESS_SUMMARY: [
        "commercial_readiness_percent",
        "latest_readiness_summary.json",
        "persistent_local_worker_smoke_evidence",
        "release_ready",
    ],
    CI_WORKFLOW_CHECK: [
        "check_ci_validation_workflow.py",
        "FORBIDDEN_TERMS",
        "latest_readiness_summary.json",
        "latest_local_worker_smoke_evidence.json",
    ],
    LOCAL_RELEASE_BUNDLE_CHECK: [
        "LOCAL_RELEASE_BUNDLE_FILES_MISSING",
        "LOCAL_RELEASE_BUNDLE_CONTRACT_INCOMPLETE",
        "check_truthful_readiness_claims.py",
        "Workers",
        "README.md",
        "resolve_worker_path",
        "summarize_translateit_readiness.py",
    ],
    TRUTHFUL_READINESS_CHECK: [
        "TRUTHFUL_READINESS_CLAIMS_INCOMPLETE",
        "FORBIDDEN_EXACT_TERMS",
        "no hardcoded pass evidence",
    ],
    CI_WORKFLOW: [
        "run_rustapp_final_validation.ps1",
        "latest_validation_evidence.json",
        "latest_readiness_summary.json",
        "latest_local_worker_smoke_evidence.json",
        "launcher_latest.log",
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

    print("PASS: Rust validation evidence boundary, truthful readiness checker, local release bundle checker, CI workflow contract, readiness summary, validation runner summary writer, guarded local worker, non-blocking persistent worker smoke evidence, local worker stack gate, and manual runtime evidence recorder are present and wired")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
