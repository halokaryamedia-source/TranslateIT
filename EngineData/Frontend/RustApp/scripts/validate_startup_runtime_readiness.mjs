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
const meetingSessionPath = resolve(root, "src-tauri/src/commands/meeting_session.rs");
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
  meetingSessionPath,
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
const meetingSession = readFileSync(meetingSessionPath, "utf8");
const runtimeState = readFileSync(runtimeStatePath, "utf8");
const historyStore = readFileSync(historyStorePath, "utf8");

for (const marker of [
  "SimpleLauncherController",
  "simple-ui-v1",
  "startMeetingLiveActivityPresentation",
  "startGlobalMeetingShell",
  'import "./globalMeetingShell.css"',
  'import "./meetingLiveActivity.css"',
  'import "./historyLayout.css"',
]) {
  if (!main.includes(marker)) throw new Error(`main marker missing: ${marker}`);
}

for (const forbidden of ["startStartupReadiness", "bindSettingsAutosaveUi", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh"]) {
  if (main.includes(forbidden)) throw new Error(`main must not re-enable legacy startup binding: ${forbidden}`);
}

for (const marker of [
  'id="globalMeetingStrip"',
  'id="globalMeetingOpenButton"',
  'id="meetingCloseDialog"',
  'id="meetingCloseKeepOpenButton"',
  'id="meetingCloseStopButton"',
  "Stop &amp; Close",
]) {
  if (!shell.includes(marker)) throw new Error(`global Meeting shell markup missing: ${marker}`);
}

for (const marker of [
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
  "historyDeliveryLabel",
  "history-meeting-turn",
  "entry.dropped_turn_count",
  "entry.turns.forEach",
]) {
  if (!simpleController.includes(marker)) throw new Error(`simple controller product-runtime marker missing: ${marker}`);
}

for (const forbidden of [
  "Start Translation is not available in this build yet.",
  "Meeting detail is not connected yet.",
  "canonical Meeting lifecycle does not write History entries",
]) {
  if (simpleController.includes(forbidden)) throw new Error(`simple controller stale behavior remains: ${forbidden}`);
}

for (const marker of [
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
]) {
  if (!globalMeetingShell.includes(marker)) throw new Error(`global Meeting shell lifecycle marker missing: ${marker}`);
}

for (const forbidden of [
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
]) {
  if (globalMeetingShell.includes(forbidden)) {
    throw new Error(`global Meeting shell must not create a parallel Meeting control/data path: ${forbidden}`);
  }
}

for (const marker of [
  ".global-meeting-strip",
  ".global-meeting-strip-open",
  ".meeting-close-dialog",
  ".meeting-close-dialog-actions",
  ".global-meeting-close-stop",
]) {
  if (!globalMeetingShellCss.includes(marker)) throw new Error(`global Meeting shell CSS marker missing: ${marker}`);
}

for (const marker of [
  "startMeetingLiveActivityPresentation",
  "MEETING_ACTIVITY_REFRESH_MS",
  "runtimeApi.getMeetingSessionStatus",
  "runtimeApi.getMeetingCommittedTurns",
  "MeetingCommittedTurnsSnapshot",
  "mapProductMeetingState",
  "outbound.stage",
  "renderCommittedTurns",
  "snapshot.session_id !== status.session_id",
  "meeting-live-activity-presentation",
  "meeting-live-transcript-turn",
  "renderReadySurface",
]) {
  if (!meetingActivity.includes(marker)) throw new Error(`Meeting live activity presentation marker missing: ${marker}`);
}

for (const forbidden of [
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
]) {
  if (meetingActivity.includes(forbidden)) {
    throw new Error(`Meeting live transcript presentation must remain a read-only projection of canonical committed turns: ${forbidden}`);
  }
}

for (const marker of [
  ".meeting-live-activity-presentation",
  ".meeting-live-activity-stage",
  ".meeting-live-activity-state",
  ".meeting-live-transcript",
  ".meeting-live-transcript-turn",
  ".meeting-live-transcript-source",
  ".meeting-live-transcript-translation",
]) {
  if (!meetingActivityCss.includes(marker)) throw new Error(`Meeting live activity CSS marker missing: ${marker}`);
}

for (const marker of [
  ".history-meeting-turn",
  ".history-meeting-turn-header",
  ".history-meeting-lane",
  ".history-meeting-delivery",
  ".history-meeting-source",
  ".history-meeting-translation",
  ".history-meeting-truncation-note",
]) {
  if (!historyCss.includes(marker)) throw new Error(`Meeting History CSS marker missing: ${marker}`);
}

for (const marker of [
  "dropped_turn_count: number",
  "turns: HistoryTurn[]",
  'entry_type: "meeting" | "text" | string',
]) {
  if (!historyTypes.includes(marker)) throw new Error(`History TypeScript contract marker missing: ${marker}`);
}

for (const marker of [
  '"get_meeting_session_status"',
  '"get_meeting_committed_turns"',
  '"start_meeting_translation"',
  '"pause_meeting_translation"',
  '"resume_meeting_translation"',
  '"stop_meeting_translation"',
  "MeetingCommittedTurn",
  "MeetingCommittedTurnsSnapshot",
  "getMeetingSessionStatus",
  "getMeetingCommittedTurns",
  "startMeetingTranslation",
  "pauseMeetingTranslation",
  "resumeMeetingTranslation",
  "stopMeetingTranslation",
]) {
  if (!runtimeApi.includes(marker)) throw new Error(`runtimeApi canonical Meeting bridge marker missing: ${marker}`);
}

for (const marker of [
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
]) {
  if (!facade.includes(marker)) throw new Error(`runtime facade product-runtime marker missing: ${marker}`);
}

for (const forbidden of ["start_capture()", "stop_capture()"]) {
  if (facade.includes(forbidden)) throw new Error(`runtime facade must not replace canonical Meeting lifecycle with direct capture calls: ${forbidden}`);
}

for (const marker of [
  "crate::commands::meeting_session::get_meeting_session_status",
  "crate::commands::meeting_session::get_meeting_committed_turns",
  "crate::commands::meeting_session::start_meeting_translation",
  "crate::commands::meeting_session::pause_meeting_translation",
  "crate::commands::meeting_session::resume_meeting_translation",
  "crate::commands::meeting_session::stop_meeting_translation",
]) {
  if (!registry.includes(marker)) throw new Error(`Tauri Meeting command registration marker missing: ${marker}`);
}

for (const marker of [
  "VecDeque",
  "MAX_LIVE_COMMITTED_TURNS",
  "pub struct MeetingCommittedTurn",
  "pub struct MeetingCommittedTurnsSnapshot",
  "commit_meeting_turn",
  "update_committed_turn_delivery_state",
  "interrupt_committed_turns_for_generation",
  "reset_committed_turns",
  "clear_committed_turns_for_session",
  "pub fn get_meeting_committed_turns()",
  'delivery_state: "preparing_voice"',
  '"speaking"',
  '"output_complete"',
  '"output_failed"',
  '"interrupted"',
  "dropped_turn_count",
  "create_meeting_recent",
  "HistoryTurn",
  "load_settings",
  "finalize_meeting_history",
  "history_enabled",
]) {
  if (!meetingSession.includes(marker)) throw new Error(`Canonical Meeting transcript/finalization marker missing: ${marker}`);
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

const stopOrder = [
  "revoke_application_meeting_session_authority",
  "interrupt_committed_turns_for_generation",
  "stop_meeting_outbound_consumer",
  "current_committed_turn_snapshot",
  "finalize_meeting_history",
  "clear_committed_turns_for_session",
  "clear_runtime_session_state",
];
let previousStopIndex = -1;
for (const marker of stopOrder) {
  const markerIndex = stopBody.indexOf(marker);
  if (markerIndex < 0 || markerIndex <= previousStopIndex) {
    throw new Error(`Meeting Stop finalization order is missing or unsafe around: ${marker}`);
  }
  previousStopIndex = markerIndex;
}

for (const marker of [
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
]) {
  if (!historyStore.includes(marker)) throw new Error(`Canonical History persistence marker missing: ${marker}`);
}

const meetingSessionStatusBody = meetingSession.match(/pub struct MeetingSessionStatus\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
for (const forbidden of ["turns:", "source_text", "translated_text", "MeetingCommittedTurn"]) {
  if (meetingSessionStatusBody.includes(forbidden)) {
    throw new Error(`MeetingSessionStatus must remain lightweight and must not carry conversation bodies: ${forbidden}`);
  }
}

for (const forbidden of ["MeetingCommittedTurn", "source_text", "translated_text"]) {
  if (runtimeState.includes(forbidden)) {
    throw new Error(`runtime_state.rs must remain lifecycle/generation authority only: ${forbidden}`);
  }
}

for (const marker of [
  "pub fn pause_meeting_translation()",
  "pub fn resume_meeting_translation()",
  "cancel_helper_bridge_meeting_generation",
  "rollback_resume_to_paused",
  "start_meeting_outbound_consumer",
]) {
  if (!meetingSession.includes(marker)) throw new Error(`Meeting lifecycle implementation marker missing: ${marker}`);
}

for (const marker of [
  "begin_application_meeting_session_resume",
  "pause_application_meeting_session_authority",
  'snapshot.phase = "paused"',
  'snapshot.phase = "resuming"',
]) {
  if (!runtimeState.includes(marker)) throw new Error(`Meeting generation authority marker missing: ${marker}`);
}

for (const marker of [
  ".build(tauri::generate_context!())",
  "tauri::RunEvent::ExitRequested",
  "latest_runtime_session_state",
  "commands::meeting_session::stop_meeting_translation()",
  "api.prevent_exit()",
  'get_webview_window("main")',
]) {
  if (!nativeMain.includes(marker)) throw new Error(`native orderly-exit Meeting safeguard missing: ${marker}`);
}

for (const forbidden of [
  "stop_live_capture_runtime",
  "cancel_helper_bridge",
  "create_meeting_recent",
  "finalize_meeting_history",
]) {
  if (nativeMain.includes(forbidden)) {
    throw new Error(`native exit fail-safe must delegate to canonical Meeting Stop instead of duplicating cleanup: ${forbidden}`);
  }
}

console.log(
  "Startup/product Meeting source-contract integrity passed: one application Meeting authority owns lifecycle, transcript, and History finalization; the global shell reads canonical status only, Stop & Close delegates to the existing Stop action and destroys the window only after verified session clear, and orderly native exit delegates to that same backend Stop owner. This is static source proof only, not TypeScript/Rust build, validator execution, native close-event behavior, rendered UI, persistence runtime, microphone, audio-route, or Windows proof.",
);
