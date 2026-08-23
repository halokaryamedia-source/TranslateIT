use serde::Serialize;
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::Instant;

use crate::engine::audio::finalized_utterance::{
    clear_finalized_incoming_utterance_producer, clear_finalized_meeting_sequence,
    clear_finalized_outbound_utterance_producer, evicted_pending_utterance_count,
    overflow_dropped_utterance_count, reset_finalized_incoming_speech_boundary,
    reset_finalized_meeting_sequence, wait_take_finalized_incoming_utterance,
    wait_take_finalized_outbound_utterance, FinalizedMeetingUtterance,
};
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::{
    remove_finalized_meeting_utterance_wav, write_finalized_incoming_utterance_wav,
    write_finalized_outbound_utterance_wav,
};
use crate::engine::audio::meeting_output::{
    cancel_meeting_output_for_generation, clear_prepared_meeting_output_device,
    deliver_meeting_output_wav, prepare_meeting_output_device,
    probe_prepared_meeting_output_device_functionally,
};
use crate::engine::audio::meeting_sound_capture::{
    meeting_sound_capture_status, start_meeting_sound_capture_runtime,
    stop_meeting_sound_capture_runtime,
};
use crate::engine::runtime_state::{
    begin_application_meeting_session, clear_runtime_session_if_generation,
    clear_runtime_session_state, commit_application_meeting_session_live,
    latest_runtime_session_state, mark_runtime_session_cleanup_incomplete,
    revoke_runtime_session_authority, runtime_generation_is_authoritative,
    RuntimeSessionStateReport,
};

use super::audio::get_input_status;
use super::helper_bridge::{
    cancel_helper_bridge_meeting_session, get_helper_bridge_status,
    prepare_required_outbound_ai_runtime, required_outbound_voice_actor_token,
    send_helper_worker_task, start_helper_bridge, HelperBridgeWorkerResponse,
};
use super::helper_bridge_runtime::unix_ms;
use super::virtual_mic_route::{
    get_bound_virtual_mic_output_device, get_virtual_mic_route_selection,
};

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
const MAX_LIVE_COMMITTED_TURNS: usize = 240;

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionPreflightStatus {
    pub ready_for_start: bool,
    pub start_eligible: bool,
    pub functional_outbound_ready: bool,
    pub functional_outbound_verified_unix_ms: Option<u128>,
    pub microphone_ready: bool,
    pub models_ready: bool,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub meeting_route_ready: bool,
    pub generation_aware_outbound_stages_ready: bool,
    pub finalized_utterance_source_connected: bool,
    pub outbound_runtime_connected: bool,
    pub blockers: Vec<String>,
    pub summary: String,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundTiming {
    pub finalized_unix_ms: u128,
    pub first_playback_unix_ms: Option<u128>,
    pub speech_boundary_ms: u64,
    pub finalization_ms: u64,
    pub queue_ms: u64,
    pub audio_prepare_ms: u64,
    pub asr_ms: Option<u64>,
    pub translation_ms: Option<u64>,
    pub tts_ms: Option<u64>,
    pub delivery_ms: Option<u64>,
    pub outbound_latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundRuntimeStatus {
    pub generation: Option<u64>,
    pub session_id: Option<String>,
    pub stage: String,
    pub utterance_sequence: u64,
    pub output_active: bool,
    pub last_stage_ok: bool,
    pub timing: Option<MeetingOutboundTiming>,
    pub overflow_dropped_utterance_count: u64,
    pub evicted_pending_utterance_count: u64,
    pub blocker: String,
    pub note: String,
    pub updated_unix_ms: u128,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingIncomingRuntimeStatus {
    pub session_id: Option<String>,
    pub stage: String,
    pub capture_active: bool,
    pub suppressed: bool,
    pub degraded: bool,
    pub blocker: String,
    pub note: String,
    pub updated_unix_ms: u128,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionStatus {
    pub lifecycle: String,
    pub has_session: bool,
    pub authority_active: bool,
    pub session_id: Option<String>,
    pub generation: Option<u64>,
    pub started_unix_ms: Option<u128>,
    pub active_age_ms: Option<u128>,
    pub capture_active: bool,
    pub owner_id: Option<String>,
    pub blocker: String,
    pub note: String,
    pub preflight: MeetingSessionPreflightStatus,
    pub outbound: MeetingOutboundRuntimeStatus,
    pub incoming: MeetingIncomingRuntimeStatus,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionActionResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub status: MeetingSessionStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundProcessResult {
    pub ok: bool,
    pub delivered: bool,
    pub state: String,
    pub blocker: String,
    pub note: String,
    pub generation: u64,
    pub utterance_sequence: u64,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingCommittedTurn {
    pub session_id: String,
    pub sequence: u64,
    pub generation: Option<u64>,
    pub utterance_id: u64,
    pub lane: String,
    pub source_text: String,
    pub translated_text: String,
    pub delivery_state: Option<String>,
    pub outbound_timing: Option<MeetingOutboundTiming>,
    pub created_unix_ms: u128,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingCommittedTurnsSnapshot {
    pub ok: bool,
    pub has_session: bool,
    pub session_id: Option<String>,
    pub turns: Vec<MeetingCommittedTurn>,
    pub dropped_turn_count: u64,
    pub truncated: bool,
    pub blocker: String,
    pub note: String,
    pub runtime_claim: String,
}

struct MeetingOutboundConsumerRuntime {
    generation: u64,
    session_id: String,
    thread: Option<JoinHandle<()>>,
}

struct MeetingIncomingConsumerRuntime {
    session_id: String,
    thread: Option<JoinHandle<()>>,
}

struct MeetingConsumerCleanupResult {
    ok: bool,
    message: String,
}

struct MeetingCommittedTurnStore {
    session_id: String,
    dropped_turn_count: u64,
    turns: VecDeque<MeetingCommittedTurn>,
}

struct MeetingSelfOutputSuppression {
    session_id: String,
    active: Arc<AtomicBool>,
}

struct MeetingStartPreflightRuntime {
    generation: u64,
    status: MeetingSessionPreflightStatus,
}

pub(crate) struct OutboundTimingContext {
    finalized_at: Instant,
    metrics: MeetingOutboundTiming,
}

struct SelfOutputSuppressionGuard {
    active: Arc<AtomicBool>,
}

impl Drop for SelfOutputSuppressionGuard {
    fn drop(&mut self) {
        self.active.store(false, Ordering::Release);
        reset_finalized_incoming_speech_boundary();
    }
}

static MEETING_OUTBOUND_STATUS: OnceLock<Mutex<MeetingOutboundRuntimeStatus>> = OnceLock::new();
static MEETING_INCOMING_STATUS: OnceLock<Mutex<MeetingIncomingRuntimeStatus>> = OnceLock::new();
static MEETING_OUTBOUND_CONSUMER: OnceLock<Mutex<Option<MeetingOutboundConsumerRuntime>>> =
    OnceLock::new();
static MEETING_INCOMING_CONSUMER: OnceLock<Mutex<Option<MeetingIncomingConsumerRuntime>>> =
    OnceLock::new();
static MEETING_COMMITTED_TURNS: OnceLock<Mutex<Option<MeetingCommittedTurnStore>>> =
    OnceLock::new();
static MEETING_SELF_OUTPUT_SUPPRESSION: OnceLock<Mutex<Option<MeetingSelfOutputSuppression>>> =
    OnceLock::new();
static MEETING_START_PREFLIGHT: OnceLock<Mutex<Option<MeetingStartPreflightRuntime>>> =
    OnceLock::new();

fn idle_outbound_status() -> MeetingOutboundRuntimeStatus {
    MeetingOutboundRuntimeStatus {
        generation: None,
        session_id: None,
        stage: "idle".to_string(),
        utterance_sequence: 0,
        output_active: false,
        last_stage_ok: true,
        timing: None,
        overflow_dropped_utterance_count: overflow_dropped_utterance_count(),
        evicted_pending_utterance_count: evicted_pending_utterance_count(),
        blocker: String::new(),
        note: "The finalized-utterance producer and serialized Meeting outbound consumer are source-connected. No output is active until an authoritative Live session produces finalized speech."
            .to_string(),
        updated_unix_ms: unix_ms(),
        runtime_claim: "meeting_outbound_finalized_segment_contract_source_side_not_windows_runtime_proof"
            .to_string(),
    }
}

fn idle_incoming_status() -> MeetingIncomingRuntimeStatus {
    MeetingIncomingRuntimeStatus {
        session_id: None,
        stage: "unavailable".to_string(),
        capture_active: false,
        suppressed: false,
        degraded: false,
        blocker: String::new(),
        note: "Incoming Meeting Sound is an optional lane and is not active without an application Meeting session."
            .to_string(),
        updated_unix_ms: unix_ms(),
        runtime_claim: "meeting_incoming_optional_lane_source_contract_not_windows_runtime_proof"
            .to_string(),
    }
}

fn outbound_status_store() -> &'static Mutex<MeetingOutboundRuntimeStatus> {
    MEETING_OUTBOUND_STATUS.get_or_init(|| Mutex::new(idle_outbound_status()))
}

fn incoming_status_store() -> &'static Mutex<MeetingIncomingRuntimeStatus> {
    MEETING_INCOMING_STATUS.get_or_init(|| Mutex::new(idle_incoming_status()))
}

fn outbound_consumer_store() -> &'static Mutex<Option<MeetingOutboundConsumerRuntime>> {
    MEETING_OUTBOUND_CONSUMER.get_or_init(|| Mutex::new(None))
}

fn incoming_consumer_store() -> &'static Mutex<Option<MeetingIncomingConsumerRuntime>> {
    MEETING_INCOMING_CONSUMER.get_or_init(|| Mutex::new(None))
}

fn committed_turn_store() -> &'static Mutex<Option<MeetingCommittedTurnStore>> {
    MEETING_COMMITTED_TURNS.get_or_init(|| Mutex::new(None))
}

fn suppression_store() -> &'static Mutex<Option<MeetingSelfOutputSuppression>> {
    MEETING_SELF_OUTPUT_SUPPRESSION.get_or_init(|| Mutex::new(None))
}

fn start_preflight_store() -> &'static Mutex<Option<MeetingStartPreflightRuntime>> {
    MEETING_START_PREFLIGHT.get_or_init(|| Mutex::new(None))
}

