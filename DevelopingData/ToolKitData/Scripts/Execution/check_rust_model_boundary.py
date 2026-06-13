from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MODEL_FILE = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine" / "adapters" / "model_check.rs"


def main() -> int:
    if not MODEL_FILE.exists():
        print("RUST_MODEL_BOUNDARY_MISSING")
        print("-", MODEL_FILE.relative_to(ROOT))
        return 1
    print("PASS: Rust model boundary file is present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
