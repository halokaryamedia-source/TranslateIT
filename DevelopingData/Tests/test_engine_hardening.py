from __future__ import annotations

import json
import io
import contextlib
import importlib.util
import unittest
from collections import defaultdict
import threading
import types
import tempfile
import copy
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import mock

import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.LauncherApp.latency_meter import MetricTrace
from EngineData.LauncherApp import app_main
from EngineData.LauncherApp.app_main import PrototypeRuntime, TranslateITWindow
from EngineData.LauncherApp.app_config import PROJECT_ROOT, EngineConfig, load_default_config
from EngineData.LauncherApp import live_pipeline
from EngineData.LauncherApp import app_logger
from EngineData.LauncherApp.ui_state import UIState
from EngineData.LauncherApp.language_routing import normalize_language_code, should_translate_segment, is_focus_language
from EngineData.LauncherApp.latency_profile import build_latency_profile_payload, resolve_safe_vad_preset
from EngineData.LauncherApp.latency_report_reader import summarize_latency_report
from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.TranscriptEngine.benchmark_metrics import build_summary
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.LauncherApp.session_reporting import build_engine_health_payload, build_metric_groups, build_model_runtime_optimization_payload, build_playback_health_payload, build_text_latency_payload, build_worker_health_payload, write_benchmark_reports
from EngineData.LauncherApp.session_reporting import build_issue_triage_payload
from EngineData.LauncherApp.session_reporting import build_stt_optimization_payload
from EngineData.TranscriptEngine.transcript_segment import MetricMetrics, ReplayPaths, TranscriptSegment
from EngineData.TranscriptEngine.transcript_session import TranscriptSession
from EngineData.TranscriptEngine.asr_model_loader import ASRModelLoader
from EngineData.TranscriptEngine.audio_noise_filter import AudioNoiseFilter, NoiseThresholds
from EngineData.TranslateEngine.translation_engine import TranslationEngine, TranslationRequest


