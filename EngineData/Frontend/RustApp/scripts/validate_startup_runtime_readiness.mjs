import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  main: resolve(root, "src/main.ts"),
  shell: resolve(root, "src/app/active-launcher/shell.ts"),
  shellParts: resolve(root, "src/app/active-launcher/lockedReferenceShellParts.ts"),
  simpleController: resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts"),
  globalMeetingShell: resolve(root, "src/app/simple-launcher/GlobalMeetingShell.ts"),
  meetingActivity: resolve(root, "src/app/simple-launcher/MeetingLiveActivityPresentation.ts"),
  runtimeApi: resolve(root, "src/app/bridge/runtimeApi.ts"),
  facade: resolve(root, "src/app/bridge/runtimeProductFacade.ts"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
  nativeMain: resolve(root, "src-tauri/src/main.rs"),
  capability: resolve(root, "src-tauri/capabilities/default.json"),
  meetingSession: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  runtimeState: resolve(root, "src-tauri/src/engine/runtime_state.rs"),
  helperBridge: resolve(root, "src-tauri/src/commands/helper_bridge.rs"),
  helperBridgeRuntime: resolve(root, "src-tauri/src/commands/helper_bridge_runtime.rs"),
  finalizedUtterance: resolve(root, "src-tauri/src/engine/audio/finalized_utterance.rs"),
  liveCapture: resolve(root, "src-tauri/src/engine/audio/live_capture.rs"),
  meetingSoundCapture: resolve(root, "src-tauri/src/engine/audio/meeting_sound_capture.rs"),
  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),
  worker: resolve(
    root,
    "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
  ),
};

