from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ENGINE_SRC = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine"
LOCAL_WORKER = ROOT / "EngineData" / "LauncherApp" / "Workers" / "realtime_local_worker.py"


def main() -> int:
    required = [
        ENGINE_SRC / "audio" / "buffer.rs",
        ENGINE_SRC / "audio" / "calibration_flow.rs",
        ENGINE_SRC / "audio" / "live_audio_buffer.rs",
        ENGINE_SRC / "audio" / "live_capture.rs",
        ENGINE_SRC / "inference" / "backend_validation.rs",
        ENGINE_SRC / "adapters" / "asr_dry_run.rs",
        ENGINE_SRC / "adapters" / "text_dry_run.rs",
        ENGINE_SRC / "adapters" / "live_asr_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "native_asr_decoder_logic.rs",
        ENGINE_SRC / "adapters" / "live_translation_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "live_tts_boundary_logic.rs",
        ENGINE_SRC / "adapters" / "live_runtime_pipeline_gate_logic.rs",
        ENGINE_SRC / "adapters" / "live_pipeline_compact_status_logic.rs",
        ENGINE_SRC / "adapters" / "internal_validation_gate_logic.rs",
        ENGINE_SRC / "adapters" / "runtime_status_bundle_logic.rs",
        ENGINE_SRC / "adapters" / "runtime_readiness_bundle_logic.rs",
        LOCAL_WORKER,
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("RUST_RUNTIME_BOUNDARY_MISSING")
        for item in missing:
            print("-", item)
        return 1

    worker_text = LOCAL_WORKER.read_text(encoding="utf-8")
    required_worker_terms = [
        "faster-whisper-large-v3-turbo",
        "marianmt-id-en",
        "nllb-200-distilled-600M",
        "tts_preflight",
        "asr_preload",
        "translation_preload",
    ]
    missing_terms = [term for term in required_worker_terms if term not in worker_text]
    if missing_terms:
        print("LOCAL_REALTIME_WORKER_BOUNDARY_INCOMPLETE")
        for term in missing_terms:
            print("-", term)
        return 1

    print("PASS: Rust runtime boundary files are present")
    print("PASS: live capture, live buffer, ASR, translation, TTS, pipeline gate, validation gate, and local realtime worker boundaries are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
