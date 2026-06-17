from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_readiness_audit import RealtimeReadinessAuditor


class RealtimeReadinessAuditTests(unittest.TestCase):
    def test_audit_is_not_complete_without_model_root(self) -> None:
        audit = RealtimeReadinessAuditor(model_root=None).audit()
        self.assertLess(audit.percent_ready, 100)
        self.assertIn(audit.status, {"BLOCKED", "PARTIAL_READY"})

    def test_audit_dict_contains_items(self) -> None:
        payload = RealtimeReadinessAuditor(model_root=None).audit().to_dict()
        self.assertIn("items", payload)
        self.assertIsInstance(payload["items"], list)


if __name__ == "__main__":
    unittest.main()
