import "./styles.css";
import "./launcherGuard.css";
import "./professionalUi.css";
import "./referenceLayout.css";
import "./mainPageLayout.css";
import "./audioSettingsLayout.css";
import "./translateSettingsLayout.css";
import "./developerSettingsLayout.css";
import { LauncherController } from "./app/launcher/launcherController";
import { bindAttachmentLimitWatcher } from "./app/launcher/attachmentLimitWatcher";
import { bindAudioDeviceListUi } from "./app/launcher/audioDeviceListBinding";
import { bindAudioPipelineResultWatcher as bindResultWatcher } from "./app/launcher/audioPipelineResultWatcher";
import { bindDeveloperEvidenceUi } from "./app/launcher/developerEvidenceBinding";
import { bindDeveloperHelperBridgeUi } from "./app/launcher/developerHelperBridgeBinding";
import { startHelperBridgeHealthMonitor } from "./app/launcher/helperBridgeHealthMonitor";
import { bindReferenceUi } from "./app/launcher/referenceUiBinding";
import { bindRuntimeReadinessUiGuard } from "./app/launcher/runtimeReadinessUiGuard";
import { startRealtimeStatusPayloadAutoRefresh } from "./app/launcher/realtimeStatusPayloadRefresh";
import { restoreNativeWindow } from "./app/launcher/windowRescue";
import { bindVoiceOutputPersistenceUi } from "./app/launcher/voiceOutputPersistenceBinding";
import { installStartupDiagnostics, startupTrace } from "./app/launcher/startupDiagnostics";

installStartupDiagnostics();
startupTrace("boot:marker", {
  marker: "translateit-tauri-desktop-runtime@0.1.0/startup-diagnostic-v2",
  currentUrl: window.location.href,
});
window.setTimeout(() => {
  void restoreNativeWindow("boot:delayed");
}, 900);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw Error("TranslateIT app root was not found.");

new LauncherController(app).start();
const stopAttachmentLimitWatcher = bindAttachmentLimitWatcher();
bindReferenceUi();
const stopAudioDeviceListUi = bindAudioDeviceListUi();
bindVoiceOutputPersistenceUi();
bindRuntimeReadinessUiGuard();
const stopDeveloperEvidenceUi = bindDeveloperEvidenceUi();
bindDeveloperHelperBridgeUi();
const stopHelperBridgeHealthMonitor = startHelperBridgeHealthMonitor();
const stopAudioPipelineResultWatcher = bindResultWatcher();
const stopRealtimeStatusPayloadAutoRefresh = startRealtimeStatusPayloadAutoRefresh();

window.addEventListener("beforeunload", () => {
  stopAttachmentLimitWatcher();
  stopAudioDeviceListUi();
  stopDeveloperEvidenceUi();
  stopHelperBridgeHealthMonitor();
  stopAudioPipelineResultWatcher();
  stopRealtimeStatusPayloadAutoRefresh();
}, { once: true });
