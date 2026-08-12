from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")


def replace_once(rel: str, old: str, new: str) -> None:
    text = read(rel)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{rel}: expected one match, found {count}: {old[:120]!r}")
    write(rel, text.replace(old, new, 1))


# -----------------------------------------------------------------------------
# Finalized utterance: seed the official latency clock at detected finalization,
# preserve the pre-finalization speech-boundary delay separately, and record the
# producer/enqueue handoff without persisting audio or transcript content.
# -----------------------------------------------------------------------------
FINALIZED = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/finalized_utterance.rs"
replace_once(
    FINALIZED,
    "use std::sync::{Condvar, Mutex, OnceLock};\n",
    "use std::sync::{Condvar, Mutex, OnceLock};\nuse std::time::{Instant, SystemTime, UNIX_EPOCH};\n",
)
replace_once(
    FINALIZED,
    '''pub struct FinalizedMeetingUtterance {\n    pub session_id: String,\n    pub sequence: u64,\n    pub lane: String,\n    pub generation: Option<u64>,\n    pub utterance_id: u64,\n    pub frame: AudioFrame,\n}''',
    '''pub struct FinalizedMeetingUtterance {\n    pub session_id: String,\n    pub sequence: u64,\n    pub lane: String,\n    pub generation: Option<u64>,\n    pub utterance_id: u64,\n    pub finalized_at: Instant,\n    pub enqueued_at: Instant,\n    pub finalized_unix_ms: u128,\n    pub speech_boundary_ms: u64,\n    pub finalization_ms: u64,\n    pub frame: AudioFrame,\n}''',
)
replace_once(
    FINALIZED,
    '''const LANE_YOU: &str = "you";\nconst LANE_INCOMING: &str = "incoming";\n''',
    '''const LANE_YOU: &str = "you";\nconst LANE_INCOMING: &str = "incoming";\n\nfn current_unix_ms() -> u128 {\n    SystemTime::now()\n        .duration_since(UNIX_EPOCH)\n        .unwrap_or_default()\n        .as_millis()\n}\n\nfn elapsed_millis(start: Instant, end: Instant) -> u64 {\n    end.checked_duration_since(start)\n        .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)\n        .unwrap_or(0)\n}\n''',
)
replace_once(
    FINALIZED,
    '''    if speech_end == 0 {\n        reset_current_utterance(state);\n        return false;\n    }\n\n    let speech_evidence = AudioEvidenceReport::from_samples(&state.current_samples[..speech_end]);''',
    '''    if speech_end == 0 {\n        reset_current_utterance(state);\n        return false;\n    }\n\n    // PR-052 begins at detected finalized-utterance end. Capture that point before\n    // evidence validation/resampling. The preceding VAD/silence boundary is tracked\n    // separately so target testing can distinguish segmentation delay from outbound\n    // processing latency.\n    let finalized_at = Instant::now();\n    let finalized_unix_ms = current_unix_ms();\n    let speech_boundary_ms =\n        u64::from(duration_ms(state.trailing_silence_samples, state.sample_rate_hz));\n\n    let speech_evidence = AudioEvidenceReport::from_samples(&state.current_samples[..speech_end]);''',
)
replace_once(
    FINALIZED,
    '''    while state.pending.len() >= MAX_PENDING_FINALIZED_UTTERANCES {\n        let _ = state.pending.pop_front();\n    }\n\n    state.pending.push_back(FinalizedMeetingUtterance {''',
    '''    while state.pending.len() >= MAX_PENDING_FINALIZED_UTTERANCES {\n        let _ = state.pending.pop_front();\n    }\n\n    let enqueued_at = Instant::now();\n    let finalization_ms = elapsed_millis(finalized_at, enqueued_at);\n    state.pending.push_back(FinalizedMeetingUtterance {''',
)
replace_once(
    FINALIZED,
    '''        generation: state.generation,\n        utterance_id,\n        frame: AudioFrame {''',
    '''        generation: state.generation,\n        utterance_id,\n        finalized_at,\n        enqueued_at,\n        finalized_unix_ms,\n        speech_boundary_ms,\n        finalization_ms,\n        frame: AudioFrame {''',
)

