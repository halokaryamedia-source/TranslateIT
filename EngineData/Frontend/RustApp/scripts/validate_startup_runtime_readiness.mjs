import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "src/main.ts");
const simpleControllerPath = resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts");
const runtimeApiPath = resolve(root, "src/app/bridge/runtimeApi.ts");
const facadePath = resolve(root, "src/app/bridge/runtimeProductFacade.ts");

for (const path of [mainPath, simpleControllerPath, runtimeApiPath, facadePath]) {
  if (!existsSync(path)) {
    console.error(`Missing file: ${path}`);
    process.exit(1);
  }
}

const main = readFileSync(mainPath, "utf8");
const simpleController = readFileSync(simpleControllerPath, "utf8");
const runtimeApi = readFileSync(runtimeApiPath, "utf8");
const facade = readFileSync(facadePath, "utf8");

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
  "resetSettings",
  "handleMeetingPrimaryAction",
  'startTranslationButton.addEventListener("click"',
  "meeting.live",
  "meeting.hasSession",
]) {
  if (!simpleController.includes(marker)) throw new Error(`simple controller product-runtime marker missing: ${marker}`);
}

for (const forbidden of [
  "Start Translation is not available in this build yet.",
]) {
  if (simpleController.includes(forbidden)) throw new Error(`simple controller stale Meeting behavior remains: ${forbidden}`);
}

for (const marker of [
  '"get_meeting_session_status"',
  '"start_meeting_translation"',
  '"stop_meeting_translation"',
  "getMeetingSessionStatus",
  "startMeetingTranslation",
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
  'const APPLICATION_MEETING_OWNER_ID = "translateit_application_meeting"',
]) {
  if (!facade.includes(marker)) throw new Error(`runtime facade product-runtime marker missing: ${marker}`);
}

for (const forbidden of [
  "start_capture()",
  "stop_capture()",
]) {
  if (facade.includes(forbidden)) throw new Error(`runtime facade must not replace canonical Meeting lifecycle with direct capture calls: ${forbidden}`);
}

console.log(
  "Startup/product Meeting source-contract integrity passed: normal UI reads the canonical application Meeting session, Start/Stop route through registered Meeting commands, navigation does not own session lifecycle, and stale disabled-Start behavior is absent. This is static source proof only, not TypeScript/build, Tauri runtime, rendered UI, microphone, audio-route, or Windows proof.",
);
