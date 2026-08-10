import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "src/main.ts");
const shellPath = resolve(root, "src/app/active-launcher/shell.ts");
const simpleControllerPath = resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts");
const globalMeetingShellPath = resolve(root, "src/app/simple-launcher/GlobalMeetingShell.ts");
const globalMeetingShellCssPath = resolve(root, "src/globalMeetingShell.css");
const meetingActivityPath = resolve(root, "src/app/simple-launcher/MeetingLiveActivityPresentation.ts");
const meetingActivityCssPath = resolve(root, "src/meetingLiveActivity.css");
const historyCssPath = resolve(root, "src/historyLayout.css");
const historyTypesPath = resolve(root, "src/app/shared/historyTypes.ts");
const runtimeApiPath = resolve(root, "src/app/bridge/runtimeApi.ts");
const facadePath = resolve(root, "src/app/bridge/runtimeProductFacade.ts");
const registryPath = resolve(root, "src-tauri/src/commands/registry.rs");
const nativeMainPath = resolve(root, "src-tauri/src/main.rs");
const capabilityPath = resolve(root, "src-tauri/capabilities/default.json");
const meetingSessionPath = resolve(root, "src-tauri/src/commands/meeting_session.rs");
const audioCommandPath = resolve(root, "src-tauri/src/commands/audio.rs");
const helperBridgePath = resolve(root, "src-tauri/src/commands/helper_bridge.rs");
const helperBridgeRuntimePath = resolve(root, "src-tauri/src/commands/helper_bridge_runtime.rs");
const finalizedUtterancePath = resolve(root, "src-tauri/src/engine/audio/finalized_utterance.rs");
const meetingSoundCapturePath = resolve(root, "src-tauri/src/engine/audio/meeting_sound_capture.rs");
const liveSegmentWriterPath = resolve(root, "src-tauri/src/engine/audio/live_segment_writer.rs");
const runtimeStatePath = resolve(root, "src-tauri/src/engine/runtime_state.rs");
const historyStorePath = resolve(root, "src-tauri/src/engine/history_store.rs");

for (const path of [
  mainPath,
  shellPath,
  simpleControllerPath,
  globalMeetingShellPath,
  globalMeetingShellCssPath,
  meetingActivityPath,
  meetingActivityCssPath,
  historyCssPath,
  historyTypesPath,
  runtimeApiPath,
  facadePath,
  registryPath,
  nativeMainPath,
  capabilityPath,
  meetingSessionPath,
  audioCommandPath,
  helperBridgePath,
  helperBridgeRuntimePath,
  finalizedUtterancePath,
  meetingSoundCapturePath,
  liveSegmentWriterPath,
  runtimeStatePath,
  historyStorePath,
]) {
  if (!existsSync(path)) {
    console.error(`Missing file: ${path}`);
    process.exit(1);
  }
}

const main = readFileSync(mainPath, "utf8");
const shell = readFileSync(shellPath, "utf8");
const simpleController = readFileSync(simpleControllerPath, "utf8");
const globalMeetingShell = readFileSync(globalMeetingShellPath, "utf8");
const globalMeetingShellCss = readFileSync(globalMeetingShellCssPath, "utf8");
const meetingActivity = readFileSync(meetingActivityPath, "utf8");
const meetingActivityCss = readFileSync(meetingActivityCssPath, "utf8");
const historyCss = readFileSync(historyCssPath, "utf8");
const historyTypes = readFileSync(historyTypesPath, "utf8");
const runtimeApi = readFileSync(runtimeApiPath, "utf8");
const facade = readFileSync(facadePath, "utf8");
const registry = readFileSync(registryPath, "utf8");
const nativeMain = readFileSync(nativeMainPath, "utf8");
const capability = readFileSync(capabilityPath, "utf8");
const meetingSession = readFileSync(meetingSessionPath, "utf8");
const audioCommand = readFileSync(audioCommandPath, "utf8");
const helperBridge = readFileSync(helperBridgePath, "utf8");
const helperBridgeRuntime = readFileSync(helperBridgeRuntimePath, "utf8");
const finalizedUtterance = readFileSync(finalizedUtterancePath, "utf8");
const meetingSoundCapture = readFileSync(meetingSoundCapturePath, "utf8");
const liveSegmentWriter = readFileSync(liveSegmentWriterPath, "utf8");
const runtimeState = readFileSync(runtimeStatePath, "utf8");
const historyStore = readFileSync(historyStorePath, "utf8");

