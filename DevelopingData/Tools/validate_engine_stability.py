from __future__ import annotations

import compileall
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[2]
ENGINE_ROOT = PROJECT_ROOT / "EngineData"
LOG_ROOT = PROJECT_ROOT / "UserData" / "LogData"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _write_text(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _record(step: str, status: str, details: str = "") -> dict[str, str]:
    return {"step": step, "status": status, "details": details}


def main() -> int:
    checks: list[dict[str, str]] = []
    errors: list[str] = []

    checks.append(_record("project_root", "PASS" if PROJECT_ROOT.exists() else "FAIL", str(PROJECT_ROOT)))
    checks.append(_record("engine_root", "PASS" if ENGINE_ROOT.exists() else "FAIL", str(ENGINE_ROOT)))
    checks.append(_record("log_root", "PASS" if LOG_ROOT.exists() else "FAIL", str(LOG_ROOT)))

    try:
        LOG_ROOT.mkdir(parents=True, exist_ok=True)
        probe = LOG_ROOT / "stability_validation_write_probe.txt"
        probe.write_text(f"probe { _now_iso() }\n", encoding="utf-8")
        probe.unlink(missing_ok=True)
        checks.append(_record("log_writable", "PASS", str(LOG_ROOT)))
    except Exception as exc:
        errors.append(f"log_writable: {exc!r}")
        checks.append(_record("log_writable", "FAIL", repr(exc)))

    import_results: list[str] = []
    modules_to_import = [
        "EngineData.LauncherApp.app_config",
        "EngineData.LauncherApp.app_logger",
        "EngineData.LauncherApp.runtime_validation",
        "EngineData.LauncherApp.session_reporting",
        "EngineData.LauncherApp.audio_playback",
        "EngineData.LauncherApp.live_pipeline",
        "EngineData.LauncherApp.app_main",
        "EngineData.TranscriptEngine.transcript_segment",
        "EngineData.TranscriptEngine.audio_preprocessing",
        "EngineData.TranscriptEngine.vad_pipeline",
        "EngineData.TranscriptEngine.asr_model_loader",
        "EngineData.TranslateEngine.translation_engine",
        "EngineData.TranslateEngine.tts_placeholder",
    ]
    for module_name in modules_to_import:
        try:
            __import__(module_name)
            import_results.append(f"PASS {module_name}")
        except Exception as exc:
            errors.append(f"import:{module_name}: {exc!r}")
            import_results.append(f"FAIL {module_name}: {exc!r}")

    compile_ok = compileall.compile_dir(str(ENGINE_ROOT), quiet=1)
    checks.append(_record("compileall", "PASS" if compile_ok else "FAIL", str(ENGINE_ROOT)))
    if not compile_ok:
        errors.append("compileall failed")

    payload = {
        "timestamp": _now_iso(),
        "project_root": str(PROJECT_ROOT),
        "engine_root": str(ENGINE_ROOT),
        "python_runtime": sys.executable,
        "checks": checks,
        "imports": import_results,
        "errors": errors,
        "stability_result": "PASS" if not errors and compile_ok else "FAIL",
    }
    try:
        _write_json(LOG_ROOT / "engine_stability_validation_latest.json", payload)
        _write_text(
            LOG_ROOT / "engine_stability_validation_latest.txt",
            [f"{item['status']}: {item['step']} - {item['details']}" for item in checks]
            + (["IMPORTS:"] + import_results if import_results else [])
            + (["ERRORS:"] + errors if errors else ["ERRORS: none"]),
        )
    except Exception as exc:
        print(f"Could not write validation logs: {exc!r}")
        return 1

    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0 if not errors and compile_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
