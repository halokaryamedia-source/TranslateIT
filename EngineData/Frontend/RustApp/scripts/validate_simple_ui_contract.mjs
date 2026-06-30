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

function expect(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

function reject(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}

function expectOrder(content, before, after, label) {
  const beforeIndex = content.indexOf(before);
  const afterIndex = content.indexOf(after);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex > afterIndex) {
    errors.push(`${label}: expected ${before} before ${after}`);
  }
}

const main = file("src/main.ts");
const shell = file("src/app/active-launcher/lockedReferenceShellParts.ts");
const shellMount = file("src/app/active-launcher/shell.ts");
const controller = file("src/app/simple-launcher/SimpleLauncherController.ts");
const facade = file("src/app/bridge/runtimeProductFacade.ts");
const styles = file("src/mainPageLayout.css");
const settingsRenderer = file("src/app/active-launcher/launcherSettingsRenderer.ts");

for (const marker of ["SimpleLauncherController", "simple-ui-v1", "#app"]) expect(main, marker, "main entry");
for (const marker of ["new LauncherController", "bindDirectVoiceCaptureUi", "startRealtimeStatusPayloadAutoRefresh", "mountVirtualRouteSelectionSurface", "bindVirtualAudioRouteProviderUi"]) reject(main, marker, "main entry");

for (const marker of [
  "Translate text",
  "simple-translate-card",
  "messageInput",
  "sendButton",
  "Translate",
  "assistantMessage",
  "startHelperButton",
  "checkWorkerStatusButton",
  "checkMicButton",
  "openDeveloperDiagnosticsButton",
  "simple-voice-card",
  "microphoneButton",
  "settingsButton",
  "backHomeButton",
  "chatList",
]) expect(shell, marker, "simple shell");
for (const marker of ["feature-grid", "How can I help translate today?"]) reject(shell, marker, "simple shell");

expect(shellMount, "homeDefaultCards", "shell mount");
expect(shellMount, "return \"\";", "shell mount empty result startup");

for (const marker of [
  "bindSimpleRefs",
  "submitText",
  "runtimeProductFacade.runProductTranslation",
  "this.ui.chatList.innerHTML = translationResultView",
  "Translation completed",
  "Translation blocked",
  "runtimeProductFacade.runProductSetupAction",
  "start-helper",
  "check-worker",
  "check-microphone",
  "Voice setup is not ready",
  "showSettings",
  "renderDeveloperSettingsView",
  "saveSettings",
  "resetSettings",
  "ingestAttachmentFiles",
]) expect(controller, marker, "simple controller");

for (const marker of [
  "sendButton.addEventListener",
  "messageInput.addEventListener",
  "composerPlusButton.addEventListener",
  "startHelperButton.addEventListener",
  "checkWorkerStatusButton.addEventListener",
  "checkMicButton.addEventListener",
  "openDeveloperDiagnosticsButton.addEventListener",
  "microphoneButton.addEventListener",
  "settingsButton.addEventListener",
  "backHomeButton.addEventListener",
]) expect(controller, marker, "simple controller bindings");

expectOrder(controller, "this.ui.sendButton.disabled = true", "runtimeProductFacade.runProductTranslation", "translate button loading state");
expectOrder(controller, "runtimeProductFacade.runProductTranslation", "this.ui.chatList.innerHTML = translationResultView", "translation result render");
expectOrder(controller, "runtimeProductFacade.runProductSetupAction", "refreshReadiness", "setup feedback refresh");
reject(controller, "this.ui.sendButton.disabled = !", "translate button must stay primary and testable");

for (const marker of [
  "ProductReadiness",
  "loadProductRuntimeSnapshot",
  "runProductTranslation",
  "runtimeApi.translateText",
  "runProductSetupAction",
  "startHelperBridge",
  "getHelperBridgeStatus",
  "verifyModels",
  "getInputStatus",
]) expect(facade, marker, "runtime product facade");

for (const marker of [
  ".simple-workspace",
  ".simple-translate-grid",
  ".simple-translate-card",
  ".simple-composer textarea",
  ".simple-send-button",
  ".simple-status-card",
  ".simple-setup-actions",
  ".simple-voice-card",
  ".simple-result-area",
]) expect(styles, marker, "simple UI stylesheet");

for (const marker of ["renderGeneralSettingsTab", "renderAudioSettingsTab", "renderTranslateSettingsTab"]) expect(settingsRenderer, marker, "settings renderer");

if (errors.length > 0) {
  console.error("Simple UI contract validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Simple UI contract validation passed: one-screen translate flow, setup feedback, diagnostics escape hatch, and runtime facade wiring are present.");