function requireMarkers(source, label, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
  }
}

function forbidMarkers(source, label, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
  }
}

requireMarkers(main, "main", [
  "SimpleLauncherController",
  "simple-ui-v1",
  "startMeetingLiveActivityPresentation",
  "startGlobalMeetingShell",
  'import "./globalMeetingShell.css"',
  'import "./meetingLiveActivity.css"',
  'import "./historyLayout.css"',
]);

forbidMarkers(main, "main legacy startup", [
  "startStartupReadiness",
  "bindSettingsAutosaveUi",
  "bindDirectVoiceCaptureUi",
  "startRealtimeStatusPayloadAutoRefresh",
]);

requireMarkers(shell, "global Meeting shell markup", [
  'id="globalMeetingStrip"',
  'id="globalMeetingOpenButton"',
  'id="meetingCloseDialog"',
  'id="meetingCloseKeepOpenButton"',
  'id="meetingCloseStopButton"',
  "Stop &amp; Close",
]);

requireMarkers(simpleController, "simple controller product-runtime", [
  "boot",
  "refreshReadiness",
  "renderSettings",
  "saveSettings",
  "handleMeetingPrimaryAction",
  "handleMeetingSecondaryAction",
  'startTranslationButton.addEventListener("click"',
  'retryReadinessButton.addEventListener("click"',
  "Pause Translation",
  "Resume Translation",
  "meeting.live",
  "meeting.paused",
  "meeting.hasSession",
  "appendMeetingHistoryTurn",
  'const incoming = turn.lane === "incoming"',
  'lane.textContent = incoming ? "INCOMING" : "YOU"',
  'primary.textContent = incoming ? turn.translated_text : turn.source_text',
  'secondary.textContent = incoming ? turn.source_text : turn.translated_text',
  "entry.dropped_turn_count",
  "entry.turns.forEach",
]);

forbidMarkers(simpleController, "simple controller stale behavior", [
  "Start Translation is not available in this build yet.",
  "Meeting detail is not connected yet.",
  "canonical Meeting lifecycle does not write History entries",
]);

requireMarkers(globalMeetingShell, "global Meeting shell lifecycle", [
  "GLOBAL_MEETING_REFRESH_MS",
  "runtimeApi.getMeetingSessionStatus",
  "mapProductMeetingState",
  'runtimeProductFacade.runProductMeetingAction("stop")',
  "globalMeetingStrip",
  "meetingCloseDialog",
  "meetingNavButton",
  ".onCloseRequested",
  "event.preventDefault()",
  ".destroy()",
  "meetingStatusUnavailable",
  "closeAfterExistingStop",
  "waitingForExistingStop",
  "verifyStoppedThenDestroy",
]);

forbidMarkers(globalMeetingShell, "global Meeting shell duplicate lifecycle/data", [
  "startMeetingTranslation",
  "pauseMeetingTranslation",
  "resumeMeetingTranslation",
  "stopMeetingTranslation",
  "startCapture",
  "stopCapture",
  "getMeetingCommittedTurns",
  "transcript_text",
  "translated_text",
  "worker_response_json",
]);

requireMarkers(globalMeetingShellCss, "global Meeting shell CSS", [
  ".global-meeting-strip",
  ".global-meeting-strip-open",
  ".meeting-close-dialog",
  ".meeting-close-dialog-actions",
  ".global-meeting-close-stop",
]);

if (!capability.includes('"core:window:allow-destroy"')) {
  throw new Error("main window capability must allow the verified post-Stop Window.destroy transport action");
}

requireMarkers(meetingActivity, "Meeting live activity presentation", [
  "startMeetingLiveActivityPresentation",
  "MEETING_ACTIVITY_REFRESH_MS",
  "runtimeApi.getMeetingSessionStatus",
  "runtimeApi.getMeetingCommittedTurns",
  "MeetingCommittedTurnsSnapshot",
  "mapProductMeetingState",
  "renderIncomingStatus",
  'const incoming = turn.lane === "incoming"',
  'lane.textContent = incoming ? "INCOMING" : "YOU"',
  'primary.textContent = incoming ? turn.translated_text : turn.source_text',
  'secondary.textContent = incoming ? turn.source_text : turn.translated_text',
  "orderedTurns",
  "meeting-live-incoming-state",
  "meeting-live-transcript-turn",
  "renderReadySurface",
]);