# -----------------------------------------------------------------------------
# Native Meeting output: the first-playback event must come from the CPAL output
# callback and use CPAL's predicted device playback timestamp, not function entry or
# stream.play(). This remains internal transient timing only.
# -----------------------------------------------------------------------------
OUTPUT = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/meeting_output.rs"
replace_once(
    OUTPUT,
    "use std::time::Duration;\n",
    "use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};\n",
)
replace_once(
    OUTPUT,
    '''pub struct MeetingOutputDeliveryReport {\n    pub ok: bool,\n    pub execution_attempted: bool,\n    pub cancelled: bool,\n    pub blocker: String,\n    pub note: String,\n}''',
    '''pub struct MeetingOutputDeliveryReport {\n    pub ok: bool,\n    pub execution_attempted: bool,\n    pub cancelled: bool,\n    pub first_playback_at: Option<Instant>,\n    pub first_playback_unix_ms: Option<u128>,\n    pub blocker: String,\n    pub note: String,\n}''',
)
replace_once(
    OUTPUT,
    '''const MIN_DELIVERY_DEADLINE_MS: u64 = 10_000;\n''',
    '''const MIN_DELIVERY_DEADLINE_MS: u64 = 10_000;\n\nfn current_unix_ms() -> u128 {\n    SystemTime::now()\n        .duration_since(UNIX_EPOCH)\n        .unwrap_or_default()\n        .as_millis()\n}\n\nfn projected_unix_ms(anchor: Instant, anchor_unix_ms: u128, target: Instant) -> u128 {\n    target\n        .checked_duration_since(anchor)\n        .map(|delta| anchor_unix_ms.saturating_add(delta.as_millis()))\n        .unwrap_or(anchor_unix_ms)\n}\n''',
)
replace_once(
    OUTPUT,
    '''struct PlaybackCursor {\n    samples: Arc<Vec<f32>>,\n    index: usize,\n    completed: bool,\n    completion_tx: mpsc::SyncSender<Duration>,\n    cancel_requested: Arc<AtomicBool>,\n    generation: u64,\n    sample_rate_hz: u32,\n    channels: u16,\n}''',
    '''struct PlaybackCursor {\n    samples: Arc<Vec<f32>>,\n    index: usize,\n    completed: bool,\n    first_playback_signalled: bool,\n    completion_tx: mpsc::SyncSender<Duration>,\n    first_playback_tx: mpsc::SyncSender<Instant>,\n    cancel_requested: Arc<AtomicBool>,\n    generation: u64,\n    sample_rate_hz: u32,\n    channels: u16,\n}''',
)
replace_once(
    OUTPUT,
    '''    fn fill<T: Copy>(&mut self, data: &mut [T], convert: impl Fn(f32) -> T) {''',
    '''    fn fill<T: Copy>(\n        &mut self,\n        data: &mut [T],\n        callback_info: &cpal::OutputCallbackInfo,\n        convert: impl Fn(f32) -> T,\n    ) {''',
)
replace_once(
    OUTPUT,
    '''        for target in data.iter_mut() {\n            if let Some(value) = self.samples.get(self.index) {\n                *target = convert(*value);\n                self.index += 1;''',
    '''        for target in data.iter_mut() {\n            if let Some(value) = self.samples.get(self.index) {\n                if !self.first_playback_signalled {\n                    self.signal_first_playback(callback_info);\n                }\n                *target = convert(*value);\n                self.index += 1;''',
)
replace_once(
    OUTPUT,
    '''    fn signal_complete(&mut self, tail: Duration) {\n        if !self.completed {\n            self.completed = true;\n            let _ = self.completion_tx.try_send(tail);\n        }\n    }\n}''',
    '''    fn signal_first_playback(&mut self, callback_info: &cpal::OutputCallbackInfo) {\n        if self.first_playback_signalled {\n            return;\n        }\n        self.first_playback_signalled = true;\n        let timestamp = callback_info.timestamp();\n        let playback_delay = timestamp\n            .playback\n            .duration_since(&timestamp.callback)\n            .unwrap_or(Duration::ZERO);\n        let callback_at = Instant::now();\n        let predicted_playback_at = callback_at.checked_add(playback_delay).unwrap_or(callback_at);\n        let _ = self.first_playback_tx.try_send(predicted_playback_at);\n    }\n\n    fn signal_complete(&mut self, tail: Duration) {\n        if !self.completed {\n            self.completed = true;\n            let _ = self.completion_tx.try_send(tail);\n        }\n    }\n}''',
)
replace_once(
    OUTPUT,
    '''    generation: u64,\n    completion_tx: mpsc::SyncSender<Duration>,\n    callback_errors: Arc<Mutex<Vec<String>>>,\n) -> Result<cpal::Stream, String> {\n    let make_cursor = |tx: mpsc::SyncSender<Duration>| PlaybackCursor {\n        samples: Arc::clone(&samples),\n        index: 0,\n        completed: false,\n        completion_tx: tx,''',
    '''    generation: u64,\n    completion_tx: mpsc::SyncSender<Duration>,\n    first_playback_tx: mpsc::SyncSender<Instant>,\n    callback_errors: Arc<Mutex<Vec<String>>>,\n) -> Result<cpal::Stream, String> {\n    let make_cursor = |tx: mpsc::SyncSender<Duration>| PlaybackCursor {\n        samples: Arc::clone(&samples),\n        index: 0,\n        completed: false,\n        first_playback_signalled: false,\n        completion_tx: tx,\n        first_playback_tx: first_playback_tx.clone(),''',
)
replace_once(
    OUTPUT,
    '''                    move |data: &mut [f32], _| cursor.fill(data, |value| value),''',
    '''                    move |data: &mut [f32], info| cursor.fill(data, info, |value| value),''',
)
replace_once(
    OUTPUT,
    '''                    move |data: &mut [i16], _| {\n                        cursor.fill(data, |value| {''',
    '''                    move |data: &mut [i16], info| {\n                        cursor.fill(data, info, |value| {''',
)
replace_once(
    OUTPUT,
    '''                    move |data: &mut [u16], _| {\n                        cursor.fill(data, |value| {''',
    '''                    move |data: &mut [u16], info| {\n                        cursor.fill(data, info, |value| {''',
)
replace_once(
    OUTPUT,
    '''        cancelled,\n        blocker: blocker.to_string(),''',
    '''        cancelled,\n        first_playback_at: None,\n        first_playback_unix_ms: None,\n        blocker: blocker.to_string(),''',
)
replace_once(
    OUTPUT,
    '''    let cancel_requested = match install_cancel_control(generation) {''',
    '''    let delivery_started_at = Instant::now();\n    let delivery_started_unix_ms = current_unix_ms();\n    let cancel_requested = match install_cancel_control(generation) {''',
)
replace_once(
    OUTPUT,
    '''    let (completion_tx, completion_rx) = mpsc::sync_channel(1);\n    let callback_errors = Arc::new(Mutex::new(Vec::new()));''',
    '''    let (completion_tx, completion_rx) = mpsc::sync_channel(1);\n    let (first_playback_tx, first_playback_rx) = mpsc::sync_channel(1);\n    let callback_errors = Arc::new(Mutex::new(Vec::new()));''',
)
replace_once(
    OUTPUT,
    '''        generation,\n        completion_tx,\n        Arc::clone(&callback_errors),''',
    '''        generation,\n        completion_tx,\n        first_playback_tx,\n        Arc::clone(&callback_errors),''',
)
replace_once(
    OUTPUT,
    '''    let callback_error = callback_errors\n        .lock()\n        .ok()\n        .and_then(|errors| errors.last().cloned());\n    let cancelled = cancel_requested.load(Ordering::Acquire)''',
    '''    let callback_error = callback_errors\n        .lock()\n        .ok()\n        .and_then(|errors| errors.last().cloned());\n    let first_playback_at = first_playback_rx.try_recv().ok();\n    let first_playback_unix_ms = first_playback_at\n        .map(|instant| projected_unix_ms(delivery_started_at, delivery_started_unix_ms, instant));\n    let cancelled = cancel_requested.load(Ordering::Acquire)''',
)
replace_once(
    OUTPUT,
    '''    if cancelled || cancel_requested.load(Ordering::Acquire) && completion.is_ok() {\n        return blocked(\n            "meeting_output:cancelled",\n            "Native Meeting output stopped because the owning generation was cancelled or revoked.",\n            true,\n            true,\n        );\n    }''',
    '''    if cancelled || cancel_requested.load(Ordering::Acquire) && completion.is_ok() {\n        let mut report = blocked(\n            "meeting_output:cancelled",\n            "Native Meeting output stopped because the owning generation was cancelled or revoked.",\n            true,\n            true,\n        );\n        report.first_playback_at = first_playback_at;\n        report.first_playback_unix_ms = first_playback_unix_ms;\n        return report;\n    }''',
)
replace_once(
    OUTPUT,
    '''    if let Some(error) = callback_error {\n        return blocked(\n            "meeting_output:stream_callback_failed",\n            &format!("Native Meeting output callback failed: {error}"),\n            true,\n            false,\n        );\n    }''',
    '''    if let Some(error) = callback_error {\n        let mut report = blocked(\n            "meeting_output:stream_callback_failed",\n            &format!("Native Meeting output callback failed: {error}"),\n            true,\n            false,\n        );\n        report.first_playback_at = first_playback_at;\n        report.first_playback_unix_ms = first_playback_unix_ms;\n        return report;\n    }''',
)
replace_once(
    OUTPUT,
    '''    if completion.is_err() {\n        return blocked(\n            "meeting_output:delivery_deadline_exceeded",\n            "Native Meeting output did not complete inside its audio-duration-derived deadline.",\n            true,\n            false,\n        );\n    }''',
    '''    if completion.is_err() {\n        let mut report = blocked(\n            "meeting_output:delivery_deadline_exceeded",\n            "Native Meeting output did not complete inside its audio-duration-derived deadline.",\n            true,\n            false,\n        );\n        report.first_playback_at = first_playback_at;\n        report.first_playback_unix_ms = first_playback_unix_ms;\n        return report;\n    }''',
)
replace_once(
    OUTPUT,
    '''        execution_attempted: true,\n        cancelled: false,\n        blocker: String::new(),''',
    '''        execution_attempted: true,\n        cancelled: false,\n        first_playback_at,\n        first_playback_unix_ms,\n        blocker: String::new(),''',
)
replace_once(
    OUTPUT,
    '''mod tests {\n    use super::{decode_wav_bytes, delivery_deadline_ms, prepare_output_samples};\n''',
    '''mod tests {\n    use super::{decode_wav_bytes, delivery_deadline_ms, prepare_output_samples, projected_unix_ms};\n    use std::time::{Duration, Instant};\n''',
)
replace_once(
    OUTPUT,
    '''    #[test]\n    fn rejects_non_wav_bytes() {\n        assert!(decode_wav_bytes(b"not a wav").is_err());\n    }\n}''',
    '''    #[test]\n    fn rejects_non_wav_bytes() {\n        assert!(decode_wav_bytes(b"not a wav").is_err());\n    }\n\n    #[test]\n    fn predicted_playback_unix_time_uses_monotonic_delta() {\n        let anchor = Instant::now();\n        let predicted = anchor + Duration::from_millis(37);\n        assert_eq!(projected_unix_ms(anchor, 10_000, predicted), 10_037);\n    }\n}''',
)

