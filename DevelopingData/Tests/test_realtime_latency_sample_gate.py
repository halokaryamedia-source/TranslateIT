from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_latency_sample_gate import RealtimeLatencySample, RealtimeLatencySampleGate


class RealtimeLatencySampleGateTests(unittest.TestCase):
    def test_not_enough_samples_fails_gate(self) -> None:
        result = RealtimeLatencySampleGate(min_samples=5).evaluate([RealtimeLatencySample(total_ms=800)])
        self.assertFalse(result.passed)
        self.assertEqual(result.message, "not enough samples")

    def test_good_samples_pass_gate(self) -> None:
        samples = [
            RealtimeLatencySample(total_ms=820),
            RealtimeLatencySample(total_ms=900),
            RealtimeLatencySample(total_ms=950),
            RealtimeLatencySample(total_ms=1000),
            RealtimeLatencySample(total_ms=1100),
        ]
        result = RealtimeLatencySampleGate(target_ms=1250, min_samples=5).evaluate(samples)
        self.assertTrue(result.passed)
        self.assertLessEqual(result.p50_ms, 1250)


if __name__ == "__main__":
    unittest.main()
