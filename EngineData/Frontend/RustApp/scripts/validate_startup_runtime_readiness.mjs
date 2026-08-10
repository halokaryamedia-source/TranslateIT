import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  main: resolve(root, "src/main.ts"),
  shell: resolve(root, "src/app/active-launcher/shell.ts"),
  shellParts: resolve(root, "src/app/active-launcher/lockedReferenceShellParts.ts"),
  settingsRenderer: resolve(root, "src/app/active-launcher/launcherSettingsRenderer.ts"),
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
  runtimeInventory: resolve(root, "src-tauri/src/commands/runtime_inventory.rs"),
  modelManifest: resolve(
    root,
    "../../Backend/LocalWorker/WorkerRuntime/model_manifest.json",
  ),
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

// Normal users choose direction only. Mode/Tone are not part of the initial Meeting or
// Text contract and must not remain as active presentation controls/labels.
forbidMarkers(source.shellParts, "mode/tone-free normal translator surface", [
  "meeting-ready-preferences",
  "text-context-summary",
  'id="textModeValue"',
  '<span>Mode</span>',
  '<span>Tone</span>',
  'Mode <strong',
  'Tone <strong',
]);
forbidMarkers(source.settingsRenderer, "simple normal Meeting settings", [
  'settingsField("Speaking mode"',
  "Push-to-Talk remains",
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
forbidMarkers(source.simpleController, "mode/tone-free active controller", [
  "textModeValue",
  "settings.runtime_profile",
  "requestMode",
  "tone: \"Auto\"",
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

// Product readiness consumes the worker's canonical direction fields. The old
// Realtime/Quality aliases may remain inside Diagnostics/worker compatibility, but they
// must not decide normal Meeting/Text readiness.
requireMarkers(source.facade, "direction-based product readiness", [
  "translationIdEnReady",
  "translationEnIdReady",
  "readiness.translation_id_en === true",
  "readiness.translation_en_id === true",
  "selectedTextDirection(settings)",
  'textDirection === "id->en"',
  'textDirection === "en->id"',
  "providerReady = asrReady && translationIdEnReady && ttsReady",
]);
forbidMarkers(source.facade, "stale mode-based product readiness", [
  "translation_realtime",
  "translation_quality",
  "realtimeTranslationReady",
  "qualityTranslationReady",
  "currentTextMode",
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

// The reliable translation core is direction-based. Worker compatibility aliases may
// remain for inherited diagnostics/preload consumers, but model selection itself is
// always language-direction based.
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

// The declarative model inventory must describe the same direction-based translation
// implementation as the worker. Reverse EN->ID is managed but intentionally optional at
// the required-outbound inventory boundary so a missing reverse asset cannot false-block
// otherwise healthy ID->EN Meeting Start.
let parsedModelManifest;
try {
  parsedModelManifest = JSON.parse(source.modelManifest);
} catch (error) {
  throw new Error(`Model manifest is not valid JSON: ${error}`);
}
const manifestModels = Array.isArray(parsedModelManifest?.models) ? parsedModelManifest.models : [];
const manifestById = new Map(manifestModels.map((item) => [item?.model_id, item]));
const manifestIdEn = manifestById.get("marianmt-id-en");
const manifestEnId = manifestById.get("marianmt-en-id");
if (!manifestIdEn || !manifestEnId) {
  throw new Error("Model manifest must contain both marianmt-id-en and marianmt-en-id translation assets");
}
if (
  manifestIdEn.required !== true ||
  manifestIdEn.stage !== "translation_id_en" ||
  manifestIdEn.expected_path !== "EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en" ||
  manifestIdEn.repo_id !== "Helsinki-NLP/opus-mt-id-en" ||
  manifestIdEn.license !== "apache-2.0"
) {
  throw new Error("ID->EN manifest entry does not match the canonical worker/source contract");
}
if (
  manifestEnId.required !== false ||
  manifestEnId.stage !== "translation_en_id" ||
  manifestEnId.expected_path !== "EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id" ||
  manifestEnId.repo_id !== "Helsinki-NLP/opus-mt-en-id" ||
  manifestEnId.license !== "apache-2.0"
) {
  throw new Error("EN->ID manifest entry must match the canonical reverse worker path without becoming required-outbound inventory");
}
if (
  manifestModels.some((item) =>
    item?.model_id === "nllb-200-distilled-600M" ||
    item?.stage === "translation_quality" ||
    item?.stage === "translation_realtime"
  )
) {
  throw new Error("Current model manifest must not retain obsolete mode-based/NLLB translation inventory");
}

requireMarkers(source.runtimeInventory, "truthful model inventory semantics", [
  "if entry.required && !found",
  'blockers.push(format!("missing_required_model:{}", entry.model_id))',
  "Optional direction/fallback assets may still be missing.",
  "Optional assets do not determine this required-assets status.",
  "installation evidence only",
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
forbidMarkers(outbound, "mode-free Meeting outbound translation", ['"mode":']);
forbidMarkers(incoming, "Meeting incoming translation", [
  "dispatch_meeting_virtual_audio_route_provider",
  'send_helper_worker_task(\n        "synthesize"',
  '"mode":',
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
  '"translation_contract"',
  'Some("canonical_bidirectional_id_en")',
  "MAX_TEXT_TRANSLATION_CHARS",
]);
forbidMarkers(source.textTranslate, "standalone Text translation", [
  "get_meeting_committed_turns",
  "MeetingCommittedTurn",
  "meeting_session_id",
  "start_live_capture_runtime",
  "TEXT_TRANSLATION_MODE",
  '"mode":',
  "Local Quality translation",
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
  "Reliable translation-core static contract is defined: the normal desktop surface is Meeting/Text/Settings without History/Saved, Mode, or Tone workflow; product readiness consumes worker ID->EN / EN->ID direction fields instead of Realtime/Quality aliases; the declarative inventory contains the same marianmt-id-en / marianmt-en-id paths as the worker with reverse EN->ID optional at the required-outbound inventory boundary and no obsolete NLLB/mode-based translation entry; required Meeting outbound depends on ID->EN while reverse remains optional; Text readiness follows its selected ID<->EN direction; normal Meeting/Text translation requests do not send mode; successful Text translation has no persistence dependency; one worker owns both directions and rejects silent truncation/incomplete generation; optional incoming cannot block required outbound; Meeting uses Start -> Live -> Stop; Stop clears runtime/transient state without History persistence; safe close remains canonical. This is static source validation only and does not prove Python/Rust/TypeScript execution, model availability/load, translation quality, latency, CUDA/CPU behavior, Windows audio, suppression effectiveness, rendered UI, or installed operation.",
);