fn remember_start_preflight(generation: u64, status: MeetingSessionPreflightStatus) {
    if let Ok(mut guard) = start_preflight_store().lock() {
        *guard = Some(MeetingStartPreflightRuntime { generation, status });
    }
}

fn current_start_preflight(generation: u64) -> Option<MeetingSessionPreflightStatus> {
    start_preflight_store().lock().ok().and_then(|guard| {
        guard
            .as_ref()
            .filter(|snapshot| snapshot.generation == generation)
            .map(|snapshot| snapshot.status.clone())
    })
}

fn clear_start_preflight_for_generation(generation: u64) {
    if let Ok(mut guard) = start_preflight_store().lock() {
        if guard.as_ref().map(|snapshot| snapshot.generation) == Some(generation) {
            *guard = None;
        }
    }
}

fn clear_all_start_preflight() {
    if let Ok(mut guard) = start_preflight_store().lock() {
        *guard = None;
    }
}

fn current_outbound_status() -> MeetingOutboundRuntimeStatus {
    outbound_status_store()
        .lock()
        .map(|status| status.clone())
        .unwrap_or_else(|_| idle_outbound_status())
}

fn current_incoming_status() -> MeetingIncomingRuntimeStatus {
    let mut status = incoming_status_store()
        .lock()
        .map(|status| status.clone())
        .unwrap_or_else(|_| idle_incoming_status());
    let capture = meeting_sound_capture_status();
    if status.session_id.is_some() {
        if status.stage == "cleanup_incomplete"
            && capture.blocker == "meeting_sound:state_lock_failed"
        {
            status.capture_active = true;
            status.suppressed = false;
        } else {
            status.capture_active = capture.stream_active;
            status.suppressed = capture.suppression_active;
        }
        if capture.stream_active && capture.callback_error_count > 0 {
            status.degraded = true;
            if status.blocker.is_empty() {
                status.blocker = "meeting_incoming:capture_callback_error".to_string();
            }
        }
    }
    status
}

fn update_outbound_status(
    generation: u64,
    session_id: &str,
    stage: &str,
    utterance_sequence: u64,
    output_active: bool,
    last_stage_ok: bool,
    blocker: &str,
    note: &str,
) {
    if let Ok(mut status) = outbound_status_store().lock() {
        let timing = if status.generation == Some(generation)
            && status.session_id.as_deref() == Some(session_id)
            && status.utterance_sequence == utterance_sequence
        {
            status.timing.clone()
        } else {
            None
        };
        *status = MeetingOutboundRuntimeStatus {
            generation: Some(generation),
            session_id: Some(session_id.to_string()),
            stage: stage.to_string(),
            utterance_sequence,
            output_active,
            last_stage_ok,
            timing,
            overflow_dropped_utterance_count: overflow_dropped_utterance_count(),
            evicted_pending_utterance_count: evicted_pending_utterance_count(),
            blocker: blocker.to_string(),
            note: note.to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim:
                "meeting_outbound_finalized_segment_contract_source_side_not_windows_runtime_proof"
                    .to_string(),
        };
    }
}

fn set_outbound_timing(
    generation: u64,
    session_id: &str,
    utterance_sequence: u64,
    timing: &MeetingOutboundTiming,
) {
    if let Ok(mut status) = outbound_status_store().lock() {
        if status.generation == Some(generation)
            && status.session_id.as_deref() == Some(session_id)
            && status.utterance_sequence == utterance_sequence
        {
            status.timing = Some(timing.clone());
            status.updated_unix_ms = unix_ms();
        }
    }
}

fn duration_to_millis(duration: std::time::Duration) -> u64 {
    duration.as_millis().min(u128::from(u64::MAX)) as u64
}

fn elapsed_millis(start: Instant, end: Instant) -> u64 {
    end.checked_duration_since(start)
        .map(duration_to_millis)
        .unwrap_or(0)
}

fn timing_context_from_utterance(
    utterance: &FinalizedMeetingUtterance,
    queue_ms: u64,
    audio_prepare_ms: u64,
) -> OutboundTimingContext {
    OutboundTimingContext {
        finalized_at: utterance.finalized_at,
        metrics: MeetingOutboundTiming {
            finalized_unix_ms: utterance.finalized_unix_ms,
            first_playback_unix_ms: None,
            speech_boundary_ms: utterance.speech_boundary_ms,
            finalization_ms: utterance.finalization_ms,
            queue_ms,
            audio_prepare_ms,
            asr_ms: None,
            translation_ms: None,
            tts_ms: None,
            delivery_ms: None,
            outbound_latency_ms: None,
        },
    }
}

fn record_first_playback_timing(
    timing: &mut OutboundTimingContext,
    delivery_started_at: Instant,
    first_playback_at: Option<Instant>,
    first_playback_unix_ms: Option<u128>,
) {
    let Some(first_playback_at) = first_playback_at else {
        return;
    };
    timing.metrics.delivery_ms = Some(elapsed_millis(delivery_started_at, first_playback_at));
    timing.metrics.outbound_latency_ms =
        Some(elapsed_millis(timing.finalized_at, first_playback_at));
    timing.metrics.first_playback_unix_ms = first_playback_unix_ms;
}

fn update_incoming_status(
    session_id: &str,
    stage: &str,
    degraded: bool,
    blocker: &str,
    note: &str,
) {
    if let Ok(mut status) = incoming_status_store().lock() {
        let capture = meeting_sound_capture_status();
        *status = MeetingIncomingRuntimeStatus {
            session_id: Some(session_id.to_string()),
            stage: stage.to_string(),
            capture_active: capture.stream_active,
            suppressed: capture.suppression_active,
            degraded,
            blocker: blocker.to_string(),
            note: note.to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim:
                "meeting_incoming_optional_lane_source_contract_not_windows_runtime_proof"
                    .to_string(),
        };
    }
}

fn clear_outbound_status() {
    if let Ok(mut status) = outbound_status_store().lock() {
        *status = idle_outbound_status();
    }
}

fn clear_incoming_status() {
    if let Ok(mut status) = incoming_status_store().lock() {
        *status = idle_incoming_status();
    }
}

fn mark_incoming_cleanup_incomplete_status(
    session_id: &str,
    capture_potentially_active: bool,
    note: &str,
) {
    if let Ok(mut status) = incoming_status_store().lock() {
        *status = MeetingIncomingRuntimeStatus {
            session_id: Some(session_id.to_string()),
            stage: "cleanup_incomplete".to_string(),
            capture_active: capture_potentially_active,
            suppressed: false,
            degraded: true,
            blocker: "meeting_session:cleanup_incomplete".to_string(),
            note: note.to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim: "meeting_incoming_cleanup_incomplete_resource_release_not_confirmed"
                .to_string(),
        };
    }
}

fn reset_committed_turns(session_id: &str) {
    if let Ok(mut guard) = committed_turn_store().lock() {
        *guard = Some(MeetingCommittedTurnStore {
            session_id: session_id.to_string(),
            dropped_turn_count: 0,
            turns: VecDeque::new(),
        });
    }
}

fn clear_committed_turns_for_session(session_id: &str) {
    if let Ok(mut guard) = committed_turn_store().lock() {
        if guard
            .as_ref()
            .map(|store| store.session_id == session_id)
            .unwrap_or(false)
        {
            *guard = None;
        }
    }
}

fn clear_all_committed_turns() {
    if let Ok(mut guard) = committed_turn_store().lock() {
        *guard = None;
    }
}

fn terminal_delivery_state(state: Option<&str>) -> bool {
    matches!(
        state,
        Some("output_complete" | "output_failed" | "interrupted")
    )
}

fn commit_meeting_turn(
    session_id: &str,
    sequence: u64,
    generation: Option<u64>,
    utterance_id: u64,
    lane: &str,
    source_text: &str,
    translated_text: &str,
    delivery_state: Option<&str>,
    outbound_timing: Option<MeetingOutboundTiming>,
) -> bool {
    if sequence == 0 || !matches!(lane, "you" | "incoming") {
        return false;
    }
    if lane == "you"
        && (generation.is_none() || delivery_state.is_none() || outbound_timing.is_none())
    {
        return false;
    }
    if lane == "incoming"
        && (generation.is_some() || delivery_state.is_some() || outbound_timing.is_some())
    {
        return false;
    }

    let Ok(mut guard) = committed_turn_store().lock() else {
        return false;
    };
    let Some(store) = guard.as_mut() else {
        return false;
    };
    if store.session_id != session_id {
        return false;
    }
    if store
        .turns
        .iter()
        .any(|turn| turn.session_id == session_id && turn.sequence == sequence)
    {
        return true;
    }

    let now = unix_ms();
    let turn = MeetingCommittedTurn {
        session_id: session_id.to_string(),
        sequence,
        generation,
        utterance_id,
        lane: lane.to_string(),
        source_text: source_text.to_string(),
        translated_text: translated_text.to_string(),
        delivery_state: delivery_state.map(str::to_string),
        outbound_timing,
        created_unix_ms: now,
        updated_unix_ms: now,
    };
    let insert_at = store
        .turns
        .iter()
        .position(|existing| existing.sequence > sequence)
        .unwrap_or(store.turns.len());
    store.turns.insert(insert_at, turn);

    while store.turns.len() > MAX_LIVE_COMMITTED_TURNS {
        let _ = store.turns.pop_front();
        store.dropped_turn_count = store.dropped_turn_count.saturating_add(1);
    }
    true
}

