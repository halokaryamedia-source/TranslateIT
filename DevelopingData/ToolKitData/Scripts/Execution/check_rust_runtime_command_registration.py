from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
MAIN_RS = RUST_APP / "src-tauri" / "src" / "main.rs"
ADAPTERS_MOD = RUST_APP / "src-tauri" / "src" / "engine" / "adapters" / "mod.rs"

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
]


def missing_terms(text: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term not in text]


def main() -> int:
    if not MAIN_RS.exists():
        print("RUST_COMMAND_REGISTRATION_MAIN_MISSING")
        print("-", MAIN_RS.relative_to(ROOT))
        return 1
    if not ADAPTERS_MOD.exists():
        print("RUST_COMMAND_REGISTRATION_ADAPTER_MOD_MISSING")
        print("-", ADAPTERS_MOD.relative_to(ROOT))
        return 1

    main_text = MAIN_RS.read_text(encoding="utf-8")
    adapters_text = ADAPTERS_MOD.read_text(encoding="utf-8")

    missing_commands = missing_terms(main_text, REQUIRED_COMMANDS)
    missing_modules = [module for module in REQUIRED_MODULES if f"pub mod {module};" not in adapters_text]

    if missing_commands or missing_modules:
        print("RUST_COMMAND_REGISTRATION_INCOMPLETE")
        for command in missing_commands:
            print("- missing command:", command)
        for module in missing_modules:
            print("- missing module:", module)
        return 1

    print("PASS: Rust runtime commands and live pipeline adapter modules are registered")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
