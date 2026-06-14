from __future__ import annotations

import argparse
import json
import queue
import subprocess
import sys
import threading
import time
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
    return str(WORKER_VENV_PYTHON) if WORKER_VENV_PYTHON.exists() else sys.executable


def stream_reader(stream: Any, output: "queue.Queue[str]") -> None:
    try:
        for line in iter(stream.readline, ""):
            if line:
                output.put(line)
    except Exception:
        return


class PersistentWorker:
    def __init__(self) -> None:
        self.process: subprocess.Popen[str] | None = None
        self.stdout_queue: queue.Queue[str] = queue.Queue()
        self.stderr_queue: queue.Queue[str] = queue.Queue()
        self.stdout_thread: threading.Thread | None = None
        self.stderr_thread: threading.Thread | None = None

    def start(self) -> dict[str, Any]:
        if not WORKER_SCRIPT.exists():
            return {"ok": False, "stage": "worker_start", "blocker": "worker_script_missing"}
        self.process = subprocess.Popen([resolve_python(), str(WORKER_SCRIPT)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        if self.process.stdout is not None:
            self.stdout_thread = threading.Thread(target=stream_reader, args=(self.process.stdout, self.stdout_queue), daemon=True)
            self.stdout_thread.start()
        if self.process.stderr is not None:
            self.stderr_thread = threading.Thread(target=stream_reader, args=(self.process.stderr, self.stderr_queue), daemon=True)
            self.stderr_thread.start()
        return {"ok": True, "stage": "worker_start", "pid": self.process.pid, "python": resolve_python()}

    def stderr_tail(self, max_items: int = 20) -> str:
        lines: list[str] = []
        while not self.stderr_queue.empty() and len(lines) < max_items:
            lines.append(self.stderr_queue.get_nowait().rstrip())
        return "\n".join(lines)[-1000:]

    def command(self, command: dict[str, Any], timeout_s: int = 60) -> dict[str, Any]:
        if self.process is None or self.process.stdin is None:
            return {"ok": False, "stage": command.get("command", "unknown"), "blocker": "worker_not_started"}
        started = time.time()
        try:
            self.process.stdin.write(json.dumps(command, ensure_ascii=False) + "\n")
            self.process.stdin.flush()
            try:
                first_line = self.stdout_queue.get(timeout=timeout_s)
            except queue.Empty:
                return {"ok": False, "stage": command.get("command", "unknown"), "blocker": "worker_command_timeout", "timeout_s": timeout_s, "stderr_tail": self.stderr_tail()}
            try:
                payload = json.loads(first_line)
            except json.JSONDecodeError as exc:
                return {"ok": False, "stage": command.get("command", "unknown"), "blocker": "worker_invalid_json", "note": str(exc), "stdout": first_line[-800:], "stderr_tail": self.stderr_tail()}
            payload["wall_ms"] = int((time.time() - started) * 1000)
            stderr_tail = self.stderr_tail()
            if stderr_tail:
                payload["stderr_tail"] = stderr_tail
            return payload
        except Exception as exc:
            return {"ok": False, "stage": command.get("command", "unknown"), "blocker": type(exc).__name__, "note": str(exc), "stderr_tail": self.stderr_tail()}

    def close(self) -> None:
        if self.process is None:
            return
        try:
            if self.process.stdin:
                self.process.stdin.close()
            self.process.terminate()
            self.process.wait(timeout=5)
        except Exception:
            try:
                self.process.kill()
            except Exception:
                pass


def latency_summary(results: dict[str, Any]) -> dict[str, Any]:
    keys = ["asr_preload", "translation_preload", "translation_smoke", "tts_synthesis_smoke", "asr_transcript_smoke"]
    timings = {key: results.get(key, {}).get("elapsed_ms", results.get(key, {}).get("wall_ms")) for key in keys}
    numeric = [int(value) for value in timings.values() if isinstance(value, int)]
    return {"stage_timings_ms": timings, "measured_stage_count": len(numeric), "total_measured_ms": sum(numeric), "realtime_target_ms": 1000, "quality_target_ms": 2500, "timeout_model": "threaded_non_blocking_stdout_queue", "note": "Latency target can be judged only after real ASR audio, translation, and TTS smoke stages all pass in one persistent worker session."}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run TranslateIT local realtime worker smoke tests in one persistent worker process.")
    parser.add_argument("--audio-path", default="")
    parser.add_argument("--mode", choices=["Realtime", "Quality"], default="Realtime")
    parser.add_argument("--text", default="halo")
    parser.add_argument("--tts-text", default="Hello.")
    args = parser.parse_args()

    worker = PersistentWorker()
    results: dict[str, Any] = {"schema": "translateit.local_worker_smoke_evidence.v3", "generated_at_utc": datetime.now(timezone.utc).isoformat(), "mode": args.mode, "worker_script": str(WORKER_SCRIPT.relative_to(ROOT)), "python": resolve_python(), "persistent_worker": True, "timeout_model": "threaded_non_blocking_stdout_queue", "worker_start": worker.start()}

    try:
        results["status"] = worker.command({"command": "status"}, timeout_s=15)
        results["asr_preload"] = worker.command({"command": "asr_preload"}, timeout_s=90)
        results["translation_preload"] = worker.command({"command": "translation_preload", "mode": args.mode}, timeout_s=90)
        results["translation_smoke"] = worker.command({"command": "translate", "mode": args.mode, "text": args.text}, timeout_s=90)
        results["tts_preflight"] = worker.command({"command": "tts_preflight"}, timeout_s=20)
        results["tts_synthesis_smoke"] = worker.command({"command": "synthesize", "text": args.tts_text, "output_path": "UserData/CacheData/tts_smoke_output.wav"}, timeout_s=45)
        if args.audio_path.strip():
            results["asr_transcript_smoke"] = worker.command({"command": "transcribe", "audio_path": args.audio_path.strip(), "language": "id", "vad_filter": True}, timeout_s=120)
        else:
            results["asr_transcript_smoke"] = {"ok": False, "stage": "transcribe", "blocker": "asr:real_microphone_audio_sample_not_provided", "note": "Provide --audio-path with a real microphone WAV sample to complete ASR transcript smoke evidence."}
    finally:
        worker.close()

    required_keys = ["worker_start", "status", "asr_preload", "translation_preload", "translation_smoke", "tts_preflight", "tts_synthesis_smoke", "asr_transcript_smoke"]
    results["latency_summary"] = latency_summary(results)
    results["ok"] = all(bool(results[key].get("ok")) for key in required_keys)
    results["note"] = "Local worker smoke tests passed in one persistent worker process." if results["ok"] else "Local worker smoke tests are incomplete or failed. Do not mark owner validation from this file alone."

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    SMOKE_EVIDENCE.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print("PASS" if results["ok"] else "INCOMPLETE")
    print(SMOKE_EVIDENCE.relative_to(ROOT))
    return 0 if results["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
