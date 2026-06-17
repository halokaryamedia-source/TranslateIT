from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from DevelopingData.Patches.verify_realtime_app_main_hook import REQUIRED_MARKERS, verify_app_main_hook


class AppMainHookVerifierTests(unittest.TestCase):
    def test_required_markers_are_declared(self) -> None:
        self.assertIn("hook_import", REQUIRED_MARKERS)
        self.assertIn("alias_row", REQUIRED_MARKERS)
        self.assertIn("refresh_method", REQUIRED_MARKERS)
        self.assertIn("hook_call", REQUIRED_MARKERS)

    def test_verifier_returns_structured_result(self) -> None:
        result = verify_app_main_hook()
        payload = result.to_dict()
        self.assertIn("applied", payload)
        self.assertIn("missing", payload)
        self.assertIn("present", payload)


if __name__ == "__main__":
    unittest.main()
