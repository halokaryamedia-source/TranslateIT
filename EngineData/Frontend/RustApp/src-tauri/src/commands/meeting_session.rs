use serde::Serialize;
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};

use crate::engine::audio::finalized_utterance::{
    clear_finalized_incoming_utterance_producer, clear_finalized_meeting_sequence,
    clear_finalized_outbound_utterance_producer, reset_finalized_incoming_speech_boundary,
    reset_finalized_meeting_sequence, wait_take_finalized_incoming_utterance,
    wait_take_finalized_outbound_utterance,
};
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::{
    remove_finalized_meeting_utterance_wav, write_finalized_incoming_utterance_wav,
    write_finalized_outbound_utterance_wav,
};
use crate::engine::audio::meeting_sound_capture::{
    meeting_sound_capture_status, start_meeting_sound_capture_runtime,
    stop_meeting_sound_capture_runtime,
};
use crate::engine::history_store::{create_meeting_recent, HistoryTurn};
use crate::engine::load_settings;
use crate::engine::runtime_state::{
    begin_application_meeting_session, begin_application_meeting_session_resume,
    clear_runtime_handoff_state, clear_runtime_session_state,
    commit_application_meeting_session_live, latest_runtime_session_state,
    pause_application_meeting_session_authority, revoke_application_meeting_session_authority,
    runtime_generation_is_authoritative, RuntimeSessionStateReport,
};

use super::audio::get_input_status;
use super::helper_bridge::{
    cancel_helper_bridge_meeting_generation, cancel_helper_bridge_meeting_session,
    get_helper_bridge_status, send_helper_worker_task, start_helper_bridge,
    HelperBridgeWorkerResponse,
};
use super::helper_bridge_runtime::unix_ms;
use super::pipeline_handoff::reset_live_pipeline_handoff_status;
use super::runtime_inventory::get_model_inventory;
use super::virtual_audio_route_runtime::{
    cancel_meeting_virtual_audio_route_provider, dispatch_meeting_virtual_audio_route_provider,
    meeting_route_execution_guard_status,
};
use super::virtual_mic_route::get_virtual_mic_route_contract_status;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
const MAX_LIVE_COMMITTED_TURNS: usize = 240;

