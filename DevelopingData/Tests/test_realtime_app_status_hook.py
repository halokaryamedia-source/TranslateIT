from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.LauncherApp.realtime_app_status_hook import RealtimeAppStatusHook


class DummyLabel:
    def __init__(self) -> None:
        self.text = ""
        self.properties: dict[str, str] = {}

    def setText(self, value: str) -> None:
        self.text = value

    def setProperty(self, key: str, value: str) -> None:
        self.properties[key] = value


class DummyWindow:
    def __init__(self) -> None:
        self.status_labels = {"realtime": DummyLabel()}


class RealtimeAppStatusHookTests(unittest.TestCase):
    def test_hook_applies_status_to_realtime_label(self) -> None:
        window = DummyWindow()
        result = RealtimeAppStatusHook.apply(
            window,
            {
                "status": "Ready",
                "compact_text": "Ready | 820ms | primary",
            },
        )
        self.assertTrue(result.applied)
        label = window.status_labels["realtime"]
        self.assertIn("Ready", label.text)
        self.assertEqual(label.properties["statusState"], "ready")


if __name__ == "__main__":
    unittest.main()