forbidMarkers(meetingActivity, "Meeting live read-only projection", [
  "startMeetingTranslation",
  "pauseMeetingTranslation",
  "resumeMeetingTranslation",
  "stopMeetingTranslation",
  "runProductMeetingAction",
  "startCapture",
  "stopCapture",
  "getLivePipelineSessionSnapshot",
  "transcript_text",
  "worker_response_json",
]);

requireMarkers(meetingActivityCss, "Meeting live activity CSS", [
  ".meeting-live-activity-presentation",
  ".meeting-live-activity-stage",
  ".meeting-live-activity-state",
  ".meeting-live-incoming-state",
  ".meeting-live-transcript",
  ".meeting-live-transcript-turn",
  ".meeting-live-transcript-source",
  ".meeting-live-transcript-translation",
]);

requireMarkers(historyCss, "Meeting History CSS", [
  ".history-meeting-turn",
  ".history-meeting-turn-header",
  ".history-meeting-lane",
  ".history-meeting-delivery",
  ".history-meeting-source",
  ".history-meeting-translation",
  ".history-meeting-truncation-note",
]);

requireMarkers(historyTypes, "History TypeScript contract", [
  "dropped_turn_count: number",
  "turns: HistoryTurn[]",
  'lane: "you" | "incoming" | string',
  "delivery_state: string | null",
  'entry_type: "meeting" | "text" | string',
]);

requireMarkers(runtimeApi, "runtimeApi canonical Meeting bridge", [
  '"get_meeting_session_status"',
  '"get_meeting_committed_turns"',
  '"start_meeting_translation"',
  '"pause_meeting_translation"',
  '"resume_meeting_translation"',
  '"stop_meeting_translation"',
  "MeetingIncomingRuntimeStatus",
  "incoming: MeetingIncomingRuntimeStatus",
  'lane: "you" | "incoming" | string',
  "generation: number | null",
  "delivery_state:",
  "getMeetingSessionStatus",
  "getMeetingCommittedTurns",
  "startMeetingTranslation",
  "pauseMeetingTranslation",
  "resumeMeetingTranslation",
  "stopMeetingTranslation",
]);

requireMarkers(facade, "runtime facade product-runtime", [
  "loadProductRuntimeSnapshot",
  "getModelInventory",
  "getGpuPolicy",
  "getInputStatus",
  "getHelperBridgeStatus",
  "getMeetingSessionStatus",
  "mapProductMeetingState",
  "runProductMeetingAction",
  'export type ProductMeetingAction = "start" | "pause" | "resume" | "stop"',
  "canPause",
  "canResume",
  'const APPLICATION_MEETING_OWNER_ID = "translateit_application_meeting"',
]);

forbidMarkers(facade, "runtime facade direct capture replacement", ["start_capture()", "stop_capture()"]);

requireMarkers(registry, "Tauri Meeting command registration", [
  "crate::commands::meeting_session::get_meeting_session_status",
  "crate::commands::meeting_session::get_meeting_committed_turns",
  "crate::commands::meeting_session::start_meeting_translation",
  "crate::commands::meeting_session::pause_meeting_translation",
  "crate::commands::meeting_session::resume_meeting_translation",
  "crate::commands::meeting_session::stop_meeting_translation",
]);

// Meeting Sound capture owns a distinct output-loopback stream, not the physical mic
// capture or a second Meeting/session/controller.
requireMarkers(meetingSoundCapture, "Meeting Sound output-loopback owner", [
  'cfg!(target_os = "windows")',
  "start_meeting_sound_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "meeting_sound_capture_status",
  "output_devices()",
  "default_output_device()",
  "default_output_config()",
  ".build_input_stream(",
  "suppression_flag.load(Ordering::Acquire)",
  "suppressed_frames",
  "reset_finalized_incoming_speech_boundary",
  "observe_finalized_incoming_",
]);
forbidMarkers(meetingSoundCapture, "Meeting Sound owner boundary", [
  ".input_devices()",
  "send_helper_worker_task",
  "commit_meeting_turn",
  "create_meeting_recent",
]);

