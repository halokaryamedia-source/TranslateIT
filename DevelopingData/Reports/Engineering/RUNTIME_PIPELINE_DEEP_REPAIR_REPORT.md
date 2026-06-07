# Runtime Pipeline Deep Repair Report

## Observed Issue
- The app opened and entered listening state, but one spoken utterance could fail to produce a stable transcript card and no audible translated voice could be heard.
- The user-visible symptoms were:
  - transcript card missing or disappearing,
  - translated voice not audible,
  - accepted count could increase while visible content stayed blank,
  - latency badge could remain at `0 ms`.

## Runtime Trace Points Added
- `app_listening_started`
- `audio_input_detected`
- `vad_speech_start`
- `vad_speech_end`
- `vad_endpoint`
- `asr_started`
- `asr_completed`
- `asr_text`
- `translation_started`
- `translation_completed`
- `translated_text`
- `segment_created`
- `segment_id`
- `segment_source_text`
- `segment_translated_text`
- `segment_status`
- `segment_accepted_or_rejected`
- `ui_update_requested`
- `ui_card_create_or_update_started`
- `ui_card_create_or_update_completed`
- `ui_card_render_exception`
- `tts_backend_requested`
- `tts_backend_selected`
- `tts_request_started`
- `tts_direct_async_dispatch_started`
- `tts_direct_async_process_started`
- `tts_direct_async_process_exit_code`
- `tts_fallback_started`
- `legacy_wav_generated`
- `playback_started_or_proxy`
- `tts_completed_or_failed`

## Exact Root Cause Found
### Transcript card disappearing
- `TranscriptCardWidget` was referencing `TranscriptCardViewModel.total_latency_label`.
- `TranscriptCardViewModel` initially did not define `total_latency_label`, so UI card creation/update could raise an exception during render.
- Later validation showed accepted segments could reach ASR and translation, so the remaining failure was not VAD-only: the accepted path still had brittle model/view refresh points and telemetry work that could interrupt card creation or update before the user saw the result.
- The accepted path is now hardened by building the card view model through a safe fallback helper and by starting TTS before post-acceptance telemetry/report writes.

### No voice output
- The direct SAPI path was using a child PowerShell worker with `SpeakAsync`, but the worker logic was not reliable for audible completion in this app flow.
- The child process now uses `Speak()` inside the worker process, which keeps the child alive until speech completes while the Python UI remains non-blocking.
- The backend also now writes direct async trace points so the command start, PID, proxy start, and completion/timeout can be audited.

## Transcript / Card Fix
- Added safe fallback text in `TranscriptCardViewModel.from_segment()`:
  - `source_text` falls back to `[no transcript text]`
  - `translated_text` falls back to `[Translation pending local model]`
- Added `total_latency_label` to the view-model so the card renderer no longer crashes on update.
- Added safe update behavior so an exception during card creation is logged and does not clear the transcript list.
- Existing cards are updated in place when possible instead of being recreated unnecessarily.

## Segment Compatibility Fix
- Added backwards-compatible aliases on `TranscriptSegment`:
  - `text`
  - `transcript`
  - `translation`
  - `target_text`
  - `source_text`
  - `id`
  - `status`
  - `accepted`
- Added `trace_id` to the canonical segment model and preserved it in `to_dict()` / `from_dict()`.

## TTS / No-Voice Fix
- Default direct async backend remains `sapi_direct_async` when launcher sets it.
- Direct async now logs:
  - `powershell_command_started`
  - `powershell_process_pid`
  - `tts_direct_async_dispatch_started`
  - `playback_started_or_proxy`
  - `direct_async_speak_completed_or_timeout`
  - `powershell_exit_code`
- Legacy fallback remains available and is logged with:
  - `tts_fallback_started`
  - `legacy_wav_generated`
  - `tts_completed_or_failed`