# -----------------------------------------------------------------------------
# Meeting owner: one transient per-turn timing record. No new logger/store/service.
# The official metric is finalized detection -> first predicted device playback.
# -----------------------------------------------------------------------------
MEETING = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
replace_once(
    MEETING,
    "use std::thread::{self, JoinHandle};\n",
    "use std::thread::{self, JoinHandle};\nuse std::time::Instant;\n",
)
replace_once(
    MEETING,
    '''    clear_finalized_outbound_utterance_producer, reset_finalized_incoming_speech_boundary,\n    reset_finalized_meeting_sequence, wait_take_finalized_incoming_utterance,\n    wait_take_finalized_outbound_utterance,\n};''',
    '''    clear_finalized_outbound_utterance_producer, reset_finalized_incoming_speech_boundary,\n    reset_finalized_meeting_sequence, wait_take_finalized_incoming_utterance,\n    wait_take_finalized_outbound_utterance, FinalizedMeetingUtterance,\n};''',
)
replace_once(
    MEETING,
    '''#[derive(Debug, Clone, Serialize)]\npub struct MeetingOutboundRuntimeStatus {''',
    '''#[derive(Debug, Clone, Serialize)]\npub struct MeetingOutboundTiming {\n    pub finalized_unix_ms: u128,\n    pub first_playback_unix_ms: Option<u128>,\n    pub speech_boundary_ms: u64,\n    pub finalization_ms: u64,\n    pub queue_ms: u64,\n    pub audio_prepare_ms: u64,\n    pub asr_ms: Option<u64>,\n    pub translation_ms: Option<u64>,\n    pub tts_ms: Option<u64>,\n    pub delivery_ms: Option<u64>,\n    pub outbound_latency_ms: Option<u64>,\n}\n\n#[derive(Debug, Clone, Serialize)]\npub struct MeetingOutboundRuntimeStatus {''',
)
replace_once(
    MEETING,
    '''    pub last_stage_ok: bool,\n    pub blocker: String,''',
    '''    pub last_stage_ok: bool,\n    pub timing: Option<MeetingOutboundTiming>,\n    pub blocker: String,''',
)
replace_once(
    MEETING,
    '''    pub translated_text: String,\n    pub delivery_state: Option<String>,\n    pub created_unix_ms: u128,''',
    '''    pub translated_text: String,\n    pub delivery_state: Option<String>,\n    pub outbound_timing: Option<MeetingOutboundTiming>,\n    pub created_unix_ms: u128,''',
)
replace_once(
    MEETING,
    '''struct MeetingStartPreflightRuntime {\n    generation: u64,\n    status: MeetingSessionPreflightStatus,\n}\n''',
    '''struct MeetingStartPreflightRuntime {\n    generation: u64,\n    status: MeetingSessionPreflightStatus,\n}\n\nstruct OutboundTimingContext {\n    finalized_at: Instant,\n    metrics: MeetingOutboundTiming,\n}\n''',
)
replace_once(
    MEETING,
    '''        output_active: false,\n        last_stage_ok: true,\n        blocker: String::new(),''',
    '''        output_active: false,\n        last_stage_ok: true,\n        timing: None,\n        blocker: String::new(),''',
)
replace_once(
    MEETING,
    '''    if let Ok(mut status) = outbound_status_store().lock() {\n        *status = MeetingOutboundRuntimeStatus {\n            generation: Some(generation),''',
    '''    if let Ok(mut status) = outbound_status_store().lock() {\n        let timing = if status.generation == Some(generation)\n            && status.session_id.as_deref() == Some(session_id)\n            && status.utterance_sequence == utterance_sequence\n        {\n            status.timing.clone()\n        } else {\n            None\n        };\n        *status = MeetingOutboundRuntimeStatus {\n            generation: Some(generation),''',
)
replace_once(
    MEETING,
    '''            output_active,\n            last_stage_ok,\n            blocker: blocker.to_string(),''',
    '''            output_active,\n            last_stage_ok,\n            timing,\n            blocker: blocker.to_string(),''',
)
replace_once(
    MEETING,
    '''fn update_incoming_status(\n    session_id: &str,''',
    '''fn set_outbound_timing(\n    generation: u64,\n    session_id: &str,\n    utterance_sequence: u64,\n    timing: &MeetingOutboundTiming,\n) {\n    if let Ok(mut status) = outbound_status_store().lock() {\n        if status.generation == Some(generation)\n            && status.session_id.as_deref() == Some(session_id)\n            && status.utterance_sequence == utterance_sequence\n        {\n            status.timing = Some(timing.clone());\n            status.updated_unix_ms = unix_ms();\n        }\n    }\n}\n\nfn duration_to_millis(duration: std::time::Duration) -> u64 {\n    duration.as_millis().min(u128::from(u64::MAX)) as u64\n}\n\nfn elapsed_millis(start: Instant, end: Instant) -> u64 {\n    end.checked_duration_since(start)\n        .map(duration_to_millis)\n        .unwrap_or(0)\n}\n\nfn timing_context_from_utterance(\n    utterance: &FinalizedMeetingUtterance,\n    queue_ms: u64,\n    audio_prepare_ms: u64,\n) -> OutboundTimingContext {\n    OutboundTimingContext {\n        finalized_at: utterance.finalized_at,\n        metrics: MeetingOutboundTiming {\n            finalized_unix_ms: utterance.finalized_unix_ms,\n            first_playback_unix_ms: None,\n            speech_boundary_ms: utterance.speech_boundary_ms,\n            finalization_ms: utterance.finalization_ms,\n            queue_ms,\n            audio_prepare_ms,\n            asr_ms: None,\n            translation_ms: None,\n            tts_ms: None,\n            delivery_ms: None,\n            outbound_latency_ms: None,\n        },\n    }\n}\n\nfn record_first_playback_timing(\n    timing: &mut OutboundTimingContext,\n    delivery_started_at: Instant,\n    first_playback_at: Option<Instant>,\n    first_playback_unix_ms: Option<u128>,\n) {\n    let Some(first_playback_at) = first_playback_at else {\n        return;\n    };\n    timing.metrics.delivery_ms = Some(elapsed_millis(delivery_started_at, first_playback_at));\n    timing.metrics.outbound_latency_ms =\n        Some(elapsed_millis(timing.finalized_at, first_playback_at));\n    timing.metrics.first_playback_unix_ms = first_playback_unix_ms;\n}\n\nfn update_incoming_status(\n    session_id: &str,''',
)
replace_once(
    MEETING,
    '''    translated_text: &str,\n    delivery_state: Option<&str>,\n) -> bool {''',
    '''    translated_text: &str,\n    delivery_state: Option<&str>,\n    outbound_timing: Option<MeetingOutboundTiming>,\n) -> bool {''',
)
replace_once(
    MEETING,
    '''    if lane == "you" && (generation.is_none() || delivery_state.is_none()) {\n        return false;\n    }\n    if lane == "incoming" && (generation.is_some() || delivery_state.is_some()) {\n        return false;\n    }''',
    '''    if lane == "you"\n        && (generation.is_none() || delivery_state.is_none() || outbound_timing.is_none())\n    {\n        return false;\n    }\n    if lane == "incoming"\n        && (generation.is_some() || delivery_state.is_some() || outbound_timing.is_some())\n    {\n        return false;\n    }''',
)
replace_once(
    MEETING,
    '''        translated_text: translated_text.to_string(),\n        delivery_state: delivery_state.map(str::to_string),\n        created_unix_ms: now,''',
    '''        translated_text: translated_text.to_string(),\n        delivery_state: delivery_state.map(str::to_string),\n        outbound_timing,\n        created_unix_ms: now,''',
)
replace_once(
    MEETING,
    '''fn interrupt_committed_turns_for_generation(session_id: &str, generation: u64) {''',
    '''fn update_committed_turn_outbound_timing(\n    session_id: &str,\n    generation: u64,\n    utterance_id: u64,\n    timing: &MeetingOutboundTiming,\n) -> bool {\n    let Ok(mut guard) = committed_turn_store().lock() else {\n        return false;\n    };\n    let Some(store) = guard.as_mut() else {\n        return false;\n    };\n    if store.session_id != session_id {\n        return false;\n    }\n    let Some(turn) = store.turns.iter_mut().find(|turn| {\n        turn.session_id == session_id\n            && turn.generation == Some(generation)\n            && turn.utterance_id == utterance_id\n            && turn.lane == "you"\n    }) else {\n        return false;\n    };\n    turn.outbound_timing = Some(timing.clone());\n    turn.updated_unix_ms = unix_ms();\n    true\n}\n\nfn interrupt_committed_turns_for_generation(session_id: &str, generation: u64) {''',
)
replace_once(
    MEETING,
    '''    utterance_id: u64,\n    audio_path: String,\n) -> MeetingOutboundProcessResult {''',
    '''    utterance_id: u64,\n    audio_path: String,\n    mut timing: OutboundTimingContext,\n) -> MeetingOutboundProcessResult {''',
)
replace_once(
    MEETING,
    '''    update_outbound_status(\n        generation,\n        session_id,\n        "transcribing",\n        event_sequence,\n        false,\n        true,\n        "",\n        "Finalized Indonesian speech is being transcribed locally.",\n    );\n    let asr = send_helper_worker_task(''',
    '''    update_outbound_status(\n        generation,\n        session_id,\n        "transcribing",\n        event_sequence,\n        false,\n        true,\n        "",\n        "Finalized Indonesian speech is being transcribed locally.",\n    );\n    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);\n    let asr_started_at = Instant::now();\n    let asr = send_helper_worker_task(''',
)
replace_once(
    MEETING,
    '''    );\n    if !generation_is_live(generation) {\n        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);\n    }\n    let transcript = worker_text(&asr, "transcript_text");''',
    '''    );\n    timing.metrics.asr_ms = Some(elapsed_millis(asr_started_at, Instant::now()));\n    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);\n    if !generation_is_live(generation) {\n        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);\n    }\n    let transcript = worker_text(&asr, "transcript_text");''',
)
replace_once(
    MEETING,
    '''    update_outbound_status(\n        generation,\n        session_id,\n        "translating",\n        event_sequence,\n        false,\n        true,\n        "",\n        "Final Indonesian transcript is being translated to English.",\n    );\n    let translation = send_helper_worker_task(''',
    '''    update_outbound_status(\n        generation,\n        session_id,\n        "translating",\n        event_sequence,\n        false,\n        true,\n        "",\n        "Final Indonesian transcript is being translated to English.",\n    );\n    let translation_started_at = Instant::now();\n    let translation = send_helper_worker_task(''',
)
replace_once(
    MEETING,
    '''    );\n    if !generation_is_live(generation) {\n        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);\n    }\n    let translated_text = worker_text(&translation, "translated_text");''',
    '''    );\n    timing.metrics.translation_ms = Some(elapsed_millis(translation_started_at, Instant::now()));\n    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);\n    if !generation_is_live(generation) {\n        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);\n    }\n    let translated_text = worker_text(&translation, "translated_text");''',
)
replace_once(
    MEETING,
    '''        &translated_text,\n        Some("preparing_voice"),\n    );''',
    '''        &translated_text,\n        Some("preparing_voice"),\n        Some(timing.metrics.clone()),\n    );''',
)
replace_once(
    MEETING,
    '''    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);\n    let tts = send_helper_worker_task(''',
    '''    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);\n    let tts_started_at = Instant::now();\n    let tts = send_helper_worker_task(''',
)
replace_once(
    MEETING,
    '''    );\n    let tts_path = worker_text(&tts, "output_path").unwrap_or_default();\n    if !generation_is_live(generation) {''',
    '''    );\n    timing.metrics.tts_ms = Some(elapsed_millis(tts_started_at, Instant::now()));\n    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);\n    let _ = update_committed_turn_outbound_timing(\n        session_id,\n        generation,\n        utterance_id,\n        &timing.metrics,\n    );\n    let tts_path = worker_text(&tts, "output_path").unwrap_or_default();\n    if !generation_is_live(generation) {''',
)
replace_once(
    MEETING,
    '''    let suppression_guard = match begin_self_output_suppression(session_id) {''',
    '''    let delivery_started_at = Instant::now();\n    let suppression_guard = match begin_self_output_suppression(session_id) {''',
)
replace_once(
    MEETING,
    '''    let route =\n        deliver_meeting_output_wav(&tts_path, bound_output_device.as_deref().ok(), generation);\n    drop(suppression_guard);''',
    '''    let route =\n        deliver_meeting_output_wav(&tts_path, bound_output_device.as_deref().ok(), generation);\n    record_first_playback_timing(\n        &mut timing,\n        delivery_started_at,\n        route.first_playback_at,\n        route.first_playback_unix_ms,\n    );\n    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);\n    let _ = update_committed_turn_outbound_timing(\n        session_id,\n        generation,\n        utterance_id,\n        &timing.metrics,\n    );\n    drop(suppression_guard);''',
)
# Incoming committed turn remains intentionally timing-free.
replace_once(
    MEETING,
    '''        &translated_text,\n        None,\n    );\n    update_incoming_status(''',
    '''        &translated_text,\n        None,\n        None,\n    );\n    update_incoming_status(''',
)
replace_once(
    MEETING,
    '''            while let Some(utterance) = wait_take_finalized_outbound_utterance(generation) {\n                if utterance.generation != Some(generation)''',
    '''            while let Some(utterance) = wait_take_finalized_outbound_utterance(generation) {\n                let queue_ms = elapsed_millis(utterance.enqueued_at, Instant::now());\n                if utterance.generation != Some(generation)''',
)
replace_once(
    MEETING,
    '''                let write = write_finalized_outbound_utterance_wav(&utterance);\n                if !write.ok {''',
    '''                let audio_prepare_started_at = Instant::now();\n                let write = write_finalized_outbound_utterance_wav(&utterance);\n                let audio_prepare_ms = elapsed_millis(audio_prepare_started_at, Instant::now());\n                let timing = timing_context_from_utterance(&utterance, queue_ms, audio_prepare_ms);\n                if !write.ok {''',
)
replace_once(
    MEETING,
    '''                        "Finalized speech could not be written to its temporary ASR WAV. No AI/output stage consumed it.",\n                    );\n                    continue;''',
    '''                        "Finalized speech could not be written to its temporary ASR WAV. No AI/output stage consumed it.",\n                    );\n                    set_outbound_timing(\n                        generation,\n                        &thread_session_id,\n                        utterance.sequence,\n                        &timing.metrics,\n                    );\n                    continue;''',
)
replace_once(
    MEETING,
    '''                        "Finalized speech writer returned no temporary audio path. No AI/output stage consumed it.",\n                    );\n                    continue;''',
    '''                        "Finalized speech writer returned no temporary audio path. No AI/output stage consumed it.",\n                    );\n                    set_outbound_timing(\n                        generation,\n                        &thread_session_id,\n                        utterance.sequence,\n                        &timing.metrics,\n                    );\n                    continue;''',
)
replace_once(
    MEETING,
    '''                    utterance.utterance_id,\n                    audio_path.clone(),\n                );''',
    '''                    utterance.utterance_id,\n                    audio_path.clone(),\n                    timing,\n                );''',
)
# Add deterministic metric math test without running hardware/model work.
replace_once(
    MEETING,
    '''#[cfg(test)]\nmod cleanup_truth_tests {''',
    '''#[cfg(test)]\nmod c2_latency_tests {\n    use super::{record_first_playback_timing, MeetingOutboundTiming, OutboundTimingContext};\n    use std::time::{Duration, Instant};\n\n    #[test]\n    fn official_latency_runs_from_finalized_detection_to_first_playback() {\n        let finalized_at = Instant::now();\n        let delivery_started_at = finalized_at + Duration::from_millis(1_200);\n        let first_playback_at = finalized_at + Duration::from_millis(1_275);\n        let mut timing = OutboundTimingContext {\n            finalized_at,\n            metrics: MeetingOutboundTiming {\n                finalized_unix_ms: 50_000,\n                first_playback_unix_ms: None,\n                speech_boundary_ms: 140,\n                finalization_ms: 3,\n                queue_ms: 12,\n                audio_prepare_ms: 5,\n                asr_ms: Some(900),\n                translation_ms: Some(120),\n                tts_ms: Some(160),\n                delivery_ms: None,\n                outbound_latency_ms: None,\n            },\n        };\n\n        record_first_playback_timing(\n            &mut timing,\n            delivery_started_at,\n            Some(first_playback_at),\n            Some(51_275),\n        );\n\n        assert_eq!(timing.metrics.speech_boundary_ms, 140);\n        assert_eq!(timing.metrics.delivery_ms, Some(75));\n        assert_eq!(timing.metrics.outbound_latency_ms, Some(1_275));\n        assert_eq!(timing.metrics.first_playback_unix_ms, Some(51_275));\n    }\n}\n\n#[cfg(test)]\nmod cleanup_truth_tests {''',
)