// Shared event sequence is allocated at finalized speech boundary before either lane
// reaches AI so callback completion cannot reorder the conversation.
requireMarkers(finalizedUtterance, "dual-lane finalized Meeting boundary", [
  "pub struct FinalizedMeetingUtterance",
  "pub sequence: u64",
  "pub generation: Option<u64>",
  'const LANE_YOU: &str = "you"',
  'const LANE_INCOMING: &str = "incoming"',
  "MeetingSequenceState",
  "reset_finalized_meeting_sequence",
  "clear_finalized_meeting_sequence",
  "allocate_meeting_sequence",
  "reset_finalized_outbound_utterance_producer",
  "reset_finalized_incoming_utterance_producer",
  "wait_take_finalized_outbound_utterance",
  "wait_take_finalized_incoming_utterance",
  "reset_finalized_incoming_speech_boundary",
]);
const finalizedFunction = finalizedUtterance.slice(finalizedUtterance.indexOf("fn finalize_current_utterance("));
const sequenceIndex = finalizedFunction.indexOf("allocate_meeting_sequence");
const queueIndex = finalizedFunction.indexOf("state.pending.push_back");
if (sequenceIndex < 0 || queueIndex < 0 || sequenceIndex >= queueIndex) {
  throw new Error("Meeting speech/event sequence must be allocated before a finalized lane event is queued for AI");
}

requireMarkers(liveSegmentWriter, "lane-aware finalized Meeting WAV writer", [
  "FinalizedMeetingUtterance",
  "write_finalized_outbound_utterance_wav",
  "write_finalized_incoming_utterance_wav",
  "write_finalized_meeting_utterance_wav",
  "remove_finalized_meeting_utterance_wav",
  'utterance.lane != "you"',
  'utterance.lane != "incoming"',
  "utterance.sequence",
]);

// One helper scheduler remains, but Meeting work has explicit outbound > incoming
// priority and incoming validity is session-scoped rather than generation-scoped.
requireMarkers(helperBridgeRuntime, "helper scheduler lane priority", [
  "MeetingOutbound",
  "MeetingIncoming",
  "waiting_meeting_outbound",
  "waiting_meeting_incoming",
  "active_meeting_session_id",
  "active_meeting_lane",
]);
requireMarkers(helperBridge, "helper Meeting lane/session guards", [
  "meeting_session_id",
  "meeting_lane",
  "incoming_session_is_eligible",
  "HelperTaskPriority::MeetingOutbound",
  "HelperTaskPriority::MeetingIncoming",
  "cancel_helper_bridge_meeting_generation",
  "cancel_helper_bridge_meeting_session",
  'lane == Some("incoming")',
  "stale_meeting_request",
]);

requireMarkers(meetingSession, "canonical dual-lane Meeting session", [
  "VecDeque",
  "MAX_LIVE_COMMITTED_TURNS",
  "pub struct MeetingIncomingRuntimeStatus",
  "pub struct MeetingCommittedTurn",
  "pub generation: Option<u64>",
  "pub delivery_state: Option<String>",
  "commit_meeting_turn",
  "update_committed_turn_delivery_state",
  "interrupt_committed_turns_for_generation",
  "reset_committed_turns",
  "clear_committed_turns_for_session",
  "turns.sort_by_key(|turn| turn.sequence)",
  "pub fn get_meeting_committed_turns()",
  "start_optional_incoming_lane",
  "start_meeting_incoming_consumer",
  "process_authoritative_finalized_incoming_wav",
  '"meeting_lane": "incoming"',
  '"source_language": "en"',
  '"target_language": "id"',
  '"incoming"',
  "begin_self_output_suppression",
  "SelfOutputSuppressionGuard",
  "stop_meeting_sound_capture_runtime",
  "cancel_helper_bridge_meeting_session",
  "create_meeting_recent",
  "HistoryTurn",
  "load_settings",
  "finalize_meeting_history",
  "history_enabled",
]);

