from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

REQUIRED_FILES = [
    ROOT / "TranslateIT.vbs",
    ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml",
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "requirements-realtime.txt",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "setup_realtime_worker.ps1",
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "run_realtime_worker_smoke.ps1",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_rustapp_final_validation.ps1",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "record_rustapp_manual_runtime_evidence.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_local_realtime_worker_smoke_tests.py",
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "summarize_translateit_readiness.py",
]

REQUIRED_TERMS = {
    ROOT / "TranslateIT.vbs": [
        "translateit_rustapp.exe",
        "npm.cmd run dev",
        "release_exe_missing_and_npm_missing",
        "launcher_latest.log",
    ],
    ROOT / "EngineData" / "LauncherApp" / "RustApp" / "package.json": [
        "validate:full",
        "validate:ci-workflow",
        "validate:launcher",
        "validate:bundle",
        "validate:worker",
        "validate:models",
        "validate:evidence",
        "status:readiness",
    ],
    ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py": [
        "asr_preload",
        "transcribe",
        "translation_preload",
        "translate",
        "tts_preflight",
        "synthesize",
        "torch_cuda_available",
        "resolve_worker_path",
        "ALLOWED_INPUT_ROOTS",
        "ALLOWED_OUTPUT_ROOTS",
        "device_note",
        "cuda_fallback",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "run_local_realtime_worker_smoke_tests.py": [
        "persistent_worker",
        "threaded_non_blocking_stdout_queue",
        "latency_summary",
        "latest_local_worker_smoke_evidence.json",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "write_rustapp_validation_evidence.py": [
        "translateit.rustapp.validation_evidence.v3",
        "local_worker_smoke_evidence",
        "manual_runtime_evidence",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "record_rustapp_manual_runtime_evidence.py": [
        "persistent_worker_smoke_passed",
        "owner_validation_allowed",
        "release_candidate_allowed",
    ],
    ROOT / "DevelopingData" / "ToolKitData" / "Scripts" / "Execution" / "summarize_translateit_readiness.py": [
        "commercial_readiness_percent",
        "release_ready",
        "blockers",
    ],
    ROOT / ".github" / "workflows" / "translateit-rustapp-internal-validation.yml": [
        "run_rustapp_final_validation.ps1",
        "latest_validation_evidence.json",
        "latest_readiness_summary.json",
        "latest_local_worker_smoke_evidence.json",
    ],
}


def main() -> int:
    missing_files = [str(path.relative_to(ROOT)) for path in REQUIRED_FILES if not path.exists()]
    if missing_files:
        print("LOCAL_RELEASE_BUNDLE_FILES_MISSING")
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
        print("LOCAL_RELEASE_BUNDLE_CONTRACT_INCOMPLETE")
        for item in missing_terms:
            print("-", item)
        return 1

    print("PASS: TranslateIT local release bundle contains launcher, RustApp, guarded worker, smoke, evidence, readiness, and CI validation contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
