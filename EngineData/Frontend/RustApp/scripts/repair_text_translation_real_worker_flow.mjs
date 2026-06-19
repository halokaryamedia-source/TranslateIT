import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const controllerPath = resolve(appRoot, "src", "app", "active-launcher", "launcherController.ts");

const legacyImport = 'import { localPreviewTranslation } from "./launcherPreviewTranslation";\n';
const legacyBlock = `      const result = await runtimeApi.translateText(source).catch(() => null);
      const fallback = result?.ok ? null : localPreviewTranslation(source, (this.currentSettings ?? defaultSettings()).source_language, (this.currentSettings ?? defaultSettings()).target_language);
      const response = result?.ok ? result.message : fallback ?? result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
      const voiceStatus = result?.ok ? this.voiceOutputStatus() : fallback ? "Local preview" : "Error";
      if (!result?.ok) {
        if (fallback) {
          this.setAssistantNotice("Local preview translation shown because the native worker/model is not configured yet.");
        }
        traceUserFlow("error.user_visible", { reason: "translation_failed", message: result?.message ?? "unknown" });
      }
      if (!result?.ok && !fallback) {
        this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
        this.setAssistantNotice(`Translation failed. ${response}`);
        traceUserFlow("text.translation.result", { status: "failed", response });
        return;
      }
      await this.saveChatMessage("assistant", response);
      this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
      this.setAssistantNotice(result?.ok ? "Translation completed. Result is shown above." : "Local preview translation shown because the native worker/model is not configured yet.");
      traceUserFlow("text.translation.result", {
        status: result?.ok ? "pass" : "local-preview",
        voiceStatus,
      });`;

const realWorkerOnlyBlock = `      const result = await runtimeApi.translateText(source).catch(() => null);
      const response = result?.ok ? result.message : result?.message ?? "Translation command failed. Open Settings > Developer for diagnostics.";
      const voiceStatus = result?.ok ? this.voiceOutputStatus() : "Error";
      if (!result?.ok) {
        traceUserFlow("error.user_visible", { reason: "translation_failed", message: result?.message ?? "unknown" });
        this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
        this.setAssistantNotice(`Translation failed. ${response}`);
        traceUserFlow("text.translation.result", { status: "failed", response });
        return;
      }
      await this.saveChatMessage("assistant", response);
      this.ui.chatList.innerHTML = translationResultView(source, response, voiceStatus);
      this.setAssistantNotice("Translation completed. Result is shown above.");
      traceUserFlow("text.translation.result", {
        status: "pass",
        voiceStatus,
      });`;

function main() {
  if (!existsSync(controllerPath)) {
    console.error(`launcherController.ts not found: ${controllerPath}`);
    process.exit(1);
  }
  const before = readFileSync(controllerPath, "utf8");
  let after = before.replace(legacyImport, "");
  if (!after.includes(legacyBlock)) {
    console.error("Legacy text preview fallback block was not found. Controller may already be repaired or has drifted.");
    process.exit(1);
  }
  after = after.replace(legacyBlock, realWorkerOnlyBlock);
  if (after.includes("localPreviewTranslation") || after.includes("Local preview") || after.includes("local-preview")) {
    console.error("Repair refused to write because legacy preview marker(s) would remain.");
    process.exit(1);
  }
  writeFileSync(controllerPath, after);
  console.log("launcherController.ts repaired: text translation now uses real worker result only.");
}

main();