# -----------------------------------------------------------------------------
# Frontend bridge types expose the transient timing for target proof/Diagnostics.
# Normal Meeting presentation remains unchanged.
# -----------------------------------------------------------------------------
RUNTIME_API = "EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts"
replace_once(
    RUNTIME_API,
    '''export type MeetingOutboundRuntimeStatus = {\n  generation: number | null;''',
    '''export type MeetingOutboundTiming = {\n  finalized_unix_ms: number;\n  first_playback_unix_ms: number | null;\n  speech_boundary_ms: number;\n  finalization_ms: number;\n  queue_ms: number;\n  audio_prepare_ms: number;\n  asr_ms: number | null;\n  translation_ms: number | null;\n  tts_ms: number | null;\n  delivery_ms: number | null;\n  outbound_latency_ms: number | null;\n};\n\nexport type MeetingOutboundRuntimeStatus = {\n  generation: number | null;''',
)
replace_once(
    RUNTIME_API,
    '''  last_stage_ok: boolean;\n  blocker: string;''',
    '''  last_stage_ok: boolean;\n  timing: MeetingOutboundTiming | null;\n  blocker: string;''',
)
replace_once(
    RUNTIME_API,
    '''  delivery_state: "preparing_voice" | "speaking" | "output_complete" | "output_failed" | "interrupted" | string | null;\n  created_unix_ms: number;''',
    '''  delivery_state: "preparing_voice" | "speaking" | "output_complete" | "output_failed" | "interrupted" | string | null;\n  outbound_timing: MeetingOutboundTiming | null;\n  created_unix_ms: number;''',
)
replace_once(
    RUNTIME_API,
    '''      last_stage_ok: false,\n      blocker: "frontend_bridge_unavailable",''',
    '''      last_stage_ok: false,\n      timing: null,\n      blocker: "frontend_bridge_unavailable",''',
)