fn update_committed_turn_delivery_state(
    session_id: &str,
    generation: u64,
    utterance_id: u64,
    delivery_state: &str,
) -> bool {
    if !matches!(
        delivery_state,
        "preparing_voice" | "speaking" | "output_complete" | "output_failed" | "interrupted"
    ) {
        return false;
    }

    let Ok(mut guard) = committed_turn_store().lock() else {
        return false;
    };
    let Some(store) = guard.as_mut() else {
        return false;
    };
    if store.session_id != session_id {
        return false;
    }
    let Some(turn) = store.turns.iter_mut().find(|turn| {
        turn.session_id == session_id
            && turn.generation == Some(generation)
            && turn.utterance_id == utterance_id
            && turn.lane == "you"
    }) else {
        return false;
    };

    if terminal_delivery_state(turn.delivery_state.as_deref()) {
        return turn.delivery_state.as_deref() == Some(delivery_state);
    }
    turn.delivery_state = Some(delivery_state.to_string());
    turn.updated_unix_ms = unix_ms();
    true
}

fn update_committed_turn_outbound_timing(
    session_id: &str,
    generation: u64,
    utterance_id: u64,
    timing: &MeetingOutboundTiming,
) -> bool {
    let Ok(mut guard) = committed_turn_store().lock() else {
        return false;
    };
    let Some(store) = guard.as_mut() else {
        return false;
    };
    if store.session_id != session_id {
        return false;
    }
    let Some(turn) = store.turns.iter_mut().find(|turn| {
        turn.session_id == session_id
            && turn.generation == Some(generation)
            && turn.utterance_id == utterance_id
            && turn.lane == "you"
    }) else {
        return false;
    };
    turn.outbound_timing = Some(timing.clone());
    turn.updated_unix_ms = unix_ms();
    true
}

fn interrupt_committed_turns_for_generation(session_id: &str, generation: u64) {
    let Ok(mut guard) = committed_turn_store().lock() else {
        return;
    };
    let Some(store) = guard.as_mut() else {
        return;
    };
    if store.session_id != session_id {
        return;
    }
    let now = unix_ms();
    for turn in &mut store.turns {
        if turn.generation == Some(generation)
            && !terminal_delivery_state(turn.delivery_state.as_deref())
        {
            turn.delivery_state = Some("interrupted".to_string());
            turn.updated_unix_ms = now;
        }
    }
}

fn empty_committed_turn_snapshot(
    has_session: bool,
    session_id: Option<String>,
    blocker: &str,
    note: &str,
) -> MeetingCommittedTurnsSnapshot {
    MeetingCommittedTurnsSnapshot {
        ok: blocker.is_empty(),
        has_session,
        session_id,
        turns: Vec::new(),
        dropped_turn_count: 0,
        truncated: false,
        blocker: blocker.to_string(),
        note: note.to_string(),
        runtime_claim: "meeting_committed_turn_snapshot_source_contract_not_rendered_runtime_proof"
            .to_string(),
    }
}

fn current_committed_turn_snapshot() -> MeetingCommittedTurnsSnapshot {
    let session = latest_runtime_session_state().snapshot;
    let Some(session) = session else {
        return empty_committed_turn_snapshot(
            false,
            None,
            "",
            "No application Meeting session currently owns committed transcript turns.",
        );
    };
    if session.owner_id != APPLICATION_MEETING_OWNER_ID {
        return empty_committed_turn_snapshot(
            true,
            Some(session.session_id),
            "meeting_committed_turns:owner_conflict",
            "Committed Meeting turns are unavailable because another runtime owner holds the active session.",
        );
    }

    let session_id = session.session_id;
    let Ok(guard) = committed_turn_store().lock() else {
        return empty_committed_turn_snapshot(
            true,
            Some(session_id),
            "meeting_committed_turns:state_lock_failed",
            "Committed Meeting turn state is temporarily unavailable.",
        );
    };
    let Some(store) = guard.as_ref() else {
        return empty_committed_turn_snapshot(
            true,
            Some(session_id),
            "",
            "The active Meeting session has not committed any translated turns yet.",
        );
    };
    if store.session_id != session_id {
        return empty_committed_turn_snapshot(
            true,
            Some(session_id),
            "meeting_committed_turns:session_mismatch",
            "Committed Meeting turn state does not belong to the current application Meeting session.",
        );
    }

    let mut turns = store.turns.iter().cloned().collect::<Vec<_>>();
    turns.sort_by_key(|turn| turn.sequence);
    MeetingCommittedTurnsSnapshot {
        ok: true,
        has_session: true,
        session_id: Some(store.session_id.clone()),
        turns,
        dropped_turn_count: store.dropped_turn_count,
        truncated: store.dropped_turn_count > 0,
        blocker: String::new(),
        note: if store.dropped_turn_count > 0 {
            format!(
                "Live transcript snapshot is bounded; {} earlier committed turns are no longer retained in the transient view.",
                store.dropped_turn_count
            )
        } else {
            "Live transcript snapshot contains the currently retained committed turns for this Meeting session in finalized speech/event order."
                .to_string()
        },
        runtime_claim: "meeting_committed_turn_snapshot_source_contract_not_rendered_runtime_proof"
            .to_string(),
    }
}

fn generation_aware_outbound_stages_ready() -> bool {
    true
}

fn finalized_utterance_source_connected() -> bool {
    true
}

fn application_outbound_runtime_connected() -> bool {
    generation_aware_outbound_stages_ready() && finalized_utterance_source_connected()
}

fn meeting_required_ai_ready(helper_ready: bool, provider_ready: bool) -> bool {
    helper_ready && provider_ready
}

fn meeting_start_ai_eligible(helper_ready: bool, provider_ready: bool) -> bool {
    helper_ready && provider_ready
}

fn build_preflight() -> MeetingSessionPreflightStatus {
    let input = get_input_status();
    let helper = get_helper_bridge_status();
    let route = get_virtual_mic_route_selection();

    let microphone_ready = input.prepared;
    let helper_ready = helper.state == "ready";
    let provider_ready = helper.provider_ready;
    let functional_outbound_ready = helper.functional_outbound_ready;
    let functional_outbound_verified_unix_ms = helper.functional_outbound_verified_unix_ms;
    // `models_ready` remains the inexpensive required outbound capability view. C4
    // keeps functional truth separate so routine status stays cheap and Start can run
    // the bounded self-test only when needed.
    let models_ready = meeting_required_ai_ready(helper_ready, provider_ready);
    let meeting_route_ready = route.route_ready;
    let generation_aware_outbound_stages_ready = generation_aware_outbound_stages_ready();
    let finalized_utterance_source_connected = finalized_utterance_source_connected();
    let outbound_runtime_connected = application_outbound_runtime_connected();

    let mut start_blockers = Vec::new();
    if !microphone_ready {
        start_blockers.push("meeting_session:microphone_not_ready".to_string());
    }
    if !meeting_start_ai_eligible(helper_ready, provider_ready) {
        start_blockers.push("meeting_session:local_runtime_not_ready".to_string());
    }
    if !meeting_route_ready {
        start_blockers.push(if route.blocker.is_empty() {
            "meeting_session:meeting_microphone_route_not_ready".to_string()
        } else {
            route.blocker.clone()
        });
    }
    if !generation_aware_outbound_stages_ready {
        start_blockers
            .push("meeting_session:generation_aware_outbound_stages_not_ready".to_string());
    }
    if !finalized_utterance_source_connected {
        start_blockers.push("meeting_session:finalized_utterance_source_not_connected".to_string());
    }
    if !outbound_runtime_connected {
        start_blockers
            .push("meeting_session:continuous_outbound_runtime_not_connected".to_string());
    }
    start_blockers.sort();
    start_blockers.dedup();

    let start_eligible = start_blockers.is_empty();
    let ready_for_start = start_eligible && functional_outbound_ready;
    let mut blockers = start_blockers;
    if start_eligible && !functional_outbound_ready {
        blockers.push("meeting_session:functional_outbound_not_verified".to_string());
    }

    MeetingSessionPreflightStatus {
        ready_for_start,
        start_eligible,
        functional_outbound_ready,
        functional_outbound_verified_unix_ms,
        microphone_ready,
        models_ready,
        helper_ready,
        provider_ready,
        meeting_route_ready,
        generation_aware_outbound_stages_ready,
        finalized_utterance_source_connected,
        outbound_runtime_connected,
        blockers,
        summary: if ready_for_start {
            "Required outbound Meeting capabilities are functionally verified for the current local worker and current preflight prerequisites are ready. Incoming Meeting Sound remains optional/degradable."
                .to_string()
        } else if start_eligible {
            "Required Meeting setup is available. A bounded local translation check must complete before Translation can become Live."
                .to_string()
        } else {
            "Start Translation remains blocked until all required current outbound Meeting prerequisites are available."
                .to_string()
        },
        runtime_claim: "meeting_start_preflight_source_contract_not_windows_runtime_proof"
            .to_string(),
    }
}