const outboundProcessIndex = meetingSession.indexOf("pub fn process_authoritative_finalized_outbound_wav(");
const incomingProcessIndex = meetingSession.indexOf("fn process_authoritative_finalized_incoming_wav(");
const outboundConsumerIndex = meetingSession.indexOf("fn start_meeting_outbound_consumer(");
if (outboundProcessIndex < 0 || incomingProcessIndex < 0 || outboundConsumerIndex < 0) {
  throw new Error("Meeting outbound/incoming processing boundaries could not be identified");
}
const outboundProcessBody = meetingSession.slice(outboundProcessIndex, incomingProcessIndex);
const incomingProcessBody = meetingSession.slice(incomingProcessIndex, outboundConsumerIndex);
requireMarkers(outboundProcessBody, "outbound Meeting processing", [
  '"meeting_generation": generation',
  '"meeting_lane": "you"',
  'Some("preparing_voice")',
  "begin_self_output_suppression",
  "dispatch_meeting_virtual_audio_route_provider",
  "drop(suppression_guard)",
]);
forbidMarkers(incomingProcessBody, "incoming Meeting processing", [
  '"meeting_generation"',
  "dispatch_meeting_virtual_audio_route_provider",
  'Some("preparing_voice")',
]);
requireMarkers(incomingProcessBody, "incoming Meeting processing", [
  '"meeting_lane": "incoming"',
  '"language": "en"',
  '"source_language": "en"',
  '"target_language": "id"',
  "incoming_session_is_eligible",
  "commit_meeting_turn",
]);

const suppressionStart = outboundProcessBody.indexOf("begin_self_output_suppression");
const routeDispatch = outboundProcessBody.indexOf("dispatch_meeting_virtual_audio_route_provider");
const suppressionEnd = outboundProcessBody.indexOf("drop(suppression_guard)");
if (suppressionStart < 0 || routeDispatch < 0 || suppressionEnd < 0 || !(suppressionStart < routeDispatch && routeDispatch < suppressionEnd)) {
  throw new Error("TranslateIT self-output suppression must cover the guarded Meeting route dispatch interval");
}

const pauseIndex = meetingSession.indexOf("pub fn pause_meeting_translation()");
const resumeIndex = meetingSession.indexOf("pub fn resume_meeting_translation()");
const stopIndex = meetingSession.indexOf("pub fn stop_meeting_translation()");
if (pauseIndex < 0 || resumeIndex < 0 || stopIndex < 0 || !(pauseIndex < resumeIndex && resumeIndex < stopIndex)) {
  throw new Error("Meeting lifecycle command ordering/source boundary could not be identified");
}
const pauseBody = meetingSession.slice(pauseIndex, resumeIndex);
const resumeBody = meetingSession.slice(resumeIndex, stopIndex);
const stopBody = meetingSession.slice(stopIndex);

for (const [label, body] of [["Pause", pauseBody], ["Resume", resumeBody]]) {
  for (const forbidden of ["finalize_meeting_history", "create_meeting_recent"]) {
    if (body.includes(forbidden)) throw new Error(`${label} must not persist Meeting History: ${forbidden}`);
  }
}
forbidMarkers(pauseBody, "Pause must retain incoming session lane", [
  "stop_meeting_sound_capture_runtime",
  "stop_meeting_incoming_consumer",
  "cancel_helper_bridge_meeting_session",
  "clear_finalized_meeting_sequence",
  "reset_finalized_meeting_sequence",
]);
requireMarkers(pauseBody, "Pause outbound-only cleanup", [
  "pause_application_meeting_session_authority",
  "cancel_helper_bridge_meeting_generation",
  "stop_live_capture_runtime",
  "stop_meeting_outbound_consumer",
  "ensure_helper_for_healthy_incoming",
]);
forbidMarkers(resumeBody, "Resume must retain healthy incoming lane/sequence", [
  "start_optional_incoming_lane",
  "reset_finalized_meeting_sequence",
  "stop_meeting_incoming_consumer",
]);
requireMarkers(resumeBody, "Resume fresh outbound generation", [
  "begin_application_meeting_session_resume",
  "start_live_capture_runtime",
  "start_meeting_outbound_consumer",
]);

const startIndex = meetingSession.indexOf("pub fn start_meeting_translation()");
const startBody = meetingSession.slice(startIndex, pauseIndex);
const outboundConsumerStart = startBody.lastIndexOf("start_meeting_outbound_consumer");
const incomingLaneStart = startBody.indexOf("start_optional_incoming_lane");
if (outboundConsumerStart < 0 || incomingLaneStart < 0 || outboundConsumerStart >= incomingLaneStart) {
  throw new Error("Required outbound consumer must be established before optional incoming lane startup");
}
requireMarkers(startBody, "Meeting Start shared conversation setup", [
  "reset_committed_turns",
  "reset_finalized_meeting_sequence",
  "reset_self_output_suppression",
  "start_optional_incoming_lane",
]);