# -----------------------------------------------------------------------------
# Canonical validator: C2 must remain transient, callback-grounded, and threshold-free.
# -----------------------------------------------------------------------------
VALIDATOR = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
replace_once(
    VALIDATOR,
    '''requireMarkers(source.helperBridge, "Meeting outbound AI preparation", [''',
    '''requireMarkers(source.finalizedUtterance, "C2 finalized latency seed", [\n  "pub finalized_at: Instant",\n  "pub enqueued_at: Instant",\n  "pub finalized_unix_ms: u128",\n  "pub speech_boundary_ms: u64",\n  "pub finalization_ms: u64",\n  "PR-052 begins at detected finalized-utterance end",\n]);\nrequireMarkers(source.meetingOutput, "C2 first translated playback timestamp", [\n  "first_playback_at: Option<Instant>",\n  "first_playback_unix_ms: Option<u128>",\n  "callback_info.timestamp()",\n  ".playback",\n  ".duration_since(&timestamp.callback)",\n  "signal_first_playback(callback_info)",\n]);\nrequireMarkers(source.meetingSession, "C2 transient outbound latency instrumentation", [\n  "pub struct MeetingOutboundTiming",\n  "pub timing: Option<MeetingOutboundTiming>",\n  "pub outbound_timing: Option<MeetingOutboundTiming>",\n  "speech_boundary_ms",\n  "finalization_ms",\n  "queue_ms",\n  "audio_prepare_ms",\n  "asr_ms",\n  "translation_ms",\n  "tts_ms",\n  "delivery_ms",\n  "outbound_latency_ms",\n  "record_first_playback_timing",\n]);\nforbidMarkers(source.meetingSession, "C2 no speculative latency threshold", [\n  "MAX_ACCEPTABLE_LATENCY",\n  "TARGET_LATENCY_MS",\n  "latency_threshold",\n]);\n\nrequireMarkers(source.helperBridge, "Meeting outbound AI preparation", [''',
)