fn status_from_report(
    report: RuntimeSessionStateReport,
    preflight: MeetingSessionPreflightStatus,
) -> MeetingSessionStatus {
    let snapshot = report.snapshot.as_ref();
    MeetingSessionStatus {
        lifecycle: snapshot
            .map(|value| value.phase.clone())
            .unwrap_or_else(|| "idle".to_string()),
        has_session: report.has_active_session,
        authority_active: snapshot
            .map(|value| value.authority_active)
            .unwrap_or(false),
        session_id: snapshot.map(|value| value.session_id.clone()),
        generation: snapshot.map(|value| value.generation),
        started_unix_ms: snapshot.map(|value| value.started_unix_ms),
        active_age_ms: report.active_age_ms,
        capture_active: snapshot
            .map(|value| value.live_capture_stream_active)
            .unwrap_or(false),
        owner_id: snapshot.map(|value| value.owner_id.clone()),
        blocker: report.blocker,
        note: report.note,
        preflight,
        outbound: current_outbound_status(),
        incoming: current_incoming_status(),
        runtime_claim: "application_meeting_session_source_contract_not_windows_runtime_proof"
            .to_string(),
    }
}

fn preflight_for_report(report: &RuntimeSessionStateReport) -> MeetingSessionPreflightStatus {
    if let Some(snapshot) = report.snapshot.as_ref() {
        if snapshot.owner_id == APPLICATION_MEETING_OWNER_ID {
            if let Some(cached) = current_start_preflight(snapshot.generation) {
                return cached;
            }
        }
    }
    build_preflight()
}

fn current_status() -> MeetingSessionStatus {
    let report = latest_runtime_session_state();
    let preflight = preflight_for_report(&report);
    status_from_report(report, preflight)
}

fn blocked_result(state: &str, message: String) -> MeetingSessionActionResult {
    MeetingSessionActionResult {
        ok: false,
        state: state.to_string(),
        message,
        status: current_status(),
    }
}

fn recover_helper_after_meeting_stop_if_needed() -> Result<(), String> {
    let helper = get_helper_bridge_status();
    if helper.state != "stopped"
        || helper.last_error.as_deref() != Some("helper_bridge:meeting_session_hard_cancelled")
    {
        return Ok(());
    }

    // Only the intentional Meeting Stop hard-cancel state is auto-recovered here.
    // Missing runtime/model/provider failures and generic helper stops remain explicit
    // blockers rather than being hidden behind a broad retry loop.
    let recovery = start_helper_bridge();
    if recovery.ok {
        Ok(())
    } else {
        Err(recovery.message)
    }
}

fn worker_json(response: &HelperBridgeWorkerResponse) -> Value {
    serde_json::from_str::<Value>(&response.worker_response_json).unwrap_or_else(|_| json!({}))
}

fn worker_text(response: &HelperBridgeWorkerResponse, key: &str) -> Option<String> {
    let value = worker_json(response);
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn worker_blocker(response: &HelperBridgeWorkerResponse, fallback: &str) -> String {
    worker_text(response, "blocker").unwrap_or_else(|| fallback.to_string())
}

fn incoming_deferred_for_required_outbound(response: &HelperBridgeWorkerResponse) -> bool {
    worker_text(response, "blocker").as_deref()
        == Some("helper_scheduler:incoming_deferred_for_outbound")
}

fn generation_is_live(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")
        .unwrap_or(false)
}

fn generation_is_starting(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "starting")
        .unwrap_or(false)
}

fn incoming_session_is_eligible(session_id: &str) -> bool {
    let lane_enabled = incoming_status_store()
        .lock()
        .map(|status| {
            !(status.session_id.as_deref() == Some(session_id) && status.stage == "disabled")
        })
        .unwrap_or(false);
    if !lane_enabled {
        return false;
    }

    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| {
            snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
                && snapshot.session_id == session_id
                && snapshot.phase == "live"
        })
        .unwrap_or(false)
}

fn reset_self_output_suppression(session_id: &str) -> Arc<AtomicBool> {
    let active = Arc::new(AtomicBool::new(false));
    if let Ok(mut guard) = suppression_store().lock() {
        *guard = Some(MeetingSelfOutputSuppression {
            session_id: session_id.to_string(),
            active: Arc::clone(&active),
        });
    }
    active
}

fn suppression_handle_for_session(session_id: &str) -> Option<Arc<AtomicBool>> {
    suppression_store()
        .lock()
        .ok()
        .and_then(|guard| {
            guard
                .as_ref()
                .map(|value| (value.session_id.clone(), Arc::clone(&value.active)))
        })
        .filter(|(stored_session, _)| stored_session == session_id)
        .map(|(_, active)| active)
}

fn begin_self_output_suppression(session_id: &str) -> Option<SelfOutputSuppressionGuard> {
    let active = suppression_handle_for_session(session_id)?;
    reset_finalized_incoming_speech_boundary();
    active.store(true, Ordering::Release);
    update_incoming_status(
        session_id,
        "suppressed",
        false,
        "",
        "Incoming Meeting Sound is temporarily suppressed while TranslateIT's own English TTS is routed to the Meeting Microphone.",
    );
    Some(SelfOutputSuppressionGuard { active })
}

fn disable_optional_incoming_for_outbound(session_id: &str) -> String {
    clear_finalized_incoming_utterance_producer();
    let capture_stop = stop_meeting_sound_capture_runtime();
    update_incoming_status(
        session_id,
        "disabled",
        true,
        "meeting_incoming:self_output_suppression_unavailable",
        "Incoming Meeting Sound was disabled because TranslateIT could not establish self-output suppression. Required outbound translation continues through the Meeting Microphone.",
    );
    capture_stop.message
}

fn clear_self_output_suppression_for_session(session_id: &str) {
    if let Ok(mut guard) = suppression_store().lock() {
        if let Some(value) = guard.as_ref() {
            if value.session_id == session_id {
                value.active.store(false, Ordering::Release);
                *guard = None;
            }
        }
    }
    reset_finalized_incoming_speech_boundary();
}

fn tts_output_path(session_id: &str, generation: u64, event_sequence: u64) -> String {
    format!(
        "UserData/CacheData/meeting_tts/{}_g{}_s{}.wav",
        session_id, generation, event_sequence
    )
}

fn remove_temporary_tts(path: &str) {
    if !path.trim().is_empty() {
        let _ = fs::remove_file(path);
    }
}

fn stale_outbound_result(
    generation: u64,
    session_id: &str,
    event_sequence: u64,
    utterance_id: u64,
) -> MeetingOutboundProcessResult {
    let _ =
        update_committed_turn_delivery_state(session_id, generation, utterance_id, "interrupted");
    MeetingOutboundProcessResult {
        ok: false,
        delivered: false,
        state: "stale_generation".to_string(),
        blocker: "meeting_outbound:generation_not_authoritative".to_string(),
        note: "Outbound work was discarded because its Meeting generation no longer owns output authority."
            .to_string(),
        generation,
        utterance_sequence: event_sequence,
        runtime_claim: "meeting_outbound_generation_rejected_before_promotion".to_string(),
    }
}

