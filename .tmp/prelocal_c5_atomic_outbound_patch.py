from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


MEETING_OUTPUT = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/meeting_output.rs"
MEETING = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
VALIDATOR = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
CONTEXT = "CONTEXT.md"
OWNERSHIP = "docs/knowledge/source-ownership.md"
NEXT_ACTION = "docs/knowledge/next-action.md"

# 1) Functional native output verification reuses the already-prepared CPAL device.
text = read(MEETING_OUTPUT)
text = replace_once(
    text,
    """const MIN_OUTPUT_SAMPLE_RATE_HZ: u32 = 8_000;\nconst MAX_DELIVERY_DEADLINE_MS: u64 = 120_000;""",
    """const MIN_OUTPUT_SAMPLE_RATE_HZ: u32 = 8_000;\nconst FUNCTIONAL_OUTPUT_PROBE_TIMEOUT_MS: u64 = 2_000;\nconst FUNCTIONAL_OUTPUT_PROBE_FRAMES: usize = 128;\nconst MAX_DELIVERY_DEADLINE_MS: u64 = 120_000;""",
    "C5 output probe constants",
)

probe_fn = r'''pub fn probe_prepared_meeting_output_device_functionally(
    requested_name: &str,
    generation: u64,
) -> Result<(), String> {
    if !runtime_generation_is_authoritative(generation) {
        return Err("meeting_output:functional_probe_generation_not_authoritative".to_string());
    }

    let device = prepared_output_device(requested_name)?;
    let supported = device
        .default_output_config()
        .map_err(|_| "meeting_output:functional_probe_default_config_unavailable".to_string())?;
    let sample_format = supported.sample_format();
    let config: cpal::StreamConfig = supported.into();
    if config.channels == 0 || config.channels > MAX_OUTPUT_CHANNELS {
        return Err("meeting_output:functional_probe_unsupported_channel_count".to_string());
    }
    if !(MIN_OUTPUT_SAMPLE_RATE_HZ..=MAX_OUTPUT_SAMPLE_RATE_HZ).contains(&config.sample_rate.0) {
        return Err("meeting_output:functional_probe_unsupported_sample_rate".to_string());
    }

    // The probe must prove the native endpoint can actually build, start, and invoke
    // its callback without emitting speech. Zero-valued frames are sufficient: C5
    // verifies endpoint execution, not meeting-app reception or audible content.
    let sample_count = usize::from(config.channels).saturating_mul(FUNCTIONAL_OUTPUT_PROBE_FRAMES);
    let samples = Arc::new(vec![0.0_f32; sample_count]);
    let cancel_requested = Arc::new(AtomicBool::new(false));
    let (completion_tx, _completion_rx) = mpsc::sync_channel(1);
    let (first_playback_tx, first_playback_rx) = mpsc::sync_channel(1);
    let callback_errors = Arc::new(Mutex::new(Vec::new()));
    let stream = build_output_stream(
        &device,
        &config,
        sample_format,
        samples,
        cancel_requested,
        generation,
        completion_tx,
        first_playback_tx,
        Arc::clone(&callback_errors),
    )?;
    stream
        .play()
        .map_err(|_| "meeting_output:functional_probe_stream_start_failed".to_string())?;

    let callback = first_playback_rx.recv_timeout(Duration::from_millis(
        FUNCTIONAL_OUTPUT_PROBE_TIMEOUT_MS,
    ));
    let callback_error = callback_errors
        .lock()
        .ok()
        .and_then(|errors| errors.last().cloned());
    let still_authoritative = runtime_generation_is_authoritative(generation);
    drop(stream);

    if !still_authoritative {
        return Err("meeting_output:functional_probe_generation_revoked".to_string());
    }
    if callback_error.is_some() {
        return Err("meeting_output:functional_probe_callback_failed".to_string());
    }
    match callback {
        Ok(_) => Ok(()),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            Err("meeting_output:functional_probe_callback_timeout".to_string())
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err("meeting_output:functional_probe_callback_disconnected".to_string())
        }
    }
}

'''
anchor = "fn install_cancel_control(generation: u64) -> Result<Arc<AtomicBool>, String> {"
if anchor not in text:
    raise RuntimeError("C5 output probe insertion anchor missing")
text = text.replace(anchor, probe_fn + anchor, 1)
write(MEETING_OUTPUT, text)

