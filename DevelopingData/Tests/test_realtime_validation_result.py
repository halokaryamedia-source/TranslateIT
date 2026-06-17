from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_readiness_audit import RealtimeReadinessAuditor
from EngineData.TranslateEngine.realtime_validation_result import RealtimeValidationResultBuilder


class RealtimeValidationResultTests(unittest.TestCase):
    def test_result_marks_device_test_as_not_measured(self) -> None:
        audit = RealtimeReadinessAuditor(model_root=None).audit()
        result = RealtimeValidationResultBuilder.from_audit(audit)
        self.assertFalse(result.real_device_tested)
        self.assertLess(result.percent_ready, 100)
        self.assertIn("audit", result.to_dict())


if __name__ == "__main__":
    unittest.main()