pub fn process_authoritative_finalized_outbound_wav(
    generation: u64,
    session_id: &str,
    event_sequence: u64,
    utterance_id: u64,
    audio_path: String,
    mut timing: OutboundTimingContext,
) -> MeetingOutboundProcessResult {
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }

    update_outbound_status(
        generation,
        session_id,
        "transcribing",
        event_sequence,
        false,
        true,
        "",
        "Finalized Indonesian speech is being transcribed locally.",
    );
    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);
    let asr_started_at = Instant::now();
    let asr = send_helper_worker_task(
        "transcribe",
        json!({
            "audio_path": audio_path,
            "language": "id",
            "beam_size": 1,
            "vad_filter": true,
            "meeting_session_id": session_id,
            "meeting_lane": "you",
            "meeting_generation": generation,
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    timing.metrics.asr_ms = Some(elapsed_millis(asr_started_at, Instant::now()));
    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    let transcript = worker_text(&asr, "transcript_text");
    if !asr.ok || transcript.is_none() {
        let blocker = worker_blocker(&asr, "asr:empty_transcript");
        let empty = blocker.contains("empty_transcript");
        update_outbound_status(
            generation,
            session_id,
            if empty {
                "listening"
            } else {
                "attention_needed"
            },
            event_sequence,
            false,
            empty,
            if empty { "" } else { &blocker },
            if empty {
                "Finalized speech did not produce a stable transcript. No Meeting output was generated."
            } else {
                "Local ASR failed before translation. No Meeting output was generated."
            },
        );
        return MeetingOutboundProcessResult {
            ok: empty,
            delivered: false,
            state: if empty {
                "no_stable_transcript"
            } else {
                "asr_failed"
            }
            .to_string(),
            blocker: if empty { String::new() } else { blocker },
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_finalized_segment_not_delivered".to_string(),
        };
    }
    let transcript = transcript.unwrap_or_default();

    update_outbound_status(
        generation,
        session_id,
        "translating",
        event_sequence,
        false,
        true,
        "",
        "Final Indonesian transcript is being translated to English.",
    );
    let translation_started_at = Instant::now();
    let translation = send_helper_worker_task(
        "translate",
        json!({
            "text": transcript.clone(),
            "source_language": "id",
            "target_language": "en",
            "max_new_tokens": 96,
            "meeting_session_id": session_id,
            "meeting_lane": "you",
            "meeting_generation": generation,
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    timing.metrics.translation_ms = Some(elapsed_millis(translation_started_at, Instant::now()));
    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    let translated_text = worker_text(&translation, "translated_text");
    if !translation.ok || translated_text.is_none() {
        let blocker = worker_blocker(&translation, "translation:empty_output");
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            event_sequence,
            false,
            false,
            &blocker,
            "Local translation failed before TTS. No Meeting output was generated.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "translation_failed".to_string(),
            blocker,
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_translation_failed_before_output".to_string(),
        };
    }
    let translated_text = translated_text.unwrap_or_default();

    let _ = commit_meeting_turn(
        session_id,
        event_sequence,
        Some(generation),
        utterance_id,
        "you",
        &transcript,
        &translated_text,
        Some("preparing_voice"),
        Some(timing.metrics.clone()),
    );

    update_outbound_status(
        generation,
        session_id,
        "synthesizing",
        event_sequence,
        false,
        true,
        "",
        "Translated English text is being synthesized locally.",
    );
    let Some(actor_token) = required_outbound_voice_actor_token(generation) else {
        let blocker = "voice_actor:meeting_actor_authority_missing".to_string();
        let _ = update_committed_turn_delivery_state(
            session_id,
            generation,
            utterance_id,
            "output_failed",
        );
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            event_sequence,
            false,
            false,
            &blocker,
            "My Voice authority is no longer bound to this Meeting generation. Stop and start Translation again before producing more voice output.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "tts_failed".to_string(),
            blocker,
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_voice_actor_authority_missing".to_string(),
        };
    };
    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);
    let tts_started_at = Instant::now();
    let tts = send_helper_worker_task(
        "voice_actor_synthesize",
        json!({
            "text": translated_text.clone(),
            "output_path": requested_tts_path,
            "expected_actor_token": actor_token,
            "meeting_session_id": session_id,
            "meeting_lane": "you",
            "meeting_generation": generation,
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    timing.metrics.tts_ms = Some(elapsed_millis(tts_started_at, Instant::now()));
    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);
    let _ = update_committed_turn_outbound_timing(
        session_id,
        generation,
        utterance_id,
        &timing.metrics,
    );
    let tts_path = worker_text(&tts, "output_path").unwrap_or_default();
    if !generation_is_live(generation) {
        remove_temporary_tts(&tts_path);
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    if !tts.ok || tts_path.is_empty() {
        let blocker = worker_blocker(&tts, "voice_actor:missing_output");
        remove_temporary_tts(&tts_path);
        let _ = update_committed_turn_delivery_state(
            session_id,
            generation,
            utterance_id,
            "output_failed",
        );
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            event_sequence,
            false,
            false,
            &blocker,
            "My Voice synthesis failed before Meeting delivery. No Meeting output was generated.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "tts_failed".to_string(),
            blocker,
            note: "No Meeting output was generated from this finalized segment.".to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_tts_failed_before_output".to_string(),
        };
    }

    let delivery_started_at = Instant::now();
    let suppression_guard = match begin_self_output_suppression(session_id) {
        Some(guard) => Some(guard),
        None => {
            let incoming_cleanup = disable_optional_incoming_for_outbound(session_id);
            update_outbound_status(
                generation,
                session_id,
                "delivering",
                event_sequence,
                false,
                true,
                "",
                &format!(
                    "Optional incoming protection became unavailable and incoming was disabled before required outbound delivery. {incoming_cleanup}"
                ),
            );
            None
        }
    };

    let _ = update_committed_turn_delivery_state(session_id, generation, utterance_id, "speaking");
    update_outbound_status(
        generation,
        session_id,
        "delivering",
        event_sequence,
        true,
        true,
        "",
        "Translated voice is being delivered through TranslateIT Meeting Microphone.",
    );
    let bound_output_device = get_bound_virtual_mic_output_device(generation);
    let bound_route_blocker = bound_output_device.as_ref().err().cloned();
    let route =
        deliver_meeting_output_wav(&tts_path, bound_output_device.as_deref().ok(), generation);
    record_first_playback_timing(
        &mut timing,
        delivery_started_at,
        route.first_playback_at,
        route.first_playback_unix_ms,
    );
    set_outbound_timing(generation, session_id, event_sequence, &timing.metrics);
    let _ = update_committed_turn_outbound_timing(
        session_id,
        generation,
        utterance_id,
        &timing.metrics,
    );
    drop(suppression_guard);
    if incoming_session_is_eligible(session_id) && meeting_sound_capture_status().stream_active {
        update_incoming_status(
            session_id,
            "listening",
            false,
            "",
            "Incoming Meeting Sound resumed from a fresh speech boundary after TranslateIT TTS playback ended.",
        );
    }
    remove_temporary_tts(&tts_path);
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    if !route.ok || !route.execution_attempted {
        let blocker = bound_route_blocker.unwrap_or_else(|| {
            if route.blocker.is_empty() {
                "meeting_outbound:meeting_route_delivery_failed".to_string()
            } else {
                route.blocker
            }
        });
        let _ = update_committed_turn_delivery_state(
            session_id,
            generation,
            utterance_id,
            "output_failed",
        );
        update_outbound_status(
            generation,
            session_id,
            "attention_needed",
            event_sequence,
            false,
            false,
            &blocker,
            "Translated voice could not be safely delivered to the Meeting microphone route.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "delivery_failed".to_string(),
            blocker,
            note: "Meeting output was not accepted as complete.".to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_delivery_failed_or_unproved".to_string(),
        };
    }

    let _ = update_committed_turn_delivery_state(
        session_id,
        generation,
        utterance_id,
        "output_complete",
    );
    update_outbound_status(
        generation,
        session_id,
        "listening",
        event_sequence,
        false,
        true,
        "",
        "Translated voice output completed for the authoritative Meeting generation.",
    );
    MeetingOutboundProcessResult {
        ok: true,
        delivered: true,
        state: "output_complete".to_string(),
        blocker: String::new(),
        note: "Generation-aware outbound stages completed. Windows delivery remains local proof."
            .to_string(),
        generation,
        utterance_sequence: event_sequence,
        runtime_claim:
            "meeting_outbound_output_execution_attempted_needs_windows_runtime_validation"
                .to_string(),
    }
}

fn process_authoritative_finalized_incoming_wav(
    session_id: &str,
    event_sequence: u64,
    utterance_id: u64,
    audio_path: String,
) {
    if !incoming_session_is_eligible(session_id) {
        return;
    }
    update_incoming_status(
        session_id,
        "transcribing",
        false,
        "",
        "Finalized English Meeting Sound is being transcribed locally.",
    );
    let asr = send_helper_worker_task(
        "transcribe",
        json!({
            "audio_path": audio_path,
            "language": "en",
            "beam_size": 1,
            "vad_filter": true,
            "meeting_session_id": session_id,
            "meeting_lane": "incoming",
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    if !incoming_session_is_eligible(session_id) {
        return;
    }
    if incoming_deferred_for_required_outbound(&asr) {
        update_incoming_status(
            session_id,
            "listening",
            false,
            "",
            "Older optional incoming speech yielded before ASR because required outbound translation took priority. The event was discarded and incoming is listening for fresh Meeting Sound.",
        );
        return;
    }
    let transcript = worker_text(&asr, "transcript_text");
    if !asr.ok || transcript.is_none() {
        let blocker = worker_blocker(&asr, "asr:empty_transcript");
        let empty = blocker.contains("empty_transcript");
        update_incoming_status(
            session_id,
            "listening",
            !empty,
            if empty { "" } else { &blocker },
            if empty {
                "Finalized Meeting Sound did not produce stable English speech. Incoming remains listening."
            } else {
                "Incoming English ASR failed for the latest finalized Meeting Sound event. Outbound remains available."
            },
        );
        return;
    }
    let transcript = transcript.unwrap_or_default();

    update_incoming_status(
        session_id,
        "translating",
        false,
        "",
        "Final English Meeting Sound transcript is being translated to Indonesian.",
    );
    let translation = send_helper_worker_task(
        "translate",
        json!({
            "text": transcript.clone(),
            "source_language": "en",
            "target_language": "id",
            "max_new_tokens": 96,
            "meeting_session_id": session_id,
            "meeting_lane": "incoming",
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    if !incoming_session_is_eligible(session_id) {
        return;
    }
    if incoming_deferred_for_required_outbound(&translation) {
        update_incoming_status(
            session_id,
            "listening",
            false,
            "",
            "Older optional incoming speech yielded before translation because required outbound work took priority. The transcript was discarded and incoming is listening for fresh Meeting Sound.",
        );
        return;
    }
    let translated_text = worker_text(&translation, "translated_text");
    if !translation.ok || translated_text.is_none() {
        let blocker = worker_blocker(&translation, "translation:empty_output");
        update_incoming_status(
            session_id,
            "degraded",
            true,
            &blocker,
            "Incoming English -> Indonesian translation failed for the latest event. Outbound Meeting translation remains unaffected.",
        );
        return;
    }

    let translated_text = translated_text.unwrap_or_default();
    let committed = commit_meeting_turn(
        session_id,
        event_sequence,
        None,
        utterance_id,
        "incoming",
        &transcript,
        &translated_text,
        None,
        None,
    );
    update_incoming_status(
        session_id,
        if committed { "listening" } else { "degraded" },
        !committed,
        if committed {
            ""
        } else {
            "meeting_incoming:commit_rejected"
        },
        if committed {
            "Incoming Indonesian translation was committed in finalized speech/event order. Listening for current Meeting Sound."
        } else {
            "Incoming translation finished but could not be committed to the canonical Meeting conversation store."
        },
    );
}

fn start_meeting_outbound_consumer(generation: u64, session_id: &str) -> Result<(), String> {
    let store = outbound_consumer_store();
    let mut guard = store
        .lock()
        .map_err(|_| "meeting_outbound:consumer_state_lock_failed".to_string())?;
    if guard.is_some() {
        return Err("meeting_outbound:consumer_already_active".to_string());
    }

    let thread_session_id = session_id.to_string();
    let thread_session_for_runtime = thread_session_id.clone();
    let handle = thread::Builder::new()
        .name("translateit-meeting-outbound".to_string())
        .spawn(move || {
            while let Some(utterance) = wait_take_finalized_outbound_utterance(generation) {
                let queue_ms = elapsed_millis(utterance.enqueued_at, Instant::now());
                if utterance.generation != Some(generation)
                    || utterance.lane != "you"
                    || utterance.session_id != thread_session_id
                    || !generation_is_live(generation)
                {
                    continue;
                }

                let audio_prepare_started_at = Instant::now();
                let write = write_finalized_outbound_utterance_wav(&utterance);
                let audio_prepare_ms = elapsed_millis(audio_prepare_started_at, Instant::now());
                let timing = timing_context_from_utterance(&utterance, queue_ms, audio_prepare_ms);
                if !write.ok {
                    update_outbound_status(
                        generation,
                        &thread_session_id,
                        "attention_needed",
                        utterance.sequence,
                        false,
                        false,
                        &write.blocker,
                        "Finalized speech could not be written to its temporary ASR WAV. No AI/output stage consumed it.",
                    );
                    set_outbound_timing(
                        generation,
                        &thread_session_id,
                        utterance.sequence,
                        &timing.metrics,
                    );
                    continue;
                }

                let Some(audio_path) = write.audio_path else {
                    update_outbound_status(
                        generation,
                        &thread_session_id,
                        "attention_needed",
                        utterance.sequence,
                        false,
                        false,
                        "meeting_outbound:finalized_audio_path_missing",
                        "Finalized speech writer returned no temporary audio path. No AI/output stage consumed it.",
                    );
                    set_outbound_timing(
                        generation,
                        &thread_session_id,
                        utterance.sequence,
                        &timing.metrics,
                    );
                    continue;
                };

                if !generation_is_live(generation) {
                    remove_finalized_meeting_utterance_wav(&audio_path);
                    break;
                }

                let _ = process_authoritative_finalized_outbound_wav(
                    generation,
                    &utterance.session_id,
                    utterance.sequence,
                    utterance.utterance_id,
                    audio_path.clone(),
                    timing,
                );
                remove_finalized_meeting_utterance_wav(&audio_path);

                if !runtime_generation_is_authoritative(generation) {
                    break;
                }
            }
        })
        .map_err(|error| format!("meeting_outbound:consumer_spawn_failed:{error}"))?;

    *guard = Some(MeetingOutboundConsumerRuntime {
        generation,
        session_id: thread_session_for_runtime,
        thread: Some(handle),
    });
    Ok(())
}

fn stop_meeting_outbound_consumer(generation: u64) -> MeetingConsumerCleanupResult {
    clear_finalized_outbound_utterance_producer();

    let store = outbound_consumer_store();
    let runtime = match store.lock() {
        Ok(mut guard) => {
            if guard
                .as_ref()
                .map(|value| value.generation == generation)
                .unwrap_or(false)
            {
                guard.take()
            } else {
                None
            }
        }
        Err(_) => {
            return MeetingConsumerCleanupResult {
                ok: false,
                message: "Meeting outbound consumer state lock failed during cleanup.".to_string(),
            };
        }
    };

    let Some(mut runtime) = runtime else {
        return MeetingConsumerCleanupResult {
            ok: true,
            message: "No matching Meeting outbound consumer required cleanup.".to_string(),
        };
    };
    let session_id = runtime.session_id.clone();
    let joined = runtime
        .thread
        .take()
        .map(|handle| handle.join().is_ok())
        .unwrap_or(true);
    MeetingConsumerCleanupResult {
        ok: joined,
        message: if joined {
            format!("Meeting outbound consumer stopped for {session_id} generation {generation}.")
        } else {
            format!("Meeting outbound consumer for {session_id} generation {generation} exited unexpectedly during cleanup.")
        },
    }
}

fn start_meeting_incoming_consumer(session_id: &str) -> Result<(), String> {
    let store = incoming_consumer_store();
    let mut guard = store
        .lock()
        .map_err(|_| "meeting_incoming:consumer_state_lock_failed".to_string())?;
    if guard.is_some() {
        return Err("meeting_incoming:consumer_already_active".to_string());
    }

    let thread_session_id = session_id.to_string();
    let runtime_session_id = thread_session_id.clone();
    let handle = thread::Builder::new()
        .name("translateit-meeting-incoming".to_string())
        .spawn(move || {
            while let Some(utterance) = wait_take_finalized_incoming_utterance(&thread_session_id) {
                if utterance.session_id != thread_session_id
                    || utterance.lane != "incoming"
                    || utterance.generation.is_some()
                    || !incoming_session_is_eligible(&thread_session_id)
                {
                    continue;
                }

                let write = write_finalized_incoming_utterance_wav(&utterance);
                if !write.ok {
                    update_incoming_status(
                        &thread_session_id,
                        "degraded",
                        true,
                        &write.blocker,
                        "Finalized incoming speech could not be written to its temporary ASR WAV. Outbound remains available.",
                    );
                    continue;
                }
                let Some(audio_path) = write.audio_path else {
                    update_incoming_status(
                        &thread_session_id,
                        "degraded",
                        true,
                        "meeting_incoming:finalized_audio_path_missing",
                        "Finalized incoming speech writer returned no temporary audio path.",
                    );
                    continue;
                };

                if !incoming_session_is_eligible(&thread_session_id) {
                    remove_finalized_meeting_utterance_wav(&audio_path);
                    break;
                }
                process_authoritative_finalized_incoming_wav(
                    &thread_session_id,
                    utterance.sequence,
                    utterance.utterance_id,
                    audio_path.clone(),
                );
                remove_finalized_meeting_utterance_wav(&audio_path);
            }
        })
        .map_err(|error| format!("meeting_incoming:consumer_spawn_failed:{error}"))?;

    *guard = Some(MeetingIncomingConsumerRuntime {
        session_id: runtime_session_id,
        thread: Some(handle),
    });
    Ok(())
}

fn stop_meeting_incoming_consumer(session_id: &str) -> MeetingConsumerCleanupResult {
    clear_finalized_incoming_utterance_producer();
    let store = incoming_consumer_store();
    let runtime = match store.lock() {
        Ok(mut guard) => {
            if guard
                .as_ref()
                .map(|value| value.session_id == session_id)
                .unwrap_or(false)
            {
                guard.take()
            } else {
                None
            }
        }
        Err(_) => {
            return MeetingConsumerCleanupResult {
                ok: false,
                message: "Meeting incoming consumer state lock failed during cleanup.".to_string(),
            };
        }
    };

    let Some(mut runtime) = runtime else {
        return MeetingConsumerCleanupResult {
            ok: true,
            message: "No matching Meeting incoming consumer required cleanup.".to_string(),
        };
    };
    let joined = runtime
        .thread
        .take()
        .map(|handle| handle.join().is_ok())
        .unwrap_or(true);
    MeetingConsumerCleanupResult {
        ok: joined,
        message: if joined {
            format!("Meeting incoming consumer stopped for session {session_id}.")
        } else {
            format!("Meeting incoming consumer for session {session_id} exited unexpectedly during cleanup.")
        },
    }
}

fn start_optional_incoming_lane(session_id: &str) -> String {
    if !incoming_session_is_eligible(session_id) {
        return "Incoming activation skipped because the Meeting is no longer Live.".to_string();
    }

    let Some(suppression) = suppression_handle_for_session(session_id) else {
        update_incoming_status(
            session_id,
            "degraded",
            true,
            "meeting_incoming:suppression_state_unavailable",
            "Incoming Meeting Sound was not started because self-output suppression state was unavailable. Outbound remains Live.",
        );
        return "Incoming unavailable: suppression state could not be established.".to_string();
    };

    let capture = start_meeting_sound_capture_runtime(session_id, suppression);
    if !incoming_session_is_eligible(session_id) {
        if capture.ok {
            let _ = stop_meeting_sound_capture_runtime();
        }
        return "Incoming activation ended because the Meeting stopped while optional capture was opening."
            .to_string();
    }
    if !capture.ok {
        update_incoming_status(
            session_id,
            "degraded",
            true,
            if capture.status.blocker.is_empty() {
                "meeting_incoming:capture_unavailable"
            } else {
                &capture.status.blocker
            },
            &capture.message,
        );
        return format!("Incoming degraded: {}", capture.message);
    }

    if let Err(error) = start_meeting_incoming_consumer(session_id) {
        let _ = stop_meeting_sound_capture_runtime();
        update_incoming_status(
            session_id,
            "degraded",
            true,
            &error,
            "Meeting Sound capture opened, but the incoming consumer could not start. Outbound remains Live.",
        );
        return format!("Incoming degraded: {error}");
    }

    if !incoming_session_is_eligible(session_id) {
        let _ = stop_meeting_incoming_consumer(session_id);
        let _ = stop_meeting_sound_capture_runtime();
        return "Incoming activation ended because the Meeting stopped before optional capture became active."
            .to_string();
    }

    update_incoming_status(
        session_id,
        "listening",
        false,
        "",
        "Incoming Meeting Sound is listening for finalized English speech while this Meeting is Live.",
    );
    "Incoming Meeting Sound lane started.".to_string()
}

fn schedule_optional_incoming_lane(session_id: &str) -> String {
    update_incoming_status(
        session_id,
        "starting",
        false,
        "",
        "Required outbound translation is Live. Optional incoming Meeting Sound is starting independently.",
    );
    let thread_session_id = session_id.to_string();
    match thread::Builder::new()
        .name("translateit-meeting-incoming-start".to_string())
        .spawn(move || {
            let _ = start_optional_incoming_lane(&thread_session_id);
        }) {
        Ok(_) => "Optional incoming Meeting Sound is starting independently.".to_string(),
        Err(error) => {
            update_incoming_status(
                session_id,
                "degraded",
                true,
                "meeting_incoming:activation_spawn_failed",
                "Optional incoming Meeting Sound could not start its activation task. Required outbound remains Live.",
            );
            format!("Incoming degraded: activation task could not start: {error}")
        }
    }
}

#[tauri::command]
pub fn get_meeting_session_status() -> MeetingSessionStatus {
    current_status()
}

#[tauri::command]
pub fn get_meeting_committed_turns() -> MeetingCommittedTurnsSnapshot {
    current_committed_turn_snapshot()
}

pub fn start_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    if current.has_active_session && current.snapshot.is_none() {
        return MeetingSessionActionResult {
            ok: false,
            state: "runtime_state_unavailable".to_string(),
            message: "Start Translation cannot verify current runtime ownership. No new Meeting resources were opened."
                .to_string(),
            status: status_from_report(current, build_preflight()),
        };
    }
    if let Some(snapshot) = current.snapshot.as_ref() {
        if snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
            && snapshot.authority_active
            && snapshot.phase == "live"
        {
            return MeetingSessionActionResult {
                ok: true,
                state: "already_live".to_string(),
                message: "Translation is already live. Duplicate Start did not create another Meeting session."
                    .to_string(),
                status: status_from_report(current, build_preflight()),
            };
        }
        return blocked_result(
            "active_session_conflict",
            "Another runtime session already owns Meeting resources. Stop it before starting a new Translation session."
                .to_string(),
        );
    }

    clear_all_start_preflight();
    clear_prepared_meeting_output_device();

    if let Err(message) = recover_helper_after_meeting_stop_if_needed() {
        return blocked_result(
            "helper_recovery_failed",
            format!(
                "Start Translation couldn't restore the local translation runtime after the previous Meeting Stop: {message}"
            ),
        );
    }

    // Refresh cheap worker capability truth once for this explicit Start. This
    // catches a newly approved/rebuilt My Voice without turning routine UI polling
    // into worker I/O or model loading. Functional MyVoice proof still occurs only
    // after the Meeting generation owns Starting authority.
    let _ = send_helper_worker_task("status", json!({ "meeting_start_prepare": true }));
    let preflight = build_preflight();
    if !preflight.start_eligible {
        return MeetingSessionActionResult {
            ok: false,
            state: "blocked".to_string(),
            message: preflight.summary.clone(),
            status: status_from_report(latest_runtime_session_state(), preflight),
        };
    }

    // Route discovery chooses one exact matched virtual-cable pair. Before Meeting
    // authority exists, retain the exact playback-side CPAL endpoint and verify its
    // native configuration. C5 performs the real silent callback probe transactionally
    // after the Starting authority and microphone resource exist, but before Live.
    let prepared_route = get_virtual_mic_route_selection();
    let Some(output_device) = prepared_route.selected_output_device.as_deref() else {
        return blocked_result(
            "meeting_output_prepare_failed",
            "Start Translation couldn't resolve the prepared Meeting virtual output endpoint."
                .to_string(),
        );
    };
    if let Err(blocker) = prepare_meeting_output_device(output_device) {
        return blocked_result(
            "meeting_output_prepare_failed",
            format!(
                "Start Translation couldn't prepare TranslateIT Meeting Microphone. Check Setup or Diagnostics and try again. Native output detail: {blocker}"
            ),
        );
    }

    let starting = begin_application_meeting_session();
    if !starting.blocker.is_empty() {
        return MeetingSessionActionResult {
            ok: false,
            state: "start_authority_conflict".to_string(),
            message: "Start Translation lost the runtime authority claim to another current owner. No Meeting resources were opened by this request."
                .to_string(),
            status: status_from_report(starting, build_preflight()),
        };
    }
    let Some(start_snapshot) = starting.snapshot.as_ref() else {
        return blocked_result(
            "start_authority_failed",
            "Start Translation could not establish application-level Meeting authority. No Meeting resources were opened."
                .to_string(),
        );
    };
    if start_snapshot.owner_id != APPLICATION_MEETING_OWNER_ID || !start_snapshot.authority_active {
        return blocked_result(
            "start_authority_conflict",
            "Start Translation did not receive the expected Meeting session authority. No additional resources were opened."
                .to_string(),
        );
    }

    let generation = start_snapshot.generation;
    let session_id = start_snapshot.session_id.clone();
    reset_committed_turns(&session_id);
    reset_finalized_meeting_sequence(&session_id);
    let _ = reset_self_output_suppression(&session_id);
    clear_incoming_status();

    let capture = start_live_capture_runtime(starting.clone());
    if !capture.ok {
        let _ = revoke_runtime_session_authority(
            generation,
            "Start Translation failed while opening the required microphone resource. Authority was revoked before rollback.",
        );
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back safely because the microphone resource could not be opened: {}",
                capture.message
            ),
        );
    }

    // A6 proves the real required AI path only after this generation owns Starting
    // authority and the microphone stream is open. Every worker request is tied to
    // this Meeting generation; My Voice is warm-loaded and a real English synthesis
    // fixture must complete before native output or the outbound consumer can activate.
    if let Err(stage) = prepare_required_outbound_ai_runtime(generation) {
        let _ = revoke_runtime_session_authority(
            generation,
            "Required outbound AI/My Voice verification failed during Starting. Authority was revoked before rollback.",
        );
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back before Live because {stage} could not be functionally verified for the authoritative Meeting generation."
            ),
        );
    }
    if !generation_is_starting(generation) {
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            "Start Translation lost Starting authority while verifying the required local AI/My Voice path. No Meeting output was activated.".to_string(),
        );
    }

    let ai_preflight = build_preflight();
    if !ai_preflight.ready_for_start || required_outbound_voice_actor_token(generation).is_none() {
        let _ = revoke_runtime_session_authority(
            generation,
            "Meeting prerequisites changed after required AI/My Voice verification. Authority was revoked before rollback.",
        );
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return MeetingSessionActionResult {
            ok: false,
            state: "rolled_back".to_string(),
            message: "Start Translation verified My Voice, but another required Meeting prerequisite changed before native output activation. All opened resources were rolled back.".to_string(),
            status: status_from_report(latest_runtime_session_state(), ai_preflight),
        };
    }

    // Required native output execution must be proven while this generation owns
    // Starting authority. This writes silence only and requires the exact prepared
    // endpoint to build/start a CPAL stream and invoke its callback inside a bounded
    // wait. Meeting-app reception remains target-Windows evidence.
    if let Err(blocker) =
        probe_prepared_meeting_output_device_functionally(output_device, generation)
    {
        let _ = revoke_runtime_session_authority(
            generation,
            "Meeting output functional verification failed during Starting. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_output_for_generation(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back because TranslateIT Meeting Microphone could not open a functional native output callback before Live: {blocker}"
            ),
        );
    }

    // The serialized required outbound consumer is a Live dependency, not a post-Live
    // best effort. Create it while the session is still Starting so a thread-spawn
    // failure can roll back without ever exposing a transient Live state.
    if let Err(error) = start_meeting_outbound_consumer(generation, &session_id) {
        let _ = revoke_runtime_session_authority(
            generation,
            "Meeting outbound consumer could not start during Starting. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_output_for_generation(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);
        let consumer_cleanup = stop_meeting_outbound_consumer(generation);
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back before Live because the serialized outbound consumer could not start: {error}. Helper cleanup: {} Consumer cleanup: {}",
                helper_cancel.message, consumer_cleanup.message
            ),
        );
    }

    // Re-check the full required preflight after the native output callback and
    // serialized consumer both exist. A helper exit, actor invalidation, or other
    // required prerequisite loss in the activation window must roll back rather than
    // expose a transient Live state.
    let prepared_preflight = build_preflight();
    if !prepared_preflight.ready_for_start || required_outbound_voice_actor_token(generation).is_none() {
        let _ = revoke_runtime_session_authority(
            generation,
            "Final pre-Live My Voice readiness changed after required resources opened. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_output_for_generation(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);
        let consumer_cleanup = stop_meeting_outbound_consumer(generation);
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation rolled back before Live because final My Voice readiness changed after native resources opened. Helper cleanup: {} Consumer cleanup: {}",
                helper_cancel.message, consumer_cleanup.message
            ),
        );
    }
    remember_start_preflight(generation, prepared_preflight.clone());

    let committed = commit_application_meeting_session_live(
        generation,
        true,
        "Required microphone, generation-bound ASR/translation/My Voice functional proof, native Meeting output callback, and serialized outbound consumer were ready before the authoritative generation committed Live.",
    );
    if !committed.blocker.is_empty() {
        let _ = revoke_runtime_session_authority(
            generation,
            "Meeting Live commit failed after all required pre-Live resources opened. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_output_for_generation(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let consumer_cleanup = stop_meeting_outbound_consumer(generation);
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        clear_start_preflight_for_generation(generation);
        clear_prepared_meeting_output_device();
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation could not commit the Meeting generation Live, so all opened Meeting resources were rolled back. Outbound consumer cleanup: {}",
                consumer_cleanup.message
            ),
        );
    }

    update_outbound_status(
        generation,
        &session_id,
        "listening",
        0,
        false,
        true,
        "",
        "Translation Live is listening. Rolling audio remains preview-only; finalized utterances receive shared Meeting event sequence before AI.",
    );
    let incoming_message = schedule_optional_incoming_lane(&session_id);
    MeetingSessionActionResult {
        ok: true,
        state: "live".to_string(),
        message: format!(
            "Translation Live committed with authoritative My Voice outbound capture/consumer. {incoming_message}"
        ),
        status: status_from_report(committed, prepared_preflight),
    }
}

