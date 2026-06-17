from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_asset_readiness import RealtimeAssetReadinessChecker


class RealtimeAssetReadinessTests(unittest.TestCase):
    def test_missing_root_is_not_ready(self) -> None:
        result = RealtimeAssetReadinessChecker(model_root=None).check()
        payload = result.to_dict()
        self.assertFalse(payload["ready"])
        self.assertIn("checks", payload)
        self.assertIn("manifest", payload)
        self.assertGreaterEqual(len(payload["checks"]), 1)
        self.assertGreaterEqual(len(payload["manifest"]), 1)


if __name__ == "__main__":
    unittest.main()
