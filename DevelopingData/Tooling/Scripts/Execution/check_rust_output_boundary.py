from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUTPUT_FILE = ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine" / "adapters" / "output_dry_run.rs"


def main() -> int:
    if not OUTPUT_FILE.exists():
        print("RUST_OUTPUT_BOUNDARY_MISSING")
        print("-", OUTPUT_FILE.relative_to(ROOT))
        return 1
    print("PASS: Rust output boundary file is present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
