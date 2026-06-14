from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

ALLOWED_ENGINE_PYTHON = {
    "EngineData/LauncherApp/Workers/realtime_local_worker.py",
}


def main() -> int:
    problems: list[str] = []

    helper_dir = ROOT / "DevelopingData" / "LauncherHelpers"
    if helper_dir.exists():
        helper_scripts = sorted(
            path.relative_to(ROOT).as_posix()
            for path in helper_dir.iterdir()
            if path.is_file() and path.suffix.lower() in {".bat", ".cmd", ".ps1", ".vbs"}
        )
        for rel_path in helper_scripts:
            problems.append(f"old helper script must not exist: {rel_path}")

    engine_python = sorted(
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "EngineData").rglob("*.py")
        if path.is_file()
    )
    for rel_path in engine_python:
        if rel_path not in ALLOWED_ENGINE_PYTHON:
            problems.append(f"unexpected EngineData Python file: {rel_path}")

    if problems:
        print("SINGLE_RUSTAPP_RUNTIME_ROUTE_INCOMPLETE")
        for problem in problems:
            print("-", problem)
        return 1

    print("PASS: Runtime entry is single-route Rust/Tauri, and EngineData Python is limited to the local AI worker only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
