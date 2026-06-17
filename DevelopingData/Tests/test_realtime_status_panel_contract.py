from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.LauncherApp.realtime_status_panel_contract import RealtimeStatusPanelContract


class RealtimeStatusPanelContractTests(unittest.TestCase):
    def test_default_row_is_pending_not_ready(self) -> None:
        row = RealtimeStatusPanelContract.default_row()
        self.assertEqual(row.key, "realtime")
        self.assertEqual(row.label, "Realtime")
        self.assertEqual(row.state, "warning")
        self.assertIn("pending", row.value.lower())

    def test_unavailable_payload_maps_to_error_state(self) -> None:
        row = RealtimeStatusPanelContract.from_payload(
            {
                "status": "TTS Unavailable",
                "latency": "Latency unavailable",
                "model": "MT=fast-mt-id-en, TTS=piper-local-tts",
                "fallback": "Fallback active",
            }
        )
        self.assertEqual(row.state, "error")
        self.assertIn("TTS Unavailable", row.value)

    def test_ready_payload_maps_to_ready_state(self) -> None:
        row = RealtimeStatusPanelContract.from_payload(
            {
                "status": "Ready",
                "compact_text": "Ready | 820ms / target 1250ms | primary",
            }
        )
        self.assertEqual(row.state, "ready")
        self.assertIn("Ready", row.value)


if __name__ == "__main__":
    unittest.main()
