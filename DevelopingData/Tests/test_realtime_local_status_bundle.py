from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_local_status_bundle import RealtimeLocalStatusBundleBuilder


class RealtimeLocalStatusBundleTests(unittest.TestCase):
    def test_bundle_is_not_ready_without_local_inputs(self) -> None:
        bundle = RealtimeLocalStatusBundleBuilder(model_root=None).build().to_dict()
        self.assertFalse(bundle["ready"])
        self.assertIn("hook", bundle)
        self.assertIn("assets", bundle)
        self.assertIn("language_llm", bundle)
        self.assertIn("validation", bundle)
        self.assertIn("release", bundle)


if __name__ == "__main__":
    unittest.main()