for (const [label, path] of Object.entries(paths)) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}: ${path}`);
    process.exit(1);
  }
}

const source = Object.fromEntries(
  Object.entries(paths).map(([label, path]) => [label, readFileSync(path, "utf8")]),
);

function requireMarkers(body, label, markers) {
  for (const marker of markers) {
    if (!body.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
  }
}

function forbidMarkers(body, label, markers) {
  for (const marker of markers) {
    if (body.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
  }
}

requireMarkers(source.main, "desktop entrypoint", [
  "SimpleLauncherController",
  "startMeetingLiveActivityPresentation",
  "startGlobalMeetingShell",
]);
forbidMarkers(source.main, "desktop entrypoint", [
  "startStartupReadiness",
  "bindSettingsAutosaveUi",
  "bindDirectVoiceCaptureUi",
]);

// Initial normal product surface is intentionally small: Meeting / Text / Settings.
// Existing backend persistence commands may remain disconnected, but the active shell,
// controller, and frontend bridge must not expose History/Saved workflow.
requireMarkers(source.shellParts, "initial desktop navigation", [
  'id="meetingNavButton"',
  'data-workspace-nav="meeting"',
  'id="textNavButton"',
  'data-workspace-nav="text"',
  'id="settingsButton"',
  'tab: "meeting"',
  'tab: "advanced"',
]);
forbidMarkers(source.shellParts, "History-free initial desktop surface", [
  'id="historyNavButton"',
  'data-workspace-nav="history"',
  'id="historyWorkspace"',
  'data-workspace-panel="history"',
  'tab: "history"',
  "History & Privacy",
  'id="historyRetentionNote"',
]);

requireMarkers(source.simpleController, "primary controller", [
  'type ProductWorkspace = "meeting" | "text"',
  'type ProductSettingsTab = "meeting" | "advanced"',
  "handleMeetingPrimaryAction",
  'startTranslationButton.addEventListener("click"',
  "submitText",
  '"Stop Translation"',
  '"Start Translation"',
]);
forbidMarkers(source.simpleController, "simple Meeting lifecycle", [
  "handleMeetingSecondaryAction",
  '"Pause Translation"',
  '"Resume Translation"',
  ".canPause",
  ".canResume",
  ".paused",
]);
forbidMarkers(source.simpleController, "History-free active controller", [
  "historyTypes",
  "writeTextRecentHistory",
  "createTextHistoryEntry",
  "listHistoryEntries",
  "getHistoryEntry",
  "saveHistoryEntry",
  "removeSavedHistoryEntry",
  "clearRecentHistory",
  "historyScope",
  "historyDetailEntry",
  'renderSettings("history")',
]);

requireMarkers(source.runtimeApi, "canonical frontend bridge", [
  '"get_meeting_session_status"',
  '"get_meeting_committed_turns"',
  '"start_meeting_translation"',
  '"stop_meeting_translation"',
  "translateText",
]);
forbidMarkers(source.runtimeApi, "simple Meeting bridge", [
  "pauseMeetingTranslation",
  "resumeMeetingTranslation",
  '"pause_meeting_translation"',
  '"resume_meeting_translation"',
]);
forbidMarkers(source.runtimeApi, "History-free active frontend bridge", [
  "shared/historyTypes",
  "createTextHistoryEntry",
  "listHistoryEntries",
  "getHistoryEntry",
  "saveHistoryEntry",
  "removeSavedHistoryEntry",
  "clearRecentHistory",
  '"create_text_history_entry"',
  '"list_history_entries"',
  '"get_history_entry"',
  '"save_history_entry"',
  '"remove_saved_history_entry"',
  '"clear_recent_history"',
]);

requireMarkers(source.facade, "product runtime facade", [
  "getMeetingSessionStatus",
  "mapProductMeetingState",
  "runProductMeetingAction",
  'export type ProductMeetingAction = "start" | "stop"',
]);
forbidMarkers(source.facade, "simple Meeting facade", [
  "canPause",
  "canResume",
  "paused:",
  "meeting.paused",
  'action === "pause"',
  'action === "resume"',
  'lifecycle === "paused"',
  'lifecycle === "resuming"',
  "start_capture()",
  "stop_capture()",
]);

requireMarkers(source.registry, "Tauri Meeting registration", [
  "crate::commands::meeting_session::get_meeting_session_status",
  "crate::commands::meeting_session::get_meeting_committed_turns",
  "crate::commands::meeting_session::start_meeting_translation",
  "crate::commands::meeting_session::stop_meeting_translation",
]);
forbidMarkers(source.registry, "simple Meeting registration", [
  "meeting_session::pause_meeting_translation",
  "meeting_session::resume_meeting_translation",
]);

// Canonical application Meeting lifecycle is Start -> Live -> Stop. Runtime state may
// still contain inherited non-Meeting session phases for legacy/Diagnostics owners, but
// it must not retain paused/resuming generation machinery for the application Meeting.
requireMarkers(source.runtimeState, "application Meeting runtime lifecycle", [
  "begin_application_meeting_session",
  'phase: "starting".to_string()',
  "commit_application_meeting_session_live",
  'snapshot.phase = "live".to_string()',
  "revoke_application_meeting_session_authority",
  'snapshot.phase = "stopping".to_string()',
  "runtime_generation_is_authoritative",
]);
forbidMarkers(source.runtimeState, "application Meeting runtime lifecycle", [
  "begin_application_meeting_session_resume",
  "pause_application_meeting_session_authority",
  'phase: "paused"',
  'phase: "resuming"',
  'snapshot.phase = "paused"',
]);

forbidMarkers(source.meetingSession, "simple Meeting command lifecycle", [
  "pause_meeting_translation",
  "resume_meeting_translation",
  "rollback_resume_to_paused",
  "ensure_helper_for_healthy_incoming",
  "begin_application_meeting_session_resume",
  "pause_application_meeting_session_authority",
  'snapshot.phase.as_str(), "live" | "paused" | "resuming"',
]);
requireMarkers(source.meetingSession, "simple Meeting lane eligibility", [
  'snapshot.phase == "live"',
]);

forbidMarkers(source.meetingActivity, "simple Meeting activity presentation", [
  '"Paused"',
  '"Resuming"',
  "meeting.paused",
  'meeting.lifecycle === "resuming"',
]);
forbidMarkers(source.globalMeetingShell, "simple global Meeting presentation", [
  "meeting.paused",
  'meeting.lifecycle === "resuming"',
  "Translation is paused",
  "Resuming translation",
]);

// The reliable translation core is direction-based. Product callers may still carry a
// temporary mode field until the later caller-pruning slice, but mode must not choose
// the translation model inside the worker.
requireMarkers(source.worker, "bidirectional translation worker", [
  'TRANSLATION_MODEL_ID_EN = TRANSLATION_MODEL_ROOT / "marianmt-id-en"',
  'TRANSLATION_MODEL_EN_ID = TRANSLATION_MODEL_ROOT / "marianmt-en-id"',
  "def translation_model_for_direction(",
  'if pair == "id->en"',
  'if pair == "en->id"',
  "def get_translation_runtime(source_language: str, target_language: str)",
  "TRANSLATION_RUNTIME[pair] = runtime",
  '"translation_id_en"',
  '"translation_en_id"',
  '"translation_bidirectional"',
  '"translation_contract": "canonical_bidirectional_id_en"',
  "tokenizer(text, return_tensors=\"pt\", truncation=False)",
  "translation_input_token_limit",
  "translation_generation_completion",
  '"translation:input_too_long_for_model"',
  '"translation:output_hit_token_ceiling_without_eos"',
  '"translation:direction_not_supported"',
]);
forbidMarkers(source.worker, "bidirectional translation worker", [
  "QUALITY_TRANSLATION_MODEL",
  "NLLB_LANGUAGE_CODES",
  "nllb_generate_kwargs",
  "translation_model_for_mode",
  "realtime_direction_supported",
  "translation:direction_not_supported_by_realtime_model",
]);

const workerTranslateIndex = source.worker.indexOf("def handle_translate(");
const workerTtsIndex = source.worker.indexOf("def handle_tts_preflight(");
if (workerTranslateIndex < 0 || workerTtsIndex <= workerTranslateIndex) {
  throw new Error("Worker translation boundary could not be identified");
}
const workerTranslate = source.worker.slice(workerTranslateIndex, workerTtsIndex);
const directionSelectIndex = workerTranslate.indexOf("translation_model_for_direction");
const runtimeLoadIndex = workerTranslate.indexOf("get_translation_runtime");
const tokenizeIndex = workerTranslate.indexOf('tokenizer(text, return_tensors="pt", truncation=False)');
const completionIndex = workerTranslate.indexOf("translation_generation_completion");
const decodeIndex = workerTranslate.indexOf("tokenizer.batch_decode");
if (
  directionSelectIndex < 0 ||
  runtimeLoadIndex <= directionSelectIndex ||
  tokenizeIndex <= runtimeLoadIndex ||
  completionIndex <= tokenizeIndex ||
  decodeIndex <= completionIndex
) {
  throw new Error(
    "Translation must select direction before inference, reject unsafe input without truncation, verify generation completion, then decode/promote output",
  );
}

requireMarkers(source.worker, "worker readiness split", [
  "translation_id_en_ready = translation_model_ready(TRANSLATION_MODEL_ID_EN)",
  "translation_en_id_ready = translation_model_ready(TRANSLATION_MODEL_EN_ID)",
  "translation_bidirectional_ready = translation_id_en_ready and translation_en_id_ready",
  "and translation_id_en_ready",
  "model:marianmt_en_id_missing_reverse_translation_unavailable",
]);

requireMarkers(source.helperBridgeRuntime, "one helper scheduler", [
  "static HELPER_SCHEDULER",
  "MeetingOutbound",
  "MeetingIncoming",
  "Text",
  "Diagnostic",
  "waiting_meeting_outbound",
  "waiting_meeting_incoming",
]);

requireMarkers(source.helperBridge, "helper request authority", [
  "send_helper_worker_task",
  "meeting_generation",
  "meeting_session_id",
  "meeting_lane",
  "stale_meeting_request",
]);

const outboundStart = source.meetingSession.indexOf(
  "pub fn process_authoritative_finalized_outbound_wav(",
);
const incomingStart = source.meetingSession.indexOf(
  "fn process_authoritative_finalized_incoming_wav(",
);
const consumerStart = source.meetingSession.indexOf("fn start_meeting_outbound_consumer(");
if (outboundStart < 0 || incomingStart <= outboundStart || consumerStart <= incomingStart) {
  throw new Error("Meeting outbound/incoming translation boundaries could not be identified");
}
const outbound = source.meetingSession.slice(outboundStart, incomingStart);
const incoming = source.meetingSession.slice(incomingStart, consumerStart);
requireMarkers(outbound, "Meeting outbound translation", [
  'send_helper_worker_task(\n        "translate"',
  '"source_language": "id"',
  '"target_language": "en"',
]);
requireMarkers(incoming, "Meeting incoming translation", [
  'send_helper_worker_task(\n        "translate"',
  '"source_language": "en"',
  '"target_language": "id"',
]);
forbidMarkers(incoming, "Meeting incoming translation", [
  "dispatch_meeting_virtual_audio_route_provider",
  'send_helper_worker_task(\n        "synthesize"',
]);

requireMarkers(source.meetingSession, "incoming subordinate failure policy", [
  "fn disable_optional_incoming_for_outbound(session_id: &str) -> String",
  "clear_finalized_incoming_utterance_producer();",
  "stop_meeting_sound_capture_runtime();",
  '"disabled"',
  '"meeting_incoming:self_output_suppression_unavailable"',
  "status.stage == \"disabled\"",
]);
requireMarkers(outbound, "nonblocking outbound suppression path", [
  "let suppression_guard = match begin_self_output_suppression(session_id)",
  "disable_optional_incoming_for_outbound(session_id)",
  "dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation)",
  "drop(suppression_guard)",
]);
forbidMarkers(outbound, "nonblocking outbound suppression path", [
  'state: "suppression_unavailable".to_string()',
  '"meeting_outbound:self_output_suppression_unavailable"',
  '"meeting_outbound_suppression_gate_required_before_delivery"',
]);
const suppressionStart = outbound.indexOf("begin_self_output_suppression(session_id)");
const disableIncoming = outbound.indexOf("disable_optional_incoming_for_outbound(session_id)");
const routeDispatch = outbound.indexOf(
  "dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation)",
);
const suppressionDrop = outbound.indexOf("drop(suppression_guard)");
if (
  suppressionStart < 0 ||
  disableIncoming <= suppressionStart ||
  routeDispatch <= disableIncoming ||
  suppressionDrop <= routeDispatch
) {
  throw new Error(
    "Outbound delivery must attempt healthy incoming suppression, disable optional incoming on suppression failure, then route once and release any active guard",
  );
}

requireMarkers(source.textTranslate, "standalone Text translation", [
  'send_helper_worker_task("translate", payload)',
  '"source_language": settings.source_language',
  '"target_language": settings.target_language',
  "MAX_TEXT_TRANSLATION_CHARS",
]);
forbidMarkers(source.textTranslate, "standalone Text translation", [
  "get_meeting_committed_turns",
  "MeetingCommittedTurn",
  "meeting_session_id",
  "start_live_capture_runtime",
]);

// Text completion is a translation result only. Persistence cannot become a hidden
// post-success dependency in the active controller or bridge.
requireMarkers(source.simpleController, "standalone Text success path", [
  "const result = await runtimeProductFacade.runProductTranslation(requestSource)",
  'this.notice("Translation completed.")',
]);
forbidMarkers(source.simpleController, "Text persistence independence", [
  "historyWarning",
  "writeTextRecentHistory",
  "createTextHistoryEntry",
]);

requireMarkers(source.finalizedUtterance, "finalized speech owner", [
  "FinalizedMeetingUtterance",
  "session_id",
  "utterance_id",
  "sequence",
  "wait_take_finalized_outbound_utterance",
]);
requireMarkers(source.meetingSession, "canonical Meeting session", [
  "APPLICATION_MEETING_OWNER_ID",
  "MeetingCommittedTurn",
  "start_meeting_translation",
  "stop_meeting_translation",
  "runtime_generation_is_authoritative",
]);

forbidMarkers(source.meetingSession, "Meeting Stop persistence independence", [
  "create_meeting_recent",
  "HistoryTurn",
  "finalize_meeting_history",
  "history_enabled",
  "use crate::engine::load_settings",
]);
const stopStart = source.meetingSession.indexOf("pub fn stop_meeting_translation()");
if (stopStart < 0) throw new Error("Canonical Meeting Stop boundary could not be identified");
const stopBody = source.meetingSession.slice(stopStart);
requireMarkers(stopBody, "Meeting Stop transient cleanup", [
  "revoke_application_meeting_session_authority",
  "stop_live_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "cancel_helper_bridge_meeting_session",
  "stop_meeting_outbound_consumer",
  "stop_meeting_incoming_consumer",
  "clear_self_output_suppression_for_session",
  "clear_finalized_meeting_sequence",
  "clear_committed_turns_for_session",
  "clear_runtime_session_state",
]);
forbidMarkers(stopBody, "Meeting Stop persistence independence", [
  "current_committed_turn_snapshot",
  "create_meeting_recent",
  "finalize_meeting_history",
  "History:",
]);
const revokeIndex = stopBody.indexOf("revoke_application_meeting_session_authority");
const clearTurnsIndex = stopBody.indexOf("clear_committed_turns_for_session");
const clearSessionIndex = stopBody.indexOf("clear_runtime_session_state");
if (revokeIndex < 0 || clearTurnsIndex <= revokeIndex || clearSessionIndex <= clearTurnsIndex) {
  throw new Error(
    "Meeting Stop must revoke output authority before clearing transient turns and final session state",
  );
}

requireMarkers(source.liveCapture, "physical microphone owner", [
  "start_live_capture_runtime",
  "stop_live_capture_runtime",
]);
requireMarkers(source.meetingSoundCapture, "optional Meeting Sound owner", [
  "start_meeting_sound_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "output_devices()",
  ".build_input_stream(",
]);

requireMarkers(source.globalMeetingShell, "safe close shell", [
  ".onCloseRequested",
  "event.preventDefault()",
  'runtimeProductFacade.runProductMeetingAction("stop")',
  ".destroy()",
]);
requireMarkers(source.nativeMain, "native exit fail-safe", [
  "tauri::RunEvent::ExitRequested",
  "commands::meeting_session::stop_meeting_translation()",
  "api.prevent_exit()",
]);
forbidMarkers(source.nativeMain, "native exit duplicate cleanup", [
  "stop_live_capture_runtime",
  "stop_meeting_sound_capture_runtime",
  "create_meeting_recent",
]);
if (!source.capability.includes('"core:window:allow-destroy"')) {
  throw new Error("Main window capability must allow post-Stop Window.destroy transport");
}

requireMarkers(source.meetingActivity, "Meeting live presentation", [
  "runtimeApi.getMeetingSessionStatus",
  "runtimeApi.getMeetingCommittedTurns",
  "renderCommittedTurns",
]);
forbidMarkers(source.meetingActivity, "Meeting live presentation", [
  "startMeetingTranslation",
  "stopMeetingTranslation",
  "send_helper_worker_task",
]);

console.log(
  "Reliable translation-core static contract is defined: the active desktop surface is Meeting/Text/Settings without History/Saved workflow, successful Text translation has no History persistence dependency, one worker routes ID->EN and EN->ID by language direction, input is not silently truncated, incomplete generation is not promoted, Meeting and Text use the same translation task, required outbound readiness remains distinct from optional incoming readiness, optional incoming suppression failure disables/ignores incoming instead of rejecting required outbound TTS, Meeting uses the simple Start -> Live -> Stop product lifecycle, Stop clears runtime/transient state without History persistence, and safe Meeting/session ownership is preserved. Backend deferred persistence commands are intentionally not treated as active product surface. This is static source validation only and does not prove Python/Rust/TypeScript execution, model availability/load, translation quality, latency, CUDA/CPU behavior, Windows audio, suppression effectiveness, rendered UI, or installed operation.",
);
