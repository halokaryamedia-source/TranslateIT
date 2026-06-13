from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"


def main() -> int:
    required = [
        RUST_APP / "README.md",
        RUST_APP / "package.json",
        RUST_APP / "index.html",
        RUST_APP / "src" / "main.ts",
        RUST_APP / "src" / "styles.css",
        RUST_APP / "src-tauri" / "Cargo.toml",
        RUST_APP / "src-tauri" / "tauri.conf.json",
        RUST_APP / "src-tauri" / "build.rs",
        RUST_APP / "src-tauri" / "src" / "main.rs",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("RUST_APP_MISSING")
        for item in missing:
            print("-", item)
        return 1
    print("PASS: RustApp scaffold files are present")
    print("RUST_APP:", RUST_APP.relative_to(ROOT))
    print("ENTRYPOINT:", (RUST_APP / "src-tauri" / "src" / "main.rs").relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
