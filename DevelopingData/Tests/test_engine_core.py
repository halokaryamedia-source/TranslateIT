from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import numpy as np

from EngineData.LauncherApp.app_config import default_voice_actor_profiles_root, load_default_config
from EngineData.LauncherApp.audio_settings import AudioSettings, load_audio_settings, save_audio_settings
from EngineData.LauncherApp.app_main import _capture_start_transition_in_progress, _startup_warmup_is_ready
from EngineData.LauncherApp.language_routing import is_focus_language, normalize_language_code, should_translate_segment
from EngineData.LauncherApp.latency_profile import resolve_safe_vad_preset
from EngineData.LauncherApp.live_pipeline import _audio_evidence, _speech_frame_confirmed
from EngineData.LauncherApp.transcript_view import TranscriptCardViewModel
from EngineData.LauncherApp.ui_state import UIState
from EngineData.TranscriptEngine.asr_quality_filter import ASRQualityFilter, ASRQualityReport
from EngineData.TranscriptEngine.audio_noise_filter import AudioNoiseFilter
from EngineData.TranscriptEngine.audio_capture import AudioCapture
from EngineData.TranscriptEngine.audio_preprocessing import AudioPreprocessor
from EngineData.TranscriptEngine.microphone_diagnostic import MicrophoneDiagnosticResult, classify_microphone_diagnostic
from EngineData.TranscriptEngine.transcript_segment import MetricMetrics, ReplayPaths, TranscriptSegment
from EngineData.TranscriptEngine.vad_pipeline import VADPipeline
from EngineData.TranslateEngine.translation_engine import TranslationEngine