#[derive(Debug, Clone, Serialize)]
pub struct MeetingSessionPreflightStatus {
    pub ready_for_start: bool,
    pub microphone_ready: bool,
    pub models_ready: bool,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub meeting_route_ready: bool,
    pub route_execution_guard_ready: bool,
    pub generation_aware_outbound_stages_ready: bool,
    pub finalized_utterance_source_connected: bool,
    pub outbound_runtime_connected: bool,
    pub blockers: Vec<String>,
    pub summary: String,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MeetingOutboundRuntimeStatus {
    pub generation: Option<u64>,
    pub session_id: Option<String>,
    pub stage: String,
    pub utterance_sequence: u64,
    pub output_active: bool,
    pub last_stage_ok: bool,
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

struct MeetingCommittedTurnStore {
    session_id: String,
    dropped_turn_count: u64,
    turns: VecDeque<MeetingCommittedTurn>,
}

struct MeetingSelfOutputSuppression {
    session_id: String,
    active: Arc<AtomicBool>,
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

fn idle_outbound_status() -> MeetingOutboundRuntimeStatus {
    MeetingOutboundRuntimeStatus {
        generation: None,
        session_id: None,
        stage: "idle".to_string(),
        utterance_sequence: 0,
        output_active: false,
        last_stage_ok: true,
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
        status.capture_active = capture.stream_active;
        status.suppressed = capture.suppression_active;
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
        *status = MeetingOutboundRuntimeStatus {
            generation: Some(generation),
            session_id: Some(session_id.to_string()),
            stage: stage.to_string(),
            utterance_sequence,
            output_active,
            last_stage_ok,
            blocker: blocker.to_string(),
            note: note.to_string(),
            updated_unix_ms: unix_ms(),
            runtime_claim: "meeting_outbound_finalized_segment_contract_source_side_not_windows_runtime_proof"
                .to_string(),
        };
    }
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
            runtime_claim: "meeting_incoming_optional_lane_source_contract_not_windows_runtime_proof"
                .to_string(),
        };
    }
}

fn clear_incoming_status() {
    if let Ok(mut status) = incoming_status_store().lock() {
        *status = idle_incoming_status();
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
    matches!(state, Some("output_complete" | "output_failed" | "interrupted"))
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
) -> bool {
    if sequence == 0 || !matches!(lane, "you" | "incoming") {
        return false;
    }
    if lane == "you" && (generation.is_none() || delivery_state.is_none()) {
        return false;
    }
    if lane == "incoming" && (generation.is_some() || delivery_state.is_some()) {
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

fn finalize_meeting_history(
    snapshot: &MeetingCommittedTurnsSnapshot,
    started_unix_ms: u128,
    ended_unix_ms: u128,
) -> String {
    let settings = load_settings();
    if !settings.history_enabled {
        return "History is off. No Recent Meeting entry was created; transient conversation bodies were discarded at Stop."
            .to_string();
    }
    if !snapshot.ok {
        return "Recent Meeting History could not be created because the final committed-turn snapshot was unavailable. Transient conversation bodies were still cleared."
            .to_string();
    }
    let Some(session_id) = snapshot.session_id.clone() else {
        return "No Recent Meeting entry was created because the finalized Meeting session id was unavailable."
            .to_string();
    };

    let turns = snapshot
        .turns
        .iter()
        .map(|turn| HistoryTurn {
            sequence: turn.sequence,
            lane: turn.lane.clone(),
            source_text: turn.source_text.clone(),
            translated_text: turn.translated_text.clone(),
            delivery_state: turn.delivery_state.clone(),
            created_unix_ms: turn.created_unix_ms,
        })
        .collect::<Vec<_>>();
    let interrupted = snapshot
        .turns
        .iter()
        .any(|turn| turn.delivery_state.as_deref() == Some("interrupted"));

    create_meeting_recent(
        session_id,
        started_unix_ms,
        ended_unix_ms,
        "id".to_string(),
        "en".to_string(),
        "Auto".to_string(),
        "Realtime".to_string(),
        interrupted,
        snapshot.dropped_turn_count,
        turns,
    )
    .message
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

fn build_preflight() -> MeetingSessionPreflightStatus {
    let input = get_input_status();
    let models = get_model_inventory();
    let helper = get_helper_bridge_status();
    let route = get_virtual_mic_route_contract_status();
    let route_execution = meeting_route_execution_guard_status();

    let microphone_ready = input.prepared;
    let models_ready = models.ok;
    let helper_ready = helper.state == "ready";
    let provider_ready = helper.provider_ready;
    let meeting_route_ready = route.route_ready;
    let route_execution_guard_ready = route_execution.ready;
    let generation_aware_outbound_stages_ready = generation_aware_outbound_stages_ready();
    let finalized_utterance_source_connected = finalized_utterance_source_connected();
    let outbound_runtime_connected = application_outbound_runtime_connected();

    let mut blockers = Vec::new();
    if !microphone_ready {
        blockers.push("meeting_session:microphone_not_ready".to_string());
    }
    if !models_ready {
        blockers.push("meeting_session:required_models_not_ready".to_string());
    }
    if !helper_ready || !provider_ready {
        blockers.push("meeting_session:local_runtime_not_ready".to_string());
    }
    if !meeting_route_ready {
        blockers.push(if route.blocker.is_empty() {
            "meeting_session:meeting_microphone_route_not_ready".to_string()
        } else {
            route.blocker.clone()
        });
    }
    if !route_execution_guard_ready {
        blockers.push(if route_execution.blocker.is_empty() {
            "meeting_session:meeting_route_execution_not_ready".to_string()
        } else {
            route_execution.blocker.clone()
        });
    }
    if !generation_aware_outbound_stages_ready {
        blockers.push("meeting_session:generation_aware_outbound_stages_not_ready".to_string());
    }
    if !finalized_utterance_source_connected {
        blockers.push("meeting_session:finalized_utterance_source_not_connected".to_string());
    }
    if !outbound_runtime_connected {
        blockers.push("meeting_session:continuous_outbound_runtime_not_connected".to_string());
    }
    blockers.sort();
    blockers.dedup();

    let ready_for_start = blockers.is_empty();
    MeetingSessionPreflightStatus {
        ready_for_start,
        microphone_ready,
        models_ready,
        helper_ready,
        provider_ready,
        meeting_route_ready,
        route_execution_guard_ready,
        generation_aware_outbound_stages_ready,
        finalized_utterance_source_connected,
        outbound_runtime_connected,
        blockers,
        summary: if ready_for_start {
            "Required outbound Meeting capabilities are source-connected and current preflight prerequisites are ready for transactional Start. Incoming Meeting Sound remains optional/degradable."
                .to_string()
        } else {
            "Start Translation remains blocked until all required current outbound Meeting prerequisites are ready."
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
        authority_active: snapshot.map(|value| value.authority_active).unwrap_or(false),
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

fn current_status() -> MeetingSessionStatus {
    status_from_report(latest_runtime_session_state(), build_preflight())
}

fn blocked_result(state: &str, message: String) -> MeetingSessionActionResult {
    MeetingSessionActionResult {
        ok: false,
        state: state.to_string(),
        message,
        status: current_status(),
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

fn generation_is_live(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")
        .unwrap_or(false)
}

fn incoming_session_is_eligible(session_id: &str) -> bool {
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| {
            snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
                && snapshot.session_id == session_id
                && matches!(snapshot.phase.as_str(), "live" | "paused" | "resuming")
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
        .and_then(|guard| guard.as_ref().map(|value| (value.session_id.clone(), Arc::clone(&value.active))))
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
    let _ = update_committed_turn_delivery_state(
        session_id,
        generation,
        utterance_id,
        "interrupted",
    );
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
    if !generation_is_live(generation) {
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    let transcript = worker_text(&asr, "transcript_text");
    if !asr.ok || transcript.is_none() {
        let blocker = worker_blocker(&asr, "asr:empty_transcript");
        update_outbound_status(
            generation,
            session_id,
            "listening",
            event_sequence,
            false,
            blocker.contains("empty_transcript"),
            if blocker.contains("empty_transcript") { "" } else { &blocker },
            if blocker.contains("empty_transcript") {
                "Finalized speech did not produce a stable transcript. No Meeting output was generated."
            } else {
                "Local ASR failed before translation. No Meeting output was generated."
            },
        );
        return MeetingOutboundProcessResult {
            ok: blocker.contains("empty_transcript"),
            delivered: false,
            state: if blocker.contains("empty_transcript") {
                "no_stable_transcript"
            } else {
                "asr_failed"
            }
            .to_string(),
            blocker: if blocker.contains("empty_transcript") {
                String::new()
            } else {
                blocker
            },
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
    let translation = send_helper_worker_task(
        "translate",
        json!({
            "text": transcript.clone(),
            "source_language": "id",
            "target_language": "en",
            "mode": "Realtime",
            "max_new_tokens": 96,
            "meeting_session_id": session_id,
            "meeting_lane": "you",
            "meeting_generation": generation,
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
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
    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);
    let tts = send_helper_worker_task(
        "synthesize",
        json!({
            "text": translated_text.clone(),
            "output_path": requested_tts_path,
            "meeting_session_id": session_id,
            "meeting_lane": "you",
            "meeting_generation": generation,
            "meeting_sequence": event_sequence,
            "utterance_id": utterance_id,
        }),
    );
    let tts_path = worker_text(&tts, "output_path").unwrap_or_default();
    if !generation_is_live(generation) {
        remove_temporary_tts(&tts_path);
        return stale_outbound_result(generation, session_id, event_sequence, utterance_id);
    }
    if !tts.ok || tts_path.is_empty() {
        let blocker = worker_blocker(&tts, "tts:missing_output");
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
            "Local TTS failed before Meeting delivery. No Meeting output was generated.",
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

    let Some(suppression_guard) = begin_self_output_suppression(session_id) else {
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
            "meeting_outbound:self_output_suppression_unavailable",
            "Translated voice was not routed because the Meeting self-output suppression boundary was unavailable.",
        );
        return MeetingOutboundProcessResult {
            ok: false,
            delivered: false,
            state: "suppression_unavailable".to_string(),
            blocker: "meeting_outbound:self_output_suppression_unavailable".to_string(),
            note: "Meeting output was blocked rather than risking TranslateIT TTS becoming an INCOMING turn."
                .to_string(),
            generation,
            utterance_sequence: event_sequence,
            runtime_claim: "meeting_outbound_suppression_gate_required_before_delivery".to_string(),
        };
    };

    let _ = update_committed_turn_delivery_state(
        session_id,
        generation,
        utterance_id,
        "speaking",
    );
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
    let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);
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
    if !route.ok || !route.route_execution_attempted {
        let blocker = if route.blocker.is_empty() {
            "meeting_outbound:meeting_route_delivery_failed".to_string()
        } else {
            route.blocker
        };
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
        runtime_claim: "meeting_outbound_output_execution_attempted_needs_windows_runtime_validation"
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
            "mode": "Realtime",
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
    );
    update_incoming_status(
        session_id,
        if committed { "listening" } else { "degraded" },
        !committed,
        if committed { "" } else { "meeting_incoming:commit_rejected" },
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
                if utterance.generation != Some(generation)
                    || utterance.lane != "you"
                    || utterance.session_id != thread_session_id
                    || !generation_is_live(generation)
                {
                    continue;
                }

                let write = write_finalized_outbound_utterance_wav(&utterance);
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

fn stop_meeting_outbound_consumer(generation: u64) -> String {
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
            return "Meeting outbound consumer state lock failed during cleanup.".to_string();
        }
    };

    let Some(mut runtime) = runtime else {
        return "No matching Meeting outbound consumer required cleanup.".to_string();
    };
    let session_id = runtime.session_id.clone();
    let joined = runtime
        .thread
        .take()
        .map(|handle| handle.join().is_ok())
        .unwrap_or(true);
    if joined {
        format!("Meeting outbound consumer stopped for {session_id} generation {generation}.")
    } else {
        format!("Meeting outbound consumer for {session_id} generation {generation} exited unexpectedly during cleanup.")
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

fn stop_meeting_incoming_consumer(session_id: &str) -> String {
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
            return "Meeting incoming consumer state lock failed during cleanup.".to_string();
        }
    };

    let Some(mut runtime) = runtime else {
        return "No matching Meeting incoming consumer required cleanup.".to_string();
    };
    let joined = runtime
        .thread
        .take()
        .map(|handle| handle.join().is_ok())
        .unwrap_or(true);
    if joined {
        format!("Meeting incoming consumer stopped for session {session_id}.")
    } else {
        format!("Meeting incoming consumer for session {session_id} exited unexpectedly during cleanup.")
    }
}

fn start_optional_incoming_lane(session_id: &str) -> String {
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

    update_incoming_status(
        session_id,
        "listening",
        false,
        "",
        "Incoming Meeting Sound is listening for finalized English speech. This optional lane may remain available while outbound is Paused.",
    );
    "Incoming Meeting Sound lane started.".to_string()
}

fn ensure_helper_for_healthy_incoming(session_id: &str) -> String {
    if !meeting_sound_capture_status().stream_active || !incoming_session_is_eligible(session_id) {
        return "Incoming helper restart was not required.".to_string();
    }
    if get_helper_bridge_status().state == "ready" {
        return "Incoming helper remained ready.".to_string();
    }
    let result = start_helper_bridge();
    if result.ok {
        update_incoming_status(
            session_id,
            "listening",
            false,
            "",
            "Incoming Meeting Sound remained active while the local helper was restored after outbound Pause cleanup.",
        );
        "Incoming helper was restored after outbound generation cancellation.".to_string()
    } else {
        update_incoming_status(
            session_id,
            "degraded",
            true,
            "meeting_incoming:helper_restart_failed",
            "Incoming Meeting Sound capture remains open, but local incoming AI is degraded because the helper could not be restored. Outbound is Paused.",
        );
        format!("Incoming helper restore failed: {}", result.message)
    }
}

fn rollback_resume_to_paused(
    generation: u64,
    session_id: &str,
    reason: &str,
) -> RuntimeSessionStateReport {
    let paused = pause_application_meeting_session_authority(generation, reason);
    interrupt_committed_turns_for_generation(session_id, generation);
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
    let _ = stop_live_capture_runtime();
    let _ = cancel_helper_bridge_meeting_generation(generation);
    let _ = stop_meeting_outbound_consumer(generation);
    let _ = ensure_helper_for_healthy_incoming(session_id);
    update_outbound_status(
        generation,
        session_id,
        "paused",
        0,
        false,
        false,
        "",
        "Translation remains paused because Resume could not safely reopen all required outbound resources.",
    );
    paused
}

#[tauri::command]
pub fn get_meeting_session_status() -> MeetingSessionStatus {
    current_status()
}

#[tauri::command]
pub fn get_meeting_committed_turns() -> MeetingCommittedTurnsSnapshot {
    current_committed_turn_snapshot()
}

#[tauri::command]
pub fn start_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
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

    let preflight = build_preflight();
    if !preflight.ready_for_start {
        return MeetingSessionActionResult {
            ok: false,
            state: "blocked".to_string(),
            message: preflight.summary.clone(),
            status: status_from_report(latest_runtime_session_state(), preflight),
        };
    }

    let starting = begin_application_meeting_session();
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
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Start Translation failed while opening the required microphone resource. Authority was revoked before rollback.",
        );
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let _ = reset_live_pipeline_handoff_status();
        let _ = clear_runtime_handoff_state();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back safely because the microphone resource could not be opened: {}",
                capture.message
            ),
        );
    }

    let committed = commit_application_meeting_session_live(
        generation,
        true,
        "Required Start resources were opened and the authoritative Meeting generation committed Live.",
    );
    if !committed.blocker.is_empty() {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Meeting Live commit failed after resource open. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_virtual_audio_route_provider(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let _ = reset_live_pipeline_handoff_status();
        let _ = clear_runtime_handoff_state();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            "Start Translation could not commit the Meeting generation Live, so all opened Meeting resources were rolled back."
                .to_string(),
        );
    }

    if let Err(error) = start_meeting_outbound_consumer(generation, &session_id) {
        let _ = revoke_application_meeting_session_authority(
            generation,
            "Meeting outbound consumer could not start. Authority was revoked before rollback.",
        );
        let _ = cancel_meeting_virtual_audio_route_provider(generation);
        let _ = stop_live_capture_runtime();
        let _ = stop_meeting_sound_capture_runtime();
        let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);
        let consumer_cleanup = stop_meeting_outbound_consumer(generation);
        let _ = reset_live_pipeline_handoff_status();
        let _ = clear_runtime_handoff_state();
        clear_finalized_meeting_sequence();
        clear_self_output_suppression_for_session(&session_id);
        clear_committed_turns_for_session(&session_id);
        let _ = clear_runtime_session_state();
        return blocked_result(
            "rolled_back",
            format!(
                "Start Translation was rolled back because the serialized outbound consumer could not start: {error}. Helper cleanup: {} Consumer cleanup: {}",
                helper_cancel.message, consumer_cleanup
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
    let incoming_message = start_optional_incoming_lane(&session_id);
    MeetingSessionActionResult {
        ok: true,
        state: "live".to_string(),
        message: format!(
            "Translation Live committed with authoritative outbound capture/consumer. {incoming_message}"
        ),
        status: status_from_report(committed, build_preflight()),
    }
}

#[tauri::command]
pub fn pause_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    let Some(snapshot) = current.snapshot.as_ref() else {
        return blocked_result(
            "pause_not_live",
            "Pause Translation requires an active Live Meeting session.".to_string(),
        );
    };
    if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {
        return blocked_result(
            "active_session_conflict",
            "Another runtime session owns Meeting resources. Application Translation cannot Pause it."
                .to_string(),
        );
    }
    if snapshot.phase == "paused" && !snapshot.authority_active {
        return MeetingSessionActionResult {
            ok: true,
            state: "already_paused".to_string(),
            message: "Translation is already paused. Duplicate Pause did not change the Meeting session or incoming lane."
                .to_string(),
            status: status_from_report(current, build_preflight()),
        };
    }
    if snapshot.phase != "live" || !snapshot.authority_active {
        return blocked_result(
            "pause_not_live",
            "Pause Translation is available only while the application Meeting session is Live."
                .to_string(),
        );
    }

    let generation = snapshot.generation;
    let session_id = snapshot.session_id.clone();
    let paused = pause_application_meeting_session_authority(
        generation,
        "Pause Translation accepted. Old outbound generation authority was invalidated while the application Meeting session identity remains active as Paused.",
    );
    if !paused.blocker.is_empty() {
        return blocked_result(
            "pause_authority_failed",
            "Pause Translation could not invalidate the current Meeting generation authority, so resource cleanup was not started under ambiguous ownership."
                .to_string(),
        );
    }

    interrupt_committed_turns_for_generation(&session_id, generation);
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
    let capture_stop = stop_live_capture_runtime();
    let helper_cancel = cancel_helper_bridge_meeting_generation(generation);
    let consumer_cleanup = stop_meeting_outbound_consumer(generation);
    let incoming_helper = ensure_helper_for_healthy_incoming(&session_id);
    update_outbound_status(
        generation,
        &session_id,
        "paused",
        0,
        false,
        true,
        "",
        "Outbound Translation is paused. Incoming Meeting Sound remains session-scoped and may continue.",
    );

    MeetingSessionActionResult {
        ok: true,
        state: "paused".to_string(),
        message: format!(
            "Outbound Translation paused without ending the Meeting session. Microphone cleanup: {} Helper cleanup: {} Consumer cleanup: {} {}",
            capture_stop.message, helper_cancel.message, consumer_cleanup, incoming_helper
        ),
        status: status_from_report(paused, build_preflight()),
    }
}

#[tauri::command]
pub fn resume_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    let Some(snapshot) = current.snapshot.as_ref() else {
        return blocked_result(
            "resume_not_paused",
            "Resume Translation requires a paused application Meeting session.".to_string(),
        );
    };
    if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {
        return blocked_result(
            "active_session_conflict",
            "Another runtime session owns Meeting resources. Application Translation cannot Resume it."
                .to_string(),
        );
    }
    if snapshot.phase == "live" && snapshot.authority_active {
        return MeetingSessionActionResult {
            ok: true,
            state: "already_live".to_string(),
            message: "Translation is already live. Duplicate Resume did not create another generation or resource set."
                .to_string(),
            status: status_from_report(current, build_preflight()),
        };
    }
    if snapshot.phase != "paused" || snapshot.authority_active {
        return blocked_result(
            "resume_not_paused",
            "Resume Translation is available only while the application Meeting session is Paused."
                .to_string(),
        );
    }
    let original_session_id = snapshot.session_id.clone();

    if get_helper_bridge_status().state != "ready" {
        let helper_start = start_helper_bridge();
        if !helper_start.ok {
            return MeetingSessionActionResult {
                ok: false,
                state: "resume_blocked".to_string(),
                message: format!(
                    "Translation remains paused because the local helper runtime could not be restored for Resume: {}",
                    helper_start.message
                ),
                status: status_from_report(latest_runtime_session_state(), build_preflight()),
            };
        }
    }

    let preflight = build_preflight();
    if !preflight.ready_for_start {
        return MeetingSessionActionResult {
            ok: false,
            state: "resume_blocked".to_string(),
            message: "Translation remains paused because current outbound prerequisites are not ready for transactional Resume."
                .to_string(),
            status: status_from_report(latest_runtime_session_state(), preflight),
        };
    }

    let resuming = begin_application_meeting_session_resume();
    let Some(resume_snapshot) = resuming.snapshot.as_ref() else {
        return blocked_result(
            "resume_authority_failed",
            "Resume Translation could not establish fresh Meeting generation authority. The session was not reopened."
                .to_string(),
        );
    };
    if !resuming.blocker.is_empty()
        || resume_snapshot.owner_id != APPLICATION_MEETING_OWNER_ID
        || resume_snapshot.session_id != original_session_id
        || !resume_snapshot.authority_active
        || resume_snapshot.phase != "resuming"
    {
        return blocked_result(
            "resume_authority_conflict",
            "Resume Translation did not receive a fresh authoritative generation for the existing Meeting session. No additional resources were opened."
                .to_string(),
        );
    }

    let generation = resume_snapshot.generation;
    let session_id = resume_snapshot.session_id.clone();
    let capture = start_live_capture_runtime(resuming.clone());
    if !capture.ok {
        let paused = rollback_resume_to_paused(
            generation,
            &session_id,
            "Resume Translation failed while reopening the required microphone resource. Fresh generation authority was invalidated before rollback to Paused.",
        );
        return MeetingSessionActionResult {
            ok: false,
            state: "resume_rolled_back".to_string(),
            message: format!(
                "Translation remains paused because Resume could not reopen the microphone resource: {}",
                capture.message
            ),
            status: status_from_report(paused, build_preflight()),
        };
    }

    let committed = commit_application_meeting_session_live(
        generation,
        true,
        "Resume resources were reopened and the fresh Meeting generation committed Live for the existing session identity.",
    );
    if !committed.blocker.is_empty() {
        let paused = rollback_resume_to_paused(
            generation,
            &session_id,
            "Resume Live commit failed after resource open. Fresh generation authority was invalidated before rollback to Paused.",
        );
        return MeetingSessionActionResult {
            ok: false,
            state: "resume_rolled_back".to_string(),
            message: "Translation remains paused because the fresh Resume generation could not commit Live safely."
                .to_string(),
            status: status_from_report(paused, build_preflight()),
        };
    }

    if let Err(error) = start_meeting_outbound_consumer(generation, &session_id) {
        let paused = rollback_resume_to_paused(
            generation,
            &session_id,
            "Resume outbound consumer could not start. Fresh generation authority was invalidated before rollback to Paused.",
        );
        return MeetingSessionActionResult {
            ok: false,
            state: "resume_rolled_back".to_string(),
            message: format!(
                "Translation remains paused because the serialized outbound consumer could not restart: {error}"
            ),
            status: status_from_report(paused, build_preflight()),
        };
    }

    update_outbound_status(
        generation,
        &session_id,
        "listening",
        0,
        false,
        true,
        "",
        "Translation resumed with a fresh outbound generation. Shared Meeting event sequence and healthy incoming capture were retained.",
    );
    MeetingSessionActionResult {
        ok: true,
        state: "resumed".to_string(),
        message: "Outbound Translation resumed for the same Meeting session with fresh generation authority. Healthy incoming Meeting Sound was not recreated."
            .to_string(),
        status: status_from_report(committed, build_preflight()),
    }
}

#[tauri::command]
pub fn stop_meeting_translation() -> MeetingSessionActionResult {
    let current = latest_runtime_session_state();
    let Some(snapshot) = current.snapshot.as_ref() else {
        let _ = stop_meeting_sound_capture_runtime();
        clear_finalized_incoming_utterance_producer();
        clear_finalized_meeting_sequence();
        clear_all_committed_turns();
        clear_incoming_status();
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
    let started_unix_ms = snapshot.started_unix_ms;

    let revoked = revoke_application_meeting_session_authority(
        generation,
        "Stop Translation accepted. Old outbound Meeting generation authority was revoked before full-session cleanup.",
    );
    if revoked
        .snapshot
        .as_ref()
        .map(|value| value.authority_active)
        .unwrap_or(false)
    {
        return blocked_result(
            "stop_authority_failed",
            "Stop Translation could not revoke Meeting generation authority, so cleanup was not allowed to proceed under an ambiguous owner."
                .to_string(),
        );
    }

    interrupt_committed_turns_for_generation(&session_id, generation);
    let _ = cancel_meeting_virtual_audio_route_provider(generation);
    let capture_stop = stop_live_capture_runtime();
    let incoming_capture_stop = stop_meeting_sound_capture_runtime();
    let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);
    let outbound_cleanup = stop_meeting_outbound_consumer(generation);
    let incoming_cleanup = stop_meeting_incoming_consumer(&session_id);

    let final_turns = current_committed_turn_snapshot();
    let history_message = finalize_meeting_history(&final_turns, started_unix_ms, unix_ms());

    let _ = reset_live_pipeline_handoff_status();
    let _ = clear_runtime_handoff_state();
    clear_self_output_suppression_for_session(&session_id);
    clear_finalized_meeting_sequence();
    clear_committed_turns_for_session(&session_id);
    clear_incoming_status();
    let cleared = clear_runtime_session_state();

    MeetingSessionActionResult {
        ok: true,
        state: "stopped".to_string(),
        message: format!(
            "Translation stopped. Authority was revoked before both audio lanes/helper/consumers were cleaned. Microphone: {} Meeting Sound: {} Helper: {} Outbound: {} Incoming: {} History: {}",
            capture_stop.message,
            incoming_capture_stop.message,
            helper_cancel.message,
            outbound_cleanup,
            incoming_cleanup,
            history_message
        ),
        status: status_from_report(cleared, build_preflight()),
    }
}
