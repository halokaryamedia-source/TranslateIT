use serde_json::{json, Value};

use crate::engine::runtime_state::{
    begin_application_meeting_session, clear_runtime_session_if_generation,
    clear_runtime_session_state, commit_application_meeting_session_live,
};

use super::helper_bridge::{send_helper_worker_task, HelperBridgeWorkerResponse};
use super::helper_bridge_runtime::{runtime, stop_child, HelperBridgeRuntime};

fn reset_bridge_runtime() {
    if let Ok(mut bridge) = runtime().lock() {
        stop_child(&mut bridge);
        *bridge = HelperBridgeRuntime::default();
    }
}

fn response_blocker(response: &HelperBridgeWorkerResponse) -> String {
    serde_json::from_str::<Value>(&response.worker_response_json)
        .ok()
        .and_then(|value| {
            value
                .get("blocker")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_default()
}

#[test]
fn bridge_priority_and_stale_guards_follow_production_payload_contract() {
    let _ = clear_runtime_session_state();
    reset_bridge_runtime();

    let text = send_helper_worker_task(
        "translate",
        json!({
            "text": "halo",
            "source_language": "id",
            "target_language": "en"
        }),
    );
    assert_eq!(text.scheduler_priority, "text");
    assert_eq!(response_blocker(&text), "helper_bridge:not_running");

    reset_bridge_runtime();
    let diagnostic = send_helper_worker_task("status", json!({}));
    assert_eq!(diagnostic.scheduler_priority, "diagnostic");
    assert_eq!(response_blocker(&diagnostic), "helper_bridge:not_running");

    reset_bridge_runtime();
    let incomplete_incoming = send_helper_worker_task(
        "translate",
        json!({
            "text": "hello",
            "meeting_lane": "incoming"
        }),
    );
    assert_eq!(
        incomplete_incoming.scheduler_priority, "text",
        "incoming lane without a Meeting session id must not gain MeetingIncoming priority"
    );

    reset_bridge_runtime();
    let start_prepare = send_helper_worker_task(
        "status",
        json!({
            "meeting_start_prepare": true
        }),
    );
    assert_eq!(start_prepare.scheduler_priority, "meeting_outbound");
    assert_eq!(response_blocker(&start_prepare), "helper_bridge:not_running");

    let meeting = begin_application_meeting_session();
    assert!(meeting.blocker.is_empty());
    let snapshot = meeting.snapshot.as_ref().expect("Meeting authority claim");
    let generation = snapshot.generation;
    let session_id = snapshot.session_id.clone();

    reset_bridge_runtime();
    let outbound = send_helper_worker_task(
        "transcribe",
        json!({
            "audio_path": "unused-test.wav",
            "meeting_session_id": session_id.clone(),
            "meeting_lane": "you",
            "meeting_generation": generation
        }),
    );
    assert_eq!(outbound.scheduler_priority, "meeting_outbound");
    assert_eq!(response_blocker(&outbound), "helper_bridge:not_running");

    let live = commit_application_meeting_session_live(
        generation,
        false,
        "bridge contract test commits Meeting Live without opening capture",
    );
    assert!(live.blocker.is_empty());

    reset_bridge_runtime();
    let incoming = send_helper_worker_task(
        "transcribe",
        json!({
            "audio_path": "unused-test.wav",
            "meeting_session_id": session_id.clone(),
            "meeting_lane": "INCOMING"
        }),
    );
    assert_eq!(incoming.scheduler_priority, "meeting_incoming");
    assert_eq!(response_blocker(&incoming), "helper_bridge:not_running");

    let cleared = clear_runtime_session_if_generation(generation);
    assert_eq!(cleared.blocker, "runtime_session:cleared");

    reset_bridge_runtime();
    let stale_outbound = send_helper_worker_task(
        "translate",
        json!({
            "text": "halo",
            "meeting_session_id": session_id.clone(),
            "meeting_lane": "you",
            "meeting_generation": generation
        }),
    );
    assert_eq!(stale_outbound.scheduler_priority, "meeting_outbound");
    assert_eq!(stale_outbound.state, "stale_generation");
    assert_eq!(
        response_blocker(&stale_outbound),
        "helper_scheduler:meeting_generation_not_authoritative"
    );
    assert_eq!(
        stale_outbound.runtime_claim,
        "helper_scheduler_request_not_executed"
    );

    reset_bridge_runtime();
    let stale_incoming = send_helper_worker_task(
        "translate",
        json!({
            "text": "hello",
            "meeting_session_id": session_id,
            "meeting_lane": "incoming"
        }),
    );
    assert_eq!(stale_incoming.scheduler_priority, "meeting_incoming");
    assert_eq!(stale_incoming.state, "stale_session");
    assert_eq!(
        response_blocker(&stale_incoming),
        "helper_scheduler:incoming_meeting_session_not_eligible"
    );
    assert_eq!(
        stale_incoming.runtime_claim,
        "helper_scheduler_request_not_executed"
    );

    reset_bridge_runtime();
    let _ = clear_runtime_session_state();
}
