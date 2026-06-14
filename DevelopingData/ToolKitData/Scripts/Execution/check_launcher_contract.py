from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
LAUNCHER = ROOT / "TranslateIT.vbs"
RUST_APP = ROOT / "EngineData" / "LauncherApp" / "RustApp"
PACKAGE_JSON = RUST_APP / "package.json"

REQUIRED_LAUNCHER_TERMS = [
    "EngineData\\LauncherApp\\RustApp",
    "translateit_rustapp.exe",
    "package.json",
    "launcher_latest.log",
    "CommandExists",
    "release_exe_missing_and_npm_missing",
    "npm.cmd run dev",
]


def main() -> int:
    missing_files = [str(path.relative_to(ROOT)) for path in [LAUNCHER, PACKAGE_JSON] if not path.exists()]
    if missing_files:
        print("LAUNCHER_CONTRACT_MISSING")
        for item in missing_files:
            print("-", item)
        return 1

    text = LAUNCHER.read_text(encoding="utf-8")
    missing_terms = [term for term in REQUIRED_LAUNCHER_TERMS if term not in text]
    if missing_terms:
        print("LAUNCHER_CONTRACT_INCOMPLETE")
        for term in missing_terms:
            print("-", term)
        return 1

    print("PASS: TranslateIT launcher targets RustApp, prefers release exe, validates package.json, logs failures, and gives a clear missing npm/build message")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