# -----------------------------------------------------------------------------
# Stable context + ownership + continuation.
# -----------------------------------------------------------------------------
CONTEXT = "CONTEXT.md"
replace_once(
    CONTEXT,
    '''The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency.''',
    '''The bounded committed-turn store is transient Live transcript state only; Meeting Stop has no History persistence dependency. Outbound timing is attached to the same transient Meeting owner: finalized speech records the detected finalization point and speech-boundary delay, the Meeting consumer records queue/audio-preparation/AI-stage durations, and Rust/CPAL output reports first translated playback from CPAL's predicted device-playback timestamp. No latency threshold is hardcoded before target-PC evidence, and C2 adds no persistent conversation/telemetry log.''',
)
OWNERSHIP = "docs/knowledge/source-ownership.md"
replace_once(
    OWNERSHIP,
    '''| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + RUST/CPAL DELIVERY |''',
    '''| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + RUST/CPAL DELIVERY |\n| Outbound latency instrumentation | `engine/audio/finalized_utterance.rs`, `commands/meeting_session.rs`, `engine/audio/meeting_output.rs` | ACTIVE / PR-052 TRANSIENT STAGE TIMING + CPAL PREDICTED FIRST PLAYBACK |''',
)

NEXT = "docs/knowledge/next-action.md"
text = read(NEXT)
marker = "## Current Mode\n"
if marker not in text:
    raise RuntimeError("next-action Current Mode marker missing")
