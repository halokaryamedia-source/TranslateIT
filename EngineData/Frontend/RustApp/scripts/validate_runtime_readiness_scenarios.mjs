import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(relativePath) {
  const path = resolve(appRoot, relativePath);
  if (!existsSync(path)) {
    errors.push(`Missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}
function expect(source, marker, label) {
  if (!source.includes(marker)) errors.push(`${label}: missing ${marker}`);
}
function reject(source, marker, label) {
  if (source.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}

const facade = read("src/app/bridge/runtimeProductFacade.ts");
const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");

for (const marker of [
  "ProductReadinessLevel",
  "ProductReadiness",
  "textReady",
  "helperReady",
  "providerReady",
  "microphoneReady",
  "modelsReady",
  "voiceReady",
  "canTranslateText",
  "canRecordVoice",
  "recording",
  "nextAction",
  "blockers",
  "summary",
]) expect(facade, marker, "readiness model");

for (const marker of [
  "helper?.state === \"ready\"",
  "provider_ready",
  "ready_for_capture_start",
  "modelReady",
  "ready_for_user_facing_runtime",
  "voiceReady ? \"ready\"",
  "textReady ? \"partial\"",
  "\"blocked\"",
  "\"checking\"",
]) expect(facade, marker, "readiness scenario mapping");

for (const marker of [
  "Text and voice runtime appear ready.",
  "Text translation can be tested. Voice needs setup or provider evidence.",
  "Runtime is blocked:",
  "Runtime status is still loading.",
  "Voice setup needed",
  "Microphone not checked",
  "Models need setup",
  "Helper not ready",
]) expect(facade, marker, "readiness user message");

for (const marker of [
  "this.snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot()",
  "readiness.level === \"ready\"",
  "readiness.level === \"partial\"",
  "readiness.level === \"blocked\"",
  "readiness.recording ? \"Recording\"",
  "readiness.voiceReady ? \"Voice ready\"",
  "this.ui.microphoneButton.disabled = !readiness.voiceReady && !readiness.recording",
  "readiness.textReady",
  "this.notice(preferredNotice ?? readiness.summary)",
]) expect(controller, marker, "controller readiness rendering");

for (const marker of [
  "Engine status",
  "voiceCaptureActions",
  "startHelperButton",
  "checkWorkerStatusButton",
  "checkMicButton",
  "microphoneButton",
  "recordStatusText",
]) expect(shell, marker, "readiness shell surface");

reject(controller, "microphoneButton.disabled = false;\n    try", "voice button should not skip readiness gate");

if (errors.length > 0) {
  console.error("Runtime readiness scenario contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Runtime readiness scenario contract passed: ready/partial/blocked/checking states, next action, blockers, voice gating, and UI messages are covered.");