## Files Changed
- [`EngineData/LauncherApp/app_logger.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/LauncherApp/app_logger.py)
- [`EngineData/LauncherApp/app_main.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/LauncherApp/app_main.py)
- [`EngineData/LauncherApp/live_pipeline.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/LauncherApp/live_pipeline.py)
- [`EngineData/LauncherApp/session_reporting.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/LauncherApp/session_reporting.py)
- [`EngineData/LauncherApp/transcript_view.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/LauncherApp/transcript_view.py)
- [`EngineData/TranscriptEngine/transcript_segment.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/TranscriptEngine/transcript_segment.py)
- [`EngineData/TranscriptEngine/segment_builder.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/TranscriptEngine/segment_builder.py)
- [`EngineData/TranslateEngine/tts_placeholder.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/EngineData/TranslateEngine/tts_placeholder.py)
- [`DevelopingData/Diagnostics/tts_direct_async_probe.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/DevelopingData/Diagnostics/tts_direct_async_probe.py)
- [`DevelopingData/Diagnostics/segment_ui_contract_probe.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/DevelopingData/Diagnostics/segment_ui_contract_probe.py)
- [`DevelopingData/Tests/test_engine_hardening.py`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/DevelopingData/Tests/test_engine_hardening.py)

## Diagnostics Added
- `DevelopingData/Diagnostics/tts_direct_async_probe.py`
- `DevelopingData/Diagnostics/segment_ui_contract_probe.py`

## Validation Commands Run
- `DevelopingData/ToolKitData/rt/Scripts/python.exe -m EngineData.LauncherApp.launcher_bootstrap --self-test`
- `DevelopingData/ToolKitData/rt/Scripts/python.exe -m compileall -q EngineData`
- `DevelopingData/ToolKitData/rt/Scripts/python.exe -m unittest discover -s DevelopingData/Tests`
- `DevelopingData/ToolKitData/rt/Scripts/python.exe DevelopingData/Diagnostics/segment_ui_contract_probe.py`
- `DevelopingData/ToolKitData/rt/Scripts/python.exe DevelopingData/Diagnostics/tts_direct_async_probe.py`

## Validation Results
- Launcher self-test: passed
- `compileall`: passed
- Unit tests: passed, 12 tests
- Segment UI probe: passed
- Direct async TTS probe: passed with `backend_selected=sapi_direct_async`

## Remaining Manual Test Step
- Manual GUI validation is still required in a real desktop session:
  - open `Experimental/TranslateIT.vbs`
  - speak one short Indonesian utterance such as `Halo coba bicara`
  - confirm transcript card remains visible
  - confirm translated text is shown
  - confirm direct async voice is audible
  - confirm the accepted segment still appears even if benchmark/report generation lags or fails

## Runtime Log Path
- [`UserData/LogData/runtime_pipeline_latest.log`](/D:/Work/AI%20Stuff/TranslateIT/Developing/Experimental/UserData/LogData/runtime_pipeline_latest.log)

