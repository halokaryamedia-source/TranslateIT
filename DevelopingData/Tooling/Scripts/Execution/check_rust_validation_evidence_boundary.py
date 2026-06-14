from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLING = ROOT / "DevelopingData" / "Tooling" / "Scripts" / "Execution"
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"

REQUIRED_FILES = [
    TOOLING / "write_rustapp_validation_evidence.py",
    TOOLING / "record_rustapp_manual_runtime_evidence.py",
    TOOLING / "summarize_translateit_readiness.py",
    TOOLING / "run_local_realtime_worker_smoke_tests.py",
    TOOLING / "check_local_realtime_worker_stack.py",
    TOOLING / "check_translateit_local_release_bundle.py",
    TOOLING / "check_root_professional_cleanliness.py",
    TOOLING / "check_engine_developing_structure.py",
    RUST_APP / "package.json",
]

REQUIRED_TERMS = {
    TOOLING / "write_rustapp_validation_evidence.py": ["latest_validation_evidence.json", "local_worker_smoke_evidence", "manual_runtime_evidence", "owner_validation_allowed"],
    TOOLING / "record_rustapp_manual_runtime_evidence.py": ["microphone_capture_smoke_test", "asr_transcript_smoke_test", "translation_smoke_test", "tts_playback_smoke_test", "launcher_package_open_test"],
    TOOLING / "summarize_translateit_readiness.py": ["commercial_readiness_percent", "release_ready", "blockers"],
    TOOLING / "run_local_realtime_worker_smoke_tests.py": ["PersistentWorker", "threaded_non_blocking_stdout_queue", "latency_summary"],
    TOOLING / "check_local_realtime_worker_stack.py": ["realtime_local_worker.py", "check_local_runtime_models.py", "run_local_realtime_worker_smoke_tests.py"],
    RUST_APP / "package.json": ["DevelopingData/Tooling/Scripts/Execution", "validate:full", "validate:evidence"],
}


def main() -> int:
    problems: list[str] = []
    for path in REQUIRED_FILES:
        if not path.exists():
            problems.append(f"missing required file: {path.relative_to(ROOT)}")
    for path, terms in REQUIRED_TERMS.items():
        if path.exists():
            text = path.read_text(encoding="utf-8")
            for term in terms:
                if term not in text:
                    problems.append(f"{path.relative_to(ROOT)} missing term: {term}")
    if problems:
        print("RUST_VALIDATION_EVIDENCE_BOUNDARY_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1
    print("PASS: Rust validation evidence boundary is wired through DevelopingData/Tooling")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
