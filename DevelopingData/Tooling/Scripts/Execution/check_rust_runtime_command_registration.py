from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
MAIN_RS = RUST_APP / "src-tauri" / "src" / "main.rs"
ADAPTERS_MOD = RUST_APP / "src-tauri" / "src" / "engine" / "adapters" / "mod.rs"
STATUS_BUNDLE = RUST_APP / "src-tauri" / "src" / "engine" / "adapters" / "runtime_status_bundle_logic.rs"

REQUIRED_COMMANDS = [
    "analyze_runtime_readiness",
    "get_runtime_status_bundle",
    "analyze_live_pipeline_gate",
    "get_live_pipeline_compact_status",
    "analyze_internal_validation",
    "get_live_capture_status",
    "start_capture",
    "stop_capture",
]

REQUIRED_MODULES = [
    "internal_validation_gate_logic",
    "live_pipeline_compact_status_logic",
    "live_runtime_pipeline_gate_logic",
    "live_asr_boundary_logic",
    "native_asr_decoder_logic",
    "live_translation_boundary_logic",
    "live_tts_boundary_logic",
    "local_worker_manifest_logic",
]

REQUIRED_STATUS_TERMS = [
    "LocalWorkerManifestReport",
    "analyze_local_worker_manifest",
    "local_worker_manifest",
    "install_or_validate_local_worker_models",
]


def missing_terms(text: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term not in text]


def main() -> int:
    for required_file in (MAIN_RS, ADAPTERS_MOD, STATUS_BUNDLE):
        if not required_file.exists():
            print("RUST_COMMAND_REGISTRATION_FILE_MISSING")
            print("-", required_file.relative_to(ROOT))
            return 1

    main_text = MAIN_RS.read_text(encoding="utf-8")
    adapters_text = ADAPTERS_MOD.read_text(encoding="utf-8")
    status_text = STATUS_BUNDLE.read_text(encoding="utf-8")

    missing_commands = missing_terms(main_text, REQUIRED_COMMANDS)
    missing_modules = [module for module in REQUIRED_MODULES if f"pub mod {module};" not in adapters_text]
    missing_status_terms = missing_terms(status_text, REQUIRED_STATUS_TERMS)

    if missing_commands or missing_modules or missing_status_terms:
        print("RUST_COMMAND_REGISTRATION_INCOMPLETE")
        for command in missing_commands:
            print("- missing command:", command)
        for module in missing_modules:
            print("- missing module:", module)
        for term in missing_status_terms:
            print("- missing status bundle term:", term)
        return 1

    print("PASS: Rust runtime commands, live pipeline modules, and local worker manifest status are registered")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
