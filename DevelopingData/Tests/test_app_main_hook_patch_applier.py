from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from DevelopingData.Patches import apply_realtime_app_main_hook as patcher


class AppMainHookPatchApplierTests(unittest.TestCase):
    def test_patch_anchors_exist_in_app_main(self) -> None:
        text = patcher.APP_MAIN.read_text(encoding="utf-8")
        self.assertIn(patcher.IMPORT_ANCHOR, text)
        self.assertIn(patcher.ALIAS_ANCHOR, text)
        self.assertIn(patcher.METHOD_ANCHOR, text)

    def test_patch_payload_contains_realtime_hook_method(self) -> None:
        self.assertIn("refresh_realtime_status_panel", patcher.METHOD_BLOCK)
        self.assertIn("RealtimeAppStatusHook.apply", patcher.METHOD_BLOCK)


if __name__ == "__main__":
    unittest.main()