const activeStopStart = stopBody.indexOf("let revoked = revoke_application_meeting_session_authority(");
if (activeStopStart < 0) {
  throw new Error("Active Meeting Stop path could not be identified after the idempotent already-stopped branch");
}
const activeStopBody = stopBody.slice(activeStopStart);
const stopOrder = [
  "revoke_application_meeting_session_authority",
  "interrupt_committed_turns_for_generation",
  "stop_live_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "cancel_helper_bridge_meeting_session",
  "stop_meeting_outbound_consumer",
  "stop_meeting_incoming_consumer",
  "current_committed_turn_snapshot",
  "finalize_meeting_history",
  "clear_finalized_meeting_sequence",
  "clear_committed_turns_for_session",
  "clear_runtime_session_state",
];
let previousStopIndex = -1;
for (const marker of stopOrder) {
  const markerIndex = activeStopBody.indexOf(marker);
  if (markerIndex < 0 || markerIndex <= previousStopIndex) {
    throw new Error(`Meeting Stop finalization order is missing or unsafe around: ${marker}`);
  }
  previousStopIndex = markerIndex;
}

requireMarkers(historyStore, "canonical History persistence", [
  "HISTORY_SCHEMA_VERSION: u32 = 2",
  "pub struct HistoryTurn",
  "pub struct HistoryEntry",
  "#[serde(default)]",
  "pub dropped_turn_count: u64",
  "pub fn create_meeting_recent(",
  'entry_type: "meeting".to_string()',
  'title: "Meeting Translation".to_string()',
  'get_history("recent".to_string(), entry_id.clone())',
  'message: "Meeting added to Recent History.".to_string()',
  "MAX_HISTORY_TURNS",
]);

const meetingSessionStatusBody = meetingSession.match(/pub struct MeetingSessionStatus\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
for (const forbidden of ["turns:", "source_text", "translated_text", "MeetingCommittedTurn"]) {
  if (meetingSessionStatusBody.includes(forbidden)) {
    throw new Error(`MeetingSessionStatus must remain lightweight and must not carry conversation bodies: ${forbidden}`);
  }
}
if (!meetingSessionStatusBody.includes("incoming: MeetingIncomingRuntimeStatus")) {
  throw new Error("MeetingSessionStatus should expose only body-free incoming lane status alongside outbound lifecycle status");
}

forbidMarkers(runtimeState, "runtime_state.rs conversation ownership", [
  "MeetingCommittedTurn",
  "source_text",
  "translated_text",
  "MeetingSoundCapture",
]);

requireMarkers(runtimeState, "Meeting generation authority", [
  "begin_application_meeting_session_resume",
  "pause_application_meeting_session_authority",
  'snapshot.phase = "paused"',
  'snapshot.phase = "resuming"',
]);

// Output-device probe remains preference/readiness input only; it must not become a
// competing capture/session owner.
forbidMarkers(audioCommand, "audio command Meeting ownership", [
  "commit_meeting_turn",
  "start_meeting_incoming_consumer",
]);

requireMarkers(nativeMain, "native orderly-exit Meeting safeguard", [
  ".build(tauri::generate_context!())",
  "tauri::RunEvent::ExitRequested",
  "latest_runtime_session_state",
  "commands::meeting_session::stop_meeting_translation()",
  "api.prevent_exit()",
  'get_webview_window("main")',
]);

forbidMarkers(nativeMain, "native exit duplicate cleanup", [
  "stop_live_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "cancel_helper_bridge",
  "create_meeting_recent",
  "finalize_meeting_history",
]);

console.log(
  "Startup/product Meeting source-contract integrity passed: one application Meeting authority owns lifecycle, canonical dual-lane committed turns, and History finalization; physical microphone and Meeting Sound loopback remain distinct audio owners; shared speech/event sequence is allocated before AI; incoming is session-scoped and retained across outbound Pause; TranslateIT output is suppressed from incoming capture during route playback; one helper scheduler prioritizes outbound Meeting > incoming Meeting > Text > Diagnostics; Live/History remain read-only consumers; safe Stop & Close still delegates to canonical Stop. This is static source proof only, not validator execution, TypeScript/Rust compilation, WASAPI/Windows audio behavior, self-output suppression effectiveness, model inference, rendered UI, persistence runtime, race timing, or installed-operation proof.",
);