class EngineHardeningTests(unittest.TestCase):
    def test_metric_metrics_round_trip_preserves_values(self) -> None:
        metrics = MetricMetrics(
            speech_start_time="2026-06-01T10:00:00+07:00",
            speech_start_to_first_voice_output_ms=1450,
            has_audio=True,
        )
        payload = metrics.to_dict()
        self.assertEqual(payload["speech_start_to_first_voice_output_ms"], 1450)
        self.assertTrue(payload["has_audio"])
        restored = MetricMetrics.from_dict(payload)
        self.assertEqual(restored.speech_start_to_first_voice_output_ms, 1450)
        self.assertEqual(MetricMetrics().tts_queue_depth, 0)
        self.assertEqual(MetricMetrics().tts_pending_jobs_remaining, 0)

    def test_transcript_segment_aliases_preserve_canonical_text(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo coba bicara",
            translated_text="Hello, try speaking",
            trace_id="trace-SEG1",
        )
        self.assertEqual(segment.text, "Halo coba bicara")
        self.assertEqual(segment.transcript, "Halo coba bicara")
        self.assertEqual(segment.translation, "Hello, try speaking")
        self.assertEqual(segment.target_text, "Hello, try speaking")
        self.assertEqual(segment.id, "SEG1")
        self.assertEqual(segment.trace_id, "trace-SEG1")

    def test_transcript_session_saved_audio_names_are_segment_scoped(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            saved_root = root / "saved"
            source_a = root / "a.wav"
            source_b = root / "nested" / "a.wav"
            source_b.parent.mkdir(parents=True, exist_ok=True)
            source_a.write_bytes(b"a")
            source_b.write_bytes(b"b")

            session = TranscriptSession(
                session_id="S1",
                segments=[
                    TranscriptSegment(
                        segment_id="SEG1",
                        session_id="S1",
                        input_language="id",
                        output_language="en",
                        start_time_ms=0,
                        end_time_ms=1000,
                        input_text="Halo",
                        translated_text="Hello",
                        replay=ReplayPaths(source_audio_path=source_a, translated_audio_path=source_b),
                    ),
                    TranscriptSegment(
                        segment_id="SEG2",
                        session_id="S1",
                        input_language="id",
                        output_language="en",
                        start_time_ms=0,
                        end_time_ms=1000,
                        input_text="Dua",
                        translated_text="Two",
                        replay=ReplayPaths(source_audio_path=source_b),
                    ),
                ],
            )

            planned = session.planned_save_items(saved_root)
            planned_names = [path.name for path in planned if path.name != "S1.json"]
            self.assertIn("SEG1-source.wav", planned_names)
            self.assertIn("SEG1-translated.wav", planned_names)
            self.assertIn("SEG2-source.wav", planned_names)
            self.assertEqual(len(planned_names), len(set(planned_names)))

            copied = session.copy_replay_audio_to_saved(saved_root)
            copied_names = [path.name for path in copied]
            self.assertEqual(sorted(copied_names), sorted(planned_names))
            self.assertEqual((saved_root / "SavedTranscript" / "S1" / "audio" / "SEG1-source.wav").read_bytes(), b"a")
            self.assertEqual((saved_root / "SavedTranscript" / "S1" / "audio" / "SEG1-translated.wav").read_bytes(), b"b")
            self.assertEqual((saved_root / "SavedTranscript" / "S1" / "audio" / "SEG2-source.wav").read_bytes(), b"b")

    def test_transcript_card_view_model_disables_missing_audio_replay(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            missing_source = root / "missing-source.wav"
            missing_translation = root / "missing-translation.wav"
            segment = TranscriptSegment(
                segment_id="SEG-MISSING",
                session_id="S1",
                input_language="id",
                output_language="en",
                start_time_ms=0,
                end_time_ms=1000,
                input_text="Halo",
                translated_text="Hello",
                replay=ReplayPaths(
                    source_audio_path=missing_source,
                    translated_audio_path=missing_translation,
                    source_replay_available=False,
                    target_voice_available=False,
                ),
            )

            view_model = TranscriptCardViewModel.from_segment(segment)
            self.assertFalse(view_model.can_replay_source)
            self.assertFalse(view_model.can_replay_translation)

    def test_transcript_card_view_model_uses_safe_placeholders(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="",
            translated_text="",
        )
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.source_text, "[no transcript text]")
        self.assertEqual(view_model.translated_text, "[Translation pending local model]")
        self.assertEqual(view_model.total_latency_label, "Latency unavailable")

    def test_transcript_card_view_model_prefers_speech_end_to_voice_proxy_latency(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_end_to_voice_proxy_ms = 394
        segment.latency.speech_start_to_first_voice_output_ms = 1200
        segment.latency.latency_ms = 1600
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "394 ms")

    def test_transcript_card_view_model_does_not_fake_zero_latency(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "Latency unavailable")

    def test_transcript_card_view_model_does_not_show_tts_only_completion_as_total_latency(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_voice_completed_ms = 980
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "Latency unavailable")

    def test_transcript_card_view_model_does_not_fallback_to_other_latency_fields(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_start_to_first_voice_output_ms = 1200
        segment.latency.latency_ms = 1600
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "Latency unavailable")
        self.assertEqual(app_main._format_transcript_card_latency_label(segment.latency), "Latency unavailable")

    def test_metric_trace_summary_uses_preserved_timing(self) -> None:
        trace = MetricTrace(session_id="S1", segment_id="SEG1")
        trace.mark_at("speech_start", 1_000_000_000, "test")
        trace.mark_at("speech_end", 2_000_000_000, "test")
        trace.mark_at("actual_first_audio_buffer_played", 3_750_000_000, "test")
        trace.build_summary()
        self.assertEqual(trace.official_metrics["speech_duration_ms"], 1000)
        self.assertEqual(trace.official_metrics["total_realtime_ms"], 2750)
        self.assertEqual(trace.official_metrics["measurement_status"], "MEASURED")

    def test_transcript_card_view_model_matches_summary_proxy_latency(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_end_to_voice_proxy_ms = 959
        segment.latency.speech_start_to_first_voice_output_ms = 775
        segment.latency.latency_ms = 775
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "959 ms")
        self.assertEqual(app_main._format_transcript_card_latency_label(segment.latency), "959 ms")

    def test_latency_details_view_model_uses_real_breakdown_rows_and_omits_delay_after_speech_end(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_duration_ms = 1120
        segment.latency.speech_start_to_first_voice_output_ms = 828
        segment.latency.latency_ms = 828
        segment.latency.speech_end_to_voice_proxy_ms = 828
        segment.latency.endpoint_wait_ms = 95
        segment.latency.speech_confirmation_ms = 17
        segment.latency.capture_buffer_ms = 8
        segment.latency.silence_accumulation_ms = 70
        segment.latency.asr_latency_ms = 371
        segment.latency.asr_queue_wait_ms = 11
        segment.latency.asr_audio_prepare_ms = 12
        segment.latency.asr_model_inference_ms = 211
        segment.latency.asr_decode_finalize_ms = 9
        segment.latency.translation_latency_ms = 162
        segment.latency.translation_queue_wait_ms = 6
        segment.latency.translation_prepare_ms = 5
        segment.latency.translation_model_inference_ms = 148
        segment.latency.translation_finalize_ms = 4
        segment.latency.tts_direct_speak_called_ms = 24
        segment.latency.tts_voice_start_proxy_ms = 24
        segment.latency.tts_voice_completed_ms = 48
        segment.latency.tts_process_start_overhead_ms = 1

        view_model = app_main._build_latency_details_view_model(segment)
        summary_labels = [label for label, _, _ in view_model["summary_items"]]
        self.assertEqual(summary_labels, ["Speech Duration", "Latency"])
        self.assertNotIn("Delay After Speech End", summary_labels)
        self.assertEqual(view_model["summary_items"][1][1], "828 ms")

        sections = {str(section["title"]): section for section in view_model["sections"]}
        self.assertEqual(
            [row[0] for row in sections["Audio Verify"]["rows"]],
            ["Endpoint Wait", "Speech Confirmation", "Capture Buffer", "Silence Accumulation"],
        )
        self.assertEqual(
            [row[0] for row in sections["STT"]["rows"]],
            ["Queue Wait", "Audio Prepare", "Model Inference", "Decode Finalize"],
        )
        self.assertEqual(
            [row[0] for row in sections["Translate"]["rows"]],
            ["Queue Wait", "Model Prepare", "Model Inference", "Finalize"],
        )
        self.assertEqual(
            [row[0] for row in sections["TTS"]["rows"]],
            ["Direct Speak Called", "Playback Wait", "Voice Start Proxy", "Voice Completed", "Process Start Overhead"],
        )
        self.assertEqual(sections["Audio Verify"]["rows"][0][1], 95)
        self.assertEqual(sections["STT"]["rows"][2][1], 211)
        self.assertEqual(sections["Translate"]["rows"][2][1], 148)
        self.assertEqual(sections["TTS"]["rows"][1][0], "Playback Wait")
        self.assertEqual(sections["TTS"]["rows"][1][1], 176)
        self.assertNotIn("Alignment Gap", sections)
        self.assertEqual(sum(int(section["total_ms"]) for section in view_model["sections"]), 828)
        self.assertEqual(
            sum(int(section["total_ms"]) for section in view_model["sections"] if section["title"] != "TTS"),
            628,
        )

    def test_session_reporting_preserves_real_metric_values(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_duration_ms = 1000
        segment.latency.speech_start_to_first_voice_output_ms = 2750
        segment.latency.endpoint_wait_ms = 600
        segment.latency.asr_latency_ms = 250
        segment.latency.translation_latency_ms = 500
        segment.latency.tts_voice_start_proxy_ms = 800
        segment.latency.tts_voice_completed_ms = 1400
        segment.latency.tts_process_start_overhead_ms = 90
        segment.latency.speech_end_to_voice_proxy_ms = 1400
        segment.latency.metric_trace["official_trace_obj"] = MetricTrace(session_id="S1", segment_id="SEG1")
        segment.latency.metric_trace["official_trace_obj"].mark_at("speech_start", 1_000_000_000, "test")
        segment.latency.metric_trace["official_trace_obj"].mark_at("actual_first_audio_buffer_played", 3_750_000_000, "test")

        groups = build_metric_groups(segment)
        self.assertEqual(groups["speech_duration_ms"], 1000)
        self.assertEqual(groups["total_latency_ms"], 2750)
        self.assertEqual(groups["stt_ms"], 250)
        self.assertEqual(groups["translate_ms"], 500)
        self.assertEqual(groups["input_latency_budget_ms"], 1350)
        self.assertEqual(groups["output_latency_budget_ms"], 1400)
        self.assertEqual(groups["io_latency_budget_ms"], 2750)
        self.assertEqual(groups["speech_end_to_voice_proxy_ms"], 1400)
        payload = build_text_latency_payload(segment, session_id="S1")
        self.assertEqual(payload["total_realtime_ms"], 2750)
        self.assertEqual(payload["measurement_status"], "MEASURED")
        self.assertEqual(payload["input_latency_budget_ms"], 1350)
        self.assertEqual(payload["output_latency_budget_ms"], 1400)
        self.assertEqual(payload["io_latency_budget_ms"], 2750)
        self.assertEqual(payload["voice_start_proxy_ms"], 800)
        self.assertEqual(payload["voice_completed_ms"], 1400)
        self.assertEqual(payload["process_start_overhead_ms"], 90)
        self.assertEqual(payload["speech_end_to_voice_proxy_ms"], 1400)
        self.assertIn("measurement=MEASURED", payload["issue_summary"])
        self.assertIn("bottleneck=TTS", payload["issue_summary"])
        self.assertEqual(payload["issue_signals"]["primary_stage"], "TTS")
        self.assertIn("voice_signal=proxy", payload["issue_signals"]["triage_hint"])

    def test_benchmark_summary_detects_bottleneck(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_start_to_first_voice_output_ms = 2400
        segment.latency.asr_latency_ms = 120
        segment.latency.translation_latency_ms = 220
        segment.latency.tts_playback_start_ms = 980
        summary = build_summary([segment])
        self.assertEqual(summary.main_bottleneck_stage, "TTS")
        self.assertEqual(summary.segment_count, 1)

    def test_latency_report_reader_summarizes_latest_report(self) -> None:
        summary = summarize_latency_report(
            {
                "metric_groups": {
                    "speech_start_to_first_voice_ms": 2400,
                    "delay_after_speech_end_ms": 1300,
                    "stt_ms": 120,
                    "translate_ms": 220,
                    "main_bottleneck_stage": "TTS",
                },
                "text_latency": {"total_realtime_ms": 2400},
                "segment": {"latency": {"speech_confirmation_ms": 170, "tts_request_start_ms": 25, "tts_voice_start_proxy_ms": 31, "tts_voice_completed_ms": 980, "tts_process_start_overhead_ms": 18, "tts_voice_generate_ms": 980, "tts_playback_start_ms": 31, "tts_direct_speak_called_ms": 31, "tts_queue_depth": 2, "tts_pending_jobs_remaining": 1, "tts_backend_name": "sapi_direct_async", "tts_backend_selected": "sapi_direct_async", "tts_backend_fallback_reason": "", "speech_end_to_voice_proxy_ms": 31}},
            }
        )
        self.assertEqual(summary.speech_start_to_first_voice_proxy_ms, 2400)
        self.assertEqual(summary.translation_ms, 220)
        self.assertEqual(summary.main_bottleneck_stage, "TTS")
        self.assertEqual(summary.tts_backend_name, "sapi_direct_async")
        self.assertEqual(summary.tts_request_start_ms, 25)
        self.assertEqual(summary.tts_direct_speak_called_ms, 31)
        self.assertEqual(summary.voice_start_proxy_ms, 31)
        self.assertEqual(summary.voice_completed_ms, 980)
        self.assertEqual(summary.process_start_overhead_ms, 18)
        self.assertEqual(summary.speech_end_to_voice_proxy_ms, 31)
        self.assertEqual(summary.tts_queue_depth, 2)
        self.assertEqual(summary.tts_pending_jobs_remaining, 1)
        self.assertEqual(summary.tts_audio_ready_ms, 980)
        self.assertEqual(summary.tts_backend_is_streaming, "no")
        self.assertEqual(summary.first_voice_out_is_real_or_proxy, "proxy")
        self.assertEqual(summary.health_overview_status, "unknown")
        self.assertEqual(summary.health_overview_stage, "Unknown")
        self.assertEqual(summary.issue_status, "unknown")
        self.assertEqual(summary.issue_summary, "")

    def test_latency_report_reader_handles_missing_fields(self) -> None:
        summary = summarize_latency_report({})
        self.assertEqual(summary.tts_backend_name, "")
        self.assertIsNone(summary.speech_start_to_first_voice_proxy_ms)
        markdown = summary.to_markdown()
        self.assertIn("unavailable", markdown)
        self.assertNotIn("0 ms", markdown)

    def test_latency_report_reader_uses_unavailable_label_without_fake_zero(self) -> None:
        summary = summarize_latency_report(
            {
                "segment": {"latency": {}},
                "metric_groups": {},
                "text_latency": {},
            }
        )
        self.assertEqual(summary.tts_backend_is_streaming, "unavailable")
        self.assertEqual(summary.first_voice_out_is_real_or_proxy, "unavailable")
        self.assertIsNone(summary.input_latency_budget_ms)
        self.assertIsNone(summary.output_latency_budget_ms)
        self.assertIsNone(summary.io_latency_budget_ms)
        self.assertNotIn("0 ms", summary.to_markdown())

    def test_latency_report_reader_surfaces_issue_summary_from_payload(self) -> None:
        summary = summarize_latency_report(
            {
                "metric_groups": {
                    "issue_summary": "measurement=MEASURED; bottleneck=TTS; missing_latency=123ms",
                    "issue_signals": {
                        "status": "accepted",
                        "primary_stage": "TTS",
                        "triage_hint": "measurement=MEASURED; bottleneck=TTS; missing_latency=123ms",
                    },
                },
                "text_latency": {
                    "issue_summary": "measurement=MEASURED; bottleneck=TTS; missing_latency=123ms",
                    "issue_signals": {
                        "status": "accepted",
                        "primary_stage": "TTS",
                        "triage_hint": "measurement=MEASURED; bottleneck=TTS; missing_latency=123ms",
                    },
                },
                "segment": {"latency": {"tts_backend_selected": "sapi_direct_async"}},
            }
        )
        self.assertEqual(summary.issue_status, "accepted")
        self.assertEqual(summary.health_overview_status, "accepted")
        self.assertEqual(summary.health_overview_stage, "TTS")
        self.assertEqual(summary.issue_summary, "measurement=MEASURED; bottleneck=TTS; missing_latency=123ms")
        self.assertEqual(summary.health_overview_note, "Use health_overview first: it combines engine health, playback health, and issue triage without changing runtime behavior.")
        self.assertEqual(summary.playback_failure_stage, "unknown")
        self.assertEqual(summary.playback_failure_reason, "")
        self.assertEqual(summary.playback_health_note, "")
        self.assertIn("Issue summary: measurement=MEASURED; bottleneck=TTS; missing_latency=123ms", summary.to_markdown())
        self.assertIn("Health overview status: accepted", summary.to_markdown())
        self.assertNotIn(
            "Issue summary: measurement=MEASURED; bottleneck=TTS; missing_latency=123ms",
            summary.to_markdown().split("## Issue Triage", 1)[1],
        )

    def test_issue_triage_payload_is_concise_and_actionable(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-TRIAGE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_duration_ms = 1000
        segment.latency.speech_start_to_first_voice_output_ms = 2400
        segment.latency.asr_latency_ms = 120
        segment.latency.translation_latency_ms = 220
        segment.latency.tts_voice_start_proxy_ms = 980
        payload = build_issue_triage_payload(segment)
        self.assertEqual(payload["segment_id"], "SEG-TRIAGE")
        self.assertIn("primary_stage", payload)
        self.assertIn("issue_status", payload)
        self.assertIn("triage_note", payload)
        self.assertIn("preserved latency metrics only", payload["triage_note"])
        self.assertTrue(payload["triage_points"])
        self.assertIn("bottleneck", "; ".join(payload["triage_points"]))

    def test_engine_health_payload_exposes_diagnosis_fields(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-HEALTH",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_duration_ms = 1000
        segment.latency.speech_start_to_first_voice_output_ms = 2400
        segment.latency.asr_latency_ms = 120
        segment.latency.translation_latency_ms = 220
        segment.latency.tts_voice_start_proxy_ms = 980
        health = build_engine_health_payload(segment)
        playback = build_playback_health_payload(segment)
        self.assertIn("issue_summary", health)
        self.assertIn("issue_primary_stage", health)
        self.assertIn("issue_note", health)
        self.assertIn("health_overview", health)
        self.assertIn("playback_note", playback)
        self.assertIn("playback_issue_summary", playback)
        self.assertIn("playback_issue_status", playback)
        self.assertIn("playback_failure_stage", playback)
        self.assertIn("playback_failure_reason", playback)
        self.assertIn("playback_health_note", playback)
        self.assertIn("health_overview", playback)
        self.assertTrue(playback["playback_issue_summary"] or playback["issue_summary"])
        self.assertEqual(playback["playback_failure_stage"], "healthy")
        self.assertTrue(playback["playback_health_note"])
        self.assertIn("health_overview first", health["health_overview"]["note"])
        self.assertIn("health_overview first", playback["health_overview"]["note"])

    def test_latency_report_reader_surfaces_playback_failure_details_from_payload(self) -> None:
        summary = summarize_latency_report(
            {
                "playback_failure_stage": "playback_backend",
                "playback_failure_reason": "Playback backend did not start.",
                "playback_health_note": "Use playback_failure_stage first, then issue_primary_stage if playback is blocked upstream.",
                "segment": {"latency": {"tts_backend_selected": "sapi_direct_async"}},
            }
        )
        self.assertEqual(summary.playback_failure_stage, "playback_backend")
        self.assertEqual(summary.playback_failure_reason, "Playback backend did not start.")
        self.assertIn("Playback failure stage: playback_backend", summary.to_markdown())

    def test_latency_report_reader_does_not_claim_proxy_without_voice_metrics(self) -> None:
        summary = summarize_latency_report(
            {
                "segment": {"latency": {"tts_backend_selected": "sapi_direct_async"}},
                "metric_groups": {},
                "text_latency": {},
            }
        )
        self.assertEqual(summary.tts_backend_is_streaming, "no")
        self.assertEqual(summary.first_voice_out_is_real_or_proxy, "proxy")

    def test_latency_report_reader_reads_segment_asr_and_translation_ms(self) -> None:
        summary = summarize_latency_report(
            {
                "segment": {
                    "latency": {
                        "asr_ms": 531,
                        "translation_ms": 174,
                        "tts_voice_start_proxy_ms": 410,
                        "speech_end_to_voice_proxy_ms": 1490,
                    }
                },
                "metric_groups": {},
                "text_latency": {},
            }
        )
        self.assertEqual(summary.asr_ms, 531)
        self.assertEqual(summary.translation_ms, 174)
        self.assertEqual(summary.voice_start_proxy_ms, 410)

    def test_transcript_card_view_model_explains_voice_proxy_distinction(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_voice_start_proxy_ms = 410
        segment.latency.speech_end_to_voice_proxy_ms = 1490
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertIn("First voice output: 410 ms", view_model.latency_detail_label)
        self.assertIn("Speech end to first voice: 1490 ms", view_model.latency_detail_label)

    def test_manual_latency_review_helper_reports_ui_report_match(self) -> None:
        helper_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "manual_latency_review_helper.py"
        spec = importlib.util.spec_from_file_location("manual_latency_review_helper", helper_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        helper_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper_module)

        report_data = {
            "segment": {
                "segment_id": "SEG1",
                "session_id": "S1",
                "input_language": "id",
                "output_language": "en",
                "start_time_ms": 0,
                "end_time_ms": 1000,
                "input_text": "Halo",
                "translated_text": "Hello",
                "latency": {
                    "speech_end_to_voice_proxy_ms": 394,
                    "speech_start_to_first_voice_output_ms": 1200,
                    "latency_ms": 1600,
                },
            },
            "text_latency": {
                "speech_end_to_voice_proxy_ms": 394,
                "speech_end_time": "2026-06-02T11:08:51.790+07:00",
                "voice_start_proxy_time": "2026-06-02T11:08:52.184+07:00",
            },
            "metric_groups": {
                "speech_end_to_voice_proxy_ms": 394,
            },
        }
        output = helper_module.build_review_output(report_data)
        self.assertEqual(output["ui_latency_label"], "394 ms")
        self.assertEqual(output["report_latency_label"], "394 ms")
        self.assertTrue(output["ui_report_latency_match"])
        self.assertEqual(output["speech_end_to_voice_proxy_ms"], 394)

    def test_latency_optimizer_review_reports_largest_bottleneck_and_safe_profile(self) -> None:
        review_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "latency_optimizer_review.py"
        spec = importlib.util.spec_from_file_location("latency_optimizer_review", review_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        review_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(review_module)

        report_data = {
            "text_latency": {
                "speech_end_to_voice_proxy_ms": 2494,
                "speech_end_time": "2026-06-02T11:27:54.562+07:00",
                "voice_start_proxy_time": "2026-06-02T11:27:57.056+07:00",
                "output_latency_budget_ms": 2494,
                "voice_start_proxy_ms": 377,
            },
            "audio_verify_breakdown": {"ms": 170},
            "stt_breakdown": {"ms": 527},
            "translate_breakdown": {"ms": 128},
            "tts_breakdown": {"ms": 377},
            "segment": {
                "latency": {
                    "endpoint_wait_ms": 170,
                    "asr_ms": 527,
                    "translation_ms": 128,
                    "speech_end_to_voice_proxy_ms": 2494,
                    "tts_voice_start_proxy_ms": 377,
                    "tts_audio_ready_ms": 377,
                }
            },
        }

        output = review_module.build_review_output(report_data, requested_vad_preset="Developer Raw")
        self.assertEqual(output["largest_remaining_bottleneck_stage"], "ASR")
        self.assertEqual(output["largest_remaining_bottleneck_ms"], 527)
        self.assertEqual(output["largest_remaining_bottleneck_source"], "asr_ms")
        self.assertEqual(output["selected_vad_preset"], "Headset")
        self.assertTrue(output["unsafe_vad_replaced"])
        self.assertTrue(output["profile_is_safe"])

    def test_benchmark_panel_and_latency_dialog_use_unavailable_labels(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                session=SimpleNamespace(
                    benchmark_summary=mock.Mock(
                        return_value=SimpleNamespace(
                            completed_segments=1,
                            segment_count=1,
                            total_after_eos=SimpleNamespace(p50_ms=None, p95_ms=None, worst_ms=None),
                            average_asr_ms=0,
                            average_translation_ms=0,
                            segments=[segment],
                        )
                    ),
                    segments=[segment],
                )
            ),
            benchmark_label=SimpleNamespace(setText=mock.Mock()),
            status_labels={"Benchmark": SimpleNamespace(setText=mock.Mock())},
            _build_transcript_card_view_model=mock.Mock(return_value=TranscriptCardViewModel.from_segment(segment)),
        )

        TranslateITWindow.update_benchmark_panel(window)

        self.assertIn("unavailable", window.benchmark_label.setText.call_args.args[0].lower())

    def test_benchmark_panel_survives_missing_total_after_eos(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                session=SimpleNamespace(
                    benchmark_summary=mock.Mock(
                        return_value=SimpleNamespace(
                            completed_segments=1,
                            segment_count=1,
                            average_asr_ms=0,
                            average_translation_ms=0,
                            segments=[segment],
                        )
                    ),
                    segments=[segment],
                ),
                rejected_count=0,
            ),
            benchmark_label=SimpleNamespace(setText=mock.Mock()),
            status_labels={"Benchmark": SimpleNamespace(setText=mock.Mock())},
            _build_transcript_card_view_model=mock.Mock(return_value=TranscriptCardViewModel.from_segment(segment)),
        )

        TranslateITWindow.update_benchmark_panel(window)

        self.assertIn("unavailable", window.benchmark_label.setText.call_args.args[0].lower())

    def test_latency_profile_rejects_unsafe_vad_values(self) -> None:
        self.assertEqual(resolve_safe_vad_preset("Developer Raw"), "Headset")
        payload = build_latency_profile_payload(
            requested_vad_preset="Developer Raw",
            metric_groups={"main_bottleneck_stage": "TTS", "tts_ms": 394},
        )
        self.assertEqual(payload["selected_vad_preset"], "Headset")
        self.assertTrue(payload["unsafe_vad_replaced"])
        self.assertTrue(payload["profile_is_safe"])
        self.assertEqual(payload["largest_remaining_bottleneck_stage"], "TTS")
        self.assertEqual(payload["largest_remaining_bottleneck_ms"], 394)

    def test_normal_room_vad_is_responsive_for_short_speech(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=260,
            silence_ms=160,
            speech_duration_ms=180,
            speech_confirmed=True,
            rms=0.014,
            noise_floor_rms=0.003,
            clipping_risk=0.0,
            noise_risk=0.0,
            echo_match=False,
        )
        self.assertTrue(decision.accepted)
        self.assertEqual(vad.preset.name, "Headset")
        self.assertEqual(vad.preset.minimum_speech_duration_ms, 100)
        self.assertEqual(vad.preset.minimum_silence_duration_ms, 80)

    def test_headset_vad_rejects_low_focus_background_like_speech(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=980,
            silence_ms=170,
            speech_duration_ms=620,
            speech_confirmed=True,
            rms=0.0062,
            peak=0.010,
            noise_floor_rms=0.0041,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0007,
            voiced_frame_ratio=0.012,
            echo_match=False,
        )
        self.assertFalse(decision.accepted)
        self.assertIn(decision.reason, {"Low speech focus", "Noise-like segment"})

    def test_headset_vad_rejects_noise_like_segment(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=240,
            silence_ms=140,
            speech_duration_ms=150,
            speech_confirmed=True,
            rms=0.0058,
            peak=0.012,
            noise_floor_rms=0.004,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0014,
            voiced_frame_ratio=0.028,
            zero_crossing_rate=0.09,
            echo_match=False,
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Noise-like segment", decision.reason)

    def test_audio_evidence_rejects_impulsive_keyboard_like_noise(self) -> None:
        samples = np.zeros(3200, dtype=np.float32)
        samples[320:325] = 0.28
        samples[900:904] = -0.24
        samples[1540:1543] = 0.26
        evidence = live_pipeline._audio_evidence(samples, 0.0038, "Normal")
        self.assertEqual(evidence["reason"], "rejected_noise_like_impulse")
        self.assertGreater(float(evidence["peak_to_rms_ratio"]), 8.0)
        self.assertGreater(float(evidence["frame_energy_concentration"]), 0.80)

    def test_audio_evidence_accepts_quiet_but_voiced_headset_speech(self) -> None:
        samples = np.zeros(3200, dtype=np.float32)
        samples[120:280] = 0.0068
        samples[420:660] = -0.0062
        samples[860:1120] = 0.0065
        evidence = live_pipeline._audio_evidence(samples, 0.0038, "Headset")
        self.assertEqual(evidence["reason"], "")
        self.assertGreater(float(evidence["voiced_frame_ratio"]), 0.10)

    def test_short_id_focus_text_normalization_rewrites_common_english_fillers(self) -> None:
        from EngineData.LauncherApp.language_routing import normalize_short_id_focus_source_text

        normalized = normalize_short_id_focus_source_text(
            "Check, coba bicara.",
            source_language="id",
            target_language="en",
        )
        self.assertEqual(normalized, "cek coba bicara")

    def test_headset_vad_accepts_clear_speech_with_focus_metrics(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=980,
            silence_ms=170,
            speech_duration_ms=620,
            speech_confirmed=True,
            rms=0.014,
            peak=0.045,
            noise_floor_rms=0.003,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.008,
            voiced_frame_ratio=0.12,
            peak_to_rms_ratio=3.2,
            frame_energy_concentration=0.42,
            frame_active_ratio=0.51,
            impulse_edge_ratio=0.02,
            echo_match=False,
        )
        self.assertTrue(decision.accepted)
        self.assertEqual(decision.reason, "Accepted")

    def test_headset_vad_accepts_voiced_but_quiet_speech(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=620,
            silence_ms=120,
            speech_duration_ms=420,
            speech_confirmed=True,
            rms=0.0021,
            peak=0.0048,
            noise_floor_rms=0.0019,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0003,
            voiced_frame_ratio=0.21,
            peak_to_rms_ratio=2.3,
            frame_energy_concentration=0.34,
            frame_active_ratio=0.58,
            impulse_edge_ratio=0.01,
            echo_match=False,
        )
        self.assertTrue(decision.accepted)
        self.assertEqual(decision.reason, "Accepted")

    def test_asr_quality_filter_accepts_short_but_clear_speech(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Halo coba bicara",
                audio_rms=0.016,
                audio_peak=0.05,
                speech_to_noise_gap=0.008,
                voiced_frame_ratio=0.12,
                audio_duration_ms=780,
                sustained_speech_ms=160,
                no_speech_probability=0.05,
                average_log_probability=-0.2,
                compression_ratio=1.2,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertTrue(decision.accepted)

    def test_asr_quality_filter_rejects_gibberish_short_output(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="queqwewe",
                audio_rms=0.015,
                audio_peak=0.05,
                speech_to_noise_gap=0.007,
                voiced_frame_ratio=0.10,
                audio_duration_ms=890,
                sustained_speech_ms=180,
                no_speech_probability=0.09,
                average_log_probability=-0.24,
                compression_ratio=1.1,
                language_probability=0.31,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Nonsense transcript", decision.reason)

    def test_asr_quality_filter_rejects_generic_short_gibberish_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="zqvraxel murni",
                audio_rms=0.014,
                audio_peak=0.045,
                speech_to_noise_gap=0.0065,
                voiced_frame_ratio=0.09,
                audio_duration_ms=840,
                sustained_speech_ms=160,
                no_speech_probability=0.07,
                average_log_probability=-0.22,
                compression_ratio=1.05,
                language_probability=0.33,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Nonsense transcript", decision.reason)

    def test_asr_quality_filter_rejects_looping_uncertain_hallucination(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="I'm going to say, I'm going to say, I'm going to say, I'm going to say.",
                audio_rms=0.008,
                audio_peak=0.014,
                speech_to_noise_gap=0.003,
                voiced_frame_ratio=0.07,
                audio_duration_ms=2200,
                sustained_speech_ms=200,
                no_speech_probability=0.24,
                average_log_probability=-0.22,
                compression_ratio=1.1,
                language_probability=0.41,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Looping/uncertain", decision.reason)

    def test_asr_quality_filter_rejects_long_repeated_looping_transcript(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        repeated = " ".join(["I will say that"] * 24)
        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text=repeated,
                audio_rms=0.021,
                audio_peak=0.053,
                speech_to_noise_gap=0.010,
                voiced_frame_ratio=0.23,
                audio_duration_ms=2200,
                sustained_speech_ms=1800,
                no_speech_probability=0.01,
                average_log_probability=-0.02,
                compression_ratio=1.02,
                language_probability=0.98,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Looping/uncertain", decision.reason)

    def test_asr_quality_filter_rejects_known_noise_hallucination_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="I'm going to use the same language.",
                audio_rms=0.008,
                audio_peak=0.014,
                speech_to_noise_gap=0.003,
                voiced_frame_ratio=0.07,
                audio_duration_ms=1600,
                sustained_speech_ms=220,
                no_speech_probability=0.22,
                average_log_probability=-0.17,
                compression_ratio=1.06,
                language_probability=0.44,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertTrue(
            "Hallucination" in decision.reason or "Low-speech hallucination" in decision.reason,
            decision.reason,
        )

    def test_asr_quality_filter_rejects_thank_you_for_watching_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Thank you for watching this video.",
                audio_rms=0.007,
                audio_peak=0.013,
                speech_to_noise_gap=0.0025,
                voiced_frame_ratio=0.06,
                audio_duration_ms=1500,
                sustained_speech_ms=180,
                no_speech_probability=0.21,
                average_log_probability=-0.19,
                compression_ratio=1.05,
                language_probability=0.40,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertTrue(
            "Hallucination" in decision.reason or "Low-speech hallucination" in decision.reason,
            decision.reason,
        )

    def test_asr_quality_filter_rejects_dont_forget_to_subscribe_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Don't forget to subscribe.",
                audio_rms=0.0075,
                audio_peak=0.014,
                speech_to_noise_gap=0.0026,
                voiced_frame_ratio=0.06,
                audio_duration_ms=1400,
                sustained_speech_ms=170,
                no_speech_probability=0.20,
                average_log_probability=-0.18,
                compression_ratio=1.04,
                language_probability=0.42,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertTrue(
            "Hallucination" in decision.reason or "Low-speech hallucination" in decision.reason,
            decision.reason,
        )

    def test_asr_quality_filter_rejects_see_you_next_time_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="See you next time.",
                audio_rms=0.0072,
                audio_peak=0.013,
                speech_to_noise_gap=0.0024,
                voiced_frame_ratio=0.06,
                audio_duration_ms=1300,
                sustained_speech_ms=160,
                no_speech_probability=0.19,
                average_log_probability=-0.17,
                compression_ratio=1.03,
                language_probability=0.38,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertTrue(
            "Hallucination" in decision.reason or "Low-speech hallucination" in decision.reason,
            decision.reason,
        )

    def test_asr_quality_filter_rejects_impulse_like_table_knock_transcript(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="I'm a writer of the book.",
                audio_rms=0.009,
                audio_peak=0.031,
                peak_to_rms_ratio=6.4,
                speech_to_noise_gap=0.004,
                voiced_frame_ratio=0.07,
                audio_duration_ms=1120,
                sustained_speech_ms=140,
                no_speech_probability=0.12,
                average_log_probability=-0.18,
                compression_ratio=1.03,
                language_probability=0.48,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
                zero_crossing_rate=0.09,
                frame_energy_concentration=0.86,
                frame_active_ratio=0.23,
                impulse_edge_ratio=0.06,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Impulse", decision.reason)

    def test_asr_quality_filter_rejects_stationary_noise_transcript(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="The fan is on.",
                audio_rms=0.0064,
                audio_peak=0.019,
                peak_to_rms_ratio=2.6,
                speech_to_noise_gap=0.0018,
                voiced_frame_ratio=0.05,
                audio_duration_ms=1320,
                sustained_speech_ms=240,
                no_speech_probability=0.10,
                average_log_probability=-0.16,
                compression_ratio=1.08,
                language_probability=0.39,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
                zero_crossing_rate=0.28,
                frame_energy_concentration=0.61,
                frame_active_ratio=0.75,
                impulse_edge_ratio=0.01,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Stationary", decision.reason)

    def test_vad_pipeline_rejects_impulse_like_noise_but_accepts_clear_speech(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        noise_decision = vad.should_accept_segment(
            duration_ms=520,
            silence_ms=120,
            speech_duration_ms=360,
            speech_confirmed=True,
            rms=0.0062,
            peak=0.021,
            noise_floor_rms=0.0038,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0020,
            voiced_frame_ratio=0.032,
            zero_crossing_rate=0.17,
            peak_to_rms_ratio=5.9,
            frame_energy_concentration=0.79,
            frame_active_ratio=0.24,
            impulse_edge_ratio=0.05,
            echo_match=False,
        )
        self.assertFalse(noise_decision.accepted)
        self.assertEqual(noise_decision.reason, "Noise-like segment")

        speech_decision = vad.should_accept_segment(
            duration_ms=980,
            silence_ms=170,
            speech_duration_ms=620,
            speech_confirmed=True,
            rms=0.014,
            peak=0.045,
            noise_floor_rms=0.003,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.008,
            voiced_frame_ratio=0.12,
            peak_to_rms_ratio=3.2,
            frame_energy_concentration=0.42,
            frame_active_ratio=0.51,
            impulse_edge_ratio=0.02,
            zero_crossing_rate=0.22,
            echo_match=False,
        )
        self.assertTrue(speech_decision.accepted)
        self.assertEqual(speech_decision.reason, "Accepted")

    def test_vad_pipeline_accepts_clear_speech_with_modest_noise_signature(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=860,
            silence_ms=165,
            speech_duration_ms=570,
            speech_confirmed=True,
            rms=0.013,
            peak=0.042,
            noise_floor_rms=0.0032,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0074,
            voiced_frame_ratio=0.11,
            zero_crossing_rate=0.24,
            peak_to_rms_ratio=4.1,
            frame_energy_concentration=0.51,
            frame_active_ratio=0.48,
            impulse_edge_ratio=0.03,
            echo_match=False,
        )
        self.assertTrue(decision.accepted)
        self.assertEqual(decision.reason, "Accepted")

    def test_vad_pipeline_rejects_stationary_hiss_like_noise(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=720,
            silence_ms=150,
            speech_duration_ms=500,
            speech_confirmed=True,
            rms=0.0066,
            peak=0.019,
            noise_floor_rms=0.0041,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0017,
            voiced_frame_ratio=0.05,
            zero_crossing_rate=0.29,
            peak_to_rms_ratio=2.7,
            frame_energy_concentration=0.56,
            frame_active_ratio=0.74,
            impulse_edge_ratio=0.01,
            echo_match=False,
        )
        self.assertFalse(decision.accepted)
        self.assertEqual(decision.reason, "Noise-like segment")

    def test_asr_quality_filter_rejects_breath_like_handling_transcript(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="I think the room is quiet.",
                audio_rms=0.0068,
                audio_peak=0.026,
                peak_to_rms_ratio=2.8,
                speech_to_noise_gap=0.0021,
                voiced_frame_ratio=0.08,
                audio_duration_ms=1020,
                sustained_speech_ms=260,
                no_speech_probability=0.08,
                average_log_probability=-0.15,
                compression_ratio=1.09,
                language_probability=0.42,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
                zero_crossing_rate=0.18,
                frame_energy_concentration=0.67,
                frame_active_ratio=0.58,
                impulse_edge_ratio=0.02,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Breath", decision.reason)

    def test_asr_quality_filter_rejects_background_media_transcript(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="The TV is playing softly in the background.",
                audio_rms=0.011,
                audio_peak=0.034,
                peak_to_rms_ratio=3.4,
                speech_to_noise_gap=0.0038,
                voiced_frame_ratio=0.09,
                audio_duration_ms=1760,
                sustained_speech_ms=380,
                no_speech_probability=0.07,
                average_log_probability=-0.13,
                compression_ratio=1.11,
                language_probability=0.54,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
                zero_crossing_rate=0.23,
                frame_energy_concentration=0.70,
                frame_active_ratio=0.62,
                impulse_edge_ratio=0.02,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Background", decision.reason)

    def test_vad_pipeline_rejects_mixed_fan_click_noise(self) -> None:
        from EngineData.TranscriptEngine.vad_pipeline import VADPipeline

        vad = VADPipeline("Headset")
        decision = vad.should_accept_segment(
            duration_ms=640,
            silence_ms=135,
            speech_duration_ms=470,
            speech_confirmed=True,
            rms=0.0071,
            peak=0.028,
            noise_floor_rms=0.0039,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0022,
            voiced_frame_ratio=0.041,
            zero_crossing_rate=0.21,
            peak_to_rms_ratio=4.9,
            frame_energy_concentration=0.73,
            frame_active_ratio=0.33,
            impulse_edge_ratio=0.06,
            echo_match=False,
        )
        self.assertFalse(decision.accepted)
        self.assertEqual(decision.reason, "Noise-like segment")

    def test_asr_quality_filter_rejects_repetitive_sound_artifact(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Ding ding ding ding",
                audio_rms=0.007,
                audio_peak=0.012,
                speech_to_noise_gap=0.0025,
                voiced_frame_ratio=0.06,
                audio_duration_ms=1800,
                sustained_speech_ms=120,
                no_speech_probability=0.28,
                average_log_probability=-0.18,
                compression_ratio=1.02,
                language_probability=0.35,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Repetitive sound artifact", decision.reason)

    def test_asr_quality_filter_accepts_short_repetitive_proper_noun_like_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Raya Rina",
                audio_rms=0.031,
                audio_peak=0.089,
                speech_to_noise_gap=0.024,
                voiced_frame_ratio=0.23,
                audio_duration_ms=1200,
                sustained_speech_ms=860,
                no_speech_probability=0.01,
                average_log_probability=-0.05,
                compression_ratio=1.01,
                language_probability=0.94,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertTrue(decision.accepted)

    def test_asr_quality_filter_accepts_common_focus_short_output(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Halo coba bicara",
                audio_rms=0.015,
                audio_peak=0.045,
                speech_to_noise_gap=0.009,
                voiced_frame_ratio=0.11,
                audio_duration_ms=900,
                sustained_speech_ms=180,
                no_speech_probability=0.06,
                average_log_probability=-0.24,
                compression_ratio=1.1,
                language_probability=0.62,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertTrue(decision.accepted)

    def test_asr_quality_filter_accepts_proper_noun_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Maya Lestari",
                audio_rms=0.028,
                audio_peak=0.082,
                speech_to_noise_gap=0.022,
                voiced_frame_ratio=0.24,
                audio_duration_ms=1400,
                sustained_speech_ms=920,
                no_speech_probability=0.02,
                average_log_probability=-0.06,
                compression_ratio=1.05,
                language_probability=0.91,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertTrue(decision.accepted)

    def test_asr_quality_filter_rejects_badword_exact_match(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="bangsat",
                audio_rms=0.017,
                audio_peak=0.05,
                speech_to_noise_gap=0.009,
                voiced_frame_ratio=0.12,
                audio_duration_ms=820,
                sustained_speech_ms=170,
                no_speech_probability=0.04,
                average_log_probability=-0.16,
                compression_ratio=1.05,
                language_probability=0.71,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Profanity candidate", decision.reason)

    def test_asr_quality_filter_rejects_badword_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="fuck you",
                audio_rms=0.018,
                audio_peak=0.055,
                speech_to_noise_gap=0.01,
                voiced_frame_ratio=0.13,
                audio_duration_ms=760,
                sustained_speech_ms=160,
                no_speech_probability=0.03,
                average_log_probability=-0.14,
                compression_ratio=1.02,
                language_probability=0.73,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertFalse(decision.accepted)
        self.assertIn("Profanity candidate", decision.reason)

    def test_asr_quality_filter_accepts_person_and_place_name_phrase(self) -> None:
        from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport

        decision = ASRQualityFilter().evaluate(
            ASRQualityReport(
                transcript_text="Budi Santoso Jakarta",
                audio_rms=0.019,
                audio_peak=0.058,
                speech_to_noise_gap=0.011,
                voiced_frame_ratio=0.15,
                audio_duration_ms=930,
                sustained_speech_ms=210,
                no_speech_probability=0.02,
                average_log_probability=-0.08,
                compression_ratio=1.0,
                language_probability=0.79,
                language_ok=True,
                timestamp_ok=True,
                repetitive_text=False,
                empty_output=False,
            )
        )
        self.assertTrue(decision.accepted)

    def test_rejection_status_maps_profanity_to_content(self) -> None:
        self.assertEqual(live_pipeline._reject_reason_code("Low speech focus"), "rejected_focus")
        self.assertEqual(live_pipeline._rejection_status_for_reason("Profanity candidate: bangsat"), "Rejected Content")
        self.assertEqual(live_pipeline._rejection_status_for_reason("Nonsense transcript candidate: xyz"), "Rejected Content")
        self.assertEqual(live_pipeline._rejection_status_for_reason("Low speech focus"), "Rejected Focus")
        self.assertEqual(live_pipeline._rejection_status_for_reason("rejected_silence"), "Rejected Silence")

    def test_safe_endpoint_cap_shortens_short_speech_without_overcutting(self) -> None:
        self.assertEqual(live_pipeline._cap_safe_endpoint_wait_ms(400, 130), 55)
        self.assertEqual(live_pipeline._cap_safe_endpoint_wait_ms(800, 130), 60)
        self.assertEqual(live_pipeline._cap_safe_endpoint_wait_ms(800, 85), 60)
        self.assertEqual(live_pipeline._cap_safe_endpoint_wait_ms(1200, 190), 95)
        self.assertEqual(live_pipeline._cap_safe_endpoint_wait_ms(2000, 250), 150)

    def test_audio_capture_default_frame_duration_is_16ms(self) -> None:
        self.assertEqual(AudioCapture.frame_duration_ms, 16)

    def test_default_language_focus_mode_is_id_en(self) -> None:
        from EngineData.LauncherApp.settings_view import SettingsViewModel

        config = EngineConfig()
        self.assertEqual(config.language_focus_mode, "ID/EN Focus")
        self.assertTrue(config.use_custom_voice_actor)
        self.assertEqual(config.voice_actor_profile_id, "marcel")
        self.assertEqual(config.noise_thresholds.imp_pr_min, 5.0)
        self.assertIsInstance(config.noise_thresholds, NoiseThresholds)
        self.assertEqual(config.noise_thresholds.imp_pr_min, 5.0)
        settings = SettingsViewModel.from_config(config)
        self.assertEqual(settings.language_focus_mode, "ID/EN Focus")
        self.assertTrue(settings.use_custom_voice_actor)
        self.assertEqual(settings.voice_actor_profile_id, "marcel")
        self.assertEqual(settings.source_language, "id")
        self.assertEqual(settings.target_language, "en")
        self.assertIn("Indonesian and English", config.asr_initial_prompt)

    def test_default_config_serializes_noise_thresholds(self) -> None:
        config = load_default_config()
        payload = config.to_dict()
        self.assertIn("noise_thresholds", payload)
        self.assertEqual(payload["noise_thresholds"]["imp_pr_min"], 5.0)

    def test_runtime_applies_configured_noise_thresholds_to_shared_filter(self) -> None:
        config = EngineConfig(noise_thresholds=NoiseThresholds(imp_pr_min=7.5))
        previous = AudioNoiseFilter.thresholds
        try:
            runtime = PrototypeRuntime(config)
            self.assertIs(runtime.config.noise_thresholds, config.noise_thresholds)
            self.assertEqual(AudioNoiseFilter.thresholds.imp_pr_min, 7.5)
        finally:
            AudioNoiseFilter.configure(previous)

    def test_audio_settings_persist_custom_voice_actor_fields(self) -> None:
        from EngineData.LauncherApp.audio_settings import AudioSettings, load_audio_settings, save_audio_settings

        with tempfile.TemporaryDirectory(prefix="audio-settings-") as temp_dir:
            path = Path(temp_dir) / "audio_settings.json"
            settings = AudioSettings(
                use_custom_voice_actor=True,
                voice_actor_profile_id="marcel",
                voice_actor_profiles_root="D:\\Work\\AI Stuff\\TranslateIT-ISSUED\\DevelopingPack\\UserData\\SavedData\\profiles\\default\\voices",
            )
            save_audio_settings(settings, path=path)
            restored = load_audio_settings(path=path)

        self.assertTrue(restored.use_custom_voice_actor)
        self.assertEqual(restored.voice_actor_profile_id, "marcel")
        self.assertIn("profiles\\default\\voices", restored.voice_actor_profiles_root)

    def test_audio_settings_default_to_headset_preset(self) -> None:
        from EngineData.LauncherApp.audio_settings import AudioSettings

        settings = AudioSettings()
        self.assertEqual(settings.input_sensitivity, "Headset")

    def test_audio_settings_normalize_legacy_sensitivity_to_headset(self) -> None:
        from EngineData.LauncherApp.audio_settings import load_audio_settings

        with tempfile.TemporaryDirectory(prefix="audio-settings-") as temp_dir:
            path = Path(temp_dir) / "audio_settings.json"
            path.write_text(json.dumps({"input_sensitivity": "Normal"}), encoding="utf-8")
            restored = load_audio_settings(path=path)
        self.assertEqual(restored.input_sensitivity, "Headset")

    def test_headset_input_sensitivity_maps_to_more_responsive_runtime_mode(self) -> None:
        from EngineData.TranscriptEngine.audio_calibration import normalize_input_sensitivity

        self.assertEqual(normalize_input_sensitivity("Headset"), "High")

    def test_audio_settings_missing_voice_toggle_defaults_to_custom_voice_enabled(self) -> None:
        from EngineData.LauncherApp.audio_settings import load_audio_settings

        with tempfile.TemporaryDirectory(prefix="audio-settings-") as temp_dir:
            path = Path(temp_dir) / "audio_settings.json"
            path.write_text(
                json.dumps(
                    {
                        "voice_actor_profile_id": "marcel",
                        "voice_actor_profiles_root": "D:\\Work\\AI Stuff\\TranslateIT-ISSUED\\DevelopingPack\\UserData\\SavedData\\profiles\\default\\voices",
                    }
                ),
                encoding="utf-8",
            )
            restored = load_audio_settings(path=path)

        self.assertTrue(restored.use_custom_voice_actor)
        self.assertEqual(restored.voice_actor_profile_id, "marcel")

    def test_audio_settings_ignores_legacy_disabled_custom_voice_when_profile_exists(self) -> None:
        from EngineData.LauncherApp.audio_settings import load_audio_settings

        with tempfile.TemporaryDirectory(prefix="audio-settings-") as temp_dir:
            path = Path(temp_dir) / "audio_settings.json"
            path.write_text(
                json.dumps(
                    {
                        "use_custom_voice_actor": False,
                        "voice_actor_profile_id": "marcel",
                        "voice_actor_profiles_root": "D:\\Work\\AI Stuff\\TranslateIT-ISSUED\\DevelopingPack\\UserData\\SavedData\\profiles\\default\\voices",
                    }
                ),
                encoding="utf-8",
            )
            restored = load_audio_settings(path=path)

        self.assertTrue(restored.use_custom_voice_actor)
        self.assertEqual(restored.voice_actor_profile_id, "marcel")

    def test_voice_actor_profile_discovery_finds_marcel_profile(self) -> None:
        from EngineData.TranslateEngine.voice_provider_selection import discover_voice_actor_profiles

        root = Path("D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices")
        profiles = discover_voice_actor_profiles(root)
        profile_ids = {profile.profile_id for profile in profiles}
        self.assertIn("marcel", profile_ids)

    def test_build_tts_request_for_segment_includes_custom_voice_settings(self) -> None:
        from EngineData.LauncherApp.app_main import build_tts_request_for_segment
        from EngineData.LauncherApp.audio_settings import AudioSettings

        request = build_tts_request_for_segment(
            segment_id="SEG-1",
            text="hello",
            language="en",
            output_path="C:/temp/out.wav",
            trace_id="trace-1",
            audio_settings=AudioSettings(
                use_custom_voice_actor=True,
                voice_actor_profile_id="marcel",
                voice_actor_profiles_root="D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices",
            ),
        )

        self.assertEqual(request.voice_profile_id, "marcel")
        self.assertIn("profiles/default/voices", request.voice_profiles_root.replace("\\", "/"))

    def test_build_tts_request_omits_profile_when_toggle_is_off(self) -> None:
        from EngineData.LauncherApp.app_main import build_tts_request_for_segment
        from EngineData.LauncherApp.audio_settings import AudioSettings

        request = build_tts_request_for_segment(
            segment_id="SEG-2",
            text="hello",
            language="en",
            output_path="C:/temp/out.wav",
            trace_id="trace-2",
            audio_settings=AudioSettings(
                use_custom_voice_actor=False,
                voice_actor_profile_id="marcel",
                voice_actor_profiles_root="D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices",
            ),
        )

        self.assertEqual(request.voice_profile_id, "")
        self.assertEqual(request.voice_profiles_root, "")

    def test_custom_voice_bypasses_translation_voice_cache(self) -> None:
        from EngineData.LauncherApp.app_main import should_bypass_translation_voice_cache
        from EngineData.LauncherApp.audio_settings import AudioSettings

        self.assertFalse(should_bypass_translation_voice_cache(AudioSettings(use_custom_voice_actor=False, voice_actor_profile_id="")))
        self.assertFalse(should_bypass_translation_voice_cache(AudioSettings(use_custom_voice_actor=False, voice_actor_profile_id="marcel")))
        self.assertTrue(should_bypass_translation_voice_cache(AudioSettings(use_custom_voice_actor=True, voice_actor_profile_id="marcel")))

    def test_refresh_tts_runtime_respects_custom_voice_toggle(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        window = SimpleNamespace(
            previous_tts=SimpleNamespace(shutdown_runtime_state=mock.Mock()),
            runtime=SimpleNamespace(
                audio_settings=SimpleNamespace(
                    use_custom_voice_actor=False,
                    voice_actor_profile_id="marcel",
                    voice_actor_profiles_root="D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices",
                ),
                tts=None,
            ),
            log_event=mock.Mock(),
        )
        window.runtime.tts = window.previous_tts

        with mock.patch("EngineData.LauncherApp.app_main.TTSPlaceholder") as mocked_tts:
            TranslateITWindow.refresh_tts_runtime(window)

        mocked_tts.assert_called_once_with(custom_voice_profile_id="", custom_voice_profiles_root=None)
        window.previous_tts.shutdown_runtime_state.assert_called_once()

    def test_refresh_tts_runtime_keeps_marcel_as_default_when_custom_voice_enabled(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        window = SimpleNamespace(
            previous_tts=SimpleNamespace(shutdown_runtime_state=mock.Mock()),
            runtime=SimpleNamespace(
                audio_settings=SimpleNamespace(
                    use_custom_voice_actor=True,
                    voice_actor_profile_id="marcel",
                    voice_actor_profiles_root="D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices",
                ),
                tts=None,
            ),
            log_event=mock.Mock(),
        )
        window.runtime.tts = window.previous_tts

        with mock.patch("EngineData.LauncherApp.app_main.TTSPlaceholder") as mocked_tts:
            TranslateITWindow.refresh_tts_runtime(window)

        mocked_tts.assert_called_once_with(
            custom_voice_profile_id="marcel",
            custom_voice_profiles_root="D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices",
        )
        window.previous_tts.shutdown_runtime_state.assert_called_once()

    def test_tts_placeholder_does_not_force_custom_backend_when_toggle_is_off(self) -> None:
        from EngineData.TranslateEngine.tts_placeholder import TTSPlaceholder

        with mock.patch.dict(
            "os.environ",
            {"TRANSLATEIT_TTS_BACKEND": "voice_actor_onnx"},
            clear=False,
        ):
            tts = TTSPlaceholder(custom_voice_profile_id="", custom_voice_profiles_root=None)

        self.assertEqual(tts.backend_name, "legacy_sapi_wav")

    def test_report_writers_skip_unchanged_payloads(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            log_root = Path(tmpdir)
            with mock.patch.object(app_logger, "ensure_log_root", return_value=log_root):
                json_path = app_logger.write_json_report("dedupe.json", {"a": 1, "b": 2})
                with mock.patch.object(Path, "write_text", autospec=True, return_value=None) as mocked_write:
                    same_json_path = app_logger.write_json_report("dedupe.json", {"a": 1, "b": 2})
                self.assertEqual(json_path, same_json_path)
                mocked_write.assert_not_called()

                text_path = app_logger.write_text_report("dedupe.txt", ["line 1", "line 2"])
                with mock.patch.object(Path, "write_text", autospec=True, return_value=None) as mocked_text_write:
                    same_text_path = app_logger.write_text_report("dedupe.txt", ["line 1", "line 2"])
                self.assertEqual(text_path, same_text_path)
                mocked_text_write.assert_not_called()

                with mock.patch.object(app_logger, "_ensure_report_worker", return_value=None), mock.patch.object(
                    app_logger._REPORT_QUEUE, "put_nowait", autospec=True
                ) as mocked_put_nowait:
                    app_logger.write_json_report_async("async-dedupe.json", {"x": 9})
                    app_logger.write_json_report_async("async-dedupe.json", {"x": 9})
                self.assertEqual(mocked_put_nowait.call_count, 1)

    def test_report_writers_handle_non_serializable_objects_safely(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            log_root = Path(tmpdir)
            with mock.patch.object(app_logger, "ensure_log_root", return_value=log_root):
                path = app_logger.write_json_report("safe.json", {"loader": ASRModelLoader(), "count": 1})
            payload = path.read_text(encoding="utf-8")
            self.assertIn("\"count\": 1", payload)
            self.assertIn("ASRModelLoader", payload)

    def test_stt_optimization_payload_sanitizes_loader_context(self) -> None:
        payload = build_stt_optimization_payload(
            {
                "segment_id": "SEG-1",
                "latency": {},
            },
            asr_loader=ASRModelLoader(),
        )
        self.assertEqual(payload["status"], "initialized")
        self.assertIsInstance(payload["asr_loader"], dict)
        self.assertEqual(payload["asr_loader"]["primary_model"], "large-v3-turbo")
        self.assertEqual(payload["asr_loader"]["backup_model"], "medium")

    def test_model_runtime_optimization_payload_sanitizes_loader_context(self) -> None:
        payload = build_model_runtime_optimization_payload(
            {
                "segment_id": "SEG-1",
                "latency": {},
            },
            asr_loader=ASRModelLoader(),
            quality_downgraded=False,
            warmup_status="partial",
            warmup_ready=False,
            warmup_attempted=True,
            warmup_note="Startup warmup is partial; the engine remains in preparing state.",
        )
        self.assertEqual(payload["status"], "initialized")
        self.assertIsInstance(payload["asr_loader"], dict)
        self.assertEqual(payload["asr_loader"]["primary_model"], "large-v3-turbo")
        self.assertEqual(payload["quality_downgraded"], False)
        self.assertEqual(payload["warmup_status"], "partial")
        self.assertFalse(payload["warmup_ready"])
        self.assertTrue(payload["warmup_attempted"])
        self.assertIn("preparing state", payload["warmup_note"])

    def test_worker_health_payload_exposes_worker_diagnosis_fields(self) -> None:
        payload = build_worker_health_payload(
            {
                "segment_id": "SEG-WORKER",
                "worker_alive": True,
                "active_workers": ["capture", "audio"],
                "failed_workers": [],
                "worker_states": [{"worker_id": "capture", "alive": True}],
                "queue_sizes": {"capture": 1},
                "queue_oldest_item_age_ms": {"capture": 12},
                "stale_job_rejected_count": 2,
                "last_exception": "",
                "last_job_started_time": "2026-06-06T09:00:00+07:00",
                "last_job_finished_time": "2026-06-06T09:00:01+07:00",
                "last_heartbeat_time": "2026-06-06T09:00:02+07:00",
            }
        )
        self.assertEqual(payload["status"], "initialized")
        self.assertEqual(payload["worker_issue_status"], "degraded")
        self.assertEqual(payload["worker_issue_reason"], "Stale callbacks were rejected.")
        self.assertFalse(payload["safe_to_restart"])
        self.assertIn("worker_issue_status", payload)
        self.assertIn("worker_health_note", payload)

    def test_cuda_refresh_reuses_cached_status_when_reports_not_requested(self) -> None:
        runtime = object.__new__(PrototypeRuntime)
        runtime.cuda_status = SimpleNamespace(core_status="PASS")
        with mock.patch("EngineData.LauncherApp.app_main.validate_cuda") as mocked_validate:
            result = PrototypeRuntime.refresh_cuda_status(runtime, write_reports=False)
        self.assertIs(result, runtime.cuda_status)
        mocked_validate.assert_not_called()

    def test_post_tts_ui_refresh_is_deferred(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            update_benchmark_panel=mock.Mock(),
            log_event=mock.Mock(),
        )
        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async") as mocked_write, mock.patch(
            "EngineData.LauncherApp.app_main.QTimer.singleShot",
            side_effect=lambda delay, fn: fn(),
        ) as mocked_single_shot:
            TranslateITWindow._schedule_post_tts_ui_refresh(window, segment)

        mocked_single_shot.assert_called_once()
        window.update_benchmark_panel.assert_called_once()
        mocked_write.assert_called_once()

    def test_live_tts_dispatch_precedes_report_writing(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.quality.status = "Completed"
        segment.latency.tts_queue_depth = None
        segment.latency.speech_start_to_first_voice_output_ms = 1200
        order: list[str] = []
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                add_pipeline_segment=mock.Mock(return_value=True),
                session=SimpleNamespace(
                    session_id="S1",
                    segments=[],
                    add_segment=mock.Mock(),
                ),
                rejected_count=0,
                accepted_count=0,
            ),
            _processed_pipeline_segment_ids=set(),
            _log_pipeline_trace=mock.Mock(),
            log_event=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock())),
            _build_latency_report_bundle=mock.Mock(return_value={
                "metric_groups": {
                    "main_bottleneck_stage": "TTS",
                    "main_bottleneck_reason": "reason",
                    "audio_verify_bottleneck": "endpoint_wait_ms",
                    "stt_bottleneck": "asr_latency_ms",
                    "translate_bottleneck": "translation_latency_ms",
                    "tts_bottleneck": "tts_playback_start_ms",
                    "speech_duration_ms": 1000,
                    "delay_after_speech_end_ms": 200,
                    "total_latency_ms": 1200,
                    "input_latency_budget_ms": 800,
                    "output_latency_budget_ms": 400,
                    "io_latency_budget_ms": 1200,
                },
                "text_latency": {},
                "text_latency_breakdown": {},
                "audio_verify_breakdown": {},
                "stt_breakdown": {},
                "translate_breakdown": {},
                "tts_breakdown": {},
            }),
            add_transcript_card=mock.Mock(side_effect=lambda *args, **kwargs: order.append("card")),
            _build_transcript_card_view_model=mock.Mock(return_value=TranscriptCardViewModel.from_segment(segment)),
            start_tts_generation=mock.Mock(side_effect=lambda *args, **kwargs: order.append("tts")),
            _write_text_latency_reports=mock.Mock(side_effect=lambda *args, **kwargs: order.append("report")),
            write_short_path_guard_snapshot=mock.Mock(),
            write_long_turn_safety_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            refresh_status_panel=mock.Mock(),
            _schedule_session_persist=mock.Mock(side_effect=lambda: order.append("persist")),
            auto_play_out_voice=True,
            rejected_text=SimpleNamespace(clear=mock.Mock()),
        )
        result = SimpleNamespace(
            accepted=True,
            segment=segment,
            asr_status="Completed",
            translation_status="Completed",
            rejection_reason="",
            event_messages=[],
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async", return_value=Path("noop.json")):
            TranslateITWindow.handle_pipeline_segment(window, result)

        self.assertLess(order.index("tts"), order.index("report"))
        self.assertLess(order.index("tts"), order.index("persist"))

    def test_handle_tts_result_uses_voice_start_proxy_time_for_output_latency(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-TTS",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.speech_end_time = "2026-06-02T11:27:54.562+07:00"
        window = SimpleNamespace(
            runtime=SimpleNamespace(replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Skipped", message="skipped")))),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-TTS"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=False,
            pending_tts_segment_id="SEG-TTS",
            pending_tts_autoplay=False,
            pending_tts_jobs=[],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
        )
        result = SimpleNamespace(
            segment_id="SEG-TTS",
            status="Completed",
            mode="sapi_direct_async",
            trace_id="trace-SEG-TTS",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-test.wav"),
            latency_ms=377,
            notes="Direct SAPI speech started asynchronously.",
            queue_wait_ms=377,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=377,
            total_ms=377,
            engine_name="sapi_direct_async",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-test.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="sapi_direct_async",
            backend_selected="sapi_direct_async",
            backend_fallback_reason="",
            supports_streaming=False,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=377,
            voice_start_proxy_ms=377,
            voice_completed_ms=2494,
            process_start_overhead_ms=4,
            voice_start_proxy_time="2026-06-02T11:27:54.939+07:00",
            voice_completed_time="2026-06-02T11:27:57.056+07:00",
        )

        TranslateITWindow.handle_tts_result(window, result)

        self.assertEqual(segment.latency.speech_end_to_voice_proxy_ms, 377)
        self.assertEqual(segment.latency.tts_voice_start_proxy_time, "2026-06-02T11:27:54.939+07:00")
        self.assertEqual(segment.latency.tts_voice_completed_time, "2026-06-02T11:27:57.056+07:00")
        self.assertTrue(segment.replay.target_voice_available)

    def test_handle_tts_result_clears_queue_state_when_segment_runtime_fields_are_missing(self) -> None:
        segment = SimpleNamespace(
            segment_id="SEG-MISSING",
            latency=SimpleNamespace(),
            quality=None,
            replay=None,
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(replay=SimpleNamespace(replay_audio=mock.Mock())),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-MISSING"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={})) ),
            log_event=mock.Mock(),
            pending_tts_segment_id="SEG-MISSING",
            pending_tts_autoplay=True,
            pending_tts_jobs=[(segment, True)],
            tts_worker=object(),
            _schedule_pending_tts_drain=mock.Mock(),
        )
        result = SimpleNamespace(segment_id="SEG-MISSING", status="Completed", audio_path="", notes="")

        TranslateITWindow.handle_tts_result(window, result)

        self.assertIsNone(window.tts_worker)
        self.assertIsNone(window.pending_tts_segment_id)
        self.assertFalse(window.pending_tts_autoplay)
        window._schedule_pending_tts_drain.assert_called_once()

    def test_handle_tts_result_does_not_replay_wav_for_direct_playback(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-DIRECT",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Completed", message="played"))),
            ),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-DIRECT"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=True,
            pending_tts_segment_id="SEG-DIRECT",
            pending_tts_autoplay=True,
            pending_tts_jobs=[],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
        )
        result = SimpleNamespace(
            segment_id="SEG-DIRECT",
            status="Completed",
            mode="voice_actor_onnx",
            trace_id="trace-SEG-DIRECT",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-direct.wav"),
            latency_ms=131,
            notes="Generated translated voice output locally using a custom ONNX voice actor with direct streaming playback; WAV artifact is cached asynchronously.",
            queue_wait_ms=0,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=131,
            total_ms=131,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-direct.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=131,
            voice_start_proxy_ms=131,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time="2026-06-03T11:45:41.131+07:00",
            voice_completed_time="",
            provider_used="cpu",
            provider_benchmark_ms=80,
            provider_selection_reason="cuda_unavailable",
            provider_voice_profile_id="marcel",
            provider_model_version="v1",
        )

        TranslateITWindow.handle_tts_result(window, result)

        window.runtime.replay.replay_audio.assert_not_called()
        window._schedule_direct_playback_reports.assert_called_once()
        self.assertTrue(segment.replay.target_voice_available)

    def test_handle_tts_result_schedules_pending_tts_drain_for_direct_playback_queue(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-DIRECT-QUEUE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Completed", message="played"))),
            ),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-DIRECT-QUEUE"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _schedule_pending_tts_drain=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=True,
            pending_tts_segment_id="SEG-DIRECT-QUEUE",
            pending_tts_autoplay=True,
            pending_tts_jobs=[(segment, True)],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
        )
        result = SimpleNamespace(
            segment_id="SEG-DIRECT-QUEUE",
            status="Completed",
            mode="voice_actor_onnx",
            trace_id="trace-SEG-DIRECT-QUEUE",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-direct-queue.wav"),
            latency_ms=131,
            notes="Generated translated voice output locally using a custom ONNX voice actor with direct streaming playback; WAV artifact is cached asynchronously.",
            queue_wait_ms=0,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=131,
            total_ms=131,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-direct-queue.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=131,
            voice_start_proxy_ms=131,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time="2026-06-03T11:45:41.131+07:00",
            voice_completed_time="",
            provider_used="cpu",
            provider_benchmark_ms=80,
            provider_selection_reason="cuda_unavailable",
            provider_voice_profile_id="marcel",
            provider_model_version="v1",
        )

        TranslateITWindow.handle_tts_result(window, result)

        window._schedule_pending_tts_drain.assert_called_once()
        window.runtime.replay.replay_audio.assert_not_called()
        self.assertTrue(segment.replay.target_voice_available)

    def test_start_tts_generation_queues_when_runtime_voice_is_still_busy(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-QUEUE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=SimpleNamespace(backend_name="voice_actor_onnx"),
                audio_settings=SimpleNamespace(auto_play_out_voice=True, use_custom_voice_actor=True, voice_actor_profile_id="marcel"),
                session=SimpleNamespace(segment_audio_path=mock.Mock(return_value=PROJECT_ROOT / "UserData" / "CacheData" / "tts-queue.wav")),
                config=SimpleNamespace(cache_dir=PROJECT_ROOT / "UserData" / "CacheData", target_language="en"),
            ),
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            tts_worker=None,
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _capture_generation=1,
            _runtime_tts_is_idle=mock.Mock(return_value=False),
            _queue_pending_tts_job=mock.Mock(),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock())),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-QUEUE"),
            log_event=mock.Mock(),
        )

        with mock.patch(
            "EngineData.LauncherApp.app_main.load_audio_settings",
            return_value=SimpleNamespace(auto_play_out_voice=True, use_custom_voice_actor=True, voice_actor_profile_id="marcel"),
        ):
            TranslateITWindow.start_tts_generation(window, segment, autoplay=True)

        window._queue_pending_tts_job.assert_called_once_with(segment, True)
        self.assertEqual(window.pending_tts_jobs, [])
        self.assertIsNone(window.pending_tts_segment_id)

    def test_set_status_shows_stopped_for_stopped_state(self) -> None:
        runtime = SimpleNamespace(set_status=mock.Mock())
        window = SimpleNamespace(
            runtime=runtime,
            runtime_badge=SimpleNamespace(setText=mock.Mock(), setProperty=mock.Mock(), style=lambda: SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())),
            refresh_status_panel=mock.Mock(),
            update_start_button_state=mock.Mock(),
            write_engine_readiness_report=mock.Mock(),
        )

        TranslateITWindow.set_status(window, UIState.STOPPED)

        runtime.set_status.assert_called_once_with(UIState.STOPPED)
        window.runtime_badge.setText.assert_called_once_with("Stopped")

    def test_validation_items_are_cached_between_status_refreshes(self) -> None:
        window = SimpleNamespace(
            _validation_items_cache=[],
            _validation_items_cache_at=0.0,
        )
        fake_items = [SimpleNamespace(level="PASS", name="one", message="ok")]
        with mock.patch("EngineData.LauncherApp.app_main.build_validation_items", return_value=fake_items) as build_items:
            first = TranslateITWindow._get_validation_items(window)
            second = TranslateITWindow._get_validation_items(window)

        self.assertEqual(first, fake_items)
        self.assertEqual(second, fake_items)
        build_items.assert_called_once()

    def test_benchmark_summary_is_cached_between_status_refreshes(self) -> None:
        summary = SimpleNamespace(total_after_eos={"p50_ms": 1, "p95_ms": 2, "worst_ms": 3})
        session = SimpleNamespace(session_id="S1", segments=[object(), object()], benchmark_summary=mock.Mock(return_value=summary))
        runtime = SimpleNamespace(session=session, rejected_count=0)
        window = SimpleNamespace(
            runtime=runtime,
            _benchmark_summary_cache=None,
            _benchmark_summary_cache_key=None,
            _benchmark_summary_cache_at=0.0,
        )

        first = TranslateITWindow._get_benchmark_summary(window)
        second = TranslateITWindow._get_benchmark_summary(window)

        self.assertIs(first, summary)
        self.assertIs(second, summary)
        session.benchmark_summary.assert_called_once()

    def test_transcript_card_view_model_is_cached_until_segment_changes(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-CACHE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            _transcript_card_vm_cache={},
            _segment_card_view_model_fingerprint=lambda seg: (
                seg.segment_id,
                seg.input_text,
                seg.translated_text,
                seg.created_at_iso,
                seg.quality.status,
                seg.latency.latency_ms,
                seg.latency.asr_latency_ms,
                seg.latency.translation_latency_ms,
                seg.latency.speech_end_to_voice_proxy_ms,
                seg.latency.tts_voice_start_proxy_ms,
                seg.latency.tts_voice_completed_ms,
                seg.latency.tts_process_start_overhead_ms,
                str(seg.replay.source_audio_path or ""),
                str(seg.replay.translated_audio_path or ""),
                bool(seg.replay.target_voice_available),
                bool(seg.replay.source_replay_available),
            ),
        )
        with mock.patch(
            "EngineData.LauncherApp.app_main.TranscriptCardViewModel.from_segment",
            wraps=TranscriptCardViewModel.from_segment,
        ) as build_card:
            first = TranslateITWindow._build_transcript_card_view_model(window, segment)
            second = TranslateITWindow._build_transcript_card_view_model(window, segment)
            segment.translated_text = "Hello again"
            third = TranslateITWindow._build_transcript_card_view_model(window, segment)

        self.assertIs(first, second)
        self.assertIsNot(first, third)
        self.assertEqual(build_card.call_count, 2)

    def test_add_transcript_card_skips_update_when_fingerprint_matches(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-CARD",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        card = TranscriptCardViewModel.from_segment(segment)
        existing_widget = mock.Mock()
        existing_widget._view_model_fingerprint = (
            card.segment_id,
            card.session_id,
            card.source_text,
            card.translated_text,
            card.timestamp_label,
            card.total_latency_label,
            card.quality_label,
            card.latency_detail_label,
            card.asr_model_label,
            card.translation_engine_label,
            card.compute_label,
            card.can_replay_source,
            card.can_replay_translation,
            card.translation_placeholder,
            str(card.source_audio_path or ""),
            str(card.translated_audio_path or ""),
        )
        existing_widget._make_view_model_fingerprint = mock.Mock(return_value=existing_widget._view_model_fingerprint)
        window = SimpleNamespace(
            transcript_widgets_by_segment_id={card.segment_id: existing_widget},
            empty_state_label=mock.Mock(),
            transcript_layout=mock.Mock(),
            _log_pipeline_trace=mock.Mock(),
            find_segment=mock.Mock(return_value=segment),
            handle_replay_card=mock.Mock(),
            handle_speak_translation=mock.Mock(),
            show_latency_details=mock.Mock(),
        )

        TranslateITWindow.add_transcript_card(window, card, segment)

        existing_widget.update_view_model.assert_not_called()
        window.transcript_layout.insertWidget.assert_not_called()
        window.empty_state_label.hide.assert_called_once()

    def test_sync_trace_export_skips_unchanged_event_count(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-TRACE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        trace = mock.Mock()
        trace.events = ["speech_start", "speech_end"]
        trace.build_summary = mock.Mock()
        trace.to_dict = mock.Mock(return_value={"trace": "payload"})
        segment.latency.metric_trace["official_trace_obj"] = trace
        window = SimpleNamespace(
            _trace_export_event_count_cache={},
            _trace_summary_cache={},
            _stopwatch_alignment_event_count_cache={},
            _segment_trace=mock.Mock(return_value=trace),
            _write_stopwatch_alignment=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async") as write_report:
            TranslateITWindow._sync_trace_export(window, segment)
            TranslateITWindow._sync_trace_export(window, segment)

        self.assertEqual(write_report.call_count, 1)
        self.assertEqual(trace.build_summary.call_count, 1)
        window._write_stopwatch_alignment.assert_called_once_with(segment)

    def test_sync_trace_export_reuses_cached_summary_for_same_event_count(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-TRACE-CACHE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        trace = mock.Mock()
        trace.events = ["speech_start", "speech_end"]
        trace.build_summary = mock.Mock()
        trace.to_dict = mock.Mock(return_value={"trace": "payload"})
        trace.official_metrics = {}
        trace.candidate_latencies_ms = {}
        segment.latency.metric_trace["official_trace_obj"] = trace
        window = SimpleNamespace(
            _trace_export_event_count_cache={},
            _trace_summary_cache={"SEG-TRACE-CACHE": (len(trace.events), {"trace": "payload"})},
            _stopwatch_alignment_event_count_cache={},
            _segment_trace=mock.Mock(return_value=trace),
            _write_stopwatch_alignment=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async") as write_report:
            TranslateITWindow._sync_trace_export(window, segment)
            TranslateITWindow._sync_trace_export(window, segment)

        self.assertEqual(trace.build_summary.call_count, 0)
        self.assertEqual(write_report.call_count, 1)
        window._write_stopwatch_alignment.assert_called_once_with(segment)

    def test_runtime_log_event_uses_async_logger(self) -> None:
        runtime = SimpleNamespace()
        with mock.patch("EngineData.LauncherApp.app_main.append_log_async") as async_log, mock.patch(
            "EngineData.LauncherApp.app_main.append_log"
        ) as sync_log:
            PrototypeRuntime.log_event(runtime, "INFO", "hello", {"a": 1})

        async_log.assert_called_once_with("launcher_latest.log", "INFO", "hello", {"a": 1})
        sync_log.assert_not_called()

    def test_handle_tts_result_ignores_cancelled_direct_playback(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-CANCELLED",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Completed", message="played"))),
            ),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-CANCELLED"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=True,
            pending_tts_segment_id="SEG-CANCELLED",
            pending_tts_autoplay=True,
            pending_tts_jobs=[],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
        )
        result = SimpleNamespace(
            segment_id="SEG-CANCELLED",
            status="Cancelled",
            mode="voice_actor_onnx",
            trace_id="trace-SEG-CANCELLED",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-cancelled.wav"),
            latency_ms=0,
            notes="Custom voice playback cancelled.",
            queue_wait_ms=0,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=0,
            total_ms=0,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-cancelled.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=0,
            voice_start_proxy_ms=0,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time="",
            voice_completed_time="",
            provider_used="cpu",
            provider_benchmark_ms=80,
            provider_selection_reason="cuda_unavailable",
            provider_voice_profile_id="marcel",
            provider_model_version="v1",
        )

        TranslateITWindow.handle_tts_result(window, result)

        window.runtime.replay.replay_audio.assert_not_called()
        window._schedule_direct_playback_reports.assert_not_called()
        self.assertEqual(segment.quality.tts_status, "Cancelled")
        self.assertFalse(segment.replay.target_voice_available)

    def test_handle_tts_result_schedules_pending_drain_after_cancellation_with_queue(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-CANCEL-QUEUE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        window = SimpleNamespace(
            runtime=SimpleNamespace(replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Completed", message="played")))),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-CANCEL-QUEUE"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _schedule_pending_tts_drain=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=True,
            pending_tts_segment_id="SEG-CANCEL-QUEUE",
            pending_tts_autoplay=True,
            pending_tts_jobs=[(segment, True)],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
        )
        result = SimpleNamespace(
            segment_id="SEG-CANCEL-QUEUE",
            status="Cancelled",
            mode="voice_actor_onnx",
            trace_id="trace-SEG-CANCEL-QUEUE",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-cancel-queue.wav"),
            latency_ms=0,
            notes="Custom voice playback cancelled.",
            queue_wait_ms=0,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=0,
            total_ms=0,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-cancel-queue.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=0,
            voice_start_proxy_ms=0,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time="",
            voice_completed_time="",
            provider_used="cpu",
            provider_benchmark_ms=80,
            provider_selection_reason="cuda_unavailable",
            provider_voice_profile_id="marcel",
            provider_model_version="v1",
        )

        TranslateITWindow.handle_tts_result(window, result)

        window._schedule_pending_tts_drain.assert_called_once()
        self.assertEqual(window.pending_tts_jobs, [(segment, True)])

    def test_handle_tts_result_skips_stale_capture_generation(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-STALE",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_capture_generation = 1
        window = SimpleNamespace(
            runtime=SimpleNamespace(replay=SimpleNamespace(replay_audio=mock.Mock(return_value=SimpleNamespace(status="Completed", message="played")))),
            find_segment=mock.Mock(return_value=segment),
            _pipeline_trace_id=mock.Mock(return_value="trace-SEG-STALE"),
            _log_pipeline_trace=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock(), to_dict=mock.Mock(return_value={}))),
            _build_transcript_card_view_model=mock.Mock(),
            _schedule_post_tts_ui_refresh=mock.Mock(),
            _write_post_tts_health_snapshot=mock.Mock(),
            _schedule_playback_reports=mock.Mock(),
            _schedule_direct_playback_reports=mock.Mock(),
            _schedule_session_persist=mock.Mock(),
            _dequeue_pending_tts_job=mock.Mock(return_value=None),
            log_event=mock.Mock(),
            transcript_widgets_by_segment_id={},
            auto_play_out_voice=True,
            pending_tts_segment_id="SEG-STALE",
            pending_tts_autoplay=True,
            pending_tts_jobs=[],
            _pending_playback_segment_id_by_path={},
            _pending_playback_request_perf_by_path={},
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            selected_output_device_id=mock.Mock(return_value="default"),
            tts_worker=None,
            _capture_generation=2,
        )
        result = SimpleNamespace(
            segment_id="SEG-STALE",
            status="Completed",
            mode="voice_actor_onnx",
            trace_id="trace-SEG-STALE",
            audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-stale.wav"),
            latency_ms=131,
            notes="Generated translated voice output locally using a custom ONNX voice actor with direct streaming playback; WAV artifact is cached asynchronously.",
            queue_wait_ms=0,
            text_prep_ms=0,
            voice_generate_ms=0,
            audio_cache_ms=0,
            playback_prepare_ms=0,
            playback_start_ms=131,
            total_ms=131,
            engine_name="voice_actor_onnx",
            available=True,
            cached=False,
            cache_hit=False,
            target_audio_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts-stale.wav"),
            output_device_name="Windows default output",
            tts_error="",
            backend_name="voice_actor_onnx",
            backend_selected="voice_actor_onnx",
            backend_fallback_reason="",
            supports_streaming=True,
            supports_direct_playback=True,
            direct_playback=True,
            tts_request_start_ms=0,
            tts_direct_speak_called_ms=131,
            voice_start_proxy_ms=131,
            voice_completed_ms=0,
            process_start_overhead_ms=0,
            voice_start_proxy_time="2026-06-03T11:45:41.131+07:00",
            voice_completed_time="",
            provider_used="cpu",
            provider_benchmark_ms=80,
            provider_selection_reason="cuda_unavailable",
            provider_voice_profile_id="marcel",
            provider_model_version="v1",
        )

        TranslateITWindow.handle_tts_result(window, result)

        window.runtime.replay.replay_audio.assert_not_called()
        window._schedule_direct_playback_reports.assert_not_called()
        window._schedule_playback_reports.assert_not_called()
        window._write_post_tts_health_snapshot.assert_not_called()
        self.assertIsNone(window.tts_worker)
        self.assertIsNone(window.pending_tts_segment_id)
        self.assertFalse(window.pending_tts_autoplay)
        window._log_pipeline_trace.assert_any_call(
            "tts_result_stale_skipped",
            segment=segment,
            stage="tts",
            status="skipped",
            details=mock.ANY,
        )

    def test_tts_dispatch_does_not_wait_for_ui_render_report_or_replay(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG2",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.quality.status = "Completed"
        order: list[str] = []
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                add_pipeline_segment=mock.Mock(return_value=True),
                session=SimpleNamespace(
                    session_id="S1",
                    segments=[],
                    add_segment=mock.Mock(),
                ),
                rejected_count=0,
                accepted_count=0,
            ),
            _processed_pipeline_segment_ids=set(),
            _log_pipeline_trace=mock.Mock(),
            log_event=mock.Mock(),
            _segment_trace=mock.Mock(return_value=SimpleNamespace(mark=mock.Mock(), mark_at=mock.Mock())),
            _build_latency_report_bundle=mock.Mock(return_value={
                "metric_groups": {
                    "main_bottleneck_stage": "TTS",
                    "main_bottleneck_reason": "reason",
                    "audio_verify_bottleneck": "endpoint_wait_ms",
                    "stt_bottleneck": "asr_latency_ms",
                    "translate_bottleneck": "translation_latency_ms",
                    "tts_bottleneck": "tts_playback_start_ms",
                    "speech_duration_ms": 1000,
                    "delay_after_speech_end_ms": 200,
                    "total_latency_ms": 1200,
                    "input_latency_budget_ms": 800,
                    "output_latency_budget_ms": 400,
                    "io_latency_budget_ms": 1200,
                },
                "text_latency": {},
                "text_latency_breakdown": {},
                "audio_verify_breakdown": {},
                "stt_breakdown": {},
                "translate_breakdown": {},
                "tts_breakdown": {},
            }),
            add_transcript_card=mock.Mock(side_effect=lambda *args, **kwargs: order.append("card")),
            _build_transcript_card_view_model=mock.Mock(return_value=TranscriptCardViewModel.from_segment(segment)),
            start_tts_generation=mock.Mock(side_effect=lambda *args, **kwargs: order.append("tts")),
            _write_text_latency_reports=mock.Mock(side_effect=lambda *args, **kwargs: order.append("report")),
            write_short_path_guard_snapshot=mock.Mock(),
            write_long_turn_safety_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            refresh_status_panel=mock.Mock(),
            _schedule_session_persist=mock.Mock(side_effect=lambda: order.append("persist")),
            auto_play_out_voice=True,
            rejected_text=SimpleNamespace(clear=mock.Mock()),
        )
        result = SimpleNamespace(
            accepted=True,
            segment=segment,
            asr_status="Completed",
            translation_status="Completed",
            rejection_reason="",
            event_messages=[],
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async", return_value=Path("noop.json")):
            TranslateITWindow.handle_pipeline_segment(window, result)

        self.assertLess(order.index("tts"), order.index("card"))
        self.assertLess(order.index("tts"), order.index("report"))
        self.assertLess(order.index("tts"), order.index("persist"))

    def test_input_output_latency_probe_emits_budget_fields(self) -> None:
        probe_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "input_output_latency_probe.py"
        spec = importlib.util.spec_from_file_location("input_output_latency_probe", probe_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        probe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(probe_module)

        report_data = {
            "metric_groups": {
                "speech_start_to_first_voice_ms": 1200,
                "delay_after_speech_end_ms": 200,
                "stt_ms": 300,
                "translate_ms": 250,
                "tts_ms": 450,
                "input_latency_budget_ms": 750,
                "output_latency_budget_ms": 450,
                "io_latency_budget_ms": 1200,
                "main_bottleneck_stage": "TTS",
            },
            "text_latency": {
                "tts_backend_selected": "sapi_direct_async",
            },
            "segment": {
                "latency": {
                    "tts_backend_selected": "sapi_direct_async",
                    "speech_start_to_first_voice_output_ms": 1200,
                    "tts_voice_start_proxy_ms": 1200,
                    "tts_voice_completed_ms": 1600,
                    "tts_process_start_overhead_ms": 85,
                    "input_latency_budget_ms": 750,
                    "output_latency_budget_ms": 450,
                    "io_latency_budget_ms": 1200,
                }
            },
        }
        log_data = [
            {"event": "segment_accepted_or_rejected", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "accepted", "details": {}},
            {"event": "segment_ready_received", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "received", "details": {}},
            {"event": "tts_backend_requested", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "requested", "details": {}},
            {"event": "tts_backend_selected", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "completed", "details": {}},
            {"event": "voice_start_proxy", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "proxy", "details": {}},
            {"event": "voice_completed", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "completed", "details": {}},
            {"event": "tts_audio_ready", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "completed", "details": {}},
            {"event": "playback_started_or_proxy", "trace_id": "trace-SEG1", "segment_id": "SEG1", "status": "proxy", "details": {}},
        ]

        output = probe_module.build_probe_output(report_data, log_data)
        self.assertEqual(output["probe_status"], "PASS")
        self.assertTrue(output["dispatch_before_voice_start_proxy"])
        self.assertTrue(output["dispatch_before_playback"])
        self.assertEqual(output["voice_start_proxy_ms"], 1200)
        self.assertEqual(output["voice_completed_ms"], 1600)
        self.assertEqual(output["process_start_overhead_ms"], 85)
        self.assertEqual(output["input_latency_budget_ms"], 750)
        self.assertEqual(output["output_latency_budget_ms"], 450)
        self.assertEqual(output["io_latency_budget_ms"], 1200)

    def test_input_output_latency_probe_does_not_convert_missing_latency_to_zero(self) -> None:
        probe_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "input_output_latency_probe.py"
        spec = importlib.util.spec_from_file_location("input_output_latency_probe", probe_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        probe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(probe_module)

        output = probe_module.build_probe_output({}, [])
        self.assertEqual(output["probe_status"], "WARN")
        self.assertTrue(output["latency_unavailable_is_not_fake_zero"])
        self.assertIsNone(output["input_latency_budget_ms"])
        self.assertIsNone(output["output_latency_budget_ms"])
        self.assertIsNone(output["io_latency_budget_ms"])

    def test_input_output_latency_probe_derives_budget_fields_from_component_timings(self) -> None:
        probe_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "input_output_latency_probe.py"
        spec = importlib.util.spec_from_file_location("input_output_latency_probe", probe_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        probe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(probe_module)

        report_data = {
            "metric_groups": {
                "speech_start_to_first_voice_ms": 1450,
                "audio_verify_ms": 170,
                "stt_ms": 420,
                "translate_ms": 310,
                "tts_ms": 550,
                "main_bottleneck_stage": "TTS",
            },
            "text_latency": {},
            "segment": {
                "latency": {
                    "tts_backend_selected": "sapi_direct_async",
                    "tts_audio_ready_ms": 550,
                }
            },
        }
        log_data = [
            {"event": "segment_accepted_or_rejected", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "accepted", "details": {}},
            {"event": "tts_backend_requested", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "requested", "details": {}},
            {"event": "tts_backend_selected", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "completed", "details": {}},
            {"event": "voice_start_proxy", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "proxy", "details": {}},
            {"event": "voice_completed", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "completed", "details": {}},
            {"event": "tts_audio_ready", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "completed", "details": {}},
            {"event": "playback_started_or_proxy", "trace_id": "trace-SEG2", "segment_id": "SEG2", "status": "proxy", "details": {}},
        ]

        output = probe_module.build_probe_output(report_data, log_data)
        self.assertEqual(output["probe_status"], "PASS")
        self.assertEqual(output["input_latency_budget_ms"], 900)
        self.assertEqual(output["output_latency_budget_ms"], 550)
        self.assertEqual(output["io_latency_budget_ms"], 1450)

    def test_input_output_latency_probe_prefers_trace_with_tts_path(self) -> None:
        probe_path = PROJECT_ROOT / "DevelopingData" / "Diagnostics" / "input_output_latency_probe.py"
        spec = importlib.util.spec_from_file_location("input_output_latency_probe", probe_path)
        self.assertIsNotNone(spec)
        assert spec is not None and spec.loader is not None
        probe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(probe_module)

        report_data = {
            "text_latency": {
                "speech_start_time": "2026-06-02T02:00:00+07:00",
                "translation_end_time": "2026-06-02T02:00:01+07:00",
                "tts_audio_ready_time": "2026-06-02T02:00:03+07:00",
                "tts_backend_selected": "sapi_direct_async",
            }
        }
        log_data = [
            {"event": "segment_accepted_or_rejected", "trace_id": "trace-A", "segment_id": "A", "status": "accepted", "details": {}},
            {"event": "segment_accepted_or_rejected", "trace_id": "trace-B", "segment_id": "B", "status": "accepted", "details": {}},
            {"event": "tts_backend_requested", "trace_id": "trace-A", "segment_id": "A", "status": "requested", "details": {}},
            {"event": "tts_backend_selected", "trace_id": "trace-A", "segment_id": "A", "status": "completed", "details": {}},
            {"event": "voice_start_proxy", "trace_id": "trace-A", "segment_id": "A", "status": "proxy", "details": {}},
            {"event": "voice_completed", "trace_id": "trace-A", "segment_id": "A", "status": "completed", "details": {}},
            {"event": "tts_audio_ready", "trace_id": "trace-A", "segment_id": "A", "status": "completed", "details": {}},
            {"event": "playback_started_or_proxy", "trace_id": "trace-A", "segment_id": "A", "status": "proxy", "details": {}},
        ]

        output = probe_module.build_probe_output(report_data, log_data)
        self.assertEqual(output["accepted_trace_id"], "trace-A")
        self.assertEqual(output["probe_status"], "PASS")

    def test_runtime_pipeline_log_payload_includes_queue_depth(self) -> None:
        from EngineData.LauncherApp import app_logger

        with mock.patch.object(app_logger, "append_log_async") as mocked_append:
            app_logger.append_runtime_pipeline_log(
                "trace-SEG1",
                "tts_request_started",
                stage="tts",
                segment_id="SEG1",
                status="started",
                details={"queue_depth": 2, "backend": "sapi_direct_async"},
            )
        mocked_append.assert_called_once()
        payload = mocked_append.call_args.args[3]
        self.assertEqual(payload["details"]["queue_depth"], 2)
        self.assertEqual(payload["trace_id"], "trace-SEG1")

    def test_playback_health_snapshot_is_cached_for_identical_payload(self) -> None:
        playback = SimpleNamespace(_playback_worker_started=True)
        runtime = SimpleNamespace(replay=SimpleNamespace(playback=playback))
        window = SimpleNamespace(
            runtime=runtime,
            _health_snapshot_cache={},
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        with mock.patch("EngineData.LauncherApp.app_main.build_playback_health_payload", side_effect=lambda payload: dict(payload)) as build_payload, mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_report:
            TranslateITWindow.write_playback_health_snapshot(
                window,
                tts_requested=True,
                tts_audio_ready=True,
                audio_path="sample.wav",
                audio_valid=True,
                playback_requested=True,
                playback_queued=False,
                playback_backend_started_if_available=True,
                output_backend="voice_actor_onnx",
                output_device_name_if_available="Speakers",
            )
            TranslateITWindow.write_playback_health_snapshot(
                window,
                tts_requested=True,
                tts_audio_ready=True,
                audio_path="sample.wav",
                audio_valid=True,
                playback_requested=True,
                playback_queued=False,
                playback_backend_started_if_available=True,
                output_backend="voice_actor_onnx",
                output_device_name_if_available="Speakers",
            )

        self.assertEqual(build_payload.call_count, 2)
        self.assertEqual(write_report.call_count, 1)
        self.assertEqual(write_report.call_args.args[0], "playback_health_latest.json")
        self.assertIn("report_note", write_report.call_args.args[1])

    def test_start_stop_lifecycle_snapshot_is_cached_for_identical_payload(self) -> None:
        window = SimpleNamespace(
            _health_snapshot_cache={},
            start_pressed_time="2026-06-03T11:00:00+07:00",
            ready_to_listen_time="2026-06-03T11:00:01+07:00",
            _stop_requested_time="2026-06-03T11:00:02+07:00",
            _stop_completed_time="2026-06-03T11:00:03+07:00",
            _last_lifecycle_error="",
            live_thread=SimpleNamespace(frames_received=2, stale_callbacks_rejected_count=0),
            _active_worker_snapshot=mock.Mock(return_value=([], [], {"workers": []})),
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        with mock.patch("EngineData.LauncherApp.app_main.build_start_stop_lifecycle_payload", side_effect=lambda payload: dict(payload)) as build_payload, mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_report:
            TranslateITWindow.write_start_stop_lifecycle_snapshot(window, "stop_completed")
            TranslateITWindow.write_start_stop_lifecycle_snapshot(window, "stop_completed")

        self.assertEqual(build_payload.call_count, 2)
        self.assertEqual(write_report.call_count, 1)

    def test_engine_readiness_report_is_cached_for_identical_payload(self) -> None:
        runtime = SimpleNamespace(
            cuda_core_ready=mock.Mock(return_value=True),
            asr_loader=SimpleNamespace(device="cuda", compute_type="int8_float16"),
        )
        window = SimpleNamespace(
            runtime=runtime,
            _health_snapshot_cache={},
            live_thread=SimpleNamespace(
                isRunning=mock.Mock(return_value=True),
                stream_active=True,
                callback_count=4,
                frames_received=8,
                last_audio_frame_time="2026-06-03T11:00:00+07:00",
                last_error="",
            ),
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Microphone")),
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            auto_play_out_voice=True,
            start_pressed_perf=10.0,
            ready_to_listen_perf=11.0,
            model_preload_start_perf=1.0,
            model_preload_end_perf=1.5,
            stream_open_start_perf=2.0,
            stream_open_end_perf=2.5,
            first_audio_callback_perf=10.7,
            warmup_perf=0.3,
            false_ready_prevented=False,
            start_pressed_time="2026-06-03T11:00:00+07:00",
            ready_to_listen_time="2026-06-03T11:00:01+07:00",
            _set_text_if_changed=TranslateITWindow._set_text_if_changed,
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)
        window._build_engine_readiness_payload = TranslateITWindow._build_engine_readiness_payload.__get__(window, TranslateITWindow)

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async") as write_report:
            TranslateITWindow.write_engine_readiness_report(window, UIState.PREPARING)
            TranslateITWindow.write_engine_readiness_report(window, UIState.PREPARING)

        self.assertEqual(write_report.call_count, 1)

        window.live_thread.callback_count = 5
        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async") as write_report_changed:
            TranslateITWindow.write_engine_readiness_report(window, UIState.PREPARING)

        self.assertEqual(write_report_changed.call_count, 1)

    def test_engine_stability_audit_snapshot_is_cached_for_identical_payload(self) -> None:
        window = SimpleNamespace(
            _health_snapshot_cache={},
            _engine_health_context=mock.Mock(
                return_value={
                    "current_status": "running",
                    "current_segment_id": "SEG-1",
                    "active_workers": ["capture"],
                    "failed_workers": [],
                }
            ),
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        payload = {
            "checks": [
                {"status": "OK", "area": "capture", "message": "Running"},
                {"status": "OK", "area": "tts", "message": "Ready"},
            ]
        }

        with mock.patch("EngineData.LauncherApp.app_main.build_engine_stability_audit_payload", return_value=payload), mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_json, mock.patch(
            "EngineData.LauncherApp.app_main.write_text_report_async"
        ) as write_text:
            TranslateITWindow.write_engine_stability_audit_snapshot(window, "launch")
            TranslateITWindow.write_engine_stability_audit_snapshot(window, "launch")

        self.assertEqual(write_json.call_count, 1)
        self.assertEqual(write_text.call_count, 1)

        window._engine_health_context.return_value = {
            "current_status": "running",
            "current_segment_id": "SEG-1",
            "active_workers": ["capture", "tts"],
            "failed_workers": [],
        }
        with mock.patch("EngineData.LauncherApp.app_main.build_engine_stability_audit_payload", return_value=payload), mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_json_changed, mock.patch(
            "EngineData.LauncherApp.app_main.write_text_report_async"
        ) as write_text_changed:
            TranslateITWindow.write_engine_stability_audit_snapshot(window, "launch")

        self.assertEqual(write_json_changed.call_count, 1)
        self.assertEqual(write_text_changed.call_count, 1)

    def test_refresh_status_panel_skips_redundant_repaint_when_signature_matches(self) -> None:
        class DummyWidget:
            def __init__(self, text: str = "") -> None:
                self.text = text
                self.properties: dict[str, object] = {}

            def setText(self, value: str) -> None:
                self.text = value

            def setProperty(self, name: str, value: object) -> None:
                self.properties[name] = value

            def property(self, name: str) -> object | None:
                return self.properties.get(name)

            def style(self) -> "DummyWidget":
                return self

            def unpolish(self, _widget: object) -> None:
                return None

            def polish(self, _widget: object) -> None:
                return None

        runtime = SimpleNamespace(
            current_status=UIState.READY,
            cuda_status=SimpleNamespace(
                core_status="PASS",
                gpu_name="GPU",
                driver_version="1",
                torch_version="2",
                torch_cuda_build="2",
                torch_cuda_available=True,
                torch_tensor_execution="cuda",
                torch_imported=True,
            ),
            refresh_cuda_status=mock.Mock(),
            cpu_degraded_mode_enabled=False,
            model_status_lines=mock.Mock(return_value=[
                "ASR primary: found",
                "ASR backup: found",
                "ASR target: large-v3-turbo on cuda/int8_float16",
                "Translation primary: found",
                "Translation backup: found",
                "Translation target: nllb-200-distilled-600M on cuda/float16",
            ]),
            audio_settings=SimpleNamespace(
                use_custom_voice_actor=True,
                voice_actor_profile_id="marcel",
                voice_actor_profiles_root="D:/voices",
            ),
            tts=SimpleNamespace(_warmup_cached_success=True, _warmup_in_progress=False),
            session=SimpleNamespace(session_id="S1"),
            accepted_count=1,
            rejected_count=0,
            capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True))),
            current_calibration=None,
        )
        runtime.refresh_cuda_status.return_value = runtime.cuda_status
        labels = {
            name: DummyWidget()
            for name in [
                "Runtime status",
                "Python runtime",
                "CUDA Core App status",
                "ASR model",
                "Translation model",
                "Voice actor",
                "Microphone status",
                "Capture status",
                "Capture worker state",
                "Stream active",
                "Callback count",
                "Frames received",
                "Last audio frame time",
                "Last error",
                "Session status",
                "Privacy/local-only",
            ]
        }
        window = SimpleNamespace(
            runtime=runtime,
            live_thread=None,
            engine_startup_ready=True,
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Microphone")),
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            status_labels=labels,
            runtime_badge=DummyWidget(),
            page_title_label=DummyWidget(),
            sidebar_session_label=DummyWidget(),
            session_meta_label=DummyWidget(),
            _status_panel_signature=None,
            _get_validation_items=mock.Mock(return_value=[]),
            selected_device_id=mock.Mock(return_value="mic-1"),
            update_start_button_state=mock.Mock(),
            update_benchmark_panel=mock.Mock(),
            log_event=mock.Mock(),
        )
        window._set_text_if_changed = TranslateITWindow._set_text_if_changed

        TranslateITWindow.refresh_status_panel(window)
        TranslateITWindow.refresh_status_panel(window)

        self.assertEqual(window.update_start_button_state.call_count, 1)
        self.assertEqual(window.update_benchmark_panel.call_count, 2)
        self.assertEqual(window.runtime_badge.text, "Status: Ready")

    def test_status_label_aliases_share_the_same_widget(self) -> None:
        from EngineData.LauncherApp.app_main import _status_widget_for

        sentinel = SimpleNamespace()
        window = SimpleNamespace(
            status_labels={
                "Runtime status": sentinel,
                "Python runtime": sentinel,
                "CUDA Core App status": sentinel,
                "ASR model": sentinel,
                "Translation model": sentinel,
                "Voice actor": sentinel,
                "Microphone status": sentinel,
                "Capture status": sentinel,
                "Capture worker state": sentinel,
                "Stream active": sentinel,
                "Callback count": sentinel,
                "Frames received": sentinel,
                "Last audio frame time": sentinel,
                "Last error": sentinel,
                "Session status": sentinel,
                "Privacy/local-only": sentinel,
                "Benchmark": sentinel,
            },
            status_label_aliases={
                "runtime": "Runtime status",
                "python": "Python runtime",
                "cuda": "CUDA Core App status",
                "asr": "ASR model",
                "translation": "Translation model",
                "voice": "Voice actor",
                "mic": "Microphone status",
                "capture": "Capture status",
                "worker": "Capture worker state",
                "stream": "Stream active",
                "callbacks": "Callback count",
                "frames": "Frames received",
                "last_frame": "Last audio frame time",
                "last_error": "Last error",
                "session": "Session status",
                "privacy": "Privacy/local-only",
                "benchmark": "Benchmark",
            },
        )

        self.assertIs(_status_widget_for(window, "runtime"), sentinel)
        self.assertIs(_status_widget_for(window, "capture"), sentinel)
        self.assertIs(_status_widget_for(window, "benchmark"), sentinel)

    def test_refresh_status_panel_does_not_promote_preparing_to_ready_while_live_thread_is_present(self) -> None:
        class DummyWidget:
            def __init__(self, text: str = "") -> None:
                self.text = text

            def setText(self, value: str) -> None:
                self.text = value

            def setProperty(self, *_args, **_kwargs) -> None:
                return None

            def style(self):
                return SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())

        runtime = SimpleNamespace(
            current_status=UIState.PREPARING,
            cpu_degraded_mode_enabled=False,
            cuda_status=SimpleNamespace(
                core_status="PASS",
                gpu_name="GPU",
                driver_version="1",
                torch_version="2",
                torch_cuda_build="12",
                torch_cuda_available=True,
                torch_tensor_execution=True,
                torch_imported=True,
            ),
            refresh_cuda_status=mock.Mock(),
            audio_settings=SimpleNamespace(use_custom_voice_actor=False, voice_actor_profile_id="", voice_actor_profiles_root=""),
            model_status_lines=mock.Mock(return_value=["found asr", "found stt", "found translation", "found tts", "found cuda"]),
            session=SimpleNamespace(session_id="S1", accepted_count=0, rejected_count=0),
            accepted_count=0,
            rejected_count=0,
            capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True))),
            current_calibration=None,
            tts=SimpleNamespace(_warmup_cached_success=True, _warmup_in_progress=False),
        )
        runtime.refresh_cuda_status.return_value = runtime.cuda_status
        live_thread = SimpleNamespace(
            isRunning=mock.Mock(return_value=False),
            last_error="",
            stream_active=False,
            callback_count=0,
            frames_received=0,
            last_audio_frame_time="",
        )
        labels = {
            name: DummyWidget()
            for name in [
                "Runtime status",
                "Python runtime",
                "CUDA Core App status",
                "ASR model",
                "Translation model",
                "Voice actor",
                "Microphone status",
                "Capture status",
                "Capture worker state",
                "Stream active",
                "Callback count",
                "Frames received",
                "Last audio frame time",
                "Last error",
                "Session status",
                "Privacy/local-only",
            ]
        }
        window = SimpleNamespace(
            runtime=runtime,
            live_thread=live_thread,
            startup_worker=None,
            engine_startup_ready=True,
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Microphone")),
            output_device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Speakers")),
            status_labels=labels,
            runtime_badge=DummyWidget(),
            page_title_label=DummyWidget(),
            sidebar_session_label=DummyWidget(),
            session_meta_label=DummyWidget(),
            _status_panel_signature=None,
            _get_validation_items=mock.Mock(return_value=[]),
            selected_device_id=mock.Mock(return_value="mic-1"),
            update_start_button_state=mock.Mock(),
            update_benchmark_panel=mock.Mock(),
            log_event=mock.Mock(),
        )
        window._set_text_if_changed = TranslateITWindow._set_text_if_changed

        TranslateITWindow.refresh_status_panel(window)

        self.assertEqual(runtime.current_status, UIState.PREPARING)
        self.assertEqual(window.runtime_badge.text, "Status: Preparing")

    def test_update_benchmark_panel_skips_redundant_repaint_when_signature_matches(self) -> None:
        class DummyWidget:
            def __init__(self, text: str = "") -> None:
                self.text = text

            def setText(self, value: str) -> None:
                self.text = value

        runtime = SimpleNamespace(
            session=SimpleNamespace(
                session_id="S1",
                segments=[SimpleNamespace(segment_id="SEG-1")],
            ),
            rejected_count=0,
        )
        window = SimpleNamespace(
            runtime=runtime,
            benchmark_label=DummyWidget(),
            status_labels={"Benchmark": DummyWidget()},
            _benchmark_panel_signature=None,
            _get_benchmark_summary=mock.Mock(
                return_value=SimpleNamespace(
                    completed_segments=1,
                    segment_count=1,
                    average_asr_ms=10,
                    mean_asr_ms=10,
                    average_translation_ms=20,
                    mean_translation_ms=20,
                    total_after_eos={"p50_ms": 100, "p95_ms": 150, "worst_ms": 200},
                )
            ),
            _build_transcript_card_view_model=mock.Mock(
                return_value=SimpleNamespace(total_latency_label="120 ms")
            ),
        )
        window._set_text_if_changed = TranslateITWindow._set_text_if_changed

        TranslateITWindow.update_benchmark_panel(window)
        TranslateITWindow.update_benchmark_panel(window)

        self.assertEqual(window._get_benchmark_summary.call_count, 2)
        self.assertEqual(window._build_transcript_card_view_model.call_count, 2)
        self.assertEqual(window.benchmark_label.text, "Last latency 120 ms")
        self.assertEqual(window.status_labels["Benchmark"].text, "Accepted 1 | Rejected 0 | p50 100 ms | p95 150 ms | worst 200 ms | ASR avg 10 ms | Translation avg 20 ms")

    def test_cache_session_guard_snapshot_is_cached_for_identical_payload(self) -> None:
        window = SimpleNamespace(
            runtime=SimpleNamespace(session=SimpleNamespace(session_id="S1")),
            _health_snapshot_cache={},
            _session_reset_count=0,
            pending_tts_jobs=[],
            pending_tts_segment_id="",
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Microphone")),
            _engine_health_context=mock.Mock(
                return_value={
                    "current_status": "running",
                    "current_segment_id": "SEG-1",
                    "reason": "accepted_segment",
                }
            ),
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        payload = {"checks": [{"status": "OK", "message": "guard"}]}
        with mock.patch("EngineData.LauncherApp.app_main.build_cache_session_guard_payload", return_value=payload), mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_json:
            TranslateITWindow.write_cache_session_guard_snapshot(window, "accepted_segment")
            TranslateITWindow.write_cache_session_guard_snapshot(window, "accepted_segment")

        self.assertEqual(write_json.call_count, 1)

    def test_short_path_guard_snapshot_is_cached_for_identical_payload(self) -> None:
        segment = SimpleNamespace(
            segment_id="SEG-2",
            latency=SimpleNamespace(speech_duration_ms=1500),
            translated_audio_path="audio.wav",
        )
        window = SimpleNamespace(
            _health_snapshot_cache={},
            tts_worker=SimpleNamespace(isRunning=mock.Mock(return_value=True)),
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        payload = {"checks": [{"status": "OK", "message": "short"}]}
        with mock.patch("EngineData.LauncherApp.app_main.build_short_path_guard_payload", return_value=payload), mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_json:
            TranslateITWindow.write_short_path_guard_snapshot(window, segment, "accepted_segment")
            TranslateITWindow.write_short_path_guard_snapshot(window, segment, "accepted_segment")

        self.assertEqual(write_json.call_count, 1)

    def test_long_turn_safety_snapshot_is_cached_for_identical_payload(self) -> None:
        segment = SimpleNamespace(
            segment_id="SEG-3",
            latency=SimpleNamespace(speech_duration_ms=2500),
        )
        window = SimpleNamespace(
            _health_snapshot_cache={},
            log_event=mock.Mock(),
        )
        window._write_snapshot_if_changed = TranslateITWindow._write_snapshot_if_changed.__get__(window, TranslateITWindow)

        payload = {"checks": [{"status": "OK", "message": "long"}]}
        with mock.patch("EngineData.LauncherApp.app_main.build_long_turn_safety_payload", return_value=payload), mock.patch(
            "EngineData.LauncherApp.app_main.write_json_report_async"
        ) as write_json:
            TranslateITWindow.write_long_turn_safety_snapshot(window, segment, "accepted_segment")
            TranslateITWindow.write_long_turn_safety_snapshot(window, segment, "accepted_segment")

        self.assertEqual(write_json.call_count, 1)

    def test_session_benchmark_report_is_cached_for_identical_signature(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-BENCH",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_end_time = "2026-06-03T11:00:02+07:00"
        segment.latency.tts_voice_start_proxy_time = "2026-06-03T11:00:01+07:00"
        segment.latency.speech_end_to_voice_proxy_ms = 120
        session = SimpleNamespace(session_id="S1", segments=[segment])
        runtime = SimpleNamespace(
            session=session,
            accepted_count=1,
            rejected_count=0,
        )
        window = SimpleNamespace(
            runtime=runtime,
            _session_benchmark_report_signature=None,
            _session_benchmark_report_cache=None,
        )
        window._build_session_benchmark_signature = TranslateITWindow._build_session_benchmark_signature.__get__(window, TranslateITWindow)
        window._write_session_benchmark_reports_if_changed = TranslateITWindow._write_session_benchmark_reports_if_changed.__get__(window, TranslateITWindow)

        with mock.patch("EngineData.LauncherApp.app_main.write_benchmark_reports", side_effect=[{"session_id": "S1"}, {"session_id": "S1"}]) as write_reports:
            first = TranslateITWindow._write_session_benchmark_reports_if_changed(window)
            second = TranslateITWindow._write_session_benchmark_reports_if_changed(window)

        self.assertEqual(write_reports.call_count, 1)
        self.assertEqual(first["session_id"], "S1")
        self.assertEqual(second["session_id"], "S1")

        runtime.accepted_count = 2
        with mock.patch("EngineData.LauncherApp.app_main.write_benchmark_reports", return_value={"session_id": "S1", "changed": True}) as write_reports_changed:
            changed = TranslateITWindow._write_session_benchmark_reports_if_changed(window)

        self.assertEqual(write_reports_changed.call_count, 1)
        self.assertEqual(changed["changed"], True)

    def test_schedule_session_persist_skips_identical_signature(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG-PERSIST",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_end_time = "2026-06-03T11:00:02+07:00"
        segment.latency.tts_voice_start_proxy_time = "2026-06-03T11:00:01+07:00"
        segment.latency.speech_end_to_voice_proxy_ms = 120
        session = SimpleNamespace(session_id="S1", segments=[segment])
        runtime = SimpleNamespace(
            session=session,
            cache_current_session=mock.Mock(),
        )
        window = SimpleNamespace(
            runtime=runtime,
            _session_persist_lock=threading.Lock(),
            _session_persist_running=False,
            _session_persist_signature=None,
        )

        def immediate_thread(*, target, name=None, daemon=None):
            target()
            return SimpleNamespace(start=mock.Mock(), name=name, daemon=daemon)

        with mock.patch("EngineData.LauncherApp.app_main.threading.Thread", side_effect=immediate_thread), mock.patch(
            "EngineData.LauncherApp.app_main.write_benchmark_reports"
        ) as write_reports:
            TranslateITWindow._schedule_session_persist(window)
            TranslateITWindow._schedule_session_persist(window)

        runtime.cache_current_session.assert_called_once()
        write_reports.assert_called_once_with(runtime.session, session_id="S1")

    def test_schedule_session_persist_runs_again_when_signature_changes(self) -> None:
        first_segment = TranscriptSegment(
            segment_id="SEG-PERSIST-1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        first_segment.latency.tts_end_time = "2026-06-03T11:00:02+07:00"
        first_segment.latency.tts_voice_start_proxy_time = "2026-06-03T11:00:01+07:00"
        first_segment.latency.speech_end_to_voice_proxy_ms = 120
        second_segment = TranscriptSegment(
            segment_id="SEG-PERSIST-2",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo lagi",
            translated_text="Hello again",
        )
        second_segment.latency.tts_end_time = "2026-06-03T11:00:04+07:00"
        second_segment.latency.tts_voice_start_proxy_time = "2026-06-03T11:00:03+07:00"
        second_segment.latency.speech_end_to_voice_proxy_ms = 140
        session = SimpleNamespace(session_id="S1", segments=[first_segment])
        runtime = SimpleNamespace(
            session=session,
            cache_current_session=mock.Mock(),
        )
        window = SimpleNamespace(
            runtime=runtime,
            _session_persist_lock=threading.Lock(),
            _session_persist_running=False,
            _session_persist_signature=None,
        )

        def immediate_thread(*, target, name=None, daemon=None):
            target()
            return SimpleNamespace(start=mock.Mock(), name=name, daemon=daemon)

        with mock.patch("EngineData.LauncherApp.app_main.threading.Thread", side_effect=immediate_thread), mock.patch(
            "EngineData.LauncherApp.app_main.write_benchmark_reports"
        ) as write_reports:
            TranslateITWindow._schedule_session_persist(window)
            runtime.session.segments.append(second_segment)
            TranslateITWindow._schedule_session_persist(window)

        self.assertEqual(runtime.cache_current_session.call_count, 2)
        self.assertEqual(write_reports.call_count, 2)

    def test_pending_pipeline_result_queue_is_fifo_and_clearable(self) -> None:
        from EngineData.LauncherApp.app_main import PrototypeRuntime

        runtime = PrototypeRuntime.__new__(PrototypeRuntime)
        runtime._pending_pipeline_results = []
        runtime._pending_pipeline_results_lock = threading.Lock()
        runtime.queue_pipeline_result("first")
        runtime.queue_pipeline_result("second")
        self.assertEqual(runtime.drain_pipeline_results(), ["first", "second"])
        runtime.queue_pipeline_result("third")
        runtime.clear_pending_pipeline_results()
        self.assertEqual(runtime.drain_pipeline_results(), [])

    def test_pending_pipeline_results_drain_skips_duplicate_segments(self) -> None:
        segment_a = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment_b = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo lagi",
            translated_text="Hello again",
        )
        result_a = SimpleNamespace(segment=segment_a)
        result_b = SimpleNamespace(segment=segment_b)
        window = SimpleNamespace(
            runtime=SimpleNamespace(drain_pipeline_results=mock.Mock(return_value=[result_a, result_b])),
            _processed_pipeline_segment_ids=set(),
            handle_pipeline_segment=mock.Mock(side_effect=lambda result: window._processed_pipeline_segment_ids.add(result.segment.segment_id)),
            _log_pipeline_trace=mock.Mock(),
            log_event=mock.Mock(),
        )

        TranslateITWindow._drain_pending_pipeline_results(window)

        window.handle_pipeline_segment.assert_called_once_with(result_a)

    def test_write_benchmark_reports_requires_session_id(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        payload = write_benchmark_reports(segment, session_id="S1")
        self.assertEqual(payload["session_id"], "S1")
        self.assertEqual(payload["segment_id"], "SEG1")
        self.assertIn("metric_groups", payload)

    def test_export_reports_writes_benchmark_latest_files(self) -> None:
        runtime = PrototypeRuntime.__new__(PrototypeRuntime)
        runtime.session = SimpleNamespace(
            session_id="S1",
            benchmark_summary_dict=mock.Mock(
                return_value={
                    "completed_segments": 1,
                    "rejected_segments": 0,
                    "average_asr_ms": 10,
                    "average_translation_ms": 20,
                    "p50_target_ms": 1500,
                    "p95_target_ms": 2500,
                    "meets_p50_target": True,
                    "meets_p95_target": True,
                    "bottleneck_reason": "TTS",
                    "fallback_count": 0,
                    "error_count": 0,
                    "total_after_eos": {"p50_ms": 100, "p95_ms": 150, "worst_ms": 200},
                }
            ),
        )
        runtime.config = SimpleNamespace(
            cache_dir=PROJECT_ROOT / "UserData" / "CacheData",
            source_language="id",
            target_language="en",
            primary_asr_model="large-v3-turbo",
            translation_engine_name="local-nllb-distilled",
        )
        runtime.cuda_status = SimpleNamespace(
            core_status="CUDA_CORE_PASS",
            gpu_name="GPU",
            torch_version="2",
            torch_cuda_build="12.6",
        )
        runtime.asr_loader = SimpleNamespace(device="cuda", compute_type="float16")
        with mock.patch.object(
            PrototypeRuntime,
            "_write_session_benchmark_reports_if_changed",
            return_value={"session_id": "S1"},
        ), mock.patch("EngineData.LauncherApp.app_main.write_json_report") as write_json, mock.patch(
            "EngineData.LauncherApp.app_main.write_text_report"
        ) as write_text:
            json_path, text_path = PrototypeRuntime.export_reports(runtime)

        write_json.assert_called_once()
        write_text.assert_called_once()
        self.assertEqual(json_path.name, "benchmark_latest.json")
        self.assertEqual(text_path.name, "benchmark_latest.txt")

    def test_tts_backend_selection_from_env(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        with mock.patch.dict(tts_module.os.environ, {"TRANSLATEIT_TTS_BACKEND": "sapi_direct_async"}, clear=False):
            tts = tts_module.TTSPlaceholder()
            self.assertEqual(tts._resolve_backend(), "sapi_direct_async")
            self.assertEqual(tts._backend_meta("sapi_direct_async")["supports_direct_playback"], True)

        with mock.patch.dict(tts_module.os.environ, {"TRANSLATEIT_TTS_BACKEND": "unknown_backend"}, clear=False):
            tts = tts_module.TTSPlaceholder()
            self.assertEqual(tts._resolve_backend(), "legacy_sapi_wav")

    def test_custom_voice_profile_forces_voice_actor_backend(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder(
            custom_voice_profile_id="marcel",
            custom_voice_profiles_root=Path(
                "D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices"
            ),
        )
        self.assertEqual(tts.backend_name, "voice_actor_onnx")
        self.assertEqual(tts._resolve_backend(), "voice_actor_onnx")

    def test_launcher_bootstrap_defaults_live_tts_to_direct_async(self) -> None:
        from EngineData.LauncherApp import launcher_bootstrap
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        with mock.patch.dict(tts_module.os.environ, {}, clear=True):
            launcher_bootstrap.ensure_environment()
            tts = tts_module.TTSPlaceholder()
            self.assertEqual(tts._resolve_backend(), "sapi_direct_async")
            request = tts_module.TTSRequest(
                segment_id="S1",
                text="Halo",
                output_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts.wav"),
            )
            direct_result = tts_module.TTSResult(
                segment_id="S1",
                status="Completed",
                mode="sapi_direct_async",
                direct_playback=True,
                backend_name="sapi_direct_async",
                backend_selected="sapi_direct_async",
            )
            with mock.patch.object(tts, "_speak_direct_async", return_value=direct_result) as mocked_direct, mock.patch.object(
                tts, "_speak_with_persistent_powershell"
            ) as mocked_legacy:
                result = tts.speak(request)
            self.assertEqual(result.mode, "sapi_direct_async")
            mocked_direct.assert_called_once()
            mocked_legacy.assert_not_called()

    def test_tts_backend_fallback_reason_is_reported(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        result = tts_module.TTSResult(segment_id="S1", status="Completed", mode="sapi_direct_async", backend_name="legacy_sapi_wav", backend_selected="legacy_sapi_wav", backend_fallback_reason="direct failed; fell back")
        self.assertIn("fell back", result.backend_fallback_reason)

    def test_direct_backend_does_not_trigger_legacy_on_success(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder()
        tts.backend_name = "sapi_direct_async"
        request = tts_module.TTSRequest(segment_id="S1", text="Halo", output_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts.wav"))
        direct_result = tts_module.TTSResult(segment_id="S1", status="Completed", mode="sapi_direct_async", direct_playback=True, backend_name="sapi_direct_async", backend_selected="sapi_direct_async")
        with mock.patch.object(tts, "_speak_direct_async", return_value=direct_result) as mocked_direct, mock.patch.object(tts, "_speak_with_persistent_powershell") as mocked_legacy:
            result = tts.speak(request)
            self.assertEqual(result.mode, "sapi_direct_async")
            mocked_direct.assert_called_once()
            mocked_legacy.assert_not_called()

    def test_write_crash_record_persists_text_and_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            crash_root = Path(tmpdir)
            with mock.patch.object(app_logger, "LOG_ROOT", crash_root):
                payload = app_logger.write_crash_record(
                    "app_crash",
                    "unit_test_crash",
                    RuntimeError("boom"),
                    details={"stage": "unit"},
                    context={"phase": "test"},
                )
            text_path = crash_root / "app_crash_latest.log"
            json_path = crash_root / "app_crash_latest.json"
            self.assertTrue(text_path.exists())
            self.assertTrue(json_path.exists())
            text = text_path.read_text(encoding="utf-8")
            parsed = json.loads(json_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["event"], "unit_test_crash")
            self.assertEqual(parsed["event"], "unit_test_crash")
            self.assertEqual(parsed["exception_type"], "RuntimeError")
            self.assertEqual(parsed["context"]["phase"], "test")
            self.assertIn("RuntimeError", text)
            self.assertIn("boom", text)
            self.assertIn("unit_test_crash", text)

    def test_install_global_crash_recorders_installs_hooks(self) -> None:
        orig_sys_excepthook = sys.excepthook
        orig_threading_excepthook = getattr(threading, "excepthook", None)
        orig_unraisablehook = getattr(sys, "unraisablehook", None)
        from EngineData.LauncherApp import app_logger as crash_logger

        with tempfile.TemporaryDirectory() as tmpdir:
            crash_root = Path(tmpdir)
            with mock.patch.object(crash_logger, "LOG_ROOT", crash_root), mock.patch.object(
                crash_logger.faulthandler, "enable"
            ) as mocked_enable:
                crash_logger._CRASH_RECORDERS_INSTALLED = False
                crash_logger._CRASH_FATAL_HANDLE = None
                crash_logger.install_global_crash_recorders(startup_context=lambda: {"phase": "unit"})
                self.assertNotEqual(sys.excepthook, orig_sys_excepthook)
                if orig_threading_excepthook is not None:
                    self.assertNotEqual(threading.excepthook, orig_threading_excepthook)
                self.assertTrue(mocked_enable.called)
                crash_logger.write_crash_record(
                    "app_crash",
                    "thread_exception",
                    RuntimeError("boom"),
                    context={"phase": "unit"},
                )
                self.assertTrue((crash_root / "app_crash_latest.log").exists())
                self.assertTrue((crash_root / "app_crash_latest.json").exists())
                if crash_logger._CRASH_FATAL_HANDLE is not None:
                    crash_logger._CRASH_FATAL_HANDLE.close()
                    crash_logger._CRASH_FATAL_HANDLE = None
                crash_logger._CRASH_RECORDERS_INSTALLED = False
        sys.excepthook = orig_sys_excepthook
        if orig_threading_excepthook is not None:
            threading.excepthook = orig_threading_excepthook  # type: ignore[assignment]
        if orig_unraisablehook is not None:
            sys.unraisablehook = orig_unraisablehook  # type: ignore[assignment]

    def test_direct_backend_waits_for_active_speech_instead_of_canceling(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder()
        tts.backend_name = "sapi_direct_async"
        tts._ps_process = SimpleNamespace(
            pid=1234,
            poll=lambda: None,
            stdin=SimpleNamespace(write=mock.Mock(), flush=mock.Mock()),
            stdout=SimpleNamespace(),
        )
        tts._ps_worker_ready = True
        tts._ps_pending = {}
        tts._direct_speech_active = True
        tts._direct_speech_request_id = "req-old"
        tts._direct_speech_done_event = SimpleNamespace(wait=mock.Mock(return_value=True))
        request = tts_module.TTSRequest(
            segment_id="S1",
            text="Halo",
            output_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts.wav"),
        )
        direct_result = tts_module.TTSResult(
            segment_id="S1",
            status="Playing",
            mode="sapi_direct_async",
            direct_playback=True,
            backend_name="sapi_direct_async",
            backend_selected="sapi_direct_async",
        )
        with mock.patch.object(tts, "_stop_direct_worker") as mocked_stop, mock.patch.object(
            tts, "_ensure_direct_sapi_worker", return_value=True
        ), mock.patch.object(tts_module.threading.Thread, "start", autospec=True, side_effect=lambda self: self.run()), mock.patch.object(
            tts_module.threading.Event,
            "wait",
            return_value=True,
        ), mock.patch.object(tts, "_trace"), mock.patch.object(tts, "_wait_for_direct_speech_turn", wraps=tts._wait_for_direct_speech_turn) as mocked_wait:
            result = tts._speak_direct_async(
                request=request,
                text="Halo",
                normalized_text="Halo",
                started=0.0,
                text_prep_ms=0,
                request_start_ms=0,
                worker_was_ready=True,
            )

        self.assertEqual(result.mode, "sapi_direct_async")
        mocked_wait.assert_called_once()
        mocked_stop.assert_not_called()

    def test_direct_backend_warmup_uses_direct_worker(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        with mock.patch.dict(tts_module.os.environ, {"TRANSLATEIT_TTS_BACKEND": "sapi_direct_async"}, clear=False):
            tts = tts_module.TTSPlaceholder()
            with mock.patch.object(tts, "_ensure_direct_sapi_worker", return_value=True) as mocked_direct, mock.patch.object(
                tts, "_ensure_powershell_worker"
            ) as mocked_legacy:
                result = tts.warmup_engine()
        self.assertEqual(result["mode"], "sapi_direct_async")
        self.assertTrue(result["loaded"])
        mocked_direct.assert_called_once()
        mocked_legacy.assert_not_called()

    def test_direct_worker_launch_includes_sta_flag(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        with mock.patch.object(tts_module.sys, "platform", "win32"):
            tts = tts_module.TTSPlaceholder()
            fake_process = SimpleNamespace(pid=1234, poll=lambda: None, stdout=io.StringIO(""), stdin=io.StringIO())
            with mock.patch.object(tts_module.subprocess, "Popen", return_value=fake_process) as mocked_popen, mock.patch.object(
                tts_module.threading.Thread,
                "start",
                return_value=None,
            ):
                self.assertTrue(tts._ensure_direct_sapi_worker())
                self.assertTrue(tts._ensure_direct_sapi_worker())
        launched_args = mocked_popen.call_args.args[0]
        self.assertIn("-STA", launched_args)
        self.assertIn("powershell", launched_args[0].lower())
        self.assertEqual(mocked_popen.call_count, 1)

    def test_direct_worker_script_no_longer_cancels_all_before_every_utterance(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        with mock.patch.object(tts_module.sys, "platform", "win32"):
            tts = tts_module.TTSPlaceholder()
            fake_process = SimpleNamespace(pid=1234, poll=lambda: None, stdout=io.StringIO(""), stdin=io.StringIO())
            with mock.patch.object(tts_module.subprocess, "Popen", return_value=fake_process), mock.patch.object(
                tts_module.Path,
                "write_text",
                autospec=True,
                return_value=None,
            ) as mocked_write_text, mock.patch.object(tts_module.threading.Thread, "start", return_value=None):
                self.assertTrue(tts._ensure_direct_sapi_worker())
        script_text = mocked_write_text.call_args.args[1]
        self.assertEqual(script_text.count("SpeakAsyncCancelAll()"), 1)

    def test_custom_voice_warmup_uses_voice_actor_backend(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder(
            custom_voice_profile_id="marcel",
            custom_voice_profiles_root=Path(
                "D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices"
            ),
        )
        fake_profile = SimpleNamespace(profile_id="marcel", model_version="model-v1")
        with mock.patch.object(tts, "_resolve_custom_voice_profile", return_value=fake_profile), mock.patch.object(
            tts._voice_provider_selector,
            "select_provider",
            return_value=SimpleNamespace(
                benchmark=SimpleNamespace(
                    provider_used="cpu",
                    provider_benchmark_ms=15,
                    provider_selection_reason="cpu_fastest",
                ),
                provider=SimpleNamespace(),
            ),
        ) as mocked_select:
            result = tts.warmup_engine()
        self.assertEqual(result["mode"], "voice_actor_onnx")
        self.assertTrue(result["loaded"])
        self.assertEqual(result["provider_used"], "cpu")
        mocked_select.assert_called_once()

    def test_custom_voice_warmup_is_cached_after_first_success(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder(
            custom_voice_profile_id="marcel",
            custom_voice_profiles_root=Path(
                "D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices"
            ),
        )
        tts.backend_name = "voice_actor_onnx"
        warmup_result = {"loaded": True, "mode": "voice_actor_onnx", "latency_ms": 123, "message": "warm"}
        with mock.patch.object(tts, "_warmup_engine_impl", return_value=warmup_result) as mocked_impl:
            first = tts.warmup_engine()
            second = tts.warmup_engine()
        self.assertEqual(first["loaded"], True)
        self.assertEqual(second["loaded"], True)
        self.assertEqual(mocked_impl.call_count, 1)

    def test_custom_voice_background_warmup_only_starts_once(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder(
            custom_voice_profile_id="marcel",
            custom_voice_profiles_root=Path(
                "D:/Work/AI Stuff/TranslateIT-ISSUED/DevelopingPack/UserData/SavedData/profiles/default/voices"
            ),
        )
        tts.backend_name = "voice_actor_onnx"
        warmup_result = {"loaded": True, "mode": "voice_actor_onnx", "latency_ms": 123, "message": "warm"}
        with mock.patch.object(tts, "_run_warmup_once", return_value=warmup_result) as mocked_run, mock.patch.object(
            tts_module.threading.Thread,
            "start",
            autospec=True,
            side_effect=lambda self: self.run(),
        ):
            first = tts.begin_background_warmup()
            second = tts.begin_background_warmup()
        self.assertTrue(first)
        self.assertFalse(second)
        self.assertEqual(mocked_run.call_count, 1)

    def test_voice_provider_selector_prefers_cuda_when_it_is_faster_and_caches_result(self) -> None:
        from EngineData.TranslateEngine import voice_provider_selection as vp

        with tempfile.TemporaryDirectory(prefix="voice-provider-selector-") as temp_dir:
            selector = vp.VoiceProviderSelector(Path(temp_dir) / "selection_cache.json", benchmark_timeout_ms=500)
            profile = vp.VoiceActorProfile(
                profile_id="marcel",
                display_name="Marcel",
                language="en",
                model_path=Path(temp_dir) / "fake_model.onnx",
                config_path=Path(temp_dir) / "fake_model.onnx.json",
                model_version="model-v1",
            )
            build_calls: list[str] = []
            benchmark_calls: list[str] = []

            def fake_build_renderer(_profile, provider_used):
                build_calls.append(provider_used)
                return SimpleNamespace(provider_used=provider_used)

            def fake_benchmark_renderer(renderer):
                benchmark_calls.append(renderer.provider_used)
                return 8 if renderer.provider_used == "cuda" else 19

            with mock.patch.object(selector, "_available_providers", return_value=["cuda", "cpu"]), mock.patch.object(
                selector, "_build_renderer", side_effect=fake_build_renderer
            ), mock.patch.object(selector, "_benchmark_renderer", side_effect=fake_benchmark_renderer):
                first = selector.select_provider(profile)

            self.assertEqual(first.benchmark.provider_used, "cuda")
            self.assertEqual(first.benchmark.provider_selection_reason, "cuda_fastest")
            self.assertIsNotNone(first.provider)
            self.assertEqual(benchmark_calls, ["cuda", "cpu"])
            self.assertEqual(build_calls, ["cuda", "cpu"])

            with mock.patch.object(selector, "_available_providers", return_value=["cuda", "cpu"]), mock.patch.object(
                selector, "_build_renderer", side_effect=AssertionError("cached provider should not rebuild")
            ), mock.patch.object(selector, "_benchmark_renderer", side_effect=AssertionError("cached provider should not re-benchmark")):
                second = selector.select_provider(profile)

            self.assertTrue(second.benchmark.cached)
            self.assertEqual(second.benchmark.provider_used, "cuda")
            self.assertIsNotNone(second.provider)

    def test_voice_provider_selector_uses_cpu_when_cuda_is_unavailable(self) -> None:
        from EngineData.TranslateEngine import voice_provider_selection as vp

        with tempfile.TemporaryDirectory(prefix="voice-provider-selector-") as temp_dir:
            selector = vp.VoiceProviderSelector(Path(temp_dir) / "selection_cache.json", benchmark_timeout_ms=500)
            profile = vp.VoiceActorProfile(
                profile_id="marcel",
                display_name="Marcel",
                language="en",
                model_path=Path(temp_dir) / "fake_model.onnx",
                config_path=Path(temp_dir) / "fake_model.onnx.json",
                model_version="model-v1",
            )

            def fake_build_renderer(_profile, provider_used):
                return SimpleNamespace(provider_used=provider_used)

            def fake_benchmark_renderer(renderer):
                return 11 if renderer.provider_used == "cpu" else 999

            with mock.patch.object(selector, "_available_providers", return_value=["cpu"]), mock.patch.object(
                selector, "_build_renderer", side_effect=fake_build_renderer
            ), mock.patch.object(selector, "_benchmark_renderer", side_effect=fake_benchmark_renderer):
                result = selector.select_provider(profile)

            self.assertEqual(result.benchmark.provider_used, "cpu")
            self.assertEqual(result.benchmark.provider_selection_reason, "cuda_unavailable")

    def test_voice_provider_selector_recovers_after_lazy_piper_import(self) -> None:
        from EngineData.TranslateEngine import voice_provider_selection as vp
        from EngineData.LauncherApp.audio_settings import load_audio_settings

        with tempfile.TemporaryDirectory(prefix="voice-provider-selector-") as temp_dir:
            selector = vp.VoiceProviderSelector(Path(temp_dir) / "selection_cache.json", benchmark_timeout_ms=500)
            settings = load_audio_settings()
            profile = vp.resolve_voice_actor_profile(
                voice_profiles_root=Path(settings.voice_actor_profiles_root),
                voice_profile_id="marcel",
            )
            self.assertIsNotNone(profile)

            with mock.patch.object(vp, "PiperVoice", None), mock.patch.object(vp, "SynthesisConfig", None):
                loaded_voice, loaded_config = vp._ensure_piper_runtime()

            self.assertIsNotNone(loaded_voice)
            self.assertIsNotNone(loaded_config)

            with mock.patch.object(selector, "_available_providers", return_value=["cpu"]):
                result = selector.select_provider(profile, force_retest=True)  # type: ignore[arg-type]

            self.assertEqual(result.benchmark.provider_used, "cpu")
            self.assertEqual(result.benchmark.provider_selection_reason, "cuda_unavailable")
            self.assertIsNotNone(result.provider)

    def test_voice_provider_selector_falls_back_to_default_voice_when_every_benchmark_fails(self) -> None:
        from EngineData.TranslateEngine import voice_provider_selection as vp

        with tempfile.TemporaryDirectory(prefix="voice-provider-selector-") as temp_dir:
            selector = vp.VoiceProviderSelector(Path(temp_dir) / "selection_cache.json", benchmark_timeout_ms=500)
            profile = vp.VoiceActorProfile(
                profile_id="marcel",
                display_name="Marcel",
                language="en",
                model_path=Path(temp_dir) / "fake_model.onnx",
                config_path=Path(temp_dir) / "fake_model.onnx.json",
                model_version="model-v1",
            )

            def fake_build_renderer(_profile, provider_used):
                return SimpleNamespace(provider_used=provider_used)

            def fake_benchmark_renderer(_renderer):
                raise RuntimeError("render failed")

            with mock.patch.object(selector, "_available_providers", return_value=["cuda", "cpu"]), mock.patch.object(
                selector, "_build_renderer", side_effect=fake_build_renderer
            ), mock.patch.object(selector, "_benchmark_renderer", side_effect=fake_benchmark_renderer):
                result = selector.select_provider(profile)

            self.assertEqual(result.benchmark.provider_used, "default_voice")
            self.assertEqual(result.benchmark.provider_selection_reason, "default_voice_fallback")
            self.assertIsNone(result.provider)

    def test_voice_provider_selector_keeps_cuda_when_cpu_benchmark_fails(self) -> None:
        from EngineData.TranslateEngine import voice_provider_selection as vp

        with tempfile.TemporaryDirectory(prefix="voice-provider-selector-") as temp_dir:
            selector = vp.VoiceProviderSelector(Path(temp_dir) / "selection_cache.json", benchmark_timeout_ms=500)
            profile = vp.VoiceActorProfile(
                profile_id="marcel",
                display_name="Marcel",
                language="en",
                model_path=Path(temp_dir) / "fake_model.onnx",
                config_path=Path(temp_dir) / "fake_model.onnx.json",
                model_version="model-v1",
            )

            def fake_build_renderer(_profile, provider_used):
                return SimpleNamespace(provider_used=provider_used)

            def fake_benchmark_renderer(renderer):
                if renderer.provider_used == "cuda":
                    return 7
                raise RuntimeError("cpu failed")

            with mock.patch.object(selector, "_available_providers", return_value=["cuda", "cpu"]), mock.patch.object(
                selector, "_build_renderer", side_effect=fake_build_renderer
            ), mock.patch.object(selector, "_benchmark_renderer", side_effect=fake_benchmark_renderer):
                result = selector.select_provider(profile)

            self.assertEqual(result.benchmark.provider_used, "cuda")
            self.assertEqual(result.benchmark.provider_selection_reason, "cuda_fastest")
            self.assertIsNotNone(result.provider)

    def test_custom_voice_fallback_records_provider_metadata(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module
        from EngineData.TranslateEngine import voice_provider_selection as vp

        tts = tts_module.TTSPlaceholder()
        voice_profile = vp.VoiceActorProfile(
            profile_id="marcel",
            display_name="Marcel",
            language="en",
            model_path=PROJECT_ROOT / "UserData" / "CacheData" / "fake_model.onnx",
            config_path=PROJECT_ROOT / "UserData" / "CacheData" / "fake_model.onnx.json",
            model_version="model-v1",
        )
        fallback_result = tts_module.TTSResult(
            segment_id="S1",
            status="Completed",
            mode="local_windows_sapi",
            backend_name="legacy_sapi_wav",
            backend_selected="legacy_sapi_wav",
            provider_used="default_voice",
            provider_benchmark_ms=0,
            provider_selection_reason="default_voice_fallback",
            provider_voice_profile_id="",
            provider_model_version="",
        )
        with mock.patch.object(tts, "_resolve_custom_voice_profile", return_value=voice_profile), mock.patch.object(
            tts._voice_provider_selector,
            "select_provider",
            return_value=SimpleNamespace(
                benchmark=vp.ProviderBenchmark(
                    provider_used="default_voice",
                    provider_benchmark_ms=0,
                    provider_selection_reason="default_voice_fallback",
                    model_version="model-v1",
                    voice_profile_id="marcel",
                ),
                provider=None,
            ),
        ), mock.patch.object(tts, "_speak_with_persistent_powershell", return_value=fallback_result) as mocked_fallback:
            result = tts._speak_with_custom_voice_actor(
                request=tts_module.TTSRequest(segment_id="S1", text="Halo", output_path=str(PROJECT_ROOT / "UserData" / "CacheData" / "tts.wav")),
                text="Halo",
                normalized_text="Halo",
                output_path=PROJECT_ROOT / "UserData" / "CacheData" / "tts.wav",
                started=0.0,
                text_prep_ms=0,
                request_start_ms=0,
            )

        mocked_fallback.assert_called_once()
        self.assertEqual(result.provider_used, "default_voice")
        self.assertEqual(result.provider_benchmark_ms, 0)
        self.assertEqual(result.provider_selection_reason, "default_voice_fallback")

    def test_tts_breakdown_exposes_provider_selection_metadata(self) -> None:
        from EngineData.LauncherApp.session_reporting import build_tts_breakdown, build_text_latency_payload

        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
        )
        segment.latency.tts_provider_used = "cuda"
        segment.latency.tts_provider_benchmark_ms = 12
        segment.latency.tts_provider_selection_reason = "cuda_fastest"
        breakdown = build_tts_breakdown(segment)
        payload = build_text_latency_payload(segment, session_id="S1")
        self.assertEqual(breakdown["provider_used"], "cuda")
        self.assertEqual(breakdown["provider_benchmark_ms"], 12)
        self.assertEqual(breakdown["provider_selection_reason"], "cuda_fastest")
        self.assertEqual(payload["provider_used"], "cuda")
        self.assertEqual(payload["provider_benchmark_ms"], 12)
        self.assertEqual(payload["provider_selection_reason"], "cuda_fastest")

    def test_tts_reset_runtime_state_clears_pending_and_resets_events(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder()
        start_event = threading.Event()
        done_event = threading.Event()
        tts._ps_pending = {
            "REQ1": (
                start_event,
                done_event,
                {"line": "", "voice_completed_time": ""},
            )
        }
        tts._custom_voice_active = True
        tts._custom_voice_cancel_event = threading.Event()
        tts._warmup_in_progress = True
        tts._warmup_event.clear()
        tts._direct_speech_active = True
        tts._direct_speech_done_event = threading.Event()
        tts._ps_worker_ready = True

        tts.reset_runtime_state()

        self.assertEqual(tts._ps_pending, {})
        self.assertFalse(tts._custom_voice_active)
        self.assertFalse(tts._warmup_in_progress)
        self.assertTrue(tts._warmup_event.is_set())
        self.assertFalse(tts._direct_speech_active)
        self.assertIsNone(tts._direct_speech_done_event)
        self.assertFalse(tts._ps_worker_ready)
        self.assertFalse(tts._custom_voice_cancel_event.is_set())
        self.assertTrue(tts.is_runtime_idle())
        self.assertTrue(tts.is_runtime_idle())

    def test_tts_reset_runtime_state_preserves_idle_direct_worker_for_restart(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder()
        tts._ps_process = SimpleNamespace(poll=mock.Mock(return_value=None))
        tts._ps_worker_ready = True
        tts._direct_speech_active = False
        tts._custom_voice_active = False
        tts._warmup_in_progress = False

        with mock.patch.object(tts, "_stop_direct_worker") as mocked_stop:
            tts.reset_runtime_state()

        mocked_stop.assert_not_called()
        self.assertTrue(tts._ps_worker_ready)
        self.assertIsNotNone(tts._ps_process)
        self.assertTrue(tts.is_runtime_idle())

    def test_tts_shutdown_runtime_state_stops_idle_direct_worker_when_runtime_changes(self) -> None:
        from EngineData.TranslateEngine import tts_placeholder as tts_module

        tts = tts_module.TTSPlaceholder()
        tts._ps_pending = {"REQ1": (threading.Event(), threading.Event(), {})}
        tts._warmup_in_progress = True
        tts._warmup_event.clear()

        def stop_worker() -> None:
            tts._ps_worker_ready = False
            tts._ps_process = None

        with mock.patch.object(tts, "_stop_direct_worker", side_effect=stop_worker) as mocked_stop:
            tts.shutdown_runtime_state()

        mocked_stop.assert_called_once()
        self.assertFalse(tts._warmup_in_progress)
        self.assertTrue(tts._warmup_event.is_set())
        self.assertEqual(tts._ps_pending, {})
        self.assertFalse(tts._ps_worker_ready)
        self.assertIsNone(tts._ps_process)

    def test_reset_tts_dispatch_state_uses_runtime_reset(self) -> None:
        runtime = SimpleNamespace(tts=SimpleNamespace(reset_runtime_state=mock.Mock()))
        window = SimpleNamespace(
            runtime=runtime,
            pending_tts_jobs={"REQ1": object()},
            pending_tts_segment_id="SEG1",
            pending_tts_autoplay=True,
            _pending_playback_request_perf_by_path={"x": 1.0},
            _pending_playback_queue_perf_by_path={"x": 1.0},
            _pending_playback_worker_dequeue_perf_by_path={"x": 1.0},
            _pending_playback_backend_prep_start_perf_by_path={"x": 1.0},
            _pending_playback_backend_prep_end_perf_by_path={"x": 1.0},
            _pending_playback_backend_start_perf_by_path={"x": 1.0},
            _pending_playback_audio_start_perf_by_path={"x": 1.0},
            _pending_playback_backend_return_perf_by_path={"x": 1.0},
            _pending_playback_submit_perf_by_path={"x": 1.0},
            _pending_playback_segment_id_by_path={"x": "SEG1"},
        )

        TranslateITWindow._reset_tts_dispatch_state(window)

        runtime.tts.reset_runtime_state.assert_called_once()
        self.assertEqual(window.pending_tts_jobs, {})
        self.assertIsNone(window.pending_tts_segment_id)
        self.assertFalse(window.pending_tts_autoplay)

    def test_reset_tts_dispatch_state_falls_back_when_runtime_reset_fails(self) -> None:
        runtime = SimpleNamespace(
            tts=SimpleNamespace(
                reset_runtime_state=mock.Mock(side_effect=RuntimeError("boom")),
                cancel_active_speech=mock.Mock(),
            )
        )
        window = SimpleNamespace(
            runtime=runtime,
            pending_tts_jobs={},
            pending_tts_segment_id=None,
            pending_tts_autoplay=True,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_prep_start_perf_by_path={},
            _pending_playback_backend_prep_end_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _pending_playback_segment_id_by_path={},
            _last_playback_error="",
        )

        TranslateITWindow._reset_tts_dispatch_state(window)

        runtime.tts.reset_runtime_state.assert_called_once()
        runtime.tts.cancel_active_speech.assert_called_once()
        self.assertIn("boom", window._last_playback_error)

    def test_model_loaders_reuse_loaded_models(self) -> None:
        asr_loader = ASRModelLoader()
        asr_loader._loaded_result = SimpleNamespace(loaded=True)
        asr_loader._loaded_request_key = ("large-v3-turbo", "cuda", "float16")
        result = asr_loader.load_model()
        self.assertTrue(result.loaded)

        translation_engine = TranslationEngine()
        translation_engine._model = object()
        translation_engine._tokenizer = object()
        translation_engine._loaded_model_id = "cached-model"
        capability = translation_engine.load_local_model()
        self.assertIn(capability.mode, {"placeholder", "real_local_model", "pending_local_model"})

    def test_translation_engine_uses_cuda_and_greedy_generation_when_available(self) -> None:
        translation_engine = TranslationEngine()

        class _FakeTensor:
            def to(self, _device):
                return self

        class _FakeOutputTokens:
            def detach(self):
                return self

            def cpu(self):
                return self

        class _FakeTokenizer:
            def __init__(self) -> None:
                self.src_lang = ""
                self.last_batch_decode_arg = None

            def __call__(self, *_args, **_kwargs):
                return {"input_ids": _FakeTensor(), "attention_mask": _FakeTensor()}

            def convert_tokens_to_ids(self, token):
                return 777 if token == "eng_Latn" else 0

            def batch_decode(self, output_tokens, skip_special_tokens=True):
                self.last_batch_decode_arg = (output_tokens, skip_special_tokens)
                return ["Halo dunia"]

        class _FakeGenerationConfig:
            use_cache = False
            num_beams = 0
            do_sample = True
            max_new_tokens = 0

        class _FakeModel:
            def __init__(self) -> None:
                self.generation_config = _FakeGenerationConfig()
                self.generate_call_kwargs = None
                self.device = None
                self.half_called = False
                self.eval_called = False

            def to(self, device):
                self.device = device
                return self

            def half(self):
                self.half_called = True
                return self

            def eval(self):
                self.eval_called = True
                return self

            def generate(self, **kwargs):
                self.generate_call_kwargs = kwargs
                return _FakeOutputTokens()

        fake_tokenizer = _FakeTokenizer()
        fake_model = _FakeModel()
        fake_torch = types.SimpleNamespace(
            cuda=types.SimpleNamespace(is_available=lambda: True),
            inference_mode=lambda: contextlib.nullcontext(),
            set_float32_matmul_precision=lambda *args, **kwargs: None,
            backends=types.SimpleNamespace(
                cuda=types.SimpleNamespace(
                    matmul=types.SimpleNamespace(allow_tf32=False),
                    cudnn=types.SimpleNamespace(allow_tf32=False),
                    allow_fp16_reduced_precision_reduction=False,
                    allow_bf16_reduced_precision_reduction=False,
                    enable_flash_sdp=lambda *_args, **_kwargs: None,
                    enable_mem_efficient_sdp=lambda *_args, **_kwargs: None,
                    enable_math_sdp=lambda *_args, **_kwargs: None,
                )
            ),
        )

        with mock.patch.dict(
            sys.modules,
            {
                "torch": fake_torch,
                "transformers": types.SimpleNamespace(),
            },
            clear=False,
        ):
            translation_engine._tokenizer = fake_tokenizer
            translation_engine._model = fake_model
            translation_engine._loaded_model_id = "facebook/nllb-200-distilled-600M"
            translation_engine._loaded_engine_name = "local-nllb-distilled"
            translation_engine._device = "cuda"
            translation_engine._dtype = "float16"
            translation_engine.load_local_model = mock.Mock(
                return_value=SimpleNamespace(available=True, mode="real_local_model", engine_name="local-nllb-distilled", message="loaded")
            )
            result = translation_engine.translate(
                TranslationRequest(
                    segment_id="SEG1",
                    source_text="Halo coba bicara lagi.",
                    source_language="id",
                    target_language="en",
                    context_window=("Halo",),
                )
            )

        self.assertEqual(result.device, "cuda")
        self.assertEqual(result.dtype, "float16")
        self.assertEqual(result.translated_text, "Halo dunia")
        self.assertEqual(fake_model.generate_call_kwargs["num_beams"], 1)
        self.assertFalse(fake_model.generate_call_kwargs["do_sample"])
        self.assertEqual(fake_model.generate_call_kwargs["forced_bos_token_id"], 777)

    def test_language_routing_focuses_on_id_and_en_only(self) -> None:
        self.assertEqual(normalize_language_code("ind_Latn"), "id")
        self.assertEqual(normalize_language_code("eng_Latn"), "en")
        self.assertTrue(is_focus_language("id"))
        self.assertTrue(is_focus_language("en"))
        self.assertFalse(is_focus_language("ja"))
        self.assertFalse(is_focus_language(""))
        self.assertFalse(should_translate_segment(detected_language="en", source_language="id", target_language="en"))
        self.assertTrue(should_translate_segment(detected_language="id", source_language="id", target_language="en"))
        self.assertFalse(should_translate_segment(detected_language="id", source_language="id", target_language="id"))

    def test_translation_engine_passthrough_skips_redundant_translation(self) -> None:
        translation_engine = TranslationEngine()
        result = translation_engine.passthrough_translation(
            TranslationRequest(
                segment_id="SEG1",
                source_text="This should stay in English.",
                source_language="en",
                target_language="en",
            ),
            detected_language="en",
        )
        self.assertEqual(result.mode, "passthrough")
        self.assertEqual(result.status, "Skipped")
        self.assertEqual(result.translated_text, "This should stay in English.")
        self.assertEqual(result.latency_ms, 0)
        self.assertIn("This should stay in English.", translation_engine.context.get_window())

    def test_translation_engine_uses_literal_short_phrase_map_before_model(self) -> None:
        translation_engine = TranslationEngine()
        with mock.patch.object(
            translation_engine,
            "load_local_model",
            side_effect=AssertionError("model should not be loaded for short literal phrases"),
        ):
            result = translation_engine.translate(
                TranslationRequest(
                    segment_id="SEG2",
                    source_text="Halo coba berbicara.",
                    source_language="id",
                    target_language="en",
                )
            )

        self.assertEqual(result.mode, "literal_short_phrase")
        self.assertEqual(result.status, "Completed")
        self.assertEqual(result.translated_text, "Hello, try speaking.")
        self.assertEqual(result.engine_name, "literal-short-translation")
        self.assertFalse(result.fallback_used)

    def test_translation_engine_literally_translates_simple_short_followup_phrase(self) -> None:
        translation_engine = TranslationEngine()
        with mock.patch.object(
            translation_engine,
            "load_local_model",
            side_effect=AssertionError("model should not be loaded for short literal phrases"),
        ):
            result = translation_engine.translate(
                TranslationRequest(
                    segment_id="SEG2B",
                    source_text="Lalu coba bicara.",
                    source_language="id",
                    target_language="en",
                )
            )

        self.assertEqual(result.mode, "literal_short_phrase")
        self.assertEqual(result.status, "Completed")
        self.assertEqual(result.translated_text, "Then try speaking.")
        self.assertEqual(result.engine_name, "literal-short-translation")
        self.assertFalse(result.fallback_used)

    def test_asr_realtime_profile_uses_default_turbo_model(self) -> None:
        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        self.assertEqual(profile.model_name, asr_loader.primary_model)
        self.assertFalse(profile.performance_mode)
        self.assertEqual(profile.compute_type, asr_loader.compute_type)
        self.assertEqual(profile.best_of, 1)
        self.assertIn("Indonesian is the primary spoken language", profile.initial_prompt)
        self.assertIn("halo coba berbicara", profile.initial_prompt)
        self.assertIn("preserve the exact Indonesian words", profile.initial_prompt)
        self.assertIn("Do not invent random words", profile.initial_prompt)

    def test_asr_audio_cache_key_changes_with_initial_prompt(self) -> None:
        asr_loader = ASRModelLoader()
        base_profile = asr_loader.realtime_profile()
        prompt_profile = mock.Mock(
            model_name=base_profile.model_name,
            device=base_profile.device,
            compute_type=base_profile.compute_type,
            vad_filter=base_profile.vad_filter,
            word_timestamps=base_profile.word_timestamps,
            condition_on_previous_text=base_profile.condition_on_previous_text,
            best_of=base_profile.best_of,
            initial_prompt="Live bilingual speech in Indonesian and English.",
        )
        audio = np.zeros(16000, dtype=np.float32)
        self.assertNotEqual(
            ASRModelLoader._audio_cache_key(audio, base_profile),
            ASRModelLoader._audio_cache_key(audio, prompt_profile),
        )

    def test_asr_loader_uses_config_initial_prompt(self) -> None:
        from EngineData.LauncherApp.app_config import EngineConfig

        config = EngineConfig(asr_initial_prompt="Custom bilingual prompt for testing.")
        asr_loader = ASRModelLoader.from_config(config)
        profile = asr_loader.realtime_profile()
        self.assertEqual(asr_loader.initial_prompt, "Custom bilingual prompt for testing.")
        self.assertEqual(profile.initial_prompt, "Custom bilingual prompt for testing.")

    def test_language_routing_bias_prefers_indonesian_for_short_clear_phrases(self) -> None:
        from EngineData.LauncherApp.language_routing import infer_language_bias_from_text

        detected = infer_language_bias_from_text(
            "Halo coba berbicara.",
            detected_language="en",
            source_language="id",
            target_language="en",
            language_probability=0.58,
        )
        self.assertEqual(detected, "id")

        detected_lagi = infer_language_bias_from_text(
            "Lagi.",
            detected_language="en",
            source_language="id",
            target_language="en",
            language_probability=0.49,
        )
        self.assertEqual(detected_lagi, "id")

    def test_language_routing_bias_prefers_english_for_short_clear_english_phrases(self) -> None:
        from EngineData.LauncherApp.language_routing import infer_language_bias_from_text

        detected = infer_language_bias_from_text(
            "Thank you.",
            detected_language="id",
            source_language="id",
            target_language="en",
            language_probability=0.53,
        )
        self.assertEqual(detected, "en")

    def test_translation_engine_collapses_adjacent_duplicate_sentences(self) -> None:
        from EngineData.TranslateEngine.translation_engine import TranslationEngine

        self.assertEqual(
            TranslationEngine._collapse_adjacent_sentence_duplicates("Thank you. Thank you."),
            "Thank you.",
        )

    def test_short_id_focus_text_normalization_rewrites_short_mixed_phrase_even_when_english_dominates(self) -> None:
        from EngineData.LauncherApp.language_routing import normalize_short_id_focus_source_text

        normalized = normalize_short_id_focus_source_text(
            "Check the word bicara.",
            source_language="id",
            target_language="en",
        )
        self.assertEqual(normalized, "cek kata bicara")

    def test_start_button_stays_disabled_while_stop_in_progress(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        start_button = mock.Mock()
        start_button.text.return_value = "Start"
        start_button.property.return_value = "idle"
        start_button.isEnabled.return_value = True
        start_button.style.return_value = SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())
        window = SimpleNamespace(
            runtime=SimpleNamespace(current_status=UIState.STOPPED),
            live_thread=None,
            start_button=start_button,
            _stop_in_progress=True,
            _start_button_signature=None,
        )

        TranslateITWindow.update_start_button_state(window)

        start_button.setEnabled.assert_called_with(False)

    def test_start_button_shows_start_when_engine_is_stopped(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        start_button = mock.Mock()
        start_button.text.return_value = "Start"
        start_button.property.return_value = "idle"
        start_button.isEnabled.return_value = True
        start_button.style.return_value = SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())
        window = SimpleNamespace(
            runtime=SimpleNamespace(current_status=UIState.STOPPED, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            live_thread=None,
            startup_worker=None,
            engine_startup_ready=False,
            _stop_in_progress=False,
            _start_button_signature=None,
            start_button=start_button,
        )

        TranslateITWindow.update_start_button_state(window)

        start_button.setEnabled.assert_called_with(True)
        start_button.setText.assert_not_called()

    def test_start_button_shows_stop_when_stream_is_ready_but_not_actively_listening(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        start_button = mock.Mock()
        start_button.text.return_value = "Start"
        start_button.property.return_value = "idle"
        start_button.isEnabled.return_value = True
        start_button.style.return_value = SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())
        window = SimpleNamespace(
            runtime=SimpleNamespace(current_status=UIState.READY_TO_LISTEN, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            live_thread=SimpleNamespace(isRunning=mock.Mock(return_value=True)),
            startup_worker=None,
            _stop_in_progress=False,
            _start_button_signature=None,
            start_button=start_button,
        )

        TranslateITWindow.update_start_button_state(window)

        start_button.setText.assert_called_with("Stop")
        start_button.setEnabled.assert_called_with(True)
        start_button.setProperty.assert_any_call("runState", "listening")

    def test_refresh_status_panel_shows_stopped_after_stop(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                current_status=UIState.STOPPED,
                audio_settings=SimpleNamespace(use_custom_voice_actor=False, voice_actor_profile_id="", voice_actor_profiles_root=""),
                tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True)),
                cuda_status=SimpleNamespace(
                    core_status="PASS",
                    gpu_name="Test GPU",
                    driver_version="1.0",
                    torch_version="2.0",
                    torch_cuda_build="12.6",
                    torch_cuda_available=True,
                    torch_tensor_execution="cuda",
                    torch_imported=True,
                    blocker="",
                ),
                refresh_cuda_status=mock.Mock(),
                cpu_degraded_mode_enabled=False,
                session=SimpleNamespace(session_id="SESSION-1"),
                accepted_count=0,
                rejected_count=0,
                model_status_lines=mock.Mock(return_value=["found", "found", "found", "found", "found"]),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True))),
                current_calibration=None,
            ),
            live_thread=None,
            startup_worker=None,
            engine_startup_ready=False,
            status_labels=defaultdict(mock.Mock),
            _set_text_if_changed=mock.Mock(),
            _status_panel_signature=None,
            _runtime_badge_signature=None,
            runtime_badge=mock.Mock(),
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Mic")),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            page_title_label=mock.Mock(),
            sidebar_session_label=mock.Mock(),
            session_meta_label=mock.Mock(),
            level_state_label=mock.Mock(),
            level_bar=mock.Mock(),
            calibration_result_label=mock.Mock(),
            update_start_button_state=mock.Mock(),
            update_benchmark_panel=mock.Mock(),
            _get_validation_items=mock.Mock(return_value=[]),
        )

        TranslateITWindow.refresh_status_panel(window)

        from EngineData.LauncherApp.app_main import _status_widget_for

        window._set_text_if_changed.assert_any_call(_status_widget_for(window, "capture"), "Stopped")
        window._set_text_if_changed.assert_any_call(_status_widget_for(window, "replay"), "Replay: Available")
        window._set_text_if_changed.assert_any_call(window.runtime_badge, "Status: Stopped")
        window.update_start_button_state.assert_called_once()

    def test_refresh_status_panel_marks_replay_unavailable_while_capture_is_active(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                current_status=UIState.LISTENING,
                audio_settings=SimpleNamespace(use_custom_voice_actor=False, voice_actor_profile_id="", voice_actor_profiles_root=""),
                tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True)),
                cuda_status=SimpleNamespace(
                    core_status="PASS",
                    gpu_name="Test GPU",
                    driver_version="1.0",
                    torch_version="2.0",
                    torch_cuda_build="12.6",
                    torch_cuda_available=True,
                    torch_tensor_execution="cuda",
                    torch_imported=True,
                    blocker="",
                ),
                refresh_cuda_status=mock.Mock(),
                cpu_degraded_mode_enabled=False,
                session=SimpleNamespace(session_id="SESSION-1"),
                accepted_count=0,
                rejected_count=0,
                model_status_lines=mock.Mock(return_value=["found", "found", "found", "found", "found"]),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True))),
                current_calibration=None,
            ),
            live_thread=SimpleNamespace(isRunning=mock.Mock(return_value=True)),
            startup_worker=None,
            engine_startup_ready=True,
            status_labels=defaultdict(mock.Mock),
            _set_text_if_changed=mock.Mock(),
            _status_panel_signature=None,
            _runtime_badge_signature=None,
            runtime_badge=mock.Mock(),
            device_combo=SimpleNamespace(currentText=mock.Mock(return_value="Mic")),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            page_title_label=mock.Mock(),
            sidebar_session_label=mock.Mock(),
            session_meta_label=mock.Mock(),
            level_state_label=mock.Mock(),
            level_bar=mock.Mock(),
            calibration_result_label=mock.Mock(),
            update_start_button_state=mock.Mock(),
            update_benchmark_panel=mock.Mock(),
            _get_validation_items=mock.Mock(return_value=[]),
        )

        TranslateITWindow.refresh_status_panel(window)

        from EngineData.LauncherApp.app_main import _status_widget_for

        window._set_text_if_changed.assert_any_call(_status_widget_for(window, "replay"), "Replay: Locked")

    def test_show_replay_blocked_notification_uses_clear_capture_message(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        window = SimpleNamespace(
            runtime_badge=SimpleNamespace(
                setText=mock.Mock(),
                setProperty=mock.Mock(),
                style=mock.Mock(return_value=SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())),
            ),
            log_event=mock.Mock(),
            replay_notification_timer=None,
            refresh_status_panel=mock.Mock(),
            _status_panel_signature=None,
            runtime=SimpleNamespace(current_status=SimpleNamespace(value="LISTENING")),
        )

        with mock.patch("EngineData.LauncherApp.app_main.QApplication.instance", return_value=None) as app_instance:
            TranslateITWindow.show_replay_blocked_notification(window, "OUT", "SEG-1")

        window.runtime_badge.setText.assert_called_once_with("Replay locked.")
        app_instance.assert_called_once()
        window.log_event.assert_called_once()

    def test_start_button_stays_preparing_while_capture_thread_exists_but_is_not_running(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        start_button = mock.Mock()
        start_button.text.return_value = "Start"
        start_button.property.return_value = "idle"
        start_button.isEnabled.return_value = True
        start_button.style.return_value = SimpleNamespace(unpolish=mock.Mock(), polish=mock.Mock())
        live_thread = SimpleNamespace(isRunning=mock.Mock(return_value=False))
        window = SimpleNamespace(
            runtime=SimpleNamespace(current_status=UIState.PREPARING, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            live_thread=live_thread,
            startup_worker=None,
            engine_startup_ready=True,
            _stop_in_progress=False,
            _start_button_signature=None,
            start_button=start_button,
        )

        TranslateITWindow.update_start_button_state(window)

        start_button.setText.assert_called_with("Preparing")
        start_button.setEnabled.assert_called_with(False)

    def test_start_capture_waits_until_runtime_tts_is_idle(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        runtime_tts = SimpleNamespace(is_runtime_idle=mock.Mock(return_value=False))
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=runtime_tts,
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                cuda_core_ready=mock.Mock(return_value=True),
                cpu_degraded_mode_enabled=False,
            ),
            live_thread=None,
            developer_toggle=SimpleNamespace(isChecked=mock.Mock(return_value=False)),
            engine_startup_ready=True,
            _stop_in_progress=False,
            _capture_generation=0,
            _stop_requested_time="",
            _stop_completed_time="",
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _active_latency_dialog=None,
            _ui_latency_modal_open=False,
            ready_to_listen_perf=None,
            ready_to_listen_time="",
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            set_status=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            log_event=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value="mock_pipeline"),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        runtime_tts.is_runtime_idle.assert_called_once()
        window.log_event.assert_any_call("WARN", "Runtime is still settling. Please wait.")
        window.set_status.assert_called_with(UIState.PREPARING)

    def test_start_capture_while_stop_is_in_progress_stays_in_preparing(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True)),
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                cuda_core_ready=mock.Mock(return_value=True),
                cpu_degraded_mode_enabled=False,
                apply_asr_device_policy=mock.Mock(),
            ),
            live_thread=None,
            developer_toggle=SimpleNamespace(isChecked=mock.Mock(return_value=False)),
            engine_startup_ready=True,
            _stop_in_progress=True,
            _capture_generation=0,
            _stop_requested_time="",
            _stop_completed_time="",
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _active_latency_dialog=None,
            _ui_latency_modal_open=False,
            ready_to_listen_perf=None,
            ready_to_listen_time="",
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            set_status=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            log_event=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value="mock_pipeline"),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        window.log_event.assert_any_call("WARN", "Stop is still finishing. Please wait.")
        window.set_status.assert_called_with(UIState.PREPARING)
        window._request_pending_start_after_ready.assert_called_once_with("stop still finishing")

    def test_start_capture_blocks_real_mode_when_cuda_core_is_not_ready(self) -> None:
        from EngineData.LauncherApp.app_main import CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION, TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True)),
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                session=SimpleNamespace(session_id="SESSION-TEST"),
                cuda_core_ready=mock.Mock(return_value=False),
                cpu_degraded_mode_enabled=False,
                apply_asr_device_policy=mock.Mock(),
                cuda_status=SimpleNamespace(blocker="CUDA validation has not run."),
            ),
            live_thread=None,
            developer_toggle=SimpleNamespace(isChecked=mock.Mock(return_value=False)),
            engine_startup_ready=True,
            _stop_in_progress=False,
            _capture_generation=0,
            _stop_requested_time="",
            _stop_completed_time="",
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _active_latency_dialog=None,
            _ui_latency_modal_open=False,
            ready_to_listen_perf=None,
            ready_to_listen_time="",
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            set_status=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            log_event=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value=CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
            _reset_tts_dispatch_state=mock.Mock(),
            _invalidate_benchmark_summary_cache=mock.Mock(),
            _pipeline_result_flush_timer=SimpleNamespace(start=mock.Mock()),
            _log_pipeline_trace=mock.Mock(),
            set_level=mock.Mock(),
            set_input_state=mock.Mock(),
            handle_pipeline_calibration=mock.Mock(),
            _on_pipeline_segment_ready=mock.Mock(),
            handle_pipeline_error=mock.Mock(),
            handle_pipeline_finished=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        window.runtime.apply_asr_device_policy.assert_called_once()
        window.set_status.assert_called_with(UIState.ERROR)
        window.log_event.assert_any_call(
            "ERROR",
            "Real ASR mode blocked because CUDA_CORE_PASS is not achieved.",
            "CUDA validation has not run.",
        )

    def test_pipeline_finished_keeps_engine_warm_after_stop(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        startup_worker = SimpleNamespace(isRunning=mock.Mock(return_value=False))
        window = SimpleNamespace(
            _stop_in_progress=True,
            _drain_pending_pipeline_results=mock.Mock(),
            _pipeline_result_flush_timer=SimpleNamespace(stop=mock.Mock()),
            live_thread=SimpleNamespace(isRunning=mock.Mock(return_value=False)),
            stop_button=SimpleNamespace(setEnabled=mock.Mock()),
            _stopwatch_alignment_event_count_cache={},
            _health_snapshot_cache={},
            _session_persist_signature="sig",
            _session_benchmark_report_signature="sig",
            _session_benchmark_report_cache="cache",
            _benchmark_panel_signature="sig",
            runtime=SimpleNamespace(current_status=UIState.STOPPED, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            startup_worker=startup_worker,
            _request_status_refresh=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.QTimer.singleShot") as mocked_timer:
            TranslateITWindow.handle_pipeline_finished(window)

        mocked_timer.assert_not_called()
        window._begin_post_stop_warmup.assert_not_called()
        window.set_status.assert_called_with(UIState.STOPPED)

    def test_stop_capture_invalidates_engine_readiness_until_restart_warmup_completes(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        live_thread = SimpleNamespace(
            isRunning=mock.Mock(return_value=True),
            stale_callbacks_rejected_count=0,
            request_stop=mock.Mock(),
        )
        window = SimpleNamespace(
            live_thread=live_thread,
            _stop_in_progress=False,
            engine_startup_ready=True,
            _clear_pending_start_after_ready=mock.Mock(),
            _stop_requested_time="",
            _stale_callbacks_rejected=0,
            _reset_tts_dispatch_state=mock.Mock(),
            _invalidate_benchmark_summary_cache=mock.Mock(),
            _capture_generation=0,
            _stopwatch_alignment_event_count_cache={},
            _health_snapshot_cache={},
            _session_benchmark_report_signature="sig",
            _session_benchmark_report_cache="cache",
            _benchmark_panel_signature="sig",
            runtime=SimpleNamespace(current_status=UIState.LISTENING, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            log_event=mock.Mock(),
            set_status=mock.Mock(),
            stop_button=SimpleNamespace(setEnabled=mock.Mock()),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
        )

        TranslateITWindow.handle_stop_capture(window)

        self.assertFalse(window.engine_startup_ready)
        live_thread.request_stop.assert_called_once()
        window._clear_pending_start_after_ready.assert_called_once()
        window.set_status.assert_called_with(UIState.STOPPED)

    def test_launch_pending_start_after_ready_waits_until_runtime_tts_is_idle(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        runtime_tts = SimpleNamespace(is_runtime_idle=mock.Mock(return_value=False))
        window = SimpleNamespace(
            runtime=SimpleNamespace(tts=runtime_tts),
            _pending_start_after_ready=True,
            _stop_in_progress=False,
            startup_worker=None,
            live_thread=None,
            _runtime_tts_is_idle=mock.Mock(return_value=False),
            _launch_pending_start_after_ready=mock.Mock(),
            handle_start_capture=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.QTimer.singleShot") as mocked_timer:
            TranslateITWindow._launch_pending_start_after_ready(window)

        mocked_timer.assert_called_once()
        window.handle_start_capture.assert_not_called()
        self.assertTrue(window._pending_start_after_ready)

    def test_pipeline_finished_launches_pending_start_after_stop(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            _stop_in_progress=True,
            _pending_start_after_ready=True,
            _drain_pending_pipeline_results=mock.Mock(),
            _pipeline_result_flush_timer=SimpleNamespace(stop=mock.Mock()),
            live_thread=None,
            stop_button=SimpleNamespace(setEnabled=mock.Mock()),
            _stopwatch_alignment_event_count_cache={},
            _health_snapshot_cache={},
            _session_persist_signature="sig",
            _session_benchmark_report_signature="sig",
            _session_benchmark_report_cache="cache",
            _benchmark_panel_signature="sig",
            runtime=SimpleNamespace(current_status=UIState.STOPPED, tts=SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            _launch_pending_start_after_ready=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.QTimer.singleShot", side_effect=lambda _ms, callback: callback()) as mocked_timer:
            TranslateITWindow.handle_pipeline_finished(window)

        mocked_timer.assert_called()
        window._launch_pending_start_after_ready.assert_called_once()
        window.set_status.assert_called_with(UIState.STOPPED)

    def test_start_capture_waits_until_runtime_tts_is_idle(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        runtime_tts = SimpleNamespace(is_runtime_idle=mock.Mock(return_value=False))
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=runtime_tts,
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                cuda_core_ready=mock.Mock(return_value=True),
                cpu_degraded_mode_enabled=False,
            ),
            live_thread=None,
            developer_toggle=SimpleNamespace(isChecked=mock.Mock(return_value=False)),
            engine_startup_ready=True,
            _stop_in_progress=False,
            _capture_generation=0,
            _stop_requested_time="",
            _stop_completed_time="",
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _active_latency_dialog=None,
            _ui_latency_modal_open=False,
            ready_to_listen_perf=None,
            ready_to_listen_time="",
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            set_status=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            log_event=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value="mock_pipeline"),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        runtime_tts.is_runtime_idle.assert_called_once()
        window.log_event.assert_any_call("WARN", "Runtime is still settling. Please wait.")
        window.set_status.assert_called_with(UIState.PREPARING)

    def test_asr_transcribe_uses_best_of_one_for_realtime_profile(self) -> None:
        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        fake_model = mock.Mock()
        fake_model.transcribe.return_value = (
            iter([]),
            SimpleNamespace(text="", language=profile.language),
        )
        asr_loader.load_model = mock.Mock(
            return_value=SimpleNamespace(
                loaded=True,
                model=fake_model,
                selected_model=profile.model_name,
                dependency_status="available",
                message="loaded",
            )
        )

        result = asr_loader.transcribe_audio(np.zeros(16000, dtype=np.float32), profile)

        self.assertEqual(result.best_of, 1)
        fake_model.transcribe.assert_called_once()
        self.assertEqual(fake_model.transcribe.call_args.kwargs["best_of"], 1)
        self.assertIn("initial_prompt", fake_model.transcribe.call_args.kwargs)
        self.assertIn("Indonesian and English", fake_model.transcribe.call_args.kwargs["initial_prompt"])

    def test_startup_warmup_uses_realtime_asr_profile(self) -> None:
        from EngineData.LauncherApp.app_main import StartupWarmupWorker

        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        load_model = mock.Mock(
            return_value=SimpleNamespace(
                loaded=True,
                message="ASR model loaded successfully.",
                selected_model=profile.model_name,
            )
        )
        warmup_model = mock.Mock(return_value={"loaded": True, "message": "ASR warmup completed."})
        runtime = SimpleNamespace(
            asr_loader=SimpleNamespace(load_model=load_model, warmup_model=warmup_model, realtime_profile=mock.Mock(return_value=profile)),
            translation_engine=SimpleNamespace(
                load_local_model=mock.Mock(return_value=SimpleNamespace(available=True, message="translation loaded", engine_name="mock")),
                warmup_model=mock.Mock(return_value={"loaded": True, "message": "translation warmup"}),
            ),
            tts=SimpleNamespace(warmup_engine=mock.Mock(return_value={"loaded": True, "message": "tts warmup"})),
            audio_settings=SimpleNamespace(use_custom_voice_actor=False, voice_actor_profile_id=""),
        )
        worker = StartupWarmupWorker(runtime)
        worker.message = SimpleNamespace(emit=mock.Mock())
        worker.finished_result = SimpleNamespace(emit=mock.Mock())
        worker.error = SimpleNamespace(emit=mock.Mock())

        worker.run()

        load_model.assert_called_once()
        warmup_model.assert_called_once()
        self.assertEqual(load_model.call_args.args[0].model_name, asr_loader.primary_model)
        self.assertEqual(warmup_model.call_args.args[0].model_name, asr_loader.primary_model)

    def test_asr_warmup_reuses_cached_resident_model_after_first_success(self) -> None:
        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        fake_model = SimpleNamespace(transcribe=mock.Mock(return_value=([object()], None)))
        load_result = SimpleNamespace(
            loaded=True,
            message="ASR model loaded successfully.",
            selected_model=profile.model_name,
            model=fake_model,
        )

        def load_model(selected_profile):
            asr_loader._loaded_result = load_result
            asr_loader._loaded_request_key = (selected_profile.model_name, selected_profile.device, selected_profile.compute_type)
            return load_result

        asr_loader.load_model = mock.Mock(side_effect=load_model)  # type: ignore[method-assign]

        first = asr_loader.warmup_model(profile)
        second = asr_loader.warmup_model(profile)

        self.assertFalse(bool(first.get("reused", False)))
        self.assertTrue(bool(second.get("reused", False)))
        self.assertEqual(fake_model.transcribe.call_count, 1)

    def test_asr_warmup_recache_when_profile_signature_changes(self) -> None:
        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        changed_profile = copy.copy(profile)
        changed_profile.initial_prompt = "Different warmup prompt"
        fake_model = SimpleNamespace(transcribe=mock.Mock(return_value=([object()], None)))
        load_result = SimpleNamespace(
            loaded=True,
            message="ASR model loaded successfully.",
            selected_model=profile.model_name,
            model=fake_model,
        )
        asr_loader.load_model = mock.Mock(return_value=load_result)  # type: ignore[method-assign]

        first = asr_loader.warmup_model(profile)
        second = asr_loader.warmup_model(changed_profile)

        self.assertFalse(bool(first.get("reused", False)))
        self.assertFalse(bool(second.get("reused", False)))
        self.assertEqual(fake_model.transcribe.call_count, 2)

    def test_translation_warmup_reuses_cached_resident_model_after_first_success(self) -> None:
        if importlib.util.find_spec("torch") is None:
            self.skipTest("torch is required for translation warmup tests.")

        translation_engine = TranslationEngine()
        translation_engine._loaded_model_id = "mock-model"
        translation_engine._loaded_engine_name = "mock-engine"
        translation_engine._device = "cpu"
        translation_engine._dtype = "float32"
        translation_engine._tokenizer = mock.Mock(
            side_effect=lambda _text, return_tensors="pt": {
                "input_ids": SimpleNamespace(to=mock.Mock(return_value=SimpleNamespace())),
                "attention_mask": SimpleNamespace(to=mock.Mock(return_value=SimpleNamespace())),
            }
        )
        translation_engine._model = SimpleNamespace(generate=mock.Mock(return_value=SimpleNamespace()))
        translation_engine.load_local_model = mock.Mock(  # type: ignore[method-assign]
            return_value=SimpleNamespace(available=True, message="translation loaded", engine_name="mock-engine")
        )

        first = translation_engine.warmup_model()
        second = translation_engine.warmup_model()

        self.assertFalse(bool(first.get("reused", False)))
        self.assertTrue(bool(second.get("reused", False)))
        self.assertEqual(translation_engine._model.generate.call_count, 1)

    def test_translation_warmup_recache_when_runtime_signature_changes(self) -> None:
        if importlib.util.find_spec("torch") is None:
            self.skipTest("torch is required for translation warmup tests.")

        translation_engine = TranslationEngine()
        translation_engine._loaded_model_id = "mock-model"
        translation_engine._loaded_engine_name = "mock-engine"
        translation_engine._device = "cpu"
        translation_engine._dtype = "float32"
        translation_engine._tokenizer = mock.Mock(
            side_effect=lambda _text, return_tensors="pt": {
                "input_ids": SimpleNamespace(to=mock.Mock(return_value=SimpleNamespace())),
                "attention_mask": SimpleNamespace(to=mock.Mock(return_value=SimpleNamespace())),
            }
        )
        translation_engine._model = SimpleNamespace(generate=mock.Mock(return_value=SimpleNamespace()))
        translation_engine.load_local_model = mock.Mock(  # type: ignore[method-assign]
            return_value=SimpleNamespace(available=True, message="translation loaded", engine_name="mock-engine")
        )

        first = translation_engine.warmup_model()
        translation_engine._dtype = "float16"
        second = translation_engine.warmup_model()

        self.assertFalse(bool(first.get("reused", False)))
        self.assertFalse(bool(second.get("reused", False)))
        self.assertEqual(translation_engine._model.generate.call_count, 2)

    def test_startup_warmup_runs_custom_voice_in_parallel_when_enabled(self) -> None:
        from EngineData.LauncherApp.app_main import StartupWarmupWorker

        asr_loader = ASRModelLoader()
        profile = asr_loader.realtime_profile()
        warmup_model = mock.Mock(return_value={"loaded": True, "message": "translation warmup"})
        tts_warmup = mock.Mock(return_value={"loaded": True, "message": "tts warmup"})
        runtime = SimpleNamespace(
            asr_loader=SimpleNamespace(
                load_model=mock.Mock(
                    return_value=SimpleNamespace(
                        loaded=True,
                        message="ASR model loaded successfully.",
                        selected_model=profile.model_name,
                    )
                ),
                warmup_model=mock.Mock(return_value={"loaded": True, "message": "ASR warmup completed."}),
                realtime_profile=mock.Mock(return_value=profile),
            ),
            translation_engine=SimpleNamespace(
                load_local_model=mock.Mock(return_value=SimpleNamespace(available=True, message="translation loaded", engine_name="mock")),
                warmup_model=warmup_model,
            ),
            tts=SimpleNamespace(warmup_engine=tts_warmup),
            audio_settings=SimpleNamespace(use_custom_voice_actor=True, voice_actor_profile_id="marcel"),
        )
        worker = StartupWarmupWorker(runtime)
        worker.message = SimpleNamespace(emit=mock.Mock())
        worker.finished_result = SimpleNamespace(emit=mock.Mock())
        worker.error = SimpleNamespace(emit=mock.Mock())

        worker.run()

        tts_warmup.assert_called_once()
        emitted_messages = [call.args[0] for call in worker.message.emit.call_args_list]
        self.assertTrue(any("voice engine" in message.lower() for message in emitted_messages))
        finished_payload = worker.finished_result.emit.call_args.args[0]
        self.assertTrue(finished_payload.get("tts_warmup_loaded", False))
        self.assertIn("warmup", str(finished_payload.get("tts_warmup_message", "")).lower())

    def test_startup_warmup_result_requires_complete_warmup_before_ready(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            startup_worker=object(),
            model_preload_end_perf=None,
            engine_startup_ready=False,
            runtime=SimpleNamespace(current_status=UIState.PREPARING),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_stability_audit_snapshot=mock.Mock(),
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async"), mock.patch(
            "EngineData.LauncherApp.app_main.QTimer.singleShot",
            return_value=None,
        ) as mocked_timer:
            TranslateITWindow.handle_startup_warmup_result(
                window,
                {
                    "asr_loaded": True,
                    "asr_warmup_loaded": True,
                    "translation_loaded": True,
                    "translation_warmup_loaded": True,
                    "tts_warmup_loaded": False,
                },
            )

        self.assertIsNone(window.startup_worker)
        self.assertFalse(window.engine_startup_ready)
        window.set_status.assert_called_with(UIState.PREPARING)
        self.assertTrue(mocked_timer.called)

    def test_startup_warmup_result_launches_queued_start_when_engine_becomes_ready(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            startup_worker=object(),
            model_preload_end_perf=None,
            engine_startup_ready=False,
            runtime=SimpleNamespace(current_status=UIState.PREPARING),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_stability_audit_snapshot=mock.Mock(),
            _pending_start_after_ready=True,
            handle_start_capture=mock.Mock(),
        )
        window._clear_pending_start_after_ready = mock.Mock(
            side_effect=lambda: setattr(window, "_pending_start_after_ready", False)
        )
        window._launch_pending_start_after_ready = mock.Mock(
            side_effect=lambda: (window._clear_pending_start_after_ready(), window.handle_start_capture())
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async"), mock.patch(
            "EngineData.LauncherApp.app_main.QTimer.singleShot",
            side_effect=lambda _ms, callback: callback(),
        ) as mocked_timer:
            TranslateITWindow.handle_startup_warmup_result(
                window,
                {
                    "asr_loaded": True,
                    "asr_warmup_loaded": True,
                    "translation_loaded": True,
                    "translation_warmup_loaded": True,
                    "tts_warmup_loaded": True,
                },
            )

        window.handle_start_capture.assert_called_once()
        self.assertFalse(window._pending_start_after_ready)
        window.set_status.assert_any_call(UIState.PREPARING)
        self.assertNotIn(mock.call(UIState.READY), window.set_status.call_args_list)
        self.assertTrue(mocked_timer.called)

    def test_startup_warmup_result_keeps_pending_start_queued_when_warmup_fails_partial(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        window = SimpleNamespace(
            startup_worker=object(),
            model_preload_end_perf=None,
            engine_startup_ready=False,
            runtime=SimpleNamespace(current_status=UIState.PREPARING),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_stability_audit_snapshot=mock.Mock(),
            _pending_start_after_ready=True,
            _launch_pending_start_after_ready=mock.Mock(),
        )
        window._clear_pending_start_after_ready = mock.Mock(
            side_effect=lambda: setattr(window, "_pending_start_after_ready", False)
        )

        with mock.patch("EngineData.LauncherApp.app_main.write_json_report_async"), mock.patch(
            "EngineData.LauncherApp.app_main.QTimer.singleShot",
            side_effect=lambda _ms, callback: callback(),
        ) as mocked_timer:
            TranslateITWindow.handle_startup_warmup_result(
                window,
                {
                    "asr_loaded": True,
                    "asr_warmup_loaded": True,
                    "translation_loaded": True,
                    "translation_warmup_loaded": True,
                    "tts_warmup_loaded": False,
                },
            )

        window._launch_pending_start_after_ready.assert_not_called()
        self.assertTrue(window._pending_start_after_ready)
        window.set_status.assert_called_with(UIState.PREPARING)
        window.log_event.assert_any_call("WARN", "Engine warmup is not complete yet; start remains queued.")
        self.assertTrue(mocked_timer.called)

    def test_start_capture_retriggers_warmup_when_engine_is_not_ready_and_no_worker_is_running(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        runtime_tts = SimpleNamespace(is_runtime_idle=mock.Mock(return_value=True))
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=runtime_tts,
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                cuda_core_ready=mock.Mock(return_value=True),
                cpu_degraded_mode_enabled=False,
            ),
            live_thread=None,
            startup_worker=None,
            engine_startup_ready=False,
            _stop_in_progress=False,
            _capture_generation=0,
            _reset_tts_dispatch_state=mock.Mock(),
            _invalidate_benchmark_summary_cache=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value="mock_pipeline"),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            write_engine_readiness_report=mock.Mock(),
            _pipeline_result_flush_timer=SimpleNamespace(start=mock.Mock()),
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            start_pressed_perf=None,
            start_pressed_time="",
            ready_to_listen_time="",
            ready_to_listen_perf=None,
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_prep_start_perf_by_path={},
            _pending_playback_backend_prep_end_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _pending_playback_segment_id_by_path={},
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        window._begin_post_stop_warmup.assert_called_once()
        window.set_status.assert_called_with(UIState.PREPARING)

    def test_start_capture_keeps_preparing_status_when_runtime_is_still_settling(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow
        from EngineData.LauncherApp.ui_state import UIState

        runtime_tts = SimpleNamespace(is_runtime_idle=mock.Mock(return_value=False))
        window = SimpleNamespace(
            runtime=SimpleNamespace(
                tts=runtime_tts,
                refresh_cuda_status=mock.Mock(),
                capture=SimpleNamespace(validate_device_selection=mock.Mock(return_value=SimpleNamespace(valid=True, message="", warnings=[]))),
                current_calibration=SimpleNamespace(),
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                config=SimpleNamespace(),
                cuda_core_ready=mock.Mock(return_value=True),
                cpu_degraded_mode_enabled=False,
            ),
            live_thread=None,
            startup_worker=None,
            engine_startup_ready=False,
            _stop_in_progress=False,
            _capture_generation=0,
            _reset_tts_dispatch_state=mock.Mock(),
            _invalidate_benchmark_summary_cache=mock.Mock(),
            _begin_post_stop_warmup=mock.Mock(),
            set_status=mock.Mock(),
            log_event=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            selected_capture_mode=mock.Mock(return_value="mock_pipeline"),
            selected_device_id=mock.Mock(return_value=None),
            selected_output_device_id=mock.Mock(return_value=None),
            stop_button=mock.Mock(setEnabled=mock.Mock()),
            start_button=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_cache_session_guard_snapshot=mock.Mock(),
            write_start_stop_lifecycle_snapshot=mock.Mock(),
            write_engine_readiness_report=mock.Mock(),
            _pipeline_result_flush_timer=SimpleNamespace(start=mock.Mock()),
            pending_tts_jobs=[],
            pending_tts_segment_id=None,
            pending_tts_autoplay=False,
            _stale_callbacks_rejected=0,
            _last_worker_error="",
            _last_playback_error="",
            _last_lifecycle_error="",
            start_pressed_perf=None,
            start_pressed_time="",
            ready_to_listen_time="",
            ready_to_listen_perf=None,
            stream_open_start_perf=None,
            stream_open_end_perf=None,
            first_audio_callback_perf=None,
            warmup_perf=None,
            false_ready_prevented=False,
            _pending_playback_request_perf_by_path={},
            _pending_playback_queue_perf_by_path={},
            _pending_playback_worker_dequeue_perf_by_path={},
            _pending_playback_backend_prep_start_perf_by_path={},
            _pending_playback_backend_prep_end_perf_by_path={},
            _pending_playback_backend_start_perf_by_path={},
            _pending_playback_audio_start_perf_by_path={},
            _pending_playback_backend_return_perf_by_path={},
            _pending_playback_submit_perf_by_path={},
            _pending_playback_segment_id_by_path={},
            _clear_pending_start_after_ready=mock.Mock(),
            _request_pending_start_after_ready=mock.Mock(),
        )

        TranslateITWindow.handle_start_capture(window)

        window._request_pending_start_after_ready.assert_called_once_with("runtime still settling")
        window.set_status.assert_called_with(UIState.PREPARING)


if __name__ == "__main__":
    unittest.main()