#[tauri::command]
pub fn stop_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    if current.has_active_session && current.snapshot.is_none() {
        return MeetingSessionActionResult {
            ok: false,
            state: "runtime_state_unavailable".to_string(),
            message: "Stop Translation cannot verify current runtime ownership. The app will remain open and no cleanup success is claimed."
                .to_string(),
            status: status_from_report(current, build_preflight()),
        };
    }

    if let Some(snapshot) = current.snapshot.as_ref() {
        if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {
            return MeetingSessionActionResult {
                ok: false,
                state: "active_session_conflict".to_string(),
                message: "Stop Translation cannot control Mic Test or another non-Meeting runtime owner. Stop that operation from its own control first."
                    .to_string(),
                status: status_from_report(current, build_preflight()),
            };
        }
    }

    let Some(snapshot) = current.snapshot.as_ref() else {
        clear_all_start_preflight();
        clear_prepared_meeting_output_device();
        let incoming_capture_stop = stop_meeting_sound_capture_runtime();
        clear_finalized_incoming_utterance_producer();
        clear_finalized_meeting_sequence();
        clear_all_committed_turns();
        clear_outbound_status();
        clear_incoming_status();
        if !incoming_capture_stop.ok {
            return MeetingSessionActionResult {
                ok: false,
                state: "cleanup_incomplete".to_string(),
                message: format!(
                    "Translation has no active session, but optional Meeting Sound cleanup could not be confirmed: {}",
                    incoming_capture_stop.message
                ),
                status: status_from_report(current, build_preflight()),
            };
        }
        return MeetingSessionActionResult {
            ok: true,
            state: "already_stopped".to_string(),
            message: "Translation is already stopped. Stop remains idempotent and optional incoming audio state was cleared."
                .to_string(),
            status: status_from_report(current, build_preflight()),
        };
    };

    let generation = snapshot.generation;
    let session_id = snapshot.session_id.clone();

    let revoked = revoke_runtime_session_authority(
        generation,
        "Stop Translation accepted. Old outbound Meeting generation authority was revoked before full-session cleanup.",
    );
    if revoked.snapshot.is_none()
        || revoked
            .snapshot
            .as_ref()
            .map(|value| value.authority_active)
            .unwrap_or(true)
    {
        return blocked_result(
            "stop_authority_failed",
            "Stop Translation could not revoke Meeting generation authority, so cleanup was not allowed to proceed under an ambiguous owner."
                .to_string(),
        );
    }

    interrupt_committed_turns_for_generation(&session_id, generation);
    let _ = cancel_meeting_output_for_generation(generation);
    clear_prepared_meeting_output_device();
    let capture_stop = stop_live_capture_runtime();
    let incoming_capture_stop = stop_meeting_sound_capture_runtime();
    let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);
    let outbound_cleanup = stop_meeting_outbound_consumer(generation);
    let incoming_cleanup = stop_meeting_incoming_consumer(&session_id);

    clear_self_output_suppression_for_session(&session_id);
    clear_finalized_meeting_sequence();
    clear_committed_turns_for_session(&session_id);
    clear_outbound_status();

    let cleanup_complete = meeting_cleanup_complete(
        capture_stop.ok,
        incoming_capture_stop.ok,
        helper_cancel.ok,
        outbound_cleanup.ok,
        incoming_cleanup.ok,
    );

    if !cleanup_complete {
        let mut failed = Vec::new();
        if !capture_stop.ok {
            failed.push("microphone capture");
        }
        if !incoming_capture_stop.ok {
            failed.push("Meeting Sound capture");
        }
        if !helper_cancel.ok {
            failed.push("local helper work");
        }
        if !outbound_cleanup.ok {
            failed.push("outbound consumer");
        }
        if !incoming_cleanup.ok {
            failed.push("incoming consumer");
        }
        let failed_summary = failed.join(", ");
        mark_incoming_cleanup_incomplete_status(
            &session_id,
            !incoming_capture_stop.ok,
            "Meeting output authority is revoked, but one or more cleanup steps still need attention.",
        );
        let retained = mark_runtime_session_cleanup_incomplete(
            generation,
            !capture_stop.ok,
            &format!(
                "Meeting output authority is revoked, but cleanup is incomplete for: {failed_summary}. Retry Stop Translation."
            ),
        );
        return MeetingSessionActionResult {
            ok: false,
            state: "cleanup_incomplete".to_string(),
            message: format!(
                "Translation output is stopped, but cleanup is incomplete for {failed_summary}. Retry Stop Translation. Microphone: {} Meeting Sound: {} Helper: {} Outbound: {} Incoming: {}",
                capture_stop.message,
                incoming_capture_stop.message,
                helper_cancel.message,
                outbound_cleanup.message,
                incoming_cleanup.message,
            ),
            status: status_from_report(retained, build_preflight()),
        };
    }

    clear_incoming_status();
    let cleared = clear_runtime_session_if_generation(generation);
    if cleared.has_active_session
        || cleared.snapshot.is_some()
        || cleared.blocker != "runtime_session:cleared"
    {
        return MeetingSessionActionResult {
            ok: false,
            state: "cleanup_incomplete".to_string(),
            message: "All known Meeting resources stopped, but TranslateIT could not confirm that runtime ownership was cleared. The app will remain open."
                .to_string(),
            status: status_from_report(cleared, build_preflight()),
        };
    }

    clear_start_preflight_for_generation(generation);

    MeetingSessionActionResult {
        ok: true,
        state: "stopped".to_string(),
        message: format!(
            "Translation stopped. Authority was revoked before both audio lanes/helper/consumers and transient transcript/session state were cleaned. Microphone: {} Meeting Sound: {} Helper: {} Outbound: {} Incoming: {}",
            capture_stop.message,
            incoming_capture_stop.message,
            helper_cancel.message,
            outbound_cleanup.message,
            incoming_cleanup.message,
        ),
        status: status_from_report(cleared, build_preflight()),
    }
}

