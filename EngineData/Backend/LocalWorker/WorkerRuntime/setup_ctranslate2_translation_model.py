from __future__ import annotations

import json
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MODEL_ROOT = ROOT / "EngineData" / "Backend" / "RuntimeAssets" / "Translation" / "ModelData"
SOURCE_MODEL = MODEL_ROOT / "marianmt-id-en"
OUTPUT_MODEL = MODEL_ROOT / "marianmt-id-en-ct2"
REPORT_DIR = ROOT / "UserData" / "LogData" / "RuntimeTestReports"


def now_ms() -> int:
    return int(time.time() * 1000)


def ct2_ready(path: Path = OUTPUT_MODEL) -> bool:
    return path.is_dir() and (path / "model.bin").is_file() and (path / "config.json").is_file()


def main() -> int:
    started = now_ms()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "schema": "translateit.ct2_translation_setup.v1",
        "source_model": str(SOURCE_MODEL),
        "output_model": str(OUTPUT_MODEL),
        "started_unix_ms": started,
    }
    if ct2_ready():
        report.update({"ok": True, "stage": "already_ready", "elapsed_ms": now_ms() - started})
    elif not SOURCE_MODEL.is_dir():
        report.update({"ok": False, "stage": "blocked", "blocker": "source_model_missing", "elapsed_ms": now_ms() - started})
    else:
        try:
            import ctranslate2
            converter = ctranslate2.converters.TransformersConverter(str(SOURCE_MODEL))
            temp_output = OUTPUT_MODEL.with_name(f"{OUTPUT_MODEL.name}.tmp")
            if temp_output.exists():
                shutil.rmtree(temp_output)
            temp_output.parent.mkdir(parents=True, exist_ok=True)
            converter.convert(
                output_dir=str(temp_output),
                quantization="int8_float16",
                force=True,
            )
            if OUTPUT_MODEL.exists():
                shutil.rmtree(OUTPUT_MODEL)
            temp_output.rename(OUTPUT_MODEL)
            report.update({
                "ok": ct2_ready(),
                "stage": "converted",
                "quantization": "int8_float16",
                "elapsed_ms": now_ms() - started,
            })
        except Exception as exc:
            report.update({
                "ok": False,
                "stage": "error",
                "blocker": type(exc).__name__,
                "note": str(exc),
                "elapsed_ms": now_ms() - started,
            })
    latest = REPORT_DIR / "latest-ct2-translation-setup.json"
    latest.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
