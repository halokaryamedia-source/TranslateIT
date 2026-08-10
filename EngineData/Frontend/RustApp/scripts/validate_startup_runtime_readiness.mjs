import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "src/main.ts");
const simpleControllerPath = resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts");
const meetingActivityPath = resolve(root, "src/app/simple-launcher/MeetingLiveActivityPresentation.ts");
const meetingActivityCssPath = resolve(root, "src/meetingLiveActivity.css");
const runtimeApiPath = resolve(root, "src/app/bridge/runtimeApi.ts");
const facadePath = resolve(root, "src/app/bridge/runtimeProductFacade.ts");
const registryPath = resolve(root, "src-tauri/src/commands/registry.rs");
const meetingSessionPath = resolve(root, "src-tauri/src/commands/meeting_session.rs");
const runtimeStatePath = resolve(root, "src-tauri/src/engine/runtime_state.rs");

for (const path of [
  mainPath,
  simpleControllerPath,
  meetingActivityPath,
  meetingActivityCssPath,
  runtimeApiPath,
  facadePath,
  registryPath,
  meetingSessionPath,
  runtimeStatePath,
]) {
  if (!existsSync(path)) {
    console.error(`Missing file: ${path}`);
    process.exit(1);
  }
}

const main = readFileSync(mainPath, "utf8");
const simpleController = readFileSync(simpleControllerPath, "utf8");
const meetingActivity = readFileSync(meetingActivityPath, "utf8");
const meetingActivityCss = readFileSync(meetingActivityCssPath, "utf8");
const runtimeApi = readFileSync(runtimeApiPath, "utf8");
const facade = readFileSync(facadePath, "utf8");
const registry = readFileSync(registryPath, "utf8");
const meetingSession = readFileSync(meetingSessionPath, "utf8");
const runtimeState = readFileSync(runtimeStatePath, "utf8");

for (const marker of [
  "SimpleLauncherController",
  "simple-ui-v1",
  "startMeetingLiveActivityPresentation",
  'import "./meetingLiveActivity.css"',
]) {
  if (!main.includes(marker)) throw new Error(`main marker missing: ${marker}`);
}

for (const forbidden of ["startStartupReadiness", "bindSettingsAutosaveUi", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh"]) {
  if (main.includes(forbidden)) throw new Error(`main must not re-enable legacy startup binding: ${forbidden}`);
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
]) {
  if (!simpleController.includes(marker)) throw new Error(`simple controller product-runtime marker missing: ${marker}`);
}

if (simpleController.includes("Start Translation is not available in this build yet.")) {
  throw new Error("simple controller stale disabled-Start behavior remains");
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
]) {
  if (!meetingSession.includes(marker)) throw new Error(`Canonical committed Meeting turn marker missing: ${marker}`);
}

for (const forbidden of ["history_store", "HistoryEntry", "create_text_recent", "history_enabled"]) {
  if (meetingSession.includes(forbidden)) {
    throw new Error(`Live committed Meeting turn owner must not persist directly to History in this slice: ${forbidden}`);
  }
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

console.log(
  "Startup/product Meeting source-contract integrity passed: one application Meeting authority owns Start/Pause/Resume/Stop and one bounded backend committed-turn source, while the normal Meeting transcript reads that source without frontend accumulation, History persistence, worker/Diagnostics scraping, or conversation bodies in lifecycle status. This is static source proof only, not TypeScript/Rust build, validator execution, Tauri runtime, rendered UI, microphone, audio-route, or Windows proof.",
);
