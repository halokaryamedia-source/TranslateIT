from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[4]
WORKER_ROOT = ROOT / "EngineData" / "LauncherApp" / "Workers"
WORKER_SCRIPT = WORKER_ROOT / "realtime_local_worker.py"
WORKER_VENV_PYTHON = WORKER_ROOT / ".venv" / "Scripts" / "python.exe"
EVIDENCE_DIR = ROOT / "UserData" / "LogData" / "RustAppValidation"
SMOKE_EVIDENCE = EVIDENCE_DIR / "latest_local_worker_smoke_evidence.json"


def resolve_python() -> str:
    if WORKER_VENV_PYTHON.exists():
        return str(WORKER_VENV_PYTHON)
    return sys.executable


def run_worker_command(command: dict[str, Any], timeout_s: int = 30) -> dict[str, Any]:
    if not WORKER_SCRIPT.exists():
        return {"ok": False, "stage": command.get("command", "unknown"), "blocker": "worker_script_missing"}
    completed = subprocess.run(
        [resolve_python(), str(WORKER_SCRIPT)],
        input=json.dumps(command, ensure_ascii=False) + "\n",
        text=True,
        capture_output=True,
        timeout=timeout_s,
        check=False,
    )
    first_line = completed.stdout.splitlines()[0] if completed.stdout.splitlines() else ""
    if not first_line:
        return {
            "ok": False,
            "stage": command.get("command", "unknown"),
            "blocker": "worker_empty_stdout",
            "stderr": completed.stderr[-800:],
            "returncode": completed.returncode,
        }
    try:
        payload = json.loads(first_line)
    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "stage": command.get("command", "unknown"),
            "blocker": "worker_invalid_json",
            "note": str(exc),
            "stdout": first_line[-800:],
            "stderr": completed.stderr[-800:],
            "returncode": completed.returncode,
        }
    payload["returncode"] = completed.returncode
    if completed.stderr:
        payload["stderr_tail"] = completed.stderr[-800:]
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Run TranslateIT local realtime worker smoke tests.")
    parser.add_argument("--audio-path", default="", help="Optional real microphone WAV sample for ASR transcript smoke test.")
    parser.add_argument("--mode", choices=["Realtime", "Quality"], default="Realtime")
    parser.add_argument("--text", default="halo", help="Short text for translation smoke test.")
    parser.add_argument("--tts-text", default="Hello.", help="Short text for TTS synthesis smoke test.")
    args = parser.parse_args()

    results: dict[str, Any] = {
        "schema": "translateit.local_worker_smoke_evidence.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "mode": args.mode,
        "worker_script": str(WORKER_SCRIPT.relative_to(ROOT)),
        "python": resolve_python(),
        "status": run_worker_command({"command": "status"}, timeout_s=15),
        "asr_preload": run_worker_command({"command": "asr_preload"}, timeout_s=60),
        "translation_preload": run_worker_command({"command": "translation_preload", "mode": args.mode}, timeout_s=60),
        "translation_smoke": run_worker_command({"command": "translate", "mode": args.mode, "text": args.text}, timeout_s=60),
        "tts_preflight": run_worker_command({"command": "tts_preflight"}, timeout_s=20),
        "tts_synthesis_smoke": run_worker_command({"command": "synthesize", "text": args.tts_text, "output_path": "UserData/CacheData/tts_smoke_output.wav"}, timeout_s=30),
    }

    audio_path = args.audio_path.strip()
    if audio_path:
        results["asr_transcript_smoke"] = run_worker_command(
            {"command": "transcribe", "audio_path": audio_path, "language": "id", "vad_filter": True},
            timeout_s=90,
        )
    else:
        results["asr_transcript_smoke"] = {
            "ok": False,
            "stage": "transcribe",
            "blocker": "asr:real_microphone_audio_sample_not_provided",
            "note": "Provide --audio-path with a real microphone WAV sample to complete ASR transcript smoke evidence.",
        }

    required_keys = [
        "status",
        "asr_preload",
        "translation_preload",
        "translation_smoke",
        "tts_preflight",
        "tts_synthesis_smoke",
        "asr_transcript_smoke",
    ]
    results["ok"] = all(bool(results[key].get("ok")) for key in required_keys)
    results["note"] = (
        "Local worker smoke tests passed." if results["ok"] else "Local worker smoke tests are incomplete or failed. Do not mark owner validation from this file alone."
    )

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    SMOKE_EVIDENCE.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print("PASS" if results["ok"] else "INCOMPLETE")
    print(SMOKE_EVIDENCE.relative_to(ROOT))
    return 0 if results["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