class EngineCoreTests(unittest.TestCase):
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

    def test_transcript_card_view_model_uses_real_latency_proxy_labels(self) -> None:
        segment = TranscriptSegment(
            segment_id="SEG1",
            session_id="S1",
            input_language="id",
            output_language="en",
            start_time_ms=0,
            end_time_ms=1000,
            input_text="Halo",
            translated_text="Hello",
            replay=ReplayPaths(source_replay_available=True, target_voice_available=True),
        )
        segment.latency.tts_voice_start_proxy_ms = 410
        segment.latency.speech_end_to_voice_proxy_ms = 1490
        view_model = TranscriptCardViewModel.from_segment(segment)
        self.assertEqual(view_model.total_latency_label, "1490 ms")
        self.assertEqual(
            view_model.latency_detail_label,
            "First voice output: 410 ms | Speech end to first voice: 1490 ms",
        )
        self.assertFalse(view_model.translation_placeholder)
        self.assertTrue(view_model.can_replay_source)
        self.assertTrue(view_model.can_replay_translation)

    def test_audio_settings_round_trip_custom_voice_fields(self) -> None:
        settings = AudioSettings(
            input_device_id=2,
            output_device_id=4,
            input_sensitivity="Headset",
            show_advanced_devices=True,
            allow_low_but_usable_input=False,
            auto_play_out_voice=False,
            use_custom_voice_actor=True,
            voice_actor_profile_id="marcel",
            voice_actor_profiles_root=default_voice_actor_profiles_root(),
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "audio_settings.json"
            save_audio_settings(settings, path)
            restored = load_audio_settings(path)
        self.assertEqual(restored, settings)

    def test_audio_settings_legacy_sensitivity_normalizes_to_headset(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "audio_settings.json"
            path.write_text(
                json.dumps(
                    {
                        "input_sensitivity": "Normal",
                        "show_advanced_devices": False,
                        "allow_low_but_usable_input": True,
                        "auto_play_out_voice": True,
                    }
                ),
                encoding="utf-8",
            )
            restored = load_audio_settings(path)
        self.assertEqual(restored.input_sensitivity, "Headset")
        self.assertEqual(restored.voice_actor_profiles_root, default_voice_actor_profiles_root())
        self.assertTrue(restored.allow_low_but_usable_input)
        self.assertTrue(restored.auto_play_out_voice)

    def test_engine_config_defaults_use_expected_voice_root(self) -> None:
        config = load_default_config()
        self.assertEqual(config.voice_actor_profiles_root, default_voice_actor_profiles_root())
        self.assertEqual(config.cache_paths()["session_cache_dir"], config.cache_dir / "session_cache")
        self.assertEqual(config.cache_paths()["audio_segments_dir"], config.cache_dir / "audio_segments")

    def test_language_routing_focuses_on_id_and_en_only(self) -> None:
        self.assertEqual(normalize_language_code("ID-ID"), "id")
        self.assertTrue(is_focus_language("id"))
        self.assertTrue(should_translate_segment(detected_language="id", source_language="id", target_language="en"))
        self.assertFalse(should_translate_segment(detected_language="en", source_language="en", target_language="en"))

    def test_vad_profile_normalization_stays_safe(self) -> None:
        self.assertEqual(resolve_safe_vad_preset("Normal Room"), "Headset")
        self.assertEqual(resolve_safe_vad_preset("Headset"), "Headset")
        self.assertEqual(resolve_safe_vad_preset("unsafe"), "Headset")

    def test_audio_capture_default_frame_duration_is_16ms(self) -> None:
        self.assertEqual(AudioCapture.frame_duration_ms, 16)

    def test_audio_capture_reports_normal_level_for_quiet_but_present_voice(self) -> None:
        capture = AudioCapture()
        state = capture.build_level_state(rms=0.0060, peak=0.018, noise_floor_rms=0.0002)
        self.assertEqual(state, "Good")

    def test_audio_preprocessor_prepare_for_asr_preserves_raw_gain(self) -> None:
        preprocessor = AudioPreprocessor()
        samples = np.array([0.0, 0.1, -0.2, 0.05], dtype=np.float32)
        result = preprocessor.prepare_for_asr(samples, source_rate=16_000, collect_stats=False)
        self.assertEqual(result.samples.tolist(), samples.tolist())

    def test_translation_engine_literal_short_phrase_map_and_duplicate_collapse(self) -> None:
        self.assertEqual(
            TranslationEngine._literal_short_translation(
                source_text="halo coba bicara",
                source_language="id",
                target_language="en",
            ),
            "Hello, try speaking.",
        )
        self.assertEqual(
            TranslationEngine._collapse_adjacent_sentence_duplicates("Halo. Halo. Lagi."),
            "Halo. Lagi.",
        )

    def test_asr_quality_filter_rejects_common_writer_hallucination_template(self) -> None:
        report = ASRQualityReport(
            transcript_text="I'm a writer of the book.",
            audio_rms=0.015,
            audio_peak=0.12,
            speech_to_noise_gap=0.010,
            voiced_frame_ratio=0.35,
            audio_duration_ms=1200,
            sustained_speech_ms=720,
            language_ok=True,
            timestamp_ok=True,
        )
        decision = ASRQualityFilter().evaluate(report)
        self.assertFalse(decision.accepted)
        self.assertTrue(decision.should_hide)
        self.assertIn("Hallucination", decision.reason)

    def test_asr_quality_filter_rejects_impact_like_knock_hallucination(self) -> None:
        report = ASRQualityReport(
            transcript_text="first language is a language",
            audio_rms=0.0024,
            audio_peak=0.072,
            peak_to_rms_ratio=30.0,
            speech_to_noise_gap=0.0019,
            voiced_frame_ratio=0.04,
            audio_duration_ms=900,
            sustained_speech_ms=120,
            no_speech_probability=0.03,
            average_log_probability=-0.24,
            compression_ratio=1.03,
            language_probability=0.86,
            language_ok=True,
            timestamp_ok=True,
            frame_energy_concentration=0.72,
            frame_active_ratio=0.20,
            impulse_edge_ratio=0.06,
            zero_crossing_rate=0.09,
        )
        decision = ASRQualityFilter().evaluate(report)
        self.assertFalse(decision.accepted)
        self.assertTrue(decision.should_hide)
        self.assertIn("Impact", decision.reason)

    def test_asr_quality_filter_accepts_soft_but_plausible_speech(self) -> None:
        report = ASRQualityReport(
            transcript_text="halo coba bicara",
            audio_rms=0.013,
            audio_peak=0.028,
            speech_to_noise_gap=0.0045,
            voiced_frame_ratio=0.10,
            audio_duration_ms=1400,
            sustained_speech_ms=240,
            no_speech_probability=0.18,
            average_log_probability=-0.22,
            compression_ratio=1.05,
            language_probability=0.88,
            language_ok=True,
            timestamp_ok=True,
        )
        decision = ASRQualityFilter().evaluate(report)
        self.assertTrue(decision.accepted, decision.reason)

    def test_audio_noise_filter_classifies_impact_like_knock_noise(self) -> None:
        report = SimpleNamespace(
            audio_duration_ms=820,
            voiced_frame_ratio=0.05,
            speech_to_noise_gap=0.0022,
            audio_peak=0.072,
            audio_rms=0.0024,
            peak_to_rms_ratio=30.0,
            frame_energy_concentration=0.73,
            frame_active_ratio=0.19,
            impulse_edge_ratio=0.06,
            zero_crossing_rate=0.09,
            no_speech_probability=0.01,
        )
        assessment = AudioNoiseFilter.classify(report)
        self.assertTrue(assessment.matched)
        self.assertEqual(assessment.category, "impact")

    def test_calibration_marks_quiet_present_voice_as_usable_or_low_but_usable(self) -> None:
        from EngineData.TranscriptEngine.audio_calibration import AudioCalibration

        calibration = AudioCalibration()
        state = calibration.classify_input_state(
            noise_floor_rms=0.0002,
            speech_rms=0.0060,
            peak_level=0.018,
            sensitivity="Normal",
        )
        self.assertEqual(state, "Good")

    def test_vad_pipeline_rejects_noise_like_segment_before_asr(self) -> None:
        decision = VADPipeline("Headset").should_accept_segment(
            duration_ms=980,
            silence_ms=120,
            speech_duration_ms=640,
            speech_confirmed=True,
            rms=0.0038,
            peak=0.015,
            noise_floor_rms=0.00018,
            clipping_risk=0.0,
            noise_risk=0.0,
            speech_to_noise_gap=0.0007,
            voiced_frame_ratio=0.05,
            zero_crossing_rate=0.10,
            peak_to_rms_ratio=5.8,
            frame_energy_concentration=0.79,
            frame_active_ratio=0.20,
            impulse_edge_ratio=0.03,
        )
        self.assertFalse(decision.accepted)
        self.assertTrue(decision.should_hide)
        self.assertTrue(
            "focus" in decision.reason.lower() or "noise" in decision.reason.lower(),
            decision.reason,
        )

    def test_audio_evidence_rejects_knock_like_impact_before_asr(self) -> None:
        samples = np.zeros(1920, dtype=np.float32)
        samples[896:903] = np.array([0.0, 0.012, 0.035, 0.072, 0.035, 0.012, 0.0], dtype=np.float32)
        evidence = _audio_evidence(samples, noise_floor_rms=0.0002, sensitivity="Normal")
        self.assertEqual(evidence["reason"], "rejected_noise_like_impact")

    def test_speech_frame_confirmed_rejects_soft_noise(self) -> None:
        self.assertFalse(
            _speech_frame_confirmed(
                rms=0.00040,
                peak=0.00135,
                noise_floor_rms=0.00018,
                sensitivity="High",
            )
        )

    def test_handle_sensitivity_changed_preserves_existing_value_when_none_is_passed(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                audio_settings=SimpleNamespace(input_sensitivity="Normal"),
                save_audio_settings=mock.Mock(),
            ),
            sensitivity_value_label=SimpleNamespace(setText=mock.Mock()),
            log_event=mock.Mock(),
        )

        TranslateITWindow.handle_sensitivity_changed(window, None)

        self.assertEqual(window.runtime.audio_settings.input_sensitivity, "Normal")
        window.sensitivity_value_label.setText.assert_called_once_with("Normal")
        window.runtime.save_audio_settings.assert_called_once()
        window.log_event.assert_called_once()

    def test_capture_start_transition_stays_hidden_until_stream_warms(self) -> None:
        self.assertTrue(
            _capture_start_transition_in_progress(
                engine_startup_ready=True,
                current_status=UIState.PREPARING,
                live_thread_running=False,
                startup_worker_running=False,
                pending_start_after_ready=False,
            )
        )
        self.assertFalse(
            _capture_start_transition_in_progress(
                engine_startup_ready=True,
                current_status=UIState.READY_TO_LISTEN,
                live_thread_running=True,
                startup_worker_running=False,
                pending_start_after_ready=False,
            )
        )

    def test_startup_warmup_ready_ignores_tts_warmup_status(self) -> None:
        self.assertTrue(
            _startup_warmup_is_ready(
                asr_loaded=True,
                asr_warmup_loaded=True,
                translation_loaded=True,
                translation_warmup_loaded=True,
                tts_warmup_loaded=False,
            )
        )
        self.assertFalse(
            _startup_warmup_is_ready(
                asr_loaded=True,
                asr_warmup_loaded=False,
                translation_loaded=True,
                translation_warmup_loaded=True,
                tts_warmup_loaded=True,
            )
        )

    def test_startup_warmup_result_marks_ready_when_complete(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        runtime = SimpleNamespace(
            current_status=UIState.PREPARING,
            asr_loader=SimpleNamespace(device="cuda"),
            translation_engine=SimpleNamespace(primary_engine_name="nllb"),
            cuda_core_ready=lambda: True,
        )
        window = SimpleNamespace(
            runtime=runtime,
            live_thread=None,
            _pending_start_after_ready=False,
            _startup_warmup_cancel_requested=False,
            engine_startup_ready=False,
            model_preload_end_perf=None,
            log_event=mock.Mock(),
            set_status=mock.Mock(),
            _request_status_refresh=mock.Mock(),
            write_engine_health_snapshot=mock.Mock(),
            write_worker_health_snapshot=mock.Mock(),
            write_engine_stability_audit_snapshot=mock.Mock(),
        )

        TranslateITWindow.handle_startup_warmup_result(
            window,
            {
                "asr_loaded": True,
                "asr_warmup_loaded": True,
                "translation_loaded": True,
                "translation_warmup_loaded": True,
                "tts_warmup_loaded": False,
                "asr_model": "faster-whisper-large-v3-turbo",
                "translation_engine": "nllb-200",
            },
        )

        self.assertTrue(window.engine_startup_ready)
        window.set_status.assert_any_call(UIState.READY)
        window._request_status_refresh.assert_called_once()

    def test_update_start_button_state_unblocks_ready_state_after_warmup(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        class FakeStyle:
            def unpolish(self, *_args: object) -> None:
                return None

            def polish(self, *_args: object) -> None:
                return None

        class FakeButton:
            def __init__(self) -> None:
                self._text = "Preparing"
                self._props: dict[str, object] = {}
                self._enabled = False
                self._style = FakeStyle()

            def text(self) -> str:
                return self._text

            def setText(self, value: str) -> None:
                self._text = value

            def property(self, key: str) -> object:
                return self._props.get(key)

            def setProperty(self, key: str, value: object) -> None:
                self._props[key] = value

            def setEnabled(self, value: bool) -> None:
                self._enabled = value

            def isEnabled(self) -> bool:
                return self._enabled

            def style(self) -> FakeStyle:
                return self._style

        window = SimpleNamespace(
            runtime=SimpleNamespace(
                current_status=UIState.PREPARING,
                tts=SimpleNamespace(is_runtime_idle=lambda: True),
            ),
            live_thread=None,
            startup_worker=None,
            _pending_start_after_ready=False,
            _stop_in_progress=False,
            engine_startup_ready=True,
            start_button=FakeButton(),
            _request_status_refresh=lambda: None,
            refresh_status_panel=lambda: None,
            write_engine_readiness_report=lambda *_args, **_kwargs: None,
        )

        TranslateITWindow.update_start_button_state(window)

        self.assertEqual(window.start_button.text(), "Start")
        self.assertEqual(window.start_button.property("runState"), "idle")
        self.assertTrue(window.start_button.isEnabled())

    def test_microphone_diagnostic_classifies_wrong_device(self) -> None:
        result = MicrophoneDiagnosticResult(
            status="FAIL",
            message="No input detected.",
            device_id=1,
            device_name="Stereo Mix (Realtek)",
            sample_rate=44100,
            duration_ms=5000,
            rms=0.00018,
            peak=0.00070,
            clipping=False,
            noise_floor_rms=0.00018,
            speech_rms=0.00018,
            speech_peak=0.00070,
            speech_to_noise_gap=0.0,
            speech_to_noise_ratio=1.0,
            voiced_frame_ratio=0.0,
            final_vad_threshold=0.002,
            usable_input=False,
            input_state="No Signal",
            selected_sensitivity="High",
        )
        diagnosis_code, diagnosis_label, recommendation = classify_microphone_diagnostic(result)
        self.assertEqual(diagnosis_code, "wrong_device")
        self.assertIn("Wrong device", diagnosis_label)
        self.assertIn("Select the physical microphone", recommendation)

    def test_microphone_diagnostic_classifies_too_quiet(self) -> None:
        result = MicrophoneDiagnosticResult(
            status="WARN",
            message="Input too low.",
            device_id=1,
            device_name="USB Microphone",
            sample_rate=44100,
            duration_ms=5000,
            rms=0.0012,
            peak=0.0030,
            clipping=False,
            noise_floor_rms=0.0002,
            speech_rms=0.0012,
            speech_peak=0.0030,
            speech_to_noise_gap=0.0010,
            speech_to_noise_ratio=1.2,
            voiced_frame_ratio=0.08,
            final_vad_threshold=0.0022,
            usable_input=False,
            input_state="Too Quiet",
            selected_sensitivity="Normal",
        )
        diagnosis_code, diagnosis_label, recommendation = classify_microphone_diagnostic(result)
        self.assertEqual(diagnosis_code, "too_quiet")
        self.assertIn("quiet", diagnosis_label.lower())
        self.assertIn("Increase microphone gain", recommendation)

    def test_microphone_diagnostic_classifies_background_noise_only(self) -> None:
        result = MicrophoneDiagnosticResult(
            status="WARN",
            message="Background noise high.",
            device_id=1,
            device_name="USB Microphone",
            sample_rate=44100,
            duration_ms=5000,
            rms=0.0035,
            peak=0.010,
            clipping=False,
            noise_floor_rms=0.0002,
            speech_rms=0.0035,
            speech_peak=0.010,
            speech_to_noise_gap=0.0033,
            speech_to_noise_ratio=1.7,
            voiced_frame_ratio=0.04,
            final_vad_threshold=0.0022,
            usable_input=False,
            input_state="Background Noise High",
            selected_sensitivity="Normal",
        )
        diagnosis_code, diagnosis_label, recommendation = classify_microphone_diagnostic(result)
        self.assertEqual(diagnosis_code, "noise_only")
        self.assertIn("noise", diagnosis_label.lower())
        self.assertIn("reduce room noise", recommendation.lower())

    def test_reset_tts_dispatch_state_handles_missing_replay(self) -> None:
        from EngineData.LauncherApp.app_main import TranslateITWindow

        runtime = SimpleNamespace(
            tts=SimpleNamespace(
                reset_runtime_state=mock.Mock(side_effect=RuntimeError("boom")),
                cancel_active_speech=mock.Mock(),
            )
        )
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
            _last_playback_error="",
        )

        TranslateITWindow._reset_tts_dispatch_state(window)

        runtime.tts.reset_runtime_state.assert_called_once()
        runtime.tts.cancel_active_speech.assert_called_once()
        self.assertIn("boom", window._last_playback_error)
        self.assertEqual(window.pending_tts_jobs, {})
        self.assertIsNone(window.pending_tts_segment_id)
        self.assertFalse(window.pending_tts_autoplay)
