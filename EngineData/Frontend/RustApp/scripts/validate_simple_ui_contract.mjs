import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function file(relativePath) {
  const path = resolve(appRoot, relativePath);
  if (!existsSync(path)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}
function expect(content, marker, label) { if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`); }
function reject(content, marker, label) { if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`); }
function expectOrder(content, before, after, label) {
  const beforeIndex = content.indexOf(before);
  const afterIndex = content.indexOf(after);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex > afterIndex) errors.push(`${label}: expected ${before} before ${after}`);
}

const main = file("src/main.ts");
const shell = file("src/app/active-launcher/lockedReferenceShellParts.ts");
const shellMount = file("src/app/active-launcher/shell.ts");
const controller = file("src/app/simple-launcher/SimpleLauncherController.ts");
const facade = file("src/app/bridge/runtimeProductFacade.ts");
const styles = file("src/mainPageLayout.css");
const settingsRenderer = file("src/app/active-launcher/launcherSettingsRenderer.ts");
const settingsViews = file("src/app/active-launcher/settingsViews.ts");

for (const marker of ["SimpleLauncherController", "simple-ui-v1", "#app"]) expect(main, marker, "main entry");
for (const marker of ["new LauncherController", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh", "mountVirtualRouteSelectionSurface", "bindVirtualAudioRouteProviderUi"]) reject(main, marker, "main entry");

for (const marker of [
  "Meeting", "Text", "Documents", "History", "Saved", "Settings",
  "meetingWorkspace", "textWorkspace", "documentsWorkspace", "historyWorkspace", "savedWorkspace",
  "retryReadinessButton", "fixSetupButton", "openDeveloperDiagnosticsButton",
  "messageInput", "sendButton", "chatList",
]) expect(shell, marker, "product shell");
for (const marker of ["startHelperButton", "checkWorkerStatusButton", "Check Worker", ">Fast<"]) reject(shell, marker, "normal product shell");
expectOrder(shell, "meetingNavButton", "textNavButton", "primary navigation order");
expectOrder(shell, "textNavButton", "documentsNavButton", "primary navigation order");
expectOrder(shell, "documentsNavButton", "historyNavButton", "primary navigation order");
expectOrder(shell, "historyNavButton", "savedNavButton", "primary navigation order");
expectOrder(shell, "savedNavButton", "settingsButton", "primary navigation order");

expect(shellMount, "homeDefaultCards", "shell mount");
expect(shellMount, "return \"\";", "shell mount empty result startup");

for (const marker of [
  "bindSimpleRefs", "showWorkspace", "showWorkspace(\"meeting\")", "submitText",
  "runtimeProductFacade.runProductTranslation", "runtimeProductFacade.runProductRecoveryAction",
  "retryReadinessButton.addEventListener", "fixSetupButton.addEventListener",
  "openDeveloperDiagnosticsButton.addEventListener", "renderDeveloperSettingsView",
  "saveSettings", "resetSettings", "ingestAttachmentFiles",
]) expect(controller, marker, "product controller");
for (const marker of ["startHelperButton", "checkWorkerStatusButton", "recentChatButton", "localDataButton"]) reject(controller, marker, "normal controller refs");

expectOrder(controller, "this.ui.sendButton.disabled = true", "runtimeProductFacade.runProductTranslation", "translate loading state");
expectOrder(controller, "runtimeProductFacade.runProductRecoveryAction", "refreshReadiness", "product recovery refresh");

for (const marker of [
  "ProductReadiness", "meetingRouteReady", "meetingReady", "meetingStatus",
  "live_meeting_runtime_gate", "loadProductRuntimeSnapshot", "runProductTranslation",
  "runProductRecoveryAction",
]) expect(facade, marker, "runtime product facade");

for (const marker of [
  ".simple-workspace", ".simple-translate-grid", ".simple-translate-card",
  ".simple-composer textarea", ".simple-send-button", ".simple-status-card", ".simple-result-area",
]) expect(styles, marker, "product UI stylesheet");

for (const marker of ["renderGeneralSettingsTab", "renderAudioSettingsTab", "renderTranslateSettingsTab"]) expect(settingsRenderer, marker, "settings renderer");
for (const marker of ["\"Realtime\"", "Developer Diagnostics", "Session Listening"]) expect(settingsViews, marker, "settings product terminology");
reject(settingsViews, '"Fast"', "settings product terminology");

if (errors.length > 0) {
  console.error("Product shell contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Product shell contract passed: Meeting-first navigation, product recovery, Text workflow, truthful unavailable surfaces, diagnostics boundary, and runtime facade wiring are present.");