fn meeting_cleanup_complete(
    microphone_capture_ok: bool,
    meeting_sound_capture_ok: bool,
    helper_cleanup_ok: bool,
    outbound_consumer_ok: bool,
    incoming_consumer_ok: bool,
) -> bool {
    microphone_capture_ok
        && meeting_sound_capture_ok
        && helper_cleanup_ok
        && outbound_consumer_ok
        && incoming_consumer_ok
}

#[cfg(test)]
mod b3_preflight_snapshot_tests {
    use super::{
        clear_all_start_preflight, current_start_preflight, remember_start_preflight,
        MeetingSessionPreflightStatus,
    };

    fn ready_preflight() -> MeetingSessionPreflightStatus {
        MeetingSessionPreflightStatus {
            ready_for_start: true,
            start_eligible: true,
            functional_outbound_ready: true,
            functional_outbound_verified_unix_ms: Some(1),
            microphone_ready: true,
            models_ready: true,
            helper_ready: true,
            provider_ready: true,
            meeting_route_ready: true,
            generation_aware_outbound_stages_ready: true,
            finalized_utterance_source_connected: true,
            outbound_runtime_connected: true,
            blockers: Vec::new(),
            summary: "ready".to_string(),
            runtime_claim: "b3_test".to_string(),
        }
    }

