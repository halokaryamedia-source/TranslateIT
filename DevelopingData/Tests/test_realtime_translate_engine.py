from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend
from EngineData.TranslateEngine.realtime_latency_budget import RealtimeLatencyBudgetMonitor
from EngineData.TranslateEngine.realtime_quality_layer import RealtimeQualityLayer
from EngineData.TranslateEngine.realtime_status_presenter import RealtimeStatusPresenter
from EngineData.TranslateEngine.realtime_turn_planner import RealtimeTurnPlanner
from EngineData.TranslateEngine.translation_engine import TranslationEngine


class RealtimeTranslateEngineTests(unittest.TestCase):
    def test_quality_layer_never_allows_voice_replay(self) -> None:
        layer = RealtimeQualityLayer()
        result = layer.pre_tts_fast_pass(
            source_text="I will deploy the build tonight.",
            translated_text="Saya akan menyebarkan build malam ini.",
            source_language="en",
            target_language="id",
        )
        self.assertFalse(result.voice_replay_allowed)
        self.assertIn(result.status, {"Completed", "BudgetExceeded"})

    def test_post_output_observation_updates_future_context_only(self) -> None:
        layer = RealtimeQualityLayer()
        contract = layer.build_llm_reviewer_contract()
        self.assertFalse(contract["hot_path_allowed"])
        self.assertFalse(contract["voice_replay_allowed"])
        self.assertIn("context_terms", contract["allowed_outputs"])
        self.assertIn("second_voice_output", contract["blocked_outputs"])

    def test_latency_budget_monitor_flags_realtime_pass(self) -> None:
        report = RealtimeLatencyBudgetMonitor().evaluate(
            {
                "vad_ms": 5,
                "stt_partial_ms": 420,
                "mt_ms": 120,
                "quality_ms": 20,
                "tts_ms": 220,
                "output_buffer_ms": 40,
            }
        )
        self.assertEqual(report.status, "PASS")
        self.assertTrue(report.passed)
        self.assertLessEqual(report.actual_total_ms, report.target_total_ms)

    def test_latency_budget_monitor_flags_optimization_needed(self) -> None:
        report = RealtimeLatencyBudgetMonitor().evaluate(
            {
                "vad_ms": 5,
                "stt_partial_ms": 980,
                "mt_ms": 280,
                "quality_ms": 90,
                "tts_ms": 520,
                "output_buffer_ms": 120,
            }
        )
        self.assertEqual(report.status, "NEEDS_OPTIMIZATION")
        self.assertFalse(report.passed)

    def test_piper_tts_readiness_requires_executable_and_voice_model(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            piper_root = root / "piper"
            piper_root.mkdir(parents=True)
            voice = piper_root / "en_US-test.onnx"
            voice.write_bytes(b"placeholder")
            fake_exe = root / "piper.exe"
            fake_exe.write_bytes(b"placeholder")
            backend = PiperTTSBackend(model_root=root)
            with mock.patch.dict("os.environ", {"TRANSLATEIT_PIPER_EXE": str(fake_exe)}):
                capability = backend.dependency_status(language="en")
        self.assertTrue(capability.available)
        self.assertEqual(capability.mode, "local_tts_ready")
        self.assertTrue(capability.voice_model_path.endswith("en_US-test.onnx"))

    def test_turn_planner_keeps_voice_output_single_pass(self) -> None:
        planner = RealtimeTurnPlanner(
            translation_engine=TranslationEngine(),
            tts_backend=PiperTTSBackend(model_root=None),
        )
        plan = planner.plan_turn(
            segment_id="SEG-REALTIME-001",
            source_text="halo",
            source_language="id",
            target_language="en",
        )
        self.assertEqual(plan.translation.status, "Completed")
        self.assertFalse(plan.translation.voice_replay_allowed)
        self.assertTrue(plan.safe_single_voice_pass)
        self.assertFalse(plan.ready_for_tts)

    def test_status_presenter_outputs_ui_safe_card(self) -> None:
        planner = RealtimeTurnPlanner(
            translation_engine=TranslationEngine(),
            tts_backend=PiperTTSBackend(model_root=None),
        )
        plan = planner.plan_turn(
            segment_id="SEG-REALTIME-002",
            source_text="halo",
            source_language="id",
            target_language="en",
        )
        card = RealtimeStatusPresenter.from_turn_plan(plan)
        self.assertEqual(card.voice_policy_label, "Single voice pass")
        self.assertIn("piper-local-tts", card.model_label)
        self.assertIn(card.status, {"Ready", "Not Ready", "Needs Optimization", "TTS Unavailable"})


if __name__ == "__main__":
    unittest.main()
