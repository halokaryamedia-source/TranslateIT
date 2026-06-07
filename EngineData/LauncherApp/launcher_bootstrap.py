from __future__ import annotations

import argparse
from datetime import datetime
import os
import runpy
import sys
import traceback
from pathlib import Path

from EngineData.LauncherApp.app_logger import (
    append_log,
    install_global_crash_recorders,
    write_crash_record,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = PROJECT_ROOT / "UserData" / "LogData"
LOG_FILE = LOG_DIR / "launcher_latest.log"


def _safe_str(value: object) -> str:
    try:
        return str(value)
    except Exception:
        return "<unprintable>"


def log_line(level: str, event: str, details: str = "") -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = f"[{_safe_str(datetime.now())}] {level}: {event}"
    if details:
        line += f" | {details}"
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def ensure_environment() -> None:
    os.chdir(PROJECT_ROOT)
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    os.environ["TRANSLATEIT_LAUNCH_MODE"] = os.environ.get("TRANSLATEIT_LAUNCH_MODE", "gui")
    os.environ["TRANSLATEIT_PROJECT_ROOT"] = str(PROJECT_ROOT)
    if not os.environ.get("TRANSLATEIT_TTS_BACKEND"):
        os.environ["TRANSLATEIT_TTS_BACKEND"] = "sapi_direct_async"


def startup_snapshot() -> dict[str, object]:
    app_main_path = PROJECT_ROOT / "EngineData" / "LauncherApp" / "app_main.py"
    return {
        "python_executable": sys.executable,
        "python_version": sys.version.replace("\n", " "),
        "cwd": os.getcwd(),
        "project_root": str(PROJECT_ROOT),
        "sys_path_head": sys.path[:5],
        "backend": os.environ.get("TRANSLATEIT_TTS_BACKEND", ""),
        "engine_data_exists": (PROJECT_ROOT / "EngineData").exists(),
        "app_main_exists": app_main_path.exists(),
        "app_main_path": str(app_main_path),
    }


def write_snapshot(prefix: str) -> None:
    snap = startup_snapshot()
    details = "; ".join(f"{key}={_safe_str(value)}" for key, value in snap.items())
    log_line("INFO", prefix, details)


def run_self_test() -> int:
    ensure_environment()
    install_global_crash_recorders(startup_context=startup_snapshot)
    write_snapshot("bootstrap_self_test")
    app_main_path = PROJECT_ROOT / "EngineData" / "LauncherApp" / "app_main.py"
    if not (PROJECT_ROOT / "EngineData").exists():
        log_line("ERROR", "self_test_failed", "EngineData folder missing")
        print("FAIL: EngineData folder missing")
        return 1
    if not app_main_path.exists():
        log_line("ERROR", "self_test_failed", f"app_main missing: {app_main_path}")
        print("FAIL: app_main.py missing")
        return 1
    try:
        import EngineData  # noqa: F401
        import EngineData.LauncherApp.app_main as app_main  # noqa: F401
    except Exception:
        trace = traceback.format_exc()
        write_crash_record(
            "app_crash",
            "bootstrap_self_test_import_failed",
            RuntimeError("launcher bootstrap self-test import failed"),
            details=trace,
            context=startup_snapshot(),
        )
        log_line("ERROR", "self_test_import_failed", trace)
        print("FAIL: import failed")
        print(trace)
        return 1
    print("PASS: launcher self-test")
    log_line("INFO", "self_test_passed", "PASS")
    return 0


def _run_app() -> int:
    try:
        import EngineData.LauncherApp.app_main as app_main
        if hasattr(app_main, "main") and callable(app_main.main):
            return int(app_main.main())
        return int(runpy.run_module("EngineData.LauncherApp.app_main", run_name="__main__") or 0)
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else 1
        raise
    except Exception:
        trace = traceback.format_exc()
        log_line("ERROR", "startup_failed", trace)
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="TranslateIT launcher bootstrap")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    ensure_environment()
    install_global_crash_recorders(startup_context=startup_snapshot)
    write_snapshot("bootstrap_start")
    if args.self_test:
        return run_self_test()
    try:
        log_line("INFO", "bootstrap_launching_app", "EngineData.LauncherApp.app_main")
        return _run_app()
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else 1
        log_line("ERROR", "bootstrap_exit", f"exit_code={code}")
        return code
    except Exception:
        trace = traceback.format_exc()
        write_crash_record(
            "app_crash",
            "bootstrap_exception",
            RuntimeError("launcher bootstrap failed"),
            details=trace,
            context=startup_snapshot(),
        )
        log_line("ERROR", "bootstrap_exception", trace)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
