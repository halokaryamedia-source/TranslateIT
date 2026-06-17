from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_validation_runner import RealtimeValidationRunner


class RealtimeValidationRunnerTests(unittest.TestCase):
    def test_runner_returns_incomplete_when_model_root_is_missing(self) -> None:
        output = RealtimeValidationRunner(model_root=None).run()
        self.assertLess(output.percent_ready, 100)
        self.assertIn("real_device_tested", output.payload)
        self.assertFalse(output.payload["real_device_tested"])


if __name__ == "__main__":
    unittest.main()