# 2) Atomic Start: microphone -> functional output probe -> outbound consumer -> Live.
text = read(MEETING)
text = replace_once(
    text,
    """    cancel_meeting_output_for_generation, clear_prepared_meeting_output_device,\n    deliver_meeting_output_wav, prepare_meeting_output_device,""",
    """    cancel_meeting_output_for_generation, clear_prepared_meeting_output_device,\n    deliver_meeting_output_wav, prepare_meeting_output_device,\n    probe_prepared_meeting_output_device_functionally,""",
    "C5 Meeting output import",
)
text = replace_once(
    text,
    """    // Route discovery chooses one exact matched virtual-cable pair. Before Meeting\n    // authority exists, verify the playback-side endpoint exposes a native CPAL output\n    // configuration. Actual samples are submitted only by authoritative Live output.""",
    """    // Route discovery chooses one exact matched virtual-cable pair. Before Meeting\n    // authority exists, retain the exact playback-side CPAL endpoint and verify its\n    // native configuration. C5 performs the real silent callback probe transactionally\n    // after the Starting authority and microphone resource exist, but before Live.""",
    "C5 route preparation comment",
)
start_marker = "    let committed = commit_application_meeting_session_live("
end_marker = "    update_outbound_status(\n        generation,\n        &session_id,\n        \"listening\","
start_index = text.find(start_marker)
end_index = text.find(end_marker, start_index)
if start_index < 0 or end_index < 0:
    raise RuntimeError("C5 Start transaction replacement markers missing")
replacement = r'''    // Required native output execution must be proven while this generation owns
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

    let committed = commit_application_meeting_session_live(
        generation,
        true,
        "Required microphone, functional native Meeting output callback, and serialized outbound consumer were ready before the authoritative generation committed Live.",
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

'''
text = text[:start_index] + replacement + text[end_index:]
write(MEETING, text)

# 3) Keep the canonical source validator aligned with C5's real owner/order.
text = read(VALIDATOR)
insert_anchor = '''requireMarkers(source.meetingSession, "C2 transient outbound latency instrumentation", ['''
insert_index = text.find(insert_anchor)
if insert_index < 0:
    raise RuntimeError("C5 validator insertion anchor missing")
c4_index = text.find('requireMarkers(source.helperBridgeRuntime, "C4 helper functional readiness projection"', insert_index)
if c4_index < 0:
    raise RuntimeError("C5 validator C4 boundary missing")
c5_validator = r'''requireMarkers(source.meetingOutput, "C5 bounded functional native Meeting output probe", [
  "FUNCTIONAL_OUTPUT_PROBE_TIMEOUT_MS",
  "FUNCTIONAL_OUTPUT_PROBE_FRAMES",
  "pub fn probe_prepared_meeting_output_device_functionally(",
  "prepared_output_device(requested_name)?",
  "Arc::new(vec![0.0_f32; sample_count])",
  "first_playback_rx.recv_timeout(Duration::from_millis(",
  '"meeting_output:functional_probe_callback_timeout"',
]);
requireMarkers(source.meetingSession, "C5 atomic required outbound activation", [
  "probe_prepared_meeting_output_device_functionally",
  "start_meeting_outbound_consumer(generation, &session_id)",
  "commit_application_meeting_session_live(",
  "functional native Meeting output callback",
]);
const c5Start = source.meetingSession.slice(
  source.meetingSession.indexOf("pub fn start_meeting_translation()"),
  source.meetingSession.indexOf("#[tauri::command]\npub fn stop_meeting_translation()"),
);
const c5Order = [
  "begin_application_meeting_session()",
  "start_live_capture_runtime(starting.clone())",
  "probe_prepared_meeting_output_device_functionally(output_device, generation)",
  "start_meeting_outbound_consumer(generation, &session_id)",
  "commit_application_meeting_session_live(",
].map((marker) => c5Start.indexOf(marker));
if (c5Order.some((index) => index < 0) || c5Order.some((index, i) => i > 0 && index <= c5Order[i - 1])) {
  throw new Error(`C5 Start ordering is not authority -> microphone -> output probe -> outbound consumer -> Live: ${c5Order.join(",")}`);
}

'''
text = text[:c4_index] + c5_validator + text[c4_index:]
write(VALIDATOR, text)

# 4) Stable context and source ownership reflect the new transaction without claiming hardware proof.
text = read(CONTEXT)
context_anchor = """Start establishes one session/authority. Navigation does not stop/recreate it. Stop revokes output authority before resource cleanup, stops both audio lanes, cancels/joins Meeting work, clears transient conversation/audio state, and ends the session. Safe application close uses the same Stop owner and fails closed when session state cannot be verified. Windows suspend/resume window messages only enqueue a bounded nonblocking cleanup signal; a Rust lifecycle worker then converges through the same authority-first Meeting Stop owner.\n"""
context_replacement = context_anchor + """\nRequired outbound activation is transactional before `Live`: after the application Meeting generation owns `Starting` authority, the required microphone capture opens, the exact prepared virtual output endpoint must build/start a bounded silent CPAL stream and produce a native callback, and the serialized outbound consumer must be created. Only then may the same generation commit `Live`. Optional incoming Meeting Sound remains independent and starts after required outbound is Live. The silent callback probe proves native endpoint execution only; actual VB-Cable/meeting-app reception remains target-Windows evidence.\n"""
text = replace_once(text, context_anchor, context_replacement, "C5 context Meeting ownership")
write(CONTEXT, text)