    #[test]
    fn start_preflight_snapshot_is_generation_bound() {
        clear_all_start_preflight();
        remember_start_preflight(41, ready_preflight());

        assert!(current_start_preflight(41).is_some());
        assert!(current_start_preflight(42).is_none());

        clear_all_start_preflight();
    }
}

#[cfg(test)]
mod c2_latency_tests {
    use super::{record_first_playback_timing, MeetingOutboundTiming, OutboundTimingContext};
    use std::time::{Duration, Instant};

    #[test]
    fn official_latency_runs_from_finalized_detection_to_first_playback() {
        let finalized_at = Instant::now();
        let delivery_started_at = finalized_at + Duration::from_millis(1_200);
        let first_playback_at = finalized_at + Duration::from_millis(1_275);
        let mut timing = OutboundTimingContext {
            finalized_at,
            metrics: MeetingOutboundTiming {
                finalized_unix_ms: 50_000,
                first_playback_unix_ms: None,
                speech_boundary_ms: 140,
                finalization_ms: 3,
                queue_ms: 12,
                audio_prepare_ms: 5,
                asr_ms: Some(900),
                translation_ms: Some(120),
                tts_ms: Some(160),
                delivery_ms: None,
                outbound_latency_ms: None,
            },
        };

        record_first_playback_timing(
            &mut timing,
            delivery_started_at,
            Some(first_playback_at),
            Some(51_275),
        );

        assert_eq!(timing.metrics.speech_boundary_ms, 140);
        assert_eq!(timing.metrics.delivery_ms, Some(75));
        assert_eq!(timing.metrics.outbound_latency_ms, Some(1_275));
        assert_eq!(timing.metrics.first_playback_unix_ms, Some(51_275));
    }
}

#[cfg(test)]
mod cleanup_truth_tests {
    use super::meeting_cleanup_complete;

    #[test]
    fn cleanup_truth_requires_every_owned_resource_to_release() {
        assert!(meeting_cleanup_complete(true, true, true, true, true));
        assert!(!meeting_cleanup_complete(false, true, true, true, true));
        assert!(!meeting_cleanup_complete(true, false, true, true, true));
        assert!(!meeting_cleanup_complete(true, true, false, true, true));
        assert!(!meeting_cleanup_complete(true, true, true, false, true));
        assert!(!meeting_cleanup_complete(true, true, true, true, false));
    }
}
#[cfg(test)]
mod a7_meeting_readiness_tests {
    use super::meeting_required_ai_ready;

    #[test]
    fn meeting_required_ai_readiness_depends_on_live_worker_capability_only() {
        assert!(meeting_required_ai_ready(true, true));
        assert!(!meeting_required_ai_ready(false, true));
        assert!(!meeting_required_ai_ready(true, false));
        assert!(!meeting_required_ai_ready(false, false));
    }
}

#[cfg(test)]
mod c4_functional_preflight_tests {
    use super::{meeting_required_ai_ready, meeting_start_ai_eligible};

    #[test]
    fn static_prerequisites_can_be_start_eligible_before_functional_ready() {
        assert!(meeting_start_ai_eligible(true, true));
        assert!(meeting_required_ai_ready(true, true));
        assert!(!meeting_start_ai_eligible(true, false));
        assert!(!meeting_required_ai_ready(false, true));
    }
}
