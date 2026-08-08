import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
function read(relativePath) { const path = resolve(appRoot, relativePath); if (!existsSync(path)) { errors.push(`Missing file: ${relativePath}`); return ""; } return readFileSync(path, "utf8"); }
function expect(source, marker, label) { if (!source.includes(marker)) errors.push(`${label}: missing ${marker}`); }
function reject(source, marker, label) { if (source.includes(marker)) errors.push(`${label}: forbidden ${marker}`); }

const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const facade = read("src/app/bridge/runtimeProductFacade.ts");
const chatViews = read("src/app/active-launcher/chatViews.ts");
const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");

for (const marker of ["private notice(message: string)", "clampNotice", "assistantMessage.textContent", "assistantMessage.title"]) expect(controller, marker, "central notice feedback");
for (const marker of [
  "Type text before translating.", "Text is too long. Limit:", "Translating with local engine...", "Translation completed.", "Translation blocked:",
  "Runtime check failed:", "Running setup checks...", "Checking microphone...", "Voice command failed:", "Voice capture setup is not ready.",
  "Attached files did not contain readable text.", "Attachment read failed:", "Saving settings...", "Restoring defaults...", "Diagnostics refreshed.",
]) expect(controller, marker, "required user feedback message");
for (const marker of [
  "this.ui.sendButton.disabled = true", "this.ui.sendButton.disabled = false", "this.ui.sendButton.textContent = \"Translating...\"", "this.ui.sendButton.textContent = \"Translate\"",
  "this.setRecoveryDisabled(true)", "this.setRecoveryDisabled(false)", "this.ui.composerPlusButton.disabled = true", "this.ui.composerPlusButton.disabled = false",
]) expect(controller, marker, "loading/reset state");
for (const marker of ["finally {", "this.translating = false", "this.setupRunning = false", "this.voiceRunning = false", "this.settingsSaving = false", "this.attachmentReading = false"]) expect(controller, marker, "finally reset state");

for (const marker of ["catch (error)", "errorMessage(error)", "frontend_bridge_error", "Translation command returned no message.", "runProductRecoveryAction"]) expect(facade, marker, "facade error/recovery boundary");
for (const marker of ["escapeHtml", "cleanDisplayText", "UNSAFE_DISPLAY_CHARS", "TRANSLATION_PENDING_MESSAGE", "is-pending"]) expect(chatViews, marker, "result error/display safety");
for (const marker of ["Retry", "Fix Setup", "Open Diagnostics"]) expect(shell, marker, "product recovery surface");
for (const marker of ["Start Helper", "Check Worker"]) reject(shell, marker, "normal product recovery surface");
for (const marker of ["alert(", "confirm(", "prompt("]) reject(controller, marker, "no blocking browser dialogs");

if (errors.length > 0) {
  console.error("Error feedback contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Error feedback contract passed: product-level recovery notices, loading resets, error boundaries, and result safety are covered.");
