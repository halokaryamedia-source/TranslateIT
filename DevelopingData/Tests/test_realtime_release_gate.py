from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.realtime_latency_sample_gate import RealtimeLatencySample
from EngineData.TranslateEngine.realtime_release_gate import RealtimeReleaseGate


class RealtimeReleaseGateTests(unittest.TestCase):
    def test_release_gate_is_not_ready_without_final_checks(self) -> None:
        samples = [RealtimeLatencySample(total_ms=900) for _ in range(5)]
        result = RealtimeReleaseGate(
            model_root=None,
            target_pc_validated=False,
            latency_samples=samples,
        ).evaluate()
        self.assertFalse(result.ready)
        self.assertIn("final_gate", result.payload)
        self.assertIn("latency_gate", result.payload)


if __name__ == "__main__":
    unittest.main()
