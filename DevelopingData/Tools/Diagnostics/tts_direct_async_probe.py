from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from time import sleep


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.tts_placeholder import TTSPlaceholder, TTSRequest


def main() -> int:
    os.environ.setdefault("TRANSLATEIT_TTS_BACKEND", "sapi_direct_async")
    tts = TTSPlaceholder()
    trace_id = "diagnostic-tts-direct-async"
    output_path = Path(tempfile.gettempdir()) / "translateit_tts_direct_async_probe.wav"
    request = TTSRequest(
        segment_id="DIAGNOSTIC-TTS",
        text="Hello, this is a TranslateIT direct async test.",
        language="en",
        output_path=str(output_path),
        trace_id=trace_id,
    )
    result = tts.speak(request)
    sleep(2.0)
    worker_pid = getattr(tts._ps_process, "pid", 0) if getattr(tts, "_ps_process", None) is not None else 0
    worker_exit = tts._ps_process.poll() if getattr(tts, "_ps_process", None) is not None else None
    payload = {
        "trace_id": trace_id,
        "backend_name": result.backend_name,
        "backend_selected": result.backend_selected,
        "status": result.status,
        "mode": result.mode,
        "direct_playback": result.direct_playback,
        "worker_pid": worker_pid,
        "worker_exit_code": worker_exit,
        "notes": result.notes,
        "trace_log": str(PROJECT_ROOT / "UserData" / "LogData" / "runtime_pipeline_latest.log"),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
