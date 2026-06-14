from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
TAURI_SRC = RUST_APP / "src-tauri" / "src"
ENGINE_SRC = TAURI_SRC / "engine"
WORKER_ROOT = ROOT / "EngineData" / "LauncherApp" / "Workers"


def main() -> int:
    required = [
        RUST_APP / "README.md",
        RUST_APP / "package.json",
        RUST_APP / "tsconfig.json",
        RUST_APP / "index.html",
        RUST_APP / "src" / "main.ts",
        RUST_APP / "src" / "styles.css",
        RUST_APP / "src-tauri" / "Cargo.toml",
        RUST_APP / "src-tauri" / "tauri.conf.json",
        RUST_APP / "src-tauri" / "build.rs",
        TAURI_SRC / "main.rs",
        ENGINE_SRC / "mod.rs",
        ENGINE_SRC / "state.rs",
        ENGINE_SRC / "config.rs",
        ENGINE_SRC / "cuda_policy.rs",
        ENGINE_SRC / "paths.rs",
        ENGINE_SRC / "settings.rs",
        ENGINE_SRC / "logging.rs",
        ENGINE_SRC / "models.rs",
        ENGINE_SRC / "diagnostics.rs",
        ENGINE_SRC / "audio" / "mod.rs",
        ENGINE_SRC / "audio" / "buffer.rs",
        ENGINE_SRC / "audio" / "device.rs",
        ENGINE_SRC / "audio" / "input.rs",
        ENGINE_SRC / "audio" / "calibration.rs",
        ENGINE_SRC / "audio" / "calibration_flow.rs",
        ENGINE_SRC / "audio" / "evidence.rs",
        ENGINE_SRC / "audio" / "vad.rs",
        ENGINE_SRC / "audio" / "live_capture.rs",
        ENGINE_SRC / "audio" / "live_audio_buffer.rs",
        ENGINE_SRC / "audio" / "live_segment_writer.rs",
        ENGINE_SRC / "inference" / "mod.rs",
        ENGINE_SRC / "inference" / "backend.rs",
        ENGINE_SRC / "inference" / "cuda_probe.rs",
        ENGINE_SRC / "adapters" / "mod.rs",
        ENGINE_SRC / "adapters" / "asr.rs",
        ENGINE_SRC / "adapters" / "translation.rs",
        ENGINE_SRC / "adapters" / "tts.rs",
        ENGINE_SRC / "adapters" / "live_asr_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "native_asr_decoder_logic.rs",
        ENGINE_SRC / "adapters" / "live_translation_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "live_tts_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "live_runtime_pipeline_gate_logic.rs",
        ENGINE_SRC / "adapters" / "live_pipeline_compact_status_logic.rs",
        ENGINE_SRC / "adapters" / "local_worker_manifest_logic.rs",
        ENGINE_SRC / "adapters" / "internal_validation_gate_logic.rs",
        WORKER_ROOT / "realtime_local_worker.py",
        WORKER_ROOT / "requirements-realtime.txt",
        WORKER_ROOT / "realtime_stack_manifest.json",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("RUST_APP_MISSING")
        for item in missing:
            print("-", item)
        return 1
    print("PASS: RustApp scaffold, runtime support, live capture, live segment writer, local realtime worker, live pipeline boundaries, validation gate, inference, CUDA probe, and engine contract files are present")
    print("RUST_APP:", RUST_APP.relative_to(ROOT))
    print("ENTRYPOINT:", (TAURI_SRC / "main.rs").relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