text = read(OWNERSHIP)
text = replace_once(
    text,
    """| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE |""",
    """| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START: MIC + OUTPUT CALLBACK PROBE + OUTBOUND CONSUMER BEFORE LIVE |""",
    "C5 Meeting authority ownership",
)
text = replace_once(
    text,
    """| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + RUST/CPAL DELIVERY |""",
    """| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + PRE-LIVE SILENT CALLBACK PROBE + RUST/CPAL DELIVERY |""",
    "C5 Meeting output ownership",
)
write(OWNERSHIP, text)

# 5) Close C5 and leave exactly one source-only follow-up because user-local testing is deferred.
text = read(NEXT_ACTION)
old_tail = '''## Current Mode\n\n**Developing / Pre-Local Source Readiness — C4 IMPLEMENTED, ONE SOURCE CLOSURE REMAINS.** A1-A7, B1-B6, C1-C3, and the source re-audit remain closed at their proven boundaries. Local-PC testing is still deferred by user decision. C5 is the final mapped non-hardware source-correctness wave.\n\n## Next Step — Pre-Local C5 Atomic Outbound Activation Closure\n\nComplete PR-053 at the existing Meeting/audio owners: functionally probe the prepared virtual output endpoint with a bounded silent/callback-only native output stream before Live, and create the serialized outbound consumer before `commit_application_meeting_session_live`. Preserve authority-first rollback, prepared-device reuse, at-most-once delivery, B3 hot-path efficiency, and optional-incoming independence. Do not mix VAD tuning, installer staging, endpoint-GUID migration, or local-PC proof.'''
new_tail = '''## Pre-Local C5 — IMPLEMENTED / TARGET AUDIO PROOF DEFERRED\n\nC5 closes the mapped PR-053 source gap without adding another audio or lifecycle owner. `prepare_meeting_output_device` still retains the exact matched Rust/CPAL output endpoint cheaply before authority. Once the application generation owns `Starting` authority and required microphone capture is open, `meeting_output.rs` now builds and starts a bounded silent output stream on that prepared endpoint and requires a native callback within the C1-aligned 2-second functional-probe budget. The probe emits only zero-valued frames and does not claim VB-Cable or meeting-app reception.\n\nThe serialized required outbound consumer is now created while the same generation is still `Starting`. Only after microphone capture, the functional native output callback, and outbound consumer creation succeed does `commit_application_meeting_session_live` run. Output-probe failure, consumer spawn failure, or Live-commit failure all revoke generation authority first and roll back the resources opened so far; commit failure additionally joins the already-created outbound consumer. Optional incoming Meeting Sound remains post-Live and independent.\n\nRemote Windows/source proof for this slice establishes source/build correctness only:\n\n```text\ncanonical source validators                        -> PASS\nsvelte-check + frontend build                      -> PASS\nC5 Start ordering/rollback ownership guard         -> PASS\nRust full test-target compile (`--no-run`)          -> PASS\ncargo check                                        -> PASS\nTauri release build --no-bundle                    -> PASS\n```\n\nA GitHub-hosted Windows runner is not the target virtual-audio environment, so the actual silent callback probe cannot be claimed against the user's VB-Cable/meeting-app route until target-Windows testing is authorized. No VAD/model/CUDA tuning, endpoint-GUID migration, installer work, or local-PC test is part of C5.\n\n## Current Mode\n\n**Maintenance / Pre-Local Source Readiness — C5 IMPLEMENTED, MAPPED SOURCE WAVES COMPLETE.** A1-A7, B1-B6, C1-C5, and the bounded source re-audit are closed at their proven source/hosted boundaries. User-local testing remains deferred by explicit user decision. No additional feature/hardening wave should be invented without a new source-level gap.\n\n## Next Step — Pre-Local Final Source Closure Audit\n\nPerform one bounded source-only closure audit against the initial-core requirements and current A/B/C owners to confirm C5 leaves no remaining non-hardware implementation blocker. Do not start local-PC testing, VAD/model tuning, installer staging, endpoint-GUID migration, or speculative development. If no source-level blocker remains, record the stop boundary and wait for explicit target-Windows authorization.'''
text = replace_once(text, old_tail, new_tail, "C5 next-action closure")
write(NEXT_ACTION, text)

print("C5 atomic outbound activation patch applied")