prefix = text.split(marker, 1)[0].rstrip()
new_tail = r'''

## Pre-Local C2 — IMPLEMENTED / TARGET PERFORMANCE PROOF DEFERRED

C2 makes PR-052 measurable without introducing a second telemetry owner or persisting conversation data. The finalized-utterance producer now records the detected finalization instant/unix timestamp, the VAD-derived speech-boundary delay that occurred before the official metric begins, and the bounded finalization/enqueue cost. The outbound consumer adds finalized-queue wait and temporary WAV preparation cost. The canonical Meeting owner times each blocking ASR, ID->EN translation, and English TTS stage around the existing helper calls.

Native first playback is not inferred from `stream.play()` or function entry. `engine/audio/meeting_output.rs` records the first translated sample from the CPAL output callback and uses `OutputCallbackInfo.timestamp().playback` relative to the callback timestamp to project CPAL's predicted device-playback instant. The Meeting owner then records `delivery_ms` from TTS completion/delivery start to that first playback and the official `outbound_latency_ms` from detected finalized utterance end to that same first playback.

The transient timing shape is:

```text
speech_boundary_ms       -> last speech-like boundary -> detected finalization (outside PR-052)
finalization_ms          -> detected finalization -> finalized frame enqueued
queue_ms                 -> finalized enqueue -> outbound consumer pickup
audio_prepare_ms         -> temporary finalized WAV preparation
asr_ms                   -> host-observed ASR helper stage
translation_ms           -> host-observed ID->EN helper stage
tts_ms                   -> host-observed English TTS helper stage
delivery_ms              -> TTS complete/delivery start -> predicted first device playback
outbound_latency_ms       -> detected finalized utterance end -> predicted first device playback (PR-052)
```

`asr_ms`, `translation_ms`, and `tts_ms` intentionally include their existing bounded helper scheduling/IPC/inference work because that is the user-visible cost of each canonical stage. Timing stays only in current `MeetingOutboundRuntimeStatus` and the already-bounded transient committed-turn snapshot; C2 creates no telemetry database, history dependency, content log, background service, or release threshold.

Remote Windows/source proof for this implementation slice:

```text
canonical source validators              -> PASS
svelte-check + frontend build            -> PASS
C2 deterministic latency math test       -> PASS
Meeting-output timing helper tests        -> PASS
Rust full test-target compile (`--no-run`)-> PASS
cargo check                              -> PASS
Tauri release build --no-bundle          -> PASS
C2 transient/callback ownership guard     -> PASS
```

This proof validates timing ownership, metric math, serialization/build contracts, and that first-playback instrumentation is wired to the CPAL callback timestamp API. It does not produce a real latency number because no target microphone/model/GPU/virtual-cable/meeting-app session was executed. No VAD tuning or latency threshold was introduced.

## Current Mode

**Developing / Pre-Local Readiness — C2 IMPLEMENTED, TARGET PERFORMANCE PROOF DEFERRED.** A1-A7, B1-B6, and C1 remain closed at their proven boundaries. C2 now makes target testing capable of measuring PR-052 and stage-level cost without persistent telemetry. The user still does not approve local-PC testing, so actual latency distribution and release threshold remain evidence to collect later.

## Next Step — Pre-Local C3 Functional AI Readiness Self-Test

Upgrade required outbound readiness from model/provider preload checks to one cached functional execution result per worker generation: bounded fixed-fixture ID->EN inference and English TTS synthesis, plus a bounded ASR inference fixture where the canonical test asset is available. Cache only capability truth/operational timing, never fixture/output content; invalidate on worker generation/runtime replacement or a hard execution failure. Do not run a full smoke on every Meeting Start and do not change model quality/tuning policy.
'''
write(NEXT, prefix + new_tail)

print("C2 latency instrumentation patch staged")
