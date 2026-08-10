import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "src/main.ts");
const simpleControllerPath = resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts");
const runtimeApiPath = resolve(root, "src/app/bridge/runtimeApi.ts");
const facadePath = resolve(root, "src/app/bridge/runtimeProductFacade.ts");
const registryPath = resolve(root, "src-tauri/src/commands/registry.rs");
const meetingSessionPath = resolve(root, "src-tauri/src/commands/meeting_session.rs");
const runtimeStatePath = resolve(root, "src-tauri/src/engine/runtime_state.rs");

for (const path of [
  mainPath,
  simpleControllerPath,
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
const runtimeApi = readFileSync(runtimeApiPath, "utf8");
const facade = readFileSync(facadePath, "utf8");
const registry = readFileSync(registryPath, "utf8");
const meetingSession = readFileSync(meetingSessionPath, "utf8");
const runtimeState = readFileSync(runtimeStatePath, "utf8");

for (const marker of ["SimpleLauncherController", "simple-ui-v1"]) {
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
  '"get_meeting_session_status"',
  '"start_meeting_translation"',
  '"pause_meeting_translation"',
  '"resume_meeting_translation"',
  '"stop_meeting_translation"',
  "getMeetingSessionStatus",
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
  "crate::commands::meeting_session::start_meeting_translation",
  "crate::commands::meeting_session::pause_meeting_translation",
  "crate::commands::meeting_session::resume_meeting_translation",
  "crate::commands::meeting_session::stop_meeting_translation",
]) {
  if (!registry.includes(marker)) throw new Error(`Tauri Meeting command registration marker missing: ${marker}`);
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
  "Startup/product Meeting source-contract integrity passed: one application Meeting authority exposes Start/Pause/Resume/Stop, Pause preserves the session while invalidating its generation, Resume creates fresh generation authority, and normal UI consumes that lifecycle without a second store. This is static source proof only, not TypeScript/Rust build, Tauri runtime, rendered UI, microphone, audio-route, or Windows proof.",
);
