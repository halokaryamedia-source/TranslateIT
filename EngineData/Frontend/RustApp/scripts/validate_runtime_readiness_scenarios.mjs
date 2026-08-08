import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
function read(relativePath) { const path = resolve(appRoot, relativePath); if (!existsSync(path)) { errors.push(`Missing file: ${relativePath}`); return ""; } return readFileSync(path, "utf8"); }
function expect(source, marker, label) { if (!source.includes(marker)) errors.push(`${label}: missing ${marker}`); }
function reject(source, marker, label) { if (source.includes(marker)) errors.push(`${label}: forbidden ${marker}`); }

const facade = read("src/app/bridge/runtimeProductFacade.ts");
const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");

for (const marker of [
  "ProductReadinessLevel", "ProductReadiness", "textReady", "helperReady", "providerReady", "microphoneReady", "modelsReady", "voiceReady",
  "meetingRouteReady", "meetingReady", "canTranslateText", "canRecordVoice", "recording", "nextAction", "blockers", "summary", "meetingStatus",
]) expect(facade, marker, "readiness model");

for (const marker of [
  "live_meeting_runtime_gate", "virtual_mic_route_ready", "liveMeetingGate?.ready && meetingRouteReady",
  "meetingReady ? \"ready\"", "textReady ? \"partial\"", "\"blocked\"", "\"checking\"",
]) expect(facade, marker, "meeting readiness mapping");

for (const marker of [
  "Meeting Voice is ready.", "Text translation is available. Meeting Voice still needs setup.",
  "Setup is needed before Meeting Voice can be used.", "Product readiness is still checking.",
  "Retry readiness, use Fix Setup, or open Developer Diagnostics for technical details.",
  "meetingStatus: meetingReady ? \"Ready\"", "Local voice pipeline ready",
]) expect(facade, marker, "product readiness messages");

for (const marker of [
  "this.snapshot = await runtimeProductFacade.loadProductRuntimeSnapshot()",
  "readiness.meetingReady ? \"Ready\"", "readiness.textReady ? \"Degraded\"", "\"Setup Needed\"", "\"Checking\"",
  "this.ui.qualityStatus.textContent = readiness.meetingStatus", "this.ui.realtimeStatus.textContent = readiness.textStatus",
  "this.ui.heroTitle.textContent", "this.notice(preferredNotice ?? readiness.summary)",
]) expect(controller, marker, "controller readiness rendering");

for (const marker of ["Meeting Voice", "retryReadinessButton", "fixSetupButton", "openDeveloperDiagnosticsButton", "qualityStatus", "realtimeStatus"]) expect(shell, marker, "readiness product shell");
for (const marker of ["Start Helper", "Check Worker"]) reject(shell, marker, "normal readiness shell");

if (errors.length > 0) {
  console.error("Runtime readiness scenario contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Runtime readiness scenario contract passed: Meeting readiness requires the existing live meeting gate and route, normal messages stay product-level, and Text can remain independently available/degraded.");
