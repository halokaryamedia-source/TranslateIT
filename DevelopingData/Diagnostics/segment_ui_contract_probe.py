from __future__ import annotations

import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


def main() -> int:
    segment = TranscriptSegment(
        segment_id="SEG-DIAGNOSTIC",
        session_id="SESSION-DIAGNOSTIC",
        input_language="id",
        output_language="en",
        start_time_ms=0,
        end_time_ms=1500,
        input_text="Halo coba bicara",
        translated_text="Hello, try speaking",
        trace_id="diagnostic-segment-ui",
    )
    view_model = TranscriptCardViewModel.from_segment(segment)
    payload = {
        "trace_id": segment.trace_id,
        "segment_id": view_model.segment_id,
        "source_text": view_model.source_text,
        "translated_text": view_model.translated_text,
        "timestamp_label": view_model.timestamp_label,
        "quality_label": view_model.quality_label,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
