from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_partial_event_bridge import RealtimePartialEventBridge


class RealtimePartialEventBridgeTests(unittest.TestCase):
    def test_partial_text_becomes_event_payload(self) -> None:
        payload = RealtimePartialEventBridge.from_partial_text(
            segment_id="SEG-PARTIAL-001",
            text="halo dunia",
            latency_ms=420,
            model_label="faster-whisper-partial",
        )
        data = payload.to_dict()
        self.assertEqual(data["segment_id"], "SEG-PARTIAL-001")
        self.assertEqual(data["text"], "halo dunia")
        self.assertEqual(data["latency_ms"], 420)
        self.assertIn("stt_partial", data["compact_status"])


if __name__ == "__main__":
    unittest.main()
