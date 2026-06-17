from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_final_readiness_gate import RealtimeFinalReadinessGate


class RealtimeFinalReadinessGateTests(unittest.TestCase):
    def test_gate_is_not_ready_without_local_validation(self) -> None:
        result = RealtimeFinalReadinessGate(model_root=None, target_pc_validated=False).evaluate()
        payload = result.to_dict()
        self.assertFalse(payload["ready"])
        self.assertIn("blockers", payload)
        self.assertGreaterEqual(len(payload["blockers"]), 1)


if __name__ == "__main__":
    unittest.main()