## Last 50 Relevant Log Lines
```text
[2026-06-01T17:28:00+00:00] TRACE: segment_status | {'trace_id': 'trace-SEG-000001', 'event': 'segment_status', 'stage': 'segment_builder', 'segment_id': 'SEG-000001', 'status': 'Completed', 'details': {'quality_status': 'Completed', 'notes': 'Real local translation model completed the translation on cuda.'}}
[2026-06-01T17:28:00+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000001', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000001', 'status': 'accepted', 'details': {'reason': 'accepted'}}
[2026-06-01T17:28:01+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000001', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000001', 'status': 'accepted', 'details': {'visible': True, 'accepted': True, 'rejection_reason': 'unavailable'}}
[2026-06-01T17:28:09+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000002', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000002', 'status': 'pending', 'details': {'segment_id': 'SEG-000002', 'source_text': 'unavailable'}}
[2026-06-01T17:28:09+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000002', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000002', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:28:09+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000002', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000002', 'status': 'pending', 'details': {'segment_id': 'SEG-000002'}}
[2026-06-01T17:28:09+00:00] TRACE: audio_input_detected | {'trace_id': 'trace-SEG-000002', 'event': 'audio_input_detected', 'stage': 'audio_capture', 'segment_id': 'SEG-000002', 'status': 'accepted', 'details': {'speech_duration_ms': 1700}}
[2026-06-01T17:28:09+00:00] TRACE: asr_started | {'trace_id': 'trace-SEG-000002', 'event': 'asr_started', 'stage': 'asr_loader', 'segment_id': 'SEG-000002', 'status': 'started', 'details': {'asr_device': 'cuda', 'compute_type': 'float16'}}
[2026-06-01T17:28:09+00:00] TRACE: asr_completed | {'trace_id': 'trace-SEG-000002', 'event': 'asr_completed', 'stage': 'asr_loader', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'asr_latency_ms': 379}}
[2026-06-01T17:28:09+00:00] TRACE: asr_text | {'trace_id': 'trace-SEG-000002', 'event': 'asr_text', 'stage': 'asr_loader', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'asr_text': 'Masih tidak keluar hasilnya.'}}
[2026-06-01T17:28:09+00:00] TRACE: translation_started | {'trace_id': 'trace-SEG-000002', 'event': 'translation_started', 'stage': 'translation_engine', 'segment_id': 'SEG-000002', 'status': 'started', 'details': {'source_text': 'Masih tidak keluar hasilnya.'}}
[2026-06-01T17:28:09+00:00] TRACE: translation_completed | {'trace_id': 'trace-SEG-000002', 'event': 'translation_completed', 'stage': 'translation_engine', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'translation_ms': 95}}
[2026-06-01T17:28:09+00:00] TRACE: translated_text | {'trace_id': 'trace-SEG-000002', 'event': 'translated_text', 'stage': 'translation_engine', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'translated_text': 'Still not out.'}}
[2026-06-01T17:28:09+00:00] TRACE: segment_translated_text | {'trace_id': 'trace-SEG-000002', 'event': 'segment_translated_text', 'stage': 'translation_engine', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'translated_text': 'Still not out.'}}
[2026-06-01T17:28:09+00:00] TRACE: vad_speech_start | {'trace_id': 'trace-SEG-000002', 'event': 'vad_speech_start', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000002', 'status': 'detected', 'details': {'speech_start_time': '2026-06-02T00:28:07.867+07:00'}}
[2026-06-01T17:28:09+00:00] TRACE: vad_speech_end | {'trace_id': 'trace-SEG-000002', 'event': 'vad_speech_end', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000002', 'status': 'detected', 'details': {'speech_end_time': '2026-06-02T00:28:09.336+07:00'}}
[2026-06-01T17:28:09+00:00] TRACE: vad_endpoint | {'trace_id': 'trace-SEG-000002', 'event': 'vad_endpoint', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000002', 'status': 'completed', 'details': {'endpoint_wait_ms': 180, 'silence_accumulation_ms': 0}}
[2026-06-01T17:28:09+00:00] TRACE: segment_status | {'trace_id': 'trace-SEG-000002', 'event': 'segment_status', 'stage': 'segment_builder', 'segment_id': 'SEG-000002', 'status': 'Completed', 'details': {'quality_status': 'Completed', 'notes': 'Real local translation model completed the translation on cuda.'}}
[2026-06-01T17:28:09+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000002', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000002', 'status': 'accepted', 'details': {'reason': 'accepted'}}
[2026-06-01T17:28:10+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000002', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000002', 'status': 'accepted', 'details': {'visible': True, 'accepted': True, 'rejection_reason': 'unavailable'}}
[2026-06-01T17:28:15+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000003', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000003', 'status': 'pending', 'details': {'segment_id': 'SEG-000003', 'source_text': 'unavailable'}}
[2026-06-01T17:28:15+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000003', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000003', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:28:15+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000003', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000003', 'status': 'pending', 'details': {'segment_id': 'SEG-000003'}}
[2026-06-01T17:28:15+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000003', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000003', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:28:16+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000003', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000003', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:28:18+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000004', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000004', 'status': 'pending', 'details': {'segment_id': 'SEG-000004', 'source_text': 'unavailable'}}
[2026-06-01T17:28:18+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000004', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000004', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:28:18+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000004', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000004', 'status': 'pending', 'details': {'segment_id': 'SEG-000004'}}
[2026-06-01T17:28:18+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000004', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000004', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:28:19+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000004', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000004', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:28:36+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000005', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000005', 'status': 'pending', 'details': {'segment_id': 'SEG-000005', 'source_text': 'unavailable'}}
[2026-06-01T17:28:36+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000005', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000005', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:28:36+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000005', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000005', 'status': 'pending', 'details': {'segment_id': 'SEG-000005'}}
[2026-06-01T17:28:36+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000005', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000005', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:28:38+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000005', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000005', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:29+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000006', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000006', 'status': 'pending', 'details': {'segment_id': 'SEG-000006', 'source_text': 'unavailable'}}
[2026-06-01T17:29:29+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000006', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000006', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:29:29+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000006', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000006', 'status': 'pending', 'details': {'segment_id': 'SEG-000006'}}
[2026-06-01T17:29:29+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000006', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000006', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:30+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000006', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000006', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:39+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000007', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000007', 'status': 'pending', 'details': {'segment_id': 'SEG-000007', 'source_text': 'unavailable'}}
[2026-06-01T17:29:39+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000007', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000007', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:29:39+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000007', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000007', 'status': 'pending', 'details': {'segment_id': 'SEG-000007'}}
[2026-06-01T17:29:39+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000007', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000007', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:40+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000007', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000007', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:46+00:00] TRACE: segment_created | {'trace_id': 'trace-SEG-000008', 'event': 'segment_created', 'stage': 'segment_builder', 'segment_id': 'SEG-000008', 'status': 'pending', 'details': {'segment_id': 'SEG-000008', 'source_text': 'unavailable'}}
[2026-06-01T17:29:46+00:00] TRACE: segment_source_text | {'trace_id': 'trace-SEG-000008', 'event': 'segment_source_text', 'stage': 'segment_builder', 'segment_id': 'SEG-000008', 'status': 'pending', 'details': {'source_text': 'unavailable'}}
[2026-06-01T17:29:46+00:00] TRACE: segment_id | {'trace_id': 'trace-SEG-000008', 'event': 'segment_id', 'stage': 'segment_builder', 'segment_id': 'SEG-000008', 'status': 'pending', 'details': {'segment_id': 'SEG-000008'}}
[2026-06-01T17:29:46+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000008', 'event': 'segment_accepted_or_rejected', 'stage': 'vad_pipeline', 'segment_id': 'SEG-000008', 'status': 'rejected', 'details': {'reason': 'rejected_unconfirmed_speech'}}
[2026-06-01T17:29:47+00:00] TRACE: segment_accepted_or_rejected | {'trace_id': 'trace-SEG-000008', 'event': 'segment_accepted_or_rejected', 'stage': 'ui', 'segment_id': 'SEG-000008', 'status': 'rejected', 'details': {'visible': False, 'accepted': False, 'rejection_reason': 'rejected_unconfirmed_speech'}}
```

## Final Checkpoint Reached by the Real Live Speech Path
- The final checkpoint reached in the latest live speech tail is `segment_accepted_or_rejected` at stage `ui`.
- The final live segment in the tail is `trace-SEG-000008`.
- Status at the final checkpoint: `rejected`.
- Rejection reason: `rejected_unconfirmed_speech`.
- That means the last observed live speech path did **not** progress to ASR/translation/TTS; it stopped at VAD/UI rejection for unconfirmed speech.
- This tail is historical context from the earlier failure mode. Later runtime validation showed accepted segments can progress through ASR and translation, so the current fix focuses on preserving the accepted UI/TTS path even when telemetry or benchmark refresh work is fragile.
