from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.LauncherApp.realtime_status_panel_adapter import RealtimeStatusPanelAdapter


class DummyLabel:
    def __init__(self) -> None:
        self.text = ""
        self.properties: dict[str, str] = {}

    def setText(self, value: str) -> None:
        self.text = value

    def setProperty(self, key: str, value: str) -> None:
        self.properties[key] = value


class RealtimeStatusPanelAdapterTests(unittest.TestCase):
    def test_apply_to_labels_updates_realtime_widget(self) -> None:
        label = DummyLabel()
        result = RealtimeStatusPanelAdapter.apply_to_labels(
            {"realtime": label},
            {
                "status": "Ready",
                "latency": "820ms / target 1250ms",
                "model": "MT=fast, TTS=piper",
                "fallback": "primary",
            },
        )
        self.assertTrue(result.applied)
        self.assertEqual(label.properties["statusState"], "ready")
        self.assertIn("Ready", label.text)

    def test_missing_label_returns_not_applied(self) -> None:
        result = RealtimeStatusPanelAdapter.apply_to_labels({}, {"status": "Ready"})
        self.assertFalse(result.applied)
        self.assertEqual(result.key, "realtime")


if __name__ == "__main__":
    unittest.main()
