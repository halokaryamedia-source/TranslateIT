from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ENGINE_SRC = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine"


def main() -> int:
    required = [
        ENGINE_SRC / "audio" / "buffer.rs",
        ENGINE_SRC / "audio" / "calibration_flow.rs",
        ENGINE_SRC / "inference" / "backend_validation.rs",
        ENGINE_SRC / "adapters" / "asr_dry_run.rs",
        ENGINE_SRC / "adapters" / "text_dry_run.rs",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("RUST_RUNTIME_BOUNDARY_MISSING")
        for item in missing:
            print("-", item)
        return 1
    print("PASS: Rust runtime boundary files are present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
