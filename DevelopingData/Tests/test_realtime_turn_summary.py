from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend
from EngineData.TranslateEngine.realtime_turn_planner import RealtimeTurnPlanner
from EngineData.TranslateEngine.realtime_turn_summary import RealtimeTurnSummaryBuilder
from EngineData.TranslateEngine.translation_engine import TranslationEngine


class RealtimeTurnSummaryTests(unittest.TestCase):
    def test_summary_reports_not_ready_when_tts_is_unavailable(self) -> None:
        planner = RealtimeTurnPlanner(
            translation_engine=TranslationEngine(),
            tts_backend=PiperTTSBackend(model_root=None),
        )
        plan = planner.plan_turn(
            segment_id="SEG-SUMMARY-001",
            source_text="halo",
            source_language="id",
            target_language="en",
        )
        summary = RealtimeTurnSummaryBuilder.from_turn_plan(plan)
        self.assertEqual(summary.segment_id, "SEG-SUMMARY-001")
        self.assertFalse(summary.ready_for_next_stage)
        self.assertTrue(summary.fallback_active)
        self.assertIn("target", summary.latency_label)


if __name__ == "__main__":
    unittest.main()
